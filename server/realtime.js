import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {api,MAX_BODY,signProgress} from '../game/api.js';
import {snapshot,realtimeMotion,tableRealtime} from '../game/engine.js';
import {StateEncoder,STATE_MS} from '../public/netcode.js';

const GUID='258EAFA5-E914-47DA-95CA-C5AB0DC85B11',HIGH_WATER=65536;
export function wsFrame(value,opcode=1){
 const data=Buffer.isBuffer(value)?value:Buffer.from(value),n=data.length;
 const header=Buffer.alloc(n<126?2:n<65536?4:10);header[0]=0x80|opcode;
 if(n<126)header[1]=n;else if(n<65536){header[1]=126;header.writeUInt16BE(n,2);}else{header[1]=127;header.writeBigUInt64BE(BigInt(n),2);}
 return Buffer.concat([header,data]);
}
// Masking, fragmented messages, upgrade head and binary control payloads are handled
// explicitly. Both the frame and the assembled message have a strict size limit.
export function wsReader(onText,onClose,raw,onPong=()=>{}){
 let buffer=Buffer.alloc(0),fragments=[],fragmentBytes=0,fragmented=false;
 const decoder=new TextDecoder('utf-8',{fatal:true});
 return chunk=>{
  buffer=Buffer.concat([buffer,chunk]);if(buffer.length>MAX_BODY*8){onClose();return;}
  while(buffer.length>=2){
   const fin=!!(buffer[0]&128),opcode=buffer[0]&15,masked=buffer[1]&128;
   if(buffer[0]&112||!masked){onClose();return;}
   let n=buffer[1]&127,offset=2;
   if(n===126){if(buffer.length<4)return;n=buffer.readUInt16BE(2);offset=4;}
   else if(n===127){if(buffer.length<10)return;const large=buffer.readBigUInt64BE(2);if(large>BigInt(MAX_BODY)){onClose();return;}n=Number(large);offset=10;}
   if(n>MAX_BODY||opcode>=8&&(!fin||n>125)){onClose();return;}
   if(buffer.length<offset+4+n)return;
   const mask=buffer.subarray(offset,offset+4),data=Buffer.from(buffer.subarray(offset+4,offset+4+n));
   for(let i=0;i<n;i++)data[i]^=mask[i&3];buffer=buffer.subarray(offset+4+n);
   if(opcode===8){onClose();return;}
   if(opcode===9){raw(wsFrame(data,10));continue;}
   if(opcode===10){onPong(data);continue;}
   if(opcode!==0&&opcode!==1||opcode===0&&!fragmented||opcode===1&&fragmented){onClose();return;}
   fragments.push(data);fragmentBytes+=n;
   if(fragmentBytes>MAX_BODY){onClose();return;}
   fragmented=!fin;if(!fin)continue;
   const bytes=Buffer.concat(fragments,fragmentBytes);fragments=[];fragmentBytes=0;
   try{onText(decoder.decode(bytes));}catch{onClose();return;}
  }
 };
}

export function attachTableSockets(server,store){
 const games=new Map(),tables=new Map(),all=new Set();let tableUrgent=null;
 const metrics=server.gameMetrics={cycles:0,cycleMs:0,maxCycleMs:0,snapshots:0,frames:0,bytes:0,inbound:0,skipped:0};
 const mutate=(code,fn)=>(store.mutate||store.transact).call(store,code,fn);
 function send(client,message){
  if(client.closed||client.socket.destroyed)return false;
  const text=JSON.stringify(message),frame=wsFrame(text);
  client.socket.write(frame);metrics.frames++;metrics.bytes+=frame.length;return true;
 }
 function available(client,now){
  if(client.closed)return false;
  if(client.socket.writableLength>HIGH_WATER){metrics.skipped++;client.blockedAt||=now;if(now-client.blockedAt>5000)client.close();return false;}
  if(client.blockedAt){client.encoder?.reset();client.blockedAt=0;}
  return true;
 }
 function state(client,room,now){
  if(!available(client,now))return;
  const player=room.players.find(p=>p.token===client.token&&!p.removed);
  if(!player){send(client,{t:'closed'});client.close();return;}
  const view=snapshot(room,player,now);
  // The season pass is signed even when a timer or a bot ends the game,
  // without requiring an HTTP poll to happen after the final snapshot.
  if(view.phase==='ended'&&player.progress){
   const signature=JSON.stringify(player.progress);
   if(client.passSignature===signature)view.me.passToken=client.passToken;
   else if(!client.passPending){client.passPending=true;signProgress(store,player.progress).then(token=>{client.passSignature=signature;client.passToken=token;}).finally(()=>{client.passPending=false;}).catch(()=>{});}
  }
  send(client,client.encoder.encode(view));metrics.snapshots++;
 }
 server.on('upgrade',async(req,socket,head)=>{
  const fail=(status=400)=>{socket.end(`HTTP/1.1 ${status} Bad Request\r\nConnection: close\r\n\r\n`);socket.destroy();};
  let url;try{url=new URL(req.url,'http://localhost');}catch{fail();return;}
  const game=url.pathname==='/api/game-ws';
  if(!game&&url.pathname!=='/api/table-ws'||String(req.headers.upgrade).toLowerCase()!=='websocket'||req.headers['sec-websocket-version']!=='13'){fail();return;}
  const key=String(req.headers['sec-websocket-key']||'');if(Buffer.from(key,'base64').length!==16){fail();return;}
  try{if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host){fail(403);return;}}catch{fail(403);return;}
  const code=String(url.searchParams.get('code')||'').toUpperCase(),token=String(url.searchParams.get('token')||'');
  if(!/^[A-Z2-9]{6}$/.test(code)||token.length<8||token.length>200){fail();return;}
  let room;
  try{room=await mutate(code,r=>{const p=r.players.find(p=>p.token===token&&!p.removed);if(!p)throw Error('Session');p.lastSeen=Date.now();return r;});}catch{fail(403);return;}
  if(socket.destroyed)return;
  socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${createHash('sha1').update(key+GUID).digest('base64')}\r\n\r\n`);
  socket.setNoDelay(true);socket.setTimeout(0);
  const map=game?games:tables;
  let set=map.get(code);if(!set)map.set(code,set=new Set());
  // A reconnect replaces the same transport, without taking a second room slot.
  for(const old of set)if(old.token===token)old.close();
  if(!map.has(code))map.set(code,set);
  const client={socket,token,encoder:game?new StateEncoder():null,queue:[],processing:false,closed:false,lastPong:Date.now(),lastAt:0,last:'',move:null,actions:[],results:new Map()};
  client.close=()=>{if(client.closed)return;client.closed=true;client.queue.length=0;set.delete(client);all.delete(client);if(!set.size)map.delete(code);try{socket.end(wsFrame('',8));}catch{}socket.destroy();};
  set.add(client);all.add(client);
  async function drain(){
   if(client.processing||client.closed)return;client.processing=true;
   try{while(client.queue.length&&!client.closed){
    const msg=client.queue.shift(),now=Date.now();
    if(msg.t==='input'){
     try{await mutate(code,r=>realtimeMotion(r,token,msg.motion,now));}
     catch(e){send(client,{t:'error',status:e.status||400,error:e.message});client.encoder.reset();}
    }else if(msg.t==='action'){
     if(!Number.isSafeInteger(msg.id)||typeof msg.type!=='string'||msg.type==='pulse')continue;
     if(client.results.has(msg.id)){send(client,client.results.get(msg.id));continue;}
     const result=await api(store,'/api/room',{code,token,type:msg.type,data:msg.data||{}},now,req.socket.remoteAddress);
     const response={t:'result',id:msg.id,status:result.status,result:result.body};
     // Cache action results, not 32 complete private snapshots per connection.
     const {state:ignored,...extra}=result.body;
     client.results.set(msg.id,{...response,result:extra});if(client.results.size>32)client.results.delete(client.results.keys().next().value);
     send(client,response);client.encoder.reset();
    }
   }}finally{client.processing=false;}
  }
  const receive=wsReader(text=>{
   metrics.inbound++;let msg;try{msg=JSON.parse(text);}catch{return;}
   if(!msg||typeof msg!=='object'||Array.isArray(msg))return;
   const now=Date.now();if(!client.rateAt||now-client.rateAt>=1000){client.rateAt=now;client.rate=0;}
   if(++client.rate>100){client.close();return;}
   client.lastPong=now;
   if(!game){if(Object.keys(msg).every(k=>k==='x'||k==='y'))client.move=msg;else if(client.actions.length<8){client.actions.push(msg);tableUrgent?.(code);}return;}
   if(msg.t==='ping'){
    mutate(code,r=>{const p=r.players.find(p=>p.token===token&&!p.removed);if(p)p.lastSeen=now;}).catch(()=>client.close());
    if(available(client,now))send(client,{t:'pong',sent:msg.sent,serverTime:now});return;
   }
   if(msg.t==='resync'){client.encoder.reset();return;}
   if(!['input','action'].includes(msg.t))return;
   if(client.queue.length>=32){client.close();return;}
   client.queue.push(msg);drain().catch(()=>client.close());
  },client.close,frame=>{if(available(client,Date.now()))socket.write(frame);},data=>{const now=Date.now();client.lastPong=now;
   // 15.0 · Latencia medida por el propio servidor (ping de control con su hora):
   // limita cuánto puede rebobinar un asesinato. El cliente no puede declararla.
   const sent=data?.length===13?Number(data.toString()):NaN;if(game&&Number.isFinite(sent)&&now>=sent&&now-sent<5000){const rtt=now-sent;client.rtt=client.rtt==null?rtt:client.rtt*.7+rtt*.3;const player=store.rooms?.get(code)?.players.find(p=>p.token===token&&!p.removed);if(player)player.netRtt=Math.round(client.rtt);}});
  socket.on('data',receive);socket.on('end',client.close);socket.on('close',client.close);socket.on('error',client.close);
  if(game)state(client,room,Date.now());
  if(head.length)receive(head);
 });
 // A slow recipient never blocks another room or creates a growing write queue.
 const loop=setInterval(()=>{
  const started=performance.now(),now=Date.now();
  for(const [code,set] of games){
   const room=store.rooms?.get(code);
   if(!room){for(const client of set){send(client,{t:'closed'});client.close();}continue;}
   for(const client of set)state(client,room,now);
  }
  const elapsed=performance.now()-started;metrics.cycles++;metrics.cycleMs+=elapsed;metrics.maxCycleMs=Math.max(metrics.maxCycleMs,elapsed);
 },STATE_MS);loop.unref?.();
 // 16.9 · Mesas: un mismo paso sirve al bucle de 33 ms y a las pulsaciones urgentes (golpes, taps,
 // chutes), que se procesan al llegar en vez de esperar al siguiente ciclo. Ciclo y reloj no cambian.
 function runTable(code,set){
  if(set.busy){return;}set.busy=true;const now=Date.now();
  const clients=[...set].filter(c=>available(c,now));
  mutate(code,room=>clients.map(client=>{
   try{for(const a of client.actions.splice(0))try{tableRealtime(room,client.token,a,now);}catch{}
    if(client.move){const m=client.move;client.move=null;tableRealtime(room,client.token,m,now);}
    return tableRealtime(room,client.token,null,now);
   }catch{return undefined;}
  })).then(views=>clients.forEach((client,i)=>{
   const view=views[i];if(view===undefined){client.close();return;}
   const playing=view?.phase==='playing'&&(view?.game==='boxing'||view?.game==='football');
   // Un solo JSON por mesa y jugador (las vistas comparten el mismo estado de juego).
   const text=JSON.stringify(view);
   if(text!==client.last||playing||now-client.lastAt>1000){client.last=text;client.lastAt=now;send(client,{t:'view',view});}
  })).catch(()=>{for(const client of set)client.close();}).finally(()=>{set.busy=false;if(set.pending){set.pending=false;runTable(code,set);}});
 }
 const tableLoop=setInterval(()=>{for(const [code,set] of tables)runTable(code,set);},33);tableLoop.unref?.();
 tableUrgent=(code)=>{const set=tables.get(code);if(!set)return;if(set.busy)set.pending=true;else runTable(code,set);};
 const rttProbe=setInterval(()=>{const now=Date.now();for(const set of games.values())for(const client of set)if(available(client,now))client.socket.write(wsFrame(String(now),9));},2000);rttProbe.unref?.();
 const heartbeat=setInterval(()=>{const now=Date.now();for(const client of all){if(now-client.lastPong>30000)client.close();else if(available(client,now))client.socket.write(wsFrame('',9));}},10000);heartbeat.unref?.();
 server.closeRealtime=()=>{clearInterval(loop);clearInterval(rttProbe);clearInterval(tableLoop);clearInterval(heartbeat);for(const client of all)client.close();};
 server.on('close',server.closeRealtime);
}
