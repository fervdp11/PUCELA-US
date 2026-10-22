import {FB,fbMovePlayer,fbStepBall,fbKick,fbCollidePlayers,BX,bxMove,bxSeparate} from './football.js';
import {drawRobot} from './characters.js';
// Cliente de las mesas de juego de la sala de espera.
// Dibuja la partida que el servidor mantiene (`state.table`) y envía las acciones del jugador.
// Teclado, ratón y táctil comparten los mismos controles; no depende del DOM salvo del lienzo.
const W=640,H=400,TAU=Math.PI*2;
const C0='#ff7a6b',C1='#5fd0ff',INK='#2a1763',VIOLET='#7c4dff';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const PAD_COLORS=['#ff5a6b','#ffe45f','#4be39b','#4aa8ff'],PAD_FREQ=[262,330,392,523];

export function mountTableGame(canvas,{send,tone=()=>{},close=()=>{},meName='',fast=()=>false,look=()=>null}){
 const ctx=canvas.getContext('2d');
 let tv=null,recvAt=performance.now(),offset=0,raf=0,dead=false,zones=[],scale=1,ox=0,oy=0,dpr=1;
 const keys=new Set(),fx=[];let lastDraw=performance.now();
 const ui={target:[70,120],own:[70,120],opp:null,lastSent:0,sentTarget:null,flip:new Map(),prevFaces:[],cursor:0,pressed:-1,pressedAt:0,localTaps:0,pendingTaps:0,lastTapSend:0,simonIdx:-2,mark:new Map(),prevScore:[0,0],banner:null,prevPhase:'',prevView:null};
 const srvNow=()=>Date.now()+offset;
 const seat=()=>tv?.seat??0,name=s=>tv?.players?.find(p=>p.seat===s)?.name||(s===seat()?meName:'Rival');
 const col=s=>s===0?C0:C1;

 // ------------------------------------------------------------ utilidades de dibujo
 const rr=(x,y,w,h,r)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r);};
 function text(t,x,y,{size=20,color='#fff',align='center',weight=800,stroke=INK,sw=5,base='middle'}={}){ctx.font=`${weight} ${size}px Inter,system-ui,sans-serif`;ctx.textAlign=align;ctx.textBaseline=base;ctx.lineJoin='round';if(stroke){ctx.lineWidth=sw;ctx.strokeStyle=stroke;ctx.strokeText(t,x,y);}ctx.fillStyle=color;ctx.fillText(t,x,y);}
 function button(label,x,y,w,h,fn,{fill=VIOLET}={}){rr(x,y,w,h,12);ctx.fillStyle=fill;ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#fff';ctx.stroke();text(label,x+w/2,y+h/2+1,{size:17,stroke:null});zones.push({x,y,w,h,fn});}
 function bg(t){const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#2a1763');g.addColorStop(1,'#120a2e');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.strokeStyle='#ffffff10';ctx.lineWidth=1;for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}for(let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}}
 function confetti(x,y,n=40){for(let i=0;i<n;i++)fx.push({x,y,vx:(Math.random()-.5)*420,vy:-Math.random()*380-60,r:3+Math.random()*4,c:['#fff','#c9b3ff','#7c4dff','#ffe45f','#4be39b'][i%5],t:0});}
 function drawFx(dt){for(const p of fx){p.t+=dt;p.vy+=700*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}for(let i=fx.length-1;i>=0;i--)if(fx[i].t>1.6)fx.splice(i,1);for(const p of fx){ctx.globalAlpha=Math.max(0,1-p.t/1.6);ctx.fillStyle=p.c;ctx.fillRect(p.x,p.y,p.r,p.r*.6);}ctx.globalAlpha=1;}
 function header(){const s=seat(),two=tv.need===2;text(tv.label.toUpperCase(),W/2,24,{size:15,color:'#d9c9ff',stroke:null});
  if(two){for(const p of tv.players){const mine=p.seat===s;text((mine?'▶ ':'')+p.name,p.seat===0?18:W-60,24,{size:15,color:col(p.seat),align:p.seat===0?'left':'right',stroke:INK,sw:4});}}}

 // ------------------------------------------------------------ pantallas comunes
 function drawWaiting(t){bg(t);header0();const dots='.'.repeat(1+Math.floor(t/400)%3);text('Esperando a otro jugador'+dots,W/2,H/2-8,{size:30});
  if(tv.notice)text(tv.notice,W/2,H/2+34,{size:15,color:'#ffe9a8'});
  text('Empieza sola cuando alguien se siente… o juega ya contra un bot:',W/2,H/2+64,{size:13,color:'#d9c9ff',stroke:null,weight:600});
  [['easy','Bot fácil','#2e8f78'],['medium','Bot medio','#7c4dff'],['hard','Bot difícil','#c9505a']].forEach(([lv,l,f],i)=>button(l,W/2-195+i*135,H/2+84,120,40,()=>send('tableBot',{level:lv}),{fill:f}));
  const r=40+Math.sin(t/300)*4;ctx.strokeStyle='#ffffff55';ctx.lineWidth=4;ctx.beginPath();ctx.arc(W/2,H/2-86,r,0,TAU);ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(W/2+Math.cos(t/350)*r,H/2-86+Math.sin(t/350)*r,8,0,TAU);ctx.fill();
  button('Salir de la mesa',W/2-90,H-52,180,40,()=>close(),{fill:'#4a3a8c'});}
 function header0(){text(tv.label.toUpperCase(),W/2,24,{size:15,color:'#d9c9ff',stroke:null});}
 function overlayOver(t,title,sub,mine){ctx.fillStyle='#120a2ecc';ctx.fillRect(0,0,W,H);text(title,W/2,H/2-58,{size:46,color:mine?'#fff3a8':'#ffffff'});if(sub)text(sub,W/2,H/2-8,{size:19,color:'#e6dcff',stroke:INK});
  const again=tv.need===2&&tv.again[seat()];
  if(again)text('Esperando al rival…',W/2,H/2+52,{size:17,color:'#ffe9a8'});
  else button('Volver a jugar',W/2-170,H/2+30,170,44,()=>send('tableAgain',{}));
  button('Salir',W/2+(again?-70:20),H/2+(again?84:30),again?140:150,44,()=>close(),{fill:'#4a3a8c'});}

 // ------------------------------------------------------------ DARDOS
 // 1.ª pulsación fija la altura, 2.ª la posición horizontal; el servidor
 // valida el instante y puntúa. Teclado (Espacio/Intro), ratón y táctil.
 const DN=[20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5],DB={x:W/2,y:214,R:150};
 const osc=(t,start,period)=>{if(t<start)return -1;const u=((t-start)/period)%1;return u<.5?-1+4*u:3-4*u;};
 function dartBoard(){const {x,y,R}=DB;ctx.save();ctx.fillStyle='#0a0614aa';ctx.beginPath();ctx.ellipse(x+8,y+14,R+22,R+16,0,0,TAU);ctx.fill();
  ctx.fillStyle='#2b1d10';ctx.beginPath();ctx.arc(x,y,R+18,0,TAU);ctx.fill();ctx.lineWidth=4;ctx.strokeStyle='#120a2e';ctx.stroke();
  for(let k=0;k<20;k++){const a0=(k-.5)*Math.PI/10-Math.PI/2,a1=(k+.5)*Math.PI/10-Math.PI/2,dark=k%2===0;
   const ring=(r0,r1,col)=>{ctx.fillStyle=col;ctx.beginPath();ctx.arc(x,y,r1,a0,a1);ctx.arc(x,y,r0,a1,a0,true);ctx.closePath();ctx.fill();};
   ring(R*.13,R*.53,dark?'#1b1b1b':'#f1e3c2');ring(R*.53,R*.6,dark?'#d8343c':'#1fa34f');ring(R*.6,R*.92,dark?'#1b1b1b':'#f1e3c2');ring(R*.92,R,dark?'#d8343c':'#1fa34f');
   const am=(a0+a1)/2;text(String(DN[k]),x+Math.cos(am)*(R+10),y+Math.sin(am)*(R+10),{size:11,color:'#fff',stroke:null,weight:900});}
  ctx.strokeStyle='#c9c2b0';ctx.lineWidth=1;for(let k=0;k<20;k++){const a=(k-.5)*Math.PI/10-Math.PI/2;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*R*.13,y+Math.sin(a)*R*.13);ctx.lineTo(x+Math.cos(a)*R,y+Math.sin(a)*R);ctx.stroke();}
  for(const r of [.13,.53,.6,.92,1]){ctx.beginPath();ctx.arc(x,y,R*r,0,TAU);ctx.stroke();}
  ctx.fillStyle='#1fa34f';ctx.beginPath();ctx.arc(x,y,R*.13,0,TAU);ctx.fill();ctx.fillStyle='#d8343c';ctx.beginPath();ctx.arc(x,y,R*.06,0,TAU);ctx.fill();ctx.stroke();
  const g=ctx.createRadialGradient(x-R*.4,y-R*.5,4,x,y,R*1.1);g.addColorStop(0,'#ffffff22');g.addColorStop(1,'#00000000');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,R,0,TAU);ctx.fill();ctx.restore();}
 function dartAt(px,py,c,k=1){ctx.save();ctx.translate(px,py);ctx.rotate(-.55);ctx.scale(k,k);ctx.fillStyle='#0006';ctx.beginPath();ctx.ellipse(4,6,10,3,0,0,TAU);ctx.fill();ctx.strokeStyle='#cfd6dc';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(10,0);ctx.stroke();ctx.fillStyle='#3a3f46';ctx.fillRect(10,-3,18,6);ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(28,0);ctx.lineTo(42,-9);ctx.lineTo(40,0);ctx.lineTo(42,9);ctx.closePath();ctx.fill();ctx.strokeStyle='#120a2e';ctx.lineWidth=1.5;ctx.stroke();ctx.restore();}
 // Fijación inmediata: el valor se congela en el instante de pulsar (sin esperar
 // al servidor); el servidor recalcula con ese mismo instante validado.
 const dartKey=v=>`${v.round}-${v.turn}-${v.dart}`;
 function dartAim(v){const L=ui.dartLock&&ui.dartLock.key===dartKey(v)?ui.dartLock:null;let stage=v.stage,ay=v.ay,xStart=v.aimStart,lockX=null;
  if(L&&L.stage==='y'&&v.stage==='y'){stage='x';ay=L.y;xStart=L.t;}
  else if(L&&L.stage==='x'&&(v.stage==='x'||v.stage==='y')){stage='locked';ay=L.y;lockX=L.x;xStart=L.xStart;}
  return {stage,ay,xStart,lockX};}
 function dartPress(){if(!tv||tv.phase!=='playing')return;const v=tv.view,t=Math.round(srvNow());if(v.turn!==seat()||!['y','x'].includes(v.stage)||t<v.aimStart)return;const a=dartAim(v);
  if(a.stage==='y'){ui.dartLock={key:dartKey(v),stage:'y',t,y:Math.round(osc(t,v.aimStart,v.py)*1000)/1000};}
  else if(a.stage==='x'){ui.dartLock={key:dartKey(v),stage:'x',t,y:a.ay,xStart:a.xStart,x:Math.round(osc(t,a.xStart,v.px)*1000)/1000};}
  else return;
  send('tableInput',{t});tone(a.stage==='y'?520:660,.07,'triangle',.05);}
 function drawDarts(t){const v=tv.view,s=seat(),now=srvNow(),mine=v.turn===s;bg(t);header();
  zones.push({x:0,y:40,w:W,h:H-40,fn:()=>dartPress()});
  for(let i=0;i<2;i++){const x=i===0?18:W-18;text(String(v.scores[i]),x,60,{size:34,color:col(i),align:i===0?'left':'right'});text('puntos',x,86,{size:11,color:'#d9c9ff',align:i===0?'left':'right',stroke:null,weight:700});}
  dartBoard();
  // 16.6 · el texto de rondas va abajo a la izquierda y se pinta tras la diana (antes quedaba tapado)
  text(`Ronda ${Math.min(v.round+1,v.rounds)} / ${v.rounds}`,18,H-22,{size:14,color:'#e6dcff',align:'left',weight:700,stroke:INK,sw:4});
  // dardos clavados en la tanda actual
  const per=v.darts,list=v.throws[v.turn].slice(v.round*per);const flying=v.stage==='fly'&&v.last&&v.last.seat===v.turn;
  list.forEach((d,i)=>{const last=flying&&i===list.length-1;const px=DB.x+d.x*DB.R,py=DB.y+d.y*DB.R;if(last){const a=1-Math.max(0,(v.flyUntil-now))/900,f=Math.min(1,a*2.2);const sx=W/2+(s===v.turn?0:0),sy=H+40;const cx=sx+(px-sx)*f,cy=sy+(py-sy)*f-Math.sin(f*Math.PI)*60;dartAt(cx,cy,col(v.turn),1.6-.6*f);if(f>=1&&!ui.mark.has('hit'+v.last.at)){ui.mark.set('hit'+v.last.at,1);tone(d.points?820:180,.12,'square',.04);}}else dartAt(px,py,col(v.turn));});
  for(let k=0;k<per;k++){ctx.fillStyle=k<list.length?'#ffffff33':col(v.turn);ctx.beginPath();ctx.arc(W/2-24+k*24,H-22,7,0,TAU);ctx.fill();}
  // indicadores de puntería
  const aim=dartAim(v);
  if(['y','x','locked'].includes(aim.stage)&&now>=v.aimStart-50){const {x,y,R}=DB;ctx.save();ctx.lineWidth=3;
   if(aim.stage==='y'){const yy=y+osc(now,v.aimStart,v.py)*R;ctx.strokeStyle=col(v.turn);ctx.setLineDash([10,6]);ctx.beginPath();ctx.moveTo(x-R-30,yy);ctx.lineTo(x+R+30,yy);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=col(v.turn);ctx.beginPath();ctx.moveTo(x-R-34,yy);ctx.lineTo(x-R-48,yy-9);ctx.lineTo(x-R-48,yy+9);ctx.fill();ctx.beginPath();ctx.moveTo(x+R+34,yy);ctx.lineTo(x+R+48,yy-9);ctx.lineTo(x+R+48,yy+9);ctx.fill();}
   else{const yy=y+aim.ay*R,xx=x+(aim.lockX??osc(now,aim.xStart,v.px))*R;ctx.strokeStyle='#ffffff99';ctx.beginPath();ctx.moveTo(x-R-30,yy);ctx.lineTo(x+R+30,yy);ctx.stroke();ctx.strokeStyle=col(v.turn);ctx.setLineDash([10,6]);ctx.beginPath();ctx.moveTo(xx,y-R-24);ctx.lineTo(xx,y+R+24);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.arc(xx,yy,10,0,TAU);ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(xx,yy,3,0,TAU);ctx.fill();}
   ctx.restore();}
  if(now<v.aimStart&&v.stage==='y'&&v.dart===0)text(mine?'¡Te toca!':`Turno de ${name(v.turn)}`,W/2,DB.y,{size:34,color:'#fff3a8'});
  if(tv.phase==='playing'){const hint=!mine?`${name(v.turn)} está lanzando…`:aim.stage==='y'?'Pulsa para fijar la ALTURA':aim.stage==='x'?'Pulsa para fijar la POSICIÓN':'';if(hint)text(hint,W/2,H-46,{size:16,color:mine?'#fff3a8':'#e6dcff'});}
  if(v.last&&now-v.last.at<1600&&now-v.last.at>380){const a=Math.min(1,(1600-(now-v.last.at))/400);ctx.globalAlpha=a;text(v.last.points?`${v.last.label} · +${v.last.points}`:'¡Fuera!',DB.x+v.last.x*DB.R,DB.y+v.last.y*DB.R-34,{size:20,color:v.last.points>=50?'#fff3a8':'#ffffff'});ctx.globalAlpha=1;}
  if(tv.phase==='over'){const win=v.winner===s;overlayOver(t,v.draw?'EMPATE':win?'¡VICTORIA!':'DERROTA',`${v.scores[0]} – ${v.scores[1]}`,win);}}

 // ------------------------------------------------------------ TRES EN RAYA
 function drawTTT(t){const v=tv.view,s=seat();bg(t);header();
  const bx=185,by=60,cs=90;ctx.fillStyle='#f4ead0';rr(bx-10,by-10,cs*3+20,cs*3+20,16);ctx.fill();ctx.strokeStyle='#8a6a46';ctx.lineWidth=4;ctx.stroke();
  ctx.strokeStyle=INK;ctx.lineWidth=5;ctx.lineCap='round';for(let k=1;k<3;k++){ctx.beginPath();ctx.moveTo(bx+k*cs,by+8);ctx.lineTo(bx+k*cs,by+cs*3-8);ctx.moveTo(bx+8,by+k*cs);ctx.lineTo(bx+cs*3-8,by+k*cs);ctx.stroke();}
  for(let i=0;i<9;i++){const x=bx+(i%3)*cs,y=by+Math.floor(i/3)*cs,m=v.board[i];
   if(m<0){if(tv.phase==='playing'&&v.turn===s&&v.winner<0){zones.push({x,y,w:cs,h:cs,fn:()=>{ui.cursor=i;send('tableInput',{cell:i});tone(440,.08,'triangle',.05);}});if(ui.cursor===i){ctx.fillStyle='#7c4dff22';rr(x+4,y+4,cs-8,cs-8,10);ctx.fill();}}continue;}
   if(!ui.mark.has(i))ui.mark.set(i,performance.now());const a=Math.min(1,(performance.now()-ui.mark.get(i))/220),sc=.4+.6*(1-Math.pow(1-a,3));
   ctx.save();ctx.translate(x+cs/2,y+cs/2);ctx.scale(sc,sc);ctx.lineWidth=11;ctx.strokeStyle=col(m);ctx.shadowColor='#0004';ctx.shadowBlur=6;
   if(m===0){ctx.beginPath();ctx.moveTo(-26,-26);ctx.lineTo(26,26);ctx.moveTo(26,-26);ctx.lineTo(-26,26);ctx.stroke();}else{ctx.beginPath();ctx.arc(0,0,27,0,TAU);ctx.stroke();}ctx.restore();}
  if(v.line){const [a,,c]=v.line,ax=bx+(a%3)*cs+cs/2,ay=by+Math.floor(a/3)*cs+cs/2,cx=bx+(c%3)*cs+cs/2,cy=by+Math.floor(c/3)*cs+cs/2;ctx.strokeStyle='#fff3a8';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(cx,cy);ctx.stroke();}
  if(tv.phase==='playing')text(v.turn===s?'¡Tu turno!':`Turno de ${name(v.turn)}`,W/2,by+cs*3+36,{size:20,color:v.turn===s?'#fff3a8':'#e6dcff'});
  if(tv.phase==='over'){const win=v.winner===s;overlayOver(t,v.draw?'EMPATE':win?'¡VICTORIA!':'DERROTA',v.draw?'Nadie completa la línea':`${name(v.winner)} completa tres en línea`,win);}}

 // ------------------------------------------------------------ DUELO DE REFLEJOS
 function drawReflex(t){const v=tv.view,s=seat();bg(t);header();
  zones.push({x:0,y:0,w:W,h:H,fn:()=>reflexTap()});
  for(let i=0;i<2;i++)for(let k=0;k<v.to;k++){ctx.fillStyle=k<v.wins[i]?col(i):'#ffffff22';ctx.beginPath();ctx.arc(i===0?60+k*28:W-60-k*28,58,10,0,TAU);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();}
  text(`Ronda ${v.round}`,W/2,58,{size:18,color:'#d9c9ff',stroke:null});
  const go=v.phase==='go',res=v.phase==='result',cx=W/2,cy=H/2+10,pulse=go?Math.sin(t/60)*5:0;
  ctx.fillStyle=go?'#4be39b':res?(v.roundWinner===s?'#ffe45f':'#7c6cc8'):'#e8453c';ctx.shadowColor=go?'#4be39b':'#e8453c';ctx.shadowBlur=go?40:18;ctx.beginPath();ctx.arc(cx,cy,104+pulse,0,TAU);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#fff';ctx.lineWidth=6;ctx.stroke();
  if(!res)text(go?'¡YA!':'ESPERA…',cx,cy,{size:go?64:40});
  else{const w=v.roundWinner;text(v.falseStart>=0?'¡Salida en falso!':v.ms!=null?v.ms+' ms':'',cx,cy-18,{size:34,color:INK,stroke:'#fff',sw:4});text(w===s?'¡Punto para ti!':`Punto de ${name(w)}`,cx,cy+24,{size:22,color:INK,stroke:'#fff',sw:4});}
  text(go?'¡Pulsa ya! (clic, toque o espacio)':'No pulses hasta que se ponga verde',W/2,H-34,{size:15,color:'#e6dcff',stroke:null});
  if(tv.phase==='over'){const win=v.winner===s;overlayOver(t,win?'¡VICTORIA!':'DERROTA',`${v.wins[0]} – ${v.wins[1]}`,win);}}
 let lastReflexTap=0;function reflexTap(){if(tv?.phase!=='playing'||tv.view.phase==='result'||performance.now()-lastReflexTap<150)return;lastReflexTap=performance.now();send('tableInput',{tap:1});tone(tv.view.phase==='go'?660:160,.1,'square',.05);}

 // ------------------------------------------------------------ MEMORIA
 function drawMemory(t){const v=tv.view,s=seat(),two=!!v.two,myTurn=!two||v.turn===s;bg(t);if(two)header();else header0();
  const cw=92,ch=62,gap=10,gx=(W-(cw*4+gap*3))/2,gy=56;
  if(!ui.prevFaces.length){ui.prevFaces=v.faces.slice();ui.flip.clear();}// 16.6 · al entrar ya están boca abajo, sin animación
  v.faces.forEach((f,i)=>{if(ui.prevFaces[i]!==f){ui.flip.set(i,performance.now());if(f&&!ui.prevFaces[i])tone(520+i*12,.07,'triangle',.04);}ui.prevFaces[i]=f;});
  for(let i=0;i<16;i++){const x=gx+(i%4)*(cw+gap),y=gy+Math.floor(i/4)*(ch+gap),f=v.faces[i],ft=ui.flip.has(i)?Math.min(1,(performance.now()-ui.flip.get(i))/240):1,up=!!f,
    sx=ft<1?Math.abs(Math.cos((up?ft:ft)*Math.PI/2+(up?Math.PI/2:0))):1;
   ctx.save();ctx.translate(x+cw/2,y+ch/2);ctx.scale(Math.max(.05,sx),1);
   if(up){ctx.fillStyle=v.matched[i]?(two&&v.owner?.[i]>=0?(v.owner[i]===s?'#4be39b':'#ff9ec8'):'#4be39b'):'#fff8e6';rr(-cw/2,-ch/2,cw,ch,10);ctx.fill();ctx.strokeStyle=INK;ctx.lineWidth=3;ctx.stroke();ctx.font='38px system-ui,"Apple Color Emoji","Segoe UI Emoji",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(f,0,3);}
   else{const g=ctx.createLinearGradient(0,-ch/2,0,ch/2);g.addColorStop(0,'#9b7bff');g.addColorStop(1,'#5a36c4');ctx.fillStyle=g;rr(-cw/2,-ch/2,cw,ch,10);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.stroke();text('★',0,2,{size:28,color:'#ffffffcc',stroke:null});}
   if(ui.cursor===i&&tv.phase==='playing'){ctx.strokeStyle='#fff3a8';ctx.lineWidth=4;rr(-cw/2-3,-ch/2-3,cw+6,ch+6,12);ctx.stroke();}
   ctx.restore();
   if(!up&&tv.phase==='playing'&&myTurn&&!v.hiding)zones.push({x,y,w:cw,h:ch,fn:()=>{ui.cursor=i;send('tableInput',{card:i});}});}
  const el=Math.floor(((v.doneAt||srvNow())-v.start)/1000);
  if(two){text(`${name(0)} ${v.scores[0]}  ·  ${v.scores[1]} ${name(1)}`,W/2,H-24,{size:16,color:'#e6dcff'});if(tv.phase==='playing')text(myTurn?'Tu turno · levanta dos cartas':`Turno de ${name(v.turn)}…`,W/2,44,{size:15,color:myTurn?'#fff3a8':'#d9c9ff',stroke:INK,sw:4});}
  else text(`Pares ${v.pairs}/8   ·   Movimientos ${v.moves}   ·   ${Math.floor(el/60)}:${String(el%60).padStart(2,'0')}`,W/2,H-24,{size:16,color:'#e6dcff'});
  if(tv.phase==='over'&&two){const win=v.winner===s;overlayOver(t,v.draw?'EMPATE':win?'¡VICTORIA!':'DERROTA',`${v.scores[s]} parejas tuyas · ${v.scores[1-s]} del rival`,win);}
  else if(tv.phase==='over'){if(!ui.done){ui.done=1;confetti(W/2,H/2,60);tone(880,.3,'triangle',.06);}overlayOver(t,'¡COMPLETADO!',`${v.moves} movimientos · ${Math.floor(el/60)}:${String(el%60).padStart(2,'0')}`,true);}else ui.done=0;}

 // ------------------------------------------------------------ SECUENCIA DE COLORES
 function drawSimon(t){const v=tv.view,now=srvNow(),s=seat(),two=!!v.two;bg(t);if(two)header();else header0();
  const pw=190,ph=100,gx=(W-pw*2-16)/2,gy=82;let lit=-1;
  if(v.phase==='show'&&v.seq){const e=now-v.showStart,i=Math.floor(e/v.step);if(e>=0&&i>=0&&i<v.len&&e%v.step<v.step*.72)lit=v.seq[i];if(i!==ui.simonIdx){ui.simonIdx=i;if(lit>=0)tone(PAD_FREQ[lit],.3,'sine',.08);}}
  else ui.simonIdx=-2;
  if(ui.pressed>=0&&performance.now()-ui.pressedAt<220)lit=ui.pressed;
  for(let i=0;i<4;i++){const x=gx+(i%2)*(pw+16),y=gy+Math.floor(i/2)*(ph+16),on=lit===i;
   ctx.shadowColor=PAD_COLORS[i];ctx.shadowBlur=on?34:0;ctx.fillStyle=on?PAD_COLORS[i]:PAD_COLORS[i]+'66';rr(x,y,pw,ph,18);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle=on?'#fff':'#ffffff66';ctx.lineWidth=on?6:3;ctx.stroke();
   text(['1','2','3','4'][i],x+16,y+18,{size:14,color:'#fff',align:'left',stroke:null});
   if(tv.phase==='playing'&&v.phase==='input'&&!(two&&v.done?.[s]))zones.push({x,y,w:pw,h:ph,fn:()=>press(i)});}
  const left=Math.max(0,Math.ceil((v.inputUntil-now)/1000)),msg=v.phase==='show'?'Memoriza la secuencia…':v.phase==='input'?(two?(v.done[s]?`¡Hecho! Esperando a ${name(1-s)}…`:`Tú ${v.pp[s]}/${v.len} · ${name(1-s)} ${v.pp[1-s]}/${v.len} · ${left} s`):`Tu turno · ${v.pos}/${v.len}`):'';
  text(`Nivel ${v.level}`,W/2,54,{size:24,color:'#fff3a8'});text(msg,W/2,H-30,{size:18,color:'#e6dcff'});
  if(tv.phase==='over'&&two){const win=v.winner===s;overlayOver(t,v.draw?'EMPATE':win?'¡VICTORIA!':'DERROTA',`Secuencia de ${Math.max(1,v.len)} colores`,win);}
  else if(tv.phase==='over')overlayOver(t,'FIN DEL JUEGO',`Has llegado al nivel ${Math.max(0,v.score)}`,v.score>=5);}
 function press(i){if(tv?.phase!=='playing'||tv.view.phase!=='input'||tv.view.two&&tv.view.done?.[seat()])return;ui.pressed=i;ui.pressedAt=performance.now();tone(PAD_FREQ[i],.25,'sine',.08);send('tableInput',{color:i});}

 // ------------------------------------------------------------ CARRERA DE PULSACIONES
 function raceTap(){if(tv?.phase!=='playing'||srvNow()<tv.view.start)return;ui.localTaps++;ui.pendingTaps++;tone(300+Math.min(400,ui.localTaps*8),.04,'square',.03);}
 function drawRace(t,dt){const v=tv.view,s=seat(),now=srvNow();bg(t);header();
  zones.push({x:0,y:0,w:W,h:H,fn:raceTap});
  const lx=60,rx=W-60,len=rx-lx;
  if(tv.phase==='playing'&&ui.pendingTaps>0&&performance.now()-ui.lastTapSend>55){send('tableInput',{n:Math.min(6,ui.pendingTaps)});ui.pendingTaps=0;ui.lastTapSend=performance.now();}
  ui.localTaps=Math.min(ui.localTaps,v.pos[s]+7);const mine=Math.max(v.pos[s],ui.localTaps);
  for(let i=0;i<2;i++){const y=120+i*100,p=(i===s?mine:v.pos[i])/v.goal;ctx.fillStyle='#3a3f4d';rr(lx-30,y-34,len+60,68,14);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.stroke();
   ctx.setLineDash([12,10]);ctx.strokeStyle='#ffffff55';ctx.beginPath();ctx.moveTo(lx,y);ctx.lineTo(rx,y);ctx.stroke();ctx.setLineDash([]);
   for(let k=0;k<6;k++){ctx.fillStyle=k%2?'#fff':'#111';ctx.fillRect(rx+8,y-30+k*10,8,10);ctx.fillStyle=k%2?'#111':'#fff';ctx.fillRect(rx+16,y-30+k*10,8,10);}
   const x=lx+len*clamp(p,0,1),bob=Math.sin(t/70+i)*3;ctx.fillStyle=col(i);ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y-4+bob,17,0,TAU);ctx.fill();ctx.stroke();text(name(i).slice(0,2).toUpperCase(),x,y-4+bob,{size:11,stroke:null});}
  const cd=v.start-now;
  if(cd>0)text(cd>2400?'3':cd>1600?'2':cd>800?'1':'¡YA!',W/2,H-76,{size:60,color:'#fff3a8'});
  else if(tv.phase==='playing')text('¡Pulsa sin parar! (toca, clic o espacio)',W/2,H-60,{size:18,color:'#fff3a8',stroke:INK});
  if(tv.phase==='over'){const win=v.winner===s;overlayOver(t,win?'¡VICTORIA!':'DERROTA',`${name(v.winner)} llega primero`,win);}}

 const DRAW={darts:drawDarts,ttt:drawTTT,reflex:drawReflex,memory:drawMemory,simon:drawSimon,race:drawRace,football:drawFootball,boxing:drawBoxing};

 // ------------------------------------------------------------ bucle y entrada
 function size(){const r=canvas.getBoundingClientRect();dpr=Math.min(1.5,devicePixelRatio||1);const w=Math.max(2,Math.round(r.width*dpr)),h=Math.max(2,Math.round(r.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  scale=Math.min(canvas.width/W,canvas.height/H);ox=(canvas.width-W*scale)/2;oy=(canvas.height-H*scale)/2;}
 function frame(now){if(dead)return;raf=requestAnimationFrame(frame);const dt=Math.min(.1,(now-lastDraw)/1000);lastDraw=now;size();
  ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#120a2e';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.setTransform(scale,0,0,scale,ox,oy);ctx.save();ctx.beginPath();ctx.rect(0,0,W,H);ctx.clip();zones=[];
  if(!tv)bg(now);else if(tv.phase==='waiting'||!tv.view)drawWaiting(now);else{try{DRAW[tv.game](now,dt);}catch(e){console.error('PUCELA US · mesa:',e);}}
  drawFx(dt);ctx.restore();}
 function toLogical(e){const r=canvas.getBoundingClientRect(),d=canvas.width/r.width;return [((e.clientX-r.left)*d-ox)/scale,((e.clientY-r.top)*d-oy)/scale];}
 const holds=new Map();
 function onDown(e){e.preventDefault();canvas.focus({preventScroll:true});const [x,y]=toLogical(e);
  for(let i=zones.length-1;i>=0;i--){const z=zones[i];if(x>=z.x&&x<=z.x+z.w&&y>=z.y&&y<=z.y+z.h){if(z.hold){holds.set(e.pointerId,z);try{canvas.setPointerCapture(e.pointerId);}catch{}z.fn();}else if(z.drag){fb.drag=e.pointerId;try{canvas.setPointerCapture(e.pointerId);}catch{}fbAim(x,y);}else z.fn();break;}}}
 function fbAim(x,y){if(tv?.game==='boxing')return bxAim(x,y);const v=tv?.view;if(!v||tv.game!=='football')return;const me=fb.me||v.pl.find(q=>q.id===tv.me);if(!me)return;const dx=(x-FX)/FK-me.x,dy=(y-FY)/FK-me.y,l=Math.hypot(dx,dy);fb.dir=l<10?{x:0,y:0}:{x:Math.abs(dx)/l>.38?Math.sign(dx):0,y:Math.abs(dy)/l>.38?Math.sign(dy):0};if(fb.me){fb.me.ix=fb.dir.x;fb.me.iy=fb.dir.y;}fbSend(true);}
 function onMove(e){if(fb.drag!==e.pointerId||fb.drag==null)return;const [x,y]=toLogical(e);fbAim(x,y);}
 function onUp(e){const hz=holds.get(e.pointerId);if(hz){holds.delete(e.pointerId);hz.up?.();}if(fb.drag!==e.pointerId)return;fb.drag=null;fb.dir={x:0,y:0};fbSend(true);}
 const KEYMAP={ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right',ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down'};
 const held=new Set();
 function onKey(e){if(!tv)return;const down=e.type==='keydown',k=e.key;
  if(tv.game==='boxing'){const key=k.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(key)){e.preventDefault();if(down)fb.keys.add(key);else fb.keys.delete(key);bxDirFromKeys();return;}
   if(key===' '){e.preventDefault();if(down&&!e.repeat)bxAttack();return;}if(key==='e'){e.preventDefault();bxBlock(down);return;}if(key==='f'){e.preventDefault();if(down&&!e.repeat)bxUlt();return;}return;}
  if(tv.game==='football'){const key=k.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(key)){e.preventDefault();if(down)fb.keys.add(key);else fb.keys.delete(key);fbDirFromKeys();return;}if(key===' '||key==='enter'){e.preventDefault();if(down&&!e.repeat)fbKickNow();return;}return;}
  // Cada pulsación real cuenta una vez: la repetición automática y mantener la tecla no suman.
  if(!down){held.delete(k.toLowerCase());return;}
  if(e.repeat||held.has(k.toLowerCase())){if(tv.game==='race'||tv.game==='darts')e.preventDefault();return;}held.add(k.toLowerCase());
  if(tv.game==='darts'&&(k===' '||k==='Enter')){e.preventDefault();dartPress();return;}
  if(tv.game==='ttt'||tv.game==='memory'){const n=tv.game==='ttt'?3:4,total=n*n;let c=ui.cursor;const m=KEYMAP[k];
   if(m){e.preventDefault();const x=c%n,y=Math.floor(c/n);c=m==='left'?y*n+(x+n-1)%n:m==='right'?y*n+(x+1)%n:m==='up'?((y+n-1)%n)*n+x:((y+1)%n)*n+x;ui.cursor=c;}
   else if(k==='Enter'||k===' '){e.preventDefault();if(tv.phase==='playing'&&!(tv.game==='memory'&&tv.view?.two&&(tv.view.turn!==seat()||tv.view.hiding)))send('tableInput',tv.game==='ttt'?{cell:c}:{card:c});}
   return;}
  if(tv.game==='reflex'&&(k===' '||k==='Enter')){e.preventDefault();reflexTap();return;}
  if(tv.game==='race'&&(k===' '||k==='Enter'||k.startsWith('Arrow')||/^[a-zA-Z]$/.test(k))){e.preventDefault();raceTap();return;}
  if(tv.game==='simon'){const i='1234'.indexOf(k);const j='qwas'.indexOf(k.toLowerCase());const idx=i>=0?i:j;if(idx>=0){e.preventDefault();press(idx);}}}
 // ------------------------------------------------------------ FÚTBOL DE FICHAS (16.4: fluido)
 // El cliente simula su propia ficha y el balón con la MISMA física que el servidor y se
 // corrige suavemente con cada estado; las fichas ajenas se interpolan con 100 ms de margen.
 let FX=20,FY=50,FK=1;const TEAM=['#3c8cff','#ff5a6b'],TEAMN=['AZUL','ROJO'];
 const fb={dir:{x:0,y:0},sentAt:0,keys:new Set(),drag:null,me:null,ball:null,buf:[],rtt:.12,pendDir:null,pendAt:0,lastView:null,lastTime:0};
 function fbSend(force=false){const d=fb.dir;if(force||performance.now()-fb.sentAt>120||d.x!==fb.lastX||d.y!==fb.lastY){if(d.x!==fb.lastX||d.y!==fb.lastY){fb.pendDir={...d};fb.pendAt=performance.now();}fb.sentAt=performance.now();fb.lastX=d.x;fb.lastY=d.y;send('tableInput',{x:d.x,y:d.y});}}
 function fbKickNow(){if(tv?.game!=='football')return;send('tableInput',{kick:1});ui.kickFlash=performance.now();if(fb.me&&fb.ball&&fbKick(fb.ball,fb.me,FB.reach))tone(300,.07,'square',.05);else tone(180,.04,'square',.03);}
 function fbDirFromKeys(){const k=fb.keys;fb.dir={x:(k.has('arrowright')||k.has('d')?1:0)-(k.has('arrowleft')||k.has('a')?1:0),y:(k.has('arrowdown')||k.has('s')?1:0)-(k.has('arrowup')||k.has('w')?1:0)};if(fb.me){fb.me.ix=fb.dir.x;fb.me.iy=fb.dir.y;}fbSend(true);}
 // Cada estado del servidor: búfer para interpolar, RTT y corrección suave de la predicción.
 function fbOnView(v){if(fb.lastView===v)return;fb.lastView=v;const t=v===tv?.view?tv.serverTime:srvNow();fb.buf.push({t,pl:new Map(v.pl.map(q=>[q.id,q]))});while(fb.buf.length>12)fb.buf.shift();
  const me=v.pl.find(q=>q.id===tv.me);if(!me)return;
  if(fb.pendDir&&me.ix===fb.pendDir.x&&me.iy===fb.pendDir.y){const r=(performance.now()-fb.pendAt)/1000;fb.rtt=Math.max(.03,Math.min(.6,fb.rtt*.7+r*.3));fb.pendDir=null;}
  // Proyección del servidor hacia «ahora» con la misma física (inercia incluida).
  const lead=fb.rtt,pm={...me,ix:fb.dir.x,iy:fb.dir.y,vx:me.vx||0,vy:me.vy||0};{let rest=lead;while(rest>0){const h=Math.min(1/120,rest);fbMovePlayer(pm,h);rest-=h;}}const tx=pm.x,ty=pm.y;
  if(!fb.me||Math.hypot(fb.me.x-tx,fb.me.y-ty)>70)fb.me={id:me.id,team:me.team,x:tx,y:ty,ix:fb.dir.x,iy:fb.dir.y,vx:pm.vx,vy:pm.vy};else{fb.me.x+=(tx-fb.me.x)*.12;fb.me.y+=(ty-fb.me.y)*.12;fb.me.vx+=(pm.vx-fb.me.vx)*.12;fb.me.vy+=(pm.vy-fb.me.vy)*.12;}
  // Balón: el del servidor adelantado el mismo tiempo, sin contactos; si difiere mucho, salto.
  const sb={...v.ball};if(srvNow()>=v.pauseUntil){const others=v.pl.filter(q=>q.id!==tv.me).map(q=>({...q}));let rest=lead;while(rest>0){const h=Math.min(.016,rest);fbStepBall(sb,others,h);rest-=h;}}
  if(!fb.ball||srvNow()<v.pauseUntil||Math.hypot(fb.ball.x-sb.x,fb.ball.y-sb.y)>60)fb.ball=sb;else{const k=Math.hypot(fb.ball.x-fb.me.x,fb.ball.y-fb.me.y)<FB.pr+FB.br+6?.06:.2;fb.ball.x+=(sb.x-fb.ball.x)*k;fb.ball.y+=(sb.y-fb.ball.y)*k;fb.ball.vx+=(sb.vx-fb.ball.vx)*k*1.5;fb.ball.vy+=(sb.vy-fb.ball.vy)*k*1.5;}}
 function fbOthersAt(t){const B=fb.buf;if(!B.length)return [];let i=B.length-1;while(i>0&&B[i-1].t>t)i--;const b=B[i],a=B[Math.max(0,i-1)];const u=b.t>a.t?Math.max(0,Math.min(1.5,(t-a.t)/(b.t-a.t))):1;const out=[];for(const [id,q] of b.pl){if(id===tv.me)continue;const p=a.pl.get(id)||q;out.push({...q,x:p.x+(q.x-p.x)*u,y:p.y+(q.y-p.y)*u,vx:q.vx||0,vy:q.vy||0});}return out;}
 function drawFootball(t,dt){const v=tv.view;fbOnView(v);FK=Math.min(1,(H-104)/v.h,(W-40)/v.w);FX=(W-v.w*FK)/2;FY=46;const paused=srvNow()<v.pauseUntil;bg(t);
  // Simulación local a paso fijo (mismo resultado a 30 o 144 fps).
  const others=fbOthersAt(srvNow()-100),othersFixed=new Set(others);fb.acc=Math.min(.1,(fb.acc||0)+dt);while(fb.acc>=1/120){const h=1/120;fb.acc-=h;if(fb.me){fb.me.ix=fb.dir.x;fb.me.iy=fb.dir.y;fbMovePlayer(fb.me,h);if(others.length)fbCollidePlayers([fb.me,...others],othersFixed);}if(fb.ball&&!paused)fbStepBall(fb.ball,fb.me?[fb.me,...others]:others,h);}
  if(fb.ball&&(fb.ball.x<-FB.br||fb.ball.x>FB.w+FB.br)){fb.ball.x=Math.max(-FB.br,Math.min(FB.w+FB.br,fb.ball.x));fb.ball.vx=0;fb.ball.vy=0;}
  text(TEAMN[0]+' '+v.score[0],W/2-70,26,{size:22,color:TEAM[0]});text('–',W/2,26,{size:22});text(v.score[1]+' '+TEAMN[1],W/2+70,26,{size:22,color:TEAM[1]});
  ctx.save();ctx.translate(FX,FY);ctx.scale(FK,FK);
  ctx.fillStyle='#2f8f4e';rr(0,0,v.w,v.h,10);ctx.fill();for(let i=0;i<6;i+=2){ctx.fillStyle='#ffffff10';ctx.fillRect(i*v.w/6,0,v.w/6,v.h);}
  ctx.strokeStyle='#ffffffcc';ctx.lineWidth=3;rr(0,0,v.w,v.h,10);ctx.stroke();ctx.beginPath();ctx.moveTo(v.w/2,0);ctx.lineTo(v.w/2,v.h);ctx.stroke();ctx.beginPath();ctx.arc(v.w/2,v.h/2,46,0,TAU);ctx.stroke();
  for(const side of [0,1]){const gx=side?v.w:0;ctx.fillStyle=TEAM[side]+'66';ctx.fillRect(side?gx:gx-12,v.mouth[0],12,v.mouth[1]-v.mouth[0]);ctx.strokeStyle='#fff';ctx.strokeRect(side?gx-60:gx,v.mouth[0]-20,60,v.mouth[1]-v.mouth[0]+40);}
  const tokens=[...others.map(q=>({...q,mine:false})),...(fb.me?[{...v.pl.find(q=>q.id===tv.me),...fb.me,mine:true}]:[])];
  for(const q of tokens){const kicking=srvNow()-(q.kickAt||0)<180||q.mine&&ui.kickFlash&&performance.now()-ui.kickFlash<150;
   ctx.fillStyle='#0004';ctx.beginPath();ctx.ellipse(q.x+2,q.y+4,v.pr,v.pr*.6,0,0,TAU);ctx.fill();ctx.fillStyle=TEAM[q.team];ctx.strokeStyle=q.mine?'#fff3a8':'#fff';ctx.lineWidth=q.mine?4:2.5;ctx.beginPath();ctx.arc(q.x,q.y,v.pr+(kicking?3:0),0,TAU);ctx.fill();ctx.stroke();
   text((q.name||'').slice(0,10),q.x,q.y-v.pr-9,{size:11,stroke:INK,sw:3});}
  const b=fb.ball||v.ball;ctx.fillStyle='#0005';ctx.beginPath();ctx.ellipse(b.x+2,b.y+3,v.br,v.br*.6,0,0,TAU);ctx.fill();ctx.fillStyle='#fff';ctx.strokeStyle='#111';ctx.lineWidth=2;ctx.beginPath();ctx.arc(b.x,b.y,v.br,0,TAU);ctx.fill();ctx.stroke();ctx.save();ctx.translate(b.x,b.y);ctx.rotate((b.x+b.y)/9);ctx.fillStyle='#111';ctx.beginPath();ctx.arc(0,0,v.br*.38,0,TAU);ctx.fill();ctx.fillRect(-1,-v.br,2,v.br*.5);ctx.restore();
  if(v.goal&&srvNow()<v.goal.until){ctx.fillStyle='#120a2ecc';ctx.fillRect(0,v.h/2-40,v.w,80);text('¡GOOOL '+TEAMN[v.goal.team]+'!',v.w/2,v.h/2-6,{size:34,color:TEAM[v.goal.team]});if(v.goal.by)text(v.goal.by,v.w/2,v.h/2+24,{size:14,color:'#fff'});if(ui.lastGoal!==v.goal.at){ui.lastGoal=v.goal.at;fb.ball={...v.ball};confetti(W/2,H/2,40);tone(880,.3,'triangle',.06);}}
  ctx.restore();
  const me=fb.me;if(me)text(`Equipo ${TEAMN[me.team]} · flechas para moverte · ESPACIO para chutar fuerte`,W/2,H-30,{size:12,color:'#e6dcff',stroke:null,base:'bottom'});
  zones.push({x:FX,y:FY,w:v.w*FK,h:v.h*FK,fn:null,drag:true});button('CHUTAR',W-118,H-52,100,42,fbKickNow,{fill:ui.kickFlash&&performance.now()-ui.kickFlash<150?'#ffd36b':'#c9505a'});button('Salir',18,H-52,80,42,()=>close(),{fill:'#4a3a8c'});
  fbSend();}



 // ------------------------------------------------------------ BOXEO (16.8)
 // Mi púgil se simula aquí con la misma física que el servidor (respuesta inmediata) y se corrige
 // con cada estado; los demás se interpolan 100 ms por detrás. Golpes, vida y puntos: del servidor.
 // Controles: flechas/WASD mover · ESPACIO atacar · E defender (mantén) · F ulti.
 const bx={me:null,buf:[],last:null,prev:new Map(),pops:[],sparks:[],rtt:.1,pend:null,pendAt:0,block:false,atkAt:-1e9,ready:0,ultFlash:-1e9,shake:0,sid:null,koAt:0,acc:0,trail:new Map(),crowd:0,cheer:0,rope:0};
 function bxReset(){Object.assign(bx,{me:null,buf:[],last:null,prev:new Map(),pops:[],sparks:[],pend:null,block:false,atkAt:-1e9,ready:0,ultFlash:-1e9,shake:0,koAt:0,acc:0,trail:new Map(),crowd:0,cheer:0,rope:0});fb.keys.clear();fb.dir={x:0,y:0};fb.lastX=fb.lastY=undefined;}
 function bxDirFromKeys(){const k=fb.keys;fb.dir={x:(k.has('arrowright')||k.has('d')?1:0)-(k.has('arrowleft')||k.has('a')?1:0),y:(k.has('arrowdown')||k.has('s')?1:0)-(k.has('arrowup')||k.has('w')?1:0)};if(bx.me){bx.me.ix=fb.dir.x;bx.me.iy=fb.dir.y;}fbSend(true);}
 function bxAim(x,y){const m=bx.me;if(!m)return;const dx=(x-FX)/FK-m.x,dy=(y-FY)/FK-m.y,l=Math.hypot(dx,dy);fb.dir=l<12?{x:0,y:0}:{x:Math.abs(dx)/l>.35?Math.sign(dx):0,y:Math.abs(dy)/l>.35?Math.sign(dy):0};m.ix=fb.dir.x;m.iy=fb.dir.y;fbSend(true);}
 function bxAttack(){if(tv?.game!=='boxing')return;send('tableInput',{atk:1});const n=srvNow();if(bx.me&&!bx.block&&n>=bx.ready&&n>=bx.me.stun){bx.ready=n+BX.cd;bx.atkAt=performance.now();bx.me.vx-=bx.me.face*BX.recoil;tone(220,.05,'square',.04);}}
 function bxUlt(){if(tv?.game!=='boxing')return;send('tableInput',{ult:1});}
 function bxBlock(on){if(tv?.game!=='boxing'||bx.block===on)return;bx.block=on;if(bx.me)bx.me.block=on;send('tableInput',{block:on});}
 function bxPop(x,y,txt,color,size=16){bx.pops.push({x,y,t:0,txt,color,size});}
 function bxSpark(x,y,n,color){for(let i=0;i<n;i++){const a=Math.random()*TAU,sp=60+Math.random()*180;bx.sparks.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-40,t:0,c:color});}}
 function bxOnView(v){if(bx.last===v)return;bx.last=v;const t=v===tv?.view?tv.serverTime:srvNow();bx.buf.push({t,pl:new Map(v.pl.map(q=>[q.id,q]))});while(bx.buf.length>12)bx.buf.shift();
  const now=srvNow();
  for(const q of v.pl){const o=bx.prev.get(q.id);
   if(o){if(q.hitAt!==o.hitAt&&q.hitAt>0&&now-q.hitAt<600){const d=o.hp-q.hp;if(d>0){const big=d>=10;bxPop(q.x,q.y-60,'-'+d,big?'#ffb347':'#ff6b6b',big?24:16);bx.shake=Math.max(bx.shake,big?9:q.id===tv.me?4:1.6);bxSpark(q.x,q.y-14,big?16:7,big?'#ffd36b':'#fff');bx.crowd=Math.min(1,Math.max(bx.crowd,big?.75:bx.crowd+.14));tone(big?90:140,big?.2:.06,'square',.06);}else if(q.hp<=o.hp+1){bxPop(q.x,q.y-60,'¡BLOQUEO!','#8fd0ff',12);bxSpark(q.x+q.face*14,q.y-12,5,'#8fd0ff');}
     else{bxPop(q.x,q.y-60,'¡KO!','#ff5a6b',26);}}
    if(q.ultAt!==o.ultAt&&q.ultAt>0&&now-q.ultAt<600){bx.ultFlash=performance.now();bx.shake=Math.max(bx.shake,11);bx.crowd=1;bx.cheer=performance.now();tone(70,.35,'sawtooth',.08);bxPop(q.x,q.y-76,'¡ULTI!','#ffd36b',26);}
    if(q.blocked!==o.blocked&&q.blocked>0&&now-q.blocked<600){tone(320,.05,'triangle',.05);}
    if(q.combo>=3&&q.combo!==o.combo&&q.id===tv.me)bxPop(q.x,q.y-84,`COMBO x${q.combo}`,'#ffe45f',18);}
   bx.prev.set(q.id,{hp:q.hp,hitAt:q.hitAt,ultAt:q.ultAt,blocked:q.blocked,combo:q.combo});}
  for(const id of [...bx.prev.keys()])if(!v.pl.some(q=>q.id===id))bx.prev.delete(id);
  if(v.ko&&v.ko.at!==bx.koAt){const first=bx.koAt===0&&now-v.ko.at>2500;bx.koAt=v.ko.at;if(!first){confetti(W/2,H/2,34);tone(660,.25,'triangle',.07);bx.crowd=1;bx.cheer=performance.now();bx.shake=Math.max(bx.shake,12);}}
  const me=v.pl.find(q=>q.id===tv.me);if(!me)return;
  if(bx.pend&&me.ix===bx.pend.x&&me.iy===bx.pend.y){const r=(performance.now()-bx.pendAt)/1000;bx.rtt=Math.max(.03,Math.min(.5,bx.rtt*.7+r*.3));bx.pend=null;}
  const lock=now<me.stun||me.fly;
  const pm={...me,ix:fb.dir.x,iy:fb.dir.y,block:bx.block&&!lock};if(!lock){let rest=bx.rtt;while(rest>0){const h=Math.min(1/120,rest);bxMove(pm,h);rest-=h;}}
  if(!bx.me||lock||Math.hypot(bx.me.x-pm.x,bx.me.y-pm.y)>80)bx.me={...me,x:pm.x,y:pm.y,vx:pm.vx,vy:pm.vy,ix:fb.dir.x,iy:fb.dir.y,block:pm.block};
  else{const m=bx.me;m.x+=(pm.x-m.x)*.14;m.y+=(pm.y-m.y)*.14;m.vx+=(pm.vx-m.vx)*.14;m.vy+=(pm.vy-m.vy)*.14;Object.assign(m,{hp:me.hp,ult:me.ult,combo:me.combo,stun:me.stun,fly:me.fly,face:me.face,atkAt:me.atkAt,ultAt:me.ultAt,hitAt:me.hitAt,blocked:me.blocked,inv:me.inv,team:me.team,name:me.name});}}
 function bxOthersAt(t){const B=bx.buf;if(!B.length)return [];let i=B.length-1;while(i>0&&B[i-1].t>t)i--;const b=B[i],a=B[Math.max(0,i-1)];const u=b.t>a.t?Math.max(0,Math.min(1.2,(t-a.t)/(b.t-a.t))):1;const out=[];for(const [id,q] of b.pl){if(id===tv.me)continue;const p=a.pl.get(id)||q;out.push({...q,x:p.x+(q.x-p.x)*u,y:p.y+(q.y-p.y)*u});}return out;}
 // Guante de cuero: puño acolchado, pulgar, brillo, costura y puño blanco con cordones.
 function glove(x,y,r,face,col,ang=0,gold=false){const c0=gold?'#ffcf4a':col,c1=gold?'#a86a00':shade(col,-45);ctx.save();ctx.translate(x,y);ctx.scale(face,1);ctx.rotate(ang);
  ctx.fillStyle='#f2f2f2';rr(-r*1.55,-r*.62,r*.95,r*1.24,r*.3);ctx.fill();ctx.strokeStyle='#8a8a8a';ctx.lineWidth=1;ctx.stroke();ctx.strokeStyle='#bbb';for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(-r*1.3,i*r*.28-r*.12);ctx.lineTo(-r*.95,i*r*.28+r*.12);ctx.stroke();}
  const g=ctx.createRadialGradient(r*.2,-r*.35,r*.1,0,0,r*1.3);g.addColorStop(0,shade(c0,55));g.addColorStop(.55,c0);g.addColorStop(1,c1);
  ctx.fillStyle=g;ctx.strokeStyle='#1c1230';ctx.lineWidth=1.8;ctx.beginPath();ctx.ellipse(0,0,r*1.12,r*.94,0,0,TAU);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.ellipse(-r*.15,r*.55,r*.6,r*.32,.2,0,TAU);ctx.fillStyle=shade(c0,-20);ctx.fill();ctx.stroke();
  ctx.strokeStyle='#ffffff55';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(r*.1,-r*.1,r*.62,-2.5,-.7);ctx.stroke();
  ctx.strokeStyle='#00000040';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(r*.25,-r*.6);ctx.quadraticCurveTo(r*.55,0,r*.25,r*.6);ctx.stroke();ctx.restore();}
 function shade(hex,d){const n=parseInt(hex.slice(1),16),f=v=>Math.max(0,Math.min(255,v+d));return '#'+((1<<24)+(f(n>>16)<<16)+(f((n>>8)&255)<<8)+f(n&255)).toString(16).slice(1);}
 function bxFighter(q,mine,t){const now=srvNow(),lk=look(q.id)||{color:q.team?4:7,name:q.name};const atk=now-q.atkAt,ult=now-q.ultAt,hit=now-q.hitAt,fly=!!q.fly;
  const moving=Math.hypot(q.vx||0,q.vy||0)>20,sc=.74,col=TEAM[q.team],face=q.face||1;
  ctx.save();if(now<q.inv&&Math.floor(t/90)%2)ctx.globalAlpha=.45;
  ctx.fillStyle='#0006';ctx.beginPath();ctx.ellipse(q.x,q.y+19,20,7,0,0,TAU);ctx.fill();ctx.strokeStyle=col;ctx.lineWidth=mine?3.5:2.2;ctx.beginPath();ctx.ellipse(q.x,q.y+19,22,8,0,0,TAU);ctx.stroke();
  if(fly){const tr=bx.trail.get(q.id)||[];for(let i=0;i<tr.length;i++){ctx.globalAlpha=.12*(i+1);drawRobot(ctx,{...lk,id:'box-'+q.id,alive:true,input:{x:face,y:0},facing:face},tr[i].x,tr[i].y,sc,t,true,false);}ctx.globalAlpha=1;}
  ctx.save();ctx.translate(q.x,q.y);if(fly)ctx.rotate(face*(t/45%TAU));else if(hit<150)ctx.translate(-face*Math.sin(hit/150*Math.PI)*5,0);
  const lunge=atk<170?Math.sin(atk/170*Math.PI)*8*face:0;ctx.translate(lunge,0);
  drawRobot(ctx,{...lk,id:'box-'+q.id,alive:true,input:{x:face,y:0},facing:face},0,0,sc,t,moving,false);
  ctx.restore();
  if(hit<110){ctx.globalAlpha=.5*(1-hit/110);ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(q.x,q.y-16,20,34,0,0,TAU);ctx.fill();ctx.globalAlpha=q.inv>now&&Math.floor(t/90)%2?.45:1;}
  const gy=q.y-12,gx=q.x+face*20,isUlt=ult<430,ext=isUlt?Math.sin(Math.min(1,ult/430)*Math.PI)*58:atk<200?Math.sin(atk/200*Math.PI)*34:0;
  if(!fly){
   if(ext){if(isUlt&&ext>6){ctx.strokeStyle='#ffd36bcc';ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(q.x,gy);ctx.lineTo(gx+face*ext,gy);ctx.stroke();ctx.lineCap='butt';}
    ctx.strokeStyle=shade(col,-30);ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(q.x+face*6,gy+1);ctx.lineTo(gx+face*(ext-4),gy);ctx.stroke();ctx.lineCap='butt';
    glove(gx+face*ext,gy,isUlt?13:9.5,face,col,0,isUlt);glove(gx-face*6,gy+9,8.5,face,col,.4);}
   else if(q.block){glove(gx-face*4,gy-4,10,face,col,-.3);glove(gx-face*1,gy+7,9.5,face,col,.2);ctx.strokeStyle='#8fd0ff';ctx.fillStyle='#8fd0ff2e';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(q.x+face*18,q.y-10,10,28,0,0,TAU);ctx.fill();ctx.stroke();}
   else{const bob=Math.sin(t/150+q.x)*1.4;glove(gx,gy+bob,9,face,col,-.15);glove(gx-face*9,gy+8-bob,8.5,face,col,.3);}}
  if(now-q.blocked<150){ctx.fillStyle='#fff';ctx.font='700 16px system-ui';ctx.textAlign='center';ctx.fillText('✦',q.x+face*34,q.y-14);}
  const bw=44,hy=q.y-62,pc=Math.max(0,q.hp/BX.hp);ctx.fillStyle='#000a';rr(q.x-bw/2-1.5,hy-1.5,bw+3,9,3.5);ctx.fill();ctx.fillStyle=pc>.5?'#4be39b':pc>.25?'#ffe45f':'#ff5a6b';rr(q.x-bw/2,hy,bw*pc,6,3);ctx.fill();
  text((q.name||'').slice(0,12),q.x,hy-9,{size:12,stroke:INK,sw:3,color:mine?'#fff3a8':'#fff'});
  ctx.restore();}
 // Público: filas pegadas al ring que se emocionan con los golpes duros, la ulti y los KO.
 const SK=['#f2c9a0','#d9a273','#a8734a','#7a4a2c','#f6d6b8','#c68a5a'],SH=['#e8453c','#3c8cff','#ffe45f','#4be39b','#b58cff','#ff9a3c','#ffffff','#2a2a3a','#ff6bb5','#3cd0c8'];
 const rnd=i=>{const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x);};
 function spectator(x,y,i,t,s=1){const e=bx.crowd,r=rnd(i),jump=e>.15?Math.abs(Math.sin(t/(150+r*60)+i))*(4+e*9):Math.sin(t/700+i)*1.2,sk=SK[Math.floor(rnd(i+5)*SK.length)],sh=SH[Math.floor(rnd(i+9)*SH.length)],up=e>.35;
  ctx.save();ctx.translate(x,y-jump);ctx.scale(s,s);
  if(up){ctx.strokeStyle=sk;ctx.lineWidth=3.2;ctx.lineCap='round';for(const sd of [-1,1]){const sw=Math.sin(t/110+i+sd)*5;ctx.beginPath();ctx.moveTo(sd*7,4);ctx.lineTo(sd*11+sw,-15-e*6);ctx.stroke();}ctx.lineCap='butt';}
  ctx.fillStyle=sh;rr(-9,2,18,16,6);ctx.fill();ctx.fillStyle=sk;ctx.beginPath();ctx.arc(0,-6,7.2,0,TAU);ctx.fill();
  ctx.fillStyle='#2b1b14';ctx.beginPath();ctx.arc(0,-8.5,7.4,Math.PI,TAU);ctx.fill();
  ctx.fillStyle='#1c1230';if(e>.5){ctx.beginPath();ctx.ellipse(0,-3,2.4,3.2,0,0,TAU);ctx.fill();}else{ctx.fillRect(-3.5,-6.5,2,2);ctx.fillRect(1.5,-6.5,2,2);}
  ctx.restore();}
 function drawCrowd(t,dt){bx.crowd=Math.max(0,bx.crowd-dt*.5);
  ctx.fillStyle='#0d0720';ctx.fillRect(0,36,W,FY+250*FK-30);
  // focos
  for(const sx of [W*.2,W*.5,W*.8]){const g=ctx.createRadialGradient(sx,40,4,sx,FY+60,220);g.addColorStop(0,'#ffffff30');g.addColorStop(1,'#ffffff00');ctx.fillStyle=g;ctx.fillRect(sx-230,36,460,300);}
  let n=0;const top=FY-6;
  for(let row=0;row<3;row++){const y=top-12-row*15,s=.78+row*.0+(2-row)*.0;for(let x=8+(row%2)*10;x<W;x+=20){spectator(x,y,n++,t,.78);}}
  const colsL=[FX-30,FX-54],colsR=[FX+600*FK+30,FX+600*FK+54];
  for(const cx of colsL.concat(colsR))for(let y=FY+14;y<FY+250*FK-8;y+=24)spectator(cx,y,n++,t,.78);
  if(bx.crowd>.6&&performance.now()-bx.cheer<2500){ctx.globalAlpha=Math.min(1,bx.crowd);text('¡OOOH!',W/2,FY+34,{size:22+bx.crowd*8,color:'#ffe45f',sw:5});ctx.globalAlpha=1;}}
 function drawRing(t,dt){const w=BX.w,h=BX.h,fy=14;
  // lona (mitad azul / mitad roja) y apron
  ctx.fillStyle='#1b1033';rr(-20,fy-24,w+40,h-fy+52,10);ctx.fill();
  const g=ctx.createLinearGradient(0,fy,0,h);g.addColorStop(0,'#40367f');g.addColorStop(1,'#5a4aa8');ctx.fillStyle=g;ctx.fillRect(0,fy,w,h-fy);
  ctx.fillStyle='#3c8cff26';ctx.fillRect(0,fy,w/2,h-fy);ctx.fillStyle='#ff5a6b26';ctx.fillRect(w/2,fy,w/2,h-fy);
  ctx.strokeStyle='#ffffff44';ctx.lineWidth=2;ctx.beginPath();ctx.arc(w/2,(fy+h)/2,46,0,TAU);ctx.stroke();ctx.setLineDash([8,8]);ctx.beginPath();ctx.moveTo(w/2,fy);ctx.lineTo(w/2,h);ctx.stroke();ctx.setLineDash([]);
  text('PUCELA',w/2,(fy+h)/2,{size:26,color:'#ffffff22',stroke:null,weight:900});
  ctx.strokeStyle='#2a1763';ctx.lineWidth=3;ctx.strokeRect(0,fy,w,h-fy);}
 function rope(x1,y1,x2,y2,c,sag=0){ctx.strokeStyle='#00000055';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x1,y1+2);ctx.quadraticCurveTo((x1+x2)/2,(y1+y2)/2+sag+2,x2,y2+2);ctx.stroke();ctx.strokeStyle=c;ctx.lineWidth=3.2;ctx.beginPath();ctx.moveTo(x1,y1);ctx.quadraticCurveTo((x1+x2)/2,(y1+y2)/2+sag,x2,y2);ctx.stroke();ctx.strokeStyle='#ffffff77';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x1,y1-1);ctx.quadraticCurveTo((x1+x2)/2,(y1+y2)/2+sag-1,x2,y2-1);ctx.stroke();}
 const ROPEC=['#ff5a6b','#ffffff','#3c8cff'],RH=[14,28,42];
 function ropesBack(){const w=BX.w,fy=14;for(let i=0;i<3;i++){rope(0,fy-RH[i],w,fy-RH[i],ROPEC[i],3+bx.rope*3);}for(let i=0;i<3;i++){rope(0,fy-RH[i],0,BX.h-RH[i],ROPEC[i]);rope(w,fy-RH[i],w,BX.h-RH[i],ROPEC[i]);}
  post(0,fy);post(w,fy);}
 function ropesFront(){const w=BX.w,h=BX.h;for(let i=0;i<3;i++)rope(0,h-RH[i],w,h-RH[i],ROPEC[i],4+bx.rope*3);post(0,h);post(w,h);}
 function post(x,y){ctx.fillStyle='#00000066';ctx.beginPath();ctx.ellipse(x,y+3,9,4,0,0,TAU);ctx.fill();const g=ctx.createLinearGradient(x-6,0,x+6,0);g.addColorStop(0,'#555a6a');g.addColorStop(.5,'#c9ced8');g.addColorStop(1,'#555a6a');ctx.fillStyle=g;rr(x-6,y-60,12,62,4);ctx.fill();ctx.strokeStyle='#1c1230';ctx.lineWidth=1.5;ctx.stroke();
  for(let i=0;i<3;i++){ctx.fillStyle=ROPEC[i];rr(x-8,y-RH[i]-5,16,10,4);ctx.fill();ctx.stroke();}}
 function drawBoxing(t,dt){const v=tv.view;if(bx.sid!==tv.id){bxReset();bx.sid=tv.id;}bxOnView(v);K0();bg(t);
  const now=srvNow(),others=bxOthersAt(now-100),fixed=new Set(others);bx.acc=Math.min(.1,bx.acc+dt);
  while(bx.acc>=1/120){const h=1/120;bx.acc-=h;const m=bx.me;if(m){const lock=now<m.stun;if(m.fly){m.x+=m.face*BX.flySpeed*h;m.x=Math.max(BX.pr,Math.min(BX.w-BX.pr,m.x));}else{m.ix=fb.dir.x;m.iy=fb.dir.y;m.block=bx.block&&!lock;bxMove(m,h,lock);if(others.length)bxSeparate([m,...others],fixed);}}}
  const sh=bx.shake>.3?bx.shake:0;bx.shake*=Math.pow(.001,dt);bx.rope=Math.max(0,bx.rope-dt*2);
  drawCrowd(t,dt);
  text('AZUL '+v.score[0],W/2-70,22,{size:22,color:TEAM[0]});text('–',W/2,22,{size:22});text(v.score[1]+' ROJO',W/2+70,22,{size:22,color:TEAM[1]});
  ctx.save();ctx.translate(FX+(sh?(Math.random()-.5)*sh:0),FY+(sh?(Math.random()-.5)*sh:0));ctx.scale(FK,FK);
  drawRing(t,dt);ropesBack();
  const list=[...others.map(q=>({...q,mine:false})),...(bx.me?[{...v.pl.find(q=>q.id===tv.me),...bx.me,mine:true}]:[])].sort((a,b)=>a.y-b.y);
  for(const q of list){const tr=bx.trail.get(q.id)||[];if(q.fly){tr.push({x:q.x,y:q.y});while(tr.length>5)tr.shift();bx.trail.set(q.id,tr);if(q.x<BX.pr+6||q.x>BX.w-BX.pr-6)bx.rope=1;}else if(tr.length)bx.trail.delete(q.id);bxFighter(q,q.mine,t);}
  ropesFront();
  for(const p of bx.sparks){p.t+=dt;p.vy+=520*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}for(let i=bx.sparks.length-1;i>=0;i--)if(bx.sparks[i].t>.45)bx.sparks.splice(i,1);for(const p of bx.sparks){ctx.globalAlpha=Math.max(0,1-p.t/.45);ctx.fillStyle=p.c;ctx.fillRect(p.x-2,p.y-2,4,4);}ctx.globalAlpha=1;
  for(const p of bx.pops){p.t+=dt;ctx.globalAlpha=Math.max(0,1-p.t/.9);text(p.txt,p.x,p.y-p.t*38,{size:p.size,color:p.color,sw:4});}ctx.globalAlpha=1;for(let i=bx.pops.length-1;i>=0;i--)if(bx.pops[i].t>.9)bx.pops.splice(i,1);
  if(performance.now()-bx.ultFlash<160){ctx.fillStyle='#ffd36b';ctx.globalAlpha=.3*(1-(performance.now()-bx.ultFlash)/160);ctx.fillRect(-30,-30,v.w+60,v.h+60);ctx.globalAlpha=1;}
  ctx.restore();
  if(v.ko&&now-v.ko.at<1500){const a=Math.min(1,(1500-(now-v.ko.at))/400);ctx.globalAlpha=a*.85;ctx.fillStyle='#120a2ecc';ctx.fillRect(FX,FY+8,BX.w*FK,52);text(`¡KO de ${v.ko.name}!`,W/2,FY+25,{size:22,color:TEAM[1-v.ko.team]});text(`+1 PUNTO ${TEAMN[1-v.ko.team]}  ·  ❤ +25 % de vida para todos`,W/2,FY+47,{size:13,color:'#9dffcf'});ctx.globalAlpha=1;}
  // HUD propio + controles
  const m=bx.me||v.pl.find(q=>q.id===tv.me);
  if(m){const pc=Math.max(0,m.hp/BX.hp),uc=Math.min(1,(m.ult||0)/100),ready=uc>=1;
   ctx.fillStyle='#000a';rr(18,304,282,16,8);ctx.fill();ctx.fillStyle=pc>.5?'#4be39b':pc>.25?'#ffe45f':'#ff5a6b';rr(20,306,278*pc,12,6);ctx.fill();text('VIDA '+Math.max(0,Math.round(m.hp)),159,312,{size:11,stroke:null});
   ctx.fillStyle='#000a';rr(340,304,282,16,8);ctx.fill();ctx.fillStyle=ready?'#ffd36b':'#b58cff';rr(342,306,278*uc,12,6);ctx.fill();text(ready?'¡ULTI LISTA! (F)':'ULTI '+Math.round(uc*100)+'%',481,312,{size:11,stroke:null});
   const pressedBlock=bx.block,atkOn=performance.now()-bx.atkAt<130;
   button('DEFENDER (E)',18,334,170,56,()=>bxBlock(true),{fill:pressedBlock?'#2c8fd8':'#3b6fb5'});zones[zones.length-1].hold=true;zones[zones.length-1].up=()=>bxBlock(false);
   button(ready?'¡ULTI! (F)':'ULTI (F)',228,334,150,56,()=>bxUlt(),{fill:ready?'#e8a21c':'#5b4a7a'});
   button('ATACAR (ESPACIO)',418,334,204,56,()=>bxAttack(),{fill:atkOn?'#ffd36b':'#d8454f'});zones[zones.length-1].hold=true;
   button('Salir',8,6,64,26,()=>close(),{fill:'#4a3a8c'});}
  zones.unshift({x:FX,y:FY,w:v.w*FK,h:v.h*FK,fn:null,drag:true});
  fbSend();}
 function K0(){FK=.8;FX=(W-BX.w*FK)/2;FY=84;}
 canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointermove',onMove);canvas.addEventListener('pointerup',onUp);canvas.addEventListener('pointercancel',onUp);
 canvas.addEventListener('keydown',onKey);canvas.addEventListener('keyup',onKey);
 canvas.style.touchAction='none';canvas.tabIndex=0;
 raf=requestAnimationFrame(frame);
 setTimeout(()=>canvas.focus({preventScroll:true}),50);
 return {
  update(view){if(tv&&view&&tv.id===view.id&&view.serverTime<tv.serverTime)return;const first=!tv;const phaseChanged=tv&&tv.phase!==view.phase;tv=view;recvAt=performance.now();{const o=view.serverTime-Date.now();offset=first||Math.abs(o-offset)>400?o:offset+(o-offset)*.1;}
   if(first||phaseChanged&&view.phase==='playing'){ui.prevScore=[0,0];ui.localTaps=0;ui.pendingTaps=0;ui.mark.clear();ui.prevFaces=[];ui.flip.clear();ui.cursor=0;}
   if(phaseChanged&&view.phase==='over'&&view.winner===view.seat&&view.game!=='memory')confetti(W/2,H/2,70);},
  destroy(){dead=true;cancelAnimationFrame(raf);canvas.removeEventListener('pointerdown',onDown);canvas.removeEventListener('pointermove',onMove);canvas.removeEventListener('keydown',onKey);canvas.removeEventListener('keyup',onKey);},
 };
}
