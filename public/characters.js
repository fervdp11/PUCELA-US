import {emotePhase,applyEmote,drawEmoteOverlay,drawPet,drawEffect} from './extras-art.js';
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
 ,`<path d="M27 47v34m26-34v34" stroke="${accent}" stroke-width="4"/><text x="40" y="73" text-anchor="middle" font-size="18" font-weight="bold" fill="#f5efda">7</text>`,
  `<path d="m27 47 13 17 13-17-5 30H32Z" fill="${accent}"/><path d="M40 61v23" stroke="#ead5a5" stroke-width="2"/><path d="m33 51 7 4 7-4-1 8-6-4-6 4Z" fill="#493b3b"/>`,
  `<path d="M40 47v34M25 76h30" stroke="${accent}" stroke-width="4"/><path d="M29 58h8v9h-8m15-9h8v9h-8" fill="#ead5a5"/>`,
  `<path d="M22 48h12v34H22Zm24 0h12v34H46Z" fill="#a08453"/><path d="M25 61h8v8h-8Zm22 0h8v8h-8Z" fill="${accent}"/><path d="M40 48v35" stroke="#5f4a2c" stroke-width="2"/>`,
  `<rect x="21" y="47" width="38" height="36" rx="13" fill="#eef1f4"/><rect x="32" y="53" width="16" height="12" rx="4" fill="${accent}"/><circle cx="40" cy="59" r="3" fill="#ff7185"/><path d="M21 76h38" stroke="#9fb1c4" stroke-width="5"/>`
 ][skin]||'';
 const torso=body;
 const hat=p.hat||0;let top=hat===1?`<path d="M18 24Q22 3 40 7q22 1 25 20H18Z" fill="${id}"/><path d="M19 25h49" stroke="#163445" stroke-width="5"/>`:hat>=2&&hat<=5?`<path d="M19 25Q19 5 40 8q25 0 22 27l-9-14-8 7-8-10-13 13Z" fill="${hair}"/>${hat===3?`<path d="M20 22v34m42-34v34" stroke="${hair}" stroke-width="10"/>`:hat===4?`<path d="M20 15q-9 0-5 10m10-14q-6-6-10 1m24-1q-5-8-10 0m23 0q-5-8-10 0m22 3q-2-9-10-4" stroke="${hair}" stroke-width="10" fill="none"/>`:hat===5?`<circle cx="65" cy="29" r="10" fill="${hair}"/>`:''}`:hat===6?'<path d="M40 13V4q14-5 13 2-6 7-13 1-14-7-13 0 7 7 13 0" fill="#91c870"/>':hat===7?'<path d="m21 17-2-13 13 8 8-12 8 12 13-8-2 13Z" fill="#ffc65c"/>':'';
 let glasses=p.glasses?`<g fill="none" stroke="#233443" stroke-width="2"><${p.glasses===1?'ellipse':'rect'} ${p.glasses===1?'cx="31" cy="33" rx="9" ry="7"':'x="23" y="26" width="16" height="14" rx="3"'}/><${p.glasses===1?'ellipse':'rect'} ${p.glasses===1?'cx="49" cy="33" rx="9" ry="7"':'x="41" y="26" width="16" height="14" rx="3"'}/><path d="M39 32h2"/></g>`:'';
 let extra=p.accessory===1?'<path d="m39 53-4 18 5 6 5-6-4-18Z" fill="#a75460"/>':p.accessory===2?'<path d="M16 35V21q24-28 48 0v14" fill="none" stroke="#273848" stroke-width="5"/><path d="M16 27v15m48-15v15" stroke="#f4dd9e" stroke-width="7"/>':p.accessory===3?'<path d="M22 48q18 9 36 0m-8 2v17" stroke="#e9c166" stroke-width="7" fill="none"/>':'';
 if(hat===8)top=`<path d="M18 23Q18 4 40 4T62 23Z" fill="${accent}" stroke="#233443" stroke-width="2"/><path d="M18 20h44v8H18Z" fill="${id}"/><circle cx="40" cy="3" r="5" fill="${accent}"/>`;
 if(hat===9)top=`<path d="M27 21V7h26v14Z" fill="${id}" stroke="#233443" stroke-width="2"/><path d="M12 23h56" stroke="${accent}" stroke-width="7"/>`;
 if(hat===10)top=`<path d="m18 23 1-20 15 13m12 0L61 3l1 20" fill="${id}" stroke="#233443" stroke-width="2"/><path d="m22 17 1-8 6 6m23 0 5-6 1 8" fill="${accent}"/>`;
 if(hat===11)top=`<path d="m13 15 27-12 27 12-27 12Z" fill="#253948" stroke="${accent}" stroke-width="2"/><path d="M62 16v19" stroke="${accent}" stroke-width="3"/>`;
 if(hat===12)top=`<path d="m20 24 20-30 20 30Z" fill="${id}" stroke="#233443" stroke-width="2"/><path d="M15 25h50" stroke="${accent}" stroke-width="6"/><path d="m39 7 2 4 4 1-4 2-1 4-2-4-4-2 4-1Z" fill="#f2ca79"/>`;
 if(hat===13)top=`<path d="M15 23Q12 4 42 8q26 0 22 15Z" fill="${accent}" stroke="#233443" stroke-width="2"/><path d="M23 24h39" stroke="${id}" stroke-width="4"/>`;
 if(hat===14)top=`<path d="M16 24Q19 1 40 6q23 0 25 18Z" fill="${id}" stroke="#233443" stroke-width="2"/><path d="M29 11v10m11-12v12m11-10v10" stroke="${accent}" stroke-width="4"/>`;
 if(hat===15)top=`<path d="M17 26q23-20 46 0" fill="none" stroke="${accent}" stroke-width="5"/><path d="m40 0 4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1Z" fill="#f5ce79" stroke="#a77546"/>`;
 if(hat===16)top=`<ellipse cx="40" cy="20" rx="32" ry="7" fill="#b9975f" stroke="#6c5531" stroke-width="2"/><rect x="23" y="3" width="34" height="18" rx="9" fill="#c9a96c" stroke="#6c5531" stroke-width="2"/><path d="M23 15h34" stroke="${accent}" stroke-width="4"/>`;
 if(hat===17)top=`<circle cx="29" cy="2" r="11" fill="#fbfbf6"/><circle cx="40" cy="-3" r="12" fill="#fbfbf6"/><circle cx="51" cy="2" r="11" fill="#fbfbf6"/><rect x="22" y="4" width="36" height="18" rx="4" fill="#fbfbf6" stroke="#9aa3a8" stroke-width="2"/>`;
 if(hat===18)top=`<circle cx="40" cy="30" r="31" fill="#bfe8ff" fill-opacity=".42" stroke="#e8f6ff" stroke-width="3"/><path d="M24 21a18 18 0 0 1 14-10" stroke="#fff" stroke-width="3" fill="none"/><rect x="15" y="55" width="50" height="7" rx="3" fill="#9fb1c4"/>`;
 if(p.glasses===3)glasses='<path d="M21 28h17v11H21Zm21 0h17v11H42Z" fill="#152635" stroke="#b5d0dc" stroke-width="2"/><path d="M38 31h4" stroke="#152635" stroke-width="3"/>';
 if(p.glasses===4)glasses='<circle cx="49" cy="33" r="9" fill="none" stroke="#ddbf77" stroke-width="2"/><path d="M56 39v15l-5 4" fill="none" stroke="#ddbf77" stroke-width="1.5"/>';
 const accessories={
  4:`<path d="M22 35h36v10H22Z" fill="${accent}" stroke="#466571" stroke-width="1.5"/><path d="M26 38h28m-28 3h28" stroke="#ffffff77"/>`,
  5:`<path d="m23 48 17 9 17-9-5 14-12-6-12 6Z" fill="${accent}"/>`,
  6:`<path d="m29 48 11 19 11-19" fill="none" stroke="${accent}" stroke-width="4"/><circle cx="40" cy="69" r="7" fill="#efc56d" stroke="#a87939" stroke-width="2"/>`,
  7:`<path d="M17 73h12" stroke="${accent}" stroke-width="6"/>`,
  8:`<path d="m23 51 35 30" stroke="${accent}" stroke-width="3"/><rect x="44" y="71" width="18" height="10" rx="3" fill="${accent}" stroke="#233443" stroke-width="2"/>`,
  9:`<path d="M25 49q15 19 30 0" fill="none" stroke="#edca79" stroke-width="3"/><circle cx="40" cy="59" r="3" fill="${accent}"/>`
 };
 accessories[10]=`<path d="m22 29-5-11 13 8h20l13-8-5 11-5 15-13 6-13-6Z" fill="#f1cfac" stroke="#9c674d" stroke-width="2"/><path d="m23 30 12 3-5 5m27-8-12 3 5 5" fill="${accent}"/><path d="m37 42 3 3 3-3Z" fill="#413e3e"/>`;
 accessories[11]=`<rect x="21" y="24" width="38" height="24" rx="6" fill="#bac9c5" stroke="#476271" stroke-width="2"/><path d="M27 31h8m10 0h8" stroke="${accent}" stroke-width="4"/><path d="M30 41h20" stroke="#476271" stroke-width="2"/>`;
 accessories[12]=`<path d="m27 51 13 6 13-6v14l-13-7-13 7Z" fill="${accent}" stroke="#233443" stroke-width="2"/><circle cx="40" cy="58" r="3" fill="#e9cc8f"/>`;
 accessories[13]=`<rect x="50" y="65" width="11" height="18" rx="2" fill="#35585b" stroke="#233443" stroke-width="2"/><path d="M57 65V55" stroke="#233443" stroke-width="2"/><path d="M53 70h5m-5 4h5" stroke="${accent}" stroke-width="2"/>`;
 extra=accessories[p.accessory]||extra;
 const badge=p.badge===1?`<path d="m29 64 2-4 2 4 5 1-4 3 1 5-4-3-4 3 1-5-4-3Z" fill="${accent}"/>`:p.badge===2?`<path d="m34 60-8 10h5l-2 8 9-12h-5Z" fill="${accent}"/>`:p.badge===3?`<circle cx="32" cy="66" r="6" fill="#eff2df"/><path d="M29 70v5h6v-5" fill="#eff2df"/><circle cx="30" cy="65" r="1.5" fill="#253948"/><circle cx="34" cy="65" r="1.5" fill="#253948"/>`:'';
 if(p.glasses===5)glasses='<rect x="18" y="22" width="44" height="25" rx="12" fill="#78bcc7" stroke="#172638" stroke-width="3"/><ellipse cx="36" cy="28" rx="13" ry="4" fill="#d7f5ec"/><path d="M23 42h34" stroke="#537d96" stroke-width="6"/>';
 const shoeDetails=p.shoes===1?`<path d="M25 85h12m8 0h11" stroke="${shoe}" stroke-width="8"/>`:p.shoes===2?`<path d="m26 91 9 3m11-3 8 3" stroke="${accent}" stroke-width="3"/>`:'';
 const bagDetail=p.bag===2?`<path d="m25 48 32 35" stroke="${accent}" stroke-width="3"/><rect x="46" y="71" width="21" height="17" rx="4" fill="${accent}" stroke="#233443" stroke-width="2"/>`:p.bag===3?`<path d="M15 52v29" stroke="${accent}" stroke-width="4"/>`:'';
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 105" aria-hidden="true"><ellipse cx="40" cy="98" rx="25" ry="5" fill="#142b32" opacity=".25"/>${p.bag?`<rect x="12" y="50" width="18" height="36" rx="8" fill="${id}" stroke="#233443" stroke-width="3"/>`:''}<g stroke="#233443" stroke-width="2.5"><rect x="26" y="75" width="12" height="20" rx="5" fill="${pantsOf(p)}"/><rect x="43" y="75" width="12" height="20" rx="5" fill="${pantsOf(p)}"/><rect x="23" y="89" width="17" height="8" rx="4" fill="${shoe}"/><rect x="41" y="89" width="17" height="8" rx="4" fill="${shoe}"/><rect x="17" y="49" width="13" height="30" rx="6" fill="${torso}"/><rect x="51" y="49" width="13" height="30" rx="6" fill="${torso}"/><rect x="24" y="45" width="33" height="39" rx="9" fill="${torso}"/><rect x="17" y="13" width="46" height="35" rx="15" fill="${id}"/><rect x="22" y="22" width="36" height="25" rx="11" fill="${face}"/></g>${detail}<circle cx="31" cy="33" r="3" fill="#253943"/><circle cx="49" cy="33" r="3" fill="#253943"/><path d="M36 40q4 3 8 0" fill="none" stroke="#b67568" stroke-width="2"/>${top}${glasses}${extra}${badge}${shoeDetails}${bagDetail}<circle cx="54" cy="76" r="4" fill="${id}"/></svg>`;
 const key=(body+id).replaceAll('#',''),defs=`<defs><linearGradient id="suit-${key}" x2=".3" y2="1"><stop stop-color="${body}"/><stop offset=".5" stop-color="${body}"/><stop offset="1" stop-color="#263b4c"/></linearGradient><linearGradient id="head-${key}" x2=".2" y2="1"><stop stop-color="${id}"/><stop offset="1" stop-color="${id}" stop-opacity=".68"/></linearGradient></defs>`;
 return svg.replace('aria-hidden="true">','aria-hidden="true">'+defs).replace(/<rect x="(?:17|51|24)" y="(?:49|45)"[^>]+>/g,tag=>tag.replace(`fill="${torso}"`,`fill="url(#suit-${key})"`)).replace(`<rect x="17" y="13" width="46" height="35" rx="15" fill="${id}"`,`<rect x="17" y="13" width="46" height="35" rx="15" fill="url(#head-${key})"`);
}
function lit(c,fill,x,y,w,h){if(typeof fill!=='string'||!/^#[0-9a-f]{6}$/i.test(fill)||h<10)return fill;const g=c.createLinearGradient?.(x,y,x+w*.5,y+h);if(!g?.addColorStop)return fill;g.addColorStop(0,fill);g.addColorStop(.48,fill);const n=parseInt(fill.slice(1),16),shade=(n>>16)*.65<<16|((n>>8&255)*.65<<8)|(n&255)*.65;g.addColorStop(1,'#'+(shade>>>0).toString(16).padStart(6,'0'));return g;}
function rr(c,x,y,w,h,r,fill,stroke='#172638'){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=lit(c,fill,x,y,w,h);c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=3.3;c.stroke();}}
function polygon(c,points,fill,stroke=null){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}}
// Perfil (siempre dibujado mirando a la derecha; la izquierda es su espejo).
// La cara y el pecho solo enseñan la mitad delantera: lo que hay en el centro
// del frente (ojos, corbatas, gafas, máscaras) se desplaza hacia el borde
// delantero, se estrecha y se recorta con la silueta, así nunca aparece entero.
function faceSide(c){c.beginPath();c.rect(8,-112,40,90);c.clip();c.translate(8,0);c.scale(.6,1);}
function chestSide(c){c.beginPath();c.roundRect(-16,-52,33,39,13);c.clip();c.translate(10,0);c.scale(.5,1);}
function dim(hex,k=.72){if(typeof hex!=='string'||!/^#[0-9a-f]{6}$/i.test(hex))return hex;const n=parseInt(hex.slice(1),16);return '#'+[n>>16,n>>8&255,n&255].map(v=>Math.round(v*k).toString(16).padStart(2,'0')).join('');}
// Mochila vista desde atrás: cuerpo centrado en la espalda (dentro del torso,
// entre los brazos), tirantes que salen de los hombros y bolsillo. La
// bandolera muestra la correa en diagonal y la bolsa apoyada en la cadera.
function backpackBack(c,p,id,accent,torso){
 if(p.bag===2){c.strokeStyle=accent;c.lineWidth=3;c.beginPath();c.moveTo(15,-49);c.lineTo(-17,-16);c.stroke();rr(c,-24,-22,19,15,4,accent);return;}
 c.strokeStyle=dim(accent,.75);c.lineWidth=4;c.beginPath();c.moveTo(-10,-53);c.lineTo(-10,-47);c.moveTo(10,-53);c.lineTo(10,-47);c.stroke();
 rr(c,-15,-50,30,33,9,dim(id,.86));rr(c,-15,-50,30,12,8,dim(id,.68));
 if(p.bag===3){c.fillStyle=accent;c.fillRect(-2,-39,4,20);rr(c,-10,-29,20,8,3,accent,null);}
 else rr(c,-9,-33,18,11,4,accent,null);
 c.fillStyle='#ffffff40';c.fillRect(-11,-46,7,2);
}
function additions(c,p,id,accent,shoe,step,dir='down',sx=1){
 const side=dir==='left'||dir==='right',back=dir==='up',faceOn=()=>{c.save();if(side)faceSide(c);},chestOn=()=>{c.save();if(side)chestSide(c);};
 if(p.hat===8){rr(c,-23,-87,46,22,12,accent);rr(c,-25,-71,50,8,3,id);c.fillStyle=accent;c.beginPath();c.arc(0,-91,6,0,Math.PI*2);c.fill();}
 if(p.hat===9){rr(c,-14,-94,28,24,4,id);rr(c,-32,-76,64,7,3,accent);}
 if(p.hat===10){polygon(c,[[-23,-66],[-23,-91],[-5,-79]],id,'#233443');polygon(c,[[23,-66],[23,-91],[5,-79]],id,'#233443');polygon(c,[[-18,-74],[-18,-84],[-10,-78]],accent);polygon(c,[[18,-74],[18,-84],[10,-78]],accent);}
 if(p.hat===11){polygon(c,[[-30,-80],[0,-95],[30,-80],[0,-67]],'#253948',accent);c.strokeStyle=accent;c.lineWidth=3;c.beginPath();c.moveTo(27,-79);c.lineTo(27,-58);c.stroke();}
 if(p.hat===12){polygon(c,[[-24,-72],[0,-108],[24,-72]],id,'#233443');rr(c,-31,-76,62,7,3,accent);polygon(c,[[-2,-98],[1,-92],[7,-91],[2,-87],[3,-81],[-2,-84],[-7,-81],[-6,-87],[-11,-91],[-5,-92]],'#f2ca79');}
 if(p.hat===13){c.fillStyle=accent;c.beginPath();c.ellipse(-2,-79,28,14,-.1,0,Math.PI*2);c.fill();rr(c,-16,-72,39,5,2,id);}
 if(p.hat===14){rr(c,-25,-90,50,23,12,id);for(const x of [-12,0,12])rr(c,x-2,-85,4,12,2,accent,null);}
 if(p.hat===16){c.fillStyle='#b9975f';c.beginPath();c.ellipse(0,-76,34,9,0,0,Math.PI*2);c.fill();c.strokeStyle='#6c5531';c.lineWidth=2;c.stroke();rr(c,-18,-96,36,22,10,'#c9a96c','#6c5531');rr(c,-18,-82,36,5,2,accent,null);}
 if(p.hat===17){c.fillStyle='#fbfbf6';for(const [xx,yy,r] of [[-12,-98,12],[0,-104,13],[12,-98,12]]){c.beginPath();c.arc(xx,yy,r,0,Math.PI*2);c.fill();}rr(c,-20,-92,40,20,4,'#fbfbf6','#9aa3a8');}
 if(p.hat===18){c.save();c.globalAlpha*=.42;c.fillStyle='#bfe8ff';c.beginPath();c.arc(0,-63,33,0,Math.PI*2);c.fill();c.restore();c.strokeStyle='#e8f6ff';c.lineWidth=3;c.beginPath();c.arc(0,-63,33,0,Math.PI*2);c.stroke();c.strokeStyle='#ffffffaa';c.beginPath();c.arc(-8,-74,18,3.6,4.5);c.stroke();rr(c,-26,-36,52,8,3,'#9fb1c4');}
 if(p.hat===15){c.strokeStyle=accent;c.lineWidth=5;c.beginPath();c.arc(0,-57,24,Math.PI,0);c.stroke();polygon(c,[[0,-107],[5,-98],[15,-97],[8,-89],[10,-79],[0,-84],[-10,-79],[-8,-89],[-15,-97],[-5,-98]],'#f5ce79','#a77546');}
 if(!back){faceOn();if(p.accessory===10){polygon(c,[[-18,-65],[-24,-81],[-11,-69],[11,-69],[24,-81],[18,-65],[13,-49],[0,-44],[-13,-49]],'#f1cfac','#9c674d');polygon(c,[[-17,-62],[-4,-59],[-10,-54]],accent);polygon(c,[[17,-62],[4,-59],[10,-54]],accent);polygon(c,[[-3,-49],[0,-46],[3,-49]],'#413e3e');}c.restore();}
 if(!back){faceOn();if(p.accessory===11){rr(c,-20,-71,40,27,6,'#bac9c5','#476271');rr(c,-14,-65,9,4,1,accent,null);rr(c,5,-65,9,4,1,accent,null);rr(c,-10,-51,20,2,1,'#476271',null);}c.restore();}
 if(!back){chestOn();if(p.accessory===12){polygon(c,[[-14,-45],[0,-39],[14,-45],[14,-30],[0,-38],[-14,-30]],accent,'#233443');rr(c,-3,-42,6,6,2,'#e9cc8f',null);}c.restore();}
 if(!back){chestOn();if(p.accessory===13){rr(c,12,-31,11,18,2,'#35585b');rr(c,18,-41,2,10,1,'#233443',null);rr(c,15,-27,5,2,1,accent,null);rr(c,15,-23,5,2,1,accent,null);}c.restore();}
 if(!back){faceOn();if(p.glasses===3){rr(c,-19,-66,17,12,3,'#152635','#b5d0dc');rr(c,2,-66,17,12,3,'#152635','#b5d0dc');c.strokeStyle='#152635';c.lineWidth=3;c.beginPath();c.moveTo(-2,-62);c.lineTo(2,-62);c.stroke();}c.restore();}
 if(!back){faceOn();if(p.glasses===4){c.strokeStyle='#ddbf77';c.lineWidth=2;c.beginPath();c.arc(10,-60,9,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(17,-53);c.lineTo(17,-38);c.lineTo(11,-32);c.stroke();}c.restore();}
 if(!back){faceOn();if(p.accessory===4){rr(c,-18,-58,36,13,5,accent,'#466571');c.strokeStyle='#ffffff77';c.lineWidth=1;for(const y of [-54,-50]){c.beginPath();c.moveTo(-13,y);c.lineTo(13,y);c.stroke();}}c.restore();}
 if(!back){chestOn();if(p.accessory===5)polygon(c,[[-20,-46],[0,-39],[20,-46],[14,-29],[0,-39],[-14,-29]],accent);c.restore();}
 if(!back){chestOn();if(p.accessory===6){c.strokeStyle=accent;c.lineWidth=4;c.beginPath();c.moveTo(-12,-47);c.lineTo(0,-25);c.lineTo(12,-47);c.stroke();c.fillStyle='#efc56d';c.beginPath();c.arc(0,-23,7,0,Math.PI*2);c.fill();}c.restore();}
 if(p.accessory===7)rr(c,-26,-25,13,6,2,accent,null);
 if(!back){chestOn();if(p.accessory===8){c.strokeStyle=accent;c.lineWidth=3;c.beginPath();c.moveTo(-18,-47);c.lineTo(18,-16);c.stroke();rr(c,8,-25,20,12,3,accent);}c.restore();}
 if(!back){chestOn();if(p.accessory===9){c.strokeStyle='#edca79';c.lineWidth=3;c.beginPath();c.arc(0,-48,15,.15,Math.PI-.15);c.stroke();rr(c,-3,-33,6,5,2,accent,null);}c.restore();}
 if(p.bag===2&&!back){c.strokeStyle=accent;c.lineWidth=3;c.beginPath();c.moveTo(-15,-49);c.lineTo(24,-12);c.stroke();rr(c,13,-20,21,17,4,accent);}
 if(p.bag===3&&!back)rr(c,-25,-40,5,25,2,accent,null);
 if(p.pants===2){c.strokeStyle='#bfd0e3';c.lineWidth=1;c.beginPath();c.moveTo(-9,-17);c.lineTo(-9,-4);c.moveTo(9,-17);c.lineTo(9,-4);c.stroke();}
 if(p.pants===3){rr(c,-16,-17+step,6,8,2,'#808769');rr(c,10,-17-step,6,8,2,'#808769');}
 if(p.shoes===1){rr(c,-15,-11+step,14,10,3,shoe);rr(c,3,-11-step,14,10,3,shoe);}
 if(p.shoes===2){c.strokeStyle=accent;c.lineWidth=3;c.beginPath();c.moveTo(-13,-2+step);c.lineTo(-5,1+step);c.moveTo(5,-2-step);c.lineTo(13,1-step);c.stroke();}
 if(!back){chestOn();if(p.badge===1)polygon(c,[[-10,-40],[-8,-35],[-3,-34],[-7,-30],[-6,-25],[-10,-28],[-14,-25],[-13,-30],[-17,-34],[-12,-35]],accent);c.restore();}
 if(!back){chestOn();if(p.badge===2)polygon(c,[[-6,-42],[-15,-31],[-10,-31],[-13,-23],[-2,-35],[-8,-35]],accent);c.restore();}
 if(!back){chestOn();if(p.badge===3){c.fillStyle='#eff2df';c.beginPath();c.arc(-9,-35,6,0,Math.PI*2);c.fill();rr(c,-13,-31,8,6,1,'#eff2df',null);c.fillStyle='#253948';c.fillRect(-12,-37,2,3);c.fillRect(-7,-37,2,3);}c.restore();}
}
// Rumbo de cada personaje (abajo, arriba, izquierda, derecha), deducido de cómo
// se mueve entre fotogramas; al parar conserva el último. Con histéresis para no
// parpadear en las diagonales.
let noShadows=false;
// Campo Grande no tiene sombras: el mapa lo indica antes de dibujar.
export function setShadows(on){noShadows=!on;}
export const shadowsOn=()=>!noShadows;
const HEADINGS=new Map();let lastTurnAge=1e9;
export function headingOf(p,x,y,time){
 const id=p.id||('~'+(p.name||'')+(p.color||0));let h=HEADINGS.get(id);lastTurnAge=1e9;
 if(!h){const i=p.input||{},ix=i.x||0,iy=i.y||0;h={x,y,time,dir:Math.abs(iy)>Math.abs(ix)*1.2?(iy<0?'up':'down'):ix?(ix<0?'left':'right'):'down',turned:-1e9};HEADINGS.set(id,h);if(HEADINGS.size>200)HEADINGS.delete(HEADINGS.keys().next().value);}
 let dx=x-h.x,dy=y-h.y;
 if(p.input&&(p.input.x||p.input.y)){dx=p.input.x||0;dy=p.input.y||0;}
 else if(time===h.time||Math.hypot(dx,dy)<.35){lastTurnAge=time-h.turned;return h.dir;}
 else if(Math.hypot(dx,dy)>160){h.x=x;h.y=y;h.time=time;return h.dir;}
 const ax=Math.abs(dx),ay=Math.abs(dy),was=h.dir;
 if(ay>ax*1.2)h.dir=dy<0?'up':'down';
 else if(ax>ay*1.2||h.dir==='left'||h.dir==='right')h.dir=dx<0?'left':'right';
 if(h.dir!==was)h.turned=time;lastTurnAge=time-h.turned;
 h.x=x;h.y=y;h.time=time;return h.dir;
}
export function drawRobot(c,p,x,y,scale,time,moving=false,self=false){
 if(p.alive===false){
  const float=Math.sin(time/360+(p.color||0))*4,body=clothes(p),sway=moving?Math.sin(time/100)*3:Math.sin(time/580)*2;
  c.save();c.translate(x,y-8+float);c.scale(scale,scale);c.globalAlpha*=.56;
  c.fillStyle=body;c.strokeStyle='#7daeb6';c.lineWidth=2.5;c.beginPath();c.moveTo(-21,-46);c.quadraticCurveTo(-34,-12,-25,9);for(let k=0;k<4;k++)c.quadraticCurveTo(-19+k*13+sway,2,-13+k*13,11);c.quadraticCurveTo(32,-8,21,-46);c.closePath();c.fill();c.stroke();
  c.save();c.beginPath();c.rect(-70,-125,140,105);c.clip();drawRobot(c,{...p,alive:true},0,0,1,time,false,false);c.restore();
  c.strokeStyle='#e6fff17a';c.lineWidth=2;c.beginPath();c.moveTo(-15,-35);c.quadraticCurveTo(-22,-15,-16,-5);c.stroke();
  if(p.deathAt){const age=Date.now()-p.deathAt;if(age>=0&&age<1500){c.globalAlpha*=1-age/1500;c.strokeStyle='#c9effb';c.lineWidth=2;c.beginPath();c.ellipse(0,-20,20+age*.025,32+age*.02,0,0,Math.PI*2);c.stroke();}}
  c.restore();return;
 }
 c.save();c.translate(x,y);c.scale(scale,scale);if(p.alive===false)c.globalAlpha=.45;
 const emote=emotePhase(p,time,moving);drawPet(c,p,time,moving);applyEmote(c,p,emote);
 const dir=headingOf(p,x,y,time),FXs=dir==='left'?-1:1,side=dir==='left'||dir==='right',sx=dir==='left'?-1:1,phase=time/105+(p.color||0)*.7,gait=Math.sin(phase),bob=moving?-Math.abs(gait)*2.6:Math.sin(time/700+(p.color||0))*.7,step=moving?gait*5:0,id=identity(p),top=clothes(p),torso=top,accent=trim(p),hair=HAIR_PALETTE[p.hairColor||0],face=faceOf(p),shoe=shoesOf(p);
 if(!noShadows)for(const [rx,ry,a] of [[29,9,'#0a142a0b'],[25,7,'#0a142a1f'],[19,5,'#0a142a38']]){c.fillStyle=a;c.beginPath();c.ellipse(0,2,rx,ry,0,0,Math.PI*2);c.fill();}
 if(self){c.strokeStyle=id+'99';c.lineWidth=1.5;c.beginPath();c.ellipse(0,1,29,9,0,0,Math.PI*2);c.stroke();}
 // De espaldas la mochila no va detrás del cuerpo ni a un lado: se dibuja más
 // abajo, centrada sobre la espalda y con el mismo rebote del torso.
 if(p.bag&&dir!=='up')rr(c,side&&sx<0?12:-29,-45,17,35,7,id);
 c.translate(0,bob);
 // Marcha: las piernas se alternan con claridad (una se levanta mientras la otra
 // apoya), el cuerpo rebota un poco y los brazos casi no se mueven.
 const lift=v=>-Math.max(0,v)*5.5,pants=pantsOf(p);
 // Giro: al cambiar de rumbo el cuerpo se estrecha un instante y se abre en la nueva dirección.
 const turn=lastTurnAge<130?.7+.3*(lastTurnAge/130):1;
 if(side){c.scale(sx*turn,1);const sw=moving?gait*7:0,la=moving?lift(gait):0,lb=moving?lift(-gait):0;
  // Pierna trasera (más oscura) y delantera; las punteras miran hacia delante (+x).
  const foot=(fx,fy,col)=>{c.beginPath();c.moveTo(fx-7,fy);c.lineTo(fx+6,fy);c.quadraticCurveTo(fx+17,fy,fx+17,fy+5);c.quadraticCurveTo(fx+17,fy+9,fx+11,fy+9);c.lineTo(fx-7,fy+9);c.quadraticCurveTo(fx-9,fy+9,fx-9,fy+5);c.quadraticCurveTo(fx-9,fy,fx-7,fy);c.closePath();c.fillStyle=col;c.fill();c.strokeStyle='#172638';c.lineWidth=3.3;c.stroke();};
  rr(c,-8-sw,-21+lb,14,20,6,dim(pants));foot(-2-sw,-6+lb,dim(shoe));
  rr(c,-6+sw,-21+la,14,20,6,pants);foot(sw,-6+la,shoe);
  rr(c,-16,-52,33,39,13,torso);}
 else{if(turn<1)c.scale(turn,1);const la=moving?lift(gait):0,lb=moving?lift(-gait):0,fa=moving?gait*1.2:0;
  rr(c,-17,-21+lb,15,20,6,pants);rr(c,3,-21+la,15,20,6,pants);rr(c,-17,-5+lb+fa*.6,18,8,4,shoe);rr(c,2,-5+la-fa*.6,18,8,4,shoe);
  rr(c,-27,-45-step*.06,14,27,7,torso);rr(c,14,-45+step*.06,14,27,7,torso);rr(c,-20,-52,41,39,14,torso);}
c.strokeStyle='#ffffff42';c.lineWidth=3;c.beginPath();c.moveTo(-15,-44);c.quadraticCurveTo(-18,-30,-14,-23);c.stroke();
 c.strokeStyle='#1d354955';c.lineWidth=2;
 if(dir!=='up'){c.save();if(side)chestSide(c);if(p.skin===0){c.fillStyle='#f4efe2';c.beginPath();c.moveTo(-14,-48);c.lineTo(0,-35);c.lineTo(14,-48);c.closePath();c.fill();c.fillStyle=accent;c.fillRect(-2,-35,4,16);}
 else if(p.skin===1){c.strokeStyle=accent;c.lineWidth=3;c.beginPath();c.moveTo(-17,-51);c.quadraticCurveTo(0,-33,17,-51);c.stroke();c.fillStyle=accent;c.fillRect(-9,-40,2,12);c.fillRect(7,-40,2,12);rr(c,-11,-25,22,9,3,accent,null);rr(c,-24,-22,10,5,2,accent,null);rr(c,14,-22,10,5,2,accent,null);}
 else if(p.skin===2){c.strokeStyle=accent;c.lineWidth=4;for(const yy of [-43,-35,-27,-18]){c.beginPath();c.moveTo(-15,yy);c.lineTo(16,yy);c.stroke();}rr(c,-22,-20,8,5,2,accent,null);rr(c,14,-20,8,5,2,accent,null);}
 else if(p.skin===3){c.fillStyle=accent;c.beginPath();c.moveTo(-21,-49);c.lineTo(-11,-49);c.lineTo(-17,-39);c.lineTo(-24,-43);c.moveTo(21,-49);c.lineTo(11,-49);c.lineTo(17,-39);c.lineTo(24,-43);c.fill();rr(c,-15,-21,31,6,2,accent,null);}
 else if(p.skin===4){c.strokeStyle=accent;c.lineWidth=4;c.beginPath();c.moveTo(-12,-46);c.lineTo(-12,-18);c.moveTo(12,-46);c.lineTo(12,-18);c.moveTo(-16,-22);c.lineTo(16,-22);c.stroke();}
 else if(p.skin===5){c.strokeStyle='#f6f1e3';c.lineWidth=5;c.beginPath();c.moveTo(-13,-49);c.lineTo(-3,-31);c.lineTo(-9,-17);c.moveTo(13,-49);c.lineTo(3,-31);c.lineTo(9,-17);c.stroke();c.fillStyle=accent;c.fillRect(5,-29,8,8);}
 else if(p.skin===6){c.strokeStyle=accent;c.lineWidth=4;c.beginPath();c.moveTo(-13,-49);c.lineTo(-3,-31);c.lineTo(-9,-17);c.moveTo(13,-49);c.lineTo(3,-31);c.lineTo(9,-17);c.stroke();c.fillStyle='#f6f1e3';c.fillRect(-15,-20,30,3);}

 else if(p.skin===7){rr(c,-15,-49,4,32,1,accent,null);rr(c,11,-49,4,32,1,accent,null);if(!side){c.fillStyle='#f5efda';c.font='bold 20px sans-serif';c.textAlign='center';c.fillText('7',0,-25);}}
 else if(p.skin===8){polygon(c,[[-14,-49],[0,-34],[14,-49],[10,-17],[-10,-17]],accent);rr(c,-1,-34,2,20,1,'#ead5a5',null);polygon(c,[[-8,-44],[0,-40],[8,-44],[7,-36],[0,-40],[-7,-36]],'#493b3b');}
 else if(p.skin===9){rr(c,-2,-49,4,34,1,accent,null);rr(c,-16,-23,32,4,1,accent,null);rr(c,-12,-39,9,9,2,'#ead5a5');rr(c,4,-39,9,9,2,'#ead5a5');}
 else if(p.skin===10){rr(c,-19,-50,13,32,5,'#a08453',null);rr(c,6,-50,13,32,5,'#a08453',null);rr(c,-16,-37,9,8,2,accent);rr(c,7,-37,9,8,2,accent);c.strokeStyle='#5f4a2c';c.lineWidth=2;c.beginPath();c.moveTo(0,-50);c.lineTo(0,-16);c.stroke();}
 else if(p.skin===11){rr(c,-19,-51,38,36,13,'#eef1f4',null);rr(c,-8,-44,16,12,4,accent);c.fillStyle='#ff7185';c.beginPath();c.arc(0,-38,3,0,Math.PI*2);c.fill();rr(c,-19,-24,38,5,2,'#9fb1c4',null);}
 c.restore();if(side){rr(c,-8,-46+(moving?gait*.6:0),12,26,6,dim(torso,.9));c.fillStyle=dim(torso,.8);c.beginPath();c.ellipse(-2,-21+(moving?gait*.6:0),5,4,0,0,Math.PI*2);c.fill();}}else{rr(c,-20,-52,41,39,14,torso);rr(c,-12,-46,24,28,7,id+'cc',null);rr(c,-9,-42,18,5,2,accent,null);if(p.bag)backpackBack(c,p,id,accent,torso);}
 if(side){rr(c,-23,-82,46,39,18,id);rr(c,-1,-72,22,29,11,face);c.strokeStyle='#ffffff68';c.lineWidth=2.5;c.beginPath();c.moveTo(2,-66);c.quadraticCurveTo(4,-70,10,-70);c.stroke();
  // Un solo ojo, cerca del borde delantero, y media sonrisa.
  c.fillStyle='#253943';c.beginPath();c.ellipse(13,-59,2.7,4,0,0,Math.PI*2);c.fill();c.strokeStyle='#b67568';c.lineWidth=2;c.beginPath();c.arc(13,-55,4,.35,Math.PI/2+.15);c.stroke();}
 else{rr(c,-25,-82,50,39,18,id);if(dir==='up'){c.fillStyle=hair;c.beginPath();c.ellipse(0,-66,19,15,0,0,Math.PI*2);c.fill();}else{rr(c,-20,-72,40,29,13,face);c.strokeStyle='#ffffff68';c.lineWidth=2.5;c.beginPath();c.moveTo(-16,-66);c.quadraticCurveTo(-14,-70,-5,-70);c.stroke();
 const gaze=side?0:(p.facing||1)*1.5;c.save();if(side){c.translate(sx*6,0);c.scale(.85,1);}c.fillStyle='#253943';for(const ex of [-9,9]){c.beginPath();c.ellipse(ex+gaze,-59,3,4,0,0,Math.PI*2);c.fill();}c.strokeStyle='#b67568';c.lineWidth=2;c.beginPath();c.arc(gaze,-54,4,.2,Math.PI-.2);c.stroke();c.restore();}}
 if(side&&p.hat===1){rr(c,-23,-83,46,17,10,id);rr(c,-6,-70,36,5,2,'#294353');}
 else if(side&&p.hat>=2&&p.hat<=5){c.fillStyle=hair;c.beginPath();c.moveTo(20,-68);c.quadraticCurveTo(21,-87,-1,-87);c.quadraticCurveTo(-27,-86,-24,-56);c.lineTo(-13,-60);c.lineTo(-7,-71);c.lineTo(3,-69);c.lineTo(9,-76);c.lineTo(15,-70);c.closePath();c.fill();if(p.hat===3)rr(c,-26,-72,10,37,4,hair,null);if(p.hat===4){for(let a=0;a<5;a++){c.beginPath();c.arc(-19+a*8,-81+Math.sin(a)*4,7,0,Math.PI*2);c.fill();}}if(p.hat===5){c.beginPath();c.arc(-25,-71,10,0,Math.PI*2);c.fill();}}
 else if(p.hat===1){rr(c,-25,-83,49,17,10,id);rr(c,-30,-70,61,5,2,'#294353');}
 else if(p.hat>=2&&p.hat<=5){c.fillStyle=hair;c.beginPath();c.moveTo(-22,-63);c.quadraticCurveTo(-26,-86,0,-86);c.quadraticCurveTo(27,-85,24,-61);c.lineTo(12,-74);c.lineTo(3,-67);c.lineTo(-5,-78);c.closePath();c.fill();if(p.hat===3){rr(c,-26,-71,8,35,4,hair,null);rr(c,18,-71,8,35,4,hair,null);}if(p.hat===4){for(let a=0;a<6;a++){c.beginPath();c.arc(-21+a*8,-80+Math.sin(a)*4,7,0,Math.PI*2);c.fill();}}if(p.hat===5){c.beginPath();c.arc(27,-67,10,0,Math.PI*2);c.fill();}}
 else if(p.hat===6){c.strokeStyle='#6baa5a';c.beginPath();c.moveTo(0,-80);c.lineTo(0,-93);c.stroke();c.fillStyle='#97d077';c.beginPath();c.ellipse(7,-93,9,4,-.5,0,Math.PI*2);c.fill();}else if(p.hat===7){c.fillStyle='#ffc65c';c.beginPath();c.moveTo(-20,-81);c.lineTo(-22,-96);c.lineTo(-8,-88);c.lineTo(0,-100);c.lineTo(8,-88);c.lineTo(22,-96);c.lineTo(20,-81);c.closePath();c.fill();}
 if(p.glasses&&p.glasses<=2&&dir!=='up'){if(side){c.strokeStyle='#26394b';c.lineWidth=2;c.beginPath();c.moveTo(8,-61);c.lineTo(-7,-63);c.stroke();}c.save();if(side)faceSide(c);c.strokeStyle='#26394b';c.lineWidth=2;for(const ex of [-10,10]){c.beginPath();if(p.glasses===1)c.ellipse(ex,-60,9,7,0,0,Math.PI*2);else c.roundRect(ex-8,-67,16,14,3);c.stroke();}c.beginPath();c.moveTo(-2,-61);c.lineTo(2,-61);c.stroke();c.restore();}
 if(p.accessory===1&&dir!=='up'){c.save();if(side)chestSide(c);c.fillStyle='#a75460';c.beginPath();c.moveTo(0,-43);c.lineTo(-5,-22);c.lineTo(0,-17);c.lineTo(5,-22);c.closePath();c.fill();c.restore();}else if(p.accessory===2&&side){c.strokeStyle='#28394c';c.lineWidth=5;c.beginPath();c.arc(-2,-65,23,Math.PI*1.05,-.05);c.stroke();rr(c,-16,-70,11,20,5,'#f4dd9e');}else if(p.accessory===2){c.strokeStyle='#28394c';c.lineWidth=5;c.beginPath();c.arc(0,-65,26,Math.PI,0);c.stroke();rr(c,-30,-69,8,19,4,'#f4dd9e');rr(c,22,-69,8,19,4,'#f4dd9e');}else if(p.accessory===3){rr(c,-21,-47,43,8,4,'#e9c166',null);rr(c,9,-44,8,17,3,'#e9c166',null);}
 if(p.glasses===5&&dir!=='up'){c.save();if(side)faceSide(c);c.save();c.globalAlpha*=.5;c.fillStyle='#79bcc8';c.beginPath();c.roundRect(-23,-72,46,28,13);c.fill();c.restore();c.strokeStyle='#172638';c.lineWidth=2.5;c.beginPath();c.roundRect(-23,-72,46,28,13);c.stroke();c.save();c.beginPath();c.roundRect(-19,-69,38,20,10);c.clip();c.globalAlpha*=.55;c.fillStyle='#d0f3ed';c.beginPath();c.ellipse(-3,-65,15,5,-.08,0,Math.PI*2);c.fill();c.restore();c.restore();}if(p.busy){c.strokeStyle=accent;c.lineWidth=4;c.beginPath();c.moveTo(25,-37);c.lineTo(34,-42+Math.sin(time/130)*4);c.stroke();c.fillStyle='#d0eee4';c.fillRect(32,-48,7,5);}
 additions(c,p,id,accent,shoe,step,dir,sx);c.fillStyle=id;c.beginPath();c.arc(12,-21,3,0,Math.PI*2);c.fill();drawEmoteOverlay(c,p,emote,torso);drawEffect(c,p,time);c.restore();
}
export function drawAvatar(canvas,p,time){const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);const scale=Math.min((canvas.width-20)/72,(canvas.height-24)/106);drawRobot(c,p,canvas.width/2,canvas.height-15,scale,time);}
export function drawHero(canvas,time){const c=canvas.getContext('2d');c.clearRect(0,0,600,330);rr(c,28,20,544,224,18,'#b9cac4','#718b87');c.fillStyle='#839b96';for(let i=0;i<9;i++)rr(c,40+i*65,100-Math.sin(i)*16,45,135,6,i%2?'#94aaa1':'#a7b9ab');rr(c,28,190,544,64,0,'#506a76');c.strokeStyle='#ead8ae';c.setLineDash([22,20]);c.lineWidth=3;c.beginPath();c.moveTo(30+time*.012%42,222);c.lineTo(570,222);c.stroke();c.setLineDash([]);rr(c,185,52,230,130,20,'#f0e1bf','#526d78');rr(c,199,64,72,50,9,'#80adb0','#436275');rr(c,285,64,55,50,9,'#87b8b7','#436275');rr(c,354,64,46,87,6,'#d2ba95','#627c80');rr(c,200,128,137,13,4,'#ca956a');for(const x of [221,375]){c.fillStyle='#263f4e';c.beginPath();c.arc(x,177,19,0,6.3);c.fill();c.fillStyle='#a6bbb3';c.beginPath();c.arc(x,177,9,0,6.3);c.fill();}c.fillStyle='#486c70';c.font='900 12px Segoe UI';c.textAlign='center';c.fillText('PUCELA US / EN RUTA',300,160);drawRobot(c,{color:3,skin:5,hat:3,bag:1},128,292,1.4,time);drawRobot(c,{color:2,skin:1,hat:1,accessory:2},470,292,1.4,time+200);drawRobot(c,{color:0,skin:0,hat:2,glasses:1},300,315,1.8,time+400);}
