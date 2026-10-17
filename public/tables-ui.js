// Cliente de las mesas de juego de la sala de espera.
// Dibuja la partida que el servidor mantiene (`state.table`) y envía las acciones del jugador.
// Teclado, ratón y táctil comparten los mismos controles; no depende del DOM salvo del lienzo.
const W=640,H=400,TAU=Math.PI*2;
const C0='#ff7a6b',C1='#5fd0ff',INK='#2a1763',VIOLET='#7c4dff';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const PAD_COLORS=['#ff5a6b','#ffe45f','#4be39b','#4aa8ff'],PAD_FREQ=[262,330,392,523];

export function createTableStream(session,{onView=()=>{},onError=()=>{},WebSocketClass=globalThis.WebSocket,base=globalThis.location?.href}={}){
 let socket=null,ready=false,closed=false,heartbeat=0,timeout=0;
 const dispose=()=>{ready=false;clearInterval(heartbeat);clearTimeout(timeout);};
 try{if(!WebSocketClass||!base)throw Error();const url=new URL('/api/tables-ws',base);url.protocol=url.protocol==='https:'?'wss:':'ws:';socket=new WebSocketClass(url.href);
  timeout=setTimeout(()=>{if(!ready)socket.close();},3000);
  socket.onopen=()=>{if(!closed)socket.send(JSON.stringify({type:'subscribe',...session}));};
  socket.onmessage=e=>{if(closed)return;try{const m=JSON.parse(e.data);if(m.ready){ready=true;clearTimeout(timeout);heartbeat=setInterval(()=>send('ping',{}),2000);}if(m.error)onError(m.error);if(Object.hasOwn(m,'table'))onView(m.table);}catch{socket.close();}};
  socket.onerror=()=>dispose();socket.onclose=()=>dispose();
 }catch{dispose();}
 function send(type,data){if(closed||!ready||socket?.readyState!==1||socket.bufferedAmount>8192)return false;try{socket.send(JSON.stringify({type,data}));return true;}catch{dispose();return false;}}
 return {get ready(){return ready;},send,close(){closed=true;dispose();try{socket?.close();}catch{}}};
}

export function mountTableGame(canvas,{send,tone=()=>{},close=()=>{},meName='',fast=()=>false}){
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
  if(two){for(const p of tv.players){const mine=p.seat===s;text((mine?'▶ ':'')+p.name+(mine?' (tú)':''),p.seat===0?18:W-60,24,{size:15,color:col(p.seat),align:p.seat===0?'left':'right',stroke:INK,sw:4});}}}

 // ------------------------------------------------------------ pantallas comunes
 function drawWaiting(t){bg(t);header0();const dots='.'.repeat(1+Math.floor(t/400)%3);text('Esperando a otro jugador'+dots,W/2,H/2-8,{size:30});
  if(tv.notice)text(tv.notice,W/2,H/2+34,{size:15,color:'#ffe9a8'});
  text('La partida empezará sola cuando alguien se siente en esta mesa.',W/2,H/2+64,{size:13,color:'#d9c9ff',stroke:null,weight:600});
  const r=40+Math.sin(t/300)*4;ctx.strokeStyle='#ffffff55';ctx.lineWidth=4;ctx.beginPath();ctx.arc(W/2,H/2-86,r,0,TAU);ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(W/2+Math.cos(t/350)*r,H/2-86+Math.sin(t/350)*r,8,0,TAU);ctx.fill();
  button('Salir de la mesa',W/2-90,H-64,180,42,()=>close(),{fill:'#4a3a8c'});}
 function header0(){text(tv.label.toUpperCase(),W/2,24,{size:15,color:'#d9c9ff',stroke:null});}
 function overlayOver(t,title,sub,mine){ctx.fillStyle='#120a2ecc';ctx.fillRect(0,0,W,H);text(title,W/2,H/2-58,{size:46,color:mine?'#fff3a8':'#ffffff'});if(sub)text(sub,W/2,H/2-8,{size:19,color:'#e6dcff',stroke:INK});
  const again=tv.need===2&&tv.again[seat()];
  if(again)text('Esperando al rival…',W/2,H/2+52,{size:17,color:'#ffe9a8'});
  else button('Volver a jugar',W/2-170,H/2+30,170,44,()=>send('tableAgain',{}));
  button('Salir',W/2+(again?-70:20),H/2+(again?84:30),again?140:150,44,()=>close(),{fill:'#4a3a8c'});}

 // ------------------------------------------------------------ AIR HOCKEY
 const HK={k:1.3,fx:60,fy:46};
 function hockeyFieldPoint(px,py){return [(px-HK.fx)/HK.k,(py-HK.fy)/HK.k];}
 function drawHockey(t,dt){
  const v=tv.view,s=seat(),k=HK.k,now=srvNow(),age=Math.min(.15,(performance.now()-recvAt)/1000);
  bg(t);header();
  const half=s===0?[v.pr,200-v.pr]:[200+v.pr,v.w-v.pr];
  ui.target=[clamp(ui.target[0],half[0],half[1]),clamp(ui.target[1],v.pr,v.h-v.pr)];
  const speed=420;if(keys.size){let dx=0,dy=0;if(keys.has('left'))dx--;if(keys.has('right'))dx++;if(keys.has('up'))dy--;if(keys.has('down'))dy++;ui.target=[clamp(ui.target[0]+dx*speed*dt,half[0],half[1]),clamp(ui.target[1]+dy*speed*dt,v.pr,v.h-v.pr)];}
  const dxOwn=ui.target[0]-ui.own[0],dyOwn=ui.target[1]-ui.own[1],distOwn=Math.hypot(dxOwn,dyOwn),travel=Math.min(distOwn,560*dt);if(distOwn>.001){ui.own[0]+=dxOwn/distOwn*travel;ui.own[1]+=dyOwn/distOwn*travel;}
  const opp=1-s;if(!ui.opp)ui.opp=[...v.paddles[opp]];ui.opp[0]+=(v.paddles[opp][0]-ui.opp[0])*Math.min(1,dt*16);ui.opp[1]+=(v.paddles[opp][1]-ui.opp[1])*Math.min(1,dt*16);
  const frozen=v.freeze>now;let px=v.puck[0],py=v.puck[1];if(!frozen&&tv.phase==='playing'){px+=v.vel[0]*age;py+=v.vel[1]*age;px=clamp(px,v.ur,v.w-v.ur);py=clamp(py,v.ur,v.h-v.ur);}
  const predicted=[px,py];if(!ui.puck||frozen||Math.hypot(ui.puck[0]-px,ui.puck[1]-py)>70)ui.puck=predicted;else for(let i=0;i<2;i++)ui.puck[i]+=(predicted[i]-ui.puck[i])*Math.min(1,dt*28);[px,py]=ui.puck;
  // pista
  ctx.save();ctx.translate(HK.fx,HK.fy);ctx.scale(k,k);
  ctx.fillStyle='#1d5f99';rr(-8,-8,v.w+16,v.h+16,18);ctx.fill();ctx.strokeStyle='#e9f4ff';ctx.lineWidth=3;ctx.stroke();
  const rink=ctx.createLinearGradient(0,0,0,v.h);rink.addColorStop(0,'#3c9be0');rink.addColorStop(1,'#2a78b9');ctx.fillStyle=rink;rr(0,0,v.w,v.h,10);ctx.fill();
  ctx.strokeStyle='#ffffffaa';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(200,4);ctx.lineTo(200,v.h-4);ctx.stroke();ctx.beginPath();ctx.arc(200,120,28,0,TAU);ctx.stroke();
  for(const sx of [0,1]){ctx.fillStyle='#0f1a30';ctx.fillRect(sx?v.w-6:-6,v.goal[0],12,v.goal[1]-v.goal[0]);ctx.strokeStyle=sx?C1:C0;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(sx?v.w-2:2,v.goal[0]);ctx.lineTo(sx?v.w-2:2,v.goal[1]);ctx.stroke();}
  // mazas
  for(let i=0;i<2;i++){const p=i===s?ui.own:ui.opp,c=col(i);ctx.fillStyle='#0a142a55';ctx.beginPath();ctx.ellipse(p[0]+2,p[1]+5,v.pr,v.pr*.8,0,0,TAU);ctx.fill();ctx.fillStyle=c;ctx.beginPath();ctx.arc(p[0],p[1],v.pr,0,TAU);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#ffffff77';ctx.beginPath();ctx.arc(p[0]-5,p[1]-5,v.pr*.42,0,TAU);ctx.fill();}
  // disco
  ctx.fillStyle='#0a142a66';ctx.beginPath();ctx.ellipse(px+1,py+4,v.ur,v.ur*.7,0,0,TAU);ctx.fill();ctx.fillStyle='#14202c';ctx.beginPath();ctx.arc(px,py,v.ur,0,TAU);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2.5;ctx.stroke();ctx.fillStyle='#ffffff55';ctx.beginPath();ctx.arc(px-3,py-3,3.2,0,TAU);ctx.fill();
  ctx.restore();
  text(`${v.score[0]}  –  ${v.score[1]}`,W/2,H-20,{size:30});
  if(frozen&&tv.phase==='playing'){const n=Math.ceil((v.freeze-now)/450);const goal=v.score[0]+v.score[1]>0&&v.freeze-now<1300;if(v.score[0]+v.score[1]===0)text(n>0?String(Math.min(3,n)):'¡YA!',W/2,HK.fy+v.h*k/2,{size:70,color:'#fff3a8'});else if(goal)text('¡GOL!',W/2,HK.fy+v.h*k/2,{size:64,color:col(v.lastGoal)});}
  const sc=v.score;if(sc[0]!==ui.prevScore[0]||sc[1]!==ui.prevScore[1]){if(sc[0]+sc[1]>0){tone(sc[s]>ui.prevScore[s]?740:200,.28,'triangle',.07);if(sc[s]>ui.prevScore[s])confetti(HK.fx+300,HK.fy+150,22);}ui.prevScore=[...sc];}
  if(tv.phase==='over')overlayOver(t,tv.winner===s?'¡VICTORIA!':'DERROTA',`${v.score[0]} – ${v.score[1]}`,tv.winner===s);
  // envío del objetivo
  const nowMs=performance.now();if(tv.phase==='playing'&&nowMs-ui.lastSent>(fast()?33:80)&&(!ui.sentTarget||Math.hypot(ui.sentTarget[0]-ui.target[0],ui.sentTarget[1]-ui.target[1])>.6)){ui.lastSent=nowMs;ui.sentTarget=[...ui.target];send('tableInput',{x:ui.target[0],y:ui.target[1]});}
 }

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
 function drawMemory(t){const v=tv.view;bg(t);header0();
  const cw=92,ch=62,gap=10,gx=(W-(cw*4+gap*3))/2,gy=56;
  v.faces.forEach((f,i)=>{if(ui.prevFaces[i]!==f){ui.flip.set(i,performance.now());if(f&&!ui.prevFaces[i])tone(520+i*12,.07,'triangle',.04);}ui.prevFaces[i]=f;});
  for(let i=0;i<16;i++){const x=gx+(i%4)*(cw+gap),y=gy+Math.floor(i/4)*(ch+gap),f=v.faces[i],ft=ui.flip.has(i)?Math.min(1,(performance.now()-ui.flip.get(i))/240):1,up=!!f,
    sx=ft<1?Math.abs(Math.cos((up?ft:ft)*Math.PI/2+(up?Math.PI/2:0))):1;
   ctx.save();ctx.translate(x+cw/2,y+ch/2);ctx.scale(Math.max(.05,sx),1);
   if(up){ctx.fillStyle=v.matched[i]?'#4be39b':'#fff8e6';rr(-cw/2,-ch/2,cw,ch,10);ctx.fill();ctx.strokeStyle=INK;ctx.lineWidth=3;ctx.stroke();ctx.font='38px system-ui,"Apple Color Emoji","Segoe UI Emoji",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(f,0,3);}
   else{const g=ctx.createLinearGradient(0,-ch/2,0,ch/2);g.addColorStop(0,'#9b7bff');g.addColorStop(1,'#5a36c4');ctx.fillStyle=g;rr(-cw/2,-ch/2,cw,ch,10);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.stroke();text('★',0,2,{size:28,color:'#ffffffcc',stroke:null});}
   if(ui.cursor===i&&tv.phase==='playing'){ctx.strokeStyle='#fff3a8';ctx.lineWidth=4;rr(-cw/2-3,-ch/2-3,cw+6,ch+6,12);ctx.stroke();}
   ctx.restore();
   if(!up&&tv.phase==='playing')zones.push({x,y,w:cw,h:ch,fn:()=>{ui.cursor=i;send('tableInput',{card:i});}});}
  const el=Math.floor(((v.doneAt||srvNow())-v.start)/1000);
  text(`Pares ${v.pairs}/8   ·   Movimientos ${v.moves}   ·   ${Math.floor(el/60)}:${String(el%60).padStart(2,'0')}`,W/2,H-24,{size:16,color:'#e6dcff'});
  if(tv.phase==='over'){if(!ui.done){ui.done=1;confetti(W/2,H/2,60);tone(880,.3,'triangle',.06);}overlayOver(t,'¡COMPLETADO!',`${v.moves} movimientos · ${Math.floor(el/60)}:${String(el%60).padStart(2,'0')}`,true);}else ui.done=0;}

 // ------------------------------------------------------------ SECUENCIA DE COLORES
 function drawSimon(t){const v=tv.view,now=srvNow();bg(t);header0();
  const pw=190,ph=100,gx=(W-pw*2-16)/2,gy=82;let lit=-1;
  if(v.phase==='show'&&v.seq){const e=now-v.showStart,i=Math.floor(e/v.step);if(e>=0&&i>=0&&i<v.len&&e%v.step<v.step*.72)lit=v.seq[i];if(i!==ui.simonIdx){ui.simonIdx=i;if(lit>=0)tone(PAD_FREQ[lit],.3,'sine',.08);}}
  else ui.simonIdx=-2;
  if(ui.pressed>=0&&performance.now()-ui.pressedAt<220)lit=ui.pressed;
  for(let i=0;i<4;i++){const x=gx+(i%2)*(pw+16),y=gy+Math.floor(i/2)*(ph+16),on=lit===i;
   ctx.shadowColor=PAD_COLORS[i];ctx.shadowBlur=on?34:0;ctx.fillStyle=on?PAD_COLORS[i]:PAD_COLORS[i]+'66';rr(x,y,pw,ph,18);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle=on?'#fff':'#ffffff66';ctx.lineWidth=on?6:3;ctx.stroke();
   text(['1','2','3','4'][i],x+16,y+18,{size:14,color:'#fff',align:'left',stroke:null});
   if(tv.phase==='playing'&&v.phase==='input')zones.push({x,y,w:pw,h:ph,fn:()=>press(i)});}
  const msg=v.phase==='show'?'Memoriza la secuencia…':v.phase==='input'?`Tu turno · ${v.pos}/${v.len}`:'';
  text(`Nivel ${v.level}`,W/2,54,{size:24,color:'#fff3a8'});text(msg,W/2,H-30,{size:18,color:'#e6dcff'});
  if(tv.phase==='over')overlayOver(t,'FIN DEL JUEGO',`Has llegado al nivel ${Math.max(0,v.score)}`,v.score>=5);}
 function press(i){if(tv?.phase!=='playing'||tv.view.phase!=='input')return;ui.pressed=i;ui.pressedAt=performance.now();tone(PAD_FREQ[i],.25,'sine',.08);send('tableInput',{color:i});}

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
   const x=lx+len*clamp(p,0,1),bob=Math.sin(t/70+i)*3;ctx.fillStyle=col(i);ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y-4+bob,17,0,TAU);ctx.fill();ctx.stroke();text(i===s?'TÚ':name(i).slice(0,2).toUpperCase(),x,y-4+bob,{size:11,stroke:null});}
  const cd=v.start-now;
  if(cd>0)text(cd>2400?'3':cd>1600?'2':cd>800?'1':'¡YA!',W/2,H-76,{size:60,color:'#fff3a8'});
  else if(tv.phase==='playing')text('¡Pulsa sin parar! (toca, clic o espacio)',W/2,H-60,{size:18,color:'#fff3a8',stroke:INK});
  if(tv.phase==='over'){const win=v.winner===s;overlayOver(t,win?'¡VICTORIA!':'DERROTA',`${name(v.winner)} llega primero`,win);}}

 const DRAW={hockey:drawHockey,ttt:drawTTT,reflex:drawReflex,memory:drawMemory,simon:drawSimon,race:drawRace};

 // ------------------------------------------------------------ bucle y entrada
 function size(){const r=canvas.getBoundingClientRect();dpr=Math.min(1.5,devicePixelRatio||1);const w=Math.max(2,Math.round(r.width*dpr)),h=Math.max(2,Math.round(r.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  scale=Math.min(canvas.width/W,canvas.height/H);ox=(canvas.width-W*scale)/2;oy=(canvas.height-H*scale)/2;}
 function frame(now){if(dead)return;raf=requestAnimationFrame(frame);const dt=Math.min(.1,(now-lastDraw)/1000);lastDraw=now;size();
  ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#120a2e';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.setTransform(scale,0,0,scale,ox,oy);ctx.save();ctx.beginPath();ctx.rect(0,0,W,H);ctx.clip();zones=[];
  if(!tv)bg(now);else if(tv.phase==='waiting'||!tv.view)drawWaiting(now);else{try{DRAW[tv.game](now,dt);}catch(e){console.error('PUCELA US · mesa:',e);}}
  drawFx(dt);ctx.restore();}
 function toLogical(e){const r=canvas.getBoundingClientRect(),d=canvas.width/r.width;return [((e.clientX-r.left)*d-ox)/scale,((e.clientY-r.top)*d-oy)/scale];}
 function onDown(e){e.preventDefault();canvas.focus({preventScroll:true});if(tv?.game==='hockey'){try{canvas.setPointerCapture(e.pointerId);}catch{}}const [x,y]=toLogical(e);if(tv?.game==='hockey'&&tv.phase==='playing'){const f=hockeyFieldPoint(x,y);ui.target=f;}
  for(let i=zones.length-1;i>=0;i--){const z=zones[i];if(x>=z.x&&x<=z.x+z.w&&y>=z.y&&y<=z.y+z.h){z.fn();break;}}}
 function onMove(e){if(tv?.game!=='hockey'||tv.phase!=='playing')return;const [x,y]=toLogical(e);ui.target=hockeyFieldPoint(x,y);}
 const KEYMAP={ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right',ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down'};
 function onKey(e){if(!tv)return;const down=e.type==='keydown',k=e.key;
  if(tv.game==='hockey'){const m=KEYMAP[k];if(m){e.preventDefault();down?keys.add(m):keys.delete(m);}return;}
  if(!down)return;
  if(tv.game==='ttt'||tv.game==='memory'){const n=tv.game==='ttt'?3:4,total=n*n;let c=ui.cursor;const m=KEYMAP[k];
   if(m){e.preventDefault();const x=c%n,y=Math.floor(c/n);c=m==='left'?y*n+(x+n-1)%n:m==='right'?y*n+(x+1)%n:m==='up'?((y+n-1)%n)*n+x:((y+1)%n)*n+x;ui.cursor=c;}
   else if(k==='Enter'||k===' '){e.preventDefault();if(tv.phase==='playing')send('tableInput',tv.game==='ttt'?{cell:c}:{card:c});}
   return;}
  if(tv.game==='reflex'&&(k===' '||k==='Enter')){e.preventDefault();reflexTap();return;}
  if(tv.game==='race'&&(k===' '||k==='Enter'||k.startsWith('Arrow')||/^[a-zA-Z]$/.test(k))){e.preventDefault();raceTap();return;}
  if(tv.game==='simon'){const i='1234'.indexOf(k);const j='qwas'.indexOf(k.toLowerCase());const idx=i>=0?i:j;if(idx>=0){e.preventDefault();press(idx);}}}
 canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointermove',onMove);
 canvas.addEventListener('keydown',onKey);canvas.addEventListener('keyup',onKey);
 canvas.style.touchAction='none';canvas.tabIndex=0;
 raf=requestAnimationFrame(frame);
 setTimeout(()=>canvas.focus({preventScroll:true}),50);
 return {
  update(view){if(!view||tv?.id===view.id&&view.serverTime<tv.serverTime)return;const first=!tv;const phaseChanged=tv&&tv.phase!==view.phase;tv=view;recvAt=performance.now();offset=view.serverTime-Date.now();
   if(first||phaseChanged&&view.phase==='playing'){ui.target=view.seat===0?[70,120]:[330,120];ui.own=[...ui.target];ui.opp=null;ui.puck=null;ui.sentTarget=null;ui.prevScore=[0,0];ui.localTaps=0;ui.pendingTaps=0;ui.mark.clear();ui.prevFaces=[];ui.flip.clear();ui.cursor=0;}
   if(phaseChanged&&view.phase==='over'&&view.winner===view.seat&&view.game!=='memory')confetti(W/2,H/2,70);},
  destroy(){dead=true;cancelAnimationFrame(raf);canvas.removeEventListener('pointerdown',onDown);canvas.removeEventListener('pointermove',onMove);canvas.removeEventListener('keydown',onKey);canvas.removeEventListener('keyup',onKey);},
 };
}
