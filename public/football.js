// 16.4 · Física del «Fútbol de fichas», compartida por servidor (autoritativo) y cliente
// (predicción local fluida). Mismo código en los dos lados = mismas trayectorias.
//  · Tocar el balón ya lo mueve: al ir contra él lo conduces pegado a tu ficha (arrastre).
//  · ESPACIO chuta: impulso fuerte en la dirección ficha→balón, corregida por tu marcha.
export const FB={w:600,h:340,pr:14,br:8,speed:210,kick:500,reach:20,mouth:[115,225],friction:.95,pause:1500};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export function fbMovePlayer(q,dt){const l=Math.hypot(q.ix,q.iy)||1;q.vx=q.ix/l*FB.speed;q.vy=q.iy/l*FB.speed;q.x=clamp(q.x+q.vx*dt,FB.pr,FB.w-FB.pr);q.y=clamp(q.y+q.vy*dt,FB.pr,FB.h-FB.pr);}

// Avanza el balón dt segundos contra las fichas dadas. Devuelve el equipo que marca (0/1) o -1.
export function fbStepBall(b,players,dt,onTouch){const steps=Math.max(1,Math.ceil(Math.hypot(b.vx,b.vy)*dt/4));
 for(let k=0;k<steps;k++){const h=dt/steps;b.x+=b.vx*h;b.y+=b.vy*h;
  const inMouth=b.y>FB.mouth[0]&&b.y<FB.mouth[1];
  if(b.x<-FB.br)return 1;if(b.x>FB.w+FB.br)return 0;
  if(!inMouth){if(b.x<FB.br){b.x=FB.br;b.vx=Math.abs(b.vx)*.75;}if(b.x>FB.w-FB.br){b.x=FB.w-FB.br;b.vx=-Math.abs(b.vx)*.75;}}
  else{// Postes: el balón no atraviesa el borde de la portería por arriba o por abajo.
   if(b.x<FB.br||b.x>FB.w-FB.br){if(b.y<FB.mouth[0]+FB.br){b.y=FB.mouth[0]+FB.br;b.vy=Math.abs(b.vy)*.6;}if(b.y>FB.mouth[1]-FB.br){b.y=FB.mouth[1]-FB.br;b.vy=-Math.abs(b.vy)*.6;}}}
  if(b.y<FB.br){b.y=FB.br;b.vy=Math.abs(b.vy)*.75;}if(b.y>FB.h-FB.br){b.y=FB.h-FB.br;b.vy=-Math.abs(b.vy)*.75;}
  for(const q of players){const dx=b.x-q.x,dy=b.y-q.y,d=Math.hypot(dx,dy),min=FB.pr+FB.br;if(d>=min)continue;
   const nx=d>1e-6?dx/d:(Math.hypot(q.vx,q.vy)?q.vx/Math.hypot(q.vx,q.vy):1),ny=d>1e-6?dy/d:(Math.hypot(q.vx,q.vy)?q.vy/Math.hypot(q.vx,q.vy):0);
   b.x=q.x+nx*min;b.y=q.y+ny*min;const pv=q.vx*nx+q.vy*ny,bv=b.vx*nx+b.vy*ny;
   if(pv>0){// Conducción: el balón sigue a la ficha, un pelín por delante.
    const tx=q.vx+nx*18,ty=q.vy+ny*18;b.vx+=(tx-b.vx)*.85;b.vy+=(ty-b.vy)*.85;}
   else if(bv<pv){const j=(pv-bv)*1.5;b.vx+=j*nx;b.vy+=j*ny;}// rebote suave contra una ficha parada
   onTouch?.(q);}}
 const f=Math.exp(-FB.friction*dt);b.vx*=f;b.vy*=f;if(Math.hypot(b.vx,b.vy)<3){b.vx=0;b.vy=0;}return -1;}

// Chute: true si la ficha alcanzaba el balón.
export function fbKick(b,q,reach=FB.reach){const dx=b.x-q.x,dy=b.y-q.y,dist=Math.hypot(dx,dy);if(dist>FB.pr+FB.br+reach)return false;
 let nx=dx/(dist||1),ny=dy/(dist||1);const il=Math.hypot(q.ix,q.iy);if(il){nx=nx*.72+q.ix/il*.28;ny=ny*.72+q.iy/il*.28;const l=Math.hypot(nx,ny)||1;nx/=l;ny/=l;}
 b.vx=nx*FB.kick+(q.vx||0)*.3;b.vy=ny*FB.kick+(q.vy||0)*.3;return true;}
