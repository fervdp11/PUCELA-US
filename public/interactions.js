const TAU=Math.PI*2;
export function drawVents(c,map,state,time,clock){
 for(const v of map.vents||[]){const actors=state.players.filter(p=>p.vent===v.id||p.transition?.kind==='vent-out'&&Math.hypot(p.x-v.x,p.y-v.y)<15),actor=actors.find(p=>p.transition),age=actor?.transition?clock-actor.transition.at:Infinity,open=actor?.transition?.kind==='vent-in'?Math.sin(Math.min(1,Math.max(0,age/600))*Math.PI):actor?.transition?.kind==='vent-out'?1-Math.min(1,Math.max(0,age/550)):0;
  c.save();c.translate(v.x,v.y);c.fillStyle='#0c223955';c.beginPath();c.ellipse(3,5,29,21,0,0,TAU);c.fill();c.fillStyle='#0b1a2e';c.strokeStyle='#73919e';c.lineWidth=3;c.beginPath();c.ellipse(0,0,24,17,0,0,TAU);c.fill();c.stroke();
  c.save();c.translate(0,-open*20);c.scale(1,1-open*.7);c.fillStyle='#4a6375';c.strokeStyle='#b7c9c9';c.beginPath();c.ellipse(0,0,24,17,0,0,TAU);c.fill();c.stroke();c.save();c.beginPath();c.ellipse(0,0,18,11,0,0,TAU);c.clip();c.strokeStyle='#203849';c.lineWidth=3;for(let i=-15;i<=15;i+=6){c.beginPath();c.moveTo(i,-13);c.lineTo(i,13);c.stroke();}c.restore();c.fillStyle='#90deca';c.beginPath();c.arc(0,-12,2.5,0,TAU);c.fill();c.restore();c.restore();
 }
}
export function drawActorInteraction(c,p,clock,time,reduced){
 const age=clock-(p.spawnAt||0);if(p.spawnAt&&age>=0&&age<850){c.save();c.globalAlpha=(1-age/850)*.5;c.strokeStyle='#abe9d6';c.lineWidth=2;c.beginPath();c.ellipse(p.x,p.y+2,22+age*.03,8+age*.01,0,0,TAU);c.stroke();c.restore();}
}
