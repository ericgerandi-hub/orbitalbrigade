'use strict';
/* =========================================================
   Orbitalbrigade – Erweiterungen: neue Gegner, Mutationen,
   Boss-Phasen, Combo, Funksprüche, Erfolge mit Lackierungen
   und die tägliche Herausforderung.
   ========================================================= */

/* ---------- Neue Gegnerarten in den Wellen ---------- */
function extraType(w,type,rr){
  const r=rr();
  if(run&&run.swarmDay)return r<.55?'schwarm':r<.85?'flieger':'heiler';
  if(w>=8&&r<.09)return'flieger';
  if(w>=10&&r<.14)return'heiler';
  if(w>=12&&r<.2)return'wuehler';
  return type;
}
function enemySpawned(e,easy){
  const T=e.T;e.phase=0;
  if(run&&run.night&&!easy)e.sp*=1.15;
  if(T.fly){e.g.position.y=3.2;firstSight('flieger','Flieger im Anflug! Sie fliegen einfach über Barrikaden und Minen.')}
  if(T.healer){e.healT=1+rnd();firstSight('heiler','Heiler-Käfer entdeckt! Sie reparieren andere Käfer. Zuerst ausschalten!')}
  if(T.burrow&&!easy){digUnder(e,underTarget());firstSight('wuehler','Bodenbewegungen! Wühler graben sich bis zum Generator durch.')}
  if(T.boss&&run&&!run.tut)radio(e.type==='titan'?'Ein Titan nähert sich. Alles, was wir haben, auf ihn!':'Brutkönigin gesichtet! Konzentriert das Feuer.');
  if(!easy&&run&&!run.tut&&run.wave>=30&&!T.boss&&!T.nest&&!T.gold&&!e.noMut&&rnd()<Math.min(.3,(run.wave-29)*.015))mutate(e,MUT_KEYS[rnd()*MUT_KEYS.length|0]);
}
function mutate(e,k){
  e.mut=k;if(k==='fast')e.sp*=1.4;
  const ic=makeMutIcon(k);ic.position.y=2.4*e.T.s+1.1;e.g.add(ic);e.mutIcon=ic;
  firstSight('mut','Achtung, Mutationen! Ein Symbol über dem Käfer zeigt seine Besonderheit.');
}
function underTarget(){const a=.25+rnd()*(Math.PI-.5);return new THREE.Vector3(BASE.x+Math.cos(a)*(BASE_R+6),0,BASE.z+Math.sin(a)*(BASE_R+6))}
function digUnder(e,tgt){e.under=true;e.utgt=tgt;e.g.visible=false;spark(e.g.position.clone().setY(.3),0x6a4a30,12,6,5)}
function emerge(e){
  e.under=false;e.g.visible=true;e.g.position.y=-1.4;e.rise=.6;const p=e.g.position.clone().setY(.3);
  spark(p,0x6a4a30,e.T.boss?40:16,e.T.boss?14:8,8);SFX.dig(p);
  if(e.T.boss){blast(p,0xff6a3d,9,.6,true);shake=reduceMotion?0:Math.max(shake,1);SFX.roar(p);if(run&&!run.tut)hurtFriendly(p,7,60+run.wave*4)}
}
// Spezialverhalten pro Frame. true = Bewegung schon erledigt
function enemySpecial(e,dt){
  const p=e.g.position,T=e.T;
  if(e.under){
    const dx=e.utgt.x-p.x,dz=e.utgt.z-p.z,d=Math.hypot(dx,dz);
    if(d<.8){emerge(e);return true}
    const st=Math.min(d,(T.boss?11:e.sp*1.6)*dt);p.x+=dx/d*st;p.z+=dz/d*st;
    if(rnd()<dt*(T.boss?14:7))spark(new THREE.Vector3(p.x+(rnd()-.5)*e.r,.2,p.z+(rnd()-.5)*e.r),0x6a4a30,2,3,3);
    return true;
  }
  if(T.fly){p.y=3.2+Math.sin(waveT*3+e.ph)*.35;if(e.wings)for(const w of e.wings)w.w.rotation.z=w.sd*Math.sin(waveT*32+e.ph)*.55}
  if(T.healer){
    e.healT-=dt;if(e.aura)e.aura.scale.setScalar(2.6+Math.sin(waveT*4)*.4);
    if(e.healT<=0){e.healT=1.2;let n=0;
      for(const o of enemies){if(o===e||o.dead||o.T.nest||o.hp>=o.max)continue;if(dist2D(o.g.position,p)<7.5){o.hp=Math.min(o.max,o.hp+o.max*(o.T.boss?.015:.07));n++;if(rnd()<.5)spark(o.g.position.clone().setY(1.2),0x7cff9a,2,2,4)}}
      if(n)blast(p.clone().setY(.15),0x7cff9a,7.5,.5,true)}
  }
  if(T.boss&&run&&!run.tut&&!(MP&&MP.role==='guest')){
    if(e.phase===0&&e.hp<e.max*.5){e.phase=1;radio('Die Brutkönigin gräbt sich ein! Haltet Ausschau nach Bodenbewegungen.');
      const fd=fieldDims();digUnder(e,new THREE.Vector3((rnd()-.5)*1.6*fd.X,0,Math.max(BASE.z+24,Math.min(fd.ZF-6,p.z-6+(rnd()-.5)*10))));return true}
    if(e.phase===1&&e.hp<e.max*.25){e.phase=2;radio('Sie ruft ihre Brut! Ein ganzer Schwarm kommt.');SFX.roar(p);
      for(let i=0;i<12;i++){const a=i/12*6.28,ne=spawnEnemy(i<10?'schwarm':'kraul',p.x+Math.cos(a)*4,p.z+Math.sin(a)*4);ne.g.position.y=-1.2;ne.rise=.5+i*.04}
      blast(p.clone().setY(.2),0x8a3a6a,8,.6,true)}
  }
  return false;
}
// Beim Tod: Mutationen, Combo, Statistik (nur Host oder allein)
function enemyDied(e){
  const p=e.g.position.clone().setY(0);
  if(e.mut==='explode'){blast(p.clone().setY(1),0xff6a3d,3.4,.5);spark(p.clone().setY(.8),0xffb04a,16,9,7);SFX.boom(3,p);hurtFriendly(p,3.4,e.dmg*2.2)}
  if(e.mut==='split'){for(let i=0;i<2;i++){const c=spawnEnemy(e.type,p.x+(i?1.4:-1.4),p.z,false);c.noMut=true;c.hp=c.max=e.max*.35;c.g.scale.setScalar(.72);c.r*=.75}}
  if(!run||run.tut)return;
  run.combo=(run.combo||0)+1;run.comboT=2.6;
  const st=M.stats;st.kills++;if(e.T.boss)st.boss++;if(e.T.fly)st.fly++;if(e.pulled)st.grab++;
  if(comboMul()>=5)achGet('combo5');
}

/* ---------- Combo ---------- */
const COMBO_STEPS=[[75,5],[50,4],[35,3],[20,2],[10,1.5]];
function comboMul(c){c=c==null?(run&&run.combo||0):c;for(const [n,m] of COMBO_STEPS)if(c>=n)return m;return 1}
let comboShown=0;
function showCombo(c,m){
  const el=$('combo');if(!run||c<5){el.hidden=true;comboShown=0;return}
  el.hidden=false;$('comboMul').textContent='×'+String(m).replace('.',',');$('comboN').textContent=c+' Abschüsse';
  el.classList.toggle('hot',m>=3);
  if(m!==comboShown){comboShown=m;el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop')}
}

/* ---------- Funksprüche vom Kommando ---------- */
const radioQ=[];let radioT=0;
function radio(txt){if(radioQ.length<4&&!radioQ.includes(txt))radioQ.push(txt)}
function firstSight(k,txt){if(!run||run.tut)return;run.seen=run.seen||{};if(run.seen[k])return;run.seen[k]=1;radio(txt)}
function radioTick(dt){
  radioT-=dt;const el=$('radio');
  if(radioT<=0){if(radioQ.length){$('radioTxt').textContent=radioQ.shift();el.hidden=false;el.classList.remove('in');void el.offsetWidth;el.classList.add('in');radioT=4.2;SFX.radio()}else el.hidden=true}
}

/* ---------- Jeden Frame ---------- */
let extraT=0;
function extraTick(dt){
  radioTick(dt);
  if(!run)return;
  if(run.comboT>0){run.comboT-=dt;if(run.comboT<=0)run.combo=0}
  if(!(MP&&MP.role==='guest'))showCombo(run.combo||0,comboMul());
  extraT-=dt;if(extraT>0)return;extraT=1;
  if(run.tut)return;
  if(phase==='fight'&&run.hp<R('basis','maxhp')*.3){run.lowSeen=run.lowSeen||{};if(!run.lowSeen[run.wave]){run.lowSeen[run.wave]=1;radio('Generator unter 30 %! Haltet die Linie!')}}
  if(run.ammoMax&&run.ammo<run.ammoMax*.1&&!(typeof isSwarm==='function'&&isSwarm())&&phase==='fight')firstSight('ammo'+Math.floor(performance.now()/60000),'Munition der Bordkanone fast leer. Nachschub anfordern!');
  if(run.wave>=10&&!run.tut)firstSight('terra','Das Terraforming greift. Die Kolonie wächst, haltet durch!');
  achCheck();
}

/* ---------- Statistik und Erfolge mit Lackierungen ---------- */
M.stats=Object.assign({kills:0,boss:0,fly:0,grab:0,vsB:0,vsS:0,coop:0,daily:0},M.stats||{});
M.ach=M.ach||{};M.paint=M.paint||'std';
const PAINTS={std:{n:'Werksfarbe',c:null},sand:{n:'Sandgelb',c:0xd9c27a},wald:{n:'Waldgrün',c:0x6f8f5a},koenig:{n:'Königsblau',c:0x4a6ad0},gold:{n:'Gold',c:0xd4af37},
  rost:{n:'Rost',c:0xa0583a},obsidian:{n:'Obsidian',c:0x34343c},erde:{n:'Erdbraun',c:0x7a5a3a},blut:{n:'Blutrot',c:0x9a2a2a},neon:{n:'Neonpink',c:0xe04aa0},
  perl:{n:'Perlweiß',c:0xf2f2ee},tuerkis:{n:'Türkis',c:0x3ac0b0},violett:{n:'Violett',c:0x7a4ad0},orange:{n:'Orange',c:0xe0802a},himmel:{n:'Himmelblau',c:0x7ab8e0}};
const ACH=[
  {id:'first',n:'Erste Verteidigung',d:'Überstehe die erste Welle',p:'sand',t:()=>M.bestAll>=2},
  {id:'w25',n:'Veteran',d:'Erreiche Welle 25',p:'wald',t:()=>M.bestAll>=25},
  {id:'w50',n:'Legende',d:'Erreiche Welle 50',p:'koenig',t:()=>M.bestAll>=50},
  {id:'clean50',n:'Unberührt',d:'Erreiche Welle 50, ohne dass der Generator Schaden nimmt',p:'gold',t:()=>run&&!run.tut&&!run.baseHurt&&run.wave>=50&&run.start===1},
  {id:'k1k',n:'Kammerjäger',d:'Besiege 1.000 Gegner',p:'rost',t:()=>M.stats.kills>=1000,prog:()=>[M.stats.kills,1000]},
  {id:'k10k',n:'Ausrotter',d:'Besiege 10.000 Gegner',p:'obsidian',t:()=>M.stats.kills>=10000,prog:()=>[M.stats.kills,10000]},
  {id:'grab',n:'Totengräber',d:'Ziehe 100 Gegner mit Gräbern unter die Erde',p:'erde',t:()=>M.stats.grab>=100,prog:()=>[M.stats.grab,100]},
  {id:'boss',n:'Königsmörder',d:'Besiege 10 Bosse',p:'blut',t:()=>M.stats.boss>=10,prog:()=>[M.stats.boss,10]},
  {id:'combo5',n:'Kettenreaktion',d:'Erreiche eine ×5 Combo',p:'neon',t:()=>false},
  {id:'reb',n:'Wiedergeboren',d:'Führe eine Wiedergeburt durch',p:'perl',t:()=>M.rebirths>=1},
  {id:'coop',n:'Waffenbrüder',d:'Erreiche im Koop Welle 10',p:'tuerkis',t:()=>M.stats.coop>=1},
  {id:'vs',n:'Sieger',d:'Gewinne ein Spiel Schwarm gegen Brigade',p:'violett',t:()=>M.stats.vsB+M.stats.vsS>=1},
  {id:'daily',n:'Tagwerk',d:'Erreiche in einer täglichen Herausforderung Welle 10',p:'orange',t:()=>M.stats.daily>=1},
  {id:'fly',n:'Flugabwehr',d:'Schieße 50 Flieger ab',p:'himmel',t:()=>M.stats.fly>=50,prog:()=>[M.stats.fly,50]},
];
function achGet(id){
  if(M.ach[id])return;const a=ACH.find(x=>x.id===id);if(!a)return;
  M.ach[id]=Date.now();saveMeta();SFX.unlockJingle();
  banner('ERFOLG<small>'+a.n+' · Neue Lackierung: '+PAINTS[a.p].n+'</small>');updAchBtn();
}
function achCheck(){
  if(specHook||(MP&&MP.spec))return;
  if(run&&MP&&!MP.vs&&run.wave>=10)M.stats.coop=Math.max(M.stats.coop,1);
  for(const a of ACH)if(!M.ach[a.id]&&a.t())achGet(a.id);
}
function updAchBtn(){const n=ACH.filter(a=>M.ach[a.id]).length;$('achCount').textContent=n+' / '+ACH.length}
const paintOk=k=>k==='std'||ACH.some(a=>a.p===k&&M.ach[a.id]);
function renderAch(){
  const L=$('achList');L.innerHTML='';
  ACH.forEach(a=>{const got=!!M.ach[a.id],pr=a.prog&&!got?a.prog():null,P=PAINTS[a.p];
    const li=el('li',got?'got':'',`<i class="sw" style="background:#${P.c.toString(16).padStart(6,'0')}"></i><div class="who"><b></b><span></span></div><span class="st">${got?'Geschafft':pr?fmt(Math.min(pr[0],pr[1]))+' / '+fmt(pr[1]):'Offen'}</span>`);
    li.querySelector('b').textContent=a.n;li.querySelector('.who span').textContent=a.d+' · Lackierung: '+P.n;L.appendChild(li)});
  updAchBtn();
}
$('bAch').onclick=()=>{renderAch();showOv('ovAch')};
$('achClose').onclick=()=>{renderMenu();showOv('ovMenu')};
updAchBtn();

/* ---------- Tägliche Herausforderung ---------- */
const DAILY_MODS=[
  {k:'double',n:'Doppelte Horde',d:'Doppelt so viele Gegner, dafür doppelte Medaillen.'},
  {k:'rockets',n:'Nur Raketen',d:'Statt der Bordkanone hast du nur den Raketenwerfer. Level-ups bringen keine weiteren Waffen.'},
  {k:'glass',n:'Glaskanone',d:'Der Generator hat nur den halben Schild, deine Waffen machen 50 % mehr Schaden.'},
  {k:'swarm',n:'Schwarmtag',d:'Es kommen nur Schwärmer, Flieger und Heiler, dafür viele.'},
  {k:'night',n:'Ewige Nacht',d:'Es bleibt die ganze Zeit dunkel, und die Gegner sind 15 % schneller.'},
  {k:'rich',n:'Goldrausch',d:'Doppelte Credits, aber Unterstützungen laden doppelt so lange.'},
];
const todayKey=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const daySeed=k=>{let h=2166136261;for(const c of k)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h};
function dailyInfo(){const k=todayKey(),s=daySeed(k),r=seeded(s);return{key:k,seed:s,map:Math.floor(r()*MAPS.length),mod:DAILY_MODS[Math.floor(r()*DAILY_MODS.length)]}}
function dailyBest(){const d=M.daily;return d&&d.key===todayKey()?d:null}
function openDaily(){
  const D=dailyInfo(),b=dailyBest();
  $('dyDate').textContent=new Date().toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'});
  $('dyMap').textContent=MAPS[D.map].name+' · '+MAPS[D.map].sub;$('dyMod').textContent=D.mod.n;$('dyModD').textContent=D.mod.d;
  $('dyBest').textContent=b?'Dein Bestwert heute: Welle '+b.w+' · '+fmt(b.k)+' Abschüsse':'Du hast heute noch nicht gespielt.';
  const L=$('dyFriends');L.innerHTML='';
  const rows=(typeof FR!=='undefined'?FR.list:[]).filter(f=>f.dy&&f.dy.d===D.key).map(f=>({n:f.name,w:f.dy.w,k:f.dy.k}));
  if(b)rows.push({n:'Du',w:b.w,k:b.k,me:true});
  rows.sort((a,c)=>c.w-a.w||c.k-a.k);
  $('dyFrHead').hidden=!rows.length;
  rows.forEach((r,i)=>{const li=el('li',r.me?'me':'',`<span class="rk">${i+1}.</span><b></b><span>Welle ${r.w} · ${fmt(r.k)}</span>`);li.querySelector('b').textContent=r.n;L.appendChild(li)});
  showOv('ovDaily');
}
let pendingDaily=null;
function startDaily(){const D=dailyInfo();setEqual(true);pendingDaily=D;startRun(1)}
// Vor dem Start der Welle: Regeln setzen (wird in startRun aufgerufen)
function dailyPre(){
  if(!pendingDaily)return;run.daily=pendingDaily;pendingDaily=null;const m=run.daily.mod.k;
  run.ship='bastion';setShipModel(ship,'bastion');
  run.glass=m==='glass';run.night=m==='night';run.rich=m==='rich';run.swarmDay=m==='swarm';run.double=m==='double';
  if(m==='rockets'){run.weapons=['raketen'];run.sel='raketen';run.noWeaponPicks=true}
}
function dailyPost(){
  if(!run.daily)return;const m=run.daily.mod.k;
  setMap(run.daily.map);env.snow=!!MAP.snow;
  if(m==='glass')run.dmgMul*=1.5;
  if(m==='night')env.t=.75;
  if(m==='double')run.mdMul*=2;
  if(m==='rich')run.crMul*=2;
  run.hp=R('basis','maxhp');
}
function dailyEnd(){
  if(!run||!run.daily)return;
  const k=todayKey(),b=dailyBest(),w=run.wave,kl=run.kills;
  if(!b||w>b.w||(w===b.w&&kl>b.k)){M.daily={key:k,w,k:kl};toast('Neuer Tagesbestwert: Welle '+w)}
  if(w>=10)M.stats.daily=Math.max(M.stats.daily,1);
  saveMeta();if(typeof frBroadcast==='function')frBroadcast(true);
}
$('bDaily').onclick=openDaily;$('dyGo').onclick=startDaily;$('dyBack').onclick=()=>{renderMenu();showOv('ovMenu')};

/* Persönlicher Geschenk-Link: schaltet die Ameisenlegion nur in diesem Browser frei */
(function(){try{const q=new URLSearchParams(location.search);
  if(q.get('geschenk')==='ameisen-eric-7q2k'){M.cmdOwned=M.cmdOwned||{};M.cmdOwned.cmd_ameise=1;saveMeta();
    history.replaceState(null,'',location.pathname+location.hash);setTimeout(()=>{toast('Ameisenlegion freigeschaltet');if(typeof renderMenu==='function'&&phase==='menu')renderMenu()},900)}
}catch(e){}})();
