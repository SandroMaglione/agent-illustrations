/** The renderer. Value first: every pixel is one of a few flat planes, and hue, gloss and line are laid on top without moving that plane's value much. */
import { loop } from "../cel/path.ts"
import { rng, smooth } from "../geo.ts"
import { blur } from "../lineart/flood.ts"
import { bevel } from "../tools/bevel.ts"
import { boxesOf, cast } from "../tools/cast.ts"
import { eye } from "../tools/eyes.ts"
import { inherit } from "../tools/inherit.ts"
import { aim, UPPER_LEFT } from "../tools/light.ts"
import { linesAnd, slivers } from "../tools/seal.ts"
import { each } from "../tools/stamp.ts"
import { FIXED, fixedOf, linesOf, regionsOf, stampsOf } from "../splash/engine.ts"
import type { Art, Level, Shape, View } from "../splash/engine.ts"
import { blocky } from "./contour.ts"
import { lineLayer } from "./line.ts"
import { strands } from "./strands.ts"
import { BLACK, hsv, luma, mix, SKY, SUN, tone, turnHue } from "./tones.ts"
import type { Kind, RGB } from "./tones.ts"
import { volume } from "./volume.ts"

/** Nearest enlargement of a small field. */
const enlarge = <T extends Float32Array | Uint8Array | Int8Array>(a: T, w: number, W: number, H: number, make: (n: number) => T): T => {
  const o = make(W * H), s = w / W, h = a.length / w
  for (let y = 0; y < H; y++) { const Y = Math.min(h - 1, Math.floor((y + 0.5) * s)) * w; for (let x = 0; x < W; x++) o[y * W + x] = a[Y + Math.min(w - 1, Math.floor((x + 0.5) * s))]! }
  return o
}
/** Smooth enlargement of a smooth field. */
const bilinear = (a: Float32Array, w: number, W: number, H: number): Float32Array => {
  const o = new Float32Array(W * H), h = a.length / w, s = w / W
  for (let y = 0; y < H; y++) { const fy = Math.max(0, Math.min(h - 1.001, (y + 0.5) * s - 0.5)), Y = fy | 0, v = fy - Y; for (let x = 0; x < W; x++) { const fx = Math.max(0, Math.min(w - 1.001, (x + 0.5) * s - 0.5)), X = fx | 0, u = fx - X, i = Y * w + X; o[y * W + x] = (a[i]! * (1 - u) + a[i + 1]! * u) * (1 - v) + (a[i + w]! * (1 - u) + a[i + w + 1]! * u) * v } }
  return o
}
export const render = async (art: Art, k: number, upto: number, view: View = "normal", cut = false): Promise<{ canvas: HTMLCanvasElement; stats: Record<string, number> }> => {
  const base = await fixedOf(art), { ink, w, h, names, map } = k === FIXED ? base : await regionsOf(art, k), N = w * h, light = art.light ?? UPPER_LEFT, sun = aim(light), H = art.head * k
  const refs = await linesOf(art), eyes = (art.eyes ?? []).map((e) => eye(e, refs, base.ink, base.w, FIXED, -sun.x))
  const mk = (): { c: HTMLCanvasElement; g: CanvasRenderingContext2D } => { const c = document.createElement("canvas"); c.width = w; c.height = h; return { c, g: c.getContext("2d", { willReadFrequently: true })! } }
  const tmp = mk(), trace = (g: CanvasRenderingContext2D, d: string): void => { g.beginPath(); loop(d).forEach(([x, y], i) => (i ? g.lineTo(x * k, y * k) : g.moveTo(x * k, y * k))); g.closePath() }
  const alphaOf = (): Uint8ClampedArray => tmp.g.getImageData(0, 0, w, h).data
  const defs = names.map((n) => art.defs[n] ?? null), kinds = defs.map((d) => d?.kind as Kind | undefined), tones = defs.map((d) => (d ? tone(d.color, d.kind as Kind) : null)), zs = defs.map((d) => d?.z ?? 0), bg = names.indexOf("bg")
  const set = (gs: ReadonlyArray<string>): Uint8Array => { const t = new Uint8Array(names.length); for (const g of gs) { const i = names.indexOf(g); if (i > 0) t[i] = 1 } return t }
  const of = (kind: ReadonlyArray<Kind>): Uint8Array => Uint8Array.from(kinds, (d) => (d && kind.includes(d) ? 1 : 0))

  const R = new Float32Array(N), G = new Float32Array(N), B = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    if (view === "regions") { const a = map[i]! * 137.5; R[i] = 165 + 85 * Math.cos((a * Math.PI) / 180); G[i] = 165 + 85 * Math.cos(((a + 120) * Math.PI) / 180); B[i] = 165 + 85 * Math.cos(((a + 240) * Math.PI) / 180); continue }
    const t = tones[map[i]!], c: RGB = !t || upto === 0 || map[i] === bg ? [255, 255, 255] : t.base
    R[i] = c[0]; G[i] = c[1]; B[i] = c[2]
  }
  const to = (i: number, c: RGB, a: number): void => { R[i] = R[i]! + (c[0] - R[i]!) * a; G[i] = G[i]! + (c[1] - G[i]!) * a; B[i] = B[i]! + (c[2] - B[i]!) * a }
  const times = (i: number, m: RGB, a: number): void => { R[i] = R[i]! * (1 + (m[0] - 1) * a); G[i] = G[i]! * (1 + (m[1] - 1) * a); B[i] = B[i]! * (1 + (m[2] - 1) * a) }
  /** A mask with one clean, sharp edge: pixel steps go, the shape stays. */
  const crisp = (m: Float32Array, r = 0.75): Float32Array => { const b = blur(m, w, h, Math.max(1, r * k), 2); for (let i = 0; i < N; i++) b[i] = smooth(0.4, 0.6, b[i]!); return b }
  const wash = (late: boolean): void => {
    const blushes = eyes.flatMap((e) => (e.blush ? [{ ...e.blush, on: ["face"], color: [250, 186, 178] as RGB, late: true, mode: undefined }] : []))
    for (const q of [...art.washes, ...blushes]) if (Boolean(q.late) === late) {
      const ok = set(q.on)
      for (let y = Math.max(0, Math.floor((q.y - q.ry) * k)); y < Math.min(h, (q.y + q.ry) * k); y++) for (let x = Math.max(0, Math.floor((q.x - q.rx) * k)); x < Math.min(w, (q.x + q.rx) * k); x++) { const i = y * w + x; if (!ok[map[i]!]) continue; const r = Math.hypot((x / k - q.x) / q.rx, (y / k - q.y) / q.ry); if (r < 1) to(i, q.color, q.a * (1 - smooth(0, 1, r))) }
    }
  }
  /* 2: local colour. Slow gradients, and the hue of the hair */
  if (upto >= 2 && view !== "regions") {
    for (const q of art.grads) { const ok = set(q.on), l2 = (q.b[0] - q.a[0]) ** 2 + (q.b[1] - q.a[1]) ** 2; for (let i = 0; i < N; i++) if (ok[map[i]!]) to(i, q.to, smooth(0, 1, (((i % w) / k - q.a[0]) * (q.b[0] - q.a[0]) + (((i / w) | 0) / k - q.a[1]) * (q.b[1] - q.a[1])) / l2) * q.k) }
    const hair = of(["hair"])
    if (hair.includes(1)) {
      const s = 1, W = art.w * s, HH = art.h * s, m = new Uint8Array(W * HH), l = new Float32Array(W * HH), st = base.w / W
      for (let y = 0; y < HH; y++) for (let x = 0; x < W; x++) { const j = Math.floor((y + 0.5) * st) * base.w + Math.floor((x + 0.5) * st); m[y * W + x] = hair[names.indexOf(base.names[base.map[j]!]!)] ? 1 : 0; l[y * W + x] = base.ink[j]! }
      const b = enlarge(strands(m, l, W, HH, art.head), W, w, h, (n) => new Int8Array(n)), up = crisp(Float32Array.from(b, (v) => (v > 0 ? 1 : 0)), 0.8), dn = crisp(Float32Array.from(b, (v) => (v < 0 ? 1 : 0)), 0.8)
      for (let i = 0; i < N; i++) if (hair[map[i]!] && (up[i]! > 0.01 || dn[i]! > 0.01)) { const c: RGB = [R[i]!, G[i]!, B[i]!]; if (up[i]! > 0.01) { const t = cached(c, hot(c) ? -13 : 15, 1.1); to(i, t, up[i]! * 0.85) } if (dn[i]! > 0.01) { const t = cached(c, hot(c) ? 5 : -14, hot(c) ? 0.8 : 1.05); to(i, hot(c) ? [t[0] * 1.015, t[1] * 1.015, t[2] * 1.02] : [t[0] * 0.955, t[1] * 0.945, t[2] * 0.97], dn[i]! * 0.85) } }
    }
    wash(false)
  }
  const said = await stampsOf(art, k, { map, names, w, h })
  const mask = (lv: ReadonlyArray<Level>): Float32Array => {
    const out = new Float32Array(N), groups = new Map<string, Array<Shape>>()
    for (const s of art.shapes) if (lv.includes(s.lv) && s.say) { const p = said.get(s.id!); if (p) each(p, w, (i) => { if (s.a > out[i]!) out[i] = s.a }) }
    for (const s of art.shapes) if (lv.includes(s.lv) && !s.say) { const key = `${s.on.join(" ")}|${s.a}`; groups.set(key, [...(groups.get(key) ?? []), s]) }
    for (const g of groups.values()) { const ok = set(g[0]!.on); tmp.g.clearRect(0, 0, w, h); tmp.g.fillStyle = "#000"; for (const s of g) { trace(tmp.g, s.d); tmp.g.fill() } const d = alphaOf(); for (let i = 0; i < N; i++) if (d[i * 4 + 3]! && ok[map[i]!]) out[i] = Math.max(out[i]!, (d[i * 4 + 3]! / 255) * g[0]!.a) }
    return out
  }
  const zero = new Float32Array(N), m1 = upto >= 4 ? mask(["s1", "s2", "s3", "form"]) : zero, m2 = upto >= 6 ? mask(["s2", "s3"]) : zero, rims = new Float32Array(N), black = new Float32Array(N), field = art.forms && upto >= 4 ? volume(base, art.forms, light, art.head, FIXED) : null
  const u = field ? bilinear(field.u, base.w, w, h) : zero, big = field ? enlarge(field.size, base.w, w, h, (n) => new Float32Array(n)) : zero, litP = field ? enlarge(field.lit, base.w, w, h, (n) => new Uint8Array(n)) : null
  if (field && upto >= 4) { const t = enlarge(field.turned, base.w, w, h, (n) => new Uint8Array(n)); for (let i = 0; i < N; i++) if (t[i] && kinds[map[i]!] !== "metal") m1[i] = 1 }
  const formOnly = Float32Array.from(m1)
  const metal = of(["metal"])
  if (upto >= 4) {
    const boxes = boxesOf(map, w, h, names.length)
    for (const [a, b, d, deep] of art.casts) {
      const A = set(a), O = set(b)
      each(cast(map, w, h, boxes, A, O, sun.x * d * k, sun.y * d * k, Math.min(2.4, d * 0.1) * k), w, (i) => { m1[i] = 1 })
      if (deep && upto >= 6) {
        each(cast(map, w, h, boxes, A, O, sun.x * d * deep * k, sun.y * d * deep * k, Math.min(2, d * deep * 0.14) * k), w, (i) => { m2[i] = 1 })
        // right under the thing it is too dark to see colour
        const o = d < art.head * 0.07 ? 0 : Math.min(d * 0.1, art.head * 0.013); if (o) each(cast(map, w, h, boxes, A, O, sun.x * o * k, sun.y * o * k, 0.5 * k), w, (i) => { black[i] = 1 })
      }
    }
    for (const [kids, on] of art.inherits ?? []) { const a = set(kids), b = set(on), one = inherit(map, w, h, m1, a, b, 6 * k), two = upto >= 6 ? inherit(map, w, h, m2, a, b, 6 * k) : null; for (let i = 0; i < N; i++) { if (one[i]) m1[i] = 1; if (two?.[i]) m2[i] = 1 } }
    for (const q of art.bevels ?? []) { const on = set(q.on), low = Math.min(...q.on.map((n) => art.defs[n]?.z ?? 0)), over = new Uint8Array(names.length); defs.forEach((d, n) => { if (d && d.z > low && !on[n]) over[n] = 1 }); const b = bevel(map, ink, w, h, on, over, q.w * k, sun.x, sun.y); for (let i = 0; i < N; i++) { if (b[i]! < 0) { m1[i] = 1; if (q.deep && upto >= 6) m2[i] = 1 } else if (b[i]! > 0) rims[i] = q.lit } }
    const lift = mask(["lift"])
    for (let i = 0; i < N; i++) if (lift[i]! > 0.5) m1[i] = 0
    // every shade is cut like a hand would: crumbs go, edges run straight, and nothing crosses from one part into the next
    const e = Math.max(1, Math.round(art.head * 0.006 * k)), border = new Uint8Array(N)
    for (let y = e; y < h - e; y++) for (let x = e; x < w - e; x++) { const i = y * w + x, m = map[i]!; if (map[i - e] !== m || map[i + e] !== m || map[i - e * w] !== m || map[i + e * w] !== m) border[i] = 1 }
    for (const m of [m1, m2]) { const c = blocky(Uint8Array.from(m, (v) => (v > 0.5 ? 1 : 0)), { x: 0, y: 0, w, h }, e, (art.head * 0.028 * k) ** 2); for (let i = 0; i < N; i++) if (!border[i]) m[i] = c[i]! ; else if (m[i]! > 0.5 && !c[i]) { const x = i % w, y = (i / w) | 0; let any = false; for (let d = e; d <= e * 3 && !any; d += e) for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]] as const) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < w && Y < h && map[Y * w + X] === map[i] && c[Y * w + X]) any = true } if (!any) m[i] = 0 } }
    for (let i = 0; i < N; i++) if (m2[i]! > 0.5) m1[i] = 1
    if (art.lines) { const l = linesAnd(ink, map, w, h, bg), shut = slivers(l.region, Uint8Array.from(m1, (v) => (v > 0.5 ? 1 : 0)), l.dLine, w, h, k); let n = 0; for (const q of shut) { n += q.length; for (const i of q) m1[i] = 1 } console.error(`sealed ${shut.length} slivers, ${Math.round(n / (k * k))} px`) }
  }
  for (let i = 0; i < N; i++) if (map[i] === bg) { m1[i] = 0; formOnly[i] = 0; m2[i] = 0; black[i] = 0 }
  const e1 = upto >= 4 ? crisp(m1) : zero, e2 = upto >= 6 ? crisp(m2) : zero, e3 = upto >= 6 ? crisp(black, 0.4) : zero
  /* 4 to 6: the planes */
  if (upto >= 4 && view !== "regions") {
    // skin takes one more step before the shade; the colour is richest right where the shade begins
    const near = upto >= 5 ? blur(formOnly, w, h, Math.max(1, H * 0.009), 2) : zero, rim = upto >= 5 ? blur(m1, w, h, Math.max(1, H * 0.0032), 1) : zero
    // reflected light: the last stretch before the edge on the far side, inside the shade
    const reach = H * 0.03, back = upto >= 5 ? new Float32Array(N) : zero
    if (upto >= 5) for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
      const i = y * w + x
      if (m1[i]! < 0.5 || m2[i]! > 0.5 || black[i]! > 0.5 || kinds[map[i]!] === "metal") continue
      const X = Math.round(x + sun.x * reach), Y = Math.round(y + sun.y * reach), bx = Math.round(x - sun.x * reach * 1.9), by = Math.round(y - sun.y * reach * 1.9)
      const j = X >= 0 && Y >= 0 && X < w && Y < h ? map[Y * w + X]! : map[i]!, b = bx >= 0 && by >= 0 && bx < w && by < h ? by * w + bx : i
      if ((j === bg || (zs[j] ?? 0) < (zs[map[i]!] ?? 0)) && m1[b]! > 0.5 && map[b] === map[i]) back[i] = 1
    }
    const bk = upto >= 5 ? crisp(back, 0.5) : zero
    for (let i = 0; i < N; i++) {
      const n = map[i]!, t = tones[n]
      if (!t || n === bg || metal[n]) continue
      const e = e1[i]!, kd = kinds[n]
      if (upto >= 5 && e < 0.99) {
        if (kd === "skin") times(i, t.half, smooth(0.04, 0.1, near[i]!) * (1 - e))
        if (kd === "skin" || kd === "pale" || kd === "cloth" || kd === "plastic") to(i, t.term, smooth(0.12, 0.3, rim[i]!) * (1 - e) * (kd === "skin" ? 0.75 : 0.5))
      }
      times(i, t.s1, e)
      if (bk[i]! > 0.01) to(i, t.bounce, bk[i]! * (kd === "skin" ? 0.5 : 0.62))
      if (e2[i]! > 0.01) times(i, [t.s2[0] / t.s1[0], t.s2[1] / t.s1[1], t.s2[2] / t.s1[2]], e2[i]!)
      if (e3[i]! > 0.01) to(i, mix(BLACK, t.ink, 0.12), e3[i]! * 0.94)
    }
  }
  /* 7: materials and light */
  if (upto >= 7 && view !== "regions") {
    const lt = mask(["lt"]), ring = crisp(mask(["ring"]), 0.5), hi = crisp(mask(["hi"]), 0.35), L = crisp(Float32Array.from(lt, (v) => (v > 0.02 ? 1 : 0)), 0.5), rm = crisp(Float32Array.from(rims, (v) => (v > 0.02 ? 1 : 0)), 0.35)
    const plane = litP ? crisp(Float32Array.from(litP), 0.5) : zero, soft = litP ? blur(Float32Array.from(litP), w, h, H * 0.03, 2) : zero
    for (let i = 0; i < N; i++) {
      const n = map[i]!, t = tones[n], kd = kinds[n]
      if (!t || n === bg) continue
      const lit = 1 - e1[i]!
      if (kd === "metal") {
        // bands of the world around it: dark beside bright, and a lighter last band on the far side
        const s = big[i]! > 0 ? u[i]! : 0, m = t.metal, c = s < -0.66 ? m.light : s < -0.26 ? m.hi : s < 0.06 ? m.light : s < 0.34 ? m.mid : s < 0.66 ? m.deep : s < 0.84 ? m.dark : mix(m.mid, SKY, 0.25)
        to(i, c, 1)
        if (e1[i]! > 0.01) times(i, t.s1, e1[i]! * 0.85)
        if (e2[i]! > 0.01) times(i, [0.62, 0.6, 0.7], e2[i]!)
        if (e3[i]! > 0.01) to(i, BLACK, e3[i]! * 0.94)
        if (rm[i]! > 0.01) to(i, m.hi, rm[i]! * lit)
      } else {
        if (plane[i]! > 0.01 && big[i]! > art.head * 0.02) {
          if (kd === "peel") to(i, t.lt, smooth(0.15, 0.9, soft[i]!) * lit * 0.9)
          else if (kd === "dark" || kd === "leather") to(i, t.gloss, plane[i]! * lit * (kd === "leather" ? 0.55 : 0.28))
          else if (kd === "plastic" || kd === "glass") to(i, t.gloss, plane[i]! * lit * 0.5)
          else if (kd === "cloth" || kd === "leaf") to(i, t.lt, plane[i]! * lit * 0.55)
        }
        if (L[i]! > 0.01) to(i, t.lt, L[i]! * Math.max(0.5, lt[i]!) * lit)
        if (rm[i]! > 0.01) to(i, kd === "skin" ? t.lt : mix(t.base, SUN, 0.7), rm[i]! * lit * 0.85)
        if (ring[i]! > 0.01) to(i, mix(t.base, [255, 253, 248], 0.62), ring[i]! * (1 - e1[i]! * 0.85))
      }
      if (hi[i]! > 0.01) to(i, kd === "peel" ? mix(t.base, SUN, 0.55) : [255, 253, 248], hi[i]! * (kd === "peel" ? 0.7 : 1) * (1 - e1[i]! * 0.6))
    }
  }
  if (upto >= 8 && view !== "regions") wash(true)
  const stats: Record<string, number> = {}
  for (const e of eyes) console.error(`eye: ${e.note}`)
  { const area: Record<string, number> = {}; for (let i = 0; i < N; i++) { const n = names[map[i]!]!; area[n] = (area[n] ?? 0) + 1; if (e1[i]! > 0.5) stats[n] = (stats[n] ?? 0) + 1 } for (const n of Object.keys(stats)) stats[n] = Math.round((100 * stats[n]!) / area[n]!) }
  if (view === "masks") for (let i = 0; i < N; i++) { const v = map[i] === bg ? 170 : e3[i]! > 0.5 ? 0 : e2[i]! > 0.5 ? 50 : e1[i]! > 0.5 ? 110 : 250; R[i] = G[i] = B[i] = v }
  /* 10: the air. The lit side of the whole picture a breath warmer, the far side cooler */
  if (upto >= 10 && view !== "masks" && view !== "regions") {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (map[i] === bg) continue
      const t = ((x / w - 0.5) * sun.x + (y / h - 0.5) * sun.y) * 1.5, a = Math.min(0.13, Math.abs(t) * 0.16)
      if (t < 0) { R[i] = R[i]! + (255 - R[i]!) * a * 0.55; G[i] = G[i]! + (244 - G[i]!) * a * 0.38; B[i] = B[i]! * (1 - a * 0.16) } else times(i, [0.86, 0.88, 1.02], a * 2.2)
      if (art.focus) { const q = art.focus, f = smooth(0.85, 2.3, Math.hypot((x / k - q.x) / q.rx, (y / k - q.y) / q.ry)) * q.dim; if (f > 0) times(i, [0.8, 0.82, 0.92], f) }
    }
  }
  const r = rng("grain"), gf = new Float32Array(N)
  for (let i = 0; i < N; i++) gf[i] = r() - 0.5
  const grain = blur(gf, w, h, 1, 1), img = new ImageData(w, h)
  for (let i = 0; i < N; i++) { const gr = upto >= 10 && view === "normal" && map[i] !== bg ? grain[i]! * (kinds[map[i]!] === "skin" ? 4 : 13) : 0; img.data[i * 4] = R[i]! + gr; img.data[i * 4 + 1] = G[i]! + gr; img.data[i * 4 + 2] = B[i]! + gr; img.data[i * 4 + 3] = 255 }
  const col = mk()
  col.g.putImageData(img, 0, 0)
  const drawn = view !== "masks" && view !== "regions"
  if (upto >= 8 && drawn) { col.g.save(); col.g.scale(k, k); art.face(col.g); for (const e of eyes) e.under(col.g); col.g.restore() }

  const line = lineLayer({ ink, map, w, h, k, head: art.head, bg, kinds, z: zs, tones, face: names.indexOf("face"), dark: e1, strokes: refs.strokes, fall: [sun.x, sun.y], eyes: eyes.map((e) => e.at) }), li = line.image
  if (upto < 9) for (let i = 0; i < N; i++) { li.data[i * 4] = BLACK[0]; li.data[i * 4 + 1] = BLACK[1]; li.data[i * 4 + 2] = BLACK[2]; li.data[i * 4 + 3] = smooth(0.2, 0.64, ink[i]!) * 255 }
  if (upto >= 8) {
    tmp.g.clearRect(0, 0, w, h); tmp.g.fillStyle = "#000"
    for (const q of art.noink) { trace(tmp.g, q); tmp.g.fill() }
    for (const e of eyes) { tmp.g.beginPath(); e.hole.forEach(([x, y], i) => (i ? tmp.g.lineTo(x * k, y * k) : tmp.g.moveTo(x * k, y * k))); tmp.g.fill() }
    const d = alphaOf()
    for (let i = 0; i < N; i++) if (d[i * 4 + 3]! > 100) li.data[i * 4 + 3] = 0
    for (const e of eyes) for (const t of e.tips) for (let y = Math.max(0, Math.floor((t.y - t.r) * k)); y < Math.min(h, (t.y + t.r) * k); y++) for (let x = Math.max(0, Math.floor((t.x - t.r) * k)); x < Math.min(w, (t.x + t.r) * k); x++) { const i = (y * w + x) * 4, a = 0.8 * (1 - smooth(0.1, 1, Math.hypot(x / k - t.x, y / k - t.y) / t.r)); for (const [o, v] of [[0, 118], [1, 44], [2, 52]] as const) li.data[i + o] = li.data[i + o]! + (v - li.data[i + o]!) * a }
  }
  const ic = mk()
  ic.g.putImageData(li, 0, 0)
  if (view === "masks") col.g.globalAlpha = 0.5
  col.g.drawImage(ic.c, 0, 0); col.g.globalAlpha = 1
  if (cut) { const d = col.g.getImageData(0, 0, w, h); for (let i = 0; i < N; i++) if (map[i] === bg) for (let c = 0; c < 4; c++) d.data[i * 4 + c] = li.data[i * 4 + c]!; col.g.putImageData(d, 0, 0) }
  if (upto >= 9 && drawn) { col.g.save(); col.g.scale(k, k); art.over(col.g); for (const e of eyes) e.over(col.g); col.g.restore() }
  if (upto >= 10 && view !== "masks" && !cut) {
    const bk = mk()
    bk.g.fillStyle = "#fff"; bk.g.fillRect(0, 0, w, h); bk.g.save(); bk.g.scale(k, k); art.back(bk.g); bk.g.restore()
    const d = bk.g.getImageData(0, 0, w, h)
    for (let i = 0; i < N; i++) d.data[i * 4 + 3] = map[i] !== bg ? 0 : 255 - li.data[i * 4 + 3]!
    bk.g.putImageData(d, 0, 0); col.g.drawImage(bk.c, 0, 0); col.g.save(); col.g.scale(k, k); art.front(col.g); col.g.restore()
  }
  { const d = col.g.getImageData(0, 0, w, h).data; let n = 0, low = 0, dark = 0; for (let i = 0; i < N; i++) if (map[i] !== bg) { const p: RGB = [d[i * 4]!, d[i * 4 + 1]!, d[i * 4 + 2]!]; n++; if (hsv(p) < 0.3) low++; if (luma(p) < 30) dark++ } stats._lowSat = Math.round((100 * low) / n); stats._dark = Math.round((1000 * dark) / n) / 10; stats._line = Math.round((20 * line.half) / k) / 10 }
  if (art.focus) {
    const d = col.g.getImageData(0, 0, w, h).data, Lm = (i: number): number => d[i * 4]! * 0.3 + d[i * 4 + 1]! * 0.59 + d[i * 4 + 2]! * 0.11, q = art.focus, v: [Array<number>, Array<number>] = [[], []], e: [number, number] = [0, 0], st = Math.max(1, Math.round((k * art.h) / 620))
    for (let y = st * 3; y < h - st * 3; y += st) for (let x = st * 3; x < w - st * 3; x += st) { const i = y * w + x; if (map[i] === bg) continue; const s = Math.hypot((x / k - q.x) / q.rx, (y / k - q.y) / q.ry) < 1.15 ? 0 : 1; let a = 0, b = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const t = Lm(i + (dy * w + dx) * st); a += t; b += t * t } a /= 25; v[s].push(Lm(i)); e[s] += Math.sqrt(Math.max(0, b / 25 - a * a)) }
    const med = (a: Array<number>): number => Math.round(a.sort((x, y) => x - y)[a.length >> 1] ?? 0)
    stats._head = med(v[0]); stats._rest = med(v[1]); stats._pull = Math.round((100 * (e[0] / v[0].length)) / (e[1] / v[1].length)) / 100
  }
  if (view === "value") { const t = mk(); t.g.filter = `blur(${Math.round(art.head * 0.012 * k)}px)`; t.g.drawImage(col.c, 0, 0); const d = t.g.getImageData(0, 0, w, h); for (let i = 0; i < N; i++) { const l = d.data[i * 4]! * 0.3 + d.data[i * 4 + 1]! * 0.59 + d.data[i * 4 + 2]! * 0.11, g = map[i] === bg ? 255 : l < 85 ? 24 : l < 170 ? 122 : 232; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = g } col.g.putImageData(d, 0, 0) }
  if (view === "grey") { const d = col.g.getImageData(0, 0, w, h); for (let i = 0; i < N; i++) { const v = d.data[i * 4]! * 0.3 + d.data[i * 4 + 1]! * 0.59 + d.data[i * 4 + 2]! * 0.11; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v } col.g.putImageData(d, 0, 0) }
  return { canvas: col.c, stats }
}
/** Yellow and orange hair: bands go to orange and cream, never to green. */
const hot = (c: RGB): boolean => c[0] > c[2] * 1.12 && c[0] >= c[1]
const turned = new Map<number, RGB>()
/** Hue turns are slow and hair has few colours: worked out once per colour step. */
const cached = (c: RGB, by: number, chroma: number): RGB => { const key = ((c[0] >> 2) << 15) | ((c[1] >> 2) << 9) | ((c[2] >> 2) << 3) | (by > 0 ? 1 : 0); let t = turned.get(key); if (!t) { t = turnHue(c, by, chroma); turned.set(key, t) } return t }
