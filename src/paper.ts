import { canvas, ctxOf, hex, sharedField, texture } from "./brush.ts"
import type { Ctx } from "./brush.ts"
import { rng } from "./geo.ts"

/** Warm sheet: cloudy mottle, tooth, and a scatter of fibres. */
export const sheet = (key: string, base: readonly [number, number, number], o: { mottle?: number; tooth?: number; fibres?: number; fibre?: string } = {}): HTMLCanvasElement => {
  const n = 1024
  const f0 = sharedField(11, n, 14)
  const f1 = sharedField(12, n, 40)
  const f2 = sharedField(13, n, 256)
  const m = o.mottle ?? 7
  const tooth = o.tooth ?? 4
  const t = texture(`sheet-${key}`, n, n, (x, y, r) => {
    const i = y * n + x
    const d = (f0[i]! - 0.5) * m + (f1[i]! - 0.5) * m * 0.55 + (f2[i]! - 0.5) * tooth + (r() - 0.5) * tooth * 0.6
    return [base[0] + d, base[1] + d, base[2] + d * 0.95, 255]
  })
  const done = t as HTMLCanvasElement & { __f?: boolean }
  if (!done.__f) {
    done.__f = true
    const g = ctxOf(t)
    const r = rng(`fibre${key}`)
    g.lineCap = "round"
    for (let i = 0; i < (o.fibres ?? 130); i++) {
      const x = r() * n, y = r() * n, a = r() * 6.28, l = 6 + r() * 16, k = (r() - 0.5) * 14
      g.strokeStyle = hex(o.fibre ?? "#6b675c", 0.04 + r() * 0.09)
      g.lineWidth = 0.6 + r() * 0.6
      g.beginPath()
      g.moveTo(x, y)
      g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 - Math.sin(a) * k, y + Math.sin(a) * l * 0.5 + Math.cos(a) * k, x + Math.cos(a) * l, y + Math.sin(a) * l)
      g.stroke()
    }
  }
  return t
}
export const lay = (ctx: Ctx, tex: HTMLCanvasElement, scale = 1): void => {
  const p = ctx.createPattern(tex, "repeat")!
  p.setTransform(new DOMMatrix([scale, 0, 0, scale, 0, 0]))
  ctx.fillStyle = p
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
}
export const WHITE = (): HTMLCanvasElement => sheet("white", [243, 243, 239])
export const layer = (ctx: Ctx): { c: HTMLCanvasElement; g: Ctx } => {
  const c = canvas(ctx.canvas.width, ctx.canvas.height)
  return { c, g: ctxOf(c) }
}
