import { readFileSync } from "node:fs"
import { PNG } from "pngjs"
const D="./refs/"
const load=f=>{const p=PNG.sync.read(readFileSync(D+f+".png"));return {w:p.width,h:p.height,at:(x,y)=>{const i=(y*p.width+x)*4,a=p.data[i+3]/255;return [0,1,2].map(k=>Math.round(p.data[i+k]*a+255*(1-a)))},al:(x,y)=>p.data[(y*p.width+x)*4+3]}}
const hex=c=>"#"+c.map(v=>v.toString(16).padStart(2,"0")).join(""); const L=c=>Math.round(c[0]*.3+c[1]*.59+c[2]*.11); const S=c=>((Math.max(...c)-Math.min(...c))/Math.max(...c)).toFixed(2)
const A=load("a"),B=load("b"),C=load("c")
const prof=(im,n,x,y,dx,dy,k,s=1)=>console.log(n.padEnd(34),Array.from({length:k},(_,i)=>{const c=im.at(x+dx*i*s,y+dy*i*s);return hex(c)+"/"+L(c)+"/"+S(c)}).join(" "))
console.log("--- skin terminators, lit -> shade")
prof(C,"c shoulder down",800,850,0,1,30); prof(C,"c belly left->right",690,1060,1,0,30); prof(C,"c forearm l->r",970,960,1,0,26)
prof(A,"a belly down",760,1165,0,1,30); prof(A,"a arm down",1060,860,0,1,30,2)
console.log("--- hair ring vertical profile"); prof(B,"b ring down x=960",960,150,0,1,30,4); prof(B,"b ring x=1180",1180,60,0,1,30,4); prof(C,"c ring x=590",590,240,0,1,30,4)
prof(B,"b ring lower edge fine",960,215,0,1,30)
console.log("--- ring continuity along arc (b): light pixel run"); let run=[];for(let x=905;x<1105;x+=6){let best=0;for(let y=170;y<245;y++){const l=L(B.at(x,y));if(l>best)best=l}run.push(best)};console.log(run.join(" "))
console.log("--- page halo, moving out from silhouette"); prof(A,"a right of arm",1520,960,1,0,24,2); prof(C,"c right of shoulder x",940,890,1,0,24,2); prof(B,"b right of hair",1360,300,1,0,24,2); console.log("alpha corners",A.al(10,10),B.al(10,10),C.al(10,10))
const std=(im,n,x,y,r)=>{let v=[];for(let j=-r;j<r;j++)for(let i=-r;i<r;i++){const c=L(im.at(x+i,y+j));const m=(L(im.at(x+i-3,y+j))+L(im.at(x+i+3,y+j))+L(im.at(x+i,y+j-3))+L(im.at(x+i,y+j+3)))/4;v.push(c-m)};const a=v.reduce((p,q)=>p+q)/v.length;console.log(n.padEnd(20),"hp std",Math.sqrt(v.reduce((p,q)=>p+(q-a)**2,0)/v.length).toFixed(2))}
std(A,"a hair",700,420,14);std(A,"a blue coat",985,1000,10);std(A,"a belly shade",790,1290,16);std(A,"a skin light",1070,800,8);std(B,"b hair",960,290,10);std(B,"b back hair",1330,470,8);std(B,"b sweater",930,1150,14);std(B,"b coat",1500,760,10);std(B,"b face",1140,470,10);std(C,"c hair",770,320,14);std(C,"c blue",700,920,10);std(C,"c skin",550,1060,16);std(C,"c collar",690,710,10)
console.log("--- outline: darkest pixel + FWHM crossing"); const line=(im,n,x,y,dx,dy,k)=>{const v=Array.from({length:k},(_,i)=>im.at(x+dx*i,y+dy*i));const l=v.map(L);const m=Math.min(...l);const i=l.indexOf(m);console.log(n.padEnd(24),hex(v[i]),"lum",m,"seq",l.join(","))}
line(C,"c shoulder top",840,735,0,1,24);line(C,"c right arm outer",885,820,1,0,24);line(C,"c waist left",398,1060,1,0,30);line(C,"c hair top",700,160,0,1,30);line(A,"a hair top",860,215,0,1,30);line(A,"a belly left",690,1300,1,0,40);line(B,"b hair top",1120,30,0,1,24);line(B,"b jaw",1100,520,0,1,40);line(B,"b hair right",1345,300,1,0,26)
