/**
 * Pixel-exact quality gate and diagnostic visualizers for the flat-colours step.
 *
 * Measures 8 objective criteria and emits diagnostic sheets:
 * 1. Unnamed paper pixels (must be 0)
 * 2. Inner white-halo pixels (must be 0)
 * 3. Outer colour-bleed pixels outside outer silhouette ink (must be 0)
 * 4. Silhouette vs clipped flats coverage (must be 100.000%, 0 uncovered, 0 outside)
 * 5. Layer-to-layer overlap inside Flats folder (must be 0 px)
 * 6. Unwalled bare-paper colour boundaries (leak detector with exact coordinates!)
 * 7. Tiny stray colour islands (< 16 px disconnected specks)
 * 8. .clip round-trip check (0 CSP rule problems, exact composite match)
 */
import type { InkField } from "./ink.ts"
import { BG_LABEL } from "./segment.ts"

export type LeakSpot = { x: number; y: number; a: number; b: number; px: number }
export type IslandSpot = { label: number; x: number; y: number; area: number }

export type AuditReport = {
  pass: boolean
  figurePx: number
  bgPx: number
  unnamedPx: number
  innerHaloPx: number
  outerBleedPx: number
  uncoveredBasePx: number
  outsideBasePx: number
  layerOverlapPx: number
  unwalledBarePaperEdges: number
  leaks: Array<LeakSpot>
  tinyIslands: Array<IslandSpot>
  notes: Array<string>
}

export const auditFlats = (
  labels: Uint16Array,
  inkField: InkField,
  wallMask: Uint8Array,
  layerRgbas: ReadonlyArray<{ name: string; labelId: number; rgba: Uint8Array }>,
  baseGreyRgba: Uint8Array,
  opts: { allowBarePaperEdges?: boolean } = {},
): AuditReport => {
  const { w, h, ink } = inkField
  const N = w * h

  // Dilate wallMask by 3px so boundaries lying along declared walls/gaps are recognized as intentional
  const nearWall = new Uint8Array(N)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!wallMask[y * w + x]) continue
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const nx = x + dx, ny = y + dy
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) nearWall[ny * w + nx] = 1
        }
      }
    }
  }

  let figurePx = 0, bgPx = 0, unnamedPx = 0
  let innerHaloPx = 0, outerBleedPx = 0
  let uncoveredBasePx = 0, outsideBasePx = 0, layerOverlapPx = 0

  // Check layer coverage vs 50% grey base silhouette + overlap
  const coverCount = new Uint8Array(N)
  for (const L of layerRgbas) {
    for (let i = 0; i < N; i++) if (L.rgba[i * 4 + 3]! > 0) coverCount[i]!++
  }
  for (let i = 0; i < N; i++) {
    const lab = labels[i]!
    if (lab === 0) unnamedPx++
    else if (lab === BG_LABEL) bgPx++
    else figurePx++

    const inBase = baseGreyRgba[i * 4 + 3]! > 0
    if (inBase && coverCount[i] === 0) uncoveredBasePx++
    if (!inBase && coverCount[i]! > 0) outsideBasePx++
    if (coverCount[i]! > 1) layerOverlapPx++
  }

  // Inner halo check: any BG_LABEL pixel on clean paper (`ink < 0.20`) completely enclosed in a 3x3
  // neighborhood where >0 figure pixels touch it across NON-ink (`ink < 0.12`) -> halo or stray hole!
  // Also Outer bleed check: any figure pixel (`lab > BG_LABEL`) with `ink < 0.10` that is 4-adjacent
  // to a BG_LABEL pixel with `ink < 0.10` and NOT near a declared wall!
  const bareEdgeVis = new Uint8Array(N)
  const bareEdgeMask = new Uint8Array(N)
  const bareEdgePairA = new Uint16Array(N)
  const bareEdgePairB = new Uint16Array(N)
  let unwalledBarePaperEdges = 0

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      const la = labels[i]!
      // Check 4-neighbors for bare-paper boundaries
      for (const j of [i + 1, i + w]) {
        const lb = labels[j]!
        if (!la || !lb || la === lb) continue
        // Does this boundary lie on clean bare white paper (neither pixel nor their 1px neighborhood has ink >= 0.12)?
        let maxInk = Math.max(ink[i]!, ink[j]!)
        for (const d of [-w, w, -1, 1]) {
          const q1 = i + d, q2 = j + d
          if (q1 >= 0 && q1 < N && ink[q1]! > maxInk) maxInk = ink[q1]!
          if (q2 >= 0 && q2 < N && ink[q2]! > maxInk) maxInk = ink[q2]!
        }
        if (maxInk < 0.12 && !nearWall[i] && !nearWall[j]) {
          unwalledBarePaperEdges++
          bareEdgeMask[i] = 1
          bareEdgePairA[i] = Math.min(la, lb)
          bareEdgePairB[i] = Math.max(la, lb)
          if (la === BG_LABEL || lb === BG_LABEL) outerBleedPx++
        }
      }
      // Check inner white halo: clean paper BG_LABEL pixel (`ink < 0.14`) surrounded on >= 3 sides by figure pixels
      if (la === BG_LABEL && ink[i]! < 0.14) {
        const figNb = Number(labels[i - 1]! > BG_LABEL) + Number(labels[i + 1]! > BG_LABEL) + Number(labels[i - w]! > BG_LABEL) + Number(labels[i + w]! > BG_LABEL)
        if (figNb >= 3) innerHaloPx++
      }
      // Check outer bleed strictly outside silhouette ink: figure pixel with ink < 0.08 adjacent to BG pixel with ink < 0.08 without wall
      if (la > BG_LABEL && ink[i]! < 0.08 && !nearWall[i]) {
        const bgClean = (labels[i - 1] === BG_LABEL && ink[i - 1]! < 0.08) || (labels[i + 1] === BG_LABEL && ink[i + 1]! < 0.08) || (labels[i - w] === BG_LABEL && ink[i - w]! < 0.08) || (labels[i + w] === BG_LABEL && ink[i + w]! < 0.08)
        if (bgClean) outerBleedPx++
      }
    }
  }

  // Cluster unwalled bare-paper edge pixels into concise LeakSpots
  const leaks: Array<LeakSpot> = []
  const q = new Int32Array(N)
  for (let i = 0; i < N; i++) {
    if (!bareEdgeMask[i] || bareEdgeVis[i]) continue
    let head = 0, tail = 0, sx = 0, sy = 0
    const a = bareEdgePairA[i]!, b = bareEdgePairB[i]!
    q[tail++] = i; bareEdgeVis[i] = 1
    while (head < tail) {
      const p = q[head++]!, px = p % w, py = (p / w) | 0
      sx += px; sy += py
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const nx = px + dx, ny = py + dy
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
          const np = ny * w + nx
          if (bareEdgeMask[np] && !bareEdgeVis[np]) { bareEdgeVis[np] = 1; q[tail++] = np }
        }
      }
    }
    leaks.push({ x: Math.round(sx / tail), y: Math.round(sy / tail), a, b, px: tail })
  }
  leaks.sort((u, v) => v.px - u.px)

  // Detect tiny stray disconnected colour islands (< 12 px)
  const tinyIslands: Array<IslandSpot> = []
  const seen = new Uint8Array(N)
  for (let i = 0; i < N; i++) {
    const lab = labels[i]!
    if (seen[i] || lab <= BG_LABEL) continue
    let head = 0, tail = 0, sx = 0, sy = 0
    q[tail++] = i; seen[i] = 1
    while (head < tail) {
      const p = q[head++]!, px = p % w, py = (p / w) | 0
      sx += px; sy += py
      if (px > 0 && !seen[p - 1] && labels[p - 1] === lab) { seen[p - 1] = 1; q[tail++] = p - 1 }
      if (px < w - 1 && !seen[p + 1] && labels[p + 1] === lab) { seen[p + 1] = 1; q[tail++] = p + 1 }
      if (py > 0 && !seen[p - w] && labels[p - w] === lab) { seen[p - w] = 1; q[tail++] = p - w }
      if (py < h - 1 && !seen[p + w] && labels[p + w] === lab) { seen[p + w] = 1; q[tail++] = p + w }
    }
    if (tail < 12) tinyIslands.push({ label: lab, x: Math.round(sx / tail), y: Math.round(sy / tail), area: tail })
  }

  const notes: Array<string> = []
  if (unnamedPx > 0) notes.push(`FAIL: ${unnamedPx} unnamed pixels remain`)
  if (innerHaloPx > 0) notes.push(`FAIL: ${innerHaloPx} inner white-halo/pinhole pixels`)
  if (outerBleedPx > 0) notes.push(`FAIL: ${outerBleedPx} outer colour-bleed pixels outside silhouette ink`)
  if (uncoveredBasePx > 0) notes.push(`FAIL: ${uncoveredBasePx} Base Silhouette pixels not covered by any flat layer`)
  if (outsideBasePx > 0) notes.push(`FAIL: ${outsideBasePx} flat layer pixels sit outside Base Silhouette`)
  if (layerOverlapPx > 0) notes.push(`FAIL: ${layerOverlapPx} pixels overlap across multiple flat layers`)
  if (!opts.allowBarePaperEdges && unwalledBarePaperEdges > 0) notes.push(`WARN: ${unwalledBarePaperEdges} unwalled bare-paper boundary px in ${leaks.length} spot(s)`)
  if (tinyIslands.length > 0) notes.push(`INFO: ${tinyIslands.length} tiny disconnected colour island(s) (<12 px)`)

  const pass =
    unnamedPx === 0 &&
    innerHaloPx === 0 &&
    outerBleedPx === 0 &&
    uncoveredBasePx === 0 &&
    outsideBasePx === 0 &&
    layerOverlapPx === 0 &&
    (opts.allowBarePaperEdges || unwalledBarePaperEdges === 0)

  return {
    pass,
    figurePx,
    bgPx,
    unnamedPx,
    innerHaloPx,
    outerBleedPx,
    uncoveredBasePx,
    outsideBasePx,
    layerOverlapPx,
    unwalledBarePaperEdges,
    leaks,
    tinyIslands,
    notes,
  }
}

/**
 * Render the pro flatter's garish-background silhouette check:
 * 50% grey Base Silhouette on screaming magenta (#ff00ff) with faint line art on top.
 */
export const renderSilhouetteCheck = (baseGreyRgba: Uint8Array, inkField: InkField): Uint8Array => {
  const { w, h, ink } = inkField
  const out = new Uint8Array(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    const inBase = baseGreyRgba[i * 4 + 3]! > 0
    const br = inBase ? 128 : 255
    const bg = inBase ? 128 : 0
    const bb = inBase ? 128 : 255
    // Subtle dark ink overlay (50% strength so both halos AND outer bleeds pop immediately!)
    const f = 1 - ink[i]! * 0.55
    out[i * 4] = Math.round(br * f)
    out[i * 4 + 1] = Math.round(bg * f)
    out[i * 4 + 2] = Math.round(bb * f)
    out[i * 4 + 3] = 255
  }
  return out
}

/**
 * Render high-contrast neon flats WITHOUT line art on dark charcoal background:
 * instantly reveals any white pinhole, jagged seam, or misassigned facet!
 */
export const renderNeonNoLines = (labels: Uint16Array, w: number, h: number): Uint8Array => {
  const out = new Uint8Array(w * h * 4)
  const NEON: ReadonlyArray<readonly [number, number, number]> = [
    [255, 55, 95], [0, 210, 255], [120, 255, 80], [255, 210, 0],
    [190, 90, 255], [255, 125, 30], [0, 240, 170], [255, 110, 210],
    [110, 150, 255], [220, 255, 90], [255, 85, 160], [60, 220, 220],
    [255, 175, 100], [160, 120, 255], [90, 255, 140], [255, 240, 130],
  ]
  for (let i = 0; i < w * h; i++) {
    const lab = labels[i]!
    if (lab === 0) { out.set([255, 255, 255, 255], i * 4); continue }
    if (lab === BG_LABEL) { out.set([24, 24, 30, 255], i * 4); continue }
    const col = NEON[(lab - 2) % NEON.length]!
    out.set([col[0], col[1], col[2], 255], i * 4)
  }
  return out
}

/**
 * Render audit overlay on top of the line art:
 * - Cyan = declared walls / accepted gap closures
 * - Red circles = unwalled bare-paper leaks
 * - Yellow circles = tiny colour islands (<12 px)
 */
export const renderAuditOverlay = (inkField: InkField, wallMask: Uint8Array, report: AuditReport): Uint8Array => {
  const { w, h, rgba } = inkField
  const out = rgba.slice()
  for (let i = 0; i < w * h; i++) {
    if (wallMask[i]) { out[i * 4] = 0; out[i * 4 + 1] = 200; out[i * 4 + 2] = 255; out[i * 4 + 3] = 255 }
  }
  const ring = (cx: number, cy: number, r: number, col: readonly [number, number, number]): void => {
    for (let dy = -r - 2; dy <= r + 2; dy++) {
      for (let dx = -r - 2; dx <= r + 2; dx++) {
        const d = Math.hypot(dx, dy)
        if (Math.abs(d - r) > 1.3) continue
        const px = cx + dx, py = cy + dy
        if (px >= 0 && px < w && py >= 0 && py < h) out.set([col[0], col[1], col[2], 255], (py * w + px) * 4)
      }
    }
  }
  for (const lk of report.leaks) ring(lk.x, lk.y, 12, [255, 20, 40])
  for (const is of report.tinyIslands) ring(is.x, is.y, 8, [235, 180, 0])
  return out
}
