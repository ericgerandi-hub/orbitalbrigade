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
