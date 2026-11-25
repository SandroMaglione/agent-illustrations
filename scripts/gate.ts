/**
 * Value gate. Renders the drawing after every stage and measures it in grey: each value group must stay in its band, and no stage may
 * wash out the darks. node scripts/gate.ts name. A FAIL means: do not go on, fix the values first.
 */
import { base, open } from "./page.ts"

const name = process.argv[2]!, STAGES = [[1, "flats"], [4, "form"], [6, "deep"], [7, "light, bounce"], [10, "final"]] as const
// lit value of a group, and how dark the whole may not fall short of (references e f g: 9, 37, 33% under 85; p5 22 to 47)
const BAND = { dark: [0, 66], mid: [88, 158], light: [192, 256] } as const
const { b, p } = await open()
await p.goto(`${base}favicon.ico`)
const r = await p.evaluate(async ([name, stages]) => {
  const { artOf } = await import(/* @vite-ignore */ "/src/splash/index.ts" as string), R = await import(/* @vite-ignore */ "/src/bold/render.ts" as string), E = await import(/* @vite-ignore */ "/src/splash/engine.ts" as string), art = await artOf(name), f = await E.fixedOf(art), out: Array<{ stage: string; g: Record<string, Array<number>>; all: Array<number>; part: Record<string, number> }> = []
  for (const [u, stage] of stages as ReadonlyArray<readonly [number, string]>) {
    const c = (await R.render(art, 2, u)).canvas as HTMLCanvasElement, d = c.getContext("2d")!.getImageData(0, 0, f.w, f.h).data, by = new Map<string, Array<number>>(), all: Array<number> = []
    for (let i = 0; i < f.map.length; i += 3) { const n = f.names[f.map[i]!]; if (!n || n === "bg" || f.ink[i]! > 0.25) continue; const v = d[i * 4]! * 0.3 + d[i * 4 + 1]! * 0.59 + d[i * 4 + 2]! * 0.11; all.push(v); const l = by.get(n); if (l) l.push(v); else by.set(n, [v]) }
    const q = (a: Array<number>, t: number): number => { const s = [...a].sort((m, n) => m - n); return Math.round(s[Math.floor(t * (s.length - 1))] ?? 0) }, g: Record<string, Array<number>> = {}, part: Record<string, number> = {}
    for (const [k, parts] of Object.entries(art.values ?? {})) { const l = (parts as Array<string>).flatMap((n) => by.get(n) ?? []); g[k] = [q(l, 0.1), q(l, 0.5), q(l, 0.85), Math.round((100 * l.length) / all.length)] }
    for (const [n, l] of by) part[n] = q(l, 0.8)
    out.push({ stage, g, all: [q(all, 0.05), Math.round((100 * all.filter((v) => v < 60).length) / all.length), Math.round((100 * all.filter((v) => v < 85).length) / all.length), Math.round((100 * all.filter((v) => v > 190).length) / all.length)], part })
  }
  return { out, values: (art.values ?? {}) as Record<string, Array<string>> }
}, [name, STAGES] as const)
await b.close()
let bad = 0
const say = (ok: boolean, t: string): void => { if (!ok) bad++; console.log(`  ${ok ? "ok  " : "FAIL"} ${t}`) }
for (const s of r.out) console.log(`${s.stage.padEnd(14)} p5 ${String(s.all[0]).padStart(3)}  under 60 ${String(s.all[1]).padStart(2)}%  under 85 ${String(s.all[2]).padStart(2)}%  over 190 ${s.all[3]}%   ${Object.entries(s.g).map(([k, v]) => `${k} ${v[0]}/${v[1]}/${v[2]} (${v[3]}%)`).join("   ")}`)
const last = r.out.at(-1)!, deep = r.out[2]!
for (const [k, parts] of Object.entries(r.values)) { const [lo, hi] = BAND[k as keyof typeof BAND]; const off = parts.filter((n) => last.part[n] !== undefined && (last.part[n]! < lo || last.part[n]! > hi)); say(!off.length, `${k}: lit values ${lo} to ${hi}${off.length ? `, off: ${off.map((n) => `${n} ${last.part[n]}`).join(" ")}` : ""}`) }
say(last.all[2]! >= 20, `at least 20% under 85: ${last.all[2]}%`)
say(last.all[0]! <= 42, `darkest twentieth at most 42: ${last.all[0]}`)
say(last.all[2]! >= deep.all[2]! - 2, `bounce and air keep the darks: ${deep.all[2]}% after deep shade, ${last.all[2]}% at the end`)
for (const [k, v] of Object.entries(last.g)) if (k !== "dark") say(v[2]! - v[0]! >= 60, `${k}: light to shade at least 60 apart: ${v[2]! - v[0]!}`)
process.exit(bad ? 1 : 0)
