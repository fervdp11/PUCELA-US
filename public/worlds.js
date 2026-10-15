import {CARAVAN} from './caravan.js';
import * as school from './school.js';
import * as club from './club.js';
const T=56;
function make(id,name,data,lobby,meeting,extras={}){return {id,name,...data,LOBBY:lobby,MEETING:meeting,CAMERAS:data.CAMERAS||[],teachers:true,emergencyRoom:'Recepción',...extras,roomAt(x,y,floor=0){return data.FLOORS[floor===1?1:0]?.rooms.find(r=>x>=r.x*T&&x<(r.x+r.w)*T&&y>=r.y*T&&y<(r.y+r.h)*T)?.name||data.FLOORS[floor===1?1:0]?.areas?.find(r=>x>=r.x*T&&x<(r.x+r.w)*T&&y>=r.y*T&&y<(r.y+r.h)*T)?.name||'Pasillo';}};}
const schoolMeeting={...school.SCHOOL_LOBBY,isMeeting:true,props:[...school.SCHOOL_LOBBY.props,{x:8.65,y:6.65,w:2.7,h:1.3,kind:'meeting-table',emergencyBadge:true}]};
export const WORLDS={school:make('school','Colegio',school,CARAVAN,schoolMeeting),club:make('club','Discoteca',club,CARAVAN,club.MEETING,{teachers:false,emergencyRoom:'Escenario principal',roleNames:{nerd:'CAMARERO',delegate:'PORTERO',engineer:'INGENIERO',plug:'DJ',believer:'EL CREYENTE',phantom:'EL FANTASMA',copier:'DUEÑO'},crewLabel:'Personal',impostorLabel:'Impostor'})};
export function worldFor(value){const id=typeof value==='string'?value:value?.config?.map||value?.map||value?.worldId;return WORLDS[id]||WORLDS.school;}
export const mapFor=(floor=0,sabotage=null,world='school')=>worldFor(world).mapFor(floor,sabotage);
export const taskStation=(task,world='school')=>worldFor(world).taskStation(task);
