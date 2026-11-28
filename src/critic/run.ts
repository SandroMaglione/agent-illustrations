/**
 * One review: load, measure, optionally critique, and write the report, the redline and the data next to each other.
 *
 *   <out>/report.html     self-contained review (every image embedded)
 *   <out>/redline.png     transparent overlay at canvas size, numbered like the report
 *   <out>/findings.json   every finding, canvas px
 *   <out>/metrics.json    every measurement
 *   <out>/views/*.png     greyscale, notan, saturation, mud, silhouette, flip, squint, saliency, pose
 *   <out>/crops/*.png     high-resolution focal crops
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { basename, extname, join } from "node:path"
import { focal } from "./checks/focal.ts"
import { checkKeypoints, loadKeypointsFile, pose, runPoseCommand, type Keypoints } from "./checks/pose.ts"
import { saturation } from "./checks/saturation.ts"
import { runSegmenter, silhouette } from "./checks/silhouette.ts"
import { squint } from "./checks/squint.ts"
import { values } from "./checks/values.ts"
import { decodeAnyPng, fit, flatten, loadSource, toPng, type Box, type Img } from "./image.ts"
import { planes } from "./planes.ts"
import { redline } from "./redline.ts"
import { report } from "./report.ts"
import { PROFILES, weigh, type Finding, type Stage } from "./stages.ts"
import { critique, DEFAULT_MODEL, type ClientLike, type CritiqueResult } from "./vlm.ts"

export type Options = {
  stage: Stage
  out: string
  ai: boolean
  model?: string
  mask?: string
  keypoints?: string
  poseCmd?: string
  segmenter?: string
  /** canvas px */ focus?: Box
  /** analysis resolution (long side) */ work?: number
  client?: ClientLike
  quiet?: boolean
}
export type Result = { out: string; findings: Array<Finding>; ai: CritiqueResult | null; files: Record<string, string> }

const RANK = { major: 0, minor: 1, note: 2 }

export const analyze = async (path: string, o: Options): Promise<Result> => {
  const log = (s: string): void => { if (!o.quiet) process.stdout.write(`${s}\n`) }
  const src = loadSource(path), { canvas } = src
  const flat = flatten(src.img), work = fit(flat, o.work ?? 1200), workA = fit(src.img, o.work ?? 1200), W = work.img
  // analysis px -> canvas px, and source px -> canvas px (a .clip preview can be smaller than its canvas)
  const toCanvas = canvas.w / W.w, srcToCanvas = canvas.w / src.img.w
  const P = planes(W, workA.img)
  let transparent = 0
  for (let i = 0; i < W.w * W.h; i++) if (P.alpha[i]! < 0.5) transparent++
  const needSeg = !o.mask && !(transparent > W.w * W.h * 0.02 && transparent < W.w * W.h * 0.98)
  const sil = silhouette(P, { mask: o.mask ? decodeAnyPng(readFileSync(o.mask)) : null, segmented: needSeg ? runSegmenter(src.img, o.segmenter ?? "auto") : null })
  const fg = sil.metrics.reliable ? sil.mask : null
  const val = values(P, fg), sat = saturation(P, fg), sq = squint(P, W)
  let kp: Keypoints | null = null, poseWhy: string | undefined
  const poseCmd = o.poseCmd ?? process.env.CRITIC_POSE_CMD
  if (o.keypoints) { kp = loadKeypointsFile(o.keypoints, src.img.w, src.img.h); if (!kp) poseWhy = `no keypoints could be read from ${o.keypoints}` }
  else if (poseCmd) { kp = runPoseCommand(flat, poseCmd); if (!kp) poseWhy = "the pose estimator failed or found no figure (estimators trained on photos often miss cropped or highly stylized figures; --keypoints takes hand-placed or DWPose points)" }
  if (kp && Object.values(kp.points).filter((p) => p.score >= 0.3).length < 4) { kp = null; poseWhy = "the pose estimator found too few confident keypoints" }
  if (kp) for (const p of Object.values(kp.points)) { p.x *= work.scale; p.y *= work.scale }
  let poseDropped: string | null = null
  if (kp) ({ kp, dropped: poseDropped } = checkKeypoints(kp, fg, W.w, W.h, sil.metrics.box, sil.metrics.cropped.top))
  const focus = o.focus ? { x: o.focus.x / toCanvas, y: o.focus.y / toCanvas, w: o.focus.w / toCanvas, h: o.focus.h / toCanvas } : null
  const foc = focal(P, { fg, figure: sil.metrics.box, source: flat, toSource: 1 / work.scale, keypoints: kp, focus, hotspots: sat.metrics.hotspots })
  const po = pose(kp, W, sil.metrics.box ? sil.metrics.box.y + sil.metrics.box.h : null)
  if (poseWhy) po.skipped = poseWhy
  if (poseDropped) po.findings.push({ source: "measure", check: "pose", severity: "note", title: "Some pose keypoints were implausible and ignored", detail: `The estimator's points contradict the silhouette: ${poseDropped}. Pose metrics use only the remaining points.`, fix: "For stylized figures, place keypoints by hand or with DWPose and pass them with --keypoints." })

  // measured findings, analysis px -> canvas px, weighed by stage, most severe first
  const sc = (f: Finding): Finding => ({ ...f, region: f.region && { x: f.region.x * toCanvas, y: f.region.y * toCanvas, w: f.region.w * toCanvas, h: f.region.h * toCanvas }, point: f.point && { x: f.point.x * toCanvas, y: f.point.y * toCanvas } })
  const measured = [...val.findings, ...sat.findings, ...sil.findings, ...sq.findings, ...foc.findings, ...po.findings].map(sc).map((f) => weigh(f, o.stage)).sort((a, b) => RANK[a.severity] - RANK[b.severity])
  const metrics = {
    file: basename(path), kind: src.kind, canvas, stage: o.stage, analysedAt: [W.w, W.h], notes: src.notes,
    values: { ...val.metrics, histogram: undefined }, saturation: sat.metrics, silhouette: sil.metrics, squint: sq.metrics,
    focal: foc.metrics, pose: po.metrics ?? { skipped: po.skipped },
  }
  const cropsCanvas = foc.crops.map((c) => ({ ...c, box: { x: c.box.x * srcToCanvas, y: c.box.y * srcToCanvas, w: c.box.w * srcToCanvas, h: c.box.h * srcToCanvas } }))

  let ai: CritiqueResult | null = null
  if (o.ai) {
    log(`  asking ${o.model ?? DEFAULT_MODEL} for a ${o.stage} critique...`)
    // metrics for the model: rounded and without the histogram, so they stay short
    const brief = JSON.parse(JSON.stringify(metrics, (_k, v) => (typeof v === "number" ? Math.round(v * 1000) / 1000 : v)))
    ai = await critique({ stage: o.stage, canvas, full: flat, grey: val.grey, notan: val.notan, crops: cropsCanvas, measured, metrics: brief, note: src.notes.join(" ") }, { model: o.model, client: o.client })
    if (!ai.ok) log(`  AI critique unavailable: ${ai.reason}`)
  }
  const all = [...measured, ...(ai?.ok ? ai.findings : [])].sort((a, b) => RANK[a.severity] - RANK[b.severity])
  all.forEach((f, i) => { f.n = i + 1 })

  // eye flow: the focus first, then the attractors by strength
  const peaks = [...foc.metrics.peaks].sort((a, b) => Number(b.inFocus) - Number(a.inFocus) || b.value - a.value)
  const red = redline(canvas.w, canvas.h, all, {
    focus: foc.metrics.focus && { x: foc.metrics.focus.x * toCanvas, y: foc.metrics.focus.y * toCanvas, w: foc.metrics.focus.w * toCanvas, h: foc.metrics.focus.h * toCanvas },
    flow: peaks.map((p) => ({ x: p.x * toCanvas, y: p.y * toCanvas })),
    axis: sil.metrics.reliable && sil.metrics.box && !sil.metrics.cropped.top && !sil.metrics.cropped.bottom ? { x: sil.metrics.centroid.x * toCanvas, y: sil.metrics.centroid.y * toCanvas, tilt: sil.metrics.axisTilt, length: sil.metrics.box.h * toCanvas } : undefined,
  })

  const views: Record<string, Img> = { grey: val.grey, notan: val.notan, saturation: sat.heatmap, mud: val.mud, silhouette: sil.image, flip: sq.flipped, squint: sq.blurred, saliency: foc.saliency }
  if (po.overlay) views.pose = po.overlay
  rmSync(join(o.out, "crops"), { recursive: true, force: true })
  mkdirSync(join(o.out, "views"), { recursive: true }); mkdirSync(join(o.out, "crops"), { recursive: true })
  const files: Record<string, string> = {}
  const put = (rel: string, data: Buffer | string): void => { writeFileSync(join(o.out, rel), data); files[rel] = join(o.out, rel) }
  for (const [k, v] of Object.entries(views)) put(`views/${k}.png`, toPng(v))
  for (const c of foc.crops) put(`crops/${c.name}.png`, toPng(c.img))
  put("redline.png", toPng(red))
  put("findings.json", JSON.stringify(all, null, 2))
  put("metrics.json", JSON.stringify({ ...metrics, ai: ai?.ok ? { model: ai.model, critique: ai.critique, usage: ai.usage } : ai ? { error: ai.reason } : { skipped: "--no-ai" } }, null, 2))
  put("report.html", report({ title: basename(path, extname(path)), path, stage: o.stage, profile: PROFILES[o.stage], canvas, notes: src.notes, original: work.img, views, red, crops: cropsCanvas, findings: all, val: val.metrics, sat: sat.metrics, sil: sil.metrics, sq: sq.metrics, foc: foc.metrics, pose: po.metrics, poseSkipped: po.skipped, ai }))
  return { out: o.out, findings: all, ai, files }
}

export const summary = (r: Result): string => {
  const c = { major: 0, minor: 0, note: 0 }
  for (const f of r.findings) c[f.severity]++
  const top = r.findings.filter((f) => f.severity !== "note").slice(0, 5).map((f) => `  ${f.n}. [${f.severity}${f.source === "ai" ? ", AI" : ""}] ${f.title}`)
  return [`  ${c.major} major, ${c.minor} minor, ${c.note} notes${r.ai ? (r.ai.ok ? " (with AI critique)" : " (AI critique unavailable)") : " (measurements only)"}`, ...top, `  report:  ${r.files["report.html"]}`, `  redline: ${r.files["redline.png"]}`].join("\n")
}
