// Campo Grande en vista cenital: césped, red de senderos de tierra, paseo de
// losas, lago, plazas, parterres, verja y mobiliario. Nada se dibuja en volumen:
// no hay troncos, paredes ni postes altos; la profundidad la dan las sombras.
import {FILL} from './park-fill.js';
const T=56,TAU=Math.PI*2;
function oval(c,x,y,rx,ry,color,stroke,width=2){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);if(color){c.fillStyle=color;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function box(c,x,y,w,h,color,stroke,r=5,width=2){c.beginPath();c.roundRect(x,y,w,h,r);if(color){c.fillStyle=color;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function line(c,points,color,width=2){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineJoin='round';c.lineCap='round';c.stroke();}
function poly(c,points,scale=T){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x*scale,y*scale):c.moveTo(x*scale,y*scale));c.closePath();}
function ngon(c,x,y,r,n,rot=0){c.beginPath();for(let i=0;i<n;i++){const a=rot+i*TAU/n;i?c.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r):c.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}c.closePath();}
// Generador determinista: el suelo sale idéntico en todos los clientes.
function seeded(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function inside(points,x,y){let yes=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
function tracePaths(c,paths){c.beginPath();for(const path of paths)path.forEach(([x,y],i)=>i?c.lineTo(x*T,y*T):c.moveTo(x*T,y*T));}
const FLOWER=['#f2a5c4','#f6d36b','#e8644f','#c9a3e8','#fbf4e4'];
const TREE_SHADOW='#20391f4d';


// Detalles del suelo de cada juego: castillos y cubos en la arena, rayuela y
// líneas de colores en el caucho, seto con flores alrededor del tiovivo.
function decoratePad(c,p,x,y,w,h,rand){
 if(p.id==='arenero'){
  for(const [fx,fy,s] of [[.78,.72,1],[.2,.8,.7],[.86,.2,.6]]){const px=x+w*fx,py=y+h*fy;oval(c,px,py,15*s,12*s,'#d4ae6b','#a98446',1.5);oval(c,px,py,9*s,7*s,'#e6c785');oval(c,px,py,3*s,3*s,'#c9514a');}
  box(c,x+w*.12,y+h*.12,16,14,'#e3533d','#8e2a22',3,1.5);oval(c,x+w*.12+8,y+h*.12+7,3,3,'#7a1d17');
  line(c,[[x+w*.35,y+h*.9],[x+w*.55,y+h*.84],[x+w*.62,y+h*.9]],'#b88f52',2);
 }else if(p.id==='tobogan'){
  for(let i=0;i<5;i++){const bx=x+w*.1+i*w*.07,by=y+h*.7+(i%2)*14;box(c,bx,by-20+(i%2)*0,22,18,['#f6cf56','#e3533d','#59b36a','#fff','#f6cf56'][i],'#ffffff66',3,1);}
  c.save();c.globalAlpha=.7;oval(c,x+w*.75,y+h*.78,12,12,null,'#fff',3);oval(c,x+w*.75,y+h*.78,5,5,null,'#fff',3);c.restore();
 }else if(p.id==='columpios'){
  
 }else if(p.id==='tiovivo'){
  for(let i=0;i<26;i++){const t=i/26;const edge=[[x+4+t*(w-8),y+4],[x+w-4,y+4+t*(h-8)],[x+w-4-t*(w-8),y+h-4],[x+4,y+h-4-t*(h-8)]];for(const [ex,ey] of edge){oval(c,ex,ey,5,5,'#3f7b3a');}}
  for(let i=0;i<26;i++){const t=i/26;oval(c,x+4+t*(w-8),y+4,2.4,2.4,FLOWER[i%5]);oval(c,x+w-4-t*(w-8),y+h-4,2.4,2.4,FLOWER[(i+2)%5]);}
 }
}

export function drawParkFloor(c,map){
 const L=map.layout;if(!L)return;
 const rand=seeded(731),Wpx=map.width*T,Hpx=map.height*T;
 c.save();poly(c,L.fence);c.fillStyle='#5b8a42';c.fill();c.clip();
 // Césped moteado.
 for(let i=0;i<1400;i++){const x=rand()*Wpx,y=rand()*Hpx,r=14+rand()*46;oval(c,x,y,r,r*.7,['#6a9a4d30','#4e7a3a2e','#78a5562a'][i%3]);}
 for(let i=0;i<5200;i++){const x=rand()*Wpx,y=rand()*Hpx;line(c,[[x,y],[x+(rand()-.5)*4,y-4-rand()*4]],['#7fae5a55','#42703655'][i%2],1.4);}
 // Sombras del arbolado sobre el césped (desplazadas, como luz de media tarde).
 
 // Parterres de la rosaleda y del jardín: tierra oscura, seto y flores.
 for(const bed of L.beds){poly(c,bed);c.fillStyle='#6a4f35';c.fill();c.strokeStyle='#3d6b33';c.lineWidth=9;c.stroke();
  const xs=bed.map(p=>p[0]),ys=bed.map(p=>p[1]);
  for(let i=0;i<70;i++){const x=Math.min(...xs)+rand()*(Math.max(...xs)-Math.min(...xs)),y=Math.min(...ys)+rand()*(Math.max(...ys)-Math.min(...ys));if(!inside(bed,x,y))continue;oval(c,x*T,y*T,5,5,'#3f7b3a');oval(c,x*T,y*T-1,3.4,3.4,FLOWER[i%4]);}}
 // Recinto de la pajarera: valla baja de malla.
 poly(c,L.aviaryFence);c.fillStyle='#6a9752';c.fill();c.setLineDash([2,7]);c.strokeStyle='#2f3d36';c.lineWidth=3;c.stroke();c.setLineDash([]);
 // Senderos de tierra: borde, firme y polvo claro en el centro.
 const R=L.pathRadius*T;
 tracePaths(c,L.paths);c.lineJoin='round';c.lineCap='round';
 c.strokeStyle='#4d6b37';c.lineWidth=R*2+9;c.stroke();
 c.strokeStyle='#8a6a43';c.lineWidth=R*2+3;c.stroke();
 c.strokeStyle='#c99d66';c.lineWidth=R*2-2;c.stroke();
 c.strokeStyle='#d8b17c88';c.lineWidth=R*.9;c.stroke();
 for(const r of FILL)box(c,r.x*T-4,r.y*T-4,r.w*T+8,r.h*T+8,'#c99d66',null,6);
 // 14.0 · Grava y bordes naturales de los senderos (sin sombras): chinas de
 // varios tonos, rodadas más claras en el centro, piedras de borde que hacen
 // de transición limpia con el césped y matas de hierba que asoman.
 {const g=seeded(4242),segs=[];for(const path of L.paths)for(let i=1;i<path.length;i++)segs.push([path[i-1][0]*T,path[i-1][1]*T,path[i][0]*T,path[i][1]*T]);
  const onDirt=(x,y)=>segs.some(([ax,ay,bx,by])=>{const vx=bx-ax,vy=by-ay,l2=vx*vx+vy*vy||1,t=Math.max(0,Math.min(1,((x-ax)*vx+(y-ay)*vy)/l2));return Math.hypot(x-ax-vx*t,y-ay-vy*t)<R-.5;})||FILL.some(r=>x>r.x*T-4&&x<(r.x+r.w)*T+4&&y>r.y*T-4&&y<(r.y+r.h)*T+4)||L.crossings.some(r=>x>r.x*T-4&&x<(r.x+r.w)*T+4&&y>r.y*T-4&&y<(r.y+r.h)*T+4)||(x>L.paseo.x*T-8&&x<(L.paseo.x+L.paseo.w)*T+8&&y>L.paseo.y*T&&y<(L.paseo.y+L.paseo.h)*T);
  for(const path of L.paths)for(let i=1;i<path.length;i++){const [x0,y0]=path[i-1],[x1,y1]=path[i],dx=(x1-x0)*T,dy=(y1-y0)*T,len=Math.hypot(dx,dy);if(len<1)continue;const nx=-dy/len,ny=dx/len;
  for(let k=0;k<len/6;k++){const u=g(),o=(g()*2-1)*R*.86,x=x0*T+dx*u+nx*o,y=y0*T+dy*u+ny*o;oval(c,x,y,1.1+g()*1.6,.9+g()*1.1,['#a98457','#e2c08d','#b8956a','#8f7454','#d9c3a0'][Math.floor(g()*5)]);}
  for(let k=0;k<len/26;k++){const u=g(),x=x0*T+dx*u,y=y0*T+dy*u;line(c,[[x-dx/len*9+nx*R*.32,y-dy/len*9+ny*R*.32],[x+dx/len*9+nx*R*.32,y+dy/len*9+ny*R*.32]],'#e6c99a55',2);}
  for(const side of [-1,1])for(let k=0;k<len/20;k++){const u=(k+g()*.6)/(len/20),x=x0*T+dx*u+nx*side*(R+1.5),y=y0*T+dy*u+ny*side*(R+1.5);if(onDirt(x+nx*side*3,y+ny*side*3))continue;oval(c,x,y,3.2+g()*1.6,2.4+g()*1,['#9c8f78','#b2a68e','#8b806b'][k%3]);if(g()<.35)line(c,[[x+nx*side*3,y+ny*side*3],[x+nx*side*8+(g()-.5)*4,y+ny*side*8-3]],'#6f9f4f',1.6);}}}
 for(const r of L.crossings){box(c,r.x*T-4,r.y*T-4,r.w*T+8,r.h*T+8,'#4d6b37',null,16);box(c,r.x*T-2,r.y*T-2,r.w*T+4,r.h*T+4,'#8a6a43',null,15);box(c,r.x*T,r.y*T,r.w*T,r.h*T,'#c99d66',null,14);}
 // Plazas de las fuentes y del templete.
 for(const p of L.plazas){oval(c,p.x*T,p.y*T,p.r*T+5,p.r*T+5,'#8a7c66');oval(c,p.x*T,p.y*T,p.r*T,p.r*T,'#d9cdb7');for(let i=0;i<20;i++){const a=i*TAU/20;line(c,[[p.x*T+Math.cos(a)*p.r*T*.55,p.y*T+Math.sin(a)*p.r*T*.55],[p.x*T+Math.cos(a)*p.r*T*.98,p.y*T+Math.sin(a)*p.r*T*.98]],'#b9ab9255',2);}oval(c,p.x*T,p.y*T,p.r*T*.55,p.r*T*.55,null,'#b9ab92',3);}
 // Suelos de los juegos infantiles.
 for(const p of L.pads){const x=p.x*T,y=p.y*T,w=p.w*T,h=p.h*T,fill={sand:'#e3c58b',rubber:'#4f86b8',grass:'#79a75a'}[p.floor];box(c,x-4,y-4,w+8,h+8,'#7d5c3b',null,8);box(c,x,y,w,h,fill,null,6);for(let i=0;i<40;i++)oval(c,x+rand()*w,y+rand()*h,2,2,p.floor==='rubber'?'#6aa0cc':'#c9a96e');decoratePad(c,p,x,y,w,h,rand);}
 // Paseo central: losas grises, bordillo y nada más.
 const P=L.paseo,px=P.x*T,py=P.y*T,pw=P.w*T,ph=P.h*T;
 c.fillStyle='#cfc5ba';c.fillRect(px,py,pw,ph);
 for(let y=py;y<py+ph;y+=28){line(c,[[px,y],[px+pw,y]],'#b7ab9f',1.5);const off=(Math.round((y-py)/28)%2)*21;for(let x=px+off;x<px+pw;x+=42)line(c,[[x,y],[x,y+28]],'#bdb2a6',1.2);}
 for(let i=0;i<260;i++)oval(c,px+rand()*pw,py+rand()*ph,1.5+rand()*2,1.2,'#a99d9155');
 line(c,[[px,py],[px,py+ph]],'#9b9184',5);line(c,[[px+pw,py],[px+pw,py+ph]],'#9b9184',5);
 for(let y=py+140;y<py+ph-60;y+=420)for(const x of [px+10,px+pw-26]){box(c,x,y,16,30,'#8d8479','#6f675e',3);for(let k=1;k<5;k++)line(c,[[x+3,y+k*6],[x+13,y+k*6]],'#5f584f',1.4);}
 // Lago con orilla de piedra, reflejos y la isla arbolada.
 poly(c,L.lake);c.strokeStyle='#8f8b74';c.lineWidth=16;c.stroke();c.strokeStyle='#5d7550';c.lineWidth=5;c.stroke();c.fillStyle='#2c86b8';c.fill();
 c.save();poly(c,L.lake);c.clip();c.strokeStyle='#5fb3dc';c.lineWidth=18;poly(c,L.lake);c.stroke();for(let i=0;i<60;i++){const xs=L.lake.map(p=>p[0]),ys=L.lake.map(p=>p[1]),x=(Math.min(...xs)+rand()*(Math.max(...xs)-Math.min(...xs)))*T,y=(Math.min(...ys)+rand()*(Math.max(...ys)-Math.min(...ys)))*T;line(c,[[x-10,y],[x+10,y-1]],'#9fd6ef66',1.5);}c.restore();
 for(const isle of L.islands){poly(c,isle);c.fillStyle='#6a9a4d';c.fill();c.strokeStyle='#8f8b74';c.lineWidth=6;c.stroke();}
 // Flores sueltas detectadas en la vista aérea.
 for(const [x,y,r,tone] of L.flowers)for(let i=0;i<7;i++){const a=i*2.4,d=r*T*.6*Math.sqrt(i/7);oval(c,x*T+Math.cos(a)*d,y*T+Math.sin(a)*d,3.5,3.5,FLOWER[tone]);}
 // Botón de emergencia: una placa en el suelo, en el centro exacto del paseo.
 if(map.emergency){const x=map.emergency.x,y=map.emergency.y;oval(c,x+3,y+4,30,30,'#2a2a2a33');oval(c,x,y,30,30,'#5d6466','#3a4042',3);oval(c,x,y,23,23,'#f2c14e');for(let i=0;i<12;i++){const a=i*TAU/12;line(c,[[x+Math.cos(a)*19,y+Math.sin(a)*19],[x+Math.cos(a)*23,y+Math.sin(a)*23]],'#2d2d2d',3);}oval(c,x,y,15,15,'#d9343f','#8e1f28',2);oval(c,x-4,y-5,6,4,'#f59b9f');}
 c.restore();
 // Verja perimetral vista desde arriba: barandilla fina con machones.
 poly(c,L.fence);c.strokeStyle='#1d2c31';c.lineWidth=7;c.stroke();c.strokeStyle='#5e7775';c.lineWidth=2;c.stroke();
 for(let i=0;i<L.fence.length;i++){const a=L.fence[i],b=L.fence[(i+1)%L.fence.length],d=Math.hypot(b[0]-a[0],b[1]-a[1])*T;for(let t=0;t<d;t+=46){const x=a[0]*T+(b[0]-a[0])*T*t/d,y=a[1]*T+(b[1]-a[1])*T*t/d;box(c,x-4,y-4,8,8,'#cfc6ae','#3b4a4a',2,1.5);}}
 for(const [x,y] of L.gates){box(c,x*T-10,y*T-10,20,20,'#e2d8bf','#3b4a4a',3,2);oval(c,x*T,y*T,5,5,'#b9ad8e');}
}


// Juegos infantiles en planta, cada uno con su carácter.
function drawToy(c,p,w,h,shadow){
 shadow(w/2,h/2,w/2,h/2);
 const t=p.toy,cx=w/2,cy=h/2;
 if(t==='swings'){
  // Dos pórticos en A vistos desde arriba, tres columpios con cadenas y asiento.
  for(const y of [7,h-7]){box(c,3,y-4,w-6,8,'#3f6f9c',null,4);box(c,3,y-4,w-6,3,'#6fa6d4',null,3);oval(c,8,y,5,5,'#22405e');oval(c,w-8,y,5,5,'#22405e');}
  [w*.25,w*.5,w*.75].forEach((x,i)=>{const sw=Math.sin(i*1.7)*3;line(c,[[x-5,9],[x-5+sw,h/2-5]],'#c7ced2',1.4);line(c,[[x+5,9],[x+5+sw,h/2-5]],'#c7ced2',1.4);line(c,[[x-5,h-9],[x-5+sw,h/2+5]],'#c7ced2',1.4);line(c,[[x+5,h-9],[x+5+sw,h/2+5]],'#c7ced2',1.4);box(c,x-8+sw,h/2-5,16,10,['#e3533d','#f2c14e','#4aa56a'][i],'#00000033',3,1);});
 }else if(t==='carousel'){
  // Tiovivo: plato giratorio de cuñas, asideros y asientos de colores.
  oval(c,cx,cy,w/2,h/2,'#6f5a3b');oval(c,cx,cy,w/2-3,h/2-3,'#efe6cf');
  for(let i=0;i<8;i++){c.beginPath();c.moveTo(cx,cy);c.arc(cx,cy,w/2-5,i*TAU/8,(i+1)*TAU/8);c.closePath();c.fillStyle=['#e3533d','#f6cf56','#3f8fcf','#59b36a'][i%4];c.fill();}
  for(let i=0;i<8;i++){const a=(i+.5)*TAU/8;oval(c,cx+Math.cos(a)*w*.33,cy+Math.sin(a)*h*.33,5,5,'#fff8e3','#6f5a3b',1.5);}
  oval(c,cx,cy,w*.16,h*.16,'#8f6a3f','#5a4228',2);oval(c,cx,cy,w*.07,h*.07,'#f2c14e');
  for(let i=0;i<4;i++){const a=i*TAU/4+Math.PI/4;line(c,[[cx,cy],[cx+Math.cos(a)*w*.42,cy+Math.sin(a)*h*.42]],'#d9dfe2',2.2);}
 }else if(t==='slide'){
  // Torre con tejado a cuatro aguas, escalera y un tobogán recto azul.
  box(c,0,0,w*.5,h*.5,'#9b7a50','#5a4228',4,2);
  c.beginPath();c.moveTo(0,0);c.lineTo(w*.25,h*.25);c.lineTo(w*.5,0);c.closePath();c.fillStyle='#e9792f';c.fill();
  c.beginPath();c.moveTo(0,h*.5);c.lineTo(w*.25,h*.25);c.lineTo(w*.5,h*.5);c.closePath();c.fillStyle='#bd5a1f';c.fill();
  c.beginPath();c.moveTo(0,0);c.lineTo(w*.25,h*.25);c.lineTo(0,h*.5);c.closePath();c.fillStyle='#d4691f';c.fill();
  c.beginPath();c.moveTo(w*.5,0);c.lineTo(w*.25,h*.25);c.lineTo(w*.5,h*.5);c.closePath();c.fillStyle='#f08a3e';c.fill();
  oval(c,w*.25,h*.25,3,3,'#fff1c9');
  box(c,w*.46,h*.12,w*.54,h*.26,'#4aa0e0','#2a6aa0',8,2);box(c,w*.5,h*.19,w*.46,h*.07,'#a9dcff',null,4);
  for(let i=0;i<5;i++)line(c,[[3+i*w*.1,h*.58],[3+i*w*.1,h*.86]],'#caa66e',2.5);line(c,[[2,h*.64],[w*.5,h*.64]],'#8a6a43',2);line(c,[[2,h*.8],[w*.5,h*.8]],'#8a6a43',2);
 }else{
  // Torre de trepa con red de cuerda, tejados y bandera.
  box(c,0,0,w,h,'#8d6a42','#5a4228',5,2);
  for(let i=1;i<6;i++){line(c,[[i*w/6,3],[i*w/6,h-3]],'#e8d9a9',1.3);line(c,[[3,i*h/6],[w-3,i*h/6]],'#e8d9a9',1.3);}
  box(c,w*.08,h*.08,w*.38,h*.38,'#d9483b','#8e2a22',4,2);box(c,w*.54,h*.54,w*.38,h*.38,'#3f8fcf','#24598a',4,2);
  oval(c,w*.27,h*.27,4,4,'#fff1c9');oval(c,w*.73,h*.73,4,4,'#fff1c9');
  line(c,[[w*.54,h*.1],[w*.9,h*.1]],'#59b36a',5);line(c,[[w*.1,h*.54],[w*.1,h*.9]],'#f6cf56',5);
 }
}

// Mobiliario y edificios, todo en planta. Devuelve true si el objeto es del parque.
export function drawParkProp(c,p){
 if(p.parkGrove)return true;
 if(!p.kind||!p.kind.startsWith('park-'))return false;
 const w=p.w*T,h=p.h*T,k=p.kind.slice(5);c.save();c.translate(p.x*T,p.y*T);
 const shadow=()=>{};
 if(k==='bench'){const horizontal=w>=h;shadow(w/2,h/2,w/2,h/2);if(!horizontal){c.translate(w,0);c.rotate(Math.PI/2);}const L=horizontal?w:h,D=horizontal?h:w;box(c,0,0,L,D,'#7d5a3a',null,4);for(let i=0;i<4;i++)box(c,3,2+i*(D-4)/4,L-6,(D-4)/4-2,'#b8875a',null,2);box(c,0,0,5,D,'#3f4b4a',null,2);box(c,L-5,0,5,D,'#3f4b4a',null,2);}
 else if(k==='lamp'){shadow(w/2,h/2,9,7);oval(c,w/2,h/2,9,9,'#2b3838','#1b2626');oval(c,w/2,h/2,5.5,5.5,'#f6e7a8','#c9a75c',1.5);}
 else if(k==='fountain'){const r=w/2;shadow(r,r,r,r);oval(c,r,r,r,r,'#a8a08a','#6f6a5a',3);oval(c,r,r,r*.82,r*.82,'#3d8fbd');oval(c,r,r,r*.82,r*.82,null,'#7cc2e3',4);for(let i=0;i<10;i++){const a=i*TAU/10;oval(c,r+Math.cos(a)*r*.93,r+Math.sin(a)*r*.93,4,4,FLOWER[i%4]);}oval(c,r,r,r*.36,r*.36,'#b8b39f','#6f6a5a',2);box(c,r-9,r-9,18,18,'#8f8a78',null,3);oval(c,r,r-1,6,6,'#cfcab8','#5d5a4e',1.5);oval(c,r,r+5,9,5,'#a9a593');}
 else if(k==='bandstand'){const r=w/2;shadow(r,r,r,r);ngon(c,r,r,r,8,Math.PI/8);c.fillStyle='#9d978b';c.fill();c.strokeStyle='#5a5649';c.lineWidth=3;c.stroke();ngon(c,r,r,r*.72,8,Math.PI/8);c.fillStyle='#5a7a45';c.fill();for(let i=0;i<14;i++){const a=i*TAU/14;oval(c,r+Math.cos(a)*r*.45,r+Math.sin(a)*r*.45,4,4,FLOWER[i%5]);}oval(c,r,r,6,6,'#c94d6a');}
 else if(k==='toy'){drawToy(c,p,w,h,shadow);}
 else if(k==='aviary'){const r=w/2;shadow(r,r,r,r);oval(c,r,r,r,r,'#6f9a7c55','#2f3d36',3);for(let i=1;i<4;i++)oval(c,r,r,r*i/4,r*i/4,null,'#2f3d36aa',1.5);for(let i=0;i<16;i++){const a=i*TAU/16;line(c,[[r,r],[r+Math.cos(a)*r,r+Math.sin(a)*r]],'#2f3d36aa',1.5);}oval(c,r,r,7,7,'#c9b46a','#5a4a2a',1.5);}
 else if(k==='kiosk'){shadow(w/2,h/2,w/2,h/2);c.beginPath();c.moveTo(0,0);c.lineTo(w,0);c.lineTo(w*.68,h/2);c.lineTo(w*.32,h/2);c.closePath();c.fillStyle='#c76a52';c.fill();c.beginPath();c.moveTo(0,h);c.lineTo(w,h);c.lineTo(w*.68,h/2);c.lineTo(w*.32,h/2);c.closePath();c.fillStyle='#a54e3c';c.fill();c.beginPath();c.moveTo(0,0);c.lineTo(w*.32,h/2);c.lineTo(0,h);c.closePath();c.fillStyle='#b65a46';c.fill();c.beginPath();c.moveTo(w,0);c.lineTo(w*.68,h/2);c.lineTo(w,h);c.closePath();c.fillStyle='#93432f';c.fill();line(c,[[w*.32,h/2],[w*.68,h/2]],'#e1a07f',3);for(let i=0;i<8;i++)box(c,i*w/8,h-7,w/8,10,i%2?'#f4ead2':'#3f7d5c',null,1);}
 else if(k==='shed'){shadow(w/2,h/2,w/2,h/2);box(c,0,0,w,h/2,'#b65a46',null,2);box(c,0,h/2,w,h/2,'#8d4232',null,2);for(let x=6;x<w;x+=9){line(c,[[x,2],[x,h/2-2]],'#cf7a62',1.2);line(c,[[x,h/2+2],[x,h-2]],'#a8513f',1.2);}line(c,[[0,h/2],[w,h/2]],'#e3a183',3);}
 else if(k==='birdhouse'){shadow(w/2,h/2,w/2,h/2);box(c,0,0,w,h,'#5c7f93',null,3);line(c,[[0,h/2],[w,h/2]],'#9cc1d4',2);oval(c,w/2,h*.75,5,4,'#e9d8a3');}
 else if(k==='gazebo'){const r=w/2;shadow(r,r,r,r);ngon(c,r,r,r,8,Math.PI/8);c.fillStyle=p.tone==='green'?'#2f7a5b':'#b44a3c';c.fill();for(let i=0;i<8;i++){const a=Math.PI/8+i*TAU/8;line(c,[[r,r],[r+Math.cos(a)*r,r+Math.sin(a)*r]],p.tone==='green'?'#4f9c79':'#d6705f',2);}oval(c,r,r,5,5,'#e8d9a4');}
 else if(k==='valve'){shadow(w/2,h/2,w/2,h/2);box(c,0,0,w,h,'#4c7a5b','#2b4a37',5);oval(c,w/2,h/2,h*.32,h*.32,null,'#d9483b',4);for(let i=0;i<4;i++){const a=i*TAU/4;line(c,[[w/2,h/2],[w/2+Math.cos(a)*h*.32,h/2+Math.sin(a)*h*.32]],'#d9483b',2.5);}oval(c,w/2,h/2,4,4,'#f0d27a');}
 else if(k==='litter'){shadow(w/2,h/2,w/2,h/2);oval(c,w/2,h/2,w/2,h/2,'#3f6f55','#244536',3);oval(c,w/2,h/2,w*.32,h*.32,'#26352e');oval(c,w*.42,h*.42,5,4,'#d8d0b6');}
 else if(k==='pump'){shadow(w/2,h/2,w/2,h/2);box(c,0,0,w,h,'#7d8c91','#46555b',5);line(c,[[w,h/2],[w+20,h/2]],'#3f8fcf',7);oval(c,w*.35,h/2,h*.26,h*.26,'#e9ecdf','#46555b',2);line(c,[[w*.35,h/2],[w*.35+7,h/2-6]],'#d9483b',2);box(c,w*.62,h*.25,w*.25,h*.5,'#5c6b70',null,3);}
 else if(k==='sampler'){shadow(w/2,h/2,w/2,h/2);box(c,w*.3,0,w*.4,h,'#8a6a43','#5a4228',3);oval(c,w/2,h*.3,9,9,'#f2f2ea','#d9483b',3);line(c,[[w/2,h*.3],[w*.95,h*.95]],'#e7dcc0',1.5);}
 else if(k==='switchbox'){shadow(w/2,h/2,w/2,h/2);box(c,0,0,w,h,'#8f9a9a','#4c5656',4);line(c,[[w/2,3],[w/2,h-3]],'#5f6a6a',1.5);c.fillStyle='#f2c14e';c.beginPath();c.moveTo(w*.62,h*.2);c.lineTo(w*.5,h*.55);c.lineTo(w*.66,h*.52);c.lineTo(w*.56,h*.85);c.lineTo(w*.78,h*.42);c.lineTo(w*.64,h*.45);c.closePath();c.fill();}
 else if(k==='board'){shadow(w/2,h/2,w/2,h/2);box(c,0,0,w,h,'#8a6a43','#5a4228',3);for(let i=0;i<4;i++)box(c,6+i*(w-12)/4,5,(w-12)/4-5,h-10,['#f4ead2','#cfe3f2','#f6d36b','#f2a5c4'][i],null,2);}
 else{box(c,0,0,w,h,'#7b8a6a','#3b4a3a',4);}
 c.restore();return true;
}
const visible=(p,v,margin=160)=>!v||Math.abs(p.x-v.x)<v.w/2+margin&&Math.abs(p.y-v.y)<v.h/2+margin;
export function drawParkAmbient(c,map,time,view){
 const L=map.layout;if(!L)return;
 const xs=L.lake.map(p=>p[0]),ys=L.lake.map(p=>p[1]),lx=(Math.min(...xs)+Math.max(...xs))/2*T,ly=(Math.min(...ys)+Math.max(...ys))/2*T;
 if(visible({x:lx,y:ly},view,600)){c.save();poly(c,L.lake);c.clip();for(let i=0;i<30;i++){const x=(Math.min(...xs)+(i*.37%1)*(Math.max(...xs)-Math.min(...xs)))*T+Math.sin(time/1700+i)*14,y=(Math.min(...ys)+((i*.61)%1)*(Math.max(...ys)-Math.min(...ys)))*T;line(c,[[x-16,y],[x,y-2],[x+20,y]],'#d4eef86b',1.6);}c.restore();}
 for(const p of map.props){if(p.kind!=='park-fountain')continue;const x=(p.x+p.w/2)*T,y=(p.y+p.h/2)*T;if(!visible({x,y},view))continue;const r=p.w/2*T;c.save();for(let i=0;i<3;i++){const k=((time/1400+i/3)%1);oval(c,x,y,r*.4+k*r*.4,r*.4+k*r*.4,null,`rgba(220,244,252,${.55*(1-k)})`,2);}for(let i=0;i<8;i++){const a=i*TAU/8+time/2600;oval(c,x+Math.cos(a)*r*.48,y+Math.sin(a)*r*.48,3,3,'#e6f7fcaa');}c.restore();}
}
// Copas en planta. Se pintan una vez por especie, tono y tamaño en una lámina
// aparte y luego se estampan; el balanceo es un desplazamiento al estampar y el
// desvanecido junto a un personaje, la transparencia de siempre.
const CROWN_STEP=.06,SUPERSAMPLE=1.4;
const canopyCache=new Map();
const PALETTE=[['#2e5d2e','#3f7a3a','#4f8c45','#6ea458','#8fbf6c'],['#1f4a33','#285c3e','#33704a','#4a8a5a','#6aa774'],['#b45d86','#d27aa6','#e79bbf','#f2b8d3','#fde4ef']];
function paintCanopy(c,x,y,r,species,tint){
 const pal=PALETTE[species]||PALETTE[0],rand=seeded(97+species*31+tint*7+Math.round(r));
 if(species===1){for(let layer=0;layer<4;layer++){const rr=r*(1-layer*.22);c.beginPath();for(let i=0;i<18;i++){const a=i*TAU/18+layer*.3,d=i%2?rr*.72:rr;i?c.lineTo(x+Math.cos(a)*d,y+Math.sin(a)*d):c.moveTo(x+Math.cos(a)*d,y+Math.sin(a)*d);}c.closePath();c.fillStyle=pal[layer];c.fill();if(!layer){c.strokeStyle='#15331f';c.lineWidth=1.5;c.stroke();}}oval(c,x,y,r*.12,r*.12,pal[4]);return;}
 oval(c,x,y,r,r,pal[0]);
 for(let i=0;i<7;i++){const a=i*TAU/7+tint,d=r*.5;oval(c,x+Math.cos(a)*d,y+Math.sin(a)*d,r*.5,r*.48,pal[1+(i+tint)%2]);}
 oval(c,x-r*.12,y-r*.14,r*.62,r*.58,pal[2]);
 for(let i=0;i<5;i++){const a=-2.4+i*.5,d=r*.42;oval(c,x+Math.cos(a)*d,y+Math.sin(a)*d,r*.3,r*.28,pal[3]);}
 for(let i=0;i<16;i++){const a=rand()*TAU,d=rand()*r*.75;oval(c,x+Math.cos(a)*d-r*.1,y+Math.sin(a)*d-r*.1,2.4,2.2,pal[4]+(species===2?'':'cc'));}
 oval(c,x,y,r,r,null,species===2?'#8f3f66':'#1d3f1f',1.6);
}
function canopySprite(doc,species,tint,radius){
 const bucket=Math.max(.3,Math.round(radius/CROWN_STEP)*CROWN_STEP),key=species+'/'+tint+'/'+bucket.toFixed(2);
 let sprite=canopyCache.get(key);
 if(sprite!==undefined)return sprite;
 const r=bucket*T,half=Math.ceil(r+4);
 let can=null;
 try{can=doc.createElement('canvas');can.width=Math.ceil(half*2*SUPERSAMPLE);can.height=can.width;}catch{can=null;}
 const ctx=can&&can.getContext?can.getContext('2d'):null;
 if(!ctx||!can.width){canopyCache.set(key,null);return null;}
 ctx.scale(SUPERSAMPLE,SUPERSAMPLE);paintCanopy(ctx,half,half,r,species,tint);
 sprite={can,half};canopyCache.set(key,sprite);return sprite;
}
export function drawParkCanopies(c,map,time,view,actors=[]){
 const doc=c.canvas&&c.canvas.ownerDocument||(typeof document!=='undefined'?document:null);
 for(const [tx,ty,tr,species,tint] of map.trees||[]){
  const x=tx*T,y=ty*T,r=tr*T;
  if(!visible({x,y},view,r+60))continue;
  const fade=actors.some(a=>Math.hypot(a.x-x,a.y-30-y)<r+22);
  const sway=Math.sin(time/2300+x*.017)*1.1;
  const sprite=doc?canopySprite(doc,species,tint,tr):null;
  c.save();c.globalAlpha=fade?.32:1;
  if(sprite)c.drawImage(sprite.can,x-sprite.half+sway,y-sprite.half,sprite.half*2,sprite.half*2);
  else paintCanopy(c,x+sway,y,r,species,tint);
  c.restore();
 }
}
export function drawAnimal(c,a,time){c.save();c.translate(a.x,a.y);c.scale(a.facing||1,1);const step=a.moving?Math.sin(time/(a.species==='squirrel'?90:150)+a.x*.03)*4:0;line(c,[[-6,0],[-7+step,5],[0,5]],'#b69e6a',2);line(c,[[5,0],[6-step,5],[11,5]],'#b69e6a',2);
 if(a.species==='peacock'){for(let i=0;i<7;i++){const angle=-2.6+i*.23,x=-12+Math.cos(angle)*24,y=-20+Math.sin(angle)*27;oval(c,x,y,12,23,['#3e956e','#429a82','#3b8977'][i%3],'#2b655e');oval(c,x,y-11,5,7,'#b9c47b');oval(c,x,y-11,3,4,'#306d8c');}oval(c,0,-12,17,12,'#247d9d','#275566');line(c,[[9,-13],[13,-36]],'#3a92b0',10);oval(c,15,-39,9,8,'#287ca4','#294e63');line(c,[[15,-46],[13,-54],[10,-53]],'#528d84',2);line(c,[[18,-46],[20,-54]],'#528d84',2);box(c,21,-39,8,4,'#d9bd76',null,1);oval(c,18,-41,1.8,2,'#e9e4cc');}
 else if(a.species==='duck'){oval(c,-1,-10,19,12,'#d4d8c2','#5d7c72');oval(c,-5,-10,11,7,'#a7b8a0');oval(c,13,-23,9,10,'#3b886c','#365b53');box(c,18,-24,12,5,'#d7b264','#8e885e',2);oval(c,16,-26,1.7,2,'#233e3c');line(c,[[8,-15],[14,-14]],'#f1e6ba',3);}
 else{c.save();c.rotate(-.25);oval(c,-20,-23,13,24,'#a57550','#68543d');oval(c,-23,-31,9,16,'#bd9466');c.restore();oval(c,0,-10,16,11,'#ba8b5d','#6e5c42');oval(c,13,-24,10,11,'#cda072','#6e5c42');oval(c,10,-36,4,7,'#ba8b5d');oval(c,19,-35,4,6,'#ba8b5d');oval(c,17,-26,2,2,'#2f443b');oval(c,23,-21,3,2,'#5b5140');line(c,[[13,-13],[20,-8]],'#dec096',4);}c.restore();}
