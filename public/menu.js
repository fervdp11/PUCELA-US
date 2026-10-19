// Menú principal: escena animada de la caravana, hojas (jugar, personalizar,
// pase, ajustes) y pantalla del pase de temporada. La escena es original: la
// caravana de Sanagus acampada junto a Campo Grande, con el personaje del
// jugador en la puerta y la tripulación haciendo vida alrededor.
import {drawRobot,drawAvatar} from './characters.js';
import {drawCaravanSide} from './caravan-side.js';
import {REWARDS,levelOf,hasClaimed,readToken,LEVEL_XP,MAX_LEVEL,PETS,EFFECTS,EMOTES,nameRewardsAt,nameHtml} from './pass.js';
const TAU=Math.PI*2;
const lerp=(a,b,t)=>a+(b-a)*t;
function mix(a,b,t){const p=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16));const x=p(a),y=p(b);return '#'+x.map((v,i)=>Math.round(lerp(v,y[i],t)).toString(16).padStart(2,'0')).join('');}
function oval(c,x,y,rx,ry,fill,stroke,w=2){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.stroke();}}
function box(c,x,y,w,h,r,fill,stroke,lw=3){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}}
// Tripulación de la escena: aspectos originales, con algunas recompensas del
// pase a la vista (mascota, efecto, animación) para enseñar qué se puede ganar.
const CREW=[
 {name:'',color:1,outfitColor:1,trimColor:8,skin:3,hat:4,hairColor:1,skinTone:2,pants:2,shoes:2,shoeColor:9,pet:3,emote:4},
 {name:'',color:3,outfitColor:3,trimColor:2,skin:1,hat:16,hairColor:0,skinTone:0,pants:0,shoes:0,shoeColor:8,effect:4},
 {name:'',color:2,outfitColor:2,trimColor:10,skin:4,hat:2,hairColor:3,skinTone:1,pants:1,shoes:1,shoeColor:10,emote:1}
];
function drawTree(c,x,y,r,time,col){const sway=Math.sin(time/1800+x*.01)*r*.04;box(c,x-r*.09,y-r*.9,r*.18,r*.9,4,'#6b4a33');for(const [dx,dy,rr] of [[-.45,-1.25,.62],[.45,-1.2,.6],[0,-1.6,.72],[0,-1.1,.7]])oval(c,x+dx*r+sway,y+dy*r,rr*r,rr*r*.92,col);oval(c,x-r*.2+sway,y-r*1.75,r*.32,r*.24,'#ffffff22');}
function scene(c,w,h,time,{look,reduced,portrait}){
 const cycle=reduced?0:(Math.sin(time/40000)+1)/2,dusk=cycle*.85;
 const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,mix('#4fa9de','#4c6fb3',dusk));sky.addColorStop(.45,mix('#8fcdee','#c99ac0',dusk));sky.addColorStop(.75,mix('#d6f0f7','#ffcf93',dusk));c.fillStyle=sky;c.fillRect(0,0,w,h);
 const ground=portrait?h*.47:h*.8,unit=portrait?Math.min(w/640,h*.00105):Math.min(w*.0012,h*.0016),cx=portrait?w*.5:w*.68;
 // Sol y nubes.
 oval(c,w*.82,h*(.16+dusk*.12),Math.max(30,h*.06),Math.max(30,h*.06),mix('#fff6c9','#ffb46b',dusk));
 for(let i=0;i<6;i++){const sp=8+i*3,x=((i*397+time*sp/1000)%(w+360))-180,y=h*(.08+i*.05);c.fillStyle='#ffffffcc';for(const [dx,dy,r] of [[0,0,34],[30,-10,28],[58,4,24],[-28,6,22]])oval(c,x+dx*(1+i*.1),y+dy,r*(1+i*.1),r*.7*(1+i*.1),'#ffffffb8');}
 // Silueta lejana: torres, cúpula y tejados de una ciudad castellana inventada.
 c.fillStyle=mix('#9cc3cf','#c08a8f',dusk);c.beginPath();c.moveTo(0,ground-h*.18);
 const skyline=[[0,.18],[.06,.22],[.1,.2],[.14,.27],[.15,.36],[.16,.27],[.22,.24],[.27,.2],[.33,.26],[.36,.31],[.39,.26],[.45,.22],[.52,.25],[.58,.21],[.66,.23],[.7,.3],[.71,.4],[.72,.3],[.78,.24],[.86,.21],[.93,.25],[1,.2]];
 for(const [fx,fy] of skyline)c.lineTo(fx*w,ground-h*fy*(portrait?.7:1));c.lineTo(w,ground);c.lineTo(0,ground);c.closePath();c.fill();
 // Arbolado del parque detrás de la caravana.
 const treeCol=mix('#4f8c45','#5a6b3a',dusk);
 for(let i=0;i<9;i++){const x=(i+.5)*w/9+Math.sin(i*7)*30,r=(portrait?40:60)*unit*1.6+(i%3)*8;drawTree(c,x,ground-h*.02,r,time,i%2?treeCol:mix('#3f7a3a','#4b5a33',dusk));}
 // Suelo: césped y sendero de tierra.
 c.fillStyle=mix('#6aa04d','#6b7f3e',dusk);c.fillRect(0,ground-h*.02,w,h);c.fillStyle=mix('#d4ad74','#c99766',dusk);c.beginPath();c.ellipse(cx,ground+h*.05,w*.7,h*.06,0,0,TAU);c.fill();
 // Farolas que se encienden al atardecer.
 for(const fx of [.12,.92]){const x=w*fx,y=ground;c.strokeStyle='#2c3a40';c.lineWidth=5;c.beginPath();c.moveTo(x,y);c.lineTo(x,y-h*.24);c.stroke();oval(c,x,y-h*.25,9,9,dusk>.45?'#ffe9a6':'#d8dccb','#2c3a40',3);if(dusk>.45){const g=c.createRadialGradient(x,y-h*.25,4,x,y-h*.25,80);g.addColorStop(0,`rgba(255,226,150,${(dusk-.45)*.9})`);g.addColorStop(1,'rgba(255,226,150,0)');c.fillStyle=g;c.fillRect(x-80,y-h*.25-80,160,160);}}
 const s=unit*(portrait?1.05:1.15);
 drawCaravanSide(c,cx+40*s,ground+10*s,s,time,dusk);
 // Hoguera con chispas.
 const fx=cx-(portrait?330:430)*s,fy=ground+30*s;oval(c,fx,fy,40*s,10*s,'#6b4a33');for(let i=0;i<3;i++){const f=Math.sin(time/120+i)*4*s;c.fillStyle=['#f2783c','#f6b54a','#ffe08a'][i];c.beginPath();c.moveTo(fx-22*s+i*6*s,fy);c.quadraticCurveTo(fx-10*s+i*4*s,fy-40*s-f,fx,fy-(58-i*12)*s-f);c.quadraticCurveTo(fx+12*s-i*4*s,fy-36*s+f,fx+22*s-i*6*s,fy);c.fill();}
 if(!reduced)for(let i=0;i<5;i++){const k=((time/1400)+i/5)%1;oval(c,fx+Math.sin(i*3+time/500)*16*s,fy-60*s-k*90*s,2.2*s,2.2*s,`rgba(255,214,120,${1-k})`);}
 // Tripulación: una en la silla del toldo, otra paseando, otra junto al fuego.
 const walk=reduced?0:Math.sin(time/5200),walker={...CREW[1],facing:Math.cos(time/5200)>0?1:-1};
 const chair=cx-255*s;box(c,chair-35*s,ground-28*s,70*s,12*s,4,'#c46a4a');c.strokeStyle='#4f5d63';c.lineWidth=4*s;c.beginPath();c.moveTo(chair-30*s,ground);c.lineTo(chair+30*s,ground-28*s);c.moveTo(chair+30*s,ground);c.lineTo(chair-30*s,ground-28*s);c.stroke();
 drawRobot(c,{...CREW[0],facing:1},chair,ground-14*s,1.05*s,time,false);
 drawRobot(c,walker,cx+(portrait?250:330)*s+walk*(portrait?50:110)*s,ground+(portrait?60:46)*s,1.1*s,time,!reduced);
 drawRobot(c,{...CREW[2],facing:-1},fx+70*s,ground+44*s,1.05*s,time+2100,false);
 // El personaje del jugador, en primer plano junto a la puerta.
 drawRobot(c,{...look,facing:-1,alive:true},cx+105*s,ground+70*s,1.75*s,time,false,true);
 // Luciérnagas al anochecer.
 if(dusk>.5&&!reduced)for(let i=0;i<14;i++){const x=(i*173+Math.sin(time/900+i)*40)%w,y=ground-h*.05-((i*97)%(h*.25))+Math.cos(time/700+i)*12;oval(c,x,y,2.5,2.5,`rgba(255,240,150,${(dusk-.5)*1.6*(.5+.5*Math.sin(time/300+i))})`);}
}
const KIND_ICON={hat:'🎩',skin:'👕',glasses:'🥽',accessory:'🎗️',pet:'🐾',effect:'✨',emote:'💃'};
const KIND_TEXT={hat:'Sombrero o peinado para tu personaje.',skin:'Ropa nueva para el armario.',glasses:'Gafas especiales.',accessory:'Complemento o máscara.',pet:'Una mascota que te sigue a todas partes. Solo se consigue con el pase.',effect:'Partículas que acompañan a tu personaje.',emote:'Animación que hace tu personaje al quedarse quieto.'};
export function mountMenu({root,canvas,getAppearance,getToken,setToken,equip,toast=()=>{},tone=()=>{},reducedMotion=()=>false}){
 const sheets=[...root.querySelectorAll('[data-sheet]')];let openName=null,selected=null,lastPass='';
 const passRoot=root.querySelector('#passScreen');
 function open(name){openName=name;root.classList.add('sheet-open');document.documentElement.classList.add('menu-sheet-open');root.dataset.sheet=name;for(const s of sheets){const on=s.dataset.sheet===name;s.hidden=!on;s.classList.toggle('is-open',on);}if(name==='pass')renderPass();tone(520,.05,'triangle',.02);const first=root.querySelector(`[data-sheet="${name}"] [data-menu-back]`);first?.focus({preventScroll:true});}
 function close(){if(!openName)return;const was=openName;openName=null;root.classList.remove('sheet-open');document.documentElement.classList.remove('menu-sheet-open');delete root.dataset.sheet;for(const s of sheets){s.classList.remove('is-open');s.hidden=true;}root.querySelector(`[data-menu-open="${was}"]`)?.focus({preventScroll:true});}
 root.addEventListener('click',e=>{const o=e.target.closest('[data-menu-open]');if(o){open(o.dataset.menuOpen);return;}if(e.target.closest('[data-menu-back]'))close();const card=e.target.closest('[data-pass-level]');if(card){selected=Number(card.dataset.passLevel);renderPass();}const act=e.target.closest('#passAction');if(act)passAction();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&openName&&!root.hidden&&!document.querySelector('.join-code-screen:not([hidden])'))close();});
 // ---------------------------------------------------------------- pase
 const progress=()=>readToken(getToken());
 const poseTime=look=>700-((look.color||0)*977)%7000+7000;
 function wearing(reward){return {...getAppearance(),[reward.field]:reward.value};}
 function stateOf(r,p){const lv=levelOf(p.xp).level;return hasClaimed(p.claimed,r.level)?'claimed':lv>=r.level?'claimable':'locked';}
 const chip=(q,t='Ejemplo')=>nameHtml(t,q.field==='nameBg'?q.value:0,q.field==='nameColor'?q.value:0);
 function summary(){const p=progress(),l=levelOf(p.xp),ready=REWARDS.filter(r=>stateOf(r,p)==='claimable').length;return {p,l,ready};}
 function renderHome(){const {l,ready}=summary();const label=root.querySelector('#menuPassLevel'),fill=root.querySelector('#menuPassFill'),badge=root.querySelector('#menuPassBadge');if(label)label.textContent=l.max?'Nivel máximo':`Nivel ${l.level} · ${l.into} / ${LEVEL_XP} XP`;if(fill)fill.style.width=`${(l.into/LEVEL_XP)*100}%`;if(badge){badge.hidden=!ready;badge.textContent=ready;}}
 function renderPass(){
  if(!passRoot)return;const {p,l,ready}=summary();
  if(selected===null){const first=REWARDS.find(r=>stateOf(r,p)==='claimable')||REWARDS.find(r=>stateOf(r,p)==='locked')||REWARDS[0];selected=first.level;}
  const r=REWARDS[selected-1],st=stateOf(r,p);
  const key=JSON.stringify([p,selected,getAppearance()]);
  if(key!==lastPass){lastPass=key;
   passRoot.innerHTML=`<header class="pass-head"><div class="pass-level" aria-label="Nivel actual"><span>NIVEL</span><b>${l.level}</b></div><div class="pass-progress"><div class="pass-title"><b>Temporada 1 · Rumbo a Valladolid</b><span>${ready?`${ready} recompensa${ready>1?'s':''} por recoger`:'Gratis · solo cosméticos'}</span></div><div class="pass-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${LEVEL_XP}" aria-valuenow="${l.into}"><i style="width:${(l.into/LEVEL_XP)*100}%"></i></div><small>${l.max?'Has completado el pase.':`${l.into} / ${LEVEL_XP} XP · nivel ${l.level+1} en ${LEVEL_XP-l.into} XP`}</small></div></header>
   <div class="pass-body"><section class="pass-preview"><canvas id="passPreview" width="240" height="250" aria-label="Vista previa de la recompensa"></canvas><span class="pass-kind">${KIND_ICON[r.field]} ${r.kind} · Nivel ${r.level}</span><h3>${r.name}</h3><p>${KIND_TEXT[r.field]}</p>${nameRewardsAt(r.level).map(q=>`<div class="pass-extra"><span class="pass-kind">🏷️ ${q.kind} · incluido en este nivel</span><b>${q.name}</b>${chip(q)}</div>`).join('')}
   <button id="passAction" type="button" class="${st==='claimable'?'primary':'secondary'} wide" ${st==='locked'?'disabled':''}>${st==='claimable'?'Recoger recompensa':st==='claimed'?'Ponérmelo ahora':`🔒 Se desbloquea en el nivel ${r.level}`}</button></section>
   <div class="pass-track" role="list" aria-label="Recompensas del pase">${REWARDS.map(q=>{const s=stateOf(q,p);return `<button type="button" role="listitem" class="pass-card is-${s} ${q.level===selected?'is-selected':''}" data-pass-level="${q.level}" aria-label="Nivel ${q.level}: ${q.name}, ${s==='claimed'?'recogida':s==='claimable'?'lista para recoger':'bloqueada'}"><span class="pass-card-level">${q.level}</span><canvas width="76" height="84" data-pass-thumb="${q.level}"></canvas><b>${q.name}</b><small>${q.kind}</small>${nameRewardsAt(q.level).map(n=>`<span class="pass-name-reward">+ ${chip(n,'Aa')}</span>`).join('')}<i>${s==='claimed'?'✓':s==='claimable'?'¡Recoger!':'🔒'}</i></button>`;}).join('')}</div></div>
   <p class="pass-note">La experiencia se suma al terminar cada partida: partida completada, victoria, tareas, cada voto acertado a un impostor, reparaciones y eliminaciones del impostor. Los votos fallados restan un poco y saltar no cuenta. Ninguna partida da más de medio nivel. Las mascotas solo se consiguen aquí.</p>`;
   for(const thumb of passRoot.querySelectorAll('[data-pass-thumb]')){const q=REWARDS[Number(thumb.dataset.passThumb)-1],look=wearing(q);drawAvatar(thumb,look,poseTime(look));}
   passRoot.querySelector('.pass-card.is-selected')?.scrollIntoView?.({block:'nearest',inline:'center'});
  }
  renderHome();
 }
 async function passAction(){const p=progress(),r=REWARDS[selected-1],st=stateOf(r,p);if(st==='claimed'){equip(r.field,r.value);for(const n of nameRewardsAt(r.level))equip(n.field,n.value);toast(`Te has puesto: ${r.name}.`);lastPass='';renderPass();return;}if(st!=='claimable')return;const button=passRoot.querySelector('#passAction');button.disabled=true;
  try{const res=await fetch('/api/pass',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:getToken(),claim:r.level})});const data=await res.json();if(!res.ok)throw new Error(data.error||'No se ha podido recoger.');setToken(data.token);toast(`¡Desbloqueado: ${r.name}! Ya está en tu armario.`);[523,659,784,1046].forEach((f,i)=>setTimeout(()=>tone(f,.12,'triangle',.03),i*90));lastPass='';renderPass();}
  catch(e){toast(e.message);button.disabled=false;}}
 // ---------------------------------------------------------------- bucle
 function frame(time){
  requestAnimationFrame(frame);
  if(root.hidden||document.hidden||document.documentElement.dataset.scene!=='menu')return;
  const rect=canvas.getBoundingClientRect(),d=Math.min(1.5,window.devicePixelRatio||1),W=Math.max(1,Math.round(rect.width*d)),H=Math.max(1,Math.round(rect.height*d));
  if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;}
  const c=canvas.getContext('2d');c.setTransform(d,0,0,d,0,0);
  const reduced=reducedMotion();scene(c,rect.width,rect.height,reduced?0:time,{look:getAppearance(),reduced,portrait:rect.height>rect.width*1.1});
  if(openName==='pass'){const prev=passRoot.querySelector('#passPreview');if(prev){const r=REWARDS[selected-1];drawAvatar(prev,wearing(r),reduced?poseTime(getAppearance()):time);}}
  if(openName==='style'){const av=root.querySelector('#avatar');if(av)drawAvatar(av,getAppearance(),reduced?0:time);}
 }
 requestAnimationFrame(frame);
 renderHome();
 return {open,close,refresh(){lastPass='';if(openName==='pass')renderPass();else renderHome();},get sheet(){return openName;}};
}
export {PETS,EFFECTS,EMOTES,MAX_LEVEL};
