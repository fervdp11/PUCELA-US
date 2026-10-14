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
export function drawArrival(canvas,seconds){
 const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;c.clearRect(0,0,w,h);c.fillStyle='#edddbc';c.fillRect(0,0,w,h);
 const camera=arrivalCamera(w,h,seconds);c.save();c.translate(w/2,h/2);c.scale(camera.scale,camera.scale);c.translate(-camera.x,-camera.y);
 box(c,-3000,-3000,6000,6000,0,'#c9d4a4');box(c,244,-1800,174,4400,0,'#788181');box(c,258,-1800,146,4400,0,'#56666b');
 c.strokeStyle='#e9dcb6';c.lineWidth=3;c.setLineDash([28,25]);c.beginPath();c.moveTo(310,-1800+seconds*24%53);c.lineTo(310,2600);c.stroke();c.setLineDash([]);
 box(c,414,300,368,80,12,'#98a395');box(c,421,311,350,58,6,'#c0b89a');
 // Fachada, ventanas, tejado y puerta del colegio.
 box(c,585,106,306,220,12,'#80644b33');box(c,569,84,306,220,12,'#ead1a6');box(c,554,63,338,30,7,'#9f664c');box(c,562,88,322,8,0,'#be8760');
 for(let row=0;row<2;row++)for(let col=0;col<5;col++){const x=594+col*53,y=115+row*62;box(c,x,y,32,42,3,'#b3926e');box(c,x+3,y+3,26,35,1,'#9fc8c7');c.strokeStyle='#f8edcd';c.lineWidth=2;c.beginPath();c.moveTo(x+16,y+3);c.lineTo(x+16,y+38);c.moveTo(x+3,y+20);c.lineTo(x+29,y+20);c.stroke();}
 box(c,673,224,72,80,4,'#866746');box(c,680,231,58,65,2,'#486b62');c.strokeStyle='#e1b574';c.lineWidth=3;c.beginPath();c.moveTo(709,234);c.lineTo(709,296);c.stroke();
 box(c,605,195,231,25,4,'#577465');c.fillStyle='#fff4d8';c.font='bold 15px Georgia';c.textAlign='center';c.fillText('COLEGIO SANAGUS',721,212);
 box(c,531,337,27,56,3,'#957152');box(c,527,336,35,8,2,'#c89e6a');box(c,528,276,35,8,2,'#c89e6a');
 c.strokeStyle='#9b7856';c.lineWidth=4;for(let x=561;x<905;x+=16){c.beginPath();c.moveTo(x,417);c.lineTo(x,452);c.stroke();}c.beginPath();c.moveTo(562,427);c.lineTo(898,427);c.stroke();
 box(c,645,465,105,44,3,'#b68f68');c.fillStyle='#f5ebd2';c.font='bold 13px sans-serif';c.fillText('ENTRADA →',697,492);
 for(const [x,y] of [[150,120],[105,300],[165,510],[483,180],[489,535],[930,290],[819,553]])tree(c,x,y,seconds);
 for(let i=0;i<8;i++){c.fillStyle='#fff3bc';c.beginPath();c.arc(70+i*109,600+Math.sin(i)*8,2,0,Math.PI*2);c.fill();}
 // Segundo vehículo y nuestro coche con ruedas, reflejos y faros.
 box(c,353,550-seconds*165,30,54,9,'#bc785b');
 const car=arrivalPose(seconds);c.save();c.translate(car.x,car.y);c.rotate(car.angle);box(c,-22,-29,46,68,11,'#17252c30');box(c,-22,-24,6,17,2,'#35464b');box(c,16,-24,6,17,2,'#35464b');box(c,-22,13,6,17,2,'#35464b');box(c,16,13,6,17,2,'#35464b');box(c,-20,-36,40,72,12,'#d89059');box(c,-17,-30,34,14,5,'#e8b376');box(c,-15,-13,30,20,5,'#bed7cd');box(c,-15,18,30,9,3,'#466969');box(c,-15,-35,9,4,2,'#fff1bf');box(c,6,-35,9,4,2,'#fff1bf');box(c,-14,31,8,3,1,'#bb6551');box(c,6,31,8,3,1,'#bb6551');c.restore();
 c.restore();
}
export function mountArrival(root,canvas,skip,replay,onFinish=()=>{}){
 let frame=0,start=0,running=false;const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function finish(){if(!running)return;running=false;cancelAnimationFrame(frame);root.hidden=true;root.classList.remove('arriving');try{sessionStorage.setItem('sanagus.arrival','seen');}catch{}onFinish();}
 function tick(t){if(!running)return;const seconds=(t-start)/1000;const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);if(w!==canvas.width||h!==canvas.height){canvas.width=w;canvas.height=h;}drawArrival(canvas,seconds);root.classList.toggle('arriving',seconds>4.8);if(seconds>6.4)finish();else frame=requestAnimationFrame(tick);}
 function play(){if(reduced.matches){onFinish();return;}cancelAnimationFrame(frame);root.hidden=false;root.classList.remove('arriving');running=true;start=performance.now();skip.focus({preventScroll:true});frame=requestAnimationFrame(tick);}
 skip.addEventListener('click',finish);replay.addEventListener('click',play);root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();finish();}});
 let seen=false;try{seen=!!sessionStorage.getItem('sanagus.arrival')||!!sessionStorage.getItem('sanagus.session');}catch{}if(!seen)play();
 return {finish,play};
}
