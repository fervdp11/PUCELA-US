import {noteEvidence} from './social.js';
// Cofres, inventario y objetos. Todo lo decide el servidor: qué hay en cada
// cofre, quién lo abre primero, cuánta carga le queda a cada objeto, a quién
// atrapa una jaula, cuándo un escudo detiene un ataque y qué es un señuelo.
// El cliente solo pide acciones y dibuja lo que recibe.
import {worldFor,canStand,move,distance,lineOfSight,visionLineOfSight,appearanceOf,ITEMS,ITEM_SLOTS,cageMap,TILE,blockersOf} from '../public/content.js';
import {GameError} from './engine.js';
const assert=(ok,message,status=400)=>{if(!ok)throw new GameError(message,status);};
const uid=()=>crypto.randomUUID();
const randomInt=n=>crypto.getRandomValues(new Uint32Array(1))[0]%n;
export const CHEST_MIN_MS=1400;
const EMPTY_WEIGHT=34;
export const ITEM_COMMANDS=new Set(['openChest','finishChest','useItem','dropItem','pickItem','watchCamera','stopCamera']);
const OPEN_RANGE=115,PICK_RANGE=90;

function rollItem(){const kinds=Object.keys(ITEMS),total=EMPTY_WEIGHT+kinds.reduce((n,k)=>n+ITEMS[k].weight,0);let r=randomInt(total);if(r<EMPTY_WEIGHT)return null;r-=EMPTY_WEIGHT;for(const k of kinds){if(r<ITEMS[k].weight)return k;r-=ITEMS[k].weight;}return null;}
const fresh=kind=>({uid:uid(),kind,charge:ITEMS[kind].charge||0,active:false,placed:null});
export function setupItems(room,now){
 const chests=worldFor(room).CHESTS||[];
 room.chests=chests.filter(c=>room.config.floors==='both'||String(c.floor)===String(room.config.floors)||worldFor(room).FLOORS.length===1).map(c=>({id:c.id,opened:false,item:rollItem(),openedBy:null}));
 room.groundItems=[];room.decoys=[];room.portableCameras=[];room.trails={};room.itemsAt=now;
 room.shieldNullUntil=0;
 for(const p of room.players){p.items={slots:[null,null],shieldUntil:0,cage:null,watching:null,chest:null,tracking:false};}
}
const slotsOf=p=>p.items?.slots||[];
const filled=p=>slotsOf(p).filter(Boolean).length;
function give(p,item){const i=p.items.slots.findIndex(s=>!s);if(i<0)return false;p.items.slots[i]=item;return true;}
function requirePlaying(room,p,now){assert(room.phase==='game','Solo durante la partida.');assert(now>=room.revealUntil,'Espera a que termine la presentación.');assert(p.alive,'Los espectros no usan objetos.');assert(!p.vent,'Sal del conducto primero.');p.items??={slots:[null,null],shieldUntil:0,cage:null,watching:null,chest:null};}
export function chestDef(room,id){return (worldFor(room).CHESTS||[]).find(c=>c.id===id);}
export const itemSpeed=(p,now)=>p.items?.slots?.some(s=>s?.kind==='turbo'&&s.active)?1.45:1;
export const itemVision=(p)=>p.items?.slots?.some(s=>s?.kind==='flashlight'&&s.active)?1.5:1;
export const caged=(p,now)=>p.items?.cage&&now<p.items.cage.until?p.items.cage:null;
export function motionMap(map,p,now){const c=caged(p,now);return c?cageMap(map,c):map;}

// ------------------------------------------------------------- comandos
export function itemCommand(room,p,type,data,now,extra){
 const w=worldFor(room);
 if(type==='openChest'){
  requirePlaying(room,p,now);assert(!p.puzzle&&!p.repair&&!p.camera,'Termina lo que estás haciendo.');
  const def=chestDef(room,data.id),chest=room.chests?.find(c=>c.id===data.id);assert(def&&chest,'No hay ningún cofre ahí.');
  assert(def.floor===p.floor&&distance(p,def)<=OPEN_RANGE,'Acércate al cofre.');assert(!chest.opened,'Este cofre ya está abierto.');
  assert(filled(p)<ITEM_SLOTS,'Llevas dos objetos. Suelta uno antes de abrir otro cofre.');
  p.items.chest={id:chest.id,start:now,challenge:{order:shuffled([1,2,3])}};p.input={x:0,y:0};
  extra.chest={id:chest.id,theme:def.theme,label:def.label,challenge:p.items.chest.challenge,minDuration:CHEST_MIN_MS};
  return;
 }
 if(type==='finishChest'){
  requirePlaying(room,p,now);const open=p.items.chest;assert(open&&open.id===data.id,'No estás abriendo este cofre.');
  const def=chestDef(room,open.id),chest=room.chests.find(c=>c.id===open.id);p.items.chest=null;
  assert(distance(p,def)<=OPEN_RANGE+20,'Te has alejado del cofre.');assert(now-open.start>=CHEST_MIN_MS,'Ábrelo con calma.');
  const s=data.solution;assert(s&&Array.isArray(s.order)&&s.order.length===3&&s.order.every((v,i)=>open.challenge.order[v]===i+1)&&s.lid===true,'El cierre no ha cedido. Inténtalo otra vez.');
  assert(!chest.opened,'Alguien lo ha abierto antes que tú.');
  chest.opened=true;chest.openedBy=p.id;
  if(!chest.item){extra.found=null;return;}
  assert(filled(p)<ITEM_SLOTS,'No te caben más objetos.');
  const item=fresh(chest.item);chest.item=null;give(p,item);extra.found=item.kind;return;
 }
 if(type==='pickItem'){
  requirePlaying(room,p,now);const g=(room.groundItems||[]).find(g=>g.uid===data.uid);assert(g&&g.floor===p.floor&&distance(p,g)<=PICK_RANGE,'No hay nada que recoger aquí.');
  assert(filled(p)<ITEM_SLOTS,'Llevas dos objetos. Suelta uno primero.');
  room.groundItems=room.groundItems.filter(x=>x!==g);give(p,{uid:g.uid,kind:g.kind,charge:g.charge,active:false,placed:null});return;
 }
 const slot=Number(data.slot),item=slotsOf(p)[slot];
 if(type==='dropItem'){
  requirePlaying(room,p,now);assert(item,'Esa ranura está vacía.');deactivate(room,p,item);p.items.slots[slot]=null;
  if(item.placed)room.portableCameras=room.portableCameras.filter(c=>c.uid!==item.uid);
  else room.groundItems.push({uid:item.uid,kind:item.kind,charge:item.charge,x:p.x,y:p.y+6,floor:p.floor});
  return;
 }
 if(type==='stopCamera'){if(p.items)p.items.watching=null;return;}
 if(type==='watchCamera'){requirePlaying(room,p,now);assert(item?.kind==='camera'&&item.placed,'Primero coloca la cámara.');assert(item.charge>0,'La cámara se ha quedado sin batería.');p.items.watching=p.items.watching===item.uid?null:item.uid;p.input={x:0,y:0};return;}
 if(type==='useItem'){
  requirePlaying(room,p,now);assert(item,'Esa ranura está vacía.');const def=ITEMS[item.kind];
  if(def.mode==='toggle'){assert(item.charge>0,'Se ha agotado.');if(item.active){deactivate(room,p,item);}else{item.active=true;}return;}
  if(item.kind==='camera'){
   if(!item.placed){const map=w.mapFor(p.floor,blockersOf(room));assert(canStand(map,p.x,p.y),'No puedes colocarla aquí.');item.placed={x:p.x,y:p.y,floor:p.floor};room.portableCameras.push({uid:item.uid,owner:p.id,x:p.x,y:p.y,floor:p.floor});extra.placed=true;return;}
   p.items.watching=p.items.watching===item.uid?null:item.uid;p.input={x:0,y:0};return;
  }
  if(item.kind==='shield'){
   // Impostor: el mismo objeto anula durante 30 s los escudos protectores de todos.
   // No los reinicia ni los acorta: al acabar, los que sigan activos vuelven a valer.
   if(p.role==='impostor'){room.shieldNullUntil=now+def.duration;p.items.slots[slot]=null;event(room,'item-nullify','',now,{private:p.id});return;}
   p.items.shieldUntil=now+def.duration;p.items.slots[slot]=null;event(room,'item-shield','',now,{private:p.id});return;}
  if(item.kind==='decoy'){const map=w.mapFor(p.floor,blockersOf(room));room.decoys.push({id:'decoy-'+uid(),owner:p.id,...appearanceOf(p),x:p.x+(p.facing||1)*-24,y:p.y,floor:p.floor,facing:p.facing||1,until:now+def.duration,goal:null,seed:randomInt(1e9),moveAt:now,input:{x:0,y:0}});const d=room.decoys.at(-1);if(!canStand(map,d.x,d.y)){d.x=p.x;d.y=p.y;}p.items.slots[slot]=null;return;}
  if(item.kind==='cage'){const map=w.mapFor(p.floor,blockersOf(room));const target=room.players.filter(q=>q!==p&&!q.removed&&q.alive&&!q.vent&&q.floor===p.floor&&distance(p,q)<=def.range&&lineOfSight(map,p,q)).sort((a,b)=>distance(p,a)-distance(p,b))[0];
   assert(target,'No hay nadie lo bastante cerca para atrapar.');target.items??={slots:[null,null]};target.items.cage={x:target.x,y:target.y,until:now+def.duration,by:p.id};target.puzzle=null;target.repair=null;p.items.slots[slot]=null;room.cageFx={by:p.id,target:target.id,at:now,x:target.x,y:target.y,floor:target.floor};extra.caged=target.name;return;}
 }
 throw new GameError('Acción de objeto desconocida.');
}
function shuffled(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=randomInt(i+1);[b[i],b[j]]=[b[j],b[i]];}return b;}
function deactivate(room,p,item){item.active=false;if(p.items.watching===item.uid)p.items.watching=null;}
function event(room,type,text,now,extra){room.events.push({id:uid(),type,text,time:now,...extra});room.events=room.events.slice(-20);}

// ------------------------------------------------------------- asesinatos
// Devuelve true si el escudo ha parado el golpe. La recarga del atacante se
// reinicia entera y la víctima recibe un aviso inconfundible.
export function shieldBlocks(room,killer,victim,now){
 if(!(victim.items?.shieldUntil>now))return false;
 if((room.shieldNullUntil||0)>now)return false;
 killer.killReady=now+room.config.killCooldown*1000;killer.input={x:0,y:0};
 victim.items.shieldHits=(victim.items.shieldHits||0)+1;
 event(room,'shield-block',`¡${killer.name} ha intentado matarte! Tu escudo te ha protegido.`,now,{private:victim.id,attacker:killer.id});
 event(room,'shield-fail','Tu ataque ha rebotado en un escudo. La recarga empieza de nuevo.',now,{private:killer.id});
 room.shieldFx={victim:victim.id,at:now,x:victim.x,y:victim.y,floor:victim.floor};
 // Los bots que lo ven (incluida la víctima) lo recuerdan como prueba directa.
 const map=worldFor(room).mapFor(victim.floor,blockersOf(room));for(const q of room.players)if(q.bot&&q.alive&&!q.removed&&q!==killer&&q.floor===victim.floor&&(q===victim||distance(q,victim)<380&&lineOfSight(map,q,victim)))noteEvidence(q,{kind:q===victim?'shield':'shieldSeen',target:killer.id,name:killer.name,src:'seen',place:worldFor(room).roomAt?.(victim.x,victim.y,victim.floor)||null,at:now});
 return true;
}
export const findDecoy=(room,id)=>(room.decoys||[]).find(d=>d.id===id&&d.until>0);
export function killDecoy(room,killer,decoy,now){
 room.decoys=room.decoys.filter(d=>d!==decoy);
 room.bodies.push({id:uid(),victim:decoy.owner,...appearanceOf(decoy),floor:decoy.floor,x:decoy.x,y:decoy.y,at:now,decoy:true});
 killer.killReady=now+room.config.killCooldown*1000;killer.input={x:0,y:0};killer.transition={kind:'attack',at:now,until:now+850};
 room.actionFx={id:uid(),kind:'kill',variant:randomInt(4),actor:killer.id,target:decoy.id,floor:killer.floor,x:killer.x,y:killer.y,victimX:decoy.x,victimY:decoy.y,at:now,sceneUntil:now+1100,until:now+2200,attacker:appearanceOf(killer),victim:appearanceOf(decoy)};
 event(room,'decoy-killed','Alguien ha atacado a tu señuelo.',now,{private:decoy.owner});
}
export function reportDecoy(room,p,body,now){room.bodies=room.bodies.filter(b=>b!==body);const owner=room.players.find(q=>q.id===body.victim);event(room,'decoy-report',`Han reportado un señuelo de ${owner?.name||body.name}.`,now,{public:true});}

// ------------------------------------------------------------- reloj
export function stepItems(room,now){
 if(!room.chests)return;
 const dt=Math.max(0,Math.min(1000,now-(room.itemsAt||now)));room.itemsAt=now;
 if(room.phase!=='game')return;
 const w=worldFor(room);
 for(const p of room.players){
  if(!p.items||p.removed)continue;
  if(!p.alive){p.items.watching=null;for(const s of p.items.slots)if(s)s.active=false;p.items.cage=null;continue;}
  for(const [i,s] of p.items.slots.entries()){if(!s)continue;
   const spending=(s.active&&ITEMS[s.kind].mode==='toggle')||(s.kind==='camera'&&p.items.watching===s.uid);
   if(spending)s.charge=Math.max(0,s.charge-dt);
   if(spending&&s.charge<=0){if(s.kind==='camera')room.portableCameras=room.portableCameras.filter(c=>c.uid!==s.uid);p.items.slots[i]=null;if(p.items.watching===s.uid)p.items.watching=null;event(room,'item-empty',`${ITEMS[s.kind].name}: se ha agotado.`,now,{private:p.id});}
  }
  if(p.items.cage&&now>=p.items.cage.until)p.items.cage=null;
  if(p.items.shieldUntil&&now>=p.items.shieldUntil)p.items.shieldUntil=0;
 }
 // Huellas: muestras de posición cada 350 ms durante 9 s, sin identidad.
 if(now-(room.trailAt||0)>=350){room.trailAt=now;for(const p of room.players){if(p.removed||!p.alive||p.vent)continue;const t=room.trails[p.id]??=[];const last=t.at(-1);if(!last||Math.hypot(last.x-p.x,last.y-p.y)>10){t.push({x:Math.round(p.x),y:Math.round(p.y),floor:p.floor,at:now});}while(t.length&&now-t[0].at>9000)t.shift();}}
 // Señuelos: deambulan un poco y desaparecen a los 15 s.
 for(const d of room.decoys){const map=w.mapFor(d.floor,blockersOf(room));const rnd=()=>{d.seed=(Math.imul(d.seed,1664525)+1013904223)>>>0;return d.seed/4294967296;};
  if(!d.goal||distance(d,d.goal)<6){d.goal=null;for(let i=0;i<10&&!d.goal;i++){const a=rnd()*Math.PI*2,r=40+rnd()*120,q={x:d.x+Math.cos(a)*r,y:d.y+Math.sin(a)*r};if(canStand(map,q.x,q.y)&&lineOfSight(map,d,q))d.goal=q;}}
  const x=d.x,y=d.y;if(d.goal)move(map,d,d.goal.x-d.x,d.goal.y-d.y,dt/1000*.75,false,room.config.speed);d.input={x:Math.sign(d.x-x),y:Math.sign(d.y-y)};if(Math.abs(d.x-x)>.1)d.facing=d.x>x?1:-1;d.moveAt=now;}
 room.decoys=room.decoys.filter(d=>now<d.until);
}
export function clearForMeeting(room){for(const p of room.players){if(!p.items)continue;p.items.cage=null;p.items.watching=null;p.items.chest=null;for(const s of p.items.slots)if(s)s.active=false;}room.decoys=[];}

// ------------------------------------------------------------- instantánea
export function itemsSnapshot(room,p,now,vision){
 if(!room.chests||!['game','meeting'].includes(room.phase))return null;
 const self=p.items||{slots:[null,null]};
 const out={
  slots:self.slots.map(s=>s?{uid:s.uid,kind:s.kind,charge:s.charge,max:ITEMS[s.kind].charge||0,active:!!s.active,placed:!!s.placed}:null),
  shieldUntil:self.shieldUntil||0,nullUntil:p.role==='impostor'&&(room.shieldNullUntil||0)>now?room.shieldNullUntil:0,cage:caged(p,now),watching:self.watching||null,
  chests:room.chests.filter(c=>c.opened).map(c=>c.id),
  ground:room.phase==='game'?(room.groundItems||[]).filter(g=>g.floor===p.floor).map(({uid,kind,x,y})=>({uid,kind,x,y})):[],
  cages:room.phase==='game'?room.players.filter(q=>q.alive&&!q.removed&&caged(q,now)&&q.floor===p.floor).map(q=>({id:q.id,...caged(q,now)})):[],
  cameras:(room.portableCameras||[]).filter(c=>c.owner===p.id).map(({uid,x,y,floor})=>({uid,x,y,floor})),
  decoys:room.phase==='game'?(room.decoys||[]).filter(d=>d.floor===p.floor).map(d=>({id:d.id,...appearanceOf(d),x:d.x,y:d.y,floor:d.floor,facing:d.facing,input:d.input,alive:true,motionTime:d.moveAt,isDecoy:true,own:d.owner===p.id,teammate:p.role==='impostor'&&room.players.find(q=>q.id===d.owner)?.role==='impostor'})):[],
  footprints:[],feed:null
 };
 const tracker=self.slots.find(s=>s?.kind==='tracker'&&s.active);
 if(tracker&&p.alive)for(const [id,t] of Object.entries(room.trails||{})){if(id===p.id)continue;for(let i=1;i<t.length;i++){const a=t[i-1],b=t[i];if(b.floor!==p.floor||distance(p,b)>Math.min(vision*1.6,1100))continue;out.footprints.push({x:b.x,y:b.y,a:Math.round(Math.atan2(b.y-a.y,b.x-a.x)*100)/100,age:now-b.at});}}
 out.footprints.sort((a,b)=>a.x-b.x||a.y-b.y);
 if(self.watching&&p.alive){const cam=(room.portableCameras||[]).find(c=>c.uid===self.watching);if(cam){const map=worldFor(room).mapFor(cam.floor,blockersOf(room)),visibleAt=q=>q.floor===cam.floor&&distance(q,cam)<=440&&visionLineOfSight(map,cam,q);
  out.feed={id:'portable',label:'Cámara portátil',x:cam.x,y:cam.y,floor:cam.floor,signal:true,radius:400,players:room.players.filter(q=>q.alive&&!q.removed&&!q.vent&&!(q.specialRole==='phantom'&&q.abilityUntil>now)&&visibleAt(q)).map(q=>({id:q.id,...appearanceOf(q),alive:true,floor:q.floor,x:q.x,y:q.y,facing:q.facing,input:q.input,motionTime:q.moveAt??now,motionEpoch:q.motionEpoch||0})).concat((room.decoys||[]).filter(visibleAt).map(d=>({id:d.id,...appearanceOf(d),alive:true,floor:d.floor,x:d.x,y:d.y,facing:d.facing,input:d.input,motionTime:d.moveAt}))),bodies:room.bodies.filter(visibleAt).map(({decoy,...b})=>b),worldKill:null};}}
 return out;
}

// ------------------------------------------------------------- bots
// Los bots usan solo lo que ven: abren cofres cercanos, se ponen las
// zapatillas en trayectos largos, encienden la linterna con apagón, activan el
// escudo cuando se quedan a solas con alguien y el rastreador tras ver un cuerpo.
export function botItems(room,p,now,run){
 if(room.phase!=='game'||!p.alive||!p.items||p.vent||p.puzzle||p.repair)return;
 const b=p.brain||{};const w=worldFor(room);
 if(p.items.chest){if(now-p.items.chest.start>=CHEST_MIN_MS+400+(p.color%3)*300){const ch=p.items.chest.challenge;try{run(p,'finishChest',{id:p.items.chest.id,solution:{order:[1,2,3].map(n=>ch.order.indexOf(n)),lid:true}});}catch{p.items.chest=null;}}return;}
 if(now<(b.itemThinkAt||0))return;b.itemThinkAt=now+700+randomInt(500);
 if(filled(p)<ITEM_SLOTS&&!caged(p,now)){const near=(w.CHESTS||[]).find(c=>c.floor===p.floor&&distance(p,c)<=OPEN_RANGE-10&&!room.chests.find(x=>x.id===c.id)?.opened);if(near&&randomInt(3)===0){try{run(p,'openChest',{id:near.id});}catch{}return;}}
 const slots=p.items.slots,others=room.players.filter(q=>q!==p&&q.alive&&!q.removed&&q.floor===p.floor&&distance(p,q)<240);
 for(const [i,s] of slots.entries()){if(!s)continue;
  try{
   if(s.kind==='turbo'){const long=(b.path?.length||0)>14;if(long!==s.active)run(p,'useItem',{slot:i});}
   else if(s.kind==='flashlight'){const dark=room.sabotage?.kind==='lights';if(dark!==s.active)run(p,'useItem',{slot:i});}
   else if(s.kind==='tracker'){const want=(b.seenBodies?.length||0)>0&&now-(b.lastBodyAt||0)<12000;if(want!==s.active)run(p,'useItem',{slot:i});}
   else if(s.kind==='shield'&&(p.role==='crew'?others.length===1&&randomInt(4)===0:now>=p.killReady-1500&&others.length===1&&others[0].role!=='impostor'&&(room.shieldNullUntil||0)<=now&&randomInt(3)===0))run(p,'useItem',{slot:i});
   else if(s.kind==='decoy'&&(p.role==='impostor'?now>=p.killReady&&others.length===0:others.length===1&&(b.suspicions?.[others[0].id]||0)>40)&&randomInt(3)===0)run(p,'useItem',{slot:i});
   else if(s.kind==='cage'){const target=others.find(q=>p.role==='impostor'?q.role!=='impostor':(b.suspicions?.[q.id]||0)>60);if(target&&distance(p,target)<160&&randomInt(3)===0){run(p,'useItem',{slot:i});b.usedCage={target:target.id,at:now};}}
   else if(s.kind==='camera'&&p.role==='crew'&&!s.placed&&randomInt(6)===0)run(p,'useItem',{slot:i});
  }catch{}
 }
}
