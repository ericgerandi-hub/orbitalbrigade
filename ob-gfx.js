'use strict';
/* =========================================================
   Orbitalbrigade – Grafikstufen
   1 Normal: wie bisher, keine Nachbearbeitung
   2 Hoch:   HDR-Bild mit Filmkurve, Leuchten (Bloom), Kantenglättung,
             Bodenrelief, Sonnenschein, mehr Funken
   3 Ultra:  stärkeres Leuchten, Lichtblitze bei Explosionen,
             Schwebstaub, Objektiv-Effekte, feinere Schatten, Rumpfrelief
   ========================================================= */
const GFX_KEY='orbitalbrigade-gfx';
const GFX_NAMES={1:'Normal',2:'Hoch',3:'Ultra'};
const GFX_PRESET={
  2:{ssao:0,env:.55,hemi:.88,ss:0,bloom:[.45,.4,.88],exp:1.18,sat:1.18,con:1.1,vig:.24,grain:0,ca:0,pm:1.3,bump:.55,hull:0,flare:.8,dust:0,flash:0,shadowPC:2048,shadowMob:2048},
  3:{ssao:0,env:.85,hemi:.82,ss:1.5,bloom:[.65,.5,.8],exp:1.22,sat:1.24,con:1.15,vig:.32,grain:.025,ca:.0012,pm:1.8,bump:1.6,hull:.8,flare:1.15,dust:1,flash:6,shadowPC:4096,shadowMob:2048},
};
const GFX={lv:1,pm:1,P:null,composer:null,bloom:null,fin:null,flashL:[],flashI:0,dust:null,flare:null,t:0,bumpOn:0};
{const v=+ls.get(GFX_KEY);GFX.lv=v===2||v===3?v:1}

const FinalShader={
  uniforms:{tDiffuse:{value:null},uExp:{value:1},uSat:{value:1},uCon:{value:1},uVig:{value:0},uGrain:{value:0},uCA:{value:0},uTime:{value:0},uRes:{value:new THREE.Vector2(1,1)}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:`uniform sampler2D tDiffuse;uniform float uExp,uSat,uCon,uVig,uGrain,uCA,uTime;uniform vec2 uRes;varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
vec3 toSRGB(vec3 c){return mix(c*12.92,1.055*pow(max(c,vec3(0.)),vec3(1./2.4))-.055,step(.0031308,c));}
void main(){
  vec2 d=vUv-.5;float r2=dot(d,d);vec3 col;
  if(uCA>0.){vec2 o=d*uCA*r2*6.;col=vec3(texture2D(tDiffuse,vUv+o).r,texture2D(tDiffuse,vUv).g,texture2D(tDiffuse,vUv-o).b);}
  else col=texture2D(tDiffuse,vUv).rgb;
  // Sanfte Filmkurve: dunkle und mittlere Töne bleiben wie bisher, nur helle Spitzen werden weich abgefangen
  col*=uExp;float L=dot(col,vec3(.2126,.7152,.0722));col*=(1.+L/9.)/(1.+L*.85);
  col=toSRGB(clamp(col,0.,1.));
  float l=dot(col,vec3(.2126,.7152,.0722));col=mix(vec3(l),col,uSat);
  col=clamp((col-.5)*uCon+.5,0.,1.);
  col*=1.-uVig*smoothstep(.12,.62,r2*2.);
  col+=(hash(vUv*uRes+fract(uTime)*91.7)-.5)*uGrain;
  gl_FragColor=vec4(col,1.);
}`};

function gfxDisposeComposer(){
  const c=GFX.composer;if(!c)return;
  try{c.renderTarget1.dispose();c.renderTarget2.dispose();if(GFX.bloom)GFX.bloom.dispose();if(GFX.ssao)GFX.ssao.dispose()}catch(e){}
  GFX.composer=GFX.bloom=GFX.fin=GFX.ssao=null;
}
function gfxBuildComposer(P){
  gfxDisposeComposer();
  if(!THREE.EffectComposer||!THREE.UnrealBloomPass)return false;
  const sz=renderer.getDrawingBufferSize(new THREE.Vector2()),gl2=renderer.capabilities.isWebGL2;
  const half=gl2||!!renderer.extensions.get('OES_texture_half_float');
  const opts={minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,format:THREE.RGBAFormat,type:half?THREE.HalfFloatType:THREE.UnsignedByteType};
  let rt;
  if(gl2&&THREE.WebGLMultisampleRenderTarget){rt=new THREE.WebGLMultisampleRenderTarget(sz.x,sz.y,opts);rt.samples=4}
  else rt=new THREE.WebGLRenderTarget(sz.x,sz.y,opts);
  const c=new THREE.EffectComposer(renderer,rt);
  if(P.ssao&&THREE.SSAOPass){
    const a=new THREE.SSAOPass(scene,camera,sz.x,sz.y);a.kernelRadius=1.4;a.minDistance=.0004;a.maxDistance=.012;
    a.beautyRenderTarget.texture.type=opts.type;c.addPass(a);GFX.ssao=a;
  }else c.addPass(new THREE.RenderPass(scene,camera));
  const b=new THREE.UnrealBloomPass(new THREE.Vector2(sz.x,sz.y),P.bloom[0],P.bloom[1],P.bloom[2]);c.addPass(b);
  const f=new THREE.ShaderPass(FinalShader);c.addPass(f);
  GFX.composer=c;GFX.bloom=b;GFX.fin=f;
  return true;
}
function gfxResize(){
  if(!GFX.composer)return;
  const sz=renderer.getDrawingBufferSize(new THREE.Vector2());
  GFX.composer.setSize(sz.x,sz.y);GFX.fin.uniforms.uRes.value.set(sz.x,sz.y);
}

/* Bodenrelief und Rumpfrelief aus den vorhandenen Texturen */
const _bumpMats=[];
function gfxMat(...ms){for(const m of ms)if(m&&!_bumpMats.includes(m)){_bumpMats.push(m);gfxHullBump(m)}}
function gfxHullBump(m){const k=GFX.P?GFX.P.hull:0;const want=k>0?m.map:null;if(m.bumpMap!==want){m.bumpMap=want;m.bumpScale=k*.6;m.needsUpdate=true}else if(want)m.bumpScale=k*.6}
function gfxGroundBump(){
  const m=ground.material,k=GFX.P?GFX.P.bump:0,want=k>0?m.map:null;
  if(m.bumpMap!==want){m.bumpMap=want;m.needsUpdate=true}
  if(want)m.bumpScale=k*1.4;
}

/* Lichtblitze bei Explosionen (Ultra): fester Pool, damit Shader nicht ständig neu gebaut werden */
function gfxFlashPool(n){
  while(GFX.flashL.length>n){const l=GFX.flashL.pop();scene.remove(l)}
  while(GFX.flashL.length<n){const l=new THREE.PointLight(0xffa040,0,26,2);l.userData.v=0;scene.add(l);GFX.flashL.push(l)}
}
function gfxFlash(pos,col,r){
  if(!GFX.flashL.length||r<1.2)return;
  const l=GFX.flashL[GFX.flashI=(GFX.flashI+1)%GFX.flashL.length];
  l.position.set(pos.x,Math.max(1.2,pos.y+1),pos.z);l.color.setHex(col);l.distance=Math.min(40,8+r*5);l.userData.v=Math.min(9,2.5+r*1.3);l.intensity=l.userData.v;
}

/* Schwebstaub in der Luft (Ultra) */
function gfxDust(on){
  if(!on){if(GFX.dust){scene.remove(GFX.dust);GFX.dust=null}return}
  if(GFX.dust)return;
  const n=520,p=new Float32Array(n*3),sp=new Float32Array(n);
  for(let i=0;i<n;i++){p[i*3]=(rnd()-.5)*110;p[i*3+1]=.5+rnd()*22;p[i*3+2]=-60+rnd()*120;sp[i]=.2+rnd()*.6}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));
  const m=new THREE.PointsMaterial({map:glowTex,color:0xffe2b8,size:.32,transparent:true,opacity:.55,depthWrite:false,blending:THREE.AdditiveBlending});
  const d=new THREE.Points(g,m);d.frustumCulled=false;d.userData.sp=sp;scene.add(d);GFX.dust=d;
}
/* Sonnenschein am Himmel (Hoch und Ultra) */
function gfxFlare(k){
  if(!k){if(GFX.flare){scene.remove(GFX.flare);GFX.flare=null}return}
  if(!GFX.flare){
    const g=new THREE.Group();
    const a=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0xfff0d0,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,fog:false}));a.scale.set(150,150,1);g.add(a);
    const b=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0xffffff,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,fog:false}));b.scale.set(36,36,1);g.add(b);
    g.userData={a,b};scene.add(g);GFX.flare=g;
  }
  GFX.flare.userData.k=k;
}

/* Spiegelungen: Umgebungskarte aus dem Himmel der Karte, Boden und Sonne */
function gfxBuildEnv(){
  if(GFX.envTex){GFX.envTex.dispose();GFX.envTex=null}
  const pm=new THREE.PMREMGenerator(renderer),sc=new THREE.Scene();
  sc.add(new THREE.Mesh(new THREE.SphereGeometry(50,32,16),new THREE.MeshBasicMaterial({map:skyMesh.material.map,side:THREE.BackSide})));
  const gm=new THREE.Mesh(new THREE.CircleGeometry(49,32),new THREE.MeshBasicMaterial({color:new THREE.Color(MAP.base).multiplyScalar(.6)}));gm.rotation.x=-Math.PI/2;gm.position.y=-3;sc.add(gm);
  const sm=new THREE.Mesh(new THREE.SphereGeometry(5,12,8),new THREE.MeshBasicMaterial({color:new THREE.Color(7,6.2,5)}));sm.position.set(26,30,14);sc.add(sm);
  const rt=pm.fromScene(sc,.03);pm.dispose();
  sc.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose()});
  GFX.envTex=rt.texture;GFX.envMap=MAP;
}
function gfxEnvOn(on){
  if(on){if(!GFX.envTex||GFX.envMap!==MAP)gfxBuildEnv();scene.environment=GFX.envTex}
  else scene.environment=null;
  GFX.envT=0;
}
function gfxEnvIntensity(){
  const k=GFX.P?GFX.P.env*(.25+.75*(typeof env!=='undefined'?env.day:1)):1;
  scene.traverse(o=>{const m=o.material;if(!m)return;if(Array.isArray(m)){for(const x of m)if(x.isMeshStandardMaterial)x.envMapIntensity=k}else if(m.isMeshStandardMaterial)m.envMapIntensity=k});
}
function gfxPixelRatio(){
  const dpr=window.devicePixelRatio||1,base=Math.min(dpr,isPC?2:1.5);
  const want=GFX.P&&GFX.P.ss&&isPC?Math.min(2.25,Math.max(base,GFX.P.ss)):base;
  if(Math.abs(renderer.getPixelRatio()-want)>.01){renderer.setPixelRatio(want);resize()}
}
function gfxShadow(){
  const P=GFX.P;const ms=P?(isPC?P.shadowPC:P.shadowMob):(isPC?2048:1024);
  if(sun.shadow.mapSize.x!==ms){sun.shadow.mapSize.set(ms,ms);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null}}
}
function gfxApply(lv,store){
  lv=lv===2||lv===3?lv:1;GFX.lv=lv;if(store)ls.set(GFX_KEY,String(lv));
  const P=GFX.P=lv>1?GFX_PRESET[lv]:null;
  GFX.pm=P?P.pm:1;
  if(P){
    if(!gfxBuildComposer(P)){GFX.P=null;GFX.lv=1;GFX.pm=1}
    else{const u=GFX.fin.uniforms;u.uExp.value=P.exp;u.uSat.value=P.sat;u.uCon.value=P.con;u.uVig.value=P.vig;u.uGrain.value=P.grain;u.uCA.value=P.ca;gfxResize()}
  }else gfxDisposeComposer();
  gfxPixelRatio();gfxShadow();gfxGroundBump();gfxEnvOn(!!GFX.P);if(GFX.P)gfxEnvIntensity();for(const m of _bumpMats)gfxHullBump(m);
  gfxFlashPool(GFX.P?GFX.P.flash:0);gfxDust(GFX.P&&GFX.P.dust);gfxFlare(GFX.P?GFX.P.flare:0);
  gfxUI();
}
function gfxUI(){
  document.querySelectorAll('.gfxseg button').forEach(b=>b.classList.toggle('on',+b.dataset.l===GFX.lv));
}
document.querySelectorAll('.gfxseg button').forEach(b=>b.onclick=()=>{
  const l=+b.dataset.l;if(l===GFX.lv)return;gfxApply(l,true);
  if(typeof toast==='function')toast('Grafik: '+GFX_NAMES[l]+(l===3?' · braucht einen starken Rechner':''));
});

const _gv=new THREE.Vector3();
function gfxRender(dt){
  if(!GFX.composer){renderer.render(scene,camera);return}
  GFX.t+=dt;
  if(ground.material.map!==ground.material.bumpMap)gfxGroundBump();
  if(GFX.envMap!==MAP)gfxEnvOn(true);
  GFX.envT-=dt;if(GFX.envT<=0){GFX.envT=1;gfxEnvIntensity()}
  // Explosionslichter verblassen
  for(const l of GFX.flashL){if(l.userData.v>0){l.userData.v=Math.max(0,l.userData.v-dt*22);l.intensity=l.userData.v}}
  // Staub treibt langsam mit dem Wind
  if(GFX.dust){const a=GFX.dust.geometry.attributes.position,p=a.array,sp=GFX.dust.userData.sp;
    for(let i=0;i<sp.length;i++){const o=i*3;p[o]+=sp[i]*dt*.8;p[o+1]+=Math.sin(GFX.t*.6+i)*dt*.12;p[o+2]+=sp[i]*dt*.3;if(p[o]>55)p[o]=-55;if(p[o+2]>60)p[o+2]=-60}
    a.needsUpdate=true;GFX.dust.material.opacity=.35+.3*(typeof env!=='undefined'?env.day:1)}
  // Sonne am Himmel in Richtung der Lichtquelle
  if(GFX.flare){const f=GFX.flare;_gv.copy(sun.position).normalize();f.position.copy(camera.position).addScaledVector(_gv,420);
    const day=typeof env!=='undefined'?Math.max(0,Math.min(1,(sun.position.y-14)/40)):1;
    f.userData.a.material.opacity=.32*f.userData.k*day;f.userData.b.material.opacity=.9*f.userData.k*day;
    f.userData.a.material.color.copy(sun.color);f.visible=day>.02}
  GFX.fin.uniforms.uTime.value=GFX.t;
  // Nebel und Hintergrund werden in three.js r128 nach der sRGB-Umrechnung gemischt.
  // Hier rendern wir linear, also die Farben vorher passend umrechnen.
  const fc=scene.fog&&scene.fog.color,bg=scene.background&&scene.background.isColor?scene.background:null;
  if(fc){_fogSave.copy(fc);fc.convertSRGBToLinear()}
  const hi=hemi.intensity;hemi.intensity=hi*GFX.P.hemi;
  if(bg){_bgSave.copy(bg);bg.convertSRGBToLinear()}
  try{GFX.composer.render(dt)}finally{if(fc)fc.copy(_fogSave);if(bg)bg.copy(_bgSave);hemi.intensity=hi}
}
const _fogSave=new THREE.Color(),_bgSave=new THREE.Color();
gfxMat(hullMat,hullMatBig);
