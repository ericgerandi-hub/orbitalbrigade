'use strict';
/* =========================================================
   Orbitalbrigade – Schwarm gegen Brigade (Versus zu zweit)
   Der Host ist die Brigade und simuliert alles. Der Gast ist der
   Schwarm: Er bekommt Biomasse und setzt damit Käfer aufs Feld.
   Biomasse, Abklingzeiten und Evolution verwaltet der Host.
   ========================================================= */
const VS_WAVES=15,SPAWN_MIN=28;
const SW_UNITS=[
  {k:'kraul',n:'Krabbler',c:6},
  {k:'schwarm',n:'Schwärmer ×4',c:8,pack:4},
  {k:'spucker',n:'Spucker',c:14},
  {k:'panzer',n:'Panzerkäfer',c:22},
  {k:'elite',n:'Brutwächter',c:80,min:3},
  {k:'nest',n:'Brutloch',c:120,min:4,max:3,rear:true},
  {k:'boss',n:'Brutkönigin',c:300,min:5,once:true},
  {k:'titan',n:'Titan',c:800,min:10,once:true},
];
const SW_ABIL=[
  {k:'rage',n:'Raserei',c:50,cd:25,dur:8,key:'q',d:'8 s lang laufen alle Käfer 40 % schneller'},
  {k:'shell',n:'Chitinpanzer',c:60,cd:30,dur:8,key:'w',d:'8 s lang nehmen alle Käfer 30 % weniger Schaden'},
];
const SW_EVO=[
  {k:'hp',n:'Dickere Panzer',d:'+12 % Leben für neue Käfer',max:6},
  {k:'sp',n:'Schnellere Beine',d:'+7 % Tempo für neue Käfer',max:5},
  {k:'inc',n:'Fruchtbarkeit',d:'+18 % Biomasse pro Sekunde',max:6},
];
const vsWaveLen=w=>45+w*3;
const vsIncome=(w,inc)=>(8+w*1.5)*(1+.18*inc);

/* ---------- Lobby: Modus wählen ---------- */
function renderMode(){
  if(!MP)return;
  const host=MP.role==='host',md=host?(MP.mode||'c'):(MP.P&&MP.P.md)||'c',eq=host?!!MP.eq:!!(MP.P&&MP.P.eq);
  $('mdCoop').classList.toggle('on',md==='c');$('mdVs').classList.toggle('on',md==='v');
  $('mdCoop').disabled=$('mdVs').disabled=$('mdEq').disabled=!host;$('mdEq').checked=eq;
  $('mdHint').textContent=(md==='v'?(host?'Du bist die Brigade und verteidigst. Dein Mitspieler steuert den Schwarm. Überlebe '+VS_WAVES+' Wellen.':'Du bist der Schwarm: Setze Käfer mit Biomasse und zerstöre den Generator, bevor die Brigade '+VS_WAVES+' Wellen übersteht.'):'Ihr verteidigt gemeinsam.')+(eq?' Gleiche Bedingungen: alle starten mit Standard-Ausrüstung, ohne Menü-Upgrades, Wiedergeburt-Boni und Kommandant.':'');
}
$('mdCoop').onclick=()=>{if(MP&&MP.role==='host'){MP.mode='c';renderLobby()}};
$('mdVs').onclick=()=>{if(MP&&MP.role==='host'){MP.mode='v';renderLobby()}};
$('mdEq').onchange=()=>{if(MP&&MP.role==='host'){MP.eq=$('mdEq').checked;renderLobby()}};

/* ---------- Host: Regeln ---------- */
function vsHostInit(){MP.vsS={bio:60,ep:0,evo:{hp:0,sp:0,inc:0},rage:0,shell:0,cd:{rage:0,shell:0},used:{},seen:0}}
function vsStartWave(){const S=MP.vsS;if(!S)return;S.bio=Math.min(999,S.bio+40+run.wave*10);S.used={}}
function vsWaveDone(){
  const S=MP.vsS;if(S)S.ep+=2;
  if(run.wave>VS_WAVES){MP.vsRes='b';run.wave--;endRun(false,'Die Brigade hat gewonnen!');return true}
  return false;
}
function vsSnap(){
  const S=MP.vsS;if(!S)return null;
  return{b:Math.floor(S.bio),inc:Math.round(vsIncome(run.wave,S.evo.inc)*10)/10,ep:S.ep,ev:[S.evo.hp,S.evo.sp,S.evo.inc],rg:Math.ceil(S.rage),sh:Math.ceil(S.shell),cr:Math.ceil(S.cd.rage),cs:Math.ceil(S.cd.shell),
    tl:phase==='fight'?Math.max(0,Math.ceil(vsWaveLen(run.wave)-waveT)):-1,u:Object.keys(S.used),ns:enemies.filter(e=>e.T.nest&&!e.dead).length};
}
function vsCanPlace(u,x,z,nests){
  if(dist2D({x,z},BASE)<SPAWN_MIN)return'Zu nah am Generator';
  if(u.rear&&z<BASE.z+45)return'Brutlöcher nur im hinteren Feld';
  if(u.max&&nests>=u.max)return'Höchstens '+u.max+' Brutlöcher';
  return'';
}
function vsHostApply(P){
  const S=MP.vsS;if(!S||!Array.isArray(P.sw))return;
  for(const q of P.sw){
    if(!q||typeof q.i!=='number'||q.i<=S.seen)continue;S.seen=q.i;
    const u=SW_UNITS.find(x=>x.k===q.k);if(!u||phase!=='fight')continue;
    if(u.min&&run.wave<u.min)continue;if(u.once&&S.used[u.k])continue;if(S.bio<u.c)continue;
    const p=clampField(new THREE.Vector3(num(q.x,-900,900)/10,0,num(q.z,-900,900)/10));
    if(vsCanPlace(u,p.x,p.z,enemies.filter(e=>e.T.nest&&!e.dead).length))continue;
    if(enemies.length>=110&&!u.once)continue;
    S.bio-=u.c;if(u.once)S.used[u.k]=1;
    for(let i=0;i<(u.pack||1);i++){
      const e=spawnEnemy(u.k,p.x+(u.pack?(rnd()-.5)*2.4:0),p.z+(u.pack?(rnd()-.5)*2.4:0));
      e.hp*=1+.12*S.evo.hp;e.max=e.hp;e.sp*=1+.07*S.evo.sp;
      if(u.k==='nest'){e.g.scale.setScalar(.01);e.grow=0}else{e.g.position.y=-1.2;e.rise=.5}
    }
    spark(p.clone().setY(.4),0x6a3a2a,12,7,6);
  }
}
function vsHostReq(q){
  const S=MP.vsS;if(!S)return;
  if(q.k==='sab'){const a=SW_ABIL.find(x=>x.k===q.s);if(!a||phase!=='fight'||S.cd[a.k]>0||S.bio<a.c)return;
    S.bio-=a.c;S.cd[a.k]=a.cd;S[a.k]=a.dur;toast('Der Schwarm wirkt '+a.n+'!');SFX.roar(new THREE.Vector3(BASE.x,0,BASE.z+30))}
  else if(q.k==='evo'){const v=SW_EVO.find(x=>x.k===q.s);if(!v||S.ep<1||S.evo[v.k]>=v.max)return;S.ep--;S.evo[v.k]++}
}
function vsHostTick(dt){
  const S=MP.vsS;if(!S||!run)return;
  if(phase==='fight'){S.bio=Math.min(999,S.bio+vsIncome(run.wave,S.evo.inc)*dt);
    S.rage=Math.max(0,S.rage-dt);S.shell=Math.max(0,S.shell-dt);for(const k in S.cd)S.cd[k]=Math.max(0,S.cd[k]-dt)}
  showVsTime(phase==='fight'?Math.max(0,vsWaveLen(run.wave)-waveT):-1);
}
function showVsTime(tl){
  const el=$('vsTime');if(!vsOn()||!run||phase!=='fight'){el.hidden=true;return}
  el.hidden=false;const S=isSwarm()?MP.vsG:MP.vsS,buf=[];
  el.textContent=(tl>0?'Angriffsphase '+Math.floor(tl/60)+':'+String(Math.floor(tl%60)).padStart(2,'0'):'Letzte Käfer auf dem Feld')+' · Welle '+run.wave+' / '+VS_WAVES+
    (S&&(S.rg>0||S.rage>0)?' · Raserei':'')+(S&&(S.sh>0||S.shell>0)?' · Chitinpanzer':'');
}

/* ---------- Gast: Schwarm steuern ---------- */
let swSel='kraul',swEls=null,vsZone=null,vsGhost=null;
function vsSetupSwarm(){
  MP.swUI=true;MP.sw=MP.sw||[];MP.swSeq=MP.swSeq||0;
  $('side').hidden=$('abilBar').hidden=$('orders').hidden=true;$('swarmUI').hidden=false;
  $('hCr').previousElementSibling.textContent='Biomasse';
  const L=$('swUnits');L.innerHTML='';swEls={u:{},a:{}};
  SW_UNITS.forEach((u,i)=>{const b=el('button','ab',`<span class="an">${u.n}</span><span class="ak">${u.c}${isPC?' · '+(i+1):''}</span>`);
    b.onclick=()=>{swSel=u.k;vsUpdUI()};L.appendChild(b);swEls.u[u.k]=b});
  const A=$('swAbil');A.innerHTML='';
  SW_ABIL.forEach(a=>{const b=el('button','ab',`<span class="an">${a.n}</span><span class="ak">${a.c}${isPC?' · '+a.key.toUpperCase():''}</span>`);b.title=a.d;
    b.onclick=()=>vsAbility(a.k);A.appendChild(b);swEls.a[a.k]={b,k:b.querySelector('.ak')}});
  if(!vsZone){
    vsZone=new THREE.Mesh(new THREE.RingGeometry(SPAWN_MIN-.35,SPAWN_MIN,96),new THREE.MeshBasicMaterial({color:0xff4a3d,transparent:true,opacity:.55,depthWrite:false,side:THREE.DoubleSide}));
    vsZone.rotation.x=-Math.PI/2;vsZone.position.set(BASE.x,.06,BASE.z);scene.add(vsZone);
    vsGhost=new THREE.Mesh(new THREE.RingGeometry(.9,1.05,40),new THREE.MeshBasicMaterial({color:0x8bff6a,transparent:true,opacity:.8,depthWrite:false,side:THREE.DoubleSide}));
    vsGhost.rotation.x=-Math.PI/2;scene.add(vsGhost);
  }
  vsZone.visible=true;vsUpdUI();
}
function vsCleanup(){
  $('swarmUI').hidden=true;$('vsTime').hidden=true;$('hCr').previousElementSibling.textContent='Credits';
  if(vsZone)vsZone.visible=vsGhost.visible=false;
  if(MP){MP.swUI=false;MP.vsS=null;MP.vsG=null;MP.vs=false}
  setEqual(false);
}
function vsGuestRead(P){
  if(!MP.swUI)vsSetupSwarm();
  if(P.vs)MP.vsG=P.vs;
  const G=MP.vsG;if(G){run.credits=G.b}
  showVsTime(G?G.tl:-1);
}
function vsUpdUI(){
  if(!swEls||!MP)return;const G=MP.vsG||{b:0,u:[],ns:0,cr:0,cs:0,inc:0};
  $('swBio').textContent=fmt(G.b);$('swInc').textContent='+'+(G.inc||0).toLocaleString('de-DE')+' pro s';
  for(const u of SW_UNITS){const b=swEls.u[u.k],lock=(u.min&&run.wave<u.min)||(u.once&&(G.u||[]).includes(u.k))||(u.max&&G.ns>=u.max);
    b.classList.toggle('sel',swSel===u.k);b.classList.toggle('lock',!!lock);b.classList.toggle('poor',!lock&&G.b<u.c);
    b.title=u.min&&run.wave<u.min?'Ab Welle '+u.min:u.once&&(G.u||[]).includes(u.k)?'Nur einmal pro Welle':''}
  for(const a of SW_ABIL){const s=swEls.a[a.k],cd=a.k==='rage'?G.cr:G.cs;
    s.b.style.setProperty('--cd',cd>0?(cd/a.cd).toFixed(3):0);s.b.classList.toggle('poor',G.b<a.c);s.k.textContent=cd>0?cd+' s':a.c+(isPC?' · '+a.key.toUpperCase():'')}
}
function vsPointer(ev){
  if(ev.button!==0||phase!=='fight')return;
  const p=groundAt(ev);if(!p)return;
  const u=SW_UNITS.find(x=>x.k===swSel),G=MP.vsG||{b:0,u:[],ns:0};
  if(u.min&&run.wave<u.min){SFX.deny();toast(u.n+': ab Welle '+u.min);return}
  if(u.once&&(G.u||[]).includes(u.k)){SFX.deny();toast(u.n+': nur einmal pro Welle');return}
  if(G.b<u.c){SFX.deny();toast('Zu wenig Biomasse');return}
  const why=vsCanPlace(u,p.x,p.z,G.ns||0);if(why){SFX.deny();toast(why);return}
  MP.sw.push({i:++MP.swSeq,k:u.k,x:r1(p.x),z:r1(p.z)});if(MP.sw.length>10)MP.sw.shift();
  G.b-=u.c;vsUpdUI();SFX.place();blast(p.clone().setY(.1),0x8bff6a,1.6,.4,true);
}
function vsAbility(k){
  const a=SW_ABIL.find(x=>x.k===k),G=MP.vsG||{b:0};if(!a||phase!=='fight')return;
  const cd=k==='rage'?G.cr:G.cs;if(cd>0){SFX.deny();toast(a.n+': noch '+cd+' s');return}
  if(G.b<a.c){SFX.deny();toast('Zu wenig Biomasse');return}
  mpRequest('sab',k);SFX.ability('kryo');toast(a.n+'!');
}
function vsKey(e,k){
  if(/^[1-8]$/.test(k)){swSel=SW_UNITS[+k-1].k;vsUpdUI();return}
  const a=SW_ABIL.find(x=>x.key===k);if(a){vsAbility(a.k);return}
  if(k==='+'||k==='='){zoomBy(1/1.15);return}if(k==='-'){zoomBy(1.15);return}
}
function vsOpenEvo(){
  phase='shop';halted=false;exitPlacing();MP.ready=0;
  $('evoTitle').textContent='Welle '+(run.wave-1)+' überstanden';renderEvo();showOv('ovEvo');
}
function renderEvo(){
  const G=MP.vsG||{ep:0,ev:[0,0,0]},L=$('evoList');L.innerHTML='';
  $('evoText').textContent='Die Brigade rüstet auf. Du hast '+G.ep+' Evolutionspunkt'+(G.ep===1?'':'e')+'.';
  SW_EVO.forEach((v,i)=>{const lv=G.ev[i]||0,row=el('div','row',`<div><b>${v.n}</b> <span class="lv">Stufe ${lv} / ${v.max}</span><div class="hint">${v.d}</div></div>`);
    const b=el('button','buy',lv>=v.max?'Max':'1 Punkt');b.disabled=lv>=v.max||G.ep<1||MP.ready>=run.wave;
    b.onclick=()=>{mpRequest('evo',v.k);G.ep--;G.ev[i]=lv+1;SFX.buy();renderEvo()};row.appendChild(b);L.appendChild(row)});
  const r=$('evoReady');r.disabled=MP.ready>=run.wave;r.textContent=MP.ready>=run.wave?'Warte auf die Brigade …':'Bereit für Welle '+run.wave;
}
$('evoReady').onclick=()=>{if(!MP||!run)return;MP.ready=run.wave;renderEvo()};
// Jeden Frame: Host-Regeln oder Schwarm-Anzeige
function vsTick(dt){
  if(!vsOn()||!run)return;
  if(MP.role==='host'){vsHostTick(dt);return}
  if(!MP.swUI)return;
  cross.visible=false;
  const u=SW_UNITS.find(x=>x.k===swSel),G=MP.vsG||{ns:0};
  vsGhost.visible=!!mouse.p&&phase==='fight';
  if(vsGhost.visible){vsGhost.position.set(mouse.p.x,.08,mouse.p.z);vsGhost.scale.setScalar(u.k==='nest'?2.8:u.k==='boss'||u.k==='titan'?3.5:u.pack?2:1.4);
    vsGhost.material.color.setHex(vsCanPlace(u,mouse.p.x,mouse.p.z,G.ns||0)?0xff4a3d:0x8bff6a)}
  MP.swUiT=(MP.swUiT||0)-dt;if(MP.swUiT<=0){MP.swUiT=.15;vsUpdUI();if(phase==='shop'&&!$('ovEvo').hidden&&MP.vsG&&MP.vsG.ep!==MP.evoSeen){MP.evoSeen=MP.vsG.ep;renderEvo()}}
}
