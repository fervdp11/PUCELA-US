// Pase de temporada de PUCELA US: 50 niveles gratuitos, una recompensa
// cosmética por nivel y ninguna ventaja de juego. Este módulo lo comparten el
// servidor (que calcula la experiencia, firma el progreso y valida lo que cada
// jugador puede ponerse) y el cliente (que solo lo muestra).
export const LEVEL_XP=1000,MAX_LEVEL=50;
// Una partida nunca da más de media nivel, bonificaciones incluidas.
export const GAME_CAP=LEVEL_XP/2;
export const XP_RULES={finish:60,victory:150,task:12,voteRight:40,voteWrong:-15,repair:25,kill:30};

// Categorías nuevas: nadie empieza con mascota, efecto ni animación.
export const PETS=['Sin mascota','Topito','Patito','Gatito','Mini-robot','Fantasmita','Rana saltarina','Ardilla','Medusa'];
export const EFFECTS=['Sin efecto','Chispas','Hojas al viento','Burbujas','Estrellas','Notas musicales','Copos'];
export const EMOTES=['Sin animación','Saludo','Saltito','Giro','Baile','Aplauso'];

// Cuántas opciones de cada categoría están libres desde el principio (las
// primeras N). Colores, pantalones, mochilas, calzado y parches: todos libres.
export const FREE={hat:5,skin:5,glasses:5,accessory:5,pet:1,effect:1,emote:1,nameBg:2,nameColor:3,emoji:1};
// 16.5 · Emojis para la rueda de gestos (tecla B). La risa es gratis para todos; el resto, en el pase.
export const EMOJIS=[{e:'😂',n:'Risa'},{e:'🤡',n:'Payaso'},{e:'👎',n:'Pulgar abajo'},{e:'👍',n:'Pulgar arriba'},{e:'😱',n:'¡Susto!'},{e:'🤔',n:'Pensando'},{e:'😎',n:'Chulo'},{e:'👀',n:'Te vigilo'}];
const EMOJI_LEVELS=[0,2,4,6,11,17,24,33];
// Rueda: 8 huecos. 'dN' = baile/animación N de EMOTES, 'eN' = emoji N de EMOJIS, '' = vacío.
export const WHEEL_DEFAULT=['e0','d1','e1','d2','e2','d3','e3','d4'];
export function gestureInfo(g){const m=/^([de])(\d+)$/.exec(String(g||''));if(!m)return null;const i=Number(m[2]);if(m[1]==='d')return i>=1&&i<EMOTES.length?{kind:'dance',field:'emote',value:i,label:EMOTES[i],icon:'💃'}:null;return i<EMOJIS.length?{kind:'emoji',field:'emoji',value:i,label:EMOJIS[i].n,icon:EMOJIS[i].e}:null;}

// Una recompensa por nivel. field/value apuntan a la opción del armario.
const R=(field,value,name,kind)=>({field,value,name,kind});
export const REWARDS=[
 R('hat',5,'Coleta','Sombrero'),R('accessory',5,'Pañuelo','Complemento'),R('emote',1,'Saludo','Animación'),R('skin',5,'Bata de laboratorio','Ropa'),R('pet',1,'Topito','Mascota'),
 R('hat',6,'Brote','Sombrero'),R('hat',7,'Corona','Sombrero'),R('effect',1,'Chispas','Efecto'),R('hat',8,'Gorro de lana','Sombrero'),R('pet',2,'Patito','Mascota'),
 R('skin',6,'Ropa de profesor','Ropa'),R('accessory',6,'Medalla','Complemento'),R('emote',2,'Saltito','Animación'),R('hat',9,'Sombrero','Sombrero'),R('pet',3,'Gatito','Mascota'),
 R('glasses',5,'Visor panorámico','Gafas'),R('hat',10,'Orejas de gato','Sombrero'),R('effect',2,'Hojas al viento','Efecto'),R('accessory',7,'Pulsera','Complemento'),R('pet',4,'Mini-robot','Mascota'),
 R('skin',7,'Equipación deportiva','Ropa'),R('hat',11,'Birrete','Sombrero'),R('emote',3,'Giro','Animación'),R('accessory',10,'Máscara de zorro','Máscara'),R('pet',5,'Fantasmita','Mascota'),
 R('hat',13,'Boina','Sombrero'),R('accessory',8,'Estuche','Complemento'),R('effect',3,'Burbujas','Efecto'),R('hat',14,'Casco de bici','Sombrero'),R('pet',6,'Rana saltarina','Mascota'),
 R('skin',8,'Traje de gala','Ropa'),R('hat',16,'Gorro de explorador','Sombrero'),R('emote',4,'Baile','Animación'),R('accessory',9,'Collar','Complemento'),R('effect',4,'Estrellas','Efecto'),
 R('hat',12,'Sombrero de mago','Sombrero'),R('accessory',11,'Máscara de robot','Máscara'),R('skin',9,'Mono de mecánico','Ropa'),R('hat',17,'Gorro de chef','Sombrero'),R('pet',7,'Ardilla','Mascota'),
 R('accessory',12,'Pajarita','Complemento'),R('skin',10,'Chaqueta de explorador','Ropa'),R('emote',5,'Aplauso','Animación'),R('hat',15,'Diadema estrella','Sombrero'),R('effect',5,'Notas musicales','Efecto'),
 R('accessory',13,'Walkie-talkie','Complemento'),R('hat',18,'Casco espacial','Sombrero'),R('effect',6,'Copos','Efecto'),R('skin',11,'Traje espacial','Ropa'),R('pet',8,'Medusa','Mascota')
].map((r,i)=>({...r,level:i+1}));


// ---- Personalización del nombre: fondos y colores. Se desbloquean junto a la recompensa de su nivel
// (se reclaman a la vez, con el mismo botón), así que no quitan ninguna recompensa anterior.
// Fondo: a = colores, b = borde, g = brillo, an = animación (shift|pulse|shine), st = rayas, dbl = doble borde, stars = estrellas.
export const NAME_BGS=[
 {n:'Sin fondo',r:'Básico'},{n:'Perla',r:'Básico',a:['#f4efff','#e3d9ff'],b:'#7c4dff'},
 {n:'Violeta',r:'Común',a:['#5b3fb0']},{n:'Menta',r:'Común',a:['#2e8f78']},{n:'Coral',r:'Común',a:['#c9505a']},{n:'Cielo',r:'Común',a:['#2f78c4']},
 {n:'Atardecer',r:'Raro',a:['#ff7a5a','#a24dd6']},{n:'Océano',r:'Raro',a:['#1f9fd6','#2b3fa8']},{n:'Bosque',r:'Raro',a:['#3aa35a','#17513a']},{n:'Blanquivioleta',r:'Raro',a:['#ffffff','#a78bfa'],b:'#7c4dff'},{n:'Borde dorado',r:'Raro',a:['#2a1763'],b:'#f3c64a'},
 {n:'Neón violeta',r:'Épico',a:['#150a35'],b:'#b18cff',g:'#7c4dff',an:'pulse'},{n:'Doble borde',r:'Épico',a:['#3b1f86'],b:'#ffffff',dbl:1},{n:'Aurora',r:'Épico',a:['#3be0b0','#7c4dff','#ff6ec7'],an:'shift'},{n:'Caramelo',r:'Épico',a:['#ff9ec8','#ffffff'],st:1},{n:'Galaxia',r:'Épico',a:['#0d0629','#3b1f86'],b:'#c9b3ff',stars:1},{n:'Lava',r:'Épico',a:['#ff5a2a','#7a1020'],an:'shift'},{n:'Hielo',r:'Épico',a:['#e6f7ff','#7fd6ff'],b:'#ffffff',g:'#7fd6ff'},
 {n:'Arcoíris',r:'Legendario',a:['#ff5a6b','#ffe45f','#4be39b','#4aa8ff','#a678ff'],an:'shift'},{n:'Oro líquido',r:'Legendario',a:['#fff3a8','#e0a526','#fff3a8'],b:'#fff7d0',an:'shine'},{n:'Cristal violeta',r:'Legendario',a:['#c9b3ff','#7c4dff','#c9b3ff'],b:'#ffffff',g:'#b18cff',an:'shine'}
];
// Color de letras: a = uno o varios colores, g = brillo, an = animación (rainbow|shine).
export const NAME_COLORS=[
 {n:'Blanco',r:'Básico',a:['#ffffff']},{n:'Lila',r:'Básico',a:['#d9c9ff']},{n:'Crema',r:'Básico',a:['#fff3b0']},
 {n:'Menta',r:'Común',a:['#8bf5c8']},{n:'Rosa',r:'Común',a:['#ff9ec8']},{n:'Celeste',r:'Común',a:['#8fd8ff']},{n:'Naranja',r:'Común',a:['#ffb067']},{n:'Lima',r:'Común',a:['#c8ff6a']},{n:'Violeta intenso',r:'Raro',a:['#a678ff']},{n:'Coral',r:'Raro',a:['#ff7a7a']},
 {n:'Fuego',r:'Épico',a:['#fff3a8','#ff7a3d']},{n:'Hielo',r:'Épico',a:['#ffffff','#7fd6ff']},{n:'Arcoíris',r:'Legendario',a:['#ff5a6b','#ffe45f','#4be39b','#4aa8ff','#a678ff'],an:'rainbow'},{n:'Oro',r:'Legendario',a:['#fff3a8','#e0a526','#fff3a8'],an:'shine'},{n:'Neón',r:'Legendario',a:['#f3ecff'],g:'#9b7bff'},{n:'Estelar',r:'Legendario',a:['#c9b3ff','#ffffff','#c9b3ff'],an:'shine'}
];
const NB=[2,4,6,8,10,12,14,16,18,20,23,26,29,32,36,39,43,46,50],NC=[3,5,7,9,11,13,15,22,28,34,40,45,49];
export const NAME_REWARDS=[...NB.map((level,k)=>({field:'nameBg',value:k+2,name:'Fondo '+NAME_BGS[k+2].n,kind:'Fondo de nombre',level})),...NC.map((level,k)=>({field:'nameColor',value:k+3,name:'Letras '+NAME_COLORS[k+3].n,kind:'Color de nombre',level}))].sort((a,b)=>a.level-b.level);
EMOJI_LEVELS.forEach((level,i)=>{if(level)NAME_REWARDS.push({field:'emoji',value:i,name:'Emoji '+EMOJIS[i].e+' '+EMOJIS[i].n,kind:'Emoji',level});});NAME_REWARDS.sort((a,b)=>a.level-b.level);
export const nameRewardsAt=level=>NAME_REWARDS.filter(r=>r.level===level);
const hex=h=>{h=h.replace('#','');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);};
const lum=h=>{const [r,g,b]=hex(h);return .2126*r+.7152*g+.0722*b;};
export const contrast=(a,b)=>{const x=lum(a),y=lum(b),hi=Math.max(x,y),lo=Math.min(x,y);return (hi+.05)/(lo+.05);};
// Colores efectivos: si las letras no contrastan lo bastante con el fondo, se sustituyen por blanco o tinta oscura.
export function nameLook(bgIdx=0,colIdx=0){
 const bg=NAME_BGS[bgIdx]||NAME_BGS[0],col=NAME_COLORS[colIdx]||NAME_COLORS[0];
 // El color de las letras es siempre el elegido, independiente del fondo. Si contrasta poco,
 // la legibilidad la da un contorno del tono opuesto (no se sustituye el color).
 const text=col.a,safe=true,first=text[0],low=bg.a?Math.min(...bg.a.flatMap(b=>text.map(t=>contrast(b,t))))<3.2:false,dark=Math.min(...text.map(t=>contrast('#14082e',t)))>=Math.min(...text.map(t=>contrast('#ffffff',t))),ink=dark?(low?'#14082e':'#14082eee'):(low?'#ffffff':'#ffffffdd');
 return {bg,col,text,ink,low,glow:safe?col.g:null,an:safe?col.an:null,custom:bgIdx>0||colIdx>0};
}
const stops=(a,w)=>a.length===1?`${a[0]},${a[0]}`:a.map((c,i)=>`${c} ${Math.round(i/(a.length-1)*w)}%`).join(',');
// HTML: devuelve el span listo para insertar (el nombre ya debe venir escapado).
export function nameHtml(safeName,bgIdx=0,colIdx=0,extra=''){
 const L=nameLook(bgIdx,colIdx),b=L.bg,bgCss=b.a?`background:${b.st?`repeating-linear-gradient(45deg,${b.a[0]} 0 6px,${b.a[1]} 6px 12px)`:`linear-gradient(100deg,${stops(b.a,100)})`};background-size:${b.an?'220% 100%':'auto'};${b.b?`border:1.5px solid ${b.b};`:''}${b.dbl?'box-shadow:0 0 0 2px #3b1f86,0 0 0 3.5px #fff;':''}${b.g?`--nm-g:${b.g};`:''}`:'';
 const grad=L.text.length>1,txt=grad?`background:linear-gradient(90deg,${stops(L.text,100)});background-size:${L.an?'220% 100%':'100% 100%'};-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;`:`color:${L.text[0]};`;
 const cls=['nm',b.a?'nm-bg':'',b.an?'nm-'+b.an:'',b.stars?'nm-stars':'',L.an?'nm-t-'+L.an:'',L.glow?'nm-glow':''].filter(Boolean).join(' ');
 return `<span class="${cls}" style="${bgCss}${L.glow?`--nm-tg:${L.glow};`:''}${extra}"><span class="nm-t" style="${txt}--nm-ink:${L.ink}">${safeName}</span></span>`;
}
// Canvas: dibuja el nombre centrado en (x,y). `force` fuerza el color de las letras (p. ej. el rojo de un cómplice).
export function drawNameTag(c,txt,x,y,{bg=0,color=0,force=null,time=0,size=12,fallback='#f0f4e9'}={}){
 const L=nameLook(bg,color),b=L.bg;c.save();c.font=`700 ${size}px Segoe UI`;c.textAlign='center';c.textBaseline='alphabetic';c.lineJoin='round';
 const w=c.measureText(txt).width,padX=7,h=size+7,left=x-w/2-padX,top=y-size-2.5;
 if(b.a){const sh=b.an?((time/1200)%2)*(w+padX*2):0,g=c.createLinearGradient(left-sh,0,left+w+padX*2+(b.an?w+padX*2:0)-sh,0);b.a.forEach((col,i)=>g.addColorStop(b.a.length===1?i:i/(b.a.length-1),col));
  if(b.g){c.shadowColor=b.g;c.shadowBlur=b.an==='pulse'?5+3*Math.sin(time/300):6;}
  c.fillStyle=g;c.beginPath();c.roundRect(left,top,w+padX*2,h,h/2);c.fill();c.shadowBlur=0;
  if(b.st){c.save();c.clip();c.fillStyle=b.a[1];for(let k=-h;k<w+padX*2;k+=12){c.beginPath();c.moveTo(left+k,top+h);c.lineTo(left+k+6,top+h);c.lineTo(left+k+6+h,top);c.lineTo(left+k+h,top);c.fill();}c.restore();}
  if(b.stars){c.fillStyle='#ffffffcc';for(let k=0;k<5;k++)c.fillRect(left+6+((k*37)%Math.max(8,w+padX*2-10)),top+3+((k*5)%(h-6)),1.4,1.4);}
  if(b.b){c.lineWidth=1.5;c.strokeStyle=b.b;c.stroke();}
  if(b.dbl){c.lineWidth=1;c.strokeStyle='#fff';c.beginPath();c.roundRect(left-2,top-2,w+padX*2+4,h+4,h/2+2);c.stroke();}}
 const fill=force||(L.text.length>1?(()=>{const sh=L.an?((time/1000)%2)*w:0,g=c.createLinearGradient(x-w/2-sh,0,x+w/2+(L.an?w:0)-sh,0);L.text.forEach((col,i)=>g.addColorStop(i/(L.text.length-1),col));return g;})():L.text[0]);
 const plain=!L.custom&&!force;if(plain)c.fillStyle=fallback;
 c.lineWidth=L.low?3.4:3;c.strokeStyle=force?'#142831dd':b.a?(L.low?(L.ink==='#14082e'?'#14082ecc':'#ffffffcc'):(L.ink.startsWith('#14')?'#ffffff55':'#14082e99')):'#142831dd';c.strokeText(txt,x,y);
 if(L.glow){c.shadowColor=L.glow;c.shadowBlur=7;}
 c.fillStyle=plain?fallback:fill;c.fillText(txt,x,y);c.restore();
}

export function levelOf(xp=0){const total=Math.max(0,Math.floor(xp)||0),level=Math.min(MAX_LEVEL,Math.floor(total/LEVEL_XP));return {level,into:level>=MAX_LEVEL?LEVEL_XP:total-level*LEVEL_XP,need:LEVEL_XP,total,max:level>=MAX_LEVEL};}
// Los niveles recogidos se guardan como máscara de bits (50 bits caben en un
// número de JavaScript sin perder precisión). Sin operadores de bits: son de 32.
export const hasClaimed=(mask,level)=>Math.floor((mask||0)/2**(level-1))%2===1;
export const withClaim=(mask,level)=>hasClaimed(mask,level)?mask:(mask||0)+2**(level-1);
export const emptyProgress=()=>({xp:0,claimed:0});
export function cleanProgress(raw){const xp=Number.isFinite(raw?.xp)?Math.max(0,Math.min(MAX_LEVEL*LEVEL_XP,Math.floor(raw.xp))):0,claimed=Number.isFinite(raw?.claimed)?Math.max(0,Math.min(2**MAX_LEVEL-1,Math.floor(raw.claimed))):0;return {xp,claimed};}
export function rewardFor(field,value){return REWARDS.find(r=>r.field===field&&r.value===value)||NAME_REWARDS.find(r=>r.field===field&&r.value===value)||null;}
// ¿Puede este jugador ponerse esta opción? Libre o recompensa ya recogida.
export function allowed(field,value,progress){if(!(field in FREE))return true;if(!Number.isInteger(value)||value<FREE[field])return true;const reward=rewardFor(field,value);return !!reward&&hasClaimed(progress?.claimed,reward.level);}
export function lockAppearance(appearance,progress){const out={...appearance};for(const field of Object.keys(FREE))if(!allowed(field,out[field]??0,progress))out[field]=0;return out;}

// Desglose de experiencia de una partida. Solo lo calcula el servidor con los
// roles reales y el historial completo de votos, y solo se muestra al final.
export function computeAward(s){
 const rows=[];const add=(id,label,count,each)=>{if(count>0)rows.push({id,label,count,each,xp:count*each});};
 add('finish','Partida completada',1,XP_RULES.finish);
 if(s.won)add('victory','Victoria',1,XP_RULES.victory);
 add('tasks','Tareas',s.tasks||0,XP_RULES.task);
 add('voteRight','Votos acertados',s.votesRight||0,XP_RULES.voteRight);
 add('voteWrong','Votos incorrectos',s.votesWrong||0,XP_RULES.voteWrong);
 add('repairs','Reparaciones',s.repairs||0,XP_RULES.repair);
 if(s.impostor)add('kills','Eliminaciones',s.kills||0,XP_RULES.kill);
 const raw=rows.reduce((n,r)=>n+r.xp,0),total=Math.max(0,Math.min(GAME_CAP,raw));
 return {rows,raw,total,capped:raw>GAME_CAP};
}

// Formato del progreso firmado: base64url(JSON) + "." + firma. El cliente
// puede leerlo para dibujar la barra; solo el servidor puede emitirlo.
const b64=s=>{const bytes=new TextEncoder().encode(s);let bin='';for(const b of bytes)bin+=String.fromCharCode(b);return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');};
const unb64=s=>{const bin=atob(String(s).replace(/-/g,'+').replace(/_/g,'/'));return new TextDecoder().decode(Uint8Array.from(bin,c=>c.charCodeAt(0)));};
export function encodePayload(progress){const p=cleanProgress(progress);return b64(JSON.stringify({v:1,x:p.xp,c:p.claimed}));}
export function readToken(token){try{const [body]=String(token||'').split('.');const j=JSON.parse(unb64(body));if(j?.v!==1)return emptyProgress();return cleanProgress({xp:j.x,claimed:j.c});}catch{return emptyProgress();}}
