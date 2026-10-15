import {drawCaravanInterior,CARAVAN} from './caravan.js';
import {drawRobot} from './characters.js';
const clamp=v=>Math.max(0,Math.min(1,v)),ease=v=>{v=clamp(v);return v*v*(3-2*v);};
function box(c,x,y,w,h,r,color,stroke){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}}
function label(c,s,x,y,size,color='#eff6dc'){c.fillStyle=color;c.font=`900 ${size}px Segoe UI`;c.textAlign='center';c.fillText(s,x,y);}
export function drawCaravanExterior(c,x,y,scale=1,angle=0){c.save();c.translate(x,y);c.rotate(angle);c.scale(scale,scale);box(c,-48,-92,104,192,22,'#0a182b40');for(const xx of [-48,40])for(const yy of [-52,46])box(c,xx,yy,10,30,4,'#192c3a');box(c,-44,-92,88,184,21,'#dfc8a3','#536b77');box(c,-39,-85,78,48,16,'#85b8bb','#395969');box(c,-31,-78,62,30,9,'#3b6a7b');box(c,-39,-26,78,107,12,'#f2e6c8');box(c,-33,-20,66,7,3,'#cc956f');for(const xx of [-35,28]){box(c,xx,5,7,55,3,'#6c9e9e');box(c,xx,-88,9,6,2,'#fff5b8');box(c,xx,83,9,5,2,'#d27d70');}box(c,-18,0,36,38,5,'#c2cfc0','#9cae9f');box(c,-12,6,24,26,4,'#84a9aa');box(c,-12,53,24,13,4,'#78918d');label(c,'AS',0,49,13,'#56747b');c.restore();}
export function blendColor(a,b,t){const rgb=s=>s.match(/\w\w/g).map(v=>parseInt(v,16));const aa=rgb(a.replace('#','')),bb=rgb(b.replace('#',''));return '#'+aa.map((v,i)=>Math.round(v+(bb[i]-v)*clamp(t)).toString(16).padStart(2,'0')).join('');}
export function journeyPose(seconds){const t=Math.max(0,seconds);if(t<4.6)return {x:550,y:500-90*ease(t/4.6),angle:0,signal:t>3.6};if(t<7.4){const a=ease((t-4.6)/2.8)*Math.PI/2;return {x:650-100*Math.cos(a),y:410-100*Math.sin(a),angle:a,signal:true};}return {x:650+350*ease((t-7.4)/2.2),y:310,angle:Math.PI/2,signal:false};}
export function trafficPose(seconds){return {x:431,y:((seconds*155+750)%1600)-400};}
function tree(c,x,y,night){box(c,x-3,y,6,18,2,blendColor('#826951','#3f3d47',night));for(const [dx,dy,r] of [[0,-8,22],[-13,0,17],[13,2,18]]){c.fillStyle=blendColor(dx<0?'#698875':'#89a18b','#284957',night);c.beginPath();c.arc(x+dx,y+dy,r,0,6.3);c.fill();}}
export function drawRoadScene(c,w,h,seconds,{destination=null,opening=false,reduced=false}={}){
 const t=Math.max(0,seconds),night=destination==='club'?ease((t-1.2)/6.2):0,sunset=destination==='club'?ease((t-.7)/3.5):0;
 const color=(day,dusk,dark)=>blendColor(blendColor(day,dusk,sunset),dark,night);
 const car=opening?{x:550,y:410,angle:0}:journeyPose(t),follow=opening?ease((t-1)/2)*80:ease((t-4.4)/5),cameraX=opening?550+follow:550+(car.x-550)*.8,cameraY=opening?335:370-45*follow;
 const scale=Math.max(w/1000,h/670);c.save();c.translate(w/2,h/2);c.scale(scale,scale);c.translate(-cameraX,-cameraY);
 const sky=c.createLinearGradient(0,-1000,0,1500);sky.addColorStop(0,color('#a8cecb','#e3ae91','#112138'));sky.addColorStop(1,color('#d4d8b1','#bd927c','#273a4f'));c.fillStyle=sky;c.fillRect(-3000,-3000,6000,6000);
 // Fields drift slowly behind the roadway; city blocks form a second depth.
 c.fillStyle=color('#9caf91','#a78e77','#273e4b');for(let i=0;i<15;i++){const y=((i*260+t*17)%3600)-1000;c.fillRect(-1500,y,4000,100);}
 for(let i=0;i<15;i++){const x=i%2?125:1350,y=((i*137+t*34)%1800)-700;box(c,x+(i%3)*18,y,75+(i%4)*10,85+(i%3)*28,7,color('#a8b7a7','#a78b87','#26354b'));for(let k=0;k<3;k++)box(c,x+10+k*20+(i%3)*18,y+15,9,14,2,color('#d7e0ca','#dec3a0',k%2?'#eac884':'#86bbc7'));}
 box(c,350,-3000,300,6000,0,color('#8d9e96','#7a7d79','#5a6872'));box(c,364,-3000,272,6000,0,color('#415563','#424856','#2b3a4e'));box(c,371,-3000,3,6000,0,'#e8dfbb');box(c,626,-3000,3,6000,0,'#e8dfbb');
 const scroll=opening?t*190:Math.min(t,4.6)*190;for(let y=-1200;y<2000;y+=83)box(c,496,y+(scroll%83),8,43,2,'#e8ddae');
 for(let i=0;i<15;i++){const y=((i*147+(opening?t:Math.min(t,4.6))*100)%2400)-1000;tree(c,275,y,night);tree(c,1325,y+42,night);for(const x of [330,1270]){box(c,x,y,4,73,1,'#647a83');box(c,x-7,y-6,18,9,4,blendColor('#9cbab4','#ffdc96',night));if(night>.02){const g=c.createRadialGradient(x+2,y+2,0,x+2,y+2,90);g.addColorStop(0,`rgba(245,203,108,${night*.14})`);g.addColorStop(1,'#f5cb6c00');c.fillStyle=g;c.fillRect(x-88,y-88,180,180);}}}
 const signY=opening?-150+t*135:80;box(c,660,signY+50,7,90,2,'#586c76');box(c,630,signY,235,65,7,'#326e72','#d4e2ca');label(c,opening?'VALLADOLID':destination==='club'?'SANAGUS CLUB →':'COLEGIO →',747,signY+28,opening?25:16);label(c,opening?'BIENVENIDOS / 2 km':'PRÓXIMA SALIDA',747,signY+48,10);
 if(destination){box(c,637,245,620,140,12,color('#b0b4a0','#9e8e88','#263345'));box(c,844,-15,360,255,16,color('#e5d1ae','#b28d8d','#293249'),'#56717a');box(c,829,-26,390,22,5,color('#ac7c5c','#ca858f','#e585d0'));for(let i=0;i<5;i++)for(let j=0;j<2;j++)box(c,866+i*62,14+j*65,34,45,3,color('#91beb9','#bca3b0',['#b583d9','#719ee4','#d1ad7d'][i%3]));box(c,975,154,82,86,8,'#345365','#79979b');box(c,900,110,250,26,6,color('#527c72','#7f627e','#51345f'));label(c,destination==='club'?'SANAGUS / CLUB':'COLEGIO SANAGUS',1025,129,17,color('#fff1cc','#ffe1cb','#ffbcf0'));if(night>.02&&!reduced){c.save();c.globalAlpha=night;for(let i=0;i<5;i++){c.fillStyle=['#a56ee344','#64bce344','#eb9cdc44'][i%3];c.beginPath();c.moveTo(870+i*65,-10);c.lineTo(820+i*65+Math.sin(t+i)*70,230);c.lineTo(960+i*65+Math.sin(t+i)*70,230);c.fill();}c.restore();}}
 const traffic=trafficPose(t);box(c,traffic.x-21,traffic.y-37,42,75,9,'#9789b3','#415763');box(c,traffic.x-16,traffic.y+8,32,20,4,'#b6d3d0');
 drawCaravanExterior(c,car.x,car.y,.65,car.angle);
 if(car.signal&&Math.sin(t*6)>0){c.save();c.translate(car.x,car.y);c.rotate(car.angle);box(c,23,-56,9,8,3,'#ffc16d');c.restore();}
 c.restore();
}
export function drawJourney(canvas,time,state,{reduced=false}={}){const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,seconds=Math.max(0,(time-state.journeyStart)/1000);c.fillStyle='#142333';c.fillRect(0,0,w,h);
 drawRoadScene(c,w,h,seconds,{destination:state.config.map,reduced});
 // The exterior is revealed by a slow roof lift; the camera never shakes.
 if(seconds<1.4&&!reduced){const t=ease(seconds/1.4),s=Math.max(w/1000,h/670)*(1.1-.82*t);c.save();c.globalAlpha=1-ease((seconds-.75)/.65);c.translate(w/2,h/2);c.scale(s,s);c.translate(-560,-420);drawCaravanInterior(c,CARAVAN);for(const [i,p] of state.roster.entries())drawRobot(c,{...p,alive:true},560+Math.cos(i*2.4)*80,410+Math.sin(i*2.4)*70,.84,time);c.restore();}
 const fade=ease((seconds-10.4)/.6);if(fade){c.fillStyle=`rgba(13,24,39,${fade})`;c.fillRect(0,0,w,h);}if(seconds<10.4){box(c,Math.max(8,w/2-210),h*.82,Math.min(420,w-16),h*.14,14,'#132b42c9','#d5c79b77');label(c,seconds>9.5?'HEMOS LLEGADO':'EN RUTA',w/2,h*.87,Math.max(14,Math.min(w*.028,24)));label(c,state.config.map==='club'?'DESTINO / SANAGUS CLUB':'DESTINO / COLEGIO',w/2,h*.92,Math.max(11,Math.min(w*.019,16)));}}
