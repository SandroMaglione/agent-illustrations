/**
 * The AI critique, from any vision-language model:
 *
 * - **OpenAI-compatible** (`API_BASE_URL`, `API_KEY`, `MODEL`): Ollama, llama.cpp's server, LM Studio, vLLM, or a cloud API
 *   that speaks `/chat/completions`. Used whenever `API_BASE_URL` is set (or `--provider openai`).
 * - **Claude** through the Anthropic SDK (`ANTHROPIC_API_KEY` or an `ant auth login` profile), otherwise.
 *
 * The model gets the original picture, the 3-value map, the saturation heatmap and the high-resolution focal crops, with the
 * stage's rubric and the measurements, and answers with 3-5 prioritised issues in one fixed JSON schema. Every answer is
 * validated against that schema here, whatever the server promised: local models that ignore `response_format`, wrap the
 * JSON in a code fence or use 0-1000 box coordinates are handled, and one repair turn is allowed before giving up. The
 * measured findings never depend on this step.
 */
import Anthropic from "@anthropic-ai/sdk"
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod"
import { z } from "zod"
import { encodeJpeg, fit, type Box, type Img } from "./image.ts"
import { PROFILES, type Finding, type Stage } from "./stages.ts"

export const DEFAULT_CLAUDE_MODEL = "claude-opus-5-5"
/** Claude models that accept server-side refusal fallbacks (`fallbacks: "default"`). */
const FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5", "claude-fable-5-2", "claude-fable-5-1"])

export const CATEGORIES = ["Value Hierarchy", "Silhouette", "Saturation", "Tangent", "Focal Point", "Composition", "Anatomy", "Proportion", "Gesture", "Line Weight", "Lighting", "Edges", "Color Harmony", "Rendering", "Other"] as const

const Issue = z.strictObject({
  id: z.number().int().describe("1 for the most important issue, then 2, 3, ..."),
  category: z.enum(CATEGORIES),
  box_2d: z.array(z.number()).describe("[ymin, xmin, ymax, xmax], normalized 0..1 in the ORIGINAL picture"),
  diagnosis: z.string().describe("concise: what breaks the read, and where"),
  actionable_fix: z.string().describe("one concrete adjustment to make on the canvas, in CLIP STUDIO PAINT terms where it helps"),
})
/** What the model must return. Order of `issues` is the priority. */
export const CritiqueSchema = z.strictObject({
  summary: z.string().describe("one or two sentences: the overall read at this stage"),
  issues: z.array(Issue).describe("3 to 5 issues, most important first"),
})
export type Critique = z.infer<typeof CritiqueSchema>
export type Issue = z.infer<typeof Issue>

export type CritiqueInput = {
  stage: Stage
  canvas: { w: number; h: number }
  original: Img
  notan: Img
  saturation: Img
  crops: Array<{ name: string; why: string; box: Box; img: Img }>
  /** the deterministic findings, canvas px */ measured: Array<Finding>
  metrics: unknown
  note?: string
}

export type ProviderConfig =
  | { kind: "openai"; baseURL: string; apiKey?: string; model: string; fetch?: typeof fetch; timeoutMs?: number }
  | { kind: "anthropic"; model: string; client?: ClientLike }
export type ClientLike = { beta: { messages: { parse: Anthropic["beta"]["messages"]["parse"] } } }
export type CritiqueResult = { ok: true; critique: Critique; findings: Array<Finding>; model: string; provider: string; warnings: Array<string> } | { ok: false; reason: string; provider?: string }

/** Which model to ask: OpenAI-compatible when API_BASE_URL is set (or asked for), Claude otherwise. */
export const resolveProvider = (o: { provider?: string; model?: string; apiBase?: string }, env: NodeJS.ProcessEnv = process.env): ProviderConfig | { error: string } => {
  const base = o.apiBase ?? env.API_BASE_URL
  if (o.provider === "openai" || (!o.provider && base)) {
    const model = o.model ?? env.MODEL
    if (!base) return { error: "--provider openai needs API_BASE_URL (e.g. http://localhost:11434/v1 for Ollama)" }
    if (!model) return { error: "set MODEL (or --model) to a vision model your endpoint serves, e.g. qwen2.5vl:7b or gemma3:12b on Ollama" }
    return { kind: "openai", baseURL: base.replace(/\/+$/, ""), apiKey: env.API_KEY || undefined, model }
  }
  if (o.provider && o.provider !== "anthropic") return { error: `unknown --provider ${o.provider}: use openai or anthropic` }
  return { kind: "anthropic", model: o.model ?? env.MODEL ?? DEFAULT_CLAUDE_MODEL }
}

const SYSTEM = [
  "You are a senior art director and illustration instructor reviewing a digital illustration made in CLIP STUDIO PAINT. The target is high-craft stylized anime character art (the polish of current gacha key art such as Genshin Impact or Zenless Zone Zero).",
  "Return the 3 to 5 changes that would improve the picture most at its current stage, most important first. Each needs a box around the exact area, a concise diagnosis of what breaks the read, and one concrete fix the artist can make on the canvas.",
  "Rules:",
  "- Only report what you can see in the images given. Prefer fewer, certain issues over many vague ones.",
  "- Stylization is not an error: big eyes, small noses, long legs, simplified hands, cel shading are choices. Flag them only when inconsistent or when they break the read.",
  "- The measurements are deterministic and exact for what they measure. Use them as evidence and do not contradict them.",
  "- Judge against the stage rubric only. Do not ask for rendering on a sketch.",
  "- box_2d is [ymin, xmin, ymax, xmax], normalized 0..1 in the ORIGINAL picture (0,0 top-left). For something seen in a crop, convert with that crop's box, which is given with it.",
  "- Answer with JSON only, no prose and no code fence.",
].join("\n")

const SHAPE = `{"summary": "...", "issues": [{"id": 1, "category": one of ${JSON.stringify(CATEGORIES)}, "box_2d": [ymin, xmin, ymax, xmax], "diagnosis": "...", "actionable_fix": "..."}]}`

type Part = { text: string } | { label: string; jpeg: string; w: number; h: number }

/** The user turn, provider-neutral: text and labelled JPEG images. `long` caps each image's long side. */
export const buildParts = (input: CritiqueInput, long: { main: number; aux: number }): Array<Part> => {
  const { canvas } = input, nb = (b: Box): string => `[${[b.y / canvas.h, b.x / canvas.w, (b.y + b.h) / canvas.h, (b.x + b.w) / canvas.w].map((v) => v.toFixed(3)).join(", ")}]`
  const img = (label: string, i: Img, l: number): Part => { const f = fit(i, l).img; return { label, jpeg: encodeJpeg(f, 88).toString("base64"), w: f.w, h: f.h } }
  const parts: Array<Part> = [
    { text: `${PROFILES[input.stage].rubric}\n\nCanvas: ${canvas.w}x${canvas.h} px.${input.note ? ` ${input.note}` : ""}` },
    { text: "Image 'original': the whole picture. box_2d coordinates refer to this image." }, img("original", input.original, long.main),
    { text: "Image 'notan': 3-value map (dark / mid / light groups by a 3-class Otsu threshold on perceived lightness)." }, img("notan", input.notan, long.aux),
    { text: "Image 'saturation': saturation × value heatmap over a faded greyscale; red and yellow are the loudest colours." }, img("saturation", input.saturation, long.aux),
  ]
  for (const c of input.crops) parts.push({ text: `Image 'crop:${c.name}': ${c.why}, at full source resolution. Its box_2d in the original: ${nb(c.box)}.` }, img(`crop:${c.name}`, c.img, long.main))
  const measured = input.measured.filter((f) => f.severity !== "note").map((f) => `- ${f.title}${f.evidence ? ` (${f.evidence})` : ""}${f.region ? ` at box_2d ${nb(f.region)}` : ""}`).join("\n") || "- none flagged"
  parts.push({ text: `Deterministic measurements (exact):\n${JSON.stringify(input.metrics)}\n\nFlags raised by the measurements:\n${measured}\n\nReturn the critique as JSON in exactly this shape:\n${SHAPE}` })
  return parts
}

/** The first JSON object in a reply, tolerating code fences and chatter around it. */
export const extractJson = (text: string): unknown => {
  const t = text.replace(/```(?:json)?/gi, "").trim()
  try { return JSON.parse(t) } catch { /* fall through */ }
  const a = t.indexOf("{"), b = t.lastIndexOf("}")
  if (a >= 0 && b > a) return JSON.parse(t.slice(a, b + 1))
  throw new Error("no JSON object in the reply")
}

/**
 * Box to normalized [ymin, xmin, ymax, xmax] in 0..1. Models use three conventions: 0..1 (asked for), 0..1000 (Qwen-VL,
 * Gemini) and pixels of the image they were shown; values are read by their range. Swapped corners are put right.
 */
export const normalizeBox = (b: Array<number>, shown: { w: number; h: number }): [number, number, number, number] | null => {
  if (b.length !== 4 || b.some((v) => !Number.isFinite(v))) return null
  const m = Math.max(...b.map(Math.abs))
  let [y0, x0, y1, x1] = b as [number, number, number, number]
  if (m > 1.5 && m <= 1000) { y0 /= 1000; x0 /= 1000; y1 /= 1000; x1 /= 1000 }
  else if (m > 1000) { y0 /= shown.h; y1 /= shown.h; x0 /= shown.w; x1 /= shown.w }
  const c = (v: number): number => Math.max(0, Math.min(1, v))
  const out: [number, number, number, number] = [c(Math.min(y0, y1)), c(Math.min(x0, x1)), c(Math.max(y0, y1)), c(Math.max(x0, x1))]
  return out[2] - out[0] > 0.002 && out[3] - out[1] > 0.002 ? out : null
}

/** Schema check, then the rules a schema cannot say: 1-5 issues, four-number boxes, ids renumbered to the priority order. */
export const validateCritique = (raw: unknown, shown: { w: number; h: number }): { ok: true; critique: Critique; warnings: Array<string> } | { ok: false; error: string } => {
  const r = CritiqueSchema.safeParse(raw)
  if (!r.success) return { ok: false, error: r.error.issues.slice(0, 6).map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ") }
  const warnings: Array<string> = [], issues: Array<Issue> = []
  for (const i of r.data.issues) {
    const box = normalizeBox(i.box_2d, shown)
    if (!box) { warnings.push(`issue "${i.diagnosis.slice(0, 40)}" had an unusable box_2d ${JSON.stringify(i.box_2d)} and was dropped`); continue }
    issues.push({ ...i, box_2d: box })
  }
  if (!issues.length) return { ok: false, error: "no issue had a usable box_2d" }
  if (issues.length > 5) warnings.push(`${issues.length} issues returned, the first 5 kept`)
  if (issues.length < 3) warnings.push(`only ${issues.length} issue(s) returned (3-5 asked for)`)
  if (issues.some((q, k) => q.id !== k + 1)) warnings.push("ids were not 1..n in order; renumbered by position (the order is the priority)")
  return { ok: true, critique: { summary: r.data.summary, issues: issues.slice(0, 5).map((q, k) => ({ ...q, id: k + 1 })) }, warnings }
}

const r2 = (v: number): number => Math.round(v * 100) / 100

/** The critique as findings in canvas px, labelled 1..n by priority; the first two count as major. */
export const toFindings = (c: Critique, canvas: { w: number; h: number }): Array<Finding> => c.issues.map((i, k) => {
  const [y0, x0, y1, x1] = i.box_2d as [number, number, number, number]
  const first = i.diagnosis.split(/(?<=[.!?])\s/)[0]!
  return { source: "ai", check: "ai", severity: k < 2 ? "major" : "minor", label: String(i.id), priority: i.id, category: i.category, title: first.length > 110 ? `${first.slice(0, 107)}...` : first, detail: i.diagnosis, fix: i.actionable_fix, region: { x: r2(x0 * canvas.w), y: r2(y0 * canvas.h), w: r2((x1 - x0) * canvas.w), h: r2((y1 - y0) * canvas.h) } }
})

const errText = (e: unknown): string => (e instanceof Error ? (e.name === "TimeoutError" ? "the model did not answer in time" : e.message) : String(e))

/** `/chat/completions` on any OpenAI-compatible server, with schema-constrained output when the server supports it. */
const viaOpenAI = async (p: Extract<ProviderConfig, { kind: "openai" }>, parts: Array<Part>, shown: { w: number; h: number }): Promise<{ raw: unknown; model: string } | { error: string }> => {
  const f = p.fetch ?? fetch, url = `${p.baseURL}/chat/completions`
  const content = parts.map((q) => ("text" in q ? { type: "text", text: q.text } : { type: "image_url", image_url: { url: `data:image/jpeg;base64,${q.jpeg}` } }))
  const schema = z.toJSONSchema(CritiqueSchema) as Record<string, unknown>
  delete schema.$schema
  // strongest first; servers that reject a response_format get the next one
  const formats: Array<object | null> = [{ type: "json_schema", json_schema: { name: "art_critique", strict: true, schema } }, { type: "json_object" }, null]
  const messages: Array<Record<string, unknown>> = [{ role: "system", content: SYSTEM }, { role: "user", content }]
  const call = async (fmt: object | null): Promise<Response> => f(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...(p.apiKey ? { authorization: `Bearer ${p.apiKey}` } : {}) },
    body: JSON.stringify({ model: p.model, messages, temperature: 0.2, max_tokens: 4096, ...(fmt ? { response_format: fmt } : {}) }),
    signal: AbortSignal.timeout(p.timeoutMs ?? 300_000),
  })
  let fi = 0, repaired = false
  for (;;) {
    let res: Response
    try { res = await call(formats[fi]!) } catch (e) { return { error: `could not reach ${url}: ${errText(e)}` } }
    if (res.status === 401 || res.status === 403) return { error: `the endpoint refused the key (HTTP ${res.status}): check API_KEY` }
    if (res.status === 404) return { error: `HTTP 404 from ${url}: check API_BASE_URL (it usually ends in /v1) and that MODEL "${p.model}" exists` }
    if ((res.status === 400 || res.status === 422) && fi < formats.length - 1) { fi++; continue }
    if (!res.ok) return { error: `HTTP ${res.status} from ${url}: ${(await res.text()).slice(0, 300)}` }
    const body = (await res.json()) as { model?: string; choices?: Array<{ message?: { content?: unknown; refusal?: string }; finish_reason?: string }> }
    const msg = body.choices?.[0]?.message
    if (msg?.refusal) return { error: `the model declined: ${msg.refusal}` }
    const text = typeof msg?.content === "string" ? msg.content : Array.isArray(msg?.content) ? (msg.content as Array<{ text?: string }>).map((c) => c.text ?? "").join("") : ""
    let raw: unknown, problem: string
    try { raw = extractJson(text); const v = validateCritique(raw, shown); if (v.ok) return { raw, model: body.model ?? p.model }; problem = v.error } catch (e) { problem = errText(e) }
    if (body.choices?.[0]?.finish_reason === "length") return { error: "the answer was cut off (max_tokens)" }
    if (repaired) return { error: `the model's answer did not match the schema: ${problem}` }
    // one repair turn: show the model its answer and what was wrong with it
    repaired = true
    messages.push({ role: "assistant", content: text || "(empty)" }, { role: "user", content: `That answer failed validation: ${problem}. Reply with only the corrected JSON object in this shape:\n${SHAPE}` })
  }
}

/** Claude through the SDK, with structured outputs; validated again here like every other answer. */
const viaAnthropic = async (p: Extract<ProviderConfig, { kind: "anthropic" }>, parts: Array<Part>): Promise<{ raw: unknown; model: string } | { error: string }> => {
  let client: ClientLike
  try { client = p.client ?? new Anthropic() } catch (e) { return { error: `no Anthropic credentials (${errText(e)})` } }
  const content: Array<Anthropic.Beta.BetaContentBlockParam> = parts.map((q) => ("text" in q ? { type: "text" as const, text: q.text } : { type: "image" as const, source: { type: "base64" as const, media_type: "image/jpeg" as const, data: q.jpeg } }))
  try {
    const res = await client.beta.messages.parse({
      model: p.model,
      max_tokens: 16000,
      system: SYSTEM,
      messages: [{ role: "user", content }],
      output_config: { effort: "high", format: betaZodOutputFormat(CritiqueSchema) },
      // on a policy decline, the API re-runs the request on a fallback model instead of returning nothing
      ...(FALLBACK_MODELS.has(p.model) ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
    })
    if (res.stop_reason === "refusal") return { error: `the model declined to critique this image${res.stop_details?.explanation ? `: ${res.stop_details.explanation}` : ""}` }
    if (res.stop_reason === "max_tokens") return { error: "the critique was cut off (max_tokens)" }
    if (!res.parsed_output) return { error: "the model's answer did not match the critique schema" }
    return { raw: res.parsed_output, model: res.model }
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return { error: "authentication failed: set ANTHROPIC_API_KEY or run `ant auth login`" }
    if (e instanceof Anthropic.RateLimitError) return { error: "rate limited by the API; try again shortly" }
    // APIConnectionError extends APIError: test it first
    if (e instanceof Anthropic.APIConnectionError) return { error: `could not reach the API: ${e.message}` }
    if (e instanceof Anthropic.APIError) return { error: `API error ${e.status ?? ""}: ${e.message}` }
    return { error: errText(e) }
  }
}

export const critique = async (input: CritiqueInput, p: ProviderConfig): Promise<CritiqueResult> => {
  const provider = p.kind === "openai" ? `${p.model} via ${p.baseURL}` : `${p.model} (Anthropic)`
  // local models get smaller images: their vision encoders downscale anyway, and it keeps them fast
  const parts = buildParts(input, p.kind === "openai" ? { main: 1280, aux: 768 } : { main: 1568, aux: 900 })
  const shown = parts.find((q): q is Extract<Part, { label: string }> => "label" in q && q.label === "original")!
  const r = p.kind === "openai" ? await viaOpenAI(p, parts, shown) : await viaAnthropic(p, parts)
  if ("error" in r) return { ok: false, reason: /auth|credential/i.test(r.error) && p.kind === "anthropic" ? `${r.error}. Or set API_BASE_URL and MODEL for an OpenAI-compatible model (e.g. Ollama), or pass --no-ai.` : r.error, provider }
  const v = validateCritique(r.raw, shown)
  if (!v.ok) return { ok: false, reason: `the model's answer did not match the schema: ${v.error}`, provider }
  return { ok: true, critique: v.critique, findings: toFindings(v.critique, input.canvas), model: r.model, provider, warnings: v.warnings }
}
