/** A full illustration from the same parts: breakfast, with music. */
import { POSES } from "./acting.ts"
import { CAST } from "./cast.ts"
import { Fig } from "./figure.ts"
import type { Acting } from "./figure.ts"
import { bezier, circle, lerp, rng, spline } from "./geo.ts"
import type { P2, P3 } from "./geo.ts"
import type { Drawing, Item, Palette } from "./list.ts"

const pal = (o: Partial<Palette>): Palette => ({ ...CAST.kettle!.palette, ...o })
const flat = { yaw: 0, pitch: 0, lean: 0, squash: 1, bend: 0, hop: 0 }

/** Laid out on a 1920×1080 page; `k` scales it. */
export const breakfast = (k: number, act: (a: Acting, i: number) => Acting = (a) => a): Drawing => {
  const q = (x: number, y: number): P2 => [x * k, y * k]
  const S = 208 * k
  const fig = (id: string, p: Partial<Palette>, at: P2 = q(0, 0), s = S, st: Partial<typeof flat> = {}, lw = 0.74): Fig => new Fig({ id, at, S: s, st: { ...flat, ...st }, palette: pal(p), base: 0, lw })
  const rect = (x0: number, y0: number, x1: number, y1: number): Array<P2> => [q(x0, y0), q(x1, y0), q(x1, y1), q(x0, y1)]
  const items: Array<Item> = []
  const guides: Array<Item> = []
  const shadows: Array<{ c: P2; rx: number; ry: number; a: number }> = []

  /* ---- window ---- */
  const win = fig("win", { body: "#a9d3df", body2: "#f4c34a", accent: "#e8b04a" })
  const w = win.group(0)
  const [X0, Y0, X1, Y1] = [590, 92, 1330, 610]
  const glass = rect(X0, Y0, X1, Y1)
  win.shape(w, "sky", glass, "body", {})
  const sun = circle(q(1130, 250), 78 * k, 40)
  win.shape(w, "sun", sun, "body2", { clip: glass })
  win.closed(w, "sun.o", sun, "inner", { clip: glass })
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.1
    win.line(w, `ray${i}`, [q(1130 + Math.cos(a) * 100, 250 + Math.sin(a) * 100), q(1130 + Math.cos(a) * 126, 250 + Math.sin(a) * 126)], "detail", { clip: glass })
  }
  for (const [i, [cx, cy, s]] of ([[745, 210, 1], [985, 330, 0.62]] as ReadonlyArray<P3>).entries()) {
    const c = spline([[-100, 30], [-92, -6], [-52, -18], [-30, -52], [26, -56], [52, -24], [92, -18], [104, 16], [70, 34], [0, 36]].map(([x, y]) => q(cx + x! * s, cy + y! * s)), 7, true)
    win.shape(w, `cloud${i}`, c, "white", { clip: glass })
    win.closed(w, `cloud${i}.o`, c, "inner", { clip: glass })
  }
  const hills = fig("hills", { body: "#7fb069", body2: "#a9c46c", accent: "#4f8a5b" })
  const far = [...spline([q(580, 520), q(700, 438), q(820, 470), q(960, 410), q(1120, 470), q(1240, 430), q(1340, 480)], 8), q(1340, 620), q(580, 620)]
  hills.shape(w, "far", far, "body2", { clip: glass })
  hills.tone(w, "far.t", [q(960, 412), q(1120, 470), q(1240, 432), q(1340, 480), q(1340, 520), q(1080, 520), q(940, 560)], glass, 0.4, -0.9, "body2")
  hills.line(w, "far.o", far.slice(0, 49), "inner", { clip: glass })
  const near = [...spline([q(580, 560), q(720, 530), q(900, 565), q(1080, 520), q(1200, 545), q(1340, 505)], 8), q(1340, 620), q(580, 620)]
  hills.shape(w, "near", near, "body", { clip: glass })
  hills.tone(w, "near.t", [q(600, 575), q(740, 545), q(900, 582), q(900, 620), q(600, 620)], glass, 0.6, -0.5, "body")
  hills.line(w, "near.o", near.slice(0, 41), "inner", { clip: glass })
  for (const [i, [tx, ty, s]] of ([[690, 530, 1], [732, 538, 0.72], [1215, 536, 0.9]] as ReadonlyArray<P3>).entries()) {
    const t = spline([[0, -84], [24, -40], [22, -14], [0, -8], [-22, -14], [-24, -40]].map(([x, y]) => q(tx + x! * s, ty + y! * s)), 7, true)
    hills.shape(w, `tree${i}`, t, "accent", { clip: glass })
    hills.tone(w, `tree${i}.t`, [q(tx + 2 * s, ty - 80 * s), q(tx + 26 * s, ty - 40 * s), q(tx + 22 * s, ty - 12 * s), q(tx + 4 * s, ty - 8 * s)], t, 0.8, -0.9, "accent")
    hills.closed(w, `tree${i}.o`, t, "inner", { clip: glass })
    hills.line(w, `tree${i}.s`, [q(tx, ty - 8 * s), q(tx, ty + 14 * s)], "inner", { clip: glass })
  }
  const bars = fig("bars", { body: "#f4ead2", body2: "#d9c7a0" })
  const bar = (id: string, x0: number, y0: number, x1: number, y1: number): void => {
    const p = rect(x0, y0, x1, y1)
    bars.shape(w, id, p, "white")
    bars.closed(w, `${id}.o`, p, "inner", { w: 0.95 })
  }
  bar("v", 948, Y0, 972, Y1)
  bar("h", X0, 318, X1, 340)
  bar("t", X0 - 30, Y0 - 26, X1 + 30, Y0)
  bar("l", X0 - 30, Y0, X0, Y1)
  bar("r", X1, Y0, X1 + 30, Y1)
  bars.tone(w, "r.t", rect(X1 + 14, Y0, X1 + 30, Y1), rect(X1, Y0, X1 + 30, Y1), 0.8, -0.9, "white")
  const sill = rect(X0 - 62, Y1, X1 + 62, Y1 + 34)
  bars.shape(w, "sill", sill, "white")
  bars.tone(w, "sill.t", rect(X0 - 62, Y1 + 18, X1 + 62, Y1 + 34), sill, 0.8, -0.2, "white")
  bars.closed(w, "sill.o", sill, "outline", { w: 0.8 })
  bars.guide("v1", [q(X0 - 30, Y0 - 70), q(X0 - 30, Y1 + 90)], 0)
  bars.guide("v2", [q(X1 + 30, Y0 - 80), q(X1 + 30, Y1 + 80)], 0)
  bars.guide("h1", [q(X0 - 120, Y0 - 26), q(X1 + 120, Y0 - 26)], 0)
  bars.guide("d1", [q(X0 - 40, Y0 - 30), q(X1 + 40, Y1 + 10)], 0.1)
  bars.guide("d2", [q(X1 + 40, Y0 - 30), q(X0 - 40, Y1 + 10)], 0.1)
  bars.guide("sun", [...circle(q(1130, 250), 128 * k, 36), q(1258, 250)], 0)

  bars.tone(w, "sill.s", [q(X0 - 40, Y1 + 34), q(X1 + 62, Y1 + 34), q(X1 + 50, Y1 + 62), q(X0 - 10, Y1 + 56)], [q(X0 - 100, Y1 + 34), q(X1 + 100, Y1 + 34), q(X1 + 100, Y1 + 90), q(X0 - 100, Y1 + 90)], 0.6, -0.3, "white")

  /* ---- curtains ---- */
  const cur = fig("cur", { body: "#e2856e", body2: "#f3d9c4", accent: "#c9694f" })
  const c = cur.group(0.1)
  const rod = rect(470, 48, 1450, 60)
  cur.shape(c, "rod", rod, "dark")
  for (const x of [462, 1458]) {
    const b = circle(q(x, 54), 17 * k, 18)
    cur.shape(c, `fin${x}`, b, "accent")
    cur.closed(c, `fin${x}.o`, b, "inner")
  }
  for (const s of [-1, 1]) {
    const mx = (x: number): number => (s < 0 ? x : 1920 - x)
    const pts: ReadonlyArray<P2> = [[486, 60], [704, 60], [690, 170], [636, 300], [580, 392], [592, 470], [604, 560], [598, 660], [470, 668], [478, 520], [520, 400], [492, 240]]
    const body = spline(pts.map(([x, y]) => q(mx(x), y)), 8, true)
    cur.shape(c, `c${s}`, body, "body")
    cur.tone(c, `c${s}.t`, [[520, 60], [560, 60], [572, 260], [540, 392], [520, 380], [520, 200]].map(([x, y]) => q(mx(x!), y!)), body, 0.75, -1.1, "body")
    cur.tone(c, `c${s}.t2`, [[610, 60], [650, 60], [640, 180], [590, 330], [566, 380], [600, 240]].map(([x, y]) => q(mx(x!), y!)), body, 0.6, -1.1, "body")
    cur.tone(c, `c${s}.t3`, [[540, 410], [560, 410], [560, 668], [520, 668]].map(([x, y]) => q(mx(x!), y!)), body, 0.7, -1.2, "body")
    for (const [i, f] of ([[[552, 62], [568, 200], [552, 320], [540, 388]], [[612, 62], [606, 190], [576, 310], [556, 388]], [[662, 62], [650, 160], [606, 290], [568, 386]], [[540, 410], [528, 520], [524, 662]], [[560, 410], [568, 520], [562, 660]]] as ReadonlyArray<ReadonlyArray<P2>>).entries())
      cur.line(c, `c${s}.f${i}`, spline(f.map(([x, y]) => q(mx(x), y)), 7), "detail", { clip: body })
    cur.closed(c, `c${s}.o`, body, "outline", { w: 0.85 })
    const tie = spline(([[508, 384], [586, 376], [594, 402], [512, 412]] as ReadonlyArray<P2>).map(([x, y]) => q(mx(x), y)), 5, true)
    cur.shape(c, `tie${s}`, tie, "accent")
    cur.closed(c, `tie${s}.o`, tie, "inner")
  }

  /* ---- hanging lamp ---- */
  const lamp = fig("lamp", { body: "#f0b23a", body2: "#fff0c0", accent: "#2f6f8f" }, q(250, 300), S * 1.0, { pitch: -0.12 })
  const cord = lamp.group(0)
  lamp.line(cord, "cord", bezier(q(246, -20), q(256, 110), q(250, 190)), "inner")
  lamp.lathe("shade", [[0.14, 0.42], [0.2, 0.4], [0.34, 0.2], [0.56, 0.0]], { mat: "body", z: 0.2, tone: 0.8, toneFrom: 0.7, raw: true, guides: true })
  lamp.lathe("cap", [[0.1, 0.4], [0.12, 0.48], [0.05, 0.56]], { mat: "accent", z: 0.3, tone: 0.8, raw: true })
  const under = Array.from({ length: 30 }, (_, i) => lamp.b([Math.sin((i / 30) * 6.283) * 0.56, 0, Math.cos((i / 30) * 6.283) * 0.56]))
  const ug = lamp.group(0.4)
  lamp.shape(ug, "under", under, "body2")
  lamp.closed(ug, "under.o", under, "inner")
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * (0.22 + 0.14 * i)
    lamp.line(ug, `glow${i}`, [q(250 + Math.cos(a) * 110, 322 + Math.sin(a) * 60), q(250 + Math.cos(a) * 160, 322 + Math.sin(a) * 100)], "detail")
  }

  /* ---- framed picture ---- */
  const pic = fig("pic", { body: "#e9d9b6", body2: "#8a5a2b", accent: "#d9492f" })
  const pg = pic.group(0)
  const fr = [q(1560, 150), q(1790, 138), q(1800, 372), q(1568, 382)]
  const inn = [q(1584, 172), q(1768, 163), q(1776, 350), q(1591, 358)]
  pic.line(pg, "nail", [q(1590, 148), q(1672, 92), q(1764, 138)], "detail")
  pic.shape(pg, "fr", fr, "body2")
  pic.tone(pg, "fr.t", fr, fr, 0.5, -0.9, "body2")
  pic.shape(pg, "inn", inn, "white")
  pic.closed(pg, "fr.o", fr, "outline", { w: 0.85 })
  pic.closed(pg, "inn.o", inn, "inner")
  const fish = spline([[1618, 262], [1660, 226], [1710, 238], [1736, 262], [1762, 236], [1760, 296], [1734, 272], [1704, 296], [1656, 298]].map(([x, y]) => q(x!, y!)), 6, true)
  pic.shape(pg, "fish", fish, "accent")
  pic.closed(pg, "fish.o", fish, "inner")
  pic.line(pg, "gill", bezier(q(1668, 238), q(1684, 264), q(1666, 290)), "detail")
  const e = circle(q(1645, 256), 5 * k, 12)
  pic.shape(pg, "fe", e, "dark")

  /* ---- table ---- */
  const tab = fig("tab", { body: "#c98f58", body2: "#8f5f36", accent: "#8f5f36" }, q(0, 0), S, {}, 0.92)
  const t = tab.group(0)
  const top = [q(150, 742), q(1770, 742), q(1886, 938), q(34, 938)]
  const front = [q(34, 938), q(1886, 938), q(1880, 1004), q(40, 1004)]
  for (const [i, x] of [120, 1720].entries()) {
    const leg = [q(x, 1000), q(x + 84, 1000), q(x + 78, 1110), q(x + 8, 1110)]
    tab.shape(t, `leg${i}`, leg, "body2")
    tab.tone(t, `leg${i}.t`, leg, leg, 0.9, -0.9, "body2")
    tab.closed(t, `leg${i}.o`, leg, "outline", { w: 0.8 })
  }
  tab.shape(t, "top", top, "body")
  tab.shape(t, "front", front, "body2", { shade: 0.5 })
  tab.tone(t, "front.t", front, front, 0.85, -0.5, "body2")
  const r = rng("grain")
  for (let i = 0; i < 16; i++) {
    const v = 0.08 + r() * 0.86
    const y = lerp(742, 938, v)
    const x0 = lerp(150, 34, v) + 30 + r() * 1300
    const l = 120 + r() * 320
    tab.line(t, `grain${i}`, spline([q(x0, y), q(x0 + l * 0.35, y + (r() - 0.5) * 9), q(x0 + l * 0.7, y + (r() - 0.5) * 9), q(x0 + l, y + 2)], 6), "fine", { clip: top })
  }
  for (const v of [0.3, 0.64]) tab.line(t, `plank${v}`, [q(lerp(150, 34, v), lerp(742, 938, v)), q(960, lerp(742, 938, v) + 3), q(lerp(1770, 1886, v), lerp(742, 938, v))], "detail")
  for (const x of [380, 960, 1540]) tab.line(t, `joint${x}`, [q(x, 944), q(x + 3, 1000)], "detail")
  // cast shadows, hatched straight onto the boards
  for (const [i, [x, y, w2]] of ([[430, 838, 250], [1020, 884, 300], [1590, 846, 190], [1196, 932, 88], [1384, 918, 150]] as ReadonlyArray<P3>).entries())
    tab.tone(t, `cs${i}`, spline([[-w2 * 0.7, 4], [-w2 * 0.2, -15], [w2 * 0.5, -17], [w2, -6], [w2 * 0.7, 12], [0, 18]].map(([a, b]) => q(x + a!, y + b!)), 6, true), top, 0.95, -0.1, "body")
  tab.closed(t, "top.o", top, "outline", { w: 0.85 })
  tab.line(t, "front.o", [q(40, 938), q(44, 1004), q(1878, 1005), q(1882, 938)], "outline", { side: -1, w: 1.05 })
  tab.guide("vl", [q(150, 742), q(34, 938)], 0.35)
  tab.guide("vr", [q(1770, 742), q(1886, 938)], 0.35)
  tab.guide("hz", [q(60, 742), q(1860, 742)], 0.2)

  for (const f of [win, hills, bars, cur, lamp, pic, tab]) { items.push(...f.emit()); guides.push(...f.guides) }

  /* ---- mug, plate, toast, lemon ---- */
  const prop = (f: Fig, rx: number): void => { const p = f.g([0, 0, 0]); shadows.push({ c: [p[0] + 0.05 * f.S, p[1]], rx: rx * f.S, ry: 0.07 * f.S, a: 0.5 }) }
  const pl = fig("plate", { body: "#fbf6ea", accent: "#2f6f8f" }, q(1352, 905), S, { pitch: 0.3 }, 0.9)
  const disc = (rr: number, y: number): Array<P2> => Array.from({ length: 40 }, (_, i) => pl.b([Math.sin((i / 40) * 6.283) * rr, y, Math.cos((i / 40) * 6.283) * rr]))
  prop(pl, 0.62)
  const pp = pl.group(0)
  pl.shape(pp, "rim", disc(0.56, 0.05), "white")
  pl.tone(pp, "rim.t", disc(0.56, 0.05).filter((_, i) => i < 13), disc(0.56, 0.05), 0.5, -0.6, "white")
  pl.closed(pp, "rim.o", disc(0.56, 0.05), "outline", { w: 0.8 })
  pl.closed(pp, "well", disc(0.38, 0.05), "detail")
  const toast = spline([[1196, 880], [1184, 842], [1216, 822], [1266, 820], [1298, 828], [1304, 862], [1294, 884], [1244, 890]].map(([x, y]) => q(x! + 84, y!)), 6, true)
  const crust = toast.map(([x, y]) => [x, y + 15 * k] as P2)
  const ts = fig("toast", { body: "#e9bd78", body2: "#a86a32" }, q(0, 0), S, {}, 0.9)
  ts.shape(pp, "crust", [...crust], "body2")
  ts.tone(pp, "crust.t", crust, crust, 0.9, -0.9, "body2")
  ts.closed(pp, "crust.o", crust, "outline", { w: 0.75 })
  ts.shape(pp, "top", toast, "body")
  ts.closed(pp, "top.o", toast, "inner")
  const but = spline([[1228, 842], [1264, 838], [1274, 858], [1238, 864]].map(([x, y]) => q(x! + 84, y!)), 4, true)
  ts.shape(pp, "but", but, "white")
  ts.closed(pp, "but.o", but, "inner")
  items.push(...pl.emit())
  guides.push(...pl.guides)

  /* ---- cast ---- */
  const cast: ReadonlyArray<readonly [string, Acting, P2, number]> = [
    ["radio", { ...POSES.groove!, right: { dx: 0.2, dy: -0.36, rot: 2.7, bend: -0.1, shape: "relaxed" }, stance: { ...POSES.groove!.stance, yaw: 0.3, lean: 0.1 } }, q(400, 832), S * 1.02],
    ["cactus", { ...POSES.bored!, stance: { ...POSES.bored!.stance, yaw: -0.42 }, expr: { ...POSES.bored!.expr, look: [-0.8, 0.1] } }, q(1556, 836), S * 1.06],
    ["kettle", { ...POSES.laughing!, right: POSES.hello!.right, left: POSES.approve!.left, stance: { ...POSES.laughing!.stance, yaw: -0.34 } }, q(985, 872), S * 1.1],
  ]
  for (const [i, [who, a, at, s]] of cast.entries()) {
    const f = CAST[who]!.build(act(a, i), { at, S: s }, who)
    items.push(...f.emit())
    guides.push(...f.guides)
    shadows.push(...f.shadows.map((x) => ({ ...x, a: 0.55 })))
  }
  const mug = fig("mug", { body: "#3f7fa8", body2: "#f3dcb0", accent: "#3f7fa8" }, q(1166, 930), S * 0.92, { pitch: 0.24, yaw: 0.5 }, 0.95)
  prop(mug, 0.34)
  const ear = spline(([[0.2, 0.36, 0], [0.44, 0.36, 0], [0.44, 0.12, 0], [0.21, 0.1, 0]] as ReadonlyArray<P3>).map((p) => mug.b(p)), 7)
  mug.hose("ear", ear, () => 0.036, "body", -0.1, { role: "inner" })
  mug.lathe("cup", [[0.2, 0], [0.23, 0.02], [0.24, 0.46]], { mat: "body", z: 0, tone: 0.75, toneFrom: 0.7, raw: true, guides: true, rings: [{ y: 0.14, to: 0.22, mat: "body2", role: "detail" }] })
  const mg = mug.group(0.2)
  const mouth = Array.from({ length: 30 }, (_, i) => mug.b([Math.sin((i / 30) * 6.283) * 0.235, 0.46, Math.cos((i / 30) * 6.283) * 0.235]))
  mug.shape(mg, "m", mouth, "white")
  const tea = mouth.map(([x, y]) => [x, y + 5 * k] as P2)
  mug.shape(mg, "tea", tea, "mouth", { clip: mouth })
  mug.closed(mg, "m.o", mouth, "inner")
  const sx = mouth[0]![0]
  const sy = mouth[0]![1]
  for (const [i, d] of [-0.06, 0.08].entries()) mug.line(mg, `steam${i}`, spline([[sx + d * S, sy - 0.1 * S], [sx + (d + 0.06) * S, sy - 0.2 * S], [sx + (d - 0.04) * S, sy - 0.32 * S], [sx + (d + 0.03) * S, sy - 0.44 * S]], 7), "detail")
  items.push(...mug.emit())
  guides.push(...mug.guides)
  return { items: [...guides, ...items], shadows, S, palette: CAST.kettle!.palette }
}
