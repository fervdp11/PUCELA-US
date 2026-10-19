import {createWildlife,stepWildlife,wildlifeSnapshot} from './wildlife.js';
import {setupItems,itemCommand,ITEM_COMMANDS,stepItems,itemSpeed,itemVision,motionMap,caged,shieldBlocks,findDecoy,killDecoy,reportDecoy,clearForMeeting,itemsSnapshot,botItems} from './items.js';
import {lockAppearance,computeAward,cleanProgress,PETS,EFFECTS,EMOTES,NAME_BGS,NAME_COLORS,LEVEL_XP,MAX_LEVEL} from '../public/pass.js';
import {activeRepairs} from '../public/worlds.js';
import {structuredMessage,botsMayVote,criticalVote,botIntent} from './social.js';
import {stepBots} from './bots.js';
import {beginIntro,advanceIntro,introPublic} from './intro.js';
import {tableCommand,tableTick,tableView,tableStats,closeTables,hooks as tableHooks} from './tables.js';
import {LOBBY_OBJECTS} from '../public/caravan.js';
import {worldFor,WORLDS,MAP,LOBBY,MEETING,FLOORS,STATIONS,REPAIRS,VENTS,DOORS,SABOTAGES,taskStation,mapFor,appearanceOf,COLORS,HATS,SKINS,PANTS,GLASSES,BAGS,ACCESSORIES,HAIR_COLORS,SKIN_TONES,SHOES,BADGES,SPEED,USE_RANGE,KILL_RANGE,REPORT_RANGE,GRACE_MS,RECONNECT_MS,move,canStand,detentionMap,distance,lineOfSight,visionLineOfSight,insideStairs,roomAt} from '../public/content.js';

import {challenge,minDuration,solution} from './tasks.js';

export class GameError extends Error {constructor(message,status=400){super(message);this.status=status;}}
tableHooks.Err=GameError;
const assert=(ok,message,status=400)=>{if(!ok)throw new GameError(message,status);};
const uid=()=>crypto.randomUUID();
export const DEFAULTS={impostors:1,tasks:10,killCooldown:30,discussion:20,voting:40,confirmEject:true,anonymousVotes:true,speed:1,floors:'both',map:'school',botUrgency:1};
const VENT_COOLDOWN=20000,VENT_LIMIT=10000;
const SABOTAGE_COOLDOWN=112500,SABOTAGE_START_COOLDOWN=37500,SABOTAGE_DEADLINE=90000;
const allowedFloor=(room,floor)=>worldFor(room).FLOORS.some(f=>f.floor===floor)&&(room.config.floors==='both'||Number(room.config.floors)===floor);
const gameFloor=room=>room.config.floors==='1'?1:0;
const gameMap=room=>worldFor(room).FLOORS[gameFloor(room)];
const repairPanels=activeRepairs;
const SPECIAL_ROLES=['nerd','delegate','engineer','plug','believer'];
const TEACHER_NAMES=['Chuchi','Ibán de la Horra','Marcos','Luis Ángel'];
const POWER_COOLDOWN=90000,PHANTOM_DURATION=15000,COPIER_DURATION=30000;
const SPIRIT_EMOJIS=['👻','📚','🔔','👀','🚪','❗','🧭','🕯️','🔑','💀','🤫','⚡'];
const randomInt=n=>crypto.getRandomValues(new Uint32Array(1))[0]%n;
export function shuffle(items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
export function roomCode(){return Array.from({length:6},()=> 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[randomInt(32)]).join('');}
export function profile(raw={}) {
  assert(raw&&typeof raw==='object'&&!Array.isArray(raw),'Identidad no válida.');
  const name=String(raw.name||'').normalize('NFKC').replace(/[\u0000-\u001f\u007f<>\u202a-\u202e\u2066-\u2069]/g,'').trim().slice(0,18);
  assert(name.length>=2,'Escribe un nombre de entre 2 y 18 caracteres.');
  const option=(v,n)=>Number.isInteger(v)&&v>=0&&v<n?v:0;
  return {name,color:option(raw.color,COLORS.length),hat:option(raw.hat,HATS.length),skin:option(raw.skin,SKINS.length),outfitColor:option(raw.outfitColor??raw.color,COLORS.length),trimColor:option(raw.trimColor??2,COLORS.length),pants:option(raw.pants,PANTS.length),glasses:option(raw.glasses,GLASSES.length),bag:option(raw.bag,BAGS.length),accessory:option(raw.accessory,ACCESSORIES.length),hairColor:option(raw.hairColor,HAIR_COLORS.length),skinTone:option(raw.skinTone,SKIN_TONES.length),shoes:option(raw.shoes,SHOES.length),shoeColor:option(raw.shoeColor??8,COLORS.length),badge:option(raw.badge,BADGES.length),pet:option(raw.pet,PETS.length),effect:option(raw.effect,EFFECTS.length),emote:option(raw.emote,EMOTES.length),nameBg:option(raw.nameBg,NAME_BGS.length),nameColor:option(raw.nameColor,NAME_COLORS.length)};
}
// El progreso del pase llega ya verificado por la API (firma del servidor). Lo
// que no se ha desbloqueado no se puede llevar puesto, lo pida quien lo pida.
function makePlayer(raw,room,now,progress=null){const {LOBBY}=worldFor(room);const verified=cleanProgress(progress);const p=lockAppearance(profile(raw),verified);let color=p.color;for(let i=0;i<COLORS.length;i++){if(!room.players.some(p=>!p.removed&&p.color===color))break;color=(color+1)%COLORS.length;}
  const n=room.players.length,a=n*2.4;return {...p,progress:verified,award:null,introProtocol:raw.introProtocol===1,color,floor:0,vent:null,ventSince:0,ventReady:0,transition:null,id:uid(),token:uid()+uid(),x:LOBBY.spawn.x+Math.cos(a)*80,y:LOBBY.spawn.y+Math.sin(a)*70,facing:1,alive:true,role:null,tasks:[],input:{x:0,y:0},moveAt:now,motionAt:now,motionAnchor:now,motionSpent:0,motionSeq:0,lastSeen:now,lastChat:0,emergencies:1,killReady:0,removed:false};}
export function createRoom(raw,now=Date.now(),visibility='public',progress=null){assert(['public','private'].includes(visibility),'Selecciona sala pública o privada.');const room={visibility,version:1,contentVersion:4,code:roomCode(),created:now,updated:now,phase:'lobby',host:null,config:{...DEFAULTS},players:[],bodies:[],chat:[],events:[],meeting:null,result:null,sabotage:null,sabotageReady:0,gameNumber:0,revealUntil:0,teachers:[],deathNotices:[],spiritMessages:[],spiritEmojis:[]};const p=makePlayer(raw,room,now,progress);room.players.push(p);room.host=p.id;event(room,'join',`${p.name} ha creado la sala.`,now);return {room,player:p};}
export function joinRoom(room,raw,now,progress=null){assert(room.contentVersion===4,'Esta sala pertenece a la versión anterior. Crea una sala nueva del colegio.',409);tick(room,now);assert(room.phase==='lobby','Esta partida ya ha comenzado. Espera a la siguiente.');assert(room.players.filter(p=>!p.removed).length<10,'La sala está llena (10 jugadores).');const pr=profile(raw);assert(!room.players.some(p=>!p.removed&&p.name.toLowerCase()===pr.name.toLowerCase()),'Ese nombre ya está en la sala. Usa otro.');const p=makePlayer(raw,room,now,progress);room.players.push(p);event(room,'join',`${p.name} ha entrado.`,now);return p;}
const active=room=>room.players.filter(p=>!p.removed);
const alive=room=>active(room).filter(p=>p.alive);
function markTeleport(p,now){p.motionEpoch=(p.motionEpoch||0)+1;p.moveAt=now;p.motionAt=now;}
const baseVision=(room,p)=>p.role==='impostor'?550:room.sabotage?.kind==='lights'?170:room.sabotage?.kind==='overload'?280:420;
// La linterna amplía la visión mientras está encendida (más aún con apagón).
const visionRange=(room,p)=>{const base=baseVision(room,p),f=itemVision(p);return f===1?base:Math.round(room.sabotage?.kind==='lights'&&p.role!=='impostor'?Math.max(base*2.1,360):base*f);};
export function event(room,type,text,now,extra={}){room.events.push({id:uid(),type,text,time:now,...extra});room.events=room.events.slice(-20);}
function stopPower(p,now){if(!p.abilityUntil)return;p.abilityUntil=0;p.copiedAppearance=null;p.abilityVisual={kind:p.specialRole==='phantom'?'phantom-out':'copy-out',at:now,until:now+600};}
function stopPlayers(room,now){for(const p of room.players){stopPower(p,now);if(p.vent)p.ventReady=Math.max(p.ventReady||0,now+VENT_COOLDOWN);p.input={x:0,y:0};p.moveAt=now;p.camera=null;p.puzzle=null;p.repair=null;p.vent=null;p.ventSince=0;p.transition=null;}}
const classSafe=p=>FLOORS[p.floor]?.rooms.some(r=>r.type==='classroom'&&p.x>=r.x*56&&p.x<(r.x+r.w)*56&&p.y>=r.y*56&&p.y<(r.y+r.h)*56);
function teacherStep(room,now){if(!worldFor(room).teachers){room.teachers=[];return;}if(room.phase!=='game'||now<room.revealUntil)return;const last=room.teacherAt||now,dt=Math.min(.35,Math.max(0,(now-last)/1000));room.teacherAt=now;if(!dt)return;
 for(const p of active(room))if(p.expelledUntil&&now>=p.expelledUntil){p.expelledUntil=0;event(room,'release',`${p.name} puede volver a salir.`,now);}
 for(const t of room.teachers||[]){const map=mapFor(t.floor,room.sabotage),candidates=active(room).filter(p=>p.alive&&!p.vent&&!p.expelledUntil&&!(p.specialRole==='phantom'&&p.abilityUntil>now)&&p.floor===t.floor&&!classSafe(p)&&distance(t,p)<=visionRange(room,p)+65&&visionLineOfSight(map,p,t));const target=candidates.sort((a,b)=>distance(t,a)-distance(t,b))[0];
  if(target){t.targetId=target.id;const dx=target.x-t.x,dy=target.y-t.y,len=Math.hypot(dx,dy);if(len<34&&lineOfSight(map,t,target)){target.expelledUntil=now+30000;target.floor=room.config.floors==='0'?0:1;target.x=(target.floor?64.5:40)*56;target.y=(target.floor?25.5:42)*56;target.input={x:0,y:0};markTeleport(target,now);target.motionAnchor=now;target.motionSpent=0;t.targetId=null;t.goal=null;event(room,'teacher',`${t.name} ha llevado a ${target.name} a Expulsados durante 30 s.`,now);continue;}
   const from=[Math.floor(t.x/56),Math.floor(t.y/56)],to=[Math.floor(target.x/56),Math.floor(target.y/56)],key=to.join(',');if(t.pathTarget!==key||!t.path?.length||now>(t.pathAt||0)+1500){const queue=[from],seen=new Set([from.join(',')]),prev=new Map();let end=null;for(let n=0;n<queue.length&&n<4000;n++){const [x,y]=queue[n],k=x+','+y;if(k===key){end=k;break;}for(const [ax,ay] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+ax,yy=y+ay,kk=xx+','+yy;if(!seen.has(kk)&&canStand(map,(xx+.5)*56,(yy+.5)*56)){seen.add(kk);prev.set(kk,k);queue.push([xx,yy]);}}}const path=[];for(let k=end;k&&k!==from.join(',');k=prev.get(k))path.unshift(k);t.path=path;t.pathTarget=key;t.pathAt=now;}
   if(t.path?.length){const [x,y]=t.path[0].split(',').map(Number);t.goal={x:(x+.5)*56,y:(y+.5)*56};if(distance(t,t.goal)<11)t.path.shift();}else t.goal={x:target.x,y:target.y};
  }else{t.targetId=null;t.path=null;if(!t.goal||distance(t,t.goal)<9){const x=Math.floor(t.x/56),y=Math.floor(t.y/56),next=shuffle([[1,0],[-1,0],[0,1],[0,-1]]).find(([a,b])=>canStand(map,(x+a+.5)*56,(y+b+.5)*56));if(next)t.goal={x:(x+next[0]+.5)*56,y:(y+next[1]+.5)*56};if(room.config.floors==='both'&&map.stairs.some(s=>insideStairs(t,s))&&randomInt(45)===0){t.floor=1-t.floor;t.x=FLOORS[t.floor].stairs[0].x;t.y=FLOORS[t.floor].stairs[0].y;t.goal=null;}}}
  if(t.goal){const dx=t.goal.x-t.x,dy=t.goal.y-t.y,n=Math.hypot(dx,dy);if(n>0)move(map,t,dx/n,dy/n,Math.min(dt,n/(target?SPEED*room.config.speed/2:SPEED*room.config.speed*.27))*(target?.5:.27),false,room.config.speed);}
 }
}
function spawn(room,map,now){const placed=[];active(room).forEach((p,i)=>{const a=i*Math.PI*2/Math.max(1,active(room).length);p.floor=map.floor??0;p.vent=null;p.ventSince=0;p.transition=null;p.spawnAt=room.phase==='game'?Math.max(now,room.revealUntil||0):now;let point={x:map.spawn.x+Math.cos(a)*80,y:map.spawn.y+Math.sin(a)*70};const free=q=>canStand(map,q.x,q.y,!p.alive)&&placed.every(v=>distance(q,v)>34);if(!free(point)){point=null;for(let r=0;r<=300&&!point;r+=25)for(let n=0;n<32;n++){const q={x:map.spawn.x+Math.cos(a+n*Math.PI/16)*r,y:map.spawn.y+Math.sin(a+n*Math.PI/16)*r};if(free(q)){point=q;break;}}}Object.assign(p,point||map.spawn);placed.push(point||map.spawn);markTeleport(p,now);p.motionAnchor=now;p.motionSpent=0;p.input={x:0,y:0};});}
function finish(room,winner,reason,now){if(room.phase==='ended')return;room.phase='ended';room.result={winner,reason,time:now};grantExperience(room,winner);room.pendingFinish=null;room.sabotage=null;room.meeting=null;stopPlayers(room,now);event(room,'end',reason,now);}
export function checkWin(room,now){if(!['game','meeting'].includes(room.phase))return;const living=alive(room);const impostors=living.filter(p=>p.role==='impostor').length,crew=living.length-impostors;let winner,reason;if(impostors===0){winner='crew';reason=`No quedan impostores en ${worldFor(room).name}.`;}else if(crew<=impostors){winner='impostor';reason=`Los impostores controlan ${worldFor(room).name}.`;}else{const tasks=active(room).filter(p=>p.role==='crew').flatMap(p=>p.tasks);if(tasks.length&&tasks.every(t=>t.done)){winner='crew';reason='La tripulación ha completado todas las tareas.';}}if(!winner||room.pendingFinish?.decisive)return;if(room.phase==='meeting'&&room.meeting?.stage==='result'){room.pendingFinish={winner,reason};return;}finish(room,winner,reason,now);}
// Experiencia de fin de partida, una vez por jugador humano. Votos: acierto si
// el votado era impostor (aunque no lo expulsaran), fallo si era tripulante,
// cero si saltó. El total se limita a medio nivel por partida.
function grantExperience(room,winner){for(const p of room.players){if(p.bot||p.removed||!p.progress||p.award)continue;const impostor=p.role==='impostor',roles=new Map(room.players.map(q=>[q.id,q.role]));let right=0,wrong=0;if(!impostor)for(const v of room.voteLog||[]){if(v.voter!==p.id||v.target==='skip')continue;if(roles.get(v.target)==='impostor')right++;else if(roles.has(v.target))wrong++;}
 const award=computeAward({won:(impostor?'impostor':'crew')===winner,impostor,tasks:impostor?0:p.tasks.filter(t=>t.done).length,votesRight:right,votesWrong:wrong,repairs:p.stats?.repairs||0,kills:p.stats?.kills||0});const before=p.progress.xp,after=Math.min(MAX_LEVEL*LEVEL_XP,before+award.total);p.award={...award,before,after};p.progress={...p.progress,xp:after};}}
function resolveVotes(room,now){const m=room.meeting;for(const q of alive(room))if(m.votes[q.id]===undefined)m.votes[q.id]=q.bot?botIntent(room,q,randomInt):'skip';
  // Historial de votos de toda la partida: un registro por votante y reunión,
  // escrito una sola vez al cerrar la votación. La experiencia se calcula con él
  // al final, con los roles reales; durante la partida no se muestra nada.
  room.voteLog??=[];if(!room.voteLog.some(v=>v.meeting===m.id))for(const [voter,target] of Object.entries(m.votes))room.voteLog.push({meeting:m.id,voter,target});const votes=Object.values(m.votes),counts={};for(const v of votes)counts[v]=(counts[v]||0)+1;const ordered=Object.entries(counts).sort((a,b)=>b[1]-a[1]);let expelled=null,reason='Nadie ha recibido votos.';
  if(m.delegateTarget){const delegate=room.players.find(p=>p.id===m.delegateTarget.by),target=room.players.find(p=>p.id===m.delegateTarget.target);const correct=target?.role==='impostor'&&target.alive;const out=correct?target:delegate;out.alive=false;out.puzzle=null;out.repair=null;expelled={id:out.id,...appearanceOf(out),role:room.config.confirmEject?out.role:null};reason=correct?`${target.name} era impostor. El voto decisivo dio la victoria a la tripulación.`:'El voto decisivo falló: se expulsa a quien lo emitió.';if(correct)room.pendingFinish={winner:'crew',reason:`Un voto decisivo descubrió al impostor ${target.name}.`,decisive:true};}
  else if(ordered.length){const [id,n]=ordered[0];if(ordered[1]?.[1]===n)reason='Empate. Nadie es expulsado.';else if(id==='skip')reason='Se ha saltado la votación.';else {const p=room.players.find(p=>p.id===id&&!p.removed&&p.alive);if(p){p.alive=false;p.puzzle=null;expelled={id:p.id,name:p.name,color:p.color,hat:p.hat,skin:p.skin,...appearanceOf(p),role:room.config.confirmEject?p.role:null};reason=`${p.name} ha sido expulsado.`;}else reason='El jugador votado ya no está en el colegio.';}}
  room.socialHistory??=[];room.socialHistory.push({meeting:m.id,expelled:expelled?.id||null,role:expelled?.role||null});m.result={counts,expelled,reason,anonymous:true,remainingImpostors:room.config.confirmEject?alive(room).filter(p=>p.role==='impostor').length:null};m.resolution=now>=m.voteEnd?'timeout':m.delegateTarget?'decisive':'all-voted';m.stage='result';m.resultAt=now;m.tallyUntil=now+3000;m.resultUntil=now+12500;event(room,'expel',reason,now);checkWin(room,now);
}
function electHost(room,now){if(!room.players.some(p=>p.id===room.host&&!p.bot&&!p.removed&&now-p.lastSeen<=RECONNECT_MS)){const online=active(room).filter(p=>!p.bot&&now-p.lastSeen<=RECONNECT_MS);if(online.length)room.host=online[0].id;}}
// Con bots, la simulación avanza en pasos fijos de 100 ms. Antes cada petición
// de cada jugador ejecutaba además un fotograma parcial hasta `now`: con cuatro
// personas sondeando a 10 Hz la IA de todos los bots corría 40–100 veces por
// segundo en lugar de 10, y las posiciones llegaban con marcas de tiempo
// irregulares (saltos de 5, 30, 90 ms) que la interpolación del cliente no
// podía suavizar. Ahora cada muestra de un bot está separada exactamente por
// 100 ms de tiempo de servidor y el resto (<100 ms) espera al siguiente paso.
export const BOT_STEP_MS=100;
const TASK_HOLD_MS=15000;
export function tick(room,now){if(room._botAdvancing)return;const hasBots=room.players.some(p=>p.bot&&!p.removed);if(!hasBots||room.phase==='ended'){tickFrame(room,now);room.simulatedAt=now;return;}room._botAdvancing=true;try{let at=room.simulatedAt??now-BOT_STEP_MS;if(at>now)at=now-BOT_STEP_MS;const gap=Math.max(0,now-at),quantum=gap>3000?500:BOT_STEP_MS;let steps=0;while(now-at>=quantum&&steps++<32&&room.phase!=='ended'){at+=quantum;tickFrame(room,at);}/* Retain the remaining simulation debt for the next wake-up. */room.simulatedAt=at;}finally{delete room._botAdvancing;}}
function tickFrame(room,now){const elapsed=Math.max(0,Math.min(1,(now-(room.botFrameAt??now))/1000));room.botFrameAt=now;room.updated=now;for(const p of room.players)if(p.bot)p.lastSeen=now;room.config={...DEFAULTS,...room.config,anonymousVotes:true};if(worldFor(room).FLOORS.length===1)room.config.floors='0';
  // Durante una expedición una pausa de conexión no decide la partida.
  // El token permite volver al mismo puesto; en el hangar se limpian plazas inactivas.
  if(room.phase==='lobby')for(const p of room.players){if(!p.removed&&now-p.lastSeen>GRACE_MS){p.removed=true;p.alive=false;p.puzzle=null;event(room,'disconnect',`${p.name} salió por desconexión.`,now);}}
  if(room.phase!=='lobby')for(const p of active(room))if(now-p.lastSeen>RECONNECT_MS){p.input={x:0,y:0};p.moveAt=now;p.repair=null;
    // Un corte breve de datos móviles (3,5 s) ya no borra la misión a medias: se
    // conserva 15 s para que al recuperar la conexión se pueda terminar.
    if(now-p.lastSeen>TASK_HOLD_MS)p.puzzle=null;}
  if(room.phase==='lobby')room.players=room.players.filter(p=>!p.removed);
  if(room.geometryVersion!==7){for(const p of active(room)){if(!p.alive||room.phase==='meeting'||room.phase==='ended')continue;const map=room.phase==='lobby'?worldFor(room).LOBBY:worldFor(room).FLOORS[p.floor||0];if(canStand(map,p.x,p.y))continue;let destination=null;for(let radius=8;radius<=(map.walkable?800:160)&&!destination;radius+=8)for(let i=0;i<32;i++){const x=p.x+Math.cos(i*Math.PI/16)*radius,y=p.y+Math.sin(i*Math.PI/16)*radius;if(canStand(map,x,y)){destination={x,y};break;}}Object.assign(p,destination||map.spawn);markTeleport(p,now);}room.geometryVersion=7;}
  electHost(room,now);
  for(const p of active(room))if(p.transition&&now>=p.transition.until)p.transition=null;
  for(const p of active(room)){if(p.abilityUntil&&now>=p.abilityUntil)stopPower(p,now);if(p.abilityVisual&&now>=p.abilityVisual.until)p.abilityVisual=null;}
  if(room.phase==='game')for(const p of active(room))if(p.vent&&now-(p.ventSince||now)>=VENT_LIMIT){p.vent=null;p.ventSince=0;p.ventReady=now+VENT_COOLDOWN;p.input={x:0,y:0};p.transition={kind:'vent-out',at:now,until:now+550};event(room,'vent-timeout',`${p.name} salió de la alcantarilla al agotarse el tiempo.`,now);}
  advanceIntro(room,now);
  teacherStep(room,now);
  stepWildlife(room,now,elapsed);
  stepItems(room,now);
  if(room.phase==='lobby')tableTick(room,now);else if(room.tables)closeTables(room);
  stepBots(room,now,elapsed,(bot,type,data,at)=>command(room,bot.token,type,data,at,true));
  if(['doors','vip'].includes(room.sabotage?.kind)&&now>=room.sabotage.until)room.sabotage.closed=[];
  if(room.phase==='game'&&room.sabotage&&now>=room.sabotage.started+SABOTAGE_DEADLINE){finish(room,'impostor','El sabotaje no se ha reparado en 90 segundos.',now);return;}
  if(room.sabotage?.kind==='emergency'){for(const [id,c] of Object.entries(room.sabotage.confirmations))if(now-c.time>8000){delete room.sabotage.confirmations[id];room.sabotage.fixed=room.sabotage.fixed.filter(v=>v!==id);}}
  if(room.phase==='meeting'&&room.meeting){const m=room.meeting;if(m.stage==='discussion'&&now>=m.discussionEnd)m.stage='voting';if(m.stage==='voting'&&(now>=m.voteEnd||alive(room).every(p=>m.votes[p.id]!==undefined)))resolveVotes(room,now);if(room.phase==='meeting'&&m.stage==='result'&&now>=m.resultUntil){if(room.pendingFinish)finish(room,room.pendingFinish.winner,room.pendingFinish.reason,now);else {room.phase='game';room.meeting=null;room.playStartAt=now;room.bodies=[];room.emergencyReady=now+30000;spawn(room,gameMap(room),now);for(const p of room.players)p.killReady=now+room.config.killCooldown*1000;}}}
  checkWin(room,now);
}
function requireGame(room,p,now,{living=true,vent=false,camera=false}={}){assert(room.phase==='game','Esta acción solo está disponible durante la partida.');assert(now>=room.revealUntil,'Espera a que termine la presentación del rol.');assert(!(p.expelledUntil>now),'Debes permanecer 30 segundos en Expulsados.');assert(!p.transition||now>=p.transition.until,'Espera a que termine el traslado.');if(!camera)assert(!p.camera,'Cierra las cámaras antes de realizar esta acción.');if(!vent)assert(!p.vent,'Sal del conducto antes de realizar esta acción.');if(living)assert(p.alive,'Los espectros no pueden realizar esta acción.');}
function near(room,p,target,range=USE_RANGE){const {mapFor}=worldFor(room);return target&&!target.vent&&(p.floor??0)===(target.floor??0)&&distance(p,target)<=range&&lineOfSight(mapFor(p.floor,room.sabotage),p,target);}
function nearEmergency(room,p){const {FLOORS,roomAt}=worldFor(room);const floor=gameFloor(room),place=floor===1?'Sala de profesores':worldFor(room).emergencyRoom;return p.floor===floor&&roomAt(p.x,p.y,floor)===place&&distance(p,FLOORS[floor].emergency)<=190;}
const MEETING_SLOTS=[[6,7.2],[7.5,7.2],[12.5,7.2],[14,7.2],[15.5,7.2],[6,8.35],[7.5,8.35],[9,8.35],[10.5,8.35],[12,8.35]];
function openMeeting(room,p,now,reason,body=null){room.phase='meeting';clearForMeeting(room);room.sabotage=null;room.sabotageReady=Math.max(room.sabotageReady,now+30000);stopPlayers(room,now);active(room).forEach((q,i)=>{q.expelledUntil=0;const [x,y]=MEETING_SLOTS[i];q.meetingPos={x:x*56,y:y*56,facing:1};markTeleport(q,now);q.motionAnchor=now;q.motionSpent=0;});room.meeting={id:uid(),caller:p.name,callerId:p.id,reason,body:body?.name||null,bodyAppearance:body?appearanceOf(body):null,introAt:now,introUntil:now+2400,stage:'discussion',discussionEnd:now+2400+room.config.discussion*1000,voteEnd:now+2400+(room.config.discussion+room.config.voting)*1000,votes:{},result:null};event(room,'meeting',reason==='body'?`${p.name} ha denunciado a ${body.name}.`:`${p.name} ha convocado una reunión.`,now);}
function blockedTask(room,kind){return room.sabotage?.kind==='electrical'&&['computer','wires','lights','code','dj','speaker','power','download','calibrate'].includes(kind)||room.sabotage?.kind==='computers'&&['computer','code','download','dj'].includes(kind)||room.sabotage?.kind==='overload'&&['dj','calibrate'].includes(kind)||room.sabotage?.kind==='audio'&&['speaker','bell'].includes(kind);}
function integrate(room,p,now){const {LOBBY,MEETING,mapFor}=worldFor(room);if(!['lobby','game','meeting'].includes(room.phase))return;const dt=Math.max(0,Math.min(.3,(now-p.moveAt)/1000));if(room.phase==='game'&&now<room.revealUntil)return;p.moveAt=now;if(p.puzzle||p.repair||p.camera||p.items?.watching||p.items?.chest||p.vent||p.transition?.until>now||room.phase==='meeting')return;move(room.phase==='meeting'?MEETING:room.phase==='lobby'?LOBBY:p.alive&&p.expelledUntil>now?detentionMap(mapFor(p.floor,room.sabotage)):motionMap(mapFor(p.floor,room.sabotage),p,now),room.phase==='meeting'?p.meetingPos:p,p.input.x,p.input.y,dt,room.phase!=='lobby'&&!p.alive,room.config.speed*itemSpeed(p,now));}
function applyMotion(room,p,packet,now){const {LOBBY,MEETING,mapFor}=worldFor(room);
  assert(packet&&typeof packet==='object'&&!Array.isArray(packet),'Movimiento no válido.');
  const {seq,segments,x,y}=packet;
  assert(Number.isSafeInteger(seq)&&seq>0,'Secuencia de movimiento no válida.');
  if(seq<=Number(p.motionSeq||0))return; // Una respuesta perdida puede provocar el reenvío del mismo lote.
  assert(seq===Number(p.motionSeq||0)+1,'Movimiento fuera de orden.');
  assert(Array.isArray(segments)&&segments.length<=120,'Demasiados tramos de movimiento.');
  assert(Number.isInteger(x)&&Math.abs(x)<=1&&Number.isInteger(y)&&Math.abs(y)<=1,'Dirección no válida.');
  // Inputs captured before a vent, meeting or forced relocation must never
  // move the character at its new destination. Still acknowledge their sequence.
  if(packet.epoch!==undefined&&packet.epoch!==(p.motionEpoch||0)){
    p.motionSeq=seq;p.motionAt=now;p.moveAt=now;p.motionClock=now;p.motionClockFor=now;p.input={x:0,y:0};return;
  }
  let elapsed=0;
  for(const step of segments){assert(step&&Number.isInteger(step.x)&&Math.abs(step.x)<=1&&Number.isInteger(step.y)&&Math.abs(step.y)<=1&&Number.isFinite(step.ms)&&step.ms>0&&step.ms<=3000,'Tramo de movimiento no válido.');elapsed+=step.ms;}
  // 14.2 · En datos móviles un paquete puede llegar tarde (pico de latencia) y el
  // siguiente a su hora: el hueco entre llegadas se encoge y un movimiento
  // legítimo se rechazaba («Movimiento demasiado rápido») → el cliente volvía
  // atrás de golpe. Ahora el tiempo de llegada que no se gastó se guarda como
  // crédito (cubeta con fuga, máx. 450 ms), así que solo cuentan las ráfagas
  // reales. El límite acumulado de abajo sigue impidiendo moverse más deprisa
  // que el tiempo real.
  const allowance=Math.max(0,now-(p.motionAt??p.moveAt))+150+Math.min(450,p.motionCredit||0);
  assert(elapsed<=3500&&elapsed<=allowance,'Movimiento demasiado rápido.');
  assert((p.motionSpent||0)+elapsed<=now-(p.motionAnchor??p.moveAt)+150,'Movimiento demasiado rápido.');
  if(['lobby','game','meeting'].includes(room.phase)&&!(room.phase==='game'&&now<room.revealUntil)&&!(room.phase==='meeting')&&!p.puzzle&&!p.repair&&!p.camera&&!p.items?.watching&&!p.items?.chest&&!p.vent&&!(p.transition?.until>now)){
    const map=room.phase==='meeting'?MEETING:room.phase==='lobby'?LOBBY:p.alive&&p.expelledUntil>now?detentionMap(mapFor(p.floor,room.sabotage)):motionMap(mapFor(p.floor,room.sabotage),p,now),ghost=room.phase!=='lobby'&&!p.alive;
    for(const step of segments)move(map,room.phase==='meeting'?p.meetingPos:p,step.x,step.y,step.ms/1000,ghost,room.config.speed*itemSpeed(p,now));
    p.input={x,y};
  }else p.input={x:0,y:0};
  // 14.2 · Marca de tiempo del movimiento. Antes era la hora de LLEGADA del
  // paquete: con la variación de la red, 100 ms de movimiento podían quedar
  // repartidos en 40 ms o en 250 ms y quienes miraban veían acelerones,
  // frenazos y vibraciones (los bots, con marcas exactas cada 100 ms, se veían
  // suaves). Ahora el reloj del movimiento avanza lo que el cliente dice haber
  // andado, sin adelantar nunca a la hora real ni quedarse más de 450 ms atrás.
  const reported=p.motionClockFor===p.moveAt&&Number.isFinite(p.motionClock)?p.motionClock:(p.moveAt??now);
  const source=Number.isFinite(packet.time)?Math.max(now-3000,Math.min(now,packet.time)):elapsed>0?Math.min(now,Math.max(reported+elapsed,now-450)):now;
  p.motionClock=Math.max(p.motionClock||0,source);
  p.motionCredit=Math.min(450,Math.max(0,allowance-elapsed));
  p.motionSeq=seq;p.motionAt=now;p.motionSpent=(p.motionSpent||0)+elapsed;p.moveAt=now;p.motionClockFor=now;
}
// High-frequency input does not build a full snapshot or rerun every bot.
// Simulation and state transmission are driven by independent server clocks.
export function realtimeMotion(room,token,packet,now=Date.now()){
  const p=room.players.find(p=>p.token===token&&!p.removed);assert(p,'Tu sesión ha caducado.',401);
  if(!p.inputRateAt||now-p.inputRateAt>=1000){p.inputRateAt=now;p.inputRate=0;}
  assert(++p.inputRate<=60,'Demasiados movimientos.',429);
  applyMotion(room,p,packet,now);p.lastSeen=now;
  return p.motionSeq;
}
export function command(room,token,type,data={},now=Date.now(),internal=false){const {LOBBY,MEETING,FLOORS,STATIONS,REPAIRS,VENTS,DOORS,SABOTAGES,mapFor,taskStation}=worldFor(room);
  assert(typeof token==='string','Sesión no válida.',401);const p=room.players.find(p=>p.token===token&&!p.removed);assert(p,'Tu sesión ha caducado. Vuelve a entrar en la sala.',401);
  // En el hangar la plaza inactiva caduca; durante la partida se conserva.
  assert(room.contentVersion===4,'Esta sala pertenece a la versión anterior. Crea una sala nueva del colegio.',409);if(!internal)tick(room,now);assert(!p.removed,'Has perdido la conexión durante más de 30 segundos.',401);
  p.lastSeen=now;electHost(room,now);assert(!p.rateAt||now-p.rateAt>500||p.rateCount<18,'Demasiadas acciones. Espera un momento.',429);if(!p.rateAt||now-p.rateAt>500){p.rateAt=now;p.rateCount=0;}p.rateCount++;
  if(!internal&&data._motion!==undefined)applyMotion(room,p,data._motion,now);else if(!internal)integrate(room,p,now);let extra={};
  if(type==='pulse'){if(data._motion===undefined){const x=Number(data.x)||0,y=Number(data.y)||0;p.input=room.phase==='meeting'?{x:0,y:0}:{x:Math.max(-1,Math.min(1,x)),y:Math.max(-1,Math.min(1,y))};}}
  else if(type==='profile'){assert(room.phase==='lobby','Cambia tu aspecto antes de empezar.');const pr=profile(data);assert(!active(room).some(q=>q.id!==p.id&&q.name.toLowerCase()===pr.name.toLowerCase()),'Ese nombre ya está en la sala.');assert(!active(room).some(q=>q.id!==p.id&&q.color===pr.color),'Ese color ya está ocupado.');Object.assign(p,lockAppearance(pr,p.progress));}
  else if(['addBot','removeBot','fillBots'].includes(type)){assert(room.phase==='lobby','Gestiona los bots antes de iniciar.');assert(p.id===room.host,'Solo el líder puede gestionar bots.',403);if(type==='removeBot'){const bot=active(room).find(q=>q.bot&&(!data.id||q.id===data.id));assert(bot,'No hay un bot para retirar.');room.players=room.players.filter(q=>q.id!==bot.id);}else{const amount=type==='fillBots'?10-active(room).length:1;assert(active(room).length<10,'La sala está llena.');const names=['Luna','Nico','Vega','Leo','Noa','Dani','Alex','Cris','Mara','Hugo','Teo','Gael'];for(let i=0;i<amount;i++){const used=new Set(active(room).map(q=>q.name.toLocaleLowerCase())),name=shuffle(names).find(n=>!used.has(n.toLocaleLowerCase()))||'Bot '+(i+1),bot=makePlayer({name,color:randomInt(COLORS.length),hat:randomInt(HATS.length),skin:randomInt(SKINS.length),accessory:randomInt(ACCESSORIES.length),glasses:randomInt(GLASSES.length),trimColor:randomInt(COLORS.length)},room,now);bot.bot=true;bot.brain={suspicions:{},seenBodies:[],path:[]};room.players.push(bot);}}room.simulatedAt=now;event(room,'bots','El líder ha actualizado los bots de la caravana.',now);}
  else if(type==='lobbyUse'){assert(room.phase==='lobby','Solo en la caravana.');const o=LOBBY_OBJECTS.find(o=>o.id===data.id);assert(o&&distance(p,o)<=o.range+12,'Acércate al armario o al ordenador.');p.lobbyInteraction={kind:o.id,at:now,until:now+1700};}
  else if(['tableJoin','tableLeave','tableInput','tableAgain'].includes(type)){assert(room.phase==='lobby','Las mesas solo se usan en la caravana.');tableCommand(room,p,type,data,now,g=>{const o=LOBBY_OBJECTS.find(o=>o.id==='table-'+g);return !!o&&distance(p,o)<=o.range+48;});}
  else if(type==='configure'){assert(p.id===room.host,'Solo el líder puede configurar la partida.',403);assert(room.phase==='lobby','La partida ya está en marcha.');if(data.map!==undefined){assert(Object.hasOwn(WORLDS,data.map),'Mapa no válido.');if(room.config.map!==data.map){room.config.map=data.map;room.config.floors=WORLDS[data.map].FLOORS.length===1?'0':'both';event(room,'map',`El líder ha elegido ${worldFor(room).name}.`,now);}}if(worldFor(room).FLOORS.length===1&&data.floors!==undefined)assert(data.floors==='0',`${worldFor(room).name} tiene una sola planta.`);if(data.botUrgency!==undefined){assert([.5,1,1.5].includes(data.botUrgency),'Presión social no válida.');room.config.botUrgency=data.botUrgency;}const ranges={impostors:[1,2],tasks:[2,10],killCooldown:[5,90],discussion:[5,60],voting:[15,90]};for(const [k,[min,max]] of Object.entries(ranges)){if(data[k]!==undefined){assert(Number.isInteger(data[k])&&data[k]>=min&&data[k]<=max,`Valor no válido: ${k}.`);room.config[k]=data[k];}}if(data.speed!==undefined){assert([1,1.25,1.5,2].includes(data.speed),'Velocidad no válida.');room.config.speed=data.speed;}if(data.floors!==undefined){assert(['both','0','1'].includes(data.floors),'Selección de plantas no válida.');room.config.floors=data.floors;}if(typeof data.confirmEject==='boolean')room.config.confirmEject=data.confirmEject;if(data.anonymousVotes!==undefined)assert(data.anonymousVotes===true,'Los votos son siempre anónimos.');}
  else if(type==='start'){assert(p.id===room.host,'Solo el líder puede iniciar la partida.',403);assert(room.phase==='lobby','La partida ya ha empezado.');const playing=active(room);assert(playing.length>=room.config.impostors*3+1,`Hacen falta ${room.config.impostors*3+1} jugadores para ${room.config.impostors} impostor(es).`);assert(playing.every(q=>now-q.lastSeen<=RECONNECT_MS),'Espera a que todos los jugadores estén conectados.');const eligible=STATIONS.filter(s=>allowedFloor(room,s.floor)&&(!s.delivery||allowedFloor(room,s.delivery.floor)));assert(eligible.length>=room.config.tasks,'Hay menos tareas disponibles en esa planta. Reduce la cantidad de tareas.');closeTables(room);const common=worldFor(room).id==='gym'?shuffle(eligible.filter(s=>s.length==='common'))[0]:null;const chosen=new Set(shuffle(playing).slice(0,room.config.impostors).map(q=>q.id));room.socialHistory=[];room.phase='game';room.gameNumber++;room.journeyStart=now;room.travelUntil=now+5500;room.roleRevealAt=now+7000;room.revealUntil=now+13000;room.intro=null;if(playing.some(q=>q.introProtocol))beginIntro(room,now);room.emergencyReady=room.revealUntil+30000;room.bodies=[];room.deathNotices=[];room.spiritMessages=[];room.spiritEmojis=shuffle(SPIRIT_EMOJIS).slice(0,4);room.meeting=null;room.result=null;room.voteLog=[];room.chat=[];room.chests=null;room.sabotage=null;room.sabotageReady=now+SABOTAGE_START_COOLDOWN;for(const q of playing){q.brain=q.bot?{suspicions:{},seenBodies:[],path:[]}:undefined;q.stats={kills:0,tasks:0,reports:0,repairs:0};q.award=null;q.alive=true;q.deathAt=0;q.role=chosen.has(q.id)?'impostor':'crew';q.specialRole=null;q.abilityReady=0;q.abilityUntil=0;q.abilityVisual=null;q.copiedAppearance=null;q.delegateUsed=false;q.expelledUntil=0;q.spiritReady=0;q.ventReady=0;q.ventSince=0;q.tasks=(common?[common,...shuffle(eligible.filter(s=>s.id!==common.id)).slice(0,room.config.tasks-1)]:shuffle(eligible).slice(0,room.config.tasks)).map(s=>({id:s.id,done:false}));q.emergencies=1;q.killReady=room.revealUntil+room.config.killCooldown*1000;q.puzzle=null;q.repair=null;}const impostorRoles=shuffle(['phantom','copier',null]);for(const [i,q] of shuffle(playing.filter(q=>q.role==='impostor')).entries())q.specialRole=impostorRoles[i]??null;const available=shuffle(SPECIAL_ROLES);for(const q of shuffle(playing.filter(q=>q.role==='crew'))){if(available.length&&randomInt(100)<75)q.specialRole=available.pop();}spawn(room,gameMap(room),now);const teachers=worldFor(room).teachers?shuffle(TEACHER_NAMES).slice(0,2):[];room.teachers=teachers.map((name,i)=>{const floor=room.config.floors==='both'?i:gameFloor(room);return {id:uid(),name,floor,x:(floor?(i?62:8):(i?20:56.5))*56,y:(floor?15.5:25.5)*56,facing:1};});room.teacherAt=now;room.wildlife=createWildlife(room,now);setupItems(room,now);event(room,'start',`Ha comenzado la partida en ${worldFor(room).name}.`,now);}
  else if(type==='introReady'){assert(room.phase==='game'&&room.intro,'No hay presentación activa.');const intro=room.intro;if(data.stage==='arrival'){assert(now>=intro.travelEnd||data.skip===true,'El viaje aún no ha terminado.');p.arrivalReady=true;if(now<intro.travelEnd)p.skippedTravel=true;}else if(data.stage==='role'){assert(['reveal','reading','playing'].includes(intro.stage)&&now>=room.roleRevealAt,'La identidad aún no es visible.');if(!p.roleShownAt)p.roleShownAt=now;}else assert(false,'Fase no válida.');advanceIntro(room,now);}
  else if(type==='ability'){
    requireGame(room,p,now);assert(p.role==='impostor'&&['phantom','copier'].includes(p.specialRole),'No tienes una habilidad de impostor.',403);
    assert(!p.abilityUntil&&now>=(p.abilityReady||0),'La habilidad sigue activa o recargándose.');
    let target=null;if(p.specialRole==='copier'){target=alive(room).find(q=>q.id===data.target&&q.id!==p.id);assert(target,'Elige a otro jugador vivo para copiarlo.');}
    p.abilityUntil=now+(p.specialRole==='phantom'?PHANTOM_DURATION:COPIER_DURATION);p.abilityReady=now+POWER_COOLDOWN;
    p.copiedAppearance=target?appearanceOf(target):null;
    p.abilityVisual={kind:p.specialRole==='phantom'?'phantom-in':'copy-in',at:now,until:now+600};
  }
  else if(type==='cancelAbility'){
    requireGame(room,p,now);assert(p.role==='impostor'&&p.abilityUntil>now,'No tienes una habilidad activa.',403);stopPower(p,now);
  }
  else if(type==='kill'&&findDecoy(room,data.target)){requireGame(room,p,now);assert(p.role==='impostor','Solo los impostores pueden matar.',403);assert(now>=p.killReady,'El arma todavía se está recargando.');const decoy=findDecoy(room,data.target),owner=room.players.find(q=>q.id===decoy.owner);assert(owner?.role!=='impostor','Objetivo no válido.');assert(decoy.floor===p.floor&&distance(p,decoy)<=KILL_RANGE&&lineOfSight(mapFor(p.floor,room.sabotage),p,decoy),'El objetivo está fuera de alcance o detrás de una pared.');stopPower(p,now);killDecoy(room,p,decoy,now);}
  else if(type==='kill'){requireGame(room,p,now);assert(p.role==='impostor','Solo los impostores pueden matar.',403);assert(now>=p.killReady,'El arma todavía se está recargando.');const victim=room.players.find(q=>q.id===data.target&&!q.removed&&q.alive);assert(victim&&victim.role==='crew','Objetivo no válido.');assert(near(room,p,victim,KILL_RANGE),'El objetivo está fuera de alcance o detrás de una pared.');stopPower(p,now);if(shieldBlocks(room,p,victim,now)){extra.blocked=true;}else{const origin={x:p.x,y:p.y},impact={x:victim.x,y:victim.y};stopPower(victim,now);p.stats??={};p.stats.kills=(p.stats.kills||0)+1;victim.alive=false;victim.expelledUntil=0;victim.puzzle=null;victim.repair=null;room.bodies.push({id:uid(),victim:victim.id,...appearanceOf(victim),floor:victim.floor,x:victim.x,y:victim.y,at:now});victim.deathAt=now;room.deathNotices.push({id:uid(),name:victim.name,floor:victim.floor,time:now});p.killReady=now+room.config.killCooldown*1000;p.input={x:0,y:0};p.transition={kind:'attack',at:now,until:now+850};room.actionFx={id:uid(),kind:'kill',variant:randomInt(4),actor:p.id,target:victim.id,floor:p.floor,...origin,victimX:impact.x,victimY:impact.y,at:now,sceneUntil:now+1100,until:now+2200,attacker:appearanceOf(p),victim:appearanceOf(victim)};event(room,'death',worldFor(room).id==='club'?'Un miembro del personal ha perdido la señal.':'Un alumno ha perdido la señal.',now,{victim:victim.id});checkWin(room,now);}}
  else if(type==='report'){requireGame(room,p,now);const body=room.bodies.find(b=>b.id===data.body);assert(body&&near(room,p,body,REPORT_RANGE),'No hay un cadáver visible a tu alcance.');if(body.decoy){reportDecoy(room,p,body,now);extra.decoy=true;}else{p.stats??={};p.stats.reports=(p.stats.reports||0)+1;openMeeting(room,p,now,'body',body);}}
  else if(type==='emergency'){requireGame(room,p,now);assert(now>=(room.emergencyReady||0),`El botón se recarga durante ${Math.ceil(((room.emergencyReady||0)-now)/1000)} s más.`);assert(!room.sabotage,'Resuelve el sabotaje antes de convocar una reunión.');assert(p.emergencies>0,'Ya has usado tu reunión de emergencia.');assert(nearEmergency(room,p),`Acércate a la mesa del botón en ${worldFor(room).id==='club'?'el escenario principal':gameFloor(room)?'Profesores (planta 1)':'Recepción (planta 0)'}.`);p.emergencies--;openMeeting(room,p,now,'emergency');}
  else if(type==='vote'){if(p.bot){assert(botsMayVote(room,now),'Espera los votos humanos o los últimos diez segundos.');assert(p.role!=='crew'||!criticalVote(room)||data.target!=='skip','En situación crítica debes votar a una persona.');}assert(room.phase==='meeting'&&room.meeting.stage==='voting','Espera a que empiece el tiempo de votación.');assert(p.alive,'Los espectros no votan.');assert(room.meeting.votes[p.id]===undefined,'Ya has votado.');assert(data.target==='skip'||alive(room).some(q=>q.id===data.target),'Ese jugador no está disponible para votar.');room.meeting.votes[p.id]=data.target;if(!internal)tick(room,now);}
  else if(type==='delegateVote'){assert(room.phase==='meeting'&&room.meeting.stage==='voting','Espera a la votación.');assert(p.role==='crew'&&p.specialRole==='delegate'&&p.alive,'Solo el delegado vivo puede usar este voto.',403);assert(!p.delegateUsed,'Ya has usado tu voto decisivo.');assert(room.meeting.votes[p.id]===undefined,'Ya has votado en esta reunión.');const target=alive(room).find(q=>q.id===data.target&&q.id!==p.id);assert(target,'Elige a otro jugador vivo.');p.delegateUsed=true;room.meeting.votes[p.id]=target.id;room.meeting.delegateTarget={by:p.id,target:target.id};resolveVotes(room,now);}
  else if(type==='chat'){assert(room.phase==='lobby'||room.phase==='meeting'||(!p.alive&&room.phase==='game'),'El chat está disponible en la sala de espera y en las reuniones.');assert(now-p.lastChat>=900,'Espera un segundo antes de enviar otro mensaje.');let structured=null;if(data.quick!==undefined){assert(room.phase==='meeting'&&room.meeting.stage!=='result','Usa las frases durante el debate o la votación.');try{structured=structuredMessage(room,p,data.quick);}catch(e){throw new GameError(e.message);}}if(structured&&!p.bot&&p.alive)room.meeting.lastClaimAt=now;const text=String((p.bot&&structured&&data.text)||structured?.text||data.text||'').replace(/[\u0000-\u001f\u007f\u202a-\u202e]/g,'').trim().slice(0,180);assert(text,'Escribe un mensaje.');p.lastChat=now;room.chat.push({id:uid(),name:p.name,playerId:p.id,color:p.color,appearance:appearanceOf(p),text,...(structured?{intent:{...structured.intent,sender:p.id,at:now},meetingId:room.meeting.id}:{}),ghost:room.phase!=='lobby'&&!p.alive,time:now});room.chat=room.chat.slice(-60);}
  else if(type==='spirit'){assert(['game','meeting'].includes(room.phase)&&!p.alive,'Solo los espectros pueden enviar señales.',403);assert(now>=(p.spiritReady||0),'Espera 15 segundos para mandar otra señal.');const believer=alive(room).find(q=>q.specialRole==='believer');assert(believer,'No hay ningún creyente vivo en esta partida.');assert(room.spiritEmojis.includes(data.emoji),'Elige uno de tus cuatro emojis.');p.spiritReady=now+15000;room.spiritMessages.push({id:uid(),from:p.name,emoji:data.emoji,time:now,to:believer.id});room.spiritMessages=room.spiritMessages.slice(-20);}
  else if(type==='stairs'){
    requireGame(room,p,now,{living:false});assert(room.config.floors==='both','Las escaleras solo funcionan en partidas de dos plantas.');const stair=FLOORS[p.floor??0].stairs.find(s=>s.id===data.id);
    assert(insideStairs(p,stair),'Entra en las escaleras para cambiar de planta.');const target=FLOORS[1-(p.floor??0)].stairs.find(s=>s.id===stair.id);
    assert(target&&canStand(mapFor(target.floor,room.sabotage),target.x,target.y,!p.alive),'Las escaleras de destino no están disponibles.');
    p.floor=target.floor;p.x=target.x;p.y=target.y;p.input={x:0,y:0};p.transition={kind:'stairs',at:now,until:now+600};markTeleport(p,now);p.motionAnchor=now;p.motionSpent=0;
  }
  else if(type==='enterVent'){
    requireGame(room,p,now);assert(p.role==='impostor'||p.specialRole==='engineer','Solo el impostor o el ingeniero pueden usar las alcantarillas.',403);assert(now>=(p.ventReady||0),'Espera a que termine la recarga de 20 segundos de la alcantarilla.');
    const v=VENTS.find(v=>v.id===data.id);assert(v&&allowedFloor(room,v.floor)&&v.links.some(id=>VENTS.some(q=>q.id===id&&allowedFloor(room,q.floor))),'No hay rutas de alcantarilla en la planta elegida.');assert(near(room,p,v,75),'Acércate a una alcantarilla.');p.vent=v.id;p.ventSince=now;p.x=v.x;p.y=v.y;p.input={x:0,y:0};p.transition={kind:'vent-in',at:now,until:now+500};
  }
  else if(type==='travelVent'){
    requireGame(room,p,now,{vent:true});assert((p.role==='impostor'||p.specialRole==='engineer')&&p.vent,'No estás dentro de un conducto.',403);assert(now-p.ventSince<VENT_LIMIT,'Se ha agotado el tiempo dentro de la alcantarilla.');
    const from=VENTS.find(v=>v.id===p.vent),to=VENTS.find(v=>v.id===data.id);
    assert(to&&allowedFloor(room,to.floor)&&from.links.includes(to.id),'Ese conducto no está conectado en la planta elegida.');assert(canStand(mapFor(to.floor,room.sabotage),to.x,to.y),'El destino está bloqueado.');
    p.vent=to.id;p.floor=to.floor;p.x=to.x;p.y=to.y;p.transition={kind:'vent-travel',at:now,until:now+450};markTeleport(p,now);p.motionAnchor=now;p.motionSpent=0;
  }
  else if(type==='exitVent'){
    requireGame(room,p,now,{vent:true});assert((p.role==='impostor'||p.specialRole==='engineer')&&p.vent,'No estás dentro de un conducto.',403);
    assert(canStand(mapFor(p.floor,room.sabotage),p.x,p.y),'La salida está bloqueada.');p.vent=null;p.ventSince=0;p.ventReady=now+VENT_COOLDOWN;p.transition={kind:'vent-out',at:now,until:now+550};p.killReady=Math.max(p.killReady,now+2000);p.input={x:0,y:0};
  }
  else if(type==='beginTask'){
    requireGame(room,p,now,{living:false});assert(p.role==='crew','Los impostores tienen tareas de cobertura. No suman progreso.',403);
    const t=p.tasks.find(t=>t.id===data.id&&!t.done),station=t&&taskStation(t);assert(station,'Esta tarea no está pendiente.');assert(near(room,p,station),'Acércate a la tarea en la planta indicada.');
    assert(!blockedTask(room,station.kind),'Esta tarea está bloqueada por el sabotaje. Repara primero los paneles.');
    p.input={x:0,y:0};p.puzzle={id:uid(),stationId:station.id,kind:station.kind,challenge:challenge(station.kind,worldFor(room).id),start:now};
    extra.task={...p.puzzle,label:station.label,theme:worldFor(room).id,minDuration:minDuration[station.kind]};
  }
  else if(type==='finishTask'){
    requireGame(room,p,now,{living:false});assert(p.role==='crew'&&p.puzzle,'No tienes una tarea activa.');const puzzle=p.puzzle,t=p.tasks.find(t=>t.id===puzzle.stationId);
    assert(data.id===puzzle.id,'La tarea ya no está activa.');assert(now-puzzle.start<=120000,'La tarea ha caducado. Ábrela otra vez.');assert(now-puzzle.start>=minDuration[puzzle.kind],'Completa la tarea con calma.');
    assert(near(room,p,taskStation(t)),'Te has alejado de la tarea.');assert(!blockedTask(room,puzzle.kind),'La tarea está bloqueada por el sabotaje.');assert(solution(puzzle.kind,puzzle.challenge,data.solution),'La solución no es correcta. Inténtalo otra vez.');
    if(puzzle.kind==='documents'){t.stage=1;extra.carrying=true;}else t.done=true;p.puzzle=null;event(room,'task',`${p.name} completó una tarea.`,now);checkWin(room,now);
  }
  else if(type==='cancel'){p.puzzle=null;p.repair=null;if(p.items)p.items.chest=null;p.input={x:0,y:0};}
  else if(type==='sabotage'){
    requireGame(room,p,now);assert(p.role==='impostor','Solo los impostores pueden sabotear.',403);assert(!room.sabotage&&now>=room.sabotageReady,'El sabotaje todavía no está disponible.');
    const kind=data.kind||'electrical';assert(Object.hasOwn(SABOTAGES,kind),'Sabotaje no válido.');
    room.sabotage={kind,id:uid(),fixed:[],confirmations:{},started:now,deadline:now+SABOTAGE_DEADLINE};room.sabotageReady=now+SABOTAGE_COOLDOWN;
    if(['doors','vip'].includes(kind)){room.sabotage.until=now+18000;room.sabotage.closed=DOORS.filter(d=>(kind!=='vip'||d.room==='vip')&&allowedFloor(room,d.floor)&&!d.room.startsWith('stairs')&&![...active(room),...room.bodies].some(q=>q.floor===d.floor&&q.x>d.x*56-35&&q.x<(d.x+d.w)*56+35&&q.y>d.y*56-35&&q.y<(d.y+d.h)*56+35)).filter((_,i)=>i%3===0).map(d=>d.id);room.sabotage.doorIds=[...room.sabotage.closed];}
    event(room,'sabotage',`¡${SABOTAGES[kind].label}! Reparad ${repairPanels(room).map(r=>r.label).join(' y ')} antes de 90 segundos.`,now);
  }
  else if(type==='beginRepair'){
    requireGame(room,p,now);assert(room.sabotage,'No hay un sabotaje activo.');const s=repairPanels(room).find(s=>s.id===data.id);assert(near(room,p,s),'Acércate al panel en la planta indicada.');assert(!room.sabotage.fixed.includes(s.id),'Este panel ya está reparado.');
    const kind=SABOTAGES[room.sabotage.kind].repairKind;
    p.repair={id:s.id,sabotageId:room.sabotage.id,kind,challenge:challenge(kind,worldFor(room).id),start:now};p.puzzle=null;p.input={x:0,y:0};extra.repair={...p.repair,label:s.label,theme:worldFor(room).id,minDuration:minDuration[kind]};
  }
  else if(type==='finishRepair'){
    requireGame(room,p,now);assert(room.sabotage&&p.repair,'No hay una reparación activa.');const repair=p.repair;
    assert(repair.id===data.id&&repair.sabotageId===room.sabotage.id,'Esta reparación ya no está activa.');assert(now-repair.start>=minDuration[repair.kind],'Completa la reparación con calma.');assert(now-repair.start<=120000,'La reparación ha caducado.');
    assert(near(room,p,repairPanels(room).find(s=>s.id===data.id)),'Te has alejado del panel.');assert(solution(repair.kind,repair.challenge,data.solution),'La reparación no es correcta.');
    if(!room.sabotage.fixed.includes(data.id)){room.sabotage.fixed.push(data.id);p.stats??={};p.stats.repairs=(p.stats.repairs||0)+1;}room.sabotage.confirmations[data.id]={by:p.id,time:now};p.repair=null;
    const confirmations=Object.values(room.sabotage.confirmations);
    const required=repairPanels(room).length,cooperative=room.sabotage.kind==='emergency'&&required>1;
    if(room.sabotage.fixed.length===required&&(!cooperative||new Set(confirmations.map(c=>c.by)).size===2&&Math.max(...confirmations.map(c=>c.time))-Math.min(...confirmations.map(c=>c.time))<=8000)){
      room.sabotage=null;for(const q of room.players)q.repair=null;event(room,'repair',`${worldFor(room).name} vuelve a funcionar correctamente.`,now);
    }else if(cooperative&&confirmations.length===2){room.sabotage.fixed=[];room.sabotage.confirmations={};extra.retryCoop=true;}
  }
  else if(type==='camera'){
    requireGame(room,p,now,{camera:true});const w=worldFor(room),feed=w.CAMERAS.find(c=>c.id===data.id)||(!data.id||data.id==='all'?w.CAMERAS[0]:null);assert(w.CAMERA_CONSOLE&&feed,'Cámara no disponible.');assert(near(room,p,w.CAMERA_CONSOLE,150),'Acércate a la consola de Seguridad.');assert(!room.sabotage||!['electrical','computers'].includes(room.sabotage.kind),'Las cámaras no tienen señal durante este sabotaje.');p.camera=feed.id;p.input={x:0,y:0};
  }
  else if(type==='exitCamera'){p.camera=null;p.input={x:0,y:0};}
  else if(ITEM_COMMANDS.has(type))itemCommand(room,p,type,data,now,extra);
  else if(type==='return'){assert(room.phase==='ended','La partida todavía no ha terminado.');assert(p.id===room.host,'El líder devolverá a todos a la sala de espera.',403);room.phase='lobby';room.chests=null;room.decoys=[];room.groundItems=[];room.portableCameras=[];room.intro=null;room.revealUntil=0;room.travelUntil=0;room.roleRevealAt=0;room.players=active(room);room.bodies=[];room.chat=[];room.result=null;room.pendingFinish=null;room.meeting=null;room.teachers=[];room.deathNotices=[];room.spiritMessages=[];for(const q of room.players){q.role=null;q.specialRole=null;q.abilityReady=0;q.abilityUntil=0;q.abilityVisual=null;q.copiedAppearance=null;q.expelledUntil=0;q.alive=true;q.tasks=[];q.puzzle=null;q.repair=null;}spawn(room,LOBBY,now);}
  else if(type==='leave'){p.removed=true;p.alive=false;p.puzzle=null;if(room.phase==='lobby')room.players=room.players.filter(q=>q!==p);if(room.host===p.id)room.host=active(room).find(q=>!q.bot)?.id||null;event(room,'leave',`${p.name} ha salido.`,now);checkWin(room,now);return {left:true};}
  else throw new GameError('Acción desconocida.');
  return internal?extra:{...extra,state:snapshot(room,p,now)};
}
// Las posiciones de personas viajan exactas: el cliente predice su propio
// movimiento sobre esa misma cifra y el motor lo comprueba al píxel, así que
// aquí no se redondea. La fauna sí (ver game/wildlife.js): nadie predice a un pato.
export function snapshot(room,p,now){const {mapFor,CAMERAS,CAMERA_CONSOLE}=worldFor(room);const identityReady=room.phase!=='game'||now>=(room.roleRevealAt||0);
  const roster=active(room).map(q=>({id:q.id,...appearanceOf(q),alive:q.alive,online:now-q.lastSeen<=RECONNECT_MS,isHost:q.id===room.host,bot:!!q.bot,hasVoted:!!room.meeting&&room.meeting.votes[q.id]!==undefined,...(room.phase==='ended'?{role:q.role,specialRole:q.specialRole||null,stats:{tasks:q.tasks.filter(t=>t.done).length,kills:q.stats?.kills||0,reports:q.stats?.reports||0}}:identityReady&&p.role==='impostor'&&q.role==='impostor'?{role:q.role}:{})}));
  const vision=identityReady?visionRange(room,p):420,map=mapFor(p.floor,room.sabotage);
  // Con diez participantes como máximo, se envía la planta completa. La
  // visibilidad usa la posición renderizada del cliente, sin un segundo
  // radio/sala sobre coordenadas retrasadas. Roles y acciones siguen privados.
  const visible=q=>room.phase==='meeting'||q.floor===p.floor&&(q.id===p.id||!q.vent||q.transition?.kind==='vent-in')&&(q.id===p.id||q.specialRole!=='phantom'||!(q.abilityUntil>now)||q.abilityVisual?.kind==='phantom-in'&&now-q.abilityVisual.at<600);
  const tasks=active(room).filter(q=>q.role==='crew').flatMap(q=>q.tasks);
  const self={id:p.id,...appearanceOf(p),floor:room.phase==='meeting'?0:p.floor??0,x:room.phase==='meeting'?p.meetingPos.x:p.x,y:room.phase==='meeting'?p.meetingPos.y:p.y,facing:room.phase==='meeting'?p.meetingPos.facing:p.facing,alive:p.alive,role:identityReady?p.role:null,specialRole:identityReady?p.specialRole||null:null,delegateUsed:!!p.delegateUsed,tasks:p.tasks,killReady:p.killReady,ventReady:p.ventReady||0,ventSince:p.ventSince||0,emergencies:p.emergencies,vision,motionSeq:p.motionSeq||0,motionEpoch:p.motionEpoch||0,vent:p.vent,transition:p.transition,expelledUntil:p.expelledUntil||0,spiritReady:p.spiritReady||0,abilityReady:p.abilityReady||0,abilityUntil:p.abilityUntil||0,abilityVisual:p.abilityVisual,progress:p.bot?null:p.progress||null,award:room.phase==='ended'?p.award||null:null,items:itemsSnapshot(room,p,now,vision)};
  const meeting=room.meeting?{id:room.meeting.id,caller:room.meeting.caller,callerId:room.meeting.callerId,introAt:room.meeting.introAt,introUntil:room.meeting.introUntil,bodyAppearance:room.meeting.bodyAppearance,reason:room.meeting.reason,body:room.meeting.body,stage:room.meeting.stage,discussionEnd:room.meeting.discussionEnd,voteEnd:room.meeting.voteEnd,resolution:room.meeting.resolution,result:room.meeting.result?{counts:Object.fromEntries(Object.entries(room.meeting.result.counts).sort(([a],[b])=>a.localeCompare(b))),expelled:room.meeting.result.expelled,reason:room.meeting.result.reason,anonymous:true,remainingImpostors:room.meeting.result.remainingImpostors}:null,resultUntil:room.meeting.resultUntil,resultAt:room.meeting.resultAt,tallyUntil:room.meeting.tallyUntil,myVote:room.meeting.votes[p.id]??null}:null;
  const sabotage=room.sabotage?{...room.sabotage,confirmations:Object.fromEntries(Object.entries(room.sabotage.confirmations||{}).map(([id,c])=>[id,{time:c.time}]))}:null;
  let cameraFeed=null,cameraFeeds=[];
  if(p.camera&&room.phase==='game'&&p.alive&&CAMERA_CONSOLE&&near(room,p,CAMERA_CONSOLE,150)){
    const signal=!room.sabotage||!['electrical','computers'].includes(room.sabotage.kind);
    cameraFeeds=CAMERAS.map(camera=>{const visibleAt=q=>q.floor===camera.floor&&distance(q,camera)<=560&&visionLineOfSight(map,camera,q);
      const scene=room.actionFx;return {...camera,signal,radius:480,players:signal?active(room).filter(q=>q.alive&&!q.vent&&!(q.specialRole==='phantom'&&q.abilityUntil>now)&&visibleAt(q)).map(q=>({id:q.id,...(q.specialRole==='copier'&&q.abilityUntil>now&&q.copiedAppearance?q.copiedAppearance:appearanceOf(q)),alive:true,floor:q.floor,x:q.x,y:q.y,facing:q.facing,input:q.input,motionTime:q.motionClockFor===q.moveAt&&Number.isFinite(q.motionClock)?q.motionClock:(q.moveAt??now),motionEpoch:q.motionEpoch||0})):[],bodies:signal?room.bodies.filter(visibleAt).map(({decoy,...b})=>b):[],worldKill:signal&&scene&&now<scene.sceneUntil&&visibleAt({x:scene.victimX,y:scene.victimY,floor:scene.floor})?scene:null};});
    cameraFeed=cameraFeeds.find(c=>c.id===p.camera)||cameraFeeds[0]||null;
  }else p.camera=null;
  const fx=room.actionFx;
  const involved=fx&&[fx.actor,fx.target].includes(p.id);
  const witness=fx&&room.phase==='game'&&p.alive&&fx.target!==p.id&&p.floor===fx.floor&&distance(p,{x:fx.victimX,y:fx.victimY})<=vision+70&&visionLineOfSight(map,p,{x:fx.victimX,y:fx.victimY});
  const actionFx=fx&&now<fx.until&&fx.target===p.id?fx:null;
  const worldKill=fx&&now<fx.sceneUntil&&witness?fx:null;
  return {code:room.code,revision:room.version,serverTime:now,phase:room.phase,host:room.host,config:{...room.config,anonymousVotes:true},gameNumber:room.gameNumber,intro:introPublic(room,p,now),emergencyReady:room.emergencyReady||0,revealUntil:room.revealUntil,journeyStart:room.journeyStart,travelUntil:room.travelUntil,roleRevealAt:room.roleRevealAt,me:self,table:room.phase==='lobby'?tableView(room,p,now):null,tableStats:room.phase==='lobby'?tableStats(room):null,roster,actionFx,worldKill,cameraFeed,cameraFeeds,
    players:active(room).filter(visible).filter(q=>room.phase==='meeting'||!p.alive||q.alive||q.id===p.id).map(q=>({id:q.id,...(q.abilityUntil>now&&q.specialRole==='copier'&&q.copiedAppearance?q.copiedAppearance:appearanceOf(q)),abilityVisual:q.abilityVisual,abilityUntil:q.specialRole==='phantom'?q.abilityUntil||0:0,floor:room.phase==='meeting'?0:q.floor,x:room.phase==='meeting'?q.meetingPos.x:q.x,y:room.phase==='meeting'?q.meetingPos.y:q.y,facing:room.phase==='meeting'?q.meetingPos.facing:q.facing,alive:q.alive,deathAt:q.deathAt||0,spawnAt:q.spawnAt||0,lobbyInteraction:room.phase==='lobby'?q.lobbyInteraction:null,detained:room.phase==='game'&&q.alive&&q.expelledUntil>now,input:q.input,vent:q.vent,transition:q.transition,motionTime:q.motionClockFor===q.moveAt&&Number.isFinite(q.motionClock)?q.motionClock:(q.moveAt??q.motionAt??now),motionEpoch:q.motionEpoch||0})),
    wildlife:wildlifeSnapshot(room,now),
    teachers:room.phase==='game'?(room.teachers||[]).filter(t=>t.floor===p.floor).map(t=>({id:t.id,name:t.name,floor:t.floor,x:t.x,y:t.y,targetId:t.targetId||null,motionTime:room.teacherAt||now})):[],
    deathNotices:p.specialRole==='plug'?(room.deathNotices||[]):[],believerAlive:!p.alive&&alive(room).some(q=>q.specialRole==='believer'),spiritEmojis:!p.alive?room.spiritEmojis||[]:[],spiritMessages:room.spiritMessages?.filter(m=>m.to===p.id||!p.alive&&m.from===p.name)||[],
    bodies:room.phase==='meeting'?[]:room.bodies.filter(b=>b.floor===p.floor).map(({decoy,...b})=>b),progress:{done:tasks.filter(t=>t.done).length,total:tasks.length,blocked:room.sabotage?.kind==='audio'},meeting,result:room.result,sabotage,sabotageReady:room.sabotageReady,chat:room.chat.filter(m=>!m.ghost||!p.alive),events:room.events.filter(e=>e.type!=='task'&&(e.type!=='death'||e.victim===p.id)&&(!e.private||e.private===p.id)).slice(-12)};
}

// ---- Listado y abandono de salas (usado por los almacenes)
// Una sala no pertenece a sus bots. El latido de un bot nunca renueva esta fecha.
export const ROOM_RECONNECT_GRACE=30000;
export function roomAbandoned(room,now=Date.now()){
 const humans=room.players.filter(p=>!p.bot);return now-Math.max(room.created||0,...humans.map(p=>p.lastSeen||0))>ROOM_RECONNECT_GRACE;
}
export function publicRoom(room,now){return !roomAbandoned(room,now)&&room.visibility!=='private'&&room.contentVersion===4&&room.phase==='lobby'&&room.players.filter(p=>!p.removed).length<10&&room.players.some(p=>!p.bot&&!p.removed&&now-p.lastSeen<=6000);}
export function roomListing(r){return {code:r.code,host:r.players.find(p=>p.id===r.host)?.name||'Tripulación',players:r.players.filter(p=>!p.removed).length,maxPlayers:10,impostors:r.config.impostors,map:r.config.map};}
// Canal en tiempo real de las mesas (WebSocket). Entrada ligera: valida la
// sesión, avanza solo la mesa del jugador y devuelve su vista, sin construir
// la instantánea completa de la sala.
export function tableRealtime(room,token,data,now=Date.now()){
  assert(typeof token==='string','Sesión no válida.',401);const p=room.players.find(q=>q.token===token&&!q.removed);assert(p,'Tu sesión ha caducado. Vuelve a entrar en la sala.',401);
  if(room.phase!=='lobby')return null;
  p.lastSeen=now;
  if(data&&typeof data==='object'){if(!p.wsRateAt||now-p.wsRateAt>1000){p.wsRateAt=now;p.wsRate=0;}if(++p.wsRate<=90)tableCommand(room,p,'tableInput',data,now,()=>true);}
  else tableTick(room,now);
  return tableView(room,p,now);
}
