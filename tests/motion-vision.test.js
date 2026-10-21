import test from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {makeServer} from '../server/node.js';
import {MemoryStore} from '../server/memory-store.js';
import {LOBBY,MAP,FLOORS,TILE,zoneAt,WORLDS} from '../public/content.js';
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

// BETA: los tres mapas tienen una sola planta; el salto legítimo se marca con motionEpoch.
test('teletransportes cortos reinician solo ese personaje, sin cruzar paredes',()=>{
 const p={x:LOBBY.spawn.x,y:LOBBY.spawn.y,floor:0,motionEpoch:1,motionTime:1000,input:{x:1,y:0},alive:true};
 let track=recordRemoteSample(null,p,1050);track=recordRemoteSample(track,{...p,x:p.x+20,motionTime:1100},1150);remoteAt(track,1160,LOBBY);
 const destination={...p,x:p.x+60,motionTime:1200,motionEpoch:2};track=recordRemoteSample(track,destination,1250);assert.equal(track.samples.length,1);assert.equal(remoteAt(track,1250,LOBBY).x,destination.x);
 track=recordRemoteSample(track,{...destination,x:destination.x-40,motionTime:1300,motionEpoch:3},1350);assert.equal(track.samples.length,1);assert.equal(remoteAt(track,1350,LOBBY).x,destination.x-40);
 const old=recordRemoteSample(track,{...p,x:100,motionTime:900},1400);assert.equal(old,track);assert.equal(track.samples[0].time,1300);
});

function fakeCanvas(width,height,log){const ctx=new Proxy({font:'11px Segoe UI',measureText(text){return {width:text.length*parseFloat(this.font.match(/[\d.]+px/)?.[0]||'11')*.58};},createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}}),fillText(text,x,y){log.push({kind:'text',text,x,y,font:this.font});},arc(x,y,r){log.push({kind:'arc',x,y,r});},clip(){log.push({kind:'clip'});},fill(){log.push({kind:'fill'});}},{get(o,k){return k in o?o[k]:()=>{}},set(o,k,v){o[k]=v;return true;}});return {width,height,getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width,height})};}

test('visibilidad sin filtro de sala, borde exacto, paredes y pose interpolada al cambiar zoom/pantalla',()=>{
 // Moss Club: puerta superior de Comunicación. Desde el pasillo se ve a través
 // del hueco; desplazado 2,5 casillas, el muro tapa la misma posición.
 const door=MAP.doors.find(d=>d.room==='comms'&&d.side==='top'),cx=(door.x+door.w/2)*TILE,viewer={x:cx,y:(door.y-1.2)*TILE},inDoor={x:cx,y:(door.y+1.2)*TILE};assert.notEqual(zoneAt(MAP,viewer.x,viewer.y),zoneAt(MAP,inDoor.x,inDoor.y));assert.equal(characterVisible(MAP,viewer,inDoor,420),true);
 assert.equal(characterVisible(MAP,{x:(door.x-2.5)*TILE,y:viewer.y},inDoor,420),false);
 const point={x:27*TILE,y:5*TILE};assert.equal(characterVisible(MAP,point,{x:point.x+419,y:point.y},420),true);assert.equal(characterVisible(MAP,point,{x:point.x+450,y:point.y},420),false);
 const me={id:'self',name:'Yo',floor:0,alive:true,vision:420,tasks:[],...point},other={id:'other',name:'Borde',floor:0,alive:true,x:point.x+600,y:point.y};
 const state={phase:'game',me,players:[me,other],teachers:[],bodies:[],roster:[],chat:[],serverTime:1000,receivedAt:Date.now()},previousDocument=globalThis.document,previousWindow=globalThis.window;
 try{for(const [width,height] of [[640,480],[1920,1080]]){const log=[],canvas=fakeCanvas(width,height,log);globalThis.document={createElement:()=>fakeCanvas(1,1,log)};globalThis.window={devicePixelRatio:1};
   drawWorld(canvas,state,{...me,input:{x:0,y:0}},new Map([['other',{x:point.x+419,y:point.y}]]),{x:point.x,y:point.y},0,1000);
   assert.ok(log.some(op=>op.kind==='text'&&op.text==='Borde'),'la pose representada determina la visibilidad');assert.ok(!log.some(op=>op.kind==='arc'&&op.x===point.x&&op.y===point.y&&op.r===420&&log[log.indexOf(op)+1]?.kind==='clip'),'16.2: sin recorte circular duro alrededor de los personajes (la penumbra la pone la máscara de luz)');
  }}finally{globalThis.document=previousDocument;globalThis.window=previousWindow;}
});

// BETA · Plano holográfico: cada sala con su nombre completo dentro de su
// ancho, rótulos dibujados después de las marcas de tarea y tamaño en píxeles
// CSS independiente de la densidad de la pantalla.
function holoLabels(log,map){return log.filter(op=>op.kind==='text'&&[...map.rooms,...(map.areas||[])].some(r=>r.name===op.text));}
test('minimapa: un rótulo por sala, completo, sin desbordar y encima de las tareas',()=>{
 const previousDocument=globalThis.document;
 try{for(const id of ['club','gym','house']){const floor=WORLDS[id].FLOORS[0],log=[],canvas=fakeCanvas(960,660,log);globalThis.document={createElement:()=>fakeCanvas(1,1,log)};
  const state={phase:'game',config:{map:id},me:{floor:0,color:1,tasks:floor.stations.map(t=>({id:t.id,done:false}))},progress:{}};
  canvas.getContext().measureText=function(t){return {width:t.length*parseFloat(this.font.match(/([\d.]+)px/)[1])*.58};};
  drawMiniMap(canvas,state,{x:floor.spawn.x,y:floor.spawn.y},{mode:'normal',time:0});
  const labels=holoLabels(log,floor),s=Math.min((960-36)/(floor.width*TILE),(660-36)/(floor.height*TILE)),firstLabel=log.indexOf(labels[0]),taskArcs=log.map((op,i)=>[op,i]).filter(([op])=>op.kind==='arc').map(([,i])=>i);
  for(const room of floor.rooms){const own=labels.filter(op=>op.text===room.name);assert.equal(own.length,1,`${id}: ${room.name}`);const size=parseFloat(own[0].font.match(/([\d.]+)px/)[1]);assert.ok(size>=8,`${id}: ${room.name} legible`);assert.ok(room.name.length*size*.58<=room.w*TILE*s-8+.5||size<=8,`${id}: sin desborde ${room.name}`);}
  assert.ok(taskArcs.length&&taskArcs.some(i=>i<firstLabel),`${id}: las tareas se dibujan antes que los nombres`);
 }}finally{globalThis.document=previousDocument;}
});

test('minimapa HiDPI móvil: letras de 12 píxeles CSS, sin reducirlas por la densidad',()=>{const previous=globalThis.document,log=[],canvas=fakeCanvas(780,1300,log);canvas.getBoundingClientRect=()=>({width:390,height:650});globalThis.document={createElement:()=>fakeCanvas(1,1,log)};try{const floor=FLOORS[0];drawMiniMap(canvas,{phase:'game',config:{map:'club'},me:{floor:0,tasks:[]},progress:{}},floor.spawn,{mode:'normal',time:0});const labels=holoLabels(log,floor);assert.ok(labels.length>=floor.rooms.length);assert.ok(labels.some(op=>op.font.includes(' 24px')),'12 px CSS × densidad 2');}finally{globalThis.document=previous;}});

test('plano en tres modos: colores, figuras del localizador y círculos de sabotaje pulsables solo cuando están cargados',()=>{
 const previous=globalThis.document;globalThis.document={createElement:()=>fakeCanvas(1,1,[])};
 try{for(const id of ['club','gym','house']){const w=WORLDS[id],floor=w.FLOORS[0],now=100000;
  const base={phase:'game',config:{map:id},me:{floor:0,color:1,tasks:[],role:'impostor'},progress:{},sabotage:null,doorLocks:[]};
  const strokes=mode=>{const log=[],canvas=fakeCanvas(960,660,log);const ctx=canvas.getContext();const seen=new Set();Object.defineProperty(ctx,'strokeStyle',{set(v){seen.add(v);},get(){return '#000';}});drawMiniMap(canvas,{...base,locator:{signal:true,rooms:{[floor.rooms[0].id]:3}}},floor.spawn,{mode,time:0,serverNow:now});return {seen,canvas,log};};
  assert.ok(strokes('normal').seen.has('#58b6ff'),`${id}: azul en modo normal`);assert.ok(strokes('locator').seen.has('#4fe39a'),`${id}: verde en el localizador`);assert.ok(strokes('sabotage').seen.has('#ff5d6c'),`${id}: rojo en sabotaje`);
  // Recargando: ningún círculo está listo; recargado: todos listos.
  const run=state=>{const canvas=fakeCanvas(960,660,[]);drawMiniMap(canvas,state,floor.spawn,{mode:'sabotage',time:0,serverNow:now});return canvas.__hits;};
  const charging=run({...base,sabotageFrom:now-10000,sabotageReady:now+50000,doorFrom:now-5000,doorReady:now+15000});
  assert.ok(charging.length>=Object.keys(w.SABOTAGES).length+1,`${id}: círculos de averías y de puertas`);assert.ok(charging.every(h=>!h.ready),`${id}: nada pulsable mientras se recarga`);
  assert.ok(charging.some(h=>h.type==='doors')&&charging.some(h=>h.type==='sabotage'),`${id}: dos categorías`);
  const ready=run({...base,sabotageFrom:now-70000,sabotageReady:now-1,doorFrom:now-40000,doorReady:now-1});assert.ok(ready.every(h=>h.ready),`${id}: todo pulsable al recargarse`);
  const doorsOnly=run({...base,sabotageFrom:now-1000,sabotageReady:now+20000,doorFrom:now-40000,doorReady:now-1});assert.ok(doorsOnly.filter(h=>h.type==='doors').every(h=>h.ready)&&doorsOnly.filter(h=>h.type==='sabotage').every(h=>!h.ready),`${id}: categorías independientes`);
 }}finally{globalThis.document=previous;}
});
