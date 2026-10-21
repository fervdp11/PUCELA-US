import {W,H,TAU,INK,clamp,rr,ink,shade,txt,glow,icon,card} from './task-kit.js';
import {knobAt,sliderAt,symbol,A0,ASPAN,dialDraw} from './themed-tasks.js';

// Catálogo de tareas temáticas: para cada (mapa, tipo) dice qué juego se monta,
// cómo se llama y cómo se ve. Los tipos son los del servidor.
const T=(title,brief)=>({title,brief});
const TEXTS={
 'club:chalk':T('PISTA / LIMPIEZA','Pasa la fregona por los derrames de la pista de baile.'),
 'club:lights':T('ESCENARIO / FOCOS','Toca cada foco para girarlo hasta que apunte al escenario.'),
 'club:bell':T('SAMPLER / PADS','Escucha el patrón y repítelo en los pads.'),
 'club:book':T('CABINA / VINILOS','Saca el disco pedido y colócalo en el tocadiscos.'),
 'club:code':T('CAMERINO / ACCESO','Teclea el código de la nota para abrir el camerino.'),
 'club:stock':T('BARRA / BOTELLERO','Coloca cada botella en su hueco del botellero.'),
 'club:trash':T('BARRA / COMPACTADORA','Tira los restos a la compactadora y baja la palanca.'),
 'house:washer':T('LAVADERO / LAVADORA','Mete la ropa de etiqueta verde, cierra la puerta, elige el programa de la nota y pulsa inicio.'),
 'house:cook':T('COCINA / TORTILLA','Casca los tres huevos, remueve, pon el fuego de la receta y dale la vuelta.'),
 'house:stock':T('COCINA / NEVERA','Coloca cada alimento en su hueco de la nevera.'),
 'house:chalk':T('COCINA / FREGADERO','Frota los platos con el estropajo hasta quitar todas las manchas.'),
 'house:power':T('LAVADERO / CUADRO ELÉCTRICO','Cambia los fusibles fundidos y sube los diferenciales en el orden del parte.'),
 'house:appliance':T('COCINA / TOSTADORA','Quita los tornillos en orden, cambia la resistencia quemada y prueba la tostadora.'),
 'house:supplies':T('CASA / ORDENAR','Lleva cada cosa a su caja: ropa, juguetes o cocina.'),
 'house:refill':T('COMEDOR / CAFETERA','Mantén pulsado para llenar el depósito justo hasta la marca verde.'),
 'house:wires':T('SALÓN / TELEVISIÓN','Conecta cada cable de la tele a la entrada de su mismo color.'),
 'house:bell':T('SALÓN / PIANO','Escucha la melodía y repítela en las teclas.'),
 'house:code':T('RECIBIDOR / ALARMA','Teclea el código de la nota para desarmar la alarma.'),
 'house:download':T('DESPACHO / COPIA DE FOTOS','Marca la ruta segura entre aparatos, enchufa el cable y espera la copia.'),
 'house:computer':T('CUARTO DE JUEGOS / RECREATIVA','Copia en los interruptores el patrón de la pantalla.'),
 'house:papers':T('CUARTO DE JUEGOS / JUGUETES','Recoge los juguetes del suelo y guárdalos en el baúl.'),
 'house:bath':T('BAÑO / AGUA','Gira cada grifo hasta que el depósito llegue a la marca verde.'),
 'house:book':T('ESTUDIO / ESTANTERÍA','Saca el libro pedido y déjalo en la mesilla.'),
 'house:lights':T('GARAJE / FOCOS','Toca cada foco para girarlo hasta que apunte al banco de trabajo.'),
 'house:speaker':T('DESPACHO / WIFI','Conecta cada aparato a su puerto del router y ajusta la señal a la marca verde.'),
 'house:trash':T('GARAJE / BASURA','Tira las bolsas al contenedor y baja la palanca.'),
 'gym:refill':T('BAR / BATIDOS','Mantén pulsado para llenar el dispensador justo hasta la marca verde.'),
 'club:refill':T('BARRA / HIELO','Mantén pulsado para llenar la cubitera justo hasta la marca verde.'),
 'gym:folders':T('RECEPCIÓN / FICHAS','Archiva las fichas de socios por orden alfabético.'),
  'gym:lights':T('SEGURIDAD / FOCOS','Toca cada foco para girarlo hasta que apunte a la pista.'),
 'gym:computer':T('ALMACÉN / SERVIDOR','Copia en los interruptores el patrón que muestra la pantalla.'),
 'gym:speaker':T('ACTIVIDADES / AUDIO','Conecta cada canal a su entrada y ajusta la ganancia a la marca verde.'),
 'gym:code':T('RECEPCIÓN / TORNOS','Teclea el código de la nota para reiniciar los tornos.'),
 'gym:treadmill':T('CINTA / MANTENIMIENTO','Ajusta velocidad e inclinación al parte y deja la cinta rodando unos segundos.'),
 'gym:weights':T('POLEA / CORREA','Pasa la correa por las poleas en el orden del parte y aprieta los tres tornillos.'),
 'gym:plates':T('SOPORTE / DISCOS','Coloca los discos en el soporte, del más ligero al más pesado.'),
 'gym:scoreboard':T('MARCADOR / RESULTADO','Gira los tambores hasta copiar el resultado del parte.'),
 'gym:ventilation':T('EXTRACCIÓN / FILTROS','Saca los cuatro filtros sucios y gira las dos ruedas hasta su marca verde.'),
 'gym:lockers':T('TAQUILLAS / LLAVES','Lleva cada llave a la taquilla con su misma figura.'),
 'gym:equipment':T('MATERIAL / REVISIÓN','Aparta al cajón solo las pelotas dañadas.'),
 'gym:basketball':T('CANASTA / TIRO','Tira del balón hacia atrás y suéltalo para encestar en las tres alturas.'),
 'gym:spinning':T('BICICLETA / RESISTENCIA','Fija la resistencia y pedalea tres veces cuando la barra esté en verde.'),
 'gym:hydration':T('FUENTE / MUESTRAS','Mantén pulsado cada grifo hasta la línea verde sin pasarte.'),
 'gym:wires':T('CUADRO / SALA DE MÁQUINAS','Arrastra cada cable al conector de su mismo color y símbolo.'),
 'club:speaker':T('AUDIO / PATCHBAY','Conecta cada canal a su entrada y ajusta la ganancia a la marca verde.'),
 'club:bath':T('VENTILACIÓN / CAUDAL','Desliza cada compuerta hasta la marca verde.'),
 'club:calibrate':T('LUCES / CALIBRACIÓN','Gira cada mando hasta su marca verde.'),
 'club:dj':T('MESA / MEZCLAS','Iguala los tres canales a su marca y toca en la zona verde para enganchar el pulso.'),
 'club:vip':T('CONTROL / ACCESO VIP','Ordena las pulseras del 1 al 4 y pásalas por el lector a buen ritmo.'),
 'gym:vip':T('TORNO / ABONOS','Ordena los abonos del 1 al 4 y pásalos por el torno a buen ritmo.'),
 'club:power':T('CUADRO / GENERAL','Cambia los fusibles fundidos y conecta los magnetotérmicos en el orden del parte.'),
 'gym:power':T('CUADRO / SALA','Cambia los fusibles fundidos y conecta los magnetotérmicos en el orden del parte.'),
 'club:download':T('ENLACE / DATOS','Marca la ruta segura nodo a nodo, enchufa el conector y espera la transferencia.'),
 'gym:download':T('MARCADOR / DATOS','Marca la ruta segura nodo a nodo, enchufa el conector y espera la transferencia.'),
};

const sheetDraw=(col)=>(c,v,x,y,s)=>{icon(c,'sheet',x,y,s,{});txt(c,String(v),x,y+s*.06,{size:s*.3,color:'#25303b'});};
const NAMES={gym:['Aitana','Bruno','Carla','Diego','Elena']};
const FOLDERCOL=['#e0a93a','#d6574a','#4b86d6','#4fb06a','#8a5ad6'];
const folderDraw=(names)=>(c,v,x,y,s)=>{icon(c,'folder',x,y-4,s,{color:FOLDERCOL[v%5]});txt(c,names[v],x,y+s*.36,{size:11,color:'#1b232b',stroke:'rgba(255,255,255,.7)'});};
const SORT={
 'gym:plates':{inLabel:'DISCOS SUELTOS',slotName:i=>'Posición '+(i+1),dir:'MÁS LIGERO  ➜  MÁS PESADO',trayFill:'#3b546e',draw:(c,v,x,y,s)=>{icon(c,'plate',x,y,s*(.62+v/70),{color:v>=20?'#c0392b':v>=10?'#3b6fc0':'#46515e',text:v+' kg'});}},
 'gym:folders':{inLabel:'FICHAS DE SOCIOS',slotName:i=>'Cajón '+(i+1),dir:'A  ➜  Z',draw:null,names:NAMES.gym,trayFill:'#3b546e'},
};
for(const k of Object.keys(SORT)){const d=SORT[k];if(!d.draw)d.draw=folderDraw(d.names);}

const BOTTLE=['#5fe3a1','#b8e34f','#f0a53a','#e0457a','#8fd3f0','#5a5bd6'];
const stockClub=c=>({labels:c.labels,tray:'CAJA DE BOTELLAS',shelfFill:'#3a2a63',plank:'#6a3fa0',draw:(ctx,id,x,y,s)=>icon(ctx,'bottle',x,y,s,{color:BOTTLE[id]})});
const FOOD=['milk','cheese','apple','carrot','box','bottle'],FOODCOL=['#3b82f6','#f5c842','#d8343c','#f2862a','#f4e7c8','#f0a53a'];
const stockHouse=c=>({labels:c.labels,tray:'BOLSA DE LA COMPRA',shelfFill:'#dfe9ef',plank:'#a9bcc8',draw:(ctx,id,x,y,s)=>icon(ctx,FOOD[id],x,y,s,{color:FOODCOL[id]})});

const BINS={
 house:{labels:['Ropa','Juguetes','Cocina'],bin:['#4b86d6','#e0a93a','#3f9a5a'],icons:[['shirt','sock'],['teddy','toycar'],['mug','dish']],colors:[['#e8453a','#f5d033'],['#b07a46','#3b82f6'],['#e9eef5','#4b86d6']]}
};

const CLUBTRASH=['glass','bottle','crumple','ice'],PARKTRASH=['bag','crumple','can','bag'];
const COLLECT={
 'house:papers':{icon:i=>['teddy','toycar','block'][i%3],color:i=>['#b07a46','#e8453a','#4b86d6','#f5d033','#3fb07a'][i%5],binLabel:'BAÚL DE JUGUETES',binFill:'#b06a3a',floor:'#d9b77e',ground:(c,x,y,w,h)=>{c.strokeStyle='rgba(90,60,30,.18)';c.lineWidth=2;for(let i=1;i<7;i++){c.beginPath();c.moveTo(x+i*w/7,y+8);c.lineTo(x+i*w/7,y+h-8);c.stroke();}}},
 'club:trash':{lever:true,icon:i=>CLUBTRASH[i%4],color:i=>['#7fe0ff','#e0a93a','#f1ecdb','#fff'][i%4]&&(i%4===0?(i%8<4?'#7fe0ff':'#ff9be0'):i%4===1?'#4fd69a':undefined),binLabel:'COMPACTADORA',binFill:'#7b3fd6',floor:'#3a2a63'},
 'house:trash':{lever:true,icon:i=>PARKTRASH[i%4],binLabel:'CONTENEDOR',binFill:'#3f8a3a',floor:'#9aa3ab',ground:(c,x,y,w,h)=>{c.fillStyle='rgba(60,60,60,.18)';for(let i=0;i<30;i++){c.beginPath();c.arc(x+(i*71)%w,y+(i*43)%h,2+(i%4),0,TAU);c.fill();}c.fillStyle='rgba(40,30,20,.25)';c.beginPath();c.ellipse(x+w*.3,y+h*.7,60,20,0,0,TAU);c.fill();}}
};

// --- Superficies a limpiar ---
const seedRand=(s)=>{const x=Math.sin(s*127.1)*43758.5453;return x-Math.floor(x);};
const SCRUB={
 house:{
  surface:(c,hw,B)=>{rr(c,B.x-16,B.y-16,B.w+32,B.h+32,16);ink(c,'#c9d2d8',4);rr(c,B.x,B.y,B.w,B.h,12);ink(c,hw.paint.linear(0,B.y,0,B.y+B.h,['0:#9fb3c0','1:#6f8594']),3);
   c.fillStyle='rgba(255,255,255,.12)';for(let i=0;i<5;i++){c.beginPath();c.ellipse(B.x+70+i*105,B.y+B.h-30,40,8,0,0,TAU);c.fill();}
   for(const [px,py,r] of [[B.x+150,B.y+150,118],[B.x+410,B.y+150,118]]){c.fillStyle='rgba(0,0,0,.25)';c.beginPath();c.ellipse(px+6,py+10,r,r*.86,0,0,TAU);c.fill();c.beginPath();c.ellipse(px,py,r,r*.86,0,0,TAU);ink(c,'#f7f8fa',3.4);c.beginPath();c.ellipse(px,py,r*.68,r*.58,0,0,TAU);c.strokeStyle='#4b86d6';c.lineWidth=3;c.stroke();c.strokeStyle='rgba(75,134,214,.4)';c.lineWidth=8;c.beginPath();c.ellipse(px,py,r*.86,r*.74,0,0,TAU);c.stroke();c.fillStyle='rgba(255,255,255,.7)';c.beginPath();c.ellipse(px-r*.4,py-r*.42,r*.18,r*.06,-.5,0,TAU);c.fill();}
   c.beginPath();c.arc(B.x+B.w-24,B.y+24,12,0,TAU);ink(c,'#8a96a2',2.4);},
  mark:(c,m)=>{c.globalAlpha=Math.min(1,m.amt)*.92;const col=seedRand(m.seed)>.5?'#c0442a':'#8a5a2a';c.fillStyle=col;for(let k=0;k<5;k++){c.beginPath();c.ellipse(m.x+(seedRand(m.seed+k)-.5)*42,m.y+(seedRand(m.seed+k+4)-.5)*28,8+seedRand(m.seed+k+2)*13,6+seedRand(m.seed+k+6)*8,seedRand(m.seed+k)*3,0,TAU);c.fill();}c.fillStyle='rgba(255,255,255,.35)';c.beginPath();c.arc(m.x-6,m.y-6,4,0,TAU);c.fill();c.globalAlpha=1;},
  tool:(c,x,y,on)=>{c.save();c.translate(x,y);c.rotate(on?.06:-.12);c.fillStyle='rgba(0,0,0,.3)';rr(c,-38,-10,76,44,10);c.fill();rr(c,-38,-18,76,30,10);ink(c,'#f5d033',3);rr(c,-38,6,76,16,6);ink(c,'#3f9a3a',3);if(on){c.fillStyle='rgba(255,255,255,.8)';for(let k=0;k<5;k++){c.beginPath();c.arc(-30+k*15,-22-(k%2)*6,4+(k%3)*2,0,TAU);c.fill();}}c.restore();}
 },
 club:{
  surface:(c,hw,B,t)=>{rr(c,B.x-12,B.y-12,B.w+24,B.h+24,12);ink(c,'#1b1236',4,'#ff5fd2');const cols=['#7b3fd6','#c0398a','#2f78a8','#3fb0b0'];for(let i=0;i<6;i++)for(let j=0;j<4;j++){c.fillStyle=cols[(i+j)%4];const p=.55+.25*Math.sin(t/500+i*1.3+j);c.globalAlpha=p;c.fillRect(B.x+i*B.w/6+2,B.y+j*B.h/4+2,B.w/6-4,B.h/4-4);}c.globalAlpha=1;},
  mark:(c,m)=>{c.globalAlpha=Math.min(1,m.amt)*.95;const col=seedRand(m.seed)>.5?'#6cff9a':'#ff6a9a';c.fillStyle=col;c.beginPath();for(let k=0;k<10;k++){const a=k*TAU/10,r=22+seedRand(m.seed+k)*18;c.lineTo(m.x+Math.cos(a)*r*1.3,m.y+Math.sin(a)*r*.85);}c.closePath();ink(c,col,2,'rgba(0,0,0,.4)');c.fillStyle='rgba(255,255,255,.55)';c.beginPath();c.ellipse(m.x-8,m.y-6,8,4,-.5,0,TAU);c.fill();c.globalAlpha=1;},
  tool:(c,x,y,on)=>{c.save();c.translate(x,y);c.rotate(.15);c.strokeStyle=INK;c.lineWidth=9;c.lineCap='round';c.beginPath();c.moveTo(40,-120);c.lineTo(4,-10);c.stroke();c.strokeStyle='#d9a566';c.lineWidth=5;c.stroke();rr(c,-44,-14,88,30,12);ink(c,'#e8e8f0',3);c.strokeStyle='#bfc0d0';c.lineWidth=2;for(let i=-3;i<=3;i++){c.beginPath();c.moveTo(i*11,6);c.lineTo(i*11+(i>0?3:-3),26);c.stroke();}c.restore();}
 }
};

// --- Piezas orientables ---
const lampPiece=(beam,body)=>(c,s,ok,t)=>{
 c.save();const g=c.createLinearGradient(0,-s*.1,0,-s*.95);g.addColorStop(0,beam);g.addColorStop(1,'rgba(255,255,255,0)');c.globalAlpha=ok?.85:.45;c.fillStyle=g;c.beginPath();c.moveTo(-s*.12,-s*.12);c.lineTo(-s*.4,-s*.95);c.lineTo(s*.4,-s*.95);c.lineTo(s*.12,-s*.12);c.closePath();c.fill();c.restore();
 rr(c,-s*.2,-s*.16,s*.4,s*.46,s*.08);ink(c,body,3);c.beginPath();c.ellipse(0,-s*.14,s*.2,s*.07,0,0,TAU);ink(c,'#fff6c0',2.5);rr(c,-s*.12,s*.3,s*.24,s*.12,3);ink(c,'#3a4552',2.5);
};
const deskPiece=(wood,seat)=>(c,s)=>{
 rr(c,-s*.36,-s*.34,s*.72,s*.42,s*.05);ink(c,wood,3);rr(c,-s*.16,-s*.28,s*.32,s*.2,3);ink(c,'#f6f1e1',2);c.fillStyle='#d6574a';c.fillRect(-s*.1,-s*.24,s*.2,s*.04);
 rr(c,-s*.2,s*.14,s*.4,s*.26,s*.1);ink(c,seat,3);rr(c,-s*.2,s*.34,s*.4,s*.1,s*.04);ink(c,shade(seat,-.25),2.5);
 c.fillStyle='rgba(255,255,255,.8)';c.beginPath();c.moveTo(0,-s*.46);c.lineTo(s*.07,-s*.38);c.lineTo(-s*.07,-s*.38);c.closePath();c.fill();
};
const benchPiece=(c,s)=>{
 rr(c,-s*.42,s*.16,s*.84,s*.12,s*.04);ink(c,'#7a5a36',3);rr(c,-s*.42,-s*.04,s*.84,s*.16,s*.04);ink(c,'#b98a50',3);rr(c,-s*.42,-s*.2,s*.84,s*.12,s*.04);ink(c,'#b98a50',3);
 c.fillStyle='#4a3a2a';c.fillRect(-s*.38,s*.28,s*.06,s*.1);c.fillRect(s*.32,s*.28,s*.06,s*.1);
 c.fillStyle='rgba(255,255,255,.85)';c.beginPath();c.moveTo(0,-s*.46);c.lineTo(s*.07,-s*.36);c.lineTo(-s*.07,-s*.36);c.closePath();c.fill();
};
const ROT={
 'club:lights':{tile:'#2a1f4d',okFill:'#46308a',piece:lampPiece('rgba(255,95,210,.9)','#ff5fd2'),stage:(c,t)=>{rr(c,40,8,W-80,36,6);ink(c,'#3a2a63',3,'#ff5fd2');txt(c,'ESCENARIO',W/2,26,{size:14,color:'#fff',weight:800});glow(c,W/2,26,70,'#ff5fd2',.25);}},
 'house:lights':{tile:'#7d8790',okFill:'#9fb3a0',piece:lampPiece('rgba(255,236,170,.9)','#f2a93b'),stage:c=>{rr(c,40,8,W-80,36,6);ink(c,'#8a5a32',3);txt(c,'BANCO DE TRABAJO',W/2,26,{size:14,color:'#fff3dc',weight:800});}},
 'gym:lights':{tile:'#2f4660',okFill:'#4a6a8a',piece:lampPiece('rgba(255,200,120,.9)','#ffb347'),stage:c=>{rr(c,40,8,W-80,36,6);ink(c,'#3b546e',3,'#ffb347');txt(c,'PISTA',W/2,26,{size:14,color:'#fff',weight:800});}},
};

// --- Memoria ---
const bellBody=(c,p,t,col)=>{
 const ang=Math.sin(t/55)*p.sw*.3;c.save();c.translate(p.x,p.y-70);c.rotate(ang);
 if(p.glow>0)glow(c,0,70,90,'#ffe27a',p.glow*.7);
 c.strokeStyle=INK;c.lineWidth=6;c.beginPath();c.moveTo(0,0);c.lineTo(0,24);c.stroke();
 c.beginPath();c.moveTo(-14,28);c.quadraticCurveTo(-18,10,0,10);c.quadraticCurveTo(18,10,14,28);c.quadraticCurveTo(46,56,56,112);c.lineTo(-56,112);c.quadraticCurveTo(-46,56,-14,28);ink(c,col,3.5);
 c.fillStyle='rgba(255,255,255,.35)';c.beginPath();c.ellipse(-20,66,6,26,.2,0,TAU);c.fill();
 c.beginPath();c.arc(0,120,10,0,TAU);ink(c,'#6a4a1a',3);c.restore();
};
const MEM={
 house:{pos:i=>({x:122+i*132,y:262}),hit:{w:124,h:230},scene:(c)=>{rr(c,40,60,W-80,330,26);ink(c,'#24160e',4);rr(c,56,74,W-112,58,14);ink(c,'#3a2416',3);c.fillStyle='rgba(255,255,255,.08)';c.fillRect(56,74,W-112,16);rr(c,252,82,136,40,6);ink(c,'#f4ecd4',2.4);for(let k=0;k<5;k++){c.strokeStyle='#3a3a3a';c.lineWidth=1;c.beginPath();c.moveTo(262,90+k*6);c.lineTo(378,90+k*6);c.stroke();}txt(c,'♪ ♫',320,102,{size:16,color:'#2b2b2b'});},pad:(c,p,t)=>{const g=p.glow,col=['#e8453a','#f5d033','#3fb07a','#3b82f6'][p.i];c.fillStyle='rgba(0,0,0,.4)';rr(c,p.x-58,p.y-112,116,232,10);c.fill();rr(c,p.x-56,p.y-118+g*8,112,228,10);ink(c,g>0?shade('#ffffff',-g*.1):'#f7f4ec',3.4);c.fillStyle=`rgba(0,0,0,${.06+g*.1})`;c.fillRect(p.x-54,p.y+70+g*8,108,38);if(g>0)glow(c,p.x,p.y+60,90,col,g*.7);c.beginPath();c.arc(p.x,p.y+78+g*8,16,0,TAU);ink(c,col,2.6);txt(c,['DO','MI','SOL','SI'][p.i],p.x,p.y+78+g*8,{size:10,color:'#fff',stroke:INK});}},
 club:{pos:i=>({x:88+i*155,y:230}),hit:{w:130,h:130},scene:(c)=>{},pad:(c,p,t)=>{const col=['#ff5fd2','#5ff0ff','#9d6bff','#ffe45f'][p.i],g=p.glow;glow(c,p.x,p.y,120,col,.3+g*.6);card(c,p.x-58,p.y-58+g*4,116,116,{fill:shade(col,-.2+g*.35),r:18,drop:6-g*4});c.fillStyle='rgba(255,255,255,'+(.12+g*.3)+')';rr(c,p.x-50,p.y-54+g*4,100,26,10);c.fill();c.strokeStyle=col;c.lineWidth=4;rr(c,p.x-44,p.y-44+g*4,88,88,12);c.stroke();txt(c,String(p.i+1),p.x,p.y+g*4,{size:34,color:'#fff',stroke:INK});}},
};

const CODE={
 gym:{body:'#3b546e',note:'#ffe0b0',noteTitle:'CÓDIGO TORNOS',noteSub:'Recepción · no compartir',deco:'plate'},
 house:{body:'#dfe3e6',note:'#fff29a',noteTitle:'CÓDIGO ALARMA',noteSub:'Latasa · no compartir',deco:'mug'},
 club:{body:'#3a2a63',note:'#ffc8f2',noteTitle:'CÓDIGO CAMERINO',noteSub:'Solo staff',deco:'vinyl'},
};
const SHELF={
 house:{style:'spine',shelf:'#8b5a2b',plank:'#6b4526',reader:'MESILLA'},
 club:{style:'sleeve',shelf:'#2b2150',plank:'#4a2a6a',reader:'TOCADISCOS'},
};
const SW={gym:{body:'#4a6a8a',screenTitle:'SERVIDOR · COPIA EL PATRÓN'},house:{body:'#c0392b',screenTitle:'RECREATIVA · COPIA EL PATRÓN'}};


// --- Cables ---
const WIRECOL=['#e8453a','#3b82f6','#f5d033','#e056c8'];
const wiresCfg=(panel)=>({panel,leftHead:'BORNES',rightHead:'CONECTORES',headColor:'#c9d4de',colors:WIRECOL,left:(c,i,x,y)=>symbol(c,i,x,y,11),right:(c,id,x,y)=>symbol(c,id,x,y,11)});
const PAIRS=[['Hund','Perro'],['Katze','Gato'],['Haus','Casa'],['Buch','Libro']];
const CABLES={
 'house:wires':wiresCfg('#2f3540'),'gym:wires':wiresCfg('#3b546e'),
 'gym:speaker':{panel:'#3b546e',leftHead:'CANALES',rightHead:'ENTRADAS',headColor:'#c9d9e8',gain:true,colors:['#ffb347','#5ac8fa','#8fe6c2','#ff7a7a'],left:(c,i,x,y)=>txt(c,['MICRO','MÚSICA','AVISOS','AMBIENTE'][i],x,y,{size:10,color:'#fff',stroke:INK}),right:(c,id,x,y)=>txt(c,['MICRO','MÚSICA','AVISOS','AMBIENTE'][id],x,y,{size:11,color:'#fff',stroke:INK})},
 'house:speaker':{panel:'#2f3540',leftHead:'APARATOS',rightHead:'ROUTER',headColor:'#d6e2ea',gain:true,colors:['#f2a93b','#5ac8fa','#8fe6c2','#ff7a7a'],left:(c,i,x,y)=>txt(c,['TELE','MÓVIL','CONSOLA','PORTÁTIL'][i],x,y,{size:10,color:'#fff',stroke:INK}),right:(c,id,x,y)=>txt(c,['TELE','MÓVIL','CONSOLA','PORTÁTIL'][id],x,y,{size:10,color:'#fff',stroke:INK})},
 'club:speaker':{panel:'#2b2150',leftHead:'CANALES',rightHead:'ENTRADAS',headColor:'#c9b8ff',gain:true,colors:['#ff5fd2','#5ff0ff','#ffe45f','#9d6bff'],left:(c,i,x,y)=>txt(c,['VOZ','GUITA','BAJO','BATERÍA'][i],x,y,{size:11,color:'#fff',stroke:INK}),right:(c,id,x,y)=>txt(c,['VOZ','GUITARRA','BAJO','BATERÍA'][id],x,y,{size:11,color:'#fff',stroke:INK})}
};

// --- Mandos ---
const GA=Math.PI*.75;
const arcPath=(c,x,y,r,v0,v1)=>{c.beginPath();c.arc(x,y,r,A0+ASPAN*v0/100-Math.PI/2*0+0,A0+ASPAN*v1/100);};
const dialCtl=(c,hw,api,o)=>dialDraw(c,api,o);
const valveCtl=(fill)=>(c,hw,api,o)=>{
 const {x,v,t,tol,ok,set,get}=o,vy=120,r=44;
 // depósito
 const tx=x-34,ty=196,tw=68,th=146;
 c.fillStyle='rgba(0,0,0,.4)';rr(c,tx,ty,tw,th,10);ink(c,'rgba(0,0,0,.4)',3,'#9ab0bc');
 c.save();rr(c,tx+3,ty+3,tw-6,th-6,8);c.clip();
 const h=(th-6)*v/100;c.fillStyle=fill;c.fillRect(tx,ty+th-3-h,tw,h);c.fillStyle='rgba(255,255,255,.28)';c.fillRect(tx,ty+th-3-h,tw,4);c.restore();
 const zy0=ty+th-3-(th-6)*Math.min(100,t+tol)/100,zy1=ty+th-3-(th-6)*Math.max(0,t-tol)/100;
 c.fillStyle='rgba(95,240,154,.45)';c.fillRect(tx-6,zy0,tw+12,Math.max(5,zy1-zy0));c.strokeStyle='#5ff09a';c.lineWidth=2.4;c.strokeRect(tx-6,zy0,tw+12,Math.max(5,zy1-zy0));
 // tubo
 rr(c,x-6,vy+r-4,12,ty-vy-r+8,3);ink(c,'#8a96a2',2.5);
 knobAt(api,x,vy,r,get,set);
 c.save();c.translate(x,vy);c.rotate(A0+ASPAN*v/100);
 c.beginPath();c.arc(0,0,r,0,TAU);ink(c,ok?'#5aa88a':'#c0402e',4);
 c.strokeStyle=INK;c.lineWidth=11;c.lineCap='round';for(let k=0;k<3;k++){c.save();c.rotate(k*Math.PI*2/3);c.beginPath();c.moveTo(0,0);c.lineTo(0,-r+7);c.stroke();c.restore();}
 c.strokeStyle=ok?'#9fe0c0':'#e8705a';c.lineWidth=6;for(let k=0;k<3;k++){c.save();c.rotate(k*Math.PI*2/3);c.beginPath();c.moveTo(0,0);c.lineTo(0,-r+7);c.stroke();c.restore();}
 c.beginPath();c.arc(0,0,11,0,TAU);ink(c,'#8a96a2',2.5);c.beginPath();c.arc(0,-r+9,7,0,TAU);ink(c,'#fff',2);c.restore();
};
const sliderCtl=(color)=>(c,hw,api,o)=>{
 const {x,v,t,tol,ok,set,get}=o,y0=92,len=240;
 c.fillStyle='#0c1218';rr(c,x-9,y0,18,len,9);ink(c,'#0c1218',2,'#6a7682');
 const zy0=y0+len-len*Math.min(100,t+tol)/100,zy1=y0+len-len*Math.max(0,t-tol)/100;
 c.fillStyle='rgba(95,240,154,.5)';c.fillRect(x-34,zy0,68,Math.max(6,zy1-zy0));c.strokeStyle='#5ff09a';c.lineWidth=2.4;c.strokeRect(x-34,zy0,68,Math.max(6,zy1-zy0));
 const hy=y0+len-len*v/100;rr(c,x-9,hy,18,y0+len-hy,9);c.fillStyle=color;c.fill();
 sliderAt(api,x,y0,len,get,set,true,56);
 rr(c,x-26,hy-14,52,28,8);ink(c,ok?'#8fe6c2':'#e8eef2',3);c.fillStyle=INK;c.fillRect(x-19,hy-1.5,38,3);
};
const LEVELS={
 'house:bath':{tol:2,panel:'#5a6a76',headColor:'#e4eef4',names:['BAÑERA','LAVABO','CISTERNA'],control:valveCtl('#4aa8e8')},
 'club:bath':{tol:2,panel:'#2b2150',headColor:'#c9b8ff',names:['SALA A','SALA B','SALA C'],control:sliderCtl('#5ff0ff')},
 'club:calibrate':{tol:5,panel:'#2b2150',headColor:'#c9b8ff',names:['ROJO','VERDE','AZUL'],control:dialCtl},
};
const VIP={
 'club:vip':{icon:'wrist',colors:['#ff5fd2','#5ff0ff','#ffe45f','#9d6bff'],panel:'#3a2a63',reader:'#2b2150',dark:'#d8ccff',inLabel:'PULSERAS VIP'},
 'gym:vip':{icon:'card',colors:['#ffb347','#5ac8fa','#8fe6c2','#ff7a7a'],panel:'#3b546e',reader:'#2f4660',dark:'#e8f4ff',inLabel:'ABONOS DE SOCIO'}
};
const POW={
 'club:power':{panel:'#2b2150',headColor:'#c9b8ff'},
 'gym:power':{panel:'#3b546e',headColor:'#c9d9e8'},
 'house:power':{panel:'#5a6066',headColor:'#eef2f4'}
};
const DL={
 'club:download':{panel:'#2b2150',nodes:['RACK','MESA','CABINA','BARRA']},
 'gym:download':{panel:'#3b546e',nodes:['MARCADOR','PANTALLA','SERVIDOR','RECEPCIÓN']},
 'house:download':{panel:'#3a3f47',nodes:['MÓVIL','ROUTER','PORTÁTIL','DISCO']}
};

// --- Gimnasio y material ---
const SPACE=['#ffb347','#5ac8fa','#8fe6c2','#ff7a7a','#c9a3ff','#ffd86a'];
const crack=(c,s)=>{c.strokeStyle=INK;c.lineWidth=2.6;c.lineCap='round';c.beginPath();c.moveTo(-s*.12,-s*.3);c.lineTo(s*.02,-s*.08);c.lineTo(-s*.1,s*.06);c.lineTo(s*.08,s*.26);c.stroke();};
const ballDraw=(c,i,x,y,s,bad)=>{icon(c,'ball',x,y,s,{color:SPACE[i%6]});if(bad){c.save();c.translate(x,y);crack(c,s);c.restore();}};
const TOOLS=['shovel','rake','can','glove','sack','bottle'];
const toolDraw=(c,i,x,y,s,bad)=>{icon(c,TOOLS[i%6],x,y,s,{color:['#9fb0bd','#9fb0bd','#3d86d6','#f0b23a','#b9893f','#6ac0ff'][i%6]});if(bad){c.save();c.translate(x,y);c.fillStyle='rgba(150,70,20,.75)';c.beginPath();c.ellipse(-s*.1,s*.05,s*.14,s*.08,.4,0,TAU);c.fill();c.beginPath();c.ellipse(s*.12,-s*.12,s*.1,s*.06,-.3,0,TAU);c.fill();crack(c,s*.8);c.restore();}};
const INSPECT={
 'gym:equipment':{floor:'#3b546e',dark:'#e8f4ff',inLabel:'MATERIAL DEL PABELLÓN',draw:ballDraw},
};
const filterDraw=(leaf)=>(c,i,x,y,s,small)=>{
 c.save();c.translate(x,y);const w=s*.52,h=s*.42;rr(c,-w,-h,w*2,h*2,6);ink(c,leaf?'#7a6a3a':'#8a96a2',3);
 c.strokeStyle=leaf?'#4a3a1a':'#4a5560';c.lineWidth=2;for(let k=-3;k<=3;k++){c.beginPath();c.moveTo(-w+6,k*h/3.4);c.lineTo(w-6,k*h/3.4);c.stroke();}
 c.fillStyle=leaf?'rgba(80,150,50,.8)':'rgba(60,50,40,.55)';for(let k=0;k<5;k++){c.beginPath();c.ellipse(-w*.6+((k*37+i*13)%100)/100*w*1.2,-h*.5+((k*53+i*29)%100)/100*h,s*.07,s*.045,k,0,TAU);c.fill();}
 c.restore();
};
const FILTERS={
 'gym:ventilation':{panel:'#3b546e',head:'#c9d9e8',bin:'#4a4038',unit:'UNIDAD DE EXTRACCIÓN',filter:filterDraw(false)},
};
const HYD={
 'gym:hydration':{panel:'#3b546e',tap:'#9aa8b4',knob:'#e0453a',water:'#4ab0f0',names:['MUESTRA A','MUESTRA B','MUESTRA C']},
};
const keyDraw=(c,id,x,y,s)=>{c.save();c.translate(x,y);c.rotate(-.5);c.strokeStyle=INK;c.lineWidth=9;c.lineCap='round';c.beginPath();c.moveTo(-s*.1,0);c.lineTo(s*.42,0);c.stroke();c.strokeStyle='#d9b348';c.lineWidth=5;c.stroke();c.fillStyle='#d9b348';c.fillRect(s*.28,0,5,s*.14);c.fillRect(s*.38,0,5,s*.1);
 c.beginPath();c.arc(-s*.22,0,s*.2,0,TAU);ink(c,'#e6c25a',3);symbol(c,id,-s*.22,0,s*.1,'#2b2b2b');c.restore();};
const LOCKERS={
 'gym:lockers':{labels:['Círculo','Triángulo','Equis','Estrella'],tray:'LLAVES DE SOCIOS',shelfFill:'#3b546e',noPlank:true,slotW:112,slotH:176,target:c=>c.order,
  slotPos:i=>({x:110+i*140,y:138}),itemHome:id=>({x:110+id*140,y:372}),
  draw:(c,id,x,y,s)=>{if(s>60){/* puerta */}keyDraw(c,id,x,y,s*1.1);}}
};

const ENGINE_OF={documents:'sortline',delivery:'sortline',exams:'sortline',folders:'sortline',stock:'stockrack',supplies:'sortbins',papers:'collect',trash:'collect',chalk:'scrub',desks:'rotate',lights:'rotate',bell:'memory',code:'keypad',book:'shelf',computer:'switches',wires:'cables',german:'cables',speaker:'cables',bath:'levels',calibrate:'levels',dj:'dj',vip:'vip',power:'power',download:'download',treadmill:'treadmill',weights:'weights',plates:'sortline',scoreboard:'scoreboard',ventilation:'filters',lockers:'stockrack',equipment:'inspect',basketball:'basketball',spinning:'spinning',hydration:'hydration',washer:'washer',cook:'cook',appliance:'appliance',refill:'refill'};
const REFILL={
 'house:refill':{body:'#3a3f47',label:'CAFETERA · DEPÓSITO DE AGUA',liquid:'#58b4f0',button:'#e0453a'},
 'gym:refill':{body:'#2f4660',label:'DISPENSADOR DE BATIDOS',liquid:'#f07ab0',button:'#ffb347'},
 'club:refill':{body:'#2b2150',label:'MÁQUINA DE HIELO',liquid:'#9fe8ff',button:'#ff5fd2'}
};
const CFG={
 sortline:(k)=>{const s=SORT[k];return s&&{...s,wrong:'El orden no es correcto.'};},
 stockrack:(k,c)=>k.startsWith('club')?stockClub(c):k.startsWith('house')?stockHouse(c):LOCKERS[k],
 sortbins:(k)=>BINS[k.split(':')[0]],
 collect:(k)=>COLLECT[k],
 scrub:(k)=>SCRUB[k.split(':')[0]],
 rotate:(k)=>ROT[k],
 memory:(k)=>MEM[k.split(':')[0]],
 keypad:(k)=>CODE[k.split(':')[0]],
 shelf:(k)=>SHELF[k.split(':')[0]],
 switches:(k)=>SW[k.split(':')[0]],
 treadmill:()=>({}),weights:()=>({}),scoreboard:()=>({}),basketball:()=>({}),spinning:()=>({}),filters:(k)=>FILTERS[k],inspect:(k)=>INSPECT[k],hydration:(k)=>HYD[k],
 washer:()=>({}),cook:()=>({}),appliance:()=>({name:'TOSTADORA'}),refill:(k)=>REFILL[k],
 cables:(k)=>CABLES[k],levels:(k)=>LEVELS[k],dj:()=>({}),vip:(k)=>VIP[k],power:(k)=>POW[k],download:(k)=>DL[k]
};
export function resolveDef(theme,kind,challenge){
 const key=theme+':'+kind,eng=ENGINE_OF[kind],txtd=TEXTS[key];
 if(!eng||!txtd)return null;
 const cfg=CFG[eng]?.(key,challenge);if(!cfg)return null;
 return {engine:eng,title:txtd.title,brief:txtd.brief,cfg};
}
