'use strict';
/* =========================================================
   Orbitalbrigade – Spiellogik, Menüs und Steuerung
   ========================================================= */
const UP=new THREE.Vector3(0,1,0);
const detectedPC=matchMedia('(pointer: fine)').matches;
let isPC=detectedPC;
const DEV_KEY='orbitalbrigade-device';

/* ---------- Zustand ---------- */
let phase='menu',halted=false,run=null,tutState=null;
const play=()=>phase==='fight'||phase==='tut';
let enemies=[],queue=[],waveT=0,structs=[],soldiers=[],pods=[],jets=[],later=[],cols=[];
let shake=0,domeHit=0,orbT=0,hold=null,autoT=0,bossE=null,soldierSeq=0;
const mouse={p:null};
const tmp=new THREE.Vector3(),tmp2=new THREE.Vector3(),tmp3=new THREE.Vector3(),camLook=new THREE.Vector3();
let cmdBuffT=0;
const laser={on:0,p:new THREE.Vector3()};
const act={luft:null,barrage:null};
const R=(id,k)=>val(id,k,run);
/* Mehrspieler (Logik in ob-mp.js) */
let MP=null,enemySeq=0,structSeq=0;
const FS0={get turrets(){return turrets},ship};let FS=FS0;
const mpHp=()=>MP?1.75:1,mpCount=()=>MP?1.3:1;
const actR={luft:null,barrage:null},laser2={on:0,p:new THREE.Vector3()};
const beam2=beam.clone(),laserHit2=laserHit.clone();beam2.visible=laserHit2.visible=false;scene.add(beam2,laserHit2);

const hpM=w=>1+0.22*(w-1)+0.004*(w-1)*(w-1);
const dmgM=w=>1+0.05*(w-1);
const rewM=w=>1+0.05*(w-1);
const xpNeed=l=>Math.round(30+l*16+l*l*1.5);
const dist2D=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const jit=s=>new THREE.Vector3((rnd()-.5)*s,0,(rnd()-.5)*s);
const clampField=p=>{const d=fieldDims();p.x=Math.max(-d.X,Math.min(d.X,p.x));p.z=Math.max(d.ZB,Math.min(d.ZF,p.z));return p};
function lanes(){const d=fieldDims();return[{x:-d.X*.9,z:d.ZF+1,j:3*FIELD_K},{x:0,z:d.ZF+5,j:6*FIELD_K},{x:d.X*.9,z:d.ZF+1,j:3*FIELD_K}]}
const laneOf=x=>x<-8*FIELD_K?0:x>8*FIELD_K?2:1;
const fieldTargetK=w=>Math.min(2,1+.15*Math.floor((w-1)/5));
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=rnd()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a}
function lerpAngle(a,b,k){let d=b-a;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;return a+d*k}
function wait(t,fn){later.push({t,fn,cos:COSMETIC})}

/* ---------- Oberfläche: Helfer ---------- */
const OVERLAYS=['ovMP','ovDevice','ovMenu','ovRebirth','ovReset','ovKeys','ovStartSel','ovMeta','ovRun','ovLevel','ovPause','ovOver'];
function showOv(id){OVERLAYS.forEach(o=>$(o).hidden=o!==id)}
let toastT=0;
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),1600)}
function banner(html){const b=$('banner');b.innerHTML=html;b.classList.remove('show');void b.offsetWidth;b.classList.add('show')}
function flash(op,col){const f=$('flash');f.style.background=col||'var(--cyan)';f.style.transition='none';f.style.opacity=reduceMotion?Math.min(op,.15):op;requestAnimationFrame(()=>{f.style.transition='opacity .6s';f.style.opacity=0})}
function el(tag,cls,html){const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e}
const fmt=n=>Math.floor(n).toLocaleString('de-DE');

/* ---------- Ton ---------- */
document.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&!b.classList.contains('buy'))SFX.click()},true);
function updMuteBtn(){
  const v=SFX.volume,m=v===0;
  $('bMute').classList.toggle('on',!m);$('bMute').setAttribute('aria-label','Lautstärke: '+(m?'aus':v+' %'));
  $('muteOff').style.display=m?'':'none';$('muteOn').style.display=m?'none':'';
  $('volRange').value=v;$('volMenu').value=v;$('volVal').textContent=$('volMenuVal').textContent=m?'Aus':v+' %';
}
function setVol(v){SFX.unlock();SFX.setVolume(v);updMuteBtn()}
function toggleMute(){SFX.setMuted(!SFX.muted);updMuteBtn()}
$('bMute').onclick=()=>{$('volPop').hidden=!$('volPop').hidden};
$('volRange').addEventListener('input',e=>setVol(+e.target.value));
$('volMenu').addEventListener('input',e=>setVol(+e.target.value));
function updMusic(){const v=SFX.musicVolume;$('musRange').value=$('musMenu').value=v;$('musVal').textContent=$('musMenuVal').textContent=v?v+' %':'Aus'}
function setMus(v){SFX.unlock();SFX.setMusicVolume(v);updMusic()}
$('musRange').addEventListener('input',e=>setMus(+e.target.value));$('musMenu').addEventListener('input',e=>setMus(+e.target.value));updMusic();
document.addEventListener('pointerdown',e=>{if(!$('volPop').hidden&&!e.target.closest('#volPop')&&!e.target.closest('#bMute'))$('volPop').hidden=true});
updMuteBtn();

/* ---------- Vollbild ---------- */
function toggleFull(){
  const d=document,el=d.documentElement;
  if(d.fullscreenElement||d.webkitFullscreenElement){(d.exitFullscreen||d.webkitExitFullscreen).call(d);return}
  const req=el.requestFullscreen||el.webkitRequestFullscreen;
  if(!req){toast('Vollbild wird hier nicht unterstützt');return}
  try{const r=req.call(el);if(r&&r.catch)r.catch(()=>toast('Vollbild wird hier nicht unterstützt'))}catch(e){toast('Vollbild wird hier nicht unterstützt')}
}
function updFullBtn(){const on=!!(document.fullscreenElement||document.webkitFullscreenElement);$('bFull').setAttribute('aria-label',on?'Vollbild beenden':'Vollbild');$('bFullMenu').textContent=on?'Vollbild beenden':'Vollbild';$('bFull').classList.toggle('on',on)}
$('bFull').onclick=toggleFull;$('bFullMenu').onclick=toggleFull;
document.addEventListener('fullscreenchange',()=>{updFullBtn();resize()});document.addEventListener('webkitfullscreenchange',()=>{updFullBtn();resize()});

/* ---------- Gerät ---------- */
function applyDevice(dev,store){
  isPC=dev==='pc';if(store)ls.set(DEV_KEY,dev);
  document.body.classList.toggle('pc',isPC);document.body.classList.toggle('touch',!isPC);
  document.querySelectorAll('.pc-only').forEach(e=>e.hidden=!isPC);
  $('devName').textContent=isPC?'PC':'Handy';
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,isPC?2:1.5));
  const ms=isPC?2048:1024;
  if(sun.shadow.mapSize.x!==ms){sun.shadow.mapSize.set(ms,ms);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null}}
  if(!isPC)mouse.p=null;
  resize();
  if(run)buildSlots();
}
$('dPC').onclick=()=>{applyDevice('pc',true);toMenu()};
$('dMobile').onclick=()=>{applyDevice('mobile',true);toMenu()};
$('dPC').classList.toggle('sug',detectedPC);$('sugPC').hidden=!detectedPC;
$('dMobile').classList.toggle('sug',!detectedPC);$('sugMobile').hidden=detectedPC;

/* =========================================================
   Gegner
   ========================================================= */
function buildWave(w){
  const bossW=w%5===0;
  const q=[];let t=.8;const n=Math.min(Math.round((8+Math.floor(w*2.8))*mpCount()*(bossW?1.45:1)),MP?170:130);const gap=Math.max(.13,1-w*.03)*(bossW?.8:1);
  const pz=Math.min(.1+w*.008,.26);
  for(let i=0;i<n;i++){
    const r=rnd();let type='kraul';
    if(w>=3&&r<pz)type='panzer';
    else if(w>=6&&r<pz+.14)type='spucker';
    else if(w>=2&&r<.62)type='schwarm';
    const sp=spawnPoint(w),x=sp.x;
    if(type==='schwarm'){for(let k=0;k<4;k++)q.push({type,t:t+k*.15,x:x+(rnd()-.5)*2,z:sp.z+(rnd()-.5)*2})}
    else q.push({type,t,x,z:sp.z});
    t+=gap*(.6+rnd()*.8);
  }
  if(bossW){
    // Bosswelle: Brutkönigin mitten in der Horde, dazu Mini-Bosse über die ganze Welle verteilt
    const nb=1+Math.floor(w/25),ne=Math.round((2+Math.floor(w/10))*(MP?1.5:1));
    for(let k=0;k<nb;k++){const ln=lanes()[(k+1)%3];q.push({type:'boss',t:t*.45+k*4,x:ln.x,z:ln.z+3})}
    for(let k=0;k<ne;k++){const ln=lanes()[rnd()*3|0];q.push({type:'elite',t:t*(.15+.8*k/Math.max(1,ne-1)),x:ln.x+(rnd()-.5)*4,z:ln.z+2})}
  }else if(w>=12&&rnd()<.5){const ln=lanes()[rnd()*3|0];q.push({type:'elite',t:t*(.3+rnd()*.5),x:ln.x,z:ln.z+2})}
  if(w%20===0)q.push({type:'titan',t:t+4,x:0,z:44});
  return q.sort((a,b)=>a.t-b.t);
}
function spawnEnemy(type,x,z,easy){
  const T=ET[type],w=run.wave,b=T.nest?makeNest():makeBug(type);
  const fd=fieldDims();b.g.position.set(Math.max(-fd.X-1,Math.min(fd.X+1,x)),0,z);scene.add(b.g);
  const hp=T.hp*(easy?1:hpM(w)*mpHp());
  const fz=run.ev&&run.ev.id==='frenzy'&&!easy?1.35:1;
  const e=Object.assign(b,{type,T,r:T.r,hp,max:hp,sp:T.sp*(.9+rnd()*.2)*(easy?.55:1)*fz,rew:T.rew*(easy?1:rewM(w)),dmg:T.dmg*(easy?1:dmgM(w)),
    ph:rnd()*6.28,fl:0,dead:false,burn:0,burnDps:0,frozen:0,stun:0,atk:1+rnd(),step:rnd()*6});
  e.id=++enemySeq;enemies.push(e);
  if(T.boss&&!bossE)bossE=e;
  if(T.boss&&!easy)SFX.roar(b.g.position);
  return e;
}
function hit(e,d,silent){
  if(e.dead||COSMETIC)return;
  if(e.frozen>0)d*=1.25;
  if(run){d*=run.dmgMul*(cmdBuffT>0?1.3:1);if(run.crit&&rnd()<run.crit)d*=2}
  if(MP&&MP.role==='guest'&&e.id)MP.dmg[e.id]=(MP.dmg[e.id]||0)+d;
  e.hp-=d;if(!silent)e.fl=.08;
  if(e.hp<=0)kill(e);
}
function kill(e){
  e.dead=true;
  const p=e.g.position.clone().setY(.8);
  spark(p,e.T.col,e.T.boss?40:10,e.T.boss?18:9);spark(p,0xfff27a,3,6);
  if(e.T.boss){blast(p,0xff6a3d,e.r*2.6,.7);slowT=1.3}
  SFX.death(p,e.T.boss);
  if(MP&&MP.role==='guest'){e.localDead=performance.now();e.g.visible=false;return}
  if(!run||run.tut)return;
  run.kills++;
  const v=e.rew*run.mult;run.earnBase=(run.earnBase||0)+v;
  run.credits+=v*R('allg','credits')*run.crMul*(run.ev&&run.ev.id==='frenzy'?1.5:1);
  if(e.T.gold){const m=(12+run.wave*.6)*run.mdMul;run.medals+=m;toast('Goldkäfer erlegt: +'+Math.round(m)+' Medaillen');spark(p,0xffd23f,30,12,10)}
  run.xp+=v*R('allg','xp')*run.xpMul;
  run.medals+=v*.12*R('allg','medals')*run.mdMul;
  if(run.cmd&&run.cmd.id==='cmd_nekro'&&!e.T.nest&&rnd()<cmdStat('zchance')+enchSum('zchance'))spawnZombie(e.g.position.clone().setY(0),true);
  while(run.xp>=xpNeed(run.level)){run.xp-=xpNeed(run.level);run.level++;run.pending++}
}
function applyBurn(e,dps,dur){if(dps<=0||COSMETIC)return;e.burn=Math.max(e.burn,dur);e.burnDps=Math.max(e.burnDps,dps)}
function boom(pos,r,dmg,o={}){
  SFX.boom(r,pos);
  if(MP&&MP.role==='host'&&!COSMETIC&&r>=1.5&&MP.fxAdd)MP.fxAdd(pos.x,pos.z,r,o.col||0xff9a3d);
  for(const e of enemies){
    if(e.dead)continue;
    if(dist2D(e.g.position,pos)<r+e.r*.8){hit(e,dmg);if(o.fire)applyBurn(e,o.fire,3);if(o.stun)e.stun=Math.max(e.stun,o.stun)}
  }
  const at=new THREE.Vector3(pos.x,.5,pos.z);
  blast(at,o.col||0xff9a3d,r,.45);
  if(r>1.6)blast(new THREE.Vector3(pos.x,.12,pos.z),o.col2||0xffd23f,r*1.25,.55,true);
  spark(at,o.col||0xffb04a,Math.min(26,6+(r*4|0)),r*4,8);
  if(r>2.4)shake=reduceMotion?0:Math.max(shake,Math.min(.8,r*.12));
}
function hitNear(p,r,d){
  let best=null,bd=1e9;
  for(const e of enemies){if(e.dead)continue;const dd=dist2D(e.g.position,p);if(dd<r+e.r&&dd<bd){bd=dd;best=e}}
  if(best){hit(best,d);SFX.hit(p)}
}
function visible(e){return !e.dead&&e.onScreen&&!e.pull}
const frustum=new THREE.Frustum(),projM=new THREE.Matrix4(),_vp=new THREE.Vector3();
function updateOnScreen(){
  camera.updateMatrixWorld();projM.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(projM);
  for(const e of enemies){_vp.set(e.g.position.x,1,e.g.position.z);e.onScreen=frustum.containsPoint(_vp)}
}
function frontEnemy(){let b=null,bd=1e9;for(const e of enemies){if(!visible(e))continue;const d=dist2D(e.g.position,BASE);if(d<bd){bd=d;b=e}}return b}
function nearestEnemy(p,maxD){let b=null,bd=maxD;for(const e of enemies){if(!visible(e))continue;const d=dist2D(e.g.position,p)-e.r*.5;if(d<bd){bd=d;b=e}}return b}
function lead(e,time){
  tmp2.set(BASE.x-e.g.position.x,0,BASE.z-e.g.position.z).normalize().multiplyScalar(e.frozen>0||e.stun>0?0:e.sp*time);
  return e.g.position.clone().add(tmp2).setY(.5);
}
function densest(range,from,rad){
  let best=null,bc=-1;const list=enemies.filter(e=>visible(e)&&(!from||dist2D(e.g.position,from)<range));
  const sample=list.length>30?shuffle(list.slice()).slice(0,30):list;
  for(const e of sample){let c=0;for(const o of list)if(dist2D(o.g.position,e.g.position)<rad)c++;if(c>bc){bc=c;best=e}}
  return best;
}
function damageBase(d){
  if(!run||run.tut)return;
  run.hp-=d*(1-R('basis','armor'))*(1-run.dr);SFX.baseHit();domeHit=1;shake=reduceMotion?0:Math.max(shake,Math.min(1.2,.3+d*.015));
  if(run.hp<=0){run.hp=0;endRun(true)}
}
function buildColliders(){
  cols.length=0;
  for(const so of soldiers)if(!so.dead&&!so.emerge)cols.push({x:so.g.position.x,z:so.g.position.z,r:.55,ref:so,unit:true});
  for(const m of mechs)if(!m.dead&&!m.emerge)cols.push({x:m.g.position.x,z:m.g.position.z,r:1.4,ref:m,unit:true});
  for(const u of marines)if(!u.dead&&!u.emerge)cols.push({x:u.g.position.x,z:u.g.position.z,r:.95,ref:u,unit:true,mar:true});
  for(const r of rovers)if(!r.dead&&!r.emerge)cols.push({x:r.g.position.x,z:r.g.position.z,r:.9,ref:r,unit:true});
  for(const z of zombies)if(!z.dead&&!(z.rise>0))cols.push({x:z.g.position.x,z:z.g.position.z,r:.55,ref:z,unit:true});
  const cc=run&&run.cmd;
  if(cc&&!cc.dead&&cc.ant){if(cc.state==='body')cols.push({x:cc.bodyPos.x,z:cc.bodyPos.z,r:1.3*cc.bs,ref:cc,unit:true})}
  else if(cc&&!cc.dead&&!cc.jet&&!(cc.inv>0))cols.push({x:cc.g.position.x,z:cc.g.position.z,r:.9,ref:cc,unit:true});
  for(const s of structs)if(s.active&&s.hp>0)for(const c of s.cols)cols.push({x:c.x,z:c.z,r:c.r,ref:s});
}
function rangedAttack(e,dt){
  if(!e.onScreen)return false;
  const p=e.g.position;let tg=null,td=13,kind=null;
  const db=dist2D(p,BASE)-BASE_R;if(db<td){td=db;tg=BASE;kind='base'}
  for(const c of cols){const d=dist2D(p,c)-c.r;if(d<td){td=d;tg=c;kind='col'}}
  if(!tg)return false;
  e.g.rotation.y=Math.atan2(tg.x-p.x,tg.z-p.z);
  e.atk-=dt;
  if(e.atk<=0){
    e.atk=2.4;const ref=kind==='col'?tg.ref:null,dmg=e.dmg;SFX.spit(p);
    const to=kind==='base'?BASE.clone().setY(2):new THREE.Vector3(tg.x,.8,tg.z);
    shoot({from:p.clone().setY(1.6),to,dur:.8,arc:3,geo:'ball',mat:'acid',scale:.8,trail:.5,trailCol:0x9be35a,onHit:q=>{
      spark(q,0x9be35a,6,5,4);
      if(kind==='base')damageBase(dmg);else if(ref&&ref.hp>0)ref.hp-=dmg*(1-run.dr)*(1-(ref.block||0));
    }});
  }
  return true;
}
/* ---------- Brutlöcher: entstehen auf großen Feldern, spawnen Gegner, solange die Welle läuft ---------- */
function nestTick(e,dt){
  const s=1+Math.sin(waveT*3+e.ph)*.15;e.glow.scale.set(6*s,6*s,1);
  if(phase!=='fight'||!queue.length)return;
  e.spawnT=(e.spawnT??(1+rnd()*2))-dt;
  if(e.spawnT>0||enemies.length>=(MP?100:80))return;
  e.spawnT=Math.max(2.2,6-run.wave*.04)*(.8+rnd()*.4);
  const n=1+(rnd()<.4?1:0);
  for(let i=0;i<n;i++){const type=run.wave>=15&&rnd()<.15?'panzer':rnd()<.5?'schwarm':'kraul';const a=rnd()*6.28;
    const ne=spawnEnemy(type,e.g.position.x+Math.cos(a)*3.4,e.g.position.z+Math.sin(a)*3.4);ne.g.position.y=-1.2;ne.rise=.5}
  spark(e.g.position.clone().setY(.6),0x6a3a2a,8,6,6);
}
function ensureNests(){
  const want=Math.max(0,Math.min(5,Math.floor((fieldTargetK(run.wave)-1)/.15+.001)-1));
  let have=enemies.filter(e=>e.T.nest&&!e.dead).length;const d=fieldDims();
  for(let tries=0;have<want&&tries<40;tries++){
    const x=(rnd()-.5)*1.6*d.X,z=d.ZF*.45+rnd()*(d.ZF*.5);
    if(enemies.some(e=>e.T.nest&&Math.hypot(e.g.position.x-x,e.g.position.z-z)<9))continue;
    const n=spawnEnemy('nest',x,z);n.g.scale.setScalar(.01);n.grow=0;have++;
    spark(n.g.position.clone().setY(.5),0x6a3a2a,20,10,8);
  }
  if(want>0&&have)banner('WELLE '+run.wave+'<small>Brutlöcher auf dem Feld</small>');
}
function updateEnemies(dt){
  buildColliders();
  for(const e of enemies){
    if(e.dead)continue;
    const p=e.g.position;
    if(e.rise>0){e.rise-=dt;p.y=Math.min(0,p.y+dt*2.6);if(e.rise<=0)p.y=0}
    if(e.grow!=null&&e.grow<1){e.grow=Math.min(1,e.grow+dt*.8);e.g.scale.setScalar(Math.max(.01,e.grow))}
    if(e.burn>0){e.burn-=dt;hit(e,e.burnDps*dt,true);if(rnd()<dt*8)spark(p.clone().setY(1),0xff7a2a,1,2,4);if(e.dead)continue}
    let still=false;
    if(e.frozen>0){e.frozen-=dt;still=true}
    if(e.stun>0){e.stun-=dt;still=true}
    e.fl=Math.max(0,e.fl-dt);
    e.mat.emissive.setHex(e.fl>0?0x664444:e.frozen>0?0x1a4a6a:e.burn>0?0x3a1400:0);
    if(e.T.nest){nestTick(e,dt);continue}
    if(e.pull)continue;
    if(e.slowT>0)e.slowT-=dt;
    if(still)continue;
    if(e.T.gold){goldTick(e,dt);continue}
    const esp=e.sp*(e.slowT>0?.45:1);
    tmp.set(BASE.x-p.x,0,BASE.z-p.z);const dist=tmp.length();tmp.normalize();
    let blk=null;
    for(const c of cols){if(Math.hypot(c.x-p.x,c.z-p.z)<c.r+e.r*.9){blk=c;break}}
    let moving=false;
    if(blk){
      blk.ref.hp-=e.dmg*1.2*dt*(1-run.dr)*(1-(blk.ref.block||0));
      e.g.rotation.y=Math.atan2(blk.x-p.x,blk.z-p.z);
      e.inner.position.z=Math.max(0,Math.sin(waveT*10+e.ph))*.25;
    }else if(e.T.ranged&&!run.tut&&rangedAttack(e,dt)){
      e.inner.position.z=0;
    }else{
      // Soldaten und Mechs in der Nähe werden angegriffen statt umlaufen
      let aim=null;
      if(dist>BASE_R+8){let bd=8+e.r*1.5;for(const c of cols){if(!c.unit)continue;const d=Math.hypot(c.x-p.x,c.z-p.z)-c.r-(c.mar?4:0);if(d<bd){bd=d;aim=c}}}
      if(aim){
        tmp2.set(aim.x-p.x,0,aim.z-p.z).normalize();
        p.x+=tmp2.x*esp*dt;p.z+=tmp2.z*esp*dt;e.g.rotation.y=Math.atan2(tmp2.x,tmp2.z);
      }else{
        const side=Math.sin(e.ph+waveT*1.5)*.5;
        p.x+=(tmp.x+tmp.z*side)*esp*dt;p.z+=(tmp.z-tmp.x*side)*esp*dt;
        e.g.rotation.y=Math.atan2(tmp.x,tmp.z);
      }
      moving=true;e.inner.position.z=0;
    }
    if(moving){e.step+=dt*e.sp*2.2;animLegs(e);e.inner.position.y=Math.abs(Math.sin(e.step))*.08}
    if(run.tut&&dist<BASE_R+e.r+3){p.set((rnd()-.5)*16,0,28);continue}
    if(dist<BASE_R+e.r){
      e.dead=true;spark(p.clone().setY(1),0x5fd0ff,14,12);
      damageBase(e.dmg);
      if(!play())return;
    }
  }
  enemies=enemies.filter(e=>{if(!e.dead)return true;scene.remove(e.g);e.mat.dispose();return false});
}

/* =========================================================
   Schiffswaffen
   ========================================================= */
function turretTip(v){const T=FS.turrets;(T[0]||T[T.length-1]).tip.getWorldPosition(v);return v}
function heatPerShot(id){const it=ITEMS[id];return it.base.heat*it.base.cool/R(id,'cool')}
function canFire(id){return !run.over[id]&&(run.wcd[id]||0)<=0&&(id!=='kanone'||run.tut||run.ammo>=1)}
function fireWeapon(id,tp){
  if(id==='kanone'&&!run.tut)run.ammo=Math.max(0,run.ammo-1);
  run.wcd[id]=1/R(id,'rate');
  run.heat[id]=(run.heat[id]||0)+heatPerShot(id);
  if(run.heat[id]>=100){run.heat[id]=100;run.over[id]=true;SFX.overheat();if(id===run.sel&&hold)toast(ITEMS[id].name+' überhitzt')}
  aimAll(tp);
  W_FIRE[id](tp);SFX.weapon(id,tp);
}
const cylGeo=new THREE.CylinderGeometry(1,1,1,8,1,true);
function beamLine(a,b,col,w,dur){
  const m=new THREE.Mesh(cylGeo,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}));
  m.position.lerpVectors(a,b,.5);m.lookAt(b);m.rotateX(Math.PI/2);m.scale.set(w,a.distanceTo(b),w);fadeMesh(m,dur);
}
function distToSeg(p,a,b){
  const abx=b.x-a.x,abz=b.z-a.z,apx=p.x-a.x,apz=p.z-a.z;const l=abx*abx+abz*abz;
  const t=l?Math.max(0,Math.min(1,(apx*abx+apz*abz)/l)):0;return Math.hypot(apx-abx*t,apz-abz*t);
}
const W_FIRE={
  kanone(tp){
    const d=R('kanone','dmg'),a=R('kanone','aoe');
    for(const t of FS.turrets){t.tip.getWorldPosition(tmp);const to=tp.clone().add(jit(.6));
      shoot({from:tmp,to,dur:tmp.distanceTo(to)/110,onHit:p=>{hitNear(p,a,d);spark(p,0xffd23f,2,4,3)}})}
  },
  gatling(tp){
    const TT=FS.turrets;FS.gi=((FS.gi||0)+1)%TT.length;TT[FS.gi].tip.getWorldPosition(tmp);
    const to=tp.clone().add(jit(2.4)),d=R('gatling','dmg'),c=R('gatling','crit'),a=R('gatling','aoe');
    shoot({from:tmp,to,dur:tmp.distanceTo(to)/150,onHit:p=>{hitNear(p,a,rnd()<c?d*2:d);if(rnd()<.35)spark(p,0xffd23f,1,4,3)}});
  },
  raketen(tp){
    const n=Math.round(R('raketen','count')),d=R('raketen','dmg'),a=R('raketen','aoe'),f=R('raketen','fire');
    const cands=enemies.filter(e=>visible(e)&&dist2D(e.g.position,tp)<7);
    for(let i=0;i<n;i++){
      FS.ship.localToWorld(tmp.set((i-(n-1)/2)*1.2,1.6,-5));
      const tg=cands.length?cands[i%cands.length]:null;const to=tg?tg.g.position.clone().setY(.4):tp.clone().add(jit(2.5));
      shoot({from:tmp,to,dur:1+i*.07,arc:9,geo:'rocket',mat:'rocket',track:tg,trail:.9,onHit:p=>boom(p,a,d,{fire:f})});
    }
  },
  granat(tp){
    const d=R('granat','dmg'),a=R('granat','aoe'),cl=Math.round(R('granat','cluster'));turretTip(tmp);
    shoot({from:tmp,to:tp.clone().add(jit(.6)),dur:.9,arc:7,geo:'ball',mat:'grenade',onHit:p=>{
      boom(p,a,d,{col:0xffa43d});
      for(let i=0;i<cl;i++){const q=p.clone().add(jit(a*1.8));wait(.12+rnd()*.3,()=>boom(q,a*.45,d*.4))}
    }});
  },
  haubitze(tp){
    const d=R('haubitze','dmg'),a=R('haubitze','aoe');turretTip(tmp);
    shoot({from:tmp,to:tp,dur:.35,geo:'shell',mat:'shell',trail:.8,onHit:p=>{boom(p,a,d,{col:0xffc06a});shake=reduceMotion?0:Math.max(shake,.7)}});
  },
  plasma(tp){
    const d=R('plasma','dmg'),a=R('plasma','aoe'),pd=R('plasma','pool'),f=R('plasma','fire');turretTip(tmp);
    shoot({from:tmp,to:tp.clone().add(jit(.4)),dur:.6,arc:3,geo:'ball',mat:'plasma',scale:1.3,trail:.6,trailCol:0xff5fd2,onHit:p=>{
      boom(p,a*.7,d,{col:0xff5fd2,col2:0xff9ae6});addZone(p.x,p.z,a,f,pd,0xff4fc8);
    }});
  },
  railgun(tp){
    turretTip(tmp);const from=tmp.clone(),d=R('railgun','dmg'),L=R('railgun','len');
    const dir=new THREE.Vector3(tp.x-from.x,0,tp.z-from.z).normalize();
    const a=new THREE.Vector3(tp.x,.6,tp.z),a0=a.clone().addScaledVector(dir,-3),b=a.clone().addScaledVector(dir,L);
    for(const e of enemies)if(!e.dead&&distToSeg(e.g.position,a0,b)<1.3+e.r*.6)hit(e,d);
    beamLine(from,a,0x9ff3ff,.18,.25);beamLine(a0,b,0x9ff3ff,.3,.3);
    for(let i=0;i<8;i++)spark(a0.clone().lerp(b,i/7),0x9ff3ff,1,3,3);
  },
};

/* =========================================================
   Fähigkeiten
   ========================================================= */
const A_USE={
  orbital(){
    orbT=.8;flash(.55);shake=reduceMotion?0:1.4;
    blast(new THREE.Vector3(0,.3,4),0xcff4ff,34,.9,true);
    const d=R('orbital','dmg'),s=R('orbital','stun');
    for(const e of enemies)if(visible(e)){spark(e.g.position.clone().setY(1),0xcff4ff,4,8);if(s>0)e.stun=Math.max(e.stun,s);hit(e,d)}
  },
  laser(){const f=frontEnemy();laser.on=R('laser','dur');laser.p.copy(f?f.g.position:new THREE.Vector3(0,0,10)).setY(0)},
  luft(){act.luft={t:R('luft','dur'),next:0}},
  barrage(){act.barrage={t:R('barrage','dur'),next:0}},
  kryo(){
    const d=R('kryo','dur');flash(.35);blast(new THREE.Vector3(0,.3,4),0x9fe8ff,32,.8,true);
    for(const e of enemies)if(visible(e)){e.frozen=Math.max(e.frozen,d);spark(e.g.position.clone().setY(1),0xbfeeff,3,4,4)}
  },
  rakete(){if(guided)return false;startGuided()},
  napalm(){
    const f=frontEnemy();if(!f){toast('Keine Gegner in Sicht');return false}
    const z=Math.max(-28,Math.min(fieldDims().ZF-4,lead(f,1.2).z)),dps=R('napalm','dps'),dur=R('napalm','dur');
    const j=makeJet();j.position.set(-70,10,z);j.rotation.y=Math.PI/2;scene.add(j);SFX.jet(1);jets.push({g:j,cos:COSMETIC,z,sp:90,dmg:0,napalm:true});
    for(let x=-20;x<=20;x+=5){const xx=x+(rnd()-.5),zz=z+(rnd()-.5)*1.5;wait(.75+(x+15)/90,()=>{addZone(xx,zz,3.1,dps,dur);spark(new THREE.Vector3(xx,.5,zz),0xff7a2a,8,6,6)})}
  },
};
function powerOut(){if(run&&run.blackout>0){SFX.deny();toast('Stromausfall! Noch '+Math.ceil(run.blackout)+' s');return true}return false}
function useAbility(id,auto){
  if(!run||!play()||halted||!M.unlocked[id])return false;
  if(auto?run.blackout>0:powerOut())return false;
  if(run.cd[id]>0){if(!auto){SFX.deny();toast(ITEMS[id].name+': noch '+Math.ceil(run.cd[id])+' s')}return false}
  if(A_USE[id]()===false){if(!auto)SFX.deny();return false}
  SFX.ability(id);
  if(MP)MP.ab[id]=(MP.ab[id]||0)+1;
  run.cd[id]=R(id,'cd')*run.cdMul;
  if(tutState)tutState.used[id]=true;
  return true;
}
function updateAbilities(dt,t){
  if(laser.on>0){
    laser.on-=dt;
    const tg=frontEnemy();if(tg)laser.p.lerp(tmp.copy(tg.g.position).setY(0),Math.min(1,dt*5));
    ship.localToWorld(tmp.set(0,-1.8,9));
    beam.position.lerpVectors(tmp,laser.p,.5);beam.lookAt(laser.p);beam.rotateX(Math.PI/2);
    beam.scale.set(1,tmp.distanceTo(laser.p),1);beamGlow.scale.x=beamGlow.scale.z=1+Math.sin(t*40)*.15;
    beam.visible=laserHit.visible=true;SFX.laser(true);laserHit.position.copy(laser.p).setY(.6);
    const d=R('laser','dps')*dt,f=R('laser','fire');
    for(const e of enemies)if(!e.dead&&dist2D(e.g.position,laser.p)<e.r+1.4){hit(e,d,true);if(f>0)applyBurn(e,f,2)}
    if(rnd()<.5)spark(laser.p.clone().setY(.3),0x5fd0ff,1,6,5);
  }else{beam.visible=laserHit.visible=false;SFX.laser(false)}
  if(laser2.on>0){
    laser2.on-=dt;
    const tg=frontEnemy();if(tg)laser2.p.lerp(tmp.copy(tg.g.position).setY(0),Math.min(1,dt*5));
    ship2.localToWorld(tmp.set(0,-1.8,9));
    beam2.position.lerpVectors(tmp,laser2.p,.5);beam2.lookAt(laser2.p);beam2.rotateX(Math.PI/2);
    beam2.scale.set(1,tmp.distanceTo(laser2.p),1);beam2.visible=laserHit2.visible=true;laserHit2.position.copy(laser2.p).setY(.6);
  }else beam2.visible=laserHit2.visible=false;
  for(const [A,cos] of [[act,false],[actR,true]]){
  COSMETIC=cos;
  if(A.luft){
    const a=A.luft;a.t-=dt;a.next-=dt;
    if(a.next<=0&&a.t>0){
      // Sturzflug: Ziel ist die dichteste sichtbare Gegnergruppe
      const e=densest(999,null,5);
      if(!e)a.next=.4;
      else{
        a.next=1.6;
        const tp=lead(e,1.2).setY(0),side=(rnd()-.5)*24;
        const p0=new THREE.Vector3(tp.x+side,58,tp.z-75),p1=new THREE.Vector3(tp.x+side*.15,-30,tp.z-10),p2=new THREE.Vector3(tp.x-side*.4,40,tp.z+48);
        const j=makeJet();j.position.copy(p0);scene.add(j);
        SFX.jet2(tp,2.6);
        jets.push({g:j,cos:COSMETIC,dive:true,p0,p1,p2,t:0,dur:2.6,tp,tg:e,fire:0,fired:false,dmg:R('luft','dmg')});
      }
    }
    if(a.t<=0)A.luft=null;
  }
  if(A.barrage){
    const a=A.barrage;a.t-=dt;a.next-=dt;
    if(a.next<=0&&a.t>0){a.next=.35;const tg=enemies.filter(visible);const e=tg.length?tg[rnd()*tg.length|0]:null;
      const to=e?lead(e,.7).setY(0):new THREE.Vector3((rnd()-.5)*1.6*fieldDims().X,0,-24+rnd()*(fieldDims().ZF+20));
      const d=R('barrage','dmg');SFX.whistle(to);shoot({from:new THREE.Vector3(to.x+(rnd()-.5)*10,90,to.z-20),to,dur:.7,geo:'shell',mat:'shell',trail:.6,onHit:p=>boom(p,3,d)})}
    if(a.t<=0)A.barrage=null;
  }
  }
  COSMETIC=false;
  for(const j of jets){
    COSMETIC=!!j.cos;
    if(j.dive){
      j.t+=dt;const k=Math.min(1,j.t/j.dur);
      const bez=(u,o)=>{const a1=(1-u)*(1-u),b1=2*(1-u)*u,c1=u*u;return o.set(j.p0.x*a1+j.p1.x*b1+j.p2.x*c1,j.p0.y*a1+j.p1.y*b1+j.p2.y*c1,j.p0.z*a1+j.p1.z*b1+j.p2.z*c1)};
      bez(k,j.g.position);bez(Math.min(1,k+.02),tmp2);j.g.lookAt(tmp2);
      // Feuerfenster im Sturzflug: MG-Salven auf Gegner im Zielbereich
      if(k>.24&&k<.56){
        if(!j.fired){j.fired=true;SFX.mg(j.tp,.75)}
        j.fire-=dt;
        if(j.fire<=0){
          j.fire=.055;
          if(j.tg&&j.tg.dead)j.tg=nearestEnemy(j.tp,9);
          const e=(j.tg&&!j.tg.dead&&rnd()<.6)?j.tg:nearestEnemy(j.tp,9);
          j.g.localToWorld(tmp.set((rnd()<.5?-1:1)*1.6,0,1.5));
          if(e){const q=e.g.position.clone().setY(.6).add(jit(.8));tracer(tmp.clone(),q,0xffe27a,1.3);hit(e,j.dmg);spark(q,rnd()<.5?0xffd23f:0xb08060,2,4,3)}
          else{const q=j.tp.clone().add(jit(6)).setY(.2);tracer(tmp.clone(),q,0xffe27a,1.3);spark(q,0xb08060,1,3,3)}
        }
      }
      if(k>=1)j.done=1;
      continue;
    }
    const x0=j.g.position.x;j.g.position.x+=j.sp*dt;const x1=j.g.position.x;
    if(!j.napalm&&Math.abs(x1)<20){
      const lo=Math.min(x0,x1)-.8,hi=Math.max(x0,x1)+.8;
      for(const e of enemies)if(!e.dead&&e.g.position.x>=lo&&e.g.position.x<=hi&&Math.abs(e.g.position.z-j.z)<2.6){hit(e,j.dmg);spark(e.g.position.clone().setY(1),0xffd23f,2,4,3)}
      if(rnd()<.6){tmp.set(x1+(rnd()-.5)*2,.2,j.z+(rnd()-.5)*3);tracer(j.g.position.clone(),tmp.clone());spark(tmp,0xb08060,1,3,3)}
    }
    if(Math.abs(x1)>85)j.done=1;
  }
  COSMETIC=false;
  jets=jets.filter(j=>{if(!j.done)return true;scene.remove(j.g);return false});
}

/* =========================================================
   Unterstützung: Gebäude, Drop-Pods, Soldaten
   ========================================================= */
function addStruct(type,g,p,o={}){
  g.position.copy(p);scene.add(g);
  const s=Object.assign({id:o.id||++structSeq,type,g,x:p.x,z:p.z,hp:o.hp||1,max:o.hp||1,cd:0,t:0,active:true,barY:3,own:0,st:{}},o);
  s.bar=o.hp?makeBar(o.barW||2.4):null;if(s.bar)s.bar.visible=false;
  s.cols=(o.colsLocal||[]).map(c=>{tmp.set(c.x,0,c.z).applyAxisAngle(UP,g.rotation.y);return{x:p.x+tmp.x,z:p.z+tmp.z,r:c.r}});
  if(o.drop){s.active=false;s.drop=0;g.position.y=40}
  structs.push(s);return s;
}
function removeStruct(s){scene.remove(s.g);if(s.bar)scene.remove(s.bar);if(s.mines)s.mines.forEach(m=>scene.remove(m.g));if(s.diggers)s.diggers.forEach(d=>{scene.remove(d.g);if(d.grab&&!d.grab.dead){d.grab.pull=null;d.grab.g.position.y=0}})}
const myOwn=()=>MP&&MP.role==='guest'?1:0;
function aliveSoldiers(own=myOwn()){return soldiers.filter(s=>!s.dead&&(s.own||0)===own).length}
function squadComp(n){
  const out=[],add=(c,k)=>{for(let i=0;i<k&&out.length<n;i++)out.push(c)};
  add('flamer',Math.round(R('soldat','flamer')));add('rpg',Math.round(R('soldat','rpg')));add('sniper',Math.round(R('soldat','sniper')));
  while(out.length<n)out.push('rifle');return out;
}
// Ein Paket mit allen Werten, die eine Unterstützung braucht. So nutzt jede Unterstützung die
// Upgrades des Spielers, der sie platziert hat, auch wenn der Host sie simuliert.
function soldierPack(){return{hp:R('soldat','hp'),dmg:R('soldat','dmg'),sp:R('soldat','speed'),g:Math.round(R('soldat','grenade'))}}
function statPack(id){
  switch(id){
    case 'trupp':{const free=Math.round(R('soldat','troops'))-aliveSoldiers(),n=Math.min(Math.round(R('trupp','count')),free);return{comp:n>0?squadComp(n):[],s:soldierPack()}}
    case 'wall':return{hp:R('wall','hp'),regen:R('wall','regen')};
    case 'rover':return{n:Math.max(0,Math.min(Math.round(R('rover','count')),ROVER_MAX-rovers.length-shuttles.filter(s=>s.kind==='rover').reduce((a,s)=>a+s.n-s.dropped,0))),dmg:R('rover','dmg'),aoe:R('rover','aoe'),speed:R('rover','speed')};
    case 'marine':return{n:Math.max(0,Math.min(Math.round(R('marine','count')),MAR_MAX-marines.length)),count:Math.round(R('marine','count')),hp:R('marine','hp'),dmg:R('marine','dmg'),shield:R('marine','shield')};
    case 'minen':return{dmg:R('minen','dmg'),count:Math.round(R('minen','count'))};
    case 'graeber':return{count:Math.round(R('graeber','count')),grabs:Math.round(R('graeber','grabs')),reload:R('graeber','reload'),grip:Math.round(R('graeber','grip'))};
    case 'sentry':return{hp:R('sentry','hp'),dmg:R('sentry','dmg'),rate:R('sentry','rate'),range:R('sentry','range')};
    case 'moerser':return{hp:R('moerser','hp'),dmg:R('moerser','dmg'),rate:R('moerser','rate'),aoe:R('moerser','aoe')};
    case 'mech':return{n:Math.max(0,Math.min(Math.round(R('mech','count')),MECH_MAX-aliveMechs(myOwn()))),m:mechPack()};
    case 'kaserne':return{hp:R('kaserne','hp'),recruit:R('kaserne','recruit'),cap:Math.round(R('kaserne','cap')),troops:Math.round(R('soldat','troops')),s:soldierPack()};
  }
  return{};
}
function seeded(seed){let a=seed*2654435761>>>0;return()=>{a=a+0x6D2B79F5>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function minePositions(id,p,n){const r=seeded(id),out=[];for(let i=0;i<n;i++){const a=r()*6.28,d=Math.sqrt(r())*4;out.push([p.x+Math.cos(a)*d,p.z+Math.sin(a)*d])}return out}
function placeMines(s,p,n,mask){
  s.mines=[];minePositions(s.id,p,n).forEach(([x,z],i)=>{if(mask!=null&&!(mask&(1<<i)))return;const g=makeMine();g.position.set(x,0,z);scene.add(g);s.mines.push({g,x,z,ph:i*1.7,i})});
}
const S_PLACE={
  trupp(p,st,own){
    if(!st.comp.length){toast('Truppenlimit erreicht');return false}
    const g=makePod(),from=(own?ship2:ship).localToWorld(new THREE.Vector3(0,-2,0));
    g.position.copy(from);g.quaternion.setFromUnitVectors(UP,from.clone().sub(p).normalize());scene.add(g);
    SFX.podFall(p);pods.push({id:++structSeq,g,from,to:p.clone().setY(0),t:0,dur:1,landed:false,life:0,comp:st.comp,st:st.s,own,open:0});
  },
  wall(p,st,own){
    const g=makeWall();g.rotation.y=Math.atan2(BASE.x-p.x,BASE.z-p.z);
    addStruct('wall',g,p,{own,st,hp:st.hp,barW:4,barY:2.6,drop:true,colsLocal:[{x:-2.4,z:0,r:1.25},{x:0,z:0,r:1.25},{x:2.4,z:0,r:1.25}]});
  },
  minen(p,st,own){
    const s=addStruct('minen',new THREE.Group(),p,{own,st});placeMines(s,p,st.count);
    spark(p.clone().setY(.4),0x9a6a4a,10,8,5);
  },
  sentry(p,st,own){const g=makeSentry();g.rotation.y=Math.atan2(-p.x,30-p.z);addStruct('sentry',g,p,{own,st,hp:st.hp,barY:2.6,drop:true,colsLocal:[{x:0,z:0,r:1.1}]})},
  moerser(p,st,own){addStruct('moerser',makeMoerser(),p,{own,st,hp:st.hp,barY:2.4,drop:true,colsLocal:[{x:0,z:0,r:1.5}]})},
  mech(p,st,own){
    if(!st.n){toast('Mech-Limit erreicht');return false}
    const from=(own?ship2:ship).localToWorld(new THREE.Vector3(0,-2,0)),g=makeShuttle();g.position.copy(from);scene.add(g);
    shuttles.push({id:++structSeq,g,own,st:st.m,n:st.n,phase:'in',t:0,from,to:p.clone().setY(0),dropped:0});SFX.jet2(p,2.6);
  },
  graeber(p,st,own){
    const s=addStruct('graeber',new THREE.Group(),p,{own,st});s.diggers=[];const r=seeded(s.id);
    for(let i=0;i<st.count;i++){const a=r()*6.28,d=st.count>1?1+Math.sqrt(r())*2.2:0,x=p.x+Math.cos(a)*d,z=p.z+Math.sin(a)*d;
      const g=makeGraeber();g.position.set(x,0,z);g.rotation.y=(r()-.5)*.8;g.scale.setScalar(.01);scene.add(g);
      s.diggers.push({g,x,z,uses:st.grabs,cd:0,dig:.9+i*.18,grab:null,gt:0,heavy:false})}
    SFX.dig(p);spark(p.clone().setY(.4),0x6a4a30,16,8,6);
  },
  rover(p,st,own){
    if(!st.n){toast('Rover-Limit erreicht');return false}
    const from=(own?ship2:ship).localToWorld(new THREE.Vector3(0,-2,0)),g=makeShuttle();g.position.copy(from);scene.add(g);
    shuttles.push({id:++structSeq,g,own,st,n:st.n,phase:'in',t:0,from,to:p.clone().setY(0),dropped:0,kind:'rover'});SFX.jet2(p,2.6);
  },
  marine(p,st,own){
    if(!st.n){toast('Marine-Limit erreicht');return false}
    const g=makePod(),from=(own?ship2:ship).localToWorld(new THREE.Vector3(0,-2,0));
    g.position.copy(from);g.quaternion.setFromUnitVectors(UP,from.clone().sub(p).normalize());scene.add(g);
    SFX.podFall(p);pods.push({id:++structSeq,g,from,to:p.clone().setY(0),t:0,dur:1,landed:false,life:0,comp:Array(st.n).fill('marine'),mar:st,own,open:0});
  },
  kaserne(p,st,own){const g=makeKaserne();g.rotation.y=Math.atan2(-p.x,34-p.z);addStruct('kaserne',g,p,{own,st,hp:st.hp,barW:3.4,barY:4.4,drop:true,t:3,colsLocal:[{x:-1,z:0,r:1.6},{x:1,z:0,r:1.6}]})},
};
const GHOST_R={rover:3,marine:3,graeber:3.4,cmdmove:1.2,mech:3,trupp:3,wall:3.6,minen:4,sentry:1.4,moerser:1.6,kaserne:2.4};
function trySupport(id,p){
  if(!run||!play()||halted||!M.unlocked[id])return false;
  if(powerOut())return false;
  if(run.cd[id]>0){SFX.deny();toast(ITEMS[id].name+': noch '+Math.ceil(run.cd[id])+' s');return false}
  p=clampField(p.clone());p.y=0;
  if(dist2D(p,BASE)<BASE_R+2.4){toast('Zu nah am Generator');return false}
  const st=statPack(id);
  if(id==='trupp'&&!st.comp.length){SFX.deny();toast('Truppenlimit erreicht');return false}
  if(id==='mech'&&!st.n){SFX.deny();toast('Mech-Limit erreicht');return false}
  if((id==='rover'||id==='marine')&&!st.n){SFX.deny();toast(id==='rover'?'Rover-Limit erreicht':'Marine-Limit erreicht');return false}
  if(MP&&MP.role==='guest')mpRequestPlace(id,p,st);
  else if(S_PLACE[id](p,st,0)===false){SFX.deny();return false}
  SFX.place();
  run.cd[id]=R(id,'cd')*run.cdMul;
  if(tutState)tutState.used[id]=true;
  return true;
}
/* ---------- Mechs ---------- */
let mechs=[],shuttles=[];
const MECH_MAX=6;
function mechPack(){const w={};MECH_W.forEach(k=>w[k]=Math.round(R('mechunit',k)));return{hp:R('mechunit','hp'),dmg:R('mechunit','dmg'),sp:R('mechunit','speed'),slots:Math.round(R('mechunit','slots')),w}}
function mechList(st){const w=st.w||{};return MECH_W.filter(k=>w[k]>0).sort((a,b)=>w[b]-w[a]).slice(0,st.slots||2)}
function aliveMechs(own){return mechs.filter(m=>!m.dead&&(m.own||0)===own).length+shuttles.filter(s=>s.kind!=='rover'&&(s.own||0)===own&&s.phase!=='out').reduce((a,s)=>a+(s.n-s.dropped||0),0)}
function spawnMech(pos,st,own,emerge){
  const g=makeMech();g.position.copy(pos);scene.add(g);setMechWeapons(g,mechList(st));
  const m={id:++structSeq,g,st,own:own||0,hp:st.hp,max:st.hp,cd:.5,wcd:{},face:0,walk:0,dead:false,emerge:emerge||null};
  mechs.push(m);return m;
}
function refreshMyMechs(){const pk=mechPack();for(const m of mechs)if((m.own||0)===myOwn()&&!m.rep)applyMechPack(m,pk)}
function applyMechPack(m,pk){const r=m.hp/m.max;m.st=pk;m.max=pk.hp;m.hp=Math.max(1,r*pk.hp);setMechWeapons(m.g,mechList(pk))}
function updateShuttles(dt){
  for(const s of shuttles){
    s.t+=dt;const g=s.g;
    if(s.phase==='in'){
      const k=Math.min(1,s.t/2.4),e=1-(1-k)*(1-k),hx=s.to.x,hz=s.to.z+1;
      g.position.set(s.from.x+(hx-s.from.x)*e,s.from.y+(1.9-s.from.y)*e,s.from.z+(hz-s.from.z)*e);
      g.rotation.y=Math.atan2(hx-s.from.x,hz-s.from.z);
      if(g.position.y<10&&rnd()<.6)spark(new THREE.Vector3(hx+(rnd()-.5)*6,.2,hz+(rnd()-.5)*6),0x9a6a4a,1,4,2);
      if(k>=1){s.phase='land';s.t=0;SFX.thump(g.position);spark(g.position.clone().setY(.3),0x9a6a4a,14,10,4)}
    }else if(s.phase==='land'){
      g.userData.ramp.rotation.x=Math.min(1,s.t/.5)*.75;
      while(s.dropped<s.n&&s.t>.6+s.dropped*.8){
        const from=g.localToWorld(new THREE.Vector3(0,-.6,-4.2)),to=g.localToWorld(new THREE.Vector3((s.dropped%2?1:-1)*1.6,0,-8));to.y=0;from.y=Math.max(0,from.y-.6);
        clampField(to);if(s.kind==='rover')spawnRover(from,s.st,{t:0,dur:.7,from,to});else spawnMech(from,s.st,s.own,{t:0,dur:1,from,to});s.dropped++;
      }
      if(s.t>.6+s.n*.8+.9){s.phase='out';s.t=0;s.from2=g.position.clone();SFX.jet2(g.position,2.4)}
    }else{
      const k=Math.min(1,s.t/2.2);g.userData.ramp.rotation.x=.75*(1-Math.min(1,s.t*2));
      g.position.set(s.from2.x,s.from2.y+k*k*70,s.from2.z-k*k*60);
      if(k>=1)s.done=1;
    }
  }
  shuttles=shuttles.filter(s=>{if(!s.done)return true;scene.remove(s.g);return false});
}
function updateMechs(dt,t){
  const vis=enemies.filter(visible);
  mechs.forEach((m,i)=>{
    if(m.dead)return;const p=m.g.position,ud=m.g.userData;
    if(m.emerge){const em=m.emerge;em.t+=dt;const k=Math.min(1,em.t/em.dur);p.lerpVectors(em.from,em.to,k);p.y=em.from.y*(1-k);
      m.g.rotation.y=Math.atan2(em.to.x-em.from.x,em.to.z-em.from.z);m.walk+=dt*7;ud.legs[0].rotation.x=Math.sin(m.walk)*.5;ud.legs[1].rotation.x=-Math.sin(m.walk)*.5;
      if(k>=1){m.emerge=null;p.y=0}return}
    if(m.hp<=0){m.dead=true;const q=p.clone().setY(2);spark(q,0x8a8f9c,24,12,9);blast(q,0xff9a3d,3,.5);SFX.boom(3,q);return}
    const order=(m.own||0)===myOwn()?run.mechOrder:((MP&&MP.peerMechOrder)||'auto');
    let goal=null;
    if(order==='attack'){const a=nearestIn(p,vis);if(a&&dist2D(p,a.g.position)>10)goal=a.g.position}
    else if(order==='hold')goal=patrolPos(20+i,t);
    else if(order==='retreat')goal=slotPos(18+i);
    else{const a=nearestEnemy(p,30);if(a){if(dist2D(p,a.g.position)>14)goal=a.g.position}else goal=fieldPos(i+2,-4)}
    let moving=false;
    if(goal){const dx=goal.x-p.x,dz=goal.z-p.z,d=Math.hypot(dx,dz);if(d>1){const st=Math.min(d,m.st.sp*dt);p.x+=dx/d*st;p.z+=dz/d*st;moving=true;m.face=Math.atan2(dx,dz)}}
    for(const o of mechs){if(o===m||o.dead)continue;const dx=p.x-o.g.position.x,dz=p.z-o.g.position.z,d=Math.hypot(dx,dz);if(d<2.6&&d>.001){p.x+=dx/d*(2.6-d)*.5;p.z+=dz/d*(2.6-d)*.5}}
    const db=dist2D(p,BASE);if(db<BASE_R+2){p.x=BASE.x+(p.x-BASE.x)/db*(BASE_R+2);p.z=BASE.z+(p.z-BASE.z)/db*(BASE_R+2)}
    clampField(p);
    if(moving){m.walk+=dt*m.st.sp*2;ud.legs[0].rotation.x=Math.sin(m.walk)*.5;ud.legs[1].rotation.x=-Math.sin(m.walk)*.5;ud.body.position.y=Math.abs(Math.sin(m.walk))*.06}
    else{ud.legs[0].rotation.x*=.9;ud.legs[1].rotation.x*=.9}
    const tg=nearestEnemy(p,18);
    if(tg){
      m.face=Math.atan2(tg.g.position.x-p.x,tg.g.position.z-p.z);
      m.cd-=dt;if(m.cd<=0){m.cd=.11;ud.tip.getWorldPosition(tmp);tracer(tmp.clone(),tg.g.position.clone().setY(.8+rnd()*.4),0xffe27a,1.5);hit(tg,m.st.dmg*auraMul(p));if(rnd()<.5)SFX.sentry(p)}
    }
    for(const k of mechList(m.st)){
      const L=m.st.w[k],mult=1+.35*(L-1),tip=ud.wtips&&ud.wtips[k];if(!tip)continue;
      m.wcd[k]=(m.wcd[k]||0)-dt;tip.getWorldPosition(tmp2);const from=tmp2.clone();
      if(k==='mrak'&&m.wcd[k]<=0){const e=densest(24,p,3);if(e&&dist2D(p,e.g.position)<24){m.wcd[k]=2.4;SFX.soldier('rpg',p);
        for(let r=0;r<2;r++)shoot({from,to:e.g.position.clone().add(jit(1.5)).setY(.3),dur:.7+r*.1,arc:4,geo:'rocket',mat:'rocket',scale:.7,trail:.9,onHit:q=>boom(q,3,40*mult)})}}
      else if(k==='mgren'&&m.wcd[k]<=0&&tg&&dist2D(p,tg.g.position)<16){m.wcd[k]=1.7;
        shoot({from,to:tg.g.position.clone().setY(.3),dur:.9,arc:5,geo:'ball',mat:'grenade',scale:.8,onHit:q=>boom(q,3.2,38*mult,{col:0xffa43d})})}
      else if(k==='mflam'&&m.wcd[k]<=0){const e=nearestEnemy(p,7.5);if(e){m.wcd[k]=.12;SFX.soldier('flamer',p);
        for(const en of enemies){if(en.dead)continue;const dx=en.g.position.x-p.x,dz=en.g.position.z-p.z,d=Math.hypot(dx,dz);
          if(d<7.5+en.r*.5&&Math.abs(lerpAngle(0,Math.atan2(dx,dz)-m.g.rotation.y,1))<.6){hit(en,40*.12*mult,true);applyBurn(en,12*mult,2)}}
        for(let q=0;q<3;q++){const kk=1+rnd()*6.5,s2=(rnd()-.5)*.8;spark(new THREE.Vector3(p.x+Math.sin(m.g.rotation.y+s2)*kk,1.4,p.z+Math.cos(m.g.rotation.y+s2)*kk),rnd()<.5?0xff7a2a:0xffd23f,1,1.5,2)}}}
      else if(k==='mlaser'&&tg){tracer(from,tg.g.position.clone().setY(.9),0x9ff3ff,2.4);hit(tg,55*mult*dt,true);if(rnd()<.3)spark(tg.g.position.clone().setY(1),0x9ff3ff,1,3,3)}
    }
    m.g.rotation.y=lerpAngle(m.g.rotation.y,m.face,Math.min(1,dt*5));
  });
  mechs=mechs.filter(m=>{if(!m.dead)return true;scene.remove(m.g);return false});
}
/* =========================================================
   Kommandanten und Zombies
   ========================================================= */
let zombies=[];
const cmdStat=k=>run&&run.cmd?val(run.cmd.id,k,run):0;
function spawnCommander(){
  const id=M.cmdSel;if(!id||!M.cmdOwned[id]||!run||run.tut)return;
  const m=makeCommander(id);
  const c={id,g:m.g,body:m.body,gun:m.gun,jet:!!m.jet,ant:!!m.ant,mesh:m.mesh,eyes:m.eyes,hp:1,max:1,dead:false,respawn:0,acd:0,inv:0,soldT:2,sumT:2,turT:4,ang:0,walk:0,face:0,goal:null,center:new THREE.Vector3(),pk:''};
  c.bar=c.jet?null:makeBar(c.ant?3.4:2.4);if(c.bar)c.bar.visible=false;
  run.cmd=c;scene.add(c.g);placeCommander(c);run.cd.cmd=0;
}
function placeCommander(c){
  c.dead=false;c.max=c.hp=c.jet?1:cmdStat('hp');c.goal=null;c.inv=0;
  if(c.ant){c.center.set(BASE.x+(rnd()-.5)*4,0,BASE.z+BASE_R+5);c.anchor=antAnchor();c.state='swarm';c.st=0;c.flood=0;c.sw=-1;c.hitDone=false;c.armA=.25;c.walk=0;c.bodyPos=c.center.clone();c.face=0;c.bs=1.15;c.tgt=null;antsInit(c);c.g.visible=true}
  else if(c.jet){c.center.set(0,0,(fieldDims().ZF+BASE.z)/2);c.g.position.set(0,18,c.center.z);pilotPods(c)}
  else c.g.position.set(BASE.x+(rnd()-.5)*4,0,BASE.z+BASE_R+4);
  if(!c.g.parent)scene.add(c.g);
}
function pilotPods(c){
  const key=['prak','pbomb','plaser'].map(k=>Math.round(cmdStat(k))>0?1:0).join('');if(key===c.pk)return;c.pk=key;
  const pods=c.g.userData.pods;pods.clear();
  if(key[0]==='1'){box(.5,.4,1.4,redMat,-2.6,-.3,.2,pods);box(.5,.4,1.4,redMat,2.6,-.3,.2,pods)}
  if(key[1]==='1'){const b=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,1.6,8),darkMat);b.rotation.x=Math.PI/2;b.position.set(0,-.6,0);pods.add(b)}
  if(key[2]==='1')box(.35,.35,1.2,cyanMat,0,-.55,1.8,pods);
}
function setCmdGoal(p){
  const c=run&&run.cmd;if(!c||c.dead)return;
  const q=clampField(p.clone());q.y=0;c.goal=q;
  ghost.position.set(q.x,.07,q.z);blast(new THREE.Vector3(q.x,.1,q.z),0xffd23f,1.6,.5,true);SFX.place();
}
function auraMul(p){const c=run&&run.cmd;if(!c||c.dead||c.id!=='cmd_kom')return 1;return dist2D(c.g.position,p)<12?1+cmdStat('aura'):1}
function useCmdAbility(){
  const c=run&&run.cmd;if(!c||!play()||halted)return;
  if(c.dead){SFX.deny();toast(ITEMS[c.id].name+' ist gefallen');return}
  if(powerOut())return;
  if(run.cd.cmd>0){SFX.deny();toast(ITEMS[c.id].abil+': noch '+Math.ceil(run.cd.cmd)+' s');return}
  const p=cmdPos(c);
  if(c.id==='cmd_kom'){
    if(MP&&MP.role==='guest')mpRequest('rally');
    cmdBuffT=8;for(const u of soldiers.concat(mechs,zombies))if(!u.dead)u.hp=Math.min(u.max,u.hp+u.max*.4);c.hp=Math.min(c.max,c.hp+c.max*.4);
    blast(p.clone().setY(.2),0xffd23f,16,.8,true);flash(.25,'var(--yellow)');
  }else if(c.id==='cmd_sniper'){
    c.inv=6;const mst={dmg:cmdStat('dmg')*.5,count:Math.round(cmdStat('mines'))};if(MP&&MP.role==='guest')mpRequestPlace('minen',p.clone().setY(0),mst);else S_PLACE.minen(p.clone().setY(0),mst,0);blast(p.clone().setY(1),0x5fd0ff,3,.5);
  }else if(c.id==='cmd_nekro'){
    for(let i=0;i<6;i++)spawnZombie(p.clone().add(jit(8)).setY(0),false,true);
    boom(p.clone().setY(0),8,cmdStat('dmg')*4,{col:0x8bff6a,col2:0x5a8a3a});
  }else if(c.id==='cmd_pilot'){
    const e=densest(999,null,6),z=e?e.g.position.z:c.center.z,X=fieldDims().X,d=cmdStat('dmg')*6;
    for(let i=0;i<9;i++){const x=-X+i*(2*X/8),q=new THREE.Vector3(x,0,z+(rnd()-.5)*3);
      wait(.15+i*.12,()=>{SFX.whistle(q,.5);shoot({from:c.g.position.clone(),to:q,dur:.5,geo:'shell',mat:'shell',onHit:pp=>boom(pp,4,d)})})}
  }else if(c.id==='cmd_ameise'){
    if(c.state==='body'||c.state==='form')antScatter(c,1.5);
    c.state='flood';c.st=0;c.flood=6;c.floodP=p.clone().setY(0);blast(c.floodP.clone().setY(.1),0x8a5a3a,9,.7,true);SFX.ants(p);
  }else if(c.id==='cmd_ing'){
    if(MP&&MP.role==='guest')mpRequest('rep');
    const mx=R('basis','maxhp');run.hp=Math.min(mx,run.hp+mx*.25);for(const s of structs)if(s.hp>0&&s.max>1)s.hp=Math.min(s.max,s.hp+s.max*.5);
    blast(BASE.clone().setY(.3),0x7cf0a8,10,.8,true);domeHit=1;
  }
  SFX.ability('kryo');run.cd.cmd=ITEMS[c.id].base.cd>0?cmdStat('cd')*run.cdMul:0;
}
function spawnZombie(p,fromKill,force){
  const cap=Math.round(cmdStat('zmax'))*(fromKill||force?1.5:1);
  if(zombies.filter(z=>!z.dead).length>=cap)return;
  const z=makeZombie();z.g.position.copy(p);z.g.position.y=-1.4;scene.add(z.g);
  const hp=cmdStat('zhp');zombies.push(Object.assign(z,{hp,max:hp,dmg:cmdStat('zdmg'),dead:false,walk:rnd()*6,rise:.6}));
  spark(p.clone().setY(.4),0x8bff6a,10,5,5);
}
function updateZombies(dt){
  const vis=enemies.filter(visible);
  for(const z of zombies){
    if(z.dead)continue;const p=z.g.position;
    if(z.rise>0){z.rise-=dt;p.y=Math.min(0,p.y+dt*2.4);continue}
    if(z.hp<=0){z.dead=true;spark(p.clone().setY(.8),0x6f8a5a,10,6);continue}
    const e=nearestIn(p,vis);if(!e){z.body.position.y=0;continue}
    const dx=e.g.position.x-p.x,dz=e.g.position.z-p.z,d=Math.hypot(dx,dz);
    z.g.rotation.y=Math.atan2(dx,dz);
    if(d>e.r+.9){const st=Math.min(d,5.5*dt);p.x+=dx/d*st;p.z+=dz/d*st;z.walk+=dt*10;z.body.position.y=Math.abs(Math.sin(z.walk))*.08}
    else{hit(e,z.dmg*dt*auraMul(p),true);e.fl=.05;if(rnd()<dt*5)spark(e.g.position.clone().setY(.9),0x8bff6a,1,3,3)}
    for(const o of zombies){if(o===z||o.dead)continue;const ox=p.x-o.g.position.x,oz=p.z-o.g.position.z,od=Math.hypot(ox,oz);if(od<1.1&&od>.001){p.x+=ox/od*(1.1-od)*.5;p.z+=oz/od*(1.1-od)*.5}}
    clampField(p);
  }
  zombies=zombies.filter(z=>{if(!z.dead)return true;scene.remove(z.g);return false});
}
function updateCommander(dt,t){
  const c=run.cmd;cmdBuffT=Math.max(0,cmdBuffT-dt);if(!c)return;
  if(c.ant){updateAnts(c,dt,t);return}
  if(c.dead){c.respawn-=dt;if(c.respawn<=0){placeCommander(c);toast(ITEMS[c.id].name+' ist zurück')}return}
  if(c.jet){updatePilot(c,dt,t);return}
  const p=c.g.position;
  if(c.hp<=0){c.dead=true;c.respawn=25;scene.remove(c.g);if(c.bar)c.bar.visible=false;spark(p.clone().setY(1.5),0x8a8f9c,20,9,8);blast(p.clone().setY(1),0xff9a3d,2.5,.5);toast(ITEMS[c.id].name+' ist gefallen und kommt in 25 s zurück');return}
  c.inv=Math.max(0,c.inv-dt);c.g.visible=c.inv>0?Math.sin(t*25)>-.2:true;
  let moving=false;
  if(c.goal){const dx=c.goal.x-p.x,dz=c.goal.z-p.z,d=Math.hypot(dx,dz);if(d>.6){const st=Math.min(d,4.8*dt);p.x+=dx/d*st;p.z+=dz/d*st;moving=true;c.face=Math.atan2(dx,dz)}else c.goal=null}
  const db=dist2D(p,BASE);if(db<BASE_R+1.5){p.x=BASE.x+(p.x-BASE.x)/db*(BASE_R+1.5);p.z=BASE.z+(p.z-BASE.z)/db*(BASE_R+1.5)}
  clampField(p);
  if(moving){c.walk+=dt*12;c.body.position.y=Math.abs(Math.sin(c.walk))*.08}else c.body.position.y=0;
  c.acd-=dt;const dmg=cmdStat('dmg');
  if(c.id==='cmd_sniper'){
    const range=cmdStat('range');let best=null,bs=-1;
    for(const e of enemies){if(!visible(e)||dist2D(p,e.g.position)>range)continue;const sc=(e.T.boss?1e6:e.T.elite||e.T.nest?1e5:0)+e.hp;if(sc>bs){bs=sc;best=e}}
    if(best){c.face=Math.atan2(best.g.position.x-p.x,best.g.position.z-p.z);
      if(c.acd<=0){c.acd=cmdStat('reload');c.gun.getWorldPosition(tmp);tracer(tmp.clone(),best.g.position.clone().setY(1),0x9ff3ff,3);hit(best,dmg);spark(best.g.position.clone().setY(1),0x9ff3ff,8,6,5);SFX.soldier('sniper',p)}}
  }else{
    const e=nearestEnemy(p,c.id==='cmd_ing'?14:16);
    if(e){c.face=Math.atan2(e.g.position.x-p.x,e.g.position.z-p.z);
      if(c.acd<=0){c.acd=c.id==='cmd_nekro'?.5:c.id==='cmd_ing'?.3:.22;c.gun.getWorldPosition(tmp);
        tracer(tmp.clone(),e.g.position.clone().setY(.9),c.id==='cmd_nekro'?0x8bff6a:c.id==='cmd_ing'?0xff9a3d:0xffe27a,1.6);hit(e,dmg);if(rnd()<.4)SFX.soldier('rifle',p)}}
  }
  const gst=MP&&MP.role==='guest';
  if(c.id==='cmd_kom'){if(gst){}else{
    c.soldT-=dt;const mine=soldiers.filter(s=>!s.dead&&s.own===2).length;
    if(c.soldT<=0&&mine<Math.round(cmdStat('squad')+enchSum('squad'))){c.soldT=cmdStat('spawn');
      const q=p.clone().add(jit(3)).setY(0);spawnSoldier('rifle',q,{t:0,dur:.5,from:q.clone().setY(1.5),to:clampField(q.clone())},null,soldierPack(),2);blast(q.clone().setY(.1),0xffd23f,1.4,.4,true)}
  }}else if(c.id==='cmd_nekro'){
    c.sumT-=dt;if(c.sumT<=0){c.sumT=cmdStat('summon');spawnZombie(p.clone().add(jit(4)).setY(0))}
  }else if(c.id==='cmd_ing'&&!gst){
    const rp=cmdStat('repair');
    for(const s of structs)if(s.hp>0&&s.max>1&&dist2D(s.g.position,p)<10&&s.hp<s.max){s.hp=Math.min(s.max,s.hp+rp*dt);if(rnd()<dt*4)spark(s.g.position.clone().setY(1.5),0x7cf0a8,1,2,3)}
    if(dist2D(p,BASE)<14){const mx=R('basis','maxhp');if(run.hp<mx){run.hp=Math.min(mx,run.hp+rp*.5*dt);if(rnd()<dt*4)spark(BASE.clone().setY(2),0x7cf0a8,1,2,3)}}
    c.turT-=dt;const tur=structs.filter(s=>s.ing&&s.hp>0).length;
    if(c.turT<=0&&tur<Math.round(cmdStat('turrets'))){c.turT=12;const q=clampField(p.clone().add(jit(4)).setY(0));
      if(dist2D(q,BASE)>BASE_R+2.4){S_PLACE.sentry(q,{hp:160+run.wave*8,dmg:8+run.wave*.8,rate:3,range:15},0);const st=structs[structs.length-1];st.ing=true;st.g.scale.setScalar(.75)}}
  }
  c.g.rotation.y=lerpAngle(c.g.rotation.y,c.face,Math.min(1,dt*8));
  if(c.bar){c.bar.visible=c.hp<c.max;if(c.bar.visible){c.bar.position.set(p.x,4.6,p.z);c.bar.quaternion.copy(camera.quaternion);c.bar.userData.fg.scale.x=Math.max(0,c.hp/c.max)}}
}
function updatePilot(c,dt,t){
  pilotPods(c);
  if(c.goal){c.center.lerp(c.goal,Math.min(1,dt*.8));if(dist2D(c.center,c.goal)<.5)c.goal=null}
  c.ang+=dt*.55*cmdStat('speed');
  const K=FIELD_K,np=tmp3.set(c.center.x+Math.cos(c.ang)*14*K,16+Math.sin(c.ang*2)*2,c.center.z+Math.sin(c.ang)*9);
  c.g.lookAt(np);c.g.position.copy(np);
  const e=nearestEnemy(c.center,24*K);c.acd-=dt;
  if(e&&c.acd<=0){c.acd=.08;c.g.localToWorld(tmp.set((rnd()<.5?-1:1)*1.2,0,1.5));tracer(tmp.clone(),e.g.position.clone().setY(.7).add(jit(.8)),0xffe27a,1.4);hit(e,cmdStat('dmg'));if(rnd()<.3)SFX.sentry(e.g.position)}
  c.w=c.w||{};const L=k=>Math.round(cmdStat(k));
  for(const k of ['prak','pbomb'])c.w[k]=(c.w[k]||0)-dt;
  if(L('prak')>0&&c.w.prak<=0){const tg=densest(26*K,c.center,3);if(tg){c.w.prak=3;const m=1+.35*(L('prak')-1);SFX.soldier('rpg',c.g.position);
    for(let i=0;i<2;i++)shoot({from:c.g.position.clone(),to:tg.g.position.clone().add(jit(2)).setY(.3),dur:.8+i*.1,arc:2,geo:'rocket',mat:'rocket',scale:.8,trail:.9,onHit:q=>boom(q,3,45*m)})}}
  if(L('pbomb')>0&&c.w.pbomb<=0){const tg=densest(26*K,c.center,4);if(tg){c.w.pbomb=4.5;const m=1+.35*(L('pbomb')-1);SFX.whistle(tg.g.position,.6);
    shoot({from:c.g.position.clone(),to:tg.g.position.clone().setY(0),dur:.7,arc:1,geo:'shell',mat:'shell',scale:1.4,onHit:q=>boom(q,4.5,90*m)})}}
  if(L('plaser')>0&&e){const m=1+.35*(L('plaser')-1);tracer(c.g.position.clone(),e.g.position.clone().setY(.8),0x9ff3ff,2.6);hit(e,55*m*dt,true)}
}

/* ---------- Ameisenlegion: Schwarm, der sich am Gegner zum Riesen mit Keule zusammensetzt ---------- */
const antDummy=new THREE.Object3D();
const antCount=()=>Math.min(ANT_MAX,240+60*Math.round(cmdStat('legion')));
const antAnchor=()=>new THREE.Vector3(BASE.x,0,BASE.z+16*FIELD_K);
function cmdPos(c){return c.ant?(c.state==='body'||c.state==='form'?c.bodyPos:c.state==='flood'?c.floodP:c.center):c.g.position}
function antBodyPoints(n){
  const pts=[],r=rnd,bx=(cx,cy,cz,sx,sy,sz,arm)=>({x:cx+(r()-.5)*sx,y:cy+(r()-.5)*sy,z:cz+(r()-.5)*sz,arm,leg:0});
  const parts=[['legL',.11],['legR',.11],['torso',.28],['head',.08],['armL',.09],['armR',.1],['club',.23]];
  for(const [part,f] of parts){const k=Math.round(n*f);for(let i=0;i<k;i++){let q;
    if(part==='legL'){q=bx(-.5,.85,0,.55,1.7,.55,0);q.leg=-1}
    else if(part==='legR'){q=bx(.5,.85,0,.55,1.7,.55,0);q.leg=1}
    else if(part==='torso')q=bx(0,2.45,0,1.75,1.6,.95,0);
    else if(part==='head'){const a=r()*6.28,b=Math.acos(2*r()-1),rr=.5*Math.cbrt(r());q={x:Math.sin(b)*Math.cos(a)*rr,y:3.65+Math.cos(b)*rr,z:Math.sin(b)*Math.sin(a)*rr,arm:0,leg:0}}
    else if(part==='armL')q=bx(-1.2,2.35,0,.45,1.6,.45,0);
    else if(part==='armR')q=bx(0,-.65,0,.45,1.3,.45,1);
    else{const k2=r();q=bx(0,-1.4-k2*1.5,0,.3+k2*.7,.4,.3+k2*.7,1)}   // Keule, nach unten dicker
    pts.push(q)}}
  while(pts.length<n)pts.push(bx(0,2.45,0,1.75,1.6,.95,0));
  return shuffle(pts).slice(0,n);
}
function antsInit(c,keep,nSet){
  const n=nSet||antCount(),old=keep?(c.n||0):0;
  const ax=new Float32Array(ANT_MAX),az=new Float32Array(ANT_MAX),ay=new Float32Array(ANT_MAX),ah=new Float32Array(ANT_MAX);
  if(keep&&c.ax){ax.set(c.ax);az.set(c.az);ay.set(c.ay);ah.set(c.ah)}
  for(let i=old;i<n;i++){const a=rnd()*6.28,d=Math.sqrt(rnd())*3;ax[i]=c.center.x+Math.cos(a)*d;az[i]=c.center.z+Math.sin(a)*d;ay[i]=.06;ah[i]=rnd()*6.28}
  const f=(fn)=>Float32Array.from({length:n},fn);
  c.ax=ax;c.az=az;c.ay=ay;c.ah=ah;c.n=n;
  c.oa=f(()=>rnd()*6.28);c.or=f(()=>.3+Math.sqrt(rnd())*3.2);c.ow=f(()=>(rnd()-.5)*1.4);c.vs=f(()=>.75+rnd()*.5);c.rx=f(()=>rnd()*6.28);
  c.vx=new Float32Array(n);c.vz=new Float32Array(n);
  c.pts=antBodyPoints(n);c.mesh.count=n;
  c.antS=2.5*Math.pow(240/n,.33);
}
const _ab={x:0,y:0,z:0};
function antBodyPos(c,q){
  const s=c.bs;let x=q.x,y=q.y,z=q.z;
  if(q.arm){const cs=Math.cos(c.armA),sn=Math.sin(c.armA),y2=y*cs-z*sn,z2=y*sn+z*cs;x=1.2+x;y=3+y2;z=z2}
  else if(q.leg)z+=Math.sin(c.walk)*q.leg*.45*(1-y/1.8);
  const cf=Math.cos(c.face),sf=Math.sin(c.face);
  _ab.x=c.bodyPos.x+(x*cf+z*sf)*s;_ab.z=c.bodyPos.z+(-x*sf+z*cf)*s;_ab.y=Math.max(.06,y*s);return _ab;
}
function antScatter(c,pow){
  const o=c.state==='body'||c.state==='form'?c.bodyPos:c.center;
  c.state='scatter';c.st=0;c.center.set(o.x,0,o.z);c.tgt=null;c.sw=-1;c.hitDone=false;
  c.eyes.forEach(e=>e.visible=false);if(c.bar)c.bar.visible=false;
  for(let i=0;i<c.n;i++){const dx=c.ax[i]-o.x,dz=c.az[i]-o.z,d=Math.hypot(dx,dz)||1,v=(2+rnd()*4)*(pow||1);c.vx[i]=dx/d*v;c.vz[i]=dz/d*v;c.ah[i]=Math.atan2(dx,dz)}
}
function antScatterStep(c,dt){
  const damp=1-Math.min(1,dt*3);
  for(let i=0;i<c.n;i++){c.ax[i]+=c.vx[i]*dt;c.az[i]+=c.vz[i]*dt;c.vx[i]*=damp;c.vz[i]*=damp;c.ay[i]=Math.max(.06,c.ay[i]-dt*9)}
}
function antSwarmStep(c,dt,t,cx,cz,R,spd){
  for(let i=0;i<c.n;i++){
    const a=c.oa[i]+t*c.ow[i],rr=c.or[i]*R,tx=cx+Math.cos(a)*rr,tz=cz+Math.sin(a)*rr*.85;
    const dx=tx-c.ax[i],dz=tz-c.az[i],d=Math.hypot(dx,dz);
    if(d>.05){const st=Math.min(d,spd*c.vs[i]*dt);c.ax[i]+=dx/d*st;c.az[i]+=dz/d*st;c.ah[i]=lerpAngle(c.ah[i],Math.atan2(dx,dz),Math.min(1,dt*10))}
    c.ay[i]=Math.max(.06,c.ay[i]-dt*9);
  }
}
function antBodyStep(c,dt,fly){
  const k=Math.min(1,dt*14);
  for(let i=0;i<c.n;i++){
    const q=antBodyPos(c,c.pts[i]);
    if(fly){const dx=q.x-c.ax[i],dy=q.y-c.ay[i],dz=q.z-c.az[i],d=Math.hypot(dx,dy,dz);
      if(d>.02){const st=Math.min(d,17*c.vs[i]*dt);c.ax[i]+=dx/d*st;c.ay[i]+=dy/d*st;c.az[i]+=dz/d*st;if(d>.5)c.ah[i]=Math.atan2(dx,dz)}}
    else{c.ax[i]+=(q.x-c.ax[i])*k;c.ay[i]+=(q.y-c.ay[i])*k;c.az[i]+=(q.z-c.az[i])*k}
  }
}
function drawAnts(c,k){
  const m=c.mesh,s=1.6+(c.antS*c.bs/1.15-1.6)*k;
  for(let i=0;i<c.n;i++){antDummy.position.set(c.ax[i],c.ay[i],c.az[i]);antDummy.rotation.set(c.rx[i]*k,c.ah[i],0);antDummy.scale.setScalar(s);antDummy.updateMatrix();m.setMatrixAt(i,antDummy.matrix)}
  m.instanceMatrix.needsUpdate=true;
}
function antForm(c,e){
  c.state='form';c.st=0;c.tgt=e;c.bodyPos.set(c.center.x,0,c.center.z);
  c.face=Math.atan2(e.g.position.x-c.center.x,e.g.position.z-c.center.z);c.armA=.25;c.sw=-1;c.hitDone=false;c.acd=.15;SFX.ants(c.center);
}
function clubImpact(c,e){
  const q=e.g.position.clone().setY(0),d=cmdStat('dmg')*(1+.1*Math.round(cmdStat('legion'))),a=cmdStat('aoe');
  hit(e,d);for(const o of enemies)if(o!==e&&!o.dead&&dist2D(o.g.position,q)<a+o.r*.6)hit(o,d*.5);
  blast(q.clone().setY(.15),0x8a5a3a,a*1.2,.45,true);spark(q.clone().setY(.4),0x5a4030,14,9,7);SFX.smash(q);
  shake=reduceMotion?0:Math.max(shake,.35);
}
function updateAnts(c,dt,t){
  c.bs=1.15*(1+.08*Math.round(cmdStat('legion')));
  if(c.dead){
    if(c.state==='dying'){c.st+=dt;antScatterStep(c,dt);drawAnts(c,0);if(c.st>1.2){c.state='gone';c.g.visible=false}}
    c.respawn-=dt;if(c.respawn<=0){placeCommander(c);toast(ITEMS[c.id].name+' hat sich neu gesammelt')}
    return;
  }
  if(c.state==='swarm'&&c.n!==antCount())antsInit(c,true);
  c.st+=dt;const spd=cmdStat('speed');
  if(c.state==='body'&&c.hp<=0){
    antScatter(c,2.4);c.state='dying';c.st=0;c.dead=true;c.respawn=20;
    spark(c.center.clone().setY(2),0x3a1c12,24,10,8);toast(ITEMS[c.id].name+' wurde zersprengt und sammelt sich in 20 s neu');return;
  }
  const vis=enemies.filter(visible);
  let k=0;
  if(c.state==='flood'){
    c.flood-=dt;const R=9,fp=c.floodP;
    antSwarmStep(c,dt,t*.6,fp.x,fp.z,R/3.2,13*spd);
    const dps=cmdStat('flood');
    for(const e of enemies)if(!e.dead&&dist2D(e.g.position,fp)<R+e.r*.5){hit(e,dps*dt,true);e.slowT=.3;if(rnd()<dt*3)spark(e.g.position.clone().setY(.6),0x5a3020,2,3,3)}
    if(rnd()<dt*4)SFX.ants(fp);
    if(c.flood<=0){c.state='swarm';c.st=0;c.center.copy(fp)}
  }else if(c.state==='swarm'){
    c.hp=Math.min(c.max,c.hp+c.max*.06*dt);
    let dest=null;
    if(c.goal){dest=c.goal;if(dist2D(c.center,c.goal)<1){c.anchor=c.goal.clone();c.goal=null}}
    else{
      const e=nearestIn(c.center,vis,e=>dist2D(e.g.position,c.anchor)<22*FIELD_K);
      if(e){dest=e.g.position;if(dist2D(c.center,e.g.position)<2.2+e.r)antForm(c,e)}
      else if(dist2D(c.center,c.anchor)>1.5)dest=c.anchor;
    }
    if(dest&&c.state==='swarm'){const dx=dest.x-c.center.x,dz=dest.z-c.center.z,d=Math.hypot(dx,dz);if(d>.3){const st=Math.min(d,7.5*spd*dt);c.center.x+=dx/d*st;c.center.z+=dz/d*st}}
    clampField(c.center);
    const db=dist2D(c.center,BASE);if(db<BASE_R+2){c.center.x=BASE.x+(c.center.x-BASE.x)/db*(BASE_R+2);c.center.z=BASE.z+(c.center.z-BASE.z)/db*(BASE_R+2)}
    if(c.state==='swarm'){antSwarmStep(c,dt,t,c.center.x,c.center.z,1,10*spd);if(dest&&rnd()<dt*2)SFX.ants(c.center)}
  }else if(c.state==='form'||c.state==='body'){
    const e=c.tgt;
    if(c.goal||!e||e.dead||e.pull)antScatter(c,1);
    else{
      const ep=e.g.position,dx=ep.x-c.bodyPos.x,dz=ep.z-c.bodyPos.z,d=Math.hypot(dx,dz),reach=1.9*c.bs+e.r*.8;
      c.face=lerpAngle(c.face,Math.atan2(dx,dz),Math.min(1,dt*6));
      if(c.state==='form'){
        antBodyStep(c,dt,true);k=Math.min(1,c.st/.8);
        if(c.st>=.8){c.state='body';c.st=0;spark(c.bodyPos.clone().setY(2),0x5a3020,10,6,4)}
      }else{
        k=1;
        if(d>reach&&c.sw<0){const st=Math.min(d-reach,3.6*spd*dt);c.bodyPos.x+=dx/d*st;c.bodyPos.z+=dz/d*st;c.walk+=dt*7;clampField(c.bodyPos)}
        c.acd-=dt;
        if(c.sw<0&&c.acd<=0&&d<=reach+.8)c.sw=0;
        if(c.sw>=0){c.sw+=dt;const w=c.sw;
          c.armA=w<.3?.25+2.15*(w/.3):w<.42?2.4-3.5*((w-.3)/.12):w<.8?-1.1+1.35*((w-.42)/.38):.25;
          if(w>=.42&&!c.hitDone){c.hitDone=true;clubImpact(c,e)}
          if(w>=.8){c.sw=-1;c.hitDone=false;c.acd=cmdStat('reload');c.armA=.25}}
        antBodyStep(c,dt,false);
        [-1,1].forEach((sd,i)=>{const q=antBodyPos(c,{x:sd*.2,y:3.7,z:.48,arm:0,leg:0});c.eyes[i].position.set(q.x,q.y,q.z);c.eyes[i].visible=true});
        if(c.bar){c.bar.visible=c.hp<c.max;if(c.bar.visible){c.bar.position.set(c.bodyPos.x,4.6*c.bs,c.bodyPos.z);c.bar.quaternion.copy(camera.quaternion);c.bar.userData.fg.scale.x=Math.max(0,c.hp/c.max)}}
      }
    }
  }
  if(c.state==='scatter'){antScatterStep(c,dt);k=Math.max(0,1-c.st/.35);if(c.st>.6){c.state='swarm';c.st=0}}
  drawAnts(c,k);
}

/* ---------- Gräber: ziehen Gegner unter die Erde ---------- */
function grabTier(e){return e.T.boss?3:e.T.elite?2:e.type==='panzer'?1:e.T.nest?99:0}
function updateGraeber(s,dt,t){
  const grip=s.st.grip||0;
  for(const d of s.diggers){
    if(d.gone)continue;const ud=d.g.userData;
    if(d.dig>0){d.dig-=dt;const k=Math.max(0,Math.min(1,1-d.dig/.9));d.g.scale.setScalar(Math.max(.01,k));if(rnd()<dt*10)spark(new THREE.Vector3(d.x,.3,d.z),0x6a4a30,1,3,3);continue}
    ud.eyes.visible=d.cd<=0&&Math.sin(t*2.2+d.x*3)>-.9;
    if(d.grab){
      const e=d.grab;d.gt+=dt;const gt=d.gt;
      ud.arms.visible=true;ud.arms.position.y=gt<.2?-.5+gt*4:.3-Math.max(0,gt-.8)*2;
      let fin=false,used=false;
      if(e.dead)fin=true;
      else if(d.heavy&&gt>=.6){hit(e,e.max*.12);e.pull=null;e.g.position.y=0;e.stun=Math.max(e.stun,1.2);fin=used=true}
      else if(!d.heavy&&gt>=1.1){e.pull=null;kill(e);spark(new THREE.Vector3(d.x,.3,d.z),0x6a4a30,12,6,6);fin=used=true}
      else{
        const k=Math.min(1,dt*8);e.g.position.x+=(d.x-e.g.position.x)*k;e.g.position.z+=(d.z-e.g.position.z)*k;
        if(!d.heavy){e.g.position.y=-Math.max(0,gt-.2)*2.4*e.T.s;e.g.rotation.y+=dt*3}
        if(rnd()<dt*16)spark(new THREE.Vector3(d.x,.3,d.z),0x6a4a30,1,4,4);
      }
      if(fin){d.grab=null;ud.arms.visible=false;if(used){d.uses--;d.cd=s.st.reload}else d.cd=.4;
        if(d.uses<=0){d.gone=true;scene.remove(d.g);spark(new THREE.Vector3(d.x,.4,d.z),0x6a4a30,10,6,5)}}
      continue;
    }
    d.cd-=dt;if(d.cd>0)continue;
    for(const e of enemies){
      if(e.dead||e.pull||e.rise>0||grabTier(e)>grip)continue;
      if(Math.hypot(e.g.position.x-d.x,e.g.position.z-d.z)<1.5+e.r*.6){
        e.pull=d;d.grab=e;d.gt=0;d.heavy=grabTier(e)>=3;SFX.grab(e.g.position);spark(new THREE.Vector3(d.x,.4,d.z),0x6a4a30,10,6,6);break}
    }
  }
  if(s.diggers.every(d=>d.gone))s.hp=0;
}

/* ---------- Wellenereignisse ---------- */
const EVENTS={
  meteor:{name:'Meteoritenschauer',sub:'Meteore treffen Freund und Feind',min:4},
  supply:{name:'Versorgungsabwurf',sub:'Schick eine Einheit zur Kiste',min:4},
  blackout:{name:'Stromausfall',sub:'Fähigkeiten und Unterstützung fallen gleich aus',min:6},
  frenzy:{name:'Raserei',sub:'Gegner schneller, aber 50 % mehr Credits',min:7},
  gold:{name:'Goldkäfer',sub:'Erwisch ihn, bevor er entkommt',min:5},
};
let supply=null;
function pickEvent(w){
  if(!run||run.tut||w<4||w%5===0||rnd()>.35)return null;
  const ids=Object.keys(EVENTS).filter(k=>w>=EVENTS[k].min&&k!==run.lastEv);if(!ids.length)return null;
  const id=ids[rnd()*ids.length|0];run.lastEv=id;return{id,t:0,next:2,fired:false,at:6+rnd()*8};
}
function updateEvent(dt){
  if(run.blackout>0){run.blackout-=dt;if(run.blackout<=0){run.blackout=0;SFX.blackout(false);toast('Der Strom ist wieder da');$('app').classList.remove('blackout')}}
  if(supply)updateSupply(dt);
  const ev=run.ev;if(!ev||phase!=='fight')return;ev.t+=dt;
  if(ev.id==='meteor'){if(ev.t<24){ev.next-=dt;if(ev.next<=0){ev.next=.7+rnd()*.9;dropMeteor()}}}
  else if(ev.id==='supply'){if(!ev.fired&&ev.t>3){ev.fired=true;dropSupply()}}
  else if(ev.id==='blackout'){if(!ev.fired&&ev.t>ev.at){ev.fired=true;run.blackout=10;SFX.blackout(true);flash(.55,'#000');
    banner('STROMAUSFALL<small>10 s keine Fähigkeiten und Unterstützung</small>');$('app').classList.add('blackout');if(run.placing&&run.placing!=='cmdmove')exitPlacing()}}
  else if(ev.id==='gold'){if(!ev.fired&&ev.t>4){ev.fired=true;spawnGold()}}
}
function hurtFriendly(p,r,d){
  d*=1-run.dr;
  for(const u of soldiers.concat(mechs,zombies))if(!u.dead&&dist2D(u.g.position,p)<r+.5)u.hp-=d;
  for(const s of structs)if(s.hp>0&&s.max>1&&dist2D(s.g.position,p)<r+1.2)s.hp-=d*1.5;
  const c=run.cmd;if(c&&!c.dead&&!c.jet){if(c.ant){if(c.state==='body'&&dist2D(c.bodyPos,p)<r+1.5)c.hp-=d}else if(!(c.inv>0)&&dist2D(c.g.position,p)<r+.6)c.hp-=d}
}
function dropMeteor(){
  const fd=fieldDims();let x,z;
  const vis=enemies.filter(e=>visible(e)&&!e.T.nest);
  if(vis.length&&rnd()<.55){const e=vis[rnd()*vis.length|0];x=e.g.position.x+(rnd()-.5)*4;z=e.g.position.z+(rnd()-.5)*4}
  else{x=(rnd()-.5)*2*fd.X;z=BASE.z+12+rnd()*(fd.ZF-BASE.z-12)}
  const q=clampField(new THREE.Vector3(x,0,z));if(dist2D(q,BASE)<BASE_R+4)return;
  blast(q.clone().setY(.1),0xff3b3b,3.6,1.1,true);SFX.meteor(q);
  const from=q.clone().add(new THREE.Vector3(18+rnd()*10,70,-25)),dm=40+run.wave*9,fr=60+run.wave*3;
  shoot({from,to:q,dur:1.1,geo:'ball',mat:'meteor',scale:2.4,trail:1,trailCol:0xff7a2a,onHit:pp=>{boom(pp,3.6,dm,{col:0xff6a2a,fire:12});hurtFriendly(pp,3.6,fr);addZone(pp.x,pp.z,2,10,3)}});
}
function dropSupply(){
  const fd=fieldDims(),p=clampField(new THREE.Vector3((rnd()-.5)*1.3*fd.X,0,BASE.z+14+rnd()*14*FIELD_K));
  const g=makeCrate();g.position.set(p.x,30,p.z);scene.add(g);
  supply={g,p,t:0,life:45,land:false,runner:null};toast('Versorgungskiste im Anflug');
}
function updateSupply(dt){
  const s=supply;s.t+=dt;const ud=s.g.userData;
  if(!s.land){s.g.position.y=Math.max(0,30-s.t*12);if(s.g.position.y<=0){s.land=true;s.t=0;ud.chute.visible=false;SFX.thump(s.p);spark(s.p.clone().setY(.4),0x9a6a4a,12,6,5)}return}
  ud.glow.material.opacity=.6+Math.sin(s.t*6)*.4;
  if(s.t>s.life){removeSupply();toast('Die Versorgungskiste ist verloren');return}
  s.runner=nearestIn(s.p,soldiers,u=>!u.dead&&!u.emerge&&(u.own||0)!==1&&dist2D(u.g.position,s.p)<40);
  const near=q=>dist2D(q,s.p)<2.4;
  let by=soldiers.find(u=>!u.dead&&!u.emerge&&near(u.g.position))||mechs.find(u=>!u.dead&&near(u.g.position))||zombies.find(u=>!u.dead&&near(u.g.position));
  const c=run.cmd;if(!by&&c&&!c.dead&&!c.jet&&near(cmdPos(c)))by=c;
  if(by)collectSupply();
}
function collectSupply(){
  const r=rnd(),w=run.wave;let msg;
  if(r<.4){const v=(120+w*25)*run.crMul;run.credits+=v;msg='+'+fmt(v)+' Credits'}
  else if(r<.7){for(const id in run.cd)run.cd[id]=0;msg='Alle Abklingzeiten zurückgesetzt'}
  else{const mx=R('basis','maxhp');run.hp=Math.min(mx,run.hp+mx*.5);for(const s of structs)if(s.hp>0&&s.max>1)s.hp=Math.min(s.max,s.hp+s.max*.5);msg='Generator und Gebäude repariert'}
  SFX.pickup();blast(supply.p.clone().setY(.5),0xffd23f,4,.6,true);toast('Kiste geborgen: '+msg);removeSupply();
}
function removeSupply(){if(supply){scene.remove(supply.g);supply=null}}
function spawnGold(){
  const fd=fieldDims(),side=rnd()<.5?-1:1;
  const e=spawnEnemy('gold',side*(fd.X+1),BASE.z+20+rnd()*Math.max(4,fd.ZF-BASE.z-26));
  e.dir=-side;e.life=18;e.turns=0;banner('GOLDKÄFER<small>Erwisch ihn, bevor er entkommt</small>');SFX.pickup();
}
function goldTick(e,dt){
  const p=e.g.position,fd=fieldDims();e.life-=dt;
  const sp=e.sp*(e.slowT>0?.45:1),vz=Math.sin(waveT*2.4+e.ph)*sp*.7;
  p.x+=e.dir*sp*dt;p.z=Math.max(BASE.z+14,Math.min(fd.ZF-4,p.z+vz*dt));
  e.g.rotation.y=Math.atan2(e.dir*sp,vz);
  e.step+=dt*sp*2.2;animLegs(e);
  if(rnd()<dt*6)spark(p.clone().setY(.8),0xffd23f,1,2,3);
  if(e.dir*p.x>fd.X-1&&e.turns<1){e.turns++;e.dir*=-1}
  if(e.dir*p.x>fd.X+1.5||e.life<=0){e.dead=true;toast('Der Goldkäfer ist entkommen')}
}

/* ---------- Lenkrakete: Bordkamera, mit der Maus gelenkt ---------- */
let guided=null,realDt=.016;const steer={x:0,y:0,boost:false,kb:false};
const rkMesh=(()=>{const g=new THREE.Group();const b=new THREE.Mesh(projGeo.rocket,projMat.rocket);b.scale.setScalar(1.4);g.add(b);
  const fl=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0xff9a3d,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));fl.scale.set(2.2,2.2,1);fl.position.z=-1.6;g.add(fl);return g})();
const _rd=new THREE.Vector3();
function rkDir(g,v){const cp=Math.cos(g.pitch);return v.set(Math.sin(g.yaw)*cp,Math.sin(g.pitch),Math.cos(g.yaw)*cp)}
function startGuided(){
  if(guided)return false;
  const p=new THREE.Vector3(SHIP_POS.x,ship.position.y-4,SHIP_POS.z+9),tg=new THREE.Vector3(0,0,BASE.z+34*FIELD_K),d=tg.sub(p).normalize();
  guided={p,yaw:Math.atan2(d.x,d.z),pitch:-.22,t:0,fuel:R('rakete','dur'),fuel0:R('rakete','dur'),dmg:R('rakete','dmg'),aoe:R('rakete','aoe')};
  steer.x=steer.y=0;steer.boost=false;exitPlacing();hold=null;
  rkMesh.position.copy(p);scene.add(rkMesh);$('rkHud').hidden=false;$('app').classList.add('guiding');
  $('rkHint').textContent=isPC?'Maus lenkt · Maustaste oder Leertaste: Schub · Rechtsklick: zünden':'Finger lenkt · Zünden-Knopf sprengt sofort';
  camera.fov=96;camera.updateProjectionMatrix();SFX.whistle(p,.6);
}
function endGuided(){
  if(!guided)return;guided=null;scene.remove(rkMesh);$('rkHud').hidden=true;$('app').classList.remove('guiding');
  camera.fov=62;camera.updateProjectionMatrix();SFX.guided(false);steer.boost=false;
}
function detonateGuided(){
  const g=guided;if(!g)return;const q=new THREE.Vector3(g.p.x,0,g.p.z);
  if(g.p.y<g.aoe+3){boom(q,g.aoe,g.dmg,{col:0xffb04a,col2:0xff6a3d,fire:20});blast(q.clone().setY(.4),0xffe2a0,g.aoe*1.4,.7);spark(q.clone().setY(1),0xffd23f,26,16,12)}
  else blast(g.p.clone(),0xffb04a,4,.5);
  if(MP&&MP.role==='guest')MP.fxAdd(g.p.x,g.p.z,g.aoe,0xffb04a);
  flash(.45,'var(--yellow)');shake=reduceMotion?0:1.2;endGuided();
}
function updateGuided(rdt){
  const g=guided,fd=fieldDims();g.t+=rdt;g.fuel-=rdt;
  // sanfte Lenkung: Totzone in der Mitte, feinfühlig nahe dem Fadenkreuz, weich nachgezogen
  const curve=v=>{const a=Math.max(0,Math.abs(v)-.1)/.9;return Math.sign(v)*a*a};
  g.ty=(g.ty||0)+(curve(steer.x)*1.5-(g.ty||0))*Math.min(1,rdt*16);g.tp=(g.tp||0)+(curve(steer.y)*1.25-(g.tp||0))*Math.min(1,rdt*16);
  g.yaw-=g.ty*rdt;g.pitch=Math.max(-1.45,Math.min(.3,g.pitch+g.tp*rdt));
  const boost=steer.boost||steer.kb,sp=boost?24:13;
  rkDir(g,_rd);g.p.addScaledVector(_rd,sp*rdt);
  rkMesh.position.copy(g.p);rkMesh.lookAt(tmp.copy(g.p).add(_rd));
  if(rnd()<.8)spark(g.p.clone().addScaledVector(_rd,-1.8),boost?0xffd23f:0xff8a3d,1,1.5,1);
  SFX.guided(true,boost);
  $('rkAlt').textContent='Höhe '+Math.max(0,Math.round(g.p.y))+' m';$('rkFuel').style.width=Math.max(0,g.fuel/g.fuel0*100)+'%';
  let boomNow=g.p.y<=.4||g.fuel<=0||(g.t>1.5&&(Math.abs(g.p.x)>fd.X+18||g.p.z>fd.ZF+25||g.p.z<SHIP_POS.z-15));
  if(!boomNow)for(const e of enemies){if(!e.dead&&dist2D(e.g.position,g.p)<e.r+.7&&g.p.y<1.8*e.T.s+.6){boomNow=true;break}}
  if(boomNow)detonateGuided();
}
function guidedCamera(){
  const g=guided;rkDir(g,_rd);
  camera.position.copy(g.p).addScaledVector(_rd,-6).add(tmp2.set(0,2.6,0));
  camera.lookAt(tmp.copy(g.p).addScaledVector(_rd,40));
}
function setSteer(ev){
  const r=cv.getBoundingClientRect();
  steer.x=Math.max(-1,Math.min(1,((ev.clientX-r.left)/r.width-.5)*2.4));steer.y=Math.max(-1,Math.min(1,-((ev.clientY-r.top)/r.height-.5)*2.4));
  const dot=$('rkDot');dot.style.left=(ev.clientX-r.left)+'px';dot.style.top=(ev.clientY-r.top)+'px';
}
$('rkBoom').onclick=()=>detonateGuided();

/* ---------- Kamikaze-Rover ---------- */
let rovers=[];const ROVER_MAX=8;
function spawnRover(pos,st,emerge){
  const m=makeRover();m.g.position.copy(pos);scene.add(m.g);
  const r=Object.assign(m,{id:++structSeq,st,hp:150+run.wave*6,max:150+run.wave*6,dead:false,face:Math.PI,emerge:emerge||null,spin:0,tg:null});
  rovers.push(r);return r;
}
function roverTarget(p){
  let best=null,bs=-1e18;
  for(const e of enemies){
    if(e.dead||e.pull||e.rise>0)continue;if(!e.onScreen&&!e.T.nest)continue;
    const sc=(e.T.nest?1e9:0)+e.hp-dist2D(p,e.g.position)*.5;if(sc>bs){bs=sc;best=e}
  }
  return best;
}
function roverBoom(r){
  if(r.dead)return;r.dead=true;const q=r.g.position.clone().setY(0);
  boom(q,r.st.aoe,r.st.dmg,{col:0xff6a3d,col2:0xffd23f,fire:15});spark(q.clone().setY(1),0x8a8f9c,14,10,8);
}
function updateRovers(dt,t){
  for(const r of rovers){
    if(r.dead)continue;const p=r.g.position;
    if(r.emerge){const em=r.emerge;em.t+=dt;const k=Math.min(1,em.t/em.dur);p.lerpVectors(em.from,em.to,k);p.y=em.from.y*(1-k);
      r.g.rotation.y=Math.atan2(em.to.x-em.from.x,em.to.z-em.from.z);r.face=r.g.rotation.y;if(k>=1){r.emerge=null;p.y=0}continue}
    if(r.hp<=0){roverBoom(r);continue}
    if(!r.tg||r.tg.dead||r.tg.pull||(!r.tg.onScreen&&!r.tg.T.nest)||rnd()<dt*.5)r.tg=roverTarget(p);
    const e=r.tg;r.light.visible=Math.sin(t*(e?18:5))>0;
    if(!e){r.body.position.y=0;continue}
    const dx=e.g.position.x-p.x,dz=e.g.position.z-p.z,d=Math.hypot(dx,dz);
    if(d<e.r+1.3){roverBoom(r);continue}
    r.face=lerpAngle(r.face,Math.atan2(dx,dz),Math.min(1,dt*3.5));
    const sp=10*r.st.speed;p.x+=Math.sin(r.face)*sp*dt;p.z+=Math.cos(r.face)*sp*dt;
    const db=dist2D(p,BASE);if(db<BASE_R+1.5){p.x=BASE.x+(p.x-BASE.x)/db*(BASE_R+1.5);p.z=BASE.z+(p.z-BASE.z)/db*(BASE_R+1.5)}
    clampField(p);r.g.rotation.y=r.face;
    r.spin+=dt*sp*2.5;for(const w of r.wheels)w.rotation.x=r.spin;r.body.position.y=Math.abs(Math.sin(r.spin*.7))*.05;
    if(rnd()<dt*8)spark(p.clone().setY(.3).addScaledVector(tmp.set(Math.sin(r.face),0,Math.cos(r.face)),-1.2),0x9a6a4a,1,2,2);
    SFX.rover(p);
  }
  rovers=rovers.filter(r=>{if(!r.dead)return true;scene.remove(r.g);return false});
}

/* ---------- Panzer-Marines: Schild und Kettensäge, stehen vor den anderen Einheiten ---------- */
let marines=[];const MAR_MAX=8;
function spawnMarine(pos,st,emerge,own){
  const m=makeMarine();m.g.position.copy(pos);scene.add(m.g);
  const u=Object.assign(m,{id:++structSeq,own:own||0,st,hp:st.hp,max:st.hp,block:Math.min(.75,st.shield),dead:false,face:0,walk:0,emerge:emerge||null,isMar:true});
  if(emerge)m.g.visible=false;
  marines.push(u);return u;
}
function refreshMarines(){const pk=statPack('marine');for(const m of marines){if((m.own||0)!==myOwn())continue;const r=m.hp/m.max;m.st=pk;m.max=pk.hp;m.hp=Math.max(1,r*pk.hp);m.block=Math.min(.75,pk.shield)}}
// Front der Einheiten mit dem gleichen Befehl: dort stellen sich die Marines davor
function frontInfo(order,own){
  let z=-1e9,x=0,n=0;const sOrd=own?((MP&&MP.peerOrder)||'auto'):run.order,mOrd=own?((MP&&MP.peerMechOrder)||'auto'):run.mechOrder;
  for(const s of soldiers){if(s.dead||s.emerge)continue;const so=s.own||0;const o=so===2&&!own?'attack':so===own?sOrd:null;if(o!==order)continue;z=Math.max(z,s.g.position.z);x+=s.g.position.x;n++}
  for(const m of mechs){if(m.dead||m.emerge||(m.own||0)!==own||mOrd!==order)continue;z=Math.max(z,m.g.position.z);x+=m.g.position.x;n++}
  return n?{z,x:x/n}:null;
}
function updateMarines(dt,t){
  for(const u of marines){
    if(u.dead||!u.emerge)continue;const em=u.emerge;em.t+=dt;if(em.t<0)continue;
    u.g.visible=true;const k=Math.min(1,em.t/em.dur);u.g.position.lerpVectors(em.from,em.to,k);u.g.position.y=em.from.y*(1-k)+Math.sin(k*Math.PI)*1.4;
    if(k>=1){u.emerge=null;u.g.position.y=0;spark(u.g.position.clone().setY(.2),0x9a6a4a,6,4,3)}
  }
  for(const own of [0,1]){
  const order=own===myOwn()?run.marOrder:((MP&&MP.peerMarOrder)||'auto'),alive=marines.filter(u=>!u.dead&&!u.emerge&&(u.own||0)===own),N=alive.length;
  if(!N)continue;
  const fl=frontInfo(order,own);
  alive.forEach((u,i)=>{
    const p=u.g.position,ud=u;
    if(u.hp<=0){u.dead=true;spark(p.clone().setY(1.2),0x8a8f9c,18,9,7);blast(p.clone().setY(1),0xff9a3d,1.8,.4);return}
    let anchor=null,engage=12;
    if(fl){anchor=tmp3.set(fl.x+(i-(N-1)/2)*2.6,0,fl.z+3.5).clone();engage=order==='attack'?14:order==='hold'?8:order==='retreat'?6:11}
    else if(order==='hold'){anchor=patrolPos(30+i,t);engage=8}
    else if(order==='retreat'){const s=slotPos(i*2);anchor=s.clone().sub(BASE).setY(0).normalize().multiplyScalar(3).add(s);engage=6}
    else if(order==='auto'){anchor=fieldPos(i+1,-8);engage=16}
    const from=anchor||p;
    let tg=null,bd=order==='attack'&&!anchor?1e9:engage;
    for(const e of enemies){if(!visible(e))continue;const d=dist2D(e.g.position,from);if(d<bd){bd=d;tg=e}}
    let goal=null;
    if(tg){const d=dist2D(p,tg.g.position);if(d>tg.r+1.2)goal=tg.g.position}else goal=anchor;
    let moving=false;
    if(goal){const dx=goal.x-p.x,dz=goal.z-p.z,d=Math.hypot(dx,dz);if(d>.6){const st=Math.min(d,3.4*dt);p.x+=dx/d*st;p.z+=dz/d*st;moving=true;u.face=Math.atan2(dx,dz)}}
    for(const o of alive){if(o===u)continue;const dx=p.x-o.g.position.x,dz=p.z-o.g.position.z,d=Math.hypot(dx,dz);if(d<1.9&&d>.001){p.x+=dx/d*(1.9-d)*.5;p.z+=dz/d*(1.9-d)*.5}}
    const db=dist2D(p,BASE);if(db<BASE_R+1.5){p.x=BASE.x+(p.x-BASE.x)/db*(BASE_R+1.5);p.z=BASE.z+(p.z-BASE.z)/db*(BASE_R+1.5)}
    clampField(p);
    const mel=tg&&dist2D(p,tg.g.position)<tg.r+1.5?tg:null;
    if(mel){u.face=Math.atan2(mel.g.position.x-p.x,mel.g.position.z-p.z);hit(mel,u.st.dmg*dt*auraMul(p)*(cmdBuffT>0?1:1),true);mel.fl=.04;
      u.blade.position.x=Math.sin(t*90)*.03;u.saw.rotation.x=-.25+Math.sin(t*14)*.15;if(rnd()<dt*12)spark(mel.g.position.clone().setY(.9),rnd()<.5?0xffd23f:mel.T.col,1,4,4);SFX.saw(p)}
    else{u.saw.rotation.x*=.9;u.blade.position.x=0}
    u.shield.rotation.y=mel?-.25:0;
    u.g.rotation.y=lerpAngle(u.g.rotation.y,u.face,Math.min(1,dt*8));
    if(moving){u.walk+=dt*9;u.body.position.y=Math.abs(Math.sin(u.walk))*.06}else u.body.position.y=0;
    u.mel=!!mel;
  });
  }
  marines=marines.filter(u=>{if(!u.dead)return true;scene.remove(u.g);return false});
}
function setMarOrder(o){if(!run)return;run.marOrder=o;updSlots();toast('Marines: '+{attack:'Angriff',hold:'Stellung halten',retreat:'Rückzug',auto:'Autonom'}[o])}
$('rAttack').onclick=()=>setMarOrder('attack');$('rHold').onclick=()=>setMarOrder('hold');$('rRetreat').onclick=()=>setMarOrder('retreat');$('rAuto').onclick=()=>setMarOrder('auto');

/* ---------- Fähigkeiten-Automatik ---------- */
let autoAb={};try{autoAb=JSON.parse(ls.get('orbitalbrigade-autoab')||'{}')||{}}catch(e){autoAb={}}
function toggleAuto(id){if(id==='rakete')return;autoAb[id]=autoAb[id]?0:1;ls.set('orbitalbrigade-autoab',JSON.stringify(autoAb));toast(ITEMS[id].name+': Automatik '+(autoAb[id]?'an':'aus'));updSlots()}
function autoAbilities(dt){
  run.aaT=(run.aaT||0)-dt;if(run.aaT>0||run.blackout>0||guided||run.tut||run.placing)return;run.aaT=.35;
  let n=0,big=false;for(const e of enemies)if(visible(e)&&!e.T.nest){n++;if(e.T.boss||e.T.elite)big=true}
  if(!n||(n<4&&!big))return;
  for(const id of ABILITY_IDS){if(!autoAb[id]||id==='rakete'||!M.unlocked[id]||(run.cd[id]||0)>0)continue;if(useAbility(id,true))break}
}

/* ---------- Gegner markieren (mittlere Maustaste) ---------- */
let marks=[];
function markEnemy(e,own){
  marks=marks.filter(m=>{if(m.own===own||m.e===e&&m.own===own){scene.remove(m.g);return false}return true});
  if(!e||e.dead)return;
  const g=makeMarker(own?0x5fd0ff:0xffd23f);scene.add(g);marks.push({e,own,g,t:0});SFX.mark(!own);
}
function markedTarget(){for(const m of marks)if(m.own===0&&visible(m.e))return m.e;for(const m of marks)if(visible(m.e))return m.e;return null}
function updateMarks(dt,t){
  for(const m of marks){
    m.t+=dt;const e=m.e;if(e.dead||m.t>15){m.gone=true;continue}
    const p=e.g.position,s=e.r*1.15;m.g.position.set(p.x,0,p.z);
    m.g.userData.ring.scale.setScalar(s*(1+Math.sin(t*6)*.06));m.g.userData.ring.rotation.z=t*1.5;
    m.g.userData.arrow.position.y=2.2*e.T.s+1.4+Math.sin(t*5)*.3;m.g.userData.arrow.rotation.y=t*2;
  }
  marks=marks.filter(m=>{if(!m.gone)return true;scene.remove(m.g);return false});
}
function tryMark(p){
  let best=null,bd=1e9;for(const e of enemies){if(!visible(e))continue;const d=dist2D(e.g.position,p)-e.r;if(d<bd&&d<3){bd=d;best=e}}
  if(!best){toast('Kein Gegner an dieser Stelle');return}
  markEnemy(best,0);if(MP)MP.mk=[best.id,(MP.mk?MP.mk[1]:0)+1];
}

/* ---------- Munition der Bordkanone und Nachschub ---------- */
let ammoShips=[],ammoHintT=0;
function requestAmmo(){
  if(!run||!play()||halted||run.tut)return;
  if(ammoShips.length){toast('Nachschub ist schon unterwegs');return}
  if((run.cd.ammo||0)>0){SFX.deny();toast('Nachschub: noch '+Math.ceil(run.cd.ammo)+' s');return}
  if(run.ammo>=run.ammoMax){toast('Das Magazin ist voll');return}
  run.cd.ammo=20;
  const to=new THREE.Vector3(ship.position.x,ship.position.y+4,ship.position.z),from=to.clone().add(new THREE.Vector3(70,35,-130));
  const g=makeShuttle();g.scale.setScalar(.6);g.position.copy(from);scene.add(g);
  ammoShips.push({g,from,to,t:0,phase:'in'});SFX.jet2(to,2);toast('Munitionsnachschub angefordert');
}
function updateAmmoShips(dt){
  for(const a of ammoShips){
    a.t+=dt;const g=a.g;
    if(a.phase==='in'){const k=Math.min(1,a.t/3.5),e=1-(1-k)*(1-k);g.position.lerpVectors(a.from,a.to,e);g.lookAt(tmp.copy(a.to).sub(a.from).add(a.to));
      if(k>=1){a.phase='dock';a.t=0;SFX.thump(a.to)}}
    else if(a.phase==='dock'){g.position.set(a.to.x,a.to.y+Math.sin(a.t*8)*.06,a.to.z);if(rnd()<.6)spark(a.to.clone().add(jit(2.5)).setY(a.to.y-1),0xffd23f,1,2,2);
      if(a.t>1.1){a.phase='out';a.t=0;if(run){run.ammo=run.ammoMax}SFX.pickup();toast('Bordkanone nachgeladen');a.from2=g.position.clone()}}
    else{const k=Math.min(1,a.t/2.2);g.position.set(a.from2.x-k*k*70,a.from2.y+k*k*40,a.from2.z-k*k*90);if(k>=1)a.done=1}
  }
  ammoShips=ammoShips.filter(a=>{if(!a.done)return true;scene.remove(a.g);return false});
}
function ammoEmptyHint(){if(performance.now()-ammoHintT<2500)return;ammoHintT=performance.now();SFX.deny();toast('Bordkanone leer! Nachschub anfordern'+(isPC?' (Leertaste)':''))}
/* ---------- Spawnpunkte: vorn auf drei Bahnen, ab Welle 4 auch von den Seiten ---------- */
function spawnPoint(w){
  const sideP=w>=4?Math.min(.32,.12+w*.006):0;
  if(rnd()<sideP){const d=fieldDims(),sd=rnd()<.5?-1:1;return{x:sd*(d.X+1),z:BASE.z+20+rnd()*Math.max(6,d.ZF-BASE.z-26)}}
  const ln=lanes()[rnd()*3|0];return{x:ln.x+(rnd()-.5)*2*ln.j,z:ln.z+rnd()*2};
}

function rebuildRing(){
  const lvl=Math.round(R('basis','ring'));if(lvl<=0)return;
  for(let k=0;k<5;k++){
    if(structs.some(s=>s.type==='ring'&&s.slot===k))continue;
    const a=.5+k*(Math.PI-1)/4,p=new THREE.Vector3(BASE.x+Math.cos(a)*9.5,0,BASE.z+Math.sin(a)*9.5);
    const g=makeWall();g.scale.set(.62,.9,.9);g.rotation.y=Math.atan2(BASE.x-p.x,BASE.z-p.z);
    addStruct('ring',g,p,{slot:k,hp:250*lvl*(1+.06*run.wave),barW:2.6,barY:2.2,colsLocal:[{x:-1.5,z:0,r:1.15},{x:1.5,z:0,r:1.15}]});
  }
}
function spawnSoldier(cls,pos,emerge,home,st,own){
  st=st||soldierPack();
  const m=makeSoldier(cls);m.g.position.copy(pos);scene.add(m.g);
  const hp=st.hp*(cls==='flamer'?1.3:cls==='sniper'?.8:1);
  const so=Object.assign(m,{id:++structSeq,cls,hp,max:hp,st,own:own||0,cd:.3+rnd()*.3,gcd:4+rnd()*4,dead:false,emerge:emerge||null,walk:0,face:0,home:home||null,idx:soldierSeq++});
  if(emerge)m.g.visible=false;
  soldiers.push(so);return so;
}
const SCLS={rifle:{range:14,rate:.32},flamer:{range:5.5,rate:.12},rpg:{range:20,rate:2.6},sniper:{range:34,rate:1.8}};
function slotPos(i){const R0=7+((i/9)|0)*2.2,k=i%9,a=.35+(Math.PI-.7)*(k+.5)/9;return new THREE.Vector3(BASE.x+Math.cos(a)*R0,0,BASE.z+Math.sin(a)*R0)}
function fieldPos(i,z){return new THREE.Vector3((-17+(i%8)*4.8)*FIELD_K,0,z-((i/8)|0)*2.4)}
function patrolPos(i,t){const mid=(fieldDims().ZF+BASE.z)/2;return new THREE.Vector3((-19+(i%9)*4.7)*FIELD_K+Math.sin(t*.35+i*1.7)*2.4,0,mid+3-((i/9)|0)*3+Math.cos(t*.27+i)*1.4)}
function nearestIn(p,list,filter){let b=null,bd=1e9;for(const e of list){if(filter&&!filter(e))continue;const d=dist2D(e.g.position,p);if(d<bd){bd=d;b=e}}return b}
function soldierFire(so,e,dmg,range){
  so.gun.getWorldPosition(tmp);const from=tmp.clone();SFX.soldier(so.cls,so.g.position);
  if(so.cls==='rifle'){tracer(from,e.g.position.clone().setY(.8+rnd()*.3));hit(e,dmg)}
  else if(so.cls==='sniper'){tracer(from,e.g.position.clone().setY(.9),0x9ff3ff,1.6);hit(e,dmg*9);spark(e.g.position.clone().setY(1),0x9ff3ff,3,4,3)}
  else if(so.cls==='rpg'){shoot({from,to:e.g.position.clone().setY(.5),dur:.55,arc:1.2,geo:'rocket',mat:'rocket',scale:.6,trail:.9,onHit:p=>boom(p,2.8,dmg*6)})}
  else if(so.cls==='flamer'){
    const p=so.g.position,fa=so.g.rotation.y;
    for(const en of enemies){if(en.dead)continue;const dx=en.g.position.x-p.x,dz=en.g.position.z-p.z,d=Math.hypot(dx,dz);
      if(d<range+en.r*.5&&Math.abs(lerpAngle(0,Math.atan2(dx,dz)-fa,1))<.62){hit(en,dmg*.55,true);applyBurn(en,dmg*.8,2)}}
    for(let i=0;i<3;i++){const k=1+rnd()*(range-1.3),s2=(rnd()-.5)*.9;tmp.set(p.x+Math.sin(fa+s2)*k,.9,p.z+Math.cos(fa+s2)*k);spark(tmp,rnd()<.5?0xff7a2a:0xffd23f,1,1.5,2)}
  }
}
/* Soldaten-KI
   Angriff: stürmen blind auf die Gegner los, verteilt auf alle Angriffsrichtungen.
   Stellung halten: patrouillieren auf der Feldmitte, weichen nie zurück, +25 % Schaden und Reichweite.
   Rückzug: verteidigen den Generator, weichen nahen Gegnern aus.
   Autonom: einige verteidigen je nach Bedrohung den Generator, der Rest teilt sich auf alle
   Richtungen auf, hält Abstand auf Reichweite und weicht zurück, wenn Gegner zu nahe kommen. */
function updateSoldiers(dt,t){
  const alive=soldiers.filter(s=>!s.dead&&!s.emerge);
  for(const so of soldiers){
    if(so.dead||!so.emerge)continue;
    const em=so.emerge;em.t+=dt;if(em.t<0)continue;
    so.g.visible=true;const k=Math.min(1,em.t/em.dur);
    so.g.position.lerpVectors(em.from,em.to,k);so.g.position.y=em.from.y*(1-k)+Math.sin(k*Math.PI)*1.8;
    so.g.rotation.y=Math.atan2(em.to.x-em.from.x,em.to.z-em.from.z);
    if(k>=1){so.emerge=null;so.g.position.y=0;spark(so.g.position.clone().setY(.2),0x9a6a4a,4,3,2)}
  }
  const vis=enemies.filter(visible);
  for(const own of [0,1,2]){
  const group=alive.filter(s=>(s.own||0)===own);if(!group.length)continue;
  const order=own===2?'attack':own===myOwn()?run.order:((MP&&MP.peerOrder)||'auto');
  const lc=[0,0,0];for(const e of vis)lc[laneOf(e.g.position.x)]++;
  const nearBase=vis.filter(e=>dist2D(e.g.position,BASE)<20).length;
  const nDef=order==='auto'?Math.min(group.length,Math.ceil(nearBase/3)):0;
  const asg=[0,0,0],lanes=[];
  for(let i=0;i<group.length;i++){
    if(i<nDef){lanes.push(-1);continue}
    let best=-1,bv=-1;for(let l=0;l<3;l++){if(!lc[l])continue;const v=lc[l]/(asg[l]+1);if(v>bv){bv=v;best=l}}
    if(best>=0)asg[best]++;lanes.push(best);
  }
  const buff=order==='hold'?1.25:1;
  group.forEach((so,i)=>{
    const spd=so.st.sp,dmg=so.st.dmg,gl=so.st.g;
    const C=SCLS[so.cls],p=so.g.position,range=C.range*buff;
    if(so.hp<=0){so.dead=true;spark(p.clone().setY(.8),0x8a8f9c,12,7);return}
    const lane=lanes[i];
    const any=(lane>=0?nearestIn(p,vis,e=>laneOf(e.g.position.x)===lane):null)||nearestIn(p,vis);
    let goal=null,tg=null,kite=false,sp=spd;
    if(order==='attack'){tg=any;if(any){if(dist2D(p,any.g.position)>range*.6)goal=any.g.position}else goal=fieldPos(i,4)}
    else if(order==='hold'){goal=patrolPos(i,t);tg=nearestEnemy(p,range);sp=spd*.7}
    else if(order==='retreat'){goal=slotPos(i);tg=nearestEnemy(p,range);kite=true}
    else{
      kite=true;
      if(lane===-1||so.hp<so.max*.35){goal=slotPos(i);tg=nearestEnemy(p,range)}
      else{tg=any;if(any){if(dist2D(p,any.g.position)>range*.8)goal=any.g.position}else goal=fieldPos(i,-10)}
    }
    if(kite){
      const close=nearestEnemy(p,so.cls==='flamer'?1.8:range*.35);
      if(close){goal=tmp3.set(p.x-close.g.position.x,0,p.z-close.g.position.z).normalize().multiplyScalar(4).add(p).clone();sp=spd*1.15}
    }
    if(supply&&supply.land&&supply.runner===so){goal=supply.p;sp=spd*1.25}
    let moving=false;
    if(goal){const dx=goal.x-p.x,dz=goal.z-p.z,d=Math.hypot(dx,dz);if(d>.7){const st=Math.min(d,sp*dt);p.x+=dx/d*st;p.z+=dz/d*st;moving=true;so.face=Math.atan2(dx,dz)}}
    for(const o of alive){if(o===so)continue;const dx=p.x-o.g.position.x,dz=p.z-o.g.position.z,d=Math.hypot(dx,dz);if(d<1&&d>.001){p.x+=dx/d*(1-d)*.5;p.z+=dz/d*(1-d)*.5}}
    const db=dist2D(p,BASE);if(db<BASE_R+1){p.x=BASE.x+(p.x-BASE.x)/db*(BASE_R+1);p.z=BASE.z+(p.z-BASE.z)/db*(BASE_R+1)}
    clampField(p);
    const target=(tg&&visible(tg)&&dist2D(p,tg.g.position)<=range+tg.r*.5)?tg:nearestEnemy(p,range);
    if(target){
      so.face=Math.atan2(target.g.position.x-p.x,target.g.position.z-p.z);
      so.cd-=dt;if(so.cd<=0){so.cd=C.rate*(.9+rnd()*.2);soldierFire(so,target,dmg*buff*auraMul(p),range)}
      if(gl>0){so.gcd-=dt;if(so.gcd<=0&&dist2D(p,target.g.position)<11*buff){so.gcd=Math.max(3,10-gl*1.4);
        so.gun.getWorldPosition(tmp);const q=target.g.position.clone().setY(.3);
        shoot({from:tmp.clone(),to:q,dur:.8,arc:3,geo:'ball',mat:'grenade',scale:.6,onHit:pp=>boom(pp,2.6,dmg*5*buff,{col:0xffa43d})})}}
    }
    so.g.rotation.y=lerpAngle(so.g.rotation.y,so.face,Math.min(1,dt*10));
    if(moving){so.walk+=dt*12;so.body.position.y=Math.abs(Math.sin(so.walk))*.08}else so.body.position.y=0;
  });
  }
  soldiers=soldiers.filter(s=>{if(!s.dead)return true;scene.remove(s.g);return false});
}
function updatePods(dt,t){
  for(const pd of pods){
    if(!pd.landed){
      pd.t+=dt;const k=Math.min(1,pd.t/pd.dur);pd.g.position.lerpVectors(pd.from,pd.to,k*k);
      pd.g.userData.flame.scale.setScalar(3.5+Math.sin(t*50)*.6);
      if(rnd()<.9)spark(pd.g.position,rnd()<.5?0xff8a3d:0x8a8a96,1,2,2);
      if(k>=1){
        pd.landed=true;pd.g.userData.flame.visible=false;setTimeout(()=>SFX.podOpen(pd.to),300);
        pd.g.position.set(pd.to.x,-3.2,pd.to.z);pd.g.quaternion.setFromEuler(new THREE.Euler((rnd()-.5)*.25,rnd()*6,(rnd()-.5)*.25));
        boom(pd.to,3.2,40+(run?run.wave*3:0),{col:0xff8a3d});
        spark(pd.to.clone().setY(.4),0x9a6a4a,20,14,10);
        const top=pd.to.clone().setY(1.6);
        pd.comp.forEach((cls,i)=>{
          const a=i/pd.comp.length*6.28+rnd()*.4,to=new THREE.Vector3(pd.to.x+Math.cos(a)*2.3,0,pd.to.z+Math.sin(a)*2.3);
          clampField(to);if(pd.mar)spawnMarine(top.clone(),pd.mar,{t:-(.55+i*.45),dur:.8,from:top.clone(),to},pd.own);else spawnSoldier(cls,top.clone(),{t:-(.55+i*.38),dur:.8,from:top.clone(),to},null,pd.st,pd.own);
        });
        pd.life=22;
      }
    }else{
      pd.open=Math.min(1,pd.open+dt*2.5);pd.g.userData.hinge.rotation.z=-pd.open*2.1;
      pd.life-=dt;if(pd.life<1.5)pd.g.position.y-=dt*2.4;if(pd.life<=0)pd.done=1;
    }
  }
  pods=pods.filter(pd=>{if(!pd.done)return true;scene.remove(pd.g);return false});
}
function updateStructs(dt,t){
  for(const s of structs){
    if(s.drop!=null&&!s.active){
      s.drop+=dt/.6;const k=Math.min(1,s.drop);s.g.position.y=40*(1-k*k);
      if(rnd()<.8)spark(s.g.position.clone().setY(s.g.position.y+1),0xff8a3d,1,2,2);
      if(k>=1){s.active=true;SFX.thump(s.g.position);s.g.position.y=0;spark(s.g.position.clone().setY(.4),0x9a6a4a,16,10,8);shake=reduceMotion?0:Math.max(shake,.3)}
      continue;
    }
    if(s.type==='sentry'){
      const range=s.st.range,e=nearestEnemy(s.g.position,range);
      if(e){const head=s.g.userData.head;head.rotation.y=lerpAngle(head.rotation.y,Math.atan2(e.g.position.x-s.x,e.g.position.z-s.z)-s.g.rotation.y,Math.min(1,dt*8));
        s.cd-=dt;if(s.cd<=0){s.cd=1/s.st.rate;SFX.sentry(s.g.position);head.localToWorld(tmp.set((s.alt=!s.alt)?.2:-.2,0,1.6));tracer(tmp.clone(),e.g.position.clone().setY(.8));hit(e,s.st.dmg)}}
    }else if(s.type==='wall'){
      const rg=s.st.regen||0;if(rg>0)s.hp=Math.min(s.max,s.hp+s.max*rg/100*dt);
    }else if(s.type==='moerser'){
      s.cd-=dt;
      if(s.cd<=0){const e=densest(48,s.g.position,s.st.aoe);
        if(e){s.cd=1/s.st.rate;const tube=s.g.userData.tube;s.g.rotation.y=Math.atan2(e.g.position.x-s.x,e.g.position.z-s.z);
          tube.localToWorld(tmp.set(0,.9,0));const d=s.st.dmg,a=s.st.aoe;
          spark(tmp,0xffd23f,4,3,4);SFX.mortar(s.g.position);shoot({from:tmp.clone(),to:lead(e,1.4).setY(0),dur:1.4,arc:16,geo:'shell',mat:'shell',scale:.7,trail:.5,onHit:p=>boom(p,a,d)})}else s.cd=.5}
    }else if(s.type==='kaserne'){
      s.t-=dt;
      if(s.t<=0){
        s.t=s.st.recruit;
        const mine=soldiers.filter(so=>!so.dead&&so.home===s).length;
        if(mine<s.st.cap&&aliveSoldiers(s.own)<s.st.troops){
          const door=s.g.localToWorld(new THREE.Vector3(0,0,1.9)),out=s.g.localToWorld(new THREE.Vector3((rnd()-.5)*2,0,4));
          spawnSoldier('rifle',door,{t:0,dur:.6,from:door.clone(),to:clampField(out)},s,s.st.s,s.own);
        }
      }
    }else if(s.type==='minen'){
      for(const m of s.mines){
        if(m.gone)continue;m.g.userData.light.visible=Math.sin(t*5+m.ph)>0;
        for(const e of enemies){if(!e.dead&&Math.hypot(e.g.position.x-m.x,e.g.position.z-m.z)<.9+e.r*.7){m.gone=true;scene.remove(m.g);boom(new THREE.Vector3(m.x,0,m.z),2.6,s.st.dmg,{col:0xff6a3d});break}}
      }
      s.mines=s.mines.filter(m=>!m.gone);if(!s.mines.length)s.hp=0;
    }else if(s.type==='graeber')updateGraeber(s,dt,t);
    if(s.bar){
      s.bar.visible=s.hp<s.max&&s.hp>0;
      if(s.bar.visible){s.bar.position.set(s.g.position.x,s.barY,s.g.position.z);s.bar.quaternion.copy(camera.quaternion);s.bar.userData.fg.scale.x=Math.max(0,s.hp/s.max)}
    }
  }
  structs=structs.filter(s=>{
    if(s.hp>0)return true;
    if(s.type!=='minen'&&s.type!=='graeber'){const p=s.g.position.clone().setY(1);spark(p,0x8a8f9c,18,10,8);blast(p,0xff9a3d,2.4,.4)}
    removeStruct(s);return false;
  });
}
function updateBaseGuns(dt){
  if(!run)return;
  const dmg=10+run.wave*1.2;
  for(const g of baseGuns.children){
    g.userData.cd-=dt;const e=nearestEnemy(BASE,24);if(!e)continue;
    const head=g.userData.head;head.lookAt(e.g.position.x,head.getWorldPosition(tmp).y,e.g.position.z);
    if(g.userData.cd<=0){g.userData.cd=.5;SFX.sentry(BASE);head.localToWorld(tmp.set(0,0,1));tracer(tmp.clone(),e.g.position.clone().setY(.8),0x9ff3ff);hit(e,dmg)}
  }
}
function updateZones(dt){
  for(const z of zones){
    COSMETIC=z.cos;
    z.t-=dt;z.m.material.opacity=.45*Math.min(1,z.t/.6)*(0.85+Math.sin(z.t*20)*.15);
    for(const e of enemies)if(!e.dead&&Math.hypot(e.g.position.x-z.x,e.g.position.z-z.z)<z.r+e.r*.5){hit(e,z.dps*dt,true);applyBurn(e,z.dps*.3,1)}
    if(rnd()<dt*z.r*3){const a=rnd()*6.28,r=Math.sqrt(rnd())*z.r;spark(new THREE.Vector3(z.x+Math.cos(a)*r,.3,z.z+Math.sin(a)*r),z.col===0xff4fc8?0xff9ae6:(rnd()<.5?0xff7a2a:0xffd23f),1,1,4)}
  }
  COSMETIC=false;
  zones=zones.filter(z=>{if(z.t>0)return true;scene.remove(z.m);z.m.material.dispose();return false});
}

/* =========================================================
   Run-Ablauf
   ========================================================= */
function newRun(start,tut){
  return {start,wave:start,mult:1+(start-1)/20*.6,credits:0,xp:0,level:1,kills:0,medals:0,banked:0,
    weapons:['kanone'],sel:'kanone',ev:null,blackout:0,ammo:0,ammoMax:0,dmgMul:1,crit:0,crMul:1,mdMul:1,xpMul:1,dr:0,cdMul:1,cmd:null,heat:{},over:{},wcd:{},lv:{},cd:{},order:'auto',mechOrder:'auto',marOrder:'auto',tut:!!tut,placing:null,pending:0,hp:0,lastBonus:0};
}
function clearAll(){
  SFX.laser(false);
  enemies.forEach(e=>{scene.remove(e.g);e.mat.dispose()});enemies=[];queue=[];bossE=null;
  structs.forEach(removeStruct);structs=[];
  soldiers.forEach(s=>scene.remove(s.g));soldiers=[];
  pods.forEach(p=>scene.remove(p.g));pods=[];
  mechs.forEach(m=>scene.remove(m.g));mechs=[];
  rovers.forEach(r=>scene.remove(r.g));rovers=[];marines.forEach(u=>scene.remove(u.g));marines=[];
  zombies.forEach(z=>scene.remove(z.g));zombies=[];cmdBuffT=0;
  if(run&&run.cmd){scene.remove(run.cmd.g);if(run.cmd.bar)scene.remove(run.cmd.bar);run.cmd=null}shuttles.forEach(s=>scene.remove(s.g));shuttles=[];
  jets.forEach(j=>scene.remove(j.g));jets=[];
  shots.forEach(s=>scene.remove(s.m));shots=[];
  zones.forEach(z=>scene.remove(z.m));zones=[];
  marks.forEach(m=>scene.remove(m.g));marks=[];ammoShips.forEach(a=>scene.remove(a.g));ammoShips=[];
  later=[];laser.on=0;act.luft=act.barrage=null;beam.visible=laserHit.visible=false;
  laser2.on=0;actR.luft=actR.barrage=null;beam2.visible=laserHit2.visible=false;
  hold=null;$('boss').hidden=true;removeSupply();endGuided();$('app').classList.remove('blackout');
}
function startRun(start,tut=false){
  clearAll();
  run=newRun(start,tut);
  run.credits=Math.round(R('allg','startcr')+(start-1)*22);
  run.hp=R('basis','maxhp');run.ammoMax=R('kanone','ammo');run.ammo=run.ammoMax;
  if(tut)setMap(0);else if(!(MP&&MP.role==='guest'))setMap(rnd()*MAPS.length|0);env.snow=!!MAP.snow;
  if(!tut){run.dmgMul=rebirthDmg()*(1+enchSum('dmg'));run.crit=enchSum('crit');run.crMul=rebirthMoney()*(1+enchSum('cr'));run.mdMul=rebirthMoney();
    run.xpMul=1+enchSum('xp');run.dr=Math.min(.5,enchSum('dr'));run.cdMul=1-Math.min(.5,enchSum('cd'))}
  FIELD_K=fieldTargetK(start);
  buildTurrets(1+Math.round(R('kanone','twin')));buildBaseGuns(MP&&MP.role==='guest'?0:Math.round(R('basis','turret')));
  if(!tut){M.runs++;saveMeta()}
  env.t=.16;env.rainT=env.fogT=0;
  $('side').hidden=$('abilBar').hidden=false;$('app').classList.add('inrun');
  if(!tut)spawnCommander();
  buildSlots();updHud();
  if(tut){phase='tut';halted=false;showOv(null);startTutorial();return}
  if(MP&&MP.role==='guest'){if(start>1)openRunShop(true);else{phase='fight';showOv(null)}}
  else if(start>1)openRunShop(true);else startWave();
}
function startWave(){
  queue=buildWave(run.wave);waveT=0;phase='fight';halted=false;showOv(null);
  M.best=Math.max(M.best,run.wave);M.bestAll=Math.max(M.bestAll,M.best);saveMeta();
  rebuildRing();ensureNests();
  run.ev=pickEvent(run.wave);run.blackout=0;$('app').classList.remove('blackout');
  const wr=rnd();env.rainT=0;env.fogT=0;let wtxt='';
  if(run.wave>=3&&wr<.22){env.rainT=.5+rnd()*.5;wtxt=MAP.rainName}
  else if(run.wave>=3&&wr<.34){env.fogT=.6+rnd()*.4;wtxt='Nebel zieht auf'}
  const boss=run.wave%20===0?'Titan, Brutkönigin und Brutwächter im Anmarsch':run.wave%5===0?'Brutkönigin und Brutwächter im Anmarsch':'';
  SFX.horn();
  const evt=run.ev?EVENTS[run.ev.id].name+': '+EVENTS[run.ev.id].sub:'';
  if(run.wave===run.start)wtxt=[MAP.name+' · '+MAP.sub,wtxt].filter(Boolean).join(' · ');
  if(run.wave===4&&run.start<=4)wtxt=[wtxt,'Gegner kommen jetzt auch von den Seiten'].filter(Boolean).join(' · ');if(run.ev)wait(.8,()=>SFX.alarm());
  banner('WELLE '+run.wave+(boss||wtxt||evt?'<small>'+[boss,evt,wtxt].filter(Boolean).join(' · ')+'</small>':''));
  updHud();
}
function bankMedals(){if(!run||run.tut)return;const tot=Math.floor(run.medals);M.medals+=tot-run.banked;run.banked=tot;saveMeta()}
function waveDone(){
  const bonus=(15+run.wave*4)*run.mult*R('allg','credits')*run.crMul;
  run.credits+=bonus;run.medals+=(2+run.wave*.4)*run.mult*R('allg','medals')*run.mdMul;run.lastBonus=Math.round(bonus);
  laser.on=0;act.luft=act.barrage=null;hold=null;exitPlacing();
  endGuided();run.ev=null;if(run.blackout>0){run.blackout=0;$('app').classList.remove('blackout')}
  bankMedals();run.wave++;SFX.waveClear();
  openRunShop(false);
}
function endRun(died,title){
  if(!run||phase==='over')return;
  bankMedals();M.best=Math.max(M.best,run.wave);M.bestAll=Math.max(M.bestAll,M.best);saveMeta();
  phase='over';halted=false;hold=null;exitPlacing();endGuided();if(died)SFX.gameOver();
  $('overTitle').textContent=title||(died?'Schildgenerator zerstört':'Run beendet');
  const sum=$('overSum');sum.innerHTML='';
  [['Erreichte Welle',run.wave],['Abschüsse',fmt(run.kills)],['Stufe',run.level],['Medaillen verdient',fmt(run.medals)],['Medaillen gesamt',fmt(M.medals)]].forEach(([a,b])=>{sum.appendChild(el('dt','',a));sum.appendChild(el('dd','',String(b)))});
  $('bAgain').hidden=$('overMP').hidden=true;$('bToMenu').textContent='Zum Menü';
  if(MP)mpOverShown();
  showOv('ovOver');
}
function toMenu(){
  if(MP)mpLeave();
  clearAll();run=null;tutState=null;phase='menu';halted=false;
  $('side').hidden=$('abilBar').hidden=$('orders').hidden=true;$('coach').hidden=true;$('app').classList.remove('inrun');
  structs.length=0;buildBaseGuns(0);
  renderMenu();showOv('ovMenu');updHud();
}
function setPause(on){
  if(!play()||!$('ovLevel').hidden)return;
  halted=on&&!MP;hold=null;
  if(on){const s=$('pauseSum');s.innerHTML='';
    [['Welle',run.wave],['Abschüsse',fmt(run.kills)],['Medaillen in diesem Run',fmt(run.medals)]].forEach(([a,b])=>{s.appendChild(el('dt','',a));s.appendChild(el('dd','',String(b)))});
    $('bQuit').textContent=run.tut?'Tutorial beenden':'Run beenden';
    showOv('ovPause')}
  else{showOv(null);last=performance.now()}
}

/* ---------- Level-up ---------- */
function ownedIds(){
  const o=[...run.weapons,...ABILITY_IDS.filter(i=>M.unlocked[i]),...SUPPORT_IDS.filter(i=>M.unlocked[i]),'basis'];
  if(M.unlocked.trupp||M.unlocked.kaserne)o.push('soldat');if(M.unlocked.mech)o.push('mechunit');if(run.cmd)o.push(run.cmd.id);return o;
}
function showLevelUp(){
  halted=!MP;hold=null;SFX.levelUp();
  const n=Math.round(R('allg','choices'));
  const pool=shuffle(WEAPON_IDS.filter(id=>M.unlocked[id]&&!run.weapons.includes(id)));
  const cards=pool.slice(0,n).map(id=>({type:'weapon',id}));
  if(cards.length<n){
    const ups=[];for(const id of ownedIds())for(const k of ITEMS[id].stats)if(STAT[k].rMax>runLv(run,id,k))ups.push({type:'up',id,k});
    for(const u of shuffle(ups)){if(cards.length>=n)break;cards.push(u)}
  }
  if(!cards.length)cards.push({type:'cr'});
  $('lvlTitle').textContent=`Stufe ${run.level-run.pending+1} erreicht`;
  $('lvlText').textContent=cards[0].type==='weapon'?'Wähle eine neue Waffe für diesen Run.':'Alle freigeschalteten Waffen sind an Bord. Wähle eine Gratis-Verbesserung.';
  const box=$('lvlCards');box.innerHTML='';
  cards.forEach((c,i)=>{
    const b=el('button','card');
    if(c.type==='weapon'){const it=ITEMS[c.id];b.innerHTML=`<span class="ty">Neue Waffe</span><b>${it.name}</b><span>${it.desc}</span>`}
    else if(c.type==='up'){const it=ITEMS[c.id],st=STAT[c.k],L=metaLv(c.id,c.k)+runLv(run,c.id,c.k);b.innerHTML=`<span class="ty">Gratis-Verbesserung</span><b>${it.name}: ${st.n}</b><span>${fmtStat(c.k,statAt(c.id,c.k,L))} → ${fmtStat(c.k,statAt(c.id,c.k,L+1))}</span>`}
    else b.innerHTML=`<span class="ty">Bonus</span><b>${fmt(100*run.mult)} Credits</b><span>Für den nächsten Einkauf im Upgrade-Menü.</span>`;
    if(isPC)b.insertAdjacentHTML('beforeend',`<span class="kbd" style="align-self:flex-start">${i+1}</span>`);
    b.onclick=()=>pickLevel(c);box.appendChild(b);
  });
  showOv('ovLevel');
}
function pickLevel(c){
  if(c.type==='weapon'){run.weapons.push(c.id);toast(ITEMS[c.id].name+' an Bord');buildSlots();if(MP)mpBought('Neue Waffe: '+ITEMS[c.id].short)}
  else if(c.type==='up'){run.lv[lvKey(c.id,c.k)]=(run.lv[lvKey(c.id,c.k)]||0)+1;afterUpgrade(c.id,c.k,1)}
  else run.credits+=100*run.mult;
  run.pending--;
  if(run.pending>0)showLevelUp();else{halted=false;showOv(null);last=performance.now()}
}
function afterUpgrade(id,k,delta){
  if(id==='kanone'&&k==='twin')buildTurrets(1+Math.round(R('kanone','twin')));
  if(id==='kanone'&&k==='ammo'&&run){const nm=R('kanone','ammo');run.ammo=Math.min(nm,run.ammo+nm-run.ammoMax);run.ammoMax=nm}
  if(id==='basis'&&k==='turret')buildBaseGuns(Math.round(R('basis','turret')));
  if(id==='basis'&&k==='maxhp'&&run){const mx=R('basis','maxhp');run.hp=Math.min(mx,run.hp+mx*.2/(1+.2*delta))}
  if(id==='basis'&&k==='ring'&&run&&phase==='shop')rebuildRing();
  if(id==='mechunit')refreshMyMechs();
  if(id==='marine')refreshMarines();
  if(run&&run.cmd&&id===run.cmd.id&&k==='hp'&&!run.cmd.jet&&!run.cmd.dead){const c=run.cmd,r=c.hp/c.max;c.max=cmdStat('hp');c.hp=r*c.max}
}

/* =========================================================
   Oberfläche im Run
   ========================================================= */
const slotEls={w:{},s:{},a:{}};
function buildSlots(){
  if(!run)return;
  const wl=$('wpnList');wl.innerHTML='';slotEls.w={};
  run.weapons.forEach((id,i)=>{
    const b=el('button','slot',`<span class="sn">${ITEMS[id].short}</span><span class="sk"></span><span class="heat"><i></i></span>`);
    if(id==='kanone'&&!run.tut)b.insertAdjacentHTML('beforeend','<span class="ammo"><i></i></span>');
    b.onclick=()=>selWeapon(id);wl.appendChild(b);slotEls.w[id]={b,k:b.querySelector('.sk'),h:b.querySelector('.heat i'),am:b.querySelector('.ammo i'),key:String(i+1)};
  });
  slotEls.am=null;
  if(!run.tut){const ab=el('button','slot',`<span class="sn">Nachschub</span><span class="sk"></span>`);ab.onclick=requestAmmo;wl.appendChild(ab);slotEls.am={b:ab,k:ab.querySelector('.sk')}}
  const sl=$('supList');sl.innerHTML='';slotEls.s={};
  const sups=SUPPORT_IDS.filter(id=>M.unlocked[id]);$('supHead').hidden=!sups.length;
  sups.forEach(id=>{
    const b=el('button','slot',`<span class="sn">${ITEMS[id].short}</span><span class="sk"></span>`);
    b.onclick=()=>{if(run.placing===id)exitPlacing();else enterPlacing(id)};sl.appendChild(b);slotEls.s[id]={b,k:b.querySelector('.sk')};
  });
  const cl=$('cmdList');cl.innerHTML='';slotEls.c=null;$('cmdHead').hidden=!run.cmd;
  if(run.cmd){const it=ITEMS[run.cmd.id];
    const mv=el('button','slot',`<span class="sn">${it.short}</span><span class="sk"></span><span class="heat hpb"><i></i></span>`);
    mv.onclick=()=>{if(run.placing==='cmdmove')exitPlacing();else enterPlacing('cmdmove')};cl.appendChild(mv);
    const ab2=el('button','slot',`<span class="sn">${it.abil}</span><span class="sk"></span>`);ab2.onclick=useCmdAbility;cl.appendChild(ab2);
    slotEls.c={mv,mk:mv.querySelector('.sk'),hp:mv.querySelector('.heat i'),ab:ab2,ak:ab2.querySelector('.sk')};}
  const ab=$('abilBar');ab.innerHTML='';slotEls.a={};
  ABILITY_IDS.filter(id=>M.unlocked[id]).forEach(id=>{
    const b=el('button','ab',`<span class="an">${ITEMS[id].short}</span><span class="ak"></span>${id==='rakete'?'':'<span class="auto" title="Automatik">A</span>'}`);
    b.onclick=ev=>{if(ev.target.classList.contains('auto')){toggleAuto(id);return}useAbility(id)};ab.appendChild(b);slotEls.a[id]={b,k:b.querySelector('.ak'),au:b.querySelector('.auto')};
  });
  updSlots();
}
function selWeapon(id){if(!run||!run.weapons.includes(id))return;run.sel=id;updSlots()}
function updSlots(){
  if(!run)return;
  if(slotEls.c&&run.cmd){const c=run.cmd,sc=slotEls.c,cd=run.cd.cmd||0,mx=cmdStat('cd')||1;
    sc.mv.classList.toggle('placing',run.placing==='cmdmove');
    sc.mk.textContent=c.dead?'zurück in '+Math.ceil(c.respawn)+' s':isPC?'Rechtsklick':'Bewegen';
    sc.hp.style.width=(c.jet?100:Math.max(0,c.hp/c.max*100))+'%';
    sc.ab.style.setProperty('--cd',cd>0?(cd/mx).toFixed(3):0);sc.ab.classList.toggle('ready',cd<=0&&!c.dead&&play());
    sc.ak.textContent=cd>0?Math.ceil(cd)+' s':isPC?'Taste K':'Bereit'}
  for(const id in slotEls.w){const s=slotEls.w[id],h=run.heat[id]||0,over=!!run.over[id];
    s.b.classList.toggle('sel',run.sel===id);s.b.classList.toggle('over',over);s.h.style.width=h+'%';
    s.k.textContent=over?'Überhitzt':isPC?'Taste '+s.key:(run.sel===id?'Aktiv':'');
    if(s.am){const r=run.ammoMax?run.ammo/run.ammoMax:1;s.am.style.width=(r*100)+'%';s.b.classList.toggle('empty',run.ammo<1);if(run.ammo<1)s.k.textContent='Leer';else if(!over)s.k.textContent=Math.ceil(run.ammo)+' Schuss'}}
  if(slotEls.am){const a=slotEls.am,cd=run.cd.ammo||0,low=run.ammoMax&&run.ammo/run.ammoMax<.25;
    a.b.style.setProperty('--cd',cd>0&&!ammoShips.length?(cd/20).toFixed(3):0);a.b.classList.toggle('low',!!low&&!ammoShips.length&&cd<=0);a.b.classList.toggle('ready',cd<=0&&!ammoShips.length&&play());
    a.k.textContent=ammoShips.length?'Unterwegs':cd>0?Math.ceil(cd)+' s':isPC?'Leertaste':'Anfordern'}
  for(const id in slotEls.s){const s=slotEls.s[id],cd=run.cd[id]||0,max=R(id,'cd');
    s.b.style.setProperty('--cd',cd>0?(cd/max).toFixed(3):0);s.b.classList.toggle('ready',cd<=0&&play());s.b.classList.toggle('placing',run.placing===id);
    s.k.textContent=cd>0?Math.ceil(cd)+' s':isPC?'Taste '+ITEMS[id].key:'Bereit'}
  for(const id in slotEls.a){const s=slotEls.a[id],cd=run.cd[id]||0,max=R(id,'cd');
    const active=(id==='laser'&&laser.on>0)||(id==='luft'&&act.luft)||(id==='barrage'&&act.barrage);
    s.b.style.setProperty('--cd',cd>0&&!active?(cd/max).toFixed(3):0);s.b.classList.toggle('ready',cd<=0&&play());s.b.classList.toggle('active',!!active);
    s.k.textContent=active?'Aktiv':cd>0?Math.ceil(cd)+' s':isPC?ITEMS[id].key:'Bereit';if(s.au)s.au.classList.toggle('on',!!autoAb[id])}
  const n=soldiers.filter(s=>!s.dead&&(s.own||0)===myOwn()).length;
  const nm=mechs.filter(m=>!m.dead&&(m.own||0)===myOwn()).length;
  const nr=marines.filter(u=>!u.dead&&(u.own||0)===myOwn()).length;
  $('orders').hidden=!run||(!n&&!nm&&!nr);$('ordSol').hidden=!n;$('ordMech').hidden=!nm;$('ordMar').hidden=!nr;
  $('ordRCnt').innerHTML='<span class="cl">Marines </span>'+nr;
  ['attack','hold','retreat','auto'].forEach((o,i)=>$(['rAttack','rHold','rRetreat','rAuto'][i]).classList.toggle('on',run.marOrder===o));
  $('ordCnt').innerHTML='<span class="cl">Trupp </span>'+n;$('ordMCnt').innerHTML='<span class="cl">Mech </span>'+nm;$('ordCnt').title='Trupp: '+n;$('ordMCnt').title='Mechs: '+nm;
  ['attack','hold','retreat','auto'].forEach((o,i)=>{$(['oAttack','oHold','oRetreat','oAuto'][i]).classList.toggle('on',run.order===o);$(['mAttack','mHold','mRetreat','mAuto'][i]).classList.toggle('on',run.mechOrder===o)});
}
function setOrder(o){if(!run)return;run.order=o;updSlots();toast('Befehl: '+{attack:'Angriff',hold:'Stellung halten',retreat:'Rückzug',auto:'Autonom'}[o]);if(tutState&&o==='attack')tutState.used.order=true}
function setOrdCollapsed(c){$('orders').classList.toggle('collapsed',c);$('ordToggle').setAttribute('aria-expanded',String(!c));$('ordToggle').querySelector('span').textContent=c?'Befehle einblenden':'Befehle';ls.set('orbitalbrigade-ordcol',c?'1':'0')}
$('ordToggle').onclick=()=>setOrdCollapsed(!$('orders').classList.contains('collapsed'));
setOrdCollapsed(ls.get('orbitalbrigade-ordcol')==='1');
function setMechOrder(o){if(!run)return;run.mechOrder=o;updSlots();toast('Mechs: '+{attack:'Angriff',hold:'Stellung halten',retreat:'Rückzug',auto:'Autonom'}[o])}
$('mAttack').onclick=()=>setMechOrder('attack');$('mHold').onclick=()=>setMechOrder('hold');$('mRetreat').onclick=()=>setMechOrder('retreat');$('mAuto').onclick=()=>setMechOrder('auto');
$('oAttack').onclick=()=>setOrder('attack');$('oRetreat').onclick=()=>setOrder('retreat');$('oAuto').onclick=()=>setOrder('auto');$('oHold').onclick=()=>setOrder('hold');
function enterPlacing(id){
  if(!run||!play()||halted)return;
  if(id==='cmdmove'){const c=run.cmd;if(!c||c.dead){SFX.deny();return}if(!run.placing)SFX.slowSwoosh(true);run.placing=id;hold=null;$('place').hidden=false;
    $('placeText').textContent=`${ITEMS[c.id].name}: ${isPC?'Klick':'Tippe'} auf das Ziel${c.jet?' für seine Kreisbahn':''}`;updSlots();return}
  if(powerOut())return;
  if(run.cd[id]>0){SFX.deny();toast(ITEMS[id].name+': noch '+Math.ceil(run.cd[id])+' s');return}
  if(!run.placing)SFX.slowSwoosh(true);
  run.placing=id;hold=null;$('place').hidden=false;
  $('placeText').textContent=isPC?`${ITEMS[id].name}: Klick auf den Boden, Rechtsklick bricht ab`:`${ITEMS[id].name}: Tippe auf den Boden`;
  updSlots();
}
function exitPlacing(){if(run&&run.placing)SFX.slowSwoosh(false);if(run)run.placing=null;$('place').hidden=true;ghost.visible=false;updSlots()}
$('placeCancel').onclick=exitPlacing;
function updHud(){
  if(!run){$('hWave').textContent='–';$('hCr').textContent='–';$('hLvl').textContent='–';$('hXp').style.width='0%';$('hHull').textContent='–';$('hBar').style.width='100%';$('hBar').classList.remove('low');return}
  const mx=MP&&MP.role==='guest'?(MP.hostMax||100):R('basis','maxhp');
  $('hWave').textContent=run.wave;$('hCr').textContent=fmt(run.credits);$('hLvl').textContent=run.level;
  $('hXp').style.width=Math.min(100,run.xp/xpNeed(run.level)*100)+'%';
  $('hHull').textContent=Math.ceil(run.hp);const p=Math.max(0,run.hp/mx);$('hBar').style.width=p*100+'%';$('hBar').classList.toggle('low',p<.3);
}

/* ---------- Run-Shop ---------- */
let runCat='basis';
function openRunShop(prep){
  phase='shop';halted=false;exitPlacing();
  $('runTitle').textContent=prep?`Vorbereitung für Welle ${run.wave}`:`Welle ${run.wave-1} geschafft · +${fmt(run.lastBonus)} Credits`;
  $('bNext').textContent=`Welle ${run.wave} starten`;
  if(MP)mpShopLabel();
  if(!runCats().some(c=>c.id===runCat))runCat=runCats()[0].id;
  renderRunShop();showOv('ovRun');updHud();
}
function runCats(){
  const c=[{id:'basis',label:'Schildgenerator',sub:'Basis'}];
  run.weapons.forEach(id=>c.push({id,label:ITEMS[id].name,sub:'Waffe'}));
  ABILITY_IDS.filter(id=>M.unlocked[id]).forEach(id=>c.push({id,label:ITEMS[id].name,sub:'Fähigkeit'}));
  SUPPORT_IDS.filter(id=>M.unlocked[id]).forEach(id=>c.push({id,label:ITEMS[id].name,sub:'Unterstützung'}));
  if(M.unlocked.trupp||M.unlocked.kaserne)c.push({id:'soldat',label:'Soldaten',sub:'Truppen'});
  if(M.unlocked.mech)c.push({id:'mechunit',label:'Mech',sub:'Bewaffnung'});
  if(run.cmd)c.push({id:run.cmd.id,label:ITEMS[run.cmd.id].name,sub:'Kommandant'});
  return c;
}
function pips(m,r,max){let h='<div class="pips">';for(let i=0;i<max;i++)h+=`<i class="${i<m?'meta':i<m+r?'on':''}"></i>`;return h+'</div>'}
function statRow(id,k,mode){
  const st=STAT[k],m=metaLv(id,k),r=mode==='run'?runLv(run,id,k):0,max=mode==='run'?st.rMax:st.mMax,cur=mode==='run'?r:m;
  const L=m+r,full=cur>=max,cost=mode==='run'?runCost(id,k,run):metaCost(id,k);
  const money=mode==='run'?run.credits:M.medals;
  const row=el('div','row');
  row.innerHTML=`<div class="nm">${st.n}<span class="lv">Stufe ${cur} / ${max}</span></div>
    <div class="ds">${full?'Maximale Stufe · '+fmtStat(k,statAt(id,k,L)):fmtStat(k,statAt(id,k,L))+' → '+fmtStat(k,statAt(id,k,L+1))}${st.d?' · '+st.d:''}</div>
    ${mode==='run'?pips(m,r,st.mMax+st.rMax):pips(m,0,st.mMax)}`;
  const b=el('button','buy',full?'Max':fmt(cost)+(mode==='run'?' Cr':' Med.'));
  b.disabled=full||money<cost;
  b.onclick=()=>{
    if(mode==='run'){if(run.credits<cost)return;run.credits-=cost;run.lv[lvKey(id,k)]=r+1;SFX.buy();
      if(MP)mpBought(ITEMS[id].short+' · '+st.n+' '+(r+1));
      if(MP&&MP.role==='guest'&&id==='basis')mpRequest('bu',k);else afterUpgrade(id,k,1);renderRunShop();updHud()}
    else{if(M.medals<cost)return;M.medals-=cost;M.lv[lvKey(id,k)]=m+1;SFX.buy();saveMeta();renderMeta()}
  };
  row.appendChild(b);return row;
}
function renderRunShop(){
  $('runCr').textContent=fmt(run.credits);
  const cats=$('runCats');cats.innerHTML='';
  runCats().forEach(c=>{const b=el('button','cat'+(c.id===runCat?' on':''),`<small>${c.sub}</small>${c.label}`);b.onclick=()=>{runCat=c.id;renderRunShop()};cats.appendChild(b)});
  const L=$('runList');L.innerHTML='';const it=ITEMS[runCat];
  L.appendChild(el('div','grouph',it.name));L.appendChild(el('div','note',it.desc));
  if(runCat==='basis'){
    const mx=R('basis','maxhp'),cost=Math.round(10+run.wave*3),full=run.hp>=mx-.5;
    const row=el('div','row',`<div class="nm">Schild reparieren</div><div class="ds">${Math.ceil(run.hp)} / ${Math.round(mx)} · stellt 30 % wieder her</div>`);
    const b=el('button','buy',full?'Voll':cost+' Cr');b.disabled=full||run.credits<cost;
    b.onclick=()=>{SFX.buy();run.credits-=cost;run.hp=Math.min(mx,run.hp+mx*.3);renderRunShop();updHud()};row.appendChild(b);L.appendChild(row);
  }
  for(const k of it.stats)if(STAT[k].rMax>0)L.appendChild(statRow(runCat,k,'run'));
  L.scrollTop=0;
}
$('bNext').onclick=()=>{if(run&&phase==='shop'){if(MP)mpNext();else startWave()}};
$('bRunEnd').onclick=()=>endRun(false);

/* ---------- Menü-Shop ---------- */
let metaTab='weapon',metaSub='weapon';
const META_TABS_BASE=[['ability','Fähigkeiten'],['weapon','Waffen'],['support','Unterstützung'],['base','Basis'],['upgrade','Verbesserungen']];
let metaCmd='cmd_kom';
const META_SUBS=[['weapon','Waffen'],['ability','Fähigkeiten'],['support','Unterstützung'],['general','Allgemein']];
function renderMeta(){
  $('metaMedals').textContent=fmt(M.medals);
  const tabs=$('metaTabs');tabs.innerHTML='';
  const META_TABS=M.rebirths>0?[['cmd','Kommandanten'],...META_TABS_BASE]:META_TABS_BASE;
  if(metaTab==='cmd'&&!M.rebirths)metaTab='weapon';
  $('metaMedals').textContent=fmt(M.medals)+(M.rebirths?' · '+M.stars+' Sterne':'');
  META_TABS.forEach(([k,n])=>{const b=el('button','tab'+(metaTab===k?' on':''),n);b.onclick=()=>{metaTab=k;renderMeta()};tabs.appendChild(b)});
  const sub=$('metaSub');sub.hidden=metaTab!=='upgrade'&&metaTab!=='cmd';sub.innerHTML='';
  if(metaTab==='cmd')CMD_IDS.forEach(k=>{const b=el('button','tab'+(metaCmd===k?' on':''),ITEMS[k].name);b.onclick=()=>{metaCmd=k;renderMeta()};sub.appendChild(b)});
  if(metaTab==='upgrade')META_SUBS.forEach(([k,n])=>{const b=el('button','tab'+(metaSub===k?' on':''),n);b.onclick=()=>{metaSub=k;renderMeta()};sub.appendChild(b)});
  const L=$('metaList');L.innerHTML='';
  if(metaTab==='cmd'){renderCmdTab(L);return}
  if(metaTab==='weapon'||metaTab==='ability'||metaTab==='support'){
    L.appendChild(el('div','note',{weapon:'Freigeschaltete Waffen können bei Level-ups im Run zur Auswahl kommen. Die Bordkanone hast du immer dabei.',ability:'Freigeschaltete Fähigkeiten hast du ab jedem Run sofort in der Leiste unten.',support:'Freigeschaltete Unterstützungen hast du ab jedem Run rechts unter den Waffen. Platzierte Gebäude bleiben, bis sie zerstört werden.'}[metaTab]));
    Object.values(ITEMS).filter(i=>i.kind===metaTab).sort((a,b)=>(a.rb||0)-(b.rb||0)).forEach(it=>{
      const own=!!M.unlocked[it.id],lockRb=(it.rb||0)>M.rebirths;
      const row=el('div','row',`<div class="nm">${it.name}${it.rb?`<span class="lv">Wiedergeburt ${it.rb}</span>`:''}${!isPC||!it.key?'':`<span class="lv">Taste ${it.key}</span>`}</div><div class="ds">${it.desc}</div>`);
      const b=el('button','buy'+(own?' owned':'')+(lockRb?' rb':''),own?'Freigeschaltet':lockRb?'Ab Wiedergeburt '+it.rb:'Freischalten · '+fmt(it.unlock));
      b.disabled=own||lockRb||M.medals<it.unlock;
      b.onclick=()=>{if(M.medals<it.unlock)return;M.medals-=it.unlock;M.unlocked[it.id]=1;SFX.unlockJingle();saveMeta();renderMeta();toast(it.name+' freigeschaltet')};
      row.appendChild(b);L.appendChild(row);
    });
  }else if(metaTab==='base'){
    L.appendChild(el('div','note','Dauerhafte Verbesserungen für deinen Schildgenerator. Sie gelten ab jedem Run.'));
    ITEMS.basis.stats.forEach(k=>L.appendChild(statRow('basis',k,'meta')));
  }else{
    L.appendChild(el('div','note','Verbessere alles, was du freigeschaltet hast. Jede Stufe gilt dauerhaft für jeden Run, zusätzlich zu den Credits-Upgrades im Run.'));
    let ids=[];
    if(metaSub==='weapon')ids=WEAPON_IDS.filter(i=>M.unlocked[i]);
    else if(metaSub==='ability')ids=ABILITY_IDS.filter(i=>M.unlocked[i]);
    else if(metaSub==='support'){ids=SUPPORT_IDS.filter(i=>M.unlocked[i]);if(M.unlocked.trupp||M.unlocked.kaserne)ids.push('soldat');if(M.unlocked.mech)ids.push('mechunit')}
    else ids=['allg'];
    if(!ids.length)L.appendChild(el('div','note','Hier ist noch nichts freigeschaltet.'));
    ids.forEach(id=>{L.appendChild(el('div','grouph',ITEMS[id].name));ITEMS[id].stats.forEach(k=>{if(STAT[k].mMax>0)L.appendChild(statRow(id,k,'meta'))})});
  }
}
$('bShop').onclick=()=>{renderMeta();showOv('ovMeta')};
$('bMetaClose').onclick=()=>{renderMenu();showOv('ovMenu')};

/* ---------- Hauptmenü und Startwelle ---------- */
function renderCmdTab(L){
  const id=metaCmd,it=ITEMS[id],own=!!M.cmdOwned[id],sel=M.cmdSel===id;
  L.appendChild(el('div','note','Kommandanten sind ab Beginn jedes Runs auf dem Feld. Du kannst immer nur einen auswählen. Schick ihn mit „Bewegen“ oder per Rechtsklick an einen Ort.'));
  const head=el('div','row',`<div class="nm">${it.name}<span class="lv">Fähigkeit: ${it.abil}</span></div><div class="ds">${it.desc}</div>`);
  const b=el('button','buy'+(sel?' owned':''),!own?'Freischalten · '+it.stars+' ★':sel?'Ausgewählt':'Auswählen');
  b.disabled=sel||(!own&&M.stars<it.stars);
  b.onclick=()=>{if(!own){if(M.stars<it.stars)return;M.stars-=it.stars;M.cmdOwned[id]=1;SFX.unlockJingle()}M.cmdSel=id;saveMeta();renderMeta()};
  head.appendChild(b);L.appendChild(head);
  if(!own)return;
  L.appendChild(el('div','grouph','Verbesserungen (Medaillen, bleiben bei Wiedergeburt)'));
  it.stats.forEach(k=>{if(STAT[k].mMax>0)L.appendChild(statRow(id,k,'meta'))});
  L.appendChild(el('div','grouph','Verzauberungen (Sterne)'));
  L.appendChild(el('div','note','Wirken nur, solange dieser Kommandant ausgewählt ist.'));
  (ENCH[id]||[]).forEach(en=>{
    const lv=enchLv(id,en.k),full=lv>=en.max,cost=enchCost(lv);
    const fmtE=v=>en.k==='squad'?'+'+Math.round(v):'+'+Math.round(v*100)+' %';
    const row=el('div','row',`<div class="nm">${en.n}<span class="lv">Stufe ${lv} / ${en.max}</span></div><div class="ds">${full?'Maximal · '+fmtE(lv*en.per):fmtE(lv*en.per)+' → '+fmtE((lv+1)*en.per)} · ${en.d}</div>`);
    const bb=el('button','buy',full?'Max':cost+' ★');bb.disabled=full||M.stars<cost;
    bb.onclick=()=>{if(M.stars<cost)return;M.stars-=cost;M.ench[id+'.'+en.k]=lv+1;saveMeta();SFX.buy();renderMeta()};
    row.appendChild(bb);L.appendChild(row);
  });
}
function renderRebirth(){
  const can=M.best>=REBIRTH_MIN,gain=rebirthStars(M.best);
  $('rbText').textContent=can?`Du startest von vorn, wirst aber dauerhaft stärker und bekommst ${gain} Sterne. Mit Sternen schaltest du Kommandanten und Verzauberungen frei.`
    :`Erreiche in diesem Durchgang Welle ${REBIRTH_MIN}, um wiedergeboren zu werden. Dein Rekord gerade: Welle ${M.best}.`;
  const s=$('rbSum');s.innerHTML='';const n=M.rebirths;
  [['Wiedergeburten',n+' → '+(n+1)],['Schaden',`+${n*25} % → +${(n+1)*25} %`],['Credits und Medaillen',`+${n*20} % → +${(n+1)*20} %`],['Sterne',M.stars+' → '+(M.stars+(can?gain:0))]]
    .forEach(([a,b])=>{s.appendChild(el('dt','',a));s.appendChild(el('dd','',b))});
  $('rbGo').disabled=!can;$('rbGo').textContent='Wiedergeburt durchführen';$('rbGo').dataset.arm='';
}
$('bRebirth').onclick=()=>{renderRebirth();showOv('ovRebirth')};
$('rbBack').onclick=()=>{renderMenu();showOv('ovMenu')};
$('rbGo').onclick=()=>{
  if(M.best<REBIRTH_MIN)return;
  if(!$('rbGo').dataset.arm){$('rbGo').dataset.arm='1';$('rbGo').textContent='Wirklich? Tippe zum Bestätigen';return}
  const g=doRebirth();SFX.levelUp();toast(`Wiedergeburt ${M.rebirths}: +${g} Sterne`);renderMenu();showOv('ovMenu');
};
function renderMenu(){
  $('mMedals').textContent=fmt(M.medals);
  $('mBest').textContent=M.best>0?`Rekord: Welle ${M.best}`:'Noch kein Rekord';
  $('bTut').textContent=M.tut?'Tutorial':'Tutorial (empfohlen)';
  $('bTut').className=M.tut?'btn ghost':'btn';$('bPlay').className=M.tut?'btn':'btn ghost';
  $('bRebirth').hidden=!(M.rebirths>0||M.best>=REBIRTH_MIN-10);
  $('bRebirth').textContent=M.best>=REBIRTH_MIN?'Wiedergeburt bereit':'Wiedergeburt';
  $('bRebirth').className=M.best>=REBIRTH_MIN?'btn':'btn ghost';
  $('mRebirth').hidden=!M.rebirths;
  $('mRebirth').textContent=`Wiedergeburt ${M.rebirths} · ${M.stars} Sterne · Schaden +${M.rebirths*25} %, Geld +${M.rebirths*20} %`+(M.cmdSel&&M.cmdOwned[M.cmdSel]?' · Kommandant: '+ITEMS[M.cmdSel].name:'');
  if(M.bestAll>M.best)$('mBest').textContent+=` · Allzeit: Welle ${M.bestAll}`;
}
$('bPlay').onclick=()=>{
  const opts=[1];for(let w=21;w<=M.best;w+=20)opts.push(w);
  if(opts.length===1){startRun(1);return}
  const L=$('waveList');L.innerHTML='';
  opts.forEach(w=>{const m=1+(w-1)/20*.6;const b=el('button','wv',`<b>Welle ${w}</b><span>Belohnung ×${m.toLocaleString('de-DE',{maximumFractionDigits:1})}</span>${w>1?`<span>+${fmt(R('allg','startcr')+(w-1)*22)} Startcredits</span>`:''}`);b.onclick=()=>startRun(w);L.appendChild(b)});
  showOv('ovStartSel');
};
$('bStartBack').onclick=()=>showOv('ovMenu');
$('bTut').onclick=()=>startRun(1,true);
$('bKeys').onclick=()=>showOv('ovKeys');
$('bKeysBack').onclick=()=>showOv('ovMenu');
$('bDevice').onclick=()=>showOv('ovDevice');
$('bReset').onclick=()=>{$('rsGo').dataset.arm='';$('rsGo').textContent='Alles löschen';showOv('ovReset')};
$('rsBack').onclick=()=>{renderMenu();showOv('ovMenu')};
$('rsGo').onclick=()=>{
  if(!$('rsGo').dataset.arm){$('rsGo').dataset.arm='1';$('rsGo').textContent='Wirklich alles löschen? Nochmal tippen';return}
  fullReset();autoAb={};renderMenu();showOv('ovMenu');toast('Spielstand komplett zurückgesetzt');
};
if(unlockRefund)setTimeout(()=>toast('Einige Freischaltungen brauchen jetzt eine Wiedergeburt. '+fmt(unlockRefund)+' Medaillen erstattet'),800);
$('bToMenu').onclick=toMenu;
$('bResume').onclick=()=>setPause(false);
$('bQuit').onclick=()=>{if(run&&run.tut){endTutorial();return}halted=false;endRun(false)};
$('bMenu').onclick=()=>{if(play())setPause($('ovPause').hidden)};

/* =========================================================
   Tutorial
   ========================================================= */
const TUT=[
  {title:'Feuern',hl:'wpn',
   pc:'Klick mit der linken Maustaste auf die Käfer, halten gibt Dauerfeuer. Rechts siehst du deine Waffe mit Hitzeanzeige. Überhitzt sie, musst du kurz warten.',
   mob:'Tippe auf die Käfer, um zu feuern, Finger halten gibt Dauerfeuer. Rechts siehst du deine Waffe mit Hitzeanzeige. Überhitzt sie, musst du kurz warten.',
   spawn(){for(let i=0;i<3;i++)spawnEnemy('kraul',(i-1)*6,14,true)}},
  {title:'Fähigkeiten',need:'orbital',hl:'ab:orbital',
   pc:'Unten liegen deine Fähigkeiten. Sie zielen selbst und laden sich danach wieder auf. Drück Q für den Orbitalschlag.',
   mob:'Unten liegen deine Fähigkeiten. Sie zielen selbst und laden sich danach wieder auf. Tippe auf „Orbital“.',
   spawn(){for(let i=0;i<7;i++)spawnEnemy('kraul',(rnd()-.5)*20,12+rnd()*12,true)}},
  {title:'Unterstützung',need:'trupp',hl:'sup:trupp',
   pc:'Rechts unter den Waffen liegen deine Unterstützungen. Zeig mit der Maus auf den Boden und drück A. Der Drop-Pod bohrt sich in den Boden und deine Soldaten steigen oben aus.',
   mob:'Rechts unter den Waffen liegen deine Unterstützungen. Tippe auf „Trupp“ und dann auf den Boden. Der Drop-Pod bohrt sich in den Boden und deine Soldaten steigen oben aus.',
   spawn(){for(let i=0;i<5;i++)spawnEnemy('kraul',(rnd()-.5)*18,20+rnd()*10,true)}},
  {title:'Befehle',need:'order',hl:'orders',
   pc:'Unten links gibst du deinen Soldaten Befehle: Angriff (X) stürmt los, Stellung halten (B) patrouilliert auf der Feldmitte mit mehr Schaden und Reichweite, Rückzug (C) verteidigt den Generator, Autonom (V) entscheidet selbst. Schick sie jetzt mit Angriff los.',
   mob:'Unten links gibst du deinen Soldaten Befehle: Angriff stürmt los, Stellung patrouilliert auf der Feldmitte mit mehr Schaden und Reichweite, Rückzug verteidigt den Generator, Autonom entscheidet selbst. Tippe jetzt auf „Angriff“.',
   spawn(){for(let i=0;i<6;i++)spawnEnemy('kraul',(rnd()-.5)*20,22+rnd()*10,true)}},
  {title:'Level-ups, Shop und Medaillen',final:true,
   pc:'Für Abschüsse sammelst du Erfahrung. Ist die gelbe Leiste oben voll, wählst du eine neue Waffe für den Run. Nach jeder Welle kaufst du mit Credits Verbesserungen. Endet der Run, nimmst du Medaillen mit ins Menü und schaltest im Shop neue Waffen, Fähigkeiten und Unterstützungen frei.',
   mob:'Für Abschüsse sammelst du Erfahrung. Ist die gelbe Leiste oben voll, wählst du eine neue Waffe für den Run. Nach jeder Welle kaufst du mit Credits Verbesserungen. Endet der Run, nimmst du Medaillen mit ins Menü und schaltest im Shop neue Waffen, Fähigkeiten und Unterstützungen frei.'},
];
function setPulse(hl){
  document.querySelectorAll('.pulse').forEach(e=>e.classList.remove('pulse'));
  if(!hl)return;
  if(hl==='wpn'&&slotEls.w.kanone)slotEls.w.kanone.b.classList.add('pulse');
  else if(hl==='orders')$('orders').classList.add('pulse');
  else{const [t,id]=hl.split(':');const s=(t==='ab'?slotEls.a:slotEls.s)[id];if(s)s.b.classList.add('pulse')}
}
function showStep(retry){
  const st=TUT[tutState.step];
  $('coachStep').textContent=`Tutorial · Schritt ${tutState.step+1} von ${TUT.length}`;
  $('coachTitle').textContent=st.title;
  $('coachText').textContent=(retry?'Noch einmal, diesmal so wie beschrieben. ':'')+(isPC?st.pc:st.mob);
  $('coachBtn').hidden=!st.final;$('coach').hidden=false;setPulse(st.hl);
}
function startTutorial(){tutState={step:0,used:{}};showStep();TUT[0].spawn()}
function tutCheck(){
  if(!tutState)return;const st=TUT[tutState.step];
  if(st.final||enemies.length||pods.length&&!pods.every(p=>p.landed))return;
  if(st.need&&!tutState.used[st.need]){if(st.need!=='order')run.cd[st.need]=0;showStep(true);st.spawn();return}
  tutState.step++;tutState.used={};const nx=TUT[tutState.step];
  for(const k in run.cd)run.cd[k]=0;
  showStep();if(nx.spawn)nx.spawn();
}
function endTutorial(){M.tut=1;saveMeta();setPulse(null);toMenu()}
$('coachBtn').onclick=endTutorial;
$('coachSkip').onclick=endTutorial;

/* =========================================================
   Eingabe
   ========================================================= */
const ray=new THREE.Raycaster(),ndc=new THREE.Vector2(),gplane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
function groundAt(ev){
  const r=cv.getBoundingClientRect();
  ndc.set((ev.clientX-r.left)/r.width*2-1,-((ev.clientY-r.top)/r.height)*2+1);
  ray.setFromCamera(ndc,camera);
  const p=new THREE.Vector3();if(!ray.ray.intersectPlane(gplane,p))return null;
  clampField(p);p.y=.5;return p;
}
cv.addEventListener('contextmenu',ev=>ev.preventDefault());
cv.addEventListener('mousedown',ev=>{if(ev.button===1)ev.preventDefault()});
cv.addEventListener('pointerdown',ev=>{
  if(ev.button===1&&run&&play()&&!halted&&!guided){ev.preventDefault();const p=groundAt(ev);if(p)tryMark(p);return}
  if(guided&&run&&play()&&!halted){if(ev.button===2){detonateGuided();return}setSteer(ev);steer.boost=ev.pointerType==='mouse';try{cv.setPointerCapture(ev.pointerId)}catch(e){}return}
  if(!run||!play()||halted)return;const p=groundAt(ev);if(!p)return;
  if(ev.pointerType==='mouse')mouse.p=p;
  if(ev.button===2){if(run.placing)exitPlacing();else if(run.cmd)setCmdGoal(p);return}
  if(ev.button!==0)return;
  if(run.placing==='cmdmove'){setCmdGoal(p);exitPlacing();return}
  if(run.placing){if(trySupport(run.placing,p))exitPlacing();return}
  cv.setPointerCapture(ev.pointerId);hold=p;
});
cv.addEventListener('pointermove',ev=>{
  if(guided){if(ev.pointerType==='mouse'||ev.buttons)setSteer(ev);return}
  const p=(hold||ev.pointerType==='mouse')?groundAt(ev):null;
  if(ev.pointerType==='mouse')mouse.p=p;
  if(hold&&p)hold=p;
});
cv.addEventListener('pointerleave',ev=>{if(ev.pointerType==='mouse'&&!hold)mouse.p=null});
['pointerup','pointercancel','lostpointercapture'].forEach(n=>cv.addEventListener(n,ev=>{hold=null;steer.boost=false;if(guided&&ev.pointerType!=='mouse'){steer.x=steer.y=0;$('rkDot').style.left=$('rkDot').style.top='50%'}}));
addEventListener('keyup',e=>{if(e.key===' ')steer.kb=false});
/* Zoom mit dem Mausrad: hinein auf den Mauszeiger, heraus bis etwas über die normale Ansicht */
let zoom=1,zoomWant=1;const ZOOM_MIN=.35,ZOOM_MAX=1.3,zoomFocus=new THREE.Vector3();
function zoomBy(f,ev){
  if(!run||guided)return;
  const before=zoomWant;zoomWant=Math.max(ZOOM_MIN,Math.min(ZOOM_MAX,zoomWant*f));
  if(ev&&f<1){const p=groundAt(ev);if(p){const k=before>=1?1:.5;zoomFocus.lerp(p.setY(0),k)}}
}
cv.addEventListener('wheel',ev=>{
  if(!run||guided)return;ev.preventDefault();
  const d=Math.max(-3,Math.min(3,ev.deltaY/(ev.deltaMode?1:100)));zoomBy(Math.pow(1.13,d),ev);
},{passive:false});
addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();
  if(!$('ovLevel').hidden&&/^[1-4]$/.test(k)){const c=$('lvlCards').children[+k-1];if(c)c.click();return}
  if(guided&&k===' '){e.preventDefault();steer.kb=true;return}
  if(k==='escape'||k==='p'){
    if(guided&&k==='escape'){detonateGuided();return}
    if(run&&run.placing){exitPlacing();return}
    if(play()){e.preventDefault();setPause($('ovPause').hidden)}return;
  }
  if(k==='m'&&!e.ctrlKey&&!e.metaKey){toggleMute();return}
  if(k==='enter'){
    if(phase==='shop'&&!$('ovRun').hidden){e.preventDefault();$('bNext').click();return}
    if(phase==='tut'&&!$('coachBtn').hidden){e.preventDefault();endTutorial();return}
    return;
  }
  if(!run||!play()||halted||e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;
  if(/^[1-7]$/.test(k)){const id=run.weapons[+k-1];if(id)selWeapon(id);return}
  if(k==='o'){$('ordToggle').click();return}
  if(k===' '){e.preventDefault();requestAmmo();return}
  if(k==='+'||k==='='){zoomBy(1/1.15);return}
  if(k==='-'){zoomBy(1.15);return}
  const ORD={x:'attack',c:'retreat',v:'auto',b:'hold'};
  if(ORD[k]){(e.shiftKey?setMechOrder:setOrder)(ORD[k]);return}
  if(k==='k'){useCmdAbility();return}
  const kk=k==='y'?'z':k;
  for(const id of ABILITY_IDS)if(ITEMS[id].key.toLowerCase()===kk&&M.unlocked[id]){if(e.shiftKey)toggleAuto(id);else useAbility(id);return}
  for(const id of SUPPORT_IDS)if(ITEMS[id].key.toLowerCase()===kk&&M.unlocked[id]){
    if(isPC&&mouse.p){trySupport(id,mouse.p);exitPlacing()}else enterPlacing(id);return}
});
document.addEventListener('visibilitychange',()=>{paused=document.hidden;last=performance.now();if(document.hidden){if(run)bankMedals();if(play()&&!halted)setPause(true)}});
addEventListener('blur',()=>{if(play()&&!halted&&isPC)setPause(true)});

/* =========================================================
   Hauptschleife
   ========================================================= */
function update(dt,t){
  ship.position.y=SHIP_POS.y+Math.sin(t*.6)*.6;ship.rotation.z=.05+Math.sin(t*.4)*.02;
  ship.userData.glows.forEach((g,i)=>{const s=4.2+Math.sin(t*9+i)*.5;g.scale.set(s,s,1)});
  if(ship2.visible){ship2.position.y=SHIP_POS.y+Math.sin(t*.6+1.3)*.6;ship2.rotation.z=.05+Math.sin(t*.4+1)*.02;ship2.userData.glows.forEach((g,i)=>{const s=4.2+Math.sin(t*9+i+2)*.5;g.scale.set(s,s,1)})}
  base.userData.ring.rotation.x=t*1.3;base.userData.ring.rotation.y=t*.8;
  domeHit=Math.max(0,domeHit-dt*2);domeMat.opacity=.1+domeHit*.45+Math.sin(t*2)*.02;
  shake=Math.max(0,shake-dt*3);
  {const tk=run&&!run.tut?fieldTargetK(run.wave):1;FIELD_K+=(tk-FIELD_K)*Math.min(1,dt*1.2);
   const fd=fieldDims();camLook.set(LOOK.x,LOOK.y,LOOK.z+(fd.ZF-36)*.45);
   camera.position.copy(CAM).sub(LOOK).multiplyScalar(FIELD_K).add(camLook);}
  camera.lookAt(camLook);
  // Sichtbarkeit immer mit der normalen Kamera, damit Zoomen das Spiel nicht verändert
  if(run&&play()&&!halted&&!guided)updateOnScreen();
  {if(!run)zoomWant=1;zoom+=(zoomWant-zoom)*Math.min(1,dt*8);
   const zf=Math.max(0,(1-zoom)/(1-ZOOM_MIN)),look=tmp2.copy(camLook).lerp(zoomFocus,zf*.85);
   camera.position.copy(CAM).sub(LOOK).multiplyScalar(FIELD_K*zoom).add(look);
   if(shake>0)camera.position.add(tmp.set((rnd()-.5)*shake,(rnd()-.5)*shake,0));
   camera.lookAt(look);}
  if(guided)guidedCamera();
  env.t=(env.t+dt/(run&&play()&&!halted?300:900))%1;updateEnv(dt);SFX.ambient(dt,env);
  updateFx(dt);updateTracers(dt);updateMarks(dt,t);
  // Terraforming: ab Welle 10 wird der Planet grüner, voll grün ab etwa Welle 55
  {const target=run&&!run.tut?Math.max(0,Math.min(1,(run.wave-10+(phase==='fight'?Math.min(1,waveT/45):0))/45)):0;
   const cur=terraShown<0?0:terraShown,diff=target-cur;
   if(Math.abs(diff)>.0005)setTerra(cur+Math.sign(diff)*Math.min(Math.abs(diff),dt*(Math.abs(diff)>.15?.25:.025)))}
  if(orbT>0){orbT-=dt;orbCol.material.opacity=Math.max(0,orbT/.8)*.8}else orbCol.material.opacity=0;
  const showCross=!!(run&&play()&&mouse.p&&!halted);
  cross.visible=showCross&&!run.placing&&!guided;
  if(showCross){cross.position.set(mouse.p.x,.08,mouse.p.z);cross.rotation.z=t*.8;cross.scale.setScalar(hold?.85:1)}
  ghost.visible=showCross&&!!run.placing&&!guided;
  if(ghost.visible){ghost.position.set(mouse.p.x,.07,mouse.p.z);ghost.scale.setScalar(GHOST_R[run.placing]||2);ghost.material.color.setHex(run.placing!=='cmdmove'&&dist2D(mouse.p,BASE)<BASE_R+2.4?0xff6a3d:run.placing==='cmdmove'?0xffd23f:0x5fd0ff)}

  if(MP)mpTick(dt,t);
  if(!run||!play()||halted)return;
  waveT+=dt;
  if(guided)updateGuided(realDt);
  if(phase==='fight'&&!(MP&&MP.role==='guest')){
    while(queue.length&&queue[0].t<=waveT){if(enemies.length>=(MP?100:80)){queue[0].t=waveT+.5;break}const s=queue.shift();spawnEnemy(s.type,s.x,s.z||38)}
  }
  for(const l of later)l.t-=dt;
  const due=later.filter(l=>l.t<=0);later=later.filter(l=>l.t>0);due.forEach(l=>{COSMETIC=l.cos;try{l.fn()}finally{COSMETIC=false}});
  for(const id in run.cd)run.cd[id]=Math.max(0,run.cd[id]-dt);
  for(const id of ABILITY_IDS.concat(SUPPORT_IDS))if(run.cd[id]==null)run.cd[id]=0;
  // Waffen: Abkühlen und Feuern
  updateAmmoShips(dt);
  for(const id of run.weapons){
    run.wcd[id]=Math.max(0,(run.wcd[id]||0)-dt);
    run.heat[id]=Math.max(0,(run.heat[id]||0)-R(id,'cool')*dt*(run.over[id]?1.3:1));
    if(run.over[id]&&run.heat[id]<=20)run.over[id]=false;
  }
  if(!run.placing&&!guided){
    if(hold&&canFire(run.sel))fireWeapon(run.sel,hold.clone());
    else if(hold&&run.sel==='kanone'&&!run.tut&&run.ammo<1)ammoEmptyHint();
    // Langsames Auto-Feuer: jede Waffe schießt für sich, außer die gerade von Hand gefeuerte
    if(!run.tut){const f=markedTarget()||frontEnemy();run.auto=run.auto||{};
      for(const id of run.weapons){
        if(hold&&id===run.sel)continue;
        run.auto[id]=(run.auto[id]||0)-dt;
        if(f&&run.auto[id]<=0&&!run.over[id]&&(run.heat[id]||0)<55&&canFire(id)){run.auto[id]=1/(R(id,'rate')*.45)*(.9+rnd()*.2);fireWeapon(id,lead(f,.5))}
      }}
  }
  updateAbilities(dt,t);
  autoAbilities(dt);
  updateShots(dt);
  updateZones(dt);
  if(MP&&MP.role==='guest'){mpGuestUpdate(dt,t);updateZombies(dt);updateCommander(dt,t)}
  else{
    updateEnemies(dt);
    if(!run||!play())return;
    if(!run.tut)updateEvent(dt);
    updateStructs(dt,t);
    updatePods(dt,t);
    updateSoldiers(dt,t);
    updateShuttles(dt);
    updateMechs(dt,t);
    updateRovers(dt,t);
    updateMarines(dt,t);
    updateZombies(dt);
    updateCommander(dt,t);
    updateBaseGuns(dt);
    if(!run.tut)run.hp=Math.min(R('basis','maxhp'),run.hp+R('basis','shreg')*dt);
  }
  if(bossE&&bossE.dead)bossE=enemies.find(e=>e.T.boss&&!e.dead)||null;
  $('boss').hidden=!bossE;
  if(bossE){$('bossName').textContent=bossE.T.name;$('bossBar').style.width=Math.max(0,bossE.hp/bossE.max*100)+'%'}
  if(phase==='fight'){
    if(run.pending>0&&!halted&&$('ovLevel').hidden&&!guided){showLevelUp();if(!MP)return}
    if(!(MP&&MP.role==='guest')&&!queue.length&&!enemies.some(e=>!e.T.nest))waveDone();
  }else if(phase==='tut')tutCheck();
}
let last=performance.now(),paused=false,uiT=0,timeScale=1,slowT=0,slowK=0;
function musicTick(){
  let mode='menu',int=0;
  if(run&&phase==='fight'&&!run.tut){
    if(run.wave%5===0||enemies.some(e=>e.T.boss&&!e.dead))mode='boss';
    else{mode='fight';const n=enemies.filter(e=>!e.dead&&!e.T.nest).length;
      int=Math.min(1,n/40+(run.wave>=15?.15:0)+(run.hp<R('basis','maxhp')*.3?.3:0)+(run.ev?.1:0))}}
  else if(run&&phase==='tut'){mode='fight';int=.15}
  else if(run&&phase==='shop')mode='shop';
  else if(phase==='over')mode='over';
  SFX.music(mode,Math.round(int*10)/10);
}
function loop(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;
  // Zeitlupe: beim Platzieren über die Knöpfe und kurz beim Tod eines Bosses
  slowT=Math.max(0,slowT-dt);
  const want=MP?1:run&&play()&&!halted&&(run.placing||slowT>0)?.3:guided&&play()&&!halted?.55:1;
  timeScale+=(want-timeScale)*Math.min(1,dt*10);if(Math.abs(want-timeScale)<.01)timeScale=want;
  const k=Math.round((1-timeScale)/.7*10)/10;if(k!==slowK){slowK=k;SFX.slowmo(k);cv.classList.toggle('slow',k>.3)}
  realDt=dt;if(!paused)update(dt*timeScale,now/1000);
  renderer.render(scene,camera);
  uiT+=dt;if(uiT>.1){uiT=0;musicTick();if(run){updHud();updSlots()}}
  requestAnimationFrame(loop);
}

/* ---------- Start ---------- */
{
  const sd=ls.get(DEV_KEY);
  applyDevice(sd||(detectedPC?'pc':'mobile'),false);
  renderMenu();updHud();
  showOv(sd?'ovMenu':'ovDevice');
}
requestAnimationFrame(loop);
