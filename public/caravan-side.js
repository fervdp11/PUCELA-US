// Caravana de PUCELA US vista de lado: UNA sola función de dibujo compartida por
// el menú y por la bajada previa a la revelación de roles, para que la caravana
// tenga exactamente los mismos colores en todo el juego.
const TAU=Math.PI*2;
const lerp=(a,b,t)=>a+(b-a)*t;
function mix(a,b,t){const p=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16));const x=p(a),y=p(b);return '#'+x.map((v,i)=>Math.round(lerp(v,y[i],t)).toString(16).padStart(2,'0')).join('');}
function oval(c,x,y,rx,ry,fill,stroke,w=2){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.stroke();}}
function box(c,x,y,w,h,r,fill,stroke,lw=3){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}}
export function drawCaravanSide(c,x,y,s,time,dusk){
 c.save();c.translate(x,y);c.scale(s,s);
 oval(c,0,8,250,22,'#0b1a2633');
 // Toldo extendido a la izquierda.
 c.fillStyle='#2f6f73';c.beginPath();c.moveTo(-230,-196);c.lineTo(-360,-150);c.lineTo(-360,-138);c.lineTo(-230,-178);c.closePath();c.fill();
 for(let i=0;i<6;i++){c.fillStyle=i%2?'#f6efe0':'#e0704f';c.beginPath();c.moveTo(-230-i*22,-196+i*7.6);c.lineTo(-252-i*22,-188+i*7.6);c.lineTo(-252-i*22,-176+i*7.6);c.lineTo(-230-i*22,-184+i*7.6);c.closePath();c.fill();}
 c.strokeStyle='#4f5d63';c.lineWidth=4;c.beginPath();c.moveTo(-352,-140);c.lineTo(-352,0);c.stroke();
 // Carrocería.
 box(c,-240,-210,470,190,46,'#f3e8cf','#2a3a44',5);
 box(c,-240,-112,470,26,0,'#2f6f73');box(c,-240,-82,470,8,0,'#e0704f');
 box(c,150,-196,74,96,22,'#f3e8cf','#2a3a44',4);
 // Ventanas con luz cálida al atardecer.
 const glow=mix('#9fd6e8','#ffd47a',dusk);
 for(const [wx,ww] of [[-205,92],[-90,92]]){box(c,wx,-186,ww,58,12,glow,'#2a3a44',4);c.strokeStyle='#ffffff88';c.lineWidth=3;c.beginPath();c.moveTo(wx+12,-176);c.lineTo(wx+32,-176);c.stroke();}
 box(c,166,-184,48,52,12,mix('#9fd6e8','#ffe2a3',dusk),'#2a3a44',4);
 // Puerta y escalón.
 box(c,30,-188,70,170,12,'#e6d6b5','#2a3a44',4);box(c,46,-172,38,44,8,glow,'#2a3a44',3);oval(c,90,-104,5,5,'#c79a3c');box(c,22,-16,86,12,4,'#8a9aa0','#2a3a44',3);
 // Rótulo.
 c.fillStyle='#2a3a44';c.font='900 26px system-ui,sans-serif';c.textAlign='center';c.fillText('PUCELA US',-120,-50);
 // Baca con maletas.
 box(c,-200,-232,300,10,4,'#4f5d63');for(const [bx,bw,bh,col] of [[-180,70,30,'#c46a4a'],[-100,56,24,'#e8b54f'],[-36,80,34,'#5b8fb0']])box(c,bx,-232-bh,bw,bh,6,col,'#2a3a44',3);
 // Ruedas.
 for(const wx of [-150,140]){oval(c,wx,-14,40,40,'#26313a');oval(c,wx,-14,18,18,'#b9c2c6','#26313a',4);c.save();c.translate(wx,-14);c.rotate(time/2000);c.strokeStyle='#26313a';c.lineWidth=3;for(let i=0;i<4;i++){c.rotate(TAU/4);c.beginPath();c.moveTo(0,0);c.lineTo(16,0);c.stroke();}c.restore();}
 // Faro.
 oval(c,226,-64,9,12,dusk>.4?'#fff2b0':'#e9e3c8','#2a3a44',3);
 c.restore();
}

// Puerta de la caravana abierta (bajada de los jugadores): mismo hueco, mismos
// colores de hoja (#e6d6b5) y contorno (#2a3a44) que la puerta cerrada del menú.
export const CARAVAN_DOOR={x:30,y:-188,w:70,h:170};
export function drawCaravanDoorOpen(c,x,y,s){
 const d=CARAVAN_DOOR;c.save();c.translate(x,y);c.scale(s,s);
 const inner=c.createLinearGradient(0,d.y,0,d.y+d.h);inner.addColorStop(0,'#ffe9a8');inner.addColorStop(1,'#6a4a32');
 box(c,d.x,d.y,d.w,d.h,12,inner,'#2a3a44',4);
 // Hoja abatida hacia fuera, girada sobre la bisagra izquierda.
 c.fillStyle='#e6d6b5';c.beginPath();c.moveTo(d.x-2,d.y+3);c.lineTo(d.x-40,d.y+16);c.lineTo(d.x-40,d.y+d.h-10);c.lineTo(d.x-2,d.y+d.h-2);c.closePath();c.fill();c.strokeStyle='#2a3a44';c.lineWidth=4;c.stroke();
 c.fillStyle='#9fd6e8';c.beginPath();c.moveTo(d.x-10,d.y+22);c.lineTo(d.x-32,d.y+28);c.lineTo(d.x-32,d.y+66);c.lineTo(d.x-10,d.y+62);c.closePath();c.fill();c.lineWidth=3;c.stroke();
 oval(c,d.x-34,d.y+86,4,4,'#c79a3c');
 c.restore();
}
