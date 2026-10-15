// Ocho direcciones, con las mismas órdenes y velocidad que WASD. No se envían
// coordenadas ni velocidades elegidas por el teléfono al servidor.
export function stickVector(dx,dy,radius=44){
 radius=Math.max(1,radius);const length=Math.hypot(dx,dy),amount=Math.min(1,length/radius);
 if(amount<.2)return {x:0,y:0,px:dx,py:dy};
 const angle=Math.atan2(dy,dx),sector=Math.round(angle/(Math.PI/4));
 const x=Math.round(Math.cos(sector*Math.PI/4))||0,y=Math.round(Math.sin(sector*Math.PI/4))||0;
 return {x,y,px:dx/length*radius*amount,py:dy/length*radius*amount};
}

export function createTouchStick(element,knob,onChange=()=>{}){
 let pointer=null,axis={x:0,y:0},enabled=false;
 const surface=element.ownerDocument||element;
 function set(v){const changed=v.x!==axis.x||v.y!==axis.y;axis={x:v.x,y:v.y};knob.style.transform=`translate(${v.px||0}px,${v.py||0}px)`;if(changed)onChange(axis);}
 function reset(){const previous=pointer;pointer=null;set({x:0,y:0});element.classList.remove('active');if(previous!==null&&element.hasPointerCapture?.(previous)){try{element.releasePointerCapture(previous);}catch{}}}
 function capture(){try{element.setPointerCapture?.(pointer);}catch{} /* El seguimiento en document sigue disponible. */}
 function update(e){const rect=element.getBoundingClientRect();set(stickVector(e.clientX-rect.left-rect.width/2,e.clientY-rect.top-rect.height/2,Math.min(rect.width,rect.height)*.32));}
 element.addEventListener('pointerdown',e=>{if(!enabled||pointer!==null||e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();pointer=e.pointerId;capture();element.classList.add('active');update(e);});
 surface.addEventListener('pointermove',e=>{if(!enabled||pointer===null||e.pointerId!==pointer)return;if(e.cancelable!==false)e.preventDefault();update(e);},{passive:false});
 for(const name of ['pointerup','pointercancel'])surface.addEventListener(name,e=>{if(e.pointerId===pointer)reset();});
 // Una pérdida de captura NO significa que se haya levantado el dedo.
 element.addEventListener('lostpointercapture',e=>{if(enabled&&e.pointerId===pointer)capture();});
 return {getAxis:()=>({...axis}),reset,setEnabled(value){const next=!!value;if(enabled===next)return;enabled=next;if(!enabled)reset();element.setAttribute('aria-disabled',String(!enabled));}};
}

export function mergeDirections(keyboard,touch){return {x:Math.sign(keyboard.x+touch.x),y:Math.sign(keyboard.y+touch.y)};}

export async function toggleNativeFullscreen(doc,orientation=null){
 try{
  if(doc.fullscreenElement||doc.webkitFullscreenElement){const exit=doc.exitFullscreen||doc.webkitExitFullscreen;if(!exit)return 'unavailable';await exit.call(doc);return 'exited';}
  const element=doc.documentElement,request=element.requestFullscreen||element.webkitRequestFullscreen;
  if(!request||doc.fullscreenEnabled===false)return 'unavailable';
  if(element.requestFullscreen)await request.call(element,{navigationUI:'hide'});else await request.call(element);
  try{await orientation?.lock?.('landscape');}catch{} // La orientación queda libre si el navegador rechaza el bloqueo.
  return 'entered';
 }catch{return 'denied';}
}

// Evita que una pulsación larga sobre controles se convierta en selección o
// menú nativo. Los editores conservan selección, copiar/pegar y teclado.
export function installTouchSelectionGuard(root,isTouchMode){
 const editable=target=>!!target?.closest?.('input, textarea, select, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]');
 const guard=e=>{if(isTouchMode()&&!editable(e.target)&&e.cancelable!==false)e.preventDefault();};
 const options={capture:true,passive:false};
 for(const event of ['contextmenu','selectstart','dragstart'])root.addEventListener(event,guard,options);
 return ()=>{for(const event of ['contextmenu','selectstart','dragstart'])root.removeEventListener(event,guard,options);};
}

// Un offset de Safari sin teclado no debe desplazar las pantallas del menú.
export function menuViewport(layoutWidth,layoutHeight,visual=null,editing=false){
 const keyboard=!!(editing&&visual&&visual.height<layoutHeight*.8);
 return {width:Math.round(keyboard?visual.width:layoutWidth),height:Math.round(keyboard?visual.height:layoutHeight),top:keyboard?Math.max(0,Math.round(visual.offsetTop||0)):0,keyboard};
}
