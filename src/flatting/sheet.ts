/**
 * Pure-Node diagnostic sheet renderers (zero browser dependency):
 * - Crisp 5x7 bitmap font for drawing facet IDs and gap IDs onto PNGs.
 * - Numbered facet sheet (whole canvas or zoomed crop).
 * - Gap candidates overlay sheet.
 */
import type { GapCandidate } from "./gaps.ts"
import type { InkField } from "./ink.ts"
import type { FacetMap } from "./segment.ts"

/** 3x5 compact pixel font for digits, letters, and punctuation. */
const FONT: Record<string, ReadonlyArray<string>> = {
  "0": ["111", "101", "101", "101", "111"],
  "1": ["010", "110", "010", "010", "111"],
  "2": ["111", "001", "111", "100", "111"],
  "3": ["111", "001", "111", "001", "111"],
  "4": ["101", "101", "111", "001", "001"],
  "5": ["111", "100", "111", "001", "111"],
  "6": ["111", "100", "111", "101", "111"],
  "7": ["111", "001", "010", "010", "010"],
  "8": ["111", "101", "111", "101", "111"],
  "9": ["111", "101", "111", "001", "111"],
  "g": ["111", "100", "101", "101", "111"],
  "?": ["111", "001", "011", "000", "010"],
  "-": ["000", "000", "111", "000", "000"],
}

export const drawLabel = (
  rgba: Uint8Array,
  w: number,
  h: number,
  cx: number,
  cy: number,
  text: string,
  fg: readonly [number, number, number] = [0, 0, 0],
  bg: readonly [number, number, number] = [255, 255, 255],
  scale = 2,
): void => {
  const charW = 4 * scale
  const tw = text.length * charW - scale
  const th = 5 * scale
  const pad = Math.max(2, scale)
  const x0 = Math.max(pad, Math.min(w - tw - pad - 1, Math.round(cx - tw / 2)))
  const y0 = Math.max(pad, Math.min(h - th - pad - 1, Math.round(cy - th / 2)))
  // Pill background (semi-opaque blend)
  for (let y = Math.max(0, y0 - pad); y <= Math.min(h - 1, y0 + th + pad - 1); y++) {
    for (let x = Math.max(0, x0 - pad); x <= Math.min(w - 1, x0 + tw + pad - 1); x++) {
      const i = (y * w + x) * 4
      rgba[i] = Math.round(rgba[i]! * 0.15 + bg[0] * 0.85)
      rgba[i + 1] = Math.round(rgba[i + 1]! * 0.15 + bg[1] * 0.85)
      rgba[i + 2] = Math.round(rgba[i + 2]! * 0.15 + bg[2] * 0.85)
    }
  }
  for (let c = 0; c < text.length; c++) {
    const g = FONT[text[c]!] ?? FONT["?"]!
    const gx = x0 + c * charW
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 3; col++) {
        if (g[row]![col] !== "1") continue
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const px = gx + col * scale + sx
            const py = y0 + row * scale + sy
            if (px >= 0 && px < w && py >= 0 && py < h) {
              const i = (py * w + px) * 4
              rgba[i] = fg[0]; rgba[i + 1] = fg[1]; rgba[i + 2] = fg[2]; rgba[i + 3] = 255
            }
          }
        }
      }
    }
  }
}

const pastel = (id: number): readonly [number, number, number] => {
  const a = id * 137.508
  return [
    Math.round(188 + 56 * Math.cos((a * Math.PI) / 180)),
    Math.round(188 + 56 * Math.cos(((a + 120) * Math.PI) / 180)),
    Math.round(188 + 56 * Math.cos(((a + 240) * Math.PI) / 180)),
  ]
}

export type CropBox = { x: number; y: number; w: number; h: number; zoom: number }

/** Render a numbered facet sheet (either whole image or zoomed crop). */
export const renderFacetSheet = (
  fm: FacetMap,
  inkField: InkField,
  opts: { crop?: CropBox; minLabelArea?: number; highlightUnnamed?: Uint16Array; wallMask?: Uint8Array } = {},
): { w: number; h: number; rgba: Uint8Array } => {
  const crop = opts.crop ?? { x: 0, y: 0, w: fm.w, h: fm.h, zoom: 1 }
  const outW = Math.round(crop.w * crop.zoom)
  const outH = Math.round(crop.h * crop.zoom)
  const rgba = new Uint8Array(outW * outH * 4)
  const minArea = opts.minLabelArea ?? (crop.zoom >= 2 ? 12 : 45)

  for (let oy = 0; oy < outH; oy++) {
    const sy = Math.min(fm.h - 1, Math.max(0, crop.y + Math.floor(oy / crop.zoom)))
    for (let ox = 0; ox < outW; ox++) {
      const sx = Math.min(fm.w - 1, Math.max(0, crop.x + Math.floor(ox / crop.zoom)))
      const si = sy * fm.w + sx
      const oi = (oy * outW + ox) * 4
      if (opts.wallMask && opts.wallMask[si]) {
        rgba[oi] = 0; rgba[oi + 1] = 195; rgba[oi + 2] = 255; rgba[oi + 3] = 255
        continue
      }
      const f = fm.seg[si]!
      const iv = inkField.ink[si]!
      let col: readonly [number, number, number] = [255, 255, 255]
      if (f) {
        if (opts.highlightUnnamed) {
          col = opts.highlightUnnamed[f] ? [210, 235, 210] : [255, 110, 110]
        } else {
          col = pastel(f)
        }
      }
      const dark = 1 - Math.min(1, iv * 1.15)
      rgba[oi] = Math.round(col[0] * dark)
      rgba[oi + 1] = Math.round(col[1] * dark)
      rgba[oi + 2] = Math.round(col[2] * dark)
      rgba[oi + 3] = 255
    }
  }

  // Draw facet IDs at poles of inaccessibility (largest first, avoid overlapping boxes)
  const placed: Array<[number, number, number, number]> = []
  const scale = crop.zoom >= 2 ? 2 : 1
  const sorted = fm.facets.slice(1).filter((f) => f.area >= minArea).sort((a, b) => b.area - a.area)
  for (const f of sorted) {
    const lx = (f.deepX - crop.x) * crop.zoom
    const ly = (f.deepY - crop.y) * crop.zoom
    if (lx < 4 || ly < 4 || lx >= outW - 4 || ly >= outH - 4) continue
    const text = String(f.id)
    const bw = text.length * 4 * scale + 6, bh = 5 * scale + 6
    const overlaps = placed.some(([px, py, pw, ph]) => Math.abs(px - lx) < (pw + bw) * 0.45 && Math.abs(py - ly) < (ph + bh) * 0.45)
    if (overlaps && f.area < 400) continue
    placed.push([lx, ly, bw, bh])
    const isUnnamed = opts.highlightUnnamed && !opts.highlightUnnamed[f.id]
    drawLabel(rgba, outW, outH, lx, ly, text, isUnnamed ? [200, 0, 0] : [10, 10, 10], [255, 255, 255], scale)
  }

  return { w: outW, h: outH, rgba }
}

/** Render detected gap candidates as bright dashed segments with `g<id>` labels on top of line art. */
export const renderGapSheet = (inkField: InkField, gaps: ReadonlyArray<GapCandidate>): Uint8Array => {
  const { w, h, rgba } = inkField
  const out = rgba.slice()
  // Soften original line art slightly so colored gap lines pop
  for (let i = 0; i < w * h; i++) {
    out[i * 4] = Math.round(out[i * 4]! * 0.7 + 76)
    out[i * 4 + 1] = Math.round(out[i * 4 + 1]! * 0.7 + 76)
    out[i * 4 + 2] = Math.round(out[i * 4 + 2]! * 0.7 + 76)
    out[i * 4 + 3] = 255
  }
  for (const g of gaps) {
    const col: readonly [number, number, number] = g.kind === "pair" ? [230, 30, 80] : [20, 120, 240]
    const steps = Math.max(4, Math.ceil(g.length * 2))
    for (let s = 0; s <= steps; s++) {
      const t = s / steps
      const x = Math.round(g.x1 + (g.x2 - g.x1) * t)
      const y = Math.round(g.y1 + (g.y2 - g.y1) * t)
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const px = x + dx, py = y + dy
          if (px >= 0 && px < w && py >= 0 && py < h) out.set([col[0], col[1], col[2], 255], (py * w + px) * 4)
        }
      }
    }
    drawLabel(out, w, h, (g.x1 + g.x2) * 0.5, (g.y1 + g.y2) * 0.5 - 8, `g${g.id}`, col, [255, 255, 255], 1)
  }
  return out
}

/** Nearest-neighbor integer zoom crop of any RGBA image (for crisp 400% pixel inspection!). */
export const zoomCropRgba = (rgba: Uint8Array, w: number, h: number, crop: CropBox): { w: number; h: number; rgba: Uint8Array } => {
  const outW = Math.round(crop.w * crop.zoom)
  const outH = Math.round(crop.h * crop.zoom)
  const out = new Uint8Array(outW * outH * 4)
  for (let oy = 0; oy < outH; oy++) {
    const sy = Math.min(h - 1, Math.max(0, crop.y + Math.floor(oy / crop.zoom)))
    for (let ox = 0; ox < outW; ox++) {
      const sx = Math.min(w - 1, Math.max(0, crop.x + Math.floor(ox / crop.zoom)))
      const s = (sy * w + sx) * 4
      const d = (oy * outW + ox) * 4
      out[d] = rgba[s]!; out[d + 1] = rgba[s + 1]!; out[d + 2] = rgba[s + 2]!; out[d + 3] = rgba[s + 3]!
    }
  }
  return { w: outW, h: outH, rgba: out }
}
