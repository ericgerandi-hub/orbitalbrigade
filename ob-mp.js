'use strict';
/* =========================================================
   Orbitalbrigade – Mehrspieler (2 Spieler, Koop)
   Der Host simuliert Gegner, Gebäude und Soldaten und schickt
   ~15-mal pro Sekunde einen Schnappschuss über seine Presence.
   Der Gast zeigt diesen Stand, schießt lokal auf die Kopien der
   Gegner und meldet seinen Schaden, seine Platzierungen und
   Fähigkeiten über seine eigene Presence zurück.
   ========================================================= */
const NAME_KEY='orbitalbrigade-name';
const GAME_VER='2026-10-24t';
const ET_KEYS=Object.keys(ET),ST_KEYS=['sentry','wall','minen','moerser','kaserne','ring','graeber'],SC_KEYS=['rifle','flamer','rpg','sniper'];
const ANT_ST=['swarm','form','body','scatter','flood','dying','gone'],EV_KEYS=['meteor','supply','blackout','frenzy','gold'];
$('bMP').hidden=!window.OB_NET;
const r1=v=>Math.round(v*10);
const num=(v,lo,hi,d=0)=>typeof v==='number'&&isFinite(v)?Math.max(lo,Math.min(hi,v)):d;
const cleanName=s=>String(s||'').replace(/[^\p{L}\p{N} _.-]/gu,'').trim().slice(0,16)||'Mitspieler';
let roomNs=null,roomTried=false,roomWhy='';
async function getRoom(){
  if(window.OB_NET)return window.OB_NET;
  if(roomTried&&roomNs)return roomNs;roomTried=true;
  roomWhy=!window.claude||!window.claude.use?'R1':'R2';
  try{roomNs=window.claude&&window.claude.use?await window.claude.use('room'):null}catch(e){roomNs=null;roomWhy='R3'}
  if(roomNs){
    // Kurz prüfen, ob die Verbindung zum Raum wirklich steht
    const err=await new Promise(res=>{let done=false;const fin=v=>{if(!done){done=true;res(v)}};
      try{roomNs.onConnection(c=>{if(c)fin(null)},e=>fin(e&&e.code||'error'))}catch(e){fin('error')}
      setTimeout(()=>fin(roomNs.connected&&roomNs.connected()?null:'timeout'),6000)});
    if(err&&err!=='timeout'){roomWhy='R-'+err;roomNs=null}
  }
  return roomNs;
}

/* ---------- Lobby-Oberfläche ---------- */
function mpView(v){['mpName','mpChoice','mpLobby'].forEach(id=>$(id).hidden=id!==v)}
function mpMsg(t){$('mpText').textContent=t||''}
function openMP(){
  showOv('ovMP');mpMsg('');
  const n=ls.get(NAME_KEY);
  if(!n){mpView('mpName');$('mpNameIn').value='';setTimeout(()=>$('mpNameIn').focus(),50)}
  else{$('mpMe').textContent=n;mpView('mpChoice')}
}
$('bMP').onclick=openMP;
$('mpNameOk').onclick=()=>{
  const n=cleanName($('mpNameIn').value);
  if(!$('mpNameIn').value.trim()){mpMsg('Gib bitte einen Namen ein.');return}
  ls.set(NAME_KEY,n);$('mpMe').textContent=n;mpMsg('');mpView('mpChoice');
};
$('mpNameIn').addEventListener('keydown',e=>{if(e.key==='Enter')$('mpNameOk').click();e.stopPropagation()});
$('mpCodeIn').addEventListener('keydown',e=>{if(e.key==='Enter')$('mpJoin').click();e.stopPropagation()});
$('mpCodeIn').addEventListener('input',()=>{$('mpCodeIn').value=$('mpCodeIn').value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4)});
$('mpRename').onclick=()=>{$('mpNameIn').value=ls.get(NAME_KEY)||'';mpView('mpName')};
$('mpBack').onclick=()=>{if(MP)mpLeave();showOv('ovMenu')};
const NO_ROOM='Mehrspieler geht nur auf der eigenen Webseite des Spiels.';
async function mpEnter(role,code){
  mpMsg('Verbinde …');
  const room=await getRoom();
  if(!room){mpMsg(NO_ROOM+' (Fehlercode '+roomWhy+')');return}
  let rm;
  try{rm=await room.join('ob-'+code.toLowerCase(),role)}catch(e){const c=e&&e.code||'unbekannt';
    if(c==='notfound'){mpMsg('Raum nicht gefunden. Prüf den Code und ob dein Mitspieler das Spiel schon erstellt hat.');return}
    if(c==='taken'){mpMsg('Dieser Code ist gerade belegt. Tippe noch einmal auf „Spiel erstellen“.');return}
    if(c==='network'){mpMsg('Keine Verbindung zum Vermittlungsdienst. Prüf deine Internetverbindung oder versuch ein anderes Netzwerk.');return}mpMsg((c==='not_permitted'||c==='not_granted'?NO_ROOM:'Verbindung fehlgeschlagen. Versuch es gleich noch einmal.')+' (Fehlercode J-'+c+')');return}
  MP={role,code,rm,name:ls.get(NAME_KEY)||'Spieler',partnerPeer:null,partnerName:'',P:null,lastSeen:0,runId:0,
    dmg:{},ab:{},fx:[],fxSeq:0,fxSeen:0,applied:{},peerOrder:'auto',peerAbSeen:null,hostMax:100,ebSeen:null,ready:0,
    pl:[],plSeq:0,plSeen:0,rq:[],rqSeq:0,rqSeen:0,fxSeenP:0,pup:{c:null,d:null,z:[]},evSeen:'',peerMarOrder:'auto',repR:new Map(),repMa:new Map(),sup:null,verWarn:false,wantStart:false,pubT:0,rfT:0,repE:new Map(),repS:new Map(),repT:new Map(),repP:new Map(),repM:new Map(),repH:new Map(),mwSeen:'',lobbyT:0,
    fxAdd(x,z,r,col){this.fx.push(++this.fxSeq,r1(x),r1(z),r1(r),col|0);if(this.fx.length>40)this.fx.splice(0,this.fx.length-40)}};
  rm.onPeers(()=>{if(phase==='menu')renderLobby()},()=>{});
  rm.presence({n:MP.name,r:role==='host'?'h':'g',ph:'l',id:0,v:GAME_VER}).catch(()=>{});
  $('mpCode').textContent=code;mpMsg('');mpView('mpLobby');renderLobby();
}
$('mpCreate').onclick=()=>{const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let c='';for(let i=0;i<4;i++)c+=A[rnd()*A.length|0];mpEnter('host',c)};
$('mpJoin').onclick=()=>{const c=$('mpCodeIn').value.trim().toUpperCase();if(c.length!==4){mpMsg('Der Raum-Code hat 4 Zeichen.');return}mpEnter('guest',c)};
function verMismatch(){return MP&&MP.P&&MP.P.v&&MP.P.v!==GAME_VER}
function renderLobby(){
  if(!MP)return;
  if(typeof renderLobbyFriends==='function')renderLobbyFriends();
  if(verMismatch()){$('mpPlayers').innerHTML='';$('mpWaves').innerHTML='';$('mpWait').textContent=(MP.P.v>GAME_VER?'Dein Mitspieler hat eine neuere Version. Lade die Seite neu (am PC Strg+F5).':'Dein Mitspieler hat eine ältere Version. Er soll die Seite neu laden (am PC Strg+F5).');return}
  const L=$('mpPlayers');L.innerHTML='';
  const add=(n,tag)=>{const li=el('li','',`<b></b><span class="lbl">${tag}</span>`);li.querySelector('b').textContent=n;L.appendChild(li)};
  add(MP.name,MP.role==='host'?'Du · Host':'Du');
  if(MP.partnerPeer)add(MP.partnerName,(MP.role==='host'?'Mitspieler':'Host')+(MP.P&&typeof MP.P.sh==='string'&&(MP.mode||MP.P.md)!=='v'?' · '+shipById(MP.P.sh).name:'')+(MP.ping!=null?' · Ping '+Math.round(MP.ping)+' ms':''));
  renderMode();
  const ctl=$('mpWaves');ctl.innerHTML='';
  if(MP.role==='host'&&MP.mode==='v'){
    $('mpWait').textContent=MP.partnerPeer?(MP.swarmSide==='h'?'Du bist der Schwarm, '+MP.partnerName+' ist die Brigade.':'Du bist die Brigade, '+MP.partnerName+' ist der Schwarm.'):'Lade unten einen Freund ein oder erlaube Freunden, einfach beizutreten.';
    const b=el('button','wv','<b>Kampf starten</b><span>Überlebe '+VS_WAVES+' Wellen</span>');b.disabled=!MP.partnerPeer;b.onclick=()=>mpStartHost(1);ctl.appendChild(b);return}
  if(MP.role==='host'){
    $('mpWait').textContent=MP.partnerPeer?'Wähle die Startwelle, um zu starten.':'Lade unten einen Freund ein oder erlaube Freunden, einfach beizutreten.';
    const opts=[1];for(let w=21;w<=M.best;w+=20)opts.push(w);
    opts.forEach(w=>{const b=el('button','wv',`<b>Welle ${w}</b><span>${w===1?'Normaler Start':'Belohnung ×'+(1+(w-1)/20*.6).toLocaleString('de-DE',{maximumFractionDigits:1})}</span>`);
      b.disabled=!MP.partnerPeer;b.onclick=()=>mpStartHost(w);ctl.appendChild(b)});
  }else $('mpWait').textContent=MP.partnerPeer?`Warte, bis ${MP.partnerName} das Spiel startet …`:'Suche den Host … Prüfe den Code, falls das länger dauert.';
}

/* ---------- Start, Schiffe, Verlassen ---------- */
function mpSetupShips(){
  if(MP.vs){SHIP_POS.x=2;ship.position.x=2;ship2.rotation.copy(ship.rotation);ship2.scale.copy(ship.scale);setShipModel(ship2,'bastion');label1.visible=false;
    if(!isSwarm()){ship.visible=true;ship2.visible=false;label2.visible=false}
    else{ship.visible=false;ship2.position.set(2,SHIP_POS.y,SHIP_POS.z);ship2.visible=true;label2.visible=true;label2.userData.set(MP.partnerName||'Brigade','#5fd0ff')}
    return}
  ship.visible=true;
  const mine=MP.role==='host'?-12:14,other=MP.role==='host'?14:-12;
  SHIP_POS.x=mine;ship.position.x=mine;
  ship2.position.set(other,SHIP_POS.y,SHIP_POS.z);ship2.rotation.copy(ship.rotation);ship2.scale.copy(ship.scale);ship2.visible=true;
  label1.visible=label2.visible=true;label1.userData.set(MP.name,'#ffd23f');label2.userData.set(MP.partnerName||'Mitspieler','#5fd0ff');
}
function guestJoinRun(){
  MP.vs=MP.P.md==='v';MP.swarmSide=MP.P.ss==='h'?'h':'g';setEqual(!!MP.P.eq);
  MP.again=0;MP.runId=MP.P.id;MP.ebSeen=null;MP.fxSeen=Infinity;MP.ready=0;mpSetupShips();startRun(num(MP.P.st,1,1e6,1));MP.fxSeen=0;
  if(Array.isArray(MP.P.fx)&&MP.P.fx.length>=5)MP.fxSeen=MP.P.fx[MP.P.fx.length-5];
}
/* Nach einer Niederlage zusammen bleiben: beide drücken „Erneut starten“ */
function mpOverShown(){
  MP.again=0;$('bToMenu').textContent='Gruppe verlassen';
  const b=$('bAgain');b.disabled=false;b.textContent='Erneut starten';updOverMP();
}
function updOverMP(){
  const b=$('bAgain'),t=$('overMP'),here=!!MP.partnerPeer;
  b.hidden=!here;t.hidden=false;
  if(!here){t.textContent=(MP.partnerName||'Dein Mitspieler')+' hat die Gruppe verlassen.';return}
  const other=MP.P&&MP.P.ag&&MP.P.ag===MP.runId;
  if(MP.again){b.disabled=true;b.textContent='Warte auf '+MP.partnerName+' …'}
  t.textContent=other?MP.partnerName+' ist bereit für die nächste Runde.':'Drückt beide „Erneut starten“, um zusammen weiterzuspielen.';
}
$('bAgain').onclick=()=>{if(!MP||!run)return;MP.again=MP.runId;updOverMP()};
function mpStartHost(w){
  if(!MP||!MP.partnerPeer||verMismatch())return;
  MP.vs=MP.mode==='v';MP.swarmSide=MP.swarmSide||'g';setEqual(!!MP.eq);if(MP.vs){w=1;vsHostInit()}
  MP.again=0;MP.wantStart=false;MP.vsRes='';
  MP.runId=1+(rnd()*1e9|0);mpSetupShips();startRun(w);
}
function mpLeave(){
  if(!MP)return;
  try{MP.rm.leave()}catch(e){}
  clearPuppets();vsCleanup();MP=null;FS=FS0;$('hPing').hidden=true;ship.visible=true;
  ship2.visible=false;label1.visible=label2.visible=false;SHIP_POS.x=2;ship.position.x=2;
}
function partnerLost(){
  const n=MP.partnerName;MP.partnerPeer=null;MP.P=null;
  if(phase==='menu'){renderLobby();return}
  if(MP.role==='host'){toast(n+' hat das Spiel verlassen');ship2.visible=false;label2.visible=false}
  else if(run&&phase!=='over')endRun(false,'Verbindung zum Host verloren');
}
function mpShopLabel(){
  if(!MP)return;
  if(MP.role==='guest')$('bNext').textContent=MP.ready>=run.wave?'Warte auf den Host …':'Bereit';
  else if(MP.wantStart)$('bNext').textContent=`Warte auf ${MP.partnerName} …`;
}
function mpNext(){
  if(MP.role==='guest'){MP.ready=run.wave;mpShopLabel();return}
  if(MP.partnerPeer&&MP.P&&(MP.P.rd||0)<run.wave){MP.wantStart=true;mpShopLabel();return}
  MP.wantStart=false;startWave();
}

/* ---------- Kosmetik: Waffen und Fähigkeiten des Mitspielers ---------- */
function remoteShot(id,aim,tipObj,shipObj){
  for(const tt of turrets2)tt.aim.lookAt(aim);
  FS={turrets:turrets2.length?turrets2:[{tip:tipObj}],ship:shipObj,gi:0};COSMETIC=true;
  try{W_FIRE[id](aim)}finally{COSMETIC=false;FS=FS0}
  SFX.weapon(id,aim);
}
function remoteFire(P,shipObj,tipObj,dt){
  const tw=Math.round(num(P.tw,1,6,1));if(turrets2.length!==tw)buildTurrets2(tw);
  MP.rfT-=dt;
  let hand=P.f&&Array.isArray(P.aim)?WEAPON_IDS[num(P.wp,0,WEAPON_IDS.length-1)]:null;if(hand&&ITEMS[hand].passive)hand=null;
  if(hand&&MP.rfT<=0){MP.rfT=1/Math.min(7,ITEMS[hand].base.rate);remoteShot(hand,new THREE.Vector3(num(P.aim[0],-300,300)/10,.5,num(P.aim[1],-500,500)/10),tipObj,shipObj)}
  // Langsames Auto-Feuer der anderen Waffen des Mitspielers nachbilden
  if(phase!=='fight'||!Array.isArray(P.wl))return;
  MP.raT=MP.raT||{};const f=frontEnemy();
  for(const i of P.wl.slice(0,9)){const id=WEAPON_IDS[i];if(!id||id===hand||ITEMS[id].passive)continue;
    MP.raT[id]=(MP.raT[id]||rnd())-dt;
    if(f&&MP.raT[id]<=0){MP.raT[id]=1/(ITEMS[id].base.rate*.45)*(.9+rnd()*.2);remoteShot(id,lead(f,.5),tipObj,shipObj)}}
}
function remoteAbility(id){
  SFX.ability(id);COSMETIC=true;
  try{
    if(id==='orbital')A_USE.orbital();
    else if(id==='kryo')A_USE.kryo();
    else if(id==='napalm')A_USE.napalm();
    else if(id==='laser'){const f=frontEnemy();laser2.on=ITEMS.laser.base.dur;laser2.p.copy(f?f.g.position:new THREE.Vector3(0,0,10)).setY(0)}
    else if(id==='luft')actR.luft={t:ITEMS.luft.base.dur,next:0};
    else if(id==='barrage')actR.barrage={t:ITEMS.barrage.base.dur,next:0};
  }finally{COSMETIC=false}
}
function readAbilities(P){
  if(!Array.isArray(P.ab))return;
  const cur=ABILITY_IDS.map((_,i)=>num(P.ab[i],0,1e6));
  if(!MP.peerAbSeen){MP.peerAbSeen=cur;return}
  cur.forEach((c,i)=>{if(c>MP.peerAbSeen[i])remoteAbility(ABILITY_IDS[i])});
  MP.peerAbSeen=cur;
}
function myInputs(){
  const aimP=hold||mouse.p;
  return{aim:aimP?[r1(aimP.x),r1(aimP.z)]:null,f:hold&&!run.placing?1:0,wp:WEAPON_IDS.indexOf(run.sel),
    ab:ABILITY_IDS.map(i=>MP.ab[i]||0),qc:MP.qc||null,tw:turrets.length,sh:run&&run.ship||M.shipSel||'bastion',by:MP.buys||[],ag:MP.again||0,mk:MP.mk||null,pt:Math.round(performance.now()),pe:MP.peT||0,pd:MP.peAt?Math.round(performance.now()-MP.peAt):0,wl:run.weapons.map(w=>WEAPON_IDS.indexOf(w)),o:run.order,om:run.mechOrder,mo:run.marOrder,cm:cmdSnap(),zo:zombieSnap(),ac:typeof carrierSnap==='function'?carrierSnap():null,fx:MP.fx.slice(-25),v:GAME_VER};
}

/* ---------- Host ---------- */
function hostSnap(){
  const ph=phase==='fight'?'f':phase==='shop'?'s':phase==='over'?'o':'l';
  const en=[];
  const list=enemies.filter(e=>!e.dead).sort((a,b)=>(b.T.nest?1:0)-(a.T.nest?1:0)||(b.onScreen?1:0)-(a.onScreen?1:0)||dist2D(a.g.position,BASE)-dist2D(b.g.position,BASE)).slice(0,110);
  for(const e of list)en.push(e.id,ET_KEYS.indexOf(e.type),r1(e.g.position.x),r1(e.g.position.z),Math.ceil(e.hp),(e.frozen>0?1:0)|(e.burn>0?2:0)|(e.stun>0?4:0)|(e.under?8:0)|(e.mut?16*(MUT_KEYS.indexOf(e.mut)+1):0));
  const so=[];for(const s of soldiers.slice(0,50))if(!s.dead&&s.g.visible)so.push(s.id,SC_KEYS.indexOf(s.cls),r1(s.g.position.x),r1(s.g.position.z),Math.round(s.g.rotation.y*100),s.own||0);
  const sr=[];for(const s of structs.slice(0,40)){if(!s.active)continue;
    const hpf=s.type==='minen'?s.mines.reduce((m,x)=>m|(1<<x.i),0):s.type==='graeber'?s.diggers.length*256+s.diggers.reduce((m,d,i)=>m|(d.gone?0:1<<i),0):Math.round(s.hp/s.max*100);
    sr.push(s.id,ST_KEYS.indexOf(s.type),r1(s.x),r1(s.z),Math.round(s.g.rotation.y*100),hpf,s.own||0)}
  const me=[];for(const m of mechs.slice(0,12)){if(m.dead)continue;const wl=mechList(m.st);me.push(m.id,r1(m.g.position.x),r1(m.g.position.z),Math.round(m.g.rotation.y*100),m.own||0,Math.round(m.hp/m.max*100),...[0,1,2,3].map(i=>wl[i]?MECH_W.indexOf(wl[i]):-1))}
  const sh=[];for(const q of shuttles.slice(0,6))sh.push(q.id,r1(q.g.position.x),r1(q.g.position.y),r1(q.g.position.z),Math.round(q.g.rotation.y*100),Math.round(q.g.userData.ramp.rotation.x*100));
  const pd=[];for(const p of pods.slice(0,4))pd.push(p.id,r1(p.g.position.x),r1(p.g.position.y),r1(p.g.position.z),p.landed?1:0);
  const rv=[];for(const r of rovers.slice(0,10))if(!r.dead)rv.push(r.id,r1(r.g.position.x),r1(r.g.position.z),Math.round(r.g.rotation.y*100));
  const mr=[];for(const u of marines.slice(0,16))if(!u.dead&&u.g.visible)mr.push(u.id,r1(u.g.position.x),r1(u.g.position.z),Math.round(u.g.rotation.y*100),Math.round(u.hp/u.max*100),u.own||0,u.mel?1:0);
  const sup=supply?[r1(supply.p.x),r1(supply.p.z),r1(supply.g.position.y)]:null;
  const o=Object.assign(myInputs(),{n:MP.name,r:'h',id:MP.runId,ph,wv:run.wave,st:run.start,hp:Math.ceil(run.hp),mx:Math.round(R('basis','maxhp')),
    eb:Math.round((run.earnBase||0)*10)/10,k:run.kills,env:[Math.round(env.t*1000),Math.round(env.rainT*100),Math.round(env.fogT*100)],
    en,so,sr,pd,me,sh,rv,mr,sup,mi:mapIdx,cb:comboMul(),cc:run.combo||0,md:MP.vs?'v':'c',ss:MP.swarmSide||'g',eq:M.eq?1:0,res:MP.vsRes||'',vs:MP.vs?vsSnap():null,bl:ITEMS.basis.stats.map(k=>runLv(run,'basis',k)),ev:run.ev?EV_KEYS.indexOf(run.ev.id):-1,bo:Math.ceil(run.blackout||0),fk:Math.round(FIELD_K*100)});
  return o;
}
function hostApplyGuest(P,dt){
  if(P.id!==MP.runId)return;
  if(!(MP.vs&&MP.swarmSide==='g')){remoteFire(P,ship2,ship2Tip,dt);readAbilities(P);if(typeof carrierPuppets==='function')carrierPuppets(P.ac,dt)}
  else vsHostApply(P);
  if(['attack','hold','retreat','auto'].includes(P.o))MP.peerOrder=P.o;
  if(['attack','hold','retreat','auto'].includes(P.om))MP.peerMechOrder=P.om;
  if(['attack','hold','retreat','auto'].includes(P.mo))MP.peerMarOrder=P.mo;
  if(Array.isArray(P.rq))for(const q of P.rq){if(!q||typeof q.i!=='number'||q.i<=MP.rqSeen)continue;MP.rqSeen=q.i;
    if(q.k==='rep'){const mx=R('basis','maxhp');run.hp=Math.min(mx,run.hp+mx*.25);for(const s of structs)if(s.hp>0&&s.max>1)s.hp=Math.min(s.max,s.hp+s.max*.5);blast(BASE.clone().setY(.3),0x7cf0a8,10,.8,true);domeHit=1}
    else if(q.k==='bu'&&ITEMS.basis.stats.includes(q.s)){const L=runLv(run,'basis',q.s);if(L<STAT[q.s].rMax){run.lv[lvKey('basis',q.s)]=L+1;afterUpgrade('basis',q.s,1);if(phase==='shop')renderRunShop()}}
    else if(q.k==='sab'||q.k==='evo'){if(MP.vs)vsHostReq(q)}
    else if(q.k==='heal'){const mx=R('basis','maxhp');run.hp=Math.min(mx,run.hp+mx*Math.max(0,Math.min(.05,+q.s||0)))}
    else if(q.k==='rally'){for(const u of soldiers.concat(mechs,marines))if(!u.dead&&(u.own||0)===1)u.hp=Math.min(u.max,u.hp+u.max*.4)}}
  applyFx(P.fx,'fxSeenP');
  if(P.mw&&typeof P.mw==='object'){const js=JSON.stringify(P.mw);if(js!==MP.mwSeen){MP.mwSeen=js;const pk=cleanMech(P.mw);for(const m of mechs)if(m.own===1)applyMechPack(m,pk)}}
  if(Array.isArray(P.dm)){
    const byId=new Map();for(const e of enemies)if(!e.dead)byId.set(e.id,e);
    for(let i=0;i+1<P.dm.length;i+=2){
      const id=P.dm[i],tot=num(P.dm[i+1],0,1e9),e=byId.get(id);if(!e)continue;
      const d=tot-(MP.applied[id]||0);if(d<=0)continue;
      MP.applied[id]=tot;e.hp-=d;e.fl=.08;if(e.hp<=0&&!e.dead)kill(e);
    }
  }
  if(Array.isArray(P.pl))for(const q of P.pl){
    if(!q||typeof q.i!=='number'||q.i<=MP.plSeen)continue;MP.plSeen=q.i;
    const id=SUPPORT_IDS[num(q.k,0,SUPPORT_IDS.length-1)],p=clampField(new THREE.Vector3(num(q.x,-300,300)/10,0,num(q.z,-500,500)/10));
    if(!id||dist2D(p,BASE)<BASE_R+2.4||!play())continue;
    const st=cleanPack(q.s);
    if(id==='mech'){st.n=Math.round(num(q.s&&q.s.n,0,MECH_MAX));st.m=cleanMech(q.s&&q.s.m);if(!st.n)continue}
    if(id==='rover'){st.n=Math.round(num(q.s&&q.s.n,0,8));st.dmg=num(q.s&&q.s.dmg,0,1e5,260);st.aoe=num(q.s&&q.s.aoe,1,20,4.5);st.speed=num(q.s&&q.s.speed,.3,4,1);if(!st.n)continue}
    if(id==='marine'){st.n=Math.round(num(q.s&&q.s.n,0,8));st.hp=num(q.s&&q.s.hp,1,1e6,900);st.dmg=num(q.s&&q.s.dmg,0,1e5,16);st.shield=num(q.s&&q.s.shield,0,.75,.3);if(!st.n)continue}
    if(id==='graeber'){st.count=Math.round(num(q.s&&q.s.count,1,12,3));st.grabs=Math.round(num(q.s&&q.s.grabs,1,30,3));st.reload=num(q.s&&q.s.reload,.5,30,5);st.grip=Math.round(num(q.s&&q.s.grip,0,3))}
    if(id==='trupp'){st.comp=(Array.isArray(q.s&&q.s.comp)?q.s.comp:[]).filter(c=>SC_KEYS.includes(c)).slice(0,10);if(!st.comp.length)continue}
    if(S_PLACE[id](p,st,1)!==false)SFX.place();
  }
}
function cleanMech(s){
  const o={hp:num(s&&s.hp,1,1e5,420),dmg:num(s&&s.dmg,0,1e4,12),sp:num(s&&s.sp,.5,10,3),slots:Math.round(num(s&&s.slots,0,4,2)),w:{}};
  MECH_W.forEach(k=>o.w[k]=Math.round(num(s&&s.w&&s.w[k],0,20)));return o;
}
function cleanPack(s){
  const o={};if(!s||typeof s!=='object')return{s:soldierPack()};
  for(const k of ['hp','regen','dmg','count','rate','range','aoe','recruit','cap','troops','shield','speed','grabs','reload','grip','n'])if(k in s)o[k]=num(s[k],0,1e5);
  if(o.count!=null)o.count=Math.min(16,Math.round(o.count));
  const ss=s.s||{};o.s={hp:num(ss.hp,1,1e5,60),dmg:num(ss.dmg,0,1e4,9),sp:num(ss.sp,1,12,4.5),g:Math.round(num(ss.g,0,10))};
  return o;
}

/* ---------- Gast ---------- */
function guestFollowHost(P,dt){
  if(!run||P.id!==MP.runId)return;
  run.hp=num(P.hp,0,1e7);MP.hostMax=num(P.mx,1,1e7,100);
  if(Array.isArray(P.env)){env.t=num(P.env[0],0,1000)/1000;env.rainT=num(P.env[1],0,100)/100;env.fogT=num(P.env[2],0,100)/100}
  const eb=num(P.eb,0,1e9);
  if(MP.ebSeen==null)MP.ebSeen=eb;
  const d=eb-MP.ebSeen;
  if(d>0){MP.ebSeen=eb;run.credits+=d*R('allg','credits')*num(P.cb,1,5,1);run.xp+=d*R('allg','xp');run.medals+=d*.12*R('allg','medals');
    while(run.xp>=xpNeed(run.level)){run.xp-=xpNeed(run.level);run.level++;run.pending++}}
  {const nk=num(P.k,0,1e9);if(nk>run.kills){M.stats.kills+=nk-run.kills}}
  run.kills=num(P.k,0,1e9);
  showCombo(Math.round(num(P.cc,0,1e6)),num(P.cb,1,5,1));
  if(typeof P.mi==='number'&&P.mi!==mapIdx){setMap(P.mi);env.snow=!!MAP.snow;toast('Karte: '+MAP.name+' · '+MAP.sub)}
  if(Array.isArray(P.bl)){let ch=false;ITEMS.basis.stats.forEach((k,i)=>{const h=Math.round(num(P.bl[i],0,50)),key=lvKey('basis',k);if(h>(run.lv[key]||0)){run.lv[key]=h;ch=true}});if(ch&&phase==='shop'&&runCat==='basis')renderRunShop()}
  const bo=num(P.bo,0,60);if(bo>0&&!(run.blackout>0)){SFX.blackout(true);flash(.55,'#000');banner('STROMAUSFALL<small>Fähigkeiten und Unterstützung fallen kurz aus</small>')}
  run.blackout=bo;$('app').classList.toggle('blackout',bo>0);
  FIELD_K=num(P.fk,100,300,100)/100;
  const wv=num(P.wv,1,1e6,run.wave);
  if(P.ph==='o'&&phase!=='over'){if(MP.vs){vsRecord(P.res);endRun(P.res==='s'&&!isSwarm(),vsTitle(P.res))}else endRun(true);return}
  if(MP.vs)vsGuestRead(P);
  if(P.ph==='s'&&phase==='fight'&&wv>run.wave){
    const bonus=(15+run.wave*4)*run.mult*R('allg','credits');
    run.credits+=bonus;run.medals+=(2+run.wave*.4)*run.mult*R('allg','medals');run.lastBonus=Math.round(bonus);
    laser.on=0;act.luft=act.barrage=null;hold=null;exitPlacing();bankMedals();
    run.wave=wv;SFX.waveClear();if(isSwarm())vsOpenEvo();else openRunShop(false);
  }else if(P.ph==='f'&&phase==='shop'&&wv>=run.wave){
    run.wave=wv;phase='fight';halted=false;showOv(null);SFX.horn();
    const ev=EV_KEYS[P.ev];banner('WELLE '+run.wave+(ev?'<small>'+EVENTS[ev].name+': '+EVENTS[ev].sub+'</small>':''));if(ev)SFX.alarm();
    M.best=Math.max(M.best,run.wave);saveMeta();
  }else if(P.ph==='f'&&phase==='fight'&&wv>run.wave)run.wave=wv;
  remoteFire(P,ship2,ship2Tip,dt);
  readAbilities(P);
  if(typeof carrierPuppets==='function')carrierPuppets(P.ac,dt);
  applySnap(P);
}
function applySnap(P){
  const now=performance.now();
  // Gegner
  const seen=new Set(),en=Array.isArray(P.en)?P.en:[];
  for(let i=0;i+5<en.length;i+=6){
    const id=en[i],type=ET_KEYS[en[i+1]];if(!type)continue;seen.add(id);
    const x=num(en[i+2],-600,600)/10,z=num(en[i+3],-600,800)/10,hp=num(en[i+4],0,1e9),f=en[i+5]|0;
    let e=MP.repE.get(id);
    if(!e){
      const T=ET[type],b=T.nest?makeNest():makeBug(type);b.g.position.set(x,0,z);scene.add(b.g);
      e=Object.assign(b,{id,type,T,r:T.r,hp,max:Math.max(hp,T.hp*hpM(num(P.wv,1,1e6,1))*mpHp()),sp:T.sp,rew:0,dmg:0,dead:false,burn:0,burnDps:0,frozen:0,stun:0,fl:0,step:0,ph:0,tx:x,tz:z});
      MP.repE.set(id,e);enemies.push(e);if(T.boss&&!bossE)bossE=e;
    }
    e.tx=x;e.tz=z;
    if(e.localDead&&now-e.localDead>1500){e.localDead=0;e.dead=false;e.g.visible=true}
    if(!e.localDead)e.hp=hp;
    e.frozen=f&1?.3:0;e.stun=f&4?.3:0;e.burnVis=!!(f&2);
    e.under=!!(f&8);if(!e.localDead)e.g.visible=!e.under;
    const mi=(f>>4)&7;if(mi&&!e.mutIcon&&MUT_KEYS[mi-1]){e.mut=MUT_KEYS[mi-1];const ic=makeMutIcon(e.mut);ic.position.y=2.4*e.T.s+1.1;e.g.add(ic);e.mutIcon=ic}
  }
  for(const [id,e] of MP.repE)if(!seen.has(id)){
    if(!e.localDead){const p=e.g.position.clone().setY(.8);spark(p,e.T.col,e.T.boss?40:10,e.T.boss?18:9);SFX.death(p,e.T.boss)}
    e.dead=true;scene.remove(e.g);e.mat.dispose();MP.repE.delete(id);delete MP.dmg[id];
  }
  enemies=enemies.filter(e=>MP.repE.get(e.id)===e);
  if(bossE&&!MP.repE.has(bossE.id))bossE=enemies.find(e=>e.T.boss)||null;
  // Soldaten
  const sseen=new Set(),so=Array.isArray(P.so)?P.so:[];
  for(let i=0;i+5<so.length;i+=6){
    const id=so[i],cls=SC_KEYS[so[i+1]];if(!cls)continue;sseen.add(id);
    let s=MP.repS.get(id);const x=num(so[i+2],-600,600)/10,z=num(so[i+3],-600,800)/10;
    if(!s){const m=makeSoldier(cls);m.g.position.set(x,0,z);scene.add(m.g);s=Object.assign(m,{id,cls,dead:false,own:so[i+5]|0,walk:0,tx:x,tz:z,ry:0});MP.repS.set(id,s);soldiers.push(s)}
    s.tx=x;s.tz=z;s.ry=num(so[i+4],-1e4,1e4)/100;
  }
  for(const [id,s] of MP.repS)if(!sseen.has(id)){s.dead=true;scene.remove(s.g);MP.repS.delete(id)}
  soldiers=soldiers.filter(s=>MP.repS.get(s.id)===s);
  // Gebäude
  const tseen=new Set(),sr=Array.isArray(P.sr)?P.sr:[];
  for(let i=0;i+6<sr.length;i+=7){
    const id=sr[i],type=ST_KEYS[sr[i+1]];if(!type)continue;tseen.add(id);
    const x=num(sr[i+2],-600,600)/10,z=num(sr[i+3],-600,800)/10,ry=num(sr[i+4],-1e4,1e4)/100,hpf=sr[i+5]|0;
    let s=MP.repT.get(id);
    if(!s){
      const p=new THREE.Vector3(x,0,z);let g;
      if(type==='sentry')g=makeSentry();else if(type==='moerser')g=makeMoerser();else if(type==='kaserne')g=makeKaserne();
      else if(type==='wall')g=makeWall();else if(type==='ring'){g=makeWall();g.scale.set(.62,.9,.9)}else g=new THREE.Group();
      g.rotation.y=ry;
      const barY={sentry:2.6,moerser:2.4,kaserne:4.4,wall:2.6,ring:2.2}[type]||3,barW={kaserne:3.4,wall:4,ring:2.6}[type]||2.4;
      s=addStruct(type,g,p,{id,hp:type==='minen'?0:100,barW,barY});s.max=100;s.rep=true;
      if(type==='minen'){s.mask=-1}
      if(type==='graeber'){s.diggers=[];const n=hpf>>8,r=seeded(id);for(let k=0;k<n;k++){const a=r()*6.28,d=n>1?1+Math.sqrt(r())*2.2:0,gx=x+Math.cos(a)*d,gz=z+Math.sin(a)*d;const gg=makeGraeber();gg.position.set(gx,0,gz);gg.rotation.y=(r()-.5)*.8;scene.add(gg);s.diggers.push({g:gg,x:gx,z:gz,gone:false})}}
      MP.repT.set(id,s);
    }
    if(type==='graeber'){s.diggers.forEach((d,k)=>{if(!d.gone&&!(hpf&(1<<k))){d.gone=true;scene.remove(d.g);spark(new THREE.Vector3(d.x,.4,d.z),0x6a4a30,10,6,5)}})}
    else if(type==='minen'){if(s.mask!==hpf){(s.mines||[]).forEach(m=>scene.remove(m.g));s.mask=hpf;placeMines(s,new THREE.Vector3(x,0,z),16,hpf)}}
    else s.hp=hpf;
  }
  for(const [id,s] of MP.repT)if(!tseen.has(id)){if(s.type!=='minen'){const p=s.g.position.clone().setY(1);spark(p,0x8a8f9c,18,10,8);blast(p,0xff9a3d,2.4,.4)}removeStruct(s);MP.repT.delete(id)}
  structs=structs.filter(s=>MP.repT.get(s.id)===s);
  // Drop-Pods
  const pseen=new Set(),pd=Array.isArray(P.pd)?P.pd:[];
  for(let i=0;i+4<pd.length;i+=5){
    const id=pd[i];pseen.add(id);let p=MP.repP.get(id);
    const x=num(pd[i+1],-600,600)/10,y=num(pd[i+2],-100,900)/10,z=num(pd[i+3],-900,900)/10,l=pd[i+4]===1;
    if(!p){const g=makePod();g.position.set(x,y,z);scene.add(g);p={id,g,landed:false,open:0,tx:x,ty:y,tz:z};MP.repP.set(id,p);pods.push(p);SFX.podFall(g.position)}
    p.tx=x;p.ty=y;p.tz=z;
    if(l&&!p.landed){p.landed=true;p.g.userData.flame.visible=false;p.g.position.set(x,y,z);setTimeout(()=>SFX.podOpen(p.g.position),300)}
  }
  for(const [id,p] of MP.repP)if(!pseen.has(id)){scene.remove(p.g);MP.repP.delete(id)}
  pods=pods.filter(p=>MP.repP.get(p.id)===p);
  // Mechs
  const mseen=new Set(),me=Array.isArray(P.me)?P.me:[];
  for(let i=0;i+9<me.length;i+=10){
    const id=me[i];mseen.add(id);const x=num(me[i+1],-600,600)/10,z=num(me[i+2],-600,800)/10;
    const wl=[me[i+6],me[i+7],me[i+8],me[i+9]].map(v=>MECH_W[v]).filter(Boolean),wk=wl.join(',');
    let m=MP.repM.get(id);
    if(!m){const g=makeMech();g.position.set(x,0,z);scene.add(g);m={id,g,rep:true,own:me[i+4]|0,dead:false,walk:0,tx:x,tz:z,ry:0,hp:100,max:100,wk:'',cd:0,st:{w:{},slots:4}};MP.repM.set(id,m);mechs.push(m)}
    m.tx=x;m.tz=z;m.ry=num(me[i+3],-1e4,1e4)/100;m.hp=num(me[i+5],0,100);
    if(m.wk!==wk){m.wk=wk;setMechWeapons(m.g,wl)}
  }
  for(const [id,m] of MP.repM)if(!mseen.has(id)){const q=m.g.position.clone().setY(2);spark(q,0x8a8f9c,24,12,9);blast(q,0xff9a3d,3,.5);scene.remove(m.g);MP.repM.delete(id)}
  mechs=mechs.filter(m=>MP.repM.get(m.id)===m);
  // Shuttles
  const hseen=new Set(),sh=Array.isArray(P.sh)?P.sh:[];
  for(let i=0;i+5<sh.length;i+=6){
    const id=sh[i];hseen.add(id);let q=MP.repH.get(id);
    const x=num(sh[i+1],-900,900)/10,y=num(sh[i+2],-100,1500)/10,z=num(sh[i+3],-1500,900)/10;
    if(!q){const g=makeShuttle();g.position.set(x,y,z);scene.add(g);q={id,g,tx:x,ty:y,tz:z};MP.repH.set(id,q);shuttles.push(q);SFX.jet2(g.position,2.6)}
    q.tx=x;q.ty=y;q.tz=z;q.g.rotation.y=num(sh[i+4],-1e4,1e4)/100;q.g.userData.ramp.rotation.x=num(sh[i+5],0,200)/100;
  }
  for(const [id,q] of MP.repH)if(!hseen.has(id)){scene.remove(q.g);MP.repH.delete(id)}
  shuttles=shuttles.filter(q=>MP.repH.get(q.id)===q);
  // Rover
  const rseen=new Set(),rv=Array.isArray(P.rv)?P.rv:[];
  for(let i=0;i+3<rv.length;i+=4){const id=rv[i];rseen.add(id);let r=MP.repR.get(id);const x=num(rv[i+1],-900,900)/10,z=num(rv[i+2],-900,900)/10;
    if(!r){const m=makeRover();m.g.position.set(x,0,z);scene.add(m.g);r=Object.assign(m,{id,dead:false,tx:x,tz:z,ry:0,spin:0,rep:true});MP.repR.set(id,r);rovers.push(r)}
    r.tx=x;r.tz=z;r.ry=num(rv[i+3],-1e4,1e4)/100}
  for(const [id,r] of MP.repR)if(!rseen.has(id)){scene.remove(r.g);MP.repR.delete(id)}
  rovers=rovers.filter(r=>MP.repR.get(r.id)===r);
  // Panzer-Marines
  const aseen=new Set(),mr=Array.isArray(P.mr)?P.mr:[];
  for(let i=0;i+6<mr.length;i+=7){const id=mr[i];aseen.add(id);let u=MP.repMa.get(id);const x=num(mr[i+1],-900,900)/10,z=num(mr[i+2],-900,900)/10;
    if(!u){const m=makeMarine();m.g.position.set(x,0,z);scene.add(m.g);u=Object.assign(m,{id,dead:false,tx:x,tz:z,ry:0,walk:0,own:mr[i+5]|0,hp:100,max:100,rep:true});MP.repMa.set(id,u);marines.push(u)}
    u.tx=x;u.tz=z;u.ry=num(mr[i+3],-1e4,1e4)/100;u.hp=num(mr[i+4],0,100);u.mel=mr[i+6]===1}
  for(const [id,u] of MP.repMa)if(!aseen.has(id)){const q=u.g.position.clone().setY(1.2);spark(q,0x8a8f9c,18,9,7);scene.remove(u.g);MP.repMa.delete(id)}
  marines=marines.filter(u=>MP.repMa.get(u.id)===u);
  // Versorgungskiste
  if(Array.isArray(P.sup)){const x=num(P.sup[0],-900,900)/10,z=num(P.sup[1],-900,900)/10,y=num(P.sup[2],0,400)/10;
    if(!MP.sup){const g=makeCrate();scene.add(g);MP.sup={g,landed:false}}
    MP.sup.g.position.set(x,y,z);if(y<=0&&!MP.sup.landed){MP.sup.landed=true;MP.sup.g.userData.chute.visible=false;SFX.thump(MP.sup.g.position)}}
  else if(MP.sup){scene.remove(MP.sup.g);MP.sup=null}
  applyFx(P.fx,'fxSeen');
}
function applyFx(fx,key){
  if(!Array.isArray(fx))return;
  for(let i=0;i+4<fx.length;i+=5){
    const seq=fx[i];if(seq<=MP[key])continue;MP[key]=seq;
    COSMETIC=true;try{boom(new THREE.Vector3(num(fx[i+1],-900,900)/10,0,num(fx[i+2],-900,900)/10),num(fx[i+3],1,200)/10,0,{col:fx[i+4]|0})}finally{COSMETIC=false}
  }
}
function mpGuestUpdate(dt,t){
  const k=Math.min(1,dt*10);
  for(const e of enemies){
    if(e.dead)continue;const p=e.g.position;
    const dx=e.tx-p.x,dz=e.tz-p.z,moving=Math.hypot(dx,dz)>.02;
    p.x+=dx*k;p.z+=dz*k;
    if(moving){e.g.rotation.y=lerpAngle(e.g.rotation.y,Math.atan2(dx,dz),Math.min(1,dt*8));e.step+=dt*e.sp*2.2;animLegs(e)}
    if(e.T.fly){p.y=3.2+Math.sin(t*3+e.id)*.35;if(e.wings)for(const w of e.wings)w.w.rotation.z=w.sd*Math.sin(t*32+e.id)*.55}
    if(e.burn>0){e.burn-=dt;hit(e,e.burnDps*dt,true);if(rnd()<dt*8)spark(p.clone().setY(1),0xff7a2a,1,2,4)}
    else if(e.burnVis&&rnd()<dt*6)spark(p.clone().setY(1),0xff7a2a,1,2,4);
    e.fl=Math.max(0,e.fl-dt);
    e.mat.emissive.setHex(e.fl>0?0x664444:e.frozen>0?0x1a4a6a:(e.burn>0||e.burnVis)?0x3a1400:0);
  }
  for(const s of soldiers){
    const p=s.g.position,dx=s.tx-p.x,dz=s.tz-p.z,moving=Math.hypot(dx,dz)>.03;
    p.x+=dx*k;p.z+=dz*k;s.g.rotation.y=lerpAngle(s.g.rotation.y,s.ry,Math.min(1,dt*10));
    if(moving){s.walk+=dt*12;s.body.position.y=Math.abs(Math.sin(s.walk))*.08}else s.body.position.y=0;
  }
  // Mechs und Shuttles des Hosts: Bewegung glätten, Schüsse nur zur Anzeige
  for(const m of mechs){
    const p=m.g.position,ud=m.g.userData,dx=m.tx-p.x,dz=m.tz-p.z,moving=Math.hypot(dx,dz)>.03;
    p.x+=dx*k;p.z+=dz*k;m.g.rotation.y=lerpAngle(m.g.rotation.y,m.ry,Math.min(1,dt*6));
    if(moving){m.walk+=dt*6;ud.legs[0].rotation.x=Math.sin(m.walk)*.5;ud.legs[1].rotation.x=-Math.sin(m.walk)*.5}
    m.cd-=dt;const e=m.cd<=0?nearestEnemy(p,18):null;
    if(e){m.cd=.14;ud.tip.getWorldPosition(tmp);tracer(tmp.clone(),e.g.position.clone().setY(.9),0xffe27a,1.5)}
  }
  for(const r of rovers){const p=r.g.position,dx=r.tx-p.x,dz=r.tz-p.z,mv=Math.hypot(dx,dz);p.x+=dx*k;p.z+=dz*k;r.g.rotation.y=lerpAngle(r.g.rotation.y,r.ry,Math.min(1,dt*8));
    if(mv>.02){r.spin+=dt*25;for(const w of r.wheels)w.rotation.x=r.spin}r.light.visible=Math.sin(t*18)>0}
  for(const u of marines){const p=u.g.position,dx=u.tx-p.x,dz=u.tz-p.z,mv=Math.hypot(dx,dz)>.03;p.x+=dx*k;p.z+=dz*k;u.g.rotation.y=lerpAngle(u.g.rotation.y,u.ry,Math.min(1,dt*8));
    if(mv){u.walk+=dt*9;u.body.position.y=Math.abs(Math.sin(u.walk))*.06}else u.body.position.y=0;
    if(u.mel){u.blade.position.x=Math.sin(t*90)*.03;u.saw.rotation.x=-.25+Math.sin(t*14)*.15;if(rnd()<dt*6)spark(p.clone().setY(1.2).add(tmp.set(Math.sin(u.g.rotation.y)*1.6,0,Math.cos(u.g.rotation.y)*1.6)),0xffd23f,1,4,4)}else u.saw.rotation.x*=.9}
  if(MP.sup&&MP.sup.landed)MP.sup.g.userData.glow.material.opacity=.6+Math.sin(t*6)*.4;
  for(const q of shuttles){q.g.position.x+=(q.tx-q.g.position.x)*k;q.g.position.y+=(q.ty-q.g.position.y)*k;q.g.position.z+=(q.tz-q.g.position.z)*k}
  for(const so of soldiers){
    so.cd=(so.cd||rnd()*.4)-dt;if(so.cd>0)continue;const e=nearestEnemy(so.g.position,14);so.cd=.35+rnd()*.2;
    if(e){so.gun.getWorldPosition(tmp);tracer(tmp.clone(),e.g.position.clone().setY(.8),so.cls==='sniper'?0x9ff3ff:0xffe27a,so.cls==='sniper'?1.6:1)}
  }
  for(const p of pods){
    p.g.position.x+=(p.tx-p.g.position.x)*k;p.g.position.y+=(p.ty-p.g.position.y)*k;p.g.position.z+=(p.tz-p.g.position.z)*k;
    if(!p.landed&&rnd()<.9)spark(p.g.position,rnd()<.5?0xff8a3d:0x8a8a96,1,2,2);
    if(p.landed){p.open=Math.min(1,p.open+dt*2.5);p.g.userData.hinge.rotation.z=-p.open*2.1}
  }
  for(const s of structs){
    if(s.type==='minen'&&s.mines)for(const m of s.mines)m.g.userData.light.visible=Math.sin(t*5+m.ph)>0;
    if(s.bar){s.bar.visible=s.hp<s.max&&s.hp>0;if(s.bar.visible){s.bar.position.set(s.g.position.x,s.barY,s.g.position.z);s.bar.quaternion.copy(camera.quaternion);s.bar.userData.fg.scale.x=Math.max(0,s.hp/s.max)}}
  }
}
function mpRequest(k,s){MP.rq.push({i:++MP.rqSeq,k,s});if(MP.rq.length>4)MP.rq.shift()}
function mpRequestPlace(id,p,st){
  MP.pl.push({i:++MP.plSeq,k:SUPPORT_IDS.indexOf(id),x:r1(p.x),z:r1(p.z),s:st});
  if(MP.pl.length>4)MP.pl.shift();
}
function guestSnap(){
  const dm=[];
  for(const id in MP.dmg){if(!MP.repE.has(+id)){delete MP.dmg[id];continue}dm.push(+id,Math.round(MP.dmg[id]*10)/10)}
  return Object.assign(myInputs(),{sw:MP.sw||[],n:MP.name,r:'g',id:MP.runId,rd:MP.ready,dm:dm.slice(0,300),pl:MP.pl,rq:MP.rq,mw:M.unlocked.mech?mechPack():null});
}

/* ---------- Takt ---------- */
function mpTick(dt,t){
  if(!MP||!MP.rm)return;
  const now=performance.now(),want=MP.role==='host'?'g':'h';
  let peers=[];try{peers=MP.rm.peers()}catch(e){}
  const pt=peers.find(p=>!p.isMe&&p.presence&&p.presence.r===want&&(!MP.partnerPeer||p.peer===MP.partnerPeer));
  if(pt){
    if(!MP.partnerPeer){MP.partnerPeer=pt.peer;MP.peerAbSeen=null;if(phase==='menu')renderLobby()}
    MP.lastSeen=now;MP.P=pt.presence;
    const nm=cleanName(pt.presence.n);if(nm!==MP.partnerName){MP.partnerName=nm;label2.userData.set(nm,'#5fd0ff');if(phase==='menu')renderLobby()}
  }else if(MP.partnerPeer&&now-MP.lastSeen>4000)partnerLost();
  // Ping: Laufzeit hin und zurück, ohne die Wartezeit beim Mitspieler
  if(pt&&typeof pt.presence.pt==='number'&&pt.presence.pt!==MP.peT){MP.peT=pt.presence.pt;MP.peAt=now}
  if(pt&&typeof pt.presence.pe==='number'&&pt.presence.pe>0&&pt.presence.pe!==MP.pingSeen){MP.pingSeen=pt.presence.pe;const rtt=now-pt.presence.pe-num(pt.presence.pd,0,5000);if(rtt>=0&&rtt<10000)MP.ping=MP.ping==null?rtt:MP.ping*.7+rtt*.3}
  if(pt&&Array.isArray(pt.presence.by))readBuys(pt.presence.by);
  MP.pingT=(MP.pingT||0)-dt;if(MP.pingT<=0){MP.pingT=.5;showPing();showFeed();if(phase==='menu')renderLobby()}
  if(run&&phase!=='menu'&&MP.P&&MP.P.id===MP.runId){
    const mk=MP.P.mk;if(Array.isArray(mk)&&mk[1]!==MP.mkSeen){MP.mkSeen=mk[1];const e=enemies.find(x=>x.id===mk[0]&&!x.dead);if(e){markEnemy(e,1);toast(MP.partnerName+' hat einen Gegner markiert')}}MP.pup.d=MP.P.cm||null;applyZombiePuppets(MP.P.zo,dt)}
  puppetTick(dt,t);
  if(MP.P){
    if(Array.isArray(MP.P.qc)&&MP.P.qc[0]>(MP.qcSeen||0)){if(phase!=='menu'&&typeof showChat==='function')showChat(1,MP.P.qc[1]);MP.qcSeen=MP.P.qc[0]}
    if(MP.role==='guest'&&(MP.P.ss==='h'||MP.P.ss==='g'))MP.swarmSide=MP.P.ss;
    if(MP.role==='host'&&typeof MP.P.swp==='number'&&MP.P.swp!==MP.swpSeen){if(MP.swpSeen!=null&&phase==='menu'){MP.swarmSide=MP.swarmSide==='h'?'g':'h';renderLobby()}MP.swpSeen=MP.P.swp}
    if(!MP.vs&&typeof MP.P.sh==='string')setShipModel(ship2,MP.P.sh);
  }
  if(typeof vsTick==='function')vsTick(dt);
  if(verMismatch()&&!MP.verWarn&&phase!=='menu'){MP.verWarn=true;toast('Ihr habt unterschiedliche Spielversionen. Bitte beide die Seite neu laden.')}
  MP.pubT-=dt;const pub=MP.pubT<=0;if(pub)MP.pubT=1/15;
  if(phase==='over'&&run){
    updOverMP();
    if(MP.role==='guest'&&MP.again&&MP.P&&(MP.P.ph==='f'||MP.P.ph==='s')&&MP.P.id&&MP.P.id!==MP.runId){guestJoinRun();return}
    if(MP.role==='host'&&MP.partnerPeer&&MP.again&&MP.again===MP.runId&&MP.P&&MP.P.ag===MP.runId){mpStartHost(run.start);return}
  }
  if(phase==='menu'){
    if(MP.role==='guest'&&MP.P&&(MP.P.ph==='f'||MP.P.ph==='s')&&MP.P.id&&MP.P.id!==MP.runId){guestJoinRun();return}
    if(pub)MP.rm.presence({n:MP.name,r:MP.role==='host'?'h':'g',ph:'l',id:0,v:GAME_VER,md:MP.mode||'c',eq:MP.eq?1:0,ss:MP.swarmSide||'g',swp:MP.swapN||0,sh:M.shipSel||'bastion',pt:Math.round(performance.now()),pe:MP.peT||0,pd:MP.peAt?Math.round(performance.now()-MP.peAt):0}).catch(()=>{});
    return;
  }
  if(!run)return;
  if(MP.role==='host'){
    if(MP.partnerPeer&&MP.P)hostApplyGuest(MP.P,dt);
    if(phase==='shop'&&MP.wantStart&&(!MP.partnerPeer||(MP.P&&(MP.P.rd||0)>=run.wave))){MP.wantStart=false;startWave()}
    if(pub)MP.rm.presence(hostSnap()).catch(()=>{});
  }else{
    if(MP.P)guestFollowHost(MP.P,dt);
    if(pub&&MP)MP.rm.presence(guestSnap()).catch(()=>{});
  }
}

/* ---------- Kommandant und Zombies des Mitspielers (nur Anzeige) ---------- */
function cmdSnap(){
  const c=run&&run.cmd;if(!c)return null;
  const o={i:c.id,d:c.dead?1:0};
  if(c.ant){o.s=ANT_ST.indexOf(c.state);o.cx=r1(c.center.x);o.cz=r1(c.center.z);o.bx=r1(c.bodyPos.x);o.bz=r1(c.bodyPos.z);
    o.f=Math.round(c.face*100);o.a=Math.round(c.armA*100);o.w=Math.round((c.walk||0)*10);o.n=c.n;o.bs=Math.round(c.bs*100);
    if(c.floodP){o.fx=r1(c.floodP.x);o.fz=r1(c.floodP.z)}}
  else{const p=c.g.position;o.x=r1(p.x);o.y=r1(p.y);o.z=r1(p.z);o.r=Math.round(c.g.rotation.y*100);o.v=c.g.visible&&c.g.parent?1:0;o.mv=c.body&&c.body.position.y>.01?1:0}
  return o;
}
function zombieSnap(){const z=[];for(const q of zombies.slice(0,24))if(!q.dead)z.push(r1(q.g.position.x),r1(q.g.position.z),Math.round(q.g.rotation.y*100));return z}
function applyZombiePuppets(zo,dt){
  const pz=MP.pup.z,arr=Array.isArray(zo)?zo:[],n=Math.floor(arr.length/3);
  while(pz.length<n){const m=makeZombie();scene.add(m.g);m.g.position.set(num(arr[pz.length*3],-900,900)/10,0,num(arr[pz.length*3+1],-900,900)/10);m.walk=0;pz.push(m)}
  while(pz.length>n){const m=pz.pop();spark(m.g.position.clone().setY(.8),0x6f8a5a,8,5);scene.remove(m.g)}
  pz.forEach((m,i)=>{m.tx=num(arr[i*3],-900,900)/10;m.tz=num(arr[i*3+1],-900,900)/10;m.ry=num(arr[i*3+2],-1e4,1e4)/100});
}
function clearPuppets(){
  if(!MP)return;const pp=MP.pup;
  if(pp.c){scene.remove(pp.c.g);pp.c=null}pp.z.forEach(m=>scene.remove(m.g));pp.z=[];pp.d=null;
  if(MP.sup){scene.remove(MP.sup.g);MP.sup=null}
}
function puppetTick(dt,t){
  const pp=MP.pup,k=Math.min(1,dt*10);
  for(const m of pp.z){const p=m.g.position,dx=m.tx-p.x,dz=m.tz-p.z;p.x+=dx*k;p.z+=dz*k;m.g.rotation.y=lerpAngle(m.g.rotation.y,m.ry,Math.min(1,dt*8));
    if(Math.hypot(dx,dz)>.02){m.walk+=dt*10;m.body.position.y=Math.abs(Math.sin(m.walk))*.08}}
  const o=pp.d;
  if(!o||!CMD_IDS.includes(o.i)||!run){if(pp.c){scene.remove(pp.c.g);pp.c=null}return}
  if(!pp.c||pp.c.id!==o.i){
    if(pp.c)scene.remove(pp.c.g);const m=makeCommander(o.i);
    pp.c={id:o.i,g:m.g,body:m.body,ant:!!m.ant,jet:!!m.jet,mesh:m.mesh,eyes:m.eyes,center:new THREE.Vector3(),bodyPos:new THREE.Vector3(),state:'',st:0,face:0,armA:.25,walk:0,bs:1.15,n:0,first:true};
    scene.add(pp.c.g);
  }
  const c=pp.c;
  if(c.ant){
    const n=Math.round(num(o.n,1,ANT_MAX,240));
    if(c.first){c.center.set(num(o.cx,-900,900)/10,0,num(o.cz,-900,900)/10);c.bodyPos.copy(c.center)}
    if(c.n!==n)antsInit(c,false,n);c.first=false;
    c.center.x+=(num(o.cx,-900,900)/10-c.center.x)*k;c.center.z+=(num(o.cz,-900,900)/10-c.center.z)*k;
    c.bodyPos.x+=(num(o.bx,-900,900)/10-c.bodyPos.x)*k;c.bodyPos.z+=(num(o.bz,-900,900)/10-c.bodyPos.z)*k;
    c.face=lerpAngle(c.face,num(o.f,-1e4,1e4)/100,k);c.armA=num(o.a,-400,400)/100;c.walk=num(o.w,-1e7,1e7)/10;c.bs=num(o.bs,50,400,115)/100;
    const S=ANT_ST[o.s]||'swarm';
    if(S!==c.state){if((S==='scatter'||S==='dying')&&(c.state==='body'||c.state==='form'))antScatter(c,S==='dying'?2.4:1);c.state=S;c.st=0;c.g.visible=S!=='gone'}
    c.st+=dt;let kk=0;
    if(S==='swarm')antSwarmStep(c,dt,t,c.center.x,c.center.z,1,10);
    else if(S==='flood')antSwarmStep(c,dt,t*.6,num(o.fx,-900,900)/10,num(o.fz,-900,900)/10,9/3.2,13);
    else if(S==='form'){antBodyStep(c,dt,true);kk=Math.min(1,c.st/.8)}
    else if(S==='body'){antBodyStep(c,dt,false);kk=1;[-1,1].forEach((sd,i)=>{const q=antBodyPos(c,{x:sd*.2,y:3.7,z:.48,arm:0,leg:0});c.eyes[i].position.set(q.x,q.y,q.z)})}
    else if(S==='scatter'||S==='dying'){antScatterStep(c,dt);kk=S==='scatter'?Math.max(0,1-c.st/.35):0}
    c.eyes.forEach(e=>e.visible=S==='body');
    if(S!=='gone')drawAnts(c,kk);
    return;
  }
  const tx=num(o.x,-900,900)/10,ty=num(o.y,-100,900)/10,tz=num(o.z,-900,900)/10,p=c.g.position;
  if(c.first){p.set(tx,ty,tz);c.first=false}
  const ox=p.x,oz=p.z;p.x+=(tx-p.x)*k;p.y+=(ty-p.y)*k;p.z+=(tz-p.z)*k;
  c.g.visible=!o.d&&o.v!==0;
  if(c.jet){if(Math.hypot(p.x-ox,p.z-oz)>.001)c.g.lookAt(tmp.set(p.x+(p.x-ox)*20,p.y,p.z+(p.z-oz)*20))}
  else{c.g.rotation.y=lerpAngle(c.g.rotation.y,num(o.r,-1e4,1e4)/100,Math.min(1,dt*8));
    if(o.mv){c.walk+=dt*12;c.body.position.y=Math.abs(Math.sin(c.walk))*.08}else c.body.position.y=0}
}

function showPing(){
  const el=$('hPing');if(!MP||!MP.partnerPeer){el.hidden=true;return}
  el.hidden=false;const v=MP.ping;
  $('hPingVal').textContent=v==null?'Ping …':'Ping '+Math.round(v)+' ms';
  el.classList.toggle('mid',v!=null&&v>=80&&v<160);el.classList.toggle('bad',v!=null&&v>=160);
}

/* ---------- Käufe des Mitspielers im Upgrade-Menü (kleine Zeile) ---------- */
function mpBought(txt){MP.buys=MP.buys||[];MP.buySeq=(MP.buySeq||0)+1;MP.buys.push([MP.buySeq,run?run.wave:0,String(txt).slice(0,40)]);if(MP.buys.length>8)MP.buys.shift()}
function readBuys(by){
  MP.peerBuys=MP.peerBuys||[];let neu=false;
  for(const b of by){if(!Array.isArray(b)||typeof b[0]!=='number'||b[0]<=(MP.buySeen||0))continue;MP.buySeen=b[0];MP.peerBuys.push({w:num(b[1],0,1e6),t:String(b[2]||'').replace(/[<>&]/g,'').slice(0,40),at:performance.now()});neu=true}
  if(MP.peerBuys.length>8)MP.peerBuys.splice(0,MP.peerBuys.length-8);
  if(neu)showFeed();
}
function showFeed(){
  const f=$('mpFeed');if(!MP||!run){f.hidden=true;return}
  if(MP.feedPh==='shop'&&phase!=='shop')MP.feedFrom=performance.now();MP.feedPh=phase;
  const list=(MP.peerBuys||[]).filter(b=>b.at>=(MP.feedFrom||0)).slice(-4).reverse();
  if(!list.length){f.hidden=true;return}
  f.hidden=false;const now=performance.now();
  f.innerHTML='<b></b> '+list.map(b=>`<span class="${now-b.at<2500?'new':''}">${b.t}</span>`).join(' · ');
  f.querySelector('b').textContent=(MP.partnerName||'Mitspieler')+':';
}
