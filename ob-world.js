'use strict';
/* =========================================================
   Orbitalbrigade – 3D-Welt, Schiff, Modelle und Effekte
   ========================================================= */
const $=id=>document.getElementById(id);
const rnd=Math.random;
// Kosmetik-Modus: Effekte des Mitspielers werden nur gezeigt, verursachen hier keinen Schaden
let COSMETIC=false;
// Größe des Schlachtfelds: wächst nach jedem Boss (1 = Startgröße)
let FIELD_K=1;
function fieldDims(){return{X:23*FIELD_K,ZF:36+40*(FIELD_K-1),ZB:-42}}
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const cv=$('c');
let renderer=null;
try{if(!window.THREE)throw 0;renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true})}catch(e){renderer=null}
if(!renderer){$('ovErr').hidden=false;throw new Error('WebGL nicht verfügbar')}
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputEncoding=THREE.sRGBEncoding;

const scene=new THREE.Scene();
scene.fog=new THREE.Fog(0x4a3346,70,230);
scene.background=new THREE.Color(0x0b0e1a);
const camera=new THREE.PerspectiveCamera(62,1,0.1,900);
const CAM=new THREE.Vector3(0,48,66), LOOK=new THREE.Vector3(0,8,-14);
camera.position.copy(CAM);camera.lookAt(LOOK);
function resize(){
  const r=cv.parentElement.getBoundingClientRect();
  const w=Math.max(100,r.width),h=Math.max(100,r.height);
  renderer.setSize(w,h,false);
  camera.aspect=w/h;camera.fov=camera.aspect<0.8?62:50;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(cv.parentElement);
resize();

/* ---------- Texturen (nahtlos kachelbar) ---------- */
function canvasTex(w,h,draw,rep){
  const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;
  t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep,rep)}
  return t;
}
function tiled(W,H,fn){for(const ox of [-W,0,W])for(const oy of [-H,0,H])fn(ox,oy)}
function hullDraw(g,W,H){
  g.fillStyle='#474d5a';g.fillRect(0,0,W,H);
  for(let i=0;i<80;i++){const x=rnd()*W|0,y=rnd()*H|0,w=(20+rnd()*120)|0,h=(10+rnd()*60)|0,v=(58+rnd()*26)|0;
    for(const ox of [-W,0])for(const oy of [-H,0]){g.fillStyle=`rgb(${v},${v+4},${v+13})`;g.fillRect(x+ox,y+oy,w,h);g.strokeStyle='rgba(14,16,24,.75)';g.lineWidth=2;g.strokeRect(x+ox+.5,y+oy+.5,w,h)}}
  g.strokeStyle='rgba(18,20,28,.6)';g.lineWidth=1.5;
  for(let i=0;i<=W;i+=64){g.beginPath();g.moveTo(i,0);g.lineTo(i,H);g.stroke();g.beginPath();g.moveTo(0,i);g.lineTo(W,i);g.stroke()}
  for(let i=0;i<500;i++){const x=rnd()*W,y=rnd()*H,r=rnd()*14;g.fillStyle=`rgba(0,0,0,${rnd()*0.13})`;tiled(W,H,(ox,oy)=>{g.beginPath();g.arc(x+ox,y+oy,r,0,6.28);g.fill()})}
  for(let i=0;i<70;i++){g.fillStyle=rnd()<.7?'#ffe7a0':'#a8e6ff';g.fillRect(rnd()*W,rnd()*H,3,2)}
}
const hullTex=canvasTex(512,512,hullDraw);
const hullTexBig=canvasTex(512,512,hullDraw,0.11);
const groundTex=canvasTex(512,512,(g,W,H)=>{
  g.fillStyle='#6a4634';g.fillRect(0,0,W,H);
  for(let i=0;i<900;i++){const x=rnd()*W,y=rnd()*H,r=2+rnd()*22,c=`rgba(${(80+rnd()*50)|0},${(48+rnd()*30)|0},${(34+rnd()*22)|0},.35)`;
    tiled(W,H,(ox,oy)=>{if(x+ox+r<0||x+ox-r>W||y+oy+r<0||y+oy-r>H)return;g.fillStyle=c;g.beginPath();g.arc(x+ox,y+oy,r,0,6.28);g.fill()})}
  for(let i=0;i<14;i++){const x0=rnd()*W,y0=rnd()*H,r=8+rnd()*30;
    tiled(W,H,(ox,oy)=>{const x=x0+ox,y=y0+oy;if(x+r<0||x-r>W||y+r<0||y-r>H)return;
      const gr=g.createRadialGradient(x,y,r*0.2,x,y,r);gr.addColorStop(0,'rgba(40,24,18,.55)');gr.addColorStop(.8,'rgba(40,24,18,.2)');gr.addColorStop(.92,'rgba(150,110,85,.4)');gr.addColorStop(1,'rgba(150,110,85,0)');
      g.fillStyle=gr;g.beginPath();g.arc(x,y,r,0,6.28);g.fill()})}
  g.strokeStyle='rgba(30,18,12,.35)';g.lineWidth=1;
  for(let i=0;i<40;i++){const pts=[[rnd()*W,rnd()*H]];for(let k=0;k<5;k++){const q=pts[pts.length-1];pts.push([q[0]+(rnd()-.5)*40,q[1]+(rnd()-.5)*40])}
    tiled(W,H,(ox,oy)=>{g.beginPath();pts.forEach((q,k)=>k?g.lineTo(q[0]+ox,q[1]+oy):g.moveTo(q[0]+ox,q[1]+oy));g.stroke()})}
},14);
const skyTex=canvasTex(4,512,(g,W,H)=>{
  const gr=g.createLinearGradient(0,0,0,H);
  gr.addColorStop(0,'#04060f');gr.addColorStop(.36,'#0d1230');gr.addColorStop(.47,'#3a2a44');gr.addColorStop(.5,'#5a3a3e');gr.addColorStop(1,'#20140f');
  g.fillStyle=gr;g.fillRect(0,0,W,H);
});
const glowTex=canvasTex(64,64,(g)=>{const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.35,'rgba(255,255,255,.45)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,64)});
const numTex=canvasTex(256,96,(g)=>{g.fillStyle='#ffd23f';g.font='bold 64px "Russo One", Arial Black, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('OB-07',128,50)});

/* ---------- Welt ---------- */
const hemi=new THREE.HemisphereLight(0xa8b8ff,0x3a2418,0.75);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffe0b5,1.35);
sun.position.set(30,70,25);sun.castShadow=true;sun.shadow.bias=-0.0006;sun.shadow.normalBias=0.02;sun.shadow.mapSize.set(1024,1024);
Object.assign(sun.shadow.camera,{left:-80,right:80,top:95,bottom:-95,near:5,far:320});sun.shadow.camera.updateProjectionMatrix&&sun.shadow.camera.updateProjectionMatrix();
scene.add(sun);
const skyMesh=new THREE.Mesh(new THREE.SphereGeometry(500,32,24),new THREE.MeshBasicMaterial({map:skyTex,side:THREE.BackSide,fog:false,depthWrite:false}));scene.add(skyMesh);
{
  const n=900,p=new Float32Array(n*3);
  for(let i=0;i<n;i++){const az=rnd()*6.28,el=0.05+rnd()*1.4,r=470;p[i*3]=Math.cos(el)*Math.cos(az)*r;p[i*3+1]=Math.sin(el)*r;p[i*3+2]=Math.cos(el)*Math.sin(az)*r}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));
  scene.add(new THREE.Points(g,new THREE.PointsMaterial({color:0xdfe6ff,size:1.6,sizeAttenuation:false,fog:false})));
  const pl=new THREE.Mesh(new THREE.SphereGeometry(34,32,24),new THREE.MeshStandardMaterial({color:0x4b6f8a,roughness:1,fog:false}));
  pl.position.set(-70,78,-380);scene.add(pl);
  const ring=new THREE.Mesh(new THREE.RingGeometry(44,62,64),new THREE.MeshBasicMaterial({color:0x9fb3c8,side:THREE.DoubleSide,transparent:true,opacity:.35,fog:false}));
  ring.position.copy(pl.position);ring.rotation.set(1.25,0.3,0.2);scene.add(ring);
}
const ground=new THREE.Mesh(new THREE.PlaneGeometry(600,600),new THREE.MeshStandardMaterial({map:groundTex,roughness:1,metalness:0}));
ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
{
  const rg=new THREE.DodecahedronGeometry(1,0),rm=new THREE.MeshStandardMaterial({color:0x5a3d2e,roughness:1,flatShading:true});
  for(let i=0;i<70;i++){
    const m=new THREE.Mesh(rg,rm);let x=(rnd()-.5)*160;if(Math.abs(x)<27)x+=Math.sign(x||1)*27;
    const s=0.8+rnd()*3.5;m.scale.set(s,s*(0.5+rnd()*0.6),s);m.position.set(x,s*0.25,-150+rnd()*200);m.rotation.y=rnd()*6;
    m.castShadow=true;m.receiveShadow=true;scene.add(m);
  }
}

/* ---------- Terraforming: der Planet wird mit den Wellen grüner ---------- */
// Grasschicht: Alpha-Kanal ist ein weiches Rauschfeld. Je weiter das Terraforming,
// desto niedriger die Alpha-Schwelle, also breiten sich die Grasflecken aus.
const grassTex=canvasTex(512,512,(g,W,H)=>{
  g.clearRect(0,0,W,H);
  for(let i=0;i<520;i++){
    const x0=rnd()*W,y0=rnd()*H,r=14+rnd()*60,gr=(100+rnd()*70)|0,rr=(40+rnd()*40)|0;
    tiled(W,H,(ox,oy)=>{const x=x0+ox,y=y0+oy;if(x+r<0||x-r>W||y+r<0||y-r>H)return;
      const gd=g.createRadialGradient(x,y,0,x,y,r);gd.addColorStop(0,`rgba(${rr},${gr},${(30+rnd()*20)|0},.22)`);gd.addColorStop(1,`rgba(${rr},${gr},40,0)`);
      g.fillStyle=gd;g.beginPath();g.arc(x,y,r,0,6.28);g.fill()});
  }
  const d=g.getImageData(0,0,W,H),px=d.data;
  let maxA=1;for(let i=3;i<px.length;i+=4)maxA=Math.max(maxA,px[i]);
  for(let i=0;i<px.length;i+=4){const a=px[i+3]/255,n=(rnd()-.5)*18;px[i]=Math.min(255,Math.max(0,62+n+(1-a)*20));px[i+1]=Math.min(255,Math.max(0,118+n+a*40));px[i+2]=Math.min(255,Math.max(0,42+n));px[i+3]=Math.min(255,Math.round((px[i+3]/maxA*.9+rnd()*.1)*255))}
  g.putImageData(d,0,0);
},14);
const grassMat=new THREE.MeshStandardMaterial({map:grassTex,roughness:1,alphaTest:.99,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
const grass=new THREE.Mesh(new THREE.PlaneGeometry(600,600),grassMat);
grass.rotation.x=-Math.PI/2;grass.position.y=.02;grass.receiveShadow=true;grass.visible=false;scene.add(grass);

const flora=[];
{
  const trunkMat=new THREE.MeshStandardMaterial({color:0x5a3b26,roughness:1});
  const leafMats=[0x2f6b32,0x3d7d3a,0x4f8f3f,0x2a5e3a].map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.9,flatShading:true}));
  const flowerMats=[0xffd23f,0xff8fb0,0xf4f4f4].map(c=>new THREE.MeshBasicMaterial({color:c}));
  const trunkG=new THREE.CylinderGeometry(.22,.34,1.8,6),coneG=new THREE.ConeGeometry(1,1,7),crownG=new THREE.DodecahedronGeometry(1,0),flowerG=new THREE.SphereGeometry(.12,5,4);
  const inField=(x,z)=>Math.abs(x)<25&&z>-46&&z<46;
  function pine(){const g=new THREE.Group(),lm=leafMats[rnd()*2|0];const t=new THREE.Mesh(trunkG,trunkMat);t.position.y=.9;t.castShadow=true;g.add(t);
    [[1.7,2.4,2.1],[1.3,2.1,3.3],[.85,1.8,4.4]].forEach(([r,h,y])=>{const c=new THREE.Mesh(coneG,lm);c.scale.set(r,h,r);c.position.y=y;c.castShadow=true;g.add(c)});return g}
  function leafy(){const g=new THREE.Group(),lm=leafMats[1+(rnd()*3|0)];const t=new THREE.Mesh(trunkG,trunkMat);t.position.y=.9;t.scale.y=1.2;t.castShadow=true;g.add(t);
    for(let i=0;i<3;i++){const c=new THREE.Mesh(crownG,lm);const s=1.1+rnd()*.6;c.scale.set(s,s*.85,s);c.position.set((rnd()-.5)*1.2,2.8+rnd()*.8,(rnd()-.5)*1.2);c.castShadow=true;g.add(c)}return g}
  function bush(){const g=new THREE.Group(),lm=leafMats[rnd()*4|0];for(let i=0;i<2+(rnd()*2|0);i++){const c=new THREE.Mesh(crownG,lm);const s=.35+rnd()*.35;c.scale.set(s,s*.8,s);c.position.set((rnd()-.5)*.8,s*.6,(rnd()-.5)*.8);g.add(c)}
    if(rnd()<.5)for(let i=0;i<4;i++){const f=new THREE.Mesh(flowerG,flowerMats[rnd()*3|0]);f.position.set((rnd()-.5)*1.4,.15,(rnd()-.5)*1.4);g.add(f)}return g}
  function place(make,n,area,thLo,thHi,sLo,sHi){
    for(let i=0;i<n;i++){
      let x,z,k=0;do{[x,z]=area();k++}while(k<20&&((area.out&&inField(x,z))||Math.hypot(x-0,z+36)<8));
      const g=make();g.position.set(x,0,z);g.rotation.y=rnd()*6.28;g.visible=false;scene.add(g);
      flora.push({g,th:thLo+rnd()*(thHi-thLo),s:sLo+rnd()*(sHi-sLo),k:0});
    }
  }
  const outside=()=>[(rnd()<.5?-1:1)*(25+rnd()*95),-170+rnd()*215];outside.out=true;
  const behind=()=>[(rnd()-.5)*50,-110+rnd()*60];behind.out=true;
  const field=()=>[(rnd()-.5)*44,-42+rnd()*80];
  place(bush,90,outside,.0,.45,.8,1.6);
  place(bush,60,field,.05,.7,.6,1.1);
  place(leafy,70,outside,.1,.85,.9,1.6);
  place(pine,90,outside,.15,1,.9,1.8);
  place(pine,25,behind,.3,1,1,1.7);
  place(leafy,15,behind,.25,.95,1,1.5);
}
let terraShown=-1,terraAlpha=-1;
const _cA=new THREE.Color(),_cB=new THREE.Color();
function lerpHex(a,b,k){return _cA.setHex(a).lerp(_cB.setHex(b),k).getHex()}
function setTerra(v){
  if(Math.abs(v-terraShown)<.0005)return;terraShown=v;
  grass.visible=v>.004;
  const a=Math.max(.02,1-v*1.05);
  grassMat.color.setHex(lerpHex(0x8a7448,0xffffff,Math.min(1,Math.pow(v*1.25,.8))));
  if(Math.abs(a-terraAlpha)>.015){terraAlpha=a;grassMat.alphaTest=a;grassMat.needsUpdate=true}
  for(const f of flora){
    const k=Math.max(0,Math.min(1,(v-f.th)/.06));
    if(k!==f.k){f.k=k;f.g.visible=k>0;const e=k*k*(3-2*k);f.g.scale.setScalar(Math.max(.001,f.s*e))}
  }
  ground.material.color.setHex(lerpHex(0xffffff,0xa9b88c,v));
  env.terra=v;
}

/* ---------- Tageszeit und Wetter ---------- */
// env.t: Tageszeit 0..1 (0 = Sonnenaufgang, .25 = Mittag, .5 = Sonnenuntergang, .75 = Mitternacht)
const env={terra:0,t:.18,rain:0,fog:0,rainT:0,fogT:0,day:1,sunset:0};
const _e1=new THREE.Color(),_e2=new THREE.Color(),_e3=new THREE.Color();
const RAIN_N=1400;
const rainGeo=new THREE.BufferGeometry(),rainPos=new Float32Array(RAIN_N*6);
for(let i=0;i<RAIN_N;i++){const x=(rnd()-.5)*90,y=rnd()*55,z=-70+rnd()*120;rainPos.set([x,y,z,x+.25,y-1.1,z+.15],i*6)}
rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPos,3));
const rainMat=new THREE.LineBasicMaterial({color:0xbfd4ff,transparent:true,opacity:0,depthWrite:false});
const rain=new THREE.LineSegments(rainGeo,rainMat);rain.frustumCulled=false;rain.visible=false;scene.add(rain);
function updateEnv(dt){
  env.rain+=(env.rainT-env.rain)*Math.min(1,dt*.25);env.fog+=(env.fogT-env.fog)*Math.min(1,dt*.25);
  const a=env.t*Math.PI*2,elev=Math.sin(a);
  const sm=x=>x<=0?0:x>=1?1:x*x*(3-2*x);
  env.day=.32+.68*sm((elev+.15)/.5);
  env.sunset=Math.max(0,1-Math.abs(elev)/.32)*(1-sm((-elev-.05)/.3)*.6);
  const L=env.day,v=env.terra,r=env.rain,f=env.fog;
  // Tönung: Tag weiß, Dämmerung orange, Nacht dunkelblau
  _e2.setHex(0xffffff).lerp(_e3.setHex(0xff9a66),env.sunset*.75).lerp(_e3.setHex(0x26305a),1-L);
  _e1.setHex(lerpHex(0x4a3346,0x5d7f86,v)).multiply(_e2).lerp(_e3.setHex(0x5a6470).multiplyScalar(L),r*.45).lerp(_e3.setHex(0x9aa4a8).multiplyScalar(L),f*.6);
  scene.fog.color.copy(_e1);scene.background.copy(_e1);
  scene.fog.near=(70-45*f-20*r)*FIELD_K;scene.fog.far=(230-130*f-60*r)*(.6+.4*FIELD_K);
  sun.position.set(Math.cos(a)*90,Math.max(14,Math.abs(elev)*90),30);
  sun.intensity=1.35*(.12+.88*sm((elev+.05)/.35))*(1-.45*r)*(1-.35*f)+.12*(1-L);
  sun.color.setHex(lerpHex(lerpHex(0xffe0b5,0xff8a4a,env.sunset),0x8fa8ff,1-L));
  hemi.intensity=.75*(.4+.6*L)*(1-.2*r);
  hemi.color.setHex(lerpHex(lerpHex(0xa8b8ff,0xc4e4ff,v),0x4a5aa0,1-L));
  hemi.groundColor.setHex(lerpHex(0x3a2418,0x2e4a24,v));
  _e1.setHex(lerpHex(0xffffff,0xb8e6dc,v*.8)).multiply(_e2).lerp(_e3.setHex(0x8a949c),r*.5);
  skyMesh.material.color.copy(_e1);
  rain.visible=r>.02;
  if(rain.visible){
    rainMat.opacity=.38*r;const fall=46*dt,drift=10*dt;
    for(let i=0;i<RAIN_N;i++){const o=i*6;rainPos[o+1]-=fall;rainPos[o+4]-=fall;rainPos[o]+=drift*.2;rainPos[o+3]+=drift*.2;
      if(rainPos[o+4]<0){const x=(rnd()-.5)*90,y=50+rnd()*5,z=-70+rnd()*120;rainPos[o]=x;rainPos[o+1]=y;rainPos[o+2]=z;rainPos[o+3]=x+.25;rainPos[o+4]=y-1.1;rainPos[o+5]=z+.15}}
    rainGeo.attributes.position.needsUpdate=true;
  }
}
setTerra(0);

/* ---------- Gemeinsame Materialien ---------- */
const hullMat=new THREE.MeshStandardMaterial({map:hullTex,color:0xc8ccd6,roughness:.62,metalness:.55});
const hullMatBig=new THREE.MeshStandardMaterial({map:hullTexBig,color:0xc8ccd6,roughness:.62,metalness:.55});
const darkMat=new THREE.MeshStandardMaterial({color:0x22262f,roughness:.8,metalness:.4});
const yellowMat=new THREE.MeshStandardMaterial({color:0xffd23f,emissive:0x3a2c00,roughness:.5});
const winMat=new THREE.MeshBasicMaterial({color:0xffe9a8});
const boxGeoCache={};
function boxGeo(w,h,d){const k=w+'|'+h+'|'+d;return boxGeoCache[k]||(boxGeoCache[k]=new THREE.BoxGeometry(w,h,d))}
function box(w,h,d,mat,x,y,z,par){const m=new THREE.Mesh(boxGeo(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;par.add(m);return m}

/* ---------- Schildgenerator ---------- */
const BASE=new THREE.Vector3(0,0,-36), BASE_R=4.2;
const base=new THREE.Group();base.position.copy(BASE);scene.add(base);
{
  const metal=new THREE.MeshStandardMaterial({map:hullTex,color:0xb8bcc8,roughness:.7,metalness:.5});
  const pad=new THREE.Mesh(new THREE.CylinderGeometry(3.6,4,0.6,8),metal);pad.position.y=0.3;pad.receiveShadow=pad.castShadow=true;base.add(pad);
  const pylon=new THREE.Mesh(new THREE.CylinderGeometry(0.8,1.2,4,8),metal);pylon.position.y=2.6;pylon.castShadow=true;base.add(pylon);
  const stripe=new THREE.Mesh(new THREE.CylinderGeometry(3.62,4.02,0.18,8),yellowMat);stripe.position.y=0.5;base.add(stripe);
  const core=new THREE.Mesh(new THREE.SphereGeometry(0.75,16,12),new THREE.MeshBasicMaterial({color:0x5fd0ff}));core.position.y=4.9;base.add(core);
  base.userData.ring=new THREE.Mesh(new THREE.TorusGeometry(1.6,0.15,8,32),new THREE.MeshBasicMaterial({color:0x5fd0ff}));
  base.userData.ring.position.y=4.9;base.add(base.userData.ring);
}
const domeMat=new THREE.MeshBasicMaterial({color:0x5fd0ff,transparent:true,opacity:.12,depthWrite:false,side:THREE.DoubleSide});
base.add(new THREE.Mesh(new THREE.SphereGeometry(BASE_R+0.6,32,16,0,Math.PI*2,0,Math.PI/2),domeMat));
const baseGuns=new THREE.Group();base.add(baseGuns);
function buildBaseGuns(n){
  baseGuns.clear();
  for(let i=0;i<n;i++){
    const a=i/Math.max(1,n)*Math.PI*2+0.4,g=new THREE.Group();g.position.set(Math.cos(a)*2.6,0.6,Math.sin(a)*2.6);
    const b=new THREE.Mesh(new THREE.CylinderGeometry(.45,.55,.6,8),darkMat);b.position.y=.3;g.add(b);
    const head=new THREE.Group();head.position.y=.75;g.add(head);
    box(.5,.4,.5,hullMat,0,0,0,head);box(.12,.12,1,darkMat,0,0,.55,head);
    g.userData.head=head;g.userData.cd=rnd()*.5;baseGuns.add(g);
  }
}

/* ---------- Schlachtschiff (eigener Entwurf) ---------- */
const ship=new THREE.Group();scene.add(ship);
const SHIP_POS=new THREE.Vector3(2,31,-58);
ship.position.copy(SHIP_POS);ship.rotation.set(0.04,Math.PI-0.42,0.05);ship.scale.setScalar(1.6);
{
  const s=new THREE.Shape();
  [[0,18],[1.6,13],[2.8,7],[3,4],[5,2],[5,-5],[3.6,-9],[3.6,-14],[-3.6,-14],[-3.6,-9],[-5,-5],[-5,2],[-3,4],[-2.8,7],[-1.6,13]].forEach((p,i)=>i?s.lineTo(p[0],p[1]):s.moveTo(p[0],p[1]));
  s.closePath();
  const hg=new THREE.ExtrudeGeometry(s,{depth:2.4,bevelEnabled:true,bevelThickness:.25,bevelSize:.25,bevelSegments:1});
  hg.rotateX(Math.PI/2);hg.translate(0,1.2,0);
  const hull=new THREE.Mesh(hg,hullMatBig);hull.castShadow=true;ship.add(hull);
  box(2.4,1,22,darkMat,0,-1.6,1,ship);
  box(4.4,1.1,12,hullMat,0,1.9,-3,ship);
  box(3,1,7,hullMat,0,2.9,-4,ship);
  box(2.2,2.4,2.6,hullMat,0,4.4,0.5,ship);
  box(2.24,0.25,2.64,winMat,0,4.9,0.5,ship);
  box(3.4,0.5,1.4,hullMat,0,5.85,0.2,ship);
  [[-.8,.4],[.7,-.3]].forEach(([x,z],i)=>{const a=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,2.4+i,4),darkMat);a.position.set(x,7.2+i*.5,z);ship.add(a)});
  [-1,1].forEach(sd=>{
    box(1.6,1.8,9,hullMat,sd*5.2,0.6,-1.5,ship);
    for(let k=0;k<4;k++)box(0.1,0.35,1.2,winMat,sd*6.02,0.9,-4.5+k*2,ship);
    box(0.3,0.06,7,yellowMat,sd*5.2,1.55,-1.5,ship);
  });
  box(1,0.7,8,hullMat,0,1.6,10,ship);
  for(let k=0;k<3;k++)[-1,1].forEach(sd=>{const m=box(1.8,0.06,0.35,yellowMat,sd*0.75,1.24,13-k*1.1,ship);m.rotation.y=sd*0.6});
  const num=new THREE.Mesh(new THREE.PlaneGeometry(3.4,1.3),new THREE.MeshBasicMaterial({map:numTex,transparent:true}));
  num.rotation.set(-Math.PI/2,0,Math.PI);num.position.set(0,1.26,6.4);ship.add(num);
  for(let k=0;k<6;k++){const m=box(0.35,0.06,1.6,yellowMat,-2.6+k*1.05,1.24,-12.6,ship);m.rotation.y=0.6}
  ship.userData.glows=[];
  [-2.3,0,2.3].forEach(x=>{
    const e=new THREE.Mesh(new THREE.CylinderGeometry(1,1.15,2.2,12),darkMat);e.rotation.x=Math.PI/2;e.position.set(x,0.2,-14.6);ship.add(e);
    const d=new THREE.Mesh(new THREE.CircleGeometry(0.85,16),new THREE.MeshBasicMaterial({color:0x7fdcff}));d.position.set(x,0.2,-15.75);d.rotation.y=Math.PI;ship.add(d);
    const gl=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0x5fd0ff,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));
    gl.scale.set(4.5,4.5,1);gl.position.set(x,0.2,-16.2);ship.add(gl);ship.userData.glows.push(gl);
  });
  const el=new THREE.PointLight(0x5fd0ff,1.4,40);el.position.set(0,0,-18);ship.add(el);
  [[-5.9,0.6,2],[5.9,0.6,2]].forEach(([x,y,z],i)=>{const l=new THREE.Mesh(new THREE.SphereGeometry(.18,8,6),new THREE.MeshBasicMaterial({color:i?0x7cf0a8:0xff5d5d}));l.position.set(x,y,z);ship.add(l)});
}
/* Zweites Schiff für den Mitspieler und Namensschilder */
const ship2=ship.clone();ship2.visible=false;scene.add(ship2);
ship2.userData.glows=ship2.children.filter(c=>c.isSprite);
const ship2Tip=new THREE.Object3D();ship2Tip.position.set(0,-2.8,2);ship2.add(ship2Tip);
function makeLabel(){
  const c=document.createElement('canvas');c.width=512;c.height=96;
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthTest:false}));
  sp.scale.set(8,1.5,1);sp.renderOrder=20;sp.visible=false;
  sp.userData.set=(txt,col)=>{const g=c.getContext('2d');g.clearRect(0,0,512,96);g.font='bold 52px "Russo One", Arial Black, sans-serif';g.textAlign='center';g.textBaseline='middle';
    g.lineWidth=10;g.strokeStyle='rgba(11,14,26,.85)';g.strokeText(txt,256,50);g.fillStyle=col;g.fillText(txt,256,50);t.needsUpdate=true};
  return sp;
}
const label1=makeLabel(),label2=makeLabel();label1.position.set(0,6.5,0);label2.position.set(0,6.5,0);ship.add(label1);ship2.add(label2);
const turretRoot=new THREE.Group();ship.add(turretRoot);
let turrets=[];
function buildTurrets(n){
  turretRoot.clear();turrets=[];
  for(let i=0;i<n;i++){
    const t=new THREE.Group();const z=n===1?2:8-i*(14/(n-1));t.position.set(0,-2.3,z);
    const dome=new THREE.Mesh(new THREE.SphereGeometry(0.8,12,8,0,Math.PI*2,0,Math.PI/2),hullMat);dome.rotation.x=Math.PI;t.add(dome);
    const aim=new THREE.Group();aim.position.y=-0.4;t.add(aim);
    const barrel=new THREE.Mesh(boxGeo(0.28,0.28,2.2),darkMat);barrel.position.z=1.1;aim.add(barrel);
    const tip=new THREE.Object3D();tip.position.z=2.3;aim.add(tip);
    turretRoot.add(t);turrets.push({aim,tip});
  }
  aimAll(new THREE.Vector3(0,0,0));
}
function aimAll(p){for(const t of turrets)t.aim.lookAt(p)}

/* ---------- Gegner-Modelle ---------- */
const ET={
  kraul:  {name:'Krabbler',hp:22,sp:6,r:1,s:1,rew:3,dmg:8,col:0xd8512c},
  schwarm:{name:'Schwärmer',hp:8,sp:9.5,r:.65,s:.6,rew:1,dmg:4,col:0xe88a3a},
  panzer: {name:'Panzerkäfer',hp:90,sp:3.2,r:1.8,s:1.7,rew:10,dmg:18,col:0x8a3b6e},
  spucker:{name:'Spucker',hp:40,sp:4,r:1.2,s:1.2,rew:6,dmg:10,col:0x6aa83a,ranged:true},
  boss:   {name:'Brutkönigin',hp:700,sp:1.9,r:3.6,s:3.4,rew:120,dmg:45,col:0x6e2a5a,boss:true},
  titan:  {name:'Titan',hp:2600,sp:1.4,r:5,s:4.8,rew:400,dmg:90,col:0x4a1f45,boss:true},
  nest:   {name:'Brutloch',hp:350,sp:0,r:2.8,s:1,rew:60,dmg:0,col:0x6a2a20,nest:true},
  gold:   {name:'Goldkäfer',hp:70,sp:10,r:.9,s:.95,rew:60,dmg:0,col:0xffc531,gold:true},
  elite:  {name:'Brutwächter',hp:260,sp:2.8,r:2.3,s:2.2,rew:28,dmg:26,col:0xa8344f,elite:true},
};
const G={body:new THREE.SphereGeometry(1,14,10),leg:new THREE.BoxGeometry(0.12,0.12,1.1),eye:new THREE.SphereGeometry(0.14,6,4),plate:new THREE.BoxGeometry(1.2,0.25,0.7),spike:new THREE.ConeGeometry(0.22,1,6)};
const eyeMat=new THREE.MeshBasicMaterial({color:0xfff27a});
const legMat=new THREE.MeshStandardMaterial({color:0x2a1a1a,roughness:.8});
const plateMat=new THREE.MeshStandardMaterial({color:0x3a2a40,roughness:.5,metalness:.3});
const sacMat=new THREE.MeshStandardMaterial({color:0x9be35a,emissive:0x1f4a10,roughness:.3,transparent:true,opacity:.85});
function makeBug(type){
  const T=ET[type],g=new THREE.Group(),inner=new THREE.Group();g.add(inner);inner.scale.setScalar(T.s);
  const mat=new THREE.MeshStandardMaterial({color:T.col,roughness:T.gold?.25:.55,metalness:T.gold?.85:0,emissive:0x000000});
  const body=new THREE.Mesh(G.body,mat);body.scale.set(0.8,0.55,1.1);body.position.y=0.75;body.castShadow=true;inner.add(body);
  const head=new THREE.Mesh(G.body,mat);head.scale.set(0.45,0.4,0.45);head.position.set(0,0.85,1.15);head.castShadow=true;inner.add(head);
  [-1,1].forEach(sd=>{const e=new THREE.Mesh(G.eye,eyeMat);e.position.set(sd*0.2,1,1.5);inner.add(e)});
  const legs=[];
  for(let i=0;i<3;i++)[-1,1].forEach(sd=>{
    const pivot=new THREE.Group();pivot.position.set(sd*0.6,0.7,0.6-i*0.6);
    const l=new THREE.Mesh(G.leg,legMat);l.position.set(sd*0.45,-0.25,0);l.rotation.set(0,Math.PI/2,sd*0.7);pivot.add(l);
    inner.add(pivot);legs.push({p:pivot,ph:i*2.1+(sd>0?Math.PI:0)});
  });
  if(type==='panzer'||T.boss||T.elite){for(let i=0;i<3;i++){const p=new THREE.Mesh(G.plate,plateMat);p.position.set(0,1.18,0.5-i*0.55);p.rotation.x=-0.2;p.castShadow=true;inner.add(p)}}
  if(T.boss||T.elite){for(let i=0;i<(T.elite?3:5);i++){const s=new THREE.Mesh(G.spike,plateMat);s.position.set((i-2)*0.3,1.45,0.2-Math.abs(i-2)*0.15);s.rotation.x=-0.4;inner.add(s)}}
  if(type==='spucker'){const sac=new THREE.Mesh(G.body,sacMat);sac.scale.set(.55,.5,.6);sac.position.set(0,1.2,-.45);inner.add(sac)}
  return {g,mat,legs,inner};
}

/* ---------- Soldaten, Drop-Pod, Gebäude ---------- */
const solArmor=new THREE.MeshStandardMaterial({color:0x4a515f,roughness:.7,metalness:.3});
const solCloth=new THREE.MeshStandardMaterial({color:0x272b33,roughness:.9});
const visorMat=new THREE.MeshBasicMaterial({color:0x5fd0ff});
const orangeMat=new THREE.MeshStandardMaterial({color:0xff8a3d,emissive:0x3a1400,roughness:.5});
const cyanMat=new THREE.MeshStandardMaterial({color:0x5fd0ff,emissive:0x0a2a3a,roughness:.5});
const redMat=new THREE.MeshStandardMaterial({color:0xd9473a,emissive:0x3a0a06,roughness:.5});
const headGeo=new THREE.SphereGeometry(0.22,10,8);
const CLASS_MAT={rifle:yellowMat,flamer:orangeMat,rpg:redMat,sniper:cyanMat};
function makeSoldier(cls){
  const g=new THREE.Group(),body=new THREE.Group();g.add(body);
  box(0.42,0.6,0.28,solCloth,0,0.3,0,body);
  box(0.56,0.6,0.36,solArmor,0,0.9,0,body);
  box(0.58,0.09,0.38,CLASS_MAT[cls],0,1.08,0,body);
  box(0.5,0.35,0.22,solCloth,0,0.95,-0.28,body);
  const head=new THREE.Mesh(headGeo,solArmor);head.position.y=1.4;head.castShadow=true;body.add(head);
  box(0.3,0.08,0.06,visorMat,0,1.4,0.2,body);
  let gun;
  if(cls==='flamer'){gun=box(0.14,0.14,0.55,darkMat,0.24,0.9,0.3,body);box(.3,.45,.18,orangeMat,0,.95,-.42,body)}
  else if(cls==='rpg'){gun=box(0.18,0.18,1.1,redMat,0.26,1.25,0.15,body)}
  else if(cls==='sniper'){gun=box(0.08,0.1,1.2,darkMat,0.24,0.95,0.45,body)}
  else gun=box(0.1,0.12,0.75,darkMat,0.24,0.95,0.32,body);
  g.scale.setScalar(1.3);
  return {g,body,gun};
}
const podBody=new THREE.CylinderGeometry(0.9,0.95,2.6,12),podNose=new THREE.ConeGeometry(0.95,1.1,12),podFin=new THREE.BoxGeometry(0.1,1.2,0.7),podBand=new THREE.CylinderGeometry(0.97,0.97,0.25,12),podCap=new THREE.CylinderGeometry(0.88,0.88,0.18,12);
podNose.rotateX(Math.PI);
function makePod(){
  const g=new THREE.Group();
  const nose=new THREE.Mesh(podNose,darkMat);nose.position.y=0.55;g.add(nose);
  const body=new THREE.Mesh(podBody,hullMat);body.position.y=2.4;body.castShadow=true;g.add(body);
  const band=new THREE.Mesh(podBand,yellowMat);band.position.y=1.7;g.add(band);
  const band2=new THREE.Mesh(podBand,yellowMat);band2.position.y=3.3;g.add(band2);
  for(let i=0;i<3;i++){const f=new THREE.Mesh(podFin,darkMat);const a=i/3*6.28;f.position.set(Math.cos(a)*1,3.2,Math.sin(a)*1);f.rotation.y=-a;g.add(f)}
  const hinge=new THREE.Group();hinge.position.set(0.88,3.75,0);g.add(hinge);
  const cap=new THREE.Mesh(podCap,hullMat);cap.position.x=-0.88;hinge.add(cap);
  const glow=new THREE.Mesh(new THREE.CircleGeometry(.75,12),new THREE.MeshBasicMaterial({color:0xffe9a8}));glow.rotation.x=-Math.PI/2;glow.position.y=3.72;g.add(glow);
  const fl=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0xff8a3d,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));
  fl.scale.set(4,4,1);fl.position.y=0.1;g.add(fl);
  g.userData={flame:fl,hinge};
  g.scale.setScalar(1.25);
  return g;
}
function makeSentry(){
  const g=new THREE.Group();
  const legGeo=boxGeo(.14,1.3,.14);
  for(let i=0;i<3;i++){const l=new THREE.Mesh(legGeo,darkMat);const a=i/3*6.28;l.position.set(Math.cos(a)*.55,.55,Math.sin(a)*.55);l.rotation.set(Math.sin(a)*.4,0,-Math.cos(a)*.4);g.add(l)}
  const head=new THREE.Group();head.position.y=1.35;g.add(head);
  box(1,.7,1.1,hullMat,0,0,0,head);box(1.02,.12,1.12,yellowMat,0,.2,0,head);
  box(.14,.14,1.4,darkMat,-.2,0,.9,head);box(.14,.14,1.4,darkMat,.2,0,.9,head);
  g.userData.head=head;return g;
}
function makeWall(){
  const g=new THREE.Group();
  box(7,1.8,1,hullMat,0,.9,0,g);
  for(let i=0;i<5;i++){const m=box(.35,.06,1.6,yellowMat,-2.8+i*1.4,1.82,0,g);m.rotation.y=.6;m.scale.z=.62}
  box(.4,2.2,1.3,darkMat,-3.5,1.1,0,g);box(.4,2.2,1.3,darkMat,3.5,1.1,0,g);
  return g;
}
function makeKaserne(){
  const g=new THREE.Group();
  box(4.2,2.2,3.2,hullMat,0,1.1,0,g);
  const roof=box(4.4,.3,3.4,darkMat,0,2.35,0,g);roof.rotation.x=.04;
  box(1.2,1.4,.1,new THREE.MeshBasicMaterial({color:0xffe9a8}),0,.7,1.62,g);
  box(4.22,.22,3.22,yellowMat,0,1.7,0,g);
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,3,4),darkMat);pole.position.set(1.7,3.3,-1.2);g.add(pole);
  box(.9,.5,.04,yellowMat,2.15,4.4,-1.2,g);
  return g;
}
function makeMoerser(){
  const g=new THREE.Group();
  const bag=new THREE.Mesh(new THREE.TorusGeometry(1.2,.35,6,14),new THREE.MeshStandardMaterial({color:0x7a6248,roughness:1}));bag.rotation.x=Math.PI/2;bag.position.y=.3;bag.castShadow=true;g.add(bag);
  const tube=new THREE.Mesh(new THREE.CylinderGeometry(.22,.28,1.8,10),darkMat);tube.position.set(0,1,0);tube.rotation.x=-.55;tube.castShadow=true;g.add(tube);
  box(.7,.25,.7,hullMat,0,.2,0,g);
  g.userData.tube=tube;return g;
}
const mineGeo=new THREE.CylinderGeometry(.35,.4,.18,10),mineLight=new THREE.SphereGeometry(.09,6,4);
const mineLightMat=new THREE.MeshBasicMaterial({color:0xff3b3b});
function makeMine(){const g=new THREE.Group();const m=new THREE.Mesh(mineGeo,darkMat);m.position.y=.09;g.add(m);const l=new THREE.Mesh(mineLight,mineLightMat);l.position.y=.22;g.add(l);g.userData.light=l;return g}
function makeJet(){
  const g=new THREE.Group();
  box(.9,.6,5,hullMat,0,0,0,g);box(7,.15,1.8,hullMat,0,0,-.3,g);box(2.6,.12,.9,hullMat,0,.1,-2.2,g);box(.12,1.1,.9,darkMat,0,.6,-2.2,g);
  box(.92,.12,1.2,yellowMat,0,.32,1.2,g);
  const gl=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0x5fd0ff,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));gl.scale.set(2.5,2.5,1);gl.position.z=-2.8;g.add(gl);
  return g;
}

/* ---------- Mech und Shuttle (eigene Entwürfe) ---------- */
function makeMech(){
  const g=new THREE.Group(),body=new THREE.Group();g.add(body);
  const legs=[];
  [-1,1].forEach(sd=>{const hip=new THREE.Group();hip.position.set(sd*.45,1.7,0);body.add(hip);
    box(.42,1.5,.5,hullMat,0,-.75,0,hip);box(.62,.22,.9,darkMat,0,-1.55,.12,hip);box(.44,.16,.52,yellowMat,0,-.35,0,hip);legs.push(hip)});
  box(.95,.35,.7,darkMat,0,1.85,0,body);
  box(1.6,1.1,1.15,hullMat,0,2.45,0,body);
  box(1.62,.12,1.17,yellowMat,0,2.12,0,body);
  box(1,.24,.08,visorMat,0,2.62,.6,body);
  box(1.2,.35,.8,hullMat,0,3.12,-.05,body);
  const gun=new THREE.Group();gun.position.set(1.05,2.25,.25);body.add(gun);
  box(.36,.36,.5,darkMat,0,0,0,gun);box(.14,.14,1.3,darkMat,-.08,0,.85,gun);box(.14,.14,1.3,darkMat,.08,0,.85,gun);
  const tip=new THREE.Object3D();tip.position.set(0,0,1.55);gun.add(tip);
  const mounts=[[-.55,3.35,0],[.55,3.35,0],[-1.05,2.35,.05],[0,2.6,-.75]].map(([x,y,z])=>{const m=new THREE.Group();m.position.set(x,y,z);body.add(m);return m});
  g.scale.setScalar(1.25);
  g.userData={legs,body,gun,tip,mounts};
  return g;
}
function mechWeaponModel(k){
  const g=new THREE.Group();
  if(k==='mrak'){box(.62,.48,.75,redMat,0,0,0,g);for(let i=0;i<4;i++)box(.12,.12,.08,darkMat,-.15+(i%2)*.3,-.1+(i>>1)*.22,.4,g)}
  else if(k==='mflam'){const t=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,.7,10),orangeMat);t.rotation.x=Math.PI/2;g.add(t);box(.12,.12,.6,darkMat,0,-.18,.5,g)}
  else if(k==='mgren'){const d=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.35,12),darkMat);d.rotation.z=Math.PI/2;g.add(d);box(.18,.18,.8,darkMat,0,0,.5,g)}
  else if(k==='mlaser'){box(.36,.36,.8,hullMat,0,0,0,g);box(.22,.22,.25,cyanMat,0,0,.5,g)}
  const tip=new THREE.Object3D();tip.position.z=.7;g.add(tip);g.userData.tip=tip;
  return g;
}
function setMechWeapons(m,list){
  m.userData.mounts.forEach(mt=>mt.clear());m.userData.wtips={};
  list.forEach((k,i)=>{const mt=m.userData.mounts[i];if(!mt)return;const w=mechWeaponModel(k);mt.add(w);m.userData.wtips[k]=w.userData.tip});
}
function makeShuttle(){
  const g=new THREE.Group();
  box(2.6,1.5,7,hullMat,0,0,0,g);
  box(2,.9,2.2,hullMat,0,.6,2.4,g);box(1.6,.25,.08,winMat,0,.75,3.52,g);
  box(9,.22,2.4,hullMat,0,-.1,-.6,g);box(9.02,.06,.5,yellowMat,0,.03,-.2,g);
  box(.22,1.6,1.4,darkMat,0,1.2,-3,g);
  [-3.4,3.4].forEach(x=>{const e=new THREE.Mesh(new THREE.CylinderGeometry(.5,.6,2,10),darkMat);e.rotation.x=Math.PI/2;e.position.set(x,-.3,-1);g.add(e);
    const gl=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0x5fd0ff,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));gl.scale.set(2.6,2.6,1);gl.position.set(x,-.3,-2.2);g.add(gl)});
  for(let k=0;k<4;k++){const m=box(.3,.05,1.2,yellowMat,-.8+k*.55,.77,-1.5,g);m.rotation.y=.6}
  const ramp=new THREE.Group();ramp.position.set(0,-.75,-3.5);g.add(ramp);box(2.2,.12,2,hullMat,0,0,-1,ramp);
  [-1,1].forEach(sd=>box(.15,1.1,.15,darkMat,sd*.9,-1.25,.5,g));
  g.userData={ramp};g.scale.setScalar(1.15);
  return g;
}

/* ---------- Brutloch, Kommandanten, Zombies ---------- */
const nestRimMat=new THREE.MeshStandardMaterial({color:0x4a2a22,roughness:1,flatShading:true});
const nestGlowMat=new THREE.MeshBasicMaterial({color:0xff6a3d,transparent:true,opacity:.85});
function makeNest(){
  const g=new THREE.Group(),inner=new THREE.Group();g.add(inner);
  const mat=new THREE.MeshStandardMaterial({color:0x3a1a1a,roughness:.9,emissive:0x000000});
  const rim=new THREE.Mesh(new THREE.TorusGeometry(2.6,.9,8,18),nestRimMat);rim.rotation.x=Math.PI/2;rim.position.y=.25;rim.scale.z=.6;rim.castShadow=true;inner.add(rim);
  const pit=new THREE.Mesh(new THREE.CircleGeometry(2.4,20),mat);pit.rotation.x=-Math.PI/2;pit.position.y=.08;inner.add(pit);
  const glow=new THREE.Mesh(new THREE.CircleGeometry(1.4,20),nestGlowMat);glow.rotation.x=-Math.PI/2;glow.position.y=.1;inner.add(glow);
  for(let i=0;i<7;i++){const a=i/7*6.28,sp=new THREE.Mesh(G.spike,plateMat);sp.position.set(Math.cos(a)*2.9,.6,Math.sin(a)*2.9);sp.rotation.set(Math.sin(a)*.6,0,-Math.cos(a)*.6);sp.scale.set(1.4,1.6,1.4);inner.add(sp)}
  const gl=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0xff6a3d,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));gl.scale.set(6,6,1);gl.position.y=.5;inner.add(gl);
  return{g,mat,legs:[],inner,glow:gl};
}
/* ---------- Gräber, Versorgungskiste, Ameisen ---------- */
const dirtMat=new THREE.MeshStandardMaterial({color:0x5a4030,roughness:1,flatShading:true});
const grEyeMat=new THREE.MeshBasicMaterial({color:0xff9a3d});
function makeGraeber(){
  const g=new THREE.Group();
  const mound=new THREE.Mesh(new THREE.SphereGeometry(.75,10,6,0,Math.PI*2,0,Math.PI/2),dirtMat);mound.scale.y=.45;mound.receiveShadow=true;g.add(mound);
  const helm=new THREE.Mesh(new THREE.SphereGeometry(.3,10,6,0,Math.PI*2,0,Math.PI/2),solArmor);helm.position.set(0,.2,.12);g.add(helm);
  const eyes=new THREE.Group();[-1,1].forEach(sd=>{const e=new THREE.Mesh(G.eye,grEyeMat);e.scale.setScalar(.5);e.position.set(sd*.1,.27,.4);eyes.add(e)});g.add(eyes);
  const arms=new THREE.Group();arms.visible=false;
  [-1,1].forEach(sd=>{box(.14,.9,.14,solArmor,sd*.3,0,.1,arms);box(.24,.2,.24,solCloth,sd*.3,.48,.1,arms)});
  g.add(arms);g.userData={arms,eyes,helm};return g;
}
const crateMat=new THREE.MeshStandardMaterial({color:0x5a6270,roughness:.6,metalness:.4});
function makeCrate(){
  const g=new THREE.Group();
  box(1.3,1,1.3,crateMat,0,.5,0,g);box(1.34,.22,1.34,yellowMat,0,.5,0,g);box(.22,1.04,1.34,yellowMat,0,.5,0,g);
  const chute=new THREE.Mesh(new THREE.SphereGeometry(1.6,12,6,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({color:0xffd23f,roughness:.8,side:THREE.DoubleSide}));chute.position.y=3.6;chute.scale.y=.6;g.add(chute);
  const gl=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0xffd23f,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));gl.scale.set(4,4,1);gl.position.y=1.2;g.add(gl);
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,30,8,1,true),new THREE.MeshBasicMaterial({color:0xffd23f,transparent:true,opacity:.25,blending:THREE.AdditiveBlending,depthWrite:false}));beam.position.y=15;g.add(beam);
  g.userData={chute,glow:gl,beam};return g;
}
/* ---------- Kamikaze-Rover und Panzer-Marines ---------- */
const wheelGeo=new THREE.CylinderGeometry(.4,.4,.3,12);
const roverLightMat=new THREE.MeshBasicMaterial({color:0xff3b3b});
function makeRover(){
  const g=new THREE.Group(),body=new THREE.Group();g.add(body);
  box(1.3,.45,2,solArmor,0,.65,0,body);box(1.1,.35,.9,darkMat,0,1,-.35,body);
  const bomb=new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,1.2,10),redMat);bomb.rotation.z=Math.PI/2;bomb.position.set(0,1.2,-.35);body.add(bomb);
  box(1.34,.1,.3,yellowMat,0,.9,.9,body);box(.9,.06,.2,yellowMat,0,1.22,-.35,body);
  const light=new THREE.Mesh(G.eye,roverLightMat);light.scale.setScalar(1.5);light.position.set(0,1.38,.45);body.add(light);
  const wheels=[];[[-.75,.7],[.75,.7],[-.75,-.7],[.75,-.7]].forEach(([x,z])=>{const w=new THREE.Group();w.position.set(x,.4,z);const m=new THREE.Mesh(wheelGeo,darkMat);m.rotation.z=Math.PI/2;m.castShadow=true;w.add(m);box(.32,.12,.12,solArmor,0,0,0,w);body.add(w);wheels.push(w)});
  g.scale.setScalar(1.1);return{g,body,wheels,light};
}
const marArmor=new THREE.MeshStandardMaterial({color:0x3d4350,roughness:.45,metalness:.6});
const sawMat=new THREE.MeshStandardMaterial({color:0xb8bcc6,roughness:.3,metalness:.9});
function makeMarine(){
  const g=new THREE.Group(),body=new THREE.Group();g.add(body);
  box(.62,.7,.42,solCloth,0,.35,0,body);
  box(.88,.78,.58,marArmor,0,1.08,0,body);box(1.15,.26,.62,marArmor,0,1.47,0,body);box(.9,.1,.6,yellowMat,0,.86,0,body);
  const head=new THREE.Mesh(headGeo,marArmor);head.scale.setScalar(1.3);head.position.y=1.78;head.castShadow=true;body.add(head);
  box(.36,.08,.06,visorMat,0,1.8,.28,body);
  const shield=new THREE.Group();shield.position.set(-.48,1.05,.48);body.add(shield);
  box(.85,1.35,.12,marArmor,0,0,0,shield);box(.86,.1,.14,yellowMat,0,.45,0,shield);box(.16,.16,.15,visorMat,0,.2,.02,shield);
  const saw=new THREE.Group();saw.position.set(.55,1,.3);body.add(saw);
  box(.24,.32,.55,orangeMat,0,0,0,saw);const blade=box(.07,.24,1.15,sawMat,0,0,.8,saw);box(.09,.05,1.15,darkMat,0,.13,.8,saw);
  g.scale.setScalar(1.4);return{g,body,saw,blade,shield};
}
const ANT_MAX=720;
const antGeo=(()=>{const g=new THREE.SphereGeometry(.13,6,4);g.scale(1,.55,1.9);return g})();
const antMat=new THREE.MeshStandardMaterial({color:0x6a2a16,roughness:.5,emissive:0x2a0a04});
function makeAntSwarm(max){
  const g=new THREE.Group();
  const mesh=new THREE.InstancedMesh(antGeo,antMat,max);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;mesh.castShadow=true;mesh.count=0;g.add(mesh);
  const em=new THREE.MeshBasicMaterial({color:0xff4a2a});
  const eyes=[-1,1].map(()=>{const e=new THREE.Mesh(G.eye,em);e.scale.setScalar(1.3);e.visible=false;g.add(e);return e});
  return{g,mesh,eyes};
}
const cmdMats={cmd_kom:yellowMat,cmd_sniper:cyanMat,cmd_nekro:new THREE.MeshStandardMaterial({color:0x7a3ad0,emissive:0x1a0a30,roughness:.6}),cmd_ing:orangeMat,cmd_pilot:yellowMat};
function makeCommander(id){
  if(id==='cmd_ameise'){const a=makeAntSwarm(ANT_MAX);return{g:a.g,body:a.g,gun:a.g,ant:true,mesh:a.mesh,eyes:a.eyes}}
  if(id==='cmd_pilot'){const j=makeJet();j.scale.setScalar(1.8);const pods=new THREE.Group();j.add(pods);j.userData.pods=pods;return{g:j,body:j,gun:j,jet:true}}
  const cls={cmd_kom:'rifle',cmd_sniper:'sniper',cmd_nekro:'rifle',cmd_ing:'rifle'}[id];
  const s=makeSoldier(cls),b=s.body,cm=cmdMats[id];
  if(id==='cmd_kom'){const p=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,1.6,4),darkMat);p.position.set(-.22,1.6,-.3);b.add(p);box(.5,.32,.03,yellowMat,-.47,2.2,-.3,b)}
  if(id==='cmd_sniper'){box(.62,.7,.08,cyanMat,0,.95,-.3,b);box(.5,.18,.5,cyanMat,0,1.55,0,b)}
  if(id==='cmd_nekro'){const robe=new THREE.Mesh(new THREE.ConeGeometry(.45,1.1,10),cm);robe.position.y=.55;b.add(robe);
    const st=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,1.9,5),darkMat);st.position.set(.35,.95,.25);b.add(st);
    const orb=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0x8bff6a,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));orb.scale.set(.7,.7,1);orb.position.set(.35,1.95,.25);b.add(orb)}
  if(id==='cmd_ing'){box(.5,.55,.3,orangeMat,0,1,-.36,b);const a=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,.9,4),darkMat);a.position.set(.15,1.6,-.4);b.add(a)}
  const ring=new THREE.Mesh(new THREE.RingGeometry(.55,.68,24),new THREE.MeshBasicMaterial({color:cm.color?cm.color.getHex():0xffd23f,transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false}));
  ring.rotation.x=-Math.PI/2;ring.position.y=.04;s.g.add(ring);
  s.g.scale.setScalar(2);
  return s;
}
const zombieMat=new THREE.MeshStandardMaterial({color:0x6f8a5a,roughness:.9});
const zombieCloth=new THREE.MeshStandardMaterial({color:0x3a3530,roughness:1});
function makeZombie(){
  const g=new THREE.Group(),body=new THREE.Group();g.add(body);
  box(.42,.6,.28,zombieCloth,0,.3,0,body);
  const torso=box(.52,.6,.34,zombieCloth,0,.88,.05,body);torso.rotation.x=.25;
  const head=new THREE.Mesh(headGeo,zombieMat);head.position.set(0,1.3,.18);body.add(head);
  [-1,1].forEach(sd=>{const a=box(.14,.14,.75,zombieMat,sd*.3,1.05,.4,body);a.rotation.x=-.1});
  const eye=new THREE.Mesh(G.eye,new THREE.MeshBasicMaterial({color:0x8bff6a}));eye.position.set(0,1.33,.38);body.add(eye);
  g.scale.setScalar(1.3);
  return{g,body};
}

/* ---------- Lebensbalken ---------- */
const barBgMat=new THREE.MeshBasicMaterial({color:0x111522,depthTest:false,transparent:true,opacity:.8});
const barFgMat=new THREE.MeshBasicMaterial({color:0x7cf0a8,depthTest:false});
const barGeo=new THREE.PlaneGeometry(1,.16);barGeo.translate(.5,0,0);
function makeBar(w){
  const g=new THREE.Group(),inner=new THREE.Group();g.add(inner);inner.position.x=-w/2;inner.scale.x=w;
  const bg=new THREE.Mesh(barGeo,barBgMat);bg.renderOrder=10;inner.add(bg);
  const fg=new THREE.Mesh(barGeo,barFgMat);fg.renderOrder=11;fg.position.z=.01;inner.add(fg);
  g.userData.fg=fg;scene.add(g);return g;
}

/* ---------- Effekte ---------- */
const partGeo=new THREE.BoxGeometry(0.28,0.28,0.28);
const pmCache={};const pmat=c=>pmCache[c]||(pmCache[c]=new THREE.MeshBasicMaterial({color:c}));
let parts=[];const partPool=[];
function spark(pos,col,n,sp,up=7){
  for(let i=0;i<n&&parts.length<500;i++){
    const m=partPool.pop()||new THREE.Mesh(partGeo);m.material=pmat(col);m.position.copy(pos);m.visible=true;
    m.scale.setScalar(0.6+rnd()*1.2);scene.add(m);
    parts.push({m,v:new THREE.Vector3((rnd()-.5)*sp,rnd()*up,(rnd()-.5)*sp),life:0.4+rnd()*0.5});
  }
}
let fx=[];
const sphereGeo=new THREE.SphereGeometry(1,20,12), ringGeo=new THREE.RingGeometry(0.85,1,48);
function blast(pos,col,r,dur=0.45,ring=false){
  const m=new THREE.Mesh(ring?ringGeo:sphereGeo,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.7,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));
  m.position.copy(pos);if(ring)m.rotation.x=-Math.PI/2;scene.add(m);fx.push({m,r,life:dur,max:dur,grow:true});
}
function fadeMesh(m,dur){scene.add(m);fx.push({m,life:dur,max:dur,o0:m.material.opacity})}
function updateFx(dt){
  for(const p of parts){p.v.y-=22*dt;p.m.position.addScaledVector(p.v,dt);if(p.m.position.y<0.1){p.m.position.y=0.1;p.v.multiplyScalar(0.5)}p.life-=dt;p.m.scale.multiplyScalar(0.985)}
  parts=parts.filter(p=>{if(p.life>0)return true;scene.remove(p.m);partPool.push(p.m);return false});
  for(const f of fx){f.life-=dt;const k=1-f.life/f.max;
    if(f.grow){f.m.scale.setScalar(Math.max(0.01,f.r*(0.3+0.7*k)));f.m.material.opacity=0.7*(1-k)}
    else f.m.material.opacity=(f.o0??1)*(1-k)}
  fx=fx.filter(f=>{if(f.life>0)return true;scene.remove(f.m);f.m.material.dispose();return false});
}
const tracerGeo=new THREE.BoxGeometry(0.07,0.07,1);
const tracerMats={};const tracerMat=c=>tracerMats[c]||(tracerMats[c]=new THREE.MeshBasicMaterial({color:c}));
let tracers=[];
function tracer(a,b,col=0xffe27a,w=1){
  const m=new THREE.Mesh(tracerGeo,tracerMat(col));m.position.lerpVectors(a,b,0.5);m.lookAt(b);m.scale.set(w,w,Math.max(0.1,a.distanceTo(b)));
  scene.add(m);tracers.push({m,life:0.06});
}
function updateTracers(dt){for(const t of tracers)t.life-=dt;tracers=tracers.filter(t=>{if(t.life>0)return true;scene.remove(t.m);return false})}

/* Projektile mit Flugbahn */
const projGeo={
  bolt:new THREE.BoxGeometry(0.3,0.3,2.4),
  shell:new THREE.BoxGeometry(0.5,0.5,1.6),
  ball:new THREE.SphereGeometry(0.35,10,8),
  rocket:(()=>{const g=new THREE.ConeGeometry(0.35,1.6,8);g.rotateX(Math.PI/2);return g})(),
};
const projMat={
  bolt:new THREE.MeshBasicMaterial({color:0xffd23f}),
  shell:new THREE.MeshBasicMaterial({color:0xffb04a}),
  grenade:new THREE.MeshStandardMaterial({color:0x3f4a3a,emissive:0x202a10}),
  plasma:new THREE.MeshBasicMaterial({color:0xff5fd2}),
  acid:new THREE.MeshBasicMaterial({color:0x9be35a}),
  meteor:new THREE.MeshBasicMaterial({color:0xff8a3d}),
  rocket:new THREE.MeshStandardMaterial({color:0xdfe2ea,emissive:0x442200}),
};
let shots=[];
const _pv=new THREE.Vector3();
function shoot(o){
  const m=new THREE.Mesh(projGeo[o.geo||'bolt'],projMat[o.mat||'bolt']);
  if(o.scale)m.scale.setScalar(o.scale);
  m.position.copy(o.from);scene.add(m);
  shots.push({m,from:o.from.clone(),to:o.to.clone(),t:0,dur:o.dur,arc:o.arc||0,track:o.track||null,onHit:o.onHit,cos:COSMETIC,trail:o.trail||0,trailCol:o.trailCol||0x9a9aa8});
}
function updateShots(dt){
  for(const s of shots){
    if(s.track&&!s.track.dead){s.to.x=s.track.g.position.x;s.to.z=s.track.g.position.z}
    s.t+=dt;const k=Math.min(1,s.t/s.dur);
    _pv.lerpVectors(s.from,s.to,k);_pv.y+=s.arc*4*k*(1-k);
    s.m.lookAt(_pv);s.m.position.copy(_pv);
    if(s.trail&&rnd()<s.trail)spark(_pv,s.trailCol,1,1,1);
    if(k>=1){s.done=1;scene.remove(s.m);const c0=COSMETIC;COSMETIC=s.cos;try{s.onHit&&s.onHit(s.to)}finally{COSMETIC=c0}}
  }
  shots=shots.filter(s=>!s.done);
}

/* Laser, Orbitalsäule, Fadenkreuz */
const beam=new THREE.Group();
const beamCore=new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.25,1,8,1,true),new THREE.MeshBasicMaterial({color:0xbff0ff,transparent:true,opacity:.95,blending:THREE.AdditiveBlending,depthWrite:false}));
const beamGlow=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.1,1,12,1,true),new THREE.MeshBasicMaterial({color:0x5fd0ff,transparent:true,opacity:.28,blending:THREE.AdditiveBlending,depthWrite:false}));
beam.add(beamCore,beamGlow);beam.visible=false;scene.add(beam);
const laserHit=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0x5fd0ff,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));
laserHit.scale.set(6,6,1);laserHit.visible=false;scene.add(laserHit);
const orbCol=new THREE.Mesh(new THREE.CylinderGeometry(5,5,200,24,1,true),new THREE.MeshBasicMaterial({color:0xcff4ff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));
orbCol.position.set(0,100,4);scene.add(orbCol);
const cross=new THREE.Group();
{
  const m=new THREE.MeshBasicMaterial({color:0xffd23f,transparent:true,opacity:.9,depthWrite:false,side:THREE.DoubleSide});
  cross.add(new THREE.Mesh(new THREE.RingGeometry(0.9,1.15,32),m),new THREE.Mesh(new THREE.CircleGeometry(0.22,12),m));
  for(let i=0;i<4;i++){const t=new THREE.Mesh(new THREE.PlaneGeometry(0.18,0.9),m);const a=i*Math.PI/2;t.position.set(Math.cos(a)*1.7,Math.sin(a)*1.7,0);t.rotation.z=a+Math.PI/2;cross.add(t)}
  cross.rotation.x=-Math.PI/2;cross.visible=false;scene.add(cross);
}
const ghost=new THREE.Mesh(new THREE.RingGeometry(0.94,1,48),new THREE.MeshBasicMaterial({color:0x5fd0ff,transparent:true,opacity:.6,depthWrite:false,side:THREE.DoubleSide}));
ghost.rotation.x=-Math.PI/2;ghost.visible=false;scene.add(ghost);

/* Brennende Flächen */
const zoneGeo=new THREE.CircleGeometry(1,28);
let zones=[];
function addZone(x,z,r,dps,dur,col=0xff7a2a){
  const m=new THREE.Mesh(zoneGeo,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.45,blending:THREE.AdditiveBlending,depthWrite:false}));
  m.rotation.x=-Math.PI/2;m.position.set(x,.06,z);m.scale.setScalar(r);scene.add(m);
  zones.push({m,x,z,r,dps,t:dur,max:dur,col,cos:COSMETIC});
}
