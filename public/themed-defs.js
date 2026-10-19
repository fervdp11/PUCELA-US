import {W,H,TAU,INK,clamp,rr,ink,shade,txt,glow,icon,card} from './task-kit.js';
import {knobAt,sliderAt,symbol,A0,ASPAN,dialDraw} from './themed-tasks.js';

// Catálogo de tareas temáticas: para cada (mapa, tipo) dice qué juego se monta,
// cómo se llama y cómo se ve. Los tipos son los del servidor.
const T=(title,brief)=>({title,brief});
const TEXTS={
 'school:documents':T('SECRETARÍA / REGISTRO','Ordena las hojas en las bandejas, de menor a mayor número.'),
 'school:delivery':T('PAQUETERÍA / ESTANTES','Coloca los paquetes en los estantes, del más ligero al más pesado.'),
 'school:exams':T('PROFESORADO / EXÁMENES','Ordena los exámenes de menor a mayor nota.'),
 'school:folders':T('ARCHIVO / CAJONES','Archiva las carpetas por orden alfabético, de la A a la Z.'),
 'school:chalk':T('AULA / PIZARRA','Pasa el borrador por la pizarra hasta dejarla limpia.'),
 'school:desks':T('AULA / PUPITRES','Toca cada pupitre para girarlo hasta que mire a la pizarra.'),
 'school:lights':T('AULA / PROYECTORES','Toca cada foco para girarlo hasta que apunte a la pizarra.'),
 'school:book':T('BIBLIOTECA / PRÉSTAMO','Saca el libro pedido y llévalo al escáner de préstamo.'),
 'school:supplies':T('MATERIAL / ORGANIZADOR','Arrastra cada objeto a la caja de su tipo.'),
 'school:bell':T('PATIO / CAMPANAS','Escucha el repique y repite la secuencia en el mismo orden.'),
 'school:papers':T('PASILLO / RECICLAJE','Arrastra los papeles del suelo al contenedor de reciclaje.'),
 'school:code':T('CONSERJERÍA / TECLADO','Teclea el código de la nota para abrir.'),
 'school:computer':T('INFORMÁTICA / ARRANQUE','Copia en los interruptores el patrón que muestra la pantalla.'),
 'club:chalk':T('PISTA / LIMPIEZA','Pasa la fregona por los derrames de la pista de baile.'),
 'club:lights':T('ESCENARIO / FOCOS','Toca cada foco para girarlo hasta que apunte al escenario.'),
 'club:bell':T('SAMPLER / PADS','Escucha el patrón y repítelo en los pads.'),
 'club:book':T('CABINA / VINILOS','Saca el disco pedido y colócalo en el tocadiscos.'),
 'club:code':T('CAMERINO / ACCESO','Teclea el código de la nota para abrir el camerino.'),
 'club:stock':T('BARRA / BOTELLERO','Coloca cada botella en su hueco del botellero.'),
 'club:trash':T('BARRA / COMPACTADORA','Tira los restos a la compactadora y baja la palanca.'),
 'park:supplies':T('SEMILLERO / CLASIFICACIÓN','Arrastra cada planta a su caja: flores, árboles o césped.'),
 'park:papers':T('SENDEROS / LIMPIEZA','Arrastra los restos del sendero a la papelera.'),
 'park:trash':T('JARDÍN / RESIDUOS','Tira los restos del jardín al carro y baja la palanca.'),
 'park:stock':T('CASETA / ALMACÉN','Coloca cada suministro en su estante.'),
 'park:lights':T('PASEO / FAROLAS','Toca cada farola para girar su foco hacia el sendero.'),
 'park:desks':T('JARDÍN / BANCOS','Toca cada banco para girarlo hacia el paseo central.'),
 'park:chalk':T('QUIOSCO / MOSTRADOR','Pasa el paño por las manchas del mostrador.'),
 'park:computer':T('CASETA / RIEGO','Copia en los interruptores el patrón del cuadro de riego.'),
 'park:book':T('QUIOSCO / PRENSA','Saca la revista pedida y llévala al lector.'),
 'park:bell':T('FUENTE / CHORROS','Mira los chorros de la fuente y repite el orden.'),
 'park:code':T('CASETA / ACCESO','Teclea el código de la nota para abrir la caseta.'),
 'park:documents':T('SERVICIO / PARTES','Ordena los partes en sus casillas, de menor a mayor número.'),
 'park:folders':T('ADMINISTRACIÓN / PERMISOS','Archiva los permisos de poda por orden alfabético.'),
 'gym:folders':T('RECEPCIÓN / FICHAS','Archiva las fichas de socios por orden alfabético.'),
  'gym:lights':T('SEGURIDAD / FOCOS','Toca cada foco para girarlo hasta que apunte a la pista.'),
 'gym:computer':T('ALMACÉN / SERVIDOR','Copia en los interruptores el patrón que muestra la pantalla.'),
 'gym:speaker':T('ACTIVIDADES / AUDIO','Conecta cada canal a su entrada y ajusta la ganancia a la marca verde.'),
 'gym:code':T('RECEPCIÓN / TORNOS','Teclea el código de la nota para reiniciar los tornos.'),
 'park:power':T('MANTENIMIENTO / CUADRO','Cambia los fusibles fundidos y conecta los magnetotérmicos en el orden del parte.'),
 'gym:treadmill':T('CINTA / MANTENIMIENTO','Ajusta velocidad e inclinación al parte y deja la cinta rodando unos segundos.'),
 'gym:weights':T('POLEA / CORREA','Pasa la correa por las poleas en el orden del parte y aprieta los tres tornillos.'),
 'gym:plates':T('SOPORTE / DISCOS','Coloca los discos en el soporte, del más ligero al más pesado.'),
 'gym:scoreboard':T('MARCADOR / RESULTADO','Gira los tambores hasta copiar el resultado del parte.'),
 'gym:ventilation':T('EXTRACCIÓN / FILTROS','Saca los cuatro filtros sucios y gira las dos ruedas hasta su marca verde.'),
 'park:ventilation':T('LAGO / FILTROS','Retira los cuatro filtros del lago y gira las dos válvulas hasta su marca verde.'),
 'gym:lockers':T('TAQUILLAS / LLAVES','Lleva cada llave a la taquilla con su misma figura.'),
 'gym:equipment':T('MATERIAL / REVISIÓN','Aparta al cajón solo las pelotas dañadas.'),
 'park:equipment':T('HERRAMIENTAS / REVISIÓN','Aparta al cajón solo las herramientas dañadas.'),
 'gym:basketball':T('CANASTA / TIRO','Tira del balón hacia atrás y suéltalo para encestar en las tres alturas.'),
 'gym:spinning':T('BICICLETA / RESISTENCIA','Fija la resistencia y pedalea tres veces cuando la barra esté en verde.'),
 'gym:hydration':T('FUENTE / MUESTRAS','Mantén pulsado cada grifo hasta la línea verde sin pasarte.'),
 'park:hydration':T('LAGO / MUESTRAS DE AGUA','Mantén pulsado cada grifo hasta la línea verde sin pasarte.'),
 'school:wires':T('CUADRO ELÉCTRICO / AULA','Arrastra cada cable al conector de su mismo color y símbolo.'),
 'gym:wires':T('CUADRO / SALA DE MÁQUINAS','Arrastra cada cable al conector de su mismo color y símbolo.'),
 'park:wires':T('CASETA / CUADRO DE RIEGO','Conecta cada cable del cuadro con el conector de su color.'),
 'school:german':T('IDIOMAS / ASOCIACIÓN','Arrastra un cable desde cada palabra alemana hasta su traducción.'),
 'club:speaker':T('AUDIO / PATCHBAY','Conecta cada canal a su entrada y ajusta la ganancia a la marca verde.'),
 'school:bath':T('SERVICIOS / PRESIÓN','Gira cada válvula hasta que el depósito llegue a la marca verde.'),
 'park:bath':T('RIEGO / PRESIÓN','Gira cada válvula hasta que el depósito llegue a la marca verde.'),
 'club:bath':T('VENTILACIÓN / CAUDAL','Desliza cada compuerta hasta la marca verde.'),
 'club:calibrate':T('LUCES / CALIBRACIÓN','Gira cada mando hasta su marca verde.'),
 'park:calibrate':T('FUENTE / BOMBA','Gira cada fase de la bomba hasta su marca verde.'),
 'club:dj':T('MESA / MEZCLAS','Iguala los tres canales a su marca y toca en la zona verde para enganchar el pulso.'),
 'club:vip':T('CONTROL / ACCESO VIP','Ordena las pulseras del 1 al 4 y pásalas por el lector a buen ritmo.'),
 'gym:vip':T('TORNO / ABONOS','Ordena los abonos del 1 al 4 y pásalos por el torno a buen ritmo.'),
 'club:power':T('CUADRO / GENERAL','Cambia los fusibles fundidos y conecta los magnetotérmicos en el orden del parte.'),
 'gym:power':T('CUADRO / SALA','Cambia los fusibles fundidos y conecta los magnetotérmicos en el orden del parte.'),
 'club:download':T('ENLACE / DATOS','Marca la ruta segura nodo a nodo, enchufa el conector y espera la transferencia.'),
 'gym:download':T('MARCADOR / DATOS','Marca la ruta segura nodo a nodo, enchufa el conector y espera la transferencia.'),
 'park:download':T('SENSORES / DATOS','Marca la ruta segura nodo a nodo, enchufa el conector y espera la transferencia.')
};

const sheetDraw=(col)=>(c,v,x,y,s)=>{icon(c,'sheet',x,y,s,{});txt(c,String(v),x,y+s*.06,{size:s*.3,color:'#25303b'});};
const NAMES={gym:['Aitana','Bruno','Carla','Diego','Elena'],park:['Abeto','Brezo','Castaño','Dalia','Encina']};
const FOLDERCOL=['#e0a93a','#d6574a','#4b86d6','#4fb06a','#8a5ad6'];
const folderDraw=(names)=>(c,v,x,y,s)=>{icon(c,'folder',x,y-4,s,{color:FOLDERCOL[v%5]});txt(c,names[v],x,y+s*.36,{size:11,color:'#1b232b',stroke:'rgba(255,255,255,.7)'});};
const SORT={
 'school:documents':{inLabel:'REGISTRO DE SECRETARÍA',slotName:i=>'Bandeja '+(i+1),dir:'NÚMERO MENOR  ➜  MAYOR',draw:sheetDraw()},
 'park:documents':{inLabel:'PARTES DE SERVICIO',slotName:i=>'Casilla '+(i+1),dir:'NÚMERO MENOR  ➜  MAYOR',draw:sheetDraw(),trayFill:'#7a5a36'},
 'gym:plates':{inLabel:'DISCOS SUELTOS',slotName:i=>'Posición '+(i+1),dir:'MÁS LIGERO  ➜  MÁS PESADO',trayFill:'#3b546e',draw:(c,v,x,y,s)=>{icon(c,'plate',x,y,s*(.62+v/70),{color:v>=20?'#c0392b':v>=10?'#3b6fc0':'#46515e',text:v+' kg'});}},
 'school:delivery':{inLabel:'MUELLE DE ENTREGAS',slotName:i=>'Estante '+(i+1),dir:'MÁS LIGERO  ➜  MÁS PESADO',draw:(c,v,x,y,s)=>{icon(c,'box',x,y-4,s,{});txt(c,v+' kg',x,y+s*.38,{size:12,color:'#fff',stroke:INK});}},
 'school:exams':{inLabel:'EXÁMENES CORREGIDOS',slotName:i=>'Montón '+(i+1),dir:'NOTA MENOR  ➜  MAYOR',draw:(c,v,x,y,s)=>{icon(c,'exam',x,y,s,{text:(v/10).toFixed(1)});}},
 'school:folders':{inLabel:'CARPETAS SIN ARCHIVAR',slotName:i=>'Cajón '+(i+1),dir:'A  ➜  Z',draw:null,names:['Actas','Becas','Circulares','Diplomas','Evaluaciones']},
 'gym:folders':{inLabel:'FICHAS DE SOCIOS',slotName:i=>'Cajón '+(i+1),dir:'A  ➜  Z',draw:null,names:NAMES.gym,trayFill:'#3b546e'},
 'park:folders':{inLabel:'PERMISOS DE PODA',slotName:i=>'Cajón '+(i+1),dir:'A  ➜  Z',draw:null,names:NAMES.park,trayFill:'#7a5a36'}
};
for(const k of Object.keys(SORT)){const d=SORT[k];if(!d.draw)d.draw=folderDraw(d.names);}

const BOTTLE=['#5fe3a1','#b8e34f','#f0a53a','#e0457a','#8fd3f0','#5a5bd6'];
const stockClub=c=>({labels:c.labels,tray:'CAJA DE BOTELLAS',shelfFill:'#3a2a63',plank:'#6a3fa0',draw:(ctx,id,x,y,s)=>icon(ctx,'bottle',x,y,s,{color:BOTTLE[id]})});
const PARKICON=['seeds','can','sack','glove','bottle','sack'],PARKCOL=['#e6a23c','#3d86d6','#8a6a3a','#f0b23a','#6ac0ff','#d6a04a'];
const stockPark=c=>({labels:c.labels,tray:'CARRETILLA DE SUMINISTROS',shelfFill:'#a98853',plank:'#6b4526',draw:(ctx,id,x,y,s)=>icon(ctx,PARKICON[id],x,y,s,{color:PARKCOL[id]})});

const BINS={
 school:{labels:['Lápices','Cuadernos','Reglas'],bin:['#c98a3a','#3b6fc0','#3f9a5a'],icons:[['pencil','pencil'],['notebook','notebook'],['ruler','ruler']],colors:[['#f0c336','#4fb0e6'],['#4b86d6','#d6574a'],['#7fd1e8','#e0a93a']]},
 park:{labels:['Flores','Árboles','Césped'],bin:['#c85a8a','#3f8a3a','#6aa83a'],icons:[['flower','flower'],['sapling','sapling'],['grass','grass']],colors:[['#ff6fa5','#ffd84a'],['#3f9d4a','#2f7d3a'],['#4fb04a','#7fd04a']]}
};

const CLUBTRASH=['glass','bottle','crumple','ice'],PARKTRASH=['leaf','bag','sack','crumple'];
const COLLECT={
 'school:papers':{icon:i=>i%3===0?'crumple':'sheet',binLabel:'RECICLAJE',binFill:'#3b6fc0',floor:'#d9c9a0',ground:(c,x,y,w,h)=>{c.strokeStyle='rgba(90,60,30,.18)';c.lineWidth=2;for(let i=1;i<7;i++){c.beginPath();c.moveTo(x+i*w/7,y+8);c.lineTo(x+i*w/7,y+h-8);c.stroke();}}},
 'park:papers':{icon:i=>['leaf','crumple','bag'][i%3],color:i=>i%3===2?'#c9d4de':undefined,binLabel:'PAPELERA',binFill:'#3f8a3a',floor:'#cdb98a',ground:(c,x,y,w,h)=>{c.fillStyle='rgba(120,90,50,.22)';for(let i=0;i<40;i++){c.beginPath();c.arc(x+(i*61)%w,y+(i*37)%h,3+(i%3),0,TAU);c.fill();}}},
 'club:trash':{lever:true,icon:i=>CLUBTRASH[i%4],color:i=>['#7fe0ff','#e0a93a','#f1ecdb','#fff'][i%4]&&(i%4===0?(i%8<4?'#7fe0ff':'#ff9be0'):i%4===1?'#4fd69a':undefined),binLabel:'COMPACTADORA',binFill:'#7b3fd6',floor:'#3a2a63'},
 'park:trash':{lever:true,icon:i=>PARKTRASH[i%4],binLabel:'CARRO',binFill:'#3f8a3a',floor:'#a7c880',ground:(c,x,y,w,h)=>{c.strokeStyle='rgba(40,90,40,.3)';c.lineWidth=2;for(let i=0;i<24;i++){const gx=x+(i*53)%w,gy=y+(i*89)%h;c.beginPath();c.moveTo(gx,gy);c.lineTo(gx+3,gy-9);c.stroke();}}}
};

// --- Superficies a limpiar ---
const seedRand=(s)=>{const x=Math.sin(s*127.1)*43758.5453;return x-Math.floor(x);};
const SCRUB={
 school:{
  surface:(c,hw,B)=>{rr(c,B.x-14,B.y-14,B.w+28,B.h+28,10);ink(c,'#7a4f2a',4);rr(c,B.x,B.y,B.w,B.h,6);ink(c,'#26483a',3);c.save();c.globalAlpha=.16;for(let i=0;i<5;i++)txt(c,['a² + b² = c²','E = m·c²','π ≈ 3,1416','H₂O + CO₂','1 + 1 = 2'][i],B.x+24,B.y+34+i*56,{size:22,color:'#fff',align:'left',weight:400});c.restore();c.fillStyle='#6a4524';c.fillRect(B.x+30,B.y+B.h+4,B.w-60,8);},
  mark:(c,m)=>{c.globalAlpha=Math.min(1,m.amt)*.85;c.fillStyle='#f2f2e8';for(let k=0;k<5;k++){c.beginPath();c.ellipse(m.x+(seedRand(m.seed+k)-.5)*50,m.y+(seedRand(m.seed+k+9)-.5)*34,12+seedRand(m.seed+k+3)*14,6+seedRand(m.seed+k+5)*8,seedRand(m.seed+k)*3,0,TAU);c.fill();}c.strokeStyle='#f6f6ee';c.lineWidth=3;c.beginPath();c.moveTo(m.x-24,m.y-8);c.quadraticCurveTo(m.x,m.y+14,m.x+26,m.y-6);c.stroke();c.globalAlpha=1;},
  tool:(c,x,y,on)=>{c.save();c.translate(x,y);c.rotate(on?-.08:-.2);c.fillStyle='rgba(0,0,0,.3)';rr(c,-36,-12,72,40,8);c.fill();rr(c,-36,-20,72,40,8);ink(c,'#3a3f46',3);rr(c,-36,-20,72,16,8);ink(c,'#c9a063',3);c.restore();}
 },
 club:{
  surface:(c,hw,B,t)=>{rr(c,B.x-12,B.y-12,B.w+24,B.h+24,12);ink(c,'#1b1236',4,'#ff5fd2');const cols=['#7b3fd6','#c0398a','#2f78a8','#3fb0b0'];for(let i=0;i<6;i++)for(let j=0;j<4;j++){c.fillStyle=cols[(i+j)%4];const p=.55+.25*Math.sin(t/500+i*1.3+j);c.globalAlpha=p;c.fillRect(B.x+i*B.w/6+2,B.y+j*B.h/4+2,B.w/6-4,B.h/4-4);}c.globalAlpha=1;},
  mark:(c,m)=>{c.globalAlpha=Math.min(1,m.amt)*.95;const col=seedRand(m.seed)>.5?'#6cff9a':'#ff6a9a';c.fillStyle=col;c.beginPath();for(let k=0;k<10;k++){const a=k*TAU/10,r=22+seedRand(m.seed+k)*18;c.lineTo(m.x+Math.cos(a)*r*1.3,m.y+Math.sin(a)*r*.85);}c.closePath();ink(c,col,2,'rgba(0,0,0,.4)');c.fillStyle='rgba(255,255,255,.55)';c.beginPath();c.ellipse(m.x-8,m.y-6,8,4,-.5,0,TAU);c.fill();c.globalAlpha=1;},
  tool:(c,x,y,on)=>{c.save();c.translate(x,y);c.rotate(.15);c.strokeStyle=INK;c.lineWidth=9;c.lineCap='round';c.beginPath();c.moveTo(40,-120);c.lineTo(4,-10);c.stroke();c.strokeStyle='#d9a566';c.lineWidth=5;c.stroke();rr(c,-44,-14,88,30,12);ink(c,'#e8e8f0',3);c.strokeStyle='#bfc0d0';c.lineWidth=2;for(let i=-3;i<=3;i++){c.beginPath();c.moveTo(i*11,6);c.lineTo(i*11+(i>0?3:-3),26);c.stroke();}c.restore();}
 },
 park:{
  surface:(c,hw,B)=>{rr(c,B.x-12,B.y-12,B.w+24,B.h+24,12);ink(c,'#5a3a1c',4);c.fillStyle='#c79b5f';rr(c,B.x,B.y,B.w,B.h,6);ink(c,'#c79b5f',3);c.strokeStyle='rgba(90,55,20,.35)';c.lineWidth=2;for(let j=1;j<5;j++){c.beginPath();c.moveTo(B.x+4,B.y+j*B.h/5);c.lineTo(B.x+B.w-4,B.y+j*B.h/5);c.stroke();}},
  mark:(c,m)=>{c.globalAlpha=Math.min(1,m.amt)*.9;const col=seedRand(m.seed)>.5?'#6b3d1e':'#e87aa0';c.fillStyle=col;for(let k=0;k<4;k++){c.beginPath();c.ellipse(m.x+(seedRand(m.seed+k)-.5)*40,m.y+(seedRand(m.seed+k+4)-.5)*26,10+seedRand(m.seed+k+2)*14,7+seedRand(m.seed+k+6)*8,seedRand(m.seed+k)*3,0,TAU);c.fill();}c.globalAlpha=1;},
  tool:(c,x,y,on)=>{c.save();c.translate(x,y);c.rotate(on?.1:-.1);c.fillStyle='rgba(0,0,0,.3)';rr(c,-40,-14,80,52,14);c.fill();rr(c,-40,-22,80,52,14);ink(c,'#4a86d6',3);c.strokeStyle='#fff';c.lineWidth=3;c.globalAlpha=.7;for(let i=-3;i<=3;i++){c.beginPath();c.moveTo(i*11,-16);c.lineTo(i*11,24);c.stroke();}for(let j=-1;j<=1;j++){c.beginPath();c.moveTo(-34,j*14+2);c.lineTo(34,j*14+2);c.stroke();}c.globalAlpha=1;c.restore();}
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
 'school:desks':{tile:'#c9a56a',okFill:'#9ed39a',piece:deskPiece('#c98a4a','#4b86d6'),stage:c=>{rr(c,40,8,W-80,36,6);ink(c,'#26483a',3);txt(c,'PIZARRA',W/2,26,{size:14,color:'#e8f4ec',weight:700});}},
 'park:desks':{tile:'#b9d89a',okFill:'#8fd07a',piece:benchPiece,stage:c=>{rr(c,40,8,W-80,36,10);ink(c,'#e8d6a0',3);txt(c,'PASEO CENTRAL',W/2,26,{size:14,color:'#6a5a30',weight:800});}},
 'school:lights':{tile:'#6a7a8a',okFill:'#8aa0b8',piece:lampPiece('rgba(255,244,170,.9)','#ffd84a'),stage:c=>{rr(c,40,8,W-80,36,6);ink(c,'#26483a',3);txt(c,'PIZARRA',W/2,26,{size:14,color:'#e8f4ec',weight:700});}},
 'club:lights':{tile:'#2a1f4d',okFill:'#46308a',piece:lampPiece('rgba(255,95,210,.9)','#ff5fd2'),stage:(c,t)=>{rr(c,40,8,W-80,36,6);ink(c,'#3a2a63',3,'#ff5fd2');txt(c,'ESCENARIO',W/2,26,{size:14,color:'#fff',weight:800});glow(c,W/2,26,70,'#ff5fd2',.25);}},
 'gym:lights':{tile:'#2f4660',okFill:'#4a6a8a',piece:lampPiece('rgba(255,200,120,.9)','#ffb347'),stage:c=>{rr(c,40,8,W-80,36,6);ink(c,'#3b546e',3,'#ffb347');txt(c,'PISTA',W/2,26,{size:14,color:'#fff',weight:800});}},
 'park:lights':{tile:'#3f6a3a',okFill:'#6aa860',piece:lampPiece('rgba(255,232,150,.9)','#e0a93a'),stage:c=>{rr(c,40,8,W-80,36,10);ink(c,'#e8d6a0',3);txt(c,'SENDERO',W/2,26,{size:14,color:'#6a5a30',weight:800});}}
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
 school:{pos:i=>({x:96+i*149,y:250}),hit:{w:120,h:170},scene:(c)=>{rr(c,30,60,W-60,22,6);ink(c,'#5a3a1c',4);c.fillStyle='rgba(0,0,0,.2)';rr(c,40,400,W-80,10,5);c.fill();},pad:(c,p,t)=>bellBody(c,p,t,['#e8b84a','#d9984a','#e8d06a','#c98a3a'][p.i])},
 club:{pos:i=>({x:88+i*155,y:230}),hit:{w:130,h:130},scene:(c)=>{},pad:(c,p,t)=>{const col=['#ff5fd2','#5ff0ff','#9d6bff','#ffe45f'][p.i],g=p.glow;glow(c,p.x,p.y,120,col,.3+g*.6);card(c,p.x-58,p.y-58+g*4,116,116,{fill:shade(col,-.2+g*.35),r:18,drop:6-g*4});c.fillStyle='rgba(255,255,255,'+(.12+g*.3)+')';rr(c,p.x-50,p.y-54+g*4,100,26,10);c.fill();c.strokeStyle=col;c.lineWidth=4;rr(c,p.x-44,p.y-44+g*4,88,88,12);c.stroke();txt(c,String(p.i+1),p.x,p.y+g*4,{size:34,color:'#fff',stroke:INK});}},
 park:{pos:i=>({x:96+i*149,y:330}),hit:{w:120,h:260},scene:(c)=>{c.fillStyle='rgba(60,140,200,.5)';c.beginPath();c.ellipse(W/2,360,300,64,0,0,TAU);ink(c,'#7ec8f0',4,'#7a8a96');c.strokeStyle='rgba(255,255,255,.4)';c.lineWidth=2;c.beginPath();c.ellipse(W/2,364,250,44,0,0,TAU);c.stroke();},pad:(c,p,t)=>{const g=p.glow,h=30+g*190;c.fillStyle=`rgba(150,215,255,${.35+g*.55})`;rr(c,p.x-14,p.y-h,28,h,14);c.fill();c.strokeStyle='rgba(255,255,255,.8)';c.lineWidth=2;for(let k=0;k<8*g;k++){const a=(t/90+k*2.1)%6,dx=Math.sin(k*3.7+a)*26;c.beginPath();c.arc(p.x+dx,p.y-h-6+a*7,2.4,0,TAU);c.stroke();}c.beginPath();c.ellipse(p.x,p.y,30,12,0,0,TAU);ink(c,['#ff8a8a','#ffd86a','#8fe08f','#8aa8ff'][p.i],3);c.beginPath();c.ellipse(p.x,p.y-2,14,6,0,0,TAU);ink(c,'#2a3a4a',2);}}
};

const CODE={
 gym:{body:'#3b546e',note:'#ffe0b0',noteTitle:'CÓDIGO TORNOS',noteSub:'Recepción · no compartir',deco:'plate'},
 school:{body:'#9aa7b2',note:'#fff29a',noteTitle:'CÓDIGO DE HOY',noteSub:'Conserjería · no compartir',deco:'folder'},
 club:{body:'#3a2a63',note:'#ffc8f2',noteTitle:'CÓDIGO CAMERINO',noteSub:'Solo staff',deco:'vinyl'},
 park:{body:'#7d9a6a',note:'#e8f7b8',noteTitle:'CÓDIGO CASETA',noteSub:'Guardería · no compartir',deco:'shovel'}
};
const SHELF={
 school:{style:'spine',shelf:'#8b5a2b',plank:'#6b4526',reader:'ESCÁNER'},
 club:{style:'sleeve',shelf:'#2b2150',plank:'#4a2a6a',reader:'TOCADISCOS'},
 park:{style:'cover',shelf:'#9a7a4a',plank:'#6b4526',reader:'LECTOR'}
};
const SW={gym:{body:'#4a6a8a',screenTitle:'SERVIDOR · COPIA EL PATRÓN'},school:{body:'#9aa6b0',screenTitle:'DIAGNÓSTICO · COPIA EL PATRÓN'},park:{body:'#8a9a6a',screenTitle:'CUADRO DE RIEGO · COPIA EL PATRÓN'}};


// --- Cables ---
const WIRECOL=['#e8453a','#3b82f6','#f5d033','#e056c8'];
const wiresCfg=(panel)=>({panel,leftHead:'BORNES',rightHead:'CONECTORES',headColor:'#c9d4de',colors:WIRECOL,left:(c,i,x,y)=>symbol(c,i,x,y,11),right:(c,id,x,y)=>symbol(c,id,x,y,11)});
const PAIRS=[['Hund','Perro'],['Katze','Gato'],['Haus','Casa'],['Buch','Libro']];
const CABLES={
 'school:wires':wiresCfg('#46525e'),'gym:wires':wiresCfg('#3b546e'),'park:wires':wiresCfg('#4d6a45'),
 'school:german':{panel:'#2f5a45',leftHead:'DEUTSCH',rightHead:'ESPAÑOL',headColor:'#e8f4ec',colors:['#f0c36a','#7fd1e8','#ff9bb5','#b6e07a'],left:(c,i,x,y)=>txt(c,PAIRS[i][0],x,y,{size:15,color:'#fff',stroke:INK}),right:(c,id,x,y)=>txt(c,PAIRS[id][1],x,y,{size:15,color:'#fff',stroke:INK})},
 'gym:speaker':{panel:'#3b546e',leftHead:'CANALES',rightHead:'ENTRADAS',headColor:'#c9d9e8',gain:true,colors:['#ffb347','#5ac8fa','#8fe6c2','#ff7a7a'],left:(c,i,x,y)=>txt(c,['MICRO','MÚSICA','AVISOS','AMBIENTE'][i],x,y,{size:10,color:'#fff',stroke:INK}),right:(c,id,x,y)=>txt(c,['MICRO','MÚSICA','AVISOS','AMBIENTE'][id],x,y,{size:11,color:'#fff',stroke:INK})},
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
 'school:bath':{tol:2,panel:'#4a5a66',headColor:'#c9d4de',names:['LAVABOS','DUCHAS','CISTERNAS'],control:valveCtl('#4aa8e8')},
 'park:bath':{tol:2,panel:'#4d6a45',headColor:'#e0f0c8',names:['SECTOR A','SECTOR B','SECTOR C'],control:valveCtl('#4ac0e8')},
 'club:bath':{tol:2,panel:'#2b2150',headColor:'#c9b8ff',names:['SALA A','SALA B','SALA C'],control:sliderCtl('#5ff0ff')},
 'club:calibrate':{tol:5,panel:'#2b2150',headColor:'#c9b8ff',names:['ROJO','VERDE','AZUL'],control:dialCtl},
 'park:calibrate':{tol:5,panel:'#4d6a45',headColor:'#e0f0c8',names:['FASE 1','FASE 2','FASE 3'],control:dialCtl}
};
const VIP={
 'club:vip':{icon:'wrist',colors:['#ff5fd2','#5ff0ff','#ffe45f','#9d6bff'],panel:'#3a2a63',reader:'#2b2150',dark:'#d8ccff',inLabel:'PULSERAS VIP'},
 'gym:vip':{icon:'card',colors:['#ffb347','#5ac8fa','#8fe6c2','#ff7a7a'],panel:'#3b546e',reader:'#2f4660',dark:'#e8f4ff',inLabel:'ABONOS DE SOCIO'}
};
const POW={
 'club:power':{panel:'#2b2150',headColor:'#c9b8ff'},
 'gym:power':{panel:'#3b546e',headColor:'#c9d9e8'},
 'park:power':{panel:'#4d6a45',headColor:'#e0f0c8'}
};
const DL={
 'club:download':{panel:'#2b2150',nodes:['RACK','MESA','CABINA','BARRA']},
 'gym:download':{panel:'#3b546e',nodes:['MARCADOR','PANTALLA','SERVIDOR','RECEPCIÓN']},
 'park:download':{panel:'#4d6a45',nodes:['SENSOR','FUENTE','CASETA','LAGO']}
};

// --- Gimnasio y material ---
const SPACE=['#ffb347','#5ac8fa','#8fe6c2','#ff7a7a','#c9a3ff','#ffd86a'];
const crack=(c,s)=>{c.strokeStyle=INK;c.lineWidth=2.6;c.lineCap='round';c.beginPath();c.moveTo(-s*.12,-s*.3);c.lineTo(s*.02,-s*.08);c.lineTo(-s*.1,s*.06);c.lineTo(s*.08,s*.26);c.stroke();};
const ballDraw=(c,i,x,y,s,bad)=>{icon(c,'ball',x,y,s,{color:SPACE[i%6]});if(bad){c.save();c.translate(x,y);crack(c,s);c.restore();}};
const TOOLS=['shovel','rake','can','glove','sack','bottle'];
const toolDraw=(c,i,x,y,s,bad)=>{icon(c,TOOLS[i%6],x,y,s,{color:['#9fb0bd','#9fb0bd','#3d86d6','#f0b23a','#b9893f','#6ac0ff'][i%6]});if(bad){c.save();c.translate(x,y);c.fillStyle='rgba(150,70,20,.75)';c.beginPath();c.ellipse(-s*.1,s*.05,s*.14,s*.08,.4,0,TAU);c.fill();c.beginPath();c.ellipse(s*.12,-s*.12,s*.1,s*.06,-.3,0,TAU);c.fill();crack(c,s*.8);c.restore();}};
const INSPECT={
 'gym:equipment':{floor:'#3b546e',dark:'#e8f4ff',inLabel:'MATERIAL DEL PABELLÓN',draw:ballDraw},
 'park:equipment':{floor:'#a7c880',dark:'#2d4a2a',inLabel:'CASETA DE HERRAMIENTAS',draw:toolDraw}
};
const filterDraw=(leaf)=>(c,i,x,y,s,small)=>{
 c.save();c.translate(x,y);const w=s*.52,h=s*.42;rr(c,-w,-h,w*2,h*2,6);ink(c,leaf?'#7a6a3a':'#8a96a2',3);
 c.strokeStyle=leaf?'#4a3a1a':'#4a5560';c.lineWidth=2;for(let k=-3;k<=3;k++){c.beginPath();c.moveTo(-w+6,k*h/3.4);c.lineTo(w-6,k*h/3.4);c.stroke();}
 c.fillStyle=leaf?'rgba(80,150,50,.8)':'rgba(60,50,40,.55)';for(let k=0;k<5;k++){c.beginPath();c.ellipse(-w*.6+((k*37+i*13)%100)/100*w*1.2,-h*.5+((k*53+i*29)%100)/100*h,s*.07,s*.045,k,0,TAU);c.fill();}
 c.restore();
};
const FILTERS={
 'gym:ventilation':{panel:'#3b546e',head:'#c9d9e8',bin:'#4a4038',unit:'UNIDAD DE EXTRACCIÓN',filter:filterDraw(false)},
 'park:ventilation':{panel:'#4d6a45',head:'#e0f0c8',bin:'#5a4a2a',unit:'FILTRO DEL LAGO',filter:filterDraw(true)}
};
const HYD={
 'gym:hydration':{panel:'#3b546e',tap:'#9aa8b4',knob:'#e0453a',water:'#4ab0f0',names:['MUESTRA A','MUESTRA B','MUESTRA C']},
 'park:hydration':{panel:'#4d6a45',tap:'#9aa8b4',knob:'#3f8a3a',water:'#4ac0a8',names:['LAGO','FUENTE','RIEGO']}
};
const keyDraw=(c,id,x,y,s)=>{c.save();c.translate(x,y);c.rotate(-.5);c.strokeStyle=INK;c.lineWidth=9;c.lineCap='round';c.beginPath();c.moveTo(-s*.1,0);c.lineTo(s*.42,0);c.stroke();c.strokeStyle='#d9b348';c.lineWidth=5;c.stroke();c.fillStyle='#d9b348';c.fillRect(s*.28,0,5,s*.14);c.fillRect(s*.38,0,5,s*.1);
 c.beginPath();c.arc(-s*.22,0,s*.2,0,TAU);ink(c,'#e6c25a',3);symbol(c,id,-s*.22,0,s*.1,'#2b2b2b');c.restore();};
const LOCKERS={
 'gym:lockers':{labels:['Círculo','Triángulo','Equis','Estrella'],tray:'LLAVES DE SOCIOS',shelfFill:'#3b546e',noPlank:true,slotW:112,slotH:176,target:c=>c.order,
  slotPos:i=>({x:110+i*140,y:138}),itemHome:id=>({x:110+id*140,y:372}),
  draw:(c,id,x,y,s)=>{if(s>60){/* puerta */}keyDraw(c,id,x,y,s*1.1);}}
};

const ENGINE_OF={documents:'sortline',delivery:'sortline',exams:'sortline',folders:'sortline',stock:'stockrack',supplies:'sortbins',papers:'collect',trash:'collect',chalk:'scrub',desks:'rotate',lights:'rotate',bell:'memory',code:'keypad',book:'shelf',computer:'switches',wires:'cables',german:'cables',speaker:'cables',bath:'levels',calibrate:'levels',dj:'dj',vip:'vip',power:'power',download:'download',treadmill:'treadmill',weights:'weights',plates:'sortline',scoreboard:'scoreboard',ventilation:'filters',lockers:'stockrack',equipment:'inspect',basketball:'basketball',spinning:'spinning',hydration:'hydration'};
const CFG={
 sortline:(k)=>{const s=SORT[k];return s&&{...s,wrong:'El orden no es correcto.'};},
 stockrack:(k,c)=>k.startsWith('club')?stockClub(c):k.startsWith('park')?stockPark(c):LOCKERS[k],
 sortbins:(k)=>BINS[k.split(':')[0]],
 collect:(k)=>COLLECT[k],
 scrub:(k)=>SCRUB[k.split(':')[0]],
 rotate:(k)=>ROT[k],
 memory:(k)=>MEM[k.split(':')[0]],
 keypad:(k)=>CODE[k.split(':')[0]],
 shelf:(k)=>SHELF[k.split(':')[0]],
 switches:(k)=>SW[k.split(':')[0]],
 treadmill:()=>({}),weights:()=>({}),scoreboard:()=>({}),basketball:()=>({}),spinning:()=>({}),filters:(k)=>FILTERS[k],inspect:(k)=>INSPECT[k],hydration:(k)=>HYD[k],
 cables:(k)=>CABLES[k],levels:(k)=>LEVELS[k],dj:()=>({}),vip:(k)=>VIP[k],power:(k)=>POW[k],download:(k)=>DL[k]
};
export function resolveDef(theme,kind,challenge){
 const key=theme+':'+kind,eng=ENGINE_OF[kind],txtd=TEXTS[key];
 if(!eng||!txtd)return null;
 const cfg=CFG[eng]?.(key,challenge);if(!cfg)return null;
 return {engine:eng,title:txtd.title,brief:txtd.brief,cfg};
}
