// Banco de FPS en navegador real: partida de 10 jugadores (1 humano + 9 bots) en cada mapa.
// npm run test:fps  ·  Variables: PUCELA_BROWSER_BIN (Chromium), PUCELA_FPS_MAPS=club,gym,house,
// PUCELA_FPS_PROFILES=desktop,mobile, PUCELA_FPS_MS (ms por fase), PUCELA_FPS_PROFILE=1 (perfil de CPU),
// PUCELA_FPS_SCALE=1 fija la densidad de píxeles (sin escala dinámica) para comparar versiones a igual resolución,
// PUCELA_FPS_TRACE=1 (traza del hilo principal: estilos, diseño, pintado y rasterizado fuera del JS),
// PUCELA_FPS_OUT=fichero.json,
// PUCELA_FPS_RASTER=cpu|gpu (cpu, por defecto: lienzo por software; gpu: SwiftShader, muy lento sin GPU real;
// sirve solo si la máquina tiene GPU). Separa el coste gráfico (tiempo de CPU dentro de requestAnimationFrame e
// intervalo entre fotogramas sin vsync) de la red (intervalo y antigüedad de las instantáneas).
// Los FPS se miden con --disable-frame-rate-limit: el navegador dibuja tan rápido como puede, sin
// el tope de 60 Hz del modo sin pantalla. En móvil se emula la CPU 4× más lenta.
import {writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {makeServer} from '../server/node.js';
import {MemoryStore} from '../server/memory-store.js';
const env=process.env,MAPS=(env.PUCELA_FPS_MAPS||'club,gym,house').split(','),PROFILES=(env.PUCELA_FPS_PROFILES||'desktop,mobile').split(','),MS=Number(env.PUCELA_FPS_MS||6000),PROFILE=env.PUCELA_FPS_PROFILE==='1',RASTER=env.PUCELA_FPS_RASTER||'cpu',TRACE=env.PUCELA_FPS_TRACE==='1',SCALE=Number(env.PUCELA_FPS_SCALE||0);
const GPU=['--enable-unsafe-swiftshader','--use-angle=swiftshader','--enable-gpu-rasterization','--ignore-gpu-blocklist','--enable-accelerated-2d-canvas'];
const DEVICES={desktop:{viewport:{width:1920,height:1080},deviceScaleFactor:1,cpu:1},mobile:{viewport:{width:844,height:390},deviceScaleFactor:3,isMobile:true,hasTouch:true,cpu:4}};
const store=new MemoryStore({secret:'fps-bench'}),server=makeServer(store);await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,...(env.PUCELA_BROWSER_BIN?{executablePath:env.PUCELA_BROWSER_BIN}:{}),args:[...(process.getuid?.()===0?['--no-sandbox']:[]),'--disable-frame-rate-limit','--disable-gpu-vsync',...(RASTER==='gpu'?GPU:['--disable-gpu'])]});
const post=async(route,body)=>{const r=await fetch(origin+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const s=await r.json();if(r.status!==200)throw new Error(s.error);return s;};
const pct=(a,q)=>{if(!a.length)return 0;const s=[...a].sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.floor(s.length*q))];},mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0,r2=v=>Math.round(v*100)/100;
// Cada callback de requestAnimationFrame se cronometra; los del mismo fotograma se suman.
function probe(){const raf=window.requestAnimationFrame.bind(window),P=window.__perf={on:false,cb:new Map(),snaps:[],lastAt:0};
 window.requestAnimationFrame=fn=>raf(t=>{const s=performance.now();try{fn(t);}finally{if(P.on)P.cb.set(t,(P.cb.get(t)||0)+performance.now()-s);}});
 setInterval(()=>{const st=window.__qa?.state;if(P.on&&window.__qa){const l=window.__qa.local;if(P.prev)P.path+=Math.hypot(l.x-P.prev.x,l.y-P.prev.y);P.prev=l;}if(P.on&&st&&st.receivedAt!==P.lastAt){if(P.lastAt)P.snaps.push(st.receivedAt-P.lastAt);P.lastAt=st.receivedAt;}},2);}
async function measure(page,ms){await page.evaluate(()=>{const P=window.__perf;P.path=0;P.prev=null;P.start={me:window.__qa.local,bots:Object.fromEntries(window.__qa.state.players.map(p=>[p.id,{x:p.x,y:p.y}]))};P.cb.clear();P.snaps.length=0;P.lastAt=0;P.on=true;if(window.__sect)for(const k in window.__sect)delete window.__sect[k];P.phase=new Set();});
 // Recorrido fijo: cuatro tramos de movimiento y uno parado.
 const keys=['d','s','a','w'],leg=ms/5;for(const k of keys){await page.keyboard.down(k);await page.waitForTimeout(leg);await page.keyboard.up(k);}await page.waitForTimeout(leg);
 return page.evaluate(async()=>{const P=window.__perf;P.on=false;const ts=[...P.cb.keys()].sort((a,b)=>a-b),work=ts.map(t=>P.cb.get(t)),ivl=ts.slice(1).map((t,i)=>t-ts[i]),span=ts.at(-1)-ts[0];const {renderQuality}=await import('/render.js');
  const sections=window.__sect?Object.fromEntries(Object.entries(window.__sect).map(([k,v])=>[k,Math.round(v/ivl.length*100)/100])):undefined;
  const st=window.__qa.state,me=window.__qa.local,moved=P.path,botsMoved=st.players.filter(p=>p.id!==st.me.id&&P.start.bots[p.id]&&Math.hypot(p.x-P.start.bots[p.id].x,p.y-P.start.bots[p.id].y)>20).length;
  return {moved,botsMoved,sections,ivl,work,span,frames:ivl.length,snaps:P.snaps,phase:window.__qa.state.phase,quality:renderQuality(),alive:window.__qa.state.me.alive,sabotage:!!window.__qa.state.sabotage};});}
function summary(m){return {fps:r2(m.frames*1000/m.span),frameMsMean:r2(mean(m.ivl)),frameMsP95:r2(pct(m.ivl,.95)),frameMsP99:r2(pct(m.ivl,.99)),jsMsMean:r2(mean(m.work)),jsMsP95:r2(pct(m.work,.95)),jsMsMax:r2(Math.max(...m.work)),frames:m.frames,renderScale:m.quality,net:{snapshots:m.snaps.length,snapshotMsMean:r2(mean(m.snaps)),snapshotMsP95:r2(pct(m.snaps,.95))},phase:m.phase,sabotage:m.sabotage,localMovedPx:Math.round(m.moved),botsMoved:m.botsMoved,...(m.sections?{sectionsMs:m.sections}:{})};}
// Perfil de CPU: tiempo propio de cada función JS (el dibujo nativo del lienzo que llama se suma a
// ella) y tiempo inclusivo de las funciones clave del fotograma.
const KEY=['frame','drawWorld','buildLightMask','safeVisibility','visibilityPolygon','rayDistance','characterVisible','visionLineOfSight','sweptVisibleClip','frontOccluders','coverBehindFurniture','drawExterior','drawClubAmbient','drawGymAmbient','drawRobot','drawNameTag','drawMapNow','updateClocks','syncMatchHud','updateTouchControls','syncLobbyStart','updateAlarm','remoteAt','move','onmessage','applySnapshot'];
function hotspots(profile,total){const byId=new Map(profile.nodes.map(n=>[n.id,n])),parent=new Map();for(const n of profile.nodes)for(const c of n.children||[])parent.set(c,n.id);
 const label=n=>{const f=n.callFrame;return `${f.functionName||'(anónima)'} ${f.url.split('/').pop()}:${f.lineNumber+1}`;},us=new Map();profile.samples.forEach((id,i)=>us.set(id,(us.get(id)||0)+(profile.timeDeltas[i]||0)));
 const self=new Map(),incl=new Map();
 for(const [id,t] of us){let n=byId.get(id);const own=n;while(n&&!n.callFrame.url&&parent.has(n.id))n=byId.get(parent.get(n.id));const k=n&&n.callFrame.url?label(n):label(own);self.set(k,(self.get(k)||0)+t);
  const seen=new Set();for(let m=byId.get(id);m;m=byId.get(parent.get(m.id))){const fn=m.callFrame.functionName;if(KEY.includes(fn)&&!seen.has(fn)){seen.add(fn);incl.set(fn,(incl.get(fn)||0)+t);}if(!parent.has(m.id))break;}}
 return {self:[...self].sort((a,b)=>b[1]-a[1]).slice(0,25).map(([k,t])=>({fn:k,ms:r2(t/1000),pct:r2(t/total*100)})),inclusive:Object.fromEntries([...incl].sort((a,b)=>b[1]-a[1]).map(([k,t])=>[k,r2(t/total*100)]))};}
// Tiempo por fotograma de cada tipo de evento en el hilo principal del renderizador (solo eventos de primer nivel).
function traceSummary(events,frames){const main=events.find(e=>e.name==='thread_name'&&e.args?.name==='CrRendererMain'&&events.some(q=>q.pid===e.pid&&q.name==='FireAnimationFrame'));if(!main)return null;const by=new Map();
 const list=events.filter(e=>e.pid===main.pid&&e.tid===main.tid&&e.ph==='X'&&e.dur).sort((a,b)=>a.ts-b.ts);let end=0;for(const e of list){if(e.ts<end){continue;}end=e.ts+e.dur;by.set(e.name,(by.get(e.name)||0)+e.dur);}
 const nested=new Map();for(const e of list)if(['UpdateLayoutTree','Layout','Paint','PrePaint','Commit','RasterTask','FunctionCall','FireAnimationFrame','HitTest','ParseHTML','EventDispatch','TimerFire','v8.callFunction','RunTask','Canvas2DLayerBridge::FlushRecording','CanvasResourceProvider::FlushCanvas'].includes(e.name))nested.set(e.name,(nested.get(e.name)||0)+e.dur);
 const top=[...by].sort((a,b)=>b[1]-a[1]).slice(0,12).map(([k,v])=>[k,r2(v/1000/frames)]);return {topLevelMsPerFrame:Object.fromEntries(top),eventMsPerFrame:Object.fromEntries([...nested].map(([k,v])=>[k,r2(v/1000/frames)]))};}
// Salta viaje y revelación del rol (el servidor los fija al empezar; la sala se sustituye en cada transacción) hasta que el cliente confirma
// que ya se juega; sin muertes, sabotajes ni reuniones para que todas las versiones midan lo mismo.
async function skipIntro(page,code){for(let i=0;i<60;i++){const t=Date.now(),room=store.rooms.get(code);Object.assign(room,{intro:null,revealUntil:0,roleRevealAt:0,travelUntil:0,playStartAt:Math.min(room.playStartAt||t,t),sabotageReady:t+1e9,emergencyReady:t+1e9});for(const p of room.players){p.killReady=t+1e9;p.emergencies=0;}
 await page.waitForTimeout(150);if(await page.evaluate(()=>{const s=window.__qa.state;return s.phase==='game'&&!s.intro&&(s.revealUntil||0)<=s.serverTime&&(s.travelUntil||0)<=s.serverTime;}))return;}throw new Error('La partida no llegó a empezar');}
const results=[];
try{
 for(const profileName of PROFILES){const dev=DEVICES[profileName];
  const a=await post('/api/create',{profile:{name:'Bench',color:0}}),code=a.session.code;
  const {cpu,...ctxOpts}=dev,context=await browser.newContext(ctxOpts);await context.addInitScript(s=>{if(location.origin==='null')return;sessionStorage.setItem('sanagus.session',JSON.stringify(s));sessionStorage.setItem('sanagus.arrival','seen');localStorage.setItem('sanagus.sound','false');},a.session);await context.addInitScript(probe);if(SCALE)await context.addInitScript(k=>{globalThis.__qaRenderScale=k;},SCALE);
  const page=await context.newPage();page.on('pageerror',e=>console.log('PAGE_ERROR',e.message));await page.goto(origin+'/?qa');await page.waitForFunction(()=>window.__qa?.state,{timeout:15000});
  const cdp=await context.newCDPSession(page);await page.evaluate(()=>window.__qa.act('fillBots'));
  for(const map of MAPS){
   const room=store.rooms.get(code);if(room.phase!=='lobby'){room.phase='ended';room.result={winner:'crew',reason:'bench',time:Date.now()};await page.waitForTimeout(150);await page.evaluate(()=>window.__qa.act('return'));await page.waitForFunction(()=>window.__qa.state.phase==='lobby');}
   await page.evaluate(map=>window.__qa.act('configure',{map}),map);await page.evaluate(()=>window.__qa.act('start'));
   await page.waitForFunction(map=>window.__qa.state.config.map===map&&window.__qa.state.phase==='game',map,{timeout:15000});await skipIntro(page,code);
   await page.bringToFront();if(dev.isMobile)await page.evaluate(()=>document.getElementById('game').classList.add('panel-collapsed'));await page.locator('#world').focus();await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpu});
   await page.waitForTimeout(2500);// calentamiento: cachés de mapa y escala dinámica estabilizada
   const m=await measure(page,MS),row={profile:profileName,raster:RASTER,map,viewport:`${dev.viewport.width}x${dev.viewport.height}@${dev.deviceScaleFactor}`,cpuSlowdown:cpu,players:store.rooms.get(code).players.length,...summary(m)};
   if(PROFILE){await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:250});await cdp.send('Profiler.start');const p2=measure(page,MS);const m2=await p2;const {profile}=await cdp.send('Profiler.stop');row.hotspots=hotspots(profile,m2.span*1000);}
   if(TRACE){const events=[];cdp.on('Tracing.dataCollected',e=>events.push(...e.value));const done=new Promise(r=>cdp.once('Tracing.tracingComplete',r));await cdp.send('Tracing.start',{categories:'devtools.timeline,disabled-by-default-devtools.timeline,blink,cc,gpu,skia',transferMode:'ReportEvents'});const m3=await measure(page,MS);await cdp.send('Tracing.end');await done;row.trace=traceSummary(events,m3.frames);}
   await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});results.push(row);
   console.log(JSON.stringify(row));
  }
  await context.close();
 }
 if(env.PUCELA_FPS_OUT)await writeFile(env.PUCELA_FPS_OUT,JSON.stringify({at:new Date().toISOString(),ms:MS,results},null,1));
}catch(e){console.error(e);process.exitCode=1;}finally{await browser.close();server.close();for(const room of store.rooms.values())room.players.length=0;process.exit(process.exitCode||0);}
