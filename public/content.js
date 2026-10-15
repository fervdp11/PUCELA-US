// Contenido intercambiable: mapa, estaciones, accesorios y reglas de geometría.
export const TILE = 56;
export const COLORS = ['#61e5c6','#ff7185','#ffc65c','#75aaff','#b594ff','#ff9959','#ec84dc','#b4dd67','#eff4ff','#8aacc4','#171c27'];
export const COLOR_NAMES = ['Menta','Coral','Ámbar','Azul','Violeta','Mandarina','Rosa','Lima','Hielo','Acero','Negro'];
export {FLOORS,STATIONS,REPAIRS,VENTS,VENT_GROUPS,DOORS,SABOTAGES,appearanceOf} from './school.js';
import {FLOORS,SCHOOL_LOBBY} from './school.js';
import {worldFor} from './worlds.js';
export {worldFor,WORLDS,mapFor,taskStation} from './worlds.js';
export const HATS = ['Sin accesorio','Gorra','Pelo corto','Pelo largo','Rizos','Coleta','Brote','Corona','Gorro de lana','Sombrero','Orejas de gato','Birrete','Sombrero de mago','Boina','Casco de bici','Diadema estrella'];
export const SKINS = ['Uniforme','Sudadera','Jersey','Camiseta','Chándal','Bata de laboratorio','Ropa de profesor','Equipación deportiva','Traje de gala','Mono de mecánico'];
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
export const MAP = FLOORS[0];
export const LOBBY = SCHOOL_LOBBY;
export const MEETING = {...LOBBY,isMeeting:true,props:[...LOBBY.props,{x:8.65,y:6.65,w:2.7,h:1.3,kind:'meeting-table'}]};
export const SPEED = 205, RADIUS = 15, USE_RANGE = 100, KILL_RANGE = 90, REPORT_RANGE = 130;
export const GRACE_MS = 30000, RECONNECT_MS = 3500;
// P0 usa el aula pequeña si la partida está limitada a esa planta.
export function detentionMap(map){const area=map.rooms.find(r=>r.id===(map.floor===1?'expelled':'extra'));return area?{...map,movementBounds:area}:map;}
export function zoneAt(map,x,y){return map.rooms.find(r=>x>=r.x*TILE&&x<(r.x+r.w)*TILE&&y>=r.y*TILE&&y<(r.y+r.h)*TILE)?.id||'corridor';}
export function pointInPolygon(points,x,y){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
export function floorAt(map,x,y) {
  const tx=Math.floor(x/TILE),ty=Math.floor(y/TILE);
  for(const r of map.rooms)if(tx>=r.x&&tx<r.x+r.w&&ty>=r.y&&ty<r.y+r.h&&(!r.outline||pointInPolygon(r.outline,x/TILE,y/TILE)))return true;
  for(const r of map.corridors)if(tx>=r.x&&tx<r.x+r.w&&ty>=r.y&&ty<r.y+r.h)return true;
  return false;
}
export function solidAt(map,x,y) {return !floorAt(map,x,y)||map.props.some(r=>x>=r.x*TILE&&x<(r.x+r.w)*TILE&&y>=r.y*TILE&&y<(r.y+r.h)*TILE);}
// La luz atraviesa el mobiliario. Solo el perímetro del edificio y las puertas
// cerradas actúan como pared; los objetos siguen siendo sólidos al caminar.
export function wallAt(map,x,y){return !floorAt(map,x,y)||(map.visionWalls||map.props||[]).some(r=>(r.kind==='wall'||r.kind==='closed-door')&&x>=r.x*TILE&&x<(r.x+r.w)*TILE&&y>=r.y*TILE&&y<(r.y+r.h)*TILE);}
function circleTouchesRect(x,y,left,top,right,bottom){
  const dx=x-Math.max(left,Math.min(x,right)),dy=y-Math.max(top,Math.min(y,bottom));
  return dx*dx+dy*dy<RADIUS*RADIUS-1e-7;
}
export function canStand(map,x,y,ghost=false) {
  const bounds=map.movementBounds;
  if(bounds&&(x<bounds.x*TILE+RADIUS||x>(bounds.x+bounds.w)*TILE-RADIUS||y<bounds.y*TILE+RADIUS||y>(bounds.y+bounds.h)*TILE-RADIUS))return false;
  if(ghost) return x>RADIUS&&y>RADIUS&&x<map.width*TILE-RADIUS&&y<map.height*TILE-RADIUS;
  const minX=Math.floor((x-RADIUS)/TILE),maxX=Math.floor((x+RADIUS)/TILE),minY=Math.floor((y-RADIUS)/TILE),maxY=Math.floor((y+RADIUS)/TILE);
  for(let ty=minY;ty<=maxY;ty++)for(let tx=minX;tx<=maxX;tx++){
    if((tx<0||ty<0||tx>=map.width||ty>=map.height||!floorAt(map,(tx+.5)*TILE,(ty+.5)*TILE))&&circleTouchesRect(x,y,tx*TILE,ty*TILE,(tx+1)*TILE,(ty+1)*TILE))return false;
  }
  for(const r of map.props)if(circleTouchesRect(x,y,r.x*TILE,r.y*TILE,(r.x+r.w)*TILE,(r.y+r.h)*TILE))return false;
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
export function move(map,p,ax,ay,dt,ghost=false,speedMultiplier=1) {
  const norm=Math.hypot(ax,ay); if(!norm)return p;
  ax/=Math.max(1,norm);ay/=Math.max(1,norm);
  const speed=SPEED*speedMultiplier*(ghost?2:1),steps=Math.max(1,Math.ceil(speed*dt/4)),dx=ax*speed*dt/steps,dy=ay*speed*dt/steps;
  for(let i=0;i<steps;i++){slideAxis(map,p,'x',dx,ghost);slideAxis(map,p,'y',dy,ghost);}
  if(ax)p.facing=ax<0?-1:1; return p;
}
export function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
export function insideStairs(p,stair){const a=stair?.area;return !!a&&p.floor===stair.floor&&p.x>=a.x*TILE+RADIUS&&p.x<=(a.x+a.w)*TILE-RADIUS&&p.y>=a.y*TILE+RADIUS&&p.y<=(a.y+a.h)*TILE-RADIUS;}
export function lineOfSight(map,a,b){const d=distance(a,b),steps=Math.ceil(d/12);for(let i=1;i<steps;i++)if(solidAt(map,a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps))return false;return true;}
export function visionLineOfSight(map,a,b){const d=distance(a,b),steps=Math.max(1,Math.ceil(d/5));for(let i=1;i<steps;i++)if(wallAt(map,a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps))return false;return true;}
export function roomAt(x,y,floor=0,world='school'){return worldFor(world).roomAt(x,y,floor);}
