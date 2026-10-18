// Kit visual de las tareas temáticas: fondos por mapa, dibujo "entintado" y
// un catálogo de iconos vectoriales propios. Nada de imágenes externas: todo
// se dibuja con trazos de lienzo, con contorno oscuro y brillos planos.
export const W=640,H=440,TAU=Math.PI*2,INK='#131a22';
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const ease=t=>1-Math.pow(1-clamp(t,0,1),3);
export const lerp=(a,b,t)=>a+(b-a)*t;

export function rr(c,x,y,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
export function ink(c,fill,lw=3,stroke=INK){if(fill){c.fillStyle=fill;c.fill();}c.lineWidth=lw;c.strokeStyle=stroke;c.lineJoin='round';c.lineCap='round';c.stroke();}
export function shade(hex,amt){const n=parseInt(hex.slice(1),16),f=amt<0?0:255,t=Math.abs(amt),m=v=>Math.round(v+(f-v)*t);return '#'+[(n>>16)&255,(n>>8)&255,n&255].map(m).map(v=>v.toString(16).padStart(2,'0')).join('');}
export function txt(c,s,x,y,{size=16,color='#fff',align='center',weight=800,base='middle',stroke=null}={}){
 c.font=`${weight} ${size}px system-ui,-apple-system,"Segoe UI",sans-serif`;c.textAlign=align;c.textBaseline=base;
 if(stroke){c.lineWidth=size*.22;c.strokeStyle=stroke;c.lineJoin='round';c.strokeText(s,x,y);}
 c.fillStyle=color;c.fillText(s,x,y);
}
export function card(c,x,y,w,h,{fill='#f4ecd4',r=12,lw=3,drop=5,hi=true}={}){
 if(drop){c.fillStyle='rgba(0,0,0,.28)';rr(c,x,y+drop,w,h,r);c.fill();}
 rr(c,x,y,w,h,r);ink(c,fill,lw);
 if(hi){c.save();rr(c,x+lw,y+lw,w-lw*2,h*.38,Math.max(2,r-2));c.clip();c.fillStyle='rgba(255,255,255,.10)';c.fillRect(x,y,w,h*.4);c.restore();}
}
export function glow(c,x,y,r,color,a=.5){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'rgba(0,0,0,0)');c.globalAlpha=a;c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.globalAlpha=1;}

// --- Fondos ----------------------------------------------------------------
export const THEME={
 school:{name:'COLEGIO',accent:'#f0c36a',ok:'#8fe6c2',panel:'#e9dfc0',dark:'#3a2a1c'},
 club:{name:'SANAGUS CLUB',accent:'#ff5fd2',ok:'#5ff0ff',panel:'#2b2150',dark:'#120b26'},
 gym:{name:'SANAGUS GYM',accent:'#ffb347',ok:'#8fe6c2',panel:'#2f4660',dark:'#10202e'},
 park:{name:'CAMPO GRANDE',accent:'#9be564',ok:'#c9ff9a',panel:'#d7ecb7',dark:'#1d3a22'}
};
export function backdrop(c,hw,theme,t=0){
 if(theme==='club'){
  c.fillStyle=hw.paint.linear(0,0,0,H,['0:#1a0f3a','1:#0a0618']);c.fillRect(0,0,W,H);
  c.lineWidth=1;c.strokeStyle='rgba(255,95,210,.14)';
  for(let x=-W;x<W*2;x+=40){c.beginPath();c.moveTo(W/2+(x-W/2)*.2,60);c.lineTo(x,H);c.stroke();}
  for(let y=80,k=1;y<H;y+=k*7,k*=1.25){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();}
  const hue=['#ff5fd2','#5ff0ff','#9d6bff'];hue.forEach((col,i)=>glow(c,W*(.15+.35*i)+Math.sin(t/1600+i*2)*40,30,200,col,.16));
 }else if(theme==='gym'){
  c.fillStyle=hw.paint.linear(0,0,0,H,['0:#25384a','1:#121e2a']);c.fillRect(0,0,W,H);
  c.strokeStyle='rgba(255,179,71,.18)';c.lineWidth=4;c.strokeRect(24,24,W-48,H-48);
  c.beginPath();c.arc(W/2,H/2,80,0,TAU);c.stroke();c.beginPath();c.moveTo(W/2,24);c.lineTo(W/2,H-24);c.stroke();
 }else if(theme==='park'){
  c.fillStyle=hw.paint.linear(0,0,0,H,['0:#6fae4a','1:#3f7c37']);c.fillRect(0,0,W,H);
  c.fillStyle='rgba(255,255,255,.07)';for(let i=0;i<44;i++){const x=(i*97)%W,y=(i*61)%H;c.beginPath();c.ellipse(x,y,26,9,0,0,TAU);c.fill();}
  c.strokeStyle='rgba(30,70,30,.25)';c.lineWidth=2;for(let i=0;i<70;i++){const x=(i*53)%W,y=(i*89)%H;c.beginPath();c.moveTo(x,y);c.lineTo(x+3,y-9);c.moveTo(x+6,y);c.lineTo(x+4,y-7);c.stroke();}
 }else{
  c.fillStyle=hw.paint.linear(0,0,0,H,['0:#a9753f','1:#7a4f2a']);c.fillRect(0,0,W,H);
  c.strokeStyle='rgba(60,32,12,.22)';c.lineWidth=2;for(let y=14;y<H;y+=22){c.beginPath();c.moveTo(0,y);for(let x=0;x<=W;x+=40)c.lineTo(x,y+Math.sin(x*.05+y)*2.2);c.stroke();}
 }
 const v=c.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,H*.85);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.35)');c.fillStyle=v;c.fillRect(0,0,W,H);
}

// --- Iconos ----------------------------------------------------------------
// Cada icono se dibuja centrado en (0,0) dentro de una caja de lado `s`.
const ICONS={
 sheet(c,s,o){const w=s*.7,h=s*.9;rr(c,-w/2,-h/2,w,h,s*.05);ink(c,'#f6f1e1',2.5);c.strokeStyle='#9aa7b8';c.lineWidth=1.5;for(let i=0;i<5;i++){c.beginPath();c.moveTo(-w*.34,-h*.3+i*h*.15);c.lineTo(w*.34-(i%2)*8,-h*.3+i*h*.15);c.stroke();}
  c.beginPath();c.moveTo(w/2-s*.18,-h/2);c.lineTo(w/2,-h/2+s*.18);c.lineTo(w/2-s*.18,-h/2+s*.18);c.closePath();ink(c,'#d4cdb6',2);},
 exam(c,s,o){ICONS.sheet(c,s,o);c.save();c.rotate(-.2);txt(c,o.text||'',s*.1,s*.2,{size:s*.28,color:'#d43b3b',stroke:'#f6f1e1'});c.restore();},
 folder(c,s,o){const col=o.color||'#e0a93a',w=s*.9,h=s*.7;rr(c,-w/2,-h/2-s*.06,w*.42,h*.3,s*.06);ink(c,shade(col,-.2),2.5);rr(c,-w/2,-h/2+s*.04,w,h,s*.08);ink(c,col,2.5);rr(c,-w*.34,-h*.05,w*.68,h*.3,s*.04);ink(c,'#f6f1e1',2);},
 box(c,s,o){const w=s*.9,h=s*.7;rr(c,-w/2,-h/2,w,h,s*.06);ink(c,'#c9944f',2.5);c.fillStyle='#e6c58d';c.fillRect(-s*.07,-h/2+1.5,s*.14,h-3);c.fillStyle='#f6f1e1';rr(c,-w*.36,h*.02,w*.3,h*.26,3);c.fill();c.strokeStyle=INK;c.lineWidth=1.5;c.stroke();},
 pencil(c,s,o){c.rotate(-.7);const col=o.color||'#f0c336',w=s*.2,l=s*.95;rr(c,-l/2,-w/2,l*.72,w,2);ink(c,col,2.5);c.beginPath();c.moveTo(l*.22,-w/2);c.lineTo(l/2,0);c.lineTo(l*.22,w/2);c.closePath();ink(c,'#f1d3a0',2.5);c.beginPath();c.moveTo(l*.4,-w*.22);c.lineTo(l/2,0);c.lineTo(l*.4,w*.22);c.closePath();ink(c,INK,1);rr(c,-l/2-s*.1,-w/2,s*.14,w,2);ink(c,'#e87a8a',2.5);},
 notebook(c,s,o){const col=o.color||'#4b86d6',w=s*.72,h=s*.92;rr(c,-w/2,-h/2,w,h,s*.07);ink(c,col,2.5);c.fillStyle='#f6f1e1';rr(c,-w*.2,-h*.3,w*.55,h*.34,3);c.fill();c.strokeStyle=INK;c.lineWidth=1.5;c.stroke();c.fillStyle=INK;for(let i=0;i<5;i++){c.beginPath();c.arc(-w/2+4,-h*.38+i*h*.19,2.4,0,TAU);c.fill();}},
 ruler(c,s,o){c.rotate(.5);const w=s*.26,l=s*1.0;rr(c,-l/2,-w/2,l,w,3);ink(c,o.color||'#7fd1e8',2.5);c.strokeStyle=INK;c.lineWidth=1.4;for(let i=0;i<10;i++){const x=-l/2+6+i*(l-12)/9;c.beginPath();c.moveTo(x,-w/2);c.lineTo(x,-w/2+(i%2?w*.3:w*.5));c.stroke();}},
 glass(c,s,o){const col=o.color||'#7fe0ff';c.beginPath();c.moveTo(-s*.32,-s*.42);c.lineTo(s*.32,-s*.42);c.lineTo(s*.22,s*.42);c.lineTo(-s*.22,s*.42);c.closePath();ink(c,'rgba(220,245,255,.55)',2.5);c.save();c.clip();c.fillStyle=col;c.fillRect(-s,-s*.05,s*2,s);c.restore();c.beginPath();c.moveTo(-s*.32,-s*.42);c.lineTo(s*.32,-s*.42);c.lineTo(s*.22,s*.42);c.lineTo(-s*.22,s*.42);c.closePath();ink(c,null,2.5);c.fillStyle='rgba(255,255,255,.5)';c.fillRect(-s*.22,-s*.36,s*.06,s*.5);},
 bottle(c,s,o){const col=o.color||'#4fd69a';c.beginPath();c.moveTo(-s*.1,-s*.46);c.lineTo(s*.1,-s*.46);c.lineTo(s*.1,-s*.22);c.quadraticCurveTo(s*.3,-s*.12,s*.3,s*.1);c.lineTo(s*.3,s*.42);c.lineTo(-s*.3,s*.42);c.lineTo(-s*.3,s*.1);c.quadraticCurveTo(-s*.3,-s*.12,-s*.1,-s*.22);c.closePath();ink(c,col,2.5);c.fillStyle='#f6f1e1';rr(c,-s*.24,s*.06,s*.48,s*.22,3);c.fill();c.strokeStyle=INK;c.lineWidth=1.5;c.stroke();rr(c,-s*.12,-s*.52,s*.24,s*.1,2);ink(c,'#c0392b',2);c.fillStyle='rgba(255,255,255,.4)';c.fillRect(-s*.22,-s*.02,s*.06,s*.3);},
 ice(c,s,o){c.rotate(.2);rr(c,-s*.3,-s*.3,s*.6,s*.6,s*.1);ink(c,'rgba(190,240,255,.85)',2.5);c.strokeStyle='rgba(255,255,255,.8)';c.lineWidth=2;c.beginPath();c.moveTo(-s*.18,-s*.12);c.lineTo(-s*.04,-s*.2);c.moveTo(-s*.18,s*.06);c.lineTo(-s*.1,s*.0);c.stroke();},
 flower(c,s,o){const col=o.color||'#ff6fa5';c.beginPath();c.moveTo(0,s*.1);c.lineTo(0,s*.46);c.lineWidth=5;c.strokeStyle=INK;c.stroke();c.lineWidth=2.5;c.strokeStyle='#3fa14a';c.stroke();for(let i=0;i<6;i++){c.save();c.rotate(i*TAU/6);c.beginPath();c.ellipse(0,-s*.2,s*.12,s*.2,0,0,TAU);ink(c,col,2.2);c.restore();}c.beginPath();c.arc(0,0,s*.11,0,TAU);ink(c,'#ffd84a',2.2);},
 sapling(c,s,o){rr(c,-s*.06,s*.05,s*.12,s*.4,2);ink(c,'#8a5a2b',2.5);for(const [x,y,r] of [[0,-s*.22,.26],[-s*.18,-s*.04,.2],[s*.18,-s*.04,.2]]){c.beginPath();c.arc(x,y,s*r,0,TAU);ink(c,o.color||'#3f9d4a',2.5);}},
 grass(c,s,o){c.fillStyle=o.color||'#4fb04a';for(let i=-2;i<=2;i++){c.beginPath();c.moveTo(i*s*.12-s*.07,s*.42);c.quadraticCurveTo(i*s*.12,-s*.1-(2-Math.abs(i))*s*.1,i*s*.15+s*.04,-s*.45+Math.abs(i)*s*.12);c.quadraticCurveTo(i*s*.12+s*.1,-s*.1,i*s*.12+s*.07,s*.42);c.closePath();ink(c,o.color||'#4fb04a',2);}},
 seeds(c,s,o){rr(c,-s*.3,-s*.44,s*.6,s*.88,s*.06);ink(c,o.color||'#e6a23c',2.5);c.fillStyle='#f6f1e1';rr(c,-s*.22,-s*.3,s*.44,s*.34,4);c.fill();c.strokeStyle=INK;c.lineWidth=1.5;c.stroke();c.save();c.translate(0,-s*.13);c.scale(.55,.55);ICONS.flower(c,s*.5,{});c.restore();for(let i=0;i<3;i++){c.beginPath();c.ellipse(-s*.12+i*s*.12,s*.22,s*.035,s*.06,.5,0,TAU);ink(c,'#6b4a1f',1.4);}},
 can(c,s,o){rr(c,-s*.3,-s*.18,s*.5,s*.5,s*.08);ink(c,o.color||'#3d86d6',2.5);c.beginPath();c.moveTo(s*.2,-s*.02);c.lineTo(s*.5,-s*.3);c.lineTo(s*.56,-s*.22);c.lineTo(s*.2,s*.12);c.closePath();ink(c,o.color||'#3d86d6',2.5);c.beginPath();c.arc(-s*.05,-s*.18,s*.18,Math.PI,0);c.lineWidth=5;c.strokeStyle=INK;c.stroke();c.lineWidth=2.4;c.strokeStyle=shade(o.color||'#3d86d6',.3);c.stroke();},
 sack(c,s,o){c.beginPath();c.moveTo(-s*.12,-s*.44);c.lineTo(s*.12,-s*.44);c.lineTo(s*.2,-s*.26);c.quadraticCurveTo(s*.46,-s*.1,s*.4,s*.3);c.quadraticCurveTo(s*.3,s*.46,0,s*.46);c.quadraticCurveTo(-s*.3,s*.46,-s*.4,s*.3);c.quadraticCurveTo(-s*.46,-s*.1,-s*.2,-s*.26);c.closePath();ink(c,o.color||'#b9893f',2.5);c.fillStyle='#f6f1e1';rr(c,-s*.2,-s*.02,s*.4,s*.24,3);c.fill();c.strokeStyle=INK;c.lineWidth=1.5;c.stroke();c.beginPath();c.moveTo(-s*.13,-s*.3);c.lineTo(s*.13,-s*.3);c.lineWidth=4;c.strokeStyle='#c0392b';c.stroke();},
 glove(c,s,o){c.beginPath();c.moveTo(-s*.28,s*.44);c.lineTo(-s*.3,-s*.02);c.quadraticCurveTo(-s*.34,-s*.14,-s*.22,-s*.18);c.lineTo(-s*.2,-s*.36);c.quadraticCurveTo(-s*.16,-s*.46,-s*.1,-s*.36);c.lineTo(-s*.08,-s*.44);c.quadraticCurveTo(0,-s*.52,s*.06,-s*.42);c.lineTo(s*.08,-s*.4);c.quadraticCurveTo(s*.16,-s*.46,s*.2,-s*.36);c.lineTo(s*.22,-s*.2);c.quadraticCurveTo(s*.3,-s*.22,s*.34,-s*.1);c.lineTo(s*.24,s*.12);c.lineTo(s*.26,s*.44);c.closePath();ink(c,o.color||'#f0b23a',2.5);c.fillStyle='#d98d1e';c.fillRect(-s*.28,s*.28,s*.54,s*.14);},
 shovel(c,s,o){c.rotate(.6);c.beginPath();c.moveTo(0,-s*.5);c.lineTo(0,s*.1);c.lineWidth=7;c.strokeStyle=INK;c.stroke();c.lineWidth=3.4;c.strokeStyle='#b07a3c';c.stroke();c.beginPath();c.moveTo(-s*.2,s*.06);c.lineTo(s*.2,s*.06);c.quadraticCurveTo(s*.22,s*.4,0,s*.5);c.quadraticCurveTo(-s*.22,s*.4,-s*.2,s*.06);ink(c,'#9fb0bd',2.5);},
 rake(c,s,o){c.rotate(.5);c.beginPath();c.moveTo(0,-s*.5);c.lineTo(0,s*.12);c.lineWidth=7;c.strokeStyle=INK;c.stroke();c.lineWidth=3.4;c.strokeStyle='#b07a3c';c.stroke();rr(c,-s*.3,s*.1,s*.6,s*.08,2);ink(c,'#9fb0bd',2.4);for(let i=0;i<5;i++){c.beginPath();c.moveTo(-s*.26+i*s*.13,s*.18);c.lineTo(-s*.26+i*s*.13,s*.42);c.lineWidth=2.4;c.strokeStyle=INK;c.stroke();}},
 leaf(c,s,o){c.rotate(o.rot||-.6);c.beginPath();c.moveTo(0,-s*.46);c.quadraticCurveTo(s*.4,-s*.1,0,s*.46);c.quadraticCurveTo(-s*.4,-s*.1,0,-s*.46);ink(c,o.color||'#6bbf4a',2.5);c.beginPath();c.moveTo(0,-s*.36);c.lineTo(0,s*.4);c.lineWidth=1.6;c.strokeStyle=INK;c.stroke();},
 bag(c,s,o){c.beginPath();c.moveTo(-s*.1,-s*.4);c.quadraticCurveTo(-s*.46,-s*.1,-s*.36,s*.3);c.quadraticCurveTo(-s*.2,s*.46,0,s*.44);c.quadraticCurveTo(s*.2,s*.46,s*.36,s*.3);c.quadraticCurveTo(s*.46,-s*.1,s*.1,-s*.4);c.closePath();ink(c,o.color||'#2f3a46',2.5);c.beginPath();c.moveTo(-s*.14,-s*.4);c.lineTo(s*.14,-s*.4);c.lineWidth=4;c.strokeStyle='#c0392b';c.stroke();c.fillStyle='rgba(255,255,255,.18)';c.fillRect(-s*.24,-s*.1,s*.07,s*.3);},
 crumple(c,s,o){c.beginPath();for(let i=0;i<9;i++){const a=i*TAU/9,r=s*(.34+(i%2)*.08);c.lineTo(Math.cos(a)*r,Math.sin(a)*r);}c.closePath();ink(c,o.color||'#f1ecdb',2.5);c.strokeStyle='#9aa7b8';c.lineWidth=1.4;c.beginPath();c.moveTo(-s*.18,-s*.1);c.lineTo(s*.1,-s*.18);c.moveTo(-s*.12,s*.12);c.lineTo(s*.18,s*.06);c.stroke();},
 vinyl(c,s,o){c.beginPath();c.arc(0,0,s*.46,0,TAU);ink(c,'#1b1b24',2.5);c.strokeStyle='rgba(255,255,255,.12)';c.lineWidth=1.4;for(const r of [.38,.3,.22]){c.beginPath();c.arc(0,0,s*r,0,TAU);c.stroke();}c.beginPath();c.arc(0,0,s*.15,0,TAU);ink(c,o.color||'#ff5fd2',2);c.beginPath();c.arc(0,0,s*.03,0,TAU);c.fillStyle=INK;c.fill();},
 card(c,s,o){rr(c,-s*.46,-s*.3,s*.92,s*.6,s*.07);ink(c,o.color||'#5ff0ff',2.5);c.fillStyle='#f6f1e1';rr(c,-s*.38,-s*.18,s*.3,s*.26,3);c.fill();c.strokeStyle=INK;c.lineWidth=1.5;c.stroke();c.fillStyle=INK;c.fillRect(-s*.02,-s*.16,s*.34,s*.05);c.fillRect(-s*.02,-s*.04,s*.26,s*.05);txt(c,o.text||'',-s*.23,-s*.05,{size:s*.2,color:INK});},
 wrist(c,s,o){c.beginPath();c.ellipse(0,0,s*.4,s*.28,0,0,TAU);ink(c,o.color||'#ff5fd2',2.5);c.beginPath();c.ellipse(0,0,s*.26,s*.14,0,0,TAU);ink(c,'#0a0618',2);txt(c,o.text||'',0,-s*.31,{size:s*.16,color:'#fff',stroke:INK});},
 plate(c,s,o){c.beginPath();c.arc(0,0,s*.46,0,TAU);ink(c,o.color||'#46515e',2.5);c.beginPath();c.arc(0,0,s*.34,0,TAU);ink(c,shade(o.color||'#46515e',.12),2);c.beginPath();c.arc(0,0,s*.08,0,TAU);ink(c,'#10151b',2);txt(c,o.text||'',0,s*.22,{size:s*.16,color:'#fff'});},
 ball(c,s,o){c.beginPath();c.arc(0,0,s*.44,0,TAU);ink(c,o.color||'#e8742a',2.5);c.strokeStyle=INK;c.lineWidth=1.8;c.beginPath();c.moveTo(-s*.44,0);c.lineTo(s*.44,0);c.moveTo(0,-s*.44);c.lineTo(0,s*.44);c.moveTo(-s*.31,-s*.31);c.quadraticCurveTo(0,-s*.1,s*.31,-s*.31);c.moveTo(-s*.31,s*.31);c.quadraticCurveTo(0,s*.1,s*.31,s*.31);c.stroke();},
 drop(c,s,o){c.beginPath();c.moveTo(0,-s*.46);c.quadraticCurveTo(s*.42,s*.04,s*.3,s*.26);c.quadraticCurveTo(s*.16,s*.46,0,s*.46);c.quadraticCurveTo(-s*.16,s*.46,-s*.3,s*.26);c.quadraticCurveTo(-s*.42,s*.04,0,-s*.46);ink(c,o.color||'#52b8ff',2.5);c.fillStyle='rgba(255,255,255,.5)';c.beginPath();c.ellipse(-s*.1,s*.08,s*.05,s*.12,.3,0,TAU);c.fill();}
};
export function icon(c,name,x,y,s,o={}){const f=ICONS[name];if(!f)return;c.save();c.translate(x,y);if(o.rot)c.rotate(o.rot);if(o.alpha!=null)c.globalAlpha=o.alpha;f(c,s,o);c.restore();}
export const ICON_NAMES=Object.keys(ICONS);

// --- Arrastre --------------------------------------------------------------
// Una pieza arrastrable sigue al puntero sin retraso ni salto: se conserva el
// punto exacto donde se agarró y, al soltar, vuelve a casa con una curva suave.
export function piece(x,y,extra={}){return {x,y,hx:x,hy:y,vx:0,vy:0,lift:0,drag:false,gone:false,...extra};}
export function stepPiece(p,dt,speed=14){
 if(p.drag){p.lift=Math.min(1,p.lift+dt*10);return false;}
 p.lift=Math.max(0,p.lift-dt*8);
 const dx=p.hx-p.x,dy=p.hy-p.y;
 if(Math.abs(dx)<.4&&Math.abs(dy)<.4){p.x=p.hx;p.y=p.hy;return p.lift>0;}
 const k=1-Math.exp(-speed*dt);p.x+=dx*k;p.y+=dy*k;return true;
}
// Registra una zona agarrable. `onDrop(piece,point)` decide si se acepta.
export function grab(api,p,w,h,{onDown,onDrop,pad=8}={}){
 api.zone(p.x-w/2-pad,p.y-h/2-pad,w+pad*2,h+pad*2,{
  down:pt=>{p.drag=true;p.gx=p.x-pt.x;p.gy=p.y-pt.y;onDown?.(p,pt);},
  move:pt=>{p.x=clamp(pt.x+p.gx,w*.3,W-w*.3);p.y=clamp(pt.y+p.gy,h*.3,H-h*.3);},
  up:(pt,st,cancel)=>{p.drag=false;if(cancel)return;onDrop?.(p,pt);}
 });
}
export const inRect=(p,r)=>p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h;
export const near=(a,b,r)=>Math.hypot(a.x-b.x,a.y-b.y)<=r;
