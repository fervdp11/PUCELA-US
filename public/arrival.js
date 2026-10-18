import {drawRoadScene} from './journey.js';
// Cinemática original dibujada con vectores. Sin vídeos ni descargas externas.
const clamp=v=>Math.max(0,Math.min(1,v)),ease=v=>{v=clamp(v);return v*v*(3-2*v);};
export function arrivalPose(seconds){
 if(seconds<2.4)return {x:330,y:850-430*clamp(seconds/2.4),angle:0};
 if(seconds<3.6){const a=ease((seconds-2.4)/1.2)*Math.PI/2;return {x:410-80*Math.cos(a),y:420-80*Math.sin(a),angle:a};}
 return {x:410+300*ease((seconds-3.6)/2),y:340,angle:Math.PI/2};
}
// Encuadre de cobertura, nunca de encaje: el mundo llena cualquier formato.
export function arrivalCamera(width,height,seconds){
 const car=arrivalPose(seconds),settle=ease((seconds-4.7)/1.4);
 const scale=Math.max(width/1000,height/670)*(1+.15*settle);
 const followX=car.x+Math.sin(car.angle)*65,followY=car.y-Math.cos(car.angle)*90;
 return {scale,x:followX+(710-followX)*settle,y:followY+(270-followY)*settle};
}
function box(c,x,y,w,h,r,color){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function tree(c,x,y,t){c.fillStyle='#42674b22';c.beginPath();c.ellipse(x+8,y+13,28,20,0,0,Math.PI*2);c.fill();box(c,x-4,y,8,22,3,'#866341');for(const [dx,dy,r] of [[0,-8,23],[-14,-2,17],[13,0,18]]){c.fillStyle=dx<0?'#789465':'#94ab77';c.beginPath();c.arc(x+dx,y+dy+Math.sin(t+x)*1.2,r,0,Math.PI*2);c.fill();}}
export function drawArrival(canvas,seconds){drawRoadScene(canvas.getContext('2d'),canvas.width,canvas.height,seconds,{opening:true});}
export function mountArrival(root,canvas,skip,replay,onFinish=()=>{}){
 let frame=0,start=0,running=false;const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function finish(){if(!running)return;running=false;cancelAnimationFrame(frame);root.hidden=true;root.classList.remove('arriving');try{sessionStorage.setItem('sanagus.arrival','seen');}catch{}onFinish();}
 function tick(t){if(!running)return;const seconds=(t-start)/1000;const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);if(w!==canvas.width||h!==canvas.height){canvas.width=w;canvas.height=h;}drawArrival(canvas,seconds);root.classList.toggle('arriving',seconds>4.8);if(seconds>6.4)finish();else frame=requestAnimationFrame(tick);}
 function play(){if(reduced.matches){root.hidden=true;onFinish();return;}cancelAnimationFrame(frame);root.hidden=false;root.classList.remove('arriving');running=true;start=performance.now();skip.focus({preventScroll:true});frame=requestAnimationFrame(tick);}
 skip.addEventListener('click',finish);replay.addEventListener('click',play);root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();finish();}});
 let seen=false;try{seen=!!sessionStorage.getItem('sanagus.arrival')||!!sessionStorage.getItem('sanagus.session');}catch{}if(!seen)play();else root.hidden=true;
 return {finish,play};
}
