import {worldFor,canStand,move,distance,lineOfSight,SPEED} from '../public/content.js';
import {WILDLIFE_SPOTS} from '../public/park.js';
function relocate(map,a){if(canStand(map,a.x,a.y))return a;for(let r=14;r<=600;r+=14)for(let n=0;n<24;n++){const x=a.x+Math.cos(n*Math.PI/12)*r,y=a.y+Math.sin(n*Math.PI/12)*r;if(canStand(map,x,y)){a.x=x;a.y=y;a.motionEpoch=(a.motionEpoch||0)+1;a.goal=null;return a;}}return null;}
// Cuatro pavos reales junto a la pajarera, seis patos en la orilla del lago y
// cinco ardillas repartidas por las arboledas.
const spots=WILDLIFE_SPOTS;
export function createWildlife(room,now){if(worldFor(room).id!=='park')return [];const map=worldFor(room).FLOORS[0];return spots.map(([x,y],i)=>({id:'animal-'+i,species:i<4?'peacock':i<10?'duck':'squirrel',x:x*56,y:y*56,floor:0,facing:i%2?1:-1,speed:i<4?28:i<10?34:54,seed:1489+i*397,goal:null,motionTime:now})).map(a=>relocate(map,a)).filter(Boolean);}
export function stepWildlife(room,now,dt){if(worldFor(room).id!=='park'||room.phase!=='game'||now<room.revealUntil)return;const map=worldFor(room).FLOORS[0];for(const a of room.wildlife||[]){if(!relocate(map,a))continue;const rnd=()=>{a.seed=(Math.imul(a.seed,1664525)+1013904223)>>>0;return a.seed/4294967296;};if(!a.goal||distance(a,a.goal)<4||now>a.goal.until){a.goal=null;for(let i=0;i<12;i++){const angle=rnd()*Math.PI*2,r=50+rnd()*150,q={x:a.x+Math.cos(angle)*r,y:a.y+Math.sin(angle)*r};if(canStand(map,q.x,q.y)&&lineOfSight(map,a,q)){a.goal={...q,until:now+8000};break;}}}const x=a.x,y=a.y;if(a.goal){move(map,a,a.goal.x-a.x,a.goal.y-a.y,dt*a.speed/SPEED,false,1);if(Math.abs(a.x-x)>.1)a.facing=a.x>x?1:-1;if(Math.hypot(a.x-x,a.y-y)<.1)a.goal=null;}a.moving=Math.hypot(a.x-x,a.y-y)>.05;a.motionTime=now;}}
// Quince animales con posición de float completo pesaban 2,5 KB en cada
// instantánea del parque. Dos decimales bastan: la interpolación del cliente
// trabaja muy por encima de esa precisión.
const r2=v=>Math.round(v*100)/100;
export function wildlifeSnapshot(room,now){return room.phase==='game'?(room.wildlife||[]).map(({id,species,x,y,floor,facing,moving,motionTime,motionEpoch})=>({id,species,x:r2(x),y:r2(y),floor,facing,moving,motionTime,motionEpoch,isWildlife:true})):[];}
