import { bounds, circle, clamp, lerp, noise1, rng, TAU } from "../geo.ts"
import type { P2 } from "../geo.ts"
import { canvas, ctxOf, fill, grainTex, halftone, hatchSegs, hex, pressure, ribbon, ROLE_W, segments, shadeHex, tile, within, wobble } from "../brush.ts"
import type { Ctx } from "../brush.ts"
import { lay, sheet, WHITE } from "../paper.ts"
import { castShadow } from "./common.ts"
import type { Line, Skin } from "./common.ts"

/** Grain follows drawing size so a thumbnail isn't all speckle. */
const gs = (S: number): number => clamp(S / 260, 0.55, 2)
type Plate = { c: HTMLCanvasElement; g: Ctx }
const plate = (ctx: Ctx): Plate => { const c = canvas(ctx.canvas.width, ctx.canvas.height); return { c, g: ctxOf(c) } }
const knock = (g: Ctx, poly: ReadonlyArray<P2>, clip?: ReadonlyArray<P2>): void => {
  g.save()
  g.globalCompositeOperation = "destination-out"
  within(g, clip, () => fill(g, poly, "#000"))
  g.restore()
}
const inkLine = (g: Ctx, it: Line, S: number, color: string, k: number, frame: number, o: { amp?: number; contrast?: number; boil?: number; over?: number } = {}): void => {
  within(g, it.clip, () => {
    for (const s of segments(it, S, { over: o.over ?? 0.4 })) {
      const p = wobble(s.pts, s.id, o.amp ?? 0.003, S, frame, o.boil ?? 0.25)
      ribbon(g, p, pressure(p, s.id, ROLE_W[it.role] * S * (it.w ?? 1) * k, { side: s.side, taperIn: 3, taperOut: 5, jitter: 0.18, contrast: o.contrast ?? 1 }), color)
    }
  })
}

/* ---------- riso: two drums, never quite in register ---------- */
export const riso: Skin = {
  id: "riso", label: "Riso", group: "Print",
  ground: (ctx) => lay(ctx, sheet("riso", [243, 241, 233])),
  render: (ctx, d, { frame }) => {
    const { S } = d
    castShadow(ctx, d, "rgba(60,30,90,ALPHA)", 0.55)
    const A = plate(ctx) // pink
    const B = plate(ctx) // blue
    const C = plate(ctx) // cream
    const PINK = "#f0268f", BLUE = "#2a3fc0"
    for (const it of d.items) {
      if (it.k === "guide") continue
      if (it.k === "shape") {
        for (const p of [A, B]) knock(p.g, it.poly, it.clip)
        within(C.g, it.clip, () => fill(C.g, it.poly, it.mat === "white" || it.mat === "glove" ? "#fbf7ea" : "#f1e6d0"))
        if (it.mat === "body2" || it.mat === "accent" || it.mat === "limb") within(A.g, it.clip, () => fill(A.g, it.poly, hex(PINK, it.mat === "accent" ? 0.82 : 0.4)))
        if (it.mat === "cheek" || it.mat === "tongue") within(A.g, it.clip, () => fill(A.g, it.poly, hex(PINK, 0.62)))
        if (it.mat === "dark" || it.mat === "mouth") { within(B.g, it.clip, () => fill(B.g, it.poly, BLUE)); within(A.g, it.clip, () => fill(A.g, it.poly, hex(PINK, 0.7))) }
      } else if (it.k === "tone") {
        const g = it.mat === "eye" ? B.g : A.g
        const r = rng(it.id)
        within(g, it.clip, () => {
          if (it.mat === "eye") { fill(g, it.poly, hex(BLUE, 0.45)); return }
          for (const [i, s] of hatchSegs(it.poly, it.angle, S * 0.03, it.id, { ragged: 2.2 }).entries()) ribbon(g, wobble(s, `${it.id}${i}`, 0.004, S, frame >> 1), (t) => S * 0.024 * (0.5 + 0.5 * Math.sin(Math.PI * t)), hex(PINK, 0.5 + r() * 0.45))
        })
      } else {
        inkLine(B.g, it, S, BLUE, 0.85, frame, { amp: 0.0035 })
        if (it.role === "outline" || it.role === "inner") inkLine(A.g, it, S, hex(PINK, 0.75), 0.72, frame, { amp: 0.0035 })
      }
    }
    tile(A.g, grainTex("risoA", 0.44, 0.14, 256, 0.04), "destination-out", 0.7, gs(S))
    tile(B.g, grainTex("risoB", 0.4, 0.12, 256, 0.04), "destination-out", 0.6, gs(S))
    tile(C.g, grainTex("risoC", 0.22, 0.2, 60), "destination-out", 0.4)
    ctx.save()
    ctx.globalCompositeOperation = "multiply"
    ctx.drawImage(C.c, S * 0.004, S * 0.003)
    ctx.drawImage(A.c, S * 0.011, -S * 0.008)
    ctx.drawImage(B.c, -S * 0.003, S * 0.002)
    ctx.restore()
  },
}

/* ---------- manga ---------- */
export const manga: Skin = {
  id: "manga", label: "Screentone", group: "Print",
  ground: (ctx) => lay(ctx, WHITE()),
  render: (ctx, d, { frame }) => {
    const { S } = d
    castShadow(ctx, d, "rgba(10,10,14,ALPHA)", 0.7)
    const gap = Math.max(2.6, S * 0.017)
    const L = plate(ctx)
    const g = L.g
    for (const it of d.items) {
      if (it.k === "guide") continue
      if (it.k === "shape") {
        const black = it.mat === "dark" || it.mat === "mouth" || it.mat === "limb"
        within(g, it.clip, () => fill(g, it.poly, black ? "#111013" : "#fcfbf7"))
        const lv = it.mat === "accent" ? 0.34 : it.mat === "body2" ? 0.2 : it.mat === "tongue" || it.mat === "cheek" ? 0.24 : it.mat === "eye" ? 0.4 : 0
        if (lv) within(g, it.clip, () => halftone(g, it.poly, gap, 0.78, () => lv, "#111013"))
        if (it.mat === "body") {
          const b = bounds(it.poly)
          halftone(g, it.poly, gap, 0.78, (x, y) => clamp((y - lerp(b.y0, b.y1, 0.55)) / (b.y1 - b.y0)) * 0.42 + clamp((x - lerp(b.x0, b.x1, 0.8)) / (b.x1 - b.x0)) * 0.6, "#111013")
        }
      } else if (it.k === "tone") {
        if (it.mat === "dark" || it.mat === "eye") continue
        const b = bounds(it.poly)
        within(g, it.clip, () => halftone(g, it.poly, gap, 0.78, (x, y) => it.level * (0.3 + 0.35 * clamp((y - b.y0) / (b.y1 - b.y0 + 1)) + 0.15 * clamp((x - b.x0) / (b.x1 - b.x0 + 1))), "#111013"))
      } else inkLine(g, it, S, "#0f0e12", it.role === "outline" ? 1.05 : 0.8, frame, { amp: 0.0016, boil: 0.15 })
    }
    ctx.save()
    ctx.globalCompositeOperation = "multiply"
    ctx.drawImage(L.c, 0, 0)
    ctx.restore()
  },
}

/* ---------- gig poster: two-colour screenprint with pulled ink ---------- */
export const gig: Skin = {
  id: "gig", label: "Gig poster", group: "Print",
  ground: (ctx) => lay(ctx, WHITE()),
  render: (ctx, d, { frame }) => {
    const { S } = d
    castShadow(ctx, d, "rgba(30,20,20,ALPHA)", 0.6)
    const O = plate(ctx), U = plate(ctx), K = plate(ctx), W = plate(ctx)
    const gap = Math.max(3, S * 0.028)
    const OR = "#ee5a24", BL = "#2fa3d8"
    const seen = new Map<string, ReturnType<typeof bounds>>()
    for (const it of d.items) {
      if (it.k === "guide") continue
      if (it.k === "shape") {
        for (const p of [O, U, K]) knock(p.g, it.poly, it.clip)
        within(W.g, it.clip, () => fill(W.g, it.poly, "#fbfaf4"))
        if (it.mat === "body" || it.mat === "body2" || it.mat === "glove" || it.mat === "accent") {
          const b = bounds(it.poly)
          const who = it.id.split(".")[0]!
          const was = seen.get(who)
          if (it.mat === "body" && (!was || b.x1 - b.x0 > was.x1 - was.x0)) seen.set(who, b)
          const ref = (it.mat === "body" ? seen.get(who) : undefined) ?? b
          const midY = lerp(ref.y0, ref.y1, 0.62)
          const fx = (x: number): number => clamp((x - ref.x0) / (ref.x1 - ref.x0 + 1))
          within(O.g, it.clip, () => {
            if (it.mat === "accent") fill(O.g, it.poly, OR)
            else halftone(O.g, it.poly, gap, 0.35, (x, y) => (y < midY ? 1.5 * (1 - fx(x) * 1.25) : 1.4 * (fx(x) - 0.25)), OR)
          })
          within(U.g, it.clip, () => {
            if (it.mat === "body2") fill(U.g, it.poly, BL)
            else if (it.mat !== "accent") halftone(U.g, it.poly, gap, 1.1, (x, y) => (y >= midY ? 1.35 * (1 - fx(x) * 1.1) : 0), BL)
          })
        }
        if (it.mat === "eye" || it.mat === "tongue" || it.mat === "cheek") within(O.g, it.clip, () => fill(O.g, it.poly, OR))
        if (it.mat === "dark" || it.mat === "mouth" || it.mat === "limb") within(K.g, it.clip, () => fill(K.g, it.poly, "#17141a"))
      } else if (it.k === "tone") {
        if (it.mat === "eye" || it.mat === "dark") continue
        const r = rng(it.id)
        within(K.g, it.clip, () => { for (const s of hatchSegs(it.poly, -Math.PI / 2 + 0.02, S * 0.03, it.id, { ragged: 4 })) if (r() < 0.8) ribbon(K.g, s, (t) => S * 0.024 * (0.2 + 0.8 * (1 - t)), `rgba(60,16,40,${0.3 + r() * 0.5 * it.level})`) })
      } else inkLine(K.g, it, S, "#141116", it.role === "outline" ? 1.35 : 1, frame, { amp: 0.003 })
    }
    // squeegee drag, then a tired screen
    for (const [p, dx] of [[O, 0.006], [U, -0.005]] as const) {
      const t = plate(ctx)
      t.g.drawImage(p.c, 0, 0)
      p.g.globalAlpha = 0.28
      for (let i = 1; i < 5; i++) p.g.drawImage(t.c, S * dx * i, S * 0.004 * i)
      p.g.globalAlpha = 1
    }
    tile(O.g, grainTex("gigO", 0.27, 0.06, 170, 0.1), "destination-out", 0.75, gs(S))
    tile(U.g, grainTex("gigU", 0.27, 0.06, 170, 0.1), "destination-out", 0.75, gs(S))
    tile(K.g, grainTex("gigK", 0.2, 0.05, 200, 0.12), "destination-out", 0.85, gs(S))
    ctx.save()
    ctx.globalCompositeOperation = "multiply"
    ctx.drawImage(W.c, 0, 0)
    ctx.drawImage(U.c, S * 0.016, S * 0.01)
    ctx.drawImage(O.c, -S * 0.012, S * 0.004)
    ctx.drawImage(K.c, 0, 0)
    ctx.restore()
  },
}

/* ---------- ink punch: CMYK blobs, dots and a burst ---------- */
export const punch: Skin = {
  id: "punch", label: "Ink punch", group: "Print",
  ground: (ctx) => lay(ctx, WHITE()),
  render: (ctx, d, { frame }) => {
    const { S } = d
    const pts = d.items.flatMap((i) => (i.k === "shape" ? i.poly : []))
    const b = bounds(pts)
    const c: P2 = [(b.x0 + b.x1) / 2, lerp(b.y0, b.y1, 0.55)]
    const r = rng(`burst${frame >> 1}`)
    const CMY = ["#10c8e8", "#f019b8", "#fff01f"]
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * TAU + (r() - 0.5) * 0.12
      const R0 = Math.max(b.x1 - b.x0, b.y1 - b.y0) * (0.62 + r() * 0.1)
      const R1 = R0 + S * (0.15 + r() * 0.5)
      if (r() < 0.35) continue
      const ca = Math.cos(a), sa = Math.sin(a) * 0.92
      ribbon(ctx, Array.from({ length: 8 }, (_, k) => [c[0] + ca * lerp(R0, R1, k / 7), c[1] + sa * lerp(R0, R1, k / 7)] as const), (t) => S * 0.016 * Math.sin(Math.PI * t), CMY[i % 3]!)
    }
    castShadow(ctx, d, "rgba(10,10,14,ALPHA)", 0.8)
    const L = plate(ctx)
    const g = L.g
    const gap = Math.max(3, S * 0.033)
    const camo = (poly: ReadonlyArray<P2>, id: string): void => {
      const q = bounds(poly)
      within(g, poly, () => {
        // three vertical territories with gloopy borders
        const edge = (fx: number, seed: string): Array<P2> => {
          const n = noise1(seed)
          const p: Array<P2> = []
          for (let y = q.y0 - 10; y <= q.y1 + 10; y += S * 0.02) p.push([lerp(q.x0, q.x1, fx) + (n((y / S) * 6) * 0.11 + n((y / S) * 2.3 + 8) * 0.12) * S, y])
          return p
        }
        fill(g, [[q.x0, q.y0], [q.x1, q.y0], [q.x1, q.y1], [q.x0, q.y1]], "#fff01f")
        fill(g, [...edge(0.56, `${id}m`), [q.x0 - 9, q.y1 + 10], [q.x0 - 9, q.y0 - 10]], "#f019b8")
        fill(g, [...edge(0.2, `${id}c`), [q.x0 - 9, q.y1 + 10], [q.x0 - 9, q.y0 - 10]], "#10c8e8")
        const rr = rng(id)
        for (let i = 0; i < 5; i++) fill(g, circle([lerp(q.x0, q.x1, 0.3 + rr() * 0.5), lerp(q.y0, q.y1, rr())], S * (0.02 + rr() * 0.04), 18), i % 2 ? "#f019b8" : "#fff01f")
      })
      halftone(g, poly, gap, 0.6, (x, y) => clamp((x - lerp(q.x0, q.x1, 0.58)) / (q.x1 - q.x0)) * 0.9 * clamp(1.4 - (y - q.y0) / (q.y1 - q.y0)), "#ffffff")
    }
    for (const it of d.items) {
      if (it.k === "guide") continue
      if (it.k === "shape") within(g, it.clip, () => {
        const m = it.mat
        if (m === "body" || m === "glove") camo(it.poly, `${it.id.split(".")[0]}${m}`)
        else fill(g, it.poly, m === "white" ? "#ffffff" : m === "dark" || m === "mouth" || m === "limb" ? "#0c0b10" : m === "eye" ? "#10c8e8" : m === "accent" ? "#1c6fe0" : m === "body2" ? "#fff01f" : "#f019b8")
        if (m === "accent") halftone(g, it.poly, gap, 0.6, () => 0.2, "#10c8e8")
      })
      else if (it.k === "tone") {
        if (it.mat === "dark" || it.mat === "eye") continue
        g.save()
        g.globalCompositeOperation = "multiply"
        within(g, it.clip, () => {
          if (it.mat === "cheek") halftone(g, it.poly, gap * 0.8, 0.3, () => 0.7, "#f019b8")
          else fill(g, it.poly, it.level > 0.7 ? "rgba(30,60,210,.62)" : "rgba(120,60,20,.5)")
        })
        g.restore()
      } else inkLine(g, it, S, "#0b0a0f", it.role === "outline" ? 1.35 : 0.95, frame, { amp: 0.002, contrast: 1.2 })
    }
    // chromatic misregister behind the key line
    for (const [col, dx, dy] of [["#10c8e8", -0.02, -0.004], ["#fff01f", 0.022, 0.008]] as const) {
      const t = plate(ctx)
      t.g.drawImage(L.c, 0, 0)
      t.g.globalCompositeOperation = "source-in"
      t.g.fillStyle = col
      t.g.fillRect(0, 0, L.c.width, L.c.height)
      ctx.drawImage(t.c, dx * S, dy * S)
    }
    ctx.drawImage(L.c, 0, 0)
  },
}

/* ---------- linocut: gouged light on one block ---------- */
export const lino: Skin = {
  id: "lino", label: "Linocut", group: "Print",
  ground: (ctx) => lay(ctx, sheet("lino", [240, 231, 212], { mottle: 9 })),
  render: (ctx, d, { frame }) => {
    const { S } = d
    const K = plate(ctx)
    const P = plate(ctx)
    const g = K.g
    const INK = "#1d2a3f"
    for (const s of d.shadows) {
      const r = rng(`g${s.c[0]}`)
      for (let i = 0; i < 7; i++) {
        const y = s.c[1] + (i - 2) * S * 0.026
        const w = s.rx * (1.1 - Math.abs(i - 2) * 0.14) * (0.8 + r() * 0.3)
        ribbon(g, [[s.c[0] - w, y], [s.c[0] + (r() - 0.5) * w, y + S * 0.004], [s.c[0] + w, y]], (t) => S * 0.015 * Math.sin(Math.PI * clamp(t * 0.9 + 0.05)), INK)
      }
    }
    for (const it of d.items) {
      if (it.k === "guide") continue
      if (it.k === "shape") {
        knock(g, it.poly, it.clip)
        knock(P.g, it.poly, it.clip)
        if (it.mat === "dark" || it.mat === "mouth" || it.mat === "limb" || it.mat === "accent") within(g, it.clip, () => fill(g, it.poly, INK))
        if (it.mat === "body" || it.mat === "body2" || it.mat === "cheek" || it.mat === "tongue") within(P.g, it.clip, () => fill(P.g, it.poly, it.mat === "body" ? shadeHex((it.pal ?? d.palette).body, 0.12) : shadeHex((it.pal ?? d.palette).body2, 0.1)))
      } else if (it.k === "tone") {
        if (it.mat === "dark") continue
        within(g, it.clip, () => {
          if (it.level > 1.05) { fill(g, it.poly, INK); return }
          if (it.mat === "accent") {
            // light carved out of a solid: gouges
            g.save()
            g.globalCompositeOperation = "destination-out"
            for (const s of hatchSegs(it.poly, it.angle, S * 0.03, it.id, { ragged: 3 })) ribbon(g, s, (t) => S * 0.012 * (1 - t), "#000")
            g.restore()
            return
          }
          for (const [i, s] of hatchSegs(it.poly, it.mat === "glove" ? it.angle : 0.12, S * 0.026, it.id, { ragged: 2.5, jitter: 0.35 }).entries()) ribbon(g, wobble(s, `${it.id}${i}`, 0.002, S, 0), (t) => S * 0.0205 * Math.sqrt(clamp(t * 1.15)), INK)
        })
      } else inkLine(g, it, S, INK, it.role === "outline" ? 1.6 : it.role === "inner" ? 1.2 : 1.1, frame >> 3, { amp: 0.0025, boil: 0.1, over: 0.2 })
    }
    // chatter marks left around the block
    const pts = d.items.flatMap((i) => (i.k === "shape" ? i.poly : []))
    const b = bounds(pts)
    const r = rng("chatter")
    const out = plate(ctx)
    for (let i = 0; i < 90; i++) {
      const a = r() * TAU
      const R = 1.02 + r() * 0.3
      const c: P2 = [lerp(b.x0, b.x1, 0.5) + Math.cos(a) * (b.x1 - b.x0) * 0.56 * R, lerp(b.y0, b.y1, 0.5) + Math.sin(a) * (b.y1 - b.y0) * 0.56 * R]
      const l = S * (0.03 + r() * 0.07)
      ribbon(out.g, [c, [c[0] + Math.cos(a) * l * 0.5 + r() * 2, c[1] + Math.sin(a) * l * 0.5], [c[0] + Math.cos(a) * l, c[1] + Math.sin(a) * l]], (t) => S * 0.009 * (1 - t), INK)
    }
    for (const it of d.items) if (it.k === "shape" && !it.clip) knock(out.g, it.poly)
    tile(g, grainTex("lino", 0.22, 0.06, 170, 0.12), "destination-out", 0.8, gs(S))
    tile(P.g, grainTex("linoP", 0.28, 0.1, 140, 0.14), "destination-out", 0.5, gs(S))
    ctx.save()
    ctx.globalCompositeOperation = "multiply"
    ctx.drawImage(P.c, S * 0.012, S * 0.008)
    ctx.drawImage(out.c, 0, 0)
    ctx.drawImage(K.c, 0, 0)
    ctx.restore()
  },
}
