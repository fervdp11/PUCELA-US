// Shared exact geometry in world pixels. Furniture never blocks light.
const T=56,EPS=1e-7,cache=new WeakMap();
const closedDoorMaps=new WeakMap();
// Stable geometry identity lets collision and visibility indexes survive frames.
// Keep a bounded number of variants, shared by all rooms using the same map.
export function withClosedDoors(base,closed=[]){
 if(!closed.length)return base;
 let variants=closedDoorMaps.get(base);if(!variants)closedDoorMaps.set(base,variants=new Map());
 const key=JSON.stringify([...new Set(closed)].sort());if(variants.has(key))return variants.get(key);
 const ids=new Set(closed),extra=base.doors.filter(d=>ids.has(d.id)).map(d=>({...d,kind:'closed-door'}));
 if(!extra.length)return base;
 const map={...base,navigationBase:base,props:[...base.props,...extra],visionWalls:[...base.visionWalls,...extra]};
 if(variants.size>=12)variants.delete(variants.keys().next().value);variants.set(key,map);return map;
}
const cross=(x,y,a,b)=>x*b-y*a;
export function inPolygon(poly,x,y){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
// Sin copiar salas y pasillos en un array nuevo por consulta (se llama cientos de veces por fotograma).
const inFloor=(r,x,y)=>x>=r.x*T&&x<(r.x+r.w)*T&&y>=r.y*T&&y<(r.y+r.h)*T&&(!r.outline||inPolygon(r.outline,x/T,y/T));
export function floorContains(map,x,y){for(const r of map.rooms)if(inFloor(r,x,y))return true;for(const r of map.corridors)if(inFloor(r,x,y))return true;return false;}
const isWall=r=>r.kind==='wall'||r.kind==='closed-door';
// Solo recorre los muros (lista memorizada por wallSet), no los ~300 objetos del mapa.
export function opaqueAt(map,x,y){if(!floorContains(map,x,y))return true;for(const r of wallSet(map.visionWalls||map.props||[]).walls)if(x>=r.x*T&&x<=(r.x+r.w)*T&&y>=r.y*T&&y<=(r.y+r.h)*T)return true;return false;}
function edges(poly){return poly.map((a,i)=>({a:{x:a[0]*T,y:a[1]*T},b:{x:poly[(i+1)%poly.length][0]*T,y:poly[(i+1)%poly.length][1]*T}}));}
const rect=r=>[[r.x,r.y],[r.x+r.w,r.y],[r.x+r.w,r.y+r.h],[r.x,r.y+r.h]];
export function segmentDistance(p,s){const x=s.b.x-s.a.x,y=s.b.y-s.a.y,t=Math.max(0,Math.min(1,((p.x-s.a.x)*x+(p.y-s.a.y)*y)/(x*x+y*y)));return Math.hypot(p.x-s.a.x-t*x,p.y-s.a.y-t*y);}
function boundary(raw,free){const out=[],seen=new Set();for(const s of raw){const dx=s.b.x-s.a.x,dy=s.b.y-s.a.y,len=Math.hypot(dx,dy),cuts=[0,1];if(len<EPS)continue;for(const q of raw){const ex=q.b.x-q.a.x,ey=q.b.y-q.a.y,ax=q.a.x-s.a.x,ay=q.a.y-s.a.y,den=cross(dx,dy,ex,ey);if(Math.abs(den)>EPS){const t=cross(ax,ay,ex,ey)/den,u=cross(ax,ay,dx,dy)/den;if(t>EPS&&t<1-EPS&&u>=-EPS&&u<=1+EPS)cuts.push(t);}else if(Math.abs(cross(ax,ay,dx,dy))<EPS){for(const p of [q.a,q.b]){const t=((p.x-s.a.x)*dx+(p.y-s.a.y)*dy)/(len*len);if(t>EPS&&t<1-EPS)cuts.push(t);}}}cuts.sort((a,b)=>a-b);for(let i=1;i<cuts.length;i++){const l=cuts[i-1],r=cuts[i];if(r-l<EPS)continue;const mid=(l+r)/2,x=s.a.x+dx*mid,y=s.a.y+dy*mid,nx=-dy/len*.0001,ny=dx/len*.0001;if(free(x+nx,y+ny)===free(x-nx,y-ny))continue;const a={x:s.a.x+dx*l,y:s.a.y+dy*l},b={x:s.a.x+dx*r,y:s.a.y+dy*r},key=[a,b].map(p=>`${p.x.toFixed(5)},${p.y.toFixed(5)}`).sort().join(':');if(!seen.has(key)){seen.add(key);out.push({a,b,minX:Math.min(a.x,b.x),maxX:Math.max(a.x,b.x),minY:Math.min(a.y,b.y),maxY:Math.max(a.y,b.y)});}}}return out;}
// La clave de los muros se recalculaba en cada fotograma: filtrar 315 objetos y
// construir una cadena con todos ellos, sesenta veces por segundo. El conjunto
// de muros solo cambia cuando cambia el array que los contiene —al cerrarse una
// puerta el mapa trae otro—, así que la clave se memoriza junto a ese array.
const wallKeyCache=new WeakMap();
function wallSet(source){
 let entry=wallKeyCache.get(source);
 if(!entry){const walls=source.filter(isWall);entry={walls,key:walls.map(w=>`${w.x},${w.y},${w.w},${w.h}`).join(';')};wallKeyCache.set(source,entry);}
 return entry;
}
export function geometry(map){let variants=cache.get(map.rooms);if(!variants){variants=new Map();cache.set(map.rooms,variants);}const {walls,key}=wallSet(map.visionWalls||map.props||[]);if(variants.has(key))return variants.get(key);const floors=[...map.rooms,...map.corridors].flatMap(r=>edges(r.outline||rect(r))),floorEdges=variants.get('floor')||boundary(floors,(x,y)=>floorContains(map,x,y));variants.set('floor',floorEdges);const segments=walls.length?boundary([...floorEdges,...walls.flatMap(r=>edges(rect(r)))],(x,y)=>!opaqueAt(map,x,y)):floorEdges;const g={segments,floorEdges};if(variants.size>12){for(const k of variants.keys())if(k!=='floor'){variants.delete(k);break;}}variants.set(key,g);return g;}
// Movement only needs the immutable floor outline, not a rebuilt wall-key string.
export function floorBoundary(map){return cache.get(map.rooms)?.get('floor')||geometry(map).floorEdges;}
// Índice espacial de los segmentos: rejilla uniforme (CSR en arrays tipados) recorrida por
// el rayo celda a celda (DDA). El rayo se detiene en cuanto la siguiente celda empieza más
// lejos que el impacto más cercano ya encontrado (con 1 px de margen), así que el resultado
// es exactamente el mismo mínimo que recorrer todos los segmentos, con las mismas
// operaciones en coma flotante. Cada segmento se registra en las celdas de su caja ampliada
// 1 px, para cubrir la tolerancia de los extremos y los impactos justo en el borde de celda.
const CELL=128,grids=new WeakMap();
function gridOf(segments){let g=grids.get(segments);if(g)return g;const n=segments.length;let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
 const ax=new Float64Array(n),ay=new Float64Array(n),ex=new Float64Array(n),ey=new Float64Array(n),mnx=new Float64Array(n),mxx=new Float64Array(n),mny=new Float64Array(n),mxy=new Float64Array(n);
 segments.forEach((s,i)=>{ax[i]=s.a.x;ay[i]=s.a.y;ex[i]=s.b.x-s.a.x;ey[i]=s.b.y-s.a.y;mnx[i]=s.minX;mxx[i]=s.maxX;mny[i]=s.minY;mxy[i]=s.maxY;x0=Math.min(x0,s.minX);y0=Math.min(y0,s.minY);x1=Math.max(x1,s.maxX);y1=Math.max(y1,s.maxY);});
 if(!n){x0=y0=0;x1=y1=1;}x0-=2;y0-=2;const cols=Math.max(1,Math.ceil((x1+2-x0)/CELL)),rows=Math.max(1,Math.ceil((y1+2-y0)/CELL)),start=new Int32Array(cols*rows+1);
 const span=(i,f)=>{const c0=Math.max(0,Math.floor((mnx[i]-1-x0)/CELL)),c1=Math.min(cols-1,Math.floor((mxx[i]+1-x0)/CELL)),r0=Math.max(0,Math.floor((mny[i]-1-y0)/CELL)),r1=Math.min(rows-1,Math.floor((mxy[i]+1-y0)/CELL));for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++)f(r*cols+c);};
 for(let i=0;i<n;i++)span(i,k=>start[k+1]++);for(let k=0;k<cols*rows;k++)start[k+1]+=start[k];const fill=start.slice(0,-1),items=new Int32Array(start[cols*rows]);for(let i=0;i<n;i++)span(i,k=>{items[fill[k]++]=i;});
 g={n,x0,y0,cols,rows,start,items,ax,ay,ex,ey,mnx,mxx,mny,mxy,stamp:new Uint32Array(n),mark:0};grids.set(segments,g);return g;}
// Misma prueba que rayDistance (incluido su filtro por caja) sobre el segmento i del índice.
function hitIndexed(g,i,ox,oy,dx,dy,max,near){if(g.mnx[i]>ox+max||g.mxx[i]<ox-max||g.mny[i]>oy+max||g.mxy[i]<oy-max)return near;const ex=g.ex[i],ey=g.ey[i],ax=g.ax[i]-ox,ay=g.ay[i]-oy,den=cross(dx,dy,ex,ey);if(Math.abs(den)<1e-10)return near;const t=cross(ax,ay,ex,ey)/den,u=cross(ax,ay,dx,dy)/den;if(t>=-EPS&&u>=-EPS&&u<=1+EPS&&t<near)return Math.max(0,t);return near;}
export function castRay(segments,ox,oy,dx,dy,max){const g=gridOf(segments);let near=max;if(++g.mark>=0xffffffff){g.stamp.fill(0);g.mark=1;}const mark=g.mark,{x0,y0,cols,rows,start,items,stamp}=g;
 let cx=Math.floor((ox-x0)/CELL),cy=Math.floor((oy-y0)/CELL);
 if(!(cx>=0&&cy>=0&&cx<cols&&cy<rows)){for(let i=0;i<g.n;i++)near=hitIndexed(g,i,ox,oy,dx,dy,max,near);return near;}// origen fuera de la rejilla: recorrido completo
 const sx=dx>0?1:dx<0?-1:0,sy=dy>0?1:dy<0?-1:0,tdx=sx?CELL/Math.abs(dx):Infinity,tdy=sy?CELL/Math.abs(dy):Infinity;
 let tx=sx>0?(x0+(cx+1)*CELL-ox)/dx:sx<0?(x0+cx*CELL-ox)/dx:Infinity,ty=sy>0?(y0+(cy+1)*CELL-oy)/dy:sy<0?(y0+cy*CELL-oy)/dy:Infinity;
 for(;;){const k=cy*cols+cx;for(let j=start[k],e=start[k+1];j<e;j++){const i=items[j];if(stamp[i]===mark)continue;stamp[i]=mark;near=hitIndexed(g,i,ox,oy,dx,dy,max,near);}
  const next=Math.min(tx,ty);if(next>near+1)break;if(tx<ty){cx+=sx;tx+=tdx;if(cx<0||cx>=cols)break;}else{cy+=sy;ty+=tdy;if(cy<0||cy>=rows)break;}}
 return near;}
export function rayDistance(origin,dx,dy,segments,max){let near=max;for(const s of segments){if(s.minX>origin.x+max||s.maxX<origin.x-max||s.minY>origin.y+max||s.maxY<origin.y-max)continue;const ex=s.b.x-s.a.x,ey=s.b.y-s.a.y,ax=s.a.x-origin.x,ay=s.a.y-origin.y,den=cross(dx,dy,ex,ey);if(Math.abs(den)<1e-10)continue;const t=cross(ax,ay,ex,ey)/den,u=cross(ax,ay,dx,dy)/den;if(t>=-EPS&&u>=-EPS&&u<=1+EPS&&t<near)near=Math.max(0,t);}return near;}
export function exactLineOfSight(map,a,b){if(opaqueAt(map,a.x,a.y)||opaqueAt(map,b.x,b.y))return false;const d=Math.hypot(b.x-a.x,b.y-a.y);return d<EPS||castRay(geometry(map).segments,a.x,a.y,(b.x-a.x)/d,(b.y-a.y)/d,d)>=d-1e-5;}
// Los extremos compartidos por dos segmentos daban ángulos repetidos (rayos idénticos): se
// ordenan en un Float64Array y se descartan los iguales, igual que los puntos consecutivos repetidos. Cada rayo usa el índice espacial.
export function visibilityPolygon(map,origin,radius){if(!Number.isFinite(origin.x+origin.y+radius)||radius<=0)return [];const all=geometry(map).segments,ox=origin.x,oy=origin.y;let n=0;
 const near=[];for(const s of all)if(s.minX<=ox+radius&&s.maxX>=ox-radius&&s.minY<=oy+radius&&s.maxY>=oy-radius)near.push(s);
 const angles=new Float64Array(128+near.length*6);for(let i=0;i<128;i++)angles[n++]=i*Math.PI*2/128-Math.PI;
 for(const s of near)for(const p of [s.a,s.b]){const a=Math.atan2(p.y-oy,p.x-ox);for(const e of [-1e-7,0,1e-7])angles[n++]=Math.atan2(Math.sin(a+e),Math.cos(a+e));}
 angles.sort();const points=[];let last=NaN;
 for(let i=0;i<n;i++){const a=angles[i];if(a===last)continue;last=a;const dx=Math.cos(a),dy=Math.sin(a),d=castRay(all,ox,oy,dx,dy,radius),x=ox+dx*d,y=oy+dy*d,q=points[points.length-1];if(!q||q.x!==x||q.y!==y)points.push({x,y});}return points;}
export function drawVisibilityDebug(c,map,origin,points){c.save();c.lineWidth=1;c.strokeStyle='#ffbe5b';for(const s of geometry(map).segments){c.beginPath();c.moveTo(s.a.x,s.a.y);c.lineTo(s.b.x,s.b.y);c.stroke();}c.strokeStyle='#6dffc244';for(const p of points){c.beginPath();c.moveTo(origin.x,origin.y);c.lineTo(p.x,p.y);c.stroke();}c.restore();}
// Keep the last valid mask if a transient invalid frame arrives. Never reveal
// the whole floor or paint an empty polygon across the screen.
// Con las mismas entradas (geometría, posición y radio) el polígono es el mismo: se
// reutiliza el del fotograma anterior en vez de lanzar de nuevo cientos de rayos.
export function safeVisibility(map,origin,radius,previous=null){const shape=geometry(map),input=previous?.input;if(input&&previous.shape===shape&&input.x===origin.x&&input.y===origin.y&&input.r===radius)return previous;const out=safeVisibilityFresh(map,shape,origin,radius,previous);out.input={x:origin.x,y:origin.y,r:radius};return out;}
function safeVisibilityFresh(map,shape,origin,radius,previous){let points=visibilityPolygon(map,origin,radius);const valid=p=>p.length>=3&&p.every(v=>Number.isFinite(v.x+v.y))&&Math.abs(p.reduce((n,v,i)=>{const q=p[(i+1)%p.length];return n+v.x*q.y-q.x*v.y;},0))>8;if(!opaqueAt(map,origin.x,origin.y)&&valid(points))return {shape,points,origin:{...origin},recovered:false};if(previous?.shape===shape&&valid(previous.points))return {...previous,recovered:true};if(Number.isFinite(origin.x+origin.y)){for(let d=4;d<=96;d+=4)for(let i=0;i<16;i++){const p={x:origin.x+Math.cos(i*Math.PI/8)*d,y:origin.y+Math.sin(i*Math.PI/8)*d};if(opaqueAt(map,p.x,p.y))continue;points=visibilityPolygon(map,p,radius);if(valid(points))return {shape,points,origin:p,recovered:true};}}const x=Number.isFinite(origin.x)?origin.x:0,y=Number.isFinite(origin.y)?origin.y:0;points=Array.from({length:16},(_,i)=>({x:x+Math.cos(i*Math.PI/8)*8,y:y+Math.sin(i*Math.PI/8)*8}));return {shape,points,origin:{x,y},recovered:true};}
