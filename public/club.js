import {dressClub} from './club-decor.js';
// Discoteca original: distribución y conexiones tomadas del plano facilitado.
// Una casilla comparte las unidades del colegio (56 px); corredores de 2–3 casillas.
const T=56;
const R=(id,name,x,y,w,h,color,staff=false)=>({id,name,x,y,w,h,color,type:'club',staff,door:'bottom'});
const octagon=(r,n=1)=>({...r,outline:[[r.x+n,r.y],[r.x+r.w-n,r.y],[r.x+r.w,r.y+n],[r.x+r.w,r.y+r.h-n],[r.x+r.w-n,r.y+r.h],[r.x+n,r.y+r.h],[r.x,r.y+r.h-n],[r.x,r.y+n]]});
const main=octagon(R('main','Escenario principal',26,2,15,15,'#322854'),2),secondary={...octagon(R('secondary','Escenario secundario',29,24,9,12,'#353655')),stageEdge:'south'};
const rooms=[main,secondary,R('security','Seguridad',15,14,5,8,'#204f50',true),R('vip','Reservado',39,20,7,7,'#56344f'),R('electrical','Electricidad',21,22,7,9,'#3b4c41',true),R('comms','Comunicación',39,32,7,5,'#32434f',true),R('navigation','Navegación',54,15,7,7,'#294653',true),R('oxygen','O2',44,15,5,5,'#335549',true)];
const corridors=[
 {x:8,y:6,w:7,h:7},{x:15,y:8,w:11,h:3},{x:10,y:13,w:3,h:11},{x:2,y:13,w:6,h:11},{x:8,y:17,w:7,h:3},
 {x:20,y:11,w:6,h:9},{x:8,y:24,w:7,h:7},{x:15,y:26,w:6,h:3},{x:18,y:26,w:3,h:8},{x:18,y:31,w:12,h:3},
 {x:32,y:17,w:3,h:7},{x:35,y:21,w:4,h:3},{x:41,y:9,w:3,h:3},{x:44,y:4,w:7,h:8},{x:47,y:12,w:6,h:3},
 {x:50,y:12,w:3,h:18},{x:53,y:17,w:1,h:3},{x:41,y:14,w:3,h:5},{x:49,y:16,w:1,h:3},
 {x:47,y:27,w:6,h:6},{x:38,y:28,w:9,h:3},{x:40,y:30,w:3,h:2}
].map(r=>({...r,color:'#263349'}));
const doors=[];const D=(room,side,at,size=3)=>{const r=rooms.find(r=>r.id===room),horizontal=side==='top'||side==='bottom';doors.push({id:'club-door-'+room+'-'+side+'-'+at,floor:0,room,side,x:horizontal?at:side==='left'?r.x:r.x+r.w,y:horizontal?(side==='top'?r.y:r.y+r.h):at,w:horizontal?size:.25,h:horizontal?.25:size});};
D('main','left',8);D('main','right',9);D('main','right',14);D('main','bottom',32);
D('secondary','top',32);D('secondary','left',31);D('secondary','right',28);
D('security','left',17);D('vip','left',21);D('electrical','bottom',24);D('comms','top',40);D('navigation','left',17);D('oxygen','left',16);D('oxygen','right',16);
const props=[];
for(const r of rooms){const own=doors.filter(d=>d.room===r.id),wall=(x,y,w,h)=>{if(w>.001&&h>.001)props.push({x,y,w,h,kind:'wall'});};
 for(const side of ['top','bottom']){let at=r.x;for(const d of own.filter(d=>d.side===side).sort((a,b)=>a.x-b.x)){wall(at,(side==='top'?r.y:r.y+r.h)-.08,d.x-at,.16);at=d.x+d.w;}wall(at,(side==='top'?r.y:r.y+r.h)-.08,r.x+r.w-at,.16);}
 for(const side of ['left','right']){let at=r.y;for(const d of own.filter(d=>d.side===side).sort((a,b)=>a.y-b.y)){wall((side==='left'?r.x:r.x+r.w)-.08,at,.16,d.y-at);at=d.y+d.h;}wall((side==='left'?r.x:r.x+r.w)-.08,at,.16,r.y+r.h-at);}
}
props.push({x:32.2,y:9,w:2.6,h:1.5,kind:'club-emergency-table'});
const station=(id,room,label,kind,x,y)=>({id:'club-'+id,room,label,kind,floor:0,x:x*T,y:y*T,theme:'club'});
export const STATIONS=[
 station('mix','main','Preparar la mesa de mezclas','dj',33,5.5),station('laser','main','Orientar los focos de la pista','lights',29,8),
 station('clean','main','Limpiar la barra','chalk',37.5,13),station('rhythm','secondary','Probar la secuencia musical','bell',33,27.5),
 station('speakers','secondary','Sincronizar los altavoces','speaker',36,31.5),station('drinks','vip','Reponer bebidas del reservado','stock',43,24),
 station('guestlist','vip','Preparar el acceso VIP','vip',40.5,24),station('power','electrical','Restablecer el generador','power',24.5,24.5),
 station('backup','electrical','Descargar diagnóstico eléctrico','download',26,28.5),station('messages','comms','Introducir el código de radio','code',42,34.5),
 station('schedule','navigation','Calibrar las señales del club','calibrate',57,18),station('air','oxygen','Ajustar la ventilación','bath',46,18),
 station('footage','security','Descargar grabaciones de seguridad','download',17.5,16),station('vinyl','main','Encontrar el vinilo del set','book',38.5,8),
 station('litter','secondary','Vaciar los residuos de la pista','trash',34,33)
];
export const REPAIRS=[{id:'club-repair-a',floor:0,room:'electrical',x:23*T,y:29*T,label:'Cuadro eléctrico · Electricidad'},{id:'club-repair-b',floor:0,room:'oxygen',x:45.5*T,y:18*T,label:'Control ambiental · O2'}];
const places=[['main',28.5,13,'Escenario principal'],['vip',44.5,23,'Reservado'],['navigation',59,20.5,'Navegación'],['secondary',31,33,'Escenario secundario'],['electrical',26,25,'Electricidad'],['comms',44.5,34,'Comunicación'],['security',18.7,20,'Seguridad'],['west',4.5,16,'Pasillo oeste'],['northwest',11,7.5,'Pasillo superior'],['northeast',46,6.5,'Pasillo noreste'],['southeast',51,30.5,'Pasillo sureste'],['oxygen',45.5,16,'O2']];
export const VENT_GROUPS=[['main','vip','navigation'],['secondary','electrical','comms'],['security','west','northwest'],['northeast','southeast','oxygen']].map(g=>g.map(id=>'club-vent-'+id));
export const VENTS=places.map(([id,x,y,label])=>{id='club-vent-'+id;const network=VENT_GROUPS.findIndex(g=>g.includes(id));return {id,x:x*T,y:y*T,label,floor:0,network:network+1,links:VENT_GROUPS[network].filter(q=>q!==id)};});
export const CAMERAS=[{id:'west',label:'Pasillo oeste',floor:0,x:11.5*T,y:17.5*T},{id:'central',label:'Acceso al reservado',floor:0,x:33.5*T,y:20.5*T},{id:'east',label:'Pasillo este',floor:0,x:51.5*T,y:19.5*T},{id:'south',label:'Acceso al escenario secundario',floor:0,x:26.5*T,y:32.5*T}];
export const CAMERA_CONSOLE={floor:0,x:17.5*T,y:16*T,room:'security'};
export const SABOTAGES={vip:{label:'Cierre del reservado',description:'Bloquea el acceso VIP durante 18 s. Repara los dos paneles antes de 90 s.',repairKind:'code'},overload:{label:'Sobrecarga de la cabina DJ',description:'Desactiva la mesa de mezclas y reduce la visión del personal. Calibra los dos paneles.',repairKind:'dj'},audio:{label:'Caída del sonido y las comunicaciones',description:'Oculta el registro de tareas y apaga el sonido. Repara las conexiones de los dos paneles.',repairKind:'speaker'},lights:{label:'Corte de focos',description:'Reduce la visión del personal. Repara los dos paneles.',repairKind:'lights'},doors:{label:'Bloqueo de accesos',description:'Cierra algunos accesos durante 18 segundos. Repara los paneles.',repairKind:'bath'},electrical:{label:'Apagón técnico',description:'Desconecta equipos y focos. Repara el cableado de ambos paneles.',repairKind:'power'},bell:{label:'Interferencia de sonido',description:'Bloquea el plano y activa la alarma. Repite la secuencia de los paneles.',repairKind:'bell'},computers:{label:'Caída de los equipos',description:'Bloquea códigos y ordenadores. Reinicia los dos paneles.',repairKind:'download'},emergency:{label:'Fuga de refrigeración',description:'Dos personas deben confirmar los paneles de Electricidad y O2 con menos de 8 s de diferencia. Si pasan 90 s, gana el impostor.',repairKind:'code'}};
export const FLOORS=[{id:'club-main',worldId:'club',floor:0,name:'Discoteca · Sanagus Club',width:63,height:39,rooms,corridors,props,visionWalls:props.filter(p=>p.kind==='wall'),decor:[],doors,stations:STATIONS,repair:REPAIRS,vents:VENTS,stairs:[],spawn:{floor:0,x:33.5*T,y:13*T},emergency:{floor:0,x:33.5*T,y:9.75*T}}];
export const DOORS=doors;
export const LOBBY={id:'club-lobby',worldId:'club',floor:0,name:'Backstage · Discoteca',width:20,height:16,rooms:[R('lobby','Backstage',1,1,18,14,'#332b4f')],corridors:[],props:[{x:3,y:2,w:12,h:.7,kind:'dj-booth'},...[5,9].flatMap(y=>[3,7,11,15].map(x=>({x,y,w:1.7,h:1.1,kind:'club-table'}))),{x:17.5,y:2,w:1,h:2,kind:'speaker'},{x:1.5,y:11.7,w:.8,h:2,kind:'club-locker'},{x:16.3,y:12.8,w:2,h:.65,kind:'club-sofa'},{x:2.5,y:13,w:2.3,h:.6,kind:'club-bar'},{x:17.4,y:10.5,w:1,h:.9,kind:'club-smoke'}],visionWalls:[],decor:[],spawn:{floor:0,x:10*T,y:7.3*T},stations:[],repair:[],stairs:[],vents:[],doors:[]};
export const MEETING={...LOBBY,id:'club-meeting',isMeeting:true,props:[...LOBBY.props,{x:8.65,y:6.65,w:2.7,h:1.3,kind:'club-emergency-table'}]};
export function mapFor(floor=0,sabotage=null){const base=FLOORS[0];if(!['doors','vip'].includes(sabotage?.kind))return base;const closed=new Set(sabotage.closed||[]),extra=base.doors.filter(d=>closed.has(d.id)).map(d=>({...d,kind:'closed-door'}));return {...base,props:[...base.props,...extra],visionWalls:[...base.visionWalls,...extra]};}
export function taskStation(t){return STATIONS.find(s=>s.id===t.id);}

dressClub(FLOORS[0],{stations:STATIONS,repair:REPAIRS,vents:VENTS});
dressClub(LOBBY);
MEETING.props=[...LOBBY.props,{x:8.65,y:6.65,w:2.7,h:1.3,kind:'club-emergency-table'}];
