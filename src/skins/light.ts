import { canvas, ctxOf, fill, hex, ribbon, ROLE_W, segments, sharedField, tile, texture, trace, within, wobble, hatchSegs } from "../brush.ts"
import type { Ctx } from "../brush.ts"
import { bounds, lerp, rng, TAU } from "../geo.ts"
import type { P2 } from "../geo.ts"
import type { Skin } from "./common.ts"

const black = (ctx: Ctx, inner: string, outer: string): void => {
  const { width: w, height: h } = ctx.canvas
  const g = ctx.createRadialGradient(w / 2, h * 0.55, 0, w / 2, h * 0.55, Math.max(w, h) * 0.75)
  g.addColorStop(0, inner)
  g.addColorStop(1, outer)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  const f = sharedField(5, 256, 64)
  tile(ctx, texture("dustn", 256, 256, (x, y, r) => { const v = 120 + 60 * (f[y * 256 + x]! - 0.5) + 60 * (r() - 0.5); return [v, v, v, 255] }), "overlay", 0.12)
}

export const neon: Skin = {
  id: "neon", label: "Neon", group: "Light",
  ground: (ctx) => black(ctx, "#1a1226", "#08060d"),
  render: (ctx, d, { frame }) => {
    const { S } = d
    const L = canvas(ctx.canvas.width, ctx.canvas.height)
    const g = ctxOf(L)
    const HOT = canvas(L.width, L.height)
    const h = ctxOf(HOT)
    const cols: Record<string, string> = { body: "#ff3fa4", face: "#57e6ff", accent: "#ffd24a", hand: "#7dff9a" }
    for (const s of d.shadows) {
      ctx.save()
      ctx.translate(s.c[0], s.c[1])
      ctx.scale(1, 0.16)
      const r2 = ctx.createRadialGradient(0, 0, 0, 0, 0, s.rx * 1.3)
      r2.addColorStop(0, "rgba(255,90,180,.4)")
      r2.addColorStop(1, "rgba(255,90,180,0)")
      ctx.fillStyle = r2
      ctx.fillRect(-s.rx * 1.3, -s.rx * 1.3, s.rx * 2.6, s.rx * 2.6)
      ctx.restore()
    }
    for (const it of d.items) {
      if (it.k === "shape") {
        for (const k of [g, h]) { k.save(); k.globalCompositeOperation = "destination-out"; within(k, it.clip, () => fill(k, it.poly, "#000")); k.restore() }
        if (it.id.endsWith("pupil")) within(g, it.clip, () => fill(g, it.poly, hex(cols.face!, 0.9)))
        if (it.id.includes("brow")) fill(g, it.poly, hex(cols.face!, 0.9))
      } else if (it.k === "line" && it.role !== "fine") {
        const c = it.id.includes("eye") || it.id.includes("mouth") || it.id.includes("brow") ? cols.face! : it.id.includes("hand") ? cols.hand! : it.id.includes("boot") || it.id.includes("grip") || it.id.includes("knob") || it.id.includes("handle") || it.id.includes("pet") ? cols.accent! : cols.body!
        const w = (it.role === "outline" ? 0.019 : it.role === "inner" ? 0.014 : 0.008) * S
        const draw = (k: Ctx, col: string, kw: number): void => within(k, it.clip, () => {
          for (const s of segments(it, S, { over: -0.3, split: false })) {
            const p = wobble(s.pts, s.id, 0.001, S, 0, 0)
            k.lineCap = "round"; k.lineJoin = "round"; k.strokeStyle = col; k.lineWidth = w * kw
            trace(k, p, false); k.stroke()
          }
        })
        draw(g, c, 1)
        draw(h, "rgba(255,255,255,.92)", 0.42)
      } else if (it.k === "tone" && it.mat !== "eye" && it.mat !== "dark" && it.level < 1) {
        within(g, it.clip, () => { for (const s of hatchSegs(it.poly, it.angle, S * 0.05, it.id, { ragged: 1 })) ribbon(g, s, () => S * 0.005, hex(cols.body!, 0.3)) })
      }
    }
    const flick = 0.94 + 0.06 * Math.sin(frame * 2.1)
    ctx.save()
    ctx.globalCompositeOperation = "lighter"
    for (const [blur, a] of [[0.12, 0.6], [0.045, 0.7], [0.014, 0.75]] as const) {
      ctx.filter = `blur(${blur * S}px)`
      ctx.globalAlpha = a * flick
      ctx.drawImage(L, 0, 0)
    }
    ctx.filter = "none"
    ctx.globalAlpha = 0.95
    ctx.drawImage(L, 0, 0)
    ctx.drawImage(HOT, 0, 0)
    ctx.restore()
  },
}

export const hologram: Skin = {
  id: "hologram", label: "Hologram", group: "Light",
  ground: (ctx) => black(ctx, "#06251f", "#010605"),
  render: (ctx, d, { frame }) => {
    const { S } = d
    const L = canvas(ctx.canvas.width, ctx.canvas.height)
    const g = ctxOf(L)
    const all = bounds(d.items.flatMap((i) => (i.k === "shape" ? i.poly : [])))
    const tint = (y: number): string => {
      const t = (y - all.y0) / (all.y1 - all.y0)
      return t < 0.35 ? "#59ffd0" : t < 0.75 ? "#3dffa2" : "#37d7ff"
    }
    for (const it of d.items) {
      if (it.k === "shape") {
        g.save(); g.globalCompositeOperation = "destination-out"; within(g, it.clip, () => fill(g, it.poly, "rgba(0,0,0,.9)")); g.restore()
        const c = tint(it.poly[0]![1])
        within(g, it.clip, () => {
          fill(g, it.poly, hex(c, it.id.endsWith("pupil") || it.id.includes("brow") ? 0.85 : it.mat === "white" ? 0.16 : 0.055))
          // wire cage
          if ((it.mat === "body" || it.mat === "body2" || it.mat === "accent") && !it.clip) within(g, it.poly, () => {
            const b = bounds(it.poly)
            const cx = (b.x0 + b.x1) / 2, w = (b.x1 - b.x0) / 2
            g.strokeStyle = hex(c, 0.34)
            g.lineWidth = Math.max(0.7, S * 0.004)
            for (let i = -5; i <= 5; i++) { const x = cx + Math.sin((i / 6) * 1.5) * w * 1.02; g.beginPath(); g.moveTo(cx + (x - cx) * 0.72, b.y0); g.quadraticCurveTo(x * 1 + (x - cx) * 0.16, (b.y0 + b.y1) / 2, cx + (x - cx) * 0.8, b.y1); g.stroke() }
            for (let y = b.y0; y < b.y1; y += S * 0.1) { g.beginPath(); g.moveTo(b.x0, y - S * 0.02); g.quadraticCurveTo(cx, y + S * 0.07, b.x1, y - S * 0.02); g.stroke() }
          })
        })
      } else if (it.k === "line") {
        within(g, it.clip, () => {
          for (const s of segments(it, S, { over: 0 })) {
            const p = wobble(s.pts, s.id, 0.0012, S, frame, 0.6)
            ribbon(g, p, () => ROLE_W[it.role] * S * 0.55 * (it.w ?? 1) + 0.4, hex(tint(p[0]![1]), it.role === "fine" ? 0.5 : 0.95))
          }
        })
      }
    }
    // projector base
    ctx.save()
    ctx.globalCompositeOperation = "lighter"
    for (const s of d.shadows) {
      for (const [k, a] of [[1, 0.9], [0.72, 0.6], [1.22, 0.25]] as const) {
        ctx.beginPath()
        ctx.ellipse(s.c[0], s.c[1] + S * 0.03, s.rx * 0.8 * k, s.ry * 1.9 * k, 0, 0, TAU)
        ctx.strokeStyle = hex("#3dffa2", a)
        ctx.lineWidth = S * 0.01
        ctx.stroke()
      }
      const cone = ctx.createLinearGradient(0, all.y0, 0, s.c[1])
      cone.addColorStop(0, "rgba(60,255,170,0)")
      cone.addColorStop(1, "rgba(60,255,170,.13)")
      fill(ctx, [[s.c[0] - s.rx * 1.5, all.y0], [s.c[0] + s.rx * 1.5, all.y0], [s.c[0] + s.rx * 0.8, s.c[1]], [s.c[0] - s.rx * 0.8, s.c[1]]] as ReadonlyArray<P2>, cone)
    }
    // scanlines
    g.save()
    g.globalCompositeOperation = "destination-out"
    g.fillStyle = "rgba(0,0,0,.34)"
    const gap = Math.max(3, Math.round(S * 0.018))
    for (let y = (frame * 2) % gap; y < L.height; y += gap) g.fillRect(0, y, L.width, gap * 0.4)
    g.restore()
    for (const [blur, a] of [[0.07, 0.7], [0.02, 0.5]] as const) {
      ctx.filter = `blur(${blur * S}px)`
      ctx.globalAlpha = a
      ctx.drawImage(L, 0, 0)
    }
    ctx.filter = "none"
    ctx.globalAlpha = 1
    // a torn scan band
    const r = rng(`tear${frame >> 2}`)
    const ty = lerp(all.y0, all.y1, r())
    ctx.drawImage(L, 0, 0)
    ctx.globalAlpha = 0.7
    ctx.drawImage(L, 0, ty, L.width, S * 0.05, S * 0.03 * (r() - 0.5) * 2, ty, L.width, S * 0.05)
    for (let i = 0; i < 60; i++) { ctx.globalAlpha = 0.15 + r() * 0.5; ctx.fillStyle = "#59ffd0"; const q = Math.max(1, S * 0.006); ctx.fillRect(lerp(all.x0 - S * 0.2, all.x1 + S * 0.2, r()), lerp(all.y0 - S * 0.2, all.y1, r()), q, q) }
    ctx.restore()
  },
}
