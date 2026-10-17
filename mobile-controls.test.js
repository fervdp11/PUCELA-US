import test from 'node:test';
import assert from 'node:assert/strict';
import {stickVector,createTouchStick,mergeDirections,toggleNativeFullscreen,installTouchSelectionGuard,menuViewport} from '../public/touch-controls.js';
import {makeServer} from '../server/node.js';

function fakeStick(){
 const events=new Map(),captured=new Set(),classes=new Set(),attributes=new Map();
 const element={addEventListener:(name,fn)=>events.set(name,fn),getBoundingClientRect:()=>({left:10,top:20,width:128,height:128}),setPointerCapture:id=>captured.add(id),hasPointerCapture:id=>captured.has(id),releasePointerCapture:id=>captured.delete(id),classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)},setAttribute:(k,v)=>attributes.set(k,v)};
 const knob={style:{}},changes=[],stick=createTouchStick(element,knob,v=>changes.push(v));
 const send=(name,args={})=>events.get(name)?.({pointerId:1,pointerType:'touch',clientX:74,clientY:84,preventDefault(){},...args});
 return {stick,send,changes,knob,captured,attributes};
}

test('joystick: zona muerta, ocho direcciones y órdenes enteras sin velocidad extra',()=>{
 for(const [dx,dy,x,y] of [[1,2,0,0],[100,0,1,0],[-100,0,-1,0],[0,-100,0,-1],[0,100,0,1],[100,100,1,1],[-100,-100,-1,-1]]){const v=stickVector(dx,dy);assert.deepEqual({x:v.x,y:v.y},{x,y});assert.ok(Math.hypot(v.px,v.py)<=44+.001);assert.ok(Number.isInteger(v.x)&&Number.isInteger(v.y));}
 assert.deepEqual(mergeDirections({x:1,y:0},{x:1,y:1}),{x:1,y:1});assert.deepEqual(mergeDirections({x:1,y:0},{x:-1,y:0}),{x:0,y:0});
});

test('joystick: captura táctil, soltar y cancelar dejan movimiento exactamente cero',()=>{
 for(const event of ['pointerup','pointercancel']){const f=fakeStick();f.stick.setEnabled(true);f.send('pointerdown',{clientX:120});assert.deepEqual(f.stick.getAxis(),{x:1,y:0});assert.ok(f.captured.has(1));f.send(event);assert.deepEqual(f.stick.getAxis(),{x:0,y:0});assert.equal(f.knob.style.transform,'translate(0px,0px)');assert.deepEqual(f.changes.at(-1),{x:0,y:0});}
});

test('joystick: segundo dedo independiente y bloqueo al abrir tareas, votar muerto o perder el foco',()=>{
 const f=fakeStick();f.stick.setEnabled(true);f.send('pointerdown',{clientX:125});f.send('pointerdown',{pointerId:2,clientX:20});f.send('pointerup',{pointerId:2});assert.deepEqual(f.stick.getAxis(),{x:1,y:0});
 f.stick.setEnabled(false);assert.deepEqual(f.stick.getAxis(),{x:0,y:0});assert.equal(f.attributes.get('aria-disabled'),'true');f.send('pointermove',{clientX:120});f.send('pointerdown',{clientX:120});assert.deepEqual(f.stick.getAxis(),{x:0,y:0});
 f.stick.setEnabled(true);f.send('pointerdown',{clientY:125});assert.deepEqual(f.stick.getAxis(),{x:0,y:1});f.stick.reset();assert.deepEqual(f.stick.getAxis(),{x:0,y:0});
});

test('pantalla completa: soporte nativo, orientación opcional, salida y alternativa sin API',async()=>{
 assert.equal(await toggleNativeFullscreen({documentElement:{}}),'unavailable');assert.equal(await toggleNativeFullscreen({documentElement:{requestFullscreen(){throw Error('No permitido');}}}),'denied');
 let options,locked=false;const doc={documentElement:{async requestFullscreen(arg){options=arg;}}};assert.equal(await toggleNativeFullscreen(doc,{async lock(){locked=true;throw Error('Orientación libre');}}),'entered');assert.deepEqual(options,{navigationUI:'hide'});assert.equal(locked,true);
 let exited=false;assert.equal(await toggleNativeFullscreen({fullscreenElement:{},async exitFullscreen(){exited=true;}}),'exited');assert.equal(exited,true);
 let legacy=false;assert.equal(await toggleNativeFullscreen({documentElement:{webkitRequestFullscreen(){legacy=true;}}}),'entered');assert.equal(legacy,true);
});

test('servidor web: controles, manifiesto e iconos móviles se entregan con tipos adecuados',async()=>{
 const server=makeServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
 try{const page=await (await fetch(origin)).text();assert.ok(page.includes('viewport-fit=cover'));assert.ok(page.includes('id="touchStick"'));assert.ok(page.includes('id="exitImmersive"'));
 const res=await fetch(origin+'/manifest.webmanifest');assert.ok(res.headers.get('content-type').includes('manifest+json'));const manifest=await res.json();assert.equal(manifest.display,'fullscreen');assert.equal(manifest.icons.length,2);
 for(const path of ['/touch-controls.js','/sw.js','/app-icon-192.png','/app-icon-512.png']){const r=await fetch(origin+path);assert.equal(r.status,200,path);assert.ok((await r.arrayBuffer()).byteLength>100);}
 }finally{await new Promise(r=>server.close(r));}
});


test('móvil: pulsación larga no selecciona controles; chat, notas y ajustes siguen editables',()=>{
 const events=new Map();let mobile=true;
 const root={addEventListener:(name,fn,options)=>{assert.equal(options.capture,true);assert.equal(options.passive,false);events.set(name,fn);},removeEventListener:(name,fn)=>{assert.equal(events.get(name),fn);events.delete(name);}};
 const remove=installTouchSelectionGuard(root,()=>mobile);
 const emit=(name,editor,cancelable=true)=>{let prevented=false;events.get(name)({target:{closest:()=>editor},cancelable,preventDefault(){prevented=true;}});return prevented;};
 for(const event of ['contextmenu','selectstart','dragstart']){assert.equal(emit(event,null),true);for(const editor of ['input','textarea','select','contenteditable'])assert.equal(emit(event,editor),false);assert.equal(emit(event,null,false),false);}
 mobile=false;for(const event of events.keys())assert.equal(emit(event,null),false);
 remove();assert.equal(events.size,0);
});


test('joystick: cambiar de dirección, salir del área y perder captura conserva el mismo dedo hasta soltarlo',()=>{
 const local=new Map(),global=new Map(),knob={style:{}};let captured=false;
 const element={ownerDocument:{addEventListener:(n,f)=>global.set(n,f)},addEventListener:(n,f)=>local.set(n,f),getBoundingClientRect:()=>({left:0,top:0,width:128,height:128}),setPointerCapture(){if(!captured)throw Error('Captura no disponible');},hasPointerCapture:()=>false,classList:{add(){},remove(){}},setAttribute(){}};
 const stick=createTouchStick(element,knob);stick.setEnabled(true);
 const e=(x,y,id=1)=>({pointerId:id,pointerType:'touch',clientX:x,clientY:y,preventDefault(){}});
 local.get('pointerdown')(e(120,64));assert.deepEqual(stick.getAxis(),{x:1,y:0});
 local.get('lostpointercapture')(e(120,64));assert.deepEqual(stick.getAxis(),{x:1,y:0});
 for(const [x,y,axis] of [[64,-80,{x:0,y:-1}],[-80,64,{x:-1,y:0}],[64,240,{x:0,y:1}]]){stick.setEnabled(true);global.get('pointermove')(e(x,y));assert.deepEqual(stick.getAxis(),axis);}
 global.get('pointerup')(e(64,240,2));assert.deepEqual(stick.getAxis(),{x:0,y:1});
 global.get('pointerup')(e(64,240));assert.deepEqual(stick.getAxis(),{x:0,y:0});
});


test('menú iOS: sin teclado no repite el offset superior; con teclado mantiene el editor a la vista',()=>{
 assert.deepEqual(menuViewport(844,390,{width:844,height:328,offsetTop:62},false),{width:844,height:390,top:0,keyboard:false});
 assert.deepEqual(menuViewport(390,844,{width:390,height:480,offsetTop:120},true),{width:390,height:480,top:120,keyboard:true});
 assert.deepEqual(menuViewport(390,844,{width:390,height:844,offsetTop:0},true),{width:390,height:844,top:0,keyboard:false});
 assert.deepEqual(menuViewport(1920,1080),{width:1920,height:1080,top:0,keyboard:false});
});
