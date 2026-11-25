import { chromium } from "playwright"
import fs from "fs"
const S=process.env.S, who=process.argv[2], k=2
const b=await chromium.launch(), p=await b.newPage(); p.setDefaultTimeout(900000); p.on("pageerror",e=>console.log("page",e.message))
await p.goto("http://localhost:5440/?v=tape&upto=0&k=1").catch(()=>{})
const res=await p.evaluate(async([who,k])=>{
  const E=await import("/src/splash/engine.ts"),{paperDistance}=await import("/src/bucket/segment.ts"),{paper}=await import("/src/bucket/fill.ts")
  const M=await import(`/src/splash/${who}.ts`),art=Object.values(M).find(v=>v&&v.shapes&&v.defs)
  const {ink,w,h,names,map}=await E.regionsOf(art,k),N=w*h,out={who}
  const on=Uint8Array.from(ink,v=>v>0.42?1:0)
  const din=paperDistance(Float32Array.from(on,v=>v?0:1),w,h,0.5)
  // Zhang-Suen
  const t0=performance.now(); let s=on.slice(); for(let x=0;x<w;x++){s[x]=0;s[N-1-x]=0} for(let y=0;y<h;y++){s[y*w]=0;s[y*w+w-1]=0}
  let act=[];for(let i=0;i<N;i++)if(s[i])act.push(i)
  for(let ch=true;ch;){ch=false;for(let st=0;st<2;st++){const del=[];for(const i of act){if(!s[i])continue;const a=s[i-w],b=s[i-w+1],c=s[i+1],d=s[i+w+1],e=s[i+w],f=s[i+w-1],g=s[i-1],q=s[i-w-1];const B=a+b+c+d+e+f+g+q;if(B<2||B>6)continue;const A=(!a&&b)+(!b&&c)+(!c&&d)+(!d&&e)+(!e&&f)+(!f&&g)+(!g&&q)+(!q&&a);if(A!==1)continue;if(st===0?(a&c&e||c&e&g):(a&c&g||a&e&g))continue;del.push(i)}for(const i of del)s[i]=0;if(del.length)ch=true}act=act.filter(i=>s[i])}
  // remove corner (staircase) pixels so degree is clean
  for(const i of act){if(!s[i])continue;const a=s[i-w],c=s[i+1],e=s[i+w],g=s[i-1];if((a&&c&&!s[i+w-1])||(c&&e&&!s[i-w-1])||(e&&g&&!s[i-w+1])||(g&&a&&!s[i+w+1])){ // removable if neighbours remain connected
    s[i]=0}}
  const nb=i=>[i-w,i-w+1,i+1,i+w+1,i+w,i+w-1,i-1,i-w-1].filter(j=>s[j])
  const deg=new Uint8Array(N);act=act.filter(i=>s[i]);for(const i of act)deg[i]=nb(i).length
  // clusters of junction pixels
  const node=new Int32Array(N);let nn=0;const nodes=[null];for(const i of act)if(deg[i]!==2&&!node[i]){nn++;const st=[i];node[i]=nn;const px=[];while(st.length){const q=st.pop();px.push(q);if(deg[q]>2)for(const j of nb(q))if(deg[j]>2&&!node[j]){node[j]=nn;st.push(j)}}nodes.push({px,x:px.reduce((a,q)=>a+q%w,0)/px.length,y:px.reduce((a,q)=>a+((q/w)|0),0)/px.length,st:[]})}
  const used=new Uint8Array(N);let strokes=[]
  for(let n=1;n<=nn;n++)for(const q of nodes[n].px)for(const j0 of nb(q)){if(node[j0]===n||used[j0])continue;const path=[q];let prev=q,c=j0;while(true){path.push(c);if(node[c])break;used[c]=1;const nx=nb(c).filter(j=>j!==prev&&!(node[j]===n&&path.length<3));if(!nx.length)break;const t=nx.find(j=>node[j])??nx[0];prev=c;c=t;if(used[c]&&!node[c])break}
    if(node[c]&&path.length===2&&n>node[c])continue
    strokes.push({a:n,b:node[c],p:path.map(i=>[i%w,(i/w)|0])})}
  // prune spurs
  const len=q=>{let l=0;for(let i=1;i<q.length;i++)l+=Math.hypot(q[i][0]-q[i-1][0],q[i][1]-q[i-1][1]);return l}
  const at=(x,y)=>din[Math.round(y)*w+Math.round(x)]
  for(const s1 of strokes){s1.len=len(s1.p);nodes[s1.a].st.push(s1);if(s1.b)nodes[s1.b].st.push(s1)}
  const isEnd=n=>!n||nodes[n].px.length===1&&deg[nodes[n].px[0]]===1
  const raw=strokes.length
  strokes=strokes.filter(q=>{const ea=isEnd(q.a),eb=isEnd(q.b);if(ea===eb)return true;const J=ea?q.p.at(-1):q.p[0];return q.len>1.5*2*at(...J)*0.75})
  // merge by good continuation
  const ends=new Map();strokes.forEach((q,i)=>{for(const[e,n]of[[0,q.a],[1,q.b]])if(n&&!isEnd(n)){if(!ends.has(n))ends.set(n,[]);ends.get(n).push([i,e])}})
  const tang=(q,e)=>{const P=e?q.p.slice().reverse():q.p,w0=Math.max(4,Math.round(2*at(...P[0]))),a=P[Math.min(P.length-1,w0)],b=P[Math.min(P.length-1,w0*3)]??a;const d=[b[0]-P[0][0],b[1]-P[0][1]];const l=Math.hypot(...d)||1;return[d[0]/l,d[1]/l]}
  const link=new Map();for(const[,es]of ends){const c=[];for(let i=0;i<es.length;i++)for(let j=i+1;j<es.length;j++){const u=tang(strokes[es[i][0]],es[i][1]),v=tang(strokes[es[j][0]],es[j][1]);c.push([u[0]*v[0]+u[1]*v[1],es[i],es[j]])}c.sort((a,b)=>a[0]-b[0]);const done=new Set();for(const[d,a,b2]of c){if(d>-0.906)break;const ka=a.join(),kb=b2.join();if(done.has(ka)||done.has(kb))continue;done.add(ka);done.add(kb);link.set(ka,b2);link.set(kb,a)}}
  const seen=new Set(),merged=[];const walk=(i,e)=>{ // go from end e outwards to the start of chain
    let cur=[i,e],guard=0;while(link.has(cur.join())&&guard++<500){const[n,f]=link.get(cur.join());cur=[n,1-f];if(n===i)break}return cur}
  strokes.forEach((q,i)=>{if(seen.has(i))return;let[c,e]=walk(i,0);let pts=[],guard=0;while(guard++<500){if(seen.has(c))break;seen.add(c);const P=e?strokes[c].p.slice().reverse():strokes[c].p;pts=pts.concat(P);const nx=link.get([c,1-e].join());if(!nx)break;c=nx[0];e=nx[1]}merged.push(pts)})
  const med=(()=>{const a=act.map(i=>2*din[i]/k).sort((x,y)=>x-y);return a[a.length>>1]})()
  out.ms=Math.round(performance.now()-t0);out.raw=raw;out.pruned=strokes.length;out.medianWidth=+med.toFixed(1)
  let L=merged.map(p=>({p,len:len(p)/k})).filter(q=>q.len>1)
  out.strokes=L.length;out.texture=L.filter(q=>q.len<4*med).length;out.blobPx=+(100*act.filter(i=>2*din[i]/k>2.5*med).length/act.length).toFixed(1)
  // reconstruct
  const cv=document.createElement("canvas");cv.width=w;cv.height=h;const g=cv.getContext("2d",{willReadFrequently:true});for(const q of L)for(const[x,y]of q.p){g.beginPath();g.arc(x+.5,y+.5,Math.max(.5,at(x,y)-.45),0,7);g.fill()}
  const rd=g.getImageData(0,0,w,h).data;let I=0,U=0,miss=0,tot=0;for(let i=0;i<N;i++){const r=rd[i*4+3]>127;if(r&&on[i])I++;if(r||on[i])U++;if(on[i]){tot++;if(!r)miss++}}
  out.iou=+(I/U).toFixed(3);out.unexplained=+(100*miss/tot).toFixed(1)
  // facets: whole dark?
  const P=paper(ink,w,h,art.clicks?.walls??art.walls,k),seg=P.closed?.seg??P.P?.seg??P.seg
  const r=await E.render(art,k,6,"masks"),d=r.canvas.getContext("2d").getImageData(0,0,w,h).data,bg=names.indexOf("bg"),sh=i=>d[i*4]<200
  const lab=new Int32Array(N),A=[0],D=[0],prt=[0],cx=[0],cy=[0];let nf=0;const st=new Int32Array(N)
  for(const src of [seg]){for(let s0=0;s0<N;s0++){if(lab[s0]||!src||!src[s0]||map[s0]===bg||!map[s0]||on[s0])continue;nf++;A.push(0);D.push(0);prt.push(map[s0]);let t=0;st[t++]=s0;lab[s0]=nf;while(t){const i=st[--t];A[nf]++;if(sh(i))D[nf]++;for(const j of[i-1,i+1,i-w,i+w])if(j>=0&&j<N&&!lab[j]&&!on[j]&&src[j]===src[s0]&&map[j]===map[s0]){lab[j]=nf;st[t++]=j}}}}
  let shade=0,whole=0,litw=0,mixA=0,nd=0,nm=0,nl=0;for(let f=1;f<=nf;f++){if(A[f]<20*k*k)continue;shade+=D[f];const q=D[f]/A[f];if(q>=.9){whole+=D[f];nd++}else if(q>.05){nm++;mixA+=D[f]}else nl++}
  out.facets={n:nd+nm+nl,dark:nd,lit:nl,mixed:nm,wholeDarkShareOfShade:Math.round(100*whole/shade)}
  // strokes as candidates: T side, interior
  const inter=L.filter(q=>q.len>=4*med&&q.p.filter(([x,y])=>map[Math.round(y)*w+Math.round(x)]!==bg).length>.8*q.p.length);out.interior=inter.length
  // sheet
  window.__L=L.map((q,i)=>({id:i+1,len:q.len,p:q.p.filter((_,j)=>j%4===0||j===q.p.length-1).map(([x,y])=>[x/k,y/k])}));window.__med=med
  return out
},[who,k])
console.log(JSON.stringify(res))
fs.writeFileSync(`${S}/strokes-${who}.json`,JSON.stringify(await p.evaluate(()=>window.__L)))
await b.close()
