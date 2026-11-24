/** The cast. Original characters, built only from solids in figure.ts. */
import { circle, clamp, hull, lerp, spline, TAU } from "./geo.ts"
import type { P2, P3 } from "./geo.ts"
import { Fig } from "./figure.ts"
import type { Acting } from "./figure.ts"
import type { Drawing, Item, Palette } from "./list.ts"

type Place = { at: P2; S: number }
export type Character = { name: string; about: string; palette: Palette; build: (a: Acting, p: Place, id?: string) => Fig }

const shadow = (f: Fig, rx: number, a = 0.5, x = 0): void => {
  const c = f.g([x, 0, 0])
  f.shadows.push({ c: [c[0], c[1] + 0.02 * f.S], rx: rx * f.S, ry: 0.06 * f.S, a })
}

/* ---------- little drawn effects ---------- */
const curl = (f: Fig, items: Array<Item>, id: string, at: P2, r: number, turn = 1): void => {
  const pts: Array<P2> = Array.from({ length: 30 }, (_, i) => {
    const t = i / 29
    const a = t * TAU * 1.35 * turn + 2.6
    const q = r * (1 - t * 0.72) * f.S
    return [at[0] + Math.cos(a) * q, at[1] + Math.sin(a) * q * 0.9] as const
  })
  f.line(items, id, pts, "inner")
}
const puff = (f: Fig, items: Array<Item>, id: string, at: P2, r: number): void => {
  const n = 6
  const pts: Array<P2> = []
  for (let i = 0; i < n; i++) for (let k = 0; k < 7; k++) {
    const a = ((i + k / 7) / n) * TAU
    const q = r * f.S * (0.82 + 0.2 * Math.sin((Math.PI * k) / 7))
    pts.push([at[0] + Math.cos(a) * q * 1.1, at[1] + Math.sin(a) * q * 0.86])
  }
  f.shape(items, id, pts, "white")
  f.closed(items, `${id}.o`, pts, "inner")
  curl(f, items, `${id}.c`, [at[0] + r * 0.1 * f.S, at[1]], r * 0.46, at[0] % 2 > 1 ? -1 : 1)
}
const effects = (f: Fig, a: Acting, head: P2, w: number, mouthPiece?: P2, tilt = 0, crown = head): void => {
  const items = f.group(3)
  const S = f.S
  for (const fx of a.fx) {
    if (fx === "steam" && mouthPiece) {
      const [x, y] = mouthPiece
      puff(f, items, "st3", [x - (0.2 + tilt) * S, y - 0.5 * S], 0.16)
      puff(f, items, "st2", [x - (0.14 + tilt * 0.7) * S, y - 0.29 * S], 0.12)
      puff(f, items, "st1", [x - (0.08 + tilt * 0.4) * S, y - 0.12 * S], 0.075)
    }
    if (fx === "steam") for (const [i, t] of [-0.9, -0.55, 0.55, 0.9].entries()) {
      const q: P2 = [head[0] + t * w * 1.0 * S, head[1] - 0.02 * S + Math.abs(t) * 0.14 * S]
      f.line(items, `mad${i}`, [[q[0] + t * 0.06 * S, q[1] - 0.1 * S], [q[0] + t * 0.2 * S, q[1] - 0.24 * S]], "inner")
    }
    if (fx === "sweat") for (const [i, d] of ([[-1, 0], [1, 0.02], [1.14, 0.22]] as ReadonlyArray<P2>).entries()) {
      const c: P2 = [head[0] + d[0] * (w + 0.18) * S, head[1] + (0.02 + d[1]) * S]
      const s = Math.sign(d[0])
      const drop = spline([[c[0] + s * 0.07 * S, c[1] - 0.05 * S], [c[0] + s * 0.02 * S, c[1] + 0.05 * S], [c[0] - s * 0.05 * S, c[1] + 0.05 * S], [c[0] - s * 0.05 * S, c[1]]], 6, true)
      f.shape(items, `drop${i}`, drop, "white")
      f.closed(items, `drop${i}.o`, drop, "inner")
    }
    if (fx === "spark") for (const [i, d] of ([[1.28, -0.22, 0.1], [1.5, 0.02, 0.06]] as ReadonlyArray<P3>).entries()) {
      const c: P2 = [head[0] + d[0] * w * S, head[1] + d[1] * S]
      const star: Array<P2> = Array.from({ length: 8 }, (_, k) => { const r = (k % 2 ? 0.3 : 1) * d[2] * S; const an = (k / 8) * TAU - Math.PI / 2; return [c[0] + Math.cos(an) * r, c[1] + Math.sin(an) * r] as const })
      f.shape(items, `sp${i}`, star, "accent")
      f.closed(items, `sp${i}.o`, star, "inner")
    }
    if (fx === "notes") for (const [i, d] of ([[-1.45, -0.1, 1], [1.3, -0.34, 0.85], [1.02, -0.72, 0.6]] as ReadonlyArray<P3>).entries()) {
      const k = d[2] * S
      const c: P2 = [head[0] + d[0] * w * S, head[1] + d[1] * S]
      const head2 = circle(c, 0.055 * k, 18, 0.042 * k)
      f.shape(items, `n${i}`, head2, "dark")
      f.closed(items, `n${i}.o`, head2, "inner")
      f.line(items, `n${i}.s`, [[c[0] + 0.05 * k, c[1]], [c[0] + 0.07 * k, c[1] - 0.2 * k]], "inner")
      f.line(items, `n${i}.f`, spline([[c[0] + 0.07 * k, c[1] - 0.2 * k], [c[0] + 0.12 * k, c[1] - 0.14 * k], [c[0] + 0.13 * k, c[1] - 0.07 * k]], 5), "inner")
    }
    if (fx === "puzzle") {
      const c: P2 = [crown[0] + 0.16 * S, crown[1] - 0.16 * S]
      f.line(items, "q", spline([[c[0] - 0.07 * S, c[1] - 0.1 * S], [c[0] - 0.03 * S, c[1] - 0.18 * S], [c[0] + 0.06 * S, c[1] - 0.17 * S], [c[0] + 0.07 * S, c[1] - 0.09 * S], [c[0] + 0.005 * S, c[1] - 0.04 * S], [c[0], c[1] + 0.02 * S]], 6), "outline", { w: 0.9 })
      const dot = circle([c[0], c[1] + 0.085 * S], 0.016 * S, 10)
      f.shape(items, "qd", dot, "dark")
      f.closed(items, "qd.o", dot, "inner")
    }
    if (fx === "hop") {
      const g = f.g([0, 0, 0])
      for (const s of [-1, 1]) for (const k of [0, 1]) f.line(items, `hop${s}${k}`, spline([[g[0] + s * (0.5 + k * 0.1) * S, g[1] - 0.02 * S], [g[0] + s * (0.56 + k * 0.1) * S, g[1] - 0.06 * S], [g[0] + s * (0.6 + k * 0.1) * S, g[1] - 0.13 * S]], 4), "detail")
    }
  }
}

/* ---------- Whistle, a stove kettle ---------- */
const kettle: Character = {
  name: "Whistle", about: "Stove kettle. Lid and spout do the shouting.",
  palette: { body: "#d9492f", body2: "#f3dcb0", accent: "#2f6f8f", glove: "#fff6e2", limb: "#33313c", white: "#fffdf6", dark: "#221f28", eye: "#5d8f9c", mouth: "#4a1822", tongue: "#e8707a", cheek: "#f08a7c", none: "#ffffff" },
  build: (a, p, id = "kettle") => {
    const f = new Fig({ id, ...p, st: a.stance, palette: kettle.palette, base: 0.3 })
    shadow(f, 0.78)
    const r: ReadonlyArray<P2> = [[0.5, 0.0], [0.62, 0.03], [0.74, 0.16], [0.79, 0.36], [0.75, 0.58], [0.64, 0.8], [0.5, 0.95], [0.43, 1.02]]
    for (const s of [-1, 1] as const) f.leg(`leg${s}`, s, [s * 0.26, 0.04, 0], [s * 0.3, 0, 0.06])
    // bail handle, behind the lid
    const bail = spline(([[-0.46, 0.9, 0], [-0.6, 1.16, 0], [-0.5, 1.5, 0], [0, 1.66, 0], [0.5, 1.5, 0], [0.6, 1.16, 0], [0.46, 0.9, 0]] as ReadonlyArray<P3>).map((q) => f.b(q)), 7)
    f.hose("bail", bail, () => 0.03, "dark", -0.5, { role: "inner" })
    const grip = spline(([[-0.36, 1.585, 0], [0, 1.66, 0], [0.36, 1.585, 0]] as ReadonlyArray<P3>).map((q) => f.b(q)), 8)
    f.hose("grip", grip, (t) => 0.066 + 0.012 * Math.sin(t * Math.PI), "accent", -0.45, { cap: "both", tone: 0.8 })
    // spout, swings with yaw
    const sp = ([[-0.6, 0.36, 0.06], [-0.84, 0.44, 0.06], [-0.97, 0.64, 0.06], [-1.05, 0.84, 0.06], [-1.18, 0.95, 0.06]] as ReadonlyArray<P3>)
    const spz = f.body([-0.8, 0.5, 0.06])[2]
    const mid = spline(sp.map((q) => f.b(q)), 7)
    f.hose("spout", mid, (t) => lerp(0.2, 0.1, Math.min(1, t * 1.3)), "body", spz > 0 ? 0.35 : -0.35, { role: "outline", tone: 0.8 })
    const tip = mid[mid.length - 1]!
    const prev = mid[mid.length - 4]!
    const an = Math.atan2(tip[1] - prev[1], tip[0] - prev[0])
    const lip: Array<P2> = Array.from({ length: 24 }, (_, i) => { const q = (i / 24) * TAU; const u = Math.cos(q) * 0.045 * f.S, v = Math.sin(q) * 0.112 * f.S; return [tip[0] + u * Math.cos(an) - v * Math.sin(an), tip[1] + u * Math.sin(an) + v * Math.cos(an)] as const })
    const li = f.group(spz > 0 ? 0.36 : -0.34)
    f.shape(li, "lip", lip, "mouth")
    f.closed(li, "lip.o", lip, "outline", { w: 0.8 })
    // body
    const body = f.lathe("pot", r, { mat: "body", z: 0, tone: 0.75, toneFrom: 0.86, footTone: 0.14, guides: true, rings: [{ y: 0.11, role: "detail" }, { y: 0.93, to: 1.0, mat: "body2", role: "inner" }] })
    f.face(body.items, body.surf, a.expr, { x: 0, y: 0.53, k: 0.43, gap: 0.47, mouthY: -0.6, mouthW: 0.5, browY: 0.48 })
    // highlight: a short broken curve along the lit shoulder
    const hi = Array.from({ length: 9 }, (_, i) => body.surf(-0.5 + i * 0.004, 0.5 + i * 0.045).p)
    f.line(body.items, "hi", hi, "fine")
    // lid
    const pop = Math.max(0, a.pop)
    const tilt = pop * 0.24
    const y = 1.0 + pop * 0.17
    const lid = f.lathe("lid", [[0.47, 0], [0.47, 0.05], [0.4, 0.12], [0.24, 0.19], [0.04, 0.215]], { mat: "body", offset: [0, y, 0], tilt, z: 0.05, tone: 0.8, toneFrom: 0.8, rings: [{ y: 0.05, role: "detail" }] })
    void lid
    const knob = f.lathe("knob", [[0.05, 0.19], [0.1, 0.24], [0.11, 0.3], [0.07, 0.36], [0.01, 0.375]], { mat: "accent", offset: [0, y, 0], tilt, z: 0.06, tone: 0.9, toneFrom: 0.5 })
    void knob
    // keep the raised left hand clear of the spout
    const la = a.left.dy > 0 ? { ...a.left, dx: a.left.dx + 0.2, dy: a.left.dy + 0.12 } : a.left
    f.arm("L", -1, [-0.6, 0.36, 0.34], la)
    f.arm("R", 1, [0.68, 0.36, 0.2], a.right)
    effects(f, a, f.b([0, 1.32, 0]), 0.74, tip, 0.04, f.b([0, 1.7, 0]))
    return f
  },
}

/* ---------- Dial, a portable radio ---------- */
const radio: Character = {
  name: "Dial", about: "Portable radio. The aerial tells you how it feels.",
  palette: { body: "#f0b23a", body2: "#8a5a2b", accent: "#1f7a74", glove: "#fffaf0", limb: "#2c2a35", white: "#fffdf6", dark: "#26222c", eye: "#7a5230", mouth: "#4b1d1a", tongue: "#e0705e", cheek: "#ee8a5a", none: "#ffffff" },
  build: (a, p, id = "radio") => {
    const f = new Fig({ id, ...p, st: { ...a.stance, yaw: a.stance.yaw * 1.35, pitch: a.stance.pitch + 0.06 }, palette: radio.palette, base: 0.34 })
    shadow(f, 0.88)
    const w = 1.42, h = 0.98, d = 0.66
    for (const s of [-1, 1] as const) f.leg(`leg${s}`, s, [s * 0.42, 0.04, 0], [s * 0.44, 0, 0.04])
    // aerial
    const droop = clamp(-a.pop, 0, 1)
    const up = clamp(a.pop, 0, 1)
    const aer = spline(([[0.6, h - 0.02, -0.16], [0.66, h + 0.3, -0.16], [0.72 + droop * 0.12, h + 0.56 - droop * 0.1 + up * 0.06, -0.16], [0.8 + droop * 0.4, h + 0.78 - droop * 0.42 + up * 0.12, -0.16]] as ReadonlyArray<P3>).map((q) => f.b(q)), 8)
    f.hose("aer", aer, (t) => 0.024 - 0.008 * t, "white", -0.6, { role: "inner", w: 0.8 })
    const ball = circle(aer[aer.length - 1]!, 0.055 * f.S, 22)
    const bi = f.group(-0.55)
    f.shape(bi, "ball", ball, "accent")
    f.tone(bi, "ball.t", ball, ball, 0.8, -0.9, "accent")
    f.closed(bi, "ball.o", ball, "outline", { w: 0.7 })
    // handle
    const hd = spline(([[-0.46, h - 0.03, 0], [-0.44, h + 0.2, 0], [-0.3, h + 0.27, 0], [0.22, h + 0.27, 0], [0.36, h + 0.2, 0], [0.38, h - 0.03, 0]] as ReadonlyArray<P3>).map((q) => f.b(q)), 7)
    f.hose("handle", hd, () => 0.05, "accent", -0.3, { role: "outline", tone: 0.7 })
    const box = f.box("case", { w, h, d, r: 0.2, mat: "body", side: "body2", z: 0, guides: true, footTone: 0.24 })
    const F = (u: number, v: number): P2 => box.surf(u, v).p
    // tuning window
    const strip = [F(-0.58, 0.16), F(0.2, 0.16), F(0.2, 0.06), F(-0.58, 0.06)]
    f.shape(box.items, "strip", strip, "white")
    f.closed(box.items, "strip.o", strip, "inner", { w: 0.9 })
    for (let i = 0; i < 9; i++) f.line(box.items, `tick${i}`, [F(-0.54 + i * 0.087, 0.135), F(-0.54 + i * 0.087, i % 4 === 0 ? 0.085 : 0.11)], "fine")
    const nx = -0.3 + up * 0.3
    f.line(box.items, "needle", [F(nx, 0.18), F(nx + 0.01, 0.04)], "inner", { w: 1.1 })
    for (const [i, x] of [0.35, 0.56].entries()) {
      const c = Array.from({ length: 26 }, (_, k) => F(x + Math.cos((k / 26) * TAU) * 0.085, 0.125 + Math.sin((k / 26) * TAU) * 0.085))
      f.shape(box.items, `knob${i}`, c, "accent")
      f.tone(box.items, `knob${i}.t`, c, c, 0.6, -0.9, "accent")
      f.closed(box.items, `knob${i}.o`, c, "outline", { w: 0.62 })
      const t = i ? 0.9 : 2.2 - up
      f.line(box.items, `knob${i}.m`, [F(x, 0.125), F(x + Math.cos(t) * 0.06, 0.125 + Math.sin(t) * 0.06)], "inner")
    }
    f.face(box.items, box.surf, a.expr, { x: -0.06, y: 0.64, k: 0.42, gap: 0.56, mouthY: -0.52, mouthW: 0.5, eyeW: 0.27, browY: 0.47 })
    // speaker slots either side of the mouth
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) f.line(box.items, `slot${s}${i}`, [F(s * 0.4 - 0.06 + s * 0.02, 0.4 - i * 0.055), F(s * 0.6 - 0.06 + s * 0.02, 0.405 - i * 0.055)], "detail")
    f.arm("L", -1, [-0.7, 0.36, 0.2], a.left)
    f.arm("R", 1, [0.71, 0.36, 0.1], a.right)
    effects(f, a, f.b([0, 1.22, 0]), 0.8, aer[aer.length - 1]!, 0.02)
    return f
  },
}

/* ---------- Prickle, a potted cactus ---------- */
const cactus: Character = {
  name: "Prickle", about: "Potted cactus. Arms, opinions, one flower.",
  palette: { body: "#4f9a56", body2: "#d97a4a", accent: "#c8593a", glove: "#4f9a56", limb: "#4f9a56", white: "#fffdf6", dark: "#1f2a22", eye: "#7d5a3a", mouth: "#34221c", tongue: "#e57f86", cheek: "#e78b7d", none: "#ffffff" },
  build: (a, p, id = "cactus") => {
    const f = new Fig({ id, ...p, st: { ...a.stance, hop: a.stance.hop * 0.4 }, palette: cactus.palette, base: 0.52 })
    shadow(f, 0.66)
    const st = { ...a.stance, lean: 0, bend: 0, squash: 1, hop: 0 }
    const pf = new Fig({ id: `${id}.pot`, ...p, st, palette: cactus.palette, base: 0 })
    pf.lathe("cup", [[0.4, 0.0], [0.42, 0.02], [0.5, 0.44]], { mat: "accent", z: -0.2, tone: 0.8, toneFrom: 0.8, raw: true, guides: true })
    const soil = Array.from({ length: 36 }, (_, i) => pf.b([Math.sin((i / 36) * TAU) * 0.5, 0.56, Math.cos((i / 36) * TAU) * 0.5]))
    pf.lathe("rim", [[0.56, 0.4], [0.57, 0.42], [0.57, 0.56]], { mat: "accent", z: -0.15, tone: 0.8, toneFrom: 0.8, raw: true })
    const si = pf.group(-0.14)
    pf.shape(si, "soil", soil, "dark", { shade: 0.8 })
    pf.tone(si, "soil.t", soil, soil, 1.2, -0.3, "dark")
    pf.closed(si, "soil.o", soil, "inner")
    f.groups.push(...pf.groups)
    f.guides.push(...pf.guides)
    const r: ReadonlyArray<P2> = [[0.38, 0.05], [0.45, 0.3], [0.5, 0.62], [0.49, 0.95], [0.4, 1.2], [0.22, 1.36], [0.02, 1.41]]
    const body = f.lathe("stem", r, { mat: "body", z: 0.1, tone: 0.75, toneFrom: 0.8, guides: true })
    const prof = spline(r, 6)
    // ribs: longitudes, skipping the face
    for (const [i, ang] of [-1.28, -0.95, 0.95, 1.28, -0.35, 0.35, 0].entries()) {
      const near = i > 3
      const pts: Array<P2> = []
      for (const [rr, y] of prof) {
        if (near ? y > 1.12 || (y < 0.36) : y > 0.12) {
          if (near && y < 0.36) continue
          const aa = ang
          const q = body.surf(aa * Math.max(0.35, rr), y)
          if (q.vis) pts.push(q.p)
        }
      }
      if (pts.length > 3) f.line(body.items, `rib${i}`, pts, "detail")
    }
    for (const [i, [u, v]] of ([[-1.1, 0.45], [-1.12, 0.75], [-1.1, 1.02], [1.1, 0.42], [1.12, 0.7], [1.08, 1.0], [-0.2, 0.2], [0.25, 0.24], [-0.4, 1.2], [0.45, 1.17]] as ReadonlyArray<P2>).entries()) {
      const q = body.surf(u * Math.max(0.35, body.radius(v)), v)
      if (!q.vis) continue
      const t = 0.035 * f.S
      for (const [k, d] of ([[-1, -0.8], [0, -1.2], [1, -0.8]] as ReadonlyArray<P2>).entries()) f.line(body.items, `sp${i}${k}`, [q.p, [q.p[0] + d[0] * t, q.p[1] + d[1] * t]], "fine")
    }
    f.face(body.items, body.surf, a.expr, { x: 0, y: 0.82, k: 0.46, gap: 0.42, mouthY: -0.66, mouthW: 0.36, eyeW: 0.26, browY: 0.5 })
    // flower
    const top = f.b([0, 1.41, 0])
    const bloom = 1 + clamp(a.pop, -0.6, 1) * 0.35
    const fl = f.group(0.2)
    for (let i = 0; i < 5; i++) {
      const an = -Math.PI / 2 + (i - 2) * 0.62 * bloom
      const c: P2 = [top[0] + Math.cos(an) * 0.13 * f.S * bloom, top[1] - 0.01 * f.S + Math.sin(an) * 0.12 * f.S * bloom]
      const pet = hull([...circle(c, 0.072 * f.S * bloom, 18), [top[0], top[1]]])
      f.shape(fl, `pet${i}`, pet, "cheek")
      f.closed(fl, `pet${i}.o`, pet, "inner")
      f.line(fl, `pet${i}.v`, [[lerp(top[0], c[0], 0.4), lerp(top[1], c[1], 0.4)], c], "fine")
    }
    const eye = circle([top[0], top[1] - 0.005 * f.S], 0.055 * f.S, 18)
    f.shape(fl, "fc", eye, "body2")
    f.tone(fl, "fc.t", eye, eye, 0.9, -0.8, "body2")
    f.closed(fl, "fc.o", eye, "inner")
    const armOf = (x: Acting["left"]): Acting["left"] => ({ ...x, dx: 0.28 + x.dx * 0.22, dy: 0.4 + x.dy * 0.3 })
    f.arm("L", -1, [-0.4, 0.5, 0.05], armOf(a.left), { r: 0.112, stub: true, mat: "body", z: -0.6 })
    f.arm("R", 1, [0.4, 0.6, 0.05], armOf(a.right), { r: 0.112, stub: true, mat: "body", z: -0.6 })
    effects(f, a, f.b([0, 1.52, 0]), 0.66)
    return f
  },
}

export const CAST: Readonly<Record<string, Character>> = { kettle, radio, cactus }

export const draw = (who: Character, a: Acting, p: Place): Drawing => {
  const f = who.build(a, p)
  return { items: [...f.guides, ...f.emit()], shadows: f.shadows, S: p.S, palette: who.palette }
}
