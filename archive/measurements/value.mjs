// value sheets: luma, 3-group poster, local contrast; numbers for the head box against the rest. jobs: file:headx,heady,w,h
import { chromium } from "playwright"
import fs from "fs"
const [out, ...jobs] = process.argv.slice(2)
const b = await chromium.launch(), p = await b.newPage()
const list = jobs.map(j => { const [f, r] = j.split(":"); return { f: f.split("/").pop(), d: "data:image/png;base64," + fs.readFileSync(f).toString("base64"), r: r.split(",").map(Number) } })
const res = await p.evaluate(async list => {
  const H = 620, cells = [], stats = []
  for (const l of list) {
    const i = new Image(); i.src = l.d; await i.decode(); const s = H / i.height, W = Math.round(i.width * s), c = document.createElement("canvas"); c.width = W; c.height = H
    const g = c.getContext("2d", { willReadFrequently: true }); g.fillStyle = "#fff"; g.fillRect(0, 0, W, H); g.imageSmoothingQuality = "high"; g.drawImage(i, 0, 0, W, H)
    const d = g.getImageData(0, 0, W, H).data, N = W * H, L = new Float32Array(N), V = new Float32Array(N), fig = new Uint8Array(N)
    for (let q = 0; q < N; q++) { const a = d[q*4], e = d[q*4+1], f = d[q*4+2]; L[q] = a*.299+e*.587+f*.114; V[q] = Math.max(a,e,f) }
    // figure: not reachable from border through near white
    const st = []; const bg = new Uint8Array(N); for (let x=0;x<W;x++){st.push(x,(H-1)*W+x)} for (let y=0;y<H;y++){st.push(y*W,y*W+W-1)}
    while (st.length) { const q = st.pop(); if (bg[q] || L[q] < 243) continue; bg[q] = 1; const x = q % W; if (x) st.push(q-1); if (x<W-1) st.push(q+1); if (q>=W) st.push(q-W); if (q<N-W) st.push(q+W) }
    for (let q=0;q<N;q++) fig[q] = bg[q] ? 0 : 1
    const R = l.r.map(v => v * s), inR = q => { const x = q % W, y = (q / W) | 0; return x >= R[0] && y >= R[1] && x < R[0]+R[2] && y < R[1]+R[3] }
    const G = new Float32Array(N); for (let y=2;y<H-2;y++) for (let x=2;x<W-2;x++){ const q=y*W+x; if(!fig[q]) continue; let m=0,m2=0,n=0; for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const v=L[q+dy*W+dx];m+=v;m2+=v*v;n++} m/=n; G[q]=Math.sqrt(Math.max(0,m2/n-m*m)) }
    const grp = { head: [], rest: [] }, con = { head: [], rest: [] }
    for (let q=0;q<N;q++) if (fig[q]) { const k = inR(q) ? "head" : "rest"; grp[k].push(L[q]); con[k].push(G[q]) }
    const pc = (a, f) => { const t = [...a].sort((x,y)=>x-y); return Math.round(t[Math.floor(f*(t.length-1))]) }, share = (a, lo, hi) => Math.round(100*a.filter(v=>v>=lo&&v<hi).length/a.length), mean = a => a.reduce((x,y)=>x+y,0)/a.length, sd = a => { const m = mean(a); return Math.sqrt(mean(a.map(v=>(v-m)**2))) }
    stats.push({ f: l.f, figure: { p5: pc([...grp.head,...grp.rest],.05), p50: pc([...grp.head,...grp.rest],.5), p95: pc([...grp.head,...grp.rest],.95), dark: share([...grp.head,...grp.rest],0,85), mid: share([...grp.head,...grp.rest],85,170), light: share([...grp.head,...grp.rest],170,256) }, head: { med: pc(grp.head,.5), sd: Math.round(sd(grp.head)), contrast: +mean(con.head).toFixed(1), dark: share(grp.head,0,85), light: share(grp.head,200,256) }, rest: { med: grp.rest.length?pc(grp.rest,.5):0, sd: grp.rest.length?Math.round(sd(grp.rest)):0, contrast: grp.rest.length?+mean(con.rest).toFixed(1):0, dark: grp.rest.length?share(grp.rest,0,85):0, light: grp.rest.length?share(grp.rest,200,256):0 } })
    const im = f => { const t = new ImageData(W,H); for (let q=0;q<N;q++){ const v=f(q); t.data[q*4]=t.data[q*4+1]=t.data[q*4+2]=v; t.data[q*4+3]=255 } const k=document.createElement("canvas");k.width=W;k.height=H;k.getContext("2d").putImageData(t,0,0);return k }
    const bl = document.createElement("canvas"); bl.width=W;bl.height=H; const bg2=bl.getContext("2d",{willReadFrequently:true}); bg2.filter="blur(5px)"; bg2.drawImage(c,0,0); const bd=bg2.getImageData(0,0,W,H).data
    cells.push([c, im(q=>L[q]), im(q=>{const v=bd[q*4]*.299+bd[q*4+1]*.587+bd[q*4+2]*.114; return bg[q]?255: v<85?20:v<170?120:235}), im(q=>Math.min(255,G[q]*5))])
  }
  const W = Math.max(...cells.map(r=>r.reduce((a,c)=>a+c.width+6,0))), o = document.createElement("canvas"); o.width=W;o.height=cells.length*(H+6); const g=o.getContext("2d"); g.fillStyle="#888"; g.fillRect(0,0,W,o.height); cells.forEach((r,n)=>{let x=0;for(const c of r){g.drawImage(c,x,n*(H+6));x+=c.width+6}})
  return { png: o.toDataURL("image/png"), stats }
}, list)
for (const s of res.stats) console.log(JSON.stringify(s))
fs.writeFileSync(out, Buffer.from(res.png.split(",")[1], "base64")); await b.close()
