import test from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {makeServer} from '../server/node.js';
import {MemoryStore} from '../server/memory-store.js';
import {LOBBY,MAP,FLOORS,TILE,zoneAt} from '../public/content.js';
import {recordRemoteSample,remoteAt,poseAt} from '../public/remote-motion.js';
import {characterVisible,drawWorld,drawMiniMap} from '../public/render.js';

test('cuatro clientes HTTP: la hora de una posición no cambia al repetirla y el dibujo es continuo con entregas irregulares',async()=>{
 const store=new MemoryStore(),server=makeServer(store);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`,clients=[];
 const post=async(path,body)=>{const response=await fetch(origin+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),data=await response.json();assert.equal(response.status,200,data.error);return data;};
 const send=(i,data={})=>post('/api/room',{...clients[i],type:'pulse',data});
 try{
  const created=await post('/api/create',{profile:{name:'Móvil',color:0}});clients.push(created.session);
  for(let i=1;i<4;i++)clients.push((await post('/api/join',{code:created.session.code,profile:{name:`Vista ${i}`,color:i}})).session);
  const movingId=created.state.me.id,first=(await send(1)).state.players.find(p=>p.id===movingId),deliveries=[{at:first.motionTime+20,player:first}];
  let track=recordRemoteSample(null,first,first.motionTime+20);
  for(let i=0;i<3;i++){const state=(await send(i+1)).state,p=state.players.find(q=>q.id===movingId);assert.equal(p.motionTime,first.motionTime);track=recordRemoteSample(track,p,state.serverTime);}
  assert.equal(track.samples.length,1,'las lecturas de otros clientes no crean paradas');
  let seq=1;
  for(const [index,ms] of [65,135,55,95,70].entries()){
   await delay(ms);const movement=await send(0,{_motion:{seq:seq++,segments:[{x:1,y:0,ms}],x:1,y:0}});
   const readers=await Promise.all([1,2,3].map(i=>send(i))),poses=readers.map(r=>r.state.players.find(p=>p.id===movingId));
   for(const p of poses){assert.equal(p.x,movement.state.me.x);assert.equal(p.motionTime,poses[0].motionTime);}
   deliveries.push({at:poses[0].motionTime+[35,60,18,45,24][index],player:poses[0]});
   deliveries.push({at:poses[0].motionTime+70,player:poses[0]});
  }
  deliveries.sort((a,b)=>a.at-b.at);track=null;let cursor=0,last=null,movingFrames=0,totalFrames=0;
  for(let time=deliveries[0].at;time<=deliveries.at(-1).at;time+=1000/60){
   while(cursor<deliveries.length&&deliveries[cursor].at<=time){const delivery=deliveries[cursor++];track=recordRemoteSample(track,delivery.player,delivery.at);}
   const pose=remoteAt(track,time,LOBBY);if(!pose)continue;
   if(last){const step=pose.x-last.x;assert.ok(step>=-.01,'el cursor no retrocede por una respuesta repetida');assert.ok(step<7,`sin salto entre fotogramas: ${JSON.stringify({step,time,playhead:track.playhead,samples:track.samples})}`);if(step>.1)movingFrames++;totalFrames++;}last=pose;
  }
  assert.ok(movingFrames/totalFrames>.6,'el movimiento se dibuja entre entregas de red');
  const stopped=(await send(0,{_motion:{seq:seq++,segments:[],x:0,y:0}})).state.me;
  const seen=(await send(2)).state.players.find(p=>p.id===movingId);track=recordRemoteSample(track,seen,seen.motionTime);
  assert.equal(poseAt(track.samples,seen.motionTime+500,LOBBY).x,stopped.x,'sin deriva tras la parada');
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

test('teletransportes cortos y cambios de planta reinician solo ese personaje, sin cruzar paredes',()=>{
 const p={x:LOBBY.spawn.x,y:LOBBY.spawn.y,floor:0,motionEpoch:1,motionTime:1000,input:{x:1,y:0},alive:true};
 let track=recordRemoteSample(null,p,1050);track=recordRemoteSample(track,{...p,x:p.x+20,motionTime:1100},1150);remoteAt(track,1160,LOBBY);
 const destination={...p,x:p.x+60,motionTime:1200,motionEpoch:2};track=recordRemoteSample(track,destination,1250);assert.equal(track.samples.length,1);assert.equal(remoteAt(track,1250,LOBBY).x,destination.x);
 track=recordRemoteSample(track,{...destination,floor:1,x:500,motionTime:1300},1350);assert.equal(track.samples.length,1);assert.equal(remoteAt(track,1350,FLOORS[1]).x,500);
 const old=recordRemoteSample(track,{...p,x:100,motionTime:900},1400);assert.equal(old,track);assert.equal(track.samples[0].time,1300);
});

function fakeCanvas(width,height,log){const ctx=new Proxy({font:'11px Segoe UI',measureText(text){return {width:text.length*parseFloat(this.font.match(/[\d.]+px/)?.[0]||'11')*.58};},createRadialGradient:()=>({addColorStop(){}}),fillText(text,x,y){log.push({kind:'text',text,x,y,font:this.font});},arc(x,y,r){log.push({kind:'arc',x,y,r});},clip(){log.push({kind:'clip'});}},{get(o,k){return k in o?o[k]:()=>{}},set(o,k,v){o[k]=v;return true;}});return {width,height,getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width,height})};}

test('visibilidad sin filtro de sala, borde exacto, paredes y pose interpolada al cambiar zoom/pantalla',()=>{
 const viewer={x:50.5*TILE,y:14.5*TILE},inDoor={x:50.5*TILE,y:16.5*TILE};assert.notEqual(zoneAt(MAP,viewer.x,viewer.y),zoneAt(MAP,inDoor.x,inDoor.y));assert.equal(characterVisible(MAP,viewer,inDoor,420),true);
 assert.equal(characterVisible(MAP,{x:46.5*TILE,y:14.5*TILE},inDoor,420),false);
 const point={x:20*TILE,y:25*TILE};assert.equal(characterVisible(MAP,point,{x:point.x+419,y:point.y},420),true);assert.equal(characterVisible(MAP,point,{x:point.x+450,y:point.y},420),false);
 const me={id:'self',name:'Yo',floor:0,alive:true,vision:420,tasks:[],...point},other={id:'other',name:'Borde',floor:0,alive:true,x:point.x+600,y:point.y};
 const state={phase:'game',me,players:[me,other],teachers:[],bodies:[],roster:[],chat:[],serverTime:1000,receivedAt:Date.now()},previousDocument=globalThis.document,previousWindow=globalThis.window;
 try{for(const [width,height] of [[640,480],[1920,1080]]){const log=[],canvas=fakeCanvas(width,height,log);globalThis.document={createElement:()=>fakeCanvas(1,1,log)};globalThis.window={devicePixelRatio:1};
   drawWorld(canvas,state,{...me,input:{x:0,y:0}},new Map([['other',{x:point.x+419,y:point.y}]]),{x:point.x,y:point.y},0,1000);
   assert.ok(log.some(op=>op.kind==='text'&&op.text==='Borde'),'la pose representada determina la visibilidad');assert.ok(log.some(op=>op.kind==='arc'&&op.x===point.x&&op.y===point.y&&op.r===420),'el sprite se recorta con el radio mundial del círculo');
  }}finally{globalThis.document=previousDocument;globalThis.window=previousWindow;}
});

test('minimapa: misma fuente, dos líneas completas y nombres por encima de los indicadores de misión',()=>{
 const previousDocument=globalThis.document;
 try{for(const floor of FLOORS){const log=[],canvas=fakeCanvas(960,660,log);globalThis.document={createElement:()=>fakeCanvas(1,1,log)};
  const state={phase:'game',me:{floor:floor.floor,tasks:floor.stations.map(t=>({id:t.id,done:false}))}};drawMiniMap(canvas,state,{x:floor.spawn.x,y:floor.spawn.y},floor.floor);
  const texts=log.filter(op=>op.kind==='text'),lastMission=log.findLastIndex(op=>op.kind==='text'&&op.text==='◆');assert.ok(lastMission>=0);
  const s=Math.min((960-50)/(floor.width*TILE),(660-50)/(floor.height*TILE));
  for(const room of floor.rooms){const x=(room.x+room.w/2)*TILE,y=(room.y+room.h/2)*TILE,lines=texts.filter(op=>Math.abs(op.x-x)<.01&&Math.abs(op.y-y)<30/s&&op.font===`700 ${11/s}px Segoe UI`);
   assert.ok(lines.length===1||lines.length===2,room.name);assert.equal(lines.map(line=>line.text).join(' '),room.name);for(const line of lines){assert.ok(line.text.length*11/s*.58<=room.w*TILE-12/s+.1,`sin desborde: ${room.name}`);assert.ok(log.indexOf(line)>lastMission,'la misión se dibuja antes del nombre');}
  }
 }}finally{globalThis.document=previousDocument;}
});
