/**
 * Layers out of the renderer. The renderer paints one RGB buffer in steps; with a recorder, every step becomes a layer
 * of a drawing program, so the result can be opened and refined as a layer stack (PSD, .clip, OpenRaster).
 *
 * A step is known only as "before" and "after", plus how strongly it touched each pixel (`cover`). From that a layer is
 * fitted in the blend mode that says what the step does: a shade multiplies, a light adds, grain sits on neutral grey.
 * The fit is exact: the stack, composited, gives the render back (`scripts/layers.ts` checks it).
 */
import type { Mode } from "./stack.ts"

export type Hint = { mode: "auto" | "normal" | "multiply" | "add" | "dodge" | "linearLight" | "overlay"; color?: readonly [number, number, number] }
/** One layer as it leaves the browser: pixels cut to their box, deflated. */
export type Out = { key: string; name: string; group: string; clip?: boolean; mode: Mode; x: number; y: number; w: number; h: number; pixels: number; data: Uint8Array }

const deflate = async (b: Uint8Array): Promise<Uint8Array> => new Uint8Array(await new Response(new Blob([b as BlobPart]).stream().pipeThrough(new CompressionStream("deflate"))).arrayBuffer())

export class Recorder {
  readonly out: Array<Out> = []
  readonly notes: Array<string> = []
  w = 0
  h = 0
  /** The step the next layers come from, as `STEPS` names it, or `flat:<part>`, `detail:<name>`, `print:<name>`. */
  key = ""
  /** The drawing's plan of folders, and the layer plan's helpers. */
  folders: ReadonlyArray<readonly [string, string, "fine"?]> | null = null
  /** Left and right of the face, in px. */
  mid = 0
  /** Set by the renderer, which knows the size at its scale. */
  size(w: number, h: number): void { this.w = w; this.h = h }

  /** Keeps a finished RGBA layer (straight alpha). Empty layers are dropped. */
  async keep(name: string, group: string, mode: Mode, rgba: Uint8ClampedArray | Uint8Array, at?: number, clip = false): Promise<void> {
    const { w, h } = this
    let x0 = w, y0 = h, x1 = -1, y1 = -1, n = 0
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (rgba[(y * w + x) * 4 + 3]) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
    if (!n) { this.notes.push(`${name}: empty, dropped`); return }
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1, cut = new Uint8Array(bw * bh * 4)
    for (let y = 0; y < bh; y++) cut.set(rgba.subarray(((y + y0) * w + x0) * 4, ((y + y0) * w + x1 + 1) * 4), y * bw * 4)
    const o: Out = { key: this.key, name, group, mode, clip, x: x0, y: y0, w: bw, h: bh, pixels: n, data: await deflate(cut) }
    if (at === undefined) this.out.push(o); else this.out.splice(at, 0, o)
  }

  /**
   * Fits one step as a layer. `before`/`after` are the float buffers, `cover` how strongly the step touched each pixel (0..1).
   * Pixels the preferred mode cannot express (a multiply that brightens) go to a second layer, so nothing is lost.
   */
  async step(name: string, group: string, hint: Hint, before: ReadonlyArray<Float32Array>, after: ReadonlyArray<Float32Array>, cover: Float32Array): Promise<void> {
    // the renderer clamps only at the end, a stack of 8-bit layers at every layer: fitted between clamped values, each layer
    // takes what the stack holds to what it should hold, also where a step goes past white and the next comes back
    const N = this.w * this.h, clamp = (x: ReadonlyArray<Float32Array>): ReadonlyArray<Float32Array> => {
      let out = false
      for (const c of x) for (let i = 0; i < c.length; i++) if (c[i]! < 0 || c[i]! > 255) { out = true; break }
      if (!out) return x
      return x.map((c) => { const o = new Float32Array(c.length); for (let i = 0; i < c.length; i++) { const v = c[i]!; o[i] = v < 0 ? 0 : v > 255 ? 255 : v } return o })
    }
    before = clamp(before); after = clamp(after)
    if (hint.mode !== "auto") return this.fitted(name, group, hint.mode, before, after, cover, hint.color)
    // a tint that darkens some channels and lifts others: what darkens multiplies, what lifts dodges (divides by what is left to white): both are a factor, so neither carries the picture in it
    const mid = [0, 1, 2].map(() => new Float32Array(N))
    let lifts = 0
    for (let c = 0; c < 3; c++) { const b = before[c]!, a = after[c]!, m = mid[c]!; for (let i = 0; i < N; i++) { m[i] = Math.min(b[i]!, a[i]!); if (a[i]! > b[i]! + 0.02) lifts++ } }
    await this.fitted(name, group, "multiply", before, mid, cover)
    if (lifts) await this.fitted(`${name}, lift`, group, "dodge", mid, after, cover)
  }

  private async fitted(name: string, group: string, mode: Mode, before: ReadonlyArray<Float32Array>, after: ReadonlyArray<Float32Array>, cover: Float32Array, color?: Hint["color"]): Promise<void> {
    const N = this.w * this.h, main = new Uint8ClampedArray(N * 4), rest = new Uint8ClampedArray(N * 4)
    const [R0, G0, B0] = before as [Float32Array, Float32Array, Float32Array], [R1, G1, B1] = after as [Float32Array, Float32Array, Float32Array]
    let spill = 0
    for (let i = 0; i < N; i++) {
      const b = [R0[i]!, G0[i]!, B0[i]!], a = [R1[i]!, G1[i]!, B1[i]!], d = [a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!]
      if (Math.max(Math.abs(d[0]!), Math.abs(d[1]!), Math.abs(d[2]!)) < 0.02) continue
      const c = Math.min(1, Math.max(0, cover[i]!)), px = fit(mode, b, a, d, c, color), o = i * 4
      if (px) { main[o] = px[0]; main[o + 1] = px[1]; main[o + 2] = px[2]; main[o + 3] = px[3]; continue }
      // what the mode cannot say (a multiply that lightens, a sum over white) stays exact as a normal layer
      const q = fit("normal", b, a, d, c)!
      rest[o] = q[0]; rest[o + 1] = q[1]; rest[o + 2] = q[2]; rest[o + 3] = q[3]; spill++
    }
    await this.keep(name, group, mode, main)
    if (spill) { this.notes.push(`${name}: ${spill} px not ${mode}, kept as normal`); await this.keep(`${name} (rest)`, group, "normal", rest) }
  }
}

/** Alpha as 8 bit, never below what the colour needs. */
const alpha8 = (want: number, need: number): number => Math.min(255, Math.max(Math.ceil(need * 255 - 1e-6), Math.round(want * 255)))
const byte = (v: number): number => Math.max(0, Math.min(255, Math.round(v)))

/**
 * One pixel of a layer in a blend mode, so that before, with the layer on top, gives after. null when the mode cannot.
 * - normal: after = before + (color - before) * alpha
 * - multiply: after = before * (1 + (color/255 - 1) * alpha)
 * - add: after = before + color * alpha
 * - dodge: after = before + (before / (1 - color/255) - before) * alpha
 * - linearLight (alpha 1): after = before + 2 * color - 255; grey 127.5 does nothing
 * - overlay with a given colour: after = before + (overlay(before, color) - before) * alpha
 */
export const fit = (mode: Mode, b: ReadonlyArray<number>, a: ReadonlyArray<number>, d: ReadonlyArray<number>, cover: number, color?: readonly [number, number, number]): [number, number, number, number] | null => {
  if (mode === "normal") {
    let need = 0
    for (let c = 0; c < 3; c++) need = Math.max(need, d[c]! > 0 ? d[c]! / Math.max(1e-6, 255 - b[c]!) : -d[c]! / Math.max(1e-6, b[c]!))
    if (need > 1 + 1e-4) need = 1 // only when after leaves 0..255: the last clamp decides
    const A = alpha8(cover || need, need), t = A / 255
    return [byte(b[0]! + d[0]! / t), byte(b[1]! + d[1]! / t), byte(b[2]! + d[2]! / t), A]
  }
  if (mode === "multiply") {
    const f = [0, 1, 2].map((c) => (b[c]! > 0.5 ? a[c]! / b[c]! : 1))
    if (f.some((v) => v > 1 + 1e-4)) return null
    const need = Math.max(...f.map((v) => 1 - Math.min(1, v))), A = alpha8(cover || need, need), t = A / 255
    if (!A) return null
    return [byte(255 * (1 - (1 - Math.min(1, f[0]!)) / t)), byte(255 * (1 - (1 - Math.min(1, f[1]!)) / t)), byte(255 * (1 - (1 - Math.min(1, f[2]!)) / t)), A]
  }
  if (mode === "dodge") {
    // the factor, per channel; where the sum left white it is the one that just reaches it
    if (d.some((v) => v < -0.05)) return null
    const q = [0, 1, 2].map((c) => (b[c]! > 0.5 ? Math.max(0, a[c]! / b[c]! - 1) : 0)), A = alpha8(cover || 1, 0), t = A / 255
    if (!A) return [0, 0, 0, 0]
    const s = q.map((v) => { const u = v / t; return u / (1 + u) })
    return [byte(255 * s[0]!), byte(255 * s[1]!), byte(255 * s[2]!), A]
  }
  if (mode === "add") {
    if (d.some((v) => v < -0.05)) return null
    // the sum is clamped before it is mixed in, so it must stay under white
    const need = Math.max(...d.map((v, c) => Math.max(0, v) / Math.max(1e-6, 255 - b[c]!))), A = alpha8(cover || need, need), t = A / 255
    if (!A || need > 1) return null
    return [byte(d[0]! / t), byte(d[1]! / t), byte(d[2]! / t), A]
  }
  if (mode === "linearLight") {
    if (d.some((v) => Math.abs(v) > 255)) return null
    return [byte(127.5 + d[0]! / 2), byte(127.5 + d[1]! / 2), byte(127.5 + d[2]! / 2), 255]
  }
  if (mode === "overlay" && color) {
    // the colour is fixed: only the strength is fitted, from the channel that moved most
    const ov = [0, 1, 2].map((c) => overlay(b[c]!, color[c]!)), k = [0, 1, 2].reduce((m, c) => (Math.abs(ov[c]! - b[c]!) > Math.abs(ov[m]! - b[m]!) ? c : m), 0)
    const s = Math.abs(ov[k]! - b[k]!) > 0.5 ? d[k]! / (ov[k]! - b[k]!) : 0
    if (s <= 0 || s > 1.001) return null
    for (let c = 0; c < 3; c++) if (Math.abs(b[c]! + (ov[c]! - b[c]!) * s - a[c]!) > 1.5) return null
    return [color[0], color[1], color[2], alpha8(s, 0)]
  }
  return null
}
export const overlay = (b: number, s: number): number => (b < 128 ? (2 * b * s) / 255 : 255 - (2 * (255 - b) * (255 - s)) / 255)
