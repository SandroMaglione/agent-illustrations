/**
 * Stage 1 (v2): 3D articulated anime character "Sora" using analytic 2-bone IK for semantic hand targets,
 * fixed sculpted anime skull, natural anime torso/hip silhouette, and automated anatomy gate.
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { png } from "../../src/form/png.ts"
import { raster } from "../../src/form/raster.ts"
import type { Buffer as ZB } from "../../src/form/raster.ts"
import {
  add, animeHeadMesh, ball, buildHandMesh, dot, euler, frameFromYZ, hairRibbon3D, ID_M, join, len, limbTube,
  moveMesh, mul, project, projectV3, skin, solveIK2, sub, torus, toWorld, unit, xform,
} from "./rig3d.ts"
import type { Camera, Mesh, Part, V3, Xform } from "./rig3d.ts"

const W = 1024
const H_CANVAS = 1536
const H = 370 // head height ~365 px projected (matching maren's 390 px!)

export const cam: Camera = {
  w: W,
  h: H_CANVAS,
  cx: W * 0.50,
  cy: H_CANVAS * 0.53,
  focal: 2300,
  camZ: 2300,
}

// =========================================================================
// 1. HIERARCHICAL 3D ANATOMICAL SKELETON + SEMANTIC IK TARGETS
// =========================================================================
const root: Xform = { o: [24, 245, 0], r: ID_M } // pelvis center

// Strong anime contrapposto (S-curve): hips tilt & shift left, ribcage twists & tilts back!
const pelvis = xform(root, [0, 0, 0], euler(-18, 4, 8))
const waist = xform(pelvis, [0, -0.38 * H, 0.02 * H], euler(10, -4, -6))
const chest = xform(waist, [0, -0.68 * H, -0.02 * H], euler(28, -8, -11))
const neckBase = xform(chest, [0, -0.36 * H, 0.02 * H], euler(-8, 8, 5))
const neckTop = xform(neckBase, [0, -0.30 * H, 0.03 * H], euler(0, 0, 0))
// Head: charismatic 3/4 angle, slight chin-tilt, looking directly toward viewer!
const head = xform(neckTop, [0, -0.45 * H, 0.08 * H], euler(-24, -8, -14))

// Headset earcup anchor on character's left ear (+x in head space)
const cupCenter = toWorld(head, [0.41 * H, 0.11 * H, -0.01 * H])
const cupOut = unit(sub(cupCenter, toWorld(head, [0, 0.11 * H, -0.01 * H])))

// Shoulders (biacromial width ~1.18 H, snug against ribcage!)
const shoulderR = xform(chest, [-0.55 * H, -0.22 * H, 0.04 * H])
const shoulderL = xform(chest, [0.55 * H, -0.22 * H, -0.04 * H])

// Analytic 2-bone IK! Semantic hand goals instead of guessing Euler angles!
const L_UPPER = 1.04 * H
const L_FORE = 0.96 * H

// Near arm (character's RIGHT = viewer's LEFT): hand resting casually on hip/pouch!
const wristRTarget = toWorld(pelvis, [-0.58 * H, 0.08 * H, 0.42 * H])
const ikR = solveIK2(shoulderR.o, wristRTarget, [-0.88, 0.20, -0.30], L_UPPER, L_FORE)
const wristR = frameFromYZ(ikR.wrist, sub(toWorld(pelvis, [-0.50 * H, 0.62 * H, 0.46 * H]), ikR.wrist), [0.3, 0, 1])

// Far arm (character's LEFT = viewer's RIGHT): raised gracefully to touch the headset earcup!
const wristLTarget = add(cupCenter, [0.24 * H, 0.48 * H, 0.14 * H])
const ikL = solveIK2(shoulderL.o, wristLTarget, [0.52, 0.85, 0.12], L_UPPER, L_FORE)
const wristL = frameFromYZ(ikL.wrist, sub(add(cupCenter, [0.02 * H, -0.08 * H, 0.10 * H]), ikL.wrist), [0.2, 0, 1])

// Hips & upper thighs (3/4 framing down to mid-thigh)
const hipR = xform(pelvis, [-0.30 * H, 0.22 * H, 0.04 * H], euler(4, 12, 10))
const kneeR = xform(hipR, [0, 1.65 * H, 0], euler(0, 0, 0))
const hipL = xform(pelvis, [0.30 * H, 0.22 * H, -0.02 * H], euler(-6, -4, -9))
const kneeL = xform(hipL, [0, 1.65 * H, 0], euler(0, 0, 0))

// =========================================================================
// 2. ANATOMICAL PROPORTION & RIG GATE
// =========================================================================
const d3 = (a: V3, b: V3): number => len(sub(b, a))
const gates: Array<readonly [string, number, number, number, string]> = [
  ["upperArm L/R sym (%)", Math.abs(d3(shoulderR.o, ikR.elbow) - d3(shoulderL.o, ikL.elbow)) / H * 100, 0, 2, "<=2%"],
  ["forearm L/R sym (%)", Math.abs(d3(ikR.elbow, ikR.wrist) - d3(ikL.elbow, ikL.wrist)) / H * 100, 0, 2, "<=2%"],
  ["IK reach R (%)", ikR.reachPct, 40, 96, "40..96%"],
  ["IK reach L (%)", ikL.reachPct, 40, 96, "40..96%"],
  ["shoulderWidth / H", d3(shoulderR.o, shoulderL.o) / H, 1.22, 1.50, "1.22..1.50 H"],
  ["neckLen / H", d3(neckBase.o, neckTop.o) / H, 0.25, 0.36, "0.25..0.36 H"],
]
let gateFail = 0
console.log("=== STAGE 1 ANATOMY GATE ===")
for (const [name, val, lo, hi, spec] of gates) {
  const ok = val >= lo && val <= hi
  if (!ok) gateFail++
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name.padEnd(24)} ${val.toFixed(2)}  (target ${spec})`)
}
const pHeadTop = project(cam, toWorld(head, [0, -0.5 * H, 0]))
const pHeadBot = project(cam, toWorld(head, [0, 0.5 * H, 0]))
const headPx = Math.hypot(pHeadBot[0] - pHeadTop[0], pHeadBot[1] - pHeadTop[1])
console.log(`  INFO  projected head height: ${headPx.toFixed(1)} px  (top y=${pHeadTop[1].toFixed(0)}, chin y=${pHeadBot[1].toFixed(0)})`)

// =========================================================================
// 3. BUILD 3D CHARACTER & GARMENT/PROP MESHES
// =========================================================================
const parts: Array<Part> = []
const put = (group: string, name: string, ...m: ReadonlyArray<Mesh>): void => {
  parts.push({ group, name, mesh: join(...m) })
}

// --- Sculpted Anime Head & Ears
const { mesh: headLocal, marks: headMarksLocal } = animeHeadMesh(H)
const headWorldMarks: Record<string, V3> = {}
for (const [k, v] of Object.entries(headMarksLocal)) headWorldMarks[k] = toWorld(head, v)
put("face", "head", moveMesh(headLocal, head))
put("ear", "earR", moveMesh(ball([-0.34 * H, 0.14 * H, -0.04 * H], [0.055 * H, 0.105 * H, 0.04 * H], { rows: 6, seg: 8 }), head))
put("ear", "earL", moveMesh(ball([0.34 * H, 0.14 * H, -0.04 * H], [0.055 * H, 0.105 * H, 0.04 * H], { rows: 6, seg: 8 }), head))

// --- Tech Comms Headset
const bandPts: Array<V3> = []
for (let i = 0; i <= 14; i++) {
  const a = -0.32 * Math.PI + (i / 14) * 0.88 * Math.PI
  bandPts.push(toWorld(head, [Math.sin(a) * 0.43 * H, -Math.cos(a) * 0.46 * H + 0.04 * H, -0.04 * H]))
}
put("headset", "headband", limbTube(bandPts.map((p) => [p, 0.032 * H, 0.055 * H] as const), { n: 3, seg: 10, per: 2 }))
put("headset", "earcup",
  limbTube([
    [add(cupCenter, mul(cupOut, -0.04 * H)), 0.17 * H, 0.16 * H],
    [add(cupCenter, mul(cupOut, 0.07 * H)), 0.18 * H, 0.17 * H],
    [add(cupCenter, mul(cupOut, 0.13 * H)), 0.14 * H, 0.13 * H],
  ], { n: 2.4, seg: 16, per: 1, up: [0, 1, 0] }),
  torus(add(cupCenter, mul(cupOut, 0.02 * H)), [0.16 * H, 0.18 * H], 0.036 * H, cupOut, 18, 8)
)

// --- Neck & High-Neck Sleeveless Tank Torso (natural anime hourglass!)
put("neck", "neck", limbTube([
  [toWorld(head, [0, 0.34 * H, -0.05 * H]), 0.145 * H, 0.155 * H],
  [neckTop.o, 0.142 * H, 0.15 * H],
  [neckBase.o, 0.165 * H, 0.165 * H],
], { seg: 14 }))

const torsoRing = (xf: Xform, yOff: number, rx: number, rz: number, zShift = 0, seg = 20): Array<V3> =>
  Array.from({ length: seg }, (_, i) => {
    const a = (i / seg) * Math.PI * 2
    return toWorld(xf, [Math.cos(a) * rx * H, yOff * H, Math.sin(a) * rz * H + zShift * H])
  })
put("top", "torso", skin([
  torsoRing(neckBase, -0.04, 0.18, 0.17, 0.0),
  torsoRing(chest, -0.32, 0.44, 0.24, 0.01),
  torsoRing(chest, -0.14, 0.50, 0.29, 0.03),
  torsoRing(chest, 0.12, 0.42, 0.28, 0.03),
  torsoRing(waist, 0.00, 0.36, 0.25, 0.01),
  torsoRing(pelvis, -0.10, 0.46, 0.29, 0.01),
  torsoRing(pelvis, 0.16, 0.62, 0.37, 0.0),
  torsoRing(pelvis, 0.42, 0.64, 0.37, 0.0),
]))
put("top", "bustR", moveMesh(ball([-0.20 * H, -0.02 * H, 0.25 * H], [0.21 * H, 0.21 * H, 0.19 * H], { rows: 10, seg: 14 }), chest))
put("top", "bustL", moveMesh(ball([0.20 * H, -0.02 * H, 0.25 * H], [0.21 * H, 0.21 * H, 0.19 * H], { rows: 10, seg: 14 }), chest))

// --- Cargo Pants legs (wide stylish streetwear silhouette, seamlessly meeting pelvis!)
put("pants", "legR", limbTube([
  [toWorld(pelvis, [-0.28 * H, 0.14 * H, 0.03 * H]), 0.36 * H, 0.35 * H],
  [toWorld(hipR, [0, 0.55 * H, 0]), 0.42 * H, 0.39 * H],
  [kneeR.o, 0.44 * H, 0.40 * H],
], { n: 2.4, seg: 14 }))
put("pants", "legL", limbTube([
  [toWorld(pelvis, [0.28 * H, 0.14 * H, -0.01 * H]), 0.36 * H, 0.35 * H],
  [toWorld(hipL, [0, 0.55 * H, 0]), 0.42 * H, 0.39 * H],
  [kneeL.o, 0.44 * H, 0.40 * H],
], { n: 2.4, seg: 14 }))

// --- Belt + Buckle
const beltRings = [-0.08, 0.10].map((yOff) =>
  Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2
    return toWorld(pelvis, [Math.cos(a) * 0.56 * H, yOff * H, Math.sin(a) * 0.36 * H + 0.01 * H])
  })
)
put("belt", "belt", skin(beltRings, false))
put("buckle", "buckle", moveMesh(ball([0.12 * H, 0.01 * H, 0.39 * H], [0.13 * H, 0.095 * H, 0.045 * H], { rows: 6, seg: 8 }), pelvis))

// --- Near Arm R (bare shoulder -> off-shoulder bulky jacket sleeve -> hand on hip!)
const rMidUp = add(mul(shoulderR.o, 0.5), mul(ikR.elbow, 0.5))
const rMidFo = add(mul(ikR.elbow, 0.5), mul(ikR.wrist, 0.5))
put("skin", "armR_upper",
  ball(shoulderR.o, 0.18 * H, { rows: 10, seg: 14 }),
  limbTube([[shoulderR.o, 0.165 * H], [rMidUp, 0.14 * H], [ikR.elbow, 0.13 * H]], { seg: 12 })
)
put("skin", "armR_fore", limbTube([[ikR.elbow, 0.135 * H], [rMidFo, 0.12 * H], [ikR.wrist, 0.088 * H]], { seg: 12 }))
const handR = buildHandMesh(wristR, H, 1, [16, 18, 22, 32, 40], [26, 8, 2, -5, -12])
put("handR", "handR", handR.mesh)

// Off-shoulder jacket sleeve R
const rSlvStart = add(mul(shoulderR.o, 0.62), mul(ikR.elbow, 0.38))
const rSlvCuff = add(mul(ikR.elbow, 0.24), mul(ikR.wrist, 0.76))
put("jacket", "sleeveR", limbTube([
  [rSlvStart, 0.24 * H, 0.23 * H],
  [add(mul(shoulderR.o, 0.22), mul(ikR.elbow, 0.78)), 0.32 * H, 0.29 * H],
  [ikR.elbow, 0.34 * H, 0.30 * H],
  [add(mul(ikR.elbow, 0.45), mul(ikR.wrist, 0.55)), 0.30 * H, 0.28 * H],
  [rSlvCuff, 0.18 * H, 0.18 * H],
], { n: 2.5, seg: 14 }))

// --- Far Arm L (raised to touch headset!) + bulky jacket sleeve L
const lSlvStart = add(mul(shoulderL.o, 0.85), mul(ikL.elbow, 0.15))
const lSlvCuff = add(mul(ikL.elbow, 0.30), mul(ikL.wrist, 0.70))
put("skin", "armL_shoulder", ball(shoulderL.o, 0.17 * H, { rows: 8, seg: 12 }))
put("jacket", "sleeveL", limbTube([
  [lSlvStart, 0.25 * H, 0.24 * H],
  [add(mul(shoulderL.o, 0.35), mul(ikL.elbow, 0.65)), 0.33 * H, 0.30 * H],
  [ikL.elbow, 0.35 * H, 0.31 * H],
  [add(mul(ikL.elbow, 0.48), mul(ikL.wrist, 0.52)), 0.29 * H, 0.27 * H],
  [lSlvCuff, 0.17 * H, 0.17 * H],
], { n: 2.5, seg: 14 }))
put("skin", "armL_wrist", limbTube([[lSlvCuff, 0.105 * H], [ikL.wrist, 0.088 * H]], { seg: 10 }))
const handL = buildHandMesh(wristL, H, -1, [14, 10, 16, 46, 56], [28, 8, 0, -8, -16])
put("handL", "handL", handL.mesh)

// --- Hair Volume Cap + 3D Layered Ribbon Locks
const hairLocksWorld: Array<{ name: string; pts: Array<V3>; widths: Array<number>; layer: "back" | "mid" | "front" }> = []
const addLock = (name: string, layer: "back" | "mid" | "front", localPts: ReadonlyArray<V3>, widths: ReadonlyArray<number>): void => {
  const pts = localPts.map((p) => toWorld(head, [p[0] * H, (p[1] - 0.5) * H, p[2] * H]))
  const w = widths.map((x) => x * H)
  hairLocksWorld.push({ name, pts, widths: w, layer })
  put(layer === "back" ? "hairB" : "hairF", name, hairRibbon3D(pts, w, [head.r[0][2], head.r[1][2], head.r[2][2]], { thick: 10, bulge: 12 }))
}
addLock("bangCenter", "front", [[0.06, 0.05, 0.22], [-0.04, 0.22, 0.44], [-0.05, 0.46, 0.46], [0.02, 0.64, 0.44]], [0.16, 0.22, 0.15, 0.015])
addLock("bangLeft1", "front", [[0.02, 0.07, 0.24], [-0.14, 0.22, 0.42], [-0.26, 0.42, 0.37], [-0.21, 0.59, 0.35]], [0.14, 0.18, 0.13, 0.015])
addLock("bangRight1", "front", [[0.10, 0.07, 0.22], [0.22, 0.24, 0.37], [0.29, 0.44, 0.32], [0.23, 0.57, 0.31]], [0.13, 0.16, 0.11, 0.015])
addLock("sideL", "mid", [[-0.08, 0.10, 0.18], [-0.34, 0.26, 0.26], [-0.42, 0.56, 0.24], [-0.33, 0.84, 0.24], [-0.18, 0.99, 0.26]], [0.18, 0.22, 0.19, 0.13, 0.015])
addLock("sideR", "mid", [[0.14, 0.10, 0.18], [0.35, 0.28, 0.24], [0.41, 0.58, 0.20], [0.34, 0.86, 0.20], [0.20, 0.99, 0.22]], [0.15, 0.18, 0.16, 0.11, 0.015])
addLock("flip1", "back", [[-0.10, 0.16, -0.10], [-0.46, 0.36, -0.12], [-0.76, 0.54, -0.14], [-0.98, 0.48, -0.16]], [0.28, 0.30, 0.22, 0.015])
addLock("flip2", "back", [[-0.14, 0.34, -0.18], [-0.48, 0.58, -0.18], [-0.78, 0.80, -0.16], [-0.95, 0.86, -0.14]], [0.26, 0.28, 0.20, 0.015])
addLock("flip3", "back", [[-0.10, 0.56, -0.22], [-0.36, 0.84, -0.20], [-0.56, 1.06, -0.16], [-0.62, 1.18, -0.12]], [0.24, 0.24, 0.16, 0.015])
addLock("backR", "back", [[0.16, 0.30, -0.16], [0.44, 0.62, -0.18], [0.54, 0.94, -0.16], [0.48, 1.14, -0.12]], [0.22, 0.24, 0.16, 0.015])
put("hairF", "hairCap", moveMesh(ball([0, -0.14 * H, -0.04 * H], [0.45 * H, 0.40 * H, 0.48 * H], { rows: 12, seg: 18 }), head))

// =========================================================================
// 4. RENDER TURNTABLE + CONSTRUCTION GUIDE + EXPORT LANDMARKS FOR STAGE 2
// =========================================================================
mkdirSync("exp/out", { recursive: true })
const pivot: V3 = [0, 80, 0]
const L = unit([-0.55, -0.62, 0.56])
const hue = new Map<string, readonly [number, number, number]>([
  ["face", [0.96, 0.84, 0.78]], ["ear", [0.94, 0.80, 0.74]], ["neck", [0.92, 0.78, 0.72]],
  ["skin", [0.94, 0.80, 0.74]], ["handR", [0.96, 0.82, 0.76]], ["handL", [0.96, 0.82, 0.76]],
  ["hairF", [0.32, 0.74, 0.64]], ["hairB", [0.22, 0.58, 0.52]], ["headset", [0.92, 0.68, 0.28]],
  ["top", [0.26, 0.28, 0.34]], ["jacket", [0.24, 0.50, 0.54]], ["pants", [0.68, 0.62, 0.56]],
  ["belt", [0.34, 0.30, 0.28]], ["buckle", [0.80, 0.84, 0.88]],
])

const renderView = (w: number, h: number, scale: number, yawDeg: number, color: boolean): { rgb: Uint8Array; W: number; H: number; zb: ZB } => {
  const yaw = (yawDeg * Math.PI) / 180, c = Math.cos(yaw), s = Math.sin(yaw)
  const viewFn = (v: V3): V3 => {
    const dx = v[0] - pivot[0], dy = v[1] - pivot[1], dz = v[2] - pivot[2]
    const rv: V3 = [dx * c + dz * s + pivot[0], dy + pivot[1], -dx * s + dz * c + pivot[2]]
    const [px, py, pz] = project(cam, rv)
    return [px * scale, py * scale, pz]
  }
  const zb = raster(parts, w, h, viewFn)
  const rgb = new Uint8Array(w * h * 3)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, p = zb.part[i]!
    if (p < 0) { rgb[i * 3] = 248; rgb[i * 3 + 1] = 249; rgb[i * 3 + 2] = 252; continue }
    const l = 0.34 + 0.66 * Math.max(0, dot([zb.n[i * 3]!, zb.n[i * 3 + 1]!, zb.n[i * 3 + 2]!], L))
    const col = color ? (hue.get(parts[p]!.group) ?? [0.8, 0.8, 0.8]) : ([0.86, 0.85, 0.84] as const)
    const edge = (x + 1 < w && zb.part[i] !== zb.part[i + 1]) || (y + 1 < h && zb.part[i] !== zb.part[i + w])
    const f = edge ? 0.45 : 1.0
    rgb[i * 3] = Math.min(255, col[0] * l * f * 255)
    rgb[i * 3 + 1] = Math.min(255, col[1] * l * f * 255)
    rgb[i * 3 + 2] = Math.min(255, col[2] * l * f * 255)
  }
  return { rgb, W: w, H: h, zb }
}

const rowPng = (list: ReadonlyArray<{ rgb: Uint8Array; W: number; H: number }>): Buffer => {
  const tw = list.reduce((a, b) => a + b.W + 6, -6), th = Math.max(...list.map((b) => b.H))
  const o = new Uint8Array(tw * th * 3).fill(255)
  let x0 = 0
  for (const s of list) {
    for (let y = 0; y < s.H; y++) o.set(s.rgb.subarray(y * s.W * 3, (y + 1) * s.W * 3), (y * tw + x0) * 3)
    x0 += s.W + 6
  }
  return png(o, tw, th)
}

const tw = 360, th = 540, sc = tw / W
writeFileSync("exp/out/stage1-turn.png", rowPng([-60, -30, 0, 30, 75].map((a) => renderView(tw, th, sc, a, false))))

const guide = renderView(W, H_CANVAS, 1, 0, true)
const drawDot = (rgb: Uint8Array, cx: number, cy: number, r: number, col: readonly [number, number, number]): void => {
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (dx * dx + dy * dy > r * r) continue
    const x = Math.round(cx + dx), y = Math.round(cy + dy)
    if (x >= 0 && y >= 0 && x < W && y < H_CANVAS) { const i = (y * W + x) * 3; rgb[i] = col[0]; rgb[i + 1] = col[1]; rgb[i + 2] = col[2] }
  }
}
const drawLine = (rgb: Uint8Array, a: readonly [number, number], b: readonly [number, number], col: readonly [number, number, number]): void => {
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])))
  for (let k = 0; k <= n; k++) drawDot(rgb, a[0] + (b[0] - a[0]) * (k / n), a[1] + (b[1] - a[1]) * (k / n), 2, col)
}
const p2 = (v: V3): readonly [number, number] => { const [x, y] = project(cam, v); return [x, y] }
const bones2d: Array<readonly [V3, V3]> = [
  [pelvis.o, waist.o], [waist.o, chest.o], [chest.o, neckBase.o], [neckBase.o, neckTop.o], [neckTop.o, head.o],
  [chest.o, shoulderR.o], [shoulderR.o, ikR.elbow], [ikR.elbow, ikR.wrist],
  [chest.o, shoulderL.o], [shoulderL.o, ikL.elbow], [ikL.elbow, ikL.wrist],
  [pelvis.o, hipR.o], [hipR.o, kneeR.o], [pelvis.o, hipL.o], [hipL.o, kneeL.o],
]
for (const [a, b] of bones2d) drawLine(guide.rgb, p2(a), p2(b), [35, 80, 220])
for (const [, v] of Object.entries(headWorldMarks)) drawDot(guide.rgb, p2(v)[0], p2(v)[1], 4, [220, 35, 60])
writeFileSync("exp/out/stage1-guide.png", png(guide.rgb, W, H_CANVAS))

// Extract clean projected silhouette of the sculpted anime head!
const headOnly = raster([{ group: "face", name: "head", mesh: moveMesh(headLocal, head) }], W, H_CANVAS, (v) => projectV3(cam, v))
const faceSilL: Array<readonly [number, number]> = []
const faceSilR: Array<readonly [number, number]> = []
for (let y = 0; y < H_CANVAS; y += 6) {
  let xl = -1, xr = -1
  for (let x = 0; x < W; x++) if (headOnly.part[y * W + x]! >= 0) { if (xl < 0) xl = x; xr = x }
  if (xl >= 0 && xr - xl > 8) { faceSilL.push([xl, y]); faceSilR.push([xr, y]) }
}

const projObj = (rec: Record<string, V3>): Record<string, readonly [number, number, number]> =>
  Object.fromEntries(Object.entries(rec).map(([k, v]) => { const [x, y, z] = project(cam, v); return [k, [+x.toFixed(1), +y.toFixed(1), +z.toFixed(1)]] as const }))

const joints: Record<string, V3> = {
  pelvis: pelvis.o, waist: waist.o, chest: chest.o, neckBase: neckBase.o, neckTop: neckTop.o, head: head.o,
  shoulderR: shoulderR.o, elbowR: ikR.elbow, wristR: ikR.wrist,
  shoulderL: shoulderL.o, elbowL: ikL.elbow, wristL: ikL.wrist,
  hipR: hipR.o, kneeR: kneeR.o, hipL: hipL.o, kneeL: kneeL.o,
  cupCenter,
  rSlvStart, rSlvCuff, lSlvStart, lSlvCuff,
  bustR: toWorld(chest, [-0.20 * H, -0.02 * H, 0.25 * H]),
  bustL: toWorld(chest, [0.20 * H, -0.02 * H, 0.25 * H]),
  clavicleMid: toWorld(chest, [0, -0.32 * H, 0.23 * H]),
  clavicleR: toWorld(chest, [-0.36 * H, -0.28 * H, 0.16 * H]),
  clavicleL: toWorld(chest, [0.36 * H, -0.28 * H, 0.14 * H]),
  waistL: toWorld(waist, [-0.37 * H, 0, 0]),
  waistR: toWorld(waist, [0.37 * H, 0, 0]),
  hipOutR: toWorld(pelvis, [-0.62 * H, 0.18 * H, 0]),
  hipOutL: toWorld(pelvis, [0.62 * H, 0.18 * H, 0]),
  buckle: toWorld(pelvis, [0.12 * H, 0.01 * H, 0.39 * H]),
}

const outData = {
  w: W, h: H_CANVAS, headPx: +headPx.toFixed(1),
  headMarks: projObj(headWorldMarks),
  joints: projObj(joints),
  handRTips: projObj(handR.tips),
  handLTips: projObj(handL.tips),
  handRKnuckles: handR.knuckles.map((v) => { const [x, y] = project(cam, v); return [+x.toFixed(1), +y.toFixed(1)] }),
  handLKnuckles: handL.knuckles.map((v) => { const [x, y] = project(cam, v); return [+x.toFixed(1), +y.toFixed(1)] }),
  faceSilL, faceSilR,
  headAxisX: [+(p2(toWorld(head, [100, 0, 0]))[0] - p2(head.o)[0]).toFixed(2), +(p2(toWorld(head, [100, 0, 0]))[1] - p2(head.o)[1]).toFixed(2)],
  headAxisY: [+(p2(toWorld(head, [0, 100, 0]))[0] - p2(head.o)[0]).toFixed(2), +(p2(toWorld(head, [0, 100, 0]))[1] - p2(head.o)[1]).toFixed(2)],
  hairLocks: hairLocksWorld.map((lk) => ({
    name: lk.name, layer: lk.layer,
    pts: lk.pts.map((p, i) => { const [x, y, z, s] = project(cam, p); return [+x.toFixed(1), +y.toFixed(1), +(lk.widths[i]! * s).toFixed(1), +z.toFixed(1)] }),
  })),
}
writeFileSync("exp/out/stage1-data.json", JSON.stringify(outData, null, 2))
console.log("Wrote v2 stage1-turn.png, stage1-guide.png, stage1-data.json")
