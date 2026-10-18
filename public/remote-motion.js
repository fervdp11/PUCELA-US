import {SPEED,move,canStand} from './content.js';

export const REMOTE_DELAY_MS=80,MAX_REMOTE_DELAY_MS=700,MAX_EXTRAPOLATION_MS=70;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
// motionTime pertenece al movimiento original, no a cada respuesta del
// observador. Repetir una posición no crea muestras ficticias de parada.
// `arrivedAt` (reloj del servidor estimado en el cliente) mide cuánto tarda en
// llegar la muestra siguiente desde la marca de tiempo de la anterior. Ese
// hueco —intervalo de sondeo + latencia + variación de la red— es el retardo
// mínimo para que el cursor nunca se quede sin muestra que interpolar. Con un
// retardo fijo de 120 ms, en datos móviles (RTT 80–200 ms) el cursor alcanzaba
// la última muestra en casi cada paquete: el bot se paraba 30–80 ms y luego
// avanzaba de golpe, el «movimiento a saltos». Sube rápido y baja despacio.
export function recordRemoteSample(previous,player,snapshotTime,arrivedAt=snapshotTime){
 const time=Number.isFinite(player.motionTime)?player.motionTime:snapshotTime;
 const sample={time,x:player.x,y:player.y,floor:player.floor,epoch:player.motionEpoch||0,facing:player.facing,input:player.input,alive:player.alive,vent:player.vent,transition:player.transition};
 let track=previous||{samples:[],interval:100,playhead:null,lastNow:null,offset:{x:0,y:0}};
 const last=track.samples.at(-1);if(last&&time<last.time)return track;
 const instant=last&&(sample.floor!==last.floor||sample.epoch!==last.epoch||sample.vent!==last.vent||sample.transition&&sample.transition.at!==last.transition?.at);
 const jump=last&&Math.hypot(sample.x-last.x,sample.y-last.y)>Math.max(190,SPEED*2*Math.max(0,time-last.time)/1000+45);
 if(instant||jump)track={samples:[],interval:track.interval,need:track.need,playhead:null,lastNow:null,offset:{x:0,y:0}};
 else if(last&&time===last.time){track.samples[track.samples.length-1]=sample;return track;}
 if(track.samples.length){if(!track.pendingSamples)track.pendingSamples=track.samples.slice();const interval=time-track.samples.at(-1).time;if(interval>15&&interval<700){track.interval+=(interval-track.interval)*.15;const gap=arrivedAt-track.samples.at(-1).time;if(Number.isFinite(gap)&&gap>0&&gap<1500){const need=track.need??gap;track.need=need+(gap-need)*(gap>need?.5:.03);}}}
 track.samples.push(sample);
 while(track.samples.length>16||track.samples.length>2&&track.samples[1].time<time-1100)track.samples.shift();
 return track;
}
export function poseAt(samples,time,map,speedMultiplier=1){
 if(!samples?.length)return null;
 let i=0;while(i+1<samples.length&&samples[i+1].time<=time)i++;
 const a=samples[i],b=samples[i+1],out={x:a.x,y:a.y,facing:a.facing,moving:false,alpha:1};
 if(b){const f=clamp((time-a.time)/(b.time-a.time),0,1),dx=b.x-a.x,dy=b.y-a.y;out.x+=dx*f;out.y+=dy*f;out.facing=f<.5?a.facing:b.facing;out.moving=Math.hypot(dx,dy)>1;
  if(!canStand(map,out.x,out.y,a.alive===false)){out.x=a.x;out.y=a.y;const len=Math.hypot(dx,dy);if(len)move(map,out,dx/len,dy/len,len*f/SPEED/(a.alive===false?2:1)/speedMultiplier,a.alive===false,speedMultiplier);}
  return out;
 }
 const prev=samples[i-1],age=Math.max(0,time-a.time);
 if(prev&&!a.vent&&!a.transition&&(a.input===undefined||a.input.x||a.input.y)){
  const dt=(a.time-prev.time)/1000,dx=a.x-prev.x,dy=a.y-prev.y,len=Math.hypot(dx,dy),limit=a.alive===undefined?SPEED*.55*speedMultiplier:a.alive===false?SPEED*2*speedMultiplier:SPEED*speedMultiplier,speed=Math.min(limit,len/Math.max(.001,dt));
  if(dt>.015&&dt<.7&&speed>3){move(map,out,dx/len,dy/len,Math.min(MAX_EXTRAPOLATION_MS,age)/1000*speed/SPEED/(a.alive===false?2:1)/speedMultiplier,a.alive===false,speedMultiplier);out.moving=age<MAX_EXTRAPOLATION_MS;}
 }
 return out;
}
export function remoteAt(track,serverNow,map,speedMultiplier=1){
 if(!track?.samples.length)return null;
 // El cursor continúa entre paquetes; el retardo se adapta lentamente al
 // ritmo real de muestras (desde 80 ms, adaptado a la red) y nunca se acumula ni retrocede.
 const delay=clamp(Math.max(track.interval*1.2,(track.need||0)+18),REMOTE_DELAY_MS,MAX_REMOTE_DELAY_MS),desired=serverNow-delay;
 const elapsed=track.lastNow===null?0:Math.max(0,serverNow-track.lastNow);
 if(track.playhead===null||elapsed>700){track.playhead=desired;track.offset={x:0,y:0};track.lastPose=null;}
 else {const error=desired-(track.playhead+elapsed);track.playhead+=elapsed*clamp(1+error/250,.9,1.1);}
 const pose=poseAt(track.samples,track.playhead,map,speedMultiplier),decay=Math.exp(-elapsed/110);track.offset.x*=decay;track.offset.y*=decay;
 // Si faltó una muestra y hubo que extrapolar, la corrección se desvanece
 // durante 110 ms. El reloj no vuelve a empezar al llegar el paquete.
 if(track.pendingSamples&&track.lastPose){const before=poseAt(track.pendingSamples,track.playhead,map,speedMultiplier);track.offset.x+=before.x-pose.x;track.offset.y+=before.y-pose.y;}
 track.pendingSamples=null;pose.x+=track.offset.x;pose.y+=track.offset.y;
 if(!canStand(map,pose.x,pose.y,track.samples.at(-1).alive===false)&&track.lastPose){const dx=pose.x-track.lastPose.x,dy=pose.y-track.lastPose.y,len=Math.hypot(dx,dy);pose.x=track.lastPose.x;pose.y=track.lastPose.y;if(len)move(map,pose,dx/len,dy/len,len/SPEED/(track.samples.at(-1).alive===false?2:1)/speedMultiplier,track.samples.at(-1).alive===false,speedMultiplier);}
 track.lastPose={x:pose.x,y:pose.y};
 pose.visualAt=track.playhead;track.lastNow=serverNow;
 return pose;
}
