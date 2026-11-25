import { hexRgb } from "../splash/tones.ts"
import type { Art } from "../splash/engine.ts"
import { TAPE, tapeOver } from "../splash/tape.ts"
import { render } from "../splash/engine.ts"
import { caps, cipher } from "./type.ts"

type G = CanvasRenderingContext2D
export type Look = { id: string; dark: string; mid: string; soft: string; pale: string; tick: readonly [string, string]; glyph: string; icons: readonly [string, string]; glow: string; art: Art }

/** The same drawing with another hair colour: only its flats, gradient and washes change, every shape stays. */
const rehair = (front: string, back: string, tip: string, tipB: string, lit: string, fly: string): Art => ({
  ...TAPE, over: tapeOver(fly),
  defs: { ...TAPE.defs, hairF: { ...TAPE.defs.hairF!, color: front }, hairB: { ...TAPE.defs.hairB!, color: back } },
  grads: TAPE.grads.map((q) => (q.on[0] === "hairF" ? { ...q, to: hexRgb(tip) } : q.on[0] === "hairB" ? { ...q, to: hexRgb(tipB) } : q)),
  washes: TAPE.washes.map((q) => (q.late ? (q.on[0] === "hairF" ? { ...q, color: hexRgb(lit) } : q) : q.on[0] === "hairF" ? { ...q, color: hexRgb(q.y < 200 ? lit : tip) } : q.on[0] === "hairB" ? { ...q, color: hexRgb(tipB) } : q)),
})
export const LOOKS: Readonly<Record<string, Look>> = {
  jacket: { id: "jacket", dark: "#1d6460", mid: "#79cdbb", soft: "#a9e3d2", pale: "#f5fffb", tick: ["#bfeccb", "#86d6cc"], glyph: "#93dccb", icons: ["#a8efe0", "#d3ee8c"], glow: "90,230,205", art: TAPE },
  hair: { id: "hair", dark: "#1f6a55", mid: "#82d3ac", soft: "#b1e6c4", pale: "#f6fff9", tick: ["#cfeeb6", "#8fdcbc"], glyph: "#9be0bd", icons: ["#b2f2d5", "#d8ee8f"], glow: "100,235,180", art: rehair("#9fd0b4", "#76a492", "#6fa6a4", "#5b8390", "#d3efc9", "rgba(62,104,92,.85)") },
}

/* ---------- helpers ---------- */
/** Output pixels per card unit: blurs and shadows ignore the transform, so they are scaled by hand. */
let Q = 1
let seed = 7
const rnd = (): number => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
const layer = (w: number, h: number): { c: HTMLCanvasElement; g: G } => { const c = document.createElement("canvas"); c.width = Math.round(w); c.height = Math.round(h); return { c, g: c.getContext("2d", { willReadFrequently: true })! } }
const lin = (g: G, x0: number, y0: number, x1: number, y1: number, ...stops: Array<readonly [number, string]>): CanvasGradient => { const q = g.createLinearGradient(x0, y0, x1, y1); for (const [o, c] of stops) q.addColorStop(o, c); return q }
/** Chew the edges of a mask the way worn print does: soften it, add slow noise, cut again. */
const rough = (c: HTMLCanvasElement, amount: number, cell: number, color: readonly [number, number, number]): void => {
  const { width: w, height: h } = c, g = c.getContext("2d", { willReadFrequently: true })!
  const b = layer(w, h); b.g.filter = `blur(${amount}px)`; b.g.drawImage(c, 0, 0)
  const n = layer(Math.ceil(w / cell), Math.ceil(h / cell)), id = n.g.createImageData(n.c.width, n.c.height)
  for (let i = 0; i < id.data.length; i += 4) { id.data[i] = rnd() * 255; id.data[i + 3] = 255 }
  n.g.putImageData(id, 0, 0)
  const up = layer(w, h); up.g.imageSmoothingQuality = "high"; up.g.drawImage(n.c, 0, 0, w, h)
  const a = b.g.getImageData(0, 0, w, h), q = up.g.getImageData(0, 0, w, h).data, e = 255 / 12
  for (let i = 0; i < a.data.length; i += 4) { const v = a.data[i + 3]! + (q[i]! - 128) * 0.75; a.data[i] = color[0]; a.data[i + 1] = color[1]; a.data[i + 2] = color[2]; a.data[i + 3] = Math.max(0, Math.min(255, 128 + ((v - 128) * 128) / e)) }
  g.clearRect(0, 0, w, h); g.putImageData(a, 0, 0)
}
/* ---------- the tape that crosses the card ---------- */
type P = readonly [number, number]
const spline = (pts: ReadonlyArray<P>, n = 260): Array<P> => {
  const out: Array<P> = []
  for (let i = 0; i <= n; i++) {
    const u = (i / n) * (pts.length - 1), k = Math.min(pts.length - 2, Math.floor(u)), t = u - k
    const p = (j: number): P => pts[Math.max(0, Math.min(pts.length - 1, j))]!
    const [a, b, c, d] = [p(k - 1), p(k), p(k + 1), p(k + 2)]
    const f = (m: 0 | 1): number => 0.5 * (2 * b[m] + (c[m] - a[m]) * t + (2 * a[m] - 5 * b[m] + 4 * c[m] - d[m]) * t * t + (3 * b[m] - a[m] - 3 * c[m] + d[m]) * t * t * t)
    out.push([f(0), f(1)])
  }
  return out
}
const TOP = spline([[-40, 742], [60, 778], [240, 862], [470, 936], [740, 982], [980, 1002], [1260, 1006]])
const LOW = spline([[-40, 748], [60, 800], [240, 912], [470, 1010], [740, 1068], [980, 1096], [1260, 1106]])
const MID = spline([[-40, 745], [60, 794], [240, 884], [470, 962], [740, 1012], [980, 1034], [1260, 1040]])
const off = (c: ReadonlyArray<P>, d: number): Array<P> => c.map(([x, y], i) => { const a = c[Math.max(0, i - 1)]!, b = c[Math.min(c.length - 1, i + 1)]!, l = Math.hypot(b[0] - a[0], b[1] - a[1]); return [x - ((b[1] - a[1]) / l) * d, y + ((b[0] - a[0]) / l) * d] })
const line = (g: G, c: ReadonlyArray<P>, move = true): void => c.forEach(([x, y], i) => (i || !move ? g.lineTo(x, y) : g.moveTo(x, y)))
const between = (g: G, a: ReadonlyArray<P>, b: ReadonlyArray<P>): void => { g.beginPath(); line(g, a); line(g, [...b].reverse(), false); g.closePath() }
const blend = (a: ReadonlyArray<P>, b: ReadonlyArray<P>, f: (u: number) => number): Array<P> => a.map((p, i) => { const t = f(i / (a.length - 1)); return [p[0] + (b[i]![0] - p[0]) * t, p[1] + (b[i]![1] - p[1]) * t] })
const at = (c: ReadonlyArray<P>, u: number): P => c[Math.max(0, Math.min(c.length - 1, Math.round(u * (c.length - 1))))]!

const background = (g: G, S: number, L: Look): void => {
  g.fillStyle = "#121213"; g.fillRect(0, 0, 1200, 1200)
  // lower field: the label's name, huge, tilted, one step above black
  g.save(); g.translate(600, 900); g.rotate(-0.42)
  const word = (t: string, x: number, y: number, h: number, c: string): void => { caps(g, h); g.fillStyle = c; g.fillText(t, x, y) }
  word("LOW TIDE", -720, 60, 200, "#262627"); word("LOW TIDE", -330, 300, 190, "#272728"); word("TIDE", 330, 520, 260, "#262627")
  g.fillStyle = "#252526"; g.fillStyle = "#2a2a2b"; caps(g, 40); g.fillText("RECORD EVERYTHING", -690, 116); g.fillText("SIDE A / SIDE B", -330, 356)
  g.fillStyle = "#202021"; caps(g, 12, "'Avenir Next', Helvetica, sans-serif", "700"); for (let i = 0; i < 4; i++) g.fillText("KEEP THE RED LIGHT ON — WHAT THE WATER TAKES, THE TAPE KEEPS", -190, 66 + i * 18)
  g.restore()
  // middle field: a lighter plate with a printed dot
  g.fillStyle = lin(g, 0, 250, 0, 760, [0, "#303032"], [0.42, "#2b2b2d"], [1, "rgba(24,24,25,0)"]); g.fillRect(0, 250, 1200, 520)
  g.save(); g.translate(890, 620); g.rotate(-0.78); g.fillStyle = "#141415"; g.fillRect(-560, -44, 1200, 88); g.restore()
  // top field: black, with one strip of worn lettering
  g.fillStyle = "#111112"; g.fillRect(0, 0, 1200, 250)
  const t = layer(1200 * S, 160 * S)
  t.g.scale(S, S); t.g.transform(1, 0, -0.34, 1, 40, 0); t.g.fillStyle = "#fff"; cipher(t.g, "LOW TIDE", -20, 14, 128, 1.02, 1.7); t.g.fill()
  rough(t.c, 1.5 * S, 4 * S, [40, 40, 41])
  g.drawImage(t.c, 0, 38, 1200, 160)
  const e = layer(1200 * S, 30 * S); e.g.fillStyle = "#fff"; e.g.fillRect(0, 0, 1200 * S, 14 * S); rough(e.c, 1.6 * S, 4 * S, [17, 17, 18]); g.drawImage(e.c, 0, 240, 1200, 30)
  // dots
  for (let y = 0, r = 0; y < 1200; y += 3.6, r++) for (let x = r % 2 ? 3.6 : 0; x < 1200; x += 7.2) { if (y < 252) continue; g.fillStyle = y < 720 ? "rgba(0,0,0,.24)" : "rgba(0,0,0,.28)"; g.beginPath(); g.arc(x, y, 1.15, 0, 7); g.fill() }
  // air: smoke to the right and behind the head, then corners go down
  const puff = (x: number, y: number, r: number, c: string): void => { const q = g.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, c); q.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = q; g.fillRect(x - r, y - r, r * 2, r * 2) }
  puff(1130, 640, 260, "rgba(190,200,200,.1)"); puff(1060, 860, 240, `rgba(${L.glow},.06)`); puff(60, 480, 300, `rgba(${L.glow},.07)`); puff(560, 420, 520, "rgba(210,220,220,.07)")
  puff(1200, 1120, 420, "rgba(0,0,0,.35)"); puff(0, 1200, 320, "rgba(0,0,0,.2)")
}

type Icon = (g: G) => void
const round = (g: G, pts: ReadonlyArray<P>, r: number): void => { g.beginPath(); const n = pts.length; for (let i = 0; i < n; i++) { const a = pts[i]!, b = pts[(i + 1) % n]!, z = pts[(i + n - 1) % n]!; if (!i) g.moveTo((z[0] + a[0]) / 2, (z[1] + a[1]) / 2); g.arcTo(a[0], a[1], b[0], b[1], r) } g.closePath() }
const PLAY: Icon = (g) => { round(g, [[-26, -32], [36, 0], [-26, 32]], 7); g.fill() }
const SKIP: Icon = (g) => { round(g, [[-40, -26], [2, 0], [-40, 26]], 5); g.fill(); round(g, [[-2, -26], [40, 0], [-2, 26]], 5); g.fill() }
const PAUSE: Icon = (g) => { round(g, [[-22, -27], [-6, -27], [-6, 27], [-22, 27]], 4); g.fill(); round(g, [[6, -27], [22, -27], [22, 27], [6, 27]], 4); g.fill() }
const LEVELS: Icon = (g) => { [26, 48, 68, 40, 56, 22].forEach((h, i) => { const x = -44 + i * 17; round(g, [[x, 34 - h], [x + 11, 34 - h], [x + 11, 34], [x, 34]], 3); g.fill() }) }
const CASSETTE: Icon = (g) => {
  g.beginPath(); g.roundRect(-46, -30, 92, 60, 9); g.roundRect(-31, -15, 62, 25, 12)
  g.fill("evenodd"); for (const x of [-18, 18]) { g.beginPath(); g.arc(x, -2.5, 7, 0, 7); g.fill() }
}
const float = (g: G, icon: Icon, x: number, y: number, s: number, rot: number, color: string, blur: number, a: number): void => {
  const t = layer(260 * Q, 260 * Q); t.g.scale(Q, Q); t.g.translate(130, 130); t.g.rotate(rot); t.g.scale(s * 1.4, s * 1.4); t.g.fillStyle = color; icon(t.g)
  g.save(); g.globalAlpha = a
  for (const [b, k] of [[26, 0.75], [10, 0.5]] as const) { g.filter = `blur(${b * Q}px)`; g.globalAlpha = a * k; g.drawImage(t.c, x - 93, y - 93, 186, 186) }
  g.globalAlpha = a; g.filter = blur ? `blur(${blur * Q}px)` : "none"; g.drawImage(t.c, x - 93, y - 93, 186, 186); g.restore()
}
const spark = (g: G, x: number, y: number, r: number, glow: string): void => { g.save(); g.shadowColor = `rgba(${glow},1)`; g.shadowBlur = r * 12 * Q; g.fillStyle = "#f4fffc"; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill() } g.restore() }

const ribbon = (g: G, L: Look): void => {
  g.save(); g.shadowColor = "rgba(0,0,0,.6)"; g.shadowBlur = 40 * Q; g.shadowOffsetY = 14 * Q; g.fillStyle = "#000"; between(g, TOP, LOW); g.fill(); g.restore()
  // body: each twist starts under the band and runs out at the lower edge; everything right of it takes the next colour
  g.save(); between(g, TOP, LOW); g.clip()
  g.fillStyle = lin(g, 0, 780, 420, 960, [0, L.mid], [0.6, L.soft], [1, L.mid]); g.fillRect(-60, 700, 1320, 430)
  const twist = (u0: number, u1: number, fill: CanvasGradient): void => {
    const edge = blend(MID, LOW, (u) => { const t = Math.max(0, Math.min(1, (u - u0) / (u1 - u0))); return t * t * (2 - t) })
    g.save(); g.shadowColor = "rgba(16,70,66,.4)"; g.shadowBlur = 16 * Q; g.fillStyle = fill; between(g, TOP, edge); g.fill(); g.restore()
    g.strokeStyle = "rgba(120,150,144,.55)"; g.lineWidth = 1.8; g.beginPath(); line(g, edge); g.stroke()
  }
  twist(0.04, 0.5, lin(g, 130, 0, 640, 0, [0, "#ffffff"], [0.7, L.pale], [1, "#e6f6f1"]))
  twist(0.2, 0.86, lin(g, 420, 0, 1200, 0, [0, L.mid], [0.3, L.soft], [0.62, L.mid], [1, L.pale]))
  twist(0.6, 1.3, lin(g, 760, 0, 1200, 0, [0, "#ffffff"], [0.6, L.pale], [1, "#ffffff"]))
  // where the tape turns under the band it loses light
  g.filter = `blur(${9 * Q}px)`; g.strokeStyle = "rgba(12,40,40,.5)"; g.lineWidth = 16; g.beginPath(); line(g, MID); g.stroke(); g.filter = "none"
  g.restore()
  g.strokeStyle = "rgba(226,240,236,.75)"; g.lineWidth = 2; g.beginPath(); line(g, off(LOW, -1)); g.stroke()
  // dark band: the recorded side, with its track of pulses
  const a = off(TOP, 10), b = off(TOP, 37)
  g.fillStyle = lin(g, 0, 0, 1200, 0, [0, "#174e4c"], [0.3, L.dark], [0.55, "#2b807a"], [0.62, L.dark], [1, "#1a5956"]); between(g, a, b); g.fill()
  g.save(); between(g, a, b); g.clip(); seed = 41
  for (let i = 6; i < TOP.length * 3; i++) { const u = i / (TOP.length * 3), [x, y] = at(off(TOP, 23.5), u), q = at(off(TOP, 26), u), loud = Math.abs(Math.sin(i * 0.13) * Math.sin(i * 0.047 + 1)) * (0.5 + rnd() * 0.5); if (i % 2 || loud < 0.1) continue; const d = [q[0] - x, q[1] - y] as const, l = Math.hypot(d[0], d[1]), h = 1 + loud * 8; g.strokeStyle = "rgba(190,246,228,.5)"; g.lineWidth = 2; g.beginPath(); g.moveTo(x - (d[0] / l) * h, y - (d[1] / l) * h); g.lineTo(x + (d[0] / l) * h, y + (d[1] / l) * h); g.stroke() }
  g.restore()
  g.strokeStyle = "rgba(12,44,44,.55)"; g.lineWidth = 1.4; g.beginPath(); line(g, b); g.stroke()
  // silver lip
  g.fillStyle = lin(g, 0, 0, 1200, 0, [0, "#f4f7f6"], [0.18, "#b9c2c0"], [0.3, "#eef2f1"], [0.55, "#f8fbfa"], [0.68, "#aeb8b6"], [0.82, "#f3f6f5"], [1, "#c9d1cf"]); between(g, TOP, a); g.fill()
  g.strokeStyle = L.mid; g.lineWidth = 2.4; g.beginPath(); line(g, off(TOP, 10)); g.stroke()
  g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = 1.4; g.beginPath(); line(g, off(TOP, 0.7)); g.stroke()
}
/** The spool the tape comes off: amber like her recorder, cel-shaded by the same lamp. */
const spool = (g: G, x: number, y: number, r: number, rot: number): void => {
  g.save(); g.translate(x, y)
  g.save(); g.shadowColor = "rgba(0,0,0,.65)"; g.shadowBlur = 26 * Q; g.shadowOffsetX = 5 * Q; g.shadowOffsetY = 10 * Q; g.fillStyle = "#20151a"; g.beginPath(); g.arc(0, 0, r + 3.5, 0, 7); g.fill(); g.restore()
  const ringOf = (a: number, b: number): void => { g.beginPath(); g.arc(0, 0, a, 0, 7); g.arc(0, 0, b, 0, 7, true) }
  const teeth = (rr: number): void => { g.beginPath(); for (let i = 0; i < 6; i++) { const t = rot + (i / 6) * Math.PI * 2; for (const [da, q] of [[-0.2, rr], [-0.17, rr * 0.62], [0.17, rr * 0.62], [0.2, rr]] as const) g.lineTo(Math.cos(t + da) * q, Math.sin(t + da) * q) } g.closePath() }
  g.fillStyle = "#e6bf84"; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill()
  // cast shade: the lamp is up and to the left
  g.save(); g.beginPath(); g.arc(0, 0, r, 0, 7); g.clip()
  g.fillStyle = "#a6774b"; g.beginPath(); g.rect(-r, -r, 2 * r, 2 * r); g.arc(-r * 0.17, -r * 0.24, r * 1.06, 0, 7, true); g.fill("evenodd")
  g.fillStyle = "#7c5440"; g.beginPath(); g.rect(-r, -r, 2 * r, 2 * r); g.arc(-r * 0.22, -r * 0.32, r * 1.24, 0, 7, true); g.fill("evenodd")
  g.strokeStyle = "#f6e3b8"; g.lineWidth = r * 0.1; for (const [a, b] of [[-2.9, -2.2], [-2.08, -1.94]] as const) { g.beginPath(); g.arc(0, 0, r * 0.9, a, b); g.stroke() }
  g.restore()
  // three windows showing the wound tape
  for (let i = 0; i < 3; i++) {
    const t = rot + (i / 3) * Math.PI * 2
    g.beginPath(); g.arc(0, 0, r * 0.83, t - 0.4, t + 0.4); g.arc(0, 0, r * 0.58, t + 0.34, t - 0.34, true); g.closePath()
    g.fillStyle = "#1c3f40"; g.fill(); g.save(); g.clip(); g.strokeStyle = "rgba(150,220,206,.35)"; g.lineWidth = 1.2; for (let q = r * 0.6; q < r * 0.83; q += 3.4) { g.beginPath(); g.arc(0, 0, q, 0, 7); g.stroke() } g.fillStyle = "rgba(8,14,20,.5)"; g.beginPath(); g.arc(0, 0, r * 0.83, t - 0.4, t + 0.4); g.arc(r * 0.05, r * 0.07, r * 0.79, t + 0.4, t - 0.4, true); g.fill(); g.restore()
    g.strokeStyle = "#2c1a1c"; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, r * 0.83, t - 0.4, t + 0.4); g.arc(0, 0, r * 0.58, t + 0.34, t - 0.34, true); g.closePath(); g.stroke()
  }
  g.fillStyle = "#f0ece4"; g.beginPath(); g.arc(0, 0, r * 0.46, 0, 7); g.fill()
  g.save(); g.beginPath(); g.arc(0, 0, r * 0.46, 0, 7); g.clip(); g.fillStyle = "#b9b4c0"; g.beginPath(); g.rect(-r, -r, 2 * r, 2 * r); g.arc(-r * 0.1, -r * 0.13, r * 0.45, 0, 7, true); g.fill("evenodd"); g.restore()
  g.fillStyle = "#17171a"; teeth(r * 0.33); g.fill()
  g.strokeStyle = "#2c1a1c"; g.lineWidth = 2.4; for (const q of [r, r * 0.46]) { g.beginPath(); g.arc(0, 0, q, 0, 7); g.stroke() }
  g.lineWidth = 1.2; g.strokeStyle = "rgba(60,32,28,.6)"; ringOf(r * 0.91, r * 0.905); g.stroke()
  g.fillStyle = "#fffaf0"; g.beginPath(); g.ellipse(-r * 0.6, -r * 0.66, r * 0.12, r * 0.04, -0.8, 0, 7); g.fill()
  g.restore()
}
/** The label's badge: a reel with the tide across its lower half. */
const badge = (g: G, x: number, y: number, w: number, h: number): void => {
  g.save(); g.translate(x, y)
  g.fillStyle = "#020202"; g.beginPath(); g.roundRect(0, 0, w, h, 8); g.fill(); g.strokeStyle = "#424244"; g.lineWidth = 2; g.stroke()
  const cx = w / 2
  g.save(); g.translate(cx, 86); g.rotate(-0.13)
  const box = (x: number, y: number, bw: number, bh: number, r: number): void => { g.beginPath(); g.roundRect(x, y, bw, bh, r) }
  g.fillStyle = "#fff"; box(-48, -35, 96, 70, 9); g.fill(); g.clip()
  g.fillStyle = "#020202"; box(-34, -21, 68, 27, 13.5); g.fill()
  for (const x of [-20, 20]) { g.fillStyle = "#fff"; g.beginPath(); g.arc(x, -7.5, 9, 0, 7); g.fill(); g.fillStyle = "#020202"; g.beginPath(); g.arc(x, -7.5, 3.6, 0, 7); g.fill() }
  const wave = (top: number, amp: number, ph: number): void => { g.beginPath(); for (let i = 0; i <= 120; i++) { const u = i / 120, q = (u * 2.5 + ph) % 1, crest = q < 0.7 ? (q / 0.7) ** 2.2 : (1 - (q - 0.7) / 0.3) ** 2.4; g.lineTo(-50 + u * 100, top - crest * amp) } g.lineTo(50, 50); g.lineTo(-50, 50); g.closePath(); g.fill() }
  g.fillStyle = "#020202"; wave(17, 15, 0.2)
  g.fillStyle = "#fff"; wave(23.5, 15, 0.2)
  g.restore()
  g.fillStyle = "#fff"; g.textAlign = "center"
  caps(g, 13.5); (g as unknown as { letterSpacing: string }).letterSpacing = "3px"; g.fillText("LOW TIDE", cx + 1.5, 163)
  caps(g, 5.2, "'Avenir Next', Helvetica, sans-serif", "800"); (g as unknown as { letterSpacing: string }).letterSpacing = "1.2px"; g.fillText("RECORD EVERYTHING", cx + 0.6, 177)
  cipher(g, "LT", w - 27, 14, 7, 0.9, 1.6); g.fill()
  g.restore()
}

export const poster = async (look: Look, S: number, k: number): Promise<HTMLCanvasElement> => {
  const L = look
  Q = S
  const { canvas: fig } = await render(L.art, k, 10, "normal", true)
  const { c, g } = layer(1200 * S, 1200 * S)
  g.scale(S, S); g.imageSmoothingQuality = "high"; g.lineJoin = "round"
  seed = 7
  background(g, S, L)
  float(g, LEVELS, 262, 196, 1, -0.16, L.icons[0], 1.2, 0.95)
  float(g, PLAY, 112, 388, 1.05, -0.3, L.icons[1], 2.4, 0.85)
  float(g, CASSETTE, 1104, 372, 1.05, 0.24, L.icons[0], 1.4, 0.95)
  float(g, SKIP, 1030, 196, 0.8, -0.12, L.icons[1], 2.6, 0.75)
  float(g, PAUSE, 1146, 908, 0.95, 0.2, L.icons[0], 1.4, 0.95)
  float(g, LEVELS, 96, 618, 0.7, 0.14, L.icons[0], 2, 0.75)
  /* figure: cut by the tape */
  const F = 1.06, fx = 74, fy = 12, fw = L.art.w * F, fh = L.art.h * F
  const body = layer(1200 * S, 1200 * S); body.g.scale(S, S); body.g.imageSmoothingQuality = "high"
  body.g.save(); body.g.beginPath(); body.g.moveTo(-60, -10); body.g.lineTo(1260, -10); line(body.g, [...off(TOP, 4)].reverse(), false); body.g.closePath(); body.g.clip()
  body.g.filter = "saturate(1.18) brightness(0.985)"; body.g.drawImage(fig, fx, fy, fw, fh); body.g.filter = "none"
  // it goes a touch darker and cooler towards the tape, as if the light stayed on the face
  body.g.globalCompositeOperation = "source-atop"; body.g.fillStyle = lin(body.g, 0, 640, 0, 1000, [0, "rgba(14,34,40,0)"], [1, "rgba(14,34,40,.34)"]); body.g.fillRect(0, 600, 1200, 420)
  body.g.restore()
  g.save(); g.shadowColor = "rgba(0,0,0,.75)"; g.shadowBlur = 34 * S; g.shadowOffsetX = 10 * S; g.shadowOffsetY = 12 * S; g.drawImage(body.c, 0, 0, 1200, 1200); g.restore()
  g.save(); g.shadowColor = `rgba(${L.glow},.16)`; g.shadowBlur = 22 * S; g.drawImage(body.c, 0, 0, 1200, 1200); g.restore()
  g.drawImage(body.c, 0, 0, 1200, 1200)
  for (const [x, y, r] of [[300, 60, 2.4], [338, 96, 1.5], [1040, 60, 2], [1150, 470, 3], [1168, 520, 1.8], [30, 560, 2.4], [56, 596, 1.5], [1096, 962, 3], [1170, 840, 2.6], [150, 296, 1.8]] as const) spark(g, x, y, r, L.glow)
  ribbon(g, L)
  spool(g, 30, 752, 66, 0.35)
  /* name */
  g.save(); g.lineJoin = "round"
  cipher(g, "MAREN", 43, 958, 44, 0.86, 1.9); g.strokeStyle = "#050505"; g.lineWidth = 11; g.stroke(); g.fillStyle = L.glyph; g.fill()
  caps(g, 82); g.textAlign = "left"; const nw = g.measureText("MAREN").width
  g.save(); g.translate(40, 1101); g.fillStyle = lin(g, 0, -80, nw, 0, [0, "#f7f7f3"], [0.45, "#efefec"], [1, "#c2c4c4"]); g.shadowColor = "rgba(0,0,0,.6)"; g.shadowBlur = 8 * S; g.fillText("MAREN", 0, 0); g.restore()
  g.restore()
  /* ticker */
  g.fillStyle = lin(g, 0, 1145, 1200, 1200, [0, L.tick[0]], [0.35, L.tick[0]], [0.62, L.tick[1]], [1, L.tick[1]]); g.fillRect(0, 1145, 1200, 55)
  caps(g, 35); g.fillStyle = "#070708"; (g as unknown as { letterSpacing: string }).letterSpacing = "0.4px"
  const tw = g.measureText("LOW TIDE SESSIONS").width
  for (let x = -270; x < 1200; x += tw + 70) g.fillText("LOW TIDE SESSIONS", x, 1190)
  ;(g as unknown as { letterSpacing: string }).letterSpacing = "0px"
  badge(g, 43, 44, 144, 193)
  /* print: the finest grain over everything */
  const d = g.getImageData(0, 0, c.width, c.height); seed = 99
  for (let i = 0; i < d.data.length; i += 4) { const n = (rnd() - 0.5) * 5; d.data[i] = d.data[i]! + n; d.data[i + 1] = d.data[i + 1]! + n; d.data[i + 2] = d.data[i + 2]! + n }
  g.putImageData(d, 0, 0)
  return c
}
