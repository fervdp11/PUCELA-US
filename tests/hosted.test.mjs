import {activeRepairs} from '../public/worlds.js';
// Verifica el Worker COMPILADO sin navegador ni servidor de preview público.
// Requiere las dependencias de alojamiento y una compilación previa.
import {createRequire} from 'node:module';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {MAP,FLOORS,STATIONS,VENTS,REPAIRS,worldFor} from '../public/content.js';
const require=createRequire(import.meta.url),workerRequire=createRequire(require.resolve('wrangler/package.json'));
const {Miniflare}=workerRequire('miniflare');
const files=(await readdir('dist/server',{recursive:true})).filter(f=>/\.m?js$/.test(f)&&f!=='index.js');
const modules=['index.js',...files].map(f=>({type:'ESModule',path:path.resolve('dist/server',f)}));
const mf=new Miniflare({modules,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'sanagus-test'},assets:{directory:'dist/client',binding:'ASSETS',routerConfig:{has_user_worker:true}},cf:false});
try{
  const db=await mf.getD1Database('DB');
  const sql=await readFile('drizzle/0000_fat_calypso.sql','utf8');
  for(const statement of sql.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(statement).run();
  const origin='https://sanagus.test';
  const get=async(path)=>mf.dispatchFetch(origin+path);
  const post=async(path,body)=>{const r=await mf.dispatchFetch(origin+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const text=await r.text();assert.ok(r.headers.get('content-type')?.includes('json'),`${path}: ${r.status} ${text.slice(0,400)}`);const parsed=JSON.parse(text);if(r.status>=400)console.log('QA HTTP',path,body.type||'entrada',r.status,parsed.error);return {status:r.status,body:parsed};};
  const page=await get('/');assert.equal(page.status,200);assert.ok((await page.text()).includes('Hazlo tuyo.'));
  for(const path of ['/client.js','/expulsion.js','/content.js','/render.js','/style.css','/favicon.svg','/school.js','/club.js','/worlds.js','/scenery.js','/club-decor.js','/club-lights.js','/meetings.js','/upgrade.css','/cinematics.js','/eliminations.js','/interactions.js','/club-tasks.js','/soundscape.js','/tasks.js','/characters.js','/camera.js','/remote-motion.js','/touch-controls.js','/manifest.webmanifest','/sw.js','/app-icon-192.png','/app-icon-512.png'])assert.equal((await get(path)).status,200,path);
  for(const asset of ['/mechanism.js','/visibility.js','/caravan.js','/journey.js','/finale.js','/meeting-chat.js','/vote-countdown.js','/gym.js','/gym-art.js','/themed-tasks.js','/themed-defs.js','/task-kit.js','/park-fill.js','/game-select.js','/quick-chat.js','/repair-layout.js','/mechanism.css','/park.js','/park-art.js','/disembark.js'])assert.equal((await get(asset)).status,200,asset);

  assert.equal((await get('/api/health')).status,200);
  assert.deepEqual((await (await get('/api/rooms')).json()).rooms,[]);
  const create=await post('/api/create',{profile:{name:'Worker Host',color:0}});assert.equal(create.status,200);const sessions=[create.body.session];
  assert.equal((await (await get('/api/rooms')).json()).rooms[0].code,sessions[0].code);
  const joined=await Promise.all([1,2,3].map(i=>post('/api/join',{code:sessions[0].code,profile:{name:`Worker ${i}`,color:i}})));
  joined.forEach(r=>{assert.equal(r.status,200);sessions.push(r.body.session);});
  const send=(i,type,data={})=>post('/api/room',{...sessions[i],type,data});
  assert.equal((await send(0,'pulse')).body.state.roster.length,4);
  assert.equal((await send(1,'start')).status,403);
  const newLook={name:'Worker Host',color:10,skin:5,hat:11,bag:3,glasses:4,pants:3,outfitColor:10,accessory:9,hairColor:5,skinTone:3,shoes:2,shoeColor:10,badge:3};const wardrobe=await send(0,'profile',newLook);assert.equal(wardrobe.status,200);const visibleLook=(await send(1,'pulse')).body.state.roster.find(p=>p.name==='Worker Host');for(const [key,value] of Object.entries(newLook))assert.equal(visibleLook[key],value,key);
  const originPosition=(await send(0,'pulse')).body.state.me;const motion=await send(0,'pulse',{_motion:{seq:1,segments:[{x:1,y:0,ms:100}],x:0,y:0}});assert.equal(motion.status,200);assert.ok(Math.abs(motion.body.state.me.x-originPosition.x-20.5)<.01);const observer=(await send(1,'pulse')).body.state.players.find(p=>p.id===originPosition.id);assert.equal(observer.x,motion.body.state.me.x);assert.equal((await send(2,'pulse')).body.state.players.find(p=>p.id===originPosition.id).motionTime,observer.motionTime);
  await send(0,'configure',{discussion:5,tasks:2});
  const started=await send(0,'start');assert.equal(started.body.state.phase,'game');
  assert.deepEqual((await (await get('/api/rooms')).json()).rooms,[]);
  const roles=await Promise.all(sessions.map((_,i)=>send(i,'pulse')));assert.equal(roles.filter(r=>r.body.state.me.role!==null).length,0);
  const editRoom=async fn=>{const row=await db.prepare('SELECT state FROM rooms WHERE code=?').bind(sessions[0].code).first();const r=JSON.parse(row.state);fn(r);await db.prepare('UPDATE rooms SET state=?,revision=revision+1 WHERE code=?').bind(JSON.stringify(r),r.code).run();return r;};
  let room=await editRoom(r=>{r.revealUntil=0;r.roleRevealAt=0;r.travelUntil=0;r.emergencyReady=0;});
  // Las uniones concurrentes pueden completar en un orden distinto al de Promise.all.
  sessions.sort((a,b)=>room.players.findIndex(p=>p.token===a.token)-room.players.findIndex(p=>p.token===b.token));
  const imp=room.players.find(p=>p.role==='impostor'),ii=room.players.findIndex(p=>p.id===imp.id),caller=room.players.findIndex(p=>p.role==='crew');
  const stair=FLOORS[0].stairs[0];await editRoom(r=>Object.assign(r.players[caller],{floor:0,x:stair.x,y:stair.y}));const up=await send(caller,'stairs',{id:stair.id});assert.equal(up.status,200);assert.equal(up.body.state.me.floor,1);
  const chalk=STATIONS.find(s=>s.id==='chalk');await editRoom(r=>Object.assign(r.players[caller],{floor:1,x:chalk.x,y:chalk.y,transition:null,tasks:[{id:chalk.id,done:false}]}));const task=(await send(caller,'beginTask',{id:chalk.id})).body.task;assert.ok(task);await editRoom(r=>r.players[caller].puzzle.start=Date.now()-5000);assert.equal((await send(caller,'finishTask',{id:task.id,solution:task.challenge.dirt})).status,200);
  const v=VENTS[0];await editRoom(r=>Object.assign(r.players[ii],{floor:v.floor,x:v.x,y:v.y,transition:null}));const entering=await send(ii,'enterVent',{id:v.id});assert.equal(entering.status,200,entering.body.error);await editRoom(r=>r.players[ii].transition=null);
  assert.equal((await send(ii,'travelVent',{id:'eso-c'})).body.state.me.floor,1);await editRoom(r=>r.players[ii].transition=null);assert.equal((await send(ii,'exitVent')).status,200);
  room=await editRoom(r=>{Object.assign(r.players[caller],{x:MAP.emergency.x,y:MAP.emergency.y,floor:0,transition:null});Object.assign(r.players[ii],{transition:null});});
  assert.equal((await send(caller,'emergency')).body.state.phase,'meeting');
  const meetingRow=await db.prepare('SELECT state FROM rooms WHERE code=?').bind(room.code).first();const mr=JSON.parse(meetingRow.state);mr.meeting.discussionEnd=Date.now()-1;
  await db.prepare('UPDATE rooms SET state=?,revision=revision+1 WHERE code=?').bind(JSON.stringify(mr),room.code).run();
  // Votos concurrentes, atravesando las rutas reales del Worker y D1.
  const votes=await Promise.all(sessions.map((_,i)=>send(i,'vote',{target:imp.id})));votes.forEach(r=>assert.equal(r.status,200));
  const result=await send(0,'pulse');assert.equal(result.body.state.meeting.stage,'result');const finalRow=await db.prepare('SELECT state FROM rooms WHERE code=?').bind(room.code).first();const final=JSON.parse(finalRow.state);final.meeting.resultUntil=Date.now()-1;await db.prepare('UPDATE rooms SET state=? WHERE code=?').bind(JSON.stringify(final),room.code).run();const ended=await send(0,'pulse');assert.equal(ended.body.state.result.winner,'crew');
  assert.equal((await send(0,'return')).body.state.phase,'lobby');assert.equal((await send(0,'start')).body.state.gameNumber,2);
  const club=worldFor('club'),c0=await post('/api/create',{profile:{name:'Club Host',color:0}}),clubSessions=[c0.body.session];
  for(let i=1;i<4;i++){const r=await post('/api/join',{code:clubSessions[0].code,profile:{name:`Club Worker ${i}`,color:i}});assert.equal(r.status,200);clubSessions.push(r.body.session);}
  const clubSend=(i,type,data={})=>post('/api/room',{...clubSessions[i],type,data});
  assert.equal((await clubSend(1,'configure',{map:'club'})).status,403);assert.equal((await clubSend(0,'configure',{map:'club',tasks:2,discussion:5})).body.state.config.map,'club');
  assert.equal((await clubSend(0,'start')).status,200);
  const editClub=async fn=>{const row=await db.prepare('SELECT state FROM rooms WHERE code=?').bind(clubSessions[0].code).first();const r=JSON.parse(row.state);fn(r);await db.prepare('UPDATE rooms SET state=?,revision=revision+1 WHERE code=?').bind(JSON.stringify(r),r.code).run();return r;};
  let cr=await editClub(r=>{r.revealUntil=0;r.roleRevealAt=0;r.travelUntil=0;r.emergencyReady=0;});assert.equal(cr.teachers.length,0);assert.ok(cr.players.every(p=>p.tasks.every(t=>t.id.startsWith('club-'))));
  const cc=cr.players.findIndex(p=>p.role==='crew'),ic=cr.players.find(p=>p.role==='impostor');await editClub(r=>Object.assign(r.players[cc],club.CAMERA_CONSOLE));
  const liveCameras=(await clubSend(cc,'camera',{id:'all'})).body.state;assert.equal(liveCameras.cameraFeeds.length,4);assert.equal(new Set(liveCameras.cameraFeeds.map(q=>q.id)).size,4);assert.equal((await clubSend(cc,'exitCamera')).status,200);
  const mixing=club.STATIONS.find(q=>q.kind==='dj');await editClub(r=>{Object.assign(r.players[cc],{x:mixing.x,y:mixing.y});r.players[cc].tasks=[{id:mixing.id,done:false},{id:'club-litter',done:false}];});
  const mt=(await clubSend(cc,'beginTask',{id:mixing.id})).body.task;assert.equal(mt.kind,'dj');await editClub(r=>{r.players[cc].puzzle.start=Date.now()-5000;r.players[cc].rateAt=0;});assert.equal((await clubSend(cc,'finishTask',{id:mt.id,solution:{levels:mt.challenge.levels,sync:mt.challenge.sync}})).status,200);
  const cii=cr.players.findIndex(p=>p.id===ic.id);await editClub(r=>r.sabotageReady=0);assert.equal((await clubSend(cii,'sabotage',{kind:'audio'})).status,200);assert.equal((await clubSend(cc,'pulse')).body.state.progress.blocked,true);
  for(const panel of activeRepairs({config:{map:'club',floors:'0'},sabotage:{kind:'audio'}})){await editClub(r=>Object.assign(r.players[cc],{x:panel.x,y:panel.y,rateAt:0}));const rp=(await clubSend(cc,'beginRepair',{id:panel.id})).body.repair;assert.equal(rp.kind,'speaker');await editClub(r=>{r.players[cc].repair.start=Date.now()-5000;r.players[cc].rateAt=0;});assert.equal((await clubSend(cc,'finishRepair',{id:panel.id,solution:{links:[0,1,2,3].map(v=>rp.challenge.order.indexOf(v)),gain:rp.challenge.gain}})).status,200);}
  assert.equal((await clubSend(cc,'pulse')).body.state.sabotage,null);
  await editClub(r=>Object.assign(r.players[cc],{...club.FLOORS[0].emergency,y:club.FLOORS[0].emergency.y+90}));assert.equal((await clubSend(cc,'emergency')).body.state.phase,'meeting');
  await editClub(r=>r.meeting.discussionEnd=Date.now()-1);const cv=await Promise.all(clubSessions.map((_,i)=>clubSend(i,'vote',{target:ic.id})));cv.forEach(r=>assert.equal(r.status,200));
  await editClub(r=>r.meeting.resultUntil=Date.now()-1);assert.equal((await clubSend(0,'pulse')).body.state.result.winner,'crew');assert.equal((await clubSend(0,'return')).body.state.config.map,'club');
  // Modern clients: intro acknowledgements survive D1 transactions. Then let
  // server bots catch up from a persisted clock without any browser AI.
  const b0=await post('/api/create',{profile:{name:'Bots Host',introProtocol:1}}),bs=b0.body.session;
  const botSend=(type,data={})=>post('/api/room',{...bs,type,data});
  await botSend('configure',{map:'club',tasks:10});for(let i=0;i<3;i++)assert.equal((await botSend('addBot')).status,200);
  let botState=(await botSend('start')).body.state;assert.equal(botState.intro.stage,'travel');assert.equal(botState.me.role,null);
  const editBots=async fn=>{const row=await db.prepare('SELECT state FROM rooms WHERE code=?').bind(bs.code).first();const r=JSON.parse(row.state);fn(r);await db.prepare('UPDATE rooms SET state=?,revision=revision+1 WHERE code=?').bind(JSON.stringify(r),r.code).run();return r;};
  await editBots(r=>{r.intro.travelEnd=Date.now()-1;r.travelUntil=r.intro.travelEnd;r.players[0].rateAt=0;});
  assert.equal((await botSend('introReady',{stage:'arrival'})).body.state.intro.stage,'neutral');
  await editBots(r=>{r.intro.neutralEnd=Date.now()-1;r.roleRevealAt=r.intro.neutralEnd;r.players[0].rateAt=0;});
  botState=(await botSend('introReady',{stage:'role'})).body.state;assert.equal(botState.intro.stage,'reading');assert.ok(botState.intro.readEnd>=botState.serverTime+7990);
  await editBots(r=>{r.intro.readEnd=Date.now()-1;r.revealUntil=r.intro.readEnd;r.players[0].rateAt=0;});assert.equal((await botSend('pulse')).body.state.intro.stage,'playing');
  let botRoom=await editBots(r=>{r.players.forEach((p,i)=>{p.role=i?'crew':'impostor';p.specialRole=null;p.lastSeen=Date.now();if(p.bot)p.tasks=[{id:club.STATIONS.find(s=>s.kind==='calibrate').id,done:false}];});r.simulatedAt=Date.now()-12000;r.botFrameAt=r.simulatedAt;r.revealUntil=r.simulatedAt;r.intro.playingAt=r.simulatedAt;r.emergencyReady=Date.now()+30000;});
  const oldPositions=botRoom.players.filter(p=>p.bot).map(p=>({id:p.id,x:p.x,y:p.y}));botState=(await botSend('pulse')).body.state;
  botRoom=JSON.parse((await db.prepare('SELECT state FROM rooms WHERE code=?').bind(bs.code).first()).state);
  assert.ok(oldPositions.some(p=>Math.hypot(p.x-botRoom.players.find(q=>q.id===p.id).x,p.y-botRoom.players.find(q=>q.id===p.id).y)>100));assert.ok(!JSON.stringify(botState).includes('suspicions'));assert.equal(botState.roster.filter(p=>p.bot).length,3);
  assert.equal((await botSend('removeBot')).status,400,'bots cannot be removed midgame');
  // Third map, private access and physical gym-specific repair, on the same
  // compiled Worker and real D1 adapter used above.
  const g0=await post('/api/create',{profile:{name:'Gym Host'},visibility:'private'}),gs=[g0.body.session],gym=worldFor('gym');
  assert.equal(g0.status,200);assert.ok(!(await (await get('/api/rooms')).json()).rooms.some(r=>r.code===gs[0].code));
  for(let i=1;i<4;i++){const r=await post('/api/join',{code:gs[0].code,profile:{name:'Gym Worker '+i,color:i}});assert.equal(r.status,200);gs.push(r.body.session);}
  const gymSend=(i,type,data={})=>post('/api/room',{...gs[i],type,data}),editGym=async fn=>{const row=await db.prepare('SELECT state FROM rooms WHERE code=?').bind(gs[0].code).first(),r=JSON.parse(row.state);fn(r);await db.prepare('UPDATE rooms SET state=?,revision=revision+1 WHERE code=?').bind(JSON.stringify(r),r.code).run();return r;};
  const gymConfig=await gymSend(0,'configure',{map:'gym',tasks:2,discussion:5});assert.equal(gymConfig.status,200,gymConfig.body.error);assert.equal(gymConfig.body.state.config.floors,'0');assert.equal((await gymSend(0,'start')).status,200);
  let gr=await editGym(r=>{r.revealUntil=0;r.roleRevealAt=0;r.travelUntil=0;r.emergencyReady=0;r.sabotageReady=0;});assert.equal(gr.teachers.length,0);const gi=gr.players.findIndex(p=>p.role==='impostor'),gc=gr.players.findIndex(p=>p.role==='crew');
  assert.ok(gr.players.every(p=>p.tasks.some(t=>t.id==='gym-membership'||t.id==='gym-power')));
  await editGym(r=>Object.assign(r.players[gc],gym.CAMERA_CONSOLE));assert.equal((await gymSend(gc,'camera',{id:'all'})).body.state.cameraFeeds.length,4);await gymSend(gc,'exitCamera');
  const st=gym.STATIONS.find(t=>t.kind==='treadmill');await editGym(r=>{Object.assign(r.players[gc],st);r.players[gc].tasks=[{id:st.id,done:false},{id:'gym-score',done:false}];});const gt=(await gymSend(gc,'beginTask',{id:st.id})).body.task;assert.equal(gt.kind,'treadmill');await editGym(r=>{r.players[gc].puzzle.start=Date.now()-7000;r.players[gc].rateAt=0;});assert.equal((await gymSend(gc,'finishTask',{id:gt.id,solution:{speed:gt.challenge.speed,incline:gt.challenge.incline,run:gt.challenge.duration}})).status,200);
  assert.equal((await gymSend(gi,'sabotage',{kind:'ventilation'})).status,200);const panel=activeRepairs({config:{map:'gym',floors:'0'},sabotage:{kind:'ventilation'}})[0];await editGym(r=>Object.assign(r.players[gc],panel,{rateAt:0}));const gp=(await gymSend(gc,'beginRepair',{id:panel.id})).body.repair;assert.equal(gp.kind,'ventilation');await editGym(r=>{r.players[gc].repair.start=Date.now()-6000;r.players[gc].rateAt=0;});assert.equal((await gymSend(gc,'finishRepair',{id:gp.id,solution:{levels:gp.challenge.levels,filters:gp.challenge.filters}})).body.state.sabotage,null);
  await editGym(r=>Object.assign(r.players[gc],{...gym.FLOORS[0].emergency,y:gym.FLOORS[0].emergency.y+90,rateAt:0}));assert.equal((await gymSend(gc,'emergency')).body.state.phase,'meeting');await editGym(r=>{r.meeting.discussionEnd=Date.now()-1;r.players.forEach(p=>p.rateAt=0);});const gv=await Promise.all(gs.map((_,i)=>gymSend(i,'vote',{target:gr.players[gi].id})));gv.forEach(r=>assert.equal(r.status,200));await editGym(r=>r.meeting.resultUntil=Date.now()-1);assert.equal((await gymSend(0,'pulse')).body.state.result.winner,'crew');
  // Fourth map: four independent authenticated clients through compiled HTTP/D1.
  const park=worldFor('park'),p0=await post('/api/create',{profile:{name:'Park Host'}}),ps=[p0.body.session];for(let i=1;i<4;i++){const j=await post('/api/join',{code:ps[0].code,profile:{name:'Park '+i,color:i}});assert.equal(j.status,200);ps.push(j.body.session);}
  const parkSend=(i,type,data={})=>post('/api/room',{...ps[i],type,data}),editPark=async fn=>{const row=await db.prepare('SELECT state FROM rooms WHERE code=?').bind(ps[0].code).first(),r=JSON.parse(row.state);fn(r);await db.prepare('UPDATE rooms SET state=?,revision=revision+1 WHERE code=?').bind(JSON.stringify(r),r.code).run();return r;};
  assert.equal((await parkSend(0,'configure',{map:'park',tasks:2,discussion:5})).status,200);assert.equal((await parkSend(0,'start')).status,200);let pr=await editPark(r=>{r.revealUntil=0;r.roleRevealAt=0;r.travelUntil=0;r.emergencyReady=0;r.sabotageReady=0;});assert.equal(pr.teachers.length,0);const pi=pr.players.findIndex(p=>p.role==='impostor'),pc=pr.players.findIndex(p=>p.role==='crew'),pw=pr.players.findIndex((p,i)=>i!==pi&&i!==pc);
  const pa=(await parkSend(pc,'pulse')).body.state,pb=(await parkSend(pi,'pulse')).body.state;assert.ok(pa.wildlife.length>=12);assert.deepEqual(pa.wildlife.map(a=>[a.id,a.species]),pb.wildlife.map(a=>[a.id,a.species]));assert.ok(pa.wildlife.every(a=>{const b=pb.wildlife.find(b=>b.id===a.id);return Math.hypot(a.x-b.x,a.y-b.y)<30;}));
  await editPark(r=>Object.assign(r.players[pc],park.CAMERA_CONSOLE,{rateAt:0}));assert.equal((await parkSend(pc,'camera',{id:'all'})).body.state.cameraFeeds.length,4);await parkSend(pc,'exitCamera');
  const pt=park.STATIONS.find(t=>t.id==='park-irrigation');await editPark(r=>{Object.assign(r.players[pc],{x:pt.x,y:pt.y,floor:pt.floor,rateAt:0});r.players[pc].tasks=[{id:pt.id,done:false},{id:'park-seeds',done:false}];});const taskPark=(await parkSend(pc,'beginTask',{id:pt.id})).body.task;assert.equal(taskPark.theme,'park');await editPark(r=>{r.players[pc].puzzle.start=Date.now()-6000;r.players[pc].rateAt=0;});assert.equal((await parkSend(pc,'finishTask',{id:taskPark.id,solution:taskPark.challenge.levels})).status,200);
  const hatch=park.VENTS[0];await editPark(r=>Object.assign(r.players[pi],{x:hatch.x,y:hatch.y,floor:hatch.floor,rateAt:0,transition:null}));assert.equal((await parkSend(pi,'enterVent',{id:hatch.id})).status,200);await editPark(r=>{r.players[pi].transition=null;r.players[pi].rateAt=0;});const other=park.VENTS.find(v=>v.network!==hatch.network);assert.equal((await parkSend(pi,'travelVent',{id:other.id})).status,400);await editPark(r=>r.players[pi].rateAt=0);assert.equal((await parkSend(pi,'travelVent',{id:hatch.links[0]})).status,200);await editPark(r=>{r.players[pi].transition=null;r.players[pi].rateAt=0;});assert.equal((await parkSend(pi,'exitVent')).status,200);
  await editPark(r=>{r.players[pi].transition=null;r.players[pi].rateAt=0;});assert.equal((await parkSend(pi,'sabotage',{kind:'computers'})).status,200);const pp=activeRepairs({config:{map:'park',floors:'0'},sabotage:{kind:'computers'}})[0];await editPark(r=>Object.assign(r.players[pc],{x:pp.x,y:pp.y,floor:pp.floor,rateAt:0}));const repairPark=(await parkSend(pc,'beginRepair',{id:pp.id})).body.repair;await editPark(r=>{r.players[pc].repair.start=Date.now()-6000;r.players[pc].rateAt=0;});assert.equal((await parkSend(pc,'finishRepair',{id:pp.id,solution:repairPark.challenge.levels})).body.state.sabotage,null);
  await editPark(r=>{for(const [i,p] of r.players.entries())Object.assign(p,{...park.FLOORS[0].spawn,x:park.FLOORS[0].spawn.x+i*20,y:park.FLOORS[0].spawn.y,rateAt:0,transition:null,input:{x:0,y:0},moveAt:Date.now(),killReady:0});});const pk=await parkSend(pi,'kill',{target:pr.players[pc].id});assert.equal(pk.status,200,pk.body.error);const pbody=(await parkSend(pw,'pulse')).body.state.bodies[0];assert.ok(pbody);assert.equal((await parkSend(pw,'report',{body:pbody.id})).status,200);await editPark(r=>{r.meeting.discussionEnd=Date.now()-1;r.players.forEach(p=>p.rateAt=0);});const pv=await Promise.all(ps.map((_,i)=>i===pc?Promise.resolve({status:200}):parkSend(i,'vote',{target:pr.players[pi].id})));pv.forEach(r=>assert.equal(r.status,200));await editPark(r=>r.meeting.resultUntil=Date.now()-1);assert.equal((await parkSend(0,'pulse')).body.state.result.winner,'crew');
  console.log('Sanagus 8 compilado: cuatro clientes D1, cuatro mapas, fauna compartida, tareas, cámaras, conductos aislados, sabotajes, asesinato/reporte, votos concurrentes, victoria/revancha y bots: OK.');
}finally{await mf.dispose();}
