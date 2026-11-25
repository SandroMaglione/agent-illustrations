/**
 * A layer stack injected into a real CLIP STUDIO PAINT file. Node only (node:sqlite, node:zlib).
 *
 * A .clip is a big-endian chunk container (`CSFCHUNK`: `CHNKHead`, one `CHNKExta` per pixel store, `CHNKSQLi`, `CHNKFoot`)
 * around a SQLite database that holds the canvas, the layer tree and where every pixel store sits. There is no spec: this
 * follows what others found and confirmed by opening their files in CSP (wamsoft/clipparse docs/CLIP_FORMAT.md and
 * WRITE_TEST*.md, Aodaruma/clipfile-rs docs/), and what this repository checked itself on 22 files made by CSP (docs/layers.md).
 *
 * The file is made from a template that CSP itself saved (a new, empty canvas), never from nothing: most of the 56 columns
 * of a layer row and the 35 of the canvas mean things nobody has decoded, so rows are copied and only known columns change.
 * The rules CSP enforces, each learned from a file CSP refused or broke on:
 * 1. `Offscreen.BlockData` holds the external id as a BLOB, `ExternalChunk.ExternalID` as TEXT. Swapped, layers open empty.
 * 2. `BlockCheckSum` is 0 or right. Here it is right: Adler-32 of the little-endian length and the zlib bytes of a tile.
 * 3. `Mipmap.MipmapCount` equals the length of the chain, or CSP crashes while loading.
 * 4. A new layer's thumbnail has no pixels and `Thumbnail*NeedRefresh` = 50, so CSP draws it anew.
 * 5. `CanvasPreview` is the finished picture: CSP shows it first, before it composites the layers.
 * 6. `Canvas.CanvasCurrentLayer` points at a layer that exists.
 * 7. A folder has a render mipmap chain like a raster layer (an empty folder without one crashed CSP), and the folder
 *    columns CSP writes (`FOLDER_ROW`).
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { deflateSync } from "node:zlib"
import { randomBytes, randomUUID } from "node:crypto"
import { decodePng, encodePng } from "./png.ts"
import { composite, tree } from "./stack.ts"
import type { Mode, Node, Stack } from "./stack.ts"

/** `Layer.LayerComposite`, as measured against CSP's own preview (clipparse docs/CLIP_FORMAT.md §9). */
export const COMPOSITE: Record<Mode | "passThrough", number> = { normal: 0, multiply: 2, screen: 8, dodge: 9, add: 11, overlay: 14, linearLight: 18, passThrough: 30 }
const BLOCK = 256, EMPTY = 104, FOLDER = 1, CLOSED = 16
/** How CSP writes every folder row, unlike a raster row (all 14 CSP files here with both agree): no colour expression, masking 32. */
const FOLDER_ROW = { LayerMasking: 32, LayerColorTypeIndex: null, LayerColorTypeBlackChecked: null, LayerColorTypeWhiteChecked: null }

type Row = Record<string, unknown>
type Parsed = { headerLen: number; head: Buffer; externals: Array<[string, Buffer]>; sqlite: Buffer; foot: number }

export const parse = (raw: Buffer): Parsed => {
  if (raw.toString("latin1", 0, 8) !== "CSFCHUNK") throw new Error("not a .clip file")
  const headerLen = Number(raw.readBigUInt64BE(16)), externals: Array<[string, Buffer]> = []
  let pos = headerLen, head: Buffer | null = null, sqlite: Buffer | null = null, foot = 0
  while (pos < raw.length) {
    const type = raw.toString("latin1", pos, pos + 8), len = Number(raw.readBigUInt64BE(pos + 8)), body = pos + 16
    if (type === "CHNKHead") head = raw.subarray(body, body + len)
    else if (type === "CHNKExta") { const size = Number(raw.readBigUInt64BE(body + 48)); externals.push([raw.toString("latin1", body + 8, body + 48), raw.subarray(body + 56, body + 56 + size)]) }
    else if (type === "CHNKSQLi") sqlite = raw.subarray(body, body + len)
    else if (type === "CHNKFoot") { foot = len; break }
    else throw new Error(`unknown chunk ${type} at ${pos}`)
    pos = body + len
  }
  if (!head || !sqlite) throw new Error("no CHNKHead or CHNKSQLi")
  return { headerLen, head, externals, sqlite, foot }
}

const u64 = (v: number): Buffer => { const b = Buffer.alloc(8); b.writeBigUInt64BE(BigInt(v)); return b }
const u32 = (...v: Array<number>): Buffer => { const b = Buffer.alloc(4 * v.length); v.forEach((x, i) => b.writeUInt32BE(x >>> 0, i * 4)); return b }
const utf16be = (s: string): Buffer => { const b = Buffer.alloc(s.length * 2); for (let i = 0; i < s.length; i++) b.writeUInt16BE(s.charCodeAt(i), i * 2); return b }
export const adler32 = (b: Uint8Array): number => { let a = 1, c = 0; for (let i = 0; i < b.length; i += 3800) { const e = Math.min(b.length, i + 3800); for (let j = i; j < e; j++) { a += b[j]!; c += a } a %= 65521; c %= 65521 } return ((c << 16) | a) >>> 0 }

/** Mip levels: halve from 100% until the block grid has been 1x1 twice (measured on CSP files, clipparse §2.3). */
export const levels = (w: number, h: number): Array<[number, number]> => {
  const out: Array<[number, number]> = [], one = (q: [number, number]): boolean => Math.ceil(q[0] / BLOCK) === 1 && Math.ceil(q[1] / BLOCK) === 1
  for (let W = w, H = h; ; W = Math.max(1, W >> 1), H = Math.max(1, H >> 1)) { out.push([W, H]); if (out.length >= 2 && one(out.at(-1)!) && one(out.at(-2)!)) return out }
}
/** `Offscreen.Attribute`: three sections (Parameter, InitColor, BlockSize) behind a table of their sizes. */
const sections = (a: Buffer): Array<Buffer> => { const s = [1, 2, 3].map((i) => a.readUInt32BE(i * 4)); let p = a.readUInt32BE(0); return s.map((n) => { const b = a.subarray(p, p + n); p += n; return b }) }
export const attrSize = (a: Buffer): [number, number] => { const p = sections(a)[0]!; return [p.readUInt32BE(22), p.readUInt32BE(26)] }
/** The same attribute for another size, with these block record sizes (all empty if none). Unknown constants stay. */
const retarget = (a: Buffer, w: number, h: number, sizes?: Array<number>): Buffer => {
  const [par, init, blk] = sections(a), cols = Math.ceil(w / BLOCK), rows = Math.ceil(h / BLOCK), n = cols * rows
  const p = Buffer.from(par!); p.writeUInt32BE(w, 22); p.writeUInt32BE(h, 26); p.writeUInt32BE(cols, 30); p.writeUInt32BE(rows, 34)
  const s = sizes ?? Array<number>(n).fill(EMPTY)
  if (s.length !== n) throw new Error("block count")
  const b = Buffer.concat([blk!.subarray(0, 22), u32(12, n, blk!.readUInt32BE(30)), u32(...s)])
  return Buffer.concat([u32(16, p.length, init!.length, b.length), p, init!, b])
}
/** One tile as CSP stores it: 256x256 alpha, row by row, then 256x256 of B, G, R and alpha again. Straight alpha. */
const tile = (rgba: Uint8Array, W: number, H: number, bx: number, by: number): Buffer | null => {
  const raw = Buffer.alloc((BLOCK + 64) * BLOCK * 4), col = 65536
  let any = false
  for (let y = 0; y < BLOCK; y++) {
    const Y = by * BLOCK + y
    if (Y >= H) break
    for (let x = 0; x < BLOCK; x++) {
      const X = bx * BLOCK + x
      if (X >= W) break
      const s = (Y * W + X) * 4, a = rgba[s + 3]!
      if (!a) continue
      any = true
      const d = col + (y * BLOCK + x) * 4
      raw[y * BLOCK + x] = a; raw[d] = rgba[s + 2]!; raw[d + 1] = rgba[s + 1]!; raw[d + 2] = rgba[s]!; raw[d + 3] = a
    }
  }
  return any ? raw : null
}
/** The pixel store of one offscreen: a record per block, then BlockStatus and BlockCheckSum. */
const blocks = (rgba: Uint8Array | null, W: number, H: number): { payload: Buffer; sizes: Array<number> } => {
  const cols = Math.ceil(W / BLOCK), rows = Math.ceil(H / BLOCK), parts: Array<Buffer> = [], sizes: Array<number> = [], sums: Array<number> = []
  const begin = Buffer.concat([u32(19), utf16be("BlockDataBeginChunk")]), end = Buffer.concat([u32(17), utf16be("BlockDataEndChunk")]), dec = (BLOCK + 64) * BLOCK * 4
  for (let i = 0; i < cols * rows; i++) {
    const raw = rgba ? tile(rgba, W, H, i % cols, Math.floor(i / cols)) : null
    if (!raw) { parts.push(u32(EMPTY), begin, u32(i, dec, BLOCK, BLOCK, 0), end); sizes.push(EMPTY); sums.push(0); continue }
    const z = deflateSync(raw), le = Buffer.alloc(4)
    le.writeUInt32LE(z.length)
    parts.push(u32(z.length + 112), begin, u32(i, dec, BLOCK, BLOCK, 1), u32(z.length + 4), le, z, end)
    sizes.push(z.length + 112); sums.push(adler32(Buffer.concat([le, z])))
  }
  const trailer = (name: string, v: Array<number>): Buffer => Buffer.concat([u32(name.length), utf16be(name), u32(12, v.length, 4), u32(...v)])
  parts.push(trailer("BlockStatus", sums.map(() => 1)), trailer("BlockCheckSum", sums))
  return { payload: Buffer.concat(parts), sizes }
}
const externalId = (): string => `extrnlid${randomBytes(16).toString("hex").toUpperCase()}`
/** The template's own UUID spelling: 10-4-4-4-10 hex digits. */
const layerUuid = (): string => { const h = randomUUID().replace(/-/g, ""); return `${h.slice(0, 10)}-${h.slice(10, 14)}-${h.slice(14, 18)}-${h.slice(18, 22)}-${h.slice(22)}` }

class Doc {
  readonly db: DatabaseSync
  readonly dir: string
  externals: Array<[string, Buffer]>
  readonly p: Parsed
  constructor(raw: Buffer) {
    this.p = parse(raw)
    this.dir = mkdtempSync(join(tmpdir(), "clip-"))
    writeFileSync(join(this.dir, "db"), this.p.sqlite)
    this.db = new DatabaseSync(join(this.dir, "db"))
    this.externals = [...this.p.externals]
  }
  all = (sql: string, ...v: Array<unknown>): Array<Row> => this.db.prepare(sql).all(...(v as Array<never>)) as Array<Row>
  one = (sql: string, ...v: Array<unknown>): Row | undefined => this.db.prepare(sql).get(...(v as Array<never>)) as Row | undefined
  run = (sql: string, ...v: Array<unknown>): void => { this.db.prepare(sql).run(...(v as Array<never>)) }
  /** MainIds come from ElemScheme.MaxIndex, not from SQLite (clipparse, measured). */
  next(table: string): number { const r = this.one("SELECT MaxIndex FROM ElemScheme WHERE TableName=?", table), n = Number(r?.MaxIndex ?? this.one(`SELECT COALESCE(MAX(MainId),0) m FROM [${table}]`)!.m) + 1; this.run("UPDATE ElemScheme SET MaxIndex=? WHERE TableName=?", n, table); return n }
  /** A row copied whole, with these columns changed. */
  copy(table: string, id: number, over: Row): void {
    const src = this.one(`SELECT * FROM [${table}] WHERE MainId=?`, id)
    if (!src) throw new Error(`${table} ${id} missing`)
    const cols = Object.keys(src).filter((c) => c !== "_PW_ID")
    this.run(`INSERT INTO [${table}] (${cols.map((c) => `[${c}]`).join(",")}) VALUES (${cols.map(() => "?").join(",")})`, ...cols.map((c) => (c in over ? over[c] : src[c])))
  }
  chain(mipmap: number): Array<{ info: number; off: number }> {
    const out: Array<{ info: number; off: number }> = []
    for (let n = Number(this.one("SELECT BaseMipmapInfo b FROM Mipmap WHERE MainId=?", mipmap)!.b); n; ) { const r = this.one("SELECT Offscreen, NextIndex FROM MipmapInfo WHERE MainId=?", n)!; out.push({ info: n, off: Number(r.Offscreen) }); n = Number(r.NextIndex) }
    return out
  }
  attr(off: number): Buffer { return Buffer.from(this.one("SELECT Attribute FROM Offscreen WHERE MainId=?", off)!.Attribute as Uint8Array) }
  kids(parent: number): Array<number> { const out: Array<number> = []; for (let n = Number(this.one("SELECT LayerFirstChildIndex f FROM Layer WHERE MainId=?", parent)!.f); n; n = Number(this.one("SELECT LayerNextIndex n FROM Layer WHERE MainId=?", n)!.n)) out.push(n); return out }

  /** Canvas to a new size: every mip chain gets the right number of levels and empty attributes; old pixel stores go. */
  resize(w: number, h: number): void {
    const canvas = Number(this.one("SELECT MainId FROM Canvas")!.MainId), lv = levels(w, h)
    this.run("UPDATE Canvas SET CanvasWidth=?, CanvasHeight=?, CanvasUnit=0 WHERE MainId=?", w, h, canvas)
    for (const m of this.all("SELECT MainId, LayerId FROM Mipmap")) {
      const id = Number(m.MainId), c = this.chain(id)
      while (c.length > lv.length) { const q = c.pop()!; this.run("DELETE FROM MipmapInfo WHERE MainId=?", q.info); this.run("DELETE FROM Offscreen WHERE MainId=?", q.off) }
      while (c.length < lv.length) { const q = c.at(-1)!, off = this.next("Offscreen"), info = this.next("MipmapInfo"); this.copy("Offscreen", q.off, { MainId: off, BlockData: Buffer.from(externalId(), "latin1") }); this.copy("MipmapInfo", q.info, { MainId: info, Offscreen: off, NextIndex: 0 }); c.push({ info, off }) }
      c.forEach((q, i) => { this.run("UPDATE MipmapInfo SET ThisScale=?, NextIndex=? WHERE MainId=?", 100 / 2 ** i, c[i + 1]?.info ?? 0, q.info); this.run("UPDATE Offscreen SET Attribute=? WHERE MainId=?", retarget(this.attr(q.off), lv[i]![0], lv[i]![1]), q.off) })
      this.run("UPDATE Mipmap SET BaseMipmapInfo=?, MipmapCount=? WHERE MainId=?", c[0]!.info, c.length, id)
    }
    for (const t of this.all("SELECT ThumbnailOffscreen o FROM LayerThumbnail")) { const o = Number(t.o), [tw, th] = attrSize(this.attr(o)); this.run("UPDATE Offscreen SET Attribute=? WHERE MainId=?", retarget(this.attr(o), tw, th), o) }
    this.run("UPDATE LayerThumbnail SET ThumbnailCanvasWidth=?, ThumbnailCanvasHeight=?", w, h)
    this.externals = []
  }
  /** A new layer copied from a plain raster layer, on top of `parent`'s children. `rgba` is the whole canvas, or null for a folder. */
  add(template: number, parent: number, name: string, over: Row, rgba: Uint8Array | null, W: number, H: number): number {
    const t = this.one("SELECT LayerRenderMipmap m, LayerRenderThumbnail th FROM Layer WHERE MainId=?", template)!, canvas = Number(this.one("SELECT MainId FROM Canvas")!.MainId)
    const id = this.next("Layer"), mip = this.next("Mipmap"), thumb = this.next("LayerThumbnail"), src = this.chain(Number(t.m))
    const infos = src.map(() => this.next("MipmapInfo")), offs = src.map(() => this.next("Offscreen"))
    src.forEach((q, i) => {
      const [lw, lh] = attrSize(this.attr(q.off))
      this.copy("Offscreen", q.off, { MainId: offs[i], LayerId: id, CanvasId: canvas, Attribute: retarget(this.attr(q.off), lw, lh), BlockData: Buffer.from(externalId(), "latin1") })
      this.copy("MipmapInfo", q.info, { MainId: infos[i], LayerId: id, CanvasId: canvas, Offscreen: offs[i], NextIndex: infos[i + 1] ?? 0 })
    })
    this.copy("Mipmap", Number(t.m), { MainId: mip, LayerId: id, CanvasId: canvas, BaseMipmapInfo: infos[0], MipmapCount: infos.length })
    const tOff = Number(this.one("SELECT ThumbnailOffscreen o FROM LayerThumbnail WHERE MainId=?", t.th)!.o), nOff = this.next("Offscreen")
    this.copy("Offscreen", tOff, { MainId: nOff, LayerId: id, CanvasId: canvas, BlockData: Buffer.from(externalId(), "latin1") })
    const refresh = Object.fromEntries(this.all("PRAGMA table_info(LayerThumbnail)").map((c) => String(c.name)).filter((c) => c.includes("NeedRefresh")).map((c) => [c, 50]))
    this.copy("LayerThumbnail", Number(t.th), { MainId: thumb, LayerId: id, CanvasId: canvas, ThumbnailOffscreen: nOff, ...refresh })
    this.copy("Layer", template, { MainId: id, CanvasId: canvas, LayerName: name, LayerUuid: layerUuid(), LayerFirstChildIndex: 0, LayerNextIndex: 0, LayerRenderMipmap: mip, LayerRenderThumbnail: thumb, LayerLayerMaskMipmap: 0, LayerLayerMaskThumbnail: 0, LayerSelect: 0, LayerVisibility: 1, ...over })
    const k = this.kids(parent)
    if (k.length) this.run("UPDATE Layer SET LayerNextIndex=? WHERE MainId=?", id, k.at(-1)!); else this.run("UPDATE Layer SET LayerFirstChildIndex=? WHERE MainId=?", id, parent)
    // pixels: the 100% level only; smaller levels and the thumbnail are left for CSP to draw
    const { payload, sizes } = blocks(rgba, W, H), bd = this.one("SELECT BlockData FROM Offscreen WHERE MainId=?", offs[0])!.BlockData as Uint8Array
    this.run("UPDATE Offscreen SET Attribute=? WHERE MainId=?", retarget(this.attr(offs[0]!), W, H, sizes), offs[0])
    this.externals.push([Buffer.from(bd).toString("latin1"), payload])
    return id
  }
  /** A layer and everything it owns, out of the tree. */
  remove(id: number): void {
    const l = this.one("SELECT LayerRenderMipmap m, LayerRenderThumbnail t, LayerNextIndex n FROM Layer WHERE MainId=?", id)!
    for (const q of this.chain(Number(l.m))) { this.run("DELETE FROM MipmapInfo WHERE MainId=?", q.info); this.run("DELETE FROM Offscreen WHERE MainId=?", q.off) }
    this.run("DELETE FROM Mipmap WHERE MainId=?", l.m)
    const t = this.one("SELECT ThumbnailOffscreen o FROM LayerThumbnail WHERE MainId=?", l.t)
    if (t) this.run("DELETE FROM Offscreen WHERE MainId=?", t.o)
    this.run("DELETE FROM LayerThumbnail WHERE MainId=?", l.t)
    this.run("UPDATE Layer SET LayerNextIndex=? WHERE LayerNextIndex=?", l.n, id)
    this.run("UPDATE Layer SET LayerFirstChildIndex=? WHERE LayerFirstChildIndex=?", l.n, id)
    this.run("DELETE FROM Layer WHERE MainId=?", id)
  }
  preview(rgba: Uint8Array, w: number, h: number): void {
    const png = encodePng(rgba, w, h), r = this.one("SELECT MainId FROM CanvasPreview")
    if (r) this.run("UPDATE CanvasPreview SET ImageType=1, ImageWidth=?, ImageHeight=?, ImageData=? WHERE MainId=?", w, h, png, r.MainId)
    else this.run("INSERT INTO CanvasPreview (MainId, CanvasId, ImageType, ImageWidth, ImageHeight, ImageData) VALUES (1, ?, 1, ?, ?, ?)", this.one("SELECT MainId FROM Canvas")!.MainId, w, h, png)
  }
  /** Offsets first, then the index, then the database: the database comes last in the file, so nothing moves after. */
  save(): Buffer {
    const { headerLen, head, foot } = this.p
    let pos = headerLen + 16 + head.length
    const at = this.externals.map(([id, b]) => { const p = pos; pos += 16 + 56 + b.length; return [id, p] as const })
    this.run("DELETE FROM ExternalChunk")
    for (const [id, p] of at) this.run("INSERT INTO ExternalChunk (ExternalID, Offset) VALUES (?, ?)", id, p) // TEXT, as CSP writes it
    this.db.close()
    const db = readFileSync(join(this.dir, "db")), h = Buffer.from(head)
    h.writeBigUInt64BE(BigInt(pos), 8)
    const parts = [Buffer.from("CSFCHUNK", "latin1"), u64(0), u64(headerLen), Buffer.alloc(headerLen - 24), Buffer.from("CHNKHead", "latin1"), u64(h.length), h]
    for (const [id, b] of this.externals) parts.push(Buffer.from("CHNKExta", "latin1"), u64(56 + b.length), u64(40), Buffer.from(id, "latin1"), u64(b.length), b)
    parts.push(Buffer.from("CHNKSQLi", "latin1"), u64(db.length), db, Buffer.from("CHNKFoot", "latin1"), u64(foot))
    const out = Buffer.concat(parts)
    out.writeBigUInt64BE(BigInt(out.length), 8)
    rmSync(this.dir, { recursive: true, force: true })
    return out
  }
}

/** The columns that place a layer's pixels: all zero, so a full-canvas store sits where the canvas is. */
const AT_ORIGIN = { LayerOffsetX: 0, LayerOffsetY: 0, LayerRenderOffscrOffsetX: 0, LayerRenderOffscrOffsetY: 0, LayerMaskOffsetX: 0, LayerMaskOffsetY: 0, LayerMaskOffscrOffsetX: 0, LayerMaskOffscrOffsetY: 0, LayerClip: 0, LayerLock: 0, LayerMasking: 0 }

/**
 * The stack in a CSP file. Two ways, chosen by size:
 * - the file is a new, empty canvas (paper and one empty raster layer, as CSP saves "New"): it is resized to the stack, its
 *   raster layer is the model for every new layer and folder and is removed at the end. The paper stays at the bottom.
 * - the file has the stack's size: nothing in it changes, the stack goes on top, in one folder (`into`). This is how layers
 *   go into a canvas someone is working on, for example the one with their line art.
 * The stack's own white "Paper" is left out: CSP has its paper. Folders are closed, pass-through unless the stack seals them; a
 * clipped layer has `LayerClip` 1, as CSP writes it (its own sample files). `flat` is the
 * finished picture for CanvasPreview when the canvas is made anew; injected, the preview is the old one with the stack on top.
 */
export const clip = (template: Buffer, s: Stack, flat: Uint8Array, into = "Agent layers"): Buffer => {
  const d = new Doc(template), root = Number(d.one("SELECT CanvasRootFolder r FROM Canvas")!.r), canvas = d.one("SELECT CanvasWidth w, CanvasHeight h FROM Canvas")!
  const all = d.all("SELECT MainId, LayerType, LayerFolder, LayerLayerMaskMipmap, LayerRenderMipmap, LayerOffsetX, LayerOffsetY FROM Layer WHERE MainId<>?", root)
  const plain = (l: Row): boolean => Number(l.LayerType) === 1 && !(Number(l.LayerFolder) & FOLDER) && !Number(l.LayerLayerMaskMipmap) && !Number(l.LayerOffsetX) && !Number(l.LayerOffsetY)
  const model = all.find(plain)
  if (!model) throw new Error("the file needs a plain raster layer to copy: a new canvas saved by CSP has one")
  const same = Number(canvas.w) === s.w && Number(canvas.h) === s.h
  if (!same) {
    const art = all.filter((l) => Number(l.LayerType) !== 1584 && l.MainId !== model.MainId)
    // pixels in the model layer are artwork too (its block table says so; stale tables only make this careful)
    const painted = hasPixels(d, d.chain(Number(model.LayerRenderMipmap))[0]!.off)
    if (art.length || painted) throw new Error(`the file is ${String(canvas.w)}x${String(canvas.h)}, the layers ${s.w}x${s.h}: only an empty canvas can be resized. Make the canvas ${s.w}x${s.h} in CSP to add the layers to it, or use a new empty canvas`)
    d.resize(s.w, s.h)
  }
  const full = (L: Stack["layers"][number]): Uint8Array => { const o = new Uint8Array(s.w * s.h * 4); for (let y = 0; y < L.h; y++) { const Y = y + L.y; if (Y < 0 || Y >= s.h) continue; for (let x = 0; x < L.w; x++) { const X = x + L.x; if (X >= 0 && X < s.w) o.set(L.rgba.subarray((y * L.w + x) * 4, (y * L.w + x) * 4 + 4), (Y * s.w + X) * 4) } } return o }
  const folder = (parent: number, name: string, sealed = false): number => d.add(Number(model.MainId), parent, name, { ...AT_ORIGIN, LayerType: 0, LayerFolder: FOLDER | CLOSED, LayerComposite: sealed ? COMPOSITE.normal : COMPOSITE.passThrough, ...FOLDER_ROW }, null, s.w, s.h)
  const base = same ? folder(root, into) : root
  let last = 0
  const walk = (nodes: Array<Node>, parent: number): void => {
    for (const n of nodes) {
      if ("folder" in n) { walk(n.kids, folder(parent, n.folder, n.sealed)); continue }
      const L = n.layer
      if (L.name === "Paper" && !L.group) continue
      last = d.add(Number(model.MainId), parent, L.name, { ...AT_ORIGIN, LayerComposite: COMPOSITE[L.mode], LayerClip: L.clip ? 1 : 0, LayerOpacity: Math.round(L.opacity * 256), LayerVisibility: L.visible ? 1 : 0 }, full(L), s.w, s.h)
    }
  }
  walk(tree(s), base)
  // a new canvas: the template's paper in English, and the resolution illustrations are kept at
  if (!same) { d.remove(Number(model.MainId)); d.run("UPDATE Layer SET LayerName='Paper' WHERE LayerType=1584"); d.run("UPDATE Canvas SET CanvasResolution=350") }
  d.run("UPDATE Canvas SET CanvasCurrentLayer=?", last)
  if (same) {
    // the old preview with the new layers on top: exact, because they are on top
    const old = d.one("SELECT ImageData FROM CanvasPreview"), pv = old ? decodePng(Buffer.from(old.ImageData as Uint8Array)) : null
    if (pv && pv.w === s.w && pv.h === s.h) {
      const bg = new Uint8Array(s.w * s.h * 4)
      for (let i = 0; i < s.w * s.h; i++) { const a = pv.rgba[i * 4 + 3]! / 255; for (let c = 0; c < 3; c++) bg[i * 4 + c] = Math.round(pv.rgba[i * 4 + c]! * a + 255 * (1 - a)); bg[i * 4 + 3] = 255 }
      const rgb = composite({ ...s, layers: [{ name: "old", group: "", mode: "normal", opacity: 1, visible: true, x: 0, y: 0, w: s.w, h: s.h, rgba: bg }, ...s.layers.filter((L) => L.name !== "Paper" || L.group)] })
      const o = new Uint8Array(s.w * s.h * 4)
      for (let i = 0; i < s.w * s.h; i++) o.set([rgb[i * 3]!, rgb[i * 3 + 1]!, rgb[i * 3 + 2]!, 255], i * 4)
      d.preview(o, s.w, s.h)
    }
  } else d.preview(flat, s.w, s.h)
  return d.save()
}
/** Whether a stored offscreen has a block with pixels. */
const hasPixels = (d: Doc, off: number): boolean => { const a = d.attr(off), sz = a.readUInt32BE(0) + a.readUInt32BE(4) + a.readUInt32BE(8), n = a.readUInt32BE(sz + 26); for (let i = 0; i < n; i++) if (a.readUInt32BE(sz + 34 + i * 4) !== EMPTY) return true; return false }
