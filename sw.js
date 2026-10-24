// Orbitalbrigade: Offline-Speicher. Immer zuerst aus dem Netz laden (damit Updates sofort ankommen),
// nur ohne Verbindung aus dem Speicher.
const CACHE='ob-app-2';
self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);
  // Mehrspieler-Vermittlung nie zwischenspeichern
  if(/peerjs\.com$/.test(u.hostname)||u.protocol.startsWith('ws'))return;
  e.respondWith(fetch(r).then(res=>{
    if(res&&(res.ok||res.type==='opaque')){const c=res.clone();caches.open(CACHE).then(ca=>ca.put(r,c)).catch(()=>{})}
    return res;
  }).catch(()=>caches.match(r,{ignoreSearch:u.origin===location.origin}).then(m=>m||(r.mode==='navigate'?caches.match('./index.html',{ignoreSearch:true}):Response.error()))));
});
