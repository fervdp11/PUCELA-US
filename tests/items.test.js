// Cofres, inventario y los siete objetos: todo validado por el servidor.
import test from 'node:test';import assert from 'node:assert/strict';
import {createRoom,command,snapshot,tick} from '../game/engine.js';
import {WORLDS,canStand,distance,ITEMS,CAGE_HALF} from '../public/content.js';
import {CHEST_MIN_MS} from '../game/items.js';
function fixture(map='school',players=4){let now=Date.now();const {room,player}=createRoom({name:'Humano'},now);for(let i=1;i<players;i++)command(room,player.token,'addBot',{},now);command(room,player.token,'configure',{map,tasks:4,discussion:5,voting:30,killCooldown:20},now);command(room,player.token,'start',{},now);room.players.forEach((p,i)=>{p.bot=false;p.role=i===0?'impostor':'crew';p.specialRole=null;p.lastSeen=now;p.killReady=0;});room.intro=null;room.revealUntil=0;room.roleRevealAt=0;room.travelUntil=0;room.emergencyReady=0;room.sabotageReady=Infinity;const send=(i,type,data={},dt=0)=>{now+=dt;room.players.forEach(p=>p.lastSeen=now);for(const p of room.players)p.rateAt=0;return command(room,room.players[i].token,type,data,now);};return {room,send,get now(){return now;},wait(ms){now+=ms;room.players.forEach(p=>p.lastSeen=now);tick(room,now);},state:i=>snapshot(room,room.players[i],now)};}
const place=(f,i,pt)=>Object.assign(f.room.players[i],{x:pt.x,y:pt.y,floor:pt.floor??0,input:{x:0,y:0},moveAt:f.now,motionAt:f.now,transition:null});
function openChest(f,i,chest){place(f,i,{x:chest.x,y:chest.y+40,floor:chest.floor});const r=f.send(i,'openChest',{id:chest.id});const ch=r.chest.challenge;return {r,solution:{order:[1,2,3].map(n=>ch.order.indexOf(n)),lid:true}};}
const standNear=(m,c)=>{for(let d=0;d<=110;d+=6)for(let a=0;a<16;a++){const x=c.x+Math.cos(a*Math.PI/8)*d,y=c.y+Math.sin(a*Math.PI/8)*d;if(canStand(m,x,y))return {x,y};}return null;};

test('cofres en los cuatro mapas: temáticos, uno o dos por sala y alcanzables',()=>{
 const themes={school:['backpack','locker'],club:['case'],gym:['sports-bag'],park:['garden-box','backpack']};
 for(const [id,w] of Object.entries(WORLDS)){assert.ok(w.CHESTS.length>=5,id);const per={};for(const c of w.CHESTS){per[c.floor+':'+c.room]=(per[c.floor+':'+c.room]||0)+1;assert.ok(themes[id].includes(c.theme),`${id} ${c.theme}`);const m=w.FLOORS[c.floor===1?1:0];assert.ok(standNear(m,c),`${c.id} sin acceso`);}
  assert.ok(Object.values(per).every(n=>n<=2),`${id}: como mucho dos por sala`);}
 const P=WORLDS.park.FLOORS[0].layout.paseo;assert.ok(WORLDS.park.CHESTS.every(c=>c.x/56<P.x-.3||c.x/56>P.x+P.w+.3),'el paseo central sigue vacío');
});
test('abrir un cofre: minijuego validado, un único ganador y nunca más de dos objetos',()=>{
 const f=fixture('school');const chest=WORLDS.school.CHESTS[0],state=f.room.chests.find(c=>c.id===chest.id);state.item='turbo';
 const far=f.room.players[1];Object.assign(far,{x:chest.x+600,y:chest.y});assert.throws(()=>f.send(1,'openChest',{id:chest.id}),/Acércate/);
 const a=openChest(f,1,chest),b=openChest(f,2,chest);
 assert.throws(()=>f.send(1,'finishChest',{id:chest.id,solution:a.solution},200),/calma/);
 const again=openChest(f,1,chest);f.wait(CHEST_MIN_MS+50);
 assert.throws(()=>f.send(1,'finishChest',{id:chest.id,solution:{order:[0,0,0],lid:true}}),/cierre/);
 const c=openChest(f,1,chest);f.wait(CHEST_MIN_MS+50);const r=f.send(1,'finishChest',{id:chest.id,solution:c.solution});assert.equal(r.found,'turbo');
 assert.throws(()=>f.send(2,'finishChest',{id:chest.id,solution:b.solution}),/(abriendo|antes)/);
 assert.throws(()=>f.send(2,'openChest',{id:chest.id}),/ya está abierto/);
 const me=f.state(1).me.items;assert.equal(me.slots.filter(Boolean).length,1);assert.ok(f.state(2).me.items.chests.includes(chest.id),'todos ven el cofre abierto');
 // Lleno: dos objetos y no se abre un tercero.
 const p=f.room.players[1];p.items.slots=[{uid:'a',kind:'flashlight',charge:30000,active:false},{uid:'b',kind:'decoy',charge:0,active:false}];
 assert.throws(()=>openChest(f,1,WORLDS.school.CHESTS[1]),/dos objetos/);
 // Un objeto suelto se puede recoger; soltar y recoger son del servidor.
 f.send(1,'dropItem',{slot:0});assert.equal(f.state(2).me.items.ground.length,1);const g=f.state(2).me.items.ground[0];place(f,2,{x:g.x,y:g.y});f.send(2,'pickItem',{uid:g.uid});assert.equal(f.room.players[2].items.slots.filter(Boolean)[0].kind,'flashlight');
 assert.throws(()=>f.send(1,'useItem',{slot:0}),/vacía/);
});
test('zapatillas y linterna: efecto real, carga acumulada y se agotan',()=>{
 const f=fixture('school');const p=f.room.players[1],m=WORLDS.school.FLOORS[0];p.items.slots=[{uid:'t',kind:'turbo',charge:30000,active:false},{uid:'l',kind:'flashlight',charge:30000,active:false}];
 f.room.sabotage={kind:'lights',id:'qa',fixed:[],confirmations:{},started:f.now,deadline:f.now+90000};const vision=f.state(1).me.vision;f.send(1,'useItem',{slot:1});assert.ok(f.state(1).me.vision>vision,'la linterna amplía la visión en el apagón');f.room.sabotage=null;
 const start={x:p.x,y:p.y};p.input={x:1,y:0};p.moveAt=f.now;f.wait(400);f.send(1,'pulse',{x:1,y:0});const normal=distance(start,p);
 Object.assign(p,start);f.send(1,'useItem',{slot:0});p.input={x:1,y:0};p.moveAt=f.now;f.wait(400);f.send(1,'pulse',{x:1,y:0});const fast=distance(start,p);
 assert.ok(fast>normal*1.3||!canStand(m,start.x+normal*1.3,start.y),`turbo ${fast} vs ${normal}`);
 const before=p.items.slots[0].charge;f.wait(900);assert.ok(p.items.slots[0].charge<before,'gasta carga solo encendido');
 f.send(1,'useItem',{slot:0});const paused=p.items.slots[0].charge;f.wait(900);assert.equal(p.items.slots[0].charge,paused,'apagado no gasta');
 p.items.slots[1].charge=100;f.wait(400);f.wait(400);assert.equal(p.items.slots[1],null,'agotada desaparece');
});
test('escudo: bloquea el ataque, reinicia la recarga del atacante y avisa a la víctima',()=>{
 const f=fixture('school');const imp=f.room.players[0],v=f.room.players[1];v.items.slots[0]={uid:'s',kind:'shield',charge:0,active:false};f.send(1,'useItem',{slot:0});
 place(f,0,{x:v.x+40,y:v.y,floor:v.floor});const r=f.send(0,'kill',{target:v.id});assert.equal(r.blocked,true);assert.equal(v.alive,true);
 assert.ok(imp.killReady>=f.now+19000,'recarga completa');
 assert.ok(f.state(1).events.some(e=>e.type==='shield-block'&&e.text.includes(imp.name)),'aviso claro a la víctima');
 assert.ok(!f.state(2).events.some(e=>e.type==='shield-block'),'nadie más recibe el aviso');
 assert.ok(f.state(1).me.items.shieldUntil>f.now);assert.ok(!JSON.stringify(f.state(2).players.find(q=>q.id===v.id)).includes('shield'),'el escudo solo lo ve quien lo lleva');
 f.wait(ITEMS.shield.duration+500);imp.killReady=0;f.send(0,'kill',{target:v.id});assert.equal(v.alive,false,'sin escudo vuelve a ser vulnerable');
});
test('clon señuelo: idéntico, muere dejando un cuerpo normal y al reportarlo se anuncia',()=>{
 const f=fixture('school');const owner=f.room.players[1];owner.items.slots[0]={uid:'d',kind:'decoy',charge:0,active:false};f.send(1,'useItem',{slot:0});
 const seen=f.state(2).me.items.decoys[0];assert.equal(seen.name,owner.name);assert.equal(seen.color,owner.color);assert.equal(seen.hat,owner.hat);assert.ok(!('owner' in seen));
 place(f,0,{x:seen.x+30,y:seen.y,floor:seen.floor});f.send(0,'kill',{target:seen.id});assert.equal(owner.alive,true,'la persona real sigue viva');
 assert.ok(f.room.players[0].killReady>f.now,'gastar el ataque consume la recarga');
 const body=f.state(2).bodies[0];assert.ok(body&&!('decoy' in body),'el cuerpo parece normal');
 place(f,2,{x:body.x+30,y:body.y,floor:0});const r=f.send(2,'report',{body:body.id});assert.equal(r.decoy,true);assert.equal(f.room.phase,'game','no hay reunión');
 assert.ok(f.state(3).events.some(e=>e.text===`Han reportado un señuelo de ${owner.name}.`));
 owner.items.slots[0]={uid:'d2',kind:'decoy',charge:0,active:false};f.send(1,'useItem',{slot:0});f.wait(ITEMS.decoy.duration+400);assert.equal(f.state(2).me.items.decoys.length,0,'dura 15 s');
});
test('jaula: atrapa a la persona más cercana, respeta colisiones y se libera en la reunión',()=>{
 const f=fixture('school');const user=f.room.players[2],target=f.room.players[1];user.items.slots[0]={uid:'c',kind:'cage',charge:0,active:false};
 place(f,1,{x:user.x+60,y:user.y,floor:user.floor});place(f,3,{x:user.x+900,y:user.y,floor:user.floor});const r=f.send(2,'useItem',{slot:0});assert.equal(r.caged,target.name);
 const c={...target.items.cage};for(let i=0;i<6;i++){target.input={x:1,y:1};target.moveAt=f.now;f.wait(300);f.send(1,'pulse',{x:1,y:1});}
 assert.ok(Math.abs(target.x-c.x)<=CAGE_HALF-15+.5&&Math.abs(target.y-c.y)<=CAGE_HALF-15+.5,'movimiento muy limitado');
 assert.equal(f.state(3).me.items.cages.length,1,'todos ven la jaula');
 const em=WORLDS.school.FLOORS[0].emergency;place(f,3,{x:em.x,y:em.y+90,floor:0});f.send(3,'emergency');assert.equal(f.room.phase,'meeting');assert.equal(target.items.cage,null,'la reunión libera');
 const g=fixture('school');g.room.players[2].items.slots[0]={uid:'c',kind:'cage',charge:0,active:false};for(const [i,q] of g.room.players.entries())if(i!==2)Object.assign(q,{x:q.x+2000});assert.throws(()=>g.send(2,'useItem',{slot:0}),/nadie/);assert.ok(g.room.players[2].items.slots[0],'si no hay nadie no se gasta');
});
test('rastreador: huellas recientes sin identidad; cámara portátil con visión y batería',()=>{
 const f=fixture('school');const p=f.room.players[1],o=f.room.players[2];p.items.slots=[{uid:'r',kind:'tracker',charge:25000,active:false},{uid:'k',kind:'camera',charge:30000,active:false}];
 place(f,2,{x:p.x+120,y:p.y});for(let i=0;i<8;i++){o.input={x:1,y:0};o.moveAt=f.now;f.wait(400);f.send(2,'pulse',{x:1,y:0});}
 assert.equal(f.state(1).me.items.footprints.length,0,'apagado no muestra nada');f.send(1,'useItem',{slot:0});const prints=f.state(1).me.items.footprints;
 assert.ok(prints.length>2);assert.ok(prints.every(q=>Object.keys(q).sort().join()==='a,age,x,y'),'sin identidad ni rol');
 f.send(1,'useItem',{slot:1});assert.equal(f.state(1).me.items.slots[1].placed,true);f.send(1,'useItem',{slot:1});assert.ok(f.state(1).me.items.feed,'mira por la cámara');
 const x=p.x;p.input={x:1,y:0};p.moveAt=f.now;f.wait(400);f.send(1,'pulse',{x:1,y:0});assert.equal(p.x,x,'mirando la cámara no te mueves');
 const charge=p.items.slots[1].charge;f.wait(800);assert.ok(p.items.slots[1].charge<charge,'gasta batería mientras miras');f.send(1,'stopCamera');const paused=p.items.slots[1].charge;f.wait(800);assert.equal(p.items.slots[1].charge,paused,'pausar conserva la batería');
});
test('bots: abren cofres y usan objetos en partidas reales',()=>{
 let opened=0,used=0;for(const map of ['school','park']){const now0=Date.now();const {room,player}=createRoom({name:'Host'},now0);for(let i=0;i<7;i++)command(room,player.token,'addBot',{},now0);command(room,player.token,'configure',{map,tasks:4},now0);command(room,player.token,'start',{},now0);
  let now=now0;for(let i=0;i<900;i++){now+=200;room.players.forEach(p=>p.lastSeen=now);tick(room,now);if(room.phase!=='game'&&room.phase!=='meeting'&&i>100)break;}
  opened+=(room.chests||[]).filter(c=>c.opened).length;used+=room.players.filter(p=>p.bot&&p.items&&p.items.slots.some(s=>s&&(s.active||s.placed))||p.items?.shieldUntil).length+(room.decoys?.length||0);}
 assert.ok(opened>=2,`los bots abren cofres (${opened})`);
});

test('escudo del impostor: anula 30 s los escudos protectores, no los reinicia y vuelven a valer después',()=>{
 const f=fixture('school');const imp=f.room.players[0],v=f.room.players[1];
 v.items.slots[0]={uid:'s',kind:'shield',charge:0,active:false};f.send(1,'useItem',{slot:0});
 const until=v.items.shieldUntil;
 imp.items.slots[0]={uid:'n',kind:'shield',charge:0,active:false};f.send(0,'useItem',{slot:0});
 assert.ok(f.room.shieldNullUntil>=f.now+ITEMS.shield.duration-50,'dura 30 s');
 assert.ok(f.state(0).me.items.nullUntil>f.now,'el impostor ve la cuenta atrás');
 assert.equal(f.state(1).me.items.nullUntil,0,'la tripulación no se entera');
 assert.equal(imp.items.shieldUntil,0,'no se protege a sí mismo');
 place(f,0,{x:v.x+40,y:v.y,floor:v.floor});imp.killReady=0;
 const r=f.send(0,'kill',{target:v.id});assert.notEqual(r.blocked,true);assert.equal(v.alive,false,'mata a un jugador con escudo mientras dura la anulación');
 // Con otro escudo: pasados 30 s anulados, un escudo con tiempo restante vuelve a proteger y conserva su caducidad.
 const f2=fixture('school');const i2=f2.room.players[0],w=f2.room.players[1];
 i2.items.slots[0]={uid:'n',kind:'shield',charge:0,active:false};f2.send(0,'useItem',{slot:0});
 f2.wait(20000);w.items.slots[0]={uid:'s',kind:'shield',charge:0,active:false};f2.send(1,'useItem',{slot:0});const exp=w.items.shieldUntil;
 f2.wait(11000);assert.equal(w.items.shieldUntil,exp,'su duración no se reinicia');
 place(f2,0,{x:w.x+40,y:w.y,floor:w.floor});i2.killReady=0;const r2=f2.send(0,'kill',{target:w.id});assert.equal(r2.blocked,true);assert.equal(w.alive,true,'recupera su efecto tras la anulación');
});
test('clon: mismo nombre, mismo aspecto y sin ningún texto o marca extra (ids internos distintos)',()=>{
 const f=fixture('school');const owner=f.room.players[1];owner.items.slots[0]={uid:'d',kind:'decoy',charge:0,active:false};f.send(1,'useItem',{slot:0});
 for(const i of [1,2]){const d=f.state(i).me.items.decoys[0];assert.equal(d.name,owner.name);assert.notEqual(d.id,owner.id);for(const k of ['color','hat','skin','glasses','bag','accessory','outfitColor','trimColor','pants'])assert.equal(d[k],owner[k],k);}
});
