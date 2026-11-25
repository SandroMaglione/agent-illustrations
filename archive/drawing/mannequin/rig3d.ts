/**
 * Stage 1 foundation: 3D articulated anime skeleton, sculpted 3D anime head + facial landmarks,
 * perspective camera projection, and anatomical proportion gate.
 */
import { add, ball, cross, dot, join, len, loft, mul, panel, skin, smooth, strip, sub, torus, tube, unit } from "../../src/form/mesh.ts"
import type { Mesh, Part, V3 } from "../../src/form/mesh.ts"

export type Mat3 = readonly [V3, V3, V3]
export type Xform = { o: V3; r: Mat3 }

const deg = (d: number): number => (d * Math.PI) / 180
export const rotX = (a: number): Mat3 => { const c = Math.cos(a), s = Math.sin(a); return [[1, 0, 0], [0, c, -s], [0, s, c]] }
export const rotY = (a: number): Mat3 => { const c = Math.cos(a), s = Math.sin(a); return [[c, 0, s], [0, 1, 0], [-s, 0, c]] }
export const rotZ = (a: number): Mat3 => { const c = Math.cos(a), s = Math.sin(a); return [[c, -s, 0], [s, c, 0], [0, 0, 1]] }
export const mulM = (a: Mat3, b: Mat3): Mat3 => {
  const col = (j: number): V3 => [b[0][j]!, b[1][j]!, b[2][j]!]
  return [
    [dot(a[0], col(0)), dot(a[0], col(1)), dot(a[0], col(2))],
    [dot(a[1], col(0)), dot(a[1], col(1)), dot(a[1], col(2))],
    [dot(a[2], col(0)), dot(a[2], col(1)), dot(a[2], col(2))],
  ]
}
export const mulMV = (m: Mat3, v: V3): V3 => [dot(m[0], v), dot(m[1], v), dot(m[2], v)]
/** Euler degrees: yaw (Y), pitch (X), roll (Z). Right-handed: x right, y down, z toward camera. */
export const euler = (yawDeg: number, pitchDeg: number, rollDeg: number): Mat3 =>
  mulM(rotZ(deg(rollDeg)), mulM(rotX(deg(pitchDeg)), rotY(deg(yawDeg))))

export const ID_M: Mat3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
export const xform = (parent: Xform, offset: V3, rot: Mat3 = ID_M): Xform => ({
  o: add(parent.o, mulMV(parent.r, offset)),
  r: mulM(parent.r, rot),
})
export const toWorld = (xf: Xform, p: V3): V3 => add(xf.o, mulMV(xf.r, p))
export const moveMesh = (m: Mesh, xf: Xform): Mesh => ({ v: m.v.map((p) => toWorld(xf, p)), f: m.f })

/** Build an orthonormal frame at origin `o` with local +Y along `yAxis` and local +Z aligned near `zHint`. */
export const frameFromYZ = (o: V3, yAxis: V3, zHint: V3): Xform => {
  const y = unit(yAxis)
  let x = cross(y, zHint)
  if (len(x) < 1e-4) x = cross(y, [1, 0, 0])
  x = unit(x)
  const z = unit(cross(x, y))
  // columns are x, y, z => rows of Mat3 are [x0,y0,z0], [x1,y1,z1], [x2,y2,z2]
  return { o, r: [[x[0], y[0], z[0]], [x[1], y[1], z[1]], [x[2], y[2], z[2]]] }
}

/**
 * Analytic 2-bone 3D IK solver: given shoulder position, target wrist position, pole direction (where elbow points),
 * upper arm length L1 and forearm length L2, returns exact 3D elbow & clamped wrist positions + bone frames.
 */
export function solveIK2(
  shoulder: V3,
  target: V3,
  poleHint: V3,
  L1: number,
  L2: number
): { elbow: V3; wrist: V3; upper: Xform; lower: Xform; reachPct: number } {
  const toT = sub(target, shoulder)
  const rawD = len(toT)
  const maxD = (L1 + L2) * 0.992
  const minD = Math.abs(L1 - L2) + 1e-3
  const d = Math.max(minD, Math.min(maxD, rawD))
  const dir = unit(toT)
  const wrist = add(shoulder, mul(dir, d))
  // Law of cosines for elbow offset
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d)
  const h = Math.sqrt(Math.max(0, L1 * L1 - a * a))
  // Pole perpendicular to dir
  let perp = sub(poleHint, mul(dir, dot(poleHint, dir)))
  if (len(perp) < 1e-4) perp = cross(dir, [0, 0, 1])
  perp = unit(perp)
  const elbow = add(add(shoulder, mul(dir, a)), mul(perp, h))
  const upper = frameFromYZ(shoulder, sub(elbow, shoulder), perp)
  const lower = frameFromYZ(elbow, sub(wrist, elbow), perp)
  return { elbow, wrist, upper, lower, reachPct: (rawD / (L1 + L2)) * 100 }
}

export type Camera = {
  w: number; h: number
  cx: number; cy: number
  focal: number // px (e.g. 2400 = ~65mm portrait, 1500 = dynamic manga perspective)
  camZ: number  // distance of camera along +Z from origin
}
export const project = (cam: Camera, p: V3): readonly [number, number, number, number] => {
  const dz = Math.max(100, cam.camZ - p[2])
  const s = cam.focal / dz
  return [cam.cx + p[0] * s, cam.cy + p[1] * s, p[2], s]
}
export const projectV3 = (cam: Camera, p: V3): V3 => {
  const [x, y, z] = project(cam, p)
  return [x, y, z]
}

/**
 * Sculpted 3D anime female head in head-units (H = 1.0 from crown y=-0.50 to chin y=+0.50).
 * Local axes: x right, y down, z forward (toward nose).
 * Designed with genuine anime facial geometry: rounded cranium, flattened cheek planes,
 * subtle zygomatic curve on 3/4 view, and crisp V-tapered jaw to pointed chin.
 */
export function animeHeadMesh(H: number): { mesh: Mesh; marks: Record<string, V3> } {
  // Half-profile rows: [x, z] from front centerline (x=0, z>0) around to back centerline (x=0, z<0)
  const row = (y: number, ...q: ReadonlyArray<readonly [number, number]>): Array<V3> => [
    ...q.map(([x, z]): V3 => [x * H, (y - 0.5) * H, z * H]),
    ...q.slice(1, -1).reverse().map(([x, z]): V3 => [-x * H, (y - 0.5) * H, z * H]),
  ]
  const rows: Array<Array<V3>> = [
    row(0.00, [0, 0.04], [0.03, 0.03], [0.05, 0.01], [0.06, -0.02], [0.05, -0.06], [0.03, -0.10], [0, -0.12]),
    row(0.06, [0, 0.22], [0.10, 0.20], [0.19, 0.14], [0.24, 0.02], [0.23, -0.14], [0.15, -0.30], [0, -0.36]),
    row(0.18, [0, 0.35], [0.13, 0.34], [0.25, 0.26], [0.33, 0.10], [0.34, -0.10], [0.24, -0.36], [0, -0.45]),
    row(0.34, [0, 0.40], [0.14, 0.39], [0.27, 0.31], [0.36, 0.13], [0.37, -0.08], [0.27, -0.40], [0, -0.48]),
    // Brow ridge (y=0.47): slight brow projection, clean temple plane
    row(0.47, [0, 0.415], [0.13, 0.395], [0.27, 0.31], [0.35, 0.13], [0.365, -0.07], [0.26, -0.38], [0, -0.46]),
    // Eye line (y=0.56): subtle eye socket inset, cheekbone starting
    row(0.56, [0, 0.405], [0.11, 0.372], [0.26, 0.30], [0.34, 0.13], [0.355, -0.06], [0.25, -0.35], [0, -0.42]),
    // Cheekbone peak (y=0.65): delicate anime cheek swell on 3/4 contour!
    row(0.65, [0, 0.412], [0.09, 0.378], [0.245, 0.31], [0.33, 0.12], [0.335, -0.05], [0.22, -0.30], [0, -0.36]),
    // Nose tip level (y=0.72): small sharp anime nose tip, smooth cheek taper
    row(0.72, [0, 0.455], [0.055, 0.385], [0.205, 0.295], [0.295, 0.10], [0.295, -0.04], [0.18, -0.24], [0, -0.29]),
    // Upper lip / jaw angle (y=0.79)
    row(0.79, [0, 0.405], [0.065, 0.375], [0.175, 0.275], [0.255, 0.10], [0.255, -0.02], [0.15, -0.18], [0, -0.22]),
    // Lower lip / jaw taper (y=0.87): crisp slim anime jaw
    row(0.87, [0, 0.392], [0.06, 0.365], [0.135, 0.265], [0.195, 0.12], [0.19, 0.02], [0.10, -0.10], [0, -0.13]),
    // Chin (y=0.95 -> 1.00): delicate pointed anime chin
    row(0.95, [0, 0.375], [0.045, 0.355], [0.085, 0.285], [0.11, 0.18], [0.10, 0.08], [0.05, 0.00], [0, -0.03]),
    row(1.00, [0, 0.360], [0.025, 0.348], [0.042, 0.31], [0.045, 0.24], [0.04, 0.17], [0.02, 0.12], [0, 0.10]),
  ]
  const mesh = skin(smooth(rows, 2, 2))

  // Exact 3D facial landmarks on the head's curved surface (x right, y down, z forward)
  const pt = (x: number, y: number, z: number): V3 => [x * H, (y - 0.5) * H, z * H]
  const marks: Record<string, V3> = {
    crown: pt(0, 0.0, 0.0),
    parting: pt(0.06, 0.06, 0.18),
    foreheadMid: pt(0, 0.28, 0.39),
    // Centerline
    browMid: pt(0, 0.46, 0.415),
    noseBridge: pt(0, 0.58, 0.412),
    noseTip: pt(0, 0.715, 0.462),
    noseBase: pt(0, 0.742, 0.418),
    mouthMid: pt(0, 0.822, 0.408),
    lowerLip: pt(0, 0.858, 0.402),
    chin: pt(0, 1.00, 0.362),
    // Right side of character's face (+x = viewer's right when facing forward)
    browInR: pt(0.075, 0.465, 0.402),
    browPeakR: pt(0.185, 0.438, 0.362),
    browOutR: pt(0.285, 0.478, 0.285),
    eyeInR: pt(0.082, 0.578, 0.388),
    eyeTopR: pt(0.172, 0.518, 0.365),
    eyeOutR: pt(0.278, 0.562, 0.288),
    eyeBotR: pt(0.175, 0.618, 0.358),
    eyeCenterR: pt(0.176, 0.568, 0.366),
    cheekR: pt(0.325, 0.665, 0.165),
    jawCornerR: pt(0.260, 0.790, 0.095),
    jawMidR: pt(0.175, 0.895, 0.205),
    earTopR: pt(0.355, 0.54, -0.05),
    earBotR: pt(0.310, 0.74, -0.04),
    mouthR: pt(0.088, 0.812, 0.382),
    // Left side of character's face (-x = viewer's left when facing forward)
    browInL: pt(-0.075, 0.465, 0.402),
    browPeakL: pt(-0.185, 0.438, 0.362),
    browOutL: pt(-0.285, 0.478, 0.285),
    eyeInL: pt(-0.082, 0.578, 0.388),
    eyeTopL: pt(-0.172, 0.518, 0.365),
    eyeOutL: pt(-0.278, 0.562, 0.288),
    eyeBotL: pt(-0.175, 0.618, 0.358),
    eyeCenterL: pt(-0.176, 0.568, 0.366),
    cheekL: pt(-0.325, 0.665, 0.165),
    jawCornerL: pt(-0.260, 0.790, 0.095),
    jawMidL: pt(-0.175, 0.895, 0.205),
    earTopL: pt(-0.355, 0.54, -0.05),
    earBotL: pt(-0.310, 0.74, -0.04),
    mouthL: pt(-0.088, 0.812, 0.382),
  }
  return { mesh, marks }
}

/** Build a smooth limb mesh along a 3D bone chain from start to end with cross-section radii. */
export function limbTube(
  pts: ReadonlyArray<readonly [V3, number, number?]>,
  o: { n?: number; seg?: number; per?: number; up?: V3 } = {}
): Mesh {
  return tube(
    pts.map(([p, rx, rz]) => [p[0], p[1], p[2], rx, rz ?? rx] as const),
    { n: o.n ?? 2.2, seg: o.seg ?? 14, per: o.per ?? 3, up: o.up ?? [0, 0, 1] }
  )
}

/** Build a 3D articulated anime hand in wrist-local coordinates (+y along fingers, +z palm back, +x thumb side for right hand when mirror=1, left hand when mirror=-1). */
export function buildHandMesh(
  xf: Xform,
  H: number,
  mirror: 1 | -1,
  curl: readonly [number, number, number, number, number] = [15, 25, 30, 45, 55],
  spread: readonly [number, number, number, number, number] = [32, 10, 2, -6, -14]
): { mesh: Mesh; tips: Record<string, V3>; knuckles: Array<V3> } {
  const s = H * 0.74 // total hand length ~0.74 H (anime proportion!)
  const palmLen = s * 0.50
  const palmW = s * 0.42
  const palmT = s * 0.115
  // Palm mesh via lofted box/elliptical sections
  const palmRings: Array<Array<V3>> = [0, 0.35, 0.75, 1.0].map((t) => {
    const w = palmW * (0.68 + 0.32 * Math.sin(t * Math.PI * 0.65))
    const th = palmT * (1.0 - 0.18 * t)
    const y = t * palmLen
    const seg = 12
    return Array.from({ length: seg }, (_, i) => {
      const a = (i / seg) * Math.PI * 2
      return [Math.cos(a) * w * 0.5, y, Math.sin(a) * th] as V3
    })
  })
  const meshes: Array<Mesh> = [skin(palmRings)]
  const tips: Record<string, V3> = {}
  const knuckles: Array<V3> = []

  const names = ["thumb", "index", "middle", "ring", "pinky"] as const
  const specs = [
    // [baseX, baseY, baseZ, l1, l2, l3, r]
    [mirror * palmW * 0.44, palmLen * 0.28, -palmT * 0.35, s * 0.21, s * 0.17, s * 0.14, s * 0.052],
    [mirror * palmW * 0.33, palmLen * 0.96, 0, s * 0.23, s * 0.15, s * 0.12, s * 0.044],
    [mirror * palmW * 0.10, palmLen * 1.00, 0.01 * s, s * 0.26, s * 0.17, s * 0.12, s * 0.046],
    [mirror * -palmW * 0.14, palmLen * 0.95, 0, s * 0.24, s * 0.15, s * 0.11, s * 0.043],
    [mirror * -palmW * 0.36, palmLen * 0.87, -0.01 * s, s * 0.19, s * 0.12, s * 0.10, s * 0.038],
  ] as const

  specs.forEach(([bx, by, bz, l1, l2, l3, r], idx) => {
    const isThumb = idx === 0
    const sp = deg(spread[idx]!) * mirror
    const c1 = deg(curl[idx]! * 0.55)
    const c2 = deg(curl[idx]! * 0.85)
    const c3 = deg(curl[idx]! * 0.65)
    let fxf = xform(
      { o: [0, 0, 0], r: ID_M },
      [bx, by, bz],
      isThumb
        ? mulM(rotZ(sp), mulM(rotY(mirror * deg(-38)), rotX(-c1)))
        : mulM(rotZ(sp), rotX(-c1))
    )
    const p0 = fxf.o
    knuckles.push(toWorld(xf, p0))
    const p1 = toWorld(fxf, [0, l1, 0])
    fxf = xform(fxf, [0, l1, 0], rotX(-c2))
    const p2 = toWorld(fxf, [0, l2, 0])
    fxf = xform(fxf, [0, l2, 0], rotX(-c3))
    const p3 = toWorld(fxf, [0, l3, 0])
    meshes.push(limbTube([[p0, r], [p1, r * 0.92], [p2, r * 0.82], [p3, r * 0.55]], { seg: 8, per: 2 }))
    tips[names[idx]!] = toWorld(xf, p3)
  })

  return { mesh: moveMesh(join(...meshes), xf), tips, knuckles }
}

/** Build a 3D ribbon hair lock from root-to-tip centerline points, width profile, and normal orientation. */
export function hairRibbon3D(
  center: ReadonlyArray<V3>,
  widths: ReadonlyArray<number>,
  normalHint: V3,
  o: { thick?: number; bulge?: number; per?: number } = {}
): Mesh {
  const n = center.length
  const left: Array<V3> = []
  const right: Array<V3> = []
  for (let i = 0; i < n; i++) {
    const p = center[i]!
    const prev = center[Math.max(0, i - 1)]!
    const next = center[Math.min(n - 1, i + 1)]!
    const tang = unit(sub(next, prev))
    let side = cross(tang, normalHint)
    if (len(side) < 1e-4) side = cross(tang, [0, 0, 1])
    side = unit(side)
    const hw = (widths[i] ?? widths[widths.length - 1]!) * 0.5
    left.push(add(p, mul(side, -hw)))
    right.push(add(p, mul(side, hw)))
  }
  return strip(left, right, { thick: o.thick ?? 6, bulge: o.bulge ?? 8, per: o.per ?? 3, across: 3 })
}

export { add, ball, cross, dot, join, len, loft, mul, panel, skin, smooth, strip, sub, torus, tube, unit }
export type { Mesh, Part, V3 }
