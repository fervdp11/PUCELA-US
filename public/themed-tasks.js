import {createMechanism} from './mechanism.js';
import {W,H,TAU,INK,clamp,ease,lerp,rr,ink,shade,txt,card,glow,THEME,backdrop,icon,piece,stepPiece,grab,inRect,near,screw,glass} from './task-kit.js';

// Tareas temáticas de PUCELA US BETA (Moss Club, El Palero Gym y Latasa´s House).
//
// Cada tarea es un pequeño juego propio, dibujado sobre un lienzo lógico de
// 640×440 con respuesta inmediata. El reto y la validación son los del
// servidor (game/tasks.js): aquí solo cambia cómo se ve y cómo se maneja. Las
// tareas se completan solas al resolverse; no hay botones de confirmación.

const ENGINES={};
const dots=(c,theme,n,k)=>{for(let i=0;i<n;i++){c.beginPath();c.arc(W-24-(n-1-i)*18,22,6,0,TAU);ink(c,i<k?THEME[theme].ok:'rgba(255,255,255,.18)',2);}};
const pick=(o,theme)=>o[theme]||o.school||o.club||Object.values(o)[0];

// ===========================================================================
// ORDENAR EN BANDEJAS (documents, delivery, exams, folders)
// ===========================================================================
ENGINES.sortline=({api,hw,c,theme,cfg,mech})=>{
 const vals=[...(c.samples||c.weights)],sorted=[...vals].sort((a,b)=>a-b),n=vals.length,SY=300;
 const gap=n===5?125:(W-140)/(n-1),sx=i=>70+i*gap,SW=Math.min(108,gap-8),IW=Math.min(88,gap-6);
 const items=vals.map((v,i)=>({v,slot:-1,home:i,...piece(sx(i),122)}));
 const slots=Array(n).fill(null);
 let wrongAt=-9e9,done=false;
 const fmt=cfg.fmt||(v=>String(v));
 const place=(it,j)=>{
  const from=it.slot,other=slots[j];
  if(from>=0)slots[from]=null;
  if(other&&other!==it){other.slot=from;if(from>=0)slots[from]=other;}
  slots[j]=it;it.slot=j;
  for(const q of items){if(q.slot>=0){q.hx=sx(q.slot);q.hy=SY+8;}else{q.hx=sx(q.home);q.hy=122;}}
  api.feedback('tick',360+j*60);
  if(slots.every(Boolean)){
   if(slots.every((q,k)=>q.v===sorted[k])){done=true;}
   else{wrongAt=performance.now();api.feedback('error');api.note(cfg.wrong||'El orden no es correcto.');}
  }else api.note('');
 };
 api.setAnswer(()=>slots.map(q=>q?q.v:-1));
 api.setValid(()=>done);
 mech.setDraw((api,hw,ctx,time,dt)=>{
  backdrop(ctx,hw,theme,time);
  const th=THEME[theme];
  // Bandeja de entrada
  card(ctx,28,56,W-56,138,{fill:pick(cfg.inFill||{},theme)||shade(th.panel,-.05),r:16});
  txt(ctx,cfg.inLabel,48,74,{size:12,color:th.dark,align:'left',weight:900});
  // Bandejas de destino
  txt(ctx,cfg.dir||'MENOR  ➜  MAYOR',W/2,228,{size:13,color:'#fff',stroke:'rgba(0,0,0,.45)'});
  const bad=performance.now()-wrongAt<1100;
  for(let i=0;i<n;i++){
   const x=sx(i);
   card(ctx,x-SW/2,SY-48,SW,128,{fill:cfg.trayFill||shade(th.panel,-.18),r:14,drop:4,hi:false});
   ctx.fillStyle='rgba(0,0,0,.2)';rr(ctx,x-SW/2+10,SY-38,SW-20,108,9);ctx.fill();
   if(bad&&slots[i]){ctx.lineWidth=4;ctx.strokeStyle='#ff6a6a';rr(ctx,x-SW/2,SY-48,SW,128,14);ctx.stroke();}
   txt(ctx,cfg.slotName?cfg.slotName(i):String(i+1),x,SY+96,{size:13,color:'#fff',stroke:'rgba(0,0,0,.5)'});
  }
  let animating=false;
  const order=[...items].sort((a,b)=>a.lift-b.lift||(a.drag?1:0)-(b.drag?1:0));
  for(const it of order){
   if(stepPiece(it,dt))animating=true;
   if(!it.drag&&!done)grab(api,it,IW,100,{onDrop:(p,pt)=>{
    let best=-1,bd=1e9;
    for(let j=0;j<n;j++){const d=Math.hypot(p.x-sx(j),p.y-(SY+8));if(d<bd){bd=d;best=j;}}
    if(best>=0&&bd<Math.max(60,gap*.68))place(p,best);
    else if(p.slot>=0&&p.y<200){slots[p.slot]=null;p.slot=-1;for(const q of items){if(q.slot>=0){q.hx=sx(q.slot);q.hy=SY+8;}else{q.hx=sx(q.home);q.hy=122;}}api.note('');}
   }});
   else if(it.drag)api.zone(0,0,0,0,{});
   const s=IW*(1+it.lift*.12);
   if(it.lift>0.01){ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(it.x+4,it.y+s*.42,s*.36,s*.1,0,0,TAU);ctx.fill();}
   cfg.draw(ctx,it.v,it.x,it.y-it.lift*6,s,hw);
  }
  if(animating)api.invalidate();
  dots(ctx,theme,n,slots.filter(Boolean).length);
 });
};

// ===========================================================================
// COLOCAR EN ESTANTES (stock): cada hueco pide un objeto concreto.
// ===========================================================================
ENGINES.stockrack=({api,hw,c,theme,cfg,mech})=>{
 const tgt=cfg.target?cfg.target(c):c.slots,n=tgt.length,slotPos=cfg.slotPos||(i=>({x:130+(i%3)*190,y:98+Math.floor(i/3)*120})),SWd=cfg.slotW||140,SHd=cfg.slotH||84;
 const home=cfg.itemHome||(id=>({x:62+id*103,y:372}));
 const items=Array.from({length:n},(_,id)=>({id,...piece(home(id).x,home(id).y),at:-1}));
 const slots=Array(n).fill(null);
 let shakeAt=-9e9;
 api.setAnswer(()=>slots.map(v=>v==null?-1:v));
 api.setValid(()=>slots.every((v,i)=>v===tgt[i]));
 mech.setDraw((api,hw,ctx,time,dt)=>{
  backdrop(ctx,hw,theme,time);const th=THEME[theme];
  card(ctx,24,44,W-48,236,{fill:cfg.shelfFill||shade(th.panel,-.1),r:16});
  for(let i=0;i<n;i++){
   const p=slotPos(i),ok=slots[i]!=null;
   if(!cfg.noPlank){ctx.fillStyle=cfg.plank||'#6b4526';rr(ctx,p.x-SWd/2-12,p.y+SHd/2-6,SWd+24,12,4);ink(ctx,cfg.plank||'#6b4526',2.5);}
   ctx.fillStyle='rgba(0,0,0,.16)';rr(ctx,p.x-SWd/2,p.y-SHd/2-2,SWd,SHd,8);ctx.fill();
   ctx.setLineDash([6,5]);ctx.lineWidth=2;ctx.strokeStyle=ok?th.ok:'rgba(255,255,255,.6)';rr(ctx,p.x-SWd/2,p.y-SHd/2-2,SWd,SHd,8);ctx.stroke();ctx.setLineDash([]);
   if(!ok){txt(ctx,cfg.labels[tgt[i]],p.x,p.y-SHd/2+14,{size:13,color:'#fff',stroke:'rgba(0,0,0,.55)'});
    ctx.globalAlpha=.28;cfg.draw(ctx,tgt[i],p.x,p.y+6,Math.min(52,SHd*.62));ctx.globalAlpha=1;}
  }
  card(ctx,24,308,W-48,108,{fill:shade(th.panel,-.22),r:16,hi:false});
  txt(ctx,cfg.tray,44,324,{size:11,color:'#fff',align:'left'});
  let moving=false;
  for(const it of [...items].sort((a,b)=>a.lift-b.lift)){
   if(it.gone)continue;
   if(stepPiece(it,dt))moving=true;
   if(!it.drag)grab(api,it,66,74,{onDrop:(p,pt)=>{
    let hit=-1;for(let j=0;j<n;j++){const s=slotPos(j);if(Math.abs(p.x-s.x)<SWd/2+8&&Math.abs(p.y-(s.y-2))<SHd/2+10)hit=j;}
    if(hit>=0&&slots[hit]==null&&tgt[hit]===p.id){slots[hit]=p.id;p.gone=true;p.at=hit;api.feedback('ok',560+hit*40);}
    else if(hit>=0){shakeAt=performance.now();api.feedback('tick',210);api.note('Ese no va en ese hueco.');}
   }});
   const s=66*(1+it.lift*.14);
   cfg.draw(ctx,it.id,it.x,it.y,s);
   txt(ctx,cfg.labels[it.id],it.x,it.y+s*.62,{size:10,color:'#fff',stroke:'rgba(0,0,0,.6)'});
  }
  for(let i=0;i<n;i++)if(slots[i]!=null){const p=slotPos(i);cfg.draw(ctx,slots[i],p.x,p.y+4,Math.min(74,SHd*.9));}
  if(moving)api.invalidate();
  dots(ctx,theme,n,slots.filter(v=>v!=null).length);
 });
};

// ===========================================================================
// CLASIFICAR EN CONTENEDORES (supplies)
// ===========================================================================
ENGINES.sortbins=({api,hw,c,theme,cfg,mech})=>{
 const n=c.items.length,home=i=>({x:84+(i%3)*236*.5+(i%3)*0+((i%3)*30),y:96+Math.floor(i/3)*78});
 const homeX=i=>110+(i%3)*210,homeY=i=>90+Math.floor(i/3)*84;
 const items=c.items.map((cat,i)=>({cat,i,...piece(homeX(i),homeY(i))}));
 const bins=[0,1,2].map(k=>({k,x:30+k*200,y:262,w:180,h:150}));
 const assigned=Array(n).fill(-1);let bounce=[0,0,0];
 api.setAnswer(()=>[...assigned]);
 api.setValid(()=>assigned.every((v,i)=>v===c.items[i]));
 mech.setDraw((api,hw,ctx,time,dt)=>{
  backdrop(ctx,hw,theme,time);const th=THEME[theme];
  card(ctx,24,40,W-48,176,{fill:shade(th.panel,-.08),r:16});
  bins.forEach((b,k)=>{
   bounce[k]=Math.max(0,bounce[k]-dt*4);const by=b.y-Math.sin(bounce[k]*Math.PI)*6;
   card(ctx,b.x,by,b.w,b.h,{fill:cfg.bin[k],r:14,hi:true});
   ctx.fillStyle='rgba(0,0,0,.35)';rr(ctx,b.x+14,by+34,b.w-28,b.h-50,8);ctx.fill();
   txt(ctx,cfg.labels[k],b.x+b.w/2,by+18,{size:15,color:'#fff',stroke:INK});
   icon(ctx,cfg.icons[k][0],b.x+b.w/2,by+b.h-44,50,{...(cfg.opt?.[k]||{}),alpha:.35});
  });
  let moving=false;
  for(const it of [...items].sort((a,b)=>a.lift-b.lift)){
   if(it.gone)continue;
   if(stepPiece(it,dt))moving=true;
   if(!it.drag)grab(api,it,66,66,{onDrop:(p)=>{
    const b=bins.find(b=>inRect(p,{x:b.x,y:b.y-20,w:b.w,h:b.h+30}));
    if(!b)return;
    if(b.k===p.cat){assigned[p.i]=b.k;p.gone=true;bounce[b.k]=1;api.feedback('ok',500+b.k*90);}
    else{api.feedback('error');api.note('Eso no va en '+cfg.labels[b.k]+'.');}
   }});
   const s=66*(1+it.lift*.16);
   if(it.lift>.01){ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(it.x+4,it.y+s*.42,s*.34,s*.09,0,0,TAU);ctx.fill();}
   icon(ctx,cfg.icons[it.cat][it.i%2],it.x,it.y,s,{...(cfg.opt?.[it.cat]||{}),color:cfg.colors?.[it.cat]?.[it.i%2]});
  }
  if(moving)api.invalidate();
  dots(ctx,theme,n,assigned.filter(v=>v>=0).length);
 });
};

// ===========================================================================
// RECOGER Y TIRAR (papers, trash): arrastra cada resto al contenedor.
// ===========================================================================
ENGINES.collect=({api,hw,c,theme,cfg,mech})=>{
 const ids=cfg.lever?[...c.items]:[...c.papers];
 const spot=i=>({x:62+(i%4)*104+((i*37)%30)-8,y:70+Math.floor(i/4)*84+((i*53)%24)});
 const bin={x:452,y:110,w:130,h:196};
 const items=ids.map(i=>({i,...piece(spot(i).x,spot(i).y)}));
 const removed=[];let lever=0,leverDrag=false,crush=0;
 api.setAnswer(()=>cfg.lever?{removed:[...removed],lever:Math.round(lever)}:[...removed].sort((a,b)=>a-b));
 api.setValid(()=>cfg.lever?(removed.length===ids.length&&lever>=100):removed.length===ids.length);
 mech.setDraw((api,hw,ctx,time,dt)=>{
  backdrop(ctx,hw,theme,time);const th=THEME[theme];
  card(ctx,24,44,410,348,{fill:cfg.floor||shade(th.panel,-.1),r:18});
  cfg.ground?.(ctx,24,44,410,348);
  // contenedor
  const full=removed.length/ids.length;
  card(ctx,bin.x,bin.y,bin.w,bin.h,{fill:cfg.binFill,r:12,hi:true});
  ctx.fillStyle='rgba(0,0,0,.45)';rr(ctx,bin.x+12,bin.y+14,bin.w-24,34,8);ctx.fill();
  txt(ctx,cfg.binLabel,bin.x+bin.w/2,bin.y+bin.h-24,{size:13,color:'#fff',stroke:INK});
  ctx.save();rr(ctx,bin.x+12,bin.y+14,bin.w-24,bin.h-70,8);ctx.clip();
  for(let k=0;k<removed.length;k++){const q=removed[k];icon(ctx,cfg.icon(q),bin.x+30+(k%3)*45,bin.y+bin.h-70-Math.floor(k/3)*24-6,36*(1-crush*.45),{color:cfg.color?.(q)});}
  ctx.restore();
  if(crush>0){ctx.fillStyle=`rgba(255,255,255,${crush*.18})`;rr(ctx,bin.x,bin.y,bin.w,bin.h,12);ctx.fill();}
  let moving=false;
  for(const it of [...items].sort((a,b)=>a.lift-b.lift)){
   if(it.gone)continue;
   if(stepPiece(it,dt))moving=true;
   if(!it.drag)grab(api,it,62,62,{pad:10,onDrop:p=>{
    if(inRect(p,{x:bin.x-10,y:bin.y-30,w:bin.w+20,h:bin.h+40})){p.gone=true;removed.push(p.i);api.feedback('ok',440+removed.length*50);}
   }});
   const s=58*(1+it.lift*.2);
   if(it.lift>.01){ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(it.x+5,it.y+s*.4,s*.3,s*.08,0,0,TAU);ctx.fill();}
   icon(ctx,cfg.icon(it.i),it.x,it.y,s,{rot:((it.i*29)%7-3)*.12,color:cfg.color?.(it.i)});
  }
  if(cfg.lever){
   const ready=removed.length===ids.length,lx=bin.x+bin.w+10,top=bin.y+10,len=170;
   ctx.fillStyle='rgba(0,0,0,.3)';rr(ctx,lx-6,top,12,len+30,6);ctx.fill();
   const ly=top+14+lever/100*len;
   ctx.strokeStyle=INK;ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(lx,top+10);ctx.lineTo(lx,ly);ctx.stroke();
   ctx.strokeStyle=ready?'#e8d070':'#7a7a7a';ctx.lineWidth=3.4;ctx.beginPath();ctx.moveTo(lx,top+10);ctx.lineTo(lx,ly);ctx.stroke();
   ctx.beginPath();ctx.arc(lx,ly,15,0,TAU);ink(ctx,ready?'#e0453a':'#7a4a4a',3);
   if(ready){api.zone(lx-26,top-8,52,len+50,{
    down:pt=>{leverDrag=true;},
    move:pt=>{lever=clamp((pt.y-top-14)/len*100,0,100);crush=lever/100;},
    up:()=>{leverDrag=false;if(lever<100){lever=0;crush=0;}else api.feedback('ok',300);}
   });}
   if(!ready)txt(ctx,'Vacía primero',lx,top+len+44,{size:10,color:'#fff',stroke:INK});
  }
  if(moving)api.invalidate();
  dots(ctx,theme,ids.length,removed.length);
 });
};

// ===========================================================================
// LIMPIAR SUPERFICIE (chalk): se arrastra la herramienta sobre las manchas.
// ===========================================================================
ENGINES.scrub=({api,hw,c,theme,cfg,mech})=>{
 const B={x:40,y:50,w:560,h:300},COLS=6,ROWS=4;
 const marks=c.dirt.map(idx=>({idx,x:B.x+((idx%COLS)+.5)*B.w/COLS+((idx*17)%24-12),y:B.y+(Math.floor(idx/COLS)+.5)*B.h/ROWS+((idx*29)%20-10),amt:1,seed:idx*3.7}));
 let last=null,tool={x:B.x+B.w-40,y:B.y+B.h+46,on:false},sparkle=[];
 const cleaned=()=>marks.filter(m=>m.amt<=.04).map(m=>m.idx).sort((a,b)=>a-b);
 api.setAnswer(()=>cleaned());
 api.setValid(()=>marks.every(m=>m.amt<=.04));
 const R=34;
 const wipe=(x,y)=>{for(const m of marks){if(m.amt<=.04)continue;const d=Math.hypot(m.x-x,m.y-y);if(d<R+30){m.amt-=.07*(1-d/(R+34));if(m.amt<=.04){m.amt=0;api.feedback('tick',520+Math.random()*200);for(let k=0;k<6;k++)sparkle.push({x:m.x,y:m.y,vx:(Math.random()-.5)*90,vy:-Math.random()*70,t:0});}}}};
 mech.setDraw((api,hw,ctx,time,dt)=>{
  backdrop(ctx,hw,theme,time);
  cfg.surface(ctx,hw,B,time);
  for(const m of marks){if(m.amt<=0)continue;cfg.mark(ctx,m,time);}
  api.zone(B.x-10,B.y-10,B.w+20,B.h+20+60,{
   down:pt=>{tool.on=true;tool.x=pt.x;tool.y=pt.y;last=pt;wipe(pt.x,pt.y);},
   move:pt=>{const dx=pt.x-last.x,dy=pt.y-last.y,d=Math.hypot(dx,dy),steps=Math.max(1,Math.ceil(d/9));for(let k=1;k<=steps;k++)wipe(last.x+dx*k/steps,last.y+dy*k/steps);last=pt;tool.x=pt.x;tool.y=pt.y;},
   up:()=>{tool.on=false;last=null;}
  });
  for(const s of sparkle){s.t+=dt;s.x+=s.vx*dt;s.y+=s.vy*dt;s.vy+=140*dt;ctx.globalAlpha=Math.max(0,1-s.t*2.2);ctx.fillStyle='#fff';ctx.fillRect(s.x-2,s.y-2,4,4);}
  ctx.globalAlpha=1;sparkle=sparkle.filter(s=>s.t<.45);
  cfg.tool(ctx,tool.x,tool.y,tool.on,time);
  const left=marks.filter(m=>m.amt>.04).length;
  dots(ctx,theme,marks.length>10?10:marks.length,Math.round((marks.length-left)/marks.length*(marks.length>10?10:marks.length)));
  if(sparkle.length||tool.on)api.invalidate();
 });
};

// ===========================================================================
// ORIENTAR PIEZAS (desks, lights): un toque gira un cuarto de vuelta.
// ===========================================================================
ENGINES.rotate=({api,hw,c,theme,cfg,mech})=>{
 const n=c.rotations.length,cols=3,rows=Math.ceil(n/cols);
 const cw=n>6?150:160,ch=n>6?108:150,ox=(W-cols*cw)/2,oy=n>6?50:56;
 const rot=[...c.rotations],ang=rot.map(r=>r*Math.PI/2),pop=Array(n).fill(0);
 api.setAnswer(()=>[...rot]);
 api.setValid(()=>rot.every(v=>v===0)&&ang.every(a=>Math.abs(a%TAU)<.02||Math.abs((a%TAU)-TAU)<.02),{settle:.2});
 mech.setDraw((api,hw,ctx,time,dt)=>{
  backdrop(ctx,hw,theme,time);const th=THEME[theme];
  cfg.stage?.(ctx,time);
  let moving=false;
  for(let i=0;i<n;i++){
   const x=ox+(i%cols)*cw+cw/2,y=oy+Math.floor(i/cols)*ch+ch/2;
   const target=rot[i]*Math.PI/2,diff=((target-ang[i]+Math.PI*3)%TAU)-Math.PI;
   ang[i]=Math.abs(diff)<.01?target:ang[i]+diff*(1-Math.exp(-14*dt));
   if(Math.abs(diff)>.01)moving=true;
   pop[i]=Math.max(0,pop[i]-dt*5);if(pop[i]>0)moving=true;
   const ok=rot[i]===0&&Math.abs(diff)<.05;
   card(ctx,x-cw/2+8,y-ch/2+6,cw-16,ch-12,{fill:ok?cfg.okFill:cfg.tile,r:14,drop:4,hi:false});
   api.zone(x-cw/2+8,y-ch/2+6,cw-16,ch-12,{down:()=>{rot[i]=(rot[i]+1)%4;pop[i]=1;api.feedback('tick',300+i*20);api.note('');}});
   ctx.save();ctx.translate(x,y);ctx.rotate(ang[i]);const s=Math.min(cw,ch)*(.62+pop[i]*.06);cfg.piece(ctx,s,ok,time);ctx.restore();
   if(ok){ctx.beginPath();ctx.arc(x+cw/2-24,y-ch/2+20,8,0,TAU);ink(ctx,th.ok,2);}
  }
  if(moving)api.invalidate();
  dots(ctx,theme,n>6?9:6,rot.filter(v=>v===0).length*(n>6?9:6)/n|0);
 });
};

// ===========================================================================
// REPETIR LA SECUENCIA (bell): campanas, pads o chorros.
// ===========================================================================
ENGINES.memory=({api,hw,c,theme,cfg,mech})=>{
 const seq=c.sequence,pads=[0,1,2,3].map(i=>({i,x:cfg.pos(i).x,y:cfg.pos(i).y,glow:0,sw:0}));
 const FREQ=[392,494,587,698];
 let state='intro',t=0,k=0,entered=[],done=false;
 api.animate(true);
 api.setAnswer(()=>[...entered]);
 api.setValid(()=>done);
 const ring=(i,vol)=>{pads[i].glow=1;pads[i].sw=1;api.tone?.(FREQ[i]*(theme==='club'?.5:1),.22,theme==='club'?'square':'sine',vol);};
 api.note('Escucha la secuencia…');
 mech.setDraw((api,hw,ctx,time,dt)=>{
  backdrop(ctx,hw,theme,time);const th=THEME[theme];
  t+=dt;
  if(state==='intro'&&t>.7){state='show';t=0;k=0;}
  else if(state==='show'){
   if(t>=.62){t=0;if(k<seq.length){ring(seq[k],.05);k++;}else{state='input';entered=[];api.note('Tu turno: repite la secuencia.');}}
  }else if(state==='retry'&&t>1){state='show';t=0;k=0;entered=[];api.note('Escucha otra vez…');}
  cfg.scene(ctx,time);
  for(const p of pads){
   p.glow=Math.max(0,p.glow-dt*2.6);p.sw=Math.max(0,p.sw-dt*1.3);
   api.zone(p.x-cfg.hit.w/2,p.y-cfg.hit.h/2,cfg.hit.w,cfg.hit.h,{down:()=>{
    if(state!=='input'||done)return;
    ring(p.i,.06);
    if(p.i===seq[entered.length]){entered.push(p.i);if(entered.length===seq.length){done=true;api.note('');}}
    else{api.feedback('error');api.note('Esa no era. Vuelve a escuchar.');state='retry';t=0;}
   }});
   cfg.pad(ctx,p,time);
  }
  // marcador de progreso de la secuencia
  for(let j=0;j<seq.length;j++){ctx.beginPath();ctx.arc(W/2-(seq.length-1)*13+j*26,H-30,8,0,TAU);ink(ctx,j<(state==='input'?entered.length:0)?th.ok:'rgba(255,255,255,.2)',2);}
  if(state==='show')txt(ctx,'ESCUCHA',W/2,H-58,{size:13,color:'#fff',stroke:INK});
  if(state==='input'&&!done)txt(ctx,'TU TURNO',W/2,H-58,{size:13,color:th.accent,stroke:INK});
 });
 return ()=>api.animate(false);
};

// ===========================================================================
// TECLADO CON NOTA (code): el código está en una nota pegada al lado.
// ===========================================================================
ENGINES.keypad=({api,hw,c,theme,cfg,mech})=>{
 const code=String(c.code);let value='',wrongAt=-9e9,okAt=-1,press=null,pressAt=0;
 api.setAnswer(()=>value);
 api.setValid(()=>value===code);
 const keys=[[1,2,3],[4,5,6],[7,8,9],['x',0,'lock']];
 const KX=70,KY=128,KW=82,KH=64,GAP=10;
 const push=(d)=>{
  if(value===code||performance.now()-wrongAt<500)return;
  press=d;pressAt=performance.now();
  if(d==='x'){value='';api.feedback('tick',250);api.note('');return;}
  if(value.length>=code.length)return;
  value+=d;api.feedback('tick',380+Number(d)*38);
  if(value.length===code.length&&value!==code){wrongAt=performance.now();api.feedback('error');api.note('Código incorrecto. Revisa la nota.');setTimeout(()=>{if(value!==code)value='';},480);}
 };
 const onKey=e=>{if(/^[0-9]$/.test(e.key))push(e.key);else if(e.key==='Backspace'||e.key==='Escape')push('x');};
 mech.canvas.addEventListener('keydown',onKey);
 mech.setDraw((api,hw,ctx,time,dt)=>{
  backdrop(ctx,hw,theme,time);const th=THEME[theme];
  card(ctx,38,28,290,384,{fill:cfg.body,r:18});
  // pantalla
  ctx.fillStyle='#04070a';rr(ctx,56,44,254,62,10);ink(ctx,'#04070a',3,'#7b8794');
  const bad=performance.now()-wrongAt<500,good=value===code;
  for(let i=0;i<code.length;i++){const ch=value[i];txt(ctx,ch!=null?ch:'·',86+i*46,76,{size:36,color:good?'#8fe6c2':bad?'#ff7a7a':'#e8f4f0',weight:700});}
  keys.forEach((row,r)=>row.forEach((k,cc)=>{
   const x=KX+cc*(KW+GAP)-8,y=KY+r*(KH+GAP)+6,down=press===k&&performance.now()-pressAt<140;
   if(k==='lock'){ctx.beginPath();rr(ctx,x+KW/2-16,y+KH/2-4,32,26,5);ink(ctx,good?'#8fe6c2':bad?'#ff7a7a':'#aab5bf',2.5);ctx.beginPath();ctx.arc(x+KW/2,y+KH/2-4,11,Math.PI,0);ctx.lineWidth=4;ctx.strokeStyle=good?'#8fe6c2':'#aab5bf';ctx.stroke();return;}
   api.zone(x,y,KW,KH,{down:()=>push(k)});
   const dy=down?4:0;
   ctx.fillStyle='rgba(0,0,0,.35)';rr(ctx,x,y+6,KW,KH,10);ctx.fill();
   rr(ctx,x,y+dy,KW,KH-dy*0+0,10);ink(ctx,k==='x'?'#d9573a':'#c9ced3',3);
   ctx.fillStyle='rgba(255,255,255,.35)';rr(ctx,x+4,y+dy+4,KW-8,12,6);ctx.fill();
   if(k==='x'){ctx.strokeStyle='#fff';ctx.lineWidth=6;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x+KW/2-12,y+KH/2-12+dy);ctx.lineTo(x+KW/2+12,y+KH/2+12+dy);ctx.moveTo(x+KW/2+12,y+KH/2-12+dy);ctx.lineTo(x+KW/2-12,y+KH/2+12+dy);ctx.stroke();}
   else txt(ctx,String(k),x+KW/2,y+KH/2+dy,{size:34,color:'#1b232b',weight:700});
  }));
  // nota
  ctx.save();ctx.translate(480,170);ctx.rotate(.08);
  ctx.fillStyle='rgba(0,0,0,.28)';rr(ctx,-100,-86,206,190,6);ctx.fill();
  rr(ctx,-104,-92,206,190,6);ink(ctx,cfg.note,2.5,'rgba(0,0,0,.45)');
  txt(ctx,cfg.noteTitle,0,-60,{size:14,color:'#3d2d08',weight:800});
  txt(ctx,code.split('').join(' '),0,0,{size:36,color:'#3d2d08',weight:800});
  txt(ctx,cfg.noteSub,0,52,{size:11,color:'#5a4510',weight:700});
  ctx.restore();
  icon(ctx,cfg.deco,520,350,60,{});
  if(performance.now()-pressAt<160||bad)api.invalidate();
 });
 return ()=>mech.canvas.removeEventListener('keydown',onKey);
};

// ===========================================================================
// SACAR EL EJEMPLAR PEDIDO (book): se arrastra al lector.
// ===========================================================================
ENGINES.shelf=({api,hw,c,theme,cfg,mech})=>{
 const n=c.titles.length,PAL=['#d6574a','#4b86d6','#4fb06a','#e0a93a','#8a5ad6','#d6709a','#3cb0b8','#c9742a','#5a6bd6','#8dbf3a','#d65a8a','#46a0d6'];
 const spine=cfg.style==='spine';
 const sw=spine?48:70,sh=spine?(i=>96+((i*37)%34)):(()=>cfg.style==='cover'?92:70);
 const per=6,gx=spine?54:76;
 const home=i=>({x:62+(i%per)*gx+(spine?0:4),y:(i<per?(spine?190:150):(spine?340:300))-sh(i)/2});
 const items=c.titles.map((t,i)=>({i,t,...piece(home(i).x,home(i).y)}));
 const scan={x:508,y:268,w:118,h:128};
 let selected=-1,scanT=0,scanning=false;
 api.setAnswer(()=>selected);
 api.setValid(()=>selected===c.target&&scanT>=1);
 mech.setDraw((api,hw,ctx,time,dt)=>{
  backdrop(ctx,hw,theme,time);const th=THEME[theme];
  card(ctx,18,56,452,368,{fill:cfg.shelf,r:16});
  for(const by of spine?[190,340]:[158,308]){ctx.fillStyle=cfg.plank;rr(ctx,26,by+(spine?0:12),436,12,3);ink(ctx,cfg.plank,2.5);}
  // pedido
  card(ctx,18,10,452,40,{fill:'#fff6d6',r:10,drop:3,hi:false});
  txt(ctx,'PEDIDO:',32,31,{size:12,color:'#7a5a10',align:'left'});
  txt(ctx,c.titles[c.target],112,31,{size:20,color:'#1b232b',align:'left'});
  // lector
  card(ctx,scan.x-8,scan.y-14,scan.w+16,scan.h+28,{fill:'#2c3946',r:14});
  ctx.fillStyle='#0d1822';rr(ctx,scan.x,scan.y,scan.w,scan.h,10);ctx.fill();
  txt(ctx,cfg.reader,scan.x+scan.w/2,scan.y-1+0,{size:10,color:'#9ab6bd'});
  ctx.strokeStyle=scanT>=1?'#8fe6c2':'#4fd0ff';ctx.lineWidth=2;ctx.setLineDash([6,5]);rr(ctx,scan.x+6,scan.y+14,scan.w-12,scan.h-20,8);ctx.stroke();ctx.setLineDash([]);
  if(scanning){scanT=Math.min(1,scanT+dt/.8);const ly=scan.y+16+(scan.h-24)*(.5-.5*Math.cos(scanT*Math.PI*2));ctx.fillStyle='rgba(79,208,255,.7)';ctx.fillRect(scan.x+8,ly,scan.w-16,3);if(scanT>=1){scanning=false;api.feedback('ok',880);}api.invalidate();}
  if(scanT>=1)txt(ctx,'OK ✓',scan.x+scan.w/2,scan.y+scan.h/2+10,{size:26,color:'#8fe6c2'});
  let moving=false;
  for(const it of [...items].sort((a,b)=>a.lift-b.lift)){
   if(it.gone)continue;
   if(stepPiece(it,dt,12))moving=true;
   if(selected<0&&!it.drag)grab(api,it,sw,sh(it.i),{pad:6,onDrop:p=>{
    if(inRect(p,{x:scan.x-12,y:scan.y-20,w:scan.w+24,h:scan.h+40})){
     if(p.i===c.target){selected=p.i;p.hx=scan.x+scan.w/2;p.hy=scan.y+scan.h/2+(spine?0:0);scanning=true;scanT=0;api.note('Leyendo ejemplar…');}
     else{api.feedback('error');api.note('Ese no es el ejemplar pedido.');}
    }
   }});
   const s=1+it.lift*.1;ctx.save();ctx.translate(it.x,it.y);ctx.scale(s,s);
   const w=sw,h=sh(it.i),col=PAL[it.i%12];
   if(it.lift>.01||selected===it.i){ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(5,h/2,w*.5,6,0,0,TAU);ctx.fill();}
   rr(ctx,-w/2,-h/2,w,h,spine?4:7);ink(ctx,col,2.5);
   ctx.fillStyle='rgba(255,255,255,.22)';ctx.fillRect(-w/2+4,-h/2+4,6,h-8);
   if(spine){ctx.fillStyle='rgba(255,255,255,.55)';ctx.fillRect(-w/2+4,-h/2+14,w-8,3);ctx.fillRect(-w/2+4,h/2-18,w-8,3);ctx.save();ctx.rotate(-Math.PI/2);txt(ctx,it.t,0,0,{size:12,color:'#fff',stroke:'rgba(0,0,0,.45)'});ctx.restore();}
   else{if(cfg.style==='sleeve'){ctx.beginPath();ctx.arc(w*.2,-h*.12,w*.3,0,TAU);ink(ctx,'#1b1b24',2);ctx.beginPath();ctx.arc(w*.2,-h*.12,w*.08,0,TAU);ink(ctx,col,1.5);}
    txt(ctx,it.t,0,h/2-12,{size:cfg.style==='cover'?10:10,color:'#fff',stroke:'rgba(0,0,0,.55)'});}
   ctx.restore();
  }
  if(moving)api.invalidate();
 });
};

// ===========================================================================
// INTERRUPTORES (computer): copia el patrón de la pantalla.
// ===========================================================================
ENGINES.switches=({api,hw,c,theme,cfg,mech})=>{
 const n=c.target.length,states=[...c.states],pos=Array.from({length:n},(_,i)=>states[i]?1:0);
 const sx=i=>96+i*112;
 api.setAnswer(()=>[...states]);
 api.setValid(()=>states.every((v,i)=>v===c.target[i]),{settle:.35});
 mech.setDraw((api,hw,ctx,time,dt)=>{
  backdrop(ctx,hw,theme,time);const th=THEME[theme];
  card(ctx,28,28,W-56,384,{fill:cfg.body,r:20});
  // pantalla con el patrón a copiar
  ctx.fillStyle='#04141a';rr(ctx,70,56,W-140,110,12);ink(ctx,'#04141a',4,'#7b8794');
  txt(ctx,cfg.screenTitle,W/2,76,{size:12,color:'#6fd0c0',weight:700});
  for(let i=0;i<n;i++){ctx.beginPath();rr(ctx,sx(i)-28,92,56,56,8);ink(ctx,c.target[i]?'#1f6b55':'#10212a',2,'#3a6a6a');txt(ctx,c.target[i]?'I':'O',sx(i),121,{size:28,color:c.target[i]?'#8fe6c2':'#52707a',weight:900});}
  let moving=false;
  for(let i=0;i<n;i++){
   const want=states[i]?1:0;pos[i]+=(want-pos[i])*(1-Math.exp(-18*dt));if(Math.abs(want-pos[i])>.01)moving=true;
   const ok=states[i]===c.target[i];
   ctx.beginPath();ctx.arc(sx(i),214,8,0,TAU);ink(ctx,ok?'#8fe6c2':'#4d2a2a',2);
   api.zone(sx(i)-34,236,68,130,{down:()=>{states[i]=states[i]?0:1;api.feedback('tick',280+states[i]*200);api.note('');}});
   card(ctx,sx(i)-30,240,60,122,{fill:'#2a3541',r:14,drop:3,hi:false});
   ctx.fillStyle='#0c1218';rr(ctx,sx(i)-14,252,28,98,12);ctx.fill();
   const ky=252+(1-pos[i])*52;
   rr(ctx,sx(i)-22,ky,44,46,10);ink(ctx,pos[i]>.5?'#6fd09a':'#c9ced3',3);
   ctx.fillStyle='rgba(255,255,255,.35)';rr(ctx,sx(i)-16,ky+4,32,9,5);ctx.fill();
   txt(ctx,String(i+1),sx(i),386,{size:12,color:'#c9ced3'});
  }
  if(moving)api.invalidate();
 });
};

// ===========================================================================
// Utilidades de mando: giro por ángulo y deslizador, sin saltos al agarrar.
// ===========================================================================
export const A0=-Math.PI*.75,ASPAN=Math.PI*1.5;
export function knobAt(api,x,y,r,get,set){
 let ref=0,acc=0;
 api.zone(x-r-8,y-r-8,(r+8)*2,(r+8)*2,{
  down:pt=>{ref=Math.atan2(pt.y-y,pt.x-x);acc=get();},
  move:pt=>{const a=Math.atan2(pt.y-y,pt.x-x);let d=a-ref;while(d>Math.PI)d-=TAU;while(d<-Math.PI)d+=TAU;ref=a;acc=clamp(acc+d/ASPAN*100,0,100);set(Math.round(acc));}
 });
}
export function sliderAt(api,x,y0,len,get,set,vertical=true,w=44){
 let off=0;const pos=v=>vertical?y0+len-v/100*len:x+v/100*len;
 const zr=vertical?[x-w/2-8,y0-14,w+16,len+28]:[x-14,y0-w/2-8,len+28,w+16];
 api.zone(...zr,{
  down:pt=>{const cur=pos(get());off=(vertical?pt.y:pt.x)-cur;if(Math.abs(off)>26)off=0;set(clamp(Math.round(vertical?(y0+len-(pt.y-off))/len*100:((pt.x-off)-x)/len*100),0,100));},
  move:pt=>{set(clamp(Math.round(vertical?(y0+len-(pt.y-off))/len*100:((pt.x-off)-x)/len*100),0,100));}
 });
}
export const symbol=(c,k,x,y,s,col='#fff')=>{c.save();c.translate(x,y);c.fillStyle=col;c.strokeStyle=INK;c.lineWidth=2;c.beginPath();
 if(k===0)c.arc(0,0,s,0,TAU);
 else if(k===1){c.moveTo(0,-s);c.lineTo(s,s*.8);c.lineTo(-s,s*.8);c.closePath();}
 else if(k===2){c.moveTo(-s,-s*.5);c.lineTo(-s*.5,-s);c.lineTo(0,-s*.45);c.lineTo(s*.5,-s);c.lineTo(s,-s*.5);c.lineTo(s*.45,0);c.lineTo(s,s*.5);c.lineTo(s*.5,s);c.lineTo(0,s*.45);c.lineTo(-s*.5,s);c.lineTo(-s,s*.5);c.lineTo(-s*.45,0);c.closePath();}
 else for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?s*.45:s;c.lineTo(Math.cos(a)*r,Math.sin(a)*r);}
 if(k===3)c.closePath();c.fill();c.stroke();c.restore();};

// ===========================================================================
// CABLES (wires, german, speaker): arrastra cada cable a su conector.
// ===========================================================================
ENGINES.cables=({api,hw,c,theme,cfg,mech})=>{
 const n=4,order=c.order,links=Array(n).fill(-1),LY=i=>86+i*84,LX=96,RX=500;
 let drag=null,warned=false,gain=cfg.gain?50:0;
 const COL=cfg.colors||['#e8453a','#3b82f6','#f5d033','#e056c8'];
 const okLinks=()=>links.every((v,i)=>v===order.indexOf(i));
 const okGain=()=>!cfg.gain||Math.abs(gain-c.gain)<=2;
 api.setAnswer(()=>cfg.gain?{links:[...links],gain}:[...links]);
 api.setValid(()=>okLinks()&&okGain(),{settle:cfg.gain?.35:.15});
 const socketAt=pt=>{for(let j=0;j<n;j++)if(Math.hypot(pt.x-RX,pt.y-LY(j))<50)return j;return -1;};
 const cableDraw=(ctx,x0,y0,x1,y1,col,hot)=>{
  const sag=Math.min(60,Math.abs(x1-x0)*.18)+14;
  const path=()=>{ctx.beginPath();ctx.moveTo(x0,y0);ctx.bezierCurveTo(x0+(x1-x0)*.4,y0+sag,x0+(x1-x0)*.6,y1+sag,x1,y1);};
  ctx.lineCap='round';path();ctx.strokeStyle='rgba(0,0,0,.3)';ctx.lineWidth=15;ctx.save();ctx.translate(0,5);ctx.stroke();ctx.restore();
  path();ctx.strokeStyle=INK;ctx.lineWidth=15;ctx.stroke();path();ctx.strokeStyle=col;ctx.lineWidth=10;ctx.stroke();path();ctx.strokeStyle='rgba(255,255,255,.4)';ctx.lineWidth=3;ctx.save();ctx.translate(0,-2);ctx.stroke();ctx.restore();
  ctx.save();ctx.translate(x1,y1);const ang=Math.atan2(y1-(y0+sag*.5),x1-(x0+(x1-x0)*.6));ctx.rotate(Math.max(-.9,Math.min(.9,ang)));rr(ctx,-4,-12,26,24,5);ink(ctx,shade(col,-.15),3);ctx.fillStyle='#d4d9de';ctx.fillRect(18,-6,10,4);ctx.fillRect(18,2,10,4);ctx.restore();
 };
 mech.setDraw((api,hw,ctx,time,dt)=>{
  backdrop(ctx,hw,theme,time);const th=THEME[theme];
  card(ctx,28,36,W-56,H-72+(cfg.gain?-20:0),{fill:cfg.panel,r:20});
  for(const [x,y] of [[44,52],[W-44,52],[44,H-52+(cfg.gain?-20:0)],[W-44,H-52+(cfg.gain?-20:0)]]){ctx.beginPath();ctx.arc(x,y,5,0,TAU);ink(ctx,'#b8c2cc',2);ctx.strokeStyle='#4a5560';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(x-3,y-3);ctx.lineTo(x+3,y+3);ctx.stroke();}
  txt(ctx,cfg.leftHead,LX-34,56,{size:11,color:cfg.headColor,weight:900});txt(ctx,cfg.rightHead,RX+36,56,{size:11,color:cfg.headColor,weight:900});
  // enchufes derechos
  for(let j=0;j<n;j++){
   const id=order[j],y=LY(j),used=links.indexOf(j)>=0;
   rr(ctx,RX-26,y-24,64,48,10);ink(ctx,'#39434d',3);ctx.beginPath();ctx.arc(RX+6,y,15,0,TAU);ink(ctx,used?shade(COL[id],-.55):'#10161c',2.5);ctx.beginPath();ctx.arc(RX+6,y,8,0,TAU);ink(ctx,COL[id],2);
   cfg.right(ctx,id,RX+68,y,j);
   if(used){api.zone(RX-30,y-26,60,52,{down:pt=>{const i=links.indexOf(j);if(i>=0){links[i]=-1;drag={i,x:pt.x,y:pt.y};warned=false;}},move:pt=>{if(drag){drag.x=pt.x;drag.y=pt.y;}},up:pt=>endDrag(pt)});}
  }
  // clavijas izquierdas y cables
  for(let i=0;i<n;i++){
   const y=LY(i);
   rr(ctx,LX-76,y-24,90,48,10);ink(ctx,'#39434d',3);
   cfg.left(ctx,i,LX-34,y);
   const lo=links[i]>=0,col=COL[i];
   if(lo)cableDraw(ctx,LX+14,y,RX-6,LY(links[i]),col);
   else if(drag&&drag.i===i)cableDraw(ctx,LX+14,y,drag.x,drag.y,col);
   ctx.beginPath();ctx.arc(LX+8,y,14,0,TAU);ink(ctx,col,3);ctx.beginPath();ctx.arc(LX+8,y,6,0,TAU);ink(ctx,'#10161c',2);
   if(!lo&&!(drag&&drag.i===i))api.zone(LX-30,y-28,72,56,{down:pt=>{drag={i,x:pt.x,y:pt.y};warned=false;},move:pt=>{drag.x=pt.x;drag.y=pt.y;},up:pt=>endDrag(pt)});
  }
  if(cfg.gain){
   const gx=190,gy=388,len=260,v=gain/100;
   card(ctx,28,H-70,W-56,52,{fill:cfg.panel,r:14,hi:false,drop:0});
   txt(ctx,'GANANCIA',104,gy,{size:12,color:cfg.headColor,weight:900});
   ctx.fillStyle='#0c1218';rr(ctx,gx,gy-6,len,12,6);ink(ctx,'#0c1218',2,'#6a7682');
   const tx=gx+c.gain/100*len;ctx.fillStyle='rgba(143,230,194,.35)';ctx.fillRect(gx+(c.gain-2)/100*len,gy-12,4/100*len+0,24);
   ctx.beginPath();ctx.moveTo(tx,gy-18);ctx.lineTo(tx-6,gy-26);ctx.lineTo(tx+6,gy-26);ctx.closePath();ctx.fillStyle='#8fe6c2';ctx.fill();
   rr(ctx,gx,gy-6,len*v,12,6);ctx.fillStyle=okGain()?'#8fe6c2':th.accent;ctx.fill();
   sliderAt(api,gx,gy,len,()=>gain,x=>{gain=x;api.note('');api.invalidate();},false,28);
   ctx.beginPath();ctx.arc(gx+len*v,gy,14,0,TAU);ink(ctx,'#e8eef2',3);txt(ctx,String(gain),gx+len+40,gy,{size:14,color:'#fff'});
  }
  dots(ctx,theme,n,links.filter((v,i)=>v===order.indexOf(i)).length);
  if(drag)api.invalidate();
 });
 function endDrag(pt){
  if(!drag)return;const j=socketAt(pt),i=drag.i;drag=null;
  if(j>=0){const o=links.indexOf(j);if(o>=0)links[o]=-1;links[i]=j;api.feedback('tick',380+j*70);
   if(links.every(v=>v>=0)&&!okLinks()){api.feedback('error');api.note('Alguna conexión no coincide. Revisa los cables.');}else api.note('');}
  api.invalidate();
 }
};

// ===========================================================================
// MANDOS (bath, calibrate): tres mandos hasta su marca.
// ===========================================================================
ENGINES.levels=({api,hw,c,theme,cfg,mech})=>{
 const targets=c.levels||c.targets,n=3,tol=cfg.tol,vals=[50,50,50];
 const cx=i=>120+i*200;
 const inz=i=>Math.abs(vals[i]-targets[i])<=tol;
 api.setAnswer(()=>[...vals]);
 api.setValid(()=>targets.every((t,i)=>inz(i)),{settle:.5});
 mech.setDraw((api,hw,ctx,time,dt)=>{
  backdrop(ctx,hw,theme,time);const th=THEME[theme];
  card(ctx,24,34,W-48,H-68,{fill:cfg.panel,r:20});
  for(let i=0;i<n;i++){
   const x=cx(i),ok=inz(i);
   txt(ctx,cfg.names[i],x,62,{size:13,color:cfg.headColor,weight:900});
   cfg.control(ctx,hw,api,{x,i,v:vals[i],t:targets[i],tol,ok,time,set:v=>{vals[i]=v;api.note('');api.invalidate();},get:()=>vals[i]});
   ctx.beginPath();ctx.arc(x+58,64,6,0,TAU);ink(ctx,ok?'#8fe6c2':'#4d2a2a',2);
   txt(ctx,String(vals[i]),x,372,{size:26,color:ok?'#8fe6c2':'#fff',stroke:INK});
   txt(ctx,'objetivo '+targets[i],x,396,{size:11,color:cfg.headColor,weight:700});
  }
  dots(ctx,theme,3,vals.filter((v,i)=>inz(i)).length);
 });
};

// ===========================================================================
// MESA DE DJ (dj): tres canales a su nivel y enganche del pulso.
// ===========================================================================
ENGINES.dj=({api,hw,c,theme,cfg,mech})=>{
 const vals=[50,50,50],NAMES=['GRAVES','MEDIOS','AGUDOS'],cx=i=>110+i*120;
 let synced=null,phase=0,pressed=0;
 const ok=i=>Math.abs(vals[i]-c.levels[i])<=2;
 const BX=70,BW=500,BY=372;
 api.setAnswer(()=>({levels:[...vals],sync:synced}));
 api.setValid(()=>synced!==null&&c.levels.every((_,i)=>ok(i)),{settle:.4});
 api.animate(true);
 mech.setDraw((api,hw,ctx,time,dt)=>{
  backdrop(ctx,hw,theme,time);
  card(ctx,24,30,W-48,H-60,{fill:'#231a45',r:20});
  // platos
   ctx.beginPath();ctx.arc(496,150,92,0,TAU);ink(ctx,'#16102e',3,'#ff5fd2');
  phase+=dt*(c.bpm/60)*Math.PI*.9;
  ctx.save();ctx.translate(496,150);ctx.rotate(phase);ctx.beginPath();ctx.arc(0,0,78,0,TAU);ink(ctx,'#0d0a1c',2);ctx.strokeStyle='rgba(255,255,255,.1)';ctx.lineWidth=1.4;for(const r of [64,52,40]){ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.stroke();}ctx.beginPath();ctx.arc(0,0,24,0,TAU);ink(ctx,'#ff5fd2',2);ctx.fillStyle='#fff';ctx.fillRect(-2,-78,4,20);ctx.restore();
  txt(ctx,c.bpm+' BPM',496,266,{size:14,color:'#5ff0ff',weight:900});
  // faders
  for(let i=0;i<3;i++){
   const x=cx(i),y0=82,len=220,good=ok(i);
   txt(ctx,NAMES[i],x,62,{size:11,color:'#c9b8ff',weight:900});
   ctx.fillStyle='#0b0820';rr(ctx,x-8,y0,16,len,8);ink(ctx,'#0b0820',2,'#4a3a8a');
   // marca de objetivo
   const ty=y0+len-c.levels[i]/100*len;ctx.fillStyle='rgba(95,240,255,.3)';ctx.fillRect(x-24,ty-(2/100*len),48,(4/100*len));
   ctx.beginPath();ctx.moveTo(x-30,ty);ctx.lineTo(x-38,ty-6);ctx.lineTo(x-38,ty+6);ctx.closePath();ctx.fillStyle='#5ff0ff';ctx.fill();
   // vúmetro
   for(let k=0;k<14;k++){const on=k/14<vals[i]/100;ctx.fillStyle=on?(k>10?'#ff5f7a':k>7?'#ffe45f':'#5ff09a'):'rgba(255,255,255,.08)';ctx.fillRect(x+16,y0+len-(k+1)*(len/14)+2,10,len/14-3);}
   sliderAt(api,x,y0,len,()=>vals[i],v=>{vals[i]=v;api.note('');},true,52);
   const hy=y0+len-vals[i]/100*len;
   rr(ctx,x-24,hy-13,48,26,7);ink(ctx,good?'#6fe0b0':'#e8eef2',3);ctx.fillStyle=INK;ctx.fillRect(x-18,hy-1.5,36,3);
   txt(ctx,String(vals[i]),x,y0+len+22,{size:13,color:good?'#6fe0b0':'#fff'});
  }
  // barra de pulso
  ctx.fillStyle='#0b0820';rr(ctx,BX,BY-10,BW,20,10);ink(ctx,'#0b0820',2,'#4a3a8a');
  const zx=BX+(c.sync-5)/100*BW;ctx.fillStyle='rgba(95,240,154,.55)';rr(ctx,zx,BY-10,BW*.1,20,6);ctx.fill();
  const period=3.2,wave=t=>{const u=(t/1000/period)%1;return 100*(u<.5?u*2:2-u*2);},needle=wave(time),nx=BX+needle/100*BW;
  ctx.fillStyle=synced!==null?'#5ff09a':'#fff';ctx.fillRect(nx-2,BY-18,4,36);
  if(synced!==null){const sx=BX+synced/100*BW;ctx.fillStyle='#5ff09a';ctx.fillRect(sx-2,BY-18,4,36);}
  txt(ctx,synced!==null?'PULSO ENGANCHADO ✓':'TOCA AQUÍ CUANDO LA BARRA ESTÉ EN VERDE',W/2,BY+30,{size:11,color:synced!==null?'#5ff09a':'#c9b8ff',weight:900});
  api.zone(BX-10,BY-34,BW+20,70,{down:()=>{const tt=time,cand=[wave(tt),wave(tt-70)].find(v=>Math.abs(v-c.sync)<=5);if(cand!==undefined){synced=Math.round(cand);api.feedback('ok',784);api.note('');}else{api.feedback('error');api.note('Fuera de pulso. Prueba otra vez.');}}});
  dots(ctx,theme,4,vals.filter((v,i)=>ok(i)).length+(synced!==null?1:0));
 });
 return ()=>api.animate(false);
};

// ===========================================================================
// ACREDITACIONES (vip): ordénalas y pásalas por el lector a buen ritmo.
// ===========================================================================
ENGINES.vip=({api,hw,c,theme,cfg,mech})=>{
 const cards=c.cards,n=4,sx=i=>110+i*140,SY=290;
 const items=cards.map((v,i)=>({v,slot:-1,home:i,...piece(sx(i),120)}));
 const slots=Array(n).fill(null);
 let stage=0,swiped=null,t0=0,passed=false,msg='';
 const sorted=()=>slots.every((q,k)=>q&&q.v===k+1);
 const pass=piece(86,SY+4);
 api.setAnswer(()=>({order:slots.map(q=>q?q.v:-1),swipe:swiped??0}));
 api.setValid(()=>swiped!==null);
 const settle=()=>{for(const q of items){if(q.slot>=0){q.hx=sx(q.slot);q.hy=SY+6;}else{q.hx=sx(q.home);q.hy=120;}}};
 mech.setDraw((api,hw,ctx,time,dt)=>{
  backdrop(ctx,hw,theme,time);const th=THEME[theme];
  if(stage===0){
   card(ctx,28,50,W-56,134,{fill:cfg.panel,r:16});txt(ctx,cfg.inLabel,48,68,{size:12,color:cfg.dark,align:'left',weight:900});
   txt(ctx,'DEL 1 AL 4',W/2,214,{size:13,color:'#fff',stroke:'rgba(0,0,0,.5)'});
   for(let i=0;i<n;i++){const x=sx(i);card(ctx,x-58,SY-52,116,112,{fill:'rgba(0,0,0,.28)',r:14,drop:0,hi:false});txt(ctx,String(i+1),x,SY+74,{size:13,color:'#fff',stroke:'rgba(0,0,0,.5)'});}
   let mv=false;
   for(const it of [...items].sort((a,b)=>a.lift-b.lift)){
    if(stepPiece(it,dt))mv=true;
    if(!it.drag)grab(api,it,100,66,{onDrop:p=>{
     let best=-1,bd=1e9;for(let j=0;j<n;j++){const d=Math.hypot(p.x-sx(j),p.y-(SY+6));if(d<bd){bd=d;best=j;}}
     if(best>=0&&bd<80){const from=p.slot,o=slots[best];if(from>=0)slots[from]=null;if(o&&o!==p){o.slot=from;if(from>=0)slots[from]=o;}slots[best]=p;p.slot=best;settle();api.feedback('tick',380+best*60);
      if(slots.every(Boolean)){if(sorted()){stage=1;api.note('Pasa la acreditación por el lector, a ritmo normal.');api.feedback('ok',700);}else{api.feedback('error');api.note('El orden no es correcto.');}}else api.note('');}
    }});
    icon(ctx,cfg.icon,it.x,it.y,96*(1+it.lift*.1),{color:cfg.colors[(it.v-1)%4]});
    if(cfg.icon==='wrist')txt(ctx,String(it.v),it.x,it.y+1,{size:26,color:'#fff',stroke:INK});
    if(cfg.icon!=='wrist')txt(ctx,String(it.v),it.x,it.y+6,{size:24,color:'#fff',stroke:INK});
   }
   if(mv)api.invalidate();
  }else{
   // lector
   card(ctx,60,150,W-120,170,{fill:cfg.reader,r:22});
   ctx.fillStyle='#04070a';rr(ctx,130,196,380,52,14);ink(ctx,'#04070a',3,'#7b8794');
   const x0=170,x1=470;
   ctx.strokeStyle='rgba(255,255,255,.25)';ctx.setLineDash([8,7]);ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x0,222);ctx.lineTo(x1,222);ctx.stroke();ctx.setLineDash([]);
   ctx.beginPath();ctx.arc(x0,222,7,0,TAU);ink(ctx,'#fff',2);ctx.beginPath();ctx.arc(x1,222,7,0,TAU);ink(ctx,swiped!==null?'#6fe0b0':'#fff',2);
   txt(ctx,swiped!==null?'ACCESO AUTORIZADO · '+c.code:'DESLIZA DE IZQUIERDA A DERECHA',W/2,276,{size:13,color:swiped!==null?'#6fe0b0':'#c9d4de',weight:900});
   txt(ctx,msg,W/2,300,{size:12,color:'#ffb86a',weight:800});
   // luces
   for(let k=0;k<3;k++){ctx.beginPath();ctx.arc(W/2-24+k*24,172,7,0,TAU);ink(ctx,swiped!==null?'#6fe0b0':'#3a4a3a',2);}
   stepPiece(pass,dt,16);
   if(swiped===null&&!pass.drag)api.zone(pass.x-60,pass.y-44,120,88,{
    down:pt=>{pass.drag=true;pass.gx=pass.x-pt.x;pass.gy=pass.y-pt.y;t0=0;passed=false;msg="";},
    move:pt=>{pass.x=clamp(pt.x+pass.gx,60,W-60);pass.y=222;if(!t0&&pass.x>=x0)t0=performance.now();if(t0&&!passed&&pass.x>=x1){passed=true;const ms=performance.now()-t0;if(ms>=350&&ms<=1600){swiped=Math.round(ms);api.feedback('ok',900);api.note('');}else{msg=ms<350?'Demasiado rápido. Más despacio.':'Demasiado lento. Un poco más rápido.';api.feedback('error');api.note(msg);}}},
    up:()=>{pass.drag=false;if(swiped!==null){pass.hx=x1+10;}else{pass.hx=86;pass.hy=SY+4;}t0=0;}
   });
   icon(ctx,cfg.icon,pass.x,pass.y,100*(1+pass.lift*.08),{color:cfg.colors[0]});
   if(!pass.drag&&pass.hx===86&&pass.x>x0)api.invalidate();
   if(pass.drag)api.invalidate();
  }
  dots(ctx,theme,5,stage===0?slots.filter(Boolean).length:4+(swiped!==null?1:0));
 });
};

// ===========================================================================
// CUADRO ELÉCTRICO (power): cambia los fusibles y conecta en orden.
// ===========================================================================
ENGINES.power=({api,hw,c,theme,cfg,mech})=>{
 const fuses=[...c.fuses],seq=c.sequence,entered=[],sw=[0,0,0,0],swp=[0,0,0,0],flash=[0,0,0];
 let wrongAt=-9e9;
 const fx=i=>150+i*170,bx=i=>60+i*140;
 api.setAnswer(()=>({fuses:[...fuses],sequence:[...entered]}));
 api.setValid(()=>fuses.every(v=>v===1)&&entered.length===seq.length&&entered.every((v,i)=>v===seq[i]));
 mech.setDraw((api,hw,ctx,time,dt)=>{
  backdrop(ctx,hw,theme,time);const th=THEME[theme];
  card(ctx,24,34,W-48,H-68,{fill:cfg.panel,r:20});
  txt(ctx,'FUSIBLES',W/2,60,{size:12,color:cfg.headColor,weight:900});
  let mv=false;
  for(let i=0;i<3;i++){
   const x=fx(i),ok=fuses[i]===1;flash[i]=Math.max(0,flash[i]-dt*3);if(flash[i]>0)mv=true;
   card(ctx,x-34,76,68,100,{fill:'#262e38',r:10,drop:3,hi:false});
   ctx.fillStyle='rgba(255,255,255,.28)';ctx.beginPath();ctx.moveTo(x-22,86);ctx.lineTo(x+22,86);ctx.lineTo(x+18,166);ctx.lineTo(x-18,166);ctx.closePath();ink(ctx,ok?'rgba(255,224,130,.7)':'rgba(190,200,210,.35)',2.5);
   ctx.strokeStyle=ok?'#fff0a0':'#5a5a5a';ctx.lineWidth=ok?3:2;ctx.beginPath();if(ok){ctx.moveTo(x,96);ctx.lineTo(x,156);}else{ctx.moveTo(x,96);ctx.lineTo(x-5,122);ctx.moveTo(x+5,130);ctx.lineTo(x,156);}ctx.stroke();
   if(ok)glow(ctx,x,126,60,'#ffe27a',.35+flash[i]*.5);
   rr(ctx,x-20,168,40,8,3);ink(ctx,'#9aa6b0',2);
   txt(ctx,ok?'OK':'FUNDIDO',x,196,{size:11,color:ok?'#8fe6c2':'#ff8a7a',weight:900});
   if(!ok)api.zone(x-40,72,80,112,{down:()=>{fuses[i]=1;flash[i]=1;api.feedback('ok',520+i*80);api.note('');api.invalidate();}});
  }
  // parte de trabajo
  card(ctx,W/2-170,212,340,36,{fill:'#fff6d6',r:8,drop:2,hi:false});
  txt(ctx,'ORDEN: '+seq.map(v=>v+1).join('  →  '),W/2,231,{size:16,color:'#2b2b2b',weight:900});
  // magnetotérmicos
  for(let i=0;i<4;i++){
   const x=bx(i)+50;swp[i]+=(sw[i]-swp[i])*(1-Math.exp(-20*dt));if(Math.abs(sw[i]-swp[i])>.01)mv=true;
   const bad=performance.now()-wrongAt<500;
   card(ctx,x-34,268,68,128,{fill:'#262e38',r:12,drop:3,hi:false});
   ctx.beginPath();ctx.arc(x,282,6,0,TAU);ink(ctx,sw[i]?'#8fe6c2':bad?'#ff6a6a':'#3a4650',2);
   ctx.fillStyle='#0c1218';rr(ctx,x-14,296,28,70,10);ctx.fill();
   const ky=298+(1-swp[i])*30;rr(ctx,x-20,ky,40,38,9);ink(ctx,sw[i]?'#e8eef2':'#c0c8d0',3);ctx.fillStyle='rgba(255,255,255,.4)';ctx.fillRect(x-14,ky+4,28,6);
   txt(ctx,String(i+1),x,386,{size:13,color:'#c9d4de'});
   api.zone(x-36,268,72,130,{down:()=>{
    if(entered.length>=seq.length||sw[i])return;
    if(seq[entered.length]===i){sw[i]=1;entered.push(i);api.feedback('tick',330+entered.length*110);api.note('');}
    else{wrongAt=performance.now();api.feedback('error');api.note('Orden equivocado. Se rearman los magnetotérmicos.');entered.length=0;sw.fill(0);}
   }});
  }
  if(mv||performance.now()-wrongAt<520)api.invalidate();
  dots(ctx,theme,7,fuses.filter(v=>v===1).length+entered.length);
 });
};

// ===========================================================================
// DATOS (download): elige la ruta, enchufa y espera la transferencia.
// ===========================================================================
ENGINES.download=({api,hw,c,theme,cfg,mech})=>{
 const route=c.route,pos=cfg.nodes.map((nm,i)=>({x:[120,250,380,250][i]+(i===3?0:0),y:[200,110,200,290][i],name:nm}));
 const picked=[];let plugged=false,transfer=0,wrongAt=-9e9;
 const plug=piece(520,340),port={x:540,y:130};
 api.setAnswer(()=>({route:[...picked],packets:c.packets}));
 api.setValid(()=>transfer>=1);
 api.animate(true);
 mech.setDraw((api,hw,ctx,time,dt)=>{
  backdrop(ctx,hw,theme,time);const th=THEME[theme];
  card(ctx,24,30,W-48,H-60,{fill:cfg.panel,r:20});
  card(ctx,44,46,380,34,{fill:'#fff6d6',r:8,drop:2,hi:false});
  txt(ctx,'RUTA SEGURA:  '+route.map(v=>pos[v].name).join(' → '),234,63,{size:13,color:'#2b2b2b',weight:900});
  // enlaces
  ctx.lineWidth=5;ctx.lineCap='round';
  for(let a=0;a<pos.length;a++)for(let b=a+1;b<pos.length;b++){ctx.strokeStyle='rgba(255,255,255,.12)';ctx.beginPath();ctx.moveTo(pos[a].x,pos[a].y);ctx.lineTo(pos[b].x,pos[b].y);ctx.stroke();}
  for(let k=1;k<picked.length;k++){const a=pos[picked[k-1]],b=pos[picked[k]];ctx.strokeStyle='#5ff09a';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
   const t=(time/500+k)%1;ctx.beginPath();ctx.arc(lerp(a.x,b.x,t),lerp(a.y,b.y,t),5,0,TAU);ctx.fillStyle='#fff';ctx.fill();}
  pos.forEach((p,i)=>{
   const idx=picked.indexOf(i),on=idx>=0,bad=performance.now()-wrongAt<450;
   if(on)glow(ctx,p.x,p.y,56,'#5ff09a',.4);
   api.zone(p.x-36,p.y-32,72,64,{down:()=>{
    if(picked.length>=route.length||on)return;
    if(i===route[picked.length]){picked.push(i);api.feedback('tick',430+picked.length*90);api.note('');}
    else{wrongAt=performance.now();picked.length=0;api.feedback('error');api.note('Ese nodo no es el siguiente de la ruta.');}
   }});
   card(ctx,p.x-34,p.y-26,68,52,{fill:on?'#2c5a46':bad?'#6a2c2c':'#2f3b48',r:10,drop:3,hi:false});
   ctx.fillStyle='#04141a';rr(ctx,p.x-26,p.y-20,52,26,5);ctx.fill();ctx.fillStyle=on?'#5ff09a':'#4a8a9a';for(let k=0;k<3;k++)ctx.fillRect(p.x-20,p.y-15+k*7,12+k*8,3);
   ctx.beginPath();ctx.arc(p.x+22,p.y+14,4,0,TAU);ink(ctx,on?'#5ff09a':'#6a4a4a',1.5);
   txt(ctx,p.name,p.x,p.y+42,{size:11,color:'#e8eef2',weight:800});
   if(on)txt(ctx,String(idx+1),p.x-26,p.y-26,{size:14,color:'#fff',stroke:INK});
  });
  // puerto y conector
  card(ctx,port.x-48,port.y-44,96,88,{fill:'#2f3b48',r:12,drop:3,hi:false});
  rr(ctx,port.x-24,port.y-20,48,40,6);ink(ctx,plugged?'#2c5a46':'#0c1218',3,'#7b8794');
  txt(ctx,'PUERTO',port.x,port.y+58,{size:10,color:'#9ab6bd',weight:800});
  const ready=picked.length===route.length;
  if(!plugged){
   stepPiece(plug,dt);
   if(ready)grab(api,plug,70,40,{onDrop:p=>{if(Math.hypot(p.x-port.x,p.y-port.y)<54){plugged=true;p.x=port.x-4;p.y=port.y;p.hx=p.x;p.hy=p.y;api.feedback('ok',620);api.note('Transferencia en curso…');}}});
   ctx.save();ctx.globalAlpha=ready?1:.35;ctx.translate(plug.x,plug.y);ctx.strokeStyle=INK;ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(70,60);ctx.quadraticCurveTo(40,20,0,0);ctx.stroke();ctx.strokeStyle='#8a96a2';ctx.lineWidth=5;ctx.stroke();rr(ctx,-24,-16,40,32,6);ink(ctx,'#e0a93a',3);ctx.fillStyle='#d4d9de';ctx.fillRect(14,-9,10,5);ctx.fillRect(14,3,10,5);ctx.restore();
   if(!ready)txt(ctx,'Completa la ruta',520,400,{size:11,color:'#9ab6bd',weight:800});else txt(ctx,'ARRASTRA EL CONECTOR AL PUERTO',500,400,{size:11,color:'#ffe27a',weight:900});
   if(plug.drag||plug.lift>0)api.invalidate();
  }else{
   transfer=Math.min(1,transfer+dt/3.2);
   ctx.save();ctx.translate(port.x-4,port.y);ctx.strokeStyle=INK;ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(60,70);ctx.quadraticCurveTo(40,20,0,0);ctx.stroke();ctx.strokeStyle='#8a96a2';ctx.lineWidth=5;ctx.stroke();rr(ctx,-28,-16,40,32,6);ink(ctx,'#e0a93a',3);ctx.restore();
  }
  // barra de transferencia
  card(ctx,44,356,380,52,{fill:'#10171e',r:10,drop:0,hi:false});
  ctx.fillStyle='#04141a';rr(ctx,56,382,356,16,8);ctx.fill();rr(ctx,56,382,Math.max(0,356*transfer),16,8);ctx.fillStyle=transfer>=1?'#5ff09a':'#4fd0ff';ctx.fill();
  txt(ctx,Math.round(transfer*c.packets)+' / '+c.packets+' PAQUETES',64,370,{size:12,color:'#c9d4de',align:'left',weight:800});
  if(transfer>=1)txt(ctx,'REGISTRO ÍNTEGRO ✓',404,370,{size:12,color:'#5ff09a',align:'right',weight:900});
  dots(ctx,theme,5,picked.length+(plugged?1:0)+(transfer>=1?1:0));
  if(plugged&&transfer<1)api.invalidate();
 });
 return ()=>api.animate(false);
};

// Mando con arco: lo usan los reglajes y la bicicleta.
const GA=Math.PI*.75;
export function dialDraw(c,api,{x,y=190,r=62,v,t,tol,ok,set,get}){
 c.lineCap='round';
 c.beginPath();c.arc(x,y,r+12,GA,GA+ASPAN);c.strokeStyle='rgba(0,0,0,.45)';c.lineWidth=14;c.stroke();
 if(t!=null){c.beginPath();c.arc(x,y,r+12,GA+ASPAN*Math.max(0,t-tol)/100,GA+ASPAN*Math.min(100,t+tol)/100);c.strokeStyle='#5ff09a';c.lineWidth=14;c.stroke();}
 if(v>0){c.beginPath();c.arc(x,y,r+12,GA,GA+ASPAN*v/100);c.strokeStyle=ok?'rgba(143,230,194,.9)':'rgba(255,255,255,.55)';c.lineWidth=5;c.stroke();}
 knobAt(api,x,y,r,get,set);
 c.beginPath();c.arc(x,y+5,r,0,TAU);c.fillStyle='rgba(0,0,0,.35)';c.fill();
 c.beginPath();c.arc(x,y,r,0,TAU);ink(c,'#4a5664',4);c.beginPath();c.arc(x,y,r-10,0,TAU);ink(c,'#2f3945',3);
 const a=GA+ASPAN*v/100;
 c.strokeStyle=ok?'#8fe6c2':'#ffd86a';c.lineWidth=6;c.beginPath();c.moveTo(x+Math.cos(a)*10,y+Math.sin(a)*10);c.lineTo(x+Math.cos(a)*(r-14),y+Math.sin(a)*(r-14));c.stroke();
 c.beginPath();c.arc(x,y,9,0,TAU);ink(c,'#8a96a2',2.5);
}

// ===========================================================================
// REVISAR MATERIAL (equipment): aparta solo las piezas dañadas.
// ===========================================================================
ENGINES.inspect=({api,hw,c,theme,cfg,mech})=>{
 const bad=new Set(c.bad),n=6,spot=i=>({x:96+(i%3)*128,y:110+Math.floor(i/3)*130});
 const bin={x:458,y:84,w:150,h:240},items=Array.from({length:n},(_,i)=>({i,...piece(spot(i).x,spot(i).y)}));
 const sent=[];
 api.setAnswer(()=>[...sent].sort((a,b)=>a-b));
 api.setValid(()=>sent.length===bad.size);
 mech.setDraw((api,hw,ctx,time,dt)=>{
  backdrop(ctx,hw,theme,time);const th=THEME[theme];
  card(ctx,24,44,410,320,{fill:cfg.floor,r:18});
  txt(ctx,cfg.inLabel,44,62,{size:12,color:cfg.dark,align:'left',weight:900});
  card(ctx,bin.x,bin.y,bin.w,bin.h,{fill:'#b34a3a',r:14});ctx.fillStyle='rgba(0,0,0,.4)';rr(ctx,bin.x+12,bin.y+40,bin.w-24,bin.h-60,10);ctx.fill();
  txt(ctx,'DAÑADOS',bin.x+bin.w/2,bin.y+22,{size:15,color:'#fff',stroke:INK});
  sent.forEach((i,k)=>cfg.draw(ctx,i,bin.x+44+(k%2)*60,bin.y+bin.h-50-Math.floor(k/2)*58,46,true));
  let mv=false;
  for(const it of [...items].sort((a,b)=>a.lift-b.lift)){
   if(it.gone)continue;if(stepPiece(it,dt))mv=true;
   if(!it.drag)grab(api,it,76,76,{onDrop:p=>{
    if(inRect(p,{x:bin.x-10,y:bin.y-10,w:bin.w+20,h:bin.h+20})){
     if(bad.has(p.i)){p.gone=true;sent.push(p.i);api.feedback('ok',480+sent.length*90);api.note('');}
     else{api.feedback('error');api.note('Esa pieza está en buen estado.');}
    }
   }});
   if(it.lift>.01){ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(it.x+4,it.y+34,26,7,0,0,TAU);ctx.fill();}
   cfg.draw(ctx,it.i,it.x,it.y,76*(1+it.lift*.14),bad.has(it.i));
  }
  if(mv)api.invalidate();
  dots(ctx,theme,bad.size,sent.length);
 });
};

// ===========================================================================
// CINTA (treadmill): ajusta velocidad e inclinación y déjala rodando.
// ===========================================================================
ENGINES.treadmill=({api,hw,c,theme,cfg,mech})=>{
 let speed=3+((c.speed+4)%8)*(c.speed===3?0:1),incline=(c.incline+4)%9;if(speed===c.speed)speed=c.speed===10?9:c.speed+1;if(incline===c.incline)incline=c.incline===8?7:c.incline+1;
 let run=0,belt=0,tilt=incline,done=false;
 mech.canvas.__dbg=()=>({speed,incline});
 const okS=()=>speed===c.speed,okI=()=>incline===c.incline;
 api.setAnswer(()=>({speed,incline,run:Math.round(run*1000)}));
 api.setValid(()=>done);
 api.animate(true);
 mech.setDraw((api,hw,ctx,time,dt)=>{
  backdrop(ctx,hw,theme,time);const th=THEME[theme];
  card(ctx,24,34,W-48,H-68,{fill:'#24364a',r:20});
  const good=okS()&&okI();
  if(good&&!done){run+=dt;if(run>=c.duration/1000){done=true;api.feedback('ok',880);}}else if(!good&&!done)run=Math.max(0,run-dt*2);
  belt+=dt*(good||done?speed*34:speed*8);tilt+=(incline-tilt)*(1-Math.exp(-10*dt));
  // parte
  card(ctx,W/2-120,48,240,34,{fill:'#fff6d6',r:8,drop:2,hi:false});
  txt(ctx,`PARTE: ${c.speed} km/h  ·  ${c.incline} % pendiente`,W/2,65,{size:14,color:'#2b2b2b',weight:900});
  // cinta lateral
  ctx.save();ctx.translate(W/2,230);ctx.rotate(-tilt*.045);
  rr(ctx,-170,-14,340,48,24);ink(ctx,'#1a222b',4);
  ctx.save();rr(ctx,-166,-10,332,40,20);ctx.clip();ctx.fillStyle='#2e3a46';ctx.fillRect(-170,-14,340,48);ctx.fillStyle=good?'#5ff09a':'#8a96a2';for(let k=-12;k<14;k++){const x=((k*28+belt)%336)-168;ctx.fillRect(x,-10,6,40);}ctx.restore();
  ctx.beginPath();ctx.arc(-148,10,24,0,TAU);ink(ctx,'#4a5664',3);ctx.beginPath();ctx.arc(148,10,24,0,TAU);ink(ctx,'#4a5664',3);
  // corredor
  const ph=belt*.09;ctx.strokeStyle=INK;ctx.lineWidth=11;ctx.lineCap='round';
  const leg=(a,col)=>{ctx.strokeStyle=INK;ctx.lineWidth=13;ctx.beginPath();ctx.moveTo(-6,-60);ctx.lineTo(-6+Math.sin(a)*28,-30);ctx.lineTo(-6+Math.sin(a)*34-6,-16);ctx.stroke();ctx.strokeStyle=col;ctx.lineWidth=8;ctx.stroke();};
  if(good||done){leg(ph,'#3a6ad6');leg(ph+Math.PI,'#5a8af6');}else{leg(0,'#3a6ad6');leg(.3,'#5a8af6');}
  rr(ctx,-22,-118,32,60,14);ink(ctx,th.accent,3);ctx.beginPath();ctx.arc(-4,-132,15,0,TAU);ink(ctx,'#f0c8a0',3);
  ctx.restore();
  // soporte de la cinta (patas)
  ctx.fillStyle='#1a222b';ctx.fillRect(W/2-150,258,16,60);ctx.fillRect(W/2+134,258+tilt*-1,16,60);
  // deslizadores
  const drawSl=(x,label,min,max,get,set,ok,unit)=>{
   const y0=100,len=240,v=(get()-min)/(max-min)*100;
   txt(ctx,label,x,76,{size:12,color:'#c9d9e8',weight:900});
   ctx.fillStyle='#0c1218';rr(ctx,x-8,y0,16,len,8);ink(ctx,'#0c1218',2,'#6a7682');
   for(let k=0;k<=max-min;k++){const ty=y0+len-k/(max-min)*len;ctx.fillStyle=k+min===(label==='VELOCIDAD'?c.speed:c.incline)?'#5ff09a':'rgba(255,255,255,.25)';ctx.fillRect(x+12,ty-1.2,k+min===(label==='VELOCIDAD'?c.speed:c.incline)?14:8,2.4);}
   sliderAt(api,x,y0,len,()=>(get()-min)/(max-min)*100,v=>set(min+Math.round(v/100*(max-min))),true,52);
   const hy=y0+len-v/100*len;rr(ctx,x-24,hy-14,48,28,8);ink(ctx,ok?'#8fe6c2':'#e8eef2',3);txt(ctx,String(get()),x,hy,{size:15,color:INK,weight:900,});
   txt(ctx,unit,x,y0+len+22,{size:11,color:'#c9d9e8',weight:800});
  };
  drawSl(70,'VELOCIDAD',3,10,()=>speed,v=>{speed=v;},okS(),'km/h');
  drawSl(W-70,'INCLINACIÓN',0,8,()=>incline,v=>{incline=v;},okI(),'%');
  // progreso
  ctx.fillStyle='#04141a';rr(ctx,W/2-120,372,240,14,7);ctx.fill();rr(ctx,W/2-120,372,240*Math.min(1,run/(c.duration/1000)),14,7);ctx.fillStyle='#5ff09a';ctx.fill();
  txt(ctx,done?'ENTRENAMIENTO LISTO ✓':good?'CORRIENDO…':'AJUSTA LOS DOS MANDOS',W/2,400,{size:11,color:good?'#5ff09a':'#c9d9e8',weight:900});
 });
 return ()=>api.animate(false);
};

// ===========================================================================
// POLEAS (weights): pasa la correa en orden y aprieta tres tornillos.
// ===========================================================================
ENGINES.weights=({api,hw,c,theme,cfg,mech})=>{
 const P=[{x:150,y:150},{x:330,y:122},{x:510,y:160},{x:330,y:222}],route=c.route,picked=[],bolt=[0,0,0];
 let wrongAt=-9e9;
 const bx=i=>150+i*170;
 api.setAnswer(()=>({route:[...picked],bolts:bolt.map(v=>v>=98?1:0)}));
 api.setValid(()=>picked.length===route.length&&bolt.every(v=>v>=98));
 mech.setDraw((api,hw,ctx,time,dt)=>{
  backdrop(ctx,hw,theme,time);const th=THEME[theme];
  card(ctx,24,34,W-48,H-68,{fill:'#24364a',r:20});
  card(ctx,W/2-170,46,340,32,{fill:'#fff6d6',r:8,drop:2,hi:false});
  txt(ctx,'CORREA:  '+route.map(v=>v+1).join('  →  '),W/2,62,{size:15,color:'#2b2b2b',weight:900});
  ctx.strokeStyle=INK;ctx.lineCap='round';
  for(let k=1;k<picked.length;k++){const a=P[picked[k-1]],b=P[picked[k]];ctx.strokeStyle=INK;ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.strokeStyle='#3a3a3a';ctx.lineWidth=8;ctx.stroke();ctx.setLineDash([6,8]);ctx.lineDashOffset=-time/40;ctx.strokeStyle='#777';ctx.lineWidth=3;ctx.stroke();ctx.setLineDash([]);}
  P.forEach((p,i)=>{
   const idx=picked.indexOf(i),on=idx>=0,bad=performance.now()-wrongAt<450;
   api.zone(p.x-44,p.y-44,88,88,{down:()=>{
    if(picked.length>=route.length||on)return;
    if(i===route[picked.length]){picked.push(i);api.feedback('tick',380+picked.length*80);api.note('');}
    else{wrongAt=performance.now();picked.length=0;api.feedback('error');api.note('Esa polea no es la siguiente.');}
   }});
   ctx.save();ctx.translate(p.x,p.y);ctx.rotate(on?time/260*(i%2?1:-1):0);
   ctx.beginPath();ctx.arc(0,0,38,0,TAU);ink(ctx,bad?'#c04a4a':on?'#5aa88a':'#8a96a2',4);
   ctx.beginPath();ctx.arc(0,0,26,0,TAU);ink(ctx,'#3a4652',3);ctx.strokeStyle='#cfd6dc';ctx.lineWidth=4;for(let k=0;k<3;k++){ctx.save();ctx.rotate(k*TAU/3);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-24);ctx.stroke();ctx.restore();}ctx.restore();
   ctx.beginPath();ctx.arc(p.x,p.y,8,0,TAU);ink(ctx,'#e8eef2',2);
   txt(ctx,String(i+1),p.x+(i===3?-52:0),p.y+(i===3?0:56),{size:14,color:'#fff',stroke:INK});
  });
  // tornillos
  const ready=picked.length===route.length;
  txt(ctx,ready?'APRIETA LOS TRES TORNILLOS GIRÁNDOLOS':'Primero pasa la correa',W/2,292,{size:12,color:ready?'#ffe27a':'#9ab6bd',weight:900});
  for(let i=0;i<3;i++){
   const x=bx(i),y=358,v=bolt[i];
   card(ctx,x-50,y-52,100,104,{fill:'#2f3b48',r:14,drop:3,hi:false});
   ctx.save();ctx.translate(x,y);ctx.rotate(v/100*Math.PI*3);
   ctx.beginPath();for(let k=0;k<6;k++){const a=k*TAU/6;ctx.lineTo(Math.cos(a)*32,Math.sin(a)*32);}ctx.closePath();ink(ctx,v>=98?'#6fd09a':'#b0bcc6',3.5);
   ctx.beginPath();ctx.arc(0,0,14,0,TAU);ink(ctx,'#4a5664',3);ctx.strokeStyle=INK;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-10,0);ctx.lineTo(10,0);ctx.stroke();ctx.restore();
   if(ready&&v<98)knobAt(api,x,y,46,()=>bolt[i],q=>{bolt[i]=q;if(q>=98)api.feedback('ok',500+i*120);});
   ctx.fillStyle='#04141a';rr(ctx,x-34,y+38,68,7,3);ctx.fill();rr(ctx,x-34,y+38,68*v/100,7,3);ctx.fillStyle=v>=98?'#5ff09a':'#4fd0ff';ctx.fill();
  }
  if(performance.now()-wrongAt<460||picked.length)api.invalidate();
  dots(ctx,theme,7,picked.length+bolt.filter(v=>v>=98).length);
 });
};

// ===========================================================================
// MARCADOR (scoreboard): tres tambores hasta el resultado.
// ===========================================================================
ENGINES.scoreboard=({api,hw,c,theme,cfg,mech})=>{
 const tgt=c.score,lim=[[0,9],[0,9],[1,4]],names=['LOCAL','VISITANTE','PERIODO'],cur=[(tgt[0]+3)%10,(tgt[1]+5)%10,((tgt[2])%4)+1],off=[0,0,0];
 if(cur[2]===tgt[2])cur[2]=tgt[2]%4+1;
 const cx=i=>120+i*200;
 mech.canvas.__dbg=()=>({cur:[...cur]});
 api.setAnswer(()=>[...cur]);
 api.setValid(()=>cur.every((v,i)=>v===tgt[i]),{settle:.4});
 const wrap=(i,d)=>{const [lo,hi]=lim[i],n=hi-lo+1;cur[i]=((cur[i]-lo+d)%n+n)%n+lo;};
 mech.setDraw((api,hw,ctx,time,dt)=>{
  backdrop(ctx,hw,theme,time);
  card(ctx,24,34,W-48,H-68,{fill:'#1c2a3a',r:20});
  card(ctx,W/2-190,46,380,34,{fill:'#fff6d6',r:8,drop:2,hi:false});
  txt(ctx,`RESULTADO:  ${tgt[0]}  –  ${tgt[1]}   ·   PERIODO ${tgt[2]}`,W/2,63,{size:15,color:'#2b2b2b',weight:900});
  let mv=false;
  for(let i=0;i<3;i++){
   const x=cx(i),ok=cur[i]===tgt[i];
   txt(ctx,names[i],x,112,{size:12,color:'#c9d9e8',weight:900});
   card(ctx,x-62,126,124,200,{fill:'#0c1218',r:14,drop:3,hi:false});
   ctx.save();rr(ctx,x-56,132,112,188,10);ctx.clip();
   off[i]*=Math.exp(-12*dt);if(Math.abs(off[i])>.01)mv=true;
   for(let k=-2;k<=2;k++){const [lo,hi]=lim[i],n=hi-lo+1,v=((cur[i]-lo+k)%n+n)%n+lo;const y=226+(k-off[i]*0)*58+off[i]*58;const a=1-Math.abs(k+off[i])*.4;ctx.globalAlpha=Math.max(0,a);txt(ctx,String(v),x,y,{size:k===0?72:46,color:ok&&k===0?'#5ff09a':'#ffd86a',weight:900});}
   ctx.globalAlpha=1;ctx.restore();
   ctx.fillStyle='rgba(255,255,255,.08)';rr(ctx,x-62,126,124,200,14);ctx.fill();
   // flechas
   for(const [dy,d] of [[-1,1],[1,-1]]){const ay=dy<0?150:300;ctx.fillStyle='rgba(255,255,255,.35)';ctx.beginPath();ctx.moveTo(x,ay+(dy<0?-8:8));ctx.lineTo(x-12,ay+(dy<0?6:-6));ctx.lineTo(x+12,ay+(dy<0?6:-6));ctx.closePath();ctx.fill();}
   let acc=0;
   api.zone(x-62,126,124,200,{
    down:pt=>{acc=0;},
    move:(pt,st)=>{acc=(st.y-pt.y)/58;const steps=Math.trunc(acc);if(steps){wrap(i,steps);st.y-=steps*58;off[i]=-0;api.feedback('tick',300+cur[i]*40);api.note('');}},
    up:(pt,st)=>{if(Math.abs(pt.y-st.y)<8&&Math.abs(pt.x-st.x)<8){wrap(i,pt.y<226?1:-1);api.feedback('tick',300+cur[i]*40);api.note('');}}
   });
   ctx.beginPath();ctx.arc(x,352,8,0,TAU);ink(ctx,ok?'#5ff09a':'#4d2a2a',2);
  }
  if(mv)api.invalidate();
  dots(ctx,theme,3,cur.filter((v,i)=>v===tgt[i]).length);
 });
};

// ===========================================================================
// FILTROS Y CAUDAL (ventilation): saca los filtros y regula las ruedas.
// ===========================================================================
ENGINES.filters=({api,hw,c,theme,cfg,mech})=>{
 const n=4,slot=i=>({x:100+(i%2)*120,y:112+Math.floor(i/2)*110}),bin={x:34,y:316,w:260,h:90};
 const items=Array.from({length:n},(_,i)=>({i,...piece(slot(i).x,slot(i).y)})),out=[];
 const vals=[50,50],tol=3;
 const inz=i=>Math.abs(vals[i]-c.levels[i])<=tol;
 api.setAnswer(()=>({levels:[...vals],filters:[...out].sort((a,b)=>a-b)}));
 api.setValid(()=>out.length===n&&inz(0)&&inz(1),{settle:.4});
 mech.setDraw((api,hw,ctx,time,dt)=>{
  backdrop(ctx,hw,theme,time);const th=THEME[theme];
  card(ctx,24,34,W-48,H-68,{fill:cfg.panel,r:20});
  txt(ctx,cfg.unit,160,58,{size:12,color:cfg.head,weight:900});
  card(ctx,34,70,252,232,{fill:'#1a232c',r:14,drop:2,hi:false});
  for(let i=0;i<n;i++){const s=slot(i);ctx.fillStyle='#0c1218';rr(ctx,s.x-50,s.y-44,100,88,8);ctx.fill();}
  card(ctx,bin.x,bin.y,bin.w,bin.h,{fill:cfg.bin,r:12});txt(ctx,'SUCIOS',bin.x+bin.w/2,bin.y+14,{size:12,color:'#fff',stroke:INK});
  out.forEach((i,k)=>cfg.filter(ctx,i,bin.x+44+k*58,bin.y+54,44,true));
  let mv=false;
  for(const it of [...items].sort((a,b)=>a.lift-b.lift)){
   if(it.gone)continue;if(stepPiece(it,dt,18))mv=true;
   if(!it.drag)grab(api,it,92,80,{onDrop:p=>{if(inRect(p,{x:bin.x-10,y:bin.y-30,w:bin.w+20,h:bin.h+40})){p.gone=true;out.push(p.i);api.feedback('ok',420+out.length*80);}}});
   if(it.lift>.01){ctx.fillStyle='rgba(0,0,0,.28)';rr(ctx,it.x-40,it.y+34,86,10,5);ctx.fill();}
   cfg.filter(ctx,it.i,it.x,it.y,88*(1+it.lift*.08),false);
  }
  // ruedas
  for(let i=0;i<2;i++){const x=420+i*0+(i?0:0),y=130+i*150;const ok=inz(i);
   txt(ctx,i?'SALIDA':'ENTRADA',x+66,y-86,{size:11,color:cfg.head,weight:900});
   dialDraw(ctx,api,{x:x+66-34,y,r:44,v:vals[i],t:c.levels[i],tol,ok,set:v=>{vals[i]=v;api.note('');api.invalidate();},get:()=>vals[i]});
   txt(ctx,String(vals[i]),x+120,y+4,{size:20,color:ok?'#8fe6c2':'#fff',stroke:INK});
  }
  if(mv)api.invalidate();
  dots(ctx,theme,4,out.length);
 });
};

// ===========================================================================
// CANASTA (basketball): tira arrastrando hacia atrás, como un tirachinas.
// ===========================================================================
export const HOOP_X=520,HOOP_R=30,BALL0={x:110,y:372},GRAV=620,POWER=5.4;
export const hoopY=t=>Math.round(400-t*.62);
export function shotPoints(vx,vy,steps=48,dt=.035){const pts=[];let x=BALL0.x,y=BALL0.y,u=vx,v=vy;for(let i=0;i<steps;i++){pts.push([x,y]);u+=0;v+=GRAV*dt;x+=u*dt;y+=v*dt;}return pts;}
ENGINES.basketball=({api,hw,c,theme,cfg,mech})=>{
 let k=0,ball={x:BALL0.x,y:BALL0.y,vx:0,vy:0,fly:false,drag:false},pull=null,msg='',swish=0,trail=[],acc=0;const STEP=1/120;
 mech.canvas.__dbg=()=>({k,fly:ball.fly,idle:!ball.fly&&ball.x===BALL0.x});
 api.animate(true);
 api.setAnswer(()=>({hits:k,hoops:c.targets.slice(0,k)}));
 api.setValid(()=>k>=3);
 mech.setDraw((api,hw,ctx,time,dt)=>{
  backdrop(ctx,hw,theme,time);const th=THEME[theme];
  // pista
  ctx.fillStyle='#b9824a';ctx.fillRect(0,404,W,36);ctx.fillStyle='rgba(255,255,255,.3)';ctx.fillRect(0,404,W,3);
  const hy=hoopY(c.targets[Math.min(k,2)]);
  // soporte y tablero
  ctx.fillStyle='#39434d';ctx.fillRect(HOOP_X+HOOP_R+16,hy-120,10,404-hy+120);
  card(ctx,HOOP_X+HOOP_R+2,hy-86,16,80,{fill:'#e8eef2',r:4,drop:2,hi:false});
  ctx.strokeStyle=INK;ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(HOOP_X-HOOP_R,hy);ctx.lineTo(HOOP_X+HOOP_R+2,hy);ctx.stroke();ctx.strokeStyle='#ff6a3a';ctx.lineWidth=5;ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.85)';ctx.lineWidth=2;for(let i=-3;i<=3;i++){ctx.beginPath();ctx.moveTo(HOOP_X+i*9,hy);ctx.lineTo(HOOP_X+i*5,hy+34);ctx.stroke();}
  if(swish>0){swish-=dt;glow(ctx,HOOP_X,hy,70,'#ffe27a',swish*1.2);}
  txt(ctx,`CANASTA ${Math.min(k+1,3)}/3  ·  ALTURA ${c.targets[Math.min(k,2)]}`,W/2,30,{size:14,color:'#fff',stroke:INK});
  txt(ctx,msg,W/2,56,{size:12,color:'#ffd86a',weight:800});
  // trayectoria
  if(pull){const vx=(BALL0.x-pull.x)*POWER,vy=(BALL0.y-pull.y)*POWER;const pts=shotPoints(vx,vy,22);ctx.fillStyle='rgba(255,255,255,.75)';for(const [x,y] of pts){ctx.beginPath();ctx.arc(x,y,3.2,0,TAU);ctx.fill();}
   ctx.strokeStyle='rgba(255,255,255,.4)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(BALL0.x,BALL0.y);ctx.lineTo(pull.x,pull.y);ctx.stroke();}
  // física
  if(ball.fly){acc+=dt;let n=0;while(acc>=STEP&&n++<12&&ball.fly){acc-=STEP;const py=ball.y;ball.vy+=GRAV*STEP;ball.x+=ball.vx*STEP;ball.y+=ball.vy*STEP;if(n%4===0){trail.push([ball.x,ball.y]);if(trail.length>14)trail.shift();}
   if(ball.vy>0&&py<hy&&ball.y>=hy&&Math.abs(ball.x-HOOP_X)<HOOP_R-4){k++;swish=.5;msg=k>=3?'':'¡Canasta! Sube el aro.';api.feedback('ok',660+k*120);ball.fly=false;reset();}
   else if(ball.y>404||ball.x>W+40||ball.x<-40){msg='Fallaste. Prueba otra vez.';api.feedback('tick',200);ball.fly=false;reset();}
   else if(ball.x>HOOP_X+HOOP_R+2&&ball.x<HOOP_X+HOOP_R+18&&ball.y>hy-86&&ball.y<hy-6){ball.vx=-Math.abs(ball.vx)*.45;ball.x=HOOP_X+HOOP_R;}}
  }
  function reset(){setTimeout(()=>{ball.x=BALL0.x;ball.y=BALL0.y;ball.vx=ball.vy=0;trail=[];api.invalidate();},350);}
  if(!ball.fly&&ball.x===BALL0.x&&k<3)api.zone(BALL0.x-40,BALL0.y-40,80,80,{
   down:pt=>{pull={x:pt.x,y:pt.y};ball.drag=true;msg='';},
   move:pt=>{let dx=pt.x-BALL0.x,dy=pt.y-BALL0.y;const L=Math.hypot(dx,dy),M=120;if(L>M){dx*=M/L;dy*=M/L;}pull={x:BALL0.x+dx,y:BALL0.y+dy};ball.x=pull.x;ball.y=pull.y;},
   up:()=>{ball.drag=false;if(pull){const vx=(BALL0.x-pull.x)*POWER,vy=(BALL0.y-pull.y)*POWER;if(Math.hypot(vx,vy)>140){ball.x=BALL0.x;ball.y=BALL0.y;ball.vx=vx;ball.vy=vy;ball.fly=true;trail=[];api.feedback('tick',330);}else{ball.x=BALL0.x;ball.y=BALL0.y;}pull=null;}}
  });
  // jugador
  ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(BALL0.x-30,404,40,8,0,0,TAU);ctx.fill();
  for(let i=0;i<trail.length;i++){ctx.globalAlpha=i/trail.length*.4;icon(ctx,'ball',trail[i][0],trail[i][1],30,{color:'#e8742a'});}ctx.globalAlpha=1;
  icon(ctx,'ball',ball.x,ball.y,40,{color:'#e8742a'});
  dots(ctx,theme,3,k);
 });
 return ()=>api.animate(false);
};

// ===========================================================================
// BICICLETA (spinning): fija la resistencia y pedalea al ritmo, tres veces.
// ===========================================================================
ENGINES.spinning=({api,hw,c,theme,cfg,mech})=>{
 let res=50,k=0;const pulses=[];let wheel=0;
 mech.canvas.__dbg=()=>({k,res});
 const BX=70,BW=500,BY=372,okR=()=>Math.abs(res-c.resistance)<=3;
 api.animate(true);
 api.setAnswer(()=>({resistance:res,pulses:[...pulses]}));
 api.setValid(()=>pulses.length===3&&okR(),{settle:.3});
 const wave=t=>{const u=(t/1000/3.2)%1;return 100*(u<.5?u*2:2-u*2);};
 mech.setDraw((api,hw,ctx,time,dt)=>{
  backdrop(ctx,hw,theme,time);
  card(ctx,24,30,W-48,H-60,{fill:'#24364a',r:20});
  dialDraw(ctx,api,{x:150,y:150,r:54,v:res,t:c.resistance,tol:3,ok:okR(),set:v=>{res=v;api.note('');api.invalidate();},get:()=>res});
  txt(ctx,'RESISTENCIA',150,64,{size:12,color:'#c9d9e8',weight:900});txt(ctx,`${res} / objetivo ${c.resistance}`,150,238,{size:14,color:okR()?'#8fe6c2':'#fff',stroke:INK});
  // bici estática
  wheel+=dt*(2+pulses.length*2);
  ctx.save();ctx.translate(430,170);ctx.lineCap='round';
  const line=(pts,w,col)=>{ctx.strokeStyle=col;ctx.lineWidth=w;ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();};
  const frame=[[[-70,92],[90,92]],[[-10,92],[-24,-30]],[[-24,-30],[56,-62]],[[56,-62],[56,40]],[[-24,-30],[-44,-52]],[[56,-62],[72,-76]]];
  for(const f of frame)line(f,12,INK);for(const f of frame)line(f,6,'#ffb347');
  rr(ctx,-62,-62,40,10,5);ink(ctx,'#2b2b2b',3);
  ctx.beginPath();ctx.arc(56,40,40,0,TAU);ink(ctx,'#4a5664',4);ctx.save();ctx.translate(56,40);ctx.rotate(wheel);ctx.strokeStyle='#cfd6dc';ctx.lineWidth=3;for(let q=0;q<6;q++){ctx.rotate(Math.PI/3);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-34);ctx.stroke();}ctx.restore();
  ctx.save();ctx.translate(-10,70);ctx.rotate(wheel);line([[0,-22],[0,22]],8,INK);ctx.restore();
  ctx.restore();
  // barra de pulsos
  ctx.fillStyle='#04141a';rr(ctx,BX,BY-10,BW,20,10);ink(ctx,'#04141a',2,'#4a5a6a');
  if(k<3){const zx=BX+(c.targets[k]-6)/100*BW;ctx.fillStyle='rgba(95,240,154,.55)';rr(ctx,zx,BY-10,BW*.12,20,6);ctx.fill();}
  const needle=wave(time),nx=BX+needle/100*BW;ctx.fillStyle='#fff';ctx.fillRect(nx-2,BY-18,4,36);
  pulses.forEach(v=>{ctx.fillStyle='#5ff09a';ctx.fillRect(BX+v/100*BW-2,BY-14,4,28);});
  txt(ctx,k<3?`PEDALADA ${k+1}/3 · TOCA CUANDO LA BARRA ESTÉ EN VERDE`:'RITMO CONSEGUIDO ✓',W/2,BY+30,{size:11,color:k<3?'#c9d9e8':'#5ff09a',weight:900});
  if(k<3)api.zone(BX-10,BY-40,BW+20,76,{down:()=>{const tt=time,cand=[wave(tt),wave(tt-70)].find(v=>Math.abs(v-c.targets[k])<=6);if(cand!==undefined){pulses.push(Math.round(cand));k++;api.feedback('ok',560+k*120);api.note('');}else{api.feedback('error');api.note('Fuera de ritmo.');}}});
  dots(ctx,theme,4,k+(okR()?1:0));
 });
 return ()=>api.animate(false);
};

// ===========================================================================
// MUESTRAS (hydration): mantén pulsado hasta la línea de referencia.
// ===========================================================================
ENGINES.hydration=({api,hw,c,theme,cfg,mech})=>{
 const lv=[0,0,0],hold=[false,false,false],tol=4;
 mech.canvas.__dbg=()=>({lv:[...lv]});
 const ok=i=>Math.abs(lv[i]-c.levels[i])<=tol;
 api.setAnswer(()=>lv.map(v=>Math.round(v)));
 api.setValid(()=>lv.every((v,i)=>ok(i)),{settle:.3});
 api.animate(true);
 mech.setDraw((api,hw,ctx,time,dt)=>{
  backdrop(ctx,hw,theme,time);
  card(ctx,24,34,W-48,H-68,{fill:cfg.panel,r:20});
  for(let i=0;i<3;i++){
   const x=120+i*200;
   if(hold[i]){lv[i]=Math.min(100,lv[i]+dt*36);if(lv[i]>c.levels[i]+tol){lv[i]=0;hold[i]=false;api.feedback('error');api.note('¡Te has pasado! Se vacía la muestra.');}}
   // grifo
   rr(ctx,x-10,64,20,38,4);ink(ctx,'#8a96a2',3);rr(ctx,x-24,92,48,22,8);ink(ctx,cfg.tap,3);
   ctx.beginPath();ctx.arc(x,76,16,0,TAU);ink(ctx,cfg.knob,3);
   if(hold[i]){ctx.fillStyle=cfg.water;ctx.globalAlpha=.8;ctx.fillRect(x-4,114,8,330-114-(lv[i]/100*200));ctx.globalAlpha=1;}
   // probeta
   const ty=140,th=200;
   ctx.fillStyle='rgba(255,255,255,.12)';rr(ctx,x-34,ty,68,th,14);ink(ctx,'rgba(255,255,255,.12)',4,'#cfe0ea');
   ctx.save();rr(ctx,x-31,ty+3,62,th-6,12);ctx.clip();const h=(th-6)*lv[i]/100;ctx.fillStyle=cfg.water;ctx.fillRect(x-34,ty+th-3-h,68,h);ctx.fillStyle='rgba(255,255,255,.35)';ctx.fillRect(x-34,ty+th-3-h,68,3);ctx.restore();
   const ly=ty+th-3-(th-6)*c.levels[i]/100;
   ctx.strokeStyle='#5ff09a';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x-44,ly);ctx.lineTo(x+44,ly);ctx.stroke();ctx.fillStyle='rgba(95,240,154,.3)';ctx.fillRect(x-40,ly-(th-6)*tol/100,80,(th-6)*tol*2/100);
   api.zone(x-60,60,120,th+90,{down:()=>{hold[i]=true;},up:()=>{hold[i]=false;if(lv[i]>0&&!ok(i)&&lv[i]<c.levels[i]-tol)api.note('Mantén pulsado un poco más.');}});
   ctx.beginPath();ctx.arc(x+50,ty+20,6,0,TAU);ink(ctx,ok(i)?'#8fe6c2':'#4d2a2a',2);
   txt(ctx,cfg.names[i],x,ty+th+26,{size:13,color:'#fff',stroke:INK});
   txt(ctx,'mantén pulsado',x,ty+th+48,{size:10,color:'#c9d9e8',weight:700});
  }
  dots(ctx,theme,3,lv.filter((v,i)=>ok(i)).length);
 });
 return ()=>api.animate(false);
};

// ===========================================================================
// MÁQUINAS DE CASA (Latasa´s House) y del bar del gimnasio
// lavadora, sartén, electrodoméstico y dispensador.
// ===========================================================================
const GARMENTS=['shirt','pants','sock','towel','shirt','sock'],GCOL=['#e8453a','#3b6fc0','#f5d033','#8fe6c2','#f4f6f8','#e056c8'];
const tag=(ctx,x,y,okTag)=>{ctx.beginPath();ctx.arc(x,y,11,0,TAU);ink(ctx,okTag?'#e8fff2':'#ffe8e8',2);
 ctx.strokeStyle=okTag?'#1f8a50':'#c0392b';ctx.lineWidth=2;rr(ctx,x-6,y-4,12,9,2);ctx.stroke();if(okTag){ctx.beginPath();ctx.moveTo(x-4,y-1);ctx.quadraticCurveTo(x,y+3,x+4,y-1);ctx.stroke();}else{ctx.beginPath();ctx.moveTo(x-8,y-8);ctx.lineTo(x+8,y+8);ctx.stroke();}};
ENGINES.washer=({api,hw,c,theme,cfg,mech})=>{
 const want=new Set(c.items),progs=c.programs||['P1','P2','P3','P4','P5','P6'],D={x:470,y:258,r:104};
 const spot=i=>({x:82+(i%3)*84,y:282+Math.floor(i/3)*68});
 const items=[0,1,2,3,4,5].map(i=>({i,...piece(spot(i).x,spot(i).y)}));
 const loaded=[];let door=0,closed=false,program=(c.program+2)%6,started=false,spin=0,spinT=0,done=false,doorAnim=0;
 mech.canvas.__dbg=()=>({loaded:[...loaded],program,closed,started});
 api.setAnswer(()=>({loaded:[...loaded],program,closed,started}));
 api.setValid(()=>done);
 api.animate(true);
 mech.setDraw((api,hw,ctx,time,dt)=>{
  backdrop(ctx,hw,theme,time);
  // nota con el encargo
  card(ctx,34,40,262,150,{fill:'#fff6d6',r:10,drop:4});
  ctx.fillStyle='#e05a5a';ctx.beginPath();ctx.arc(165,48,7,0,TAU);ctx.fill();
  txt(ctx,'LAVADORA · NOTA DE LATASA',165,70,{size:12,color:'#6a4a2a',weight:900});
  txt(ctx,'Programa:',52,100,{size:15,color:'#2b2b2b',align:'left',weight:800});
  txt(ctx,progs[c.program],278,100,{size:17,color:'#c0392b',align:'right',weight:900});
  txt(ctx,'Mete solo la ropa con',52,130,{size:13,color:'#3a3a3a',align:'left',weight:700});
  txt(ctx,'etiqueta verde',52,150,{size:13,color:'#1f8a50',align:'left',weight:900});tag(ctx,178,150,true);
  txt(ctx,'La roja se lava a mano.',52,172,{size:12,color:'#7a4a4a',align:'left',weight:700});tag(ctx,232,170,false);
  // cesto
  ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(166,412,140,14,0,0,TAU);ctx.fill();
  rr(ctx,30,224,272,184,26);ink(ctx,'#c89a5a',4);
  ctx.save();rr(ctx,32,226,268,180,24);ctx.clip();ctx.strokeStyle='rgba(110,70,30,.45)';ctx.lineWidth=3;
  for(let y=236;y<410;y+=14){ctx.beginPath();for(let x=30;x<=302;x+=12)ctx.lineTo(x,y+((x/12)%2?4:-4));ctx.stroke();}ctx.restore();
  rr(ctx,24,216,284,20,10);ink(ctx,'#a8783e',3.4);
  // lavadora
  card(ctx,334,42,276,372,{fill:'#eef2f5',r:22});
  rr(ctx,346,54,252,70,14);ink(ctx,'#d8dfe5',2.6);
  // selector
  const kx=380,ky=89;ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.arc(kx+2,ky+4,26,0,TAU);ctx.fill();
  ctx.beginPath();ctx.arc(kx,ky,26,0,TAU);ink(ctx,hw.paint.radial(kx-8,ky-8,2,(26)*1.3,['0:#ffffff','1:#b9c4cc']),3);
  for(let k=0;k<6;k++){const a=-Math.PI/2+k*TAU/6;ctx.fillStyle=k===program?'#2e7dd6':'#9aa7b2';ctx.beginPath();ctx.arc(kx+Math.cos(a)*33,ky+Math.sin(a)*33,3,0,TAU);ctx.fill();}
  ctx.save();ctx.translate(kx,ky);ctx.rotate(program*TAU/6);ctx.strokeStyle='#2e7dd6';ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(0,-20);ctx.stroke();ctx.restore();
  api.zone(kx-34,ky-34,68,68,{down:()=>{if(started)return;program=(program+1)%6;api.feedback('tick',520+program*40);}});
  // pantalla
  ctx.fillStyle='#0e2a22';rr(ctx,420,70,124,38,8);ctx.fill();ctx.strokeStyle=INK;ctx.lineWidth=2.6;ctx.stroke();glass(ctx,420,70,124,38,8);
  txt(ctx,progs[program],482,82,{size:12,color:program===c.program?'#7dffb0':'#9fe0c8',weight:900});
  txt(ctx,started?(done?'FIN ✓':'LAVANDO…'):closed?'LISTA':'PUERTA ABIERTA',482,98,{size:9,color:'#6fc7a5',weight:800});
  // botón inicio
  const bx=574,by=89,ready=closed&&!started;
  if(ready)glow(ctx,bx,by,34,'#5ff09a',.35+.2*Math.sin(time/200));
  ctx.beginPath();ctx.arc(bx,by+3,16,0,TAU);ctx.fillStyle='rgba(0,0,0,.3)';ctx.fill();
  ctx.beginPath();ctx.arc(bx,by,16,0,TAU);ink(ctx,started?'#2e9a5a':ready?'#3fc77a':'#9aa7b2',3);
  ctx.strokeStyle='#fff';ctx.lineWidth=2.6;ctx.beginPath();ctx.arc(bx,by+1,7,-1.1,4.25);ctx.stroke();ctx.beginPath();ctx.moveTo(bx,by-8);ctx.lineTo(bx,by+1);ctx.stroke();
  api.zone(bx-24,by-24,48,48,{down:()=>{if(started)return;
   if(!closed){api.feedback('error');api.note('Primero cierra la puerta.');return;}
   if(program!==c.program){api.feedback('error');api.note('Ese no es el programa de la nota.');return;}
   started=true;spinT=0;api.feedback('ok',660);}});
  // tambor
  if(started&&!done){spinT+=dt;spin+=dt*(2+Math.min(14,spinT*9));if(spinT>1.8){done=true;api.feedback('ok',990);}}
  else if(!started)spin+=dt*.4;
  ctx.beginPath();ctx.arc(D.x,D.y+4,D.r+6,0,TAU);ctx.fillStyle='rgba(0,0,0,.18)';ctx.fill();
  ctx.beginPath();ctx.arc(D.x,D.y,D.r,0,TAU);ink(ctx,'#cfd8df',3.4);
  ctx.beginPath();ctx.arc(D.x,D.y,D.r-16,0,TAU);ink(ctx,'#2a3540',3);
  ctx.save();ctx.beginPath();ctx.arc(D.x,D.y,D.r-19,0,TAU);ctx.clip();
  ctx.fillStyle=hw.paint.radial(D.x,D.y,8,(D.r)*1.3,['0:#56636e','1:#1c242c']);ctx.fillRect(D.x-D.r,D.y-D.r,D.r*2,D.r*2);
  ctx.fillStyle='rgba(255,255,255,.08)';for(let k=0;k<24;k++){const a=spin+k*TAU/24;for(let rr2=20;rr2<D.r-20;rr2+=16){ctx.beginPath();ctx.arc(D.x+Math.cos(a)*rr2,D.y+Math.sin(a)*rr2,2,0,TAU);ctx.fill();}}
  if(started){ctx.fillStyle='rgba(120,190,240,.35)';ctx.fillRect(D.x-D.r,D.y+18-Math.sin(spin)*4,D.r*2,D.r);ctx.fillStyle='rgba(255,255,255,.5)';for(let k=0;k<8;k++){const a=spin*1.7+k;ctx.beginPath();ctx.arc(D.x+Math.cos(a)*50,D.y+30+Math.sin(a*1.3)*20,4+(k%3)*2,0,TAU);ctx.fill();}}
  loaded.forEach((g,k)=>{const a=spin+k*TAU/4,r=started?36:44;icon(ctx,GARMENTS[g],D.x+Math.cos(a)*r,D.y+Math.sin(a)*r*.7+(started?0:24),46,{rot:a,color:GCOL[g]});});
  ctx.restore();
  // puerta
  const target=closed?1:0;doorAnim+=(target-doorAnim)*(1-Math.exp(-12*dt));
  const sx=.25+.75*doorAnim,dx=D.x+(1-doorAnim)*(D.r+38);
  ctx.save();ctx.translate(dx,D.y);ctx.scale(sx,1);
  ctx.beginPath();ctx.arc(0,0,D.r-4,0,TAU);ctx.lineWidth=18;ctx.strokeStyle=INK;ctx.stroke();ctx.lineWidth=12;ctx.strokeStyle='#e4eaee';ctx.stroke();
  ctx.beginPath();ctx.arc(0,0,D.r-15,0,TAU);ctx.fillStyle=`rgba(170,215,240,${.15+doorAnim*.1})`;ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='rgba(255,255,255,.5)';ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.22)';ctx.beginPath();ctx.ellipse(-30,-34,14,40,.6,0,TAU);ctx.fill();
  rr(ctx,D.r-16,-26,20,52,8);ink(ctx,'#9aa7b2',3);ctx.restore();
  api.zone(D.x-D.r-10,D.y-D.r-10,D.r*2+70,D.r*2+20,{down:()=>{if(started)return;
   if(!closed&&loaded.length<4){api.note('Faltan prendas por meter ('+loaded.length+'/4).');api.feedback('error');return;}
   closed=!closed;api.feedback('tick',closed?300:420);}});
  // pie y bandeja de detergente
  rr(ctx,346,384,252,18,8);ink(ctx,'#cfd8df',2.4);
  // prendas del cesto
  for(const it of [...items].sort((a,b)=>a.lift-b.lift)){
   if(it.gone)continue;stepPiece(it,dt);
   if(!it.drag&&!closed)grab(api,it,70,60,{pad:8,onDrop:p=>{
    if(Math.hypot(p.x-D.x,p.y-D.y)<D.r+20){
     if(!want.has(p.i)){api.feedback('error');api.note('Esa prenda tiene etiqueta roja: se lava a mano.');return;}
     p.gone=true;loaded.push(p.i);api.feedback('ok',480+loaded.length*70);
    }}});
   const s=64*(1+it.lift*.15);
   if(it.lift>.01){ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(it.x+6,it.y+s*.42,s*.36,s*.09,0,0,TAU);ctx.fill();}
   icon(ctx,GARMENTS[it.i],it.x,it.y,s,{rot:((it.i*29)%7-3)*.08,color:GCOL[it.i]});
   tag(ctx,it.x+s*.3,it.y-s*.26,want.has(it.i));
  }
  dots(ctx,theme,4,loaded.length);
 });
 return ()=>api.animate(false);
};

// ===========================================================================
// SARTÉN (cook): huevos, remover, fuego exacto y dar la vuelta.
// ===========================================================================
ENGINES.cook=({api,hw,c,theme,cfg,mech})=>{
 const P={x:330,y:250,r:104},eggs=[0,1,2].map(i=>({i,...piece(78+i*0,150+i*84)}));
 let n=0,stir=0,stirred=false,heat=0,cooked=0,flipped=false,flipT=0,done=false,last=null,yolks=[];
 mech.canvas.__dbg=()=>({eggs:n,stirred,heat,flipped});
 api.setAnswer(()=>({eggs:n,stirred,heat,flipped}));
 api.setValid(()=>done&&heat===c.heat);
 api.animate(true);
 mech.setDraw((api,hw,ctx,time,dt)=>{
  backdrop(ctx,hw,theme,time);
  // encimera y placa
  card(ctx,24,36,W-48,H-66,{fill:'#d9d2c4',r:20});
  ctx.fillStyle='#1c1f24';rr(ctx,170,70,330,330,22);ctx.fill();ctx.strokeStyle=INK;ctx.lineWidth=3.4;ctx.stroke();glass(ctx,170,70,330,330,22);
  // receta
  card(ctx,520,52,98,128,{fill:'#fff6d6',r:8,drop:3});
  txt(ctx,'RECETA',569,70,{size:11,color:'#6a4a2a',weight:900});txt(ctx,'3 huevos',569,94,{size:12,color:'#2b2b2b',weight:800});txt(ctx,'remover',569,112,{size:12,color:'#2b2b2b',weight:800});
  txt(ctx,'fuego '+c.heat,569,136,{size:18,color:'#c0392b',weight:900});txt(ctx,'y la vuelta',569,160,{size:12,color:'#2b2b2b',weight:800});
  // fuego
  const hot=heat/9;if(heat>0){glow(ctx,P.x,P.y,P.r+40+hot*30,heat>c.heat?'#ff4a2a':'#ff8a3a',.25+hot*.5);
   for(let k=0;k<16;k++){const a=k*TAU/16,f=.8+.2*Math.sin(time/60+k*2);ctx.fillStyle=k%2?'#5aa0ff':'#9fd0ff';ctx.beginPath();ctx.ellipse(P.x+Math.cos(a)*(P.r-10),P.y+Math.sin(a)*(P.r-10),4,8*hot*f+2,a+Math.PI/2,0,TAU);ctx.fill();}}
  // sartén
  ctx.save();const fl=flipped?Math.min(1,flipT/.6):0;
  ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(P.x+8,P.y+12,P.r+6,P.r,0,0,TAU);ctx.fill();
  rr(ctx,P.x+P.r-6,P.y-14,170,28,12);ink(ctx,'#2a2a2a',3.4);rr(ctx,P.x+P.r+70,P.y-10,90,20,10);ink(ctx,'#a0522d',2.4);
  ctx.beginPath();ctx.arc(P.x,P.y,P.r,0,TAU);ink(ctx,'#3c4248',4);ctx.beginPath();ctx.arc(P.x,P.y,P.r-10,0,TAU);ink(ctx,hw.paint.radial(P.x-30,P.y-30,4,(P.r)*1.3,['0:#4c545c','1:#22272c']),2);
  // contenido
  const lift=flipped&&fl<1?Math.sin(fl*Math.PI)*90:0,sc=flipped&&fl<1?Math.cos(fl*Math.PI*2):1;
  if(n>0){ctx.save();ctx.translate(P.x,P.y-lift);ctx.scale(1,Math.abs(sc)<.08?.08:sc);
   if(stirred){const brown=flipped&&fl>=.5?.15:cooked*.35;const col=`rgb(${245-brown*90|0},${205-brown*110|0},${70-brown*40|0})`;ctx.beginPath();ctx.arc(0,0,P.r-22,0,TAU);ink(ctx,col,3,'#b8862a');
    if(flipped&&fl>=.5){ctx.fillStyle='rgba(150,90,30,.4)';for(let k=0;k<9;k++){ctx.beginPath();ctx.arc(Math.cos(k*2.4)*40,Math.sin(k*1.7)*36,7+k%3*3,0,TAU);ctx.fill();}}
    ctx.fillStyle='rgba(255,255,255,.25)';ctx.beginPath();ctx.ellipse(-28,-30,22,9,-.5,0,TAU);ctx.fill();}
   else{for(const y of yolks){ctx.beginPath();ctx.ellipse(y.x,y.y,42,36,y.a,0,TAU);ink(ctx,'rgba(250,250,245,.95)',2,'#d8d0c0');}
    for(const y of yolks){ctx.beginPath();ctx.arc(y.x+4,y.y,15,0,TAU);ink(ctx,'#f5b81c',2,'#c98a10');ctx.fillStyle='rgba(255,255,255,.6)';ctx.beginPath();ctx.arc(y.x,y.y-5,4,0,TAU);ctx.fill();}}
   ctx.restore();}
  ctx.restore();
  if(flipped&&!done){flipT+=dt;if(flipT>=.6){done=true;api.feedback('ok',880);}}
  // cocinar
  if(stirred&&!flipped){
   if(heat===c.heat){cooked=Math.min(1,cooked+dt/1.6);if(cooked>=1&&Math.floor(time/400)%2)txt(ctx,'¡DALE LA VUELTA! ⤴',P.x,P.y-P.r-18,{size:16,color:'#fff',stroke:INK});}
   else if(heat>c.heat){ctx.fillStyle='rgba(90,90,90,.35)';for(let k=0;k<5;k++){const t=(time/900+k/5)%1;ctx.beginPath();ctx.arc(P.x-40+k*20,P.y-30-t*120,10+t*20,0,TAU);ctx.fill();}txt(ctx,'¡Fuego demasiado alto!',P.x,P.y-P.r-18,{size:14,color:'#ffd0c0',stroke:INK});}
   else txt(ctx,heat?'Fuego muy bajo…':'Enciende el fuego',P.x,P.y-P.r-18,{size:14,color:'#fff',stroke:INK});
   ctx.fillStyle='rgba(0,0,0,.4)';rr(ctx,P.x-80,P.y+P.r+14,160,10,5);ctx.fill();ctx.fillStyle='#f5b81c';rr(ctx,P.x-80,P.y+P.r+14,160*cooked,10,5);ctx.fill();
  }
  // remover / voltear
  if(n===3&&!stirred){
   txt(ctx,'Remueve en círculos dentro de la sartén',P.x,P.y-P.r-18,{size:13,color:'#fff',stroke:INK});
   ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillRect(P.x-60,P.y+P.r+14,120,8);ctx.fillStyle='#8fe6c2';ctx.fillRect(P.x-60,P.y+P.r+14,120*Math.min(1,stir/900),8);
   api.zone(P.x-P.r,P.y-P.r,P.r*2,P.r*2,{down:pt=>{last=pt;},move:pt=>{if(last){stir+=Math.hypot(pt.x-last.x,pt.y-last.y);if(stir>900&&!stirred){stirred=true;api.feedback('ok',620);}else if(Math.floor(stir/180)!==Math.floor((stir-Math.hypot(pt.x-last.x,pt.y-last.y))/180))api.feedback('tick',340+stir/8);}last=pt;},up:()=>{last=null;}});
   if(last){ctx.save();ctx.translate(last.x,last.y);ctx.rotate(.7);rr(ctx,-10,-6,20,70,6);ink(ctx,'#c08040',3);rr(ctx,-18,-40,36,38,10);ink(ctx,'#3a3a3a',3);ctx.restore();}
  }
  if(stirred&&cooked>=1&&!flipped){let y0=null;api.zone(P.x+P.r-10,P.y-60,180,120,{down:pt=>{y0=pt.y;},move:pt=>{if(y0!=null&&y0-pt.y>40&&!flipped){flipped=true;flipT=0;api.feedback('tick',700);}},up:()=>{y0=null;}});
   api.zone(P.x-P.r,P.y-P.r,P.r*2,P.r*2,{down:()=>{if(!flipped){flipped=true;flipT=0;api.feedback('tick',700);}}});}
  // mando del fuego
  const kx=560,ky=320;knobAt(api,kx,ky,40,()=>heat/9*100,v=>{const h=Math.round(v/100*9);if(h!==heat){heat=h;api.feedback('tick',260+h*50);}});
  ctx.beginPath();ctx.arc(kx+2,ky+5,40,0,TAU);ctx.fillStyle='rgba(0,0,0,.3)';ctx.fill();
  ctx.beginPath();ctx.arc(kx,ky,40,0,TAU);ink(ctx,hw.paint.radial(kx-12,ky-12,2,(40)*1.3,['0:#ffffff','1:#a7b0b8']),3.4);
  for(let k=0;k<=9;k++){const a=A0+ASPAN*k/9;ctx.fillStyle=k===c.heat?'#c0392b':'#3a3f46';ctx.beginPath();ctx.arc(kx+Math.cos(a-Math.PI/2)*52,ky+Math.sin(a-Math.PI/2)*52,k===c.heat?5:2.6,0,TAU);ctx.fill();}
  ctx.save();ctx.translate(kx,ky);ctx.rotate(A0+ASPAN*heat/9);rr(ctx,-8,-36,16,46,6);ink(ctx,'#3a3f46',2.4);ctx.fillStyle=heat===c.heat?'#3fc77a':'#e0453a';ctx.fillRect(-3,-34,6,14);ctx.restore();
  txt(ctx,'FUEGO '+heat,kx,ky+62,{size:13,color:heat===c.heat?'#1f8a50':'#3a3a3a',weight:900});
  // huevera
  card(ctx,38,104,82,262,{fill:'#d7c3a0',r:14,drop:3});
  for(const e of eggs){if(e.gone)continue;stepPiece(e,dt);
   if(!e.drag)grab(api,e,56,70,{onDrop:p=>{if(Math.hypot(p.x-P.x,p.y-P.y)<P.r){p.gone=true;n++;yolks.push({x:[-34,30,0][yolks.length],y:[-20,-14,34][yolks.length],a:yolks.length});api.feedback('ok',500+n*80);}}});
   ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.ellipse(e.x+4,e.y+30,24,7,0,0,TAU);ctx.fill();
   ctx.beginPath();ctx.ellipse(e.x,e.y,26,33,0,0,TAU);ink(ctx,hw.paint.radial(e.x-8,e.y-12,2,(34)*1.3,['0:#fffaf0','1:#e8cfa8']),3);
  }
  dots(ctx,theme,4,n===3?1+(stirred?1:0)+(cooked>=1?1:0)+(done?1:0):0);
 });
 return ()=>api.animate(false);
};

// ===========================================================================
// ELECTRODOMÉSTICO (appliance): tornillos en orden, pieza y prueba.
// ===========================================================================
ENGINES.appliance=({api,hw,c,theme,cfg,mech})=>{
 const B={x:150,y:96,w:300,h:250},SP=[[B.x+26,B.y+26],[B.x+B.w-26,B.y+26],[B.x+26,B.y+B.h-26],[B.x+B.w-26,B.y+B.h-26]];
 const sorted=[0,1,2,3].sort((a,b)=>c.screws[a]-c.screws[b]),order=[],out=[0,0,0,0];
 let cover=0,part=-1,lever=0,leverDrag=false,test=false,testT=0,done=false;
 const spare=piece(548,230);
 mech.canvas.__dbg=()=>({order:[...order],part,test});
 api.setAnswer(()=>({order:[...order],part,test}));
 api.setValid(()=>done);
 api.animate(true);
 const label=cfg?.name||'TOSTADORA';
 mech.setDraw((api,hw,ctx,time,dt)=>{
  backdrop(ctx,hw,theme,time);
  card(ctx,24,36,W-48,H-66,{fill:'#7a5a3e',r:20});
  ctx.strokeStyle='rgba(0,0,0,.18)';ctx.lineWidth=2;for(let y=60;y<H-40;y+=26){ctx.beginPath();ctx.moveTo(30,y);ctx.lineTo(W-30,y+3);ctx.stroke();}
  txt(ctx,'TALLER · '+label,B.x+B.w/2,62,{size:13,color:'#fff3dc',stroke:INK});
  // cuerpo
  ctx.fillStyle='rgba(0,0,0,.35)';rr(ctx,B.x+10,B.y+16,B.w,B.h,24);ctx.fill();
  rr(ctx,B.x-14,B.y-14,B.w+28,B.h+28,26);ink(ctx,hw.paint.linear(0,B.y,0,B.y+B.h,['0:#e9eef2','1:#9aa7b2']),3.4);
  // interior
  ctx.fillStyle='#1d2228';rr(ctx,B.x,B.y,B.w,B.h,16);ctx.fill();
  for(let s=0;s<3;s++){const y=B.y+60+s*66,burnt=s===c.part&&part!==c.part,lit=test&&testT>.1;
   ctx.fillStyle='#2b3138';rr(ctx,B.x+22,y-20,B.w-44,40,8);ctx.fill();
   ctx.strokeStyle=lit?'#ff8a3a':burnt?'#2a1a14':'#b07850';ctx.lineWidth=4;ctx.beginPath();for(let k=0;k<=24;k++){const x=B.x+34+k*(B.w-68)/24;ctx.lineTo(x,y+(k%2?-11:11));}ctx.stroke();
   if(lit)glow(ctx,B.x+B.w/2,y,120,'#ff7a2a',.35);
   if(burnt){ctx.fillStyle='rgba(0,0,0,.55)';ctx.beginPath();ctx.ellipse(B.x+B.w/2,y,70,16,0,0,TAU);ctx.fill();if(Math.sin(time/90+s)>.6){ctx.strokeStyle='#ffe45f';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(B.x+B.w/2-10,y-8);ctx.lineTo(B.x+B.w/2+4,y-2);ctx.lineTo(B.x+B.w/2-4,y+4);ctx.lineTo(B.x+B.w/2+12,y+12);ctx.stroke();}}
   txt(ctx,(c.parts||['A','B','C'])[s],B.x+12,y,{size:11,color:'#c9d4de'});
  }
  // tapa con tornillos
  const all=order.length===4;cover=all?Math.min(1,cover+dt*2.2):0;
  if(cover<1){ctx.save();ctx.translate(cover*B.w*1.1,cover*40);ctx.rotate(cover*.25);
   card(ctx,B.x-6,B.y-6,B.w+12,B.h+12,{fill:'#c9d2d8',r:18,drop:4});
   ctx.fillStyle='rgba(0,0,0,.18)';for(let k=0;k<9;k++){rr(ctx,B.x+54+k*22,B.y+70,8,110,4);ctx.fill();}
   txt(ctx,'⚠ DESENCHUFADO',B.x+B.w/2,B.y+B.h-46,{size:13,color:'#5a6670',weight:900});
   for(let i=0;i<4;i++){const [x,y]=SP[i];if(out[i]>=1)continue;
    if(out[i]>0)out[i]=Math.min(1,out[i]+dt*3.5);
    ctx.fillStyle='#ffe9a8';rr(ctx,x-12,y+12,24,18,5);ctx.fill();ctx.strokeStyle=INK;ctx.lineWidth=2;ctx.stroke();txt(ctx,String(c.screws[i]),x,y+21,{size:12,color:'#2b2b2b',weight:900});
    ctx.save();ctx.translate(0,-out[i]*16);screw(ctx,x,y,11,out[i]*12+.7);ctx.restore();
    if(!all&&out[i]===0)api.zone(x-24,y-24,48,56,{down:()=>{if(sorted[order.length]!==i){api.feedback('error');api.note('Sigue el orden de los números: 1, 2, 3, 4.');return;}order.push(i);out[i]=.01;api.feedback('tick',380+order.length*90);}});
   }
   ctx.restore();}
  // pieza de repuesto
  card(ctx,500,140,100,170,{fill:'#4a3828',r:12,drop:3});txt(ctx,'REPUESTO',550,160,{size:11,color:'#ffe9c8',weight:900});
  if(part!==c.part){stepPiece(spare,dt);if(cover>=1&&!spare.drag)grab(api,spare,90,40,{onDrop:p=>{
    for(let s=0;s<3;s++){const y=B.y+60+s*66;if(p.x>B.x&&p.x<B.x+B.w&&Math.abs(p.y-y)<32){if(s!==c.part){api.feedback('error');api.note('Esa resistencia está bien: cambia la quemada.');return;}part=s;api.feedback('ok',760);return;}}}});
   ctx.save();ctx.translate(spare.x,spare.y);ctx.rotate(spare.drag?0:-.2);rr(ctx,-44,-12,88,24,8);ink(ctx,'#3b444d',3);ctx.strokeStyle='#e0a070';ctx.lineWidth=3.4;ctx.beginPath();for(let k=0;k<=12;k++)ctx.lineTo(-36+k*6,k%2?-7:7);ctx.stroke();ctx.restore();
   if(cover>=1&&!spare.drag)txt(ctx,'Arrástrala a la quemada',B.x+B.w/2,B.y+B.h+38,{size:13,color:'#fff',stroke:INK});
  }
  // palanca de prueba
  const lx=B.x+B.w+26,top=B.y+40,len=120,canTest=part===c.part;
  ctx.fillStyle='#1d2228';rr(ctx,lx-7,top,14,len+24,7);ctx.fill();
  if(!leverDrag&&!test)lever=Math.max(0,lever-dt*300);
  const ly=top+12+lever/100*len;rr(ctx,lx-6,ly-2,40,16,6);ink(ctx,canTest?'#e0453a':'#7a7a7a',3);
  if(canTest&&!test){txt(ctx,'Baja la palanca ⬇',lx+60,top-10,{size:12,color:'#fff',stroke:INK});
   api.zone(lx-24,top-16,90,len+60,{down:()=>{leverDrag=true;},move:pt=>{lever=clamp((pt.y-top-12)/len*100,0,100);if(lever>=96&&!test){test=true;testT=0;api.feedback('tick',300);}},up:()=>{leverDrag=false;}});}
  if(test){lever=100;testT+=dt;if(testT>1.2&&!done){done=true;api.feedback('ok',1040);}
   const up=clamp((testT-1)/.25,0,1);for(let k=0;k<2;k++){const tx=B.x+70+k*130,ty=B.y-10-up*60;rr(ctx,tx,ty,90,70,18);ink(ctx,'#d9a35a',3,'#7a4a1a');rr(ctx,tx+8,ty+8,74,54,14);ctx.fillStyle='#f0cf8a';ctx.fill();}}
  dots(ctx,theme,3,(all?1:0)+(part===c.part?1:0)+(done?1:0));
 });
 return ()=>api.animate(false);
};

// ===========================================================================
// DISPENSADOR (refill): llena el depósito hasta la marca sin derramar.
// ===========================================================================
ENGINES.refill=({api,hw,c,theme,cfg,mech})=>{
 const tol=Math.max(2,(c.tol||5)-1),T={x:250,y:110,w:140,h:250};
 let lv=0,hold=false,spill=0,drops=[];
 mech.canvas.__dbg=()=>({level:lv});
 const ok=()=>Math.abs(lv-c.target)<=tol;
 api.setAnswer(()=>({level:Math.round(lv)}));
 api.setValid(()=>!hold&&ok(),{settle:.35});
 api.animate(true);
 mech.setDraw((api,hw,ctx,time,dt)=>{
  backdrop(ctx,hw,theme,time);
  card(ctx,140,40,360,370,{fill:cfg.body,r:26});
  rr(ctx,166,56,308,40,12);ink(ctx,shade(cfg.body,-.25),2.6);txt(ctx,cfg.label,320,76,{size:14,color:'#fff',stroke:INK});
  if(hold){lv=Math.min(100,lv+dt*(lv>c.target-12?14:30));if(Math.random()<dt*30)drops.push({x:T.x+T.w/2+(Math.random()-.5)*8,y:T.y-6,v:120});
   if(lv>c.target+tol){spill=1;lv=0;hold=false;api.feedback('error');api.note('¡Se ha desbordado! Se vacía el depósito.');}
   else if(Math.floor(lv/5)!==Math.floor((lv-dt*30)/5))api.feedback('tick',300+lv*5);}
  spill=Math.max(0,spill-dt);
  // caño
  rr(ctx,T.x+T.w/2-16,96,32,22,6);ink(ctx,'#9aa7b2',3);
  if(hold){ctx.fillStyle=cfg.liquid;ctx.globalAlpha=.85;ctx.fillRect(T.x+T.w/2-5,118,10,T.h-(lv/100*(T.h-10))-8);ctx.globalAlpha=1;}
  // depósito
  ctx.fillStyle='rgba(255,255,255,.14)';rr(ctx,T.x,T.y+8,T.w,T.h,18);ink(ctx,'rgba(255,255,255,.14)',4,'#d8e4ea');
  ctx.save();rr(ctx,T.x+4,T.y+12,T.w-8,T.h-8,15);ctx.clip();const h=(T.h-8)*lv/100,top=T.y+T.h+4-h;
  ctx.fillStyle=cfg.liquid;ctx.beginPath();ctx.moveTo(T.x,top);for(let x=0;x<=T.w;x+=10)ctx.lineTo(T.x+x,top+Math.sin(time/180+x/14)*(hold?3:1.2));ctx.lineTo(T.x+T.w,T.y+T.h+20);ctx.lineTo(T.x,T.y+T.h+20);ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.35)';for(let k=0;k<6;k++){const t=(time/1400+k/6)%1;ctx.beginPath();ctx.arc(T.x+20+k*20,top+h*(1-t),3,0,TAU);if(lv>5)ctx.fill();}
  ctx.restore();glass(ctx,T.x,T.y+8,T.w,T.h,18);
  for(let k=0;k<=10;k++){const y=T.y+T.h+4-(T.h-8)*k/10;ctx.fillStyle='rgba(255,255,255,.7)';ctx.fillRect(T.x+T.w-22,y-1,k%5?10:18,2);}
  const ly=T.y+T.h+4-(T.h-8)*c.target/100,band=(T.h-8)*tol/100;
  ctx.fillStyle='rgba(95,240,154,.32)';ctx.fillRect(T.x-14,ly-band,T.w+28,band*2);ctx.strokeStyle='#5ff09a';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(T.x-18,ly);ctx.lineTo(T.x+T.w+18,ly);ctx.stroke();
  txt(ctx,'◀ MARCA',T.x+T.w+56,ly,{size:12,color:'#5ff09a',stroke:INK});
  for(const d of drops){d.v+=600*dt;d.y+=d.v*dt;ctx.fillStyle=cfg.liquid;ctx.beginPath();ctx.arc(d.x,d.y,3,0,TAU);ctx.fill();}drops=drops.filter(d=>d.y<T.y+T.h-(T.h*lv/100));
  if(spill>0){ctx.globalAlpha=spill;ctx.fillStyle=cfg.liquid;ctx.beginPath();ctx.ellipse(320,402,200*(1.2-spill*.2),14,0,0,TAU);ctx.fill();ctx.globalAlpha=1;}
  // botón
  const bx=560,by=300,on=hold;glow(ctx,bx,by,70,cfg.liquid,on?.5:.15);
  ctx.beginPath();ctx.arc(bx,by+6,44,0,TAU);ctx.fillStyle='rgba(0,0,0,.35)';ctx.fill();
  ctx.beginPath();ctx.arc(bx,by+(on?4:0),44,0,TAU);ink(ctx,on?shade(cfg.button,-.15):cfg.button,4);
  ctx.fillStyle='rgba(255,255,255,.3)';ctx.beginPath();ctx.ellipse(bx-12,by-16+(on?4:0),18,8,-.5,0,TAU);ctx.fill();
  txt(ctx,'MANTÉN',bx,by+(on?4:0),{size:13,color:'#fff',stroke:INK});
  api.zone(bx-60,by-60,120,120,{down:()=>{hold=true;},up:()=>{hold=false;if(lv>0&&lv<c.target-tol)api.note('Un poco más: hasta la marca verde.');}});
  api.zone(T.x-20,T.y,T.w+40,T.h+20,{down:()=>{hold=true;},up:()=>{hold=false;}});
  txt(ctx,ok()?'¡PERFECTO! ✓':'Llena hasta la marca',320,386,{size:13,color:ok()?'#5ff09a':'#fff',stroke:INK});
  dots(ctx,theme,1,ok()?1:0);
 });
 return ()=>api.animate(false);
};

// ===========================================================================
// Montaje
// ===========================================================================
export function mountThemed(root,task,{submit,tone=()=>{}},def){
 const theme=task.theme||'school';
 const mech=createMechanism(root,{title:def.title,subtitle:'AS / '+THEME[theme].name,instructions:def.brief,machine:task.kind,tone,reduced:!!root.ownerDocument.documentElement.dataset.reducedEffects});
 mech.onSubmit(async v=>{await submit(v);});
 const shell=root.querySelector('.mech'),api=mech.api,base=api.feedback;
 api.feedback=(k,f)=>{base(k,f);if(k==='error'){shell?.classList.remove('mech-error');void shell?.offsetWidth;shell?.classList.add('mech-error');}};
 const eng=ENGINES[def.engine];
 const off=eng({api,hw:mech.hw,c:task.challenge,theme,cfg:def.cfg,mech,task});
 return ()=>{try{off?.();}catch{}mech.dispose();};
}
export {ENGINES};
