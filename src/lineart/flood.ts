/** Seeds -> regions: multi-source geodesic flood where crossing ink is expensive. */
import { curveless } from "./poly.ts"
import type { Seed } from "./seeds.ts"

export type Regions = { w: number; h: number; names: Array<string>; map: Uint8Array }

export const flood = (ink: Float32Array, w: number, h: number, seeds: ReadonlyArray<Seed>, k: number, prepare?: (seed: Uint8Array) => void): Regions => {
  const names = ["", ...new Set(seeds.map((s) => s.label))]
  const map = new Uint8Array(w * h)
  const c = document.createElement("canvas")
  c.width = w; c.height = h
  const g = c.getContext("2d", { willReadFrequently: true })!
  for (let n = 1; n < names.length; n++) {
    g.clearRect(0, 0, w, h)
    g.lineCap = "round"; g.lineJoin = "round"
    for (const s of seeds) if (s.label === names[n]) {
      const pts = curveless((s.poly ?? s.line)!)
      g.beginPath()
      pts.forEach(([x, y], i) => (i ? g.lineTo(x * k, y * k) : g.moveTo(x * k, y * k)))
      if (s.poly) { g.closePath(); g.fill() } else { g.lineWidth = (s.w ?? 3) * k; g.stroke() }
    }
    const d = g.getImageData(0, 0, w, h).data
    for (let i = 0; i < map.length; i++) if (d[i * 4 + 3]! > 127) map[i] = n
  }
  // seeds never claim the ink itself, so a sloppy seed cannot own both sides of a line
  for (let i = 0; i < map.length; i++) if (ink[i]! > 0.42) map[i] = 0
  prepare?.(map)
  const dist = new Int32Array(w * h).fill(0x3fffffff)
  const NB = 4096
  const buckets: Array<Array<number>> = Array.from({ length: NB }, () => [])
  let left = 0
  for (let i = 0; i < map.length; i++) if (map[i]) { dist[i] = 0; buckets[0]!.push(i); left++ }
  const cost = new Int32Array(w * h)
  for (let i = 0; i < cost.length; i++) cost[i] = 10 + Math.round(900 * ink[i]! ** 1.4)
  const N: ReadonlyArray<readonly [number, number, number]> = [[1, 0, 10], [-1, 0, 10], [0, 1, 10], [0, -1, 10], [1, 1, 14], [1, -1, 14], [-1, 1, 14], [-1, -1, 14]]
  for (let dd = 0; left > 0; dd++) {
    const b = buckets[dd % NB]!
    for (let q = 0; q < b.length; q++) {
      const i = b[q]!
      left--
      if (dist[i] !== dd) continue
      const x = i % w, y = (i / w) | 0
      for (const [dx, dy, m] of N) {
        const X = x + dx, Y = y + dy
        if (X < 0 || Y < 0 || X >= w || Y >= h) continue
        const j = Y * w + X
        const nd = dd + ((cost[j]! * m / 10) | 0)
        if (nd < dist[j]!) { dist[j] = nd; map[j] = map[i]!; buckets[nd % NB]!.push(j); left++ }
      }
    }
    b.length = 0
  }
  return { w, h, names, map }
}

/** Box blur, n passes. */
export const blur = (src: Float32Array, w: number, h: number, r: number, passes = 2): Float32Array => {
  let a = src
  const k = Math.max(1, Math.round(r))
  for (let pass = 0; pass < passes * 2; pass++) {
    const horiz = pass % 2 === 0
    const [n, m, step, jump] = horiz ? [h, w, 1, w] : [w, h, w, 1]
    const o = new Float32Array(a.length)
    for (let j = 0; j < n; j++) {
      const at = j * jump
      let sum = 0
      for (let i = -k; i < m; i++) {
        if (i + k < m) sum += a[at + (i + k) * step]!
        if (i - k - 1 >= 0) sum -= a[at + (i - k - 1) * step]!
        if (i >= 0) o[at + i * step] = sum / (k * 2 + 1)
      }
    }
    a = o
  }
  return a
}
