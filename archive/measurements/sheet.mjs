import { chromium } from "playwright"
import fs from "fs"
const [who,x0,y0,cw,ch,z,tag,seed]=process.argv.slice(2);const L=JSON.parse(fs.readFileSync(`strokes-${who}.json`)),d=fs.readFileSync(`public/${who}.png`).toString("base64")
const X=+x0,Y=+y0,W=+cw,H=+ch,Z=+z
let r=+seed;const rnd=()=>(r=(r*1103515245+12345)&0x7fffffff)/0x7fffffff
const inb=([x,y])=>x>X+6&&y>Y+6&&x<X+W-6&&y<Y+H-6
const vis=L.map(q=>({...q,v:q.p.filter(inb)})).filter(q=>q.len>=14&&q.v.length>3)
const pick=vis.slice().sort(()=>rnd()-.5).slice(0,10).map((q,i)=>({k:"ABCDEFGHIJ"[i],id:q.id,at:q.v[Math.floor(q.v.length*(.15+.7*rnd()))]}))
fs.writeFileSync(`key-${tag}.json`,JSON.stringify(pick.map(q=>[q.k,q.id])))
const b=await chromium.launch(),p=await b.newPage({viewport:{width:W*Z,height:H*Z}})
await p.setContent(`<body style="margin:0;background:#fff"><canvas id=c width=${W*Z} height=${H*Z}></canvas><img id=i src="data:image/png;base64,${d}" style="display:none">`)
for(const mode of ["q","s"]){await p.evaluate(async([X,Y,W,H,Z,vis,pick,mode])=>{const i=document.getElementById("i");await i.decode();const g=document.getElementById("c").getContext("2d");g.setTransform(1,0,0,1,0,0);g.fillStyle="#fff";g.fillRect(0,0,9999,9999);g.globalAlpha=mode==="s"?.22:.8;g.drawImage(i,X,Y,W,H,0,0,W*Z,H*Z);g.globalAlpha=1
 const pal=["#d5263d","#1667d9","#12854a","#9b35c9","#c4710a","#0d8f96","#8a5a3c","#d02c8d"],T=([x,y])=>[(x-X)*Z,(y-Y)*Z]
 if(mode==="s"){vis.forEach((q,n)=>{g.strokeStyle=pal[q.id%8];g.lineWidth=2.5;g.beginPath();q.p.map(T).forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke()})
  const boxes=[];g.font="bold 13px Helvetica";g.textBaseline="middle";g.textAlign="center"
  for(const q of vis.slice().sort((a,b)=>a.v.length-b.v.length)){let best=null;for(const f of[.5,.4,.6,.3,.7,.2,.8]){const v=T(q.v[Math.floor(q.v.length*f)]),n=q.v[Math.min(q.v.length-1,Math.floor(q.v.length*f)+1)],m=T(n);let nx=-(m[1]-v[1]),ny=m[0]-v[0];const l=Math.hypot(nx,ny)||1;for(const s of[13,-13,20,-20,30,-30]){const x=v[0]+nx/l*s,y=v[1]+ny/l*s,w=13+6*String(q.id).length/1.4;if(x<16||y<9||x>W*Z-16||y>H*Z-9)continue;if(boxes.some(b=>Math.abs(b[0]-x)<26&&Math.abs(b[1]-y)<15))continue;best=[x,y,v];break}if(best)break}
   if(!best)continue;boxes.push(best);g.strokeStyle=pal[q.id%8];g.lineWidth=1;g.beginPath();g.moveTo(...best[2]);g.lineTo(best[0],best[1]);g.stroke();g.fillStyle="rgba(255,255,255,.92)";g.fillRect(best[0]-13,best[1]-8,26,16);g.fillStyle=pal[q.id%8];g.fillText(q.id,best[0],best[1])}}
 else{g.font="bold 15px Helvetica";g.textBaseline="middle";g.textAlign="center";for(const q of pick){const[x,y]=T(q.at);g.fillStyle="#e0103a";g.beginPath();g.arc(x,y,4.5,0,7);g.fill();g.beginPath();g.arc(x+16,y-14,10,0,7);g.fill();g.fillStyle="#fff";g.fillText(q.k,x+16,y-13)}}
},[X,Y,W,H,Z,vis,pick,mode]);await p.screenshot({path:`${tag}-${mode}.png`})}
console.log(tag,vis.length,"strokes in view");await b.close()
