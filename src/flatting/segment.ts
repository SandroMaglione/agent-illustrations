/**
 * Atomic facet extraction, bottleneck-safe trapped-ball segmentation, and exact ink-weighted
 * geodesic centerline expansion (zero white halos inside, zero bleed outside).
 *
 * Pure Node.js (zero DOM/Canvas dependency). Runs at 1:1 native line-art resolution.
 */
import { paperDistance } from "../bucket/segment.ts"
import type { InkField } from "./ink.ts"

export type FacetInfo = {
  id: number
  area: number
  /** Pole of inaccessibility: deepest interior pixel, guaranteed strictly inside the facet. */
  deepX: number
  deepY: number
  maxDist: number
  bbox: [number, number, number, number]
  /** Bitmask: 1=top, 2=right, 4=bottom, 8=left. */
  borderMask: number
  /** Neighbor facet IDs separated by a narrow gap (bottleneck) on bare paper, with gap radius. */
  paperNeighbors: Array<{ id: number; neck: number }>
}

export type FacetMap = {
  w: number
  h: number
  /** Per-pixel facet ID (0 = barrier pixel, 1..n = atomic paper facet). */
  seg: Int32Array
  /** Combined binary barrier (ink barrier + walls + accepted gaps). */
  closedBarrier: Uint8Array
  /** Exact Euclidean distance to nearest barrier pixel. */
  dist: Float32Array
  /** Metadata for facets 1..n (index 0 unused). */
  facets: Array<FacetInfo>
  n: number
}

export type SegmentOptions = {
  /**
   * Persistence ratio for splitting narrow bottlenecks (trapped-ball protection).
   * Two pools split ONLY when bottleneck radius <= `maxNeckRadius` AND `neck < ratio * min(peakA, peakB)`.
   * Setting `maxNeckRadius = 0` disables bottleneck splitting (pure 4-connected components).
   * Default: ratio = 0.68, maxNeckRadius = 5.5.
   */
  ratio?: number
  maxNeckRadius?: number
  minPoolDepth?: number
}

/**
 * Segment open paper (`!closedBarrier`) into atomic facets.
 * - Canvas edges act as implicit frame boundaries (so cropped skirts/limbs NEVER merge with outer bg!).
 * - Narrow gaps up to `2 * maxNeckRadius` px wide are automatically split by trapped-ball persistence
 *   watershed without over-splitting wide anatomical shapes (arms, torso, frames).
 */
export const segmentFacets = (inkField: InkField, extraBarrier?: Uint8Array, opts: SegmentOptions = {}): FacetMap => {
  const { w, h, barrier } = inkField
  const N = w * h
  const ratio = opts.ratio ?? 0.68
  const maxNeckRadius = opts.maxNeckRadius ?? 5.5
  const minPoolDepth = opts.minPoolDepth ?? 1.4

  const closedBarrier = barrier.slice()
  if (extraBarrier) {
    for (let i = 0; i < N; i++) if (extraBarrier[i]) closedBarrier[i] = 1
  }

  const barrierF = new Float32Array(N)
  for (let i = 0; i < N; i++) barrierF[i] = closedBarrier[i]!
  const dist = paperDistance(barrierF, w, h, 0.5)

  const seg = new Int32Array(N)
  let n = 0

  if (maxNeckRadius <= 0) {
    // Pure 4-connected components of open paper
    const queue = new Int32Array(N)
    for (let i = 0; i < N; i++) {
      if (closedBarrier[i] || seg[i]) continue
      const id = ++n
      let head = 0, tail = 0
      queue[tail++] = i; seg[i] = id
      while (head < tail) {
        const p = queue[head++]!, x = p % w, y = (p / w) | 0
        if (x > 0 && !closedBarrier[p - 1] && !seg[p - 1]) { seg[p - 1] = id; queue[tail++] = p - 1 }
        if (x < w - 1 && !closedBarrier[p + 1] && !seg[p + 1]) { seg[p + 1] = id; queue[tail++] = p + 1 }
        if (y > 0 && !closedBarrier[p - w] && !seg[p - w]) { seg[p - w] = id; queue[tail++] = p - w }
        if (y < h - 1 && !closedBarrier[p + w] && !seg[p + w]) { seg[p + w] = id; queue[tail++] = p + w }
      }
    }
  } else {
    // Persistence watershed with maxNeckRadius cap:
    // Deepest paper pixels first; merge two touching basins if:
    //   d >= maxNeckRadius  (wide passage, NEVER a line gap!)
    //   OR d >= ratio * smallerPeak
    //   OR smallerPeak < minPoolDepth
    let top = 0, count = 0
    for (let i = 0; i < N; i++) if (!closedBarrier[i] && dist[i]! > 0) { count++; if (dist[i]! > top) top = dist[i]! }
    const K = Math.ceil(top * 16) + 1
    const start = new Int32Array(K + 1)
    const order = new Int32Array(count)
    const lv = (i: number): number => Math.max(0, Math.min(K - 1, K - 1 - Math.round(dist[i]! * 16)))
    for (let i = 0; i < N; i++) if (!closedBarrier[i] && dist[i]! > 0) start[lv(i) + 1]!++
    for (let i = 0; i < K; i++) start[i + 1] = start[i + 1]! + start[i]!
    for (let i = 0; i < N; i++) if (!closedBarrier[i] && dist[i]! > 0) { const q = lv(i); order[start[q]!] = i; start[q]!++ }

    const own = new Int32Array(N)
    const up: Array<number> = [0]
    const peak: Array<number> = [0]
    const find = (q: number): number => { while (up[q] !== q) { up[q] = up[up[q]!]!; q = up[q]! } return q }

    for (let idx = 0; idx < count; idx++) {
      const i = order[idx]!
      const x = i % w, y = (i / w) | 0
      const near: Array<number> = []
      const check = (j: number): void => {
        if (!own[j]) return
        const r = find(own[j]!)
        if (!near.includes(r)) near.push(r)
      }
      if (x > 0) check(i - 1)
      if (x < w - 1) check(i + 1)
      if (y > 0) check(i - w)
      if (y < h - 1) check(i + w)

      if (!near.length) {
        const id = up.length
        up.push(id); peak.push(dist[i]!); own[i] = id
        continue
      }
      near.sort((a, b) => peak[b]! - peak[a]!)
      const best = near[0]!
      const d = dist[i]!
      for (let k = 1; k < near.length; k++) {
        const r = near[k]!
        if (d >= maxNeckRadius || d >= ratio * peak[r]! || peak[r]! < minPoolDepth) up[r] = best
      }
      own[i] = best
    }

    // Relabel compactly 1..n, sorted top-to-bottom by pole of inaccessibility
    const rawMap = new Map<number, number>()
    const rawSeg = new Int32Array(N)
    for (let i = 0; i < N; i++) {
      if (!own[i]) continue
      const r = find(own[i]!)
      let id = rawMap.get(r)
      if (!id) { id = rawMap.size + 1; rawMap.set(r, id) }
      rawSeg[i] = id
    }
    const rawN = rawMap.size
    const deepIdx = new Int32Array(rawN + 1)
    const deepVal = new Float32Array(rawN + 1).fill(-1)
    for (let i = 0; i < N; i++) {
      const id = rawSeg[i]!
      if (id && dist[i]! > deepVal[id]!) { deepVal[id] = dist[i]!; deepIdx[id] = i }
    }
    const perm = Array.from({ length: rawN }, (_, k) => k + 1).sort((a, b) => {
      const ya = (deepIdx[a]! / w) | 0, yb = (deepIdx[b]! / w) | 0
      if (Math.abs(ya - yb) > 8) return ya - yb
      return (deepIdx[a]! % w) - (deepIdx[b]! % w)
    })
    const remap = new Int32Array(rawN + 1)
    perm.forEach((oldId, idx) => { remap[oldId] = idx + 1 })
    for (let i = 0; i < N; i++) if (rawSeg[i]) seg[i] = remap[rawSeg[i]!]!
    n = rawN
  }

  // Collect metadata & paper-neighbor bottlenecks
  const facets: Array<FacetInfo> = [
    { id: 0, area: 0, deepX: 0, deepY: 0, maxDist: 0, bbox: [0, 0, 0, 0], borderMask: 0, paperNeighbors: [] },
  ]
  for (let id = 1; id <= n; id++) {
    facets.push({ id, area: 0, deepX: 0, deepY: 0, maxDist: -1, bbox: [w, h, 0, 0], borderMask: 0, paperNeighbors: [] })
  }
  const neckMap = new Map<number, number>()
  const STRIDE = n + 2
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      const id = seg[i]!
      if (!id) continue
      const f = facets[id]!
      f.area++
      if (dist[i]! > f.maxDist) { f.maxDist = dist[i]!; f.deepX = x; f.deepY = y }
      if (x < f.bbox[0]) f.bbox[0] = x
      if (y < f.bbox[1]) f.bbox[1] = y
      if (x > f.bbox[2]) f.bbox[2] = x
      if (y > f.bbox[3]) f.bbox[3] = y
      if (y === 0) f.borderMask |= 1
      if (x === w - 1) f.borderMask |= 2
      if (y === h - 1) f.borderMask |= 4
      if (x === 0) f.borderMask |= 8
      if (x + 1 < w) {
        const id2 = seg[i + 1]!
        if (id2 && id2 !== id) {
          const a = Math.min(id, id2), b = Math.max(id, id2), key = a * STRIDE + b
          const v = Math.min(dist[i]!, dist[i + 1]!)
          if (v > (neckMap.get(key) ?? 0)) neckMap.set(key, v)
        }
      }
      if (y + 1 < h) {
        const id2 = seg[i + w]!
        if (id2 && id2 !== id) {
          const a = Math.min(id, id2), b = Math.max(id, id2), key = a * STRIDE + b
          const v = Math.min(dist[i]!, dist[i + w]!)
          if (v > (neckMap.get(key) ?? 0)) neckMap.set(key, v)
        }
      }
    }
  }
  for (const [key, neck] of neckMap) {
    const a = Math.floor(key / STRIDE), b = key % STRIDE
    facets[a]!.paperNeighbors.push({ id: b, neck: Math.round(neck * 10) / 10 })
    facets[b]!.paperNeighbors.push({ id: a, neck: Math.round(neck * 10) / 10 })
  }

  return { w, h, seg, closedBarrier, dist, facets, n }
}

/**
 * Min-heap of (cost, pixelIndex) backed by typed arrays for blazing-fast multi-source Dijkstra.
 */
class MinHeap {
  private cost: Float32Array
  private idx: Int32Array
  size = 0
  constructor(cap = 65536) {
    this.cost = new Float32Array(cap)
    this.idx = new Int32Array(cap)
  }
  push(c: number, p: number): void {
    if (this.size >= this.cost.length) {
      const nc = new Float32Array(this.cost.length * 2)
      const ni = new Int32Array(this.idx.length * 2)
      nc.set(this.cost); ni.set(this.idx)
      this.cost = nc; this.idx = ni
    }
    let i = this.size++
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (this.cost[parent]! <= c) break
      this.cost[i] = this.cost[parent]!; this.idx[i] = this.idx[parent]!
      i = parent
    }
    this.cost[i] = c; this.idx[i] = p
  }
  pop(): [number, number] {
    const c0 = this.cost[0]!, p0 = this.idx[0]!
    const n = --this.size
    if (n > 0) {
      const lc = this.cost[n]!, lp = this.idx[n]!
      let i = 0
      for (;;) {
        let l = (i << 1) + 1
        if (l >= n) break
        const r = l + 1
        if (r < n && this.cost[r]! < this.cost[l]!) l = r
        if (this.cost[l]! >= lc) break
        this.cost[i] = this.cost[l]!; this.idx[i] = this.idx[l]!
        i = l
      }
      this.cost[i] = lc; this.idx[i] = lp
    }
    return [c0, p0]
  }
}

export const BG_LABEL = 1

export type GrowResult = {
  /** Final per-pixel label: 1 = BG_LABEL (background/white space), 2..K = flat colour layer IDs. */
  labels: Uint16Array
  /** Number of tiny trapped interior pockets automatically absorbed into their enclosing colour. */
  absorbedPockets: number
  /** Facet IDs (> minReportArea) that remained unassigned before growth. */
  unnamedFacets: Array<number>
}

/**
 * Given facet-to-label assignments (where BG_LABEL = 1 is background/white space, and 2..K are
 * flat colour layer IDs):
 * 1. Assigns every labeled paper pixel.
 * 2. Runs ink-weighted geodesic multi-source Dijkstra so every region grows through its own
 *    anti-aliased fringe and meets its neighbour dead-center on the darkest ridge of the ink stroke.
 *    - Interior colour vs interior colour -> zero gap, zero overlap, zero halo.
 *    - Figure colour vs background -> zero white halo inside, zero colour bleed outside!
 * 3. Absorbs tiny trapped unnamed pockets (acute hair tips, micro-crevices <= `autoAbsorbMaxArea`)
 *    into the enclosing interior colour when surrounded cleanly.
 */
export const assignAndGrow = (
  fm: FacetMap,
  inkField: InkField,
  facetLabel: Uint16Array,
  autoAbsorbMaxArea = 28,
): GrowResult => {
  const { w, h, seg, facets, n } = fm
  const { ink } = inkField
  const N = w * h

  // First pass: check which facets are labeled vs unnamed
  const labels = new Uint16Array(N)
  const cost = new Float32Array(N).fill(1e30)
  const heap = new MinHeap(Math.max(65536, N >> 3))

  // Seed all explicitly labeled paper pixels with cost 0
  for (let i = 0; i < N; i++) {
    const f = seg[i]!
    if (!f) continue
    const lab = facetLabel[f]!
    if (lab) {
      labels[i] = lab
      cost[i] = 0
    }
  }

  // Push only boundary pixels of labeled regions (those adjacent to an unlabeled pixel) into heap
  const dx8 = [-1, 1, 0, 0, -1, 1, -1, 1]
  const dy8 = [0, 0, -1, 1, -1, -1, 1, 1]
  const dl8 = [1, 1, 1, 1, Math.SQRT2, Math.SQRT2, Math.SQRT2, Math.SQRT2]

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (!labels[i]) continue
      let touchesUnlabeled = false
      for (let d = 0; d < 8; d++) {
        const nx = x + dx8[d]!, ny = y + dy8[d]!
        if (nx >= 0 && nx < w && ny >= 0 && ny < h && !labels[ny * w + nx]) { touchesUnlabeled = true; break }
      }
      if (touchesUnlabeled) heap.push(0, i)
    }
  }

  // First Dijkstra wave: grow ONLY into barrier pixels (not unnamed big facets!) so we can inspect
  // what surrounds any tiny trapped unnamed pockets accurately!
  const unnamedSet = new Uint8Array(n + 1)
  for (let f = 1; f <= n; f++) if (!facetLabel[f]) unnamedSet[f] = 1

  while (heap.size > 0) {
    const [curCost, p] = heap.pop()
    if (curCost > cost[p]!) continue
    const lab = labels[p]!
    const x = p % w, y = (p / w) | 0
    for (let d = 0; d < 8; d++) {
      const nx = x + dx8[d]!, ny = y + dy8[d]!
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
      const q = ny * w + nx
      // Do not invade large unnamed paper facets yet; only grow into barrier pixels and tiny unnamed pockets
      const qf = seg[q]!
      if (qf && unnamedSet[qf] && facets[qf]!.area > autoAbsorbMaxArea) continue
      const iv = ink[q]!
      // Geodesic step cost: cheap through AA fringes, expensive through dark ink cores -> exact centerline meet!
      // On faint outer edges (iv < 0.38), slight preference (-0.01) for BG_LABEL prevents grey bleeding outside 1px faint lines.
      const inkWeight = 0.12 + iv * iv * 5.0
      const tieBias = lab === BG_LABEL && iv < 0.42 ? -0.008 : 0
      const nextCost = curCost + dl8[d]! * inkWeight + tieBias
      if (nextCost < cost[q]!) {
        cost[q] = nextCost
        labels[q] = lab
        heap.push(nextCost, q)
      }
    }
  }

  // Count how many tiny unnamed pockets were cleanly absorbed, and list any remaining large unnamed facets
  let absorbedPockets = 0
  const unnamedFacets: Array<number> = []
  for (let f = 1; f <= n; f++) {
    if (!unnamedSet[f]) continue
    const info = facets[f]!
    if (info.area <= autoAbsorbMaxArea) {
      // Unify the tiny pocket to its majority label (in case two sides entered it)
      const counts = new Map<number, number>()
      const [x0, y0, x1, y1] = info.bbox
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const i = y * w + x
          if (seg[i] === f && labels[i]) counts.set(labels[i]!, (counts.get(labels[i]!) ?? 0) + 1)
        }
      }
      let bestLab = 0, bestN = 0
      for (const [l, c] of counts) if (c > bestN) { bestN = c; bestLab = l }
      if (bestLab) {
        for (let y = y0; y <= y1; y++) {
          for (let x = x0; x <= x1; x++) {
            const i = y * w + x
            if (seg[i] === f) labels[i] = bestLab
          }
        }
        absorbedPockets++
      }
    } else {
      unnamedFacets.push(f)
    }
  }

  // Final deterministic 1px pinhole & isolated-speck sweep:
  // If any single pixel has 3 or 4 4-neighbors sharing a DIFFERENT label (e.g. a 1px raster wall corner
  // or 1px acute ink-junction speck), snap it to that majority neighbor label. Never touches real features.
  for (let pass = 0; pass < 2; pass++) {
    const changes: Array<[number, number]> = []
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x
        const cur = labels[i]!
        if (!cur) continue
        const n0 = labels[i - 1]!, n1 = labels[i + 1]!, n2 = labels[i - w]!, n3 = labels[i + w]!
        if (n0 === cur || n1 === cur || n2 === cur || n3 === cur) {
          // Only snap 1px pinholes where 3 of 4 neighbors agree on a single other label AND cur is a 1px protrusion
          let same = 0
          if (n0 === cur) same++; if (n1 === cur) same++; if (n2 === cur) same++; if (n3 === cur) same++
          if (same > 1) continue
          const others = [n0, n1, n2, n3].filter((v) => v && v !== cur)
          if (cur === BG_LABEL && ink[i]! < 0.14) {
            const figNbs = [n0, n1, n2, n3].filter((v) => v > BG_LABEL)
            if (figNbs.length >= 3) {
              const freq = new Map<number, number>()
              for (const v of figNbs) freq.set(v, (freq.get(v) ?? 0) + 1)
              let best = 0, bn = 0
              for (const [k, c] of freq) if (c > bn) { bn = c; best = k }
              if (best) changes.push([i, best])
            }
          } else if (others.length === 3 && others[0] === others[1] && others[1] === others[2] && !seg[i] && others[0]! > BG_LABEL) {
            changes.push([i, others[0]!])
          }
          continue
        }
        // Completely isolated 1px pixel (0 of 4 neighbors share its label)
        const freq = new Map<number, number>()
        for (const v of [n0, n1, n2, n3]) if (v) freq.set(v, (freq.get(v) ?? 0) + 1)
        let best = 0, bn = 0
        for (const [k, c] of freq) if (c > bn) { bn = c; best = k }
        if (best) changes.push([i, best])
      }
    }
    if (!changes.length) break
    for (const [i, lab] of changes) labels[i] = lab
  }

  return { labels, absorbedPockets, unnamedFacets }
}
