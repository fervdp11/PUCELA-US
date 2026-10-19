import {shadowsOn} from './characters.js';
// Cofres y objetos en el cliente: el minijuego de apertura, el dibujo de los
// cofres temáticos, objetos sueltos, huellas, jaulas y escudo, y la barra de
// inventario (mano vacía + dos ranuras). Las reglas viven en game/items.js.
import {createMechanism,stageBox,chassis} from './mechanism.js';
import {ITEMS} from './content.js';
const TAU=Math.PI*2;
function oval(c,x,y,rx,ry,fill,stroke,w=2){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.stroke();}}
function box(c,x,y,w,h,r,fill,stroke,lw=2){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}}
const THEME_TEXT={backpack:['MOCHILA OLVIDADA','Abre las tres hebillas en orden (1, 2, 3) y tira de la solapa hacia arriba.'],locker:['TAQUILLA','Gira los tres pestillos en orden (1, 2, 3) y levanta la puerta.'],case:['MALETÍN DE EQUIPO','Suelta los tres cierres en orden (1, 2, 3) y abre la tapa hacia arriba.'],'sports-bag':['BOLSA DE DEPORTE','Abre las tres cremalleras en orden (1, 2, 3) y despliega la solapa.'],'garden-box':['CAJA DE JARDINERÍA','Levanta los tres cierres en orden (1, 2, 3) y abre la tapa.']};
const PALETTE={backpack:['#3f7fb0','#2c5878','#f2c14e'],locker:['#7d8e99','#4f5e68','#e2e6e8'],case:['#2a2f36','#14171c','#c9ced4'],'sports-bag':['#d9483b','#8e2a22','#f4f1e6'],'garden-box':['#a8763f','#6b4a24','#7fbf5a']};

// ------------------------------------------------------------- minijuego
export function mountChestGame(root,chest,{submit,tone=()=>{}}){
 const [title,brief]=THEME_TEXT[chest.theme]||THEME_TEXT.backpack,[body,dark,accent]=PALETTE[chest.theme]||PALETTE.backpack;
 const mech=createMechanism(root,{title,subtitle:'COFRE · '+(chest.label||'').toUpperCase(),instructions:brief,machine:'chest',tone,reduced:!!root.ownerDocument.documentElement.dataset.reducedEffects});
 mech.onSubmit(async value=>{await submit(value);});
 const api=mech.api,c=chest.challenge,order=[],nums=c.order;let lid=0,lidDrag=null,wrongAt=-1e9;
 api.setAnswer(()=>({order:[...order],lid:lid>=1}));
 api.setValid(()=>order.length===3&&lid>=1,{settle:.15});
 mech.setDraw((api,hw,ctx,time)=>{
  const b=stageBox(api),done=order.length===3;
  chassis(hw,api,{label:'COFRE',status:done?(lid>=1?'¡ABIERTO!':'TIRA DE LA TAPA ↑'):`CIERRES ${order.length}/3`,level:(order.length+lid)/4,ok:lid>=1,bad:time-wrongAt<600});
  const cx=b.x+b.w/2,top=b.y+b.h*.2,w=b.w*.78,h=b.h*.68,x=cx-w/2;
  // Cuerpo del cofre.
  hw.plate(x,top+h*.25,w,h*.75,{material:'plastic',r:18,depth:6,light:.5});
  ctx.fillStyle=body;ctx.beginPath();ctx.roundRect(x+6,top+h*.25+6,w-12,h*.75-12,14);ctx.fill();
  ctx.fillStyle=dark;ctx.fillRect(x+6,top+h*.62,w-12,6);
  // Tapa: se levanta con el arrastre.
  const lift=lid*h*.32;
  ctx.save();ctx.translate(0,-lift);
  ctx.fillStyle=dark;ctx.beginPath();ctx.roundRect(x,top,w,h*.3,16);ctx.fill();ctx.fillStyle=body;ctx.beginPath();ctx.roundRect(x+5,top+5,w-10,h*.3-10,12);ctx.fill();
  if(done&&lid<1){ctx.fillStyle='#fffaf0';ctx.font='800 22px Trebuchet MS, sans-serif';ctx.textAlign='center';ctx.fillText('↑ ↑ ↑',cx,top+h*.19+Math.sin(time/180)*3);}
  ctx.restore();
  if(lid>0){ctx.fillStyle='#1b1208';ctx.globalAlpha=Math.min(1,lid);ctx.fillRect(x+12,top+h*.25,w-24,Math.min(lift,h*.2));ctx.globalAlpha=1;}
  // Tres cierres numerados.
  for(let i=0;i<3;i++){const lx=x+w*(.2+i*.3)-34,ly=top+h*.32,openL=order.includes(i);
   hw.plate(lx,ly,68,84,{material:openL?'good':'steel',r:10,depth:openL?2:5,light:.6});
   ctx.fillStyle=openL?'#2f6f73':accent;ctx.beginPath();ctx.roundRect(lx+12,ly+(openL?46:12),44,26,7);ctx.fill();
   hw.text(String(nums[i]),lx+34,ly+44,{size:30,color:openL?'#e9fff6':'#1b2b36',shadow:false});
   if(!done&&!openL)api.zone(lx-10,ly-10,88,104,{down:()=>{const next=order.length+1;if(nums[i]===next){order.push(i);api.feedback('tick',420+next*90);api.note(order.length===3?'Ahora tira de la tapa hacia arriba.':'');}else{order.length=0;wrongAt=time;api.feedback('error');api.note('Ese no era el siguiente. Empieza otra vez por el 1.');}api.refresh();}});}
  if(done&&lid<1)api.zone(x,top-40,w,h*.55,{down:p=>{lidDrag=p.y;},move:p=>{if(lidDrag===null)return;lid=Math.max(0,Math.min(1,(lidDrag-p.y)/(h*.4)));api.refresh();},up:()=>{if(lid<1)lid=0;lidDrag=null;api.refresh();}});
 });
 return ()=>mech.dispose();
}

// ------------------------------------------------------------- mundo
export function drawChest(c,ch,opened,time,near=false){
 const [body,dark,accent]=PALETTE[ch.theme]||PALETTE.backpack,x=ch.x,y=ch.y;c.save();c.translate(x,y);
 if(shadowsOn())oval(c,4,10,30,10,'#0a142a33');
 if(ch.theme==='backpack'){box(c,-20,-26,40,40,12,body,dark,3);box(c,-14,-8,28,16,6,dark);if(!opened)box(c,-16,-30,32,16,8,accent,dark,2);else box(c,-12,-30,24,6,3,'#1b1208');for(const sx of [-15,11])box(c,sx,-22,4,30,2,dark);}
 else if(ch.theme==='locker'){box(c,-18,-40,36,52,4,body,dark,3);for(let i=0;i<3;i++)c.fillRect(-10,-34+i*6,20,2);if(opened){box(c,-18,-40,10,52,3,'#1b1208');}else box(c,10,-14,4,10,2,accent);}
 else if(ch.theme==='case'){box(c,-26,-20,52,32,6,body,'#6b737c',3);for(const [sx,sy] of [[-26,-20],[20,-20],[-26,6],[20,6]])box(c,sx,sy,6,6,2,accent);if(opened)box(c,-22,-26,44,8,3,'#1b1208');else box(c,-6,-24,12,6,2,accent);}
 else if(ch.theme==='sports-bag'){oval(c,0,-6,30,16,body,dark,3);c.strokeStyle=accent;c.lineWidth=3;c.beginPath();c.moveTo(-22,-8);c.lineTo(22,-8);c.stroke();if(opened)oval(c,0,-8,18,5,'#1b1208');c.strokeStyle=dark;c.lineWidth=4;c.beginPath();c.arc(0,-16,12,Math.PI,0);c.stroke();}
 else{box(c,-24,-22,48,34,5,body,dark,3);for(let i=0;i<3;i++){c.fillStyle=dark;c.fillRect(-24,-14+i*10,48,2);}if(opened)box(c,-20,-28,40,8,3,'#1b1208');else{oval(c,-8,-26,6,6,accent);oval(c,4,-28,5,5,'#5f9b45');}}
 if(near&&!opened){c.strokeStyle=`rgba(255,214,90,${.75+.25*Math.sin(time/200)})`;c.lineWidth=3;c.setLineDash([6,4]);c.beginPath();c.ellipse(0,-6,36,28,0,0,TAU);c.stroke();c.setLineDash([]);}
 c.restore();
}
function itemGlyph(c,kind,x,y,s=1){c.save();c.translate(x,y);c.scale(s,s);
 if(kind==='turbo'){box(c,-12,-4,24,10,4,'#ff7185','#7a1f2c');c.fillStyle='#fff';c.beginPath();c.moveTo(-14,-4);c.lineTo(-20,-10);c.lineTo(-16,0);c.fill();}
 else if(kind==='flashlight'){box(c,-12,-4,18,8,3,'#4f5e68','#1b2b36');c.fillStyle='#ffe58a';c.beginPath();c.moveTo(6,-6);c.lineTo(14,-9);c.lineTo(14,9);c.lineTo(6,6);c.fill();}
 else if(kind==='camera'){box(c,-11,-7,22,14,3,'#2a2f36','#14171c');oval(c,0,0,5,5,'#7fb7c9','#14171c');}
 else if(kind==='decoy'){oval(c,-4,0,8,10,'#61e5c6','#1b2b36');oval(c,5,0,8,10,'#61e5c688','#1b2b36');}
 else if(kind==='cage'){c.strokeStyle='#8a9aa0';c.lineWidth=2;c.strokeRect(-10,-10,20,20);for(const v of [-5,0,5]){c.beginPath();c.moveTo(v,-10);c.lineTo(v,10);c.stroke();}}
 else if(kind==='shield'){c.fillStyle='#75aaff';c.beginPath();c.moveTo(0,-11);c.lineTo(10,-6);c.lineTo(8,6);c.lineTo(0,12);c.lineTo(-8,6);c.lineTo(-10,-6);c.closePath();c.fill();c.strokeStyle='#1b2b36';c.lineWidth=2;c.stroke();}
 else if(kind==='tracker'){for(const [fx,fy,a] of [[-5,4,-.3],[5,-4,.3]]){c.save();c.translate(fx,fy);c.rotate(a);oval(c,0,0,4,7,'#c9a96e','#5a4228',1.5);c.restore();}}
 c.restore();}
// Suelo: cofres de la planta, objetos soltados, huellas y cámaras propias.
export function drawItemsWorld(c,state,map,time,local,visible){
 const items=state.me?.items;if(!items)return;
 const opened=new Set(items.chests);
 for(const ch of map.chests||[]){if(!visible(ch))continue;const near=Math.hypot(local.x-ch.x,local.y-ch.y)<=115;drawChest(c,ch,opened.has(ch.id),time,near&&state.me.alive);}
 for(const g of items.ground||[]){if(!visible(g))continue;const bob=Math.sin(time/300+g.x)*3;if(shadowsOn())oval(c,g.x,g.y+6,16,6,'#0a142a33');oval(c,g.x,g.y-8+bob,17,17,'#fffaf0ee','#1b2b36',2);itemGlyph(c,g.kind,g.x,g.y-8+bob,1);}
 for(const f of items.footprints||[]){const alpha=Math.max(0,1-f.age/9000)*.85;c.save();c.globalAlpha=alpha;c.translate(f.x,f.y);c.rotate(f.a+Math.PI/2);oval(c,-4,0,3.4,6,'#3b2a18');oval(c,4,-3,3.4,6,'#3b2a18');c.restore();}
 for(const cam of items.cameras||[]){if(cam.floor!==state.me.floor)continue;c.save();c.translate(cam.x,cam.y);c.strokeStyle='#2a3a44';c.lineWidth=2;for(const a of [-.5,0,.5]){c.beginPath();c.moveTo(0,-6);c.lineTo(Math.sin(a)*12,8);c.stroke();}box(c,-9,-16,18,11,3,'#2a2f36','#14171c');oval(c,0,-10.5,3.5,3.5,items.watching===cam.uid?'#ff7185':'#7fb7c9');c.restore();}
}
// Encima de los personajes: barrotes de las jaulas y el escudo propio.
export function drawCage(c,x,y,time){c.save();c.translate(x,y);c.strokeStyle='#cfd8dc';c.lineWidth=3;c.globalAlpha=.9;box(c,-34,-96,68,104,8,null,'#5d6b72',4);for(let i=-24;i<=24;i+=12){c.beginPath();c.moveTo(i,-94);c.lineTo(i,6);c.stroke();}c.fillStyle='#5d6b72';c.fillRect(-36,-98,72,8);c.restore();}
export function drawShield(c,x,y,time,until,now){const left=until-now;if(left<=0)return;c.save();c.globalAlpha=left<5000?(.25+.25*Math.sin(time/90)):.38;const g=c.createRadialGradient(x,y-42,10,x,y-42,62);g.addColorStop(0,'rgba(117,170,255,0)');g.addColorStop(.8,'rgba(117,170,255,.45)');g.addColorStop(1,'rgba(160,200,255,.9)');c.fillStyle=g;c.beginPath();c.ellipse(x,y-42,48,62,0,0,TAU);c.fill();c.restore();}

// ------------------------------------------------------------- inventario
// Tres huecos visibles: mano vacía y dos objetos. Se pulsa para seleccionar;
// el objeto seleccionado muestra «usar» y «soltar».
export function inventoryMarkup(items,selected,now,role='crew'){
 const slots=items?.slots||[null,null];
 const slot=(i,s)=>{if(!s)return `<button type="button" class="inv-slot ${selected===i?'selected':''} ${i?'empty':''}" data-slot="${i}" aria-label="${i?'Ranura vacía':'Mano vacía'}"><span class="inv-icon">${i?'·':'✋'}</span><small>${i?'Vacío':'Mano'}</small></button>`;
  const d=ITEMS[s.kind],pct=s.max?Math.round(s.charge/s.max*100):100;return `<button type="button" class="inv-slot ${selected===i?'selected':''} ${s.active?'active':''}" data-slot="${i}" aria-label="${d.name}${s.max?`, ${pct}% de carga`:''}${s.active?', activo':''}" style="--charge:${pct}%"><span class="inv-icon">${d.icon}</span><small>${role==='impostor'&&s.kind==='shield'?'Anulador':d.name.split(' ')[0]}</small>${s.max?'<i class="inv-charge"></i>':''}</button>`;};
 const sel=selected?slots[selected-1]:null,d=sel&&ITEMS[sel.kind];
 const useLabel=!d?'':d.mode==='toggle'?(sel.active?'Desactivar':'Activar'):sel.kind==='camera'?(sel.placed?(items.watching===sel.uid?'Dejar de mirar':'Mirar'):'Colocar'):'Usar';
 return `<div class="inv-slots">${slot(0,null)}${slot(1,slots[0])}${slot(2,slots[1])}</div>${d?`<div class="inv-actions"><span class="inv-hint">${role==='impostor'&&sel.kind==='shield'?'Anulador de escudos: durante 30 s los escudos protectores no funcionan y puedes matar a quienes los lleven. Después recuperan su efecto si aún les queda tiempo.':d.hint}${role==='impostor'&&items.nullUntil>now?` · Anulando ${Math.ceil((items.nullUntil-now)/1000)} s`:''}</span><button type="button" class="inv-use" data-item-use="${selected-1}">${useLabel} <kbd>C</kbd></button><button type="button" class="inv-drop" data-item-drop="${selected-1}">Soltar <kbd>X</kbd></button></div>`:''}`;
}
