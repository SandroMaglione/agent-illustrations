/**
 * Exact layer-by-layer pixel diff between two .clip files (e.g. pipeline output vs artist-edited .clip).
 *
 * Extracts:
 * - New / removed / modified flat colour layers inside the Flats folder (with exact hex colours)
 * - Exact pixel-level transitions on the clipped Flats-over-Base composite (e.g. `Hair -> bg`, `bg -> Plastic Glass`)
 * - Connected changed regions & (when lineart + spec are provided) exact base facet IDs ready to paste into `.flats.txt`
 * - Side-by-side zoomed contact sheet (`diff-sheet.png`) showing [Before | After] for every changed region
 */
import { compositeClip, readClip } from "../layers/clipread.ts"
import type { Clip, ClipLayer } from "../layers/clipread.ts"
import type { FacetMap } from "./segment.ts"
import { drawLabel } from "./sheet.ts"

export type DiffCluster = {
  id: number
  area: number
  bbox: [number, number, number, number]
  topTransition: string
  transitions: Array<{ from: string; to: string; px: number }>
}

export type FacetDiff = {
  baseId: number
  area: number
  changedPx: number
  pct: number
  deep: [number, number]
  from: string
  to: string
}

export type LayerDelta = {
  name: string
  status: "added" | "removed" | "modified" | "unchanged"
  hex: string
  beforePx: number
  afterPx: number
  addedPx: number
  removedPx: number
}

export type ClipDiffReport = {
  w: number
  h: number
  totalChangedPx: number
  layerDeltas: Array<LayerDelta>
  transitions: Array<{ from: string; to: string; px: number }>
  clusters: Array<DiffCluster>
  facetDiffs: Array<FacetDiff>
  sheet: { w: number; h: number; rgba: Uint8Array } | null
  afterPreview: Uint8Array
}

const sampleLayerHex = (L: ClipLayer): { hex: string; px: number } => {
  if (!L.rgba) return { hex: "-", px: 0 }
  let px = 0, r = 0, g = 0, b = 0
  for (let i = 0; i < L.rgba.length; i += 4) {
    if (L.rgba[i + 3]! >= 128) {
      if (px === 0) {
        r = Math.round(L.rgba[i]!)
        g = Math.round(L.rgba[i + 1]!)
        b = Math.round(L.rgba[i + 2]!)
      }
      px++
    }
  }
  const hex = px > 0
    ? `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
    : "-"
  return { hex, px }
}

const extractFlatsMap = (c: Clip): { names: Array<string>; map: Int16Array; layers: Array<ClipLayer> } => {
  const flatsFolder = c.layers.find((l) => l.folder && l.name === "Flats")
  const baseLayer = c.layers.find((l) => !l.folder && l.name === "Base 50% Grey")
  const kids = (flatsFolder?.kids ?? []).filter((l) => !l.folder && l.visible && l.rgba)
  const names = ["bg", ...kids.map((l) => l.name)]
  const N = c.w * c.h
  const map = new Int16Array(N)
  const baseRgba = baseLayer?.rgba
  for (let i = 0; i < N; i++) {
    if (!baseRgba || baseRgba[i * 4 + 3]! < 128) continue
    let hit = -2 // BaseOnly (painted on Base 50% Grey with no colour layer covering it)
    for (let k = kids.length - 1; k >= 0; k--) {
      if (kids[k]!.rgba![i * 4 + 3]! >= 128) { hit = k + 1; break }
    }
    map[i] = hit
  }
  return { names, map, layers: kids }
}

const compositeToRgba = (c: Clip): Uint8Array => {
  const f = compositeClip(c)
  const N = c.w * c.h
  const out = new Uint8Array(N * 4)
  for (let i = 0; i < N; i++) {
    const a = f[i * 4 + 3]! / 255
    out[i * 4] = Math.round(f[i * 4]! * a + 255 * (1 - a))
    out[i * 4 + 1] = Math.round(f[i * 4 + 1]! * a + 255 * (1 - a))
    out[i * 4 + 2] = Math.round(f[i * 4 + 2]! * a + 255 * (1 - a))
    out[i * 4 + 3] = 255
  }
  return out
}

export const diffClips = (
  beforeBuf: Buffer,
  afterBuf: Buffer,
  baseFm?: FacetMap,
): ClipDiffReport => {
  const before = readClip(beforeBuf)
  const after = readClip(afterBuf)
  if (before.w !== after.w || before.h !== after.h) {
    throw new Error(`Canvas size mismatch: before=${before.w}x${before.h}, after=${after.w}x${after.h}`)
  }
  const { w, h } = before
  const N = w * h
  const B = extractFlatsMap(before)
  const A = extractFlatsMap(after)

  // Per-layer deltas inside Flats
  const bByName = new Map(B.layers.map((l) => [l.name, l]))
  const aByName = new Map(A.layers.map((l) => [l.name, l]))
  const allNames = [...new Set([...bByName.keys(), ...aByName.keys()])]
  const layerDeltas: Array<LayerDelta> = []
  for (const name of allNames) {
    const bl = bByName.get(name), al = aByName.get(name)
    const bi = bl ? sampleLayerHex(bl) : { hex: "-", px: 0 }
    const ai = al ? sampleLayerHex(al) : { hex: "-", px: 0 }
    let addedPx = 0, removedPx = 0
    for (let i = 0; i < N; i++) {
      const ba = bl?.rgba ? bl.rgba[i * 4 + 3]! >= 128 : false
      const aa = al?.rgba ? al.rgba[i * 4 + 3]! >= 128 : false
      if (!ba && aa) addedPx++
      else if (ba && !aa) removedPx++
    }
    const status = !bl ? "added" : !al ? "removed" : (addedPx + removedPx > 0 ? "modified" : "unchanged")
    layerDeltas.push({ name, status, hex: ai.hex !== "-" ? ai.hex : bi.hex, beforePx: bi.px, afterPx: ai.px, addedPx, removedPx })
  }

  const nameOf = (L: { names: Array<string> }, id: number): string => (id === -2 ? "BaseOnly" : L.names[id] ?? "bg")
  const transCounts = new Map<string, number>()
  const changed = new Uint8Array(N)
  let totalChangedPx = 0
  for (let i = 0; i < N; i++) {
    const bn = nameOf(B, B.map[i]!), an = nameOf(A, A.map[i]!)
    if (bn !== an) {
      changed[i] = 1
      totalChangedPx++
      const key = `${bn}\t${an}`
      transCounts.set(key, (transCounts.get(key) ?? 0) + 1)
    }
  }
  const transitions = [...transCounts.entries()]
    .map(([k, px]) => { const [from, to] = k.split("\t") as [string, string]; return { from, to, px } })
    .sort((a, b) => b.px - a.px)

  // Connected components of changed pixels (bridged across 2px so tiny adjacent tweaks group cleanly)
  const vis = new Uint8Array(N)
  const qx = new Int32Array(N), qy = new Int32Array(N)
  const clusters: Array<DiffCluster> = []
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x
      if (!changed[idx] || vis[idx]) continue
      let head = 0, tail = 0
      qx[tail] = x; qy[tail] = y; tail++
      vis[idx] = 1
      let minX = x, maxX = x, minY = y, maxY = y
      const tc = new Map<string, number>()
      while (head < tail) {
        const cx = qx[head]!, cy = qy[head]!; head++
        const ci = cy * w + cx
        const key = `${nameOf(B, B.map[ci]!)}\t${nameOf(A, A.map[ci]!)}`
        tc.set(key, (tc.get(key) ?? 0) + 1)
        if (cx < minX) minX = cx; if (cx > maxX) maxX = cx
        if (cy < minY) minY = cy; if (cy > maxY) maxY = cy
        for (let dy = -2; dy <= 2; dy++) {
          const ny = cy + dy; if (ny < 0 || ny >= h) continue
          for (let dx = -2; dx <= 2; dx++) {
            const nx = cx + dx; if (nx < 0 || nx >= w) continue
            const ni = ny * w + nx
            if (changed[ni] && !vis[ni]) { vis[ni] = 1; qx[tail] = nx; qy[tail] = ny; tail++ }
          }
        }
      }
      const tList = [...tc.entries()]
        .map(([k, px]) => { const [from, to] = k.split("\t") as [string, string]; return { from, to, px } })
        .sort((a, b) => b.px - a.px)
      const top = tList[0]!
      clusters.push({
        id: 0,
        area: tail,
        bbox: [minX, minY, maxX, maxY],
        topTransition: `${top.from} -> ${top.to}`,
        transitions: tList,
      })
    }
  }
  clusters.sort((a, b) => b.area - a.area)
  clusters.forEach((c, idx) => { c.id = idx + 1 })

  // Map changed pixels back to baseFm facet IDs if baseFm was supplied
  const facetDiffs: Array<FacetDiff> = []
  if (baseFm) {
    const fMap = new Map<number, { total: number; ch: number; from: Map<string, number>; to: Map<string, number> }>()
    for (let i = 0; i < N; i++) {
      const fid = baseFm.seg[i]!
      if (fid <= 0) continue
      let rec = fMap.get(fid)
      if (!rec) { rec = { total: 0, ch: 0, from: new Map(), to: new Map() }; fMap.set(fid, rec) }
      rec.total++
      if (changed[i]) {
        rec.ch++
        const bn = nameOf(B, B.map[i]!), an = nameOf(A, A.map[i]!)
        rec.from.set(bn, (rec.from.get(bn) ?? 0) + 1)
        rec.to.set(an, (rec.to.get(an) ?? 0) + 1)
      }
    }
    for (const [fid, rec] of fMap) {
      if (rec.ch < 8 || rec.ch / rec.total < 0.15) continue
      const f = baseFm.facets[fid]!
      const fromTop = [...rec.from.entries()].sort((a, b) => b[1] - a[1])[0]![0]
      const toTop = [...rec.to.entries()].sort((a, b) => b[1] - a[1])[0]![0]
      facetDiffs.push({
        baseId: fid,
        area: f.area,
        changedPx: rec.ch,
        pct: Math.round((rec.ch / rec.total) * 100),
        deep: [f.deepX, f.deepY],
        from: fromTop,
        to: toTop,
      })
    }
    facetDiffs.sort((a, b) => b.changedPx - a.changedPx)
  }

  // Render [Before | After] side-by-side contact sheet for changed clusters >= 12 px
  const imgB = compositeToRgba(before)
  const imgA = compositeToRgba(after)
  const shown = clusters.filter((c) => c.area >= 12).slice(0, 36)
  let sheet: { w: number; h: number; rgba: Uint8Array } | null = null
  if (shown.length > 0) {
    const panel = 160, pad = 8, cols = Math.min(3, shown.length)
    const tileW = panel * 2 + 4
    const rows = Math.ceil(shown.length / cols)
    const sw = cols * (tileW + pad) + pad
    const sh = rows * (panel + pad) + pad
    const out = new Uint8Array(sw * sh * 4)
    for (let i = 0; i < sw * sh; i++) { out[i * 4] = 30; out[i * 4 + 1] = 32; out[i * 4 + 2] = 38; out[i * 4 + 3] = 255 }
    shown.forEach((c, idx) => {
      const col = idx % cols, row = Math.floor(idx / cols)
      const ox = pad + col * (tileW + pad), oy = pad + row * (panel + pad)
      const [x0, y0, x1, y1] = c.bbox
      const span = Math.max(x1 - x0 + 1, y1 - y0 + 1, 44) + 32
      const cx = (x0 + x1) * 0.5, cy = (y0 + y1) * 0.5
      const sx0 = Math.max(0, Math.min(w - span, Math.round(cx - span * 0.5)))
      const sy0 = Math.max(0, Math.min(h - span, Math.round(cy - span * 0.5)))
      const s = Math.min(span, w - sx0, h - sy0)
      for (let py = 0; py < panel; py++) {
        const sy = Math.min(h - 1, sy0 + Math.floor((py * s) / panel))
        for (let px = 0; px < panel; px++) {
          const sx = Math.min(w - 1, sx0 + Math.floor((px * s) / panel))
          const si = (sy * w + sx) * 4
          const dL = ((oy + py) * sw + (ox + px)) * 4
          const dR = ((oy + py) * sw + (ox + panel + 4 + px)) * 4
          for (let k = 0; k < 4; k++) { out[dL + k] = imgB[si + k]!; out[dR + k] = imgA[si + k]! }
        }
      }
      drawLabel(out, sw, sh, ox + 22, oy + 12, String(c.id), [255, 255, 255], [20, 20, 25], 2)
    })
    sheet = { w: sw, h: sh, rgba: out }
  }

  return { w, h, totalChangedPx, layerDeltas, transitions, clusters, facetDiffs, sheet, afterPreview: imgA }
}
