/**
 * A layer stack as a drawing program sees it, and how it composites. Formulas are the ones measured for CLIP STUDIO PAINT
 * (wamsoft/clipparse, docs/CLIP_FORMAT.md §9: max error 0 or 1 against CSP's own preview); PSD readers agree for these modes.
 * Everything here runs without a browser.
 */
export type Mode = "normal" | "multiply" | "add" | "linearLight" | "overlay" | "screen"
/** Straight-alpha RGBA cut to a box on the canvas. `group` puts it in a pass-through folder of that name. */
export type Layer = { name: string; group: string; mode: Mode; opacity: number; visible: boolean; x: number; y: number; w: number; h: number; rgba: Uint8Array }
/** Bottom first, as in every format here. */
export type Stack = { w: number; h: number; layers: Array<Layer> }

const blend = (m: Mode, b: number, s: number): number => {
  switch (m) {
    case "normal": return s
    case "multiply": return (b * s) / 255
    case "add": return Math.min(255, b + s)
    case "screen": return b + s - (b * s) / 255
    case "linearLight": return Math.max(0, Math.min(255, b + 2 * s - 255))
    case "overlay": return b < 128 ? (2 * b * s) / 255 : 255 - (2 * (255 - b) * (255 - s)) / 255
  }
}
/**
 * Composites onto an opaque canvas (the bottom layer covers it, or white does). Folders are pass-through, so the order of
 * the layers is all there is. `bits8` rounds after every layer, as an 8-bit program would; otherwise it stays in floats.
 */
export const composite = (s: Stack, bits8 = true): Uint8ClampedArray => {
  const N = s.w * s.h, c = new Float32Array(N * 3).fill(255)
  for (const L of s.layers) {
    if (!L.visible) continue
    const op = Math.round(L.opacity * 256) / 256
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
      const p = (y * L.w + x) * 4, A = L.rgba[p + 3]!
      if (!A) continue
      const X = x + L.x, Y = y + L.y
      if (X < 0 || Y < 0 || X >= s.w || Y >= s.h) continue
      const q = (Y * s.w + X) * 3, a = (A / 255) * op
      for (let k = 0; k < 3; k++) { const b = c[q + k]!, v = b + (blend(L.mode, b, L.rgba[p + k]!) - b) * a; c[q + k] = bits8 ? Math.round(Math.max(0, Math.min(255, v))) : v }
    }
  }
  return Uint8ClampedArray.from(c)
}
/** How far two RGB images are apart: the largest step, the mean, and how many pixels differ by more than 2 and 8. */
export const compare = (a: ArrayLike<number>, b: ArrayLike<number>): { max: number; mean: number; over2: number; over8: number; n: number } => {
  let max = 0, sum = 0, over2 = 0, over8 = 0
  const n = a.length / 3
  for (let i = 0; i < n; i++) { let m = 0; for (let k = 0; k < 3; k++) { const d = Math.abs(a[i * 3 + k]! - b[i * 3 + k]!); sum += d; if (d > m) m = d } if (m > max) max = m; if (m > 2) over2++; if (m > 8) over8++ }
  return { max, mean: sum / (n * 3), over2, over8, n }
}
