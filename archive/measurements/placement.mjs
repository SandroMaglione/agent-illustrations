import { chromium } from "playwright"
import fs from "fs"
const who = process.argv[2]
const b = await chromium.launch(); const p = await b.newPage()
p.on("pageerror", e => console.log("page", e.message))
await p.goto("http://localhost:5440/vite.config.ts").catch(()=>{})
await p.goto("http://localhost:5440/?v=tape&upto=0&k=1").catch(()=>{})
p.setDefaultTimeout(600000)
const res = await p.evaluate(async (who) => {
  const E = await import("/src/splash/engine.ts"), { loop, knots } = await import("/src/cel/path.ts"), { blur } = await import("/src/lineart/flood.ts"), { paperDistance } = await import("/src/bucket/segment.ts")
  const M = await import(`/src/splash/${who}.ts`); const art = Object.values(M).find(v => v && v.shapes && v.defs)
  const k = 2, { ink, w, h, names, map } = await E.regionsOf(art, k), N = w*h
  const edt = (f) => { // squared distance to set f
    const INF=1e12, g=new Float64Array(N), v=new Int32Array(Math.max(w,h)+1), z=new Float64Array(Math.max(w,h)+2)
    for(let i=0;i<N;i++) g[i]=f[i]?0:INF
    const run=(n,off,st)=>{const a=new Float64Array(n);for(let i=0;i<n;i++)a[i]=g[off+i*st];let q=0;v[0]=0;z[0]=-INF;z[1]=INF;for(let i=1;i<n;i++){let s;do{s=((a[i]+i*i)-(a[v[q]]+v[q]*v[q]))/(2*i-2*v[q]);if(s<=z[q])q--;else break}while(q>=0);q++;v[q]=i;z[q]=s;z[q+1]=INF}q=0;for(let i=0;i<n;i++){while(z[q+1]<i)q++;g[off+i*st]=(i-v[q])**2+a[v[q]]}}
    for(let x=0;x<w;x++)run(h,x,w); for(let y=0;y<h;y++)run(w,y*w,1)
    return Float32Array.from(g,x=>Math.sqrt(x)/k)
  }
  const isInk = Uint8Array.from(ink, v=>v>0.42?1:0), dInk = edt(isInk)
  const border = new Uint8Array(N); for(let y=0;y<h-1;y++)for(let x=0;x<w-1;x++){const i=y*w+x;if(map[i]!==map[i+1]||map[i]!==map[i+w])border[i]=1}
  const line = Uint8Array.from(isInk,(v,i)=>v||border[i]?1:0), dLine = edt(line)
  const c=document.createElement("canvas");c.width=w;c.height=h;const g=c.getContext("2d",{willReadFrequently:true})
  const mask=(d)=>{g.clearRect(0,0,w,h);g.beginPath();loop(d).forEach(([x,y],i)=>i?g.lineTo(x*k,y*k):g.moveTo(x*k,y*k));g.closePath();g.fill();return g.getImageData(0,0,w,h).data}
  const lum=async(a)=>{const r=await E.render(a,k,6,"masks");return r.canvas.getContext("2d").getImageData(0,0,w,h).data}
  const D={soft:[]}
  const all=await lum(art), castOnly=await lum({...art,shapes:[]}), handOnly=await lum({...art,casts:[]})
  const bg=names.indexOf("bg"); const sh=(d,i)=>d[i*4]<200
  const paperPx=i=>map[i]!==bg&&map[i]!==0&&!isInk[i]
  const out={who,names:names.length,shapes:art.shapes.length,casts:art.casts.length,castPairs:art.casts.reduce((s,c)=>s+c[0].length*c[1].length,0),washes:art.washes.length,force:art.force.length}
  // A, B
  let pts=0,dead=0,small=0,spill=0,tot=0,vis=0,redPx=0,redTot=0,redShapes=0,s1n=0; const by={}; const ptD=[],ptVis=[];const deadList=[];const mostRed=[]
  const free=[]
  for(const s of art.shapes){
    by[s.lv]=(by[s.lv]??0)+1; const K=knots(s.d); pts+=K.length
    const ok=new Set(s.on.map(n=>names.indexOf(n)).filter(n=>n>0))
    const a=mask(s.d); let A=0,V=0,C=0
    for(let i=0;i<N;i++) if(a[i*4+3]>127){A++; if(ok.has(map[i])&&!isInk[i]){V++; if(sh(castOnly,i))C++}}
    tot+=A;vis+=V; const v=V/(k*k); if(v<6){dead++;deadList.push([s.lv,s.on.join("+"),s.d.slice(0,40),Math.round(v)])} else if(v<40)small++
    if(A&&V/A<0.5)spill++
    if(["s1","form"].includes(s.lv)){s1n++;redPx+=C;redTot+=V;if(V&&C/V>0.8){redShapes++;mostRed.push([s.on.join("+"),s.d.slice(0,30)])}}
    if(["s1","s2","s3","form"].includes(s.lv)) for(const q of K){const X=Math.round(q.p[0]*k),Y=Math.round(q.p[1]*k);if(X<0||Y<0||X>=w||Y>=h)continue;const i=Y*w+X;const inside=ok.has(map[i]);if(inside){ptD.push(dLine[i])}}
  }
  Object.assign(out,{points:pts,by,dead,small,mostlyHidden:spill,drawnOnTarget:Math.round(100*vis/tot),deadList,redundantPct:Math.round(100*redPx/redTot),redundantShapes:redShapes,ofShadeShapes:s1n})
  const hist=(a,bs)=>{const o={};let prev=-1;for(const q of bs){o["<="+q]=Math.round(1000*a.filter(x=>x>prev&&x<=q).length/a.length)/10;prev=q}o[">"+prev]=Math.round(1000*a.filter(x=>x>prev).length/a.length)/10;return o}
  out.anchorDist={n:ptD.length,...hist(ptD,[0.5,1.5,3,6,10])}
  const rnd=[];for(let i=0;i<40000;i++){const q=Math.floor(Math.random()*N);if(map[q]!==bg&&map[q])rnd.push(dLine[q])} out.randomDist=hist(rnd,[0.5,1.5,3,6,10])
  // F sources
  let fig=0,shade=0,castA=0,handA=0,both=0; for(let i=0;i<N;i++) if(paperPx(i)){fig++;const a=sh(castOnly,i),b=sh(handOnly,i);if(a||b)shade++;if(a&&!b)castA++;if(b&&!a)handA++;if(a&&b)both++}
  out.shadeOfFigure=Math.round(100*shade/fig); out.bySource={cast:Math.round(100*castA/shade),hand:Math.round(100*handA/shade),both:Math.round(100*both/shade)}
  // E slivers: lit paper thinner than ~5px that the line art alone does not make
  const open=(m,r)=>{const inv=Uint8Array.from(m,v=>v?0:1),d=edt(inv);const core=Uint8Array.from(d,v=>v>r?1:0);const d2=edt(core);return Uint8Array.from(m,(v,i)=>v&&d2[i]<=r+0.5?1:0)}
  const region=new Uint8Array(N);for(let i=0;i<N;i++)region[i]=paperPx(i)&&!border[i]?1:0
  const lit=Uint8Array.from(region,(v,i)=>v&&!sh(all,i)?1:0), dark=Uint8Array.from(region,(v,i)=>v&&sh(all,i)?1:0)
  const R=2; const rO=open(region,R), lO=open(lit,R), dO=open(dark,R)
  const comps=(m)=>{const seen=new Uint8Array(N),st=new Int32Array(N);const L=[];for(let s=0;s<N;s++)if(m[s]&&!seen[s]){let t=0;st[t++]=s;seen[s]=1;let n=0,sx=0,sy=0;while(t){const i=st[--t];n++;sx+=i%w;sy+=(i/w)|0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const X=i%w+dx,Y=((i/w)|0)+dy;if(X<0||Y<0||X>=w||Y>=h)continue;const j=Y*w+X;if(m[j]&&!seen[j]){seen[j]=1;st[t++]=j}}}if(n>=30*k*k/2)L.push([n/(k*k),Math.round(sx/n/k),Math.round(sy/n/k)])}return L.sort((a,b)=>b[0]-a[0])}
  const sl=Uint8Array.from(lit,(v,i)=>v&&!lO[i]&&rO[i]&&dLine[i]<4.5?1:0), sd=Uint8Array.from(dark,(v,i)=>v&&!dO[i]&&rO[i]?1:0)
  const cl=comps(sl); out.litSlivers={n:cl.length,px:Math.round(cl.reduce((a,c)=>a+c[0],0)),top:cl.slice(0,14)}
  const cd=comps(sd); out.darkSlivers={n:cd.length,px:Math.round(cd.reduce((a,c)=>a+c[0],0))}
  // shadow edges: how much of the hand edge runs on a drawn line, near miss, or free
  const he={on:0,near:0,free:0};for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;if(!region[i]||!sh(handOnly,i))continue;if((region[i-1]&&!sh(handOnly,i-1))||(region[i+1]&&!sh(handOnly,i+1))||(region[i-w]&&!sh(handOnly,i-w))||(region[i+w]&&!sh(handOnly,i+w))){const d=dLine[i];if(d<=2)he.on++;else if(d<=6)he.near++;else he.free++}}
  const ht=he.on+he.near+he.free;out.handEdges=Object.fromEntries(Object.entries(he).map(([a,b])=>[a,Math.round(100*b/ht)]))
  // G fold lines: interior ink, same part on both sides. Is there a tone step across it, and which side is dark?
  const sm=blur(ink,w,h,2*k,2); const acc={};let dirOK=0,dirBad=0
  const ridge=edt(Uint8Array.from(isInk,v=>v?0:1))
  for(let y=12;y<h-12;y+=1)for(let x=12;x<w-12;x+=1){const i=y*w+x;if(!isInk[i]||map[i]===bg||!map[i])continue
    if(ridge[i]<ridge[i-1]||ridge[i]<ridge[i+1]||ridge[i]<ridge[i-w]||ridge[i]<ridge[i+w])continue
    // direction from structure tensor
    let xx=0,yy=0,xy=0;for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const j=i+dy*w+dx;const gx=sm[j+1]-sm[j-1],gy=sm[j+w]-sm[j-w];xx+=gx*gx;yy+=gy*gy;xy+=gx*gy}
    const th=0.5*Math.atan2(2*xy,xx-yy),nx=Math.cos(th),ny=Math.sin(th)
    const r=(ridge[i]+3)*k;const at=(s)=>{const X=Math.round(x+nx*r*s),Y=Math.round(y+ny*r*s);return X<0||Y<0||X>=w||Y>=h?-1:Y*w+X}
    const a=at(1),b=at(-1);if(a<0||b<0||isInk[a]||isInk[b]||map[a]!==map[i]||map[b]!==map[i])continue
    const kd=art.defs[names[map[i]]]?.kind;const q=acc[kd]??={n:0,step:0,bothLit:0,bothDark:0};q.n++
    const A=sh(all,a),B=sh(all,b);if(A!==B){q.step++;const side=A?1:-1;const dot=(nx*0.5+ny*0.866)*side;if(Math.abs(dot)>0.35){(dot>0?dirOK++:dirBad++,dot>0?(q.ok=(q.ok??0)+1):(q.bad=(q.bad??0)+1))}}else if(A)q.bothDark++;else q.bothLit++}
  out.folds=Object.fromEntries(Object.entries(acc).map(([a,q])=>[a,{n:q.n,step:Math.round(100*q.step/q.n),bothLit:Math.round(100*q.bothLit/q.n),bothDark:Math.round(100*q.bothDark/q.n),ok:q.ok,bad:q.bad}])); out.lightSide={ok:dirOK,bad:dirBad,pct:Math.round(100*dirOK/(dirOK+dirBad))}
  // sub-regions: how many closed patches do the drawn lines already make, and are they ever all-dark / all-lit / mixed
  if(art.clicks){const {paper}=await import("/src/bucket/fill.ts");const P=paper(ink,w,h,art.clicks.walls,k);out.paperKeys=Object.keys(P)}
  // picture for me
  const im=new ImageData(w,h);for(let i=0;i<N;i++){let v=isInk[i]?[70,70,80]:map[i]===bg?[255,255,255]:sh(all,i)?[190,196,210]:[250,248,244];if(sl[i])v=[235,30,60];if(sd[i])v=[40,90,235];im.data.set([...v,255],i*4)}g.putImageData(im,0,0);window.__png=c.toDataURL("image/png")
  return out
}, who)
console.log(JSON.stringify(res, (k,v)=>v, 1).replace(/\n\s+(?=[\d\]"])/g," "))
fs.writeFileSync(`output/sl-${who}.png`, Buffer.from((await p.evaluate(()=>window.__png)).split(",")[1],"base64"))
await b.close()
