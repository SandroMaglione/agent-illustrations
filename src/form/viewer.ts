/** One HTML file to turn the blockout around: no server, no libraries. */
import type { Part, V3 } from "./mesh.ts"
import { png } from "./png.ts"

export const viewer = (parts: ReadonlyArray<Part>, pivot: V3, w: number, h: number, ink: Uint8Array, hue: ReadonlyMap<string, readonly [number, number, number]>): string => {
  const tri = parts.reduce((a, p) => a + p.mesh.f.length, 0), pos = new Int16Array(tri * 9), col = new Uint8Array(tri * 3)
  let i = 0, j = 0
  for (const p of parts) for (const t of p.mesh.f) { for (const k of t) for (const q of p.mesh.v[k]!) pos[i++] = Math.round(q * 16); const c = hue.get(p.group) ?? [0.8, 0.8, 0.8]; for (const q of c) col[j++] = Math.round(q * 255) }
  const rgb = new Uint8Array(w * h * 3); for (let q = 0; q < w * h; q++) rgb[q * 3] = rgb[q * 3 + 1] = rgb[q * 3 + 2] = 255 - ink[q]!
  const b64 = (a: ArrayBufferView): string => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString("base64")
  return `<!doctype html><meta charset="utf-8"><title>Blockout</title><style>
#v{position:relative;height:800px;font:13px var(--font-sans,system-ui);color:var(--foreground,#222)}#c{position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:grab}
#ui{position:relative;display:flex;flex-wrap:wrap;gap:6px}button{font:inherit;color:inherit;background:var(--secondary,#eee);border:1px solid var(--border,#ccd);border-radius:7px;padding:4px 9px;cursor:pointer}button.on{border-color:var(--primary,#2b5bd7);color:var(--primary,#2b5bd7)}
#t{position:absolute;left:0;bottom:0;color:var(--muted-foreground,#777)}</style><div id="v"><canvas id="c"></canvas><div id="ui"></div><div id="t">drag: turn &middot; ctrl-wheel or pinch: zoom &middot; shift-drag: move &middot; right-drag: light</div></div><script>
const W=${w},H=${h},P=[${pivot.join(",")}],un=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const q=new Int16Array(un("${b64(pos)}").buffer),C=un("${b64(col)}"),N=q.length/3,pos=new Float32Array(N*3),nor=new Float32Array(N*3),bar=new Float32Array(N*3),col=new Float32Array(N*3);
for(let i=0;i<N*3;i++)pos[i]=q[i]/16;
for(let t=0;t<N/3;t++){const o=t*9,a=[0,1,2].map(k=>pos[o+3+k]-pos[o+k]),b=[0,1,2].map(k=>pos[o+6+k]-pos[o+k]),n=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],l=Math.hypot(...n)||1;for(let k=0;k<3;k++)for(let m=0;m<3;m++){nor[o+k*3+m]=n[m]/l;col[o+k*3+m]=C[t*3+m]/255;bar[o+k*3+m]=k===m?1:0}}
const cv=document.getElementById("c"),g=cv.getContext("webgl",{antialias:true});
const sh=(t,s)=>{const x=g.createShader(t);g.shaderSource(x,s);g.compileShader(x);if(!g.getShaderParameter(x,g.COMPILE_STATUS))throw g.getShaderInfoLog(x);return x},pr=(v,f)=>{const p=g.createProgram();g.attachShader(p,sh(g.VERTEX_SHADER,v));g.attachShader(p,sh(g.FRAGMENT_SHADER,f));g.linkProgram(p);return p};
const V="attribute vec3 p,n,b,k;uniform mat3 R;uniform vec3 P;uniform vec2 S,O;varying vec3 N,B,K;void main(){vec3 q=R*(p-P);N=R*n;B=b;K=k;gl_Position=vec4((q.x+O.x)*S.x,-(q.y+O.y)*S.y,-q.z/3000.,1.);}";
g.getExtension("OES_standard_derivatives");const F="#extension GL_OES_standard_derivatives:enable\\nprecision mediump float;varying vec3 N,B,K;uniform vec3 L;uniform float part,tone,wire;void main(){vec3 n=normalize(N);if(n.z<0.)n=-n;float d=max(0.,dot(n,L)),v=.3+.7*d;if(tone>.5)v=d>.5?1.:d>.16?.74:.46;vec3 c=mix(vec3(.9,.89,.88),K,part)*v;if(tone>.5&&d<=.16)c*=vec3(.88,.93,1.1);vec3 fw=B/(fwidth(B)+1e-6);float e=min(fw.x,min(fw.y,fw.z));c=mix(c,c*.85,wire*(1.-smoothstep(0.,.9,e)));gl_FragColor=vec4(c,1.);}";
const A=pr(V,F),buf=(n,d)=>{const b=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,b);g.bufferData(g.ARRAY_BUFFER,d,g.STATIC_DRAW);return[n,b]},bufs=[buf("p",pos),buf("n",nor),buf("b",bar),buf("k",col)];
const T=pr("attribute vec2 p;uniform vec2 S,O,P;varying vec2 u;void main(){u=p;vec2 q=p*vec2("+W+".,"+H+".)-P;gl_Position=vec4((q.x+O.x)*S.x,-(q.y+O.y)*S.y,-.99,1.);}","precision mediump float;varying vec2 u;uniform sampler2D t;void main(){float k=texture2D(t,u).r;gl_FragColor=vec4(0.,0.,0.,1.-k);}"),quad=buf("p",new Float32Array([0,0,1,0,0,1,1,1])),tex=g.createTexture();
const im=new Image();im.onload=()=>{g.bindTexture(g.TEXTURE_2D,tex);g.texImage2D(g.TEXTURE_2D,0,g.RGB,g.RGB,g.UNSIGNED_BYTE,im);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);draw()};im.src="data:image/png;base64,${png(rgb, w, h).toString("base64")}";
let yaw=0,pit=0,zoom=1,ox=0,oy=45,part=0,tone=0,wire=1,ink=0,la=-.75,lb=.85,raf=0;
const draw=()=>{if(!raf)raf=requestAnimationFrame(()=>{raf=0;paint()})};
const paint=()=>{const r=devicePixelRatio||1,w=cv.clientWidth*r,h=cv.clientHeight*r;if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h}g.viewport(0,0,w,h);const k=Math.min(h/(H+150),w/1000)*zoom,S=[2*k/w,2*k/h];
const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pit),sp=Math.sin(pit),R=[cy,sy*sp,-sy*cp,0,cp,sp,sy,-cy*sp,cy*cp];
g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT);g.enable(g.DEPTH_TEST);g.disable(g.BLEND);g.useProgram(A);const U=n=>g.getUniformLocation(A,n);g.uniformMatrix3fv(U("R"),false,R);g.uniform3fv(U("P"),P);g.uniform2fv(U("S"),S);g.uniform2f(U("O"),ox,oy);const l=[Math.sin(la)*Math.cos(lb-.2),-Math.sin(lb-.2),Math.cos(la)*Math.cos(lb-.2)];g.uniform3fv(U("L"),l);g.uniform1f(U("part"),part);g.uniform1f(U("tone"),tone);g.uniform1f(U("wire"),wire);
for(const[n,b]of bufs){const a=g.getAttribLocation(A,n);if(a<0)continue;g.bindBuffer(g.ARRAY_BUFFER,b);g.enableVertexAttribArray(a);g.vertexAttribPointer(a,3,g.FLOAT,false,0,0)}g.drawArrays(g.TRIANGLES,0,N);
if(ink&&Math.abs(yaw)<.004&&Math.abs(pit)<.004){for(let i=0;i<4;i++)g.disableVertexAttribArray(i);g.useProgram(T);g.disable(g.DEPTH_TEST);g.enable(g.BLEND);g.blendFunc(g.SRC_ALPHA,g.ONE_MINUS_SRC_ALPHA);const V=n=>g.getUniformLocation(T,n);g.uniform2fv(V("S"),S);g.uniform2f(V("O"),ox,oy);g.uniform2f(V("P"),P[0],P[1]);const a=g.getAttribLocation(T,"p");g.bindBuffer(g.ARRAY_BUFFER,quad[1]);g.enableVertexAttribArray(a);g.vertexAttribPointer(a,2,g.FLOAT,false,0,0);g.drawArrays(g.TRIANGLE_STRIP,0,4);g.disableVertexAttribArray(a)}};
const ui=document.getElementById("ui"),bt=(t,f,on)=>{const b=document.createElement("button");b.textContent=t;b.onclick=()=>{f();marks();draw()};b._on=on;ui.append(b)},marks=()=>{for(const b of ui.children)b.classList.toggle("on",!!(b._on&&b._on()))};
const go=(y,p)=>()=>{const a=yaw,b=pit,t0=performance.now(),f=t=>{const u=Math.min(1,(t-t0)/350),e=u*u*(3-2*u);yaw=a+(y-a)*e;pit=b+(p-b)*e;paint();if(u<1)requestAnimationFrame(f)};requestAnimationFrame(f)};
bt("Drawing view",go(0,0));bt("Left",go(Math.PI/2.6,0));bt("3/4 left",go(.6,0));bt("3/4 right",go(-.6,0));bt("Right",go(-Math.PI/2.6,0));bt("Back",go(Math.PI,0));bt("Above",go(.3,-.7));bt("Below",go(-.3,.6));
bt("Head",()=>{zoom=4;ox=-30;oy=610});bt("Torso",()=>{zoom=2.8;ox=0;oy=310});bt("Whole",()=>{zoom=1;ox=0;oy=45});bt("Parts",()=>part=1-part,()=>part);bt("Three tones",()=>tone=1-tone,()=>tone);bt("Triangles",()=>wire=1-wire,()=>wire);bt("Line art",()=>ink=1-ink,()=>ink);marks();
const pt=new Map();let pin=0;cv.oncontextmenu=e=>e.preventDefault();cv.onpointerdown=e=>{cv.setPointerCapture(e.pointerId);pt.set(e.pointerId,e)};cv.onpointerup=cv.onpointercancel=e=>{pt.delete(e.pointerId);pin=0};
cv.onpointermove=e=>{const o=pt.get(e.pointerId);if(!o)return;const dx=e.clientX-o.clientX,dy=e.clientY-o.clientY;pt.set(e.pointerId,e);const k=Math.min(cv.clientHeight/(H+150),cv.clientWidth/1000)*zoom;if(pt.size===2){const[a,b]=[...pt.values()],d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);if(pin)zoom*=d/pin;pin=d;ox+=dx/2/k;oy+=dy/2/k}else if(e.buttons&2){la+=dx*.01;lb-=dy*.01}else if(e.shiftKey){ox+=dx/k;oy+=dy/k}else{yaw+=dx*.008;pit=Math.max(-1.4,Math.min(1.4,pit-dy*.008))}draw()};
cv.onwheel=e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();const r=cv.getBoundingClientRect(),k=Math.min(cv.clientHeight/(H+150),cv.clientWidth/1000),mx=e.clientX-r.left-r.width/2,my=e.clientY-r.top-r.height/2,z=zoom,n=Math.max(.5,Math.min(12,z*Math.exp(-e.deltaY*.0015)));ox+=mx/(k*n)-mx/(k*z);oy+=my/(k*n)-my/(k*z);zoom=n;draw()};
addEventListener("resize",draw);paint();
</script>`
}
