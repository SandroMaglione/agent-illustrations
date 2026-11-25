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
put("-form", `/** The blockout: every form as a mesh, in the drawing's view (x right, y down, z to the viewer, line-art px). docs/form-guide.md */
import { ball, join, loft, tube } from "../form/mesh.ts"
import type { Mesh, Part, Section, V3 } from "../form/mesh.ts"

export const light = { fall: [0.8, 0.6], up: 0.5 } as const // the same as in the drawing
export const head = ${Math.round(h / 6)}
export const pivot: V3 = [${Math.round(w / 2)}, ${Math.round(h / 2)}, 0]
export const parts: Array<Part> = []
const put = (group: string, name: string, ...m: ReadonlyArray<Mesh>): Mesh => { const mesh = join(...m); parts.push({ group, name, mesh }); return mesh }
/** "left x,y right x,y depth half-depth / next section …" from one end of a form to the other. */
const S = (s: string): Array<Section> => s.trim().split("/").map((r) => r.trim().split(/[\\s,]+/).map(Number) as unknown as Section)
// put("armL", "upper arm", loft(S("446,345 526,372 62 42 / 400,430 452,456 84 30")))
// put("armL", "elbow", ball([420, 450, 84], 30)); put("armL", "thumb", tube([[300, 640, 190, 9], [310, 660, 196, 7]]))
void [put, S, ball, loft, tube]

/** Left and right lengths in space, to compare: [name, left, right]. */
export const bones: ReadonlyArray<readonly [string, number, number]> = []
/** Group to the region names it stands for. "*" for small things that may lie on anything. */
export const groups: Readonly<Record<string, string>> = {}
`)
put("-shadows", `/** The shadow design, drawn over the form guide (scripts/guide.ts). parts | tone | points. Tones and rules: docs/form-guide.md */
import { read } from "../bold/shadows.ts"

export const SHADOWS = read(\`
# armL | S | 518,313 522,330~ 514,365~ 500,402 526,396 532,360
\`)
`)
put("", `import type { Art } from "./engine.ts"
import { CLICKS, WALLS } from "./${name}-clicks.ts"
import { LINES } from "./${name}-lines.ts"
import { SHADOWS } from "./${name}-shadows.ts"
import { SHAPES } from "./${name}-shapes.ts"

/** Head height crown to chin in line-art px, and the parts: colour, material, height in the stack (higher casts on lower). */
export const ART: Art = {
  head: ${Math.round(h / 6)}, src: "/wip/${name}.png", w: ${w}, h: ${h}, seeds: [], lines: LINES, clicks: { at: CLICKS, walls: WALLS }, walls: [], force: [],
  defs: { bg: { color: "#ffffff", kind: "flat", z: 0 } },
  light: { fall: [0.8, 0.6], up: 0.5 },
  // values: { dark: [], mid: [], light: [] }, apart: [["hairF", "face", 65]],          the value plan: gate.ts and finish.ts
  // field: "/wip/${name}-field.bin", formed: [], meshCasts: [],                        after form.ts --field: what the mesh shades and casts by itself
  shadows: SHADOWS,
  grads: [], casts: [], shapes: SHAPES, soft: [], washes: [], noink: [],
  // ...painted([...eyeDetails("Eye right", EYE, LOOK), ...eyeLights("Eye right", EYE, LOOK)]), faceMid: 0,   instead of face and over: the eye kit, each piece a layer (bold/eye.ts)
  // folders: [["Hair back", "hairB", "fine"], ["Face", "face", "fine"]], splits: {}, lineGroups: [],            the layered file (docs/layers.md)
  face: () => undefined, over: () => undefined, back: () => undefined, front: () => undefined,
}
`)
console.log(`${dir}${name}.ts  ${w} x ${h}\nnext: node scripts/look.ts "v=sheet&who=${name}&show=pools&z=2" patches.png`)
