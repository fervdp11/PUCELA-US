import {withClosedDoors} from './visibility.js';
// El Palero Gym: retícula de pasillos con varias rutas. Cada sala tiene al
// menos dos salidas; el pasillo norte, el central y el sur se unen por cuatro
// pasillos verticales, y los vestuarios, las duchas y la recepción se
// comunican entre sí. Plano propio (no copia el de Moss Club).
const T=56,R=(id,name,x,y,w,h,color)=>({id,name,x,y,w,h,color,type:'gym'});
const rooms=[R('cardio','Zona de cardio',3,3,16,11,'#6cabb0'),R('yoga','Yoga y pilates',23,3,11,9,'#b7a898'),R('security','Seguridad',38,3,7,8,'#698e9c'),
 {...R('pavilion','Pabellón deportivo',49,3,18,20,'#c9a376'),outline:[[49,3],[67,3],[67,23],[51,23],[49,21]]},
 R('strength','Zona de fuerza',3,17,15,15,'#63737f'),R('activities','Sala de actividades',22,17,13,11,'#b7a4bb'),
 R('maintenance','Mantenimiento',39,17,7,6,'#9da58b'),R('storage','Almacén deportivo',39,25,7,7,'#b89f81'),
 {...R('lockers','Vestuarios',3,35,11,11,'#8ba9b6'),outline:[[3,35],[14,35],[14,46],[5,46],[3,44]]},R('showers','Duchas y baños',17,35,8,11,'#92c2bd'),
 R('reception','Recepción',28,35,14,11,'#78b7ac'),{...R('pool','Piscina cubierta',49,27,18,19,'#8ebdbc'),outline:[[49,27],[67,27],[67,43],[64,46],[49,46]]}];
const corridors=[{x:3,y:14,w:46,h:3},{x:19,y:3,w:4,h:11},{x:34,y:5,w:4,h:9},{x:45,y:3,w:4,h:11},{x:27,y:12,w:3,h:2},{x:40,y:11,w:3,h:3},
 {x:18,y:17,w:4,h:18},{x:35,y:17,w:4,h:15},{x:46,y:14,w:3,h:32},{x:26,y:28,w:3,h:4},{x:3,y:32,w:43,h:3},{x:55,y:23,w:4,h:4},
 {x:14,y:38,w:3,h:3},{x:25,y:38,w:3,h:3},{x:42,y:39,w:4,h:3}].map(r=>({...r,color:'#445d65'})),doors=[];
function D(room,side,at,size=3){const r=rooms.find(r=>r.id===room),horizontal=['top','bottom'].includes(side);doors.push({id:`gym-door-${room}-${side}-${at}`,room,floor:0,side,x:horizontal?at:side==='left'?r.x:r.x+r.w,y:horizontal?side==='top'?r.y:r.y+r.h:at,w:horizontal?size:.18,h:horizontal?.18:size});}
D('cardio','right',6);D('cardio','bottom',8,4);D('yoga','left',6);D('yoga','right',7);D('yoga','bottom',27);D('security','left',6);D('security','right',5);D('security','bottom',40);
D('pavilion','left',5);D('pavilion','left',14);D('pavilion','left',19);D('pavilion','bottom',55,4);
D('strength','top',8,4);D('strength','right',22);D('strength','bottom',8,4);D('activities','top',27,4);D('activities','left',21);D('activities','right',24);D('activities','bottom',26);
D('maintenance','top',41);D('maintenance','left',19);D('maintenance','right',19);D('storage','left',28);D('storage','right',28);
D('lockers','top',7,4);D('lockers','right',38);D('showers','left',38);D('showers','top',19);D('showers','right',38);
D('reception','top',33,4);D('reception','left',38);D('reception','right',39);D('pool','left',30);D('pool','left',40);D('pool','top',55,4);
const props=[];for(const r of rooms)for(const side of ['top','bottom','left','right']){const horizontal=['top','bottom'].includes(side),own=doors.filter(d=>d.room===r.id&&d.side===side).sort((a,b)=>horizontal?a.x-b.x:a.y-b.y);let at=horizontal?r.x:r.y;const end=horizontal?r.x+r.w:r.y+r.h;function wall(stop){if(stop-at>.001)props.push(horizontal?{x:at,y:(side==='top'?r.y:r.y+r.h)-.08,w:stop-at,h:.16,kind:'wall'}:{x:(side==='left'?r.x:r.x+r.w)-.08,y:at,w:.16,h:stop-at,kind:'wall'});}for(const d of own){wall(horizontal?d.x:d.y);at=horizontal?d.x+d.w:d.y+d.h;}wall(end);}
const floorArt=[],P=(kind,x,y,w,h,extra={})=>(extra.flat?floorArt:props).push({kind:'gym-'+kind,x,y,w,h,...extra});
// Recepción
P('reception-desk',32,40,6,1.1);props.push({kind:'locator-terminal',x:40.35,y:41.6,w:1.5,h:.8});P('emergency-table',33.7,42.8,2.6,1.5);P('sofa',28.6,44.6,3,.9);P('sofa',38.4,44.6,3,.9);P('vending',40.6,36.2,1.2,1.6);P('plant',28.4,35.4,.9,.9);P('smoothie',36,35.3,3.6,1);
// Cardio
for(const x of [4,7.6,11.2])P('treadmill',x,3.6,2.3,3.1);P('treadmill',15.6,3.6,2.3,3.1);for(const x of [3.8,13.6,16.4])P('bike',x,10.4,1.5,2.4);P('mirror',3.4,3.15,8,.15);
// Yoga
for(const [x,y] of [[24.4,4.4],[28.2,4.4],[24.4,8],[28.2,8]])P('mat',x,y,2.4,1.9,{flat:true});P('mirror',23.4,3.15,10.2,.15);P('cabinet',31.6,9.4,2,.8);P('plant',32.8,4.2,.8,.8);
// Seguridad
P('security-console',38.6,3.4,4.6,1.4);P('server',43.9,7.4,.9,2.6);P('chair',39.8,5.6,1,1);
// Pabellón
for(const x of [50.4,63.6])P('sports-rack',x,3.6,2.3,1);P('basket',51.2,9.4,1.3,1.8);P('basket',64.6,9.4,1.3,1.8);P('goal',55.4,3.35,5.2,.65);P('goal',55.4,20.55,5.2,.65);P('ball-cart',64.4,16.2,1.3,2);P('bleachers',61.6,19.8,4.6,1.4);
// Fuerza
for(const x of [3.4,12.8,15.3])P('rack',x,18.2,2.4,2.3);for(const x of [4.4,9.6]){P('bench',x,24.6,2.5,1);P('dumbbells',x,29.6,2.5,.8);}P('weights',15.4,27.6,1.1,1.1);P('cable-machine',14.1,23.4,2.2,2.2);
// Actividades
for(const x of [23,26.4,29.8])P('bike',x,18.3,1.5,2.2);P('mirror',22.3,17.15,4.5,.15);P('mirror',31.3,17.15,3.5,.15);for(const x of [23.6,28.2])P('mat',x,23.6,2.6,1.9,{flat:true});P('bench',31.8,26.4,2.4,.8);P('speaker',33.6,17.6,.9,1.3);
// Mantenimiento y almacén
P('electric',44.9,17.5,.7,1.5);P('tool-rack',40,21.6,1.8,.8);P('sports-rack',40,30.4,2.2,1.1);P('crate',44,25.5,1.5,.9);P('crate',42.4,25.5,1.3,.9);
// Vestuarios y duchas
for(const x of [3.3,11.6])P('locker',x,35.4,2.1,2.4);P('bench',5.2,40.6,2.6,.9);P('locker',10.6,43.4,2.1,2);for(const x of [17.6,19.8,22])P('shower',x,44,1.1,1.6);P('sink',21.8,35.5,1.1,1.1);P('sink',23.6,35.5,1.1,1.1);
// Piscina
P('pool',52,30.4,12.4,11.4);for(const x of [51,56,61])P('bench',x,44.3,2.7,.7);P('plant',65.6,28,1,1);P('plant',49.6,44.6,1,1);P('electric',65.9,36,.8,1.5);P('lifeguard',64.8,40.2,1.2,1.2);
const S=(id,room,label,kind,x,y,length='short')=>({id:'gym-'+id,room,label,kind,x:x*T,y:y*T,floor:0,theme:'gym',length});
export const STATIONS=[S('membership','reception','Registrar socios','vip',35,39.2,'common'),S('files','reception','Actualizar las fichas de socios','folders',31,39.2),S('dispenser','reception','Rellenar el dispensador de batidos','refill',37.8,36.9),
 S('treadmill','cardio','Calibrar la cinta de correr','treadmill',5.2,7.6,'long'),S('bike','cardio','Ajustar la bicicleta','spinning',10,9.4),
 S('weights','strength','Reparar la polea de pesas','weights',15.9,26.2,'long'),S('plates','strength','Ordenar los discos','plates',5.8,21.6),
 S('score','pavilion','Ajustar el marcador','scoreboard',58,6.2),S('basket','pavilion','Comprobar la canasta','basketball',53.4,12.6,'long'),S('balls','pavilion','Organizar el material del pabellón','equipment',63.6,16.6),
 S('lockers','lockers','Gestionar las taquillas','lockers',7.8,38.6),S('water','showers','Rellenar el dispensador de agua','hydration',21,38.2),
 S('air','pool','Regular el aire de la piscina','ventilation',62.4,44),S('pool','pool','Comprobar el filtrado de la piscina','ventilation',51,36.2),
 S('mats','yoga','Preparar las esterillas','equipment',30.2,7.2),S('power','maintenance','Reparar el cuadro eléctrico','power',43.4,19,'common'),
 S('cables','maintenance','Conectar cables de máquinas','wires',41.2,19.6),S('footage','security','Descargar las grabaciones','download',41,6.85,'long'),
 S('activities','activities','Ajustar la sesión de spinning','spinning',27,21.6)];
export const REPAIRS=[];
const places=[['reception',29.6,42.2],['yoga',31.6,6],['security',42.6,8.6],['strength',16,30.4],['cardio',17,9.8],['pavilion',64.6,22],['lockers',12.4,40.4],['maintenance',43.4,21.8],['storage',44.6,29.6],['activities',32.4,19.6],['showers',23.6,40],['pool',65.4,32.6]];
export const VENT_GROUPS=[[0,3,6],[1,4,9],[2,5,8],[7,10,11]].map(g=>g.map(i=>'gym-vent-'+places[i][0]));
export const VENTS=places.map(([id,x,y])=>{const key='gym-vent-'+id,network=VENT_GROUPS.findIndex(g=>g.includes(key));return {id:key,x:x*T,y:y*T,label:rooms.find(r=>r.id===id).name,floor:0,network:network+1,links:VENT_GROUPS[network].filter(v=>v!==key)};});
export const DOORS=doors;
export const CAMERAS=[{id:'reception',label:'Pasillo sur · Recepción',floor:0,x:30*T,y:33.5*T},{id:'west',label:'Cruce de fuerza',floor:0,x:20*T,y:26*T},{id:'east',label:'Piscina y pabellón',floor:0,x:47.5*T,y:25*T},{id:'north',label:'Pasillo norte',floor:0,x:26*T,y:15.5*T}];
export const CAMERA_CONSOLE={floor:0,x:41*T,y:6.85*T,room:'security'};
// Terminal de socios: cuenta cuántas personas hay en cada sala.
export const LOCATOR_CONSOLE={floor:0,x:41.1*T,y:43.1*T,room:'reception'};
export const SABOTAGES={lights:{label:'Corte de iluminación',description:'Reorienta los focos en Seguridad.',repairKind:'lights'},electrical:{label:'Fallo de las máquinas',description:'Restablece el cuadro de Mantenimiento.',repairKind:'power'},bell:{label:'Alarma del pabellón',description:'Sincroniza el marcador del Pabellón.',repairKind:'scoreboard'},computers:{label:'Caída del servidor',description:'Reinicia el controlador del Almacén.',repairKind:'computer'},audio:{label:'Interferencia de música',description:'Repara el sonido en Actividades.',repairKind:'speaker'},ventilation:{label:'Ventilación detenida',description:'Desatasca el sistema de Duchas y baños.',repairKind:'ventilation'},emergency:{label:'Sobrecalentamiento crítico',description:'Coordina los terminales de Fuerza y Piscina en menos de 8 s.',repairKind:'code'}};
export const FLOORS=[{id:'gym-main',worldId:'gym',floor:0,name:'El Palero Gym',width:70,height:49,rooms,corridors,props,visionWalls:props.filter(p=>p.kind==='wall'),decor:[],art:floorArt,doors,stations:STATIONS,repair:REPAIRS,vents:VENTS,stairs:[],spawn:{floor:0,x:35*T,y:37.6*T},emergency:{floor:0,x:35*T,y:43.55*T}}];
export const MEETING={...FLOORS[0],id:'gym-meeting',isMeeting:true};
export function mapFor(floor=0,blockers=null){const base=FLOORS[0],closed=blockers?.closed||[];return closed.length?withClosedDoors(base,closed):base;}
export const taskStation=task=>STATIONS.find(s=>s.id===task.id);
