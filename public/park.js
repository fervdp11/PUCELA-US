// Campo Grande, reconstruido a partir de la vista aérea de referencia: el parque
// triangular con el lago arriba a la izquierda, el paseo central recto y vacío
// entre dos filas de árboles, bancos y farolas, la red de senderos de tierra, la
// pajarera y la rosaleda abajo a la izquierda y los juegos infantiles arriba a la
// derecha. Todo es vista cenital. El césped no es transitable; las arboledas
// cerradas tapan la vista y el agua la deja pasar.
import {LAYOUT as L} from './park-layout.js';
import {FILL} from './park-fill.js';
const T=56;
export const BOUNDARY=L.fence;
const zone=(id,name,x,y,w,h)=>({id,name,x,y,w,h,color:'#6f9a52',type:'park',zone:true,outline:BOUNDARY});
// Las zonas dan nombre al lugar (votaciones, tareas, sabotajes). Van de la más
// concreta a la más general: la primera que contiene el punto es la que cuenta.
const rooms=[
 zone('paseo','Paseo central',35.2,1.4,6.6,44.6),
 zone('lake','Lago',14.5,1.5,16,9),
 zone('kiosk','Quiosco',17.5,10.5,9,6),
 zone('maintenance','Mantenimiento',45.5,36,10,8.5),
 zone('playground','Parque infantil',52,5,20,12),
 zone('plaza','Plaza de la fuente',20,15.5,11,8.5),
 zone('east','Fuente del este',46,16,10,9),
 zone('aviary','Pajarera',12,23,10.5,9.5),
 zone('rose','Rosaleda',20,30.5,15.2,12),
 zone('garden','Jardines',1.5,2,13,20),
 zone('north','Arboleda norte',42,1.5,10,14.5),
 zone('grove','Arboleda',42,24.5,22,20),
 {id:'park',name:'Campo Grande',hideLabel:true,x:0,y:0,w:L.width,h:L.height,color:'#6f9a52',outline:BOUNDARY}
];
export const PATHS=L.paths;
const props=[];
// Objetos del parque: todos planos, vistos desde arriba.
// 15.0 · Bancos y farolas son sólidos: el banco por su asiento y la farola solo
// por el poste (caja centrada de 0,22 baldosas), sin cerrar el paseo.
for(const o of L.objects)props.push(o.kind==='park-lamp'?{...o,hit:{x:o.x+o.w/2-.11,y:o.y+o.h/2-.11,w:.22,h:.22}}:{...o});
// Arboledas cerradas, quiosco, caseta y pajarera tapan la vista. No se dibujan
// (lo que se ve son las copas y los tejados): solo cortan la línea de visión.
for(const g of L.groves)props.push({kind:'wall',parkGrove:true,...g});
for(const o of L.objects.filter(o=>['park-kiosk','park-shed','park-aviary'].includes(o.kind)))props.push({kind:'wall',parkGrove:true,x:o.x+.08,y:o.y+.08,w:o.w-.16,h:o.h-.16});
const A=L.anchors,at=(key,extra={})=>({x:A[key][0]*T,y:A[key][1]*T,floor:0,...extra});
const objectFor=id=>L.objects.findIndex(o=>o.station===id||(o.stations||[]).includes(id));
const S=(id,room,label,kind,length='short')=>({id:'park-'+id,room,label,kind,...at(id),theme:'park',length,object:objectFor('park-'+id)});
export const STATIONS=[
 S('irrigation','garden','Regular el riego','bath','common'),
 S('seeds','rose','Clasificar semillas','supplies'),
 S('clean','garden','Limpiar el jardín','trash'),
 S('lakefilter','lake','Limpiar el filtro del lago','ventilation','long'),
 S('lakewater','lake','Comprobar el agua del lago','hydration'),
 S('fountain','plaza','Calibrar la bomba de la fuente','calibrate'),
 S('power','maintenance','Conectar el cuadro del parque','wires'),
 S('tools','maintenance','Inventariar las herramientas','equipment'),
 S('service','kiosk','Registrar el suministro del quiosco','stock'),
 S('cameras','kiosk','Descargar las cámaras del parque','download','long'),
 S('paths','grove','Recoger residuos de los senderos','papers'),
 S('lighting','paseo','Orientar las luces del paseo','lights'),
 S('flowers','rose','Ajustar el goteo de la rosaleda','bath'),
 S('feed','aviary','Preparar el alimento de las aves','stock'),
 S('register','playground','Ordenar los permisos del parque','folders')
];
// Topos: madrigueras conectadas en cuatro redes de tres.
const places=['lake','garden','grove','plaza','rose','maintenance','kiosk','north','south','west','east','fountain'];
const HOLE_NAMES={lake:'Orilla del lago',garden:'Jardines',grove:'Arboleda',plaza:'Plaza de la fuente',rose:'Rosaleda',maintenance:'Mantenimiento',kiosk:'Quiosco',north:'Arboleda norte',south:'Senda del sur',west:'Senda del oeste',east:'Senda del este',fountain:'Fuente del este'};
export const VENT_GROUPS=[[0,6,7],[1,9,5],[2,4,8],[3,10,11]].map(g=>g.map(i=>'park-hatch-'+places[i]));
export const VENTS=places.map(id=>{const key='park-hatch-'+id,n=VENT_GROUPS.findIndex(g=>g.includes(key));return {id:key,...at('hatch-'+id),label:HOLE_NAMES[id],mole:true,network:n+1,links:VENT_GROUPS[n].filter(v=>v!==key)};});
export const REPAIRS=[],DOORS=[];
export const CAMERAS=[{id:'lake',label:'Lago y quiosco',...at('cam-lake')},{id:'paseo',label:'Paseo central',...at('cam-paseo')},{id:'playground',label:'Parque infantil',...at('cam-playground')},{id:'garden',label:'Pajarera y rosaleda',...at('cam-garden')}];
export const CAMERA_CONSOLE={...at('cameras'),room:'kiosk'};
export const WILDLIFE_SPOTS=Object.keys(A).filter(k=>/^(peacock|duck|squirrel)\d$/.test(k)).sort((a,b)=>['peacock','duck','squirrel'].indexOf(a.replace(/\d/,''))-['peacock','duck','squirrel'].indexOf(b.replace(/\d/,''))||a.localeCompare(b)).map(k=>A[k]);
// Suelo transitable: senderos de tierra, el paseo y sus pasos laterales, las
// plazas de las fuentes y los suelos de los juegos infantiles.
const WALKABLE={pathRadius:L.pathRadius,rects:[L.paseo,...L.crossings,...FILL,...L.pads.map(({x,y,w,h})=>({x,y,w,h}))],circles:L.plazas.map(({x,y,r})=>({x,y,r}))};
export const SABOTAGES={lights:{label:'Apagón de farolas',description:'Restablece las farolas desde la Arboleda.',repairKind:'lights'},electrical:{label:'Fallo de suministro',description:'Repara el cuadro en Mantenimiento.',repairKind:'power'},doors:{label:'Fallo de los accesos',description:'Reprograma el controlador del Quiosco.',repairKind:'code'},bell:{label:'Alarma del lago',description:'Recalibra el sensor junto al Lago.',repairKind:'calibrate'},computers:{label:'Riego descontrolado',description:'Regula las válvulas en los Jardines.',repairKind:'bath'},ventilation:{label:'Filtrado detenido',description:'Limpia el filtro de la Rosaleda.',repairKind:'ventilation'},emergency:{label:'Bomba en sobrepresión',description:'Coordina Plaza y Lago en menos de 8 s.',repairKind:'code'}};
export const FLOORS=[{id:'campo-grande',worldId:'park',floor:0,name:'Campo Grande',width:L.width,height:L.height,navGrid:16,rooms,corridors:[],props,visionWalls:props.filter(p=>p.kind==='wall'),decor:[],doors:[],stations:STATIONS,vents:VENTS,repair:REPAIRS,stairs:[],fence:BOUNDARY,lake:L.lake,paths:PATHS,walkable:WALKABLE,layout:L,trees:L.trees.filter(([x,y])=>!FILL.some(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h)),spawn:at('spawn'),emergency:{...at('emergency'),floorButton:true}}];
export const MEETING={...FLOORS[0],id:'park-meeting',isMeeting:true};
export const mapFor=()=>FLOORS[0];export const taskStation=t=>STATIONS.find(s=>s.id===t.id);
