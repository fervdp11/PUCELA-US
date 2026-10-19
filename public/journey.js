import {drawCaravanInterior,CARAVAN} from './caravan.js';
import {drawRobot} from './characters.js';
const clamp=v=>Math.max(0,Math.min(1,v)),ease=v=>{v=clamp(v);return v*v*(3-2*v);};
function box(c,x,y,w,h,r,color,stroke){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}}
function label(c,s,x,y,size,color='#eff6dc'){c.fillStyle=color;c.font=`900 ${size}px Segoe UI`;c.textAlign='center';c.fillText(s,x,y);}
export function drawCaravanExterior(c,x,y,scale=1,angle=0){c.save();c.translate(x,y);c.rotate(angle);c.scale(scale,scale);box(c,-48,-92,104,192,22,'#0a182b40');for(const xx of [-48,40])for(const yy of [-52,46])box(c,xx,yy,10,30,4,'#192c3a');box(c,-44,-92,88,184,21,'#dfc8a3','#536b77');box(c,-39,-85,78,48,16,'#85b8bb','#395969');box(c,-31,-78,62,30,9,'#3b6a7b');box(c,-39,-26,78,107,12,'#f2e6c8');box(c,-33,-20,66,7,3,'#cc956f');for(const xx of [-35,28]){box(c,xx,5,7,55,3,'#6c9e9e');box(c,xx,-88,9,6,2,'#fff5b8');box(c,xx,83,9,5,2,'#d27d70');}box(c,-18,0,36,38,5,'#c2cfc0','#9cae9f');box(c,-12,6,24,26,4,'#84a9aa');box(c,-12,53,24,13,4,'#78918d');label(c,'PUCELA US',0,49,8,'#56747b');c.restore();}
export function blendColor(a,b,t){const rgb=s=>s.match(/\w\w/g).map(v=>parseInt(v,16));const aa=rgb(a.replace('#','')),bb=rgb(b.replace('#',''));return '#'+aa.map((v,i)=>Math.round(v+(bb[i]-v)*clamp(t)).toString(16).padStart(2,'0')).join('');}
export function journeyPose(seconds){const t=Math.max(0,seconds);if(t<4.6)return {x:550,y:500-90*ease(t/4.6),angle:0,signal:t>3.6};if(t<7.4){const a=ease((t-4.6)/2.8)*Math.PI/2;return {x:650-100*Math.cos(a),y:410-100*Math.sin(a),angle:a,signal:true};}return {x:650+350*ease((t-7.4)/2.2),y:310,angle:Math.PI/2,signal:false};}
// Distancia recorrida por la carretera principal: velocidad constante, frenada
// suave durante el giro y parada al tomar la salida. Todo el paisaje se mueve con
// esta distancia, así que reacciona al giro y a la frenada.
export const ROAD_TOTAL=874+190*1.4;
export function roadScroll(seconds){const t=Math.max(0,seconds);if(t<4.6)return 190*t;const u=Math.min(2.8,t-4.6);return 874+190*(u-u*u/5.6);}
// 15.0 · Comienzo de la animación inicial. 1,5 s de carretera y paisaje a
// triple velocidad sin la caravana; 1 s de frenazo progresivo (570 → 190 px/s)
// en el que la cámara alcanza la caravana; después, la animación de siempre
// (que empieza en OPENING_LEAD segundos).
export const OPENING_FAST=1.5,OPENING_BRAKE=1,OPENING_LEAD=OPENING_FAST+OPENING_BRAKE,OPENING_SPEED=190*3;
export function openingRoad(seconds){const t=Math.max(0,seconds);if(t<OPENING_FAST)return OPENING_SPEED*t;const u=Math.min(OPENING_BRAKE,t-OPENING_FAST),base=OPENING_SPEED*OPENING_FAST,brake=OPENING_SPEED*u-(OPENING_SPEED-190)*u*u/(2*OPENING_BRAKE);return t<OPENING_LEAD?base+brake:base+OPENING_SPEED*OPENING_BRAKE-(OPENING_SPEED-190)*OPENING_BRAKE/2+190*(t-OPENING_LEAD);}
// Distancia de la caravana por delante de su sitio en pantalla (0 = alcanzada).
// `hidden` es la distancia a la que queda fuera del encuadre; se recorre durante
// el frenazo y llega a cero justo cuando acaba, sin que la caravana retroceda.
export function openingCarAhead(seconds,hidden){if(seconds<OPENING_FAST)return Infinity;const u=Math.min(1,(seconds-OPENING_FAST)/OPENING_BRAKE);return hidden*Math.pow(1-u,1.5);}
export function trafficPose(seconds){return {x:431,y:((seconds*155+750)%1600)-400};}

// Entrada de Campo Grande: césped segado, verja de hierro con machones de piedra,
// arco de entrada con rótulo, copas redondas, parterres, farolas y un paseo.
function parkEntrance(c,t){
 const disc=(x,y,r,col)=>{c.fillStyle=col;c.beginPath();c.arc(x,y,r,0,6.3);c.fill();};
 box(c,637,40,620,345,14,'#7fae67');
 for(let i=0;i<9;i++)box(c,637,48+i*38,620,19,0,i%2?'#76a45f':'#88b66f');
 box(c,637,40,620,10,6,'#56824a');
 // Paseo central de losas y senderos que parten de él.
 box(c,1000,150,70,235,6,'#d6cbb6');box(c,1005,150,60,235,4,'#e7dec9');for(let y=160;y<385;y+=22)box(c,1005,y,60,2,0,'#bfb39b');
 box(c,720,300,500,26,12,'#d8b886');box(c,737,304,466,12,6,'#e8cfa0');
 // Parterres con flores a ambos lados del arco.
 for(const [x,w] of [[830,150],[1090,150]]){box(c,x,112,w,34,17,'#4d7f45');for(let i=0;i<w/14;i++)disc(x+10+i*14,129+Math.sin(i*1.9)*6,4,['#f2a5c4','#f6d36b','#e8644f','#c9a3e8','#fbf4e4'][(i+(x>900?2:0))%5]);}
 // Arboleda: copas redondas con sombra y reflejo, sin troncos a la vista.
 for(let i=0;i<9;i++){const x=665+(i%2?10:0)+i*69,y=82+(i*37%46);if(x>800&&x<1130)continue;disc(x+9,y+14,46,'#3f6f3b55');disc(x,y,44,i%2?'#4e8a52':'#5c9a56');disc(x-12,y-12,26,i%2?'#62a063':'#70ad66');disc(x+14,y+10,16,'#478049');}
 for(const [x,y] of [[690,230],[790,240],[1160,235],[1230,250],[675,340],[1235,345]]){disc(x+7,y+11,34,'#3f6f3b55');disc(x,y,32,'#5c9a56');disc(x-8,y-9,18,'#70ad66');}
 // Verja de hierro con machones.
 for(let x=700;x<1230;x+=22){if(x>905&&x<1110)continue;box(c,x,168,4,56,2,'#2f3f45');}box(c,696,178,214,5,2,'#2f3f45');box(c,1112,178,126,5,2,'#2f3f45');box(c,696,206,214,4,2,'#3d5057');box(c,1112,206,126,4,2,'#3d5057');
 // Arco de entrada: dos pilares de piedra, dintel curvo, farolillos y rótulo.
 for(const x of [905,1105]){box(c,x,120,34,118,6,'#b8ad92','#6f6a58');box(c,x-4,112,42,16,5,'#cfc5a9','#6f6a58');disc(x+17,100,9,'#f6e7a8');}
 c.strokeStyle='#2f3f45';c.lineWidth=10;c.beginPath();c.arc(1022,150,102,Math.PI*1.1,Math.PI*1.9);c.stroke();c.strokeStyle='#cfc5a9';c.lineWidth=4;c.beginPath();c.arc(1022,150,102,Math.PI*1.1,Math.PI*1.9);c.stroke();
 box(c,938,64,168,40,10,'#2f5f4a','#e3d9b4');label(c,'CAMPO GRANDE',1022,91,19,'#f4f0cf');
 // Bancos y farolas junto al paseo.
 for(const y of [210,265])for(const x of [958,1068]){box(c,x,y,28,12,3,'#7d5a3a');box(c,x+2,y+2,24,3,1,'#c79a66');box(c,x+2,y+7,24,3,1,'#c79a66');}
 for(const y of [180,290])for(const x of [985,1049]){disc(x+0.5,y,6,'#2b3838');disc(x+0.5,y,3.4,Math.sin(t*2+x)>-.3?'#f6e7a8':'#d8cf95');}
 // Fuente al fondo del paseo.
 disc(1035,345,26,'#a8a08a');disc(1035,345,21,'#4f9fc9');disc(1035,345,9,'#b8b39f');disc(1035,345,4,'#e6f4f8');
 c.strokeStyle='#dff3fa';c.lineWidth=2;for(let i=0;i<8;i++){const k=(t*.8+i/8)%1;c.globalAlpha=1-k;c.beginPath();c.arc(1035,345,5+k*16,0,6.3);c.stroke();}c.globalAlpha=1;
}
function tree(c,x,y,night){box(c,x-3,y,6,18,2,blendColor('#826951','#3f3d47',night));for(const [dx,dy,r] of [[0,-8,22],[-13,0,17],[13,2,18]]){c.fillStyle=blendColor(dx<0?'#698875':'#89a18b','#284957',night);c.beginPath();c.arc(x+dx,y+dy,r,0,6.3);c.fill();}}
export function drawRoadScene(c,w,h,seconds,{destination=null,opening=false,reduced=false}={}){
 const t=Math.max(0,seconds),night=destination==='club'?ease((t-1.2)/6.2):0,sunset=destination==='club'?ease((t-.7)/3.5):0;
 const color=(day,dusk,dark)=>blendColor(blendColor(day,dusk,sunset),dark,night);
 const scaleView=Math.max(w/1000,h/670),lead=opening?t-OPENING_LEAD:t,ahead=opening?openingCarAhead(t,h/scaleView/2+75+75):0,car=opening?{x:550,y:410-(Number.isFinite(ahead)?ahead:0),angle:0,hidden:!Number.isFinite(ahead)}:journeyPose(t),follow=opening?ease((lead-1)/2)*80:ease((t-4.4)/5),cameraX=opening?550+follow:550+(car.x-550)*.8,cameraY=opening?335:370-45*follow;
 const scale=Math.max(w/1000,h/670);c.save();c.translate(w/2,h/2);c.scale(scale,scale);c.translate(-cameraX,-cameraY);
 const sky=c.createLinearGradient(0,-1000,0,1500);sky.addColorStop(0,color('#a8cecb','#e3ae91','#112138'));sky.addColorStop(1,color('#d4d8b1','#bd927c','#273a4f'));c.fillStyle=sky;c.fillRect(-3000,-3000,6000,6000);
 // Campos, bloques, árboles, farolas y marcas viales avanzan a la vez y a la
 // misma velocidad (la de la carretera), también al acelerar, frenar y girar.
 const road=opening?openingRoad(t):roadScroll(t);c.fillStyle=color('#9caf91','#a78e77','#273e4b');for(let i=0;i<15;i++){const y=((i*240+road)%3600)-1000;c.fillRect(-1500,y,4000,100);}
 for(let i=0;i<15;i++){const x=i%2?125:1350,y=((i*120+road)%1800)-700;box(c,x+(i%3)*18,y,75+(i%4)*10,85+(i%3)*28,7,color('#a8b7a7','#a78b87','#26354b'));for(let k=0;k<3;k++)box(c,x+10+k*20+(i%3)*18,y+15,9,14,2,color('#d7e0ca','#dec3a0',k%2?'#eac884':'#86bbc7'));}
 box(c,350,-3000,300,6000,0,color('#8d9e96','#7a7d79','#5a6872'));box(c,364,-3000,272,6000,0,color('#415563','#424856','#2b3a4e'));box(c,371,-3000,3,6000,0,'#e8dfbb');box(c,626,-3000,3,6000,0,'#e8dfbb');
 const scroll=road;for(let y=-1200;y<2000;y+=83)box(c,496,y+(scroll%83),8,43,2,'#e8ddae');
 for(let i=0;i<15;i++){const y=((i*160+road)%2400)-1000;tree(c,275,y,night);tree(c,1325,y+42,night);for(const x of [330,1270]){box(c,x,y,4,73,1,'#647a83');box(c,x-7,y-6,18,9,4,blendColor('#9cbab4','#ffdc96',night));if(night>.02){const g=c.createRadialGradient(x+2,y+2,0,x+2,y+2,90);g.addColorStop(0,`rgba(245,203,108,${night*.14})`);g.addColorStop(1,'#f5cb6c00');c.fillStyle=g;c.fillRect(x-88,y-88,180,180);}}}
 const approach=opening?0:ROAD_TOTAL-road,signY=opening?-150+190*lead:80-approach;box(c,660,signY+50,7,90,2,'#586c76');box(c,828,signY+50,7,90,2,'#586c76');box(c,630,signY,235,65,7,'#326e72','#d4e2ca');label(c,opening?'VALLADOLID':destination==='club'?'SANAGUS CLUB →':destination==='park'?'CAMPO GRANDE →':destination==='gym'?'SANAGUS GYM →':'COLEGIO →',747,signY+28,opening?25:16);label(c,opening?'BIENVENIDOS / 2 km':'PRÓXIMA SALIDA',747,signY+48,10);
 // El destino está más adelante en la carretera y aparece al acercarse.
 c.save();c.translate(0,-approach);c.globalAlpha=opening?1:ease(1-approach/700);
 if(destination==='park'){parkEntrance(c,t);}else if(destination){box(c,637,245,620,140,12,color('#b0b4a0','#9e8e88','#263345'));box(c,844,-15,360,255,16,color('#e5d1ae','#b28d8d','#293249'),'#56717a');box(c,829,-26,390,22,5,color('#ac7c5c','#ca858f','#e585d0'));for(let i=0;i<5;i++)for(let j=0;j<2;j++)box(c,866+i*62,14+j*65,34,45,3,color('#91beb9','#bca3b0',['#b583d9','#719ee4','#d1ad7d'][i%3]));box(c,975,154,82,86,8,'#345365','#79979b');box(c,900,110,250,26,6,color('#527c72','#7f627e','#51345f'));label(c,destination==='club'?'SANAGUS / CLUB':destination==='park'?'CAMPO GRANDE':destination==='gym'?'SANAGUS / GYM':'COLEGIO SANAGUS',1025,129,17,color('#fff1cc','#ffe1cb','#ffbcf0'));if(destination==='gym'){box(c,865,191,42,30,3,'#e3e6d3','#729499');c.strokeStyle='#c68a6d';c.lineWidth=3;c.beginPath();c.ellipse(886,224,14,5,0,0,6.3);c.stroke();for(const xx of [946,1083]){box(c,xx,179,6,45,2,'#72939a');for(const yy of [175,215])box(c,xx-7,yy,20,12,3,'#435c69');}}if(night>.02&&!reduced){c.save();c.globalAlpha=night;for(let i=0;i<5;i++){c.fillStyle=['#a56ee344','#64bce344','#eb9cdc44'][i%3];c.beginPath();c.moveTo(870+i*65,-10);c.lineTo(820+i*65+Math.sin(t+i)*70,230);c.lineTo(960+i*65+Math.sin(t+i)*70,230);c.fill();}c.restore();}}
 c.restore();
 const traffic=trafficPose(t);box(c,traffic.x-21,traffic.y-37,42,75,9,'#9789b3','#415763');box(c,traffic.x-16,traffic.y+8,32,20,4,'#b6d3d0');
 if(!car.hidden)drawCaravanExterior(c,car.x,car.y,.65,car.angle);
 if(car.signal&&Math.sin(t*6)>0){c.save();c.translate(car.x,car.y);c.rotate(car.angle);box(c,23,-56,9,8,3,'#ffc16d');c.restore();}
 c.restore();
}
export function drawJourney(canvas,time,state,{reduced=false,lobbyShot=null}={}){const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,seconds=Math.max(0,(time-state.journeyStart)/1000);c.fillStyle='#142333';c.fillRect(0,0,w,h);
 drawRoadScene(c,w,h,seconds,{destination:state.config.map,reduced});
 // The exterior is revealed by a slow roof lift; the camera never shakes.
 if(seconds<1.4&&lobbyShot){const cr=canvas.getBoundingClientRect(),k=w/Math.max(1,cr.width),t=ease(seconds/1.4),z=reduced?1:1-.7*t,r=lobbyShot.rect,x=(r.x-cr.left)*k,y=(r.y-cr.top)*k,iw=r.w*k,ih=r.h*k;c.save();c.globalAlpha=reduced?1-ease(seconds/.6):1-ease((seconds-.7)/.7);c.translate(w/2,h/2);c.scale(z,z);c.translate(-w/2,-h/2);c.fillStyle='#142333';c.drawImage(lobbyShot.img,x,y,iw,ih);c.restore();}
 else if(seconds<1.4&&!reduced){const t=ease(seconds/1.4),s=Math.max(w/1000,h/670)*(1.1-.82*t);c.save();c.globalAlpha=1-ease((seconds-.75)/.65);c.translate(w/2,h/2);c.scale(s,s);c.translate(-560,-420);drawCaravanInterior(c,CARAVAN);for(const [i,p] of state.roster.entries())drawRobot(c,{...p,alive:true},560+Math.cos(i*2.4)*80,410+Math.sin(i*2.4)*70,.84,time);c.restore();}
 const fade=ease((seconds-10.4)/.6);if(fade){c.fillStyle=`rgba(13,24,39,${fade})`;c.fillRect(0,0,w,h);}if(seconds<10.4){box(c,Math.max(8,w/2-210),h*.82,Math.min(420,w-16),h*.14,14,'#132b42c9','#d5c79b77');label(c,seconds>9.5?'HEMOS LLEGADO':'EN RUTA',w/2,h*.87,Math.max(14,Math.min(w*.028,24)));label(c,state.config.map==='club'?'DESTINO / SANAGUS CLUB':state.config.map==='park'?'DESTINO / CAMPO GRANDE':state.config.map==='gym'?'DESTINO / SANAGUS GYM':'DESTINO / COLEGIO',w/2,h*.92,Math.max(11,Math.min(w*.019,16)));}}
