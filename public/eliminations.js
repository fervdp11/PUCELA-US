import {COLORS} from './content.js';
import {drawRobot} from './characters.js';
const clamp=v=>Math.max(0,Math.min(1,v)),ease=v=>{v=clamp(v);return v*v*(3-2*v);},TAU=Math.PI*2;
function shape(c,x,y,w,h,r,fill){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();c.strokeStyle='#1b3045';c.lineWidth=3;c.stroke();}
export function drawBody(c,b,time){
 const age=b.at===undefined?1000:Math.max(0,time-b.at),land=ease((age-450)/380),color=COLORS[b.color]||COLORS[0];
 c.save();c.translate(b.x,b.y);c.globalAlpha=clamp((age-400)/220);c.fillStyle='#07182b50';c.beginPath();c.ellipse(0,7,31,12,0,0,TAU);c.fill();c.translate(0,-(1-land)*12);c.rotate((1-land)*-.5);
 shape(c,-25,-13,48,26,11,color);shape(c,-29,-9,15,18,5,'#3f5364');shape(c,-5,-16,13,27,5,color);
 // Hueso claro y redondeado: silueta cartoon, sin gore.
 c.save();c.translate(19,-9);c.rotate(.22);shape(c,-5,-13,10,22,4,'#edf4df');c.fillStyle='#faffed';for(const x of [-5,5]){c.beginPath();c.arc(x,-13,6,0,TAU);c.fill();c.strokeStyle='#314451';c.lineWidth=2;c.stroke();}c.restore();c.restore();
}
export function killPose(age,variant=0){const approach=ease(age/280),strike=ease((age-260)/140),recover=ease((age-680)/280),fall=ease((age-470)/430);return {approach,strike,recover,fall,variant:variant%4,impact:age>=360&&age<640};}
export function drawKillScene(c,fx,time,age,canSee=()=>true){
 const miss=fx.kind==='miss',p=killPose(age,fx.variant||0);if(miss)p.fall=0;
 // Rol Latasa: la víctima esquiva de lado y el golpe corta el aire.
 const dodge=miss?Math.sin(clamp((age-180)/620)*Math.PI):0;
 const dx=fx.victimX-fx.x,dy=fx.victimY-fx.y,len=Math.max(1,Math.hypot(dx,dy)),ux=dx/len,uy=dy/len,dir=dx<0?-1:1,reach=Math.max(0,len-44),ax=fx.x+ux*reach*p.approach*(1-p.recover*.5),ay=fx.y+uy*reach*p.approach*(1-p.recover*.5);
 const vx=fx.victimX-uy*dodge*42*(dir||1),vy=fx.victimY+ux*dodge*30-Math.sin(dodge*Math.PI)*10;
 if(canSee({x:fx.victimX,y:fx.victimY})){c.save();c.globalAlpha=1-p.fall;c.translate(vx+ux*p.fall*20,vy+uy*p.fall*12);c.rotate(p.fall*dir*1.15);drawRobot(c,{...fx.victim,alive:true},0,0,.84*(1-p.fall*.13),time,p.fall>0,false);c.restore();}
 const attacker={x:ax,y:ay};if(!canSee(attacker))return {attacker,visible:false};
 c.save();c.translate(ax,ay);c.rotate(Math.sin(p.strike*Math.PI)*dir*.1);drawRobot(c,{...fx.attacker,alive:true},0,0,.84,time,p.approach<1,false);c.restore();
 const hx=ax+dir*16,hy=ay-31,tx=fx.victimX,ty=fx.victimY-33,extension=p.strike*(1-p.recover),ex=hx+(tx-hx)*extension,ey=hy+(ty-hy)*extension;
 c.save();c.lineCap='round';c.lineJoin='round';
 if(p.variant===0){c.strokeStyle='#f6eadb';c.lineWidth=7;c.beginPath();c.moveTo(hx,hy);c.lineTo(ex,ey);c.stroke();c.strokeStyle='#5e98b6';c.lineWidth=2;c.stroke();c.strokeStyle='#b8a16e';c.lineWidth=10;c.beginPath();c.moveTo(hx-dir*10,hy+4);c.lineTo(hx+dir*2,hy-2);c.stroke();}
 else if(p.variant===1){shape(c,ax+dir*3-10,ay-56,20,18,7,'#202d43');c.strokeStyle='#ed86ba';c.lineWidth=9;c.beginPath();c.moveTo(ax+dir*11,ay-48);c.quadraticCurveTo((ax+ex)/2,ay-70-(1-p.strike)*20,ex,ey);c.stroke();c.fillStyle='#f0c8dc';c.beginPath();c.moveTo(ex,ey-6);c.lineTo(ex+dir*9,ey);c.lineTo(ex,ey+6);c.fill();}
 else if(p.variant===2){shape(c,hx-dir*4-10,hy-9,28,16,5,'#8c88d5');shape(c,hx+dir*14-5,hy-6,10,10,3,'#eac56e');if(p.impact){c.strokeStyle='#a3f4ef';c.lineWidth=5;c.beginPath();c.moveTo(hx+dir*22,hy);c.lineTo(tx,ty);c.stroke();}}
 else{const spin=extension*Math.PI*7;c.save();c.translate(ex,ey);c.rotate(spin);c.fillStyle='#182d40';c.strokeStyle='#bba4ee';c.lineWidth=3;c.beginPath();c.ellipse(0,0,17,12,0,0,TAU);c.fill();c.stroke();c.fillStyle='#f2bbd8';c.beginPath();c.arc(0,0,5,0,TAU);c.fill();c.restore();}
 if(miss){if(age>300&&age<1100){const a=clamp((age-300)/180)*(1-clamp((age-900)/200));c.globalAlpha=a;c.strokeStyle='#e8f6ff';c.lineWidth=3;for(let k=0;k<3;k++){c.beginPath();c.arc(tx,ty,18+k*9,-.8+dir*.2,.8+dir*.2);c.stroke();}c.font='900 22px Inter,Segoe UI,sans-serif';c.textAlign='center';c.lineWidth=5;c.strokeStyle='#1b2433';const ly=ty-48-clamp((age-300)/500)*16;c.strokeText('¡FALLO!',tx,ly);c.fillStyle='#ffd65a';c.fillText('¡FALLO!',tx,ly);c.globalAlpha=1;}c.restore();return {attacker,visible:true};}
 if(p.impact){c.strokeStyle=p.variant===3?'#b3edee':'#ffdb88';c.lineWidth=3;for(let k=0;k<7;k++){const a=k*TAU/7+age/180,r=15+(age-360)*.05;c.beginPath();c.moveTo(tx+Math.cos(a)*r,ty+Math.sin(a)*r);c.lineTo(tx+Math.cos(a)*(r+9),ty+Math.sin(a)*(r+9));c.stroke();}}
 c.restore();return {attacker,visible:true};
}
