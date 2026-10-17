import * as park from './park.js';
import * as gym from './gym.js';
import {layoutRepairs,layoutChests} from './repair-layout.js';
import {CARAVAN} from './caravan.js';
import * as school from './school.js';
import * as club from './club.js';
const T=56;
function make(id,name,data,lobby,meeting,extras={}){for(const map of data.FLOORS)map.emergency.ignoreFurniture=true;const repairs=layoutRepairs(id,data);data.REPAIRS.splice(0,data.REPAIRS.length,...repairs);const chests=layoutChests(id,data);for(const map of data.FLOORS)map.chests=chests.filter(c=>c.floor===map.floor);const w={id,name,...data,CHESTS:chests,REPAIRS:data.REPAIRS,LOBBY:lobby,MEETING:meeting,CAMERAS:data.CAMERAS||[],teachers:true,emergencyRoom:'Recepción',...extras,zoneAt(x,y,floor=0){const fl=data.FLOORS[floor===1?1:0];if(!fl)return {id:'open',name:'Pasillo'};const inside=r=>x>=r.x*T&&x<(r.x+r.w)*T&&y>=r.y*T&&y<(r.y+r.h)*T,list=[...(fl.rooms||[]),...(fl.areas||[])].filter(r=>!r.hideLabel&&r.name),hit=list.find(inside);if(hit)return {id:hit.id,name:hit.name};let best=null,bd=1e9;for(const r of list){const dx=Math.max(r.x*T-x,0,x-(r.x+r.w)*T),dy=Math.max(r.y*T-y,0,y-(r.y+r.h)*T),d=Math.hypot(dx,dy);if(d<bd){bd=d;best=r;}}return best?{id:'~'+best.id,name:`${id==='park'?'Alrededores':'Pasillo'} · ${best.name}`}:{id:'open',name:id==='park'?'Campo Grande':'Pasillo'};},
 };w.roomAt=(x,y,floor=0)=>w.zoneAt(x,y,floor).name;return w;}
const schoolMeeting={...school.SCHOOL_LOBBY,isMeeting:true,props:[...school.SCHOOL_LOBBY.props,{x:8.65,y:6.65,w:2.7,h:1.3,kind:'meeting-table',emergencyBadge:true}]};
export const WORLDS={park:make('park','Campo Grande',park,CARAVAN,park.MEETING,{teachers:false,emergencyRoom:'Paseo central',roleNames:{nerd:'GUARDABOSQUES',delegate:'JARDINERO MAYOR',engineer:'EL TOPO',plug:'LA ARDILLA',believer:'EL VIDENTE DEL LAGO',phantom:'EL ESPECTRO DEL BOSQUE',copier:'EL CAMALEÓN'}}),school:make('school','Colegio',school,CARAVAN,schoolMeeting),club:make('club','Discoteca',club,CARAVAN,club.MEETING,{teachers:false,emergencyRoom:'Escenario principal',roleNames:{nerd:'CAMARERO',delegate:'PORTERO',engineer:'INGENIERO',plug:'DJ',believer:'EL CREYENTE',phantom:'EL FANTASMA',copier:'DUEÑO'},crewLabel:'Personal',impostorLabel:'Impostor'}),gym:make('gym','Sanagus Gym',gym,CARAVAN,gym.MEETING,{teachers:false,emergencyRoom:'Recepción',roleNames:{nerd:'ANALISTA',delegate:'MONITOR',engineer:'VELOCISTA',plug:'SOCORRISTA',believer:'EL CREYENTE',phantom:'EL FANTASMA',copier:'EL DUEÑO'}})};
export function worldFor(value){const id=typeof value==='string'?value:value?.config?.map||value?.map||value?.worldId;return WORLDS[id]||WORLDS.school;}
export const mapFor=(floor=0,sabotage=null,world='school')=>worldFor(world).mapFor(floor,sabotage);
export const taskStation=(task,world='school')=>worldFor(world).taskStation(task);

export function activeRepairs(state,kind=state.sabotage?.kind){if(!kind)return [];const world=worldFor(state);return world.REPAIRS.filter(r=>r.sabotages.includes(kind)&&(state.config.floors==='both'||String(r.floor)===state.config.floors)&&!(kind==='emergency'&&world.id==='school'&&state.config.floors==='both'&&!r.id.endsWith('-0')));}
