import {withClosedDoors} from './visibility.js';
// Latasa´s House: casa familiar de dos alas unidas por dos pasillos largos y
// cuatro pasillos transversales. Casi todas las habitaciones tienen dos
// salidas, y varias se comunican entre sí (garaje → lavadero → cocina →
// comedor, dormitorio → baño, niños → aseo → invitados): hay rutas
// alternativas para perseguir, escapar y cortar el paso.
const T=56,R=(id,name,x,y,w,h,color,floorKind='wood')=>({id,name,x,y,w,h,color,type:'house',floorKind});
const rooms=[
 R('garage','Garaje',3,3,14,11,'#8b9196','concrete'),R('laundry','Lavadero',20,3,7,8,'#a9cdd2','tile'),
 R('kitchen','Cocina',30,3,12,11,'#e2d3ae','tile'),R('dining','Comedor',45,3,13,11,'#c99d6e'),
 R('storage','Trastero',3,17,7,9,'#a3927b','concrete'),R('living','Salón',14,17,16,13,'#c0915f'),
 R('hall','Recibidor',34,17,7,9,'#c4a580','tile'),R('office','Despacho',45,17,7,8,'#93a387'),
 R('playroom','Sala de juegos',56,17,8,11,'#8495bd','carpet'),
 R('bedroom','Dormitorio de Latasa',3,33,12,10,'#a98fb4','carpet'),R('bath','Baño',18,35,7,8,'#b0d6da','tile'),
 R('kids','Habitación de los niños',28,33,10,10,'#a1cd9e','carpet'),R('toilet','Aseo',41,35,5,8,'#b8dbde','tile'),
 R('guest','Cuarto de invitados',49,33,13,10,'#c9aa9e')
];
const corridors=[
 {x:3,y:14,w:61,h:3},{x:3,y:30,w:61,h:3},
 {x:10,y:17,w:4,h:13},{x:30,y:17,w:4,h:13},{x:41,y:17,w:4,h:13},{x:52,y:17,w:4,h:13},
 {x:17,y:5,w:3,h:3},{x:22,y:11,w:3,h:3},{x:27,y:5,w:3,h:3},{x:42,y:6,w:3,h:3},{x:58,y:5,w:4,h:9},
 {x:36,y:26,w:3,h:4},{x:59,y:28,w:3,h:2},
 {x:15,y:37,w:3,h:3},{x:19,y:33,w:3,h:2},{x:38,y:37,w:3,h:3},{x:46,y:38,w:3,h:3},{x:42,y:33,w:3,h:2}
].map(r=>({...r,color:'#8f7357'}));
const doors=[];
function D(room,side,at,size=3){const r=rooms.find(r=>r.id===room),horizontal=side==='top'||side==='bottom';doors.push({id:`house-door-${room}-${side}-${at}`,room,floor:0,side,x:horizontal?at:side==='left'?r.x:r.x+r.w,y:horizontal?(side==='top'?r.y:r.y+r.h):at,w:horizontal?size:.18,h:horizontal?.18:size});}
D('garage','bottom',8,4);D('garage','right',5);
D('laundry','left',5);D('laundry','bottom',22);D('laundry','right',5);
D('kitchen','left',5);D('kitchen','bottom',34,4);D('kitchen','right',6);
D('dining','left',6);D('dining','bottom',49,4);D('dining','right',6);
D('storage','top',5);D('storage','right',21);
D('living','top',20,4);D('living','left',23);D('living','right',20);D('living','bottom',24,4);
D('hall','top',36);D('hall','left',21);D('hall','right',20);D('hall','bottom',36);
D('office','top',47);D('office','left',20);D('office','right',21);
D('playroom','left',21);D('playroom','top',59);D('playroom','bottom',59);
D('bedroom','top',6,4);D('bedroom','right',37);
D('bath','left',37);D('bath','top',19);
D('kids','top',31,4);D('kids','right',37);
D('toilet','left',37);D('toilet','top',42);D('toilet','right',38);
D('guest','left',38);D('guest','top',54,4);
const props=[];
for(const r of rooms)for(const side of ['top','bottom','left','right']){const horizontal=side==='top'||side==='bottom',own=doors.filter(d=>d.room===r.id&&d.side===side).sort((a,b)=>horizontal?a.x-b.x:a.y-b.y);let at=horizontal?r.x:r.y;const end=horizontal?r.x+r.w:r.y+r.h;
 const wall=stop=>{if(stop-at>.001)props.push(horizontal?{x:at,y:(side==='top'?r.y:r.y+r.h)-.08,w:stop-at,h:.16,kind:'wall'}:{x:(side==='left'?r.x:r.x+r.w)-.08,y:at,w:.16,h:stop-at,kind:'wall'});};
 for(const d of own){wall(horizontal?d.x:d.y);at=horizontal?d.x+d.w:d.y+d.h;}wall(end);}
const art=[],P=(kind,x,y,w,h,extra={})=>(extra.flat?art:props).push({kind:'house-'+kind,x,y,w,h,...extra});
// Garaje
P('car',4.6,4.6,3.2,5.6);P('workbench',11,3.35,4.6,1);P('shelf',15.6,9.4,1,3.2);P('boxes',12.6,9.6,1.6,1.4);P('bike',12.8,12.25,2.2,.9);P('fusebox',3.25,9.6,.7,1.6);P('oilstain',8.6,7.2,1.6,1.2,{flat:true});
// Lavadero
P('washer',20.4,3.3,1.3,1.25);P('dryer',21.95,3.3,1.3,1.25);P('ironing',24,3.4,2.5,.75);P('basket',25.6,9.3,1,.9);
// Cocina
P('counter',30.3,3.3,8,1.15);P('stove',38.5,3.3,1.7,1.15);P('fridge',40.5,3.3,1.3,1.3);P('island',33,8,4,1.6);P('bin',30.4,12.6,.8,.8);P('tiles',30,3,12,11,{flat:true});
// Comedor
P('dining-table',48.5,7,5,2.2,{emergencyBadge:true});P('sideboard',45.4,3.3,3,.9);P('cabinet',54,3.3,2.2,.9);P('plant',56.9,3.4,.8,.8);P('rug',47.6,6,6.8,4.2,{flat:true});
// Trastero
P('shelf',3.3,19,1,4);P('boxes',6.4,24.2,1.8,1.4);P('boxes',4.6,24.4,1.4,1.2);P('ladder',8.6,17.35,1.1,.6);
// Salón
P('tv',25.5,17.3,3.6,.7);P('sofa',25,22.2,4.6,1.25);P('coffee',25.9,20.2,2.6,1);P('armchair',21.6,20.4,1.3,1.3);P('bookshelf',14.4,17.6,.9,3.6);P('piano',15,27.6,2.7,1.2);P('plant',29,28.7,.8,.8);P('lamp',29.1,17.4,.7,.7);P('rug',23.8,19.4,6,4.6,{flat:true});
// Recibidor
P('console',34.4,17.4,1.4,.7);P('coatrack',40,24.7,.8,.8);P('mat',36,25,3,.9,{flat:true});P('plant',34.4,24.8,.8,.8);
// Despacho
P('domotica',50.5,17.3,1.2,.7);P('desk',46.5,23.6,3,1);P('cabinet',50.6,23.8,1,.9);P('plant',45.4,17.4,.8,.8);
// Sala de juegos
P('pingpong',58,21,3.6,2);P('arcade',62.6,17.4,1,1.15);P('beanbag',62.4,25.2,1.2,1.1);P('toychest',56.4,26.6,1.6,.9);P('rug',57.4,20,4.8,4,{flat:true});
// Dormitorio de Latasa
P('bed',3.4,37.5,3.3,4);P('nightstand',3.4,36.4,.9,.8);P('nightstand',3.4,41.8,.9,.8);P('wardrobe',10.8,33.3,3.3,.95);P('dresser',9,41.85,2.6,.8);P('rug',7.6,36.5,3.4,4,{flat:true});
// Baño
P('bathtub',23.5,37.6,1.45,3.6);P('toilet',18.5,41.75,.85,.95);P('washbasin',20.9,41.95,1.3,.8);P('tiles',18,35,7,8,{flat:true});
// Niños
P('bunk',28.4,38,1.7,3.6);P('toychest',33,41.85,1.7,.9);P('desk',35.3,33.3,2.4,.9);P('rug',31,36.6,3.4,3.4,{flat:true});P('toys',31.6,37.2,2.2,2.2,{flat:true});
// Aseo
P('toilet',44.8,41.8,.85,.95);P('washbasin',41.4,42,1.3,.75);P('tiles',41,35,5,8,{flat:true});
// Invitados
P('bed',57,37.4,3.3,4);P('wardrobe',58.8,33.3,3,.95);P('desk',50,33.3,2.6,.9);P('armchair',50.5,41.6,1.3,1.25);P('nightstand',60.6,37.4,.9,.8);
const S=(id,room,label,kind,x,y,length='short')=>({id:'house-'+id,room,label,kind,x:x*T,y:y*T,floor:0,theme:'house',length});
export const STATIONS=[
 S('washer','laundry','Poner la lavadora','washer',21.2,5.4,'long'),S('cook','kitchen','Cocinar una tortilla','cook',39.3,5.3,'long'),
 S('fridge','kitchen','Ordenar la nevera','stock',41.1,5.5),S('dishes','kitchen','Fregar los platos','chalk',33.2,5.3),
 S('fuse','garage','Arreglar el cuadro eléctrico','power',4.7,10.6,'common'),S('toaster','garage','Reparar la tostadora','appliance',13.2,5.2,'long'),
 S('table','dining','Poner la mesa','supplies',51,11.4),S('coffee','dining','Rellenar la cafetera','refill',46.8,5.2),
 S('tv','living','Conectar la tele y la consola','wires',27.2,19.2),S('piano','living','Afinar el piano','bell',16.3,26.6),
 S('alarm','hall','Activar la alarma de la casa','code',39.4,18.4,'common'),S('backup','office','Hacer la copia de seguridad','download',48,22.6,'long'),
 S('arcade','playroom','Reiniciar la recreativa','computer',63,19.4),S('toys','kids','Recoger los juguetes','papers',33.4,38.4),
 S('closet','bedroom','Ordenar el armario','supplies',12.4,34.8),S('bathwater','bath','Regular el agua de la bañera','bath',22.4,39.4),
 S('books','living','Buscar el libro de recetas','book',15.9,19.2),S('trash','kitchen','Sacar la basura','trash',31.2,11.6)
];
export const REPAIRS=[];
const places=[['garage',10,8],['laundry',25.4,7],['kitchen',31.6,10.4],['dining',56.4,11.8],['storage',6.2,19.6],['living',18,19.6],['office',46.2,19],['playroom',63,22.6],['bedroom',12,39],['kids',36.4,40.4],['guest',54,41.4],['bath',20.6,38.6]];
export const VENT_GROUPS=[['garage','kids','office'],['laundry','bedroom','playroom'],['kitchen','storage','guest'],['dining','living','bath']].map(g=>g.map(id=>'house-vent-'+id));
export const VENTS=places.map(([id,x,y])=>{const key='house-vent-'+id,network=VENT_GROUPS.findIndex(g=>g.includes(key));return {id:key,x:x*T,y:y*T,label:rooms.find(r=>r.id===id).name,floor:0,network:network+1,links:VENT_GROUPS[network].filter(v=>v!==key)};});
export const DOORS=doors;
export const CAMERAS=[{id:'west',label:'Pasillo norte · Garaje',floor:0,x:8*T,y:15.5*T},{id:'east',label:'Pasillo norte · Comedor',floor:0,x:52*T,y:15.5*T},{id:'south',label:'Pasillo de los dormitorios',floor:0,x:30*T,y:31.5*T},{id:'living',label:'Salón',floor:0,x:22*T,y:24*T}];
export const CAMERA_CONSOLE={floor:0,x:35.1*T,y:18.6*T,room:'hall'};
// Panel domótico: cuenta cuántas personas hay en cada habitación.
export const LOCATOR_CONSOLE={floor:0,x:51.1*T,y:18.6*T,room:'office'};
export const SABOTAGES={
 lights:{label:'Plomos fundidos',description:'Se va la luz de toda la casa. Repara los dos paneles.',repairKind:'lights'},
 electrical:{label:'Corte en los enchufes',description:'Electrodomésticos sin corriente. Repara el cableado de los paneles.',repairKind:'power'},
 audio:{label:'Caída del wifi',description:'Oculta el progreso de las tareas. Reconecta los dos paneles.',repairKind:'speaker'},
 computers:{label:'Bloqueo del router',description:'Bloquea ordenadores y códigos. Reinicia los paneles.',repairKind:'download'},
 bell:{label:'Alarma de humo',description:'Suena la alarma de toda la casa. Repite la secuencia en los paneles.',repairKind:'bell'},
 ventilation:{label:'Fuga de agua',description:'Se inunda el Baño y nadie puede ducharse. Equilibra las válvulas del panel.',repairKind:'bath'},
 emergency:{label:'Fuga de gas',description:'Dos personas deben cerrar las llaves de la Cocina y el Garaje con menos de 8 s de diferencia. Si pasan 90 s, gana el impostor.',repairKind:'code'}
};
export const WILDLIFE_SPOTS=[[22,25.5,'cat'],[60,24,'dog']];
export const FLOORS=[{id:'house-main',worldId:'house',floor:0,name:'Latasa´s House',width:66,height:45,rooms,corridors,props,visionWalls:props.filter(p=>p.kind==='wall'),decor:[],art,doors,stations:STATIONS,repair:REPAIRS,vents:VENTS,stairs:[],spawn:{floor:0,x:51*T,y:11.6*T},emergency:{floor:0,x:51*T,y:8.1*T}}];
FLOORS[0].areas=[{name:'Pasillo norte',x:3,y:14,w:61,h:3,hideLabel:true},{name:'Pasillo de los dormitorios',x:3,y:30,w:61,h:3,hideLabel:true}];
export const LOBBY={id:'house-lobby',worldId:'house',floor:0,name:'Comedor familiar',width:20,height:16,rooms:[R('lobby','Comedor familiar',1,1,18,14,'#c99d6e')],corridors:[],props:[{x:2,y:1.4,w:4,h:.9,kind:'house-sideboard'},{x:14,y:1.4,w:2.4,h:.9,kind:'house-cabinet'},{x:17.4,y:1.6,w:.8,h:.8,kind:'house-plant'},{x:1.6,y:12.6,w:.8,h:.8,kind:'house-plant'},{x:15.6,y:12.4,w:2.6,h:1.2,kind:'house-piano'}],visionWalls:[],decor:[],art:[{x:5.4,y:4.6,w:9.2,h:6.4,kind:'house-rug'}],spawn:{floor:0,x:10*T,y:7.3*T},stations:[],repair:[],stairs:[],vents:[],doors:[]};
export const MEETING={...LOBBY,id:'house-meeting',isMeeting:true,props:[...LOBBY.props,{x:8.65,y:6.65,w:2.7,h:1.3,kind:'house-dining-table',emergencyBadge:true}]};
export function mapFor(floor=0,blockers=null){const base=FLOORS[0],closed=blockers?.closed||[];return closed.length?withClosedDoors(base,closed):base;}
export const taskStation=task=>STATIONS.find(s=>s.id===task.id);
