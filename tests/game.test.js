import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import {api} from '../game/api.js';
import {MemoryStore} from '../server/memory-store.js';
import {D1Store} from '../server/d1-store.js';
import {makeServer} from '../server/node.js';
import {MAP,LOBBY,MEETING,FLOORS,STATIONS,REPAIRS,VENTS,VENT_GROUPS,SABOTAGES,DOORS,COLORS,COLOR_NAMES,HATS,SKINS,ACCESSORIES,GLASSES,BAGS,PANTS,HAIR_COLORS,SKIN_TONES,SHOES,BADGES,HAIR_PALETTE,SKIN_PALETTE,taskStation,mapFor,TILE,canStand,detentionMap,move,distance,lineOfSight,visionLineOfSight,insideStairs,zoneAt} from '../public/content.js';
import {sabotageDestination,routeTo,guideAngle} from '../public/navigation.js';
import {arrivalPose,arrivalCamera,drawArrival} from '../public/arrival.js';
import {expulsionPose,terraceCamera,terraceMarkup,animateTerrace,KICK_TIME} from '../public/expulsion.js';
import {drawAvatar,drawHero,robotSVG} from '../public/characters.js';
import {drawWorld,drawMiniMap,worldPoint,characterVisible} from '../public/render.js';
import {recordRemoteSample,remoteAt,poseAt,REMOTE_DELAY_MS,MAX_EXTRAPOLATION_MS} from '../public/remote-motion.js';

async function roomFixture(n=4){const store=new MemoryStore(),time={now:Date.now()},clients=[];const r=await api(store,'/api/create',{profile:{name:'Explorador 0',color:0}},time.now);assert.equal(r.status,200);clients.push(r.body.session);for(let i=1;i<n;i++){const r2=await api(store,'/api/join',{code:clients[0].code,profile:{name:`Explorador ${i}`,color:i}},time.now);assert.equal(r2.status,200);clients.push(r2.body.session);}const send=(i,type,data={})=>api(store,'/api/room',{...clients[i],type,data},time.now);const raw=()=>store.rooms.get(clients[0].code);const keep=()=>raw().players.forEach(p=>p.lastSeen=time.now);return {store,time,clients,send,raw,keep};}
async function start(f){assert.equal((await f.send(0,'configure',{tasks:2,discussion:5,voting:15})).status,200);assert.equal((await f.send(0,'start')).status,200);f.time.now+=41000;f.keep();return f.raw();}
const indexOf=(f,p)=>f.raw().players.findIndex(q=>q.id===p.id);

test('expulsión: espera en el borde, contacto de la patada y caída acelerada hacia abajo',()=>{
 for(const t of [0,500,KICK_TIME-1]){const p=expulsionPose(t);assert.equal(p.y,0);assert.equal(p.rotation,0);assert.equal(p.impact,false);}
 assert.equal(expulsionPose(KICK_TIME).footX,0);assert.equal(expulsionPose(KICK_TIME).impact,true);
 let previous=0;for(let t=KICK_TIME;t<=3400;t+=100){const p=expulsionPose(t);assert.ok(p.y>=previous);assert.ok(Number.isFinite(p.x+p.y+p.rotation+p.footX));previous=p.y;}
 assert.ok(expulsionPose(3400).y>300);assert.equal(expulsionPose(3400).footOpacity,0);
});
test('expulsión: conserva el aspecto y omite pie y jugador cuando el resultado no expulsa',()=>{
 const subject={color:10,outfitColor:3,trimColor:6,hat:15,skin:9,bag:2,accessory:10};
 const scene=terraceMarkup(subject);assert.ok(scene.includes(robotSVG(subject).replace('<svg ','<svg x="0" y="0" width="72" height="95" ')));
 const skip=terraceMarkup(null);assert.ok(!skip.includes('terrace-player'));assert.ok(!skip.includes('terrace-foot'));assert.doesNotThrow(()=>animateTerrace({querySelector:()=>null},4000));
});
test('expulsión: actualiza cada fotograma y soporta saltos de tiempo sin dejar la patada en pantalla',()=>{
 const attributes={};const root={querySelector:name=>({setAttribute:(key,value)=>{attributes[name+key]=value;}})};
 animateTerrace(root,1400);assert.equal(attributes['.terrace-impactopacity'],1);
 animateTerrace(root,4500);assert.equal(attributes['.terrace-footopacity'],0);assert.equal(attributes['.terrace-impactopacity'],0);assert.match(attributes['.terrace-playertransform'],/translate\(155 345\)/);
});
function setPosition(f,p,x,y,floor=0){const q=f.raw().players.find(q=>q.id===p.id);Object.assign(q,{x,y,floor,vent:null,transition:null,input:{x:0,y:0},moveAt:f.time.now});}
function answer(task){const c=task.challenge;switch(task.kind){case 'chalk':return c.dirt;case 'papers':return c.papers;case 'desks':case 'lights':return c.rotations.map(()=>0);case 'wires':case 'german':return [0,1,2,3].map(i=>c.order.indexOf(i));case 'computer':return c.target;case 'documents':case 'delivery':case 'exams':case 'folders':return [...c.samples].sort((a,b)=>a-b);case 'supplies':return c.items;case 'bell':return c.sequence;case 'book':return c.target;case 'bath':return c.levels;case 'code':return c.code;}}

test('el menú dibuja cabeza y vestuario completo sin detener el cliente',()=>{
 const colors=[],ctx=new Proxy({},{get(o,k){return k in o?o[k]:(...args)=>{if(k==='fill'||k==='stroke'||k==='fillRect')colors.push(o.fillStyle,o.strokeStyle);};},set(o,k,v){o[k]=v;return true;}});
 const canvas={width:160,height:175,getContext:()=>ctx};
 for(let skin=0;skin<7;skin++){
  const p={name:'Jugador',color:8,outfitColor:3,trimColor:6,skin,hat:4,pants:1,glasses:2,bag:1,accessory:1};
  assert.doesNotThrow(()=>drawAvatar(canvas,p,1000),`prenda ${skin}`);
  const svg=robotSVG(p);assert.ok(svg.includes(`fill="${COLORS[8]}"`));assert.ok(svg.includes(COLORS[3]));assert.ok(svg.includes(COLORS[6]));
 }
 assert.ok(colors.includes(COLORS[8]),'cabeza');assert.ok(colors.includes(COLORS[3]),'ropa principal');assert.ok(colors.includes(COLORS[6]),'ropa secundaria');
 assert.doesNotThrow(()=>drawHero(canvas,1000));
});


test('mapa escolar: las dos plantas, todas las tareas, conductos, escaleras y reparaciones son transitables y están conectados',()=>{
 for(const map of FLOORS){const seen=new Set(),queue=[[Math.floor(map.spawn.x/TILE),Math.floor(map.spawn.y/TILE)]];while(queue.length){const [x,y]=queue.shift(),k=x+','+y;if(seen.has(k)||!canStand(map,(x+.5)*TILE,(y+.5)*TILE))continue;seen.add(k);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])queue.push([x+dx,y+dy]);}
  for(const r of map.rooms)assert.ok([...seen].some(k=>{const [x,y]=k.split(',').map(Number);return x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h;}),`habitación ${map.floor} ${r.id}`);
  for(const p of [...map.stations,...map.repair,...map.vents,...map.stairs,...STATIONS.filter(s=>s.delivery?.floor===map.floor).map(s=>s.delivery)]){assert.ok(canStand(map,p.x,p.y),`colisión ${p.id}`);assert.ok([...seen].some(k=>{const [x,y]=k.split(',').map(Number);return Math.hypot((x+.5)*TILE-p.x,(y+.5)*TILE-p.y)<100&&lineOfSight(map,{x:(x+.5)*TILE,y:(y+.5)*TILE},p);}),`acceso ${map.floor} ${p.id}`);}
 }
 assert.ok(canStand(LOBBY,LOBBY.spawn.x,LOBBY.spawn.y));
});
test('plano orientativo: corredor ancho, salas señalizadas y visión a través de muebles',async()=>{
 assert.ok(FLOORS.every(map=>map.corridors.some(c=>c.w>=5&&c.h>=20)));
 assert.ok(FLOORS.every(map=>map.doors.every(d=>d.w>=3||d.h>=3)));
 const map=FLOORS[1],desk=map.props.find(p=>p.kind==='desk'),a={x:(desk.x-.4)*TILE,y:(desk.y+.4)*TILE},b={x:(desk.x+desk.w+.4)*TILE,y:a.y};
 assert.equal(lineOfSight(map,a,b),false);assert.equal(visionLineOfSight(map,a,b),true);
 const wallA={x:31*TILE,y:22*TILE},wallB={x:42*TILE,y:22*TILE};
 assert.equal(visionLineOfSight(map,wallA,wallB),false);
 const f=await roomFixture();await start(f);const p=f.raw().players[0],target=f.raw().players[1],i=indexOf(f,p);
 setPosition(f,p,a.x,a.y,1);setPosition(f,target,b.x,b.y,1);
 assert.ok((await f.send(i,'pulse')).body.state.players.some(q=>q.id===target.id));
});
test('cada umbral permanece libre; despachos en el pasillo de Recepción; escaleras utilizables en toda la estancia',async()=>{
 const ground=FLOORS[0],red=ground.rooms.find(r=>r.id==='red'),reception=ground.rooms.find(r=>r.id==='reception');
 assert.equal(red.door,'right');assert.equal(reception.door,'left');
 assert.ok(ground.rooms.filter(r=>r.id.startsWith('office')||r.id==='meeting').some(r=>r.door==='top'));
 for(const map of FLOORS)for(const d of map.doors){
  const cx=(d.x+d.w/2)*TILE,cy=(d.y+d.h/2)*TILE,vertical=d.h>d.w;
  for(let t=-1.1;t<=1.1;t+=.1)assert.ok(canStand(map,cx+(vertical?t*TILE:0),cy+(vertical?0:t*TILE)),`${map.floor} ${d.room} ${t.toFixed(1)}`);
 }
 const f=await roomFixture();await start(f);const p=f.raw().players.find(p=>p.role==='crew'),i=indexOf(f,p),stair=ground.stairs[0];
 const positions=[[stair.area.x+.5,stair.area.y+1.2],[stair.area.x+stair.area.w-.5,stair.area.y+stair.area.h-1.2]];
 for(const [x,y] of positions){assert.ok(canStand(ground,x*TILE,y*TILE));setPosition(f,p,x*TILE,y*TILE,0);assert.ok(insideStairs(f.raw().players[i],stair));assert.equal((await f.send(i,'stairs',{id:stair.id})).status,200);f.time.now+=800;f.keep();}
});
test('planta 0: dos recorridos separados desde el Salón rojo y diez tareas por jugador',async()=>{
 const map=FLOORS[0],redDoors=map.doors.filter(d=>d.room==='red');
 assert.equal(redDoors.length,2);assert.equal(map.rooms.find(r=>r.id==='red').y+map.rooms.find(r=>r.id==='red').h,23);
 assert.deepEqual(redDoors.map(d=>d.y).sort((a,b)=>a-b),[11,22]);
 assert.ok(map.corridors.some(c=>c.y===11&&c.x===15&&c.x+c.w===53));
 assert.ok(map.corridors.some(c=>c.y===23&&c.x===2&&c.x+c.w===68));
 assert.ok(map.rooms.filter(r=>r.id.startsWith('office')||r.id==='meeting').every(r=>r.y+r.h<=23));
 assert.ok(map.doors.filter(d=>['office4','office5','office6','meeting'].includes(d.room)).every(d=>d.side==='top'));
 assert.ok(map.doors.filter(d=>d.room==='reception').some(d=>d.side==='bottom'&&d.y===22));
 assert.ok(STATIONS.length>=25);
 const f=await roomFixture();assert.equal(f.raw().config.tasks,10);await start(f);
 for(const p of f.raw().players){assert.equal(p.tasks.length,2);assert.equal(new Set(p.tasks.map(t=>t.id)).size,2);}
 const g=await roomFixture();assert.equal((await g.send(0,'configure',{tasks:10})).status,200);assert.equal((await g.send(0,'start')).status,200);
 for(const p of g.raw().players){assert.equal(p.tasks.length,10);assert.equal(new Set(p.tasks.map(t=>t.id)).size,10);}
});
test('roles: empollón privado, delegado decisivo correcto o fallido e ingeniero entre plantas',async()=>{
 const f=await roomFixture(5);await start(f);
 const roles=f.raw().players.filter(p=>p.role==='crew'),assigned=roles.map(p=>p.specialRole).filter(Boolean);assert.equal(assigned.length,new Set(assigned).size);assert.ok(assigned.every(r=>['nerd','delegate','engineer','plug','believer'].includes(r)));roles.forEach((p,i)=>p.specialRole=['nerd','delegate','engineer',null][i]);
 const nerd=roles.find(p=>p.specialRole==='nerd'),delegate=roles.find(p=>p.specialRole==='delegate'),engineer=roles.find(p=>p.specialRole==='engineer'),impostor=f.raw().players.find(p=>p.role==='impostor');
 const other=(await f.send(indexOf(f,impostor),'pulse')).body.state;assert.ok([null,'phantom','copier'].includes(other.me.specialRole));assert.ok(!JSON.stringify(other.roster).includes('nerd'));
 const self=(await f.send(indexOf(f,nerd),'pulse')).body.state;assert.equal(self.me.specialRole,'nerd');
 const vent=VENTS.find(v=>v.id==='office5'),destination=VENTS.find(v=>v.id==='library');setPosition(f,engineer,vent.x,vent.y);assert.equal((await f.send(indexOf(f,engineer),'enterVent',{id:vent.id})).status,200);
 f.time.now+=800;f.keep();assert.equal((await f.send(indexOf(f,engineer),'travelVent',{id:destination.id})).status,200);assert.equal(f.raw().players[indexOf(f,engineer)].floor,1);
 f.time.now+=800;f.keep();assert.equal((await f.send(indexOf(f,engineer),'exitVent')).status,200);
 setPosition(f,nerd,vent.x,vent.y);assert.equal((await f.send(indexOf(f,nerd),'enterVent',{id:vent.id})).status,403);
 setPosition(f,delegate,MAP.emergency.x,MAP.emergency.y);assert.equal((await f.send(indexOf(f,delegate),'emergency')).status,200);f.time.now+=6000;f.keep();
 assert.equal((await f.send(indexOf(f,impostor),'delegateVote',{target:nerd.id})).status,403);
 const wrong=await f.send(indexOf(f,delegate),'delegateVote',{target:nerd.id});assert.equal(wrong.status,200);assert.equal(wrong.body.state.meeting.result.expelled.id,delegate.id);assert.equal(wrong.body.state.meeting.stage,'result');
 assert.equal((await f.send(indexOf(f,delegate),'delegateVote',{target:impostor.id})).status,400);
 f.time.now+=10000;f.keep();assert.equal((await f.send(indexOf(f,nerd),'pulse')).body.state.phase,'game');

 const g=await roomFixture(7);assert.equal((await g.send(0,'configure',{impostors:2,discussion:5})).status,200);assert.equal((await g.send(0,'start')).status,200);g.time.now+=15000;g.keep();g.raw().players.find(p=>p.role==='crew').specialRole='delegate';
 const judge=g.raw().players.find(p=>p.specialRole==='delegate'),spy=g.raw().players.find(p=>p.role==='impostor');setPosition(g,judge,MAP.emergency.x,MAP.emergency.y);assert.equal((await g.send(indexOf(g,judge),'emergency')).status,200);g.time.now+=6000;g.keep();
 assert.equal((await g.send(indexOf(g,judge),'delegateVote',{target:spy.id})).status,200);assert.equal(g.raw().meeting.result.expelled.id,spy.id);assert.equal(g.raw().players.filter(p=>p.role==='impostor'&&p.alive).length,1);
 g.time.now+=10000;g.keep();const ended=(await g.send(indexOf(g,judge),'pulse')).body.state;assert.equal(ended.phase,'ended');assert.equal(ended.result.winner,'crew');
});
test('salas: códigos, identidad, host, límites, sincronización de aspectos y acciones desconocidas',async()=>{const f=await roomFixture();assert.match(f.clients[0].code,/^[A-Z2-9]{6}$/);assert.equal((await f.send(1,'start')).status,403);assert.equal((await f.send(1,'configure',{impostors:2})).status,403);assert.equal((await f.send(1,'profile',{name:'Técnico',color:4,hat:3,skin:2})).status,200);const s=(await f.send(0,'pulse')).body.state;assert.equal(s.roster.find(p=>p.name==='Técnico').hat,3);assert.ok(!JSON.stringify(s).includes(f.clients[1].token));assert.equal((await f.send(0,'assignRole',{role:'impostor'})).status,400);assert.equal((await api(f.store,'/api/room',{code:f.clients[0].code,token:'bad',type:'pulse'},f.time.now)).status,401);const dup=await api(f.store,'/api/join',{code:f.clients[0].code,profile:{name:'Técnico'}},f.time.now);assert.equal(dup.status,400);});
test('movimiento: autoridad del servidor, velocidad acotada y colisiones',async()=>{const f=await roomFixture();const initial=(await f.send(0,'pulse',{x:1,y:0,xPosition:9999})).body.state.me;f.time.now+=200;const moved=(await f.send(0,'pulse',{x:1,y:0})).body.state.me;assert.ok(Math.abs(moved.x-initial.x-41)<.01);f.time.now+=10000;f.keep();const capped=(await f.send(0,'pulse',{x:1,y:0})).body.state.me;assert.ok(capped.x-moved.x<=61.51);for(let i=0;i<100;i++){f.time.now+=200;f.keep();await f.send(0,'pulse',{x:1,y:0});}const last=f.raw().players[0];assert.ok(canStand(LOBBY,last.x,last.y));assert.ok(last.x<(LOBBY.width-1)*TILE);});
test('sincronización: ambos clientes comparten coordenadas tras latencia, roces y parada; no se duplica ni teletransporta',async()=>{
  const f=await roomFixture(),local={...f.raw().players[0]},directions=[[1,0],[0,1],[-1,0],[0,-1],[1,1]];
  for(let batch=1;batch<=15;batch++){
    const [x,y]=directions[(batch-1)%directions.length],segments=[];
    for(let i=0;i<42;i++){move(LOBBY,local,x,y,1/60);segments.push({x,y,ms:1000/60});}
    f.time.now+=700;f.keep();
    const sender=await f.send(0,'pulse',{_motion:{seq:batch,segments,x,y}});
    assert.equal(sender.status,200,`lote ${batch}: ${sender.body.error}`);
    const observer=(await f.send(1,'pulse')).body.state.players.find(p=>p.id===local.id);
    assert.ok(observer,`jugador visible en lote ${batch}`);
    assert.ok(distance(observer,local)<.01,`lote ${batch}: ${distance(observer,local)} px`);
    assert.ok(distance(sender.body.state.me,local)<.01);
  }
  const stopped=await f.send(0,'pulse',{_motion:{seq:16,segments:[],x:0,y:0}});
  assert.equal(stopped.status,200);const at={x:stopped.body.state.me.x,y:stopped.body.state.me.y};
  f.time.now+=800;f.keep();
  const duplicate=await f.send(0,'pulse',{_motion:{seq:15,segments:[{x:1,y:0,ms:700}],x:1,y:0}});
  assert.equal(duplicate.status,200);assert.equal(duplicate.body.state.me.x,at.x);assert.equal(duplicate.body.state.me.y,at.y);
  const cheated=await f.send(0,'pulse',{_motion:{seq:17,segments:[{x:1,y:0,ms:3000}],x:1,y:0}});
  assert.equal(cheated.status,400);
  const after=(await f.send(1,'pulse')).body.state.players.find(p=>p.id===local.id);
  assert.equal(after.x,at.x);assert.equal(after.y,at.y);
});
test('roles privados: un impostor, nadie puede unirse o cambiarse de rol durante la partida',async()=>{const f=await roomFixture();await start(f);assert.equal(f.raw().players.filter(p=>p.role==='impostor').length,1);for(let i=0;i<4;i++){const s=(await f.send(i,'pulse')).body.state;assert.ok(s.me.role);for(const p of s.roster)if(p.id!==s.me.id)assert.ok(p.role===undefined||(s.me.role==='impostor'&&p.role==='impostor'));}assert.equal((await api(f.store,'/api/join',{code:f.clients[0].code,profile:{name:'Tarde'}},f.time.now)).status,400);assert.equal((await f.send(0,'profile',{name:'Cambio',color:9})).status,400);});
test('asesinatos: rechaza tripulantes, distancia, paredes, recarga; cadáver, privacidad y victoria por paridad',async()=>{const f=await roomFixture(5);await start(f);const imp=f.raw().players.find(p=>p.role==='impostor'),crew=f.raw().players.filter(p=>p.role==='crew'),ii=indexOf(f,imp),ci=indexOf(f,crew[0]);setPosition(f,imp,MAP.spawn.x,MAP.spawn.y);setPosition(f,crew[0],MAP.spawn.x+180,MAP.spawn.y);assert.equal((await f.send(ci,'kill',{target:imp.id})).status,403);assert.equal((await f.send(ii,'kill',{target:crew[0].id})).status,400);
  // La máquina ocupa el camino aunque los centros estén dentro del alcance.
  setPosition(f,imp,22.2*TILE,5*TILE);setPosition(f,crew[0],23.5*TILE,5*TILE);assert.ok(distance(f.raw().players[ii],f.raw().players[ci])<90);assert.equal((await f.send(ii,'kill',{target:crew[0].id})).status,400);
  setPosition(f,imp,MAP.spawn.x,MAP.spawn.y);setPosition(f,crew[0],MAP.spawn.x+40,MAP.spawn.y);const killed=await f.send(ii,'kill',{target:crew[0].id});assert.equal(killed.status,200);assert.equal(killed.body.state.bodies.length,1);assert.equal((await f.send(ci,'pulse')).body.state.me.alive,false);assert.equal((await f.send(ci,'report',{body:killed.body.state.bodies[0].id})).status,400);
  setPosition(f,crew[1],MAP.spawn.x+50,MAP.spawn.y);assert.equal((await f.send(ii,'kill',{target:crew[1].id})).status,400);f.time.now+=31000;f.keep();assert.equal((await f.send(ii,'kill',{target:crew[1].id})).status,200);f.time.now+=31000;f.keep();setPosition(f,crew[2],MAP.spawn.x+60,MAP.spawn.y);const ended=await f.send(ii,'kill',{target:crew[2].id});assert.equal(ended.body.state.phase,'ended');assert.equal(ended.body.state.result.winner,'impostor');assert.ok(ended.body.state.roster.every(p=>p.role));});
test('reuniones: denuncia, chat de muertos aislado, una votación, empate, expulsión y revancha',async()=>{const f=await roomFixture(5);await start(f);let imp=f.raw().players.find(p=>p.role==='impostor'),crew=f.raw().players.filter(p=>p.role==='crew'),ii=indexOf(f,imp);setPosition(f,imp,MAP.spawn.x,MAP.spawn.y);setPosition(f,crew[0],MAP.spawn.x+30,MAP.spawn.y);await f.send(ii,'kill',{target:crew[0].id});const body=f.raw().bodies[0];setPosition(f,crew[1],body.x+45,body.y);const caller=indexOf(f,crew[1]);assert.equal((await f.send(caller,'report',{body:body.id})).body.state.phase,'meeting');assert.equal((await f.send(caller,'vote',{target:imp.id})).status,400);const dead=indexOf(f,crew[0]);f.time.now+=1000;f.keep();assert.equal((await f.send(dead,'chat',{text:'Mensaje fantasma'})).status,200);assert.ok(!(await f.send(caller,'pulse')).body.state.chat.some(m=>m.text==='Mensaje fantasma'));assert.ok((await f.send(dead,'pulse')).body.state.chat.some(m=>m.text==='Mensaje fantasma'));f.time.now+=5000;f.keep();const live=f.raw().players.filter(p=>p.alive);assert.equal((await f.send(indexOf(f,live[0]),'vote',{target:'skip'})).status,200);assert.equal((await f.send(indexOf(f,live[0]),'vote',{target:imp.id})).status,400);assert.equal((await f.send(dead,'vote',{target:imp.id})).status,400);await f.send(indexOf(f,live[1]),'vote',{target:'skip'});await f.send(indexOf(f,live[2]),'vote',{target:imp.id});const tie=await f.send(indexOf(f,live[3]),'vote',{target:imp.id});assert.equal(tie.body.state.meeting.result.expelled,null);assert.match(tie.body.state.meeting.result.reason,/Empate/);f.time.now+=10000;f.keep();assert.equal((await f.send(caller,'pulse')).body.state.phase,'game');assert.equal(f.raw().bodies.length,0);setPosition(f,crew[1],MAP.emergency.x,MAP.emergency.y);assert.equal((await f.send(caller,'emergency')).status,200);f.time.now+=6000;f.keep();for(const p of live)await f.send(indexOf(f,p),'vote',{target:imp.id});assert.equal(f.raw().phase,'meeting');assert.equal(f.raw().meeting.stage,'result');assert.equal(f.raw().meeting.result.expelled.role,'impostor');f.time.now+=10000;f.keep();await f.send(caller,'pulse');assert.equal(f.raw().phase,'ended');assert.equal(f.raw().result.winner,'crew');const host=f.raw().players.find(p=>p.id===f.raw().host);assert.equal((await f.send(indexOf(f,host),'return')).body.state.phase,'lobby');assert.equal((await f.send(indexOf(f,host),'start')).body.state.phase,'game');assert.equal(f.raw().gameNumber,2);assert.ok(f.raw().players.every(p=>p.alive));});
test('tareas escolares: 15 minijuegos, entrega en dos fases, solución y tiempo; espectros y victoria por tareas',async()=>{
 const f=await roomFixture();await start(f);for(const p of f.raw().players.filter(p=>p.role==='crew'))p.tasks=STATIONS.map(s=>({id:s.id,done:false}));const ids=f.raw().players.filter(p=>p.role==='crew').map(p=>p.id);f.raw().players.find(p=>p.id===ids[0]).alive=false;
 for(const id of ids)for(const station of STATIONS){const p=f.raw().players.find(p=>p.id===id),i=indexOf(f,p);for(let stage=0;stage<(station.delivery?2:1);stage++){
  const target=stage?station.delivery:station;setPosition(f,p,target.x,target.y,target.floor);
  const r=await f.send(i,'beginTask',{id:station.id});assert.equal(r.status,200,`${station.id}: ${r.body.error}`);const task=r.body.task;
  assert.equal((await f.send(i,'finishTask',{id:task.id,solution:answer(task)})).status,400);f.time.now+=5000;f.keep();
  assert.equal((await f.send(i,'finishTask',{id:task.id,solution:'WRONG'})).status,400);
  const done=await f.send(i,'finishTask',{id:task.id,solution:answer(task)});assert.equal(done.status,200,`${station.id}: ${done.body.error}`);
  if(station.delivery&&stage===0){assert.equal(done.body.carrying,true);assert.equal(done.body.state.me.tasks.find(t=>t.id===station.id).done,false);}
 }}assert.equal(f.raw().result.winner,'crew');
});
test('seis sabotajes: consecuencias, soluciones, cooperación y victoria tras 90 s sin reparar',async()=>{
 for(const kind of Object.keys(SABOTAGES)){
  const f=await roomFixture();await start(f);const imp=f.raw().players.find(p=>p.role==='impostor'),crew=f.raw().players.filter(p=>p.role==='crew'),ii=indexOf(f,imp);f.time.now+=15000;f.keep();
  assert.equal((await f.send(indexOf(f,crew[0]),'sabotage',{kind})).status,403);assert.equal((await f.send(ii,'sabotage',{kind})).status,200);assert.equal((await f.send(ii,'sabotage',{kind})).status,400);
  if(kind==='lights'){assert.equal((await f.send(indexOf(f,crew[0]),'pulse')).body.state.me.vision,170);assert.equal((await f.send(ii,'pulse')).body.state.me.vision,550);}
  if(kind==='doors'){const closed=f.raw().sabotage.closed;assert.ok(closed.length);const d=DOORS.find(d=>d.id===closed[0]);assert.equal(canStand(mapFor(d.floor,f.raw().sabotage),(d.x+1)*TILE,(d.y+.5)*TILE),false);}
  for(let j=0;j<REPAIRS.length;j++){
   const panel=REPAIRS[j],p=kind==='emergency'?crew[j]:crew[0],i=indexOf(f,p);setPosition(f,p,panel.x,panel.y,panel.floor);
   const begin=await f.send(i,'beginRepair',{id:panel.id});assert.equal(begin.status,200,kind);const repair=begin.body.repair;
   assert.equal((await f.send(i,'finishRepair',{id:panel.id,solution:answer(repair)})).status,400);f.time.now+=5000;f.keep();
   assert.equal((await f.send(i,'finishRepair',{id:panel.id,solution:'WRONG'})).status,400);assert.equal((await f.send(i,'finishRepair',{id:panel.id,solution:answer(repair)})).status,200,kind);
  }
  assert.equal(f.raw().sabotage,null,kind);const firstReady=f.raw().sabotageReady;f.time.now=firstReady-1;f.keep();assert.equal((await f.send(ii,'sabotage',{kind})).status,400);f.time.now=firstReady;f.keep();assert.equal((await f.send(ii,'sabotage',{kind})).status,200);assert.equal(f.raw().sabotageReady,f.time.now+112500);f.time.now+=89999;f.keep();assert.equal((await f.send(ii,'pulse')).body.state.phase,'game');f.time.now++;f.keep();const final=(await f.send(ii,'pulse')).body.state;assert.equal(final.phase,'ended');assert.equal(final.result.winner,'impostor');
 }
});
test('desconexión: conserva sesión, cambia líder, caduca y no permite resucitar con token',async()=>{const f=await roomFixture();const original=f.raw().host;f.time.now+=5000;assert.equal((await f.send(1,'pulse')).body.state.host,f.raw().players[1].id);assert.notEqual(f.raw().host,original);assert.equal((await f.send(0,'pulse')).status,200);f.time.now+=31000;f.raw().players[1].lastSeen=f.time.now;assert.equal((await f.send(1,'pulse')).body.state.roster.length,1);assert.equal((await f.send(0,'pulse')).status,401);});

class TestD1 {constructor(){this.sqlite=new DatabaseSync(':memory:');this.sqlite.exec('CREATE TABLE rooms(code TEXT PRIMARY KEY,state TEXT NOT NULL,revision INTEGER NOT NULL,updated INTEGER NOT NULL);CREATE TABLE entry_limits(id TEXT PRIMARY KEY,count INTEGER,expires INTEGER);');}prepare(sql){const stmt=this.sqlite.prepare(sql);let args=[];const p={bind(...a){args=a;return p;},async first(){return stmt.get(...args)||null;},async run(){const r=stmt.run(...args);return {meta:{changes:r.changes}};},async all(){return {results:stmt.all(...args)};}};return p;}async batch(a){return Promise.all(a.map(p=>p.run()));}}
test('D1: peticiones concurrentes conservan a todos los jugadores y no duplican votos',async()=>{const db=new TestD1(),store=new D1Store(db),n=Date.now();const created=await api(store,'/api/create',{profile:{name:'Host'}},n);assert.equal(created.status,200);const session=created.body.session;const joined=await Promise.all(Array.from({length:6},(_,i)=>api(store,'/api/join',{code:session.code,profile:{name:`D1-${i}`,color:i+1}},n)));joined.forEach(r=>assert.equal(r.status,200));const r=await api(store,'/api/room',{...session,type:'pulse'},n);assert.equal(r.body.state.roster.length,7);await api(store,'/api/room',{...session,type:'configure',data:{discussion:5}},n);await api(store,'/api/room',{...session,type:'start'},n);const row=db.sqlite.prepare('SELECT state FROM rooms WHERE code=?').get(session.code),edited=JSON.parse(row.state);Object.assign(edited.players[0],{x:MAP.emergency.x,y:MAP.emergency.y,floor:0});db.sqlite.prepare('UPDATE rooms SET state=? WHERE code=?').run(JSON.stringify(edited),session.code);const emergency=await api(store,'/api/room',{...session,type:'emergency'},n+10000);assert.equal(emergency.status,200);const votes=await Promise.all([0,1].map(()=>api(store,'/api/room',{...session,type:'vote',data:{target:'skip'}},n+16000)));assert.deepEqual(votes.map(r=>r.status).sort(),[200,400]);db.sqlite.close();});
test('HTTP real con cuatro clientes: crear, unirse, configurar, mover, iniciar, votar, terminar y volver',async t=>{const store=new MemoryStore(),server=makeServer(store);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));const url=`http://127.0.0.1:${server.address().port}`;const post=async(path,body)=>{const r=await fetch(url+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};};assert.equal((await fetch(url)).status,200);assert.equal((await fetch(url+'/client.js')).status,200);assert.deepEqual((await (await fetch(url+'/api/rooms')).json()).rooms,[]);const host=await post('/api/create',{profile:{name:'HTTP Host'}});const sessions=[host.body.session];assert.equal((await (await fetch(url+'/api/rooms')).json()).rooms[0].code,sessions[0].code);for(let i=1;i<4;i++)sessions.push((await post('/api/join',{code:sessions[0].code,profile:{name:`HTTP ${i}`,color:i}})).body.session);const send=(i,type,data={})=>post('/api/room',{...sessions[i],type,data});await send(0,'pulse',{x:1,y:0});await delay(200);assert.ok((await send(0,'pulse',{x:0,y:0})).body.state.me.x>host.body.state.me.x);assert.equal((await send(1,'start')).status,403);await send(0,'configure',{discussion:5});assert.equal((await send(0,'start')).body.state.phase,'game');const raw=store.rooms.get(sessions[0].code);raw.revealUntil=0;const imp=raw.players.find(p=>p.role==='impostor');const impId=imp.id;const caller=raw.players.findIndex(p=>p.role==='crew');raw.players[caller].x=MAP.emergency.x;raw.players[caller].y=MAP.emergency.y;assert.equal((await send(caller,'emergency')).body.state.phase,'meeting');store.rooms.get(sessions[0].code).meeting.discussionEnd=Date.now()-1;for(let i=0;i<4;i++)assert.equal((await send(i,'vote',{target:impId})).status,200);const result=await send(0,'pulse');assert.equal(result.body.state.meeting.stage,'result');assert.equal(result.body.state.meeting.result.expelled.role,'impostor');store.rooms.get(sessions[0].code).meeting.resultUntil=Date.now()-1;const ended=await send(0,'pulse');assert.equal(ended.body.state.result.winner,'crew');assert.equal((await send(0,'return')).body.state.phase,'lobby');assert.equal((await send(0,'start')).body.state.gameNumber,2);});

test('directorio de salas: solo espera, presencia reciente, aforo y sin credenciales',async()=>{const f=await roomFixture(4);const list=await api(f.store,'/api/rooms',{},f.time.now);assert.equal(list.body.rooms.length,1);assert.equal(list.body.rooms[0].players,4);assert.ok(!JSON.stringify(list.body).includes(f.clients[0].token));f.time.now+=7000;assert.equal((await api(f.store,'/api/rooms',{},f.time.now)).body.rooms.length,0);f.keep();assert.equal((await api(f.store,'/api/rooms',{},f.time.now)).body.rooms.length,1);await f.send(0,'start');assert.equal((await api(f.store,'/api/rooms',{},f.time.now)).body.rooms.length,0);});

test('colisiones circulares: tangencia, esquinas y deslizamiento estable con distintos intervalos',()=>{
  const map={width:10,height:10,rooms:[{x:0,y:0,w:10,h:10}],corridors:[],props:[{x:4,y:3,w:1,h:3}]};
  const edge=4*TILE-15;
  assert.equal(canStand(map,edge,4*TILE),true);
  assert.equal(canStand(map,edge+.1,4*TILE),false);
  assert.equal(canStand(map,4*TILE-11,3*TILE-11),true);
  assert.equal(canStand(map,4*TILE-10,3*TILE-10),false);
  const run=dt=>{const p={x:edge-55,y:4*TILE,facing:1};for(let t=0;t<.6-.00001;t+=dt)move(map,p,1,1,Math.min(dt,.6-t));return p;};
  const fast=run(1/60),slow=run(.2);
  for(const p of [fast,slow]){assert.ok(canStand(map,p.x,p.y));assert.ok(Math.abs(p.x-edge)<.02,`contacto ${p.x}`);assert.ok(p.y>4*TILE+60,'se desliza por el obstáculo');}
  assert.ok(distance(fast,slow)<1,`mismo recorrido: ${distance(fast,slow)}`);
  const wall={width:4,height:4,rooms:[{x:0,y:0,w:2,h:4}],corridors:[],props:[]},p={x:2*TILE-35,y:70};
  for(let i=0;i<30;i++)move(wall,p,1,1,1/60);
  assert.ok(canStand(wall,p.x,p.y));assert.ok(Math.abs(p.x-(2*TILE-15))<.02);assert.ok(p.y>100);
});

test('partida sin reloj: la desconexión no elimina jugadores ni provoca victoria; pueden reconectar',async()=>{
  const f=await roomFixture();await start(f);const count=f.raw().players.length,host=f.raw().players[0];
  f.time.now+=2*3600_000;
  const live=(await f.send(1,'pulse')).body.state;
  assert.equal(live.phase,'game');assert.equal(live.roster.length,count);assert.ok(live.roster.some(p=>p.id===host.id&&!p.online));
  assert.equal(f.raw().players.filter(p=>p.removed).length,0);
  const back=await f.send(0,'pulse',{x:0,y:0});
  assert.equal(back.status,200);assert.equal(back.body.state.phase,'game');assert.equal(back.body.state.roster.length,count);
});

test('soltar dirección: el servidor detiene la posición tras el pulso de parada',async()=>{
  const f=await roomFixture();await f.send(0,'pulse',{x:0,y:-1});f.time.now+=90;
  const stopped=(await f.send(0,'pulse',{x:0,y:0})).body.state.me;
  for(let i=0;i<8;i++){f.time.now+=180;const p=(await f.send(0,'pulse',{x:0,y:0})).body.state.me;assert.equal(p.y,stopped.y);assert.equal(p.x,stopped.x);}
});

test('plantas y conductos online: alcance, rol, rutas, ocultación, transiciones y reuniones',async()=>{
 const f=await roomFixture(5);await start(f);const imp=f.raw().players.find(p=>p.role==='impostor'),crew=f.raw().players.filter(p=>p.role==='crew'),ii=indexOf(f,imp),ci=indexOf(f,crew[0]);
 assert.equal((await f.send(ci,'stairs',{id:'stairs-west'})).status,400);
 const stairs=FLOORS[0].stairs[0];setPosition(f,crew[0],stairs.x,stairs.y,0);
 const upstairs=await f.send(ci,'stairs',{id:stairs.id});assert.equal(upstairs.status,200);assert.equal(upstairs.body.state.me.floor,1);assert.ok(canStand(FLOORS[1],upstairs.body.state.me.x,upstairs.body.state.me.y));
 const viewer=indexOf(f,crew[1]);setPosition(f,crew[1],upstairs.body.state.me.x,upstairs.body.state.me.y,0);
 assert.ok(!(await f.send(viewer,'pulse')).body.state.players.some(p=>p.id===crew[0].id));
 f.time.now+=800;f.keep();assert.equal((await f.send(ci,'stairs',{id:stairs.id})).body.state.me.floor,0);
 f.time.now+=800;f.keep();const v=VENTS[0];f.raw().players.find(p=>p.id===crew[0].id).specialRole=null;setPosition(f,crew[0],v.x,v.y,v.floor);assert.equal((await f.send(ci,'enterVent',{id:v.id})).status,403);
 assert.equal((await f.send(ii,'enterVent',{id:v.id})).status,400);setPosition(f,imp,v.x,v.y,v.floor);setPosition(f,crew[1],v.x-40,v.y,v.floor);
 const entered=await f.send(ii,'enterVent',{id:v.id});assert.equal(entered.status,200);assert.equal(entered.body.state.me.vent,v.id);
 f.time.now+=800;f.keep();const observer=(await f.send(viewer,'pulse')).body.state;assert.ok(!observer.players.some(p=>p.id===imp.id));assert.ok(!JSON.stringify(observer).includes('vent-in'));
 const still=await f.send(ii,'pulse',{_motion:{seq:1,segments:[{x:1,y:0,ms:300}],x:1,y:0}});assert.equal(still.status,200);assert.equal(still.body.state.me.x,v.x);
 assert.equal((await f.send(ii,'travelVent',{id:'direction'})).status,400);
 const destination=VENTS.find(v=>v.id==='eso-c');assert.equal((await f.send(ii,'travelVent',{id:destination.id})).body.state.me.floor,1);
 f.time.now+=600;f.keep();assert.equal((await f.send(ii,'exitVent')).status,200);assert.ok(canStand(FLOORS[1],f.raw().players[ii].x,f.raw().players[ii].y));
 f.time.now+=800;f.keep();setPosition(f,imp,v.x,v.y,0);assert.equal((await f.send(ii,'enterVent',{id:v.id})).status,400);
 f.time.now+=20000;f.keep();assert.equal((await f.send(ii,'enterVent',{id:v.id})).status,200);setPosition(f,crew[0],MAP.emergency.x,MAP.emergency.y,0);
 assert.equal((await f.send(ci,'emergency')).body.state.phase,'meeting');assert.equal(f.raw().players[ii].vent,null);assert.equal((await f.send(ii,'enterVent',{id:v.id})).status,400);assert.equal((await f.send(ii,'stairs',{id:'stairs-west'})).status,400);
});

test('alcantarillas: viajes reversibles, límite de 10 s y 20 s de recarga desde la salida',async()=>{
 const f=await roomFixture(5);await start(f);const imp=f.raw().players.find(p=>p.role==='impostor'),ii=indexOf(f,imp),v=VENTS.find(v=>v.id==='red');setPosition(f,imp,v.x,v.y);
 assert.equal((await f.send(ii,'enterVent',{id:v.id})).status,200);const started=f.raw().players[ii].ventSince;
 f.time.now+=800;f.keep();let p=await f.send(ii,'travelVent',{id:'eso-c'});assert.equal(p.status,200);assert.equal(p.body.state.me.floor,1);assert.equal(p.body.state.me.ventReady,0);
 f.time.now+=800;f.keep();p=await f.send(ii,'travelVent',{id:'red'});assert.equal(p.status,200);assert.equal(p.body.state.me.floor,0);assert.equal(p.body.state.me.ventSince,started);
 f.time.now=started+10001;f.keep();p=await f.send(ii,'pulse');assert.equal(p.body.state.me.vent,null);assert.equal(p.body.state.me.ventReady,f.time.now+20000);assert.equal((await f.send(ii,'enterVent',{id:v.id})).status,400);
 f.time.now+=20001;f.keep();assert.equal((await f.send(ii,'enterVent',{id:v.id})).status,200);
});

test('asesinato: solo la víctima ve la escena de pantalla; testigo cercano ve la acción dentro del mapa',async()=>{
 const f=await roomFixture(5);assert.equal((await f.send(0,'configure',{killCooldown:4})).status,400);await start(f);const imp=f.raw().players.find(p=>p.role==='impostor'),crew=f.raw().players.filter(p=>p.role==='crew'),ii=indexOf(f,imp),vi=indexOf(f,crew[0]),oi=indexOf(f,crew[1]),wi=indexOf(f,crew[2]);setPosition(f,crew[0],imp.x+35,imp.y,imp.floor);setPosition(f,crew[1],20*TILE,25*TILE);setPosition(f,crew[2],imp.x+70,imp.y);
 const r=await f.send(ii,'kill',{target:crew[0].id});assert.equal(r.status,200);assert.equal(r.body.state.me.killReady,f.time.now+30000);assert.equal(r.body.state.actionFx,null);assert.equal((await f.send(vi,'pulse')).body.state.actionFx.kind,'kill');const witness=(await f.send(wi,'pulse')).body.state;assert.equal(witness.actionFx,null);assert.equal(witness.worldKill.attacker.name,imp.name);assert.equal(witness.worldKill.victim.name,crew[0].name);const far=(await f.send(oi,'pulse')).body.state;assert.equal(far.actionFx,null);assert.equal(far.worldKill,null);
 f.time.now+=30001;f.keep();assert.equal((await f.send(ii,'pulse')).body.state.actionFx,null);
});

test('el testigo dibuja el cuchillo en el mapa sin abrir la escena a pantalla completa',async()=>{
 const f=await roomFixture(5);await start(f);const imp=f.raw().players.find(p=>p.role==='impostor'),crew=f.raw().players.filter(p=>p.role==='crew'),w=crew[1];setPosition(f,imp,MAP.spawn.x,MAP.spawn.y);setPosition(f,crew[0],imp.x+35,imp.y);setPosition(f,w,imp.x+65,imp.y);await f.send(indexOf(f,imp),'kill',{target:crew[0].id});const s=(await f.send(indexOf(f,w),'pulse')).body.state;s.receivedAt=Date.now();assert.equal(s.actionFx,null);assert.ok(s.worldKill);
 const labels=[],ctx=new Proxy({measureText:()=>({width:50}),createRadialGradient:()=>({addColorStop(){}}),strokeText:txt=>labels.push(txt)},{get(o,k){return k in o?o[k]:()=>{}},set(o,k,v){o[k]=v;return true;}}),canvas={width:0,height:0,getContext:()=>ctx,getBoundingClientRect:()=>({width:900,height:600})},previousDocument=globalThis.document,previousWindow=globalThis.window;
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};globalThis.window={devicePixelRatio:1};try{assert.doesNotThrow(()=>drawWorld(canvas,s,{...s.me,input:{x:0,y:0}},new Map(),{x:s.me.x,y:s.me.y},.016,performance.now()));assert.ok(labels.includes(imp.name));}finally{globalThis.document=previousDocument;globalThis.window=previousWindow;}
});

test('botón de Recepción: la mesa no impide pulsarlo desde el suelo contiguo',async()=>{
 const f=await roomFixture(4);await start(f);const crew=f.raw().players.find(p=>p.role==='crew'),i=indexOf(f,crew);setPosition(f,crew,59.25*TILE,8*TILE);assert.ok(canStand(MAP,crew.x,crew.y));assert.equal((await f.send(i,'emergency')).status,200);
});

test('movimiento remoto: interpolación continua entre respuestas irregulares, sin derrape al parar',()=>{
 const map=LOBBY,x=LOBBY.spawn.x,y=LOBBY.spawn.y,p=(delta,input={x:1,y:0})=>({x:x+delta,y,input,alive:true,facing:1});let samples=recordRemoteSample(null,p(0),1000);
 samples=recordRemoteSample(samples,p(14),1070);samples=recordRemoteSample(samples,p(44),1220);
 for(let t=1070;t<=1220;t+=10){const shown=poseAt(samples.samples,t,map);assert.ok(Math.abs(shown.x-(x+(t-1000)*.2))<.05,`tiempo ${t}`);}
 const pending=remoteAt(samples,1300+REMOTE_DELAY_MS,map);assert.ok(pending.x-x<=44+205*MAX_EXTRAPOLATION_MS/1000+.1,'predicción acotada');
 samples=recordRemoteSample(samples,p(44,{x:0,y:0}),1300);assert.equal(poseAt(samples.samples,1600,map).x,x+44,'sin movimiento residual al soltar');
 samples=recordRemoteSample(samples,p(500),1400);assert.equal(samples.samples.length,1,'teletransporte sin barrido visual');
});

test('la visión usa paredes reales: puerta abierta visible aunque la etiqueta de sala sea diferente',async()=>{
 const f=await roomFixture(4);await start(f);const crew=f.raw().players.filter(q=>q.role==='crew'),inside=crew[0],outside=crew[1],a=indexOf(f,inside),b=indexOf(f,outside);setPosition(f,inside,50.5*TILE,16.5*TILE);setPosition(f,outside,50.5*TILE,14.5*TILE);
 assert.notEqual(zoneAt(MAP,inside.x,inside.y),zoneAt(MAP,outside.x,outside.y));assert.ok(visionLineOfSight(MAP,outside,inside),'la puerta deja una línea de visión geométrica');assert.equal(characterVisible(MAP,outside,inside,420),true);
 assert.equal(characterVisible(MAP,{x:46.5*TILE,y:14.5*TILE},inside,420),false,'pared principal entre espectador y alumno');
 assert.ok((await f.send(b,'pulse')).body.state.players.some(q=>q.id===inside.id),'el cliente conoce el personaje próximo al umbral para dibujarlo al entrar');
 setPosition(f,outside,50.5*TILE,17*TILE);assert.equal(characterVisible(MAP,f.raw().players[b],inside,420),true);assert.equal((await f.send(b,'pulse')).body.state.players.find(q=>q.id===inside.id)?.name,inside.name);assert.equal((await f.send(a,'pulse')).body.state.players.find(q=>q.id===outside.id)?.name,outside.name);
});

test('un alumno de la misma sala se ve en todo el círculo, sin mostrarlo más allá o tras otro muro',async()=>{
 const f=await roomFixture(4);await start(f);const crew=f.raw().players.filter(q=>q.role==='crew'),viewer=crew[0],other=crew[1],i=indexOf(f,viewer);
 setPosition(f,viewer,4.5*TILE,8*TILE);setPosition(f,other,11.6*TILE,8*TILE);
 assert.ok(distance(viewer,other)>300&&distance(viewer,other)<420);assert.equal(characterVisible(MAP,viewer,other,420),true);assert.ok((await f.send(i,'pulse')).body.state.players.some(q=>q.id===other.id));
 assert.equal(characterVisible(MAP,viewer,{...other,x:14*TILE},420),false);
});

test('los rótulos del minimapa mantienen tamaño fijo y dividen nombres largos en dos líneas',async()=>{
 const f=await roomFixture();const state=(await f.send(0,'pulse')).body.state,seen=[];
 const ctx=new Proxy({measureText(v){return {width:v.length*Number(this.font.match(/[\d.]+px/)?.[0].slice(0,-2)||11)*.58};},fillText(v){seen.push({label:v,font:this.font});}},{get(o,k){return k in o?o[k]:()=>{}},set(o,k,v){o[k]=v;return true;}});
 const canvas={width:850,height:600,getContext:()=>ctx},previousDocument=globalThis.document;
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};try{drawMiniMap(canvas,{...state,phase:'game',me:{...state.me,tasks:[]}},state.me,0);const short=seen.find(q=>q.label==='Despacho'),long=seen.find(q=>q.label==='de Vaquero');assert.ok(short&&long);assert.equal(short.font,long.font);}finally{globalThis.document=previousDocument;}
});

test('los fantasmas caminan al doble de velocidad sin perder la autoridad de colisiones',()=>{
 const start={x:20*TILE,y:25*TILE},living={...start},ghost={...start};move(MAP,living,1,0,.2,false);move(MAP,ghost,1,0,.2,true);assert.ok(Math.abs((ghost.x-start.x)-2*(living.x-start.x))<1);assert.ok(canStand(MAP,living.x,living.y));
});

test('reunión en clase: movimiento visible para todos sin alterar la posición escolar ni permitir doble voto',async()=>{
 const f=await roomFixture(5);await start(f);const caller=f.raw().players.find(p=>p.role==='crew'),i=indexOf(f,caller),x=MAP.emergency.x,y=MAP.emergency.y;setPosition(f,caller,x,y);const entered=await f.send(i,'emergency');assert.equal(entered.status,200);assert.ok(entered.body.state.players.length===5);const initial=entered.body.state.me.x;
 await f.send(i,'pulse',{x:1,y:0});f.time.now+=210;f.keep();const moved=await f.send(i,'pulse',{x:0,y:0});assert.ok(moved.body.state.me.x>initial);assert.equal(f.raw().players[i].x,x);assert.equal(f.raw().players[i].y,y);const observer=await f.send((i+1)%5,'pulse');assert.equal(observer.body.state.players.find(p=>p.id===caller.id).x,moved.body.state.me.x);
 f.time.now+=6000;f.keep();assert.equal((await f.send(i,'vote',{target:'skip'})).status,200);assert.equal((await f.send(i,'vote',{target:'skip'})).status,400);
});

test('roles únicos, aviso privado de El enchufe y cuatro señales fijas al creyente cada 15 s',async()=>{
 const f=await roomFixture(6);await start(f);const crew=f.raw().players.filter(p=>p.role==='crew'),imp=f.raw().players.find(p=>p.role==='impostor');assert.equal(new Set(crew.map(p=>p.specialRole).filter(Boolean)).size,crew.map(p=>p.specialRole).filter(Boolean).length);
 crew.forEach(p=>p.specialRole=null);crew[1].specialRole='believer';crew[2].specialRole='plug';setPosition(f,imp,MAP.spawn.x,MAP.spawn.y);setPosition(f,crew[0],MAP.spawn.x+35,MAP.spawn.y);const r=await f.send(indexOf(f,imp),'kill',{target:crew[0].id});assert.equal(r.status,200);
 const notice=(await f.send(indexOf(f,crew[2]),'pulse')).body.state.deathNotices.at(-1);assert.deepEqual([notice.name,notice.floor],[crew[0].name,0]);assert.equal((await f.send(indexOf(f,crew[3]),'pulse')).body.state.deathNotices.length,0);
 const ghost=indexOf(f,crew[0]),believer=indexOf(f,crew[1]),emojis=(await f.send(ghost,'pulse')).body.state.spiritEmojis;assert.equal(new Set(emojis).size,4);assert.equal((await f.send(ghost,'spirit',{emoji:'inexistente'})).status,400);
 assert.equal((await f.send(ghost,'spirit',{emoji:emojis[0]})).status,200);assert.equal((await f.send(ghost,'spirit',{emoji:emojis[1]})).status,400);assert.equal((await f.send(believer,'pulse')).body.state.spiritMessages.at(-1).emoji,emojis[0]);assert.equal((await f.send(indexOf(f,imp),'pulse')).body.state.spiritMessages.length,0);
 f.time.now+=15001;f.keep();assert.equal((await f.send(ghost,'spirit',{emoji:emojis[1]})).status,200);assert.deepEqual((await f.send(ghost,'pulse')).body.state.spiritEmojis,emojis);
});

test('profesores: dos nombres distintos, persecución en pasillo, aula segura y expulsión de 30 s',async()=>{
 const f=await roomFixture(5);await start(f);const [t]=f.raw().teachers,crew=f.raw().players.find(p=>p.role==='crew'),i=indexOf(f,crew);assert.equal(f.raw().teachers.length,2);assert.equal(new Set(f.raw().teachers.map(p=>p.name)).size,2);
 setPosition(f,crew,t.x+100,t.y,t.floor);for(let n=0;n<35&&!f.raw().players[i].expelledUntil;n++){f.time.now+=200;f.keep();await f.send(i,'pulse',{x:0,y:0});}assert.ok(f.raw().players[i].expelledUntil>f.time.now,'captura en el pasillo');assert.equal(f.raw().players[i].floor,1);assert.equal((await f.send(i,'stairs',{id:'stairs-west'})).status,400);const detained=(await f.send(i,'pulse',{x:1,y:0})).body.state.me;f.time.now+=500;f.keep();const moved=(await f.send(i,'pulse',{x:1,y:0})).body.state.me;assert.ok(moved.x>detained.x,'puede caminar dentro de Expulsados');assert.ok(canStand(detentionMap(FLOORS[moved.floor]),moved.x,moved.y));
 f.time.now=f.raw().players[i].expelledUntil+1;f.keep();await f.send(i,'pulse',{x:0,y:0});assert.equal(f.raw().players[i].expelledUntil,0);
 const safe=FLOORS[1].rooms.find(r=>r.id==='expelled');setPosition(f,crew,(safe.x+4)*TILE,(safe.y+5)*TILE,1);const currentTeacher=f.raw().teachers.find(q=>q.id===t.id),currentCrew=f.raw().players[i];currentTeacher.floor=1;currentTeacher.x=currentCrew.x+35;currentTeacher.y=currentCrew.y;currentTeacher.goal=null;f.time.now+=200;f.keep();await f.send(i,'pulse',{x:0,y:0});assert.equal(f.raw().players[i].expelledUntil,0,'el aula protege');
});

test('el profesor inicia la persecución desde la distancia a la que un alumno puede verlo',async()=>{
 const f=await roomFixture(5);await start(f);const teacher=f.raw().teachers.find(t=>t.floor===0),crew=f.raw().players.find(p=>p.role==='crew'),i=indexOf(f,crew);setPosition(f,crew,teacher.x-400,teacher.y);assert.equal(zoneAt(MAP,crew.x,crew.y),'corridor');assert.ok(visionLineOfSight(MAP,crew,teacher));f.time.now+=160;f.keep();const seen=(await f.send(i,'pulse')).body.state;assert.ok(seen.teachers.some(t=>t.id===teacher.id));assert.equal(f.raw().teachers.find(t=>t.id===teacher.id).targetId,crew.id);
});

test('lienzo de reunión: dibuja la clase, botón, chat, participantes y permite seleccionar por coordenadas',async()=>{
 const f=await roomFixture(4);await start(f);const crew=f.raw().players.find(p=>p.role==='crew'),i=indexOf(f,crew);setPosition(f,crew,MAP.emergency.x,MAP.emergency.y);await f.send(i,'emergency');f.time.now+=1000;f.keep();await f.send(i,'chat',{text:'Veo algo raro'});const s=(await f.send(i,'pulse')).body.state;s.selectedVote=f.raw().players.find(p=>p.id!==crew.id).id;s.receivedAt=Date.now();const labels=[];
 const ctx=new Proxy({measureText:()=>({width:110}),createRadialGradient:()=>({addColorStop(){}}),fillText:(v)=>labels.push(v)},{get(o,k){return k in o?o[k]:()=>{}},set(o,k,v){o[k]=v;return true;}}),canvas={width:0,height:0,getContext:()=>ctx,getBoundingClientRect:()=>({left:80,top:30,width:900,height:600})},previousDocument=globalThis.document,previousWindow=globalThis.window;
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};globalThis.window={devicePixelRatio:1};try{const cam={x:s.me.x,y:s.me.y};assert.doesNotThrow(()=>drawWorld(canvas,s,{...s.me,input:{x:0,y:0}},new Map(),cam,0,performance.now()));assert.ok(labels.includes('Veo algo raro'));const center=worldPoint(canvas,cam,{clientX:530,clientY:330});assert.equal(center.x,cam.x);assert.equal(center.y,cam.y);}finally{globalThis.document=previousDocument;globalThis.window=previousWindow;}
});

test('la niebla deja visible el personaje propio y vuelve a dibujar los nombres',async()=>{
 const f=await roomFixture(4);await start(f);const p=f.raw().players.find(q=>q.role==='crew'),i=indexOf(f,p);setPosition(f,p,MAP.spawn.x,MAP.spawn.y);const s=(await f.send(i,'pulse')).body.state;s.receivedAt=Date.now();const operations=[];
 const ctx=new Proxy({measureText:()=>({width:50}),createRadialGradient:()=>({addColorStop(){}}),fill:(rule)=>{if(rule==='evenodd')operations.push('fog');},roundRect:()=>operations.push('sprite-shape'),fillText:txt=>operations.push(txt)},{get(o,k){return k in o?o[k]:()=>{}},set(o,k,v){o[k]=v;return true;}}),canvas={width:0,height:0,getContext:()=>ctx,getBoundingClientRect:()=>({width:900,height:600})},previousDocument=globalThis.document,previousWindow=globalThis.window;
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};globalThis.window={devicePixelRatio:1};try{assert.doesNotThrow(()=>drawWorld(canvas,s,{...s.me,input:{x:0,y:0}},new Map(),{x:s.me.x,y:s.me.y},.016,performance.now()));const fog=operations.indexOf('fog');assert.ok(fog>=0);assert.ok(operations.slice(fog+1).includes('sprite-shape'));assert.ok(operations.includes(p.name+' · tú'));}finally{globalThis.document=previousDocument;globalThis.window=previousWindow;}
});

test('ropa online: todas las prendas se validan y aparecen en las otras perspectivas',async()=>{
 const f=await roomFixture();const wardrobe={name:'Profesor',color:7,skin:6,hat:5,outfitColor:3,trimColor:5,pants:1,glasses:2,bag:1,accessory:1};
 assert.equal((await f.send(0,'profile',wardrobe)).status,200);const roster=(await f.send(1,'pulse')).body.state.roster.find(p=>p.name==='Profesor');for(const [k,v] of Object.entries(wardrobe))assert.equal(roster[k],v,k);
 const sanitized=await f.send(0,'profile',{...wardrobe,skin:999,bag:999});assert.equal(sanitized.body.state.me.skin,0);assert.equal(sanitized.body.state.me.bag,0);
});

test('puertas seguras y emergencia cooperativa: no cierran sobre jugadores; la confirmación caduca',async()=>{
 const f=await roomFixture();await start(f);const imp=f.raw().players.find(p=>p.role==='impostor'),crew=f.raw().players.filter(p=>p.role==='crew'),ii=indexOf(f,imp),ci=indexOf(f,crew[0]),door=DOORS[0];f.time.now+=15000;f.keep();
 setPosition(f,crew[0],(door.x+1)*TILE,(door.y+.5)*TILE,door.floor);await f.send(ii,'sabotage',{kind:'doors'});assert.ok(!f.raw().sabotage.closed.includes(door.id));assert.ok(canStand(mapFor(door.floor,f.raw().sabotage),f.raw().players[ci].x,f.raw().players[ci].y));
 for(const panel of REPAIRS){setPosition(f,crew[0],panel.x,panel.y,panel.floor);const first=(await f.send(ci,'beginRepair',{id:panel.id})).body.repair;f.time.now+=5000;f.keep();await f.send(ci,'finishRepair',{id:panel.id,solution:answer(first)});}assert.equal(f.raw().sabotage,null);f.time.now=f.raw().sabotageReady;f.keep();await f.send(ii,'sabotage',{kind:'emergency'});let panel=REPAIRS[0];setPosition(f,crew[0],panel.x,panel.y,panel.floor);const repair=(await f.send(ci,'beginRepair',{id:panel.id})).body.repair;f.time.now+=5000;f.keep();await f.send(ci,'finishRepair',{id:panel.id,solution:answer(repair)});assert.equal(f.raw().sabotage.fixed.length,1);
 f.time.now+=9000;f.keep();await f.send(ci,'pulse');assert.equal(f.raw().sabotage.fixed.length,0);assert.equal(f.raw().phase,'game');
 for(const r of REPAIRS){setPosition(f,crew[0],r.x,r.y,r.floor);const task=(await f.send(ci,'beginRepair',{id:r.id})).body.repair;f.time.now+=5000;f.keep();await f.send(ci,'finishRepair',{id:r.id,solution:answer(task)});}assert.ok(f.raw().sabotage);assert.equal(f.raw().sabotage.fixed.length,0,'una sola persona no satisface la cooperación');
});

test('el líder configura velocidad y plantas; solo la planta elegida contiene objetivos, profesores, conductos y botón de reunión',async()=>{
 for(const floor of [0,1]){
  const f=await roomFixture(5),chosen=String(floor),other=1-floor;
  assert.equal((await f.send(1,'configure',{floors:chosen})).status,403);
  assert.equal((await f.send(0,'configure',{speed:3})).status,400);
  assert.equal((await f.send(0,'configure',{floors:'3'})).status,400);
  assert.equal((await f.send(0,'configure',{speed:1.5,floors:chosen,tasks:10,discussion:5,voting:15})).status,200);
  assert.equal((await f.send(0,'start')).status,200);
  const room=f.raw(),imp=room.players.find(p=>p.role==='impostor'),crew=room.players.find(p=>p.role==='crew'),ii=indexOf(f,imp),ci=indexOf(f,crew);
  assert.ok(room.players.every(p=>p.floor===floor&&p.tasks.length===10&&p.tasks.every(t=>taskStation(t).floor===floor)));
  assert.ok(room.teachers.every(t=>t.floor===floor));room.teachers=[];
  f.time.now+=41000;f.keep();
  const current=(await f.send(ci,'pulse')).body.state;
  assert.equal(current.config.speed,1.5);assert.equal(current.config.floors,chosen);
  assert.equal((await f.send(ci,'stairs',{id:FLOORS[floor].stairs[0].id})).status,400);
  const source=VENTS.find(v=>v.floor===floor&&v.links.some(id=>VENTS.some(q=>q.id===id&&q.floor===other))&&v.links.some(id=>VENTS.some(q=>q.id===id&&q.floor===floor)));
  assert.ok(source);setPosition(f,imp,source.x,source.y,floor);assert.equal((await f.send(ii,'enterVent',{id:source.id})).status,200);
  f.time.now+=600;f.keep();const cross=source.links.find(id=>VENTS.some(v=>v.id===id&&v.floor===other));assert.equal((await f.send(ii,'travelVent',{id:cross})).status,400);
  const same=source.links.find(id=>VENTS.some(v=>v.id===id&&v.floor===floor));assert.equal((await f.send(ii,'travelVent',{id:same})).status,200);
  f.time.now+=500;f.keep();assert.equal((await f.send(ii,'exitVent')).status,200);
  const standing=floor?{x:43*TILE,y:21*TILE}:{x:59.25*TILE,y:8*TILE};assert.ok(canStand(FLOORS[floor],standing.x,standing.y));setPosition(f,crew,standing.x,standing.y,floor);
  const called=await f.send(ci,'emergency');assert.equal(called.status,200,`${chosen}: ${called.body.error}`);assert.equal(called.body.state.phase,'meeting');
  f.time.now+=21000;f.keep();await f.send(ci,'pulse');f.time.now+=10000;f.keep();await f.send(ci,'pulse');assert.ok(f.raw().players.every(p=>p.floor===floor));
 }
});

test('sabotajes de una planta se reparan en un panel y caducan exactamente a los 90 segundos',async()=>{
 for(const floor of [0,1]){
  const f=await roomFixture(4);await f.send(0,'configure',{floors:String(floor),tasks:2});await f.send(0,'start');f.raw().teachers=[];f.time.now+=41000;f.keep();
  const imp=f.raw().players.find(p=>p.role==='impostor'),crew=f.raw().players.find(p=>p.role==='crew'),ii=indexOf(f,imp),ci=indexOf(f,crew),panel=REPAIRS.find(r=>r.floor===floor),wrong=REPAIRS.find(r=>r.floor!==floor);
  assert.equal((await f.send(ii,'sabotage',{kind:'emergency'})).status,200);
  setPosition(f,crew,wrong.x,wrong.y,wrong.floor);assert.equal((await f.send(ci,'beginRepair',{id:wrong.id})).status,400);
  setPosition(f,crew,panel.x,panel.y,panel.floor);const repair=(await f.send(ci,'beginRepair',{id:panel.id})).body.repair;f.time.now+=5000;f.keep();assert.equal((await f.send(ci,'finishRepair',{id:panel.id,solution:answer(repair)})).status,200);assert.equal(f.raw().sabotage,null);
  f.time.now=f.raw().sabotageReady;f.keep();const next=await f.send(ii,'sabotage',{kind:'doors'});assert.equal(next.status,200,next.body.error);const started=f.time.now;
  f.time.now+=18000;f.keep();assert.equal((await f.send(ii,'pulse')).body.state.sabotage.kind,'doors');assert.deepEqual(f.raw().sabotage.closed,[]);
  f.time.now=started+89999;f.keep();assert.equal((await f.send(ii,'pulse')).body.state.phase,'game');
  f.time.now=started+90000;f.keep();const result=(await f.send(ii,'pulse')).body.state;assert.equal(result.phase,'ended');assert.equal(result.result.winner,'impostor');
 }
});

test('multiplicador de velocidad: servidor, cliente y movimiento fantasma mantienen la proporción',()=>{
 const map=FLOORS[1],x=34.5*TILE,y=15.5*TILE;
 for(const rate of [1,1.25,1.5,2]){const p={x,y},ghost={x,y};move(map,p,1,0,.2,false,rate);move(map,ghost,1,0,.2,true,rate);assert.ok(Math.abs((p.x-x)-205*.2*rate)<.01);assert.ok(Math.abs((ghost.x-x)-205*.4*rate)<.01);}
});

test('la velocidad del líder se aplica a los tramos de movimiento autorizados por el servidor',async()=>{
 for(const rate of [1,1.25,1.5,2]){const f=await roomFixture(4);assert.equal((await f.send(0,'configure',{speed:rate,floors:'1',tasks:2})).status,200);await f.send(0,'start');f.raw().teachers=[];f.time.now+=10000;f.keep();const p=f.raw().players[0];setPosition(f,p,34.5*TILE,15.5*TILE,1);p.motionAnchor=f.time.now-200;p.motionSpent=0;p.motionAt=f.time.now-200;const old=p.x;const packet={seq:1,segments:[{x:1,y:0,ms:100}],x:0,y:0};const r=await f.send(0,'pulse',{_motion:packet});assert.equal(r.status,200,r.body.error);const moved=f.raw().players[0].x-old;assert.ok(Math.abs(moved-205*.1*rate)<.05,`velocidad ${rate}: ${moved}`);}
});

test('cámara: el personaje se adelanta 20 píxeles en el sentido correcto; no hay efecto vertical ni acumulación',async()=>{
 const {updateCamera}=await import('../public/camera.js');for(const scale of [1.07,1.42])for(const x of [-1,1]){const cam={},local={x:500,y:700};for(let i=0;i<120;i++)updateCamera(cam,local,{x,y:0},1/60,scale);assert.ok(Math.abs((local.x-cam.x)*scale-x*20)<.01);assert.equal(cam.y,local.y);const stopped={...cam};for(let i=0;i<60;i++)updateCamera(cam,local,{x:0,y:0},1/60,scale);assert.deepEqual(cam,stopped);updateCamera(cam,local,{x:0,y:-1},1/60,scale);assert.equal(cam.y,local.y);assert.equal(cam.lookY,0);}
});

test('despachos numerados, rutas de sabotaje y transferencia entre plantas',async()=>{
 const offices=FLOORS[0].rooms.filter(r=>r.name.startsWith('Despacho')&&r.id!=='office1');
 assert.deepEqual(offices.map(r=>r.name).sort(),Array.from({length:6},(_,i)=>`Despacho ${i+1}`).sort());
 assert.equal(FLOORS[0].rooms.find(r=>r.id==='office1').name,'Despacho de Vaquero');
 const f=await roomFixture();await start(f);const p=f.raw().players.find(q=>q.role==='impostor');const i=indexOf(f,p);
 assert.equal((await f.send(i,'sabotage',{kind:'lights'})).status,200);
 const s=(await f.send(i,'pulse')).body.state;
 setPosition(f,p,FLOORS[1].spawn.x,FLOORS[1].spawn.y,1);
 const other=sabotageDestination({...s,me:{...s.me,floor:1},sabotage:{...s.sabotage,fixed:['repair-b']}},p);
 assert.equal(other.stair,true);assert.equal(other.floor,1);assert.match(other.title,/P0/);
 const path=routeTo(FLOORS[1],p,other,48);assert.ok(path.length>0);
 for(const point of path)assert.ok(canStand(FLOORS[1],point.x,point.y));
 const after=sabotageDestination({...s,me:{...s.me,floor:0},sabotage:{...s.sabotage,fixed:['repair-b']}},{x:REPAIRS[0].x-100,y:REPAIRS[0].y});
 assert.equal(after.id,'repair-a');assert.equal(after.stair,false);
});

test('reunión: diez posiciones libres y mesa sólida compartida entre clientes',async()=>{
 const f=await roomFixture(10);await start(f);const p=f.raw().players.find(q=>q.alive),i=indexOf(f,p),floor=p.floor;
 const meetingFloor=f.raw().config.floors==='1'?1:0;
 setPosition(f,p,FLOORS[meetingFloor].emergency.x,FLOORS[meetingFloor].emergency.y,meetingFloor);
 assert.equal((await f.send(i,'emergency')).status,200);
 const positions=f.raw().players.map(q=>q.meetingPos);
 assert.equal(positions.length,10);
 for(const position of positions)assert.ok(canStand(MEETING,position.x,position.y),JSON.stringify(position));
 assert.equal(canStand(MEETING,10*56,7.2*56),false);
 assert.equal((await f.send(i,'pulse')).body.state.players.length,10);
 assert.equal(f.raw().players[i].floor,floor,'la posición escolar se conserva durante la reunión');
});

test('roles del impostor: invisible, copia y cancelación con recarga autoritativa',async()=>{
 const f=await roomFixture();await start(f);const imp=f.raw().players.find(q=>q.role==='impostor'),crew=f.raw().players.find(q=>q.role==='crew');const ii=indexOf(f,imp),ci=indexOf(f,crew);
 f.raw().players[ii].specialRole='phantom';assert.equal((await f.send(ci,'ability')).status,403);
 assert.equal((await f.send(ii,'ability')).status,200);assert.equal(f.raw().players[ii].abilityUntil,f.time.now+15000);assert.equal(f.raw().players[ii].abilityReady,f.time.now+90000);
 f.time.now+=700;f.keep();const hidden=(await f.send(ci,'pulse')).body.state;
 assert.ok(!hidden.players.some(q=>q.id===imp.id));
 assert.equal((await f.send(ii,'ability')).status,400);
 assert.equal((await f.send(ii,'cancelAbility')).status,200);
 assert.ok((await f.send(ci,'pulse')).body.state.players.some(q=>q.id===imp.id));
 assert.equal((await f.send(ii,'ability')).status,400);
 f.time.now=f.raw().players[ii].abilityReady+1;f.keep();f.raw().players[ii].specialRole='copier';
 assert.equal((await f.send(ii,'ability',{target:imp.id})).status,400);
 assert.equal((await f.send(ii,'ability',{target:crew.id})).status,200);
 const copied=(await f.send(ci,'pulse')).body.state.players.find(q=>q.id===imp.id);
 assert.equal(copied.name,crew.name);assert.equal(copied.color,crew.color);assert.equal(f.raw().players[ii].abilityUntil,f.time.now+30000);
 assert.equal((await f.send(ii,'cancelAbility')).status,200);
 assert.equal((await f.send(ci,'pulse')).body.state.players.find(q=>q.id===imp.id).name,imp.name);
 assert.equal((await f.send(ii,'ability',{target:crew.id})).status,400);
 f.time.now=f.raw().players[ii].abilityReady+1;f.keep();assert.equal((await f.send(ii,'ability',{target:crew.id})).status,200);
 f.time.now+=30001;f.keep();assert.equal((await f.send(ci,'pulse')).body.state.players.find(q=>q.id===imp.id).name,imp.name);
 assert.equal(f.raw().players[ii].abilityUntil,0);
});

test('con dos impostores cada habilidad especial es única y la asignación queda privada',async()=>{
 const f=await roomFixture(7);assert.equal((await f.send(0,'configure',{impostors:2,tasks:2})).status,200);
 assert.equal((await f.send(0,'start')).status,200);
 const impostors=f.raw().players.filter(p=>p.role==='impostor').map(p=>p.specialRole).filter(Boolean);
 assert.equal(impostors.length,new Set(impostors).size);
 assert.ok(impostors.every(role=>['phantom','copier'].includes(role)));
 const crew=f.raw().players.find(p=>p.role==='crew');
 const view=(await f.send(indexOf(f,crew),'pulse')).body.state;
 assert.ok(view.roster.every(q=>q.specialRole===undefined));
});

test('recarga configurable: solo el líder, límites y tiempos reales al iniciar y matar',async()=>{
 const f=await roomFixture(5);
 assert.equal((await f.send(1,'configure',{killCooldown:12})).status,403);
 for(const value of [4,91,12.5])assert.equal((await f.send(0,'configure',{killCooldown:value})).status,400);
 assert.equal((await f.send(0,'configure',{killCooldown:12})).status,200);
 await start(f);f.raw().teachers=[];
 const imp=f.raw().players.find(p=>p.role==='impostor'),crew=f.raw().players.filter(p=>p.role==='crew'),ii=indexOf(f,imp);
 assert.equal(f.raw().players[ii].killReady,f.raw().revealUntil+12000);
 setPosition(f,crew[0],imp.x+35,imp.y,imp.floor);assert.equal((await f.send(ii,'kill',{target:crew[0].id})).status,200);
 const deadline=f.raw().players[ii].killReady;assert.equal(deadline,f.time.now+12000);
 setPosition(f,crew[1],imp.x+35,imp.y,imp.floor);
 f.time.now=deadline-1;f.keep();assert.equal((await f.send(ii,'kill',{target:crew[1].id})).status,400);
 f.time.now=deadline;f.keep();assert.equal((await f.send(ii,'kill',{target:crew[1].id})).status,200);
});

test('denunciar un cadáver durante cualquiera de los seis sabotajes abre la reunión',async()=>{
 for(const kind of Object.keys(SABOTAGES)){
  const f=await roomFixture(5);await start(f);f.raw().teachers=[];
  const imp=f.raw().players.find(p=>p.role==='impostor'),crew=f.raw().players.filter(p=>p.role==='crew'),ii=indexOf(f,imp),ri=indexOf(f,crew[1]),vi=indexOf(f,crew[0]);
  setPosition(f,crew[0],imp.x+35,imp.y,imp.floor);
  assert.equal((await f.send(ii,'kill',{target:crew[0].id})).status,200);
  f.time.now+=1000;f.keep();assert.equal((await f.send(ii,'sabotage',{kind})).status,200);
  const body=f.raw().bodies[0];setPosition(f,crew[1],body.x+30,body.y,body.floor);
  assert.equal((await f.send(vi,'report',{body:body.id})).status,400,'un fantasma no denuncia');
  const result=await f.send(ri,'report',{body:body.id});assert.equal(result.status,200,`${kind}: ${result.body.error}`);
  assert.equal(result.body.state.phase,'meeting');assert.equal(result.body.state.meeting.reason,'body');assert.equal(result.body.state.sabotage,null);
 }
});

test('Expulsados: movimiento libre dentro, salida bloqueada en ambas plantas y liberación sin teletransporte',async()=>{
 for(const floor of [0,1]){
  const f=await roomFixture();await f.send(0,'configure',{floors:String(floor)});await start(f);f.raw().teachers=[];
  const player=f.raw().players.find(p=>p.role==='crew'),i=indexOf(f,player),map=FLOORS[floor],area=map.rooms.find(r=>r.id===(floor?'expelled':'extra'));
  const point=floor?{x:63.5*TILE,y:(area.y+.55)*TILE}:{x:(area.x+.55)*TILE,y:42.5*TILE};
  assert.ok(canStand(detentionMap(map),point.x,point.y));setPosition(f,player,point.x,point.y,floor);
  f.raw().players[i].expelledUntil=f.time.now+30000;const until=f.raw().players[i].expelledUntil;
  const axis=floor?{x:0,y:-1}:{x:-1,y:0};await f.send(i,'pulse',axis);
  for(let n=0;n<12;n++){f.time.now+=250;f.keep();const s=(await f.send(i,'pulse',axis)).body.state;assert.ok(canStand(detentionMap(map),s.me.x,s.me.y));assert.equal(s.me.floor,floor);}
  const predicted={...f.raw().players[i]};move(detentionMap(map),predicted,axis.x,axis.y,.3,false,f.raw().config.speed);
  f.time.now+=300;f.keep();const packet=(await f.send(i,'pulse',{_motion:{seq:1,segments:[{...axis,ms:300}],...axis}})).body.state;
  assert.equal(packet.me.motionSeq,1);assert.ok(Math.abs(packet.me.x-predicted.x)<.01&&Math.abs(packet.me.y-predicted.y)<.01,'los tramos online respetan el límite');
  assert.equal(packet.players.find(q=>q.id===player.id).detained,true);
  assert.equal((await f.send(i,'enterVent',{id:'expelled'})).status,400);
  await f.send(i,'pulse',{x:0,y:0});const before={...f.raw().players[i]};
  f.time.now=until+1;f.keep();const free=(await f.send(i,'pulse',{x:0,y:0})).body.state.me;
  assert.equal(free.expelledUntil,0);assert.equal(free.x,before.x);assert.equal(free.y,before.y);
  await f.send(i,'pulse',axis);f.time.now+=300;f.keep();const outside=(await f.send(i,'pulse',axis)).body.state.me;
  assert.ok(!canStand(detentionMap(map),outside.x,outside.y),'puede salir al terminar el castigo');
 }
});

test('flecha directa: cruce de casillas suave, giro por el arco corto y estabilidad al llegar',()=>{
 const goal={x:1000,y:600};let position={x:550,y:550},angle=guideAngle(null,position,goal,1/60);
 for(let i=0;i<180;i++){position={x:550+i,y:550+Math.sin(i/30)*2};const next=guideAngle(angle,position,goal,1/60);assert.ok(Math.abs(next-angle)<.01);angle=next;}
 const across=guideAngle(Math.PI-.03,{x:0,y:0},{x:-100,y:-1},1/60);assert.ok(across>Math.PI-.03,'no da una vuelta completa');
 assert.equal(guideAngle(angle,{x:goal.x+1,y:goal.y+1},goal,1/60),angle);
 const expected=Math.atan2(goal.y-position.y,goal.x-position.x);assert.ok(Math.abs(angle-expected)<.01);
});

test('alcantarillas: cuatro circuitos aislados de tres, sin destinos indirectos extra ni enlaces unidireccionales',async()=>{
 assert.equal(VENT_GROUPS.length,4);assert.equal(new Set(VENT_GROUPS.flat()).size,12);
 for(const group of VENT_GROUPS){
  const reached=new Set(),queue=[group[0]];
  while(queue.length){const id=queue.pop();if(reached.has(id))continue;reached.add(id);const vent=VENTS.find(v=>v.id===id);assert.equal(vent.links.length,2);for(const next of vent.links){assert.ok(group.includes(next));assert.ok(VENTS.find(v=>v.id===next).links.includes(id));queue.push(next);}}
  assert.deepEqual([...reached].sort(),[...group].sort());
  for(const id of group)assert.deepEqual(VENTS.find(v=>v.id===id).links.slice().sort(),[...reached].filter(v=>v!==id).sort());
  const f=await roomFixture(5);await start(f);f.raw().teachers=[];
  const imp=f.raw().players.find(p=>p.role==='impostor'),i=indexOf(f,imp),vent=VENTS.find(v=>v.id===group[0]);setPosition(f,imp,vent.x,vent.y,vent.floor);
  assert.equal((await f.send(i,'enterVent',{id:vent.id})).status,200);
  for(const id of group.slice(1)){f.time.now+=600;f.keep();assert.equal((await f.send(i,'travelVent',{id})).status,200);f.time.now+=600;f.keep();for(const other of VENTS.filter(v=>!group.includes(v.id)))assert.equal((await f.send(i,'travelVent',{id:other.id})).status,400);}
 }
});

test('vestuario 3.0: negro y todas las opciones nuevas se sincronizan y se validan en el servidor',async()=>{
 assert.equal(COLOR_NAMES[10],'Negro');assert.equal(COLORS[10],'#171c27');
 const f=await roomFixture();const look={name:'Estilo negro',color:10,outfitColor:10,trimColor:2,skin:1,hat:11,pants:3,glasses:4,bag:3,accessory:9,hairColor:5,skinTone:4,shoes:2,shoeColor:10,badge:3};
 assert.equal((await f.send(0,'profile',look)).status,200);
 const other=(await f.send(1,'pulse')).body.state;
 for(const [key,value] of Object.entries(look)){assert.equal(other.roster.find(p=>p.id===f.raw().players[0].id)[key],value,key);assert.equal(other.players.find(p=>p.id===f.raw().players[0].id)[key],value,key);}
 const sanitized=(await f.send(0,'profile',{...look,hairColor:999,skinTone:-1,shoes:9,shoeColor:999,badge:99})).body.state.me;
 for(const key of ['hairColor','skinTone','shoes','shoeColor','badge'])assert.equal(sanitized[key],0,key);
 const copied=await f.send(1,'profile',{...look,name:'Otro nombre'});assert.equal(copied.status,400,'identidad negra ocupada');
});

test('cada accesorio y variante tiene un dibujo propio tanto en SVG como en el personaje de la partida',()=>{
 const base={color:10,outfitColor:10,trimColor:2,skin:1,hat:2,hairColor:0,skinTone:0,shoes:0,shoeColor:8,badge:0,pants:0,bag:0,glasses:0,accessory:0};
 const choices={skin:SKINS,hat:HATS,accessory:ACCESSORIES,glasses:GLASSES,bag:BAGS,pants:PANTS,hairColor:HAIR_COLORS,skinTone:SKIN_TONES,shoes:SHOES,badge:BADGES};
 for(const [key,items] of Object.entries(choices)){
  const svg=new Set(),canvas=new Set();
  for(let value=0;value<items.length;value++){
   const look={...base,[key]:value};svg.add(robotSVG(look));const calls=[];
   const ctx=new Proxy({},{get(o,k){return k in o?o[k]:(...args)=>calls.push([k,...args]);},set(o,k,v){o[k]=v;calls.push([k,v]);return true;}});
   assert.doesNotThrow(()=>drawAvatar({width:160,height:175,getContext:()=>ctx},look,1000));canvas.add(JSON.stringify(calls));
  }
  assert.equal(svg.size,items.length,`${key}: SVG distinguibles`);assert.equal(canvas.size,items.length,`${key}: dibujos de partida distinguibles`);
 }
 const final=robotSVG({...base,hairColor:2,skinTone:3});assert.ok(final.includes(HAIR_PALETTE[2]));assert.ok(final.includes(SKIN_PALETTE[3]));assert.ok(final.includes(COLORS[10]));
});

test('fantasmas quietos en debate y votación: servidor bloquea pulsos y tramos online',async()=>{
 const f=await roomFixture(5);await start(f);f.raw().teachers=[];
 const imp=f.raw().players.find(p=>p.role==='impostor'),crew=f.raw().players.filter(p=>p.role==='crew'),ii=indexOf(f,imp),dead=indexOf(f,crew[0]),caller=indexOf(f,crew[1]);
 setPosition(f,crew[0],imp.x+30,imp.y,imp.floor);assert.equal((await f.send(ii,'kill',{target:crew[0].id})).status,200);
 const body=f.raw().bodies[0];setPosition(f,crew[1],body.x+30,body.y,body.floor);assert.equal((await f.send(caller,'report',{body:body.id})).status,200);
 const fixed={...f.raw().players[dead].meetingPos};
 await f.send(dead,'pulse',{x:1,y:1});f.time.now+=300;f.keep();await f.send(dead,'pulse',{x:1,y:1});assert.deepEqual(f.raw().players[dead].meetingPos,fixed);
 f.time.now+=300;f.keep();const blocked=await f.send(dead,'pulse',{_motion:{seq:1,segments:[{x:1,y:0,ms:300}],x:1,y:0}});assert.equal(blocked.status,200);assert.deepEqual(f.raw().players[dead].meetingPos,fixed);assert.deepEqual(f.raw().players[dead].input,{x:0,y:0});
 f.time.now+=6000;f.keep();await f.send(dead,'pulse',{x:0,y:-1});f.time.now+=300;f.keep();await f.send(dead,'pulse',{x:0,y:-1});assert.equal(f.raw().meeting.stage,'voting');assert.deepEqual(f.raw().players[dead].meetingPos,fixed);
});


test('llegada al colegio: giro continuo de carretera a colegio y escena vectorial en cada fase',()=>{
 const first=arrivalPose(0),turn=arrivalPose(2.4),endTurn=arrivalPose(3.6),park=arrivalPose(6);
 assert.equal(first.x,turn.x);assert.ok(first.y>turn.y);assert.equal(endTurn.angle,Math.PI/2);assert.equal(park.y,endTurn.y);assert.ok(park.x>endTurn.x);
 for(const t of [2.4,3.6]){const before=arrivalPose(t-.0001),after=arrivalPose(t+.0001);assert.ok(Math.hypot(after.x-before.x,after.y-before.y)<.1);}
 for(const t of [0,1,2.9,4,5.8]){const calls=[];const ctx=new Proxy({},{get:(o,k)=>k in o?o[k]:(...a)=>calls.push([k,...a]),set:(o,k,v)=>{o[k]=v;return true;}});assert.doesNotThrow(()=>drawArrival({width:390,height:844,getContext:()=>ctx},t));assert.ok(calls.length>150);}
});


test('intro: cobertura total en vertical, horizontal, PC y alta densidad, con el coche dentro del encuadre',()=>{
 for(const [w,h] of [[390,844],[844,390],[320,568],[1920,1080],[2560,1080],[780,1688]])for(let t=0;t<=6.4;t+=.1){
  const camera=arrivalCamera(w,h,t),car=arrivalPose(t);assert.ok(camera.scale>=w/1000&&camera.scale>=h/670,'no encoge la escena');
  const x=w/2+(car.x-camera.x)*camera.scale,y=h/2+(car.y-camera.y)*camera.scale;
  assert.ok(x>20*camera.scale&&x<w-20*camera.scale,`coche visible x: ${w}×${h} en ${t}`);assert.ok(y>36*camera.scale&&y<h-36*camera.scale,`coche visible y: ${w}×${h} en ${t}`);
 }
});


test('terraza a pantalla completa: encuadre sin bandas y seguimiento horizontal de la caída en móvil vertical',()=>{
 for(const [width,height] of [[390,844],[844,390],[1920,1080]])for(const t of [0,1400,1800,2600,3300]){
  const view=terraceCamera(width,height,t);assert.ok(Math.abs(view.width/view.height-width/height)<.0001);
  const player=expulsionPose(t);if(width<height){const x=391+player.x+36;assert.ok(x>view.x&&x<view.x+view.width,'el expulsado no sale lateralmente antes de caer');}
 }
});
