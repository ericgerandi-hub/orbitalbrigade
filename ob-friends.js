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
try{FR.list=(JSON.parse(ls.get(FL_KEY)||'[]')||[]).filter(f=>f&&fcOk(f.fc)&&f.fc!==FR.fc).map(f=>({fc:f.fc,name:cleanName(f.name||'Freund'),last:+f.last||0,st:null,seen:0}))}catch(e){FR.list=[]}
const frSave=()=>ls.set(FL_KEY,JSON.stringify(FR.list.map(f=>({fc:f.fc,name:f.name,last:f.last}))));
const frFind=fc=>FR.list.find(f=>f.fc===fc);
const frName=()=>ls.get(NAME_KEY)||'';
const frOnline=f=>{const c=FR.conns[f.fc];return !!(c&&c.open&&performance.now()-f.seen<25000)};

/* ---------- Eigener Status ---------- */
function myStatus(){
  const o={};
  if(MP&&phase==='menu'){o.s='lobby';o.full=!!MP.partnerPeer;o.open=MP.role==='host'&&!!MP.open&&!MP.partnerPeer;if(o.open)o.room=MP.code;o.mode=MP.mode||'c'}
  else if(run&&phase!=='menu'){o.s=run.tut?'tut':MP?(MP.vs?'vs':'coop'):'solo';o.w=run.wave;o.map=MAP?MAP.name:'';if(MP)o.with=MP.partnerName||''}
  else o.s='menu';
  return o;
}
function statusText(f){
  if(!frOnline(f))return f.last?'Offline · zuletzt online '+ago(f.last):'Offline';
  const s=f.st||{};
  switch(s.s){
    case'lobby':return s.open?'In der Lobby · offen für Freunde':s.full?'In der Lobby mit Mitspieler':'In der Lobby';
    case'solo':return'Spielt allein · Welle '+(s.w||1)+(s.map?' · '+s.map:'');
    case'coop':return'Koop'+(s.with?' mit '+s.with:'')+' · Welle '+(s.w||1)+(s.map?' · '+s.map:'');
    case'vs':return'Schwarm gegen Brigade'+(s.with?' mit '+s.with:'')+' · Welle '+(s.w||1);
    case'tut':return'Im Tutorial';
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
    FR.conns[fc]=c;f.pending=false;f.name=cleanName(d.n)||f.name;f.st=d.st||null;f.seen=performance.now();f.last=Date.now();frSave();renderFriends();setTimeout(renderFriends,400);
    return;
  }
  const fc=c.peer.slice(FPRE.length),f=frFind(fc);if(!f)return;
  f.seen=performance.now();f.last=Date.now();
  if(d.t==='st'){f.st=d.st||null;if(d.n)f.name=cleanName(d.n)}
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
  renderFriends();showOv('ovFriends');
}
function frRow(f,lobby){
  const on=frOnline(f),st=f.st||{},li=el('li','');
  li.innerHTML=`<i class="dot ${on?(st.s&&st.s!=='menu'&&st.s!=='lobby'?'game':'on'):''}"></i><div class="who"><b></b><span></span></div>`;
  li.querySelector('b').textContent=f.name;li.querySelector('.who span').textContent=statusText(f);
  const canInvite=on&&MP&&MP.role==='host'&&phase==='menu'&&!MP.partnerPeer;
  if(canInvite){const b=el('button','btn sm','Einladen');b.onclick=()=>{if(frSend(f.fc,{t:'inv',room:MP.code,mode:MP.mode||'c'})){toast('Einladung an '+f.name+' geschickt');b.disabled=true;b.textContent='Eingeladen'}};li.appendChild(b)}
  else if(on&&st.s==='lobby'&&st.open&&st.room&&!(MP&&MP.code===st.room)){const b=el('button','btn sm','Beitreten');b.onclick=()=>frJoin(st.room);li.appendChild(b)}
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

$('bFriends').hidden=!window.Peer;
if(window.Peer){
  frStart();
  setInterval(()=>{frPollAll();frBroadcast(false);renderFriends()},5000);
  setInterval(()=>frBroadcast(false),1000);
}
