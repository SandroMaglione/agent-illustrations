/**
 * The layers as a page to look through: switch layers and folders, see one alone, play the stack from the bottom.
 *   node scripts/layers.ts maren output/layers/maren --clip && node scripts/layerview.ts output/layers/maren
 * Writes <dir>/view.html (one file, layers scaled down) and <dir>/sheet.png (the stack growing folder by folder, then every step alone).
 * The page composites with the same formulas as the check, on smaller pixels: for looking, not for measuring.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { bytes, dataUrl, open } from "./page.ts"
import type { Mode } from "../src/layers/stack.ts"

const [dir] = process.argv.slice(2)
if (!dir) { console.log("node scripts/layerview.ts <dir written by layers.ts>"); process.exit(1) }
type Row = { index: number; name: string; group: string; mode: Mode; x: number; y: number; w: number; h: number }
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

const modes: Record<Mode, string> = { normal: "normal", multiply: "multiply", add: "add", linearLight: "linear light", overlay: "overlay", screen: "screen" }
const data = stack.layers.map((r, i) => ({ n: r.name, g: r.group, m: r.mode, s: small[i]! }))
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
.r:last-child{border-bottom:0}.r.in{padding-left:26px}.r.f{background:var(--secondary,#f2f2f2);font-weight:600}
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
// the stack's steps for the slider: the flats count as one
const steps=[];D.forEach((d,i)=>{if(d.g==="Flats"&&i&&D[i-1].g==="Flats")steps[steps.length-1]=i;else steps.push(i)})
const vis=D.map(()=>true);let solo=-1,limit=D.length-1,timer=0
up.max=steps.length-1;up.value=up.max
const lin=i=>{const t=document.createElement("canvas");t.width=W;t.height=H;const q=t.getContext("2d");q.drawImage(I[i],0,0);const s=q.getImageData(0,0,W,H).data,o=g.getImageData(0,0,W,H),d=o.data;for(let k=0;k<d.length;k+=4){const a=s[k+3]/255;if(a)for(let e=0;e<3;e++)d[k+e]+=(Math.max(0,Math.min(255,d[k+e]+2*s[k+e]-255))-d[k+e])*a}g.putImageData(o,0,0)}
const draw=()=>{g.globalCompositeOperation="source-over";g.fillStyle="#fff";g.fillRect(0,0,W,H)
 if(solo>=0||Array.isArray(solo)){for(let y=0;y<H;y+=15)for(let x=0;x<W;x+=15){g.fillStyle=((x+y)/15)%2?"#c9c9c9":"#b5b5b5";g.fillRect(x,y,15,15)}for(const i of [].concat(solo)){g.drawImage(I[i],0,0)}}
 else D.forEach((d,i)=>{if(i>limit||!vis[i])return;if(d.m==="linearLight"){lin(i);return}g.globalCompositeOperation={normal:"source-over",multiply:"multiply",add:"lighter",overlay:"overlay",screen:"screen"}[d.m];g.drawImage(I[i],0,0);g.globalCompositeOperation="source-over"})
 rows.forEach(r=>{r.e.classList.toggle("on",r.ids.length===[].concat(solo).length&&r.ids.every((x,k)=>x===[].concat(solo)[k]));r.e.classList.toggle("un",r.ids.every(i=>i>limit||!vis[i]));r.b.checked=r.ids.every(i=>vis[i])})
 now.textContent=solo>=0||Array.isArray(solo)?"Alone: "+(Array.isArray(solo)?D[solo[0]].g+" (folder)":D[solo].n+", "+M[D[solo].m]):limit<D.length-1?"Up to: "+(D[limit].g==="Flats"?"Flats":D[limit].n):"All layers"}
const rows=[],P=document.getElementById("p")
const row=(label,ids,mode,cls,kids)=>{const e=el("div","r "+cls),b=el("input"),t=el("button"),m=el("i");b.type="checkbox";b.checked=true;b.setAttribute("aria-label","Show "+label);t.textContent=label;t.title="See alone";m.textContent=mode
 b.onchange=()=>{ids.forEach(i=>vis[i]=b.checked);solo=-1;draw()};t.onclick=()=>{const s=ids.length===1?ids[0]:ids;solo=JSON.stringify(solo)===JSON.stringify(s)?-1:s;stop();draw()}
 e.append(b,t,m);if(kids){const x=el("button");x.style.flex="0 0 auto";x.textContent="+";x.setAttribute("aria-label","Open "+label);x.onclick=()=>{const h=kids[0].classList.toggle("hide");kids.forEach(k=>k.classList.toggle("hide",h));x.textContent=h?"+":"\\u2212"};e.append(x)}
 rows.push({e,b,ids});return e}
for(let i=D.length-1;i>=0;){const G=D[i].g;if(!G){P.append(row(D[i].n,[i],M[D[i].m],""));i--;continue}
 const ids=[];while(i>=0&&D[i].g===G)ids.push(i--);const shut=G==="Flats",kids=ids.map(j=>{const e=row(D[j].n,[j],M[D[j].m],"in"+(shut?" hide":""));return e})
 P.append(row(G,[...ids].reverse(),ids.length+" layers","f",shut?kids:null),...kids)}
const stop=()=>{clearInterval(timer);timer=0;document.getElementById("play").textContent="Play"}
up.oninput=()=>{stop();solo=-1;limit=steps[+up.value];draw()}
document.getElementById("reset").onclick=()=>{stop();solo=-1;vis.fill(true);limit=D.length-1;up.value=up.max;draw()}
document.getElementById("play").onclick=()=>{if(timer){stop();return}solo=-1;if(+up.value>=+up.max)up.value=0;document.getElementById("play").textContent="Stop";timer=setInterval(()=>{if(+up.value>=+up.max){stop();return}up.value=+up.value+1;limit=steps[+up.value];draw()},450)}
draw();window.__ready=true
</script>`
writeFileSync(join(dir, "view.html"), page)
console.log(`  wrote ${join(dir, "view.html")} (${(page.length / 1e6).toFixed(1)} MB)`)

// the sheet: the stack after each folder, then every step alone on grey
const order = [...new Set(stack.layers.map((r) => r.group || r.name))].filter((g) => g !== "Paper" && g !== "Background")
const grown = order.map((g) => ({ label: g, upto: stack.layers.map((r, i) => ((r.group || r.name) === g ? i : -1)).reduce((a, x) => Math.max(a, x), 0) }))
const url = await p.evaluate(async ({ data, grown, W, H, M }) => {
  const I = await Promise.all(data.map(async (d) => { const i = new Image(); i.src = d.s; await i.decode(); return i }))
  const mk = (w: number, h: number): CanvasRenderingContext2D => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c.getContext("2d", { willReadFrequently: true })! }
  const ops: Record<string, GlobalCompositeOperation> = { normal: "source-over", multiply: "multiply", add: "lighter", overlay: "overlay", screen: "screen" }
  const upto = (n: number): HTMLCanvasElement => {
    const g = mk(W, H); g.fillStyle = "#fff"; g.fillRect(0, 0, W, H)
    for (let i = 0; i <= n; i++) {
      if (data[i]!.m === "linearLight") { const q = mk(W, H); q.drawImage(I[i]!, 0, 0); const s = q.getImageData(0, 0, W, H).data, o = g.getImageData(0, 0, W, H), d = o.data; for (let k = 0; k < d.length; k += 4) { const a = s[k + 3]! / 255; if (a) for (let e = 0; e < 3; e++) d[k + e] = d[k + e]! + (Math.max(0, Math.min(255, d[k + e]! + 2 * s[k + e]! - 255)) - d[k + e]!) * a } g.putImageData(o, 0, 0); continue }
      g.globalCompositeOperation = ops[data[i]!.m]!; g.drawImage(I[i]!, 0, 0); g.globalCompositeOperation = "source-over"
    }
    return g.canvas
  }
  const alone = (ids: Array<number>): HTMLCanvasElement => { const g = mk(W, H); for (let y = 0; y < H; y += 20) for (let x = 0; x < W; x += 20) { g.fillStyle = ((x + y) / 20) % 2 ? "#c9c9c9" : "#b5b5b5"; g.fillRect(x, y, 20, 20) } for (const i of ids) g.drawImage(I[i]!, 0, 0); return g.canvas }
  const flats = data.map((d, i) => (d.g === "Flats" ? i : -1)).filter((i) => i >= 0)
  const cells: Array<[string, HTMLCanvasElement]> = [["Flats", alone(flats)]]
  data.forEach((d, i) => { if (d.g !== "Flats" && d.n !== "Paper" && d.n !== "Background") cells.push([`${d.n} · ${M[d.m]}`, alone([i])]) })
  const cols = 9, pad = 14, T = 26, A = 264, ah = Math.round((A / W) * H), total = cols * (A + pad) + pad, big = Math.floor((total - pad * (grown.length + 1)) / grown.length), bh = Math.round((big / W) * H)
  const rows = Math.ceil(cells.length / cols), g = mk(total, pad + bh + T + pad * 2 + rows * (ah + T + pad))
  g.fillStyle = "#f4f4f2"; g.fillRect(0, 0, total, g.canvas.height); g.font = "600 17px system-ui"; g.fillStyle = "#222"; g.imageSmoothingQuality = "high"
  grown.forEach((s, i) => { const x = pad + i * (big + pad); g.drawImage(upto(s.upto), x, pad, big, bh); g.fillText(`${i ? "+ " : ""}${s.label}`, x, pad + bh + 20) })
  g.font = "15px system-ui"
  cells.forEach(([l, c], i) => { const x = pad + (i % cols) * (A + pad), y = pad + bh + T + pad * 2 + Math.floor(i / cols) * (ah + T + pad); g.drawImage(c, x, y, A, ah); g.fillText(l, x, y + ah + 18, A) })
  return g.canvas.toDataURL("image/png")
}, { data, grown, W, H, M: modes })
writeFileSync(join(dir, "sheet.png"), bytes(url))
console.log(`  wrote ${join(dir, "sheet.png")}`)
await b.close()
