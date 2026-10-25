'use strict';
/* =========================================================
   Orbitalbrigade – als App auf dem Startbildschirm
   Android/PC (Chrome, Edge): echter Installieren-Dialog.
   iPhone/iPad (Safari): kurze Anleitung „Zum Home-Bildschirm“.
   ========================================================= */
const PWA={prompt:null};
const pwaInstalled=()=>matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches||navigator.standalone===true;
const pwaIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const pwaDesktop=()=>!pwaIOS()&&!/android|mobile/i.test(navigator.userAgent);
function pwaUI(){const b=$('bInstall');if(!b)return;b.hidden=pwaInstalled()||!(PWA.prompt||pwaIOS()||pwaDesktop())}
if('serviceWorker' in navigator)addEventListener('load',()=>{navigator.serviceWorker.register('sw.js').catch(()=>{})});
addEventListener('beforeinstallprompt',e=>{e.preventDefault();PWA.prompt=e;pwaUI()});
addEventListener('appinstalled',()=>{PWA.prompt=null;pwaUI();toast(pwaDesktop()?'Orbitalbrigade ist jetzt als Programm installiert':'Orbitalbrigade ist jetzt auf deinem Startbildschirm')});
$('bInstall').onclick=async()=>{
  if(PWA.prompt){const p=PWA.prompt;PWA.prompt=null;p.prompt();try{await p.userChoice}catch(e){}pwaUI();return}
  $('instIOS').hidden=!pwaIOS();$('instPC').hidden=pwaIOS();showOv('ovInstall');
};
$('instClose').onclick=()=>{renderMenu();showOv('ovMenu')};
pwaUI();

/* ---------- Spiel teilen: Teilen-Menü am Handy, Link kopieren am PC ---------- */
const SHARE_URL='https://ericgerandi-hub.github.io/orbitalbrigade/';
const SHARE_TXT='Spiel mit mir Orbitalbrigade! Kostenloses 3D-Spiel im Browser. Über „App installieren“ im Menü landet es auf deinem Startbildschirm.';
$('bShare').hidden=false;
$('bShare').onclick=async()=>{
  if(navigator.share){try{await navigator.share({title:'Orbitalbrigade',text:SHARE_TXT,url:SHARE_URL});return}catch(e){if(e&&e.name==='AbortError')return}}
  try{await navigator.clipboard.writeText(SHARE_TXT+' '+SHARE_URL);toast('Link kopiert. Füge ihn einfach in WhatsApp oder Discord ein.')}
  catch(e){prompt('Diesen Link an deine Freunde schicken:',SHARE_URL)}
};

/* ---------- Anonyme Zählung: Installationen, Spieler pro Tag, Runden ----------
   Es wird nur hochgezählt, keine Namen, keine Geräte-Kennung. Nur auf der echten Webseite. */
const STAT_URL='https://abacus.jasoncameron.dev/hit/orbitalbrigade-eg/';
const statDay=()=>{try{return new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Berlin'})}catch(e){return new Date().toISOString().slice(0,10)}};
const statOn=/github\.io$/.test(location.hostname);
function statHit(k){if(!statOn)return;try{fetch(STAT_URL+k,{mode:'cors',cache:'no-store',keepalive:true}).catch(()=>{})}catch(e){}}
function statOnce(flag,keys){try{if(localStorage.getItem(flag))return;localStorage.setItem(flag,'1')}catch(e){return}keys.forEach(statHit)}
function statInstall(){const d=statDay();statOnce('ob_st_inst',['installs','installs-'+d])}
(function(){
  const d=statDay();
  statOnce('ob_st_dev',['geraete','geraete-'+d]);
  statOnce('ob_st_day_'+d,['spieler-'+d]);
  if(pwaInstalled())statInstall();
  addEventListener('appinstalled',statInstall);
  if(typeof startRun==='function'){const sr=startRun;startRun=function(){statHit('runden-'+statDay());return sr.apply(this,arguments)}}
  try{for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k&&k.startsWith('ob_st_day_')&&k!=='ob_st_day_'+d)localStorage.removeItem(k)}}catch(e){}
})();
