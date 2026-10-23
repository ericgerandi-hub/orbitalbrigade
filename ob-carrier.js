'use strict';
/* =========================================================
   Orbitalbrigade – Trägerstaffel der Arche
   Jäger, Bomber, Kanonenboote und Bergungsflieger starten
   per Katapult vom Deck, fliegen Einsätze und landen wieder
   zum Aufmunitionieren im Hangar.
   ========================================================= */
const AC={
  jaeger:{n:'Falke',cls:'Jäger',l:'J',sp:24,turn:2.3,alt:9,fuel:22,rearm:6},
  bomber:{n:'Kondor',cls:'Bomber',l:'B',sp:16,turn:1.15,alt:13,fuel:34,rearm:11},
  gunship:{n:'Sturmvogel',cls:'Kanonenboot',l:'K',sp:11,turn:1.4,alt:11,fuel:26,rearm:9},
  pelikan:{n:'Pelikan',cls:'Bergungsflieger',l:'P',sp:13,turn:1.7,alt:7,fuel:20,rearm:24},
  hjet:{n:'Jet',cls:'Hangar-Jet',l:'H',sp:22,turn:2.6,alt:14,fuel:0,rearm:0},
};
const AC_KEYS=Object.keys(AC);
// Reihenfolge der Maschinen und ab welcher Welle sie zur Staffel stoßen
const SQUAD=[['jaeger',1],['jaeger',1],['bomber',4],['gunship',8],['pelikan',12],['jaeger',16],['bomber',22],['gunship',30]];
const CV={run:null,pl:[],bombs:[],shells:[],catT:0,cat:0,hudT:0,pup:{},pupAt:0,pupFly:new Set(),healAcc:0,said:{}};
const _cv=new THREE.Vector3(),_cv2=new THREE.Vector3();
const angD=(a,b)=>{let d=a-b;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;return d};

function carrierOn(){return !!(run&&!run.tut&&run.ship==='arche'&&!(MP&&MP.vs))}
function acPow(){return 1+(Math.max(1,run.wave)-1)*.09}
function deckW(x,y,z,obj){const m=(obj||ship).userData.model;(obj||ship).updateMatrixWorld();return m.localToWorld(_cv.set(x,y,z)).clone()}
function shipYaw(obj){return (obj||ship).rotation.y}
function acFwd(pl){return _cv2.set(Math.sin(pl.yaw),0,Math.cos(pl.yaw))}

function carrierReset(){
  for(const p of CV.pl)if(p.g)scene.remove(p.g);
  for(const b of CV.bombs)scene.remove(b.m);
  CV.pl=[];CV.bombs=[];CV.shells=[];CV.catT=0;CV.run=run;CV.said={};CV.synced=false;CV.healAcc=0;
}
function syncSquad(){
  CV.synced=CV.pl.length>0;
  SQUAD.forEach(([type,w],i)=>{
    if(CV.pl[i]||run.wave<w)return;
    CV.pl[i]={i,type,A:AC[type],st:'hangar',rearm:0,t:0,p:new THREE.Vector3(),yaw:0,roll:0,pitch:0,v:0,fuel:0,g:null,tg:null,ext:0,fireT:0,ff:0,fb:0,fg:0,ammo:0};
    if(CV.synced&&!run.tut)radio('Neue Maschine an Bord: '+AC[type].cls+' „'+AC[type].n+'“. Startet beim nächsten Einsatz.');
  });
}
function wantLaunch(pl){
  let n=0;for(const e of enemies)if(visible(e)&&!e.T.nest)n++;
  if(pl.type==='pelikan'){
    const mx=R('basis','maxhp');if(run.hp<mx*.85)return true;
    return !(MP&&MP.role==='guest')&&structs.some(s=>s.active&&s.max>1&&s.hp>0&&s.hp<s.max*.7);
  }
  if(pl.type==='bomber')return n>=4;
  return n>0;
}
function launch(pl){
  pl.st='launch';pl.t=0;pl.c=CV.cat;CV.cat^=1;CV.catT=1.1;
  if(!pl.g)pl.g=makePlane(pl.type);scene.add(pl.g);pl.g.visible=true;
  pl.fuel=pl.A.fuel;pl.ammo=pl.type==='bomber'?2:0;pl.tg=null;pl.ext=0;pl.rep=0;pl.runB=null;pl.center=null;
  const x=pl.c?-1.2:1.4;pl.p.copy(deckW(x,1.9,3.4));pl.yaw=shipYaw();
  SFX.jet2(pl.p,2.4);spark(pl.p.clone(),0xffd23f,6,4,2);
  if(!CV.said.first){CV.said.first=1;radio('Arche-Staffel startet. Jäger räumen den Luftraum frei.')}
}
function landNow(pl){pl.st='hangar';pl.rearm=0;if(pl.g){scene.remove(pl.g);pl.g.visible=false}}

/* Steuerung: auf einen Zielpunkt zufliegen, mit Querlage in Kurven */
function acSteer(pl,T,dt,vWant,vyMin,vk){
  const p=pl.p,A=pl.A;
  pl.v+=((vWant==null?A.sp:vWant)-pl.v)*Math.min(1,dt*1.6);
  const want=Math.atan2(T.x-p.x,T.z-p.z),d=angD(want,pl.yaw),mx=A.turn*dt*(pl.v<4?1.6:1),turn=Math.max(-mx,Math.min(mx,d));
  pl.yaw+=turn;pl.roll+=((dt>0?-turn/dt/A.turn*.75:0)-pl.roll)*Math.min(1,dt*4);
  p.x+=Math.sin(pl.yaw)*pl.v*dt;p.z+=Math.cos(pl.yaw)*pl.v*dt;
  const vy=Math.max(vyMin||-10,Math.min(7,(T.y-p.y)*(vk||1.3)));p.y+=vy*dt;pl.pitch=Math.atan2(vy,Math.max(5,pl.v))*.8;
}
function cluster(){
  const vis=enemies.filter(e=>visible(e)&&!e.T.nest);if(!vis.length)return null;
  let best=null,bn=-1;const sm=vis.length>40?vis.filter((_,i)=>i%Math.ceil(vis.length/40)===0):vis;
  for(const e of sm){let n=0;for(const o of vis)if(dist2D(o.g.position,e.g.position)<6)n+=o.T.boss?4:1;if(n>bn){bn=n;best=e}}
  return best.g.position.clone().setY(0);
}
function pickFighter(p){
  let best=null,bs=-1e9;
  for(const e of enemies){if(!targetable(e)||e.T.nest)continue;
    const s=(e.T.fly?60:0)+(e.T.boss?20:0)-dist2D(e.g.position,BASE)*.6-dist2D(e.g.position,p)*.25;if(s>bs){bs=s;best=e}}
  return best;
}
function patrolPt(pl,t){const a=t*.35+pl.i*1.7;return _cv.set(Math.sin(a)*14,pl.A.alt,-8+Math.cos(a)*14).clone()}

function flyJaeger(pl,dt,t){
  const p=pl.p,A=pl.A;
  if(!pl.tg||!targetable(pl.tg)||rnd()<dt*.25)pl.tg=pickFighter(p);
  const e=pl.tg;
  if(pl.ext>0||!e){pl.ext-=dt;acSteer(pl,e&&pl.ext>0?p.clone().addScaledVector(acFwd(pl),20).setY(A.alt+2):patrolPt(pl,t),dt);return}
  const ep=e.g.position,hd=dist2D(p,ep),ang=Math.abs(angD(Math.atan2(ep.x-p.x,ep.z-p.z),pl.yaw));
  acSteer(pl,_cv.set(ep.x,A.alt-(hd<26?3.5:0),ep.z),dt);
  if(hd<19&&ang<.4){
    pl.fireT-=dt;
    while(pl.fireT<=0){pl.fireT+=.08;
      const mz=p.clone().addScaledVector(acFwd(pl),1.6),ap=ep.clone().setY(e.T.fly?3.2:.6).add(_cv.set((rnd()-.5)*1.4,0,(rnd()-.5)*1.4));
      tracer(mz,ap,0xffe27a,1.5);if(rnd()<.35)spark(ap,0xffd23f,1,4,3);
      hit(e,14*acPow()*.08*(e.T.fly?2.2:1),true);e.fl=.05;}
    if(pl.ff<=0)SFX.mg(p,.45);pl.ff=.5;
  }
  if(hd<5)pl.ext=1.2;
}
function flyBomber(pl,dt,t){
  const p=pl.p,A=pl.A;
  if(pl.ext>0){pl.ext-=dt;acSteer(pl,p.clone().addScaledVector(acFwd(pl),20).setY(A.alt),dt);return}
  if(!pl.runB){const c=cluster();if(!c){acSteer(pl,patrolPt(pl,t),dt);return}
    if(dist2D(p,c)<22){pl.ext=1.5;return}pl.runB={c,n:0,dt:0}}
  const R0=pl.runB,c=R0.c,f=acFwd(pl),dx=c.x-p.x,dz=c.z-p.z,along=dx*f.x+dz*f.z,lat=Math.abs(dx*f.z-dz*f.x);
  acSteer(pl,_cv.set(c.x,A.alt,c.z),dt);
  if(along<19&&along>4&&lat<6&&R0.n<8){R0.dt-=dt;if(R0.dt<=0){R0.dt=.13;R0.n++;dropBomb(p,f,pl.v,false);pl.fb=.4}}
  if(R0.n>0&&along<2){pl.runB=null;pl.ammo--;pl.ext=2;if(pl.ammo<=0)pl.st='return'}
}
function dropBomb(p,f,v,cosm){
  const m=new THREE.Mesh(projGeo&&projGeo.bolt?projGeo.bolt:new THREE.BoxGeometry(.3,.3,.8),darkMat);m.scale.set(1,1,.4);m.position.copy(p).setY(p.y-.5);scene.add(m);
  CV.bombs.push({m,v:new THREE.Vector3(f.x*v*.7,-1.5,f.z*v*.7),cosm});
  SFX.whistle&&rnd()<.4&&SFX.whistle(p,.9);
}
function flyGunship(pl,dt,t){
  const p=pl.p,A=pl.A;
  pl.cT=(pl.cT||0)-dt;if(!pl.center||pl.cT<=0){pl.cT=3.5;pl.center=cluster()}
  const c=pl.center;if(!c){acSteer(pl,patrolPt(pl,t),dt);return}
  const a=Math.atan2(p.z-c.z,p.x-c.x)+.75;acSteer(pl,_cv.set(c.x+Math.cos(a)*11,A.alt,c.z+Math.sin(a)*11),dt);
  pl.fireT-=dt;
  if(pl.fireT<=0){
    let tg=null,bd=15;for(const e of enemies){if(!targetable(e))continue;const d=dist2D(e.g.position,c);if(d<bd){bd=d;tg=e}}
    if(tg){pl.fireT=.55;const ap=lead(tg,.25).setY(0);tracer(p.clone().setY(p.y-.3),ap.clone().setY(.4),0xff9a3d,3);
      CV.shells.push({at:ap,t:.15,cosm:false});SFX.weapon('kanone',ap);pl.fg=.4}
    else pl.fireT=.3;
  }
}
function flyPelikan(pl,dt,t){
  const p=pl.p,T=_cv.set(BASE.x+1.5,6.5,BASE.z+3).clone(),hd=dist2D(p,T);
  acSteer(pl,T,dt,hd<9?Math.max(1.2,hd*1.4):pl.A.sp);
  if(hd<3.5){
    pl.rep+=dt;const mx=R('basis','maxhp');
    if(MP&&MP.role==='guest'){CV.healAcc+=dt;if(CV.healAcc>=1){CV.healAcc-=1;mpRequest('heal',.03)}}
    else{run.hp=Math.min(mx,run.hp+mx*.03*dt);for(const s of structs)if(s.active&&s.max>1&&s.hp>0&&Math.hypot(s.x-BASE.x,s.z-BASE.z)<20)s.hp=Math.min(s.max,s.hp+s.max*.06*dt)}
    tracer(p.clone().setY(p.y-1),BASE.clone().setY(2.2),0x7cf0a8,4);if(rnd()<dt*6)spark(BASE.clone().setY(2.4),0x7cf0a8,2,3,3);pl.fg=.3;
    if(pl.rep>=7){pl.st='return';if(!CV.said.rep){CV.said.rep=1;radio('Pelikan hat den Generator geflickt und kehrt zur Arche zurück.')}}
  }
}

function carrierSim(dt,t){
  if(CV.run!==run)carrierReset();
  syncSquad();
  const fight=phase==='fight';
  if(!fight){for(const pl of CV.pl)if(pl&&pl.st!=='hangar')landNow(pl);for(const b of CV.bombs)scene.remove(b.m);CV.bombs=[];CV.shells=[];return}
  CV.catT-=dt;
  const apr=deckW(-1.5,7,-34),td=deckW(-1.5,1.9,-8);
  for(const pl of CV.pl){if(!pl)continue;
    pl.ff-=dt;pl.fb-=dt;pl.fg-=dt;
    if(pl.st==='hangar'){if(pl.rearm>0)pl.rearm-=dt;else if(CV.catT<=0&&wantLaunch(pl))launch(pl);continue}
    if(pl.st==='launch'){
      pl.t+=dt;const k=Math.min(1,pl.t/.85),x=pl.c?-1.2:1.4;pl.p.copy(deckW(x,1.9,3.4+k*k*13));pl.yaw=shipYaw();pl.v=pl.A.sp*k;pl.roll=0;pl.pitch=0;
      if(rnd()<.6)spark(pl.p.clone(),0xffe9a8,1,2,1);
      if(k>=1)pl.st='fly';
    }else if(pl.st==='fly'){
      pl.fuel-=dt;
      if(pl.type==='jaeger')flyJaeger(pl,dt,t);else if(pl.type==='bomber')flyBomber(pl,dt,t);else if(pl.type==='gunship')flyGunship(pl,dt,t);else flyPelikan(pl,dt,t);
      if(pl.fuel<=0&&pl.st==='fly')pl.st='return';
      if(pl.type==='pelikan'&&pl.fuel<=0)pl.st='return';
    }else if(pl.st==='return'){
      acSteer(pl,apr,dt);if(pl.p.distanceTo(apr)<6){pl.st='land';pl.t=0;pl.from=pl.p.clone();pl.fy=pl.yaw}
    }else if(pl.st==='land'){
      pl.t+=dt;const k=Math.min(1,pl.t/1.8),s=k*k*(3-2*k);pl.p.lerpVectors(pl.from,td,s);pl.yaw=lerpAngle(pl.fy,shipYaw(),s);pl.roll*=.9;pl.pitch=-.12*(1-k);
      if(k>=1){spark(pl.p.clone(),0xffd23f,4,3,2);landNow(pl);pl.rearm=pl.A.rearm}
    }
    if(pl.g&&pl.st!=='hangar'){pl.g.position.copy(pl.p);pl.g.rotation.set(-pl.pitch,pl.yaw,pl.roll)}
  }
  // Bomben und Granaten
  for(const b of CV.bombs){b.v.y-=20*dt;b.m.position.addScaledVector(b.v,dt);b.m.lookAt(b.m.position.clone().add(b.v));
    if(b.m.position.y<=.3){b.dead=true;const q=b.m.position.clone().setY(0);
      if(b.cosm){if(!b.quiet)blast(q.clone().setY(.5),0xff6a3d,3,.45);spark(q.clone().setY(.5),0xffb04a,10,10,8);SFX.boom(3,q)}
      else boom(q,3.2,22*acPow(),{col:0xff6a3d,col2:0xffd23f,fire:3*acPow()})}}
  CV.bombs=CV.bombs.filter(b=>{if(!b.dead)return true;scene.remove(b.m);return false});
  for(const s of CV.shells){s.t-=dt;if(s.t<=0){s.dead=true;if(s.cosm){blast(s.at.clone().setY(.4),0xff9a3d,2,.35);spark(s.at.clone().setY(.4),0xffb04a,6,7,6)}else boom(s.at,2.2,24*acPow(),{col:0xff9a3d})}}
  CV.shells=CV.shells.filter(s=>!s.dead);
}

/* Modelle an Deck: geparkte Maschinen sichtbar, solange sie im Hangar stehen */
function deckDeco(obj,t,flying,unl){
  const m=obj.userData.model,c=m&&m.userData.carrier;if(!c||!obj.visible)return;
  c.radar.rotation.y=t*1.4;c.lamp.visible=Math.sin(t*4)>0;
  for(const b of c.blink)b.m.visible=((t*3-b.k*.5)%3+3)%3<.6;
  c.parked.forEach((p,i)=>{p.visible=i<unl&&!flying(i);
    if(p.visible)for(const f of p.userData.fans)f.rotation.y+=.02});
}
function unlockedN(){if(!run||run.tut)return SQUAD.length;let n=0;for(const s of SQUAD)if(run.wave>=s[1])n++;return n}

function carrierTick(dt,t){
  const on=carrierOn();
  hjTick(dt);
  for(const j of HJ.list)if(j.g&&j.st!=='hangar')for(const g of j.g.userData.glows){const s=1.4*(1+Math.sin(t*30+j.i)*.15);g.scale.set(s,s,1)}
  if(on&&dt>0)carrierSim(dt,t);
  else if(!on&&CV.run){carrierReset();CV.run=null}
  // Propeller und Triebwerksleuchten der fliegenden Maschinen
  for(const pl of CV.pl)if(pl&&pl.g&&pl.st!=='hangar'){for(const f of pl.g.userData.fans)f.rotation.y+=.6;for(const g of pl.g.userData.glows){const s=(pl.type==='bomber'?.9:1.4)*(1+Math.sin(t*30+pl.i)*.15);g.scale.set(s,s,1)}}
  deckDeco(ship,t,i=>on&&(!CV.pl[i]||CV.pl[i].st!=='hangar'),on?unlockedN():SQUAD.length);
  // Puppen der Staffel des Mitspielers ausblenden, wenn keine Daten mehr kommen
  if(performance.now()-CV.pupAt>700&&CV.pupFly.size){for(const k in CV.pup)CV.pup[k].g.visible=false;CV.pupFly.clear()}
  if(ship2.visible)deckDeco(ship2,t,i=>CV.pupFly.has(i)||(run&&!run.tut&&run.wave<SQUAD[i][1]),SQUAD.length);
  CV.hudT-=dt||.016;if(CV.hudT<=0){CV.hudT=.25;carrierHud(on)}
}

/* ---------- Anzeige: Hangar-Leiste ---------- */
function carrierHud(on){
  const el=$('hangar');if(!el)return;
  if(!on||!play()||guided){el.hidden=true;return}
  el.hidden=false;el.classList.toggle('mp',!!MP);
  let h='<span class="lbl">Hangar</span>';
  SQUAD.forEach(([type,w],i)=>{const pl=CV.pl[i],A=AC[type];
    if(!pl){if(i===CV.pl.length)h+=`<i class="hg lock" title="${A.cls} „${A.n}“ ab Welle ${w}"><b>${A.l}</b><small>W${w}</small></i>`;return}
    const st=pl.st==='hangar'?(pl.rearm>0?'rearm':'ready'):pl.st==='fly'?'fly':'move';
    const pct=st==='rearm'?100-pl.rearm/A.rearm*100:st==='fly'?pl.fuel/A.fuel*100:100;
    const txt={rearm:'wird aufmunitioniert',ready:'bereit an Deck',fly:'im Einsatz',move:pl.st==='launch'?'startet':'landet'}[st];
    h+=`<i class="hg ${st}" title="${A.cls} „${A.n}“: ${txt}"><b>${A.l}</b><u style="width:${Math.max(0,Math.min(100,pct))|0}%"></u></i>`});
  el.innerHTML=h;
}

/* ---------- Mehrspieler: Staffel des Mitspielers als Puppen ---------- */
function carrierSnap(){
  const a=[];
  for(const j of HJ.list)if(j.st!=='hangar')a.push(20+j.i,AC_KEYS.indexOf('hjet'),Math.round(j.p.x*10),Math.round(j.p.y*10),Math.round(j.p.z*10),Math.round(j.yaw*100),Math.round(j.roll*100),j.ff>0?1:0);
  if(!carrierOn())return a.length?a:null;
  for(const pl of CV.pl)if(pl&&pl.st!=='hangar')a.push(pl.i,AC_KEYS.indexOf(pl.type),Math.round(pl.p.x*10),Math.round(pl.p.y*10),Math.round(pl.p.z*10),Math.round(pl.yaw*100),Math.round(pl.roll*100),(pl.ff>0?1:0)|(pl.fb>0?2:0)|(pl.fg>0?4:0));
  return a;
}
function carrierPuppets(arr,dt){
  if(!Array.isArray(arr))return;CV.pupAt=performance.now();
  const seen=new Set(),host=MP&&MP.role==='host';
  for(let k=0;k+7<arr.length&&k<160;k+=8){
    const i=arr[k]|0,type=AC_KEYS[arr[k+1]|0];if(!type||i<0||i>31)continue;seen.add(i);
    let P=CV.pup[i];if(!P||P.type!==type){if(P)scene.remove(P.g);P=CV.pup[i]={type,g:makePlane(type),fresh:true,bT:0,gT:0};scene.add(P.g)}
    const tp=_cv.set(arr[k+2]/10,arr[k+3]/10,arr[k+4]/10),yaw=arr[k+5]/100,roll=arr[k+6]/100,fl=arr[k+7]|0;
    if(!isFinite(tp.x+tp.y+tp.z+yaw+roll))continue;
    P.g.visible=true;
    if(P.fresh||P.g.position.distanceTo(tp)>25){P.g.position.copy(tp);P.g.rotation.set(0,yaw,roll);P.fresh=false}
    else{P.g.position.lerp(tp,Math.min(1,dt*10));P.g.rotation.y=lerpAngle(P.g.rotation.y,yaw,Math.min(1,dt*10));P.g.rotation.z+=(roll-P.g.rotation.z)*Math.min(1,dt*8)}
    for(const f of P.g.userData.fans)f.rotation.y+=.6;
    const p=P.g.position,f=_cv2.set(Math.sin(yaw),0,Math.cos(yaw));
    if(fl&1&&rnd()<.5){const ap=p.clone().addScaledVector(f,12+rnd()*5).setY(.6);tracer(p.clone().addScaledVector(f,1.6),ap,0xffe27a,1.5)}
    if(fl&2){P.bT-=dt;if(P.bT<=0){P.bT=.13;dropBomb(p,f.clone(),AC[type].sp,true);if(!host)CV.bombs[CV.bombs.length-1].quiet=true}}
    if(fl&4&&type==='gunship'){P.gT-=dt;if(P.gT<=0){P.gT=.55;const ap=p.clone().addScaledVector(f,6).setY(0);tracer(p.clone(),ap.clone().setY(.4),0xff9a3d,3);if(host)CV.shells.push({at:ap,t:.15,cosm:true})}}
    if(fl&4&&type==='pelikan')tracer(p.clone().setY(p.y-1),BASE.clone().setY(2.2),0x7cf0a8,4);
  }
  for(const k in CV.pup)if(!seen.has(+k))CV.pup[k].g.visible=false;
  CV.pupFly=seen;
  // Kosmetische Bomben ohne eigenen Lauf (Gast im Schiff des Hosts) trotzdem fallen lassen
  if(!carrierOn()&&dt>0){
    for(const b of CV.bombs){b.v.y-=20*dt;b.m.position.addScaledVector(b.v,dt);if(b.m.position.y<=.3){b.dead=true;if(!b.quiet){const q=b.m.position.clone().setY(.5);blast(q,0xff6a3d,3,.45);spark(q,0xffb04a,10,10,8)}}}
    CV.bombs=CV.bombs.filter(b=>{if(!b.dead)return true;scene.remove(b.m);return false});
    for(const s of CV.shells){s.t-=dt;if(s.t<=0){s.dead=true;blast(s.at.clone().setY(.4),0xff9a3d,2,.35)}}CV.shells=CV.shells.filter(s=>!s.dead);
  }
}

/* =========================================================
   Waffe „Hangar“: eigene Jets mit eigener Munition.
   Sturzflug auf das Ziel, abfangen, wieder steigen. Munition
   leer: zurück zum Schiff, kurz nachladen, wieder starten.
   ========================================================= */
const HJ={run:null,list:[],catT:0,c:0};
function hangarOn(){return !!(run&&!run.tut&&run.weapons.includes('hangar')&&!isSwarm())}
function hjArche(){return ship.userData.shipId==='arche'}
function hjCount(){return Math.max(1,Math.round(R('hangar','count')))+(run.ship==='arche'?1:0)}
function hjReset(){for(const j of HJ.list)if(j.g)scene.remove(j.g);HJ.list=[];HJ.run=run;HJ.catT=0}
function hjBelly(){return deckW(0,-1.4,-3)}
function hjNew(i){return{i,type:'hjet',A:{sp:22,turn:2.6,alt:14},st:'hangar',rearm:0,t:0,p:new THREE.Vector3(),yaw:0,roll:0,pitch:0,v:0,g:null,tg:null,mode:'climb',mt:0,fireT:0,ammo:0,am0:1,ff:0}}
function hjLaunch(j){
  j.st='launch';j.t=0;j.ammo=j.am0=Math.max(1,Math.round(R('hangar','ammo')));j.A.sp=22*R('hangar','speed');j.mode='climb';j.tg=null;
  if(!j.g)j.g=makePlane('hjet');scene.add(j.g);j.g.visible=true;
  if(hjArche()){HJ.c^=1;j.c=HJ.c;j.p.copy(deckW(j.c?-1.2:1.4,1.9,3.4))}else j.p.copy(hjBelly());
  j.yaw=shipYaw();SFX.jet2(j.p,2);HJ.catT=.6;
}
function hjDock(j){j.st='hangar';j.rearm=R('hangar','reload');if(j.g)scene.remove(j.g);spark(j.p.clone(),0x5fd0ff,4,3,2)}
function hjFly(j,dt){
  const p=j.p;
  if(!j.tg||!targetable(j.tg)||(j.mode==='climb'&&rnd()<dt*.3)){const m=typeof markedTarget==='function'?markedTarget():null;j.tg=m&&targetable(m)?m:pickFighter(p)}
  const e=j.tg;
  if(!e){acSteer(j,patrolPt(j,performance.now()/1000),dt);return}
  const ep=e.g.position,hd=dist2D(p,ep),ang=Math.abs(angD(Math.atan2(ep.x-p.x,ep.z-p.z),j.yaw));
  if(j.mode==='climb'){
    acSteer(j,_cv.set(ep.x,15,ep.z),dt);
    if(p.y>10.5&&hd<26&&hd>7&&ang<.35){j.mode='dive';if(rnd()<.5)SFX.whistle(p,.8)}
  }else if(j.mode==='dive'){
    acSteer(j,_cv.set(ep.x,1,ep.z),dt,j.A.sp*1.3,-22,2.6);
    if(hd<20&&ang<.5){
      j.fireT-=dt;const d=R('hangar','dmg');
      while(j.fireT<=0&&j.ammo>0){j.fireT+=.09;j.ammo--;
        const mz=p.clone().addScaledVector(acFwd(j),1.6),ap=ep.clone().setY(e.T.fly?3.2:.5).add(_cv.set((rnd()-.5)*1.2,0,(rnd()-.5)*1.2));
        tracer(mz,ap,0x9fe8ff,1.5);if(rnd()<.35)spark(ap,0x5fd0ff,1,4,3);hitNear(ap,1.1,d)}
      if(j.ff<=0)SFX.mg(p,.4);j.ff=.45;
    }
    if(p.y<3.2||hd<3||ang>1.2){j.mode='pull';j.mt=1.1}
  }else{
    j.mt-=dt;acSteer(j,p.clone().addScaledVector(acFwd(j),20).setY(15),dt);if(j.mt<=0)j.mode='climb';
  }
  if(j.ammo<=0)j.st='return';
}
function hjTick(dt){
  if(!hangarOn()){if(HJ.list.length)hjReset();HJ.run=null;return}
  if(HJ.run!==run)hjReset();
  const n=hjCount();while(HJ.list.length<n)HJ.list.push(hjNew(HJ.list.length));
  if(!dt)return;
  if(phase!=='fight'){for(const j of HJ.list)if(j.st!=='hangar'){j.st='hangar';j.rearm=0;if(j.g)scene.remove(j.g)}return}
  HJ.catT-=dt;
  const any=enemies.some(e=>visible(e)&&!e.T.nest);
  for(const j of HJ.list){j.ff-=dt;
    if(j.st==='hangar'){if(j.rearm>0)j.rearm-=dt;else if(HJ.catT<=0&&any)hjLaunch(j);continue}
    if(j.st==='launch'){j.t+=dt;const k=Math.min(1,j.t/.8);
      if(hjArche())j.p.copy(deckW(j.c?-1.2:1.4,1.9,3.4+k*k*13));
      else{const y=shipYaw();j.p.copy(hjBelly()).add(_cv2.set(Math.sin(y)*k*6,-k*3,Math.cos(y)*k*6))}
      j.yaw=shipYaw();j.v=j.A.sp*Math.max(.3,k);j.roll=0;j.pitch=hjArche()?0:-.3*k;if(k>=1)j.st='fly';
    }else if(j.st==='fly')hjFly(j,dt);
    else if(j.st==='return'){const tg=hjArche()?deckW(-1.5,7,-34):hjBelly();acSteer(j,tg,dt);
      if(j.p.distanceTo(tg)<(hjArche()?6:4.5)){if(hjArche()){j.st='land';j.t=0;j.from=j.p.clone();j.fy=j.yaw}else hjDock(j)}}
    else if(j.st==='land'){j.t+=dt;const k=Math.min(1,j.t/1.6),s=k*k*(3-2*k);j.p.lerpVectors(j.from,deckW(-1.5,1.9,-8),s);j.yaw=lerpAngle(j.fy,shipYaw(),s);j.roll*=.9;j.pitch=0;if(k>=1)hjDock(j)}
    if(j.g&&j.st!=='hangar'){j.g.position.copy(j.p);j.g.rotation.set(-j.pitch,j.yaw,j.roll)}
  }
}
// Anzeige im Waffenplatz: wie viele Jets fliegen, Balken = Munition bzw. Nachladen
function hangarSlot(s){
  const L=HJ.list;if(!L.length){s.k.textContent='Bereit';s.h.style.width='0%';return}
  let air=0,sum=0,rel=0;
  for(const j of L){if(j.st==='hangar'){const r=j.rearm>0?1-j.rearm/Math.max(.1,R('hangar','reload')):1;sum+=r;if(j.rearm>0)rel++}else{air++;sum+=j.ammo/Math.max(1,j.am0)}}
  s.h.style.width=Math.round(sum/L.length*100)+'%';
  s.k.textContent=air?air+' von '+L.length+' in der Luft':rel?'Lädt nach':L.length+(L.length>1?' Jets bereit':' Jet bereit');
}
