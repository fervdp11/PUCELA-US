import {activeRepairs,WORLDS} from '../public/worlds.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import {api} from '../game/api.js';
import {MemoryStore} from '../server/memory-store.js';
import {D1Store} from '../server/d1-store.js';
import {makeServer} from '../server/node.js';
import {blockersOf,MAP,LOBBY,MEETING,FLOORS,STATIONS,REPAIRS,VENTS,VENT_GROUPS,SABOTAGES,DOORS,COLORS,COLOR_NAMES,HATS,SKINS,ACCESSORIES,GLASSES,BAGS,PANTS,HAIR_COLORS,SKIN_TONES,SHOES,BADGES,PETS,EFFECTS,EMOTES,HAIR_PALETTE,SKIN_PALETTE,taskStation,mapFor,TILE,canStand,detentionMap,move,distance,lineOfSight,visionLineOfSight,insideStairs,zoneAt} from '../public/content.js';
import {sabotageDestination,routeTo,guideAngle} from '../public/navigation.js';
import {botAnswer} from '../game/bots.js';
import {arrivalPose,arrivalCamera,drawArrival} from '../public/arrival.js';
import {expulsionPose,terraceCamera,terraceMarkup,animateTerrace,KICK_TIME} from '../public/expulsion.js';
import {drawAvatar,drawHero,robotSVG} from '../public/characters.js';
import {drawWorld,drawMiniMap,worldPoint,characterVisible} from '../public/render.js';
import {recordRemoteSample,remoteAt,poseAt,REMOTE_DELAY_MS,MAX_EXTRAPOLATION_MS} from '../public/remote-motion.js';

async function roomFixture(n=4){const store=new MemoryStore(),time={now:Date.now()},clients=[];const r=await api(store,'/api/create',{profile:{name:'Explorador 0',color:0}},time.now);assert.equal(r.status,200);clients.push(r.body.session);for(let i=1;i<n;i++){const r2=await api(store,'/api/join',{code:clients[0].code,profile:{name:`Explorador ${i}`,color:i}},time.now);assert.equal(r2.status,200);clients.push(r2.body.session);}const send=(i,type,data={})=>api(store,'/api/room',{...clients[i],type,data},time.now);const raw=()=>store.rooms.get(clients[0].code);const keep=()=>raw().players.forEach(p=>p.lastSeen=time.now);return {store,time,clients,send,raw,keep};}
async function start(f){assert.equal((await f.send(0,'configure',{tasks:2,discussion:5,voting:15})).status,200);assert.equal((await f.send(0,'start')).status,200);f.time.now+=46000;f.keep();return f.raw();}
const indexOf=(f,p)=>f.raw().players.findIndex(q=>q.id===p.id);

test('expulsión: espera en el borde, contacto de la patada y caída acelerada hacia abajo',()=>{
 for(const t of [0,500,KICK_TIME-1]){const p=expulsionPose(t);assert.equal(p.y,0);assert.equal(p.rotation,0);assert.equal(p.impact,false);}
 assert.equal(expulsionPose(KICK_TIME).footX,0);assert.equal(expulsionPose(KICK_TIME).impact,true);
 let previous=0;for(let t=KICK_TIME;t<=3400;t+=100){const p=expulsionPose(t);assert.ok(p.y>=previous);assert.ok(Number.isFinite(p.x+p.y+p.rotation+p.footX));previous=p.y;}
 assert.ok(expulsionPose(3400).y>300);assert.equal(expulsionPose(3400).footOpacity,0);
});
test('expulsión: conserva el aspecto y omite pie y jugador cuando el resultado no expulsa',()=>{
 const subject={color:10,outfitColor:3,trimColor:6,hat:15,skin:9,bag:2,accessory:10};
 const norm=v=>v.replace(/(suit|head)-[0-9a-f]+-[0-9a-z]+/g,'$1-X');for(const map of ['club','gym','house']){const scene=terraceMarkup(subject,map);assert.ok(norm(scene).includes(norm(robotSVG({...subject,alive:true}).replace('<svg ','<svg x="0" y="0" width="80" height="105" '))),map);
 const skip=terraceMarkup(null,map);assert.ok(!skip.includes('club-exit-player'),map);}assert.doesNotThrow(()=>animateTerrace({querySelector:()=>null},4000));
});
test('expulsión: actualiza cada fotograma y soporta saltos de tiempo sin dejar la patada en pantalla',()=>{
 const attributes={};const root={querySelector:name=>name==='.club-door-left'?null:({setAttribute:(key,value)=>{attributes[name+key]=value;}})};
 animateTerrace(root,1400);assert.equal(attributes['.terrace-impactopacity'],1);
 animateTerrace(root,4500);assert.equal(attributes['.terrace-footopacity'],undefined,'sin pie suelto: patea la pierna del profesor');assert.equal(attributes['.terrace-impactopacity'],0);assert.match(attributes['.terrace-playertransform'],/translate\(155 345\)/);
});
function setPosition(f,p,x,y,floor=0){const q=f.raw().players.find(q=>q.id===p.id);Object.assign(q,{x,y,floor,vent:null,transition:null,input:{x:0,y:0},moveAt:f.time.now});}
// La respuesta correcta es la misma que calcula el bot: un único validador.
function answer(task){return botAnswer(task.kind,task.challenge);}

test('el menú dibuja cabeza y vestuario completo sin detener el cliente',()=>{
 const colors=[],ctx=new Proxy({},{get(o,k){return k in o?o[k]:(...args)=>{if(k==='fill'||k==='stroke'||k==='fillRect')colors.push(o.fillStyle,o.strokeStyle);};},set(o,k,v){o[k]=v;return true;}});
 const canvas={width:160,height:175,getContext:()=>ctx};
 for(let skin=0;skin<7;skin++){
  const p={name:'Jugador',color:8,outfitColor:3,trimColor:6,skin,hat:4,pants:1,glasses:2,bag:1,accessory:1};
  assert.doesNotThrow(()=>drawAvatar(canvas,p,1000),`prenda ${skin}`);
  // BETA: el color principal manda; outfitColor ya no tiñe la ropa.
  const svg=robotSVG(p);assert.ok(svg.includes(`fill="${COLORS[8]}"`));assert.ok(!svg.includes(COLORS[3])||COLORS[3]===COLORS[8]);assert.ok(svg.includes(COLORS[6]));
 }
 assert.ok(colors.includes(COLORS[8]),'cabeza y ropa con el color principal');assert.ok(!colors.includes(COLORS[3]),'outfitColor ya no tiñe la ropa');assert.ok(colors.includes(COLORS[6]),'ropa secundaria');
 assert.doesNotThrow(()=>drawHero(canvas,1000));
});


test('mapa escolar: las dos plantas, todas las tareas, conductos, escaleras y reparaciones son transitables y están conectados',()=>{
 for(const map of FLOORS){const seen=new Set(),queue=[[Math.floor(map.spawn.x/TILE),Math.floor(map.spawn.y/TILE)]];while(queue.length){const [x,y]=queue.shift(),k=x+','+y;if(seen.has(k)||!canStand(map,(x+.5)*TILE,(y+.5)*TILE))continue;seen.add(k);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])queue.push([x+dx,y+dy]);}
  for(const r of map.rooms)assert.ok([...seen].some(k=>{const [x,y]=k.split(',').map(Number);return x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h;}),`habitación ${map.floor} ${r.id}`);
  for(const p of [...map.stations,...map.repair,...map.vents,...map.stairs,...STATIONS.filter(s=>s.delivery?.floor===map.floor).map(s=>s.delivery)]){assert.ok(canStand(map,p.x,p.y),`colisión ${p.id}`);assert.ok([...seen].some(k=>{const [x,y]=k.split(',').map(Number);return Math.hypot((x+.5)*TILE-p.x,(y+.5)*TILE-p.y)<100&&lineOfSight(map,{x:(x+.5)*TILE,y:(y+.5)*TILE},p);}),`acceso ${map.floor} ${p.id}`);}
 }
 assert.ok(canStand(LOBBY,LOBBY.spawn.x,LOBBY.spawn.y));
});
// BETA: tres mapas de una planta. Pasillos anchos, puertas de al menos dos
// casillas y muebles que frenan el paso pero no la vista.
test('plano orientativo: corredores anchos, puertas holgadas y visión a través de muebles',async()=>{
 for(const id of ['club','gym','house']){const map=WORLDS[id].FLOORS[0];
  assert.ok(map.corridors.some(c=>Math.min(c.w,c.h)>=3&&Math.max(c.w,c.h)>=15),id);
  assert.ok(map.doors.every(d=>Math.max(d.w,d.h)>=2),id);
  let pair=null;for(const p of map.props.filter(p=>p.kind!=='wall'&&p.w>=1&&p.h<=1.6)){const a={x:(p.x-.45)*TILE,y:(p.y+p.h/2)*TILE},b={x:(p.x+p.w+.45)*TILE,y:a.y};if(canStand(map,a.x,a.y)&&canStand(map,b.x,b.y)&&!lineOfSight(map,a,b)&&visionLineOfSight(map,a,b)){pair=[a,b];break;}}
  assert.ok(pair,`${id}: algún mueble bloquea el paso pero deja ver`);
 }
 const map=FLOORS[0],door=map.doors.find(d=>d.room==='comms'&&d.side==='top'),wallA={x:(door.x-2)*TILE,y:(door.y-.8)*TILE},wallB={x:(door.x-2)*TILE,y:(door.y+1)*TILE};
 assert.equal(visionLineOfSight(map,wallA,wallB),false,'los muros sí tapan');
 const f=await roomFixture();await start(f);const p=f.raw().players[0],target=f.raw().players[1],i=indexOf(f,p);
 const prop=map.props.find(q=>q.kind!=='wall'&&q.w>=1&&q.h<=1.6&&(()=>{const a={x:(q.x-.45)*TILE,y:(q.y+q.h/2)*TILE},b={x:(q.x+q.w+.45)*TILE,y:a.y};return canStand(map,a.x,a.y)&&canStand(map,b.x,b.y)&&!lineOfSight(map,a,b)&&visionLineOfSight(map,a,b);})());
 const a={x:(prop.x-.45)*TILE,y:(prop.y+prop.h/2)*TILE},b={x:(prop.x+prop.w+.45)*TILE,y:a.y};
 setPosition(f,p,a.x,a.y,0);setPosition(f,target,b.x,b.y,0);
 assert.ok((await f.send(i,'pulse')).body.state.players.some(q=>q.id===target.id));
});
test('cada umbral permanece libre en los tres mapas',()=>{
 for(const id of ['club','gym','house'])for(const map of WORLDS[id].FLOORS)for(const d of map.doors){
  const cx=(d.x+d.w/2)*TILE,cy=(d.y+d.h/2)*TILE,vertical=d.h>d.w;
  for(let t=-1.1;t<=1.1;t+=.1)assert.ok(canStand(map,cx+(vertical?t*TILE:0),cy+(vertical?0:t*TILE)),`${id} ${d.room} ${t.toFixed(1)}`);
 }
});
test('diez tareas por defecto y tareas distintas por jugador en los tres mapas',async()=>{
 for(const id of ['club','gym','house'])assert.ok(WORLDS[id].STATIONS.length>=14,id);
 const f=await roomFixture();assert.equal(f.raw().config.tasks,10);await start(f);
 for(const p of f.raw().players){assert.equal(p.tasks.length,2);assert.equal(new Set(p.tasks.map(t=>t.id)).size,2);}
 for(const map of ['club','gym','house']){const g=await roomFixture();assert.equal((await g.send(0,'configure',{map,tasks:10})).status,200);assert.equal((await g.send(0,'start')).status,200);
  for(const p of g.raw().players){assert.equal(p.tasks.length,10);assert.equal(new Set(p.tasks.map(t=>t.id)).size,10);assert.ok(p.tasks.every(t=>t.id.startsWith(map+'-')),map);}}
});
test('roles: empollón privado, delegado decisivo correcto o fallido e ingeniero por los conductos',async()=>{
 const f=await roomFixture(5);await start(f);
 const roles=f.raw().players.filter(p=>p.role==='crew'),assigned=roles.map(p=>p.specialRole).filter(Boolean);assert.equal(assigned.length,new Set(assigned).size);assert.ok(assigned.every(r=>['nerd','delegate','engineer','plug','believer'].includes(r)));roles.forEach((p,i)=>p.specialRole=['nerd','delegate','engineer',null][i]);
 const nerd=roles.find(p=>p.specialRole==='nerd'),delegate=roles.find(p=>p.specialRole==='delegate'),engineer=roles.find(p=>p.specialRole==='engineer'),impostor=f.raw().players.find(p=>p.role==='impostor');
 const other=(await f.send(indexOf(f,impostor),'pulse')).body.state;assert.ok([null,'phantom','copier'].includes(other.me.specialRole));assert.ok(!JSON.stringify(other.roster).includes('nerd'));
 const self=(await f.send(indexOf(f,nerd),'pulse')).body.state;assert.equal(self.me.specialRole,'nerd');
 const vent=VENTS[0],destination=VENTS.find(v=>v.id===vent.links[0]);setPosition(f,engineer,vent.x,vent.y);assert.equal((await f.send(indexOf(f,engineer),'enterVent',{id:vent.id})).status,200);
 f.time.now+=800;f.keep();assert.equal((await f.send(indexOf(f,engineer),'travelVent',{id:destination.id})).status,200);assert.ok(distance(f.raw().players[indexOf(f,engineer)],destination)<5);
 f.time.now+=800;f.keep();assert.equal((await f.send(indexOf(f,engineer),'exitVent')).status,200);
 setPosition(f,nerd,vent.x,vent.y);assert.equal((await f.send(indexOf(f,nerd),'enterVent',{id:vent.id})).status,403);
 setPosition(f,delegate,MAP.emergency.x,MAP.emergency.y);assert.equal((await f.send(indexOf(f,delegate),'emergency')).status,200);f.time.now+=8500;f.keep();
 assert.equal((await f.send(indexOf(f,impostor),'delegateVote',{target:nerd.id})).status,403);
 const wrong=await f.send(indexOf(f,delegate),'delegateVote',{target:nerd.id});assert.equal(wrong.status,200);assert.equal(wrong.body.state.meeting.result.expelled.id,delegate.id);assert.equal(wrong.body.state.meeting.stage,'result');
 assert.equal((await f.send(indexOf(f,delegate),'delegateVote',{target:impostor.id})).status,400);
 f.time.now+=13000;f.keep();assert.equal((await f.send(indexOf(f,nerd),'pulse')).body.state.phase,'game');

 const g=await roomFixture(7);assert.equal((await g.send(0,'configure',{impostors:2,discussion:5})).status,200);assert.equal((await g.send(0,'start')).status,200);g.time.now+=46000;g.keep();g.raw().players.find(p=>p.role==='crew').specialRole='delegate';
 const judge=g.raw().players.find(p=>p.specialRole==='delegate'),spy=g.raw().players.find(p=>p.role==='impostor');setPosition(g,judge,MAP.emergency.x,MAP.emergency.y);assert.equal((await g.send(indexOf(g,judge),'emergency')).status,200);g.time.now+=8500;g.keep();
 assert.equal((await g.send(indexOf(g,judge),'delegateVote',{target:spy.id})).status,200);assert.equal(g.raw().meeting.result.expelled.id,spy.id);assert.equal(g.raw().players.filter(p=>p.role==='impostor'&&p.alive).length,1);
 // 16.5 · Queda otro impostor: solo cae el acertado y la partida continúa.
 g.time.now+=13000;g.keep();const cont=(await g.send(indexOf(g,judge),'pulse')).body.state;assert.equal(cont.phase,'game');assert.equal(g.raw().players.filter(p=>p.role==='impostor'&&p.alive).length,1);
});
test('salas: códigos, identidad, host, límites, sincronización de aspectos y acciones desconocidas',async()=>{const f=await roomFixture();assert.match(f.clients[0].code,/^[A-Z2-9]{6}$/);assert.equal((await f.send(1,'start')).status,403);assert.equal((await f.send(1,'configure',{impostors:2})).status,403);assert.equal((await f.send(1,'profile',{name:'Técnico',color:4,hat:3,skin:2})).status,200);const s=(await f.send(0,'pulse')).body.state;assert.equal(s.roster.find(p=>p.name==='Técnico').hat,3);assert.ok(!JSON.stringify(s).includes(f.clients[1].token));assert.equal((await f.send(0,'assignRole',{role:'impostor'})).status,400);assert.equal((await api(f.store,'/api/room',{code:f.clients[0].code,token:'bad',type:'pulse'},f.time.now)).status,401);const dup=await api(f.store,'/api/join',{code:f.clients[0].code,profile:{name:'Técnico'}},f.time.now);assert.equal(dup.status,400);});
test('movimiento: autoridad del servidor, velocidad acotada y colisiones',async()=>{const f=await roomFixture();const initial=(await f.send(0,'pulse',{x:1,y:0,xPosition:9999})).body.state.me;f.time.now+=200;const moved=(await f.send(0,'pulse',{x:1,y:0})).body.state.me;assert.ok(Math.abs(moved.x-initial.x-41)<.01);f.time.now+=14000;f.keep();const capped=(await f.send(0,'pulse',{x:1,y:0})).body.state.me;assert.ok(capped.x-moved.x<=61.51);for(let i=0;i<100;i++){f.time.now+=200;f.keep();await f.send(0,'pulse',{x:1,y:0});}const last=f.raw().players[0];assert.ok(canStand(LOBBY,last.x,last.y));assert.ok(last.x<(LOBBY.width-1)*TILE);});
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
test('reuniones: denuncia, chat de muertos aislado, una votación, empate, expulsión y revancha',async()=>{const f=await roomFixture(5);await start(f);let imp=f.raw().players.find(p=>p.role==='impostor'),crew=f.raw().players.filter(p=>p.role==='crew'),ii=indexOf(f,imp);setPosition(f,imp,MAP.spawn.x,MAP.spawn.y);setPosition(f,crew[0],MAP.spawn.x+30,MAP.spawn.y);await f.send(ii,'kill',{target:crew[0].id});const body=f.raw().bodies[0];setPosition(f,crew[1],body.x+45,body.y);const caller=indexOf(f,crew[1]);assert.equal((await f.send(caller,'report',{body:body.id})).body.state.phase,'meeting');assert.equal((await f.send(caller,'vote',{target:imp.id})).status,400);const dead=indexOf(f,crew[0]);f.time.now+=1000;f.keep();assert.equal((await f.send(dead,'chat',{text:'Mensaje fantasma'})).status,200);assert.ok(!(await f.send(caller,'pulse')).body.state.chat.some(m=>m.text==='Mensaje fantasma'));assert.ok((await f.send(dead,'pulse')).body.state.chat.some(m=>m.text==='Mensaje fantasma'));f.time.now+=7500;f.keep();const live=f.raw().players.filter(p=>p.alive);assert.equal((await f.send(indexOf(f,live[0]),'vote',{target:'skip'})).status,200);assert.equal((await f.send(indexOf(f,live[0]),'vote',{target:imp.id})).status,400);assert.equal((await f.send(dead,'vote',{target:imp.id})).status,400);await f.send(indexOf(f,live[1]),'vote',{target:'skip'});await f.send(indexOf(f,live[2]),'vote',{target:imp.id});const tie=await f.send(indexOf(f,live[3]),'vote',{target:imp.id});assert.equal(tie.body.state.meeting.result.expelled,null);assert.match(tie.body.state.meeting.result.reason,/Empate/);f.time.now+=13000;f.keep();assert.equal((await f.send(caller,'pulse')).body.state.phase,'game');assert.equal(f.raw().bodies.length,0);f.time.now+=30000;f.keep();setPosition(f,crew[1],MAP.emergency.x,MAP.emergency.y);assert.equal((await f.send(caller,'emergency')).status,200);f.time.now+=8500;f.keep();for(const p of live)await f.send(indexOf(f,p),'vote',{target:imp.id});assert.equal(f.raw().phase,'meeting');assert.equal(f.raw().meeting.stage,'result');assert.equal(f.raw().meeting.result.expelled.role,'impostor');f.time.now+=13000;f.keep();await f.send(caller,'pulse');assert.equal(f.raw().phase,'ended');assert.equal(f.raw().result.winner,'crew');const host=f.raw().players.find(p=>p.id===f.raw().host);assert.equal((await f.send(indexOf(f,host),'return')).body.state.phase,'lobby');assert.equal((await f.send(indexOf(f,host),'start')).body.state.phase,'game');assert.equal(f.raw().gameNumber,2);assert.ok(f.raw().players.every(p=>p.alive));});
test('tareas del club: todos los minijuegos, solución y tiempo; espectros y victoria por tareas',async()=>{
 const f=await roomFixture();await start(f);for(const p of f.raw().players.filter(p=>p.role==='crew'))p.tasks=STATIONS.map(s=>({id:s.id,done:false}));const ids=f.raw().players.filter(p=>p.role==='crew').map(p=>p.id);f.raw().players.find(p=>p.id===ids[0]).alive=false;
 for(const id of ids)for(const station of STATIONS){const p=f.raw().players.find(p=>p.id===id),i=indexOf(f,p);for(let stage=0;stage<(station.delivery?2:1);stage++){
  const target=stage?station.delivery:station;setPosition(f,p,target.x,target.y,target.floor);
  const r=await f.send(i,'beginTask',{id:station.id});assert.equal(r.status,200,`${station.id}: ${r.body.error}`);const task=r.body.task;
  assert.equal((await f.send(i,'finishTask',{id:task.id,solution:answer(task)})).status,400);f.time.now+=8000;f.keep();
  assert.equal((await f.send(i,'finishTask',{id:task.id,solution:'WRONG'})).status,400);
  const done=await f.send(i,'finishTask',{id:task.id,solution:answer(task)});assert.equal(done.status,200,`${station.id}: ${done.body.error}`);
  if(station.delivery&&stage===0){assert.equal(done.body.carrying,true);assert.equal(done.body.state.me.tasks.find(t=>t.id===station.id).done,false);}
 }}assert.equal(f.raw().result.winner,'crew');
});
test('sabotajes: consecuencias, soluciones, cooperación, recarga de 67,5 s y victoria tras 90 s sin reparar',async()=>{
 for(const kind of Object.keys(SABOTAGES)){
  const f=await roomFixture();await start(f);const imp=f.raw().players.find(p=>p.role==='impostor'),crew=f.raw().players.filter(p=>p.role==='crew'),ii=indexOf(f,imp);f.time.now+=15000;f.keep();
  assert.equal((await f.send(indexOf(f,crew[0]),'sabotage',{kind})).status,403);assert.equal((await f.send(ii,'sabotage',{kind})).status,200);assert.equal((await f.send(ii,'sabotage',{kind})).status,400);
  if(kind==='lights'){assert.equal((await f.send(indexOf(f,crew[0]),'pulse')).body.state.me.vision,170);assert.equal((await f.send(ii,'pulse')).body.state.me.vision,2000);}
  if(kind==='doors'){const closed=f.raw().sabotage.closed;assert.ok(closed.length);const d=DOORS.find(d=>d.id===closed[0]);assert.equal(canStand(mapFor(d.floor,f.raw().sabotage),(d.x+1)*TILE,(d.y+.5)*TILE),false);}
  const panels=activeRepairs(f.raw());for(let j=0;j<panels.length;j++){
   const panel=panels[j],p=kind==='emergency'?crew[j]:crew[0],i=indexOf(f,p);setPosition(f,p,panel.x,panel.y,panel.floor);
   const begin=await f.send(i,'beginRepair',{id:panel.id});assert.equal(begin.status,200,kind);const repair=begin.body.repair;
   assert.equal((await f.send(i,'finishRepair',{id:panel.id,solution:answer(repair)})).status,400);f.time.now+=8000;f.keep();
   assert.equal((await f.send(i,'finishRepair',{id:panel.id,solution:'WRONG'})).status,400);assert.equal((await f.send(i,'finishRepair',{id:panel.id,solution:answer(repair)})).status,200,kind);
  }
  assert.equal(f.raw().sabotage,null,kind);const firstReady=f.raw().sabotageReady;f.time.now=firstReady-1;f.keep();assert.equal((await f.send(ii,'sabotage',{kind})).status,400);f.time.now=firstReady;f.keep();assert.equal((await f.send(ii,'sabotage',{kind})).status,200);assert.equal(f.raw().sabotageReady,f.time.now+67500);f.time.now+=89999;f.keep();assert.equal((await f.send(ii,'pulse')).body.state.phase,'game');f.time.now++;f.keep();const final=(await f.send(ii,'pulse')).body.state;assert.equal(final.phase,'ended');assert.equal(final.result.winner,'impostor');
 }
});
test('desconexión: conserva sesión, cambia líder, caduca y no permite resucitar con token',async()=>{const f=await roomFixture();const original=f.raw().host;f.time.now+=5000;assert.equal((await f.send(1,'pulse')).body.state.host,f.raw().players[1].id);assert.notEqual(f.raw().host,original);assert.equal((await f.send(0,'pulse')).status,200);f.time.now+=31000;f.raw().players[1].lastSeen=f.time.now;assert.equal((await f.send(1,'pulse')).body.state.roster.length,1);assert.equal((await f.send(0,'pulse')).status,401);});

class TestD1 {constructor(){this.sqlite=new DatabaseSync(':memory:');this.sqlite.exec('CREATE TABLE rooms(code TEXT PRIMARY KEY,state TEXT NOT NULL,revision INTEGER NOT NULL,updated INTEGER NOT NULL);CREATE TABLE entry_limits(id TEXT PRIMARY KEY,count INTEGER,expires INTEGER);');}prepare(sql){const stmt=this.sqlite.prepare(sql);let args=[];const p={bind(...a){args=a;return p;},async first(){return stmt.get(...args)||null;},async run(){const r=stmt.run(...args);return {meta:{changes:r.changes}};},async all(){return {results:stmt.all(...args)};}};return p;}async batch(a){return Promise.all(a.map(p=>p.run()));}}
test('D1: peticiones concurrentes conservan a todos los jugadores y no duplican votos',async()=>{const db=new TestD1(),store=new D1Store(db),n=Date.now();const created=await api(store,'/api/create',{profile:{name:'Host'}},n);assert.equal(created.status,200);const session=created.body.session;const joined=await Promise.all(Array.from({length:6},(_,i)=>api(store,'/api/join',{code:session.code,profile:{name:`D1-${i}`,color:i+1}},n)));joined.forEach(r=>assert.equal(r.status,200));const r=await api(store,'/api/room',{...session,type:'pulse'},n);assert.equal(r.body.state.roster.length,7);await api(store,'/api/room',{...session,type:'configure',data:{discussion:5}},n);await api(store,'/api/room',{...session,type:'start'},n);const row=db.sqlite.prepare('SELECT state FROM rooms WHERE code=?').get(session.code),edited=JSON.parse(row.state);Object.assign(edited.players[0],{x:MAP.emergency.x,y:MAP.emergency.y,floor:0});db.sqlite.prepare('UPDATE rooms SET state=? WHERE code=?').run(JSON.stringify(edited),session.code);const emergency=await api(store,'/api/room',{...session,type:'emergency'},n+46000);assert.equal(emergency.status,200);const votes=await Promise.all([0,1].map(()=>api(store,'/api/room',{...session,type:'vote',data:{target:'skip'}},n+54500)));assert.deepEqual(votes.map(r=>r.status).sort(),[200,400]);db.sqlite.close();});
test('HTTP real con cuatro clientes: crear, unirse, configurar, mover, iniciar, votar, terminar y volver',async t=>{const store=new MemoryStore(),server=makeServer(store);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));const url=`http://127.0.0.1:${server.address().port}`;const post=async(path,body)=>{const r=await fetch(url+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};};assert.equal((await fetch(url)).status,200);assert.equal((await fetch(url+'/client.js')).status,200);assert.deepEqual((await (await fetch(url+'/api/rooms')).json()).rooms,[]);const host=await post('/api/create',{profile:{name:'HTTP Host'}});const sessions=[host.body.session];assert.equal((await (await fetch(url+'/api/rooms')).json()).rooms[0].code,sessions[0].code);for(let i=1;i<4;i++)sessions.push((await post('/api/join',{code:sessions[0].code,profile:{name:`HTTP ${i}`,color:i}})).body.session);const send=(i,type,data={})=>post('/api/room',{...sessions[i],type,data});await send(0,'pulse',{x:1,y:0});await delay(200);assert.ok((await send(0,'pulse',{x:0,y:0})).body.state.me.x>host.body.state.me.x);assert.equal((await send(1,'start')).status,403);await send(0,'configure',{discussion:5});assert.equal((await send(0,'start')).body.state.phase,'game');const raw=store.rooms.get(sessions[0].code);raw.revealUntil=0;raw.emergencyReady=0;const imp=raw.players.find(p=>p.role==='impostor');const impId=imp.id;const caller=raw.players.findIndex(p=>p.role==='crew');raw.players[caller].x=MAP.emergency.x;raw.players[caller].y=MAP.emergency.y;assert.equal((await send(caller,'emergency')).body.state.phase,'meeting');store.rooms.get(sessions[0].code).meeting.discussionEnd=Date.now()-1;for(let i=0;i<4;i++)assert.equal((await send(i,'vote',{target:impId})).status,200);const result=await send(0,'pulse');assert.equal(result.body.state.meeting.stage,'result');assert.equal(result.body.state.meeting.result.expelled.role,'impostor');store.rooms.get(sessions[0].code).meeting.resultUntil=Date.now()-1;const ended=await send(0,'pulse');assert.equal(ended.body.state.result.winner,'crew');assert.equal((await send(0,'return')).body.state.phase,'lobby');assert.equal((await send(0,'start')).body.state.gameNumber,2);});

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

test('conductos online: alcance, rol, ocultación, transiciones y reuniones',async()=>{
 const f=await roomFixture(5);await start(f);const imp=f.raw().players.find(p=>p.role==='impostor'),crew=f.raw().players.filter(p=>p.role==='crew'),ii=indexOf(f,imp),ci=indexOf(f,crew[0]),viewer=indexOf(f,crew[1]);
 assert.equal((await f.send(ci,'stairs',{id:'stairs-west'})).status,400,'la BETA no tiene escaleras');
 const v=VENTS[0];f.raw().players.find(p=>p.id===crew[0].id).specialRole=null;setPosition(f,crew[0],v.x,v.y,v.floor);assert.equal((await f.send(ci,'enterVent',{id:v.id})).status,403);
 assert.equal((await f.send(ii,'enterVent',{id:v.id})).status,400);setPosition(f,imp,v.x,v.y,v.floor);setPosition(f,crew[1],v.x-40,v.y,v.floor);
 const entered=await f.send(ii,'enterVent',{id:v.id});assert.equal(entered.status,200);assert.equal(entered.body.state.me.vent,v.id);
 f.time.now+=800;f.keep();const observer=(await f.send(viewer,'pulse')).body.state;assert.ok(!observer.players.some(p=>p.id===imp.id));assert.ok(!JSON.stringify(observer).includes('vent-in'));
 const still=await f.send(ii,'pulse',{_motion:{seq:1,segments:[{x:1,y:0,ms:300}],x:1,y:0}});assert.equal(still.status,200);assert.equal(still.body.state.me.x,v.x);
 assert.equal((await f.send(ii,'travelVent',{id:VENTS.find(q=>q.id!==v.id&&!v.links.includes(q.id)).id})).status,400,'solo a conductos enlazados');
 const destination=VENTS.find(q=>q.id===v.links[0]);const moved=await f.send(ii,'travelVent',{id:destination.id});assert.equal(moved.status,200);assert.ok(distance(moved.body.state.me,destination)<5);
 f.time.now+=600;f.keep();assert.equal((await f.send(ii,'exitVent')).status,200);assert.ok(canStand(MAP,f.raw().players[ii].x,f.raw().players[ii].y));
 f.time.now+=800;f.keep();setPosition(f,imp,v.x,v.y,0);assert.equal((await f.send(ii,'enterVent',{id:v.id})).status,400);
 f.time.now+=20000;f.keep();assert.equal((await f.send(ii,'enterVent',{id:v.id})).status,200);setPosition(f,crew[0],MAP.emergency.x,MAP.emergency.y,0);
 assert.equal((await f.send(ci,'emergency')).body.state.phase,'meeting');assert.equal(f.raw().players[ii].vent,null);assert.equal((await f.send(ii,'enterVent',{id:v.id})).status,400);
});

test('conductos: viajes reversibles, límite de 10 s y 20 s de recarga desde la salida',async()=>{
 const f=await roomFixture(5);await start(f);const imp=f.raw().players.find(p=>p.role==='impostor'),ii=indexOf(f,imp),v=VENTS[0],other=VENTS.find(q=>q.id===v.links[0]);setPosition(f,imp,v.x,v.y);
 assert.equal((await f.send(ii,'enterVent',{id:v.id})).status,200);const started=f.raw().players[ii].ventSince;
 f.time.now+=800;f.keep();let p=await f.send(ii,'travelVent',{id:other.id});assert.equal(p.status,200);assert.ok(distance(p.body.state.me,other)<5);assert.equal(p.body.state.me.ventReady,0);
 f.time.now+=800;f.keep();p=await f.send(ii,'travelVent',{id:v.id});assert.equal(p.status,200);assert.ok(distance(p.body.state.me,v)<5);assert.equal(p.body.state.me.ventSince,started);
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
 const labels=[],ctx=new Proxy({measureText:()=>({width:50}),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}}),strokeText:txt=>labels.push(txt)},{get(o,k){return k in o?o[k]:()=>{}},set(o,k,v){o[k]=v;return true;}}),canvas={width:0,height:0,getContext:()=>ctx,getBoundingClientRect:()=>({width:900,height:600})},previousDocument=globalThis.document,previousWindow=globalThis.window;
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};globalThis.window={devicePixelRatio:1};try{assert.doesNotThrow(()=>drawWorld(canvas,s,{...s.me,input:{x:0,y:0}},new Map(),{x:s.me.x,y:s.me.y},.016,performance.now()));assert.ok(labels.includes(imp.name));}finally{globalThis.document=previousDocument;globalThis.window=previousWindow;}
});

test('botón de emergencia: la mesa no impide pulsarlo desde el suelo contiguo en los tres mapas',async()=>{
 for(const map of ['club','gym','house']){const f=await roomFixture(4);assert.equal((await f.send(0,'configure',{map})).status,200);await start(f);const w=WORLDS[map],m=w.FLOORS[0],e=m.emergency,crew=f.raw().players.find(p=>p.role==='crew'),i=indexOf(f,crew);
  let spot=null;for(let r=70;r<=170&&!spot;r+=10)for(let a=0;a<24&&!spot;a++){const q={x:e.x+Math.cos(a*Math.PI/12)*r,y:e.y+Math.sin(a*Math.PI/12)*r};if(canStand(m,q.x,q.y)&&w.roomAt(q.x,q.y,0)===w.emergencyRoom)spot=q;}
  assert.ok(spot,map);setPosition(f,crew,spot.x,spot.y);assert.equal((await f.send(i,'emergency')).status,200,map);}
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
 const f=await roomFixture(4);await start(f);const crew=f.raw().players.filter(q=>q.role==='crew'),inside=crew[0],outside=crew[1],a=indexOf(f,inside),b=indexOf(f,outside);
 const door=MAP.doors.find(d=>d.room==='comms'&&d.side==='top'),cx=(door.x+door.w/2)*TILE;setPosition(f,inside,cx,(door.y+1.2)*TILE);setPosition(f,outside,cx,(door.y-1.2)*TILE);
 assert.notEqual(zoneAt(MAP,inside.x,inside.y),zoneAt(MAP,outside.x,outside.y));assert.ok(visionLineOfSight(MAP,outside,inside),'la puerta deja una línea de visión geométrica');assert.equal(characterVisible(MAP,outside,inside,420),true);
 assert.equal(characterVisible(MAP,{x:(door.x-2.5)*TILE,y:outside.y},inside,420),false,'pared entre espectador y jugador');
 assert.ok((await f.send(b,'pulse')).body.state.players.some(q=>q.id===inside.id),'el cliente conoce el personaje próximo al umbral para dibujarlo al entrar');
 setPosition(f,outside,cx,(door.y+.4)*TILE);assert.equal(characterVisible(MAP,f.raw().players[b],inside,420),true);assert.equal((await f.send(b,'pulse')).body.state.players.find(q=>q.id===inside.id)?.name,inside.name);assert.equal((await f.send(a,'pulse')).body.state.players.find(q=>q.id===outside.id)?.name,outside.name);
});

test('un jugador de la misma sala se ve en todo el círculo, sin mostrarlo más allá',async()=>{
 const f=await roomFixture(4);await start(f);const crew=f.raw().players.filter(q=>q.role==='crew'),viewer=crew[0],other=crew[1],i=indexOf(f,viewer);
 setPosition(f,viewer,27*TILE,5*TILE);setPosition(f,other,33.4*TILE,5*TILE);
 assert.ok(distance(viewer,other)>300&&distance(viewer,other)<420);assert.equal(characterVisible(MAP,viewer,other,420),true);assert.ok((await f.send(i,'pulse')).body.state.players.some(q=>q.id===other.id));
 assert.equal(characterVisible(MAP,viewer,{...other,x:35.1*TILE},420),false);
});

// (El plano holográfico de la BETA se comprueba en motion-vision.test.js.)

test('los fantasmas caminan al doble de velocidad sin perder la autoridad de colisiones',()=>{
 const start={x:30*TILE,y:8*TILE},living={...start},ghost={...start};move(MAP,living,1,0,.2,false);move(MAP,ghost,1,0,.2,true);assert.ok(Math.abs((ghost.x-start.x)-2*(living.x-start.x))<1);assert.ok(canStand(MAP,living.x,living.y));
});

test('tableta de reunión: todos quedan quietos, posiciones coherentes y sin doble voto',async()=>{
 const f=await roomFixture(5);await start(f);const caller=f.raw().players.find(p=>p.role==='crew'),i=indexOf(f,caller),x=MAP.emergency.x,y=MAP.emergency.y;setPosition(f,caller,x,y);const entered=await f.send(i,'emergency');assert.equal(entered.status,200);assert.ok(entered.body.state.players.length===5);const initial=entered.body.state.me.x;
 await f.send(i,'pulse',{x:1,y:0});f.time.now+=210;f.keep();const moved=await f.send(i,'pulse',{x:0,y:0});assert.equal(moved.body.state.me.x,initial);assert.equal(f.raw().players[i].x,x);assert.equal(f.raw().players[i].y,y);const observer=await f.send((i+1)%5,'pulse');assert.equal(observer.body.state.players.find(p=>p.id===caller.id).x,moved.body.state.me.x);
 f.time.now+=8500;f.keep();assert.equal((await f.send(i,'vote',{target:'skip'})).status,200);assert.equal((await f.send(i,'vote',{target:'skip'})).status,400);
});

test('roles únicos, aviso privado de El enchufe y cuatro señales fijas al creyente cada 15 s',async()=>{
 const f=await roomFixture(6);await start(f);const crew=f.raw().players.filter(p=>p.role==='crew'),imp=f.raw().players.find(p=>p.role==='impostor');assert.equal(new Set(crew.map(p=>p.specialRole).filter(Boolean)).size,crew.map(p=>p.specialRole).filter(Boolean).length);
 crew.forEach(p=>p.specialRole=null);crew[1].specialRole='believer';crew[2].specialRole='plug';setPosition(f,imp,MAP.spawn.x,MAP.spawn.y);setPosition(f,crew[0],MAP.spawn.x+35,MAP.spawn.y);const r=await f.send(indexOf(f,imp),'kill',{target:crew[0].id});assert.equal(r.status,200);
 const notice=(await f.send(indexOf(f,crew[2]),'pulse')).body.state.deathNotices.at(-1);assert.equal(notice.name,crew[0].name);assert.equal(notice.floor,undefined,'sin plantas');assert.equal((await f.send(indexOf(f,crew[3]),'pulse')).body.state.deathNotices.length,0);
 const ghost=indexOf(f,crew[0]),believer=indexOf(f,crew[1]),emojis=(await f.send(ghost,'pulse')).body.state.spiritEmojis;assert.equal(new Set(emojis).size,4);const sc=(await f.send(ghost,'pulse')).body.state.spiritColors;assert.equal(new Set(sc).size,4,'cuatro colores de identidad distintos');assert.ok(sc.every(c=>Number.isInteger(c)&&c>=0&&c<12));assert.equal((await f.send(ghost,'spirit',{emoji:'inexistente'})).status,400);
 assert.equal((await f.send(ghost,'spirit',{emoji:emojis[0]})).status,200);assert.equal((await f.send(ghost,'spirit',{emoji:emojis[1]})).status,400);assert.equal((await f.send(believer,'pulse')).body.state.spiritMessages.at(-1).emoji,emojis[0]);assert.equal((await f.send(indexOf(f,imp),'pulse')).body.state.spiritMessages.length,0);
 f.time.now+=15001;f.keep();assert.equal((await f.send(ghost,'spirit',{emoji:emojis[1]})).status,200);assert.deepEqual((await f.send(ghost,'pulse')).body.state.spiritEmojis,emojis);
});

// (BETA) Retirado junto con el Colegio: profesores, plantas, escaleras, despachos y Expulsados ya no existen.


test('lienzo de reunión: dibuja la clase, botón, chat, participantes y permite seleccionar por coordenadas',async()=>{
 const f=await roomFixture(4);await start(f);const crew=f.raw().players.find(p=>p.role==='crew'),i=indexOf(f,crew);setPosition(f,crew,MAP.emergency.x,MAP.emergency.y);await f.send(i,'emergency');f.time.now+=1000;f.keep();await f.send(i,'chat',{text:'Veo algo raro'});const s=(await f.send(i,'pulse')).body.state;s.selectedVote=f.raw().players.find(p=>p.id!==crew.id).id;s.receivedAt=Date.now();const labels=[];
 const ctx=new Proxy({measureText:()=>({width:110}),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}}),fillText:(v)=>labels.push(v)},{get(o,k){return k in o?o[k]:()=>{}},set(o,k,v){o[k]=v;return true;}}),canvas={width:0,height:0,getContext:()=>ctx,getBoundingClientRect:()=>({left:80,top:30,width:900,height:600})},previousDocument=globalThis.document,previousWindow=globalThis.window;
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};globalThis.window={devicePixelRatio:1};try{const cam={x:s.me.x,y:s.me.y};assert.doesNotThrow(()=>drawWorld(canvas,s,{...s.me,input:{x:0,y:0}},new Map(),cam,0,performance.now()));assert.ok(labels.includes('Veo algo raro'));const center=worldPoint(canvas,cam,{clientX:530,clientY:330});assert.equal(center.x,cam.x);assert.equal(center.y,cam.y);}finally{globalThis.document=previousDocument;globalThis.window=previousWindow;}
});

test('la capa de luz deja visible el personaje propio y los nombres van encima',async()=>{
 const f=await roomFixture(4);await start(f);const p=f.raw().players.find(q=>q.role==='crew'),i=indexOf(f,p);setPosition(f,p,MAP.spawn.x,MAP.spawn.y);const s=(await f.send(i,'pulse')).body.state;s.receivedAt=Date.now();const operations=[];
 const ctx=new Proxy({measureText:()=>({width:50}),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}}),drawImage:(...a)=>{if(a.length===9)operations.push('fog');},roundRect:()=>operations.push('sprite-shape'),fillText:txt=>operations.push(txt)},{get(o,k){return k in o?o[k]:()=>{}},set(o,k,v){o[k]=v;return true;}}),canvas={width:0,height:0,getContext:()=>ctx,getBoundingClientRect:()=>({width:900,height:600})},previousDocument=globalThis.document,previousWindow=globalThis.window;
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};globalThis.window={devicePixelRatio:1};try{assert.doesNotThrow(()=>drawWorld(canvas,s,{...s.me,input:{x:0,y:0}},new Map(),{x:s.me.x,y:s.me.y},.016,performance.now()));const fog=operations.indexOf('fog');assert.ok(fog>=0);assert.ok(operations.slice(0,fog).includes('sprite-shape'));assert.ok(operations.indexOf(p.name)>fog,'el nombre se dibuja encima de la capa de luz');}finally{globalThis.document=previousDocument;globalThis.window=previousWindow;}
});

test('ropa online: todas las prendas se validan y aparecen en las otras perspectivas',async()=>{
 // BETA: el color principal manda; la ropa usa siempre ese mismo color.
 const f=await roomFixture();const wardrobe={name:'Profesor',color:7,skin:4,hat:4,outfitColor:7,trimColor:5,pants:1,glasses:2,bag:1,accessory:1};
 assert.equal((await f.send(0,'profile',{...wardrobe,outfitColor:3})).status,200);const roster=(await f.send(1,'pulse')).body.state.roster.find(p=>p.name==='Profesor');for(const [k,v] of Object.entries(wardrobe))assert.equal(roster[k],v,k);
 const sanitized=await f.send(0,'profile',{...wardrobe,skin:999,bag:999});assert.equal(sanitized.body.state.me.skin,0);assert.equal(sanitized.body.state.me.bag,0);
});

// BETA · Cierre de puertas por sala con recarga propia: nunca encierra a nadie
// en el umbral, y su uso retrasa las averías 20 s (y al revés), sin acortar
// nunca una espera mayor. La emergencia cooperativa sigue caducando.
test('puertas seguras, categorías de sabotaje cruzadas y emergencia cooperativa que caduca',async()=>{
 const f=await roomFixture();await start(f);const imp=f.raw().players.find(p=>p.role==='impostor'),crew=f.raw().players.filter(p=>p.role==='crew'),ii=indexOf(f,imp),ci=indexOf(f,crew[0]);f.time.now+=40000;f.keep();
 const door=DOORS[0],own=DOORS.filter(d=>d.room===door.room);setPosition(f,crew[0],(door.x+door.w/2)*TILE,(door.y+door.h/2)*TILE,0);
 f.raw().sabotageReady=0;assert.equal((await f.send(ci,'closeDoors',{room:door.room})).status,403);
 const closed=await f.send(ii,'closeDoors',{room:door.room});assert.equal(closed.status,200,closed.body.error);const lock=f.raw().doorLocks.find(l=>l.room===door.room);assert.ok(lock);
 assert.ok(!lock.doors.includes(door.id),'la puerta ocupada queda abierta');assert.equal(lock.doors.length,own.length-1);assert.ok(canStand(mapFor(0,blockersOf(f.raw(),f.time.now)),f.raw().players[ci].x,f.raw().players[ci].y));
 assert.equal(f.raw().sabotageReady,f.time.now+20000,'las averías esperan 20 s');assert.equal((await f.send(ii,'closeDoors',{room:DOORS.find(d=>d.room!==door.room).room})).status,400,'recarga de puertas');
 f.raw().sabotageReady=f.time.now+50000;f.raw().doorReady=0;await f.send(ii,'closeDoors',{room:DOORS.find(d=>d.room!==door.room).room});assert.equal(f.raw().sabotageReady,f.time.now+50000,'nunca se acorta una espera mayor');
 f.time.now+=10001;f.keep();await f.send(ci,'pulse');assert.ok(!(f.raw().doorLocks||[]).some(l=>l.room===door.room&&l.until>f.time.now),'las puertas se reabren a los 10 s');
 f.raw().sabotageReady=f.time.now;await f.send(ii,'sabotage',{kind:'emergency'});assert.ok(f.raw().doorReady>=f.time.now+20000,'las puertas esperan al menos 20 s');let panel=activeRepairs(f.raw())[0];setPosition(f,crew[0],panel.x,panel.y,panel.floor);const repair=(await f.send(ci,'beginRepair',{id:panel.id})).body.repair;f.time.now+=5000;f.keep();await f.send(ci,'finishRepair',{id:panel.id,solution:answer(repair)});assert.equal(f.raw().sabotage.fixed.length,1);
 f.time.now+=9000;f.keep();await f.send(ci,'pulse');assert.equal(f.raw().sabotage.fixed.length,0);assert.equal(f.raw().phase,'game');
 for(const r of activeRepairs(f.raw())){setPosition(f,crew[0],r.x,r.y,r.floor);const task=(await f.send(ci,'beginRepair',{id:r.id})).body.repair;f.time.now+=5000;f.keep();await f.send(ci,'finishRepair',{id:r.id,solution:answer(task)});}assert.ok(f.raw().sabotage);assert.equal(f.raw().sabotage.fixed.length,0,'una sola persona no satisface la cooperación');
});

test('el líder configura la velocidad; la BETA tiene una sola planta con objetivos, conductos y botón de reunión',async()=>{
 for(const map of ['club','gym','house']){
  const f=await roomFixture(5),w=WORLDS[map];
  assert.equal((await f.send(1,'configure',{speed:1.5})).status,403);
  assert.equal((await f.send(0,'configure',{speed:3})).status,400);
  assert.equal((await f.send(0,'configure',{map,floors:'1'})).status,400);
  assert.equal((await f.send(0,'configure',{map,speed:1.5,tasks:10,discussion:5,voting:15})).status,200);
  assert.equal((await f.send(0,'start')).status,200);
  const room=f.raw(),imp=room.players.find(p=>p.role==='impostor'),crew=room.players.find(p=>p.role==='crew'),ii=indexOf(f,imp),ci=indexOf(f,crew);
  assert.ok(room.players.every(p=>p.floor===0&&p.tasks.length===10&&p.tasks.every(t=>w.taskStation(t).floor===0)));assert.deepEqual(room.teachers,[]);
  f.time.now+=46000;f.keep();
  const current=(await f.send(ci,'pulse')).body.state;assert.equal(current.config.speed,1.5);assert.equal(current.config.floors,'0');
  const source=w.VENTS[0];setPosition(f,imp,source.x,source.y,0);assert.equal((await f.send(ii,'enterVent',{id:source.id})).status,200);
  f.time.now+=600;f.keep();assert.equal((await f.send(ii,'travelVent',{id:source.links[0]})).status,200);
  f.time.now+=500;f.keep();assert.equal((await f.send(ii,'exitVent')).status,200);
  const e=w.FLOORS[0].emergency;setPosition(f,crew,e.x,e.y,0);
  const called=await f.send(ci,'emergency');assert.equal(called.status,200,`${map}: ${called.body.error}`);assert.equal(called.body.state.phase,'meeting');
 }
});

test('la emergencia cooperativa necesita dos terminales y caduca exactamente a los 90 segundos en los tres mapas',async()=>{
 for(const map of ['club','gym','house']){
  const f=await roomFixture(4);await f.send(0,'configure',{map,tasks:2});await f.send(0,'start');f.time.now+=46000;f.keep();
  const imp=f.raw().players.find(p=>p.role==='impostor'),ii=indexOf(f,imp);f.raw().sabotageReady=0;
  assert.equal((await f.send(ii,'sabotage',{kind:'emergency'})).status,200);assert.equal(activeRepairs(f.raw()).length,2,map);
  for(const [j,panel] of activeRepairs(f.raw()).entries()){const q=f.raw().players.filter(p=>p.role==='crew')[j],qi=indexOf(f,q);setPosition(f,q,panel.x,panel.y,panel.floor);const repair=(await f.send(qi,'beginRepair',{id:panel.id})).body.repair;f.time.now+=3000;f.keep();assert.equal((await f.send(qi,'finishRepair',{id:panel.id,solution:answer(repair)})).status,200);}assert.equal(f.raw().sabotage,null,map);
  f.time.now=f.raw().sabotageReady;f.keep();const next=await f.send(ii,'sabotage',{kind:'emergency'});assert.equal(next.status,200,next.body.error);const started=f.time.now;
  f.time.now=started+89999;f.keep();assert.equal((await f.send(ii,'pulse')).body.state.phase,'game');
  f.time.now=started+90000;f.keep();const result=(await f.send(ii,'pulse')).body.state;assert.equal(result.phase,'ended');assert.equal(result.result.winner,'impostor');
 }
});

test('multiplicador de velocidad: servidor, cliente y movimiento fantasma mantienen la proporción',()=>{
 const map=FLOORS[0],x=29*TILE,y=8*TILE;
 for(const rate of [1,1.25,1.5,2]){const p={x,y},ghost={x,y};move(map,p,1,0,.2,false,rate);move(map,ghost,1,0,.2,true,rate);assert.ok(Math.abs((p.x-x)-205*.2*rate)<.01);assert.ok(Math.abs((ghost.x-x)-205*.4*rate)<.01);}
});

test('la velocidad del líder se aplica a los tramos de movimiento autorizados por el servidor',async()=>{
 for(const rate of [1,1.25,1.5,2]){const f=await roomFixture(4);assert.equal((await f.send(0,'configure',{speed:rate,tasks:2})).status,200);await f.send(0,'start');f.time.now+=14000;f.keep();const p=f.raw().players[0];setPosition(f,p,29*TILE,8*TILE,0);p.motionAnchor=f.time.now-200;p.motionSpent=0;p.motionAt=f.time.now-200;const old=p.x;const packet={seq:1,segments:[{x:1,y:0,ms:100}],x:0,y:0};const r=await f.send(0,'pulse',{_motion:packet});assert.equal(r.status,200,r.body.error);const moved=f.raw().players[0].x-old;assert.ok(Math.abs(moved-205*.1*rate)<.05,`velocidad ${rate}: ${moved}`);}
});

test('cámara: el personaje se adelanta 20 píxeles en el sentido correcto; no hay efecto vertical ni acumulación',async()=>{
 const {updateCamera}=await import('../public/render.js');for(const scale of [1.07,1.42])for(const x of [-1,1]){const cam={},local={x:500,y:700};for(let i=0;i<120;i++)updateCamera(cam,local,{x,y:0},1/60,scale);assert.ok(Math.abs((local.x-cam.x)*scale-x*20)<.01);assert.equal(cam.y,local.y);const stopped={...cam};for(let i=0;i<60;i++)updateCamera(cam,local,{x:0,y:0},1/60,scale);assert.deepEqual(cam,stopped);updateCamera(cam,local,{x:0,y:-1},1/60,scale);assert.equal(cam.y,local.y);assert.equal(cam.lookY,0);}
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
 const NEGRO=COLOR_NAMES.indexOf('Negro');assert.ok(NEGRO>=0);assert.equal(COLORS[NEGRO],'#3b404b');
 const f=await roomFixture();const look={name:'Estilo negro',color:NEGRO,outfitColor:NEGRO,trimColor:2,skin:1,hat:3,pants:3,glasses:4,bag:3,accessory:3,hairColor:5,skinTone:4,shoes:2,shoeColor:10,badge:3};
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
 // Recompensas del pase: mascotas, efectos y animaciones con dibujo propio.
 for(const [key,items,time] of [['pet',PETS,1000],['effect',EFFECTS,1000],['emote',EMOTES,4930]]){const canvas=new Set();for(let value=0;value<items.length;value++){const calls=[];const ctx=new Proxy({},{get(o,k){return k in o?o[k]:(...args)=>calls.push([k,...args]);},set(o,k,v){o[k]=v;calls.push([k,v]);return true;}});assert.doesNotThrow(()=>drawAvatar({width:160,height:175,getContext:()=>ctx},{...base,[key]:value},time));canvas.add(JSON.stringify(calls));}assert.equal(canvas.size,items.length,`${key}: dibujos distinguibles`);}
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
 f.time.now+=8500;f.keep();await f.send(dead,'pulse',{x:0,y:-1});f.time.now+=300;f.keep();await f.send(dead,'pulse',{x:0,y:-1});assert.equal(f.raw().meeting.stage,'voting');assert.deepEqual(f.raw().players[dead].meetingPos,fixed);
});


test('llegada al colegio: giro continuo de carretera a colegio y escena vectorial en cada fase',()=>{
 const first=arrivalPose(0),turn=arrivalPose(2.4),endTurn=arrivalPose(3.6),park=arrivalPose(6);
 assert.equal(first.x,turn.x);assert.ok(first.y>turn.y);assert.equal(endTurn.angle,Math.PI/2);assert.equal(park.y,endTurn.y);assert.ok(park.x>endTurn.x);
 for(const t of [2.4,3.6]){const before=arrivalPose(t-.0001),after=arrivalPose(t+.0001);assert.ok(Math.hypot(after.x-before.x,after.y-before.y)<.1);}
 for(const t of [0,1,2.9,4,5.8]){const calls=[];const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(...a)=>calls.push([k,...a]),set:(o,k,v)=>{o[k]=v;return true;}});assert.doesNotThrow(()=>drawArrival({width:390,height:844,getContext:()=>ctx},t));assert.ok(calls.length>150);}
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
test('expulsión: el profesor patea con su propia pierna y el portero empuja con su brazo',async()=>{
 const {terraceMarkup,animateTerrace,KICK_TIME}=await import('../public/expulsion.js');
 for(const [theme,kind,part] of [['school','teacher','.staff-leg-right'],['club','bouncer','.staff-arm-right']]){
  const html=terraceMarkup({name:'Fer',color:0},theme);assert.ok(!html.includes('terrace-foot')&&!html.includes('class="club-push"'),'no hay extremidades sueltas');
  const set={};const node=key=>({setAttribute:(n,v)=>set[key+n]=v,getBoundingClientRect:()=>({width:800,height:450}),querySelector:k=>node(k)});
  const root={querySelector:k=>k==='.club-door-left'&&theme!=='club'?null:node(k)};animateTerrace(root,theme==='school'?KICK_TIME:1450);
  const angle=Number(/rotate\((-?[\d.]+)/.exec(set[part+'transform'])?.[1]);assert.ok(angle<-60,`${kind}: ${set[part+'transform']}`);
 }
});

// BETA · Rol Latasa (impostor de la casa): el servidor decide el fallo (≈20 %),
// la víctima sigue viva, atacante y víctima reciben la escena de esquiva y el
// arma espera al menos 10 s. El resto de validaciones (alcance, muros) siguen.
test('Latasa: el servidor decide un 20 % de fallos, la víctima esquiva y el arma espera 10 s',async()=>{
 const f=await roomFixture(4);assert.equal((await f.send(0,'configure',{map:'house',killCooldown:20})).status,200);await start(f);
 const imp=f.raw().players.find(p=>p.role==='impostor'),crew=f.raw().players.filter(p=>p.role==='crew'),ii=indexOf(f,imp),victim=crew[0],vi=indexOf(f,victim),m=WORLDS.house.FLOORS[0];
 f.raw().players[ii].specialRole='latasa';setPosition(f,imp,m.spawn.x,m.spawn.y);setPosition(f,victim,m.spawn.x+30,m.spawn.y);
 // Desde lejos sigue sin poder atacar (la validación de alcance va antes del sorteo).
 setPosition(f,victim,m.spawn.x+600,m.spawn.y);assert.equal((await f.send(ii,'kill',{target:victim.id})).status,400);
 let misses=0,kills=0;const N=300;
 for(let n=0;n<N;n++){const v=f.raw().players[vi];Object.assign(v,{alive:true});f.raw().bodies=[];f.raw().players[ii].killReady=0;f.raw().players[ii].transition=null;setPosition(f,victim,m.spawn.x+30,m.spawn.y);setPosition(f,imp,m.spawn.x,m.spawn.y);
  const r=await f.send(ii,'kill',{target:victim.id,clientMiss:true});assert.equal(r.status,200,r.body.error);
  if(r.body.missed){misses++;assert.equal(f.raw().players[vi].alive,true,'la víctima sigue viva');assert.ok(f.raw().players[ii].killReady-f.time.now>=10000,'recarga mínima de 10 s');
   if(misses===1){const mine=(await f.send(ii,'pulse')).body.state,theirs=(await f.send(vi,'pulse')).body.state;assert.equal(mine.actionFx?.kind,'miss');assert.equal(theirs.actionFx?.kind,'miss');assert.equal(theirs.me.alive,true);
    assert.equal((await f.send(ii,'kill',{target:victim.id})).status,400,'no puede repetir el ataque en el acto');}}
  else{kills++;assert.equal(f.raw().players[vi].alive,false);}
  f.time.now+=50;f.keep();}
 assert.equal(misses+kills,N);assert.ok(misses>=30&&misses<=95,`fallos fuera de lo esperable para un 20 %: ${misses}/${N}`);
 // Un impostor sin el rol Latasa nunca falla.
 f.raw().players[ii].specialRole=null;for(let n=0;n<40;n++){Object.assign(f.raw().players[vi],{alive:true});f.raw().players[ii].killReady=0;setPosition(f,victim,m.spawn.x+30,m.spawn.y);setPosition(f,imp,m.spawn.x,m.spawn.y);const r=await f.send(ii,'kill',{target:victim.id});assert.ok(!r.body.missed);}
});

// BETA · Terminal de localización: solo cuenta personas por sala (nunca
// pasillos ni identidades), un cuerpo cuenta 10 s y el servidor exige estar
// junto al terminal; los sabotajes de comunicación cortan la señal.
test('localizador: personas por sala sin identidades, cuerpos 10 s, pasillos fuera y validación del servidor',async()=>{
 for(const map of ['club','gym','house']){
  const f=await roomFixture(5);assert.equal((await f.send(0,'configure',{map})).status,200);await start(f);const w=WORLDS[map],m=w.FLOORS[0],c=w.LOCATOR_CONSOLE;
  const crew=f.raw().players.filter(p=>p.role==='crew'),user=crew[0],ui=indexOf(f,user);
  assert.equal((await f.send(ui,'locator')).status,400,'hay que estar junto al terminal');
  setPosition(f,user,c.x,c.y);assert.equal((await f.send(ui,'locator')).status,200);
  const inRoom=(r,q)=>q.x>=r.x*TILE&&q.x<(r.x+r.w)*TILE&&q.y>=r.y*TILE&&q.y<(r.y+r.h)*TILE,roomA=m.rooms.find(r=>r.id!==c.room&&r.w>=4&&r.h>=4&&!inRoom(r,m.spawn)),others=f.raw().players.filter(p=>p.id!==user.id);
  const centre=r=>({x:(r.x+r.w/2)*TILE,y:(r.y+r.h/2)*TILE});
  const spots=[];for(let dx=-1.5;dx<=1.5;dx+=1)for(let dy=-1;dy<=1;dy+=1){const q={x:centre(roomA).x+dx*TILE,y:centre(roomA).y+dy*TILE};if(canStand(m,q.x,q.y))spots.push(q);}
  assert.ok(spots.length>=3,map);setPosition(f,others[0],spots[0].x,spots[0].y);setPosition(f,others[1],spots[1].x,spots[1].y);
  const cor=m.corridors[0];setPosition(f,others[2],(cor.x+cor.w/2)*TILE,(cor.y+cor.h/2)*TILE);
  let s=(await f.send(ui,'pulse')).body.state;assert.ok(s.locator?.signal,map);assert.equal(s.locator.rooms[roomA.id],2,`${map}: dos en ${roomA.name}`);
  const total=Object.values(s.locator.rooms).reduce((a,b)=>a+b,0);assert.equal(total,4,`${map}: el del pasillo no cuenta`);
  assert.ok(!JSON.stringify(s.locator).includes(others[0].name)&&!JSON.stringify(s.locator).includes(others[0].id),'sin identidades');
  // Un cuerpo sigue contando 10 s.
  const victim=f.raw().players.find(p=>p.id===others[0].id);if(victim.role==='crew'){victim.alive=false;f.raw().bodies.push({id:'b1',victim:victim.id,floor:0,x:victim.x,y:victim.y,at:f.time.now});}
  s=(await f.send(ui,'pulse')).body.state;assert.equal(s.locator.rooms[roomA.id],2);
  f.time.now+=10001;f.keep();s=(await f.send(ui,'pulse')).body.state;assert.equal(s.locator.rooms[roomA.id]||0,victim.role==='crew'?1:2);
  // Corte de comunicaciones: sin señal ni datos.
  f.raw().sabotage={id:'s',kind:'computers',fixed:[],confirmations:{},deadline:f.time.now+90000};s=(await f.send(ui,'pulse')).body.state;assert.equal(s.locator.signal,false);assert.deepEqual(s.locator.rooms,{});f.raw().sabotage=null;
  // Alejarse cierra el terminal en el servidor.
  setPosition(f,user,m.spawn.x,m.spawn.y);s=(await f.send(ui,'pulse')).body.state;assert.equal(s.locator,null);
 }
});

// BETA 16.1 · Libreta: una sola consulta de rol por partida, controlada por el servidor.
test('libreta: consulta de rol única; impostor y tripulante sin rol aparecen como «No tiene rol»',async()=>{
 const f=await roomFixture(6);await start(f);const r=f.raw(),crew=r.players.filter(p=>p.role==='crew'),imp=r.players.find(p=>p.role==='impostor');
 const nerd=crew[0],plain=crew[1],special=crew[2];r.players.find(p=>p.id===nerd.id).specialRole='nerd';r.players.find(p=>p.id===plain.id).specialRole=null;r.players.find(p=>p.id===special.id).specialRole='engineer';
 const ni=indexOf(f,nerd);assert.equal((await f.send(indexOf(f,plain),'inspectRole',{target:imp.id})).status,403,'solo el rol de la libreta');
 const first=await f.send(ni,'inspectRole',{target:imp.id});assert.equal(first.status,200);assert.equal(first.body.state.me.inspect.result,'No tiene rol','no delata al impostor');
 assert.equal((await f.send(ni,'inspectRole',{target:special.id})).status,400,'una sola vez por partida');
 const g=await roomFixture(6);await start(g);const gr=g.raw(),gc=gr.players.filter(p=>p.role==='crew');gr.players.find(p=>p.id===gc[0].id).specialRole='nerd';gr.players.find(p=>p.id===gc[1].id).specialRole='engineer';gr.players.find(p=>p.id===gc[2].id).specialRole=null;
 assert.equal((await g.send(indexOf(g,gc[0]),'inspectRole',{target:gc[1].id})).body.state.me.inspect.result,'INGENIERO');
 const h=await roomFixture(6);await start(h);const hr=h.raw(),hc=hr.players.filter(p=>p.role==='crew');hr.players.find(p=>p.id===hc[0].id).specialRole='nerd';hr.players.find(p=>p.id===hc[1].id).specialRole=null;
 assert.equal((await h.send(indexOf(h,hc[0]),'inspectRole',{target:hc[1].id})).body.state.me.inspect.result,'No tiene rol');
 assert.equal((await h.send(indexOf(h,hc[1]),'pulse')).body.state.me.inspect,null,'solo lo ve quien consulta');
});

// BETA 16.1 · Latasa´s House: nadie es «Familia» genérico.
test('roles familiares: en la casa todos los jugadores sin rol especial reciben un parentesco único',async()=>{
 for(let n=0;n<4;n++){const f=await roomFixture(8);assert.equal((await f.send(0,'configure',{map:'house'})).status,200);await start(f);const r=f.raw();
  for(const p of r.players)assert.ok(p.specialRole||p.familyName,`${p.name} sin identidad familiar`);
  const names=r.players.map(p=>p.familyName).filter(Boolean);assert.equal(new Set(names).size,names.length);
  const s=(await f.send(0,'pulse')).body.state;assert.ok(s.me.specialRole||s.me.familyName);}
 const g=await roomFixture(4);await start(g);assert.ok(g.raw().players.every(p=>!p.familyName),'solo en la casa');
});

// BETA 16.1 · Jaula: inmovilidad total también en el servidor.
test('jaula: quien está enjaulado no se mueve ni con tramos de movimiento ni con entrada continua',async()=>{
 const f=await roomFixture(4);await start(f);const p=f.raw().players.find(q=>q.role==='crew'),i=indexOf(f,p),q=f.raw().players[i];q.items??={};q.items.cage={x:q.x,y:q.y,until:f.time.now+8000,by:'x'};const x=q.x,y=q.y;
 q.motionAnchor=f.time.now-300;q.motionAt=f.time.now-300;q.motionSpent=0;await f.send(i,'pulse',{_motion:{seq:1,segments:[{x:1,y:0,ms:200}],x:1,y:0}});f.time.now+=300;f.keep();await f.send(i,'pulse',{x:1,y:0});f.time.now+=300;f.keep();await f.send(i,'pulse',{x:1,y:0});
 assert.equal(f.raw().players[i].x,x);assert.equal(f.raw().players[i].y,y);
 f.raw().players[i].items.cage.until=f.time.now-1;f.time.now+=50;f.keep();await f.send(i,'pulse',{x:1,y:0});f.time.now+=300;f.keep();await f.send(i,'pulse',{x:1,y:0});assert.ok(f.raw().players[i].x!==x||f.raw().players[i].y!==y,'al salir recupera el movimiento');
});

test('red: estados y entradas cada 30 ms como máximo',async()=>{const {STATE_MS,INPUT_MS}=await import('../public/netcode.js');assert.ok(STATE_MS<=30&&INPUT_MS<=30);});

// BETA 16.1 · Dardos: el valor se fija con el instante de la pulsación aunque llegue con retraso.
test('dardos: el instante pulsado vale con hasta 700 ms de latencia y la horizontal arranca en ese instante',async()=>{
 const {tableCommand,tableTick,dartOsc,DARTS}=await import('../game/tables.js');const now0=Date.now();
 const room={phase:'lobby',players:[{id:'a',name:'A',lastSeen:now0},{id:'b',name:'B',lastSeen:now0}],tables:null};
 tableCommand(room,room.players[0],'tableJoin',{game:'darts'},now0,()=>true);tableCommand(room,room.players[1],'tableJoin',{game:'darts'},now0,()=>true);
 const s=room.tables.list[0],st=s.state,shooter=room.players[st.turn],press=st.aimStart+333,arrive=press+600;
 const start=st.aimStart;tableCommand(room,shooter,'tableInput',{t:press},arrive,()=>true);assert.equal(st.stage,'x');assert.equal(st.ay,Math.round(dartOsc(press,start,DARTS.py)*1000)/1000,'altura del instante pulsado, no de la llegada');assert.equal(st.aimStart,press,'la horizontal empieza en la pulsación');
 const xPress=press+410;tableCommand(room,shooter,'tableInput',{t:xPress},xPress+650,()=>true);assert.equal(st.stage,'fly');assert.equal(st.last.x,Math.round(dartOsc(xPress,press,DARTS.px)*1000)/1000);
});
