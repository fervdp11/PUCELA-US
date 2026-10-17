import test from 'node:test';import assert from 'node:assert/strict';
import {api} from '../game/api.js';import {MemoryStore} from '../server/memory-store.js';
import {LOBBY_OBJECTS} from '../public/caravan.js';
async function fixture(n=5){const store=new MemoryStore(),clock={now:Date.now()},ss=[];const f=await api(store,'/api/create',{profile:{name:'Fer',color:0}},clock.now);ss.push(f.body.session);for(let i=1;i<n;i++)ss.push((await api(store,'/api/join',{code:ss[0].code,profile:{name:'J'+i,color:i}},clock.now)).body.session);
 const raw=()=>store.rooms.get(ss[0].code),send=(i,type,data={})=>api(store,'/api/room',{...ss[i],type,data},clock.now),advance=ms=>{clock.now+=ms;raw().players.forEach(p=>p.lastSeen=clock.now);};
 const goto=id=>{const o=LOBBY_OBJECTS.find(o=>o.id===id);return i=>Object.assign(raw().players[i],{x:o.x,y:o.y,input:{x:0,y:0},moveAt:clock.now});};
 return {raw,send,advance,goto,clock};}
const view=async(f,i)=>(await f.send(i,'pulse')).body.state.table;

test('mesas: dos parejas juegan al hockey a la vez en la misma mesa sin interferirse',async()=>{const f=await fixture(5),at=f.goto('table-hockey');for(let i=0;i<4;i++)at(i);
 assert.equal((await f.send(0,'tableJoin',{game:'hockey'})).status,200);assert.equal((await view(f,0)).phase,'waiting');
 await f.send(1,'tableJoin',{game:'hockey'});await f.send(2,'tableJoin',{game:'hockey'});assert.equal((await view(f,2)).phase,'waiting');await f.send(3,'tableJoin',{game:'hockey'});
 const v=[0,1,2,3].map(i=>view(f,i));const t=await Promise.all(v);assert.ok(t.every(x=>x.phase==='playing'));assert.equal(t[0].id,t[1].id);assert.equal(t[2].id,t[3].id);assert.notEqual(t[0].id,t[2].id);
 assert.deepEqual(t.map(x=>x.seat),[0,1,0,1]);
 f.advance(1600);await f.send(0,'tableInput',{x:150,y:60});f.advance(300);const a=await view(f,1),b=await view(f,3);assert.ok(a.view.paddles[0][0]>70);assert.equal(b.view.paddles[0][0],70);
 const stats=(await f.send(4,'pulse')).body.state.tableStats;assert.equal(stats.hockey.playing,4);});

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

test('mesas: juegos individuales empiezan solos y no necesitan rival',async()=>{const f=await fixture(3),a=f.goto('table-memory'),b=f.goto('table-simon');a(0);b(1);
 await f.send(0,'tableJoin',{game:'memory'});await f.send(1,'tableJoin',{game:'simon'});const m=await view(f,0),s=await view(f,1);assert.equal(m.phase,'playing');assert.equal(s.phase,'playing');assert.equal(m.view.faces.filter(Boolean).length,0);
 assert.ok(s.view.seq||s.view.phase);await f.send(0,'tableInput',{card:0});assert.equal((await view(f,0)).view.faces.filter(Boolean).length,1);});

test('mesas: carrera con pulsaciones por lotes limitadas por el servidor',async()=>{const f=await fixture(3),at=f.goto('table-race');at(0);at(1);await f.send(0,'tableJoin',{game:'race'});await f.send(1,'tableJoin',{game:'race'});
 f.advance(500);await f.send(0,'tableInput',{n:6});assert.equal((await view(f,0)).view.pos[0],0);f.advance(3500);await f.send(0,'tableInput',{n:6});const p=(await view(f,0)).view.pos[0];assert.ok(p>=1&&p<=6);
 f.advance(1000);await f.send(0,'tableInput',{n:6});f.advance(1000);await f.send(0,'tableInput',{n:6});assert.ok((await view(f,0)).view.pos[0]<=40);});

test('mesas: lejos de la mesa se rechaza y al empezar la partida principal se cierran todas las sesiones',async()=>{const f=await fixture(4),at=f.goto('table-reflex');at(1);at(2);
 Object.assign(f.raw().players[0],{x:50,y:50});assert.equal((await f.send(0,'tableJoin',{game:'reflex'})).status,400);
 await f.send(1,'tableJoin',{game:'reflex'});await f.send(2,'tableJoin',{game:'reflex'});assert.equal((await view(f,1)).phase,'playing');
 assert.equal((await f.send(0,'start')).status,200);const r=f.raw();assert.equal(r.tables,null);const s=(await f.send(1,'pulse')).body.state;assert.equal(s.table??null,null);assert.equal(s.tableStats??null,null);
 assert.equal((await f.send(1,'tableJoin',{game:'reflex'})).status,400);});

// ---------------------------------------------------------------- estilos de nombre
import {signProgress} from '../game/api.js';
import {NAME_BGS,NAME_COLORS,NAME_REWARDS,REWARDS,allowed,lockAppearance,rewardFor,nameLook,nameHtml,contrast,withClaim,LEVEL_XP} from '../public/pass.js';
import {snapshot} from '../game/engine.js';

test('nombre: reparto en los 50 niveles sin quitar ninguna recompensa anterior y con contraste legible',()=>{
 assert.equal(REWARDS.length,50);assert.ok(REWARDS.every((r,i)=>r.level===i+1));
 const seen=new Set();for(const r of NAME_REWARDS){assert.ok(r.level>=1&&r.level<=50);const k=r.field+r.value;assert.ok(!seen.has(k));seen.add(k);assert.equal(rewardFor(r.field,r.value).level,r.level);}
 assert.equal(NAME_REWARDS.filter(r=>r.field==='nameBg').length,NAME_BGS.length-2);assert.equal(NAME_REWARDS.filter(r=>r.field==='nameColor').length,NAME_COLORS.length-3);
 assert.ok(new Set(NAME_REWARDS.map(r=>r.level)).size>=25,'repartidas por todo el pase');assert.equal(Math.max(...NAME_REWARDS.map(r=>r.level)),50);
 for(let b=0;b<NAME_BGS.length;b++)for(let c=0;c<NAME_COLORS.length;c++){const L=nameLook(b,c),bgs=L.bg.a||['#142831'];assert.ok(Math.min(...bgs.flatMap(x=>L.text.map(t=>contrast(x,t))))>=3,`legible ${b}/${c}`);}
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
 const {appearanceOf}=await import('../public/school.js');const clone=appearanceOf(p);assert.equal(clone.name,'Ana');assert.equal(clone.nameBg,11);assert.equal(clone.nameColor,12);});

// Regresión 14.0: conexión persistente real, sin depender de sondeos del navegador.
import {makeServer} from '../server/node.js';
import {createTableStream} from '../public/tables-ui.js';
import {createSabotageAlarm} from '../public/soundscape.js';
const until=async(fn,ms=3000)=>{const end=Date.now()+ms;while(!fn()){if(Date.now()>end)throw Error('Tiempo agotado esperando el estado');await new Promise(r=>setTimeout(r,20));}};
test('WebSocket real: dos parejas aisladas, relevo humano y cierre al iniciar',async t=>{
 const store=new MemoryStore({secret:'ws-test'}),ss=[],now=Date.now();ss.push((await api(store,'/api/create',{profile:{name:'Uno',color:0}},now)).body.session);
 for(let i=1;i<5;i++)ss.push((await api(store,'/api/join',{code:ss[0].code,profile:{name:'Humano'+i,color:i}},now)).body.session);
 const o=LOBBY_OBJECTS.find(o=>o.id==='table-hockey');for(const p of store.rooms.get(ss[0].code).players)Object.assign(p,{x:o.x,y:o.y,input:{x:0,y:0}});
 const send=(i,type,data={})=>api(store,'/api/room',{...ss[i],type,data});for(let i=0;i<4;i++)assert.equal((await send(i,'tableJoin',{game:'hockey'})).status,200);
 const server=makeServer(store);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,views=[[],[],[],[],[]],streams=[];
 class LocalSocket extends WebSocket{constructor(url){super(url,{headers:{Origin:base}});}}
 t.after(async()=>{streams.forEach(s=>s.close());await new Promise(r=>setTimeout(r,80));server.closeAllConnections();await new Promise(r=>server.close(r));});
 for(let i=0;i<4;i++)streams[i]=createTableStream(ss[i],{base,WebSocketClass:LocalSocket,onView:v=>views[i].push(v)});
 await until(()=>streams.every(s=>s.ready)&&views.slice(0,4).every(v=>v.length));
 assert.equal(views[0].at(-1).id,views[1].at(-1).id);assert.notEqual(views[0].at(-1).id,views[2].at(-1).id);
 assert.ok(streams[0].send('tableInput',{x:150,y:60}));await until(()=>views[1].at(-1).view.paddles[0][0]>90);assert.equal(views[3].at(-1).view.paddles[0][0],70);
 assert.ok(JSON.stringify(views[1].at(-1)).length<2000,'el canal transmite solo la mesa, sin el mundo ni tokens');
 streams[1].close();await until(()=>views[0].at(-1)?.phase==='waiting');
 assert.equal((await send(4,'tableJoin',{game:'hockey'})).status,200);streams[4]=createTableStream(ss[4],{base,WebSocketClass:LocalSocket,onView:v=>views[4].push(v)});
 await until(()=>views[0].at(-1)?.phase==='playing'&&views[4].length);assert.equal(views[0].at(-1).id,views[4].at(-1).id);
 assert.equal((await send(0,'start')).status,200);await until(()=>views[0].at(-1)===null&&views[4].at(-1)===null);assert.equal(store.rooms.get(ss[0].code).tables,null);
});

test('alarma: una sola instancia, mezcla de efectos y parada inmediata al reparar/silenciar',()=>{
 const made=[],gains=[],param=()=>({value:0,setTargetAtTime(v){this.value=v;},cancelScheduledValues(){}}),output={};
 const ctx={state:'running',currentTime:0,destination:{},createGain(){const g={gain:param(),connect(v){this.output=v;},disconnect(){this.off=true;}};gains.push(g);return g;},createOscillator(){const o={frequency:param(),connect(){},start(){this.started=true;},stop(){this.stopped=true;},disconnect(){}};made.push(o);return o;}};
 let enabled=true;const alarm=createSabotageAlarm(()=>ctx,()=>enabled,{output:()=>output}),s={phase:'game',sabotage:{kind:'emergency'}};
 alarm.update(s);alarm.update(s);assert.equal(made.length,2);assert.equal(gains[0].output,output);alarm.update({...s,sabotage:null});assert.ok(made.every(o=>o.stopped));assert.equal(gains[0].gain.value,0);
 alarm.update(s);assert.equal(made.length,4);enabled=false;alarm.update(s);assert.ok(made.every(o=>o.stopped));enabled=true;alarm.update({...s,sabotage:{kind:'lights'}});assert.equal(made.length,4);alarm.stop();
});

import {drawRobot,setShadows} from '../public/characters.js';
test('perfil: un ojo en cada lado, gafas opacas lo ocultan y toda la silueta se refleja',()=>{
 let ellipse=null;const seen=[],scales=[],ctx=new Proxy({fillStyle:'',createLinearGradient:()=>null,scale:(...v)=>scales.push(v),beginPath(){ellipse=null;},ellipse(...v){ellipse=v;},fill(){if(ellipse)seen.push({fill:this.fillStyle,args:ellipse});}},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
 setShadows(false);
 try{for(const orientation of ['left','right','down','up'])for(const glasses of [0,1,2,3,5]){seen.length=0;scales.length=0;drawRobot(ctx,{color:0,orientation,glasses},0,0,1,1000,true);const eyes=seen.filter(x=>x.fill==='#253943');assert.equal(eyes.length,orientation==='up'?0:orientation==='down'?2:glasses===3?0:1,orientation+'/'+glasses);if(orientation==='left')assert.ok(scales.some(([x,y])=>x===-1&&y===1));}}
 finally{setShadows(true);}
});

test('WebSocket rechaza origen ajeno y token falso sin modificar la mesa',async t=>{
 const store=new MemoryStore({secret:'ws-security'}),created=await api(store,'/api/create',{profile:{name:'Fer'}}),s=created.body.session,o=LOBBY_OBJECTS.find(o=>o.id==='table-ttt');Object.assign(store.rooms.get(s.code).players[0],{x:o.x,y:o.y});await api(store,'/api/room',{...s,type:'tableJoin',data:{game:'ttt'}});
 const server=makeServer(store);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,sockets=[];
 t.after(async()=>{sockets.forEach(s=>s.close());await new Promise(r=>setTimeout(r,60));server.closeAllConnections();await new Promise(r=>server.close(r));});
 async function rejected(origin,token){const ws=new WebSocket(base.replace('http:','ws:')+'/api/tables-ws',{headers:{Origin:origin}});sockets.push(ws);return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('La conexión no fue rechazada')),2000);ws.onopen=()=>ws.send(JSON.stringify({type:'subscribe',code:s.code,token}));ws.onerror=()=>{clearTimeout(timer);resolve(true);};ws.onclose=()=>{clearTimeout(timer);resolve(true);};ws.onmessage=e=>{if(JSON.parse(e.data).ready){clearTimeout(timer);reject(Error('Se aceptó una sesión inválida'));}};});}
 await rejected('https://origen-ajeno.invalid',s.token);await rejected(base,'token-falso');assert.equal(store.rooms.get(s.code).tables.list[0].players.length,1);
});
