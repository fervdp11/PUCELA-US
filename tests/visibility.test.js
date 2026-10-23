import test from 'node:test';
import assert from 'node:assert/strict';
import {WORLDS,canStand,move,TILE} from '../public/content.js';
import {geometry,visibilityPolygon,safeVisibility,exactLineOfSight,opaqueAt,rayDistance,castRay,inPolygon} from '../public/visibility.js';

test('geometría exacta: habitaciones, pasillos, puertas y esquinas de ambos mapas',()=>{
 let origins=0,rays=0;
 for(const world of Object.values(WORLDS))for(const map of world.FLOORS){const g=geometry(map);assert.ok(g.segments.length);for(let y=28;y<map.height*TILE;y+=56)for(let x=28;x<map.width*TILE;x+=56){if(!canStand(map,x,y))continue;origins++;assert.equal(opaqueAt(map,x,y),false);const origin={x,y},points=visibilityPolygon(map,origin,420);assert.ok(points.length>=128);const area=Math.abs(points.reduce((n,p,i)=>{const q=points[(i+1)%points.length];return n+p.x*q.y-q.x*p.y;},0)/2);assert.ok(area>300,`no oscuridad total: ${world.id} ${map.floor} ${x},${y}`);for(let i=0;i<points.length;i+=13){const p=points[i],d=Math.hypot(p.x-x,p.y-y);assert.ok(d<=420.00001);if(d>1){assert.equal(exactLineOfSight(map,origin,{x:x+(p.x-x)*.999,y:y+(p.y-y)*.999}),true);rays++;}}}
 // Every segment endpoint: traverse all free sides, including diagonal corners.
 for(const s of g.floorEdges)for(const end of [s.a,s.b])for(let a=0;a<8;a++){const p={x:end.x+Math.cos(a*Math.PI/4)*24,y:end.y+Math.sin(a*Math.PI/4)*24};if(!canStand(map,p.x,p.y))continue;const before={...p};move(map,p,.3,.3,.03);assert.equal(canStand(map,p.x,p.y),true);assert.ok(Math.hypot(p.x-before.x,p.y-before.y)<=6.151);}
 }assert.ok(origins>1000);assert.ok(rays>10000);
});

test('paredes rectas, esquinas sin fugas y estabilidad subpíxel',()=>{
 const map={width:14,height:12,rooms:[{x:1,y:1,w:12,h:10}],corridors:[],props:[{kind:'wall',x:7,y:1,w:.16,h:7}],visionWalls:[{kind:'wall',x:7,y:1,w:.16,h:7}]};const origin={x:5*TILE,y:4*TILE},g=geometry(map);for(let i=-5;i<=5;i++){const p={x:origin.x+i*.03,y:origin.y+i*.02};for(let a=-.5;a<=.5;a+=.025){const d=rayDistance(p,Math.cos(a),Math.sin(a),g.segments,420),hit={x:p.x+Math.cos(a)*d,y:p.y+Math.sin(a)*d};assert.ok(Math.abs(hit.x-7*TILE)<.00001,'borde perfectamente recto');}assert.equal(exactLineOfSight(map,p,{x:9*TILE,y:5*TILE}),false);assert.equal(exactLineOfSight(map,p,{x:6*TILE,y:5*TILE}),true);}
 const diagonal={width:10,height:10,rooms:[{x:1,y:1,w:8,h:8,outline:[[3,1],[7,1],[9,3],[9,7],[7,9],[3,9],[1,7],[1,3]]}],corridors:[],props:[]};assert.equal(canStand(diagonal,1.5*TILE,1.5*TILE),false);assert.equal(canStand(diagonal,2.1*TILE,2.1*TILE),false);assert.equal(canStand(diagonal,2.5*TILE,2.5*TILE),true);
});

test('un fotograma de visión inválido conserva una máscara válida y nunca deja el mundo entero al descubierto',()=>{const map={width:10,height:10,rooms:[{x:1,y:1,w:8,h:8}],corridors:[],props:[]},first=safeVisibility(map,{x:200,y:200},300);assert.equal(first.recovered,false);const invalid=safeVisibility(map,{x:NaN,y:NaN},300,first);assert.equal(invalid.recovered,true);assert.equal(invalid.points,first.points);const initial=safeVisibility(map,{x:55,y:200},300);assert.equal(initial.recovered,true);assert.ok(initial.points.length>3);assert.ok(initial.points.every(p=>Number.isFinite(p.x+p.y)));});

test('índice espacial: cada rayo da exactamente la misma distancia que recorrer todos los segmentos',()=>{
 let rays=0,seed=7;const rnd=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};
 for(const world of Object.values(WORLDS))for(const map of world.FLOORS){const {segments}=geometry(map);for(let n=0;n<3000;n++){const x=rnd()*map.width*TILE,y=rnd()*map.height*TILE,a=rnd()*Math.PI*2,max=[40,170,420,1400][n%4],dx=Math.cos(a),dy=Math.sin(a);
  assert.equal(castRay(segments,x,y,dx,dy,max),rayDistance({x,y},dx,dy,segments,max),`${world.id} ${x},${y} ${a}`);rays++;}}
 assert.ok(rays>=9000);
});

test('visión cacheada: mismas entradas devuelven el mismo polígono; al moverse se recalcula',()=>{
 const map=WORLDS.club.FLOORS[0],o={x:map.spawn.x,y:map.spawn.y},first=safeVisibility(map,o,600),again=safeVisibility(map,{...o},600,first);assert.equal(again,first);
 const moved=safeVisibility(map,{x:o.x+3,y:o.y},600,first);assert.notEqual(moved.points,first.points);assert.deepEqual(moved.points,visibilityPolygon(map,{x:o.x+3,y:o.y},600));
 const wider=safeVisibility(map,o,700,first);assert.notEqual(wider.points,first.points);
});
