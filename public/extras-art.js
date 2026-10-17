// Recompensas del pase dibujadas sobre el personaje: mascotas que le siguen,
// efectos de partículas y animaciones de reposo. Todo en coordenadas locales del
// personaje (pies en 0,0, cabeza hacia -82), así escala con él en cualquier vista.
const TAU=Math.PI*2;
function oval(c,x,y,rx,ry,fill,stroke,w=2){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.stroke();}}
function star(c,x,y,r,fill,points=5){c.beginPath();for(let i=0;i<points*2;i++){const a=-Math.PI/2+i*Math.PI/points,d=i%2?r*.45:r;i?c.lineTo(x+Math.cos(a)*d,y+Math.sin(a)*d):c.moveTo(x+Math.cos(a)*d,y+Math.sin(a)*d);}c.closePath();c.fillStyle=fill;c.fill();}
// Fase de la animación de reposo: se dispara cada siete segundos, dura 1,4 s.
export function emotePhase(p,time,moving){if(!p.emote||moving)return -1;const t=(time+(p.color||0)*977)%7000;return t<1400?t/1400:-1;}
export function applyEmote(c,p,k){
 if(k<0)return;
 if(p.emote===2){const h=Math.sin(k*Math.PI);c.translate(0,-h*16);c.scale(1+(1-h)*.06*(k<.15||k>.85?1:0),1);}
 else if(p.emote===3)c.scale(Math.cos(k*TAU)||.02,1);
 else if(p.emote===4){c.rotate(Math.sin(k*TAU*2)*.16);c.translate(Math.sin(k*TAU*2)*3,0);}
}
export function drawEmoteOverlay(c,p,k,accent){
 if(k<0)return;
 if(p.emote===1){const a=-1.9+Math.sin(k*TAU*3)*.45;c.save();c.translate(20,-44);c.rotate(a);c.beginPath();c.roundRect(-6,-28,12,30,6);c.fillStyle=accent;c.fill();c.strokeStyle='#172638';c.lineWidth=3;c.stroke();oval(c,0,-30,7,7,'#f1d1b5','#172638',2.5);c.restore();}
 else if(p.emote===5){const d=Math.abs(Math.sin(k*TAU*3))*10;oval(c,-6-d,-34,6,6,'#f1d1b5','#172638',2);oval(c,6+d,-34,6,6,'#f1d1b5','#172638',2);if(d<3)for(let i=0;i<5;i++){const a=i*TAU/5;star(c,Math.cos(a)*16,-42+Math.sin(a)*12,4,'#ffe08a');}}
}
const PET_COLORS=[null,'#8a6748','#f3f0e2','#a7adb8','#7fb7c9','#f6f7ff','#6dbb5e','#c07a43','#f0a5d0'];
export function drawPet(c,p,time,moving,shadows=true){
 const kind=p.pet||0;if(!kind)return;
 const side=-(p.facing||1),hop=moving?Math.abs(Math.sin(time/120))*6:Math.sin(time/500+(p.color||0))*1.5;
 c.save();c.translate(side*40,-2-hop);c.scale(-side*.62,.62);
 if(shadows)oval(c,0,4+hop/.62,18,5,'#0a142a30');
 const col=PET_COLORS[kind];
 if(kind===1){oval(c,0,-14,20,15,col,'#3d2c1f');oval(c,-17,-14,7,6,'#e88d9a','#3d2c1f');oval(c,-8,-20,2,2,'#1b1b1b');for(const x of [-10,6])oval(c,x,-1,5,3,'#e9c9a0');}
 else if(kind===2){oval(c,2,-13,18,13,col,'#7c7a68');oval(c,-12,-26,10,10,col,'#7c7a68');c.beginPath();c.moveTo(-21,-27);c.lineTo(-30,-24);c.lineTo(-21,-21);c.closePath();c.fillStyle='#f2b04a';c.fill();oval(c,-14,-29,1.8,2,'#1b1b1b');}
 else if(kind===3){oval(c,2,-12,17,12,col,'#4c5260');oval(c,-12,-26,11,10,col,'#4c5260');for(const x of [-19,-6]){c.beginPath();c.moveTo(x,-31);c.lineTo(x+3,-41);c.lineTo(x+7,-32);c.fillStyle=col;c.fill();}c.strokeStyle='#4c5260';c.lineWidth=4;c.beginPath();c.moveTo(18,-14);c.quadraticCurveTo(30,-24+Math.sin(time/300)*5,24,-34);c.stroke();oval(c,-16,-27,1.8,2.2,'#1b1b1b');oval(c,-9,-27,1.8,2.2,'#1b1b1b');}
 else if(kind===4){c.beginPath();c.roundRect(-14,-34,28,24,6);c.fillStyle=col;c.fill();c.strokeStyle='#2c4b57';c.lineWidth=2.5;c.stroke();oval(c,-6,-23,3.5,3.5,'#e9fffb');oval(c,6,-23,3.5,3.5,'#e9fffb');c.beginPath();c.moveTo(0,-34);c.lineTo(0,-42);c.stroke();oval(c,0,-44,3,3,(Math.sin(time/200)>0)?'#ff7185':'#ffc65c');c.beginPath();c.roundRect(-10,-10,20,8,3);c.fillStyle='#2c4b57';c.fill();}
 else if(kind===5){c.globalAlpha*=.85;c.beginPath();c.moveTo(-15,-4);c.quadraticCurveTo(-18,-38,0,-38);c.quadraticCurveTo(18,-38,15,-4);for(let i=0;i<4;i++)c.quadraticCurveTo(10-i*8,-10,7-i*8,-2);c.closePath();c.fillStyle=col;c.fill();c.strokeStyle='#b8c6e8';c.lineWidth=2;c.stroke();oval(c,-5,-24,2.5,3.5,'#2c3550');oval(c,5,-24,2.5,3.5,'#2c3550');}
 else if(kind===6){oval(c,0,-12,18,12,col,'#2f6a33');oval(c,-8,-23,6,6,col,'#2f6a33');oval(c,8,-23,6,6,col,'#2f6a33');oval(c,-8,-24,2.5,2.5,'#1b1b1b');oval(c,8,-24,2.5,2.5,'#1b1b1b');c.strokeStyle='#2f6a33';c.lineWidth=2;c.beginPath();c.arc(0,-14,6,.3,Math.PI-.3);c.stroke();}
 else if(kind===7){c.save();c.rotate(-.3);oval(c,16,-26,9,18,'#a65f30','#5a3a22');c.restore();oval(c,0,-12,13,11,col,'#5a3a22');oval(c,-10,-24,9,9,col,'#5a3a22');oval(c,-14,-33,3,5,col);oval(c,-13,-26,1.8,2,'#1b1b1b');}
 else if(kind===8){const w=Math.sin(time/260)*3;c.beginPath();c.arc(0,-24,15,Math.PI,0);c.closePath();c.fillStyle=col;c.fill();c.strokeStyle='#b0578a';c.lineWidth=2;c.stroke();c.strokeStyle='#e486b8';c.lineWidth=2.5;for(const x of [-10,-3,4,11]){c.beginPath();c.moveTo(x,-24);c.quadraticCurveTo(x+w,-14,x-w,-4);c.stroke();}oval(c,-5,-29,2,2.4,'#5a1f42');oval(c,5,-29,2,2.4,'#5a1f42');}
 c.restore();
}
export function drawEffect(c,p,time){
 const kind=p.effect||0;if(!kind)return;
 for(let i=0;i<6;i++){const t=time/1000+i*1.7,k=(t*.45)%1,a=i*TAU/6+t*.8,r=26+Math.sin(t*1.3)*6,x=Math.cos(a)*r,y=-44+Math.sin(a)*r*.75-k*14;
  c.save();c.globalAlpha*=Math.sin(k*Math.PI)*.9;
  if(kind===1)star(c,x,y,4,'#ffe58a',4);
  else if(kind===2){c.translate(x,y);c.rotate(a);oval(c,0,0,5,2.6,['#7fbf5a','#d9a441','#c7652f'][i%3]);}
  else if(kind===3)oval(c,x,y,3+i%3,3+i%3,'#d8f3ff33','#bfe8ff',1.4);
  else if(kind===4)star(c,x,y,5,['#ffd76a','#fff4c2','#b8d9ff'][i%3]);
  else if(kind===5){c.fillStyle=['#b594ff','#61e5c6','#ff7185'][i%3];c.font='bold 12px sans-serif';c.textAlign='center';c.fillText(i%2?'♪':'♫',x,y);}
  else if(kind===6){c.strokeStyle='#eaf6ff';c.lineWidth=1.5;for(let j=0;j<3;j++){const b=j*Math.PI/3;c.beginPath();c.moveTo(x-Math.cos(b)*4,y-Math.sin(b)*4);c.lineTo(x+Math.cos(b)*4,y+Math.sin(b)*4);c.stroke();}}
  c.restore();}
}
