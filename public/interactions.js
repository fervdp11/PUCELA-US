const TAU=Math.PI*2;
const VS={ox:30,oy:22,w:64,h:50,k:2.5};let ventSprite=null,ventBitmap=null;
function paintClosedVent(c){c.fillStyle='#0c223955';c.beginPath();c.ellipse(3,5,29,21,0,0,TAU);c.fill();c.fillStyle='#0b1a2e';c.strokeStyle='#73919e';c.lineWidth=3;c.beginPath();c.ellipse(0,0,24,17,0,0,TAU);c.fill();c.stroke();
 c.fillStyle='#4a6375';c.strokeStyle='#b7c9c9';c.beginPath();c.ellipse(0,0,24,17,0,0,TAU);c.fill();c.stroke();c.save();c.beginPath();c.ellipse(0,0,18,11,0,0,TAU);c.clip();c.strokeStyle='#203849';c.lineWidth=3;for(let i=-15;i<=15;i+=6){c.beginPath();c.moveTo(i,-13);c.lineTo(i,13);c.stroke();}c.restore();c.fillStyle='#90deca';c.beginPath();c.arc(0,-12,2.5,0,TAU);c.fill();}
function closedVentSprite(){if(ventBitmap)return ventBitmap;if(ventSprite)return ventSprite;if(typeof document==='undefined')return null;const k=document.createElement('canvas');k.width=Math.ceil(VS.w*VS.k);k.height=Math.ceil(VS.h*VS.k);const g=k.getContext('2d');if(!g)return null;g.scale(VS.k,VS.k);g.translate(VS.ox,VS.oy);paintClosedVent(g);ventSprite=k;if(typeof createImageBitmap==='function')createImageBitmap(k).then(b=>{ventBitmap=b;}).catch(()=>{});return k;}
export function drawVents(c,map,state,time,clock,view=null){
 for(const v of map.vents||[]){if(view&&(Math.abs(v.x-view.x)>view.w/2+60||Math.abs(v.y-view.y)>view.h/2+60))continue;/* fuera de pantalla */const actors=state.players.filter(p=>p.vent===v.id||p.transition?.kind==='vent-out'&&Math.hypot(p.x-v.x,p.y-v.y)<15),actor=actors.find(p=>p.transition),age=actor?.transition?clock-actor.transition.at:Infinity,open=actor?.transition?.kind==='vent-in'?Math.sin(Math.min(1,Math.max(0,age/600))*Math.PI):actor?.transition?.kind==='vent-out'?1-Math.min(1,Math.max(0,age/550)):0;
  if(v.mole){drawMoleHole(c,v,open,time);continue;}
  // Rejilla cerrada (el caso de casi todos los fotogramas): sprite ya pintado.
  // Recortar la elipse y trazar las lamas en cada fotograma costaba ~10 % del
  // tiempo de dibujo del colegio.
  if(open<=0.001){const sprite=closedVentSprite();if(sprite){c.drawImage(sprite,v.x-VS.ox,v.y-VS.oy,VS.w,VS.h);continue;}}
  c.save();c.translate(v.x,v.y);c.fillStyle='#0c223955';c.beginPath();c.ellipse(3,5,29,21,0,0,TAU);c.fill();c.fillStyle='#0b1a2e';c.strokeStyle='#73919e';c.lineWidth=3;c.beginPath();c.ellipse(0,0,24,17,0,0,TAU);c.fill();c.stroke();
  c.save();c.translate(0,-open*20);c.scale(1,1-open*.7);c.fillStyle='#4a6375';c.strokeStyle='#b7c9c9';c.beginPath();c.ellipse(0,0,24,17,0,0,TAU);c.fill();c.stroke();c.save();c.beginPath();c.ellipse(0,0,18,11,0,0,TAU);c.clip();c.strokeStyle='#203849';c.lineWidth=3;for(let i=-15;i<=15;i+=6){c.beginPath();c.moveTo(i,-13);c.lineTo(i,13);c.stroke();}c.restore();c.fillStyle='#90deca';c.beginPath();c.arc(0,-12,2.5,0,TAU);c.fill();c.restore();c.restore();
 }
}
export function drawActorInteraction(c,p,clock,time,reduced){
 const age=clock-(p.spawnAt||0);if(p.spawnAt&&age>=0&&age<850){c.save();c.globalAlpha=(1-age/850)*.5;c.strokeStyle='#abe9d6';c.lineWidth=2;c.beginPath();c.ellipse(p.x,p.y+2,22+age*.03,8+age*.01,0,0,TAU);c.stroke();c.restore();}
}

// ------------------------------------------------------------- aparatos
// Cada tarea y cada punto de reparación es un objeto propio del escenario
// (ordenador, cuadro eléctrico, mesa de DJ, máquina, fuente…), no un cubo
// genérico. Al acercarse aparece un contorno que sigue su silueta: amarillo
// para las tareas y rojo para las reparaciones.
const DEVICE={computer:'screen',code:'screen',download:'server',vip:'reader',documents:'tray',exams:'tray',papers:'tray',folders:'cabinet',book:'shelf',supplies:'crates',stock:'crates',wires:'panel',power:'panel',lights:'lamp',calibrate:'scope',electrical:'panel',overload:'panel',doors:'doorpanel',dj:'dj',speaker:'speaker',audio:'speaker',bath:'tap',hydration:'fountain',ventilation:'fan',chalk:'board',german:'board',scoreboard:'score',bell:'bell',treadmill:'treadmill',spinning:'bike',weights:'bench',plates:'rack',basketball:'hoop',lockers:'locker',equipment:'toolbox',trash:'bin',desks:'desk',computers:'server',emergency:'alarm'};
const SPRITES=new Map();const W=104,H=104,BX=52,BY=78;
function R(q,x,y,w,h,r,fill,stroke,lw=2){q.beginPath();q.roundRect(x,y,w,h,r);if(fill){q.fillStyle=fill;q.fill();}if(stroke){q.strokeStyle=stroke;q.lineWidth=lw;q.stroke();}}
function E(q,x,y,rx,ry,fill,stroke,lw=2){q.beginPath();q.ellipse(x,y,rx,ry,0,0,TAU);if(fill){q.fillStyle=fill;q.fill();}if(stroke){q.strokeStyle=stroke;q.lineWidth=lw;q.stroke();}}
function shape(q,type,theme){
 const metal='#5d7684',dark='#1c2b36',edge='#0e1a22',screen='#59d6c8',wood='#a87a52';
 switch(type){
  case 'screen':R(q,-26,-12,52,22,4,'#8b6a4c',edge);R(q,-20,-46,40,30,4,dark,edge);R(q,-16,-42,32,22,2,screen);R(q,-4,-16,8,6,1,metal);R(q,-16,0,24,6,2,'#d7dde0',edge,1);break;
  case 'server':R(q,-20,-50,40,60,5,'#2b3d4a',edge);for(let i=0;i<4;i++){R(q,-15,-44+i*13,30,9,2,'#17242e');E(q,10,-40+i*13,2,2,i%2?'#7ee2a8':'#ffd65a');}break;
  case 'reader':R(q,-14,-44,28,54,6,'#33424d',edge);R(q,-9,-38,18,12,2,screen);R(q,-10,-20,20,4,2,'#0b141a');E(q,0,-6,4,4,'#ff7185');break;
  case 'tray':R(q,-26,-14,52,24,4,wood,edge);for(let i=0;i<3;i++){R(q,-22+i*15,-30-i*2,13,18,2,'#f3efe0','#9a917c',1);}R(q,-6,-24,20,8,2,'#e8c860');break;
  case 'cabinet':R(q,-20,-50,40,60,4,'#6f7f8a',edge);for(let i=0;i<3;i++){R(q,-16,-45+i*18,32,15,2,'#8a9aa5',edge,1);R(q,-5,-39+i*18,10,3,1,'#2b3a44');}break;
  case 'shelf':R(q,-28,-50,56,60,3,'#7a5638',edge);for(let i=0;i<3;i++){R(q,-24,-46+i*18,48,15,1,'#3b2a1e');for(let k=0;k<6;k++)R(q,-22+k*7.5,-44+i*18,6,12,1,['#d9483b','#3f7fb0','#f2c14e','#5f9b45','#a35cc9','#e88a3a'][(k+i)%6]);}break;
  case 'crates':R(q,-28,-20,30,30,3,'#b98a54',edge);R(q,0,-26,28,36,3,'#9c7246',edge);R(q,-18,-44,26,24,3,'#c79a62',edge);for(const [x,y] of [[-28,-6],[0,-8],[-18,-32]])R(q,x+3,y,22,3,1,'#6b4a24');break;
  case 'panel':R(q,-24,-52,48,62,4,'#c9cdc4',edge);R(q,-19,-46,38,50,2,'#2c3a42');for(let i=0;i<4;i++)R(q,-15+i*8.5,-42,6,14,1,i%2?'#ff7185':'#7ee2a8');R(q,-15,-22,30,14,2,'#141e24');E(q,-8,-15,3,3,'#ffd65a');E(q,8,-15,3,3,'#59d6c8');R(q,-6,-2,12,4,1,'#ffd65a');break;
  case 'doorpanel':R(q,-16,-48,32,56,5,'#3b4d58',edge);R(q,-11,-42,22,14,2,screen);for(let i=0;i<6;i++)R(q,-10+(i%3)*7.5,-22+Math.floor(i/3)*9,6,6,1,'#9fb3bd');break;
  case 'lamp':R(q,-4,-56,8,62,3,'#4a5964',edge);E(q,0,-56,16,8,'#ffe58a',edge);E(q,0,6,14,6,'#2c3a42');break;
  case 'scope':R(q,-26,-40,52,46,5,'#2f3f4b',edge);R(q,-21,-35,30,26,2,'#0e2a26');q.strokeStyle='#7ee2a8';q.lineWidth=2;q.beginPath();for(let x=0;x<=28;x++){const y=-22+Math.sin(x/4)*7;x?q.lineTo(-20+x,y):q.moveTo(-20,y);}q.stroke();for(let i=0;i<3;i++)E(q,17,-30+i*11,4,4,'#c7ced3',edge,1);break;
  case 'dj':R(q,-34,-26,68,34,6,'#1f1a2e',edge);E(q,-17,-11,12,10,'#0b0b12','#8a7bd6');E(q,17,-11,12,10,'#0b0b12','#8a7bd6');for(let i=0;i<3;i++)R(q,-4+i*4,-22,2,18,1,'#e07ad6');break;
  case 'speaker':R(q,-20,-56,40,64,4,'#1b1b24',edge);E(q,0,-38,11,11,'#0b0b10','#5c5c78');E(q,0,-38,4,4,'#3a3a50');E(q,0,-10,15,15,'#0b0b10','#5c5c78');E(q,0,-10,6,6,'#3a3a50');break;
  case 'tap':R(q,-24,-20,48,28,10,'#e6f1f3',edge);E(q,0,-8,16,8,'#8fd3e6');R(q,-4,-36,8,18,3,'#aab7bf',edge);R(q,-4,-36,16,6,3,'#aab7bf',edge);break;
  case 'fountain':R(q,-14,-36,28,44,6,'#c9d6dc',edge);E(q,0,-36,13,7,'#8fd3e6',edge);R(q,-3,-48,6,10,2,'#aab7bf');break;
  case 'fan':R(q,-26,-46,52,52,5,'#9aa8b0',edge);E(q,0,-20,20,20,'#2c3a42');for(let i=0;i<4;i++){q.save();q.translate(0,-20);q.rotate(i*Math.PI/2+.4);E(q,0,-10,5,10,'#c9d6dc');q.restore();}E(q,0,-20,4,4,'#ffd65a');break;
  case 'board':R(q,-34,-56,68,44,3,'#7a5638',edge);R(q,-30,-52,60,36,2,'#2e5a46');q.strokeStyle='#e8f0e6aa';q.lineWidth=2;q.beginPath();q.moveTo(-22,-40);q.lineTo(6,-40);q.moveTo(-22,-30);q.lineTo(16,-30);q.stroke();R(q,-6,-14,22,5,2,'#d7c9a8');break;
  case 'score':R(q,-32,-58,64,40,4,'#141e24',edge);for(let i=0;i<4;i++)R(q,-26+i*14,-52,11,18,2,'#2b1010');q.fillStyle='#ff7185';q.font='800 13px monospace';q.textAlign='center';q.fillText('8',-20,-38);q.fillText('3',-6,-38);q.fillStyle='#ffd65a';q.fillText('2',8,-38);q.fillText('1',22,-38);R(q,-3,-18,6,26,2,'#4a5964');break;
  case 'bell':R(q,-4,-58,8,10,2,'#6b4a24');q.fillStyle='#e8c860';q.strokeStyle=edge;q.lineWidth=2;q.beginPath();q.moveTo(-18,-14);q.quadraticCurveTo(-16,-50,0,-50);q.quadraticCurveTo(16,-50,18,-14);q.closePath();q.fill();q.stroke();E(q,0,-10,5,5,'#a8853a');R(q,-24,-6,48,12,4,wood,edge);break;
  case 'treadmill':R(q,-18,-56,36,10,3,'#2c3a42',edge);R(q,-14,-48,4,30,2,metal);R(q,10,-48,4,30,2,metal);R(q,-20,-20,40,30,6,'#1c2329',edge);R(q,-15,-16,30,22,3,'#3b4750');break;
  case 'bike':E(q,-14,-6,11,11,null,'#2c3a42',4);E(q,14,-6,11,11,null,'#2c3a42',4);q.strokeStyle='#d9483b';q.lineWidth=5;q.beginPath();q.moveTo(-14,-6);q.lineTo(0,-30);q.lineTo(14,-6);q.moveTo(0,-30);q.lineTo(10,-42);q.stroke();R(q,-6,-34,12,5,2,'#141e24');break;
  case 'bench':R(q,-28,-16,56,16,5,'#2c3a42',edge);R(q,-34,-40,6,40,2,metal);R(q,28,-40,6,40,2,metal);R(q,-40,-36,80,6,3,'#c7ced3',edge);E(q,-38,-33,6,10,'#1c2329');E(q,38,-33,6,10,'#1c2329');break;
  case 'rack':R(q,-30,-48,60,8,3,metal,edge);R(q,-26,-44,6,50,2,'#4a5964');R(q,20,-44,6,50,2,'#4a5964');for(let i=0;i<3;i++){E(q,-14+i*14,-12,7,16,'#1c2329','#5d7684');}break;
  case 'hoop':R(q,-4,-50,8,58,2,'#4a5964');R(q,-24,-64,48,30,3,'#f4f1e6',edge);R(q,-9,-52,18,12,1,null,'#d9483b',2);E(q,0,-36,11,4,null,'#e88a3a',3);break;
  case 'locker':for(let i=0;i<3;i++){R(q,-30+i*20,-56,19,64,2,['#3f7fb0','#d9483b','#5f9b45'][i],edge);R(q,-24+i*20,-46,8,2,1,'#0008');E(q,-16+i*20,-24,2,2,'#e2e6e8');}break;
  case 'toolbox':R(q,-26,-24,52,32,4,'#d9483b',edge);R(q,-26,-24,52,10,3,'#b8392e');R(q,-10,-34,20,10,4,null,'#2c3a42',4);R(q,-6,-12,12,4,1,'#e2e6e8');break;
  case 'bin':R(q,-16,-40,32,48,5,'#5f9b45',edge);R(q,-19,-44,38,8,3,'#4a7d37',edge);R(q,-10,-30,20,3,1,'#2f5222');R(q,-10,-20,20,3,1,'#2f5222');break;
  case 'desk':R(q,-32,-20,64,26,3,wood,edge);R(q,-22,-40,16,18,3,'#3f7fb0',edge);R(q,6,-40,16,18,3,'#3f7fb0',edge);break;
  case 'alarm':R(q,-20,-44,40,50,6,'#8e2a22',edge);E(q,0,-22,13,13,'#ff4757',edge);E(q,-4,-26,4,3,'#ffb3ba');break;
  default:R(q,-22,-44,44,50,5,'#405971',edge);R(q,-16,-38,32,22,3,screen);
 }
}
function makeSprite(type){const can=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(W,H):Object.assign(document.createElement('canvas'),{width:W,height:H});const q=can.getContext('2d');q.translate(BX,BY);q.fillStyle='#0a142a40';q.beginPath();q.ellipse(3,8,34,11,0,0,TAU);q.fill();shape(q,type);return can;}
// Contorno por silueta: se dilata la forma del sprite y se le resta la propia
// forma, de modo que solo queda el borde, sea cual sea el objeto.
// Las sombras semitransparentes no forman parte de la silueta.
function solid(sprite){const w=sprite.width,h=sprite.height,can=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w,h):Object.assign(document.createElement('canvas'),{width:w,height:h}),q=can.getContext('2d');q.drawImage(sprite,0,0);try{const d=q.getImageData(0,0,w,h),a=d.data;for(let i=3;i<a.length;i+=4)a[i]=a[i]>150?255:0;q.putImageData(d,0,0);}catch{}return can;}
export function silhouetteOutline(sprite,color,width=3){sprite=solid(sprite);const w=sprite.width,h=sprite.height,can=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w,h):Object.assign(document.createElement('canvas'),{width:w,height:h}),q=can.getContext('2d');
 for(let a=0;a<12;a++)q.drawImage(sprite,Math.cos(a/12*TAU)*width,Math.sin(a/12*TAU)*width);q.globalCompositeOperation='source-in';q.fillStyle=color;q.fillRect(0,0,w,h);q.globalCompositeOperation='destination-out';q.drawImage(sprite,0,0);return can;}
function spriteFor(type,variant){const key=type+'/'+variant;let s=SPRITES.get(key);if(!s){const base=SPRITES.get(type+'/base')||makeSprite(type);SPRITES.set(type+'/base',base);s=variant==='base'?base:silhouetteOutline(base,variant==='task'?'#ffd65a':variant==='repair'?'#ff4f64':'#9fe8ff');SPRITES.set(key,s);}return s;}
export const deviceType=kind=>DEVICE[kind]||'screen';
// state: 'idle' | 'pending' (tarea asignada) | 'near' (al alcance) ; tone: 'task' | 'repair'
export function drawDevice(c,x,y,kind,{mode='idle',tone='task',time=0,fixed=false}={}){const type=deviceType(kind);c.drawImage(spriteFor(type,'base'),x-BX,y-BY);
 if(mode==='idle'&&!fixed)return;const ring=spriteFor(type,fixed?'done':tone);c.save();c.globalAlpha=fixed?.55:mode==='near'?1:.45+.3*Math.sin(time/320);c.drawImage(ring,x-BX,y-BY);c.restore();}
// Contorno de un objeto ya dibujado por el mapa (por ejemplo, los del parque).
const HOSTS=new WeakMap();
export function drawHostOutline(c,prop,paint,{tone='task',mode='near',time=0}={}){if(mode==='idle')return;let entry=HOSTS.get(prop);const T=56;
 if(!entry){const pad=72,w=Math.ceil(prop.w*T+pad*2),h=Math.ceil(prop.h*T+pad*2),can=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w,h):Object.assign(document.createElement('canvas'),{width:w,height:h}),q=can.getContext('2d');q.translate(pad-prop.x*T,pad-prop.y*T);paint(q,prop);entry={pad,can,rings:{}};HOSTS.set(prop,entry);}
 const ring=entry.rings[tone]??=silhouetteOutline(entry.can,tone==='repair'?'#ff4f64':'#ffd65a');c.save();c.globalAlpha=mode==='near'?1:.45+.3*Math.sin(time/320);c.drawImage(ring,prop.x*T-entry.pad,prop.y*T-entry.pad);c.restore();}

// ------------------------------------------------------------- conductos
// Dentro de un conducto, flechas alrededor del personaje apuntan a cada salida
// conectada. Devuelve las zonas pulsables en coordenadas del mundo.
export function drawVentArrows(c,state,local,vents,time){const me=state.me,v=vents.find(q=>q.id===me.vent);if(!v)return [];const hits=[];
 const list=v.links.map(id=>vents.find(q=>q.id===id)).filter(t=>t&&(state.config.floors==='both'||t.floor===v.floor)).map(t=>({t,other:t.floor!==v.floor,a:t.floor!==v.floor?(t.floor>v.floor?-Math.PI/2:Math.PI/2):Math.atan2(t.y-v.y,t.x-v.x)})).sort((p,q)=>p.a-q.a);
 // Dos salidas casi en la misma dirección se separan para que no se tapen.
 for(let k=0;k<3;k++)for(let i=0;i<list.length;i++){const p=list[i],q=list[(i+1)%list.length];if(list.length<2)break;let d=q.a-p.a;if(i===list.length-1)d+=TAU;if(d<.8){const push=(.8-d)/2;p.a-=push;q.a+=push;}}
 for(const {t,other,a} of list){const r=86+Math.sin(time/260)*4,x=local.x+Math.cos(a)*r,y=local.y-20+Math.sin(a)*r;
  c.save();c.translate(x,y);c.rotate(a);c.fillStyle='#0b1a2ecc';c.beginPath();c.arc(0,0,27,0,TAU);c.fill();c.strokeStyle=v.mole?'#e8c48a':'#90deca';c.lineWidth=3;c.stroke();
  c.fillStyle=v.mole?'#ffd9a0':'#c9fff1';c.beginPath();c.moveTo(16,0);c.lineTo(-8,-13);c.lineTo(-3,0);c.lineTo(-8,13);c.closePath();c.fill();c.restore();
  c.save();c.font='700 11px "Trebuchet MS",sans-serif';c.textAlign='center';c.fillStyle='#fff';c.strokeStyle='#0b1a2e';c.lineWidth=3;const label=t.label+(other?` · P${t.floor}`:'');c.strokeText(label,x,y+42);c.fillText(label,x,y+42);c.restore();
  hits.push({id:t.id,x,y,r:34});}
 return hits;}
export function drawMoleHole(c,v,open,time){c.save();c.translate(v.x,v.y);
 E(c,2,6,32,18,'#2b1a0e40');E(c,0,0,30,19,'#8a5a32','#5e3b1e',3);E(c,0,-2,22,13,'#6b4424');E(c,0,0,17,10,'#1a0f07');
 for(const [dx,dy,s] of [[-24,-10,1],[22,-8,.8],[-14,14,.9],[18,12,1.1]]){c.fillStyle='#5f9b45';c.beginPath();c.moveTo(dx-4*s,dy);c.lineTo(dx-1*s,dy-8*s);c.lineTo(dx+1*s,dy);c.lineTo(dx+4*s,dy-6*s);c.lineTo(dx+5*s,dy);c.fill();}
 if(open>0){c.globalAlpha=open;for(let i=0;i<7;i++){const a=i/7*TAU+time/400,r=16+open*14;E(c,Math.cos(a)*r,Math.sin(a)*r*.6-open*8,3.2,2.4,'#8a5a32');}}
 c.restore();}
