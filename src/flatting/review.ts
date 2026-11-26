/**
 * Automatic high-risk review contact sheets (pure Node.js, zero manual crop coordinates needed!).
 *
 * Generates 3 tiled 3x-zoomed diagnostic contact sheets after every build:
 * 1. `review-bg-holes.png`         — Every enclosed white space (bg facet not touching canvas border):
 *                                    catches hair curls, cross-bars, or clothing mistakenly marked as bg.
 * 2. `review-suspect-holes.png`    — Every interior figure facet bordering >= 2 distinct other colours
 *                                    (e.g. air pocket between elbow & wheel, or gap between fingers & prop)
 *                                    plus every unwalled bare-paper leak spot: catches air mistakenly coloured!
 * 3. `review-same-color-loops.png` — Every closed compact ink loop (rivets, buttons, nails, gems, eyes)
 *                                    that was assigned the SAME colour as its surrounding parent region:
 *                                    catches missed buttons, rivets, nails, and small details!
 */
import type { InkField } from "./ink.ts"
import type { FacetInfo, FacetMap } from "./segment.ts"
import { BG_LABEL } from "./segment.ts"
import type { AuditReport } from "./audit.ts"
import { drawLabel } from "./sheet.ts"

export type ReviewCandidate = {
  id: number
  kind: "bg-hole" | "suspect-hole" | "same-color-loop" | "leak"
  x: number
  y: number
  bbox: [number, number, number, number]
  area: number
  note: string
}

/**
 * Inspect the finished flatting assignment and automatically detect all high-risk visual review spots:
 * - Enclosed bg holes (might be real hair/wood/cloth)
 * - Multi-colour-bordered interior pockets (might be enclosed air holes!)
 * - Closed compact ink loops sharing their enclosing parent's colour (might be missed rivets/buttons/nails!)
 */
export const findReviewCandidates = (
  fm: FacetMap,
  baseFm: FacetMap,
  labels: Uint16Array,
  facetLabel: Uint16Array,
  audit: AuditReport,
): {
  bgHoles: Array<ReviewCandidate>
  suspectHoles: Array<ReviewCandidate>
  sameColorLoops: Array<ReviewCandidate>
  leakSpots: Array<ReviewCandidate>
} => {
  const { w, h, seg, facets, n } = fm
  const baseIdOf = (f: FacetInfo): number => baseFm.seg[f.deepY * w + f.deepX]! || f.id

  // For each facet, find all distinct labels touching it across a 5px halo (crossing ink strokes)
  // AND compute exact perimeter, same-label share, & compactness to detect closed rivets/buttons/nails!
  const bgHoles: Array<ReviewCandidate> = []
  const suspectHoles: Array<ReviewCandidate & { score: number }> = []
  const sameColorLoops: Array<ReviewCandidate> = []

  const probeHaloLabels = (f: FacetInfo): { distinctOther: Set<number>; touchesBg: boolean; perimeter: number; sameShare: number } => {
    const [x0, y0, x1, y1] = f.bbox
    const distinctOther = new Set<number>()
    let touchesBg = false
    let perimeter = 0
    let sameHits = 0
    let totalHits = 0
    const myLab = facetLabel[f.id]!
    const R = 5
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * w + x
        if (seg[i] !== f.id) continue
        const isEdge =
          x === 0 || y === 0 || x === w - 1 || y === h - 1 ||
          seg[i - 1] !== f.id || seg[i + 1] !== f.id || seg[i - w] !== f.id || seg[i + w] !== f.id
        if (!isEdge) continue
        perimeter++
        // Sample 4 cardinal rays outward up to R px across ink to find neighboring facet labels
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
          for (let step = 1; step <= R; step++) {
            const nx = x + dx * step, ny = y + dy * step
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) break
            const nf = seg[ny * w + nx]!
            if (nf && nf !== f.id) {
              const nl = facetLabel[nf]!
              if (nl) {
                totalHits++
                if (nl === myLab) sameHits++
                else {
                  if (nl === BG_LABEL) touchesBg = true
                  distinctOther.add(nl)
                }
              }
              break
            }
          }
        }
      }
    }
    return { distinctOther, touchesBg, perimeter, sameShare: totalHits ? sameHits / totalHits : 0 }
  }

  for (let id = 1; id <= n; id++) {
    const f = facets[id]!
    const lab = facetLabel[id]!
    if (!lab || f.area < 20) continue
    const bid = baseIdOf(f)

    // 1. Enclosed non-exterior background holes (area >= 25 px)
    if (lab === BG_LABEL) {
      if (f.borderMask === 0 && f.area >= 25) {
        bgHoles.push({ id: bid, kind: "bg-hole", x: f.deepX, y: f.deepY, bbox: f.bbox, area: f.area, note: `#${bid} (${f.area}px)` })
      }
      continue
    }

    // Only run halo probes on compact-to-medium facets (< 4000 px) for speed & precision
    if (f.area > 4000) continue
    const { distinctOther, touchesBg, perimeter, sameShare } = probeHaloLabels(f)

    // 2. Suspect enclosed air pockets: compact-to-medium figure facets (35..2500 px) that touch >= 2
    //    distinct other labels (or touch BG + another figure colour) — classic signature of air trapped
    //    between limb & prop or between fingers & held object!
    if (f.area >= 35 && f.area <= 2500 && f.maxDist >= 2.0) {
      const otherFigColors = [...distinctOther].filter((l) => l !== BG_LABEL).length
      const totalOther = otherFigColors + (touchesBg ? 1 : 0)
      if (totalOther >= 2 || (touchesBg && otherFigColors >= 1)) {
        // Higher score for facets bordering more distinct materials & smaller/medium trapped-pocket size
        const score = totalOther * 10000 - f.area
        suspectHoles.push({
          id: bid,
          kind: "suspect-hole",
          x: f.deepX,
          y: f.deepY,
          bbox: f.bbox,
          area: f.area,
          note: `#${bid} (${f.area}px, ${totalOther}nb)`,
          score,
        })
      }
    }

    // 3. Closed compact ink loops sharing their surrounding parent's colour (missed rivets, buttons, nails, eyes!):
    //    Catches BOTH fully-enclosed loops (rivets/buttons: distinctOther === 0) AND edge-mounted compact ovals
    //    (fingernails on fingertips touching a prop: distinctOther <= 1, sameShare >= 0.45)!
    if (f.area >= 25 && f.area <= 550 && f.borderMask === 0 && perimeter > 0) {
      const compactness = (4 * Math.PI * f.area) / (perimeter * perimeter)
      const bw = f.bbox[2] - f.bbox[0] + 1, bh = f.bbox[3] - f.bbox[1] + 1
      const aspect = Math.max(bw, bh) / Math.max(1, Math.min(bw, bh))
      if (distinctOther.size <= 1 && sameShare >= 0.45 && compactness >= 0.42 && aspect <= 2.8 && f.paperNeighbors.length === 0) {
        sameColorLoops.push({
          id: bid,
          kind: "same-color-loop",
          x: f.deepX,
          y: f.deepY,
          bbox: f.bbox,
          area: f.area,
          note: `#${bid} (${f.area}px)`,
        })
      }
    }
  }

  // 4. Every unwalled bare-paper leak spot from audit
  const leakSpots: Array<ReviewCandidate> = audit.leaks.map((lk, idx) => ({
    id: idx + 1,
    kind: "leak",
    x: lk.x,
    y: lk.y,
    bbox: [Math.max(0, lk.x - 24), Math.max(0, lk.y - 24), Math.min(w - 1, lk.x + 24), Math.min(h - 1, lk.y + 24)],
    area: lk.px,
    note: `L${idx + 1} (${lk.px}px)`,
  }))

  bgHoles.sort((a, b) => b.area - a.area)
  suspectHoles.sort((a, b) => b.score - a.score)
  sameColorLoops.sort((a, b) => b.area - a.area)

  return { bgHoles, suspectHoles, sameColorLoops, leakSpots }
}

/**
 * Render a tiled side-by-side contact sheet for a list of ReviewCandidates.
 * Each tile shows [Original Line Art | Flat Preview (or Magenta Silhouette for bg-holes)] at 2x-3x zoom
 * with a bright highlight dot at the facet's pole + its facet ID!
 */
export const renderReviewSheet = (
  items: ReadonlyArray<ReviewCandidate>,
  inkField: InkField,
  previewRgba: Uint8Array,
  silhouetteRgba: Uint8Array,
  maxItems = 24,
): { w: number; h: number; rgba: Uint8Array } | null => {
  const list = items.slice(0, maxItems)
  if (!list.length) return null

  const { w: W, h: H, rgba: lineRgba } = inkField
  const panelSize = 150 // each half-tile is 150x150 px -> full tile is 304x156 px
  const gap = 8
  const tileW = panelSize * 2 + 4
  const tileH = panelSize
  const cols = Math.min(3, list.length)
  const rows = Math.ceil(list.length / cols)
  const outW = cols * (tileW + gap) + gap
  const outH = rows * (tileH + gap) + gap
  const out = new Uint8Array(outW * outH * 4)
  // Dark neutral charcoal grid background
  for (let i = 0; i < outW * outH; i++) { out[i * 4] = 30; out[i * 4 + 1] = 32; out[i * 4 + 2] = 38; out[i * 4 + 3] = 255 }

  list.forEach((item, idx) => {
    const col = idx % cols, row = Math.floor(idx / cols)
    const tx = gap + col * (tileW + gap)
    const ty = gap + row * (tileH + gap)

    const [bx0, by0, bx1, by1] = item.bbox
    const span = Math.max(bx1 - bx0 + 1, by1 - by0 + 1, 32)
    const viewSpan = Math.min(Math.max(span * 1.9, 64), 220)
    const cx = (bx0 + bx1) * 0.5, cy = (by0 + by1) * 0.5
    const sx0 = Math.max(0, Math.min(W - viewSpan, cx - viewSpan * 0.5))
    const sy0 = Math.max(0, Math.min(H - viewSpan, cy - viewSpan * 0.5))
    const rightSrc = item.kind === "bg-hole" ? silhouetteRgba : previewRgba

    for (let py = 0; py < panelSize; py++) {
      const sy = Math.min(H - 1, Math.max(0, Math.floor(sy0 + (py / panelSize) * viewSpan)))
      for (let px = 0; px < panelSize; px++) {
        const sx = Math.min(W - 1, Math.max(0, Math.floor(sx0 + (px / panelSize) * viewSpan)))
        const si = (sy * W + sx) * 4
        // Left half: original line art
        const diL = ((ty + py) * outW + (tx + px)) * 4
        out[diL] = lineRgba[si]!; out[diL + 1] = lineRgba[si + 1]!; out[diL + 2] = lineRgba[si + 2]!; out[diL + 3] = 255
        // Right half: preview (or magenta silhouette for bg-holes)
        const diR = ((ty + py) * outW + (tx + panelSize + 4 + px)) * 4
        out[diR] = rightSrc[si]!; out[diR + 1] = rightSrc[si + 1]!; out[diR + 2] = rightSrc[si + 2]!; out[diR + 3] = 255
      }
    }

    // Draw crosshair marker at exact pole (item.x, item.y) on the left (line art) panel
    const mx = Math.round(((item.x - sx0) / viewSpan) * panelSize)
    const my = Math.round(((item.y - sy0) / viewSpan) * panelSize)
    for (let d = -6; d <= 6; d++) {
      for (const [px, py] of [[mx + d, my], [mx, my + d]] as const) {
        if (px >= 0 && px < panelSize && py >= 0 && py < panelSize) {
          const di = ((ty + py) * outW + (tx + px)) * 4
          out[di] = 255; out[di + 1] = 30; out[di + 2] = 60; out[di + 3] = 255
        }
      }
    }

    // Crisp ID badge at top-left of tile
    const badge = item.kind === "leak" ? `-${item.id}` : String(item.id)
    drawLabel(out, outW, outH, tx + 24, ty + 12, badge, [255, 255, 255], [20, 20, 25], 2)
  })

  return { w: outW, h: outH, rgba: out }
}
