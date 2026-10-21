import {CARAVAN} from './caravan.js';
import {floorContains,opaqueAt,geometry,floorBoundary,segmentDistance,exactLineOfSight} from './visibility.js';
// Contenido intercambiable: mapa, estaciones, accesorios y reglas de geometría.
export const TILE = 56;
// 15.1 · Colores principales muy distintos entre sí: cada personaje se
// reconoce de un vistazo por su color, también en movimiento y en reuniones.
export const COLORS = ['#d8343c','#2e5ed6','#1fa34f','#ee6fbf','#f2862a','#f2cf33','#3b404b','#e9eef5','#7b49d6','#8a5531','#30cdd5','#9ad63a'];
export const COLOR_NAMES = ['Rojo','Azul','Verde','Rosa','Naranja','Amarillo','Negro','Blanco','Morado','Marrón','Cian','Lima'];
export {FLOORS,STATIONS,REPAIRS,VENTS,VENT_GROUPS,DOORS,SABOTAGES} from './club.js';
import {FLOORS,MEETING as CLUB_MEETING} from './club.js';
import {worldFor} from './worlds.js';
export {worldFor,WORLDS,mapFor,taskStation,activeRepairs,blockersOf,DEFAULT_WORLD} from './worlds.js';
// El color principal manda: `outfitColor` se conserva por compatibilidad, pero es el mismo.
export function appearanceOf(p){return {name:p.name,color:p.color,hat:p.hat,skin:p.skin,outfitColor:p.color,trimColor:p.trimColor??2,pants:p.pants||0,glasses:p.glasses||0,bag:p.bag||0,accessory:p.accessory||0,hairColor:p.hairColor||0,skinTone:p.skinTone||0,shoes:p.shoes||0,shoeColor:p.shoeColor??7,badge:p.badge||0,pet:p.pet||0,effect:p.effect||0,emote:p.emote||0,nameBg:p.nameBg||0,nameColor:p.nameColor||0};}
export const HATS = ['Sin accesorio','Gorra','Pelo corto','Pelo largo','Rizos','Coleta','Brote','Corona','Gorro de lana','Sombrero','Orejas de gato','Birrete','Sombrero de mago','Boina','Casco de bici','Diadema estrella','Gorro de explorador','Gorro de chef','Casco espacial'];
export const SKINS = ['Polo','Sudadera','Jersey','Camiseta','Chándal','Bata de laboratorio','Americana','Equipación deportiva','Traje de gala','Mono de mecánico','Chaqueta de explorador','Traje espacial'];
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
export const MEETING = CLUB_MEETING;
export const SPEED = 205, RADIUS = 15, USE_RANGE = 100, KILL_RANGE = 90, REPORT_RANGE = 130;
// 15.0 · Sin círculo de visión. Cualquiera ve lo que cabe en su cámara salvo lo
// que tapan las paredes. OPEN_VISION marca la visión abierta; solo un apagón o
// una sobrecarga la reducen a un radio (es la mecánica del sabotaje).
// VIEW_HALF es media pantalla de juego en píxeles del mundo (cámara más alejada).
export const OPEN_VISION = 2000, VIEW_HALF = {x:780,y:470};
export const visionLimited = v => Number.isFinite(v) && v > 0 && v < OPEN_VISION;
export function visionRangeFor(role,sabotageKind,flash=1){
  if(role==='impostor'||!['lights','overload'].includes(sabotageKind))return OPEN_VISION;
  const base=sabotageKind==='lights'?170:280;
  return flash===1?base:Math.round(sabotageKind==='lights'?Math.max(base*2.1,360):base*flash);
}
// ¿Cabe b en la vista de a? Rectángulo de pantalla con visión abierta; radio con apagón.
export function withinSight(a,b,vision=OPEN_VISION){return visionLimited(vision)?Math.hypot(a.x-b.x,a.y-b.y)<=vision:Math.abs(a.x-b.x)<=VIEW_HALF.x&&Math.abs(a.y-b.y)<=VIEW_HALF.y;}
// Objetos de los cofres. Duraciones en ms; `charge` es tiempo acumulado de uso.
export const ITEM_SLOTS=2;
export const ITEMS={
  turbo:{name:'Zapatillas turbo',icon:'👟',mode:'toggle',charge:30000,weight:16,hint:'Corres más rápido mientras están activadas (30 s en total).'},
  flashlight:{name:'Linterna',icon:'🔦',mode:'toggle',charge:30000,weight:16,hint:'Ves más lejos durante los apagones y sobrecargas (30 s en total).'},
  camera:{name:'Cámara portátil',icon:'📷',mode:'camera',charge:30000,weight:10,hint:'Colócala en el suelo y mira por ella cuando quieras (30 s de visión).'},
  decoy:{name:'Clon señuelo',icon:'👥',mode:'once',duration:15000,weight:11,hint:'Crea una copia exacta de ti durante 15 s. Si la atacan, deja un cuerpo falso.'},
  cage:{name:'Jaula portátil',icon:'🪤',mode:'once',duration:30000,range:170,weight:9,hint:'Atrapa durante 30 s a la persona más cercana.'},
  shield:{name:'Escudo protector',icon:'🛡️',mode:'once',duration:30000,weight:12,hint:'Durante 30 s ningún ataque (ni un cuchillo) puede eliminarte. Sirve a cualquiera, también a los impostores. Solo tú lo ves.'},
  knife:{name:'Cuchillo',icon:'🔪',mode:'target',weight:8,hint:'Un solo uso, para cualquier jugador vivo: elimina a quien tengas al alcance, sea del equipo que sea. Se gasta al acertar.'},
  tracker:{name:'Detector de huellas',icon:'👣',mode:'toggle',charge:25000,weight:14,hint:'Muestra las huellas recientes con el color principal de quien pasó (25 s en total). Las paredes las tapan.'}
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
export function solidAt(map,x,y) {return !floorAt(map,x,y)||map.props.some(p=>{const r=p.hit||p;return x>=r.x*TILE&&x<(r.x+r.w)*TILE&&y>=r.y*TILE&&y<(r.y+r.h)*TILE;});}
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
    for(const p of map.props){const r=p.hit||p;
      if(!p.parkGrove&&!p.soft&&px+PROP_PAD>=r.x&&px-PROP_PAD<=r.x+r.w&&py+PROP_PAD>=r.y&&py-PROP_PAD<=r.y+r.h)list.push(r);}
    cells[cy*W+cx]=list;
  }
  index={W,H,cells};
  propIndexCache.set(map.props,index);
  return index;
}
// 15.0 · Los objetos redondos colisionan como un círculo, no con las esquinas
// de su caja: mesas redondas, taburetes, fuentes, templetes, plantas, papeleras.
const ROUND=/roundtable|stool|fountain|bandstand|gazebo|plant|bin$|aviary|birdhouse/;
function roundProp(r){if(r.round!==undefined)return r.round;const k=String(r.kind||''),ratio=r.w/r.h;return r.round=!r.hit&&ROUND.test(k)&&ratio<1.3&&ratio>1/1.3;}
function propTouches(x,y,r){if(roundProp(r)){const cx=(r.x+r.w/2)*TILE,cy=(r.y+r.h/2)*TILE,R=Math.min(r.w,r.h)*TILE/2+RADIUS;return (x-cx)**2+(y-cy)**2<R*R-1e-7;}return circleTouchesRect(x,y,r.x*TILE,r.y*TILE,(r.x+r.w)*TILE,(r.y+r.h)*TILE);}
function propBlocks(map,x,y){
  const index=propIndex(map),cx=Math.floor(x/TILE),cy=Math.floor(y/TILE);
  const list=cx<0||cy<0||cx>=index.W||cy>=index.H?map.props.filter(r=>!r.parkGrove&&!r.soft).map(r=>r.hit||r):index.cells[cy*index.W+cx];
  for(const r of list)if(propTouches(x,y,r))return true;
  return false;
}
// 16.2 · Índice espacial del contorno del suelo: canStand comprobaba TODOS los tramos del
// contorno en cada llamada (cientos), y era lo más caro del servidor al arrancar los bots.
const boundaryIndex=new WeakMap();
function nearBoundary(map,x,y){const segs=floorBoundary(map);let ix=boundaryIndex.get(segs);
 if(!ix){const C=TILE,cells=new Map();for(const s of segs){const x0=Math.floor((Math.min(s.a.x,s.b.x)-RADIUS)/C),x1=Math.floor((Math.max(s.a.x,s.b.x)+RADIUS)/C),y0=Math.floor((Math.min(s.a.y,s.b.y)-RADIUS)/C),y1=Math.floor((Math.max(s.a.y,s.b.y)+RADIUS)/C);for(let cy=y0;cy<=y1;cy++)for(let cx=x0;cx<=x1;cx++){const k=cy*100003+cx;let l=cells.get(k);if(!l)cells.set(k,l=[]);l.push(s);}}ix={C,cells};boundaryIndex.set(segs,ix);}
 const l=ix.cells.get(Math.floor(y/ix.C)*100003+Math.floor(x/ix.C));if(!l)return false;const p={x,y};for(const s of l)if(segmentDistance(p,s)<RADIUS-1e-6)return true;return false;}
// 16.5 · Las salas con contorno diagonal se dibujan por casillas: las esquinas que se ven
// como pared no se pueden pisar (antes el cuerpo podía meterse encima del muro dibujado).
const drawnGrid=new WeakMap();
function onDrawnWall(map,x,y){let g=drawnGrid.get(map.rooms);
 if(g===undefined){const outlined=[...map.rooms,...map.corridors].some(r=>r.outline);g=null;
  if(outlined){const W=Math.ceil(map.width),H=Math.ceil(map.height),cells=new Uint8Array(W*H);const out=[...map.rooms,...map.corridors].filter(r=>r.outline);// 1 = esquina dibujada como pared
  for(let cy=0;cy<H;cy++)for(let cx=0;cx<W;cx++)cells[cy*W+cx]=out.some(r=>cx+1>r.x&&cx<r.x+r.w&&cy+1>r.y&&cy<r.y+r.h)&&!floorContains(map,(cx+.5)*TILE,(cy+.5)*TILE)?1:0;g={W,H,cells};}
  drawnGrid.set(map.rooms,g);}
 if(!g)return false;const d=RADIUS*.7;
 for(const [dx,dy] of [[0,0],[d,d],[-d,d],[d,-d],[-d,-d]]){const cx=Math.floor((x+dx)/TILE),cy=Math.floor((y+dy)/TILE);if(cx>=0&&cy>=0&&cx<g.W&&cy<g.H&&g.cells[cy*g.W+cx])return true;}
 return false;}
export function canStand(map,x,y,ghost=false) {
  const bounds=map.movementBounds;
  if(bounds&&(x<bounds.x*TILE+RADIUS||x>(bounds.x+bounds.w)*TILE-RADIUS||y<bounds.y*TILE+RADIUS||y>(bounds.y+bounds.h)*TILE-RADIUS))return false;
  if(ghost&&map.fence&&(!floorContains(map,x,y)||nearBoundary(map,x,y)))return false;
  if(ghost) return x>RADIUS&&y>RADIUS&&x<map.width*TILE-RADIUS&&y<map.height*TILE-RADIUS;
  if(!floorContains(map,x,y)||nearBoundary(map,x,y)||onDrawnWall(map,x,y))return false;
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
export function roomAt(x,y,floor=0,world='club'){return worldFor(world).roomAt(x,y,floor);}
