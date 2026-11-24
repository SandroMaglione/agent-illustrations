import { readFileSync } from "node:fs"
import { PNG } from "pngjs"
const p = PNG.sync.read(readFileSync(process.argv[2])); const W=p.width
const at=(x,y)=>{const i=(y*W+x)*4;return [p.data[i],p.data[i+1],p.data[i+2]]}
const box=(x,y,r=6)=>{let s=[0,0,0],n=0,l=[];for(let j=-r;j<=r;j++)for(let i=-r;i<=r;i++){const c=at(x+i,y+j);s=s.map((v,k)=>v+c[k]);n++;l.push(c[0]*.3+c[1]*.59+c[2]*.11)}const m=s.map(v=>v/n);const ml=l.reduce((a,b)=>a+b)/n;const sd=Math.sqrt(l.reduce((a,b)=>a+(b-ml)**2,0)/n);return [m,sd]}
const hsl=([r,g,b])=>{r/=255;g/=255;b/=255;const M=Math.max(r,g,b),m=Math.min(r,g,b),d=M-m,l=(M+m)/2;let h=0;if(d){h=M===r?((g-b)/d)%6:M===g?(b-r)/d+2:(r-g)/d+4;h=(h*60+360)%360}return [h|0,(d?(d/(1-Math.abs(2*l-1))):0).toFixed(2),l.toFixed(2)]}
const pts={hair_top:[640,200],hair_mid:[620,340],hair_low:[600,390],hair_shadeL:[455,330],hair_shadeR:[900,470],hair_hi:[700,318],tail_light:[200,255],tail_dark:[330,345],tailR_l:[1180,560],tailR_d:[1120,690],
skin:[600,500],skin_neck:[590,570],skin_sh:[700,700],skin_band:[668,690],skin_belly:[450,1000],skin_bellyS:[620,990],skin_thigh:[820,1150],skin_thighS:[860,1300],skin_armS:[300,790],
blue:[480,740],blueS:[640,760],blueLow:[470,800],black:[480,905],blackS:[400,900],pole:[440,650],poleHi:[470,640],poleS:[520,730],poleRim:[500,745],glove:[940,800],gloveS:[950,850],gold:[990,975],jade:[1200,830],jadeS:[1250,900]}
for(const[k,[x,y]]of Object.entries(pts)){const[m,sd]=box(x,y,4);console.log(k.padEnd(12),'#'+m.map(v=>Math.round(v).toString(16).padStart(2,'0')).join(''),hsl(m).join(' '),'sd',sd.toFixed(1))}
// line widths: scan vertical/horizontal dark runs
const run=(x0,y0,dx,dy,n)=>{let best=[];let cur=0;for(let i=0;i<n;i++){const c=at(x0+dx*i,y0+dy*i);const l=c[0]*.3+c[1]*.59+c[2]*.11;if(l<45)cur++;else{if(cur)best.push([i-cur,cur]);cur=0}}return best}
console.log('sil arm',run(330,820,0,-1,60),'sil thigh bottom',run(780,1340,0,-1,60),'sil head',run(640,150,0,1,60),'jaw',run(700,620,0,-1,60),'belly side',run(340,1010,1,0,60),'thigh top',run(900,1060,0,1,60),'pole top',run(300,470,0,1,120), 'belt', run(470,800,0,1,90))
console.log('profile silhouette thigh bottom', Array.from({length:26},(_,i)=>at(780,1330-i)[0]).join(' '))
console.log('profile jaw', Array.from({length:30},(_,i)=>at(690,600-i)[0]).join(' '))
console.log('profile skin shade edge (shoulder)', Array.from({length:36},(_,i)=>at(652+i,690).join('/')).join(' '))
console.log('profile blue shade edge', Array.from({length:30},(_,i)=>at(540+i,780).join('/')).join(' '))
console.log('hair vertical', [185,210,240,270,300,350,380,400].map(y=>'#'+box(610,y,5)[0].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('')).join(' '))
console.log('tail R vertical', [420,500,580,640,700,760].map(y=>'#'+box(1190,y,5)[0].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('')).join(' '))
