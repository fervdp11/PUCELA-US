import {inPolygon} from './visibility.js';
// Cada avería tiene paneles exclusivos. La elección de planta limita qué
// terminales están activos, sin mandar a un jugador a una planta deshabilitada.
const plans={club:{lights:['electrical'],doors:['navigation'],electrical:['security'],bell:['comms'],computers:['oxygen'],audio:['secondary'],overload:['main'],vip:['vip'],emergency:['electrical','oxygen']},gym:{lights:['security'],doors:['reception'],electrical:['maintenance'],bell:['pavilion'],computers:['storage'],audio:['activities'],ventilation:['showers'],emergency:['strength','pool']},house:{lights:['garage'],electrical:['laundry'],audio:['office'],computers:['playroom'],bell:['hall'],ventilation:['bath'],emergency:['kitchen','garage']}};
const T=56;
const terrainFits=()=>true;
function free(map,x,y){return terrainFits(map,x*T,y*T,18)&&map.rooms.some(r=>x>r.x+.45&&x<r.x+r.w-.45&&y>r.y+.45&&y<r.y+r.h-.45&&(!r.outline||[[-.45,-.45],[.45,-.45],[-.45,.45],[.45,.45]].every(([a,b])=>inPolygon(r.outline,Math.floor(x+a)+.5,Math.floor(y+b)+.5))))&&!map.props.some(p=>x>p.x-.5&&x<p.x+p.w+.5&&y>p.y-.5&&y<p.y+p.h+.5);}
export function layoutRepairs(id,data){const result=[];for(const [kind,targets] of Object.entries(plans[id]).filter(([k])=>Object.hasOwn(data.SABOTAGES,k))){
 const maps=id==='school'?data.FLOORS:data.FLOORS.slice(0,1);
 for(const map of maps){const selected=id==='school'?(Array.isArray(targets[map.floor])?targets[map.floor]:[targets[map.floor]]):targets;for(const [part,roomId] of selected.entries()){
 const r=map.rooms.find(q=>q.id===roomId);if(!r)throw Error(`Sala de reparación inexistente ${id}/${roomId}`);
 // Frente a la pared superior, buscando una huella libre. No se mueve
 // mobiliario ni se reutiliza la coordenada de otro tipo de sabotaje.
 const candidates=[];for(let y=r.y+1;y<r.y+r.h-1;y+=.5)for(let x=r.x+1;x<r.x+r.w-1;x+=.5){if(!free(map,x,y)||result.some(p=>p.floor===map.floor&&Math.hypot(p.x/T-x,p.y/T-y)<1.5)||map.stations.some(p=>Math.hypot(p.x/T-x,p.y/T-y)<1.25)||map.vents.some(p=>Math.hypot(p.x/T-x,p.y/T-y)<.8)||[data.CAMERA_CONSOLE,data.LOCATOR_CONSOLE].some(q=>q&&Math.hypot(q.x/T-x,q.y/T-y)<2.8))continue;candidates.push({x,y,score:Math.min(y-r.y,r.y+r.h-y)+Math.abs(x-(r.x+r.w*.7))*.15});}
 candidates.sort((a,b)=>a.score-b.score);const point=candidates[0];if(!point)throw Error('No hay espacio para '+id+'/'+kind+'/'+roomId);
 result.push({id:`${id}-repair-${kind}-${map.floor}-${part}`,kind,sabotages:[kind],floor:map.floor,room:roomId,x:point.x*T,y:point.y*T,label:`${data.SABOTAGES[kind].label} · ${r.name}`,icon:{lights:'☀',doors:'⇆',electrical:'ϟ',bell:'♫',computers:'▣',audio:'♪',overload:'◉',vip:'◆',ventilation:'✺',emergency:'!'}[kind]});
 }}}
 for(const map of data.FLOORS)map.repair=result.filter(r=>r.floor===map.floor);
 return result;
}

// Cofres: aproximadamente uno por sala (dos en las grandes), pegados a una
// esquina libre, lejos de tareas, paneles, conductos y del botón. Posiciones
// deterministas: cliente y servidor calculan exactamente las mismas.
const CHEST_THEMES={club:[['case','Maletín de equipo']],gym:[['sports-bag','Bolsa de deporte']],house:[['backpack','Mochila del cole'],['case','Caja de herramientas']]};
// En el parque los cofres se dejan en el césped, justo al borde del sendero más
// cercano: se ven desde el camino y se abren sin tener que adivinar por dónde.
const clearOfProps=(map,x,y)=>!(map.props||[]).map(r=>r.hit?{...r,...r.hit}:r).some(r=>r.w&&r.h&&!r.soft&&!r.parkGrove&&x>r.x*T-22&&x<(r.x+r.w)*T+22&&y>r.y*T-22&&y<(r.y+r.h)*T+22);
function besidePath(map,x,y){const ok=(a,b)=>terrainFits(map,a,b,18)&&clearOfProps(map,a,b);if(ok(x,y))return {x,y};
 for(let r=4;r<=200;r+=4)for(let a=0;a<36;a++){const qx=x+Math.cos(a/36*Math.PI*2)*r,qy=y+Math.sin(a/36*Math.PI*2)*r;if(ok(qx,qy)){const k=Math.min(1,30/r),fx=Math.round(qx+(x-qx)*k),fy=Math.round(qy+(y-qy)*k);return ok(fx,fy)?{x:fx,y:fy}:{x:Math.round(qx),y:Math.round(qy)};}}
 return {x,y};}
export function layoutChests(id,data){
 const themes=CHEST_THEMES[id]||CHEST_THEMES.club,result=[];
 if(data.FLOORS[0].layout?.chests){const map=data.FLOORS[0];data.FLOORS[0].layout.chests.forEach((c,i)=>{const theme=themes.find(t=>t[0]===c.theme)||themes[0];const at=besidePath(map,c.x*T,c.y*T);result.push({id:`${id}-chest-${i}`,floor:0,room:c.zone,theme:theme[0],label:theme[1],x:at.x,y:at.y});});return result;}
 for(const map of data.FLOORS){const avoid=[...map.stations,...map.vents,...(map.repair||[]),map.emergency,...(map.stairs||[])].filter(p=>p&&(p.floor??map.floor)===map.floor);
  for(const r of map.rooms){if(r.hideLabel||['expelled','extra'].includes(r.id)||r.w<3||r.h<3)continue;const count=r.w*r.h>70?2:1;const picked=[];
   const candidates=[];for(let y=r.y+.9;y<=r.y+r.h-.9;y+=.25)for(let x=r.x+.9;x<=r.x+r.w-.9;x+=.25){if(!free(map,x,y)||r.outline&&!inPolygon(r.outline,x,y))continue;if(avoid.some(p=>Math.hypot(p.x/T-x,p.y/T-y)<1.7)||[data.CAMERA_CONSOLE,data.LOCATOR_CONSOLE].some(q=>q&&Math.hypot(q.x/T-x,q.y/T-y)<2.8))continue;const edge=Math.min(x-r.x,r.x+r.w-x)+Math.min(y-r.y,r.y+r.h-y);candidates.push({x,y,score:edge});}
   candidates.sort((a,b)=>a.score-b.score||a.y-b.y||a.x-b.x);
   for(const c of candidates){if(picked.length>=count)break;if(picked.some(p=>Math.hypot(p.x-c.x,p.y-c.y)<Math.max(3,Math.min(r.w,r.h)*.6)))continue;picked.push(c);}
   for(const c of picked){const theme=themes[(result.length)%themes.length];result.push({id:`${id}-chest-${result.length}`,floor:map.floor,room:r.id,theme:theme[0],label:theme[1],x:c.x*T,y:c.y*T});}
  }}
 return result;
}
