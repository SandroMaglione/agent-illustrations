/**
 * Turns simple solids (lathes, boxes, tubes) plus a face and hands into a
 * display list. Solids are posed in 3D so a figure can turn, but the output is
 * only 2D outlines, planes and lines: what someone would actually draw.
 */
import { area, bezier, circle, clamp, hull, lerp, mix2, normals, spline, TAU, tube } from "./geo.ts"
import type { P2, P3 } from "./geo.ts"
import type { Item, Mat, Palette, Role } from "./list.ts"

export type Stance = {
  yaw: number; pitch: number; lean: number; squash: number; bend: number; hop: number
}
export type Expr = {
  open: number; angry: number; low: number; look: P2; pupil: number
  shut: "" | "arc" | "line" | "squeeze"; winkR: boolean
  brow: number; browTilt: number; browBend: number; browSkew: number
  mouth: number; smile: number; skew: number; round: number; teeth: number; tongue: number; wave: number
  cheeks: number
}
export type HandShape = "open" | "relaxed" | "fist" | "point" | "thumb"
export type Arm = { dx: number; dy: number; rot: number; bend: number; shape: HandShape; behind?: boolean }
export type Acting = {
  stance: Stance; expr: Expr; left: Arm; right: Arm
  /** Character-specific acting channel: lid pop, antenna droop, flower bloom. */
  pop: number
  fx: ReadonlyArray<"steam" | "sweat" | "spark" | "notes" | "puzzle" | "hop">
}

export type Surf = (u: number, v: number) => { p: P2; vis: boolean }
type Group = { z: number; seq: number; items: Array<Item> }

const orient = (p: ReadonlyArray<P2>): 1 | -1 => (area(p) > 0 ? 1 : -1)

export class Fig {
  readonly groups: Array<Group> = []
  readonly guides: Array<Item> = []
  readonly shadows: Array<{ c: P2; rx: number; ry: number; a: number }> = []
  private seq = 0
  readonly id: string
  readonly at: P2
  readonly S: number
  readonly st: Stance
  readonly palette: Palette
  readonly base: number
  /** Line weight of the whole object: background things are drawn lighter. */
  readonly lw: number
  constructor(o: { id: string; at: P2; S: number; st: Stance; palette: Palette; base: number; lw?: number }) {
    this.id = o.id; this.at = o.at; this.S = o.S; this.st = o.st; this.palette = o.palette; this.base = o.base; this.lw = o.lw ?? 1
  }

  group(z: number): Array<Item> {
    const g: Group = { z, seq: this.seq++, items: [] }
    this.groups.push(g)
    return g.items
  }
  /** Ground space: no body deformation. */
  ground(p: P3): P3 {
    const { yaw, pitch } = this.st
    const x = p[0] * Math.cos(yaw) + p[2] * Math.sin(yaw)
    const z = -p[0] * Math.sin(yaw) + p[2] * Math.cos(yaw)
    return [x, p[1] * Math.cos(pitch) - z * Math.sin(pitch), p[1] * Math.sin(pitch) + z * Math.cos(pitch)]
  }
  /** Body space: squash, bend and lean about the hips, then the camera. */
  body(p: P3): P3 {
    const { yaw, pitch, lean, squash, bend, hop } = this.st
    const sy = squash
    const sx = 1 / Math.sqrt(squash)
    const px = p[0] * sx, py = p[1] * sy, pz = p[2] * sx
    let x = px * Math.cos(yaw) + pz * Math.sin(yaw)
    const z = -px * Math.sin(yaw) + pz * Math.cos(yaw)
    x += bend * py * py
    const lx = x * Math.cos(lean) + py * Math.sin(lean)
    const ly = -x * Math.sin(lean) + py * Math.cos(lean) + this.base + hop
    return [lx, ly * Math.cos(pitch) - z * Math.sin(pitch), ly * Math.sin(pitch) + z * Math.cos(pitch)]
  }
  px(v: P3): P2 {
    const f = 1 / (1 - v[2] * 0.07)
    return [this.at[0] + v[0] * f * this.S, this.at[1] - v[1] * f * this.S]
  }
  b(p: P3): P2 { return this.px(this.body(p)) }
  g(p: P3): P2 { return this.px(this.ground(p)) }

  shape(to: Array<Item>, id: string, poly: ReadonlyArray<P2>, mat: Mat, extra: { shade?: number; clip?: ReadonlyArray<P2> } = {}): void {
    to.push({ k: "shape", id: `${this.id}.${id}`, poly, mat, pal: this.palette, ...extra })
  }
  line(to: Array<Item>, id: string, pts: ReadonlyArray<P2>, role: Role, extra: { closed?: boolean; side?: -1 | 0 | 1; clip?: ReadonlyArray<P2>; w?: number; dashed?: boolean } = {}): void {
    if (pts.length > 1) to.push({ k: "line", id: `${this.id}.${id}`, pts, role, ...extra, w: (extra.w ?? 1) * this.lw })
  }
  closed(to: Array<Item>, id: string, poly: ReadonlyArray<P2>, role: Role, extra: { clip?: ReadonlyArray<P2>; w?: number } = {}): void {
    this.line(to, id, poly, role, { closed: true, side: orient(poly), ...extra })
  }
  tone(to: Array<Item>, id: string, poly: ReadonlyArray<P2>, clip: ReadonlyArray<P2>, level: number, angle: number, mat: Mat): void {
    to.push({ k: "tone", id: `${this.id}.${id}`, poly, clip, level, angle, mat, pal: this.palette })
  }
  guide(id: string, pts: ReadonlyArray<P2>, over = 0.12): void {
    const n = pts.length
    const ext = (a: P2, b: P2): P2 => {
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
      const k = (over * this.S) / d
      return [b[0] + (b[0] - a[0]) * k, b[1] + (b[1] - a[1]) * k]
    }
    const out = over > 0 ? [ext(pts[1]!, pts[0]!), ...pts.slice(1, n - 1), ext(pts[n - 2]!, pts[n - 1]!)] : pts
    this.guides.push({ k: "guide", id: `${this.id}.${id}`, pts: out })
  }

  /* ---------------- lathe ---------------- */
  lathe(id: string, profile: ReadonlyArray<P2>, o: {
    mat: Mat; z?: number; offset?: P3; tilt?: number; tone?: number; toneFrom?: number; footTone?: number
    rings?: ReadonlyArray<{ y: number; role: Role; mat?: Mat; to?: number }>; role?: Role; guides?: boolean; topOpen?: boolean; raw?: boolean
  }): { items: Array<Item>; surf: Surf; outline: Array<P2>; radius: (y: number) => number } {
    const prof = o.raw ? [...profile] : spline(profile, 6)
    const off = o.offset ?? [0, 0, 0]
    const tilt = o.tilt ?? 0
    const loc = (r: number, a: number, y: number): P3 => {
      const x = Math.sin(a) * r
      const x2 = x * Math.cos(tilt) + y * Math.sin(tilt)
      const y2 = -x * Math.sin(tilt) + y * Math.cos(tilt)
      return [off[0] + x2, off[1] + y2, off[2] + Math.cos(a) * r]
    }
    const { yaw, pitch } = this.st
    const ring = (r: number, y: number, a0 = 0, a1 = TAU, n = 40): Array<P2> =>
      Array.from({ length: n + 1 }, (_, i) => this.b(loc(r, lerp(a0, a1, i / n) - yaw, y)))
    const pts: Array<P2> = []
    for (const [r, y] of prof) pts.push(...ring(Math.max(0, r), y))
    const outline = hull(pts)
    const centre = this.body(loc(0, 0, (prof[0]![1] + prof[prof.length - 1]![1]) / 2))
    const items = this.group(o.z ?? centre[2])
    const radius = (y: number): number => {
      for (let i = 1; i < prof.length; i++) {
        const [r0, y0] = prof[i - 1]!
        const [r1, y1] = prof[i]!
        if (y >= Math.min(y0, y1) - 1e-6 && y <= Math.max(y0, y1) + 1e-6) return lerp(r0, r1, Math.abs(y1 - y0) < 1e-9 ? 0 : (y - y0) / (y1 - y0))
      }
      return y < prof[0]![1] ? prof[0]![0] : prof[prof.length - 1]![0]
    }
    this.shape(items, id, outline, o.mat)
    if (o.footTone) {
      const y0 = prof[0]![1]
      const y1 = prof[prof.length - 1]![1]
      const yb = lerp(y0, y1, o.footTone)
      const lo = ring(radius(y0), y0, -Math.PI / 2, Math.PI / 2)
      const hi = ring(radius(yb), yb, -Math.PI / 2.2, Math.PI / 2).reverse()
      this.tone(items, `${id}.foot`, [...lo, ...hi], outline, 0.45, -0.16, o.mat)
    }
    for (const r of o.rings ?? []) {
      if (r.mat !== undefined && r.to !== undefined) {
        const lo = ring(radius(r.y), r.y, -Math.PI / 2, Math.PI / 2)
        const hi = ring(radius(r.to), r.to, -Math.PI / 2, Math.PI / 2).reverse()
        this.shape(items, `${id}.band${r.y}`, [...lo, ...hi], r.mat, { clip: outline })
        this.line(items, `${id}.ringb${r.to}`, [...hi].reverse(), r.role)
      }
      this.line(items, `${id}.ring${r.y}`, ring(radius(r.y), r.y, -Math.PI / 2, Math.PI / 2), r.role)
    }
    if (o.tone) {
      const from = o.toneFrom ?? 0.95
      const edge: Array<P2> = []
      const core: Array<P2> = []
      for (const [r, y] of prof) {
        edge.push(this.b(loc(r * 1.04, Math.PI / 2 + 0.12 - yaw, y)))
        core.push(this.b(loc(r, from - yaw, y)))
      }
      this.tone(items, `${id}.core`, [...edge, ...core.reverse()], outline, o.tone, -0.95, o.mat)
    }
    this.closed(items, `${id}.out`, outline, o.role ?? "outline")
    if (o.guides) {
      const yT = prof[prof.length - 1]![1]
      const yB = prof[0]![1]
      this.guide(`${id}.axis`, [this.b(loc(0, 0, yB - 0.1)), this.b(loc(0, 0, yT + 0.35))], 0.14)
      const wide = prof.reduce((m, p) => (p[0] > m[0] ? p : m))
      this.guide(`${id}.belly`, ring(wide[0], wide[1], 0, TAU + 0.3, 44), 0.02)
      this.guide(`${id}.foot`, ring(radius(yB), yB, 0.2, TAU), 0.02)
      this.guide(`${id}.top`, ring(radius(yT), yT, 0.2, TAU), 0.03)
      this.guide(`${id}.mer`, prof.filter((_, i) => i % 2 === 0).map(([r, y]) => this.b(loc(r, 0, y))), 0.1)
      const bb = { x: wide[0] * 1.02 }
      for (const sx of [-1, 1]) this.guide(`${id}.plumb${sx}`, [this.b(loc(bb.x, (sx * Math.PI) / 2 - yaw, yB)), this.b(loc(bb.x, (sx * Math.PI) / 2 - yaw, yT))], 0.2)
    }
    const surf: Surf = (u, v) => {
      const r = radius(v)
      const rr = Math.max(0.001, r)
      const a = u / Math.max(0.35, rr)
      const nz = Math.cos(a + yaw) * Math.cos(pitch)
      return { p: this.b(loc(rr, a, v)), vis: nz > 0.12 }
    }
    return { items, surf, outline, radius }
  }

  /* ---------------- rounded box ---------------- */
  box(id: string, o: { w: number; h: number; d: number; r: number; mat: Mat; side?: Mat; y?: number; x?: number; zc?: number; z?: number; guides?: boolean; footTone?: number; role?: Role }): { items: Array<Item>; surf: Surf; outline: Array<P2>; front: Array<P2> } {
    const y0 = o.y ?? 0
    const x0 = o.x ?? 0
    const zc = o.zc ?? 0
    const rr = (inset: number, zz: number, n = 7): Array<P3> => {
      const out: Array<P3> = []
      const hw = o.w / 2 - inset
      const r = Math.max(0.01, o.r - inset)
      const top = y0 + o.h - inset
      const bot = y0 + inset
      const corner = (cx: number, cy: number, a0: number): void => {
        for (let i = 0; i <= n; i++) {
          const a = a0 + ((Math.PI / 2) * i) / n
          out.push([x0 + cx + Math.cos(a) * r, cy + Math.sin(a) * r, zz])
        }
      }
      corner(hw - r, top - r, 0)
      corner(-hw + r, top - r, Math.PI / 2)
      corner(-hw + r, bot + r, Math.PI)
      corner(hw - r, bot + r, -Math.PI / 2)
      return out
    }
    const bev = Math.min(0.05, o.r * 0.4)
    const f3 = rr(0, zc + o.d / 2 - bev)
    const k3 = rr(0, zc - o.d / 2 + bev)
    const all = [...f3, ...k3, ...rr(bev * 0.7, zc + o.d / 2), ...rr(bev * 0.7, zc - o.d / 2)].map((p) => this.b(p))
    const outline = hull(all)
    const front = rr(bev * 0.6, zc + o.d / 2).map((p) => this.b(p))
    const items = this.group(o.z ?? this.body([x0, y0 + o.h / 2, zc])[2])
    this.shape(items, id, outline, o.side ?? o.mat, { shade: 0.5 })
    // Every plane that is not the front is in shade; the front is then laid over it.
    this.tone(items, `${id}.sides`, outline, outline, 0.85, -0.92, o.side ?? o.mat)
    this.shape(items, `${id}.front`, front, o.mat)
    if (o.footTone) {
      const fb = (u: number, v: number): P2 => this.b([x0 + u * o.w * 0.5, y0 + v * o.h, zc + o.d / 2])
      this.tone(items, `${id}.foot`, [fb(-0.9, 0.0), fb(1, 0.0), fb(1, o.footTone), fb(0.2, o.footTone * 0.6), fb(-0.9, o.footTone * 0.35)], front, 0.4, -0.14, o.mat)
    }
    // Inner front edge: only where it is not already the silhouette.
    const near = (p: P2): boolean => {
      let best = Infinity
      for (let i = 0; i < outline.length; i++) {
        const a = outline[i]!
        const b = outline[(i + 1) % outline.length]!
        const t = clamp(((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / ((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2 || 1))
        best = Math.min(best, Math.hypot(p[0] - lerp(a[0], b[0], t), p[1] - lerp(a[1], b[1], t)))
      }
      return best < this.S * 0.035
    }
    const dense: Array<P2> = []
    front.forEach((p, i) => { const q = front[(i + 1) % front.length]!; for (let k = 0; k < 8; k++) dense.push(mix2(p, q, k / 8)) })
    const keep = dense.map((p) => !near(p))
    const start = keep.findIndex((k, i) => k && !keep[(i - 1 + keep.length) % keep.length])
    if (start >= 0) {
      let run: Array<P2> = []
      let n = 0
      for (let i = 0; i <= keep.length; i++) {
        const j = (start + i) % keep.length
        if (i < keep.length && keep[j]) run.push(dense[j]!)
        else if (run.length > 3) { this.line(items, `${id}.edge${n++}`, run, "inner"); run = [] } else run = []
      }
    }
    this.closed(items, `${id}.out`, outline, o.role ?? "outline")
    if (o.guides) {
      const c = (sx: number, sy: number, sz: number): P2 => this.b([x0 + (sx * o.w) / 2, y0 + (sy + 1) * 0.5 * o.h, zc + (sz * o.d) / 2])
      for (const [i, [a, b]] of ([
        [[-1, -1, 1], [1, -1, 1]], [[-1, 1, 1], [1, 1, 1]], [[-1, 1, 1], [-1, -1, 1]], [[1, 1, 1], [1, -1, 1]],
        [[1, 1, 1], [1, 1, -1]], [[-1, 1, 1], [-1, 1, -1]], [[1, -1, 1], [1, -1, -1]], [[-1, -1, 1], [-1, -1, -1]],
        [[-1, -1, -1], [1, -1, -1]], [[1, -1, -1], [1, 1, -1]],
      ] as ReadonlyArray<readonly [P3, P3]>).entries()) this.guide(`${id}.g${i}`, [c(...a), c(...b)], 0.07 + (i % 3) * 0.04)
      this.guide(`${id}.axis`, [this.b([x0, y0 - 0.25, zc]), this.b([x0, y0 + o.h + 0.3, zc])], 0.1)
      this.guide(`${id}.cross`, [c(-1.15, 0.2, 1), c(1.15, 0.2, 1)], 0.05)
    }
    const surf: Surf = (u, v) => ({ p: this.b([x0 + u, v, zc + o.d / 2 + 0.005]), vis: Math.cos(this.st.yaw) > 0.05 })
    return { items, surf, outline, front }
  }

  /* ---------------- tubes: limbs, spouts, handles ---------------- */
  hose(id: string, mid: ReadonlyArray<P2>, r: (t: number) => number, mat: Mat, z: number, o: { cap?: boolean | "both"; role?: Role; tone?: number; w?: number } = {}): Array<Item> {
    const items = this.group(z)
    const R = (t: number): number => r(t) * this.S
    const { poly, run } = tube(mid, R, o.cap ?? false)
    this.shape(items, id, poly, mat)
    if (o.tone) {
      // shade whichever half faces the lower right
      const ns = normals(mid)
      const n = mid.length - 1
      const s = ns.reduce((v, q) => v + q[0] * 0.56 + q[1] * 0.83, 0) >= 0 ? 1 : -1
      const strip = (k: number): Array<P2> => mid.map((p, i) => {
        const q = ns[i]!
        return [p[0] + q[0] * s * R(i / n) * k, p[1] + q[1] * s * R(i / n) * k] as const
      })
      const half = [...strip(1.05), ...strip(0.08).reverse()]
      this.tone(items, `${id}.tone`, half, poly, o.tone, -0.9, mat)
    }
    if (o.cap === "both") this.closed(items, `${id}.out`, poly, o.role ?? "outline", o.w === undefined ? {} : { w: o.w })
    else if (o.cap) this.line(items, `${id}.out`, run, o.role ?? "outline", { side: 1, ...(o.w === undefined ? {} : { w: o.w }) })
    else {
      const n = mid.length
      this.line(items, `${id}.l`, poly.slice(0, n), o.role ?? "outline", { side: 1, ...(o.w === undefined ? {} : { w: o.w }) })
      this.line(items, `${id}.r`, poly.slice(n), o.role ?? "outline", { side: 1, ...(o.w === undefined ? {} : { w: o.w }) })
    }
    return items
  }

  /* ---------------- arm + gloved hand ---------------- */
  arm(id: string, side: -1 | 1, shoulder: P3, a: Arm, o: { r?: number; hand?: number; z?: number; mat?: Mat; stub?: boolean; length?: number } = {}): void {
    const s0v = this.body(shoulder)
    const s0 = this.px(s0v)
    const wrist: P2 = [s0[0] + side * a.dx * this.S, s0[1] - a.dy * this.S]
    const m = mix2(s0, wrist, 0.5)
    const dx = wrist[0] - s0[0]
    const dy = wrist[1] - s0[1]
    const L = Math.hypot(dx, dy) || 1
    const ctrl: P2 = [m[0] + (-dy / L) * a.bend * this.S * side, m[1] + (dx / L) * a.bend * this.S * side]
    const mid = o.stub ? spline([s0, [s0[0] + side * 0.3 * this.S, s0[1] - 0.0 * this.S], [s0[0] + side * (a.dx + 0.06) * this.S, s0[1] - 0.14 * this.S], wrist], 8) : bezier(s0, ctrl, wrist, 20)
    const z = (a.behind ? -1.2 : 1.1) + (o.z ?? 0) + side * Math.sin(-this.st.yaw) * 0.2
    const r = o.r ?? 0.052
    if (o.stub) {
      const items = this.hose(id, mid, (t) => r * (0.94 + 0.12 * Math.sin(t * Math.PI)), o.mat ?? "limb", z, { cap: true, tone: 0.5 })
      this.spines(items, `${id}.sp`, mid, r * 0.5)
    } else {
      const sock = this.group(z - 0.01)
      const ring = circle(s0, r * 1.55 * this.S, 22, r * 1.7 * this.S)
      this.shape(sock, `${id}.sock`, ring, "accent")
      this.tone(sock, `${id}.sock.t`, ring, ring, 0.8, -0.9, "accent")
      this.closed(sock, `${id}.sock.o`, ring, "inner")
      const arm = this.hose(id, mid, () => r, o.mat ?? "limb", z, { role: "inner", w: 1.15 })
      const a0 = Math.atan2(mid[1]![1] - s0[1], mid[1]![0] - s0[0]) + Math.PI / 2
      const capPts = Array.from({ length: 11 }, (_, i) => [s0[0] + Math.cos(a0 + (Math.PI * i) / 10) * r * this.S, s0[1] + Math.sin(a0 + (Math.PI * i) / 10) * r * this.S] as P2)
      this.shape(arm, `${id}.cap`, capPts, o.mat ?? "limb")
      this.line(arm, `${id}.cap.o`, capPts, "inner", { side: 1 })
      this.hand(`${id}.hand`, wrist, side * a.rot, (o.hand ?? 0.2) * this.S, a.shape, side, z + 0.05)
    }
    this.guide(`${id}.g`, [s0, mix2(ctrl, m, 0.35), wrist], 0.03)
    for (const [i, p] of [s0, mix2(ctrl, m, 0.35)].entries()) {
      const t = 0.035 * this.S
      this.guide(`${id}.t${i}`, [[p[0] - t, p[1] - t * 0.4], [p[0] + t, p[1] + t * 0.4]], 0)
    }
    if (!o.stub) {
      const c: P2 = [wrist[0] + side * Math.sin(side * a.rot * side) * 0.1 * this.S, wrist[1] - Math.cos(a.rot) * 0.1 * this.S]
      this.guide(`${id}.c`, circle(c, 0.21 * this.S, 26).concat([circle(c, 0.21 * this.S, 26)[0]!]), 0)
    }
  }
  spines(items: Array<Item>, id: string, mid: ReadonlyArray<P2>, spread: number): void {
    for (let i = 3; i < mid.length - 2; i += 5) {
      const p = mid[i]!
      const sx = (i % 2 ? 1 : -1) * spread * this.S * 0.6
      this.line(items, `${id}${i}`, [[p[0] + sx, p[1]], [p[0] + sx + 0.03 * this.S, p[1] - 0.045 * this.S]], "fine")
      this.line(items, `${id}${i}b`, [[p[0] + sx, p[1]], [p[0] + sx - 0.025 * this.S, p[1] - 0.04 * this.S]], "fine")
    }
  }

  hand(id: string, at: P2, rot: number, size: number, shape: HandShape, side: -1 | 1, z: number): void {
    const items = this.group(z)
    const c = Math.cos(rot)
    const s = Math.sin(rot)
    // local: wrist (0,0), fingers +y, thumb toward the body (-x for the right hand)
    const T = (x: number, y: number): P2 => {
      const X = -x * side * size
      const Y = y * size
      return [at[0] + X * c + Y * s, at[1] - (-X * s + Y * c)]
    }
    const path = (pts: ReadonlyArray<P2>, per = 6, closed = false): Array<P2> => spline(pts.map((p) => T(p[0], p[1])), per, closed)
    const flip = side === 1
    const finger = (n: string, pts: ReadonlyArray<P2>, r: number, knuckle = 0.45, w = 1): void => {
      const mid = path(pts, 6)
      const { poly, run } = tube(mid, (t) => r * size * (1 - 0.08 * t), true)
      this.shape(items, `${id}.${n}`, poly, "glove")
      this.line(items, `${id}.${n}.o`, run, "outline", { side: 1, w: 0.62 * w })
      if (knuckle > 0) {
        const k = mid[Math.floor(mid.length * knuckle)]!
        const k2 = mid[Math.floor(mid.length * knuckle) + 1] ?? k
        const dx = k2[0] - k[0], dy = k2[1] - k[1]
        const l = Math.hypot(dx, dy) || 1
        const h = r * size * 0.55
        this.line(items, `${id}.${n}.k`, [[k[0] - (dy / l) * h, k[1] + (dx / l) * h], [k[0] + (dx / l) * h * 0.2, k[1] + (dy / l) * h * 0.2], [k[0] + (dy / l) * h * 0.7, k[1] - (dx / l) * h * 0.7]], "fine")
      }
    }
    const capsule = (n: string, a: P2, b: P2, r: number): void => {
      const A = T(a[0], a[1])
      const B = T(b[0], b[1])
      const mid = Array.from({ length: 6 }, (_, i) => mix2(A, B, i / 5))
      const { poly, run } = tube(mid, () => r * size, true)
      this.shape(items, `${id}.${n}`, poly, "glove")
      this.line(items, `${id}.${n}.o`, run, "outline", { side: 1, w: 0.56 })
    }
    // cuff
    const cuff = path([[-0.36, 0.1], [-0.42, -0.04], [-0.34, -0.16], [0.34, -0.16], [0.42, -0.04], [0.36, 0.1], [0, 0.05]], 5, true)
    this.shape(items, `${id}.cuff`, cuff, "glove")
    this.closed(items, `${id}.cuff.o`, cuff, "outline", { w: 0.7 })
    const palmPts: ReadonlyArray<P2> = shape === "thumb"
      ? [[-0.42, 0.02], [-0.5, 0.5], [-0.42, 0.95], [0.0, 1.02], [0.42, 0.9], [0.46, 0.45], [0.36, 0.02]]
      : shape === "relaxed"
        ? [[-0.34, 0.0], [-0.44, 0.45], [-0.36, 0.95], [0, 1.0], [0.38, 0.9], [0.44, 0.4], [0.32, 0.0]]
        : [[-0.34, 0.0], [-0.5, 0.42], [-0.5, 0.9], [0, 1.04], [0.48, 0.88], [0.5, 0.4], [0.34, 0.0]]
    const palm = path(palmPts, 6)
    const drawPalm = (): void => {
      this.shape(items, `${id}.palm`, palm, "glove")
      this.line(items, `${id}.palm.o`, palm, "outline", { side: flip ? -1 : 1, w: 0.7 })
      const lo = [T(-0.3, 0.02), T(0.3, 0.02), T(0.4, 0.3), T(0.1, 0.18), T(-0.35, 0.22)]
      this.tone(items, `${id}.palm.t`, lo, palm, 0.35, -0.7, "glove")
    }
    const drawPalmOver = (): void => {
      // Fill the palm over the finger roots, but leave the knuckle side unlined.
      this.shape(items, `${id}.palm`, palm, "glove")
      const n = palm.length
      const a = palm.slice(0, Math.floor(n * 0.38))
      const b = palm.slice(Math.floor(n * 0.62))
      this.line(items, `${id}.palm.a`, a, "outline", { side: flip ? -1 : 1, w: 0.72 })
      this.line(items, `${id}.palm.b`, b, "outline", { side: flip ? -1 : 1, w: 0.78 })
      const lo = [T(-0.36, 0.0), T(0.3, 0.0), T(0.3, 0.2), T(-0.1, 0.22), T(-0.42, 0.5)]
      this.tone(items, `${id}.palm.t`, lo, palm, 0.35, -0.7, "glove")
      for (const [i, x] of [-0.18, 0.18].entries()) this.line(items, `${id}.web${i}`, [T(x, 1.0), T(x * 0.85, 0.82)], "detail", { w: 0.9 })
    }
    if (shape === "open") {
      finger("f0", [[-0.36, 0.72], [-0.52, 1.1], [-0.66, 1.5]], 0.19)
      finger("f2", [[0.34, 0.74], [0.46, 1.15], [0.52, 1.56]], 0.19)
      finger("f1", [[0.0, 0.8], [-0.04, 1.25], [-0.06, 1.74]], 0.2)
      drawPalmOver()
      finger("th", [[0.26, 0.3], [0.66, 0.5], [0.98, 0.88]], 0.19, 0.55)
      this.line(items, `${id}.l1`, path([[-0.3, 0.66], [0, 0.56], [0.28, 0.64]], 5), "fine")
      this.line(items, `${id}.l2`, path([[0.1, 0.22], [0.0, 0.42], [0.16, 0.56]], 5), "fine")
    } else if (shape === "relaxed") {
      finger("f0", [[-0.28, 0.75], [-0.34, 1.15], [-0.2, 1.48]], 0.19, 0.5)
      finger("f1", [[-0.02, 0.8], [-0.04, 1.25], [0.06, 1.56]], 0.19, 0.5)
      finger("f2", [[0.24, 0.75], [0.28, 1.15], [0.3, 1.46]], 0.19, 0.5)
      drawPalmOver()
      finger("th", [[0.2, 0.28], [0.44, 0.62], [0.42, 1.1]], 0.19, 0.6)
    } else if (shape === "fist" || shape === "point") {
      if (shape === "point") finger("ix", [[0.32, 0.7], [0.34, 1.2], [0.34, 1.75]], 0.19, 0.5)
      drawPalm()
      capsule("f0", [-0.36, 0.95], [-0.34, 0.52], 0.17)
      capsule("f1", [-0.02, 1.02], [-0.02, 0.54], 0.18)
      if (shape === "fist") capsule("f2", [0.32, 0.95], [0.31, 0.54], 0.17)
      finger("th", [[0.52, 0.12], [0.32, 0.34], [-0.12, 0.4]], 0.18, 0.55)
    } else {
      finger("th", [[0.3, 0.6], [0.34, 1.1], [0.3, 1.62]], 0.21, 0.55, 1.1)
      drawPalm()
      capsule("f0", [0.36, 0.84], [-0.26, 0.86], 0.15)
      capsule("f1", [0.4, 0.56], [-0.3, 0.57], 0.155)
      capsule("f2", [0.36, 0.28], [-0.26, 0.28], 0.145)
    }
  }

  /* ---------------- leg + boot ---------------- */
  leg(id: string, side: -1 | 1, hip: P3, foot: P3, o: { r?: number } = {}): void {
    const h = this.b(hip)
    const lift: P3 = [foot[0], foot[1] + 0.14, foot[2]]
    const k = this.g(lift)
    const mid = spline([h, [lerp(h[0], k[0], 0.5) + side * 0.02 * this.S, lerp(h[1], k[1], 0.5)], k], 8)
    const z = this.ground(foot)[2] * 0.3 - 0.75
    this.hose(id, mid, () => o.r ?? 0.05, "limb", z - 0.05, { role: "inner" })
    const items = this.group(z)
    const toe: P3 = [foot[0] + side * 0.09, foot[1] + 0.075, foot[2] + 0.2]
    const R = this.S
    const heel = this.g([foot[0], foot[1] + 0.085, foot[2]])
    const t = this.g(toe)
    const poly = hull([...circle(heel, 0.095 * R, 24, 0.09 * R), ...circle(t, 0.135 * R, 28, 0.1 * R), ...circle(k, 0.07 * R, 16)])
    this.shape(items, `${id}.boot`, poly, "accent")
    const b = poly.reduce((m, p) => Math.max(m, p[1]), -Infinity)
    const sole = poly.filter((p) => p[1] > b - 0.055 * R)
    if (sole.length > 3) this.tone(items, `${id}.boot.t`, hull([...circle(heel, 0.095 * R, 20, 0.09 * R), ...circle(t, 0.135 * R, 20, 0.1 * R)].filter((p) => p[1] > b - 0.1 * R)), poly, 0.7, -0.5, "accent")
    this.closed(items, `${id}.boot.o`, poly, "outline", { w: 0.85 })
    this.line(items, `${id}.boot.s`, [[heel[0] - 0.07 * R, b - 0.045 * R], [(heel[0] + t[0]) / 2, b - 0.033 * R], [t[0] + 0.1 * R, b - 0.045 * R]], "detail")
    this.guide(`${id}.g`, [h, k, heel], 0.02)
  }

  /* ---------------- face ---------------- */
  face(items: Array<Item>, surf: Surf, e: Expr, o: { x?: number; y: number; k: number; gap?: number; mouthY?: number; mouthW?: number; eyeW?: number; eyeH?: number; browY?: number; nose?: boolean }): void {
    const k = o.k
    const x0 = o.x ?? 0
    const M = (x: number, y: number): P2 => surf(x0 + x * k, o.y + y * k).p
    const vis = (x: number, y: number): boolean => surf(x0 + x * k, o.y + y * k).vis
    const gap = o.gap ?? 0.5
    const W = o.eyeW ?? 0.27
    const H = o.eyeH ?? 0.36
    for (const side of [-1, 1] as const) {
      const n = side < 0 ? "L" : "R"
      const cx = side * gap
      if (!vis(cx, 0)) continue
      const shut = e.shut !== "" || (e.winkR && side === 1)
      const style = e.winkR && e.shut === "" ? "arc" : e.shut
      if (shut) {
        if (style === "squeeze") {
          this.line(items, `eye${n}.a`, [M(cx - side * W, 0.2), M(cx + side * -W * 0.1, 0.1), M(cx - side * -W * 0.8, -0.02)].map((p) => p), "outline", { w: 0.8 })
          this.line(items, `eye${n}.b`, [M(cx - side * -W * 0.85, -0.02), M(cx, -0.1), M(cx - side * W, -0.2)], "outline", { w: 0.8 })
        } else {
          const up = style === "arc" ? 1 : style === "line" ? -0.35 : 0.3
          const arc = Array.from({ length: 15 }, (_, i) => { const t = i / 7 - 1; return M(cx + t * W * 1.05, up * 0.22 * (1 - t * t) - 0.06) })
          this.line(items, `eye${n}.arc`, arc, "outline", { w: 0.95 })
          if (style !== "arc") for (const t of [-0.7, 0, 0.7]) this.line(items, `eye${n}.lash${t}`, [M(cx + t * W, up * 0.22 * (1 - t * t) - 0.08), M(cx + t * W * 1.25, up * 0.22 - 0.15)], "detail")
        }
      } else {
        const lidY = -H + 2 * H * e.open
        const yU = (x: number): number => lidY + e.angry * side * x * 1.1 + 0.1 * H * (1 - (x / W) ** 2)
        const yL = (x: number): number => -H + e.low * H * (1.15 - 0.6 * (x / W) ** 2)
        const N = 48
        const pts: Array<P2> = Array.from({ length: N }, (_, i) => {
          const a = (i / N) * TAU
          const c = Math.cos(a), s = Math.sin(a)
          const x = W * Math.sign(c) * Math.abs(c) ** 0.82
          const y = H * Math.sign(s) * Math.abs(s) ** 0.82
          return [x, Math.max(Math.min(y, yU(x)), Math.min(yL(x), yU(x) - 0.02))] as const
        })
        const poly = pts.map(([x, y]) => M(cx + x, y))
        this.shape(items, `eye${n}`, poly, "white")
        const ix = clamp(e.look[0], -1, 1) * W * 0.5
        const iy = clamp(e.look[1], -1, 1) * H * 0.48
        const el = (r: number, ox = 0, oy = 0): Array<P2> => Array.from({ length: 26 }, (_, i) => M(cx + ix + ox + Math.cos((i / 26) * TAU) * r, iy + oy + Math.sin((i / 26) * TAU) * r * 1.16))
        const ir = W * 0.62 * e.pupil
        this.shape(items, `eye${n}.iris`, el(ir), "eye", { clip: poly, shade: 0.5 })
        this.tone(items, `eye${n}.iris.t`, el(ir), poly, 1.1, -0.85, "eye")
        this.closed(items, `eye${n}.iris.o`, el(ir), "inner", { clip: poly, w: 0.9 })
        this.shape(items, `eye${n}.pupil`, el(ir * 0.55), "dark", { clip: poly })
        this.shape(items, `eye${n}.glint`, el(ir * 0.27, -ir * 0.3, ir * 0.36), "white", { clip: poly })
        const upper = [...pts.slice(0, N / 2 + 1)].map(([x, y]) => M(cx + x, y))
        const lower = [...pts.slice(N / 2), pts[0]!].map(([x, y]) => M(cx + x, y))
        this.line(items, `eye${n}.low`, lower, "inner", { w: 0.8 })
        this.line(items, `eye${n}.up`, upper, "outline", { w: 0.92 })
        if (e.open < 0.86) this.line(items, `eye${n}.fold`, [-0.8, -0.3, 0.3, 0.8].map((t) => M(cx + t * W, Math.min(H * 1.05, yU(t * W) + 0.1 - 0.05 * t * t))), "fine")
        if (e.low > 0.25) this.line(items, `eye${n}.bag`, [-0.6, 0, 0.6].map((t) => M(cx + t * W, -H - 0.02 - 0.06 * (1 - t * t))), "fine")
      }
      // brow
      const bx = cx * 1.02
      const by = (o.browY ?? H + 0.2) + e.brow * 0.15 + e.browSkew * side * 0.14
      const ctrl: Array<P2> = [-1, -0.5, 0, 0.5, 1].map((t) => [bx + t * 0.27, by + e.browTilt * side * t * 0.2 + e.browBend * 0.16 * (1 - t * t)] as const)
      if (vis(bx + side * 0.2, by)) {
        const mid = spline(ctrl.map((p) => M(p[0], p[1])), 5)
        const th = 0.062 * k * this.S
        const { poly } = tube(mid, (t) => th * (0.8 + 0.35 * Math.sin(Math.PI * clamp(t * 0.9 + 0.1))), "both")
        this.shape(items, `brow${n}`, poly, "dark", { shade: 0.9 })
        this.tone(items, `brow${n}.t`, poly, poly, 1.6, -1.1, "dark")
        this.closed(items, `brow${n}.o`, poly, "inner", { w: 0.9 })
      }
    }
    if (e.cheeks > 0) for (const side of [-1, 1]) {
      const cx = side * (gap + 0.22)
      if (!vis(cx, -H - 0.15)) continue
      const poly = Array.from({ length: 24 }, (_, i) => M(cx + Math.cos((i / 24) * TAU) * 0.17, -H - 0.14 + Math.sin((i / 24) * TAU) * 0.1))
      this.tone(items, `cheek${side}`, poly, poly, 0.55 * e.cheeks, -1.0, "cheek")
    }
    // mouth
    const my = o.mouthY ?? -0.72
    const mw = (o.mouthW ?? 0.42) * (1 - 0.55 * e.round)
    const up = (t: number): number => my + e.smile * 0.2 * (t * t - 0.4) + e.skew * t * 0.12 + e.wave * 0.06 * Math.sin(t * 7)
    const ts = Array.from({ length: 21 }, (_, i) => i / 10 - 1)
    if (e.mouth < 0.06) {
      this.line(items, "mouth", ts.map((t) => M(t * mw, up(t))), "outline", { w: 0.82 })
      if (e.smile !== 0) for (const s of [-1, 1]) this.line(items, `mouth.c${s}`, [M(s * (mw + 0.0), up(s) + 0.06), M(s * (mw + 0.05), up(s)), M(s * (mw + 0.015), up(s) - 0.05)], "detail")
    } else {
      const depth = e.mouth * 0.44
      const lo = (t: number): number => up(t) - depth * Math.max(0, 1 - Math.abs(t) ** (2.2 + e.round * 0.2)) ** (0.62)
      const top = ts.map((t) => M(t * mw, up(t) + (e.round > 0.4 ? depth * 0.5 * Math.sqrt(Math.max(0, 1 - t * t)) : 0)))
      const bot = [...ts].reverse().map((t) => M(t * mw, lo(t)))
      const poly = [...top, ...bot]
      this.shape(items, "mouth.in", poly, "mouth")
      if (e.tongue > 0) {
        const tc = Array.from({ length: 24 }, (_, i) => M(0.08 * mw + Math.cos((i / 24) * TAU) * mw * 0.55, my - depth * 1.02 + e.smile * -0.08 + Math.sin((i / 24) * TAU) * depth * 0.46 * e.tongue))
        this.shape(items, "mouth.tongue", tc, "tongue", { clip: poly })
        this.closed(items, "mouth.tongue.o", tc, "detail", { clip: poly })
      }
      if (e.teeth > 0 && e.round < 0.5) {
        const te = [...top, ...[...ts].reverse().map((t) => M(t * mw, up(t) - depth * 0.28 * e.teeth))]
        this.shape(items, "mouth.teeth", te, "white", { clip: poly })
        if (e.teeth > 1.4) for (const t of [-0.6, -0.3, 0, 0.3, 0.6]) this.line(items, `mouth.tooth${t}`, [M(t * mw, up(t)), M(t * mw, up(t) - depth * 0.28 * e.teeth)], "fine", { clip: poly })
        this.line(items, "mouth.teeth.l", ts.map((t) => M(t * mw, up(t) - depth * 0.28 * e.teeth)), "detail", { clip: poly })
      }
      this.closed(items, "mouth.o", poly, "outline", { w: 0.8 })
    }
  }

  emit(): Array<Item> {
    return [...this.groups].sort((a, b) => a.z - b.z || a.seq - b.seq).flatMap((g) => g.items)
  }
}
