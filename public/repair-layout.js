import {terrainFits} from './park-ground.js';
// Cada avería tiene paneles exclusivos. La elección de planta limita qué
// terminales están activos, sin mandar a un jugador a una planta deshabilitada.
const plans={park:{lights:['grove'],electrical:['maintenance'],doors:['kiosk'],bell:['lake'],computers:['garden'],ventilation:['rose'],emergency:['plaza','lake']},school:{lights:['direction','staff'],doors:['office1','eso-a'],electrical:['office4','second-b'],bell:['red','german'],computers:['office3','optional'],emergency:[['meeting','reception'],['second-a','staff']]},club:{lights:['electrical'],doors:['navigation'],electrical:['security'],bell:['comms'],computers:['oxygen'],audio:['secondary'],overload:['main'],vip:['vip'],emergency:['electrical','oxygen']},gym:{lights:['security'],doors:['reception'],electrical:['maintenance'],bell:['pavilion'],computers:['storage'],audio:['activities'],ventilation:['showers'],emergency:['strength','pool']}};
const T=56;
function free(map,x,y){return terrainFits(map,x*T,y*T,18)&&map.rooms.some(r=>x>r.x+.45&&x<r.x+r.w-.45&&y>r.y+.45&&y<r.y+r.h-.45)&&!map.props.some(p=>x>p.x-.5&&x<p.x+p.w+.5&&y>p.y-.5&&y<p.y+p.h+.5);}
export function layoutRepairs(id,data){const result=[];for(const [kind,targets] of Object.entries(plans[id])){
 const maps=id==='school'?data.FLOORS:data.FLOORS.slice(0,1);
 for(const map of maps){const selected=id==='school'?(Array.isArray(targets[map.floor])?targets[map.floor]:[targets[map.floor]]):targets;for(const [part,roomId] of selected.entries()){
 const r=map.rooms.find(q=>q.id===roomId);if(!r)throw Error(`Sala de reparación inexistente ${id}/${roomId}`);
 // Frente a la pared superior, buscando una huella libre. No se mueve
 // mobiliario ni se reutiliza la coordenada de otro tipo de sabotaje.
 const candidates=[];for(let y=r.y+1;y<r.y+r.h-1;y+=.5)for(let x=r.x+1;x<r.x+r.w-1;x+=.5){if(!free(map,x,y)||result.some(p=>p.floor===map.floor&&Math.hypot(p.x/T-x,p.y/T-y)<1.5)||map.stations.some(p=>Math.hypot(p.x/T-x,p.y/T-y)<1.25)||map.vents.some(p=>Math.hypot(p.x/T-x,p.y/T-y)<.8))continue;candidates.push({x,y,score:Math.min(y-r.y,r.y+r.h-y)+Math.abs(x-(r.x+r.w*.7))*.15});}
 candidates.sort((a,b)=>a.score-b.score);const point=candidates[0];if(!point)throw Error('No hay espacio para '+id+'/'+kind+'/'+roomId);
 result.push({id:`${id}-repair-${kind}-${map.floor}-${part}`,kind,sabotages:[kind],floor:map.floor,room:roomId,x:point.x*T,y:point.y*T,label:`${data.SABOTAGES[kind].label} · ${r.name}`,icon:{lights:'☀',doors:'⇆',electrical:'ϟ',bell:'♫',computers:'▣',audio:'♪',overload:'◉',vip:'◆',ventilation:'✺',emergency:'!'}[kind]});
 }}}
 for(const map of data.FLOORS)map.repair=result.filter(r=>r.floor===map.floor);
 return result;
}
