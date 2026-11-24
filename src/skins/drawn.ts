import { canvas, ctxOf, fill, grainTex, hatchSegs, pressure, ribbon, ROLE_W, segments, shadeHex, hex, tile, trace, within, wobble } from "../brush.ts"
import { bounds, circle, clamp, hash, length, lerp, noise1, resample, rng } from "../geo.ts"
import type { P2 } from "../geo.ts"
import type { Palette } from "../list.ts"
import { lay, WHITE } from "../paper.ts"
import { chalkSheet } from "./pencil.ts"
import { castShadow } from "./common.ts"
import type { Skin } from "./common.ts"

/* ---------- ballpoint ---------- */
const BIC = "28,26,120"
export const ballpoint: Skin = {
  id: "ballpoint", label: "Ballpoint", group: "Drawn",
  ground: (ctx) => lay(ctx, WHITE()),
  render: (ctx, d, { frame }) => {
    const { S } = d
    castShadow(ctx, d, "rgba(30,30,60,ALPHA)", 0.8)
    const L = canvas(ctx.canvas.width, ctx.canvas.height)
    const g = ctxOf(L)
    const nib = Math.max(0.9, S * 0.0062)
    const pen = (p: ReadonlyArray<P2>, a: number, w = nib): void => ribbon(g, p, (t) => w * (0.75 + 0.25 * Math.sin(t * 9 + a * 20)), `rgba(${BIC},${a})`)
    for (const it of d.items) {
      if (it.k === "guide") continue
      if (it.k === "shape") {
        within(g, it.clip, () => fill(g, it.poly, "#fdfdfb"))
        if (it.mat === "mouth" || (it.mat === "dark" && !it.shade)) within(g, it.clip, () => within(g, it.poly, () => {
          for (const a of [-0.8, 0.5]) for (const [i, s] of hatchSegs(it.poly, a, nib * 1.5, `${it.id}${a}`, { ragged: 1 }).entries()) pen(wobble(s, `${it.id}${a}${i}`, 0.003, S, frame), 0.75)
        }))
      } else if (it.k === "tone") {
        const r = rng(it.id)
        const passes = it.level > 1.05 ? 3 : it.level > 0.6 ? 2 : 1
        within(g, it.clip, () => {
          for (let k = 0; k < passes; k++) {
            // one continuous back-and-forth scribble, lifting now and then
            const segs = hatchSegs(it.poly, it.angle + (k === 1 ? 0.75 : k * -0.35), S * (it.level > 1.05 ? 0.011 : 0.023), `${it.id}${k}`, { ragged: 2.4 })
            let chain: Array<P2> = []
            const flush = (): void => {
              if (chain.length > 2) pen(wobble(resample(chain, S * 0.014), `${it.id}${k}${chain.length}`, 0.005, S, frame), 0.68 + r() * 0.25)
              chain = []
            }
            segs.forEach((s, i) => { chain.push(...(i % 2 ? [...s].reverse() : s)); if (r() < 0.13) flush() })
            flush()
          }
        })
      } else {
        within(g, it.clip, () => {
          const times = it.role === "outline" ? 3 : it.role === "inner" ? 2 : 1
          for (let k = 0; k < times; k++) for (const s of segments({ ...it, id: `${it.id}~${k}` }, S, { over: 1.6 })) {
            const p = wobble(s.pts, `${s.id}`, it.role === "outline" ? 0.0085 : 0.004, S, frame >> 1, 0.2)
            pen(p, 0.82, nib * (it.role === "fine" ? 0.75 : 1))
            const r = rng(`${s.id}b`)
            // ink collects where the pen stops
            if (it.role === "outline" && r() < 0.5) { const e = p[r() < 0.5 ? 0 : p.length - 1]!; fill(g, circle(e, nib * (0.9 + r() * 0.8), 10), `rgba(${BIC},.95)`) }
          }
        })
      }
    }
    tile(g, grainTex("biro", 0.2, 0.1, 220), "destination-out", 0.4)
    ctx.save()
    ctx.globalCompositeOperation = "multiply"
    ctx.drawImage(L, 0, 0)
    ctx.restore()
  },
}

/* ---------- felt-tip ---------- */
export const felt: Skin = {
  id: "felt", label: "Felt-tip", group: "Drawn",
  ground: (ctx) => lay(ctx, WHITE()),
  render: (ctx, d, { frame }) => {
    const { S } = d
    castShadow(ctx, d, "rgba(30,30,40,ALPHA)", 0.7)
    const palOf = (p: Palette): Record<string, string> => ({ body: shadeHex(p.body, 0.08), body2: p.body2, accent: p.accent, glove: "#ffc59a", limb: "#6a6f86", white: "", dark: "#16161a", eye: "#f5cf2c", mouth: "#1b1418", tongue: "#f0566a", cheek: "#ff8d7a", none: "" })
    for (const it of d.items) {
      if (it.k === "guide") continue
      if (it.k === "shape") {
        within(ctx, it.clip, () => fill(ctx, it.poly, "#f7f7f3"))
        const col = palOf(it.pal ?? d.palette)[it.mat]
        if (!col) continue
        if (it.mat === "mouth" || it.mat === "dark") { within(ctx, it.clip, () => fill(ctx, it.poly, col)); continue }
        const marker = (angle: number, color: string, id: string, gapK = 1): void => {
          const r = rng(id)
          const gap = S * 0.034 * gapK
          const tmp = canvas(ctx.canvas.width, ctx.canvas.height)
          const t = ctxOf(tmp)
          // nib strokes multiply over each other, leaving slivers of paper
          t.globalCompositeOperation = "source-over"
          for (const [i, s] of hatchSegs(it.poly, angle, gap, id, { ragged: 1.1, jitter: 0.8 }).entries()) {
            const p = wobble(s, `${id}${i}`, 0.004, S, frame >> 2, 0.1)
            const w = gap * (0.94 + r() * 0.16)
            ribbon(t, p, () => w, hex(color, 0.8 + r() * 0.12))
            for (const e of [p[0]!, p[p.length - 1]!]) if (r() < 0.4) fill(t, circle(e, w * (0.5 + r() * 0.12), 10), hex(color, 0.85))
            if (r() < 0.2) ribbon(t, p.slice(Math.floor(p.length * r() * 0.5)), () => w * 0.6, hex(shadeHex(color, -0.14), 0.5))
          }
          ctx.save()
          ctx.globalCompositeOperation = "multiply"
          ctx.drawImage(tmp, 0, 0)
          ctx.restore()
        }
        within(ctx, it.clip, () => {
          const h = hash(it.id)
          const big = length(it.poly) > S * 2.6
          if (!big) return marker(-1.15 + ((h % 7) - 3) * 0.12, col, it.id)
          // big areas get filled a patch at a time, turning the page between patches
          const b = bounds(it.poly)
          const cx = lerp(b.x0, b.x1, 0.36 + (h % 31) / 110), cy = lerp(b.y0, b.y1, 0.4 + (h % 23) / 80), o = S * 0.006
          const quads: ReadonlyArray<readonly [number, number, number, number, number, string]> = [
            [b.x0, b.y0, cx + o, cy + o, -1.35, col], [cx - o, b.y0, b.x1, cy + o, -2.3, shadeHex(col, 0.16)],
            [b.x0, cy - o, cx + o, b.y1, -1.75, shadeHex(col, 0.14)], [cx - o, cy - o, b.x1, b.y1, -0.85, col],
          ]
          for (const [i, [x0, y0, x1, y1, a, cc]] of quads.entries()) {
            const n = noise1(`${it.id}q${i}`)
            const w = (t: number): number => n(t * 4) * S * 0.05
            const q: Array<P2> = []
            for (let k = 0; k <= 8; k++) q.push([lerp(x0, x1, k / 8), y0 + w(k)])
            for (let k = 0; k <= 8; k++) q.push([x1 + w(k + 20), lerp(y0, y1, k / 8)])
            for (let k = 8; k >= 0; k--) q.push([lerp(x0, x1, k / 8), y1 + w(k + 40)])
            for (let k = 8; k >= 0; k--) q.push([x0 + w(k + 60), lerp(y0, y1, k / 8)])
            within(ctx, q, () => marker(a, cc, `${it.id}${i}`, 1.05))
          }
        })
      } else if (it.k === "tone") {
        if (it.level > 1.05 && it.mat === "dark") continue
        const base = it.mat === "eye" ? "#8a6a10" : palOf(it.pal ?? d.palette)[it.mat] || "#8d8da0"
        const c = it.mat === "cheek" ? "#ff6f61" : it.mat === "glove" ? "#e89260" : shadeHex(base, -0.28)
        const r = rng(it.id)
        within(ctx, it.clip, () => {
          ctx.save()
          ctx.globalCompositeOperation = "multiply"
          for (const [i, s] of hatchSegs(it.poly, it.angle, S * 0.034, it.id, { ragged: 2 }).entries()) ribbon(ctx, wobble(s, `${it.id}${i}`, 0.004, S, frame >> 2, 0.1), () => S * 0.026, hex(c, 0.36 + r() * 0.2))
          ctx.restore()
        })
      } else {
        within(ctx, it.clip, () => {
          const w = { outline: 0.02, inner: 0.0145, detail: 0.011, fine: 0.008 }[it.role] * S * Math.max(0.8, it.w ?? 1)
          for (const s of segments(it, S, { over: 1.1 })) {
            const p = wobble(s.pts, s.id, 0.0045, S, frame, 0.25)
            ctx.strokeStyle = "rgba(17,17,20,.96)"
            ctx.lineCap = "round"
            ctx.lineJoin = "round"
            ctx.lineWidth = w
            trace(ctx, p, false)
            ctx.stroke()
          }
        })
      }
    }
  },
}

/* ---------- chalkboard ---------- */
export const chalk: Skin = {
  id: "chalk", label: "Chalkboard", group: "Drawn",
  ground: (ctx) => {
    lay(ctx, chalkSheet())
    // old wipes
    const { width: w, height: h } = ctx.canvas
    const r = rng("wipe")
    for (let i = 0; i < 9; i++) {
      const y = r() * h
      const p: Array<P2> = Array.from({ length: 12 }, (_, k) => [-0.1 * w + (k / 11) * w * 1.2, y + Math.sin(k * 0.5 + i) * h * 0.08])
      ribbon(ctx, p, () => h * (0.05 + r() * 0.002), `rgba(225,235,228,${0.012 + r() * 0.02})`)
    }
  },
  render: (ctx, d, { frame }) => {
    const { S } = d
    const pal: Record<string, string> = { body: "#f3efe4", body2: "#f2d98a", accent: "#9fd3e8", glove: "#f3efe4", limb: "#f3efe4", white: "#f3efe4", dark: "#f3efe4", eye: "#f2d98a", mouth: "#e88f8a", tongue: "#f09a94", cheek: "#f09a94", none: "#f3efe4" }
    const L = canvas(ctx.canvas.width, ctx.canvas.height)
    const g = ctxOf(L)
    const K = canvas(ctx.canvas.width, ctx.canvas.height)
    const k = ctxOf(K)
    let mat: string = "body"
    for (const it of d.items) {
      if (it.k === "guide") {
        const p = wobble(resample(it.pts, S * 0.02), it.id, 0.005, S)
        ribbon(g, p, () => S * 0.006, "rgba(190,215,205,.13)")
      } else if (it.k === "shape") {
        mat = it.mat
        g.save()
        g.globalCompositeOperation = "destination-out"
        within(g, it.clip, () => fill(g, it.poly, "rgba(0,0,0,1)"))
        g.restore()
        const tint = it.mat === "white" ? 0.86 : it.mat === "dark" && !it.shade ? 0 : it.mat === "mouth" ? 0 : it.mat === "accent" || it.mat === "body2" ? 0.3 : it.mat === "glove" ? 0.2 : 0.09
        within(g, it.clip, () => {
          fill(g, it.poly, `rgba(34,48,44,1)`)
          if (tint) fill(g, it.poly, hex(pal[it.mat]!, tint))
          if (it.mat === "body" || it.mat === "accent" || it.mat === "body2") {
            const r = rng(it.id)
            within(g, it.poly, () => { for (const s of hatchSegs(it.poly, -1.0, S * 0.05, it.id, { ragged: 2 })) ribbon(g, s, (t) => S * 0.04 * Math.sin(Math.PI * clamp(t)), hex(pal[it.mat]!, 0.03 + r() * 0.14)) })
          }
        })
      } else if (it.k === "tone") {
        const r = rng(it.id)
        const c = it.mat === "eye" ? "#2a3b36" : it.mat === "dark" ? "#f3efe4" : pal[it.mat]!
        within(g, it.clip, () => {
          for (const [i, s] of hatchSegs(it.poly, it.angle, S * (it.level > 1.05 ? 0.016 : 0.032), it.id, { ragged: 2.5 }).entries()) ribbon(g, wobble(s, `${it.id}${i}`, 0.004, S, frame), (t) => S * 0.016 * (0.5 + 0.5 * Math.sin(Math.PI * t)), hex(c, (0.25 + r() * 0.4) * Math.min(1, it.level)))
        })
      } else {
        const c = it.id.includes("eye") && (it.id.includes("iris")) ? "#2a3b36" : pal[mat === "dark" ? "dark" : "white"]!
        within(g, it.clip, () => {
          for (const s of segments(it, S)) for (let n = 0; n < 2; n++) {
            const p = wobble(s.pts, `${s.id}${n}`, 0.004, S, frame, 0.3)
            ribbon(g, p, pressure(p, s.id, ROLE_W[it.role] * S * (it.w ?? 1) * (n ? 0.75 : 1.15), { side: 0, taperIn: 1, taperOut: 2, jitter: 0.35 }), hex(c, n ? 0.6 : 0.92))
          }
        })
      }
    }
    // dust: a blurred copy under, teeth knocked out of the line
    k.filter = `blur(${S * 0.012}px)`
    k.drawImage(L, 0, 0)
    tile(g, grainTex("chalk", 0.36, 0.12, 250, 0.05), "destination-out", 0.62)
    ctx.globalAlpha = 0.22
    ctx.drawImage(K, 0, 0)
    ctx.globalAlpha = 1
    // figure plate so the board doesn't show old wipes through
    ctx.drawImage(L, 0, 0)
  },
}

/* ---------- ink bleed: watercolour under a dry pen line ---------- */
const deform = (p: ReadonlyArray<P2>, amp: number, r: () => number, rounds: number): Array<P2> => {
  let q = [...p]
  for (let k = 0; k < rounds; k++) {
    const out: Array<P2> = []
    q.forEach((a, i) => {
      const b = q[(i + 1) % q.length]!
      const dx = b[0] - a[0], dy = b[1] - a[1]
      const g = (r() + r() + r() - 1.5) * amp
      out.push(a, [(a[0] + b[0]) / 2 + dy * g + (r() - 0.5) * dx * 0.3, (a[1] + b[1]) / 2 - dx * g + (r() - 0.5) * dy * 0.3])
    })
    q = out
  }
  return q
}
export const bleed: Skin = {
  id: "bleed", label: "Ink bleed", group: "Drawn",
  ground: (ctx) => lay(ctx, WHITE()),
  render: (ctx, d, { frame }) => {
    const { S } = d
    castShadow(ctx, d, "rgba(40,50,70,ALPHA)", 0.6)
    const W = canvas(ctx.canvas.width, ctx.canvas.height)
    const g = ctxOf(W)
    const palOf = (p: Palette): Record<string, string> => ({ body: p.body, body2: p.body2, accent: p.accent, glove: "#e0a020", limb: "#4d6a9c", white: "", dark: "#1d1c26", eye: "#6f8fb4", mouth: "#4a2030", tongue: "#d7727c", cheek: "#e58a7a", none: "" })
    const wash = (poly: ReadonlyArray<P2>, color: string, id: string, strength: number, bleedK: number): void => {
      const r = rng(id)
      const coarse = resample([...poly, poly[0]!], Math.min(S * 0.16, length(poly) / 16)).slice(0, -1)
      const base = deform(coarse, 0.22 * bleedK, r, 3)
      // a few runs escape the line where the paper was wet
      if (bleedK > 0.8) for (let i = 0; i < 5; i++) {
        const p = coarse[Math.floor(r() * coarse.length)]!
        g.filter = `blur(${S * 0.02}px)`
        fill(g, deform(circle(p, S * (0.06 + r() * 0.09), 10), 0.6, r, 2), hex(color, 0.16 * strength))
        g.filter = "none"
      }
      for (let i = 0; i < 12; i++) fill(g, deform(base, 0.4 * bleedK, r, 1), hex(color, 0.085 * strength))
      // pigment gathers at the edge
      g.save()
      trace(g, base)
      g.lineJoin = "round"
      g.strokeStyle = hex(shadeHex(color, -0.35), 0.3 * strength)
      g.lineWidth = S * 0.011
      g.stroke()
      g.restore()
    }
    for (const it of d.items) {
      if (it.k === "guide") continue
      if (it.k === "shape") {
        within(g, it.clip, () => {
          g.save()
          g.globalCompositeOperation = "destination-out"
          fill(g, it.poly, it.mat === "white" ? "rgba(0,0,0,1)" : "rgba(0,0,0,.93)")
          g.restore()
          const P = it.pal ?? d.palette
          const col = palOf(P)[it.mat]
          if (!col) return
          if (it.mat === "dark" || it.mat === "mouth") { fill(g, it.poly, hex(col, 0.92)); return }
          const big = length(it.poly) > S * 1.1
          const dark = it.shade ? shadeHex(col, -0.25) : col
          wash(it.poly, dark, it.id, 1, big ? 1 : 0.5)
          if (big) {
            // wet-in-wet: drop neighbouring pigments in while it is damp
            const r = rng(`${it.id}wet`)
            const xs = it.poly.map((p) => p[0])
            const ys = it.poly.map((p) => p[1])
            const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys)
            const drops = it.mat === "body" || it.mat === "body2" ? [P.accent, shadeHex(P.body, -0.45), P.body2, "#3c5a9a", shadeHex(col, -0.3)] : [shadeHex(col, -0.4), "#3c5a9a"]
            const m = canvas(W.width, W.height)
            const mg = ctxOf(m)
            for (let i = 0; i < drops.length * 2; i++) {
              const c: P2 = [lerp(x0, x1, r()), lerp(y0, y1, 0.1 + 0.9 * r())]
              const rad = S * (0.16 + r() * 0.26)
              const blob = deform(circle(c, rad, 12, rad * (0.6 + r() * 0.5)), 0.6, r, 2)
              mg.filter = `blur(${S * (0.02 + r() * 0.06)}px)`
              fill(mg, blob, hex(drops[i % drops.length]!, 0.34 + r() * 0.3))
              mg.filter = "none"
              if (r() < 0.35) { trace(mg, blob); mg.strokeStyle = hex(drops[i % drops.length]!, 0.18); mg.lineWidth = S * 0.006; mg.stroke() }
            }
            for (let i = 0; i < 5; i++) {
              // blooms: clean water pushes pigment away
              const c: P2 = [lerp(x0, x1, r()), lerp(y0, y1, r())]
              mg.save()
              mg.globalCompositeOperation = "destination-out"
              mg.filter = `blur(${S * 0.03}px)`
              fill(mg, deform(circle(c, S * (0.06 + r() * 0.1), 10), 0.7, r, 2), "rgba(0,0,0,.55)")
              mg.restore()
            }
            const soft = deform(resample([...it.poly, it.poly[0]!], S * 0.06).slice(0, -1), 0.5, rng(`${it.id}s`), 2)
            within(g, soft, () => g.drawImage(m, 0, 0))
          }
        })
      } else if (it.k === "tone") {
        if (it.mat === "dark") continue
        const col = palOf(it.pal ?? d.palette)[it.mat] || "#8890a8"
        within(g, it.clip, () => { g.filter = `blur(${S * 0.008}px)`; wash(it.poly, shadeHex(col, -0.4), it.id, it.level * 0.75, 0.6); g.filter = "none" })
      }
    }
    // granulation
    tile(g, grainTex("granule", 0.34, 0.22, 200, 0.2), "destination-out", 0.2)
    ctx.save()
    ctx.globalCompositeOperation = "multiply"
    ctx.drawImage(W, 0, 0)
    ctx.restore()
    // pen line, on its own layer so later shapes can hide it
    const I = canvas(W.width, W.height)
    const ig = ctxOf(I)
    for (const it of d.items) {
      if (it.k === "shape") { ig.save(); ig.globalCompositeOperation = "destination-out"; within(ig, it.clip, () => fill(ig, it.poly, "#000")); ig.restore(); if (it.mat === "dark" && !it.shade) within(ig, it.clip, () => fill(ig, it.poly, "#17161c")) }
      if (it.k === "line") within(ig, it.clip, () => {
        for (const s of segments(it, S, { over: 0.5 })) {
          const p = wobble(s.pts, s.id, 0.0035, S, frame, 0.2)
          const r = rng(`${s.id}dry`)
          ribbon(ig, p, pressure(p, s.id, ROLE_W[it.role] * S * (it.w ?? 1) * 0.5, { side: s.side, taperIn: 8, taperOut: 10, jitter: 0.5 }), `rgba(22,20,28,${0.78 + r() * 0.2})`)
        }
      })
    }
    tile(ig, grainTex("dry", 0.3, 0.07, 100), "destination-out", 0.85)
    ctx.drawImage(I, 0, 0)
  },
}
