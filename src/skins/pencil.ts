/** Pencil and brush-pen over blue construction: the house style. */
import { canvas, ctxOf, fill, grainTex, hatchSegs, pressure, ribbon, ROLE_W, segments, tile, within, wobble } from "../brush.ts"
import type { Ctx } from "../brush.ts"
import { bounds, clamp, length, lerp, normals, resample, rng } from "../geo.ts"
import type { P2 } from "../geo.ts"
import { lay, sheet, WHITE } from "../paper.ts"
import { castShadow } from "./common.ts"
import type { Skin, Tone } from "./common.ts"

const cut = (p: ReadonlyArray<P2>, t: number): Array<P2> => (t >= 1 ? [...p] : p.slice(0, Math.max(2, Math.ceil(p.length * t))))

/** Soft graphite: flat rub, banded strokes, a few hard lines, eraser streaks. */
export const graphite = (g: Ctx, it: Tone, S: number, frame: number, rgb = "28,28,34", streak = "255,255,255"): void => {
  const r = rng(it.id + (frame >> 1))
  const dark = it.level > 1.05
  within(g, it.clip, () => {
    fill(g, it.poly, `rgba(${rgb},${dark ? lerp(0.36, 0.66, clamp((it.level - 1.1) / 0.4)) : 0.115 * it.level})`)
    const b = bounds(it.poly)
    const gap = Math.min(S * (dark ? 0.017 : 0.03), Math.max(S * 0.011, Math.min(b.x1 - b.x0, b.y1 - b.y0) * 0.2))
    for (const [i, s] of hatchSegs(it.poly, it.angle, gap, it.id, { ragged: dark ? 1 : 2 }).entries()) {
      const w = gap * (0.45 + r() * (dark ? 1 : 1.15))
      const a = (dark ? 0.16 + r() * 0.38 : 0.06 + r() * r() * 0.27) * clamp(it.level, 0.35, 1.3)
      ribbon(g, wobble(s, `${it.id}${i}`, 0.004, S, frame), (t) => w * (0.35 + 0.65 * Math.sin(Math.PI * clamp(t * 0.82 + 0.1))), `rgba(${rgb},${a})`)
    }
    for (const [i, s] of hatchSegs(it.poly, it.angle + 0.03, gap * 2.1, `${it.id}f`, { ragged: 2 }).entries()) {
      if (r() < 0.6) continue
      ribbon(g, wobble(s, `${it.id}f${i}`, 0.004, S, frame), () => S * 0.0035, `rgba(${rgb},${0.2 + r() * 0.25})`)
    }
    for (const [i, s] of hatchSegs(it.poly, it.angle - 0.02, gap * (dark ? 2.6 : 2.3), `${it.id}e`, { ragged: 4 }).entries()) {
      if (r() < 0.35) continue
      const w = S * (dark ? 0.0045 : 0.008) * (0.4 + r())
      ribbon(g, wobble(s, `${it.id}e${i}`, 0.003, S, frame), (t) => w * Math.sin(Math.PI * clamp(t)), `rgba(${streak},${dark ? 0.5 : 0.35 + r() * 0.5})`)
    }
  })
}

export const pencil: Skin = {
  id: "pencil", label: "Pencil", group: "House",
  ground: (ctx) => lay(ctx, WHITE()),
  render: (ctx, d, env) => {
    const { S } = d
    const { frame } = env
    const inkT = clamp((env.reveal - 0.22) / 0.78)
    const guideT = clamp(env.reveal / 0.35)
    castShadow(ctx, d, "rgba(20,20,24,ALPHA)", inkT)
    const L = canvas(ctx.canvas.width, ctx.canvas.height)
    const g = ctxOf(L)
    g.lineJoin = "round"
    const inks = d.items.filter((i) => i.k !== "guide")
    const under = canvas(ctx.canvas.width, ctx.canvas.height)
    const ug = ctxOf(under)
    // blue construction, drawn fast and long
    const guides = d.items.filter((i) => i.k === "guide")
    for (const [gi, it] of guides.entries()) {
      const at = env.reveal >= 1 ? 1 : clamp((guideT - (gi / guides.length) * 0.75) / 0.25)
      if (at <= 0) continue
      const pts = cut(wobble(resample(it.pts, S * 0.02), it.id, 0.006, S, frame >> 2, 0.3), at)
      const r = rng(it.id)
      const tint = r() < 0.75 ? "106,166,222" : "140,152,208"
      ribbon(ug, pts, pressure(pts, it.id, S * 0.0085, { side: 0, taperIn: 2, taperOut: 10 }), `rgba(${tint},${0.36 + r() * 0.4})`)
      if (r() < 0.35) {
        const p2 = cut(wobble(resample(it.pts, S * 0.02), `${it.id}2`, 0.012, S, frame >> 2, 0.3), at)
        ribbon(ug, p2, () => S * 0.005, `rgba(${tint},0.22)`)
      }
    }
    const N = inks.length
    for (const [i, it] of inks.entries()) {
      const prog = env.reveal >= 1 ? 1 : clamp((inkT - (i / N) * 0.86) / 0.14)
      if (prog <= 0) continue
      if (it.k === "shape") {
        within(g, it.clip, () => fill(g, it.poly, it.mat === "mouth" ? "#1c1b20" : it.mat === "dark" && !it.shade ? "#1b1a1f" : "#fdfdfb"))
        if (it.mat === "mouth" || (it.mat === "dark" && !it.shade)) {
          const r = rng(it.id)
          within(g, it.poly, () => {
            for (const s of hatchSegs(it.poly, -0.9, S * 0.03, it.id, { ragged: 2 })) if (r() < 0.5) ribbon(g, s, (t) => S * 0.005 * Math.sin(Math.PI * t), `rgba(255,255,255,${0.1 + r() * 0.16})`)
          })
        }
      } else if (it.k === "tone") {
        if (it.mat === "cheek") {
          within(g, it.clip, () => { for (const [k, s] of hatchSegs(it.poly, -1.0, S * 0.024, it.id, { ragged: 1.4 }).entries()) ribbon(g, wobble(s, `${it.id}${k}`, 0.004, S, frame), (t) => S * 0.0065 * (0.3 + 0.7 * Math.sin(Math.PI * t)), "rgba(40,40,46,.34)") })
        } else if (prog > 0.5) graphite(g, it, S, frame)
      } else if (it.k === "line") {
        const base = ROLE_W[it.role] * S * (it.w ?? 1)
        within(g, it.clip, () => {
          for (const s of segments(it, S)) {
            const heavy = it.role === "outline" || it.role === "inner"
            // graphite under-line: same stroke, drawn earlier by a looser hand
            if (heavy) {
              const r = rng(`${s.id}u`)
              const push = (r() * 0.011 + 0.002) * S * (s.side || (r() < 0.5 ? 1 : -1))
              const loose = wobble(s.pts, `${s.id}u`, 0.007, S, frame >> 1, 0.25)
              const ns = normals(loose)
              const off = cut(loose.map((p, k) => [p[0] + ns[k]![0] * push, p[1] + ns[k]![1] * push] as const), prog * 1.4)
              ribbon(g, off, pressure(off, `${s.id}u`, base * 0.75, { side: s.side, taperIn: 5, taperOut: 10 }), `rgba(48,48,54,${0.3 + r() * 0.3})`)
            }
            const p = cut(wobble(s.pts, s.id, it.role === "outline" ? 0.0042 : 0.0032, S, frame, 0.32), prog)
            const ink = heavy ? "rgba(21,21,24,.965)" : it.role === "detail" ? "rgba(28,28,32,.86)" : "rgba(40,40,46,.66)"
            ribbon(g, p, pressure(p, s.id, base, { side: s.side, taperIn: s.free ? 4 : 7, taperOut: s.free ? 6 : 10, jitter: 0.3, contrast: it.role === "outline" ? 1 : 0.5 }), ink)
            // go over the shaded run again
            if (it.role === "outline" && s.side !== 0 && length(p) > S * 0.4 && prog >= 1) {
              const ns = normals(p)
              let a = -1
              let b = -1
              p.forEach((_, k) => { if ((ns[k]![0] * 0.56 + ns[k]![1] * 0.83) * s.side > 0.55) { if (a < 0) a = k; b = k } })
              if (b - a > 8) {
                const run = p.slice(a, b + 1).map((q, k) => [q[0] + ns[a + k]![0] * base * 0.38 * s.side, q[1] + ns[a + k]![1] * base * 0.38 * s.side] as const)
                const p2 = wobble(run, `${s.id}r`, 0.003, S, frame, 0.3)
                ribbon(g, p2, pressure(p2, `${s.id}r`, base * 0.7, { side: 0, taperIn: 9, taperOut: 12 }), "rgba(21,21,24,.95)")
              }
            }
          }
        })
      }
    }
    // dry-brush: knock a little tooth out of the black, leave white fills alone
    const tooth = canvas(L.width, L.height)
    const tg = ctxOf(tooth)
    tg.drawImage(L, 0, 0)
    tile(tg, grainTex("tooth", 0.42, 0.2, 256), "destination-out")
    tg.globalCompositeOperation = "source-in"
    tg.fillStyle = "#6d6d74"
    tg.fillRect(0, 0, L.width, L.height)
    g.globalCompositeOperation = "lighten"
    g.globalAlpha = 0.13
    g.drawImage(tooth, 0, 0)
    g.globalAlpha = 1
    g.globalCompositeOperation = "source-over"
    ctx.save()
    // construction shows through the paper-white figure: multiply both
    ctx.globalCompositeOperation = "multiply"
    ctx.drawImage(L, 0, 0)
    ctx.drawImage(under, 0, 0)
    ctx.restore()
  },
}

/** Same hand in pale blue only: the rough before the inks. */
export const blueRough: Skin = {
  id: "rough", label: "Blue rough", group: "House",
  ground: (ctx) => lay(ctx, WHITE()),
  render: (ctx, d, env) => {
    const c = canvas(ctx.canvas.width, ctx.canvas.height)
    const g = ctxOf(c)
    pencil.render(g, { ...d, shadows: [] }, env)
    // darkness becomes coverage of one blue pencil
    const img = g.getImageData(0, 0, c.width, c.height)
    const px = img.data
    for (let i = 0; i < px.length; i += 4) {
      const k = px[i + 3]! === 0 ? 0 : 1 - (px[i]! * 0.3 + px[i + 1]! * 0.5 + px[i + 2]! * 0.2) / 255
      px[i] = 74; px[i + 1] = 150; px[i + 2] = 222
      px[i + 3] = px[i + 3]! * Math.min(1, k * 1.05) * 0.88
    }
    g.putImageData(img, 0, 0)
    castShadow(ctx, d, "rgba(60,90,130,ALPHA)", 0.5)
    ctx.save()
    ctx.globalCompositeOperation = "multiply"
    ctx.drawImage(c, 0, 0)
    ctx.restore()
  },
}
export const chalkSheet = (): HTMLCanvasElement => sheet("board", [32, 46, 42], { mottle: 16, tooth: 5, fibres: 60, fibre: "#dfe8e2" })
