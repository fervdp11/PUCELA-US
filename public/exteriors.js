// Camera-local procedural scenery: no full-map texture, physics or server work.
const T=56;
const rect=(c,x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h);};
function building(c,x,y,w,h,night,seed){rect(c,x+10,y+15,w,h,'#07111f33');rect(c,x,y,w,h,night?'#253346':['#b4b4a3','#bda98e','#a7b5af'][seed%3]);rect(c,x-7,y-12,w+14,18,night?'#1a2636':'#7f7565');for(let j=20;j<h-18;j+=44)for(let i=15;i<w-20;i+=38){rect(c,x+i,y+j,20,27,night?(i+j+seed)%3?'#edc57b':'#3a5771':'#638d9b');rect(c,x+i,y+j,20,3,night?'#506078':'#e3d8bd');}}
function car(c,x,y,vertical,col){c.save();c.translate(x,y);if(vertical)c.rotate(Math.PI/2);rect(c,-34,-16,68,32,'#11253644');rect(c,-32,-20,64,31,col);rect(c,-17,-17,28,25,'#98bdc9');rect(c,25,-18,5,8,'#fff0a7');rect(c,25,0,5,8,'#fff0a7');for(const yy of [-23,10]){rect(c,-22,yy,12,5,'#142330');rect(c,17,yy,12,5,'#142330');}c.restore();}
function monument(c,x,y,fountain,time){c.save();c.translate(x,y);c.fillStyle='#12233033';c.beginPath();c.ellipse(10,22,fountain?84:39,fountain?45:20,0,0,7);c.fill();if(fountain){c.fillStyle='#b5b7ac';c.beginPath();c.ellipse(0,0,82,54,0,0,7);c.fill();c.fillStyle='#63a9c2';c.beginPath();c.ellipse(0,0,72,43,0,0,7);c.fill();c.strokeStyle='#c5edf8';c.lineWidth=2;for(let i=0;i<5;i++){const k=(time/1600+i/5)%1;c.globalAlpha=1-k;c.beginPath();c.ellipse(0,0,20+k*51,12+k*30,0,0,7);c.stroke();}c.globalAlpha=1;}rect(c,-22,-18,44,27,'#777e77');rect(c,-29,-23,58,11,'#d7d2bf');rect(c,-10,-65,20,42,'#827f70');c.fillStyle='#6c746c';c.beginPath();c.arc(0,-76,13,0,7);c.fill();c.strokeStyle='#747d73';c.lineWidth=8;c.beginPath();c.moveTo(-5,-57);c.lineTo(-25,-41);c.moveTo(5,-57);c.lineTo(23,-75);c.stroke();c.restore();}
export function drawExterior(c,map,time,view){
 if(map.isCaravan||map.isMeeting)return;
 const W=map.width*T,H=map.height*T,L=view.x-view.w/2-180,R=view.x+view.w/2+180,U=view.y-view.h/2-220,B=view.y+view.h/2+220,night=map.worldId==='club',park=map.worldId==='park';
 rect(c,L,U,R-L,B-U,night?'#192b36':park?'#b8baa7':'#a7b0a2');
 // Sidewalks continue indefinitely at both open ends of the camera.
 rect(c,L,-94,R-L,94,night?'#4c5866':'#c9c5b4');rect(c,L,H,R-L,150,night?'#4c5866':'#d3c9b2');rect(c,-130,U,130,B-U,night?'#4c5866':'#d3c9b2');rect(c,W,U,108,B-U,night?'#4c5866':'#c9c5b4');
 const roadY=-250,roadX=W+108;
 rect(c,L,roadY,R-L,150,night?'#273647':'#485a64');rect(c,roadX,U,150,B-U,night?'#273647':'#485a64');
 for(let x=Math.floor(L/130)*130;x<R;x+=130)rect(c,x,roadY+72,62,5,'#efe0a8');for(let y=Math.floor(U/130)*130;y<B;y+=130)rect(c,roadX+72,y,5,62,'#efe0a8');
 // Only blocks overlapping the camera are drawn.
 for(let x=Math.floor(L/250)*250;x<R;x+=250)if(U< -290)building(c,x,-550,205,230,night,Math.abs(Math.floor(x/250)));
 for(let y=Math.floor(U/290)*290;y<B;y+=290)if(R>roadX+190)building(c,roadX+195,y,240,245,night,Math.abs(Math.floor(y/290)));
 const cycle=(time/1000*95)%(W+1800);for(let i=0;i<3;i++){const x=((cycle+i*(W+1800)/3)%(W+1800))-900;if(x>L-100&&x<R+100&&roadY>U-180&&roadY<B+180)car(c,x,roadY+42,false,['#9c799c','#bf8e6c','#799fb0'][i]);const y=((cycle+i*(H+1500)/3)%(H+1500))-750;if(y>U-100&&y<B+100&&roadX>L-150&&roadX<R+100)car(c,roadX+112,y,true,['#93a57c','#957ac2','#b56e78'][i]);}
 if(park){if(L<40&&U<40)monument(c,-64,-20,false,time);if(R>W-120&&B>H-100)monument(c,W-75,H+76,true,time);}
 if(map.worldId==='school'){
  // Parking below reception and a recreation yard at the left wing.
  for(let x=Math.max(40,Math.floor(L/90)*90);x<Math.min(W,R);x+=90){rect(c,x,H+27,2,98,'#fff5d4');if(Math.floor(x/90)%3!==1)car(c,x+42,H+76,true,['#778fc0','#ba8f70','#719b98'][Math.abs(Math.floor(x/90))%3]);}
  if(L< -150){rect(c,-600,150,420,H-270,'#8eaa8d');c.strokeStyle='#e7ead6';c.lineWidth=3;c.strokeRect(-570,200,360,Math.max(120,H-380));c.beginPath();c.arc(-390,H/2,65,0,7);c.stroke();}

 }
}

export function drawReceptionDoor(c,map){if(map.worldId!=='school'||map.floor!==0)return;  const reception=map.rooms.find(r=>r.type==='reception');if(reception){const x=(reception.x+reception.w/2)*T,y=(reception.y+reception.h)*T;rect(c,x-41,y-85,82,83,'#315563');rect(c,x-34,y-77,30,54,'#87b5c0');rect(c,x+4,y-77,30,54,'#87b5c0');rect(c,x-4,y-80,8,78,'#d0c6aa');c.fillStyle='#e4dac0';c.font='bold 12px sans-serif';c.textAlign='center';c.fillText('ENTRADA PRINCIPAL',x,y-95);}
}
