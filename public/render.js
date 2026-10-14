import {TILE,MAP,LOBBY,MEETING,FLOORS,STATIONS,REPAIRS,COLORS,SKIN_PALETTE,taskStation,mapFor,wallAt,visionLineOfSight,distance,insideStairs,lineOfSight} from './content.js';
import {sabotageDestination,guideAngle} from './navigation.js';
import {drawRobot} from './characters.js';
import {updateCamera} from './camera.js';
export {robotSVG,drawAvatar,drawHero,drawRobot} from './characters.js';
const caches=new WeakMap();
const visionGrids=new Map();
// La geometría de visión se prepara una vez por planta y estado de puertas.
// Consultar píxeles precalculados evita miles de recorridos por todas las salas en cada fotograma.
function visionGrid(map){const key=`${map.floor??'lobby'}:${(map.visionWalls||[]).filter(w=>w.kind==='closed-door').map(w=>w.id).join(',')}`;if(visionGrids.has(key))return visionGrids.get(key);
 const cell=8,width=Math.ceil(map.width*TILE/cell),height=Math.ceil(map.height*TILE/cell),solid=new Uint8Array(width*height);solid.fill(1);
 for(const r of [...map.rooms,...map.corridors])for(let y=r.y*7;y<(r.y+r.h)*7;y++)for(let x=r.x*7;x<(r.x+r.w)*7;x++)solid[y*width+x]=0;
 for(const r of map.visionWalls||[]){const minX=Math.max(0,Math.floor(r.x*TILE/cell)),maxX=Math.min(width-1,Math.ceil((r.x+r.w)*TILE/cell)),minY=Math.max(0,Math.floor(r.y*TILE/cell)),maxY=Math.min(height-1,Math.ceil((r.y+r.h)*TILE/cell));for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++)if((x+.5)*cell>=r.x*TILE&&(x+.5)*cell<(r.x+r.w)*TILE&&(y+.5)*cell>=r.y*TILE&&(y+.5)*cell<(r.y+r.h)*TILE)solid[y*width+x]=1;}
 const grid={cell,width,height,solid};visionGrids.set(key,grid);return grid;
}
function visionBlocked(grid,x,y){const ix=Math.floor(x/grid.cell),iy=Math.floor(y/grid.cell);return ix<0||iy<0||ix>=grid.width||iy>=grid.height||grid.solid[iy*grid.width+ix]!==0;}
const lobbyPictures=typeof Image==='undefined'?[]:[1,2,3].map(i=>{const picture=new Image();picture.src=`/assets/lobby/cuadro-${i}.png`;return picture;});
function doorLabel(room){if(!room)return '';const n=room.name;if(n.includes('ESO')||n.includes('Bach.'))return n.replace('ESO ','').replace('Bach. ','');if(room.id==='office1')return 'D. VAQUERO';return n.toUpperCase();}
function rr(c,x,y,w,h,r,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}}
function text(c,txt,x,y,size=13,color='#eff5e9'){c.fillStyle=color;c.font=`700 ${size}px Segoe UI`;c.textAlign='center';c.fillText(txt,x,y);}
function nameTag(c,txt,x,y,color){c.font='700 12px Segoe UI';c.textAlign='center';c.lineWidth=3;c.strokeStyle='#142831dd';c.strokeText(txt,x,y);c.fillStyle=color;c.fillText(txt,x,y);}
export function characterVisible(map,viewer,target,radius){
 // El cuerpo es un sprite vertical sobre sus pies. Intersectamos su caja
 // con el mismo círculo mundial que se dibuja, sin radio/sala adicionales.
 const x=Math.max(target.x-27,Math.min(viewer.x,target.x+27)),y=Math.max(target.y-67,Math.min(viewer.y,target.y+10));
 return Math.hypot(viewer.x-x,viewer.y-y)<=radius&&visionLineOfSight(map,viewer,target);
}
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
function drawWitnessKill(c,fx,time,age){const progress=Math.min(1,Math.max(0,age/430)),retreat=Math.min(1,Math.max(0,(age-690)/320)),dx=fx.victimX-fx.x,dy=fx.victimY-fx.y,len=Math.max(1,Math.hypot(dx,dy)),ux=dx/len,uy=dy/len,lung=Math.max(0,len-32)*progress*(1-retreat*.65),ax=fx.x+ux*lung,ay=fx.y+uy*lung;
 c.save();c.globalAlpha=Math.max(0,1-Math.max(0,age-810)/280);drawRobot(c,{...fx.victim,alive:true},fx.victimX+ux*Math.max(0,age-430)/15,fx.victimY+uy*Math.max(0,age-430)/15,.72,time,age>430,false);c.restore();
 drawRobot(c,{...fx.attacker,alive:true},ax,ay,.72,time,true,false);
 const h={x:ax+ux*13,y:ay-27},blade=Math.max(12,(len-lung)*progress),tip={x:h.x+ux*blade,y:h.y+uy*blade};c.save();c.strokeStyle='#713b3d';c.lineWidth=9;c.lineCap='round';c.beginPath();c.moveTo(h.x-ux*11,h.y-uy*11);c.lineTo(h.x,h.y);c.stroke();c.strokeStyle='#eaf0e9';c.lineWidth=6;c.beginPath();c.moveTo(h.x,h.y);c.lineTo(tip.x,tip.y);c.stroke();c.strokeStyle='#8ca9ac';c.lineWidth=1.5;c.stroke();if(age>340&&age<850){c.fillStyle=`rgba(176,52,67,${Math.min(.7,(age-340)/110)})`;for(const [x,y,r] of [[-11,-12,4],[9,10,3],[19,-7,2]]){c.beginPath();c.arc(fx.victimX+x,fx.victimY+y,r,0,Math.PI*2);c.fill();}}c.restore();}
function drawProp(c,r){const x=r.x*TILE,y=r.y*TILE,w=r.w*TILE,h=r.h*TILE;c.save();c.translate(x,y);
 if(r.kind==='wall'){c.fillStyle='#314a55';c.fillRect(0,0,w,h);c.fillStyle='#829ca180';if(w>h)c.fillRect(0,0,w,Math.min(2,h));else c.fillRect(0,0,Math.min(2,w),h);c.restore();return;}
 c.fillStyle='#172e3a30';c.fillRect(5,6,w,h);
 if(r.kind==='blackboard'){rr(c,0,0,w,h,4,'#244c41','#976f47');c.strokeStyle='#d7e5c480';c.lineWidth=2;c.beginPath();c.moveTo(17,14);c.lineTo(Math.min(w-20,135),14);c.moveTo(17,24);c.lineTo(Math.min(w-20,105),24);c.stroke();text(c,'A B C  ·  1 2 3',w*.65,h*.6,14,'#d7e5c4');}
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
export function mapImage(map){const base=map===LOBBY||map.isMeeting?LOBBY:FLOORS[map.floor??0];if(caches.has(base))return caches.get(base);map=base;
 const can=document.createElement('canvas');can.width=map.width*TILE;can.height=map.height*TILE;const c=can.getContext('2d');c.fillStyle='#233442';c.fillRect(0,0,can.width,can.height);
 const floor=(x,y)=>[...map.rooms,...map.corridors].some(r=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h);
 for(const r of [...map.corridors,...map.rooms]){c.fillStyle=r.color||'#9eb3ad';c.fillRect(r.x*TILE,r.y*TILE,r.w*TILE,r.h*TILE);}
 for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++){if(!floor(x,y))continue;
  c.fillStyle=(x+y)%2?'#ffffff0c':'#18393a05';c.fillRect(x*TILE,y*TILE,TILE,TILE);c.strokeStyle='#384f5014';c.lineWidth=1;c.strokeRect(x*TILE+.5,y*TILE+.5,TILE-1,TILE-1);
  c.strokeStyle='#3d5158';c.lineWidth=9;c.beginPath();if(!floor(x,y-1)){c.moveTo(x*TILE,y*TILE+4);c.lineTo((x+1)*TILE,y*TILE+4);}if(!floor(x-1,y)){c.moveTo(x*TILE+4,y*TILE);c.lineTo(x*TILE+4,(y+1)*TILE);}if(!floor(x+1,y)){c.moveTo((x+1)*TILE-4,y*TILE);c.lineTo((x+1)*TILE-4,(y+1)*TILE);}if(!floor(x,y+1)){c.moveTo(x*TILE,(y+1)*TILE-4);c.lineTo((x+1)*TILE,(y+1)*TILE-4);}c.stroke();}
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
    rr(c,x+w*.4,y+30,80,80,40,'#9ed6c550','#3b786c');text(c,'S',x+w*.4+40,y+82,49,'#d4ead7');
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
 for(const d of map.decor||[]){if(d.kind==='window'){rr(c,d.x*TILE,d.y*TILE,d.w*TILE,d.h*TILE,3,'#aedce2','#e6ede1');c.strokeStyle='#e6ede1';c.lineWidth=4;c.beginPath();c.moveTo(d.x*TILE,(d.y+d.h/2)*TILE);c.lineTo((d.x+d.w)*TILE,(d.y+d.h/2)*TILE);c.stroke();}else if(d.kind==='notice'){rr(c,d.x*TILE,d.y*TILE,d.w*TILE,d.h*TILE,2,'#f3e3af','#937858');text(c,'AULA',(d.x+d.w/2)*TILE,(d.y+d.h*.65)*TILE,8,'#756c50');}else if(d.kind==='stairs'){rr(c,d.x*TILE,d.y*TILE,d.w*TILE,d.h*TILE,3,'#9fabb8','#546674');for(let y=0;y<d.h*TILE;y+=20){c.strokeStyle='#667989';c.lineWidth=3;c.beginPath();c.moveTo(d.x*TILE,(d.y*TILE)+y);c.lineTo((d.x+d.w)*TILE,(d.y*TILE)+y);c.stroke();}text(c,map.floor?'↓ P0':'↑ P1',(d.x+d.w/2)*TILE,(d.y+d.h/2)*TILE,19,'#f3f1de');}}
 for(const p of map.props)drawProp(c,p);
 // Carteles pequeños junto al marco de cada acceso. Son decoración y no cierran el hueco.
 for(const d of map.doors||[]){const label=doorLabel(map.rooms.find(r=>r.id===d.room));if(!label)continue;const cx=(d.x+d.w/2)*TILE,cy=(d.y+d.h/2)*TILE;
  const px=d.h>d.w?cx+(d.side==='left'?32:-32):cx,py=d.h>d.w?cy-49:cy+(d.side==='top'?-37:37);
  const width=Math.max(64,Math.min(112,26+label.length*6));rr(c,px-width/2,py-13,width,23,5,'#263e49','#e5ce98');text(c,label,px,py+3,Math.min(10,144/Math.max(10,label.length)),'#f7e9c4');
 }
 for(const d of map.doors||[]){c.strokeStyle='#fff5';c.lineWidth=4;c.beginPath();if(d.h>d.w){const x=(d.x+.5)*TILE;c.moveTo(x,d.y*TILE);c.lineTo(x,(d.y+d.h)*TILE);c.stroke();rr(c,d.x*TILE,d.y*TILE-8,50,10,2,'#806b55');rr(c,d.x*TILE,(d.y+d.h)*TILE-2,50,10,2,'#806b55');}else{c.moveTo(d.x*TILE,d.y*TILE+18);c.lineTo((d.x+d.w)*TILE,d.y*TILE+18);c.stroke();rr(c,d.x*TILE-8,d.y*TILE,10,50,2,'#806b55');rr(c,(d.x+d.w)*TILE-2,d.y*TILE,10,50,2,'#806b55');}}
 caches.set(base,can);return can;
}
let guideCache=null;
function drawSabotageGuide(c,state,local,w,h,dt){
 const target=sabotageDestination(state,local);if(!target){guideCache=null;return;}
 const map=mapFor(state.me.floor,state.sabotage),signature=`${state.sabotage.id}/${state.me.floor}/${target.id}`;
 if(guideCache?.signature!==signature)guideCache={signature,angle:null};
 guideCache.angle=guideAngle(guideCache.angle,local,target,dt);
 const reached=target.stair?insideStairs({...local,floor:state.me.floor},target):distance(local,target)<100&&lineOfSight(map,local,target);
 const width=Math.min(350,w-36),x=18,y=Math.max(125,h-192);
 c.save();c.translate(x,y);rr(c,0,0,width,88,14,'#102731f5','#ffcd72');
 c.save();c.translate(43,44);c.fillStyle='#ffc86d';c.beginPath();c.arc(0,0,28,0,Math.PI*2);c.fill();
 if(reached)text(c,'✓',0,10,30,'#163a36');else{c.rotate(guideCache.angle);c.fillStyle='#203f43';c.beginPath();c.moveTo(20,0);c.lineTo(-14,-17);c.lineTo(-7,0);c.lineTo(-14,17);c.closePath();c.fill();}c.restore();
 text(c,target.stair?'CAMBIAR DE PLANTA':'REPARAR SABOTAJE',(width+78)/2,23,12,'#ffdb98');
 text(c,target.stair?target.title:target.label,(width+78)/2,47,11,'#f4f2df');
 text(c,reached?(target.stair?'Pulsa E para bajar o subir':'Pulsa E para reparar'):`${Math.round(distance(local,target)/TILE)} casillas · sigue la dirección`,(width+78)/2,69,10,'#b8d0c6');c.restore();
}
export function drawWorld(canvas,state,local,rendered,cam,dt,time){
 const c=canvas.getContext('2d'),rect=canvas.getBoundingClientRect(),dpr=Math.min(1.5,window.devicePixelRatio||1),W=Math.max(1,Math.round(rect.width*dpr)),H=Math.max(1,Math.round(rect.height*dpr));if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;}
 c.setTransform(dpr,0,0,dpr,0,0);const w=rect.width,h=rect.height,map=state.phase==='meeting'?MEETING:state.phase==='lobby'?LOBBY:mapFor(state.me.floor,state.sabotage),scale=Math.max(1.07,Math.min(1.42,w/1050,h/610));
 updateCamera(cam,local,local.input||{x:0,y:0},dt,scale);c.fillStyle='#233442';c.fillRect(0,0,w,h);c.save();c.translate(w/2-cam.x*scale,h/2-cam.y*scale);c.scale(scale,scale);c.drawImage(mapImage(map),0,0);
 if(state.phase==='lobby')for(let i=0;i<3;i++){const x=(3.05+i*5.15)*TILE,y=2.5*TILE,w=2.25*TILE,h=2.25*TILE,pic=lobbyPictures[i];
  rr(c,x-9,y-9,w+18,h+18,4,'#8b6d4d','#e5cf9b');rr(c,x-2,y-2,w+4,h+4,2,'#f8f2de');
  if(pic?.complete&&pic.naturalWidth){const fit=Math.min(w/pic.naturalWidth,h/pic.naturalHeight),dw=pic.naturalWidth*fit,dh=pic.naturalHeight*fit;c.drawImage(pic,x+(w-dw)/2,y+(h-dh)/2,dw,dh);}
  c.fillStyle='#fff5';c.fillRect(x+5,y+5,w-10,3);
 }
 if(state.phase==='meeting'){const x=8.65*TILE,y=6.65*TILE,w=2.7*TILE,h=1.3*TILE;rr(c,x,y,w,h,12,'#876146','#e5c18b');rr(c,x+8,y+7,w-16,h-14,8,'#bf986a');c.fillStyle='#ef6c79';c.beginPath();c.ellipse(x+w/2,y+h/2,29,23,0,0,Math.PI*2);c.fill();c.strokeStyle='#ffe3c0';c.lineWidth=5;c.stroke();text(c,'!',x+w/2,y+h/2+12,33,'#fff3de');}
 for(const d of map.decor||[])if(d.kind==='hall-detail'){
  const x=(d.x+d.w/2)*TILE,y=(d.y+.28)*TILE,pulse=.12+.08*Math.sin(time/460+x*.014);
  const glow=c.createRadialGradient(x,y,2,x,y,52);glow.addColorStop(0,`rgba(246,240,170,${pulse})`);glow.addColorStop(1,'rgba(246,240,170,0)');c.fillStyle=glow;c.fillRect(x-52,y-52,104,104);
 }
 for(const d of map.props.filter(p=>p.kind==='closed-door')){rr(c,d.x*TILE,d.y*TILE,d.w*TILE,d.h*TILE,3,'#b65e64','#663f4b');text(c,'BLOQUEADA',(d.x+d.w/2)*TILE,(d.y+.6)*TILE,10);}
 const assigned=state.me.tasks.filter(t=>!t.done).map(taskStation);
 for(const s of [...map.stations,...assigned.filter(s=>s.floor===map.floor&&!map.stations.some(q=>q.x===s.x&&q.y===s.y))]){
  const pending=assigned.some(t=>t.id===s.id&&t.floor===s.floor&&t.x===s.x&&t.y===s.y),glow=pending?'#ffd06c':'#779996';
  c.save();c.translate(s.x,s.y);if(pending){c.strokeStyle='#efc47588';c.lineWidth=2;c.beginPath();c.arc(0,0,30+Math.sin(time/350)*3,0,Math.PI*2);c.stroke();}rr(c,-17,-24,34,30,5,'#38656c',glow);text(c,pending?'◆':'·',0,-5,16,glow);c.restore();
 }
 if(state.phase==='game'&&map.floor===(state.config?.floors==='1'?1:0)){const s=map.emergency;c.save();c.translate(s.x,s.y);c.fillStyle='#496b67';c.beginPath();c.ellipse(0,0,38,22,0,0,Math.PI*2);c.fill();c.strokeStyle='#d7cba6';c.lineWidth=2;c.stroke();c.fillStyle='#e66c73';c.beginPath();c.ellipse(0,-5,15,10,0,0,Math.PI*2);c.fill();text(c,'REUNIÓN',0,38,10,'#3f5851');c.restore();}
 for(const v of (map.vents||[]).filter(v=>state.config?.floors==='both'||v.links.some(id=>map.vents.some(q=>q.id===id)))){c.save();c.translate(v.x,v.y);const glow=.35+.25*Math.sin(time/400+v.x*.01);c.fillStyle=`rgba(125,225,198,${glow*.33})`;c.beginPath();c.ellipse(0,0,31,23,0,0,Math.PI*2);c.fill();c.fillStyle='#4a6368';c.strokeStyle='#b8c9bf';c.lineWidth=3;c.beginPath();c.ellipse(0,0,24,17,0,0,Math.PI*2);c.fill();c.stroke();c.save();c.beginPath();c.ellipse(0,0,18,11,0,0,Math.PI*2);c.clip();c.strokeStyle='#2d424b';c.lineWidth=3;for(let i=-15;i<=15;i+=6){c.beginPath();c.moveTo(i,-13);c.lineTo(i,13);c.stroke();}c.restore();c.fillStyle=`rgba(131,243,206,${glow})`;c.beginPath();c.arc(0,-12,3,0,Math.PI*2);c.fill();c.restore();}
 // Cámaras y pantallas con vida propia, sin alterar la geometría de colisiones.
 for(const d of map.decor||[])if(d.kind==='room-detail'&&['office','classroom','reception'].includes(d.type)){
  const x=(d.x+d.w-.78)*TILE,y=(d.y+.24)*TILE,pulse=.55+.45*Math.sin(time/650+x*.01);
  rr(c,x-8,y-8,17,11,3,'#314f59','#b9d3bf');c.fillStyle=`rgba(245,111,103,${pulse})`;c.beginPath();c.arc(x+3,y-2,2.5,0,Math.PI*2);c.fill();
  if(d.type==='classroom'){c.fillStyle=`rgba(235,248,204,${pulse*.08})`;c.beginPath();c.moveTo(x,y);c.lineTo(x-58,y+65);c.lineTo(x+38,y+65);c.fill();}
 }
 for(const stair of state.config?.floors==='both'?map.stairs||[]:[]){const y=stair.y+Math.sin(time/340)*5;c.save();c.translate(stair.x,y);c.fillStyle='#e8edc9c7';c.beginPath();c.moveTo(0,-17);c.lineTo(10,-4);c.lineTo(5,-4);c.lineTo(5,8);c.lineTo(-5,8);c.lineTo(-5,-4);c.lineTo(-10,-4);c.closePath();c.fill();c.restore();}
 for(const r of map.repair||[]){const done=state.sabotage?.fixed.includes(r.id);rr(c,r.x-20,r.y-32,40,37,5,'#47636b',state.sabotage?(done?'#71e2c2':'#ff7185'):'#8aa89d');text(c,state.sabotage?(done?'✓':'⚡'):'▣',r.x,r.y-7,20,state.sabotage?'#fff0bd':'#bbcebe');}
 for(const b of state.bodies){if(state.phase==='game'&&state.me.alive&&!characterVisible(map,local,b,state.me.vision))continue;c.save();c.translate(b.x,b.y);c.fillStyle='#842e3b88';c.beginPath();c.ellipse(-7,7,39,18,-.2,0,Math.PI*2);c.fill();for(const [dx,dy,r] of [[-40,-8,5],[32,17,4],[18,-19,3],[-27,23,2]]){c.beginPath();c.arc(dx,dy,r,0,Math.PI*2);c.fill();}c.rotate(.7);rr(c,-24,-12,48,25,10,COLORS[b.color],'#344b53');rr(c,13,-11,19,20,9,SKIN_PALETTE[b.skinTone||0],'#344b53');rr(c,-17,-9,25,16,6,'#a93d49bb');c.restore();text(c,'×',b.x,b.y-26,21,'#d04d5c');}
 const fog=state.phase==='game'&&state.me.alive, radius=state.me.vision,points=[];
 if(fog){const grid=visionGrid(map);for(let i=0;i<192;i++){const a=i*Math.PI*2/192,dx=Math.cos(a),dy=Math.sin(a);let low=0,high=radius;for(let d=8;d<=radius;d+=8){if(visionBlocked(grid,local.x+dx*d,local.y+dy*d)){high=d;break;}low=d;}if(high<radius)for(let j=0;j<4;j++){const mid=(low+high)/2;if(wallAt(map,local.x+dx*mid,local.y+dy*mid))high=mid;else low=mid;}points.push({x:local.x+dx*(high<radius?Math.max(0,low-2):radius),y:local.y+dy*(high<radius?Math.max(0,low-2):radius)});}}
 const visionPath=()=>{c.beginPath();c.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++)c.lineTo(points[i].x,points[i].y);c.closePath();};
 if(fog){c.beginPath();c.rect(-6000,-6000,12000,12000);c.moveTo(points[0].x,points[0].y);for(const v of points)c.lineTo(v.x,v.y);c.closePath();c.fillStyle='#152733f5';c.fill('evenodd');
  c.save();visionPath();c.clip();const grad=c.createRadialGradient(local.x,local.y,radius*.78,local.x,local.y,radius);grad.addColorStop(0,'#15273300');grad.addColorStop(1,'#15273380');c.fillStyle=grad;c.fillRect(local.x-radius,local.y-radius,radius*2,radius*2);c.restore();}
 const entities=state.players.map(p=>({...p,...(p.id===state.me.id?local:rendered.get(p.id)||p)})).sort((a,b)=>a.y-b.y),fx=state.worldKill,fxAge=fx?state.serverTime+(Date.now()-state.receivedAt||0)-fx.at:Infinity,scene=fx&&fxAge>=0&&fxAge<1100&&state.phase==='game'&&characterVisible(map,local,{x:fx.victimX,y:fx.victimY},radius);
 for(const p of entities){if(p.vent&&!p.transition)continue;if(state.phase==='game'&&p.id!==state.me.id&&state.me.alive&&!characterVisible(map,local,p,radius))continue;if(scene&&p.id===fx.actor)continue;const transition=p.transition,age=transition?(state.serverTime+(Date.now()-state.receivedAt||0)-transition.at):0;let alpha=1,size=.72;
  if(transition?.kind==='vent-in'){alpha=Math.max(0,1-age/500);size*=Math.max(.1,1-age/600);}else if(transition?.kind==='vent-out'){alpha=Math.min(1,age/550);size*=.3+.7*alpha;}else if(p.vent)continue;
  const visual=p.abilityVisual,visualAge=visual?state.serverTime+(Date.now()-state.receivedAt||0)-visual.at:Infinity;
  if(p.abilityUntil>state.serverTime+(Date.now()-state.receivedAt||0)&&visual?.kind==='phantom-in')alpha*=Math.max(p.id===state.me.id ? .23 : 0,1-visualAge/600);
  else if(visual?.kind==='phantom-out')alpha*=Math.min(1,Math.max(.18,visualAge/600));
  else if(p.abilityUntil>state.serverTime+(Date.now()-state.receivedAt||0))alpha*=p.id===state.me.id ? .23 : 1;
  c.save();if(fog&&p.id!==state.me.id)clipVisionCircle(c,local,radius);c.globalAlpha=Math.max(0,Math.min(1,alpha*(p.id===state.me.id?1:p.alpha??1)));if(state.phase==='meeting'&&p.alive&&state.meeting.stage==='voting'&&state.meeting.myVote===null){c.fillStyle=state.selectedVote===p.id?'#f2ca65a8':'#65e79b85';c.beginPath();c.ellipse(p.x,p.y+22,39,16,0,0,Math.PI*2);c.fill();}if(state.phase==='meeting'&&!p.alive)c.globalAlpha=.46;if(visual&&visualAge>=0&&visualAge<600){c.strokeStyle=visual.kind.startsWith('phantom')?'#b496ff':'#6df4df';c.lineWidth=4;c.beginPath();c.ellipse(p.x,p.y-23,25+visualAge/19,38+visualAge/15,0,0,Math.PI*2);c.stroke();for(let i=0;i<7;i++){const a=i*6.28/7+time/450;c.fillStyle=c.strokeStyle;c.fillRect(p.x+Math.cos(a)*(18+visualAge/34),p.y-23+Math.sin(a)*(30+visualAge/30),4,4);}}drawRobot(c,p,p.x,p.y,size,time,!!(p.input?.x||p.input?.y||p.moving),p.id===state.me.id);const imp=state.roster.find(q=>q.id===p.id)?.role==='impostor';nameTag(c,p.name+(p.id===state.me.id?' · tú':''),p.x,p.y-69,imp?'#ff697e':p.id===state.me.id?'#efffe9':'#f0f4e9');
  if(state.phase==='meeting'){const msg=[...state.chat].reverse().find(m=>m.playerId===p.id&&state.serverTime+(Date.now()-state.receivedAt)-m.time<6500);if(msg){const label=msg.text,width=Math.min(225,Math.max(55,c.measureText(label).width+22));rr(c,p.x-width/2,p.y-125,width,34,9,'#fff5df','#385863');text(c,label.length>31?label.slice(0,30)+'…':label,p.x,p.y-103,12,'#263d43');}}c.restore();
 }
 if(scene){c.save();if(fog)clipVisionCircle(c,local,radius);drawWitnessKill(c,fx,time,fxAge);nameTag(c,fx.attacker.name,fx.x+Math.max(0,Math.hypot(fx.victimX-fx.x,fx.victimY-fx.y)-32)*Math.min(1,fxAge/430)*(fx.victimX-fx.x)/Math.max(1,Math.hypot(fx.victimX-fx.x,fx.victimY-fx.y)),fx.y-69,'#f0f4e9');c.restore();}
 if(state.phase==='game')for(const t of state.teachers||[]){const at=rendered.get(t.id)||t;if(fog&&!characterVisible(map,local,at,radius))continue;c.save();if(fog)clipVisionCircle(c,local,radius);c.globalAlpha=at.alpha??1;drawRobot(c,{...t,color:6,outfitColor:6,trimColor:4,skin:4,hat:0,pants:1,glasses:1},at.x,at.y,.72,time,!!(at.moving||t.targetId),false);c.save();c.translate(at.x,at.y);c.scale(.72,.72);rr(c,-18,-64,36,17,6,'#e8f0ec','#537881');c.strokeStyle='#c7dedb';c.lineWidth=2;c.beginPath();c.moveTo(-18,-58);c.lineTo(-27,-62);c.moveTo(18,-58);c.lineTo(27,-62);c.stroke();c.restore();text(c,'PROF. '+t.name,at.x,at.y-68,12,'#173a76');c.restore();}
 if(state.phase==='meeting'&&state.meeting.myVote&&state.meeting.myVote!=='skip'){const chosen=entities.find(q=>q.id===state.meeting.myVote);if(chosen){c.strokeStyle='#f4d381';c.lineWidth=4;c.beginPath();c.moveTo(local.x,local.y-35);c.lineTo(chosen.x,chosen.y-35);c.stroke();text(c,'👍',local.x+Math.sign(chosen.x-local.x)*28,local.y-55,30,'#fff4d4');}}
 c.restore();
 if(state.phase==='game')drawSabotageGuide(c,state,local,w,h,dt);
 if(state.me.transition?.kind==='stairs'||state.me.transition?.kind==='vent-travel'){const elapsed=Date.now()-(state.receivedAt||Date.now()),age=state.serverTime-state.me.transition.at+elapsed,alpha=Math.max(0,.75*(1-age/600));c.fillStyle=`rgba(23,42,53,${alpha})`;c.fillRect(0,0,w,h);text(c,state.me.transition.kind==='stairs'?`Planta ${state.me.floor}`:'Conducto de mantenimiento',w/2,h/2,24,`rgba(242,237,215,${alpha})`);}
}
export function worldPoint(canvas,cam,event){const rect=canvas.getBoundingClientRect(),scale=Math.max(1.07,Math.min(1.42,rect.width/1050,rect.height/610));return {x:cam.x+(event.clientX-rect.left-rect.width/2)/scale,y:cam.y+(event.clientY-rect.top-rect.height/2)/scale};}
export function drawMiniMap(canvas,state,local,floor=state.me.floor){const c=canvas.getContext('2d'),map=state.phase==='lobby'?LOBBY:FLOORS[floor===1?1:0];c.clearRect(0,0,canvas.width,canvas.height);const pad=25,s=Math.min((canvas.width-pad*2)/(map.width*TILE),(canvas.height-pad*2)/(map.height*TILE));c.save();c.translate((canvas.width-map.width*TILE*s)/2,(canvas.height-map.height*TILE*s)/2);c.scale(s,s);c.drawImage(mapImage(map),0,0);
 for(const r of map.rooms)rr(c,(r.x+.1)*TILE,(r.y+.1)*TILE,(r.w-.2)*TILE,(r.h-.2)*TILE,2,r.color+'bb');
 for(const t of state.me.tasks.filter(t=>!t.done).map(taskStation).filter(t=>t.floor===map.floor))text(c,'◆',t.x,t.y+7/s,18/s,'#ffcf68');
 for(const v of (map.vents||[]).filter(v=>state.config?.floors==='both'||v.links.some(id=>map.vents.some(q=>q.id===id))))text(c,'◎',v.x,v.y+5/s,13/s,'#2d6563');
 for(const r of state.config?.floors==='both'?map.stairs||[]:[])text(c,floor?'↓':'↑',r.x,r.y,18/s,'#edf3e1');
 if(state.sabotage)for(const r of map.repair)text(c,state.sabotage.fixed.includes(r.id)?'✓':'⚡',r.x,r.y,18/s,'#ff7185');
 if(state.me.floor===map.floor){c.fillStyle='#61e5c6';c.strokeStyle='#223f42';c.lineWidth=2/s;c.beginPath();c.arc(local.x,local.y,7/s,0,Math.PI*2);c.fill();c.stroke();}
 // Los rótulos son la última capa: misiones, conductos y posición quedan debajo.
 for(const r of map.rooms)mapRoomLabel(c,r.name,(r.x+r.w/2)*TILE,(r.y+r.h/2)*TILE,r.w*TILE-12/s,11/s);c.restore();}
