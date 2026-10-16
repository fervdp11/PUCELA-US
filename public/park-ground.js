// One terrain model for server movement, client prediction and painting.
const T=56;
export function pathDistance(x,y,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t);}
export function terrainAt(map,x,y){const g=map.walkable;if(!g)return true;x/=T;y/=T;return g.rects.some(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h)||g.circles.some(p=>Math.hypot(x-p.x,y-p.y)<=p.r)||map.paths.some(path=>path.some((b,i)=>i&&pathDistance(x,y,path[i-1],b)<=g.pathRadius));}
export function terrainFits(map,x,y,radius=15){if(!map.walkable)return true;if(!terrainAt(map,x,y))return false;for(let i=0;i<12;i++){const a=i*Math.PI/6;if(!terrainAt(map,x+Math.cos(a)*radius,y+Math.sin(a)*radius))return false;}return true;}
export function nearestPath(point,paths){let best=null,distance=Infinity;for(const path of paths)for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/(dx*dx+dy*dy))),q=[a[0]+dx*t,a[1]+dy*t],d=Math.hypot(point[0]-q[0],point[1]-q[1]);if(d<distance){distance=d;best=q;}}return best;}
