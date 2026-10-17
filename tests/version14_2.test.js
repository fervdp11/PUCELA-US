// 14.2 · coherencia social de los bots, puertas batientes de la expulsión,
// caravana compartida con el menú, alarma grave y arranque escalonado de bots.
import test from 'node:test';import assert from 'node:assert/strict';
import {createRoom,command} from '../game/engine.js';
import {botStatement,hearStructured,noteEvidence,socialBrain,botIntent,criticalVote,strongestEvidence} from '../game/social.js';
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

import {tick,snapshot} from '../game/engine.js';
import {botStartDelay} from '../game/bots.js';
test('arranque escalonado: cada bot espera 0,1–3 s propios al empezar y tras una votación',()=>{
 for(let k=0;k<400;k++){const d=botStartDelay(n=>Math.floor(Math.random()*n));assert.ok(d>=100&&d<=3000,String(d));}
 // Solo cuenta el caminar propio (pasos cortos en la misma planta); los traslados del mapa (p. ej. el profesor del Colegio) no.
 const firstMoves=(room,from)=>{const last=new Map(room.players.filter(p=>p.bot).map(p=>[p.id,{x:p.x,y:p.y,f:p.floor}])),moved=new Map();for(let t=from;t<=from+4500;t+=50){room.players[0].lastSeen=t;tick(room,t);for(const p of room.players.filter(q=>q.bot&&q.alive)){const s=last.get(p.id),d=Math.hypot(p.x-s.x,p.y-s.y);if(!moved.has(p.id)&&s.f===p.floor&&d>1&&d<60&&!(p.expelledUntil>t))moved.set(p.id,t-from);last.set(p.id,{x:p.x,y:p.y,f:p.floor});}}return [...moved.values()];};
 let checked=0;
 for(let attempt=0;attempt<6&&checked<2;attempt++){
 const now=Date.now(),{room,player}=createRoom({name:'Fer'},now);for(let i=0;i<7;i++)command(room,player.token,'addBot',{},now);command(room,player.token,'configure',{map:'school',tasks:3},now);command(room,player.token,'start',{},now);room.intro=null;
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

import {readFileSync} from 'node:fs';
import {terraceMarkup,animateTerrace,doorOpenAmount,doorLeafGeometry,DOOR_SETS} from '../public/expulsion.js';
test('expulsión en los cuatro mapas: puertas batientes por delante del portero, que queda dentro y oculto',()=>{
 assert.equal(doorOpenAmount(0),0);assert.equal(doorOpenAmount(1300),1);assert.equal(doorOpenAmount(3200),1);assert.equal(doorOpenAmount(4400),0);
 let prev=1;for(let t=3300;t<=4400;t+=50){const o=doorOpenAmount(t);assert.ok(o<=prev+1e-9,'cierre progresivo');prev=o;}
 for(const map of ['school','club','gym','park']){const html=terraceMarkup({name:'Fer',color:1},map),staff=html.indexOf('class="staff '),door=html.indexOf('swing-door'),player=html.indexOf(map==='school'?'terrace-player':'club-exit-player');
  assert.ok(staff>0&&door>staff&&player>door,`${map}: portero → hojas → expulsado`);
  assert.match(html.slice(html.lastIndexOf('<g clip-path',staff),staff),/clip-path="url\(#(terraceDoorway|clubDoorway)\)"/,`${map}: el portero está recortado al hueco de la puerta`);
  assert.doesNotMatch(html,/translate\(\$\{-?p\.open/);
  const set={},node=k=>({setAttribute:(n,v)=>set[k+n]=v,getBoundingClientRect:()=>({width:800,height:450}),querySelector:q=>node(q)});const root={querySelector:k=>map==='school'&&k==='.club-door-left'?null:node(k)};
  const prefix=map==='school'?'terrace':'club';animateTerrace(root,2000);assert.equal(set[`.${prefix}-door-leftdata-open`],'1.000');animateTerrace(root,3850);const mid=Number(set[`.${prefix}-door-leftdata-open`]);assert.ok(mid>0&&mid<1,`${map}: a mitad de cierre ${mid}`);animateTerrace(root,4600);assert.equal(set[`.${prefix}-door-leftdata-open`],'0.000');}
 // Cerradas, las hojas tapan exactamente el hueco (el portero queda completamente oculto); abiertas giran (arco), no se deslizan.
 for(const set of Object.values(DOOR_SETS)){const [l,r]=set.leaves,closedL=doorLeafGeometry(set,l,0).panel,closedR=doorLeafGeometry(set,r,0).panel;
  const xs=d=>d.match(/-?[\d.]+/g).map(Number).filter((_,i)=>i%2===0);assert.equal(Math.min(...xs(closedL)),l.hinge);assert.ok(Math.max(...xs(closedL))>=Math.min(...xs(closedR))-2,'sin rendija entre hojas');assert.equal(Math.max(...xs(closedR)),r.hinge);
  const half=doorLeafGeometry(set,l,.5),full=doorLeafGeometry(set,l,1);assert.ok(!half.backside&&full.backside);const ys=d=>d.match(/-?[\d.]+/g).map(Number).filter((_,i)=>i%2===1);assert.ok(Math.max(...ys(half.panel))>set.bottom,'perspectiva: la hoja crece al acercarse');}
 assert.doesNotMatch(terraceMarkup({name:'Fer',color:1},'park'),/#5a8956/,'Campo Grande sin óvalo verde');
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
