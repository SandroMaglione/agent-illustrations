/**
 * From the renderer's order to an illustrator's. The recorder gives one layer per paint step, over the whole figure; here
 * they become the file someone opens to go on painting, the same way in every drawing (bottom to top):
 *
 *   Paper, Background       what `back` draws, cut out of the white
 *   Colour/<part>           one folder per part, furthest first (`folders` in the drawing). In it, always in this order and
 *                           only where there is something: PART below, or FINE where the drawing says "fine" (face, hair), every
 *                           layer clipped to Base. A part can be in groups with folders of their own (Hair front/Fringe)
 *   Effects                 what lies over the whole figure: tint, glow, haze, grain
 *   Prints                  what is printed on things
 *   Face features           nose, mouth, brows and each eye, every one with all that is its own: paint, lines, lights
 *   Line art                body, face outline, hair outline, hair strands: each in one ink, its colour clipped to it
 *   Over lines              what `front` draws
 *
 * Parts never share a pixel, so a step can be cut along them without changing the picture. Steps are merged as operations
 * (x -> a x + b per channel), not as pictures: a multiply stays a colour of its own and does not carry what lies under it.
 * Some steps change places: the check in `scripts/layers.ts` says what that costs.
 */
import { BLACK } from "../bold/tones.ts"
import type { Out } from "./record.ts"
import { blend } from "./stack.ts"
import type { Layer, Mode, Stack } from "./stack.ts"

export type Raw = Omit<Out, "data" | "pixels"> & { rgba: Uint8Array }
type Only = "cast" | "form" | "left" | "right"
type Slot = { name: string; mode: Mode; keys: ReadonlyArray<string>; only?: Only }
export type Plan = ReadonlyArray<readonly [string, string, "fine"?]>
/** What a part's folder can hold above its Base. One list for every part of every drawing. */
export const PART: ReadonlyArray<Slot> = [
  { name: "Gradient", mode: "normal", keys: ["grads", "washes"] },
  { name: "Hue bands", mode: "normal", keys: ["hairTip", "hairUp", "hairDown"] },
  { name: "Half tone", mode: "multiply", keys: ["half"] },
  { name: "Shadow 1", mode: "multiply", keys: ["shade"] },
  { name: "Shadow edge", mode: "multiply", keys: ["scatter", "inner"] },
  { name: "Shadow lift", mode: "dodge", keys: ["lift", "reflected"] },
  { name: "Shadow 2", mode: "multiply", keys: ["deep", "black"] },
  { name: "Metal", mode: "normal", keys: ["metal", "metalShade"] },
  { name: "Light", mode: "normal", keys: ["sheen", "lights", "rims", "hairLight"] },
  { name: "Highlight", mode: "normal", keys: ["gloss", "highlights"] },
  { name: "Reflected light", mode: "normal", keys: ["bounce", "bleed", "skyIn", "sky"] },
  { name: "Warm shade", mode: "overlay", keys: ["warmSkin"] },
  { name: "Blush", mode: "normal", keys: ["blush"] },
]
/** The same, one layer per effect: for the places an illustrator works on most. */
export const FINE: ReadonlyArray<Slot> = [
  { name: "Gradient", mode: "normal", keys: ["grads"] },
  { name: "Wash", mode: "normal", keys: ["washes"] },
  { name: "Tip colour", mode: "normal", keys: ["hairTip"] },
  { name: "Hue bands, light", mode: "normal", keys: ["hairUp"] },
  { name: "Hue bands, dark", mode: "normal", keys: ["hairDown"] },
  { name: "Half tone", mode: "multiply", keys: ["half"] },
  { name: "Shadow 1, form", mode: "multiply", keys: ["shade"], only: "form" },
  { name: "Shadow 1, cast", mode: "multiply", keys: ["shade"], only: "cast" },
  { name: "Shadow edge, scatter", mode: "multiply", keys: ["scatter"] },
  { name: "Shadow edge, core", mode: "multiply", keys: ["inner"] },
  { name: "Shadow lift", mode: "dodge", keys: ["lift", "reflected"] },
  { name: "Shadow 2, form", mode: "multiply", keys: ["deep", "black"], only: "form" },
  { name: "Shadow 2, cast", mode: "multiply", keys: ["deep", "black"], only: "cast" },
  { name: "Metal", mode: "normal", keys: ["metal", "metalShade"] },
  { name: "Light", mode: "normal", keys: ["sheen", "lights", "hairLight"] },
  { name: "Rim light", mode: "normal", keys: ["rims"] },
  { name: "Highlight", mode: "normal", keys: ["gloss", "highlights"] },
  { name: "Reflected, bounce", mode: "normal", keys: ["bounce"] },
  { name: "Reflected, neighbours", mode: "normal", keys: ["bleed"] },
  { name: "Reflected, second light edge", mode: "normal", keys: ["skyIn"] },
  { name: "Reflected, second light", mode: "normal", keys: ["sky"] },
  { name: "Warm shade", mode: "overlay", keys: ["warmSkin"] },
  { name: "Blush, left", mode: "normal", keys: ["blush"], only: "left" },
  { name: "Blush, right", mode: "normal", keys: ["blush"], only: "right" },
]
const TINT = ["warm", "airWarm", "airCool", "focus"]
export const TOP = ["Colour", "Effects", "Prints", "Face features", "Line art", "Over lines"]

const byte = (v: number): number => Math.max(0, Math.min(255, Math.round(v)))
type Box = { x: number; y: number; w: number; h: number }

/** Steps as one operation per pixel and channel over a box: x -> a x + b, and how much of the pixel they cover. */
class Op {
  readonly a: Float32Array
  readonly b: Float32Array
  readonly cover: Float32Array
  /** Only mixes towards a colour, so the colour does not depend on what lies under it. */
  pure = true
  readonly box: Box
  constructor(box: Box) { this.box = box; const n = box.w * box.h; this.a = new Float32Array(n * 3).fill(1); this.b = new Float32Array(n * 3); this.cover = new Float32Array(n) }
  add(L: Raw, mask: Uint8Array, W: number): void {
    const { x: X, y: Y, w, h } = this.box
    if (L.mode !== "normal") this.pure = false
    for (let y = Math.max(0, L.y - Y); y < Math.min(h, L.y + L.h - Y); y++) for (let x = Math.max(0, L.x - X); x < Math.min(w, L.x + L.w - X); x++) {
      const p = ((y + Y - L.y) * L.w + x + X - L.x) * 4, al = L.rgba[p + 3]! / 255
      if (!al || !mask[(y + Y) * W + x + X]) continue
      const i = y * w + x
      for (let c = 0; c < 3; c++) {
        const s = L.rgba[p + c]!, q = i * 3 + c
        const f = L.mode === "normal" ? 1 - al : L.mode === "multiply" ? 1 + (s / 255 - 1) * al : 1 + (s / 255 / Math.max(0.004, 1 - s / 255)) * al
        this.a[q] = this.a[q]! * f; this.b[q] = this.b[q]! * f + (L.mode === "normal" ? s * al : 0)
      }
      this.cover[i] = 1 - (1 - this.cover[i]!) * (1 - al)
    }
  }
}

/** The operation as a layer of one mode, over `state` (the part so far). */
const asLayer = (op: Op, mode: Mode, state: Float32Array, full = false): { rgba: Uint8Array; odd: number } => {
  const n = op.cover.length, rgba = new Uint8Array(n * 4)
  let odd = 0
  for (let i = 0; i < n; i++) {
    const cov = op.cover[i]!
    if (cov <= 0) continue
    const f = [op.a[i * 3]!, op.a[i * 3 + 1]!, op.a[i * 3 + 2]!], g = [op.b[i * 3]!, op.b[i * 3 + 1]!, op.b[i * 3 + 2]!], o = i * 4
    if (mode === "normal") {
      const need = op.pure ? 0 : Math.max(...[0, 1, 2].map((c) => { const b = state[i * 3 + c]!, d = f[c]! * b + g[c]! - b; return d > 0 ? d / Math.max(1, 255 - b) : -d / Math.max(1, b) }))
      const A = Math.max(byte(cov * 255), Math.min(255, Math.ceil(need * 255 - 1e-3))), t = A / 255
      if (!A) continue
      for (let c = 0; c < 3; c++) { const b = state[i * 3 + c]!; rgba[o + c] = byte(op.pure ? g[c]! / Math.max(1e-6, cov) : b + (f[c]! * b + g[c]! - b) / t) }
      rgba[o + 3] = A
    } else if (mode === "multiply") {
      if (Math.max(...f) > 1.004) odd++
      const need = Math.max(...f.map((v) => 1 - Math.min(1, v))), A = full ? 255 : Math.max(byte(cov * 255), Math.ceil(need * 255 - 1e-3)), t = A / 255
      if (!A) continue
      for (let c = 0; c < 3; c++) rgba[o + c] = byte(255 * (1 - (1 - Math.min(1, f[c]!)) / t))
      rgba[o + 3] = A
    } else {
      // opaque: a dodge clamps at white before alpha mixes it in, so a lift carried by alpha would stop short on light colours
      const A = full ? (Math.max(...f) > 1.002 ? 255 : 0) : byte(cov * 255), t = A / 255
      if (!A) continue
      for (let c = 0; c < 3; c++) { const u = Math.max(0, f[c]! - 1) / t; rgba[o + c] = byte((255 * u) / (1 + u)) }
      rgba[o + 3] = A
    }
  }
  return { rgba, odd }
}
/** Soft edges take the colour of the shape they belong to: at low alpha the colour is rounding noise, and shows when someone raises the opacity. */
const settle = (rgba: Uint8Array, w: number, h: number, r: number): void => {
  const src = rgba.slice()
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4, A = src[o + 3]!
    if (!A || A >= 200) continue
    let best = A, at = -1
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; const q = (Y * w + X) * 4; if (src[q + 3]! > best + 20 && Math.max(Math.abs(src[q]! - src[o]!), Math.abs(src[q + 1]! - src[o + 1]!), Math.abs(src[q + 2]! - src[o + 2]!)) * A <= 1.5 * 255) { best = src[q + 3]!; at = q } }
    if (at >= 0) { rgba[o] = src[at]!; rgba[o + 1] = src[at + 1]!; rgba[o + 2] = src[at + 2]! }
  }
}
/** Dust: islands too small to be a decision, left where a soft edge crossed into the next part. They sit under the lines. */
const sweep = (rgba: Uint8Array, w: number, h: number, least: number): void => {
  const seen = new Uint8Array(w * h)
  for (let q = 0; q < w * h; q++) {
    if (!rgba[q * 4 + 3] || seen[q]) continue
    const c = [q]
    seen[q] = 1
    for (let t = 0; t < c.length; t++) { const j = c[t]!, x = j % w; for (const g of [x > 0 ? j - 1 : -1, x < w - 1 ? j + 1 : -1, j - w, j + w]) if (g >= 0 && g < w * h && !seen[g] && rgba[g * 4 + 3]) { seen[g] = 1; c.push(g) } }
    if (c.length < least) for (const j of c) rgba[j * 4 + 3] = 0
  }
}
const trim = (rgba: Uint8Array, b: Box): (Box & { rgba: Uint8Array }) | null => {
  let x0 = b.w, y0 = b.h, x1 = -1, y1 = -1
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) if (rgba[(y * b.w + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  if (x1 < 0) return null
  const w = x1 - x0 + 1, h = y1 - y0 + 1, o = new Uint8Array(w * h * 4)
  for (let y = 0; y < h; y++) o.set(rgba.subarray(((y + y0) * b.w + x0) * 4, ((y + y0) * b.w + x1 + 1) * 4), y * w * 4)
  return { x: b.x + x0, y: b.y + y0, w, h, rgba: o }
}

export const arrange = (raw: ReadonlyArray<Raw>, plan: Plan, w: number, h: number, mid = 0): { stack: Stack; notes: Array<string>; problems: Array<string> } => {
  const notes: Array<string> = [], problems: Array<string> = [], layers: Array<Layer> = [], N = w * h, all: Box = { x: 0, y: 0, w, h }
  const of = (k: string): Array<Raw> => raw.filter((L) => L.key === k)
  const leaf = (group: string, name: string, mode: Mode, b: Box & { rgba: Uint8Array }, clip = false): void => { layers.push({ name, group, mode, opacity: 1, visible: true, x: b.x, y: b.y, w: b.w, h: b.h, rgba: b.rgba, clip }) }
  leaf("", "Paper", "normal", { ...all, rgba: new Uint8Array(N * 4).fill(255) })
  // what is drawn behind the figure, lifted off the white it was drawn on
  for (const L of of("back")) {
    const o = L.rgba.slice()
    for (let i = 0; i < o.length; i += 4) if (o[i + 3]) { const lo = Math.min(o[i]!, o[i + 1]!, o[i + 2]!), a = 1 - lo / 255; if (a < 0.004) { o[i + 3] = 0; continue } for (let c = 0; c < 3; c++) o[i + c] = byte((o[i + c]! - 255 * (1 - a)) / a); o[i + 3] = byte(a * 255 * (o[i + 3]! / 255)) }
    const t = trim(o, L)
    if (t) leaf("", "Background", "normal", t)
  }

  const flats = new Map(raw.filter((L) => L.key.startsWith("flat:")).map((L) => [L.key.slice(5), L] as const)), figure = new Uint8Array(N), used = new Map<string, string>(), known = new Set<string>()
  for (const s of [...PART, ...FINE]) for (const k of s.keys) known.add(k)
  const castBy = new Uint8Array(N), sides: Partial<Record<Only, Uint8Array>> = {}
  for (const L of of("mask:cast")) for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) if (L.rgba[(y * L.w + x) * 4 + 3]) castBy[(y + L.y) * w + x + L.x] = 1
  sides.cast = castBy; sides.form = castBy.map((v) => 1 - v); sides.left = new Uint8Array(N).map((_, i) => (i % w < mid ? 1 : 0)); sides.right = sides.left.map((v) => 1 - v)
  for (const [folder, parts, fine] of plan) {
    const names = parts.split(" "), mine: Array<Raw> = []
    for (const n of names) { const L = flats.get(n); if (used.has(n)) problems.push(`part ${n} is in ${used.get(n)} and in ${folder}`); used.set(n, folder); if (L) mine.push(L); else problems.push(`${folder}: no part ${n}`) }
    if (!mine.length) continue
    const x0 = Math.min(...mine.map((L) => L.x)), y0 = Math.min(...mine.map((L) => L.y)), box: Box = { x: x0, y: y0, w: Math.max(...mine.map((L) => L.x + L.w)) - x0, h: Math.max(...mine.map((L) => L.y + L.h)) - y0 }
    const mask = new Uint8Array(N), base = new Uint8Array(box.w * box.h * 4), state = new Float32Array(box.w * box.h * 3)
    for (const L of mine) for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) { const p = (y * L.w + x) * 4; if (!L.rgba[p + 3]) continue; const i = (y + L.y - y0) * box.w + x + L.x - x0; mask[(y + L.y) * w + x + L.x] = 1; figure[(y + L.y) * w + x + L.x] = 1; for (let c = 0; c < 4; c++) base[i * 4 + c] = L.rgba[p + c]!; for (let c = 0; c < 3; c++) state[i * 3 + c] = L.rgba[p + c]! }
    leaf(`Colour/${folder}`, "Base", "normal", trim(base, box)!)
    const put = (name: string, mode: Mode, rgba: Uint8Array): void => {
      let seen = 0
      for (let i = 0; i < box.w * box.h; i++) { const a = rgba[i * 4 + 3]! / 255; if (!a) continue; let m = 0; for (let c = 0; c < 3; c++) { const b = state[i * 3 + c]!, v = b + (blend(mode, b, rgba[i * 4 + c]!) - b) * a; m = Math.max(m, Math.abs(v - b)) } if (m >= 3) seen++ }
      // a layer nobody can see is only in the way
      if (seen < Math.max(12, N / 60000)) { if (rgba.some((v, i) => i % 4 === 3 && v)) notes.push(`${folder}/${name}: hardly visible, left out`); return }
      for (let i = 0; i < box.w * box.h; i++) { const a = rgba[i * 4 + 3]! / 255; if (a) for (let c = 0; c < 3; c++) { const b = state[i * 3 + c]!; state[i * 3 + c] = b + (blend(mode, b, rgba[i * 4 + c]!) - b) * a } }
      const t = trim(rgba, box)
      if (t) leaf(`Colour/${folder}`, name, mode, t, true)
    }
    for (const s of fine ? FINE : PART) {
      const src = s.keys.flatMap(of), only = s.only ? mask.map((v, i) => v & sides[s.only!]![i]!) : mask
      if (!src.length) continue
      if (s.mode === "overlay") { const o = new Uint8Array(box.w * box.h * 4); for (const L of src) for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) { const X = x + L.x - x0, Y = y + L.y - y0; if (X < 0 || Y < 0 || X >= box.w || Y >= box.h || !mask[(y + L.y) * w + x + L.x]) continue; const p = (y * L.w + x) * 4; if (L.mode === "overlay") o.set(L.rgba.subarray(p, p + 4), (Y * box.w + X) * 4) } sweep(o, box.w, box.h, N / 350000); put(s.name, s.mode, o); continue }
      const op = new Op(box)
      for (const L of src) op.add(L, only, w)
      const { rgba, odd } = asLayer(op, s.mode, state)
      if (odd) notes.push(`${folder}/${s.name}: ${odd} px both lift and darken, the lift is lost`)
      settle(rgba, box.w, box.h, 3)
      sweep(rgba, box.w, box.h, N / 350000)
      put(s.name, s.mode, rgba)
    }
  }
  for (const n of flats.keys()) if (!used.has(n)) problems.push(`part ${n} is in no folder: its colours are missing`)

  // effects, over the figure. Tint and glow are factors of the place, not of the picture: smooth, and the same for everything
  const dark = new Op(all), glow = new Op(all), none = new Float32Array(0)
  for (const k of TINT) for (const L of of(k)) (L.mode === "dodge" ? glow : dark).add(L, figure, w)
  for (const [name, mode, op] of [["Tint", "multiply", dark], ["Glow", "dodge", glow]] as const) { for (let i = 0; i < N; i++) op.cover[i] = figure[i]!; const { rgba } = asLayer(op, mode, none, true), t = trim(rgba, all); if (t && rgba.some((v, i) => i % 4 !== 3 && figure[i >> 2] && (mode === "multiply" ? v < 252 : v > 3))) leaf("Effects", name, mode, t) }
  for (const [k, name] of [["haze", "Depth haze"], ["grain", "Grain"]] as const) for (const L of of(k)) leaf("Effects", name, L.mode, L)
  // printed on things: drawn flat, above the effects
  for (const L of raw.filter((q) => q.key.startsWith("print:"))) leaf("Prints", L.name, L.mode, L)
  // the face: every eye, the mouth, the nose and the brows with all that is theirs in one folder, paint, then lines, then lights
  const F = "Face features", inked = (group: string, name: string, L: Raw): void => {
    // the shape in one ink, its colours clipped on top, so either can be changed alone
    const one = L.rgba.slice(), col = L.rgba.slice()
    let tinted = 0, ink = 0
    for (let i = 0; i < one.length; i += 4) { if (L.rgba[i + 3]! > 40 && Math.max(...[0, 1, 2].map((c) => Math.abs(L.rgba[i + c]! - BLACK[c]!))) > 3) tinted++; if (L.rgba[i + 3]! > 40) ink++; for (let c = 0; c < 3; c++) one[i + c] = BLACK[c]!; col[i + 3] = L.rgba[i + 3] ? 255 : 0 }
    const a = trim(one, L), t = trim(col, L)
    if (a) leaf(group, name, "normal", a)
    if (a && t && tinted > Math.max(20, ink * 0.06)) leaf(group, name === "Line" ? "Line colour" : `${name}, colour`, "normal", t, true)
  }
  const RULED = ["Body", "Face", "Hair outline", "Hair strands"], lines = raw.filter((L) => L.key.startsWith("line:")), ruled = lines.filter((L) => RULED.includes(L.key.slice(5))), named = lines.filter((L) => !ruled.includes(L))
  const folderOf = (L: Raw): string => { const n = L.key.slice(L.key.indexOf(":") + 1); return L.key.startsWith("line:") ? (n.includes("/") ? n.split("/")[0]! : "") : n }
  const mine = [...raw.filter((L) => L.key.startsWith("detail:")), ...named, ...raw.filter((L) => L.key.startsWith("over:"))], order = ["", "Nose", "Mouth", "Brows"], rank = (n: string): number => { const i = order.indexOf(n); return i < 0 ? 9 : i }
  for (const L of of("face")) leaf(F, "Face marks", L.mode, L)
  const brows = of("brows"), names = [...new Set([...mine.map(folderOf), ...(brows.length ? ["Brows"] : [])])].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
  for (const f of names) {
    const at = f ? `${F}/${f}` : F
    if (f === "Brows") for (const L of brows) {
      // a brow, the other, and what of them shows through the hair
      const hair = new Uint8Array(N), face = new Uint8Array(N)
      for (const [k, Q] of flats) for (let y = 0; y < Q.h; y++) for (let x = 0; x < Q.w; x++) if (Q.rgba[(y * Q.w + x) * 4 + 3]) (k === "face" ? face : hair)[(y + Q.y) * w + x + Q.x] = 1
      for (const [name, ok] of [["Through the hair", (i: number) => hair[i] === 1], ["Brow left", (i: number) => face[i] === 1 && i % w < mid], [mid ? "Brow right" : "Brows", (i: number) => face[i] === 1 && i % w >= mid]] as const) {
        const o = L.rgba.slice()
        let n = 0
        for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) { const p = (y * L.w + x) * 4; if (!o[p + 3]) continue; if (ok((y + L.y) * w + x + L.x)) n++; else o[p + 3] = 0 }
        const t = n > 8 ? trim(o, L) : null
        if (t) leaf(at, name, L.mode, t)
      }
    }
    for (const L of mine) if (folderOf(L) === f) { if (L.key.startsWith("line:")) inked(at, L.key.slice(5).split("/").at(-1)!, L); else leaf(at, L.name, L.mode, L, L.clip ?? false) }
  }
  if (lines.length) for (const L of ruled) inked("Line art", L.key.slice(5), L)
  else for (const L of of("line")) inked("Line art", "Line", L)
  for (const [k, name] of [["over", "Eye lights"], ["front", "Front"]] as const) for (const L of of(k)) leaf("Over lines", name, L.mode, L)
  const placed = new Set([...known, ...TINT, "haze", "grain", "brows", "line", "over", "front", "back", "face"])
  for (const L of raw) if (!placed.has(L.key) && !/^(flat|detail|print|mask|line|over):/.test(L.key)) problems.push(`step ${L.key} (${L.name}) has no place in the layers`)
  return { stack: { w, h, layers, sealed: [...new Set(layers.map((L) => L.group).filter((g) => g && g !== "Colour" && g !== "Effects").flatMap((g) => { const p = g.split("/"); return p.map((_, i) => p.slice(0, i + 1).join("/")) }))].filter((g) => g !== "Colour") }, notes, problems }
}

/** What "clean" means, as rules that can fail. */
export const checkStack = (s: Stack, plan: Plan): Array<string> => {
  const bad: Array<string> = [], tops = s.layers.map((L) => L.group.split("/")[0]!).filter(Boolean).map((g) => TOP.indexOf(g))
  if (tops.some((v, i) => v < 0 || (i && v < tops[i - 1]!))) bad.push("top folders are not the fixed ones, in the fixed order")
  const groups = [...new Set(s.layers.map((L) => L.group))]
  for (const g of groups) {
    const kids = s.layers.filter((L) => L.group === g), names = kids.map((L) => L.name)
    if (new Set(names).size !== names.length) bad.push(`${g}: two layers with the same name`)
    const at = s.layers.map((L, i) => (L.group === g ? i : -1)).filter((i) => i >= 0)
    if (g && at.at(-1)! - at[0]! + 1 !== at.length) bad.push(`${g}: the folder is in two places`)
    if (!g.startsWith("Colour/")) continue
    if (!plan.some(([f]) => `Colour/${f}` === g)) bad.push(`${g}: not in the plan`)
    const order = ["Base", ...(plan.find(([f]) => `Colour/${f}` === g)?.[2] ? FINE : PART).map((q) => q.name)], ranks = names.map((n) => order.indexOf(n)), fixed = ranks.filter((v) => v >= 0)
    for (const [i, v] of ranks.entries()) if (v < 0) bad.push(`${g}/${names[i]!}: not a name from the list`)
    if (names[0] !== "Base") bad.push(`${g}: does not start with Base`)
    if (fixed.some((v, i) => i > 0 && v < fixed[i - 1]!)) bad.push(`${g}: layers out of order`)
    const base = kids[0]!
    for (const L of kids.slice(1)) {
      if (!L.clip) bad.push(`${g}/${L.name}: not clipped`)
      let out = 0
      for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) if (L.rgba[(y * L.w + x) * 4 + 3]) { const X = x + L.x - base.x, Y = y + L.y - base.y; if (X < 0 || Y < 0 || X >= base.w || Y >= base.h || !base.rgba[(Y * base.w + X) * 4 + 3]) out++ }
      if (out) bad.push(`${g}/${L.name}: ${out} px outside its Base`)
    }
  }
  for (const L of s.layers) if (!L.rgba.some((v, i) => i % 4 === 3 && v)) bad.push(`${L.group}/${L.name}: empty`)
  return bad
}
