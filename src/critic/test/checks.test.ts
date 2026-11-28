import assert from "node:assert/strict"
import { test } from "node:test"
import { focal } from "../checks/focal.ts"
import { checkKeypoints, parseKeypoints, pose } from "../checks/pose.ts"
import { saturation } from "../checks/saturation.ts"
import { silhouette } from "../checks/silhouette.ts"
import { squint } from "../checks/squint.ts"
import { otsu3, values } from "../checks/values.ts"
import { blank, flatten, type Img } from "../image.ts"
import { planes } from "../planes.ts"
import { figure, fillRect } from "./util.ts"

const sil = (img: Img) => { const flat = flatten(img); return silhouette(planes(flat, img), {}) }

test("silhouette: border flood finds an outlined figure on a white page", () => {
  const s = sil(figure())
  assert.equal(s.metrics.source, "border-flood")
  assert.ok(s.metrics.reliable)
  const expected = (Math.PI * 300 * 0.18 * 420 * 0.4) / (300 * 420)
  assert.ok(Math.abs(s.metrics.coverage - expected) < 0.01, `coverage ${s.metrics.coverage} vs ${expected}`)
  assert.ok(Math.abs(s.metrics.axisTilt) < 1)
})

test("silhouette: a tilted figure reports the lean with its direction", () => {
  const right = sil(figure({ deg: 15 })), left = sil(figure({ deg: -15 }))
  assert.ok(Math.abs(right.metrics.axisTilt - 15) < 1.5, `right ${right.metrics.axisTilt}`)
  assert.ok(Math.abs(left.metrics.axisTilt + 15) < 1.5, `left ${left.metrics.axisTilt}`)
  const f = right.findings.find((x) => x.check === "flip")
  assert.ok(f && /leans right/.test(f.title))
})

test("silhouette: transparency is used when the file has it", () => {
  const s = sil(figure({ bg: [0, 0, 0, 0] }))
  assert.equal(s.metrics.source, "alpha")
})

test("silhouette: a busy background is flagged as unreliable instead of guessed silently", () => {
  const img = figure()
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if (((x >> 3) + (y >> 3)) % 2 && img.rgba[(y * img.w + x) * 4] === 255) img.rgba.set([200, 30, 30, 255], (y * img.w + x) * 4)
  const s = sil(img)
  assert.equal(s.metrics.reliable, false)
  assert.ok(s.findings.some((f) => /reliably/.test(f.title)))
})

test("otsu3 splits a three-mode histogram between the modes", () => {
  const h = new Array<number>(101).fill(0)
  h[15] = 100; h[50] = 100; h[85] = 100
  const [a, b] = otsu3(h)
  assert.ok(a > 15 && a <= 50 && b > 50 && b <= 85, `${a} ${b}`)
})

test("values: a picture squeezed into the mid-tones is flagged, a strong one is not", () => {
  const flat = blank(120, 120, [128, 128, 128, 255])
  fillRect(flat, 0, 0, 60, 120, [110, 112, 115]); fillRect(flat, 60, 0, 60, 60, [140, 138, 135])
  const muddy = values(planes(flat), null)
  assert.ok(muddy.findings.some((f) => /compressed/.test(f.title)))
  assert.ok(muddy.findings.some((f) => /mud/i.test(f.title)))
  const strong = blank(120, 120, [20, 20, 30, 255])
  fillRect(strong, 40, 0, 40, 120, [120, 90, 160]); fillRect(strong, 80, 0, 40, 120, [250, 240, 220])
  const s = values(planes(strong), null)
  assert.ok(s.metrics.range > 60)
  assert.equal(s.findings.filter((f) => /compressed|too close/.test(f.title)).length, 0)
})

test("saturation: everything at full saturation is flagged; the palette finds the fills", () => {
  const img = blank(100, 100, [255, 0, 40, 255])
  fillRect(img, 0, 0, 30, 100, [20, 200, 60])
  const P = planes(img), s = saturation(P, null)
  assert.ok(s.findings.some((f) => /full saturation/.test(f.title)))
  assert.equal(s.metrics.palette[0]!.hex.slice(0, 3), "#ff")
  assert.ok(Math.abs(s.metrics.palette[0]!.share - 0.7) < 0.05)
})

test("squint: a nearly flat picture disappears, a contrasty one does not", () => {
  const flat = blank(100, 100, [120, 120, 120, 255])
  fillRect(flat, 40, 40, 20, 20, [126, 126, 126])
  assert.ok(squint(planes(flat), flat).findings.length > 0)
  const strong = blank(100, 100, [240, 240, 240, 255])
  fillRect(strong, 30, 20, 40, 60, [20, 20, 20])
  const s = squint(planes(strong), strong)
  assert.equal(s.findings.length, 0)
  assert.ok(Math.abs(s.metrics.peak.x - 50) < 30 && Math.abs(s.metrics.peak.y - 50) < 40)
})

test("focal: a loud area away from the focus you set is flagged", () => {
  const img = blank(300, 300, [235, 235, 235, 255])
  fillRect(img, 20, 20, 60, 60, [200, 190, 180]) // a quiet focus
  fillRect(img, 200, 200, 70, 70, [255, 0, 30]) // a loud corner
  for (let i = 0; i < 70; i += 6) fillRect(img, 200 + i, 200, 2, 70, [10, 10, 10])
  const P = planes(img), sat = saturation(P, null)
  const f = focal(P, { fg: null, figure: null, source: img, toSource: 1, keypoints: null, focus: { x: 20, y: 20, w: 60, h: 60 }, hotspots: sat.metrics.hotspots })
  assert.ok(f.findings.some((x) => /out-pulls/.test(x.title)), JSON.stringify(f.findings.map((x) => x.title)))
  const r = f.findings.find((x) => /out-pulls/.test(x.title))!.region!
  assert.ok(r.x > 120 && r.y > 120)
  assert.ok(f.crops.some((c) => c.name === "focus"))
})

test("pose: OpenPose BODY_25 JSON is read, and contrapposto is recognised", () => {
  const body = new Array<number>(75).fill(0), set = (i: number, x: number, y: number): void => { body[i * 3] = x; body[i * 3 + 1] = y; body[i * 3 + 2] = 0.9 }
  set(0, 100, 40); set(15, 92, 32); set(16, 108, 32); set(2, 70, 80); set(5, 130, 90); set(9, 80, 200); set(12, 120, 190); set(11, 78, 380); set(14, 122, 380)
  const kp = parseKeypoints({ people: [{ pose_keypoints_2d: body }] }, 200, 400, "test")!
  assert.equal(kp.points.right_shoulder!.x, 70)
  const p = pose(kp, blank(200, 400, [255, 255, 255, 255]), 395)
  assert.equal(p.metrics!.counter, "contrapposto")
  assert.ok(p.metrics!.shoulderTilt! > 0 && p.metrics!.hipTilt! < 0)
  assert.ok(p.metrics!.headsTall! > 3 && p.metrics!.headsTall! < 12)
  assert.ok(p.overlay)
})

test("pose: normalized coordinates are scaled; no keypoints means a clear skip", () => {
  const kp = parseKeypoints({ points: { nose: [0.5, 0.25, 1] } }, 200, 400, "t")!
  assert.deepEqual([kp.points.nose!.x, kp.points.nose!.y], [100, 100])
  const p = pose(null, blank(10, 10), null)
  assert.equal(p.metrics, null)
  assert.match(p.skipped!, /no pose estimator/)
})

test("pose: a head placed halfway down the figure is rejected", () => {
  const kp = parseKeypoints({ points: { nose: [100, 220, 1], left_eye: [95, 215, 1], left_hip: [90, 250, 1], left_knee: [90, 320, 1] } }, 200, 400, "t")!
  const fg = new Uint8Array(200 * 400).fill(1)
  const r = checkKeypoints(kp, fg, 200, 400, { x: 50, y: 10, w: 100, h: 380 }, false)
  assert.ok(!r.kp.points.nose && r.kp.points.left_hip)
  assert.match(r.dropped!, /upper body was ignored/)
})
