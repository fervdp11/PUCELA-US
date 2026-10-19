import {botItems,caged} from './items.js';
import {selectBotTask,activityStep,ghostWander} from './bot-behavior.js';
import {activeRepairs} from '../public/worlds.js';
import {hearStructured,socialBrain,botsMayVote,botIntent,noteEvidence,botStatement,noteKillMoment} from './social.js';
import {worldFor,WORLDS,RADIUS,canStand,move,distance,lineOfSight,visionLineOfSight,detentionMap,insideStairs,SPEED,TILE,visionRangeFor,withinSight} from '../public/content.js';
import {minDuration} from './tasks.js';
const random=n=>crypto.getRandomValues(new Uint32Array(1))[0]%n;
const goalSight=(map,a,b)=>b.ignoreFurniture?visionLineOfSight(map,a,b):lineOfSight(map,a,b);
const pick=a=>a.length?a[random(a.length)]:null;
// Rejilla de navegación: 28 px por defecto. Campo Grande usa 16 px porque sus
// senderos son curvos y estrechos como en la vista aérea: con 28 px una senda en
// diagonal podía quedarse sin celdas libres conectadas.
const navCache=new WeakMap(),GRID=28,gridOf=map=>map.navGrid||GRID;
function nav(map,ghost=false){
 const G=gridOf(map);let variants=navCache.get(map.rooms);if(!variants){variants=new Map();navCache.set(map.rooms,variants);}
 const closed=(map.visionWalls||[]).filter(p=>p.kind==='closed-door');
 const key=(ghost?'ghost':closed.map(p=>p.id).sort().join(','))+(map.movementBounds?JSON.stringify(map.movementBounds):'');
 if(variants.has(key))return variants.get(key);
 let w=Math.ceil(map.width*TILE/G),h=Math.ceil(map.height*TILE/G),free;
 if(map.navigationBase&&!ghost&&!map.movementBounds){
  // Closing a door only changes nearby cells. Rebuilding every cell on every
  // sabotage caused a large synchronous pause, particularly in the gym.
  const base=nav(map.navigationBase,false);free=base.free.slice();w=base.w;h=base.h;
  for(const door of closed){
   const left=Math.max(0,Math.floor((door.x*TILE-RADIUS)/G)-1),right=Math.min(w-1,Math.ceil(((door.x+door.w)*TILE+RADIUS)/G));
   const top=Math.max(0,Math.floor((door.y*TILE-RADIUS)/G)-1),bottom=Math.min(h-1,Math.ceil(((door.y+door.h)*TILE+RADIUS)/G));
   for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++)if(free[y*w+x]&&!canStand(map,(x+.5)*G,(y+.5)*G))free[y*w+x]=0;
  }
 }else{
  free=new Uint8Array(w*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(canStand(map,(x+.5)*G,(y+.5)*G,ghost))free[y*w+x]=1;
 }
 const data={w,h,free};if(variants.size>=12){const discard=[...variants.keys()].find(k=>k!==''&&k!=='ghost');if(discard!==undefined)variants.delete(discard);}
 variants.set(key,data);return data;
}
// Prepare immutable grids before accepting connections, never during a live tick.
export function warmNavigation(){for(const world of Object.values(WORLDS))for(const map of world.FLOORS){nav(map,false);nav(map,true);}}
// El muestreo tiene que ser más fino que la barrera más estrecha que el cuerpo
// no puede atravesar. Con pasos de 9 px una franja de césped de 4 px quedaba
// invisible: el atajo daba por libre una línea que `move` no podía recorrer, el
// bot no avanzaba nada y se quedaba inmóvil para siempre. STEP acota ese error.
const STEP=3;
function clearPath(map,a,b,ghost,steps=0){const n=steps||Math.max(1,Math.ceil(distance(a,b)/STEP));for(let i=1;i<=n;i++)if(!canStand(map,a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n,ghost))return false;return true;}
// Direcciones de desencallado: ejes y diagonales normalizadas.
const ESCAPES=[[1,0],[-1,0],[0,1],[0,-1],[.7071,.7071],[-.7071,.7071],[.7071,-.7071],[-.7071,-.7071]];
// Un cuerpo encajado en un hueco cóncavo prueba las ocho salidas y conserva la
// que de verdad lo mueve, prefiriendo la que acerca al objetivo. Sustituir la
// ruta por otra no sirve si el primer paso sigue siendo imposible.
function escapeStep(map,p,want,dt,ghost,speed){let best=null,bestScore=-Infinity;const span=Math.min(dt,.06),reference=want?distance(p,want):0;
 for(const [ex,ey] of ESCAPES){const probe={x:p.x,y:p.y,facing:p.facing};move(map,probe,ex,ey,span,ghost,speed);const moved=distance(probe,p);if(moved<.25)continue;
  const score=want?reference-distance(probe,want)+moved*.12:moved;if(score>bestScore){bestScore=score;best=[ex,ey];}}
 if(!best)return false;move(map,p,best[0],best[1],span,ghost,speed);p.input={x:best[0],y:best[1]};return true;}
class MinHeap{constructor(){this.a=[];}push(id,f){const a=this.a,item={id,f};let i=a.length;a.push(item);while(i){const p=(i-1)>>1;if(a[p].f<=f)break;a[i]=a[p];i=p;}a[i]=item;}pop(){const a=this.a,top=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let k=i*2+1;if(k+1<a.length&&a[k+1].f<a[k].f)k++;if(a[k].f>=last.f)break;a[i]=a[k];i=k;}a[i]=last;}return top?.id;}get length(){return this.a.length;}}
export function botRoute(map,start,target,range=75,ghost=false){const G=gridOf(map);range=Math.max(range,G*.8);const data=nav(map,ghost),{w,h,free}=data,key=(x,y)=>y*w+x;let initial=-1,best=Infinity;
 for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const x=Math.floor(start.x/G)+dx,y=Math.floor(start.y/G)+dy,id=key(x,y),p={x:(x+.5)*G,y:(y+.5)*G},d=distance(start,p);if(x>=0&&y>=0&&x<w&&y<h&&free[id]&&d<best&&clearPath(map,start,p,ghost)){initial=id;best=d;}}
 if(initial<0)return [];const previous=new Int32Array(w*h).fill(-1),cost=new Float32Array(w*h).fill(Infinity),open=new MinHeap(),seen=new Uint8Array(w*h);data.edge??=new Uint8Array(w*h);data.checked??=new Uint8Array(w*h);cost[initial]=0;open.push(initial,0);let end=-1;
 const dirs=[[1,0],[-1,0],[0,1],[0,-1]];while(open.length){const id=open.pop();if(seen[id])continue;seen[id]=1;const x=id%w,y=Math.floor(id/w),p={x:(x+.5)*G,y:(y+.5)*G};if(distance(p,target)<=range+.5&&(ghost||goalSight(map,p,target))){end=id;break;}
 for(let k=0;k<4;k++){const [dx,dy]=dirs[k],xx=x+dx,yy=y+dy,next=key(xx,yy),bit=1<<k;if(xx<0||yy<0||xx>=w||yy>=h||!free[next]||seen[next]||cost[next]<=cost[id]+1)continue;if(!(data.checked[id]&bit)){data.checked[id]|=bit;if(clearPath(map,p,{x:(xx+.5)*G,y:(yy+.5)*G},ghost))data.edge[id]|=bit;}if(!(data.edge[id]&bit))continue;cost[next]=cost[id]+1;previous[next]=id;open.push(next,cost[next]+Math.max(0,Math.hypot((xx+.5)*G-target.x,(yy+.5)*G-target.y)-range)/G);}}
 if(end<0)return [];const route=[];for(let id=end;id>=0;id=previous[id]){route.push({x:(id%w+.5)*G,y:(Math.floor(id/w)+.5)*G});if(id===initial)break;}return route.reverse();}
export function botAnswer(kind,c){switch(kind){case 'treadmill':return {speed:c.speed,incline:c.incline,run:c.duration};case 'weights':return {route:c.route,bolts:[1,1,1]};case 'plates':return [...c.weights].sort((a,b)=>a-b);case 'scoreboard':return c.score;case 'ventilation':return {levels:c.levels,filters:c.filters};case 'lockers':return c.order;case 'equipment':return c.bad;case 'basketball':return {hits:3,hoops:c.targets};case 'spinning':return {resistance:c.resistance,pulses:c.targets};case 'hydration':return c.levels;case 'dj':return {levels:c.levels,sync:c.sync};case 'speaker':return {links:[0,1,2,3].map(i=>c.order.indexOf(i)),gain:c.gain};case 'stock':return c.slots;case 'vip':return {order:[1,2,3,4],swipe:800};case 'power':return {fuses:[1,1,1],sequence:c.sequence};case 'download':return {route:c.route,packets:c.packets};case 'calibrate':return c.targets;case 'trash':return {removed:c.items,lever:100};case 'chalk':return c.dirt;case 'papers':return c.papers;case 'desks':case 'lights':return c.rotations.map(()=>0);case 'wires':case 'german':return [0,1,2,3].map(i=>c.order.indexOf(i));case 'computer':return c.target;case 'documents':case 'delivery':case 'exams':case 'folders':return [...c.samples].sort((a,b)=>a-b);case 'supplies':return c.items;case 'bell':return c.sequence;case 'book':return c.target;case 'bath':return c.levels;case 'code':return c.code;default:return null;}}
function walk(room,p,target,now,dt,range=75){const world=worldFor(room),map=p.expelledUntil>now?detentionMap(world.mapFor(p.floor,room.sabotage)):world.mapFor(p.floor,room.sabotage),b=p.brain,ghost=!p.alive;let goal=target;if(target.floor!==undefined&&target.floor!==p.floor){if(room.config.floors!=='both')return false;goal=world.FLOORS[p.floor].stairs.reduce((a,s)=>!a||distance(p,s)<distance(p,a)?s:a,null);if(!goal)return false;range=12;}
 if(distance(p,goal)<=range+.5&&(ghost||goalSight(map,p,goal))){p.input={x:0,y:0};b.path=[];return goal===target;}
 const pathKey=`${p.floor}/${goal.id||''}/${Math.round(goal.x/GRID)},${Math.round(goal.y/GRID)}/${(room.sabotage?.closed||[]).join(',')}`;
 if(b.pathKey!==pathKey||!b.path?.length||now>(b.routeAt||0)+10000||b.stuck>5){b.path=botRoute(map,p,goal,goal===target?range:10,ghost);b.pathKey=pathKey;b.routeAt=now;b.stuck=0;}
 // Recorte de ruta hacia delante, no hacia atrás: se para en el primer nodo
 // bloqueado en vez de saltar por encima de un obstáculo, y gasta un presupuesto
 // de muestras acotado para no multiplicar el coste por bot y fotograma.
 if(b.path?.length>1){const limit=Math.min(8,b.path.length-1);let best=0,budget=96;
  for(let k=1;k<=limit;k++){const samples=Math.max(1,Math.ceil(distance(p,b.path[k])/STEP));if(budget<samples)break;budget-=samples;if(!clearPath(map,p,b.path[k],ghost,samples))break;best=k;}
  if(best>0)b.path.splice(0,best);}
 let budget=dt*SPEED*room.config.speed*(ghost?2:1),steps=0;const old={x:p.x,y:p.y};let blocked=false;
 while(budget>0&&b.path?.length&&steps++<24){const node=b.path[0],d=distance(p,node);if(d<2){b.path.shift();continue;}const amount=Math.min(budget,d),x=(node.x-p.x)/d,y=(node.y-p.y)/d;move(map,p,x,y,amount/SPEED/room.config.speed/(ghost?2:1),ghost,room.config.speed);p.input={x,y};budget-=amount;if(distance(p,node)<2)b.path.shift();if(distance(p,node)>=d-.01){b.path=[];blocked=true;break;}}
 p.moveAt=now;p.motionAt=now;
 if(distance(p,old)<.1){p.input={x:0,y:0};b.stuck=(b.stuck||0)+1;
  // Sin esta salida el bot repetía indefinidamente un primer paso imposible.
  if(b.stuck>=2&&escapeStep(map,p,goal,dt,ghost,room.config.speed))b.path=[];
 }else if(blocked)b.stuck=(b.stuck||0)+1;else b.stuck=0;
 if(goal!==target&&insideStairs(p,goal)){b.stair=goal.id;b.path=[];}return distance(p,target)<=range+.5&&(ghost||goalSight(map,p,target));}
export function observeBot(room,p,now){const b=socialBrain(p),map=worldFor(room).mapFor(p.floor,room.sabotage),range=visionRangeFor(p.role,room.sabotage?.kind),hidden=q=>!!q.vent&&!(q.transition&&/vent/.test(q.transition.kind)&&now-q.transition.at<900)||q.specialRole==='phantom'&&q.abilityUntil>now,direct=q=>q.floor===p.floor&&withinSight(p,q,range)&&visionLineOfSight(map,p,q),camera=q=>!!p.camera&&!['electrical','computers'].includes(room.sabotage?.kind)&&worldFor(room).CAMERAS.some(c=>c.floor===q.floor&&distance(c,q)<=480&&visionLineOfSight(worldFor(room).mapFor(c.floor,room.sabotage),c,q)),visible=q=>!hidden(q)&&(direct(q)||camera(q)),src=q=>direct(q)?'seen':'camera',placeOf=q=>worldFor(room).roomAt?.(q.x,q.y,q.floor)||null;const fx=room.actionFx;
 // Lo que el bot presencia se guarda como prueba propia, con el lugar y si fue por cámara.
 if(p.alive&&fx&&fx.actor!==p.id&&fx.target!==p.id&&now-fx.at<1100&&b.lastKill!==fx.id){const spot={x:fx.victimX,y:fx.victimY,floor:fx.floor};if(visible(spot)){b.lastKill=fx.id;if(p.role==='crew')noteEvidence(p,{kind:'kill',target:fx.actor,name:fx.attacker.name,src:src(spot),place:placeOf(spot),at:now});}}
 if(p.alive)for(const q of room.players){if(q.id===p.id||!q.alive||q.removed)continue;const t=q.transition;if(t&&/^vent-(in|out)$/.test(t.kind)&&now-t.at<900&&b.lastVent!==q.id+t.at&&!hidden({...q,vent:null})&&(direct(q)||camera(q))){b.lastVent=q.id+t.at;if(p.role==='crew')noteEvidence(p,{kind:'vent',target:q.id,name:q.name,src:src(q),place:placeOf(q),at:now});}}
 // Usar la jaula no es prueba de nada (los tripulantes también la usan): no se anota como indicio.
 for(const body of room.bodies)if(visible(body)&&!b.seenBodies.includes(body.id)){b.seenBodies.push(body.id);b.bodyGoal??=body.id;for(const q of room.players)if(p.role==='crew'&&q.alive&&q.id!==p.id&&visible(q)&&distance(q,body)<125)noteEvidence(p,{kind:'nearbody',target:q.id,name:q.name,src:src(q),place:placeOf(body),at:now});}
 b.heardMessages??=[];for(const m of room.chat){if(m.ghost||b.heardMessages.includes(m.id)||m.playerId===p.id)continue;b.heardMessages.push(m.id);if(b.heardMessages.length>80)b.heardMessages.shift();if(m.intent&&m.meetingId===room.meeting?.id){hearStructured(room,p,m);continue;}if(!room.players.find(q=>q.id===m.playerId)?.bot||/jaula/i.test(m.text))continue;for(const q of room.players)if(q.id!==p.id&&m.text.toLocaleLowerCase().includes(q.name.toLocaleLowerCase())&&/vi|cerca|sospech|mat|cad[aá]ver/.test(m.text.toLocaleLowerCase()))b.suspicions[q.id]=Math.max(b.suspicions[q.id]||0,Math.min(65,(b.suspicions[q.id]||0)+7));b.lastMessage=Math.max(b.lastMessage||0,m.time);}
 noteKillMoment(room,p,visible,now);
 return visible;}
export const botStartDelay=random=>100+random(2901);
export function stepBots(room,now,dt,perform){const bots=room.players.filter(p=>p.bot&&!p.removed);if(!bots.length)return;const world=worldFor(room),run=(p,type,data={})=>{try{return perform(p,type,data,now);}catch(e){p.brain.lastError=e.message;p.brain.retryAt=now+800;return null;}};
 for(const p of bots){p.lastSeen=now;p.brain??={suspicions:{},seenBodies:[],path:[]};const b=socialBrain(p);
 if(room.phase==='lobby'){if(!b.wander||distance(p,b.wander)<40||b.stuck>3)b.wander={id:'lobby',x:world.LOBBY.spawn.x+(random(9)-4)*45,y:world.LOBBY.spawn.y+(random(7)-3)*45,floor:0};const map=world.LOBBY;if(canStand(map,b.wander.x,b.wander.y)){if(!b.path?.length)b.path=botRoute(map,p,b.wander,20);let budget=dt*SPEED*.3;while(b.path?.length&&budget>0){const n=b.path[0],d=distance(p,n);if(d<2){b.path.shift();continue;}const a=Math.min(budget,d);move(map,p,(n.x-p.x)/d,(n.y-p.y)/d,a/SPEED,false,1);budget-=a;p.input={x:n.x-p.x,y:n.y-p.y};}p.moveAt=now;}continue;}
 if(room.phase==='ended')continue;
 if(room.phase==='meeting'){p.input={x:0,y:0};if(b.meeting!==room.meeting.id){b.meeting=room.meeting.id;b.voteAt=room.meeting.discussionEnd+1000+random(6500);b.chatAt=room.meeting.introUntil+900+random(2500);b.spoke=false;b.replies=[];b.preferSkip=false;b.skipResponse=null;b.path=[];}if(!p.alive)continue;observeBot(room,p,now);const speaker=bots.filter(q=>q.alive&&q.brain?.meeting===room.meeting.id&&(!q.brain.spoke||q.brain.replies?.length)&&now>=q.brain.chatAt&&now-q.lastChat>=900).sort((a,c)=>(a.brain.lastSpeechAt||0)-(c.brain.lastSpeechAt||0))[0];if(speaker===p&&(!b.spoke||b.replies?.length)&&room.meeting.stage!=='result'&&now>=b.chatAt&&now-p.lastChat>=900&&now>=(room.meeting.botChatReady||0)&&now-(room.chat.at(-1)?.time??-Infinity)>=500){const suspect=room.players.find(q=>q.alive&&q.id===b.witness),known=Object.entries(b.suspicions).filter(([id,n])=>n>=40&&room.players.some(q=>q.id===id&&q.alive)).sort((a,b)=>b[1]-a[1])[0],q=known&&room.players.find(q=>q.id===known[0]);const reply=b.replies?.[0];const intent=reply?null:botIntent(room,p,random);const said=reply?null:botStatement(room,p,random,intent);if(said&&p.role==='impostor'&&b.accused&&room.players.some(q=>q.id===b.accused&&q.alive))b.intent={meeting:room.meeting.id,target:b.accused,why:'statement'};const text=reply?.text||said.text;const quick=reply?.quick||said?.quick||null;const sent=run(p,'chat',quick?{quick,text}:{text});if(sent!==null){b.lastSpeechAt=now;b.saidIn??={};(b.saidIn[room.meeting.id]??=[]).push(text);if(reply)b.replies.shift();else b.spoke=true;room.meeting.botChatReady=now+500+random(1501);}}if(botsMayVote(room,now)&&room.meeting.votes[p.id]===undefined&&now>=b.voteAt)run(p,'vote',{target:botIntent(room,p,random)});continue;}
 if(room.phase!=='game'||now<room.revealUntil||p.transition?.until>now)continue;
 if(p.expelledUntil>now){p.input={x:0,y:0};continue;}
 // 14.2 · Arranque escalonado: al empezar la partida y al terminar cada votación,
 // cada bot espera un retraso propio y aleatorio (0,1–3 s) antes de moverse (andar,
 // escaleras, conductos u objetos). Mientras tanto ya observa y recuerda.
 const epoch=Math.max(room.revealUntil||0,room.playStartAt||0);if(b.startEpoch!==epoch){b.startEpoch=epoch;b.startAt=epoch+botStartDelay(random);b.path=[];}
 if(now<b.startAt){p.input={x:0,y:0};observeBot(room,p,now);continue;}
 botItems(room,p,now,run);if(p.items?.chest||p.items?.watching||caged(p,now)){p.input={x:0,y:0};if(p.items?.watching&&random(100)<3)run(p,'stopCamera');continue;}
 const ownZone=world.zoneAt(p.x,p.y,p.floor);b.lastRoom=ownZone.name;b.lastPlace=`${p.floor}:${ownZone.id}`;b.observedRooms??={};const visible=observeBot(room,p,now);for(const q of room.players)if(q.id!==p.id&&q.alive&&visible(q)){const area=world.zoneAt(q.x,q.y,q.floor);b.observedRooms[q.id]={place:`${q.floor}:${area.id}`,name:area.name,at:now};if(q.floor===p.floor&&distance(p,q)<260){const round=room.socialHistory?.length||0;if(b.companyRound!==round){b.companyRound=round;b.company={};}b.company[q.id]=(b.company[q.id]||0)+dt*1000;}}if(now<(b.retryAt||0))continue;
 const map=world.mapFor(p.floor,room.sabotage);
 if(p.alive){const bodies=room.bodies.filter(q=>visible(q)&&distance(p,q)<=125&&lineOfSight(map,p,q));if(bodies.length&&(p.role==='crew'||random(100)<4)){run(p,'report',{body:bodies[0].id});b.path=[];continue;}}
 // Un tripulante que ha visto un cadáver deja la tarea y va a denunciarlo. Solo la
 // cuenta atrás de un sabotaje crítico pasa por delante.
 if(p.alive&&p.role==='crew'&&b.bodyGoal&&room.sabotage?.kind!=='emergency'){const body=room.bodies.find(q=>q.id===b.bodyGoal);if(!body||now-(b.bodySince??=now)>20000){b.bodyGoal=null;b.bodySince=null;}else{if(p.puzzle)run(p,'cancel');if(p.camera)run(p,'exitCamera');b.activity=null;if(walk(room,p,body,now,dt,110))run(p,'report',{body:body.id});continue;}}
 if(!p.alive&&(p.role!=='crew'||!p.tasks.some(t=>!t.done))){ghostWander(room,p,now,dt,walk);continue;}
 if(p.role==='crew'&&p.alive&&room.sabotage){if(p.camera)run(p,'exitCamera');b.activity=null;if(p.puzzle)run(p,'cancel');const panels=activeRepairs(room),cooperative=room.sabotage.kind==='emergency'&&panels.length>1,pending=panels.filter(q=>!room.sabotage.fixed.includes(q.id));const otherBots=bots.filter(q=>q.alive&&q.role==='crew'),index=Math.max(0,otherBots.indexOf(p)),goal=cooperative?panels[index%panels.length]:pending[index%Math.max(1,pending.length)];if(p.repair){const partnersReady=!cooperative||panels.every(panel=>room.sabotage.fixed.includes(panel.id)||room.players.some(q=>q.alive&&q.repair?.id===panel.id&&q.repair.sabotageId===room.sabotage.id&&now>=q.repair.start+minDuration[q.repair.kind]+500));if(partnersReady&&now>=p.repair.start+minDuration[p.repair.kind]+500+index*150)run(p,'finishRepair',{id:p.repair.id,solution:botAnswer(p.repair.kind,p.repair.challenge)});continue;}if(goal){if(room.sabotage.fixed.includes(goal.id)){p.input={x:0,y:0};continue;}if(walk(room,p,goal,now,dt,85))run(p,'beginRepair',{id:goal.id});if(b.stair){run(p,'stairs',{id:b.stair});b.stair=null;}continue;}}
 if(p.role==='impostor'&&p.alive){if(!room.sabotage&&now>=room.sabotageReady&&now>=(b.nextSab||0)){b.nextSab=now+10000+random(20000);run(p,'sabotage',{kind:pick(Object.keys(world.SABOTAGES).filter(k=>k!=='emergency'))});}const targets=[...room.players.filter(q=>q.alive&&!q.removed&&q.role!=='impostor'&&!q.vent&&visible(q)),...(room.decoys||[]).filter(d=>d.floor===p.floor&&room.players.find(q=>q.id===d.owner)?.role!=='impostor'&&visible(d))];let target=targets.sort((a,b)=>distance(p,a)-distance(p,b))[0];if(target&&now>=p.killReady){const witnesses=room.players.filter(q=>q.id!==p.id&&q.id!==target.id&&q.alive&&q.role!=='impostor'&&q.floor===p.floor&&distance(q,target)<=420&&visionLineOfSight(map,q,target));if(distance(p,target)<=86&&goalSight(map,p,target)&&(witnesses.length===0||random(100)<3)){run(p,'kill',{target:target.id});b.path=[];b.fakeUntil=now+1200;continue;}if(!witnesses.length){walk(room,p,{...target,id:'hunt-'+target.id},now,dt,55);continue;}}
 if(b.fakeUntil>now){p.input={x:0,y:0};continue;}if(b.fakeGoal&&b.fakeGoal.floor===p.floor&&distance(p,b.fakeGoal)<85){b.fakeUntil=now+1500+random(3500);b.fakeGoal=null;b.path=[];p.input={x:0,y:0};continue;}if(!b.fakeGoal){const available=world.STATIONS.filter(s=>room.config.floors==='both'||String(s.floor)===room.config.floors),reserved=bots.filter(q=>q.id!==p.id).map(q=>q.brain?.fakeGoal?.id);b.fakeGoal=pick(available.filter(s=>!reserved.includes(s.id)))||pick(available);b.path=[];}// Si el destino de cobertura resulta inalcanzable (una escalera que no conecta, una planta cerrada), el impostor se quedaba esperando a un sitio al que no puede ir. A los nueve segundos cambia de destino.
 if(b.fakeGoal){if(b.fakeGoalId!==b.fakeGoal.id){b.fakeGoalId=b.fakeGoal.id;b.fakeSince=now;}
  if(now-(b.fakeSince||now)>9000){b.fakeGoal=null;b.fakeGoalId=null;b.path=[];}
  else walk(room,p,b.fakeGoal,now,dt,75);}
 if(b.stair){run(p,'stairs',{id:b.stair});b.stair=null;}continue;}
 if(p.role==='crew'){if(activityStep(room,p,now,dt,{walk,run,visible}))continue;if(p.puzzle){const duration=minDuration[p.puzzle.kind]+1800+(p.color%3)*650;if(now>=p.puzzle.start+duration)run(p,'finishTask',{id:p.puzzle.id,solution:botAnswer(p.puzzle.kind,p.puzzle.challenge)});continue;}const current=selectBotTask(room,p);if(current){if(walk(room,p,current,now,dt,80))run(p,'beginTask',{id:current.id});if(b.stair){run(p,'stairs',{id:b.stair});b.stair=null;}}else{p.input={x:0,y:0};if(p.alive&&b.witness&&now>=(room.emergencyReady||0)&&!room.sabotage&&p.emergencies){const goal=world.FLOORS[room.config.floors==='1'?1:0].emergency;if(walk(room,p,goal,now,dt,160))run(p,'emergency');if(b.stair){run(p,'stairs',{id:b.stair});b.stair=null;}}}}
 }
}
