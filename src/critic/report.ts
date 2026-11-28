/**
 * `review.html`: one self-contained file (every image embedded as a data URI, inline CSS and a little inline script, no
 * network). A viewer switches between the original and each diagnostic view, or shows two side by side; pins for every
 * located finding sit over the image and are linked both ways to the critique cards.
 */
import type { Crop, FocalMetrics } from "./checks/focal.ts"
import type { PoseMetrics } from "./checks/pose.ts"
import type { SatMetrics } from "./checks/saturation.ts"
import type { SilMetrics } from "./checks/silhouette.ts"
import type { SquintMetrics } from "./checks/squint.ts"
import type { ValueMetrics } from "./checks/values.ts"
import { encodeJpeg, toPng, type Box, type Img } from "./image.ts"
import type { Finding, Profile, Stage } from "./stages.ts"
import type { CritiqueResult } from "./vlm.ts"

export type Guides = { flow: Array<{ x: number; y: number }>; focus: Box | null; axis: { x: number; y: number; tilt: number; length: number } | null }
export type ReportInput = {
  title: string; path: string; stage: Stage; profile: Profile; canvas: { w: number; h: number }; notes: Array<string>
  original: Img; views: Record<string, Img>; crops: Array<Crop>; findings: Array<Finding>; guides: Guides
  val: ValueMetrics; sat: SatMetrics; sil: SilMetrics; sq: SquintMetrics; foc: FocalMetrics; pose: PoseMetrics | null; poseSkipped?: string
  ai: CritiqueResult | null
}

const esc = (s: unknown): string => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
const jpg = (img: Img): string => `data:image/jpeg;base64,${encodeJpeg(img, 85).toString("base64")}`
const png = (img: Img): string => `data:image/png;base64,${toPng(img).toString("base64")}`
const pc = (v: number): string => `${Math.round(v * 100)}%`
const n1 = (v: number | null | undefined, d = 1): string => (v == null || !Number.isFinite(v) ? "–" : v.toFixed(d))

/** The views in viewer order, with what to look for in each. */
export const VIEWS: Array<[string, string, string]> = [
  ["original", "Original", "The picture as exported."],
  ["grey", "Greyscale", "Perceived lightness (CIE L*). Do the big shapes still separate?"],
  ["notan", "3-Value", "Dark, mid and light groups. A strong design reads as a few large, simple shapes, one group dominant."],
  ["saturation", "Saturation", "Saturation × value. Hot areas pull the eye: they belong at or next to the focus."],
  ["silhouette", "Silhouette", "Pose and outfit as one shape. Can you tell what the figure is doing?"],
  ["flip", "Flip", "Mirrored: leaning figures, lopsided faces and drifting eyes jump out. Pins are mirrored too."],
  ["squint", "Squint", "Detail blurred away: what reads first from across the room."],
  ["mud", "Mud", "Magenta: mid values with almost no chroma, where colour has gone grey."],
  ["saliency", "Attention", "Value contrast, colour contrast and edge density: a rough map of where the eye goes."],
  ["pose", "Pose", "Keypoints from the pose estimator; blue is the figure's left, red its right."],
]

const histogram = (v: ValueMetrics): string => {
  const W = 600, H = 140, max = Math.max(...v.histogram, 1e-9), bw = W / 101
  const bars = v.histogram.map((h, i) => `<rect x="${(i * bw).toFixed(1)}" y="${(H - (h / max) * (H - 18)).toFixed(1)}" width="${(bw + 0.4).toFixed(1)}" height="${((h / max) * (H - 18)).toFixed(1)}" fill="var(--bar)"/>`).join("")
  const th = v.thresholds.map((t) => `<line x1="${t * bw}" x2="${t * bw}" y1="0" y2="${H}" stroke="var(--ai)" stroke-width="2" stroke-dasharray="4 3"/>`).join("")
  return `<svg class="hist" viewBox="0 0 ${W} ${H + 16}" role="img" aria-label="Histogram of lightness L*, 0 to 100, with the 3-value thresholds"><rect x="${30 * bw}" y="0" width="${40 * bw}" height="${H}" fill="var(--band)"/>${bars}${th}<text x="0" y="${H + 14}">L* 0</text><text x="${W / 2}" y="${H + 14}" text-anchor="middle">50</text><text x="${W}" y="${H + 14}" text-anchor="end">100</text><text x="${35 * bw}" y="12">mid-tones 30–70</text></svg>`
}

const card = (f: Finding): string => f.source === "ai"
  ? `<article class="card ai" id="c-${esc(f.label)}" data-k="${esc(f.label)}" tabindex="0"><header><span class="pinlbl ai">${esc(f.label)}</span><span class="chip">${esc(f.category)}</span><span class="muted">priority ${f.priority}</span></header><p class="diag">${esc(f.detail)}</p><p class="fix"><b>Fix:</b> ${esc(f.fix)}</p></article>`
  : `<article class="card m ${f.severity}" id="c-${esc(f.label)}" data-k="${esc(f.label)}" tabindex="0"><header><span class="pinlbl m">${esc(f.label)}</span><span class="sev">${f.severity}</span><span class="muted">${esc(f.check)}</span>${f.region || f.point ? "" : '<span class="muted">· whole picture</span>'}</header><h3>${esc(f.title)}</h3><p>${esc(f.detail)}</p>${f.fix ? `<p class="fix"><b>Fix:</b> ${esc(f.fix)}</p>` : ""}${f.evidence ? `<p class="ev">${esc(f.evidence)}</p>` : ""}</article>`

export const report = (r: ReportInput): string => {
  const { w: W, h: H } = r.canvas
  const views = VIEWS.filter(([k]) => k === "original" || r.views[k])
  const data = {
    W, H,
    views: views.map(([k, label, desc]) => ({ k, label, desc, src: k === "original" ? null : k === "silhouette" || k === "notan" ? png(r.views[k]!) : jpg(r.views[k]!) })),
    pins: r.findings.filter((f) => f.label && (f.region || f.point)).map((f) => ({ k: f.label, ai: f.source === "ai", sev: f.severity, ...(f.region ? { x: f.region.x, y: f.region.y, w: f.region.w, h: f.region.h } : { px: f.point!.x, py: f.point!.y }) })),
    guides: r.guides,
  }
  const ai = r.ai, aiCards = r.findings.filter((f) => f.source === "ai"), mCards = r.findings.filter((f) => f.source !== "ai")
  const aiHead = !ai ? `<p class="muted">AI critique skipped (<code>--no-ai</code>). Every measured check below runs locally and needs no key.</p>`
    : !ai.ok ? `<p class="warn">AI critique unavailable: ${esc(ai.reason)}. The measured checks are unaffected.</p>`
    : `<p class="lead">${esc(ai.critique.summary)}</p><p class="muted">${esc(ai.provider)}${ai.warnings.length ? ` · ${esc(ai.warnings.join("; "))}` : ""}</p>`
  const sw = r.sat.palette.map((s) => `<div class="sw"><span style="background:${s.hex}"></span><code>${s.hex}</code><small>${pc(s.share)} · L* ${Math.round(s.L)}</small></div>`).join("")
  const row = (k: string, v: string): string => `<tr><th>${k}</th><td>${v}</td></tr>`
  const poseRows = r.pose ? [row("keypoints from", esc(r.pose.source)), row("shoulder tilt", `${n1(r.pose.shoulderTilt)}°`), row("hip tilt", `${n1(r.pose.hipTilt)}°`), row("shoulders vs hips", esc(r.pose.counter ?? "–")), row("height in heads", `${n1(r.pose.headsTall)}${r.pose.headMethod ? ` <small>(${esc(r.pose.headMethod)})</small>` : ""}`), ...r.pose.limbs.map((l) => row(esc(l.name), `L ${l.left.toFixed(0)} / R ${l.right.toFixed(0)} px · ×${l.ratio.toFixed(2)}`))].join("") : row("pose", `<small>${esc(r.poseSkipped ?? "skipped")}</small>`)
  const crops = r.crops.map((c) => `<figure><img src="${jpg(c.img)}" alt="${esc(c.name)}"><figcaption><b>${esc(c.name)}</b> ${esc(c.why)} · canvas ${Math.round(c.box.x)},${Math.round(c.box.y)} ${Math.round(c.box.w)}×${Math.round(c.box.h)}</figcaption></figure>`).join("")
  const tabs = views.map(([k, label], i) => `<button type="button" role="tab" data-v="${k}" aria-selected="${i === 0}" title="${i < 9 ? `key ${i + 1}` : ""}">${esc(label)}</button>`).join("")
  const opts = views.map(([k, label]) => `<option value="${k}"${k === "notan" ? " selected" : ""}>${esc(label)}</option>`).join("")
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Review: ${esc(r.title)}</title>
<style>
:root{--bg:#f5f4f1;--card:#fff;--ink:#1c1c1f;--muted:#68686f;--line:#e1dfda;--ai:#ff1f5f;--m:#f09000;--major:#d92b35;--minor:#e07b00;--note:#2f7fd8;--bar:#55606e;--band:#ece4f5;--chip:#efe9fb;--hot:#fff4c2}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#131316;--card:#1c1c21;--ink:#ececef;--muted:#9a9aa3;--line:#2e2e35;--bar:#a7b0bd;--band:#2a2340;--chip:#2c2540;--hot:#3a3415}}
:root[data-theme="dark"]{--bg:#131316;--card:#1c1c21;--ink:#ececef;--muted:#9a9aa3;--line:#2e2e35;--bar:#a7b0bd;--band:#2a2340;--chip:#2c2540;--hot:#3a3415}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:1240px;margin:0 auto;padding:22px 16px 64px}h1{font-size:24px;margin:0 0 4px;word-break:break-all}h2{font-size:18px;margin:34px 0 12px;border-bottom:1px solid var(--line);padding-bottom:6px}h3{font-size:15px;margin:4px 0}
.muted,.ev,small{color:var(--muted)}.warn{color:var(--minor)}.lead{font-size:16px;margin:0 0 4px}code{font-size:13px}
.chip{display:inline-block;background:var(--chip);border-radius:99px;padding:1px 9px;font-size:12.5px;font-weight:600}
.layout{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:22px;align-items:start}@media (max-width:900px){.layout{grid-template-columns:1fr}}
.viewer{position:sticky;top:8px}@media (max-width:900px){.viewer{position:static}}
.tabs{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px}.tabs button{font:inherit;font-size:13px;border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:7px;padding:4px 10px;cursor:pointer}.tabs button[aria-selected="true"]{background:var(--ink);color:var(--bg);border-color:var(--ink)}
.opts{display:flex;flex-wrap:wrap;gap:6px 16px;align-items:center;font-size:13.5px;margin-bottom:8px}.opts select{font:inherit;font-size:13px}
.panes{display:grid;grid-template-columns:1fr;gap:10px}.panes.two{grid-template-columns:1fr 1fr}
.pane{margin:0}.frame{position:relative;width:fit-content;max-width:100%;margin:0 auto;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:#fff}.frame img{display:block;max-width:100%;max-height:78vh;width:auto;height:auto}.frame svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.pane figcaption{font-size:12.5px;color:var(--muted);padding:4px 2px}
svg .pin{cursor:pointer}svg .pin rect,svg .pin circle.ring{fill:none;stroke-width:2.5;vector-effect:non-scaling-stroke}svg .pin .edge{stroke:#0c0c12;stroke-opacity:.55;stroke-width:5}
svg .pin.ai rect.c,svg .pin.ai circle.ring.c{stroke:var(--ai)}svg .pin.m rect.c,svg .pin.m circle.ring.c{stroke:var(--m)}svg .pin.ai .dot{fill:var(--ai)}svg .pin.m .dot{fill:var(--m)}svg .pin .dot{stroke:#fff;stroke-width:2;vector-effect:non-scaling-stroke}
svg .pin text{fill:#fff;font-weight:700;text-anchor:middle;dominant-baseline:central;font-family:system-ui,sans-serif;pointer-events:none}
svg .pin.hot rect.c,svg .pin.hot circle.ring.c{stroke-width:5}svg .pin.dim{opacity:.35}svg .guide{fill:none;stroke-width:2;vector-effect:non-scaling-stroke}
.cards{display:flex;flex-direction:column;gap:9px}.card{background:var(--card);border:1px solid var(--line);border-left:5px solid var(--note);border-radius:10px;padding:9px 13px;outline:none}.card.ai{border-left-color:var(--ai)}.card.m.major{border-left-color:var(--major)}.card.m.minor{border-left-color:var(--minor)}
.card.hot,.card:focus-visible{background:var(--hot)}.card p{margin:4px 0}.card header{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:12.5px}.diag{font-size:15px}.fix{font-size:14px}.ev{font-size:12.5px}
.pinlbl{display:inline-grid;place-items:center;min-width:24px;height:24px;padding:0 5px;border-radius:99px;color:#fff;font-weight:700;font-size:12.5px;border:2px solid #fff;box-shadow:0 0 0 1px #0004}.pinlbl.ai{background:var(--ai)}.pinlbl.m{background:var(--m)}
.sev{text-transform:uppercase;font-weight:700;letter-spacing:.03em}.major .sev{color:var(--major)}.minor .sev{color:var(--minor)}.note .sev{color:var(--note)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}figure{margin:0}.grid figure{background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden}.grid img{display:block;width:100%;height:auto;background:#fff}.grid figcaption{padding:7px 10px;font-size:12.5px;color:var(--muted)}.grid figcaption b{color:var(--ink);display:block}
.box{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px}.two{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:12px}
table{border-collapse:collapse;width:100%;font-size:14px}th{text-align:left;font-weight:500;color:var(--muted);padding:3px 10px 3px 0;width:46%;vertical-align:top}td{padding:3px 0}
.hist{width:100%;height:auto}.hist text{font-size:11px;fill:var(--muted)}
.pal{display:flex;flex-wrap:wrap;gap:10px}.sw{display:flex;flex-direction:column;gap:2px;font-size:12px}.sw span{width:64px;height:40px;border-radius:6px;border:1px solid var(--line)}
details pre{white-space:pre-wrap;word-break:break-word;font-size:12px;background:var(--card);border:1px solid var(--line);border-radius:8px;padding:10px;max-height:460px;overflow:auto}
</style></head><body><main>
<h1>${esc(r.title)}</h1>
<p class="muted"><span class="chip">${esc(r.stage)}</span> ${esc(r.profile.summary)}<br><code>${esc(r.path)}</code> · ${W}×${H} px${r.notes.length ? ` · ${esc(r.notes.join("; "))}` : ""}</p>
<div class="layout">
<section class="viewer" aria-label="Viewer">
<div class="tabs" role="tablist" aria-label="View">${tabs}</div>
<div class="opts"><label><input type="checkbox" id="sbs"> Side by side with</label><select id="right" aria-label="Right-hand view">${opts}</select><label><input type="checkbox" id="pins" checked> Pins</label><label><input type="checkbox" id="guides"> Eye flow, focus &amp; axis</label></div>
<div class="panes" id="panes">
<figure class="pane" id="pa"><div class="frame"><img id="orig" src="${jpg(r.original)}" alt="${esc(r.title)}"><svg aria-hidden="true"></svg></div><figcaption></figcaption></figure>
<figure class="pane" id="pb" hidden><div class="frame"><img alt=""><svg aria-hidden="true"></svg></div><figcaption></figcaption></figure>
</div>
<p class="muted" style="font-size:12.5px">Pins: <span class="pinlbl ai" style="height:20px;min-width:20px;font-size:11px">1</span> AI priorities · <span class="pinlbl m" style="height:20px;font-size:11px">M1</span> measured. Hover a card to find its pin; click a pin to jump to its card. The same marks are in <code>ai_redline.png</code>.</p>
</section>
<section aria-label="Critique">
<h2 style="margin-top:0">AI critique</h2>${aiHead}
${aiCards.length ? `<div class="cards">${aiCards.map(card).join("")}</div>` : ""}
<h2>Measured</h2>
${mCards.length ? `<div class="cards">${mCards.map(card).join("")}</div>` : `<p class="muted">Nothing flagged at this stage.</p>`}
</section>
</div>
<h2>Palette &amp; measurements</h2><div class="two">
<div class="box"><h3>Dominant colours</h3><div class="pal">${sw}</div><table style="margin-top:10px">${row("mean saturation (S·V)", n1(r.sat.meanSat, 2))}${row("highly saturated share", pc(r.sat.hotShare))}${row("saturated hotspots", String(r.sat.hotspots.length))}</table></div>
<div class="box"><h3>Value</h3>${histogram(r.val)}<table>${row("measured over", r.val.over)}${row("L* 5th / 50th / 95th", `${n1(r.val.p5, 0)} / ${n1(r.val.p50, 0)} / ${n1(r.val.p95, 0)}`)}${row("value range", n1(r.val.range, 0))}${row("in the mid-tone band", pc(r.val.midShare))}${row("dark / mid / light", r.val.groups.map(pc).join(" / "))}${row("group means (L*)", r.val.means.map((m) => n1(m, 0)).join(" / "))}${row("muddy mid-tones", pc(r.val.mudShare))}${row("contrast left after squint", n1(r.sq.contrast))}</table></div>
<div class="box"><h3>Silhouette &amp; balance</h3><table>${row("source", `${esc(r.sil.source)}${r.sil.reliable ? "" : " (unreliable)"}<br><small>${esc(r.sil.note)}</small>`)}${row("figure coverage", pc(r.sil.coverage))}${row("outline complexity", `${n1(r.sil.complexity, 2)} <small>(disc = 1)</small>`)}${row("negative spaces", String(r.sil.negativeSpaces))}${row("main axis", `${n1(r.sil.axisTilt)}° from vertical`)}${row("centre of mass vs base", `${n1(r.sil.balance, 2)} figure widths`)}${row("cut by the frame at", Object.entries(r.sil.cropped).filter(([, v]) => v).map(([k]) => k).join(", ") || "none")}</table></div>
<div class="box"><h3>Focus &amp; proportion</h3><table>${row("focal area", r.foc.face ? `${esc(r.foc.face.method)} <small>(confidence ${pc(r.foc.face.confidence)})</small>` : "not found")}${row("focus vs strongest attractor", n1(r.foc.focusShare, 2))}${row("attention peaks in focus", `${r.foc.peaks.filter((p) => p.inFocus).length} of ${r.foc.peaks.length}`)}${poseRows}</table></div>
</div>
${crops ? `<h2>Focal crops (full resolution)</h2><div class="grid">${crops}</div>` : ""}
<h2>Raw data</h2><details><summary>All findings as JSON</summary><pre>${esc(JSON.stringify(r.findings, null, 2))}</pre></details>
<p class="muted" style="margin-top:26px">Made by <code>scripts/critic.ts</code>. Measured findings are deterministic: the same file gives the same findings. What each check does: <code>src/critic/README.md</code>.</p>
</main>
<script type="application/json" id="data">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>
<script>
(() => {
  const D = JSON.parse(document.getElementById("data").textContent), NS = "http://www.w3.org/2000/svg", u = Math.max(D.W, D.H) / 1000
  const orig = document.getElementById("orig").src, V = Object.fromEntries(D.views.map((v) => [v.k, { ...v, src: v.src || orig }]))
  const st = { a: "original", b: document.getElementById("right").value, pins: true, guides: false, two: false }
  const el = (t, a, p) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e }
  const hot = (k) => {
    document.querySelectorAll("svg .pin").forEach((g) => { g.classList.toggle("hot", g.dataset.k === k); g.classList.toggle("dim", k != null && g.dataset.k !== k) })
    document.querySelectorAll(".card").forEach((c) => c.classList.toggle("hot", c.dataset.k === k))
  }
  const draw = (pane, k) => {
    const v = V[k], img = pane.querySelector("img"), svg = pane.querySelector("svg"), flip = k === "flip"
    if (img.getAttribute("src") !== v.src) img.src = v.src
    img.alt = v.label; pane.querySelector("figcaption").textContent = v.label + ": " + v.desc
    svg.setAttribute("viewBox", "0 0 " + D.W + " " + D.H); svg.setAttribute("preserveAspectRatio", "none"); svg.replaceChildren()
    const X = (x, w = 0) => (flip ? D.W - x - w : x)
    if (st.guides) {
      const g = D.guides
      if (g.focus) el("rect", { class: "guide", x: X(g.focus.x, g.focus.w), y: g.focus.y, width: g.focus.w, height: g.focus.h, stroke: "#14c85a", "stroke-dasharray": "8 6" }, svg)
      if (g.axis) { const a = g.axis.tilt * Math.PI / 180, dx = Math.sin(a) * g.axis.length / 2 * (flip ? -1 : 1), dy = Math.cos(a) * g.axis.length / 2, cx = X(g.axis.x); el("line", { class: "guide", x1: cx - dx, y1: g.axis.y + dy, x2: cx + dx, y2: g.axis.y - dy, stroke: "#00c8e6" }, svg); el("line", { class: "guide", x1: cx, y1: g.axis.y - g.axis.length / 2, x2: cx, y2: g.axis.y + g.axis.length / 2, stroke: "#00c8e6", "stroke-opacity": ".4" }, svg) }
      g.flow.forEach((p, i) => { const q = g.flow[i + 1]; if (q) el("line", { class: "guide", x1: X(p.x), y1: p.y, x2: X(q.x), y2: q.y, stroke: "#ff961e", "stroke-dasharray": "3 5" }, svg); el("circle", { class: "guide", cx: X(p.x), cy: p.y, r: 12 * u, stroke: "#ff961e" }, svg); const t = el("text", { x: X(p.x), y: p.y - 18 * u, fill: "#ff961e", "font-size": 16 * u, "text-anchor": "middle", "font-weight": "700" }, svg); t.textContent = String.fromCharCode(65 + i) })
    }
    if (!st.pins) return
    for (const p of [...D.pins.filter((q) => !q.ai), ...D.pins.filter((q) => q.ai)]) {
      const g = el("g", { class: "pin " + (p.ai ? "ai" : "m"), "data-k": p.k, tabindex: "0", role: "button", "aria-label": "Finding " + p.k }, svg)
      let px, py
      if (p.w != null) { const x = X(p.x, p.w); for (const c of ["edge", "c"]) el("rect", { class: c, x, y: p.y, width: p.w, height: p.h }, g); px = x; py = p.y }
      else { const x = X(p.px); for (const c of ["edge", "c"]) el("circle", { class: "ring " + c, cx: x, cy: p.py, r: 24 * u }, g); px = x + 24 * u; py = p.py - 24 * u }
      const r = Math.max(13 * u, (p.k.length * 7 + 8) * u)
      px = Math.min(D.W - r, Math.max(r, px)); py = Math.min(D.H - r, Math.max(r, py))
      el("circle", { class: "dot", cx: px, cy: py, r }, g)
      const t = el("text", { x: px, y: py, "font-size": 15 * u }, g); t.textContent = p.k
      const go = () => { const c = document.getElementById("c-" + p.k); if (c) { c.scrollIntoView({ block: "nearest", behavior: "smooth" }); c.focus({ preventScroll: true }); hot(p.k) } }
      g.addEventListener("click", go); g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go() } })
      g.addEventListener("mouseenter", () => hot(p.k)); g.addEventListener("mouseleave", () => hot(null))
    }
  }
  const pa = document.getElementById("pa"), pb = document.getElementById("pb")
  const render = () => { draw(pa, st.a); pb.hidden = !st.two; document.getElementById("panes").classList.toggle("two", st.two); if (st.two) draw(pb, st.b); document.querySelectorAll(".tabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.v === st.a))) }
  document.querySelectorAll(".tabs button").forEach((b) => b.addEventListener("click", () => { st.a = b.dataset.v; render() }))
  document.getElementById("sbs").addEventListener("change", (e) => { st.two = e.target.checked; render() })
  document.getElementById("right").addEventListener("change", (e) => { st.b = e.target.value; if (!st.two) { st.two = true; document.getElementById("sbs").checked = true } render() })
  document.getElementById("pins").addEventListener("change", (e) => { st.pins = e.target.checked; render() })
  document.getElementById("guides").addEventListener("change", (e) => { st.guides = e.target.checked; render() })
  document.querySelectorAll(".card").forEach((c) => { c.addEventListener("mouseenter", () => hot(c.dataset.k)); c.addEventListener("mouseleave", () => hot(null)); c.addEventListener("focus", () => hot(c.dataset.k)); c.addEventListener("blur", () => hot(null)) })
  document.addEventListener("keydown", (e) => { if (e.target.closest("input,select,textarea") || e.metaKey || e.ctrlKey || e.altKey) return; const i = Number(e.key) - 1; if (i >= 0 && i < D.views.length && i < 9) { st.a = D.views[i].k; render() } })
  render()
})()
</script>
</body></html>`
}
