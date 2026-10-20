// Cliente de las mesas de juego de la sala de espera.
// Dibuja la partida que el servidor mantiene (`state.table`) y envía las acciones del jugador.
// Teclado, ratón y táctil comparten los mismos controles; no depende del DOM salvo del lienzo.
const W=640,H=400,TAU=Math.PI*2;
const C0='#ff7a6b',C1='#5fd0ff',INK='#2a1763',VIOLET='#7c4dff';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const PAD_COLORS=['#ff5a6b','#ffe45f','#4be39b','#4aa8ff'],PAD_FREQ=[262,330,392,523];

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
  text(`Ronda ${Math.min(v.round+1,v.rounds)} / ${v.rounds}`,W/2,48,{size:14,color:'#d9c9ff',stroke:null});
  dartBoard();
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
   const x=lx+len*clamp(p,0,1),bob=Math.sin(t/70+i)*3;ctx.fillStyle=col(i);ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y-4+bob,17,0,TAU);ctx.fill();ctx.stroke();text(i===s?'TÚ':name(i).slice(0,2).toUpperCase(),x,y-4+bob,{size:11,stroke:null});}
  const cd=v.start-now;
  if(cd>0)text(cd>2400?'3':cd>1600?'2':cd>800?'1':'¡YA!',W/2,H-76,{size:60,color:'#fff3a8'});
  else if(tv.phase==='playing')text('¡Pulsa sin parar! (toca, clic o espacio)',W/2,H-60,{size:18,color:'#fff3a8',stroke:INK});
  if(tv.phase==='over'){const win=v.winner===s;overlayOver(t,win?'¡VICTORIA!':'DERROTA',`${name(v.winner)} llega primero`,win);}}

 const DRAW={darts:drawDarts,ttt:drawTTT,reflex:drawReflex,memory:drawMemory,simon:drawSimon,race:drawRace,football:drawFootball};

 // ------------------------------------------------------------ bucle y entrada
 function size(){const r=canvas.getBoundingClientRect();dpr=Math.min(1.5,devicePixelRatio||1);const w=Math.max(2,Math.round(r.width*dpr)),h=Math.max(2,Math.round(r.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  scale=Math.min(canvas.width/W,canvas.height/H);ox=(canvas.width-W*scale)/2;oy=(canvas.height-H*scale)/2;}
 function frame(now){if(dead)return;raf=requestAnimationFrame(frame);const dt=Math.min(.1,(now-lastDraw)/1000);lastDraw=now;size();
  ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#120a2e';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.setTransform(scale,0,0,scale,ox,oy);ctx.save();ctx.beginPath();ctx.rect(0,0,W,H);ctx.clip();zones=[];
  if(!tv)bg(now);else if(tv.phase==='waiting'||!tv.view)drawWaiting(now);else{try{DRAW[tv.game](now,dt);}catch(e){console.error('PUCELA US · mesa:',e);}}
  drawFx(dt);ctx.restore();}
 function toLogical(e){const r=canvas.getBoundingClientRect(),d=canvas.width/r.width;return [((e.clientX-r.left)*d-ox)/scale,((e.clientY-r.top)*d-oy)/scale];}
 function onDown(e){e.preventDefault();canvas.focus({preventScroll:true});const [x,y]=toLogical(e);
  for(let i=zones.length-1;i>=0;i--){const z=zones[i];if(x>=z.x&&x<=z.x+z.w&&y>=z.y&&y<=z.y+z.h){if(z.drag){fb.drag=e.pointerId;try{canvas.setPointerCapture(e.pointerId);}catch{}fbAim(x,y);}else z.fn();break;}}}
 function fbAim(x,y){const v=tv?.view;if(!v||tv.game!=='football')return;const me=fb.pred||v.pl.find(q=>q.id===tv.me);if(!me)return;const dx=(x-FX)/FK-me.x,dy=(y-FY)/FK-me.y,l=Math.hypot(dx,dy);fb.dir=l<10?{x:0,y:0}:{x:Math.abs(dx)/l>.38?Math.sign(dx):0,y:Math.abs(dy)/l>.38?Math.sign(dy):0};fbSend(true);}
 function onMove(e){if(fb.drag!==e.pointerId||fb.drag==null)return;const [x,y]=toLogical(e);fbAim(x,y);}
 function onUp(e){if(fb.drag!==e.pointerId)return;fb.drag=null;fb.dir={x:0,y:0};fbSend(true);}
 const KEYMAP={ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right',ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down'};
 const held=new Set();
 function onKey(e){if(!tv)return;const down=e.type==='keydown',k=e.key;
  if(tv.game==='football'){const key=k.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(key)){e.preventDefault();if(down)fb.keys.add(key);else fb.keys.delete(key);fbDirFromKeys();return;}if(key===' '||key==='enter'){e.preventDefault();if(down&&!e.repeat)fbKick();return;}return;}
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
 // ------------------------------------------------------------ FÚTBOL DE FICHAS (16.2)
let FX=20,FY=50,FK=1;const TEAM=['#3c8cff','#ff5a6b'],TEAMN=['AZUL','ROJO'];const fb={dir:{x:0,y:0},sentAt:0,keys:new Set(),pred:null,drag:null};
 function fbSend(force=false){const d=fb.dir;if(force||performance.now()-fb.sentAt>140||d.x!==fb.lastX||d.y!==fb.lastY){fb.sentAt=performance.now();fb.lastX=d.x;fb.lastY=d.y;send('tableInput',{x:d.x,y:d.y});}}
 function fbKick(){if(tv?.game!=='football')return;send('tableInput',{kick:1});tone(240,.06,'square',.05);ui.kickFlash=performance.now();}
 function fbDirFromKeys(){const k=fb.keys;fb.dir={x:(k.has('arrowright')||k.has('d')?1:0)-(k.has('arrowleft')||k.has('a')?1:0),y:(k.has('arrowdown')||k.has('s')?1:0)-(k.has('arrowup')||k.has('w')?1:0)};fbSend(true);}
 function drawFootball(t,dt){const v=tv.view;FK=Math.min(1,(H-104)/v.h,(W-40)/v.w);FX=(W-v.w*FK)/2;FY=46;const me=v.pl.find(q=>q.id===tv.me),age=Math.min(.15,(performance.now()-recvAt)/1000),paused=srvNow()<v.pauseUntil;bg(t);
  text(TEAMN[0]+' '+v.score[0],W/2-70,26,{size:22,color:TEAM[0]});text('–',W/2,26,{size:22});text(v.score[1]+' '+TEAMN[1],W/2+70,26,{size:22,color:TEAM[1]});
  ctx.save();ctx.translate(FX,FY);ctx.scale(FK,FK);
  ctx.fillStyle='#2f8f4e';rr(0,0,v.w,v.h,10);ctx.fill();for(let i=0;i<6;i++){if(i%2)continue;ctx.fillStyle='#ffffff10';ctx.fillRect(i*v.w/6,0,v.w/6,v.h);}
  ctx.strokeStyle='#ffffffcc';ctx.lineWidth=3;rr(0,0,v.w,v.h,10);ctx.stroke();ctx.beginPath();ctx.moveTo(v.w/2,0);ctx.lineTo(v.w/2,v.h);ctx.stroke();ctx.beginPath();ctx.arc(v.w/2,v.h/2,46,0,TAU);ctx.stroke();
  for(const side of [0,1]){const gx=side?v.w:0;ctx.fillStyle=TEAM[side]+'66';ctx.fillRect(side?gx:gx-12,v.mouth[0],12,v.mouth[1]-v.mouth[0]);ctx.strokeStyle='#fff';ctx.strokeRect(side?gx-60:gx,v.mouth[0]-20,60,v.mouth[1]-v.mouth[0]+40);}
  // Predicción local de la propia ficha (se corrige hacia la del servidor).
  if(me){if(!fb.pred||Math.hypot(fb.pred.x-me.x,fb.pred.y-me.y)>60)fb.pred={x:me.x,y:me.y};const l=Math.hypot(fb.dir.x,fb.dir.y)||1;fb.pred.x=Math.max(v.pr,Math.min(v.w-v.pr,fb.pred.x+fb.dir.x/l*v.speed*dt));fb.pred.y=Math.max(v.pr,Math.min(v.h-v.pr,fb.pred.y+fb.dir.y/l*v.speed*dt));const target={x:me.x+fb.dir.x/l*v.speed*age,y:me.y+fb.dir.y/l*v.speed*age};fb.pred.x+=(target.x-fb.pred.x)*.18;fb.pred.y+=(target.y-fb.pred.y)*.18;}
  const bx=v.ball.x+(paused?0:v.ball.vx*age),by=v.ball.y+(paused?0:v.ball.vy*age);
  for(const q of v.pl){const mine=q.id===tv.me,l=Math.hypot(q.ix,q.iy)||1,px=mine&&fb.pred?fb.pred.x:q.x+q.ix/l*v.speed*age,py=mine&&fb.pred?fb.pred.y:q.y+q.iy/l*v.speed*age,kicking=srvNow()-q.kickAt<180;
   ctx.fillStyle='#0004';ctx.beginPath();ctx.ellipse(px+2,py+4,v.pr,v.pr*.6,0,0,TAU);ctx.fill();ctx.fillStyle=TEAM[q.team];ctx.strokeStyle=mine?'#fff3a8':'#fff';ctx.lineWidth=mine?4:2.5;ctx.beginPath();ctx.arc(px,py,v.pr+(kicking?3:0),0,TAU);ctx.fill();ctx.stroke();
   text(mine?'TÚ':q.name.slice(0,8),px,py-v.pr-9,{size:11,stroke:INK,sw:3});}
  ctx.fillStyle='#fff';ctx.strokeStyle='#111';ctx.lineWidth=2;ctx.beginPath();ctx.arc(bx,by,v.br,0,TAU);ctx.fill();ctx.stroke();ctx.fillStyle='#111';ctx.beginPath();ctx.arc(bx,by,v.br*.38,0,TAU);ctx.fill();
  if(v.goal&&srvNow()<v.goal.until){ctx.fillStyle='#120a2ecc';ctx.fillRect(0,v.h/2-40,v.w,80);text('¡GOOOL '+TEAMN[v.goal.team]+'!',v.w/2,v.h/2-6,{size:34,color:TEAM[v.goal.team]});if(v.goal.by)text(v.goal.by,v.w/2,v.h/2+24,{size:14,color:'#fff'});if(ui.lastGoal!==v.goal.at){ui.lastGoal=v.goal.at;confetti(W/2,H/2,40);tone(880,.3,'triangle',.06);}}
  ctx.restore();
  if(me)text(`Equipo ${TEAMN[me.team]} · flechas para moverte · ESPACIO para chutar`,W/2,H-30,{size:12,color:'#e6dcff',stroke:null,base:'bottom'});
  // Táctil: arrastra en el campo para moverte; botón de chute abajo a la derecha.
  zones.push({x:FX,y:FY,w:v.w*FK,h:v.h*FK,fn:null,drag:true});button('CHUTAR',W-118,H-52,100,42,fbKick,{fill:ui.kickFlash&&performance.now()-ui.kickFlash<150?'#ffd36b':'#c9505a'});button('Salir',18,H-52,80,42,()=>close(),{fill:'#4a3a8c'});
  fbSend();}

 canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointermove',onMove);canvas.addEventListener('pointerup',onUp);canvas.addEventListener('pointercancel',onUp);
 canvas.addEventListener('keydown',onKey);canvas.addEventListener('keyup',onKey);
 canvas.style.touchAction='none';canvas.tabIndex=0;
 raf=requestAnimationFrame(frame);
 setTimeout(()=>canvas.focus({preventScroll:true}),50);
 return {
  update(view){if(tv&&view&&tv.id===view.id&&view.serverTime<tv.serverTime)return;const first=!tv;const phaseChanged=tv&&tv.phase!==view.phase;tv=view;recvAt=performance.now();offset=view.serverTime-Date.now();
   if(first||phaseChanged&&view.phase==='playing'){ui.prevScore=[0,0];ui.localTaps=0;ui.pendingTaps=0;ui.mark.clear();ui.prevFaces=[];ui.flip.clear();ui.cursor=0;}
   if(phaseChanged&&view.phase==='over'&&view.winner===view.seat&&view.game!=='memory')confetti(W/2,H/2,70);},
  destroy(){dead=true;cancelAnimationFrame(raf);canvas.removeEventListener('pointerdown',onDown);canvas.removeEventListener('pointermove',onMove);canvas.removeEventListener('keydown',onKey);canvas.removeEventListener('keyup',onKey);},
 };
}
