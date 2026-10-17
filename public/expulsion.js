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

function staffMarkup(kind){const teacher=kind==='teacher',coat=teacher?'#b4a080':'#344960';return `<g class="staff staff-${kind}"><ellipse cx="40" cy="122" rx="38" ry="8" fill="#10213844"/><g class="staff-leg-left"><path d="M18 81h19v35H15Z" fill="#33465a" stroke="#1c3044" stroke-width="3"/><path d="M14 110h24v12H8q-2-11 6-12" fill="#e4dbc6" stroke="#24394a" stroke-width="3"/></g><g class="staff-leg-right"><path d="M45 81h19l5 35H45Z" fill="#33465a" stroke="#1c3044" stroke-width="3"/><path d="M44 110h24q14 0 15 12H43Z" fill="#e4dbc6" stroke="#24394a" stroke-width="3"/></g><g class="staff-arm-left"><path d="M12 45q-13 5-10 35l9 8 10-35Z" fill="${coat}" stroke="#25394b" stroke-width="3"/><circle cx="8" cy="83" r="8" fill="#d9b291" stroke="#25394b" stroke-width="3"/></g><path d="M18 39h42q12 8 13 48H8q0-32 10-48Z" fill="${coat}" stroke="#20364a" stroke-width="4"/><path d="M37 41v45" stroke="#dfd2b5" stroke-width="3"/><rect x="47" y="53" width="17" height="14" rx="2" fill="#ddd3ac"/><path d="m51 58 4 4 6-6" fill="none" stroke="#5a7b76" stroke-width="3"/><g class="staff-arm-right"><path d="M61 46q16-1 18 27l-14 5-10-25Z" fill="${coat}" stroke="#25394b" stroke-width="3"/><circle cx="73" cy="79" r="9" fill="#d9b291" stroke="#25394b" stroke-width="3"/></g><rect x="18" y="2" width="46" height="43" rx="19" fill="#e4bb97" stroke="#25394b" stroke-width="4"/><path d="M18 18V9q23-19 47 0v10l-12-8-21 5Z" fill="${teacher?'#6d5b4b':'#202e42'}"/><path d="M20 26q22-8 43 0v12q-22 17-43-1Z" fill="${teacher?'#dfebe1':'#1c3448'}" stroke="#73938e" stroke-width="2"/><path d="M30 22h3m16 0h3" stroke="#25394b" stroke-width="4"/>${teacher?'<g fill="none" stroke="#4b6570" stroke-width="2"><rect x="22" y="16" width="16" height="13" rx="4"/><rect x="44" y="16" width="16" height="13" rx="4"/><path d="M38 22h6"/></g>':'<path d="M19 12h45V2q-24-10-45 0Z" fill="#233e53" stroke="#759297" stroke-width="2"/>'}</g>`;}
// El personal empuja o patea con sus propias extremidades: la pierna o el brazo
// del propio personaje giran sobre la cadera o el hombro hasta tocar al jugador.
function animateStaff(root,kind,t){const staff=root.querySelector('.staff-'+kind);if(!staff)return;const walking=t<1100,walk=walking?Math.sin(t/80)*12:0;
 const kick=kind==='teacher'?ease((t-(KICK_TIME-320))/320)*(1-ease((t-(KICK_TIME+260))/420)):0,push=kind==='bouncer'?clubExitPose(t).push:0;
 const approach=kind==='teacher'?28:12*push;staff.setAttribute('transform',`translate(${-170*(1-ease((t-300)/800))+approach} ${walking?Math.sin(t/65)*1.5:0})`);
 staff.querySelector?.('.staff-leg-left')?.setAttribute('transform',`rotate(${walk} 28 84)`);
 staff.querySelector?.('.staff-leg-right')?.setAttribute('transform',`rotate(${kick?-88*kick:-walk} 56 84)`);
 staff.querySelector?.('.staff-arm-left')?.setAttribute('transform',`rotate(${kick?20*kick:-walk*.7} 17 46)`);
 staff.querySelector?.('.staff-arm-right')?.setAttribute('transform',`rotate(${push?-82*push:kind==='teacher'&&t>1000&&t<1900?-30*ease((t-1000)/400):walk*.7} 60 46)`);}
export function terraceMarkup(subject,theme='school'){
 if(theme==='park')return parkExitMarkup(subject);if(theme==='gym')return gymExitMarkup(subject);if(theme==='club')return clubDoorMarkup(subject);
 const actor=subject?robotSVG({...subject,alive:true}).replace('<svg ','<svg x="0" y="0" width="72" height="95" '):'';
 const markup=`<div class="expulsion-terrace" role="img" aria-label="${subject?'Un profesor de cuerpo entero acompaña al jugador a la terraza y le da una patada cartoon; el jugador cae.':'Terraza del colegio: nadie ha sido expulsado.'}">
 <svg class="terrace-panorama" viewBox="0 0 720 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
 <defs><linearGradient id="terraceSky" x2="0" y2="1"><stop stop-color="#83b9ba"/><stop offset="1" stop-color="#eddcbc"/></linearGradient><pattern id="terraceBrick" width="60" height="32" patternUnits="userSpaceOnUse"><rect width="60" height="32" fill="#b98b67"/><path d="M0 0h60M0 32h60M30 0v32" stroke="#dfb58c" stroke-width="2"/></pattern></defs>
 <rect x="-2000" y="-1000" width="5000" height="4000" fill="url(#terraceSky)"/>
 <g fill="#fff7e3" opacity=".6"><ellipse cx="545" cy="63" rx="85" ry="18"/><ellipse cx="115" cy="48" rx="65" ry="15"/></g><circle cx="638" cy="48" r="24" fill="#ffe6a2"/>
 <path d="M470 332h55V210h75v122h45V249h75v111H470Z" fill="#759b9460"/>
 <path d="M-2000 209h2438v2791H-2000Z" fill="url(#terraceBrick)"/><path d="M0 207h443v15H0Z" fill="#e9c99a" stroke="#755f4d" stroke-width="4"/>
 <path d="M0 80h132v127H0Z" fill="#dfc39d" stroke="#947452" stroke-width="3"/><path d="M35 105h63v102H35Z" fill="#506e69"/><path d="M42 112h49v55H42Z" fill="#9dc5bc"/>
 <rect x="152" y="106" width="155" height="36" rx="5" fill="#36574f"/><text x="229" y="129" text-anchor="middle" fill="#ffefd1" font-size="17" font-family="sans-serif" font-weight="700">PUCELA · US</text>
 <g fill="#a9cbc4" stroke="#5c7770" stroke-width="4"><rect x="28" y="261" width="72" height="66" rx="3"/><rect x="156" y="261" width="72" height="66" rx="3"/><rect x="284" y="261" width="72" height="66" rx="3"/></g>
 <g stroke="#eee2bd" stroke-width="3"><path d="M64 262v64m-36-33h72M192 262v64m-36-33h72M320 262v64m-36-33h72"/></g>
 <g class="terrace-rail" stroke="#69746a" stroke-width="5"><path d="M138 177h205M145 177v29m42-29v29m42-29v29m42-29v29m42-29v29"/></g>
 ${subject?`<g transform="translate(270 85)">${staffMarkup('teacher')}</g><g transform="translate(391 112)"><g class="terrace-player">${actor}</g></g>
 
 <g class="terrace-impact" stroke="#ffefb0" stroke-width="5" opacity="0"><path d="m420 145-5-15m13 14 9-14m-4 23 18-3"/></g>`:'<text x="475" y="170" fill="#36574f" font-size="21" font-family="sans-serif" font-weight="700">NADIE SALE</text>'}
 </svg></div>`;
 return theme==='club'?markup.replaceAll('colegio','club').replace('PUCELA · US','SANAGUS CLUB').replace('#83b9ba','#192644').replace('#eddcbc','#704a78'):markup;
}

export function terraceCamera(width,height,elapsed){
 const pose=expulsionPose(elapsed),ratio=width/Math.max(1,height),viewHeight=360,viewWidth=360*ratio;
 const portrait=ratio<1.1,x=portrait?400+pose.x:360,y=portrait?180+pose.y*.4:180;
 return {x:x-viewWidth/2,y:y-viewHeight/2,width:viewWidth,height:viewHeight};
}
export function animateTerrace(root,elapsed){
 if(root.querySelector('.club-door-left')){animateClubDoor(root,elapsed);return;}
 const player=root.querySelector('.terrace-player');if(!player)return;
 const pose=expulsionPose(elapsed);animateStaff(root,'teacher',elapsed);
 const panorama=root.querySelector('.terrace-panorama'),rect=panorama?.getBoundingClientRect?.();
 if(rect?.width&&rect?.height){const view=terraceCamera(rect.width,rect.height,elapsed);panorama.setAttribute('viewBox',`${view.x} ${view.y} ${view.width} ${view.height}`);}
 player.setAttribute('transform',`translate(${pose.x} ${pose.y}) rotate(${pose.rotation} 36 90)`);
  root.querySelector('.terrace-impact').setAttribute('opacity',pose.impact?1:0);
}

function clubDoorMarkup(subject){
 const actor=subject?robotSVG({...subject,alive:true}).replace('<svg ','<svg x="0" y="0" width="80" height="105" '):'';
 return `<div class="expulsion-terrace club-exit" role="img" aria-label="Puerta de seguridad de la discoteca: expulsión cartoon animada"><svg class="terrace-panorama" viewBox="0 0 720 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
 <defs><linearGradient id="clubExitSky" x2="0" y2="1"><stop stop-color="#131d36"/><stop offset="1" stop-color="#775378"/></linearGradient><linearGradient id="clubExitFloor" x2="0" y2="1"><stop stop-color="#384760"/><stop offset="1" stop-color="#172c44"/></linearGradient></defs>
 <rect x="-2000" y="-1000" width="5000" height="4000" fill="url(#clubExitSky)"/><circle cx="590" cy="70" r="23" fill="#ecdba4"/>
 <path d="M470 280V180h35v-30h35v130h35V205h50v75h35V160h60v240H450Z" fill="#192a4366"/>
 <path d="M-1000 287H1720V1400H-1000Z" fill="url(#clubExitFloor)"/><path d="M-1000 293H1720M0 400l310-110m410 110L410 290" stroke="#718b9b55" stroke-width="3"/>
 <path d="M30 0h440v290H30Z" fill="#28364e" stroke="#121d33" stroke-width="7"/><path d="M45 20v259h410V20" fill="none" stroke="#6c547d" stroke-width="5"/>
 <rect x="168" y="55" width="216" height="229" rx="13" fill="#111d32" stroke="#b69ac7" stroke-width="6"/><rect x="178" y="66" width="196" height="218" rx="8" fill="#aa67b24a"/>
 <rect x="164" y="17" width="226" height="32" rx="5" fill="#172d42" stroke="#dc9ed8" stroke-width="2"/><text x="277" y="39" fill="#eeb3dc" font-size="17" font-weight="800" font-family="sans-serif" text-anchor="middle">SANAGUS CLUB</text>
 <g class="club-door-left"><path d="M178 67h96v217h-96Z" fill="#496078" stroke="#172b41" stroke-width="3"/><path d="M189 85h70v59h-70Z" fill="#142e45" stroke="#86a6b2" stroke-width="2"/><path d="M258 177v35" stroke="#d9cda9" stroke-width="7"/></g>
 <g class="club-door-right"><path d="M276 67h98v217h-98Z" fill="#496078" stroke="#172b41" stroke-width="3"/><path d="M291 85h70v59h-70Z" fill="#142e45" stroke="#86a6b2" stroke-width="2"/><path d="M291 177v35" stroke="#d9cda9" stroke-width="7"/></g>
 <path d="M85 75v180m357-180v180" stroke="#8ae2cf" stroke-width="5"/><path d="M100 75v180m327-180v180" stroke="#d58bd0" stroke-width="3"/>
 <ellipse cx="388" cy="292" rx="83" ry="17" fill="#e8a4cc16"/>
 ${subject?`<g transform="translate(240 157)">${staffMarkup('bouncer')}</g><g transform="translate(330 184)"><g class="club-exit-player">${actor}</g></g><g class="club-push-impact" opacity="0" stroke="#ffe1a0" stroke-width="4"><path d="m407 210 16-8m-12 22 18 5m-22-35 8-13"/></g>`:''}
 <path d="M0 0H720V400H0Z" fill="none" stroke="#101b32" stroke-width="18"/></svg></div>`;
}
export function clubExitPose(milliseconds){const t=Math.max(0,milliseconds),open=ease((t-450)/650)*(1-ease((t-3300)/750)),fly=ease((t-1400)/1500);return {open,x:240*fly,y:-70*Math.sin(fly*Math.PI)+100*fly*fly,rotation:fly*125,push:t>900&&t<2100?ease((t-900)/500)*(1-ease((t-1450)/650)):0,impact:t>=1400&&t<1640};}
function animateClubDoor(root,elapsed){animateStaff(root,'bouncer',elapsed);const p=clubExitPose(elapsed);root.querySelector('.club-door-left').setAttribute('transform',`translate(${-p.open*85} 0)`);root.querySelector('.club-door-right').setAttribute('transform',`translate(${p.open*85} 0)`);const actor=root.querySelector('.club-exit-player');if(actor){actor.setAttribute('opacity',ease((elapsed-650)/500));actor.setAttribute('transform',`translate(${p.x} ${p.y}) rotate(${p.rotation} 40 100)`);}root.querySelector('.club-push-impact')?.setAttribute('opacity',p.impact?1:0);const panorama=root.querySelector('.terrace-panorama'),r=panorama.getBoundingClientRect?.();if(r?.width&&r?.height){const h=400,w=h*r.width/r.height,center=r.width/r.height<1?350+p.x*.5:360;panorama.setAttribute('viewBox',`${center-w/2} 0 ${w} ${h}`);}}

// Salida por los tornos del gimnasio: entrenador, suelo de caucho y material deportivo.
function gymExitMarkup(subject){return clubDoorMarkup(subject).replace('club-exit','club-exit gym-exit').replace('Puerta de seguridad de la discoteca: expulsión cartoon animada','El entrenador acompaña al expulsado hasta la salida del gimnasio').replace('SANAGUS CLUB','SANAGUS GYM').replaceAll('#131d36','#9ebcb9').replaceAll('#775378','#c6d8cb').replaceAll('#dc9ed8','#8ed9bf').replaceAll('#eeb3dc','#bcf0d2').replaceAll('#d58bd0','#9bbfa7').replaceAll('#28364e','#46646b').replace('</svg></div>','<g fill="none" stroke="#dce4cf" stroke-width="6"><path d="M560 255h90m-80-13v26m12-32v38m45-32v26m-12-32v38"/></g><circle cx="100" cy="310" r="24" fill="#d2a477" stroke="#3b5260" stroke-width="3"/><path d="M77 310h46m-23-24v48" stroke="#765f4e" stroke-width="2"/></svg></div>');}

function parkExitMarkup(subject){return clubDoorMarkup(subject).replace('club-exit','club-exit park-exit').replace('SANAGUS CLUB','CAMPO GRANDE').replace('Puerta de seguridad de la discoteca: expulsión cartoon animada','Salida del parque: el guarda acompaña al expulsado hasta la verja').replaceAll('#131d36','#6f9259').replaceAll('#775378','#9ba77e').replaceAll('#dc9ed8','#90b776').replaceAll('#eeb3dc','#d5d3a4').replaceAll('#d58bd0','#739464').replace('</svg></div>','<g stroke="#375b4b" stroke-width="7"><path d="M20 310h150m-140-45v75m25-75v75m25-75v75m25-75v75m25-75v75m25-75v75"/></g><g fill="#5a8956"><ellipse cx="80" cy="205" rx="58" ry="75"/><ellipse cx="940" cy="175" rx="65" ry="90"/></g></svg></div>');}
