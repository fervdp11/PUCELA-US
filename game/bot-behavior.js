// Deliberately separated from action authority. Investigations consume a
// measured travel budget; walking speed and minigame durations stay unchanged.
import {worldFor,canStand,distance,TILE,lineOfSight} from '../public/content.js';
const hash=s=>[...s].reduce((n,v)=>(Math.imul(n,33)+v.charCodeAt(0))>>>0,5381);
export function selectBotTask(room,p){
 const b=p.brain,w=worldFor(room),now=room.updated||Date.now();
 const pending=p.tasks.filter(t=>!t.done).map(w.taskStation).filter(Boolean);
 if(b.taskGoal&&pending.some(t=>t.id===b.taskGoal)){
  const current=pending.find(t=>t.id===b.taskGoal),d=distance(p,current);
  // Vigilancia del acercamiento: si en siete segundos no ha recortado distancia
  // hacia su objetivo, es que desde donde está no hay forma de llegar. En vez
  // de insistir eternamente, se apunta otra tarea y deja esa para más tarde.
  if(b.goalId!==b.taskGoal){b.goalId=b.taskGoal;b.goalBest=d;b.goalAt=now;}
  else if(d<b.goalBest-8){b.goalBest=d;b.goalAt=now;}
  else if(now-(b.goalAt||now)>7000&&pending.length>1){
   b.avoid={id:b.taskGoal,until:now+15000};
   b.taskGoal=null;b.goalId=null;b.path=[];
  }
  if(b.taskGoal)return current;
 }
 const reservations=room.players.filter(q=>q.bot&&q.id!==p.id&&q.alive).map(q=>q.brain?.taskGoal);
 const avoided=b.avoid&&b.avoid.until>now?b.avoid.id:null;
 // Tras cada votación los bots se reparten: cada uno prefiere un destino distinto
 // en vez de ir todos a la tarea más cercana al punto de reunión.
 const round=room.socialHistory?.length||0;
 if(b.disperseRound!==round){b.disperseRound=round;b.disperseUntil=now+30000;if(round>0){b.taskGoal=null;b.goalId=null;b.path=[];}}
 const dispersing=(b.disperseUntil||0)>now&&round>0;
 const score=s=>(s.floor===p.floor?0:3000)+(dispersing?distance(p,s)*.2+hash(p.id+round+s.id)%2600+(reservations.includes(s.id)?2200:0):distance(p,s)+hash(p.id+s.id)%650+(reservations.includes(s.id)?650:0))+(s.id===avoided?9000:0);
 pending.sort((a,c)=>score(a)-score(c));
 b.taskGoal=pending[0]?.id;
 if(b.taskGoal!==b.goalId){b.goalId=b.taskGoal;b.goalBest=pending[0]?distance(p,pending[0]):0;b.goalAt=now;}
 return pending[0];}
// Un fantasma sin tareas pendientes (o un impostor eliminado) pasea por el
// escenario: elige un punto de interés distinto, va hasta allí, se detiene un
// rato y vuelve a elegir, sin repetir el último lugar.
export function ghostWander(room,p,now,dt,walk){
 const b=p.brain,w=worldFor(room);
 if((b.roamPause||0)>now){p.input={x:0,y:0};return;}
 if(!b.roam||now-(b.roamSince||0)>16000){
  const spots=[...w.STATIONS,...(w.CHESTS||[]),...(w.VENTS||[])].filter(s=>s&&Number.isFinite(s.x)&&(room.config.floors==='both'||String(s.floor??0)===room.config.floors));
  const pool=spots.filter(s=>s.id!==b.roamLast&&distance(p,s)>180);
  const s=pool.length?pool[crypto.getRandomValues(new Uint32Array(1))[0]%pool.length]:spots[0];
  if(!s){p.input={x:0,y:0};return;}
  const a=crypto.getRandomValues(new Uint32Array(1))[0]%628/100,r=40+crypto.getRandomValues(new Uint32Array(1))[0]%90;
  b.roam={x:s.x+Math.cos(a)*r,y:s.y+Math.sin(a)*r,floor:s.floor??p.floor,id:'roam-'+s.id};b.roamLast=s.id;b.roamSince=now;b.path=[];
 }
 if(walk(room,p,b.roam,now,dt,60)){b.roam=null;b.roamPause=now+1500+crypto.getRandomValues(new Uint32Array(1))[0]%4500;p.input={x:0,y:0};}
}
export function activityStep(room,p,now,dt,{walk,run,visible}){const b=p.brain,w=worldFor(room),map=w.mapFor(p.floor,room.sabotage);b.activityStats??={taskMs:hash(p.id)%3===0?13500:0,investigateMs:0,episodes:0,modes:{}};const stats=b.activityStats,ratio=room.botActivityRatio??.4;
 if(!p.alive||room.sabotage||!ratio){if(p.camera)run(p,'exitCamera');b.activity=null;return false;}
 if(p.puzzle){stats.taskMs+=dt*1000;return false;}
 const remaining=p.tasks.some(t=>!t.done);if(!remaining){if(p.camera)run(p,'exitCamera');b.activity=null;return false;}
 const balance=stats.taskMs*ratio-stats.investigateMs;
 if(!b.activity&&balance>=4200){
  const knownBody=room.bodies.find(q=>b.seenBodies?.includes(q.id)&&q.floor===p.floor&&distance(p,q)<350),suspect=room.players.filter(q=>q.id!==p.id&&q.alive&&visible(q)&&(b.suspicions[q.id]||0)>15).sort((a,c)=>(b.suspicions[c.id]||0)-(b.suspicions[a.id]||0))[0],console=w.CAMERA_CONSOLE;
  let mode='patrol',goal=null;const ordinal=stats.episodes++,seed=hash(p.id+ordinal),radius=Math.min(340,Math.max(130,balance*.205/2.5));
  if(knownBody){mode='incident';goal={...knownBody};}
  else if(suspect&&ordinal%3===1){mode='follow';goal={id:suspect.id,x:suspect.x,y:suspect.y,floor:suspect.floor};}
  else if(console&&console.floor===p.floor&&distance(p,console)<Math.min(430,balance*.205/2.7)&&balance>=6500&&now-(b.lastCameraAt||0)>45000){mode='camera';goal={...console};}
  else{const points=[];for(let i=0;i<20;i++){const a=(seed%1000)/1000*Math.PI*2+i*2.399,r=radius*(.65+(i%3)*.15),q={x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r,floor:p.floor,id:'patrol-'+ordinal};if(canStand(map,q.x,q.y)&&lineOfSight(map,p,q))points.push(q);}goal=points[0];}
  if(goal){b.activity={mode,goal,anchor:{x:p.x,y:p.y,floor:p.floor,id:'return-'+ordinal},started:now,limit:Math.max(2400,Math.min(10000,balance*.52)),stage:'out'};b.path=[];stats.modes[mode]=(stats.modes[mode]||0)+1;}
 }
 const a=b.activity;if(a&&now-a.started>25000){if(p.camera)run(p,'exitCamera');b.activity=null;b.path=[];return false;}if(!a){stats.taskMs+=dt*1000;b.behavior='task';return false;}stats.investigateMs+=dt*1000;b.behavior=a.mode;
 if(a.anchor.floor!==p.floor){b.activity=null;if(p.camera)run(p,'exitCamera');return false;}
 if(a.stage==='out'){
  if(a.mode==='follow'){const q=room.players.find(q=>q.id===a.goal.id&&q.alive&&visible(q));if(q)a.goal={...a.goal,x:q.x,y:q.y,floor:q.floor};else a.stage='return';}
  if(now-a.started>a.limit)a.stage='return';
  if(a.stage==='out'&&walk(room,p,a.goal,now,dt,a.mode==='camera'?110:45)){
   if(a.mode==='camera'){if(!p.camera){const r=run(p,'camera',{id:'all'});if(r!==null){b.lastCameraAt=now;a.watchUntil=now+Math.min(1800,Math.max(600,balance*.15));}}a.stage=p.camera?'watch':'return';}
   else a.stage='return';
   return true; // One walking budget per simulation frame, including direction changes.
  }
 }else if(a.stage==='watch'){p.input={x:0,y:0};if(now>=a.watchUntil){run(p,'exitCamera');a.stage='return';}}
 if(a.stage==='return'){
  // El ancla es solo "donde estaba antes de dar una vuelta". Exigía llegar a
  // 28 px y con línea de visión, y si esa combinación no existe desde donde ha
  // acabado el paseo, el bot se quedaba plantado hasta el corte de 25 segundos.
  // Volver es un detalle, no un objetivo: a los tres segundos se deja y se
  // retoman las tareas.
  a.returnAt??=now;
  if(p.camera)run(p,'exitCamera');
  if(walk(room,p,a.anchor,now,dt,28)||now-a.returnAt>3000){b.activity=null;b.path=[];}
 }
 return true;
}
