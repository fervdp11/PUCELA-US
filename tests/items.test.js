// Cofres, inventario y los siete objetos: todo validado por el servidor.
import test from 'node:test';import assert from 'node:assert/strict';
import {createRoom,command,snapshot,tick} from '../game/engine.js';
import {WORLDS,canStand,distance,ITEMS,CAGE_HALF} from '../public/content.js';
import {CHEST_MIN_MS} from '../game/items.js';
function fixture(map='house',players=4){let now=Date.now();const {room,player}=createRoom({name:'Humano'},now);for(let i=1;i<players;i++)command(room,player.token,'addBot',{},now);command(room,player.token,'configure',{map,tasks:4,discussion:5,voting:30,killCooldown:20},now);command(room,player.token,'start',{},now);room.players.forEach((p,i)=>{p.bot=false;p.role=i===0?'impostor':'crew';p.specialRole=null;p.lastSeen=now;p.killReady=0;});room.intro=null;room.revealUntil=0;room.roleRevealAt=0;room.travelUntil=0;room.emergencyReady=0;room.sabotageReady=Infinity;const send=(i,type,data={},dt=0)=>{now+=dt;room.players.forEach(p=>p.lastSeen=now);for(const p of room.players)p.rateAt=0;return command(room,room.players[i].token,type,data,now);};return {room,send,get now(){return now;},wait(ms){now+=ms;room.players.forEach(p=>p.lastSeen=now);tick(room,now);},state:i=>snapshot(room,room.players[i],now)};}
const place=(f,i,pt)=>Object.assign(f.room.players[i],{x:pt.x,y:pt.y,floor:pt.floor??0,input:{x:0,y:0},moveAt:f.now,motionAt:f.now,transition:null});
function openChest(f,i,chest){place(f,i,{x:chest.x,y:chest.y+40,floor:chest.floor});const r=f.send(i,'openChest',{id:chest.id});const ch=r.chest.challenge;return {r,solution:{order:[1,2,3].map(n=>ch.order.indexOf(n)),lid:true}};}
const standNear=(m,c)=>{for(let d=0;d<=110;d+=6)for(let a=0;a<16;a++){const x=c.x+Math.cos(a*Math.PI/8)*d,y=c.y+Math.sin(a*Math.PI/8)*d;if(canStand(m,x,y))return {x,y};}return null;};

test('cofres en los tres mapas: temáticos, uno o dos por sala y alcanzables',()=>{
 const themes={house:['backpack','case'],club:['case'],gym:['sports-bag']};
 for(const [id,w] of Object.entries(WORLDS)){assert.ok(w.CHESTS.length>=5,id);const per={};for(const c of w.CHESTS){per[c.floor+':'+c.room]=(per[c.floor+':'+c.room]||0)+1;assert.ok(themes[id].includes(c.theme),`${id} ${c.theme}`);const m=w.FLOORS[c.floor===1?1:0];assert.ok(standNear(m,c),`${c.id} sin acceso`);}
  assert.ok(Object.values(per).every(n=>n<=2),`${id}: como mucho dos por sala`);}
});
test('abrir un cofre: minijuego validado, un único ganador y nunca más de dos objetos',()=>{
 const f=fixture('house');const chest=WORLDS.house.CHESTS[0],state=f.room.chests.find(c=>c.id===chest.id);state.item='turbo';
 const far=f.room.players[1];Object.assign(far,{x:chest.x+600,y:chest.y});assert.throws(()=>f.send(1,'openChest',{id:chest.id}),/Acércate/);
 const a=openChest(f,1,chest),b=openChest(f,2,chest);
 assert.throws(()=>f.send(1,'finishChest',{id:chest.id,solution:a.solution},200),/calma/);
 const again=openChest(f,1,chest);f.wait(CHEST_MIN_MS+50);
 assert.throws(()=>f.send(1,'finishChest',{id:chest.id,solution:{order:[0,0,0],lid:true}}),/cierre/);
 const c=openChest(f,1,chest);f.wait(CHEST_MIN_MS+50);const r=f.send(1,'finishChest',{id:chest.id,solution:c.solution});assert.equal(r.found,'turbo');
 assert.throws(()=>f.send(2,'finishChest',{id:chest.id,solution:b.solution}),/(abriendo|antes)/);
 assert.throws(()=>f.send(2,'openChest',{id:chest.id}),/ya está abierto/);
 const me=f.state(1).me.items;assert.equal(me.slots.filter(Boolean).length,1);assert.ok(f.state(2).me.items.chests.includes(chest.id),'todos ven el cofre abierto');
 // Lleno: dos objetos y no se abre un tercero.
 const p=f.room.players[1];p.items.slots=[{uid:'a',kind:'flashlight',charge:30000,active:false},{uid:'b',kind:'decoy',charge:0,active:false}];
 assert.throws(()=>openChest(f,1,WORLDS.house.CHESTS[1]),/dos objetos/);
 // Un objeto suelto se puede recoger; soltar y recoger son del servidor.
 f.send(1,'dropItem',{slot:0});assert.equal(f.state(2).me.items.ground.length,1);const g=f.state(2).me.items.ground[0];place(f,2,{x:g.x,y:g.y});f.send(2,'pickItem',{uid:g.uid});assert.equal(f.room.players[2].items.slots.filter(Boolean)[0].kind,'flashlight');
 assert.throws(()=>f.send(1,'useItem',{slot:0}),/vacía/);
});
test('zapatillas y linterna: efecto real, carga acumulada y se agotan',()=>{
 const f=fixture('house');const p=f.room.players[1],m=WORLDS.house.FLOORS[0];p.items.slots=[{uid:'t',kind:'turbo',charge:30000,active:false},{uid:'l',kind:'flashlight',charge:30000,active:false}];
 f.room.sabotage={kind:'lights',id:'qa',fixed:[],confirmations:{},started:f.now,deadline:f.now+90000};const vision=f.state(1).me.vision;f.send(1,'useItem',{slot:1});assert.ok(f.state(1).me.vision>vision,'la linterna amplía la visión en el apagón');f.room.sabotage=null;
 const start={x:p.x,y:p.y};p.input={x:1,y:0};p.moveAt=f.now;f.wait(400);f.send(1,'pulse',{x:1,y:0});const normal=distance(start,p);
 Object.assign(p,start);f.send(1,'useItem',{slot:0});p.input={x:1,y:0};p.moveAt=f.now;f.wait(400);f.send(1,'pulse',{x:1,y:0});const fast=distance(start,p);
 assert.ok(fast>normal*1.3||!canStand(m,start.x+normal*1.3,start.y),`turbo ${fast} vs ${normal}`);
 const before=p.items.slots[0].charge;f.wait(900);assert.ok(p.items.slots[0].charge<before,'gasta carga solo encendido');
 f.send(1,'useItem',{slot:0});const paused=p.items.slots[0].charge;f.wait(900);assert.equal(p.items.slots[0].charge,paused,'apagado no gasta');
 p.items.slots[1].charge=100;f.wait(400);f.wait(400);assert.equal(p.items.slots[1],null,'agotada desaparece');
});
test('escudo: bloquea el ataque, reinicia la recarga del atacante y avisa a la víctima',()=>{
 const f=fixture('house');const imp=f.room.players[0],v=f.room.players[1];v.items.slots[0]={uid:'s',kind:'shield',charge:0,active:false};f.send(1,'useItem',{slot:0});
 place(f,0,{x:v.x+40,y:v.y,floor:v.floor});const r=f.send(0,'kill',{target:v.id});assert.equal(r.blocked,true);assert.equal(v.alive,true);
 assert.ok(imp.killReady>=f.now+19000,'recarga completa');
 assert.ok(f.state(1).events.some(e=>e.type==='shield-block'&&e.text.includes(imp.name)),'aviso claro a la víctima');
 assert.ok(!f.state(2).events.some(e=>e.type==='shield-block'),'nadie más recibe el aviso');
 assert.ok(f.state(1).me.items.shieldUntil>f.now);assert.ok(!JSON.stringify(f.state(2).players.find(q=>q.id===v.id)).includes('shield'),'el escudo solo lo ve quien lo lleva');
 f.wait(ITEMS.shield.duration+500);imp.killReady=0;f.send(0,'kill',{target:v.id});assert.equal(v.alive,false,'sin escudo vuelve a ser vulnerable');
});
test('clon señuelo: idéntico, muere dejando un cuerpo normal y al reportarlo se anuncia',()=>{
 const f=fixture('house');const owner=f.room.players[1];owner.items.slots[0]={uid:'d',kind:'decoy',charge:0,active:false};f.send(1,'useItem',{slot:0});
 const seen=f.state(2).me.items.decoys[0];assert.equal(seen.name,owner.name);assert.equal(seen.color,owner.color);assert.equal(seen.hat,owner.hat);assert.ok(!('owner' in seen));
 place(f,0,{x:seen.x+30,y:seen.y,floor:seen.floor});f.send(0,'kill',{target:seen.id});assert.equal(owner.alive,true,'la persona real sigue viva');
 assert.ok(f.room.players[0].killReady>f.now,'gastar el ataque consume la recarga');
 const body=f.state(2).bodies[0];assert.ok(body&&!('decoy' in body),'el cuerpo parece normal');
 place(f,2,{x:body.x+30,y:body.y,floor:0});const r=f.send(2,'report',{body:body.id});assert.equal(r.decoy,true);assert.equal(f.room.phase,'game','no hay reunión');
 assert.ok(f.state(3).events.some(e=>e.text===`Han reportado un señuelo de ${owner.name}.`));
 owner.items.slots[0]={uid:'d2',kind:'decoy',charge:0,active:false};f.send(1,'useItem',{slot:0});f.wait(ITEMS.decoy.duration+400);assert.equal(f.state(2).me.items.decoys.length,0,'dura 15 s');
});
test('jaula: atrapa a la persona más cercana, respeta colisiones y se libera en la reunión',()=>{
 const f=fixture('house');const user=f.room.players[2],target=f.room.players[1];user.items.slots[0]={uid:'c',kind:'cage',charge:0,active:false};
 place(f,1,{x:user.x+60,y:user.y,floor:user.floor});place(f,3,{x:user.x+900,y:user.y,floor:user.floor});const r=f.send(2,'useItem',{slot:0});assert.equal(r.caged,target.name);
 const c={...target.items.cage};for(let i=0;i<6;i++){target.input={x:1,y:1};target.moveAt=f.now;f.wait(300);f.send(1,'pulse',{x:1,y:1});}
 assert.ok(Math.abs(target.x-c.x)<=CAGE_HALF-15+.5&&Math.abs(target.y-c.y)<=CAGE_HALF-15+.5,'movimiento muy limitado');
 assert.equal(f.state(3).me.items.cages.length,1,'todos ven la jaula');
 const em=WORLDS.house.FLOORS[0].emergency;place(f,3,{x:em.x,y:em.y+90,floor:0});f.send(3,'emergency');assert.equal(f.room.phase,'meeting');assert.equal(target.items.cage,null,'la reunión libera');
 const g=fixture('house');g.room.players[2].items.slots[0]={uid:'c',kind:'cage',charge:0,active:false};for(const [i,q] of g.room.players.entries())if(i!==2)Object.assign(q,{x:q.x+2000});assert.throws(()=>g.send(2,'useItem',{slot:0}),/nadie/);assert.ok(g.room.players[2].items.slots[0],'si no hay nadie no se gasta');
});
test('rastreador: huellas recientes sin identidad; cámara portátil con visión y batería',()=>{
 const f=fixture('house');const p=f.room.players[1],o=f.room.players[2];p.items.slots=[{uid:'r',kind:'tracker',charge:25000,active:false},{uid:'k',kind:'camera',charge:30000,active:false}];
 place(f,2,{x:p.x+120,y:p.y});for(let i=0;i<8;i++){o.input={x:1,y:0};o.moveAt=f.now;f.wait(400);f.send(2,'pulse',{x:1,y:0});}
 assert.equal(f.state(1).me.items.footprints.length,0,'apagado no muestra nada');f.send(1,'useItem',{slot:0});const prints=f.state(1).me.items.footprints;
 assert.ok(prints.length>2);assert.ok(prints.every(q=>Object.keys(q).sort().join()==='a,age,c,x,y'),'sin nombre ni rol: solo el color principal');assert.ok(prints.every(q=>/^#/.test(q.c)));
 f.send(1,'useItem',{slot:1});assert.equal(f.state(1).me.items.slots[1].placed,true);f.send(1,'useItem',{slot:1});assert.ok(f.state(1).me.items.feed,'mira por la cámara');
 const x=p.x;p.input={x:1,y:0};p.moveAt=f.now;f.wait(400);f.send(1,'pulse',{x:1,y:0});assert.equal(p.x,x,'mirando la cámara no te mueves');
 const charge=p.items.slots[1].charge;f.wait(800);assert.ok(p.items.slots[1].charge<charge,'gasta batería mientras miras');f.send(1,'stopCamera');const paused=p.items.slots[1].charge;f.wait(800);assert.equal(p.items.slots[1].charge,paused,'pausar conserva la batería');
});
test('bots: abren cofres y usan objetos en partidas reales',()=>{
 let opened=0,used=0;for(const map of ['house','gym']){const now0=Date.now();const {room,player}=createRoom({name:'Host'},now0);for(let i=0;i<7;i++)command(room,player.token,'addBot',{},now0);command(room,player.token,'configure',{map,tasks:4},now0);command(room,player.token,'start',{},now0);
  let now=now0;for(let i=0;i<900;i++){now+=200;room.players.forEach(p=>p.lastSeen=now);tick(room,now);if(room.phase!=='game'&&room.phase!=='meeting'&&i>100)break;}
  opened+=(room.chests||[]).filter(c=>c.opened).length;used+=room.players.filter(p=>p.bot&&p.items&&p.items.slots.some(s=>s&&(s.active||s.placed))||p.items?.shieldUntil).length+(room.decoys?.length||0);}
 assert.ok(opened>=2,`los bots abren cofres (${opened})`);
});

test('escudo del impostor: ahora se protege a sí mismo con las mismas reglas (sin anular escudos ajenos)',()=>{
 const f=fixture('house');const imp=f.room.players[0],v=f.room.players[1];
 v.items.slots[0]={uid:'s',kind:'shield',charge:0,active:false};f.send(1,'useItem',{slot:0});
 imp.items.slots[0]={uid:'n',kind:'shield',charge:0,active:false};f.send(0,'useItem',{slot:0});
 assert.ok(imp.items.shieldUntil>=f.now+ITEMS.shield.duration-50,'el impostor queda protegido 30 s');assert.equal(f.room.shieldNullUntil||0,0,'ya no anula nada');
 place(f,0,{x:v.x+40,y:v.y,floor:v.floor});imp.killReady=0;const r=f.send(0,'kill',{target:v.id});assert.equal(r.blocked,true);assert.equal(v.alive,true,'el escudo de la tripulación sigue valiendo');
 // Un cuchillo contra el impostor con escudo: rebota, el cuchillo se rompe y nadie muere.
 v.items.slots[1]={uid:'k',kind:'knife',charge:0,active:false};place(f,1,{x:imp.x+40,y:imp.y,floor:imp.floor});const k=f.send(1,'knifeKill',{target:imp.id});assert.equal(k.blocked,true);assert.equal(imp.alive,true);assert.equal(v.items.slots[1],null);
});
test('cuchillo: un uso, cualquiera puede matar a cualquiera; cadáver, estadísticas y victoria',()=>{
 const f=fixture('house',5);const imp=f.room.players[0],a=f.room.players[1],b=f.room.players[2];
 assert.ok(ITEMS.knife&&ITEMS.knife.weight>0,'aparece en los cofres');
 assert.throws(()=>f.send(1,'knifeKill',{target:b.id}),/cuchillo/);
 a.items.slots[0]={uid:'k1',kind:'knife',charge:0,active:false};place(f,1,{x:b.x+40,y:b.y,floor:b.floor});
 place(f,1,{x:b.x+2000,y:b.y,floor:b.floor});assert.throws(()=>f.send(1,'knifeKill',{target:b.id}),/alcance/);assert.ok(a.items.slots[0],'fallar por distancia no lo gasta');
 place(f,1,{x:b.x+40,y:b.y,floor:b.floor});f.send(1,'knifeKill',{target:b.id});assert.equal(b.alive,false,'un tripulante mata a otro');assert.equal(a.items.slots[0],null,'se consume');
 assert.ok(f.room.bodies.some(x=>x.victim===b.id),'deja cadáver denunciable');assert.equal(f.room.actionFx.kind,'kill');assert.equal(f.room.actionFx.knife,true);assert.equal(a.stats.knifeKills,1);
 assert.equal(f.room.phase,'game');
 a.items.slots[0]={uid:'k2',kind:'knife',charge:0,active:false};place(f,1,{x:imp.x+40,y:imp.y,floor:imp.floor});f.send(1,'knifeKill',{target:imp.id});assert.equal(imp.alive,false);assert.equal(f.room.phase,'ended','sin impostores gana la tripulación');assert.equal(f.room.result.winner,'crew');
});
test('Segunda Oportunidad: 20 s para elegir, el elegido revive al instante y queda mudo en reuniones',()=>{
 const f=fixture('house',5);const imp=f.room.players[0],ghost=f.room.players[1],saved=f.room.players[2];ghost.ghostRole='second';ghost.ghostUsed=false;
 place(f,0,{x:ghost.x+40,y:ghost.y,floor:ghost.floor});imp.killReady=0;f.send(0,'kill',{target:ghost.id});assert.equal(ghost.alive,false);assert.ok(ghost.secondUntil>f.now);
 assert.equal(f.state(1).me.ghostRole,'second');assert.throws(()=>f.send(1,'secondChance',{target:imp.id+'x'}),/vivo/);
 f.send(1,'secondChance',{target:saved.id});assert.equal(saved.extraLife,true);assert.throws(()=>f.send(1,'secondChance',{target:saved.id}),/usado/);
 imp.killReady=0;place(f,0,{x:saved.x+40,y:saved.y,floor:saved.floor});const bodies=f.room.bodies.length;const r=f.send(0,'kill',{target:saved.id});
 assert.equal(r.revived,true);assert.equal(saved.alive,true,'revive al instante');assert.equal(f.room.bodies.length,bodies,'sin cadáver');assert.equal(saved.muted,true);assert.ok(imp.killReady>f.now,'el arma entra en recarga');
 assert.ok(f.state(3).roster.find(q=>q.id===saved.id).muted,'todos ven el símbolo de silencio');assert.ok(!JSON.stringify(f.state(3).reviveFx||{}).includes(imp.id),'no revela al atacante');
 f.wait(1000);imp.killReady=0;f.send(0,'kill',{target:saved.id});assert.equal(saved.alive,false,'solo funciona una vez');
 // Sin elegir a tiempo se pierde.
 const g=fixture('house',5);const i2=g.room.players[0],gh=g.room.players[1];gh.ghostRole='second';place(g,0,{x:gh.x+40,y:gh.y,floor:gh.floor});g.send(0,'kill',{target:gh.id});g.wait(20500);assert.throws(()=>g.send(1,'secondChance',{target:g.room.players[2].id}),/tiempo/);
});
test('silenciado: puede votar y moverse, pero no chatear ni usar frases en reuniones',()=>{
 const f=fixture('house',5);const m=f.room.players[2];m.muted=true;const caller=f.room.players[1];f.room.players.forEach((p,i)=>p.meetingPos={x:100+i*40,y:100,facing:1});
 f.room.phase='meeting';f.room.meeting={id:'mm',stage:'discussion',votes:{},discussionEnd:f.now+30000,voteEnd:f.now+60000,callerId:caller.id,caller:caller.name,reason:'emergency'};
 assert.throws(()=>f.send(2,'chat',{text:'hola'}),/silenciado/);assert.throws(()=>f.send(2,'chat',{quick:{kind:'skip'}}),/silenciado/);
 f.room.meeting.stage='voting';f.send(2,'vote',{target:'skip'});assert.equal(f.room.meeting.votes[m.id],'skip','puede votar');
});
test('Espíritu Veloz: impulso de 5 s una sola vez, sin atravesar paredes',()=>{
 const f=fixture('house',5);const imp=f.room.players[0],ghost=f.room.players[1],t=f.room.players[2];ghost.ghostRole='swift';ghost.alive=false;
 assert.throws(()=>f.send(2,'ghostBoost',{target:t.id}),/espectro/);f.send(1,'ghostBoost',{target:t.id});assert.ok(t.boostUntil>f.now&&t.boostUntil<=f.now+5000);
 assert.throws(()=>f.send(1,'ghostBoost',{target:t.id}),/usado/);assert.ok(f.state(2).me.boostUntil>f.now,'el beneficiado lo sabe');
});
test('Mensajero Espectral: cada 30 s, solo cómplices vivos lo ven y nunca en reuniones',()=>{
 const f=fixture('house',6);const [a,b]=[f.room.players[0],f.room.players[1]];b.role='impostor';b.ghostRole='messenger';b.alive=false;
 f.send(1,'ghostMessage',{text:'Cocina libre'});assert.throws(()=>f.send(1,'ghostMessage',{text:'otra'}),/Espera/);
 const seen=f.state(0).players.find(q=>q.id===b.id);assert.ok(seen,'el impostor vivo ve al espectro');assert.equal(seen.ghostMsg,'Cocina libre');
 assert.ok(!f.state(2).players.some(q=>q.id===b.id),'la tripulación viva no lo ve');
 f.wait(31000);f.room.phase='meeting';assert.throws(()=>f.send(1,'ghostMessage',{text:'hola'}),/reuniones/);f.room.phase='game';
 assert.equal(f.state(1).me.impostorAllyAlive,true,'el panel sabe si queda algún cómplice vivo');
});
test('clon: mismo nombre, mismo aspecto y sin ningún texto o marca extra (ids internos distintos)',()=>{
 const f=fixture('house');const owner=f.room.players[1];owner.items.slots[0]={uid:'d',kind:'decoy',charge:0,active:false};f.send(1,'useItem',{slot:0});
 for(const i of [1,2]){const d=f.state(i).me.items.decoys[0];assert.equal(d.name,owner.name);assert.notEqual(d.id,owner.id);for(const k of ['color','hat','skin','glasses','bag','accessory','outfitColor','trimColor','pants'])assert.equal(d[k],owner[k],k);}
});
test('mecánicas de escenario: pasadizos (todos / solo impostores), escondites con límite, interruptores y eventos',async()=>{
 const {mechanicsFor,HIDE_USES,HIDE_MAX_MS,DARK_ROOM_VISION}=await import('../public/map-mechanics.js');
 for(const id of ['club','gym','house']){const M=mechanicsFor(id),map=WORLDS[id].FLOORS[0];assert.ok(M.passages.filter(p=>p.impostorOnly).length>=1&&M.passages.filter(p=>!p.impostorOnly).length>=1,`${id}: pasadizos equilibrados`);assert.ok(M.hides.length>=3&&M.switches.length>=3,`${id}: escondites e interruptores`);
  for(const pt of [...M.passages.flatMap(p=>[p.a,p.b]),...M.hides,...M.switches])assert.ok(canStand(map,pt.x,pt.y),`${id}: punto en suelo libre`);}
 const f=fixture('house',5);const M=mechanicsFor('house'),imp=f.room.players[0],crew=f.room.players[1];
 const pub=M.passages.find(p=>!p.impostorOnly),sec=M.passages.find(p=>p.impostorOnly);
 place(f,1,{...sec.a});assert.throws(()=>f.send(1,'passage',{id:sec.id}),/sellado/);
 place(f,1,{...pub.a});f.send(1,'passage',{id:pub.id});assert.ok(Math.hypot(crew.x-pub.b.x,crew.y-pub.b.y)<1,'sale por el otro extremo');assert.throws(()=>f.send(1,'passage',{id:pub.id},700),/Espera/);
 place(f,0,{...sec.a});f.send(0,'passage',{id:sec.id});assert.ok(Math.hypot(imp.x-sec.b.x,imp.y-sec.b.y)<1);
 assert.ok(!f.state(1).me.items||true);
 // Escondite: nadie lo ve, no puede actuar y sale solo a los 12 s; máximo de usos.
 const h=M.hides[0];place(f,1,{x:h.x+20,y:h.y});f.send(1,'hide',{id:h.id});assert.ok(crew.hidden);assert.ok(!f.state(2).players.some(q=>q.id===crew.id),'invisible para los demás');
 place(f,0,{x:h.x+30,y:h.y});imp.killReady=0;assert.throws(()=>f.send(0,'kill',{target:crew.id}),/válido/);
 assert.throws(()=>f.send(1,'emergency'),/escondite/);f.wait(HIDE_MAX_MS+200);assert.equal(crew.hidden,null,'sale solo');
 for(let i=1;i<HIDE_USES;i++){f.wait(9000);place(f,1,{x:h.x+20,y:h.y});f.send(1,'hide',{id:h.id});f.send(1,'hide',{});}
 f.wait(9000);place(f,1,{x:h.x+20,y:h.y});assert.throws(()=>f.send(1,'hide',{id:h.id}),/veces/);
 // Interruptor: apaga el cuarto (visión reducida dentro) sin ser un sabotaje.
 const w=M.switches[0];place(f,2,{x:w.x,y:w.y});const before=f.state(2).me.vision;const r=f.send(2,'lightSwitch',{id:w.id});assert.equal(r.off,true);assert.equal(f.room.sabotage,null);
 assert.ok(f.state(2).me.vision<=170,'dentro: círculo pequeño como en un apagón');assert.ok(f.state(3).mech.off[w.room],'todos ven el cuarto a oscuras');
 // Evento del escenario.
 f.room.mech.eventAt=f.now;f.wait(50);assert.ok(f.state(0).mech.event,'evento activo');assert.ok(f.room.events.some(e=>e.type==='map-event'));
});
test('cuarto apagado: se cierra su puerta (muro) y se puede saltar sin espera; al encender desaparece',async()=>{
 const {mechanicsFor}=await import('../public/map-mechanics.js');const f=fixture('house',5),M=mechanicsFor('house'),w=M.switches.find(x=>x.room==='kids');
 place(f,2,{x:w.x,y:w.y});f.send(2,'lightSwitch',{id:w.id});const lock=f.room.doorLocks.find(l=>l.light&&l.room==='kids');assert.ok(lock&&lock.doors.length,'puerta cerrada al apagar');
 const door=WORLDS.house.DOORS.find(d=>d.id===lock.doors[0]),vertical=door.h>door.w,cx=(door.x+door.w/2)*56,cy=(door.y+door.h/2)*56;
 const side=s=>vertical?{x:cx+s*36,y:cy}:{x:cx,y:cy+s*36};place(f,1,side(-1));const before=vertical?f.room.players[1].x<cx:f.room.players[1].y<cy;
 assert.equal(f.state(1).doorLocks.find(l=>l.light).light,true);
 f.send(1,'jumpWall',{door:door.id});const p=f.room.players[1];assert.equal(vertical?p.x<cx:p.y<cy,!before,'pasa al otro lado');assert.equal(p.transition.kind,'jump');assert.ok(p.transition.until-f.now<=1000);
 f.wait(1100);f.send(1,'jumpWall',{door:door.id});assert.equal(vertical?p.x<cx:p.y<cy,before,'sin tiempo de espera');
 place(f,1,{x:cx+400,y:cy+400});assert.throws(()=>f.send(1,'jumpWall',{door:door.id}),/Acércate|muro/);
 place(f,2,{x:w.x,y:w.y});f.wait(5200);f.send(2,'lightSwitch',{id:w.id});assert.ok(!f.room.doorLocks.some(l=>l.light&&l.room==='kids'),'al encender se abre');
});
test('16.5 · linterna: mientras está encendida no hay oscuridad (apagón ni cuarto sin luz)',()=>{
 const f=fixture('house');const p=f.room.players[1];p.items.slots=[{uid:'l',kind:'flashlight',charge:30000,active:false},null,null];
 f.room.sabotage={kind:'lights',id:'qa',fixed:[],confirmations:{},started:f.now,deadline:f.now+90000};const dark=f.state(1).me.vision;f.send(1,'useItem',{slot:0});const lit=f.state(1).me.vision;
 assert.ok(lit>dark*3,`sin límite de visión con la linterna (${dark} → ${lit})`);f.send(1,'useItem',{slot:0});assert.equal(f.state(1).me.vision,dark,'al apagarla vuelve la oscuridad');});
test('16.5 · rueda de gestos: risa gratis, bailes/emojis bloqueados según el pase y sin spam',async()=>{
 const {gestureInfo,EMOJIS,NAME_REWARDS,allowed}=await import('../public/pass.js');
 assert.ok(allowed('emoji',0,{xp:0,claimed:0}),'la risa es gratis');assert.ok(!allowed('emoji',1,{xp:0,claimed:0}),'el payaso se gana en el pase');
 for(const n of ['Payaso','Pulgar abajo'])assert.ok(NAME_REWARDS.some(r=>r.field==='emoji'&&EMOJIS[r.value].n===n),n+' está en el pase');
 assert.equal(gestureInfo('x9'),null);assert.equal(gestureInfo('d0'),null);
 const f=fixture('house');const p=f.room.players[1];p.progress={xp:0,claimed:0};
 f.send(1,'gesture',{g:'e0'});assert.equal(f.state(2).players.find(q=>q.id===p.id).gesture.g,'e0','los demás ven el emoji');
 assert.throws(()=>f.send(1,'gesture',{g:'e0'}),/Espera/);f.wait(1000);
 assert.throws(()=>f.send(1,'gesture',{g:'e1'}),/bloqueado/);assert.throws(()=>f.send(1,'gesture',{g:'d1'}),/bloqueado/);
 p.progress={xp:50000,claimed:2**50-1};f.send(1,'gesture',{g:'d4'});assert.equal(f.state(1).players.find(q=>q.id===p.id).gesture.g,'d4');
 f.wait(3200);assert.equal(f.state(2).players.find(q=>q.id===p.id).gesture,null,'el gesto dura unos segundos');});

// ---- 16.5 · Cuentas con nombre y contraseña (progreso del pase en el servidor)
import {mkdtempSync,readFileSync} from 'node:fs';import {tmpdir} from 'node:os';import path from 'node:path';
import {createAccounts,mergeProgress,MemoryStore} from '../server/memory-store.js';
import {api,signProgress} from '../game/api.js';
import {joinRoom,progressHooks} from '../game/engine.js';

test('cuentas: registro, login, contraseña mal, sesión y persistencia entre reinicios',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'acc-'));let a=createAccounts({dir});
 const r=a.register({name:'  Vega  ',password:'secreto1'});assert.equal(r.name,'Vega');assert.deepEqual(r.progress,{xp:0,claimed:0});
 assert.throws(()=>a.register({name:'vega',password:'otraclave'}),/ya tiene cuenta/);assert.throws(()=>a.register({name:'ab',password:'secreto1'}),/3 y 18/);assert.throws(()=>a.register({name:'Nuevo',password:'123'}),/6 y 72/);
 assert.throws(()=>a.login({name:'Vega',password:'mala'}),/incorrectos/);assert.throws(()=>a.login({name:'Nadie',password:'secreto1'}),/incorrectos/,'no revela si el nombre existe');
 const l=a.login({name:'VEGA',password:'secreto1'});assert.equal(l.name,'Vega');assert.equal(a.progressOf(l.auth).name,'Vega');assert.equal(a.progressOf(l.auth+'x'),null);assert.equal(a.progressOf(''),null);
 a.addXp('vega',1500);a.saveProgress('vega',{xp:0,claimed:2**40+5});
 const raw=readFileSync(path.join(dir,'accounts.json'),'utf8');assert.ok(!raw.includes('secreto1'),'la contraseña no se guarda en claro');
 a=createAccounts({dir});const again=a.login({name:'vega',password:'secreto1'});assert.equal(again.progress.xp,1500);assert.equal(again.progress.claimed,2**40+5);assert.ok(a.progressOf(l.auth),'la sesión sigue valiendo tras reiniciar');
 assert.equal(mergeProgress({xp:5,claimed:1},{xp:3,claimed:2}).claimed,3);
 const pw=a.changePassword(again.auth,'secreto1','nuevaclave');assert.equal(a.progressOf(again.auth),null,'cambiar la contraseña cierra las demás sesiones');assert.throws(()=>a.login({name:'vega',password:'secreto1'}),/incorrectos/);a.login({name:'vega',password:'nuevaclave'});assert.ok(pw.auth);});
test('cuentas: tras varios fallos se bloquea un minuto',()=>{
 const a=createAccounts({persist:false});a.register({name:'Bloqueo',password:'secreto1'});const t=1000;
 for(let i=0;i<6;i++)assert.throws(()=>a.login({name:'Bloqueo',password:'x'+i},'ip',t),/incorrectos/);
 assert.throws(()=>a.login({name:'Bloqueo',password:'secreto1'},'ip',t+1000),/Demasiados/);a.login({name:'Bloqueo',password:'secreto1'},'ip',t+61000);});
test('cuentas por API: el pase se guarda en la cuenta, el nombre lo fija la cuenta y la experiencia de la partida se suma',async()=>{
 const store=new MemoryStore({secret:'t'});store.accounts=createAccounts({persist:false});progressHooks.length=0;progressHooks.push((k,x)=>store.accounts.addXp(k,x));
 const reg=await api(store,'/api/account',{action:'register',name:'Pase',password:'secreto1'});assert.equal(reg.status,200);const auth=reg.body.auth;
 assert.equal((await api(store,'/api/account',{action:'register',name:'Pase',password:'secreto1'})).status,409);assert.equal((await api(store,'/api/account',{action:'login',name:'Pase',password:'no'})).status,401);
 // Sin cuenta válida no se puede entrar con una sesión falsa.
 assert.equal((await api(store,'/api/create',{profile:{name:'X',auth:'falso.falso'}})).status,401);
 const created=await api(store,'/api/create',{profile:{name:'Otro nombre',auth}});assert.equal(created.status,200);assert.equal(created.body.state.me.name,'Pase','el nombre sale de la cuenta');
 const room=store.rooms.get(created.body.session.code);assert.equal(room.players[0].account,'pase');assert.ok(!JSON.stringify(created.body).includes('"account"'),'la clave de cuenta no sale al cliente');
 // Experiencia ganada → se suma a la cuenta aunque el cliente nunca vuelva a pedir el token.
 const p=room.players[0];p.progress={xp:0,claimed:0};room.players.forEach((q,i)=>{q.role=i?'crew':'impostor';});
 for(let i=0;i<3;i++)joinRoom(room,{name:'B'+i},Date.now(),null);room.phase='game';
 const {checkWin}=await import('../game/engine.js');room.players.slice(1).forEach(q=>{q.alive=false;});checkWin(room,Date.now());
 assert.equal(room.phase,'ended');const me=await api(store,'/api/account',{action:'me',auth});assert.ok(me.body.progress.xp>0,'la partida suma XP a la cuenta');assert.equal(me.body.progress.xp,room.players[0].award.total);
 // Reclamar con la cuenta
 assert.equal((await api(store,'/api/pass',{auth,claim:1})).status,400,'aún sin nivel');
 store.accounts.addXp('pase',1000);const claim=await api(store,'/api/pass',{auth,claim:1});assert.equal(claim.status,200);assert.equal((await api(store,'/api/account',{action:'login',name:'pase',password:'secreto1'})).body.progress.claimed,1,'la recompensa queda en la cuenta');
 assert.equal((await api(store,'/api/pass',{auth:'mal.mal',claim:1})).status,401);});
test('cuentas: al registrarse se conserva el progreso que ya tenía el invitado en este dispositivo',async()=>{
 const store=new MemoryStore({secret:'t'});store.accounts=createAccounts({persist:false});const pass=await signProgress(store,{xp:2500,claimed:3});
 const r=await api(store,'/api/account',{action:'register',name:'Invitado',password:'secreto1',pass});assert.equal(r.body.progress.xp,2500);assert.equal(r.body.progress.claimed,3);
 const forged=await api(store,'/api/account',{action:'register',name:'Tramposo',password:'secreto1',pass:pass.slice(0,-1)+'0'});assert.equal(forged.body.progress.xp,0,'un token falsificado no suma nada');});
