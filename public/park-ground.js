// One terrain model for server movement, client prediction and painting.
const T=56;
export function pathDistance(x,y,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t);}
// Índice espacial del terreno.
//
// Campo Grande define su suelo con unos dos mil tramos de sendero trazados
// sobre la vista aérea, más el paseo, sus pasos, las plazas y los juegos.
// `terrainFits` comprueba trece puntos por consulta, así que recorrer todas las
// figuras en cada paso sería inasumible. El índice reparte las figuras en
// casillas de una baldosa y guarda en cada una solo las que pueden afectarla,
// con el margen de la media diagonal. Se construye recorriendo cada figura y
// solo las casillas de su caja, no todas las casillas contra todas las figuras.
// El resultado es idéntico al de la comprobación completa.
const HALF_CELL=.7072;
const terrainIndexCache=new WeakMap();
function terrainIndex(map){
 const g=map.walkable;
 let index=terrainIndexCache.get(g);
 if(index)return index;
 // Durante la construcción del mapa todavía no hay tamaño: entonces no hay
 // índice y se comprueba el terreno entero, como siempre.
 if(!Number.isFinite(map.width)||!Number.isFinite(map.height))return null;
 const W=Math.ceil(map.width)+2,H=Math.ceil(map.height)+2,cells=new Array(W*H);
 for(let i=0;i<cells.length;i++)cells[i]={rects:[],circles:[],lines:[]};
 const cover=(x0,y0,x1,y1,fn)=>{for(let cy=Math.max(0,Math.floor(y0-HALF_CELL));cy<=Math.min(H-1,Math.floor(y1+HALF_CELL));cy++)for(let cx=Math.max(0,Math.floor(x0-HALF_CELL));cx<=Math.min(W-1,Math.floor(x1+HALF_CELL));cx++)fn(cells[cy*W+cx],cx+.5,cy+.5);};
 for(const r of g.rects)cover(r.x,r.y,r.x+r.w,r.y+r.h,(cell,px,py)=>{if(px+HALF_CELL>=r.x&&px-HALF_CELL<=r.x+r.w&&py+HALF_CELL>=r.y&&py-HALF_CELL<=r.y+r.h)cell.rects.push(r);});
 for(const c of g.circles)cover(c.x-c.r,c.y-c.r,c.x+c.r,c.y+c.r,(cell,px,py)=>{if(Math.hypot(px-c.x,py-c.y)<=c.r+HALF_CELL)cell.circles.push(c);});
 const segments=[],R=g.pathRadius;
 for(const path of map.paths||[])for(let i=1;i<path.length;i++)segments.push([path[i-1],path[i]]);
 for(const s of segments)cover(Math.min(s[0][0],s[1][0])-R,Math.min(s[0][1],s[1][1])-R,Math.max(s[0][0],s[1][0])+R,Math.max(s[0][1],s[1][1])+R,(cell,px,py)=>{if(pathDistance(px,py,s[0],s[1])<=R+HALF_CELL)cell.lines.push(s);});
 index={W,H,cells,segments};
 terrainIndexCache.set(g,index);
 return index;
}
export function terrainAt(map,x,y){
 const g=map.walkable;if(!g)return true;
 x/=T;y/=T;
 const index=terrainIndex(map),cx=Math.floor(x),cy=Math.floor(y);
 // Sin índice, o fuera de él, se comprueba entero: el resultado nunca depende
 // del atajo, solo el número de comprobaciones.
 if(!index||cx<0||cy<0||cx>=index.W||cy>=index.H)
  return g.rects.some(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h)||g.circles.some(p=>Math.hypot(x-p.x,y-p.y)<=p.r)||(map.paths||[]).some(path=>path.some((b,i)=>i&&pathDistance(x,y,path[i-1],b)<=g.pathRadius));
 const cell=index.cells[cy*index.W+cx];
 return cell.rects.some(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h)
  ||cell.circles.some(p=>Math.hypot(x-p.x,y-p.y)<=p.r)
  ||cell.lines.some(s=>pathDistance(x,y,s[0],s[1])<=g.pathRadius);
}
export function terrainFits(map,x,y,radius=15){if(!map.walkable)return true;if(!terrainAt(map,x,y))return false;for(let i=0;i<12;i++){const a=i*Math.PI/6;if(!terrainAt(map,x+Math.cos(a)*radius,y+Math.sin(a)*radius))return false;}return true;}
export function nearestPath(point,paths){let best=null,distance=Infinity;for(const path of paths)for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/(dx*dx+dy*dy))),q=[a[0]+dx*t,a[1]+dy*t],d=Math.hypot(point[0]-q[0],point[1]-q[1]);if(d<distance){distance=d;best=q;}}return best;}
