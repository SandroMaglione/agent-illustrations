/** Brushes shared by the skins: ribbons, inked lines, hatching, dots, grain. */
import { area, bounds, clamp, dist, hash, length, lerp, noise1, normals, resample, rng, smooth } from "./geo.ts"
import type { P2 } from "./geo.ts"
import type { Item, Role } from "./list.ts"

export type Ctx = CanvasRenderingContext2D
export const canvas = (w: number, h: number): HTMLCanvasElement => {
  const c = document.createElement("canvas")
  c.width = Math.max(1, Math.round(w))
  c.height = Math.max(1, Math.round(h))
  return c
}
export const ctxOf = (c: HTMLCanvasElement): Ctx => c.getContext("2d")!

export const trace = (ctx: Ctx, p: ReadonlyArray<P2>, close = true): void => {
  ctx.beginPath()
  p.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  if (close) ctx.closePath()
}
export const fill = (ctx: Ctx, p: ReadonlyArray<P2>, style: string | CanvasPattern | CanvasGradient): void => {
  trace(ctx, p)
  ctx.fillStyle = style
  ctx.fill()
}
export const within = (ctx: Ctx, clip: ReadonlyArray<P2> | undefined, f: () => void): void => {
  if (!clip) return f()
  ctx.save()
  trace(ctx, clip)
  ctx.clip()
  f()
  ctx.restore()
}

/** A filled variable-width stroke. */
export const ribbon = (ctx: Ctx, p: ReadonlyArray<P2>, w: (t: number, i: number) => number, style: string): void => {
  if (p.length < 2) return
  const ns = normals(p)
  const n = p.length - 1
  ctx.beginPath()
  p.forEach((q, i) => {
    const h = w(i / n, i) / 2
    const x = q[0] + ns[i]![0] * h
    const y = q[1] + ns[i]![1] * h
    if (i) ctx.lineTo(x, y)
    else ctx.moveTo(x, y)
  })
  for (let i = n; i >= 0; i--) {
    const h = w(i / n, i) / 2
    ctx.lineTo(p[i]![0] - ns[i]![0] * h, p[i]![1] - ns[i]![1] * h)
  }
  ctx.closePath()
  ctx.fillStyle = style
  ctx.fill()
}

export const ROLE_W: Readonly<Record<Role, number>> = { outline: 0.0222, inner: 0.0145, detail: 0.0095, fine: 0.0065 }

export type Seg = { pts: Array<P2>; id: string; side: -1 | 0 | 1; free: boolean }

/**
 * Nobody draws a contour in one go. Break closed contours where they turn
 * hardest, and let each stroke run a little long or stop a little short.
 */
export const segments = (it: Extract<Item, { k: "line" }>, S: number, o: { over?: number; split?: boolean } = {}): Array<Seg> => {
  const step = Math.max(1.2, S * 0.011)
  const side = it.side ?? 0
  if (!it.closed) return [{ pts: resample(it.pts, step), id: it.id, side, free: true }]
  const loop = resample([...it.pts, it.pts[0]!], step).slice(0, -1)
  const n = loop.length
  const r = rng(it.id)
  if (n < 8) return [{ pts: [...loop, loop[0]!], id: it.id, side, free: false }]
  const win = Math.max(2, Math.round(Math.min(0.06 * S / step, n / 10)))
  const turn = loop.map((p, i) => {
    const a = loop[(i - win + n) % n]!
    const b = loop[(i + win) % n]!
    const u = Math.atan2(p[1] - a[1], p[0] - a[0])
    const v = Math.atan2(b[1] - p[1], b[0] - p[0])
    return Math.abs(Math.atan2(Math.sin(v - u), Math.cos(v - u)))
  })
  const total = n * step
  const minGap = Math.max(win * 2, Math.round(n / (total > S * 1.4 ? 6 : 4)))
  const order = turn.map((t, i) => [t, i] as const).sort((a, b) => b[0] - a[0])
  const cuts: Array<number> = []
  const max = o.split === false ? 1 : total > S * 1.2 ? 5 : total > S * 0.5 ? 3 : 1
  for (const [t, i] of order) {
    if (cuts.length >= max || (cuts.length >= 2 && t < 0.4)) break
    if (cuts.every((c) => Math.min(Math.abs(c - i), n - Math.abs(c - i)) >= minGap)) cuts.push(i)
  }
  if (cuts.length === 0) cuts.push(Math.floor(r() * n))
  cuts.sort((a, b) => a - b)
  const over = (o.over ?? 1) * Math.round((0.05 * S) / step)
  return cuts.map((c, k) => {
    const next = cuts[(k + 1) % cuts.length]!
    const len = cuts.length === 1 ? n : (next - c + n) % n
    const a = Math.round((r() - 0.45) * over)
    const b = Math.round((r() - 0.35) * over)
    const pts: Array<P2> = []
    for (let i = -a; i <= len + b; i++) pts.push(loop[(((c + i) % n) + n) % n]!)
    return { pts, id: `${it.id}/${k}`, side, free: false }
  }).filter((s) => s.pts.length > 2)
}

/** Hand wobble: slow drift that belongs to the stroke, plus a little per-frame boil. */
export const wobble = (p: ReadonlyArray<P2>, id: string, amp: number, S: number, frame = 0, boil = 0.4): Array<P2> => {
  const a = noise1(`${id}a`)
  const b = noise1(`${id}b${frame}`)
  const ns = normals(p)
  let s = 0
  return p.map((q, i) => {
    if (i) s += dist(p[i - 1]!, q)
    const t = s / (0.22 * S)
    const d = (a(t) + a(t * 2.7 + 9) * 0.35 + b(t * 1.3) * boil) * amp * S
    return [q[0] + ns[i]![0] * d, q[1] + ns[i]![1] * d] as const
  })
}

/** Width along a stroke: pressure, tapered ends, heavier on the shade side (lower right). */
export const pressure = (p: ReadonlyArray<P2>, id: string, base: number, o: { side: -1 | 0 | 1; taperIn?: number; taperOut?: number; contrast?: number; jitter?: number }): ((t: number, i: number) => number) => {
  const ns = normals(p)
  const n = noise1(`${id}w`)
  const L = length(p)
  const c = o.contrast ?? 1
  const tin = Math.min(0.42, (o.taperIn ?? 6) * base / Math.max(1, L))
  const tout = Math.min(0.42, (o.taperOut ?? 8) * base / Math.max(1, L))
  return (t, i) => {
    const nn = ns[i]!
    const shade = o.side === 0 ? 0 : clamp((nn[0] * 0.56 + nn[1] * 0.83) * o.side, -1, 1)
    const k = o.side === 0 ? 1 : lerp(1, shade > 0 ? 1 + 0.75 * shade : 1 + 0.5 * shade, c)
    const taper = Math.min(lerp(0.22, 1, smooth(0, tin, t)), lerp(0.16, 1, smooth(0, tout, 1 - t)))
    return base * k * taper * (1 + (o.jitter ?? 0.28) * n((t * L) / (base * 11)))
  }
}

/** Scanline hatching: real strokes inside a polygon, with ragged ends. */
export const hatchSegs = (poly: ReadonlyArray<P2>, angle: number, gap: number, seed: string, o: { ragged?: number; jitter?: number } = {}): Array<Array<P2>> => {
  const r = rng(seed)
  const c = Math.cos(-angle)
  const s = Math.sin(-angle)
  const rot = poly.map(([x, y]) => [x * c - y * s, x * s + y * c] as P2)
  const b = bounds(rot)
  const out: Array<Array<P2>> = []
  const back = (x: number, y: number): P2 => [x * c + y * s, -x * s + y * c]
  for (let y = b.y0 + gap * r(); y < b.y1; y += gap * lerp(1, 0.4 + 1.2 * r(), o.jitter ?? 1)) {
    const xs: Array<number> = []
    for (let i = 0; i < rot.length; i++) {
      const p = rot[i]!
      const q = rot[(i + 1) % rot.length]!
      if (p[1] <= y !== q[1] <= y) xs.push(p[0] + ((y - p[1]) / (q[1] - p[1])) * (q[0] - p[0]))
    }
    xs.sort((m, n) => m - n)
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const len = xs[i + 1]! - xs[i]!
      if (len < gap * 0.9) continue
      const rag = Math.min((o.ragged ?? 0) * gap, len * 0.45)
      const x0 = xs[i]! + (r() - 0.4) * rag
      const x1 = xs[i + 1]! + (r() - 0.6) * rag
      const sag = (r() - 0.5) * gap * 0.35
      const tilt = (r() - 0.5) * gap * 0.5
      const n = Math.max(3, Math.round(len / (gap * 1.4)))
      out.push(Array.from({ length: n + 1 }, (_, k) => {
        const t = k / n
        return back(lerp(x0, x1, t), y + tilt * (t - 0.5) + sag * 4 * t * (1 - t))
      }))
    }
  }
  return out
}

/** Halftone: dots on a rotated grid, radius from a tone field in [0, 1]. */
export const halftone = (ctx: Ctx, poly: ReadonlyArray<P2>, gap: number, angle: number, tone: (x: number, y: number) => number, style: string): void => {
  const b = bounds(poly)
  const cx = (b.x0 + b.x1) / 2
  const cy = (b.y0 + b.y1) / 2
  const R = Math.hypot(b.x1 - b.x0, b.y1 - b.y0) / 2 + gap
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const n = Math.ceil(R / gap)
  // lock to a global grid so neighbouring areas line up
  const ox = Math.round((cx * c + cy * s) / gap) * gap
  const oy = Math.round((-cx * s + cy * c) / gap) * gap
  within(ctx, poly, () => {
    ctx.fillStyle = style
    ctx.beginPath()
    for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) {
      const u = ox + (i + (j & 1 ? 0.5 : 0)) * gap
      const v = oy + j * gap * 0.866
      const x = u * c - v * s
      const y = u * s + v * c
      const r = Math.sqrt(clamp(tone(x, y))) * gap * 0.62
      if (r > 0.25) {
        ctx.moveTo(x + r, y)
        ctx.arc(x, y, r, 0, Math.PI * 2)
      }
    }
    ctx.fill()
  })
}

/* ---------- textures ---------- */
const cache = new Map<string, HTMLCanvasElement>()
export const texture = (key: string, w: number, h: number, f: (x: number, y: number, r: () => number) => readonly [number, number, number, number]): HTMLCanvasElement => {
  const hit = cache.get(key)
  if (hit) return hit
  const c = canvas(w, h)
  const g = ctxOf(c)
  const img = g.createImageData(w, h)
  const r = rng(key)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = f(x, y, r)
    const i = (y * w + x) * 4
    img.data[i] = v[0]; img.data[i + 1] = v[1]; img.data[i + 2] = v[2]; img.data[i + 3] = v[3]
  }
  g.putImageData(img, 0, 0)
  cache.set(key, c)
  return c
}
/** Tileable value noise, [0, 1]. */
export const field = (seed: number, size: number, cells: number): Float32Array => {
  const r = rng(seed)
  const g = Float32Array.from({ length: cells * cells }, () => r())
  const out = new Float32Array(size * size)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = (x / size) * cells, v = (y / size) * cells
    const i = Math.floor(u), j = Math.floor(v)
    const a = u - i, b = v - j
    const fa = a * a * (3 - 2 * a), fb = b * b * (3 - 2 * b)
    const at = (m: number, n: number): number => g[(n % cells) * cells + (m % cells)]!
    out[y * size + x] = lerp(lerp(at(i, j), at(i + 1, j), fa), lerp(at(i, j + 1), at(i + 1, j + 1), fa), fb)
  }
  return out
}
const fields = new Map<string, Float32Array>()
export const sharedField = (seed: number, size: number, cells: number): Float32Array => {
  const k = `${seed}/${size}/${cells}`
  let f = fields.get(k)
  if (!f) fields.set(k, (f = field(seed, size, cells)))
  return f
}
/** Grain as alpha, for knocking holes in a layer. `cut` is coverage, `soft` the edge. */
export const grainTex = (key: string, cut: number, soft: number, cells: number, blob = 0.15): HTMLCanvasElement => {
  const n = 512
  const f1 = sharedField(hash(key), n, cells)
  const f2 = sharedField(hash(key) + 1, n, Math.round(cells / 4))
  return texture(`grain-${key}-${cut}-${soft}-${blob}`, n, n, (x, y, r) => {
    const v = f1[y * n + x]! * (0.7 - blob) + r() * 0.3 + f2[y * n + x]! * blob
    return [0, 0, 0, 255 * (1 - smooth(cut - soft, cut + soft, v))]
  })
}
export const tile = (ctx: Ctx, tex: HTMLCanvasElement, op: GlobalCompositeOperation, alpha = 1, scale = 1, dx = 0, dy = 0): void => {
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalCompositeOperation = op
  ctx.globalAlpha = alpha
  const p = ctx.createPattern(tex, "repeat")!
  p.setTransform(new DOMMatrix([scale, 0, 0, scale, dx, dy]))
  ctx.fillStyle = p
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.restore()
}
export const cw = (p: ReadonlyArray<P2>): boolean => area(p) > 0

export const hex = (h: string, a = 1): string => {
  const n = parseInt(h.slice(1), 16)
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`
}
export const shadeHex = (h: string, k: number): string => {
  const n = parseInt(h.slice(1), 16)
  const f = (v: number): number => Math.round(clamp(k < 0 ? v * (1 + k) : v + (255 - v) * k, 0, 255))
  return `#${((1 << 24) | (f(n >> 16) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).slice(1)}`
}
