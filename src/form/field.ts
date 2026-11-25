/**
 * What the blockout says about every pixel of the drawing: which way the surface faces, how deep it lies, whether something stands between
 * it and the light (and how far away that is), and how enclosed it is. The drawing decides which form a pixel belongs to; where the mesh
 * shows another one there, the nearest pixel of the right form speaks.
 */
import { softNormals, tracer } from "./rays.ts"
import { raster } from "./raster.ts"
import type { Part, V3 } from "./mesh.ts"

export type Field = { w: number; h: number; n: Float32Array; z: Float32Array; hit: Float32Array; shut: Float32Array; sky: Float32Array; has: Uint8Array }
const calm = (a: Float32Array, has: Uint8Array, gid: Int16Array, w: number, h: number, r: number, c: number): Float32Array => {
  const o = new Float32Array(a.length)
  let src = a
  for (const [dx, dy] of [[1, 0], [0, 1], [1, 0], [0, 1]] as const) {
    const t = new Float32Array(a.length)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (!has[i]) continue; let m = 0; const s = [0, 0, 0]; for (let e = -r; e <= r; e++) { const X = x + dx * e, Y = y + dy * e; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; const j = Y * w + X; if (has[j] && gid[j] === gid[i]) { m++; for (let q = 0; q < c; q++) s[q]! += src[j * c + q]! } } for (let q = 0; q < c; q++) t[i * c + q] = s[q]! / m }
    src = t
  }
  o.set(src)
  return o
}
export const field = (parts: ReadonlyArray<Part>, q: { w: number; h: number; map: Uint8Array; names: ReadonlyArray<string> }, groupOf: ReadonlyMap<string, string>, light: V3, head: number): Field => {
  const { w, h, map, names } = q, N = w * h, B = raster(parts, w, h, (v) => v, parts.map((p) => softNormals(p))), trace = tracer(parts), groups = [...new Set(parts.map((p) => p.group))], gi = new Map(groups.map((g, i) => [g, i])), of = names.map((n) => gi.get(groupOf.get(n) ?? "") ?? (groupOf.get(n) === "*" ? -2 : -1)), bg = names.indexOf("bg")
  const n = new Float32Array(N * 3), z = new Float32Array(N), has = new Uint8Array(N), gid = new Int16Array(N).fill(-1), from = new Int32Array(N).fill(-1), queue: Array<number> = []
  for (let i = 0; i < N; i++) { if (map[i] === bg || !map[i]) continue; const g = B.part[i]! < 0 ? -1 : gi.get(parts[B.part[i]!]!.group)!, want = of[map[i]!]!; gid[i] = want === -2 ? g : want; if (g >= 0 && (want === g || want === -2)) { has[i] = 1; from[i] = i; queue.push(i) } }
  for (let t = 0; t < queue.length; t++) { const i = queue[t]!, x = i % w; for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) if (j >= 0 && j < N && from[j]! < 0 && gid[j]! >= 0 && gid[j] === gid[i]) { from[j] = from[i]!; has[j] = 1; queue.push(j) } }
  for (let i = 0; i < N; i++) if (has[i]) { const j = from[i]!; z[i] = B.z[j]!; for (let k = 0; k < 3; k++) n[i * 3 + k] = B.n[j * 3 + k]! }
  // small pieces stay sharp, the triangles do not show
  const s = calm(n, has, gid, w, h, Math.max(1, Math.round(head * 0.012)), 3)
  for (let i = 0; i < N; i++) if (has[i]) { const l = Math.hypot(s[i * 3]!, s[i * 3 + 1]!, s[i * 3 + 2]!) || 1; for (let k = 0; k < 3; k++) s[i * 3 + k] = s[i * 3 + k]! / l }
  const hit = new Float32Array(N), shut = new Float32Array(N), sky = new Float32Array(N), dirs: Array<V3> = Array.from({ length: 20 }, (_, i) => { const r = Math.sqrt((i + 0.5) / 20), a = i * 2.39996; return [r * Math.cos(a), r * Math.sin(a), Math.sqrt(1 - r * r)] as V3 }), from2: V3 = [-light[0], -light[1] * 0.4, light[2] * 0.2], l2 = Math.hypot(...from2), back: V3 = [from2[0] / l2, from2[1] / l2, from2[2] / l2]
  for (let i = 0; i < N; i++) {
    if (!has[i]) continue
    const j = from[i]!, N3: V3 = [B.n[j * 3]!, B.n[j * 3 + 1]!, B.n[j * 3 + 2]!], o: V3 = [(j % w) + 0.5 + N3[0] * 2.5, ((j / w) | 0) + 0.5 + N3[1] * 2.5, B.z[j]! + N3[2] * 2.5 + 0.5]
    if (N3[0] * light[0] + N3[1] * light[1] + N3[2] * light[2] > -0.15) hit[i] = Math.max(0, trace(o, light, 900))
    if (N3[0] * back[0] + N3[1] * back[1] + N3[2] * back[2] > 0.1 && trace(o, back, 260) < 0) sky[i] = 1
    if ((i % 2) + (((i / w) | 0) % 2) === 0) {
      const u: V3 = Math.abs(N3[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0], tx = u[1] * N3[2] - u[2] * N3[1], ty = u[2] * N3[0] - u[0] * N3[2], tz = u[0] * N3[1] - u[1] * N3[0], tl = Math.hypot(tx, ty, tz), T: V3 = [tx / tl, ty / tl, tz / tl], S: V3 = [N3[1] * T[2] - N3[2] * T[1], N3[2] * T[0] - N3[0] * T[2], N3[0] * T[1] - N3[1] * T[0]]
      let c = 0
      for (const d of dirs) { const t = trace(o, [T[0] * d[0] + S[0] * d[1] + N3[0] * d[2], T[1] * d[0] + S[1] * d[1] + N3[1] * d[2], T[2] * d[0] + S[2] * d[1] + N3[2] * d[2]], head * 0.35); if (t > 0) c += 1 - t / (head * 0.35) }
      shut[i] = c / dirs.length
    }
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if ((x % 2) + (y % 2)) { const i = y * w + x; if (has[i]) shut[i] = shut[(y - (y % 2)) * w + x - (x % 2)]! }
  return { w, h, n: s, z, hit, shut: calm(shut, has, gid, w, h, 2, 1), sky, has }
}
