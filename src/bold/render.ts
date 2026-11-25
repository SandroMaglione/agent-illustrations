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
import { lineLayer } from "./line.ts"
import { blocky } from "./contour.ts"
import { locks } from "./locks.ts"
import { levelsOf } from "../tools/facets.ts"
import { facetsOf } from "../tools/facets.ts"
import { chords, planes } from "./planes.ts"
import type { Planes } from "./planes.ts"
import { BLACK, hexRgb, hsv, luma, mix, SKY, SUN, tone, turnHue } from "./tones.ts"
import type { Kind, RGB } from "./tones.ts"

/** Straightens masks part by part. Outside the part the mask is continued first, so nothing is rounded off where it meets a line. */
const cutAll = (masks: ReadonlyArray<Float32Array>, map: Uint8Array, kinds: ReadonlyArray<Kind | undefined>, n: number, boxes: ReadonlyArray<readonly [number, number, number, number]>, w: number, h: number, eps: number): void => {
  const pad = Math.ceil(eps * 4)
  for (let q = 1; q < n; q++) {
    const kd = kinds[q], [bx0, by0, bx1, by1] = boxes[q]!
    if (!kd || kd === "hair" || kd === "flat" || bx1 < bx0) continue
    const X = Math.max(0, bx0 - pad), Y = Math.max(0, by0 - pad), W = Math.min(w - 1, bx1 + pad) - X + 1, H = Math.min(h - 1, by1 + pad) - Y + 1
    for (const m of masks) {
      const v = new Int8Array(W * H).fill(-1)
      let edge: Array<number> = [], any = false
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y + Y) * w + x + X; if (map[i] === q) { const t = m[i]! > 0.5 ? 1 : 0; v[y * W + x] = t; if (t) any = true; edge.push(y * W + x) } }
      if (!any) continue
      for (let s = 0; s < pad; s++) { const next: Array<number> = []; for (const i of edge) { const x = i % W; for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) if (j >= 0 && j < v.length && v[j] === -1) { v[j] = v[i]!; next.push(j) } } edge = next }
      const c = blocky(Uint8Array.from(v, (t) => (t === 1 ? 1 : 0)), { x: 0, y: 0, w: W, h: H }, eps, eps * eps * 4)
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y + Y) * w + x + X; if (map[i] === q) m[i] = c[y * W + x]! }
    }
  }
}
/** Place across the form, without the steps the pixels make. */
const calmShare = (P: Planes, w: number, h: number, r: number): Float32Array => {
  const a = new Float32Array(w * h), m = new Float32Array(w * h)
  for (let i = 0; i < a.length; i++) if (P.id[i]) { a[i] = P.near[i]! / (P.near[i]! + P.far[i]! || 1); m[i] = 1 }
  const x = blur(a, w, h, r, 1), y = blur(m, w, h, r, 1)
  for (let i = 0; i < a.length; i++) if (m[i]) a[i] = x[i]! / y[i]!
  return a
}
/** Peel: pores are small, round, and only show where the light grazes: in a belt on both sides of the turn. */
const stipple = (P: Planes, map: Uint8Array, kinds: ReadonlyArray<Kind | undefined>, w: number, h: number, H: number): Float32Array => {
  const o = new Float32Array(w * h), r = rng("pores"), step = Math.max(3, H * 0.013)
  for (let y = step; y < h - step; y += step) for (let x = step; x < w - step; x += step) {
    const X = x + (r() - 0.5) * step * 1.5, Y = y + (r() - 0.5) * step * 1.5, i = Math.round(Y) * w + Math.round(X), q = r(), rad = H * (0.0022 + r() * 0.0026)
    if (kinds[map[i]!] !== "peel" || !P.id[i]) continue
    const s = P.near[i]! / (P.near[i]! + P.far[i]!)
    if (q > (s < 0.2 ? 0.1 : s < 0.46 ? 0.2 : s < 0.8 ? 0.36 : 0.12)) continue
    for (let dy = -Math.ceil(rad); dy <= rad; dy++) for (let dx = -Math.ceil(rad); dx <= rad; dx++) if (dx * dx + dy * dy <= rad * rad) o[i + dy * w + dx] = 1
  }
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

  const fine = art.tones && (art.hair || upto >= 4) ? await facetsOf(art) : null, scaled = (a: ArrayLike<number>): Int32Array => { const o = new Int32Array(N), st = base.w / w; for (let y = 0; y < h; y++) { const Y = Math.min(base.h - 1, Math.floor((y + 0.5) * st)) * base.w; for (let x = 0; x < w; x++) { const j = Y + Math.min(base.w - 1, Math.floor((x + 0.5) * st)); if (base.map[j] === map[y * w + x]) o[y * w + x] = a[j]! } } return o }
  const hairs = art.hair && upto >= 2 ? locks({ ink, map, names, w, h, ...(fine ? { cut: scaled(fine.id) } : {}) }, art.hair, [sun.x, sun.y], art.head, k) : null, hairTip = new Float32Array(names.length)
  for (const f of art.hair ?? []) for (const n of f.on) { const i = names.indexOf(n); if (i > 0) hairTip[i] = f.tip ?? 0 }
  const R = new Float32Array(N), G = new Float32Array(N), B = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    if (view === "regions") { const a = map[i]! * 137.5; R[i] = 165 + 85 * Math.cos((a * Math.PI) / 180); G[i] = 165 + 85 * Math.cos(((a + 120) * Math.PI) / 180); B[i] = 165 + 85 * Math.cos(((a + 240) * Math.PI) / 180); continue }
    const t = tones[map[i]!], c: RGB = !t || upto === 0 || map[i] === bg ? [255, 255, 255] : t.base
    R[i] = c[0]; G[i] = c[1]; B[i] = c[2]
  }
  const to = (i: number, c: RGB, a: number): void => { R[i] = R[i]! + (c[0] - R[i]!) * a; G[i] = G[i]! + (c[1] - G[i]!) * a; B[i] = B[i]! + (c[2] - B[i]!) * a }
  const times = (i: number, m: RGB, a: number): void => { R[i] = R[i]! * (1 + (m[0] - 1) * a); G[i] = G[i]! * (1 + (m[1] - 1) * a); B[i] = B[i]! * (1 + (m[2] - 1) * a) }
  /** A mask with one clean, sharp edge: pixel steps go, the shape stays. */
  const crisp = (m: Float32Array, r = 0.4): Float32Array => { const b = blur(m, w, h, Math.max(1, r * k), 2); for (let i = 0; i < N; i++) b[i] = smooth(0.4, 0.6, b[i]!); return b }
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
    if (hairs) for (let i = 0; i < N; i++) {
      if (!hairs.any[i]) continue
      const turn = hairTip[map[i]!]!, v = hairs.v[i]!
      if (turn) { const t = cached([R[i]!, G[i]!, B[i]!], turn, 1.06); to(i, t, smooth(0.15, 0.95, v)) }
      const g = hairs.hue[i]!
      if (g) { const c: RGB = [R[i]!, G[i]!, B[i]!]; const t = cached(c, g > 0 ? 9 : -12, 1.06); to(i, g > 0 ? [t[0] * 1.02, t[1] * 1.02, t[2] * 1.02] : [t[0] * 0.97, t[1] * 0.965, t[2] * 0.98], Math.abs(g) * 0.7) }
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
  const zero = new Float32Array(N), m1 = upto >= 4 ? mask(["s1", "s2", "s3", "form"]) : zero, m2 = upto >= 6 ? mask(["s2", "s3"]) : zero, rims = new Float32Array(N), black = new Float32Array(N), P = art.forms && upto >= 4 ? planes({ ink, map, names, w, h, z: zs.map((v, n) => (n === bg ? -1 : v)) }, art.forms, light, art.head, k) : null
  if (hairs && upto >= 4) for (let i = 0; i < N; i++) { if (hairs.shade[i]! > 0.5) m1[i] = 1; if (upto >= 6 && hairs.deep[i]! > 0.5) m2[i] = 1 }
  /* fine rendering: what an agent decided facet by facet */
  const own = set(Object.keys(art.tones ?? {})), mh = new Float32Array(N), ml = new Float32Array(N)
  if (art.tones && upto >= 4) {
    const lv = scaled(await levelsOf(art, art.tones)), id = scaled(fine!.id)
    const round = new Set<number>()
    for (let i = 0; i < N; i += 3) if (lv[i]! > 5) round.add(id[i]!)
    const far = new Float32Array(N), near = new Float32Array(N), z = Float32Array.from(map, (m) => (m === bg ? -1 : zs[m]!))
    if (round.size) chords(id, z, w, h, sun.x, sun.y, (n) => round.has(n), far, near)
    const s1 = new Float32Array(N), s0 = new Float32Array(N), inn = new Float32Array(N)
    for (let i = 0; i < N; i++) if (lv[i]! > 5) { const C = far[i]! + near[i]!; inn[i] = 1; s1[i] = far[i]! < Math.min(0.34 * C, 0.2 * H) ? 1 : 0; s0[i] = far[i]! < Math.min(0.56 * C, 0.34 * H) ? 1 : 0 }
    const r = Math.max(1, H * 0.012), a = blur(s1, w, h, r, 2), b = blur(s0, w, h, r, 2), c = blur(inn, w, h, r, 2)
    for (let i = 0; i < N; i++) {
      if (!own[map[i]!]) continue
      if (P) P.turned[i] = 0
      const l = lv[i]!, t1 = l > 5 && a[i]! / c[i]! > 0.5, t0 = l > 5 && b[i]! / c[i]! > 0.5
      if (l === 3 || l === 4 || l === 5 || l === 7 || t1) m1[i] = 1
      if ((l === 4 || l === 5 || (l === 7 && t1)) && upto >= 6) m2[i] = 1
      if (l === 5 && upto >= 6) black[i] = 1
      if (l === 2 || (l === 6 && t0 && !t1)) mh[i] = 1
      if (l === 1) ml[i] = 1
    }
  }
  if (P) for (let i = 0; i < N; i++) if (P.turned[i]! > 0.5 && kinds[map[i]!] !== "metal" && !own[map[i]!]) m1[i] = 1
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
        const o = d < art.head * 0.07 ? 0 : Math.min(d * 0.1, art.head * 0.013); if (o > 1.2) each(cast(map, w, h, boxes, A, O, sun.x * o * k, sun.y * o * k, 0.5 * k), w, (i) => { black[i] = 1 })
      }
    }
    for (const [kids, on] of art.inherits ?? []) { const a = set(kids), b = set(on), one = inherit(map, w, h, m1, a, b, 6 * k), two = upto >= 6 ? inherit(map, w, h, m2, a, b, 6 * k) : null; for (let i = 0; i < N; i++) { if (one[i]) m1[i] = 1; if (two?.[i]) m2[i] = 1 } }
    for (const q of art.bevels ?? []) { const on = set(q.on), low = Math.min(...q.on.map((n) => art.defs[n]?.z ?? 0)), over = new Uint8Array(names.length); defs.forEach((d, n) => { if (d && d.z > low && !on[n]) over[n] = 1 }); const b = bevel(map, ink, w, h, on, over, q.w * k, sun.x, sun.y); for (let i = 0; i < N; i++) { if (b[i]! < 0) { m1[i] = 1; if (q.deep && upto >= 6) m2[i] = 1 } else if (b[i]! > 0) rims[i] = q.lit } }
    const lift = mask(["lift"])
    for (let i = 0; i < N; i++) if (lift[i]! > 0.5) m1[i] = 0
    // every shade is cut like a hand would: straight runs, inside its own part
    cutAll([m1, m2, mh, ml], map, kinds, names.length, boxes, w, h, Math.max(1, art.head * 0.0055 * k))
    // crumbs: an island of shade too small to be a decision
    for (const m of [m1, m2]) { const seen = new Uint8Array(N), least = (art.head * 0.016 * k) ** 2; for (let q = 0; q < N; q++) if (m[q]! > 0.5 && !seen[q]) { const c = [q]; seen[q] = 1; for (let t = 0; t < c.length; t++) { const j = c[t]!, x = j % w; for (const g of [x > 0 ? j - 1 : -1, x < w - 1 ? j + 1 : -1, j - w, j + w]) if (g >= 0 && g < N && !seen[g] && m[g]! > 0.5) { seen[g] = 1; c.push(g) } } if (c.length < least) for (const j of c) m[j] = 0 } }
    for (let i = 0; i < N; i++) if (m2[i]! > 0.5) m1[i] = 1
    if (art.lines) { const l = linesAnd(ink, map, w, h, bg), shut = slivers(l.region, Uint8Array.from(m1, (v) => (v > 0.5 ? 1 : 0)), l.dLine, w, h, k); let n = 0; for (const q of shut) { n += q.length; for (const i of q) m1[i] = 1 } console.error(`sealed ${shut.length} slivers, ${Math.round(n / (k * k))} px`) }
  }
  for (let i = 0; i < N; i++) if (map[i] === bg) { m1[i] = 0; formOnly[i] = 0; m2[i] = 0; black[i] = 0 }
  const eh = upto >= 4 ? crisp(mh) : zero, el = upto >= 7 ? crisp(ml) : zero, e1 = upto >= 4 ? crisp(m1) : zero, e2 = upto >= 6 ? crisp(m2) : zero, e3 = upto >= 6 ? crisp(black, 0.4) : zero
  /* 4 to 6: the planes */
  if (upto >= 4 && view !== "regions") {
    // skin takes one more step before the shade; the colour is richest right where the shade begins
    const near = upto >= 5 ? blur(formOnly, w, h, Math.max(1, H * 0.009), 2) : zero, rim = upto >= 5 ? blur(m1, w, h, Math.max(1, H * 0.0032), 1) : zero
    // reflected light: the last stretch before the edge on the far side, inside the shade
    const back = upto >= 5 ? new Float32Array(N) : zero
    if (upto >= 5 && P) for (let i = 0; i < N; i++) {
      const n = map[i]!
      if (m1[i]! < 0.5 || m2[i]! > 0.5 || black[i]! > 0.5 || metal[n] || !P.id[i]) continue
      const C = P.far[i]! + P.near[i]!, strip = Math.min(0.09 * C, H * 0.016)
      if (C > H * 0.06 && P.far[i]! < strip + 2 * k && P.far[i]! > 1.2 * k && P.side[i]! > 0.1 && P.side[i]! < 0.86) back[i] = 1
    }
    const calm = P ? calmShare(P, w, h, H * 0.03) : null
    const bk = upto >= 5 ? crisp(back, 0.5) : zero
    for (let i = 0; i < N; i++) {
      const n = map[i]!, t = tones[n]
      if (!t || n === bg || metal[n]) continue
      const e = e1[i]!, kd = kinds[n]
      if (upto >= 5 && e < 0.99) {
        if (kd === "skin") times(i, t.half, smooth(0.04, 0.1, near[i]!) * (1 - e))
        if (kd === "skin" || kd === "pale" || kd === "cloth" || kd === "plastic") to(i, t.term, smooth(0.12, 0.3, rim[i]!) * (1 - e) * (kd === "skin" ? 0.75 : 0.5))
      }
      if (eh[i]! > 0.01) times(i, t.half, eh[i]! * (1 - e))
      times(i, t.s1, e)
      // a shade cools and sinks away from where it starts; a light warms towards the sun: quiet, but it is what turns a flat shape
      if (upto >= 5 && P && calm && P.id[i]) { const C = P.far[i]! + P.near[i]!, q = calm[i]!; if (C > H * 0.08) { if (e > 0.5) times(i, [0.86, 0.87, 1.03], smooth(0.45, 1, q) * 0.75); else times(i, [1.03, 1.0, 0.95], (1 - q) * 0.6) } }
      if (bk[i]! > 0.01) to(i, t.bounce, bk[i]! * (kd === "skin" ? 0.5 : 0.62))
      if (e2[i]! > 0.01) times(i, [t.s2[0] / t.s1[0], t.s2[1] / t.s1[1], t.s2[2] / t.s1[2]], e2[i]!)
      if (e3[i]! > 0.01) times(i, [0.6, 0.56, 0.68], e3[i]!)
    }
  }
  /* 7: materials and light */
  if (upto >= 7 && view !== "regions") {
    const lt = mask(["lt"]), ring = crisp(mask(["ring"]), 0.5), hi = crisp(mask(["hi"]), 0.35), L = crisp(Float32Array.from(lt, (v) => (v > 0.02 ? 1 : 0)), 0.5), rm = crisp(Float32Array.from(rims, (v) => (v > 0.02 ? 1 : 0)), 0.35)
    const share = P ? calmShare(P, w, h, 1.5 * k) : null
    const pores = P ? stipple(P, map, kinds, w, h, H) : zero
    for (let i = 0; i < N; i++) {
      const n = map[i]!, t = tones[n], kd = kinds[n]
      if (!t || n === bg) continue
      const lit = 1 - e1[i]!, on = P !== null && P.id[i]! > 0, C = on ? P!.far[i]! + P!.near[i]! : 0, s = on ? share![i]! : 0, p = on ? P!.side[i]! : 0
      /** 1 between two places across the form, with edges one px soft. */
      const band = (a: number, b: number): number => Math.max(0, Math.min(1, (s - a) * C + 0.5)) * Math.max(0, Math.min(1, (b - s) * C + 0.5))
      if (kd === "metal") {
        const m = t.metal
        if (!on || C < 3.2 * k) to(i, s < 0.5 ? m.light : s < 0.75 ? m.mid : m.dark, 1)
        else { to(i, m.light, 1); to(i, m.hi, band(0.12, 0.3) * (p > 0.04 && p < 0.84 ? 1 : 0)); to(i, m.mid, band(0.44, 2)); to(i, m.dark, band(0.6, 0.84)); if (C > H * 0.05) to(i, m.deep, band(0.66, 0.76)); to(i, mix(m.light, SKY, 0.22), band(0.9, 2)) }
        if (e1[i]! > 0.01) times(i, t.s1, e1[i]! * 0.7)
        if (e2[i]! > 0.01) times(i, [0.66, 0.64, 0.74], e2[i]!)
        if (rm[i]! > 0.01) to(i, m.hi, rm[i]! * lit)
      } else {
        // a reflection is a piece of a plane: its sides run with the form's own edges
        const slant = p + (s - 0.2) * 0.35
        if (on && C > H * 0.035) {
          if (kd === "leather") { if (C > H * 0.055 && !own[n]) to(i, t.gloss, band(0.1, 0.22) * (slant > 0.12 && slant < 0.62 ? 1 : 0) * lit * 0.45) }
          else if (kd === "plastic" || kd === "glass") { to(i, t.gloss, band(0.07, 0.3) * ((slant > 0.1 && slant < 0.34) || (slant > 0.39 && slant < 0.45) ? 1 : 0) * lit * 0.5); to(i, t.lt, band(-1, 0.05) * lit * 0.7) }
          else if (kd === "dark") to(i, t.gloss, band(0.05, 0.14) * lit * 0.4)
          else if (kd === "cloth" || kd === "pale" || kd === "leaf") to(i, t.lt, band(-1, Math.min(0.1, (H * 0.02) / C)) * lit * 0.6)
          else if (kd === "peel") to(i, t.lt, smooth(0.62, 0.1, Math.hypot(s - 0.3, (p - 0.45) * 0.9) * 1.6) * lit * 0.8)
        }
        if (pores[i]! > 0) { if (e1[i]! > 0.5) times(i, [0.84, 0.72, 0.84], pores[i]!); else to(i, mix(t.lt, SUN, 0.35), pores[i]! * 0.55) }
        if (el[i]! > 0.01) to(i, t.lt, el[i]! * lit * 0.85)
        if (L[i]! > 0.01) to(i, t.lt, L[i]! * Math.max(0.5, lt[i]!) * lit)
        if (rm[i]! > 0.01) to(i, kd === "skin" ? t.lt : mix(t.base, SUN, 0.7), rm[i]! * lit * 0.85)
        if (hairs && hairs.any[i]) { if (hairs.light[i]! > 0.01) to(i, t.lt, hairs.light[i]! * lit * 0.5); if (hairs.ring[i]! > 0.01) to(i, mix(t.base, [255, 254, 252], 0.72), hairs.ring[i]! * 0.8 * (1 - e1[i]! * 0.85)) }
        if (ring[i]! > 0.01) to(i, mix(t.base, [255, 253, 248], 0.62), ring[i]! * (1 - e1[i]! * 0.85))
      }
      // a rough skin has no glint
      if (hi[i]! > 0.01 && kd !== "peel") to(i, [255, 253, 248], hi[i]! * (1 - e1[i]! * 0.6))
    }
  }
  /* the second light, cold, from behind: a hard strip along the edges that face away from the sun and have something further back behind them */
  if (upto >= 7 && view !== "regions") {
    const W = art.head * 0.0125 * k, strip = new Float32Array(N), deepEnough = H * 0.075
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, n = map[i]!, kd = kinds[n]
      if (!n || n === bg || kd === "metal" || kd === "flat" || ink[i]! > 0.3 || (e1[i]! < 0.5 && kd !== "dark" && kd !== "leather")) continue
      let paper = 0, hit = false
      for (let t = 1; t < W * 4; t++) { const X = Math.round(x + sun.x * t), Y = Math.round(y + sun.y * t); if (X < 0 || Y < 0 || X >= w || Y >= h) break; const j = Y * w + X, m = map[j]!; if (m !== n) { hit = m === bg || zs[m]! < zs[n]! - (art.depth?.[names[m]!] ? 0 : 1); break } if (ink[j]! < 0.3 && ++paper > W) break }
      if (!hit || paper > W) continue
      const X = Math.round(x - sun.x * deepEnough), Y = Math.round(y - sun.y * deepEnough)
      if (X < 0 || Y < 0 || map[Y * w + X] !== n) continue
      strip[i] = 1
    }
    { const seen = new Uint8Array(N), least = H * 0.05 * W * 0.5; for (let q = 0; q < N; q++) if (strip[q] && !seen[q]) { const c = [q]; seen[q] = 1; for (let t = 0; t < c.length; t++) { const j = c[t]!, x = j % w; for (const g of [x > 0 ? j - 1 : -1, x < w - 1 ? j + 1 : -1, j - w, j + w, j - w - 1, j - w + 1, j + w - 1, j + w + 1]) if (g >= 0 && g < N && !seen[g] && strip[g]) { seen[g] = 1; c.push(g) } } if (c.length < least) for (const j of c) strip[j] = 0 } }
    const rs = crisp(strip, 0.6)
    for (let i = 0; i < N; i++) if (rs[i]! > 0.01 && tones[map[i]!]) to(i, tones[map[i]!]!.neon, rs[i]! * 0.92)
  }
  if (upto >= 8 && view !== "regions") wash(true)
  if (upto >= 8 && view !== "regions") for (const q of art.brows ?? []) { tmp.g.clearRect(0, 0, w, h); trace(tmp.g, q.d); tmp.g.fill(); const d = alphaOf(), c = hexRgb(q.color), f = names.indexOf("face"); for (let i = 0; i < N; i++) if (d[i * 4 + 3]) to(i, c, (d[i * 4 + 3]! / 255) * (map[i] === f ? 1 : kinds[map[i]!] === "hair" ? 0.38 : 0)) }
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
  // air between the viewer and what lies behind: paler, bluer, less contrast
  const back = defs.map((_, n) => art.depth?.[names[n]!] ?? 0), AIR: RGB = [196, 198, 226]
  if (upto >= 10 && view === "normal") for (let i = 0; i < N; i++) { const d = back[map[i]!]!; if (d) to(i, AIR, d * 0.34) }
  const r = rng("grain"), gf = new Float32Array(N)
  for (let i = 0; i < N; i++) gf[i] = r() - 0.5
  const grain = blur(gf, w, h, 1, 1), img = new ImageData(w, h)
  for (let i = 0; i < N; i++) { const gr = upto >= 10 && view === "normal" && map[i] !== bg ? grain[i]! * (kinds[map[i]!] === "skin" ? 4 : 13) : 0; img.data[i * 4] = R[i]! + gr; img.data[i * 4 + 1] = G[i]! + gr; img.data[i * 4 + 2] = B[i]! + gr; img.data[i * 4 + 3] = 255 }
  const col = mk()
  col.g.putImageData(img, 0, 0)
  const drawn = view !== "masks" && view !== "regions"
  if (upto >= 8 && drawn) { col.g.save(); col.g.scale(k, k); art.face(col.g); for (const e of eyes) e.under(col.g); col.g.restore() }

  const line = lineLayer({ ink, map, w, h, k, head: art.head, bg, kinds, z: zs, tones, face: names.indexOf("face"), dark: e1, strokes: refs.strokes, fall: [sun.x, sun.y], print: set(art.print ?? []), eyes: eyes.map((e) => e.at), back: upto >= 10 ? back : back.map(() => 0) }), li = line.image
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
