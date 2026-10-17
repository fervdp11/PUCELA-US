// Escena de llegada: los jugadores bajan de la caravana y forman una fila, de frente.
// Todo se calcula a partir de un único reloj (`t` = ms desde `intro.neutralAt` del servidor),
// así que cualquier cliente que dibuje en el mismo instante ve exactamente lo mismo.
import {drawRobot} from './characters.js';
import {drawNameTag} from './pass.js';

export const DISEMBARK={lead:900,walk:1500,hold:500};
export const SHHH_MS=1600;
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
 const sky=c.createLinearGradient(0,0,0,430);sky.addColorStop(0,'#756883');sky.addColorStop(.55,'#c1b5cf');sky.addColorStop(1,'#f4eeff');
 c.fillStyle=sky;c.fillRect(0,0,W,H);
 c.fillStyle='#ffffff55';for(const [x,y,r] of [[120,70,38],[170,60,30],[1060,110,44],[1120,98,32],[860,50,26]]){c.beginPath();c.arc(x,y,r,0,7);c.fill();}
 c.fillStyle='#8a73cc55';c.beginPath();c.moveTo(0,400);for(let x=0;x<=W;x+=80)c.lineTo(x,330+Math.sin(x*.011)*34);c.lineTo(W,400);c.fill();
 const g=c.createLinearGradient(0,400,0,H);g.addColorStop(0,'#8f8cc4');g.addColorStop(.12,'#7f7ab5');g.addColorStop(1,'#61576e');c.fillStyle=g;c.fillRect(0,400,W,H-400);
 c.fillStyle='#ffffff22';rr(c,0,ROW-30,W,70,0);c.fill();                               // franja donde se forma la fila
 c.strokeStyle='#ffffff40';c.lineWidth=3;c.setLineDash([46,32]);c.beginPath();c.moveTo(0,ROW+44);c.lineTo(W,ROW+44);c.stroke();c.setLineDash([]);
 // caravana alta, con volumen: cara lateral, techo, cara trasera y toldo
 const bx=70,by=96,bw=640,bh=316;
 c.fillStyle='#1d1340';c.beginPath();c.ellipse(bx+bw/2+30,by+bh+8,bw/2+70,22,0,0,7);c.fill();                // sombra
 c.fillStyle='#d9ccf6';c.beginPath();c.moveTo(bx+bw,by);c.lineTo(bx+bw+64,by+26);c.lineTo(bx+bw+64,by+bh-10);c.lineTo(bx+bw,by+bh);c.closePath();c.fill();c.strokeStyle='#514462';c.lineWidth=5;c.stroke(); // trasera
 c.fillStyle='#fff';c.beginPath();c.moveTo(bx+10,by);c.lineTo(bx+bw,by);c.lineTo(bx+bw+64,by+26);c.lineTo(bx+74,by+26);c.closePath();c.fill();c.strokeStyle='#514462';c.stroke();            // techo
 const body=c.createLinearGradient(0,by,0,by+bh);body.addColorStop(0,'#fbf8ff');body.addColorStop(1,'#e2d8fb');c.fillStyle=body;rr(c,bx,by,bw,bh,22);c.fill();c.strokeStyle='#514462';c.lineWidth=6;c.stroke();
 c.fillStyle='#9180b0';rr(c,bx,by+bh-92,bw,34,0);c.fill();c.fillStyle='#fff';rr(c,bx,by+bh-58,bw,10,0);c.fill();   // franjas violeta/blanca
 c.fillStyle='#514462';c.font='900 32px Inter,system-ui,sans-serif';c.textAlign='left';c.fillText('PUCELA US',bx+24,by+bh-62);
 for(const wx of [bx+40,bx+190,bx+520]){c.fillStyle='#bfe9ff';rr(c,wx,by+60,110,92,14);c.fill();c.strokeStyle='#514462';c.lineWidth=5;c.stroke();c.fillStyle='#ffffff88';c.beginPath();c.moveTo(wx+14,by+146);c.lineTo(wx+54,by+66);c.lineTo(wx+74,by+66);c.lineTo(wx+34,by+146);c.fill();c.fillStyle='#9180b0aa';rr(c,wx,by+60,22,92,8);c.fill();}
 // aire acondicionado y claraboya en el techo
 c.fillStyle='#cfc2f3';rr(c,bx+420,by-26,120,30,8);c.fill();c.strokeStyle='#514462';c.lineWidth=4;c.stroke();
 // puerta abierta: hueco con luz cálida y hoja abatida
 const dx=DOOR.x-48,dy=by+bh-228;
 const inner=c.createLinearGradient(0,dy,0,dy+228);inner.addColorStop(0,'#ffe9a8');inner.addColorStop(1,'#5a3a2a');c.fillStyle=inner;rr(c,dx,dy,96,228,12);c.fill();c.strokeStyle='#514462';c.lineWidth=6;c.stroke();
 c.fillStyle='#ffffff';c.beginPath();c.moveTo(dx-6,dy+4);c.lineTo(dx-62,dy+22);c.lineTo(dx-62,dy+212);c.lineTo(dx-6,dy+226);c.closePath();c.fill();c.strokeStyle='#514462';c.lineWidth=5;c.stroke();
 c.fillStyle='#bfe9ff';rr(c,dx-50,dy+44,30,52,6);c.fill();
 // peldaños
 c.fillStyle='#9b86d9';rr(c,dx-4,by+bh-6,104,20,5);c.fill();c.strokeStyle='#514462';c.lineWidth=4;c.stroke();
 c.fillStyle='#7f68c4';rr(c,dx+6,by+bh+14,84,20,5);c.fill();c.stroke();
 // ruedas
 for(const wx of [bx+150,bx+510]){c.fillStyle='#1d1340';c.beginPath();c.arc(wx,by+bh+6,50,0,7);c.fill();c.fillStyle='#6a5aa8';c.beginPath();c.arc(wx,by+bh+6,26,0,7);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(wx,by+bh+6,8,0,7);c.fill();}
 // toldo a rayas sobre la puerta
 for(let k=0;k<8;k++){c.fillStyle=k%2?'#fff':'#9180b0';c.beginPath();c.moveTo(dx-20+k*17,by+bh-250);c.lineTo(dx-20+(k+1)*17,by+bh-250);c.lineTo(dx-34+(k+1)*19,by+bh-226);c.lineTo(dx-34+k*19,by+bh-226);c.fill();}
 // farolillos
 c.fillStyle='#514462';c.fillRect(940,300,8,110);c.fillStyle='#fff6c7';c.beginPath();c.arc(944,296,15,0,7);c.fill();
}

export function mountDisembark(canvas){
 let bg=null,bgKey='',raf=0,running=false,getState=null;
 const ctx=canvas.getContext('2d',{alpha:false});
 function size(){const r=canvas.getBoundingClientRect(),d=Math.min(1.5,devicePixelRatio||1),w=Math.max(2,Math.round(r.width*d)),h=Math.max(2,Math.round(r.height*d));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}return {w,h};}
 function bgImage(){if(bg)return bg;bg=document.createElement('canvas');bg.width=W;bg.height=H;paintBackground(bg.getContext('2d'));return bg;}
 function draw(t,roster,meId,now){
  if(t>=disembarkMs(Math.max(1,roster.length))){drawShhh(roster,meId,now);return;}
  const {w,h}=size(),n0=Math.max(1,roster.length),zoom=1+.05*clamp(t/Math.max(1,disembarkMs(n0))),sp=Math.min(112,1120/n0),sl=640-(n0-1)/2*sp,sr=640+(n0-1)/2*sp,fl=Math.max(0,Math.min(DOOR.x-150,sl-80)),fr=Math.min(W,sr+80),fw=Math.min(W,Math.max(640,fr-fl)),fx=Math.max(fw/2,Math.min(W-fw/2,(fl+fr)/2)),fit=Math.min(w/fw,h/H)*zoom;
  ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#30283e';ctx.fillRect(0,0,w,h);
  // El fondo y los personajes comparten la misma cámara; lo que sobra por los lados o por arriba/abajo se rellena con los bordes de la imagen.
  ctx.save();ctx.translate(w/2,h/2);ctx.scale(fit,fit);ctx.translate(-fx,-H/2);
  const img=bgImage();ctx.fillStyle='#756883';ctx.fillRect(-6000,-6000,12000+W,6003);ctx.fillStyle='#61576e';ctx.fillRect(-6000,H-3,12000+W,6003);
  ctx.drawImage(img,0,0,1,H,-6000,0,6000,H);ctx.drawImage(img,W-1,0,1,H,W,0,6000,H);ctx.drawImage(img,0,0);
  const n=roster.length,items=roster.map((p,i)=>({p,i,pl:placement(i,n,t)})).filter(o=>o.pl.visible).sort((a,b)=>a.pl.y-b.pl.y);
  for(const {p,i,pl} of items){
   ctx.globalAlpha=pl.alpha;
   drawRobot(ctx,{...p,id:'dis-'+p.id,alive:true,input:{x:0,y:1}},pl.x,pl.y,pl.s*1.18,now,pl.moving,p.id===meId);
   ctx.globalAlpha=1;
   if(pl.arrived&&19*fit/(Math.min(1.5,devicePixelRatio||1))>=8){const a=clamp((pl.u-1)*4);ctx.globalAlpha=a;const maxChars=Math.max(3,Math.floor((sp-22)/(19*.65))),label=p.name.length>maxChars?p.name.slice(0,maxChars-1)+'…':p.name;drawNameTag(ctx,label,pl.x,pl.y+34,{bg:p.nameBg,color:p.nameColor,size:19,time:now,fallback:p.id===meId?'#fff3a8':'#fff'});ctx.globalAlpha=1;}
  }
  ctx.restore();
  // viñeta suave violeta
  const v=ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*.35,w/2,h/2,Math.max(w,h)*.75);v.addColorStop(0,'#30283e00');v.addColorStop(1,'#30283eaa');ctx.fillStyle=v;ctx.fillRect(0,0,w,h);
 }
 function drawShhh(roster,meId,now){
  const {w:pw,h:ph}=size(),d=Math.min(1.5,devicePixelRatio||1),w=pw/d,h=ph/d;
  ctx.setTransform(d,0,0,d,0,0);const bg=ctx.createRadialGradient(w/2,h*.45,5,w/2,h*.45,Math.max(w,h)*.75);bg.addColorStop(0,'#484052');bg.addColorStop(1,'#161523');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  const css=getComputedStyle(canvas),safe=k=>parseFloat(css.getPropertyValue('--safe-'+k))||0,left=safe('left')+20,right=safe('right')+20,top=safe('top')+12,bottom=safe('bottom')+20,uw=w-left-right,uh=h-top-bottom;
  ctx.textAlign='center';ctx.fillStyle='#eee8f3';ctx.font=`900 ${Math.min(66,uw*.15,uh*.17)}px system-ui`;ctx.fillText('SHHH…',left+uw/2,top+uh*.2);
  ctx.fillStyle='#d4c9df';ctx.font=`600 ${Math.min(15,uw*.037)}px system-ui`;ctx.fillText('Tu identidad está a punto de revelarse',left+uw/2,top+uh*.29);
  const cols=Math.max(1,Math.min(roster.length,Math.floor(uw/65))),rows=Math.ceil(roster.length/cols),cw=uw/cols,ch=uh*.59/Math.max(1,rows),scale=Math.max(.12,Math.min(1.35,(cw-12)/62,(ch-26)/112));
  for(let i=0;i<roster.length;i++){const p=roster[i],row=Math.floor(i/cols),count=Math.min(cols,roster.length-row*cols),x=left+uw/2+(i%cols-(count-1)/2)*cw,y=top+uh*.37+row*ch+ch*.83;
   drawRobot(ctx,{...p,id:'shhh-'+p.id,orientation:'down',alive:true},x,y,scale,now,false,false);
   const fs=Math.min(13,cw*.17),maxChars=Math.max(3,Math.floor((cw-24)/(fs*.65))),label=p.name.length>maxChars?p.name.slice(0,maxChars-1)+'…':p.name;
   drawNameTag(ctx,label,x,y+18,{bg:p.nameBg,color:p.nameColor,size:fs,time:now,fallback:p.id===meId?'#eee3ff':'#fff'});
  }
 }
 function loop(){if(!running)return;const s=getState&&getState();if(s&&s.roster)draw(Math.max(0,s.now-s.since),s.roster,s.meId,performance.now());raf=requestAnimationFrame(loop);}
 return {
  start(fn){getState=fn;if(!running){running=true;loop();}},
  stop(){running=false;cancelAnimationFrame(raf);},
  draw,
 };
}
