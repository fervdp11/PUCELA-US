import test from 'node:test';import assert from 'node:assert/strict';import {api} from '../game/api.js';import {tick,snapshot,command,createRoom} from '../game/engine.js';import {MemoryStore} from '../server/memory-store.js';import {WORLDS,canStand,move,distance,TILE,SPEED} from '../public/content.js';import {botRoute,botAnswer,observeBot} from '../game/bots.js';import {challenge,solution} from '../game/tasks.js';
async function fixture(map='club'){const store=new MemoryStore(),clock={now:Date.now()};const c=await api(store,'/api/create',{profile:{name:'Fer',color:0}},clock.now);const session=c.body.session,raw=()=>store.rooms.get(session.code),send=(type,data={})=>api(store,'/api/room',{...session,type,data},clock.now);await send('configure',{map,tasks:2,discussion:5,voting:15,floors:WORLDS[map].FLOORS.length===1?'0':'both'});await send('addBot');await send('addBot');await send('addBot');return {store,clock,session,raw,send};}
test('bots: gestión exclusiva del líder, aforo, identidades y datos privados',async()=>{const f=await fixture();const joined=await api(f.store,'/api/join',{code:f.session.code,profile:{name:'Humano',color:4}},f.clock.now);assert.equal((await api(f.store,'/api/room',{...joined.body.session,type:'addBot'},f.clock.now)).status,403);await f.send('fillBots');let r=f.raw();assert.equal(r.players.length,10);assert.equal(new Set(r.players.map(p=>p.color)).size,10);assert.equal(new Set(r.players.map(p=>p.name)).size,10);const s=(await f.send('pulse')).body.state;assert.equal(s.roster.filter(p=>p.bot).length,8);assert.ok(!JSON.stringify(s).includes('suspicions'));assert.ok(!JSON.stringify(s).includes(r.players.find(p=>p.bot).token));assert.equal((await f.send('addBot')).status,400);await f.send('removeBot');assert.equal(f.raw().players.length,9);});
test('rutas de bots: todas las estaciones y cambios de planta sin atravesar muebles',()=>{for(const world of Object.values(WORLDS))for(const map of world.FLOORS)for(const target of [...map.stations,...map.repair,...map.stairs]){const path=botRoute(map,map.spawn,target,80);assert.ok(path.length||distance(map.spawn,target)<80,world.id+':'+target.id);const p={...map.spawn};for(const node of path){assert.ok(canStand(map,node.x,node.y));const d=distance(p,node);move(map,p,node.x-p.x,node.y-p.y,d/205);assert.ok(distance(p,node)<2,`${world.id} ${target.id}: ${JSON.stringify({p,node})}`);}}});
test('todas las soluciones de bots pasan por el mismo validador de minijuegos',()=>{for(const k of Object.keys((awaitable=>awaitable)({dj:1,speaker:1,stock:1,vip:1,power:1,download:1,calibrate:1,trash:1,chalk:1,desks:1,wires:1,computer:1,documents:1,delivery:1,book:1,exams:1,supplies:1,bell:1,german:1,papers:1,lights:1,code:1,folders:1,bath:1}))){const c=challenge(k);assert.equal(!!solution(k,c,botAnswer(k,c)),true,k);}});
test('la sospecha depende de ver la escena, no de conocer el rol secreto',async()=>{const f=await fixture(),r=f.raw(),observer=r.players[1],attacker=r.players[2],victim=r.players[3],spawn=WORLDS.club.FLOORS[0].spawn;r.phase='game';for(const p of r.players)Object.assign(p,spawn,{floor:0,role:p===attacker?'impostor':'crew'});r.actionFx={id:'attack',actor:attacker.id,target:victim.id,floor:0,victimX:spawn.x+30,victimY:spawn.y,at:f.clock.now,attacker:{name:attacker.name}};observeBot(r,observer,f.clock.now);assert.equal(observer.brain.suspicions[attacker.id],100);observer.brain={suspicions:{},seenBodies:[]};Object.assign(observer,{x:4.5*TILE,y:16*TILE});observeBot(r,observer,f.clock.now);assert.equal(observer.brain.suspicions[attacker.id],undefined);});
for(const mapName of ['club','school','gym'])test(`bots tripulantes completan tareas reales y pueden ganar en ${mapName}`,async()=>{const f=await fixture(mapName);await f.send('start');const r=f.raw(),start=f.clock.now;r.intro=null;r.revealUntil=0;r.roleRevealAt=0;r.teachers=[];r.players.forEach((p,i)=>{p.role=i?'crew':'impostor';p.specialRole=null;p.lastSeen=start;});let moved=false,completed=false;const initial=r.players[1].x;for(let dt=100;dt<=600000&&r.phase!=='ended';dt+=200){r.players[0].lastSeen=start+dt;tick(r,start+dt);if(Math.abs(r.players[1].x-initial)>50)moved=true;if(r.players.some(p=>p.bot&&p.tasks.some(t=>t.done)))completed=true;for(const p of r.players)assert.ok(!p.bot||canStand(WORLDS[mapName].mapFor(p.floor,r.sabotage),p.x,p.y,!p.alive),`${mapName}: ${p.name} ${p.x},${p.y}`);}assert.ok(moved);assert.ok(completed);assert.equal(r.phase,'ended',JSON.stringify(r.players.map(p=>({name:p.name,tasks:p.tasks,brain:p.brain?.lastError,position:[p.x,p.y,p.floor],path:p.brain?.path?.length}))));assert.equal(r.result.winner,'crew');});
test('impostores bot usan las acciones validadas, respetan recarga y pueden ganar',async()=>{const f=await fixture();await f.send('start');const r=f.raw(),start=f.clock.now;r.revealUntil=0;r.roleRevealAt=0;r.teachers=[];r.players.forEach((p,i)=>{p.role=i===1?'impostor':'crew';p.specialRole=null;p.killReady=0;p.lastSeen=start;});const imp=r.players[1],crew=r.players.filter(p=>p.role==='crew'),spawn=WORLDS.club.FLOORS[0].spawn;Object.assign(imp,{...spawn,x:spawn.x-50});Object.assign(crew[0],{...spawn,x:spawn.x-100});crew.slice(1).forEach((p,i)=>Object.assign(p,{x:(4+i*7)*TILE,y:16*TILE,floor:0}));let kills=0;for(let dt=100;dt<480000&&r.phase!=='ended';dt+=200){r.players[0].lastSeen=start+dt;tick(r,start+dt);kills=Math.max(kills,imp.stats?.kills||0);}assert.ok(kills>=1);assert.ok(r.phase==='ended'||r.meeting||r.players.some(p=>p.tasks.some(t=>t.done)));});

// Movimiento de los bots: ni saltos imposibles ni plantones largos.
//
// Se excluye lo que legítimamente no se mueve (hacer una tarea, reparar, mirar
// cámaras, haber terminado) y lo que legítimamente salta (escaleras, conductos
// y la recolocación de una reunión). Lo que quede son tirones de verdad.
test('los bots caminan sin teletransportes ni plantones largos en los cuatro mapas',()=>{
 for(const map of ['school','club','gym','park']){
  const now=Date.now(),{room,player}=createRoom({name:'Suavidad'},now);
  for(let i=0;i<9;i++)command(room,player.token,'addBot',{},now);
  command(room,player.token,'configure',{map,tasks:6},now);
  command(room,player.token,'start',{},now);
  room.intro=null;room.revealUntil=0;room.roleRevealAt=0;room.travelUntil=0;
  const prev=new Map(),stall=new Map();
  const STEP=100,limit=SPEED*room.config.speed*(STEP/1000)*2.2;
  let phase=room.phase,worstStall=0,biggest=0;
  for(let t=STEP;t<=60000;t+=STEP){
   room.players[0].lastSeen=now+t;
   tick(room,now+t);
   if(room.phase!==phase){phase=room.phase;prev.clear();stall.clear();continue;}
   for(const p of room.players){
    if(!p.bot||!p.alive)continue;
    const q=prev.get(p.id);
    // `motionEpoch` es la marca que el propio motor pone a un salto legítimo
    // (conducto, escalera, expulsión) y que el cliente usa para no interpolarlo.
    const jumped=q&&(q.floor!==p.floor||q.vent||p.vent||p.transition||q.motionEpoch!==(p.motionEpoch||0));
    if(q&&!jumped){
     const d=Math.hypot(p.x-q.x,p.y-q.y);
     if(d>biggest)biggest=d;
     assert.ok(d<=limit,`${map}: salto imposible de ${d.toFixed(1)} px en t=${t} (límite ${limit.toFixed(1)})`);
     // Un impostor quieto mientras finge una tarea no es un tirón: es su táctica,
     // y `fakeUntil` es la marca con la que el propio motor lo registra.
     const busy=!!p.puzzle||!!p.repair||!!p.brain?.retryAt&&p.brain.retryAt>now+t||!!p.camera||!p.tasks.some(x=>!x.done)
      ||room.phase!=='game'||(p.brain?.fakeUntil||0)>now+t
      ||(p.expelledUntil||0)>now+t   // cumpliendo expulsión en la sala cerrada
      // El sabotaje de puertas sella salas de verdad: quien esté dentro —bot o
      // persona— espera a que lo reparen. Eso no es un tirón del bot.
      ||['doors','vip'].includes(room.sabotage?.kind)   // «vip» del Club también cierra puertas
      // Objetos: abrir un cofre, mirar una cámara portátil o estar enjaulado.
      ||!!p.items?.chest||!!p.items?.watching||(p.items?.cage?.until||0)>now+t;
     const n=!busy&&d<.2?(stall.get(p.id)||0)+1:0;
     stall.set(p.id,n);
     if(n>worstStall)worstStall=n;
    }
    prev.set(p.id,{x:p.x,y:p.y,floor:p.floor,vent:p.vent,transition:p.transition,motionEpoch:p.motionEpoch||0});
   }
  }
  assert.ok(biggest>0,`${map}: ningún bot se ha movido`);
  // El umbral caza congelaciones reales (la del parque era permanente; la vuelta
  // de patrulla, 25 s). Las esperas legítimas —aguardar a que otro repare su
  // panel, reintentar tras un fallo— rondan los 2-9 s.
  assert.ok(worstStall<=150,`${map}: un bot se queda quieto ${(worstStall/10).toFixed(1)} s teniendo tareas pendientes`);
 }
});

// ---------------------------------------------------------- 10.0 · pruebas
import {botStatement,evidenceReply,hearStructured,noteEvidence,socialBrain,botVote,criticalVote} from '../game/social.js';
const seq=list=>{let i=0;return n=>list[i++%list.length]%n;};
function socialRoom(n=5){const now=Date.now(),{room,player}=createRoom({name:'Fer'},now);for(let i=0;i<n-1;i++)command(room,player.token,'addBot',{},now);command(room,player.token,'configure',{map:'club',tasks:3},now);command(room,player.token,'start',{},now);room.players.forEach((p,i)=>{p.role=i===1?'impostor':'crew';p.alive=true;});return {room,now};}
test('los bots acusan con pruebas concretas y responden «¿Qué pruebas tienes?» sin repetir la acusación',()=>{
 const {room,now}=socialRoom(),[human,imp,witness]=room.players;
 noteEvidence(witness,{kind:'vent',target:imp.id,name:imp.name,src:'camera',place:'Pista de baile',at:now});
 const said=botStatement(room,witness,seq([0]));assert.match(said.text,/conducto por las cámaras en Pista de baile/);assert.equal(said.quick.kind,'camera');assert.equal(said.quick.target,imp.id);
 room.phase='meeting';room.meeting={id:'m1',introAt:now,stage:'discussion'};
 hearStructured(room,witness,{id:'c1',playerId:human.id,time:now,intent:{kind:'evidence',target:witness.id}});
 const reply=socialBrain(witness).replies[0];assert.ok(reply,'responde a la pregunta');assert.match(reply.text,/^Lo vi yo mismo/);assert.match(reply.text,/conducto/);
 // Quien solo lo ha oído lo dice así, sin presentarlo como prueba propia.
 const other=room.players[3];hearStructured(room,other,{id:'c2',playerId:witness.id,time:now,intent:{kind:'vented',target:imp.id}});socialBrain(other).accused=imp.id;
 const told=evidenceReply(room,other,human.id);assert.match(told.text,/No lo vi yo: me lo contó/);
 const none=evidenceReply(room,room.players[4],human.id);assert.match(none.text,/No tengo pruebas suficientes/);
});
test('el escudo deja una prueba directa y el bot la cuenta en la reunión',()=>{
 const {room,now}=socialRoom(),[,imp,victim]=room.players;noteEvidence(victim,{kind:'shield',target:imp.id,name:imp.name,src:'seen',at:now});
 const said=botStatement(room,victim,seq([0]));assert.match(said.text,/me ha intentado matar, pero llevaba el escudo/);assert.equal(said.quick.kind,'shielded');
 assert.equal(botVote(room,victim,seq([99])),imp.id);
});
test('situación crítica: los tripulantes bot no omiten con 3 vivos y un impostor',()=>{
 const {room}=socialRoom(5);room.players[3].alive=false;room.players[4].alive=false;assert.ok(criticalVote(room));
 const crew=room.players[2];for(let k=0;k<60;k++)assert.notEqual(botVote(room,crew,n=>(k*7919)%n),'skip');
});
test('un tripulante bot que ve un cadáver deja su tarea y va a denunciarlo',()=>{
 const now=Date.now(),{room,player}=createRoom({name:'Fer'},now);for(let i=0;i<4;i++)command(room,player.token,'addBot',{},now);command(room,player.token,'configure',{map:'club',tasks:3},now);command(room,player.token,'start',{},now);
 room.intro=null;room.revealUntil=0;room.roleRevealAt=0;room.travelUntil=0;const map=WORLDS.club.FLOORS[0],spawn=map.spawn;
 room.players.forEach((p,i)=>{p.role=i===3?'impostor':'crew';p.specialRole=null;p.killReady=now+600000;});const bot=room.players[2],dead=room.players[4];room.sabotageReady=now+600000;
 let spot=null;for(let r=230;r<=330&&!spot;r+=10)for(let a=0;a<24;a++){const x=spawn.x+Math.cos(a/24*6.283)*r,y=spawn.y+Math.sin(a/24*6.283)*r;if(canStand(map,x,y)&&lineOfSightOK(map,spawn,{x,y})){spot={x,y};break;}}
 assert.ok(spot,'hay un sitio visible para el cadáver');
 const far=[...map.stations].sort((a,b)=>distance(b,spawn)-distance(a,spawn))[0];for(const p of room.players)if(p!==bot&&p!==dead)Object.assign(p,{x:far.x,y:far.y+40,floor:0});
 Object.assign(bot,{x:spawn.x,y:spawn.y,floor:0});dead.alive=false;room.bodies.push({id:'b1',victim:dead.id,name:dead.name,color:dead.color,floor:0,x:spot.x,y:spot.y,at:now});
 let t=now;for(let i=0;i<120&&room.phase==='game';i++){t+=100;room.players[0].lastSeen=t;tick(room,t);}
 assert.equal(room.phase,'meeting');assert.equal(room.meeting.callerId,bot.id);
});
import {lineOfSight as lineOfSightOK} from '../public/content.js';

// 15.0 · Memoria de los bots: acusación fallida, compañía, descarte y escena del crimen.
test('bots: aprenden de acusaciones fallidas, descartan coartadas y recuerdan la escena del crimen',async()=>{
 const {learnFromVote,recallMeeting,memoryStatement,socialBrain}=await import('../game/social.js');
 const mk=(id,role,bot=true)=>({id,name:id.toUpperCase(),role,bot,alive:true,removed:false});
 const b=mk('b','crew'),a=mk('a','crew',false),v=mk('v','crew'),x=mk('x','impostor'),y=mk('y','crew');
 const room={config:{confirmEject:true,impostors:1},phase:'meeting',players:[b,a,v,x,y],socialHistory:[],meeting:{id:'m1',votes:{a:'v',b:'skip'},callerId:'a',reason:'body'}};
 socialBrain(b).memory.push({kind:'accuse',from:'a',target:'v',meeting:'m1'});
 v.alive=false;learnFromVote(room,room.meeting,v);
 assert.ok((b.brain.suspicions.a||0)>=12&&(b.brain.suspicions.a||0)<70,'el acusador de un inocente gana sospecha, sin darlo por culpable');
 assert.equal(b.brain.lessons[0].who,'a');
 // Segunda reunión: descarte por coartada y escena del crimen.
 b.brain.cleared={y:{at:1}};b.brain.company={y:20000};b.brain.observedRooms={x:{place:'0:hall',name:'Vestíbulo',at:9000}};
 room.meeting={id:'m2',votes:{},callerId:'y',reason:'body',body:'V',bodyPlace:'Vestíbulo',bodyZone:'0:hall',bodyAt:10000};
 recallMeeting(room,b);
 assert.ok((b.brain.suspicions.x||0)>=10,'quien estaba donde apareció el cadáver queda señalado');
 assert.ok((b.brain.trust.y||0)>.4,'la compañía sin incidentes aumenta la confianza');
 const said=memoryStatement(room,b,'x');assert.match(said.text,/Vestíbulo/);
 const said2=memoryStatement(room,b,'a');assert.match(said2.text,/inocente|Vestíbulo|descarte/i);
});
