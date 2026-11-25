/** Shadow shapes an agent drew over the form. */
export type Shadow = { on: ReadonlyArray<string>; tone: "S" | "X" | "H" | "D" | "L" | "R" | "C"; d: string; add?: boolean }
export const path = (g: CanvasRenderingContext2D, d: string, k: number): void => {
  const p = d.trim().split(/\s+/).map((t) => { const [x, y] = t.replace("~", "").split(",").map(Number); return { x: x! * k, y: y! * k, soft: t.endsWith("~") } }), n = p.length
  const s = Math.max(0, p.findIndex((q) => !q.soft))
  g.beginPath(); g.moveTo(p[s]!.x, p[s]!.y)
  for (let i = 1; i <= n; i++) {
    const q = p[(s + i) % n]!
    if (!q.soft) { g.lineTo(q.x, q.y); continue }
    // a run of soft points: a smooth curve through the middles between them
    const r = p[(s + i + 1) % n]!, a = r.soft ? (q.x + r.x) / 2 : r.x, b = r.soft ? (q.y + r.y) / 2 : r.y
    g.quadraticCurveTo(q.x, q.y, a, b)
    if (!r.soft) i++
  }
  g.closePath()
}
