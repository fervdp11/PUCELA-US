// All original assertions are retained; suites share one file to keep the ZIP below 100 files.
import * as regressionModule0 from 'node:test';
import * as regressionModule1 from 'node:assert/strict';
import * as regressionModule2 from '../game/api.js';
import * as regressionModule3 from '../game/engine.js';
import * as regressionModule4 from '../server/memory-store.js';
import * as regressionModule5 from '../server/node.js';
import * as regressionModule6 from '../public/content.js';
import * as regressionModule7 from '../game/intro.js';
import * as regressionModule8 from '../public/journey.js';
import * as regressionModule9 from 'node:timers/promises';
import * as regressionModule10 from 'node:sqlite';
import * as regressionModule11 from '../server/d1-store.js';
import * as regressionModule12 from '../public/worlds.js';
import * as regressionModule13 from '../game/social.js';
import * as regressionModule14 from '../public/quick-chat.js';
import * as regressionModule15 from '../game/bots.js';
import * as regressionModule16 from '../game/tasks.js';
import * as regressionModule17 from '../game/gym-tasks.js';
import * as regressionModule18 from '../game/wildlife.js';
import * as regressionModule19 from '../public/disembark.js';
import * as regressionModule20 from '../public/visibility.js';
import * as regressionModule21 from '../public/render.js';
import * as regressionModule22 from '../public/caravan.js';
import * as regressionModule23 from '../public/pass.js';
import * as regressionModule24 from 'node:zlib';
import * as regressionModule25 from '../public/remote-motion.js';
import * as regressionModule26 from 'node:fs';
import * as regressionModule27 from '../public/expulsion.js';
import * as regressionModule28 from '../public/scenery.js';
import * as regressionModule29 from '../public/interactions.js';
import * as regressionModule30 from '../public/characters.js';
import * as regressionModule31 from '../public/soundscape.js';
import * as regressionModule33 from '../public/meetings.js';
import * as regressionModule34 from '../public/vote-countdown.js';

// Original regression suite: version6.test.js
{
const test=regressionModule0.default;
const assert=regressionModule1.default;
const {api}=regressionModule2;
const {tick,snapshot,command}=regressionModule3;
const {MemoryStore}=regressionModule4;
const {makeServer}=regressionModule5;
const {WORLDS,distance,canStand,TILE}=regressionModule6;
const {TRAVEL_MS,NEUTRAL_MS,ROLE_READ_MS}=regressionModule7;
const {journeyPose,trafficPose,blendColor}=regressionModule8;
const {setTimeout: delay}=regressionModule9;

async function fixture(map='club',modern=true,bots=false){const store=new MemoryStore(),time={now:Date.now()},r=await api(store,'/api/create',{profile:{name:'Fer',color:0,introProtocol:modern?1:0}},time.now),sessions=[r.body.session],send=(i,type,data={})=>api(store,'/api/room',{...sessions[i],type,data},time.now),raw=()=>store.rooms.get(sessions[0].code);await send(0,'configure',{map,tasks:10,discussion:5,voting:15});if(bots)for(let i=0;i<3;i++)await send(0,'addBot');else for(let i=1;i<4;i++)sessions.push((await api(store,'/api/join',{code:sessions[0].code,profile:{name:'Humano '+i,color:i,introProtocol:modern?1:0}},time.now)).body.session);return {store,time,sessions,send,raw,keep:()=>raw().players.forEach(p=>p.lastSeen=time.now)};}
test('mapa del lobby: conserva diez posiciones, epoch y configuración mientras el ordenador sigue activo',async()=>{const f=await fixture('house',false);await f.send(0,'fillBots');const before=f.raw().players.map(p=>[p.id,p.x,p.y,p.motionEpoch||0]);await f.send(0,'configure',{map:'club',speed:1.5,killCooldown:20});assert.deepEqual(f.raw().players.map(p=>[p.id,p.x,p.y,p.motionEpoch||0]),before);await f.send(0,'configure',{map:'school',floors:'1'});assert.deepEqual(f.raw().players.map(p=>[p.id,p.x,p.y,p.motionEpoch||0]),before);assert.equal(f.raw().config.speed,1.5);});
test('presentación sincronizada: viaje, neutral, revelación visible y ocho segundos completos incluso con carga lenta',async()=>{const f=await fixture();await f.send(0,'start');const start=f.time.now;assert.equal(f.raw().intro.stage,'travel');assert.equal((await f.send(0,'introReady',{stage:'arrival'})).status,400);f.time.now=start+TRAVEL_MS+100;f.keep();for(let i=0;i<3;i++)await f.send(i,'introReady',{stage:'arrival'});assert.equal(f.raw().intro.stage,'travel');f.time.now+=7000;f.keep();await f.send(3,'introReady',{stage:'arrival'});assert.equal(f.raw().intro.stage,'neutral');let s=(await f.send(0,'pulse')).body.state;assert.equal(s.me.role,null);assert.ok(s.roster.every(p=>p.role===undefined));assert.equal(s.me.vision,2000);f.time.now=f.raw().intro.neutralEnd+1;f.keep();for(let i=0;i<3;i++)await f.send(i,'introReady',{stage:'role'});assert.equal(f.raw().intro.stage,'reveal');f.time.now+=5000;f.keep();assert.equal(f.raw().intro.stage,'reveal');await f.send(3,'introReady',{stage:'role'});const readEnd=f.raw().intro.readEnd;assert.equal(readEnd,f.time.now+ROLE_READ_MS);f.time.now=readEnd-1;f.keep();assert.equal((await f.send(0,'emergency')).status,400);assert.equal(f.raw().intro.stage,'reading');f.time.now=readEnd;f.keep();s=(await f.send(0,'pulse')).body.state;assert.equal(s.intro.stage,'playing');assert.equal(s.emergencyReady,readEnd+30000);assert.equal(s.me.killReady,readEnd+s.config.killCooldown*1000);});
test('el botón respeta 30 segundos, cuota, sabotajes y enfriamiento tras reunión',async()=>{const f=await fixture('club',false);await f.send(0,'start');let r=f.raw();f.time.now=r.revealUntil+1;f.keep();const caller=r.players.findIndex(p=>p.role==='crew'),place=WORLDS.club.FLOORS[0].emergency;Object.assign(r.players[caller],{...place,input:{x:0,y:0},moveAt:f.time.now});assert.equal((await f.send(caller,'emergency')).status,400);f.time.now=f.raw().emergencyReady;f.keep();r=f.raw();r.sabotage={kind:'lights',started:f.time.now,id:'test',fixed:[],confirmations:{}};assert.equal((await f.send(caller,'emergency')).status,400);f.raw().sabotage=null;assert.equal((await f.send(caller,'emergency')).status,200);r=f.raw();r.meeting.discussionEnd=f.time.now;for(let i=0;i<4;i++)await f.send(i,'vote',{target:'skip'});f.time.now=f.raw().meeting.resultUntil+1;f.keep();await f.send(0,'pulse');assert.equal(f.raw().emergencyReady,f.time.now+30000);assert.equal((await f.send(caller,'emergency')).status,400);});
test('viaje: giro continuo, llegada detenida, tráfico separado y colores interpolados',()=>{let prev=journeyPose(0);for(let t=.01;t<=11;t+=.01){const p=journeyPose(t),car=trafficPose(t);assert.ok(distance(p,prev)<4);assert.ok(Math.abs(p.angle-prev.angle)<.025);assert.ok(Math.abs(p.x-car.x)>90);prev=p;}assert.deepEqual(journeyPose(10),journeyPose(11));assert.equal(blendColor('#000000','#ffffff',.5),'#808080');assert.equal(blendColor('#ffffff','#000000',0),'#ffffff');});
for(const name of ['club','gym','house'])test(`bots reparan todos los sabotajes de ${name} con navegación y tiempos reales`,async()=>{for(const kind of Object.keys(WORLDS[name].SABOTAGES)){const f=await fixture(name,false,true);await f.send(0,'start');let r=f.raw();r.revealUntil=0;r.roleRevealAt=0;r.teachers=[];r.sabotageReady=0;r.players.forEach((p,i)=>{p.role=i?'crew':'impostor';p.specialRole=null;});assert.equal((await f.send(0,'sabotage',{kind})).status,200);r=f.raw();for(let dt=100;dt<89500&&r.sabotage&&r.phase==='game';dt+=200){r.players[0].lastSeen=f.time.now+dt;tick(r,f.time.now+dt);}assert.equal(r.sabotage,null,`${name}/${kind}: ${JSON.stringify(r.players.filter(p=>p.bot).map(p=>({pos:[p.x,p.y,p.floor],error:p.brain.lastError,repair:p.repair})))}`);assert.notEqual(r.result?.winner,'impostor');}});
test('servidor Node: los bots avanzan sin mensajes ni interfaz del navegador',async t=>{const f=await fixture('club',false,true),server=makeServer(f.store);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));const before=f.raw().players.filter(p=>p.bot).map(p=>({id:p.id,x:p.x,y:p.y}));const moved=()=>before.some(p=>distance(p,f.raw().players.find(q=>q.id===p.id))>10);await delay(650);for(let i=0;i<12&&!moved();i++)await delay(250);const after=f.raw();assert.ok(after.updated>f.time.now);assert.ok(moved());assert.equal(after.host,after.players.find(p=>!p.bot).id);});
test('bots: si ven a un impostor transformarse corren al botón y lo cuentan en la reunión',async()=>{const f=await fixture('club',false,true);await f.send(0,'start');let r=f.raw(),start=f.time.now;r.revealUntil=0;r.roleRevealAt=0;r.emergencyReady=0;r.teachers=[];r.sabotageReady=Infinity;
 r.players.forEach((p,i)=>{p.role=i===1?'impostor':'crew';p.specialRole=i===1?'phantom':null;});const imp=r.players[1],bot=r.players[2],spawn=WORLDS.club.FLOORS[0].spawn;
 Object.assign(bot,{...spawn,x:spawn.x+40,input:{x:0,y:0}});Object.assign(imp,{...spawn,x:spawn.x-40,input:{x:0,y:0}});imp.abilityUntil=start+12000;imp.abilityVisual={kind:'phantom-in',at:start,until:start+600};
 for(let dt=100;dt<60000&&r.phase==='game';dt+=200){r.players[0].lastSeen=start+dt;tick(r,start+dt);}
 assert.equal(r.phase,'meeting');const caller=r.players.find(q=>q.id===r.meeting.callerId);assert.ok(caller.bot&&caller.role==='crew','un testigo convoca la reunión');assert.equal(r.meeting.reason,'emergency');
 const e=regressionModule13.strongestEvidence(r,caller,imp.id);assert.equal(e?.kind,'transform');assert.match(regressionModule13.evidenceLine(e,imp.name),/transformarse/);});
test('bots: cadáver visible genera reporte, chat contextual y voto sin exponer sospechas',async()=>{const f=await fixture('club',false,true);await f.send(0,'start');let r=f.raw(),start=f.time.now;r.revealUntil=0;r.roleRevealAt=0;r.emergencyReady=0;r.players.forEach((p,i)=>{p.role=i?'crew':'impostor';p.specialRole=null;});r.config.voting=40;const bot=r.players[1],victim=r.players[2],spawn=WORLDS.club.FLOORS[0].spawn;victim.alive=false;r.bodies.push({id:'corpse',victim:victim.id,name:victim.name,...spawn,floor:0});Object.assign(bot,{...spawn,x:spawn.x+35});tick(r,start+100);assert.equal(r.phase,'meeting');assert.equal(r.meeting.reason,'body');assert.equal(r.meeting.callerId,bot.id);for(let dt=200;dt<15000&&r.meeting?.stage!=='result';dt+=200){r.players[0].lastSeen=start+dt;tick(r,start+dt);}assert.ok(r.chat.some(m=>r.players.find(p=>p.id===m.playerId)?.bot));assert.ok(r.players.filter(p=>p.bot&&p.alive).every(p=>r.meeting.votes[p.id]===undefined));command(r,r.players[0].token,'vote',{target:'skip'},start+15000,true);tick(r,start+17000);assert.ok(r.players.filter(p=>p.bot&&p.alive).every(p=>r.meeting.votes[p.id]!==undefined));const state=snapshot(r,r.players[0],start+15000);assert.ok(!JSON.stringify(state).includes('suspicions'));assert.equal(state.meeting.myVote,'skip');});
test('bots hablan en turnos de 0,5–2 segundos aunque todos tengan el mensaje listo',async()=>{const f=await fixture('club',false,true);await f.send(0,'fillBots');await f.send(0,'start');const r=f.raw(),start=f.time.now; r.revealUntil=0;r.roleRevealAt=0;r.emergencyReady=0;r.teachers=[];const caller=r.players.find(p=>!p.bot);Object.assign(caller,WORLDS.club.FLOORS[0].emergency);command(r,caller.token,'emergency',{},start,true);r.meeting.discussionEnd=start+30000;r.meeting.voteEnd=start+60000;for(const p of r.players.filter(p=>p.bot))Object.assign(p.brain,{meeting:r.meeting.id,chatAt:start,spoke:false,voteAt:start+40000});for(let dt=2500;dt<25000;dt+=100){caller.lastSeen=start+dt;tick(r,start+dt);}const messages=r.chat.filter(m=>r.players.find(p=>p.id===m.playerId)?.bot);assert.ok(messages.length>=r.players.filter(p=>p.bot&&p.alive).length);assert.equal(new Set(messages.map(m=>m.playerId)).size,r.players.filter(p=>p.bot&&p.alive).length);for(let i=1;i<messages.length;i++)assert.ok(messages[i].time-messages[i-1].time>=500,'separación mínima entre mensajes');});
test('las tareas reales y fingidas no revelan un indicador de actividad',async()=>{const {drawActorInteraction}=await import('../public/interactions.js');let draws=0;const ctx=new Proxy({},{get:()=>()=>draws++});drawActorInteraction(ctx,{alive:true,busy:true,x:50,y:50},1000,1000,false);assert.equal(draws,0);const f=await fixture('club',false,true),r=f.raw();r.players[1].puzzle={kind:'dj'};const s=snapshot(r,r.players[0],f.time.now);assert.ok(s.players.every(p=>!Object.hasOwn(p,'busy')));});
test('frases: texto canónico, selecciones validadas y canal de muertos conservado',async()=>{const f=await fixture('club',false,true);await f.send(0,'start');let r=f.raw();r.players.forEach((p,i)=>p.role=i===1?'impostor':'crew');r.revealUntil=0;r.roleRevealAt=0;r.emergencyReady=0;const host=r.players[0];Object.assign(host,WORLDS.club.FLOORS[0].emergency);command(r,host.token,'emergency',{},f.time.now,true);const target=r.players[1];f.time.now+=1000;assert.equal((await f.send(0,'chat',{quick:{kind:'where',target:'invalid'}})).status,400);let result=await f.send(0,'chat',{text:'texto manipulado',quick:{kind:'where',target:target.id}});assert.equal(result.status,200,JSON.stringify(result.body));assert.equal(result.body.state.chat.at(-1).text,`${target.name}, ¿dónde estabas?`);assert.equal(result.body.state.chat.at(-1).intent.target,target.id);f.time.now+=1000;assert.equal((await f.send(0,'chat',{quick:{kind:'alibi',place:'1:fake'}})).status,400);r=f.raw();r.players[0].alive=false;result=await f.send(0,'chat',{quick:{kind:'deny'}});assert.equal(result.status,200,JSON.stringify(result.body));assert.equal(result.body.state.chat.at(-1).ghost,true);const living=snapshot(f.raw(),f.raw().players[1],f.time.now);assert.ok(!living.chat.some(m=>m.intent?.kind==='deny'));});
test('bots interpretan preguntas, sospechas, coartadas y negación sin olvidar testigos',async()=>{const {hearStructured}=await import('../game/social.js');const f=await fixture('club',false,true),r=f.raw(),bot=r.players[1],human=r.players[0];r.phase='meeting';r.meeting={id:'social',introAt:f.time.now};bot.brain={suspicions:{},lastRoom:'Seguridad',observedRooms:{[human.id]:{place:'0:security',name:'Seguridad',at:f.time.now-1000}}};const say=(id,intent)=>hearStructured(r,bot,{id,playerId:human.id,intent});say('ask',{kind:'where',target:bot.id});assert.match(bot.brain.replies[0].text,/Seguridad/);say('claim',{kind:'accuse',target:bot.id});const suspicion=bot.brain.suspicions[bot.id];assert.ok(suspicion>0&&suspicion<=16);say('claim-repeat',{kind:'accuse',target:bot.id});assert.equal(bot.brain.suspicions[bot.id],suspicion);bot.brain.suspicions[human.id]=100;bot.brain.witness=human.id;say('deny',{kind:'deny'});assert.equal(bot.brain.suspicions[human.id],100);say('alibi',{kind:'alibi',place:'0:main'});assert.equal(bot.brain.suspicions[human.id],100);});

}

// Original regression suite: version7.test.js
{
const test=regressionModule0.default;
const assert=regressionModule1.default;
const {DatabaseSync}=regressionModule10;
const {api}=regressionModule2;
const {MemoryStore}=regressionModule4;
const {D1Store}=regressionModule11;
const {makeServer}=regressionModule5;
const {WORLDS,activeRepairs}=regressionModule12;
const {canStand,distance,lineOfSight,visionLineOfSight}=regressionModule6;
const {botsMayVote,botVote,meetingUrgency,hearStructured,socialBrain}=regressionModule13;
const {QUICK_PHRASES}=regressionModule14;
const {botAnswer}=regressionModule15;
const {challenge,solution,minDuration}=regressionModule16;
const {gymDurations}=regressionModule17;
const {setTimeout: delay}=regressionModule9;
const GYM_TASKS=Object.keys(gymDurations);
class TestD1{constructor(){this.sqlite=new DatabaseSync(':memory:');this.sqlite.exec('CREATE TABLE rooms(code TEXT PRIMARY KEY,state TEXT NOT NULL,revision INTEGER NOT NULL,updated INTEGER NOT NULL);CREATE TABLE entry_limits(id TEXT PRIMARY KEY,count INTEGER,expires INTEGER);');}prepare(sql){const stmt=this.sqlite.prepare(sql);let a=[];const q={bind(...x){a=x;return q;},async first(){return stmt.get(...a)||null;},async run(){return {meta:{changes:stmt.run(...a).changes}};},async all(){return {results:stmt.all(...a)};}};return q;}async batch(a){return Promise.all(a.map(v=>v.run()));}}
for(const mode of ['Memory','D1'])test(`salas ${mode}: privacidad en servidor, código, capacidad y limpieza con tolerancia`,async()=>{const db=mode==='D1'?new TestD1():null,store=db?new D1Store(db):new MemoryStore(),now=Date.now();try{const a=await api(store,'/api/create',{profile:{name:'Host público'},visibility:'public'},now),b=await api(store,'/api/create',{profile:{name:'Host privado'},visibility:'private'},now);assert.equal(a.status,200);assert.equal(b.status,200);assert.notEqual(a.body.session.code,b.body.session.code);const list=(await api(store,'/api/rooms',{},now)).body.rooms;assert.ok(list.some(r=>r.code===a.body.session.code));assert.ok(!list.some(r=>r.code===b.body.session.code));assert.equal((await api(store,'/api/join',{code:'ZZZZZZ',profile:{name:'Invitado'}},now)).status,404);const joined=await api(store,'/api/join',{code:b.body.session.code,profile:{name:'Invitado'}},now);assert.equal(joined.status,200);assert.equal((await api(store,'/api/room',{...b.body.session,type:'addBot'},now)).status,200);await store.cleanup(now+29000);assert.equal((await api(store,'/api/room',{...b.body.session,type:'pulse'},now+100)).status,200);await store.cleanup(now+31001);assert.equal((await api(store,'/api/room',{...b.body.session,type:'pulse'},now+31001)).status,404);if(db)assert.equal(db.sqlite.prepare('SELECT count(*) AS n FROM rooms').get().n,0);else assert.equal(store.rooms.size,0);}finally{db?.sqlite.close();}});
test('Node elimina automáticamente salas solo con bots aunque su simulación siga activa',async()=>{const store=new MemoryStore(),now=Date.now(),c=await api(store,'/api/create',{profile:{name:'Host'}},now),s=c.body.session;await api(store,'/api/room',{...s,type:'fillBots'},now);const room=store.rooms.get(s.code);room.created=now-32000;room.players[0].lastSeen=now-32000;const server=makeServer(store);try{await delay(180);assert.equal(store.rooms.has(s.code),false);}finally{server.close();}});
test('cada sabotaje tiene paneles físicos exclusivos, accesibles y correctamente limitados por planta',()=>{for(const world of Object.values(WORLDS)){const coords=new Set();for(const p of world.REPAIRS){const key=[p.floor,p.x,p.y].join('/');assert.ok(!coords.has(key),world.id+': '+key);coords.add(key);assert.ok(canStand(world.FLOORS[p.floor],p.x,p.y),p.id);assert.ok(world.FLOORS[p.floor].rooms.find(r=>r.id===p.room));}for(const floors of world.FLOORS.length===1?['0']:['both','0','1'])for(const kind of Object.keys(world.SABOTAGES)){const panels=activeRepairs({config:{map:world.id,floors},sabotage:{kind}});assert.ok(panels.length>0,world.id+'/'+kind);assert.ok(panels.every(p=>p.kind===kind&&(floors==='both'||String(p.floor)===floors)));if(kind==='emergency'){assert.equal(panels.length,2);assert.equal(new Set(panels.map(p=>p.floor+':'+p.room)).size,2);}}}});
test('gimnasio: diez tareas originales tienen soluciones verificables, tiempos y rechazo de respuestas inválidas',()=>{for(const kind of GYM_TASKS)for(let i=0;i<20;i++){const c=challenge(kind,'gym');assert.equal(!!solution(kind,c,botAnswer(kind,c)),true,kind);assert.equal(!!solution(kind,c,null),false,kind);assert.equal(!!solution(kind,c,{}),false,kind);assert.ok(minDuration[kind]>=2500);}});
test('bots esperan a los humanos vivos conectados; ni ausentes ni el último plazo bloquean la reunión',()=>{const now=Date.now(),a={id:'human1',alive:true,lastSeen:now},b={id:'human2',alive:true,lastSeen:now},bot={id:'bot',bot:true,alive:true},room={players:[a,b,bot],meeting:{stage:'voting',votes:{},discussionEnd:now-1000,voteEnd:now+20000}};assert.equal(botsMayVote(room,now),false);room.meeting.votes[a.id]='skip';assert.equal(botsMayVote(room,now),false);room.meeting.votes[b.id]='skip';assert.equal(botsMayVote(room,now),true);delete room.meeting.votes[b.id];b.lastSeen=now-4000;assert.equal(botsMayVote(room,now),true);b.lastSeen=now;assert.equal(botsMayVote(room,now+17000),true);b.alive=false;assert.equal(botsMayVote(room,now),true);room.meeting.lastClaimAt=now;assert.equal(botsMayVote(room,now+200),false);assert.equal(botsMayVote(room,now+1900),true);});
test('personalidad, memoria y urgencia gradual cambian votos sin conocer roles secretos',()=>{const human={id:'h',role:'impostor',alive:true},bot={id:'abcdef123',role:'crew',alive:true,brain:{suspicions:{h:30},seenBodies:[]}},others=Array.from({length:6},(_,i)=>({id:'o'+i,alive:true,role:'crew'})),r={players:[human,bot,...others],config:{botUrgency:1},socialHistory:[]};let seed=4;const rand=n=>{seed=(seed*1664525+1013904223)>>>0;return seed%n;},count=()=>{let n=0;for(let i=0;i<1000;i++)if(botVote(r,bot,rand)==='h')n++;return n;};const early=count(),u=meetingUrgency(r);for(const q of others.slice(0,4))q.alive=false;r.socialHistory=[{expelled:'o0',role:'crew'}];assert.ok(meetingUrgency(r)>u);const late=count();assert.ok(late>early+100,`${early}/${late}`);human.role='crew';seed=12;const v=botVote(r,bot,rand);human.role='impostor';seed=12;assert.equal(botVote(r,bot,rand),v);const old=meetingUrgency(r);r.config.botUrgency=.5;assert.ok(meetingUrgency(r)<old);assert.notEqual(socialBrain(bot).personality.trust,socialBrain({id:'otherbot'}).personality.trust);});
test('coartadas estructuradas se confirman solo con recuerdos visibles y sobreviven a otra reunión',()=>{const now=Date.now(),bot={id:'b',brain:{suspicions:{},lastPlace:'0:security',lastRoom:'Seguridad',observedRooms:{h:{place:'0:security',at:now-500,name:'Seguridad'}}}},r={phase:'meeting',meeting:{id:'one',introAt:now},players:[bot]};hearStructured(r,bot,{id:'1',playerId:'h',time:now,intent:{kind:'with',target:'b'}});assert.equal(bot.brain.replies[0].quick.kind,'defend');const trust=bot.brain.trust.h;r.meeting.id='two';hearStructured(r,bot,{id:'2',playerId:'h',time:now+1000,intent:{kind:'alibi',place:'0:main'}});assert.ok(bot.brain.trust.h<trust);assert.equal(bot.brain.memory.length,2);assert.equal(bot.brain.memory[0].meeting,'one');assert.equal(Object.keys(QUICK_PHRASES).length,26);});

}

// Original regression suite: version8.test.js
{
const test=regressionModule0.default;
const assert=regressionModule1.default;
const {createRoom,command,tick,snapshot}=regressionModule3;
const {WORLDS,canStand,move,distance,visionLineOfSight}=regressionModule6;
const {activeRepairs}=regressionModule12;
const {botRoute,botAnswer}=regressionModule15;
const {botsMayVote,botVote,criticalVote}=regressionModule13;
const {createWildlife,stepWildlife,wildlifeSnapshot}=regressionModule18;
const {placement,disembarkMs: clientMs,DISEMBARK: cD}=regressionModule19;
const {disembarkMs: serverMs,DISEMBARK: sD}=regressionModule7;
const {minDuration}=regressionModule16;
const {inPolygon}=regressionModule20;


function fixture(map='house'){const now=Date.now(),{room,player}=createRoom({name:'Humano'},now);for(let i=0;i<3;i++)command(room,player.token,'addBot',{},now);command(room,player.token,'configure',{map,tasks:6,discussion:5,voting:40},now);command(room,player.token,'start',{},now);room.players.forEach((p,i)=>{p.bot=false;p.role=i===0?'impostor':'crew';p.specialRole=null;p.lastSeen=now;});room.intro=null;room.revealUntil=0;room.roleRevealAt=0;room.emergencyReady=0;room.sabotageReady=0;return {room,now,player};}
// BETA · El Palero Gym se rediseñó: rutas alternativas (la mayoría de salas con tres o más puertas).
test('El Palero Gym: rediseño con rutas alternativas, piscina, yoga, pabellón y zonas húmedas',()=>{const w=WORLDS.gym,m=w.FLOORS[0];assert.equal(w.name,'El Palero Gym');assert.equal(m.rooms.some(r=>r.id==='direction'),false);for(const id of ['pool','yoga','lockers','showers','pavilion','reception'])assert.ok(m.rooms.find(r=>r.id===id),id);const area=id=>{const r=m.rooms.find(r=>r.id===id);return r.w*r.h;};assert.ok(area('lockers')+area('showers')>=200);assert.ok(m.rooms.length>=12);assert.ok(new Set(m.rooms.map(r=>r.w*r.h)).size>=9);assert.ok(m.rooms.some(r=>r.outline));assert.ok(m.doors.filter(d=>d.room==='reception').length>=3);assert.ok(m.rooms.filter(r=>m.doors.filter(d=>d.room===r.id).length>=3).length>=8,'rutas alternativas');});
for(const id of ['club','gym','house'])test(`${id}: rutas físicas a estaciones, paneles, conductos, cámaras y localizador; círculo cerrado de mantenimiento`,()=>{const w=WORLDS[id],m=w.FLOORS[0];for(const p of [...m.stations,...m.repair,...m.vents,w.CAMERA_CONSOLE,w.LOCATOR_CONSOLE]){assert.ok(canStand(m,p.x,p.y),p.id);assert.ok(botRoute(m,m.spawn,p,80).length||distance(m.spawn,p)<=80,p.id);}for(const g of w.VENT_GROUPS){assert.equal(g.length,3);assert.ok(w.VENTS.filter(v=>g.includes(v.id)).every(v=>v.links.every(id=>g.includes(id))));}const emergency={...m.emergency,id:'emergency',ignoreFurniture:true};assert.ok(botRoute(m,m.spawn,emergency,150).length||distance(m.spawn,emergency)<=150);assert.equal(w.roomAt(m.spawn.x,m.spawn.y),w.emergencyRoom);});
test('mascotas de Latasa´s House: gato y perro autoritativos, caminan sin atravesar paredes ni muebles',()=>{const r={config:{map:'house'},phase:'game',revealUntil:0};r.wildlife=createWildlife(r,1000);assert.deepEqual(new Set(r.wildlife.map(a=>a.species)),new Set(['cat','dog']));assert.ok(r.wildlife.length>=2);const initial=structuredClone(r.wildlife);for(let i=0;i<500;i++){stepWildlife(r,1000+i*100,.1);for(const a of r.wildlife)assert.ok(canStand(WORLDS.house.FLOORS[0],a.x,a.y));}assert.ok(r.wildlife.every((a,i)=>distance(a,initial[i])>5));const a=wildlifeSnapshot(r,60000),b=wildlifeSnapshot(JSON.parse(JSON.stringify(r)),60000);assert.deepEqual(a,b);assert.ok(!JSON.stringify(a).includes('seed'));assert.ok(!JSON.stringify(a).includes('goal'));r.phase='meeting';assert.deepEqual(wildlifeSnapshot(r),[]);});
test('votos: ambos bandos esperan a todos los humanos hasta el umbral exacto de diez segundos',()=>{const now=100000,h={id:'h',alive:true,lastSeen:now},h2={id:'h2',alive:true,lastSeen:now},b={id:'b',bot:true,alive:true},r={players:[h,h2,b],meeting:{stage:'voting',votes:{},voteEnd:now+10001}};assert.equal(botsMayVote(r,now),false);assert.equal(botsMayVote(r,now+1),true);r.meeting.voteEnd=now+40000;r.meeting.votes.h='skip';assert.equal(botsMayVote(r,now),false);r.meeting.votes.h2='b';assert.equal(botsMayVote(r,now),true);delete r.meeting.votes.h2;h2.lastSeen=now-4000;assert.equal(botsMayVote(r,now),true);h.alive=false;assert.equal(botsMayVote(r,now),true);});
for(const [living,impostors] of [[3,1],[5,2]])test(`situación crítica ${living}/${impostors}: tripulante vota a alguien sin leer roles ajenos`,()=>{const bot={id:'bot',alive:true,role:'crew',brain:{suspicions:{},seenBodies:[]}},players=[bot,...Array.from({length:living-1},(_,i)=>({id:'p'+i,alive:true,get role(){throw Error('Lectura de rol privado');}}))],r={players,config:{impostors},socialHistory:[]};assert.ok(criticalVote(r));const targets=new Set();for(let i=0;i<100;i++){const id=botVote(r,bot,n=>(i*11117)%n);assert.notEqual(id,'skip');targets.add(id);}assert.ok(targets.size>1);});
test('servidor rechaza votos prematuros de bots y omisiones en situación crítica',()=>{const {room:r,now}=fixture(),p=r.players[1];p.bot=true;r.players[3].alive=false;r.phase='meeting';r.meeting={stage:'voting',votes:{},voteEnd:now+40000};assert.throws(()=>command(r,p.token,'vote',{target:'skip'},now,true),/Espera los votos/);r.meeting.voteEnd=now+10000;assert.throws(()=>command(r,p.token,'vote',{target:'skip'},now,true),/situación crítica/);command(r,p.token,'vote',{target:r.players[0].id},now,true);assert.throws(()=>command(r,p.token,'vote',{target:r.players[0].id},now,true),/Ya has votado/);});
for(const map of ['club','gym','house'])test(`${map}: todos los sabotajes usan paneles distintos y reparación real validada`,()=>{for(const kind of Object.keys(WORLDS[map].SABOTAGES)){const {room:r,now}=fixture(map),imp=r.players[0],crew=r.players.slice(1);command(r,imp.token,'sabotage',{kind},now,true);const panels=activeRepairs(r);assert.ok(panels.length);for(const [i,panel] of panels.entries()){const p=crew[i%crew.length];Object.assign(p,panel,{transition:null});const result=command(r,p.token,'beginRepair',{id:panel.id},now+100,true);const puzzle=p.repair;assert.ok(puzzle,result);const finishAt=now+100+minDuration[puzzle.kind]+500;p.repair.start=finishAt-minDuration[puzzle.kind]-10;command(r,p.token,'finishRepair',{id:panel.id,solution:botAnswer(puzzle.kind,puzzle.challenge)},finishAt,true);}assert.equal(r.sabotage,null,kind);}});
test('Latasa´s House: un bot completa sus tareas; investigación y mascotas no impiden victoria por tareas',()=>{const {room:r,now}=fixture();r.players[1].bot=true;r.players[1].brain={suspicions:{},seenBodies:[],path:[]};for(const p of r.players.slice(2))p.tasks.forEach(t=>t.done=true);for(let time=100;time<600000&&r.phase!=='ended';time+=200){r.players.filter(p=>!p.bot).forEach(p=>p.lastSeen=now+time);tick(r,now+time);}assert.equal(r.phase,'ended',JSON.stringify(r.players[1].brain));assert.equal(r.result.winner,'crew');});
test('bajada de la caravana: cliente y servidor comparten la misma duración y todos acaban en fila',()=>{assert.deepEqual(cD,sD);for(let n=1;n<=10;n++){assert.equal(clientMs(n),serverMs(n));assert.ok(serverMs(n)<=5400,'no debe alargar la espera');const end=serverMs(n);const xs=[];for(let i=0;i<n;i++){const p=placement(i,n,end);assert.ok(p.visible&&p.arrived,'jugador '+i);assert.ok(p.x>=60&&p.x<=1220,'dentro del encuadre');xs.push(Math.round(p.x));}assert.equal(new Set(xs).size,n,'sin solapes');}});

test('aparición de diez personas: todas las posiciones iniciales son transitables en cada mapa',()=>{for(const map of Object.keys(WORLDS)){const now=Date.now(),{room:r,player}=createRoom({name:'Host'},now);command(r,player.token,'fillBots',{},now);command(r,player.token,'configure',{map},now);command(r,player.token,'start',{},now);for(const p of r.players)assert.ok(canStand(WORLDS[map].FLOORS[p.floor],p.x,p.y),map+':'+p.name);}});

}

// Original regression suite: version13.test.js
{
const test=regressionModule0.default;
const assert=regressionModule1.default;
const {makeServer}=regressionModule5;
const {tableRealtime}=regressionModule3;
const {disembarkMs,SHHH_MS,advanceIntro}=regressionModule7;
const {shhhLayout}=regressionModule19;
const {sabotageArrowSpots}=regressionModule21;
const {api}=regressionModule2;
const {MemoryStore}=regressionModule4;
const {LOBBY_OBJECTS}=regressionModule22;
const {signProgress}=regressionModule2;
const {NAME_BGS,NAME_COLORS,NAME_REWARDS,REWARDS,allowed,lockAppearance,rewardFor,nameLook,nameHtml,contrast,withClaim,LEVEL_XP}=regressionModule23;
const {snapshot}=regressionModule3;




async function fixture(n=5){const store=new MemoryStore(),clock={now:Date.now()},ss=[];const f=await api(store,'/api/create',{profile:{name:'Fer',color:0}},clock.now);ss.push(f.body.session);for(let i=1;i<n;i++)ss.push((await api(store,'/api/join',{code:ss[0].code,profile:{name:'J'+i,color:i}},clock.now)).body.session);
 const raw=()=>store.rooms.get(ss[0].code),send=(i,type,data={})=>api(store,'/api/room',{...ss[i],type,data},clock.now),advance=ms=>{clock.now+=ms;raw().players.forEach(p=>p.lastSeen=clock.now);};
 const goto=id=>{const o=LOBBY_OBJECTS.find(o=>o.id===id);return i=>Object.assign(raw().players[i],{x:o.x,y:o.y,input:{x:0,y:0},moveAt:clock.now});};
 return {raw,send,advance,goto,clock};}
const view=async(f,i)=>(await f.send(i,'pulse')).body.state.table;

test('mesas: dos parejas juegan a los dardos a la vez en la misma mesa sin interferirse',async()=>{const f=await fixture(5),at=f.goto('table-darts');for(let i=0;i<4;i++)at(i);
 assert.equal((await f.send(0,'tableJoin',{game:'darts'})).status,200);assert.equal((await view(f,0)).phase,'waiting');
 await f.send(1,'tableJoin',{game:'darts'});await f.send(2,'tableJoin',{game:'darts'});assert.equal((await view(f,2)).phase,'waiting');await f.send(3,'tableJoin',{game:'darts'});
 const v=[0,1,2,3].map(i=>view(f,i));const t=await Promise.all(v);assert.ok(t.every(x=>x.phase==='playing'));assert.equal(t[0].id,t[1].id);assert.equal(t[2].id,t[3].id);assert.notEqual(t[0].id,t[2].id);
 assert.deepEqual(t.map(x=>x.seat),[0,1,0,1]);
 f.advance(1600);await f.send(0,'tableInput',{});f.advance(300);const a=await view(f,1),b=await view(f,3);assert.equal(a.view.stage,'x','la pareja A fija la altura');assert.equal(b.view.stage,'y','la pareja B no se entera');
 await f.send(1,'tableInput',{});assert.equal((await view(f,0)).view.stage,'x','el rival no puede lanzar fuera de su turno');
 const stats=(await f.send(4,'pulse')).body.state.tableStats;assert.equal(stats.darts.playing,4);});
test('dardos: puntuación de diana real, oscilación determinista y ventana de validación del servidor',async()=>{const {dartScore,dartOsc,DARTS}=await import('../game/tables.js');
 assert.equal(dartScore(0,0).points,50);assert.equal(dartScore(0,.1).points,25);assert.equal(dartScore(0,-.75).points,20);assert.equal(dartScore(0,-.56).points,60);assert.equal(dartScore(0,-.95).points,40);assert.equal(dartScore(0,1.2).points,0);assert.equal(dartScore(.75,0).points,6);assert.equal(dartScore(0,.75).points,3);
 assert.equal(dartOsc(1000,1000,1600),-1);assert.equal(dartOsc(1800,1000,1600),1);assert.equal(dartOsc(1400,1000,1600),0);assert.equal(DARTS.window,250);});

test('mesas: abandonar deja al rival esperando de nuevo y el siguiente jugador ocupa su sitio',async()=>{const f=await fixture(4),at=f.goto('table-ttt');for(let i=0;i<3;i++)at(i);
 await f.send(0,'tableJoin',{game:'ttt'});await f.send(1,'tableJoin',{game:'ttt'});assert.equal((await view(f,0)).phase,'playing');
 await f.send(1,'tableLeave');const w=await view(f,0);assert.equal(w.phase,'waiting');assert.equal(await view(f,1),null);
 await f.send(2,'tableJoin',{game:'ttt'});assert.equal((await view(f,0)).phase,'playing');
 // desconexión por inactividad
 f.advance(1000);f.raw().players[2].lastSeen=f.clock.now-20000;const g=await view(f,0);assert.equal(g.phase,'waiting');assert.equal(g.players.length,1);});

test('mesas: tres en raya, turnos y victoria',async()=>{const f=await fixture(3),at=f.goto('table-ttt');at(0);at(1);await f.send(0,'tableJoin',{game:'ttt'});await f.send(1,'tableJoin',{game:'ttt'});
 let t=await view(f,0);const first=t.view.turn,order=[first,1-first];const seatToIdx={0:0,1:1};const who=seat=>t.seat===seat?0:1;
 const play=async(seat,cell)=>{const i=who(seat);return f.send(i,'tableInput',{cell});};
 // el jugador de turno juega 0,1,2 y el otro 3,4
 const cells=[0,3,1,4,2];for(let k=0;k<cells.length;k++){t=await view(f,0);if(t.phase!=='playing')break;await play(t.view.turn,cells[k]);}
 t=await view(f,0);assert.equal(t.phase,'over');assert.equal(t.view.winner,first);assert.deepEqual(t.view.line,[0,1,2]);
 await f.send(0,'tableAgain');assert.equal((await view(f,0)).phase,'over');await f.send(1,'tableAgain');assert.equal((await view(f,0)).phase,'playing');});

test('mesas: memoria y secuencia son de dos; se espera rival o se juega contra un bot',async()=>{const f=await fixture(3),a=f.goto('table-memory'),b=f.goto('table-simon');a(0);b(1);
 await f.send(0,'tableJoin',{game:'memory'});await f.send(1,'tableJoin',{game:'simon'});assert.equal((await view(f,0)).phase,'waiting');assert.equal((await view(f,1)).phase,'waiting');
 assert.equal((await f.send(0,'tableBot',{level:'imposible'})).status,400);
 await f.send(0,'tableBot',{level:'hard'});await f.send(1,'tableBot',{level:'easy'});const m=await view(f,0),s=await view(f,1);assert.equal(m.phase,'playing');assert.equal(s.phase,'playing');assert.equal(m.players.length,2);assert.equal(m.players[1].bot,'hard');assert.equal(m.view.faces.filter(Boolean).length,0);assert.equal(m.view.turn,0);
 assert.ok(s.view.two);await f.send(0,'tableInput',{card:0});assert.equal((await view(f,0)).view.faces.filter(Boolean).length,1);
 // El bot juega en el servidor hasta acabar la partida de memoria.
 for(let k=0;k<400&&(await view(f,0)).phase==='playing';k++){const v=(await view(f,0)).view;if(v.turn===0&&!v.hiding){const free=v.faces.map((x,i)=>x?-1:i).filter(i=>i>=0);await f.send(0,'tableInput',{card:free[0]});}f.advance(400);}
 const end=await view(f,0);assert.equal(end.phase,'over');assert.equal(end.view.scores[0]+end.view.scores[1],8);});
test('mesas: la revancha alterna quién empieza (tres en raya)',async()=>{const f=await fixture(3),at=f.goto('table-ttt');at(0);at(1);await f.send(0,'tableJoin',{game:'ttt'});await f.send(1,'tableJoin',{game:'ttt'});
 let t=await view(f,0);assert.equal(t.view.turn,0);const seatOf=i=>f.raw().tables.list[0].players.find(q=>q.id===f.raw().players[i].id).seat,idx=seat=>seatOf(0)===seat?0:1;
 for(const c of [0,3,1,4,2]){t=await view(f,0);if(t.phase!=='playing')break;await f.send(idx(t.view.turn),'tableInput',{cell:c});}
 assert.equal((await view(f,0)).phase,'over');await f.send(0,'tableAgain');await f.send(1,'tableAgain');t=await view(f,0);assert.equal(t.phase,'playing');assert.equal(t.view.turn,1);});
test('mesas: secuencia a dos, quien falla pierde y el bot respeta el tiempo',async()=>{const f=await fixture(3),b=f.goto('table-simon');b(0);await f.send(0,'tableJoin',{game:'simon'});await f.send(0,'tableBot',{level:'hard'});
 f.advance(5000);let v=(await view(f,0)).view;assert.equal(v.phase,'input');const st=f.raw().tables.list[0].state;await f.send(0,'tableInput',{color:(st.seq[0]+1)%4});const end=await view(f,0);assert.equal(end.phase,'over');assert.equal(end.winner,1);});
const {FB:FBX}=await import('../public/football.js');
test('mesas: fútbol de fichas abierto a todos, equipos alternos, chute desde la posición y gol',async()=>{const f=await fixture(4),at=f.goto('table-football');for(let i=0;i<3;i++)at(i);
 for(let i=0;i<3;i++)await f.send(i,'tableJoin',{game:'football'});const v=await view(f,0);assert.equal(v.phase,'playing');assert.equal(v.view.pl.length,3);assert.deepEqual(v.view.pl.map(q=>q.team),[0,1,0],'azul, rojo, azul');
 const s=f.raw().tables.list.find(x=>x.game==='football');assert.equal(f.raw().tables.list.filter(x=>x.game==='football').length,1,'una sola partida compartida');
 const S=()=>f.raw().tables.list.find(x=>x.game==='football').state,id=f.raw().players[0].id,setup=(ball,me)=>{const st=S();Object.assign(st.ball,{vx:0,vy:0,...ball});Object.assign(st.pl[id],{kickReady:0,...me});st.pauseUntil=0;st.last=f.clock.now;};f.advance(1000);await view(f,0);
 // Ficha a la izquierda del balón, alineada: el chute sale hacia la derecha.
 setup({x:300,y:170},{x:280,y:170});await f.send(0,'tableInput',{kick:1});let b=S().ball;assert.ok(b.vx>300&&Math.abs(b.vy)<30,'sale en la dirección ficha→balón');
 // Desde abajo a la izquierda: sale en diagonal hacia arriba a la derecha.
 setup({x:300,y:170},{x:286,y:184});await f.send(0,'tableInput',{kick:1});b=S().ball;assert.ok(b.vx>0&&b.vy<0);
 // Sin chutar: al ir contra el balón se lo lleva pegado (conducción).
 setup({x:300,y:170},{x:278,y:170,ix:1,iy:0,vx:FBX.speed,vy:0});await f.send(0,'tableInput',{x:1,y:0});for(let k=0;k<20;k++){f.advance(33);await view(f,0);}{const st=S(),q=st.pl[id];assert.ok(st.ball.x>q.x&&st.ball.x-q.x<FBX.pr+FBX.br+24,'el balón va delante de la ficha');assert.ok(st.ball.x>360,'avanza con ella');}
 await f.send(0,'tableInput',{x:0,y:0});
 // Lejos del balón no chuta.
 setup({x:300,y:170},{x:100,y:100});await f.send(0,'tableInput',{kick:1});assert.equal(S().ball.vx,0);
 // Gol del azul en la portería derecha.
 setup({x:595,y:170,vx:500},{x:100,y:100});f.advance(200);await view(f,0);assert.equal(S().score[0],1,'gol azul');
 // 16.5 · Las fichas chocan entre ellas y el balón nunca se queda encajado en una esquina.
 {const st=S(),o=st.pl[f.raw().players[1].id];Object.assign(st.pl[id],{x:200,y:60,ix:1,iy:0,vx:FBX.speed,vy:0});Object.assign(o,{x:240,y:60,ix:-1,iy:0,vx:-FBX.speed,vy:0});st.pauseUntil=0;st.last=f.clock.now;Object.assign(st.ball,{x:500,y:300,vx:0,vy:0});
  for(let k=0;k<10;k++){f.advance(33);await view(f,0);}const a=S().pl[id],c=S().pl[o.id];assert.ok(Math.hypot(a.x-c.x,a.y-c.y)>=FBX.pr*2-.5,'las fichas no se atraviesan');}
 {const st=S();for(const q of Object.values(st.pl))Object.assign(q,{x:300,y:300,ix:0,iy:0,vx:0,vy:0});st.pl[id].x=150;Object.assign(st.ball,{x:FBX.br+1,y:FBX.br+1,vx:-40,vy:-40});st.last=f.clock.now;for(let k=0;k<15;k++){f.advance(33);await view(f,0);}const b2=S().ball;assert.ok(b2.x>20&&b2.y>20,'sale de la esquina');}
 await f.send(1,'tableLeave');assert.equal((await view(f,0)).view.pl.length,2,'salir no para el partido');});
test('mesas: boxeo por equipos — sparring si estás solo, golpe, defensa, ulti al otro extremo y KO con +25 % de vida para todos',async()=>{const f=await fixture(4),at=f.goto('table-boxing');at(0);at(1);
 await f.send(0,'tableJoin',{game:'boxing'});let v=await view(f,0);assert.equal(v.view.pl.length,2);assert.ok(v.view.pl.some(q=>q.bot&&q.team===1),'solo: sparring en el otro equipo');
 await f.send(1,'tableJoin',{game:'boxing'});v=await view(f,0);assert.equal(v.view.pl.length,2);assert.ok(!v.view.pl.some(q=>q.bot),'con rival humano se va el sparring');assert.deepEqual(v.view.pl.map(q=>q.team).sort(),[0,1]);
 const S=()=>f.raw().tables.list.find(x=>x.game==='boxing').state,a=f.raw().players[0].id,b=f.raw().players[1].id;
 const set=()=>{const st=S();Object.assign(st.pl[a],{x:200,y:120,vx:0,vy:0,ix:0,iy:0,face:1,hp:100,ult:0,atkReady:0,stunUntil:0,inv:0,block:false,fly:0});Object.assign(st.pl[b],{x:230,y:120,vx:0,vy:0,ix:0,iy:0,face:-1,hp:100,ult:0,atkReady:0,stunUntil:0,inv:0,block:false,fly:0});st.last=f.clock.now;};
 f.advance(2000);await view(f,0);set();await f.send(0,'tableInput',{atk:1});assert.equal(S().pl[b].hp,92,'golpe = 8');assert.ok(S().pl[a].ult>0,'el golpe carga la ulti');
 set();await f.send(1,'tableInput',{block:true});await f.send(0,'tableInput',{atk:1});assert.ok(S().pl[b].hp>97,'defendido de frente casi no duele');
 set();S().pl[a].ult=100;await f.send(0,'tableInput',{ult:1});assert.equal(S().pl[b].hp,82);assert.ok(S().pl[b].fly===1);for(let k=0;k<30;k++){f.advance(33);await view(f,0);}assert.ok(S().pl[b].x>560,'la ulti lo manda a la otra punta');
 set();const st=S();st.pl[b].hp=5;st.pl[a].hp=60;await f.send(0,'tableInput',{atk:1});assert.equal(S().score[0],1,'el equipo del atacante suma un punto');assert.equal(S().pl[b].hp,100,'el KO reaparece');assert.equal(S().pl[a].hp,85,'todos ganan 25 %');
});
test('mesas: carrera con pulsaciones por lotes limitadas por el servidor',async()=>{const f=await fixture(3),at=f.goto('table-race');at(0);at(1);await f.send(0,'tableJoin',{game:'race'});await f.send(1,'tableJoin',{game:'race'});
 f.advance(500);await f.send(0,'tableInput',{n:6});assert.equal((await view(f,0)).view.pos[0],0);f.advance(3500);await f.send(0,'tableInput',{n:6});const p=(await view(f,0)).view.pos[0];assert.ok(p>=1&&p<=6);
 f.advance(1000);await f.send(0,'tableInput',{n:6});f.advance(1000);await f.send(0,'tableInput',{n:6});assert.ok((await view(f,0)).view.pos[0]<=40);});

test('mesas: lejos de la mesa se rechaza y al empezar la partida principal se cierran todas las sesiones',async()=>{const f=await fixture(4),at=f.goto('table-reflex');at(1);at(2);
 Object.assign(f.raw().players[0],{x:50,y:50});assert.equal((await f.send(0,'tableJoin',{game:'reflex'})).status,400);
 await f.send(1,'tableJoin',{game:'reflex'});await f.send(2,'tableJoin',{game:'reflex'});assert.equal((await view(f,1)).phase,'playing');
 assert.equal((await f.send(0,'start')).status,200);const r=f.raw();assert.equal(r.tables,null);const s=(await f.send(1,'pulse')).body.state;assert.equal(s.table??null,null);assert.equal(s.tableStats??null,null);
 assert.equal((await f.send(1,'tableJoin',{game:'reflex'})).status,400);});

// ---------------------------------------------------------------- estilos de nombre




test('nombre: reparto en los 50 niveles sin quitar ninguna recompensa anterior y con contraste legible',()=>{
 assert.equal(REWARDS.length,50);assert.ok(REWARDS.every((r,i)=>r.level===i+1));
 const seen=new Set();for(const r of NAME_REWARDS){assert.ok(r.level>=1&&r.level<=50);const k=r.field+r.value;assert.ok(!seen.has(k));seen.add(k);assert.equal(rewardFor(r.field,r.value).level,r.level);}
 assert.equal(NAME_REWARDS.filter(r=>r.field==='nameBg').length,NAME_BGS.length-2);assert.equal(NAME_REWARDS.filter(r=>r.field==='nameColor').length,NAME_COLORS.length-3);
 assert.ok(new Set(NAME_REWARDS.map(r=>r.level)).size>=25,'repartidas por todo el pase');assert.equal(Math.max(...NAME_REWARDS.map(r=>r.level)),50);
 for(let b=0;b<NAME_BGS.length;b++)for(let c=0;c<NAME_COLORS.length;c++){const L=nameLook(b,c),bgs=L.bg.a||['#142831'];assert.deepEqual(L.text,NAME_COLORS[c].a,`letras independientes ${b}/${c}`);if(L.low)assert.ok(L.text.every(t=>contrast(L.ink,t)>=3),`contorno legible ${b}/${c}`);}
 assert.ok(nameHtml('Ana',11,12).includes('nm-bg'));assert.ok(!nameHtml('Ana',0,0).includes('nm-bg'));});

test('nombre: bloqueado hasta recoger el nivel, guardado en el servidor y visible para todos (también en clones)',async()=>{
 const reward=NAME_REWARDS.find(r=>r.field==='nameBg'&&r.value===11),colorReward=NAME_REWARDS.find(r=>r.field==='nameColor'&&r.value===12);
 assert.equal(allowed('nameBg',11,{claimed:0}),false);assert.equal(lockAppearance({nameBg:11,nameColor:12},{claimed:0}).nameBg,0);assert.equal(allowed('nameBg',1,{claimed:0}),true);
 const store=new MemoryStore();let claimed=withClaim(withClaim(0,reward.level),colorReward.level);
 const pass=await signProgress(store,{xp:50*LEVEL_XP,claimed});
 const none=await api(store,'/api/create',{profile:{name:'Sin',nameBg:11,nameColor:12}});assert.equal(none.body.state.roster[0].nameBg,0);assert.equal(none.body.state.roster[0].nameColor,0);
 const a=await api(store,'/api/create',{profile:{name:'Ana',nameBg:11,nameColor:12,pass}});assert.equal(a.body.state.roster[0].nameBg,11);assert.equal(a.body.state.roster[0].nameColor,12);
 const code=a.body.session.code,b=await api(store,'/api/join',{code,profile:{name:'Bea'}});
 const seen=(await api(store,'/api/room',{...b.body.session,type:'pulse'})).body.state;const ana=seen.roster.find(p=>p.name==='Ana');assert.equal(ana.nameBg,11);assert.equal(ana.nameColor,12);assert.equal(seen.players.find(p=>p.name==='Ana').nameBg,11);
 // cambiar el estilo desde la sala: permitido solo si está desbloqueado
 await api(store,'/api/room',{...b.body.session,type:'profile',data:{name:'Bea',nameBg:11}});assert.equal((await api(store,'/api/room',{...b.body.session,type:'pulse'})).body.state.roster.find(p=>p.name==='Bea').nameBg,0);
 assert.equal((await api(store,'/api/room',{...a.body.session,type:'profile',data:{name:'Ana',nameBg:2,nameColor:0,pass}})).status,200);
 // clones: copian nombre y estilo sin sufijo
 const raw=store.rooms.get(code),p=raw.players.find(p=>p.name==='Ana');Object.assign(p,{nameBg:11,nameColor:12});
 const {appearanceOf}=await import('../public/content.js');const clone=appearanceOf(p);assert.equal(clone.name,'Ana');assert.equal(clone.nameBg,11);assert.equal(clone.nameColor,12);});

// Versión 14: canal en tiempo real de las mesas, presentación SHHH, flechas
// de sabotaje y tiempos de la llegada.

async function lobby(n=2){const store=new MemoryStore({secret:'x'.repeat(40)}),ss=[];const now=Date.now();ss.push((await api(store,'/api/create',{profile:{name:'Ana',color:0}},now)).body.session);for(let i=1;i<n;i++)ss.push((await api(store,'/api/join',{code:ss[0].code,profile:{name:'P'+i,color:i}},now)).body.session);
 const o=LOBBY_OBJECTS.find(o=>o.id==='table-darts');await store.transact(ss[0].code,room=>{for(const p of room.players)Object.assign(p,{x:o.x,y:o.y,input:{x:0,y:0}});return null;});return {store,ss};}

test('mesas en tiempo real: dos personas emparejadas reciben la vista y el dardo se lanza por el canal ligero',async()=>{
 const {store,ss}=await lobby(2),code=ss[0].code;const {dartScore,dartOsc,DARTS}=await import('../game/tables.js');
 for(const s of ss)assert.equal((await api(store,'/api/room',{...s,type:'tableJoin',data:{game:'darts'}})).status,200);
 const t0=Date.now();let views=await store.transact(code,room=>ss.map(s=>tableRealtime(room,s.token,null,t0)));
 assert.equal(views[0].phase,'playing');assert.equal(views[1].phase,'playing');assert.notEqual(views[0].seat,views[1].seat);
 const shooter=views.findIndex(v=>v.seat===v.view.turn),start=views[0].view.aimStart;
 const yAt=start+400;await store.transact(code,room=>tableRealtime(room,ss[shooter].token,{t:yAt},yAt+30));
 let mid=await store.transact(code,room=>tableRealtime(room,ss[shooter].token,null,yAt+60));assert.equal(mid.view.stage,'x');assert.equal(mid.view.ay,Math.round(dartOsc(yAt,start,DARTS.py)*1000)/1000,'altura según el instante validado');
 const xStart=mid.view.aimStart,xAt=xStart+300;await store.transact(code,room=>tableRealtime(room,ss[shooter].token,{t:xAt},xAt+20));
 const after=await store.transact(code,room=>tableRealtime(room,ss[shooter].token,null,xAt+40));const hit=after.view.throws[after.seat][0];
 assert.ok(hit,'el dardo queda clavado');assert.equal(hit.points,dartScore(hit.x,hit.y).points);assert.equal(after.view.scores[after.seat],hit.points);
 await assert.rejects(()=>store.transact(code,room=>tableRealtime(room,'token-falso-123',null,Date.now())));
});

test('WebSocket de mesas: handshake RFC 6455, rechazo sin sesión y vista empujada',async()=>{
 const store=new MemoryStore({secret:'y'.repeat(40)}),server=makeServer(store);await new Promise(r=>server.listen(0,r));const port=server.address().port;
 try{const created=(await api(store,'/api/create',{profile:{name:'Ana',color:0}},Date.now())).body.session;
  const bad=await new Promise(res=>{const ws=new WebSocket(`ws://127.0.0.1:${port}/api/table-ws?code=${created.code}&token=nopenopenope`);ws.onopen=()=>res('open');ws.onerror=()=>res('error');ws.onclose=()=>res('closed');});
  assert.notEqual(bad,'open');
  const msg=await new Promise((res,rej)=>{const ws=new WebSocket(`ws://127.0.0.1:${port}/api/table-ws?code=${created.code}&token=${created.token}`);const t=setTimeout(()=>rej(new Error('sin mensaje')),3000);ws.onmessage=e=>{clearTimeout(t);ws.close();res(JSON.parse(e.data));};ws.onerror=()=>rej(new Error('error de socket'));});
  assert.equal(msg.t,'view');assert.equal(msg.view,null);
 }finally{server.close();}
});

test('llegada: la bajada de la caravana y la pausa SHHH van antes de revelar el rol',()=>{
 const now=1e6,room={phase:'game',players:[{id:'a',bot:false,introProtocol:1,lastSeen:now,arrivalReady:true,skippedTravel:true},{id:'b',bot:true}],intro:{stage:'travel',travelEnd:now-1},travelUntil:now};
 advanceIntro(room,now);assert.equal(room.intro.stage,'neutral');assert.equal(room.intro.neutralEnd-room.intro.neutralAt,disembarkMs(2)+SHHH_MS);
 advanceIntro(room,now+disembarkMs(2)+SHHH_MS-1);assert.equal(room.intro.stage,'neutral');advanceIntro(room,now+disembarkMs(2)+SHHH_MS);assert.equal(room.intro.stage,'reveal');
});

test('SHHH: hasta diez personajes de pie sin solaparse entre sí ni con el texto, en vertical y horizontal',()=>{
 for(const [w,h] of [[390,664],[585,996],[750,342],[1366,768],[1920,1080],[320,568]])for(let n=1;n<=10;n++){const L=shhhLayout(n,w,h),s=L.scale;
  const boxes=L.spots.map(p=>({l:p.x-30*s,r:p.x+30*s,t:p.y-110*s,b:p.y+34*s}));
  for(const b of boxes){assert.ok(b.t>=L.subY+L.S*.5-1,`personaje bajo el texto (${w}x${h}, n=${n})`);assert.ok(b.l>=0&&b.r<=w&&b.b<=h+1,`dentro de pantalla (${w}x${h}, n=${n})`);}
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];assert.ok(a.r<=b.l||b.r<=a.l||a.b<=b.t||b.b<=a.t,`sin solapes (${w}x${h}, n=${n})`);}}
});

test('flechas de sabotaje: siempre dentro del marco libre y fuera del centro',()=>{
 const state={phase:'game',config:{map:'house',floors:'0'},me:{floor:0,alive:true},sabotage:{kind:'electrical',fixed:[],id:'s'}};
 const limits={top:90,bottom:560,left:26,right:364,boxes:[]};
 for(const [x,y] of [[300,300],[2000,900],[3500,2600],[100,2600]]){const spots=sabotageArrowSpots(state,{x,y},{x,y,scale:.7},390,664,limits);
  for(const s of spots){assert.ok(s.x>=limits.left-1&&s.x<=limits.right+1&&s.y>=limits.top-1&&s.y<=limits.bottom+1);if(!s.near)assert.ok(Math.hypot(s.x-195,s.y-332)>120,'no tapa al personaje');}}
});

test('arranque real: `node server/node.js` levanta el servidor sin errores (como en el alojamiento)',async()=>{
 const {spawn}=await import('node:child_process');const port=3400+Math.floor(Math.random()*400);
 const child=spawn(process.execPath,['server/node.js'],{env:{...process.env,PORT:String(port),DATA_DIR:(await import('node:fs')).mkdtempSync((await import('node:path')).join((await import('node:os')).tmpdir(),'pucela-data-'))},stdio:['ignore','pipe','pipe']});let err='';child.stderr.on('data',d=>err+=d);
 try{let ok=false;for(let i=0;i<40&&!ok;i++){await new Promise(r=>setTimeout(r,100));try{ok=(await fetch(`http://127.0.0.1:${port}/api/health`)).ok;}catch{}}assert.ok(ok,'el servidor no respondió: '+err);}finally{child.kill();}
});

}

// Original regression suite: version14_1.test.js
{
const test=regressionModule0.default;
const assert=regressionModule1.default;
const {gunzipSync}=regressionModule24;
const {createRoom,command,tick,snapshot,BOT_STEP_MS}=regressionModule3;
const {api}=regressionModule2;
const {MemoryStore}=regressionModule4;
const {makeServer}=regressionModule5;
const {recordRemoteSample,remoteAt,REMOTE_DELAY_MS}=regressionModule25;
const {LOBBY}=regressionModule6;
// Pruebas de la entrega 14.1: rendimiento del servidor, red e interpolación.










test('bots: la simulación avanza en pasos fijos de 100 ms aunque lleguen muchas peticiones',()=>{
 const t0=1_000_000,{room,player}=createRoom({name:'Host'},t0);for(let i=0;i<3;i++)command(room,player.token,'addBot',{},t0);
 const bot=room.players.find(p=>p.bot);const times=new Set();
 // Diez peticiones irregulares en 1 s: antes cada una ejecutaba un fotograma de IA extra.
 let frames=0;const original=room.players.length;
 for(const at of [13,40,95,130,160,233,300,377,512,1000]){tick(room,t0+at);times.add(bot.moveAt);for(const p of room.players)if(!p.bot)p.lastSeen=t0+at;}
 assert.equal(room.players.length,original);
 for(const t of times)assert.equal((t-t0)%BOT_STEP_MS,0,`marca de tiempo irregular ${t-t0}`);
 assert.ok(room.simulatedAt<=t0+1000&&t0+1000-room.simulatedAt<BOT_STEP_MS);
});

test('MemoryStore.mutate: el pulso no copia la sala y las acciones siguen siendo transaccionales',async()=>{
 const store=new MemoryStore({secret:'x'.repeat(40)}),now=Date.now();const c=await api(store,'/api/create',{profile:{name:'Host'}},now);const s=c.body.session;
 const before=store.rooms.get(s.code);const r=await api(store,'/api/room',{...s,type:'pulse',data:{x:0,y:0}},now+50);assert.equal(r.status,200);
 assert.equal(store.rooms.get(s.code),before,'el pulso modifica la misma sala sin clonarla');
 const bad=await api(store,'/api/room',{...s,type:'start'},now+60);assert.equal(bad.status,400);
 assert.equal(store.rooms.get(s.code).phase,'lobby');
});

test('HTTP: JSON y estáticos comprimidos, ETag con 304, keep-alive largo e IP real tras el proxy',async()=>{
 const server=makeServer(new MemoryStore({secret:'y'.repeat(40)}));await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  assert.ok(server.keepAliveTimeout>=60000&&server.headersTimeout>server.keepAliveTimeout);
  const http=await import('node:http');
  const raw=(path,headers={},method='GET',body=null)=>new Promise((res,rej)=>{const req=http.request(base+path,{method,headers},r=>{const chunks=[];r.on('data',c=>chunks.push(c));r.on('end',()=>res({status:r.statusCode,headers:r.headers,body:Buffer.concat(chunks)}));});req.on('error',rej);if(body)req.write(body);req.end();});
  const js=await raw('/client.js',{'accept-encoding':'gzip'});assert.equal(js.status,200);assert.equal(js.headers['content-encoding'],'gzip');assert.ok(gunzipSync(js.body).toString().includes('function'));
  const again=await raw('/client.js',{'if-none-match':js.headers.etag});assert.equal(again.status,304);
  const png=await raw('/pucela-beta-192.png',{'accept-encoding':'gzip'});assert.equal(png.status,200);assert.equal(png.headers['content-encoding'],undefined);
  const created=await raw('/api/create',{'content-type':'application/json','accept-encoding':'gzip','x-forwarded-for':'1.2.3.4, 10.0.0.9'},'POST',JSON.stringify({profile:{name:'Host'}}));
  assert.equal(created.status,200);assert.equal(created.headers['content-encoding'],'gzip');const parsed=JSON.parse(gunzipSync(created.body));assert.ok(parsed.session.code);
  const plain=await raw('/api/health');assert.equal(JSON.parse(plain.body).version,'16.7.0-beta');
 }finally{server.close();}
});

test('interpolación: el retardo se adapta cuando las muestras llegan tarde (datos móviles)',()=>{
 let fast=null,slow=null;const map=LOBBY;
 for(let i=0;i<40;i++){const time=10_000+i*100,p={x:LOBBY.spawn.x+i,y:LOBBY.spawn.y,motionTime:time,input:{x:1,y:0}};
  fast=recordRemoteSample(fast,p,time,time+30);          // llega 30 ms después
  slow=recordRemoteSample(slow,p,time,time+90+(i%3)*80);} // 90–250 ms después, con variación
 assert.ok(fast.need<160&&slow.need>fast.need+60,`${fast.need} ${slow.need}`);
 const a=remoteAt(fast,14_000,map),b=remoteAt(slow,14_000,map);assert.ok(a&&b);
 assert.ok(REMOTE_DELAY_MS<=120);
});

}

// Original regression suite: version14_2.test.js
{
const test=regressionModule0.default;
const assert=regressionModule1.default;
const {createRoom,command}=regressionModule3;
const {botStatement,hearStructured,noteEvidence,socialBrain,botIntent,criticalVote,strongestEvidence}=regressionModule13;
const {tick,snapshot}=regressionModule3;
const {botStartDelay}=regressionModule15;
const {readFileSync}=regressionModule26;
const {terraceMarkup,animateTerrace,doorOpenAmount,doorLeafGeometry,DOOR_SETS}=regressionModule27;
const {boundaryWall,archTheme,drawArchitecture,drawVoid}=regressionModule28;
const {WORLDS,floorAt: floorAt143}=regressionModule6;
const {deviceType}=regressionModule29;
const {frontView}=regressionModule30;
const {SURFACES,footstep,sfx}=regressionModule31;
// 14.2 · coherencia social de los bots, puertas batientes de la expulsión,
// caravana compartida con el menú, alarma grave y arranque escalonado de bots.



const seq=list=>{let i=0;return n=>list[i++%list.length]%n;};
function socialRoom(n=5){const now=Date.now(),{room,player}=createRoom({name:'Fer'},now);for(let i=0;i<n-1;i++)command(room,player.token,'addBot',{},now);command(room,player.token,'configure',{map:'club',tasks:3},now);command(room,player.token,'start',{},now);room.players.forEach((p,i)=>{p.role=i===1?'impostor':'crew';p.alive=true;});room.phase='meeting';room.meeting={id:'m1',introAt:now,stage:'discussion',votes:{}};return {room,now};}
const say=(room,bot,from,intent,id=Math.random().toString(36))=>hearStructured(room,bot,{id,playerId:from.id,time:Date.now(),intent});

test('un bot que acusa no pide pruebas a quien apoya su acusación y vota lo que dijo',()=>{
 for(let k=0;k<20;k++){const {room,now}=socialRoom(6),[human,imp,bot]=room.players;
  noteEvidence(bot,{kind:'nearbody',target:imp.id,name:imp.name,src:'seen',at:now});socialBrain(bot).suspicions[imp.id]=75;
  const intent=botIntent(room,bot,seq([k]));assert.equal(intent,imp.id);const said=botStatement(room,bot,seq([k]),intent);socialBrain(bot).spoke=true;assert.match(said.text,new RegExp(imp.name));
  // Un jugador escéptico de credibilidad baja apoya la acusación.
  socialBrain(bot).trust[human.id]=0;say(room,bot,human,{kind:'accuse',target:imp.id});
  const texts=socialBrain(bot).replies.map(r=>r.text).join(' | ');
  assert.doesNotMatch(texts,/No estoy convencido|Lo viste o solo/,texts);assert.match(texts,new RegExp(`(Exacto|Coincido).*${imp.name}`));
  assert.equal(botIntent(room,bot,seq([k+3])),imp.id,'vota a quien acusó');}
});
for(const [n,impostors] of [[3,1],[5,2]])test(`situación crítica ${n}/${impostors}: los bots discuten, no proponen SKIP y votan lo que dicen`,()=>{
 for(let k=0;k<25;k++){const now=Date.now(),{room,player}=createRoom({name:'Fer'},now);for(let i=0;i<n+3;i++)command(room,player.token,'addBot',{},now);command(room,player.token,'configure',{map:'club',tasks:3,impostors},now);command(room,player.token,'start',{},now);
  room.config.impostors=impostors;room.players.forEach((p,i)=>{p.role=i>=1&&i<=impostors?'impostor':'crew';p.alive=i<n;});room.phase='meeting';room.meeting={id:'mc'+k,introAt:now,stage:'discussion',votes:{}};assert.ok(criticalVote(room));
  for(const bot of room.players.slice(1,n)){const r=seq([k,k*7+1,k*13+2]),intent=botIntent(room,bot,r);assert.notEqual(intent,'skip',`${bot.role} no omite`);
   const said=botStatement(room,bot,r,intent);if(bot.role==='impostor'&&socialBrain(bot).accused)socialBrain(bot).intent.target=socialBrain(bot).accused;
   assert.doesNotMatch(said.text,/SKIP|no acusar a nadie|Prefiero no/i,said.text);
   const target=room.players.find(q=>q.id===botIntent(room,bot,r));assert.ok(said.text.includes(target.name),`${said.text} ⇄ ${target.name}`);
   socialBrain(bot).spoke=true;say(room,bot,room.players[0],{kind:'skip'});const replies=socialBrain(bot).replies.map(x=>x.text).join(' ');
   assert.match(replies,/No podemos saltarnos la votación/);assert.doesNotMatch(replies,/prefiero SKIP/);}}
});
test('la jaula no es prueba: no se anota, no se acusa por ella y se responde con calma',()=>{
 const {room,now}=socialRoom(5),[human,imp,bot]=room.players;noteEvidence(bot,{kind:'cage',target:human.id,name:human.name,src:'seen',at:now});
 assert.equal(strongestEvidence(room,bot),null);assert.equal(socialBrain(bot).suspicions[human.id]||0,0);
 say(room,bot,imp,{kind:'caged',target:human.id});assert.equal(socialBrain(bot).suspicions[human.id]||0,0);assert.match(socialBrain(bot).replies[0].text,/jaula no prueba nada/);
 for(let k=0;k<40;k++){const s=botStatement(socialRoom(5).room,imp,seq([k,k+1,k+2,k+3]));assert.doesNotMatch(s.text,/jaula/);}
});
test('si cambia de opinión, lo anuncia con su motivo',()=>{
 const {room}=socialRoom(6),[human,imp,bot,other]=room.players;socialBrain(bot).personality.susceptibility=1;for(const q of room.players)socialBrain(bot).trust[q.id]=1;
 const first=botIntent(room,bot,seq([99]));assert.equal(first,'skip');socialBrain(bot).spoke=true;
 say(room,bot,human,{kind:'saw',target:imp.id});say(room,bot,other,{kind:'saw',target:imp.id});say(room,bot,room.players[4],{kind:'camera',target:imp.id});
 assert.equal(botIntent(room,bot,seq([99])),imp.id);assert.ok(socialBrain(bot).replies.some(r=>/(cambio mi voto|ya no voto SKIP)/.test(r.text)&&r.text.includes(imp.name)),JSON.stringify(socialBrain(bot).replies));
});



test('arranque escalonado: cada bot espera 0,1–3 s propios al empezar y tras una votación',()=>{
 for(let k=0;k<400;k++){const d=botStartDelay(n=>Math.floor(Math.random()*n));assert.ok(d>=100&&d<=3000,String(d));}
 // Solo cuenta el caminar propio (pasos cortos en la misma planta); los traslados del mapa (p. ej. el profesor del Colegio) no.
 const firstMoves=(room,from)=>{const last=new Map(room.players.filter(p=>p.bot).map(p=>[p.id,{x:p.x,y:p.y,f:p.floor}])),moved=new Map();for(let t=from;t<=from+4500;t+=50){room.players[0].lastSeen=t;tick(room,t);for(const p of room.players.filter(q=>q.bot&&q.alive)){const s=last.get(p.id),d=Math.hypot(p.x-s.x,p.y-s.y);if(!moved.has(p.id)&&s.f===p.floor&&d>1&&d<60&&!(p.expelledUntil>t))moved.set(p.id,t-from);last.set(p.id,{x:p.x,y:p.y,f:p.floor});}}return [...moved.values()];};
 let checked=0;
 for(let attempt=0;attempt<6&&checked<2;attempt++){
 const now=Date.now(),{room,player}=createRoom({name:'Fer'},now);for(let i=0;i<7;i++)command(room,player.token,'addBot',{},now);command(room,player.token,'configure',{map:'house',tasks:3},now);command(room,player.token,'start',{},now);room.intro=null;
 const begin=room.revealUntil;for(let t=now;t<begin;t+=500){room.players[0].lastSeen=t;tick(room,t);}
 const spawnAt=new Map(room.players.map(p=>[p.id,{x:p.x,y:p.y,floor:p.floor}]));
 const a=firstMoves(room,begin);assert.ok(!a.length||Math.min(...a)>=100,`nadie arranca antes de 0,1 s: ${a}`);for(const p of room.players.filter(q=>q.bot)){const d=p.brain.startAt-begin;assert.ok(d>=100&&d<=3000,`retraso ${d}`);}
 if(room.phase!=='game'||a.length<3)continue;assert.ok(new Set(a.map(v=>Math.round(v/100))).size>=2,`retrasos distintos: ${a}`);
 // Tras una votación: misma regla con la nueva época de juego (posiciones de salida, sin inercia).
 const resume=begin+60000;room.playStartAt=resume;for(const p of room.players)if(p.bot){p.brain.path=[];p.brain.stair=null;p.transition=null;p.puzzle=null;p.input={x:0,y:0};p.expelledUntil=0;p.vent=null;Object.assign(p,spawnAt.get(p.id));}
 const b=firstMoves(room,resume);assert.ok(!b.length||Math.min(...b)>=100,`tras votar: ${b}`);for(const p of room.players.filter(q=>q.bot)){const d=p.brain.startAt-resume;assert.ok(d>=100&&d<=3000,`retraso ${d}`);}
 if(room.phase!=='game'||b.length<3)continue;assert.ok(new Set(b.map(v=>Math.round(v/100))).size>=2,`tras votar: ${b}`);checked++;}
 assert.ok(checked>=1,'escenario comprobado');
});



test('expulsión en los tres mapas: puertas batientes por delante del portero, que queda dentro y oculto',()=>{
 assert.equal(doorOpenAmount(0),0);assert.equal(doorOpenAmount(1300),1);assert.equal(doorOpenAmount(3200),1);assert.equal(doorOpenAmount(4400),0);
 let prev=1;for(let t=3300;t<=4400;t+=50){const o=doorOpenAmount(t);assert.ok(o<=prev+1e-9,'cierre progresivo');prev=o;}
 for(const map of ['club','gym','house']){const html=terraceMarkup({name:'Fer',color:1},map),staff=html.indexOf('class="staff '),door=html.indexOf('swing-door'),player=html.indexOf('club-exit-player');
  assert.ok(staff>0&&door>staff&&player>door,`${map}: portero → hojas → expulsado`);
  assert.match(html.slice(html.lastIndexOf('<g clip-path',staff),staff),/clip-path="url\(#(terraceDoorway|clubDoorway)\)"/,`${map}: el portero está recortado al hueco de la puerta`);
  assert.doesNotMatch(html,/translate\(\$\{-?p\.open/);
  const set={},node=k=>({setAttribute:(n,v)=>set[k+n]=v,getBoundingClientRect:()=>({width:800,height:450}),querySelector:q=>node(q)});const root={querySelector:k=>node(k)};
  const prefix='club';animateTerrace(root,2000);assert.equal(set[`.${prefix}-door-leftdata-open`],'1.000');animateTerrace(root,3850);const mid=Number(set[`.${prefix}-door-leftdata-open`]);assert.ok(mid>0&&mid<1,`${map}: a mitad de cierre ${mid}`);animateTerrace(root,4600);assert.equal(set[`.${prefix}-door-leftdata-open`],'0.000');}
 // Cerradas, las hojas tapan exactamente el hueco (el portero queda completamente oculto); abiertas giran (arco), no se deslizan.
 for(const set of Object.values(DOOR_SETS)){const [l,r]=set.leaves,closedL=doorLeafGeometry(set,l,0).panel,closedR=doorLeafGeometry(set,r,0).panel;
  const xs=d=>d.match(/-?[\d.]+/g).map(Number).filter((_,i)=>i%2===0);assert.equal(Math.min(...xs(closedL)),l.hinge);assert.ok(Math.max(...xs(closedL))>=Math.min(...xs(closedR))-2,'sin rendija entre hojas');assert.equal(Math.max(...xs(closedR)),r.hinge);
  const half=doorLeafGeometry(set,l,.5),full=doorLeafGeometry(set,l,1);assert.ok(!half.backside&&full.backside);const ys=d=>d.match(/-?[\d.]+/g).map(Number).filter((_,i)=>i%2===1);assert.ok(Math.max(...ys(half.panel))>set.bottom,'perspectiva: la hoja crece al acercarse');}
 assert.match(terraceMarkup({name:'Fer',color:1},'house'),/LATASA´S HOUSE/);assert.match(terraceMarkup({name:'Fer',color:1},'club'),/MOSS CLUB/);
});
test('la bajada usa exactamente el dibujo de caravana del menú, sin tinte encima',()=>{
 const dis=readFileSync(new URL('../public/disembark.js',import.meta.url),'utf8'),menu=readFileSync(new URL('../public/menu.js',import.meta.url),'utf8');
 assert.match(dis,/import \{drawCaravanSide,drawCaravanDoorOpen,CARAVAN_DOOR\} from '\.\/caravan-side\.js'/);assert.match(menu,/import \{drawCaravanSide\} from '\.\/caravan-side\.js'/);
 assert.doesNotMatch(menu,/function drawCaravanSide/);assert.doesNotMatch(dis,/#2a176370/,'sin viñeta violeta sobre la caravana');
});
test('alarma de sabotaje: pulsos graves de tono fijo por el canal de efectos',()=>{
 const src=readFileSync(new URL('../public/client.js',import.meta.url),'utf8'),block=src.slice(src.indexOf('const ALARM_PATTERNS'),src.indexOf('// Parpadeo de emergencias'));
 const freqs=[...block.matchAll(/freq:([\d.]+)/g)].map(m=>Number(m[1]));assert.ok(freqs.length===3&&freqs.every(f=>f>=150&&f<=260),String(freqs));
 assert.doesNotMatch(block,/frequency\.(linearRamp|exponentialRamp|setTargetAtTime)/,'sin deslizamientos de tono');assert.doesNotMatch(block,/sawtooth/);
 assert.match(block,/audioMixer\.output\('effects'\)/);assert.match(src,/function stopAlarm/);
});

test('multijugador: un pico de latencia ya no rechaza movimiento legítimo y las marcas siguen el movimiento real',async()=>{
 const {api}=await import('../game/api.js'),{MemoryStore}=await import('../server/memory-store.js');
 const store=new MemoryStore();store.secret='s'.repeat(40);let T=Date.now();const call=(body,path='/api/room')=>api(store,path,body,T);
 const A=(await call({profile:{name:'Ana'},visibility:'private'},'/api/create')).body.session,B=(await call({profile:{name:'Bea'},code:A.code},'/api/join')).body.session;
 await call({...A,type:'addBot',data:{}});await call({...A,type:'addBot',data:{}});await call({...A,type:'configure',data:{map:'club',tasks:3}});await call({...A,type:'start',data:{}});
 const room=store.rooms.get(A.code);room.intro=null;room.revealUntil=T;room.roleRevealAt=T;let seq=1;
 const send=async ms=>{const r=await call({...A,type:'pulse',data:{x:1,y:0,_motion:{seq,segments:[{x:1,y:0,ms}],x:1,y:0}}});if(r.status===200)seq++;return r;};
 // Cliente real: un pulso en vuelo. [llegada al servidor, ms andados desde el envío anterior]
 // El 3.º sufre un pico de 350 ms; el 4.º sale al volver la respuesta y lleva 400 ms de
 // movimiento, pero llega solo 100 ms después del 3.º (antes: «Movimiento demasiado rápido»).
 const start=T,plan=[[50,100],[150,100],[550,100],[650,400],[750,100],[850,100]],times=[];
 for(const [arrive,ms] of plan){T=start+arrive;const r=await send(ms);assert.equal(r.status,200,r.body.error);const st=snapshot(room,room.players.find(p=>p.name==='Bea'),T),seen=st.players.find(p=>p.name==='Ana');times.push(seen.motionTime);assert.ok(seen.motionTime<=T);}
 for(let i=1;i<times.length;i++)assert.ok(times[i]>times[i-1],'marcas crecientes');
 // Las marcas avanzan lo andado (100,100,400,100,100), no lo que tardó la red (100,400,100,100,100).
 const gaps=times.slice(1).map((t,i)=>t-times[i]);assert.deepEqual(gaps.slice(2),[400,100,100],String(gaps));
 // Sigue siendo imposible ir más rápido que el tiempo real: una ráfaga de 2 s tras 100 ms se rechaza.
 T+=100;const cheat=await call({...A,type:'pulse',data:{x:1,y:0,_motion:{seq,segments:[{x:1,y:0,ms:2000}],x:1,y:0}}});assert.equal(cheat.status,400);assert.match(cheat.body.error,/demasiado rápido/);
});

// ------------------------------------------------------------ 14.3





test('14.3 · arquitectura: las paredes de borde salen de la lámina; ninguna pared queda fuera del mapa',()=>{
 for(const id of ['club','gym','house']){const w=WORLDS[id];assert.ok(archTheme(id),id);
  for(const f of w.FLOORS){const map=w.mapFor(f.floor??0,null);assert.equal(map.worldId,id,'cada planta sabe a qué mapa pertenece');
   for(const r of map.props.filter(p=>p.kind==='wall')){
    // Una pared que no toca suelo por ningún lado sería una pared flotando fuera del mapa.
    const horizontal=r.w>=r.h,probe=[];for(let k=.25;k<(horizontal?r.w:r.h);k+=.5)probe.push(horizontal?[[r.x+k,r.y-.35],[r.x+k,r.y+r.h+.35]]:[[r.x-.35,r.y+k],[r.x+r.w+.35,r.y+k]]);
    const touches=probe.some(([a,b])=>floorAt143(map,a[0]*56,a[1]*56)||floorAt143(map,b[0]*56,b[1]*56));assert.ok(touches,`${id}: pared sin suelo en ${r.x},${r.y}`);
    if(!boundaryWall(map,r,floorAt143)){const both=probe.filter(([a,b])=>floorAt143(map,a[0]*56,a[1]*56)&&floorAt143(map,b[0]*56,b[1]*56)).length;assert.ok(both>=probe.length*.5,'los tabiques interiores tienen suelo a ambos lados');}}}}
 // Con un lienzo de prueba sin degradados no falla.
 const calls=[];const ctx=new Proxy({},{get:(t,k)=>k in t?t[k]:()=>{calls.push(k);},set:(t,k,v)=>{t[k]=v;return true;}});const map=WORLDS.club.mapFor(0,null);
 assert.equal(drawVoid(ctx,map),true);assert.doesNotThrow(()=>drawArchitecture(ctx,map,floorAt143));assert.ok(calls.length>100);
});
test('14.3 · discoteca sin objetos del colegio, escenas de presentación de frente, pasos por superficie',()=>{
 assert.equal(deviceType('chalk','club'),'mop');assert.equal(deviceType('bell','club'),'pads');assert.equal(deviceType('bath','club'),'fan');assert.equal(deviceType('chalk'),'board');
 assert.ok(!WORLDS.club.STATIONS.some(s=>/pizarra/i.test(s.name||s.label||'')));
 const f=frontView({id:'p1',name:'Ana',color:2,input:{x:-1,y:0},facing:-1});assert.deepEqual(f.input,{x:0,y:1});assert.notEqual(f.id,'p1');assert.equal(f.color,2);
 for(const s of ['tile','wood','rubber','gravel','dance','wet','carpet'])assert.ok(SURFACES[s],s);
 assert.doesNotThrow(()=>footstep(null,null));assert.doesNotThrow(()=>sfx(null,null,'task'));
});
// BETA: los dardos sustituyen al Air Hockey en la caravana.
test('BETA · Dardos sustituye al Air Hockey: servidor y cliente sin restos del disco',async()=>{
 const src=(await import('node:fs')).readFileSync(new URL('../game/tables.js',import.meta.url),'utf8');assert.match(src,/darts:\{label:'Dardos'/);assert.doesNotMatch(src,/hockey/i);
 const ui=(await import('node:fs')).readFileSync(new URL('../public/tables-ui.js',import.meta.url),'utf8');assert.match(ui,/function drawDarts/);assert.doesNotMatch(ui,/puckFrame|hockey/i);
});

}

// Original regression suite: park81.test.js (BETA: Campo Grande se retiró; se
// conserva la comprobación de índices espaciales sobre los tres mapas actuales)
{
const test=regressionModule0.default;
const assert=regressionModule1.default;
const {WORLDS,canStand,move,distance}=regressionModule6;
const {floorContains,floorBoundary,segmentDistance}=regressionModule20;
const {botRoute}=regressionModule15;


// El índice espacial del terreno y del mobiliario debe dar exactamente el mismo
// resultado que recorrer todas las figuras. Se compara `canStand` contra una
// reimplementación exhaustiva en una malla densa de los cuatro mapas: si el
// atajo descartara alguna figura relevante, aquí se vería.
test('los índices espaciales no cambian ni una sola colisión',()=>{
 const T=56,RADIUS=15;
 const pathDistance=(x,y,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t);};
 const rawTerrainAt=(map,x,y)=>{const g=map.walkable;if(!g)return true;x/=T;y/=T;
  return g.rects.some(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h)
   ||g.circles.some(p=>Math.hypot(x-p.x,y-p.y)<=p.r)
   ||(map.paths||[]).some(path=>path.some((b,i)=>i&&pathDistance(x,y,path[i-1],b)<=g.pathRadius));};
 const rawTerrainFits=(map,x,y)=>{if(!map.walkable)return true;if(!rawTerrainAt(map,x,y))return false;
  for(let i=0;i<12;i++){const a=i*Math.PI/6;if(!rawTerrainAt(map,x+Math.cos(a)*RADIUS,y+Math.sin(a)*RADIUS))return false;}return true;};
 const touches=(x,y,l,t,r,b)=>{const dx=x-Math.max(l,Math.min(x,r)),dy=y-Math.max(t,Math.min(y,b));return dx*dx+dy*dy<RADIUS*RADIUS-1e-7;};
 const roundShape=r=>!r.hit&&/roundtable|stool|fountain|bandstand|gazebo|plant|bin$|aviary|birdhouse/.test(String(r.kind||''))&&r.w/r.h<1.3&&r.w/r.h>1/1.3;
 const rawProps=(map,x,y)=>map.props.filter(r=>!r.parkGrove&&!r.soft).some(p=>{if(roundShape(p)){const R=Math.min(p.w,p.h)*T/2+RADIUS;return (x-(p.x+p.w/2)*T)**2+(y-(p.y+p.h/2)*T)**2<R*R-1e-7;}const r=p.hit||p;return touches(x,y,r.x*T,r.y*T,(r.x+r.w)*T,(r.y+r.h)*T);});
 // Misma fórmula que canStand, pero recorriendo todas las figuras.
 const rawCanStand=(map,x,y)=>{
  const b=map.movementBounds;
  if(b&&(x<b.x*T+RADIUS||x>(b.x+b.w)*T-RADIUS||y<b.y*T+RADIUS||y>(b.y+b.h)*T-RADIUS))return false;
  if(!rawTerrainFits(map,x,y))return false;
  if(!floorContains(map,x,y)||floorBoundary(map).some(s=>segmentDistance({x,y},s)<RADIUS-1e-6))return false;
  // 16.5 · Esquinas de salas diagonales dibujadas como pared: no se pisan.
  const d=RADIUS*.7,out=[...map.rooms,...map.corridors].filter(r=>r.outline);
  if([[0,0],[d,d],[-d,d],[d,-d],[-d,-d]].some(([a,b])=>{const cx=Math.floor((x+a)/T),cy=Math.floor((y+b)/T);return out.some(r=>cx+1>r.x&&cx<r.x+r.w&&cy+1>r.y&&cy<r.y+r.h)&&!floorContains(map,(cx+.5)*T,(cy+.5)*T);}))return false;
  return !rawProps(map,x,y);};

 let sampled=0,terrain=0,blocked=0;
 for(const id of ['club','gym','house']){
  for(const map of WORLDS[id].FLOORS){
   for(let y=1;y<map.height-1;y+=.3)for(let x=1;x<map.width-1;x+=.3){
    const px=x*T,py=y*T;sampled++;
    const fast=canStand(map,px,py),slow=rawCanStand(map,px,py);
    assert.equal(fast,slow,`${id} (${px.toFixed(1)},${py.toFixed(1)}): índice ${fast} vs exhaustivo ${slow}`);
    if(!fast)blocked++;
   }
  }
 }
 assert.ok(sampled>80000,'malla demasiado escasa: '+sampled);
 assert.ok(blocked>sampled*.2,'la malla no toca suficientes obstáculos: '+blocked+'/'+sampled);
});


}

// Original regression suite: release.test.js
{
const test=regressionModule0.default;
const assert=regressionModule1.default;
const {api}=regressionModule2;
const {MemoryStore}=regressionModule4;
const {snapshot}=regressionModule3;
const {WORLDS,canStand,TILE,move}=regressionModule6;
const {LOBBY_OBJECTS,CARAVAN}=regressionModule22;
const {voteIcons,meetingCards}=regressionModule33;
const {createVoteCountdown}=regressionModule34;
const {musicContext}=regressionModule31;
const {DEFAULT_VOLUMES,createAudioMixer}=regressionModule31;
const {makeServer}=regressionModule5;



async function fixture(n=4,map='club'){const store=new MemoryStore(),clock={now:Date.now()},sessions=[];const first=await api(store,'/api/create',{profile:{name:'Fer',color:0,hat:4,accessory:3}},clock.now);sessions.push(first.body.session);for(let i=1;i<n;i++)sessions.push((await api(store,'/api/join',{code:sessions[0].code,profile:{name:'Invitado '+i,color:i}},clock.now)).body.session);const raw=()=>store.rooms.get(sessions[0].code),send=(i,type,data={})=>api(store,'/api/room',{...sessions[i],type,data},clock.now),advance=ms=>{clock.now+=ms;raw().players.forEach(p=>p.lastSeen=clock.now);};await send(0,'configure',{map,tasks:2,discussion:5,voting:15});return {store,clock,sessions,raw,send,advance};}

test('caravana compartida: diez posiciones libres, armario y ordenador accesibles y con autorización',async()=>{assert.equal(WORLDS.house.LOBBY,CARAVAN);assert.equal(WORLDS.club.LOBBY,CARAVAN);const f=await fixture(10),r=f.raw();for(const p of r.players)assert.ok(canStand(CARAVAN,p.x,p.y));assert.equal((await f.send(0,'lobbyUse',{id:'wardrobe'})).status,400);const grid=28,from=[Math.floor(CARAVAN.spawn.x/grid),Math.floor(CARAVAN.spawn.y/grid)],queue=[from],seen=new Set([from.join(',')]);for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+a,yy=y+b,k=xx+','+yy;if(!seen.has(k)&&canStand(CARAVAN,(xx+.5)*grid,(yy+.5)*grid)){seen.add(k);queue.push([xx,yy]);}}}for(const object of LOBBY_OBJECTS){assert.ok(queue.some(([x,y])=>Math.hypot((x+.5)*grid-object.x,(y+.5)*grid-object.y)<object.range));Object.assign(f.raw().players[0],{x:object.x,y:object.y,input:{x:0,y:0},moveAt:f.clock.now});assert.ok(canStand(CARAVAN,object.x,object.y));assert.equal((await f.send(0,'lobbyUse',{id:object.id})).status,200);assert.equal((await f.send(1,'pulse')).body.state.players.find(p=>p.id===r.players[0].id).lobbyInteraction.kind,object.id);}assert.equal((await f.send(1,'configure',{speed:2})).status,403);});

test('viaje y suspense: no hay rol, compañeros ni alcance revelador en los datos antes del momento autorizado',async()=>{for(const map of ['house','club']){const f=await fixture(7,map);await f.send(0,'configure',{impostors:2});await f.send(0,'start');const r=f.raw(),start=f.clock.now;assert.equal(r.travelUntil-start,5500);assert.equal(r.roleRevealAt-start,7000);assert.equal(r.revealUntil-start,13000);for(const d of [0,5500,1499]){f.advance(d);for(let i=0;i<7;i++){const s=(await f.send(i,'pulse')).body.state;assert.equal(s.me.role,null);assert.equal(s.me.specialRole,null);assert.equal(s.me.vision,2000);assert.ok(s.roster.every(p=>!Object.hasOwn(p,'role')));assert.equal(musicContext(s,f.clock.now),f.clock.now<f.raw().travelUntil?'travel':'suspense');}}f.advance(1);const states=await Promise.all(f.sessions.map((_,i)=>f.send(i,'pulse')));assert.equal(states.filter(s=>s.body.state.me.role==='impostor').length,2);states.filter(s=>s.body.state.me.role==='crew').forEach(s=>assert.ok(s.body.state.roster.every(p=>!Object.hasOwn(p,'role'))));const before={x:f.raw().players[0].x,y:f.raw().players[0].y};await f.send(0,'pulse',{x:1,y:0});f.advance(200);await f.send(0,'pulse',{x:1,y:0});assert.equal(f.raw().players[0].x,before.x);f.advance(5800);const s=(await f.send(0,'pulse',{x:0,y:0})).body.state;assert.equal(s.serverTime,r.revealUntil);}});

test('servidor: anonimato obligatorio, totales sin orden del votante y sanitización de resultados antiguos',async()=>{const f=await fixture();assert.equal((await f.send(0,'configure',{anonymousVotes:false})).status,400);await f.send(0,'start');f.advance(46000);let r=f.raw(),caller=r.players.findIndex(p=>p.role==='crew');Object.assign(r.players[caller],WORLDS.club.FLOORS[0].emergency,{moveAt:f.clock.now,input:{x:0,y:0}});assert.equal((await f.send(caller,'emergency')).status,200);f.advance(7400);r=f.raw();const target=r.players.find(p=>p.role==='impostor').id;for(const i of [3,0,2,1])await f.send(i,'vote',{target:i===0?'skip':target});const s=(await f.send(0,'pulse')).body.state;assert.equal(s.meeting.resolution,'all-voted');assert.deepEqual(s.meeting.result.counts,{[target]:3,skip:1});assert.equal(Object.hasOwn(s.meeting,'votes'),false);assert.equal(Object.hasOwn(s.meeting.result,'votes'),false);r=f.raw();r.meeting.result.votes=[{voter:r.players[1].id,target,order:0}];r.config.anonymousVotes=false;const legacy=snapshot(r,r.players[2],f.clock.now);assert.equal(legacy.config.anonymousVotes,true);assert.equal(Object.hasOwn(legacy.meeting.result,'votes'),false);const icon=voteIcons(1);assert.ok(icon.includes('#555e6b'));assert.ok(!icon.includes('title='));assert.equal((voteIcons(10).match(/class="tally-voter"/g)||[]).length,10);});

test('cuatro clientes HTTP: orden de chat, aspecto público, canal de espectros y privacidad del recuento',async()=>{const store=new MemoryStore(),server=makeServer(store);await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port,sessions=[];const post=async(path,body)=>{const res=await fetch(origin+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const r=await res.json();assert.equal(res.status,200,r.error);return r;};try{sessions.push((await post('/api/create',{profile:{name:'Fer',color:0,hat:4,accessory:3}})).session);for(let i=1;i<4;i++)sessions.push((await post('/api/join',{code:sessions[0].code,profile:{name:'HTTP '+i,color:i}})).session);const send=(i,type='pulse',data={})=>post('/api/room',{...sessions[i],type,data});await Promise.all(sessions.map((_,i)=>send(i,'chat',{text:'mensaje '+i})));const states=await Promise.all(sessions.map((_,i)=>send(i)));const ids=states[0].state.chat.map(m=>m.id);states.forEach(r=>assert.deepEqual(r.state.chat.map(m=>m.id),ids));const fer=states[0].state.chat.find(m=>m.name==='Fer');assert.equal(fer.appearance.hat,4);assert.equal(fer.appearance.accessory,3);assert.ok(!JSON.stringify(fer).includes('token'));await send(0,'configure',{map:'club',tasks:2,discussion:5,voting:15});await send(0,'start');const r=store.rooms.get(sessions[0].code);r.revealUntil=0;r.roleRevealAt=0;r.travelUntil=0;r.teachers=[];const dead=r.players.find(p=>p.role==='crew'),di=r.players.indexOf(dead);dead.alive=false;dead.lastChat=0;await send(di,'chat',{text:'señal privada'});const live=r.players.findIndex(p=>p.alive);assert.ok(!(await send(live)).state.chat.some(m=>m.text==='señal privada'));assert.ok((await send(di)).state.chat.some(m=>m.text==='señal privada'));}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}});

function fakeCounter(){const value={replaceChildren(n){this.text=n.textContent;}},set=new Set();return {hidden:true,value,classList:{toggle(k,on){if(on)set.add(k);else set.delete(k);},contains:k=>set.has(k)},querySelector:()=>value};}
test('cuenta atrás: 10–0 una sola vez, reloj absoluto, cancelación anticipada y nueva reunión',()=>{const previous=globalThis.document;globalThis.document={createElement:()=>({textContent:''})};try{const root=fakeCounter(),ticks=[],done=[],counter=createVoteCountdown(root,{onTick:n=>ticks.push(n),onFinish:()=>done.push(0)}),s={phase:'meeting',meeting:{id:'a',stage:'voting',voteEnd:20000}};counter.update(s,9999);assert.equal(root.hidden,true);for(let n=10;n>=0;n--){counter.update(s,20000-n*1000);counter.update(s,20000-n*1000+30);assert.equal(root.value.text,String(n));if(n<=5)assert.ok(root.classList.contains('critical'));}assert.deepEqual(ticks,[10,9,8,7,6,5,4,3,2,1]);assert.equal(done.length,1);counter.update(s,20700);assert.equal(root.hidden,true);s.meeting={id:'b',stage:'voting',voteEnd:50000};counter.update(s,40000);counter.update(s,39990);assert.equal(root.value.text,'10');s.meeting.stage='result';s.meeting.resolution='all-voted';counter.update(s,41000);assert.equal(root.hidden,true);assert.equal(done.length,1);s.meeting={id:'c',stage:'result',resolution:'timeout',voteEnd:60000};counter.update(s,60020);assert.equal(root.value.text,'0');assert.equal(root.hidden,false);counter.update(s,60800);assert.equal(root.hidden,true);assert.equal(done.length,2);}finally{globalThis.document=previous;}});

test('audio: volúmenes independientes y contextos distintos sin rol anticipado',()=>{const mixer=createAudioMixer(()=>null);assert.deepEqual(mixer.levels,DEFAULT_VOLUMES);mixer.set('music',0);assert.equal(mixer.levels.music,0);assert.equal(mixer.levels.effects,.8);mixer.set('master',5);assert.equal(mixer.levels.master,1);assert.equal(musicContext(null),'menu');assert.equal(musicContext({phase:'lobby'}),'caravan');assert.equal(musicContext({phase:'meeting',meeting:{stage:'voting',voteEnd:20000}},10000),'tension');});

}

// Original regression suite: upgrade.test.js
{
const {activeRepairs}=regressionModule12;
const test=regressionModule0.default;
const assert=regressionModule1.default;
const {api}=regressionModule2;
const {MemoryStore}=regressionModule4;
const {challenge,solution,minDuration}=regressionModule16;
const {worldFor,canStand}=regressionModule6;
const {drawCamera}=regressionModule21;








const club=worldFor('club');
function correct(kind,c){switch(kind){case 'dj':return {levels:c.levels,sync:c.sync};case 'speaker':return {links:[0,1,2,3].map(i=>c.order.indexOf(i)),gain:c.gain};case 'stock':return c.slots;case 'vip':return {order:[1,2,3,4],swipe:800};case 'power':return {sequence:c.sequence,fuses:[1,1,1]};case 'download':return {route:c.route,packets:c.packets};case 'calibrate':return c.targets;case 'trash':return {lever:100,removed:c.items};case 'lights':return c.rotations.map(()=>0);case 'code':return c.code;case 'bath':return c.levels;case 'wires':return [0,1,2,3].map(i=>c.order.indexOf(i));case 'bell':return c.sequence;case 'computer':return c.target;}}
async function fixture(){const store=new MemoryStore(),sessions=[],clock={now:Date.now()};sessions.push((await api(store,'/api/create',{profile:{name:'Arte Host',color:0}},clock.now)).body.session);for(let i=1;i<4;i++)sessions.push((await api(store,'/api/join',{code:sessions[0].code,profile:{name:'Artista '+i,color:i}},clock.now)).body.session);const raw=()=>store.rooms.get(sessions[0].code),send=(i,type,data={})=>api(store,'/api/room',{...sessions[i],type,data},clock.now),keep=ms=>{clock.now+=ms;raw().players.forEach(p=>p.lastSeen=clock.now);};await send(0,'configure',{map:'club',tasks:2});await send(0,'start');keep(46000);await send(0,'pulse');return {store,sessions,clock,send,raw,keep};}
const pos=(f,i,p)=>Object.assign(f.raw().players[i],{x:p.x,y:p.y,floor:0,input:{x:0,y:0},moveAt:f.clock.now,transition:null,vent:null});

test('ocho tareas nuevas: soluciones válidas, datos incorrectos y valores no numéricos',()=>{
 for(const kind of ['dj','speaker','stock','vip','power','download','calibrate','trash'])for(let i=0;i<15;i++){const c=challenge(kind,'club');assert.equal(solution(kind,c,correct(kind,c)),true,kind);assert.equal(!!solution(kind,c,null),false,kind);assert.equal(!!solution(kind,c,{}),false,kind);assert.ok(minDuration[kind]>=3000);}
 assert.equal(solution('dj',{levels:[30,40,50],sync:50},{levels:[NaN,40,50],sync:50}),false);assert.equal(solution('vip',{},{order:[1,2,3,4],swipe:10}),false);
});

test('tareas nuevas en servidor: distancia, tiempo mínimo, rechazo de repetición y progreso autoritativo',async()=>{
 const f=await fixture(),i=f.raw().players.findIndex(p=>p.role==='crew'),stations=club.STATIONS.filter(s=>['dj','speaker','stock','vip','power','download','calibrate','trash'].includes(s.kind));f.raw().players[i].tasks=stations.map(s=>({id:s.id,done:false}));
 for(const st of stations){pos(f,i,club.FLOORS[0].spawn);if(Math.hypot(st.x-club.FLOORS[0].spawn.x,st.y-club.FLOORS[0].spawn.y)>110)assert.equal((await f.send(i,'beginTask',{id:st.id})).status,400);pos(f,i,st);const begun=await f.send(i,'beginTask',{id:st.id});assert.equal(begun.status,200,begun.body.error);const t=begun.body.task;assert.equal(t.kind,st.kind);const data={id:t.id,solution:correct(t.kind,t.challenge)};assert.equal((await f.send(i,'finishTask',data)).status,400,'tiempo mínimo');f.keep(t.minDuration+20);assert.equal((await f.send(i,'finishTask',{id:t.id,solution:null})).status,400,'solución inválida');const done=await f.send(i,'finishTask',data);assert.equal(done.status,200,done.body.error);assert.ok(done.body.state.me.tasks.find(q=>q.id===st.id).done);assert.equal((await f.send(i,'finishTask',data)).status,400,'sin duplicado');}
});

test('nueve sabotajes: consecuencias, reparaciones específicas reales y restablecimiento del estado',async()=>{
 const f=await fixture(),ii=f.raw().players.findIndex(p=>p.role==='impostor'),crew=f.raw().players.map((p,i)=>p.role==='crew'?i:-1).filter(i=>i>=0);
 for(const kind of Object.keys(club.SABOTAGES)){
  f.raw().sabotageReady=f.clock.now;const started=await f.send(ii,'sabotage',{kind});assert.equal(started.status,200,started.body.error);assert.equal(started.body.state.sabotage.deadline-f.clock.now,90000);
  if(kind==='vip')assert.ok(started.body.state.sabotage.closed.every(id=>club.DOORS.find(d=>d.id===id).room==='vip'));
  if(kind==='audio')assert.equal((await f.send(crew[0],'pulse')).body.state.progress.blocked,true);
  if(kind==='overload')assert.equal((await f.send(crew[0],'pulse')).body.state.me.vision,280);
  for(const [n,panel] of activeRepairs(f.raw()).entries()){const ci=crew[n];pos(f,ci,panel);const r=await f.send(ci,'beginRepair',{id:panel.id});assert.equal(r.status,200,r.body.error);const t=r.body.repair;f.keep(t.minDuration+15);const done=await f.send(ci,'finishRepair',{id:t.id,solution:correct(t.kind,t.challenge)});assert.equal(done.status,200,done.body.error);}
  assert.equal(f.raw().sabotage,null,kind);assert.equal((await f.send(crew[0],'pulse')).body.state.progress.blocked,false);f.keep(600);
 }
});

test('cuatro cámaras simultáneas: mismo instante, movimiento, paredes, invisibilidad y roles privados',async()=>{
 const f=await fixture(),i=f.raw().players.findIndex(p=>p.role==='crew'),others=[0,1,2,3].filter(n=>n!==i);pos(f,i,club.CAMERA_CONSOLE);for(const [n,id] of others.entries())pos(f,id,{...club.CAMERAS[n],x:club.CAMERAS[n].x+30});f.raw().players.forEach(p=>p.specialRole=null);
 let r=await f.send(i,'camera',{id:'all'});assert.equal(r.status,200);let views=r.body.state.cameraFeeds;assert.equal(views.length,4);assert.equal(new Set(views.map(q=>q.id)).size,4);
 for(const [n,id] of others.entries()){const p=f.raw().players[id],view=views[n];assert.ok(view.players.some(q=>q.id===p.id&&q.x===p.x&&q.y===p.y));assert.ok(view.players.every(q=>!Object.hasOwn(q,'role')&&!Object.hasOwn(q,'specialRole')));}
 const target=others[0];pos(f,target,{x:17.5*56,y:15.7*56});r=await f.send(i,'pulse');assert.ok(!r.body.state.cameraFeeds[0].players.some(q=>q.id===f.raw().players[target].id),'pared de Seguridad');pos(f,target,club.CAMERAS[0]);Object.assign(f.raw().players[target],{specialRole:'phantom',abilityUntil:f.clock.now+15000});assert.ok(!(await f.send(i,'pulse')).body.state.cameraFeeds[0].players.some(q=>q.id===f.raw().players[target].id));
 f.raw().sabotage={kind:'computers',started:f.clock.now,deadline:f.clock.now+90000,fixed:[],confirmations:{}};const cut=(await f.send(i,'pulse')).body.state.cameraFeeds;assert.equal(cut.length,4);assert.ok(cut.every(q=>!q.signal&&!q.players.length));
});

test('render de vigilancia dibuja CAM 01–04 y las cuatro zonas en un único fotograma',()=>{
 const text=[],ctx=new Proxy({measureText:()=>({width:20}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),fillText:s=>text.push(s)},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)}),canvas={width:1100,height:650,getContext:()=>ctx,getBoundingClientRect:()=>({width:1100,height:650})},oldDoc=globalThis.document,oldWin=globalThis.window;
 globalThis.document={createElement:()=>({getContext:()=>ctx})};globalThis.window={devicePixelRatio:1};try{drawCamera(canvas,{config:{map:'club'},cameraFeeds:club.CAMERAS.map(q=>({...q,signal:true,radius:360,players:[],bodies:[]}))},new Map(),1000);for(let i=1;i<=4;i++)assert.ok(text.includes(`CAM 0${i}`));for(const q of club.CAMERAS)assert.ok(text.includes(q.label));}finally{globalThis.document=oldDoc;globalThis.window=oldWin;}
});

test('backstage y posiciones de reunión siguen libres con diez personas y mobiliario nuevo',()=>{
 const slots=[[6,7.2],[7.5,7.2],[12.5,7.2],[14,7.2],[15.5,7.2],[6,8.35],[7.5,8.35],[9,8.35],[10.5,8.35],[12,8.35]];for(const [x,y] of slots)assert.ok(canStand(club.MEETING,x*56,y*56));for(let i=0;i<10;i++){const a=i*Math.PI*2/10;assert.ok(canStand(club.FLOORS[0],club.FLOORS[0].spawn.x+Math.cos(a)*80,club.FLOORS[0].spawn.y+Math.sin(a)*70));}
});

}
