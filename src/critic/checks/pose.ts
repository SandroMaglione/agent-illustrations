/**
 * Pose and proportion, pluggable: keypoints come from a JSON file (`--keypoints`: OpenPose / DWPose output, COCO-17, or
 * this tool's own format) or from any estimator command (`--pose-cmd`, or `CRITIC_POSE_CMD`) that prints such JSON for a
 * PNG; `scripts/critic-pose-mediapipe.py` is one, for MediaPipe. With neither, the check is skipped and says so.
 *
 * From the keypoints: shoulder and hip tilt (and whether they counter each other, contrapposto), head height and the
 * figure's height in heads, and left/right limb lengths. A skeleton is drawn over the picture.
 */
import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { basename, join } from "node:path"
import { disc, line, type RGBA } from "../draw.ts"
import { fit, toPng, type Img } from "../image.ts"
import type { Finding } from "../stages.ts"

export type Point = { x: number; y: number; score: number }
export type Keypoints = { points: Record<string, Point>; source: string }

const COCO17 = ["nose", "left_eye", "right_eye", "left_ear", "right_ear", "left_shoulder", "right_shoulder", "left_elbow", "right_elbow", "left_wrist", "right_wrist", "left_hip", "right_hip", "left_knee", "right_knee", "left_ankle", "right_ankle"]
const BODY25 = ["nose", "neck", "right_shoulder", "right_elbow", "right_wrist", "left_shoulder", "left_elbow", "left_wrist", "mid_hip", "right_hip", "right_knee", "right_ankle", "left_hip", "left_knee", "left_ankle", "right_eye", "left_eye", "right_ear", "left_ear", "left_big_toe", "left_small_toe", "left_heel", "right_big_toe", "right_small_toe", "right_heel"]
const COCO18 = ["nose", "neck", "right_shoulder", "right_elbow", "right_wrist", "left_shoulder", "left_elbow", "left_wrist", "right_hip", "right_knee", "right_ankle", "left_hip", "left_knee", "left_ankle", "right_eye", "left_eye", "right_ear", "left_ear"]

/**
 * Accepted shapes (coordinates in pixels of the analysed image, or 0..1 with `"normalized": true` or when every value is
 * at most 1):
 * - `{ "points": { "nose": [x, y, score], ... } }` or `{ "points": { "nose": { "x", "y", "score" } } }`
 * - `{ "keypoints": [{ "name", "x", "y", "score" }] }`
 * - OpenPose / DWPose: `{ "people": [{ "pose_keypoints_2d": [...], "face_keypoints_2d": [...] }], "canvas_width", "canvas_height" }`
 * - a bare COCO-17 array `[[x, y, score], ...]`
 */
export const parseKeypoints = (json: unknown, w: number, h: number, source: string): Keypoints | null => {
  const pts: Record<string, Point> = {}
  const o = json as Record<string, unknown>
  let norm = !!(o && typeof o === "object" && (o as { normalized?: boolean }).normalized)
  let nw = w, nh = h
  const flat = (arr: Array<number>, names: Array<string>): void => names.forEach((n, i) => { const x = arr[i * 3], y = arr[i * 3 + 1], s = arr[i * 3 + 2]; if (x != null && y != null && (x || y)) pts[n] = { x, y, score: s ?? 1 } })
  if (Array.isArray(json)) (json as Array<Array<number>>).forEach((p, i) => { if (COCO17[i] && p) pts[COCO17[i]!] = { x: p[0]!, y: p[1]!, score: p[2] ?? 1 } })
  else if (o?.points && typeof o.points === "object") for (const [k, v] of Object.entries(o.points as Record<string, unknown>)) { const p = Array.isArray(v) ? { x: v[0], y: v[1], score: v[2] ?? 1 } : (v as Point); if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) pts[k] = { x: Number(p.x), y: Number(p.y), score: Number(p.score ?? 1) } }
  else if (Array.isArray(o?.keypoints)) for (const p of o.keypoints as Array<{ name: string } & Point>) pts[p.name] = { x: p.x, y: p.y, score: p.score ?? 1 }
  else if (Array.isArray(o?.people)) {
    const person = (o.people as Array<Record<string, Array<number>>>)[0]
    if (!person) return null
    const body = person.pose_keypoints_2d ?? []
    flat(body, body.length >= 75 ? BODY25 : body.length >= 54 ? COCO18 : COCO17)
    const face = person.face_keypoints_2d
    if (face && face.length >= 70 * 3) { flat(face.slice(8 * 3, 9 * 3), ["chin"]); const by = [17, 18, 19, 20, 21, 22, 23, 24, 25, 26].map((i) => face[i * 3 + 1]!).filter((v) => v); if (by.length) pts.brow = { x: face[27 * 3]!, y: Math.min(...by), score: 1 } }
    if (typeof o.canvas_width === "number" && typeof o.canvas_height === "number") { nw = o.canvas_width; nh = o.canvas_height }
  } else return null
  const all = Object.values(pts)
  if (!all.length) return null
  if (!norm && all.every((p) => p.x <= 1.0001 && p.y <= 1.0001)) norm = true
  // OpenPose canvas size may differ from the image the critic analyses: rescale
  const fx = norm ? w : w / nw, fy = norm ? h : h / nh
  for (const p of all) { p.x *= fx; p.y *= fy }
  return { points: pts, source }
}

/** Runs an estimator: `{in}` is replaced with a PNG path; it must print keypoint JSON for that PNG on stdout. */
export const runPoseCommand = (img: Img, template: string): Keypoints | null => {
  const dir = mkdtempSync(join(tmpdir(), "critic-pose-"))
  try {
    const small = fit(img, 1280), path = join(dir, "in.png")
    writeFileSync(path, toPng(small.img))
    const argv = template.split(/\s+/).filter(Boolean).map((a) => a.replace("{in}", path))
    const out = execFileSync(argv[0]!, argv.slice(1), { encoding: "utf8", timeout: 180_000, stdio: ["ignore", "pipe", "ignore"] })
    const kp = parseKeypoints(JSON.parse(out), small.img.w, small.img.h, template.split(/\s+/).filter((a) => a && a !== "{in}").map((a) => basename(a)).join(" "))
    if (kp) for (const p of Object.values(kp.points)) { p.x /= small.scale; p.y /= small.scale }
    return kp
  } catch { return null } finally { rmSync(dir, { recursive: true, force: true }) }
}
export const loadKeypointsFile = (path: string, w: number, h: number): Keypoints | null => parseKeypoints(JSON.parse(readFileSync(path, "utf8")), w, h, path)

/**
 * Estimators trained on photos can put an anime figure's head on a prop or its shoulders on a crate. Points that contradict
 * the silhouette are dropped: the head must be in the upper part of an uncropped figure, and every point must be on or near
 * the figure. Returns what was dropped, for the report.
 */
export const checkKeypoints = (kp: Keypoints, fg: Uint8Array | null, w: number, h: number, figure: { x: number; y: number; w: number; h: number } | null, croppedTop: boolean): { kp: Keypoints; dropped: string | null } => {
  const pts = { ...kp.points }, why: Array<string> = []
  if (fg) {
    const near = (p: Point): boolean => { const r = Math.max(2, Math.round(Math.max(w, h) * 0.02)); for (let y = Math.max(0, Math.round(p.y) - r); y <= Math.min(h - 1, Math.round(p.y) + r); y++) for (let x = Math.max(0, Math.round(p.x) - r); x <= Math.min(w - 1, Math.round(p.x) + r); x++) if (fg[y * w + x]) return true; return false }
    const off = Object.entries(pts).filter(([, p]) => p.score >= 0.3 && !near(p)).map(([k]) => k)
    for (const k of off) delete pts[k]
    if (off.length) why.push(`${off.length} point(s) off the figure`)
  }
  const head = ["nose", "left_eye", "right_eye"].map((n) => pts[n]).find((p) => p && p.score >= 0.3)
  if (head && figure && !croppedTop && head.y > figure.y + figure.h * 0.38) {
    for (const k of Object.keys(pts)) if (!/hip|knee|ankle|heel|toe/.test(k)) delete pts[k]
    why.push(`the head was placed ${Math.round(((head.y - figure.y) / figure.h) * 100)}% down the figure, so the upper body was ignored`)
  }
  return { kp: { ...kp, points: pts }, dropped: why.length ? why.join("; ") : null }
}

const BONES: Array<[string, string]> = [["left_shoulder", "right_shoulder"], ["left_hip", "right_hip"], ["left_shoulder", "left_hip"], ["right_shoulder", "right_hip"], ["left_shoulder", "left_elbow"], ["left_elbow", "left_wrist"], ["right_shoulder", "right_elbow"], ["right_elbow", "right_wrist"], ["left_hip", "left_knee"], ["left_knee", "left_ankle"], ["right_hip", "right_knee"], ["right_knee", "right_ankle"], ["left_ankle", "left_heel"], ["right_ankle", "right_heel"], ["nose", "left_eye"], ["nose", "right_eye"], ["left_eye", "left_ear"], ["right_eye", "right_ear"]]

/**
 * Bones and joints of the confident keypoints, `scale` from keypoint px to `img` px. Blue is the figure's left, red its
 * right. With `outline`, every stroke gets a dark edge so it reads on any canvas (the redline).
 */
export const drawSkeleton = (img: Img, kp: Keypoints, scale: number, t: number, outline: boolean): void => {
  const P = (n: string): Point | null => { const p = kp.points[n]; return p && p.score >= 0.3 ? { x: p.x * scale, y: p.y * scale, score: p.score } : null }
  const left: RGBA = [40, 130, 255, 235], right: RGBA = [255, 70, 50, 235], mid: RGBA = [30, 200, 120, 235], dark: RGBA = [10, 10, 15, 170]
  const segs = BONES.map(([a, b]) => [P(a), P(b), a.startsWith("left") && b.startsWith("left") ? left : a.startsWith("right") && b.startsWith("right") ? right : mid] as const).filter((s): s is readonly [Point, Point, RGBA] => !!s[0] && !!s[1])
  if (outline) for (const [p, q] of segs) line(img, p.x, p.y, q.x, q.y, t + 2 * Math.max(1, t / 3), dark)
  for (const [p, q, c] of segs) line(img, p.x, p.y, q.x, q.y, t, c)
  for (const n of Object.keys(kp.points)) { const p = P(n); if (p) { disc(img, p.x, p.y, t * 1.6, outline ? dark : [255, 255, 255, 255]); disc(img, p.x, p.y, t, [255, 255, 255, 255]) } }
}

export type PoseMetrics = {
  source: string
  shoulderTilt: number | null; hipTilt: number | null
  /** "contrapposto" | "parallel" | "level" */ counter: string | null
  headHeight: number | null; headMethod: string | null; headsTall: number | null
  limbs: Array<{ name: string; left: number; right: number; ratio: number }>
}

/** Degrees a line from the image-left point to the image-right point drops (positive = the right end is lower). */
const tilt = (a: Point, b: Point): number => { const [p, q] = a.x <= b.x ? [a, b] : [b, a]; return (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI }
const d = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y)

export const pose = (kp: Keypoints | null, base: Img, figureBottom: number | null): { metrics: PoseMetrics | null; overlay: Img | null; findings: Array<Finding>; skipped?: string } => {
  if (!kp) return { metrics: null, overlay: null, findings: [], skipped: "no pose estimator configured (use --keypoints file.json or --pose-cmd; see src/critic/README.md)" }
  const P = (n: string): Point | null => { const p = kp.points[n]; return p && p.score >= 0.3 ? p : null }
  const mid = (a: Point | null, b: Point | null): Point | null => (a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, score: Math.min(a.score, b.score) } : a ?? b)
  const ls = P("left_shoulder"), rs = P("right_shoulder"), lh = P("left_hip"), rh = P("right_hip")
  const m: PoseMetrics = { source: kp.source, shoulderTilt: ls && rs ? tilt(ls, rs) : null, hipTilt: lh && rh ? tilt(lh, rh) : null, counter: null, headHeight: null, headMethod: null, headsTall: null, limbs: [] }
  if (m.shoulderTilt != null && m.hipTilt != null) {
    const a = m.shoulderTilt, b = m.hipTilt
    m.counter = Math.abs(a) < 2.5 && Math.abs(b) < 2.5 ? "level" : Math.sign(a) !== Math.sign(b) && Math.abs(a) > 1.5 && Math.abs(b) > 1.5 ? "contrapposto" : "parallel"
  }
  // head: chin to crown. Anime eyes sit about 55% down the head, so crown = eye line - (chin - eye line) * 0.55 / 0.45
  const eye = mid(P("left_eye"), P("right_eye")), nose = P("nose")
  let chin = P("chin"), method = "chin keypoint"
  const mouth = mid(P("mouth_left"), P("mouth_right"))
  if (!chin && eye && mouth) { chin = { x: mouth.x, y: mouth.y + (mouth.y - eye.y) * 0.85, score: 0.5 }; method = "estimated from eyes and mouth" }
  if (!chin && eye && nose) { chin = { x: nose.x, y: eye.y + (nose.y - eye.y) * 2.5, score: 0.4 }; method = "estimated from eyes and nose" }
  if (chin && eye && chin.y > eye.y) {
    const crown = P("head_top")?.y ?? eye.y - (chin.y - eye.y) * (0.55 / 0.45)
    m.headHeight = chin.y - crown; m.headMethod = P("head_top") ? `${method}, head_top keypoint` : method
    const feet = ["left_heel", "right_heel", "left_big_toe", "right_big_toe", "left_ankle", "right_ankle"].map(P).filter((p): p is Point => !!p)
    if (feet.length) {
      const hasSole = feet.some((_, i) => i < 4 && P(["left_heel", "right_heel", "left_big_toe", "right_big_toe"][i]!))
      const sole = Math.max(...feet.map((p) => p.y)) + (hasSole ? 0 : m.headHeight * 0.15)
      const bottom = figureBottom != null ? Math.max(sole, Math.min(figureBottom, sole + m.headHeight * 0.3)) : sole
      m.headsTall = (bottom - crown) / m.headHeight
    }
  }
  const limb = (name: string, a: string, b: string): void => { const la = P(`left_${a}`), lb = P(`left_${b}`), ra = P(`right_${a}`), rb = P(`right_${b}`); if (la && lb && ra && rb) { const L = d(la, lb), R = d(ra, rb); m.limbs.push({ name, left: L, right: R, ratio: Math.max(L, R) / Math.max(1e-6, Math.min(L, R)) }) } }
  limb("upper arm", "shoulder", "elbow"); limb("forearm", "elbow", "wrist"); limb("thigh", "hip", "knee"); limb("shin", "knee", "ankle")
  const findings: Array<Finding> = []
  if (m.counter === "parallel" && Math.abs(m.shoulderTilt!) > 4 && Math.abs(m.hipTilt!) > 4)
    findings.push({ source: "measure", check: "pose", severity: "minor", title: "Shoulders and hips tilt the same way", detail: "In a standing weight shift the shoulder line and hip line usually tilt in opposite directions (contrapposto). Parallel tilts read as the whole torso leaning, or as a stiff, tipped figure.", fix: "Rotate the hip block against the shoulders (Mesh transformation on the lower body) so the hip on the weight-bearing leg rises while that shoulder drops.", evidence: `shoulders ${m.shoulderTilt!.toFixed(1)}°, hips ${m.hipTilt!.toFixed(1)}°`, region: ls && rs && lh && rh ? { x: Math.min(ls.x, rs.x, lh.x, rh.x), y: Math.min(ls.y, rs.y), w: Math.max(ls.x, rs.x, lh.x, rh.x) - Math.min(ls.x, rs.x, lh.x, rh.x), h: Math.max(lh.y, rh.y) - Math.min(ls.y, rs.y) } : undefined })
  if (m.counter === "level")
    findings.push({ source: "measure", check: "pose", severity: "note", title: "Shoulders and hips are level", detail: "No weight shift: fine for a formal or symmetrical pose, stiff for a casual one.", evidence: `shoulders ${m.shoulderTilt!.toFixed(1)}°, hips ${m.hipTilt!.toFixed(1)}°` })
  if (m.headsTall != null)
    findings.push({ source: "measure", check: "pose", severity: "note", title: `Figure is about ${m.headsTall.toFixed(1)} heads tall`, detail: `${m.headsTall < 4 ? "Chibi / super-deformed range." : m.headsTall < 6 ? "Short, youthful proportions." : m.headsTall < 7.8 ? "Typical stylized anime adult range (6-7.5)." : "Long, heroic or fashion proportions."} Head height ${m.headMethod}; treat as approximate.`, evidence: `head ${m.headHeight!.toFixed(0)} px` })
  for (const l of m.limbs) if (l.ratio > 1.35)
    findings.push({ source: "measure", check: "pose", severity: "note", title: `Left and right ${l.name} differ by ${Math.round((l.ratio - 1) * 100)}%`, detail: "Fine if one side is foreshortened toward or away from the viewer; otherwise one limb is drawn too long or too short.", evidence: `${l.left.toFixed(0)} px vs ${l.right.toFixed(0)} px` })
  // skeleton over a dimmed copy
  const ov: Img = { w: base.w, h: base.h, rgba: new Uint8Array(base.rgba) }
  for (let i = 0; i < ov.w * ov.h; i++) for (let c = 0; c < 3; c++) ov.rgba[i * 4 + c] = Math.round(ov.rgba[i * 4 + c]! * 0.45 + 140)
  drawSkeleton(ov, kp, 1, Math.max(2, Math.round(Math.max(base.w, base.h) / 300)), false)
  const t = Math.max(2, Math.round(Math.max(base.w, base.h) / 300))
  if (chin) disc(ov, chin.x, chin.y, t * 1.4, [255, 200, 0, 255])
  return { metrics: m, overlay: ov, findings }
}
