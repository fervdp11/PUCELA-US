// Distribución editorial: grupos de muebles, nunca posiciones aleatorias.
// Las piezas pequeñas se dibujan sobre sus muebles en scenery.js. Solo las
// huellas grandes entran en las colisiones compartidas por cliente y servidor.
const T=56;
const furniture=[
 // Escenario principal: cabina al norte, barra oeste y salones en los extremos.
 ['dj-booth',29.2,3.15,7.7,1.1],['speaker',27.1,5.4,1.05,1.6],['speaker',38.5,5.4,1.05,1.6],
 ['club-subwoofer',28.25,3.3,.6,1],['club-subwoofer',37.6,3.3,.65,1],
 ['club-bar',26.65,12.35,.75,1.8,'vertical'],['club-bottles',26.7,7,.6,.8],
 ['club-sofa',28,15.6,2.6,.65],['club-sofa',38.9,11.3,.65,1.7,'vertical'],
 ['club-roundtable',30.3,14.8,1,.75],['club-roundtable',37.7,15.15,.9,.7],
 ['club-stool',28.1,11.5,.4,.42],['club-stool',28.1,12.8,.4,.42],
 ['club-arcade',27.25,4.1,.7,.7],['club-smoke',37.6,4.7,.8,.7],
 ['club-plant',30.9,15.9,.6,.6],['club-bin',39.6,12.6,.45,.6],
 // Escenario secundario: equipo escénico y zonas de descanso periféricas.
 ['dj-booth',30.5,34.3,5.5,.95],['speaker',29.6,27.4,.9,1.5],['speaker',36.4,26.1,.9,1.3],
 ['club-smoke',29.5,33.6,.6,.6],['club-sofa',29.6,29.1,.6,1.3,'vertical'],
 ['club-roundtable',34.9,32,1,.8],['club-subwoofer',29.7,29.7,.7,.8],
 ['club-instruments',36.5,33.1,.7,1.1],['club-plant',32.1,35,.6,.5],
 // Seguridad: pared de monitores, rack lateral y archivo al sur.
 ['security-console',15.6,14.5,3.8,.8],['club-rack',18.9,16.8,.6,1.8],
 ['club-navdesk',15.6,20.85,2.1,.65],['club-locker',18.8,21,.55,.6],
 ['club-chair',16,19.5,.55,.55],['club-bin',15.5,19.7,.4,.5],
 // Reservado: sofá sur y mesa de servicio al norte; entrada oeste libre.
 ['club-bar',40.4,20.55,4.1,.7],['club-sofa',40,25.5,4.7,.65],
 ['club-roundtable',42,22.25,1.15,.8],['club-armchair',44.8,24.4,.65,.65],
 ['club-plant',45,20.6,.55,.6],['club-divider',45.35,25,.25,1.1],
 // Electricidad: instalaciones agrupadas por paredes; paneles despejados.
 ['club-generator',21.6,22.6,5.7,.7],['club-transformer',21.5,25.5,1.1,2],
 ['club-workbench',21.6,28.6,.7,1.2],['club-rack',26.8,26,.6,1.5],
 ['club-toolcart',21.6,30,.7,.65],['club-cable',23.3,26.5,.65,.6],
 // Comunicación: rack de radio, mesa de edición y cajas de repuestos.
 ['club-rack',39.5,35.9,5.7,.65],['club-radio',39.45,33.6,.6,1.6],
 ['club-navdesk',43.1,32.5,2.1,.6],['club-crate',40.5,35,.7,.55],
 // Navegación: control de accesos, documentos y señales luminosas.
 ['club-navdesk',54.6,15.6,5.6,.85],['club-navdesk',54.6,20.9,2,.6],
 ['club-locker',60,18.2,.6,2.7],['club-chair',57.7,19.5,.55,.55],
 ['club-printer',58,20.8,.7,.6],['club-plant',59.8,16.8,.55,.55],
 // O2: ventiladores, tanques y tuberías en lugar de mobiliario de salón.
 ['club-fan',47.8,15.6,.6,3],['club-tank',46.5,19.15,.65,.6],
 ['club-fan',44.5,19.4,.8,.35],['club-fan',47.6,15.3,.7,.35],['club-pipes',46.4,15.5,.7,.6],
 // Pasillos anchos: vestuario, almacenes, recreativos y pequeñas áreas sociales.
 ['club-generator',2.55,14.1,1.1,3.3],['club-crate',2.6,21.3,1.2,1.2],
 ['club-crate',5.6,21.2,1.2,1.1],['club-crate',5.9,14.1,.8,.8],
 ['club-workbench',3.1,23.1,3.4,.55],['club-toolcart',6.8,19.8,.55,.7],
 ['club-locker',8.6,6.8,.7,3.5],['club-sofa',12.1,11.5,2.1,.65],
 ['club-arcade',13.6,6.7,.7,.85],['club-arcade',12.5,6.7,.7,.85],
 ['club-roundtable',10.3,11.7,.8,.65],['club-plant',14.1,11.5,.55,.55],
 ['club-locker',20.6,12.2,.65,3],['club-sofa',24.8,14,.6,2.7,'vertical'],
 ['club-arcade',21,17.8,.7,.85],['club-plant',24.8,18.8,.5,.5],
 ['club-sofa',44.6,4.8,.65,2,'vertical'],['club-bar',47,4.6,2.7,.65],
 ['club-stool',47.2,5.9,.4,.4],['club-stool',48.5,5.9,.4,.4],
 ['club-roundtable',48.6,9.7,.85,.7],['club-plant',49.6,10.8,.55,.55],
 ['club-locker',8.6,24.7,.7,2.7],['club-bar',10.7,30,3.3,.55],
 ['club-crate',13.4,24.6,.8,.8],['club-arcade',9,28.7,.7,.8],
 ['club-roundtable',12.4,28,.8,.7],['club-bin',14,29.3,.4,.5],
 ['speaker',47.5,31.5,.9,1],['club-crate',48.4,27.5,1,.8],
 ['club-sofa',49.2,32,2.4,.55],['club-roundtable',49.7,28.1,.8,.65],
 ['club-plant',51.7,31.9,.5,.5]
];
function inside(r,x,y){if(!r.outline)return x>r.x&&x<r.x+r.w&&y>r.y&&y<r.y+r.h;let yes=false;for(let i=0,j=r.outline.length-1;i<r.outline.length;j=i++){const [ax,ay]=r.outline[i],[bx,by]=r.outline[j];if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)yes=!yes;}return yes;}
const overlaps=(a,b,gap=0)=>a.x<b.x+b.w+gap&&a.x+a.w+gap>b.x&&a.y<b.y+b.h+gap&&a.y+a.h+gap>b.y;
export function dressClub(map,{stations=[],repair=[],vents=[]}={}){
 const original=map.props.filter(p=>p.kind==='wall'||p.kind==='club-emergency-table'||p.kind==='locator-terminal');
 const protectedPoints=[...stations,...repair,...vents,map.spawn].filter(Boolean);
 const candidates=map.id==='club-lobby'?[
  ['dj-booth',3,2.2,12,.7],['speaker',17.5,2.3,.8,1.4],
  ['club-sofa',2,12.7,3,.7],['club-sofa',15.3,12.7,3,.7],
  ['club-bar',2,5.4,.7,3],['club-arcade',17.4,5,.8,.85],
  ['club-arcade',17.4,6.3,.8,.85],['club-plant',1.7,2.1,.6,.6],
  ['club-plant',17.5,11,.6,.6],['club-roundtable',6.5,12.8,.85,.7],
  ['club-roundtable',13,12.8,.85,.7],['club-locker',1.7,10.5,.7,1.2]
 ]:furniture;
 map.props.splice(0,map.props.length,...original);
 const floors=[...map.rooms,...map.corridors],access=(map.doors||[]).map(d=>d.h>d.w?{x:d.x-1.15,y:d.y-.25,w:2.3,h:d.h+.5}:{x:d.x-.25,y:d.y-1.15,w:d.w+.5,h:2.3});
 for(const [kind,x,y,w,h,orientation] of candidates){const p={kind,x,y,w,h,orientation};
  if(![[x+.03,y+.03],[x+w-.03,y+.03],[x+.03,y+h-.03],[x+w-.03,y+h-.03]].every(([xx,yy])=>floors.some(r=>inside(r,xx,yy))))continue;
  if(map.props.some(q=>overlaps(p,q,.1))||access.some(q=>overlaps(p,q)))continue;
  if(protectedPoints.some(q=>Math.hypot(q.x/T-Math.max(x,Math.min(q.x/T,x+w)),q.y/T-Math.max(y,Math.min(q.y/T,y+h)))<(q===map.spawn?1.7:.62)))continue;
  map.props.push(p);
 }
 // Piezas montadas en paredes y detalles escénicos sin huella física.
 map.art=map.rooms.flatMap(r=>{
  const party=['main','secondary','lobby'].includes(r.id),items=[];
  const add=(kind,x,y,w,h)=>items.push({kind,x,y,w,h,room:r.id});
  if(party){add('led-screen',r.x+r.w*.32,r.stageEdge==='south'?r.y+r.h-.6:r.y+.55,r.w*.36,.6);add('mirrorball',r.x+r.w*.5,r.stageEdge==='south'?r.y+r.h-2.1:r.y+2.1,.65,.65);}
  else{add(r.id==='vip'?'gold-panels':r.id==='oxygen'?'pipes':r.id==='electrical'?'power-rails':'wall-screen',r.id==='comms'?r.x+4.4:r.x+.5,r.y+.22,r.id==='comms'?2.1:r.w-1,.4);}
  if(r.id==='vip')add('bottles',r.x+1.2,r.y+.9,r.w-2.4,.45);
  return items;
 });
 // Luminarias de pared en los pasillos; nunca cerramos el recorrido central.
 for(const [i,r] of map.corridors.entries())if(Math.max(r.w,r.h)>=4){const vertical=r.h>r.w;for(let k=1;k<(vertical?r.h:r.w)-.5;k+=2.6)map.art.push({kind:'wall-led',x:r.x+(vertical?.15:k),y:r.y+(vertical?k:.15),w:vertical?.14:.7,h:vertical?.7:.14,room:'corridor',hue:i*41%360});}
 return map;
}
