/**
 * Native-resolution ink extraction for black-and-white line art.
 *
 * Uses paper-white normalization + directional local-maximum ridge hysteresis:
 * - Solid dark ink cores (`ink >= coreCut`) always form barriers.
 * - Faint thin lines (`ridgeCut <= ink < coreCut`) form barriers ONLY where they
 *   are a 1D local maximum perpendicular to the stroke (an ink ridge), so faint
 *   outlines never leak while soft anti-aliased flanks never bloat into narrow corners.
 */

export type InkField = {
  w: number
  h: number
  /** Original input RGBA (preserved bit-for-bit for Multiply line art layer). */
  rgba: Uint8Array
  /** Normalized ink darkness in [0, 1], where 0 = paper white, 1 = pure black. */
  ink: Float32Array
  /** Paper white luminance used for normalization (typically 250..255). */
  paperWhite: number
  /** Binary waterproof ink barrier (1 = barrier, 0 = open paper). */
  barrier: Uint8Array
  /** Pure core ink mask (`ink >= coreCut`) without faint ridges. */
  core: Uint8Array
  /** Measured stroke-width stats (median half-width in px). */
  medianStrokeWidth: number
}

export type InkOptions = {
  /** Threshold for solid ink cores. Default 0.36. */
  coreCut?: number
  /** Threshold for faint 1D-ridge strokes (prevents leaks on fine lines). Default 0.14. */
  ridgeCut?: number
  /** Remove subtle grey fills before building barrier (lines stay intact). Default false. */
  cleanGreyFills?: boolean
}

/** Compute normalized ink darkness and ridge-hysteresis waterproof barrier at 1:1 native resolution. */
export const analyzeInk = (rgba: Uint8Array, w: number, h: number, opts: InkOptions = {}): InkField => {
  const N = w * h
  const coreCut = opts.coreCut ?? 0.36
  const ridgeCut = opts.ridgeCut ?? 0.14

  // 1. Luminance & paper-white estimation (95th percentile clamped to [240, 255])
  const lum = new Float32Array(N)
  const hist = new Uint32Array(256)
  for (let i = 0; i < N; i++) {
    const l = rgba[i * 4]! * 0.299 + rgba[i * 4 + 1]! * 0.587 + rgba[i * 4 + 2]! * 0.114
    lum[i] = l
    hist[Math.max(0, Math.min(255, Math.round(l)))]!++
  }
  let acc = 0
  let paperWhite = 255
  const target = N * 0.95
  for (let v = 0; v < 256; v++) {
    acc += hist[v]!
    if (acc >= target) { paperWhite = Math.max(240, v); break }
  }

  let ink = new Float32Array(N)
  for (let i = 0; i < N; i++) ink[i] = Math.max(0, Math.min(1, 1 - lum[i]! / paperWhite))

  // Optional grey-fill cleaning (high-pass background normalization preserving dark strokes)
  if (opts.cleanGreyFills) {
    const L = Float32Array.from(lum)
    const morph = (src: Float32Array, R: number, fn: (a: number, b: number) => number): Float32Array => {
      let s = src
      for (const st of [1, w]) {
        const o = new Float32Array(N)
        for (let q = 0; q < N; q++) {
          let m = s[q]!
          const x = q % w
          for (let e = 1; e <= R; e++) {
            if (st === 1) {
              if (x - e >= 0) m = fn(m, s[q - e]!)
              if (x + e < w) m = fn(m, s[q + e]!)
            } else {
              if (q - e * w >= 0) m = fn(m, s[q - e * w]!)
              if (q + e * w < N) m = fn(m, s[q + e * w]!)
            }
          }
          o[q] = m
        }
        s = o
      }
      return s
    }
    const bg = morph(morph(L, 2, Math.max), 2, Math.min)
    const cleaned = new Float32Array(N)
    for (let i = 0; i < N; i++) {
      const b = Math.max(1, bg[i]!)
      const t = Math.max(0, Math.min(1, (b - 52) / 26))
      const v = L[i]! + (Math.min(255, (L[i]! / b) * 255) - L[i]!) * t
      const e = v > 238 ? 255 : v
      cleaned[i] = Math.max(0, Math.min(1, 1 - e / 255))
    }
    ink = cleaned
  }

  // 2. Core mask + directional 1D ridge detection
  // A pixel is a 1D ink ridge if it is a local maximum along at least one of the 4 principal axes
  // (vertical, horizontal, main diag, anti-diag) with measurable prominence over its two flanks.
  const core = new Uint8Array(N)
  const ridge = new Uint8Array(N)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      const v = ink[i]!
      if (v >= coreCut) { core[i] = 1; continue }
      if (v < ridgeCut) continue
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) continue
      const isPeak = (a: number, b: number): boolean => v >= a && v >= b && (v - Math.min(a, b) >= 0.04)
      if (
        isPeak(ink[i - 1]!, ink[i + 1]!) ||
        isPeak(ink[i - w]!, ink[i + w]!) ||
        isPeak(ink[i - w - 1]!, ink[i + w + 1]!) ||
        isPeak(ink[i - w + 1]!, ink[i + w - 1]!)
      ) {
        ridge[i] = 1
      }
    }
  }

  // 3. Hysteresis: keep core pixels AND ridge pixels that are 8-connected to core (or belong to a
  //    continuous ridge component of length >= 4 px, catching faint standalone lines like eye lids/film edges).
  const barrier = core.slice()
  const vis = new Uint8Array(N)
  const queue = new Int32Array(N)
  const comp = new Int32Array(N)
  const offs = [-w - 1, -w, -w + 1, -1, 1, w - 1, w, w + 1]
  for (let i = 0; i < N; i++) {
    if (!ridge[i] || vis[i]) continue
    let head = 0, tail = 0, touchesCore = false
    queue[tail++] = i; vis[i] = 1
    while (head < tail) {
      const p = queue[head++]!
      comp[head - 1] = p
      const px = p % w, py = (p / w) | 0
      for (const d of offs) {
        const q = p + d
        if (q < 0 || q >= N) continue
        const qx = q % w, qy = (q / w) | 0
        if (Math.abs(qx - px) > 1 || Math.abs(qy - py) > 1) continue
        if (core[q]) touchesCore = true
        else if (ridge[q] && !vis[q]) { vis[q] = 1; queue[tail++] = q }
      }
    }
    if (touchesCore || tail >= 4) {
      for (let k = 0; k < tail; k++) barrier[comp[k]!] = 1
    }
  }

  // 4. Bridge diagonal-only barrier pinholes? No: 4-connected paper flood naturally stops at 8-connected
  //    barriers ONLY if the barrier is 4-connected! Wait: two diagonal barrier pixels (x,y) and (x+1,y+1)
  //    would allow a 4-connected paper flood to pass through (x+1,y) -> (x,y+1) ONLY if using 8-connected paper!
  //    With 4-connected paper flood, an 8-connected diagonal barrier IS ALREADY 100% WATERPROOF!
  //    (Jordan curve theorem on Z^2: 8-connected boundary separates 4-connected interiors!)

  // 5. Estimate median stroke width from barrier pixel runs
  const runs: Array<number> = []
  for (let y = 0; y < h; y += 4) {
    let run = 0
    for (let x = 0; x < w; x++) {
      if (barrier[y * w + x]) run++
      else if (run > 0) { if (run <= 20) runs.push(run); run = 0 }
    }
  }
  runs.sort((a, b) => a - b)
  const medianStrokeWidth = runs.length ? runs[Math.floor(runs.length * 0.5)]! : 2

  return { w, h, rgba, ink, paperWhite, barrier, core, medianStrokeWidth }
}

/**
 * Convert a white-background B&W line art into a clean transparent-background RGBA ink layer
 * (useful when exporting alpha-ink instead of Multiply).
 */
export const extractAlphaInk = (field: InkField): Uint8Array => {
  const { w, h, rgba, ink } = field
  const out = new Uint8Array(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    const a = Math.max(0, Math.min(255, Math.round(ink[i]! * 255)))
    if (a < 2) continue
    // Un-premultiply original color from white background: C = (S - 255*(1-alpha)) / alpha
    const al = a / 255
    for (let c = 0; c < 3; c++) {
      const s = rgba[i * 4 + c]!
      const orig = (s - 255 * (1 - al)) / al
      out[i * 4 + c] = Math.max(0, Math.min(255, Math.round(orig)))
    }
    out[i * 4 + 3] = a
  }
  return out
}
