import type { Ctx } from "../brush.ts"
import type { Drawing, Item } from "../list.ts"

export type Env = {
  /** Held drawing index: changes 8 times a second, so lines boil. */
  frame: number
  /** 0..1 progress of drawing it on. */
  reveal: number
}
export type Skin = {
  id: string; label: string; group: string
  ground: (ctx: Ctx) => void
  render: (ctx: Ctx, d: Drawing, env: Env) => void
}
export type Line = Extract<Item, { k: "line" }>
export type Shape = Extract<Item, { k: "shape" }>
export type Tone = Extract<Item, { k: "tone" }>

export const castShadow = (ctx: Ctx, d: Drawing, color: string, a = 1): void => {
  for (const s of d.shadows) {
    ctx.save()
    ctx.translate(s.c[0], s.c[1])
    ctx.scale(1, s.ry / s.rx)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s.rx)
    const al = s.a * a
    g.addColorStop(0, color.replace("ALPHA", String(al)))
    g.addColorStop(0.45, color.replace("ALPHA", String(al * 0.5)))
    g.addColorStop(1, color.replace("ALPHA", "0"))
    ctx.fillStyle = g
    ctx.fillRect(-s.rx, -s.rx, s.rx * 2, s.rx * 2)
    ctx.restore()
  }
}
export const isFlat = (s: Shape): boolean => s.mat === "white" || s.mat === "glove"
