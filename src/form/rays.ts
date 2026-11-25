/** Rays against the blockout: what is in the way between a point and the light. */
import { cross, dot, sub } from "./mesh.ts"
import type { Part, V3 } from "./mesh.ts"

export type Tracer = (o: V3, d: V3, far: number) => number
/** Distance to the first surface in the way, or -1. */
export const tracer = (parts: ReadonlyArray<Part>): Tracer => {
  const T = parts.reduce((a, p) => a + p.mesh.f.length, 0), A = new Float32Array(T * 3), E = new Float32Array(T * 3), F = new Float32Array(T * 3), lo = new Float32Array(T * 3), hi = new Float32Array(T * 3), order = Int32Array.from({ length: T }, (_, i) => i)
  let t = 0
  for (const p of parts) for (const [a, b, c] of p.mesh.f) { const P = p.mesh.v[a]!, Q = p.mesh.v[b]!, R = p.mesh.v[c]!; for (let k = 0; k < 3; k++) { A[t * 3 + k] = P[k as 0]; E[t * 3 + k] = Q[k as 0] - P[k as 0]; F[t * 3 + k] = R[k as 0] - P[k as 0]; lo[t * 3 + k] = Math.min(P[k as 0], Q[k as 0], R[k as 0]); hi[t * 3 + k] = Math.max(P[k as 0], Q[k as 0], R[k as 0]) } t++ }
  type Node = { lo: [number, number, number]; hi: [number, number, number]; a?: Node; b?: Node; from: number; to: number }
  const build = (from: number, to: number): Node => {
    const n: Node = { lo: [1e9, 1e9, 1e9], hi: [-1e9, -1e9, -1e9], from, to }
    for (let i = from; i < to; i++) for (let k = 0; k < 3; k++) { n.lo[k] = Math.min(n.lo[k]!, lo[order[i]! * 3 + k]!); n.hi[k] = Math.max(n.hi[k]!, hi[order[i]! * 3 + k]!) }
    if (to - from <= 6) return n
    const s = [0, 1, 2].map((k) => n.hi[k]! - n.lo[k]!), ax = s.indexOf(Math.max(...s)), part = order.subarray(from, to).sort((p, q) => lo[p * 3 + ax]! + hi[p * 3 + ax]! - lo[q * 3 + ax]! - hi[q * 3 + ax]!)
    void part
    const mid = (from + to) >> 1
    n.a = build(from, mid); n.b = build(mid, to)
    return n
  }
  const root = build(0, T), stack: Array<Node> = []
  return (o, d, far) => {
    const ix = 1 / (d[0] || 1e-9), iy = 1 / (d[1] || 1e-9), iz = 1 / (d[2] || 1e-9)
    let best = far, hit = -1, top = 0
    stack[top++] = root
    while (top) {
      const n = stack[--top]!
      const x1 = (n.lo[0] - o[0]) * ix, x2 = (n.hi[0] - o[0]) * ix, y1 = (n.lo[1] - o[1]) * iy, y2 = (n.hi[1] - o[1]) * iy, z1 = (n.lo[2] - o[2]) * iz, z2 = (n.hi[2] - o[2]) * iz
      const a = Math.max(Math.min(x1, x2), Math.min(y1, y2), Math.min(z1, z2), 0), b = Math.min(Math.max(x1, x2), Math.max(y1, y2), Math.max(z1, z2), best)
      if (a > b) continue
      if (n.a) { stack[top++] = n.a; stack[top++] = n.b!; continue }
      for (let q = n.from; q < n.to; q++) {
        const i = order[q]! * 3, ex = E[i]!, ey = E[i + 1]!, ez = E[i + 2]!, fx = F[i]!, fy = F[i + 1]!, fz = F[i + 2]!
        const px = d[1] * fz - d[2] * fy, py = d[2] * fx - d[0] * fz, pz = d[0] * fy - d[1] * fx, det = ex * px + ey * py + ez * pz
        if (det > -1e-7 && det < 1e-7) continue
        const inv = 1 / det, tx = o[0] - A[i]!, ty = o[1] - A[i + 1]!, tz = o[2] - A[i + 2]!, u = (tx * px + ty * py + tz * pz) * inv
        if (u < 0 || u > 1) continue
        const qx = ty * ez - tz * ey, qy = tz * ex - tx * ez, qz = tx * ey - ty * ex, v = (d[0] * qx + d[1] * qy + d[2] * qz) * inv
        if (v < 0 || u + v > 1) continue
        const dist = (fx * qx + fy * qy + fz * qz) * inv
        if (dist > 0.01 && dist < best) { best = dist; hit = dist }
      }
    }
    return hit
  }
}
/** Vertex normals, averaged only over faces that bend little: a tube stays round and a box keeps its edges. Three per triangle. */
export const softNormals = (p: Part, crease = 50): Float32Array => {
  const { v, f } = p.mesh, at = new Map<string, Array<number>>(), key = (q: V3): string => `${Math.round(q[0] * 4)},${Math.round(q[1] * 4)},${Math.round(q[2] * 4)}`, raw = f.map(([a, b, c]) => cross(sub(v[b]!, v[a]!), sub(v[c]!, v[a]!))), keys = v.map(key), C = Math.cos((crease * Math.PI) / 180)
  f.forEach((t, i) => t.forEach((a) => { const l = at.get(keys[a]!); if (l) l.push(i); else at.set(keys[a]!, [i]) }))
  const len = raw.map((n) => Math.hypot(...n) || 1e-9), out = new Float32Array(f.length * 9)
  f.forEach((t, i) => t.forEach((a, k) => {
    let x = 0, y = 0, z = 0
    for (const j of at.get(keys[a]!)!) if (j === i || dot(raw[i]!, raw[j]!) / (len[i]! * len[j]!) > C) { x += raw[j]![0]; y += raw[j]![1]; z += raw[j]![2] }
    const l = Math.hypot(x, y, z) || 1
    out[i * 9 + k * 3] = x / l; out[i * 9 + k * 3 + 1] = y / l; out[i * 9 + k * 3 + 2] = z / l
  }))
  return out
}
