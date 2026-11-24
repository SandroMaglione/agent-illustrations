import { readFileSync } from "node:fs"
import { PNG } from "pngjs"
const D="./refs/"
for(const f of ["ref-a","ref-b","ref-c","ref-d","opus","neon"]){const p=PNG.sync.read(readFileSync(D+f+".png"));let n=0,low=0,hist=[0,0,0,0,0],sat=0,dark=0,white=0
for(let y=0;y<p.height;y+=2)for(let x=0;x<p.width;x+=2){const i=(y*p.width+x)*4;const [r,g,b]=[p.data[i],p.data[i+1],p.data[i+2]];const M=Math.max(r,g,b),m=Math.min(r,g,b);if(m>247)continue;n++;const s=M?(M-m)/M:0;sat+=s;if(s<.3)low++;const l=.3*r+.59*g+.11*b;hist[Math.min(4,Math.floor(l/51.2))]++;if(l<30)dark++;if(l>240)white++}
console.log(f.padEnd(6),"S<0.3",(100*low/n).toFixed(0)+"%","mean S",(sat/n).toFixed(2),"value fifths dark..light",hist.map(v=>Math.round(100*v/n)+"%").join(" "),"L<30",(100*dark/n).toFixed(1)+"%")}
const T=w=>{const p=PNG.sync.read(readFileSync(D+w+".png"));return (x,y,r=5)=>{const a=[[],[],[]];for(let j=-r;j<=r;j++)for(let i=-r;i<=r;i++){const k=((y+j)*p.width+x+i)*4;for(let c=0;c<3;c++)a[c].push(p.data[k+c])}return "#"+a.map(v=>v.sort((q,s)=>q-s)[v.length>>1].toString(16).padStart(2,"0")).join("")}}
const O=T("opus"),N=T("neon")
for(const [n,x,y] of [["coat lit",700*2,640*2],["coat shade",600*2,860*2],["sleeve lit",800*2,560*2],["sleeve shade",876*2,780*2],["hair lit",500*2,40*2],["hair tip",395*2,280*2],["neck",600*2,290*2],["face lit",520*2,220*2],["glove lit",225*2,470*2],["glove shade",250*2,545*2]])console.log(n.padEnd(14),O(x,y),N(x,y))
