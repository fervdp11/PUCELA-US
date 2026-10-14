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

export function terraceMarkup(subject){
 const actor=subject?robotSVG({...subject,alive:true}).replace('<svg ','<svg x="0" y="0" width="72" height="95" '):'';
 return `<div class="expulsion-terrace" role="img" aria-label="${subject?'Un pie da una patada al jugador expulsado desde la terraza del colegio; el jugador cae.':'Terraza del colegio: nadie ha sido expulsado.'}">
 <svg class="terrace-panorama" viewBox="0 0 720 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
 <defs><linearGradient id="terraceSky" x2="0" y2="1"><stop stop-color="#83b9ba"/><stop offset="1" stop-color="#eddcbc"/></linearGradient><pattern id="terraceBrick" width="60" height="32" patternUnits="userSpaceOnUse"><rect width="60" height="32" fill="#b98b67"/><path d="M0 0h60M0 32h60M30 0v32" stroke="#dfb58c" stroke-width="2"/></pattern></defs>
 <rect x="-2000" y="-1000" width="5000" height="4000" fill="url(#terraceSky)"/>
 <g fill="#fff7e3" opacity=".6"><ellipse cx="545" cy="63" rx="85" ry="18"/><ellipse cx="115" cy="48" rx="65" ry="15"/></g><circle cx="638" cy="48" r="24" fill="#ffe6a2"/>
 <path d="M470 332h55V210h75v122h45V249h75v111H470Z" fill="#759b9460"/>
 <path d="M-2000 209h2438v2791H-2000Z" fill="url(#terraceBrick)"/><path d="M0 207h443v15H0Z" fill="#e9c99a" stroke="#755f4d" stroke-width="4"/>
 <path d="M0 80h132v127H0Z" fill="#dfc39d" stroke="#947452" stroke-width="3"/><path d="M35 105h63v102H35Z" fill="#506e69"/><path d="M42 112h49v55H42Z" fill="#9dc5bc"/>
 <rect x="152" y="106" width="155" height="36" rx="5" fill="#36574f"/><text x="229" y="129" text-anchor="middle" fill="#ffefd1" font-size="17" font-family="sans-serif" font-weight="700">SANAGUS · AS</text>
 <g fill="#a9cbc4" stroke="#5c7770" stroke-width="4"><rect x="28" y="261" width="72" height="66" rx="3"/><rect x="156" y="261" width="72" height="66" rx="3"/><rect x="284" y="261" width="72" height="66" rx="3"/></g>
 <g stroke="#eee2bd" stroke-width="3"><path d="M64 262v64m-36-33h72M192 262v64m-36-33h72M320 262v64m-36-33h72"/></g>
 <g class="terrace-rail" stroke="#69746a" stroke-width="5"><path d="M138 177h205M145 177v29m42-29v29m42-29v29m42-29v29m42-29v29"/></g>
 ${subject?`<g transform="translate(391 112)"><g class="terrace-player">${actor}</g></g>
 <g transform="translate(315 160)"><g class="terrace-foot" opacity="0"><path d="M0 4h39v23l39 2q30 3 29 18H2Z" fill="#f1ead5" stroke="#2b4149" stroke-width="4"/><path d="M1 10h34v19l44 1q24 1 27 16H1Z" fill="#354a57"/><path d="M3 47h103v9H3Z" fill="#e8dfc6" stroke="#2b4149" stroke-width="3"/><path d="m42 32 7-4m3 6 7-4m3 6 7-4" stroke="#f5ebd8" stroke-width="3"/></g></g>
 <g class="terrace-impact" stroke="#ffefb0" stroke-width="5" opacity="0"><path d="m420 145-5-15m13 14 9-14m-4 23 18-3"/></g>`:'<text x="475" y="170" fill="#36574f" font-size="21" font-family="sans-serif" font-weight="700">NADIE SALE</text>'}
 </svg></div>`;
}

export function terraceCamera(width,height,elapsed){
 const pose=expulsionPose(elapsed),ratio=width/Math.max(1,height),viewHeight=360,viewWidth=360*ratio;
 const portrait=ratio<1.1,x=portrait?400+pose.x:360,y=portrait?180+pose.y*.4:180;
 return {x:x-viewWidth/2,y:y-viewHeight/2,width:viewWidth,height:viewHeight};
}
export function animateTerrace(root,elapsed){
 const player=root.querySelector('.terrace-player');if(!player)return;
 const pose=expulsionPose(elapsed);
 const panorama=root.querySelector('.terrace-panorama'),rect=panorama?.getBoundingClientRect?.();
 if(rect?.width&&rect?.height){const view=terraceCamera(rect.width,rect.height,elapsed);panorama.setAttribute('viewBox',`${view.x} ${view.y} ${view.width} ${view.height}`);}
 player.setAttribute('transform',`translate(${pose.x} ${pose.y}) rotate(${pose.rotation} 36 90)`);
 const foot=root.querySelector('.terrace-foot');foot.setAttribute('transform',`translate(${pose.footX} 0)`);foot.setAttribute('opacity',pose.footOpacity);
 root.querySelector('.terrace-impact').setAttribute('opacity',pose.impact?1:0);
}
