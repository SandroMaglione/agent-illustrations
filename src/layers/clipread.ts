/**
 * Reading a .clip back: the layer tree, the pixels of every raster layer, a composite, and a check of every rule a writer
 * must keep. It is run on files CSP made (to show it reads them as CSP does: its composite is compared with the preview
 * CSP stored) and on files `clip.ts` made. Node only.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { inflateSync } from "node:zlib"
import { adler32, attrSize, levels, parse } from "./clip.ts"
import { decodePng } from "./png.ts"

type Row = Record<string, unknown>
export type ClipLayer = { id: number; name: string; depth: number; type: number; folder: boolean; composite: number; opacity: number; visible: boolean; clip: boolean; kids: Array<ClipLayer>; rgba: Float32Array | null; note?: string }
export type Clip = { w: number; h: number; root: ClipLayer; layers: Array<ClipLayer>; preview: { w: number; h: number; rgba: Uint8Array } | null; problems: Array<string>; facts: Array<string> }

const BLOCK = 256, BEGIN = Buffer.from("BlockDataBeginChunk", "utf16le").swap16()

/** Block records of one pixel store, by index: zlib bytes or null when empty, plus the trailers. */
const records = (b: Buffer): { recs: Array<{ size: number; z: Buffer | null; le: Buffer | null }>; status: Array<number>; sums: Array<number> } => {
  const recs: Array<{ size: number; z: Buffer | null; le: Buffer | null }> = []
  let p = 0
  while (p + 46 <= b.length && b.readUInt32BE(p + 4) === 19 && b.subarray(p + 8, p + 46).equals(BEGIN)) {
    const size = b.readUInt32BE(p), q = p + 46, has = b.readUInt32BE(q + 16)
    if (has) { const n = b.readUInt32LE(q + 24); recs.push({ size, z: b.subarray(q + 28, q + 28 + n), le: b.subarray(q + 24, q + 28) }) } else recs.push({ size, z: null, le: null })
    p += size
  }
  const trail = (): Array<number> => { if (p + 4 > b.length) return []; const n = b.readUInt32BE(p); p += 4 + n * 2; const c = b.readUInt32BE(p + 4); p += 12; const v = Array.from({ length: c }, (_, i) => b.readUInt32BE(p + i * 4)); p += c * 4; return v }
  return { recs, status: trail(), sums: trail() }
}

export const readClip = (raw: Buffer, decode = true): Clip => {
  const problems: Array<string> = [], facts: Array<string> = []
  const P = parse(raw)
  if (Number(raw.readBigUInt64BE(8)) !== raw.length) problems.push("file size in the header is wrong")
  const dir = mkdtempSync(join(tmpdir(), "clipr-"))
  writeFileSync(join(dir, "db"), P.sqlite)
  const db = new DatabaseSync(join(dir, "db"), { readOnly: true })
  const all = (sql: string, ...v: Array<unknown>): Array<Row> => db.prepare(sql).all(...(v as Array<never>)) as Array<Row>
  const one = (sql: string, ...v: Array<unknown>): Row | undefined => db.prepare(sql).get(...(v as Array<never>)) as Row | undefined
  const ext = new Map(P.externals)

  // the container: CHNKHead knows where the database is, ExternalChunk where every store is
  let pos = P.headerLen + 16 + P.head.length
  const where = new Map<string, number>()
  for (const [id, b] of P.externals) { where.set(id, pos); pos += 72 + b.length }
  if (Number(P.head.readBigUInt64BE(8)) !== pos) problems.push("CHNKHead does not point at CHNKSQLi")
  for (const r of all("SELECT ExternalID, typeof(ExternalID) t, Offset FROM ExternalChunk")) {
    const id = typeof r.ExternalID === "string" ? r.ExternalID : Buffer.from(r.ExternalID as Uint8Array).toString("latin1")
    if (r.t !== "text") problems.push(`ExternalChunk.ExternalID ${id} stored as ${String(r.t)}, CSP writes text`)
    if (where.get(id) !== Number(r.Offset)) problems.push(`ExternalChunk ${id}: offset ${String(r.Offset)}, chunk at ${where.get(id)}`)
  }
  if (all("SELECT 1 FROM ExternalChunk").length !== P.externals.length) problems.push("ExternalChunk rows and CHNKExta chunks differ in number")
  for (const r of all("SELECT MainId, typeof(BlockData) t FROM Offscreen")) if (r.t !== "blob" && r.t !== "null") problems.push(`Offscreen ${String(r.MainId)}: BlockData stored as ${String(r.t)}, CSP writes blob`)

  const canvas = one("SELECT * FROM Canvas")!, w = Number(canvas.CanvasWidth), h = Number(canvas.CanvasHeight), lv = levels(w, h)
  // ids come from ElemScheme: its high-water mark must stay over every id in use
  for (const t of ["Layer", "Mipmap", "MipmapInfo", "Offscreen", "LayerThumbnail"]) { const m = Number(one(`SELECT COALESCE(MAX(MainId),0) m FROM [${t}]`)!.m), e = one("SELECT MaxIndex FROM ElemScheme WHERE TableName=?", t); if (e && Number(e.MaxIndex) < m) problems.push(`ElemScheme.MaxIndex of ${t} is ${String(e.MaxIndex)}, ids go to ${m}`) }

  const store = (off: number, what: string): { rgba: Float32Array | null; empty: boolean } => {
    const o = one("SELECT Attribute, BlockData FROM Offscreen WHERE MainId=?", off)
    if (!o) { problems.push(`${what}: Offscreen ${off} missing`); return { rgba: null, empty: true } }
    const a = Buffer.from(o.Attribute as Uint8Array), [ow, oh] = attrSize(a), sec = [1, 2, 3].map((i) => a.readUInt32BE(i * 4)), par = a.subarray(16, 16 + sec[0]!), init = a.subarray(16 + sec[0]!, 16 + sec[0]! + sec[1]!), blk = a.subarray(16 + sec[0]! + sec[1]!)
    const cols = par.readUInt32BE(30), rows = par.readUInt32BE(34), nch = par.readUInt32BE(46), nb = blk.readUInt32BE(26)
    if (cols !== Math.ceil(ow / BLOCK) || rows !== Math.ceil(oh / BLOCK) || nb !== cols * rows) problems.push(`${what}: block grid ${cols}x${rows} (${nb}) for ${ow}x${oh}`)
    const sizes = Array.from({ length: nb }, (_, i) => blk.readUInt32BE(34 + i * 4)), id = o.BlockData ? Buffer.from(o.BlockData as Uint8Array).toString("latin1") : "", body = ext.get(id)
    const hasInit = init.readUInt32BE(26) === 1, initColor = init.readUInt32BE(30)
    if (!body) {
      if (!hasInit) return { rgba: null, empty: true }
      const c = new Float32Array(ow * oh * 4)
      for (let i = 0; i < ow * oh; i++) c.set([initColor >>> 24, (initColor >>> 16) & 255, (initColor >>> 8) & 255, initColor & 255], i * 4)
      return { rgba: c, empty: false }
    }
    const { recs, status, sums } = records(body)
    if (recs.length !== nb) { problems.push(`${what}: ${recs.length} block records, attribute says ${nb}`); return { rgba: null, empty: true } }
    if (status.length !== nb || sums.length !== nb) problems.push(`${what}: BlockStatus/BlockCheckSum length`)
    recs.forEach((r, i) => {
      if (r.size !== sizes[i]) problems.push(`${what}: block ${i} record ${r.size} B, attribute says ${sizes[i]}`)
      if (r.z && sums[i] && sums[i] !== adler32(Buffer.concat([r.le!, r.z]))) problems.push(`${what}: block ${i} checksum wrong`)
    })
    if (!decode) return { rgba: null, empty: recs.every((r) => !r.z) }
    if (nch !== 4) { facts.push(`${what}: ${nch}-channel store not decoded`); return { rgba: null, empty: true } }
    const c = new Float32Array(ow * oh * 4)
    recs.forEach((r, i) => {
      if (!r.z) return
      const t = inflateSync(r.z), bx = (i % cols) * BLOCK, by = Math.floor(i / cols) * BLOCK
      for (let y = 0; y < BLOCK && by + y < oh; y++) for (let x = 0; x < BLOCK && bx + x < ow; x++) { const s = 65536 + (y * BLOCK + x) * 4, d = ((by + y) * ow + bx + x) * 4; c[d] = t[s + 2]!; c[d + 1] = t[s + 1]!; c[d + 2] = t[s]!; c[d + 3] = t[y * BLOCK + x]! }
    })
    return { rgba: c, empty: false }
  }

  const seen = new Set<number>(), list: Array<ClipLayer> = []
  const layer = (id: number, depth: number): ClipLayer => {
    if (seen.has(id)) { problems.push(`layer ${id} reached twice: the tree has a loop`); throw new Error("loop") }
    seen.add(id)
    const r = one("SELECT * FROM Layer WHERE MainId=?", id)!
    const L: ClipLayer = { id, name: String(r.LayerName ?? ""), depth, type: Number(r.LayerType), folder: (Number(r.LayerFolder) & 1) === 1, composite: Number(r.LayerComposite), opacity: Number(r.LayerOpacity) / 256, visible: (Number(r.LayerVisibility) & 1) === 1, clip: Number(r.LayerClip) !== 0, kids: [], rgba: null }
    const mip = Number(r.LayerRenderMipmap)
    if (mip) {
      const m = one("SELECT * FROM Mipmap WHERE MainId=?", mip)
      if (!m) problems.push(`${L.name}: Mipmap ${mip} missing`)
      else {
        const chain: Array<Row> = []
        for (let n = Number(m.BaseMipmapInfo); n && chain.length < 40; ) { const q = one("SELECT * FROM MipmapInfo WHERE MainId=?", n); if (!q) { problems.push(`${L.name}: MipmapInfo ${n} missing`); break } chain.push(q); n = Number(q.NextIndex) }
        if (Number(m.MipmapCount) !== chain.length) problems.push(`${L.name}: MipmapCount ${String(m.MipmapCount)}, chain has ${chain.length} levels`)
        if (chain.length !== lv.length) facts.push(`${L.name}: ${chain.length} mip levels, the rule gives ${lv.length}`)
        chain.forEach((q, i) => { const o = one("SELECT Attribute FROM Offscreen WHERE MainId=?", q.Offscreen); if (o && lv[i]) { const [a, b] = attrSize(Buffer.from(o.Attribute as Uint8Array)); if (L.type === 1 && (a !== lv[i]![0] || b !== lv[i]![1])) facts.push(`${L.name}: level ${i} is ${a}x${b}, rule ${lv[i]![0]}x${lv[i]![1]}`) } })
        if (chain[0] && !L.folder) {
          const s = store(Number(chain[0].Offscreen), L.name)
          if (s.rgba) {
            // a store can be smaller than the canvas and sit at an offset
            const a = one("SELECT Attribute FROM Offscreen WHERE MainId=?", chain[0].Offscreen)!, [ow, oh] = attrSize(Buffer.from(a.Attribute as Uint8Array)), ox = Number(r.LayerOffsetX ?? 0) + (r.DrawToRenderOffscreenType == null ? Number(r.LayerRenderOffscrOffsetX ?? 0) : 0), oy = Number(r.LayerOffsetY ?? 0) + (r.DrawToRenderOffscreenType == null ? Number(r.LayerRenderOffscrOffsetY ?? 0) : 0)
            if (ow === w && oh === h && !ox && !oy) L.rgba = s.rgba
            else { const c = new Float32Array(w * h * 4); for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++) { const X = x + ox, Y = y + oy; if (X >= 0 && Y >= 0 && X < w && Y < h) for (let k = 0; k < 4; k++) c[(Y * w + X) * 4 + k] = s.rgba[(y * ow + x) * 4 + k]! } L.rgba = c }
          }
        }
      }
    } else if (L.folder || L.type === 1) problems.push(`${L.name}: no render mipmap (an empty folder without one crashed CSP)`)
    const th = Number(r.LayerRenderThumbnail)
    if (th && !one("SELECT 1 FROM LayerThumbnail WHERE MainId=?", th)) problems.push(`${L.name}: LayerThumbnail ${th} missing`)
    if (L.type & 4096) L.note = "adjustment layer, not applied"
    if (Number(r.LayerLayerMaskMipmap)) L.note = "has a layer mask, not applied"
    if (r.TextLayerString != null || L.type === 0 && !L.folder && r.VectorNormalStrokeIndex != null) L.note = "text or vector, cache only"
    list.push(L)
    for (let n = Number(r.LayerFirstChildIndex); n; n = Number(one("SELECT LayerNextIndex n FROM Layer WHERE MainId=?", n)?.n ?? 0)) L.kids.push(layer(n, depth + 1))
    return L
  }
  const root = layer(Number(canvas.CanvasRootFolder), 0)
  const rows = all("SELECT MainId FROM Layer").map((r) => Number(r.MainId))
  for (const id of rows) if (!seen.has(id)) problems.push(`layer ${id} is not in the tree`)
  if (!rows.includes(Number(canvas.CanvasCurrentLayer))) problems.push(`CanvasCurrentLayer ${String(canvas.CanvasCurrentLayer)} does not exist`)
  const pv = one("SELECT ImageWidth, ImageHeight, ImageData FROM CanvasPreview")
  const preview = pv ? (() => { const d = decodePng(Buffer.from(pv.ImageData as Uint8Array)); return { w: d.w, h: d.h, rgba: d.rgba } })() : null
  db.close()
  rmSync(dir, { recursive: true, force: true })
  return { w, h, root, layers: list, preview, problems, facts }
}

/** CSP's blend formulas on 0..1 values (clipparse docs/CLIP_FORMAT.md §9); null for modes not written here. */
const B: Record<number, (b: number, s: number) => number> = {
  0: (_b, s) => s, 1: Math.min, 2: (b, s) => b * s, 3: (b, s) => (s <= 0 ? 0 : 1 - Math.min(1, (1 - b) / s)), 4: (b, s) => Math.max(0, b + s - 1), 5: (b, s) => Math.max(0, b - s), 7: Math.max, 8: (b, s) => b + s - b * s,
  9: (b, s) => (s >= 1 ? 1 : Math.min(1, b / (1 - s))), 11: (b, s) => Math.min(1, b + s), 12: (b, s) => Math.min(1, b + s), 14: (b, s) => (b <= 0.5 ? 2 * b * s : 1 - 2 * (1 - b) * (1 - s)), 16: (b, s) => (s <= 0.5 ? 2 * b * s : 1 - 2 * (1 - b) * (1 - s)),
  15: (b, s) => (s <= 0.5 ? b - (1 - 2 * s) * b * (1 - b) : b + (2 * s - 1) * ((b <= 0.25 ? ((16 * b - 12) * b + 4) * b : Math.sqrt(b)) - b)), 18: (b, s) => Math.max(0, Math.min(1, b + 2 * s - 1)), 19: (b, s) => (s <= 0.5 ? Math.min(b, 2 * s) : Math.max(b, 2 * s - 1)), 21: (b, s) => Math.abs(b - s), 22: (b, s) => b + s - 2 * b * s, 36: (b, s) => (s <= 0 ? 1 : Math.min(1, b / s)),
}
/**
 * Composites the tree: pass-through folders (30) composite into their parent, others into a buffer of their own. A base and
 * the layers clipped to it are one group that keeps the base's alpha: exactly what CSP's preview shows (`Illustration-Referece.clip`).
 */
export const compositeClip = (c: Clip, unknown: Set<string> = new Set()): Float32Array => {
  const N = c.w * c.h
  const draw = (into: Float32Array, kids: Array<ClipLayer>): void => {
    for (let n = 0; n < kids.length; n++) {
      const L = kids[n]!, over: Array<ClipLayer> = []
      while (n + 1 < kids.length && kids[n + 1]!.clip) over.push(kids[++n]!)
      if (!L.visible) continue
      let src = L.rgba
      if (L.folder) {
        if (L.composite === 30) { draw(into, L.kids); continue }
        src = new Float32Array(N * 4); draw(src, L.kids)
      }
      if (!src) continue
      if (over.length) {
        src = src.slice()
        for (const T of over) {
          if (!T.visible || !T.rgba) continue
          const ft = B[T.composite] ?? (unknown.add(`blend ${T.composite} (${T.name})`), B[0]!), ot = Math.floor(T.opacity * 256) / 256
          for (let i = 0; i < N; i++) { const a = (T.rgba[i * 4 + 3]! / 255) * ot; if (a > 0 && src[i * 4 + 3]!) for (let k = 0; k < 3; k++) { const b = src[i * 4 + k]! / 255; src[i * 4 + k] = (b + (ft(b, T.rgba[i * 4 + k]! / 255) - b) * a) * 255 } }
        }
      }
      const f = B[L.composite] ?? (unknown.add(`blend ${L.composite} (${L.name})`), B[0]!), op = Math.floor(L.opacity * 256) / 256
      for (let i = 0; i < N; i++) {
        let as = (src[i * 4 + 3]! / 255) * op
        if (as <= 0) continue
        const ab = into[i * 4 + 3]! / 255, ao = as + ab * (1 - as)
        for (let k = 0; k < 3; k++) { const s = src[i * 4 + k]! / 255, b = into[i * 4 + k]! / 255; into[i * 4 + k] = (((1 - ab) * as * s + ab * as * f(b, s) + (1 - as) * ab * b) / ao) * 255 }
        into[i * 4 + 3] = ao * 255
      }
    }
  }
  const out = new Float32Array(N * 4)
  draw(out, c.root.kids)
  return out
}
