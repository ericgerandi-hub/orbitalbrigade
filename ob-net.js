'use strict';
/* =========================================================
   Orbitalbrigade – Mehrspieler-Verbindung für die eigene Webseite.
   Direkte Verbindung zwischen zwei Browsern (WebRTC über PeerJS).
   Bietet dieselben Funktionen wie der Live-Raum der Claude-Seite
   (join, presence, peers, onPeers, leave), damit ob-mp.js
   unverändert bleibt.
   ========================================================= */
window.OB_NET=(function(){
  if(!window.Peer)return null;
  const PREFIX='orbitalbrigade-v3-';
  function join(name,role){
    return new Promise((resolve,reject)=>{
      let peer,conn=null,mine={},theirs=null,otherId=null,handlers=[],settled=false,closed=false;
      const me=()=>peer&&peer.id||'me';
      const peersList=()=>{const a=[{peer:me(),by:null,isMe:true,sameTab:true,kind:'viewer',guest:false,presence:mine,updatedAt:Date.now()}];
        if(theirs&&otherId)a.push({peer:otherId,by:null,isMe:false,sameTab:false,kind:'viewer',guest:false,presence:theirs,updatedAt:Date.now()});return a};
      const notify=()=>{const ps=peersList();handlers.forEach(h=>{try{h({peers:ps,joined:[],left:[],updated:[]})}catch(e){}})};
      const fail=code=>{if(!settled){settled=true;try{peer&&peer.destroy()}catch(e){}reject({code,message:code})}};
      function attach(c){
        if(conn&&conn!==c){try{c.close()}catch(e){}return}
        conn=c;otherId=c.peer;
        c.on('data',d=>{if(d&&typeof d==='object'&&d.t==='p'){theirs=Object.freeze(d.p||{});notify()}});
        c.on('open',()=>{c.send({t:'p',p:mine})});
        c.on('close',()=>{if(conn===c){conn=null;theirs=null;otherId=null;notify()}});
        c.on('error',()=>{});
      }
      const api={
        name,
        presence(p){mine=Object.assign({},mine,p);for(const k in p)if(p[k]===null)delete mine[k];
          if(conn&&conn.open){try{conn.send({t:'p',p:mine})}catch(e){}}return Promise.resolve()},
        peers:peersList,
        onPeers(h){handlers.push(h);setTimeout(notify,0);return()=>{handlers=handlers.filter(x=>x!==h)}},
        connected:()=>!closed&&!!peer&&!peer.disconnected,
        onConnection(h){setTimeout(()=>h(api.connected()),0);return()=>{}},
        emit(){return Promise.resolve()},on(){return()=>{}},
        leave(){closed=true;try{conn&&conn.close()}catch(e){}try{peer&&peer.destroy()}catch(e){}return Promise.resolve()},
      };
      if(role==='host'){
        peer=new Peer(PREFIX+name);
        peer.on('open',()=>{settled=true;resolve(api)});
        peer.on('connection',attach);
        peer.on('error',e=>{if(!settled)fail(e.type==='unavailable-id'?'taken':'network')});
      }else{
        peer=new Peer();
        peer.on('open',()=>{
          const c=peer.connect(PREFIX+name,{reliable:true,serialization:'json'});attach(c);
          c.on('open',()=>{if(!settled){settled=true;resolve(api)}});
          setTimeout(()=>fail('notfound'),12000);
        });
        peer.on('error',e=>{if(!settled)fail(e.type==='peer-unavailable'?'notfound':'network');});
      }
      peer.on('disconnected',()=>{if(!closed){try{peer.reconnect()}catch(e){}}});
    });
  }
  return{join};
})();
