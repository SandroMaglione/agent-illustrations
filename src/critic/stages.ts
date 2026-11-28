/**
 * What each stage of a CSP illustration is judged on. Every check runs at every stage; the stage decides which are in focus
 * (their findings keep their severity) and which are context (their findings are shown, demoted to notes), and it sets the
 * rubric the AI critic is given.
 */
export const STAGES = ["sketch", "lineart", "flats", "render"] as const
export type Stage = (typeof STAGES)[number]
export type CheckId = "values" | "saturation" | "palette" | "silhouette" | "flip" | "squint" | "pose" | "focal"

export type Severity = "major" | "minor" | "note"
export type Finding = {
  /** 1-based, matches the number on the redline */ n?: number
  source: "measure" | "ai"
  check: CheckId | "ai"
  severity: Severity
  title: string
  detail: string
  /** What to do about it, in CLIP STUDIO PAINT terms where it helps */ fix?: string
  /** In canvas pixels (the .clip canvas, or the image) */ region?: { x: number; y: number; w: number; h: number }
  point?: { x: number; y: number }
  /** Measured value(s) behind it, quoted in the report */ evidence?: string
  confidence?: number
}

export type Profile = { focus: Array<CheckId>; summary: string; rubric: string }

export const PROFILES: Record<Stage, Profile> = {
  sketch: {
    focus: ["silhouette", "flip", "squint", "pose", "focal"],
    summary: "Gesture, pose, proportion and readable shapes. Colour and value are context only.",
    rubric: [
      "Stage: SKETCH. Judge only what a sketch can decide: gesture and line of action, weight and balance, proportion (head count, limb lengths, foreshortening), silhouette readability, composition and eye flow, the read of the face's angle.",
      "Do not critique line quality, colour, rendering or finish: rough lines are expected.",
      "Prefer fixes like: redraw the line of action on a new layer, Edit > Transform > Free transform or Mesh transformation, Filter > Distort > Liquify, flip the canvas (View > Rotate/Invert > Flip horizontal) to check balance.",
    ].join("\n"),
  },
  lineart: {
    focus: ["silhouette", "flip", "pose", "focal", "squint"],
    summary: "Clean, readable shapes and anatomy that survives the flip. Colour and value are context only.",
    rubric: [
      "Stage: LINE ART. Judge line confidence and weight hierarchy (thicker outer contour and overlaps, thinner interior detail, tapered ends), closed shapes for flatting, tangents and awkward overlaps, anatomy and proportion errors that the clean line now locks in, silhouette readability, hand and face construction.",
      "Do not critique colour or rendering.",
      "Prefer fixes like: vector layer + Correct line width / Simple width modification, the Object tool to adjust stroke width, Liquify or Mesh transformation for proportion, Fill > Close gap settings, Vector eraser (to intersection) for overlaps.",
    ].join("\n"),
  },
  flats: {
    focus: ["values", "palette", "saturation", "silhouette", "focal"],
    summary: "Local colour and value plan: separation of big shapes, palette harmony, saturation placed on the focus.",
    rubric: [
      "Stage: FLATS. Judge the local colour and value plan before any shading: are big neighbouring shapes separated in value (check the greyscale and 3-value map), is the palette harmonious for a stylized anime character (a clear dominant, a secondary, a small accent), is the highest saturation reserved for the focal area, do skin, hair and costume read as distinct materials, are there gaps or bleed in the flats.",
      "Do not critique missing shading, highlights or effects: they are not painted yet.",
      "Prefer fixes like: Edit > Tonal correction > Hue/Saturation/Luminosity on the flat's layer, lock transparent pixels and refill, a Correction layer (Tone curve) clipped to a folder, Reference other layers + Fill to close gaps.",
    ].join("\n"),
  },
  render: {
    focus: ["values", "saturation", "palette", "silhouette", "flip", "squint", "pose", "focal"],
    summary: "Everything: value grouping, lighting logic, edges, focal hierarchy, finish quality.",
    rubric: [
      "Stage: RENDER, judged against high-craft stylized anime illustration (the polish of current gacha key art, Genshin Impact / Zenless Zone Zero style: clean cel and soft-gradient shading, a clear key light, rim and bounce light, crisp hair highlights, controlled saturation, a sharp focal hierarchy on the face).",
      "Judge: value grouping and the 3-value read, light logic (one consistent key direction, shadow shapes that follow the form, cast shadows, ambient occlusion where forms meet), edge control (hard vs soft), colour of shadows (hue-shifted and not muddy), rim light and bounce, material differentiation (skin, hair, cloth, metal), face and eye rendering, detail density hierarchy (most detail at the focus), noise or overworked areas, anatomy and proportion errors still visible.",
      "Prefer fixes like: a Multiply layer clipped to the folder for a shadow pass, Add (Glow) / Screen layers for rim light, a Gradient map or Tone curve correction layer for values, Filter > Blur > Gaussian on a duplicated layer for depth, Liquify for late anatomy fixes, the Soft edge or Blend tool for edges.",
    ].join("\n"),
  },
}

export const isStage = (s: string): s is Stage => (STAGES as ReadonlyArray<string>).includes(s)

/** Findings of checks out of focus at this stage become notes; focus ones are kept. */
export const weigh = (f: Finding, stage: Stage): Finding => (f.source === "ai" || PROFILES[stage].focus.includes(f.check as CheckId) ? f : { ...f, severity: "note" })
