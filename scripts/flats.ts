/**
 * Standalone precision flat-colours CLI (pure Node.js, native 1:1 resolution, zero browser needed).
 *
 * Commands:
 *   node scripts/flats.ts analyze <lineart.png> <outdir> [--spec spec.txt] [--crop name:x,y,w,h:zoom ...]
 *   node scripts/flats.ts build <lineart.png> <spec.txt> <outdir> [--name out] [--template existing.clip] [--no-lineart] [--crop name:x,y,w,h:zoom ...]
 *   node scripts/flats.ts diff <before.clip> <after.clip> <outdir> [--lineart lineart.png] [--spec spec.txt]
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { basename, extname, join } from "node:path"
import { decodePng, encodePng } from "../src/layers/png.ts"
import { compare, composite } from "../src/layers/stack.ts"
import { psd } from "../src/layers/psd.ts"
import { clip } from "../src/layers/clip.ts"
import { compositeClip, readClip } from "../src/layers/clipread.ts"
import { analyzeInk } from "../src/flatting/ink.ts"
import { detectGaps } from "../src/flatting/gaps.ts"
import { assignAndGrow, segmentFacets } from "../src/flatting/segment.ts"
import { buildFlatStack, buildWallMask, parseSpec, resolveFacetLabels, sealBottlenecks } from "../src/flatting/spec.ts"
import { auditFlats, renderAuditOverlay, renderNeonNoLines, renderSilhouetteCheck } from "../src/flatting/audit.ts"
import { diffClips } from "../src/flatting/diff.ts"
import { findReviewCandidates, renderReviewSheet } from "../src/flatting/review.ts"
import { renderFacetSheet, renderGapSheet, zoomCropRgba } from "../src/flatting/sheet.ts"
import type { CropBox } from "../src/flatting/sheet.ts"

const args = process.argv.slice(2)
const cmd = args[0]
const flag = (f: string): string | undefined => { const i = args.indexOf(f); return i < 0 ? undefined : args[i + 1] }
const flagsAll = (f: string): Array<string> => {
  const out: Array<string> = []
  for (let i = 0; i < args.length; i++) if (args[i] === f && args[i + 1]) out.push(args[i + 1]!)
  return out
}
const parseCrops = (): Array<{ name: string; box: CropBox }> =>
  flagsAll("--crop").map((s) => {
    const [name, rect, z] = s.split(":")
    const [x, y, w, h] = rect!.split(",").map(Number) as [number, number, number, number]
    return { name: name!, box: { x, y, w, h, zoom: Number(z ?? 2) } }
  })

if (cmd !== "analyze" && cmd !== "build" && cmd !== "diff") {
  console.log("Usage:")
  console.log("  node scripts/flats.ts analyze <lineart.png> <outdir> [--spec spec.txt] [--crop name:x,y,w,h:zoom ...]")
  console.log("  node scripts/flats.ts build <lineart.png> <spec.txt> <outdir> [--name out] [--template file.clip] [--no-lineart] [--crop ...]")
  console.log("  node scripts/flats.ts diff <before.clip> <after.clip> <outdir> [--lineart lineart.png] [--spec spec.txt]")
  process.exit(1)
}

const t0 = Date.now()

if (cmd === "diff") {
  const [, beforePath, afterPath, outDir] = args
  if (!beforePath || !afterPath || !outDir) { console.error("Missing <before.clip>, <after.clip>, or <outdir>"); process.exit(1) }
  mkdirSync(outDir, { recursive: true })
  const lineartPath = flag("--lineart")
  const specPath = flag("--spec")
  let baseFm
  if (lineartPath) {
    const img = decodePng(readFileSync(lineartPath))
    const spec = specPath ? parseSpec(readFileSync(specPath, "utf8")) : null
    const inkField = analyzeInk(img.rgba, img.w, img.h, {
      coreCut: spec?.coreCut,
      ridgeCut: spec?.ridgeCut,
      cleanGreyFills: spec?.cleanGreyFills,
    })
    baseFm = segmentFacets(inkField, undefined, { maxNeckRadius: spec?.maxNeckRadius })
  }
  const rep = diffClips(readFileSync(beforePath), readFileSync(afterPath), baseFm)
  if (rep.sheet) writeFileSync(join(outDir, "diff-sheet.png"), encodePng(rep.sheet.rgba, rep.sheet.w, rep.sheet.h))
  writeFileSync(join(outDir, "diff-after-preview.png"), encodePng(rep.afterPreview, rep.w, rep.h))
  writeFileSync(join(outDir, "diff.json"), JSON.stringify({
    w: rep.w, h: rep.h, totalChangedPx: rep.totalChangedPx,
    layerDeltas: rep.layerDeltas, transitions: rep.transitions,
    clusters: rep.clusters, facetDiffs: rep.facetDiffs,
  }, null, 2))
  console.log(`Diffed ${beforePath} -> ${afterPath} (${rep.w}x${rep.h}) in ${Date.now() - t0} ms`)
  console.log(`  Total changed pixels: ${rep.totalChangedPx}`)
  for (const d of rep.layerDeltas) {
    if (d.status !== "unchanged") console.log(`  layer [${d.status}] "${d.name}" ${d.hex}: +${d.addedPx} / -${d.removedPx} px`)
  }
  console.log(`  Transitions:`)
  for (const t of rep.transitions.slice(0, 15)) console.log(`    ${String(t.px).padStart(7)} px: ${t.from} -> ${t.to}`)
  if (rep.facetDiffs.length) {
    console.log(`  Changed base facets (${rep.facetDiffs.length}):`)
    const byTarget = new Map<string, Array<number>>()
    for (const f of rep.facetDiffs) {
      console.log(`    #${String(f.baseId).padStart(4)} (${String(f.pct).padStart(3)}%, ${String(f.area).padStart(5)}px) @${f.deep[0]},${f.deep[1]}  ${f.from} -> ${f.to}`)
      const list = byTarget.get(f.to) ?? []
      list.push(f.baseId)
      byTarget.set(f.to, list)
    }
    console.log(`  Suggested spec groupings:`)
    for (const [to, ids] of byTarget) console.log(`    -> ${to}: ${ids.join(" ")}`)
  }
  console.log(`  Wrote: ${join(outDir, "diff.json")}${rep.sheet ? `, ${join(outDir, "diff-sheet.png")}` : ""}`)
  process.exit(0)
}

if (cmd === "analyze") {
  const [, src, outDir] = args
  if (!src || !outDir) { console.error("Missing <lineart.png> or <outdir>"); process.exit(1) }
  mkdirSync(outDir, { recursive: true })
  const img = decodePng(readFileSync(src))
  const specPath = flag("--spec")
  const spec = specPath ? parseSpec(readFileSync(specPath, "utf8")) : null

  const inkField = analyzeInk(img.rgba, img.w, img.h, {
    coreCut: spec?.coreCut,
    ridgeCut: spec?.ridgeCut,
    cleanGreyFills: spec?.cleanGreyFills,
  })
  const { gaps } = detectGaps(inkField.barrier, img.w, img.h)
  const wallMask = spec ? buildWallMask(spec, gaps, img.w, img.h) : new Uint8Array(img.w * img.h)
  const hasWalls = wallMask.some((v) => v !== 0)
  const baseFm = segmentFacets(inkField, undefined, { maxNeckRadius: spec?.maxNeckRadius })
  const fm = hasWalls ? segmentFacets(inkField, wallMask, { maxNeckRadius: spec?.maxNeckRadius }) : baseFm

  const resolved = spec ? resolveFacetLabels(spec, fm, baseFm) : null
  const sheet = renderFacetSheet(fm, inkField, {
    highlightUnnamed: resolved?.facetLabel,
    wallMask,
    minLabelArea: 30,
  })
  writeFileSync(join(outDir, "facets.png"), encodePng(sheet.rgba, sheet.w, sheet.h))
  writeFileSync(join(outDir, "gaps.png"), encodePng(renderGapSheet(inkField, gaps), img.w, img.h))

  for (const c of parseCrops()) {
    const cs = renderFacetSheet(fm, inkField, {
      crop: c.box,
      highlightUnnamed: resolved?.facetLabel,
      wallMask,
      minLabelArea: 8,
    })
    writeFileSync(join(outDir, `crop-${c.name}.png`), encodePng(cs.rgba, cs.w, cs.h))
  }

  const summary = {
    source: src,
    w: img.w,
    h: img.h,
    paperWhite: inkField.paperWhite,
    medianStrokeWidth: inkField.medianStrokeWidth,
    totalFacets: fm.n,
    facetsOver20px: fm.facets.slice(1).filter((f) => f.area >= 20).length,
    gapCandidates: gaps.length,
    gaps,
    facets: fm.facets.slice(1).map((f) => ({
      id: f.id,
      area: f.area,
      deep: [f.deepX, f.deepY],
      maxDist: Math.round(f.maxDist * 10) / 10,
      bbox: f.bbox,
      borderMask: f.borderMask,
      paperNeighbors: f.paperNeighbors,
    })),
  }
  writeFileSync(join(outDir, "facets.json"), JSON.stringify(summary, null, 2))
  console.log(`Analyzed ${src} (${img.w}x${img.h}) in ${Date.now() - t0} ms:`)
  console.log(`  paperWhite=${inkField.paperWhite}, medianStroke=${inkField.medianStrokeWidth}px`)
  console.log(`  facets=${fm.n} (${summary.facetsOver20px} >= 20px), gapCandidates=${gaps.length}`)
  if (resolved) {
    const unnamedBig = fm.facets.slice(1).filter((f) => !resolved.facetLabel[f.id] && f.area > (spec?.autoAbsorbMaxArea ?? 28))
    console.log(`  spec warnings=${resolved.warnings.length}, unnamed facets (>${spec?.autoAbsorbMaxArea ?? 28}px)=${unnamedBig.length}`)
    for (const w of resolved.warnings) console.log(`  WARN: ${w}`)
    for (const f of unnamedBig.slice(0, 30)) console.log(`  UNNAMED #${f.id}: area=${f.area}px at (${f.deepX},${f.deepY}) bbox=[${f.bbox.join(",")}]`)
  }
  console.log(`  wrote ${join(outDir, "facets.png")}, gaps.png, facets.json`)
  process.exit(0)
}

// ---------- build mode ----------
const [, src, specPath, outDir] = args
if (!src || !specPath || !outDir) { console.error("Missing <lineart.png>, <spec.txt>, or <outdir>"); process.exit(1) }
const outName = flag("--name") ?? basename(src, extname(src))
const templatePath = flag("--template") ?? new URL("../src/layers/template/emptyimage.clip", import.meta.url).pathname
const includeLineArt = !args.includes("--no-lineart")
const allowBarePaper = args.includes("--allow-bare-paper")

rmSync(join(outDir, "png"), { recursive: true, force: true })
mkdirSync(join(outDir, "png"), { recursive: true })

const img = decodePng(readFileSync(src))
const spec = parseSpec(readFileSync(specPath, "utf8"))

const inkField = analyzeInk(img.rgba, img.w, img.h, {
  coreCut: spec.coreCut,
  ridgeCut: spec.ridgeCut,
  cleanGreyFills: spec.cleanGreyFills,
})
const { gaps } = detectGaps(inkField.barrier, img.w, img.h)
const wallMask = buildWallMask(spec, gaps, img.w, img.h)
const hasWalls = wallMask.some((v) => v !== 0)
const baseFm = segmentFacets(inkField, undefined, { maxNeckRadius: spec.maxNeckRadius })
const fm = hasWalls ? segmentFacets(inkField, wallMask, { maxNeckRadius: spec.maxNeckRadius }) : baseFm
const { facetLabel, assignedByBox, warnings } = resolveFacetLabels(spec, fm, baseFm)
if (spec.sealNecks && spec.sealNecks > 0) sealBottlenecks(fm, facetLabel, wallMask, spec.sealNecks)
const grown = assignAndGrow(fm, inkField, facetLabel, spec.autoAbsorbMaxArea ?? 28)

const { stack, baseGreyRgba, colorLayers } = buildFlatStack(grown.labels, inkField, spec.colors, {
  includeLineArt,
  includePaper: true,
})

const audit = auditFlats(grown.labels, inkField, wallMask, colorLayers, baseGreyRgba, {
  allowBarePaperEdges: allowBarePaper,
})

// Composite & export PSD + .clip + diagnostic PNGs
const flatRgb = composite(stack, true)
const flatRgba = new Uint8Array(img.w * img.h * 4)
for (let i = 0; i < img.w * img.h; i++) {
  flatRgba[i * 4] = flatRgb[i * 3]!
  flatRgba[i * 4 + 1] = flatRgb[i * 3 + 1]!
  flatRgba[i * 4 + 2] = flatRgb[i * 3 + 2]!
  flatRgba[i * 4 + 3] = 255
}

const silRgba = renderSilhouetteCheck(baseGreyRgba, inkField)
writeFileSync(join(outDir, "preview.png"), encodePng(flatRgba, img.w, img.h))
writeFileSync(join(outDir, "silhouette.png"), encodePng(silRgba, img.w, img.h))
writeFileSync(join(outDir, "neon-check.png"), encodePng(renderNeonNoLines(grown.labels, img.w, img.h), img.w, img.h))
writeFileSync(join(outDir, "audit-overlay.png"), encodePng(renderAuditOverlay(inkField, wallMask, audit), img.w, img.h))

// Automatic high-risk review contact sheets (enclosed bg holes, silhouette air loops,
// multi-colour/box-boundary suspect slivers, uncoloured closed loops, and bare-paper leaks!)
const review = findReviewCandidates(fm, baseFm, grown.labels, facetLabel, audit, assignedByBox)
const writeSheet = (fname: string, list: Parameters<typeof renderReviewSheet>[0]): void => {
  const sh = renderReviewSheet(list, inkField, flatRgba, silRgba, 48)
  if (sh) writeFileSync(join(outDir, fname), encodePng(sh.rgba, sh.w, sh.h))
}
writeSheet("review-bg-holes.png", review.bgHoles)
writeSheet("review-silhouette-pockets.png", review.silhouettePockets)
writeSheet("review-suspect-holes.png", review.suspectHoles)
writeSheet("review-same-color-loops.png", review.sameColorLoops)
writeSheet("review-leaks.png", review.leakSpots)

// Export individual layer PNGs
const safe = (s: string): string => s.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase()
writeFileSync(join(outDir, "png", "00-base-50-grey.png"), encodePng(baseGreyRgba, img.w, img.h))
colorLayers.forEach((cl, i) => {
  writeFileSync(join(outDir, "png", `${String(i + 1).padStart(2, "0")}-${safe(cl.name)}.png`), encodePng(cl.rgba, img.w, img.h))
})

// Write PSD and .clip
const psdBuf = psd(stack, flatRgb)
writeFileSync(join(outDir, `${outName}.psd`), psdBuf)
const clipBuf = clip(readFileSync(templatePath), stack, flatRgba)
writeFileSync(join(outDir, `${outName}.clip`), clipBuf)

// Round-trip verify .clip file with readClip + compositeClip!
const readBack = readClip(clipBuf)
const clipComp = compositeClip(readBack)
const clipRgb = new Uint8ClampedArray(img.w * img.h * 3)
for (let i = 0; i < img.w * img.h; i++) {
  const a = clipComp[i * 4 + 3]! / 255
  for (let c = 0; c < 3; c++) clipRgb[i * 3 + c] = Math.round(clipComp[i * 4 + c]! * a + 255 * (1 - a))
}
const rtDiff = compare(clipRgb, flatRgb)

// Optional zoomed 400% edge inspection crops
for (const c of parseCrops()) {
  const pz = zoomCropRgba(flatRgba, img.w, img.h, c.box)
  const sz = zoomCropRgba(renderSilhouetteCheck(baseGreyRgba, inkField), img.w, img.h, c.box)
  const nz = zoomCropRgba(renderNeonNoLines(grown.labels, img.w, img.h), img.w, img.h, c.box)
  writeFileSync(join(outDir, `zoom-${c.name}-preview.png`), encodePng(pz.rgba, pz.w, pz.h))
  writeFileSync(join(outDir, `zoom-${c.name}-silhouette.png`), encodePng(sz.rgba, sz.w, sz.h))
  writeFileSync(join(outDir, `zoom-${c.name}-neon.png`), encodePng(nz.rgba, nz.w, nz.h))
}

// Report
console.log(`Built flats for ${src} (${img.w}x${img.h}) in ${Date.now() - t0} ms`)
console.log(`  Layers: Base 50% Grey (${audit.figurePx} px, ${(100 * audit.figurePx / (img.w * img.h)).toFixed(2)}%) + clipped [Flats] (${colorLayers.length} colour layers)${includeLineArt ? " + Line art (multiply)" : ""}`)
for (const cl of colorLayers) console.log(`    - ${cl.name}: ${cl.pixels} px`)
console.log(`  Absorbed tiny trapped pockets: ${grown.absorbedPockets}`)
for (const w of warnings) console.log(`  SPEC WARN: ${w}`)
if (grown.unnamedFacets.length) {
  console.log(`  UNNAMED FACETS (${grown.unnamedFacets.length}):`)
  for (const id of grown.unnamedFacets.slice(0, 25)) {
    const f = fm.facets[id]!
    console.log(`    #${id}: area=${f.area}px at (${f.deepX},${f.deepY}) bbox=[${f.bbox.join(",")}]`)
  }
}
console.log(`  --- QUALITY GATE ---`)
console.log(`  1. Unnamed pixels:              ${audit.unnamedPx}`)
console.log(`  2. Inner white-halo pixels:     ${audit.innerHaloPx}`)
console.log(`  3. Outer colour-bleed pixels:   ${audit.outerBleedPx}`)
console.log(`  4. Base coverage mismatch:      uncovered=${audit.uncoveredBasePx}, outside=${audit.outsideBasePx}`)
console.log(`  5. Colour layer overlaps:       ${audit.layerOverlapPx}`)
console.log(`  6. Unwalled bare-paper edges:   ${audit.unwalledBarePaperEdges} (${audit.leaks.length} spot(s))`)
for (const lk of audit.leaks.slice(0, 15)) console.log(`       leak at (${lk.x},${lk.y}) ${lk.px}px between labels ${lk.a} & ${lk.b}`)
console.log(`  7. Tiny colour islands (<12px): ${audit.tinyIslands.length}`)
for (const is of audit.tinyIslands.slice(0, 10)) console.log(`       island label=${is.label} at (${is.x},${is.y}) area=${is.area}px`)
console.log(`  8. .clip round-trip check:      ${readBack.problems.length} rule problems, max diff=${rtDiff.max}, mean=${rtDiff.mean.toFixed(4)}`)
console.log(`  --- AUTO-REVIEW SHEETS ---`)
console.log(`  - review-bg-holes.png:           ${review.bgHoles.length} enclosed white space(s)`)
console.log(`  - review-silhouette-pockets.png: ${review.silhouettePockets.length} silhouette/hair-loop pocket(s) touching bg`)
console.log(`  - review-suspect-holes.png:      ${review.suspectHoles.length} multi-border/box-boundary/orphan sliver(s)`)
console.log(`  - review-same-color-loops.png:   ${review.sameColorLoops.length} closed compact loop(s) sharing parent colour`)
console.log(`  - review-leaks.png:              ${review.leakSpots.length} unwalled bare-paper boundary spot(s)`)
for (const p of readBack.problems) console.log(`       CLIP PROBLEM: ${p}`)
console.log(`  Wrote: ${join(outDir, `${outName}.clip`)}, ${join(outDir, `${outName}.psd`)}, preview.png, silhouette.png, neon-check.png, audit-overlay.png`)

const fullPass = audit.pass && readBack.problems.length === 0 && rtDiff.max <= 1
console.log(`  RESULT: ${fullPass ? "PASS (100% CLEAN)" : "FAIL"}`)
writeFileSync(join(outDir, "audit.json"), JSON.stringify({ audit, warnings, unnamedFacets: grown.unnamedFacets, clipProblems: readBack.problems, rtDiff, fullPass }, null, 2))
process.exit(fullPass ? 0 : 1)
