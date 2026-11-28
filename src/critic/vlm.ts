/**
 * The AI critique: Claude looks at the picture, its greyscale and 3-value map and the high-resolution focal crops, is given
 * the measurements, and answers in a fixed JSON schema (structured outputs). Its issues carry a region in the picture's
 * coordinates, so they go on the redline next to the measured ones.
 *
 * Guard rails against confident nonsense: the measurements are stated as facts it must not contradict silently (it lists
 * any disagreement separately), every issue has to say which image it was seen in and how sure it is, regions are clamped
 * to the canvas, and low-confidence issues are demoted to notes. The measured findings never depend on this step.
 */
import Anthropic from "@anthropic-ai/sdk"
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod"
import { z } from "zod"
import { encodeJpeg, fit, type Box, type Img } from "./image.ts"
import { PROFILES, type Finding, type Stage } from "./stages.ts"

export const DEFAULT_MODEL = "claude-opus-5-5"
/** Models that accept server-side refusal fallbacks (`fallbacks: "default"`). */
const FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5", "claude-fable-5-2", "claude-fable-5-1"])

const Region = z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() }).describe("normalized 0..1 coordinates in the FULL picture: x,y = top-left corner")
export const CritiqueSchema = z.object({
  overall: z.string().describe("2-4 sentences: the honest overall read of the piece at this stage"),
  stage_readiness: z.enum(["not_ready", "needs_work", "nearly_there", "ready"]).describe("is it ready to move to the next stage"),
  strengths: z.array(z.string()).describe("up to 4 specific things that work, worth keeping"),
  issues: z.array(z.object({
    title: z.string().describe("short, specific: 'Left forearm too short for the upper arm', not 'anatomy issues'"),
    category: z.enum(["anatomy", "proportion", "gesture", "silhouette", "composition", "focal_hierarchy", "value", "color", "saturation", "lighting", "edges", "line_quality", "rendering", "face", "hands", "hair", "clothing", "finish", "other"]),
    severity: z.enum(["major", "minor", "note"]),
    region: Region.nullable().describe("where it is, in the full picture; null only for whole-picture issues"),
    seen_in: z.string().describe("the image label where you saw it, e.g. 'full', 'grey', 'notan', 'crop:face'"),
    observation: z.string().describe("what is visibly there, concretely"),
    why_it_matters: z.string(),
    fix_in_csp: z.string().describe("a concrete fix in CLIP STUDIO PAINT: tool, layer setup, menu path"),
    relates_to_measurement: z.string().nullable().describe("the measurement this agrees with or explains, if any"),
    confidence: z.number().describe("0..1: how sure you are this is a real problem and not an intended style choice"),
  })).describe("ordered most important first; at most 8"),
  measurement_disagreements: z.array(z.object({ measurement: z.string(), comment: z.string() })).describe("measurements you believe are misleading for this picture, and why; empty if none"),
})
export type Critique = z.infer<typeof CritiqueSchema>

export type CritiqueInput = {
  stage: Stage
  canvas: { w: number; h: number }
  full: Img
  grey: Img
  notan: Img
  crops: Array<{ name: string; why: string; box: Box; img: Img }>
  /** the deterministic findings and metrics, already in canvas px */
  measured: Array<Finding>
  metrics: unknown
  note?: string
}

export type CritiqueResult = { ok: true; critique: Critique; findings: Array<Finding>; model: string; usage?: unknown } | { ok: false; reason: string }

/** The minimal client surface used: lets tests pass a fake. */
export type ClientLike = { beta: { messages: { parse: Anthropic["beta"]["messages"]["parse"] } } }

const SYSTEM = [
  "You are a senior art director and illustration instructor reviewing a digital illustration made in CLIP STUDIO PAINT. The target is high-craft stylized anime character art (the polish of current gacha key art such as Genshin Impact or Zenless Zone Zero).",
  "Your critique is read by the artist next to a redline overlay drawn from your regions, so be specific and locatable: name the body part or element, give its region, say what you see, why it hurts the picture, and one concrete fix in CSP.",
  "Rules:",
  "- Only report what you can actually see in the images given. If a detail is too small to judge, say so instead of guessing.",
  "- Stylization is not an error: big eyes, small noses, long legs, simplified hands, cel shading, line art colour are choices. Flag them only when they are inconsistent within the picture or break the read.",
  "- The measurements are deterministic and exact for what they measure. Use them as evidence. Never contradict one silently: if you think one is misleading for this picture (e.g. a white background inflating the light group), list it under measurement_disagreements.",
  "- Judge against the stage rubric only. Do not ask for rendering on a sketch.",
  "- Prioritize: the few changes that would improve the piece most come first. Skip generic advice ('add more detail', 'improve anatomy').",
  "- Regions are normalized 0..1 in the FULL picture. For something you saw in a crop, convert using that crop's position, which is given with it.",
].join("\n")

const jpegBlock = (img: Img, long: number): Anthropic.Beta.BetaImageBlockParam => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: encodeJpeg(fit(img, long).img, 90).toString("base64") } })

export const buildRequest = (input: CritiqueInput): { content: Array<Anthropic.Beta.BetaContentBlockParam> } => {
  const { canvas } = input, nb = (b: Box): string => `x ${(b.x / canvas.w).toFixed(3)}, y ${(b.y / canvas.h).toFixed(3)}, w ${(b.w / canvas.w).toFixed(3)}, h ${(b.h / canvas.h).toFixed(3)}`
  const content: Array<Anthropic.Beta.BetaContentBlockParam> = [
    { type: "text", text: `${PROFILES[input.stage].rubric}\n\nCanvas: ${canvas.w}x${canvas.h} px.${input.note ? ` ${input.note}` : ""}` },
    { type: "text", text: "Image 'full': the whole picture." }, jpegBlock(input.full, 1568),
    { type: "text", text: "Image 'grey': perceptual greyscale (CIE L*), the value structure without colour." }, jpegBlock(input.grey, 900),
    { type: "text", text: "Image 'notan': 3-value map (dark / mid / light groups by a 3-class Otsu threshold)." }, jpegBlock(input.notan, 900),
  ]
  for (const c of input.crops) content.push({ type: "text", text: `Image 'crop:${c.name}': ${c.why}, at full source resolution. Position in the full picture (normalized): ${nb(c.box)}.` }, jpegBlock(c.img, 1568))
  const measured = input.measured.map((f) => `- [${f.severity}] ${f.title}${f.evidence ? ` (${f.evidence})` : ""}${f.region ? ` at ${nb(f.region)}` : ""}`).join("\n") || "- none flagged"
  content.push({ type: "text", text: `Deterministic measurements (exact):\n${JSON.stringify(input.metrics)}\n\nFlags raised by the measurements:\n${measured}\n\nWrite the critique.` })
  return { content }
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v))

/** The parsed critique as findings in canvas px; low-confidence issues are demoted to notes. */
export const toFindings = (c: Critique, canvas: { w: number; h: number }): Array<Finding> => c.issues.slice(0, 8).map((i) => {
  let region: Finding["region"]
  if (i.region) {
    const x = clamp01(i.region.x), y = clamp01(i.region.y), w = clamp01(Math.min(i.region.w, 1 - x)), h = clamp01(Math.min(i.region.h, 1 - y))
    if (w > 0.002 && h > 0.002) region = { x: x * canvas.w, y: y * canvas.h, w: w * canvas.w, h: h * canvas.h }
  }
  const conf = clamp01(i.confidence)
  return { source: "ai", check: "ai", severity: conf < 0.35 ? "note" : i.severity, title: i.title, detail: `${i.observation} ${i.why_it_matters}`.trim(), fix: i.fix_in_csp, region, evidence: [i.relates_to_measurement, `seen in ${i.seen_in}`, `${i.category}`].filter(Boolean).join("; "), confidence: conf }
})

export const critique = async (input: CritiqueInput, opts: { model?: string; client?: ClientLike; effort?: "low" | "medium" | "high" | "xhigh" | "max" } = {}): Promise<CritiqueResult> => {
  const model = opts.model ?? DEFAULT_MODEL
  let client: ClientLike
  try { client = opts.client ?? new Anthropic() } catch (e) { return { ok: false, reason: `no Anthropic credentials (${(e as Error).message}). Set ANTHROPIC_API_KEY or run \`ant auth login\`, or pass --no-ai.` } }
  const { content } = buildRequest(input)
  try {
    const res = await client.beta.messages.parse({
      model,
      max_tokens: 16000,
      system: SYSTEM,
      messages: [{ role: "user", content }],
      output_config: { effort: opts.effort ?? "high", format: betaZodOutputFormat(CritiqueSchema) },
      // on a policy decline, the API re-runs the request on a fallback model instead of returning nothing
      ...(FALLBACK_MODELS.has(model) ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
    })
    if (res.stop_reason === "refusal") return { ok: false, reason: `the model declined to critique this image${res.stop_details?.explanation ? `: ${res.stop_details.explanation}` : ""}` }
    if (res.stop_reason === "max_tokens") return { ok: false, reason: "the critique was cut off (max_tokens)" }
    const parsed = res.parsed_output
    if (!parsed) return { ok: false, reason: "the model's answer did not match the critique schema" }
    return { ok: true, critique: parsed, findings: toFindings(parsed, input.canvas), model: res.model, usage: res.usage }
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return { ok: false, reason: "authentication failed: set ANTHROPIC_API_KEY or run `ant auth login`, or pass --no-ai" }
    if (e instanceof Anthropic.RateLimitError) return { ok: false, reason: "rate limited by the API; try again shortly" }
    // APIConnectionError extends APIError: test it first
    if (e instanceof Anthropic.APIConnectionError) return { ok: false, reason: `could not reach the API: ${e.message}` }
    if (e instanceof Anthropic.APIError) return { ok: false, reason: `API error ${e.status ?? ""}: ${e.message}` }
    const m = (e as Error).message
    return { ok: false, reason: /auth/i.test(m) ? `${m} (set ANTHROPIC_API_KEY or run \`ant auth login\`, or pass --no-ai)` : m }
  }
}
