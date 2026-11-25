/**
 * Every paint step of `src/bold/render.ts` as a layer: its name in the layer panel, its folder, and the blend mode it is
 * fitted in. Folders are pass-through, so a multiply inside still multiplies what is under the folder. Bottom to top.
 */
import type { Hint } from "./record.ts"

type Step = { name: string; group: string; hint: Hint }
const s = (name: string, group: string, mode: Hint["mode"], color?: Hint["color"]): Step => ({ name, group, hint: color ? { mode, color } : { mode } })

export const STEPS: Record<string, Step> = {
  back: s("Background", "", "normal"),
  // flats are one layer per part, in the folder "Flats"
  grads: s("Gradients", "Colour", "normal"),
  hairHue: s("Hair hue bands", "Colour", "normal"),
  washes: s("Washes", "Colour", "normal"),
  scatter: s("Scatter at the turn", "Shading", "auto"),
  half: s("Half tone", "Shading", "multiply"),
  shade: s("Shade", "Shading", "multiply"),
  inner: s("Darkest behind the edge", "Shading", "multiply"),
  lift: s("Shade lifts towards the far side", "Shading", "auto"),
  warm: s("Light side warmth", "Shading", "auto"),
  reflected: s("Reflected light in the shade", "Shading", "auto"),
  bounce: s("Bounce", "Shading", "normal"),
  deep: s("Deep shade", "Shading", "multiply"),
  black: s("Darkest accents", "Shading", "multiply"),
  metal: s("Metal", "Materials and light", "normal"),
  metalShade: s("Metal shade", "Materials and light", "multiply"),
  sheen: s("Sheen and pores", "Materials and light", "normal"),
  lights: s("Lit planes", "Materials and light", "normal"),
  rims: s("Rims", "Materials and light", "normal"),
  hairLight: s("Hair lights", "Materials and light", "normal"),
  gloss: s("Gloss", "Materials and light", "normal"),
  highlights: s("Highlights", "Materials and light", "normal"),
  bleed: s("Colour bleed from neighbours", "Second light", "normal"),
  skyIn: s("Second light, inner step", "Second light", "normal"),
  sky: s("Second light", "Second light", "normal"),
  blush: s("Blush", "Finish", "normal"),
  airWarm: s("Air, warm side", "Finish", "auto"),
  airCool: s("Air, cool side", "Finish", "auto"),
  focus: s("Focus falloff", "Finish", "multiply"),
  haze: s("Depth haze", "Finish", "normal"),
  warmSkin: s("Warm shaded skin", "Finish", "overlay", [255, 146, 72]),
  brows: s("Brows", "Finish", "normal"),
  grain: s("Grain", "Finish", "linearLight"),
  face: s("Face and eyes", "", "normal"),
  line: s("Line art", "", "normal"),
  over: s("Eye lights", "", "normal"),
  front: s("Front", "", "normal"),
}
