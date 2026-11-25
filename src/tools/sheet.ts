/** What the agent looks at instead of a coordinate grid: a crop with every line numbered, or every named shape in its own colour. */
import { fill, paper } from "../bucket/fill.ts"
import { loadInk } from "../lineart/main.ts"
import { linesOf, regionsOf, stampsOf } from "../splash/engine.ts"
import type { Art } from "../splash/engine.ts"
import type { P2 } from "../geo.ts"
import { each } from "./stamp.ts"

const PAL = ["#d5263d", "#1667d9", "#12854a", "#9b35c9", "#c4710a", "#0d8f96", "#8a5a3c", "#d02c8d"]
/** ?v=sheet&who=tape&box=x,y,w,h&z=3&show=lines|shapes[&only=12,40][&probe=x,y] */
export const sheetView = async (art: Art, q: URLSearchParams): Promise<HTMLCanvasElement> => {
  const [X, Y, W, H] = (q.get("box") ?? `0,0,${art.w},${art.h}`).split(",").map(Number) as [number, number, number, number], z = Number(q.get("z") ?? 3)
  if (q.get("show") === "pools") return poolSheet(art, X, Y, W, H, z, q)
  const R = await linesOf(art), show = q.get("show") ?? "lines", only = q.get("only")?.split(",").map(Number)
  const c = document.createElement("canvas")
  c.width = W * z; c.height = H * z
  const g = c.getContext("2d")!, T = ([x, y]: P2): P2 => [(x - X) * z, (y - Y) * z]
  g.fillStyle = "#fff"; g.fillRect(0, 0, W * z, H * z)
  const img = new Image()
  img.src = art.src
  await img.decode()
  g.imageSmoothingQuality = "high"
  const boxes: Array<P2> = []
  const label = (text: string, at: P2, n: P2, color: string, size = 13): void => {
    g.font = `bold ${size}px Helvetica`; g.textAlign = "center"; g.textBaseline = "middle"
    const wide = g.measureText(text).width + 6
    for (const d of [14, -14, 22, -22, 34, -34, 48, -48]) {
      const x = at[0] + n[0] * d, y = at[1] + n[1] * d
      if (x < wide / 2 || y < 9 || x > W * z - wide / 2 || y > H * z - 9 || boxes.some((b) => Math.abs(b[0] - x) < wide && Math.abs(b[1] - y) < 16)) continue
      boxes.push([x, y])
      g.strokeStyle = color; g.lineWidth = 1; g.beginPath(); g.moveTo(...at); g.lineTo(x, y); g.stroke()
      g.fillStyle = "rgba(255,255,255,.92)"; g.fillRect(x - wide / 2, y - 8, wide, 16); g.fillStyle = color; g.fillText(text, x, y)
      return
    }
  }
  if (show === "shapes") {
    const k = 2, r = await regionsOf(art, k), st = await stampsOf(art, k, r), im = new ImageData(W * k, H * k), list = [...st.values()]
    for (let i = 0; i < im.data.length; i++) im.data[i] = 255
    list.forEach((s, n) => { const a = n * 137.5, f = (o: number): number => 165 + 80 * Math.cos(((a + o) * Math.PI) / 180); each(s, r.w, (j) => { const x = (j % r.w) - X * k, y = Math.floor(j / r.w) - Y * k; if (x < 0 || y < 0 || x >= W * k || y >= H * k) return; const i = (y * W * k + x) * 4; im.data[i] = f(0); im.data[i + 1] = f(120); im.data[i + 2] = f(240) }) })
    const t = document.createElement("canvas")
    t.width = W * k; t.height = H * k
    t.getContext("2d")!.putImageData(im, 0, 0)
    g.drawImage(t, 0, 0, W * z, H * z)
    g.globalCompositeOperation = "multiply"; g.drawImage(img, X, Y, W, H, 0, 0, W * z, H * z); g.globalCompositeOperation = "source-over"
    for (const s of list) { let n = 0, sx = 0, sy = 0; each(s, r.w, (i) => { n++; sx += i % r.w; sy += Math.floor(i / r.w) }); if (n) label(s.id, T([sx / n / k, sy / n / k]), [0, -1], "#111") }
    console.error(JSON.stringify({ shapes: list.map((s) => `#${s.id} ${s.px}px ${s.note}`) }))
    return c
  }
  g.globalAlpha = 0.25; g.drawImage(img, X, Y, W, H, 0, 0, W * z, H * z); g.globalAlpha = 1
  const inside = (p: P2): boolean => p[0] > X + 2 && p[1] > Y + 2 && p[0] < X + W - 2 && p[1] < Y + H - 2
  const vis = R.strokes.map((s) => ({ s, v: s.p.filter(inside) })).filter((q) => q.v.length > 4 && (!only || only.includes(q.s.id)))
  for (const { s } of vis) { g.strokeStyle = PAL[s.id % 8]!; g.lineWidth = 2.5; g.beginPath(); s.p.map(T).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke() }
  // ten ticks along each line, so a share can be read off
  for (const { s } of vis) if (s.len > 70) for (let t = 1; t < 10; t++) { const p = T(R.at(`s${s.id}@${t / 10}`)); g.fillStyle = t === 5 ? "#000" : PAL[s.id % 8]!; g.beginPath(); g.arc(p[0], p[1], t === 5 ? 3.4 : 2.4, 0, 7); g.fill() }
  for (const { s, v } of [...vis].sort((a, b) => a.v.length - b.v.length)) { const m = Math.floor(v.length * 0.45), a = T(v[m]!), b = T(v[Math.min(v.length - 1, m + 2)]!), l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; label(String(s.id), a, [-(b[1] - a[1]) / l, (b[0] - a[0]) / l], PAL[s.id % 8]!) }
  const probe = q.get("probe")?.split(",").map(Number)
  if (probe) {
    const k = 2, r = await regionsOf(art, k), st = await stampsOf(art, k, r), i = Math.round(probe[1]! * k) * r.w + Math.round(probe[0]! * k)
    const near = R.strokes.map((s) => { let d = 1e9, t = 0; s.p.forEach((p, n) => { const e = Math.hypot(p[0] - probe[0]!, p[1] - probe[1]!) - s.half[n]!; if (e < d) { d = e; t = n / (s.p.length - 1) } }); return { s: `s${s.id}@${t.toFixed(2)}`, px: Math.round(d * 10) / 10 } }).sort((a, b) => a.px - b.px).slice(0, 3)
    console.error(JSON.stringify({ part: r.names[r.map[i]!], near, shapes: [...st.values()].filter((s) => { const x = (i % r.w) - s.x, y = Math.floor(i / r.w) - s.y; return x >= 0 && y >= 0 && x < s.w && y < s.h && s.m[y * s.w + x] }).map((s) => s.id) }))
  }
  return c
}
/** Closed patches, numbered, before any of them has a name; once named, coloured by name. `list=1` prints where each one is. */
const poolSheet = async (art: Art, X: number, Y: number, W: number, H: number, z: number, q: URLSearchParams): Promise<HTMLCanvasElement> => {
  const k = 2, { ink, w, h } = await loadInk(art.src, k), B = paper(ink, w, h, q.has("named") ? (art.clicks?.walls ?? []) : [], k), P = B.P, f = fill(B, w, h, art.clicks?.at ?? {}, k), named = q.has("named")
  const c = document.createElement("canvas"), t = document.createElement("canvas")
  c.width = W * z; c.height = H * z; t.width = w; t.height = h
  const g = c.getContext("2d")!, im = new ImageData(w, h), hue = (n: number, o: number): number => 190 + 60 * Math.cos(((n * 137.5 + o) * Math.PI) / 180)
  for (let i = 0; i < w * h; i++) { const id = named ? f.map[i]! : P.seg[i]!, v = 1 - Math.min(1, ink[i]! * 1.2); for (let e = 0; e < 3; e++) im.data[i * 4 + e] = (id ? hue(id, e * 120) : 255) * v; im.data[i * 4 + 3] = 255 }
  t.getContext("2d")!.putImageData(im, 0, 0)
  g.imageSmoothingQuality = "high"; g.drawImage(t, X * k, Y * k, W * k, H * k, 0, 0, W * z, H * z)
  g.font = "bold 12px Helvetica"; g.textAlign = "center"; g.textBaseline = "middle"
  for (let p = 1; p <= P.n; p++) {
    if (B.size[p]! < Number(q.get("least") ?? 12) * k * k) continue
    const x = ((B.deep[p]! % w) / k - X) * z, y = (((B.deep[p]! / w) | 0) / k - Y) * z
    if (x < 0 || y < 0 || x > W * z || y > H * z) continue
    const text = named ? (f.names[f.map[B.deep[p]!]!] || "?") : String(p), wide = g.measureText(text).width + 4
    g.fillStyle = "rgba(255,255,255,.8)"; g.fillRect(x - wide / 2, y - 7, wide, 14); g.fillStyle = named && text === "?" ? "#d00" : "#000"; g.fillText(text, x, y)
  }
  if (q.has("list")) console.error(JSON.stringify(Object.fromEntries(Array.from({ length: P.n }, (_, i) => [i + 1, [Math.round((B.deep[i + 1]! % w) / k * 2) / 2, Math.round(((B.deep[i + 1]! / w) | 0) / k * 2) / 2, Math.round(B.size[i + 1]! / k / k)]]))))
  if (named) console.error(JSON.stringify({ unnamed: f.unnamed.map((p) => `${p}: ${Math.round((B.deep[p]! % w) / k)},${Math.round(((B.deep[p]! / w) | 0) / k)} ${Math.round(B.size[p]! / k / k)}px`) }))
  return c
}
