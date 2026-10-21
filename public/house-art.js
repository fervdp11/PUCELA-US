// Arte original de Latasa´s House. Cada mueble se levanta desde su huella
// física (la misma que usan las colisiones) con cara superior, cara frontal,
// contorno oscuro grueso, brillo y sombra de contacto.
const T=56,TAU=Math.PI*2,INK='#1d1a20';
const rr=(c,x,y,w,h,r)=>{r=Math.max(0,Math.min(r,w/2,h/2));c.beginPath();c.roundRect(x,y,w,h,r);};
function fill(c,col,lw=2.6){c.fillStyle=col;c.fill();if(lw){c.lineWidth=lw;c.strokeStyle=INK;c.lineJoin='round';c.stroke();}}
function box(c,x,y,w,h,r,col,lw=2.6){rr(c,x,y,w,h,r);fill(c,col,lw);}
function oval(c,x,y,rx,ry,col,lw=0){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);fill(c,col,lw);}
function line(c,pts,col,w=2){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=col;c.lineWidth=w;c.lineCap='round';c.lineJoin='round';c.stroke();}
function dark(hex,k=.72){const n=parseInt(hex.slice(1),16);return '#'+[n>>16,n>>8&255,n&255].map(v=>Math.round(v*k).toString(16).padStart(2,'0')).join('');}
function light(hex,k=.25){const n=parseInt(hex.slice(1),16);return '#'+[n>>16,n>>8&255,n&255].map(v=>Math.round(v+(255-v)*k).toString(16).padStart(2,'0')).join('');}
// Volumen: frente de altura z y tapa desplazada hacia arriba.
function block(c,w,h,z,col,{r=6,front=null}={}){box(c,0,h-z,w,z,Math.min(r,4),front||dark(col,.72));box(c,0,-z,w,h,r,col);c.save();rr(c,3,-z+3,w-6,Math.min(10,h*.3),r);c.fillStyle='rgba(255,255,255,.2)';c.fill();c.restore();}
export const HOUSE_HEIGHT={wardrobe:44,fridge:46,bookshelf:46,shelf:44,arcade:40,coatrack:44,lamp:44,ladder:38,washer:28,dryer:28,counter:24,stove:24,island:24,workbench:24,sideboard:22,cabinet:22,piano:28,dresser:22,desk:18,'dining-table':16,pingpong:16,toilet:18,washbasin:22,car:30,bunk:44,bed:12,sofa:18,armchair:18,bathtub:16,nightstand:14,toychest:14,beanbag:12,coffee:10,boxes:22,bike:16,basket:12,ironing:18,bin:16,tv:34,console:20,domotica:32,fusebox:34,plant:26};
export function houseHeight(kind){return HOUSE_HEIGHT[kind.slice(6)]??14;}
function shadowUnder(c,w,h){c.fillStyle='rgba(20,14,10,.26)';c.beginPath();c.ellipse(w*.52,h*.62+6,w*.56,h*.48+6,0,0,TAU);c.fill();}
export function drawHouseProp(c,p){if(typeof p.kind!=='string'||!p.kind.startsWith('house-'))return false;const k=p.kind.slice(6),x=p.x*T,y=p.y*T,w=p.w*T,h=p.h*T,z=houseHeight(p.kind);
 if(['rug','tiles','mat','oilstain','toys'].includes(k)){drawHouseFlat(c,p);return true;}
 c.save();c.translate(x,y);shadowUnder(c,w,h);
 switch(k){
 case 'car':{const col='#c94a4a';box(c,2,2,w-4,h-4,22,dark(col,.65));box(c,0,-z+4,w,h-6,24,col);box(c,w*.12,-z+h*.2,w*.76,h*.22,10,'#7fb6cf');box(c,w*.14,-z+h*.62,w*.72,h*.16,8,'#6aa2bd');box(c,w*.16,-z+h*.4,w*.68,h*.2,8,light(col,.15));for(const [xx,yy] of [[-4,h*.15],[w-10,h*.15],[-4,h*.7],[w-10,h*.7]])box(c,xx,yy-z+6,14,h*.14,4,'#222');for(const xx of [w*.18,w*.7])box(c,xx,-z+6,w*.12,7,3,'#f7e8a6');for(const xx of [w*.18,w*.7])box(c,xx,h-z-6,w*.12,6,3,'#e2574f');break;}
 case 'workbench':{block(c,w,h,z,'#a77446');line(c,[[8,h-z+6],[8,h]],INK,3);line(c,[[w-8,h-z+6],[w-8,h]],INK,3);box(c,w*.08,-z-16,w*.84,14,3,'#6c7a80');for(let i=0;i<6;i++)line(c,[[w*.14+i*w*.12,-z-13],[w*.14+i*w*.12,-z-4]],['#e8c56a','#d55a4a','#5a8fd5'][i%3],3);box(c,w*.55,-z+4,w*.22,h*.4,4,'#cfd5d0');break;}
 case 'shelf':case 'bookshelf':{block(c,w,h,z,k==='shelf'?'#8d8f86':'#8f5d3a');const rows=4;for(let i=0;i<rows;i++){const yy=-z+6+i*(h-6)/rows;line(c,[[3,yy],[w-3,yy]],INK,2);for(let j=0;j<3;j++)box(c,4+j*(w-8)/3,yy+2,(w-8)/3-2,(h-6)/rows-5,2,['#d65b4c','#5a8bd1','#e4c15a','#69a96a'][(i+j)%4],1.6);}break;}
 case 'boxes':{block(c,w*.62,h,z,'#c99a5b');c.save();c.translate(w*.4,h*.25);block(c,w*.6,h*.7,z*.7,'#d8ab6c');c.restore();line(c,[[w*.31,-z],[w*.31,h-z]],'#a8794a',3);break;}
 case 'bike':{for(const xx of [w*.18,w*.82]){c.beginPath();c.arc(xx,h*.4-z*.4,h*.55,0,TAU);c.lineWidth=5;c.strokeStyle=INK;c.stroke();c.lineWidth=2.5;c.strokeStyle='#9aa4a8';c.stroke();}line(c,[[w*.18,h*.4-z*.4],[w*.45,h*.1-z*.4],[w*.82,h*.4-z*.4],[w*.6,-z*.6],[w*.45,h*.1-z*.4]],'#3a7bd5',4);break;}
 case 'fusebox':{box(c,0,-z,w,h+z,4,'#9aa3a6');box(c,4,-z+4,w-8,h+z-8,3,'#c9d0cf');for(let i=0;i<4;i++)box(c,7,-z+8+i*13,w-14,9,2,i===1?'#e1574c':'#3d4a52',1.5);oval(c,w/2,-z-6,6,6,'#f2c94c',2);break;}
 case 'washer':case 'dryer':{block(c,w,h,z,'#eef1f2');box(c,6,-z+4,w-12,8,3,'#b7c0c4',1.6);c.beginPath();c.arc(w/2,h*.62-z+6,Math.min(w,h)*.3,0,TAU);fill(c,'#5d6e78',3);c.beginPath();c.arc(w/2,h*.62-z+6,Math.min(w,h)*.21,0,TAU);fill(c,k==='washer'?'#7fc4e0':'#c7b7a1',2);oval(c,w*.78,-z+8,3,3,'#46c97a');break;}
 case 'ironing':{line(c,[[w*.25,h],[w*.75,-z+h*.5]],INK,3);line(c,[[w*.75,h],[w*.25,-z+h*.5]],INK,3);c.beginPath();c.moveTo(0,-z+4);c.lineTo(w-14,-z);c.quadraticCurveTo(w,-z+h*.4,w-14,-z+h*.8);c.lineTo(0,-z+h*.8);c.closePath();fill(c,'#9fc6e3');box(c,w*.55,-z-4,22,12,5,'#e6e6e6',2);break;}
 case 'basket':{block(c,w,h,z,'#c9a06a',{r:10});for(let i=1;i<5;i++)line(c,[[i*w/5,-z+2],[i*w/5,h-z]],'#9d7646',1.5);oval(c,w*.4,-z+h*.4,w*.2,h*.2,'#e7718f',2);oval(c,w*.65,-z+h*.45,w*.18,h*.18,'#7fb7e3',2);break;}
 case 'counter':case 'island':{block(c,w,h,z,'#f0ead9',{front:'#b98a5e'});for(let xx=w*.12;xx<w-10;xx+=w*.2)line(c,[[xx,h-z+6],[xx,h-4]],dark('#b98a5e',.75),2);if(k==='counter'){box(c,w*.42,-z+6,w*.2,h*.7,8,'#c9d6dc');oval(c,w*.52,-z+h*.4,w*.06,h*.2,'#8fb6c8',2);line(c,[[w*.52,-z+2],[w*.52,-z-10],[w*.57,-z-10]],'#9aa4a8',4);for(let i=0;i<3;i++)box(c,w*.08+i*16,-z+8,12,h*.5,3,['#e9e2c6','#f6c75a','#d96a4c'][i],1.6);}else{for(let i=0;i<3;i++)box(c,w*.15+i*w*.27,-z+h*.2,w*.18,h*.5,6,['#e7d39a','#f0f0e0','#e58c6a'][i],1.8);}break;}
 case 'stove':{block(c,w,h,z,'#3c4248');for(const [xx,yy] of [[.28,.32],[.72,.32],[.28,.72],[.72,.72]]){c.beginPath();c.arc(w*xx,-z+h*yy,Math.min(w,h)*.17,0,TAU);fill(c,'#1d2125',2);c.beginPath();c.arc(w*xx,-z+h*yy,Math.min(w,h)*.08,0,TAU);fill(c,'#5b636b',1);}box(c,w*.2,h-z+4,w*.6,z-8,3,'#2a2e33',2);break;}
 case 'fridge':{block(c,w,h,z,'#e5ecef');box(c,0,-z,w,h,6,'#e5ecef');line(c,[[3,-z+h*.45],[w-3,-z+h*.45]],INK,2);box(c,w-9,-z+6,4,h*.3,2,'#9aa4a8',1.5);box(c,6,-z+h*.55,w*.3,h*.2,2,'#f1c24e',1.4);break;}
 case 'bin':{block(c,w,h,z,'#6d8a5a',{r:10});box(c,-2,-z-3,w+4,7,3,'#4f6a3e');break;}
 case 'dining-table':{for(const [xx,yy] of [[.12,-.32],[.38,-.32],[.62,-.32],[.88,-.32],[.12,1.08],[.38,1.08],[.62,1.08],[.88,1.08]]){box(c,w*xx-11,h*yy-10,22,18,5,'#7a5236');box(c,w*xx-9,h*yy-14,18,8,4,'#946645');}if(p.w<4){for(const xx of [-.18,1.06])box(c,w*xx-6,h*.3,18,22,5,'#7a5236');}
  block(c,w,h,z,'#a8754a');c.save();rr(c,6,-z+6,w-12,h-12,8);c.fillStyle='rgba(255,255,255,.75)';c.fill();c.restore();for(const xx of [.2,.5,.8]){oval(c,w*xx,-z+h*.32,9,6,'#f4f1e8',1.6);oval(c,w*xx,-z+h*.7,9,6,'#f4f1e8',1.6);}
  if(p.emergencyBadge){const cx=w/2,cy=h/2-z;oval(c,cx,cy+2,24,15,'#52606a',2.4);oval(c,cx,cy-3,15,10,'#e0474f',2.2);oval(c,cx-4,cy-6,5,3,'#ff9b8f');}break;}
 case 'sideboard':case 'cabinet':case 'dresser':case 'nightstand':{const col=k==='cabinet'?'#8a5a3a':k==='nightstand'?'#b08156':'#9b6a44';block(c,w,h,z,col);const n=Math.max(1,Math.round(w/(T*.8)));for(let i=0;i<n;i++){box(c,4+i*(w-8)/n,h-z+4,(w-8)/n-4,z-8,3,dark(col,.82),1.6);oval(c,4+(i+.5)*(w-8)/n,h-z/2,2.4,2.4,'#e8c56a',1);}if(k==='sideboard'){box(c,w*.62,-z-18,12,20,4,'#6aa4c7',2);oval(c,w*.25,-z-4,8,6,'#d65b4c',2);}if(k==='nightstand'){oval(c,w/2,-z-8,7,7,'#f6e7a8',2);line(c,[[w/2,-z-2],[w/2,-z+6]],INK,2);}break;}
 case 'plant':{box(c,w*.2,h*.25,w*.6,h*.75,5,'#c06f4a');for(const [dx,dy,r] of [[.5,-.2,.42],[.25,.05,.3],[.75,.05,.3],[.5,-.55,.3]])oval(c,w*dx,h*dy-z*.4,w*r,w*r*.9,'#4f9a52',2.2);oval(c,w*.42,-z*.6,w*.12,w*.1,'#7fc47a');break;}
 case 'ladder':{for(const xx of [w*.15,w*.85])line(c,[[xx,h],[xx,-z]],INK,5);for(const xx of [w*.15,w*.85])line(c,[[xx,h],[xx,-z]],'#c9b38c',3);for(let i=0;i<5;i++){const yy=h-i*(h+z)/5;line(c,[[w*.15,yy],[w*.85,yy]],'#c9b38c',3);}break;}
 case 'tv':{box(c,0,-6,w,h+6,4,'#5a3f2c');box(c,w*.08,-z-6,w*.84,z,4,'#1a1d22');box(c,w*.12,-z-2,w*.76,z-8,2,'#2f5f7d',1.4);line(c,[[w*.2,-z+8],[w*.4,-z+2]],'#8fd0ef',3);box(c,w*.42,-8,w*.16,8,2,'#2a2a2a');break;}
 case 'sofa':{const col='#4c7fa8';box(c,0,0,w,h,10,dark(col,.68));box(c,0,-z,w,h*.55,10,col);box(c,0,-z+h*.3,w,h*.7,10,light(col,.1));for(let i=0;i<3;i++)box(c,8+i*(w-16)/3,-z+h*.38,(w-16)/3-4,h*.45,8,light(col,.22),2);for(const xx of [0,w-16])box(c,xx,-z+4,16,h+z-8,8,col);break;}
 case 'armchair':{const col='#c1784e';box(c,0,0,w,h,10,dark(col,.68));box(c,0,-z,w,h*.5,10,col);box(c,6,-z+h*.32,w-12,h*.6,9,light(col,.15),2);for(const xx of [0,w-13])box(c,xx,-z+4,13,h+z-8,7,col);break;}
 case 'coffee':{block(c,w,h,z,'#7a5236');box(c,w*.12,-z+h*.2,w*.3,h*.55,3,'#e8d9b4',1.6);oval(c,w*.7,-z+h*.45,8,8,'#f4f1e8',1.6);break;}
 case 'piano':{block(c,w,h,z,'#1f1d22');box(c,w*.05,h-z+2,w*.9,10,2,'#f6f3ea',1.6);for(let i=1;i<14;i++)line(c,[[w*.05+i*w*.9/14,h-z+2],[w*.05+i*w*.9/14,h-z+12]],'#222',1);for(let i=0;i<9;i++)box(c,w*.08+i*w*.1,h-z+2,w*.04,6,1,'#111',0);box(c,w*.3,-z-14,w*.4,14,3,'#f2ede0',1.6);break;}
 case 'lamp':{line(c,[[w/2,h],[w/2,-z]],INK,5);line(c,[[w/2,h],[w/2,-z]],'#b9a47c',3);c.beginPath();c.moveTo(w*.1,-z+10);c.lineTo(w*.9,-z+10);c.lineTo(w*.7,-z-12);c.lineTo(w*.3,-z-12);c.closePath();fill(c,'#f2dca0');break;}
 case 'console':{block(c,w,h,z,'#7c5a40');box(c,w*.3,-z-26,w*.42,24,4,'#2f3a40');box(c,w*.34,-z-22,w*.34,15,2,'#7bd4b0',1.4);oval(c,w*.15,-z+h*.4,6,5,'#c9b38c',1.6);break;}
 case 'coatrack':{line(c,[[w/2,h],[w/2,-z]],INK,6);line(c,[[w/2,h],[w/2,-z]],'#8a5a3a',4);oval(c,w/2-8,-z+10,9,14,'#3a72b5',2);oval(c,w/2+8,-z+16,8,12,'#d65b4c',2);oval(c,w/2,-z-2,10,5,'#3c3c3c',2);break;}
 case 'domotica':{box(c,-2,-z-6,w+4,z+h+6,5,'#d8dcd8');box(c,3,-z-1,w-6,z-4,3,'#0e2a22',2);for(let i=0;i<5;i++)box(c,6+(i%3)*((w-12)/3),-z+3+Math.floor(i/3)*10,(w-12)/3-3,8,1.5,'#3fd38a',0);oval(c,w-8,h-6,3,3,'#46c97a');break;}
 case 'desk':{block(c,w,h,z,'#9b6a44');box(c,w*.35,-z-22,w*.32,20,3,'#2b3238');box(c,w*.38,-z-19,w*.26,13,2,'#6fb4e8',1.4);box(c,w*.42,-z+h*.35,w*.2,h*.25,2,'#e4e4e4',1.4);box(c,w*.08,-z+h*.2,w*.18,h*.5,2,'#f4ecd2',1.4);break;}
 case 'pingpong':{block(c,w,h,z,'#2f7a5b');c.save();rr(c,4,-z+4,w-8,h-8,4);c.strokeStyle='#f4f1e8';c.lineWidth=3;c.stroke();c.restore();line(c,[[w/2,-z-8],[w/2,h-z]],'#f4f1e8',3);line(c,[[4,-z+h/2],[w-4,-z+h/2]],'rgba(255,255,255,.6)',2);oval(c,w*.3,-z+h*.3,4,4,'#f6a23a',1.4);break;}
 case 'arcade':{block(c,w,h,z,'#4a2f8c');box(c,w*.12,-z-14,w*.76,z*.5,4,'#121019');box(c,w*.17,-z-10,w*.66,z*.38,2,'#e65fbf',1.4);box(c,w*.1,-z+z*.42,w*.8,10,3,'#2b1d55');oval(c,w*.3,-z+z*.5,4,4,'#f2cf33',1.4);oval(c,w*.6,-z+z*.5,4,4,'#30cdd5',1.4);break;}
 case 'beanbag':{oval(c,w/2,h*.55-z*.4,w*.5,h*.48,'#e2574f',2.6);oval(c,w*.42,h*.35-z*.5,w*.18,h*.12,'#ff8a82');break;}
 case 'toychest':{block(c,w,h,z,'#e0a33a');box(c,w*.3,h-z+4,w*.4,z-8,3,'#c4512f',1.6);oval(c,w*.25,-z+h*.4,6,6,'#3a72b5',1.6);box(c,w*.55,-z+h*.2,12,10,2,'#d65b4c',1.6);break;}
 case 'bed':{const col='#e7e2d6';box(c,0,-z-14,w,20,6,'#7a5236');box(c,0,-z,w,h,8,dark(col,.7));box(c,0,-z,w,h-6,8,col);box(c,4,-z+h*.38,w-8,h*.62-6,8,'#7b8fd0',2.4);line(c,[[4,-z+h*.38],[w-4,-z+h*.38]],'#5d6eaa',3);for(const xx of [.08,.54])box(c,w*xx,-z+6,w*.38,h*.18,8,'#fbf8f0',2);break;}
 case 'bunk':{for(const [yy,col] of [[0,'#4fa2d6'],[-z,'#e6704f']]){box(c,0,yy-6,w,h,6,'#7a5236');box(c,3,yy-4,w-6,h-6,6,'#f2efe6',1.8);box(c,3,yy+h*.35,w-6,h*.55,6,col,2);box(c,5,yy,w-10,h*.18,6,'#fbf8f0',1.6);}for(const xx of [2,w-6])line(c,[[xx,h],[xx,-z-6]],'#5a3c26',5);break;}
 case 'wardrobe':{block(c,w,h,z,'#a67449');for(let i=0;i<3;i++){box(c,6+i*(w-12)/3,h-z-z*.95+6,(w-12)/3-4,z*.9,3,'#b9875a',1.6);oval(c,6+(i+.5)*(w-12)/3+((i%2)?-6:6),h-z-z*.45,2.2,2.2,'#e8c56a',1);}break;}
 case 'bathtub':{box(c,0,0,w,h,16,'#cfd8dc');box(c,0,-z,w,h,16,'#f6f9fa');box(c,6,-z+6,w-12,h-12,13,'#9fd3e6',2);for(let i=0;i<4;i++)oval(c,w*.3+i*6,-z+h*.3+i*12,5,4,'rgba(255,255,255,.75)');line(c,[[w/2,-z+4],[w/2,-z-10]],'#9aa4a8',4);break;}
 case 'toilet':{box(c,w*.12,-z-14,w*.76,h*.42,6,'#f6f9fa');oval(c,w/2,h*.55-z*.6,w*.42,h*.42,'#f6f9fa',2.6);oval(c,w/2,h*.55-z*.6,w*.26,h*.26,'#a9d6e6',1.8);break;}
 case 'washbasin':{block(c,w,h,z,'#e9eef0',{front:'#8a5a3a'});oval(c,w/2,-z+h*.5,w*.32,h*.3,'#cfe6ee',2);line(c,[[w/2,-z+2],[w/2,-z-8]],'#9aa4a8',4);box(c,w*.25,-z-30,w*.5,20,4,'#d4ecf3',2);break;}
 default:block(c,w,h,z,'#a98a68');}
 c.restore();return true;}
// Elementos planos pintados en la lámina del suelo (no bloquean).
export function drawHouseFlat(c,p){const k=p.kind.slice(6),x=p.x*T,y=p.y*T,w=p.w*T,h=p.h*T;c.save();c.translate(x,y);
 if(k==='rug'){box(c,0,0,w,h,10,'#b2463f',2.4);box(c,8,8,w-16,h-16,8,'#d9a35b',0);box(c,16,16,w-32,h-32,6,'#2f5f8f',0);c.strokeStyle='rgba(255,255,255,.35)';c.lineWidth=2;c.setLineDash([6,6]);rr(c,12,12,w-24,h-24,8);c.stroke();c.setLineDash([]);}
 else if(k==='mat'){box(c,0,0,w,h,6,'#6f5a46',2);c.fillStyle='rgba(255,255,255,.18)';c.font='900 12px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('BIENVENIDOS',w/2,h/2);}
 else if(k==='oilstain'){c.fillStyle='rgba(30,30,35,.32)';c.beginPath();c.ellipse(w/2,h/2,w*.45,h*.38,.4,0,TAU);c.fill();c.beginPath();c.ellipse(w*.7,h*.6,w*.18,h*.14,0,0,TAU);c.fill();}
 else if(k==='tiles'){c.strokeStyle='rgba(60,70,80,.16)';c.lineWidth=1.5;for(let xx=0;xx<=w;xx+=T/2){c.beginPath();c.moveTo(xx,0);c.lineTo(xx,h);c.stroke();}for(let yy=0;yy<=h;yy+=T/2){c.beginPath();c.moveTo(0,yy);c.lineTo(w,yy);c.stroke();}}
 else if(k==='toys'){const items=[['#e2574f',.2,.3],['#3a72b5',.7,.25],['#f2cf33',.45,.7],['#1fa34f',.8,.75]];for(const [col,a,b] of items){box(c,w*a-8,h*b-8,16,16,3,col,2);}oval(c,w*.15,h*.8,7,7,'#ee6fbf',2);}
 c.restore();}
// Suelos de la casa: parqué, baldosa, moqueta u hormigón según la habitación.
export function drawHouseFloor(c,map){for(const r of [...map.corridors,...map.rooms]){const x=r.x*T,y=r.y*T,w=r.w*T,h=r.h*T,kind=r.floorKind||'wood';c.save();c.beginPath();c.rect(x,y,w,h);c.clip();c.fillStyle=r.color||'#8f7357';c.fillRect(x,y,w,h);
 if(kind==='wood'){for(let yy=y;yy<y+h;yy+=14){const off=((yy/14)|0)%3*37;c.fillStyle=((yy/14)|0)%2?'rgba(255,255,255,.05)':'rgba(0,0,0,.05)';c.fillRect(x,yy,w,14);c.strokeStyle='rgba(60,35,15,.22)';c.lineWidth=1.2;c.beginPath();c.moveTo(x,yy);c.lineTo(x+w,yy);c.stroke();for(let xx=x-off;xx<x+w;xx+=112){c.beginPath();c.moveTo(xx,yy);c.lineTo(xx,yy+14);c.stroke();}}}
 else if(kind==='tile'){for(let yy=y;yy<y+h;yy+=T/2)for(let xx=x;xx<x+w;xx+=T/2){c.fillStyle=((xx+yy)/(T/2))%2?'rgba(255,255,255,.09)':'rgba(0,0,0,.04)';c.fillRect(xx,yy,T/2,T/2);}c.strokeStyle='rgba(40,50,60,.14)';c.lineWidth=1;for(let xx=x;xx<=x+w;xx+=T/2){c.beginPath();c.moveTo(xx,y);c.lineTo(xx,y+h);c.stroke();}for(let yy=y;yy<=y+h;yy+=T/2){c.beginPath();c.moveTo(x,yy);c.lineTo(x+w,yy);c.stroke();}}
 else if(kind==='carpet'){c.fillStyle='rgba(255,255,255,.05)';for(let i=0;i<w*h/900;i++){const a=Math.sin(i*12.9898+r.x)*43758.5453,b=Math.sin(i*78.233+r.y)*12345.678;c.fillRect(x+(a-Math.floor(a))*w,y+(b-Math.floor(b))*h,2,2);}}
 else if(kind==='concrete'){c.strokeStyle='rgba(0,0,0,.12)';c.lineWidth=2;for(let xx=x;xx<=x+w;xx+=T*2){c.beginPath();c.moveTo(xx,y);c.lineTo(xx,y+h);c.stroke();}for(let yy=y;yy<=y+h;yy+=T*2){c.beginPath();c.moveTo(x,yy);c.lineTo(x+w,yy);c.stroke();}}
 c.restore();}
 for(const a of map.art||[])drawHouseFlat(c,a);}
// Mascotas de la casa (gato y perro): siguen el mismo canal que la fauna.
export function drawPet(c,a,time){const moving=a.moving,step=moving?Math.sin(time/90)*3:0,dir=a.facing||1,dog=a.species==='dog';c.save();c.translate(a.x,a.y);c.scale(dir,1);
 c.fillStyle='rgba(20,14,10,.25)';c.beginPath();c.ellipse(0,4,dog?22:17,6,0,0,TAU);c.fill();
 const body=dog?'#b9874f':'#5b5f6a',belly=dog?'#e8cf9f':'#c9ccd2';
 for(const [lx,s] of [[-10,1],[8,-1]]){box(c,lx-3,-10+step*s,6,12,3,dark(body,.8),2);}
 box(c,-16,-26,dog?34:30,18,9,body,2.6);box(c,-8,-16,16,7,4,belly,0);
 c.beginPath();c.moveTo(-16,-20);c.quadraticCurveTo(-28,-28-step,-24,dog?-36:-42);c.lineWidth=dog?6:5;c.strokeStyle=INK;c.stroke();c.lineWidth=dog?4:3;c.strokeStyle=body;c.stroke();
 const hx=dog?18:14;oval(c,hx,-30,dog?11:10,dog?10:9,body,2.6);
 if(dog){oval(c,hx+8,-26,6,4,belly,2);oval(c,hx+13,-27,2.6,2.2,INK);box(c,hx-12,-38,7,12,3,dark(body,.7),2);}else{c.beginPath();c.moveTo(hx-8,-36);c.lineTo(hx-6,-46);c.lineTo(hx-1,-38);c.moveTo(hx+2,-38);c.lineTo(hx+6,-46);c.lineTo(hx+8,-35);fill(c,body,2.2);}
 oval(c,hx+3,-32,1.8,2.4,INK);c.restore();}
