/**
 * Focal area: where the eye goes (a saliency map from value contrast, colour contrast and edge density), where the face is
 * (pose keypoints, else a skin-tone heuristic inside the silhouette, else the top of the silhouette), and high-resolution
 * crops of the face, upper body, hands and the strongest attractors, cut from the full-size source so the AI critic can
 * inspect eyes, hair strands and line quality that a downscaled whole picture hides.
 */
import { heat } from "../color.ts"
import { blank, clampBox, crop, fit, type Box, type Img } from "../image.ts"
import { blur, components, percentile, shrink, type Planes } from "../planes.ts"
import type { Finding } from "../stages.ts"
import type { Keypoints } from "./pose.ts"
import type { Hotspot } from "./saturation.ts"

export type Crop = { name: string; why: string; box: Box; img: Img }
export type FocalMetrics = {
  face: { box: Box; method: "pose" | "skin" | "silhouette-top" | "focus-flag" | "none"; confidence: number } | null
  focus: Box | null
  peaks: Array<{ x: number; y: number; value: number; inFocus: boolean }>
  /** saliency inside the focus against the strongest attractor outside it */ focusShare: number
}

const saliencyMap = (P: Planes): { sal: Float32Array; w: number; h: number; s: number } => {
  const T = 256, s = T / Math.max(P.w, P.h), w = Math.max(1, Math.round(P.w * s)), h = Math.max(1, Math.round(P.h * s))
  const L = shrink(P.L, P.w, P.h, w, h), A = shrink(P.a, P.w, P.h, w, h), B = shrink(P.b, P.w, P.h, w, h)
  const c = (v: Float32Array): Float32Array => blur(v, w, h, 1), sr = (v: Float32Array): Float32Array => blur(v, w, h, 7)
  const Lc = c(L), Ls = sr(L), Ac = c(A), As = sr(A), Bc = c(B), Bs = sr(B)
  const lum = new Float32Array(w * h), chr = new Float32Array(w * h), edge = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) { lum[i] = Math.abs(Lc[i]! - Ls[i]!); chr[i] = Math.hypot(Ac[i]! - As[i]!, Bc[i]! - Bs[i]!) }
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; edge[i] = Math.hypot(L[i + 1]! - L[i - 1]!, L[i + w]! - L[i - w]!) }
  const ed = blur(edge, w, h, 3), norm = (v: Float32Array): Float32Array => { const p = percentile(v, 0.99) || 1; return v.map((x) => Math.min(1, x / p)) }
  const nl = norm(lum), nc = norm(chr), ne = norm(ed), sal = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) sal[i] = 0.45 * nl[i]! + 0.3 * nc[i]! + 0.25 * ne[i]!
  return { sal: blur(sal, w, h, 3), w, h, s }
}

/** Warm, light, moderately chromatic: anime skin in OKLab, including shaded skin. */
const isSkin = (P: Planes, i: number): boolean => {
  const L = P.okL[i]!, C = P.C[i]!, hue = (Math.atan2(P.b[i]!, P.a[i]!) * 180) / Math.PI
  return L > 0.6 && L < 0.97 && C > 0.018 && C < 0.14 && hue > 15 && hue < 68
}

const faceFrom = (P: Planes, fg: Uint8Array | null, figure: Box | null, kp: Keypoints | null): FocalMetrics["face"] => {
  const pt = (n: string): { x: number; y: number } | null => { const q = kp?.points[n]; return q && q.score > 0.3 ? q : null }
  const le = pt("left_eye"), re = pt("right_eye"), nose = pt("nose")
  const { w, h } = P, n = w * h, skin = new Uint8Array(n)
  if (le && re) {
    const d = Math.hypot(le.x - re.x, le.y - re.y), cx = (le.x + re.x) / 2, cy = (le.y + re.y) / 2 + (nose ? (nose.y - (le.y + re.y) / 2) * 0.6 : d * 0.3), side = Math.max(8, d * 3.4)
    const box = { x: cx - side / 2, y: cy - side * 0.55, w: side, h: side * 1.1 }
    // trust the keypoints only if there is skin where they put the face
    let sk = 0, all = 0
    for (let y = Math.max(0, Math.floor(box.y)); y < Math.min(h, box.y + box.h); y++) for (let x = Math.max(0, Math.floor(box.x)); x < Math.min(w, box.x + box.w); x++) { all++; if (isSkin(P, y * w + x)) sk++ }
    if (all && sk / all > 0.12) return { box, method: "pose", confidence: 0.8 }
  }
  const top = figure ? figure.y : 0, limit = figure ? figure.y + figure.h * 0.55 : h * 0.6
  for (let y = Math.max(0, Math.floor(top)); y < Math.min(h, limit); y++) for (let x = 0; x < w; x++) { const i = y * w + x; if ((!fg || fg[i]) && isSkin(P, i)) skin[i] = 1 }
  const cands = components(skin, w, h).comps.filter((c) => c.area > n * 0.0015)
  // the face: among the sizeable skin patches in the upper part of the figure, the one with the most dark detail inside it
  // (eyes, lashes, brows, mouth). A bare shoulder or a tan goggle lens is skin-coloured too, but smooth inside.
  const big = Math.max(0, ...cands.map((c) => c.area)), figTop = figure ? figure.y : 0, figH = figure ? figure.h : h
  const detail = (c: (typeof cands)[number]): number => {
    const bw = c.x1 - c.x0 + 1, bh = Math.min(c.y1 - c.y0 + 1, bw * 1.2), x0 = c.x0 + bw * 0.12, x1 = c.x1 - bw * 0.12, y0 = c.y0 + bh * 0.12, y1 = c.y0 + bh * 0.88
    let d = 0, k = 0
    for (let y = Math.floor(y0); y < y1; y++) for (let x = Math.floor(x0); x < x1; x++) { k++; if (P.L[y * w + x]! < 32) d++ }
    return k ? d / k : 0
  }
  const scored = cands.filter((q) => q.area >= big * 0.15 && q.y0 < figTop + figH * 0.3).map((q) => ({ q, d: detail(q) })).sort((a, b) => b.d - a.d || a.q.y0 - b.q.y0)
  const c = scored[0]?.q
  if (c) {
    // face, neck and chest can be one patch: keep its top, about as tall as it is wide
    const bw = c.x1 - c.x0 + 1, bh = Math.min(c.y1 - c.y0 + 1, bw * 1.15)
    return { box: { x: c.x0 - bw * 0.15, y: c.y0 - bh * 0.3, w: bw * 1.3, h: bh * 1.4 }, method: "skin", confidence: scored[0]!.d > 0.02 ? 0.5 : 0.35 }
  }
  if (figure && fg) {
    const bandH = Math.min(figure.h * 0.2, figure.w * 0.7)
    let sx = 0, cnt = 0
    for (let y = Math.floor(figure.y); y < figure.y + bandH; y++) for (let x = Math.floor(figure.x); x < figure.x + figure.w; x++) if (fg[y * w + x]) { sx += x; cnt++ }
    const cx = cnt ? sx / cnt : figure.x + figure.w / 2
    return { box: { x: cx - bandH / 2, y: figure.y, w: bandH, h: bandH }, method: "silhouette-top", confidence: 0.25 }
  }
  return null
}

export const focal = (P: Planes, opts: { fg: Uint8Array | null; figure: Box | null; source: Img; toSource: number; keypoints: Keypoints | null; focus: Box | null; hotspots: Array<Hotspot> }): { metrics: FocalMetrics; saliency: Img; crops: Array<Crop>; findings: Array<Finding> } => {
  const S = saliencyMap(P), { sal, w: sw, h: sh, s } = S
  // peaks by non-maximum suppression
  const rad = Math.round(Math.max(sw, sh) * 0.12), cand: Array<{ x: number; y: number; v: number }> = []
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) cand.push({ x, y, v: sal[y * sw + x]! })
  cand.sort((a, b) => b.v - a.v)
  const peaks: Array<{ x: number; y: number; v: number }> = []
  for (const c of cand) { if (peaks.length >= 4 || c.v < (peaks[0]?.v ?? 0) * 0.35) break; if (peaks.every((p) => Math.hypot(p.x - c.x, p.y - c.y) > rad)) peaks.push(c) }
  const face = opts.focus ? { box: opts.focus, method: "focus-flag" as const, confidence: 1 } : faceFrom(P, opts.fg, opts.figure, opts.keypoints)
  const focusBox = face ? clampBox(face.box, P.w, P.h) : null
  const inBox = (b: Box | null, x: number, y: number, pad = 0): boolean => !!b && x >= b.x - pad && y >= b.y - pad && x <= b.x + b.w + pad && y <= b.y + b.h + pad
  const meanIn = (b: Box): number => { let t = 0, n = 0; for (let y = Math.floor(b.y * s); y <= (b.y + b.h) * s && y < sh; y++) for (let x = Math.floor(b.x * s); x <= (b.x + b.w) * s && x < sw; x++) { t += sal[y * sw + x]!; n++ } return n ? t / n : 0 }
  const metrics: FocalMetrics = { face, focus: focusBox, peaks: peaks.map((p) => ({ x: p.x / s, y: p.y / s, value: p.v, inFocus: inBox(focusBox, p.x / s, p.y / s, (focusBox?.w ?? 0) * 0.25) })), focusShare: 1 }
  const findings: Array<Finding> = []
  if (focusBox) {
    const f = meanIn(focusBox), out = metrics.peaks.find((p) => !p.inFocus)
    if (out) {
      const win = { x: out.x - rad / s / 2, y: out.y - rad / s / 2, w: rad / s, h: rad / s }, o = meanIn(win)
      metrics.focusShare = f / (o || 1)
      if (o > f * 1.15 && metrics.peaks[0] && !metrics.peaks[0].inFocus)
        findings.push({ source: "measure", check: "focal", severity: o > f * 1.5 ? "major" : "minor", title: "Another area out-pulls the focal point", detail: `The strongest contrast and detail are away from the ${face?.method === "focus-flag" ? "focus you gave" : "face"}. The eye lands there first, then has to find the face.`, fix: "Lower contrast, saturation or detail at the competing area (a soft Gaussian blur on a duplicated layer, a Tone curve lowering contrast, fewer highlights), or raise it at the face (sharper eye highlights, a rim light, the deepest dark next to the lightest light).", evidence: `saliency at the attractor ${o.toFixed(2)} vs focus ${f.toFixed(2)}`, region: clampBox(win, P.w, P.h) })
    }
    for (const hs of opts.hotspots) {
      if (hs.area < 0.012 || inBox(focusBox, hs.cx, hs.cy, focusBox.w * 0.5)) continue
      findings.push({ source: "measure", check: "saturation", severity: "minor", title: "Saturated area away from the focus", detail: `A large highly-saturated area (${(hs.area * 100).toFixed(1)}% of the picture) sits away from the focal point and competes with it for attention.`, fix: "Desaturate or darken it slightly (Hue/Saturation/Luminosity on its layer, or a clipped Multiply in a neutral colour), or move the accent colour next to the face.", evidence: `hotspot area ${(hs.area * 100).toFixed(1)}%`, region: { x: hs.x, y: hs.y, w: hs.w, h: hs.h } })
      break
    }
  }
  if (face && face.method !== "focus-flag" && face.confidence < 0.3)
    findings.push({ source: "measure", check: "focal", severity: "note", title: "Face position is a guess", detail: "No pose keypoints and no skin-coloured area were found, so the face is assumed at the top of the silhouette. Pass --focus x,y,w,h (canvas px) to set the focal area.", fix: "" })
  // saliency picture
  const img = blank(sw, sh)
  for (let i = 0; i < sw * sh; i++) { const [r, g, b] = heat(sal[i]!); img.rgba.set([r, g, b, 255], i * 4) }
  // crops, from the full-size source
  const k = opts.toSource, crops: Array<Crop> = [], src = opts.source
  const add = (name: string, why: string, b: Box): void => { const c = clampBox({ x: b.x * k, y: b.y * k, w: b.w * k, h: b.h * k }, src.w, src.h); if (c.w >= 16 && c.h >= 16) crops.push({ name, why, box: c, img: fit(crop(src, c), 1568).img }) }
  if (face && focusBox) {
    // never tighter than a sixth of the figure: a patch of cheek must still give the whole face
    const fb = face.box, cx = fb.x + fb.w / 2, side = Math.max(Math.max(fb.w, fb.h) * 1.5, (opts.figure?.h ?? 0) / 6)
    add(face.method === "focus-flag" ? "focus" : "face", face.method === "focus-flag" ? "the focal area you set" : `face (${face.method})`, { x: cx - side / 2, y: fb.y + fb.h / 2 - side / 2, w: side, h: side })
    if (face.method !== "focus-flag") add("upper-body", "face, shoulders and chest at full resolution", { x: cx - fb.w * 1.9, y: fb.y - fb.h * 0.3, w: fb.w * 3.8, h: fb.h * 3.6 })
  }
  for (const hand of ["left_wrist", "right_wrist"]) {
    const q = opts.keypoints?.points[hand]
    if (q && q.score > 0.3 && face) { const side = Math.max(face.box.w, face.box.h) * 1.3; add(hand.replace("_wrist", "-hand"), "hands are where anatomy breaks first", { x: q.x - side / 2, y: q.y - side / 2, w: side, h: side }) }
  }
  metrics.peaks.filter((p) => !p.inFocus).slice(0, 2).forEach((p, i) => { const side = Math.max(P.w, P.h) * 0.22; add(`attractor-${i + 1}`, "a strong attractor away from the focus", { x: p.x - side / 2, y: p.y - side / 2, w: side, h: side }) })
  return { metrics, saliency: img, crops, findings }
}
