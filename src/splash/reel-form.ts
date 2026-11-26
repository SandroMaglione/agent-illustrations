/** The blockout: every form as a mesh, in the drawing's view (x right, y down, z to the viewer, line-art px). docs/form-guide.md */
import { ball, join, loft, tube } from "../form/mesh.ts"
import type { Mesh, Part, Section, V3 } from "../form/mesh.ts"

export const light = { fall: [0.8, 0.6], up: 0.5 } as const // the same as in the drawing
export const head = 330
export const pivot: V3 = [543, 724, 0]
export const parts: Array<Part> = []
const put = (group: string, name: string, ...m: ReadonlyArray<Mesh>): Mesh => { const mesh = join(...m); parts.push({ group, name, mesh }); return mesh }
/** "left x,y right x,y depth half-depth / next section …" from one end of a form to the other. */
const S = (s: string): Array<Section> => s.trim().split("/").map((r) => r.trim().split(/[\s,]+/).map(Number) as unknown as Section)
// put("armL", "upper arm", loft(S("446,345 526,372 62 42 / 400,430 452,456 84 30")))
// put("armL", "elbow", ball([420, 450, 84], 30)); put("armL", "thumb", tube([[300, 640, 190, 9], [310, 660, 196, 7]]))
void [put, S, ball, loft, tube]

/** Left and right lengths in space, to compare: [name, left, right]. */
export const bones: ReadonlyArray<readonly [string, number, number]> = []
/** Group to the region names it stands for. "*" for small things that may lie on anything. */
export const groups: Readonly<Record<string, string>> = {}
