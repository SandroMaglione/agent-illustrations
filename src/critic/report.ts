/** The review as one self-contained HTML file: every image is embedded, no network, opens from disk. */
import type { Crop, FocalMetrics } from "./checks/focal.ts"
import type { PoseMetrics } from "./checks/pose.ts"
import type { SatMetrics } from "./checks/saturation.ts"
import type { SilMetrics } from "./checks/silhouette.ts"
import type { SquintMetrics } from "./checks/squint.ts"
import type { ValueMetrics } from "./checks/values.ts"
import { encodeJpeg, resize, toPng, type Img } from "./image.ts"
import type { Finding, Profile, Stage } from "./stages.ts"
import type { CritiqueResult } from "./vlm.ts"

export type ReportInput = {
  title: string; path: string; stage: Stage; profile: Profile; canvas: { w: number; h: number }; notes: Array<string>
  original: Img; views: Record<string, Img>; red: Img; crops: Array<Crop>; findings: Array<Finding>
  val: ValueMetrics; sat: SatMetrics; sil: SilMetrics; sq: SquintMetrics; foc: FocalMetrics; pose: PoseMetrics | null; poseSkipped?: string
  ai: CritiqueResult | null
}

const esc = (s: unknown): string => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
const jpg = (img: Img): string => `data:image/jpeg;base64,${encodeJpeg(img, 85).toString("base64")}`
const png = (img: Img): string => `data:image/png;base64,${toPng(img).toString("base64")}`
const pc = (v: number): string => `${Math.round(v * 100)}%`
const n1 = (v: number | null | undefined, d = 1): string => (v == null || !Number.isFinite(v) ? "–" : v.toFixed(d))

const VIEWS: Record<string, [string, string]> = {
  grey: ["Greyscale (L*)", "Perceived lightness only. Do the big shapes still separate? Is the face the lightest-light / darkest-dark meeting point?"],
  notan: ["3-value map", "Dark, mid and light groups. A strong design reads as a few large, simple shapes with one group dominant."],
  squint: ["Squint test", "Detail blurred away: what reads first from across the room."],
  flip: ["Horizontal flip", "Fresh eyes: leaning figures, lopsided faces and drifting eyes jump out when mirrored."],
  silhouette: ["Silhouette", "Pose and outfit as a single shape. Can you tell what the figure is doing?"],
  saturation: ["Saturation heatmap", "Saturation × value. Hot areas pull the eye: they should be at or next to the focus."],
  mud: ["Muddy mid-tones", "Magenta: mid values with almost no chroma, where colour has gone grey."],
  saliency: ["Attention map", "Value contrast, colour contrast and edge density combined: a rough map of where the eye goes."],
  pose: ["Pose skeleton", "Keypoints from the pose estimator; blue left, red right."],
}

const histogram = (v: ValueMetrics): string => {
  const W = 600, H = 140, max = Math.max(...v.histogram, 1e-9), bw = W / 101
  const bars = v.histogram.map((h, i) => `<rect x="${(i * bw).toFixed(1)}" y="${(H - (h / max) * (H - 18)).toFixed(1)}" width="${(bw + 0.4).toFixed(1)}" height="${((h / max) * (H - 18)).toFixed(1)}" fill="var(--bar)"/>`).join("")
  const band = `<rect x="${30 * bw}" y="0" width="${40 * bw}" height="${H}" fill="var(--band)"/>`
  const th = v.thresholds.map((t) => `<line x1="${t * bw}" x2="${t * bw}" y1="0" y2="${H}" stroke="var(--accent)" stroke-width="2" stroke-dasharray="4 3"/>`).join("")
  return `<svg viewBox="0 0 ${W} ${H + 16}" role="img" aria-label="Histogram of lightness L*, 0 to 100">${band}${bars}${th}<text x="0" y="${H + 14}" class="ax">L* 0</text><text x="${W / 2}" y="${H + 14}" class="ax" text-anchor="middle">50</text><text x="${W}" y="${H + 14}" class="ax" text-anchor="end">100</text><text x="${35 * bw}" y="12" class="ax">mid-tone band 30–70</text></svg>`
}

const findingCard = (f: Finding): string => `<li class="f ${f.severity}" id="f${f.n}"><div class="fh"><span class="num">${f.n}</span><span class="sev">${f.severity}</span><span class="src">${f.source === "ai" ? `AI${f.confidence != null ? ` · ${Math.round(f.confidence * 100)}% sure` : ""}` : `measured · ${esc(f.check)}`}</span>${f.region || f.point ? '<span class="pin" title="Marked on the redline">on redline</span>' : ""}</div><h3>${esc(f.title)}</h3><p>${esc(f.detail)}</p>${f.fix ? `<p class="fix"><b>Fix in CSP:</b> ${esc(f.fix)}</p>` : ""}${f.evidence ? `<p class="ev">${esc(f.evidence)}</p>` : ""}</li>`

export const report = (r: ReportInput): string => {
  const red = resize(r.red, r.original.w, r.original.h)
  const major = r.findings.filter((f) => f.severity === "major").length, minor = r.findings.filter((f) => f.severity === "minor").length
  const ai = r.ai
  const aiHtml = !ai ? `<p class="muted">Skipped (<code>--no-ai</code>). Every check above is deterministic and needs no API key.</p>`
    : !ai.ok ? `<p class="warn">AI critique unavailable: ${esc(ai.reason)}. The measured checks are unaffected.</p>`
    : `<p class="lead">${esc(ai.critique.overall)}</p><p><span class="chip">${esc(ai.critique.stage_readiness.replace("_", " "))}</span> <span class="muted">model ${esc(ai.model)}</span></p>${ai.critique.strengths.length ? `<h3>Keep</h3><ul>${ai.critique.strengths.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>` : ""}${ai.critique.measurement_disagreements.length ? `<h3>Where the critic disagrees with a measurement</h3><ul>${ai.critique.measurement_disagreements.map((d) => `<li><b>${esc(d.measurement)}:</b> ${esc(d.comment)}</li>`).join("")}</ul>` : ""}<p class="muted">The AI's issues are in the numbered list with the measured ones, marked “AI”.</p>`
  const views = Object.entries(r.views).map(([k, img]) => { const [t, d] = VIEWS[k] ?? [k, ""]; const src = k === "silhouette" || k === "notan" ? png(img) : jpg(img); return `<figure><img src="${src}" alt="${esc(t)}"><figcaption><b>${esc(t)}</b> ${esc(d)}</figcaption></figure>` }).join("")
  const crops = r.crops.map((c) => `<figure><img src="${jpg(c.img)}" alt="${esc(c.name)}"><figcaption><b>${esc(c.name)}</b> ${esc(c.why)} · canvas ${Math.round(c.box.x)},${Math.round(c.box.y)} ${Math.round(c.box.w)}×${Math.round(c.box.h)}</figcaption></figure>`).join("")
  const sw = r.sat.palette.map((s) => `<div class="sw"><span style="background:${s.hex}"></span><code>${s.hex}</code><small>${pc(s.share)} · L* ${Math.round(s.L)}</small></div>`).join("")
  const row = (k: string, v: string): string => `<tr><th>${k}</th><td>${v}</td></tr>`
  const poseTable = r.pose ? [row("source", esc(r.pose.source)), row("shoulder tilt", `${n1(r.pose.shoulderTilt)}°`), row("hip tilt", `${n1(r.pose.hipTilt)}°`), row("shoulders vs hips", esc(r.pose.counter ?? "–")), row("heads tall", `${n1(r.pose.headsTall)}${r.pose.headMethod ? ` <small>(${esc(r.pose.headMethod)})</small>` : ""}`), ...r.pose.limbs.map((l) => row(esc(l.name), `L ${l.left.toFixed(0)} / R ${l.right.toFixed(0)} px · ×${l.ratio.toFixed(2)}`))].join("") : row("pose", esc(r.poseSkipped ?? "skipped"))
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Art review: ${esc(r.title)}</title>
<style>
:root{--bg:#f6f5f2;--card:#fff;--ink:#1d1d1f;--muted:#6b6b70;--line:#e3e1dc;--accent:#d2335b;--bar:#55606e;--band:#e9e2f3;--major:#d92b35;--minor:#e07b00;--note:#2f7fd8;--chip:#efe9fb}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#141417;--card:#1d1d22;--ink:#ececef;--muted:#9a9aa3;--line:#2e2e35;--accent:#ff6a8b;--bar:#a7b0bd;--band:#2c2540;--chip:#2c2540}}
:root[data-theme="dark"]{--bg:#141417;--card:#1d1d22;--ink:#ececef;--muted:#9a9aa3;--line:#2e2e35;--accent:#ff6a8b;--bar:#a7b0bd;--band:#2c2540;--chip:#2c2540}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:1180px;margin:0 auto;padding:24px 16px 64px}h1{font-size:26px;margin:0 0 4px}h2{font-size:19px;margin:36px 0 12px;border-bottom:1px solid var(--line);padding-bottom:6px}h3{font-size:15px;margin:6px 0}
.muted,.ev,small{color:var(--muted)}.warn{color:var(--minor)}.lead{font-size:16.5px}code{font-size:13px}
.chip{display:inline-block;background:var(--chip);border-radius:99px;padding:2px 10px;font-size:13px;font-weight:600;text-transform:capitalize}
.top{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);gap:24px;align-items:start}@media (max-width:860px){.top{grid-template-columns:1fr}}
.stack{position:relative;border-radius:10px;overflow:hidden;background:#fff;border:1px solid var(--line)}.stack img{display:block;width:100%;height:auto}.stack .ov{position:absolute;inset:0}
#tog:not(:checked)~.stack .ov{display:none}label{font-size:14px;cursor:pointer}
ol.fl{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:10px}
.f{background:var(--card);border:1px solid var(--line);border-left:5px solid var(--note);border-radius:10px;padding:10px 14px}.f.major{border-left-color:var(--major)}.f.minor{border-left-color:var(--minor)}.f p{margin:4px 0}.fix{font-size:14px}.ev{font-size:12.5px}
.fh{display:flex;gap:8px;align-items:center;font-size:12px;text-transform:uppercase;letter-spacing:.03em;color:var(--muted);flex-wrap:wrap}
.num{background:var(--ink);color:var(--bg);border-radius:6px;padding:0 7px;font-weight:700;font-size:13px}.f.major .sev{color:var(--major);font-weight:700}.f.minor .sev{color:var(--minor);font-weight:700}.pin{margin-left:auto}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px}figure{margin:0;background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden}figure img{display:block;width:100%;height:auto;background:#fff}figcaption{padding:8px 10px;font-size:13px;color:var(--muted)}figcaption b{color:var(--ink);display:block}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px}.two{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px}
table{border-collapse:collapse;width:100%;font-size:14px}th{text-align:left;font-weight:500;color:var(--muted);padding:4px 10px 4px 0;width:45%}td{padding:4px 0}
svg{width:100%;height:auto}svg .ax{font-size:11px;fill:var(--muted)}
.pal{display:flex;flex-wrap:wrap;gap:10px}.sw{display:flex;flex-direction:column;align-items:flex-start;gap:2px;font-size:12px}.sw span{width:64px;height:40px;border-radius:6px;border:1px solid var(--line)}
.legend{display:flex;gap:14px;flex-wrap:wrap;font-size:13px;color:var(--muted);margin:8px 0}.legend i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:5px;vertical-align:-1px}
details pre{white-space:pre-wrap;word-break:break-word;font-size:12px;background:var(--card);border:1px solid var(--line);border-radius:8px;padding:10px;max-height:480px;overflow:auto}
</style></head><body><main>
<h1>${esc(r.title)}</h1>
<p class="muted"><span class="chip">${esc(r.stage)}</span> ${esc(r.profile.summary)}<br><code>${esc(r.path)}</code> · canvas ${r.canvas.w}×${r.canvas.h} px · ${major} major, ${minor} minor${r.notes.length ? ` · ${esc(r.notes.join("; "))}` : ""}</p>
<div class="top"><section>
<input type="checkbox" id="tog" checked> <label for="tog">Show redline</label>
<div class="stack"><img src="${jpg(r.original)}" alt="The picture"><img class="ov" src="${png(red)}" alt="Redline overlay"></div>
<div class="legend"><span><i style="background:var(--major)"></i>major</span><span><i style="background:var(--minor)"></i>minor</span><span><i style="background:var(--note)"></i>note</span><span><i style="background:#ff961e"></i>eye flow A→B→…</span><span><i style="background:#14c85a"></i>focus</span><span><i style="background:#00c8e6"></i>main axis</span></div>
<p class="muted">The same marks are in <code>redline.png</code>, at canvas size with a transparent background: in CLIP STUDIO PAINT use File › Import › Image (or drag it in) and keep it as the top layer.</p>
</section><section><h2 style="margin-top:0">Findings</h2>
${r.findings.length ? `<ol class="fl">${r.findings.map(findingCard).join("")}</ol>` : `<p>No issues flagged at this stage.</p>`}
</section></div>
<h2>AI critique</h2><div class="card">${aiHtml}</div>
<h2>Views</h2><div class="grid">${views}</div>
<h2>Measurements</h2><div class="two">
<div class="card"><h3>Value</h3>${histogram(r.val)}<table>${row("measured over", r.val.over)}${row("L* 5th / 50th / 95th", `${n1(r.val.p5, 0)} / ${n1(r.val.p50, 0)} / ${n1(r.val.p95, 0)}`)}${row("value range (p95 − p5)", n1(r.val.range, 0))}${row("in the mid-tone band", pc(r.val.midShare))}${row("3-value thresholds", r.val.thresholds.join(" / "))}${row("dark / mid / light groups", r.val.groups.map(pc).join(" / "))}${row("group means", r.val.means.map((m) => n1(m, 0)).join(" / "))}${row("muddy mid-tones", pc(r.val.mudShare))}${row("contrast left after squint", n1(r.sq.contrast))}</table></div>
<div class="card"><h3>Colour</h3><div class="pal">${sw}</div><table style="margin-top:10px">${row("mean saturation (S·V)", n1(r.sat.meanSat, 2))}${row("highly saturated share", pc(r.sat.hotShare))}${row("saturated hotspots", String(r.sat.hotspots.length))}</table></div>
<div class="card"><h3>Silhouette & balance</h3><table>${row("source", `${esc(r.sil.source)}${r.sil.reliable ? "" : " (unreliable)"}`)}${row("", `<small>${esc(r.sil.note)}</small>`)}${row("figure coverage", pc(r.sil.coverage))}${row("outline complexity", `${n1(r.sil.complexity, 2)} <small>(disc = 1)</small>`)}${row("negative spaces", String(r.sil.negativeSpaces))}${row("main axis", `${n1(r.sil.axisTilt)}° from vertical`)}${row("centre of mass vs base", `${n1(r.sil.balance, 2)} figure widths`)}${row("cropped at", Object.entries(r.sil.cropped).filter(([, v]) => v).map(([k]) => k).join(", ") || "none")}</table></div>
<div class="card"><h3>Focus & pose</h3><table>${row("focal area", r.foc.face ? `${esc(r.foc.face.method)} <small>(confidence ${pc(r.foc.face.confidence)})</small>` : "not found")}${row("focus vs strongest attractor", n1(r.foc.focusShare, 2))}${row("attention peaks in focus", `${r.foc.peaks.filter((p) => p.inFocus).length} of ${r.foc.peaks.length}`)}${poseTable}</table></div>
</div>
${crops ? `<h2>Focal crops (full resolution)</h2><div class="grid">${crops}</div>` : ""}
<h2>Raw data</h2><details><summary>All findings as JSON</summary><pre>${esc(JSON.stringify(r.findings, null, 2))}</pre></details>
<p class="muted" style="margin-top:28px">Made by <code>scripts/critic.ts</code>. The measured findings are deterministic: the same file gives the same report. Thresholds and what each check does: <code>docs/critic.md</code>.</p>
</main></body></html>`
}
