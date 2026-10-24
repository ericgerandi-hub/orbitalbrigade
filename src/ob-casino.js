'use strict';
/* =========================================================
   Orbitalbrigade – Casino
   Sterne werden zu Tokens (1 ★ = 20 Tokens). Drei Spiele:
   Ballraten, Slot-Automat und Black Jack. Gewinne: Tokens,
   Medaillen und selten Sterne. Auf Dauer gewinnt knapp das Haus.
   ========================================================= */
const CS={game:'ball',bet:5,busy:false,bj:null};
const CS_RATE=20,CS_BETS=[1,5,10,25,50];
function csTok(){return Math.max(0,M.tokens|0)}
function csAdd(t){M.tokens=Math.max(0,(M.tokens|0)+t)}
function csWallet(){
  $('csTok').textContent=fmt(csTok());$('csStar').textContent=M.stars|0;$('csMed').textContent=fmt(M.medals);
  $('csX1').disabled=(M.stars|0)<1;$('csX5').disabled=(M.stars|0)<5;
}
function csMsg(t,cls){const m=$('csMsg');m.textContent=t;m.className='cmsg'+(cls?' '+cls:'')}
function csPay(bet){if(csTok()<bet){csMsg('Nicht genug Tokens. Tausche Sterne gegen Tokens.','bad');SFX.deny();return false}csAdd(-bet);saveMeta();csWallet();return true}
function openCasino(){renderCasino();showOv('ovCasino')}
function renderCasino(){
  csWallet();
  const T=$('csTabs');T.innerHTML='';
  [['ball','Ballraten'],['slot','Slot-Automat'],['bj','Black Jack']].forEach(([k,n])=>{const b=el('button','tab'+(CS.game===k?' on':''),n);b.onclick=()=>{if(CS.busy||(CS.bj&&!CS.bj.done))return;CS.game=k;renderCasino();SFX.click()};T.appendChild(b)});
  const B=$('csBets');B.innerHTML='<span class="lbl">Einsatz</span>';
  CS_BETS.forEach(v=>{const b=el('button','cbet'+(CS.bet===v?' on':''),String(v));b.onclick=()=>{if(CS.busy||(CS.bj&&!CS.bj.done))return;CS.bet=v;renderCasino();SFX.click()};B.appendChild(b)});
  const G=$('csGame');G.innerHTML='';G.className='cgame '+CS.game;
  if(CS.game==='ball')renderBall(G);else if(CS.game==='slot')renderSlot(G);else renderBJ(G);
}
$('csX1').onclick=()=>csExchange(1);$('csX5').onclick=()=>csExchange(5);
function csExchange(n){if((M.stars|0)<n){SFX.deny();return}M.stars-=n;csAdd(n*CS_RATE);saveMeta();SFX.buy();csWallet();csMsg(n+' ★ gegen '+n*CS_RATE+' Tokens getauscht.','ok')}
$('csBack').onclick=()=>{if(CS.busy)return;renderMenu();showOv('ovMenu')};
$('bCasino').onclick=$('bCasino2').onclick=()=>{SFX.click();openCasino()};

/* ---------- Ballraten: unter einem von drei Bechern liegt der Ball ---------- */
function renderBall(G){
  G.innerHTML='<p class="chint">Der Ball wird verdeckt unter einen Becher gelegt. Tippe auf den richtigen Becher. Treffer zahlt das 2,8-Fache.</p><div class="cups" id="csCups"></div>';
  const C=$('csCups');
  for(let i=0;i<3;i++){const c=el('button','cup','<i class="ball"></i><b></b>');c.onclick=()=>playBall(i);C.appendChild(c)}
  csMsg('Wähle einen Becher.');
}
function playBall(pick){
  if(CS.busy||!csPay(CS.bet))return;CS.busy=true;const bet=CS.bet,ball=Math.random()*3|0,cups=[...document.querySelectorAll('#csCups .cup')];
  cups.forEach((c,i)=>{c.classList.toggle('pick',i===pick);c.classList.toggle('has',i===ball)});
  SFX.click();
  setTimeout(()=>{cups[pick].classList.add('up');
    setTimeout(()=>{cups.forEach(c=>c.classList.add('up'));
      if(pick===ball){const w=Math.round(bet*2.8);csAdd(w);csMsg('Gefunden! +'+w+' Tokens','ok');SFX.pickup()}
      else{csMsg('Daneben. Der Ball lag unter Becher '+(ball+1)+'.','bad');SFX.deny()}
      saveMeta();csWallet();
      setTimeout(()=>{CS.busy=false;if(CS.game==='ball'&&!$('ovCasino').hidden)renderBall($('csGame'))},1400);
    },500)},350);
}

/* ---------- Slot-Automat ---------- */
const SYM=[
  {k:'P',t:'●',c:'#ff6bd0',w:30},{k:'R',t:'▲',c:'#7cf0a8',w:24},{k:'M',t:'✚',c:'#e8edf5',w:18},
  {k:'K',t:'◆',c:'#5fd0ff',w:13},{k:'7',t:'7',c:'#ff5a5a',w:9},{k:'S',t:'★',c:'#ffd23f',w:6}];
const SYM_W=SYM.reduce((a,s)=>a+s.w,0);
function symRoll(){let r=Math.random()*SYM_W;for(const s of SYM){r-=s.w;if(r<0)return s}return SYM[0]}
function renderSlot(G){
  G.innerHTML=`<p class="chint">Drei gleiche gewinnen groß, zwei gleiche bringen etwas zurück. ◆◆◆ zahlt Medaillen, ★★★ zahlt Sterne.</p>
  <div class="slot3" id="csReels"><div class="reel"></div><div class="reel"></div><div class="reel"></div></div>
  <button class="btn" id="csSpin">Drehen</button>
  <div class="paytab">●●● ×4 · ▲▲▲ ×7 · ✚✚✚ ×12 · 777 ×45 · ◆◆◆ ×80 Medaillen · ★★★ ×2 Sterne<br>Zwei gleiche: ●/▲ ×1 · ✚ ×1,2 · ◆ ×1,5 · 7 ×2,5 · ★ ×2,5</div>`;
  [...document.querySelectorAll('#csReels .reel')].forEach(r=>setReel(r,symRoll()));
  $('csSpin').onclick=spinSlot;csMsg('Viel Glück!');
}
function setReel(r,s){r.textContent=s.t;r.style.color=s.c}
function spinSlot(){
  if(CS.busy||!csPay(CS.bet))return;CS.busy=true;const bet=CS.bet,res=[symRoll(),symRoll(),symRoll()],R=[...document.querySelectorAll('#csReels .reel')];
  R.forEach(r=>r.classList.add('spin'));SFX.click();
  const iv=setInterval(()=>R.forEach((r,i)=>{if(r.classList.contains('spin'))setReel(r,SYM[Math.random()*SYM.length|0])}),70);
  R.forEach((r,i)=>setTimeout(()=>{r.classList.remove('spin');setReel(r,res[i]);SFX.click();
    if(i===2){clearInterval(iv);slotResult(res,bet);CS.busy=false}},650+i*420));
}
function slotResult(res,bet){
  const k=res.map(s=>s.k),three=k[0]===k[1]&&k[1]===k[2];let msg='',cls='bad';
  if(three){
    if(k[0]==='K'){const m=bet*80;M.medals+=m;msg='◆◆◆ Kristall-Gewinn: +'+fmt(m)+' Medaillen!';cls='ok';SFX.levelUp()}
    else if(k[0]==='S'){const s=bet*2;M.stars+=s;msg='★★★ JACKPOT: +'+s+' Sterne!';cls='jack';SFX.unlockJingle()}
    else{const w=Math.round(bet*{P:4,R:7,M:12,'7':45}[k[0]]);csAdd(w);msg='Drei gleiche: +'+w+' Tokens';cls='ok';k[0]==='7'?SFX.unlockJingle():SFX.pickup()}
  }else{
    const pair=k.find(x=>k.filter(y=>y===x).length===2);
    if(pair){const w=Math.round(bet*{P:1,R:1,M:1.2,K:1.5,'7':2.5,S:2.5}[pair]);csAdd(w);msg='Zwei gleiche: +'+w+' Tokens';cls=w>bet?'ok':'';SFX.buy()}
    else{msg='Leider nichts.';SFX.deny()}
  }
  saveMeta();csWallet();csMsg(msg,cls);
  const R=document.querySelectorAll('#csReels .reel');R.forEach(r=>r.classList.toggle('win',cls==='ok'||cls==='jack'));
}

/* ---------- Black Jack: Bank zieht bis 17 ---------- */
const SUITS=['♠','♥','♦','♣'],RANKS=['A','2','3','4','5','6','7','8','9','10','B','D','K'];
function bjDeck(){const d=[];for(let n=0;n<4;n++)for(const s of SUITS)for(const r of RANKS)d.push({r,s});for(let i=d.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[d[i],d[j]]=[d[j],d[i]]}return d}
function bjVal(h){let v=0,a=0;for(const c of h){if(c.r==='A'){a++;v+=11}else v+=['B','D','K'].includes(c.r)?10:+c.r}while(v>21&&a){v-=10;a--}return v}
function bjCard(c,hid){return hid?'<span class="pcard back"></span>':`<span class="pcard${c.s==='♥'||c.s==='♦'?' red':''}"><b>${c.r}</b><i>${c.s}</i></span>`}
function renderBJ(G){
  const B=CS.bj;
  if(!B||B.done&&!B.show){G.innerHTML=`<p class="chint">Komm näher an 21 als die Bank, ohne drüber zu gehen. Gewinn zahlt das Doppelte, Black Jack das 2,5-Fache. Black Jack ab 50 Tokens Einsatz bringt zusätzlich 1 Stern.</p><button class="btn" id="bjDeal">Karten geben</button>`;$('bjDeal').onclick=bjDeal;if(!B)csMsg('Bereit.');return}
  const dv=B.done?bjVal(B.d):bjVal([B.d[0]]);
  G.innerHTML=`<div class="bjrow"><span class="lbl">Bank · ${dv}${B.done?'':'+'}</span><div class="hand">${B.d.map((c,i)=>bjCard(c,!B.done&&i===1)).join('')}</div></div>
    <div class="bjrow"><span class="lbl">Du · ${bjVal(B.p)}</span><div class="hand">${B.p.map(c=>bjCard(c)).join('')}</div></div>
    <div class="bjbtns">${B.done?'<button class="btn" id="bjNew">Neue Runde</button>':'<button class="btn" id="bjHit">Ziehen</button><button class="btn ghost" id="bjStand">Halten</button>'+(B.p.length===2&&csTok()>=B.bet?'<button class="btn ghost" id="bjDouble">Verdoppeln</button>':'')}</div>`;
  if(B.done)$('bjNew').onclick=()=>{CS.bj.show=false;bjDeal()};
  else{$('bjHit').onclick=bjHit;$('bjStand').onclick=bjStand;const d=$('bjDouble');if(d)d.onclick=bjDouble}
}
function bjDeal(){
  if(!csPay(CS.bet))return;
  if(!CS.deck||CS.deck.length<20)CS.deck=bjDeck();
  const D=CS.deck;CS.bj={bet:CS.bet,p:[D.pop(),D.pop()],d:[D.pop(),D.pop()],done:false,show:true};SFX.click();
  const B=CS.bj;
  if(bjVal(B.p)===21||bjVal(B.d)===21)bjEnd();else{csMsg('Ziehen oder halten?');renderBJ($('csGame'))}
}
function bjHit(){const B=CS.bj;if(!B||B.done)return;B.p.push(CS.deck.pop());SFX.click();if(bjVal(B.p)>=21)bjStand();else renderBJ($('csGame'))}
function bjDouble(){const B=CS.bj;if(!B||B.done||!csPay(B.bet))return;B.bet*=2;B.p.push(CS.deck.pop());SFX.click();bjStand()}
function bjStand(){const B=CS.bj;if(!B||B.done)return;if(bjVal(B.p)<=21)while(bjVal(B.d)<17)B.d.push(CS.deck.pop());bjEnd()}
function bjEnd(){
  const B=CS.bj;B.done=true;const p=bjVal(B.p),d=bjVal(B.d),pbj=p===21&&B.p.length===2,dbj=d===21&&B.d.length===2;let msg,cls='bad',w=0;
  if(pbj&&!dbj){w=Math.round(B.bet*2.5);msg='Black Jack! +'+w+' Tokens';cls='ok';if(B.bet>=50){M.stars+=1;msg+=' und 1 Stern';cls='jack'}SFX.unlockJingle()}
  else if(p>21){msg='Über 21. Verloren.';SFX.deny()}
  else if(dbj&&!pbj){msg='Die Bank hat Black Jack.';SFX.deny()}
  else if(d>21||p>d){w=B.bet*2;msg='Gewonnen! +'+w+' Tokens';cls='ok';SFX.pickup()}
  else if(p===d){w=B.bet;msg='Unentschieden. Einsatz zurück.';cls='';SFX.click()}
  else{msg='Die Bank gewinnt.';SFX.deny()}
  csAdd(w);saveMeta();csWallet();csMsg(msg,cls);renderBJ($('csGame'));
}
setInterval(()=>{const c=$('csCount');if(c)c.textContent=csTok()?fmt(csTok()):''},1000);
