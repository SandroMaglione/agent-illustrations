/**
 * The blockout of a drawing: is every form where it was drawn, and does it read as a solid figure from other sides?
 * node scripts/form.ts name outdir [zoom piece:x,y,w,h …]   writes fit.png, clay.png, turn.png, view.html and a fit table.
 * The region map is read once from the dev server and kept in output/form; add --fresh after the clicks change.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { png } from "../src/form/png.ts"
import { raster } from "../src/form/raster.ts"
import type { Buffer as ZB } from "../src/form/raster.ts"
import { dot, unit } from "../src/form/mesh.ts"
import type { Part, V3 } from "../src/form/mesh.ts"
import { drawing } from "../src/form/snap.ts"
import { settle } from "../src/form/settle.ts"
import { viewer } from "../src/form/viewer.ts"

const args = process.argv.slice(2).filter((a) => !a.startsWith("--")), [name, dir, zoom, ...pieces] = args, cache = `output/form/${name}`
mkdirSync(dir!, { recursive: true }); mkdirSync("output/form", { recursive: true })
if (!existsSync(`${cache}.json`) || process.argv.includes("--fresh")) {
  const { base, open } = await import("./page.ts"), { b, p } = await open()
  await p.goto(`${base}favicon.ico`)
  const r = await p.evaluate(async (name) => {
    const { artOf } = await import(/* @vite-ignore */ "/src/splash/index.ts" as string), { regionsOf } = await import(/* @vite-ignore */ "/src/splash/engine.ts" as string), q = await regionsOf(await artOf(name), 1), enc = (u: Uint8Array): string => { let s = ""; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode(...u.subarray(i, i + 8192)); return btoa(s) }
    return { w: q.w as number, h: q.h as number, names: q.names as Array<string>, map: enc(q.map), ink: enc(Uint8Array.from(q.ink as Float32Array, (v) => Math.round(v * 255))) }
  }, name!)
  writeFileSync(`${cache}.json`, JSON.stringify(r)); await b.close()
}
const R = JSON.parse(readFileSync(`${cache}.json`, "utf8")) as { w: number; h: number; names: Array<string>; map: string; ink: string }, map = new Uint8Array(Buffer.from(R.map, "base64")), ink = new Uint8Array(Buffer.from(R.ink, "base64")), { w, h, names } = R
drawing({ w, h, map, names })
const raw = (await import(`../src/splash/${name}-form.ts`)) as { parts: ReadonlyArray<Part>; groups: Readonly<Record<string, string>>; bones?: ReadonlyArray<readonly [string, number, number]>; pivot: V3; light?: { fall: readonly [number, number]; up: number }; head?: number }
const groupOf = new Map<string, string>()
for (const [g, l] of Object.entries(raw.groups)) for (const n of l.split(/\s+/)) groupOf.set(n, g)
const M = { ...raw, parts: process.argv.includes("--raw") ? raw.parts : settle(raw.parts, { w, h, map, names }, groupOf, { reach: (14 * (raw.head ?? 205)) / 205, soft: (7 * (raw.head ?? 205)) / 205 }) }
const hue = new Map<string, readonly [number, number, number]>(); [...new Set(M.parts.map((p) => p.group))].forEach((g, i) => { const t = (i * 0.618034) % 1, f = (o: number): number => 0.45 + 0.4 * Math.cos(6.283 * (t + o)); hue.set(g, [f(0), f(0.33), f(0.67)]) })

// ---- fit
const B = raster(M.parts, w, h)
const st = new Map<string, { r: number; m: number; both: number; spill: Map<string, number>; miss: Map<string, number> }>(), at = (g: string) => { let s = st.get(g); if (!s) { s = { r: 0, m: 0, both: 0, spill: new Map(), miss: new Map() }; st.set(g, s) } return s }, up = (m: Map<string, number>, k: string): void => { m.set(k, (m.get(k) ?? 0) + 1) }
let figure = 0, hit = 0, right = 0, over = 0
const bad = new Set<string>()
for (let i = 0; i < w * h; i++) {
  const n = names[map[i]!]!
  let rg = n === "bg" || !n ? "bg" : groupOf.get(n) ?? (bad.add(n), "?" + n)
  const mg = B.part[i]! < 0 ? "none" : M.parts[B.part[i]!]!.group
  if (rg === "*" && mg !== "none") rg = mg
  if (rg !== "bg") { figure++; if (mg !== "none") hit++; if (mg === rg) right++; const s = at(rg); s.r++; if (mg === rg) s.both++; else up(s.miss, mg) } else if (mg !== "none") over++
  if (mg !== "none") { const s = at(mg); s.m++; if (mg !== rg) up(s.spill, rg) }
}
const worst = (m: Map<string, number>): string => [...m].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} ${v}`).join(", ")
if (raw.head && "face" in raw) console.log(`head pose misses its marks by ${(raw as unknown as { face: { err: number } }).face.err.toFixed(1)} px`)
console.log(`figure covered ${((hit / figure) * 100).toFixed(1)}%   right form ${((right / figure) * 100).toFixed(1)}%   outside the figure ${((over / figure) * 100).toFixed(1)}%   triangles ${M.parts.reduce((a, p) => a + p.mesh.f.length, 0)}`)
for (const [g, s] of [...st].sort((a, b) => b[1].r - a[1].r)) console.log(`${g.padEnd(10)} region ${String(s.r).padStart(6)}  iou ${(s.both / (s.r + s.m - s.both)).toFixed(2)}  shows instead: ${worst(s.miss) || "-"}   | spills on: ${worst(s.spill) || "-"}`)
if (bad.size) console.log("no form yet:", [...bad].join(" "))
for (const [n, a, b] of M.bones ?? []) console.log(`bone ${n.padEnd(12)} left ${a.toFixed(0)}  right ${b.toFixed(0)}  ${Math.abs(a - b) / Math.max(a, b) > 0.06 ? "<-- differ" : ""}`)

// ---- pictures
const L = unit([-0.55, -0.62, 0.56])
const clay = (b: ZB, x: number, color: boolean): readonly [number, number, number] => {
  const p = b.part[x]!
  if (p < 0) return [248, 248, 250]
  const l = 0.32 + 0.68 * Math.max(0, dot([b.n[x * 3]!, b.n[x * 3 + 1]!, b.n[x * 3 + 2]!], L)), c = color ? hue.get(M.parts[p]!.group)! : [0.86, 0.85, 0.84] as const
  return [c[0] * l * 255, c[1] * l * 255, c[2] * l * 255]
}
/** box of the drawing at zoom z: what = clay | parts | wire (over the line art) | miss */
const shot = (what: string, bx: readonly [number, number, number, number], z: number, view?: (v: V3) => V3): { rgb: Uint8Array; W: number; H: number } => {
  const W = Math.round(bx[2] * z), H = Math.round(bx[3] * z), b = raster(M.parts, W, H, (v) => { const q = view ? view(v) : v; return [(q[0] - bx[0]) * z, (q[1] - bx[1]) * z, q[2] * z] }), rgb = new Uint8Array(W * H * 3)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, u = Math.floor(x / z + bx[0]), v = Math.floor(y / z + bx[1]), j = v * w + u, inn = u >= 0 && v >= 0 && u < w && v < h, k = inn && !view ? ink[j]! / 255 : 0
    let c: readonly [number, number, number] = [255, 255, 255]
    if (what === "clay" || what === "parts") c = clay(b, i, what === "parts")
    if (what === "over") { const q = clay(b, i, true); c = [q[0], q[1], q[2]] }
    if (what === "miss") { const rg = inn ? (names[map[j]!] === "bg" ? "bg" : groupOf.get(names[map[j]!]!) ?? "?") : "bg", mg = b.part[i]! < 0 ? "none" : M.parts[b.part[i]!]!.group; c = rg === "bg" ? (mg === "none" ? [255, 255, 255] : [235, 60, 60]) : mg === "none" ? [60, 110, 240] : mg === rg || rg === "*" ? [214, 214, 214] : [240, 180, 60] }
    const edge = b.part[i]! >= 0 && ((x + 1 < W && b.tri[i] !== b.tri[i + 1]) || (y + 1 < H && b.tri[i] !== b.tri[i + W])), form = (x + 1 < W && b.part[i] !== b.part[i + 1]) || (y + 1 < H && b.part[i] !== b.part[i + W])
    if (what === "wire") { if (edge) c = [120, 170, 235]; if (form) c = [30, 90, 220] }
    if (what === "parts" || what === "clay") { if (edge) c = [c[0] * 0.9, c[1] * 0.9, c[2] * 0.9]; if (form) c = [c[0] * 0.55, c[1] * 0.55, c[2] * 0.55] }
    if (what !== "clay" && !view) c = [c[0] * (1 - k), c[1] * (1 - k), c[2] * (1 - k)]
    rgb[i * 3] = c[0]; rgb[i * 3 + 1] = c[1]; rgb[i * 3 + 2] = c[2]
  }
  return { rgb, W, H }
}
const row = (list: ReadonlyArray<{ rgb: Uint8Array; W: number; H: number }>): Buffer => { const W = list.reduce((a, s) => a + s.W + 6, -6), H = Math.max(...list.map((s) => s.H)), o = new Uint8Array(W * H * 3).fill(255); let x0 = 0; for (const s of list) { for (let y = 0; y < s.H; y++) o.set(s.rgb.subarray(y * s.W * 3, (y + 1) * s.W * 3), (y * W + x0) * 3); x0 += s.W + 6 } return png(o, W, H) }
const turned = (yaw: number, pitch = 0) => (v: V3): V3 => { const x = v[0] - M.pivot[0], y = v[1] - M.pivot[1], z = v[2] - M.pivot[2], X = x * Math.cos(yaw) + z * Math.sin(yaw), Z = -x * Math.sin(yaw) + z * Math.cos(yaw); return [X + M.pivot[0], y * Math.cos(pitch) - Z * Math.sin(pitch) + M.pivot[1], y * Math.sin(pitch) + Z * Math.cos(pitch) + M.pivot[2]] }
const all = [0, 0, w, h] as const
writeFileSync(`${dir}/fit.png`, row([shot("wire", all, 0.8), shot("parts", all, 0.8), shot("miss", all, 0.8)]))
writeFileSync(`${dir}/turn.png`, row([-60, -30, 0, 35, 90].map((a) => shot("clay", [60, 0, 900, h], 0.6, turned((a * Math.PI) / 180)))))
writeFileSync(`${dir}/clay.png`, row([shot("clay", all, 1)]))
for (const j of pieces) { const [id, bx] = j.split(":"), q = bx!.split(",").map(Number) as [number, number, number, number], z = Number(zoom); writeFileSync(`${dir}/${id}.png`, row([shot("wire", q, z), shot("parts", q, z), shot("miss", q, z)])); const c: V3 = [q[0] + q[2] / 2, q[1] + q[3] / 2, 0]; writeFileSync(`${dir}/${id}-turn.png`, row([-70, -35, 0, 35, 70].map((a) => { const t = turned((a * Math.PI) / 180), o = t(c); return shot("clay", q, z * 0.6, (v) => { const m = t(v); return [m[0] - o[0] + c[0], m[1], m[2]] }) }))) }
writeFileSync(`${dir}/view.html`, viewer(M.parts, M.pivot, w, h, ink, hue))

// ---- what it says about every pixel, for the renderer
if (process.argv.includes("--field")) {
  const { field } = await import("../src/form/field.ts"), q = raw.light ?? { fall: [0.8, 0.6], up: 0.5 }, l = Math.hypot(...q.fall), flat = Math.sqrt(1 - q.up * q.up), f = field(M.parts, { w, h, map, names }, groupOf, [(-q.fall[0]! / l) * flat, (-q.fall[1]! / l) * flat, q.up], raw.head ?? 205)
  // nx ny, depth, distance to what casts on it, enclosure, sky: one byte each
  const o = new Uint8Array(w * h * 7)
  for (let i = 0; i < w * h; i++) if (f.has[i]) { o[i * 7] = 1; o[i * 7 + 1] = Math.round(f.n[i * 3]! * 127 + 128); o[i * 7 + 2] = Math.round(f.n[i * 3 + 1]! * 127 + 128); o[i * 7 + 3] = Math.max(0, Math.min(255, Math.round(f.z[i]! / 2 + 128))); o[i * 7 + 4] = f.hit[i]! > 0 ? Math.max(1, Math.min(255, Math.round(f.hit[i]!))) : 0; o[i * 7 + 5] = Math.round(Math.min(1, f.shut[i]!) * 255); o[i * 7 + 6] = f.sky[i]! * 255 }
  mkdirSync("public/wip", { recursive: true }); writeFileSync(`public/wip/${name}-field.bin`, o)
  const L3: V3 = [(-q.fall[0]! / l) * flat, (-q.fall[1]! / l) * flat, q.up], pic = (fn: (i: number) => number): { rgb: Uint8Array; W: number; H: number } => { const rgb = new Uint8Array(w * h * 3).fill(255); for (let i = 0; i < w * h; i++) if (f.has[i]) { const k = 1 - ink[i]! / 255; rgb[i * 3] = rgb[i * 3 + 1] = rgb[i * 3 + 2] = fn(i) * k } return { rgb, W: w, H: h } }, lam = (i: number): number => f.n[i * 3]! * L3[0] + f.n[i * 3 + 1]! * L3[1] + f.n[i * 3 + 2]! * L3[2]
  writeFileSync(`${dir}/tones.png`, row([pic((i) => (lam(i) < 0.1 ? 110 : lam(i) < 0.34 ? 190 : 250)), pic((i) => (lam(i) < 0.1 ? 110 : f.hit[i]! > 0 ? (f.hit[i]! < 14 ? 60 : 150) : 250)), pic((i) => 250 - f.shut[i]! * 240)]))
}
