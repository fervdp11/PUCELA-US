import {robotSVG} from './characters.js';

const clamp=v=>Math.max(0,Math.min(1,v));
const ease=v=>{v=clamp(v);return v*v*(3-2*v);};
export const KICK_TIME=1400;
// El contacto sucede antes de la caída. La escena termina dentro de los 9,5 s del resultado.
export function expulsionPose(milliseconds){
 const t=Math.max(0,milliseconds),fall=clamp((t-KICK_TIME)/1900);
 const footX=t<KICK_TIME?-310+310*ease((t-550)/850):-190*ease((t-KICK_TIME)/700);
 return {footX:footX||0,footOpacity:t<550||t>2400?0:1,x:155*fall,y:345*fall*fall,rotation:150*fall,impact:t>=KICK_TIME&&t<KICK_TIME+240};
}

function staffMarkup(kind){const teacher=kind==='teacher',host=kind==='host',coat=teacher?'#b4a080':host?'#c4677d':'#344960';return `<g class="staff staff-${kind}"><ellipse cx="40" cy="122" rx="38" ry="8" fill="#10213844"/><g class="staff-leg-left"><path d="M18 81h19v35H15Z" fill="#33465a" stroke="#1c3044" stroke-width="3"/><path d="M14 110h24v12H8q-2-11 6-12" fill="#e4dbc6" stroke="#24394a" stroke-width="3"/></g><g class="staff-leg-right"><path d="M45 81h19l5 35H45Z" fill="#33465a" stroke="#1c3044" stroke-width="3"/><path d="M44 110h24q14 0 15 12H43Z" fill="#e4dbc6" stroke="#24394a" stroke-width="3"/></g><g class="staff-arm-left"><path d="M12 45q-13 5-10 35l9 8 10-35Z" fill="${coat}" stroke="#25394b" stroke-width="3"/><circle cx="8" cy="83" r="8" fill="#d9b291" stroke="#25394b" stroke-width="3"/></g><path d="M18 39h42q12 8 13 48H8q0-32 10-48Z" fill="${coat}" stroke="#20364a" stroke-width="4"/><path d="M37 41v45" stroke="#dfd2b5" stroke-width="3"/><rect x="47" y="53" width="17" height="14" rx="2" fill="#ddd3ac"/><path d="m51 58 4 4 6-6" fill="none" stroke="#5a7b76" stroke-width="3"/><g class="staff-arm-right"><path d="M61 46q16-1 18 27l-14 5-10-25Z" fill="${coat}" stroke="#25394b" stroke-width="3"/><circle cx="73" cy="79" r="9" fill="#d9b291" stroke="#25394b" stroke-width="3"/></g><rect x="18" y="2" width="46" height="43" rx="19" fill="#e4bb97" stroke="#25394b" stroke-width="4"/><path d="M18 18V9q23-19 47 0v10l-12-8-21 5Z" fill="${teacher?'#6d5b4b':'#202e42'}"/>${host?'<path d="M31 34q10 6 20 0" fill="none" stroke="#8a4a3c" stroke-width="3" stroke-linecap="round"/><circle cx="27" cy="30" r="3" fill="#f2a0a8"/><circle cx="56" cy="30" r="3" fill="#f2a0a8"/>':`<path d="M20 26q22-8 43 0v12q-22 17-43-1Z" fill="${teacher?'#dfebe1':'#1c3448'}" stroke="#73938e" stroke-width="2"/>`}<path d="M30 22h3m16 0h3" stroke="#25394b" stroke-width="4"/>${teacher?'<g fill="none" stroke="#4b6570" stroke-width="2"><rect x="22" y="16" width="16" height="13" rx="4"/><rect x="44" y="16" width="16" height="13" rx="4"/><path d="M38 22h6"/></g>':host?'<path d="M17 20q-3-24 24-22 27-2 24 22l-8-9H25Z" fill="#6b4532" stroke="#3a2618" stroke-width="2"/><circle cx="41" cy="-4" r="9" fill="#6b4532" stroke="#3a2618" stroke-width="2"/><path d="M22 52h36l4 36H18Z" fill="#fff4e4" stroke="#c49a7f" stroke-width="2"/><path d="M30 66h20" stroke="#e7a1b0" stroke-width="3"/>':'<path d="M19 12h45V2q-24-10-45 0Z" fill="#233e53" stroke="#759297" stroke-width="2"/>'}</g>`;}
// Puertas batientes: cada hoja gira sobre su bisagra (eje vertical) hacia el espectador.
// Se proyecta en perspectiva: el canto libre describe un arco, crece al acercarse y,
// pasados 90°, se ve el reverso de la hoja. Al cerrar hace el mismo giro al revés.
// Las hojas se dibujan DELANTE del personal: lo van tapando a medida que pasan por delante.
const STAFF_WALK=58,DOOR_MAX_ANGLE=104;
export const DOOR_SETS={
 club:{cx:276,cy:176,focal:560,top:67,bottom:284,face:'#496078',back:'#33465c',edge:'#172b41',glass:'#142e45',glassEdge:'#86a6b2',handle:'#d9cda9',
  leaves:[{side:'left',hinge:178,w:97,dir:1,win:[11,81,85,144],handle:[80,177,212]},{side:'right',hinge:374,w:97,dir:-1,win:[13,83,85,144],handle:[83,177,212]}]},
 house:{cx:276,cy:222,focal:540,top:146,bottom:298,face:'#8a5a3a',back:'#6b452c',edge:'#3d2617',glass:'#cfe6ef',glassEdge:'#f3dfb8',handle:'#e8c66a',
  leaves:[{side:'left',hinge:224,w:52,dir:1,win:[10,42,160,214],handle:[44,226,246]},{side:'right',hinge:328,w:52,dir:-1,win:[10,42,160,214],handle:[44,226,246]}]},
 school:{cx:321,cy:144,focal:520,top:80,bottom:207,face:'#6f8f86',back:'#4f6b64',edge:'#34504a',glass:'#9dc5bc',glassEdge:'#e9dcc0',handle:'#e4cf8d',
  leaves:[{side:'left',hinge:250,w:71,dir:1,win:[10,58,92,140],handle:[61,146,170]},{side:'right',hinge:392,w:71,dir:-1,win:[10,58,92,140],handle:[61,146,170]}]}
};
function doorPoint(set,leaf,u,y,angle){const a=angle*Math.PI/180,X=leaf.hinge+leaf.dir*u*Math.cos(a),Z=u*Math.sin(a),k=set.focal/(set.focal-Z);return [set.cx+(X-set.cx)*k,set.cy+(y-set.cy)*k];}
function doorQuad(set,leaf,u1,u2,y1,y2,angle){const p=[doorPoint(set,leaf,u1,y1,angle),doorPoint(set,leaf,u2,y1,angle),doorPoint(set,leaf,u2,y2,angle),doorPoint(set,leaf,u1,y2,angle)];return 'M'+p.map(q=>q[0].toFixed(1)+' '+q[1].toFixed(1)).join('L')+'Z';}
function doorLine(set,leaf,u,y1,y2,angle){const a=doorPoint(set,leaf,u,y1,angle),b=doorPoint(set,leaf,u,y2,angle);return `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;}
export function doorLeafGeometry(set,leaf,open){const angle=DOOR_MAX_ANGLE*clamp(open),backside=angle>90;
 return {angle,backside,panel:doorQuad(set,leaf,0,leaf.w,set.top,set.bottom,angle),glass:doorQuad(set,leaf,leaf.win[0],leaf.win[1],leaf.win[2],leaf.win[3],angle),handle:doorLine(set,leaf,leaf.handle[0],leaf.handle[1],leaf.handle[2],angle)};}
function doorLeavesMarkup(prefix,set){return set.leaves.map(leaf=>{const g=doorLeafGeometry(set,leaf,0);return `<g class="swing-door ${prefix}-door-${leaf.side}" data-open="0"><path class="leaf-panel" d="${g.panel}" fill="${set.face}" stroke="${set.edge}" stroke-width="3" stroke-linejoin="round"/><path class="leaf-glass" d="${g.glass}" fill="${set.glass}" stroke="${set.glassEdge}" stroke-width="2"/><path class="leaf-handle" d="${g.handle}" stroke="${set.handle}" stroke-width="7" stroke-linecap="round"/></g>`;}).join('');}
function swingDoors(root,prefix,set,open){for(const leaf of set.leaves){const sel=`.${prefix}-door-${leaf.side}`,g=doorLeafGeometry(set,leaf,open);
 root.querySelector(sel)?.setAttribute('data-open',clamp(open).toFixed(3));
 const panel=root.querySelector(sel+' .leaf-panel');panel?.setAttribute('d',g.panel);panel?.setAttribute('fill',g.backside?set.back:set.face);
 root.querySelector(sel+' .leaf-glass')?.setAttribute('d',g.glass);
 const handle=root.querySelector(sel+' .leaf-handle');handle?.setAttribute('d',g.handle);handle?.setAttribute('opacity',g.backside?0:1);}}
// Apertura y cierre comunes a los cuatro mapas (el cierre empieza cuando el expulsado ya ha salido de escena).
export function doorOpenAmount(milliseconds){const t=Math.max(0,milliseconds);return ease((t-450)/700)*(1-ease((t-3350)/950));}
// El personal empuja o patea con sus propias extremidades: la pierna o el brazo
// del propio personaje giran sobre la cadera o el hombro hasta tocar al jugador.
function animateStaff(root,kind,t){const staff=root.querySelector('.staff-'+kind);if(!staff)return;const walking=t<1100,walk=walking?Math.sin(t/80)*12:0;
 const kick=kind==='teacher'?ease((t-(KICK_TIME-320))/320)*(1-ease((t-(KICK_TIME+260))/420)):0,push=kind==='bouncer'||kind==='host'?clubExitPose(t).push:0;
 const approach=kind==='teacher'?28:12*push;staff.setAttribute('transform',`translate(${-STAFF_WALK*(1-ease((t-300)/800))+approach} ${walking?Math.sin(t/65)*1.5:0})`);
 staff.querySelector?.('.staff-leg-left')?.setAttribute('transform',`rotate(${walk} 28 84)`);
 staff.querySelector?.('.staff-leg-right')?.setAttribute('transform',`rotate(${kick?-88*kick:-walk} 56 84)`);
 staff.querySelector?.('.staff-arm-left')?.setAttribute('transform',`rotate(${kick?20*kick:-walk*.7} 17 46)`);
 staff.querySelector?.('.staff-arm-right')?.setAttribute('transform',`rotate(${push?-82*push:kind==='teacher'&&t>1000&&t<1900?-30*ease((t-1000)/400):walk*.7} 60 46)`);}
export function terraceMarkup(subject,theme='club'){
 if(theme==='house')return houseExitMarkup(subject);if(theme==='gym')return gymExitMarkup(subject);if(theme==='club')return clubDoorMarkup(subject);
 const actor=subject?robotSVG({...subject,alive:true}).replace('<svg ','<svg x="0" y="0" width="72" height="95" '):'';
 const markup=`<div class="expulsion-terrace" role="img" aria-label="${subject?'Un profesor de cuerpo entero acompaña al jugador a la terraza y le da una patada cartoon; el jugador cae.':'Terraza del colegio: nadie ha sido expulsado.'}">
 <svg class="terrace-panorama" viewBox="0 0 720 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
 <defs><linearGradient id="terraceSky" x2="0" y2="1"><stop stop-color="#83b9ba"/><stop offset="1" stop-color="#eddcbc"/></linearGradient><clipPath id="terraceDoorway" clipPathUnits="userSpaceOnUse"><path d="M250 0H900V207H250Z"/></clipPath><pattern id="terraceBrick" width="60" height="32" patternUnits="userSpaceOnUse"><rect width="60" height="32" fill="#b98b67"/><path d="M0 0h60M0 32h60M30 0v32" stroke="#dfb58c" stroke-width="2"/></pattern></defs>
 <rect x="-2000" y="-1000" width="5000" height="4000" fill="url(#terraceSky)"/>
 <g fill="#fff7e3" opacity=".6"><ellipse cx="545" cy="63" rx="85" ry="18"/><ellipse cx="115" cy="48" rx="65" ry="15"/></g><circle cx="638" cy="48" r="24" fill="#ffe6a2"/>
 <path d="M470 332h55V210h75v122h45V249h75v111H470Z" fill="#759b9460"/>
 <path d="M-2000 209h2438v2791H-2000Z" fill="url(#terraceBrick)"/><path d="M0 207h443v15H0Z" fill="#e9c99a" stroke="#755f4d" stroke-width="4"/>
 <path d="M0 80h132v127H0Z" fill="#dfc39d" stroke="#947452" stroke-width="3"/><path d="M35 105h63v102H35Z" fill="#506e69"/><path d="M42 112h49v55H42Z" fill="#9dc5bc"/>
 
 <g fill="#a9cbc4" stroke="#5c7770" stroke-width="4"><rect x="28" y="261" width="72" height="66" rx="3"/><rect x="156" y="261" width="72" height="66" rx="3"/><rect x="284" y="261" width="72" height="66" rx="3"/></g>
 <g stroke="#eee2bd" stroke-width="3"><path d="M64 262v64m-36-33h72M192 262v64m-36-33h72M320 262v64m-36-33h72"/></g>
 <g class="terrace-rail" stroke="#69746a" stroke-width="5"><path d="M138 177h205M145 177v29m42-29v29m42-29v29m42-29v29m42-29v29"/></g>
 <g class="terrace-hut"><path d="M218 40h206v169H218Z" fill="#dfc39d" stroke="#947452" stroke-width="4"/><path d="M210 34h222v12H210Z" fill="#a98563" stroke="#755f4d" stroke-width="3"/><rect x="244" y="50" width="154" height="22" rx="4" fill="#36574f"/><text x="321" y="66" text-anchor="middle" fill="#ffefd1" font-size="15" font-family="sans-serif" font-weight="700">PUCELA · US</text><path d="M244 76h154v133H244Z" fill="#7d6247" stroke="#5b4634" stroke-width="3"/><path d="M250 80h142v127H250Z" fill="#20302f"/><path d="M250 80h142v40H250Z" fill="#2c403e"/></g>
 ${subject?`<g clip-path="url(#terraceDoorway)"><g transform="translate(262 85)">${staffMarkup('teacher')}</g></g>`:''}${doorLeavesMarkup('terrace',DOOR_SETS.school)}${subject?`<g transform="translate(391 112)"><g class="terrace-player">${actor}</g></g>
 
 <g class="terrace-impact" stroke="#ffefb0" stroke-width="5" opacity="0"><path d="m420 145-5-15m13 14 9-14m-4 23 18-3"/></g>`:'<text x="475" y="170" fill="#36574f" font-size="21" font-family="sans-serif" font-weight="700">NADIE SALE</text>'}
 </svg></div>`;
 return theme==='club'?markup.replaceAll('colegio','club').replace('PUCELA · US','MOSS CLUB').replace('#83b9ba','#192644').replace('#eddcbc','#704a78'):markup;
}

export function terraceCamera(width,height,elapsed){
 const pose=expulsionPose(elapsed),ratio=width/Math.max(1,height),viewHeight=360,viewWidth=360*ratio;
 const portrait=ratio<1.1,x=portrait?400+pose.x:360,y=portrait?180+pose.y*.4:180;
 return {x:x-viewWidth/2,y:y-viewHeight/2,width:viewWidth,height:viewHeight};
}
export function animateTerrace(root,elapsed){
 if(root.querySelector('.house-exit-scene')?.dataset?.scene==='house'){animateHouseDoor(root,elapsed);return;}
 if(root.querySelector('.club-door-left')){animateClubDoor(root,elapsed);return;}
 const player=root.querySelector('.terrace-player');if(!player){swingDoors(root,'terrace',DOOR_SETS.school,0);return;}
 const pose=expulsionPose(elapsed);animateStaff(root,'teacher',elapsed);swingDoors(root,'terrace',DOOR_SETS.school,doorOpenAmount(elapsed));
 const panorama=root.querySelector('.terrace-panorama'),rect=panorama?.getBoundingClientRect?.();
 if(rect?.width&&rect?.height){const view=terraceCamera(rect.width,rect.height,elapsed);panorama.setAttribute('viewBox',`${view.x} ${view.y} ${view.width} ${view.height}`);}
 player.setAttribute('transform',`translate(${pose.x} ${pose.y}) rotate(${pose.rotation} 36 90)`);
  root.querySelector('.terrace-impact').setAttribute('opacity',pose.impact?1:0);
}

function clubDoorMarkup(subject){
 const actor=subject?robotSVG({...subject,alive:true}).replace('<svg ','<svg x="0" y="0" width="80" height="105" '):'';
 return `<div class="expulsion-terrace club-exit" role="img" aria-label="Puerta de seguridad de la discoteca: expulsión cartoon animada"><svg class="terrace-panorama" viewBox="0 0 720 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
 <defs><clipPath id="clubDoorway" clipPathUnits="userSpaceOnUse"><path d="M178 0H374V284H178Z"/></clipPath><linearGradient id="clubExitSky" x2="0" y2="1"><stop stop-color="#131d36"/><stop offset="1" stop-color="#775378"/></linearGradient><linearGradient id="clubExitFloor" x2="0" y2="1"><stop stop-color="#384760"/><stop offset="1" stop-color="#172c44"/></linearGradient></defs>
 <rect x="-2000" y="-1000" width="5000" height="4000" fill="url(#clubExitSky)"/><circle cx="590" cy="70" r="23" fill="#ecdba4"/>
 <path d="M470 280V180h35v-30h35v130h35V205h50v75h35V160h60v240H450Z" fill="#192a4366"/>
 <path d="M-1000 287H1720V1400H-1000Z" fill="url(#clubExitFloor)"/><path d="M-1000 293H1720M0 400l310-110m410 110L410 290" stroke="#718b9b55" stroke-width="3"/>
 <path d="M-1200 -400H470V290H-1200Z" fill="#28364e" stroke="#121d33" stroke-width="7"/><path d="M45 20v259h410V20" fill="none" stroke="#6c547d" stroke-width="5"/>
 <rect x="168" y="55" width="216" height="229" rx="13" fill="#111d32" stroke="#b69ac7" stroke-width="6"/><rect x="178" y="66" width="196" height="218" rx="8" fill="#aa67b24a"/>
 <rect x="164" y="17" width="226" height="32" rx="5" fill="#172d42" stroke="#dc9ed8" stroke-width="2"/><text x="277" y="39" fill="#eeb3dc" font-size="17" font-weight="800" font-family="sans-serif" text-anchor="middle">MOSS CLUB</text>
  <path d="M85 75v180m357-180v180" stroke="#8ae2cf" stroke-width="5"/><path d="M100 75v180m327-180v180" stroke="#d58bd0" stroke-width="3"/>
 <ellipse cx="388" cy="292" rx="83" ry="17" fill="#e8a4cc16"/>
 ${subject?`<g clip-path="url(#clubDoorway)"><g transform="translate(200 157)">${staffMarkup('bouncer')}</g></g>`:''}${doorLeavesMarkup('club',DOOR_SETS.club)}${subject?`<g transform="translate(296 184)"><g class="club-exit-player">${actor}</g></g><g class="club-push-impact" opacity="0" stroke="#ffe1a0" stroke-width="4"><path d="m373 210 16-8m-12 22 18 5m-22-35 8-13"/></g>`:''}<g class="club-extras"><path class="club-beam" d="M60 0 190 285H20Z" fill="#ffd9f866" opacity=".5"/><path class="club-beam" d="M470 0 340 285H520Z" fill="#9ae8ff55" opacity=".5"/><path d="M196 288h160v10H196Z" fill="#b3263f" opacity=".85"/></g>
 ${subject?'<g class="club-dust" opacity="0" fill="#e5dcf0"><circle cx="0" cy="0" r="12"/><circle cx="18" cy="-6" r="9"/><circle cx="-16" cy="-4" r="8"/><circle cx="8" cy="8" r="7"/></g><g class="club-shout" opacity="0"><path d="M400 60h150a14 14 0 0 1 14 14v22a14 14 0 0 1-14 14h-106l-30 22 8-22h-22a14 14 0 0 1-14-14V74a14 14 0 0 1 14-14Z" fill="#fff" stroke="#101b32" stroke-width="3"/><text x="475" y="91" text-anchor="middle" font-size="15" font-weight="800" font-family="sans-serif" fill="#101b32">¡FUERA DE AQUÍ!</text></g>':''}
 </svg></div>`;
}
export function clubExitPose(milliseconds){const t=Math.max(0,milliseconds),open=doorOpenAmount(t),fly=ease((t-1400)/1500),slide=ease((t-2900)/800),hop=t>2900?Math.sin(clamp((t-2900)/520)*Math.PI)*15:0;return {open,x:240*fly+34*slide,y:-70*Math.sin(fly*Math.PI)+100*fly*fly-hop,rotation:fly*125+slide*35,push:t>900&&t<2100?ease((t-900)/500)*(1-ease((t-1450)/650)):0,impact:t>=1400&&t<1640,landed:t>=2880&&t<3600,shout:t>1500&&t<3500,slam:t>3900&&t<4500};}
function animateClubDoor(root,elapsed){animateStaff(root,'bouncer',elapsed);const p=clubExitPose(elapsed);swingDoors(root,'club',DOOR_SETS.club,p.open);const actor=root.querySelector('.club-exit-player');if(actor){actor.setAttribute('opacity',ease((elapsed-650)/500));actor.setAttribute('transform',`translate(${p.x} ${p.y}) rotate(${p.rotation} 40 100)`);}root.querySelector('.club-push-impact')?.setAttribute('opacity',p.impact?1:0);root.querySelector('.club-shout')?.setAttribute('opacity',p.shout?1:0);{const dust=root.querySelector('.club-dust');if(dust){const u=clamp((elapsed-2880)/720);dust.setAttribute('opacity',p.landed?(1-u).toFixed(2):(p.slam?'.7':'0'));dust.setAttribute('transform',p.slam?'translate(277 292) scale(1.3)':`translate(${(300+p.x).toFixed(0)} 292) scale(${(1+u).toFixed(2)})`);}const pulse=.35+.25*Math.sin(elapsed/260);root.querySelectorAll?.('.club-beam').forEach((b,i)=>b.setAttribute('opacity',(pulse+(i?.12:0)).toFixed(2)));}const panorama=root.querySelector('.terrace-panorama'),r=panorama.getBoundingClientRect?.();if(r?.width&&r?.height){const h=400,w=h*r.width/r.height,center=r.width/r.height<1?350+p.x*.5:360;panorama.setAttribute('viewBox',`${center-w/2} 0 ${w} ${h}`);}}

// Salida por los tornos del gimnasio: entrenador, suelo de caucho y material deportivo.
function gymExitMarkup(subject){return clubDoorMarkup(subject).replace('club-exit','club-exit gym-exit').replace('Puerta de seguridad de la discoteca: expulsión cartoon animada','El entrenador acompaña al expulsado hasta la salida del gimnasio').replace('MOSS CLUB','EL PALERO GYM').replace('¡FUERA DE AQUÍ!','¡A DESCANSAR!').replaceAll('#131d36','#9ebcb9').replaceAll('#775378','#c6d8cb').replaceAll('#dc9ed8','#8ed9bf').replaceAll('#eeb3dc','#bcf0d2').replaceAll('#d58bd0','#9bbfa7').replaceAll('#28364e','#46646b').replace('</svg></div>','<g fill="none" stroke="#dce4cf" stroke-width="6"><path d="M560 255h90m-80-13v26m12-32v38m45-32v26m-12-32v38"/></g><circle cx="100" cy="310" r="24" fill="#d2a477" stroke="#3b5260" stroke-width="3"/><path d="M77 310h46m-23-24v48" stroke="#765f4e" stroke-width="2"/></svg></div>');}

// 16.2 · Latasa´s House tiene su propia expulsión: fachada de la casa con porche, Latasa
// (delantal y moño) abre la puerta de madera, empuja al expulsado, que rueda escalones
// abajo hasta el césped; la puerta se cierra de golpe y se levanta polvo del felpudo.
function houseExitMarkup(subject){
 const actor=subject?robotSVG({...subject,alive:true}).replace('<svg ','<svg x="0" y="0" width="80" height="105" '):'';
 return `<div class="expulsion-terrace club-exit house-exit" role="img" aria-label="Puerta principal de Latasa´s House: Latasa echa de casa al expulsado, que rueda por los escalones del porche"><svg class="terrace-panorama house-exit-scene" data-scene="house" viewBox="0 0 720 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
 <defs><clipPath id="clubDoorway" clipPathUnits="userSpaceOnUse"><path d="M224 140H328V298H224Z"/></clipPath><linearGradient id="houseSky" x2="0" y2="1"><stop stop-color="#8fc3e6"/><stop offset="1" stop-color="#f3dcae"/></linearGradient><linearGradient id="houseLawn" x2="0" y2="1"><stop stop-color="#7fb25e"/><stop offset="1" stop-color="#5d8f45"/></linearGradient><pattern id="houseSiding" width="40" height="18" patternUnits="userSpaceOnUse"><rect width="40" height="18" fill="#f1e2c4"/><path d="M0 17.5h40" stroke="#d8c39c" stroke-width="2"/></pattern></defs>
 <rect x="-2000" y="-1000" width="5000" height="4000" fill="url(#houseSky)"/><circle cx="640" cy="62" r="26" fill="#fff0b8"/><g fill="#ffffffb0"><ellipse cx="520" cy="70" rx="60" ry="14"/><ellipse cx="110" cy="44" rx="48" ry="11"/></g>
 <path d="M-1000 330H1720V1400H-1000Z" fill="url(#houseLawn)"/><path d="M236 330h80l70 70H180Z" fill="#d9cdb2" stroke="#b9ab8c" stroke-width="2"/>
 <path d="M20 330V112h512v218Z" fill="url(#houseSiding)" stroke="#7a5d43" stroke-width="5"/>
 <path d="M0 118 276 8l276 110Z" fill="#b8574a" stroke="#6e3a30" stroke-width="6" stroke-linejoin="round"/><path d="M40 112 276 18l236 94" fill="none" stroke="#d37a68" stroke-width="3"/><rect x="420" y="30" width="34" height="58" fill="#9a5f50" stroke="#5c3a2e" stroke-width="4"/>
 <g><rect x="62" y="160" width="96" height="88" rx="4" fill="#bfe1ef" stroke="#7a5d43" stroke-width="5"/><path d="M110 160v88M62 204h96" stroke="#fff" stroke-width="4"/><rect x="44" y="156" width="18" height="96" fill="#5e8f72" stroke="#2f5040" stroke-width="3"/><rect x="158" y="156" width="18" height="96" fill="#5e8f72" stroke="#2f5040" stroke-width="3"/><path d="M58 252h104v10H58Z" fill="#8b6a4b"/><g fill="#e86f86"><circle cx="76" cy="250" r="7"/><circle cx="98" cy="252" r="6"/><circle cx="142" cy="250" r="7"/></g></g>
 <g><rect x="394" y="160" width="96" height="88" rx="4" fill="#bfe1ef" stroke="#7a5d43" stroke-width="5"/><path d="M442 160v88M394 204h96" stroke="#fff" stroke-width="4"/><rect x="376" y="156" width="18" height="96" fill="#5e8f72" stroke="#2f5040" stroke-width="3"/><rect x="490" y="156" width="18" height="96" fill="#5e8f72" stroke="#2f5040" stroke-width="3"/></g>
 <rect x="206" y="128" width="140" height="176" rx="6" fill="#d8c3a0" stroke="#7a5d43" stroke-width="5"/><rect x="222" y="138" width="108" height="162" fill="#2d1d14"/><path d="M222 138h108v28H222Z" fill="#40291b"/>
 <rect x="200" y="96" width="152" height="26" rx="5" fill="#5e8f72" stroke="#2f5040" stroke-width="3"/><text x="276" y="114" fill="#fff7dd" font-size="14" font-weight="800" font-family="sans-serif" text-anchor="middle">LATASA´S HOUSE</text>
 <circle cx="362" cy="150" r="8" fill="#ffe7a0" stroke="#7a5d43" stroke-width="3"/>
 ${subject?`<g clip-path="url(#clubDoorway)"><g transform="translate(236 168)">${staffMarkup('host')}</g></g>`:''}${doorLeavesMarkup('club',DOOR_SETS.house)}
 <path d="M196 298h160v12H196Z" fill="#a98563" stroke="#6b4a33" stroke-width="3"/><path d="M186 310h180v11H186Z" fill="#b8956f" stroke="#6b4a33" stroke-width="3"/><path d="M176 321h200v11H176Z" fill="#c7a47c" stroke="#6b4a33" stroke-width="3"/>
 <rect class="house-mat" x="242" y="300" width="68" height="9" rx="2" fill="#b56a3c" stroke="#5c3520" stroke-width="2"/>
 <g><path d="M560 330v-60m22 60v-60m22 60v-60m22 60v-60m22 60v-60m22 60v-60" stroke="#f6f0e2" stroke-width="9" stroke-linecap="round"/><path d="M552 290h130M552 316h130" stroke="#f6f0e2" stroke-width="6"/></g>
 <g><path d="M520 340v-48" stroke="#6b4a33" stroke-width="5"/><rect x="502" y="270" width="38" height="24" rx="10" fill="#4f7fd9" stroke="#24406f" stroke-width="3"/><path d="M536 274v-14l12 4-12 4" fill="#e8453c"/></g>
 <g fill="#4e8a4f"><circle cx="30" cy="324" r="20"/><circle cx="52" cy="330" r="16"/><circle cx="410" cy="326" r="18"/><circle cx="432" cy="332" r="14"/></g>
 ${subject?`<g transform="translate(236 194)"><g class="club-exit-player">${actor}</g></g><g class="club-push-impact" opacity="0" stroke="#fff3c0" stroke-width="4"><path d="m318 222 16-8m-12 22 18 5m-22-35 8-13"/></g><g class="house-dust" opacity="0" fill="#e9dcc2"><circle cx="0" cy="0" r="12"/><circle cx="18" cy="-6" r="9"/><circle cx="-16" cy="-4" r="8"/><circle cx="8" cy="8" r="7"/></g><g class="house-shout" opacity="0"><path d="M120 46h150a14 14 0 0 1 14 14v22a14 14 0 0 1-14 14h-96l-22 18 6-18h-38a14 14 0 0 1-14-14V60a14 14 0 0 1 14-14Z" fill="#fff" stroke="#3d2617" stroke-width="3"/><text x="195" y="77" text-anchor="middle" font-size="15" font-weight="800" font-family="sans-serif" fill="#3d2617">¡Y NO VUELVAS!</text></g>`:'<text x="470" y="370" fill="#2f5040" font-size="21" font-family="sans-serif" font-weight="800">NADIE SALE</text>'}
 </svg></div>`;
}
// Trayectoria propia: empujón, vuelo corto, rebote en cada escalón y voltereta hasta el césped.
export function houseExitPose(milliseconds){const t=Math.max(0,milliseconds),open=doorOpenAmount(t),push=t>900&&t<2100?ease((t-900)/500)*(1-ease((t-1450)/650)):0;
 const fly=clamp((t-1400)/1300),k=ease(fly),steps=[.38,.62,.82],bounce=steps.reduce((b,s)=>b+Math.max(0,22*(1-Math.abs(fly-s)/.12))*(fly>s-.12&&fly<s+.12?1:0),0);
 const roll=ease((t-2700)/700),x=200*k+60*roll,y=-46*Math.sin(Math.min(1,fly*2.4)*Math.PI)*(fly<.42?1:0)+110*k-bounce,rotation=k*200+roll*160;
 return {open,push,x,y,rotation,impact:t>=1400&&t<1640,landed:t>=2650&&t<3300,shout:t>1500&&t<3600,slam:t>3900&&t<4500};}
function animateHouseDoor(root,elapsed){animateStaff(root,'host',elapsed);const p=houseExitPose(elapsed);swingDoors(root,'club',DOOR_SETS.house,p.open);
 const actor=root.querySelector('.club-exit-player');if(actor){actor.setAttribute('opacity',ease((elapsed-650)/500));actor.setAttribute('transform',`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.rotation.toFixed(1)} 40 60)`);}
 root.querySelector('.club-push-impact')?.setAttribute('opacity',p.impact?1:0);
 const dust=root.querySelector('.house-dust');if(dust){const u=clamp((elapsed-2650)/700);dust.setAttribute('opacity',p.landed?(1-u).toFixed(2):(p.slam?'0.8':'0'));dust.setAttribute('transform',p.slam?'translate(276 300) scale(1.4)':`translate(${(280+p.x).toFixed(0)} 330) scale(${(1+u).toFixed(2)})`);}
 root.querySelector('.house-shout')?.setAttribute('opacity',p.shout?1:0);
 root.querySelector('.house-mat')?.setAttribute('transform',p.slam?'translate(0 -3)':'');
 const panorama=root.querySelector('.terrace-panorama'),r=panorama?.getBoundingClientRect?.();if(r?.width&&r?.height){const h=400,w=h*r.width/r.height,center=r.width/r.height<1?330+p.x*.5:360;panorama.setAttribute('viewBox',`${center-w/2} 0 ${w} ${h}`);}}
