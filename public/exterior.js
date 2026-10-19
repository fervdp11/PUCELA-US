// 15.0 · Exteriores de los cuatro mapas. El entorno continúa fuera del edificio
// y fuera de cámara, sin cuadrados recortados: calles, aceras, edificios,
// aparcamiento, patio, paseo, fuentes y coches circulando.
// Rendimiento: la parte estática se pinta por mosaicos de 512 px del mundo a
// media resolución y se guarda (como mucho 40 mosaicos); por fotograma solo se
// copian los mosaicos visibles y se dibujan los coches que están en pantalla.
import {floorAt,TILE} from './content.js';
const T=TILE,TILE_PX=512,MAX_TILES=40,TAU=Math.PI*2;
const hash=(a,b=0,c=0)=>{let n=(a*374761393+b*668265263+c*1274126177)|0;n=(n^(n>>>13))*1274126177|0;return ((n^(n>>>16))>>>0)/4294967295;};
function seeded(seed){let s=seed>>>0||1;return ()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296;};}
const THEMES={
 school:{ground:'#86a96d',grass2:'#7a9d62',yard:'#c9c3b0',yardLine:'#ffffffb0',walk:'#d8d1bf',curb:'#a59f8e',road:'#4b5560',lane:'#efe7c4',roof:['#b86d58','#9a5f50','#c98e6b','#8f8f86','#a77b5d'],roofEdge:'#5c4639',tree:['#5f9a57','#4e8a4f','#6aa565'],night:false},
 gym:{ground:'#9aa79a',grass2:'#87a07b',yard:'#c5c8c4',yardLine:'#ffffff90',walk:'#cfd2cc',curb:'#9da29b',road:'#4a525b',lane:'#f2ecd0',roof:['#7f93a3','#a08a7a','#6f8577','#b4a58e','#8c7f9c','#94a3a8'],roofEdge:'#3b4852',tree:['#5f9a57','#4f8a59','#6e9f5c'],night:false},
 club:{ground:'#1b1d29',grass2:'#1f2433',yard:'#272a39',yardLine:'#ffffff22',walk:'#2b2e3d',curb:'#3c4054',road:'#14151e',lane:'#a39d74',roof:['#242739','#2a2335','#20283a','#2d2a3f','#1f2231'],roofEdge:'#0c0d16',tree:['#1f3a33','#24402f','#2a3b3c'],night:true,neon:['#ff5fd2','#55e6ff','#c99bff','#ffd36b']},
 park:{ground:'#7fa868',grass2:'#729d5c',yard:'#e2d6bc',yardLine:'#c7b996',walk:'#ddd1b6',curb:'#b4a688',road:'#4a5560',lane:'#f1e9c6',roof:['#c47a5e','#d1a37c','#9d8f84','#b5694f','#e0c69a','#a49a8c'],roofEdge:'#5d4a3e',tree:['#5f9a57','#4e8a4f','#6aa565'],night:false}
};
export const exteriorTheme=id=>THEMES[id]||null;
// ---------------------------------------------------------------------------
// Celdas exteriores: vacío conectado con el borde del mapa (no los huecos
// interiores entre salas, que siguen siendo techo).
const cellCache=new WeakMap();
export function exteriorCells(map){let g=cellCache.get(map);if(g)return g;const W=Math.ceil(map.width),H=Math.ceil(map.height),floor=new Uint8Array(W*H),out=new Uint8Array(W*H);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++)floor[y*W+x]=floorAt(map,(x+.5)*T,(y+.5)*T)?1:0;
 const stack=[];for(let x=0;x<W;x++){stack.push(x,(H-1)*W+x);}for(let y=0;y<H;y++){stack.push(y*W,y*W+W-1);}
 while(stack.length){const i=stack.pop();if(out[i]||floor[i])continue;out[i]=1;const x=i%W,y=(i-x)/W;if(x>0)stack.push(i-1);if(x<W-1)stack.push(i+1);if(y>0)stack.push(i-W);if(y<H-1)stack.push(i+W);}
 g={W,H,out,at:(x,y)=>x<0||y<0||x>=W||y>=H||out[y*W+x]===1};cellCache.set(map,g);return g;}
// ---------------------------------------------------------------------------
// Figuras: rect (con giro), círculo, línea, texto. bbox en píxeles del mundo.
function bboxOf(f){if(f.k==='line'){let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;for(const [x,y] of f.pts){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}const m=f.w/2+4;return [x0-m,y0-m,x1+m,y1+m];}
 if(f.k==='circle'||f.k==='glow'||f.k==='tree'||f.k==='fountain'||f.k==='statue'){const r=f.r+8;return [f.x-r,f.y-r,f.x+r,f.y+r];}
 const r=Math.hypot(f.w,f.h)/2+14;return [f.x-r,f.y-r,f.x+r,f.y+r];}
function rr(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r);}
function paint(c,f,th){
 if(f.k==='line'){c.save();c.lineCap=f.cap||'round';c.lineJoin='round';c.lineWidth=f.w;c.strokeStyle=f.color;if(f.dash)c.setLineDash(f.dash);c.beginPath();f.pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();c.restore();return;}
 if(f.k==='circle'){c.fillStyle=f.color;c.beginPath();c.arc(f.x,f.y,f.r,0,TAU);c.fill();if(f.stroke){c.strokeStyle=f.stroke;c.lineWidth=f.sw||3;c.stroke();}return;}
 if(f.k==='glow'){const g=c.createRadialGradient(f.x,f.y,0,f.x,f.y,f.r);g.addColorStop(0,f.color);g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(f.x-f.r,f.y-f.r,f.r*2,f.r*2);return;}
 if(f.k==='tree'){c.fillStyle='#10201a40';c.beginPath();c.ellipse(f.x+f.r*.25,f.y+f.r*.35,f.r*1.02,f.r*.8,0,0,TAU);c.fill();c.fillStyle=f.color;c.beginPath();c.arc(f.x,f.y,f.r,0,TAU);c.fill();c.strokeStyle='#0b1820aa';c.lineWidth=2.5;c.stroke();c.fillStyle='#ffffff22';c.beginPath();c.arc(f.x-f.r*.3,f.y-f.r*.32,f.r*.45,0,TAU);c.fill();return;}
 if(f.k==='fountain'){const r=f.r;c.fillStyle='#b9b09a';c.beginPath();c.arc(f.x,f.y,r,0,TAU);c.fill();c.strokeStyle='#0b1820aa';c.lineWidth=3;c.stroke();c.fillStyle='#4f9fc9';c.beginPath();c.arc(f.x,f.y,r*.8,0,TAU);c.fill();c.fillStyle='#8fd0ec66';c.beginPath();c.arc(f.x-r*.2,f.y-r*.25,r*.42,0,TAU);c.fill();c.fillStyle='#cfc6ae';c.beginPath();c.arc(f.x,f.y,r*.3,0,TAU);c.fill();c.stroke();paint(c,{k:'statue',x:f.x,y:f.y-4,r:r*.26},th);return;}
 if(f.k==='statue'){const r=f.r;c.fillStyle='#00000033';c.beginPath();c.ellipse(f.x+r*.5,f.y+r*.5,r*1.1,r*.7,0,0,TAU);c.fill();c.fillStyle='#a9a395';rr(c,f.x-r,f.y-r*.2,r*2,r*1.2,3);c.fill();c.strokeStyle='#0b1820aa';c.lineWidth=2;c.stroke();
  // Figura de bronce sobre el pedestal (vista cenital).
  c.fillStyle='#6f7d6d';c.beginPath();c.ellipse(f.x,f.y-r*.65,r*.55,r*.75,0,0,TAU);c.fill();c.stroke();c.beginPath();c.arc(f.x,f.y-r*1.35,r*.32,0,TAU);c.fill();c.stroke();c.fillStyle='#93a08f';c.beginPath();c.arc(f.x-r*.12,f.y-r*1.45,r*.12,0,TAU);c.fill();return;}
 if(f.k==='text'){c.fillStyle=f.color;c.font=`900 ${f.size}px Segoe UI`;c.textAlign='center';c.textBaseline='middle';c.fillText(f.text,f.x,f.y);return;}
 // Rectángulos (edificios, coches aparcados, bancos, plazas…), con giro opcional.
 c.save();c.translate(f.x,f.y);if(f.a)c.rotate(f.a);const w=f.w,h=f.h,x=-w/2,y=-h/2;
 if(f.k==='building'){c.fillStyle='#0b182040';rr(c,x+10,y+12,w,h,6);c.fill();c.fillStyle=f.color;rr(c,x,y,w,h,6);c.fill();c.lineWidth=3;c.strokeStyle=th.roofEdge;c.stroke();
  c.strokeStyle='#ffffff26';c.lineWidth=2;rr(c,x+7,y+7,w-14,h-14,4);c.stroke();
  const rnd=seeded(f.seed||1);for(let i=0;i<Math.max(1,Math.round(w*h/9000));i++){const ux=x+14+rnd()*(w-44),uy=y+14+rnd()*(h-40);c.fillStyle=th.night?'#3a3f55':'#c9cdc6';rr(c,ux,uy,22+rnd()*10,16,3);c.fill();c.strokeStyle='#0b182088';c.lineWidth=1.5;c.stroke();}
  if(th.night){const neon=th.neon[(f.seed||0)%th.neon.length];c.strokeStyle=neon;c.globalAlpha=.85;c.lineWidth=3;rr(c,x+4,y+4,w-8,h-8,5);c.stroke();c.globalAlpha=.18;c.lineWidth=12;c.stroke();c.globalAlpha=1;}
  else if((f.seed||0)%3===0){c.fillStyle='#8fc1cf88';rr(c,x+w*.55,y+h*.2,w*.3,h*.25,3);c.fill();}
  c.restore();return;}
 if(f.k==='car'){paintCar(c,0,0,w,h,f.color,th,false);c.restore();return;}
 if(f.k==='bench'){c.fillStyle='#7d5a3a';rr(c,x,y,w,h,3);c.fill();c.fillStyle='#c79a66';c.fillRect(x+2,y+2,w-4,h*.28);c.fillRect(x+2,y+h*.58,w-4,h*.28);c.restore();return;}
 c.fillStyle=f.color;rr(c,x,y,w,h,f.r||0);c.fill();if(f.stroke){c.strokeStyle=f.stroke;c.lineWidth=f.sw||2;c.stroke();}c.restore();
}
function paintCar(c,x,y,w,h,color,th,lights){c.fillStyle='#00000040';rr(c,x-w/2+4,y-h/2+5,w,h,9);c.fill();c.fillStyle=color;rr(c,x-w/2,y-h/2,w,h,9);c.fill();c.strokeStyle='#0b1820cc';c.lineWidth=2.5;c.stroke();
 // El coche está orientado a lo largo de su eje mayor (w).
 c.fillStyle=th.night?'#6d86a8':'#a9d2dd';rr(c,x+w*.08,y-h/2+5,w*.22,h-10,4);c.fill();rr(c,x-w*.36,y-h/2+6,w*.16,h-12,4);c.fill();
 c.fillStyle='#ffffff30';rr(c,x-w*.12,y-h/2+6,w*.18,h-12,3);c.fill();
 if(lights){c.fillStyle='#fff3c0';c.fillRect(x+w/2-4,y-h/2+3,4,6);c.fillRect(x+w/2-4,y+h/2-9,4,6);c.fillStyle='#ff6060';c.fillRect(x-w/2,y-h/2+3,3,6);c.fillRect(x-w/2,y+h/2-9,3,6);}}
// ---------------------------------------------------------------------------
// Generación por mapa (coordenadas en baldosas → píxeles).
const P=v=>v*T;
let ROADS=null;
function road(F,pts,width,th,{markings=true,walk=1.1}={}){const px=pts.map(([x,y])=>[P(x),P(y)]);ROADS?.push({px,half:P(width/2+walk+.25)});
 if(walk)F.push({k:'line',pts:px,w:P(width+walk*2),color:th.walk,cap:'square'},{k:'line',pts:px,w:P(width+.28),color:th.curb,cap:'square'});
 F.push({k:'line',pts:px,w:P(width),color:th.road,cap:'square'});
 if(markings)F.push({k:'line',pts:px,w:5,color:th.lane,dash:[34,30],cap:'butt'});
 return px;}
function addLoopCars(cars,path,n,th,seed,speed=150){const rnd=seeded(seed);for(let i=0;i<n;i++)cars.push({path,offset:rnd(),speed:speed*(.75+rnd()*.5),lane:i%2?1:-1,color:['#d9534f','#4f7fd9','#e8c25a','#e8ece6','#3f4a55','#5fb37b','#9b6fd1'][Math.floor(rnd()*7)]});}
function buildingsAlong(F,path,side,from,depth,th,seed){// path en px, coloca manzanas a un lado
 const rnd=seeded(seed);for(let i=1;i<path.length;i++){const [ax,ay]=path[i-1],[bx,by]=path[i],len=Math.hypot(bx-ax,by-ay);if(len<1)continue;const ux=(bx-ax)/len,uy=(by-ay)/len,nx=-uy*side,ny=ux*side,a=Math.atan2(uy,ux);
  let s=rnd()*P(1.5);while(s<len-P(2)){const w=P(4+rnd()*4.5),d=P(depth*(.6+rnd()*.5)),cx=ax+ux*(s+w/2),cy=ay+uy*(s+w/2),off=P(from)+d/2;F.push({k:'building',x:cx+nx*off,y:cy+ny*off,w,h:d,a,color:th.roof[Math.floor(rnd()*th.roof.length)],seed:Math.floor(rnd()*1e6)});
   // a veces una segunda fila más atrás
   if(rnd()<.8){const w2=P(4+rnd()*5),d2=P(depth*(.6+rnd()*.5)),off2=P(from)+d+P(1.2)+d2/2;F.push({k:'building',x:cx+nx*off2,y:cy+ny*off2,w:w2,h:d2,a,color:th.roof[Math.floor(rnd()*th.roof.length)],seed:Math.floor(rnd()*1e6)});}
   s+=w+P(.8+rnd()*1.6);}}}
function rectCity(map,th,id){const F=[],cars=[],W=map.width,H=map.height,M=2.3,E=40;// carretera de circunvalación
 const ring=[[-M,-M],[W+M,-M],[W+M,H+M],[-M,H+M],[-M,-M]];
 // Calles que se prolongan más allá del encuadre en las cuatro direcciones.
 for(const pts of [[[-E,-M],[W+E,-M]],[[-E,H+M],[W+E,H+M]],[[-M,-E],[-M,H+E]],[[W+M,-E],[W+M,H+E]]])road(F,pts,2.6,th);
 // Pasos de cebra en las esquinas.
 for(const [cx,cy] of [[-M,-M],[W+M,-M],[W+M,H+M],[-M,H+M]])for(const [dx,dy] of [[3,0],[-3,0],[0,3],[0,-3]]){const horizontal=dx!==0;for(let k=-2;k<=2;k++)F.push({k:'rect',x:P(cx+dx)+(horizontal?0:k*13),y:P(cy+dy)+(horizontal?k*13:0),w:horizontal?P(.5):8,h:horizontal?8:P(.5),color:'#ffffffb0'});}
 // Manzanas al otro lado de las calles.
 const out=(pts,side,seed)=>buildingsAlong(F,pts.map(([x,y])=>[P(x),P(y)]),side,2.6,7,th,seed);
 out([[-E,-M],[W+E,-M]],-1,11);out([[W+E,H+M],[-E,H+M]],-1,12);out([[-M,H+E],[-M,-E]],-1,13);out([[W+M,-E],[W+M,H+E]],-1,14);
 // Farolas a lo largo de la acera.
 for(const [ax,ay,bx,by] of [[-E,-M-1.75,W+E,-M-1.75],[-E,H+M+1.75,W+E,H+M+1.75],[-M-1.75,-E,-M-1.75,H+E],[W+M+1.75,-E,W+M+1.75,H+E]]){const len=Math.hypot(bx-ax,by-ay);for(let s=0;s<len;s+=7){const x=ax+(bx-ax)*s/len,y=ay+(by-ay)*s/len;if(th.night)F.push({k:'glow',x:P(x),y:P(y),r:P(2.3),color:'rgba(255,214,140,.30)'});F.push({k:'circle',x:P(x),y:P(y),r:6,color:'#3a454c',stroke:th.night?'#ffe6a8':'#c9d1c7',sw:3});}}
 addLoopCars(cars,ring.map(([x,y])=>[P(x),P(y)]),id==='club'?10:9,th,id.length*97);
 return {F,cars};}
function schoolGrounds(F,map,th){const W=map.width,H=map.height;
 // Acera y plaza de entrada delante de la puerta principal (recepción, muro norte).
 F.push({k:'rect',x:P(W/2),y:P(1.5),w:P(W-1),h:P(2.4),color:th.walk});
 F.push({k:'rect',x:P(60.5),y:P(1.4),w:P(6),h:P(2.6),r:10,color:'#e3dccb',stroke:'#b9b09a',sw:3});
 F.push({k:'rect',x:P(60.5),y:P(-1),w:P(3.2),h:P(2.6),color:'#e3dccb'});
 for(const x of [57.6,63.4])F.push({k:'circle',x:P(x),y:P(1.4),r:P(.55),color:'#5f9a57',stroke:'#0b1820aa',sw:2});
 // Patio de recreo (abajo a la izquierda): pista con líneas, canastas, bancos y árboles.
 F.push({k:'rect',x:P(16.5),y:P(38.5),w:P(27),h:P(20),r:14,color:th.yard,stroke:'#a8a18e',sw:4});
 F.push({k:'rect',x:P(15.5),y:P(38.5),w:P(18),h:P(10),color:'#c46f55',stroke:'#ffffffd0',sw:4});
 F.push({k:'line',pts:[[P(15.5),P(33.5)],[P(15.5),P(43.5)]],w:4,color:'#ffffffd0'});
 F.push({k:'circle',x:P(15.5),y:P(38.5),r:P(1.6),color:'rgba(0,0,0,0)',stroke:'#ffffffd0',sw:4});
 for(const x of [7,24])F.push({k:'rect',x:P(x),y:P(38.5),w:P(.5),h:P(3),color:'#ffffffd0'});
 for(const x of [4.5,26.5])F.push({k:'rect',x:P(x),y:P(38.5),w:P(.5),h:P(1.6),color:'#3a4a55',stroke:'#e9eef0',sw:2});
 for(const [x,y] of [[6,30.5],[12,30.5],[20,30.5],[26,30.5]])F.push({k:'bench',x:P(x),y:P(y),w:P(1.6),h:P(.6)});
 for(const [x,y,r] of [[4,29.5,1.3],[29.5,30,1.4],[4,47.5,1.5],[29.5,47.5,1.3],[16,47.7,1.2],[10,47.6,1.1],[22,47.8,1.1]])F.push({k:'tree',x:P(x),y:P(y),r:P(r),color:th.tree[(x|0)%3]});
 // Aparcamiento (abajo a la derecha): plazas pintadas y coches aparcados.
 F.push({k:'rect',x:P(57),y:P(38.5),w:P(20),h:P(20),r:10,color:'#59626b',stroke:'#9aa29b',sw:4});
 const rnd=seeded(77);for(let row=0;row<3;row++){const y=31+row*6.2;for(let i=0;i<8;i++){const x=48.4+i*2.3;F.push({k:'line',pts:[[P(x-1.15),P(y-1.4)],[P(x-1.15),P(y+1.4)]],w:4,color:'#f3f0e3d0'});if(rnd()<.62)F.push({k:'car',x:P(x),y:P(y),w:P(2.2),h:P(1.05),a:Math.PI/2,color:['#d9534f','#4f7fd9','#e8c25a','#e8ece6','#3f4a55','#5fb37b'][Math.floor(rnd()*6)]});}}
 F.push({k:'text',x:P(57),y:P(47.6),text:'P',size:44,color:'#f3f0e3'});
 // Valla del recinto escolar.
 F.push({k:'line',pts:[[P(.3),P(.3)],[P(W-.3),P(.3)],[P(W-.3),P(H-.3)],[P(.3),P(H-.3)],[P(.3),P(.3)]],w:5,color:'#4f5d61',dash:[16,8],cap:'butt'});
}
function offsetChain(poly,chain,d){// desplaza una cadena del contorno hacia fuera (baldosas)
 const inside=(x,y)=>{let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
 const normals=[];for(let i=1;i<chain.length;i++){const [ax,ay]=chain[i-1],[bx,by]=chain[i],len=Math.hypot(bx-ax,by-ay)||1;let nx=(by-ay)/len,ny=-(bx-ax)/len;const mx=(ax+bx)/2,my=(ay+by)/2;if(inside(mx+nx*.2,my+ny*.2)){nx=-nx;ny=-ny;}normals.push([nx,ny]);}
 return chain.map((p,i)=>{const a=normals[Math.max(0,i-1)],b=normals[Math.min(normals.length-1,i)];let nx=a[0]+b[0],ny=a[1]+b[1];const l=Math.hypot(nx,ny)||1;nx/=l;ny/=l;const k=Math.min(2,1/Math.max(.5,(nx*b[0]+ny*b[1])));return [p[0]+nx*d*k,p[1]+ny*d*k];});}
function parkCity(map,th){const F=[],cars=[],fence=map.layout?.fence||[];if(!fence.length)return {F,cars};
 // Carretera arriba y a la derecha (con coches), paseo abajo y a la izquierda.
 const top=[[-30,-1.4],[2,-1.1],[36.75,-1.8],[40.5,-1.7],[72,.6],[77.6,3],[78.4,7.5],[77.2,19],[73.3,29],[69.6,38.5],[67.2,44],[66.2,60],[65.6,80]];
 const roadPx=road(F,top,2.8,th);
 // Paso de peatones frente a la puerta norte del paseo central.
 for(let k=0;k<6;k++)F.push({k:'rect',x:P(36.3+k*.55),y:P(-1.75),w:10,h:P(2.5),color:'#ffffffc0'});
 buildingsAlong(F,roadPx.slice(0,6),-1,2.9,7,th,21);buildingsAlong(F,roadPx.slice(4),-1,2.9,7,th,22);
 // Paseo exterior: abajo y a la izquierda, siguiendo la verja.
 const bottomLeft=fence.slice(fence.findIndex(p=>p[0]===61.8&&p[1]===44.9));bottomLeft.push(fence[0]);
 const paseo=offsetChain(fence,bottomLeft,1.9).map(([x,y])=>[P(x),P(y)]);
 F.push({k:'line',pts:paseo,w:P(3.4),color:th.curb},{k:'line',pts:paseo,w:P(3.1),color:th.yard});
 for(let i=1;i<paseo.length;i++){const [ax,ay]=paseo[i-1],[bx,by]=paseo[i],len=Math.hypot(bx-ax,by-ay);for(let s=P(2);s<len;s+=P(4.5)){const x=ax+(bx-ax)*s/len,y=ay+(by-ay)*s/len,ux=(bx-ax)/len,uy=(by-ay)/len;F.push({k:'bench',x:x-uy*P(1.15),y:y+ux*P(1.15),w:P(1.3),h:P(.5),a:Math.atan2(uy,ux)});}}
 // Arbolado y manzanas más allá del paseo.
 const trees=offsetChain(fence,bottomLeft,4.4),rnd=seeded(9);for(let i=1;i<trees.length;i++){const [ax,ay]=trees[i-1],[bx,by]=trees[i],len=Math.hypot(bx-ax,by-ay);for(let s=0;s<len;s+=2.4)F.push({k:'tree',x:P(ax+(bx-ax)*s/len),y:P(ay+(by-ay)*s/len),r:P(.85+rnd()*.35),color:th.tree[Math.floor(rnd()*3)]});}
 const back=offsetChain(fence,bottomLeft,5.6).map(([x,y])=>[P(x),P(y)]);buildingsAlong(F,back,1,.4,6,th,23);buildingsAlong(F,back,-1,.4,6,th,24);
 // Fuente con estatua (esquina inferior derecha) y estatua aislada (superior izquierda).
 F.push({k:'circle',x:P(62.5),y:P(49.2),r:P(2.4),color:th.yard,stroke:th.curb,sw:4},{k:'fountain',x:P(62.5),y:P(49.2),r:P(1.55)});
 F.push({k:'circle',x:P(-.7),y:P(2.3),r:P(1.6),color:th.yard,stroke:th.curb,sw:4},{k:'statue',x:P(-.7),y:P(2.5),r:P(.55)});
 cars.push(...[0,1,2,3,4,5,6,7].map(i=>({path:roadPx,offset:i/8+.03*i,speed:130+(i%3)*30,lane:i%2?1:-1,color:['#d9534f','#4f7fd9','#e8c25a','#e8ece6','#3f4a55','#5fb37b','#9b6fd1','#e27d3e'][i],open:true})));
 return {F,cars};}
const sceneCache=new Map();
function sceneFor(map){const key=`${map.worldId}/${map.floor??0}`;let s=sceneCache.get(key);if(s)return s;const th=THEMES[map.worldId];if(!th)return null;
 ROADS=[];const built=map.worldId==='park'?parkCity(map,th):rectCity(map,th,map.worldId);if(map.worldId==='school')schoolGrounds(built.F,map,th);const roads=ROADS;ROADS=null;
 // Las figuras grandes primero (suelos), luego edificios y detalles.
 const order={line:0,rect:1,circle:2,bench:3,car:3,building:4,tree:5,glow:6,fountain:5,statue:5,text:7};built.F.sort((a,b)=>(order[a.k]??3)-(order[b.k]??3));
 // Nada se monta sobre una calle ni sobre otro edificio.
 const segDist=(x,y,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t);};
 const onRoad=(x,y,m=0)=>roads.some(r=>r.px.some((b,i)=>i&&segDist(x,y,r.px[i-1],b)<r.half+m));
 const corners=f=>{const c=Math.cos(f.a||0),sn=Math.sin(f.a||0),pts=[];for(const [u,v] of [[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5],[0,0],[0,-.5],[0,.5],[-.5,0],[.5,0]]){const x=u*f.w,y=v*f.h;pts.push([f.x+x*c-y*sn,f.y+x*sn+y*c]);}return pts;};
 const fence=map.worldId==='park'?(map.layout?.fence||[]).map(([x,y])=>[P(x),P(y)]):null;
 const insideSite=(x,y)=>{if(!fence)return x>-8&&y>-8&&x<map.width*T+8&&y<map.height*T+8;let yes=false;for(let i=0,j=fence.length-1;i<fence.length;j=i++){const a=fence[i],b=fence[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes||fence.some((b,i)=>segDist(x,y,fence[(i||fence.length)-1],b)<P(4.2));};
 const placed=[];built.F=built.F.filter(f=>{if(f.k==='building'){if(corners(f).some(([x,y])=>onRoad(x,y)||insideSite(x,y)))return false;const b=bboxOf(f),pad=6;if(placed.some(q=>b[0]<q[2]-pad&&b[2]>q[0]+pad&&b[1]<q[3]-pad&&b[3]>q[1]+pad&&corners(f).some(([x,y])=>{const c=Math.cos(-(q.f.a||0)),sn=Math.sin(-(q.f.a||0)),dx=x-q.f.x,dy=y-q.f.y,lx=dx*c-dy*sn,ly=dx*sn+dy*c;return Math.abs(lx)<q.f.w/2+4&&Math.abs(ly)<q.f.h/2+4;})))return false;placed.push([...b.slice(0,4)]);placed[placed.length-1].f=f;return true;}
  if(f.k==='tree')return !onRoad(f.x,f.y,f.r);return true;});
 for(const f of built.F)f.bb=bboxOf(f);
 for(const car of built.cars){const p=car.path,lens=[0];for(let i=1;i<p.length;i++)lens.push(lens[i-1]+Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]));car.lens=lens;car.total=lens[lens.length-1];}
 s={th,F:built.F,cars:built.cars,tiles:new Map(),order:[]};sceneCache.set(key,s);return s;}
function paintArea(c,scene,x0,y0,w,h,seedX=0,seedY=0){const th=scene.th;c.fillStyle=th.ground;c.fillRect(x0,y0,w,h);
 const blobs=Math.max(1,Math.round(w*h/(TILE_PX*TILE_PX)*10));for(let i=0;i<blobs;i++){const r=hash(seedX,seedY,i);c.fillStyle=th.grass2+'66';c.beginPath();c.ellipse(x0+hash(seedX,seedY,i+20)*w,y0+hash(seedX,seedY,i+40)*h,30+r*60,20+r*40,r*3,0,TAU);c.fill();}
 for(const f of scene.F){const b=f.bb;if(b[0]>x0+w||b[2]<x0||b[1]>y0+h||b[3]<y0)continue;paint(c,f,th);}}
// Exterior dentro del rectángulo del mapa: se pinta una vez en la lámina
// estática del mapa (solo en las celdas exteriores o fuera de la verja).
export function paintExteriorInto(c,map,clipCells=true){const scene=sceneFor(map);if(!scene)return false;const W=map.width*T,H=map.height*T;c.save();
 if(clipCells){const g=exteriorCells(map);c.beginPath();for(let y=0;y<g.H;y++){let x=0;while(x<g.W){if(!g.out[y*g.W+x]){x++;continue;}let x1=x;while(x1+1<g.W&&g.out[y*g.W+x1+1])x1++;c.rect(x*T,y*T,(x1-x+1)*T,T);x=x1+1;}}c.clip();}
 paintArea(c,scene,0,0,W,H,7,7);c.restore();return true;}
function tileCanvas(scene,tx,ty,k){const key=`${tx},${ty},${k}`;let t=scene.tiles.get(key);if(t){const i=scene.order.indexOf(key);if(i>=0){scene.order.splice(i,1);scene.order.push(key);}return t;}
 const size=Math.ceil(TILE_PX*k),can=typeof OffscreenCanvas==='function'?new OffscreenCanvas(size,size):Object.assign(document.createElement('canvas'),{width:size,height:size}),c=can.getContext('2d'),x0=tx*TILE_PX,y0=ty*TILE_PX,th=scene.th;
 c.scale(k,k);c.translate(-x0,-y0);paintArea(c,scene,x0,y0,TILE_PX,TILE_PX,tx,ty);
 scene.tiles.set(key,can);scene.order.push(key);while(scene.order.length>MAX_TILES){const old=scene.order.shift();scene.tiles.delete(old);}return can;}
// Copia solo la parte del mosaico que queda fuera del mapa y dentro de la vista.
function blitOutside(c,img,x0,y0,k,map,view){const W=map.width*T,H=map.height*T,vx0=view.x-view.w/2-4,vy0=view.y-view.h/2-4,vx1=view.x+view.w/2+4,vy1=view.y+view.h/2+4,x1=x0+TILE_PX,y1=y0+TILE_PX;
 const part=(a,b,cx,d)=>{const ax=Math.max(a,x0,vx0),ay=Math.max(b,y0,vy0),bx=Math.min(cx,x1,vx1),by=Math.min(d,y1,vy1);if(bx-ax<1||by-ay<1)return;c.drawImage(img,(ax-x0)*k,(ay-y0)*k,(bx-ax)*k,(by-ay)*k,ax,ay,bx-ax,by-ay);};
 part(-Infinity,-Infinity,Infinity,0);part(-Infinity,H,Infinity,Infinity);part(-Infinity,0,0,H);part(W,0,Infinity,H);}
function tileNeeded(scene,map,tx,ty){const key=tx+','+ty;scene.need??=new Map();let v=scene.need.get(key);if(v!==undefined)return v;
 const x0=tx*TILE_PX,y0=ty*TILE_PX,x1=x0+TILE_PX,y1=y0+TILE_PX,W=map.width*T,H=map.height*T;
 // Dentro del rectángulo del mapa el exterior ya está en la lámina estática.
 v=x0<0||y0<0||x1>W||y1>H;
 scene.need.set(key,v);return v;}
function carAt(car,time){const d=((car.offset*car.total+time/1000*car.speed)%car.total+car.total)%car.total,L=car.lens,p=car.path;let i=1;while(i<L.length-1&&L[i]<d)i++;const f=(d-L[i-1])/Math.max(1e-6,L[i]-L[i-1]),ax=p[i-1][0],ay=p[i-1][1],bx=p[i][0],by=p[i][1],ux=(bx-ax)/Math.max(1e-6,L[i]-L[i-1]),uy=(by-ay)/Math.max(1e-6,L[i]-L[i-1]);return {x:ax+(bx-ax)*f-uy*car.lane*P(.62),y:ay+(by-ay)*f+ux*car.lane*P(.62),a:Math.atan2(uy,ux)+(car.lane<0?Math.PI:0)};}
// Dibuja el exterior que cabe en la vista (coordenadas del mundo ya aplicadas).
export function drawExterior(c,map,view,time,{quality=1,reduced=false}={}){const scene=sceneFor(map);if(!scene)return false;const k=quality<1?.4:.5,x0=Math.floor((view.x-view.w/2-40)/TILE_PX),x1=Math.floor((view.x+view.w/2+40)/TILE_PX),y0=Math.floor((view.y-view.h/2-40)/TILE_PX),y1=Math.floor((view.y+view.h/2+40)/TILE_PX);
 // Solo los mosaicos que de verdad asoman: los que quedan enteros bajo el
 // edificio (opaco en la lámina del mapa) no se copian.
 const smooth=c.imageSmoothingEnabled;c.imageSmoothingEnabled=true;for(let ty=y0;ty<=y1;ty++)for(let tx=x0;tx<=x1;tx++)if(tileNeeded(scene,map,tx,ty))blitOutside(c,tileCanvas(scene,tx,ty,k),tx*TILE_PX,ty*TILE_PX,k,map,view);c.imageSmoothingEnabled=smooth;
return true;}
// Coches en circulación: después de la lámina del mapa (van por calles, nunca sobre el edificio).
export function drawExteriorCars(c,map,view,time,{reduced=false}={}){const scene=sceneFor(map);if(!scene)return;
 const t=reduced?0:time;for(const car of scene.cars){const p=carAt(car,t);if(Math.abs(p.x-view.x)>view.w/2+80||Math.abs(p.y-view.y)>view.h/2+80)continue;c.save();c.translate(p.x,p.y);c.rotate(p.a);
  if(scene.th.night){const g=c.createLinearGradient(30,0,150,0);g.addColorStop(0,'rgba(255,240,190,.35)');g.addColorStop(1,'rgba(255,240,190,0)');c.fillStyle=g;c.beginPath();c.moveTo(30,-12);c.lineTo(150,-46);c.lineTo(150,46);c.lineTo(30,12);c.closePath();c.fill();}
  paintCar(c,0,0,P(2.1),P(1),car.color,scene.th,true);c.restore();}
 return true;}
// Puerta principal del colegio, pintada sobre la cara del muro norte de
// recepción (no es transitable: el suelo no cambia).
export function drawSchoolMainDoor(c,map){if(map.worldId!=='school'||map.floor>0)return;const cx=P(60.5),base=P(3),h=58,w=128;
 c.save();c.fillStyle='#6d5442';c.fillRect(cx-w/2-8,base-h-8,w+16,h+8);c.fillStyle='#2b3d48';c.fillRect(cx-w/2,base-h,w,h);
 for(const s of [-1,1]){const x=s<0?cx-w/2+3:cx+3;c.fillStyle='#9fd3df';c.fillRect(x,base-h+4,w/2-6,h-6);c.fillStyle='#ffffff55';c.fillRect(x+5,base-h+7,8,h-14);c.fillStyle='#c9ced0';c.fillRect(s<0?cx-14:cx+6,base-h*.55,8,3);}
 c.fillStyle='#3a2c24';c.fillRect(cx-1.5,base-h,3,h);c.fillStyle='#e9d9a8';c.fillRect(cx-46,base-h-24,92,16);c.fillStyle='#2f4a3e';c.font='900 11px Segoe UI';c.textAlign='center';c.textBaseline='middle';c.fillText('ENTRADA',cx,base-h-16);c.restore();}
