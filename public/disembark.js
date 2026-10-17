// Escena de llegada: los jugadores bajan de la caravana y forman una fila, de frente.
// Todo se calcula a partir de un único reloj (`t` = ms desde `intro.neutralAt` del servidor),
// así que cualquier cliente que dibuje en el mismo instante ve exactamente lo mismo.
import {drawRobot} from './characters.js';
import {drawNameTag} from './pass.js';

export const DISEMBARK={lead:900,walk:1500,hold:500};
export const disembarkStagger=n=>Math.min(380,2600/Math.max(1,n));
export const disembarkMs=n=>DISEMBARK.lead+(Math.max(1,n)-1)*disembarkStagger(n)+DISEMBARK.walk+DISEMBARK.hold;

const W=1280,H=720,DOOR={x:430,y:412},ROW=612;
const clamp=v=>Math.max(0,Math.min(1,v)),ease=v=>{v=clamp(v);return v*v*(3-2*v);},lerp=(a,b,t)=>a+(b-a)*t;
const rr=(c,x,y,w,h,r)=>{c.beginPath();c.roundRect(x,y,w,h,r);};

// Posición de cada jugador en el instante t (ms). Pura y comprobable.
export function placement(i,n,t){
 const stag=disembarkStagger(n),spacing=Math.min(112,1120/Math.max(1,n)),slot=640+(n-1)/2*spacing-i*spacing;
 const u=(t-DISEMBARK.lead-i*stag)/DISEMBARK.walk;
 if(u<=0)return {visible:false,x:DOOR.x,y:DOOR.y,s:.5,moving:false,arrived:false,u:0};
 const e=clamp(u);let x,y,s;
 if(e<.22){const k=ease(e/.22);x=DOOR.x;y=DOOR.y+k*8;s=lerp(.5,.58,k);}                     // asoma por la puerta
 else if(e<.42){const k=ease((e-.22)/.2);x=DOOR.x;y=lerp(DOOR.y+8,DOOR.y+70,k);s=lerp(.58,.72,k);}  // baja los peldaños
 else{const k=ease((e-.42)/.58);x=lerp(DOOR.x,slot,k);y=lerp(DOOR.y+70,ROW,k);s=lerp(.72,1,k);}      // camina hasta su sitio
 const hop=e<1?Math.abs(Math.sin(e*Math.PI*7))*5:0;
 return {visible:true,x,y:y-hop,s,moving:e<1,arrived:u>=1,u,slot,alpha:clamp(u*6)};
}

function paintBackground(c){
 const sky=c.createLinearGradient(0,0,0,430);sky.addColorStop(0,'#5b3fb0');sky.addColorStop(.55,'#b9a3ee');sky.addColorStop(1,'#f4eeff');
 c.fillStyle=sky;c.fillRect(0,0,W,H);
 c.fillStyle='#ffffff55';for(const [x,y,r] of [[120,70,38],[170,60,30],[1060,110,44],[1120,98,32],[860,50,26]]){c.beginPath();c.arc(x,y,r,0,7);c.fill();}
 c.fillStyle='#8a73cc55';c.beginPath();c.moveTo(0,400);for(let x=0;x<=W;x+=80)c.lineTo(x,330+Math.sin(x*.011)*34);c.lineTo(W,400);c.fill();
 const g=c.createLinearGradient(0,400,0,H);g.addColorStop(0,'#8f8cc4');g.addColorStop(.12,'#7f7ab5');g.addColorStop(1,'#554d93');c.fillStyle=g;c.fillRect(0,400,W,H-400);
 c.fillStyle='#ffffff22';rr(c,0,ROW-30,W,70,0);c.fill();                               // franja donde se forma la fila
 c.strokeStyle='#ffffff40';c.lineWidth=3;c.setLineDash([46,32]);c.beginPath();c.moveTo(0,ROW+44);c.lineTo(W,ROW+44);c.stroke();c.setLineDash([]);
 // caravana alta, con volumen: cara lateral, techo, cara trasera y toldo
 const bx=70,by=96,bw=640,bh=316;
 c.fillStyle='#1d1340';c.beginPath();c.ellipse(bx+bw/2+30,by+bh+8,bw/2+70,22,0,0,7);c.fill();                // sombra
 c.fillStyle='#d9ccf6';c.beginPath();c.moveTo(bx+bw,by);c.lineTo(bx+bw+64,by+26);c.lineTo(bx+bw+64,by+bh-10);c.lineTo(bx+bw,by+bh);c.closePath();c.fill();c.strokeStyle='#3b1f86';c.lineWidth=5;c.stroke(); // trasera
 c.fillStyle='#fff';c.beginPath();c.moveTo(bx+10,by);c.lineTo(bx+bw,by);c.lineTo(bx+bw+64,by+26);c.lineTo(bx+74,by+26);c.closePath();c.fill();c.strokeStyle='#3b1f86';c.stroke();            // techo
 const body=c.createLinearGradient(0,by,0,by+bh);body.addColorStop(0,'#fbf8ff');body.addColorStop(1,'#e2d8fb');c.fillStyle=body;rr(c,bx,by,bw,bh,22);c.fill();c.strokeStyle='#3b1f86';c.lineWidth=6;c.stroke();
 c.fillStyle='#7c4dff';rr(c,bx,by+bh-92,bw,34,0);c.fill();c.fillStyle='#fff';rr(c,bx,by+bh-58,bw,10,0);c.fill();   // franjas violeta/blanca
 c.fillStyle='#3b1f86';c.font='900 32px Inter,system-ui,sans-serif';c.textAlign='left';c.fillText('PUCELA US',bx+24,by+bh-62);
 for(const wx of [bx+40,bx+190,bx+520]){c.fillStyle='#bfe9ff';rr(c,wx,by+60,110,92,14);c.fill();c.strokeStyle='#3b1f86';c.lineWidth=5;c.stroke();c.fillStyle='#ffffff88';c.beginPath();c.moveTo(wx+14,by+146);c.lineTo(wx+54,by+66);c.lineTo(wx+74,by+66);c.lineTo(wx+34,by+146);c.fill();c.fillStyle='#7c4dffaa';rr(c,wx,by+60,22,92,8);c.fill();}
 // aire acondicionado y claraboya en el techo
 c.fillStyle='#cfc2f3';rr(c,bx+420,by-26,120,30,8);c.fill();c.strokeStyle='#3b1f86';c.lineWidth=4;c.stroke();
 // puerta abierta: hueco con luz cálida y hoja abatida
 const dx=DOOR.x-48,dy=by+bh-228;
 const inner=c.createLinearGradient(0,dy,0,dy+228);inner.addColorStop(0,'#ffe9a8');inner.addColorStop(1,'#5a3a2a');c.fillStyle=inner;rr(c,dx,dy,96,228,12);c.fill();c.strokeStyle='#3b1f86';c.lineWidth=6;c.stroke();
 c.fillStyle='#ffffff';c.beginPath();c.moveTo(dx-6,dy+4);c.lineTo(dx-62,dy+22);c.lineTo(dx-62,dy+212);c.lineTo(dx-6,dy+226);c.closePath();c.fill();c.strokeStyle='#3b1f86';c.lineWidth=5;c.stroke();
 c.fillStyle='#bfe9ff';rr(c,dx-50,dy+44,30,52,6);c.fill();
 // peldaños
 c.fillStyle='#9b86d9';rr(c,dx-4,by+bh-6,104,20,5);c.fill();c.strokeStyle='#3b1f86';c.lineWidth=4;c.stroke();
 c.fillStyle='#7f68c4';rr(c,dx+6,by+bh+14,84,20,5);c.fill();c.stroke();
 // ruedas
 for(const wx of [bx+150,bx+510]){c.fillStyle='#1d1340';c.beginPath();c.arc(wx,by+bh+6,50,0,7);c.fill();c.fillStyle='#6a5aa8';c.beginPath();c.arc(wx,by+bh+6,26,0,7);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(wx,by+bh+6,8,0,7);c.fill();}
 // toldo a rayas sobre la puerta
 for(let k=0;k<8;k++){c.fillStyle=k%2?'#fff':'#7c4dff';c.beginPath();c.moveTo(dx-20+k*17,by+bh-250);c.lineTo(dx-20+(k+1)*17,by+bh-250);c.lineTo(dx-34+(k+1)*19,by+bh-226);c.lineTo(dx-34+k*19,by+bh-226);c.fill();}
 // farolillos
 c.fillStyle='#3b1f86';c.fillRect(940,300,8,110);c.fillStyle='#fff6c7';c.beginPath();c.arc(944,296,15,0,7);c.fill();
}

// Pantalla «SHHH…»: el texto arriba y todos los jugadores de pie debajo, de
// frente, con sus colores y cosméticos, repartidos sin tocarse. La rejilla
// (1, 2 o 3 filas) se elige para que los personajes salgan lo más grandes
// posible sin invadir nunca la franja del texto.
export function shhhLayout(n,w,h){
 const T=Math.max(28,Math.min(w*.15,h*.13)),titleY=h*.08+T*.9,S=Math.max(10,T*.2),subY=titleY+S*2.3,top=subY+S*1.6,bottom=h-Math.max(10,h*.05),side=Math.max(12,w*.04);
 let best=null;
 for(let rows=1;rows<=Math.min(3,n);rows++){const per=Math.ceil(n/rows),cellW=(w-side*2)/per,rowH=(bottom-top)/rows,scale=Math.min(cellW/86,rowH/150);if(!best||scale>best.scale)best={rows,per,cellW,rowH,scale};}
 best.scale=Math.min(best.scale,h/300);
 const spots=[];for(let i=0;i<n;i++){const row=Math.floor(i/best.per),inRow=Math.min(best.per,n-row*best.per),col=i-row*best.per,rowW=inRow*best.cellW,x=(w-rowW)/2+best.cellW*(col+.5),usedH=best.rows*best.rowH,y0=top+((bottom-top)-usedH)/2;spots.push({x,y:y0+best.rowH*(row+.5)+37*best.scale});}
 return {T,titleY,S,subY,top,bottom,scale:best.scale,spots};
}
function drawShhh(ctx,w,h,roster,meId,now,alpha){
 const L=shhhLayout(Math.max(1,roster.length),w,h);
 ctx.save();ctx.globalAlpha=alpha;
 const g=ctx.createRadialGradient(w/2,h*.45,0,w/2,h*.45,Math.max(w,h)*.8);g.addColorStop(0,'#2d3157');g.addColorStop(1,'#0b1121');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 ctx.save();ctx.translate(w/2,h*.45);ctx.rotate(now/9000);ctx.fillStyle='#ffffff08';for(let k=0;k<12;k++){ctx.rotate(Math.PI/6);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.max(w,h),-Math.max(w,h)*.08);ctx.lineTo(Math.max(w,h),Math.max(w,h)*.08);ctx.fill();}ctx.restore();
 ctx.textAlign='center';ctx.textBaseline='alphabetic';
 const breathe=1+.018*Math.sin(now/520);ctx.save();ctx.translate(w/2,L.titleY);ctx.scale(breathe,breathe);ctx.font=`900 ${L.T}px Inter,system-ui,sans-serif`;
 const tg=ctx.createLinearGradient(0,-L.T,0,0);tg.addColorStop(0,'#ffffff');tg.addColorStop(1,'#d8cff2');ctx.fillStyle='#1a143a';ctx.fillText('SHHH…',0,L.T*.06);ctx.fillStyle=tg;ctx.fillText('SHHH…',0,0);ctx.restore();
 ctx.font=`800 ${L.S}px Inter,system-ui,sans-serif`;ctx.fillStyle='#cdc6e6';if('letterSpacing' in ctx)ctx.letterSpacing=`${Math.round(L.S*.12)}px`;ctx.fillText('TU IDENTIDAD ESTÁ A PUNTO DE REVELARSE',w/2,L.subY);if('letterSpacing' in ctx)ctx.letterSpacing='0px';
 roster.forEach((p,i)=>{const s=L.spots[i];if(!s)return;drawRobot(ctx,{...p,id:'shhh-'+p.id,alive:true,input:{x:0,y:1}},s.x,s.y,L.scale,now+i*173,false,p.id===meId);drawNameTag(ctx,p.name,s.x,s.y+24*L.scale,{bg:p.nameBg,color:p.nameColor,size:Math.max(10,12*L.scale),time:now,fallback:p.id===meId?'#fff3a8':'#fff'});});
 ctx.restore();
}

export function mountDisembark(canvas){
 let bg=null,bgKey='',raf=0,running=false,getState=null;
 const ctx=canvas.getContext('2d',{alpha:false});
 function size(){const r=canvas.getBoundingClientRect(),d=Math.min(1.5,devicePixelRatio||1),w=Math.max(2,Math.round(r.width*d)),h=Math.max(2,Math.round(r.height*d));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}return {w,h};}
 function bgImage(){if(bg)return bg;bg=document.createElement('canvas');bg.width=W;bg.height=H;paintBackground(bg.getContext('2d'));return bg;}
 function draw(t,roster,meId,now){
  const {w,h}=size(),n0=Math.max(1,roster.length),zoom=1+.05*clamp(t/Math.max(1,disembarkMs(n0))),sp=Math.min(112,1120/n0),sl=640-(n0-1)/2*sp,sr=640+(n0-1)/2*sp,fl=Math.max(0,Math.min(DOOR.x-150,sl-80)),fr=Math.min(W,sr+80),fw=Math.min(W,Math.max(640,fr-fl)),fx=Math.max(fw/2,Math.min(W-fw/2,(fl+fr)/2)),fitRow=Math.min(w/fw,h/H)*zoom,fitDoor=Math.min(w/760,h/H)*zoom,k=ease((t-DISEMBARK.lead*.6)/Math.max(1,disembarkMs(n0)*.62)),fit=fitDoor>fitRow?lerp(fitDoor,fitRow,k):fitRow,cx=fitDoor>fitRow?lerp(Math.max(380,Math.min(DOOR.x+120,fx)),fx,k):fx;
  ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#2a1763';ctx.fillRect(0,0,w,h);
  // El fondo y los personajes comparten la misma cámara; lo que sobra por los lados o por arriba/abajo se rellena con los bordes de la imagen.
  ctx.save();ctx.translate(w/2,h/2);ctx.scale(fit,fit);ctx.translate(-cx,-H/2-(fitDoor>fitRow?(1-k)*90:0));
  const img=bgImage();ctx.fillStyle='#5b3fb0';ctx.fillRect(-6000,-6000,12000+W,6003);ctx.fillStyle='#554d93';ctx.fillRect(-6000,H-3,12000+W,6003);
  ctx.drawImage(img,0,0,1,H,-6000,0,6000,H);ctx.drawImage(img,W-1,0,1,H,W,0,6000,H);ctx.drawImage(img,0,0);
  const n=roster.length,items=roster.map((p,i)=>({p,i,pl:placement(i,n,t)})).filter(o=>o.pl.visible).sort((a,b)=>a.pl.y-b.pl.y);
  for(const {p,i,pl} of items){
   ctx.globalAlpha=pl.alpha;
   drawRobot(ctx,{...p,id:'dis-'+p.id,alive:true,input:{x:0,y:1}},pl.x,pl.y,pl.s*1.18,now,pl.moving,p.id===meId);
   ctx.globalAlpha=1;
   if(pl.arrived){const a=clamp((pl.u-1)*4);ctx.globalAlpha=a;drawNameTag(ctx,p.name,pl.x,pl.y+34,{bg:p.nameBg,color:p.nameColor,size:19,time:now,fallback:p.id===meId?'#fff3a8':'#fff'});ctx.globalAlpha=1;}
  }
  ctx.restore();
  // viñeta suave violeta
  const v=ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*.35,w/2,h/2,Math.max(w,h)*.75);v.addColorStop(0,'#2a176300');v.addColorStop(1,'#2a1763aa');ctx.fillStyle=v;ctx.fillRect(0,0,w,h);
 }
 function drawAll(t,roster,meId,now){const dm=disembarkMs(Math.max(1,roster.length));if(t<dm+460)draw(t,roster,meId,now);if(t>=dm){const {w,h}=size();drawShhh(ctx,w,h,roster,meId,now,clamp((t-dm)/450));}}
 function loop(){if(!running)return;const s=getState&&getState();if(s&&s.roster)drawAll(Math.max(0,s.now-s.since),s.roster,s.meId,performance.now());raf=requestAnimationFrame(loop);}
 return {
  start(fn){getState=fn;if(!running){running=true;raf=requestAnimationFrame(loop);}},
  stop(){running=false;cancelAnimationFrame(raf);},
  draw,drawAll,
 };
}
