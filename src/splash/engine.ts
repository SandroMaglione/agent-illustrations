/** What a drawing is made of, and what every tool reads: regions, numbered lines, named shapes. Drawn by src/bold/render.ts. */
import { loop } from "../cel/path.ts"
import { fill, paper } from "../bucket/fill.ts"
import type { Clicks } from "../bucket/fill.ts"
import { flood } from "../lineart/flood.ts"
import { loadInk } from "../lineart/main.ts"
import { curveless } from "../lineart/poly.ts"
import type { Seed } from "../lineart/seeds.ts"
import type { Light } from "../tools/light.ts"
import type { EyeSpec } from "../tools/eyes.ts"
import { refsOf } from "../tools/refs.ts"
import type { Refs } from "../tools/refs.ts"
import { stamper } from "../tools/stamp.ts"
import type { Patch, Stamped } from "../tools/stamp.ts"
import { strokesOf, thaw } from "../tools/strokes.ts"
import type { Kind, RGB } from "../bold/tones.ts"
import type { Hair } from "../bold/locks.ts"
import type { Form } from "../bold/planes.ts"

export type Level = "s1" | "s2" | "s3" | "form" | "lt" | "sheen" | "ring" | "hi" | "lift"
/** A polygon by coordinates (`d`), or a statement about the drawn lines (`say`, see tools/say.ts) with a name of its own. */
export type Shape = { lv: Level; on: ReadonlyArray<string>; d: string; a: number; id?: string; say?: string; in?: string }
export type Wash = { late?: boolean; on: ReadonlyArray<string>; x: number; y: number; rx: number; ry: number; color: RGB; a: number; mode?: "mix" | "mul" }
export type Art = {
  /** Head height in line-art px (crown to chin): line weight and key lines are judged against it. */
  head: number
  /** Small accessories that must read as their own silhouette: they get a pale key line where they overlap the figure. */
  keyline?: ReadonlyArray<string>
  src: string; w: number; h: number; seeds: ReadonlyArray<Seed>; walls: ReadonlyArray<string>
  /** Frozen line numbers, for shapes that name lines. */
  lines?: string
  /** Bucket mode: one click per patch and the lines the artist left open. Replaces seeds, walls and force. */
  clicks?: { at: Clicks; walls: ReadonlyArray<string> }
  force: ReadonlyArray<{ label: string; d: string; over?: ReadonlyArray<string> }>
  defs: Readonly<Record<string, { color: string; kind: Kind; z: number; rim?: number; grain?: number }>>
  grads: ReadonlyArray<{ on: ReadonlyArray<string>; a: readonly [number, number]; b: readonly [number, number]; to: RGB; k: number }>
  /** Caster, receiver, how far it falls, and the share of that which is deep: things that stand off the surface. */
  casts: ReadonlyArray<readonly [ReadonlyArray<string>, ReadonlyArray<string>, number, number?]>
  light?: Light
  /** Forms that get their turned and lit planes by themselves (bold/planes.ts). */
  forms?: ReadonlyArray<Form>
  /** Hair, shaded lock by lock (bold/locks.ts). */
  hair?: ReadonlyArray<Hair>
  /** Fine rendering: a tone for every facet of a piece (tools/facets.ts). Such a piece gets no planes by itself. */
  tones?: Readonly<Record<string, string>>
  /** Parts whose inner lines are printed on them: they stay ink. */
  print?: ReadonlyArray<string>
  /** Brows, under the line and shining faintly through the hair. */
  brows?: ReadonlyArray<{ d: string; color: string }>
  /** How far back a part lies, 0 to 1: further back is paler, bluer and has less contrast. */
  depth?: Readonly<Record<string, number>>
  /** Where the eye should land: further out, values close up and lines soften. */
  focus?: { x: number; y: number; rx: number; ry: number; dim: number }
  /** Parts that take the shade of what they lie on. */
  inherits?: ReadonlyArray<readonly [ReadonlyArray<string>, ReadonlyArray<string>]>
  /** Thickness of hard parts: px of lit rim and shaded rim. */
  bevels?: ReadonlyArray<{ on: ReadonlyArray<string>; w: number; lit: number; deep?: boolean }>
  shapes: ReadonlyArray<Shape>; soft: ReadonlyArray<readonly [number, number, number]>; washes: ReadonlyArray<Wash>
  noink: ReadonlyArray<string>
  /** Eyes placed from the lines the artist drew. */
  eyes?: ReadonlyArray<EyeSpec>
  face: (g: CanvasRenderingContext2D) => void; over: (g: CanvasRenderingContext2D) => void
  back: (g: CanvasRenderingContext2D) => void; front: (g: CanvasRenderingContext2D) => void
}
export const PASSES = ["Line art", "Flats", "Gradients", "Contact", "Shadow shapes", "Edges and warm band", "Deep shade", "Ring and light shapes", "Face and eyes", "Colour line", "Finish"] as const
export type View = "normal" | "grey" | "value" | "masks" | "regions"

const vote = (wall: Float32Array, w: number, h: number) => (seed: Uint8Array): void => {
  const seen = new Uint8Array(w * h), stack = new Int32Array(w * h)
  for (let s0 = 0; s0 < seed.length; s0++) {
    if (seen[s0] || wall[s0]! > 0.4) continue
    let top = 0, read = 0
    const count = new Map<number, number>()
    stack[top++] = s0; seen[s0] = 1
    while (read < top) {
      const i = stack[read++]!
      if (seed[i]) count.set(seed[i]!, (count.get(seed[i]!) ?? 0) + 1)
      const x = i % w
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) if (j >= 0 && j < seed.length && !seen[j] && wall[j]! <= 0.4) { seen[j] = 1; stack[top++] = j }
    }
    if (count.size < 2) continue
    let total = 0, best = 0, bn = 0
    for (const [n, c] of count) { total += c; if (c > best) { best = c; bn = n } }
    if (best / total > 0.86) for (let q = 0; q < top; q++) if (seed[stack[q]!]) seed[stack[q]!] = bn
  }
}

/** Pass 1's input: which part every pixel belongs to. */
export const regionsOf = async (art: Art, k: number, by: "marks" | "clicks" = art.clicks ? "clicks" : "marks"): Promise<{ ink: Float32Array; w: number; h: number; names: Array<string>; map: Uint8Array; seg?: Int32Array }> => {
  const { ink, w, h } = await loadInk(art.src, k)
  if (by === "clicks" && art.clicks) { const P = paper(ink, w, h, art.clicks.walls, k), f = fill(P, w, h, art.clicks.at, k); return { ink, w, h, names: f.names, map: f.map, seg: P.P.seg } }
  const N = w * h
  const t = document.createElement("canvas")
  t.width = w; t.height = h
  const tmp = { g: t.getContext("2d", { willReadFrequently: true })! }
  const trace = (g: CanvasRenderingContext2D, d: string): void => { g.beginPath(); loop(d).forEach(([x, y], i) => (i ? g.lineTo(x * k, y * k) : g.moveTo(x * k, y * k))); g.closePath() }
  const alphaOf = (): Uint8ClampedArray => tmp.g.getImageData(0, 0, w, h).data

  const wall = Float32Array.from(ink)
  tmp.g.lineWidth = 2.2 * k; tmp.g.lineCap = "round"
  for (const q of art.walls) { tmp.g.beginPath(); curveless(q).forEach(([x, y], i) => (i ? tmp.g.lineTo(x * k, y * k) : tmp.g.moveTo(x * k, y * k))); tmp.g.stroke() }
  const wd = alphaOf()
  for (let i = 0; i < N; i++) if (wd[i * 4 + 3]! > 100) wall[i] = 1
  const { names, map } = flood(wall, w, h, art.seeds, k, vote(wall, w, h))
  // under thick ink two floods meet in a comb; a majority vote makes every hidden border one clean edge
  for (let pass = 0; pass < 3; pass++) {
    const src = map.slice()
    const count = new Uint16Array(256)
    const r = Math.max(1, Math.round(1.3 * k))
    for (let y = r; y < h - r; y++) for (let x = r; x < w - r; x++) {
      const i = y * w + x
      if (ink[i]! < 0.25 || src[i] === 0) continue
      // the figure may grow into the page under the ink, never shrink: thin hair tips survive
      const page = names[src[i]!] === "bg"
      let best = src[i]!, bn = 0
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const q = src[i + dy * w + dx]!; if (!page && names[q] === "bg") continue; const c = ++count[q]!; if (c > bn || (c === bn && q === src[i])) { bn = c; best = q } }
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) count[src[i + dy * w + dx]!] = 0
      map[i] = best
    }
  }
  for (const f of art.force) {
    let n = names.indexOf(f.label)
    if (n < 0) { names.push(f.label); n = names.length - 1 }
    const ok = f.over?.map((o) => names.indexOf(o))
    tmp.g.clearRect(0, 0, w, h); trace(tmp.g, f.d); tmp.g.fill()
    const d = alphaOf()
    for (let i = 0; i < N; i++) if (d[i * 4 + 3]! > 127 && (!ok || ok.includes(map[i]!))) map[i] = n
  }
  return { ink, w, h, names, map }
}

type Regions = Awaited<ReturnType<typeof regionsOf>>
/** Lines and statements are always worked out at this scale, so neither the numbers nor the shapes change with the size of the render. */
export const FIXED = 2
const fixed = new Map<string, Promise<Regions>>(), traced = new Map<string, Promise<Refs>>()
export const fixedOf = (art: Art): Promise<Regions> => { const got = fixed.get(art.src) ?? regionsOf(art, FIXED); fixed.set(art.src, got); return got }
/** The numbered lines of a drawing. */
export const linesOf = (art: Art): Promise<Refs> => {
  const got = traced.get(art.src) ?? fixedOf(art).then((q) => { const l = strokesOf(q.ink, q.w, q.h, FIXED, q.map); return refsOf(art.lines ? thaw(l, art.lines) : l) })
  traced.set(art.src, got)
  return got
}
/** Every shape that is a statement, as a mask, enlarged to the size of the render. */
const stamped = new Map<ReadonlyArray<Shape>, Promise<Array<Stamped>>>()
export const stampsOf = async (art: Art, k: number, q: Pick<Regions, "map" | "names" | "w" | "h">): Promise<Map<string, Stamped>> => {
  const make = async (): Promise<Array<Stamped>> => {
    const said = art.shapes.filter((s) => s.say), done = new Map<string, Stamped>()
    if (!said.length) return []
    const stamp = stamper({ ...(await fixedOf(art)), k: FIXED, ...(art.light ? { light: art.light } : {}) }, await linesOf(art))
    for (const s of said) { try { done.set(s.id!, stamp({ id: s.id!, say: s.say!, on: s.on, ...(s.in ? { in: s.in } : {}) }, done)) } catch (e) { console.error(`#${s.id}: ${(e as Error).message}`) } }
    for (const m of done.values()) if (/LEAK|DEAD/.test(m.note)) console.error(`#${m.id}: ${m.note}`)
    return [...done.values()]
  }
  const got = stamped.get(art.shapes) ?? make()
  stamped.set(art.shapes, got)
  const f = await fixedOf(art), on = new Map(art.shapes.map((s) => [s.id, s.on]))
  return new Map((await got).map((m) => [m.id, k === FIXED ? m : { ...m, ...enlarge(m, f.w, q, on.get(m.id)!) }]))
}
const enlarge = (p: Patch, w: number, q: Pick<Regions, "map" | "names" | "w" | "h">, on: ReadonlyArray<string>): Patch => {
  const ok = new Uint8Array(q.names.length), r = w / q.w
  for (const n of on) { const i = q.names.indexOf(n); if (i > 0) ok[i] = 1 }
  const x0 = Math.floor(p.x / r), y0 = Math.floor(p.y / r), W = Math.min(q.w - x0, Math.ceil(p.w / r)), H = Math.min(q.h - y0, Math.ceil(p.h / r)), m = new Uint8Array(Math.max(0, W * H))
  const at = (x: number, y: number): number => (x < 0 || y < 0 || x >= p.w || y >= p.h ? 0 : p.m[y * p.w + x]!)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!ok[q.map[(y + y0) * q.w + x + x0]!]) continue
    const fx = (x + x0 + 0.5) * r - 0.5 - p.x, fy = (y + y0 + 0.5) * r - 0.5 - p.y, X = Math.floor(fx), Y = Math.floor(fy), u = fx - X, v = fy - Y
    if (at(X, Y) * (1 - u) * (1 - v) + at(X + 1, Y) * u * (1 - v) + at(X, Y + 1) * (1 - u) * v + at(X + 1, Y + 1) * u * v > 0.5) m[y * W + x] = 1
  }
  return { x: x0, y: y0, w: W, h: H, m }
}
