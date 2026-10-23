'use strict';
/* =========================================================
   Orbitalbrigade – Freundesliste
   Jeder Spieler hat einen festen Freundescode. Solange das Spiel
   offen ist, verbinden sich die Spiele von Freunden direkt
   miteinander (PeerJS) und tauschen ihren Status aus: online,
   was gerade gespielt wird, Einladungen und offene Lobbys.
   ========================================================= */
const FC_KEY='orbitalbrigade-fc',FL_KEY='orbitalbrigade-friends',FPRE='orbitalbrigade-f1-';
const FR={peer:null,ready:false,conns:{},list:[],inv:null,err:'',fc:''};
const fcGen=()=>{const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let c='';for(let i=0;i<6;i++)c+=A[Math.random()*A.length|0];return c};
const fcOk=c=>/^[A-Z0-9]{6}$/.test(c);
FR.fc=ls.get(FC_KEY);if(!FR.fc||!fcOk(FR.fc)){FR.fc=fcGen();ls.set(FC_KEY,FR.fc)}
try{FR.list=(JSON.parse(ls.get(FL_KEY)||'[]')||[]).filter(f=>f&&fcOk(f.fc)&&f.fc!==FR.fc).map(f=>({fc:f.fc,name:cleanName(f.name||'Freund'),last:+f.last||0,st:null,seen:0,lb:f.lb||null,dy:f.dy||null}))}catch(e){FR.list=[]}
const frSave=()=>ls.set(FL_KEY,JSON.stringify(FR.list.map(f=>({fc:f.fc,name:f.name,last:f.last,lb:f.lb||null,dy:f.dy||null}))));
const frFind=fc=>FR.list.find(f=>f.fc===fc);
const frName=()=>ls.get(NAME_KEY)||'';
const frOnline=f=>{const c=FR.conns[f.fc];return !!(c&&c.open&&performance.now()-f.seen<25000)};

/* ---------- Eigener Status ---------- */
function myStatus(){
  const o={};
  if(MP&&phase==='menu'){o.s='lobby';o.full=!!MP.partnerPeer;o.open=MP.role==='host'&&!!MP.open&&!MP.partnerPeer;if(o.open)o.room=MP.code;o.mode=MP.mode||'c'}
  else if(run&&phase!=='menu'){o.s=run.tut?'tut':MP?(MP.vs?'vs':'coop'):'solo';o.w=run.wave;o.map=MAP?MAP.name:'';if(MP)o.with=MP.partnerName||''}
  else o.s='menu';
  if(specHook)o.s='watch';
  o.spec=!!(run&&phase!=='menu'&&!run.tut&&!specHook&&(!MP||(MP.role==='host'&&!MP.spec)));
  o.lb=myLb();const db=typeof dailyBest==='function'?dailyBest():null;if(db)o.dy={d:db.key,w:db.w,k:db.k};
  return o;
}
function myLb(){return{bw:M.bestAll||0,k:M.stats?M.stats.kills:0,vb:M.stats?M.stats.vsB:0,vs:M.stats?M.stats.vsS:0,rb:M.rebirths||0}}
function frTakeSt(f,st){f.st=st||null;if(st&&st.lb)f.lb=st.lb;if(st&&st.dy)f.dy=st.dy}
function statusText(f){
  if(!frOnline(f))return f.last?'Offline · zuletzt online '+ago(f.last):'Offline';
  const s=f.st||{};
  switch(s.s){
    case'lobby':return s.open?'In der Lobby · offen für Freunde':s.full?'In der Lobby mit Mitspieler':'In der Lobby';
    case'solo':return'Spielt allein · Welle '+(s.w||1)+(s.map?' · '+s.map:'');
    case'coop':return'Koop'+(s.with?' mit '+s.with:'')+' · Welle '+(s.w||1)+(s.map?' · '+s.map:'');
    case'vs':return'Schwarm gegen Brigade'+(s.with?' mit '+s.with:'')+' · Welle '+(s.w||1);
    case'tut':return'Im Tutorial';
    case'watch':return'Schaut einem Freund zu';
    default:return'Online · im Menü';
  }
}
function ago(t){const s=Math.max(0,(Date.now()-t)/1000);if(s<90)return'gerade eben';const m=s/60;if(m<60)return'vor '+Math.round(m)+' Min.';const h=m/60;if(h<36)return'vor '+Math.round(h)+' Std.';const d=h/24;return'vor '+Math.round(d)+(Math.round(d)===1?' Tag':' Tagen')}

/* ---------- Verbindungen ---------- */
function frStart(){
  if(!window.Peer||FR.peer)return;
  let p;try{p=new Peer(FPRE+FR.fc)}catch(e){FR.err='Freunde sind gerade nicht erreichbar.';return}
  FR.peer=p;
  p.on('open',()=>{FR.ready=true;FR.err='';frPollAll();renderFriends()});
  p.on('connection',c=>frAttach(c,false));
  p.on('error',e=>{
    const t=e&&e.type;
    if(t==='peer-unavailable'){const m=/orbitalbrigade-f1-([A-Z0-9]{6})/.exec(e.message||'');if(m){const f=frFind(m[1]);if(f)f.pending=false}return}
    if(t==='unavailable-id')FR.err='Das Spiel ist schon in einem anderen Tab geöffnet. Dort bist du online.';
    else if(t==='network'||t==='server-error'||t==='socket-error'||t==='socket-closed')FR.err='Keine Verbindung zum Vermittlungsdienst.';
    renderFriends();
  });
  p.on('disconnected',()=>{FR.ready=false;setTimeout(()=>{try{if(!p.destroyed)p.reconnect()}catch(e){}},2000)});
}
function frAttach(c,out){
  c.out=out;
  c.on('open',()=>{try{c.send({t:'hi',fc:FR.fc,n:frName()||'Spieler',st:myStatus()})}catch(e){}});
  c.on('data',d=>frData(c,d));
  c.on('close',()=>{for(const k in FR.conns)if(FR.conns[k]===c){delete FR.conns[k];const f=frFind(k);if(f){f.last=Date.now();frSave()}renderFriends()}});
  c.on('error',()=>{});
}
function frData(c,d){
  if(!d||typeof d!=='object')return;
  if(d.t==='hi'){
    const fc=String(d.fc||'');if(!fcOk(fc)||c.peer!==FPRE+fc||fc===FR.fc){try{c.close()}catch(e){}return}
    let f=frFind(fc);
    if(!f){f={fc,name:cleanName(d.n),last:Date.now(),st:null,seen:0};FR.list.push(f);toast(f.name+' hat dich als Freund hinzugefügt');SFX.unlockJingle()}
    // Doppelte Verbindung: die vom kleineren Code aufgebaute bleibt bestehen
    const old=FR.conns[fc];
    if(old&&old!==c&&old.open){const keepOld=(old.out?FR.fc:fc)<(c.out?FR.fc:fc);if(keepOld){try{c.close()}catch(e){}return}try{old.close()}catch(e){}}
    FR.conns[fc]=c;f.pending=false;f.name=cleanName(d.n)||f.name;frTakeSt(f,d.st);f.seen=performance.now();f.last=Date.now();frSave();renderFriends();setTimeout(renderFriends,400);
    return;
  }
  const fc=c.peer.slice(FPRE.length),f=frFind(fc);if(!f)return;
  f.seen=performance.now();f.last=Date.now();
  if(d.t==='st'){frTakeSt(f,d.st);if(d.n)f.name=cleanName(d.n)}
  else if(d.t==='watch'){const st=myStatus();if(st.spec){FR.watchers.add(fc);MIRS.last={};frSend(fc,{t:'watchok'});toast(f.name+' schaut dir jetzt zu')}else frSend(fc,{t:'watchno'})}
  else if(d.t==='unwatch'){FR.watchers.delete(fc)}
  else if(d.t==='watchok'){if(SPEC&&SPEC.fc===fc&&!SPEC.on)beginSpectate()}
  else if(d.t==='watchno'){if(SPEC&&SPEC.fc===fc&&!SPEC.on){SPEC=null;toast(f.name+' kann gerade nicht zugeschaut werden')}}
  else if(d.t==='snap'){if(SPEC&&SPEC.fc===fc&&SPEC.on&&d.s){SPEC.last=d.s;SPEC.at=performance.now()}}
  else if(d.t==='ui'){if(SPEC&&SPEC.fc===fc&&SPEC.on&&d.u&&typeof d.u==='object')mirApply(d.u,d.sc)}
  else if(d.t==='cur'){if(SPEC&&SPEC.fc===fc&&SPEC.on)mirCursor(d)}
  else if(d.t==='inv'&&typeof d.room==='string'&&/^[A-Z0-9]{4}$/.test(d.room)){FR.inv={fc,name:f.name,room:d.room,mode:d.mode==='v'?'v':'c',t:Date.now()};showInvite();SFX.levelUp()}
  else if(d.t==='bye'){try{c.close()}catch(e){}}
  renderFriends();
}
function frPollAll(){
  if(!FR.peer||!FR.ready)return;
  for(const f of FR.list){
    const c=FR.conns[f.fc];if(c&&c.open)continue;if(f.pending&&performance.now()-f.pending<12000)continue;
    f.pending=performance.now();
    try{frAttach(FR.peer.connect(FPRE+f.fc,{reliable:true,serialization:'json'}),true)}catch(e){}
  }
}
let frLastSt='';
function frBroadcast(force){
  const st=myStatus(),js=JSON.stringify(st);if(!force&&js===frLastSt&&performance.now()-(frBroadcast.t||0)<8000)return;
  frLastSt=js;frBroadcast.t=performance.now();
  for(const k in FR.conns){const c=FR.conns[k];if(c&&c.open){try{c.send({t:'st',st,n:frName()})}catch(e){}}}
}
function frSend(fc,msg){const c=FR.conns[fc];if(c&&c.open){try{c.send(msg);return true}catch(e){}}return false}

/* ---------- Oberfläche ---------- */
function openFriends(){
  $('frMyCode').textContent=FR.fc;$('frMsg').textContent='';
  $('frNameRow').hidden=!!frName();if(!frName())$('frNameIn').value='';
  showOv('ovFriends');renderFriends();setFrTab(frTab);
}
function frRow(f,lobby){
  const on=frOnline(f),st=f.st||{},li=el('li','');
  li.innerHTML=`<i class="dot ${on?(st.s&&st.s!=='menu'&&st.s!=='lobby'?'game':'on'):''}"></i><div class="who"><b></b><span></span></div>`;
  li.querySelector('b').textContent=f.name;li.querySelector('.who span').textContent=statusText(f);
  const canInvite=on&&MP&&MP.role==='host'&&phase==='menu'&&!MP.partnerPeer;
  if(canInvite){const b=el('button','btn sm','Einladen');b.onclick=()=>{if(frSend(f.fc,{t:'inv',room:MP.code,mode:MP.mode||'c'})){toast('Einladung an '+f.name+' geschickt');b.disabled=true;b.textContent='Eingeladen'}};li.appendChild(b)}
  else if(on&&st.s==='lobby'&&st.open&&st.room&&!(MP&&MP.code===st.room)){const b=el('button','btn sm','Beitreten');b.onclick=()=>frJoin(st.room);li.appendChild(b)}
  else if(on&&st.spec&&!lobby&&!MP&&!run){const b=el('button','btn ghost sm','Zuschauen');b.onclick=()=>requestSpectate(f);li.appendChild(b)}
  if(!lobby){const x=el('button','x','×');x.title='Entfernen';x.setAttribute('aria-label',f.name+' entfernen');
    x.onclick=()=>{if(x.dataset.arm){FR.list=FR.list.filter(q=>q!==f);frSend(f.fc,{t:'bye'});const c=FR.conns[f.fc];if(c)try{c.close()}catch(e){}delete FR.conns[f.fc];frSave();renderFriends()}else{x.dataset.arm='1';x.textContent='Entfernen?';x.style.fontSize='12px'}};li.appendChild(x)}
  return li;
}
function sortedFriends(){return FR.list.slice().sort((a,b)=>(frOnline(b)-frOnline(a))||(b.last-a.last))}
function renderFriends(){
  const n=FR.list.filter(frOnline).length,bd=$('frBadge');bd.hidden=!n;bd.textContent=n;
  if(!$('ovFriends').hidden){
    const L=$('frList');L.innerHTML='';
    if(FR.err)$('frInfo').textContent=FR.err;else $('frInfo').textContent='Gib deinem Freund deinen Code. Fügt einer den anderen hinzu, steht ihr automatisch beide in der Liste.';
    if(!FR.list.length)L.appendChild(el('li','empty','Noch keine Freunde. Füge jemanden mit seinem Freundescode hinzu.'));
    sortedFriends().forEach(f=>L.appendChild(frRow(f,false)));
    if(frTab==='rank')renderRank();
  }
  if(MP&&!$('ovMP').hidden&&!$('mpLobby').hidden)renderLobbyFriends();
}
function renderLobbyFriends(){
  const host=MP&&MP.role==='host';$('lobbyFr').hidden=!host||!!MP.partnerPeer;
  if($('lobbyFr').hidden)return;
  $('mpOpen').checked=!!MP.open;
  const L=$('lobbyFrList');L.innerHTML='';const on=sortedFriends().filter(frOnline);
  if(!FR.list.length)L.appendChild(el('li','empty','Füge über „Freunde“ im Menü zuerst Freunde hinzu.'));
  else if(!on.length)L.appendChild(el('li','empty','Gerade ist kein Freund online.'));
  on.forEach(f=>L.appendChild(frRow(f,true)));
}
function showInvite(){
  const v=FR.inv;if(!v)return;
  $('invName').textContent=v.name;$('invMode').textContent=v.mode==='v'?'Schwarm gegen Brigade':'Koop';$('invCard').hidden=false;
  clearTimeout(showInvite.t);showInvite.t=setTimeout(()=>{$('invCard').hidden=true;FR.inv=null},60000);
}
async function frJoin(room){
  if(!frName()){openFriends();$('frMsg').textContent='Gib zuerst einen Spielernamen ein.';return}
  if(run&&phase!=='menu')toMenu();else if(MP)mpLeave();
  showOv('ovMP');$('mpMe').textContent=frName();mpView('mpChoice');
  await mpEnter('guest',room);
}
$('invYes').onclick=()=>{const v=FR.inv;$('invCard').hidden=true;FR.inv=null;if(v)frJoin(v.room)};
$('invNo').onclick=()=>{$('invCard').hidden=true;FR.inv=null};
$('bFriends').onclick=openFriends;$('mpFriends').onclick=openFriends;
$('frClose').onclick=()=>{if(MP){showOv('ovMP');renderLobby()}else{renderMenu();showOv('ovMenu')}};
$('frCopy').onclick=async()=>{try{await navigator.clipboard.writeText(FR.fc);toast('Freundescode kopiert')}catch(e){toast('Dein Code: '+FR.fc)}};
$('frNameOk').onclick=()=>{const v=$('frNameIn').value.trim();if(!v)return;ls.set(NAME_KEY,cleanName(v));$('frNameRow').hidden=true;frBroadcast(true);renderFriends()};
$('frAddIn').addEventListener('input',()=>{$('frAddIn').value=$('frAddIn').value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6)});
$('frAddIn').addEventListener('keydown',e=>{if(e.key==='Enter')$('frAddBtn').click();e.stopPropagation()});
$('frNameIn').addEventListener('keydown',e=>{if(e.key==='Enter')$('frNameOk').click();e.stopPropagation()});
$('frAddBtn').onclick=()=>{
  const c=$('frAddIn').value.trim();
  if(!fcOk(c)){$('frMsg').textContent='Ein Freundescode hat 6 Zeichen.';return}
  if(c===FR.fc){$('frMsg').textContent='Das ist dein eigener Code.';return}
  if(frFind(c)){$('frMsg').textContent='Ist schon in deiner Liste.';return}
  FR.list.push({fc:c,name:'Neuer Freund',last:0,st:null,seen:0});frSave();$('frAddIn').value='';
  $('frMsg').textContent='Hinzugefügt. Sobald dein Freund online ist, erscheint sein Name.';frPollAll();renderFriends();
};
$('mpCodeToggle').onclick=()=>{$('mpCodeRow').hidden=!$('mpCodeRow').hidden};
$('mpOpen').onchange=()=>{if(MP&&MP.role==='host'){MP.open=$('mpOpen').checked;frBroadcast(true)}};

/* ---------- Rangliste unter Freunden ---------- */
let frTab='list',lbCat='bw';
const LB_CATS=[['bw','Beste Welle'],['k','Abschüsse'],['vb','Siege als Brigade'],['vs','Siege als Schwarm'],['rb','Wiedergeburten'],['dy','Heute']];
function renderRank(){
  const L=$('frRank');L.innerHTML='';const C=$('lbCats');C.innerHTML='';
  LB_CATS.forEach(([k,n])=>{const b=el('button',lbCat===k?'on':'',n);b.onclick=()=>{lbCat=k;renderRank()};C.appendChild(b)});
  const today=todayKey(),me={n:'Du',me:true,lb:myLb(),dy:dailyBest()?{d:today,w:dailyBest().w,k:dailyBest().k}:null};
  const rows=[me].concat(FR.list.map(f=>({n:f.name,lb:f.lb,dy:f.dy})));
  const val=r=>lbCat==='dy'?(r.dy&&r.dy.d===today?r.dy.w:-1):(r.lb?r.lb[lbCat]||0:-1);
  rows.sort((a,b)=>val(b)-val(a));
  rows.forEach((r,i)=>{const v=val(r),li=el('li',r.me?'me':'',`<span class="rk">${v<0?'–':i+1+'.'}</span><b></b><span>${v<0?(lbCat==='dy'?'heute noch nicht gespielt':'noch keine Daten'):(lbCat==='bw'||lbCat==='dy'?'Welle ':'')+fmt(v)}</span>`);li.querySelector('b').textContent=r.n;L.appendChild(li)});
}
function setFrTab(t){frTab=t;$('frTabList').classList.toggle('on',t==='list');$('frTabRank').classList.toggle('on',t==='rank');$('frListBox').hidden=t!=='list';$('frRankBox').hidden=t!=='rank';if(t==='rank')renderRank()}
$('frTabList').onclick=()=>setFrTab('list');$('frTabRank').onclick=()=>setFrTab('rank');

/* ---------- Zuschauen ---------- */
FR.watchers=new Set();
let SPEC=null,specMP=null;
const SOLOFX={fx:[],fxSeq:0};
specFx=(x,z,r,col)=>{if(!FR.watchers.size)return;SOLOFX.fx.push(++SOLOFX.fxSeq,r1(x),r1(z),r1(r),col|0);if(SOLOFX.fx.length>40)SOLOFX.fx.splice(0,SOLOFX.fx.length-40)};
function specSnapNow(){
  if(MP&&MP.role==='host'&&!MP.spec)return hostSnap();
  if(MP||!run)return null;
  const stub={name:frName()||'Spieler',role:'host',runId:1,fx:SOLOFX.fx,fxSeq:SOLOFX.fxSeq,ab:{},mk:null,buys:[],again:0,peT:0,peAt:0,vs:false,swarmSide:'g',qc:null,vsRes:''};
  MP=stub;try{return hostSnap()}catch(e){return null}finally{MP=null}
}
setInterval(()=>{
  if(!FR.watchers.size)return;
  const st=myStatus();if(!st.spec)return;const s=specSnapNow();if(!s)return;
  for(const fc of FR.watchers){if(!frSend(fc,{t:'snap',s}))FR.watchers.delete(fc)}
},125);
function requestSpectate(f){if(SPEC)return;SPEC={fc:f.fc,name:f.name,on:false};frSend(f.fc,{t:'watch'});toast('Verbinde mit '+f.name+' …');setTimeout(()=>{if(SPEC&&!SPEC.on){SPEC=null;toast(f.name+' antwortet nicht')}},6000)}
function beginSpectate(){
  SPEC.on=true;SPEC.at=performance.now();SPEC.last=null;
  clearAll();run=newRun(1,false);phase='spec';halted=false;
  MP={role:'guest',spec:true,code:'',rm:null,name:frName(),partnerPeer:'spec',partnerName:SPEC.name,P:null,lastSeen:0,runId:1,dmg:{},ab:{},fx:[],fxSeq:0,fxSeen:0,applied:{},
    peerOrder:'auto',peerAbSeen:null,hostMax:100,ebSeen:null,ready:0,pl:[],plSeq:0,plSeen:0,rq:[],rqSeq:0,rqSeen:0,fxSeenP:0,pup:{c:null,d:null,z:[]},peerMarOrder:'auto',
    repR:new Map(),repMa:new Map(),sup:null,wantStart:false,pubT:0,rfT:0,repE:new Map(),repS:new Map(),repT:new Map(),repP:new Map(),repM:new Map(),repH:new Map(),fxAdd(){}};
  ship.visible=false;ship2.position.set(2,SHIP_POS.y,SHIP_POS.z);ship2.rotation.copy(ship.rotation);ship2.scale.copy(ship.scale);ship2.visible=true;
  label2.visible=true;label2.userData.set(SPEC.name,'#5fd0ff');
  showOv(null);$('specName').textContent=SPEC.name;$('specBar').hidden=false;$('app').classList.add('inrun');
  specHook=specTick;frBroadcast(true);
}
function specTick(dt,t){
  if(!SPEC||!SPEC.on)return;
  if(performance.now()-SPEC.at>6000){endSpectate(SPEC.name+' spielt gerade nicht mehr');return}
  const P=SPEC.last;if(!P)return;
  run.wave=num(P.wv,1,1e6,1);run.hp=num(P.hp,0,1e7);MP.hostMax=num(P.mx,1,1e7,100);FIELD_K=num(P.fk,100,300,100)/100;
  if(typeof P.mi==='number'&&P.mi!==mapIdx){setMap(P.mi);env.snow=!!MAP.snow}
  if(Array.isArray(P.env)){env.t=num(P.env[0],0,1000)/1000;env.rainT=num(P.env[1],0,100)/100;env.fogT=num(P.env[2],0,100)/100}
  if(typeof P.sh==='string')setShipModel(ship2,P.sh);
  if(P!==SPEC.applied){SPEC.applied=P;MP.P=P;applySnap(P);MP.pup.d=P.cm||null;applyZombiePuppets(P.zo,dt)}
  updateOnScreen();remoteFire(P,ship2,ship2Tip,dt);if(typeof carrierPuppets==='function')carrierPuppets(P.ac,dt);mpGuestUpdate(dt,t);puppetTick(dt,t);
  showCombo(Math.round(num(P.cc,0,1e6)),num(P.cb,1,5,1));
  $('specInfo').textContent='Welle '+run.wave+' · '+({f:'Kampf',s:'Upgrade-Menü',o:'Run beendet'}[P.ph]||'');
  $('boss').hidden=!bossE;if(bossE){$('bossName').textContent=bossE.T.name;$('bossBar').style.width=Math.max(0,bossE.hp/bossE.max*100)+'%'}
}
function endSpectate(msg){
  mirClear();
  const s=SPEC;SPEC=null;specHook=null;if(s)frSend(s.fc,{t:'unwatch'});
  $('specBar').hidden=true;label2.visible=false;ship.visible=true;toMenu();if(msg)toast(msg);frBroadcast(true);
}
$('specEnd').onclick=()=>endSpectate();

/* ---------- Bildschirm spiegeln: der Zuschauer sieht die Oberfläche und den Mauszeiger ---------- */
// Sender: sichtbare Teile der Oberfläche als HTML, nur was sich geändert hat
const MIRS={last:{},cur:null,down:0,t:0};
const MIR_SKIP=new Set(['c','specBar','qcBtn','qcMenu']);
function mirRoots(){
  const r=[document.getElementById('hudTop'),$('abilBar')];
  for(const n of $('stage').children)if(n.id&&!MIR_SKIP.has(n.id))r.push(n);
  return r.filter(Boolean);
}
function mirShown(n){return !n.hidden&&getComputedStyle(n).display!=='none'}
function mirCollect(){
  const u={},sc={};let any=false;
  for(const n of mirRoots()){
    const h=mirShown(n)?n.outerHTML:null;
    if(h!==(MIRS.last[n.id]===undefined?undefined:MIRS.last[n.id])){u[n.id]=h;MIRS.last[n.id]=h;any=true}
    if(h)n.querySelectorAll('[id]').forEach(x=>{if(x.scrollHeight>x.clientHeight+4&&x.scrollTop>0)sc[x.id]=Math.round(x.scrollTop/(x.scrollHeight-x.clientHeight)*1000)/1000});
  }
  return{u,sc,any};
}
document.addEventListener('pointermove',e=>{MIRS.cur=e},{passive:true,capture:true});
document.addEventListener('pointerdown',e=>{MIRS.cur=e;MIRS.down=1},{passive:true,capture:true});
document.addEventListener('pointerup',()=>{MIRS.down=0},{passive:true,capture:true});
function mirCurInfo(){
  const e=MIRS.cur;if(!e)return null;
  const o={d:MIRS.down,ax:Math.round(e.clientX/innerWidth*1000)/1000,ay:Math.round(e.clientY/innerHeight*1000)/1000};
  let n=e.target;
  if(n&&n.id==='c'){if(mouse.p){o.w=[Math.round(mouse.p.x*10)/10,Math.round(mouse.p.z*10)/10]}return o}
  if(!n||!n.getBoundingClientRect)return o;
  const r=n.getBoundingClientRect(),path=[];
  o.fx=r.width?Math.round((e.clientX-r.left)/r.width*100)/100:.5;o.fy=r.height?Math.round((e.clientY-r.top)/r.height*100)/100:.5;
  while(n&&!n.id&&n.parentElement&&n!==document.body){path.unshift(Array.prototype.indexOf.call(n.parentElement.children,n));n=n.parentElement}
  if(n&&n.id&&n.id!=='app'){o.id=n.id;o.p=path.slice(-12)}
  return o;
}
setInterval(()=>{
  if(!FR.watchers.size||!myStatus().spec)return;
  const c=mirCurInfo();if(c)for(const fc of FR.watchers)frSend(fc,Object.assign({t:'cur'},c));
  MIRS.t++;if(MIRS.t%3)return;
  const m=mirCollect();if(!m.any&&!Object.keys(m.sc).length)return;
  for(const fc of FR.watchers)frSend(fc,{t:'ui',u:m.u,sc:m.sc});
},70);

// Zuschauer: fremdes HTML wird gesäubert und ohne Bedienung angezeigt
const MIR={nodes:{},on:false,cur:null};
function mirSanitize(html){
  const t=document.createElement('template');t.innerHTML=html;
  t.content.querySelectorAll('script,iframe,object,embed,link,meta,style,base,form,frame,frameset,audio,video,source,img').forEach(n=>n.remove());
  t.content.querySelectorAll('*').forEach(n=>{for(const a of Array.from(n.attributes)){const k=a.name.toLowerCase(),v=a.value||'';
    if(k.startsWith('on')||k==='srcdoc'||((k==='href'||k==='src'||k==='xlink:href'||k==='action'||k==='formaction'||k==='poster')&&!/^#/.test(v))||(k==='style'&&/url\s*\(|expression|@import/i.test(v)))n.removeAttribute(a.name)}});
  const el=t.content.firstElementChild;return el&&t.content.childElementCount===1?el:null;
}
function mirFind(id){
  for(const k in MIR.nodes){const n=MIR.nodes[k];if(n.id===id)return n;const q=n.querySelector('#'+CSS.escape(id));if(q)return q}
  return null;
}
function mirApply(u,sc){
  if(!MIR.on){MIR.on=true;document.body.classList.add('mirroring')}
  for(const k in u){
    if(!/^[A-Za-z][\w-]{0,40}$/.test(k)||MIR_SKIP.has(k))continue;
    const old=MIR.nodes[k],h=u[k];
    if(h==null||typeof h!=='string'||h.length>300000){if(old){old.remove();delete MIR.nodes[k]}continue}
    const n=mirSanitize(h);if(!n||n.id!==k)continue;
    const orig=document.getElementById(k);if(!orig||orig.classList.contains('mir'))continue;
    n.classList.add('mir');n.setAttribute('inert','');n.setAttribute('aria-hidden','true');
    n.querySelectorAll('input,button,select,textarea').forEach(x=>x.tabIndex=-1);
    if(old)old.replaceWith(n);else orig.after(n);
    MIR.nodes[k]=n;
  }
  if(sc&&typeof sc==='object')for(const id in sc){const n=mirFind(id),v=+sc[id];if(n&&v>=0&&v<=1)n.scrollTop=v*(n.scrollHeight-n.clientHeight)}
}
function mirCursor(d){
  let c=MIR.cur;
  if(!c){c=MIR.cur=document.createElement('div');c.id='specCursor';c.innerHTML='<svg width="22" height="22" viewBox="0 0 22 22"><path d="M3 2l14 8-6 1.6L8 18z" fill="#fff" stroke="#0b0e1a" stroke-width="1.6" stroke-linejoin="round"/></svg><i></i>';document.body.appendChild(c)}
  let x=null,y=null;
  if(Array.isArray(d.w)&&d.w.length===2){const v=new THREE.Vector3(+d.w[0]||0,0,+d.w[1]||0).project(camera),r=cv.getBoundingClientRect();
    if(Math.abs(v.x)<=1.05&&Math.abs(v.y)<=1.05){x=r.left+(v.x+1)/2*r.width;y=r.top+(1-v.y)/2*r.height}}
  if(x==null&&typeof d.id==='string'){let n=mirFind(d.id);
    if(n&&Array.isArray(d.p))for(const i of d.p){const ch=n.children[i|0];if(!ch)break;n=ch}
    if(n){const r=n.getBoundingClientRect();if(r.width||r.height){x=r.left+Math.max(0,Math.min(1,+d.fx||0))*r.width;y=r.top+Math.max(0,Math.min(1,+d.fy||0))*r.height}}}
  if(x==null){x=Math.max(0,Math.min(1,+d.ax||0))*innerWidth;y=Math.max(0,Math.min(1,+d.ay||0))*innerHeight}
  c.style.left=x+'px';c.style.top=y+'px';c.hidden=false;c.classList.toggle('down',!!d.d);
}
function mirClear(){
  for(const k in MIR.nodes)MIR.nodes[k].remove();MIR.nodes={};MIR.on=false;document.body.classList.remove('mirroring');
  if(MIR.cur){MIR.cur.remove();MIR.cur=null}
}

/* ---------- Schnellnachrichten im Mehrspieler ---------- */
const QC=['Hilfe!','Fokus hier!','Gut gemacht!','Warte kurz!','Los geht\'s!'];
let qcLabels=null;
function quickChat(i){
  if(!MP||MP.spec||!run||phase==='menu')return;
  MP.qc=[(MP.qc?MP.qc[0]:0)+1,i];showChat(0,i);$('qcMenu').hidden=true;
  if(i===1&&mouse.p&&typeof tryMark==='function')tryMark(mouse.p);
}
function showChat(who,i){
  const txt=QC[i];if(!txt)return;
  if(!qcLabels){qcLabels=[makeLabel(),makeLabel()];qcLabels[0].position.set(0,10,0);qcLabels[1].position.set(0,10,0);ship.add(qcLabels[0]);ship2.add(qcLabels[1])}
  const L=qcLabels[who];L.userData.set('„'+txt+'“',who?'#5fd0ff':'#ffd23f');L.visible=true;clearTimeout(L.userData.t);L.userData.t=setTimeout(()=>L.visible=false,3500);
  if(who){toast((MP&&MP.partnerName||'Mitspieler')+': '+txt);SFX.mark(false)}else SFX.click();
}
$('qcBtn').onclick=()=>{const m=$('qcMenu');m.hidden=!m.hidden};
QC.forEach((q,i)=>{const b=el('button','',q+(i<3?' <span class="kbd">'+[8,9,0][i]+'</span>':''));b.onclick=()=>quickChat(i);$('qcMenu').appendChild(b)});
setInterval(()=>{$('qcBtn').hidden=!(MP&&!MP.spec&&run&&phase!=='menu');if($('qcBtn').hidden)$('qcMenu').hidden=true},500);

/* ---------- Meldung, wenn Freunde online oder offline gehen ---------- */
const FRN={t0:performance.now()};
function frNote(f,on){
  let box=$('frNotes');if(!box){box=document.createElement('div');box.id='frNotes';document.body.appendChild(box)}
  const n=el('div','frnote'+(on?' on':''),'<i></i><span></span>');n.querySelector('span').textContent=f.name+(on?' ist jetzt online':' ist offline gegangen');
  box.appendChild(n);while(box.children.length>3)box.firstChild.remove();
  requestAnimationFrame(()=>n.classList.add('show'));
  setTimeout(()=>{n.classList.remove('show');setTimeout(()=>n.remove(),400)},4200);
  try{on?SFX.pickup():SFX.click()}catch(e){}
}
setInterval(()=>{
  for(const f of FR.list){const on=frOnline(f);
    if(f.wasOn===undefined){f.wasOn=on;continue}
    if(on!==f.wasOn){f.wasOn=on;if(performance.now()-FRN.t0>8000)frNote(f,on)}}
},1000);

addEventListener('pagehide',()=>{for(const k in FR.conns)frSend(k,{t:'bye'})});

$('bFriends').hidden=!window.Peer;
if(window.Peer){
  frStart();
  setInterval(()=>{frPollAll();frBroadcast(false);renderFriends()},5000);
  setInterval(()=>frBroadcast(false),1000);
}
