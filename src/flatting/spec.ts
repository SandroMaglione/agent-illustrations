/**
 * Flatting specification parser & layer-stack builder.
 *
 * Spec file syntax (human- & agent-readable plain text):
 *   # comments
 *   coreCut 0.36
 *   ridgeCut 0.14
 *   maxNeckRadius 5.5
 *   autoClose 3               # optional: auto-close detected gaps <= N px
 *   close g3 g7               # accept specific detected gap IDs
 *   wall 412,530 420,538      # explicit virtual wall polyline (line-art px)
 *   bg: 1 2 45 @120,300 box:280,100,400,600:<=60
 *   color Skin #f7d9c8: 12 18 @500,320
 *   color Hair #4a3d52: 4 7 9 ...
 *
 * Selector tokens in `bg:` and `color <Name> <#Hex>:`:
 *   - `123`                        exact facet ID
 *   - `@x,y`                       facet containing pixel (x,y) (or nearest facet within 4 px)
 *   - `box:x0,y0,x1,y1`            all facets whose pole (deepX, deepY) lies inside box
 *   - `box:x0,y0,x1,y1:<=maxArea`  all facets inside box with area <= maxArea (ideal for sprocket holes / hatching!)
 *   - `box:x0,y0,x1,y1:>=minArea`  all facets inside box with area >= minArea
 *   - `unassigned`                 any remaining unassigned facet (use only when explicitly wanted)
 * Later rules override earlier rules when using `box:` / `unassigned`, while explicit IDs / `@x,y` warn on conflict.
 */
import type { Layer, Stack } from "../layers/stack.ts"
import type { GapCandidate } from "./gaps.ts"
import { drawLine, rasterizeWalls } from "./gaps.ts"
import type { InkField } from "./ink.ts"
import type { FacetMap } from "./segment.ts"
import { BG_LABEL } from "./segment.ts"

export type ColorDef = {
  name: string
  hex: string
  rgb: readonly [number, number, number]
  tokens: Array<string>
}

export type FlatSpec = {
  coreCut?: number
  ridgeCut?: number
  maxNeckRadius?: number
  autoAbsorbMaxArea?: number
  cleanGreyFills?: boolean
  autoCloseMaxPx?: number
  closeGaps: Array<number>
  walls: Array<string>
  bgTokens: Array<string>
  colors: Array<ColorDef>
}

export const parseHex = (hex: string): readonly [number, number, number] => {
  const h = hex.replace(/^#/, "")
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`Invalid hex colour: ${hex}`)
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

export const parseSpec = (text: string): FlatSpec => {
  const spec: FlatSpec = { closeGaps: [], walls: [], bgTokens: [], colors: [] }
  const colorByName = new Map<string, ColorDef>()
  for (const rawLine of text.split("\n")) {
    const line = rawLine.replace(/#(?![0-9a-fA-F]{6}\b).*$/, "").trim()
    if (!line) continue
    if (line.startsWith("coreCut ")) { spec.coreCut = Number(line.slice(8).trim()); continue }
    if (line.startsWith("ridgeCut ")) { spec.ridgeCut = Number(line.slice(9).trim()); continue }
    if (line.startsWith("maxNeckRadius ")) { spec.maxNeckRadius = Number(line.slice(14).trim()); continue }
    if (line.startsWith("autoAbsorbMaxArea ")) { spec.autoAbsorbMaxArea = Number(line.slice(18).trim()); continue }
    if (line.startsWith("cleanGreyFills ")) { spec.cleanGreyFills = line.slice(15).trim() === "true"; continue }
    if (line.startsWith("autoClose ")) { spec.autoCloseMaxPx = Number(line.slice(10).trim()); continue }
    if (line.startsWith("close ")) {
      for (const tok of line.slice(6).trim().split(/[\s,]+/).filter(Boolean)) {
        const id = Number(tok.replace(/^g/i, ""))
        if (Number.isFinite(id) && id > 0) spec.closeGaps.push(id)
      }
      continue
    }
    if (line.startsWith("wall ")) { spec.walls.push(line.slice(5).trim()); continue }
    if (line.startsWith("bg:")) {
      spec.bgTokens.push(...line.slice(3).trim().split(/[\s,]+/).filter(Boolean))
      continue
    }
    if (line.startsWith("color ")) {
      const m = line.match(/^color\s+(.+?)\s+(#[0-9a-fA-F]{6})\s*:\s*(.*)$/)
      if (!m) throw new Error(`Malformed color line: ${line}`)
      const name = m[1]!.trim(), hex = m[2]!.toLowerCase(), rest = m[3]!.trim()
      const tokens = rest ? rest.split(/\s+/).filter(Boolean) : []
      const existing = colorByName.get(name)
      if (existing) { existing.tokens.push(...tokens) }
      else {
        const def: ColorDef = { name, hex, rgb: parseHex(hex), tokens }
        colorByName.set(name, def)
        spec.colors.push(def)
      }
      continue
    }
    throw new Error(`Unknown directive in flat spec: ${line}`)
  }
  return spec
}

/** Rasterize accepted gap closures + explicit walls into one binary mask. */
export const buildWallMask = (spec: FlatSpec, gaps: ReadonlyArray<GapCandidate>, w: number, h: number): Uint8Array => {
  const mask = rasterizeWalls(spec.walls, w, h, 1)
  const accepted = new Set<number>(spec.closeGaps)
  if (spec.autoCloseMaxPx !== undefined) {
    for (const g of gaps) if (g.length <= spec.autoCloseMaxPx) accepted.add(g.id)
  }
  for (const g of gaps) {
    if (accepted.has(g.id)) drawLine(mask, w, h, g.x1, g.y1, g.x2, g.y2, 1)
  }
  return mask
}

/**
 * Resolve all selector tokens in the spec into a per-facet label array (1 = BG, 2..K = color index + 2).
 *
 * `baseFm` is the wall-free segmentation whose numbering never changes when walls/gaps are added:
 * numeric facet IDs (`123`) always resolve via `baseFm`'s pole of inaccessibility `(deepX, deepY)`
 * projected onto `fm`, so adding a wall NEVER renumbers a single facet ID!
 */
export const resolveFacetLabels = (
  spec: FlatSpec,
  fm: FacetMap,
  baseFm: FacetMap = fm,
): { facetLabel: Uint16Array; warnings: Array<string> } => {
  const { w, h, seg, facets, n } = fm
  const facetLabel = new Uint16Array(n + 1)
  const explicitOwner = new Map<number, string>()
  const warnings: Array<string> = []

  const nearFacet = (x: number, y: number): number => {
    const ix = Math.round(x), iy = Math.round(y)
    if (ix >= 0 && ix < w && iy >= 0 && iy < h && seg[iy * w + ix]) return seg[iy * w + ix]!
    let best = 0, bd = 1e9
    for (let dy = -5; dy <= 5; dy++) {
      for (let dx = -5; dx <= 5; dx++) {
        const nx = ix + dx, ny = iy + dy
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
        const f = seg[ny * w + nx]!
        const dd = dx * dx + dy * dy
        if (f && dd < bd) { bd = dd; best = f }
      }
    }
    return best
  }

  const applyTokens = (labelId: number, labelName: string, tokens: ReadonlyArray<string>): void => {
    for (const tok of tokens) {
      if (/^\d+$/.test(tok)) {
        const baseId = Number(tok)
        if (baseId < 1 || baseId > baseFm.n) { warnings.push(`${labelName}: facet ${baseId} does not exist (max ${baseFm.n})`); continue }
        const bf = baseFm.facets[baseId]!
        const id = baseFm === fm ? baseId : nearFacet(bf.deepX, bf.deepY)
        if (!id) { warnings.push(`${labelName}: base facet ${baseId} at (${bf.deepX},${bf.deepY}) collapsed under wall`); continue }
        if (explicitOwner.has(id) && explicitOwner.get(id) !== labelName) {
          warnings.push(`facet ${baseId} (resolved #${id}) assigned explicitly to both ${explicitOwner.get(id)} and ${labelName}`)
        }
        explicitOwner.set(id, labelName)
        facetLabel[id] = labelId
        continue
      }
      if (tok.startsWith("@")) {
        const [xs, ys] = tok.slice(1).split(",").map(Number)
        const id = nearFacet(xs!, ys!)
        if (!id) { warnings.push(`${labelName}: point ${tok} landed on ink with no nearby facet`); continue }
        if (explicitOwner.has(id) && explicitOwner.get(id) !== labelName) {
          warnings.push(`point ${tok} (facet ${id}) conflicts: ${explicitOwner.get(id)} vs ${labelName}`)
        }
        explicitOwner.set(id, labelName)
        facetLabel[id] = labelId
        continue
      }
      if (tok.startsWith("box:")) {
        const parts = tok.slice(4).split(":")
        const [x0, y0, x1, y1] = parts[0]!.split(",").map(Number) as [number, number, number, number]
        let minA = 0, maxA = Infinity
        for (const cond of parts.slice(1)) {
          if (cond.startsWith("<=")) maxA = Number(cond.slice(2))
          else if (cond.startsWith(">=")) minA = Number(cond.slice(2))
        }
        for (let id = 1; id <= n; id++) {
          const f = facets[id]!
          if (f.deepX >= x0 && f.deepX <= x1 && f.deepY >= y0 && f.deepY <= y1 && f.area >= minA && f.area <= maxA) {
            if (!explicitOwner.has(id)) facetLabel[id] = labelId
          }
        }
        continue
      }
      if (tok === "unassigned") {
        for (let id = 1; id <= n; id++) if (!facetLabel[id]) facetLabel[id] = labelId
        continue
      }
      warnings.push(`${labelName}: unrecognized token "${tok}"`)
    }
  }

  // Pass 1: apply box/area rules first, then explicit IDs/@points override cleanly
  const isBulk = (t: string): boolean => t.startsWith("box:") || t === "unassigned"
  applyTokens(BG_LABEL, "bg", spec.bgTokens.filter(isBulk))
  spec.colors.forEach((c, i) => applyTokens(i + 2, c.name, c.tokens.filter(isBulk)))
  applyTokens(BG_LABEL, "bg", spec.bgTokens.filter((t) => !isBulk(t)))
  spec.colors.forEach((c, i) => applyTokens(i + 2, c.name, c.tokens.filter((t) => !isBulk(t))))

  return { facetLabel, warnings }
}

/**
 * Build the exact requested layer stack:
 *   1. Paper (white canvas)
 *   2. Base 50% Grey — covers the entire figure silhouette in #808080 (excludes background & white spaces)
 *   3. Flats (Folder, clipped to Base 50% Grey below!)
 *        - One single raster layer per flat colour, colouring its exact area
 *   4. Line art (Multiply, bit-for-bit original B&W line art; optional when injecting into an existing .clip)
 */
export const buildFlatStack = (
  labels: Uint16Array,
  inkField: InkField,
  colors: ReadonlyArray<ColorDef>,
  opts: { includeLineArt?: boolean; includePaper?: boolean; baseName?: string; folderName?: string } = {},
): {
  stack: Stack
  baseGreyRgba: Uint8Array
  colorLayers: Array<{ name: string; labelId: number; rgba: Uint8Array; pixels: number }>
} => {
  const { w, h, rgba: lineRgba } = inkField
  const N = w * h
  const baseName = opts.baseName ?? "Base 50% Grey"
  const folderName = opts.folderName ?? "Flats"
  const includePaper = opts.includePaper ?? true
  const includeLineArt = opts.includeLineArt ?? true

  // 1. Base 50% Grey silhouette layer (RGB 128,128,128, alpha 255 on figure, 0 on background/white spaces)
  const baseGreyRgba = new Uint8Array(N * 4)
  for (let i = 0; i < N; i++) {
    if (labels[i]! > BG_LABEL) {
      baseGreyRgba[i * 4] = 128
      baseGreyRgba[i * 4 + 1] = 128
      baseGreyRgba[i * 4 + 2] = 128
      baseGreyRgba[i * 4 + 3] = 255
    }
  }

  // 2. One single layer per colour inside the clipped Flats folder
  const colorLayers: Array<{ name: string; labelId: number; rgba: Uint8Array; pixels: number }> = []
  for (let ci = 0; ci < colors.length; ci++) {
    const def = colors[ci]!
    const labelId = ci + 2
    const rgba = new Uint8Array(N * 4)
    let pixels = 0
    for (let i = 0; i < N; i++) {
      if (labels[i] === labelId) {
        rgba[i * 4] = def.rgb[0]
        rgba[i * 4 + 1] = def.rgb[1]
        rgba[i * 4 + 2] = def.rgb[2]
        rgba[i * 4 + 3] = 255
        pixels++
      }
    }
    if (pixels > 0) colorLayers.push({ name: def.name, labelId, rgba, pixels })
  }

  const layers: Array<Layer> = []
  if (includePaper) {
    layers.push({
      name: "Paper",
      group: "",
      mode: "normal",
      opacity: 1,
      visible: true,
      x: 0,
      y: 0,
      w,
      h,
      rgba: new Uint8Array(N * 4).fill(255),
    })
  }
  layers.push({
    name: baseName,
    group: "",
    mode: "normal",
    opacity: 1,
    visible: true,
    x: 0,
    y: 0,
    w,
    h,
    rgba: baseGreyRgba,
  })
  for (const cl of colorLayers) {
    layers.push({
      name: cl.name,
      group: folderName,
      mode: "normal",
      opacity: 1,
      visible: true,
      x: 0,
      y: 0,
      w,
      h,
      rgba: cl.rgba,
    })
  }
  if (includeLineArt) {
    layers.push({
      name: "Line art",
      group: "",
      mode: "multiply",
      opacity: 1,
      visible: true,
      x: 0,
      y: 0,
      w,
      h,
      rgba: lineRgba,
    })
  }

  const stack: Stack = {
    w,
    h,
    layers,
    sealed: [folderName],
    clipped: [folderName],
  }

  return { stack, baseGreyRgba, colorLayers }
}
