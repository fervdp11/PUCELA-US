import * as gym from './gym.js';
import {layoutRepairs,layoutChests} from './repair-layout.js';
import {CARAVAN} from './caravan.js';
import * as house from './house.js';
import * as club from './club.js';
const T=56;
function make(id,name,data,lobby,meeting,extras={}){for(const map of data.FLOORS)map.emergency.ignoreFurniture=true;const repairs=layoutRepairs(id,data);data.REPAIRS.splice(0,data.REPAIRS.length,...repairs);const chests=layoutChests(id,data);for(const map of data.FLOORS)map.chests=chests.filter(c=>c.floor===map.floor);const w={id,name,...data,CHESTS:chests,REPAIRS:data.REPAIRS,LOBBY:lobby,MEETING:meeting,CAMERAS:data.CAMERAS||[],LOCATOR_CONSOLE:data.LOCATOR_CONSOLE||null,teachers:false,emergencyRoom:'Recepción',...extras,zoneAt(x,y,floor=0){const fl=data.FLOORS[floor===1?1:0];if(!fl)return {id:'open',name:'Pasillo'};const inside=r=>x>=r.x*T&&x<(r.x+r.w)*T&&y>=r.y*T&&y<(r.y+r.h)*T,list=[...(fl.rooms||[]),...(fl.areas||[])].filter(r=>!r.hideLabel&&r.name),hit=list.find(inside);if(hit)return {id:hit.id,name:hit.name};let best=null,bd=1e9;for(const r of list){const dx=Math.max(r.x*T-x,0,x-(r.x+r.w)*T),dy=Math.max(r.y*T-y,0,y-(r.y+r.h)*T),d=Math.hypot(dx,dy);if(d<bd){bd=d;best=r;}}return best?{id:'~'+best.id,name:`Pasillo · ${best.name}`}:{id:'open',name:'Pasillo'};},
 };w.roomAt=(x,y,floor=0)=>w.zoneAt(x,y,floor).name;return w;}
const familyRoles={nerd:'EL HERMANO LISTO',delegate:'LA MADRE',engineer:'EL MANITAS',plug:'LA VECINA COTILLA',believer:'LA ABUELA',phantom:'EL FANTASMA DEL DESVÁN',copier:'EL GEMELO',latasa:'LATASA'};
// Tres mapas definitivos. «Latasa» es un rol de impostor exclusivo de la casa.
export const WORLDS={
 club:make('club','Moss Club',club,CARAVAN,club.MEETING,{teachers:false,emergencyRoom:'Escenario principal',roleNames:{nerd:'CAMARERO',delegate:'PORTERO',engineer:'INGENIERO',plug:'DJ',believer:'EL CREYENTE',phantom:'EL FANTASMA',copier:'DUEÑO'},crewLabel:'Personal',impostorLabel:'Impostor',impostorRoles:['phantom','copier']}),
 gym:make('gym','El Palero Gym',gym,CARAVAN,gym.MEETING,{teachers:false,emergencyRoom:'Recepción',roleNames:{nerd:'ANALISTA',delegate:'MONITOR',engineer:'VELOCISTA',plug:'SOCORRISTA',believer:'EL CREYENTE',phantom:'EL FANTASMA',copier:'EL DUEÑO'},impostorRoles:['phantom','copier']}),
 house:make('house','Latasa´s House',house,CARAVAN,house.MEETING,{teachers:false,emergencyRoom:'Comedor',roleNames:familyRoles,crewLabel:'Familia',impostorLabel:'Impostor',impostorRoles:['latasa','phantom','copier']})
};
export const DEFAULT_WORLD='club';
export function worldFor(value){const id=typeof value==='string'?value:value?.config?.map||value?.map||value?.worldId;return WORLDS[id]||WORLDS[DEFAULT_WORLD];}
export const mapFor=(floor=0,blockers=null,world=DEFAULT_WORLD)=>worldFor(world).mapFor(floor,blockers);
export const taskStation=(task,world=DEFAULT_WORLD)=>worldFor(world).taskStation(task);

export function activeRepairs(state,kind=state.sabotage?.kind){if(!kind)return [];const world=worldFor(state);return world.REPAIRS.filter(r=>r.sabotages.includes(kind)&&(state.config.floors==='both'||String(r.floor)===state.config.floors));}

// Bloqueos activos (sabotaje + puertas cerradas por el impostor). Los mapas
// usan solo la lista `closed`; el resto de reglas siguen leyendo room.sabotage.
export function blockersOf(state,now=Date.now()){const s=state?.sabotage||null,locks=(state?.doorLocks||[]).filter(l=>l.until>now);if(!locks.length)return s;return {...(s||{}),kind:s?.kind||null,closed:[...(s?.closed||[]),...locks.flatMap(l=>l.doors)]};}
