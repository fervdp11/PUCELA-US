// Optional browser integration and FPS probe. npm run test:browser
// PUCELA_BROWSER_BIN selects an installed Chromium; PUCELA_QA_CPU=1 measures software rendering.
// Intro deadlines are shortened only in this in-memory test server. No live server is modified.
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {makeServer} from '../server/node.js';
import {MemoryStore} from '../server/memory-store.js';
const store=new MemoryStore({secret:'browser-qa'}),server=makeServer(store);await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,...(process.env.PUCELA_BROWSER_BIN?{executablePath:process.env.PUCELA_BROWSER_BIN}:{}),args:[...(process.getuid?.()===0?['--no-sandbox']:[]),...(process.env.PUCELA_QA_CPU==='1'?['--disable-gpu']:[])]});const errors=[],results=[],contexts=[],blackouts=new WeakMap();
const post=async(route,body)=>{const r=await fetch(origin+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const s=await r.json();assert.equal(r.status,200,s.error);return s;};
async function pageFor(session,{mobile=false,transport='ws',rtt=0}={}){
 const context=await browser.newContext(mobile?{viewport:{width:844,height:390},deviceScaleFactor:2,isMobile:true,hasTouch:true}:{viewport:{width:1280,height:720},deviceScaleFactor:1});contexts.push(context);
 await context.addInitScript(s=>{if(location.origin==='null')return;sessionStorage.setItem('sanagus.session',JSON.stringify(s));sessionStorage.setItem('sanagus.arrival','seen');localStorage.setItem('sanagus.sound','false');},session);
 const page=await context.newPage();page.on('pageerror',e=>{errors.push(e.stack);console.log('PAGE_ERROR',e.message);});
 await page.routeWebSocket('**/api/game-ws?**',ws=>{const peer=ws.connectToServer();ws.onMessage(msg=>setTimeout(()=>peer.send(msg),rtt/2));peer.onMessage(msg=>{if(Date.now()<(blackouts.get(page)||0))return;setTimeout(()=>ws.send(msg),rtt/2);});});
 await page.goto(origin+'/?qa'+(transport==='http'?'&transport=http':''));
 await page.waitForFunction(()=>window.__qa?.state,{timeout:12000});if(transport!=='http')await page.waitForFunction(()=>window.__qa.gameSocket?.readyState===1,{timeout:8000});return page;
}
async function frames(page,ms=1700){
 await page.bringToFront();
 return page.evaluate(ms=>new Promise((resolve,reject)=>{
  const intervals=[];let start=null,last=null;
  const timeout=setTimeout(()=>reject(new Error('Browser RAF stalled')),10000);
  function frame(t){
   if(start===null){start=t;last=t;requestAnimationFrame(frame);return;}
   intervals.push(t-last);last=t;
   if(t-start>=ms){clearTimeout(timeout);resolve({fps:intervals.length*1000/(t-start),p95Ms:intervals.sort((a,b)=>a-b)[Math.floor(intervals.length*.95)],frames:intervals.length});}
   else requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
 }),ms);
}
try{
 const a=await post('/api/create',{profile:{name:'Browser Host',color:0}}),b=await post('/api/join',{code:a.session.code,profile:{name:'Browser Other',color:1}});
 const host=await pageFor(a.session),observer=await pageFor(b.session,{rtt:200});
 await host.bringToFront();await host.locator('#world').focus();await host.keyboard.down('d');await host.waitForTimeout(600);await host.keyboard.up('d');await host.waitForTimeout(500);
 let stopped=await host.evaluate(()=>({local:window.__qa.local,me:window.__qa.state.me,prediction:window.__qa.prediction}));assert.ok(Math.hypot(stopped.local.x-stopped.me.x,stopped.local.y-stopped.me.y)<.01,JSON.stringify(stopped));
 const before=stopped.local;await host.waitForTimeout(250);const after=await host.evaluate(()=>window.__qa.local);assert.ok(Math.hypot(after.x-before.x,after.y-before.y)<.01,'no local residual movement');
 results.push({test:'lobby immediate controls, 200 ms RTT observer, authoritative stop',pass:true,...await frames(host)});
 await host.evaluate(()=>window.__qa.gameSocket.close());await host.bringToFront();await host.locator('#world').focus();await host.keyboard.down('a');await host.waitForTimeout(500);await host.keyboard.up('a');await host.waitForTimeout(500);await host.waitForFunction(()=>window.__qa.gameSocket?.readyState===1);results.push({test:'actual browser reconnect with movement',pass:true});
 blackouts.set(host,Date.now()+3500);await host.waitForTimeout(4300);await host.waitForFunction(()=>window.__qa.gameSocket?.readyState===1&&Date.now()-window.__qa.state.receivedAt<300);results.push({test:'stalled WebSocket recovers through HTTP without waiting for TCP timeout',pass:true});
 await host.evaluate(()=>window.__qa.act('addBot'));await host.evaluate(()=>window.__qa.act('addBot'));
 for(const map of ['school','club','gym','park']){
  if(map!=='school'){
   const room=store.rooms.get(a.session.code);room.phase='ended';room.result={winner:'crew',reason:'QA reset',time:Date.now()};
   await host.waitForTimeout(100);await host.evaluate(()=>window.__qa.act('return'));
  }
  await host.evaluate(map=>window.__qa.act('configure',{map}),map);await host.evaluate(()=>window.__qa.act('start'));
  const room=store.rooms.get(a.session.code);room.intro=null;room.revealUntil=0;room.roleRevealAt=0;room.travelUntil=0;room.playStartAt=Date.now();for(const p of room.players)p.killReady=Date.now()+60000;
  await host.waitForFunction(map=>window.__qa.state.config.map===map&&window.__qa.state.phase==='game'&&!window.__qa.state.intro,map);
  await host.waitForTimeout(300);await host.bringToFront();await host.locator('#world').focus();await host.keyboard.down('d');const performance=await frames(host,1800);await host.keyboard.up('d');await host.waitForTimeout(450);
  const value=await host.evaluate(()=>({local:window.__qa.local,me:window.__qa.state.me,prediction:window.__qa.prediction}));assert.ok(Math.hypot(value.local.x-value.me.x,value.local.y-value.me.y)<.1,JSON.stringify({map,value}));
  results.push({map,...performance,positionError:Math.hypot(value.local.x-value.me.x,value.local.y-value.me.y),pass:true});
  if(map==='club'&&process.env.PUCELA_QA_OUTPUT){await mkdir(process.env.PUCELA_QA_OUTPUT,{recursive:true});await host.screenshot({path:process.env.PUCELA_QA_OUTPUT+'/club.png'});}
 }
 await host.context().close();await observer.context().close();store.rooms.clear();
 const mobileSession=(await post('/api/create',{profile:{name:'Mobile QA'}})).session,mobile=await pageFor(mobileSession,{mobile:true});
 await mobile.setViewportSize({width:390,height:844});await mobile.locator('#orientationHint').waitFor({state:'visible'});results.push({test:'portrait displays rotate guidance without a simulated horizontal canvas',pass:true});await mobile.setViewportSize({width:844,height:390});await mobile.locator('#orientationHint').waitFor({state:'hidden'});await mobile.waitForTimeout(250);const stick=mobile.locator('#touchStick'),box=await stick.boundingBox();assert.ok(box,'joystick visible');
 const x=box.x+box.width/2,y=box.y+box.height/2;
 const mobileStart=await mobile.evaluate(()=>window.__qa.local),touch=await mobile.context().newCDPSession(mobile);
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
 await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+40,y,id:1}]});await mobile.waitForTimeout(350);
 await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+80,y,id:1}]});await mobile.waitForTimeout(250);
 const mobileMoved=await mobile.evaluate(()=>window.__qa.local);assert.ok(Math.hypot(mobileMoved.x-mobileStart.x,mobileMoved.y-mobileStart.y)>5,'the captured touch keeps moving outside the stick');
 await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await mobile.waitForTimeout(400);
 const mobileStop=await mobile.evaluate(()=>window.__qa.local);await mobile.waitForTimeout(200);const mobileEnd=await mobile.evaluate(()=>window.__qa.local);assert.ok(Math.hypot(mobileEnd.x-mobileStop.x,mobileEnd.y-mobileStop.y)<.1);
 results.push({test:'mobile landscape 844x390 / DPR 2, joystick move and release',pass:true,...await frames(mobile)});if(process.env.PUCELA_QA_OUTPUT)await mobile.screenshot({path:process.env.PUCELA_QA_OUTPUT+'/mobile.png'});await mobile.context().close();store.rooms.clear();
 const fallbackSession=(await post('/api/create',{profile:{name:'Fallback QA'}})).session,fallback=await pageFor(fallbackSession,{transport:'http'});
 await fallback.locator('#world').focus();await fallback.keyboard.down('d');await fallback.waitForTimeout(500);await fallback.keyboard.up('d');await fallback.waitForTimeout(500);
 const fallbackValue=await fallback.evaluate(()=>({local:window.__qa.local,me:window.__qa.state.me,ws:window.__qa.gameSocket}));assert.equal(fallbackValue.ws,null);assert.ok(Math.hypot(fallbackValue.local.x-fallbackValue.me.x,fallbackValue.local.y-fallbackValue.me.y)<.1);results.push({test:'actual browser HTTP fallback',pass:true});
 assert.deepEqual(errors,[]);if(process.env.PUCELA_QA_OUTPUT)await writeFile(process.env.PUCELA_QA_OUTPUT+'/browser-results.json',JSON.stringify({browser:await browser.version(),results,errors},null,2));console.log(JSON.stringify({results,errors}));
}finally{for(const c of contexts)await c.close().catch(()=>{});await browser.close();server.closeRealtime();server.closeAllConnections();await new Promise(r=>server.close(r));}
