// 16.2 · Mecánicas propias de cada escenario, compartidas por servidor y cliente:
//  · Pasadizos secretos: unos para todos y otros solo para impostores (equilibrados).
//  · Escondites (taquillas, armarios, cabinas) con límite de usos y de tiempo.
//  · Interruptores de luz por sala, independientes de los sabotajes.
//  · Eventos del escenario (música en el club, clases en el gimnasio, sucesos en casa).
// Las posiciones se calculan una vez a partir del mapa real: siempre en suelo libre,
// lejos de tareas, alcantarillas y cofres, así que respetan colisiones y paredes.
import {WORLDS,canStand,TILE} from './content.js';

export const PASSAGE_RANGE=70,HIDE_RANGE=72,SWITCH_RANGE=70;
export const PASSAGE_COOLDOWN=6000,HIDE_MAX_MS=12000,HIDE_USES=3,HIDE_COOLDOWN=8000,SWITCH_COOLDOWN=5000,SWITCH_OFF_MS=40000;
export const EVENT_MS=20000,EVENT_FIRST=[55000,80000],EVENT_GAP=[90000,140000];
export const DARK_ROOM_VISION=.5;

const DEFS={
 club:{
  passages:[['security','comms',false,'Trampilla del almacén'],['electrical','navigation',false,'Pasillo de servicio'],['main','vip',true,'Puerta oculta tras el telón'],['oxygen','secondary',true,'Conducto de humo']],
  hides:[['secondary','Cabina del DJ'],['vip','Reservado con cortina'],['security','Taquilla del personal']],
  switches:['vip','comms','oxygen'],
  events:[{kind:'music',label:'¡El DJ cambia de estilo: hora del reguetón!',tint:'#ff4fd8'},{kind:'music',label:'Sesión techno: luces estroboscópicas',tint:'#4fd8ff'},{kind:'music',label:'Canción lenta: la pista se queda a media luz',tint:'#ffb347'}]},
 gym:{
  passages:[['lockers','storage',false,'Pasillo de las taquillas'],['strength','activities',false,'Puerta del almacén de discos'],['maintenance','pool',true,'Galería de la depuradora'],['showers','security',true,'Registro de tuberías']],
  hides:[['lockers','Taquilla grande'],['storage','Armario del material'],['showers','Cabina de ducha']],
  switches:['yoga','storage','showers'],
  events:[{kind:'activity',label:'¡Empieza la clase de zumba en la Sala de actividades!',room:'activities',tint:'#ffe45f'},{kind:'activity',label:'Partido en el pabellón: se oye el silbato',room:'pavilion',tint:'#4be39b'},{kind:'activity',label:'Aquagym en la piscina cubierta',room:'pool',tint:'#4aa8ff'}]},
 house:{
  passages:[['laundry','storage',false,'Hueco de la escalera'],['office','hall',false,'Puerta corredera del despacho'],['garage','bedroom',true,'Trampilla del garaje'],['toilet','kitchen',true,'Montaplatos']],
  hides:[['bedroom','Armario de Latasa'],['guest','Armario empotrado'],['kids','Debajo de la litera']],
  switches:['living','kids','garage'],
  events:[{kind:'domestic',label:'¡Ding-dong! Suena el timbre de casa',room:'hall',tint:'#f2c27a'},{kind:'domestic',label:'La lavadora centrifuga en el lavadero',room:'laundry',tint:'#9ad6ff'},{kind:'domestic',label:'Se enciende sola la tele del salón',room:'living',tint:'#b8a5ff'}]},
};

const cache=new Map();
function roomOf(map,id){return map.rooms.find(r=>r.id===id);}
// Busca suelo libre dentro de la sala, con holgura, lejos de lo interactuable.
function freePoint(world,map,room,avoid,prefer=[.22,.3]){
 const busy=[...(world.STATIONS||[]),...(world.VENTS||[]),...(world.CHESTS||[]),...(world.REPAIRS||[]),...avoid].filter(o=>(o.floor??0)===map.floor);
 const ok=(x,y,gap,pad)=>[[0,0],[pad,0],[-pad,0],[0,pad*.8],[0,-pad*.7]].every(([dx,dy])=>canStand(map,x+dx,y+dy))&&busy.every(o=>Math.hypot(o.x-x,o.y-y)>gap);
 const cand=[];for(let gy=0;gy<=14;gy++)for(let gx=0;gx<=14;gx++){const u=.08+gx*.06,v=.1+gy*.057;cand.push([u,v,Math.hypot(u-prefer[0],v-prefer[1])]);}
 cand.sort((a,b)=>a[2]-b[2]);
 for(const [gap,pad] of [[95,24],[70,16],[52,8]])for(const [u,v] of cand){const x=Math.round((room.x+room.w*u)*TILE),y=Math.round((room.y+room.h*v)*TILE);if(ok(x,y,gap,pad))return {x,y,floor:map.floor};}
 return null;
}
export function mechanicsFor(worldOrId){const id=typeof worldOrId==='string'?worldOrId:worldOrId?.id;if(cache.has(id))return cache.get(id);
 const def=DEFS[id],world=WORLDS[id];if(!def||!world){const empty={passages:[],hides:[],switches:[],events:[]};cache.set(id,empty);return empty;}
 const map=world.FLOORS[0],used=[];const place=(roomId,prefer)=>{const r=roomOf(map,roomId);const p=r&&freePoint(world,map,r,used,prefer);if(p)used.push(p);return p;};
 const passages=[];def.passages.forEach(([a,b,imp,label],i)=>{const pa=place(a,[.82,.25]),pb=place(b,[.18,.78]);if(pa&&pb)passages.push({id:`${id}-pass-${i}`,impostorOnly:imp,label,a:{...pa,room:a},b:{...pb,room:b}});});
 const hides=[];def.hides.forEach(([r,label],i)=>{const p=place(r,[.85,.7]);if(p)hides.push({id:`${id}-hide-${i}`,room:r,label,...p});});
 const switches=[];def.switches.forEach((r,i)=>{const room=roomOf(map,r),p=place(r,[.12,.2]);if(p&&room)switches.push({id:`${id}-switch-${i}`,room:r,name:room.name,rect:{x:room.x,y:room.y,w:room.w,h:room.h},...p});});
 const out={passages,hides,switches,events:def.events};cache.set(id,out);return out;}

export function darkRoomAt(world,off,x,y,floor=0){if(!off)return null;const m=mechanicsFor(world);for(const s of m.switches){if(!off[s.room]||(s.floor??0)!==floor)continue;const r=s.rect;if(x>=r.x*TILE&&x<(r.x+r.w)*TILE&&y>=r.y*TILE&&y<(r.y+r.h)*TILE)return s.room;}return null;}
