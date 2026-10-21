import {mountChestGame,inventoryMarkup} from './items-ui.js';
import {mountMenu} from './menu.js';
import {readToken,lockAppearance,allowed as passAllows,rewardFor,levelOf,LEVEL_XP,PETS,EFFECTS,EMOTES,NAME_BGS,NAME_COLORS,nameHtml,EMOJIS,WHEEL_DEFAULT,gestureInfo} from './pass.js';
import {activeRepairs} from './worlds.js';
import {installGameSelects} from './game-select.js';
import {bindTouchActions} from './touch-controls.js';
import {mountQuickChat} from './quick-chat.js';
import {drawFinale} from './finale.js';
import {drawJourney} from './journey.js';
import {LOBBY_OBJECTS,setLobbyHighlight} from './caravan.js';
import {createMeetingChat} from './meeting-chat.js';
import {createVoteCountdown} from './vote-countdown.js';
import {mountCinematic} from './cinematics.js';
import {updateMeetingCards,voteIcons} from './meetings.js';
import {createSoundscape,createAudioMixer,footstep,sfx} from './soundscape.js';
import {terraceMarkup,animateTerrace} from './expulsion.js';
import {mountArrival} from './arrival.js';
import {mountDisembark} from './disembark.js';
import {mountTableGame} from './tables-ui.js';
import {mechanicsFor,PASSAGE_RANGE,HIDE_RANGE,SWITCH_RANGE} from './map-mechanics.js';
import {worldFor,MAP,LOBBY,MEETING,FLOORS,STATIONS,REPAIRS,VENTS,SABOTAGES,taskStation,mapFor,PANTS,GLASSES,BAGS,ACCESSORIES,HAIR_COLORS,SKIN_TONES,SHOES,BADGES,COLORS,COLOR_NAMES,HATS,SKINS,SPEED,move,canStand,detentionMap,ITEMS,cageMap,distance,lineOfSight,roomAt,USE_RANGE,KILL_RANGE,REPORT_RANGE,insideStairs,TILE,blockersOf} from './content.js';
import {drawAvatar,drawHero,drawWorld,drawMiniMap,robotSVG,worldPoint,drawCamera,ventHits} from './render.js';
import {mountTask} from './tasks.js';
import {recordRemoteSample,remoteAt} from './remote-motion.js';
import {StateDecoder,INPUT_MS,fixedSteps} from './netcode.js';
import {createTouchStick,mergeDirections,toggleNativeFullscreen,installTouchSelectionGuard,menuViewport} from './touch-controls.js';
const $=id=>document.getElementById(id);
const visionDebug=new URL(location.href).searchParams.get('visionDebug')==='1';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Solo toca el DOM si cambia: escribir `hidden` con el mismo valor en cada
// fotograma invalidaba estilos y forzaba recálculos innecesarios.
const show=(id,visible)=>{const el=$(id);if(el.hidden!==!visible)el.hidden=!visible;};
const saved=key=>{try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}};
let appearance=saved('sanagus.profile')||{name:'',color:0,hat:0,skin:0,outfitColor:0,trimColor:2,pants:0,glasses:0,bag:0,accessory:0},session=null,state=null,local={x:0,y:0,facing:1},cam={x:0,y:0},rendered=new Map(),remoteSamples=new Map(),clockOffset=0,clockReady=false,clockRtt=Infinity,lastNetwork=0;
let queue=[],busy=false,nextPulse=0,inputDirty=false,failures=0,pendingMotion=[],retryMotion=null,nextMotionSeq=1,motionError=false,toastTimer,activeTask=null,modalKind=null,taskTimers=[],lastTime=performance.now(),lastUi=0,sigs={},keys=new Set(),audio=null,soundOn=saved('sanagus.sound')!==false,expulsionFrame=0,taskCleanup=null,mapFloor=0,lastBell=0,lastStep=0,lastRoleTone=0,lastActionFxId=null,fxTimer=0,wardrobeAbort=new AbortController();
let lastStateUi=0,gameSocket=null,gameReady=false,nextSocketAt=0,socketFailures=0,pumpTimer=null,inFlightMotion=[],simulationRemainder=0,localCorrection={x:0,y:0},lastMotionSend=0,nextActionId=1;
const socketActions=new Map();
let cinematicCleanup=()=>{},votePending=false,voteSelection=null,voteKind='normal',lastDeathNoticeId=null,lastSpiritNoticeId=null,roleNoticeTimer=0;
let reducedEffects=saved('sanagus.reducedEffects')??matchMedia('(prefers-reduced-motion: reduce)').matches;
function syncEffects(){document.documentElement.classList.toggle('reduced-effects',reducedEffects);if(state)state.reducedEffects=reducedEffects;for(const el of document.querySelectorAll('[data-effects]')){el.setAttribute('aria-pressed',String(reducedEffects));el.textContent=reducedEffects?'Luces: suaves':'Luces: completas';}}
for(const el of document.querySelectorAll('[data-effects]'))el.addEventListener('click',()=>{reducedEffects=!reducedEffects;localStorage.setItem('sanagus.reducedEffects',JSON.stringify(reducedEffects));syncEffects();});
syncEffects();
const audioMixer=createAudioMixer(()=>audio,saved('sanagus.volumes')||{});
const soundscape=createSoundscape(()=>audio,()=>soundOn,{output:()=>audioMixer.output('music'),now:()=>now(),duck:()=>!!modalKind});
setInterval(()=>soundscape.update(state,local,document.hidden),100);
const ACTION_ICONS={jumpBtn:'<path d="M4 20h16M7 16l5-11 5 11M9 11h6"/>',useBtn:'<path d="M8 12V5a2 2 0 0 1 4 0v6-7a2 2 0 0 1 4 0v8-5a2 2 0 0 1 4 0v9q0 6-7 6-5 0-8-7l-2-4q2-2 5 1Z"/>',killBtn:'<path d="m4 21 6-6M7 13l5 5M10 14 19 3q4 8-6 14Z"/>',reportBtn:'<path d="M4 9h5l10-5v14L9 14H4ZM7 14l2 7h4l-2-6"/>',sabotageBtn:'<path d="m14 2-9 12h7l-2 9L21 9h-8Z"/>',abilityBtn:'<path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>',ventBtn:'<rect x="3" y="5" width="18" height="15" rx="5"/><path d="M8 7v11m4-11v11m4-11v11"/>',notebookBtn:'<path d="M12 5Q5 1 2 5v15q5-3 10 0 5-3 10 0V5q-5-3-10 0Zm0 0v15M5 8l4 1m-4 3 4 1m6-4 4-1m-4 5 4-1"/>',cameraBtn:'<rect x="2" y="4" width="8" height="7" rx="2"/><rect x="14" y="4" width="8" height="7" rx="2"/><rect x="2" y="14" width="8" height="7" rx="2"/><rect x="14" y="14" width="8" height="7" rx="2"/>',mapBtn:'<path d="m2 5 7-3 6 3 7-3v17l-7 3-6-3-7 3Zm7-3v17m6-14v17"/>'};
for(const [id,path] of Object.entries(ACTION_ICONS)){if(['sabotageBtn','cameraBtn'].includes(id)&&$(id).firstElementChild?.tagName==='SPAN'){$(id).firstElementChild.remove();const key=document.createElement('kbd');key.textContent=id==='sabotageBtn'?'G':'B';$(id).prepend(key);}const icon=document.createElement('span');icon.className='action-icon';icon.setAttribute('aria-hidden','true');icon.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;$(id).prepend(icon);}
// Rótulos de los botones en móvil: las palabras largas («Alcantarillas») bajan de tamaño en vez de cortarse.
setInterval(()=>{if(!touchMode)return;for(const el of document.querySelectorAll('.action-bar .action>span:not(.action-icon)')){const n=Math.max(...el.textContent.split(/\s+/).map(w=>w.length)),size=n>11?'6px':n>8?'6.6px':'';if(el.style.fontSize!==size)el.style.setProperty('font-size',size,size?'important':'');}},400);
document.addEventListener('click',e=>{const b=e.target.closest?.('.action-bar .action,.hud-round,.inv-slot');if(b&&!b.disabled)cue('click');},true);
$('gameSoundBtn').addEventListener('click',()=>{$('audioBtn').click();$('gameSoundBtn').textContent=soundOn?'♫':'♪̸';});
const SPECIAL={nerd:['EMPOLLÓN','Pulsa N para abrir tu libreta privada. Escribe tus pistas y, una vez por partida, consulta el rol de otro jugador (los impostores aparecen como «No tiene rol»).'],delegate:['DELEGADO','Una vez por partida puedes emitir un voto decisivo. Si aciertas al impostor gana la tripulación; si fallas, te expulsan a ti.'],engineer:['INGENIERO','Puedes usar los conductos para viajar entre salas, como el impostor.'],plug:['EL ENCHUFE','Cuando alguien muera, recibirás un aviso privado con su nombre.'],believer:['EL CREYENTE','Los fantasmas pueden enviarte uno de cuatro emojis asignados al inicio de la partida. Cada fantasma puede hacerlo con 1–4 cada 15 segundos.'],phantom:['EL FANTASMA','Pulsa F para hacerte invisible durante 15 segundos. Puedes volver a aparecer antes; la recarga dura 90 segundos.'],copier:['COPIADOR BOSS','Pulsa F y elige a otro jugador vivo para adoptar su apariencia durante 30 segundos. Puedes cancelar antes; la recarga dura 90 segundos.'],latasa:['LATASA','Eres el impostor de la casa, pero algo torpe: cada intento de eliminar tiene un 20 % de fallar. Si fallas, tu víctima lo verá esquivar y tendrás que esperar al menos 10 segundos.']};
function specialFor(s){const world=worldFor(s);return Object.fromEntries(Object.entries(SPECIAL).map(([key,[name,copy]])=>[key,[world.roleNames?.[key]||name,copy.replace('entre salas y plantas','entre salas')]]));}
const now=()=>Date.now()+clockOffset;
const arrival=mountArrival($('arrivalIntro'),$('arrivalCanvas'),$('skipArrival'),$('replayArrival'),()=>{setSceneMode(state?'game':'menu');$('menu').classList.add('menu-arrived');if(!matchMedia('(pointer: coarse)').matches&&!state)$('playerName').focus({preventScroll:true});});
const touchQuery=matchMedia('(pointer: coarse)');
let touchMode=touchQuery.matches||navigator.maxTouchPoints>0&&matchMedia('(max-width: 1024px)').matches,installPrompt=null;
document.documentElement.classList.toggle('touch-mode',touchMode);
installTouchSelectionGuard(document,()=>touchMode);
const touchStick=createTouchStick($('touchStick'),$('touchKnob'),()=>{inputDirty=true;nextPulse=0;pump();});
const typing=()=>['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName);
function setSceneMode(mode){document.documentElement.dataset.scene=mode;document.querySelector('meta[name="theme-color"]').content=mode==='menu'?'#1b2b36':'#233442';}
setSceneMode($('arrivalIntro').hidden?'menu':'intro');
$('replayArrival').addEventListener('click',()=>{if(!$('arrivalIntro').hidden)setSceneMode('intro');});
let viewportSig='';
// 14.2 · Pantalla completa desde el primer fotograma. Al abrir en horizontal,
// algunos móviles dan un `innerHeight` provisional (barras del navegador aún
// asentándose) y no vuelven a lanzar `resize` cuando la ventana termina de
// colocarse: quedaba una franja hasta girar el móvil. Ahora se mide el
// viewport real con una sonda fija (inset:0), se vigila con ResizeObserver y
// se vuelve a medir varias veces mientras el navegador se asienta.
const viewportProbe=(()=>{const el=document.createElement('div');el.id='viewportProbe';el.setAttribute('aria-hidden','true');el.style.cssText='position:fixed;left:0;top:0;right:0;bottom:0;visibility:hidden;pointer-events:none;z-index:-1;contain:strict';document.body.appendChild(el);return el;})();
// 15.0 · Al arrancar, algunos navegadores móviles miden el área aún con la barra
// de direcciones y dejaban una franja vacía abajo hasta girar el móvil. Se toma
// la mayor de las medidas fiables (la del teclado se trata aparte) y se vuelve a
// medir durante los primeros segundos en cada fotograma.
// BETA 16.2 · Causa de la franja inferior en horizontal: se tomaba la MAYOR de
// las medidas (sonda fija o innerHeight). Con las barras del navegador visibles
// (Safari/Chrome/Samsung en horizontal), esa medida incluye la zona que tapa la
// barra inferior, así que la página quedaba más alta que lo visible y el
// navegador cubría la parte de abajo con una franja vacía hasta girar el móvil.
// Ahora la referencia es SIEMPRE el área visible real (`visualViewport`), con su
// desplazamiento, y se vuelve a medir en cada cambio del navegador y cada 0,5 s.
function layoutViewport(){const r=viewportProbe.getBoundingClientRect(),w=Math.round(r.width)||window.innerWidth,h=Math.round(r.height)||window.innerHeight||document.documentElement.clientHeight;return {w,h};}
function visibleViewport(box){const v=window.visualViewport;if(v&&v.scale<=1.01&&v.width>0&&v.height>0)return {w:Math.round(Math.min(v.width,box.w||v.width)),h:Math.round(Math.min(v.height,box.h||v.height)),top:Math.max(0,Math.round(v.offsetTop||0))};return {w:box.w,h:box.h,top:0};}
// Con interactive-widget=resizes-content el teclado encoge TAMBIÉN la ventana de
// diseño, así que compararlas no detecta el teclado. Se compara con la mayor
// altura vista en esa orientación sin estar escribiendo.
const baseHeight={landscape:0,portrait:0};
function syncViewport(){const v=window.visualViewport,editing=typing(),menu=!state,box=layoutViewport(),vis=visibleViewport(box),orient=box.w>=box.h?'landscape':'portrait';if(!editing)baseHeight[orient]=Math.max(vis.h,box.h);const base=baseHeight[orient]||Math.max(box.h,window.screen?.height||0),keyboard=!!(editing&&((v&&v.height<box.h*.8)||vis.h<base*.78)),view={width:vis.w,height:vis.h,top:vis.top,keyboard};
 // `accept` llama aquí con cada instantánea; si no cambia nada no se toca el DOM.
 const sig=`${view.height}|${view.width}|${view.top}|${menu&&editing}|${view.keyboard}`;if(sig===viewportSig)return;viewportSig=sig;document.documentElement.style.setProperty('--app-height',`${view.height}px`);document.documentElement.style.setProperty('--app-width',`${view.width}px`);document.documentElement.style.setProperty('--viewport-top',`${view.top}px`);document.documentElement.classList.toggle('menu-short',view.height<500);document.documentElement.classList.toggle('menu-keyboard',menu&&editing&&view.height<420);document.documentElement.classList.toggle('keyboard-visible',view.keyboard);document.documentElement.classList.toggle('editing-name',view.keyboard&&document.activeElement?.id==='playerName');if(keyboard)keepFocusVisible();}
// Con el teclado abierto en el menú, el campo que se edita se desplaza a la vista.
function keepFocusVisible(){const el=document.activeElement;if(el&&['INPUT','TEXTAREA'].includes(el.tagName))requestAnimationFrame(()=>el.scrollIntoView?.({block:'center',inline:'nearest'}));}

let viewportSettle=[];
function settleViewport(){syncViewport();for(const id of viewportSettle)clearTimeout(id);viewportSettle=[60,180,400,800,1500,2500].map(ms=>setTimeout(syncViewport,ms));}
// BETA 16.2 · Franja inferior: además de medir, (1) el documento nunca puede
// desplazarse (si el navegador lo desplaza al ocultar la barra, se devuelve a 0),
// (2) los contenedores a pantalla completa se anclan con top:0/bottom:0 en CSS
// (no dependen de una altura medida), (3) se vuelve a medir con pantalla completa,
// orientación, foco y cada 400 ms, sin esperar a que el jugador gire el móvil.
function pinDocument(){if(window.scrollX||window.scrollY)window.scrollTo(0,0);const se=document.scrollingElement;if(se&&(se.scrollTop||se.scrollLeft)){se.scrollTop=0;se.scrollLeft=0;}}
function fullResync(){viewportSig='';pinDocument();syncViewport();}
for(const ev of ['fullscreenchange','webkitfullscreenchange'])document.addEventListener(ev,()=>{fullResync();settleViewport();});
window.addEventListener('orientationchange',()=>{fullResync();settleViewport();});window.addEventListener('focus',fullResync);window.addEventListener('scroll',pinDocument,{passive:true});
// BETA 16.2 · En tablets sin pantalla completa el menú no cabía: el título quedaba
// cortado arriba. Si el contenido no cabe, se reduce entero (zoom) hasta que cabe.
let menuFitKey='';function fitMenu(){const el=document.querySelector('#menu .menu-home');if(!el||document.getElementById('menu').hidden||document.documentElement.classList.contains('keyboard-visible'))return;const key=innerWidth+'x'+innerHeight;if(key===menuFitKey)return;menuFitKey=key;el.style.zoom='';const kids=[...el.children].filter(k=>k.offsetParent!==null);if(!kids.length)return;const box=el.getBoundingClientRect(),top=Math.min(...kids.map(k=>k.getBoundingClientRect().top)),bottom=Math.max(...kids.map(k=>k.getBoundingClientRect().bottom)),cs=getComputedStyle(el),pad=parseFloat(cs.paddingTop)+parseFloat(cs.paddingBottom),need=bottom-top+pad,avail=box.height;if(need>avail+2&&avail>100)el.style.zoom=String(Math.max(.6,Math.floor(avail/need*100)/100));}
setInterval(()=>{if(!document.hidden){pinDocument();syncViewport();fitMenu();}},400);window.addEventListener('resize',()=>{menuFitKey='';setTimeout(fitMenu,60);});
syncViewport();settleViewport();window.addEventListener('resize',settleViewport);window.visualViewport?.addEventListener('resize',syncViewport);window.visualViewport?.addEventListener('scroll',syncViewport);
if(typeof ResizeObserver==='function')new ResizeObserver(()=>syncViewport()).observe(viewportProbe);
window.addEventListener('load',settleViewport);window.addEventListener('pageshow',settleViewport);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)settleViewport();});
screen.orientation?.addEventListener?.('change',()=>{touchStick.reset();keys.clear();settleViewport();});
// 15.0 · Horizontal y pantalla completa en móviles. Con el primer toque se pide
// pantalla completa y orientación horizontal (solo funciona con un gesto). Si el
// navegador no lo permite (iPhone), la capa de giro pide girar el móvil a mano.
const coarse=()=>matchMedia('(pointer:coarse)').matches,portrait=()=>matchMedia('(orientation: portrait)').matches;
let landscapeTried=0;
async function goLandscape(force=false){if(!coarse())return;if(!force&&Date.now()-landscapeTried<4000)return;landscapeTried=Date.now();
 try{if(!(document.fullscreenElement||document.webkitFullscreenElement)){const el=document.documentElement;if(el.requestFullscreen)await el.requestFullscreen({navigationUI:'hide'});else if(el.webkitRequestFullscreen)await el.webkitRequestFullscreen();}}catch{}
 try{await screen.orientation?.lock?.('landscape');}catch{}
 settleViewport();setTimeout(()=>{if(portrait())$('rotateHelp').textContent='Tu navegador no gira solo: pon el móvil de lado.';},700);}
$('rotateBtn')?.addEventListener('click',()=>goLandscape(true));
// Al soltar el dedo (no al apoyarlo): así el cambio a pantalla completa nunca
// interrumpe un arrastre del joystick que acaba de empezar.
document.addEventListener('pointerup',e=>{if(e.pointerType==='touch'&&coarse()&&!e.target.closest?.('#touchMovement,#touchStick')&&(portrait()||!(document.fullscreenElement||document.webkitFullscreenElement)&&!(matchMedia('(display-mode: fullscreen)').matches||matchMedia('(display-mode: standalone)').matches||navigator.standalone)))goLandscape();},{capture:true,passive:true});
{const until=performance.now()+3000;const poll=()=>{syncViewport();if(performance.now()<until)requestAnimationFrame(poll);};requestAnimationFrame(poll);}
window.addEventListener('orientationchange',()=>{touchStick.reset();keys.clear();settleViewport();});
touchQuery.addEventListener?.('change',e=>{touchMode=e.matches||navigator.maxTouchPoints>0&&matchMedia('(max-width: 1024px)').matches;document.documentElement.classList.toggle('touch-mode',touchMode);touchStick.reset();if(touchMode&&state)$('game').classList.add('panel-collapsed');updateFullscreenButton();});
document.addEventListener('focusout',()=>requestAnimationFrame(syncViewport));document.addEventListener('focusin',()=>{settleViewport();});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});
if('serviceWorker' in navigator&&window.isSecureContext)navigator.serviceWorker.register('/sw.js').catch(()=>{});
$('installHelpBtn').addEventListener('click',()=>screenHelp());
$('menuFullscreenBtn').addEventListener('click',async()=>{const status=await toggleNativeFullscreen(document);if(status==='unavailable'||status==='denied')screenHelp();});
$('exitImmersive').addEventListener('click',()=>{document.documentElement.classList.remove('immersive');updateFullscreenButton();});
document.addEventListener('focusin',()=>{syncViewport();if(typing()){keys.clear();touchStick.reset();inputDirty=true;nextPulse=0;pump();}});

function remember(){localStorage.setItem('sanagus.profile',JSON.stringify(appearance));}
// Avisos: una pila centrada en la parte inferior. Antes había un solo aviso
// cuya animación de entrada sustituía el `translateX(-50%)` del centrado, así
// que acababa desplazado a la derecha, encima de USAR/MATAR. Ahora cada aviso
// es un elemento propio (máximo tres, sin solaparse; un texto repetido solo
// renueva su tiempo) y la pila se coloca por encima de cualquier control que
// ocupe la franja central inferior: botones, joystick, inventario o chat.
const noticeTimers=new WeakMap();
function toast(text){const stack=$('noticeStack');if(!stack||!text)return;let el=[...stack.querySelectorAll('.notice.toast')].find(n=>n.textContent===text&&!n.classList.contains('leaving'));
 if(!el){el=document.createElement('div');el.className='notice toast';el.textContent=text;stack.append(el);const live=[...stack.querySelectorAll('.notice.toast:not(.leaving)')];const max=window.innerHeight<500?2:3;while(live.length>max)dismissNotice(live.shift(),true);}
 clearTimeout(noticeTimers.get(el));noticeTimers.set(el,setTimeout(()=>dismissNotice(el),3800));layoutNotices();}
function dismissNotice(el,instant=false){if(!el||el.classList.contains('leaving'))return;clearTimeout(noticeTimers.get(el));el.classList.add('leaving');setTimeout(()=>{el.remove();layoutNotices();},instant?0:240);}
const NOTICE_BOTTOM_CONTROLS=['.action-bar .action','#inventory','#touchMovement','#spiritChoices','#meetingSpiritChoices','.meeting-chat-form','#chatForm'];
function layoutNotices(){const stack=$('noticeStack');if(!stack)return;const vw=window.innerWidth,vh=window.innerHeight,cx=vw/2,rects=[];
 for(const sel of NOTICE_BOTTOM_CONTROLS)for(const el of document.querySelectorAll(sel)){if(el.hidden||el.closest('[hidden]'))continue;const r=el.getBoundingClientRect();if(r.width<2||r.height<2||r.bottom<vh*.55)continue;rects.push(r);}
 // 1) Hueco libre entre los controles de la izquierda (joystick, inventario) y
 //    los de la derecha (botones de acción): si cabe, el aviso va abajo del
 //    todo, centrado y más estrecho, lejos del personaje (centro de pantalla).
 let leftEdge=0,rightEdge=vw;for(const r of rects){if(r.right<=cx)leftEdge=Math.max(leftEdge,r.right);else if(r.left>=cx)rightEdge=Math.min(rightEdge,r.left);else{leftEdge=cx;rightEdge=cx;}}
 const half=Math.min(cx-leftEdge,rightEdge-cx)-8;let width,bottom;
 if(half*2>=210){width=Math.min(460,vw-32,half*2);bottom=12;}
 // 2) Si no hay hueco (pantallas muy estrechas), la pila se apoya encima del
 //    control más alto que ocupe la columna central.
 else{width=Math.min(460,vw-32);const left=cx-width/2,right=cx+width/2;bottom=16;for(const r of rects)if(r.right>left&&r.left<right)bottom=Math.max(bottom,vh-r.top+10);bottom=Math.min(bottom,vh*.42);}
 stack.style.setProperty('--notice-bottom',`${Math.round(bottom)}px`);stack.style.setProperty('--notice-width',`${Math.round(width)}px`);}
window.addEventListener('resize',()=>layoutNotices());
// Al recuperar la red el navegador avisa: se reintenta ya, sin esperar al retroceso.
window.addEventListener('online',()=>{nextPulse=0;pump();});
function enableAudio(){if(!audio){try{audio=new (window.AudioContext||window.webkitAudioContext)();}catch{}}if(audio?.state==='suspended')audio.resume();}
function tone(freq=520,duration=.1,type='sine',volume=.08,category='effects'){if(!audio||!soundOn)return;const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.value=freq;o.connect(g);g.connect(audioMixer.output(category)||audio.destination);o.onended=()=>{o.disconnect();g.disconnect();};g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.start();o.stop(audio.currentTime+duration);}
// 14.3 · Superficie bajo los pies (suena distinto cada suelo).
let stepFoot=0;
function surfaceUnder(s,p){if(!s)return 'tile';if(s.phase==='lobby')return 'wood';const m=s.config?.map;const zone=worldFor(s).zoneAt?.(p.x,p.y,s.me.floor)?.id||'';if(m==='gym')return zone==='pavilion'||zone==='yoga'||zone==='activities'?'wood':zone==='pool'||zone==='showers'?'wet':'rubber';if(m==='club')return zone==='main'||zone==='secondary'?'dance':zone==='vip'?'carpet':'tile-dark';if(m==='house'){const r=worldFor(s).FLOORS[0].rooms.find(r=>r.id===zone);const k=r?.floorKind;return k==='carpet'?'carpet':k==='tile'?'tile':k==='concrete'?'tile-dark':'wood';}return 'tile';}
function cue(kind){if(audio&&soundOn&&['repair','impostor-reveal','meeting','death','win','task','lose','stairs','reveal','vent','open','click'].includes(kind)){sfx(audio,audioMixer.output('effects'),kind);return;}if(kind==='sabotage'){/* Sin sonido propio: la alarma grave de pulsos (updateAlarm) arranca en este mismo fotograma, la campana tiene su timbre y el apagón de sonido silencia. El antiguo aviso de tres notas se mezclaba con la sirena. */}else if(kind==='repair'){[440,660,880].forEach((n,i)=>setTimeout(()=>tone(n,.12,'triangle',.025),i*95));}else if(kind==='impostor-reveal'){tone(82,.8,'sawtooth',.035);setTimeout(()=>tone(123,.5,'triangle',.045),170);}else if(kind==='meeting'){tone(460,.18,'triangle');setTimeout(()=>tone(690,.3,'triangle'),220);}else if(kind==='death'){tone(160,.5,'sawtooth',.06);}else if(kind==='win'){[440,554,660,880].forEach((n,i)=>setTimeout(()=>tone(n,.2),i*130));}else if(kind==='task'){tone(700,.12);setTimeout(()=>tone(950,.16),150);}else if(kind==='lose'){[330,294,220,165].forEach((n,i)=>setTimeout(()=>tone(n,.24,'triangle',.045),i*140));}else if(kind==='stairs'){tone(330,.12,'triangle',.04);setTimeout(()=>tone(475,.2,'triangle',.04),130);}else if(kind==='reveal'){tone(390,.25,'sine',.055);setTimeout(()=>tone(590,.3,'triangle',.045),260);}else tone(500,.08);}
function playActionFx(kind,s){cinematicCleanup();cinematicCleanup=mountCinematic($('actionFx'),kind,s,{tone,reduced:reducedEffects});}
const meetingChat=createMeetingChat($('meetingMessages'),{onUnread:n=>{show('chatLatestBtn',n>0);$('chatLatestBtn').textContent=`↓ ${n} mensajes nuevos`;}});
$('chatLatestBtn').addEventListener('click',()=>meetingChat.jumpToLatest());
const voteCountdown=createVoteCountdown($('voteCountdown'),{onTick:n=>{if(!document.hidden)tone(n<=3?920:n<=5?780:650,.07,'triangle',n<=3?.045:.026,'ui');},onFinish:()=>{if(!document.hidden){tone(330,.14,'triangle',.045);setTimeout(()=>tone(495,.2,'triangle',.035),130);}}});
for(const id of ['audioBtn','gameSoundBtn']){const b=document.createElement('button');b.type='button';b.className='icon-btn mixer-button';b.setAttribute('aria-label','Mezclador de sonido');b.title='Volúmenes de música, efectos e interfaz';b.textContent='≋';$(id).after(b);b.addEventListener('click',()=>{enableAudio();openModal('Mezclador de sonido',`<div class="audio-sliders">${Object.entries({master:'Volumen general',music:'Música',effects:'Efectos',ui:'Interfaz'}).map(([key,label])=>`<label>${label}<input type="range" min="0" max="100" value="${Math.round(audioMixer.levels[key]*100)}" data-volume="${key}"><output>${Math.round(audioMixer.levels[key]*100)} %</output></label>`).join('')}</div>`,'audio');$('modalContent').addEventListener('input',e=>{const key=e.target.dataset.volume;if(!key)return;audioMixer.set(key,Number(e.target.value)/100);localStorage.setItem('sanagus.volumes',JSON.stringify(audioMixer.levels));e.target.nextElementSibling.textContent=e.target.value+' %';tone(660,.04,'triangle',.035,'ui');});});}
window.addEventListener('pointerdown',()=>enableAudio(),{once:true});
document.addEventListener('click',e=>{if(e.target.closest('button')&&!document.hidden)tone(540,.025,'triangle',.012,'ui');});
const wardrobe={skin:SKINS,hat:HATS,trimColor:COLOR_NAMES,pants:PANTS,glasses:GLASSES,bag:BAGS,accessory:ACCESSORIES,hairColor:HAIR_COLORS,skinTone:SKIN_TONES,shoes:SHOES,shoeColor:COLOR_NAMES,badge:BADGES,pet:PETS,effect:EFFECTS,emote:EMOTES,nameBg:NAME_BGS.map(b=>`${b.n} · ${b.r}`),nameColor:NAME_COLORS.map(b=>`${b.n} · ${b.r}`)};
// Progreso del pase firmado por el servidor. Se guarda tal cual; aquí solo se lee
// para pintar la barra y marcar lo bloqueado. El servidor vuelve a comprobarlo.
const PASS_KEY='sanagus.pass';let passToken='';try{passToken=localStorage.getItem(PASS_KEY)||'';}catch{}
const passProgress=()=>readToken(passToken);
function choiceLabel(id,i,name){if(passAllows(id,i,passProgress()))return esc(name);const r=rewardFor(id,i);return `🔒 ${esc(name)}${r?` · nivel ${r.level}`:''}`;}
function choiceOptions(id,choices,selected){return choices.map((n,i)=>`<option value="${i}" ${i===selected?'selected':''} ${passAllows(id,i,passProgress())?'':'disabled'}>${choiceLabel(id,i,n)}</option>`).join('');}
const wardrobeSection=id=>['nameBg','nameColor'].includes(id)?'name':['hat','hairColor','skinTone','glasses'].includes(id)?'face':['bag','accessory','badge'].includes(id)?'extras':['pet','effect','emote'].includes(id)?'pass':'clothes';
const wardrobeLabels={skin:'Ropa',hat:'Pelo / gorro',trimColor:'Color secundario',pants:'Pantalón',glasses:'Gafas',bag:'Mochila',accessory:'Complemento',hairColor:'Color del pelo',skinTone:'Tono de piel',shoes:'Calzado',shoeColor:'Color del calzado',badge:'Parche',pet:'Mascota',effect:'Efecto',emote:'Animación',nameBg:'Fondo del nombre',nameColor:'Color de las letras'};
appearance.shoeColor??=8;
function renderWardrobeSelects(){appearance=lockAppearance(appearance,passProgress());for(const [id,choices] of Object.entries(wardrobe)){const selected=appearance[id]??0,value=Number.isInteger(selected)&&selected>=0&&selected<choices.length?selected:0;$(id).innerHTML=choiceOptions(id,choices,value);$(id).value=value;}}
renderWardrobeSelects();
appearance.trimColor??=2; $('playerName').value=appearance.name;
function updateAppearance(){appearance.name=$('playerName').value;for(const id of Object.keys(wardrobe))appearance[id]=Number($(id).value);$('colorName').textContent=COLOR_NAMES[appearance.color].toUpperCase();$('palette').innerHTML=COLORS.map((c,i)=>`<button class="swatch ${i===appearance.color?'selected':''}" style="--swatch:${c}" data-color="${i}" title="${COLOR_NAMES[i]}" aria-label="${COLOR_NAMES[i]}" aria-pressed="${i===appearance.color}" type="button"></button>`).join('');$('styleSummary').textContent=`${SKINS[appearance.skin]} · ${HATS[appearance.hat]}`;$('namePreview').innerHTML=nameHtml(esc(appearance.name||'Tu nombre'),appearance.nameBg,appearance.nameColor);remember();drawAvatar($('avatar'),appearance,performance.now());}
$('palette').addEventListener('click',e=>{const button=e.target.closest('[data-color]');if(button){appearance.color=Number(button.dataset.color);updateAppearance();tone(440+appearance.color*25,.05);}});
for(const id of ['playerName',...Object.keys(wardrobe)])$(id).addEventListener('input',updateAppearance);
updateAppearance();
// Menú principal con escena animada, hojas y pase de temporada.
const menuUI=mountMenu({root:$('menu'),canvas:$('menuScene'),getAppearance:()=>appearance,getToken:()=>passToken,getAuth:()=>authToken,setToken:storePass,equip:(field,value)=>{if(field==='emoji'){addToWheel('e'+value);return;}appearance[field]=value;renderWardrobeSelects();updateAppearance();if(state?.phase==='lobby')act('profile',appearance).catch(()=>{});},toast,tone,reducedMotion:()=>matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.classList.contains('reduced-effects')});
// 16.5 · Cuenta (nombre + contraseña). La sesión es un token firmado por el servidor; el
// progreso del pase vive en la cuenta, no en este dispositivo.
const AUTH_KEY='pucela.auth',GUEST_KEY='pucela.guest';let authToken='',accountName='';try{authToken=localStorage.getItem(AUTH_KEY)||'';}catch{}
function setAccount(v){authToken=v?v.auth:'';accountName=v?v.name:'';try{v?localStorage.setItem(AUTH_KEY,v.auth):localStorage.removeItem(AUTH_KEY);}catch{}
 const input=$('playerName');if(v){input.value=v.name;input.readOnly=true;appearance.name=v.name;if(v.token)storePass(v.token);}else input.readOnly=false;
 $('accountChip').hidden=!v;$('accountLabel').textContent=v?`Cuenta: ${v.name}`:'';updateAppearance();}
function showGate(on){$('loginGate').hidden=!on;if(on){$('loginError').textContent='';setTimeout(()=>$('loginName').focus({preventScroll:true}),30);}}
async function accountCall(action){const name=$('loginName').value.trim(),password=$('loginPass').value;$('loginError').textContent='';
 if(name.length<3){$('loginError').textContent='El nombre debe tener entre 3 y 18 caracteres.';return;}if(password.length<6){$('loginError').textContent='La contraseña debe tener al menos 6 caracteres.';return;}
 $('loginBtn').disabled=$('registerBtn').disabled=true;
 try{const r=await request('/api/account',{action,name,password,pass:passToken},12000);$('loginPass').value='';setAccount(r);try{sessionStorage.removeItem(GUEST_KEY);}catch{}showGate(false);toast(action==='register'?`Cuenta creada. ¡Bienvenido, ${r.name}!`:`Sesión iniciada: ${r.name}`);}
 catch(e){$('loginError').textContent=e.message;}finally{$('loginBtn').disabled=$('registerBtn').disabled=false;}}
function storePass(token){passToken=token;try{localStorage.setItem(PASS_KEY,token);}catch{}renderWardrobeSelects();renderWheelSelects();updateAppearance();menuUI?.refresh();}
document.querySelectorAll('[data-proxy]').forEach(b=>b.addEventListener('click',()=>{$(b.dataset.proxy)?.click();const st=$('effectsState');if(st)st.textContent=$('effectsMenuToggle').textContent;}));
let selectedStyleTab='clothes',styleFieldIndex={clothes:0,face:0,extras:0,pass:0,name:0,wheel:0};for(let i=0;i<8;i++)wardrobeLabels['wheel'+i]=`Rueda (B) · hueco ${i+1}`;
function selectStyleTab(tab){selectedStyleTab=tab;const fields=[...document.querySelectorAll('#menu [data-style-group]')].filter(label=>label.dataset.styleGroup===tab),index=styleFieldIndex[tab];document.querySelectorAll('#menu [data-style-tab]').forEach(b=>{const selected=b.dataset.styleTab===tab;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});const compact=touchMode||matchMedia('(max-width: 1000px)').matches;document.querySelectorAll('#menu [data-style-group]').forEach(label=>label.hidden=compact?label!==fields[index]:label.dataset.styleGroup!==tab);$('styleFieldPosition').textContent=`${wardrobeLabels[fields[index].querySelector('select').id]} · ${index+1} / ${fields.length}`;}
function stepStyleField(step){const count=document.querySelectorAll(`#menu [data-style-group="${selectedStyleTab}"]`).length;styleFieldIndex[selectedStyleTab]=(styleFieldIndex[selectedStyleTab]+step+count)%count;selectStyleTab(selectedStyleTab);}
$('prevStyleField').addEventListener('click',()=>stepStyleField(-1));$('nextStyleField').addEventListener('click',()=>stepStyleField(1));
document.querySelector('#menu .wardrobe-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-style-tab]');if(b)selectStyleTab(b.dataset.styleTab);});selectStyleTab('clothes');
window.addEventListener('resize',()=>selectStyleTab(selectedStyleTab));touchQuery.addEventListener?.('change',()=>selectStyleTab(selectedStyleTab));
$('randomLook').addEventListener('click',()=>{for(const [id,choices] of Object.entries(wardrobe)){if(id==='nameBg'||id==='nameColor')continue;const open=choices.map((_,i)=>i).filter(i=>passAllows(id,i,passProgress())&&!(['pet','effect','emote'].includes(id)&&Math.random()<.5));$(id).value=open.length?open[Math.floor(Math.random()*open.length)]:0;}appearance.color=Math.floor(Math.random()*COLORS.length);updateAppearance();cue();});
$('resetLook').addEventListener('click',()=>{for(const id of Object.keys(wardrobe))$(id).value=id==='shoeColor'?8:id==='trimColor'?2:0;appearance.color=0;updateAppearance();});
$('audioBtn').textContent=soundOn?'♫':'♪';$('audioBtn').addEventListener('click',()=>{soundOn=!soundOn;localStorage.setItem('sanagus.sound',JSON.stringify(soundOn));$('audioBtn').textContent=soundOn?'♫':'♪';enableAudio();toast(soundOn?'Sonidos activados.':'Sonidos desactivados.');tone();});
const query=new URL(location.href).searchParams.get('sala');if(query)$('roomInput').value=query.toUpperCase().slice(0,6);
async function request(path,body,timeout=7000){const start=Date.now();const res=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(timeout)});let data;try{data=await res.json();}catch{throw new Error('El servidor no ha respondido correctamente.');}if(!res.ok){const error=new Error(data.error||'No se ha podido completar la acción.');error.status=res.status;throw error;}if(data.state){const end=Date.now(),rtt=end-start,sample=data.state.serverTime-(start+end)/2;if(!clockReady||rtt<=clockRtt*1.15+10){clockOffset=clockReady?clockOffset+(sample-clockOffset)*.08:sample;clockReady=true;}clockRtt=Math.min(clockRtt,rtt);}return data;}
let roomPrivacy='public';document.querySelectorAll('[data-privacy]').forEach(b=>b.addEventListener('click',()=>{roomPrivacy=b.dataset.privacy;document.querySelectorAll('[data-privacy]').forEach(o=>{o.classList.toggle('selected',o===b);o.setAttribute('aria-pressed',String(o===b));});}));
async function enter(create){enableAudio();updateAppearance();$('menuError').textContent='';$('createBtn').disabled=true;$('joinBtn').disabled=true;
  try{const r=await request(create?'/api/create':'/api/join',{visibility:roomPrivacy,profile:{...appearance,introProtocol:1,pass:passToken,auth:authToken||undefined},code:$('roomInput').value.toUpperCase()});session=r.session;sessionStorage.setItem('sanagus.session',JSON.stringify(session));accept(r.state);nextPulse=0;cue();$('world').focus();}catch(e){$('menuError').textContent=e.message;$('joinCodeError').textContent=e.message;}finally{$('createBtn').disabled=false;$('joinBtn').disabled=false;}}
$('openJoinCode').addEventListener('click',()=>{$('joinCodeScreen').hidden=false;$('joinCodeError').textContent='';$('roomInput').focus({preventScroll:true});});$('closeJoinCode').addEventListener('click',()=>{$('joinCodeScreen').hidden=true;$('openJoinCode').focus({preventScroll:true});});$('joinCodeScreen').addEventListener('keydown',e=>{if(e.key==='Escape')$('closeJoinCode').click();});$('createBtn').addEventListener('click',()=>enter(true));$('joinForm').addEventListener('submit',e=>{e.preventDefault();enter(false);});$('roomInput').addEventListener('input',()=>{$('roomInput').value=$('roomInput').value.toUpperCase().replace(/[^A-Z2-9]/g,'');});
let openRoomList=[],roomsPage=0;
function renderOpenRooms(){const pageSize=2,total=Math.max(1,Math.ceil(openRoomList.length/pageSize));roomsPage=Math.min(roomsPage,total-1);$('roomsList').innerHTML=openRoomList.slice(roomsPage*pageSize,(roomsPage+1)*pageSize).map(r=>`<button class="room-entry" data-room="${esc(r.code)}"><span><b>${esc(r.host)}</b><small>CÓDIGO ${esc(r.code)} · ${r.impostors} IMPOSTOR${r.impostors===1?'':'ES'}</small></span><strong>${r.players} / ${r.maxPlayers} →</strong></button>`).join('');$('roomsPage').textContent=`${roomsPage+1} / ${total}`;$('prevRooms').disabled=roomsPage===0;$('nextRooms').disabled=roomsPage===total-1;}
async function refreshRooms(){if($('openRooms').hidden)return;try{const res=await fetch('/api/rooms',{cache:'no-store',signal:AbortSignal.timeout(7000)}),data=await res.json();if(!res.ok)throw new Error(data.error||'No se pudieron cargar las salas.');openRoomList=data.rooms;$('roomsStatus').textContent=data.rooms.length?`${data.rooms.length} salas disponibles`:'No hay salas abiertas ahora. Puedes crear una.';renderOpenRooms();}catch(e){$('roomsStatus').textContent=e.message;}}
function closeRooms(){show('openRooms',false);$('browseBtn').setAttribute('aria-expanded','false');}
$('browseBtn').addEventListener('click',()=>{const opening=$('openRooms').hidden;show('openRooms',opening);$('browseBtn').setAttribute('aria-expanded',String(opening));if(opening){roomsPage=0;refreshRooms();}});$('closeRooms').addEventListener('click',closeRooms);$('prevRooms').addEventListener('click',()=>{roomsPage--;renderOpenRooms();});$('nextRooms').addEventListener('click',()=>{roomsPage++;renderOpenRooms();});$('refreshRooms').addEventListener('click',refreshRooms);$('roomsList').addEventListener('click',e=>{const room=e.target.closest('[data-room]');if(room){$('roomInput').value=room.dataset.room;closeRooms();enter(false);}});setInterval(refreshRooms,4500);
function schedulePump(delay=0){clearTimeout(pumpTimer);pumpTimer=setTimeout(pump,Math.max(0,delay));}
function syncClock(serverTime,start,end=Date.now()){
 const rtt=end-start,sample=serverTime-(start+end)/2;
 if(!clockReady||rtt<=clockRtt*1.15+10){clockOffset=clockReady?clockOffset+(sample-clockOffset)*.08:sample;clockReady=true;}
 clockRtt=Math.min(clockRtt,rtt);
}
function applyNetworkState(s){
 if(state&&s.code===state.code&&((s.revision??0)<(state.revision??0)||(s.revision??0)===(state.revision??0)&&s.serverTime<state.serverTime))return;
 const ack=s.me.motionSeq||0;inFlightMotion=inFlightMotion.filter(packet=>packet.seq>ack);
 if(retryMotion&&retryMotion.seq<=ack)retryMotion=null;
 nextMotionSeq=Math.max(nextMotionSeq,ack+1);
 const previous=state,relocated=!previous||previous.phase!==s.phase||previous.gameNumber!==s.gameNumber||previous.me.floor!==s.me.floor||previous.me.vent!==s.me.vent||previous.me.motionEpoch!==s.me.motionEpoch;
 accept(s);failures=0;lastNetwork=Date.now();networkTrouble(false);
 if(!relocated)reconcilePosition(s);
}
function motionPacket(axis){
 const packet={seq:nextMotionSeq++,epoch:state?.me.motionEpoch||0,time:now()-simulationRemainder*1000,segments:pendingMotion.splice(0),x:axis.x,y:axis.y};
 inFlightMotion.push(packet);return packet;
}
function closeGameSocket(){
 const socket=gameSocket;gameSocket=null;gameReady=false;if(socket)socket.close();
 for(const item of socketActions.values()){clearTimeout(item.timer);item.reject(new Error('Se perdió la conexión durante la acción. Comprueba su resultado.'));}socketActions.clear();
}
function connectGameSocket(){
 if(gameSocket||!session||!state||Date.now()<nextSocketAt||typeof WebSocket==='undefined'||new URL(location.href).searchParams.get('transport')==='http')return;
 const currentSession=session,decoder=new StateDecoder(),url=new URL('/api/game-ws',location.href);url.protocol=location.protocol==='https:'?'wss:':'ws:';url.searchParams.set('code',session.code);url.searchParams.set('token',session.token);
 const socket=gameSocket=new WebSocket(url);let replayed=false,lastPing=0;
 socket.onmessage=event=>{
  if(socket!==gameSocket||session!==currentSession)return;
  let msg;try{msg=JSON.parse(event.data);}catch{return;}
  if(msg.t==='pong'){if(Number.isFinite(msg.sent))syncClock(msg.serverTime,msg.sent);return;}
  if(msg.t==='closed'){socket.close();nextPulse=0;return;}
  if(msg.t==='state'){
   let s;try{s=decoder.read(msg);}catch{socket.send(JSON.stringify({t:'resync'}));return;}if(!s)return;
   applyNetworkState(s);gameReady=true;socketFailures=0;
   if(!replayed){replayed=true;for(const packet of inFlightMotion)socket.send(JSON.stringify({t:'input',motion:packet}));}
   if(Date.now()-lastPing>2000){lastPing=Date.now();socket.send(JSON.stringify({t:'ping',sent:lastPing}));}
   return;
  }
  if(msg.t==='result'){
   const item=socketActions.get(msg.id);if(!item)return;socketActions.delete(msg.id);clearTimeout(item.timer);
   if(msg.result?.state)applyNetworkState(msg.result.state);
   if(msg.status>=400){const error=new Error(msg.result?.error||'No se pudo realizar la acción.');error.status=msg.status;item.reject(error);}else item.resolve(msg.result);
   if(msg.result?.left)resetSession();return;
  }
  if(msg.t==='error'){
   if(msg.status===401||msg.status===404){socket.close();return;}
   // Restore the authoritative acknowledgement before replaying a missing batch.
   socket.close();nextPulse=0;
  }
 };
 socket.onerror=()=>{};
 socket.onclose=()=>{
  if(gameSocket!==socket)return;gameSocket=null;gameReady=false;nextSocketAt=Date.now()+Math.min(5000,500*2**Math.min(4,socketFailures++));
  for(const item of socketActions.values()){clearTimeout(item.timer);item.reject(new Error('Se perdió la conexión durante la acción. Comprueba su resultado.'));}socketActions.clear();nextPulse=0;schedulePump(0);
 };
 // A proxy which never finishes upgrading must not leave a CONNECTING socket forever.
 setTimeout(()=>{if(gameSocket===socket&&!gameReady)socket.close();},5000);
}
function streamPump(){
 const time=Date.now(),axis=input(),hasAction=queue.length&&socketActions.size<8;
 if(gameSocket.bufferedAmount>32768){nextPulse=time+INPUT_MS;schedulePump(INPUT_MS);return;}
 if(inFlightMotion.length>=60){nextPulse=time+INPUT_MS;schedulePump(INPUT_MS);return;}
 if(time-lastMotionSend<20&&!hasAction){nextPulse=lastMotionSend+20;schedulePump(nextPulse-time);return;}
 const packet=motionPacket(axis);lastMotionSend=time;
 if(hasAction){
  const item=queue.shift(),id=nextActionId++;
  item.timer=setTimeout(()=>{if(socketActions.delete(id))item.reject(new Error('La acción no recibió respuesta. Comprueba su resultado.'));},7000);socketActions.set(id,item);
  gameSocket.send(JSON.stringify({t:'action',id,type:item.type,data:{...item.data,_motion:packet}}));
 }else gameSocket.send(JSON.stringify({t:'input',motion:packet}));
 inputDirty=false;nextPulse=time+(queue.length?20:document.hidden?250:axis.x||axis.y||pendingMotion.length?INPUT_MS:250);schedulePump(nextPulse-time);
}
function act(type,data={}){return new Promise((resolve,reject)=>{if(!session){reject(new Error('No estás en una sala.'));return;}if(queue.length>=32){reject(new Error('Hay demasiadas acciones pendientes. Espera un momento.'));return;}queue.push({type,data,resolve,reject});nextPulse=0;pump();});}
function fire(type,data={}){act(type,data).catch(e=>toast(e.message));}
function movementBlocked(checkNetwork=true){return !state||state.phase==='game'&&!!state.me.hidden||state.phase==='game'&&!!caged()||!['lobby','game','meeting'].includes(state.phase)||state.phase==='meeting'||modalKind||typing()||!$('notebookOverlay').hidden||now()<state.revealUntil||state.me.vent||state.me.transition?.until>now()||checkNetwork&&Date.now()-lastNetwork>700||touchMode&&state.phase!=='meeting'&&!$('game').classList.contains('panel-collapsed');}
function input(){if(movementBlocked())return {x:0,y:0};const keyboard={x:(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),y:(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0)};return mergeDirections(keyboard,touchMode?touchStick.getAxis():{x:0,y:0});}
function updateTouchControls(){const allowed=touchMode&&!movementBlocked(false),root=$('touchMovement');const parent=state?.phase==='meeting'?$('meetingWorld').parentElement:$('world').parentElement;if(root.parentElement!==parent){touchStick.reset();parent.appendChild(root);}touchStick.setEnabled(allowed);root.hidden=!allowed;show('mobileHint',touchMode);show('exitImmersive',!!state&&document.documentElement.classList.contains('immersive'));}

function recordMotion(axis,dt){if(!dt||!(axis.x||axis.y))return;pendingMotion.push({x:axis.x,y:axis.y,ms:dt*1000});
  // En una conexión lenta se detiene el movimiento local a los 3 s. Si la
  // cola se acerca al límite, se juntan tramos contiguos de igual dirección.
  if(pendingMotion.length>100){const compact=[];for(const step of pendingMotion){const last=compact.at(-1);if(last&&last.x===step.x&&last.y===step.y&&last.ms+step.ms<=1000)last.ms+=step.ms;else compact.push({...step});}pendingMotion=compact;}}
// La predicción usa los mismos modificadores que el servidor: zapatillas turbo
// (velocidad) y jaula (área mínima de movimiento).
const itemSpeedLocal=s=>(s.me.items?.slots?.some(x=>x?.kind==='turbo'&&x.active)?1.45:1)*((s.me.boostUntil||0)>now()?1.3:1);
const predictionMap=(s,map)=>{const c=s.me.items?.cage;return c&&c.until>now()?cageMap(map,c):map;};
function reconcilePosition(s){const {LOBBY,MEETING,mapFor}=worldFor(s);if(!['lobby','game','meeting'].includes(s.phase))return;const predicted={x:s.me.x,y:s.me.y,facing:s.me.facing},map=s.phase==='meeting'?MEETING:s.phase==='lobby'?LOBBY:s.me.alive&&s.me.expelledUntil>now()?detentionMap(mapFor(s.me.floor,blockersOf(s,now()))):predictionMap(s,mapFor(s.me.floor,blockersOf(s,now()))),ghost=s.phase!=='lobby'&&!s.me.alive;
  for(const step of [...inFlightMotion.filter(p=>p.epoch===(s.me.motionEpoch||0)).flatMap(p=>p.segments),...pendingMotion])move(map,predicted,step.x,step.y,step.ms/1000,ghost,s.config.speed*(s.phase==='game'?itemSpeedLocal(s):1));
  const error=Math.hypot(predicted.x-local.x,predicted.y-local.y);if(error>.01){localCorrection=error<100?{x:localCorrection.x+local.x-predicted.x,y:localCorrection.y+local.y-predicted.y}:{x:0,y:0};local.x=predicted.x;local.y=predicted.y;local.facing=predicted.facing;}}
// Aviso de red. Antes bastaba UN pulso fallido (un 502 puntual del proxy, una
// respuesta perdida en datos móviles) para mostrar «Reconectando», y una sola
// respuesta atascada bloqueaba el bucle 7 s. Ahora el pulso —que es idempotente
// gracias a la secuencia de movimiento— se reintenta a los 3 s y el aviso solo
// aparece si de verdad no hay respuesta del servidor durante 2,5 s seguidos.
const PULSE_TIMEOUT=3000,NETWORK_NOTICE_MS=2500;
function networkTrouble(failing){const banner=$('networkBanner');if(!failing){if(!banner.hidden){banner.hidden=true;banner.textContent='Reconectando con el servidor… Tu puesto se conserva.';}return;}if(failures>=2&&Date.now()-lastNetwork>=NETWORK_NOTICE_MS){banner.textContent='Reconectando con el servidor… Tu puesto se conserva.';banner.hidden=false;layoutNotices();}}
async function pump(){
 if(busy)return;
 if(!session){schedulePump(500);return;}
 if(gameReady&&Date.now()-lastNetwork>PULSE_TIMEOUT){
  // An apparently OPEN socket can be half-open after a mobile network change.
  // Recover through the idempotent HTTP path rather than waiting for TCP timeout.
  closeGameSocket();nextSocketAt=Date.now()+500;nextPulse=0;failures=Math.max(2,failures+1);networkTrouble(true);
 }
 connectGameSocket();
 if(Date.now()<nextPulse){schedulePump(nextPulse-Date.now());return;}
 if(gameReady&&gameSocket?.readyState===1){streamPump();return;}
 busy=true;const currentSession=session,sentAt=Date.now(),item=queue.shift(),type=item?.type||'pulse',axis=input();
 const packet=retryMotion||inFlightMotion[0]||motionPacket(axis);retryMotion=packet;
 const data={...(item?.data||axis),_motion:packet};inputDirty=false;
 try{
  const r=await request('/api/room',{...session,type,data},item?7000:PULSE_TIMEOUT);
  if(session!==currentSession)return;
  if(r.state)applyNetworkState(r.state);
  failures=0;lastNetwork=Date.now();networkTrouble(false);motionError=false;item?.resolve(r);if(r.left)resetSession();
 }catch(e){
  if(session!==currentSession)return;
  item?.reject(e);
  if(e.status===401||e.status===404||e.status===409){resetSession();$('menuError').textContent=e.message;$('joinCodeError').textContent=e.message;}
  else if(e.status===400&&/movimiento|tramo|dirección|secuencia/i.test(e.message)){
   // An empty legacy pulse obtains the actual ack; never guess a new sequence.
   pendingMotion=[];inFlightMotion=[];retryMotion=null;motionError=true;
   try{const r=await request('/api/room',{...currentSession,type:'pulse',data:{x:0,y:0}});if(session===currentSession){nextMotionSeq=(r.state.me.motionSeq||0)+1;applyNetworkState(r.state);}}catch{}
  }else if(!item){failures++;if(!e.status||e.status>=500||e.status===429)networkTrouble(true);else toast(e.message);}
 }finally{
  busy=false;const end=Date.now();nextPulse=queue.length||retryMotion&&!failures||inputDirty?end+20:failures?end+Math.min(1200,300*failures):Math.max(end+12,sentAt+pulseInterval());schedulePump(nextPulse-end);
 }
}
// Cada instantánea pesa unos 11 KB; a diez por segundo y diez jugadores son más
// de un mega por segundo de bajada en la sala. El ritmo rápido solo hace falta
// cuando el personaje puede moverse y se ve el mapa. Mientras una misión tapa
// la pantalla, en una reunión o en el vestíbulo nadie se desplaza —
// `movementBlocked` lo impide—, así que se consulta menos sin perder un ápice
// de respuesta en los controles. Las acciones no esperan: la cola fuerza el
// envío inmediato. Las cámaras conservan el ritmo rápido porque muestran vídeo.
// Al recuperar una sesión la partida se muestra antes de que llegue el primer
// estado. El lienzo seguía en su tamaño por defecto, sin dibujar, y durante dos
// o tres fotogramas se veía negro: un parpadeo al entrar. Se prepara ya con el
// fondo de la escena y a su tamaño real, y el primer dibujo lo pinta encima.
function primeWorld(){for(const id of ['world','meetingWorld']){const c=$(id);if(!c)continue;const r=c.getBoundingClientRect(),d=Math.min(1.5,window.devicePixelRatio||1);if(r.width<2||r.height<2)continue;c.width=Math.max(1,Math.round(r.width*d));c.height=Math.max(1,Math.round(r.height*d));const g=c.getContext('2d',{alpha:false});g.fillStyle='#233442';g.fillRect(0,0,c.width,c.height);}}
function pulseInterval(){
 if(!state)return 400;
 if(state.phase==='ended')return 400;
 if(state.phase==='meeting')return 200;
 if(state.phase==='lobby')return 200;
 if(modalKind==='table')return tableSocket?.readyState===1?240:70;
 if(modalKind==='task'||modalKind==='repair')return 240;
 // 14.3 · 14 pulsos/s en partida (antes ~10): las muestras de los demás llegan
 // antes y el retardo de interpolación baja. Medido: 2 salas llenas usan <0,3
 // núcleos en el servidor de 2 CPU.
 return 70;
}
schedulePump(0);
function resetSession(){closeGameSocket();inFlightMotion=[];simulationRemainder=0;localCorrection={x:0,y:0};clockReady=false;clockRtt=Infinity;nextSocketAt=0;voteCountdown.reset();meetingChat.reset();cinematicCleanup();touchStick.reset();document.documentElement.classList.remove('immersive');session=null;state=null;document.documentElement.classList.remove('club-mode');setSceneMode('menu');syncViewport();inputDirty=false;pendingMotion=[];retryMotion=null;nextMotionSeq=1;motionError=false;cancelAnimationFrame(expulsionFrame);clearTimeout(fxTimer);show('actionFx',false);if(nativeFullscreen()){const exit=document.exitFullscreen||document.webkitExitFullscreen;if(exit)Promise.resolve(exit.call(document)).catch(()=>{});}sessionStorage.removeItem('sanagus.session');queue.forEach(q=>q.reject(new Error('Has salido de la sala.')));queue=[];keys.clear();closeModal(false);for(const id of ['journeyOverlay','finaleOverlay','game','roleOverlay','meetingOverlay','endOverlay','mapOverlay','networkBanner'])show(id,false);show('menu',true);show('appHeader',true);show('notebookOverlay',false);voteSelection=null;voteKind='normal';sigs={};refreshRooms();}
// Desglose de experiencia: solo existe al terminar la partida. La barra anima
// del progreso anterior al nuevo y avisa si hay recompensas por recoger.
function renderAward(a){const box=$('endXp');if(!a){box.hidden=true;box.innerHTML='';return;}const before=levelOf(a.before),after=levelOf(a.after),up=after.level>before.level;box.hidden=false;
 box.innerHTML=`<header><span>EXPERIENCIA DEL PASE</span><b>+${a.total} XP</b></header><ul>${a.rows.map(r=>`<li class="${r.xp<0?'minus':''}"><span>${esc(r.label)}${r.count>1||['tasks','voteRight','voteWrong','repairs','kills'].includes(r.id)?` <small>${r.count}×</small>`:''}</span><b>${r.xp>0?'+':''}${r.xp}</b></li>`).join('')}${a.capped?`<li class="cap"><span>Límite por partida (medio nivel)</span><b>${a.total-a.raw}</b></li>`:''}<li class="total"><span>Total</span><b>+${a.total} XP</b></li></ul><div class="end-xp-bar"><span>Nivel ${after.level}</span><i><i style="width:${up?0:(before.into/LEVEL_XP)*100}%"></i></i><small>${after.max?'Pase completado':`${after.into} / ${LEVEL_XP}`}</small></div>${up?`<p class="end-xp-up">¡Nivel ${after.level} alcanzado! Recoge tu recompensa en el Pase de temporada.</p>`:''}`;
 requestAnimationFrame(()=>requestAnimationFrame(()=>{const fill=box.querySelector('.end-xp-bar i i');if(fill)fill.style.width=`${(after.into/LEVEL_XP)*100}%`;}));}
// Fotografía del último fotograma de la sala de espera: el viaje arranca
// exactamente desde ella (misma cámara, mismas posiciones) y se aleja sin saltos.
let lobbyShot=null;
// 15.0 · Solo la caravana, su interior y los personajes (fondo transparente):
// al alejarse la cámara ya no se arrastra un cuadrado del paisaje exterior.
function captureLobby(gameNumber){try{const src=$('world'),r=src.getBoundingClientRect();if(!src.width||!r.width)return;const img=document.createElement('canvas');img.width=src.width;img.height=src.height;img.__box={w:r.width,h:r.height};
 try{drawWorld(img,{...state,interiorOnly:true},{...local,input:{x:0,y:0}},rendered,{...cam},0,performance.now());}catch{img.getContext('2d').drawImage(src,0,0);}
 lobbyShot={game:gameNumber,img,rect:{x:r.left,y:r.top,w:r.width,h:r.height}};}catch{lobbyShot=null;}}
function accept(s){if(state?.phase==='lobby'&&s.phase==='game')captureLobby(s.gameNumber);if(s.me?.passToken&&s.me.passToken!==passToken)storePass(s.me.passToken);$('joinCodeScreen').hidden=true;arrival.finish();setSceneMode('game');closeRooms();show('appHeader',false);const prev=state,phaseChanged=!prev||prev.phase!==s.phase,newGame=!prev||prev.gameNumber!==s.gameNumber,relocated=prev&&(prev.me.motionEpoch!==s.me.motionEpoch||prev.me.floor!==s.me.floor||prev.me.vent!==s.me.vent||prev.me.transition?.at!==s.me.transition?.at&&s.me.transition);state=s;state.reducedEffects=reducedEffects;state.debugVision=visionDebug;if(!prev||prev.phase!==s.phase)syncViewport();if(touchMode&&!prev||phaseChanged&&s.phase==='game'){$('game').classList.add('panel-collapsed');$('sidebarToggle').textContent='Panel';}s.receivedAt=Date.now();lastNetwork=Date.now();show('menu',false);show('game',true);$('roomCode').textContent=s.code;
  if(!prev||phaseChanged||newGame){setMeetingChat(false);touchStick.reset();votePending=false;voteSelection=null;voteKind='normal';show('notebookOverlay',false);local={x:s.me.x,y:s.me.y,facing:s.me.facing};pendingMotion=[];simulationRemainder=0;localCorrection={x:0,y:0};cam={x:local.x,y:local.y};rendered=new Map();remoteSamples=new Map();keys.clear();closeModal(false);if(s.phase==='meeting'&&(!s.meeting.introUntil||now()<s.meeting.introUntil))playActionFx(s.meeting?.reason==='body'?'report':'meeting',s);if(s.phase==='ended')cue(s.result?.winner===(s.me.role==='impostor'?'impostor':'crew')?'win':'lose');sigs={};}
  else if(relocated){touchStick.reset();local={x:s.me.x,y:s.me.y,facing:s.me.facing};pendingMotion=[];simulationRemainder=0;localCorrection={x:0,y:0};cam={x:local.x,y:local.y};rendered=new Map();remoteSamples=new Map();keys.clear();}
  else if(!local.input?.x&&!local.input?.y)local.facing=s.me.facing;
  const present=new Set(),arrivedAt=now();for(const p of [...s.players,...(s.teachers||[]),...(s.wildlife||[]),...(s.me.items?.decoys||[])]){if(p.id===s.me.id)continue;present.add(p.id);remoteSamples.set(p.id,recordRemoteSample(remoteSamples.get(p.id),p,s.serverTime,arrivedAt));}for(const id of remoteSamples.keys())if(!present.has(id))remoteSamples.delete(id);
  if(s.phase==='game'&&s.sabotage&&['doors','vip'].includes(s.sabotage.kind)&&JSON.stringify(prev?.sabotage?.closed)!==JSON.stringify(s.sabotage.closed)){const doors=worldFor(s).DOORS.filter(d=>(s.sabotage.doorIds||s.sabotage.closed).includes(d.id));if(doors.some(d=>distance(local,{x:(d.x+d.w/2)*56,y:(d.y+d.h/2)*56})<280)){tone(175,.17,'triangle',.025);setTimeout(()=>tone(125,.11,'triangle',.02),120);}}
  if(s.sabotage&&s.sabotage.started!==prev?.sabotage?.started)cue('sabotage');else if(prev?.sabotage&&!s.sabotage&&s.phase==='game')cue('repair');
  if(prev?.me.vent&&!s.me.vent&&prev.me.ventSince&&now()-prev.me.ventSince>=10000)toast('Has salido de la alcantarilla al agotarse los 10 segundos.');
  if(s.actionFx?.id&&s.actionFx.id!==lastActionFxId){lastActionFxId=s.actionFx.id;if(s.actionFx.kind==='miss'){if(s.actionFx.actor===s.me.id){toast('¡Ha esquivado tu ataque! Espera para volver a intentarlo.');tone(220,.18,'square',.03);}else playActionFx('miss',s);}else if(s.actionFx.target===s.me.id)playActionFx('kill',s);}
  const death=s.deathNotices?.at(-1);if(death&&death.id!==lastDeathNoticeId){lastDeathNoticeId=death.id;if(now()-death.time<9000)roleNotice(`${worldFor(s).roleNames?.plug||'EL ENCHUFE'} · ${death.name} ha muerto.`);}
  const spirit=s.spiritMessages?.at(-1);if(spirit&&spirit.id!==lastSpiritNoticeId){lastSpiritNoticeId=spirit.id;if(s.me.specialRole==='believer'&&now()-spirit.time<9000)roleNotice(`MENSAJE DEL MÁS ALLÁ · ${spirit.from}: ${spirit.emoji}${spirit.color!=null?` (${COLOR_NAMES[spirit.color]})`:''}`);}
  if((!prev?.me.expelledUntil||prev.me.expelledUntil<=now())&&s.me.expelledUntil>now())roleNotice('UN PROFESOR TE HA PILLADO · 30 s en Expulsados');
  if(prev?.me.alive&&!s.me.alive){cue('death');toast('Has perdido la señal. Eres un espectro: puedes seguir haciendo tareas.');closeModal(false);}
  if(s.phase==='game'&&(newGame||prev?.me.role!==s.me.role)){const imp=s.me.role==='impostor';$('roleOverlay').classList.toggle('impostor',imp&&!!s.me.role);$('roleOverlay').classList.toggle('identity-pending',!s.me.role);{const cat=imp?'IMPOSTOR':s.me.familyName&&!s.me.specialRole?'':worldFor(s).id==='house'?'':worldFor(s).crewLabel?.toUpperCase()||'TRIPULANTE',sp=s.me.specialRole?specialFor(s)[s.me.specialRole][0]:s.me.familyName||'',h=$('revealRole');h.replaceChildren();const a=document.createElement('span');a.className='rr-cat';a.textContent=sp&&cat?cat+' ·':cat;if(cat)h.append(a);if(sp){const b=document.createElement('span');b.className='rr-role';b.textContent=sp.toUpperCase();h.append(b);}h.setAttribute('aria-label',[cat,sp].filter(Boolean).join(' '));}$('revealCopy').textContent=imp?(s.me.specialRole?specialFor(s)[s.me.specialRole][1]:'Sabotea la misión. Elimina a la tripulación sin que descubran tu identidad.'):s.me.specialRole?specialFor(s)[s.me.specialRole][1]:'Completa tus tareas y descubre quién está saboteando la misión.';drawAvatar($('roleAvatar'),s.me,performance.now());}
  if(s.sabotage?.kind==='bell'&&mapMode==='normal')closeMap();
  if(modalKind==='table'){if(s.phase!=='lobby'||!s.table)closeModal(false);else if(tableSocket?.readyState!==1||performance.now()-tableSocketAt>600)tableGame?.update(s.table);}
  if(modalKind==='vent'){if(s.me.vent)renderVentPanel();else closeModal(false);}
  if(modalKind==='repair'&&!s.sabotage)closeModal(false);if(modalKind==='camera'&&(!s.cameraFeed||s.phase!=='game'))closeModal(false);
  if(phaseChanged||newGame||Date.now()-lastStateUi>=100){lastStateUi=Date.now();updateUI();}
}
function changed(key,value){const sig=JSON.stringify(value);if(sigs[key]===sig)return false;sigs[key]=sig;return true;}
function syncSettings(){const writable=state.host===state.me.id&&state.phase==='lobby';for(const el of document.querySelectorAll('[data-setting]')){const v=state.config[el.dataset.setting];if(!(writable&&document.activeElement===el)){if(el.type==='checkbox')el.checked=v;else el.value=v;}el.disabled=!writable||(worldFor(state).FLOORS.length===1&&el.dataset.setting==='floors');}for(const el of document.querySelectorAll('[data-bot]'))el.disabled=!writable||(el.dataset.bot==='removeBot'?!state.roster.some(p=>p.bot):state.roster.length>=10);if($('botStatus'))$('botStatus').textContent=state.roster.filter(p=>p.bot).length+' bots · '+state.roster.length+' / 10 plazas';}
function updateUI(){const {LOBBY,FLOORS,taskStation}=worldFor(state);if(!state)return;const s=state,host=s.host===s.me.id,lobby=s.phase==='lobby',imp=s.me.role==='impostor';syncSettings();renderInventory();itemEvents(s);if(modalKind==='portable'&&!s.me.items?.watching&&Date.now()-portableAt>1500)closeModal(false);gameSelects.refresh();show('missionHud',s.phase==='game');$('hudRole').textContent='Tareas completadas';$('hudProgress').textContent=s.progress.blocked?'Sin señal':'';$('hudProgressFill').style.width=`${!s.progress.blocked&&s.progress.total?s.progress.done/s.progress.total*100:0}%`;if(changed('hudTasks',[s.me.tasks,s.progress.blocked,imp])){$('hudTasks').innerHTML=s.progress.blocked?'<p>⚡ Repara las comunicaciones.</p>':imp?'<p>Sabotea y evita las sospechas.</p>':s.me.tasks.filter(t=>!t.done).slice(0,2).map(t=>`<p><b>◆</b> ${esc(taskStation(t).label)}</p>`).join('')||'<p>✓ Tus tareas están terminadas.</p>';}
  $('phaseLabel').textContent=lobby?'CARAVANA':s.phase==='meeting'?'REUNIÓN EN CURSO':s.phase==='ended'?'PARTIDA FINALIZADA':!s.me.alive?'MODO ESPECTRO':imp?'MISIÓN ENCUBIERTA':'PARTIDA EN CURSO';$('zoneName').textContent=lobby?LOBBY.name:FLOORS[s.me.floor].name;$('canvasTag').textContent=lobby?LOBBY.name.toUpperCase():`PUCELA US · ${worldFor(s).name.toUpperCase()}`;document.documentElement.classList.toggle('club-mode',s.config.map==='club');show('lobbyPanel',lobby);show('tasksPanel',!lobby);
  if(lobby){if(changed('roster',s.roster))$('roster').innerHTML=s.roster.map(p=>`<div class="roster-row ${p.online?'':'offline'}">${robotSVG(p)}<span>${nameHtml(esc(p.name),p.nameBg,p.nameColor)}${p.bot?' · BOT':''}${p.id===s.me.id?' · tú':''}</span><small>${p.isHost?'LÍDER':p.online?'●':'…'}</small></div>`).join('');$('playerCount').textContent=`${s.roster.length} / 10`;$('hostLabel').textContent=host?'TÚ DECIDES':'SOLO EL LÍDER';const min=s.config.impostors*3+1;$('startBtn').disabled=!host||s.roster.length<min||s.roster.some(p=>!p.online);$('departureBtn').disabled=$('startBtn').disabled;$('departureBtn').textContent=host?'Salir de viaje →':'Esperando al líder…';$('startBtn').textContent=host?'Iniciar partida →':'Esperando al líder…';$('startHint').textContent=s.roster.length<min?`Faltan ${min-s.roster.length} jugadores. Comparte el código.`:host?'Todo listo. Puedes iniciar la partida.':'El líder iniciará la partida.';}
  else{$('roleLabel').textContent=imp?(s.me.specialRole?`Impostor · ${specialFor(s)[s.me.specialRole][0]}`:s.me.familyName?`Impostor · ${s.me.familyName}`:'Impostor'):s.me.specialRole?(worldFor(s).id==='house'?specialFor(s)[s.me.specialRole][0]:`${worldFor(s).crewLabel||'Tripulante'} · ${specialFor(s)[s.me.specialRole][0]}`):s.me.familyName||worldFor(s).crewLabel||'Tripulante';$('roleLabel').style.color=imp?'var(--red)':'var(--mint)';$('aliveLabel').textContent=s.me.alive?(s.config.map==='club'?'PERSONAL':'A BORDO'):'ESPECTRO';$('objective').textContent=imp?`Confúndete con el equipo. Elimina a los tripulantes o sabotea ${worldFor(s).name}.`:'Termina tus tareas y expulsa a los impostores. Puedes hacer tareas como espectro.';$('progressText').textContent=s.progress.blocked?'Sin señal':'';$('progressFill').style.width=`${!s.progress.blocked&&s.progress.total?s.progress.done/s.progress.total*100:0}%`;
    if(changed('tasks',[s.me.tasks,imp,s.progress.blocked]))$('taskList').innerHTML=s.progress.blocked?'<p class="small-note">⚡ Registro de tareas sin señal. Repara las comunicaciones.</p>':(imp?'<p class="small-note">TAREAS DE COBERTURA</p>':'')+s.me.tasks.map(t=>{const st=taskStation(t),r=FLOORS[st.floor].rooms.find(r=>r.id===st.room);return `<div class="task-row ${t.done?'done':''}"><span>${t.done?'✓':'◆'}</span><div>${st.label}<small>${r.name}${t.stage===1?' · LLEVAS DOCUMENTOS':''}</small></div></div>`;}).join('');$('missionNotice').textContent=!s.me.alive?(imp?'Observa el desenlace. Los espectros no pueden matar ni sabotear.':'Tu equipo sigue contando contigo. Las tareas de los espectros también suman.'):imp?'Tu rol solo lo conocéis tú y los demás impostores. Las tareas de cobertura no suman progreso.':`El botón de reunión está en ${worldFor(s).FLOORS.length===1?worldFor(s).emergencyRoom:s.config.floors==='1'?'Profesores (P1)':'Recepción (P0)'}. Cada jugador dispone de una.`;
    if(changed('events',s.events))$('eventLog').innerHTML=s.events.slice(-5).reverse().map(e=>`<p>${esc(e.text)}</p>`).join('');}
  if(modalKind==='vent')renderVentPanel();
  show('sideChat',lobby||(!s.me.alive&&s.phase==='game'));$('chatTitle').textContent=lobby?'Radio de la caravana':'Radio de espectros';renderMessages('sideMessages',s.chat.filter(m=>lobby||m.ghost));renderSpiritChoices();
  const meeting=s.phase==='meeting';if(!meeting){voteSelection=null;voteKind='normal';}show('meetingOverlay',meeting);if(meeting)renderMeeting(s);
  show('endOverlay',s.phase==='ended');show('finaleOverlay',s.phase==='ended'&&now()<s.result.time+4200);if(s.phase==='ended'&&changed('xp',[s.result?.time,s.me.award?.total]))renderAward(s.me.award);if(s.phase==='ended'&&changed('end',[s.result,s.roster,s.host])){const crew=s.result.winner==='crew';$('endOverlay').classList.toggle('your-victory',s.result.winner===(s.me.role==='impostor'?'impostor':'crew'));$('endTitle').textContent=(s.result.winner===(s.me.role==='impostor'?'impostor':'crew')?'VICTORIA':'DERROTA')+(crew?' · EQUIPO TRIPULANTE':' · IMPOSTORES');$('endTitle').style.color=crew?'var(--mint)':'var(--red)';$('endReason').textContent=s.result.reason;$('endRoster').innerHTML=s.roster.map(p=>`<div class="end-player ${p.role==='impostor'?'impostor':''} ${p.role===(crew?'crew':'impostor')?'winner':'defeated'}">${robotSVG(p)}<span>${nameHtml(esc(p.name),p.nameBg,p.nameColor)}</span><small>${p.role==='impostor'?(p.specialRole?`IMPOSTOR · ${specialFor(s)[p.specialRole][0]}`:'IMPOSTOR'):p.specialRole?`TRIPULANTE · ${specialFor(s)[p.specialRole][0]}`:'TRIPULANTE'}</small><small>${p.stats?.tasks||0} tareas · ${p.stats?.kills||0} eliminaciones · ${p.stats?.reports||0} reportes</small></div>`).join('');$('returnBtn').disabled=!host;$('returnHint').textContent=host?'Todos volveréis juntos a la sala de espera.':'El líder puede devolver al equipo a la sala de espera.';}
  $('footerHint').textContent=lobby?'Comparte el código. El líder decide cuándo salir.':!s.me.alive?'Atraviesa las paredes y completa tus tareas.':imp?'Q matar · V alcantarillas · ⚡ sabotajes · R denunciar':s.me.specialRole==='nerd'?'N libreta · E tareas · R denunciar':s.me.specialRole==='engineer'?'V alcantarillas · E tareas · R denunciar':'E tareas, escaleras y reunión · R denunciar';
  updateClocks();
}
function renderMessages(id,messages){if(id==='meetingMessages'){meetingChat.update(messages,{roster:state.roster,viewer:state.me,channel:state.code+':'+state.gameNumber+':'+state.meeting?.id+':'+state.me.alive});return;}if(!changed(id,messages))return;const el=$(id),bottom=el.scrollHeight-el.scrollTop-el.clientHeight<45;el.innerHTML=messages.map(m=>`<div class="message ${m.ghost?'ghost':''} ${id==='meetingMessages'&&state?.me.role==='impostor'&&m.playerId===state.me.id?'impostor-self':''}" style="--sender:${(m.color===10?'#c5cddd':COLORS[m.color])}"><strong>${esc(m.name)}${m.ghost?' · espectro':''}</strong>${esc(m.text)}</div>`).join('');if(bottom)el.scrollTop=el.scrollHeight;}
function playExpulsion(s){show('notebookOverlay',false);closeModal(false);$('meetingOverlay').scrollTop=0;$('meetingOverlay').querySelector('.meeting-card').scrollTop=0;cancelAnimationFrame(expulsionFrame);const m=s.meeting,r=m.result,subject=r.expelled,el=$('voteResult');const verdict=subject?`${subject.name} ha sido expulsado.`:'NADIE HA SIDO EXPULSADO';const identity=subject?(subject.role?`${subject.name} ${subject.role==='impostor'?'era un impostor.':'era tripulante.'}${r.remainingImpostors!==null&&r.remainingImpostors!==undefined?' Quedan '+r.remainingImpostors+' impostor(es).':''}`:'Su identidad sigue oculta.'):`El equipo de ${worldFor(s).name} continúa.`;el.innerHTML=`<div class="expulsion-scene">${terraceMarkup(subject,s.config.map)}<h2 class="expulsion-verdict" aria-live="polite"></h2><p class="expulsion-identity" aria-live="polite"></p></div>`;const reduced=reducedEffects;const started=performance.now()-Math.max(0,now()-(m.tallyUntil||m.resultUntil-9500));let typed=-1,identified=-1,kicked=false;function animate(t){if(!state||state.phase!=='meeting'||state.meeting?.id!==m.id||state.meeting.stage!=='result')return;const elapsed=t-started;animateTerrace(el,reduced?3600:elapsed);if(subject&&!reduced&&!kicked&&elapsed>=1400&&elapsed<1800){kicked=true;tone(110,.12,'triangle',.035);}const v=reduced?verdict.length:Math.min(verdict.length,Math.max(0,Math.floor((elapsed-650)/56))),i=reduced?identity.length:Math.min(identity.length,Math.max(0,Math.floor((elapsed-3700)/53)));if(v!==typed){el.querySelector('.expulsion-verdict').textContent=verdict.slice(0,v);if(v>typed&&v%2===0)tone(370+(v%5)*45,.025,'square',.012);typed=v;}if(i!==identified){el.querySelector('.expulsion-identity').textContent=identity.slice(0,i);if(i>identified&&i%2===0)tone(340+(i%4)*36,.022,'square',.009);identified=i;}if(i<identity.length||elapsed<7700)expulsionFrame=requestAnimationFrame(animate);}expulsionFrame=requestAnimationFrame(animate);}
function setMeetingChat(open){$('meetingOverlay').classList.toggle('chat-open',open);$('meetingChatBtn').setAttribute('aria-expanded',String(open));if(open){keys.clear();touchStick.reset();meetingChat.reveal();}else if(state?.phase==='meeting')$('meetingCards').focus({preventScroll:true});}
$('meetingChatBtn').addEventListener('click',()=>setMeetingChat(!$('meetingOverlay').classList.contains('chat-open')));
$('closeMeetingChat').addEventListener('click',()=>setMeetingChat(false));
function updateMeetingPresentation(s){
 const m=s.meeting,expelling=m.stage==='result'&&now()>=(m.tallyUntil||0);$('meetingOverlay').classList.toggle('result-mode',expelling);$('meetingOverlay').classList.toggle('tally-mode',m.stage==='result'&&!expelling);show('voteResult',expelling);
 if(expelling&&changed('expulsionScene',m.id)){setMeetingChat(false);playExpulsion(s);}
}
function renderMeeting(s){const mutedNow=!!(s.me.muted&&s.me.alive);for(const id of ['meetingChatInput'])if($(id)){$(id).disabled=mutedNow;$(id).placeholder=mutedNow?'🔇 Estás silenciado: no puedes hablar en las reuniones':'¿Qué has visto?';}document.getElementById('quickChat')?.classList.toggle('is-muted',mutedNow);const m=s.meeting,canVote=m.stage==='voting'&&now()<m.voteEnd&&s.me.alive&&m.myVote===null&&!votePending;
 if(!canVote){voteSelection=null;voteKind='normal';}else if(voteSelection&&voteSelection!=='skip'&&!s.roster.some(p=>p.id===voteSelection&&p.alive))voteSelection=null;
 $('meetingControlsHint').textContent=m.stage==='discussion'?'TIEMPO DE DISCUSIÓN':m.stage==='voting'?'ELIGE Y CONFIRMA TU VOTO':'RECUENTO DE VOTOS';$('meetingCaller').textContent=`${m.reason==='body'?'Reportó':'Convocó'}: ${m.caller}`;show('meetingNotebookBtn',s.me.specialRole==='nerd');$('meetingTitle').textContent=m.stage==='result'?'RESULTADOS DE LA VOTACIÓN':'¿QUIÉN ES EL IMPOSTOR?';$('meetingSubtitle').textContent=m.reason==='body'?`${m.caller} encontró a ${m.body}.`:`${m.caller} ha convocado al equipo.`;
 updateMeetingCards($('meetingCards'),s,voteSelection,votePending);quickChat.update();
 show('voteConfirm',!!voteSelection&&canVote);$('selectedVoteName').textContent=voteSelection==='skip'?'¿Omitir tu voto?':voteSelection?`¿Votar a ${s.roster.find(p=>p.id===voteSelection)?.name||'este jugador'}?`:'';
 const decisive=!!voteSelection&&voteSelection!=='skip'&&canVote&&s.me.specialRole==='delegate'&&!s.me.delegateUsed&&voteSelection!==s.me.id;show('delegateBtn',decisive);show('voteNormalBtn',decisive);$('delegateBtn').classList.toggle('armed',voteKind==='decisive');$('voteNormalBtn').classList.toggle('armed',voteKind==='normal');$('skipBtn').disabled=!canVote;$('skipBtn').classList.toggle('armed',voteSelection==='skip');
 $('voteHint').textContent=m.stage==='result'?m.result.reason:!s.me.alive?'CHAT DE ESPECTROS · los vivos no pueden leerte.':votePending?'Registrando voto…':m.myVote!==null?'✓ VOTO REGISTRADO · esperando al equipo.':m.stage==='discussion'?'Compartid pistas. Podrás votar al finalizar la discusión.':voteSelection&&voteKind==='decisive'?'VOTO DECISIVO: si fallas, te expulsan a ti. Confirma con ✓.':voteSelection?'✓ confirma tu elección · × cancela.':'Selecciona una tarjeta y confirma tu elección.';
 show('ghostChannel',!s.me.alive);$('meetingChatInput').placeholder=s.me.alive?'¿Qué has visto?':'Solo te leerán los espectros…';renderMessages('meetingMessages',s.chat);renderSpiritChoices();show('skipTally',m.stage==='result');
 if(m.stage==='result'&&changed('tally',[m.id,m.result])){setMeetingChat(false);const total=Object.values(m.result.counts).reduce((a,b)=>a+b,0),skip=m.result.counts.skip||0;$('skipTally').innerHTML=skip?`<b>SKIP</b><span>${voteIcons(skip,{start:total-skip,elapsed:Math.max(0,now()-m.resultAt)})}</span>`:'';for(let i=0;i<total;i++){const wait=m.resultAt+i*180-now();if(wait>=0)setTimeout(()=>{if(state?.meeting?.id===m.id&&now()<(m.tallyUntil||0))tone(520,.07,'triangle',.025);},wait);}}

 updateMeetingPresentation(s);
}
function renderSpiritChoices(){if(!state)return;const active=!state.me.alive&&['game','meeting'].includes(state.phase)&&state.spiritEmojis?.length===4,remaining=Math.max(0,Math.ceil((state.me.spiritReady-now())/1000)),enabled=state.believerAlive&&!remaining;for(const id of ['spiritChoices','meetingSpiritChoices']){const visible=active&&(id==='meetingSpiritChoices')===(state.phase==='meeting');show(id,visible);if(!visible)continue;const status=!state.believerAlive?'no hay creyente vivo':remaining?`recarga ${remaining} s`:'elige una señal';if(changed(id,[state.spiritEmojis,state.spiritColors,status]))$(id).innerHTML=`<small>SEÑAL AL CREYENTE · ${status}</small>${state.spiritEmojis.map((emoji,i)=>{const ci=state.spiritColors?.[i],col=ci!=null?COLORS[ci]:null,name=ci!=null?COLOR_NAMES[ci]:'';return `<button type="button" class="spirit-btn" data-spirit="${esc(emoji)}" ${enabled?'':'disabled'} title="Pulsa ${i+1} para enviar ${esc(emoji)}${name?` · ${name}`:''}" ${col?`style="--spirit:${col}"`:''}><kbd>${i+1}</kbd><span class="spirit-chip">${esc(emoji)}</span>${name?`<em>${name}</em>`:''}</button>`;}).join('')}`;}}
function roleNotice(text){$('roleNotice').textContent=text;show('roleNotice',true);clearTimeout(roleNoticeTimer);roleNoticeTimer=setTimeout(()=>show('roleNotice',false),4300);}

const disembark=mountDisembark($('disembarkCanvas'));let boardingOff=0;
function setBoarding(intro){const o=$('roleOverlay');if(intro){clearTimeout(boardingOff);o.classList.add('boarding');disembark.start(()=>state&&state.intro?{roster:state.roster,meId:state.me.id,now:now(),since:state.intro.neutralAt}:null);}else if(o.classList.contains('boarding')){o.classList.remove('boarding');boardingOff=setTimeout(()=>disembark.stop(),800);}}
// 16.2 · Panel de roles de espectro: Espíritu Veloz, Segunda Oportunidad y Mensajero Espectral.
const GHOST_NAMES={swift:'Espíritu Veloz',second:'Segunda Oportunidad',messenger:'Mensajero Espectral'};
const ghostPanel=document.createElement('div');ghostPanel.id='ghostPanel';ghostPanel.className='ghost-panel';ghostPanel.hidden=true;document.body.appendChild(ghostPanel);let ghostSig='';
ghostPanel.addEventListener('click',e=>{const b=e.target.closest('[data-ghost]');if(!b)return;const kind=b.dataset.ghost;if(kind==='send'){const input=ghostPanel.querySelector('input');const text=input?.value.trim();if(!text)return;act('ghostMessage',{text}).then(()=>{toast('Mensaje enviado a tus cómplices.');ghostSig='';}).catch(err=>toast(err.message));return;}act(kind,{target:b.dataset.target}).then(()=>{toast(kind==='ghostBoost'?'Impulso enviado: correrá más durante 5 s.':'Has dado una vida extra.');ghostSig='';}).catch(err=>toast(err.message));});
ghostPanel.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();ghostPanel.querySelector('[data-ghost="send"]')?.click();}e.stopPropagation();});
const GHOST_HELP={swift:'Al morir podrás dar a alguien vivo un impulso de velocidad de 5 s (una vez).',second:'Al morir tendrás 20 s para dar una vida extra a alguien vivo.',messenger:'Al morir podrás enviar mensajes breves a tus cómplices vivos cada 30 s.'};
let lifeSeen=false;function syncGhostRoleInfo(){const el=$('ghostRoleInfo');if(!el)return;const s=state,on=s?.phase==='game'||s?.phase==='meeting',r=on?s.me.ghostRole:null,life=on&&s.me.alive&&s.me.extraLife;if(life&&!lifeSeen)toast('❤️ Un espíritu te ha dado una vida extra.');lifeSeen=!!life;el.hidden=!r&&!life;if(r||life){const html=(r?`<b>👻 Rol de espectro: ${GHOST_NAMES[r]}</b><small>${GHOST_HELP[r]}</small>`:'')+(life?'<b>❤️ Tienes una vida extra (secreta)</b>':'');if(el.innerHTML!==html)el.innerHTML=html;}}
function syncGhostPanel(){syncGhostRoleInfo();const s=state,t=now();if(!s||!['game','meeting'].includes(s.phase)){ghostPanel.hidden=true;ghostSig='';return;}const me=s.me,living=(s.roster||[]).filter(p=>p.alive&&p.id!==me.id);let html='',sig='';
 if(me.alive){if(me.ghostRole&&s.phase==='game'&&t<(s.revealUntil||0)){sig='role'+me.ghostRole;html=`<div class="ghost-badge subtle">👻 Al morir: ${GHOST_NAMES[me.ghostRole]}</div>`;}}
 else if(me.ghostRole==='swift'&&!me.ghostUsed&&s.phase==='game'){sig='swift'+living.map(p=>p.id).join();html=`<b>${GHOST_NAMES.swift}</b><small>Elige a quién dar un impulso de velocidad de 5 s (una vez).</small><div class="ghost-list">${living.map(p=>`<button type="button" data-ghost="ghostBoost" data-target="${esc(p.id)}">${esc(p.name)}</button>`).join('')}</div>`;}
 else if(me.ghostRole==='second'&&!me.ghostUsed&&t<(me.secondUntil||0)){const left=Math.ceil((me.secondUntil-t)/1000);sig='second'+left+living.map(p=>p.id).join();html=`<b>${GHOST_NAMES.second} · ${left} s</b><small>Da una vida extra a alguien vivo. Si no eliges, se pierde.</small><div class="ghost-timer"><i style="width:${Math.max(0,Math.min(100,(me.secondUntil-t)/200))}%"></i></div><div class="ghost-list">${living.map(p=>`<button type="button" data-ghost="secondChance" data-target="${esc(p.id)}">${esc(p.name)}</button>`).join('')}</div>`;}
 else if(me.ghostRole==='messenger'&&s.phase==='game'){if(!me.impostorAllyAlive){sig='m-off';html=`<b>${GHOST_NAMES.messenger}</b><small>No queda ningún cómplice vivo.</small>`;}else{const wait=Math.max(0,Math.ceil(((me.ghostMsgReady||0)-t)/1000));sig='m'+(wait>0?wait:'ready');html=`<b>${GHOST_NAMES.messenger}</b><small>${wait?`Siguiente mensaje en ${wait} s`:'Tus cómplices vivos te verán con el mensaje sobre la cabeza.'}</small>${wait?'':'<div class="ghost-send"><input maxlength="48" placeholder="Mensaje breve…" aria-label="Mensaje espectral"><button type="button" data-ghost="send">Enviar</button></div>'}`;}}
 if(!html){ghostPanel.hidden=true;ghostSig='';return;}ghostPanel.hidden=false;if(sig!==ghostSig){const keep=ghostPanel.querySelector('input')?.value||'';ghostPanel.innerHTML=html;const inp=ghostPanel.querySelector('input');if(inp)inp.value=keep;ghostSig=sig;}ghostPanel.classList.toggle('compact',me.alive);}
const mechBanner=document.createElement('div');mechBanner.id='mechBanner';mechBanner.className='mech-banner';mechBanner.hidden=true;document.body.appendChild(mechBanner);let mechSig='';
function syncMechBanner(){const s=state,t=now();let html='',sig='';if(s?.phase==='game'){if(s.me.hidden){const left=Math.max(0,Math.ceil((s.me.hidden.until-t)/1000));sig='h'+left;html=`🫥 Escondido · ${left} s · <kbd>E</kbd> para salir · usos ${s.me.hideUses}/3`;}else if(s.mech?.event){sig='e'+s.mech.event.id;html=`<span style="--tint:${s.mech.event.tint||'#fff'}">♪</span> ${esc(s.mech.event.label)}`;}}
 if(!html){mechBanner.hidden=true;mechSig='';return;}mechBanner.hidden=false;if(sig!==mechSig){if(sig[0]==='e'&&mechSig[0]!=='e'){const k=s.mech.event.kind;try{tone(k==='music'?392:k==='activity'?880:660,.18,k==='music'?'sawtooth':'sine',.05);setTimeout(()=>tone(k==='music'?523:k==='activity'?988:494,.22,k==='music'?'sawtooth':'sine',.05),180);}catch{}}mechBanner.innerHTML=html;mechSig=sig;}}
function updateClocks(){syncGhostPanel();syncMechBanner();voteCountdown.update(state,now());const {REPAIRS,SABOTAGES}=worldFor(state);if(!state)return;const s=state,t=now();if(modalKind==='emergency'&&$('pressEmergency')){const left=Math.max(0,Math.ceil(((s.emergencyReady||0)-t)/1000)),blocked=!!s.sabotage,used=s.me.emergencies<1;$('pressEmergency').disabled=!!(left||blocked||used);$('emergencyStatus').textContent=blocked?'BLOQUEADO / REPARA EL SABOTAJE':left?'RECARGA / '+left+' s':used?'YA HAS UTILIZADO TU REUNIÓN':'PULSA EL BOTÓN PARA REUNIR AL EQUIPO';}const intro=s.intro,travel=s.phase==='game'&&(intro?intro.stage==='travel':t<(s.travelUntil||0)),role=s.phase==='game'&&(intro?['neutral','reveal','reading'].includes(intro.stage):t>=(s.travelUntil||0)&&t<s.revealUntil);show('journeyOverlay',travel);show('roleOverlay',role);setBoarding(role&&intro?.stage==='neutral'?intro:null);if(role){const revealed=!!s.me.role&&(intro?['reveal','reading'].includes(intro.stage):t>=(s.roleRevealAt||s.revealUntil-6000));$('roleOverlay').classList.toggle('show-identity',revealed);if(revealed&&lastRoleTone!==s.gameNumber){lastRoleTone=s.gameNumber;cue(s.me.role==='impostor'?'impostor-reveal':'reveal');}const readEnd=intro?.readEnd||intro?.ownRoleShownAt+8000||s.revealUntil;$('revealCountdown').textContent=intro&&!intro.ownRoleShownAt?'TU IDENTIDAD ESTÁ A PUNTO DE REVELARSE':readEnd>t&&readEnd<Number.MAX_SAFE_INTEGER?`LEE TU ROL · ${Math.max(0,Math.ceil((readEnd-t)/1000))} s`:'ESPERANDO A QUE EL EQUIPO ESTÉ LISTO';}
  if(s.meeting&&s.phase==='meeting'){const m=s.meeting,end=m.stage==='discussion'?m.discussionEnd:m.stage==='voting'?m.voteEnd:m.resultUntil;$('meetingTime').textContent=Math.max(0,Math.ceil((end-t)/1000));$('meetingStage').textContent=m.stage==='discussion'?'DISCUSIÓN':m.stage==='voting'?'VOTACIÓN':'RESULTADO';updateMeetingPresentation(s);}
  show('sabotageBanner',!!s.sabotage);show('sabotageAlarm',s.phase==='game'&&!!s.sabotage);if(s.sabotage)$('sabotageAlarm').dataset.level=alarmLevel(s.sabotage.kind);if(s.sabotage){const def=SABOTAGES[s.sabotage.kind];$('sabotageBanner').innerHTML=`<span>⚡ ${esc(def.label.toUpperCase())}</span><span>${activeRepairs(s).map(r=>`${s.sabotage.fixed.includes(r.id)?'✓':'□'} ${r.label}`).join(' · ')}</span><b>${Math.max(0,Math.ceil((s.sabotage.deadline-t)/1000))} s</b>`;if(s.sabotage.kind==='bell'&&t-lastBell>2000){lastBell=t;tone(780,.15,'square',.035);setTimeout(()=>tone(590,.15,'square',.035),180);}}
  const online=Date.now()-lastNetwork<3000;$('connection').innerHTML=`<span class="status-dot" style="background:${online?'var(--mint)':'var(--gold)'}"></span> ${online?'CONECTADO':'RECONECTANDO'}`;
  if(!s.me.alive)renderSpiritChoices();
  updateActions();
}
function options(){const {FLOORS,REPAIRS,VENTS,taskStation,mapFor,roomAt}=worldFor(state);if(!state)return {};const s=state;if(s.phase==='lobby')return {lobby:LOBBY_OBJECTS.filter(o=>distance(local,o)<=o.range).sort((a,b)=>distance(local,a)-distance(local,b))[0]};const game=s.phase==='game',live=s.me.alive,map=mapFor(s.me.floor,blockersOf(s,now())),available=game&&now()>=s.revealUntil&&!(s.me.expelledUntil>now())&&!modalKind&&!s.me.vent&&!(s.me.transition?.until>now()),ready=available&&live;
 const near=(p,range=USE_RANGE)=>p.floor===s.me.floor&&distance(local,p)<=range&&lineOfSight(map,local,p);
 const body=ready?s.bodies.filter(b=>near(b,REPORT_RANGE)).sort((a,b)=>distance(local,a)-distance(local,b))[0]:null;
 const target=ready&&s.me.role==='impostor'?[...s.players.filter(p=>p.id!==s.me.id&&p.alive&&!p.vent&&s.roster.find(r=>r.id===p.id)?.role!=='impostor'),...(s.me.items?.decoys||[]).filter(d=>!d.own&&!d.teammate)].map(p=>({...p,...(rendered.get(p.id)||{}),id:p.id})).filter(p=>near(p,KILL_RANGE)).sort((a,b)=>distance(local,a)-distance(local,b))[0]:null;
 const hasKnife=(s.me.items?.slots||[]).some(x=>x?.kind==='knife'),knifeTarget=ready&&hasKnife?s.players.filter(p=>p.id!==s.me.id&&p.alive&&!p.vent).map(p=>({...p,...(rendered.get(p.id)||{}),id:p.id})).filter(p=>near(p,KILL_RANGE)).sort((a,b)=>distance(local,a)-distance(local,b))[0]||null:null;
 const M=game?mechanicsFor(worldFor(s)):null,imp=s.me.role==='impostor';
 const passage=ready&&M?M.passages.filter(x=>!x.impostorOnly||imp).flatMap(x=>['a','b'].map(k=>({...x[k],pid:x.id,label:x.label,impostorOnly:x.impostorOnly}))).filter(e=>(e.floor??0)===s.me.floor&&distance(local,e)<=PASSAGE_RANGE).sort((a,b)=>distance(local,a)-distance(local,b))[0]||null:null;
 const hideSpot=ready&&M&&!caged()?M.hides.filter(h=>(h.floor??0)===s.me.floor&&distance(local,h)<=HIDE_RANGE&&!(s.mech?.occupied||[]).includes(h.id)).sort((a,b)=>distance(local,a)-distance(local,b))[0]||null:null;
 const lightSw=ready&&M?M.switches.filter(w=>(w.floor??0)===s.me.floor&&distance(local,w)<=SWITCH_RANGE).sort((a,b)=>distance(local,a)-distance(local,b))[0]||null:null;
 // 16.4 · Muro de un cuarto apagado al alcance: solo entonces aparece «Saltar» (ESPACIO).
 const jumpDoor=ready&&!caged()?(()=>{const ids=new Set((s.doorLocks||[]).filter(l=>l.light&&l.until>now()).flatMap(l=>l.doors));if(!ids.size)return null;return worldFor(s).DOORS.filter(d=>ids.has(d.id)&&(d.floor??0)===s.me.floor).map(d=>{const X0=d.x*TILE,X1=(d.x+d.w)*TILE,Y0=d.y*TILE,Y1=(d.y+d.h)*TILE,cx=Math.max(X0,Math.min(X1,local.x)),cy=Math.max(Y0,Math.min(Y1,local.y));return {d,dist:Math.hypot(local.x-cx,local.y-cy)};}).filter(e=>e.dist<=70).sort((a,b)=>a.dist-b.dist)[0]?.d||null;})():null;
 const opened=new Set(s.me.items?.chests||[]),full=(s.me.items?.slots||[]).every(Boolean);
 const chest=ready&&s.me.items&&!caged()?(FLOORS[s.me.floor].chests||[]).filter(c=>!opened.has(c.id)&&c.floor===s.me.floor&&distance(local,c)<=110).sort((a,b)=>distance(local,a)-distance(local,b))[0]:null;
 const ground=ready&&!full?(s.me.items?.ground||[]).find(g=>distance(local,g)<=85):null;
 const byDistance=(a,b)=>distance(local,a)-distance(local,b);
 const repair=ready&&s.sabotage?activeRepairs(s).filter(r=>!s.sabotage.fixed.includes(r.id)&&near(r)).sort(byDistance)[0]:null;
 const station=available?s.me.tasks.filter(t=>!t.done).map(taskStation).filter(st=>near(st)).sort(byDistance)[0]:null;
 const stair=available&&s.config.floors==='both'?FLOORS[s.me.floor].stairs.find(st=>insideStairs({...local,floor:s.me.floor},st)):null;
 const vent=ready&&now()>=s.me.ventReady&&(s.me.role==='impostor'||s.me.specialRole==='engineer')?VENTS.find(v=>near(v,75)&&(s.config.floors==='both'||v.links.some(id=>VENTS.some(q=>q.id===id&&q.floor===v.floor)))):null;
 const console=worldFor(s).CAMERA_CONSOLE,camera=ready&&console&&near(console,150),lconsole=worldFor(s).LOCATOR_CONSOLE,locator=ready&&lconsole&&near(lconsole,150);const meetingFloor=s.config.floors==='1'?1:0,emergency=ready&&s.me.emergencies>0&&s.me.floor===meetingFloor&&worldFor(s).roomAt(local.x,local.y,meetingFloor)===(meetingFloor?'Sala de profesores':worldFor(s).emergencyRoom)&&distance(local,FLOORS[meetingFloor].emergency)<=190;
 // 15.0 · E abre siempre lo interactuable más cercano.
 const candidates=[['stair',stair],['repair',repair],['station',station],['camera',camera&&console],['locator',locator&&lconsole],['emergency',emergency&&FLOORS[meetingFloor].emergency],['chest',chest],['ground',ground],['vent',vent],['passage',passage],['hide',hideSpot],['switch',lightSw]].filter(([,v])=>v&&typeof v==='object'&&Number.isFinite(v.x));
 const nearest=candidates.sort((a,b)=>distance(local,a[1])-distance(local,b[1]))[0]?.[0]||null;
 return {jumpDoor,ready,available,body,target,knifeTarget,hasKnife,repair,station,stair,vent,emergency,camera,locator,chest,ground,passage,hideSpot,lightSw,nearest};
}
function updateActions(){const {LOBBY,roomAt}=worldFor(state);const s=state;if(!s)return;const o=options(),imp=s.me.role==='impostor',game=s.phase==='game';$('location').textContent=s.phase==='lobby'?LOBBY.name:s.phase==='meeting'?'Reunión':s.me.expelledUntil>now()?`Expulsados · ${Math.ceil((s.me.expelledUntil-now())/1000)} s`:`${roomAt(local.x,local.y,s.me.floor)}`;
 show('cameraBtn',false);$('cameraBtn').disabled=!o.camera;
 show('jumpBtn',game&&!!o.jumpDoor);$('jumpBtn').disabled=!o.jumpDoor;
 show('notebookBtn',game&&s.me.specialRole==='nerd');const canUse=o.lobby||o.repair||o.station||o.emergency||o.stair||s.me.vent||o.camera||o.locator||o.chest||o.ground||o.vent||o.passage||o.hideSpot||o.lightSw||(game&&s.me.hidden);$('useBtn').disabled=!canUse;$('useBtn').querySelector('span:not(.action-icon)').textContent=o.lobby?o.lobby.label:s.me.vent?'Salir':game&&s.me.hidden?'Salir':o.nearest==='vent'?'Conducto':o.nearest==='passage'?'Pasadizo':o.nearest==='hide'?'Esconderse':o.nearest==='switch'?'Luz':o.stair?(s.me.floor?'Bajar':'Subir'):o.repair?'Reparar':o.station?'Tarea':o.emergency?'Reunión':o.nearest==='locator'?'Localizar':o.nearest==='camera'?'Cámaras':o.chest?'Abrir cofre':o.ground?'Recoger':'Usar';
 $('reportBtn').disabled=!o.ready||!o.body;const knifeMode=!(imp&&o.target&&now()>=s.me.killReady)&&o.hasKnife;show('killBtn',game&&s.me.alive&&(imp||o.hasKnife));$('killBtn').classList.toggle('knife',!!knifeMode);$('killBtn').querySelector('span:not(.action-icon)').textContent=knifeMode?'Cuchillo':'Matar';$('killBtn').disabled=knifeMode?!o.knifeTarget:(!o.target||now()<s.me.killReady);$('killBtn').querySelector('small').textContent=knifeMode?'🔪':now()<s.me.killReady?`${Math.ceil((s.me.killReady-now())/1000)}s`:'';
 show('ventBtn',game&&(imp||s.me.specialRole==='engineer')&&s.me.alive);$('ventBtn').disabled=!o.vent&&!s.me.vent;$('ventBtn').querySelector('span:not(.action-icon)').textContent=s.me.vent?'Conductos':'Conducto';$('ventBtn').querySelector('small').textContent=!s.me.vent&&now()<s.me.ventReady?`${Math.ceil((s.me.ventReady-now())/1000)}s`:'';
 show('sabotageBtn',game&&imp);$('sabotageBtn').disabled=now()<s.revealUntil;$('sabotageBtn').querySelector('small').textContent='';$('sabotageBtn').classList.toggle('charged',!s.sabotage&&now()>=s.sabotageReady||now()>=(s.doorReady||0));
 const power=game&&imp&&s.me.alive&&['phantom','copier'].includes(s.me.specialRole),active=power&&s.me.abilityUntil>now();show('abilityBtn',power);$('abilityBtn').disabled=!active&&(!o.ready||now()<s.me.abilityReady);$('abilityBtn').querySelector('span:not(.action-icon)').textContent=active?'Terminar':s.me.specialRole==='phantom'?'Invisible':'Copiar';$('abilityBtn').querySelector('small').textContent=active?`${Math.ceil((s.me.abilityUntil-now())/1000)}s`:power&&now()<s.me.abilityReady?`${Math.ceil((s.me.abilityReady-now())/1000)}s`:'';
 $('mapBtn').disabled=!['game','lobby'].includes(s.phase)||s.sabotage?.kind==='bell';
}
let tableGame=null;
async function openTable(o){try{await act('tableJoin',{game:o.lobby.id.slice(6)});}catch(e){toast(e.message);return;}if(!state?.table)return;if(taskCleanup)taskCleanup();openModal(state.table.label,'<div class="mech table-mech"><div class="mech-stage"><canvas id="tableCanvas" class="mech-canvas" aria-label="Minijuego de la mesa"></canvas></div></div>','table');tableGame=mountTableGame($('tableCanvas'),{send:(t,d)=>{if(t==='tableInput'&&tableSocket?.readyState===1){try{tableSocket.send(JSON.stringify(d));return;}catch{}}act(t,d).catch(e=>{if(t!=="tableInput")toast(e.message);});},tone,close:()=>closeModal(),meName:state.me.name,fast:()=>tableSocket?.readyState===1,look:id=>state?.players?.find(p=>p.id===id)||null});openTableSocket();taskCleanup=()=>{closeTableSocket();tableGame?.destroy();tableGame=null;};tableGame.update(state.table);}
async function use(only){const o=options();if(!only&&o.nearest)only=o.nearest;const ok=k=>!only||only===k;if(o.lobby?.id?.startsWith('table-')){openTable(o);return;}if(o.lobby){try{await act('lobbyUse',{id:o.lobby.id});tone(o.lobby.id==='computer'?560:280,.15,'triangle',.035);if(o.lobby.id==='wardrobe')$('editAppearance').click();else openRoomComputer();}catch(e){toast(e.message);}return;}if(state.me.vent){fire('exitVent');return;}if(state.phase==='game'&&state.me.hidden){act('hide',{}).catch(e=>toast(e.message));return;}if(o.passage&&only==='passage'){try{await act('passage',{id:o.passage.pid});tone(240,.2,'triangle',.05);}catch(e){toast(e.message);}return;}if(o.hideSpot&&only==='hide'){try{await act('hide',{id:o.hideSpot.id});toast(`Te escondes: ${o.hideSpot.label}. Pulsa E para salir.`);}catch(e){toast(e.message);}return;}if(o.lightSw&&only==='switch'){try{const r=await act('lightSwitch',{id:o.lightSw.id});toast(`${o.lightSw.name}: luz ${r.off?'apagada':'encendida'}.`);tone(r.off?300:700,.06,'square',.04);}catch(e){toast(e.message);}return;}if(o.vent&&only==='vent'){try{await act('enterVent',{id:o.vent.id});openVentPanel();tone(180,.15);}catch(e){toast(e.message);}return;}if(o.stair&&ok('stair')){try{await act('stairs',{id:o.stair.id});cue('stairs');}catch(e){toast(e.message);}return;}if(o.repair&&ok('repair')){try{const r=await act('beginRepair',{id:o.repair.id});if(r.repair)openRepair(r.repair);}catch(e){toast(e.message);}return;}if(o.station&&ok('station')){if(state.me.role==='impostor'){toast('Tarea de cobertura. Puedes fingir, pero no suma progreso.');return;}try{const r=await act('beginTask',{id:o.station.id});if(state?.phase==='game')openTask(r.task);}catch(e){toast(e.message);}return;}if(o.locator&&ok('locator')){openLocator();return;}if(o.camera&&(only==='camera'||!only&&!o.station&&!o.repair&&!o.emergency)){openCameras();return;}if(o.emergency&&ok('emergency')){openEmergencyButton();return;}if(o.chest&&ok('chest')){if((state.me.items?.slots||[]).every(Boolean)){toast('Llevas dos objetos. Suelta uno para abrir el cofre.');return;}try{const r=await act('openChest',{id:o.chest.id});openChest(r.chest);}catch(e){toast(e.message);}return;}if(o.ground&&ok('ground')){try{await act('pickItem',{uid:o.ground.uid});const kind=o.ground.kind;toast(`Has recogido: ${ITEMS[kind].name}.`);tone(660,.08,'triangle',.03);}catch(e){toast(e.message);}}}
// Cofre: el minijuego se resuelve solo; el servidor decide qué había dentro.
function openChest(chest){if(!chest)return;if(taskCleanup)taskCleanup();openModal(chest.label,'','chest');const started=Date.now();taskCleanup=mountChestGame($('modalContent'),chest,{tone,submit:async solution=>{const delay=Math.max(0,chest.minDuration-(Date.now()-started)+120);if(delay)await new Promise(r=>taskTimers.push(setTimeout(r,delay)));const r=await act('finishChest',{id:chest.id,solution});[523,659,784].forEach((f,i)=>setTimeout(()=>tone(f,.1,'triangle',.03),i*80));await new Promise(r=>setTimeout(r,500));if(modalKind==='chest')closeModal(false);toast(r.found?`¡Has encontrado: ${ITEMS[r.found].name}! ${ITEMS[r.found].hint}`:'El cofre estaba vacío.');}});}
function caged(){const c=state?.me.items?.cage;return c&&c.until>now()?c:null;}
function openEmergencyButton(){const left=Math.max(0,Math.ceil(((state.emergencyReady||0)-now())/1000)),blocked=!!state.sabotage,used=state.me.emergencies<1;openModal('Reunión de emergencia',`<div class="emergency-device"><div class="emergency-lid"></div><div class="emergency-plate"><i></i><i></i><button id="pressEmergency" ${left||blocked||used?'disabled':''} aria-label="Confirmar reunión de emergencia"><span>!</span><b>PULSAR</b></button><i></i><i></i></div><output id="emergencyStatus">${blocked?'BLOQUEADO / REPARA EL SABOTAJE':left?'RECARGA / '+left+' s':used?'YA HAS UTILIZADO TU REUNIÓN':'PULSA EL BOTÓN PARA REUNIR AL EQUIPO'}</output><p>Cerrar esta tapa no convoca ninguna reunión.</p></div>`,'emergency');$('pressEmergency').addEventListener('click',async()=>{if($('pressEmergency').disabled)return;$('pressEmergency').disabled=true;tone(130,.17,'triangle',.04);try{await act('emergency');closeModal(false);}catch(e){$('taskError').textContent=e.message;if(modalKind==='emergency')$('pressEmergency').disabled=false;}});}
$('useBtn').addEventListener('click',()=>use());
// Tocar o pulsar directamente sobre un objeto del mapa lo usa, igual que el
// botón, si está al alcance. Dentro de un conducto, las flechas viajan.
function ventTravel(id){if(!state?.me.vent)return;fire('travelVent',{id});tone(220,.08,'triangle',.03);}
$('world').addEventListener('click',e=>{if(!state||state.phase!=='game'||modalKind&&modalKind!=='vent')return;const p=worldPoint($('world'),cam,e);
 if(state.me.vent){const h=ventHits.find(h=>Math.hypot(h.x-p.x,h.y-p.y)<=h.r);if(h)ventTravel(h.id);return;}
 const o=options(),{CAMERA_CONSOLE,FLOORS}=worldFor(state),hit=(q,r=62)=>q&&(Math.hypot(q.x-p.x,q.y-p.y)<=r||Math.hypot(q.x-p.x,q.y-30-p.y)<=r);
 if(o.body&&hit(o.body)){fire('report',{body:o.body.id});return;}
 for(const [k,q] of [['repair',o.repair],['station',o.station],['chest',o.chest],['ground',o.ground],['camera',o.camera&&CAMERA_CONSOLE],['locator',o.locator&&worldFor(state).LOCATOR_CONSOLE],['emergency',o.emergency&&FLOORS[state.me.floor].emergency],['stair',o.stair]])if(q&&hit(q,k==='emergency'?90:62)){use(k);return;}
 if(o.vent&&hit(o.vent))$('ventBtn').click();
});
document.addEventListener('keydown',e=>{if(!state?.me.vent||state.phase!=='game'||['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;const dir={arrowup:[0,-1],w:[0,-1],arrowdown:[0,1],s:[0,1],arrowleft:[-1,0],a:[-1,0],arrowright:[1,0],d:[1,0]}[e.key.toLowerCase()];if(!dir||e.repeat)return;const best=ventHits.map(h=>{const dx=h.x-local.x,dy=h.y-local.y+20,l=Math.hypot(dx,dy)||1;return {h,dot:(dx*dir[0]+dy*dir[1])/l};}).sort((a,b)=>b.dot-a.dot)[0];if(best&&best.dot>.35){e.preventDefault();ventTravel(best.h.id);}});$('killBtn').addEventListener('click',()=>{const o=options();if($('killBtn').classList.contains('knife')){knifeAttack(o);return;}if(!o.target||now()<state.me.killReady)return;
 // 15.0 · Instante y posición que el atacante ve en pantalla (reloj de interpolación): el servidor lo rebobina y lo valida.
 const track=remoteSamples.get(o.target.id),seen=rendered.get(o.target.id),view=track&&seen&&Number.isFinite(track.playhead)?{t:Math.round(track.playhead),x:Math.round(seen.x*10)/10,y:Math.round(seen.y*10)/10}:undefined;fire('kill',{target:o.target.id,...(view?{view}:{})});});$('reportBtn').addEventListener('click',()=>{const o=options();if(o.body)fire('report',{body:o.body.id});});
$('abilityBtn').addEventListener('click',()=>{if(!state||$('abilityBtn').disabled)return;if(state.me.abilityUntil>now()){fire('cancelAbility');return;}if(state.me.specialRole==='phantom'){fire('ability');return;}openModal(worldFor(state).roleNames?.copier||'Copiador Boss',`<p class="small-note">Elige a quién copiar durante 30 segundos. Podrás terminar antes con F.</p><div class="copy-targets">${state.roster.filter(q=>q.alive&&q.id!==state.me.id).map(q=>`<button class="secondary" data-copy="${esc(q.id)}">${robotSVG(q)}<span>${esc(q.name)}</span></button>`).join('')}</div>`,'copy');$('modalContent').querySelectorAll('[data-copy]').forEach(b=>b.addEventListener('click',async()=>{try{await act('ability',{target:b.dataset.copy});closeModal(false);}catch(e){$('taskError').textContent=e.message;}}));});
function jumpWall(){const o=options();if(!o.jumpDoor)return false;act('jumpWall',{door:o.jumpDoor.id}).then(()=>tone(520,.12,'triangle',.05)).catch(e=>toast(e.message));return true;}
$('jumpBtn').addEventListener('click',()=>jumpWall());
$('ventBtn').addEventListener('click',async()=>{if(state.me.vent){openVentPanel();return;}const o=options();if(!o.vent)return;try{await act('enterVent',{id:o.vent.id});openVentPanel();tone(180,.15);}catch(e){toast(e.message);}});
function renderVentPanel(){const {VENTS}=worldFor(state);if(modalKind!=='vent'||!state.me.vent)return;const v=VENTS.find(v=>v.id===state.me.vent),ready=!(state.me.transition?.until>now()),remaining=Math.max(0,Math.ceil((state.me.ventSince+10000-now())/1000));if(!changed('ventPanel',[v.id,ready,remaining]))return;
 const mole=!!v.mole,count=v.links.filter(id=>{const t=VENTS.find(q=>q.id===id);return t&&(state.config.floors==='both'||t.floor===v.floor);}).length;
 $('ventDockContent').innerHTML=`<div class="vent-network"><div class="vent-timer">CIRCUITO ${v.network} · ${remaining} s para salir</div><div class="vent-timer-bar"><i style="width:${remaining*10}%"></i></div><h3>${esc(v.label)}${worldFor(state).FLOORS.length>1?' · P'+v.floor:''}</h3><p class="small-note">Toca una de las ${count} flechas que rodean a tu personaje (o pulsa la dirección) para pasar al ${mole?'agujero':'conducto'} conectado. A los 10 s sales automáticamente.</p><button class="primary wide" id="exitVent" ${ready?'':'disabled'}>${mole?'Salir del agujero':'Salir por esta alcantarilla'} ↑</button></div>`;
 $('exitVent').addEventListener('click',()=>fire('exitVent'));
}
function openVentPanel(){modalKind='vent';keys.clear();show('ventDock',true);sigs.ventPanel=null;renderVentPanel();}
$('closeVentDock').addEventListener('click',()=>{show('ventDock',false);modalKind=null;});
$('sabotageBtn').addEventListener('click',()=>{if(mapMode==='sabotage')closeMap();else openMap('sabotage');});
$('startBtn').addEventListener('click',()=>fire('start'));$('returnBtn').addEventListener('click',()=>fire('return'));$('endLeaveBtn').addEventListener('click',()=>fire('leave'));$('leaveBtn').addEventListener('click',async()=>{try{await act('leave');}catch{resetSession();}});
for(const el of document.querySelectorAll('[data-setting]'))el.addEventListener('change',()=>{if(!state||state.host!==state.me.id||state.phase!=='lobby'){if(state)syncSettings();return;}fire('configure',{[el.dataset.setting]:el.type==='checkbox'?el.checked:['floors','map'].includes(el.dataset.setting)?el.value:Number(el.value)});});
for(const id of ['world','meetingWorld'])$(id).addEventListener('pointerdown',()=>{if(touchMode&&typing())document.activeElement.blur();});
$('meetingCards').addEventListener('click',e=>{const b=e.target.closest('[data-vote]');if(!b||b.disabled||!state||state.phase!=='meeting'||state.meeting.stage!=='voting'||!state.me.alive||state.meeting.myVote!==null||votePending)return;voteSelection=b.dataset.vote;voteKind='normal';renderMeeting(state);tone(570,.08);});
$('voteNormalBtn').addEventListener('click',()=>{voteKind='normal';renderMeeting(state);});$('delegateBtn').addEventListener('click',()=>{voteKind='decisive';renderMeeting(state);});$('cancelVoteBtn').addEventListener('click',()=>{voteSelection=null;voteKind='normal';renderMeeting(state);});
$('confirmVoteBtn').addEventListener('click',async()=>{if(!voteSelection||!state||state.meeting.myVote!==null||votePending)return;const target=voteSelection,kind=voteKind;voteSelection=null;votePending=true;renderMeeting(state);try{await act(kind==='decisive'?'delegateVote':'vote',{target});}catch(e){toast(e.message);}finally{votePending=false;if(state?.phase==='meeting')renderMeeting(state);}});
$('skipBtn').addEventListener('click',()=>{if($('skipBtn').disabled)return;voteSelection='skip';voteKind='normal';renderMeeting(state);});
for(const id of ['spiritChoices','meetingSpiritChoices'])$(id).addEventListener('click',e=>{const b=e.target.closest('[data-spirit]');if(b&&!b.disabled)fire('spirit',{emoji:b.dataset.spirit});});
const quickRoot=document.createElement('div');quickRoot.id='quickChat';$('meetingChatForm').before(quickRoot);const quickChat=mountQuickChat(quickRoot,{getState:()=>state,send:quick=>act('chat',{quick}),onError:toast});
for(const [form,field] of [['sideChatForm','sideChatInput'],['meetingChatForm','meetingChatInput']])$(form).addEventListener('submit',async e=>{e.preventDefault();const text=$(field).value;if(!text.trim())return;$(field).disabled=true;try{await act('chat',{text});$(field).value='';}catch(err){toast(err.message);}finally{$(field).disabled=false;$(field).focus();}});
$('copyCode').addEventListener('click',async()=>{const url=new URL(location.href);url.search='';url.searchParams.set('sala',state.code);const text=`PUCELA US · Sala ${state.code}\n${url}`;try{if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(text);else{const el=document.createElement('textarea');el.value=text;document.body.append(el);el.select();if(!document.execCommand('copy'))throw new Error();el.remove();}toast('Código y enlace copiados. Envíalos a tu equipo.');}catch{toast(`Código de sala: ${state.code}`);}});
function nativeFullscreen(){return document.fullscreenElement||document.webkitFullscreenElement;}
function updateFullscreenButton(){const active=!!nativeFullscreen(),expanded=document.documentElement.classList.contains('immersive'),label=active?'Salir de pantalla completa':expanded?'Salir del modo ampliado':'Pantalla completa / instalar';$('fullscreenBtn').textContent=touchMode?(active||expanded?'↙':'⛶'):active?'Salir de pantalla completa ↙':'Pantalla completa ⛶';$('fullscreenBtn').setAttribute('aria-label',label);$('fullscreenBtn').title=label;$('fullscreenBtn').setAttribute('aria-pressed',String(active||expanded));}
const standalone=()=>matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches||navigator.standalone===true;
function screenHelp(){const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1;
 openModal('Más pantalla para jugar',`<div class="screen-help"><p>El juego se ajusta al espacio disponible y respeta el borde de la pantalla. En horizontal tienes más campo de juego.</p><button id="expandGame" class="primary wide" ${state?'':'disabled'}>Activar modo ampliado ↗</button><p class="small-note">El modo ampliado oculta la barra de opciones del juego. Para quitar también las barras del navegador, usa la pantalla completa si está disponible o abre el juego desde su icono.</p>${standalone()?'<p>Ya estás abriendo PUCELA US desde la pantalla de inicio.</p>':`<h3>Añadir a la pantalla de inicio</h3><ol>${ios?'<li>Abre este enlace en Safari.</li><li>Pulsa Compartir y elige Añadir a pantalla de inicio.</li><li>Activa Abrir como app web si aparece y pulsa Añadir.</li>':'<li>Abre el menú del navegador.</li><li>Elige Instalar aplicación o Añadir a pantalla de inicio.</li><li>Abre PUCELA US desde el icono creado.</li>'}</ol><p class="small-note">Hazlo antes de entrar en una sala. Necesitas Internet para jugar.</p><button id="installGame" class="secondary wide">${installPrompt?'Instalar PUCELA US':'Ver cómo instalar'}</button>`}</div>`,'screen');
 $('expandGame').addEventListener('click',()=>{document.documentElement.classList.add('immersive');$('game').classList.add('panel-collapsed');closeModal(false);updateFullscreenButton();});
 $('installGame')?.addEventListener('click',async()=>{if(installPrompt){const prompt=installPrompt;installPrompt=null;await prompt.prompt();const choice=await prompt.userChoice;if(choice.outcome==='accepted'){closeModal(false);toast('Abre el juego desde el nuevo icono de PUCELA US.');}}else toast(ios?'En Safari: Compartir → Añadir a pantalla de inicio.':'Menú del navegador → Instalar aplicación / Añadir a pantalla de inicio.');});
}
$('fullscreenBtn').addEventListener('click',async()=>{if(document.documentElement.classList.contains('immersive')){document.documentElement.classList.remove('immersive');updateFullscreenButton();return;}const status=await toggleNativeFullscreen(document);if(status==='unavailable'||status==='denied'){screenHelp();return;}updateFullscreenButton();$('world').focus();});
for(const event of ['fullscreenchange','webkitfullscreenchange'])document.addEventListener(event,()=>{syncViewport();touchStick.reset();updateFullscreenButton();});
$('sidebarToggle').addEventListener('click',()=>{const collapsed=$('game').classList.toggle('panel-collapsed');$('sidebarToggle').textContent=touchMode?(collapsed?'Panel':'Cerrar panel'):collapsed?'Mostrar panel':'Ocultar panel';$('sidebarToggle').setAttribute('aria-expanded',String(!collapsed));touchStick.reset();$('world').focus();});
updateFullscreenButton();
$('gameHelpBtn').addEventListener('click',()=>$('helpBtn').click());
// BETA · Plano en tres modos (normal azul, localizador verde, sabotaje rojo).
// No bloquea el movimiento ni tapa los controles; en reunión se abre encima.
let mapMode=null,mapDrawnAt=0,mapOpenedAt=0;
function mapAllowed(mode){if(!state)return false;if(mode==='sabotage')return state.phase==='game'&&state.me.role==='impostor';if(mode==='locator')return state.phase==='game';return ['game','lobby','meeting'].includes(state.phase);}
function openMap(mode='normal'){if(!mapAllowed(mode))return;if(mode==='normal'&&state.phase==='game'&&state.sabotage?.kind==='bell'){toast('El timbre averiado bloquea el plano. Repara los paneles.');return;}if(mapMode==='locator'&&mode!=='locator')fire('exitLocator');mapMode=mode;mapOpenedAt=now();const ov=$('mapOverlay'),inMeeting=state.phase==='meeting';const home=inMeeting?document.body:document.querySelector('.viewport');if(home&&ov.parentElement!==home)home.append(ov);ov.dataset.mode=mode;ov.classList.toggle('over-meeting',inMeeting);const w=worldFor(state);$('mapEyebrow').textContent=mode==='sabotage'?'SABOTAJE · TOCA UN CÍRCULO ENCENDIDO':mode==='locator'?'LOCALIZADOR · PERSONAS POR SALA':'PLANO';$('mapTitle').textContent=state.phase==='lobby'?w.LOBBY.name:w.name;$('mapLegend').innerHTML=state.phase==='meeting'?'Reunión en curso: el plano no muestra posiciones.':mode==='sabotage'?'<i class="lg-ready"></i> Listo &nbsp; <i class="lg-charge"></i> Recargando &nbsp; ⚡ Averías · ▯ Puertas':mode==='locator'?'Cada figura es una persona en esa sala. Los pasillos no cuentan.':'<b class="lg-task">▲</b> Tareas &nbsp; <b class="lg-me">●</b> Tú &nbsp; <b class="lg-rep">⚠</b> Averías';show('mapOverlay',true);fitMinimapCanvas();mapDrawnAt=0;drawMapNow();}
function closeMap(){if(mapMode==='locator'&&state?.phase==='game')fire('exitLocator');mapMode=null;show('mapOverlay',false);}
function drawMapNow(){if(!mapMode||!state)return;drawMiniMap($('mapCanvas'),state,local,{mode:mapMode,time:performance.now(),serverNow:now()});}
function toggleMap(){if(mapMode){closeMap();return;}openMap(state?.phase==='game'&&state.me.role==='impostor'?'sabotage':'normal');}
async function openLocator(){try{await act('locator');openMap('locator');tone(740,.08,'triangle',.03);}catch(e){toast(e.message);}}
$('mapCanvas').addEventListener('pointerdown',async e=>{if(mapMode!=='sabotage')return;const cv=$('mapCanvas'),r=cv.getBoundingClientRect(),x=(e.clientX-r.left)*cv.width/r.width,y=(e.clientY-r.top)*cv.height/r.height,h=(cv.__hits||[]).find(h=>Math.hypot(h.x-x,h.y-y)<=h.r);if(!h)return;e.preventDefault();if(!h.ready){tone(180,.08,'square',.02);toast(h.locked?'Esas puertas ya están cerradas.':'Todavía se está recargando.');return;}try{if(h.type==='doors')await act('closeDoors',{room:h.room});else await act('sabotage',{kind:h.kind});tone(110,.25,'sawtooth',.04);}catch(err){toast(err.message);}});
function notebookKey(){return `sanagus.notebook.${session.code}.${state.me.id}.${state.gameNumber}`;}
// BETA · Consulta de rol desde la libreta: una sola vez por partida (lo controla el servidor).
let inspectKey='';function renderInspect(){const box=$('notebookInspect');if(!box||!state)return;const used=state.me.inspect,others=state.roster.filter(p=>p.id!==state.me.id&&p.alive!==false),key=JSON.stringify([used,others.map(p=>p.id+p.name),state.phase]);if(key===inspectKey)return;inspectKey=key;
 if(used){box.innerHTML=`<b>Consulta usada</b><span>${esc(used.name)}: <strong>${esc(used.result)}</strong></span>`;return;}
 box.innerHTML=`<b>Consultar un rol <small>(1 vez por partida)</small></b><span class="inspect-row"><select id="inspectTarget" aria-label="Jugador a investigar">${others.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select><button type="button" id="inspectBtn" class="secondary">Consultar</button></span>`;
 $('inspectBtn').addEventListener('click',async()=>{const id=$('inspectTarget').value;if(!id)return;try{await act('inspectRole',{target:id});inspectKey='';renderInspect();tone(660,.1,'triangle',.04);}catch(e){toast(e.message);}});}
function toggleNotebook(){if(!state||state.me.specialRole!=='nerd'||!['game','meeting'].includes(state.phase)||now()<state.revealUntil)return;const opening=$('notebookOverlay').hidden;show('notebookOverlay',opening);keys.clear();inputDirty=true;nextPulse=0;if(opening){inspectKey='';renderInspect();try{$('notebookText').value=localStorage.getItem(notebookKey())||'';}catch{$('notebookText').value='';}$('notebookText').focus();}else $(state.phase==='meeting'?'meetingCards':'world').focus();}
$('notebookBtn').addEventListener('click',toggleNotebook);$('meetingNotebookBtn').addEventListener('click',toggleNotebook);$('closeNotebook').addEventListener('click',toggleNotebook);
$('notebookText').addEventListener('input',()=>{try{localStorage.setItem(notebookKey(),$('notebookText').value);}catch{toast('No se han podido guardar tus notas en este navegador.');}});
$('mapBtn').addEventListener('click',toggleMap);$('closeMap').addEventListener('click',closeMap);
async function openCameras(){if(!state||!options().camera)return;try{await act('camera',{id:'all'});if(!state.cameraFeeds?.length)return;openModal('Seguridad · Videovigilancia',`<div class="camera-wall"><canvas id="cameraCanvas" aria-label="Cuatro cámaras de vigilancia simultáneas en directo"></canvas></div><div class="camera-toolbar"><span><i class="status-dot"></i> 4 CÁMARAS EN DIRECTO</span><button type="button" id="exitCameras" class="secondary">Salir de cámaras</button></div><p class="small-note">Tu personaje permanece en Seguridad. Los sabotajes de equipos cortan la señal.</p>`,'camera');$('exitCameras').addEventListener('click',()=>closeModal());}catch(e){toast(e.message);}}
$('cameraBtn').addEventListener('click',openCameras);
function openModal(title,html,kind='help'){if(modalKind)closeModal(false);if((kind==='help'||kind==='appearance')&&modalKind)closeModal();modalKind=kind;keys.clear();$('modal').classList.toggle('camera-modal',kind==='camera');$('modal').classList.toggle('interactive-modal',kind==='task'||kind==='repair');$('modalTitle').textContent=title;$('modalContent').classList.remove('operation-success');$('modalContent').innerHTML=html;$('taskError').textContent='';$('modalEyebrow').textContent=kind==='help'?'MANUAL DE LA EXPEDICIÓN':kind==='appearance'?'IDENTIDAD DEL EXPLORADOR':'ESTACIÓN DE TRABAJO';show('modal',true);}
function closeModal(cancel=true){if(modalKind==='computer')restoreRoomComputer();const wasCamera=modalKind==='camera';if(wasCamera&&state?.phase==='game')fire('exitCamera');if(modalKind==='appearance')wardrobeAbort.abort();if(taskCleanup){taskCleanup();taskCleanup=null;}if(modalKind==='table'&&state?.phase==='lobby')fire('tableLeave');const wasTask=modalKind==='task'||modalKind==='repair'||modalKind==='chest';if(modalKind==='portable'&&state?.phase==='game')fire('stopCamera');taskTimers.forEach(clearTimeout);taskTimers=[];activeTask=null;modalKind=null;show('modal',false);show('ventDock',false);if(state&&['lobby','game','meeting'].includes(state.phase))$(state.phase==='meeting'?'meetingCards':'world').focus({preventScroll:true});if(cancel&&wasTask&&session)fire('cancel');}
$('closeModal').addEventListener('click',()=>closeModal());
$('helpBtn').addEventListener('click',()=>openModal('Cómo jugar',`<div class="help-list"><div><b>Junta a tu equipo.</b> Crea una sala y comparte el código. Mínimo 4 personas para un impostor, 7 para dos. El líder elige mapa (Moss Club, El Palero Gym o Latasa´s House) y empieza.</div><div><b>Explora.</b> WASD o flechas (joystick en el móvil). E usa lo interactuable más cercano: tareas, botón de reunión, reparaciones, cámaras y el terminal de localización. M abre el plano azul con tus tareas; puedes seguir moviéndote con él abierto y también consultarlo en las reuniones.</div><div><b>Tripulantes.</b> Completad las tareas o expulsad a todos los impostores. Cada tarea es una máquina: arrastra, gira, mantén pulsado o sigue el orden que indica. Los espectros atraviesan paredes y siguen trabajando.</div><div><b>Localizador.</b> En cada mapa hay un terminal (distinto de las cámaras) que abre un plano verde con cuántas personas hay en cada sala. No muestra quién es ni dónde exactamente; los pasillos no cuentan y un cuerpo sigue contando 10 s.</div><div><b>Impostores.</b> Q elimina a un tripulante cercano tras la recarga. V entra en un conducto y viaja dentro de su circuito. G (o el botón ⚡) abre el plano rojo de sabotaje en cualquier momento: los círculos se llenan de luz al recargarse y se pulsan cuando están encendidos. Hay averías y cierres de puertas por sala; usar uno hace esperar al otro al menos 20 s.</div><div><b>Roles adicionales.</b> Empollón: N abre una libreta privada. Ingeniero: puede usar los conductos. Delegado: voto decisivo una vez; acertar gana y fallar te expulsa. El enchufe: conoce el nombre de cada muerte. Creyente: recibe señales de los fantasmas. Impostor Fantasma: F lo oculta 15 s. Copiador Boss: F copia a otro vivo 30 s. Latasa (solo en Latasa´s House): cada ataque tiene un 20 % de fallar; la víctima esquiva y el arma espera.</div><div><b>Reuniones.</b> R denuncia un cadáver cercano. El botón de reunión está en la mesa de la sala principal de cada mapa. Abre el chat o las frases rápidas, selecciona una tarjeta y confirma con ✓. SKIP permite abstenerte. Empate y omitir no expulsan. Los votos son anónimos.</div><div><b>Sabotajes.</b> Se reparan en sus paneles; la emergencia cooperativa exige dos personas en paneles distintos con menos de 8 s de diferencia. Si pasan 90 s sin reparar, gana el impostor.</div><div><b>Conexión.</b> Recargar recupera tu sesión. Si pierdes conexión durante la partida, tu plaza se conserva; en la espera caduca tras 30 s.</div></div>`));
$('editAppearance').addEventListener('click',()=>{const p=state.me;openModal('Armario de la caravana',`<div class="wardrobe-preview"><canvas id="wardrobeCanvas" width="160" height="175" aria-label="Vista previa"></canvas></div><div class="name-preview" id="wardrobeNamePreview"></div><label class="field-label" for="editName">Nombre</label><input id="editName" maxlength="18" value="${esc(p.name)}"><label class="field-label" for="editColor">Color de identidad</label><select id="editColor">${COLOR_NAMES.map((n,i)=>`<option value="${i}" ${i===p.color?'selected':''} ${state.roster.some(q=>q.id!==p.id&&q.color===i)?'disabled':''}>${n}</option>`).join('')}</select><nav class="wardrobe-tabs" aria-label="Secciones del vestuario"><button type="button" data-wardrobe-tab="clothes" class="selected" aria-pressed="true">Ropa</button><button type="button" data-wardrobe-tab="face" aria-pressed="false">Personaje</button><button type="button" data-wardrobe-tab="extras" aria-pressed="false">Accesorios</button><button type="button" data-wardrobe-tab="pass" aria-pressed="false">Pase ★</button><button type="button" data-wardrobe-tab="name" aria-pressed="false">Nombre</button></nav><div class="wardrobe-fields">${Object.entries(wardrobe).map(([id,choices])=>`<label data-wardrobe-group="${wardrobeSection(id)}" ${wardrobeSection(id)==='clothes'?'':'hidden'}>${wardrobeLabels[id]}<select data-wardrobe="${id}">${choiceOptions(id,choices,p[id]??0)}</select></label>`).join('')}</div><button id="saveAppearance" class="primary wide">Guardar ropa →</button>`,'appearance');
 $('modalContent').querySelector('.wardrobe-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-wardrobe-tab]');if(!b)return;$('modalContent').querySelectorAll('[data-wardrobe-tab]').forEach(t=>{const chosen=t===b;t.classList.toggle('selected',chosen);t.setAttribute('aria-pressed',String(chosen));});$('modalContent').querySelectorAll('[data-wardrobe-group]').forEach(label=>label.hidden=label.dataset.wardrobeGroup!==b.dataset.wardrobeTab);});
 const read=()=>{const result={name:$('editName').value,color:Number($('editColor').value)};document.querySelectorAll('[data-wardrobe]').forEach(el=>result[el.dataset.wardrobe]=Number(el.value));return result;};
 let appearanceTimer=0;const signal=wardrobeSignal();signal.addEventListener('abort',()=>clearTimeout(appearanceTimer),{once:true});
 const wardrobeLoop=time=>{if(modalKind!=='appearance'||!$('wardrobeCanvas'))return;const look=read();drawAvatar($('wardrobeCanvas'),{...look,alive:true},time);const sig=look.name+look.nameBg+'.'+look.nameColor;if($('wardrobeNamePreview').dataset.sig!==sig){$('wardrobeNamePreview').dataset.sig=sig;$('wardrobeNamePreview').innerHTML=nameHtml(esc(look.name||'Tu nombre'),look.nameBg,look.nameColor);}requestAnimationFrame(wardrobeLoop);};requestAnimationFrame(wardrobeLoop);
 $('modalContent').addEventListener('input',()=>{const p=read();tone(600,.035,'triangle',.015);clearTimeout(appearanceTimer);appearanceTimer=setTimeout(()=>{if(modalKind==='appearance'&&p.name.trim().length>=2)act('profile',p).catch(e=>{if(modalKind==='appearance')$('taskError').textContent=e.message;});},250);},{signal});
 $('saveAppearance').addEventListener('click',async()=>{const p=read();try{await act('profile',p);appearance={...appearance,...p};$('playerName').value=p.name;for(const id of Object.keys(wardrobe))$(id).value=p[id];updateAppearance();closeModal(false);}catch(e){$('taskError').textContent=e.message;}});
});
const roomComputerHome=$('lobbyPanel'),roomComputerParts=[roomComputerHome.querySelector('.settings'),$('startBtn'),$('startHint')];
for(const node of roomComputerParts)node.classList.add('computer-control');
const computerStash=document.createElement('div');computerStash.hidden=true;computerStash.id='computerStash';roomComputerHome.append(computerStash);roomComputerParts.forEach(n=>computerStash.append(n));
$('editAppearance').hidden=true;roomComputerHome.querySelector('.settings-title').hidden=true;
const departure=document.createElement('button');departure.type='button';departure.id='departureBtn';departure.className='primary wide';departure.textContent='Salir de viaje →';departure.addEventListener('click',()=>fire('start'));roomComputerHome.append(departure);
// BETA · Botón «Iniciar partida» del líder, centrado abajo en la sala previa.
const lobbyStart=document.createElement('button');lobbyStart.type='button';lobbyStart.id='lobbyStartBtn';lobbyStart.className='lobby-start';lobbyStart.hidden=true;lobbyStart.innerHTML='<span>▶</span> Iniciar partida';lobbyStart.addEventListener('click',()=>{if(!lobbyStart.disabled)fire('start');});document.querySelector('.viewport')?.append(lobbyStart);
function syncLobbyStart(){const s=state,host=s&&s.host===s.me?.id,busy=!!modalKind||!!mapMode||!$('notebookOverlay').hidden||!$('matchMenu').hidden||!$('menu').hidden&&$('menu').offsetParent!==null;const show=!!s&&s.phase==='lobby'&&host&&!busy;if(lobbyStart.hidden===show)lobbyStart.hidden=!show;if(show){const min=s.config.impostors*3+1,ok=s.roster.length>=min&&!s.roster.some(p=>!p.online);lobbyStart.disabled=!ok;lobbyStart.title=ok?'Iniciar partida':`Faltan ${Math.max(0,min-s.roster.length)} jugadores`;}departure.hidden=!!host;setLobbyHighlight(!busy);}
const lobbyHint=document.createElement('p');lobbyHint.className='small-note';lobbyHint.textContent='Acércate al armario para cambiarte o al ordenador para consultar los ajustes. Pulsa E / Usar.';roomComputerHome.append(lobbyHint);
function restoreRoomComputer(){roomComputerParts.forEach(n=>computerStash.append(n));}
function openRoomComputer(){openModal('Ordenador de la caravana','<div class="room-monitor"><div class="monitor-top"><i></i> PUCELA US / CONTROL DE VIAJE</div><p class="small-note">'+(state.host===state.me.id?'Eres el líder: puedes configurar la salida.':'Consulta los ajustes. Solo el líder puede cambiarlos.')+'</p><div id="roomComputerSettings"></div></div>','computer');roomComputerParts.forEach(n=>$('roomComputerSettings').append(n));const bots=document.createElement('section');bots.className='bot-controls';bots.innerHTML='<h3>TRIPULACIÓN AUTOMÁTICA</h3><p>Los bots recorren tareas, reparan, reportan y votan. Los impostores buscan víctimas y sabotean.</p><div><button type="button" class="secondary" data-bot="addBot">+ Añadir bot</button><button type="button" class="secondary" data-bot="removeBot">− Eliminar bot</button><button type="button" class="secondary" data-bot="fillBots">Rellenar plazas</button></div><output id="botStatus"></output>';bots.addEventListener('click',async e=>{const b=e.target.closest('[data-bot]');if(!b||b.disabled)return;b.disabled=true;try{await act(b.dataset.bot);tone(650,.12,'triangle',.025);}catch(error){$('taskError').textContent=error.message;}finally{syncSettings();}});$('roomComputerSettings').append(bots);syncSettings();}
function wardrobeSignal(){wardrobeAbort.abort();wardrobeAbort=new AbortController();return wardrobeAbort.signal;}
document.addEventListener('keydown',e=>{const k=e.key.toLowerCase(),typing=['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName);if(k==='escape'&&!$('notebookOverlay').hidden){e.preventDefault();show('notebookOverlay',false);$(state?.phase==='meeting'?'meetingCards':'world').focus();return;}if(typing)return;if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)&&state)e.preventDefault();if(k==='escape'){if(!$('notebookOverlay').hidden)show('notebookOverlay',false);else if(mapMode)closeMap();else if(modalKind)closeModal();return;}if(k==='n'&&!e.repeat&&state?.me.specialRole==='nerd'){e.preventDefault();toggleNotebook();return;}if(k==='m'&&!e.repeat&&!modalKind){toggleMap();return;}if(!e.repeat&&/^[1-4]$/.test(k)&&state&&!state.me.alive&&!modalKind&&$('mapOverlay').hidden&&$('notebookOverlay').hidden&&state.believerAlive&&now()>=state.me.spiritReady){const emoji=state.spiritEmojis?.[Number(k)-1];if(emoji){e.preventDefault();fire('spirit',{emoji});return;}}keys.add(k);if(!e.repeat&&['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright'].includes(k)){inputDirty=true;nextPulse=0;pump();}if(k===' '&&!e.repeat&&!modalKind&&state?.phase==='game'&&state.me.alive&&jumpWall()){e.preventDefault();return;}if(k==='e'&&!e.repeat&&state?.phase==='game'&&state.me.vent){e.preventDefault();fire('exitVent');return;}if(e.repeat||modalKind)return;if(state?.phase==='game'&&state.me.alive&&state.me.items){if(/^[1-3]$/.test(k)){selectSlot(Number(k)-1);return;}if(k==='c'&&invSelected){itemAction('useItem',invSelected-1);return;}if(k==='x'&&invSelected){itemAction('dropItem',invSelected-1);return;}}if(k==='g'&&!e.repeat&&!modalKind&&state?.phase==='game'&&state.me.role==='impostor'){if(mapMode==='sabotage')closeMap();else openMap('sabotage');return;}if(k==='e')use();if(k==='f'&&!$('abilityBtn').disabled)$('abilityBtn').click();if(k==='q'&&!$('killBtn').disabled)$('killBtn').click();if(k==='r'&&!$('reportBtn').disabled)$('reportBtn').click();});
document.addEventListener('keyup',e=>{const k=e.key.toLowerCase();keys.delete(k);if(['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright'].includes(k)){inputDirty=true;nextPulse=0;pump();}});window.addEventListener('blur',()=>{touchStick.reset();keys.clear();inputDirty=true;nextPulse=0;pump();});document.addEventListener('visibilitychange',()=>{lastTime=performance.now();simulationRemainder=0;if(document.hidden){touchStick.reset();keys.clear();inputDirty=true;nextPulse=0;pump();}});

// Inventario: mano vacía y dos ranuras. La selección es local; cada acción la
// valida el servidor.
let invSelected=0;
function selectSlot(i){invSelected=i;renderInventory(true);tone(500+i*80,.04,'triangle',.02);}
function renderInventory(force=false){const s=state,root=$('inventory');if(!root)return;const on=s?.phase==='game'&&s.me.alive&&!!s.me.items;show('inventory',on);if(!on)return;const slots=s.me.items.slots;if(invSelected&&!slots[invSelected-1])invSelected=0;const html=inventoryMarkup(s.me.items,invSelected,now(),s.me.role);if(force||root.dataset.html!==html){root.dataset.html=html;root.innerHTML=html;}}
// 15.0 · Confirmación lateral pequeña (soltar objeto).
let sideNoteTimer=0;function sideNote(text){let el=$('sideNote');if(!el){el=document.createElement('div');el.id='sideNote';el.className='side-note';el.setAttribute('role','status');el.setAttribute('aria-live','polite');document.body.append(el);}el.textContent=text;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');clearTimeout(sideNoteTimer);sideNoteTimer=setTimeout(()=>el.classList.remove('show'),1900);}
// 16.2 · Cuchillo: ataque de un solo uso contra quien esté al alcance (cualquier equipo).
function knifeAttack(o=options()){const t=o.knifeTarget;if(!t){toast('Acércate a alguien para usar el cuchillo.');return;}const track=remoteSamples.get(t.id),seen=rendered.get(t.id),view=track&&seen&&Number.isFinite(track.playhead)?{t:Math.round(track.playhead),x:Math.round(seen.x*10)/10,y:Math.round(seen.y*10)/10}:undefined;act('knifeKill',{target:t.id,...(view?{view}:{})}).then(r=>{if(r.blocked)toast('¡Tenía escudo! El cuchillo se ha roto.');else if(r.revived)toast('Ha revivido al instante: el cuchillo se ha gastado.');tone(200,.16,'square',.04);}).catch(e=>toast(e.message));}
async function itemAction(type,slot){const item=state?.me.items?.slots?.[slot];if(!item)return;if(type==='useItem'&&item.kind==='knife'){knifeAttack();return;}try{const r=await act(type,{slot});if(type==='dropItem'){sideNote(`${ITEMS[item.kind].icon} Soltado: ${ITEMS[item.kind].name}`);invSelected=0;}else{const d=ITEMS[item.kind];if(r.caged)toast(`¡Has atrapado a ${r.caged} durante 30 s!`);else if(item.kind==='shield')toast('Escudo activo durante 30 s. Solo tú lo ves.');else if(item.kind==='decoy')toast('Tu señuelo aparece a tu lado durante 15 s.');else if(r.placed)toast('Cámara colocada. Pulsa de nuevo para mirar por ella.');else if(item.kind==='camera'&&(r.watching??state.me.items?.watching))openPortableCamera();else if(item.kind==='camera'&&r.watching===false&&modalKind==='portable')closeModal(false);else if(d.mode==='toggle')toast(`${d.name}: ${state.me.items.slots[slot]?.active?'activado':'desactivado'}.`);}tone(type==='dropItem'?320:620,.07,'triangle',.03);renderInventory(true);}catch(e){toast(e.message);}}
let portableAt=0;function openPortableCamera(){portableAt=Date.now();openModal('Cámara portátil','<canvas id="portableCanvas" class="camera-canvas" aria-label="Lo que ve tu cámara portátil"></canvas><p class="small-note">La batería solo se gasta mientras miras. Cierra para pausar.</p>','portable');}
$('inventory')?.addEventListener('click',e=>{const slot=e.target.closest('[data-slot]');if(slot){selectSlot(Number(slot.dataset.slot));return;}const use=e.target.closest('[data-item-use]');if(use){itemAction('useItem',Number(use.dataset.itemUse));return;}const drop=e.target.closest('[data-item-drop]');if(drop)itemAction('dropItem',Number(drop.dataset.itemDrop));});
// Avisos de objetos: el escudo que para un ataque se anuncia a lo grande.
const seenItemEvents=new Set();
function itemEvents(s){for(const e of s.events||[]){if(seenItemEvents.has(e.id))continue;seenItemEvents.add(e.id);if(!['shield-block','shield-fail','decoy-report','decoy-killed','item-empty'].includes(e.type))continue;if(Date.now()-((e.time||0)-(s.serverTime-Date.now()))>15000)continue;if(e.type==='shield-block'){const n=$('roleNotice');n.textContent='🛡️ '+e.text;n.classList.add('shield-alert');show('roleNotice',true);setTimeout(()=>{show('roleNotice',false);n.classList.remove('shield-alert');},4200);[880,660,880,660].forEach((f,i)=>setTimeout(()=>tone(f,.12,'square',.04),i*120));}else toast(e.text);}}
function openTask(task){if(!task)return;openInteractive(task,'task');}
function openRepair(repair){openInteractive(repair,'repair');}
function openInteractive(task,kind){
 if(taskCleanup)taskCleanup();openModal(task.label,'',kind);activeTask=task;
 taskCleanup=mountTask($('modalContent'),task,{tone,submit:async solution=>{
  const delay=Math.max(0,task.start+task.minDuration-now()+100);if(delay)await new Promise(resolve=>{taskTimers.push(setTimeout(resolve,delay));});
  if(activeTask!==task)throw new Error('La tarea se ha cerrado.');
  const result=await act(kind==='task'?'finishTask':'finishRepair',{id:task.id,solution});cue('task');if(activeTask===task&&modalKind){$('modalContent').classList.add('operation-success');const banner=document.createElement('div');banner.className='task-success-banner';banner.innerHTML='<span>✓</span><b>OPERACIÓN COMPLETADA</b>'; $('modalContent').append(banner);await new Promise(resolve=>setTimeout(resolve,650));$('modalContent').classList.remove('operation-success');if(activeTask===task)closeModal(false);}
  toast(result.carrying?'Documentos recogidos. Llévalos a Dirección (P0).':result.retryCoop?'Necesitáis dos personas distintas en los dos paneles.':kind==='task'?'Tarea completada.':state.sabotage?.kind==='emergency'?'Panel confirmado: la otra persona tiene 8 s.':'Panel reparado. Comprueba el otro.');
 }});
}

let introAckBusy=false,introAckAt=0;
function acknowledgeIntro(){if(!state?.intro||document.hidden||introAckBusy||now()-introAckAt<500)return;const i=state.intro,stage=i.stage==='travel'&&now()>=i.travelEnd&&!i.ownArrivalReady?'arrival':['reveal','reading'].includes(i.stage)&&state.me.role&&!i.ownRoleShownAt&&!$('roleOverlay').hidden?'role':null;if(!stage)return;introAckBusy=true;requestAnimationFrame(()=>{if(document.hidden){introAckBusy=false;return;}introAckAt=now();act('introReady',{stage}).catch(e=>toast(e.message)).finally(()=>introAckBusy=false);});}
let skippedJourney=null;
$('skipJourney').addEventListener('click',()=>{skippedJourney=state?.gameNumber;$('journeyCanvas').style.visibility='hidden';show('journeyWait',true);if(state?.intro?.stage==='travel'&&!state.intro.ownArrivalReady)act('introReady',{stage:'arrival',skip:true}).catch(()=>{});});
let lastViewportCheck=0;function frame(time){acknowledgeIntro();if(time-lastViewportCheck>500){lastViewportCheck=time;syncViewport();}syncLobbyStart();if(!$('notebookOverlay').hidden)renderInspect();if(mapMode){if(!mapAllowed(mapMode)||mapMode==='locator'&&state?.phase==='game'&&!state.locator&&now()-(mapOpenedAt||0)>1500)closeMap();else if(state.phase==='meeting'&&!$('mapOverlay').classList.contains('over-meeting'))openMap(mapMode);else{// 16.5 · a cada fotograma: tu punto sigue exactamente tu posición, sin tirones
  if(time-mapDrawnAt>250||!mapDrawnAt){fitMinimapCanvas();}mapDrawnAt=mapDrawnAt||time;if(time-mapDrawnAt>250)mapDrawnAt=time;drawMapNow();}}updateAlarm();syncMatchHud();voteCountdown.update(state,now());if(state?.phase==='ended'){const active=now()<state.result.time+4200;show('finaleOverlay',active);if(active){const canvas=$('finaleCanvas'),r=canvas.getBoundingClientRect(),d=Math.min(window.devicePixelRatio||1,1.5);if(canvas.width!==Math.round(r.width*d))canvas.width=Math.max(1,Math.round(r.width*d));if(canvas.height!==Math.round(r.height*d))canvas.height=Math.max(1,Math.round(r.height*d));drawFinale(canvas,state,now(),{reduced:reducedEffects});}}if(state?.phase==='game'&&(state.intro?state.intro.stage==='travel':now()<(state.travelUntil||0))){const canvas=$('journeyCanvas'),r=canvas.getBoundingClientRect(),d=Math.min(window.devicePixelRatio||1,1.5);if(canvas.width!==Math.round(r.width*d))canvas.width=Math.max(1,Math.round(r.width*d));if(canvas.height!==Math.round(r.height*d))canvas.height=Math.max(1,Math.round(r.height*d));if(skippedJourney!==state.gameNumber){canvas.style.visibility='visible';show('journeyWait',!!state.intro&&now()>=state.intro.travelEnd);drawJourney(canvas,state.intro?Math.min(now(),state.intro.travelEnd):now(),state,{reduced:reducedEffects,lobbyShot:lobbyShot?.game===state.gameNumber?lobbyShot:null});}}const {LOBBY,MEETING,mapFor}=worldFor(state);updateTouchControls();const elapsed=Math.max(0,(time-lastTime)/1000),dt=Math.min(.25,elapsed);lastTime=time;if(!state){}else{const axis=input(),map=state.phase==='meeting'?MEETING:state.phase==='lobby'?LOBBY:mapFor(state.me.floor,blockersOf(state,now())),ghost=state.phase!=='lobby'&&!state.me.alive;if(['lobby','game'].includes(state.phase)){const px=local.x,py=local.y;simulationRemainder=fixedSteps(simulationRemainder,elapsed,step=>{move(state.phase==='game'&&state.me.alive&&state.me.expelledUntil>now()?detentionMap(map):state.phase==='game'?predictionMap(state,map):map,local,axis.x,axis.y,step,ghost,state.config.speed*(state.phase==='game'?itemSpeedLocal(state):1));recordMotion(axis,step);});if((axis.x||axis.y)&&!ghost&&Math.hypot(local.x-px,local.y-py)>.25&&time-lastStep>300){lastStep=time;stepFoot^=1;if(audio&&soundOn)footstep(audio,audioMixer.output('effects'),surfaceUnder(state,local),stepFoot,.9);}}local.input=axis;for(const p of [...state.players,...(state.teachers||[]),...(state.wildlife||[]),...(state.me.items?.decoys||[])]){if(p.id===state.me.id)continue;const at=remoteAt(remoteSamples.get(p.id),now(),p.detained?detentionMap(map):map,state.config.speed);if(at)rendered.set(p.id,at);}for(const id of rendered.keys())if(!remoteSamples.has(id))rendered.delete(id);localCorrection.x*=Math.exp(-dt/.1);localCorrection.y*=Math.exp(-dt/.1);const visual={...local,x:local.x+localCorrection.x,y:local.y+localCorrection.y};if(!canStand(map,visual.x,visual.y,ghost)){visual.x=local.x;visual.y=local.y;localCorrection={x:0,y:0};}if(state.phase!=='meeting')drawWorld($('world'),state,visual,rendered,cam,dt,time);if(time-lastUi>100){lastUi=time;updateClocks();}}
  if(modalKind==='camera'&&state?.cameraFeed&&$('cameraCanvas')){drawCamera($('cameraCanvas'),state,rendered,time);}
  if(modalKind==='portable'&&state?.me.items?.feed&&$('portableCanvas')){drawCamera($('portableCanvas'),{...state,cameraFeeds:[state.me.items.feed],cameraFeed:state.me.items.feed},rendered,time);}
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
try{session=JSON.parse(sessionStorage.getItem('sanagus.session')||'null');}catch{}if(session){setSceneMode('game');show('appHeader',false);show('menu',false);show('game',true);primeWorld();show('networkBanner',true);$('networkBanner').textContent='Recuperando tu sesión… Puedes pulsar Salir para volver al menú.';$('roomCode').textContent=session.code;nextPulse=0;pump();}

const gameSelects=installGameSelects(document);bindTouchActions(document,()=>touchMode);


function fitMinimapCanvas(){const canvas=$('mapCanvas'),rect=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1),width=Math.round(rect.width*dpr),height=Math.round(rect.height*dpr);if(width>50&&height>50){if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;}}
// Ganchos de comprobación visual: solo existen al abrir el juego con ?qa en la URL.
// Atajos de la app instalada: «Crear sala» deja el botón listo.
if(new URLSearchParams(location.search).has('crear'))setTimeout(()=>$('createBtn')?.focus({preventScroll:false}),900);
if(new URLSearchParams(location.search).has('qa'))window.__qa={openTask,openRepair,openCameras,openModal,closeModal,use,openLocator,openMap,closeMap,options,get state(){return state;},get socket(){return tableSocket;},get gameSocket(){return gameSocket;},get local(){return {...local};},get rendered(){return Object.fromEntries(rendered);},get prediction(){return {pending:pendingMotion.length,inFlight:inFlightMotion.length};},act};

// Emergencias de sabotaje: tinte rojo que respira (CSS, nivel según el tipo) y
// sirena de fondo. Un único planificador: nunca se solapan dos alarmas, se
// para en el mismo fotograma en que el sabotaje se repara (cortando la nota
// que esté sonando) y respeta el silencio y el volumen de efectos.
// Particularidades: el apagón de sonido del club no suena (precisamente
// apaga el audio) y la campana del colegio ya tiene su propio timbre.
function alarmLevel(kind){return kind==='emergency'?'critical':['lights','doors','vip','audio'].includes(kind)?'soft':'normal';}
let alarmNext=0,alarmVoices=[],alarmKey='';
function stopAlarm(){for(const v of alarmVoices){try{v.g.gain.cancelScheduledValues(audio.currentTime);v.g.gain.setTargetAtTime(0,audio.currentTime,.015);v.o.stop(audio.currentTime+.06);}catch{}}alarmVoices=[];alarmNext=0;alarmKey='';}
// 14.2 · Alarma clásica de emergencia, grave y profunda: pulsos electrónicos
// repetitivos de tono FIJO (sin deslizamientos, nada agudo ni parecido a un
// gemido). Cada pulso suma una onda cuadrada en Si bemol 3 (233 Hz) y su
// octava inferior (116,5 Hz) para dar cuerpo, con un filtro paso bajo que quita
// la aspereza de los armónicos altos. Ataque y corte nítidos, programados con
// el reloj de audio; cada voz queda registrada para cortarla al instante.
const ALARM_PATTERNS={
 critical:{freq:233.08,pulses:4,len:.3,gap:.13,rest:.13,gain:.034},  // continua y urgente
 normal:{freq:233.08,pulses:3,len:.3,gap:.15,rest:.7,gain:.028},     // tres pulsos + pausa
 soft:{freq:207.65,pulses:2,len:.22,gap:.18,rest:1.25,gain:.018}     // pulsos discretos, más graves aún
};
function updateAlarm(){
 const s=state,kind=s?.phase==='game'&&s.sabotage?s.sabotage.kind:null,audible=kind&&!['audio','bell'].includes(kind)&&soundOn&&audio&&!document.hidden;
 const key=kind?s.sabotage.id||kind:'';
 if(!audible||key!==alarmKey){if(alarmVoices.length||alarmNext)stopAlarm();if(!audible)return;alarmKey=key;}
 const t=performance.now();if(t<alarmNext)return;
 const pattern=ALARM_PATTERNS[alarmLevel(kind)],cycle=pattern.pulses*(pattern.len+pattern.gap)+pattern.rest;alarmNext=t+cycle*1000;
 try{const out=audioMixer.output('effects')||audio.destination,start=audio.currentTime+.01;
  for(let i=0;i<pattern.pulses;i++){const at=start+i*(pattern.len+pattern.gap),end=at+pattern.len,g=audio.createGain(),lp=audio.createBiquadFilter();
   lp.type='lowpass';lp.frequency.value=1100;lp.Q.value=.7;lp.connect(g);g.connect(out);
   g.gain.setValueAtTime(.0001,at);g.gain.linearRampToValueAtTime(pattern.gain,at+.012);g.gain.setValueAtTime(pattern.gain,end-.03);g.gain.linearRampToValueAtTime(.0001,end);
   const oscs=[[pattern.freq,1],[pattern.freq/2,.75]].map(([f,level])=>{const o=audio.createOscillator(),og=audio.createGain();o.type='square';o.frequency.setValueAtTime(f,at);og.gain.value=level;o.connect(og);og.connect(lp);o.start(at);o.stop(end+.02);return {o,og};});
   const v={o:{stop:when=>{for(const x of oscs){try{x.o.stop(when);}catch{}}}},g};alarmVoices.push(v);
   oscs[0].o.onended=()=>{alarmVoices=alarmVoices.filter(x=>x!==v);try{for(const x of oscs){x.o.disconnect();x.og.disconnect();}lp.disconnect();g.disconnect();}catch{}};}
 }catch{}
}
// Parpadeo de emergencias normal o suave (ajuste propio, independiente de las luces del club).
let calmAlarm=saved('pucela.calmAlarm')===true;
function syncCalmAlarm(){document.documentElement.classList.toggle('calm-alarm',calmAlarm);for(const el of document.querySelectorAll('[data-calm-alarm]')){el.setAttribute('aria-pressed',String(calmAlarm));const label=el.querySelector('small')||el;label.textContent=calmAlarm?'Parpadeo de alarmas: suave':'Parpadeo de alarmas: normal';}}
for(const el of document.querySelectorAll('[data-calm-alarm]'))el.addEventListener('click',()=>{calmAlarm=!calmAlarm;try{localStorage.setItem('pucela.calmAlarm',JSON.stringify(calmAlarm));}catch{}syncCalmAlarm();});
syncCalmAlarm();
// Interfaz superior de la partida: barra de tareas arriba a la izquierda;
// ajustes y mapa arriba a la derecha (el menú de ajustes reúne lo que antes
// ocupaba la franja superior).
function setMatchMenu(open){$('matchMenu').hidden=!open;$('hudSettingsBtn').setAttribute('aria-expanded',String(open));if(open){$('matchCode').textContent=session?.code||'------';$('matchMenu').querySelector('button')?.focus({preventScroll:true});}}
$('hudSettingsBtn').addEventListener('click',e=>{e.stopPropagation();setMatchMenu($('matchMenu').hidden);});
$('hudMapBtn').addEventListener('click',()=>{setMatchMenu(false);toggleMap();});
$('matchMenu').addEventListener('click',e=>{const b=e.target.closest('button');if(b&&!b.hasAttribute('data-effects')&&!b.hasAttribute('data-calm-alarm'))setMatchMenu(false);});
document.addEventListener('pointerdown',e=>{if(!$('matchMenu').hidden&&!e.target.closest('#matchMenu,#hudSettingsBtn'))setMatchMenu(false);},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('matchMenu').hidden){setMatchMenu(false);$('hudSettingsBtn').focus({preventScroll:true});}});
const bannerHome={parent:null,next:null};
const hudHome={};function syncMatchHud(){const meeting=state?.phase==='meeting';document.documentElement.classList.toggle('in-meeting',meeting);for(const id of ['hudCorner','matchMenu']){const el=$(id);if(!el)continue;hudHome[id]??={parent:el.parentElement,next:el.nextSibling};if(meeting&&el.parentElement!==document.body)document.body.append(el);else if(!meeting&&el.parentElement===document.body){const h=hudHome[id];h.parent.insertBefore(el,h.next&&h.next.parentElement===h.parent?h.next:null);}}const on=!!state&&['game','meeting'].includes(state.phase),banner=$('sabotageBanner');if(document.documentElement.classList.contains('in-match')!==on){document.documentElement.classList.toggle('in-match',on);if(on){if(!bannerHome.parent){bannerHome.parent=banner.parentNode;bannerHome.next=banner.nextSibling;}$('missionHud').append(banner);}else if(bannerHome.parent)bannerHome.parent.insertBefore(banner,bannerHome.next);}if(!on&&!$('matchMenu').hidden)setMatchMenu(false);}


// Mesas en tiempo real: WebSocket con la vista de la mesa a 30 Hz y entradas
// inmediatas. Si no conecta (proxy, servidor sin soporte), se sigue por HTTP.
let tableSocket=null,tableSocketAt=0,tableSocketRetry=0;
function openTableSocket(){closeTableSocket();if(!session||!('WebSocket' in window))return;
 try{const ws=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/api/table-ws?code=${encodeURIComponent(session.code)}&token=${encodeURIComponent(session.token)}`);tableSocket=ws;
  ws.onmessage=e=>{if(ws!==tableSocket)return;let m;try{m=JSON.parse(e.data);}catch{return;}if(m.t==='view'&&m.view&&modalKind==='table'){tableSocketAt=performance.now();tableGame?.update(m.view);}};
  ws.onclose=()=>{if(ws!==tableSocket)return;tableSocket=null;if(modalKind==='table'&&tableSocketRetry++<3)setTimeout(()=>{if(modalKind==='table'&&!tableSocket)openTableSocket();},800*tableSocketRetry);};
  ws.onopen=()=>{tableSocketRetry=0;};
 }catch{tableSocket=null;}}
function closeTableSocket(){const ws=tableSocket;tableSocket=null;try{ws?.close();}catch{}}

// ---- 15.0 · Sugerencias y bugs, y panel privado del creador.
// El código de creador nunca está en el cliente: el servidor lo comprueba y,
// para ver los mensajes, exige además la contraseña de creador del servidor.
{
 const postJson=async(route,body)=>{const r=await fetch(route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});let data={};try{data=await r.json();}catch{}if(!r.ok)throw new Error(data.error||'No se ha podido enviar. Inténtalo de nuevo.');return data;};
 let feedbackOpenedAt=Date.now(),creatorCode='',creatorToken='',creatorFilter='all',creatorMessages=[];
 const ss={get:k=>{try{return sessionStorage.getItem(k);}catch{return null;}},set:(k,v)=>{try{v==null?sessionStorage.removeItem(k):sessionStorage.setItem(k,v);}catch{}}};
 document.addEventListener('click',e=>{if(e.target.closest?.('[data-menu-open="feedback"]')){feedbackOpenedAt=Date.now();$('feedbackStatus').textContent='';}},true);
 $('feedbackForm')?.addEventListener('submit',async e=>{e.preventDefault();const status=$('feedbackStatus'),btn=e.target.querySelector('button[type=submit]');const text=$('feedbackText').value.trim();if(text.length<8){status.textContent='Escribe al menos 8 caracteres.';return;}
  btn.disabled=true;status.textContent='Enviando…';
  try{await postJson('/api/feedback',{kind:document.querySelector('input[name=feedbackKind]:checked')?.value||'suggestion',text,name:$('feedbackName').value.trim()||$('playerName')?.value?.trim()||'',website:$('feedbackWebsite').value,elapsed:Date.now()-feedbackOpenedAt,ua:navigator.userAgent.slice(0,120)});
   status.textContent='¡Gracias! Mensaje enviado.';$('feedbackText').value='';feedbackOpenedAt=Date.now();}
  catch(err){status.textContent=err.message;}finally{setTimeout(()=>{btn.disabled=false;},1500);}});
 if(ss.get('pucela.creator')==='1')$('creatorPanelBtn').hidden=false;
 $('creatorCodeForm')?.addEventListener('submit',async e=>{e.preventDefault();const code=$('creatorCode').value.trim(),status=$('creatorCodeStatus');if(!code)return;status.textContent='Comprobando…';
  try{await postJson('/api/creator/code',{code});creatorCode=code;ss.set('pucela.creator','1');$('creatorPanelBtn').hidden=false;status.textContent='Código correcto. Abre el panel de creador.';$('creatorCode').value='';}
  catch(err){status.textContent=err.message;}});
 const fmt=t=>new Date(t).toLocaleString('es-ES',{dateStyle:'short',timeStyle:'short'});
 function renderInbox(meta){const list=$('creatorList');const shown=creatorMessages.filter(m=>creatorFilter==='all'||m.kind===creatorFilter);
  $('creatorMeta').textContent=`${meta?.total??creatorMessages.length} mensajes${meta&&!meta.persistent?' · ⚠ sin almacenamiento persistente (configura DATA_DIR con un volumen)':''}`;
  list.replaceChildren(...shown.map(m=>{const el=document.createElement('article');el.className='creator-msg '+m.kind;const head=document.createElement('header');head.textContent=`${m.kind==='bug'?'🐞 Bug':'💡 Sugerencia'} · ${m.name||'Anónimo'} · ${fmt(m.at)}`;const p=document.createElement('p');p.textContent=m.text;const del=document.createElement('button');del.type='button';del.className='secondary';del.textContent='Borrar';del.addEventListener('click',async()=>{try{await postJson('/api/creator/delete',{token:creatorToken,id:m.id});creatorMessages=creatorMessages.filter(x=>x.id!==m.id);renderInbox();}catch(err){$('creatorStatus').textContent=err.message;}});el.append(head,p,del);return el;}));
  if(!shown.length){const p=document.createElement('p');p.className='small-note';p.textContent='No hay mensajes.';list.append(p);}}
 async function loadInbox(){const data=await postJson('/api/creator/messages',{token:creatorToken});creatorMessages=data.messages||[];$('creatorLogin').hidden=true;$('creatorInbox').hidden=false;renderInbox(data);}
 $('creatorLogin')?.addEventListener('submit',async e=>{e.preventDefault();const status=$('creatorStatus');if(!creatorCode){status.textContent='Vuelve a introducir el código de creador en Ajustes.';return;}status.textContent='Entrando…';
  try{const r=await postJson('/api/creator/login',{code:creatorCode,password:$('creatorPassword').value});creatorToken=r.token;$('creatorPassword').value='';status.textContent='';await loadInbox();}catch(err){status.textContent=err.message;}});
 $('creatorRefresh')?.addEventListener('click',()=>loadInbox().catch(err=>{$('creatorStatus').textContent=err.message;$('creatorInbox').hidden=true;$('creatorLogin').hidden=false;}));
 $('creatorLogout')?.addEventListener('click',()=>{creatorToken='';creatorMessages=[];$('creatorInbox').hidden=true;$('creatorLogin').hidden=false;});
 document.querySelectorAll('[data-creator-filter]').forEach(b=>b.addEventListener('click',()=>{creatorFilter=b.dataset.creatorFilter;document.querySelectorAll('[data-creator-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderInbox();}));
}

// ---------------------------------------------------------------- 16.5 · Rueda de gestos
// Mantén B (o toca 😀 en móvil): rueda de 8 huecos con bailes y emojis de tu taquilla.
// Señala uno con el ratón y suelta B, pulsa su número (1-8) o haz clic/toca. Los huecos
// se eligen en Personalización › Gestos.
const WHEEL_KEY='pucela.wheel',DANCE_ICONS=['','👋','🦘','🌀','🕺','👏'];
function wheelSlots(){let w=null;try{w=JSON.parse(localStorage.getItem(WHEEL_KEY)||'null');}catch{}return Array.isArray(w)&&w.length===8?w.map(x=>gestureInfo(x)?x:''):[...WHEEL_DEFAULT];}
function saveWheel(w){try{localStorage.setItem(WHEEL_KEY,JSON.stringify(w));}catch{}renderWheelSelects();}
function addToWheel(g){const w=wheelSlots();if(w.includes(g)){toast('Ya lo tienes en la rueda (B).');return;}const i=w.indexOf('');w[i>=0?i:7]=g;saveWheel(w);toast(`${gestureInfo(g)?.icon||''} Añadido a tu rueda de gestos (B).`);}
const gestureOK=g=>{const i=gestureInfo(g);return !!i&&passAllows(i.field,i.value,passProgress());};
const gestureIcon=i=>i.kind==='emoji'?i.icon:DANCE_ICONS[i.value]||'💃';
function wheelChoices(){return [['','— Vacío —'],...EMOTES.slice(1).map((n,k)=>['d'+(k+1),`${DANCE_ICONS[k+1]} Baile · ${n}`]),...EMOJIS.map((m,k)=>['e'+k,`${m.e} Emoji · ${m.n}`])];}
function renderWheelSelects(){const w=wheelSlots();for(let i=0;i<8;i++){const el=$('wheel'+i);if(!el)continue;el.innerHTML=wheelChoices().map(([v,n])=>{const ok=!v||gestureOK(v),r=v&&!ok?rewardFor(gestureInfo(v).field,gestureInfo(v).value):null;return `<option value="${v}" ${v===w[i]?'selected':''} ${ok?'':'disabled'}>${ok?esc(n):`🔒 ${esc(n)}${r?` · nivel ${r.level}`:''}`}</option>`;}).join('');el.value=w[i];}}
for(let i=0;i<8;i++)$('wheel'+i)?.addEventListener('input',e=>{const w=wheelSlots();w[i]=e.target.value;saveWheel(w);});
renderWheelSelects();
const wheel={open:false,sel:-1,via:null};
const wheelEl=document.createElement('div');wheelEl.id='gestureWheel';wheelEl.hidden=true;wheelEl.setAttribute('role','dialog');wheelEl.setAttribute('aria-label','Rueda de gestos');document.body.appendChild(wheelEl);
const gestureBtn=document.createElement('button');gestureBtn.id='gestureBtn';gestureBtn.type='button';gestureBtn.hidden=true;gestureBtn.setAttribute('aria-label','Gestos (B)');gestureBtn.innerHTML='😀<small>B</small>';document.body.appendChild(gestureBtn);
const canGesture=()=>!!state&&(state.phase==='lobby'||state.phase==='game'&&state.me.alive)&&!modalKind&&!mapMode&&document.documentElement.dataset.scene!=='menu';
function renderWheel(){const slots=wheelSlots(),cur=wheel.sel>=0?gestureInfo(slots[wheel.sel]):null;
 wheelEl.innerHTML=`<div class="gw-ring">${slots.map((g,i)=>{const info=gestureInfo(g),a=i/8*Math.PI*2-Math.PI/2,ok=!!g&&gestureOK(g);return `<button type="button" class="gw-slot${i===wheel.sel?' sel':''}${ok?'':' locked'}" data-gw="${i}" style="left:${50+Math.cos(a)*37}%;top:${50+Math.sin(a)*37}%"><span class="gw-key">${i+1}</span><span class="gw-icon">${info?gestureIcon(info):'＋'}</span><b>${info?esc(info.label):'Vacío'}</b>${info&&!ok?'<i>🔒</i>':''}</button>`;}).join('')}
 <div class="gw-center"><b>${cur?esc(cur.label):'Gestos'}</b><small>${wheel.via==='key'?'Señala y suelta B':'Toca uno para usarlo'}</small><small class="gw-hint">Elige los huecos en Personalización › Gestos</small></div></div>`;}
function openWheel(via){if(wheel.open||!canGesture())return;wheel.open=true;wheel.via=via;wheel.sel=-1;renderWheel();wheelEl.hidden=false;keys.clear();inputDirty=true;nextPulse=0;pump();}
function closeWheel(play){if(!wheel.open)return;const g=wheelSlots()[wheel.sel];wheel.open=false;wheelEl.hidden=true;if(play&&wheel.sel>=0)doGesture(g);}
function doGesture(g){if(!g){toast('Ese hueco está vacío: elígelo en Personalización › Gestos.');return;}if(!gestureOK(g)){const i=gestureInfo(g),r=i&&rewardFor(i.field,i.value);toast(`🔒 Se desbloquea en el pase${r?` (nivel ${r.level})`:''}.`);return;}act('gesture',{g}).catch(e=>toast(e.message));}
document.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
 if(k==='b'&&!e.repeat){e.preventDefault();openWheel('key');return;}
 if(wheel.open&&/^[1-8]$/.test(k)&&!e.repeat){e.preventDefault();e.stopImmediatePropagation();wheel.sel=Number(k)-1;closeWheel(true);return;}
 if(wheel.open&&k==='escape'){e.stopImmediatePropagation();closeWheel(false);}},true);
document.addEventListener('keyup',e=>{if(e.key.toLowerCase()==='b'&&wheel.open&&wheel.via==='key')closeWheel(true);});
document.addEventListener('mousemove',e=>{if(!wheel.open||wheel.via!=='key')return;const r=wheelEl.querySelector('.gw-ring')?.getBoundingClientRect();if(!r)return;const dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);let sel=-1;if(Math.hypot(dx,dy)>r.width*.16){const a=Math.atan2(dy,dx)+Math.PI/2;sel=((Math.round(a/(Math.PI*2)*8)%8)+8)%8;}if(sel!==wheel.sel){wheel.sel=sel;renderWheel();}});
wheelEl.addEventListener('click',e=>{const b=e.target.closest('[data-gw]');if(b){wheel.sel=Number(b.dataset.gw);closeWheel(true);}else if(!e.target.closest('.gw-center'))closeWheel(false);});
gestureBtn.addEventListener('click',()=>wheel.open?closeWheel(false):openWheel('touch'));
setInterval(()=>{const on=touchMode&&canGesture();if(gestureBtn.hidden===on)gestureBtn.hidden=!on;if(wheel.open&&!canGesture())closeWheel(false);},250);

// ---------------------------------------------------------------- 16.5 · Pantalla de acceso
$('loginForm').addEventListener('submit',e=>{e.preventDefault();accountCall('login');});
$('registerBtn').addEventListener('click',()=>accountCall('register'));
$('guestBtn').addEventListener('click',()=>{try{sessionStorage.setItem(GUEST_KEY,'1');}catch{}showGate(false);});
$('logoutBtn').addEventListener('click',()=>{setAccount(null);storePass('');try{sessionStorage.removeItem(GUEST_KEY);}catch{}showGate(true);});
(async()=>{let guest=false;try{guest=sessionStorage.getItem(GUEST_KEY)==='1';}catch{}
 if(authToken){try{const r=await request('/api/account',{action:'me',auth:authToken},8000);setAccount(r);return;}catch(e){if(/caduc|incorrect|sesión/i.test(e.message)){setAccount(null);}else{accountName=accountName||'';$('accountChip').hidden=false;$('accountLabel').textContent='Cuenta (sin conexión)';return;}}}
 if(!guest&&!session&&!sessionStorage.getItem('sanagus.session'))showGate(true);})();
