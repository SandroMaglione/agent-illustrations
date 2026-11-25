/**
 * The layers as a page to look through: switch layers and folders, see one alone, play the stack from the bottom.
 *   node scripts/layers.ts maren output/layers/maren --clip && node scripts/layerview.ts output/layers/maren
 * Writes <dir>/view.html (one file, layers scaled down) and <dir>/sheet.png (the picture growing,
 * every part's folder put together, and what one folder holds).
 * The page composites with the same formulas as the check, on smaller pixels: for looking, not for measuring.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { bytes, dataUrl, open } from "./page.ts"
import type { Mode } from "../src/layers/stack.ts"

const [dir] = process.argv.slice(2)
if (!dir) { console.log("node scripts/layerview.ts <dir written by layers.ts>"); process.exit(1) }
type Row = { index: number; name: string; group: string; mode: Mode; clip?: boolean; x: number; y: number; w: number; h: number }
const stack = JSON.parse(readFileSync(join(dir, "stack.json"), "utf8")) as { drawing: string; w: number; h: number; layers: Array<Row> }
const files = readdirSync(join(dir, "png")).sort(), W = 600, H = Math.round((stack.h / stack.w) * W), z = W / stack.w
const { b, p } = await open()
await p.goto("about:blank")
const small: Array<string> = []
for (const r of stack.layers) {
  const src = dataUrl(".png", readFileSync(join(dir, "png", files[r.index]!)))
  small.push(await p.evaluate(async ({ src, r, W, H, z }) => {
    const i = new Image(); i.src = src; await i.decode()
    const c = document.createElement("canvas"); c.width = W; c.height = H
    const g = c.getContext("2d")!; g.imageSmoothingQuality = "high"; g.drawImage(i, r.x * z, r.y * z, r.w * z, r.h * z)
    return c.toDataURL("image/webp", r.name === "Grain" ? 0.7 : 0.86)
  }, { src, r, W, H, z }))
}

const modes: Record<Mode, string> = { normal: "normal", multiply: "multiply", add: "add", dodge: "color dodge", linearLight: "linear light", overlay: "overlay", screen: "screen" }
const data = stack.layers.map((r, i) => ({ n: r.name, g: r.group, m: r.mode, k: r.clip ? 1 : 0, s: small[i]! }))
const page = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${stack.drawing} layers</title>
<style>
*{box-sizing:border-box}html,body{margin:0}body{font:13px/1.35 var(--font-sans,system-ui);color:var(--foreground,#222)}
.v{display:grid;grid-template-columns:minmax(0,1fr) 290px;gap:16px;align-items:start}
canvas{width:100%;display:block;border-radius:var(--radius,8px);border:1px solid var(--border,#ccc);background:#fff}
.bar{display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap}
button{font:inherit;color:inherit;background:var(--secondary,#eee);border:1px solid var(--border,#ccc);border-radius:6px;padding:5px 10px;cursor:pointer}
button:focus-visible,input:focus-visible{outline:2px solid var(--ring,#48f);outline-offset:1px}
input[type=range]{flex:1;min-width:120px;accent-color:var(--primary,#36c)}
#now{min-height:1.35em;margin-top:8px;color:var(--muted-foreground,#666)}
.p{border:1px solid var(--border,#ccc);border-radius:var(--radius,8px);overflow:hidden}
.r{display:flex;align-items:center;gap:8px;padding:0 8px;min-height:26px;border-bottom:1px solid var(--border,#ddd)}
.r:last-child{border-bottom:0}.r.f{background:var(--secondary,#f2f2f2);font-weight:600}
.r button{flex:1;min-width:0;background:none;border:0;border-radius:0;padding:4px 0;text-align:left;font-weight:inherit;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.r i{font-style:normal;font-size:11px;color:var(--muted-foreground,#777);white-space:nowrap}
.r.on button{color:var(--primary,#25c);font-weight:600}.r.un{opacity:.45}.hide{display:none}
@media(max-width:560px){.v{grid-template-columns:1fr}}
</style>
<div class="v"><div><canvas id="c" width="${W}" height="${H}"></canvas>
<div class="bar"><button id="play">Play</button><input id="upto" type="range" min="0" aria-label="Layers from the bottom"><button id="reset">Show all</button></div><div id="now" aria-live="polite"></div></div>
<div class="p" id="p"></div></div>
<script type="module">
const D=${JSON.stringify(data)},M=${JSON.stringify(modes)},W=${W},H=${H},el=(t,c)=>{const e=document.createElement(t);if(c)e.className=c;return e}
const c=document.getElementById("c"),g=c.getContext("2d",{willReadFrequently:true}),now=document.getElementById("now"),up=document.getElementById("upto")
const I=await Promise.all(D.map(d=>new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=d.s})))
// the stack's steps for the slider: every top folder, and every part in Colour
const unit=d=>{const a=d.g.split("/");return a[0]==="Colour"?a.slice(0,2).join("/"):d.g?a[0]+"/"+d.n:d.n}
const steps=[];D.forEach((d,i)=>{if(i&&unit(D[i-1])===unit(d))steps[steps.length-1]=i;else steps.push(i)})
const vis=D.map(()=>true);let solo=-1,limit=D.length-1,timer=0
up.max=steps.length-1;up.value=up.max
const OP={normal:"source-over",multiply:"multiply",add:"lighter",dodge:"color-dodge",overlay:"overlay",screen:"screen"}
// a soft base and what is clipped to it are one group that keeps the base's alpha
const tmp=document.createElement("canvas");tmp.width=W;tmp.height=H;const tg=tmp.getContext("2d")
const lin=i=>{const t=document.createElement("canvas");t.width=W;t.height=H;const q=t.getContext("2d");q.drawImage(I[i],0,0);const s=q.getImageData(0,0,W,H).data,o=g.getImageData(0,0,W,H),d=o.data;for(let k=0;k<d.length;k+=4){const a=s[k+3]/255;if(a)for(let e=0;e<3;e++)d[k+e]+=(Math.max(0,Math.min(255,d[k+e]+2*s[k+e]-255))-d[k+e])*a}g.putImageData(o,0,0)}
const draw=()=>{g.globalCompositeOperation="source-over";g.fillStyle="#fff";g.fillRect(0,0,W,H)
 const one=solo>=0||Array.isArray(solo),list=one?[].concat(solo):D.map((d,i)=>i).filter(i=>i<=limit&&vis[i])
 if(one)for(let y=0;y<H;y+=15)for(let x=0;x<W;x+=15){g.fillStyle=((x+y)/15)%2?"#c9c9c9":"#b5b5b5";g.fillRect(x,y,15,15)}
 for(let n=0;n<list.length;n++){const i=list[n],d=D[i]
  if(one&&list.length===1){g.drawImage(I[i],0,0);continue}
  if(d.m==="linearLight"){if(!one)lin(i);continue}
  const over=[];while(n+1<list.length&&D[list[n+1]].k&&D[list[n+1]].g===d.g)over.push(list[++n])
  if(!over.length){g.globalCompositeOperation=OP[d.m];g.drawImage(I[i],0,0);g.globalCompositeOperation="source-over";continue}
  tg.globalCompositeOperation="copy";tg.drawImage(I[i],0,0)
  for(const j of over){tg.globalCompositeOperation=D[j].m==="normal"?"source-atop":OP[D[j].m];tg.drawImage(I[j],0,0)}
  tg.globalCompositeOperation="destination-in";tg.drawImage(I[i],0,0)
  g.globalCompositeOperation=OP[d.m];g.drawImage(tmp,0,0);g.globalCompositeOperation="source-over"}
 rows.forEach(r=>{r.e.classList.toggle("on",r.ids.length===[].concat(solo).length&&r.ids.every((x,k)=>x===[].concat(solo)[k]));r.e.classList.toggle("un",r.ids.every(i=>i>limit||!vis[i]));r.b.checked=r.ids.every(i=>vis[i])})
 now.textContent=Array.isArray(solo)?"Alone: "+D[solo[0]].g.split("/").pop()+" (folder)":solo>=0?"Alone: "+(D[solo].g?D[solo].g.split("/").pop()+" / ":"")+D[solo].n+", "+M[D[solo].m]:limit<D.length-1?"Up to: "+unit(D[limit]).split("/").pop():"All layers"}
const rows=[],P=document.getElementById("p")
const row=(label,ids,mode,depth,box,folder)=>{const e=el("div","r"+(folder?" f":"")),b=el("input"),t=el("button"),m=el("i");e.style.paddingLeft=8+depth*16+"px";b.type="checkbox";b.checked=true;b.setAttribute("aria-label","Show "+label);t.textContent=label;t.title="See alone";m.textContent=mode
 b.onchange=()=>{ids.forEach(i=>vis[i]=b.checked);solo=-1;draw()};t.onclick=()=>{const s=ids.length===1?ids[0]:ids;solo=JSON.stringify(solo)===JSON.stringify(s)?-1:s;stop();draw()}
 e.append(b,t,m);let kids=null;if(folder){kids=el("div",folder==="shut"?"hide":"");const x=el("button");x.style.flex="0 0 auto";x.textContent=folder==="shut"?"+":"\u2212";x.setAttribute("aria-label","Open or close "+label);x.onclick=()=>{x.textContent=kids.classList.toggle("hide")?"+":"\u2212"};e.append(x)}
 rows.push({e,b,ids});box.append(e);if(kids)box.append(kids);return kids}
const build=(from,to,path,depth,box)=>{for(let i=to;i>=from;){const g=D[i].g,rest=path?(g===path?"":g.slice(path.length+1)):g
 if(!rest){row((D[i].k?"\u21b3 ":"")+D[i].n,[i],M[D[i].m],depth,box);i--;continue}
 const name=rest.split("/")[0],p=path?path+"/"+name:name;let j=i;while(j>=from&&(D[j].g===p||D[j].g.startsWith(p+"/")))j--
 const ids=[];for(let k=j+1;k<=i;k++)ids.push(k)
 build(j+1,i,p,depth+1,row(name,ids,ids.length+(ids.length===1?" layer":" layers"),depth,box,p==="Colour"||p===window.OPEN?"open":"shut"));i=j}}
build(0,D.length-1,"",0,P)
const stop=()=>{clearInterval(timer);timer=0;document.getElementById("play").textContent="Play"}
up.oninput=()=>{stop();solo=-1;limit=steps[+up.value];draw()}
document.getElementById("reset").onclick=()=>{stop();solo=-1;vis.fill(true);limit=D.length-1;up.value=up.max;draw()}
document.getElementById("play").onclick=()=>{if(timer){stop();return}solo=-1;if(+up.value>=+up.max)up.value=0;document.getElementById("play").textContent="Stop";timer=setInterval(()=>{if(+up.value>=+up.max){stop();return}up.value=+up.value+1;limit=steps[+up.value];draw()},450)}
draw();window.__ready=true
</script>`
writeFileSync(join(dir, "view.html"), page)
console.log(`  wrote ${join(dir, "view.html")} (${(page.length / 1e6).toFixed(1)} MB)`)

// the sheet: the picture growing, every part's folder put together, and what one folder holds
const groups = [...new Set(stack.layers.map((q) => q.group))], size = (g: string): number => stack.layers.filter((q) => q.group === g).length, most = (l: ReadonlyArray<string>): string | undefined => [...l].sort((x, y) => size(y) - size(x))[0], parts0 = groups.filter((q) => q.startsWith("Colour/"))
/** The folders shown layer by layer, from the full-size layers: an eye, a group of hair, the face, and an ordinary part. */
const inside = [groups.find((q) => q === "Face features/Eyes"), groups.find((q) => q === "Face features"), most(parts0.filter((q) => /hair front/i.test(q))), parts0.find((q) => /\/Face$/.test(q)), most(parts0.filter((q) => !/hair|face|ear/i.test(q)))].filter((q) => q !== undefined)
const full = inside.map((g) => ({ g, layers: stack.layers.filter((q) => q.group === g).map((q) => ({ i: q.index, x: q.x, y: q.y, w: q.w, h: q.h, src: dataUrl(".png", readFileSync(join(dir, "png", files[q.index]!))) })) }))
const url = await p.evaluate(async ({ data, W, H, M, full }) => {
  const I = await Promise.all(data.map(async (d) => { const i = new Image(); i.src = d.s; await i.decode(); return i }))
  const mk = (w: number, h: number): CanvasRenderingContext2D => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c.getContext("2d", { willReadFrequently: true })! }
  const ops: Record<string, GlobalCompositeOperation> = { normal: "source-over", multiply: "multiply", add: "lighter", dodge: "color-dodge", overlay: "overlay", screen: "screen" }
  const put = (g: CanvasRenderingContext2D, ids: Array<number>): void => {
    for (let n = 0; n < ids.length; n++) {
      const i = ids[n]!, d = data[i]!
      if (d.m === "linearLight") { const q = mk(W, H); q.drawImage(I[i]!, 0, 0); const s = q.getImageData(0, 0, W, H).data, o = g.getImageData(0, 0, W, H), t = o.data; for (let k = 0; k < t.length; k += 4) { const a = s[k + 3]! / 255; if (a) for (let e = 0; e < 3; e++) t[k + e] = t[k + e]! + (Math.max(0, Math.min(255, t[k + e]! + 2 * s[k + e]! - 255)) - t[k + e]!) * a } g.putImageData(o, 0, 0); continue }
      const q = mk(W, H)
      q.drawImage(I[i]!, 0, 0)
      while (n + 1 < ids.length && data[ids[n + 1]!]!.k && data[ids[n + 1]!]!.g === d.g) { const j = ids[++n]!; q.globalCompositeOperation = data[j]!.m === "normal" ? "source-atop" : ops[data[j]!.m]!; q.drawImage(I[j]!, 0, 0) }
      q.globalCompositeOperation = "destination-in"; q.drawImage(I[i]!, 0, 0)
      g.globalCompositeOperation = ops[d.m]!; g.drawImage(q.canvas, 0, 0); g.globalCompositeOperation = "source-over"
    }
  }
  const all = data.map((_, i) => i), top = (i: number): string => data[i]!.g.split("/")[0]!, names = (ok: (n: string) => boolean) => (i: number): boolean => top(i) !== "Colour" || ok(data[i]!.n)
  const A = (n: string): boolean => n === "Base", B = (n: string): boolean => A(n) || /^(Gradient|Wash|Tip colour|Hue bands)/.test(n), C = (n: string): boolean => B(n) || /^(Half tone|Shadow)/.test(n), above = ["Effects", "Face features", "Line art", "Over lines"], noEffects = (i: number): boolean => !above.includes(top(i)) && data[i]!.n !== "Prints"
  const stages: Array<[string, Array<number>]> = [["Base", all.filter((i) => noEffects(i) && names(A)(i))], ["+ Gradient, hue bands", all.filter((i) => noEffects(i) && names(B)(i))], ["+ Shadows", all.filter((i) => noEffects(i) && names(C)(i))], ["+ Metal, lights, reflected light", all.filter(noEffects)], ["+ Effects", all.filter((i) => !above.slice(1).includes(top(i)) && data[i]!.n !== "Prints")], ["+ Prints, face features", all.filter((i) => !["Line art", "Over lines"].includes(top(i)))], ["+ Line art", all]]
  const parts = [...new Set(data.map((d) => d.g).filter((g) => g.startsWith("Colour/")))]
  const boxOf = (ids: Array<number>): [number, number, number, number] => { const g = mk(W, H); for (const i of ids) g.drawImage(I[i]!, 0, 0); const d = g.getImageData(0, 0, W, H).data; let x0 = W, y0 = H, x1 = 0, y1 = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3]! > 8) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) } return [Math.max(0, x0 - 4), Math.max(0, y0 - 4), Math.min(W, x1 + 5), Math.min(H, y1 + 5)] }
  const total = 2500, pad = 14, T = 28
  const g = mk(total, 6000)
  g.fillStyle = "#f4f4f2"; g.fillRect(0, 0, total, 6000); g.imageSmoothingQuality = "high"
  let y = pad
  const head = (t: string): void => { g.font = "700 24px system-ui"; g.fillStyle = "#222"; g.fillText(t, pad, y + 24); y += 40; g.font = "17px system-ui" }
  /** One picture fitted in a cell on grey squares. */
  const cell = (x: number, w: number, h: number, ids: Array<number>, box: [number, number, number, number], label: string): void => {
    for (let b = 0; b < h; b += 14) for (let a = 0; a < w; a += 14) { g.fillStyle = ((a + b) / 14) % 2 ? "#c9c9c9" : "#b5b5b5"; g.fillRect(x + a, y + b, Math.min(14, w - a), Math.min(14, h - b)) }
    const q = mk(W, H); put(q, ids)
    const [x0, y0, x1, y1] = box, s = Math.min(w / (x1 - x0), h / (y1 - y0))
    g.drawImage(q.canvas, x0, y0, x1 - x0, y1 - y0, x + (w - (x1 - x0) * s) / 2, y + (h - (y1 - y0) * s) / 2, (x1 - x0) * s, (y1 - y0) * s)
    g.fillStyle = "#222"; g.fillText(label, x, y + h + 20, w)
  }
  const row = (n: number, hh: number, make: Array<(x: number, w: number, h: number) => void>): void => { const w = Math.floor((total - pad * (n + 1)) / n); make.forEach((f, i) => { if (i && i % n === 0) y += hh + T + pad; f(pad + (i % n) * (w + pad), w, hh) }); y += hh + T + pad * 2 }
  head("The picture, kind of layer by kind of layer")
  row(stages.length, Math.round(((total - pad * 8) / 7 / W) * H), stages.map(([l, ids]) => (x, w, h) => { const q = mk(W, H); q.fillStyle = "#fff"; q.fillRect(0, 0, W, H); put(q, ids); g.drawImage(q.canvas, x, y, w, h); g.fillStyle = "#222"; g.fillText(l, x, y + h + 20, w) }))
  head("Colour: one folder per part")
  row(7, 270, parts.map((f) => (x, w, h) => { const ids = all.filter((i) => data[i]!.g === f); cell(x, w, h, ids, boxOf(ids), `${f.slice(7)} · ${ids.length} layers`) }))
  for (const f of full) {
    head(`Inside ${f.g.split("/").slice(f.g.includes("/") ? 1 : 0).join(" / ")}, bottom to top`)
    const im = await Promise.all(f.layers.map(async (d) => { const q = new Image(); q.src = d.src; await q.decode(); return q })), x0 = Math.min(...f.layers.map((d) => d.x)) - 6, y0 = Math.min(...f.layers.map((d) => d.y)) - 6, x1 = Math.max(...f.layers.map((d) => d.x + d.w)) + 6, y1 = Math.max(...f.layers.map((d) => d.y + d.h)) + 6
    row(7, 215, f.layers.map((d, n) => (x, w, h) => {
      for (let b = 0; b < h; b += 14) for (let a = 0; a < w; a += 14) { g.fillStyle = ((a + b) / 14) % 2 ? "#c9c9c9" : "#b5b5b5"; g.fillRect(x + a, y + b, Math.min(14, w - a), Math.min(14, h - b)) }
      const s = Math.min(w / (x1 - x0), h / (y1 - y0)), ox = x + (w - (x1 - x0) * s) / 2, oy = y + (h - (y1 - y0) * s) / 2
      g.drawImage(im[n]!, ox + (d.x - x0) * s, oy + (d.y - y0) * s, d.w * s, d.h * s)
      g.fillStyle = "#222"; g.fillText(`${data[d.i]!.n} · ${M[data[d.i]!.m]}`, x, y + h + 20, w)
    }))
  }
  const out = mk(total, Math.ceil(y))
  out.drawImage(g.canvas, 0, 0)
  return out.canvas.toDataURL("image/png")
}, { data, W, H, M: modes, full })
writeFileSync(join(dir, "sheet.png"), bytes(url))
console.log(`  wrote ${join(dir, "sheet.png")}`)
await b.close()
