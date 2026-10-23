// 16.5 · Física del «Fútbol de fichas», compartida por servidor (autoritativo) y cliente
// (predicción local fluida). Mismo código en los dos lados = mismas trayectorias.
//  · Fichas pesadas: aceleran y frenan con inercia (no giran en seco) y chocan entre ellas.
//  · Tocar el balón ya lo mueve: al ir contra él lo empujas y lo conduces (arrastre).
//  · ESPACIO chuta: impulso fuerte en la dirección ficha→balón, corregida por tu marcha.
//  · Esquinas redondeadas: el balón nunca se queda encajado; si está pegado a una pared,
//    el chute sale rebotado hacia el campo.
export const FB={w:600,h:340,pr:14,br:8,speed:134,accel:3.4,brake:3.6,kick:400,reach:18,mouth:[115,225],friction:.55,roll:26,pause:1500,corner:38,maxBall:520,mass:6,post:3.5};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

// Inercia: la velocidad se acerca a la deseada poco a poco (sensación de peso). Acelerar cuesta,
// frenar también (se desliza un poco) y cambiar de sentido es aún más lento.
export function fbMovePlayer(q,dt){const il=Math.hypot(q.ix,q.iy),l=il||1,tx=q.ix/l*FB.speed,ty=q.iy/l*FB.speed;
 const vx=q.vx||0,vy=q.vy||0,sp=Math.hypot(vx,vy),dot=il&&sp>1?(vx*tx+vy*ty)/(sp*FB.speed):1;
 const rate=il?(dot>=0?FB.accel:FB.accel*(1+(-dot)*.35)):FB.brake,k=1-Math.exp(-rate*dt);
 q.vx=vx+(tx-vx)*k;q.vy=vy+(ty-vy)*k;if(!il&&Math.hypot(q.vx,q.vy)<3){q.vx=0;q.vy=0;}
 q.x+=q.vx*dt;q.y+=q.vy*dt;
 if(q.x<FB.pr){q.x=FB.pr;q.vx=Math.max(0,q.vx);}if(q.x>FB.w-FB.pr){q.x=FB.w-FB.pr;q.vx=Math.min(0,q.vx);}
 if(q.y<FB.pr){q.y=FB.pr;q.vy=Math.max(0,q.vy);}if(q.y>FB.h-FB.pr){q.y=FB.h-FB.pr;q.vy=Math.min(0,q.vy);}}

// Choques entre fichas (misma masa): se separan a partes iguales e intercambian el empuje.
// `fixed` (opcional) marca fichas que no se mueven (en el cliente, las de los demás).
export function fbCollidePlayers(players,fixed=null){const min=FB.pr*2;
 for(let i=0;i<players.length;i++)for(let j=i+1;j<players.length;j++){const a=players[i],b=players[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d>=min)continue;
  const nx=d>1e-6?dx/d:1,ny=d>1e-6?dy/d:0,over=min-d,fa=fixed?.has(a)?0:fixed?.has(b)?1:.5,fb=1-fa;
  a.x-=nx*over*fa;a.y-=ny*over*fa;b.x+=nx*over*fb;b.y+=ny*over*fb;
  const rv=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(rv<0){const j2=-1.35*rv;a.vx-=nx*j2*fa;a.vy-=ny*j2*fa;b.vx+=nx*j2*fb;b.vy+=ny*j2*fb;}
  const tx=-ny,ty=nx,rt=(b.vx-a.vx)*tx+(b.vy-a.vy)*ty;a.vx+=tx*rt*.08*fa;a.vy+=ty*rt*.08*fa;b.vx-=tx*rt*.08*fb;b.vy-=ty*rt*.08*fb;
  for(const q of [a,b]){q.x=clamp(q.x,FB.pr,FB.w-FB.pr);q.y=clamp(q.y,FB.pr,FB.h-FB.pr);}}}

// Postes: círculos en los cuatro extremos de las porterías; el balón rebota con ángulo real.
function ballPosts(b){const R=FB.post+FB.br;for(const px of [0,FB.w])for(const py of FB.mouth){const dx=b.x-px,dy=b.y-py,d=Math.hypot(dx,dy);if(d>=R||d<1e-6)continue;const nx=dx/d,ny=dy/d;b.x=px+nx*R;b.y=py+ny*R;const vn=b.vx*nx+b.vy*ny;if(vn<0){b.vx-=1.7*vn*nx;b.vy-=1.7*vn*ny;}}}
// Paredes, postes y esquinas redondeadas para el balón.
function ballWalls(b){ballPosts(b);const inMouth=b.y>FB.mouth[0]&&b.y<FB.mouth[1];
 if(!inMouth){if(b.x<FB.br){b.x=FB.br;b.vx=Math.abs(b.vx)*.72;}if(b.x>FB.w-FB.br){b.x=FB.w-FB.br;b.vx=-Math.abs(b.vx)*.72;}}
 else if(b.x<FB.br||b.x>FB.w-FB.br){if(b.y<FB.mouth[0]+FB.br){b.y=FB.mouth[0]+FB.br;b.vy=Math.abs(b.vy)*.6;}if(b.y>FB.mouth[1]-FB.br){b.y=FB.mouth[1]-FB.br;b.vy=-Math.abs(b.vy)*.6;}}
 if(b.y<FB.br){b.y=FB.br;b.vy=Math.abs(b.vy)*.72;}if(b.y>FB.h-FB.br){b.y=FB.h-FB.br;b.vy=-Math.abs(b.vy)*.72;}
 const C=FB.corner,cx=b.x<C?C:b.x>FB.w-C?FB.w-C:null,cy=b.y<C?C:b.y>FB.h-C?FB.h-C:null;
 if(cx!==null&&cy!==null){const dx=b.x-cx,dy=b.y-cy,d=Math.hypot(dx,dy),lim=C-FB.br;if(d>lim){const nx=dx/d,ny=dy/d;b.x=cx+nx*lim;b.y=cy+ny*lim;const vn=b.vx*nx+b.vy*ny;if(vn>0){b.vx-=1.75*vn*nx;b.vy-=1.75*vn*ny;}
  // Nunca encajado: si casi no se mueve en la esquina, sale rodando hacia el campo.
  if(Math.hypot(b.vx,b.vy)<70){b.vx-=nx*70;b.vy-=ny*70;}}}}

// Avanza el balón dt segundos contra las fichas dadas. Devuelve el equipo que marca (0/1) o -1.
export function fbStepBall(b,players,dt,onTouch){const steps=Math.max(1,Math.ceil(Math.hypot(b.vx,b.vy)*dt/4));
 for(let k=0;k<steps;k++){const h=dt/steps;b.x+=b.vx*h;b.y+=b.vy*h;
  if(b.x<-FB.br)return 1;if(b.x>FB.w+FB.br)return 0;ballWalls(b);
  for(const q of players){const dx=b.x-q.x,dy=b.y-q.y,d=Math.hypot(dx,dy),min=FB.pr+FB.br;if(d>=min)continue;
   const qv=Math.hypot(q.vx||0,q.vy||0),nx=d>1e-6?dx/d:(qv?q.vx/qv:1),ny=d>1e-6?dy/d:(qv?q.vy/qv:0);
   b.x=q.x+nx*min;b.y=q.y+ny*min;
   // Choque con una ficha mucho más pesada: el balón sale con la velocidad relativa reflejada
   // (rebote .3) y arrastra un poco de la marcha lateral de la ficha (conducción).
   const rvx=b.vx-(q.vx||0),rvy=b.vy-(q.vy||0),vn=rvx*nx+rvy*ny;if(vn<0){const j=-1.3*vn;b.vx+=j*nx;b.vy+=j*ny;q.vx=(q.vx||0)-j*nx/FB.mass;q.vy=(q.vy||0)-j*ny/FB.mass;}
   const tx=-ny,ty=nx,vt=(b.vx-(q.vx||0))*tx+(b.vy-(q.vy||0))*ty;b.vx-=vt*.3*tx;b.vy-=vt*.3*ty;
   ballWalls(b);
   // Si la pared no deja sitio al balón, es la ficha la que retrocede (nada se queda clavado).
   const ex=b.x-q.x,ey=b.y-q.y,e=Math.hypot(ex,ey);if(e<min){const ux=e>1e-6?ex/e:nx,uy=e>1e-6?ey/e:ny;q.x=clamp(b.x-ux*min,FB.pr,FB.w-FB.pr);q.y=clamp(b.y-uy*min,FB.pr,FB.h-FB.pr);const pv=(q.vx||0)*ux+(q.vy||0)*uy;if(pv>0){q.vx-=pv*ux;q.vy-=pv*uy;}}
   onTouch?.(q);}}
 const s=Math.hypot(b.vx,b.vy);if(s>FB.maxBall){b.vx*=FB.maxBall/s;b.vy*=FB.maxBall/s;}
 const f=Math.exp(-FB.friction*dt);b.vx*=f;b.vy*=f;{const sp2=Math.hypot(b.vx,b.vy);if(sp2>0){const ns=Math.max(0,sp2-FB.roll*dt);b.vx*=ns/sp2;b.vy*=ns/sp2;}}if(Math.hypot(b.vx,b.vy)<3){b.vx=0;b.vy=0;}return -1;}

// Chute: true si la ficha alcanzaba el balón.
export function fbKick(b,q,reach=FB.reach){const dx=b.x-q.x,dy=b.y-q.y,dist=Math.hypot(dx,dy);if(dist>FB.pr+FB.br+reach)return false;
 let nx=dx/(dist||1),ny=dy/(dist||1);const il=Math.hypot(q.ix,q.iy);if(il){nx=nx*.72+q.ix/il*.28;ny=ny*.72+q.iy/il*.28;const l=Math.hypot(nx,ny)||1;nx/=l;ny/=l;}
 // Balón pegado a una pared o metido en una esquina: el chute que iría contra ella sale
 // rebotado hacia el campo; si el rebote volvería contra tu propia ficha, sale de lado.
 const C=FB.corner,m=FB.br+12,cx=b.x<C?C:b.x>FB.w-C?FB.w-C:null,cy=b.y<C?C:b.y>FB.h-C?FB.h-C:null;let wx=0,wy=0;
 if(cx!==null&&cy!==null){const d=Math.hypot(b.x-cx,b.y-cy);if(d>C-FB.br-12){wx=(b.x-cx)/(d||1);wy=(b.y-cy)/(d||1);}}
 else{if(b.x<m)wx=-1;else if(b.x>FB.w-m)wx=1;if(b.y<m)wy=-1;else if(b.y>FB.h-m)wy=1;const l=Math.hypot(wx,wy);if(l){wx/=l;wy/=l;}}
 const into=nx*wx+ny*wy;if(into>0){nx-=2*into*wx;ny-=2*into*wy;let l=Math.hypot(nx,ny)||1;nx/=l;ny/=l;
  if(nx*(-dx/(dist||1))+ny*(-dy/(dist||1))>.6){let tx=-wy,ty=wx;if(tx*(FB.w/2-b.x)+ty*(FB.h/2-b.y)<0){tx=-tx;ty=-ty;}nx=tx*.85-wx*.15;ny=ty*.85-wy*.15;l=Math.hypot(nx,ny)||1;nx/=l;ny/=l;}}
 b.vx=nx*FB.kick+(q.vx||0)*.3;b.vy=ny*FB.kick+(q.vy||0)*.3;return true;}

// 16.7 · Boxeo: arena 2D con profundidad. Movimiento ágil (no pesado como el fútbol) para que
// los golpes se sientan rápidos; el mismo código corre en servidor y en la predicción del cliente.
export const BX={w:600,h:250,pr:16,speed:185,accel:13,brake:15,reach:46,depth:26,dmg:8,blockDmg:1.5,ultDmg:18,ultReach:62,ultDepth:38,cd:380,ultCd:800,flySpeed:1500,flyMs:520,hp:100,heal:25,inv:1500,blockSlow:.42,top:34,recoil:95,
 // 16.10 · esquiva (Shift/Q), contraataque tras bloquear y objetos en el ring
 dashSpeed:470,dashMs:170,dashCd:900,evade:230,counterMs:550,counterDmg:15,puFirst:7000,puEvery:7500,puLife:12000,heart:30,bolt:50,goldMs:8000,goldK:1.5};
export function bxMove(q,dt,lock=false){
 if(q.dash>0){q.dash=Math.max(0,q.dash-dt);q.vx=(q.ddx||0)*BX.dashSpeed;q.vy=(q.ddy||0)*BX.dashSpeed;if(!q.dash){q.vx*=.35;q.vy*=.35;}}
 else{const il=lock?0:Math.hypot(q.ix,q.iy),l=il||1,f=q.block?BX.blockSlow:1,tx=q.ix/l*BX.speed*f,ty=q.iy/l*BX.speed*f,k=1-Math.exp(-(il?BX.accel:BX.brake)*dt);
 q.vx=(q.vx||0)+((il?tx:0)-(q.vx||0))*k;q.vy=(q.vy||0)+((il?ty:0)-(q.vy||0))*k;if(!il&&Math.hypot(q.vx,q.vy)<4){q.vx=0;q.vy=0;}}
 q.x+=q.vx*dt;q.y+=q.vy*dt;
 if(q.x<BX.pr){q.x=BX.pr;q.vx=Math.max(0,q.vx);}if(q.x>BX.w-BX.pr){q.x=BX.w-BX.pr;q.vx=Math.min(0,q.vx);}
 if(q.y<BX.top){q.y=BX.top;q.vy=Math.max(0,q.vy);}if(q.y>BX.h-BX.pr){q.y=BX.h-BX.pr;q.vy=Math.min(0,q.vy);}}
// Los púgiles son sólidos: nadie atraviesa a nadie. Se separan y se anula el empuje contra el
// otro (fixed = no se mueven, p. ej. los rivales interpolados en el cliente).
export const BX_MIN=BX.pr*1.9;
export function bxSeparate(list,fixed=null){for(let it=0;it<3;it++)for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){const a=list[i],b=list[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d>=BX_MIN)continue;
  const nx=d>1e-6?dx/d:1,ny=d>1e-6?dy/d:0,o=BX_MIN-d,fa=fixed?.has(a)?0:fixed?.has(b)?1:.5,fb=1-fa;
  a.x-=nx*o*fa;a.y-=ny*o*fa;b.x+=nx*o*fb;b.y+=ny*o*fb;
  if(fa){const va=(a.vx||0)*nx+(a.vy||0)*ny;if(va>0){a.vx-=va*nx;a.vy-=va*ny;}}
  if(fb){const vb=(b.vx||0)*nx+(b.vy||0)*ny;if(vb<0){b.vx-=vb*nx;b.vy-=vb*ny;}}
  for(const q of [a,b]){q.x=clamp(q.x,BX.pr,BX.w-BX.pr);q.y=clamp(q.y,BX.top,BX.h-BX.pr);}}}
