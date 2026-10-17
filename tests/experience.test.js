import test from 'node:test';
import assert from 'node:assert/strict';
import {api} from '../game/api.js';
import {MemoryStore} from '../server/memory-store.js';
import {worldFor,canStand,TILE} from '../public/content.js';
import {lightingFrame,drawClubAmbient} from '../public/scenery.js';
import {meetingCards,voteIcons} from '../public/meetings.js';
import {killPose,drawKillScene,drawBody} from '../public/eliminations.js';
import {clubExitPose,terraceMarkup,animateTerrace} from '../public/expulsion.js';

async function fixture(n=5,options={}){const store=new MemoryStore();let clock=Date.now();const sessions=[];for(let i=0;i<n;i++){const r=await api(store,i?'/api/join':'/api/create',{profile:{name:`Noche ${i}`,color:i},code:sessions[0]?.code},clock);assert.equal(r.status,200);sessions.push(r.body.session);}const raw=()=>store.rooms.get(sessions[0].code),send=(i,type,data={})=>api(store,'/api/room',{...sessions[i],type,data},clock),keep=(ms=0)=>{clock+=ms;raw().players.forEach(p=>p.lastSeen=clock);};await send(0,'configure',{map:'club',discussion:5,voting:15,...options});await send(0,'start');keep(46000);raw().teachers=[];return {send,raw,keep,get now(){return clock;}};}
function enter(f,i=0){const p=f.raw().players[i];Object.assign(p,worldFor('club').FLOORS[0].emergency,{floor:0,y:worldFor('club').FLOORS[0].emergency.y+90,transition:null});return f.send(i,'emergency');}
const ctx=()=>new Proxy({measureText:t=>({width:t.length*7}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});

test('decoración 4.2: todas las zonas, variedad, huellas separadas y objetivos libres',()=>{
 const world=worldFor('club'),map=world.FLOORS[0],props=map.props.filter(p=>p.kind!=='wall');assert.ok(props.length>=75);assert.ok(new Set(props.map(p=>p.kind)).size>=24);assert.ok(map.art.length>=60);
 for(const r of map.rooms)assert.ok(props.filter(p=>p.x>=r.x&&p.x<r.x+r.w&&p.y>=r.y&&p.y<r.y+r.h).length>=3,r.id);
 for(const [i,a] of props.entries())for(const b of props.slice(i+1))assert.ok(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y),`${a.kind}/${b.kind}`);
 for(const q of [...world.STATIONS,...world.REPAIRS,...world.VENTS])assert.ok(canStand(map,q.x,q.y),q.id);
 for(const d of world.DOORS){const vertical=d.h>d.w,x=(d.x+d.w/2)*TILE,y=(d.y+d.h/2)*TILE;assert.ok(canStand(map,x+(vertical?25:0),y+(vertical?0:25)),d.id);}
});
test('luces: seis fases de color, pulso suave y modo reducido estable',()=>{
 assert.equal(new Set([0,1,2,3,4,5].map(k=>lightingFrame(k*5000).index)).size,6);assert.notDeepEqual(lightingFrame(1400),lightingFrame(1600));assert.deepEqual(lightingFrame(0,true),lightingFrame(90000,true));
 for(let t=0;t<5000;t+=16)assert.ok(Math.abs(lightingFrame(t).beat-lightingFrame(t+16).beat)<.1);
 const previous=globalThis.document;let gradients=0;const c=ctx();c.createRadialGradient=()=>{gradients++;return {addColorStop(){}};};globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>c})};try{const map=worldFor('club').FLOORS[0];drawClubAmbient(c,map,12000,null,{x:1800,y:600,w:1000,h:700});const warm=gradients;drawClubAmbient(c,map,12016,null,{x:1800,y:600,w:1000,h:700});assert.equal(gradients,warm,'los gradientes de luz se reutilizan');}finally{globalThis.document=previous;}
});
test('reunión: intro sincronizada, pausa, discusión, votos privados y recuento antes de expulsar',async()=>{
 const f=await fixture(),r=await enter(f),m=r.body.state.meeting;assert.equal(m.introUntil-m.introAt,2400);assert.equal(m.discussionEnd-m.introUntil,5000);assert.equal(m.voteEnd-m.discussionEnd,15000);assert.equal(m.result,null);
 const p={...f.raw().players[0].meetingPos};await f.send(0,'pulse',{x:1,y:1});f.keep(100);await f.send(0,'pulse',{_motion:{seq:1,segments:[{x:1,y:1,ms:100}],x:1,y:1}});assert.deepEqual(f.raw().players[0].meetingPos,p);
 assert.equal((await f.send(0,'vote',{target:'skip'})).status,400);f.keep(7400);assert.equal((await f.send(0,'vote',{target:'skip'})).status,200);const before=(await f.send(1,'pulse')).body.state.meeting;assert.equal(before.result,null);assert.equal(before.myVote,null);assert.ok(!Object.hasOwn(before,'votes'));assert.equal((await f.send(0,'vote',{target:'skip'})).status,400);
 for(let i=1;i<5;i++)assert.equal((await f.send(i,'vote',{target:'skip'})).status,200);const result=(await f.send(1,'pulse')).body.state.meeting;assert.equal(Object.values(result.result.counts).reduce((a,b)=>a+b,0),5);assert.equal(result.tallyUntil-result.resultAt,3000);assert.equal(result.resultUntil-result.tallyUntil,9500);assert.equal(result.result.expelled,null);assert.equal((await f.send(1,'kill')).status,400);assert.equal((await f.send(1,'report')).status,400);
 f.keep(3001);assert.equal((await f.send(1,'pulse')).body.state.phase,'meeting');f.keep(9500);assert.equal((await f.send(1,'pulse')).body.state.phase,'game');assert.equal(f.raw().bodies.length,0);
});
test('votos anónimos y omisiones por tiempo: autoridad, privacidad y confirmación configurable',async()=>{
 const f=await fixture(5,{anonymousVotes:true,confirmEject:false});assert.equal((await f.send(1,'configure',{anonymousVotes:false})).status,403);await enter(f);f.keep(7500);const target=f.raw().players.find(p=>p.role==='crew');for(let i=0;i<3;i++)await f.send(i,'vote',{target:target.id});f.keep(16000);const s=(await f.send(4,'pulse')).body.state,m=s.meeting;assert.equal(m.stage,'result');assert.equal(m.result.counts.skip,2);assert.equal(m.result.expelled.id,target.id);assert.equal(m.result.expelled.role,null);assert.equal(m.result.remainingImpostors,null);assert.equal(Object.hasOwn(m.result,'votes'),false);assert.equal(Object.values(m.result.counts).reduce((a,b)=>a+b,0),5);
 assert.ok(!voteIcons(Object.values(m.result.counts).reduce((a,b)=>a+b,0)).includes('title="Noche'));
});
test('asesinato: variante del servidor, cuerpo exacto, testigo local y cinemática privada',async()=>{
 const f=await fixture(),r=f.raw(),ii=r.players.findIndex(p=>p.role==='impostor'),crew=r.players.map((p,i)=>({p,i})).filter(q=>q.p.role==='crew'),base=worldFor('club').FLOORS[0].spawn;
 Object.assign(r.players[ii],base,{input:{x:0,y:0},moveAt:f.now,transition:null});crew.forEach(({p},k)=>Object.assign(p,base,{x:base.x+30+k*25,input:{x:0,y:0},moveAt:f.now,transition:null}));const victim=crew[0];
 const killed=await f.send(ii,'kill',{target:victim.p.id,variant:99});assert.equal(killed.status,200);const fx=killed.body.state.worldKill;assert.ok(fx);assert.ok([0,1,2,3].includes(fx.variant));assert.equal(killed.body.state.actionFx,null);const body=f.raw().bodies[0];assert.equal(body.x,victim.p.x);assert.equal(body.y,victim.p.y);assert.equal(body.at,f.now);assert.equal((await f.send(ii,'kill',{target:victim.p.id})).status,400);
 assert.equal((await f.send(victim.i,'pulse')).body.state.actionFx.id,fx.id);assert.equal((await f.send(crew[1].i,'pulse')).body.state.actionFx,null);assert.equal((await f.send(crew[1].i,'pulse')).body.state.worldKill.id,fx.id);Object.assign(f.raw().players[crew[2].i],{x:5*TILE,y:16*TILE});assert.equal((await f.send(crew[2].i,'pulse')).body.state.worldKill,null);
});
test('cuatro ataques y cadáver: poses distintas, movimiento real y dibujo sin errores',()=>{
 const c=ctx(),fx={x:0,y:0,victimX:65,victimY:5,attacker:{color:0},victim:{color:2}};let calls=0;c.fill=()=>calls++;
 for(let variant=0;variant<4;variant++)for(const age of [0,140,300,440,650,900,1090]){assert.doesNotThrow(()=>drawKillScene(c,{...fx,variant},1200,age));drawBody(c,{x:65,y:5,color:2,at:0},age);}
 assert.ok(calls>100);assert.notDeepEqual(killPose(100),killPose(450));assert.equal(killPose(1000).fall,1);
});
test('tableta: avatares, identidad privada, megáfono, muertos, confirmación y votos',()=>{
 const s={me:{id:'a',role:'crew',alive:true},roster:[{id:'a',name:'A < B',color:0,alive:true},{id:'b',name:'B',color:1,alive:false}],meeting:{stage:'discussion',myVote:null,callerId:'a'}};
 const html=meetingCards(s,null);assert.ok(html.includes('A &lt; B'));assert.equal((html.match(/data-vote=/g)||[]).length,2);assert.equal((html.match(/ disabled/g)||[]).length,2);assert.ok(html.includes('reporter-megaphone'));assert.ok(html.includes('dead-cross'));s.meeting.stage='voting';assert.ok(meetingCards(s,'a').includes('is-selected'));s.me.role='impostor';s.roster[0].role='impostor';assert.ok(meetingCards(s,null).includes('known-impostor'));
});
test('expulsión del club: puerta mecánica, impulso, caída y alternativa sin expulsado',()=>{
 const early=clubExitPose(0),opened=clubExitPose(1200),late=clubExitPose(4500);assert.equal(early.open,0);assert.equal(opened.open,1);assert.equal(late.open,0);assert.ok(late.x>200);assert.ok(late.y>70);assert.equal(late.push,0);
 const yes=terraceMarkup({name:'Fer',color:0},'club'),no=terraceMarkup(null,'club');assert.ok(yes.includes('club-exit-player'));assert.ok(!no.includes('club-exit-player'));assert.ok(no.includes('club-door-left'));const attributes={};const nodes=new Map();const root={querySelector:key=>{if(key==='.club-exit-player'||key==='.club-push')return null;if(!nodes.has(key))nodes.set(key,{setAttribute:(n,v)=>attributes[key+n]=v,getBoundingClientRect:()=>({width:390,height:844})});return nodes.get(key);}};animateTerrace(root,1200);assert.match(attributes['.club-door-lefttransform'],/-85/);assert.ok(attributes['.terrace-panoramaviewBox']);
});

// ---------------------------------------------------------------- pase y experiencia
import {signProgress} from '../game/api.js';
import {encodePayload,computeAward,GAME_CAP,LEVEL_XP,REWARDS,hasClaimed} from '../public/pass.js';
test('pase: el progreso va firmado; uno falsificado vale cero y cada nivel se recoge una sola vez',async()=>{
 const store=new MemoryStore({secret:'prueba-secreta'}),pass=body=>api(store,'/api/pass',body,Date.now());
 assert.equal((await pass({})).body.progress.xp,0);
 const forged=encodePayload({xp:50000,claimed:0})+'.'+'0'.repeat(32);
 assert.equal((await pass({token:forged})).body.progress.xp,0,'firma inventada');
 const other=await signProgress(new MemoryStore({secret:'otro-servidor'}),{xp:50000,claimed:0});
 assert.equal((await pass({token:other})).body.progress.xp,0,'firma de otro servidor');
 const token=await signProgress(store,{xp:2*LEVEL_XP+300,claimed:0});
 assert.equal((await pass({token})).body.progress.xp,2*LEVEL_XP+300);
 const one=await pass({token,claim:2});assert.equal(one.status,200);assert.ok(hasClaimed(one.body.progress.claimed,2));
 assert.equal((await pass({token:one.body.token,claim:2})).status,400,'misma recompensa dos veces');
 assert.equal((await pass({token:one.body.token,claim:3})).status,400,'nivel no alcanzado');
 assert.equal((await pass({token:one.body.token,claim:51})).status,400,'nivel inexistente');
 const tampered=one.body.token.replace(/^[^.]+/,encodePayload({xp:99999,claimed:2**50-1}));
 assert.equal((await pass({token:tampered})).body.progress.xp,0,'cuerpo cambiado con firma antigua');
});
test('pase: nadie lleva lo que no ha desbloqueado; con la recompensa recogida, sí',async()=>{
 const store=new MemoryStore({secret:'armario'}),now=Date.now();
 const locked=await api(store,'/api/create',{profile:{name:'Sin pase',pet:3,hat:12,effect:2,emote:1,accessory:11}},now);
 const me=locked.body.state.me;for(const k of ['pet','hat','effect','emote','accessory'])assert.equal(me[k],0,k);
 const cat=REWARDS.find(r=>r.field==='pet'&&r.value===3);
 const token=await signProgress(store,{xp:cat.level*LEVEL_XP,claimed:2**(cat.level-1)});
 const ok=await api(store,'/api/create',{profile:{name:'Con pase',pet:3,hat:12,pass:token}},now);
 assert.equal(ok.body.state.me.pet,3);assert.equal(ok.body.state.me.hat,0,'el sombrero de mago sigue bloqueado');
 const change=await api(store,'/api/room',{...ok.body.session,type:'profile',data:{name:'Con pase',color:ok.body.state.me.color,pet:5}},now);
 assert.equal(change.body.state.me.pet,0,'otra mascota no recogida');
});
test('experiencia: cada voto cuenta al final con los roles reales y nunca durante la reunión',async()=>{
 const f=await fixture(5);const r=f.raw();r.players.forEach((p,i)=>{p.role=i===0?'impostor':'crew';p.specialRole=null;});const ids=r.players.map(p=>p.id);
 r.players[1].tasks.forEach((t,i)=>{if(i<2)t.done=true;});
 assert.equal((await enter(f,1)).status,200);f.keep(8000);await f.send(0,'pulse');
 assert.equal(f.raw().meeting.stage,'voting');
 const votes={0:ids[1],1:ids[0],2:ids[3],3:'skip',4:ids[0]};
 for(const [i,target] of Object.entries(votes)){const res=await f.send(+i,'vote',{target});assert.equal(res.status,200,res.body.error);
  assert.equal(res.body.state.me.award,null,'sin experiencia durante la reunión');assert.ok(!JSON.stringify(res.body.state).includes('Votos acertados'));}
 for(let i=0;i<6&&f.raw().phase!=='ended';i++){f.keep(3000);await f.send(0,'pulse');}
 assert.equal(f.raw().phase,'ended');
 const award=async i=>(await f.send(i,'pulse')).body.state.me;
 const row=(a,id)=>a.award.rows.find(x=>x.id===id)?.count||0;
 const a1=await award(1),a2=await award(2),a3=await award(3),a4=await award(4),a0=await award(0);
 assert.equal(row(a1,'voteRight'),1);assert.equal(row(a1,'voteWrong'),0);assert.equal(row(a1,'tasks'),2);assert.equal(row(a1,'victory'),1);
 assert.equal(row(a2,'voteWrong'),1);assert.equal(row(a2,'voteRight'),0);
 assert.equal(row(a3,'voteRight')+row(a3,'voteWrong'),0,'saltar no suma ni resta');
 assert.equal(row(a4,'voteRight'),1);
 assert.equal(row(a0,'victory'),0);assert.equal(row(a0,'voteWrong'),0,'el voto del impostor no puntúa');
 assert.ok(a1.award.total>a2.award.total);assert.ok(a1.award.total<=GAME_CAP);
 // Repetir peticiones no vuelve a conceder nada y el token firmado lleva el total.
 const again=await award(1);assert.equal(again.award.total,a1.award.total);assert.equal(again.progress.xp,a1.award.after);
 const verified=await api(new MemoryStore(),'/api/pass',{token:again.passToken});assert.equal(verified.status,200);
 assert.equal(f.raw().voteLog.length,5,'un registro por votante');
});
test('experiencia: una partida nunca supera medio nivel, ni siquiera al cambiar de nivel',()=>{
 const huge=computeAward({won:true,tasks:40,votesRight:20,repairs:20});assert.equal(huge.total,GAME_CAP);assert.ok(huge.capped);
 const bad=computeAward({won:false,votesWrong:30});assert.equal(bad.total,0,'nunca negativo');
 assert.ok(GAME_CAP<=LEVEL_XP/2);
});
