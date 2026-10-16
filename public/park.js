// Original compact interpretation of the green interior of Campo Grande.
// No exterior street is part of the collision surface.
import {nearestPath,terrainAt} from './park-ground.js';
import {inPolygon} from './visibility.js';
const T=56;
export const BOUNDARY=[[3,15],[23,3],[53,7],[48,22],[37,51],[31,54],[11,32]];
const zone=(id,name,x,y,w,h)=>({id,name,x,y,w,h,color:'#7b9b60',type:'park',zone:true});
const rooms=[zone('lake','Lago',17,9,14,9),zone('kiosk','Quiosco',36,12,9,6),zone('maintenance','Mantenimiento',25,19,6,5),zone('garden','Jardines',14,22,11,8),zone('plaza','Plaza de la fuente',32,23,10,10),zone('grove','Arboleda',22,34,9,8),zone('rose','Rosaleda',28,43,7,6),{id:'park',name:'Campo Grande',hideLabel:true,x:3,y:3,w:50,h:51,color:'#78985b',outline:BOUNDARY}];
export const PATHS=[[[23,7],[14,13],[12,18],[18,24],[20,30],[27,38],[33,49]],[[18,24],[22,21],[29,17],[39,16],[43,19],[42,24],[37,28],[28,29],[18,24]],[[20,30],[29,32],[37,28]],[[27,38],[35,38],[40,33],[37,28]],[[29,17],[28,21],[28,29]],[[14,13],[19,8],[30,7],[39,10],[39,16]],[[33,49],[35,43],[35,38]]];
const props=[],P=(kind,x,y,w,h,extra={})=>props.push({kind:'park-'+kind,x,y,w,h,...extra});
// A stepped shore matches the water's collision footprint. Water transmits light.
const LAKE=[[21,9],[26,9],[28,9.7],[29,11],[30,12],[29.7,14],[28,15.8],[25,16.5],[21,16.4],[19,15],[18,13],[18.3,11],[19.5,9.7]];
for(let y=9;y<16.5;y+=.25){const xs=[];for(const yy of [y+.01,y+.125,Math.min(16.49,y+.24)])for(let i=0,j=LAKE.length-1;i<LAKE.length;j=i++){const a=LAKE[j],b=LAKE[i];if((a[1]>yy)!==(b[1]>yy))xs.push(a[0]+(yy-a[1])*(b[0]-a[0])/(b[1]-a[1]));}if(xs.length)P('water',Math.min(...xs),y,Math.max(...xs)-Math.min(...xs),Math.min(.25,16.5-y));}
P('fountain',36,25,3.4,3.4);P('meeting-table',33.7,29.9,1.5,1.1,{emergencyBadge:true});
// Walk-through service cabins: two side openings, walls provide actual occlusion.
const wall=(x,y,w,h)=>props.push({x,y,w,h,kind:'wall',parkWall:true});
for(const [x,y,w,h] of [[25.4,19.5,5.2,.16],[25.4,23.4,5.2,.16],[25.4,19.5,.16,1],[25.4,22,.16,1.5],[30.44,19.5,.16,1],[30.44,22,.16,1.5],[37,12.5,6,.16],[37,17.4,6,.16],[37,12.5,.16,1.4],[37,16,.16,1.4],[42.84,12.5,.16,1.4],[42.84,16,.16,1.4]])wall(x,y,w,h);
P('workbench',26,19.9,2,.7);P('cabinet',29.3,22.5,.8,.6);P('counter',38,12.9,4,.7);P('shelf',38,16.6,2,.55);
for(const [x,y] of [[13,20],[16,29],[29,30],[39.9,30.5],[31.7,35.5],[34,43],[31,9],[22,18.8]])P('bench',x,y,1.8,.6);
for(const [x,y] of [[14,19],[17,26],[25,28],[39,23],[34,34],[30,40],[36,44],[33,8],[19,20]])P('lamp',x,y,.35,.35);
for(const [x,y] of [[15,20],[30,31],[41,30],[32,41],[36,17]])P('bin',x,y,.55,.65);
P('statue',23,25,1,1.1);P('flowerbed',29,44,1.6,1.2);P('flowerbed',31.5,46,1.6,1.2);P('flowerbed',33,44,1.2,1.2);
const S=(id,room,label,kind,x,y,length='short')=>({id:'park-'+id,room,label,kind,x:x*T,y:y*T,floor:0,theme:'park',length});
export const STATIONS=[S('irrigation','garden','Regular el riego','bath',16,24,'common'),S('seeds','garden','Clasificar semillas','supplies',20,27),S('clean','garden','Limpiar el jardín','trash',15,28),S('lakefilter','lake','Limpiar el filtro del lago','ventilation',30.8,13,'long'),S('lakewater','lake','Comprobar el agua del lago','hydration',21,17.8),S('fountain','plaza','Calibrar la bomba de la fuente','calibrate',39.8,27),S('power','maintenance','Conectar el cuadro del parque','wires',29,21),S('tools','maintenance','Inventariar las herramientas','equipment',26.6,22.1),S('service','kiosk','Registrar el suministro del quiosco','stock',40.3,15),S('cameras','kiosk','Descargar las cámaras del parque','download',38,15,'long'),S('paths','grove','Recoger residuos de los senderos','papers',24,36),S('lighting','grove','Orientar las luces del paseo','lights',29,38),S('flowers','rose','Ajustar el goteo de la rosaleda','bath',30,47.6),S('feed','lake','Preparar el alimento de las aves','stock',17,16.5),S('register','plaza','Ordenar los permisos del parque','folders',34,32)];
const places=[['lake',30.8,11],['garden',17,27],['grove',23,40],['plaza',40,31.5],['rose',34,48],['maintenance',29,22.5],['kiosk',41,16],['north',32,8.5],['south',32,44],['west',12,21.5],['east',42,23],['fountain',34,25]];
export const VENT_GROUPS=[[0,6,7],[1,9,5],[2,4,8],[3,10,11]].map(g=>g.map(i=>'park-hatch-'+places[i][0]));
export const VENTS=places.map(([id,x,y])=>{const key='park-hatch-'+id,n=VENT_GROUPS.findIndex(g=>g.includes(key));return {id:key,x:x*T,y:y*T,floor:0,label:rooms.find(r=>r.id===id)?.name||'Sendero de mantenimiento',network:n+1,links:VENT_GROUPS[n].filter(v=>v!==key)};});
export const REPAIRS=[],DOORS=[],CAMERAS=[{id:'lake',label:'Lago y paseo norte',x:31*T,y:17*T,floor:0},{id:'garden',label:'Jardines y monumento',x:20*T,y:24*T,floor:0},{id:'plaza',label:'Plaza de la fuente',x:37*T,y:29*T,floor:0},{id:'grove',label:'Senderos de la arboleda',x:28*T,y:36*T,floor:0}];
export const CAMERA_CONSOLE={x:38*T,y:15*T,floor:0,room:'kiosk'};
// Dirt spurs connect each objective to the main paths; cabins and the
// fountain square have paved floors. Grass remains strictly non-walkable.
PATHS.push([[22,21],[24,18],[24,21],[28,21],[32,21],[32,18],[35,17]],[[35,17],[35,15],[39,15],[44,15],[43,19]]);
const mainPaths=PATHS.map(p=>p.map(q=>[...q]));
const accessPoints=[...STATIONS,...VENTS,CAMERA_CONSOLE,...CAMERAS];
const WALKABLE={pathRadius:137/112,rects:[{x:25.4,y:19.5,w:5.2,h:4},{x:37,y:12.5,w:6,h:5}],circles:[{x:37.5,y:27.2,r:4.5},...accessPoints.map(p=>({x:p.x/T,y:p.y/T,r:1.45}))]};
for(const p of accessPoints){const point=[p.x/T,p.y/T],near=nearestPath(point,mainPaths);if(Math.hypot(point[0]-near[0],point[1]-near[1])>.15)PATHS.push([near,point]);}
const terrain={walkable:WALKABLE,paths:PATHS};
// Furnishings sit on the planted verge, leaving the full path width free.
for(const p of props.filter(p=>['park-bench','park-bin','park-lamp','park-statue','park-flowerbed'].includes(p.kind))){const cx=p.x+p.w/2,cy=p.y+p.h/2;if(!terrainAt(terrain,cx*T,cy*T))continue;let next=null;for(let r=1.4;r<5&&!next;r+=.4)for(let n=0;n<24;n++){const x=cx+Math.cos(n*Math.PI/12)*r,y=cy+Math.sin(n*Math.PI/12)*r;if(!inPolygon(BOUNDARY,x,y)||inPolygon(LAKE,x,y)||terrainAt(terrain,x*T,y*T)||PATHS.some(path=>path.some((b,i)=>i&&pathDistanceSafe([x,y],path[i-1],b)<1.6+Math.max(p.w,p.h)/2)))continue;next={x:x-p.w/2,y:y-p.h/2};break;}if(next)Object.assign(p,next);}
function pathDistanceSafe(p,a,b){return segment(p,a,b);}

// Reserve all paths and interaction areas before planting trees.
function segment(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dy*t);}
let seed=387;function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
for(let y=4.8;y<53;y+=1.65)for(let x=4.8;x<53;x+=1.65){const xx=x+(rand()-.5)*.4,yy=y+(rand()-.5)*.4;if(!inPolygon(BOUNDARY,xx,yy)||BOUNDARY.some((a,i)=>segment([xx,yy],a,BOUNDARY[(i+1)%BOUNDARY.length])<.45)||terrainAt(terrain,xx*T,yy*T)||inPolygon(LAKE,xx,yy)||props.some(p=>xx>p.x-.25&&xx<p.x+p.w+.25&&yy>p.y-.25&&yy<p.y+p.h+.25))continue;props.push({kind:'wall',parkTree:true,species:'oak',x:xx-.2,y:yy-.18,w:.4,h:.36,crown:1.45+rand()*.25,tint:Math.floor(rand()*4)});}

export const SABOTAGES={lights:{label:'Apagón de farolas',description:'Restablece las farolas desde la Arboleda.',repairKind:'lights'},electrical:{label:'Fallo de suministro',description:'Repara el cuadro en Mantenimiento.',repairKind:'power'},doors:{label:'Fallo de los accesos',description:'Reprograma el controlador del Quiosco.',repairKind:'code'},bell:{label:'Alarma del lago',description:'Recalibra el sensor junto al Lago.',repairKind:'calibrate'},computers:{label:'Riego descontrolado',description:'Regula las válvulas en los Jardines.',repairKind:'bath'},ventilation:{label:'Filtrado detenido',description:'Limpia el filtro de la Rosaleda.',repairKind:'ventilation'},emergency:{label:'Bomba en sobrepresión',description:'Coordina Plaza y Lago en menos de 8 s.',repairKind:'code'}};
export const FLOORS=[{id:'campo-grande',worldId:'park',floor:0,name:'Campo Grande',width:57,height:57,rooms,corridors:[],props,visionWalls:props.filter(p=>p.kind==='wall'),decor:[],doors:[],stations:STATIONS,vents:VENTS,repair:REPAIRS,stairs:[],fence:BOUNDARY,lake:LAKE,paths:PATHS,walkable:WALKABLE,spawn:{x:35*T,y:29*T,floor:0},emergency:{x:34.45*T,y:30.45*T,floor:0}}];
export const MEETING={...FLOORS[0],id:'park-meeting',isMeeting:true};
export const mapFor=()=>FLOORS[0];export const taskStation=t=>STATIONS.find(s=>s.id===t.id);
