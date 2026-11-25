/**
 * Stage 2 (v2): Iterative fix after visual review of v1!
 * Fixes:
 *  1. Smooth sweeping anime upper eyelash arch (no S-kink), clear bang off far eye so both eyes read cleanly!
 *  2. Unified organic anime hand silhouettes (continuous palm+finger contours with depth-overlap interior lines, NO doll seams!)
 *  3. Sculptural jacket sleeves, draped off-shoulder lapel, clean 3D-anchored strap curve (no chest loop!), and beveled mechanical buckle!
 *  4. Closed silhouette tips (>=1.6px) + full 3D-guide overlay fix so flood-fill closure & silhouette gates PASS cleanly!
 */
import { readFileSync, writeFileSync } from "node:fs"
import { chromium } from "playwright"

const data = JSON.parse(readFileSync("exp/out/stage1-data.json", "utf8"))
const guideB64 = readFileSync("exp/out/stage1-guide.png").toString("base64")

const renderScript = async ([stage1, guideUrl]: readonly [typeof data, string]) => {
  const W = stage1.w as number
  const H = stage1.h as number
  const K = 2

  const mkCanvas = (w: number, h: number) => {
    const c = document.createElement("canvas")
    c.width = w; c.height = h
    const g = c.getContext("2d")!
    g.fillStyle = "#ffffff"
    g.fillRect(0, 0, w, h)
    return { c, g }
  }

  type P2 = readonly [number, number]
  const add = (a: P2, b: P2): P2 => [a[0] + b[0], a[1] + b[1]]
  const sub = (a: P2, b: P2): P2 => [a[0] - b[0], a[1] - b[1]]
  const mul = (a: P2, k: number): P2 => [a[0] * k, a[1] * k]
  const lerp2 = (a: P2, b: P2, t: number): P2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
  const dist = (a: P2, b: P2): number => Math.hypot(b[0] - a[0], b[1] - a[1])
  const unit = (a: P2): P2 => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l] }
  const perp = (a: P2): P2 => [-a[1], a[0]]
  const clamp = (v: number, lo = 0, hi = 1): number => Math.max(lo, Math.min(hi, v))

  const catmull = (pts: ReadonlyArray<P2>, per = 12, closed = false): Array<P2> => {
    const n = pts.length
    if (n < 2) return [...pts]
    if (n === 2) return Array.from({ length: per + 1 }, (_, i) => lerp2(pts[0]!, pts[1]!, i / per))
    const out: Array<P2> = []
    const get = (i: number): P2 => {
      if (closed) return pts[((i % n) + n) % n]!
      if (i < 0) return sub(mul(pts[0]!, 2), pts[1]!)
      if (i >= n) return sub(mul(pts[n - 1]!, 2), pts[n - 2]!)
      return pts[i]!
    }
    const count = closed ? n : n - 1
    for (let i = 0; i < count; i++) {
      const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2)
      const dt = (a: P2, b: P2) => Math.max(1e-3, dist(a, b) ** 0.5)
      const t0 = 0, t1 = dt(p0, p1), t2 = t1 + dt(p1, p2), t3 = t2 + dt(p2, p3)
      for (let k = 0; k < per; k++) {
        const t = t1 + (t2 - t1) * (k / per)
        const mix = (a: P2, b: P2, u: number, v: number): P2 => [
          ((v - t) * a[0] + (t - u) * b[0]) / (v - u),
          ((v - t) * a[1] + (t - u) * b[1]) / (v - u),
        ]
        const A1 = mix(p0, p1, t0, t1), A2 = mix(p1, p2, t1, t2), A3 = mix(p2, p3, t2, t3)
        out.push(mix(mix(A1, A2, t0, t2), mix(A2, A3, t1, t3), t1, t2))
      }
    }
    if (!closed) out.push(pts[n - 1]!)
    return out
  }

  /** Cubic Bezier sampler for razor-clean calligraphic curves (zero Catmull wiggle!) */
  const bezier = (p0: P2, c1: P2, c2: P2, p3: P2, steps = 28): Array<P2> =>
    Array.from({ length: steps + 1 }, (_, i) => {
      const t = i / steps, u = 1 - t
      return [
        u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p3[1],
      ] as P2
    })

  const LIGHT: P2 = unit([-0.65, -0.76])
  const INK = "#101014"

  const fillPoly = (g: CanvasRenderingContext2D, pts: ReadonlyArray<P2>, color: string) => {
    if (pts.length < 3) return
    g.beginPath()
    g.moveTo(pts[0]![0], pts[0]![1])
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i]![0], pts[i]![1])
    g.closePath()
    g.fillStyle = color
    g.fill()
  }

  const ink = (
    g: CanvasRenderingContext2D,
    raw: ReadonlyArray<P2>,
    w0: number,
    o: { closed?: boolean; taper?: readonly [number, number]; minTip?: number; lightMod?: number; color?: string; smooth?: boolean } = {}
  ) => {
    const closed = o.closed ?? false
    const pts = o.smooth === false ? [...raw] : catmull(raw, 10, closed)
    if (pts.length < 2) return
    const n = pts.length
    const [ts, te] = o.taper ?? (closed ? [0, 0] : [0.35, 0.35])
    const lm = o.lightMod ?? 0.35
    const minTip = o.minTip ?? 0.15
    const left: Array<P2> = [], right: Array<P2> = []
    const arc: Array<number> = [0]
    for (let i = 1; i < n; i++) arc.push(arc[i - 1]! + dist(pts[i - 1]!, pts[i]!))
    const total = arc[n - 1]! || 1

    for (let i = 0; i < n; i++) {
      const t = arc[i]! / total
      const prev = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)]!
      const next = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)]!
      const norm = perp(unit(sub(next, prev)))
      let w = w0
      if (lm > 0) {
        const away = -(norm[0] * LIGHT[0] + norm[1] * LIGHT[1])
        w *= 1 + lm * clamp(away, -0.45, 0.85)
      }
      if (!closed) {
        const a = ts > 0 ? clamp(t / ts) : 1
        const b = te > 0 ? clamp((1 - t) / te) : 1
        const m = Math.min(a, b)
        w = minTip + (w - minTip) * (m * m * (3 - 2 * m))
      }
      const hw = Math.max(0.15, w * 0.5)
      left.push(add(pts[i]!, mul(norm, hw)))
      right.push(add(pts[i]!, mul(norm, -hw)))
    }
    if (closed) { left.push(left[0]!); right.push(right[0]!) }
    fillPoly(g, [...left, ...right.reverse()], o.color ?? INK)
  }

  const partShape = (
    g: CanvasRenderingContext2D,
    ctrl: ReadonlyArray<P2>,
    w: number,
    o: { fill?: string; lightMod?: number; smooth?: boolean } = {}
  ) => {
    const pts = o.smooth === false ? [...ctrl] : catmull(ctrl, 10, true)
    if (o.fill !== "none") fillPoly(g, pts, o.fill ?? "#ffffff")
    ink(g, pts, w, { closed: true, smooth: false, lightMod: o.lightMod ?? 0.38 })
  }

  /** Closed anime hair lock (guaranteed sealed tip >= 1.6px so bucket never leaks!) */
  const drawHairLock = (
    g: CanvasRenderingContext2D,
    ctrl: ReadonlyArray<readonly [number, number, number]>,
    o: { wOut?: number; inner?: number; seal?: boolean } = {}
  ) => {
    const cPts = catmull(ctrl.map((p) => [p[0], p[1]] as P2), 10, false)
    const n = cPts.length
    const ws = Array.from({ length: n }, (_, i) => {
      const f = (i / (n - 1)) * (ctrl.length - 1)
      const j = Math.min(ctrl.length - 2, Math.floor(f))
      const t = f - j
      return ctrl[j]![2] * (1 - t) + ctrl[j + 1]![2] * t
    })
    const Lside: Array<P2> = [], Rside: Array<P2> = []
    for (let i = 0; i < n; i++) {
      const prev = cPts[Math.max(0, i - 1)]!, next = cPts[Math.min(n - 1, i + 1)]!
      const nr = perp(unit(sub(next, prev)))
      const hw = (i === n - 1 ? 0 : ws[i]! * 0.5)
      Lside.push(add(cPts[i]!, mul(nr, hw)))
      Rside.push(add(cPts[i]!, mul(nr, -hw)))
    }
    const outline = [...Lside, ...Rside.slice(0, -1).reverse()]
    fillPoly(g, outline, "#ffffff")
    const wOut = o.wOut ?? 4.0
    const minTip = o.seal === false ? 0.2 : 1.7 // keeps silhouette sealed for flood fill!
    ink(g, Lside, wOut, { smooth: false, taper: [0.06, 0.42], minTip, lightMod: 0.38 })
    ink(g, Rside, wOut * 0.92, { smooth: false, taper: [0.06, 0.42], minTip, lightMod: 0.38 })
    if ((o.inner ?? 1) > 0) {
      const strand = Array.from({ length: n }, (_, i) => lerp2(cPts[i]!, Lside[i]!, 0.36))
      ink(g, strand.slice(Math.floor(n * 0.16), Math.floor(n * 0.85)), 1.5, { smooth: false, taper: [0.42, 0.48], minTip: 0.1, lightMod: 0.1 })
    }
  }

  const J = stage1.joints as Record<string, readonly [number, number, number]>
  const M = stage1.headMarks as Record<string, readonly [number, number, number]>
  const jp = (k: string): P2 => [J[k]![0], J[k]![1]]
  const mp = (k: string): P2 => [M[k]![0], M[k]![1]]
  const hx: P2 = unit(stage1.headAxisX as P2)
  const hy: P2 = unit(stage1.headAxisY as P2)
  const Hpx = stage1.headPx as number
  const hOff = (u: number, v: number): P2 => add(mul(hx, u * Hpx), mul(hy, v * Hpx))

  const { c: inkC, g } = mkCanvas(W * K, H * K)
  g.save(); g.scale(K, K)

  const partPt = mp("parting")
  const crownPt = mp("crown")

  // =========================================================================
  // LAYER 1: BACK HAIR (sealed dynamic bob flips!)
  // =========================================================================
  drawHairLock(g, [
    add(crownPt, hOff(-0.14, 0.20)),
    add(crownPt, hOff(-0.56, 0.40)),
    add(crownPt, hOff(-0.92, 0.48)),
    add(crownPt, hOff(-1.12, 0.36)),
  ].map((p, i) => [p[0], p[1], [104, 114, 72, 2][i]!] as const), { wOut: 5.4 })
  drawHairLock(g, [
    add(crownPt, hOff(-0.16, 0.36)),
    add(crownPt, hOff(-0.58, 0.62)),
    add(crownPt, hOff(-0.92, 0.80)),
    add(crownPt, hOff(-1.08, 0.78)),
  ].map((p, i) => [p[0], p[1], [96, 102, 66, 2][i]!] as const), { wOut: 5.4 })
  drawHairLock(g, [
    add(crownPt, hOff(-0.10, 0.56)),
    add(crownPt, hOff(-0.40, 0.86)),
    add(crownPt, hOff(-0.58, 1.12)),
    add(crownPt, hOff(-0.50, 1.24)),
  ].map((p, i) => [p[0], p[1], [90, 84, 52, 2][i]!] as const), { wOut: 5.0 })
  drawHairLock(g, [
    add(crownPt, hOff(0.22, 0.48)),
    add(crownPt, hOff(0.46, 0.82)),
    add(crownPt, hOff(0.50, 1.10)),
    add(crownPt, hOff(0.38, 1.24)),
  ].map((p, i) => [p[0], p[1], [78, 74, 44, 2][i]!] as const), { wOut: 4.8 })

  // =========================================================================
  // LAYER 2: CARGO PANTS + UTILITY BELT + SCULPTED BUCKLE
  // =========================================================================
  const pWaistL = jp("waistL"), pWaistR = jp("waistR")
  const pHipR = jp("hipOutR"), pHipL = jp("hipOutL")
  const pPelvis = jp("pelvis")
  const crotch: P2 = [pPelvis[0] + 10, pPelvis[1] + 175]

  const pantsOutline: Array<P2> = [
    add(pWaistL, [-28, 38]),
    add(pHipR, [-42, 16]),
    [pHipR[0] - 108, H + 20],
    [crotch[0] - 28, H + 20],
    crotch,
    [crotch[0] + 54, H + 20],
    [pHipL[0] + 140, H + 20],
    add(pHipL, [32, 24]),
    add(pWaistR, [22, 42]),
  ]
  partShape(g, pantsOutline, 6.4)
  // Clean asymmetric drapery folds (natural V-folds from hip & crotch, NO blob!)
  ink(g, [add(pPelvis, [8, 28]), [crotch[0] + 2, crotch[1] - 4]], 3.0, { taper: [0.1, 0.25] })
  ink(g, [add(pPelvis, [-16, 32]), [crotch[0] - 20, crotch[1] - 32], [crotch[0] - 2, crotch[1] - 6]], 2.2, { taper: [0.15, 0.35] })
  ink(g, [crotch, [crotch[0] - 92, crotch[1] + 92], [crotch[0] - 155, crotch[1] + 195]], 3.6, { taper: [0.05, 0.65] })
  ink(g, [[crotch[0] - 14, crotch[1] - 18], [crotch[0] - 115, crotch[1] + 34], [crotch[0] - 185, crotch[1] + 82]], 2.4, { taper: [0.25, 0.7] })
  ink(g, [crotch, [crotch[0] + 72, crotch[1] + 108], [crotch[0] + 128, crotch[1] + 225]], 3.4, { taper: [0.05, 0.65] })
  ink(g, [[crotch[0] + 18, crotch[1] - 24], [crotch[0] + 126, crotch[1] + 26], [crotch[0] + 198, crotch[1] + 72]], 2.2, { taper: [0.25, 0.7] })
  // Subtle tight occlusion wedge right inside crotch V
  fillPoly(g, [crotch, [crotch[0] - 10, crotch[1] + 28], [crotch[0] + 8, crotch[1] + 30], [crotch[0] + 12, crotch[1] + 10]], INK)

  // Cargo pocket on right thigh (beveled corners + flap + strap + rivet)
  const pk0: P2 = [pHipL[0] - 64, pHipL[1] + 148]
  const pk1: P2 = [pHipL[0] + 82, pHipL[1] + 118]
  const pk2: P2 = [pHipL[0] + 132, pHipL[1] + 288]
  const pk3: P2 = [pHipL[0] - 14, pHipL[1] + 318]
  partShape(g, [pk0, pk1, pk2, pk3], 3.6, { smooth: false })
  partShape(g, [add(pk0, [-8, -12]), add(pk1, [8, -12]), add(pk1, [16, 44]), add(pk0, [4, 50])], 3.4, { smooth: false })
  partShape(g, [lerp2(pk0, pk1, 0.62), lerp2(pk0, pk1, 0.80), lerp2(pk3, pk2, 0.80), lerp2(pk3, pk2, 0.62)], 2.8, { smooth: false })
  const rv = lerp2(pk0, pk1, 0.30)
  g.beginPath(); g.arc(rv[0] + 6, rv[1] + 24, 6.5, 0, Math.PI * 2); g.fillStyle = "#fff"; g.fill(); g.lineWidth = 2.6; g.strokeStyle = INK; g.stroke()

  // Utility Belt + Beveled Quick-Release Tactical Buckle!
  const bL0 = add(pWaistL, [-32, 16]), bL1 = add(pWaistL, [-42, 74])
  const bR0 = add(pWaistR, [28, 28]), bR1 = add(pWaistR, [36, 88])
  const bMid0 = lerp2(bL0, bR0, 0.52), bMid1 = lerp2(bL1, bR1, 0.52)
  partShape(g, [bL0, add(bMid0, [0, 22]), bR0, bR1, add(bMid1, [0, 24]), bL1], 4.6)
  for (const t of [0.22, 0.78]) {
    const t0 = lerp2(bL0, bR0, t), t1 = lerp2(bL1, bR1, t)
    partShape(g, [add(t0, [-13, -8]), add(t0, [15, -6]), add(t1, [15, 10]), add(t1, [-13, 8])], 3.2, { smooth: false })
  }
  // Sculpted notched quick-release buckle (like maren!)
  const bk = jp("buckle")
  partShape(g, [
    add(bk, [-60, -34]), add(bk, [14, -28]), add(bk, [26, -38]), add(bk, [62, -24]),
    add(bk, [58, 42]), add(bk, [22, 48]), add(bk, [10, 34]), add(bk, [-62, 28]),
  ], 4.0, { smooth: false })
  partShape(g, [add(bk, [-36, -18]), add(bk, [2, -15]), add(bk, [0, 18]), add(bk, [-38, 15])], 2.6, { smooth: false })
  // Latch prongs & bevel lines
  ink(g, [add(bk, [16, -24]), add(bk, [48, -14]), add(bk, [46, 28]), add(bk, [14, 30])], 2.2, { smooth: false })
  // Hanging tactical strap tail
  partShape(g, [add(bR0, [-20, 48]), add(bR0, [18, 52]), add(bR0, [48, 182]), add(bR0, [2, 194])], 3.8, { smooth: false })

  // =========================================================================
  // LAYER 3: JACKET BACK & LINING + BULKY FAR SLEEVE L
  // =========================================================================
  const pShR = jp("shoulderR"), pShL = jp("shoulderL")
  const pElR = jp("elbowR"), pElL = jp("elbowL")
  const pWrR = jp("wristR"), pWrL = jp("wristL")
  const pNeckBase = jp("neckBase"), pNeckTop = jp("neckTop")
  const pBustR = jp("bustR"), pBustL = jp("bustL")

  // Jacket back & right front panel hanging cleanly behind/beside torso
  partShape(g, [
    add(pShL, [-18, 35]),
    add(pShL, [108, 82]),
    add(pWaistR, [120, -18]),
    add(pWaistR, [44, 24]),
    add(pWaistR, [10, -42]),
  ], 5.6)
  fillPoly(g, [add(pWaistR, [12, -12]), add(pWaistR, [48, 16]), add(pWaistR, [76, -54]), add(pWaistR, [20, -96])], INK)

  // Far wrist & forearm emerging from ribbed cuff L
  const pCuffL = jp("lSlvCuff")
  const dirL = unit(sub(pWrL, pElL)), nL = perp(dirL)
  partShape(g, [
    add(pCuffL, mul(nL, 26)), add(pWrL, mul(nL, 20)), add(pWrL, mul(nL, -20)), add(pCuffL, mul(nL, -26)),
  ], 4.0)

  // Bulky streetwear jacket sleeve L (kept fully inside right canvas border!)
  const clampX = (p: P2): P2 => [Math.min(W - 18, Math.max(18, p[0])), p[1]]
  const slvL: Array<P2> = [
    add(pShL, [-18, -14]),
    add(pShL, [55, -24]),
    add(pCuffL, add(mul(dirL, -16), mul(nL, -74))),
    add(pCuffL, add(mul(dirL, 12), mul(nL, -56))),
    add(pCuffL, add(mul(dirL, 12), mul(nL, 58))),
    clampX(add(pElL, [72, 34])),
    clampX(add(pElL, [26, 92])),
    add(pElL, [-42, 74]),
    add(pShL, [-14, 72]),
  ]
  partShape(g, slvL, 6.2)
  const cuffL0 = add(pCuffL, add(mul(dirL, -26), mul(nL, -56)))
  const cuffL1 = add(pCuffL, add(mul(dirL, 26), mul(nL, -48)))
  const cuffL2 = add(pCuffL, add(mul(dirL, 26), mul(nL, 48)))
  const cuffL3 = add(pCuffL, add(mul(dirL, -26), mul(nL, 56)))
  partShape(g, [cuffL0, cuffL1, cuffL2, cuffL3], 4.2, { smooth: false })
  for (const t of [0.22, 0.48, 0.74]) ink(g, [lerp2(cuffL0, cuffL3, t), lerp2(cuffL1, cuffL2, t)], 1.6, { smooth: false })
  // Bold elbow tension folds!
  ink(g, [add(pElL, [-20, 62]), add(pElL, [10, 10]), add(pElL, [48, -16])], 3.2, { taper: [0.1, 0.65] })
  ink(g, [add(pElL, [-4, 80]), add(pElL, [32, 34]), add(pElL, [58, 16])], 2.5, { taper: [0.1, 0.65] })
  ink(g, [add(pCuffL, add(mul(dirL, -42), mul(nL, -52))), add(pCuffL, add(mul(dirL, -62), mul(nL, 12))), add(pCuffL, add(mul(dirL, -36), mul(nL, 54)))], 2.8, { taper: [0.2, 0.4] })
  const spL = clampX(add(pElL, [22, -18]))
  partShape(g, [add(spL, [-36, -24]), add(spL, [26, -32]), add(spL, [42, 24]), add(spL, [-22, 36])], 3.0, { smooth: false })

  // =========================================================================
  // LAYER 4: NECK, BARE NEAR SHOULDER & FITTED HIGH-NECK TANK TOP
  // =========================================================================
  const pChin = mp("chin"), pJawL = mp("jawCornerL"), pJawR = mp("jawCornerR")
  partShape(g, [
    add(pJawL, [14, -10]),
    add(pNeckBase, [-48, -8]),
    add(pShR, [-38, -46]),
    add(pShR, [-82, 16]),
    add(pShR, [-76, 138]),
    add(pShR, [42, 165]),
    add(pNeckBase, [74, 42]),
    add(pJawR, [-8, -14]),
  ], 5.0)
  const pClavMid = jp("clavicleMid"), pClavR = jp("clavicleR")
  ink(g, [add(pNeckTop, [-24, 24]), add(pNeckBase, [-10, 4]), add(pClavMid, [-8, -12])], 1.8, { taper: [0.45, 0.55] })
  ink(g, [add(pClavMid, [-18, -6]), add(pClavR, [18, -4]), add(pShR, [8, -26])], 2.0, { taper: [0.5, 0.5] })
  // Deep chin-on-neck occlusion wedge!
  fillPoly(g, [
    add(pChin, [-32, -6]), pChin, add(pJawR, [-12, 14]),
    add(pNeckTop, [34, 28]), add(pNeckTop, [-6, 48]), add(pNeckTop, [-42, 18]),
  ], INK)

  // Fitted High-Neck Tank Top
  partShape(g, [
    add(pNeckBase, [-48, -16]), add(pNeckBase, [48, -22]), add(pNeckBase, [60, 26]),
    add(pShL, [-22, 22]), add(pBustL, [58, -18]), add(pBustL, [68, 48]), add(pBustL, [32, 92]),
    add(pWaistR, [22, -45]), add(pWaistR, [26, 36]), add(pWaistL, [-26, 24]), add(pWaistL, [-18, -60]),
    add(pShR, [72, 118]), add(pShR, [94, 34]), add(pNeckBase, [-54, 24]),
  ], 5.4)
  ink(g, [add(pNeckBase, [-52, 22]), add(pNeckBase, [0, 34]), add(pNeckBase, [58, 22])], 3.2, { taper: [0.1, 0.1] })
  ink(g, [add(pNeckBase, [-46, 24]), add(pShR, [84, 38]), add(pShR, [62, 122])], 2.4, { taper: [0.15, 0.15] })
  ink(g, [add(pBustR, [-24, 52]), add(pBustR, [32, 76]), add(pBustL, [-28, 72])], 2.6, { taper: [0.45, 0.35] })
  ink(g, [add(pWaistL, [-10, -24]), add(pWaistL, [54, -14]), add(pWaistR, [-22, -26])], 2.2, { taper: [0.3, 0.55] })
  ink(g, [add(pWaistL, [-14, 2]), add(pWaistL, [62, 14]), add(pWaistR, [-42, 4])], 2.0, { taper: [0.3, 0.6] })

  // Crossbody Sling Strap — ONE CLEAN BEZIER wrapping diagonally across bust (ZERO chest loop!)
  const stStart = add(pNeckBase, [54, 16])
  const stEnd = add(pHipR, [-14, 26])
  const strapPath = bezier(stStart, add(pBustL, [26, 48]), add(pWaistL, [32, -32]), stEnd, 36)
  const stL = strapPath.map((p, i) => {
    const a = strapPath[Math.max(0, i - 1)]!, b = strapPath[Math.min(strapPath.length - 1, i + 1)]!
    return add(p, mul(perp(unit(sub(b, a))), 20))
  })
  const stR = strapPath.map((p, i) => {
    const a = strapPath[Math.max(0, i - 1)]!, b = strapPath[Math.min(strapPath.length - 1, i + 1)]!
    return add(p, mul(perp(unit(sub(b, a))), -20))
  })
  fillPoly(g, [...stL, ...stR.reverse()], "#ffffff")
  ink(g, stL, 3.8, { smooth: false, taper: [0.04, 0.04] })
  ink(g, stR.reverse(), 3.8, { smooth: false, taper: [0.04, 0.04] })
  // Strap adjuster buckle
  const slIdx = Math.floor(strapPath.length * 0.56)
  const slAt = strapPath[slIdx]!, slDir = unit(sub(strapPath[slIdx + 1]!, slAt)), slN = perp(slDir)
  partShape(g, [
    add(slAt, add(mul(slDir, -18), mul(slN, -28))), add(slAt, add(mul(slDir, 18), mul(slN, -28))),
    add(slAt, add(mul(slDir, 18), mul(slN, 28))), add(slAt, add(mul(slDir, -18), mul(slN, 28))),
  ], 3.2, { smooth: false })

  // =========================================================================
  // LAYER 5: VOLUMETRIC OFF-SHOULDER SLEEVE R + LAPEL + UNIFIED ORGANIC HAND R
  // =========================================================================
  const pCuffR = jp("rSlvCuff")
  const dirR = unit(sub(pWrR, pElR)), nR = perp(dirR)
  // Full, puffy, sculptural off-shoulder streetwear sleeve R (matching Stage 1's 3D bulk!)
  const slvR: Array<P2> = [
    add(pShR, [-92, 52]),
    clampX(add(pElR, [-118, -56])),
    clampX(add(pElR, [-122, 48])),
    add(pElR, [-44, 108]),
    add(pCuffR, add(mul(dirR, 18), mul(nR, 64))),
    add(pCuffR, add(mul(dirR, 16), mul(nR, -58))),
    add(pElR, [42, -12]),
    add(pShR, [62, 118]),
    add(pShR, [10, 74]),
  ]
  partShape(g, slvR, 6.4)
  // Crisp off-shoulder jacket collar/lapel + visible folded inner lining
  partShape(g, [
    add(pShR, [-108, 66]), add(pShR, [-74, 4]), add(pShR, [22, 52]),
    add(pShR, [102, 138]), add(pShR, [64, 194]), add(pShR, [-22, 130]),
  ], 4.8, { smooth: false })
  ink(g, [add(pShR, [-88, 54]), add(pShR, [-64, 20]), add(pShR, [16, 66]), add(pShR, [88, 140])], 2.4, { smooth: false })
  // Sleeve utility pocket on near sleeve!
  const spR = clampX(add(pElR, [-64, -10]))
  partShape(g, [add(spR, [-32, -28]), add(spR, [26, -14]), add(spR, [14, 42]), add(spR, [-42, 28])], 3.0, { smooth: false })
  // Crisp structural sleeve folds radiating from elbow pinch!
  ink(g, [add(pElR, [36, -6]), add(pElR, [-26, 22]), add(pElR, [-82, 18])], 3.4, { taper: [0.08, 0.65] })
  ink(g, [add(pElR, [24, 24]), add(pElR, [-38, 54]), add(pElR, [-88, 64])], 2.6, { taper: [0.12, 0.7] })
  ink(g, [add(pCuffR, add(mul(dirR, -44), mul(nR, -58))), add(pCuffR, add(mul(dirR, -62), mul(nR, 6))), add(pCuffR, add(mul(dirR, -38), mul(nR, 60)))], 2.8, { taper: [0.2, 0.4] })
  // Ribbed cuff R
  const cR0 = add(pCuffR, add(mul(dirR, -26), mul(nR, -56)))
  const cR1 = add(pCuffR, add(mul(dirR, 28), mul(nR, -46)))
  const cR2 = add(pCuffR, add(mul(dirR, 28), mul(nR, 46)))
  const cR3 = add(pCuffR, add(mul(dirR, -26), mul(nR, 56)))
  partShape(g, [cR0, cR1, cR2, cR3], 4.2, { smooth: false })
  for (const t of [0.22, 0.48, 0.74]) ink(g, [lerp2(cR0, cR3, t), lerp2(cR1, cR2, t)], 1.6, { smooth: false })

  /**
   * UNIFIED ANIME HAND RENDERER (NO wooden doll knuckle seams!):
   * Builds a single continuous white hand+finger silhouette first (using a 2-pass silhouette stroke + white fill trick!),
   * then draws ONLY true depth-overlap finger separation lines + subtle knuckle/tendon hints!
   */
  const drawUnifiedAnimeHand = (
    wrist: P2,
    knuckles: ReadonlyArray<P2>,
    tips: Record<string, readonly [number, number, number]>,
    fingerW: number
  ) => {
    const [kTh, kIn, kMi, kRi, kPi] = knuckles as [P2, P2, P2, P2, P2]
    const wDir = unit(sub(kMi, wrist)), wN = perp(wDir)
    const palmPts = catmull([add(wrist, mul(wN, -22)), kTh, kIn, kMi, kRi, kPi, add(wrist, mul(wN, 22))], 8, true)
    const order = [["pinky", kPi, 0.80], ["ring", kRi, 0.90], ["middle", kMi, 1.0], ["index", kIn, 0.94], ["thumb", kTh, 1.06]] as const
    const fingerPolys = order.map(([name, kn, wf]) => {
      const tp: P2 = [tips[name]![0], tips[name]![1]]
      const fd = sub(tp, kn), u = unit(fd), n = perp(u), hw = fingerW * wf * 0.5
      const mid = lerp2(kn, tp, 0.56)
      return {
        name, kn, tp, mid, n, hw,
        poly: catmull([
          add(kn, mul(n, hw)), add(mid, mul(n, hw * 0.84)), add(tp, mul(n, hw * 0.36)),
          add(tp, mul(u, 3.5)),
          add(tp, mul(n, -hw * 0.36)), add(mid, mul(n, -hw * 0.84)), add(kn, mul(n, -hw)),
        ], 6, true),
      }
    })
    // Pass 1: Thick black silhouette union of palm + all fingers!
    const strokeUnion = (w: number, col: string) => {
      g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = col; g.lineWidth = w
      for (const pts of [palmPts, ...fingerPolys.map((f) => f.poly)]) {
        g.beginPath(); g.moveTo(pts[0]![0], pts[0]![1])
        for (let i = 1; i < pts.length; i++) g.lineTo(pts[i]![0], pts[i]![1])
        g.closePath(); g.stroke(); fillPoly(g, pts, col)
      }
    }
    strokeUnion(6.4, INK)
    // Pass 2: Clean opaque white interior union — instantly erases ALL doll-joint knuckle seams!!
    strokeUnion(0.5, "#ffffff")
    // Pass 3: ONLY draw delicate interior overlap lines between adjacent fingers (from webbing -> tip)!
    for (const f of fingerPolys) {
      const web = lerp2(f.kn, f.tp, 0.14)
      ink(g, [add(web, mul(f.n, f.hw * 0.88)), add(f.mid, mul(f.n, f.hw * 0.80)), add(f.tp, mul(f.n, f.hw * 0.32))], 2.0, { taper: [0.35, 0.25], minTip: 0.6 })
      ink(g, [add(f.mid, mul(f.n, -f.hw * 0.40)), add(f.mid, mul(f.n, f.hw * 0.40))], 1.1, { taper: [0.45, 0.45], minTip: 0.1 })
    }
  }
  drawUnifiedAnimeHand(pWrR, stage1.handRKnuckles, stage1.handRTips, 21)

  // =========================================================================
  // LAYER 6: SCULPTED ANIME FACE + SMOOTH CALLIGRAPHIC EYES, NOSE, MOUTH
  // =========================================================================
  const pEarL = mp("earBotL"), pEarTopL = mp("earTopL"), pEarBotR = mp("earBotR")
  const pCheekL = mp("cheekL"), pJawMidL = mp("jawMidL"), pJawMidR = mp("jawMidR"), pFore = mp("foreheadMid")

  partShape(g, [
    add(pEarTopL, hOff(-0.02, 0.0)), add(pEarTopL, hOff(-0.10, 0.06)),
    add(pEarL, hOff(-0.08, 0.02)), add(pEarL, hOff(0.02, 0.0)),
  ], 3.2)
  partShape(g, [
    add(pFore, hOff(-0.34, -0.05)), add(mp("browOutL"), hOff(-0.08, 0.01)),
    add(pCheekL, hOff(-0.02, 0.02)), add(pJawMidL, hOff(-0.02, 0.01)), add(pChin, hOff(0.0, 0.01)),
    add(pJawMidR, hOff(0.02, 0.0)), add(pJawR, hOff(0.03, -0.02)), pEarBotR,
    add(pFore, hOff(0.34, -0.05)), add(crownPt, hOff(0, 0.06)),
  ], 4.0, { lightMod: 0.42 })
  ink(g, [add(pEarTopL, hOff(-0.04, 0.05)), add(pEarTopL, hOff(-0.07, 0.11)), add(pEarL, hOff(-0.03, -0.02))], 1.6, { taper: [0.35, 0.45] })

  // --- SLEEK CUBIC-BEZIER ANIME EYES (zero Catmull wiggle!) ---
  const drawAnimeEye = (side: "L" | "R") => {
    const eIn = mp(`eyeIn${side}`), eOut = mp(`eyeOut${side}`), eBot = mp(`eyeBot${side}`), eCtr = mp(`eyeCenter${side}`)
    const eyeW = dist(eIn, eOut), ax = unit(sub(eOut, eIn)), up = mul(hy, -1), isFar = side === "L"
    const wing = add(eOut, add(mul(ax, eyeW * 0.24), mul(up, eyeW * 0.14)))

    // One clean sweeping cubic Bezier for upper lash outer & inner edge!
    const uOuter = bezier(
      add(eIn, add(mul(ax, -eyeW * 0.03), mul(up, eyeW * 0.03))),
      add(eIn, add(mul(ax, eyeW * 0.28), mul(up, eyeW * 0.34))),
      add(eOut, add(mul(ax, -eyeW * 0.12), mul(up, eyeW * 0.28))),
      wing, 26
    )
    const uInner = bezier(
      add(eIn, mul(up, eyeW * 0.0)),
      add(eIn, add(mul(ax, eyeW * 0.30), mul(up, eyeW * 0.18))),
      add(eOut, add(mul(ax, -eyeW * 0.18), mul(up, eyeW * 0.14))),
      add(eOut, mul(up, -eyeW * 0.03)), 26
    )
    const lCurve = bezier(
      add(eOut, mul(up, -eyeW * 0.04)),
      add(eOut, add(mul(ax, -eyeW * 0.25), mul(up, -eyeW * 0.22))),
      add(eIn, add(mul(ax, eyeW * 0.25), mul(up, -eyeW * 0.20))),
      eIn, 22
    )
    const aperture = [...uInner, ...lCurve]

    g.save()
    g.beginPath(); g.moveTo(aperture[0]![0], aperture[0]![1])
    for (let i = 1; i < aperture.length; i++) g.lineTo(aperture[i]![0], aperture[i]![1])
    g.closePath(); g.fillStyle = "#ffffff"; g.fill(); g.clip()

    const irisRx = eyeW * (isFar ? 0.30 : 0.31), irisRy = eyeW * (isFar ? 0.34 : 0.32)
    const irisC = add(eCtr, add(mul(ax, isFar ? -eyeW * 0.02 : eyeW * 0.02), mul(up, -eyeW * 0.02)))
    const angle = Math.atan2(hy[1], hy[0]) - Math.PI / 2

    g.save(); g.translate(irisC[0], irisC[1]); g.rotate(angle)
    g.beginPath(); g.ellipse(0, 0, irisRx, irisRy, 0, 0, Math.PI * 2); g.lineWidth = 2.6; g.strokeStyle = INK; g.stroke()
    g.beginPath(); g.ellipse(0, -irisRy * 0.36, irisRx * 0.96, irisRy * 0.62, 0, 0, Math.PI * 2); g.fillStyle = "rgba(16,16,20,0.18)"; g.fill()
    g.beginPath(); g.ellipse(0, irisRy * 0.02, irisRx * 0.38, irisRy * 0.40, 0, 0, Math.PI * 2); g.fillStyle = INK; g.fill()
    g.beginPath(); g.ellipse(0, irisRy * 0.06, irisRx * 0.66, irisRy * 0.64, 0, 0.25, Math.PI - 0.25); g.lineWidth = 1.4; g.strokeStyle = INK; g.stroke()
    g.beginPath(); g.ellipse(-irisRx * 0.36, -irisRy * 0.28, irisRx * 0.25, irisRy * 0.19, -0.25, 0, Math.PI * 2); g.fillStyle = "#ffffff"; g.fill()
    g.beginPath(); g.arc(irisRx * 0.32, irisRy * 0.26, irisRx * 0.11, 0, Math.PI * 2); g.fill()
    g.restore(); g.restore()

    // Crisp sweeping calligraphic upper eyelash blade!
    fillPoly(g, [...uOuter, add(eOut, add(mul(ax, eyeW * 0.06), mul(up, -eyeW * 0.04))), ...uInner.slice().reverse()], INK)
    // Secondary crisp corner lash flick
    const tipBase = uOuter[Math.floor(uOuter.length * 0.78)]!
    ink(g, [tipBase, add(tipBase, add(mul(ax, eyeW * 0.20), mul(up, eyeW * 0.14)))], 2.2, { taper: [0.1, 0.9] })
    // Delicate broken lower lid + subtle lash tick
    ink(g, lCurve.slice(0, Math.floor(lCurve.length * 0.76)), 2.0, { smooth: false, taper: [0.2, 0.65] })
    const lt = lCurve[Math.floor(lCurve.length * 0.16)]!
    ink(g, [lt, add(lt, add(mul(ax, eyeW * 0.09), mul(up, -eyeW * 0.08)))], 1.4, { taper: [0.1, 0.85] })
    // Clean double-eyelid crease arc!
    const crease = bezier(
      add(eIn, add(mul(ax, eyeW * 0.06), mul(up, eyeW * 0.22))),
      add(eIn, add(mul(ax, eyeW * 0.35), mul(up, eyeW * 0.42))),
      add(eOut, add(mul(ax, -eyeW * 0.16), mul(up, eyeW * 0.36))),
      add(eOut, add(mul(ax, -eyeW * 0.02), mul(up, eyeW * 0.20))), 20
    )
    ink(g, crease, 1.5, { smooth: false, taper: [0.45, 0.55] })
  }
  drawAnimeEye("L")
  drawAnimeEye("R")

  const drawBrow = (side: "L" | "R", alpha = 1) => {
    ink(g, [mp(`browIn${side}`), mp(`browPeak${side}`), mp(`browOut${side}`)], 3.4, { taper: [0.35, 0.65], color: alpha < 1 ? "rgba(16,16,20,0.52)" : INK })
  }
  drawBrow("L", 1); drawBrow("R", 1)

  const pNose = mp("noseTip"), pNoseBase = mp("noseBase")
  ink(g, [add(pNose, hOff(0.014, -0.026)), pNose, add(pNoseBase, hOff(-0.016, 0.004))], 2.1, { taper: [0.4, 0.65] })
  fillPoly(g, [add(pNoseBase, hOff(0.012, 0.0)), add(pNoseBase, hOff(0.022, 0.004)), add(pNoseBase, hOff(0.014, 0.010))], INK)

  const pML = mp("mouthL"), pMM = mp("mouthMid"), pMR = mp("mouthR"), pLL = mp("lowerLip")
  ink(g, [add(pML, hOff(-0.008, -0.004)), lerp2(pML, pMM, 0.55), add(pMM, hOff(-0.012, 0.006))], 2.3, { taper: [0.3, 0.65] })
  ink(g, [add(pMM, hOff(0.016, 0.004)), lerp2(pMM, pMR, 0.55), add(pMR, hOff(0.018, -0.014))], 2.5, { taper: [0.65, 0.25] })
  ink(g, [add(pLL, hOff(-0.025, 0.004)), add(pLL, hOff(0.005, 0.010)), add(pLL, hOff(0.028, 0.002))], 1.5, { taper: [0.45, 0.45] })

  // =========================================================================
  // LAYER 7: FRONT & SIDE HAIR (parted cleanly so BOTH eyes shine!) + HEADSET + HAND L
  // =========================================================================
  const capPts: Array<P2> = [
    add(crownPt, hOff(-0.48, 0.34)), add(crownPt, hOff(-0.46, 0.08)), add(crownPt, hOff(-0.18, -0.06)),
    add(crownPt, hOff(0.16, -0.05)), add(crownPt, hOff(0.42, 0.14)), add(crownPt, hOff(0.46, 0.38)),
    add(crownPt, hOff(0.0, 0.22)),
  ]
  fillPoly(g, catmull(capPts, 10, true), "#ffffff")
  ink(g, capPts.slice(0, 6), 5.2, { taper: [0.1, 0.1], minTip: 2.0, lightMod: 0.35 })

  // Dynamic ahoge
  drawHairLock(g, [
    add(partPt, hOff(0.0, -0.06)), add(partPt, hOff(-0.14, -0.19)), add(partPt, hOff(-0.34, -0.15)), add(partPt, hOff(-0.45, -0.05)),
  ].map((p, i) => [p[0], p[1], [24, 20, 12, 1][i]!] as const), { wOut: 3.4, inner: 0 })

  // Side face-framing locks
  drawHairLock(g, [
    add(partPt, hOff(-0.22, 0.08)), add(partPt, hOff(-0.50, 0.36)), add(partPt, hOff(-0.54, 0.68)),
    add(partPt, hOff(-0.36, 0.94)), add(partPt, hOff(-0.18, 1.04)),
  ].map((p, i) => [p[0], p[1], [68, 72, 60, 34, 2][i]!] as const), { wOut: 4.2 })

  drawHairLock(g, [
    add(partPt, hOff(0.24, 0.12)), add(partPt, hOff(0.42, 0.42)), add(partPt, hOff(0.44, 0.72)),
    add(partPt, hOff(0.28, 0.96)), add(partPt, hOff(0.14, 1.04)),
  ].map((p, i) => [p[0], p[1], [54, 58, 48, 26, 2][i]!] as const), { wOut: 3.8 })

  // Sweeping bangs framed CLEARLY around BOTH eyes (center bang between eyes, left bang arching outside left eye!)
  drawHairLock(g, [
    add(partPt, hOff(-0.12, 0.05)), add(partPt, hOff(-0.32, 0.24)), add(partPt, hOff(-0.38, 0.44)), add(partPt, hOff(-0.32, 0.58)),
  ].map((p, i) => [p[0], p[1], [48, 52, 34, 1.5][i]!] as const), { wOut: 3.6 })

  drawHairLock(g, [
    add(partPt, hOff(0.10, 0.05)), add(partPt, hOff(0.24, 0.22)), add(partPt, hOff(0.32, 0.40)), add(partPt, hOff(0.26, 0.52)),
  ].map((p, i) => [p[0], p[1], [44, 48, 30, 1.5][i]!] as const), { wOut: 3.4 })

  // Hero center bang lock sweeping cleanly down the nose-bridge midline between eyes!
  drawHairLock(g, [
    add(partPt, hOff(0.01, 0.02)), add(partPt, hOff(-0.04, 0.22)), add(partPt, hOff(-0.02, 0.44)), add(partPt, hOff(0.05, 0.62)),
  ].map((p, i) => [p[0], p[1], [54, 58, 34, 1.5][i]!] as const), { wOut: 3.8 })

  drawBrow("L", 0.52); drawBrow("R", 0.52)

  // Tech Comms Headset
  const cup = jp("cupCenter"), cupAng = Math.atan2(hy[1], hy[0]) - Math.PI / 2
  const hbPts = [add(crownPt, hOff(0.02, -0.07)), add(crownPt, hOff(0.26, -0.01)), add(crownPt, hOff(0.42, 0.18)), add(cup, hOff(0.04, -0.16))]
  const hbIn = hbPts.map((p, i) => add(p, hOff(-0.04, 0.04 + i * 0.005)))
  fillPoly(g, [...catmull(hbPts, 8, false), ...catmull(hbIn, 8, false).reverse()], "#ffffff")
  ink(g, hbPts, 4.4, { taper: [0.06, 0.05], minTip: 2.0 })
  ink(g, hbIn, 3.2, { taper: [0.06, 0.05], minTip: 1.8 })
  const drawEllipsePart = (cx: number, cy: number, rx: number, ry: number, ang: number, lw: number) => {
    g.save(); g.translate(cx, cy); g.rotate(ang)
    g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); g.fillStyle = "#ffffff"; g.fill()
    g.lineWidth = lw; g.strokeStyle = INK; g.stroke(); g.restore()
  }
  drawEllipsePart(cup[0] - 8, cup[1] + 4, 48, 66, cupAng - 0.12, 4.6)
  drawEllipsePart(cup[0] + 6, cup[1] + 2, 42, 58, cupAng - 0.12, 4.2)
  drawEllipsePart(cup[0] + 14, cup[1] + 2, 30, 44, cupAng - 0.12, 3.0)

  // Unified Organic Raised Hand L touching headset!
  drawUnifiedAnimeHand(pWrL, stage1.handLKnuckles, stage1.handLTips, 19)

  g.restore()

  // ---- Export & Gate ----
  const { c: finalC, g: fg } = mkCanvas(W, H)
  fg.imageSmoothingQuality = "high"
  fg.drawImage(inkC, 0, 0, W, H)

  const img = fg.getImageData(0, 0, W, H).data
  const N = W * H
  const dark = new Uint8Array(N)
  let darkCnt = 0, blackCnt = 0
  for (let i = 0; i < N; i++) {
    const lum = 0.299 * img[i * 4]! + 0.587 * img[i * 4 + 1]! + 0.114 * img[i * 4 + 2]!
    if (lum < 150) { dark[i] = 1; darkCnt++ }
    if (lum < 50) blackCnt++
  }
  const runs: Array<number> = []
  for (let y = 0; y < H; y += 2) {
    let r = 0
    for (let x = 0; x < W; x++) {
      if (dark[y * W + x]) r++
      else { if (r > 0 && r < 40) runs.push(r); r = 0 }
    }
  }
  runs.sort((a, b) => a - b)
  const q = (p: number) => runs[Math.floor(runs.length * p)] || 0

  // Flood fill from all 4 outer border white pixels to test true exterior closure!
  const bg = new Uint8Array(N), stack = new Int32Array(N)
  let sp = 0
  const seed = (x: number, y: number) => { const i = y * W + x; if (!bg[i] && !dark[i]) { bg[i] = 1; stack[sp++] = i } }
  for (let x = 0; x < W; x++) { seed(x, 0); seed(x, H - 1) }
  for (let y = 0; y < H; y++) { seed(0, y); seed(W - 1, y) }
  while (sp > 0) {
    const idx = stack[--sp]!, x = idx % W, y = (idx / W) | 0
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]] as const) {
      if (nx >= 0 && ny >= 0 && nx < W && ny < H) { const j = ny * W + nx; if (!bg[j] && !dark[j]) { bg[j] = 1; stack[sp++] = j } }
    }
  }
  let interiorPx = 0
  for (let i = 0; i < N; i++) if (!bg[i]) interiorPx++

  const { c: silC, g: sg } = mkCanvas(W, H)
  const sImg = sg.createImageData(W, H)
  for (let i = 0; i < N; i++) { const v = bg[i] ? 255 : 18; sImg.data[i * 4] = v; sImg.data[i * 4 + 1] = v; sImg.data[i * 4 + 2] = v; sImg.data[i * 4 + 3] = 255 }
  sg.putImageData(sImg, 0, 0)

  const pw = 420, ph = 630
  const { c: revC, g: rg } = mkCanvas(pw * 4 + 18, ph)
  rg.fillStyle = "#e8eaef"; rg.fillRect(0, 0, revC.width, revC.height)
  rg.drawImage(finalC, 0, 0, pw, ph)
  rg.drawImage(silC, pw + 6, 0, pw, ph)
  rg.save(); rg.translate((pw + 6) * 2 + pw, 0); rg.scale(-1, 1); rg.drawImage(finalC, 0, 0, pw, ph); rg.restore()
  const gImg = new Image()
  await new Promise<void>((res) => { gImg.onload = () => res(); gImg.src = guideUrl })
  rg.save(); rg.globalAlpha = 0.45; rg.drawImage(gImg, (pw + 6) * 3, 0, pw, ph); rg.globalAlpha = 1; rg.globalCompositeOperation = "multiply"; rg.drawImage(finalC, (pw + 6) * 3, 0, pw, ph); rg.restore()

  const cw = 480, ch = 480
  const { c: cropC, g: cg } = mkCanvas(cw * 3 + 12, ch)
  cg.fillStyle = "#e8eaef"; cg.fillRect(0, 0, cropC.width, cropC.height)
  const drawCrop = (dx: number, cx: number, cy: number, box: number) => cg.drawImage(finalC, cx - box / 2, cy - box / 2, box, box, dx, 0, cw, ch)
  drawCrop(0, mp("noseBridge")[0], mp("noseBridge")[1], 360)
  drawCrop(cw + 6, jp("cupCenter")[0] + 35, jp("cupCenter")[1] + 50, 340)
  drawCrop((cw + 6) * 2, jp("buckle")[0] - 40, jp("buckle")[1], 440)

  return {
    lineart: finalC.toDataURL("image/png"),
    review: revC.toDataURL("image/png"),
    crops: cropC.toDataURL("image/png"),
    metrics: {
      inkPct: +(100 * darkCnt / N).toFixed(1),
      blackPct: +(100 * blackCnt / N).toFixed(1),
      closedFigurePct: +(100 * interiorPx / N).toFixed(1),
      p25: q(0.25), p50: q(0.5), p75: q(0.75), p90: q(0.9), p95: q(0.95),
    },
  }
}

const b = await chromium.launch()
const p = await b.newPage()
const res = await p.evaluate(renderScript, [data, `data:image/png;base64,${guideB64}`] as const)
await b.close()

const save = (name: string, url: string) => writeFileSync(name, Buffer.from(url.split(",")[1]!, "base64"))
save("exp/out/stage2-v2-lineart.png", res.lineart)
save("exp/out/stage2-v2-review.png", res.review)
save("exp/out/stage2-v2-crops.png", res.crops)
console.log("=== STAGE 2 (v2) INK & CLOSURE GATE ===")
console.log(JSON.stringify(res.metrics, null, 2))
