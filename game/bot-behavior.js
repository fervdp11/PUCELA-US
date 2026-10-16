// Deliberately separated from action authority. Investigations consume a
// measured travel budget; walking speed and minigame durations stay unchanged.
import {worldFor,canStand,distance,TILE,lineOfSight} from '../public/content.js';
const hash=s=>[...s].reduce((n,v)=>(Math.imul(n,33)+v.charCodeAt(0))>>>0,5381);
export function selectBotTask(room,p){const b=p.brain,w=worldFor(room),pending=p.tasks.filter(t=>!t.done).map(w.taskStation).filter(Boolean);if(b.taskGoal&&pending.some(t=>t.id===b.taskGoal))return pending.find(t=>t.id===b.taskGoal);
 const reservations=room.players.filter(q=>q.bot&&q.id!==p.id&&q.alive).map(q=>q.brain?.taskGoal),score=s=>(s.floor===p.floor?0:3000)+distance(p,s)+hash(p.id+s.id)%650+(reservations.includes(s.id)?650:0);pending.sort((a,c)=>score(a)-score(c));b.taskGoal=pending[0]?.id;return pending[0];}
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
 if(a.stage==='return'){if(p.camera)run(p,'exitCamera');if(walk(room,p,a.anchor,now,dt,28)){b.activity=null;b.path=[];}}
 return true;
}
