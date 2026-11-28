/**
 * Illustration critic for a CLIP STUDIO PAINT workflow: measured checks, an optional AI critique, a self-contained HTML
 * report and a transparent redline to import as a layer. Reads .png, .jpg and .clip (read-only: the .clip is never written).
 *
 *   node scripts/critic.ts <file> [options]
 *   node scripts/critic.ts --watch <dir> [options]
 *
 * Options:
 *   --stage sketch|lineart|flats|render   what to judge (default render)
 *   --no-ai                               measurements and report only, no API key needed
 *   --out <dir>                           where to write (default output/critic/<name>, or output/critic/ per file when watching)
 *   --model <id>                          Claude model for the critique (default claude-opus-5-5)
 *   --focus x,y,w,h                       the focal area in canvas px (default: the face, found automatically)
 *   --mask <png>                          silhouette mask: black figure on white, or a PNG with transparency
 *   --segmenter auto|none|"<cmd {in} {out}>"  background removal (auto: rembg if on PATH, or $CRITIC_SEGMENTER)
 *   --keypoints <json>                    pose keypoints (OpenPose / DWPose JSON, COCO-17, or {points:{...}})
 *   --pose-cmd "<cmd {in}>"               a pose estimator printing keypoint JSON (or $CRITIC_POSE_CMD)
 *   --initial                             with --watch: also review the files already there
 */
import { basename, extname, join, resolve } from "node:path"
import { analyze, summary, type Options } from "../src/critic/run.ts"
import { isStage, STAGES } from "../src/critic/stages.ts"
import { isSupported } from "../src/critic/image.ts"
import { watchFolder } from "../src/critic/watch.ts"

const args = process.argv.slice(2)
const flag = (f: string): string | undefined => { const i = args.indexOf(f); return i < 0 ? undefined : args[i + 1] }
const has = (f: string): boolean => args.includes(f)
const VALUED = new Set(["--stage", "--out", "--model", "--focus", "--mask", "--segmenter", "--keypoints", "--pose-cmd", "--watch"])
const positional = args.filter((a, i) => !a.startsWith("--") && !VALUED.has(args[i - 1] ?? ""))
const fail = (m: string): never => { process.stderr.write(`critic: ${m}\n`); process.exit(2) }

if (has("--help") || has("-h") || (!positional.length && !has("--watch"))) {
  process.stdout.write("usage: node scripts/critic.ts <file.png|.jpg|.clip> [--stage sketch|lineart|flats|render] [--no-ai] [--out dir]\n       node scripts/critic.ts --watch <dir> [same options] [--initial]\nsee the header of scripts/critic.ts or docs/critic.md for every option\n")
  process.exit(positional.length || has("--watch") ? 0 : 2)
}
const stage = flag("--stage") ?? "render"
if (!isStage(stage)) fail(`--stage must be one of ${STAGES.join(", ")}`)
const focusArg = flag("--focus"), focus = focusArg ? (() => { const v = focusArg.split(",").map(Number); if (v.length !== 4 || v.some((x) => !Number.isFinite(x))) fail("--focus is x,y,w,h in canvas pixels"); return { x: v[0]!, y: v[1]!, w: v[2]!, h: v[3]! } })() : undefined
const base = (out: string): Options => ({ stage: stage as Options["stage"], out, ai: !has("--no-ai"), model: flag("--model"), mask: flag("--mask"), segmenter: flag("--segmenter"), keypoints: flag("--keypoints"), poseCmd: flag("--pose-cmd"), focus })
const outFor = (file: string, root?: string): string => join(root ?? "output/critic", basename(file, extname(file)) + (extname(file).toLowerCase() === ".clip" ? "-clip" : ""))

const once = async (file: string, out?: string): Promise<void> => {
  const t = Date.now()
  process.stdout.write(`critic: ${file} (${stage})\n`)
  const r = await analyze(file, base(out ?? outFor(file)))
  process.stdout.write(`${summary(r)}\n  ${((Date.now() - t) / 1000).toFixed(1)} s\n`)
}

const dir = flag("--watch")
if (dir) {
  const root = flag("--out") ?? "output/critic"
  process.stdout.write(`critic: watching ${resolve(dir)} for .png .jpg .clip (stage ${stage}${has("--no-ai") ? ", no AI" : ""}); reports in ${resolve(root)}. Ctrl+C to stop.\n`)
  watchFolder(dir, (f) => once(f, outFor(f, root)), { ignore: [root], initial: has("--initial"), onError: (f, e) => process.stderr.write(`critic: ${f}: ${e.message}\n`) })
} else {
  const file = positional[0]!
  if (!isSupported(file)) fail(`${file}: use a .png, .jpg/.jpeg or .clip file`)
  once(file, flag("--out")).catch((e: Error) => fail(e.message))
}
