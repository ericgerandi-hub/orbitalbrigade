'use strict';
/* =========================================================
   Orbitalbrigade – Soundeffekte (live mit Web Audio erzeugt)
   ========================================================= */
const SFX=(()=>{
  let ctx=null,master=null,noiseBuf=null,voices=0;
  const vs=ls.get('orbitalbrigade-vol');
  let vol=vs!=null&&!isNaN(+vs)?Math.max(0,Math.min(100,+vs)):(ls.get('orbitalbrigade-mute')==='1'?0:80),lastVol=vol||80;
  let muted=vol===0;
  const gainFor=()=>muted?0:.55*Math.pow(vol/100,1.4);
  const lastT={};
  const amb={};
  function init(){
    if(ctx)return true;
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
    try{ctx=new AC()}catch(e){return false}
    const comp=ctx.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=6;
    master=ctx.createGain();master.gain.value=gainFor();master.connect(comp);comp.connect(ctx.destination);
    noiseBuf=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);
    const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
    return true;
  }
  function unlock(){if(!init())return;if(ctx.state==='suspended')ctx.resume();startAmbient();musicInit()}
  function setVolume(v){vol=Math.max(0,Math.min(100,Math.round(v)));if(vol>0)lastVol=vol;muted=vol===0;ls.set('orbitalbrigade-vol',String(vol));if(master)master.gain.setTargetAtTime(gainFor(),ctx.currentTime,.05)}
  function setMuted(m){setVolume(m?0:lastVol)}
  const ok=()=>ctx&&!muted&&ctx.state==='running';
  function limit(key,ms){const n=performance.now();if(lastT[key]&&n-lastT[key]<ms)return false;lastT[key]=n;return true}
  // Ausgabe mit Stereo-Position und Entfernung (hinten leiser)
  function out(pos,vol){
    const g=ctx.createGain();let v=vol;let node=g;
    if(pos){
      const far=Math.max(0,Math.min(1,(-pos.z+20)/80));v*=1-far*.55;
      if(ctx.createStereoPanner){const p=ctx.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pos.x/26));g.connect(p);p.connect(master)}else g.connect(master);
    }else g.connect(master);
    g.gain.value=v;return node;
  }
  function voice(dur,delay=0){voices++;setTimeout(()=>voices--,(dur+delay)*1000+50);return voices<=48}
  function tone(type,f0,f1,dur,vol,pos,o={}){
    if(!ok()||!voice(dur,o.delay||0))return;
    const t=ctx.currentTime+(o.delay||0),osc=ctx.createOscillator(),g=ctx.createGain();
    osc.type=type;osc.frequency.setValueAtTime(f0,t);osc.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(1,t+(o.atk||.005));g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    let last=g;
    if(o.lp){const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=o.lp;g.connect(f);last=f}
    osc.connect(g);last.connect(out(pos,vol));osc.start(t);osc.stop(t+dur+.05);
  }
  function noise(dur,vol,ft,f0,f1,pos,o={}){
    if(!ok()||!voice(dur,o.delay||0))return;
    const t=ctx.currentTime+(o.delay||0),src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();
    src.buffer=noiseBuf;src.loop=true;src.playbackRate.value=o.rate||1;
    f.type=ft;f.Q.value=o.q||1;f.frequency.setValueAtTime(f0,t);f.frequency.exponentialRampToValueAtTime(Math.max(30,f1),t+dur);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(1,t+(o.atk||.004));g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    src.connect(f);f.connect(g);g.connect(out(pos,vol));src.start(t,Math.random()*1.5);src.stop(t+dur+.05);
  }
  /* ---------- Waffen ---------- */
  const W={
    kanone(p){noise(.05,.22,'highpass',2500,1200,p);tone('square',230,90,.09,.18,p,{lp:1600})},
    gatling(p){if(!limit('gat',45))return;noise(.035,.2,'bandpass',1900,900,p,{q:2});tone('square',160,90,.03,.1,p)},
    raketen(p){noise(.45,.3,'bandpass',500,2400,p,{q:1.4,atk:.03});tone('sawtooth',130,55,.35,.1,p,{lp:900})},
    granat(p){tone('sine',170,55,.16,.4,p);noise(.1,.18,'lowpass',900,300,p)},
    haubitze(p){tone('sine',95,28,.6,.8,p);noise(.55,.5,'lowpass',1600,160,p);noise(.08,.3,'highpass',3000,1500,p)},
    plasma(p){tone('sine',520,1300,.22,.25,p);tone('square',300,120,.18,.08,p,{lp:1400})},
    railgun(p){tone('sawtooth',1800,160,.28,.25,p,{lp:5000});noise(.18,.25,'highpass',4000,1500,p);tone('sine',75,40,.35,.4,p)},
  };
  function weapon(id,p){W[id]&&W[id](p)}
  function boom(r,p){
    if(!limit('boom',r>3?50:30))return;
    const s=Math.min(1.6,r/3);
    noise(.3+.35*s,.28+.25*s,'lowpass',900+700*s,120,p);tone('sine',80+30/s,26,.3+.4*s,.25+.3*s,p);
  }
  function hit(p){if(!limit('hit',35))return;noise(.025,.08,'highpass',3200,2000,p)}
  function death(p,boss){
    if(boss){roar(p,true);noise(1.2,.6,'lowpass',1200,80,p);tone('sine',60,22,1.4,.7,p);return}
    if(!limit('death',28))return;tone('triangle',320+Math.random()*120,70,.16,.16,p);noise(.12,.1,'bandpass',700,300,p,{q:3})
  }
  function roar(p,dying){noise(dying?1:1.4,.35,'lowpass',700,200,p,{atk:.08});tone('sawtooth',dying?140:95,dying?40:60,dying?1:1.3,.22,p,{lp:600,atk:.1})}
  function baseHit(){if(!limit('base',120))return;tone('square',230,200,.12,.12,null);tone('square',180,160,.12,.12,null,{delay:.13});tone('sine',90,40,.25,.35,null)}
  function overheat(){noise(.55,.2,'highpass',5000,2500,null,{atk:.02});tone('sine',1100,380,.4,.1,null)}
  /* ---------- Fähigkeiten ---------- */
  function ability(id){
    if(id==='orbital'){tone('sine',2400,300,.7,.12,null);setTimeout(()=>{tone('sine',55,18,2,.9,null);noise(1.6,.7,'lowpass',2200,90,null);noise(.3,.3,'highpass',4000,1500,null)},350)}
    else if(id==='kryo'){[1200,1600,2100,2600].forEach((f,i)=>tone('sine',f,f*1.02,.9,.08,null,{delay:i*.05,atk:.02}));noise(.8,.2,'highpass',6000,3000,null,{atk:.05})}
    else if(id==='napalm'){noise(1.4,.35,'bandpass',300,1800,null,{q:.8,atk:.3});setTimeout(()=>noise(1.6,.3,'lowpass',2500,400,null,{atk:.1}),700)}
    else if(id==='barrage'||id==='luft'){tone('triangle',660,660,.12,.12,null);tone('triangle',880,880,.16,.12,null,{delay:.13})}
  }
  function whistle(p,dur=.7){tone('sine',1500,500,dur,.07,p,{atk:.05})}
  function jet(dir){
    if(!ok())return;
    const t=ctx.currentTime,src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();
    src.buffer=noiseBuf;src.loop=true;f.type='bandpass';f.Q.value=.9;f.frequency.setValueAtTime(400,t);f.frequency.linearRampToValueAtTime(1600,t+.8);f.frequency.linearRampToValueAtTime(300,t+1.7);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.4,t+.75);g.gain.exponentialRampToValueAtTime(.0001,t+1.8);
    src.connect(f);f.connect(g);
    if(ctx.createStereoPanner){const p=ctx.createStereoPanner();p.pan.setValueAtTime(-dir,t);p.pan.linearRampToValueAtTime(dir,t+1.7);g.connect(p);p.connect(master)}else g.connect(master);
    src.start(t);src.stop(t+1.9);
  }
  // Kampfjet: Turbinenrauschen mit Doppler-Heulen, leise im Hintergrund
  function jet2(p,dur){
    if(!ok())return;
    const t=ctx.currentTime,src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();
    src.buffer=noiseBuf;src.loop=true;f.type='bandpass';f.Q.value=.7;
    f.frequency.setValueAtTime(250,t);f.frequency.linearRampToValueAtTime(1300,t+dur*.4);f.frequency.linearRampToValueAtTime(380,t+dur);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.18,t+dur*.38);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    const o=ctx.createOscillator(),og=ctx.createGain(),of=ctx.createBiquadFilter();
    o.type='sawtooth';o.frequency.setValueAtTime(820,t);o.frequency.linearRampToValueAtTime(980,t+dur*.4);o.frequency.exponentialRampToValueAtTime(420,t+dur);
    of.type='lowpass';of.frequency.value=2400;
    og.gain.setValueAtTime(.0001,t);og.gain.exponentialRampToValueAtTime(.035,t+dur*.4);og.gain.exponentialRampToValueAtTime(.0001,t+dur);
    const dst=out(p,1);src.connect(f);f.connect(g);g.connect(dst);o.connect(of);of.connect(og);og.connect(dst);
    src.start(t);src.stop(t+dur+.1);o.start(t);o.stop(t+dur+.1);
  }
  // Bordkanone der Jäger: schnelle, harte Einzelschüsse
  function mg(p,dur){
    const n=Math.round(dur/.055);
    for(let i=0;i<n;i++){
      const d=i*.055+Math.random()*.008;
      noise(.05,.3,'bandpass',1500+Math.random()*400,600,p,{q:1.3,delay:d,atk:.002});
      if(i%2===0)tone('square',150,60,.04,.14,p,{delay:d,lp:900});
    }
    noise(dur+.3,.06,'lowpass',2500,600,p,{atk:.05});
  }
  let laserNodes=null;
  function laser(on){
    if(on&&!laserNodes&&ok()){
      const t=ctx.currentTime,o1=ctx.createOscillator(),o2=ctx.createOscillator(),lfo=ctx.createOscillator(),lg=ctx.createGain(),g=ctx.createGain(),f=ctx.createBiquadFilter();
      o1.type='sawtooth';o1.frequency.value=110;o2.type='sine';o2.frequency.value=880;lfo.frequency.value=7;lg.gain.value=25;lfo.connect(lg);lg.connect(o2.frequency);
      f.type='lowpass';f.frequency.value=2200;o1.connect(f);o2.connect(f);f.connect(g);g.connect(master);
      g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.16,t+.08);
      o1.start();o2.start();lfo.start();laserNodes={o1,o2,lfo,g};
    }else if(!on&&laserNodes){
      const n=laserNodes,t=ctx.currentTime;laserNodes=null;n.g.gain.setTargetAtTime(.0001,t,.05);[n.o1,n.o2,n.lfo].forEach(o=>o.stop(t+.3));
    }
  }
  /* ---------- Unterstützung und Truppen ---------- */
  function place(){tone('triangle',520,780,.08,.12,null)}
  function podFall(p){whistle(p,1)}
  function podOpen(p){noise(.45,.18,'highpass',4500,2000,p,{atk:.03});tone('square',140,140,.06,.08,p,{delay:.35})}
  function thump(p){tone('sine',120,40,.25,.45,p);noise(.2,.2,'lowpass',700,150,p)}
  function sentry(p){if(!limit('sentry',60))return;noise(.03,.14,'bandpass',2200,1200,p,{q:2})}
  function mortar(p){tone('sine',140,55,.18,.35,p);noise(.12,.15,'lowpass',800,200,p)}
  function soldier(cls,p){
    if(cls==='rifle'){if(limit('rifle',40))noise(.03,.11,'bandpass',2600,1400,p,{q:1.6})}
    else if(cls==='sniper'){noise(.07,.3,'highpass',2600,900,p);tone('sine',900,180,.09,.15,p)}
    else if(cls==='rpg'){noise(.3,.18,'bandpass',700,1800,p,{q:1.2,atk:.02})}
    else if(cls==='flamer'){if(limit('flame',95))noise(.14,.09,'bandpass',800,500,p,{q:.8})}
  }
  function spit(p){if(!limit('spit',60))return;tone('sine',520,190,.12,.12,p);noise(.08,.07,'bandpass',1500,600,p,{q:3})}
  /* ---------- Oberfläche und Ablauf ---------- */
  function click(){if(limit('click',30))tone('triangle',620,560,.035,.06,null)}
  function buy(){tone('triangle',880,1320,.07,.12,null);tone('triangle',1320,1320,.08,.1,null,{delay:.07})}
  function unlockJingle(){[523,659,784,1047].forEach((f,i)=>tone('triangle',f,f,.18,.12,null,{delay:i*.08}))}
  function deny(){if(limit('deny',150))tone('square',130,110,.09,.08,null,{lp:900})}
  function levelUp(){[392,523,659,784,1047].forEach((f,i)=>tone('triangle',f,f*1.01,.22,.13,null,{delay:i*.07}))}
  function horn(){tone('sawtooth',110,108,1.2,.16,null,{lp:900,atk:.15});tone('sawtooth',165,163,1.2,.1,null,{lp:900,atk:.15})}
  function waveClear(){tone('triangle',660,660,.15,.13,null);tone('triangle',990,990,.3,.13,null,{delay:.14})}
  function gameOver(){tone('sawtooth',300,55,1.6,.2,null,{lp:1200});noise(1.5,.3,'lowpass',900,80,null)}
  /* ---------- Atmosphäre: Wind, Regen, Donner, Natur ---------- */
  function loopNoise(ft,f,q){const s=ctx.createBufferSource(),fl=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=noiseBuf;s.loop=true;fl.type=ft;fl.frequency.value=f;fl.Q.value=q||.7;g.gain.value=0;s.connect(fl);fl.connect(g);g.connect(master);s.start();return g}
  function startAmbient(){if(amb.wind||!ctx)return;amb.wind=loopNoise('lowpass',320);amb.rain=loopNoise('bandpass',3200,.9);amb.rain2=loopNoise('bandpass',700,.6)}
  let natT=2,thunderT=8,dropT=0;
  function ambient(dt,e){
    if(!amb.wind||!ctx)return;const t=ctx.currentTime;
    amb.wind.gain.setTargetAtTime(.05+.05*e.fog,t,.5);
    amb.rain.gain.setTargetAtTime(.022*e.rain,t,.8);amb.rain2.gain.setTargetAtTime(.012*e.rain,t,.8);
    if(!ok())return;
    if(e.rain>.6){thunderT-=dt;if(thunderT<=0){thunderT=10+Math.random()*18;noise(3,.45,'lowpass',260,60,null,{atk:.4,rate:.6})}}
    // einzelne Tropfen: kurze, helle Plinks in zufälligem Abstand
    if(e.rain>.05){dropT-=dt;while(dropT<=0){dropT+=.03+Math.random()*.16/e.rain;
      const f=1600+Math.random()*2800;tone('sine',f,f*.55,.035+Math.random()*.03,.018+.02*e.rain*Math.random(),{x:(Math.random()-.5)*50,z:Math.random()*40-10},{atk:.002});
      if(Math.random()<.3)noise(.02,.012*e.rain,'highpass',5000,3000,null)}}
    natT-=dt;
    if(natT<=0&&e.terra>.25){
      natT=1.5+Math.random()*4;
      if(e.day<.5){for(let i=0;i<3;i++)tone('sine',4300,4250,.04,.03,null,{delay:i*.09})}
      else if(e.rain<.3){const f=2200+Math.random()*1200;tone('sine',f,f*1.35,.12,.035,null);tone('sine',f*1.3,f*.9,.1,.03,null,{delay:.13})}
    }
  }

  /* ---------- Neue Effekte: Gräber, Ereignisse, Ameisen ---------- */
  function dig(p){noise(.5,.22,'lowpass',700,200,p,{atk:.05});for(let i=0;i<4;i++)noise(.06,.12,'bandpass',900,500,p,{delay:.1+i*.11,q:2})}
  function grab(p){if(!limit('grab',70))return;tone('sawtooth',120,40,.7,.2,p,{lp:500,atk:.02});noise(.8,.25,'lowpass',500,80,p,{atk:.1});tone('sine',300,60,.25,.15,p,{delay:.5})}
  function meteor(p){tone('sine',1600,300,1,.1,p);noise(1,.14,'bandpass',2400,500,p,{q:1.5,atk:.4})}
  function alarm(){for(let i=0;i<3;i++){tone('square',880,880,.14,.08,null,{delay:i*.32,lp:2500});tone('square',660,660,.14,.08,null,{delay:i*.32+.16,lp:2500})}}
  function blackout(on){if(on){tone('sawtooth',440,40,1.4,.18,null,{lp:1500});noise(.5,.2,'highpass',3000,800,null)}else{tone('sawtooth',60,440,.8,.14,null,{lp:1500,atk:.3});tone('sine',880,880,.15,.08,null,{delay:.8})}}
  function pickup(){[784,988,1175,1568].forEach((f,i)=>tone('triangle',f,f,.14,.13,null,{delay:i*.06}))}
  function ants(p){if(!limit('ants',90))return;noise(.12,.05,'bandpass',5200,3800,p,{q:3})}
  function smash(p){if(!limit('smash',120))return;tone('sine',110,30,.4,.5,p);noise(.3,.35,'lowpass',1200,100,p);noise(.1,.15,'bandpass',600,300,p,{delay:.03})}
  function saw(p){if(!limit('saw',140))return;tone('sawtooth',95+Math.random()*20,80,.16,.06,p,{lp:1400});noise(.14,.07,'bandpass',2600,1800,p,{q:2})}
  function rover(p){if(!limit('rover',300))return;tone('square',70,90,.25,.04,p,{lp:500})}
  function mark(mine){tone('sine',mine?1320:990,mine?1760:1320,.12,.09,null);tone('sine',mine?1760:1320,mine?1760:1320,.1,.07,null,{delay:.1})}
  function slowSwoosh(on){if(!ok())return;if(on)tone('sine',900,180,.35,.07,null);else tone('sine',180,900,.25,.06,null)}

  let gv=null;
  function guided(on,boost){
    if(!ctx)return;const t=ctx.currentTime;
    if(on&&!gv){if(!ok())return;const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain(),o=ctx.createOscillator(),og=ctx.createGain(),lp=ctx.createBiquadFilter();
      s.buffer=noiseBuf;s.loop=true;f.type='bandpass';f.frequency.value=900;f.Q.value=1.2;g.gain.value=0;s.connect(f);f.connect(g);g.connect(master);
      o.type='sawtooth';o.frequency.value=90;lp.type='lowpass';lp.frequency.value=500;og.gain.value=0;o.connect(lp);lp.connect(og);og.connect(master);s.start();o.start();
      gv={s,f,g,o,og};g.gain.setTargetAtTime(.14,t,.1);og.gain.setTargetAtTime(.05,t,.1)}
    else if(!on&&gv){const v=gv;v.g.gain.setTargetAtTime(0,t,.05);v.og.gain.setTargetAtTime(0,t,.05);v.s.stop(t+.4);v.o.stop(t+.4);gv=null}
    else if(on&&gv){gv.f.frequency.setTargetAtTime(boost?1800:900,t,.1);gv.o.frequency.setTargetAtTime(boost?150:90,t,.1);gv.g.gain.setTargetAtTime(boost?.22:.14,t,.1)}
  }
  /* ---------- Musik: dynamisch mit Schichten, eigenes Boss-Thema ---------- */
  const msv=ls.get('orbitalbrigade-music');
  let musicVol=msv!=null&&!isNaN(+msv)?Math.max(0,Math.min(100,+msv)):60;
  const musGain=()=>.42*Math.pow(musicVol/100,1.3);
  const SONGS={
    main:{bpm:104,roots:[45,41,48,43],ch:[[57,60,64],[53,57,60],[60,64,67],[55,59,62]],bass:[0,3,6,8,11,14],kick:[0,8,11],sn:[4,12],hat:[2,6,10,14],arp:[0,1,2,1]},
    boss:{bpm:134,roots:[38,34,43,45],ch:[[62,65,69],[58,62,65],[55,58,62],[57,61,64]],bass:[0,2,3,4,6,8,10,11,12,14],kick:[0,4,8,12],sn:[4,12],hat:[0,2,4,6,8,10,12,14],arp:[0,1,2,1,0,2,1,2]},
  };
  const mus={bus:null,lp:null,L:{},step:0,next:0,mode:'',int:-1,song:'main',want:'main',sd:60/104/4};
  const mf=m=>440*Math.pow(2,(m-69)/12);
  function musicInit(){
    if(mus.bus||!ctx)return;
    mus.bus=ctx.createGain();mus.bus.gain.value=musGain();
    mus.lp=ctx.createBiquadFilter();mus.lp.type='lowpass';mus.lp.frequency.value=18000;
    mus.bus.connect(mus.lp);mus.lp.connect(master);
    for(const k of ['pad','bass','kick','hat','snare','arp','boss']){const g=ctx.createGain();g.gain.value=0;g.connect(mus.bus);mus.L[k]=g}
    mus.next=ctx.currentTime+.15;setInterval(schedule,40);music('menu',0);
  }
  function mnote(type,m,t,dur,vol,dest,o={}){
    const osc=ctx.createOscillator(),g=ctx.createGain();osc.type=type;osc.frequency.value=mf(m);if(o.det)osc.detune.value=o.det;
    const a=Math.min(o.atk||.01,dur*.5);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+a);g.gain.setValueAtTime(vol,t+Math.max(a,dur*.55));g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    let last=g;if(o.lp){const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=o.lp;g.connect(f);last=f}
    osc.connect(g);last.connect(dest);osc.start(t);osc.stop(t+dur+.05);
  }
  function mnoise(t,dur,vol,ft,f,dest){const s=ctx.createBufferSource(),fl=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=noiseBuf;fl.type=ft;fl.frequency.value=f;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(fl);fl.connect(g);g.connect(dest);s.start(t,Math.random()*1.5);s.stop(t+dur+.02)}
  function mkick(t,d){const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(42,t+.18);g.gain.setValueAtTime(.6,t);g.gain.exponentialRampToValueAtTime(.0001,t+.3);o.connect(g);g.connect(d);o.start(t);o.stop(t+.32)}
  function msnare(t,d){mnoise(t,.17,.26,'bandpass',1900,d);const o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.setValueAtTime(220,t);o.frequency.exponentialRampToValueAtTime(140,t+.08);g.gain.setValueAtTime(.16,t);g.gain.exponentialRampToValueAtTime(.0001,t+.1);o.connect(g);g.connect(d);o.start(t);o.stop(t+.12)}
  function playStep(st,t){
    const s=st&15,b=st>>4;
    if(s===0&&mus.want!==mus.song){mus.song=mus.want}
    const S=SONGS[mus.song];if(s===0)mus.sd=60/S.bpm/4;
    const sd=mus.sd,root=S.roots[b],ch=S.ch[b],L=mus.L,boss=mus.song==='boss';
    if(s===0)for(const n of ch){mnote('sawtooth',n,t,sd*16,.026,L.pad,{lp:1100,atk:.6,det:8});mnote('sawtooth',n,t,sd*16,.026,L.pad,{lp:1100,atk:.6,det:-8})}
    if(S.bass.includes(s))mnote(boss?'sawtooth':'square',root+(!boss&&(s===6||s===14)?12:0),t,sd*1.6,.11,L.bass,{lp:boss?430:520});
    if(S.kick.includes(s))mkick(t,L.kick);
    if(S.sn.includes(s))msnare(t,L.snare);
    if(S.hat.includes(s))mnoise(t,.04,s%4===2?.08:.05,'highpass',7500,L.hat);
    {const n=ch[S.arp[s%S.arp.length]]+12;mnote(boss?'square':'triangle',n,t,sd*.8,boss?.03:.04,L.arp,{lp:boss?2200:3000})}
    if(boss){
      if(s===0){mnote('sawtooth',root+12,t,sd*6,.08,L.boss,{lp:950,atk:.02});mnote('sawtooth',root+19,t,sd*6,.055,L.boss,{lp:950,atk:.02});mnote('sine',root,t,sd*16,.16,L.boss,{atk:.3})}
      if(s===10&&b%2===1)mnote('sawtooth',root+13,t,sd*3,.06,L.boss,{lp:800});
      if(s===8&&b===3)mnoise(t,sd*8,.12,'bandpass',600,L.boss);
    }
  }
  function schedule(){
    if(!ctx||ctx.state!=='running')return;
    const now=ctx.currentTime;if(mus.next<now-.25)mus.next=now+.05;
    if(muted||musicVol===0){while(mus.next<now+.15){mus.next+=mus.sd;mus.step=(mus.step+1)%64}return}
    while(mus.next<now+.15){playStep(mus.step,mus.next);mus.next+=mus.sd;mus.step=(mus.step+1)%64}
  }
  function music(mode,int){
    if(!mus.bus)return;mus.want=mode==='boss'?'boss':'main';
    if(mode===mus.mode&&Math.abs(int-mus.int)<.04)return;
    mus.mode=mode;mus.int=int;
    const c=x=>Math.max(0,Math.min(1,x));let T;
    if(mode==='boss')T={pad:.8,bass:1,kick:1,hat:1,snare:1,arp:.85,boss:1};
    else if(mode==='fight')T={pad:.7,bass:.5+.5*int,kick:c(.35+int*1.3),hat:c(int*2.2),snare:c((int-.25)*2.5),arp:c((int-.5)*2.5),boss:0};
    else if(mode==='shop')T={pad:.8,bass:.45,kick:0,hat:.35,snare:0,arp:.45,boss:0};
    else if(mode==='over')T={pad:.6,bass:0,kick:0,hat:0,snare:0,arp:0,boss:0};
    else T={pad:.9,bass:.25,kick:0,hat:0,snare:0,arp:.35,boss:0};
    const now=ctx.currentTime;for(const k in T)mus.L[k].gain.setTargetAtTime(T[k],now,mode==='boss'?.35:1.1);
  }
  function setMusicVolume(v){musicVol=Math.max(0,Math.min(100,Math.round(v)));ls.set('orbitalbrigade-music',String(musicVol));if(mus.bus)mus.bus.gain.setTargetAtTime(musGain(),ctx.currentTime,.05)}
  function slowmo(k){if(!mus.lp)return;mus.lp.frequency.setTargetAtTime(700*Math.pow(18000/700,1-k),ctx.currentTime,.12)}
  return{mark,saw,rover,guided,dig,grab,meteor,alarm,blackout,pickup,ants,smash,slowSwoosh,music,setMusicVolume,get musicVolume(){return musicVol},slowmo,jet2,mg,unlock,setMuted,setVolume,get volume(){return vol},get muted(){return muted},weapon,boom,hit,death,roar,baseHit,overheat,ability,whistle,jet,laser,place,podFall,podOpen,thump,sentry,mortar,soldier,spit,click,buy,unlockJingle,deny,levelUp,horn,waveClear,gameOver,ambient};
})();
addEventListener('pointerdown',()=>SFX.unlock(),{capture:true});
addEventListener('keydown',()=>SFX.unlock(),{capture:true});
