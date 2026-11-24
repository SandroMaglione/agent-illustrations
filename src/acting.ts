import { lerp } from "./geo.ts"
import type { Acting, Arm, Expr, HandShape, Stance } from "./figure.ts"

const E0: Expr = {
  open: 0.84, angry: 0, low: 0, look: [0.1, 0.05], pupil: 1, shut: "", winkR: false,
  brow: 0, browTilt: 0, browBend: 0.6, browSkew: 0,
  mouth: 0, smile: 0.6, skew: 0, round: 0, teeth: 1, tongue: 1, wave: 0, cheeks: 0,
}
const S0: Stance = { yaw: -0.36, pitch: 0.1, lean: 0, squash: 1, bend: 0, hop: 0 }
const arm = (dx: number, dy: number, rot: number, bend: number, shape: HandShape, behind?: boolean): Arm => ({ dx, dy, rot, bend, shape, ...(behind ? { behind } : {}) })

const pose = (o: { st?: Partial<Stance>; ex?: Partial<Expr>; l: Arm; r: Arm; pop?: number; fx?: Acting["fx"] }): Acting => ({
  stance: { ...S0, ...o.st }, expr: { ...E0, ...o.ex }, left: o.l, right: o.r, pop: o.pop ?? 0, fx: o.fx ?? [],
})
const REST = arm(0.24, -0.4, 2.85, -0.12, "relaxed")

export const POSES: Readonly<Record<string, Acting>> = {
  "at ease": pose({ l: REST, r: REST, ex: { open: 0.74, look: [0.15, 0.1] } }),
  hello: pose({ l: REST, r: arm(0.36, 0.5, 0.22, 0.16, "open"), st: { lean: 0.05, bend: 0.04 }, ex: { open: 0.96, mouth: 0.75, smile: 1, brow: 0.5, browBend: 1.1, cheeks: 0.8 }, pop: 0.15 }),
  dunno: pose({ l: arm(0.46, 0.08, 1.25, 0.18, "open"), r: arm(0.46, 0.08, 1.25, 0.18, "open"), st: { lean: -0.07, squash: 0.94 }, ex: { open: 0.8, look: [0.75, 0.6], brow: 0.5, browTilt: -0.5, browSkew: 0.6, smile: -0.5, skew: 0.7 }, fx: ["puzzle"] }),
  approve: pose({ l: arm(0.3, -0.3, 2.5, -0.16, "fist"), r: arm(0.42, 0.24, 0.12, -0.16, "thumb"), st: { lean: 0.07, yaw: -0.46 }, ex: { open: 0.82, winkR: true, smile: 1, skew: 0.35, browSkew: -0.5, cheeks: 1 }, fx: ["spark"] }),
  furious: pose({ l: arm(0.4, -0.22, 2.5, 0.16, "fist"), r: arm(0.4, -0.22, 2.5, 0.16, "fist"), st: { lean: 0, squash: 0.92, pitch: 0.02, yaw: -0.22 }, ex: { open: 0.76, angry: 0.62, low: 0.3, brow: -0.75, browTilt: 1.5, browBend: 0.1, mouth: 0.8, smile: -0.8, teeth: 2.3, tongue: 0, pupil: 0.8, look: [-0.1, 0.05] }, pop: 1, fx: ["steam"] }),
  laughing: pose({ l: arm(0.1, -0.06, -0.9, -0.3, "open"), r: arm(0.4, 0.32, 0.5, 0.1, "open"), st: { lean: -0.14, pitch: -0.1, squash: 1.04, bend: -0.06, yaw: -0.3 }, ex: { shut: "arc", mouth: 1.2, smile: 0.8, brow: 0.6, browBend: 1.2, cheeks: 1 }, pop: 0.55 }),
  thinking: pose({ l: arm(0.16, -0.14, -1.1, -0.28, "fist"), r: arm(0.16, 0.24, -0.15, -0.36, "point"), st: { lean: 0.05, yaw: 0.34 }, ex: { open: 0.72, look: [0.6, 0.85], brow: 0.15, browTilt: -0.1, browSkew: 0.8, smile: -0.25, skew: -0.6 } }),
  look: pose({ l: REST, r: arm(0.52, 0.2, 1.1, 0.06, "point"), st: { lean: 0.1, yaw: 0.46, bend: 0.06 }, ex: { open: 1, look: [0.9, 0.2], brow: 0.75, browBend: 1, mouth: 0.6, round: 0.8, smile: 0 } }),
  shock: pose({ l: arm(0.36, 0.5, 0.5, 0.16, "open"), r: arm(0.36, 0.5, 0.5, 0.16, "open"), st: { squash: 1.1, hop: 0.06, yaw: -0.16, pitch: 0.02 }, ex: { open: 1.06, pupil: 0.62, look: [0, 0.05], brow: 1.2, browBend: 1.2, mouth: 1.1, round: 0.75, smile: 0, tongue: 0.7 }, pop: 1, fx: ["sweat"] }),
  bored: pose({ l: arm(0.18, -0.46, 3.0, -0.08, "relaxed"), r: arm(0.18, -0.46, 3.0, -0.08, "relaxed"), st: { lean: 0.11, squash: 0.95, yaw: 0.4, bend: 0.05 }, ex: { open: 0.5, low: 0.12, look: [-0.5, -0.1], brow: -0.25, browBend: 0.1, smile: -0.2, skew: -0.3 }, pop: -0.2 }),
  blue: pose({ l: arm(0.12, -0.44, 2.9, -0.06, "relaxed"), r: arm(0.12, -0.44, 2.9, -0.06, "relaxed"), st: { lean: -0.08, squash: 0.93, pitch: 0.26, yaw: -0.3 }, ex: { open: 0.66, angry: -0.5, look: [-0.2, -0.75], brow: 0.25, browTilt: -1.1, browBend: 0.2, smile: -1, wave: 0.6 }, pop: -0.5 }),
  groove: pose({ l: arm(0.4, 0.34, 0.5, 0.2, "open"), r: arm(0.44, -0.2, 2.1, 0.12, "fist"), st: { lean: 0.15, squash: 0.97, hop: 0.05, yaw: 0.26, bend: 0.1 }, ex: { shut: "line", mouth: 0.3, smile: 1, browSkew: 0.5, brow: 0.4, cheeks: 0.6, tongue: 0 }, pop: 0.3, fx: ["notes", "hop"] }),
}

const num = (a: number, b: number, t: number): number => lerp(a, b, t)
/** Blend two actings; discrete choices swap half way, as on a sheet of keys. */
export const blend = (a: Acting, b: Acting, t: number): Acting => {
  const h = t > 0.45
  const obj = <T extends object>(x: T, y: T): T => Object.fromEntries(Object.entries(x).map(([k, v]) => {
    const w = (y as Record<string, unknown>)[k]
    if (typeof v === "number" && typeof w === "number") return [k, num(v, w, t)]
    if (Array.isArray(v) && Array.isArray(w)) return [k, v.map((q: number, i) => num(q, w[i] as number, t))]
    return [k, h ? w : v]
  })) as T
  return {
    stance: obj(a.stance, b.stance), expr: obj(a.expr, b.expr),
    left: { ...obj(a.left, b.left), shape: (h ? b : a).left.shape }, right: { ...obj(a.right, b.right), shape: (h ? b : a).right.shape },
    pop: num(a.pop, b.pop, t), fx: t > 0.8 ? b.fx : t < 0.2 ? a.fx : [],
  }
}
/** Idle life: breathing, drift and the odd blink. Takes a held time, so it steps like drawings on twos. */
export const alive = (a: Acting, t: number, seed = 0): Acting => {
  const br = Math.sin(t * 2.4 + seed)
  const blink = (t * 0.37 + seed * 0.31) % 1 > 0.965
  const wave = a.right.shape === "open" && a.right.dy > 0.4 && a.left.dy < 0 ? Math.sin(t * 9) * 0.26 : 0
  return {
    ...a,
    stance: { ...a.stance, squash: a.stance.squash * (1 + br * 0.012), lean: a.stance.lean + Math.sin(t * 1.1 + seed) * 0.014, hop: a.stance.hop + (a.fx.includes("hop") ? Math.abs(Math.sin(t * 5)) * 0.07 : 0) },
    expr: blink && a.expr.shut === "" ? { ...a.expr, shut: "line" } : a.expr,
    left: { ...a.left, dy: a.left.dy + br * 0.008 },
    right: { ...a.right, dy: a.right.dy + br * 0.008, rot: a.right.rot + wave, dx: a.right.dx + wave * 0.06 },
    pop: a.pop + (a.fx.includes("steam") ? Math.abs(Math.sin(t * 13)) * 0.25 : 0),
  }
}
