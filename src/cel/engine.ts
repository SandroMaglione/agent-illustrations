/**
 * Draws authored parts by a Style. The author supplies silhouettes, where the
 * big forms turn, and what each thing is made of. The style derives the rest:
 * crescents of shade, the band at their edge, bounced rim, line weight, ink
 * pooling in corners, separation halos, grain.
 */
import { canvas, ctxOf, fill, halftone, ribbon, sharedField, tile, texture, trace } from "../brush.ts"
import type { Ctx } from "../brush.ts"
import { bounds, clamp, noise1, resample } from "../geo.ts"
import type { P2 } from "../geo.ts"
import { tones } from "./style.ts"
import type { Mat, Style, Tones } from "./style.ts"

export type InnerLine = { pts: ReadonlyArray<P2>; w?: number; ends?: "both" | "in" | "out" | "none"; soft?: boolean }
export type Part = {
  id: string; d: ReadonlyArray<P2>; mat: string
  /** Authored shadow forms; `deep` is the second step. */
  shade?: ReadonlyArray<ReadonlyArray<P2>>; deep?: ReadonlyArray<ReadonlyArray<P2>>
  /** Width of the derived crescent on the side away from the light. */
  auto?: number
  hi?: ReadonlyArray<ReadonlyArray<P2>>; lines?: ReadonlyArray<InnerLine>
  /** Parts that throw a shadow on this one, with their offset. */
  from?: ReadonlyArray<readonly [string, number, number]>
  clip?: string; sep?: boolean; line?: number; rim?: boolean; noSil?: boolean; open?: ReadonlyArray<P2>
  /** Flat marks printed on the surface. */
  decal?: (g: Ctx, t: (m: string) => Tones) => void
  /** Drawn straight, with no shading at all. */
  flat?: boolean
  paint?: (g: Ctx, t: (m: string) => Tones, s: Style) => void
}
export type Sheet = { w: number; h: number; parts: ReadonlyArray<Part>; mats: Readonly<Record<string, Mat>>; back?: (g: Ctx, s: Style) => void }

const move = (p: ReadonlyArray<P2>, dx: number, dy: number): Array<P2> => p.map(([x, y]) => [x + dx, y + dy] as const)
const poly = (g: Ctx, p: ReadonlyArray<P2>, w: number, color: string): void => {
  trace(g, p)
  g.lineJoin = "miter"
  g.miterLimit = 7
  g.lineWidth = w
  g.strokeStyle = color
  g.stroke()
}

/** Outline with a little breath in it: heavier on the shade side. */
const contour = (g: Ctx, p: ReadonlyArray<P2>, w: number, color: string, s: Style, closed: boolean): void => {
  const q = resample(closed ? [...p, p[0]!] : p, 3)
  const n = noise1(`c${Math.round(p[0]![0])}${Math.round(p[0]![1])}`)
  let sgn = 0
  for (let i = 0; i < p.length; i++) { const a = p[i]!, b = p[(i + 1) % p.length]!; sgn += a[0] * b[1] - b[0] * a[1] }
  const side = sgn > 0 ? 1 : -1
  ribbon(g, q, (t, i) => {
    const a = q[Math.max(0, i - 2)]!, b = q[Math.min(q.length - 1, i + 2)]!
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    const nx = ((b[1] - a[1]) / l) * side, ny = (-(b[0] - a[0]) / l) * side
    const away = -(nx * s.light.dir[0] + ny * s.light.dir[1])
    const end = closed ? 1 : Math.min(1, Math.min(t, 1 - t) * 8 + 0.25)
    return w * (1 + 0.3 * clamp(away, -0.6, 1) + 0.12 * n(i / 26)) * end
  }, color)
}
export const inkStroke = (g: Ctx, l: InnerLine, w: number, color: string): void => {
  const q = resample(l.pts, 2.5)
  const e = l.ends ?? "both"
  ribbon(g, q, (t) => {
    const a = e === "both" || e === "in" ? Math.min(1, t * 3.2 + 0.08) : 1
    const b = e === "both" || e === "out" ? Math.min(1, (1 - t) * 2.2 + 0.05) : 1
    return w * (l.w ?? 1) * Math.min(a, b) ** 0.8
  }, color)
}

/** Closing on the ink: narrow wedges between meeting lines fill up, as a brush does. */
const poolInk = (c: HTMLCanvasElement, r: number): void => {
  if (r <= 0) return
  const g = ctxOf(c)
  const { width: w, height: h } = c
  const img = g.getImageData(0, 0, w, h)
  const d = img.data
  let a: Float32Array = new Float32Array(w * h)
  for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3]!
  const k = Math.max(1, Math.round(r))
  // two box passes each way: the canvas blur filter leaves specks at some scales
  for (const [n, m, step, jump] of [[h, w, 1, w], [w, h, w, 1], [h, w, 1, w], [w, h, w, 1]] as const) {
    const o = new Float32Array(a.length)
    for (let j = 0; j < n; j++) {
      const at = j * jump
      let sum = 0
      for (let i = -k; i < m; i++) {
        if (i + k < m) sum += a[at + (i + k) * step]!
        if (i - k - 1 >= 0) sum -= a[at + (i - k - 1) * step]!
        if (i >= 0) o[at + i * step] = sum / (k * 2 + 1)
      }
    }
    a = o
  }
  for (let i = 0; i < a.length; i++) {
    const p = clamp((a[i]! / 255 - 0.58) * 9) * 255
    if (p > d[i * 4 + 3]!) { d[i * 4] = 13; d[i * 4 + 1] = 12; d[i * 4 + 2] = 16; d[i * 4 + 3] = p }
  }
  g.putImageData(img, 0, 0)
}

const grainTex = (): HTMLCanvasElement => {
  const n = 512
  const f = sharedField(77, n, 256)
  const f2 = sharedField(78, n, 130)
  return texture("celgrain", n, n, (x, y, r) => {
    const v = (f[y * n + x]! - 0.5) * 0.8 + (f2[y * n + x]! - 0.5) * 0.5 + (r() - 0.5) * 0.7
    const k = 128 + v * 150
    return [k, k, k, 255]
  })
}

export const render = (ctx: Ctx, sheet: Sheet, s: Style, scale = 1): void => {
  const W = Math.round(sheet.w * scale), H = Math.round(sheet.h * scale)
  ctx.fillStyle = s.ground
  ctx.fillRect(0, 0, W, H)
  const parts = sheet.parts
  const byId = new Map(parts.map((p) => [p.id, p]))
  const T = new Map(Object.entries(sheet.mats).map(([k, m]) => [k, tones(m, s)]))
  const t = (m: string): Tones => T.get(m)!
  const kindOf = (m: string): Mat["kind"] => sheet.mats[m]!.kind
  const mk = (): { c: HTMLCanvasElement; g: Ctx } => { const c = canvas(W, H); const g = ctxOf(c); g.scale(scale, scale); return { c, g } }
  const col = mk(), ink = mk(), mask = mk()
  if (sheet.back) { ctx.save(); ctx.scale(scale, scale); sheet.back(ctx, s); ctx.restore() }

  // silhouette: everything's outline, under everything
  if (s.line.silhouette > 0) for (const p of parts) if (!p.clip && !p.noSil) poly(col.g, p.d, s.line.silhouette * 2, s.line.color === "tinted" ? t(p.mat).line : "#0b0a0e")

  for (const p of parts) {
    const k = t(p.mat)
    const kind = kindOf(p.mat)
    const bb = bounds(p.d)
    const pad = 4
    const host = p.clip ? byId.get(p.clip)!.d : null
    if (p.sep && s.sep > 0) {
      // a halo only where it overlaps the figure: never against the page
      const o = mk()
      poly(o.g, p.d, (s.line.outline * 0.5 + s.sep) * 2, s.id === "manga" ? "#fff" : "#f4f5f8")
      o.g.globalCompositeOperation = "destination-in"
      o.g.setTransform(1, 0, 0, 1, 0, 0)
      o.g.drawImage(mask.c, 0, 0)
      const put0 = (g: Ctx, op: GlobalCompositeOperation): void => { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = op; g.drawImage(o.c, 0, 0); g.restore() }
      put0(col.g, "source-over")
      put0(ink.g, "destination-out")
    }
    if (!p.clip) fill(mask.g, p.d, "#000")
    // work in the part's own box
    const bw = Math.ceil((bb.x1 - bb.x0 + pad * 2) * scale), bh = Math.ceil((bb.y1 - bb.y0 + pad * 2) * scale)
    const own = (): { c: HTMLCanvasElement; g: Ctx } => { const c = canvas(bw, bh); const g = ctxOf(c); g.scale(scale, scale); g.translate(-bb.x0 + pad, -bb.y0 + pad); return { c, g } }
    const a = own()
    const put = (dst: Ctx, c: HTMLCanvasElement, alpha = 1): void => { dst.save(); dst.setTransform(1, 0, 0, 1, 0, 0); dst.globalAlpha = alpha; dst.drawImage(c, 0, 0); dst.restore() }
    const gr = a.g.createLinearGradient(0, bb.y0, 0, bb.y1)
    gr.addColorStop(0, k.top); gr.addColorStop(0.5, k.base); gr.addColorStop(1, k.low)
    fill(a.g, p.d, p.flat ? k.base : gr)
    if (p.paint) { a.g.save(); trace(a.g, p.d); a.g.clip(); p.paint(a.g, t, s); a.g.restore() }
    if (!p.flat) {
      // shade mask = derived crescent + authored forms + cast shadows
      const m = own()
      const auto = (p.auto ?? 0) * s.light.auto
      if (auto > 0) {
        fill(m.g, p.d, "#000")
        m.g.globalCompositeOperation = "destination-out"
        fill(m.g, move(p.d, s.light.dir[0] * auto, s.light.dir[1] * auto), "#000")
        m.g.globalCompositeOperation = "source-over"
      }
      for (const q of p.shade ?? []) fill(m.g, q, "#000")
      // every crease carries a wedge of shade on the side away from the light
      if (kind === "cloth" && s.edge.fold > 0) for (const l of p.lines ?? []) {
        if (l.soft || l.ends === "none" || l.pts.length < 4) continue
        const f = s.edge.fold * (l.w ?? 1)
        const q = resample(move(l.pts, -s.light.dir[0] * f * 0.4, -s.light.dir[1] * f * 0.4), 3)
        ribbon(m.g, q, (u) => f * (l.ends === "in" ? Math.sin(Math.PI * Math.min(1, 0.15 + (1 - u) * 0.5) ) * (1 - u * 0.2) * Math.min(1, u * 4) : l.ends === "out" ? (1 - u) : Math.sin(Math.PI * u)), "#000")
      }
      for (const [from, dx, dy] of p.from ?? []) { const c = byId.get(from); if (c) fill(m.g, move(c.d, dx, dy), "#000") }
      const soft = (kind === "cloth" ? s.edge.clothSoft : kind === "hard" ? s.edge.soft * 0.6 : s.edge.soft) * scale
      const stain = (src: HTMLCanvasElement, color: string | CanvasGradient, dx = 0, dy = 0, blur = soft): HTMLCanvasElement => {
        const o = own()
        o.g.save()
        o.g.setTransform(1, 0, 0, 1, 0, 0)
        if (blur > 0.2) o.g.filter = `blur(${blur}px)`
        o.g.drawImage(src, dx * scale, dy * scale)
        o.g.filter = "none"
        o.g.restore()
        o.g.globalCompositeOperation = "source-in"
        o.g.fillStyle = color
        o.g.fillRect(bb.x0 - pad, bb.y0 - pad, bb.x1 - bb.x0 + pad * 2, bb.y1 - bb.y0 + pad * 2)
        return o.c
      }
      if (s.halftone > 0) {
        // print: shade becomes dots of black
        const o = own()
        halftone(o.g, p.d, 7.5, 0.78, () => (kind === "skin" ? 0.22 : 0.42), "#0d0c10")
        o.g.globalCompositeOperation = "destination-in"
        put(o.g, m.c)
        put(a.g, o.c)
      } else {
        if (kind === "skin" && s.edge.band > 0) put(a.g, stain(m.c, k.band, s.light.dir[0] * s.edge.band, s.light.dir[1] * s.edge.band))
        const sg = a.g.createLinearGradient(0, bb.y0, 0, bb.y1)
        sg.addColorStop(0, k.shadeTop); sg.addColorStop(1, k.shade)
        put(a.g, stain(m.c, sg))
      }
      if (p.deep?.length) {
        const dm = own()
        for (const q of p.deep) fill(dm.g, q, "#000")
        put(a.g, stain(dm.c, s.halftone > 0 ? "#111014" : k.deep))
      }
      if (s.light.rim > 0 && p.rim !== false && s.halftone === 0) {
        const o = own()
        const w = s.light.rim + s.line.outline * 0.5
        fill(o.g, p.d, k.rim)
        o.g.globalCompositeOperation = "destination-out"
        fill(o.g, move(p.d, s.light.dir[0] * w, s.light.dir[1] * w), "#000")
        o.g.globalCompositeOperation = "destination-in"
        put(o.g, m.c)
        put(a.g, o.c, kind === "skin" ? 0.65 : 0.8)
      }
      for (const q of p.hi ?? []) if (s.light.hi > 0) { a.g.globalAlpha = Math.min(1, 0.6 * s.light.hi); fill(a.g, q, s.halftone > 0 ? "#fff" : k.hi); a.g.globalAlpha = 1 }
    }
    if (p.decal && s.decals) p.decal(a.g, t)
    const ga = s.grain * (kind === "skin" ? 0.06 : kind === "paint" ? 0 : kind === "hair" ? 0.2 : 0.22)
    if (ga > 0) { a.g.save(); a.g.setTransform(1, 0, 0, 1, 0, 0); tile(a.g, grainTex(), "soft-light", Math.min(1, ga), Math.max(0.6, scale)); a.g.restore() }
    a.g.globalCompositeOperation = "destination-in"
    fill(a.g, p.d, "#000")
    if (host) fill(a.g, host, "#000")
    a.g.globalCompositeOperation = "source-over"
    col.g.save(); col.g.setTransform(1, 0, 0, 1, 0, 0); col.g.drawImage(a.c, (bb.x0 - pad) * scale, (bb.y0 - pad) * scale); col.g.restore()

    // ink sits on its own layer so corners can pool
    ink.g.save()
    if (host) { trace(ink.g, host); ink.g.clip() }
    ink.g.globalCompositeOperation = "destination-out"
    fill(ink.g, p.d, "#000")
    ink.g.globalCompositeOperation = "source-over"
    const lw = s.line.outline * (p.line ?? 1)
    if (lw > 0.1 && p.line !== 0) contour(ink.g, p.open ?? p.d, lw, k.line, s, !p.open)
    ink.g.save()
    trace(ink.g, p.d)
    ink.g.clip()
    for (const l of p.lines ?? []) { ink.g.globalAlpha = l.soft ? 0.5 : 1; inkStroke(ink.g, l, s.line.inner * 1.15, k.line); ink.g.globalAlpha = 1 }
    ink.g.restore()
    ink.g.restore()
  }
  if (s.line.color === "black") poolInk(ink.c, s.line.pool * scale)
  ctx.drawImage(col.c, 0, 0)
  ctx.drawImage(ink.c, 0, 0)
  if (s.after === "soft") {
    const b = canvas(W, H)
    const g = ctxOf(b)
    g.filter = `blur(${2.2 * scale}px)`
    g.drawImage(ctx.canvas, 0, 0)
    ctx.globalAlpha = 0.28
    ctx.drawImage(b, 0, 0)
    ctx.globalAlpha = 1
  }
}
