/** Start a drawing. node scripts/new.ts name path/to/line-art.png : copies the line art to public/wip (not in Git) and writes the empty files. */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"

const [name, file] = process.argv.slice(2), dir = "src/splash/"
if (!name || !file) throw new Error("node scripts/new.ts name line-art.png")
if (existsSync(`${dir}${name}.ts`)) throw new Error(`${dir}${name}.ts is already there`)
const png = readFileSync(file), w = png.readUInt32BE(16), h = png.readUInt32BE(20)
mkdirSync("public/wip", { recursive: true })
copyFileSync(file, `public/wip/${name}.png`)
const put = (end: string, text: string): void => writeFileSync(`${dir}${name}${end}.ts`, text)
writeFileSync(`${dir}${name}-names.txt`, "# one line per part: the patch numbers it owns, from ?v=sheet&show=pools. Then: node scripts/name.ts " + name + "\n# wall x,y x,y      a line the artist left open (numbers never change when you add one)\n# @part x,y x,y      a click by point, for the new patch a wall makes\nbg: 1\n")
put("-clicks", `import type { Clicks } from "../bucket/fill.ts"\n\nexport const WALLS: ReadonlyArray<string> = []\nexport const CLICKS: Clicks = { bg: "4,4" }\n`)
put("-lines", `export const LINES = ""\n`)
put("-plans", `import type { Masses, Plan } from "../tools/thumbs.ts"\n\n/** Parts that turn as one form. */\nexport const MASSES: Masses = []\n/** Four to six different ideas. See ?v=thumbs&who=${name} */\nexport const PLANS: ReadonlyArray<Plan> = []\n`)
put("-shapes", `import type { Shape } from "./engine.ts"\n\nexport const SHAPES: ReadonlyArray<Shape> = []\n`)
put("", `import type { Art } from "./engine.ts"
import { CLICKS, WALLS } from "./${name}-clicks.ts"
import { LINES } from "./${name}-lines.ts"
import { SHAPES } from "./${name}-shapes.ts"

/** Head height crown to chin in line-art px, and the parts: colour, material, height in the stack (higher casts on lower). */
export const ART: Art = {
  head: ${Math.round(h / 6)}, src: "/wip/${name}.png", w: ${w}, h: ${h}, seeds: [], lines: LINES, clicks: { at: CLICKS, walls: WALLS }, walls: [], force: [],
  defs: { bg: { color: "#ffffff", kind: "flat", z: 0 } },
  grads: [], casts: [], shapes: SHAPES, soft: [], washes: [], noink: [],
  face: () => undefined, over: () => undefined, back: () => undefined, front: () => undefined,
}
`)
console.log(`${dir}${name}.ts  ${w} x ${h}\nnext: node scripts/look.ts "v=sheet&who=${name}&show=pools&z=2" patches.png`)
