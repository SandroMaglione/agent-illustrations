/** An invented alphabet for the card: stencil blocks on a 10×9 cell, a gap of 1.2 between strokes. */
type Box = readonly [number, number, number, number]
type Cell = { r?: ReadonlyArray<Box>; p?: ReadonlyArray<string> }
const CELLS: Readonly<Record<string, Cell>> = {
  M: { r: [[0, 0, 4.4, 2.5], [5.6, 0, 4.4, 2.5], [0, 2.4, 2.5, 6.6], [3.75, 3.7, 2.5, 5.3], [7.5, 2.4, 2.5, 6.6]] },
  A: { p: ["0,9 0,4 4,0 10,0 10,9 7.5,9 7.5,2.5 5,2.5 2.5,5 2.5,9"], r: [[3.8, 5.6, 2.4, 3.4]] },
  R: { r: [[0, 0, 2.5, 9]], p: ["3.7,0 10,0 10,4.6 6.6,4.6 10,9 6.9,9 3.7,4.8"] },
  E: { r: [[0, 0, 10, 2.5], [0, 2.4, 2.5, 4.2], [3.7, 3.6, 2.7, 1.9], [7.5, 3.6, 2.5, 1.9], [0, 6.5, 10, 2.5]] },
  N: { r: [[0, 0, 2.5, 9], [3.7, 6.5, 2.5, 2.5]], p: ["3.7,0 10,0 10,9 7.5,9 7.5,2.5 3.7,2.5"] },
  L: { r: [[0, 0, 2.5, 9], [3.7, 6.5, 6.3, 2.5], [3.7, 0, 2.5, 2.5]] },
  O: { r: [[0, 0, 6.3, 2.5], [0, 2.4, 2.5, 6.6], [3.7, 6.5, 6.3, 2.5], [7.5, 0, 2.5, 6.6]] },
  W: { r: [[0, 0, 2.5, 5.3], [3.75, 0, 2.5, 6.6], [7.5, 0, 2.5, 5.3], [0, 6.5, 10, 2.5]] },
  T: { r: [[0, 0, 10, 2.5], [3.75, 3.7, 2.5, 5.3], [0, 6.5, 2.5, 2.5]] },
  I: { r: [[0, 0, 10, 2.5], [3.75, 2.4, 2.5, 3], [0, 6.5, 10, 2.5]] },
  D: { r: [[0, 0, 2.5, 9]], p: ["3.7,0 7,0 10,3 10,9 3.7,9 3.7,6.5 7.5,6.5 7.5,4 6,2.5 3.7,2.5"] },
}
/** Trace a word in the invented alphabet; returns its width. */
export const cipher = (g: CanvasRenderingContext2D, word: string, x: number, y: number, h: number, wide = 1, gap = 2): number => {
  const u = h / 9
  let at = x
  g.beginPath()
  for (const ch of word) {
    if (ch === " ") { at += 7 * u; continue }
    const c = CELLS[ch]!
    for (const [bx, by, bw, bh] of c.r ?? []) g.rect(at + bx * u * wide, y + by * u, bw * u * wide, bh * u)
    for (const p of c.p ?? []) p.split(" ").forEach((q, i) => { const [a, b] = q.split(",").map(Number); if (i) g.lineTo(at + a! * u * wide, y + b! * u); else g.moveTo(at + a! * u * wide, y + b! * u) })
    at += 10 * u * wide + gap * u
  }
  return at - x - gap * u
}
export const HEAVY = "Impact, Anton, 'Haettenschweiler', sans-serif"
/** Set type by the height of its capitals, not by its font size. */
export const caps = (g: CanvasRenderingContext2D, height: number, family = HEAVY, weight = "400"): void => {
  g.font = `${weight} 200px ${family}`
  g.font = `${weight} ${(200 * height) / g.measureText("H").actualBoundingBoxAscent}px ${family}`
}
