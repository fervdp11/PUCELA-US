import {activeRepairs} from '../public/worlds.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {api} from '../game/api.js';
import {MemoryStore} from '../server/memory-store.js';
import {challenge,solution,minDuration} from '../game/tasks.js';
import {worldFor,canStand} from '../public/content.js';
import {drawCamera} from '../public/render.js';
const club=worldFor('club');
export function correct(kind,c){switch(kind){case 'dj':return {levels:c.levels,sync:c.sync};case 'speaker':return {links:[0,1,2,3].map(i=>c.order.indexOf(i)),gain:c.gain};case 'stock':return c.slots;case 'vip':return {order:[1,2,3,4],swipe:800};case 'power':return {sequence:c.sequence,fuses:[1,1,1]};case 'download':return {route:c.route,packets:c.packets};case 'calibrate':return c.targets;case 'trash':return {lever:100,removed:c.items};case 'lights':return c.rotations.map(()=>0);case 'code':return c.code;case 'bath':return c.levels;case 'wires':return [0,1,2,3].map(i=>c.order.indexOf(i));case 'bell':return c.sequence;case 'computer':return c.target;}}
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
