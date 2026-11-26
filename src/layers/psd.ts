/**
 * A layered PSD from a stack: raster layers with blend modes and clipping, nested folders (pass-through or normal), and the flat picture for readers that
 * only show that. CLIP STUDIO PAINT opens PSD with layer names, folders, blend modes, opacity and visibility (verified by
 * others in CSP 5.0.4, see docs/layers-internals.md), and saves it as .clip from there. Node only.
 */
import { tree } from "./stack.ts"
import type { Layer, Mode, Node, Stack } from "./stack.ts"

const KEY: Record<Mode, string> = { normal: "norm", multiply: "mul ", add: "lddg", dodge: "div ", linearLight: "lLit", overlay: "over", screen: "scrn" }

class Out {
  private parts: Array<Buffer> = []
  length = 0
  push(b: Buffer): this { this.parts.push(b); this.length += b.length; return this }
  u8(v: number): this { const b = Buffer.alloc(1); b.writeUInt8(v); return this.push(b) }
  u16(v: number): this { const b = Buffer.alloc(2); b.writeUInt16BE(v); return this.push(b) }
  i16(v: number): this { const b = Buffer.alloc(2); b.writeInt16BE(v); return this.push(b) }
  u32(v: number): this { const b = Buffer.alloc(4); b.writeUInt32BE(v); return this.push(b) }
  i32(v: number): this { const b = Buffer.alloc(4); b.writeInt32BE(v); return this.push(b) }
  str(s: string): this { return this.push(Buffer.from(s, "latin1")) }
  done(): Buffer { return Buffer.concat(this.parts) }
}
/** PackBits, one row. */
const packRow = (r: Uint8Array): Buffer => {
  const o: Array<number> = []
  let i = 0
  while (i < r.length) {
    let j = i + 1
    while (j < r.length && j - i < 128 && r[j] === r[i]) j++
    if (j - i >= 3) { o.push(257 - (j - i), r[i]!); i = j; continue }
    j = i
    while (j < r.length && j - i < 128 && !(j + 2 < r.length && r[j] === r[j + 1] && r[j] === r[j + 2])) j++
    o.push(j - i - 1)
    for (let k = i; k < j; k++) o.push(r[k]!)
    i = j
  }
  return Buffer.from(o)
}
/** One plane, RLE: the row byte counts, then the rows. */
const rle = (plane: Uint8Array, w: number, h: number): { counts: Array<number>; data: Buffer } => {
  const rows = Array.from({ length: h }, (_, y) => packRow(plane.subarray(y * w, (y + 1) * w)))
  return { counts: rows.map((r) => r.length), data: Buffer.concat(rows) }
}
const planeOf = (rgba: Uint8Array, n: number, c: number): Uint8Array => { const p = new Uint8Array(n); for (let i = 0; i < n; i++) p[i] = rgba[i * 4 + c]!; return p }
const pascal = (s: string): Buffer => { const a = Buffer.from(s.replace(/[^\x20-\x7e]/g, "?").slice(0, 255), "latin1"), pad = (4 - ((a.length + 1) % 4)) % 4; return Buffer.concat([Buffer.from([a.length]), a, Buffer.alloc(pad)]) }
const block = (key: string, body: Buffer): Buffer => { const b = body.length % 2 ? Buffer.concat([body, Buffer.alloc(1)]) : body, o = new Out(); return o.str("8BIM").str(key).u32(b.length).push(b).done() }
const unicode = (s: string): Buffer => { const o = new Out().u32(s.length); for (const ch of s) o.u16(ch.charCodeAt(0)); return block("luni", o.done()) }

type Rec = { top: number; left: number; w: number; h: number; mode: string; opacity: number; hidden: boolean; clip: boolean; name: string; extra: Array<Buffer>; planes: Array<Uint8Array> | null }

/** Layers bottom first; a run of layers with the same path becomes a folder. */
export const psd = (s: Stack, flat: Uint8ClampedArray): Buffer => {
  const recs: Array<Rec> = []
  const leaf = (L: Layer): Rec => { const n = L.w * L.h; return { top: L.y, left: L.x, w: L.w, h: L.h, mode: KEY[L.mode], opacity: Math.round(L.opacity * 255), hidden: !L.visible, clip: L.clip ?? false, name: L.name, extra: [], planes: [3, 0, 1, 2].map((c) => planeOf(L.rgba, n, c)) } }
  const marker = (name: string, type: number, mode = "pass", clip = false): Rec => ({ top: 0, left: 0, w: 0, h: 0, mode: type === 3 ? "norm" : mode, opacity: 255, hidden: false, clip, name, extra: [block("lsct", type === 3 ? new Out().u32(3).done() : new Out().u32(type).str("8BIM").str(mode).done())], planes: null })
  const walk = (nodes: Array<Node>): void => { for (const n of nodes) { if ("layer" in n) { recs.push(leaf(n.layer)); continue } recs.push(marker("</Layer group>", 3)); walk(n.kids); recs.push(marker(n.folder, 1, n.sealed ? "norm" : "pass", n.clip)) } }
  walk(tree(s))
  const info = new Out().i16(recs.length), pixels = new Out()
  for (const r of recs) {
    const ch = [-1, 0, 1, 2], data = ch.map((_, c) => { if (!r.planes) return new Out().u16(0).done(); const { counts, data } = rle(r.planes[c]!, r.w, r.h), o = new Out().u16(1); for (const n of counts) o.u16(n); return o.push(data).done() })
    info.i32(r.top).i32(r.left).i32(r.top + r.h).i32(r.left + r.w).u16(4)
    ch.forEach((id, c) => info.i16(id).u32(data[c]!.length))
    info.str("8BIM").str(r.mode).u8(r.opacity).u8(r.clip ? 1 : 0).u8((r.hidden ? 2 : 0) | 8).u8(0)
    const extra = Buffer.concat([new Out().u32(0).u32(0).done(), pascal(r.name), unicode(r.name), ...r.extra])
    info.u32(extra.length).push(extra)
    for (const d of data) pixels.push(d)
  }
  let layerInfo = Buffer.concat([info.done(), pixels.done()])
  if (layerInfo.length % 2) layerInfo = Buffer.concat([layerInfo, Buffer.alloc(1)])
  const lm = new Out().u32(layerInfo.length).push(layerInfo).u32(0).done()

  // the flat picture, RLE, all row counts first
  const N = s.w * s.h, rgb = [0, 1, 2].map((c) => { const p = new Uint8Array(N); for (let i = 0; i < N; i++) p[i] = flat[i * 3 + c]!; return rle(p, s.w, s.h) })
  const out = new Out().str("8BPS").u16(1).push(Buffer.alloc(6)).u16(3).u32(s.h).u32(s.w).u16(8).u16(3).u32(0).u32(0).u32(lm.length).push(lm).u16(1)
  for (const p of rgb) for (const n of p.counts) out.u16(n)
  for (const p of rgb) out.push(p.data)
  return out.done()
}
