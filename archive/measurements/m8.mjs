import { readFileSync } from "node:fs"
import { PNG } from "pngjs"
const D="./refs/"
const lin=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}
const Lab=c=>{const y=.2126*lin(c[0])+.7152*lin(c[1])+.0722*lin(c[2]);const f=y>.008856?Math.cbrt(y):7.787*y+16/116;return Math.round((116*f-16)*2.55)}
for(const w of ["opus","neon"]){const p=PNG.sync.read(readFileSync(D+w+".png"));const m=(x,y,r=4)=>{const a=[[],[],[]];for(let j=-r;j<=r;j++)for(let i=-r;i<=r;i++){const k=((y*2+j)*p.width+x*2+i)*4;for(let c=0;c<3;c++)a[c].push(p.data[k+c])}return a.map(v=>v.sort((q,s)=>q-s)[v.length>>1])}
const h=c=>"#"+c.map(v=>v.toString(16).padStart(2,"0")).join("")
console.log("--",w);for(const [n,x,y] of [["crown 585,42",585,42],["crown 510,30",510,30],["bangs 385,250",385,250],["back 675,205",675,205],["nape 650,255",650,255],["forehead 465,115",465,115],["forehead 490,98",490,98],["jaw 540,275",540,275],["wrist 225,580",225,580],["vest left 405,710",405,710],["trim 338,977",338,977],["wedge 275,1480",275,1480],["bit teeth gap 733,1277",733,1277],["nape sliver 668,300",668,300]]){const c=m(x,y);console.log(n.padEnd(24),h(c),"L",Lab(c))}}
