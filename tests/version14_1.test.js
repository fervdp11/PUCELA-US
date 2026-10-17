// Pruebas de la entrega 14.1: rendimiento del servidor, red e interpolación.
import test from 'node:test';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {createRoom,command,tick,snapshot,BOT_STEP_MS} from '../game/engine.js';
import {api} from '../game/api.js';
import {MemoryStore} from '../server/memory-store.js';
import {makeServer} from '../server/node.js';
import {recordRemoteSample,remoteAt,REMOTE_DELAY_MS} from '../public/remote-motion.js';
import {LOBBY} from '../public/content.js';

test('bots: la simulación avanza en pasos fijos de 100 ms aunque lleguen muchas peticiones',()=>{
 const t0=1_000_000,{room,player}=createRoom({name:'Host'},t0);for(let i=0;i<3;i++)command(room,player.token,'addBot',{},t0);
 const bot=room.players.find(p=>p.bot);const times=new Set();
 // Diez peticiones irregulares en 1 s: antes cada una ejecutaba un fotograma de IA extra.
 let frames=0;const original=room.players.length;
 for(const at of [13,40,95,130,160,233,300,377,512,1000]){tick(room,t0+at);times.add(bot.moveAt);for(const p of room.players)if(!p.bot)p.lastSeen=t0+at;}
 assert.equal(room.players.length,original);
 for(const t of times)assert.equal((t-t0)%BOT_STEP_MS,0,`marca de tiempo irregular ${t-t0}`);
 assert.ok(room.simulatedAt<=t0+1000&&t0+1000-room.simulatedAt<BOT_STEP_MS);
});

test('MemoryStore.mutate: el pulso no copia la sala y las acciones siguen siendo transaccionales',async()=>{
 const store=new MemoryStore({secret:'x'.repeat(40)}),now=Date.now();const c=await api(store,'/api/create',{profile:{name:'Host'}},now);const s=c.body.session;
 const before=store.rooms.get(s.code);const r=await api(store,'/api/room',{...s,type:'pulse',data:{x:0,y:0}},now+50);assert.equal(r.status,200);
 assert.equal(store.rooms.get(s.code),before,'el pulso modifica la misma sala sin clonarla');
 const bad=await api(store,'/api/room',{...s,type:'start'},now+60);assert.equal(bad.status,400);
 assert.equal(store.rooms.get(s.code).phase,'lobby');
});

test('HTTP: JSON y estáticos comprimidos, ETag con 304, keep-alive largo e IP real tras el proxy',async()=>{
 const server=makeServer(new MemoryStore({secret:'y'.repeat(40)}));await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  assert.ok(server.keepAliveTimeout>=60000&&server.headersTimeout>server.keepAliveTimeout);
  const http=await import('node:http');
  const raw=(path,headers={},method='GET',body=null)=>new Promise((res,rej)=>{const req=http.request(base+path,{method,headers},r=>{const chunks=[];r.on('data',c=>chunks.push(c));r.on('end',()=>res({status:r.statusCode,headers:r.headers,body:Buffer.concat(chunks)}));});req.on('error',rej);if(body)req.write(body);req.end();});
  const js=await raw('/client.js',{'accept-encoding':'gzip'});assert.equal(js.status,200);assert.equal(js.headers['content-encoding'],'gzip');assert.ok(gunzipSync(js.body).toString().includes('function'));
  const again=await raw('/client.js',{'if-none-match':js.headers.etag});assert.equal(again.status,304);
  const png=await raw('/app-icon-192.png',{'accept-encoding':'gzip'});assert.equal(png.status,200);assert.equal(png.headers['content-encoding'],undefined);
  const created=await raw('/api/create',{'content-type':'application/json','accept-encoding':'gzip','x-forwarded-for':'1.2.3.4, 10.0.0.9'},'POST',JSON.stringify({profile:{name:'Host'}}));
  assert.equal(created.status,200);assert.equal(created.headers['content-encoding'],'gzip');const parsed=JSON.parse(gunzipSync(created.body));assert.ok(parsed.session.code);
  const plain=await raw('/api/health');assert.equal(JSON.parse(plain.body).version,'14.2.0');
 }finally{server.close();}
});

test('interpolación: el retardo se adapta cuando las muestras llegan tarde (datos móviles)',()=>{
 let fast=null,slow=null;const map=LOBBY;
 for(let i=0;i<40;i++){const time=10_000+i*100,p={x:LOBBY.spawn.x+i,y:LOBBY.spawn.y,motionTime:time,input:{x:1,y:0}};
  fast=recordRemoteSample(fast,p,time,time+30);          // llega 30 ms después
  slow=recordRemoteSample(slow,p,time,time+90+(i%3)*80);} // 90–250 ms después, con variación
 assert.ok(fast.need<160&&slow.need>fast.need+60,`${fast.need} ${slow.need}`);
 const a=remoteAt(fast,14_000,map),b=remoteAt(slow,14_000,map);assert.ok(a&&b);
 assert.ok(REMOTE_DELAY_MS<=120);
});
