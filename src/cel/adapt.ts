/** Feed the older display list to the cel engine: same drawing, rules it was never authored for. */
import type { Drawing, Mat as M, Palette } from "../list.ts"
import type { P2 } from "../geo.ts"
import type { Part, Sheet } from "./engine.ts"
import type { Kind, Mat } from "./style.ts"

const KIND: Readonly<Record<M, Kind>> = { body: "hard", body2: "cloth", accent: "hard", glove: "cloth", limb: "cloth", white: "paint", dark: "hard", eye: "paint", mouth: "paint", tongue: "paint", cheek: "cloth", none: "paint" }
type Draft = { -readonly [K in keyof Part]: Part[K] } & { shade: Array<ReadonlyArray<P2>>; lines: Array<{ pts: ReadonlyArray<P2>; w?: number; ends?: "both" | "none" }> }

export const adapt = (d: Drawing, w: number, h: number): Sheet => {
  const mats: Record<string, Mat> = {}
  const matOf = (p: Palette, m: M, who: string): string => {
    const key = `${who}.${m}`
    const cloth = ["cur", "win", "hills"].includes(who)
    mats[key] ??= { base: p[m], kind: cloth ? "cloth" : KIND[m] }
    return key
  }
  const parts: Array<Draft> = []
  let n = 0
  for (const it of d.items) {
    if (it.k === "guide") continue
    const who = it.id.split(".")[0]!
    if (it.k === "shape") {
      const host = it.clip ? [...parts].reverse().find((p) => p.d === it.clip) : undefined
      const paint = ["white", "dark", "mouth", "tongue", "eye"].includes(it.mat)
      const size = Math.sqrt(Math.abs(it.poly.reduce((a, p, i) => { const q = it.poly[(i + 1) % it.poly.length]!; return a + p[0] * q[1] - q[0] * p[1] }, 0) / 2))
      const back = ["win", "hills", "bars"].includes(who)
      parts.push({
        id: `${it.id}#${n++}`, d: it.poly, mat: matOf(it.pal ?? d.palette, it.mat, who), line: 0, shade: [], lines: [],
        ...(host ? { clip: host.id, noSil: true } : {}), ...(paint && size < 70 ? { flat: true, noSil: true } : {}),
        auto: paint || back || it.clip ? 0 : Math.min(16, size * 0.09),
        ...(["cur", "win", "hills", "bars", "pic", "lamp"].includes(who) ? { noSil: true } : {}),
      })
      const p = parts[parts.length - 1]!
      if (it.mat === "eye") {
        const poly = it.poly
        p.paint = (g) => {
          const ys = poly.map((q) => q[1]), xs = poly.map((q) => q[0])
          const gr = g.createLinearGradient(0, Math.min(...ys), 0, Math.max(...ys))
          gr.addColorStop(0, "rgba(10,14,24,.75)"); gr.addColorStop(0.5, "rgba(10,14,24,.1)"); gr.addColorStop(1, "rgba(255,255,220,.55)")
          g.fillStyle = gr
          g.fillRect(Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
        }
      }
    } else if (it.k === "tone") {
      if (it.mat === "eye" || it.mat === "dark") continue
      const host = [...parts].reverse().find((p) => p.d === it.clip)
      if (it.mat === "cheek") {
        if (it.poly.length < 30 && it.poly === it.clip) parts.push({ id: `${it.id}#${n++}`, d: it.poly, mat: matOf(it.pal ?? d.palette, it.mat, who), line: 0, shade: [], lines: [], noSil: true, flat: true })
        continue
      }
      if (host && it.level < 1.05) (host.shade as Array<ReadonlyArray<P2>>).push(it.poly)
    } else {
      const host = [...parts].reverse().find((p) => p.d === it.pts)
      const thin = { outline: 1.5, inner: 1, detail: 0.75, fine: 0.5 }[it.role] * (it.w ?? 1)
      if (host && it.closed) host.line = Math.max(0.5, Math.min(1.4, thin * 0.8))
      else {
        // a stroke of its own, on top
        parts.push({ id: `${it.id}#${n++}`, d: ribbonPoly(it.closed ? [...it.pts, it.pts[0]!] : it.pts, 2.9 * thin), mat: "ink", line: 0, shade: [], lines: [], noSil: true, flat: true, ...(it.clip ? (() => { const c = [...parts].reverse().find((p) => p.d === it.clip); return c ? { clip: c.id } : {} })() : {}) })
      }
    }
  }
  mats.ink = { base: "#121116", kind: "paint" }
  return { w, h, parts, mats, back: (g) => {
    for (const s of d.shadows) { g.save(); g.translate(s.c[0], s.c[1]); g.scale(1, s.ry / s.rx); g.fillStyle = "rgba(40,32,60,.16)"; g.beginPath(); g.arc(0, 0, s.rx, 0, 7); g.fill(); g.restore() }
  } }
}
const ribbonPoly = (p: ReadonlyArray<P2>, w: number): Array<P2> => {
  const l: Array<P2> = [], r: Array<P2> = []
  p.forEach((q, i) => {
    const a = p[Math.max(0, i - 1)]!, b = p[Math.min(p.length - 1, i + 1)]!
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    const t = i / (p.length - 1)
    const h = (w / 2) * Math.min(1, 0.35 + Math.min(t, 1 - t) * 6)
    l.push([q[0] - ((b[1] - a[1]) / d) * h, q[1] + ((b[0] - a[0]) / d) * h])
    r.push([q[0] + ((b[1] - a[1]) / d) * h, q[1] - ((b[0] - a[0]) / d) * h])
  })
  return [...l, ...r.reverse()]
}
