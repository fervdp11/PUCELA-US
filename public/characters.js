import {COLORS,HAIR_PALETTE,SKIN_PALETTE} from './content.js';
const clothes=p=>COLORS[p.color]||COLORS[0];
const trim=p=>COLORS[p.trimColor??2]||COLORS[2];
const identity=p=>COLORS[p.outfitColor??p.color]||COLORS[0];
const faceOf=p=>SKIN_PALETTE[p.skinTone||0]||SKIN_PALETTE[0];
const pantsOf=p=>p.pants===1?faceOf(p):p.pants===2?'#50789c':p.pants===3?'#69725a':'#344756';
const shoesOf=p=>COLORS[p.shoeColor??8]||COLORS[8];
export function robotSVG(p){
 const body=clothes(p),id=identity(p),skin=p.skin||0,short=p.pants===1,hair=HAIR_PALETTE[p.hairColor||0],face=faceOf(p),shoe=shoesOf(p);
 const accent=trim(p);
 const detail=[
  `<path d="m26 49 14 11 14-11-6-4H32Z" fill="#f6f0db"/><path d="m38 59-3 17 5 5 5-5-3-17" fill="${accent}"/>`,
  `<path d="M24 49Q40 66 56 49M29 55v11m22-11v11" fill="none" stroke="${accent}" stroke-width="3"/><path d="M29 72h22v8H29Z" fill="${accent}"/><path d="M20 50l5 4m35-4-5 4" stroke="${accent}" stroke-width="4"/>`,
  `<path d="M26 52h28M25 60h30M27 78h26" stroke="${accent}" stroke-width="5"/><path d="M33 45q7 8 14 0" fill="none" stroke="#eee9d7" stroke-width="3"/>`,
  `<path d="M23 52q5-8 9-5m25 5q-5-8-9-5" fill="none" stroke="${accent}" stroke-width="5"/><path d="M27 70h26v9H27Z" fill="${accent}"/>`,
  `<path d="M26 50v28m28-28v28M27 76h26" stroke="${accent}" stroke-width="4"/>`,
  `<path d="m27 46 9 20 4-14 4 14 9-20M40 54v31" fill="none" stroke="#f4f0e2" stroke-width="5"/><path d="M47 70h8v9h-8" fill="${accent}"/>`,
  `<path d="m26 48 12 18-5 15m21-33L42 66l5 15" fill="none" stroke="${accent}" stroke-width="4"/><path d="M31 74h18" stroke="#f0eed9" stroke-width="3"/>`
 ][skin]||'';
 const torso=body;
 const hat=p.hat||0;let top=hat===1?`<path d="M18 24Q22 3 40 7q22 1 25 20H18Z" fill="${id}"/><path d="M19 25h49" stroke="#163445" stroke-width="5"/>`:hat>=2&&hat<=5?`<path d="M19 25Q19 5 40 8q25 0 22 27l-9-14-8 7-8-10-13 13Z" fill="${hair}"/>${hat===3?`<path d="M20 22v34m42-34v34" stroke="${hair}" stroke-width="10"/>`:hat===4?`<path d="M20 15q-9 0-5 10m10-14q-6-6-10 1m24-1q-5-8-10 0m23 0q-5-8-10 0m22 3q-2-9-10-4" stroke="${hair}" stroke-width="10" fill="none"/>`:hat===5?`<circle cx="65" cy="29" r="10" fill="${hair}"/>`:''}`:hat===6?'<path d="M40 13V4q14-5 13 2-6 7-13 1-14-7-13 0 7 7 13 0" fill="#91c870"/>':hat===7?'<path d="m21 17-2-13 13 8 8-12 8 12 13-8-2 13Z" fill="#ffc65c"/>':'';
 let glasses=p.glasses?`<g fill="none" stroke="#233443" stroke-width="2"><${p.glasses===1?'ellipse':'rect'} ${p.glasses===1?'cx="31" cy="33" rx="9" ry="7"':'x="23" y="26" width="16" height="14" rx="3"'}/><${p.glasses===1?'ellipse':'rect'} ${p.glasses===1?'cx="49" cy="33" rx="9" ry="7"':'x="41" y="26" width="16" height="14" rx="3"'}/><path d="M39 32h2"/></g>`:'';
 let extra=p.accessory===1?'<path d="m39 53-4 18 5 6 5-6-4-18Z" fill="#a75460"/>':p.accessory===2?'<path d="M16 35V21q24-28 48 0v14" fill="none" stroke="#273848" stroke-width="5"/><path d="M16 27v15m48-15v15" stroke="#f4dd9e" stroke-width="7"/>':p.accessory===3?'<path d="M22 48q18 9 36 0m-8 2v17" stroke="#e9c166" stroke-width="7" fill="none"/>':'';
 if(hat===8)top=`<path d="M18 23Q18 4 40 4T62 23Z" fill="${accent}" stroke="#233443" stroke-width="2"/><path d="M18 20h44v8H18Z" fill="${id}"/><circle cx="40" cy="3" r="5" fill="${accent}"/>`;
 if(hat===9)top=`<path d="M27 21V7h26v14Z" fill="${id}" stroke="#233443" stroke-width="2"/><path d="M12 23h56" stroke="${accent}" stroke-width="7"/>`;
 if(hat===10)top=`<path d="m18 23 1-20 15 13m12 0L61 3l1 20" fill="${id}" stroke="#233443" stroke-width="2"/><path d="m22 17 1-8 6 6m23 0 5-6 1 8" fill="${accent}"/>`;
 if(hat===11)top=`<path d="m13 15 27-12 27 12-27 12Z" fill="#253948" stroke="${accent}" stroke-width="2"/><path d="M62 16v19" stroke="${accent}" stroke-width="3"/>`;
 if(p.glasses===3)glasses='<path d="M21 28h17v11H21Zm21 0h17v11H42Z" fill="#152635" stroke="#b5d0dc" stroke-width="2"/><path d="M38 31h4" stroke="#152635" stroke-width="3"/>';
 if(p.glasses===4)glasses='<circle cx="49" cy="33" r="9" fill="none" stroke="#ddbf77" stroke-width="2"/><path d="M56 39v15l-5 4" fill="none" stroke="#ddbf77" stroke-width="1.5"/>';
 const accessories={
  4:`<path d="M22 35h36v10H22Z" fill="${accent}" stroke="#466571" stroke-width="1.5"/><path d="M26 38h28m-28 3h28" stroke="#ffffff77"/>`,
  5:`<path d="m23 48 17 9 17-9-5 14-12-6-12 6Z" fill="${accent}"/>`,
  6:`<path d="m29 48 11 19 11-19" fill="none" stroke="${accent}" stroke-width="4"/><circle cx="40" cy="69" r="7" fill="#efc56d" stroke="#a87939" stroke-width="2"/>`,
  7:`<path d="M17 73h12" stroke="${accent}" stroke-width="6"/>`,
  8:`<path d="m23 51 35 30" stroke="${accent}" stroke-width="3"/><rect x="44" y="71" width="18" height="10" rx="3" fill="${accent}" stroke="#233443" stroke-width="2"/>`,
  9:`<path d="M25 49q15 19 30 0" fill="none" stroke="#edca79" stroke-width="3"/><circle cx="40" cy="59" r="3" fill="${accent}"/>`
 };extra=accessories[p.accessory]||extra;
 const badge=p.badge===1?`<path d="m29 64 2-4 2 4 5 1-4 3 1 5-4-3-4 3 1-5-4-3Z" fill="${accent}"/>`:p.badge===2?`<path d="m34 60-8 10h5l-2 8 9-12h-5Z" fill="${accent}"/>`:p.badge===3?`<circle cx="32" cy="66" r="6" fill="#eff2df"/><path d="M29 70v5h6v-5" fill="#eff2df"/><circle cx="30" cy="65" r="1.5" fill="#253948"/><circle cx="34" cy="65" r="1.5" fill="#253948"/>`:'';
 const shoeDetails=p.shoes===1?`<path d="M25 85h12m8 0h11" stroke="${shoe}" stroke-width="8"/>`:p.shoes===2?`<path d="m26 91 9 3m11-3 8 3" stroke="${accent}" stroke-width="3"/>`:'';
 const bagDetail=p.bag===2?`<path d="m25 48 32 35" stroke="${accent}" stroke-width="3"/><rect x="46" y="71" width="21" height="17" rx="4" fill="${accent}" stroke="#233443" stroke-width="2"/>`:p.bag===3?`<path d="M15 52v29" stroke="${accent}" stroke-width="4"/>`:'';
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 105" aria-hidden="true"><ellipse cx="40" cy="98" rx="25" ry="5" fill="#142b32" opacity=".25"/>${p.bag?`<rect x="12" y="50" width="18" height="36" rx="8" fill="${id}" stroke="#233443" stroke-width="3"/>`:''}<g stroke="#233443" stroke-width="2.5"><rect x="26" y="75" width="12" height="20" rx="5" fill="${pantsOf(p)}"/><rect x="43" y="75" width="12" height="20" rx="5" fill="${pantsOf(p)}"/><rect x="23" y="89" width="17" height="8" rx="4" fill="${shoe}"/><rect x="41" y="89" width="17" height="8" rx="4" fill="${shoe}"/><rect x="17" y="49" width="13" height="30" rx="6" fill="${torso}"/><rect x="51" y="49" width="13" height="30" rx="6" fill="${torso}"/><rect x="24" y="45" width="33" height="39" rx="9" fill="${torso}"/><rect x="17" y="13" width="46" height="35" rx="15" fill="${id}"/><rect x="22" y="22" width="36" height="25" rx="11" fill="${face}"/></g>${detail}<circle cx="31" cy="33" r="3" fill="#253943"/><circle cx="49" cy="33" r="3" fill="#253943"/><path d="M36 40q4 3 8 0" fill="none" stroke="#b67568" stroke-width="2"/>${top}${glasses}${extra}${badge}${shoeDetails}${bagDetail}<circle cx="54" cy="76" r="4" fill="${id}"/></svg>`;
}
function rr(c,x,y,w,h,r,fill,stroke='#233443'){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=2.5;c.stroke();}}
function polygon(c,points,fill,stroke=null){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}}
function additions(c,p,id,accent,shoe,step){
 if(p.hat===8){rr(c,-23,-87,46,22,12,accent);rr(c,-25,-71,50,8,3,id);c.fillStyle=accent;c.beginPath();c.arc(0,-91,6,0,Math.PI*2);c.fill();}
 if(p.hat===9){rr(c,-14,-94,28,24,4,id);rr(c,-32,-76,64,7,3,accent);}
 if(p.hat===10){polygon(c,[[-23,-66],[-23,-91],[-5,-79]],id,'#233443');polygon(c,[[23,-66],[23,-91],[5,-79]],id,'#233443');polygon(c,[[-18,-74],[-18,-84],[-10,-78]],accent);polygon(c,[[18,-74],[18,-84],[10,-78]],accent);}
 if(p.hat===11){polygon(c,[[-30,-80],[0,-95],[30,-80],[0,-67]],'#253948',accent);c.strokeStyle=accent;c.lineWidth=3;c.beginPath();c.moveTo(27,-79);c.lineTo(27,-58);c.stroke();}
 if(p.glasses===3){rr(c,-19,-66,17,12,3,'#152635','#b5d0dc');rr(c,2,-66,17,12,3,'#152635','#b5d0dc');c.strokeStyle='#152635';c.lineWidth=3;c.beginPath();c.moveTo(-2,-62);c.lineTo(2,-62);c.stroke();}
 if(p.glasses===4){c.strokeStyle='#ddbf77';c.lineWidth=2;c.beginPath();c.arc(10,-60,9,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(17,-53);c.lineTo(17,-38);c.lineTo(11,-32);c.stroke();}
 if(p.accessory===4){rr(c,-18,-58,36,13,5,accent,'#466571');c.strokeStyle='#ffffff77';c.lineWidth=1;for(const y of [-54,-50]){c.beginPath();c.moveTo(-13,y);c.lineTo(13,y);c.stroke();}}
 if(p.accessory===5)polygon(c,[[-20,-46],[0,-39],[20,-46],[14,-29],[0,-39],[-14,-29]],accent);
 if(p.accessory===6){c.strokeStyle=accent;c.lineWidth=4;c.beginPath();c.moveTo(-12,-47);c.lineTo(0,-25);c.lineTo(12,-47);c.stroke();c.fillStyle='#efc56d';c.beginPath();c.arc(0,-23,7,0,Math.PI*2);c.fill();}
 if(p.accessory===7)rr(c,-26,-25,13,6,2,accent,null);
 if(p.accessory===8){c.strokeStyle=accent;c.lineWidth=3;c.beginPath();c.moveTo(-18,-47);c.lineTo(18,-16);c.stroke();rr(c,8,-25,20,12,3,accent);}
 if(p.accessory===9){c.strokeStyle='#edca79';c.lineWidth=3;c.beginPath();c.arc(0,-48,15,.15,Math.PI-.15);c.stroke();rr(c,-3,-33,6,5,2,accent,null);}
 if(p.bag===2){c.strokeStyle=accent;c.lineWidth=3;c.beginPath();c.moveTo(-15,-49);c.lineTo(24,-12);c.stroke();rr(c,13,-20,21,17,4,accent);}
 if(p.bag===3)rr(c,-25,-40,5,25,2,accent,null);
 if(p.pants===2){c.strokeStyle='#bfd0e3';c.lineWidth=1;c.beginPath();c.moveTo(-9,-17);c.lineTo(-9,-4);c.moveTo(9,-17);c.lineTo(9,-4);c.stroke();}
 if(p.pants===3){rr(c,-16,-17+step,6,8,2,'#808769');rr(c,10,-17-step,6,8,2,'#808769');}
 if(p.shoes===1){rr(c,-15,-11+step,14,10,3,shoe);rr(c,3,-11-step,14,10,3,shoe);}
 if(p.shoes===2){c.strokeStyle=accent;c.lineWidth=3;c.beginPath();c.moveTo(-13,-2+step);c.lineTo(-5,1+step);c.moveTo(5,-2-step);c.lineTo(13,1-step);c.stroke();}
 if(p.badge===1)polygon(c,[[-10,-40],[-8,-35],[-3,-34],[-7,-30],[-6,-25],[-10,-28],[-14,-25],[-13,-30],[-17,-34],[-12,-35]],accent);
 if(p.badge===2)polygon(c,[[-6,-42],[-15,-31],[-10,-31],[-13,-23],[-2,-35],[-8,-35]],accent);
 if(p.badge===3){c.fillStyle='#eff2df';c.beginPath();c.arc(-9,-35,6,0,Math.PI*2);c.fill();rr(c,-13,-31,8,6,1,'#eff2df',null);c.fillStyle='#253948';c.fillRect(-12,-37,2,3);c.fillRect(-7,-37,2,3);}
}
export function drawRobot(c,p,x,y,scale,time,moving=false,self=false){
 c.save();c.translate(x,y);c.scale(scale,scale);if(p.alive===false)c.globalAlpha=.45;
 const bob=moving?Math.sin(time/90)*1.5:Math.sin(time/700)*.4,step=moving?Math.sin(time/90)*4:0,id=identity(p),top=clothes(p),torso=top,accent=trim(p),hair=HAIR_PALETTE[p.hairColor||0],face=faceOf(p),shoe=shoesOf(p);
 c.fillStyle='#182e3640';c.beginPath();c.ellipse(0,1,25,6,0,0,Math.PI*2);c.fill();
 if(self){c.strokeStyle=id+'99';c.lineWidth=1.5;c.beginPath();c.ellipse(0,1,29,9,0,0,Math.PI*2);c.stroke();}
 if(p.bag)rr(c,-29,-45,17,35,7,id);
 c.translate(0,bob);rr(c,-14,-19+step,12,18,5,pantsOf(p));rr(c,3,-19-step,12,18,5,pantsOf(p));rr(c,-17,-5+step,18,8,4,shoe);rr(c,2,-5-step,18,8,4,shoe);
 rr(c,-25,-46-step*.3,13,29,6,torso);rr(c,12,-46+step*.3,13,29,6,torso);rr(c,-17,-51,35,38,10,torso);
 c.strokeStyle='#1d354955';c.lineWidth=2;
 if(p.skin===0){c.fillStyle='#f4efe2';c.beginPath();c.moveTo(-14,-48);c.lineTo(0,-35);c.lineTo(14,-48);c.closePath();c.fill();c.fillStyle=accent;c.fillRect(-2,-35,4,16);}
 else if(p.skin===1){c.strokeStyle=accent;c.lineWidth=3;c.beginPath();c.moveTo(-17,-51);c.quadraticCurveTo(0,-33,17,-51);c.stroke();c.fillStyle=accent;c.fillRect(-9,-40,2,12);c.fillRect(7,-40,2,12);rr(c,-11,-25,22,9,3,accent,null);rr(c,-24,-22,10,5,2,accent,null);rr(c,14,-22,10,5,2,accent,null);}
 else if(p.skin===2){c.strokeStyle=accent;c.lineWidth=4;for(const yy of [-43,-35,-27,-18]){c.beginPath();c.moveTo(-15,yy);c.lineTo(16,yy);c.stroke();}rr(c,-22,-20,8,5,2,accent,null);rr(c,14,-20,8,5,2,accent,null);}
 else if(p.skin===3){c.fillStyle=accent;c.beginPath();c.moveTo(-21,-49);c.lineTo(-11,-49);c.lineTo(-17,-39);c.lineTo(-24,-43);c.moveTo(21,-49);c.lineTo(11,-49);c.lineTo(17,-39);c.lineTo(24,-43);c.fill();rr(c,-15,-21,31,6,2,accent,null);}
 else if(p.skin===4){c.strokeStyle=accent;c.lineWidth=4;c.beginPath();c.moveTo(-12,-46);c.lineTo(-12,-18);c.moveTo(12,-46);c.lineTo(12,-18);c.moveTo(-16,-22);c.lineTo(16,-22);c.stroke();}
 else if(p.skin===5){c.strokeStyle='#f6f1e3';c.lineWidth=5;c.beginPath();c.moveTo(-13,-49);c.lineTo(-3,-31);c.lineTo(-9,-17);c.moveTo(13,-49);c.lineTo(3,-31);c.lineTo(9,-17);c.stroke();c.fillStyle=accent;c.fillRect(5,-29,8,8);}
 else if(p.skin===6){c.strokeStyle=accent;c.lineWidth=4;c.beginPath();c.moveTo(-13,-49);c.lineTo(-3,-31);c.lineTo(-9,-17);c.moveTo(13,-49);c.lineTo(3,-31);c.lineTo(9,-17);c.stroke();c.fillStyle='#f6f1e3';c.fillRect(-15,-20,30,3);}

 rr(c,-24,-80,48,36,16,id);rr(c,-19,-70,38,27,12,face);
 const gaze=(p.facing||1)*1.5;c.fillStyle='#253943';for(const ex of [-9,9]){c.beginPath();c.ellipse(ex+gaze,-59,3,4,0,0,Math.PI*2);c.fill();}c.strokeStyle='#b67568';c.lineWidth=2;c.beginPath();c.arc(gaze,-54,4,.2,Math.PI-.2);c.stroke();
 if(p.hat===1){rr(c,-25,-83,49,17,10,id);rr(c,-30,-70,61,5,2,'#294353');}
 else if(p.hat>=2&&p.hat<=5){c.fillStyle=hair;c.beginPath();c.moveTo(-22,-63);c.quadraticCurveTo(-26,-86,0,-86);c.quadraticCurveTo(27,-85,24,-61);c.lineTo(12,-74);c.lineTo(3,-67);c.lineTo(-5,-78);c.closePath();c.fill();if(p.hat===3){rr(c,-26,-71,8,35,4,hair,null);rr(c,18,-71,8,35,4,hair,null);}if(p.hat===4){for(let a=0;a<6;a++){c.beginPath();c.arc(-21+a*8,-80+Math.sin(a)*4,7,0,Math.PI*2);c.fill();}}if(p.hat===5){c.beginPath();c.arc(27,-67,10,0,Math.PI*2);c.fill();}}
 else if(p.hat===6){c.strokeStyle='#6baa5a';c.beginPath();c.moveTo(0,-80);c.lineTo(0,-93);c.stroke();c.fillStyle='#97d077';c.beginPath();c.ellipse(7,-93,9,4,-.5,0,Math.PI*2);c.fill();}else if(p.hat===7){c.fillStyle='#ffc65c';c.beginPath();c.moveTo(-20,-81);c.lineTo(-22,-96);c.lineTo(-8,-88);c.lineTo(0,-100);c.lineTo(8,-88);c.lineTo(22,-96);c.lineTo(20,-81);c.closePath();c.fill();}
 if(p.glasses&&p.glasses<=2){c.strokeStyle='#26394b';c.lineWidth=2;for(const ex of [-10,10]){c.beginPath();if(p.glasses===1)c.ellipse(ex,-60,9,7,0,0,Math.PI*2);else c.roundRect(ex-8,-67,16,14,3);c.stroke();}c.beginPath();c.moveTo(-2,-61);c.lineTo(2,-61);c.stroke();}
 if(p.accessory===1){c.fillStyle='#a75460';c.beginPath();c.moveTo(0,-43);c.lineTo(-5,-22);c.lineTo(0,-17);c.lineTo(5,-22);c.closePath();c.fill();}else if(p.accessory===2){c.strokeStyle='#28394c';c.lineWidth=5;c.beginPath();c.arc(0,-65,26,Math.PI,0);c.stroke();rr(c,-30,-69,8,19,4,'#f4dd9e');rr(c,22,-69,8,19,4,'#f4dd9e');}else if(p.accessory===3){rr(c,-21,-47,43,8,4,'#e9c166',null);rr(c,9,-44,8,17,3,'#e9c166',null);}
 additions(c,p,id,accent,shoe,step);c.fillStyle=id;c.beginPath();c.arc(12,-21,3,0,Math.PI*2);c.fill();c.restore();
}
export function drawAvatar(canvas,p,time){const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);const scale=Math.min((canvas.width-20)/72,(canvas.height-24)/106);drawRobot(c,p,canvas.width/2,canvas.height-15,scale,time);}
export function drawHero(canvas,time){const c=canvas.getContext('2d');c.clearRect(0,0,600,330);rr(c,28,20,544,224,12,'#d7c8a7','#b2a382');rr(c,70,45,350,105,6,'#214c43','#ad8157');c.fillStyle='#f3edcf';c.font='italic 25px Segoe UI';c.fillText('¿Quién falta a la verdad?',94,89);c.font='13px Segoe UI';c.fillText('SANAGUS AS  ·  AULA 01',97,122);rr(c,461,42,73,117,6,'#9eb9c8','#e1e8e4');c.strokeStyle='#e1e8e4';c.lineWidth=5;c.beginPath();c.moveTo(497,43);c.lineTo(497,159);c.moveTo(462,100);c.lineTo(534,100);c.stroke();c.fillStyle='#a58969';c.beginPath();c.moveTo(28,243);c.lineTo(572,243);c.lineTo(595,320);c.lineTo(5,320);c.closePath();c.fill();drawRobot(c,{color:3,skin:5,hat:3,bag:1},158,279,1.65,time);drawRobot(c,{color:2,skin:1,hat:1,accessory:2},446,279,1.65,time+200);drawRobot(c,{color:0,skin:0,hat:2,glasses:1},300,303,2.1,time+400);}
