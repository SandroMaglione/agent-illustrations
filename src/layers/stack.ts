/**
 * A layer stack as a drawing program sees it, and how it composites. Formulas are the ones measured for CLIP STUDIO PAINT
 * (wamsoft/clipparse, docs/CLIP_FORMAT.md §9: max error 0 or 1 against CSP's own preview); PSD readers agree for these modes.
 * Everything here runs without a browser.
 */
export type Mode = "normal" | "multiply" | "add" | "dodge" | "linearLight" | "overlay" | "screen"
/** Straight-alpha RGBA cut to a box on the canvas. `group` is the folder's path, "Colour/Jacket". `clip`: clipped to the layer below that is not. */
export type Layer = { name: string; group: string; mode: Mode; opacity: number; visible: boolean; x: number; y: number; w: number; h: number; rgba: Uint8Array; clip?: boolean }
/** Bottom first, as in every format here. A run of layers with the same path is one folder. `sealed`: folders with a normal mode, the rest are pass-through. `clipped`: folder paths clipped to the layer directly below them. */
export type Stack = { w: number; h: number; layers: Array<Layer>; sealed?: ReadonlyArray<string>; clipped?: ReadonlyArray<string> }
/** The stack as a tree, bottom first. */
export type Node = { folder: string; path: string; sealed: boolean; clip: boolean; kids: Array<Node> } | { layer: Layer }
export const tree = (s: Stack): Array<Node> => {
  const root: Array<Node> = []
  for (const layer of s.layers) {
    let at = root, path = ""
    for (const part of layer.group ? layer.group.split("/") : []) {
      path = path ? `${path}/${part}` : part
      const last = at.at(-1)
      if (last && "folder" in last && last.path === path) { at = last.kids; continue }
      const clip = (s.clipped ?? []).includes(path)
      const f = { folder: part, path, sealed: clip || (s.sealed ?? []).includes(path), clip, kids: [] as Array<Node> }
      at.push(f); at = f.kids
    }
    at.push({ layer })
  }
  return root
}

export const blend = (m: Mode, b: number, s: number): number => {
  switch (m) {
    case "normal": return s
    case "multiply": return (b * s) / 255
    case "add": return Math.min(255, b + s)
    case "dodge": return s >= 255 ? 255 : Math.min(255, b / (1 - s / 255))
    case "screen": return b + s - (b * s) / 255
    case "linearLight": return Math.max(0, Math.min(255, b + 2 * s - 255))
    case "overlay": return b < 128 ? (2 * b * s) / 255 : 255 - (2 * (255 - b) * (255 - s)) / 255
  }
}
/**
 * Composites onto an opaque canvas (the bottom layer covers it, or white does). A base and the layers clipped to it are one
 * group that keeps the base's alpha, as CSP does it (0 error on 19,569 soft pixels of a file CSP saved, `docs/layers-internals.md`).
 * Folders need nothing: pass-through ones are only an order, and a sealed one holds clipping groups or normal layers alone.
 * `bits8` rounds after every layer, as an 8-bit program would; otherwise it stays in floats.
 */
export const composite = (s: Stack, bits8 = true): Uint8ClampedArray => {
  const N = s.w * s.h, c = new Float32Array(N * 3).fill(255), round = (v: number): number => (bits8 ? Math.round(Math.max(0, Math.min(255, v))) : v)
  const isClipped = (n: Node): boolean => ("layer" in n ? Boolean(n.layer.clip) : n.clip)
  const renderNode = (node: Node): { rgb: Float32Array; alpha: Float32Array; mode: Mode; opacity: number; visible: boolean } => {
    if ("layer" in node) {
      const L = node.layer, rgb = new Float32Array(N * 3), alpha = new Float32Array(N)
      if (!L.visible) return { rgb, alpha, mode: L.mode, opacity: L.opacity, visible: false }
      for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
        const p = (y * L.w + x) * 4, A = L.rgba[p + 3]!
        if (!A) continue
        const X = x + L.x, Y = y + L.y
        if (X < 0 || Y < 0 || X >= s.w || Y >= s.h) continue
        const i = Y * s.w + X
        rgb[i * 3] = L.rgba[p]!; rgb[i * 3 + 1] = L.rgba[p + 1]!; rgb[i * 3 + 2] = L.rgba[p + 2]!; alpha[i] = A / 255
      }
      return { rgb, alpha, mode: L.mode, opacity: L.opacity, visible: true }
    }
    const rgb = new Float32Array(N * 3), alpha = new Float32Array(N)
    const drawInto = (kids: Array<Node>): void => {
      for (let i = 0; i < kids.length; i++) {
        const cur = kids[i]!, over: Array<Node> = []
        while (i + 1 < kids.length && isClipped(kids[i + 1]!)) over.push(kids[++i]!)
        if ("folder" in cur && !cur.sealed) { drawInto(cur.kids); continue }
        const base = renderNode(cur)
        if (!base.visible) continue
        const ovs = over.map(renderNode).filter((o) => o.visible)
        const op = Math.round(base.opacity * 256) / 256
        for (let p = 0; p < N; p++) {
          const ab = base.alpha[p]!
          if (ab <= 0) continue
          const g = [base.rgb[p * 3]!, base.rgb[p * 3 + 1]!, base.rgb[p * 3 + 2]!]
          for (const T of ovs) {
            const ta = T.alpha[p]! * T.opacity
            if (ta > 0) for (let k = 0; k < 3; k++) g[k] = round(g[k]! + (blend(T.mode, g[k]!, T.rgb[p * 3 + k]!) - g[k]!) * ta)
          }
          const as = ab * op, ad = alpha[p]!, ao = as + ad * (1 - as)
          for (let k = 0; k < 3; k++) {
            const sv = g[k]!, bv = rgb[p * 3 + k]!
            rgb[p * 3 + k] = round(((1 - ad) * as * sv + ad * as * blend(base.mode, bv, sv) + (1 - as) * ad * bv) / ao)
          }
          alpha[p] = ao
        }
      }
    }
    drawInto(node.kids)
    return { rgb, alpha, mode: "normal", opacity: 1, visible: true }
  }
  const drawRoot = (nodes: Array<Node>): void => {
    for (let i = 0; i < nodes.length; i++) {
      const cur = nodes[i]!, over: Array<Node> = []
      while (i + 1 < nodes.length && isClipped(nodes[i + 1]!)) over.push(nodes[++i]!)
      if ("folder" in cur && !cur.sealed) { drawRoot(cur.kids); continue }
      if ("layer" in cur && !over.some((o) => "folder" in o)) {
        const L = cur.layer
        if (!L.visible) continue
        const ovL = over.map((o) => ("layer" in o ? o.layer : null)).filter((x): x is Layer => x !== null)
        const op = Math.round(L.opacity * 256) / 256, g = [0, 0, 0]
        for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
          const p = (y * L.w + x) * 4, A = L.rgba[p + 3]!
          if (!A) continue
          const X = x + L.x, Y = y + L.y
          if (X < 0 || Y < 0 || X >= s.w || Y >= s.h) continue
          for (let k = 0; k < 3; k++) g[k] = L.rgba[p + k]!
          for (const T of ovL) { if (!T.visible) continue; const tx = X - T.x, ty = Y - T.y; if (tx < 0 || ty < 0 || tx >= T.w || ty >= T.h) continue; const t = (ty * T.w + tx) * 4, ta = (T.rgba[t + 3]! / 255) * T.opacity; if (ta) for (let k = 0; k < 3; k++) g[k] = round(g[k]! + (blend(T.mode, g[k]!, T.rgba[t + k]!) - g[k]!) * ta) }
          const q = (Y * s.w + X) * 3, a = (A / 255) * op
          for (let k = 0; k < 3; k++) { const b = c[q + k]!; c[q + k] = round(b + (blend(L.mode, b, g[k]!) - b) * a) }
        }
        continue
      }
      const base = renderNode(cur)
      if (!base.visible) continue
      const ovs = over.map(renderNode).filter((o) => o.visible)
      const op = Math.round(base.opacity * 256) / 256
      for (let p = 0; p < N; p++) {
        const ab = base.alpha[p]!
        if (ab <= 0) continue
        const g = [base.rgb[p * 3]!, base.rgb[p * 3 + 1]!, base.rgb[p * 3 + 2]!]
        for (const T of ovs) {
          const ta = T.alpha[p]! * T.opacity
          if (ta > 0) for (let k = 0; k < 3; k++) g[k] = round(g[k]! + (blend(T.mode, g[k]!, T.rgb[p * 3 + k]!) - g[k]!) * ta)
        }
        const a = ab * op
        for (let k = 0; k < 3; k++) { const b = c[p * 3 + k]!; c[p * 3 + k] = round(b + (blend(base.mode, b, g[k]!) - b) * a) }
      }
    }
  }
  drawRoot(tree(s))
  return Uint8ClampedArray.from(c)
}
/** How far two RGB images are apart: the largest step, the mean, and how many pixels differ by more than 2 and 8. */
export const compare = (a: ArrayLike<number>, b: ArrayLike<number>): { max: number; mean: number; over2: number; over8: number; n: number } => {
  let max = 0, sum = 0, over2 = 0, over8 = 0
  const n = a.length / 3
  for (let i = 0; i < n; i++) { let m = 0; for (let k = 0; k < 3; k++) { const d = Math.abs(a[i * 3 + k]! - b[i * 3 + k]!); sum += d; if (d > m) m = d } if (m > max) max = m; if (m > 2) over2++; if (m > 8) over8++ }
  return { max, mean: sum / (n * 3), over2, over8, n }
}
