import {activeRepairs} from '../public/worlds.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {api} from '../game/api.js';
import {MemoryStore} from '../server/memory-store.js';
import {worldFor,TILE,canStand,lineOfSight,visionLineOfSight} from '../public/content.js';
import {drawWorld,drawMiniMap,drawCamera,characterVisible} from '../public/render.js';
const club=worldFor('club');
async function fixture(){const store=new MemoryStore(),clock={now:Date.now()},sessions=[];const created=await api(store,'/api/create',{profile:{name:'Host Club',color:0}},clock.now);sessions.push(created.body.session);for(let i=1;i<4;i++){const r=await api(store,'/api/join',{code:sessions[0].code,profile:{name:`Club ${i}`,color:i}},clock.now);sessions.push(r.body.session);}const raw=()=>store.rooms.get(sessions[0].code);const keep=ms=>{clock.now+=ms;raw().players.forEach(p=>p.lastSeen=clock.now);};const send=(i,type,data={})=>api(store,'/api/room',{...sessions[i],type,data},clock.now);return {raw,send,keep,clock};}
async function start(f){assert.equal((await f.send(0,'configure',{map:'club',tasks:2,discussion:5,voting:15})).status,200);assert.equal((await f.send(0,'start')).status,200);f.keep(46000);await f.send(0,'pulse');}
const index=(f,p)=>f.raw().players.findIndex(q=>q.id===p.id);
function position(f,p,at){p=f.raw().players.find(q=>q.id===p.id);Object.assign(p,{x:at.x,y:at.y,floor:at.floor??0},{input:{x:0,y:0},moveAt:f.clock.now,transition:null,vent:null});}

test('Discoteca: todos los espacios, tareas, reparaciones y alcantarillas tienen acceso real',()=>{
 const map=club.FLOORS[0],grid=TILE/2,sx=Math.floor(map.spawn.x/grid),sy=Math.floor(map.spawn.y/grid),queue=[[sx,sy]],seen=new Set([`${sx},${sy}`]);
 for(let k=0;k<queue.length;k++){const [x,y]=queue[k];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,key=`${xx},${yy}`;if(!seen.has(key)&&canStand(map,(xx+.5)*grid,(yy+.5)*grid)&&canStand(map,(x+.5+dx/2)*grid,(y+.5+dy/2)*grid)){seen.add(key);queue.push([xx,yy]);}}}
 // La decoración ocupa suelo: se comprueba la proporción del suelo libre
 // conectado y cada destino, en lugar de una cifra de casillas vacías antigua.
 let walkable=0;for(let x=0;x<map.width*2;x++)for(let y=0;y<map.height*2;y++)if(canStand(map,(x+.5)*grid,(y+.5)*grid))walkable++;
 assert.ok(seen.size/walkable>.995);for(const r of map.rooms)assert.ok(queue.some(([x,y])=>(x+.5)*grid>=r.x*TILE&&(x+.5)*grid<(r.x+r.w)*TILE&&(y+.5)*grid>=r.y*TILE&&(y+.5)*grid<(r.y+r.h)*TILE),r.name);
 for(const p of [...club.STATIONS,...club.REPAIRS,...club.VENTS,club.CAMERA_CONSOLE]){assert.ok(canStand(map,p.x,p.y),p.id);assert.ok(queue.some(([x,y])=>Math.hypot((x+.5)*grid-p.x,(y+.5)*grid-p.y)<85&&lineOfSight(map,{x:(x+.5)*grid,y:(y+.5)*grid},p)),p.id);}
 assert.equal(club.VENT_GROUPS.length,4);for(const group of club.VENT_GROUPS)for(const id of group)assert.deepEqual([...club.VENTS.find(v=>v.id===id).links].sort(),group.filter(q=>q!==id).sort());
});

test('Discoteca y colegio coexisten: selección validada, roles privados, diez tareas y ausencia de profesores',async()=>{
 const f=await fixture(),school=await fixture();assert.equal((await f.send(1,'configure',{map:'club'})).status,403);assert.equal((await f.send(0,'configure',{map:'unknown'})).status,400);
 assert.equal((await f.send(0,'configure',{map:'club'})).status,200);assert.equal((await f.send(0,'configure',{floors:'1'})).status,400);
 await f.send(0,'configure',{tasks:10});const started=await f.send(0,'start');assert.equal(started.status,200);assert.equal(started.body.state.config.floors,'0');assert.deepEqual(started.body.state.teachers,[]);
 f.raw().players.forEach(p=>{assert.equal(p.tasks.length,10);assert.ok(p.tasks.every(t=>t.id.startsWith('club-')));assert.ok(canStand(club.FLOORS[0],p.x,p.y));});
 f.keep(7000);const all=await Promise.all([0,1,2,3].map(i=>f.send(i,'pulse')));assert.equal(all.filter(r=>r.body.state.me.role==='impostor').length,1);all.forEach(r=>assert.ok(r.body.state.roster.every(p=>!Object.hasOwn(p,'specialRole'))));
 await school.send(0,'start');assert.equal(school.raw().config.map,'school');assert.equal(school.raw().teachers.length,2);assert.ok(school.raw().players.every(p=>p.tasks.every(t=>!t.id.startsWith('club-'))));
});

test('Cámaras: alcance autorizado, línea de visión, inmovilidad y pérdida de señal por sabotaje',async()=>{
 const f=await fixture();await start(f);const p=f.raw().players.find(p=>p.role==='crew'),i=index(f,p),target=f.raw().players.find(q=>q.id!==p.id),camera=club.CAMERAS[0];
 assert.equal((await f.send(i,'camera',{id:camera.id})).status,400);position(f,p,club.CAMERA_CONSOLE);position(f,target,{...camera,x:camera.x+30});
 let r=await f.send(i,'camera',{id:camera.id});assert.equal(r.status,200);assert.ok(r.body.state.cameraFeed.players.some(q=>q.id===target.id));assert.ok(r.body.state.cameraFeed.players.every(q=>!Object.hasOwn(q,'role')));
 const x=p.x;f.keep(120);await f.send(i,'pulse',{x:1,y:0});f.keep(120);await f.send(i,'pulse');assert.equal(p.x,x);
 f.raw().sabotage={id:'test',kind:'electrical',fixed:[],confirmations:{},deadline:f.clock.now+90000};r=await f.send(i,'pulse');assert.equal(r.body.state.cameraFeed.signal,false);assert.deepEqual(r.body.state.cameraFeed.players,[]);
 await f.send(i,'exitCamera');assert.equal((await f.send(i,'pulse')).body.state.cameraFeed,null);
});

test('Ciclo completo: tarea adaptada, alcantarilla, botón sobre mesa, votos, victoria y regreso al backstage',async()=>{
 const f=await fixture();await start(f);const crew=f.raw().players.find(p=>p.role==='crew'),imp=f.raw().players.find(p=>p.role==='impostor'),ci=index(f,crew),ii=index(f,imp),task=club.STATIONS.find(t=>t.kind==='chalk');
 crew.tasks[0]={id:task.id,done:false};position(f,crew,task);const begun=await f.send(ci,'beginTask',{id:task.id});assert.equal(begun.status,200);assert.equal(begun.body.task.theme,'club');f.keep(6000);assert.equal((await f.send(ci,'finishTask',{id:begun.body.task.id,solution:begun.body.task.challenge.dirt})).status,200);
 position(f,imp,club.VENTS[0]);assert.equal((await f.send(ii,'enterVent',{id:club.VENTS[0].id})).status,200);f.keep(800);assert.equal((await f.send(ii,'travelVent',{id:club.VENTS[3].id})).status,400);assert.equal((await f.send(ii,'travelVent',{id:club.VENTS[0].links[0]})).status,200);f.keep(800);assert.equal((await f.send(ii,'exitVent')).status,200);
 const button=club.FLOORS[0].emergency;position(f,crew,{floor:0,x:button.x,y:button.y+90});assert.ok(canStand(club.FLOORS[0],crew.x,crew.y));assert.equal((await f.send(ci,'emergency')).body.state.phase,'meeting');
 for(const q of f.raw().players)assert.ok(canStand(club.MEETING,q.meetingPos.x,q.meetingPos.y),q.name);
 f.keep(8500);await f.send(0,'pulse');for(let i=0;i<4;i++)assert.equal((await f.send(i,'vote',{target:imp.id})).status,200);assert.equal((await f.send(ci,'vote',{target:crew.id})).status,400);f.keep(13000);const end=await f.send(0,'pulse');assert.equal(end.body.state.result.winner,'crew');const back=await f.send(0,'return');assert.equal(back.body.state.phase,'lobby');assert.equal(back.body.state.config.map,'club');assert.ok(canStand(club.LOBBY,back.body.state.me.x,back.body.state.me.y));assert.equal((await f.send(0,'configure',{map:'school'})).status,200);
});

test('Sabotajes del club conservan dos paneles, recarga de 112,5 s y derrota a los 90 s',async()=>{
 const f=await fixture();await start(f);const p=f.raw().players.find(p=>p.role==='impostor');const r=await f.send(index(f,p),'sabotage',{kind:'emergency'});assert.equal(r.status,200);assert.equal(r.body.state.sabotage.deadline-f.clock.now,90000);assert.equal(r.body.state.sabotageReady-f.clock.now,112500);assert.equal(activeRepairs(f.raw()).length,2);f.keep(89999);assert.equal((await f.send(0,'pulse')).body.state.phase,'game');f.keep(2);assert.equal((await f.send(0,'pulse')).body.state.result.winner,'impostor');
});

test('Render: club, colegio, reunión, minimapa y cámara se dibujan sin mezclar geometría ni ocultación',async()=>{
 const f=await fixture();await start(f);const s=(await f.send(0,'pulse')).body.state,labels=[],grad=()=>({addColorStop(){}}),ctx=new Proxy({measureText:t=>({width:t.length*7}),createRadialGradient:grad,createLinearGradient:grad,fillText:t=>labels.push(t)},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)}),canvas={width:850,height:600,getContext:()=>ctx,getBoundingClientRect:()=>({width:850,height:600})},oldDocument=globalThis.document,oldWindow=globalThis.window;
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};globalThis.window={devicePixelRatio:1};try{for(const phase of ['lobby','game'])drawWorld(canvas,{...s,phase},{...s.me,input:{x:0,y:0}},new Map(),{x:s.me.x,y:s.me.y},.016,2000);drawMiniMap(canvas,s,s.me,0);drawCamera(canvas,{...s,cameraFeed:{...club.CAMERAS[0],radius:360,signal:true,players:[],bodies:[]}},new Map(),2000);assert.ok(labels.some(v=>v==='Seguridad'));assert.ok(!labels.includes('SOLO PERSONAL AUTORIZADO'));assert.ok(!labels.includes('CONTROL'));assert.ok(!labels.includes('SANAGUS'));assert.ok(labels.includes('● EN DIRECTO'));}finally{globalThis.document=oldDocument;globalThis.window=oldWindow;}
 const map=club.FLOORS[0],viewer={x:33.5*TILE,y:12*TILE},target={x:viewer.x+400,y:viewer.y};assert.ok(characterVisible(map,viewer,target,420));assert.ok(!visionLineOfSight(map,{x:20.5*TILE,y:16*TILE},{x:18*TILE,y:16*TILE}));
});
