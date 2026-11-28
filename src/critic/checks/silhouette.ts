/**
 * Silhouette: the figure as black on white, to test whether pose and outfit read as a shape.
 *
 * Sources, best first: a mask you give (`--mask`, e.g. a selection saved from CSP), the file's own transparency, an
 * external segmenter (`rembg` on PATH, or any command in `CRITIC_SEGMENTER`), and last a classical fallback: model the
 * background from the border, flood it in from the edges in OKLab, keep what the flood cannot reach. The fallback is exact
 * on the usual character sheet (figure on a flat or gently graded background, closed outline) and is marked unreliable
 * when the border is busy, so the other checks then fall back to the whole image.
 */
import { execFileSync, spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { deltaE, type Lab } from "../color.ts"
import { decodeAnyPng, fit, resize, toPng, type Img } from "../image.ts"
import { components, dilate, erode, maskBox, type Planes } from "../planes.ts"
import type { Finding } from "../stages.ts"

export type SilhouetteSource = "mask" | "alpha" | "segmenter" | "border-flood"
export type SilMetrics = {
  source: SilhouetteSource; reliable: boolean; note: string
  coverage: number; box: { x: number; y: number; w: number; h: number } | null; centroid: { x: number; y: number }
  /** border pixels that match the background model */ borderUniformity: number
  /** isoperimetric quotient P²/4πA: 1 for a disc, larger for a more articulated shape */ complexity: number
  /** enclosed background holes kept as negative space */ negativeSpaces: number
  /** principal axis, degrees from vertical (positive = top leans right) */ axisTilt: number
  /** horizontal offset of the centre of mass from the centre of the base, in figure widths (positive = right) */ balance: number
  cropped: { top: boolean; bottom: boolean; left: boolean; right: boolean }
}

/** Mask (1 = figure) from a black-on-white or alpha PNG, resized to the analysis size. */
const fromImage = (img: Img, w: number, h: number): Uint8Array => {
  const r = img.w === w && img.h === h ? img : resize(img, w, h), m = new Uint8Array(w * h)
  const hasAlpha = (() => { for (let i = 0; i < w * h; i++) if (r.rgba[i * 4 + 3]! < 250) return true; return false })()
  for (let i = 0; i < w * h; i++) m[i] = hasAlpha ? (r.rgba[i * 4 + 3]! > 127 ? 1 : 0) : r.rgba[i * 4]! + r.rgba[i * 4 + 1]! + r.rgba[i * 4 + 2]! < 382 ? 1 : 0
  return m
}

const which = (cmd: string): boolean => spawnSync(process.platform === "win32" ? "where" : "which", [cmd], { stdio: "ignore" }).status === 0

/** Runs an external segmenter; `{in}` and `{out}` in the command are replaced by PNG paths. Null when none or it fails. */
export const runSegmenter = (img: Img, setting: string): { img: Img; name: string } | null => {
  if (setting === "none") return null
  const template = setting !== "auto" && setting !== "rembg" ? setting : process.env.CRITIC_SEGMENTER ?? (which("rembg") ? "rembg i {in} {out}" : null)
  if (!template) return null
  const dir = mkdtempSync(join(tmpdir(), "critic-seg-"))
  try {
    const src = join(dir, "in.png"), dst = join(dir, "out.png")
    // the segmenter sees at most 1600 px: enough for a mask, and fast
    writeFileSync(src, toPng(fit(img, 1600).img))
    const argv = template.split(/\s+/).filter(Boolean).map((a) => a.replace("{in}", src).replace("{out}", dst))
    execFileSync(argv[0]!, argv.slice(1), { stdio: "ignore", timeout: 180_000 })
    return { img: decodeAnyPng(readFileSync(dst)), name: argv[0]! }
  } catch { return null } finally { rmSync(dir, { recursive: true, force: true }) }
}

/** The classical fallback: flood the background in from the border. */
const borderFlood = (P: Planes): { mask: Uint8Array; uniformity: number } => {
  const { w, h } = P, n = w * h, lab = (i: number): Lab => [P.okL[i]!, P.a[i]!, P.b[i]!]
  const border: Array<number> = []
  for (let x = 0; x < w; x++) border.push(x, (h - 1) * w + x)
  for (let y = 1; y < h - 1; y++) border.push(y * w, y * w + w - 1)
  // the background colour: the median of the border, channel by channel
  const med = (k: (i: number) => number): number => { const v = border.map(k).sort((a, b) => a - b); return v[v.length >> 1]! }
  const bg: Lab = [med((i) => P.okL[i]!), med((i) => P.a[i]!), med((i) => P.b[i]!)]
  const dev = border.map((i) => deltaE(lab(i), bg)).sort((a, b) => a - b), mad = dev[dev.length >> 1]!
  const tol = Math.max(0.045, Math.min(0.12, mad * 4 + 0.03)), uniformity = dev.filter((d) => d < tol).length / dev.length
  const bgm = new Uint8Array(n), stack: Array<number> = []
  for (const i of border) if (!bgm[i] && deltaE(lab(i), bg) < tol) { bgm[i] = 1; stack.push(i) }
  // a step stays background when it is near the background model, or a small step from a background neighbour that is not
  // too far from the model (a gradient background)
  while (stack.length) {
    const p = stack.pop()!, x = p % w, lp = lab(p)
    for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w]) {
      if (q < 0 || q >= n || bgm[q]) continue
      const lq = lab(q), dm = deltaE(lq, bg)
      if (dm < tol || (deltaE(lq, lp) < 0.012 && dm < tol * 2.5 && P.L[q]! > 12)) { bgm[q] = 1; stack.push(q) }
    }
  }
  const fg = new Uint8Array(n)
  for (let i = 0; i < n; i++) fg[i] = bgm[i] ? 0 : 1
  return { mask: fg, uniformity }
}

export const silhouette = (P: Planes, opts: { mask?: Img | null; segmented?: { img: Img; name: string } | null }): { metrics: SilMetrics; image: Img; mask: Uint8Array; findings: Array<Finding> } => {
  const { w, h } = P, n = w * h
  let mask: Uint8Array, source: SilhouetteSource, reliable = true, note = "", uniformity = 1
  let transparent = 0
  for (let i = 0; i < n; i++) if (P.alpha[i]! < 0.5) transparent++
  if (opts.mask) { mask = fromImage(opts.mask, w, h); source = "mask"; note = "from the mask you gave" }
  else if (transparent > n * 0.02 && transparent < n * 0.98) { mask = new Uint8Array(n); for (let i = 0; i < n; i++) mask[i] = P.alpha[i]! >= 0.5 ? 1 : 0; source = "alpha"; note = "from the file's transparency" }
  else if (opts.segmented) { mask = fromImage(opts.segmented.img, w, h); source = "segmenter"; note = `from ${opts.segmented.name}` }
  else {
    const f = borderFlood(P)
    mask = f.mask; source = "border-flood"; uniformity = f.uniformity
    reliable = uniformity > 0.7
    note = reliable ? "border flood from a uniform background (no segmenter installed)" : `the background is busy (${Math.round(uniformity * 100)}% of the border matches one colour): the silhouette is a rough guess, install rembg or pass --mask`
  }
  // clean up: drop specks, fill small holes (eye whites, highlights), keep big enclosed background as negative space
  const r = Math.max(1, Math.round(Math.max(w, h) / 600))
  mask = dilate(erode(mask, w, h, r), w, h, r)
  const { comps } = components(mask, w, h), biggest = Math.max(0, ...comps.map((c) => c.area))
  const { labels } = components(mask, w, h)
  const keep = new Set(comps.filter((c) => c.area >= biggest * 0.02).map((c) => c.id))
  for (let i = 0; i < n; i++) if (mask[i] && !keep.has(labels[i]!)) mask[i] = 0
  const inv = new Uint8Array(n)
  for (let i = 0; i < n; i++) inv[i] = mask[i] ? 0 : 1
  const holes = components(inv, w, h)
  let area = 0
  for (let i = 0; i < n; i++) area += mask[i]!
  let negative = 0
  for (const c of holes.comps) {
    if (c.touchesBorder) continue
    if (c.area < area * 0.012) { for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) if (holes.labels[y * w + x] === c.id) { mask[y * w + x] = 1; area++ } }
    else negative++
  }
  // shape measures
  let perim = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x
    if (!mask[i]) continue
    sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y
    if (x === 0 || !mask[i - 1] || x === w - 1 || !mask[i + 1] || y === 0 || !mask[i - w] || y === h - 1 || !mask[i + w]) perim++
  }
  const A = area || 1, mx = sx / A, my = sy / A, cxx = sxx / A - mx * mx, cyy = syy / A - my * my, cxy = sxy / A - mx * my
  // principal axis angle; tilt from vertical, positive when the top leans right
  // the major axis of the second moments; when the shape is wider than tall the "spine" is the minor axis turned upright
  const theta = 0.5 * Math.atan2(2 * cxy, cxx - cyy)
  let vx = Math.cos(theta), vy = Math.sin(theta)
  if (Math.abs(vy) < Math.abs(vx)) [vx, vy] = [-vy, vx]
  if (vy > 0) { vx = -vx; vy = -vy } // point it up (image y grows downward)
  const tilt = (Math.atan2(vx, -vy) * 180) / Math.PI
  const box = maskBox(mask, w, h)
  // balance: centre of mass against the middle of the lowest 6% of the figure (the feet, or what stands on the ground)
  let balance = 0
  if (box) {
    let bx = 0, bn = 0
    for (let y = Math.floor(box.y + box.h * 0.94); y < box.y + box.h; y++) for (let x = box.x; x < box.x + box.w; x++) if (mask[y * w + x]) { bx += x; bn++ }
    if (bn) balance = (mx - bx / bn) / box.w
  }
  const cropped = box ? { top: box.y <= 1, bottom: box.y + box.h >= h - 1, left: box.x <= 1, right: box.x + box.w >= w - 1 } : { top: false, bottom: false, left: false, right: false }
  const metrics: SilMetrics = { source, reliable, note, coverage: area / n, box, centroid: { x: mx, y: my }, borderUniformity: uniformity, complexity: (perim * perim) / (4 * Math.PI * A), negativeSpaces: negative, axisTilt: tilt, balance, cropped }
  const img = new Uint8Array(n * 4)
  for (let i = 0; i < n; i++) { const v = mask[i] ? 0 : 255; img[i * 4] = img[i * 4 + 1] = img[i * 4 + 2] = v; img[i * 4 + 3] = 255 }
  const findings: Array<Finding> = []
  if (!reliable) findings.push({ source: "measure", check: "silhouette", severity: "note", title: "Silhouette could not be separated reliably", detail: note, fix: "Export with the background layer hidden (transparent PNG), or pass a mask: select the figure in CSP, Selection > Convert to layer, fill black, export that layer." })
  if (reliable && box) {
    const fullFigure = !cropped.bottom && !cropped.top
    const whole = !cropped.top && !cropped.bottom && !cropped.left && !cropped.right
    if (whole && metrics.complexity < 2 && negative === 0)
      findings.push({ source: "measure", check: "silhouette", severity: "minor", title: "Silhouette is a closed blob", detail: "The figure's outline is compact and has no negative space (gaps between arms and body, legs, hair and shoulders). Pose and costume do not read from the shape alone.", fix: "Open the shape: separate an arm from the torso, angle the legs, let hair or a prop break the outline. Test with a Fill layer of solid black clipped over the figure folder.", evidence: `complexity ${metrics.complexity.toFixed(2)} (a disc is 1), negative spaces ${negative}` })
    if (fullFigure && Math.abs(tilt) > 7 && Math.abs(tilt) < 45)
      findings.push({ source: "measure", check: "flip", severity: Math.abs(tilt) > 12 ? "major" : "minor", title: `The figure leans ${tilt > 0 ? "right" : "left"} by ${Math.abs(tilt).toFixed(0)}°`, detail: "The main axis of the silhouette is off vertical. If the pose is not meant to lean (a run, a dynamic action), the figure will look like it is tipping over, which the flipped view makes obvious.", fix: "Flip the canvas (View > Rotate/Invert > Flip horizontal) to confirm, then rotate the figure folder with Edit > Transform > Rotate, or straighten the spine with Mesh transformation.", evidence: `principal axis ${tilt.toFixed(1)}° from vertical`, point: { x: mx, y: my } })
    if (fullFigure && Math.abs(balance) > 0.22)
      findings.push({ source: "measure", check: "flip", severity: Math.abs(balance) > 0.35 ? "major" : "minor", title: "Centre of mass is outside the base", detail: `The figure's weight sits ${Math.round(Math.abs(balance) * 100)}% of its width to the ${balance > 0 ? "right" : "left"} of where it stands. Unless it is moving, it reads as falling.`, fix: "Move the feet under the centre of mass (the pit of the neck should sit above the weight-bearing foot), or tilt the torso back over the base.", evidence: `balance offset ${balance.toFixed(2)} figure widths`, point: { x: mx, y: my } })
  }
  return { metrics, image: { w, h, rgba: img }, mask, findings }
}
