// Mesas de la caravana: seis minijuegos con sesiones independientes en el servidor.
// Cada partida (o pareja de jugadores) es una sesión propia; una misma mesa admite varias a la vez.
// Todo vive en `room.tables` (JSON plano) y se cierra al empezar la partida principal.
export const TABLE_GAMES={
 darts:{label:'Dardos',players:2},
 ttt:{label:'Tres en raya',players:2},
 reflex:{label:'Duelo de reflejos',players:2},
 memory:{label:'Memoria de cartas',players:2},
 simon:{label:'Secuencia de colores',players:2},
 race:{label:'Carrera de pulsaciones',players:2},
 football:{label:'Fútbol de fichas',players:99,open:true},
 boxing:{label:'Boxeo',players:99,open:true},
};
import {FB,fbMovePlayer,fbStepBall,fbKick,fbCollidePlayers,BX,bxMove,bxSeparate} from '../public/football.js';
export const TABLE_IDLE_MS=12000;
// 16.2 · Rival bot en todas las mesas: fácil, medio o difícil. Juega en el servidor
// con las mismas reglas (y validaciones) que una persona.
export const BOT_LEVELS={easy:'Fácil',medium:'Medio',hard:'Difícil'};
const isBot=q=>!!q?.bot;      // sin pulsos durante este tiempo = abandono
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const rnd=n=>Math.floor(Math.random()*n);
export const hooks={Err:Error};   // el motor inyecta su GameError (evita importar el motor desde aquí)
function bad(msg){return new hooks.Err(msg);}

// ----------------------------------------------------------------- Dardos
// Primera pulsación: fija la altura (un indicador sube y baja). Segunda: fija
// la posición horizontal. El dardo cae justo en ese punto y el servidor puntúa
// como una diana real (sectores, dobles, triples y diana). Tres dardos por
// turno, dos rondas. El instante de cada pulsación lo valida el servidor.
export const DARTS={darts:3,rounds:2,py:1700,px:1300,fly:650,lead:900,window:250,lag:700};
const DART_NUMS=[20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];
export const dartOsc=(t,start,period)=>{if(t<start)return -1;const u=((t-start)/period)%1;return u<.5?-1+4*u:3-4*u;};
export function dartScore(x,y){const r=Math.hypot(x,y);if(r>1)return {points:0,label:'Fuera'};if(r<=.06)return {points:50,label:'Diana'};if(r<=.13)return {points:25,label:'Bull 25'};
 const deg=(Math.atan2(x,-y)*180/Math.PI+360+9)%360,base=DART_NUMS[Math.floor(deg/18)%20],mult=r>=.53&&r<=.6?3:r>=.92?2:1;return {points:base*mult,label:(mult===3?'Triple ':mult===2?'Doble ':'')+base};}
function dartsInit(now,first=0){return {first,turn:first,dart:0,round:0,stage:'y',aimStart:now+DARTS.lead,ay:0,throws:[[],[]],scores:[0,0],flyUntil:0,last:null,winner:-1,draw:false};}
function dartsInput(s,seat,d,now){if(s.winner>=0||s.draw||seat!==s.turn||now<s.aimStart||!['y','x'].includes(s.stage))return;
 // El instante declarado vale si cae entre la latencia razonable (≤700 ms atrás) y
 // un pequeño adelanto de reloj; fuera de esa ventana se usa el del servidor.
 let t=Number(d.t);if(!Number.isFinite(t)||t>now+DARTS.window||t<now-DARTS.lag)t=now;t=Math.max(t,s.aimStart);
 if(s.stage==='y'){s.ay=Math.round(dartOsc(t,s.aimStart,DARTS.py)*1000)/1000;s.stage='x';s.aimStart=t;return;}
 const x=Math.round(dartOsc(t,s.aimStart,DARTS.px)*1000)/1000,sc=dartScore(x,s.ay),hit={x,y:s.ay,...sc};
 s.throws[s.turn].push(hit);s.scores[s.turn]+=sc.points;s.last={...hit,seat:s.turn,at:now};s.stage='fly';s.flyUntil=now+DARTS.fly;}
function dartsTick(s,now){if(s.stage!=='fly'||now<s.flyUntil)return;s.dart++;
 if(s.dart<DARTS.darts){s.stage='y';s.aimStart=now+250;return;}
 s.dart=0;if(s.turn!==(s.first||0))s.round++;s.turn=1-s.turn;
 if(s.round>=DARTS.rounds){s.stage='done';if(s.scores[0]===s.scores[1])s.draw=true;else s.winner=s.scores[0]>s.scores[1]?0:1;return;}
 s.stage='y';s.aimStart=now+DARTS.lead;}
const dartsView=s=>({turn:s.turn,dart:s.dart,round:s.round,rounds:DARTS.rounds,darts:DARTS.darts,stage:s.stage,aimStart:s.aimStart,py:DARTS.py,px:DARTS.px,ay:s.ay,throws:s.throws,scores:s.scores,last:s.last,flyUntil:s.flyUntil,winner:s.winner,draw:s.draw});

// ----------------------------------------------------------------- Tres en raya
const LINES=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const tttInit=(now,first=0)=>({board:Array(9).fill(-1),turn:first,winner:-1,line:null,draw:false,wins:[0,0,0]});
function tttInput(s,seat,d){if(s.winner>=0||s.draw)return;if(seat!==s.turn)throw bad('No es tu turno.');const c=Math.floor(num(d.cell));if(c<0||c>8||s.board[c]!==-1)throw bad('Esa casilla está ocupada.');s.board[c]=seat;
 const line=LINES.find(l=>l.every(i=>s.board[i]===seat));if(line){s.winner=seat;s.line=line;}else if(s.board.every(v=>v!==-1))s.draw=true;else s.turn=1-seat;}
const tttView=s=>({board:s.board,turn:s.turn,winner:s.winner,line:s.line,draw:s.draw});

// ----------------------------------------------------------------- Duelo de reflejos
const RX={to:3};
const reflexInit=now=>({wins:[0,0],round:1,phase:'wait',goAt:now+1800+rnd(2400),resultUntil:0,roundWinner:-1,falseStart:-1,ms:null,winner:-1});
function reflexTick(s,now){
 if(s.winner>=0)return;
 if(s.phase==='wait'&&now>=s.goAt)s.phase='go';
 if(s.phase==='result'&&now>=s.resultUntil){s.round++;s.phase='wait';s.goAt=now+1600+rnd(2600);s.roundWinner=-1;s.falseStart=-1;s.ms=null;}
}
function reflexInput(s,seat,d,now){
 if(s.winner>=0||s.phase==='result')return;
 let w;if(s.phase==='wait'){s.falseStart=seat;w=1-seat;s.ms=null;}else{w=seat;s.ms=Math.max(0,now-s.goAt);}
 s.roundWinner=w;s.wins[w]++;s.phase='result';s.resultUntil=now+1700;if(s.wins[w]>=RX.to)s.winner=w;
}
const reflexView=s=>({wins:s.wins,round:s.round,phase:s.phase,roundWinner:s.roundWinner,falseStart:s.falseStart,ms:s.ms,winner:s.winner,to:RX.to});

// ----------------------------------------------------------------- Memoria de cartas
const FACES=['🍎','🚌','⭐','🎧','🌙','🐟','🎲','🔔'];
function memoryInit(now,first=0,two=false){const deck=[...FACES,...FACES];for(let i=deck.length-1;i>0;i--){const j=rnd(i+1);[deck[i],deck[j]]=[deck[j],deck[i]];}return {deck,up:[],matched:Array(16).fill(false),owner:Array(16).fill(-1),hideAt:0,moves:0,start:now,doneAt:0,two,turn:first,scores:[0,0]};}
// A dos jugadores: por turnos. Acertar una pareja suma un punto y repites; fallar pasa el turno.
function memoryTick(s,now){if(s.hideAt&&now>=s.hideAt){s.up=[];s.hideAt=0;if(s.two)s.turn=1-s.turn;}}
function memoryInput(s,seat,d,now){memoryTick(s,now);if(s.doneAt||s.two&&seat!==s.turn)return;const c=Math.floor(num(d.card));if(c<0||c>15||s.matched[c]||s.up.includes(c)||s.up.length>=2)return;
 s.up.push(c);if(s.up.length===2){s.moves++;const [a,b]=s.up;if(s.deck[a]===s.deck[b]){s.matched[a]=s.matched[b]=true;s.owner[a]=s.owner[b]=seat;s.scores[seat]=(s.scores[seat]||0)+1;s.up=[];if(s.matched.every(Boolean))s.doneAt=now;}else s.hideAt=now+850;}}
const memoryWinner=s=>!s.two?0:s.scores[0]===s.scores[1]?-1:s.scores[0]>s.scores[1]?0:1;
const memoryView=s=>({faces:s.deck.map((f,i)=>s.matched[i]||s.up.includes(i)?f:null),matched:s.matched,owner:s.owner,moves:s.moves,start:s.start,doneAt:s.doneAt,pairs:s.matched.filter(Boolean).length/2,two:s.two,turn:s.turn,scores:s.scores,hiding:!!s.hideAt,winner:s.doneAt?memoryWinner(s):-1,draw:!!s.doneAt&&s.two&&memoryWinner(s)<0});

// ----------------------------------------------------------------- Secuencia de colores
const SM={step:650,lead:700,think:4500,per:900};
// A dos jugadores: los dos repiten la MISMA secuencia a la vez. Quien falle (o se quede
// sin tiempo) pierde; si los dos la completan, se añade un color y sigue la ronda.
function simonShow(s,now){s.phase='show';s.pos=0;s.pp=[0,0];s.done=[false,false];s.showStart=now+SM.lead;s.showUntil=s.showStart+s.seq.length*SM.step+300;s.inputUntil=s.showUntil+SM.think+s.seq.length*SM.per;}
function simonInit(now,first=0,two=false){const s={seq:[rnd(4)],phase:'show',pos:0,pp:[0,0],done:[false,false],showStart:0,showUntil:0,inputUntil:0,level:1,best:0,over:false,two,winner:-1,draw:false};simonShow(s,now);return s;}
function simonEnd(s,winner){s.phase='over';s.over=true;s.best=s.level-1;s.winner=winner;s.draw=winner<0;}
function simonTick(s,now){if(s.phase==='show'&&now>=s.showUntil)s.phase='input';
 if(s.two&&s.phase==='input'&&now>=s.inputUntil){const late=[0,1].filter(i=>!s.done[i]);if(late.length)simonEnd(s,late.length===2?-1:1-late[0]);}}
function simonInput(s,seat,d,now){simonTick(s,now);if(s.phase!=='input'||s.two&&s.done[seat])return;const c=Math.floor(num(d.color));if(c<0||c>3)return;
 const pos=s.two?s.pp[seat]:s.pos;
 if(c!==s.seq[pos]){if(s.two)simonEnd(s,1-seat);else{s.phase='over';s.over=true;s.best=s.level-1;}return;}
 if(s.two){s.pp[seat]++;if(s.pp[seat]>=s.seq.length)s.done[seat]=true;if(s.done[0]&&s.done[1]){s.level++;s.seq.push(rnd(4));simonShow(s,now);}return;}
 s.pos++;if(s.pos>=s.seq.length){s.level++;s.seq.push(rnd(4));simonShow(s,now);}}
const simonView=s=>({phase:s.phase,level:s.level,pos:s.pos,pp:s.pp,done:s.done,two:s.two,len:s.seq.length,showStart:s.showStart,inputUntil:s.inputUntil,step:SM.step,seq:s.phase==='show'?s.seq:null,score:s.over?s.best:null,winner:s.winner,draw:s.draw});

// ----------------------------------------------------------------- Carrera de pulsaciones
const RC={goal:40,gap:60,count:3200};
const raceInit=now=>({pos:[0,0],last:[0,0],start:now+RC.count,winner:-1});
// Crédito de pulsaciones: cada RC.gap ms se gana una; los lotes no se pierden por llegar
// juntos (antes un envío a los 55 ms se descartaba entero y el corredor «tironeaba»).
function raceInput(s,seat,d,now){if(s.winner>=0||now<s.start)return;const want=Math.max(1,Math.min(6,Math.floor(Number(d.n)||1))),base=Math.max(s.last[seat],s.start-RC.gap,now-6*RC.gap),allowed=Math.floor((now-base)/RC.gap);const n=Math.min(want,allowed);if(n<1)return;s.last[seat]=base+n*RC.gap;s.pos[seat]=Math.min(RC.goal,s.pos[seat]+n);if(s.pos[seat]>=RC.goal){s.winner=seat;s.endAt=now;}}
const raceView=s=>({pos:s.pos,goal:RC.goal,start:s.start,winner:s.winner});


// ----------------------------------------------------------------- Fútbol de fichas (16.2)
// Campo 2D con jugadores ilimitados. Al entrar te toca equipo alterno (azul, rojo, azul…).
// Te mueves con las flechas; con ESPACIO chutas si tocas el balón: sale en la dirección
// que va de tu ficha al balón (desde dónde le das), algo corregida por hacia dónde vas.
function fbSpawn(st,id,name){const n=st.joins++,team=n%2,mates=Object.values(st.pl).filter(q=>q.team===team).length;st.pl[id]={id,name,team,x:team?FB.w*.72:FB.w*.28,y:FB.h/2+((mates%5)-2)*48,ix:0,iy:0,vx:0,vy:0,kickReady:0,kickAt:0};}
function fbReset(st){st.ball={x:FB.w/2,y:FB.h/2,vx:0,vy:0};}
function footballInit(now){const st={pl:{},joins:0,score:[0,0],last:now,pauseUntil:now+800,goal:null,touch:null};fbReset(st);return st;}
function footballInput(st,seat,d,now,id){const q=st.pl[id];if(!q)return;
 if('x' in d||'y' in d){q.ix=clamp(Math.round(num(d.x)),-1,1);q.iy=clamp(Math.round(num(d.y)),-1,1);}
 if(d.kick&&now>=q.kickReady){q.kickReady=now+200;if(now>=st.pauseUntil&&fbKick(st.ball,q)){q.kickAt=now;st.touch=id;}}}
function footballTick(st,now){const dt=Math.min(.1,Math.max(0,(now-st.last)/1000));st.last=now;if(!dt)return;
 const players=Object.values(st.pl);for(const q of players)fbMovePlayer(q,dt);fbCollidePlayers(players);
 if(now<st.pauseUntil){if(st.goal&&now>=st.goal.until)st.goal=null;return;}
 const team=fbStepBall(st.ball,players,dt,q=>{st.touch=q.id;});
 if(team>=0){st.score[team]++;st.goal={team,at:now,until:now+FB.pause,by:st.pl[st.touch]?.name||''};st.pauseUntil=now+FB.pause;fbReset(st);for(const q of players){q.x=q.team?FB.w*.72:FB.w*.28;q.vx=0;q.vy=0;}}}
const r1=v=>Math.round(v*10)/10;
const footballView=st=>({w:FB.w,h:FB.h,pr:FB.pr,br:FB.br,mouth:FB.mouth,score:st.score,ball:{x:r1(st.ball.x),y:r1(st.ball.y),vx:r1(st.ball.vx),vy:r1(st.ball.vy)},pl:Object.values(st.pl).map(q=>({id:q.id,name:q.name,team:q.team,x:r1(q.x),y:r1(q.y),vx:r1(q.vx||0),vy:r1(q.vy||0),ix:q.ix,iy:q.iy,kickAt:q.kickAt})),pauseUntil:st.pauseUntil,goal:st.goal,speed:FB.speed,touch:st.touch});

// ----------------------------------------------------------------- Boxeo (16.7)
// Equipos rojo/azul alternos. ATACAR (golpe rápido), DEFENDER (mantén: casi no recibes daño
// de frente, pero te mueves lento) y ULTI (carga con los golpes: manda al rival al otro extremo).
// Quien se queda sin vida reaparece, el equipo contrario suma 1 punto y TODOS recuperan un 25 %.
const BXN=['Saco','Sparring'];
const bxPos=(team,k=0)=>({x:team?BX.w-90:90,y:BX.h/2+((k%5)-2)*34});
function bxHumans(st,team){return Object.values(st.pl).filter(q=>!q.bot&&q.team===team).length;}
function bxBots(st){for(const team of [0,1]){const h=bxHumans(st,team),other=bxHumans(st,1-team),bots=Object.values(st.pl).filter(q=>q.bot&&q.team===team);
  if(h>0){for(const b of bots)delete st.pl[b.id];}
  else if(other>0&&!bots.length){const id='boxbot-'+team;st.pl[id]=bxFighter(id,BXN[team],team,true);}
  else if(!other)for(const b of bots)delete st.pl[b.id];}}
function bxFighter(id,name,team,bot=false){const k=Math.floor(Math.random()*5),ps=bxPos(team,k);return {id,name,team,bot,x:ps.x,y:ps.y,ix:0,iy:0,vx:0,vy:0,face:team?-1:1,hp:BX.hp,ult:0,block:false,atkReady:0,atkAt:0,ultAt:0,hitAt:0,stunUntil:0,inv:0,fly:0,flyUntil:0,blocked:0,think:0,blockUntil:0};}
function bxSpawn(st,id,name){const team=st.joins++%2;st.pl[id]=bxFighter(id,name,team);st.pl[id].inv=st.last+1200;bxBots(st);}
function boxingInit(now){return {pl:{},joins:0,score:[0,0],last:now,ko:null};}
function bxOpp(st,q,reach,depth){let best=null,bd=1e9;for(const t of Object.values(st.pl)){if(t.team===q.team||t.hp<=0)continue;const dx=(t.x-q.x)*q.face,dy=Math.abs(t.y-q.y);if(dx<-8||dx>reach||dy>depth)continue;if(dx<bd){bd=dx;best=t;}}return best;}
function bxNearest(st,q){let best=null,bd=1e9;for(const t of Object.values(st.pl)){if(t.team===q.team)continue;const d=Math.hypot(t.x-q.x,(t.y-q.y)*1.5);if(d<bd){bd=d;best=t;}}return best;}
function bxHurt(st,t,dmg,by,now){if(now<t.inv)return;t.hp-=dmg;t.hitAt=now;t.ult=Math.min(100,t.ult+6);
 if(t.hp>0)return;
 st.score[1-t.team]++;st.ko={at:now,team:t.team,name:t.name,by:by?.name||''};
 for(const q of Object.values(st.pl))q.hp=Math.min(BX.hp,q.hp+BX.heal);
 const ps=bxPos(t.team,Math.floor(Math.random()*5));Object.assign(t,{hp:BX.hp,x:ps.x,y:ps.y,vx:0,vy:0,fly:0,stunUntil:0,inv:now+BX.inv,block:false,ult:0});}
function bxStrike(st,q,now,ult){const f=(t0)=>{if(t0)q.face=Math.sign(t0.x-q.x)||q.face;};
 let t=bxOpp(st,q,ult?BX.ultReach:BX.reach,ult?BX.ultDepth:BX.depth);if(!t){const n=bxNearest(st,q);if(n&&Math.abs(n.x-q.x)<(ult?BX.ultReach:BX.reach)+10&&Math.abs(n.y-q.y)<(ult?BX.ultDepth:BX.depth)){q.face=Math.sign(n.x-q.x)||q.face;t=bxOpp(st,q,ult?BX.ultReach:BX.reach,ult?BX.ultDepth:BX.depth);}}
 if(ult&&!t)return false;f(null);
 q.atkAt=now;if(ult){q.ultAt=now;q.ult=0;}
 if(!t)return true;
 if(now<t.inv)return true;
 const guarded=t.block&&t.face*q.face<0&&now>=t.stunUntil;
 if(ult){bxHurt(st,t,guarded?6:BX.ultDmg,q,now);t.fly=q.face;t.flyUntil=now+BX.flyMs;t.stunUntil=now+BX.flyMs+350;t.block=false;t.vx=0;t.vy=0;return true;}
 if(guarded){bxHurt(st,t,BX.blockDmg,q,now);q.blocked=now;q.ult=Math.min(100,q.ult+4);t.vx+=q.face*60;}
 else{bxHurt(st,t,BX.dmg,q,now);q.ult=Math.min(100,q.ult+14);t.stunUntil=Math.max(t.stunUntil,now+170);t.vx+=q.face*190;}
 return true;}
function boxingInput(st,seat,d,now,id){const q=st.pl[id];if(!q||q.hp<=0)return;
 if('x' in d||'y' in d){q.ix=clamp(Math.round(num(d.x)),-1,1);q.iy=clamp(Math.round(num(d.y)),-1,1);}
 if('block' in d)q.block=!!d.block&&now>=q.stunUntil;
 if(now<q.stunUntil)return;
 if(q.ix&&!q.block)q.face=q.ix;
 if(d.atk&&!q.block&&now>=q.atkReady){q.atkReady=now+BX.cd;bxStrike(st,q,now,false);}
 if(d.ult&&q.ult>=100&&!q.block&&now>=q.atkReady){if(bxStrike(st,q,now,true))q.atkReady=now+BX.ultCd;}}
function bxBrain(st,q,now){if(now<q.stunUntil||q.fly)return;const e=bxNearest(st,q);if(!e){q.ix=q.iy=0;return;}
 const dx=e.x-q.x,dy=e.y-q.y,close=Math.abs(dx)<BX.reach*.85&&Math.abs(dy)<BX.depth*.8;
 q.ix=close?0:Math.abs(dx)>BX.reach*.8?Math.sign(dx):0;q.iy=Math.abs(dy)>10?Math.sign(dy):0;if(dx)q.face=Math.sign(dx);
 if(q.block&&now>q.blockUntil)q.block=false;
 if(now>=q.think){q.think=now+260+Math.random()*260;
  if(e.atkAt&&now-e.atkAt<300&&close&&Math.random()<.35){q.block=true;q.blockUntil=now+420;}
  else if(close&&!q.block&&now>=q.atkReady){if(q.ult>=100)boxingInput(st,0,{ult:1},now,q.id);else boxingInput(st,0,{atk:1},now,q.id);}}}
function boxingTick(st,now){const dt=Math.min(.1,Math.max(0,(now-st.last)/1000));st.last=now;if(!dt)return;
 const all=Object.values(st.pl);for(const q of all)if(q.bot)bxBrain(st,q,now);
 for(const q of all){
  if(q.fly){q.x+=q.fly*BX.flySpeed*dt;q.vx=0;q.vy=0;const lim=q.fly>0?BX.w-BX.pr:BX.pr;if(q.fly>0?q.x>=lim:q.x<=lim){q.x=lim;q.fly=0;q.stunUntil=Math.max(q.stunUntil,now+350);}else if(now>=q.flyUntil)q.fly=0;continue;}
  bxMove(q,dt,now<q.stunUntil);}
 bxSeparate(all);}
const boxingView=st=>({w:BX.w,h:BX.h,pr:BX.pr,score:st.score,ko:st.ko,serverTime:st.last,pl:Object.values(st.pl).map(q=>({id:q.id,name:q.name,team:q.team,bot:q.bot||undefined,x:r1(q.x),y:r1(q.y),vx:r1(q.vx||0),vy:r1(q.vy||0),ix:q.ix,iy:q.iy,face:q.face,hp:Math.max(0,Math.round(q.hp)),ult:Math.round(q.ult),block:q.block,atkAt:q.atkAt,ultAt:q.ultAt,hitAt:q.hitAt,blocked:q.blocked,stun:q.stunUntil,inv:q.inv,fly:q.fly}))});
const OPEN={football:{spawn:fbSpawn,drop:(st,id)=>{delete st.pl[id];}},boxing:{spawn:bxSpawn,drop:(st,id)=>{delete st.pl[id];bxBots(st);}}};

// ----------------------------------------------------------------- rival bot
const LV={easy:0,medium:1,hard:2};
const pick=a=>a[rnd(a.length)];
function tttBest(b,me){const win=(bd,who)=>LINES.some(l=>l.every(i=>bd[i]===who));
 const mm=(bd,who)=>{if(win(bd,me))return 10;if(win(bd,1-me))return -10;const free=bd.map((v,i)=>v<0?i:-1).filter(i=>i>=0);if(!free.length)return 0;const sc=free.map(i=>{bd[i]=who;const v=mm(bd,1-who);bd[i]=-1;return v;});return who===me?Math.max(...sc):Math.min(...sc);};
 const free=b.map((v,i)=>v<0?i:-1).filter(i=>i>=0);let best=free[0],bv=-1e9;for(const i of free){b[i]=me;const v=mm(b,1-me);b[i]=-1;if(v>bv){bv=v;best=i;}}return best;}
function botPlay(s,q,now){const st=s.state,lv=LV[q.bot]??1,seat=q.seat,L=LOGIC[s.game];if(!st||L.over(st))return;
 if(now<(q.next||0))return;const wait=ms=>{q.next=now+ms;};
 if(s.game==='ttt'){if(st.turn!==seat)return;if(!q.next){wait(500+rnd(500));return;}const b=st.board,free=b.map((v,i)=>v<0?i:-1).filter(i=>i>=0);let c;
  if(lv===2)c=tttBest([...b],seat);else{const line=who=>{for(const l of LINES){const v=l.map(i=>b[i]);if(v.filter(x=>x===who).length===2&&v.includes(-1))return l[v.indexOf(-1)];}return -1;};c=lv===1?(line(seat)>=0?line(seat):line(1-seat)>=0?line(1-seat):pick(free)):(Math.random()<.4&&line(seat)>=0?line(seat):pick(free));}
  tttInput(st,seat,{cell:c});q.next=0;return;}
 if(s.game==='reflex'){if(st.phase!=='go'){q.next=0;return;}if(!q.next){wait([560,360,240][lv]+rnd([300,160,90][lv]));return;}reflexInput(st,seat,{},now);q.next=0;return;}
 if(s.game==='race'){if(now<st.start)return;raceInput(st,seat,{n:1},now);wait([140,105,82][lv]+rnd(30));return;}
 if(s.game==='darts'){if(st.turn!==seat||!['y','x'].includes(st.stage)||now<st.aimStart)return;
  const sd=[.42,.24,.11][lv],aim=()=>clamp((Math.random()+Math.random()+Math.random()-1.5)*sd*1.6,-1,1);
  if(!q.at||q.key!==st.stage+st.dart+st.turn+st.round){const target=st.stage==='y'?(lv===2?-.56:0)+aim():aim(),u=(target+1)/4,period=st.stage==='y'?DARTS.py:DARTS.px;q.at=st.aimStart+u*period+period*(rnd(2));q.key=st.stage+st.dart+st.turn+st.round;}
  if(now>=q.at){dartsInput(st,seat,{t:Math.round(q.at)},now);q.at=0;}return;}
 if(s.game==='memory'){q.mem??={};for(const i of st.up)if(!(i in q.mem)&&Math.random()<[.35,.7,.97][lv])q.mem[i]=st.deck[i];
  if(st.turn!==seat||st.hideAt||st.doneAt||st.up.length>=2)return;if(!q.next){wait(650+rnd(450));return;}q.next=0;
  const known=Object.entries(q.mem).filter(([i])=>!st.matched[i]&&!st.up.includes(+i));let c=-1;
  if(st.up.length===1){const f=st.deck[st.up[0]];const m=known.find(([i,v])=>v===f&&+i!==st.up[0]);if(m)c=+m[0];}
  else{const pair=known.find(([i,v])=>known.some(([j,w])=>j!==i&&w===v));if(pair)c=+pair[0];}
  if(c<0){const unknown=[...Array(16).keys()].filter(i=>!st.matched[i]&&!st.up.includes(i)&&!(i in q.mem));const any=[...Array(16).keys()].filter(i=>!st.matched[i]&&!st.up.includes(i));c=unknown.length?pick(unknown):pick(any);}
  memoryInput(st,seat,{card:c},now);return;}
 if(s.game==='simon'){if(st.phase!=='input'||st.done[seat])return;if(!q.next){wait(420+rnd(260));return;}q.next=0;
  const ok=Math.random()<Math.max(.4,[.95,.985,.997][lv]-[.045,.022,.008][lv]*st.level),want=st.seq[st.pp[seat]];simonInput(st,seat,{color:ok?want:(want+1+rnd(3))%4},now);}
}

const LOGIC={
 darts:{init:dartsInit,input:dartsInput,tick:dartsTick,view:dartsView,over:s=>s.winner>=0||s.draw,winner:s=>s.winner},
 ttt:{init:tttInit,input:tttInput,tick:()=>{},view:tttView,over:s=>s.winner>=0||s.draw,winner:s=>s.winner},
 reflex:{init:reflexInit,input:reflexInput,tick:reflexTick,view:reflexView,over:s=>s.winner>=0&&s.phase==='result',winner:s=>s.winner},
 memory:{init:memoryInit,input:memoryInput,tick:memoryTick,view:memoryView,over:s=>!!s.doneAt,winner:memoryWinner},
 simon:{init:simonInit,input:simonInput,tick:simonTick,view:simonView,over:s=>s.over,winner:s=>s.two?s.winner:0},
 race:{init:raceInit,input:raceInput,tick:()=>{},view:raceView,over:s=>s.winner>=0,winner:s=>s.winner},
 football:{init:footballInit,input:footballInput,tick:footballTick,view:footballView,over:()=>false,winner:()=>-1},
 boxing:{init:boxingInit,input:boxingInput,tick:boxingTick,view:boxingView,over:()=>false,winner:()=>-1},
};

// ----------------------------------------------------------------- sesiones
const sessions=room=>room.tables??={n:0,list:[]};
const find=(room,p)=>room.tables?.list.find(s=>s.players.some(q=>q.id===p.id));
// Revancha: empieza el otro jugador (alterna en cada partida nueva de la misma sesión).
function start(s,now,rematch=false){s.first=rematch?1-(s.first||0):0;s.state=LOGIC[s.game].init(now,s.first,s.players.length>1);if(OPEN[s.game])for(const q of s.players)OPEN[s.game].spawn(s.state,q.id,q.name);s.phase='playing';s.again=[false,false];s.startedAt=now;s.notice=s.notice||'';for(const q of s.players)if(isBot(q)){q.next=0;q.at=0;q.mem={};}}
function drop(room,s,id,now,why=''){
 s.players=s.players.filter(q=>q.id!==id);
 if(OPEN[s.game]){if(s.state)OPEN[s.game].drop(s.state,id);if(!s.players.length)room.tables.list=room.tables.list.filter(x=>x!==s);return;}
 if(!s.players.some(q=>!isBot(q))){room.tables.list=room.tables.list.filter(x=>x!==s);return;}
 s.players.forEach((q,i)=>q.seat=i);s.phase='waiting';s.state=null;s.again=[false,false];s.notice=why||'El otro jugador se ha ido. Esperando a otro jugador…';
}
export function closeTables(room){room.tables=null;}
export function tableTick(room,now){
 const t=room.tables;if(!t)return;
 for(const s of [...t.list]){
  for(const q of [...s.players]){if(isBot(q))continue;const pl=room.players.find(p=>p.id===q.id);if(!pl||pl.removed||now-pl.lastSeen>TABLE_IDLE_MS)drop(room,s,q.id,now);}
  if(!t.list.includes(s)||s.phase!=='playing')continue;
  const L=LOGIC[s.game];L.tick(s.state,now);for(const q of s.players)if(isBot(q))botPlay(s,q,now);L.tick(s.state,now);
  if(L.over(s.state)){s.phase='over';s.finishedAt=now;for(const q of s.players)if(isBot(q))s.again[q.seat]=true;}
 }
}
export function tableCommand(room,p,type,data,now,near){
 const t=sessions(room);
 if(type==='tableJoin'){
  const game=String(data.game||'');if(!TABLE_GAMES[game])throw bad('Esa mesa no existe.');
  if(!near(game))throw bad('Acércate a la mesa.');
  const cur=find(room,p);if(cur){if(cur.game===game)return;drop(room,cur,p.id,now);}
  const need=TABLE_GAMES[game].players;
  let s=TABLE_GAMES[game].open?t.list.find(x=>x.game===game):need===2?t.list.find(x=>x.game===game&&x.phase==='waiting'&&x.players.length===1):null;
  if(!s){if(t.list.length>=8)throw bad('Las mesas están llenas. Espera un momento.');s={id:++t.n,game,players:[],phase:'waiting',state:null,again:[false,false],notice:'',created:now};t.list.push(s);}
  s.players.push({id:p.id,name:p.name,seat:s.players.length});
  if(TABLE_GAMES[game].open){if(s.phase!=='playing')start(s,now);else OPEN[game].spawn(s.state,p.id,p.name);return;}
  if(s.players.length>=need){s.notice='';start(s,now);}
  return;
 }
 const s=find(room,p);
 if(type==='tableLeave'){if(s)drop(room,s,p.id,now);return;}
 if(!s)throw bad('No estás en ninguna mesa.');
 const me=s.players.find(q=>q.id===p.id);
 if(type==='tableInput'){if(s.phase!=='playing')return;tableTick(room,now);if(s.phase!=='playing')return;LOGIC[s.game].input(s.state,me.seat,data,now,p.id);if(LOGIC[s.game].over(s.state)){s.phase='over';s.finishedAt=now;for(const q of s.players)if(isBot(q))s.again[q.seat]=true;}return;}
 if(type==='tableAgain'){if(s.phase!=='over')return;s.again[me.seat]=true;for(const q of s.players)if(isBot(q))s.again[q.seat]=true;if(s.players.every(q=>s.again[q.seat])){s.notice='';start(s,now,true);}return;}
 if(type==='tableBot'){const level=String(data.level||'medium');if(!BOT_LEVELS[level])throw bad('Nivel de bot no válido.');if(s.phase!=='waiting'||s.players.length!==1)return;
  s.players.push({id:'tablebot-'+s.id,name:'Bot · '+BOT_LEVELS[level],seat:1,bot:level});s.notice='';start(s,now);return;}
 throw bad('Acción de mesa no válida.');
}
export function tableView(room,p,now){
 const s=room.tables&&find(room,p);if(!s)return null;
 const me=s.players.find(q=>q.id===p.id),L=LOGIC[s.game];
 return {id:s.id,game:s.game,label:TABLE_GAMES[s.game].label,need:TABLE_GAMES[s.game].players,seat:me.seat,me:p.id,phase:s.phase,notice:s.notice,
  players:s.players.map(q=>({name:q.name,seat:q.seat,bot:q.bot||null})),again:s.again,
  winner:s.phase==='over'?L.winner(s.state):-1,view:s.state?L.view(s.state):null,serverTime:now};
}
export function tableStats(room){
 const out={};for(const s of room.tables?.list||[]){const o=out[s.game]??={waiting:0,playing:0};if(s.phase==='waiting')o.waiting+=s.players.length;else o.playing+=s.players.length;}return out;
}
