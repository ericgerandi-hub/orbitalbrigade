'use strict';
/* =========================================================
   Orbitalbrigade – Inhalte, Werte und Speicherstand
   ========================================================= */

/* Upgrade-Arten: mul = Prozent auf den Grundwert, div = Wert wird kleiner (Abklingzeiten),
   add = fester Zuschlag pro Stufe. rMax/rc: Stufen und Preis im Run (Credits),
   mMax/mc: Stufen und Preis im Menü-Shop (Medaillen). */
const STAT={
  dmg:    {n:'Schaden',m:'mul',s:.15,rMax:15,mMax:10,rc:30,mc:40},
  dps:    {n:'Schaden',m:'mul',s:.15,rMax:15,mMax:10,rc:30,mc:40},
  rate:   {n:'Feuerrate',m:'mul',s:.10,rMax:10,mMax:8,rc:35,mc:45},
  cool:   {n:'Kühlung',m:'mul',s:.15,rMax:10,mMax:8,rc:30,mc:40,d:'Weniger Hitze pro Schuss, schnelleres Abkühlen'},
  twin:   {n:'Zusatzrohre',m:'add',s:1,rMax:3,mMax:2,rc:90,mc:140,d:'Ein weiteres Geschützrohr feuert mit'},
  ammo:   {n:'Magazin',m:'mul',s:.2,rMax:8,mMax:6,rc:35,mc:45,d:'Mehr Schuss, bevor Nachschub nötig ist'},
  drones: {n:'Drohnen',m:'add',s:2,rMax:4,mMax:3,rc:70,mc:110,d:'Zwei Drohnen mehr im Schwarm'},
  count:  {n:'Anzahl',m:'add',s:1,rMax:4,mMax:3,rc:70,mc:110},
  fire:   {n:'Brandschaden',m:'add',s:8,rMax:8,mMax:5,rc:45,mc:60,d:'Getroffene Gegner brennen nach',u:' pro s'},
  aoe:    {n:'Sprengradius',m:'mul',s:.12,rMax:8,mMax:6,rc:40,mc:50},
  cluster:{n:'Splittergranaten',m:'add',s:2,rMax:4,mMax:3,rc:60,mc:90,d:'Zusätzliche kleine Explosionen'},
  crit:   {n:'Krit-Chance',m:'add',s:.07,rMax:6,mMax:4,rc:45,mc:60,pct:true,d:'Chance auf doppelten Schaden'},
  pool:   {n:'Lachen-Dauer',m:'mul',s:.3,rMax:6,mMax:4,rc:40,mc:50},
  len:    {n:'Durchschlagslänge',m:'mul',s:.15,rMax:6,mMax:4,rc:40,mc:50},
  cd:     {n:'Abklingzeit',m:'div',s:.10,rMax:10,mMax:8,rc:40,mc:50},
  dur:    {n:'Dauer',m:'mul',s:.15,rMax:8,mMax:6,rc:40,mc:50},
  stun:   {n:'Betäubung',m:'add',s:.5,rMax:4,mMax:3,rc:50,mc:70,d:'Gegner stehen nach dem Treffer still',u:' s'},
  hp:     {n:'Leben',m:'mul',s:.2,rMax:10,mMax:8,rc:35,mc:45},
  regen:  {n:'Selbstreparatur',m:'add',s:1,rMax:5,mMax:4,rc:45,mc:60,u:' % pro s'},
  recruit:{n:'Rekrutierungstempo',m:'div',s:.15,rMax:8,mMax:6,rc:45,mc:60,d:'Neue Soldaten schneller ausgebildet'},
  cap:    {n:'Kapazität',m:'add',s:1,rMax:4,mMax:3,rc:60,mc:90,d:'Mehr Soldaten pro Kaserne'},
  range:  {n:'Reichweite',m:'mul',s:.1,rMax:6,mMax:4,rc:35,mc:45},
  speed:  {n:'Tempo',m:'mul',s:.1,rMax:5,mMax:4,rc:30,mc:40},
  troops: {n:'Truppenlimit',m:'add',s:3,rMax:5,mMax:4,rc:60,mc:80,d:'Mehr Soldaten gleichzeitig auf dem Feld'},
  grenade:{n:'Granaten',m:'add',s:1,rMax:5,mMax:3,rc:60,mc:90,d:'Soldaten werfen regelmäßig Granaten, höhere Stufen öfter'},
  flamer: {n:'Flammenwerfer',m:'add',s:1,rMax:3,mMax:2,rc:80,mc:120,d:'Ein Soldat pro Drop trägt einen Flammenwerfer: kurze Reichweite, Brandschaden'},
  rpg:    {n:'Raketenschütze',m:'add',s:1,rMax:3,mMax:2,rc:80,mc:120,d:'Ein Soldat pro Drop mit Raketenrohr: mittlere Reichweite, Flächenschaden'},
  sniper: {n:'Scharfschütze',m:'add',s:1,rMax:3,mMax:2,rc:80,mc:120,d:'Ein Soldat pro Drop mit Präzisionsgewehr: große Reichweite, hoher Einzelschaden'},
  slots:  {n:'Waffenplätze',m:'add',s:1,rMax:2,mMax:1,rc:120,mc:200,d:'Mehr Zusatzwaffen gleichzeitig an jedem Mech'},
  mrak:   {n:'Raketenwerfer',m:'add',s:1,rMax:6,mMax:4,rc:70,mc:100,d:'Salve aus zwei Raketen mit Flächenschaden'},
  mflam:  {n:'Flammenwerfer',m:'add',s:1,rMax:6,mMax:4,rc:70,mc:100,d:'Kurze Reichweite, setzt Gegner in Brand'},
  mgren:  {n:'Granatwerfer',m:'add',s:1,rMax:6,mMax:4,rc:70,mc:100,d:'Granaten im Bogen, großer Explosionsradius'},
  mlaser: {n:'Laserkanone',m:'add',s:1,rMax:6,mMax:4,rc:80,mc:110,d:'Dauerstrahl auf das nächste Ziel'},
  squad:  {n:'Truppgröße',m:'add',s:1,rMax:3,mMax:3,rc:80,mc:120,d:'Mehr eigene Soldaten des Kommandeurs'},
  spawn:  {n:'Verstärkungstempo',m:'div',s:.12,rMax:6,mMax:5,rc:50,mc:70,d:'Neue Soldaten schneller'},
  aura:   {n:'Führungsaura',m:'add',s:.05,rMax:5,mMax:4,rc:60,mc:90,pct:true,d:'Mehr Schaden für Einheiten in seiner Nähe'},
  reload: {n:'Nachladezeit',m:'div',s:.1,rMax:6,mMax:5,rc:50,mc:70},
  mines:  {n:'Minen pro Fähigkeit',m:'add',s:1,rMax:4,mMax:3,rc:60,mc:90},
  summon: {n:'Beschwörungstempo',m:'div',s:.12,rMax:6,mMax:5,rc:50,mc:70},
  zmax:   {n:'Max. Zombies',m:'add',s:1,rMax:5,mMax:4,rc:60,mc:90},
  zhp:    {n:'Zombie-Leben',m:'mul',s:.2,rMax:8,mMax:6,rc:40,mc:50},
  zdmg:   {n:'Zombie-Schaden',m:'mul',s:.2,rMax:8,mMax:6,rc:40,mc:50},
  zchance:{n:'Wiedererweckung',m:'add',s:.03,rMax:5,mMax:4,rc:60,mc:90,pct:true,d:'Chance, dass ein getöteter Gegner als Zombie aufsteht'},
  prak:   {n:'Jet-Raketen',m:'add',s:1,rMax:6,mMax:4,rc:70,mc:100,d:'Raketensalven auf Gruppen'},
  pbomb:  {n:'Jet-Bomben',m:'add',s:1,rMax:6,mMax:4,rc:70,mc:100,d:'Wirft Bomben mit großem Radius'},
  plaser: {n:'Jet-Laser',m:'add',s:1,rMax:6,mMax:4,rc:80,mc:110,d:'Dauerstrahl auf das nächste Ziel'},
  repair: {n:'Reparaturtempo',m:'mul',s:.2,rMax:8,mMax:6,rc:45,mc:60},
  turrets:{n:'Mini-Geschütze',m:'add',s:1,rMax:3,mMax:3,rc:80,mc:120,d:'Mehr Geschütze, die er selbst aufbaut'},
  shield: {n:'Schildblock',m:'add',s:.05,rMax:6,mMax:4,rc:60,mc:90,pct:true,d:'Weniger erlittener Schaden'},
  grabs:  {n:'Griffe pro Gräber',m:'add',s:1,rMax:5,mMax:4,rc:60,mc:90,d:'So viele Gegner zieht jeder Gräber unter die Erde, bevor er abzieht'},
  grip:   {n:'Griffstärke',m:'add',s:1,rMax:3,mMax:3,rc:110,mc:160,d:'Stufe 1: auch Panzerkäfer, Stufe 2: auch Brutwächter, Stufe 3: Bosse erleiden schweren Schaden'},
  legion: {n:'Koloniegröße',m:'add',s:1,rMax:4,mMax:4,rc:90,mc:130,d:'60 Ameisen mehr: der Riese wird größer und schlägt härter'},
  flood:  {n:'Flut-Schaden',m:'mul',s:.2,rMax:8,mMax:6,rc:40,mc:50,d:'Schaden pro Sekunde der Ameisenflut'},
  maxhp:  {n:'Max. Schild',m:'mul',s:.2,rMax:10,mMax:10,rc:40,mc:40},
  shreg:  {n:'Regeneration',m:'add',s:.6,rMax:8,mMax:8,rc:45,mc:50,u:' pro s'},
  armor:  {n:'Panzerung',m:'add',s:.06,rMax:5,mMax:3,rc:60,mc:70,pct:true,d:'Weniger Schaden am Generator'},
  turret: {n:'Generator-Geschütze',m:'add',s:1,rMax:4,mMax:2,rc:90,mc:150,d:'Automatische Geschütze direkt am Generator'},
  ring:   {n:'Barrikadenring',m:'add',s:1,rMax:3,mMax:2,rc:100,mc:150,d:'Barrikaden um den Generator, bauen sich jede Welle neu auf'},
  choices:{n:'Level-up-Auswahl',m:'add',s:1,rMax:0,mMax:2,mc:250,d:'Mehr Waffen zur Auswahl bei jedem Level-up'},
  xp:     {n:'Erfahrung',m:'mul',s:.1,rMax:0,mMax:10,mc:60},
  medals: {n:'Medaillen-Bonus',m:'mul',s:.1,rMax:0,mMax:10,mc:80},
  credits:{n:'Credit-Bonus',m:'mul',s:.1,rMax:0,mMax:10,mc:60},
  startcr:{n:'Startcredits',m:'add',s:50,rMax:0,mMax:10,mc:50},
};

const ITEMS={};
function def(kind,id,o){ITEMS[id]=Object.assign({id,kind},o)}

/* ---- Schiffswaffen: bekommt man über Level-ups, überhitzen ---- */
def('weapon','kanone',{name:'Bordkanone',short:'Kanone',unlock:0,
  desc:'Schnelle Salven mit wenig Hitze. Dein Standardgeschütz.',
  base:{dmg:12,rate:5,heat:5,cool:35,aoe:.9,twin:0,ammo:300},stats:['dmg','rate','cool','twin','ammo']});
def('weapon','raketen',{name:'Raketenwerfer',short:'Raketen',unlock:150,
  desc:'Salve zielsuchender Raketen mit Flächenschaden.',
  base:{dmg:40,rate:.8,heat:30,cool:20,aoe:3,count:3,fire:0},stats:['dmg','rate','cool','count','fire']});
def('weapon','granat',{name:'Granatwerfer',short:'Granaten',unlock:180,
  desc:'Granaten im Bogen mit großem Explosionsradius.',
  base:{dmg:45,rate:1.5,heat:14,cool:28,aoe:3.5,cluster:0},stats:['dmg','rate','cool','aoe','cluster']});
def('weapon','gatling',{name:'Maschinenkanone',short:'MG',unlock:200,
  desc:'Extrem hohe Feuerrate, überhitzt aber schnell.',
  base:{dmg:6,rate:14,heat:3.2,cool:30,aoe:1.1,crit:0},stats:['dmg','rate','cool','crit']});
def('weapon','haubitze',{name:'120-mm-Kanone',short:'120 mm',unlock:220,
  desc:'Langsam, aber jeder Treffer reißt ein Loch in die Horde.',
  base:{dmg:170,rate:.5,heat:34,cool:18,aoe:2.6},stats:['dmg','rate','cool','aoe']});
def('weapon','plasma',{name:'Plasmawerfer',short:'Plasma',unlock:300,
  desc:'Plasmakugeln hinterlassen brennende Lachen am Boden.',
  base:{dmg:30,rate:1.2,heat:18,cool:22,aoe:2.4,pool:3,fire:22},stats:['dmg','rate','cool','pool','fire']});
def('weapon','hangar',{name:'Hangar',short:'Hangar',unlock:260,passive:true,
  desc:'Startet eigene Jets, die selbstständig Gegner im Sturzflug angreifen. Ist die Munition eines Jets leer, fliegt er zurück und lädt kurz nach.',
  base:{dmg:9,count:1,ammo:36,reload:6,speed:1},stats:['count','dmg','ammo','reload','speed']});
def('weapon','drohnen',{name:'Drohnen-Hangar',short:'Drohnen',unlock:300,passive:true,
  desc:'Startet einen Schwarm kleiner, schneller Kampfdrohnen. Sie greifen im Sturzflug mit Lasern an und brauchen keine Munition, überhitzen aber schnell und kühlen dann kurz in der Luft ab.',
  base:{dmg:2.6,drones:4,rate:12,cool:1,speed:1},stats:['drones','dmg','rate','cool','speed']});
def('weapon','railgun',{name:'Railgun',short:'Rail',unlock:380,
  desc:'Durchschlägt alle Gegner in einer langen Linie.',
  base:{dmg:130,rate:.6,heat:40,cool:16,len:24},stats:['dmg','rate','cool','len']});

/* ---- Fähigkeiten: zielen selbst, Abklingzeit, unten ---- */
def('ability','orbital',{name:'Orbitalschlag',short:'Orbital',unlock:0,key:'Q',
  desc:'Trifft alle Gegner auf dem Feld auf einmal.',
  base:{dmg:140,cd:30,stun:0},stats:['dmg','cd','stun']});
def('ability','laser',{name:'Orbitallaser',short:'Laser',unlock:160,key:'W',
  desc:'Ein Strahl verfolgt die vordersten Gegner.',
  base:{dps:90,cd:18,dur:4,fire:0},stats:['dps','cd','dur','fire']});
def('ability','luft',{name:'Luftunterstützung',short:'Jäger',unlock:240,key:'E',
  desc:'Jäger fliegen eine Weile Tiefflugangriffe über die Horde.',
  base:{dmg:24,cd:35,dur:8},stats:['dmg','cd','dur']});
def('ability','barrage',{name:'Orbitales Bombardement',short:'Barrage',unlock:320,key:'R',
  desc:'Granaten regnen eine Weile auf die Gegner.',
  base:{dmg:55,cd:45,dur:10},stats:['dmg','cd','dur']});
def('ability','kryo',{name:'Kryo-Impuls',short:'Kryo',unlock:260,key:'T',
  desc:'Friert alle Gegner ein. Gefrorene nehmen 25 % mehr Schaden.',
  base:{cd:40,dur:3},stats:['cd','dur']});
def('ability','rakete',{name:'Lenkrakete',short:'Rakete',unlock:320,key:'U',
  desc:'Feuert eine Rakete vom Schiff, die du selbst aus ihrer Bordkamera ins Ziel lenkst. Riesige Explosion beim Einschlag.',
  base:{dmg:500,aoe:7,cd:40,dur:12},stats:['dmg','aoe','cd','dur']});
def('ability','napalm',{name:'Napalm-Teppich',short:'Napalm',unlock:220,key:'Z',
  desc:'Setzt einen breiten Streifen vor der Horde in Brand.',
  base:{dps:35,cd:28,dur:6},stats:['dps','cd','dur']});

/* ---- Unterstützung: frei platzierbar, bleibt bis zur Zerstörung ---- */
def('support','trupp',{name:'Landetrupp',short:'Trupp',unlock:0,key:'A',
  desc:'Ein Drop-Pod bringt einen Trupp Soldaten aufs Schlachtfeld.',
  base:{cd:25,count:3},stats:['cd','count']});
def('support','wall',{name:'Barrikade',short:'Wand',unlock:120,key:'D',
  desc:'Hält Gegner auf und steckt viel Schaden ein.',
  base:{cd:20,hp:600,regen:0},stats:['cd','hp','regen']});
def('support','minen',{name:'Minenfeld',short:'Minen',unlock:150,key:'H',
  desc:'Versteckte Minen explodieren, sobald ein Gegner darüberläuft.',
  base:{cd:22,dmg:80,count:8},stats:['cd','dmg','count']});
def('support','sentry',{name:'Geschützturm',short:'Turm',unlock:180,key:'S',
  desc:'Automatischer Turm, schießt auf alles in Reichweite.',
  base:{cd:30,hp:220,dmg:14,rate:3,range:18},stats:['cd','hp','dmg','rate','range']});
def('support','moerser',{name:'Mörserstellung',short:'Mörser',unlock:280,key:'G',
  desc:'Beschießt Gruppen auf große Entfernung mit Flächenschaden.',
  base:{cd:40,hp:250,dmg:70,rate:.33,aoe:3.5},stats:['cd','hp','dmg','rate','aoe']});
def('support','kaserne',{name:'Kaserne',short:'Kaserne',unlock:350,key:'F',
  desc:'Bildet laufend neue Soldaten aus.',
  base:{cd:60,hp:500,recruit:12,cap:3},stats:['cd','hp','recruit','cap']});

def('support','graeber',{name:'Gräber',short:'Gräber',unlock:260,key:'L',
  desc:'Soldaten graben sich ein. Läuft ein Gegner über sie, packen sie ihn an den Füßen und ziehen ihn unter die Erde.',
  base:{cd:26,count:3,grabs:3,reload:5,grip:0},stats:['cd','count','grabs','reload','grip']});
def('support','rover',{name:'Kamikaze-Rover',short:'Rover',unlock:240,key:'I',
  desc:'Ein Shuttle setzt Sprengstoff-Rover ab. Sie rasen zuerst auf Brutlöcher, sonst auf den Gegner mit dem meisten Leben, und explodieren dort.',
  base:{cd:30,count:2,dmg:260,aoe:4.5,speed:1},stats:['cd','count','dmg','aoe','speed']});
def('support','marine',{name:'Panzer-Marines',short:'Marines',unlock:380,key:'N',
  desc:'Schwer gepanzerte Nahkämpfer mit Schild und Kettensäge. Viel Leben, wenig Schaden. Sie stellen sich vor deine Einheiten mit dem gleichen Befehl und fangen die Gegner ab.',
  base:{cd:35,count:2,hp:900,dmg:16,shield:.3},stats:['cd','count','hp','dmg','shield']});
def('support','mech',{name:'Mech-Shuttle',short:'Mech',unlock:300,key:'J',
  desc:'Ein Shuttle landet und setzt einen Kampfroboter ab, fast doppelt so groß wie ein Soldat.',
  base:{cd:50,count:1},stats:['cd','count']});
/* ---- Mechs: Hauptwaffe MG plus kaufbare Zusatzwaffen ---- */
def('mechunit','mechunit',{name:'Mech',short:'Mech',unlock:0,
  desc:'Werte und Bewaffnung aller Mechs. Gekaufte Waffen werden sofort an neue und vorhandene Mechs angebaut. Hauptwaffe ist immer das Maschinengewehr.',
  base:{hp:420,dmg:12,speed:3,slots:2,mrak:0,mflam:0,mgren:0,mlaser:0},stats:['hp','dmg','speed','slots','mrak','mflam','mgren','mlaser']});
const MECH_W=['mrak','mflam','mgren','mlaser'];

/* ---- Soldaten (gilt für Landetrupp und Kaserne) ---- */
def('soldier','soldat',{name:'Soldaten',short:'Soldaten',unlock:0,
  desc:'Werte aller Soldaten auf dem Feld.',
  base:{hp:60,dmg:9,speed:4.5,troops:12,grenade:0,flamer:0,rpg:0,sniper:0},
  stats:['hp','dmg','speed','troops','grenade','flamer','rpg','sniper']});

/* ---- Basis und Allgemeines ---- */
def('base','basis',{name:'Schildgenerator',short:'Generator',unlock:0,
  desc:'Dein Generator am Boden. Fällt sein Schild, endet der Run.',
  base:{maxhp:120,shreg:0,armor:0,turret:0,ring:0},stats:['maxhp','shreg','armor','turret','ring']});
def('general','allg',{name:'Allgemein',short:'Allgemein',unlock:0,
  desc:'Bonus für jeden Run.',
  base:{choices:2,xp:1,medals:1,credits:1,startcr:0},stats:['choices','xp','medals','credits','startcr']});

/* ---- Kommandanten: einer zur Zeit, ab der ersten Wiedergeburt ---- */
def('commander','cmd_kom',{name:'Kommandeur',short:'Kommandeur',stars:2,abil:'Sammelruf',
  desc:'Unterstützer: führt einen eigenen Trupp, der immer selbstständig angreift. Seine Aura stärkt Einheiten in der Nähe. Fähigkeit Sammelruf heilt alle Einheiten und gibt 8 s lang 30 % mehr Schaden.',
  base:{hp:900,dmg:22,squad:4,spawn:9,aura:.15,cd:40},stats:['hp','dmg','squad','spawn','aura','cd']});
def('commander','cmd_sniper',{name:'Scharfschütze',short:'Sniper',stars:2,abil:'Tarnung',
  desc:'Riesige Reichweite und gewaltiger Schaden, aber langes Nachladen. Zielt bevorzugt auf Bosse. Fähigkeit Tarnung macht ihn unsichtbar und legt Minen um ihn herum.',
  base:{hp:600,dmg:280,range:58,reload:2.6,mines:4,cd:30},stats:['hp','dmg','range','reload','mines','cd']});
def('commander','cmd_nekro',{name:'Nekromant',short:'Nekromant',stars:3,abil:'Totenwelle',
  desc:'Beschwört Zombies, die blind auf Gegner zustürmen und sie im Nahkampf zerfleischen. Jeder getötete Gegner kann als Zombie wieder aufstehen. Fähigkeit Totenwelle erweckt sofort 6 Zombies.',
  base:{hp:750,dmg:16,summon:6,zmax:8,zhp:90,zdmg:16,zchance:.10,cd:35},stats:['hp','dmg','summon','zmax','zhp','zdmg','zchance','cd']});
def('commander','cmd_pilot',{name:'Pilot',short:'Pilot',stars:3,abil:'Bombenteppich',
  desc:'Nicht am Boden: kreist mit einem schweren Jet über dem Feld und gibt Dauerfeuer. Neue Jet-Waffen baust du per Upgrade an. Fähigkeit Bombenteppich legt eine Bombenreihe quer über das Feld.',
  base:{dmg:20,speed:1,prak:0,pbomb:0,plaser:0,cd:25},stats:['dmg','speed','prak','pbomb','plaser','cd']});
def('commander','cmd_ing',{name:'Ingenieur',short:'Ingenieur',stars:2,abil:'Notreparatur',
  desc:'Repariert Gebäude und den Generator in seiner Nähe und baut selbst Mini-Geschütze auf. Fähigkeit Notreparatur füllt den Generator und alle Gebäude stark auf.',
  base:{hp:800,dmg:16,repair:12,turrets:2,cd:30},stats:['hp','dmg','repair','turrets','cd']});
def('commander','cmd_ameise',{name:'Ameisenlegion',short:'Ameisen',stars:3,abil:'Ameisenflut',
  desc:'Hunderte Ameisen. Verteilt sind sie unverwundbar. Am Gegner bauen sie sich zu einem Riesen mit Keule zusammen und zerfallen nach dem Kill wieder. Nur der Riese kann Schaden nehmen. Fähigkeit Ameisenflut überzieht ein großes Gebiet, beißt und bremst alle Gegner darin.',
  base:{hp:1400,dmg:70,reload:1.3,aoe:3,speed:1,legion:0,flood:45,cd:30},stats:['hp','dmg','reload','aoe','speed','legion','flood','cd']});
/* Verzauberungen: zusätzliche Boni, aktiv solange ihr Kommandant ausgewählt ist (mit Sternen gekauft) */
const ENCH={
  cmd_kom:[{k:'dr',n:'Eiserne Disziplin',per:.02,max:5,d:'Alle Einheiten und der Generator nehmen weniger Schaden'},{k:'dmg',n:'Feldgeschrei',per:.03,max:5,d:'Mehr Schaden für alles'},{k:'cr',n:'Kriegskasse',per:.04,max:5,d:'Mehr Credits'},{k:'squad',n:'Verstärkung',per:1,max:3,d:'Ein Soldat mehr im Trupp des Kommandeurs'}],
  cmd_sniper:[{k:'dr',n:'Tarnnetz',per:.02,max:5,d:'Alle Einheiten und der Generator nehmen weniger Schaden'},{k:'crit',n:'Kopfschuss',per:.04,max:5,d:'Chance auf doppelten Schaden bei allem'},{k:'cd',n:'Ruhige Hand',per:.04,max:5,d:'Kürzere Abklingzeiten'},{k:'cr',n:'Kopfgeld',per:.05,max:5,d:'Mehr Credits'}],
  cmd_nekro:[{k:'dr',n:'Seelenschild',per:.02,max:5,d:'Alle Einheiten und der Generator nehmen weniger Schaden'},{k:'dmg',n:'Verderbnis',per:.03,max:5,d:'Mehr Schaden für alles'},{k:'zchance',n:'Totenernte',per:.02,max:5,d:'Höhere Chance auf Wiedererweckung'},{k:'xp',n:'Blutzoll',per:.05,max:5,d:'Mehr Erfahrung'}],
  cmd_pilot:[{k:'dr',n:'Luftschirm',per:.02,max:5,d:'Alle Einheiten und der Generator nehmen weniger Schaden'},{k:'dmg',n:'Zielerfassung',per:.03,max:5,d:'Mehr Schaden für alles'},{k:'cd',n:'Nachbrenner',per:.04,max:5,d:'Kürzere Abklingzeiten'},{k:'cr',n:'Beuteflüge',per:.04,max:5,d:'Mehr Credits'}],
  cmd_ameise:[{k:'dr',n:'Chitinpanzer',per:.02,max:5,d:'Alle Einheiten und der Generator nehmen weniger Schaden'},{k:'dmg',n:'Säurebiss',per:.03,max:5,d:'Mehr Schaden für alles'},{k:'xp',n:'Schwarmwissen',per:.05,max:5,d:'Mehr Erfahrung'},{k:'cr',n:'Vorratskammer',per:.04,max:5,d:'Mehr Credits'}],
  cmd_ing:[{k:'dr',n:'Panzerplatten',per:.02,max:5,d:'Alle Einheiten und der Generator nehmen weniger Schaden'},{k:'dmg',n:'Überladung',per:.03,max:5,d:'Mehr Schaden für alles'},{k:'cd',n:'Effizienz',per:.04,max:5,d:'Kürzere Abklingzeiten'},{k:'cr',n:'Recycling',per:.04,max:5,d:'Mehr Credits'}],
};
const enchCost=(lv)=>1+Math.floor(lv/2);
// Nötige Welle für die Wiedergeburt: 25, danach +5 pro Wiedergeburt, höchstens 80
const rbMin=()=>Math.min(80,25+5*(M.rebirths||0));
// Sterne: höhere Wiedergeburten und mehr Wellen über der Grenze bringen mehr
const rebirthStars=best=>Math.round((3+Math.max(0,Math.floor((best-rbMin())/10)))*(1+.35*(M.rebirths||0)));

/* Benötigte Wiedergeburt: stärkere Waffen, Fähigkeiten und Unterstützungen kommen später */
const RB={haubitze:1,plasma:1,railgun:3,luft:1,kryo:1,barrage:2,rakete:2,moerser:1,kaserne:1,graeber:1,rover:1,mech:2,marine:2};
for(const id in RB)ITEMS[id].rb=RB[id];
const KIND_IDS=k=>Object.values(ITEMS).filter(i=>i.kind===k).map(i=>i.id);
const WEAPON_IDS=KIND_IDS('weapon'), ABILITY_IDS=KIND_IDS('ability'), SUPPORT_IDS=KIND_IDS('support'), CMD_IDS=KIND_IDS('commander');

/* ---- Speicherstand ---- */
const META_KEY='orbitalbrigade-meta-v2';
const ls={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
function freshMeta(){return{shipSel:'bastion',medals:0,unlocked:{kanone:1,orbital:1,trupp:1},lv:{},best:0,runs:0,tut:0,rebirths:0,stars:0,bestAll:0,cmdOwned:{},cmdSel:null,ench:{},tokens:0,inf:{}}}
function loadMeta(){
  try{const d=JSON.parse(ls.get(META_KEY)||'null');if(d&&d.unlocked){const f=freshMeta();return Object.assign(f,d,{unlocked:Object.assign(f.unlocked,d.unlocked),lv:d.lv||{}})}}catch(e){}
  return freshMeta();
}
let M=loadMeta();
const rbOk=id=>(ITEMS[id]&&ITEMS[id].rb||0)<=M.rebirths;
// Freischaltungen über der aktuellen Wiedergeburt werden zurückgenommen und die Medaillen erstattet
function sanitizeUnlocks(){let ref=0;for(const id in M.unlocked)if(ITEMS[id]&&!rbOk(id)){ref+=ITEMS[id].unlock||0;delete M.unlocked[id]}if(ref){M.medals+=ref;ls.set(META_KEY,JSON.stringify(M))}return ref}
const unlockRefund=sanitizeUnlocks();
function fullReset(){M=freshMeta();M.rkFix=1;saveMeta();ls.set('orbitalbrigade-autoab','{}')}
// Testphase der Lenkrakete beenden: einmalig wieder sperren
if(!M.rkFix){delete M.unlocked.rakete;M.rkFix=1}
function saveMeta(){let o=M;if(M.eq){o=Object.assign({},M);o.unlocked=M._real;o.cmdSel=M._realSel;delete o.eq;delete o._real;delete o._realSel}ls.set(META_KEY,JSON.stringify(o))}
/* Gleiche Bedingungen: Standard-Ausrüstung ohne Menü-Upgrades, Wiedergeburt-Boni und Kommandant */
function setEqual(on){
  if(on&&!M.eq){M._real=M.unlocked;M._realSel=M.cmdSel;const u={};for(const id of Object.keys(ITEMS)){const it=ITEMS[id];if(['weapon','ability','support'].includes(it.kind)&&(it.rb||0)<=1)u[id]=1}M.unlocked=u;M.cmdSel=null;M.eq=true}
  else if(!on&&M.eq){M.unlocked=M._real;M.cmdSel=M._realSel;delete M._real;delete M._realSel;delete M.eq}
}

/* ---- Werte berechnen ---- */
const lvKey=(id,k)=>id+'.'+k;
function metaLv(id,k){return M.eq?0:(M.lv[lvKey(id,k)]||0)}
/* Unendlichkeits-Upgrades: winzige Boni für Medaillen, beliebig oft kaufbar, bleiben bei der Wiedergeburt */
const INF=[
  {k:'dmg',n:'Feuerkraft',d:'Schaden aller Waffen',per:.004},
  {k:'abil',n:'Orbitaltechnik',d:'Schaden von Fähigkeiten',per:.004},
  {k:'hp',n:'Schildstärke',d:'Maximaler Generator-Schild',per:.004},
  {k:'cd',n:'Bereitschaft',d:'Kürzere Abklingzeiten',per:.002},
  {k:'cr',n:'Beuteanteil',d:'Mehr Credits',per:.003},
  {k:'xp',n:'Kampferfahrung',d:'Mehr Erfahrung',per:.003},
];
const infLv=k=>M.eq?0:Math.max(0,(M.inf&&M.inf[k])|0);
const infCost=k=>Math.round(120*Math.pow(1.16,Math.max(0,(M.inf&&M.inf[k])|0)));
function infMul(id,k){
  const it=ITEMS[id];if(!it||M.eq||!M.inf)return 1;
  const f=(key)=>1+INF.find(x=>x.k===key).per*infLv(key);
  if(it.kind==='weapon'&&(k==='dmg'||k==='dps'))return f('dmg');
  if(it.kind==='ability'){if(k==='dmg'||k==='dps')return f('abil');if(k==='cd')return 1/f('cd')}
  if(it.kind==='support'&&k==='cd')return 1/f('cd');
  if(id==='basis'&&k==='maxhp')return f('hp');
  if(id==='allg'&&k==='credits')return f('cr');
  if(id==='allg'&&k==='xp')return f('xp');
  return 1;
}
function runLv(run,id,k){return run?(run.lv[lvKey(id,k)]||0):0}
function statAt(id,k,L){
  const st=STAT[k],b=ITEMS[id].base[k]??0;
  let v=st.m==='mul'?b*(1+st.s*L):st.m==='div'?b/(1+st.s*L):b+st.s*L;
  if(k==='armor')v=Math.min(.5,v);
  if(k==='crit')v=Math.min(.6,v);
  return v;
}
function val(id,k,run){return statAt(id,k,metaLv(id,k)+runLv(run,id,k))}
function fmtStat(k,v){
  const st=STAT[k];
  if(MECH_W.includes(k))return v<.5?'nicht angebaut':'Stufe '+Math.round(v);
  if(st.pct)return Math.round(v*100)+' %';
  if(k==='grip')return ['Kleine Gegner','+ Panzerkäfer','+ Brutwächter','+ Bosse'][Math.min(3,Math.round(v))];
  if(k==='legion')return (240+60*Math.round(v))+' Ameisen';
  if(k==='shield')return Math.round(Math.min(.75,v)*100)+' %';
  if(k==='cd'||k==='dur'||k==='recruit'||k==='stun'||k==='pool'||k==='reload')return (Math.round(v*10)/10).toLocaleString('de-DE')+' s';
  if(k==='rate')return (Math.round(v*100)/100).toLocaleString('de-DE')+' /s';
  if(k==='xp'||k==='medals'||k==='credits')return '×'+(Math.round(v*100)/100).toLocaleString('de-DE');
  if(k==='shreg')return (Math.round(v*10)/10).toLocaleString('de-DE')+' /s';
  if(k==='regen')return (Math.round(v*10)/10).toLocaleString('de-DE')+' %/s';
  if(v<10&&v%1)return (Math.round(v*10)/10).toLocaleString('de-DE');
  return Math.round(v).toLocaleString('de-DE');
}
function runCost(id,k,run){return Math.round(STAT[k].rc*Math.pow(1.45,runLv(run,id,k)))}
function metaCost(id,k){return Math.round(STAT[k].mc*Math.pow(1.6,metaLv(id,k)))}

/* ---- Wiedergeburt und Verzauberungen ---- */
M.bestAll=Math.max(M.bestAll||0,M.best||0);
const enchLv=(c,k)=>M.ench[c+'.'+k]||0;
function enchSum(type){if(M.eq)return 0;const c=M.cmdSel;if(!c||!M.cmdOwned[c])return 0;return (ENCH[c]||[]).filter(e=>e.k===type).reduce((a,e)=>a+e.per*enchLv(c,e.k),0)}
const rebirthDmg=()=>M.eq?1:1+.25*M.rebirths, rebirthMoney=()=>M.eq?1:1+.2*M.rebirths;
function doRebirth(){
  const gain=rebirthStars(M.best),keep={};M.tokens=M.tokens||0;M.inf=M.inf||{};
  for(const k in M.lv)if(k.startsWith('cmd_'))keep[k]=M.lv[k];
  M.rebirths++;M.stars+=gain;M.bestAll=Math.max(M.bestAll,M.best);
  M.medals=0;M.unlocked={kanone:1,orbital:1,trupp:1};M.lv=keep;M.best=0;
  saveMeta();return gain;
}
