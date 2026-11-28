/**
 * Illustration critic for a CLIP STUDIO PAINT workflow: measured checks, an optional AI critique from any vision model,
 * a self-contained review.html and a transparent ai_redline.png to keep on the canvas as a file object.
 * Reads .png, .jpg and .clip; never writes to them. Output: `_review/<filename>/` next to each file.
 *
 *   node scripts/critic.ts <file> [options]
 *   node scripts/critic.ts --watch <dir> [options]
 *
 * Options:
 *   --stage sketch|lineart|flats|render   what to judge (default render)
 *   --no-ai                               measurements and review only: no key, no network
 *   --provider openai|anthropic           AI backend (default: openai when API_BASE_URL is set, else anthropic)
 *   --model <id>                          the model (default: $MODEL, or claude-opus-5-5 for anthropic)
 *   --api-base <url>                      OpenAI-compatible base URL (default: $API_BASE_URL); key from $API_KEY
 *   --out <dir>                           write here instead of _review/<filename>/ (with --watch: one folder per file in it)
 *   --focus x,y,w,h                       the focal area in canvas px (default: the face, found automatically)
 *   --mask <png>                          silhouette mask: black figure on white, or a PNG with transparency
 *   --segmenter auto|none|"<cmd {in} {out}>"  background removal (auto: rembg if on PATH, or $CRITIC_SEGMENTER)
 *   --keypoints <json>                    pose keypoints (OpenPose / DWPose JSON, COCO-17, or {points:{...}})
 *   --pose-cmd "<cmd {in}>"               a pose estimator printing keypoint JSON (or $CRITIC_POSE_CMD)
 *   --initial                             with --watch: also review the files already there
 *
 * Environment for an OpenAI-compatible model (local or cloud):
 *   API_BASE_URL=http://localhost:11434/v1  MODEL=qwen2.5vl:7b  [API_KEY=...]
 */
import { basename, join, resolve } from "node:path"
import { analyze, summary, type Options } from "../src/critic/run.ts"
import { isStage, STAGES } from "../src/critic/stages.ts"
import { isSupported } from "../src/critic/image.ts"
import { watchFolder } from "../src/critic/watch.ts"

const args = process.argv.slice(2)
const flag = (f: string): string | undefined => { const i = args.indexOf(f); return i < 0 ? undefined : args[i + 1] }
const has = (f: string): boolean => args.includes(f)
const VALUED = new Set(["--stage", "--out", "--model", "--provider", "--api-base", "--focus", "--mask", "--segmenter", "--keypoints", "--pose-cmd", "--watch"])
const positional = args.filter((a, i) => !a.startsWith("--") && !VALUED.has(args[i - 1] ?? ""))
const fail = (m: string): never => { process.stderr.write(`critic: ${m}\n`); process.exit(2) }

if (has("--help") || has("-h") || (!positional.length && !has("--watch"))) {
  process.stdout.write("usage: node scripts/critic.ts <file.png|.jpg|.clip> [--stage sketch|lineart|flats|render] [--no-ai] [--out dir]\n       node scripts/critic.ts --watch <dir> [same options] [--initial]\nevery option: the header of scripts/critic.ts, or src/critic/README.md\n")
  process.exit(positional.length || has("--watch") ? 0 : 2)
}
const stage = flag("--stage") ?? "render"
if (!isStage(stage)) fail(`--stage must be one of ${STAGES.join(", ")}`)
const focusArg = flag("--focus"), focus = focusArg ? (() => { const v = focusArg.split(",").map(Number); if (v.length !== 4 || v.some((x) => !Number.isFinite(x))) fail("--focus is x,y,w,h in canvas pixels"); return { x: v[0]!, y: v[1]!, w: v[2]!, h: v[3]! } })() : undefined
const opts = (out: string | undefined): Options => ({ stage: stage as Options["stage"], out, ai: !has("--no-ai"), provider: flag("--provider"), model: flag("--model"), apiBase: flag("--api-base"), mask: flag("--mask"), segmenter: flag("--segmenter"), keypoints: flag("--keypoints"), poseCmd: flag("--pose-cmd"), focus })

const once = async (file: string, out?: string): Promise<void> => {
  const t = Date.now()
  process.stdout.write(`critic: ${file} (${stage})\n`)
  const r = await analyze(file, opts(out))
  process.stdout.write(`${summary(r)}\n  ${((Date.now() - t) / 1000).toFixed(1)} s\n`)
}

const dir = flag("--watch")
if (dir) {
  const root = flag("--out")
  process.stdout.write(`critic: watching ${resolve(dir)} for .png .jpg .clip (stage ${stage}${has("--no-ai") ? ", no AI" : ""}); reviews in ${root ? resolve(root) : "_review/ next to each file"}. Ctrl+C to stop.\n`)
  watchFolder(dir, (f) => once(f, root ? join(root, basename(f)) : undefined), { ignore: root ? [root] : [], initial: has("--initial"), onError: (f, e) => process.stderr.write(`critic: ${f}: ${e.message}\n`) })
} else {
  const file = positional[0]!
  if (!isSupported(file)) fail(`${file}: use a .png, .jpg/.jpeg or .clip file`)
  once(file, flag("--out")).catch((e: Error) => fail(e.message))
}
