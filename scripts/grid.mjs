/** node scripts/grid.mjs in.png out.png x y w h zoom [step]: a zoomed crop with a coordinate grid, for placing shapes. */
import { chromium } from "playwright"
import { readFileSync } from "node:fs"
const [src,out,x,y,w,h,z,step]=process.argv.slice(2); const b=await chromium.launch(); const p=await b.newPage({viewport:{width:Math.round(w*z),height:Math.round(h*z)}})
const d=readFileSync(src).toString("base64")
await p.setContent(`<body style="margin:0"><canvas id=c width=${w*z} height=${h*z}></canvas><img id=i src="data:image/png;base64,${d}" style="display:none"></body>`)
await p.evaluate(async([x,y,w,h,z,st])=>{const i=document.getElementById("i");await i.decode();const g=document.getElementById("c").getContext("2d");g.imageSmoothingQuality="high";g.drawImage(i,x,y,w,h,0,0,w*z,h*z);g.font="11px sans-serif";for(let a=Math.ceil(x/st)*st;a<x+w;a+=st){g.fillStyle="rgba(220,0,60,.28)";g.fillRect((a-x)*z,0,1,h*z);g.fillStyle="#c03";g.fillText(a,(a-x)*z+2,10)}for(let a=Math.ceil(y/st)*st;a<y+h;a+=st){g.fillStyle="rgba(0,60,220,.28)";g.fillRect(0,(a-y)*z,w*z,1);g.fillStyle="#03c";g.fillText(a,2,(a-y)*z-2)}},[+x,+y,+w,+h,+z,+(step||50)])
await p.screenshot({path:out});await b.close()
