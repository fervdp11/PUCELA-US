import {drawNameTag} from './pass.js';
import {drawHouseFloor,drawPet as drawAnimal} from './house-art.js';
import {drawItemsWorld,drawCage,drawShield} from './items-ui.js';
import {drawGymFloor,drawGymAmbient} from './gym-art.js';
import {activeRepairs} from './worlds.js';
import {mechanicsFor,PASSAGE_RANGE,HIDE_RANGE,SWITCH_RANGE} from './map-mechanics.js';
import {drawCaravanInterior,drawCaravanProp,drawCaravanActivity,drawCaravanScenery,LOBBY_OBJECTS,drawLobbyHalo,nearestLobbyObject} from './caravan.js';
import {safeVisibility,drawVisibilityDebug} from './visibility.js';
import {drawVents,drawActorInteraction,drawDevice,drawHostOutline,drawVentArrows,silhouetteOutline} from './interactions.js';
import {drawBody,drawKillScene} from './eliminations.js';
import {drawClubFloor,drawVolumeProp,drawClubAmbient,propHeight,drawWallVolume,wallTheme,wallVolumeRect,WALL_H,drawFloorDetail,drawVoid,drawArchitecture,boundaryWall,archSurfaces,archTheme} from './scenery.js';
import {USE_RANGE,worldFor,floorAt,TILE,MAP,LOBBY,MEETING,FLOORS,STATIONS,REPAIRS,COLORS,SKIN_PALETTE,taskStation,mapFor,wallAt,visionLineOfSight,distance,insideStairs,lineOfSight,visionLimited,blockersOf} from './content.js';
import {sabotageDestination} from './navigation.js';
import {exteriorCells as exteriorCellsOf} from './exterior.js';
import {drawExterior,drawExteriorCars,paintExteriorInto,exteriorTheme,drawSchoolMainDoor} from './exterior.js';
import {drawRobot,setShadows} from './characters.js';
export {robotSVG,drawAvatar,drawHero,drawRobot} from './characters.js';
let caches=new WeakMap(),floorCaches=new WeakMap(),cachedWorld=null,mapGeneration=0;
const visionFrames=new WeakMap(),mapSurfaces=new Set();
function selectWorldCache(map){const id=map.isCaravan?'caravan':map.worldId||'school';if(cachedWorld===id)return;cachedWorld=id;mapGeneration++;for(const surface of mapSurfaces){if(typeof surface.close==='function')surface.close();else{surface.width=1;surface.height=1;}}mapSurfaces.clear();caches=new WeakMap();floorCaches=new WeakMap();miniCaches=new WeakMap();cameraPlates=new WeakMap();}
function freezeMap(canvas,cache,key){const generation=mapGeneration;freezeSurface(canvas,bitmap=>{if(generation!==mapGeneration){bitmap.close?.();return;}mapSurfaces.add(bitmap);if(cache.get(key)===canvas)cache.set(key,bitmap);});}
function freezeSurface(canvas,commit){if(typeof createImageBitmap==='function')createImageBitmap(canvas).then(commit).catch(()=>{});}
function rr(c,x,y,w,h,r,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}}
function text(c,txt,x,y,size=13,color='#eff5e9'){c.fillStyle=color;c.font=`700 ${size}px Segoe UI`;c.textAlign='center';c.fillText(txt,x,y);}
// Las etiquetas se dibujan en espacio de pantalla, a tamaño fijo y en píxel entero:
// con la escala de la cámara (<1) el texto quedaba submuestreado y borroso.
let tagDpr=1;function nameTag(c,txt,x,y,color,o={}){const m=c.getTransform?.();if(!m||typeof m.a!=='number'){drawNameTag(c,txt,x,y,{...o,fallback:color,time:performance.now()});return;}const d=tagDpr,sx=(m.a*x+m.c*y+m.e)/d,sy=(m.b*x+m.d*y+m.f)/d,k=Math.max(.8,Math.min(1.15,Math.hypot(m.a,m.b)/d));c.save();c.setTransform(d,0,0,d,0,0);drawNameTag(c,txt,Math.round(sx),Math.round(sy),{...o,size:Math.round(13*k),fallback:color,time:performance.now()});c.restore();}
export function characterVisible(map,viewer,target,radius){
 // El cuerpo es un sprite vertical sobre sus pies. Intersectamos su caja
 // con el mismo círculo mundial que se dibuja, sin radio/sala adicionales.
 const x=Math.max(target.x-27,Math.min(viewer.x,target.x+27)),y=Math.max(target.y-92,Math.min(viewer.y,target.y+10));
 return Math.hypot(viewer.x-x,viewer.y-y)<=radius&&visionLineOfSight(map,viewer,target);
}
let hallGlowSprite=null;
function hallGlow(){if(hallGlowSprite)return hallGlowSprite;const k=document.createElement('canvas');k.width=k.height=104;const g=k.getContext('2d'),glow=g.createRadialGradient(52,52,2,52,52,52);glow.addColorStop(0,'rgba(246,240,170,1)');glow.addColorStop(1,'rgba(246,240,170,0)');g.fillStyle=glow;g.fillRect(0,0,104,104);hallGlowSprite=k;
 // Como los mapas, el sprite se congela en un ImageBitmap: dibujar un lienzo
 // dentro de otro obliga al navegador a vaciar su cola de dibujo cada vez.
 freezeSurface(k,bitmap=>{hallGlowSprite=bitmap;});return k;}
// Tamaño del lienzo sin forzar un cálculo de estilos y diseño en cada
// fotograma: getBoundingClientRect() tras los cambios de la interfaz de cada
// instantánea obligaba al navegador a recalcular la página 60 veces por segundo.
const canvasBoxes=new WeakMap();
function canvasBox(canvas){let box=canvasBoxes.get(canvas);if(box&&box.w>1&&box.h>1)return box;const r=canvas.getBoundingClientRect();box={w:r.width,h:r.height};if(typeof ResizeObserver==='function'&&!canvasBoxes.has(canvas)){new ResizeObserver(entries=>{for(const e of entries){const b=e.contentBoxSize?.[0];canvasBoxes.set(canvas,b?{w:b.inlineSize,h:b.blockSize}:{w:e.contentRect.width,h:e.contentRect.height});}}).observe(canvas);}canvasBoxes.set(canvas,box);return box;}
// Resolución dinámica: si el dispositivo no llega a ~45 fps de forma sostenida
// se dibuja a menos píxeles (densidad 1,5 → 1,0 → 0,8). Si vuelve a sobrar
// tiempo, se recupera. Con histéresis para no redimensionar a cada momento.
const quality={cap:1.5,last:0,winStart:0,frames:0,slow:0,fast:0};
export function renderQuality(){return quality.cap;}
function trackQuality(){const t=performance.now(),d=quality.last?t-quality.last:0;quality.last=t;
 // Pausas largas (pestaña oculta, carga, alerta) no cuentan como lentitud.
 if(d>250||!quality.winStart){quality.winStart=t;quality.frames=0;return;}
 quality.frames++;const span=t-quality.winStart;if(span<2000)return;const avg=span/quality.frames;quality.winStart=t;quality.frames=0;
 if(avg>24){quality.slow++;quality.fast=0;}else if(avg<17.4){quality.fast++;quality.slow=0;}else{quality.slow=0;quality.fast=0;}
 if(quality.slow>=2&&quality.cap>.8&&(quality.cap>1||avg>30)){quality.cap=quality.cap>1?1:.8;quality.slow=0;}
 else if(quality.fast>=5&&quality.cap<1.5){quality.cap=quality.cap<1?1:1.5;quality.fast=0;}}
function clipVisionCircle(c,viewer,radius){c.beginPath();c.arc(viewer.x,viewer.y,radius,0,Math.PI*2);c.clip();}
function mapRoomLabel(c,label,x,y,width,fontSize){
 c.save();c.font=`700 ${fontSize}px Segoe UI`;let lines=[label];
 if(c.measureText(label).width>width){const words=label.split(' ');let best=null;
  for(let i=1;i<words.length;i++){const pair=[words.slice(0,i).join(' '),words.slice(i).join(' ')],sizes=pair.map(line=>c.measureText(line).width),score=Math.max(...sizes);if(!best||score<best.score)best={lines:pair,score};}
  if(best)lines=best.lines;
 }
 c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';c.lineWidth=fontSize*.26;c.strokeStyle='#f4eddd';c.fillStyle='#263f43';const height=fontSize*1.25,start=y-(lines.length-1)*height/2;
 lines.forEach((line,i)=>{c.strokeText(line,x,start+i*height);c.fillText(line,x,start+i*height);});c.restore();
}
const drawWitnessKill=drawKillScene;
const FOG='rgba(4,10,18,.64)';
function flatProp(c,r){const x=r.x*TILE,y=r.y*TILE,w=r.w*TILE,h=r.h*TILE;c.save();c.translate(x,y);
 if(r.kind==='wall'){c.fillStyle='#314a55';c.fillRect(0,0,w,h);c.fillStyle='#829ca180';if(w>h)c.fillRect(0,0,w,Math.min(2,h));else c.fillRect(0,0,Math.min(2,w),h);c.restore();return;}
 c.fillStyle='#172e3a30';c.fillRect(5,6,w,h);
 if(['dj-booth','speaker','security-console','club-sofa','club-bar','club-rack','club-table','club-emergency-table'].includes(r.kind)){
  if(r.kind==='dj-booth'){rr(c,0,0,w,h,7,'#171b2e','#8a61b4');rr(c,8,8,w-16,h-16,5,'#2c3048');for(const xx of [w*.25,w*.75]){c.fillStyle='#101323';c.beginPath();c.arc(xx,h/2,Math.min(h*.35,28),0,Math.PI*2);c.fill();c.strokeStyle='#a276e2';c.lineWidth=3;c.stroke();}for(let i=0;i<5;i++)rr(c,w*.43+i*7,h*.25,3,h*.5,1,['#69e7db','#ee7eb3'][i%2]);}
  else if(r.kind==='speaker'){rr(c,0,0,w,h,5,'#151b29','#536581');for(const yy of [.27,.72]){c.fillStyle='#303d52';c.beginPath();c.arc(w/2,h*yy,Math.min(w*.33,h*.19),0,Math.PI*2);c.fill();c.strokeStyle='#8770bb';c.lineWidth=3;c.stroke();}}
  else if(r.kind==='security-console'){rr(c,0,0,w,h,6,'#273948','#6da9a5');for(let i=0;i<4;i++){rr(c,8+i*(w-16)/4,7,(w-30)/4,h-17,3,'#0e292a','#65baa6');c.strokeStyle='#69d7b9';c.lineWidth=1;c.beginPath();c.moveTo(15+i*w/4,h/2);c.lineTo(28+i*w/4,h*.35);c.stroke();}}
  else if(r.kind==='club-sofa'){rr(c,0,0,w,h,9,'#70425b','#c57b9d');rr(c,6,-8,w-12,15,5,'#884768');}
  else if(r.kind==='club-rack'){rr(c,0,0,w,h,5,'#213442','#8bbaa0');for(let i=9;i<w-5;i+=20)rr(c,i,7,7,Math.max(9,h-14),2,['#67cbb0','#c18ee0','#e7c68d'][Math.floor(i/20)%3]);}
  else if(r.kind==='club-bar'){rr(c,0,0,w,h,9,'#714a68','#d18bbd');for(let i=15;i<w-15;i+=31){rr(c,i,7,10,18,3,'#83c8b3');rr(c,i+2,3,6,6,2,'#e5ddac');}}
  else{rr(c,0,0,w,h,r.kind==='club-table'?20:14,'#253d56','#b78bcf');rr(c,6,6,w-12,h-12,12,'#354a63','#77cbbc');}
 }
 else if(r.kind==='blackboard'){rr(c,0,0,w,h,4,'#244c41','#976f47');c.strokeStyle='#d7e5c480';c.lineWidth=2;c.beginPath();c.moveTo(17,14);c.lineTo(Math.min(w-20,135),14);c.moveTo(17,24);c.lineTo(Math.min(w-20,105),24);c.stroke();text(c,'A B C  ·  1 2 3',w*.65,h*.6,14,'#d7e5c4');}
 else if(r.kind==='side-board'){rr(c,0,0,w,h,4,'#244c41','#a88155');c.strokeStyle='#f0e5bc9c';c.lineWidth=2;for(let yy=16;yy<h-8;yy+=24){c.beginPath();c.moveTo(7,yy);c.lineTo(w-7,yy-4);c.stroke();}rr(c,-3,h-8,w+6,7,2,'#a97a4f');}
 else if(r.kind==='desk'||r.kind==='office-desk'){rr(c,0,0,w,h,7,'#d3ac77','#8c7053');rr(c,5,5,w-10,h-10,5,'#e5c18c');if(r.kind==='desk'){rr(c,w*.35,h*.7,w*.3,h*.38,5,'#7f9d9b','#476364');rr(c,w*.58,8,w*.23,15,2,'#edf1e5','#b7bdb2');c.strokeStyle='#9bc1c6';c.beginPath();c.moveTo(w*.62,13);c.lineTo(w*.78,13);c.stroke();}else{rr(c,w*.35,8,w*.35,h*.5,4,'#354c5c');rr(c,w*.39,12,w*.27,h*.33,2,'#90bac2');rr(c,w*.3,h*.65,w*.45,9,2,'#f0eee3');}}
 else if(r.kind==='shelf'){rr(c,0,0,w,h,4,'#ad865b','#6e5744');for(let yy=7;yy<h-8;yy+=30){c.fillStyle='#82684e';c.fillRect(3,yy+23,w-6,4);for(let xx=5;xx<w-8;xx+=9){c.fillStyle=['#af7d70','#7c9aa4','#b8ba8a','#9690b7'][(xx+yy)%4];c.fillRect(xx,yy,7,22);}}}
 else if(r.kind==='plant'){rr(c,3,h*.5,w-6,h*.5,4,'#b58765','#8b674d');c.fillStyle='#679b64';for(const [xx,yy] of [[w*.25,h*.4],[w*.6,h*.15],[w*.8,h*.4]]){c.beginPath();c.ellipse(xx,yy,w*.3,h*.2,-.7,0,Math.PI*2);c.fill();}}
 else if(r.kind==='stage'){rr(c,0,0,w,h,4,'#8d625e','#64454b');c.fillStyle='#af7970';c.fillRect(5,4,10,h-8);rr(c,w*.25,h*.41,w*.62,h*.16,5,'#d2af7b','#84664d');rr(c,w*.1,h*.07,w*.45,13,2,'#e0c099');}
 else if(r.kind==='red-chair-left'){rr(c,0,0,w,h,6,'#bf4b58','#792f3f');rr(c,4,4,w-8,h-8,4,'#df7880');rr(c,w-8,3,7,h-6,2,'#7b3648');c.fillStyle='#563947';c.fillRect(2,5,4,5);c.fillRect(2,h-10,4,5);}
 else if(r.kind==='toilet'){rr(c,0,0,w,h,6,'#eaf1eb','#98b4b9');rr(c,8,h*.28,w-16,h*.58,12,'#fcfdf4','#a5bcc0');rr(c,14,h*.4,w-28,h*.33,8,'#a8cbd0');}
 else if(r.kind==='sink'){rr(c,0,0,w,h,5,'#b2c9c4','#6a8a91');for(let xx=12;xx<w-20;xx+=50){rr(c,xx,5,34,h-10,9,'#f2f5ed','#92adb0');c.fillStyle='#739aa3';c.fillRect(xx+14,2,7,8);}}
 else if(r.kind==='reception-desk'){rr(c,0,0,w,h,7,'#82aaa3','#466f71');rr(c,7,7,w-14,h-14,4,'#bad0bb');rr(c,20,7,45,30,4,'#3c5262');}
 else if(r.kind==='meeting-table'){rr(c,0,0,w,h,25,'#c3a17a','#8c7459');for(let xx=20;xx<w;xx+=65){rr(c,xx,-10,32,15,5,'#708c96','#4b656e');rr(c,xx,h-5,32,15,5,'#708c96','#4b656e');}rr(c,w/2-20,20,40,30,3,'#f3f0dd','#bca784');}
 else if(r.kind==='emergency-table'){rr(c,0,0,w,h,16,'#75533f','#3f332d');rr(c,8,8,w-16,h-16,12,'#b38b62','#e2bd85');for(const xx of [18,w-37])rr(c,xx,-13,19,14,3,'#394f5a');}
 else if(r.kind==='bench'){rr(c,0,0,w,h,5,'#b99773','#7e6954');c.fillStyle='#6e635b';c.fillRect(8,h-3,7,8);c.fillRect(w-15,h-3,7,8);}
 c.restore();}
const propSprites=new Map();
const isParkFlat=p=>typeof p.kind==='string'&&p.kind.startsWith('park-');// (sin uso: Campo Grande retirado)
const HOST_CACHE=new WeakMap();
// Flechas de los conductos dibujadas en el último fotograma (coordenadas del mundo).
export let ventHits=[];
function hostOf(map,id){let m=HOST_CACHE.get(map);if(!m){m=new Map();for(const p of map.props)for(const sid of [p.station,...(p.stations||[])].filter(Boolean))m.set(sid,p);HOST_CACHE.set(map,m);}return m.get(id)||null;}
function propSprite(r){if(r.parkGrove||r.parkTree||r.parkWall||['wall','closed-door'].includes(r.kind)||String(r.kind).startsWith('rv-'))return null;
 const key=`${r.kind}/${r.w}/${r.h}/${r.orientation||''}/${r.emergencyBadge||false}`,w=r.w*TILE,h=r.h*TILE,z=propHeight(r);let sprite=propSprites.get(key);
 if(!sprite){let can=document.createElement('canvas');can.width=Math.ceil(w+48);can.height=Math.ceil(h+z+54);const q=can.getContext('2d',{willReadFrequently:true});q.translate(24,z+30);
  if(!drawVolumeProp(q,{...r,x:0,y:0})){q.fillStyle='#10232d32';q.beginPath();q.ellipse(w*.53,h*.62+7,w*.55,h*.45+6,0,0,Math.PI*2);q.fill();rr(q,0,0,w,h,5,'#554a43','#203440');q.save();q.translate(0,-z);flatProp(q,{...r,x:0,y:0});q.restore();q.strokeStyle='#e5e6cc55';q.lineWidth=2;q.beginPath();q.moveTo(5,h-z+1);q.lineTo(w-5,h-z+1);q.stroke();}
  if(r.kind==='emergency-table'||r.emergencyBadge){const x=w/2,y=h/2-z;q.fillStyle='#496b67';q.beginPath();q.ellipse(x,y,31,20,0,0,Math.PI*2);q.fill();q.strokeStyle='#d7cba6';q.lineWidth=2;q.stroke();q.fillStyle='#e66c73';q.beginPath();q.ellipse(x,y-5,17,11,0,0,Math.PI*2);q.fill();q.fillStyle='#f5b5a1';q.beginPath();q.ellipse(x-4,y-9,6,3,0,0,Math.PI*2);q.fill();}
  // 14.3 · Contorno oscuro fino alrededor de cada mueble (como la referencia): se
  // calcula una sola vez por sprite.
  try{const ol=silhouetteOutline(can,'#0b1820d0',2.2),out=document.createElement('canvas');out.width=can.width;out.height=can.height;const o=out.getContext('2d',{willReadFrequently:true});o.drawImage(ol,0,0);o.drawImage(can,0,0);can=out;}catch{}
  propSprites.set(key,sprite=can);freezeSurface(can,bitmap=>{if(propSprites.get(key)===can)propSprites.set(key,bitmap);});
 }
 return {img:sprite,x:r.x*TILE-24,y:r.y*TILE-z-30};
}
function drawProp(c,r){if(r.parkGrove)return;if(drawCaravanProp(c,r))return;if(r.parkTree||r.parkWall){drawVolumeProp(c,r);return;}
 if(['wall','closed-door'].includes(r.kind)){flatProp(c,r);return;}
 const s=propSprite(r);if(s)c.drawImage(s.img,s.x,s.y);
}
// Reponer solo la parte del mueble que tapa al sprite evita alterar otros actores.
function coverBehindFurniture(c,map,p){
 if(p.alive===false)return;
 if(wallTheme(map.worldId)&&!map.isMeeting&&!map.isCaravan){for(const r of map.props){if(r.kind!=='wall'||boundaryWall(map,r,floorAt)||(r.y+r.h)*TILE<=p.y||r.y*TILE-WALL_H>=p.y+8||r.x*TILE>=p.x+30||(r.x+r.w)*TILE<=p.x-30)continue;const top=r.y*TILE<p.y?p.y-WALL_H:p.y-104;c.save();c.beginPath();c.rect(p.x-31,top,62,p.y+12-top);c.clip();c.translate(r.x*TILE,r.y*TILE);drawWallVolume(c,r,map.worldId);c.restore();}}
 const list=map.props.filter(r=>!['wall','closed-door'].includes(r.kind)&&!isParkFlat(r)&&(r.y+r.h)*TILE>p.y&&r.y*TILE-propHeight(r)<p.y+8&&r.x*TILE<p.x+27&&(r.x+r.w)*TILE>p.x-27&&visionLineOfSight(map,p,{x:(r.x+r.w/2)*TILE,y:(r.y+r.h)*TILE+16})).sort((a,b)=>a.y+a.h-b.y-b.h);
 if(!list.length)return;c.save();c.beginPath();c.rect(p.x-30,p.y-99,60,110);c.clip();for(const r of list)drawProp(c,r);c.restore();
}
// ---------------------------------------------------------------------------
// 15.0 · Iluminación parcial por superficies.
// El polígono de visión decide qué suelo se ve. Una superficie con altura
// (cara de pared, canto, mueble) se ilumina por columnas: una columna está
// iluminada si el suelo contiguo, en el lado desde el que se mira, está dentro
// del polígono. Así una misma pared puede quedar mitad iluminada y mitad en
// sombra, y una cara que mira hacia el otro lado (perspectiva desde arriba)
// nunca se ilumina. La capa se compone en un lienzo a media resolución, en el
// mismo orden de dibujo que la escena, y se superpone una sola vez.
function crossings(points,axis,v){const out=[],n=points.length;for(let i=0,j=n-1;i<n;j=i++){const a=points[i],b=points[j],av=axis==='x'?a.y:a.x,bv=axis==='x'?b.y:b.x;if((av>v)!==(bv>v)){const t=(v-av)/(bv-av);out.push(axis==='x'?a.x+(b.x-a.x)*t:a.y+(b.y-a.y)*t);}}return out.sort((p,q)=>p-q);}
export function litSpans(points,axis,v,from,to){if(!points||points.length<3)return [];const xs=crossings(points,axis,v),out=[];for(let i=0;i+1<xs.length;i+=2){let a=Math.max(from,xs[i]),b=Math.min(to,xs[i+1]);if(a-from<8)a=from;if(to-b<8)b=to;if(b-a>.5){const last=out[out.length-1];if(last&&a-last[1]<1)last[1]=b;else out.push([a,b]);}}return out;}
const fullSpan=(spans,from,to)=>spans.length===1&&spans[0][0]<=from+1.5&&spans[0][1]>=to-1.5;
// Deja la superficie con su luz: borra la sombra del rectángulo y vuelve a
// oscurecer solo los tramos que no reciben luz.
function lightSurface(m,r,axis,spans){
 m.globalCompositeOperation='destination-out';m.fillStyle='#000';m.fillRect(r.x,r.y,r.w,r.h);
 const from=axis==='x'?r.x:r.y,to=axis==='x'?r.x+r.w:r.y+r.h;if(fullSpan(spans,from,to))return;
 m.globalCompositeOperation='source-over';m.fillStyle=FOG;let at=from;
 const gap=(a,b)=>{if(b-a<=.25)return;if(axis==='x')m.fillRect(a,r.y,b-a,r.h);else m.fillRect(r.x,a,r.w,b-a);};
 for(const [a,b] of spans){if(a>at)gap(at,a);at=Math.max(at,b);}if(at<to)gap(at,to);
}
function archSpans(points,s){const spans=litSpans(points,s.axis,s.line,s.from,s.to);
 for(const sp of spans){if(s.head!==undefined&&sp[0]<=s.from+1)sp[0]=s.head;if(s.padL&&sp[0]<=s.from+1)sp[0]-=s.padL;if(s.padR&&sp[1]>=s.to-1)sp[1]+=s.padR;}return spans;}
// Pared interior. Horizontal: canto (visible desde ambos lados) y cara frontal
// (solo desde el sur). Vertical: canto por tramos y cara del extremo sur.
function maskWall(m,r,local,points,ya,yb,first,last){const T=TILE,H=WALL_H,X0=r.x*T-1,W=r.w*T+2,Ytop=r.y*T,Ybase=(r.y+r.h)*T;
 if(r.w>=r.h){const capH=Math.max(11,r.h*T),S=local.y>Ybase?litSpans(points,'x',Ybase+3,X0,X0+W):[],N=local.y<Ytop?litSpans(points,'x',Ytop-3,X0,X0+W):[];
  lightSurface(m,{x:X0,y:Ytop-H,w:W,h:capH},'x',[...S,...N].sort((a,b)=>a[0]-b[0]));
  lightSurface(m,{x:X0,y:Ytop-H+capH,w:W,h:Ybase-(Ytop-H+capH)},'x',S);return;}
 const cw=Math.max(11,r.w*T),cx=r.x*T+(r.w*T-cw)/2,lines=local.x<r.x*T?[r.x*T-3]:local.x>(r.x+r.w)*T?[(r.x+r.w)*T+3]:[r.x*T-3,(r.x+r.w)*T+3];
 const spans=lines.flatMap(x=>litSpans(points,'y',x,ya,yb)).sort((a,b)=>a[0]-b[0]).map(([a,b])=>[(a<=ya+1&&first?Ytop:a)-H,b-H]);
 lightSurface(m,{x:cx-1,y:(first?Ytop:ya)-H,w:cw+2,h:yb-(first?Ytop:ya)},'y',spans);
 if(last)lightSurface(m,{x:cx-1,y:Ybase-H,w:cw+2,h:H},'x',local.y>Ybase?litSpans(points,'x',Ybase+3,cx-1,cx+cw+1):[]);
}
function drawWallPiece(c,r,worldId){c.save();c.translate(r.x*TILE,r.y*TILE);drawWallVolume(c,r,worldId);c.restore();}
// Las paredes verticales se dibujan por tramos de una baldosa: cada tramo se
// ordena por su propia base, así un personaje junto a la pared queda delante
// o detrás de ella según su posición real.
function pushWall(scene,c,r,worldId,local,points){const T=TILE,H=WALL_H,Ytop=r.y*T,Ybase=(r.y+r.h)*T;
 if(r.w>=r.h){scene.push({y:Ybase,draw:()=>drawWallPiece(c,r,worldId),mask:m=>maskWall(m,r,local,points,Ytop,Ybase,true,true)});return;}
 const cw=Math.max(11,r.w*T),x=r.x*T+(r.w*T-cw)/2-3;
 for(let ya=Ytop;ya<Ybase-.5;ya+=T){const yb=Math.min(Ybase,ya+T),first=ya===Ytop,last=yb>=Ybase-.5,top=(first?Ytop:ya)-H-(first?2:0),bottom=last?Ybase+2:yb-H;
  scene.push({y:yb,clip:{x,y:top,w:cw+6,h:bottom-top},draw:()=>drawWallPiece(c,r,worldId),mask:m=>maskWall(m,r,local,points,ya,yb,first,last)});}
}
// Muebles: silueta exacta del sprite en la capa de luz. Los muebles largos en
// vertical también se ordenan por tramos.
function pushProp(scene,c,p,points,fog){const T=TILE,z=propHeight(p),base=(p.y+p.h)*T,mask=fog?m=>maskProp(m,p,points):null;
 if(p.h>1.3&&!p.parkTree&&!p.parkWall&&p.kind!=='closed-door'&&!String(p.kind).startsWith('rv-')){
  for(let ya=p.y*T;ya<base-.5;ya+=T){const yb=Math.min(base,ya+T),first=ya===p.y*T,last=yb>=base-.5,top=first?ya-z-40:ya-z,bottom=last?base+40:yb-z;
   scene.push({y:yb,clip:{x:p.x*T-30,y:top,w:p.w*T+60,h:bottom-top},draw:()=>drawProp(c,p),mask});}
  return;}
 scene.push({y:base,draw:()=>drawProp(c,p),mask});
}
const darkSprites=new WeakMap();
function darkSprite(img){let d=darkSprites.get(img);if(d)return d;d=document.createElement('canvas');d.width=img.width;d.height=img.height;const g=d.getContext('2d');g.drawImage(img,0,0);g.globalCompositeOperation='source-in';g.fillStyle=FOG;g.fillRect(0,0,d.width,d.height);darkSprites.set(img,d);return d;}
function maskProp(m,r,points){const T=TILE,x0=r.x*T,x1=(r.x+r.w)*T,base=(r.y+r.h)*T,spans=litSpans(points,'x',base-4,x0,x1),s=propSprite(r);
 if(!s){const z=propHeight(r);for(const sp of spans){if(sp[0]<=x0+1)sp[0]-=6;if(sp[1]>=x1-1)sp[1]+=6;}lightSurface(m,{x:x0-6,y:r.y*T-z-8,w:x1-x0+12,h:base-r.y*T+z+14},'x',spans);return;}
 m.globalCompositeOperation='destination-out';m.drawImage(s.img,s.x,s.y);
 if(fullSpan(spans,x0,x1))return;
 const left=s.x,right=s.x+s.img.width;m.save();m.beginPath();let at=left;
 for(const [a0,b0] of spans){const a=a0<=x0+1?left:a0,b=b0>=x1-1?right:b0;if(a>at)m.rect(at,s.y,a-at,s.img.height);at=Math.max(at,b);}
 if(at<right)m.rect(at,s.y,right-at,s.img.height);m.clip();m.globalCompositeOperation='lighter';m.drawImage(darkSprite(s.img),s.x,s.y);m.restore();
}
let lightCanvas=null,lightCtx=null;
function buildLightMask(w,h,cam,scale,map,local,points,scene,ring){
 const k=w*h>1.3e6?.42:.5,W=Math.max(1,Math.ceil(w*k)),H=Math.max(1,Math.ceil(h*k));
 if(!lightCanvas){lightCanvas=document.createElement('canvas');lightCtx=lightCanvas.getContext('2d');}if(globalThis.__qa)globalThis.__qa.lightMask=lightCanvas;
 if(lightCanvas.width!==W||lightCanvas.height!==H){lightCanvas.width=W;lightCanvas.height=H;}
 const m=lightCtx;m.setTransform(1,0,0,1,0,0);m.globalCompositeOperation='source-over';m.clearRect(0,0,W,H);m.fillStyle=FOG;m.fillRect(0,0,W,H);
 m.setTransform(k*scale,0,0,k*scale,k*(w/2-cam.x*scale),k*(h/2-cam.y*scale));
 m.globalCompositeOperation='destination-out';m.fillStyle='#000';m.beginPath();m.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++)m.lineTo(points[i].x,points[i].y);m.closePath();m.fill();
 const vx0=cam.x-w/scale/2-80,vx1=cam.x+w/scale/2+80,vy0=cam.y-h/scale/2-80,vy1=cam.y+h/scale/2+140;
 if(archTheme(map.worldId))for(const s of archSurfaces(map,floorAt)){const r=s.rect;if(r.x>vx1||r.x+r.w<vx0||r.y>vy1||r.y+r.h<vy0)continue;lightSurface(m,r,s.axis,archSpans(points,s));}
 // 16.2 · Sin «burbuja» alrededor de los personajes: su silueta solo se ilumina sobre la
 // parte del suelo visible (el polígono barrido hacia arriba la altura del sprite). Quien
 // cruza de una zona iluminada a otra oscura queda parcialmente en penumbra, igual que
 // el suelo y las paredes, sin círculos ni recuadros artificiales.
 const actors=scene.filter(i=>i.actor);if(actors.length){m.save();m.beginPath();const up=104;m.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++)m.lineTo(points[i].x,points[i].y);m.closePath();
  let area=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];area+=a.x*b.y-b.x*a.y;}
  // Todas las subrutas con la misma orientación: con la regla nonzero se suman y nunca se anulan.
  const boxes=actors.map(i=>({x0:i.actor.x-30,x1:i.actor.x+30,y0:i.actor.y-110,y1:i.actor.y+up+14}));
  for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if(Math.abs(b.x-a.x)<.01)continue;const ex0=Math.min(a.x,b.x),ex1=Math.max(a.x,b.x),ey0=Math.min(a.y,b.y)-up,ey1=Math.max(a.y,b.y);if(!boxes.some(q=>ex1>=q.x0&&ex0<=q.x1&&ey1>=q.y0&&ey0<=q.y1))continue;const q=[a,b,{x:b.x,y:b.y-up},{x:a.x,y:a.y-up}],qa=(b.x-a.x)*(-up);const v=Math.sign(qa)===Math.sign(area)?q:q.reverse();m.moveTo(v[0].x,v[0].y);for(let j=1;j<4;j++)m.lineTo(v[j].x,v[j].y);m.closePath();}
  m.clip('nonzero');m.globalCompositeOperation='destination-out';m.fillStyle='#000';for(const item of actors){const p=item.actor,s=(item.size||.84)/.84;m.beginPath();m.roundRect(p.x-25*s,p.y-98*s,50*s,108*s,22*s);m.fill();}m.restore();}
 for(const item of scene){
  if(item.actor)continue;
  if(!item.mask)continue;if(item.clip){m.save();m.beginPath();m.rect(item.clip.x,item.clip.y,item.clip.w,item.clip.h);m.clip();item.mask(m);m.restore();}else item.mask(m);
 }
 // Apagón: borde suave del radio reducido (el único caso con distancia máxima).
 if(ring>0){m.globalCompositeOperation='source-over';const g=m.createRadialGradient(local.x,local.y,ring*.72,local.x,local.y,ring);g.addColorStop(0,'rgba(4,10,18,0)');g.addColorStop(1,'rgba(4,10,18,.34)');m.fillStyle=g;m.beginPath();m.arc(local.x,local.y,ring,0,Math.PI*2);m.fill();}
 m.globalCompositeOperation='source-over';return {canvas:lightCanvas,W,H,k};
}
// ---- 16.2 · Mecánicas del escenario en el mundo: pasadizos (los de impostor solo los ven
// impostores), escondites, interruptores, cuartos con la luz apagada y tinte de los eventos.
function drawMechanicsFloor(c,state,map,time,local){const M=mechanicsFor(worldFor(state));if(!M)return;const imp=state.me.role==='impostor',fl=map.floor??0;
 for(const ps of M.passages){if(ps.impostorOnly&&!imp)continue;for(const e of [ps.a,ps.b]){if((e.floor??0)!==fl)continue;const near=Math.hypot(local.x-e.x,local.y-e.y)<=PASSAGE_RANGE;c.save();c.translate(e.x,e.y);
  c.fillStyle=ps.impostorOnly?'#3a1020':'#2c2418';c.strokeStyle=ps.impostorOnly?'#ff697e':'#c9a96e';c.lineWidth=near?3.5:2;c.beginPath();c.roundRect(-22,-12,44,24,6);c.fill();c.stroke();
  c.strokeStyle=ps.impostorOnly?'#ff697e88':'#c9a96e88';c.lineWidth=1.5;for(const x of [-12,0,12]){c.beginPath();c.moveTo(x,-9);c.lineTo(x,9);c.stroke();}
  if(near){c.globalAlpha=.6+.4*Math.sin(time/200);c.fillStyle=ps.impostorOnly?'#ff697e':'#ffe9a8';c.font='700 11px Segoe UI';c.textAlign='center';c.fillText(ps.label,0,-18);}c.restore();}}
 const occ=new Set(state.mech?.occupied||[]);
 for(const h of M.hides){if((h.floor??0)!==fl)continue;const near=Math.hypot(local.x-h.x,local.y-h.y)<=HIDE_RANGE;c.save();c.translate(h.x,h.y);
  c.fillStyle='#0a142a30';c.beginPath();c.ellipse(0,6,26,8,0,0,7);c.fill();c.fillStyle=occ.has(h.id)?'#5b6b7a':'#7e8fa0';c.strokeStyle='#1c2a36';c.lineWidth=2.5;c.beginPath();c.roundRect(-20,-62,40,66,5);c.fill();c.stroke();
  c.strokeStyle='#1c2a3699';c.lineWidth=1.5;c.beginPath();c.moveTo(0,-60);c.lineTo(0,2);for(const y of [-52,-46,-40]){c.moveTo(-14,y);c.lineTo(-5,y);c.moveTo(5,y);c.lineTo(14,y);}c.stroke();c.fillStyle='#e8d3a5';c.fillRect(-4,-30,2,8);c.fillRect(3,-30,2,8);
  if(near&&!state.me.hidden){c.strokeStyle=`rgba(255,214,74,${.7+.3*Math.sin(time/230)})`;c.lineWidth=3;c.beginPath();c.roundRect(-24,-66,48,74,8);c.stroke();}c.restore();}
 for(const w of M.switches){if((w.floor??0)!==fl)continue;const off=!!state.mech?.off?.[w.room],near=Math.hypot(local.x-w.x,local.y-w.y)<=SWITCH_RANGE;c.save();c.translate(w.x,w.y-30);
  c.fillStyle='#f4efe2';c.strokeStyle=near?'#ffd64a':'#4b5560';c.lineWidth=near?3:2;c.beginPath();c.roundRect(-8,-11,16,22,4);c.fill();c.stroke();c.fillStyle=off?'#4b5560':'#ffd64a';c.fillRect(-3,off?1:-7,6,6);c.restore();}}
function drawMechanicsShade(c,state,map,time){const M=mechanicsFor(worldFor(state)),off=state.mech?.off||{},ev=state.mech?.event,fl=map.floor??0;
 for(const w of M.switches){if(!off[w.room]||(w.floor??0)!==fl)continue;const r=w.rect;c.save();c.fillStyle='rgba(4,8,16,.55)';c.fillRect(r.x*TILE,r.y*TILE,r.w*TILE,r.h*TILE);c.restore();}
 if(ev&&!state.reducedEffects){const k=Math.min(1,(Date.now()-ev.at)/600,(ev.until-Date.now())/600);if(k>0){const room=ev.room&&map.rooms.find(r=>r.id===ev.room);c.save();c.globalAlpha=.10*k*(.7+.3*Math.sin(time/(ev.kind==='music'?120:400)));c.fillStyle=ev.tint||'#fff';if(room)c.fillRect(room.x*TILE,room.y*TILE,room.w*TILE,room.h*TILE);else c.fillRect(0,0,map.width*TILE,map.height*TILE);c.restore();}}}
// Profesor del colegio. Si está agarrando a un alumno, extiende los brazos y lo
// sujeta con fuerza (pequeño temblor de forcejeo) durante el agarre.
function drawTeacher(c,t,at,time,hold){
 const look={...t,color:6,outfitColor:6,trimColor:4,skin:4,hat:0,pants:1,glasses:1};
 if(hold){const dx=hold.x-at.x,dir=Math.sign(dx||1),shake=Math.sin(time/38)*1.6;
  c.save();c.translate(shake,0);drawRobot(c,{...look,facing:dir},at.x,at.y,.72,time,false,false);c.restore();
  c.save();c.lineCap='round';for(const [oy,ty] of [[-44,-50],[-36,-38]]){const sx=at.x+dir*9,sy=at.y+oy*.72,tx=hold.x-dir*14+shake,tyy=hold.y+ty*.84;c.strokeStyle='#0b1820';c.lineWidth=9;c.beginPath();c.moveTo(sx,sy);c.quadraticCurveTo((sx+tx)/2,Math.min(sy,tyy)-8,tx,tyy);c.stroke();c.strokeStyle='#3f6f8f';c.lineWidth=6;c.stroke();c.fillStyle='#d6a27c';c.strokeStyle='#0b1820';c.lineWidth=2;c.beginPath();c.arc(tx,tyy,5.2,0,Math.PI*2);c.fill();c.stroke();}
  c.strokeStyle='#ffffffaa';c.lineWidth=2;for(let i=0;i<3;i++){const a=time/90+i*2.1;c.beginPath();c.moveTo(hold.x+Math.cos(a)*30,hold.y-48+Math.sin(a)*22);c.lineTo(hold.x+Math.cos(a)*38,hold.y-48+Math.sin(a)*28);c.stroke();}c.restore();
 }else drawRobot(c,look,at.x,at.y,.72,time,!!(at.moving||t.targetId),false);
 c.save();c.translate(at.x+(hold?Math.sin(time/38)*1.6:0),at.y);c.scale(.72,.72);rr(c,-18,-64,36,17,6,'#e8f0ec','#537881');c.strokeStyle='#c7dedb';c.lineWidth=2;c.beginPath();c.moveTo(-18,-58);c.lineTo(-27,-62);c.moveTo(18,-58);c.lineTo(27,-62);c.stroke();c.restore();
}
// 14.3 · `mini`: copia reducida para el minimapa (antes era otra lámina a
// resolución completa: 40–55 MB por planta solo para dibujarla pequeña).
// BETA · Oclusión ambiental en el suelo: a pie de muro, en los rincones y bajo
// los umbrales el suelo se oscurece suavemente. Se pinta una vez en la lámina
// del mapa (coste cero por fotograma) y queda recortada a salas y pasillos.
function drawFloorAO(c,map){c.save();c.beginPath();for(const r of [...map.corridors,...map.rooms]){if(r.outline){r.outline.forEach(([x,y],i)=>i?c.lineTo(x*TILE,y*TILE):c.moveTo(x*TILE,y*TILE));c.closePath();}else c.rect(r.x*TILE,r.y*TILE,r.w*TILE,r.h*TILE);}c.clip();
 const ink='10,16,26',band=(x0,y0,x1,y1,w,h,a)=>{const g=c.createLinearGradient(x0,y0,x1,y1);g.addColorStop(0,`rgba(${ink},${a})`);g.addColorStop(.45,`rgba(${ink},${a*.42})`);g.addColorStop(1,`rgba(${ink},0)`);c.fillStyle=g;c.fillRect(Math.min(x0,x1)-(w?0:0),Math.min(y0,y1),w,h);};
 for(const wl of map.props){if(wl.kind!=='wall')continue;const x=wl.x*TILE,y=wl.y*TILE,w=wl.w*TILE,h=wl.h*TILE;
  if(w>=h){band(x,y+h,x,y+h+52,w,52,.5);band(x,y,x,y-20,w,20,.24);}
  else{band(x+w,y,x+w+30,y,30,h,.34);band(x,y,x-30,y,30,h,.34);}}
 // Rincones: donde se cruzan un muro horizontal y uno vertical.
 const walls=map.props.filter(p=>p.kind==='wall'),H=walls.filter(p=>p.w>=p.h),V=walls.filter(p=>p.h>p.w);
 for(const v of V)for(const end of [v.y,v.y+v.h])for(const hw of H){if(Math.abs(hw.y+hw.h/2-end)>.25)continue;const vx=v.x+v.w/2;if(vx<hw.x-.2||vx>hw.x+hw.w+.2)continue;const cx=vx*TILE,cy=(hw.y+hw.h)*TILE,g=c.createRadialGradient(cx,cy,2,cx,cy,46);g.addColorStop(0,`rgba(${ink},.42)`);g.addColorStop(1,`rgba(${ink},0)`);c.fillStyle=g;c.fillRect(cx-46,cy-46,92,92);}
 c.restore();}
let miniCaches=new WeakMap();const MINI=.3;
export function mapImage(map,floorOnly=false,mini=false){selectWorldCache(map);const cache=mini?miniCaches:floorOnly?floorCaches:caches;const world=worldFor(map.worldId),base=map.isMeeting?map:map===world.LOBBY?world.LOBBY:world.FLOORS[map.floor??0];if(cache.has(base))return cache.get(base);map=base;
 const can=document.createElement('canvas');mapSurfaces.add(can);const k=mini?MINI:1;can.width=Math.ceil(map.width*TILE*k);can.height=Math.ceil(map.height*TILE*k);const c=can.getContext('2d');if(k!==1)c.scale(k,k);if(map.isCaravan){drawCaravanInterior(c,map,{floorOnly});cache.set(base,can);freezeMap(can,cache,base);return can;}const arch=!!wallTheme(map.worldId)&&!map.isMeeting;if(!(arch&&drawVoid(c,map))&&!(map.worldId==='park'&&floorOnly)){c.fillStyle='#233442';c.fillRect(0,0,can.width,can.height);}
  // 15.0 · El vacío exterior queda transparente: debajo se ve el exterior del mapa (calles, patio…).
  if(arch&&exteriorTheme(map.worldId)){if(floorOnly&&!mini)paintExteriorInto(c,map);else{const g=exteriorCellsOf(map);for(let y=0;y<g.H;y++)for(let x=0;x<g.W;x++)if(g.out[y*g.W+x])c.clearRect(x*TILE,y*TILE,TILE,TILE);}}
 // Campo Grande es todo planta: el mobiliario va en la lámina del suelo y solo
 // las copas de los árboles se pintan por encima de los personajes.
 const floor=(x,y)=>floorAt(map,(x+.5)*TILE,(y+.5)*TILE);
 for(const r of [...map.corridors,...map.rooms]){c.fillStyle=r.color||'#9eb3ad';if(r.outline){c.beginPath();r.outline.forEach(([x,y],i)=>i?c.lineTo(x*TILE,y*TILE):c.moveTo(x*TILE,y*TILE));c.closePath();c.fill();}else c.fillRect(r.x*TILE,r.y*TILE,r.w*TILE,r.h*TILE);}
 for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++){if(!floor(x,y))continue;
  c.fillStyle=(x+y)%2?'#ffffff0c':'#18393a05';c.fillRect(x*TILE,y*TILE,TILE,TILE);c.strokeStyle='#384f5014';c.lineWidth=1;c.strokeRect(x*TILE+.5,y*TILE+.5,TILE-1,TILE-1);
  if(arch)continue; // los bordes los pinta la arquitectura generada
  c.strokeStyle='#3d5158';c.lineWidth=9;c.beginPath();if(!floor(x,y-1)){c.moveTo(x*TILE,y*TILE+4);c.lineTo((x+1)*TILE,y*TILE+4);}if(!floor(x-1,y)){c.moveTo(x*TILE+4,y*TILE);c.lineTo(x*TILE+4,(y+1)*TILE);}if(!floor(x+1,y)){c.moveTo((x+1)*TILE-4,y*TILE);c.lineTo((x+1)*TILE-4,(y+1)*TILE);}if(!floor(x,y+1)){c.moveTo(x*TILE,(y+1)*TILE-4);c.lineTo((x+1)*TILE,(y+1)*TILE-4);}c.stroke();}
 if(wallTheme(map.worldId))drawFloorDetail(c,map,floorAt);
 for(const d of map.decor||[]){
  if(d.kind==='room-detail'){
   const x=d.x*TILE,y=d.y*TILE,w=d.w*TILE,h=d.h*TILE;
   c.strokeStyle=d.type==='hall'?'#f4d2bc54':'#ffffff33';c.lineWidth=3;c.strokeRect(x,y,w,h);
   for(let xx=x+58;xx<x+w-35;xx+=120){rr(c,xx,y+16,70,16,7,'#e9e9cf33','#fcf2c277');c.fillStyle='#fff6c128';c.fillRect(xx+8,y+20,54,7);}
   if(d.type==='office'||d.type==='classroom'){rr(c,x+w-60,y+18,37,29,3,'#735c49','#c99e6b');rr(c,x+w-54,y+24,25,18,2,'#d8d9aa');c.strokeStyle='#627e70';c.lineWidth=2;c.strokeRect(x+w-52,y+26,21,14);}
   if(d.type==='reception'){c.fillStyle='#d4e1be22';c.beginPath();c.arc(x+w*.58,y+h*.6,75,0,Math.PI*2);c.fill();for(let i=0;i<3;i++)rr(c,x+20+i*60,y+h-34,36,11,4,'#609486','#345b5e');}
   if(d.type==='bath')for(let i=0;i<3;i++)rr(c,x+20+i*55,y+18,30,18,4,'#d5ece9','#84b6bb');
   // Objetos visuales anclados a las paredes: no añaden colisiones ni bloquean la visión.
   if(d.type==='classroom'){
    for(let i=0;i<2;i++){rr(c,x+22+i*39,y+14,28,35,3,['#547d75','#647d9c'][i],'#d7d8ba');text(c,['Σ','✦'][i],x+36+i*39,y+39,18,'#e8e4c4');}
    rr(c,x+w*.42,y+12,52,17,4,'#394b51','#b3bbad');text(c,'08:30',x+w*.42+26,y+25,10,'#cde7df');
    for(let i=0;i<3;i++){c.fillStyle=['#d9b877','#b9cfb1','#b6c9cc'][i];c.fillRect(x+20+i*18,y+h-22,12,7);}
   }else if(d.type==='office'||d.type==='meeting'){
    for(let i=0;i<3;i++){rr(c,x+12+i*24,y+h-30,18,11,2,['#9a634d','#75979d','#a29371'][i]);c.fillStyle='#f3e7c7';c.fillRect(x+15+i*24,y+h-27,11,2);}
    rr(c,x+w*.4,y+9,38,33,3,'#af9c7c','#765c49');rr(c,x+w*.4+7,y+15,24,18,2,'#e8d7ac');
    if(d.type==='meeting'){c.strokeStyle='#5b806b';c.lineWidth=5;c.strokeRect(x+w-75,y+h-52,58,33);}
   }else if(d.type==='hall'){
    c.fillStyle='#9c314488';for(let i=0;i<7;i++){c.beginPath();c.moveTo(x+3,y+5+i*54);c.lineTo(x+3,y+31+i*54);c.lineTo(x+43,y+18+i*54);c.fill();}
    for(let i=0;i<3;i++)rr(c,x+32,y+65+i*105,11,34,4,'#e7b978','#955b54');
    c.strokeStyle='#e0bc7b77';c.lineWidth=5;c.strokeRect(x+5,y+5,w-10,h-10);
   }else if(d.type==='reception'){
    rr(c,x+w*.4,y+30,80,80,40,'#9ed6c550','#3b786c');
    for(let i=0;i<4;i++)rr(c,x+w-38,y+65+i*39,16,26,2,'#73888b','#d2ddce');
    rr(c,x+50,y+h-100,100,22,7,'#668c85','#3d665f');
   }else if(d.type==='stairs'){
    for(let i=0;i<3;i++)rr(c,x+w-24,y+20+i*40,10,18,3,'#d4dfd2','#718a90');
   }else if(d.type==='bath'){
    for(let i=0;i<3;i++)rr(c,x+20+i*49,y+h-37,20,25,3,'#e8efe9','#82b3b8');
   }

  }else if(d.kind==='hall-detail'){
   const x=d.x*TILE,y=d.y*TILE,w=d.w*TILE,h=d.h*TILE;
   c.fillStyle='#d9eac716';c.fillRect(x+4,y+4,w-8,h-8);
   rr(c,x+10,y+12,Math.max(20,w-20),9,4,'#b9d2cf55');
   for(let i=0;i<3;i++){const xx=x+18+i*19,yy=y+h-24;rr(c,xx,yy,12,14,2,['#7ba8ad','#c39177','#9fb689'][i],'#304c55');}
   c.fillStyle='#55885d';for(const [dx,dy] of [[5,5],[w-10,h-14]]){c.beginPath();c.arc(x+dx,y+dy,8,0,Math.PI*2);c.fill();}
   if(d.x%3===0){rr(c,x+w*.5-10,y+8,20,13,3,'#477276','#a3c5bb');c.fillStyle='#e7e4b2';c.fillRect(x+w*.5-5,y+12,10,3);}
   else if(d.y%3===0){c.strokeStyle='#bfcfbd66';c.lineWidth=2;c.beginPath();c.moveTo(x+w*.5-14,y+h*.5);c.lineTo(x+w*.5+14,y+h*.5);c.moveTo(x+w*.5+8,y+h*.5-6);c.lineTo(x+w*.5+14,y+h*.5);c.lineTo(x+w*.5+8,y+h*.5+6);c.stroke();} 
  }
 }
 for(const d of map.decor||[]){if(d.kind==='window'){rr(c,d.x*TILE,d.y*TILE,d.w*TILE,d.h*TILE,3,'#aedce2','#e6ede1');c.strokeStyle='#e6ede1';c.lineWidth=4;c.beginPath();c.moveTo(d.x*TILE,(d.y+d.h/2)*TILE);c.lineTo((d.x+d.w)*TILE,(d.y+d.h/2)*TILE);c.stroke();}else if(d.kind==='notice'){rr(c,d.x*TILE,d.y*TILE,d.w*TILE,d.h*TILE,2,'#f3e3af','#937858');text(c,'AULA',(d.x+d.w/2)*TILE,(d.y+d.h*.65)*TILE,8,'#756c50');}else if(d.kind==='stairs'){rr(c,d.x*TILE,d.y*TILE,d.w*TILE,d.h*TILE,3,'#9fabb8','#546674');for(let y=0;y<d.h*TILE;y+=20){c.strokeStyle='#667989';c.lineWidth=3;c.beginPath();c.moveTo(d.x*TILE,(d.y*TILE)+y);c.lineTo((d.x+d.w)*TILE,(d.y*TILE)+y);c.stroke();}}}
 if(map.worldId==='club')drawClubFloor(c,map);if(map.worldId==='gym')drawGymFloor(c,map);if(map.worldId==='house')drawHouseFloor(c,map);
 if(arch)drawFloorAO(c,map);
 if(arch)drawArchitecture(c,map,floorAt);if(arch)drawSchoolMainDoor(c,map);
 const volumeWalls=floorOnly&&!!wallTheme(map.worldId)&&!map.isMeeting;
 for(const p of [...map.props].filter(p=>(!floorOnly||p.kind==='wall')&&!(volumeWalls&&p.kind==='wall')&&!(arch&&p.kind==='wall'&&boundaryWall(map,p,floorAt))).sort((a,b)=>(a.kind==='wall'?-1:b.kind==='wall'?1:(a.y+a.h)-(b.y+b.h))))drawProp(c,p);
 // Los nombres pertenecen al minimapa y al indicador de zona, nunca al suelo.
 for(const d of map.doors||[]){c.strokeStyle='#fff5';c.lineWidth=4;c.beginPath();if(d.h>d.w){const x=(d.x+.5)*TILE;c.moveTo(x,d.y*TILE);c.lineTo(x,(d.y+d.h)*TILE);c.stroke();rr(c,d.x*TILE,d.y*TILE-8,50,10,2,'#806b55');rr(c,d.x*TILE,(d.y+d.h)*TILE-2,50,10,2,'#806b55');}else{c.moveTo(d.x*TILE,d.y*TILE+18);c.lineTo((d.x+d.w)*TILE,d.y*TILE+18);c.stroke();rr(c,d.x*TILE-8,d.y*TILE,10,50,2,'#806b55');rr(c,(d.x+d.w)*TILE-2,d.y*TILE,10,50,2,'#806b55');}}
 cache.set(base,can);freezeMap(can,cache,base);return can;
}
function drawAnimatedDoors(c,map,state){
 const now=state.serverTime+(Date.now()-(state.receivedAt||Date.now())),sets=[];
 const s=state.sabotage;if(s&&(s.doorIds||s.closed)?.length)sets.push({ids:s.doorIds||s.closed,at:s.started,until:s.until||Infinity});
 for(const l of state.doorLocks||[])sets.push({ids:l.doors,at:l.at,until:l.until});
 for(const set of sets){const amount=Math.max(0,Math.min(1,(now-set.at)/350))*(1-Math.max(0,Math.min(1,(now-set.until)/400)));if(amount<=0)continue;
  for(const d of map.doors.filter(d=>set.ids.includes(d.id))){const x=d.x*TILE,y=d.y*TILE,vertical=d.h>d.w,len=(vertical?d.h:d.w)*TILE;c.save();c.translate(x,y);const fill='#9c687c';
   if(vertical){rr(c,-12,0,24,len/2*amount,4,fill,'#302b43');rr(c,-12,len-len/2*amount,24,len/2*amount,4,fill,'#302b43');c.fillStyle='#e5c487';c.fillRect(-6,4,12,5);c.fillRect(-6,len-9,12,5);}
   else{rr(c,0,-12,len/2*amount,24,4,fill,'#302b43');rr(c,len-len/2*amount,-12,len/2*amount,24,4,fill,'#302b43');c.fillStyle='#e5c487';c.fillRect(4,-6,5,12);c.fillRect(len-9,-6,5,12);}
   // Barra de cierre: indica cuánto falta para que se abran solas.
   if(Number.isFinite(set.until)&&amount>=1){const left=Math.max(0,Math.min(1,(set.until-now)/(set.until-set.at)));c.fillStyle='#ff6b6b';if(vertical)c.fillRect(14,len/2-12,4,24*left);else c.fillRect(len/2-12,14,24*left,4);}
   c.restore();}}
}
// Flechas de sabotaje: solo flechas (sin texto), amarillas/anaranjadas, que
// parpadean con suavidad. Cada panel pendiente tiene la suya; se colocan en el
// borde de la pantalla en la dirección del panel (un poco por encima del centro
// vertical cuando corresponde) y nunca invaden el centro, el personaje ni los
// controles. Si el panel ya se ve en pantalla, la flecha se queda encima de él.
function hudLimits(c,w,h){
 let r=null;try{r=c.canvas.getBoundingClientRect();}catch{}
 let top=58,bottom=h-150,left=26,right=w-26;
 if(!r)return {top,bottom,left,right};
 const mobile=document.documentElement?.classList?.contains('touch-mode');
 for(const id of ['missionHud','hudCorner','location']){const el=document.getElementById(id);if(!el||el.hidden||!el.offsetParent)continue;const b=el.getBoundingClientRect();if(b.width&&b.bottom-r.top<h*.4)top=Math.max(top,Math.min(b.bottom-r.top+30,h*.3));}
 let low=h-(mobile?120:90);for(const el of [document.getElementById('touchMovement'),...document.querySelectorAll('.action-bar .action')]){if(!el||el.hidden||!el.offsetParent)continue;const b=el.getBoundingClientRect();if(b.width&&b.top-r.top>h*.45)low=Math.min(low,b.top-r.top-34);}
 bottom=Math.max(top+60,Math.min(bottom,low,h*.74));
 const safe=readSafe();left=26+safe.l;right=w-26-safe.r;
 // Controles del DOM que pueden quedar encima del lienzo: las flechas los esquivan.
 const boxes=[];for(const el of [document.getElementById('inventory'),document.getElementById('touchMovement'),document.getElementById('missionHud'),document.getElementById('hudCorner'),...document.querySelectorAll('.action-bar .action')]){if(!el||el.hidden||!el.offsetParent)continue;const b=el.getBoundingClientRect();if(b.width)boxes.push({l:b.left-r.left-26,t:b.top-r.top-26,r:b.right-r.left+26,b:b.bottom-r.top+26});}
 return {top,bottom,left,right,boxes};
}
let safeProbe=null;
function readSafe(){try{if(!safeProbe){safeProbe=document.createElement('div');safeProbe.style.cssText='position:fixed;visibility:hidden;pointer-events:none;padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px)';document.body.append(safeProbe);}const cs=getComputedStyle(safeProbe);return {l:parseFloat(cs.paddingLeft)||0,r:parseFloat(cs.paddingRight)||0};}catch{return {l:0,r:0};}}
function sabotageTargets(state,local){const {FLOORS}=worldFor(state);
 if(state.phase!=='game'||!state.sabotage)return [];
 const pending=activeRepairs(state).filter(r=>!state.sabotage.fixed.includes(r.id)),here=pending.filter(r=>r.floor===state.me.floor);
 if(here.length)return here;
 const d=sabotageDestination(state,local);return d?[d]:[];
}
function dodge(x,y,{top,bottom,left,right,boxes=[]}){
 const inside=(px,py)=>boxes.find(q=>px>q.l&&px<q.r&&py>q.t&&py<q.b);let q=inside(x,y);if(!q)return {x,y};
 const options=[{x,y:q.t},{x,y:q.b},{x:q.r,y},{x:q.l,y}].filter(o=>o.x>=left-1&&o.x<=right+1&&o.y>=top-1&&o.y<=bottom+1&&!inside(o.x,o.y)).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y));
 return options[0]||{x,y};
}
export function sabotageArrowSpots(state,local,cam,w,h,limits){
 const scale=cam.scale||1,px=w/2+(local.x-cam.x)*scale,py=h/2+(local.y-cam.y)*scale,out=[];
 for(const t of sabotageTargets(state,local)){
  const tx=w/2+(t.x-cam.x)*scale,ty=h/2+(t.y-cam.y)*scale,dx=tx-px;
  if(!t.stair&&Math.hypot(t.x-local.x,t.y-local.y)<100)continue; // ya está al lado
  const {top,bottom,left,right}=limits;
  if(tx>left+30&&tx<right-30&&ty>top+40&&ty<bottom){const ay=Math.max(top+10,ty-78*scale);if(Math.hypot(tx-px,ay-py)>120)out.push({id:t.id,...dodge(tx,ay,limits),angle:Math.PI/2,near:true});continue;}
  // Intersección del rayo jugador→panel con el marco interior; la referencia
  // vertical se sube un poco para que las flechas queden algo más arriba.
  const ox=px,oy=Math.min(py,(top+bottom)/2);let k=Infinity;
  if(dx>0)k=Math.min(k,(right-ox)/dx);if(dx<0)k=Math.min(k,(left-ox)/dx);
  if(ty-oy>0)k=Math.min(k,(bottom-oy)/(ty-oy));if(ty-oy<0)k=Math.min(k,(top-oy)/(ty-oy));
  if(!isFinite(k))continue;
  const x=Math.max(left,Math.min(right,ox+dx*k)),y=Math.max(top,Math.min(bottom,oy+(ty-oy)*k));
  out.push({id:t.id,...dodge(x,y,limits),angle:Math.atan2(ty-oy,dx),near:false});
 }
 return out;
}
const arrowAngles=new Map();
function drawSabotageGuide(c,state,local,w,h,dt,cam){
 if(state.phase!=='game'||!state.sabotage||!local){arrowAngles.clear();return;}
 const spots=sabotageArrowSpots(state,local,cam,w,h,hudLimits(c,w,h)),calm=state.reducedEffects||document.documentElement?.classList?.contains('calm-alarm');
 const t=performance.now(),blink=calm?.92:.62+.38*(.5+.5*Math.sin(t/240));
 for(const s of spots){
  const prev=arrowAngles.get(s.id),a=prev==null?s.angle:prev+Math.atan2(Math.sin(s.angle-prev),Math.cos(s.angle-prev))*(1-Math.exp(-12*Math.max(0,dt)));arrowAngles.set(s.id,a);
  c.save();c.translate(s.x,s.y);c.rotate(a);c.globalAlpha=blink;
  c.shadowColor='#00000066';c.shadowBlur=6;
  c.beginPath();c.moveTo(24,0);c.lineTo(-14,-19);c.lineTo(-6,0);c.lineTo(-14,19);c.closePath();
  const g=c.createLinearGradient(-14,-19,24,19);g.addColorStop(0,'#ffd34d');g.addColorStop(1,'#ff9416');c.fillStyle=g;c.fill();
  c.shadowBlur=0;c.lineJoin='round';c.lineWidth=3;c.strokeStyle='#6b3300';c.stroke();
  c.restore();
 }
}
export function drawWorld(canvas,state,local,rendered,cam,dt,time){const {FLOORS,LOBBY,MEETING,mapFor,taskStation}=worldFor(state);
 const interiorOnly=!!state.interiorOnly;if(!interiorOnly)trackQuality();const c=canvas.getContext('2d',{alpha:interiorOnly}),rect=(b=>({width:b.w,height:b.h}))(canvasBox(canvas)),dpr=Math.min(quality.cap,window.devicePixelRatio||1),W=Math.max(1,Math.round(rect.width*dpr)),H=Math.max(1,Math.round(rect.height*dpr));if(Math.abs(canvas.width-W)>1||Math.abs(canvas.height-H)>1){canvas.width=W;canvas.height=H;}
 c.setTransform(dpr,0,0,dpr,0,0);tagDpr=dpr;const w=rect.width,h=rect.height,map=state.phase==='meeting'?MEETING:state.phase==='lobby'?LOBBY:mapFor(state.me.floor,blockersOf(state,state.serverTime+(Date.now()-(state.receivedAt||Date.now())))),scale=map.isCaravan?Math.max(.65,Math.min(.95,w/1280,h/980)):viewScale(w,h);cam.scale=scale;setShadows(map.worldId!=='park');
 updateCamera(cam,local,local.input||{x:0,y:0},dt,scale);
 // 14.3 · Temblor de cámara muy leve en la caravana (antes de salir) y durante
 // los sabotajes. Desactivado con «movimiento reducido». Solo desplaza la vista.
 const shake=state.reducedEffects?0:state.phase==='lobby'?1.1:state.phase==='game'&&state.sabotage?(state.sabotage.kind==='emergency'?2.4:1.5):0;
 if(shake){const t=time/1000;cam.x+=(Math.sin(t*13.1)+Math.sin(t*7.3+1.7)*.6)*shake/scale;cam.y+=(Math.sin(t*11.7+.4)+Math.sin(t*5.9+2.1)*.6)*shake*.8/scale;}
 if(interiorOnly)c.clearRect(0,0,w,h);else{c.fillStyle='#233442';c.fillRect(0,0,w,h);}c.save();c.translate(w/2-cam.x*scale,h/2-cam.y*scale);c.scale(scale,scale);if(map.isCaravan&&!interiorOnly)drawCaravanScenery(c,time,{x:cam.x,y:cam.y,w:w/scale,h:h/scale});else if(!map.isMeeting&&!interiorOnly)drawExterior(c,map,{x:cam.x,y:cam.y,w:w/scale,h:h/scale},time,{quality:quality.cap,reduced:state.reducedEffects});c.drawImage(mapImage(map,true),0,0);if(!map.isCaravan&&!map.isMeeting&&!interiorOnly)drawExteriorCars(c,map,{x:cam.x,y:cam.y,w:w/scale,h:h/scale},time,{reduced:state.reducedEffects});

 if(map.worldId==='gym')drawGymAmbient(c,map,time,{x:cam.x,y:cam.y,w:w/scale,h:h/scale});
 if(map.worldId==='club')drawClubAmbient(c,map,time,state.sabotage,{x:cam.x,y:cam.y,w:w/scale,h:h/scale,reduced:state.reducedEffects});
 for(const d of map.decor||[])if(d.kind==='hall-detail'){
  const x=(d.x+d.w/2)*TILE,y=(d.y+.28)*TILE,pulse=.12+.08*Math.sin(time/460+x*.014);
  // Un sprite con el degradado ya pintado, en vez de crear y rellenar 30–50
  // degradados radiales por fotograma (era el mayor coste del dibujo en el
  // colegio). Mismo aspecto: la opacidad del pulso se aplica con globalAlpha.
  if(quality.cap<1||Math.abs(x-cam.x)>w/scale/2+60||Math.abs(y-cam.y)>h/scale/2+60)continue; // en equipos lentos se omite este brillo decorativo
  c.globalAlpha=pulse;c.drawImage(hallGlow(),x-52,y-52);c.globalAlpha=1;
 }
 drawAnimatedDoors(c,map,state);
 const view={x:cam.x,y:cam.y,w:w/scale,h:h/scale},inView=(x,y,m=160)=>Math.abs(x-view.x)<=view.w/2+m&&Math.abs(y-view.y)<=view.h/2+m;
 const nowS=state.serverTime+(Date.now()-(state.receivedAt||Date.now()));
 // 15.0 · Visión sin círculo: se ve todo lo que cabe en la cámara salvo lo que
 // tapan las paredes. Solo un apagón (sabotaje) limita la distancia.
 const fog=state.phase==='game'&&state.me.alive,limited=fog&&visionLimited(state.me.vision),radius=limited?state.me.vision:Math.hypot(view.w,view.h)/2+140;
 const vision=fog?safeVisibility(map,local,radius,visionFrames.get(canvas)):null,points=vision?.points||[];if(vision)visionFrames.set(canvas,vision);
 const sees=t=>!fog||characterVisible(map,local,t,radius),clipLimit=()=>{};// 16.2 · la penumbra la pone la máscara de luz (sin recorte circular duro)
 drawVents(c,map,state,time,nowS,view,fog?v=>characterVisible(map,local,v,radius):null);
  if(state.phase==='game')drawMechanicsFloor(c,state,map,time,local);
 if(state.phase==='game')drawItemsWorld(c,state,map,time,local,q=>(q.floor??map.floor)===map.floor&&Math.abs(q.x-cam.x)<w/scale/2+120&&Math.abs(q.y-cam.y)<h/scale/2+120);
 // Una sola pasada ordenada por la base de cada elemento: muebles, tramos de
 // pared, dispositivos, cadáveres y personajes. Cada uno tapa exactamente lo que
 // queda detrás de él; ya no hace falta «repintar» muebles sobre los personajes.
 const scene=[],walled=!!wallTheme(map.worldId)&&!map.isMeeting&&!map.isCaravan,margin=160;
 const rectInView=(x,y,ww,hh)=>x+ww>view.x-view.w/2-margin&&x<view.x+view.w/2+margin&&y+hh>view.y-view.h/2-margin&&y<view.y+view.h/2+margin;
 for(const p of map.props){
  if(p.kind==='wall'&&!p.parkTree&&!p.parkWall){if(walled&&!boundaryWall(map,p,floorAt)){const v=wallVolumeRect(p);if(rectInView(v.x,v.y,v.w,v.h))pushWall(scene,c,p,map.worldId,local,points);}continue;}
  if(isParkFlat(p)||p.parkGrove)continue;const z=propHeight(p);if(!rectInView(p.x*TILE-24,p.y*TILE-z-30,p.w*TILE+48,p.h*TILE+z+54))continue;pushProp(scene,c,p,points,fog);
 }
 // En la caravana, el vestuario y el ordenador se resaltan por su silueta al acercarse.
 if(state.phase==='lobby'&&local){drawLobbyHalo(c,local,time);const o=nearestLobbyObject(local),prop=o&&map.props.find(p=>p.kind==='rv-'+o.id);if(prop)scene.push({y:(prop.y+prop.h)*TILE+.5,draw:()=>drawHostOutline(c,prop,drawCaravanProp,{tone:'task',mode:'near',time})});}
 const assigned=(state.progress?.blocked?[]:state.me.tasks.filter(t=>!t.done)).map(taskStation);
 for(const s of [...map.stations,...assigned.filter(s=>s.floor===map.floor&&!map.stations.some(q=>q.x===s.x&&q.y===s.y))]){
  if(!inView(s.x,s.y))continue; // estaciones fuera de pantalla: no se dibujan
  const pending=assigned.some(t=>t.id===s.id&&t.floor===s.floor&&t.x===s.x&&t.y===s.y);
  const near=pending&&state.phase==='game'&&local&&(local.floor??map.floor)===map.floor&&distance(local,s)<=USE_RANGE+10,mode=near?'near':pending?'pending':'idle';
  // En el parque la tarea vive en su propio objeto del mapa (bomba, válvula,
  // cuadro…): solo se dibuja el contorno que sigue su silueta.
  scene.push({y:s.y+10,draw:()=>drawDevice(c,s.x,s.y,s.kind,{mode,tone:'task',time,world:map.worldId})});
 }
 // Cámaras y pantallas con vida propia, sin alterar la geometría de colisiones.
 for(const d of map.decor||[])if(d.kind==='room-detail'&&['office','classroom','reception'].includes(d.type)){
  const x=(d.x+d.w-.78)*TILE,y=(d.y+.24)*TILE,pulse=.55+.45*Math.sin(time/650+x*.01);
  rr(c,x-8,y-8,17,11,3,'#314f59','#b9d3bf');c.fillStyle=`rgba(245,111,103,${pulse})`;c.beginPath();c.arc(x+3,y-2,2.5,0,Math.PI*2);c.fill();
  if(d.type==='classroom'){c.fillStyle=`rgba(235,248,204,${pulse*.08})`;c.beginPath();c.moveTo(x,y);c.lineTo(x-58,y+65);c.lineTo(x+38,y+65);c.fill();}
 }
 for(const stair of state.config?.floors==='both'?map.stairs||[]:[]){const y=stair.y+Math.sin(time/340)*5;c.save();c.translate(stair.x,y);c.fillStyle='#e8edc9c7';c.beginPath();c.moveTo(0,-17);c.lineTo(10,-4);c.lineTo(5,-4);c.lineTo(5,8);c.lineTo(-5,8);c.lineTo(-5,-4);c.lineTo(-10,-4);c.closePath();c.fill();c.restore();}
 for(const r of map.repair||[]){if(!inView(r.x,r.y))continue;scene.push({y:r.y+5,draw:()=>{const active=activeRepairs(state).some(p=>p.id===r.id),done=active&&state.sabotage?.fixed.includes(r.id),near=active&&!done&&local&&distance(local,r)<=USE_RANGE+10;drawDevice(c,r.x,r.y,r.kind,{mode:active&&!done?(near?'near':'pending'):'idle',tone:'repair',time,fixed:done});if(active&&!done)text(c,'⚡',r.x,r.y-62+Math.sin(time/200)*3,18,'#ff7185');}});}
 for(const b of state.bodies){if(state.phase==='game'&&state.me.alive&&!sees(b))continue;scene.push({y:b.y-2,draw:()=>drawBody(c,b,nowS)});}
 const entities=[...state.players,...(state.phase==='game'?(state.me.items?.decoys||[]):[]),...(state.phase==='game'?state.wildlife||[]:[])].map(p=>({...p,...(p.id===state.me.id?local:rendered.get(p.id)||p)})).sort((a,b)=>a.y-b.y),fx=state.worldKill,fxAge=fx?nowS-fx.at:Infinity,killScene=fx&&fxAge>=0&&fxAge<1100&&state.phase==='game'&&sees({x:fx.victimX,y:fx.victimY});
 const tags=[],shown=[];
 // 16.2 · Segunda Oportunidad: destello al revivir (sin señalar al atacante).
 const rv=state.reviveFx;if(rv&&nowS<rv.until&&(!fog||sees(rv))){const k=Math.max(0,Math.min(1,(nowS-rv.at)/rv.until*0+(nowS-rv.at)/2200));scene.push({y:rv.y+1,draw:()=>{c.save();c.globalAlpha=1-k;c.strokeStyle='#fff3a8';c.lineWidth=4;for(let i=0;i<2;i++){c.beginPath();c.ellipse(rv.x,rv.y-40,28+k*60+i*14,46+k*50+i*10,0,0,Math.PI*2);c.stroke();}c.fillStyle='#fff3a8';for(let i=0;i<10;i++){const a=i*.628+k*3;c.beginPath();c.arc(rv.x+Math.cos(a)*(30+k*70),rv.y-40+Math.sin(a)*(40+k*60),3.5,0,7);c.fill();}c.restore();}});}
 for(const p of entities){
  if(p.isWildlife){if(!sees(p))continue;shown.push(p);scene.push({y:p.y,draw:()=>{c.save();clipLimit();drawAnimal(c,p,time);c.restore();}});continue;}
  if(p.vent&&!p.transition)continue;if(state.phase==='game'&&p.id!==state.me.id&&state.me.alive&&!sees(p))continue;if(killScene&&(p.id===fx.actor||fx.kind==='miss'&&p.id===fx.target))continue;
  const transition=p.transition,age=transition?nowS-transition.at:0;let alpha=1,size=.84;
  if(transition?.kind==='vent-in'){alpha=Math.max(0,1-age/500);size*=Math.max(.1,1-age/600);}else if(transition?.kind==='vent-out'){alpha=Math.min(1,age/550);size*=.3+.7*alpha;}else if(p.vent)continue;
  const visual=p.abilityVisual,visualAge=visual?nowS-visual.at:Infinity;
  if(p.abilityUntil>nowS&&visual?.kind==='phantom-in')alpha*=Math.max(p.id===state.me.id ? .23 : 0,1-visualAge/600);
  else if(visual?.kind==='phantom-out')alpha*=Math.min(1,Math.max(.18,visualAge/600));
  else if(p.abilityUntil>nowS)alpha*=p.id===state.me.id ? .23 : 1;
  shown.push(p);
  scene.push({y:p.y,actor:p,size,draw:()=>{
   c.save();if(p.id!==state.me.id)clipLimit();c.globalAlpha=Math.max(0,Math.min(1,alpha*(p.id===state.me.id?1:p.alpha??1)));
   if(state.phase==='meeting'&&p.alive&&state.meeting.stage==='voting'&&state.meeting.myVote===null){c.fillStyle=state.selectedVote===p.id?'#f2ca65a8':'#65e79b85';c.beginPath();c.ellipse(p.x,p.y+22,39,16,0,0,Math.PI*2);c.fill();}
   if(state.phase==='meeting'&&!p.alive)c.globalAlpha=.46;
   if(visual&&visualAge>=0&&visualAge<600){c.strokeStyle=visual.kind.startsWith('phantom')?'#b496ff':'#6df4df';c.lineWidth=4;c.beginPath();c.ellipse(p.x,p.y-23,25+visualAge/19,38+visualAge/15,0,0,Math.PI*2);c.stroke();for(let i=0;i<7;i++){const a=i*6.28/7+time/450;c.fillStyle=c.strokeStyle;c.fillRect(p.x+Math.cos(a)*(18+visualAge/34),p.y-23+Math.sin(a)*(30+visualAge/30),4,4);}}
   drawActorInteraction(c,p,nowS,time,state.reducedEffects);drawRobot(c,p,p.x,p.y,size,time,!!(p.input?.x||p.input?.y||p.moving),p.id===state.me.id);c.restore();
  }});
  const imp=state.roster.find(q=>q.id===p.id)?.role==='impostor'||(p.isDecoy&&state.me.role==='impostor'&&(p.own||p.teammate)),tagAlpha=Math.max(0,Math.min(1,alpha*(p.id===state.me.id?1:p.alpha??1)))*(state.phase==='meeting'&&!p.alive?.46:1);
  tags.push(()=>{c.save();if(p.id!==state.me.id)clipLimit();c.globalAlpha=tagAlpha;nameTag(c,p.name+(p.id===state.me.id?' · tú':'')+(state.phase==='meeting'&&state.roster.find(q=>q.id===p.id)?.muted?' 🔇':''),p.x,p.y-94,imp?'#ff697e':p.id===state.me.id?'#efffe9':'#f0f4e9',{bg:p.nameBg,color:p.nameColor,force:imp?'#ff697e':null});
   if(state.phase==='game'&&p.ghostMsg){c.font='700 12px Segoe UI';const label=p.ghostMsg,width=Math.min(240,Math.max(60,c.measureText(label).width+24));rr(c,p.x-width/2,p.y-132,width,34,12,'#2a1763ee','#c9b3ff');text(c,'👻 '+label,p.x,p.y-110,12,'#f3ecff');}
   if(state.phase==='meeting'){const msg=[...state.chat].reverse().find(m=>m.playerId===p.id&&nowS-m.time<6500);if(msg){c.font='700 12px Segoe UI';const label=msg.text,width=Math.min(225,Math.max(55,c.measureText(label).width+22));rr(c,p.x-width/2,p.y-125,width,34,9,'#fff5df','#385863');text(c,label.length>31?label.slice(0,30)+'…':label,p.x,p.y-103,12,'#263d43');}}
   c.restore();});
 }
 if(state.phase==='game')for(const t of state.teachers||[]){const at=rendered.get(t.id)||t;if(!sees(at))continue;const hold=t.grab&&nowS<t.grab.until?{x:t.grab.tx,y:t.grab.ty}:null;shown.push({...at,size:.72});
  scene.push({y:at.y,actor:at,size:.72,draw:()=>{c.save();clipLimit();c.globalAlpha=at.alpha??1;drawTeacher(c,t,at,time,hold);c.restore();}});
  tags.push(()=>{c.save();clipLimit();text(c,'PROF. '+t.name,at.x,at.y-68,12,'#173a76');c.restore();});}
 scene.sort((a,b)=>a.y-b.y);
 for(const item of scene){if(item.clip){c.save();c.beginPath();c.rect(item.clip.x,item.clip.y,item.clip.w,item.clip.h);c.clip();item.draw();c.restore();}else item.draw();}
 if(state.phase==='game')drawMechanicsShade(c,state,map,time);
 if(map.isCaravan)drawCaravanActivity(c,state.players,time,local,state.tableStats);
 // Capa de luz: el suelo, cada cara de pared y cada mueble reciben su parte
 // iluminada y su parte en sombra según lo que de verdad se ve desde el jugador.
 if(fog&&points.length>=3){const mask=buildLightMask(w,h,cam,scale,map,local,points,scene,limited?radius:0);c.drawImage(mask.canvas,0,0,mask.W,mask.H,view.x-view.w/2,view.y-view.h/2,mask.W/mask.k/scale,mask.H/mask.k/scale);}
 if(state.debugVision)drawVisibilityDebug(c,map,local,points);
 if(killScene){c.save();clipLimit();const pose=drawWitnessKill(c,fx,time,fxAge,sees);if(pose?.visible)nameTag(c,fx.attacker.name,pose.attacker.x,pose.attacker.y-94,state.me.role==='impostor'&&state.roster.find(q=>q.id===fx.actor)?.role==='impostor'?'#ff697e':'#f0f4e9',{bg:fx.attacker.nameBg,color:fx.attacker.nameColor});c.restore();}
 for(const tag of tags)tag();
 // Jaulas visibles para todos y escudo solo para quien lo lleva.
 if(state.phase==='game'){for(const cg of state.me.items?.cages||[]){const who=cg.id===state.me.id?local:entities.find(p=>p.id===cg.id);if(!who||fog&&who!==local&&!sees(who))continue;c.save();clipLimit();drawCage(c,who.x,who.y,time);c.restore();}if(state.me.items?.shieldUntil>nowS&&state.me.alive)drawShield(c,local.x,local.y,time,state.me.items.shieldUntil,nowS);}
 ventHits=state.phase==='game'&&state.me.vent&&local?drawVentArrows(c,state,local,worldFor(state).VENTS,time):[];
 if(state.phase==='meeting'&&state.meeting.myVote&&state.meeting.myVote!=='skip'){const chosen=entities.find(q=>q.id===state.meeting.myVote);if(chosen){c.strokeStyle='#f4d381';c.lineWidth=4;c.beginPath();c.moveTo(local.x,local.y-35);c.lineTo(chosen.x,chosen.y-35);c.stroke();text(c,'👍',local.x+Math.sign(chosen.x-local.x)*28,local.y-55,30,'#fff4d4');}}
 c.restore();
 if(state.phase==='game')drawSabotageGuide(c,state,local,w,h,dt,cam);
 if(state.me.transition?.kind==='stairs'||state.me.transition?.kind==='vent-travel'){const elapsed=Date.now()-(state.receivedAt||Date.now()),age=state.serverTime-state.me.transition.at+elapsed,alpha=Math.max(0,.75*(1-age/600));c.fillStyle=`rgba(23,42,53,${alpha})`;c.fillRect(0,0,w,h);text(c,state.me.transition.kind==='stairs'?`Planta ${state.me.floor}`:'Conducto de mantenimiento',w/2,h/2,24,`rgba(242,237,215,${alpha})`);}
}
// Escala de cámara: en pantallas pequeñas se aleja para que se vea el escenario completo (nunca por debajo de .68).
export const viewScale=(w,h)=>Math.max(.68,Math.min(1.42,w/1050,h/610));
export function worldPoint(canvas,cam,event){const rect=canvas.getBoundingClientRect(),scale=cam.scale||viewScale(rect.width,rect.height);return {x:cam.x+(event.clientX-rect.left-rect.width/2)/scale,y:cam.y+(event.clientY-rect.top-rect.height/2)/scale};}
// BETA · Plano holográfico con tres modos: normal (azul), localizador (verde)
// y sabotaje (rojo). Es esquemático y translúcido: salas, pasillos y marcas.
// Las zonas pulsables (círculos de sabotaje) se guardan en canvas.__hits en
// píxeles del lienzo para que el cliente resuelva el toque sin recalcular.
const HOLO={normal:{line:'#58b6ff',fill:'88,182,255',glow:'#2a7fd6',ink:'#dff1ff'},locator:{line:'#4fe39a',fill:'79,227,154',glow:'#1f9e60',ink:'#e2ffef'},sabotage:{line:'#ff5d6c',fill:'255,93,108',glow:'#c0283a',ink:'#ffe6e9'}};
function holoIcon(c,kind,x,y,s,color){c.save();c.translate(x,y);c.strokeStyle=color;c.fillStyle=color;c.lineWidth=Math.max(1.5,s*.12);c.lineCap='round';c.lineJoin='round';c.beginPath();
 if(kind==='lights'){c.arc(0,-s*.12,s*.3,Math.PI*.8,Math.PI*2.2);c.lineTo(s*.14,s*.26);c.lineTo(-s*.14,s*.26);c.closePath();c.stroke();c.beginPath();c.moveTo(-s*.12,s*.38);c.lineTo(s*.12,s*.38);c.stroke();}
 else if(kind==='electrical'||kind==='power'){c.moveTo(s*.08,-s*.42);c.lineTo(-s*.2,s*.04);c.lineTo(s*.02,s*.04);c.lineTo(-s*.08,s*.42);c.lineTo(s*.22,-s*.06);c.lineTo(0,-s*.06);c.closePath();c.fill();}
 else if(kind==='audio'){c.moveTo(-s*.34,-s*.12);c.lineTo(-s*.14,-s*.12);c.lineTo(s*.1,-s*.34);c.lineTo(s*.1,s*.34);c.lineTo(-s*.14,s*.12);c.lineTo(-s*.34,s*.12);c.closePath();c.fill();c.beginPath();c.moveTo(s*.2,-s*.18);c.lineTo(s*.4,s*.18);c.moveTo(s*.4,-s*.18);c.lineTo(s*.2,s*.18);c.stroke();}
 else if(kind==='computers'){c.rect(-s*.36,-s*.28,s*.72,s*.46);c.stroke();c.beginPath();c.moveTo(-s*.16,s*.36);c.lineTo(s*.16,s*.36);c.moveTo(0,s*.18);c.lineTo(0,s*.36);c.stroke();}
 else if(kind==='bell'){c.moveTo(-s*.3,s*.2);c.quadraticCurveTo(-s*.26,-s*.36,0,-s*.36);c.quadraticCurveTo(s*.26,-s*.36,s*.3,s*.2);c.closePath();c.stroke();c.beginPath();c.arc(0,s*.3,s*.07,0,Math.PI*2);c.fill();}
 else if(kind==='doors'){c.rect(-s*.26,-s*.36,s*.52,s*.72);c.stroke();c.beginPath();c.moveTo(0,-s*.36);c.lineTo(0,s*.36);c.stroke();c.beginPath();c.arc(-s*.08,0,s*.05,0,Math.PI*2);c.arc(s*.08,0,s*.05,0,Math.PI*2);c.fill();}
 else if(kind==='lock'){c.rect(-s*.26,-s*.04,s*.52,s*.4);c.fill();c.beginPath();c.arc(0,-s*.06,s*.18,Math.PI,0);c.stroke();}
 else if(kind==='task'){c.moveTo(0,-s*.42);c.lineTo(s*.38,s*.3);c.lineTo(-s*.38,s*.3);c.closePath();c.fill();c.fillStyle='#10202c';c.fillRect(-s*.04,-s*.16,s*.08,s*.24);c.fillRect(-s*.04,s*.14,s*.08,s*.08);}
 else if(kind==='person'){c.arc(0,-s*.18,s*.2,0,Math.PI*2);c.fill();c.beginPath();c.moveTo(-s*.32,s*.42);c.quadraticCurveTo(-s*.3,0,0,0);c.quadraticCurveTo(s*.3,0,s*.32,s*.42);c.closePath();c.fill();}
 else {c.moveTo(0,-s*.4);c.lineTo(s*.36,s*.3);c.lineTo(-s*.36,s*.3);c.closePath();c.stroke();c.beginPath();c.moveTo(0,-s*.12);c.lineTo(0,s*.08);c.stroke();}
 c.restore();}
// Cuánto se ha recargado una categoría (0…1). Sin números: solo luz.
export function chargeOf(from,ready,now){if(!ready||now>=ready)return 1;const span=Math.max(1,ready-(from||ready-30000));return Math.max(0,Math.min(1,1-(ready-now)/span));}
export function sabotageCircles(state){const w=worldFor(state),map=w.FLOORS[0],out=[];
 for(const kind of Object.keys(w.SABOTAGES||{})){const r=w.REPAIRS.find(q=>q.sabotages.includes(kind))||w.REPAIRS[0];if(!r)continue;const room=map.rooms.find(q=>q.id===r.room);const x=room?(room.x+room.w/2)*TILE:r.x,y=room?(room.y+room.h/2)*TILE:r.y;out.push({type:'sabotage',kind,x,y,room:r.room,label:w.SABOTAGES[kind].label});}
 const doorRooms=[...new Set((w.DOORS||[]).filter(d=>!d.floor).map(d=>d.room))];
 for(const id of doorRooms){const room=map.rooms.find(q=>q.id===id);if(!room)continue;out.push({type:'doors',kind:'doors',x:(room.x+room.w/2)*TILE,y:(room.y+room.h/2)*TILE,room:id,label:'Cerrar puertas · '+room.name});}
 // Si una sala tiene varias marcas se reparten en fila (en píxeles de pantalla).
 const groups={};for(const t of out)(groups[t.room]||=[]).push(t);for(const g of Object.values(groups))g.forEach((t,i)=>{t.slot=i-(g.length-1)/2;});
 return out;}
export function drawMiniMap(canvas,state,local,{mode='normal',time=Date.now(),serverNow=time}={}){
 const w=worldFor(state),lobby=state.phase==='lobby',map=lobby?w.LOBBY:w.FLOORS[0],th=HOLO[mode]||HOLO.normal,c=canvas.getContext('2d');
 c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,canvas.width,canvas.height);
 const cssWidth=canvas.getBoundingClientRect?.().width||canvas.width,ui=canvas.width/cssWidth,pad=18*ui,s=Math.min((canvas.width-pad*2)/(map.width*TILE),(canvas.height-pad*2)/(map.height*TILE)),ox=(canvas.width-map.width*TILE*s)/2,oy=(canvas.height-map.height*TILE*s)/2;
 const P=(x,y)=>[ox+x*s,oy+y*s],U=v=>v*ui;canvas.__hits=[];
 const shape=r=>{c.beginPath();if(r.outline){r.outline.forEach(([x,y],i)=>{const [px,py]=P(x*TILE,y*TILE);i?c.lineTo(px,py):c.moveTo(px,py);});c.closePath();}else{const [x,y]=P(r.x*TILE,r.y*TILE);c.roundRect(x,y,r.w*TILE*s,r.h*TILE*s,U(5));}};
 // rejilla de holograma
 c.save();c.globalAlpha=.16;c.strokeStyle=th.line;c.lineWidth=1;const step=U(22);for(let x=ox%step;x<canvas.width;x+=step){c.beginPath();c.moveTo(x,0);c.lineTo(x,canvas.height);c.stroke();}for(let y=oy%step;y<canvas.height;y+=step){c.beginPath();c.moveTo(0,y);c.lineTo(canvas.width,y);c.stroke();}c.restore();
 // pasillos
 for(const r of map.corridors||[]){const [x,y]=P(r.x*TILE,r.y*TILE);c.fillStyle=`rgba(${th.fill},.13)`;c.fillRect(x,y,r.w*TILE*s,r.h*TILE*s);}
 // zonas abiertas con nombre (barras, descansos…)
 for(const r of map.areas||[]){const [x,y]=P(r.x*TILE,r.y*TILE);c.fillStyle=`rgba(${th.fill},.16)`;c.beginPath();c.roundRect(x,y,r.w*TILE*s,r.h*TILE*s,U(4));c.fill();c.setLineDash([U(4),U(4)]);c.strokeStyle=`rgba(${th.fill},.55)`;c.lineWidth=U(1.2);c.stroke();c.setLineDash([]);}
 // salas
 c.save();c.shadowColor=th.glow;c.shadowBlur=U(10);for(const r of map.rooms){shape(r);c.fillStyle=`rgba(${th.fill},.24)`;c.fill();c.lineWidth=U(2.2);c.strokeStyle=th.line;c.stroke();}c.restore();
 for(const r of map.rooms){shape(r);c.lineWidth=U(1);c.strokeStyle='rgba(255,255,255,.25)';c.stroke();}
 // puertas cerradas (bloqueos activos)
 const blk=blockersOf(state,serverNow);for(const d of map.doors||[]){if(!blk?.closed?.includes(d.id))continue;const [x,y]=P(d.x*TILE,d.y*TILE);c.fillStyle='#ff5d6c';c.fillRect(x-U(1),y-U(1),Math.max(U(4),d.w*TILE*s+U(2)),Math.max(U(4),d.h*TILE*s+U(2)));}
 const pulse=.5+.5*Math.sin(time/260);
 if(mode==='normal'||mode==='sabotage'){
  if(!lobby&&!state.progress?.blocked)for(const t of state.me.tasks.filter(t=>!t.done).map(w.taskStation).filter(Boolean)){const [x,y]=P(t.x,t.y);c.globalAlpha=mode==='sabotage'?.55:1;c.beginPath();c.arc(x,y,U(9+pulse*4),0,Math.PI*2);c.fillStyle=`rgba(255,214,90,${.18+pulse*.12})`;c.fill();holoIcon(c,'task',x,y,U(16),'#ffd65a');c.globalAlpha=1;}
  if(state.sabotage&&!lobby)for(const r of activeRepairs(state)){const [x,y]=P(r.x,r.y),done=state.sabotage.fixed.includes(r.id);c.beginPath();c.arc(x,y,U(11),0,Math.PI*2);c.fillStyle=done?'rgba(95,240,154,.35)':`rgba(255,80,96,${.35+pulse*.4})`;c.fill();holoIcon(c,done?'person':'warn',x,y,U(16),done?'#9fffc8':'#fff');}
  for(const q of [w.CAMERA_CONSOLE,w.LOCATOR_CONSOLE].filter(Boolean)){if(lobby)break;const [x,y]=P(q.x,q.y);c.beginPath();c.arc(x,y,U(6),0,Math.PI*2);c.fillStyle=q===w.LOCATOR_CONSOLE?'#4fe39a':'#9fd0ff';c.fill();c.lineWidth=U(1.5);c.strokeStyle='#0b1622';c.stroke();}
  const me=state.me;if(me&&local&&state.phase!=='meeting'){const [x,y]=P(local.x,local.y),col=COLORS[me.color]||'#61e5c6';c.beginPath();c.arc(x,y,U(13+pulse*5),0,Math.PI*2);c.fillStyle=`rgba(255,255,255,${.12+pulse*.12})`;c.fill();c.beginPath();c.arc(x,y,U(8),0,Math.PI*2);c.fillStyle=col;c.fill();c.lineWidth=U(2.5);c.strokeStyle='#fff';c.stroke();}
 }
 if(mode==='locator'){
  const L=state.locator;
  if(!L?.signal){c.save();c.fillStyle='rgba(4,20,12,.55)';c.fillRect(0,0,canvas.width,canvas.height);c.globalAlpha=.35;for(let i=0;i<120;i++){c.fillStyle=i%2?'#4fe39a':'#0d3a24';c.fillRect(((i*977+time*.7)%canvas.width),((i*331+time*.3)%canvas.height),U(26),U(2));}c.globalAlpha=1;c.font=`900 ${U(26)}px Inter,Segoe UI,sans-serif`;c.textAlign='center';c.fillStyle='#ff8c96';c.fillText('SIN SEÑAL',canvas.width/2,canvas.height/2);c.restore();}
  else for(const r of map.rooms){const n=L.rooms?.[r.id]||0;if(!n)continue;const [cx,cy]=P((r.x+r.w/2)*TILE,(r.y+r.h/2)*TILE),sz=Math.min(U(22),r.w*TILE*s/4.2),cols=Math.min(n,Math.max(1,Math.floor(r.w*TILE*s/(sz*1.25)))),rows=Math.ceil(n/cols);
   for(let i=0;i<n;i++){const col=i%cols,row=Math.floor(i/cols),x=cx+(col-(cols-1)/2)*sz*1.2,y=cy+U(6)+(row-(rows-1)/2)*sz*1.25;c.save();c.shadowColor='#1fe089';c.shadowBlur=U(8);holoIcon(c,'person',x,y,sz,'#8dffc2');c.restore();}}
 }
 // rótulos: por encima de tareas y figuras, por debajo de los círculos
 c.save();c.textAlign='center';c.textBaseline='middle';for(const r of [...map.rooms,...(map.areas||[])].filter(r=>!r.hideLabel&&r.name)){const [x,y]=P((r.x+r.w/2)*TILE,(r.y+r.h/2)*TILE);let size=U(12);c.font=`800 ${size}px Inter,Segoe UI,sans-serif`;const max=r.w*TILE*s-U(8);while(size>U(8)&&c.measureText(r.name).width>max){size-=U(.5);c.font=`800 ${size}px Inter,Segoe UI,sans-serif`;}const ly=mode==='normal'?y:(r.y*TILE)*s+oy+U(12);c.lineWidth=U(3);c.strokeStyle='rgba(6,14,24,.8)';c.strokeText(r.name,x,ly);c.fillStyle=th.ink;c.fillText(r.name,x,ly);}c.restore();
 if(mode==='sabotage'&&!lobby&&state.phase==='game'){
  const sabCharge=state.sabotage?0:chargeOf(state.sabotageFrom,state.sabotageReady,serverNow),doorCharge=chargeOf(state.doorFrom,state.doorReady,serverNow),locks=(state.doorLocks||[]).filter(l=>l.until>serverNow);
  for(const t of sabotageCircles(state)){const R=U(20),[x0,y]=P(t.x,t.y),x=x0+t.slot*(R*2+U(10)),locked=t.type==='doors'&&locks.some(l=>l.room===t.room),charge=locked?0:t.type==='doors'?doorCharge:sabCharge,ready=charge>=1&&!locked;
   // halo y relleno de luz que sube conforme se recarga
   if(ready){c.beginPath();c.arc(x,y,R+U(6)+pulse*U(4),0,Math.PI*2);c.fillStyle=`rgba(255,93,108,${.18+pulse*.18})`;c.fill();}
   c.beginPath();c.arc(x,y,R,0,Math.PI*2);c.fillStyle=ready?'#e8384c':'rgba(40,10,16,.85)';c.fill();
   if(!ready&&charge>0){c.save();c.beginPath();c.arc(x,y,R,0,Math.PI*2);c.clip();const g=c.createLinearGradient(0,y+R,0,y-R);g.addColorStop(0,'rgba(255,120,130,.75)');g.addColorStop(1,'rgba(255,60,80,.35)');c.fillStyle=g;c.fillRect(x-R,y+R-2*R*charge,2*R,2*R*charge);c.restore();
    c.beginPath();c.arc(x,y,R+U(3),-Math.PI/2,-Math.PI/2+Math.PI*2*charge);c.strokeStyle='rgba(255,170,178,.9)';c.lineWidth=U(3);c.stroke();}
   c.beginPath();c.arc(x,y,R,0,Math.PI*2);c.lineWidth=U(2.5);c.strokeStyle=ready?'#fff':'rgba(255,140,150,.55)';c.setLineDash(ready?[]:[U(4),U(4)]);c.stroke();c.setLineDash([]);
   holoIcon(c,locked?'lock':t.kind,x,y,R*1.2,ready?'#fff':'rgba(255,200,205,.7)');
   canvas.__hits.push({...t,x,y,r:R+U(6),ready,locked});}
 }
 c.save();c.globalAlpha=.08;c.fillStyle='#fff';const sy=(time/18)%canvas.height;c.fillRect(0,sy,canvas.width,U(3));c.restore();
}

let cameraPlates=new WeakMap();
function cameraPlate(map,feed){const base=worldFor(map.worldId).FLOORS[map.floor??0];let plates=cameraPlates.get(base);if(!plates){plates=new Map();cameraPlates.set(base,plates);}let plate=plates.get(feed.id);if(!plate){const canvas=document.createElement('canvas');canvas.width=760;canvas.height=540;const x=feed.x-380,y=feed.y-270;canvas.getContext('2d').drawImage(mapImage(map),x,y,760,540,0,0,760,540);plate={canvas,x,y};plates.set(feed.id,plate);freezeSurface(canvas,bitmap=>plate.canvas=bitmap);}return plate;}
export function drawCamera(canvas,state,rendered,time){
 const feeds=state.cameraFeeds?.length?state.cameraFeeds:state.cameraFeed?[state.cameraFeed]:[];if(!feeds.length)return;
 const c=canvas.getContext('2d',{alpha:false}),rect=canvas.getBoundingClientRect(),dpr=Math.min(1.5,window.devicePixelRatio||1),cw=Math.max(1,Math.round(rect.width*dpr)),ch=Math.max(1,Math.round(rect.height*dpr));if(canvas.width!==cw)canvas.width=cw;if(canvas.height!==ch)canvas.height=ch;c.setTransform(dpr,0,0,dpr,0,0);tagDpr=dpr;
 const w=rect.width,h=rect.height,gap=7;
 // Reparto de las pantallas que deja cada imagen lo más cuadrada posible.
 let cols=1;{let best=Infinity;for(let k=1;k<=feeds.length;k++){const rr2=Math.ceil(feeds.length/k),a=((w-gap*(k+1))/k)/((h-gap*(rr2+1))/rr2),score=Math.abs(Math.log(a/1.2))+(k*rr2-feeds.length)*.6;if(score<best){best=score;cols=k;}}}
 const rows=Math.ceil(feeds.length/cols),TW=(w-gap*(cols+1))/cols,th=(h-gap*(rows+1))/rows;c.fillStyle='#080f1e';c.fillRect(0,0,w,h);
 for(const [index,feed] of feeds.entries()){
  const tw=Math.min(TW,th*1.4),ox=(w-(cols*tw+(cols-1)*gap))/2+index%cols*(tw+gap),oy=gap+Math.floor(index/cols)*(th+gap),map=worldFor(state).mapFor(feed.floor,blockersOf(state,state.serverTime+(Date.now()-(state.receivedAt||Date.now())))),scale=Math.max(tw/520,th/430);c.save();c.beginPath();c.roundRect(ox,oy,tw,th,8);c.clip();c.translate(ox,oy);c.fillStyle='#132331';c.fillRect(0,0,tw,th);
  if(feed.signal){c.save();c.translate(tw/2-feed.x*scale,th/2-feed.y*scale);c.scale(scale,scale);const plate=cameraPlate(map,feed);c.drawImage(plate.canvas,plate.x,plate.y);drawAnimatedDoors(c,map,state);drawClubAmbient(c,map,time,state.sabotage,{x:feed.x,y:feed.y,w:tw/scale,h:th/scale,reduced:state.reducedEffects,cameraId:feed.id});
   for(const body of feed.bodies||[])drawBody(c,body,state.serverTime+(Date.now()-(state.receivedAt||Date.now())));
   for(const p of [...feed.players].sort((a,b)=>a.y-b.y)){if(feed.worldKill&&(p.id===feed.worldKill.actor||feed.worldKill.kind==='miss'&&p.id===feed.worldKill.target))continue;const at=rendered.get(p.id)||p;if(!characterVisible(map,feed,at,feed.radius))continue;drawRobot(c,{...p,...at},at.x,at.y,.84,time,!!at.moving);coverBehindFurniture(c,map,{...p,...at});nameTag(c,p.name,at.x,at.y-94,'#e5f4df',{bg:p.nameBg,color:p.nameColor});}
   if(feed.worldKill){const age=(state.serverTime+(Date.now()-state.receivedAt||0))-feed.worldKill.at;if(age>=0&&age<1100)drawWitnessKill(c,feed.worldKill,time,age,p=>characterVisible(map,feed,p,feed.radius));}c.restore();
  }else{text(c,'SIN SEÑAL',tw/2,th/2,Math.max(12,tw/24),'#eeb9b1');text(c,'REPARA LOS EQUIPOS',tw/2,th/2+22,9,'#aa9296');}
  c.fillStyle='#091b2330';for(let y=2;y<th;y+=5)c.fillRect(0,y,tw,1);c.fillStyle='#d7e3d7';for(let i=0;i<24;i++){const xx=(i*157+Math.floor(time/120)*31)%Math.max(1,tw),yy=(i*89+Math.floor(time/95)*17)%Math.max(1,th);c.globalAlpha=.035;c.fillRect(xx,yy,2,1);}c.globalAlpha=1;
  rr(c,8,8,78,22,5,'#0a1d2bdd','#567c82');text(c,`CAM ${String(index+1).padStart(2,'0')}`,47,23,10,'#b8d9cf');text(c,feed.signal?'● EN DIRECTO':'● OFFLINE',tw-58,23,9,feed.signal?'#9ee3b3':'#ed9e9e');rr(c,8,th-29,Math.min(tw-16,210),21,5,'#0b1e2ade');text(c,feed.label,Math.min(tw/2,112),th-14,Math.max(8,Math.min(11,tw/25)),'#d2e2da');c.restore();
 }
}

// El personaje queda hasta 20 píxeles a la derecha/izquierda del centro.
// La cámara se desplaza en sentido contrario al movimiento. Sin mirada vertical.
export function updateCamera(cam,local,axis,dt,scale){
 if(axis.x)cam.lookX=(cam.lookX||0)+(-axis.x*20/scale-(cam.lookX||0))*Math.min(1,dt*8);
 else if(axis.y)cam.lookX=(cam.lookX||0)*(1-Math.min(1,dt*8));
 cam.lookY=0;cam.x=local.x+(cam.lookX||0);cam.y=local.y;return cam;
}
