// Authoritative bounded history; never trusts client coordinates or role claims.
import {worldFor,distance,lineOfSight,canStand,KILL_RANGE,SPEED} from '../public/content.js';
export const HISTORY_MS=1500,MAX_REWIND_MS=900;
export function recordHistory(room,now){
 if(room.phase!=='game'){room.positionHistory=[];return;}
 const h=room.positionHistory??=[],last=h.at(-1);
 const frame={at:now,players:room.players.filter(p=>!p.removed).map(p=>({id:p.id,x:p.x,y:p.y,sourceAt:p.motionClockFor===p.moveAt&&Number.isFinite(p.motionClock)?Math.max(now-HISTORY_MS,Math.min(now,p.motionClock)):now,floor:p.floor,alive:p.alive,vent:p.vent,epoch:p.motionEpoch||0,detained:!!(p.expelledUntil>now)})),closed:[...(room.sabotage?.closed||[])]};
 if(last?.at===now)h[h.length-1]=frame;
 else if(!last||now-last.at>=40)h.push(frame);
 while(h.length>40||h.length&&h[0].at<now-HISTORY_MS)h.shift();
}
export function historicalPose(room,id,time,useMotionClock=false){
 const h=room.positionHistory||[];let a=null,b=null;
 for(const frame of h){const pose=frame.players.find(p=>p.id===id);if(!pose)continue;const at=useMotionClock?(pose.sourceAt??frame.at):frame.at;
  if(at<=time){if(!a||at>=a.at)a={...pose,at,closed:frame.closed};}else if(!b||at<b.at)b={...pose,at,closed:frame.closed};
 }
 if(!a||!a.alive||a.vent||a.detained||!b&&time-a.at>110)return null;
 if(b&&(b.epoch!==a.epoch||b.floor!==a.floor||!b.alive||b.vent||b.detained))return null;
 const k=b?Math.max(0,Math.min(1,(time-a.at)/(b.at-a.at))):0;
 return {...a,x:a.x+(b?b.x-a.x:0)*k,y:a.y+(b?b.y-a.y:0)*k};
}
export function compensatedKill(room,attacker,victim,data,now){
 if(attacker.floor!==victim.floor||victim.vent||victim.expelledUntil>now||victim.specialRole==='phantom'&&victim.abilityUntil>now&&now-(victim.abilityVisual?.at||0)>=600)return false;
 const world=worldFor(room),map=world.mapFor(attacker.floor,room.sabotage);
 if(distance(attacker,victim)<=KILL_RANGE&&lineOfSight(map,attacker,victim))return true;
 if(attacker.bot)return false;
 const age=now-data.visualAt,attackAge=now-data.attackAt;
 const rtt=Math.min(800,Math.max(0,attacker.netRtt||0));
 // A server-issued ping nonce establishes RTT; interpolation can use at most 700 ms.
 const budget=Math.min(MAX_REWIND_MS,220+rtt);
 if(!Number.isFinite(age)||!Number.isFinite(attackAge)||age<0||age>budget||attackAge< -50||attackAge>rtt/2+120||data.visualAt>data.attackAt+30)return false;
 const a=historicalPose(room,attacker.id,Math.min(now,data.attackAt)),v=historicalPose(room,victim.id,data.visualAt,true);
 if(!a||!v||a.floor!==v.floor||a.epoch!==(attacker.motionEpoch||0)||v.epoch!==(victim.motionEpoch||0))return false;
 if(distance(a,attacker)>SPEED*room.config.speed*1.45*(Math.max(0,attackAge)/1000)+30||distance(v,victim)>SPEED*room.config.speed*1.45*age/1000+45)return false;
 const historicMap=world.mapFor(a.floor,{kind:'doors',closed:[...new Set([...a.closed,...v.closed])]});
 return distance(a,v)<=KILL_RANGE&&canStand(historicMap,a.x,a.y)&&canStand(historicMap,v.x,v.y)&&lineOfSight(historicMap,a,v)&&lineOfSight(map,a,v);
}
