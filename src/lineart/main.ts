import { blur, flood } from "./flood.ts"
import { SEEDS } from "./seeds.ts"

export const loadInk = async (url: string, k: number): Promise<{ ink: Float32Array; w: number; h: number; img: HTMLImageElement }> => {
  const img = new Image()
  img.src = url
  await img.decode()
  const w = img.width * k, h = img.height * k
  const c = document.createElement("canvas")
  c.width = w; c.height = h
  const g = c.getContext("2d")!
  g.fillStyle = "#fff"
  g.fillRect(0, 0, w, h)
  g.imageSmoothingQuality = "high"
  g.drawImage(img, 0, 0, w, h)
  const d = g.getImageData(0, 0, w, h).data
  const ink = new Float32Array(w * h)
  for (let i = 0; i < ink.length; i++) ink[i] = 1 - (d[i * 4]! * 0.3 + d[i * 4 + 1]! * 0.59 + d[i * 4 + 2]! * 0.11) / 255
  return { ink: k > 1 ? blur(ink, w, h, 1, 1) : ink, w, h, img }
}
/** Region overlay, for checking seeds. */
export const regionsView = async (g: CanvasRenderingContext2D, W: number, H: number): Promise<void> => {
  const { ink, w, h } = await loadInk("/sketch.png", 1)
  const r = flood(ink, w, h, SEEDS, 1)
  const c = document.createElement("canvas")
  c.width = w; c.height = h
  const cg = c.getContext("2d")!
  const im = cg.createImageData(w, h)
  const pal = r.names.map((_, n) => { const a = n * 137.5; const f = (o: number): number => 150 + 95 * Math.cos(((a + o) * Math.PI) / 180); return [f(0), f(120), f(240)] })
  for (let i = 0; i < r.map.length; i++) {
    const p = pal[r.map[i]!]!
    const s = 1 - Math.min(1, ink[i]! * 1.3)
    im.data[i * 4] = p[0]! * s; im.data[i * 4 + 1] = p[1]! * s; im.data[i * 4 + 2] = p[2]! * s; im.data[i * 4 + 3] = 255
  }
  cg.putImageData(im, 0, 0)
  const s = Math.min(W / w, H / h)
  g.drawImage(c, 0, 0, w * s, h * s)
}
