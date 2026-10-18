import {terrainFits} from './park-ground.js';
import {CARAVAN} from './caravan.js';
import {floorContains,opaqueAt,geometry,floorBoundary,segmentDistance,exactLineOfSight} from './visibility.js';
// Contenido intercambiable: mapa, estaciones, accesorios y reglas de geometría.
export const TILE = 56;
export const COLORS = ['#61e5c6','#ff7185','#ffc65c','#75aaff','#b594ff','#ff9959','#ec84dc','#b4dd67','#eff4ff','#8aacc4','#171c27'];
export const COLOR_NAMES = ['Menta','Coral','Ámbar','Azul','Violeta','Mandarina','Rosa','Lima','Hielo','Acero','Negro'];
export {FLOORS,STATIONS,REPAIRS,VENTS,VENT_GROUPS,DOORS,SABOTAGES,appearanceOf} from './school.js';
import {FLOORS,SCHOOL_LOBBY} from './school.js';
import {worldFor} from './worlds.js';
export {worldFor,WORLDS,mapFor,taskStation,activeRepairs} from './worlds.js';
export const HATS = ['Sin accesorio','Gorra','Pelo corto','Pelo largo','Rizos','Coleta','Brote','Corona','Gorro de lana','Sombrero','Orejas de gato','Birrete','Sombrero de mago','Boina','Casco de bici','Diadema estrella','Gorro de explorador','Gorro de chef','Casco espacial'];
export const SKINS = ['Uniforme','Sudadera','Jersey','Camiseta','Chándal','Bata de laboratorio','Ropa de profesor','Equipación deportiva','Traje de gala','Mono de mecánico','Chaqueta de explorador','Traje espacial'];
export const PANTS = ['Pantalón largo','Pantalón corto','Vaqueros','Pantalón cargo'];
export const GLASSES = ['Sin gafas','Gafas redondas','Gafas cuadradas','Gafas de sol','Monóculo','Visor panorámico'];
export const BAGS = ['Sin mochila','Mochila','Bandolera','Mochila deportiva'];
export const ACCESSORIES = ['Sin complemento','Corbata','Auriculares','Bufanda','Mascarilla','Pañuelo','Medalla','Pulsera','Estuche','Collar','Máscara de zorro','Máscara de robot','Pajarita','Walkie-talkie'];
export const HAIR_COLORS=['Castaño','Negro','Rubio','Pelirrojo','Blanco','Violeta'];
export const HAIR_PALETTE=['#463127','#18202a','#dfbb6c','#b65332','#e3dfd1','#8960b4'];
export const SKIN_TONES=['Claro','Medio','Moreno','Oscuro','Rosado'];
export const SKIN_PALETTE=['#edc5a7','#d6a27c','#b9825d','#78503f','#edb8af'];
export const SHOES=['Zapatillas','Botas','Deportivas'];
export const BADGES=['Sin parche','Estrella','Rayo','Calavera'];
export {PETS,EFFECTS,EMOTES} from './pass.js';
export const MAP = FLOORS[0];
export const LOBBY = CARAVAN;
export const MEETING = {...SCHOOL_LOBBY,isMeeting:true,props:[...SCHOOL_LOBBY.props,{x:8.65,y:6.65,w:2.7,h:1.3,kind:'meeting-table',emergencyBadge:true}]};
export const SPEED = 205, RADIUS = 15, USE_RANGE = 100, KILL_RANGE = 90, REPORT_RANGE = 130;
// Objetos de los cofres. Duraciones en ms; `charge` es tiempo acumulado de uso.
export const ITEM_SLOTS=2;
export const ITEMS={
  turbo:{name:'Zapatillas turbo',icon:'👟',mode:'toggle',charge:30000,weight:16,hint:'Corres más rápido mientras están activadas (30 s en total).'},
  flashlight:{name:'Linterna',icon:'🔦',mode:'toggle',charge:10000,weight:16,hint:'Visión a través de paredes y sin apagón. 10 s de carga; puedes apagarla y reservarla.'},
  camera:{name:'Cámara portátil',icon:'📷',mode:'camera',charge:30000,weight:10,hint:'Colócala en el suelo y mira por ella cuando quieras (30 s de visión).'},
  decoy:{name:'Clon señuelo',icon:'👥',mode:'once',duration:15000,weight:11,hint:'Crea una copia exacta de ti durante 15 s. Si la atacan, deja un cuerpo falso.'},
  cage:{name:'Jaula portátil',icon:'🪤',mode:'once',duration:30000,range:170,weight:9,hint:'Atrapa durante 30 s a la persona más cercana.'},
  shield:{name:'Escudo protector',icon:'🛡️',mode:'once',duration:30000,weight:12,hint:'Durante 30 s ningún ataque puede eliminarte. Solo tú lo ves.'},
  tracker:{name:'Rastreador de huellas',icon:'👣',mode:'toggle',charge:25000,weight:14,hint:'Muestra las huellas recientes, sin decir de quién son (25 s en total).'}
};
// La jaula deja un margen de ±21 px alrededor del punto donde atrapó.
export const CAGE_HALF=36;
export function cageMap(map,cage){return {...map,movementBounds:{x:(cage.x-CAGE_HALF)/TILE,y:(cage.y-CAGE_HALF)/TILE,w:CAGE_HALF*2/TILE,h:CAGE_HALF*2/TILE}};}
export const GRACE_MS = 30000, RECONNECT_MS = 3500;
// P0 usa el aula pequeña si la partida está limitada a esa planta.
export function detentionMap(map){const area=map.rooms.find(r=>r.id===(map.floor===1?'expelled':'extra'));return area?{...map,movementBounds:area}:map;}
export function zoneAt(map,x,y){return map.rooms.find(r=>x>=r.x*TILE&&x<(r.x+r.w)*TILE&&y>=r.y*TILE&&y<(r.y+r.h)*TILE)?.id||'corridor';}
export function pointInPolygon(points,x,y){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
export function floorAt(map,x,y) {
  return floorContains(map,x,y);
}
export function solidAt(map,x,y) {return !floorAt(map,x,y)||map.props.some(r=>x>=r.x*TILE&&x<(r.x+r.w)*TILE&&y>=r.y*TILE&&y<(r.y+r.h)*TILE);}
// La luz atraviesa el mobiliario. Solo el perímetro del edificio y las puertas
// cerradas actúan como pared; los objetos siguen siendo sólidos al caminar.
export const wallAt=opaqueAt;
function circleTouchesRect(x,y,left,top,right,bottom){
  const dx=x-Math.max(left,Math.min(x,right)),dy=y-Math.max(top,Math.min(y,bottom));
  return dx*dx+dy*dy<RADIUS*RADIUS-1e-7;
}
// Índice espacial del mobiliario. Campo Grande tiene 315 objetos sólidos y cada
// comprobación de apoyo los recorría todos. Se reparten en casillas de una
// baldosa, con el margen del propio cuerpo: en cada consulta se miran los dos o
// tres que de verdad pueden estorbar, y el resultado es el mismo que antes.
const PROP_PAD=RADIUS/TILE+.7072;
const propIndexCache=new WeakMap();
function propIndex(map){
  let index=propIndexCache.get(map.props);
  if(index)return index;
  const W=Math.ceil(map.width)+2,H=Math.ceil(map.height)+2,cells=new Array(W*H);
  for(let cy=0;cy<H;cy++)for(let cx=0;cx<W;cx++){
    const px=cx+.5,py=cy+.5,list=[];
    for(const r of map.props)
      if(!r.parkGrove&&!r.soft&&px+PROP_PAD>=r.x&&px-PROP_PAD<=r.x+r.w&&py+PROP_PAD>=r.y&&py-PROP_PAD<=r.y+r.h)list.push(r);
    cells[cy*W+cx]=list;
  }
  index={W,H,cells};
  propIndexCache.set(map.props,index);
  return index;
}
function propBlocks(map,x,y){
  const index=propIndex(map),cx=Math.floor(x/TILE),cy=Math.floor(y/TILE);
  const list=cx<0||cy<0||cx>=index.W||cy>=index.H?map.props.filter(r=>!r.parkGrove&&!r.soft):index.cells[cy*index.W+cx];
  for(const r of list)if(circleTouchesRect(x,y,r.x*TILE,r.y*TILE,(r.x+r.w)*TILE,(r.y+r.h)*TILE))return true;
  return false;
}
export function canStand(map,x,y,ghost=false) {
  const bounds=map.movementBounds;
  if(bounds&&(x<bounds.x*TILE+RADIUS||x>(bounds.x+bounds.w)*TILE-RADIUS||y<bounds.y*TILE+RADIUS||y>(bounds.y+bounds.h)*TILE-RADIUS))return false;
  if(ghost&&map.fence&&(!floorContains(map,x,y)||floorBoundary(map).some(s=>segmentDistance({x,y},s)<RADIUS-1e-6)))return false;
  if(ghost) return x>RADIUS&&y>RADIUS&&x<map.width*TILE-RADIUS&&y<map.height*TILE-RADIUS;
  if(!terrainFits(map,x,y,RADIUS))return false;
  if(!floorContains(map,x,y)||floorBoundary(map).some(s=>segmentDistance({x,y},s)<RADIUS-1e-6))return false;
  if(propBlocks(map,x,y))return false;
  return true;
}
function slideAxis(map,p,axis,amount,ghost){
  if(!amount)return;
  const origin=p[axis],other=axis==='x'?'y':'x';
  if(canStand(map,axis==='x'?origin+amount:p.x,axis==='y'?origin+amount:p.y,ghost)){p[axis]=origin+amount;return;}
  // Avanzar hasta el contacto evita que los pasos del cliente y el servidor
  // se detengan a distinta distancia de la misma pared.
  let free=0,blocked=1;
  for(let i=0;i<10;i++){const middle=(free+blocked)/2,point=origin+amount*middle;
    if(canStand(map,axis==='x'?point:p[other],axis==='y'?point:p[other],ghost))free=middle;else blocked=middle;
  }
  p[axis]=origin+amount*free;
}
// Si el paso apenas avanza porque un borde oblicuo o curvo lo frena, se desvía
// unos grados hacia el lado libre y se desliza a lo largo del borde en vez de
// quedarse enganchado. Solo acepta puntos transitables.
const STEER=[.35,-.35,.7,-.7,1.05,-1.05,1.35,-1.35];
function steerStep(map,p,dx,dy,ghost){
  const L=Math.hypot(dx,dy);if(!L)return;
  const ox=p.x,oy=p.y;
  slideAxis(map,p,'x',dx,ghost);slideAxis(map,p,'y',dy,ghost);
  const moved=Math.hypot(p.x-ox,p.y-oy);
  if(moved>=L*.6)return;
  let best=null,score=-1;
  for(const a of STEER){const c=Math.cos(a),s=Math.sin(a),sx=dx*c-dy*s,sy=dx*s+dy*c,nx=ox+sx,ny=oy+sy;
    if(!canStand(map,nx,ny,ghost))continue;
    const fwd=(sx*dx+sy*dy)/(L*L);if(fwd>score){score=fwd;best=[nx,ny];}}
  if(best&&score*L>moved+.05){p.x=best[0];p.y=best[1];}
}
export function move(map,p,ax,ay,dt,ghost=false,speedMultiplier=1) {
  const norm=Math.hypot(ax,ay); if(!norm)return p;
  ax/=Math.max(1,norm);ay/=Math.max(1,norm);
  const speed=SPEED*speedMultiplier*(ghost?2:1),steps=Math.max(1,Math.ceil(speed*dt/4)),dx=ax*speed*dt/steps,dy=ay*speed*dt/steps;
  for(let i=0;i<steps;i++)steerStep(map,p,dx,dy,ghost);
  if(ax)p.facing=ax<0?-1:1; return p;
}
export function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
export function insideStairs(p,stair){const a=stair?.area;return !!a&&p.floor===stair.floor&&p.x>=a.x*TILE+RADIUS&&p.x<=(a.x+a.w)*TILE-RADIUS&&p.y>=a.y*TILE+RADIUS&&p.y<=(a.y+a.h)*TILE-RADIUS;}
export function lineOfSight(map,a,b){const d=distance(a,b),steps=Math.ceil(d/12);for(let i=1;i<steps;i++)if(solidAt(map,a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps))return false;return true;}
export const visionLineOfSight=exactLineOfSight;
export function roomAt(x,y,floor=0,world='school'){return worldFor(world).roomAt(x,y,floor);}
