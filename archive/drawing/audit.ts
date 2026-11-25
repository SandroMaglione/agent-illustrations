import { readFileSync, readdirSync, existsSync } from "node:fs"
import { decodePng } from "../../src/layers/png.ts"
import { paperDistance } from "../../src/bucket/segment.ts"
const R = new URL("../../", import.meta.url).pathname, ST = process.argv[2]!
const HEAD: Record<string, number> = { visor: 205, maren: 390, linen: 256, bob: 420, tee: 330 }
console.log("name      parts  lines/H²  shadeEdge/H²  backed%  invented/H²  | per figure of one height: lines, patches")
for (const n of ["visor", "maren", "linen", "bob", "tee"]) {
  const J = JSON.parse(readFileSync(`${R}output/form/${n}.json`, "utf8")), { w, h } = J, map = new Uint8Array(Buffer.from(J.map, "base64")), ink = new Uint8Array(Buffer.from(J.ink, "base64")), N = w * h, bg = J.names.indexOf("bg"), H = HEAD[n]!
  let fig = 0; const parts = new Set<number>(); for (let i = 0; i < N; i++) if (map[i] && map[i] !== bg) { fig++; parts.add(map[i]!) }
  const st = JSON.parse(readFileSync(`${ST}/${n}/stack.json`, "utf8")), files = readdirSync(`${ST}/${n}/png`).sort(), L = st.layers.find((l: any) => l.name === "Shade"), p = decodePng(readFileSync(`${ST}/${n}/png/${files[L.index]}`)).rgba, K = st.w / w
  const sh = new Uint8Array(N); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const X = Math.round(x * K) - L.x, Y = Math.round(y * K) - L.y; if (X >= 0 && Y >= 0 && X < L.w && Y < L.h && p[(Y * L.w + X) * 4 + 3]! > 127) sh[y * w + x] = 1 }
  const inkF = Float32Array.from(ink, (v) => v / 255), d = paperDistance(inkF, w, h, 0.35)
  // skeleton-ish length of line: ink area / mean thickness, by distance transform of ink
  const inv = Float32Array.from(inkF, (v) => (v > 0.35 ? 0 : 1)), din = paperDistance(inv, w, h, 0.5)
  let len = 0; for (let i = w; i < N - w; i++) if (inkF[i]! > 0.35 && map[i] !== 0) { const v = din[i]!; if ((v >= din[i - 1]! && v > din[i + 1]!) || (v >= din[i - w]! && v > din[i + w]!)) len++ }
  let e = 0, back = 0; const tol = 0.012 * H
  for (let i = w; i < N - w; i++) { if (!map[i] || map[i] === bg) continue; for (const j of [i + 1, i + w]) if (map[j] === map[i] && sh[j] !== sh[i]) { e++; if (Math.min(d[i]!, d[j]!) <= tol) back++ } }
  // closed patches of paper inside the figure, bigger than a button
  const seen = new Uint8Array(N); let patches = 0, biggest = 0
  for (let s = 0; s < N; s++) if (!seen[s] && map[s] && map[s] !== bg && inkF[s]! < 0.35) { const c = [s]; seen[s] = 1; for (let t = 0; t < c.length; t++) { const i = c[t]!, x = i % w; for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) if (j >= 0 && j < N && !seen[j] && map[j] && map[j] !== bg && inkF[j]! < 0.35) { seen[j] = 1; c.push(j) } } if (c.length > fig * 0.0002) patches++; biggest = Math.max(biggest, c.length) }
  // biggest circle with no drawn line in it, as share of the figure's size
  let rad = 0; for (let i = 0; i < N; i++) if (map[i] && map[i] !== bg) rad = Math.max(rad, d[i]!)
  const g = Math.sqrt(fig)
  console.log(n.padEnd(8), "parts", String(parts.size).padStart(3), " patches", String(patches).padStart(4), " line length / figure size", (len / g).toFixed(1).padStart(5), " empty circle", (100 * rad * 2 / g).toFixed(0).padStart(3) + "% of size", " shade edge", (e / g).toFixed(1).padStart(5), " on a drawn line", (100 * back / e).toFixed(0).padStart(3) + "%", " invented", ((e - back) / g).toFixed(1).padStart(5), " biggest patch", (100 * biggest / fig).toFixed(0) + "% of figure")
}
