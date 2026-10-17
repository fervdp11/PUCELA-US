import test from 'node:test';import assert from 'node:assert/strict';import {WORLDS,canStand,move,distance} from '../public/content.js';import {terrainAt} from '../public/park-ground.js';import {floorContains,floorBoundary,segmentDistance} from '../public/visibility.js';import {botRoute} from '../game/bots.js';
test('hierba: bloqueada por servidor y predicción; tierra y pavimento siguen transitables',()=>{const m=WORLDS.park.FLOORS[0];let grass=0,road=0;for(let y=1;y<m.height-1;y+=.75)for(let x=1;x<m.width-1;x+=.75){if(!terrainAt(m,x*56,y*56)){assert.equal(canStand(m,x*56,y*56),false);grass++;}else if(canStand(m,x*56,y*56))road++;}assert.ok(grass>2000);assert.ok(road>300);const p={...m.spawn};for(let i=0;i<300;i++){move(m,p,Math.cos(i*.017),Math.sin(i*.017),.05);assert.ok(terrainAt(m,p.x,p.y));}});
test('todos los accesos siguen conectados por tierra o pavimento y el arbolado cubre el césped',()=>{const w=WORLDS.park,m=w.FLOORS[0];assert.ok(m.trees.length>400);for(const [x,y,r,species] of m.trees){assert.equal(terrainAt(m,x*56,y*56),false,`árbol en el sendero ${x},${y}`);assert.ok([0,1,2].includes(species));assert.ok(r>=.7&&r<=1.1);}assert.ok(m.props.filter(p=>p.parkGrove).length>40);for(const p of [...w.STATIONS,...w.REPAIRS,...w.VENTS,w.CAMERA_CONSOLE,...w.CAMERAS]){assert.ok(canStand(m,p.x,p.y),p.id);assert.ok(distance(m.spawn,p)<80||botRoute(m,m.spawn,p,80).length,p.id);}});

// El índice espacial del terreno y del mobiliario debe dar exactamente el mismo
// resultado que recorrer todas las figuras. Se compara `canStand` contra una
// reimplementación exhaustiva en una malla densa de los cuatro mapas: si el
// atajo descartara alguna figura relevante, aquí se vería.
test('los índices espaciales no cambian ni una sola colisión',()=>{
 const T=56,RADIUS=15;
 const pathDistance=(x,y,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t);};
 const rawTerrainAt=(map,x,y)=>{const g=map.walkable;if(!g)return true;x/=T;y/=T;
  return g.rects.some(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h)
   ||g.circles.some(p=>Math.hypot(x-p.x,y-p.y)<=p.r)
   ||(map.paths||[]).some(path=>path.some((b,i)=>i&&pathDistance(x,y,path[i-1],b)<=g.pathRadius));};
 const rawTerrainFits=(map,x,y)=>{if(!map.walkable)return true;if(!rawTerrainAt(map,x,y))return false;
  for(let i=0;i<12;i++){const a=i*Math.PI/6;if(!rawTerrainAt(map,x+Math.cos(a)*RADIUS,y+Math.sin(a)*RADIUS))return false;}return true;};
 const touches=(x,y,l,t,r,b)=>{const dx=x-Math.max(l,Math.min(x,r)),dy=y-Math.max(t,Math.min(y,b));return dx*dx+dy*dy<RADIUS*RADIUS-1e-7;};
 const rawProps=(map,x,y)=>map.props.filter(r=>!r.parkGrove&&!r.soft).some(r=>touches(x,y,r.x*T,r.y*T,(r.x+r.w)*T,(r.y+r.h)*T));
 // Misma fórmula que canStand, pero recorriendo todas las figuras.
 const rawCanStand=(map,x,y)=>{
  const b=map.movementBounds;
  if(b&&(x<b.x*T+RADIUS||x>(b.x+b.w)*T-RADIUS||y<b.y*T+RADIUS||y>(b.y+b.h)*T-RADIUS))return false;
  if(!rawTerrainFits(map,x,y))return false;
  if(!floorContains(map,x,y)||floorBoundary(map).some(s=>segmentDistance({x,y},s)<RADIUS-1e-6))return false;
  return !rawProps(map,x,y);};

 let sampled=0,terrain=0,blocked=0;
 for(const id of ['school','club','gym','park']){
  for(const map of WORLDS[id].FLOORS){
   for(let y=1;y<map.height-1;y+=.37)for(let x=1;x<map.width-1;x+=.37){
    const px=x*T,py=y*T;sampled++;
    const fast=canStand(map,px,py),slow=rawCanStand(map,px,py);
    assert.equal(fast,slow,`${id} (${px.toFixed(1)},${py.toFixed(1)}): índice ${fast} vs exhaustivo ${slow}`);
    if(!fast)blocked++;
    if(map.walkable){terrain++;
     assert.equal(terrainAt(map,px,py),rawTerrainAt(map,px,py),`terreno ${id} (${px.toFixed(1)},${py.toFixed(1)})`);}
   }
  }
 }
 assert.ok(sampled>80000,'malla demasiado escasa: '+sampled);
 assert.ok(terrain>10000,'apenas se comprobó terreno: '+terrain);
 assert.ok(blocked>sampled*.2,'la malla no toca suficientes obstáculos: '+blocked+'/'+sampled);
});

test('campo grande: sin manchas de hierba aisladas ni estrechas entre senderos (se rellenan de tierra y son transitables)',async()=>{
 const {FILL}=await import('../public/park-fill.js');const m=WORLDS.park.FLOORS[0];
 assert.ok(FILL.length>20);
 for(const r of FILL){assert.ok(terrainAt(m,(r.x+r.w/2)*56,(r.y+r.h/2)*56),`relleno no transitable ${r.x},${r.y}`);}
 assert.ok(m.trees.every(([x,y])=>!FILL.some(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h)),'sin árboles dentro de los rellenos');
});
