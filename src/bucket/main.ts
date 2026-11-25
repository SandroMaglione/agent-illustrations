import type { Art } from "../splash/engine.ts"
import { regionsOf } from "../splash/engine.ts"
import { fill, paper } from "./fill.ts"
import type { Clicks } from "./fill.ts"
import { spreadNames } from "./segment.ts"

/** ?v=bucket&show=now|fill|pools|diff : the hand-marked regions against a bucket fill. `learn` writes a click list from the hand-marked map. */
export const bucketView = async (art: Art, k: number, q: URLSearchParams, data: { clicks: Clicks; walls: ReadonlyArray<string> }): Promise<HTMLCanvasElement> => {
  const { ink, w, h, names, map } = await regionsOf(art, k, "marks")
  const t0 = performance.now(), B = paper(ink, w, h, data.walls, k), { P } = B
  const at = (p: number): string => `${Math.round((B.deep[p]! % w) / k)},${Math.round(((B.deep[p]! / w) | 0) / k)}`
  if (q.has("learn")) {
    const c = new Map<number, number>()
    for (let i = 0; i < w * h; i++) if (P.seg[i]) { const key = P.seg[i]! * 256 + map[i]!; c.set(key, (c.get(key) ?? 0) + 1) }
    const want = new Int32Array(P.n + 1), most = new Int32Array(P.n + 1)
    for (const [key, v] of c) if (v > most[key >> 8]!) { most[key >> 8] = v; want[key >> 8] = key & 255 }
    const unsure: Array<string> = []
    for (let p = 1; p <= P.n; p++) if (B.size[p]! > 5 * k * k && most[p]! / B.size[p]! < 0.97) unsure.push(`${names[want[p]!]} ${at(p)} ${Math.round(B.size[p]! / k / k)}px ${Math.round((100 * most[p]!) / B.size[p]!)}% also ${[...c].filter(([key]) => key >> 8 === p && (key & 255) !== want[p]).map(([key, v]) => `${names[key & 255]} ${Math.round(v / k / k)}`).join(" ")}`)
    const order = Array.from({ length: P.n }, (_, i) => i + 1).filter((p) => B.size[p]! > 5 * k * k).sort((a, b) => B.size[b]! - B.size[a]!)
    const named = new Map<number, number>()
    const right = (): boolean => { const r = spreadNames(P.n, B.edges, named); return order.every((p) => r[p] === want[p]) }
    for (let turn = 0; turn < 400; turn++) { const r = spreadNames(P.n, B.edges, named), p = order.find((o) => r[o] !== want[o]); if (!p) break; named.set(p, want[p]!) }
    for (const p of [...named.keys()].reverse()) { const l = named.get(p)!; named.delete(p); if (!right()) named.set(p, l) }
    const out: Record<string, string> = {}
    for (const n of names.slice(1)) { const l = names.indexOf(n), s = [...named].filter(([, v]) => v === l).map(([p]) => at(p)).join(" "); if (s) out[n] = s }
    console.error(JSON.stringify({ rows: [{ clicks: named.size, ok: right() }, out, unsure], mixed: [] }))
  }
  const f = fill(B, w, h, data.clicks, k), ms = Math.round(performance.now() - t0), to = f.names.map((n) => names.indexOf(n))
  const bad = new Uint8Array(w * h), seen = new Uint8Array(w * h), found: Array<{ px: number; paper: number; s: string }> = []
  let onPaper = 0, under = 0
  for (let i = 0; i < w * h; i++) if (to[f.map[i]!] !== map[i]) { bad[i] = 1; if (ink[i]! < 0.25) onPaper++; else under++ }
  for (let s = 0; s < w * h; s++) if (bad[s] && !seen[s]) {
    const st = [s]; seen[s] = 1
    let px = 0, on = 0, X = 0, Y = 0
    while (st.length) { const i = st.pop()!; px++; if (ink[i]! < 0.25) on++; X += i % w; Y += (i / w) | 0; for (const j of [i - 1, i + 1, i - w, i + w]) if (j >= 0 && j < w * h && bad[j] && !seen[j] && map[j] === map[s]) { seen[j] = 1; st.push(j) } }
    found.push({ px, paper: on, s: `${names[map[s]!]} -> ${f.names[f.map[s]!]}  ${Math.round(on / k / k)}px paper, ${Math.round((px - on) / k / k)}px ink @${Math.round(X / px / k)},${Math.round(Y / px / k)}` })
  }
  found.sort((a, b) => b.paper - a.paper || b.px - a.px)
  console.error(JSON.stringify({ rows: [{ ms, pools: P.n, onPaper: Math.round(onPaper / k / k), under: Math.round(under / k / k) }, { unnamed: f.unnamed.map((p) => `${at(p)} ${Math.round(B.size[p]! / k / k)}px`) }], mixed: found.filter((x) => x.paper > 4 * k * k).map((x) => x.s) }))
  const c = document.createElement("canvas")
  c.width = w; c.height = h
  const g = c.getContext("2d")!, im = g.createImageData(w, h), show = q.get("show") ?? "fill"
  const hue = (n: number, o: number): number => 165 + 80 * Math.cos(((n * 137.5 + o) * Math.PI) / 180)
  for (let i = 0; i < w * h; i++) {
    const id = show === "pools" ? P.seg[i]! : show === "now" ? map[i]! : to[f.map[i]!]!
    const p: readonly [number, number, number] = show === "diff" ? (bad[i] ? [235, 40, 60] : [236, 236, 236]) : [hue(id, 0), hue(id, 120), hue(id, 240)]
    const t = show === "diff" && bad[i] ? 1 : 1 - Math.min(1, ink[i]! * Number(q.get("ink") ?? 1.25))
    for (let e = 0; e < 3; e++) im.data[i * 4 + e] = p[e]! * t
    im.data[i * 4 + 3] = 255
  }
  g.putImageData(im, 0, 0)
  return c
}
