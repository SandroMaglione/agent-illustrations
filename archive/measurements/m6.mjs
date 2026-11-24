import { readFileSync } from "node:fs"
import { PNG } from "pngjs"
const D="./refs/"
const load=f=>{const p=PNG.sync.read(readFileSync(D+f));return {w:p.width,h:p.height,at:(x,y)=>{const i=(y*p.width+x)*4;return [p.data[i],p.data[i+1],p.data[i+2]]}}}
const lin=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}
const Lab=c=>{const [r,g,b]=c.map(lin);const y=.2126*r+.7152*g+.0722*b;const f=y>.008856?Math.cbrt(y):7.787*y+16/116;return Math.round((116*f-16)*2.55)}
const hex=c=>"#"+c.map(v=>Math.round(v).toString(16).padStart(2,"0")).join("")
const T=load("tape-full.png"),P=load("previous-character.png"),L=load("line.png"),R={a:load("ref-a.png"),b:load("ref-b.png"),c:load("ref-c.png"),d:load("ref-d.png")}
const med=(im,x,y,r=4)=>{const a=[[],[],[]];for(let j=-r;j<=r;j++)for(let i=-r;i<=r;i++)im.at(x+i,y+j).forEach((v,k)=>a[k].push(v));return a.map(v=>v.sort((p,q)=>p-q)[v.length>>1])}
const pt=(n,im,x,y,s=2,r=4)=>{const c=med(im,x*s,y*s,r);console.log(n.padEnd(34),hex(c),"L",Lab(c),"B-R",c[2]-c[0])}
console.log("-- ring vertical, tape, x=418 and 440 (line coords), y from 120 to 205 step 2")
for(const x of [418,440,400])console.log(x,Array.from({length:44},(_,i)=>{const c=T.at(x*2,(120+i*2)*2);return (120+i*2)+":"+Lab(c)+"/"+(c[0]-c[2])}).join(" "))
console.log("-- reference points for R-B in hair base",hex(med(T,480*2,100*2)),)
console.log("-- white trim");pt("trim lit",T,200,690);pt("trim shade 350,738",T,352,738);pt("trim shade 425,845",T,424,848);pt("trim R shade",T,786,1000);pt("cass panel lit",T,60,1260);pt("panel shade 222,1370",T,200,1372);pt("panel shade 240,1260",T,240,1260);pt("cup lit",T,648,260);pt("cup shade",T,650,310);pt("band shade",T,655,100)
console.log("-- hair values");pt("crown",T,475,130);pt("bang base",T,420,205);pt("at 230,345",T,230,345);pt("left tip base 250,400",T,262,400);pt("left clump 200,320",T,200,325);pt("hairF mid 300,250",T,300,250);pt("back hair 340,395",T,340,395)
console.log("-- tank");pt("base",T,470,680);pt("fold 590,760",T,580,762);pt("sheen",T,570,585);pt("sheen core",T,572,580)
for(const y of [0])console.log("sheen vertical x=580",Array.from({length:30},(_,i)=>Lab(T.at(1160,(560*2)+i*3))).join(" "))
console.log("-- outlines: darkest within 12px window");const dk=(n,im,x,y,r=8)=>{let b=null,bl=999;for(let j=-r;j<=r;j++)for(let i=-r;i<=r;i++){const c=im.at(x+i,y+j);const l=Lab(c);if(l<bl){bl=l;b=c}}console.log(n.padEnd(34),hex(b),"L",bl)}
dk("tape shoulder 300,500",T,600,1000);dk("tape armpit 409,591",T,818,1182);dk("tape pants 553,1180",T,1106,2360);dk("tape jaw 470,385",T,940,770);dk("tape hand R 820,400",T,1640,790,20);dk("prev shoulder",P,Math.round(347*1.5),Math.round(600*1.5));dk("prev armpit 432,650",P,Math.round(432*1.5),Math.round(650*1.5));
dk("ref d shoulder-ish arm 300,760",R.d,300,815,14);dk("ref d belly 340,1010",R.d,338,1010,14);dk("ref d thigh",R.d,780,1318,14);dk("ref c shoulder",R.c,840,737,10)
console.log("-- line thickness in line art: median dark run on silhouettes (px) tape vs");const run=(im,x,y,dx,dy,k,s)=>{let c=0,best=0;for(let i=0;i<k;i++){const l=Lab(im.at(Math.round(x+dx*i),Math.round(y+dy*i)));if(l<90){c++;best=Math.max(best,c)}else c=0}return best}
console.log("line.png shoulder",run(L,290,500,1,0,24),"jacket",run(L,20,900,1,0,50),"head",run(L,330,110,0,1,30),"inner fold",run(L,540,1170,1,0,40))
console.log("-- eyes");for(const [n,x,y] of [["R sclera top",515,233],["R sclera mid",512,239],["R iris top",548,223],["R iris mid",556,229],["R iris low",545,235],["L sclera",404,297],["nose hl",481,288],["nose hl2",482,286],["nose claimed 455,288",455,288]])pt(n,T,x,y,2,1)
console.log("-- halo");for(const [n,x,y,dx] of [["near 139,96",139,96,1],["hand 708,370",708,370,1],["left of shoulder 270,520",268,505,-1],["right jacket",1021,760,0]])console.log(n,Array.from({length:14},(_,i)=>Lab(T.at(Math.min(2047,x*2+dx*i*2),y*2))).join(" "))
