import test from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {StateEncoder,StateDecoder,fixedSteps,FIXED_STEP} from '../public/netcode.js';
import {makeServer} from '../server/node.js';
import {wsReader,wsFrame} from '../server/realtime.js';
import {MemoryStore} from '../server/memory-store.js';
import {createRoom,command,realtimeMotion,tick,snapshot} from '../game/engine.js';
import {worldFor,WORLDS,move,canStand,LOBBY} from '../public/content.js';
import {LOBBY_OBJECTS} from '../public/caravan.js';
import {verifyProgress} from '../game/api.js';
import {recordRemoteSample,remoteAt} from '../public/remote-motion.js';

test('delta protocol: entity removal, order, accessories, private state and missing baselines',()=>{
 const encoder=new StateEncoder(),decoder=new StateDecoder();
 const {room,player}=createRoom({name:'Protocol'},Date.now());
 let s=snapshot(room,player,Date.now());let packet=encoder.encode(s);
 const plain=v=>JSON.parse(JSON.stringify(v));assert.deepEqual(decoder.read(plain(packet)),plain(s));
 command(room,player.token,'addBot',{},Date.now());s=snapshot(room,player,Date.now());packet=encoder.encode(s);assert.deepEqual(decoder.read(plain(packet)),plain(s));
 player.glasses=3;player.x+=1;delete player.abilityVisual;
 s=snapshot(room,player,Date.now());packet=encoder.encode(s);assert.deepEqual(decoder.read(plain(packet)),plain(s));
 room.players.reverse();s=snapshot(room,player,Date.now());assert.deepEqual(decoder.read(plain(encoder.encode(s))),plain(s));
 room.players=room.players.filter(p=>!p.bot);s=snapshot(room,player,Date.now());assert.deepEqual(decoder.read(plain(encoder.encode(s))),plain(s));
 const lost=encoder.encode(s);assert.equal(decoder.read({n:decoder.n}),null);
 assert.throws(()=>decoder.read(encoder.encode(s)),/baseline/);encoder.reset();assert.deepEqual(decoder.read(plain(encoder.encode(s))),plain(s));
 assert.ok(lost.n>0);
});

test('fixed prediction: identical speed and collision results at 10, 30, 60 and 144 FPS on every map',()=>{
 for(const world of Object.values(WORLDS))for(const map of world.FLOORS){
  const results=[];
  for(const fps of [10,30,60,144]){
   const p={...map.spawn},directions=[[1,0],[1,1],[0,-1],[-1,1]];let remainder=0,ticks=0;
   for(let frame=0;frame<fps*4;frame++)remainder=fixedSteps(remainder,1/fps,dt=>{const [x,y]=directions[Math.min(3,Math.floor(ticks++/60))];move(map,p,x,y,dt,false,1.5);assert.ok(canStand(map,p.x,p.y));});
   assert.equal(ticks,240);results.push(p);
  }
  for(const p of results)assert.ok(Math.hypot(p.x-results[0].x,p.y-results[0].y)<1e-7,world.id);
 }
});

test('20 Hz remote interpolation stays continuous with jitter, duplicate and stale samples',()=>{
 const map={width:100,height:40,rooms:[{x:0,y:0,w:100,h:40}],corridors:[],props:[],visionWalls:[]},deliveries=[];
 let arrival=0;
 for(let i=0;i<=80;i++){
  if(i>10&&i%13===0)continue;
  const time=1000+i*50,p={x:500+i*10.25,y:500,alive:true,floor:0,motionTime:time,input:{x:1,y:0}};
  arrival=Math.max(arrival+1,time+100+[0,15,35,5,25][i%5]);deliveries.push({at:arrival,p});
 }
 let track=null,cursor=0,last=null,moving=0,frames=0;
 for(let now=1100;now<5100;now+=1000/60){
  while(cursor<deliveries.length&&deliveries[cursor].at<=now){const d=deliveries[cursor++];track=recordRemoteSample(track,d.p,d.p.motionTime,now);recordRemoteSample(track,d.p,d.p.motionTime,now);if(cursor>2)recordRemoteSample(track,deliveries[cursor-3].p,now,now);}
  const pose=remoteAt(track,now,map);if(!pose)continue;
  if(last&&now>2000){const delta=pose.x-last.x;assert.ok(delta>=-.01&&delta<7,`remote frame discontinuity ${delta}`);if(delta>.1)moving++;frames++;}last=pose;
 }
 assert.ok(moving/frames>.95,'sustained movement between network packets');
});

test('closed-door geometry is stable, bounded and keeps vision/collisions in school, gym and club',()=>{
 for(const name of ['school','gym','club']){
  const world=worldFor(name),base=world.FLOORS[0],ids=base.doors.slice(0,3).map(d=>d.id),s={kind:'doors',closed:ids};
  const first=world.mapFor(0,s);assert.notEqual(first,base);assert.equal(world.mapFor(0,{...s,closed:[...ids].reverse()}),first);
  assert.equal(world.mapFor(0,{...s,closed:[]}),base);
  for(const d of first.props.filter(p=>p.kind==='closed-door'))assert.equal(canStand(first,(d.x+d.w/2)*56,(d.y+d.h/2)*56),false);
 }
});

test('authoritative input: duplicate batches, stale teleport epochs, invalid order and speed limits',()=>{
 const at=Date.now(),{room,player}=createRoom({name:'Inputs'},at);tick(room,at);
 const epoch=player.motionEpoch||0,p={seq:1,epoch,time:at+50,segments:[{x:1,y:0,ms:50}],x:1,y:0};
 realtimeMotion(room,player.token,p,at+50);const x=player.x;realtimeMotion(room,player.token,p,at+60);assert.equal(player.x,x);
 assert.throws(()=>realtimeMotion(room,player.token,{...p,seq:3},at+100),/orden/);
 player.motionEpoch=(player.motionEpoch||0)+1;realtimeMotion(room,player.token,{...p,seq:2},at+100);assert.equal(player.x,x);assert.equal(player.motionSeq,2);
 assert.throws(()=>realtimeMotion(room,player.token,{...p,epoch:player.motionEpoch,seq:3,segments:[{x:1,y:0,ms:3000}]},at+101),/rápido/);
});

function masked(text,opcode=1,fin=true){const bytes=Buffer.from(text),head=Buffer.alloc(bytes.length<126?6:8),offset=bytes.length<126?2:4;head[0]=(fin?128:0)|opcode;head[1]=128|(bytes.length<126?bytes.length:126);if(offset===4)head.writeUInt16BE(bytes.length,2);const mask=Buffer.from([3,5,7,11]);mask.copy(head,offset);for(let i=0;i<bytes.length;i++)bytes[i]^=mask[i&3];return Buffer.concat([head,bytes]);}
test('WebSocket framing: fragmented UTF-8, partial TCP frames, binary ping and oversize rejection',()=>{
 let closed=0;const messages=[],raw=[],read=wsReader(s=>messages.push(s),()=>closed++,b=>raw.push(b));
 const frame=Buffer.concat([masked('{"a":',1,false),masked('"ñ"}',0)]);read(frame.subarray(0,4));read(frame.subarray(4));assert.deepEqual(messages,['{"a":"ñ"}']);
 read(masked(Buffer.from([0,255,7]),9));assert.deepEqual(raw[0],wsFrame(Buffer.from([0,255,7]),10));
 read(masked('x'.repeat(8193)));assert.equal(closed,1);
 let invalid=0;wsReader(()=>{},()=>invalid++,()=>{})(wsFrame('unmasked'));assert.equal(invalid,1);
 assert.equal(wsFrame('x'.repeat(70000))[1],127);
});

async function fixture(t){
 const store=new MemoryStore({secret:'realtime-tests'}),server=makeServer(store);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin=`http://127.0.0.1:${server.address().port}`,sockets=[];
 const post=async(path,body)=>{const r=await fetch(origin+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),data=await r.json();assert.equal(r.status,200,data.error);return data;};
 t.after(async()=>{for(const socket of sockets)socket.close();server.closeRealtime();server.closeAllConnections();await new Promise(r=>server.close(r));});
 async function connect(session,latency=0,table=false){
  const socket=new WebSocket(`${origin.replace('http:','ws:')}/api/${table?'table':'game'}-ws?code=${session.code}&token=${session.token}`);sockets.push(socket);
  const client={socket,decoder:new StateDecoder(),states:[],messages:[],state:null,received:0,lastDelivery:0,timers:new Set(),errors:[]};
  socket.addEventListener('error',e=>client.errors.push(e.message));
  socket.addEventListener('message',event=>{const msg=JSON.parse(event.data);client.received+=event.data.length;client.messages.push(msg);
   // TCP preserves delivery order even under jitter. Delay arrival independently
   // of outgoing input instead of awaiting a response to send the next batch.
   const arrival=Math.max(Date.now()+latency,client.lastDelivery+1);client.lastDelivery=arrival;
   const timer=setTimeout(()=>{client.timers.delete(timer);if(msg.t==='state'){const s=client.decoder.read(msg);if(s){client.state=s;client.states.push({state:s,at:Date.now()});}}},Math.max(0,arrival-Date.now()));client.timers.add(timer);
  });
  client.send=msg=>{const timer=setTimeout(()=>{client.timers.delete(timer);if(socket.readyState===1)socket.send(JSON.stringify(msg));},latency);client.timers.add(timer);};
  t.after(()=>{for(const timer of client.timers)clearTimeout(timer);});
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('WS handshake timeout')),3000);socket.addEventListener('open',()=>{clearTimeout(timer);resolve();},{once:true});socket.addEventListener('error',()=>{clearTimeout(timer);reject(Error('WS handshake failed'));},{once:true});});
  if(!table)for(let i=0;i<80&&!client.state;i++)await delay(10);
  if(!table)assert.ok(client.state,'received initial state');return client;
 }
 return {store,server,origin,post,connect};
}

test('four real WebSocket clients at RTT 0/80/200/400 ms: 20 Hz independent of RTT, exact replay, stop and action ordering',async t=>{
 const f=await fixture(t),created=await f.post('/api/create',{profile:{name:'Realtime 0',color:0},visibility:'private'}),sessions=[created.session];
 for(let i=1;i<4;i++)sessions.push((await f.post('/api/join',{code:sessions[0].code,profile:{name:`Realtime ${i}`,color:i}})).session);
 const clients=[];for(let i=0;i<4;i++)clients.push(await f.connect(sessions[i],[0,40,100,200][i]));
 const room=f.store.rooms.get(sessions[0].code),expected=room.players.map(p=>({x:p.x,y:p.y,facing:p.facing}));
 const counts=clients.map(c=>c.states.length),start=Date.now();
 for(let seq=1;seq<=30;seq++){
  const axis=seq<=10?{x:1,y:0}:seq<=20?{x:0,y:1}:{x:-1,y:0};
  for(let i=0;i<4;i++){
   const segments=Array.from({length:3},()=>({...axis,ms:FIXED_STEP*1000}));
   for(const step of segments)move(LOBBY,expected[i],step.x,step.y,FIXED_STEP);
   clients[i].send({t:'input',motion:{seq,epoch:clients[i].state.me.motionEpoch,time:Date.now(),segments,...axis}});
  }
  await delay(Math.max(0,start+seq*50-Date.now()));
 }
 clients.forEach((c,i)=>c.send({t:'input',motion:{seq:31,epoch:c.state.me.motionEpoch,time:Date.now(),segments:[],x:0,y:0}}));
 await delay(650);
 const final=f.store.rooms.get(sessions[0].code);
 for(let i=0;i<4;i++){
  assert.equal(clients[i].state.me.motionSeq,31);const actual=final.players[i];assert.ok(Math.hypot(actual.x-expected[i].x,actual.y-expected[i].y)<1e-6);
  assert.equal(actual.input.x,0);assert.equal(actual.input.y,0);
  const observed=clients[(i+1)%4].state.players.find(p=>p.id===actual.id);assert.equal(observed.x,actual.x);assert.equal(observed.y,actual.y);
  assert.ok(clients[i].states.length-counts[i]>=35,'push snapshots keep flowing despite RTT');
  assert.equal(clients[i].errors.length,0);assert.ok(!clients[i].messages.some(m=>m.t==='error'));
 }
 const stopped=final.players.map(p=>[p.x,p.y]);await delay(150);assert.deepEqual(final.players.map(p=>[p.x,p.y]),stopped);
 clients[0].send({t:'action',id:1,type:'configure',data:{speed:1.25}});await delay(150);
 assert.equal(clients[0].messages.find(m=>m.t==='result'&&m.id===1)?.status,200);assert.equal(f.store.rooms.get(sessions[0].code).config.speed,1.25);
 assert.ok(f.server.gameMetrics.snapshots>120);
});

test('reconnect uses authoritative ack; lost replies do not repeat displacement; HTTP fallback still works',async t=>{
 const f=await fixture(t),created=await f.post('/api/create',{profile:{name:'Reconnect'}}),session=created.session,c=await f.connect(session);
 const packet={seq:1,epoch:c.state.me.motionEpoch,time:Date.now(),segments:[{x:1,y:0,ms:50}],x:0,y:0};
 c.send({t:'input',motion:packet});await delay(80);const x=f.store.rooms.get(session.code).players[0].x;c.socket.close();
 const again=await f.connect(session);assert.equal(again.state.me.motionSeq,1);again.send({t:'input',motion:packet});await delay(60);assert.equal(f.store.rooms.get(session.code).players[0].x,x);
 const result=await f.post('/api/room',{...session,type:'pulse',data:{_motion:{...packet,seq:2,time:Date.now()}}});assert.equal(result.state.me.motionSeq,2);assert.ok(result.state.me.x>x);
});

test('a backpressured socket does not delay another player and authentication rejects invalid sessions',async t=>{
 const f=await fixture(t),a=await f.post('/api/create',{profile:{name:'Fast'}}),b=await f.post('/api/join',{code:a.session.code,profile:{name:'Slow'}});
 f.server.on('upgrade',(req,socket)=>{if(req.url.includes(b.session.token))Object.defineProperty(socket,'writableLength',{get:()=>100000});});
 const fast=await f.connect(a.session),slow=new WebSocket(`${f.origin.replace('http:','ws:')}/api/game-ws?code=${b.session.code}&token=${b.session.token}`);slow.addEventListener('error',()=>{});t.after(()=>slow.close());
 const count=fast.states.length;await delay(350);assert.ok(fast.states.length-count>=5);assert.ok(f.server.gameMetrics.skipped>0);
 const bad=new WebSocket(`${f.origin.replace('http:','ws:')}/api/game-ws?code=${a.session.code}&token=invalid-token`);
 await new Promise(resolve=>{bad.addEventListener('error',resolve,{once:true});});assert.notEqual(bad.readyState,1);bad.close();
});

test('original table WebSocket remains compatible',async t=>{
 const f=await fixture(t),created=await f.post('/api/create',{profile:{name:'Tables'}}),session=created.session;
 const room=f.store.rooms.get(session.code),object=LOBBY_OBJECTS.find(o=>o.id==='table-hockey');assert.ok(object);Object.assign(room.players[0],{x:object.x,y:object.y});
 const result=await f.post('/api/room',{...session,type:'tableJoin',data:{game:'hockey'}});assert.equal(result.state.table.game,'hockey');
 const client=await f.connect(session,0,true);client.send({x:.5,y:.5});await delay(120);assert.ok(client.messages.some(m=>m.t==='view'&&m.view?.game==='hockey'));
});

test('a timer-ended game signs season progress over WebSocket without an HTTP pulse',async t=>{
 const f=await fixture(t),created=await f.post('/api/create',{profile:{name:'Season pass'}}),session=created.session,client=await f.connect(session);
 const room=f.store.rooms.get(session.code);room.phase='ended';room.result={winner:'crew',reason:'QA',time:Date.now()};room.players[0].progress.xp=123;
 await delay(180);assert.ok(client.state.me.passToken);const progress=await verifyProgress(f.store,client.state.me.passToken);assert.equal(progress.xp,123);
});

test('large bot catch-up is bounded and retains the outstanding simulation time',()=>{
 const now=Date.now(),{room,player}=createRoom({name:'Catch-up'},now);command(room,player.token,'addBot',{},now);
 room.simulatedAt=now-600000;room.botFrameAt=room.simulatedAt;tick(room,now);
 assert.ok(room.simulatedAt>now-600000);assert.ok(room.simulatedAt<=now-584000,'maximum 32 catch-up steps per call');
});

// 15.0 · Compensación de latencia en asesinatos (rebobinado del servidor).
test('asesinato con latencia: el servidor rebobina dentro de límites estrictos',async()=>{
 const {createRoom,command,recordTrail,positionAt,MAX_REWIND_MS}=await import('../game/engine.js');
 const {WORLDS,canStand,KILL_RANGE,TILE}=await import('../public/content.js');
 let now=Date.now();const {room,player}=createRoom({name:'Humano'},now);for(let i=1;i<4;i++)command(room,player.token,'addBot',{},now);
 command(room,player.token,'configure',{map:'gym'},now);command(room,player.token,'start',{},now);
 room.players.forEach((p,i)=>{p.bot=false;p.role=i===0?'impostor':'crew';p.specialRole=null;p.lastSeen=now;p.killReady=0;p.items=p.items||{};});
 Object.assign(room,{intro:null,revealUntil:0,roleRevealAt:0,travelUntil:0,sabotageReady:Infinity,shieldNullUntil:0});
 const map=WORLDS.gym.FLOORS[0];let spot=null;
 for(let y=4;y<map.height-4&&!spot;y+=.5)for(let x=4;x<map.width-4&&!spot;x+=.5){const a={x:x*TILE,y:y*TILE};if([0,60,150,900].every(d=>canStand(map,a.x+d,a.y)))spot=a;}
 assert.ok(spot,'zona libre');
 const imp=room.players[0],victim=room.players[1],t0=now-400;
 const reset=()=>{Object.assign(imp,{x:spot.x,y:spot.y,floor:0,vent:null,transition:null,input:{x:0,y:0}});Object.assign(victim,{alive:true,x:spot.x+60,y:spot.y,floor:0,vent:null,_hist:[]});recordTrail(victim,t0);victim.x=spot.x+150;recordTrail(victim,now);};
 reset();assert.deepEqual([positionAt(victim,t0).x,positionAt(victim,t0).y],[spot.x+60,spot.y]);
 const kill=data=>{try{command(room,imp.token,'kill',{target:victim.id,...data},now);return victim.alive===false;}catch{return false;}};
 assert.equal(kill({}),false,'sin rebobinado la víctima ya está fuera de alcance');
 reset();assert.equal(kill({view:{t:t0,x:spot.x+60,y:spot.y}}),true,'lo que veía el atacante (400 ms antes) cuenta');
 reset();imp.killReady=0;assert.equal(kill({view:{t:now-MAX_REWIND_MS-50,x:spot.x+60,y:spot.y}}),false,'demasiado antiguo');
 reset();imp.killReady=0;assert.equal(kill({view:{t:t0,x:spot.x+140,y:spot.y}}),false,'posición declarada incoherente con el historial');
 reset();imp.killReady=0;assert.equal(kill({view:{t:now+50,x:spot.x+60,y:spot.y}}),false,'marca de tiempo futura');
 reset();imp.killReady=0;imp.netRtt=40;assert.equal(kill({view:{t:t0,x:spot.x+60,y:spot.y}}),false,'el rebobinado se limita por la latencia medida');
 reset();imp.killReady=0;victim.x=spot.x+900;assert.equal(kill({view:{t:t0,x:spot.x+60,y:spot.y}}),false,'una víctima ya lejísimos no se puede matar');
 assert.ok(KILL_RANGE===90,'el alcance no se ha ampliado');
});
