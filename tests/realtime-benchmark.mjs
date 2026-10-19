// Run: npm run test:network-benchmark
// Optional comparison: PUCELA_BASELINE=/absolute/original/project npm run test:network-benchmark
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {fork} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {performance,monitorEventLoopDelay} from 'node:perf_hooks';
import {writeFile} from 'node:fs/promises';
import {StateDecoder,INPUT_MS} from '../public/netcode.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(process.argv[2]==='--server'){
 const {makeServer}=await import(path.join(process.argv[3],'server/node.js'));
 const {MemoryStore}=await import(path.join(process.argv[3],'server/memory-store.js'));
 const store=new MemoryStore({secret:'network-benchmark'}),server=makeServer(store),lag=monitorEventLoopDelay({resolution:10});lag.enable();
 let cpu=process.cpuUsage(),start=performance.now();
 process.on('message',message=>{
  if(message.t==='prepare'){
   for(const room of store.rooms.values()){
    room.intro=null;room.revealUntil=0;room.travelUntil=0;room.roleRevealAt=0;room.playStartAt=Date.now();
    room.players.forEach((p,i)=>{p.role=i?'crew':'impostor';p.specialRole=null;p.killReady=Date.now()+60000;});
   }
   cpu=process.cpuUsage();start=performance.now();lag.reset();
   if(server.gameMetrics)for(const key of Object.keys(server.gameMetrics))server.gameMetrics[key]=0;
   process.send({t:'prepared'});
  }else if(message.t==='stats'){
   const usage=process.cpuUsage(cpu),elapsed=performance.now()-start;
   process.send({t:'stats',cpuCorePercent:(usage.user+usage.system)/1000/elapsed*100,rssMiB:process.memoryUsage().rss/1048576,eventLoopP99Ms:lag.percentile(99)/1e6,eventLoopMaxMs:lag.max/1e6,elapsedMs:elapsed,metrics:server.gameMetrics});
  }else if(message.t==='stop'){
   server.closeRealtime?.();server.closeAllConnections();server.close(()=>process.exit(0));
  }
 });
 server.listen(0,'127.0.0.1',()=>process.send({t:'ready',port:server.address().port}));
}else{
 async function run({label,project=root,mode='websocket',rooms=1,humans=10,bots=0,rtt=100,duration=4000,maps=['gym']}){
  const child=fork(fileURLToPath(import.meta.url),['--server',project],{stdio:['ignore','ignore','inherit','ipc']});
  const get=type=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>{child.off('message',listener);reject(Error('Benchmark timeout '+type));},15000);const listener=m=>{if(m.t===type){clearTimeout(timer);child.off('message',listener);resolve(m);}};child.on('message',listener);});
  const {port}=await get('ready'),origin=`http://127.0.0.1:${port}`;
  let downstream=0,upstream=0,packets=0,errors=[];const clients=[],sockets=[],timers=new Set(),acks=[],ages=[];
  const later=(fn,ms)=>{const timer=setTimeout(()=>{timers.delete(timer);fn();},ms);timers.add(timer);};
  async function post(route,body,count=false){const text=JSON.stringify(body);if(count)upstream+=Buffer.byteLength(text);const response=await fetch(origin+route,{method:'POST',headers:{'Content-Type':'application/json'},body:text});const result=await response.json();if(count)downstream+=Number(response.headers.get('content-length'))||Buffer.byteLength(JSON.stringify(result));if(!response.ok)throw Error(result.error);return result;}
  function received(client,state){
   client.updates++;const ack=state.me.motionSeq;
   for(const [seq,at] of client.sent)if(seq<=ack){acks.push(Date.now()-at);client.sent.delete(seq);}
   const remote=state.players.find(p=>p.id!==state.me.id&&!p.name?.startsWith('Bot')&&p.input&&(p.input.x||p.input.y));
   if(remote?.motionTime)ages.push(Date.now()-remote.motionTime);
  }
  let active=false;
  try{
   for(let room=0;room<rooms;room++){
    const created=await post('/api/create',{profile:{name:`Bench ${room}-0`,color:0}}),sessions=[created.session];
    for(let i=1;i<humans;i++)sessions.push((await post('/api/join',{code:created.session.code,profile:{name:`Bench ${room}-${i}`,color:i}})).session);
    const host=sessions[0];await post('/api/room',{...host,type:'configure',data:{map:maps[room%maps.length]}});
    for(let i=0;i<bots;i++)await post('/api/room',{...host,type:'addBot',data:{}});
    await post('/api/room',{...host,type:'start',data:{}});
    for(const session of sessions)clients.push({session,seq:0,sent:new Map(),updates:0,lastCapture:Date.now()});
   }
   if(mode==='websocket')for(const client of clients){
    const decoder=new StateDecoder(),socket=new WebSocket(`${origin.replace('http:','ws:')}/api/game-ws?code=${client.session.code}&token=${client.session.token}`);sockets.push(socket);client.socket=socket;
    socket.addEventListener('error',()=>errors.push('socket error'));
    socket.addEventListener('message',event=>{if(!active)return;const msg=JSON.parse(event.data);downstream+=Buffer.byteLength(event.data)+4;
     if(msg.t==='error')errors.push(msg.error);
     if(msg.t==='state'){let state;try{state=decoder.read(msg);}catch{socket.send(JSON.stringify({t:'resync'}));return;}if(state)later(()=>{if(active)received(client,state);},rtt/2);}
    });
    await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
   }
   const prepared=get('prepared');child.send({t:'prepare'});await prepared;
   active=true;const begin=Date.now();for(const c of clients)c.lastCapture=begin;
   const send=async client=>{
    const time=Date.now(),ms=Math.min(500,time-client.lastCapture),x=Math.floor((time-begin)/500)%2?1:-1;client.lastCapture=time;
    const segments=[];let remaining=ms;while(remaining>.0001){const step=Math.min(1000/60,remaining);segments.push({x,y:0,ms:step});remaining-=step;}
    const motion={seq:++client.seq,time,segments,x,y:0};client.sent.set(motion.seq,time);packets++;
    if(mode==='websocket'){
     const text=JSON.stringify({t:'input',motion});upstream+=Buffer.byteLength(text)+8;later(()=>{if(active&&client.socket.readyState===1)client.socket.send(text);},rtt/2);
    }else{
     try{await delay(rtt/2);const result=await post('/api/room',{...client.session,type:'pulse',data:{_motion:motion}},true);await delay(rtt/2);if(active)received(client,result.state);}catch(e){errors.push(e.message);}
    }
   };
   let loops=[];
   if(mode==='websocket'){
    const timer=setInterval(()=>{for(const c of clients)send(c);},INPUT_MS);await delay(duration);clearInterval(timer);
   }else{
    loops=clients.map(async client=>{while(active){const start=Date.now();await send(client);await delay(Math.max(12,70-(Date.now()-start)));}});await delay(duration);
   }
   active=false;await Promise.all(loops);
   const statsPromise=get('stats');child.send({t:'stats'});const stats=await statsPromise;
   const percentile=(list,p)=>list.length?list.sort((a,b)=>a-b)[Math.min(list.length-1,Math.floor(list.length*p))]:null;
   const result={label,mode,rooms,humansPerRoom:humans,botsPerRoom:bots,rttMs:rtt,durationMs:duration,inputHzPerPlayer:packets/clients.length/(duration/1000),stateHzPerPlayer:clients.reduce((n,c)=>n+c.updates,0)/clients.length/(duration/1000),ackP50Ms:percentile(acks,.5),ackP95Ms:percentile(acks,.95),remoteSampleAgeP50Ms:percentile(ages,.5),upKiBs:upstream/1024/(duration/1000),downKiBs:downstream/1024/(duration/1000),...stats,errors};delete result.t;
   console.log(JSON.stringify(result));return result;
  }finally{
   active=false;for(const timer of timers)clearTimeout(timer);for(const socket of sockets)socket.close();child.send({t:'stop'});await new Promise(resolve=>child.once('exit',resolve));
  }
 }
 const results=[];
 if(process.env.PUCELA_BASELINE)results.push(await run({label:'original-10-players',project:path.resolve(process.env.PUCELA_BASELINE),mode:'http'}));
 results.push(await run({label:'optimized-10-players'}));
 results.push(await run({label:'optimized-20-players',rooms:2,humans:10,rtt:200}));
 results.push(await run({label:'all-maps-36-bots',rooms:4,humans:1,bots:9,rtt:100,maps:['school','club','gym','park']}));
 if(process.env.PUCELA_BENCHMARK_OUT)await writeFile(process.env.PUCELA_BENCHMARK_OUT,JSON.stringify(results,null,2));
}
