import test from 'node:test';import assert from 'node:assert/strict';
import {makeServer} from '../server/node.js';import {tableRealtime} from '../game/engine.js';import {disembarkMs,SHHH_MS,advanceIntro} from '../game/intro.js';import {shhhLayout} from '../public/disembark.js';import {sabotageArrowSpots} from '../public/render.js';
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

// Versión 14: canal en tiempo real de las mesas, presentación SHHH, flechas
// de sabotaje y tiempos de la llegada.

async function lobby(n=2){const store=new MemoryStore({secret:'x'.repeat(40)}),ss=[];const now=Date.now();ss.push((await api(store,'/api/create',{profile:{name:'Ana',color:0}},now)).body.session);for(let i=1;i<n;i++)ss.push((await api(store,'/api/join',{code:ss[0].code,profile:{name:'P'+i,color:i}},now)).body.session);
 const o=LOBBY_OBJECTS.find(o=>o.id==='table-hockey');await store.transact(ss[0].code,room=>{for(const p of room.players)Object.assign(p,{x:o.x,y:o.y,input:{x:0,y:0}});return null;});return {store,ss};}

test('mesas en tiempo real: dos personas emparejadas reciben la vista y la maza se mueve por el canal ligero',async()=>{
 const {store,ss}=await lobby(2),code=ss[0].code;
 for(const s of ss)assert.equal((await api(store,'/api/room',{...s,type:'tableJoin',data:{game:'hockey'}})).status,200);
 let views=await store.transact(code,room=>ss.map(s=>tableRealtime(room,s.token,null,Date.now())));
 assert.equal(views[0].phase,'playing');assert.equal(views[1].phase,'playing');assert.notEqual(views[0].seat,views[1].seat);
 const before=views[0].view.paddles[views[0].seat][1];
 for(let i=0;i<20;i++)await store.transact(code,room=>tableRealtime(room,ss[0].token,{x:80,y:200},Date.now()+i*20));
 const after=await store.transact(code,room=>tableRealtime(room,ss[0].token,null,Date.now()+600));
 assert.ok(after.view.paddles[after.seat][1]>before+20,'la maza sigue el objetivo enviado por el canal');
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
 const state={phase:'game',config:{map:'school',floors:'0'},me:{floor:0,alive:true},sabotage:{kind:'electrical',fixed:[],id:'s'}};
 const limits={top:90,bottom:560,left:26,right:364,boxes:[]};
 for(const [x,y] of [[300,300],[2000,900],[3500,2600],[100,2600]]){const spots=sabotageArrowSpots(state,{x,y},{x,y,scale:.7},390,664,limits);
  for(const s of spots){assert.ok(s.x>=limits.left-1&&s.x<=limits.right+1&&s.y>=limits.top-1&&s.y<=limits.bottom+1);if(!s.near)assert.ok(Math.hypot(s.x-195,s.y-332)>120,'no tapa al personaje');}}
});
