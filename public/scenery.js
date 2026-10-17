import {drawParkProp} from './park-art.js';
import {drawGymProp} from './gym-art.js';
// Arte vectorial original 2.5D. Las huellas físicas están en club.js;
// el volumen sube desde ellas y nunca altera la geometría de visión.
import {drawLightShow} from './club-lights.js';
export {lightingFrame} from './club-lights.js';
export const drawClubAmbient=drawLightShow;
const T=56,TAU=Math.PI*2;
const palette={ink:'#101a2b',edge:'#53637d',mint:'#75e2cc',pink:'#df8dbb',gold:'#e7bf7c'};
function box(c,x,y,w,h,r,fill,stroke=palette.ink,lw=3){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}}
function line(c,points,color,width=2){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();}
function oval(c,x,y,rx,ry,color){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fillStyle=color;c.fill();}
function label(c,s,x,y,size,color='#d3e0ed'){c.font=`800 ${size}px "Trebuchet MS",Arial,sans-serif`;c.textAlign='center';c.fillStyle=color;c.fillText(s,x,y);}
function gradient(c,x,y,w,h,top,bottom){const g=c.createLinearGradient?.(x,y,x+w*.15,y+h);if(!g?.addColorStop)return top;g.addColorStop(0,top);g.addColorStop(1,bottom);return g;}
function bottle(c,x,y,color){box(c,x-4,y-9,9,18,3,color,'#193140',1);box(c,x-2,y-15,5,8,1,'#ded6aa',null);line(c,[[x-1,y-7],[x-1,y+2]],'#e8fff577',1);box(c,x-3,y,7,4,1,'#d9d2b9',null);}
function glass(c,x,y){box(c,x-4,y-9,9,12,2,'#cce8e2','#6aadb2',1);box(c,x-2,y-3,5,5,1,'#dba5c1',null);}
function drawArchitecturalDetail(c,a){
 const x=a.x*T,y=a.y*T,w=a.w*T,h=a.h*T;c.save();c.translate(x,y);
 if(a.kind==='mirrorball'){line(c,[[w/2,-40],[w/2,0]],'#94a2b9',2);oval(c,w/2,h/2,w*.48,h*.48,'#8eaebd');for(let row=0;row<5;row++)for(let col=0;col<5;col++){const xx=w*(col+.5)/5,yy=h*(row+.5)/5;if(Math.hypot(xx-w/2,yy-h/2)<w*.45)box(c,xx-2,yy-2,5,5,1,['#e4e6ea','#a9c7e1','#948bc2','#d2bad4'][(row+col)%4],null);}}
 else if(a.kind==='led-screen'||a.kind==='wall-screen'){box(c,0,-12,w,h+12,7,'#131e31','#6d8ca5',3);box(c,5,-7,w-10,h+2,4,'#192d48','#9682c3',1);for(let k=0;k<12;k++){const hh=7+(k*17%Math.max(8,h-6));box(c,10+k*(w-20)/12,h-7-hh,(w-30)/15,hh,1,['#d28bd8','#73cfc2','#c2a5e0'][k%3],null);}}
 else if(a.kind==='wall-led'){box(c,-2,-5,w+4,h+4,4,'#172e40','#3d5368',1);box(c,0,-4,w,h,3,`hsl(${a.hue},65%,70%)`,null);}
 else if(a.kind==='bottles'){for(let xx=9;xx<w-6;xx+=19)bottle(c,xx,h*.6,['#76bfa9','#c191bc','#d9b378'][Math.floor(xx/19)%3]);line(c,[[0,h],[w,h]],'#bc8dad',3);}
 else if(a.kind==='gold-panels'){for(let i=0;i<5;i++)box(c,i*w/5,-9,w/5-6,h+7,3,gradient(c,0,0,w,h,'#d7b26d','#775372'),'#e1c699',1);}
 else{for(let k=0;k<3;k++){line(c,[[0,k*5],[w*.6,k*5],[w*.7,h+8],[w,h+8]],a.kind==='power-rails'?['#ddbc67','#7f8b95','#a6bc8b'][k]:['#94b3ae','#5e808a','#75999b'][k],4);for(let xx=15;xx<w;xx+=70)box(c,xx,k*5-3,4,9,1,'#263f50',null);}if(a.kind==='power-rails'){box(c,w*.42,-13,35,27,3,'#d8b965','#243e4d',2);line(c,[[w*.42+20,-8],[w*.42+12,1],[w*.42+22,1],[w*.42+15,10]],'#3c4850',2);}}
 c.restore();
}
export function roomPath(c,r,inset=0){c.beginPath();if(r.outline)r.outline.forEach(([x,y],i)=>i?c.lineTo(x*T,y*T):c.moveTo(x*T,y*T));else c.roundRect(r.x*T+inset,r.y*T+inset,r.w*T-inset*2,r.h*T-inset*2,Math.max(1,15-inset));c.closePath();}
export function drawClubFloor(c,map){
 for(const [i,r] of [...map.corridors,...map.rooms].entries()){
  const x=r.x*T,y=r.y*T,w=r.w*T,h=r.h*T,party=['main','secondary','lobby'].includes(r.id),vip=r.id==='vip';c.save();roomPath(c,r);c.clip();
  c.fillStyle=gradient(c,x,y,w,h,vip?'#544052':party?'#34394d':'#415565',vip?'#332735':party?'#202b3b':'#2b3e4c');c.fillRect(x,y,w,h);
  if(!r.id){
   for(let k=12;k<h;k+=20)line(c,[[x+8,y+k],[x+w-8,y+k]],'#15293755',1);
   const vertical=r.h>r.w;line(c,vertical?[[x+w*.5,y+14],[x+w*.5,y+h-14]]:[[x+14,y+h*.5],[x+w-14,y+h*.5]],'#aec2c22a',2);
   for(let a=20;a<(vertical?h:w);a+=110){const xx=vertical?x+13:x+a,yy=vertical?y+a:y+13;box(c,xx,yy,vertical?5:32,vertical?32:5,2,['#79baae','#c492bd','#cfba8c'][i%3],null);}
  }else if(vip){
   for(let xx=0;xx<w;xx+=20)for(let yy=0;yy<h;yy+=20)oval(c,x+xx,y+yy,1.1,1.1,'#d3a77233');
   box(c,x+T*.65,y+T*1.5,w-T*1.3,h-T*2,28,'#5b3948','#bf9462',2);box(c,x+T*.8,y+T*1.65,w-T*1.6,h-T*2.3,23,'#4b3547','#e5b98555',1);
  }else if(r.id==='electrical'){
   for(let xx=8;xx<w;xx+=24)for(let yy=14;yy<h;yy+=24){line(c,[[x+xx,y+yy],[x+xx+7,y+yy-5]],'#9eafae22',2);}
   box(c,x+35,y+h*.34,w-70,h*.43,10,'#293845','#778a8233',2);for(let a=40;a<w-32;a+=19)line(c,[[x+a,y+h*.35],[x+a,y+h*.75]],'#17263388',3);
   line(c,[[x+26,y+30],[x+26,y+h-25],[x+w-25,y+h-25]],'#d5b45e',5);line(c,[[x+35,y+30],[x+35,y+h-37],[x+w-25,y+h-37]],'#586371',3);
  }else if(r.id==='oxygen'){
   for(let xx=0;xx<w;xx+=38)for(let yy=0;yy<h;yy+=38)box(c,x+xx+1,y+yy+1,36,36,3,(xx+yy)%76?'#43645f':'#3a5959','#2d494b',1);
   oval(c,x+w*.5,y+h*.6,w*.24,w*.24,'#223b4055');
  }else if(r.id==='secondary'){
   for(let yy=0;yy<h;yy+=27){c.fillStyle=Math.round(yy/27)%2?'#4e4451':'#554a54';c.fillRect(x,y+yy,w,25);line(c,[[x+20+(yy%4)*17,y+yy+2],[x+20+(yy%4)*17,y+yy+23]],'#b4a5a520',2);}
  }else{
   for(let xx=0;xx<w;xx+=T)for(let yy=0;yy<h;yy+=T){box(c,x+xx+2,y+yy+2,T-4,T-4,4,'#ffffff04','#a7bdc318',1);for(const dx of [6,T-8])oval(c,x+xx+dx,y+yy+6,1.5,1.5,'#1a2c35');}
  }
  if(party){
   const px=x+T*2.6,py=y+T*3.7,pw=w-T*5.2,ph=h-T*6;box(c,px-10,py-10,pw+20,ph+20,16,'#172439','#7bb3b1',3);
   const size=r.id==='main'?39:32;for(let xx=0;xx<pw-5;xx+=size)for(let yy=0;yy<ph-5;yy+=size){const hue=(Math.floor(xx/size)*17+Math.floor(yy/size)*11+235)%360;box(c,px+xx+2,py+yy+2,Math.min(size-4,pw-xx-2),Math.min(size-4,ph-yy-2),3,`hsl(${hue},28%,${24+(Math.floor(xx/size)+Math.floor(yy/size))%3*4}%)`,'#172233',1);line(c,[[px+xx+5,py+yy+5],[px+xx+size-8,py+yy+5]],'#efc4f014',1);}

  }
  if(r.id==='navigation'){line(c,[[x+30,y+h-40],[x+w*.5,y+h-40],[x+w*.5,y+h*.48],[x+w-25,y+h*.48]],'#89b6c34a',4);for(let k=0;k<4;k++)oval(c,x+45+k*65,y+h*.6,7,7,'#7fbcbb55');}
  if(r.id==='security'){box(c,x+T*.8,y+T*2,w-T*1.6,h-T*3,10,'#2a4249','#6d9c9633',2);}
  if(r.id==='comms'){for(let k=0;k<3;k++)line(c,[[x+20,y+35+k*7],[x+w*.55,y+35+k*7],[x+w*.7,y+h-20]],['#7ab3a855','#bd8aa655','#d1ae6a55'][k],3);}
  c.restore();
 }
 // Las molduras conservan exactamente las aperturas de la geometría del servidor.
 for(const r of map.props.filter(p=>p.kind==='wall')){const x=r.x*T,y=r.y*T,w=r.w*T,h=r.h*T;c.save();box(c,x-2,y-13,Math.max(7,w+4),h+13,3,'#1d2c3d','#101b2b',2);box(c,x,y-12,Math.max(4,w),Math.max(4,h),2,'#6a7585','#9ba7af',1);c.restore();}
 for(const a of map.art||[])drawArchitecturalDetail(c,a);
}
export function propHeight(r){if(typeof r.kind==='string'&&r.kind.startsWith('park-'))return 0;if(r.kind==='park-water'||r.kind==='park-flowerbed')return 0;if(r.parkTree)return 55;if(['wall','closed-door'].includes(r.kind))return 0;if(r.kind==='gym-pool')return 0;if(r.kind==='gym-basket')return 85;if(/speaker|rack|shelf|locker|generator|fridge|bottle|arcade|tank|transformer|radio/.test(r.kind))return 38;if(/plant|toilet|armchair|divider|bin/.test(r.kind))return 26;return 17;}
export function drawVolumeProp(c,r){
 if(drawParkProp(c,r))return true;
 if(drawGymProp(c,r))return true;
 const x=r.x*T,y=r.y*T,w=r.w*T,h=r.h*T,z=propHeight(r),kind=r.kind;
 if(!/^(club-|dj-booth|speaker|security-console)/.test(kind))return false;
 c.save();c.translate(x,y);oval(c,w*.53,h*.6+10,w*.57,h*.52+7,'#06152155');
 const body=kind==='club-sofa'?'#794a68':kind==='club-bar'?'#684f61':'#263b50';
 box(c,0,0,w,h,9,gradient(c,0,0,w,h,'#3c4f68','#1c2b40'),'#101a2b',4);box(c,0,-z,w,h,9,gradient(c,0,-z,w,h,body,'#2c3e54'),'#101a2b',4);
 line(c,[[5,h-z+2],[w-5,h-z+2]],'#748498',2);line(c,[[5,2-z],[w-8,2-z]],'#bdced333',2);
 if(kind==='dj-booth'){
  box(c,9,10-z,w-18,h-20,5,'#151f30','#53617a',2);
  for(const xx of [w*.23,w*.77]){oval(c,xx,h*.5-z,Math.min(29,h*.39),Math.min(26,h*.34),'#080f1c');oval(c,xx,h*.5-z,Math.min(21,h*.29),Math.min(19,h*.25),'#384658');oval(c,xx,h*.5-z,6,5,'#9e7dbb');line(c,[[xx-6,h*.5-z-12],[xx+12,h*.5-z+5]],'#a6c2d5',2);line(c,[[xx+19,h*.5-z-17],[xx+11,h*.5-z+1]],'#c5c9ba',3);}
  for(let i=0;i<6;i++){const xx=w*.4+i*w*.034;line(c,[[xx,15-z],[xx,h-14-z]],'#687c86',2);box(c,xx-3,h*.4-z+(i%3)*7,6,8,1,['#91e3d2','#e0a7da','#efcc8a'][i%3],null,1);}
  box(c,w*.39,-z-30,w*.22,25,4,'#152537','#677c98',2);for(let i=0;i<12;i++)box(c,w*.4+i*w*.016,-z-13-((i*17)%12),3,10+(i*7)%7,1,'#83d3be',null);
  label(c,'PUCELA US / AUDIO',w*.5,h-4,8,'#91a9b5');
 }else if(kind==='speaker'){
  box(c,6,-z+8,w-12,h-15,6,'#172438','#51637a',2);
  for(const [yy,rad] of [[h*.29-z,.2],[h*.7-z,.28]]){const rr=Math.min(w*.38,h*rad);oval(c,w/2,yy,rr,rr,'#0b1526');oval(c,w/2,yy,rr*.76,rr*.76,'#3a4b62');oval(c,w/2,yy,rr*.38,rr*.38,'#151f30');c.strokeStyle='#9280a7';c.lineWidth=2;c.beginPath();c.arc(w/2,yy,rr*.9,0,TAU);c.stroke();}
  for(const xx of [9,w-9])for(const yy of [-z+10,h-z-8])oval(c,xx,yy,2,2,'#8f9bad');box(c,w*.34,h-z+5,w*.32,4,2,'#7edbc9',null);
 }else if(kind==='security-console'||kind==='club-navdesk'){
  const n=kind==='security-console'?4:2;for(let i=0;i<n;i++){const mw=(w-20)/n;box(c,8+i*mw,-z-19,mw-5,h*.57,4,'#132233','#738b9b',3);box(c,12+i*mw,-z-15,mw-13,h*.57-9,2,'#244950',null);line(c,[[16+i*mw,-z],[22+i*mw,-z-8],[32+i*mw,-z-6]],'#88d3c1',2);}
  box(c,w*.25,h*.6-z,w*.48,h*.24,3,'#192939','#55687b',1);for(let i=0;i<8;i++)line(c,[[w*.28+i*w*.047,h*.65-z],[w*.28+i*w*.047,h*.79-z]],'#91a6aa',1);oval(c,w*.83,h*.7-z,6,7,'#728491');
 }else if(kind==='club-sofa'||kind==='club-armchair'){
  const vertical=r.orientation==='vertical'||h>w*1.4;
  box(c,5,5-z,w-10,h-11,8,gradient(c,0,-z,w,h,'#b9779c','#623d62'),'#472c49',2);
  if(vertical){box(c,w-12,-z-9,17,h+5,6,'#a66a8c','#372740',3);for(let yy=22;yy<h-8;yy+=35)line(c,[[8,yy-z],[w-15,yy-z]],'#df9dbc66',2);for(const yy of [-z,h-z-13])box(c,0,yy,w,14,6,'#895372','#35263c',3);}
  else{box(c,5,-z-10,w-10,18,6,'#a66a8c','#372740',3);for(let xx=35;xx<w-16;xx+=43)line(c,[[xx,10-z],[xx,h-12-z]],'#df9dbc66',2);for(const xx of [0,w-14])box(c,xx,-z,14,h,6,'#85516f','#35263c',3);}
  if(kind==='club-armchair')box(c,w*.26,-z+11,w*.48,h*.43,4,'#d2af78','#8b6a71',1);
 }else if(kind==='club-table'||kind==='club-emergency-table'){
  oval(c,w/2,h*.5-z,w*.48,h*.43,'#1c2d43');c.strokeStyle='#abc5bf';c.lineWidth=3;c.beginPath();c.ellipse(w/2,h*.5-z,w*.46,h*.4,0,0,TAU);c.stroke();
  if(kind==='club-emergency-table'){oval(c,w/2,h*.5-z,31,20,'#9ba998');oval(c,w/2,h*.5-z-4,17,11,'#d56d7f');oval(c,w/2-4,h*.5-z-8,7,3,'#f2a5a7');}
  if(kind==='club-table'){for(const [xx,yy] of [[.3,.35],[.7,.6]]){box(c,w*xx-4,h*yy-z-10,9,13,3,'#d1e4de','#587c81',1);oval(c,w*xx,h*yy-z-11,4,2,'#b9e8d5');}box(c,w*.42,h*.53-z,17,12,3,'#907b91','#c8a5af',1);}
 }else if(kind==='club-bar'){
  box(c,5,-z+4,w-10,h-8,5,gradient(c,0,-z,w,h,'#b49398','#806077'),'#e2bbb0',2);
  const vertical=h>w*1.4;for(let d=16;d<(vertical?h:w)-12;d+=28){const xx=vertical?w*.4:d,yy=vertical?d-z:-z+6;bottle(c,xx,yy,['#6dc9aa','#d89980','#9e9bd4'][Math.floor(d/28)%3]);}
  const xx=vertical?w*.7:w*.72,yy=vertical?h*.7-z:h*.5-z;line(c,[[xx,yy+8],[xx,yy-12],[xx+10,yy-12],[xx+10,yy-4]],'#cbd5de',4);box(c,xx-8,yy+10,25,7,2,'#354653','#bfbdac',1);
  line(c,vertical?[[w-3,4],[w-3,h-4]]:[[5,h-3],[w-5,h-3]],'#f082cd',3);
 }else if(kind==='club-generator'){
  box(c,9,-z+10,w-18,h-20,9,'#66756f','#a6b7a5',2);box(c,15,-z+17,w-30,22,4,'#203f43','#9bbcab',2);label(c,'POWER',w/2,-z+32,9,'#a7dbc6');for(let i=0;i<4;i++)line(c,[[13+i*(w-25)/4,h*.5-z],[13+i*(w-25)/4,h-z-12]],'#283f43',5);line(c,[[w*.3,h-z],[w*.3,h+13],[w+18,h+13]],'#b9a363',5);
 }else if(kind==='club-fan'){
  box(c,6,-z+6,w-12,h-12,8,'#617881','#a8c0b8',2);oval(c,w/2,h/2-z,Math.min(w,h)*.34,Math.min(w,h)*.34,'#192c3c');for(let a=0;a<6;a++){const t=a*TAU/6;line(c,[[w/2,h/2-z],[w/2+Math.cos(t)*w*.27,h/2-z+Math.sin(t)*h*.27]],'#596c7d',5);}oval(c,w/2,h/2-z,7,7,'#a6c7bb');
 }else if(kind==='club-crate'){
  box(c,6,-z+6,w-12,h-12,5,'#847066','#bba18a',2);line(c,[[10,10-z],[w-10,h-z-10]],'#53494d',7);line(c,[[w-10,10-z],[10,h-z-10]],'#bba18a',4);box(c,w*.4,-z+5,w*.2,h-10,2,'#566b75','#314453',1);label(c,'AS',w*.5,h*.55-z,12,'#d3d6bd');
 }else if(kind==='club-locker'){
  for(let xx=4;xx<w-10;xx+=32){box(c,xx,-z+4,29,h-8,4,'#566a7e','#1c2c41',2);for(let a=0;a<3;a++)line(c,[[xx+5,-z+12+a*5],[xx+23,-z+12+a*5]],'#1a2d40',2);box(c,xx+20,h*.57-z,4,13,2,'#b4c3c3',null);}
 }else if(kind==='club-smoke'){
  box(c,7,-z+6,w-14,h-12,6,'#6b6279','#9d8da8',2);oval(c,w*.7,h*.55-z,13,9,'#122638');line(c,[[w*.2,h*.4-z],[w*.5,h*.4-z]],'#8dccb2',4);
 }else if(kind==='club-roundtable'||kind==='club-stool'||kind==='club-chair'){
  oval(c,w*.5,h*.62,6,Math.max(5,h*.24),'#131e32');oval(c,w*.5,h*.5-z,w*.47,h*.44,'#735b81');oval(c,w*.5,h*.5-z-3,w*.43,h*.38,kind==='club-roundtable'?'#b2979b':'#c695b8');
  if(kind==='club-roundtable'){bottle(c,w*.34,h*.45-z-5,'#71bcb0');glass(c,w*.68,h*.6-z);box(c,w*.48,h*.23-z,12,9,2,'#dbc392','#735e75',1);}
  if(kind==='club-chair')box(c,0,-z-12,w,13,5,'#7799a7','#1b3041',2);
 }else if(kind==='club-plant'){
  box(c,4,h*.43-z,w-8,h*.57,5,'#c4ac87','#58606e',2);line(c,[[w*.5,h*.56-z],[w*.5,-z-9]],'#527869',3);
  for(let i=0;i<6;i++){const a=i*2.4;oval(c,w*.5+Math.cos(a)*w*.29,h*.26-z+Math.sin(a)*h*.32,w*.25,h*.16,i%2?'#63bba0':'#348779');}
 }else if(kind==='club-arcade'){
  box(c,3,-z-12,w-6,h*.65,5,'#8a527f','#c7a4ca',2);box(c,7,-z-7,w-14,h*.44,3,'#142e43','#60cecf',2);line(c,[[11,h*.2-z],[w*.3,h*.1-z],[w*.55,h*.27-z],[w-11,-z+4]],'#efb475',2);box(c,5,h*.5-z,w-10,15,3,'#d082b3','#392b4d',2);oval(c,w*.32,h*.58-z-4,4,4,'#203e50');line(c,[[w*.32,h*.58-z],[w*.32,h*.58-z-8]],'#c7d8dc',2);for(let i=0;i<2;i++)oval(c,w*.65+i*7,h*.58-z,3,3,i?'#e7bd6c':'#81e0ca');
 }else if(kind==='club-subwoofer'){
  box(c,5,-z+5,w-10,h-10,4,'#162638','#53677d',2);oval(c,w/2,h*.5-z,Math.min(w,h)*.35,Math.min(w,h)*.35,'#060e1c');oval(c,w/2,h*.5-z,Math.min(w,h)*.24,Math.min(w,h)*.24,'#34495d');oval(c,w/2,h*.5-z,7,7,'#17273b');
 }else if(kind==='club-bottles'){
  for(let yy=2;yy<h-10;yy+=25){box(c,4,yy-z,w-8,20,2,'#3c334c','#ba8eae',1);for(let xx=11;xx<w-6;xx+=15)bottle(c,xx,yy-z+6,['#8bd8b4','#bd91cd','#deb278'][Math.floor(xx/15)%3]);}
 }else if(kind==='club-workbench'||kind==='club-toolcart'){
  box(c,3,-z,w-6,h*.65,3,'#9b947f','#d3c9a2',2);for(let xx=12;xx<w-8;xx+=36){line(c,[[xx,2-z],[xx+14,15-z]],'#273e50',4);oval(c,xx+16,17-z,4,4,'#b6c7c0');}box(c,w*.43,-z+3,Math.max(8,w*.14),h*.3,3,'#3a6074','#75b9bb',1);for(let k=0;k<3;k++)line(c,[[8,h-z+3+k*5],[w-8,h-z+3+k*5]],'#8c9d9e',1);
 }else if(kind==='club-transformer'||kind==='club-tank'||kind==='club-pipes'){
  const n=kind==='club-transformer'?3:2;for(let i=0;i<n;i++){const xx=7+i*(w-12)/n,ww=(w-16)/n;box(c,xx,-z+4,ww,h-9,ww*.4,gradient(c,xx,-z,ww,h,'#b0c0b9','#4a707c'),'#223c4b',2);for(let k=1;k<4;k++)line(c,[[xx+2,h*k/4-z],[xx+ww-2,h*k/4-z]],'#344f5c',3);oval(c,xx+ww/2,h*.5-z,6,6,'#d9c778');line(c,[[xx+ww/2,-z+3],[xx+ww/2,-z-12],[xx+ww/2+9,-z-12]],'#6e9295',4);}
 }else if(kind==='club-radio'){
  for(let yy=4;yy<h-7;yy+=29){box(c,5,yy-z,w-10,25,3,'#203444','#8da6ac',1);oval(c,w*.72,yy+12-z,5,5,'#c8bd96');line(c,[[9,yy+8-z],[w*.47,yy+8-z]],'#7fd6c3',3);for(let i=0;i<3;i++)oval(c,10+i*6,yy+18-z,1.5,1.5,'#c99dc5');}
 }else if(kind==='club-printer'){
  box(c,4,2-z,w-8,h-6,6,'#b5c0b7','#476a76',2);box(c,w*.15,-z-6,w*.7,17,2,'#e8ecda','#8b9b96',1);line(c,[[w*.23,-z+1],[w*.7,-z+1]],'#617d83',1);box(c,w*.15,h*.55-z,w*.7,10,2,'#203847');
 }else if(kind==='club-cable'){
  for(let k=0;k<4;k++){c.strokeStyle=k%2?'#baad79':'#4a6c79';c.lineWidth=3;c.beginPath();c.ellipse(w/2,h*.5-z,w*.4-k*2,h*.35-k,0,0,TAU);c.stroke();}
 }else if(kind==='club-bin'){
  box(c,4,2-z,w-8,h-3,5,'#637c83','#263c4c',2);oval(c,w/2,4-z,w*.45,h*.22,'#1d3442');line(c,[[w*.3,13-z],[w*.3,h-5-z]],'#9fb9b8',2);
 }else if(kind==='club-divider'){
  line(c,[[w/2,-z],[w/2,h-z]],'#c8a769',5);for(const yy of [-z,h-z]){oval(c,w/2,yy,8,8,'#d9c18d');line(c,[[w/2,yy],[w/2,yy+z]],'#88764e',4);}
 }else if(kind==='club-instruments'){
  oval(c,w*.5,h*.55-z,w*.35,h*.32,'#8a548a');oval(c,w*.5,h*.55-z,w*.2,h*.15,'#182c40');line(c,[[w*.5,h*.4-z],[w*.5,-z-8]],'#e4cda4',6);line(c,[[w*.3,h*.65-z],[w*.6,-z-7]],'#b4c9c8',2);
 }else{ // Armarios técnicos y máquinas de cada sala.
  const tall=h>w;for(let i=0;i<5;i++){const xx=tall?7:8+i*(w-16)/5,yy=tall?-z+8+i*(h-16)/5:-z+8;box(c,xx,yy,tall?w-14:(w-22)/5,tall?(h-22)/5:h-16,3,'#1a2e40','#6e8e9a',1);line(c,[[xx+4,yy+6],[xx+(tall?w-18:(w-26)/5),yy+6]],['#8acbb1','#b495b4','#d9b675'][i%3],3);}
 }
 c.restore();return true;
}
