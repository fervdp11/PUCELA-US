import {activeRepairs} from './worlds.js';
import {worldFor,TILE,FLOORS,REPAIRS,canStand,distance,lineOfSight,insideStairs} from './content.js';

// Giro por el arco más corto. No depende de casillas ni respuestas de red.
export function guideAngle(previous,position,target,dt){
  if(distance(position,target)<20)return previous??0;
  const wanted=Math.atan2(target.y-position.y,target.x-position.x);
  if(previous==null)return wanted;
  const delta=Math.atan2(Math.sin(wanted-previous),Math.cos(wanted-previous));
  return previous+delta*(1-Math.exp(-10*Math.max(0,dt)));
}

export function sabotageDestination(state,position){const {REPAIRS,FLOORS}=worldFor(state);
  if(state.phase!=='game'||!state.sabotage||!state.me.alive)return null;
  const pending=activeRepairs(state).filter(r=>!state.sabotage.fixed.includes(r.id));
  if(!pending.length)return null;
  const here=pending.filter(r=>r.floor===state.me.floor).sort((a,b)=>distance(position,a)-distance(position,b))[0];
  if(here)return {...here,title:`Reparar: ${here.label}`,stair:false};
  const other=pending[0];if(state.config.floors!=='both')return null;
  const stair=FLOORS[state.me.floor].stairs[0];
  return {...stair,title:`Ascensor / escaleras → P${other.floor}`,stair:true};
}

// Ruta por las casillas que admiten el radio real del personaje. La meta es
// una casilla alcanzable dentro del alcance de uso, incluso si el panel está
// montado sobre una mesa o una pared.
export function routeTo(map,start,goal,range=80){
  const sx=Math.floor(start.x/TILE),sy=Math.floor(start.y/TILE),key=(x,y)=>`${x},${y}`;
  if(!canStand(map,start.x,start.y))return [];
  const queue=[[sx,sy]],visited=new Set([key(sx,sy)]),previous=new Map();
  let best=key(sx,sy),bestDist=distance({x:(sx+.5)*TILE,y:(sy+.5)*TILE},goal);
  for(let i=0;i<queue.length&&i<map.width*map.height;i++){
    const [x,y]=queue[i],center={x:(x+.5)*TILE,y:(y+.5)*TILE},d=distance(center,goal);
    if(d<bestDist){best=key(x,y);bestDist=d;}
    if(d<=range&&(goal.stair?insideStairs({...center,floor:map.floor},goal):lineOfSight(map,center,goal))){best=key(x,y);break;}
    for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]){
      const nx=x+dx,ny=y+dy,k=key(nx,ny);
      if(nx>=0&&ny>=0&&nx<map.width&&ny<map.height&&!visited.has(k)&&canStand(map,(nx+.5)*TILE,(ny+.5)*TILE)){
        visited.add(k);previous.set(k,key(x,y));queue.push([nx,ny]);
      }
    }
  }
  const path=[],first=key(sx,sy);
  for(let cursor=best;cursor&&cursor!==first;cursor=previous.get(cursor)){
    const [x,y]=cursor.split(',').map(Number);path.unshift({x:(x+.5)*TILE,y:(y+.5)*TILE});
  }
  return path;
}
