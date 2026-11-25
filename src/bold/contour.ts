/** Turn a soft-looking mask into the shape a hand would cut: few straight runs and corners. */
type Box = { x: number; y: number; w: number; h: number }
/** Boundaries of a mask as closed loops on pixel corners. */
const loops = (m: Uint8Array, w: number, h: number): Array<Array<readonly [number, number]>> => {
  const at = (x: number, y: number): number => (x < 0 || y < 0 || x >= w || y >= h ? 0 : m[y * w + x]!), out: Array<Array<readonly [number, number]>> = []
  // edges run with the mask on the right: start points of horizontal top edges
  const seen = new Uint8Array((w + 1) * (h + 1))
  for (let y = 0; y <= h; y++) for (let x = 0; x < w; x++) {
    if (!(at(x, y) && !at(x, y - 1)) || seen[y * (w + 1) + x]! & 1) continue
    const p: Array<readonly [number, number]> = []
    let X = x, Y = y, d = 0
    for (let n = 0; n < 400000; n++) {
      const q = Y * (w + 1) + X
      if (d === 0) { if (seen[q]! & 1) break; seen[q] = seen[q]! | 1 }
      p.push([X, Y])
      if (d === 0) X++; else if (d === 1) Y++; else if (d === 2) X--; else Y--
      // pixels ahead left and ahead right of the direction of travel
      const [l, r] = d === 0 ? [at(X, Y - 1), at(X, Y)] : d === 1 ? [at(X, Y), at(X - 1, Y)] : d === 2 ? [at(X - 1, Y), at(X - 1, Y - 1)] : [at(X - 1, Y - 1), at(X, Y - 1)]
      if (l && r) d = (d + 3) % 4; else if (!r) d = l ? (d + 1) % 4 : (d + 1) % 4
    }
    if (p.length > 3) out.push(p)
  }
  return out
}
const simplify = (p: ReadonlyArray<readonly [number, number]>, eps: number): Array<readonly [number, number]> => {
  if (p.length < 4) return [...p]
  const keep = new Uint8Array(p.length)
  let far = 0, fd = -1
  for (let i = 1; i < p.length; i++) { const d = (p[i]![0] - p[0]![0]) ** 2 + (p[i]![1] - p[0]![1]) ** 2; if (d > fd) { fd = d; far = i } }
  keep[0] = keep[far] = 1
  const st: Array<[number, number]> = [[0, far], [far, p.length]]
  while (st.length) {
    const [a, b] = st.pop()!, A = p[a]!, B = p[b % p.length]!, dx = B[0] - A[0], dy = B[1] - A[1], l = Math.hypot(dx, dy) || 1
    let m = -1, md = eps
    for (let i = a + 1; i < b; i++) { const d = Math.abs((p[i]![0] - A[0]) * dy - (p[i]![1] - A[1]) * dx) / l; if (d > md) { md = d; m = i } }
    if (m > 0) { keep[m] = 1; st.push([a, m], [m, b]) }
  }
  return p.filter((_, i) => keep[i])
}
let canvas: HTMLCanvasElement | null = null
/** `eps`: how far a hand may cut a corner. Islands under `least` px are dropped, holes too. */
export const blocky = (m: Uint8Array, b: Box, eps: number, least: number): Uint8Array => {
  canvas ??= document.createElement("canvas")
  if (canvas.width < b.w || canvas.height < b.h) { canvas.width = Math.max(canvas.width, b.w); canvas.height = Math.max(canvas.height, b.h) }
  const g = canvas.getContext("2d", { willReadFrequently: true })!
  g.clearRect(0, 0, b.w, b.h); g.beginPath()
  for (const l of loops(m, b.w, b.h)) {
    let area = 0
    for (let i = 0; i < l.length; i++) { const [x, y] = l[i]!, [u, v] = l[(i + 1) % l.length]!; area += x * v - u * y }
    if (Math.abs(area) / 2 < least) continue
    simplify(l, eps).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
    g.closePath()
  }
  g.fill("evenodd")
  const d = g.getImageData(0, 0, b.w, b.h).data, o = new Uint8Array(b.w * b.h)
  for (let i = 0; i < o.length; i++) o[i] = d[i * 4 + 3]! > 127 ? 1 : 0
  return o
}
