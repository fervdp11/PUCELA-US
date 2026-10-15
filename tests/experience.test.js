import test from 'node:test';
import assert from 'node:assert/strict';
import {api} from '../game/api.js';
import {MemoryStore} from '../server/memory-store.js';
import {worldFor,canStand,TILE} from '../public/content.js';
import {lightingFrame,drawClubAmbient} from '../public/scenery.js';
import {meetingCards,voteIcons} from '../public/meetings.js';
import {killPose,drawKillScene,drawBody} from '../public/eliminations.js';
import {clubExitPose,terraceMarkup,animateTerrace} from '../public/expulsion.js';

async function fixture(n=5,options={}){const store=new MemoryStore();let clock=Date.now();const sessions=[];for(let i=0;i<n;i++){const r=await api(store,i?'/api/join':'/api/create',{profile:{name:`Noche ${i}`,color:i},code:sessions[0]?.code},clock);assert.equal(r.status,200);sessions.push(r.body.session);}const raw=()=>store.rooms.get(sessions[0].code),send=(i,type,data={})=>api(store,'/api/room',{...sessions[i],type,data},clock),keep=(ms=0)=>{clock+=ms;raw().players.forEach(p=>p.lastSeen=clock);};await send(0,'configure',{map:'club',discussion:5,voting:15,...options});await send(0,'start');keep(41000);raw().teachers=[];return {send,raw,keep,get now(){return clock;}};}
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
 for(let i=1;i<5;i++)assert.equal((await f.send(i,'vote',{target:'skip'})).status,200);const result=(await f.send(1,'pulse')).body.state.meeting;assert.equal(result.result.votes.length,5);assert.equal(result.tallyUntil-result.resultAt,3000);assert.equal(result.resultUntil-result.tallyUntil,9500);assert.equal(result.result.expelled,null);assert.equal((await f.send(1,'kill')).status,400);assert.equal((await f.send(1,'report')).status,400);
 f.keep(3001);assert.equal((await f.send(1,'pulse')).body.state.phase,'meeting');f.keep(9500);assert.equal((await f.send(1,'pulse')).body.state.phase,'game');assert.equal(f.raw().bodies.length,0);
});
test('votos anónimos y omisiones por tiempo: autoridad, privacidad y confirmación configurable',async()=>{
 const f=await fixture(5,{anonymousVotes:true,confirmEject:false});assert.equal((await f.send(1,'configure',{anonymousVotes:false})).status,403);await enter(f);f.keep(7500);const target=f.raw().players.find(p=>p.role==='crew');for(let i=0;i<3;i++)await f.send(i,'vote',{target:target.id});f.keep(16000);const s=(await f.send(4,'pulse')).body.state,m=s.meeting;assert.equal(m.stage,'result');assert.equal(m.result.counts.skip,2);assert.equal(m.result.expelled.id,target.id);assert.equal(m.result.expelled.role,null);assert.equal(m.result.remainingImpostors,null);assert.ok(m.result.votes.every(v=>!Object.hasOwn(v,'voter')));assert.equal(m.result.votes.length,5);
 assert.ok(!voteIcons(m.result.votes,s.roster,true).includes('title="Noche'));
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
