/**
 * Geometric gap detection & virtual wall rasterization for line art flatting.
 *
 * Implements stroke-endpoint tangent analysis (Fourey–Tschumperlé–Revoy 2018 / Grease Pencil
 * Extend + Radius modes):
 * 1. Zhang-Suen thinning of the ink barrier -> 1px skeleton.
 * 2. Prune tiny thinning whiskers, extract free stroke endpoints + outward unit tangents.
 * 3. Detect two kinds of gaps:
 *    - "pair": two facing endpoints within `maxPairDist` whose tangents align with the chord.
 *    - "extend": one endpoint whose tangent ray hits another stroke within `maxExtendDist`.
 * 4. Every gap gets a numbered ID (`g1, g2, ...`), length, endpoints, and whether closing it
 *    creates a clean bridge across open paper.
 */

export type GapCandidate = {
  id: number
  kind: "pair" | "extend"
  x1: number
  y1: number
  x2: number
  y2: number
  length: number
  /** Lower is a cleaner continuation. */
  cost: number
}

export type GapOptions = {
  /** Max pixel length for end-to-end pair candidates. Default 16. */
  maxPairDist?: number
  /** Max pixel length for ray-extend (end-to-ink) candidates. Default 14. */
  maxExtendDist?: number
  /** Minimum stroke length (px) to consider an endpoint (ignores tiny hatching ticks). Default 8. */
  minStrokeLen?: number
}

/** Zhang-Suen binary thinning -> 1px 8-connected skeleton. */
export const thinBarrier = (barrier: Uint8Array, w: number, h: number): Uint8Array => {
  const s = barrier.slice()
  for (let x = 0; x < w; x++) { s[x] = 0; s[(h - 1) * w + x] = 0 }
  for (let y = 0; y < h; y++) { s[y * w] = 0; s[y * w + w - 1] = 0 }
  let px: Array<number> = []
  for (let i = 0; i < s.length; i++) if (s[i]) px.push(i)
  for (let more = true; more;) {
    more = false
    for (const step of [0, 1]) {
      const del: Array<number> = []
      for (const i of px) {
        if (!s[i]) continue
        const a = s[i - w]!, b = s[i - w + 1]!, c = s[i + 1]!, d = s[i + w + 1]!
        const e = s[i + w]!, f = s[i + w - 1]!, g = s[i - 1]!, q = s[i - w - 1]!
        const B = a + b + c + d + e + f + g + q
        if (B < 2 || B > 6) continue
        const turns = Number(!a && b) + Number(!b && c) + Number(!c && d) + Number(!d && e) + Number(!e && f) + Number(!f && g) + Number(!g && q) + Number(!q && a)
        if (turns !== 1 || (step === 0 ? (a & c & e) | (c & e & g) : (a & c & g) | (a & e & g))) continue
        del.push(i)
      }
      for (const i of del) s[i] = 0
      if (del.length) more = true
    }
    px = px.filter((i) => s[i])
  }
  // Remove L-staircases so paths have clean degree 2
  for (const i of px) {
    const a = s[i - w], c = s[i + 1], e = s[i + w], g = s[i - 1]
    if ((a && c && !s[i + w - 1]) || (c && e && !s[i - w - 1]) || (e && g && !s[i - w + 1]) || (g && a && !s[i + w + 1])) s[i] = 0
  }
  return s
}

/** Draw a 1px 8-connected Bresenham line segment onto a binary mask (0 or 1). */
export const drawLine = (mask: Uint8Array, w: number, h: number, x0: number, y0: number, x1: number, y1: number, thickness = 1): void => {
  let ix0 = Math.round(x0), iy0 = Math.round(y0)
  const ix1 = Math.round(x1), iy1 = Math.round(y1)
  const dx = Math.abs(ix1 - ix0), sx = ix0 < ix1 ? 1 : -1
  const dy = -Math.abs(iy1 - iy0), sy = iy0 < iy1 ? 1 : -1
  let err = dx + dy
  const r = Math.max(0, Math.floor((thickness - 1) / 2))
  for (;;) {
    for (let oy = -r; oy <= r; oy++) {
      for (let ox = -r; ox <= r; ox++) {
        const px = ix0 + ox, py = iy0 + oy
        if (px >= 0 && px < w && py >= 0 && py < h) mask[py * w + px] = 1
      }
    }
    if (ix0 === ix1 && iy0 === iy1) break
    const e2 = 2 * err
    if (e2 >= dy) { err += dy; ix0 += sx }
    if (e2 <= dx) { err += dx; iy0 += sy }
  }
}

/** Parse and rasterize polyline walls ("x1,y1 x2,y2 ..." per string) into a binary mask. */
export const rasterizeWalls = (walls: ReadonlyArray<string>, w: number, h: number, thickness = 1): Uint8Array => {
  const mask = new Uint8Array(w * h)
  for (const wall of walls) {
    const pts = wall.trim().split(/\s+/).filter(Boolean).map((tok) => {
      const [xs, ys] = tok.split(",")
      return [Number(xs), Number(ys)] as const
    }).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
    for (let i = 1; i < pts.length; i++) {
      drawLine(mask, w, h, pts[i - 1]![0], pts[i - 1]![1], pts[i]![0], pts[i]![1], thickness)
    }
  }
  return mask
}

/** Detect open stroke endpoints and propose numbered geometric gap closures. */
export const detectGaps = (barrier: Uint8Array, w: number, h: number, opts: GapOptions = {}): { skeleton: Uint8Array; gaps: Array<GapCandidate> } => {
  const maxPairDist = opts.maxPairDist ?? 16
  const maxExtendDist = opts.maxExtendDist ?? 14
  const minStrokeLen = opts.minStrokeLen ?? 8
  const skel = thinBarrier(barrier, w, h)
  const offs = [-w, -w + 1, 1, w + 1, w, w - 1, -1, -w - 1]
  const nbs = (p: number): Array<number> => {
    const out: Array<number> = []
    for (const d of offs) { const q = p + d; if (q >= 0 && q < w * h && skel[q]) out.push(q) }
    return out
  }

  // Extract free endpoints (degree === 1) and trace back along stroke to get outward unit tangent
  type End = { p: number; x: number; y: number; tx: number; ty: number; len: number; back: Set<number> }
  const ends: Array<End> = []
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      const p = y * w + x
      if (!skel[p]) continue
      const n = nbs(p)
      if (n.length !== 1) continue
      // Trace back along skeleton until junction or 14 steps
      const chain = [p]
      let prev = p, cur = n[0]!
      for (let step = 0; step < 16; step++) {
        chain.push(cur)
        const cn = nbs(cur)
        if (cn.length !== 2) break
        const next = cn[0] === prev ? cn[1]! : cn[0]!
        prev = cur; cur = next
      }
      if (chain.length < minStrokeLen) continue
      const refIdx = Math.min(chain.length - 1, 8)
      const rx = chain[refIdx]! % w, ry = (chain[refIdx]! / w) | 0
      const dx = x - rx, dy = y - ry
      const L = Math.hypot(dx, dy)
      if (L < 1e-3) continue
      ends.push({ p, x, y, tx: dx / L, ty: dy / L, len: chain.length, back: new Set(chain) })
    }
  }

  const raw: Array<Omit<GapCandidate, "id">> = []
  const paired = new Set<number>()

  // 1. End-to-end pairs (facing endpoints or very close endpoints)
  for (let i = 0; i < ends.length; i++) {
    const a = ends[i]!
    for (let j = i + 1; j < ends.length; j++) {
      const b = ends[j]!
      const dx = b.x - a.x, dy = b.y - a.y
      const dist = Math.hypot(dx, dy)
      if (dist < 1.5 || dist > maxPairDist) continue
      if (a.back.has(b.p) || b.back.has(a.p)) continue
      const ux = dx / dist, uy = dy / dist
      const cosA = a.tx * ux + a.ty * uy
      const cosB = -(b.tx * ux + b.ty * uy)
      // Very close ends (<= 4.5 px) accept looser angles; farther ends require good continuation
      const minCos = dist <= 4.5 ? 0.15 : 0.65
      if (cosA < minCos || cosB < minCos) continue
      // Check that the interior of the segment crosses actual open paper (not already solid ink!)
      let openCount = 0
      const steps = Math.max(2, Math.ceil(dist))
      for (let s = 1; s < steps; s++) {
        const px = Math.round(a.x + dx * (s / steps)), py = Math.round(a.y + dy * (s / steps))
        if (!barrier[py * w + px]) openCount++
      }
      if (openCount < 1) continue
      const anglePenalty = (2 - cosA - cosB) * 8
      raw.push({ kind: "pair", x1: a.x, y1: a.y, x2: b.x, y2: b.y, length: Math.round(dist * 10) / 10, cost: dist + anglePenalty })
      if (dist <= 6) { paired.add(i); paired.add(j) }
    }
  }

  // 2. End-to-ink ray extend (march outward along tangent until hitting another stroke)
  for (let i = 0; i < ends.length; i++) {
    if (paired.has(i)) continue
    const a = ends[i]!
    let leftInk = false
    let openSteps = 0
    for (let r = 1; r <= maxExtendDist; r += 0.5) {
      const px = Math.round(a.x + a.tx * r), py = Math.round(a.y + a.ty * r)
      if (px < 1 || py < 1 || px >= w - 1 || py >= h - 1) break
      const idx = py * w + px
      if (!barrier[idx]) { leftInk = true; openSteps++; continue }
      if (leftInk && openSteps >= 2 && !a.back.has(idx)) {
        raw.push({ kind: "extend", x1: a.x, y1: a.y, x2: px, y2: py, length: Math.round(r * 10) / 10, cost: r + 2 })
        break
      }
    }
  }

  // Deduplicate spatially close candidates and sort cleanly top-to-bottom
  raw.sort((a, b) => a.cost - b.cost)
  const kept: Array<Omit<GapCandidate, "id">> = []
  for (const c of raw) {
    const mx = (c.x1 + c.x2) * 0.5, my = (c.y1 + c.y2) * 0.5
    if (kept.some((k) => Math.hypot((k.x1 + k.x2) * 0.5 - mx, (k.y1 + k.y2) * 0.5 - my) < 5)) continue
    kept.push(c)
  }
  kept.sort((a, b) => Math.min(a.y1, a.y2) - Math.min(b.y1, b.y2) || Math.min(a.x1, a.x2) - Math.min(b.x1, b.x2))
  return { skeleton: skel, gaps: kept.map((g, idx) => ({ id: idx + 1, ...g })) }
}
