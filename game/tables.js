// Mesas de la caravana: seis minijuegos con sesiones independientes en el servidor.
// Cada partida (o pareja de jugadores) es una sesión propia; una misma mesa admite varias a la vez.
// Todo vive en `room.tables` (JSON plano) y se cierra al empezar la partida principal.
export const TABLE_GAMES={
 darts:{label:'Dardos',players:2},
 ttt:{label:'Tres en raya',players:2},
 reflex:{label:'Duelo de reflejos',players:2},
 memory:{label:'Memoria de cartas',players:1},
 simon:{label:'Secuencia de colores',players:1},
 race:{label:'Carrera de pulsaciones',players:2},
};
export const TABLE_IDLE_MS=12000;      // sin pulsos durante este tiempo = abandono
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
export const DARTS={darts:3,rounds:2,py:1700,px:1300,fly:900,lead:1100,window:250,lag:700};
const DART_NUMS=[20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];
export const dartOsc=(t,start,period)=>{if(t<start)return -1;const u=((t-start)/period)%1;return u<.5?-1+4*u:3-4*u;};
export function dartScore(x,y){const r=Math.hypot(x,y);if(r>1)return {points:0,label:'Fuera'};if(r<=.06)return {points:50,label:'Diana'};if(r<=.13)return {points:25,label:'Bull 25'};
 const deg=(Math.atan2(x,-y)*180/Math.PI+360+9)%360,base=DART_NUMS[Math.floor(deg/18)%20],mult=r>=.53&&r<=.6?3:r>=.92?2:1;return {points:base*mult,label:(mult===3?'Triple ':mult===2?'Doble ':'')+base};}
function dartsInit(now){return {turn:0,dart:0,round:0,stage:'y',aimStart:now+DARTS.lead,ay:0,throws:[[],[]],scores:[0,0],flyUntil:0,last:null,winner:-1,draw:false};}
function dartsInput(s,seat,d,now){if(s.winner>=0||s.draw||seat!==s.turn||now<s.aimStart||!['y','x'].includes(s.stage))return;
 // El instante declarado vale si cae entre la latencia razonable (≤700 ms atrás) y
 // un pequeño adelanto de reloj; fuera de esa ventana se usa el del servidor.
 let t=Number(d.t);if(!Number.isFinite(t)||t>now+DARTS.window||t<now-DARTS.lag)t=now;t=Math.max(t,s.aimStart);
 if(s.stage==='y'){s.ay=Math.round(dartOsc(t,s.aimStart,DARTS.py)*1000)/1000;s.stage='x';s.aimStart=t;return;}
 const x=Math.round(dartOsc(t,s.aimStart,DARTS.px)*1000)/1000,sc=dartScore(x,s.ay),hit={x,y:s.ay,...sc};
 s.throws[s.turn].push(hit);s.scores[s.turn]+=sc.points;s.last={...hit,seat:s.turn,at:now};s.stage='fly';s.flyUntil=now+DARTS.fly;}
function dartsTick(s,now){if(s.stage!=='fly'||now<s.flyUntil)return;s.dart++;
 if(s.dart<DARTS.darts){s.stage='y';s.aimStart=now+250;return;}
 s.dart=0;if(s.turn===1)s.round++;s.turn=1-s.turn;
 if(s.round>=DARTS.rounds){s.stage='done';if(s.scores[0]===s.scores[1])s.draw=true;else s.winner=s.scores[0]>s.scores[1]?0:1;return;}
 s.stage='y';s.aimStart=now+DARTS.lead;}
const dartsView=s=>({turn:s.turn,dart:s.dart,round:s.round,rounds:DARTS.rounds,darts:DARTS.darts,stage:s.stage,aimStart:s.aimStart,py:DARTS.py,px:DARTS.px,ay:s.ay,throws:s.throws,scores:s.scores,last:s.last,flyUntil:s.flyUntil,winner:s.winner,draw:s.draw});

// ----------------------------------------------------------------- Tres en raya
const LINES=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const tttInit=()=>({board:Array(9).fill(-1),turn:0,winner:-1,line:null,draw:false,wins:[0,0,0]});
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
function memoryInit(now){const deck=[...FACES,...FACES];for(let i=deck.length-1;i>0;i--){const j=rnd(i+1);[deck[i],deck[j]]=[deck[j],deck[i]];}return {deck,up:[],matched:Array(16).fill(false),hideAt:0,moves:0,start:now,doneAt:0};}
function memoryTick(s,now){if(s.hideAt&&now>=s.hideAt){s.up=[];s.hideAt=0;}}
function memoryInput(s,seat,d,now){memoryTick(s,now);if(s.doneAt)return;const c=Math.floor(num(d.card));if(c<0||c>15||s.matched[c]||s.up.includes(c)||s.up.length>=2)return;
 s.up.push(c);if(s.up.length===2){s.moves++;const [a,b]=s.up;if(s.deck[a]===s.deck[b]){s.matched[a]=s.matched[b]=true;s.up=[];if(s.matched.every(Boolean))s.doneAt=now;}else s.hideAt=now+850;}}
const memoryView=s=>({faces:s.deck.map((f,i)=>s.matched[i]||s.up.includes(i)?f:null),matched:s.matched,moves:s.moves,start:s.start,doneAt:s.doneAt,pairs:s.matched.filter(Boolean).length/2});

// ----------------------------------------------------------------- Secuencia de colores
const SM={step:650,lead:700};
function simonShow(s,now){s.phase='show';s.pos=0;s.showStart=now+SM.lead;s.showUntil=s.showStart+s.seq.length*SM.step+300;}
function simonInit(now){const s={seq:[rnd(4)],phase:'show',pos:0,showStart:0,showUntil:0,level:1,best:0,over:false};simonShow(s,now);return s;}
function simonTick(s,now){if(s.phase==='show'&&now>=s.showUntil)s.phase='input';}
function simonInput(s,seat,d,now){simonTick(s,now);if(s.phase!=='input')return;const c=Math.floor(num(d.color));if(c<0||c>3)return;
 if(c!==s.seq[s.pos]){s.phase='over';s.over=true;s.best=s.level-1;return;}
 s.pos++;if(s.pos>=s.seq.length){s.level++;s.seq.push(rnd(4));simonShow(s,now);}}
const simonView=s=>({phase:s.phase,level:s.level,pos:s.pos,len:s.seq.length,showStart:s.showStart,step:SM.step,seq:s.phase==='show'?s.seq:null,score:s.over?s.best:null});

// ----------------------------------------------------------------- Carrera de pulsaciones
const RC={goal:40,gap:60,count:3200};
const raceInit=now=>({pos:[0,0],last:[0,0],start:now+RC.count,winner:-1});
function raceInput(s,seat,d,now){if(s.winner>=0||now<s.start)return;const want=Math.max(1,Math.min(6,Math.floor(Number(d.n)||1))),allowed=Math.floor((now-Math.max(s.last[seat],s.start-RC.gap))/RC.gap);const n=Math.min(want,allowed);if(n<1)return;s.last[seat]=now;s.pos[seat]=Math.min(RC.goal,s.pos[seat]+n);if(s.pos[seat]>=RC.goal){s.winner=seat;s.endAt=now;}}
const raceView=s=>({pos:s.pos,goal:RC.goal,start:s.start,winner:s.winner});

const LOGIC={
 darts:{init:dartsInit,input:dartsInput,tick:dartsTick,view:dartsView,over:s=>s.winner>=0||s.draw,winner:s=>s.winner},
 ttt:{init:tttInit,input:tttInput,tick:()=>{},view:tttView,over:s=>s.winner>=0||s.draw,winner:s=>s.winner},
 reflex:{init:reflexInit,input:reflexInput,tick:reflexTick,view:reflexView,over:s=>s.winner>=0&&s.phase==='result',winner:s=>s.winner},
 memory:{init:memoryInit,input:memoryInput,tick:memoryTick,view:memoryView,over:s=>!!s.doneAt,winner:()=>0},
 simon:{init:simonInit,input:simonInput,tick:simonTick,view:simonView,over:s=>s.over,winner:()=>0},
 race:{init:raceInit,input:raceInput,tick:()=>{},view:raceView,over:s=>s.winner>=0,winner:s=>s.winner},
};

// ----------------------------------------------------------------- sesiones
const sessions=room=>room.tables??={n:0,list:[]};
const find=(room,p)=>room.tables?.list.find(s=>s.players.some(q=>q.id===p.id));
function start(s,now){s.state=LOGIC[s.game].init(now);s.phase='playing';s.again=[false,false];s.startedAt=now;s.notice=s.notice||'';}
function drop(room,s,id,now,why=''){
 s.players=s.players.filter(q=>q.id!==id);
 if(!s.players.length){room.tables.list=room.tables.list.filter(x=>x!==s);return;}
 s.players.forEach((q,i)=>q.seat=i);s.phase='waiting';s.state=null;s.again=[false,false];s.notice=why||'El otro jugador se ha ido. Esperando a otro jugador…';
}
export function closeTables(room){room.tables=null;}
export function tableTick(room,now){
 const t=room.tables;if(!t)return;
 for(const s of [...t.list]){
  for(const q of [...s.players]){const pl=room.players.find(p=>p.id===q.id);if(!pl||pl.removed||now-pl.lastSeen>TABLE_IDLE_MS)drop(room,s,q.id,now);}
  if(!t.list.includes(s)||s.phase!=='playing')continue;
  const L=LOGIC[s.game];L.tick(s.state,now);
  if(L.over(s.state)){s.phase='over';s.finishedAt=now;}
 }
}
export function tableCommand(room,p,type,data,now,near){
 const t=sessions(room);
 if(type==='tableJoin'){
  const game=String(data.game||'');if(!TABLE_GAMES[game])throw bad('Esa mesa no existe.');
  if(!near(game))throw bad('Acércate a la mesa.');
  const cur=find(room,p);if(cur){if(cur.game===game)return;drop(room,cur,p.id,now);}
  const need=TABLE_GAMES[game].players;
  let s=need===2?t.list.find(x=>x.game===game&&x.phase==='waiting'&&x.players.length===1):null;
  if(!s){if(t.list.length>=8)throw bad('Las mesas están llenas. Espera un momento.');s={id:++t.n,game,players:[],phase:'waiting',state:null,again:[false,false],notice:'',created:now};t.list.push(s);}
  s.players.push({id:p.id,name:p.name,seat:s.players.length});
  if(s.players.length>=need){s.notice='';start(s,now);}
  return;
 }
 const s=find(room,p);
 if(type==='tableLeave'){if(s)drop(room,s,p.id,now);return;}
 if(!s)throw bad('No estás en ninguna mesa.');
 const me=s.players.find(q=>q.id===p.id);
 if(type==='tableInput'){if(s.phase!=='playing')return;tableTick(room,now);if(s.phase!=='playing')return;LOGIC[s.game].input(s.state,me.seat,data,now);if(LOGIC[s.game].over(s.state)){s.phase='over';s.finishedAt=now;}return;}
 if(type==='tableAgain'){if(s.phase!=='over')return;s.again[me.seat]=true;if(s.players.every(q=>s.again[q.seat])){s.notice='';start(s,now);}return;}
 throw bad('Acción de mesa no válida.');
}
export function tableView(room,p,now){
 const s=room.tables&&find(room,p);if(!s)return null;
 const me=s.players.find(q=>q.id===p.id),L=LOGIC[s.game];
 return {id:s.id,game:s.game,label:TABLE_GAMES[s.game].label,need:TABLE_GAMES[s.game].players,seat:me.seat,phase:s.phase,notice:s.notice,
  players:s.players.map(q=>({name:q.name,seat:q.seat})),again:s.again,
  winner:s.phase==='over'?L.winner(s.state):-1,view:s.state?L.view(s.state):null,serverTime:now};
}
export function tableStats(room){
 const out={};for(const s of room.tables?.list||[]){const o=out[s.game]??={waiting:0,playing:0};if(s.phase==='waiting')o.waiting+=s.players.length;else o.playing+=s.players.length;}return out;
}
