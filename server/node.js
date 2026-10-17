// Servidor local/producción: cero dependencias externas. Node 24 o superior.
import http from 'node:http';
import {tick} from '../game/engine.js';
import {readFile} from 'node:fs/promises';
import {readFileSync,writeFileSync} from 'node:fs';
import {randomBytes,createHash} from 'node:crypto';
import {tableCommand,tableTick,tableView} from '../game/tables.js';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {api,MAX_BODY} from '../game/api.js';
import {MemoryStore} from './memory-store.js';
const root=fileURLToPath(new URL('../public/',import.meta.url));
// Secreto con el que el servidor firma el progreso del pase. En producción va en
// la variable SANAGUS_SECRET; si no existe se crea uno junto al proyecto y se
// reutiliza en cada arranque, para que el progreso de los jugadores siga valiendo.
export function passSecret(){
  if(process.env.SANAGUS_SECRET)return process.env.SANAGUS_SECRET;
  const file=fileURLToPath(new URL('../.sanagus-secret',import.meta.url));
  try{const saved=readFileSync(file,'utf8').trim();if(saved.length>=32)return saved;}catch{}
  const fresh=randomBytes(32).toString('hex');
  try{writeFileSync(file,fresh,{mode:0o600});}catch{}
  return fresh;
}
export function makeServer(store=new MemoryStore()){
  store.secret??=passSecret();
  const server=http.createServer(async(req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    const headers={'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Cache-Control':'no-store'};
    if(pathname.startsWith('/api/')){
      let originOK=true;try{if(req.headers.origin)originOK=new URL(req.headers.origin).host===req.headers.host;}catch{originOK=false;}
      if(!originOK){res.writeHead(403,headers);res.end(JSON.stringify({error:'Origen no autorizado.'}));return;}
      if(req.method!=='POST'&&!(req.method==='GET'&&['/api/health','/api/rooms'].includes(pathname))){res.writeHead(405,headers);res.end();return;}
      let chunks=[],size=0;try {for await(const chunk of req){size+=chunk.length;if(size>MAX_BODY){res.writeHead(413,headers);res.end(JSON.stringify({error:'Mensaje demasiado grande.'}));return;}chunks.push(chunk);}const body=size?JSON.parse(Buffer.concat(chunks).toString()):{};const r=await api(store,pathname,body,Date.now(),req.socket.remoteAddress);res.writeHead(r.status,{...headers,'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(r.body));}catch{res.writeHead(400,headers);res.end(JSON.stringify({error:'Mensaje JSON no válido.'}));}return;
    }
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,headers);res.end();return;}
    const route=pathname==='/'?'/index.html':pathname;const resolved=path.resolve(root,'.'+route);
    if(!resolved.startsWith(root)||route.includes('..')){res.writeHead(403,headers);res.end();return;}
    try{const bytes=await readFile(resolved);const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json'}[path.extname(resolved)]||'application/octet-stream';res.writeHead(200,{...headers,'Content-Type':mime+'; charset=utf-8'});res.end(req.method==='HEAD'?undefined:bytes);}catch{res.writeHead(404,headers);res.end('No encontrado');}
  });
  const closeStreams=mountTableStreams(server,store);
  server.on('close',closeStreams);
  // Authoritative bots also advance without a browser polling this process.
  // Los bots avanzan también sin navegador. `tick` recupera el tiempo perdido
  // en subpasos de 100 ms, así que el intervalo solo decide cada cuánto se
  // despierta el proceso, no la fidelidad de la simulación. Mientras hay gente
  // jugando, cada petición del cliente ya hace avanzar la sala; este reloj
  // existe para las salas que se quedan sin nadie mirando. A 100 ms recorría
  // todas las salas diez veces por segundo sin necesidad.
  const upkeep=setInterval(()=>{if(store.rooms)store.cleanup(Date.now());},100);upkeep.unref?.();
  const simulation=setInterval(()=>{if(!store.rooms)return;const now=Date.now();for(const [code,room] of store.rooms)if(room.phase!=='ended'&&room.players.some(p=>p.bot&&!p.removed))store.transact(code,r=>{tick(r,now);return null;}).catch(()=>{});},250);simulation.unref?.();server.on('close',()=>{clearInterval(simulation);clearInterval(upkeep);});return server;
}
// WebSocket exclusivo de mesas: instantáneas pequeñas a 30 Hz, física una vez
// por sala y fotograma. La partida principal conserva su protocolo autoritativo.
// Framing RFC 6455 sin dependencias externas; límites, origen y autenticación
// se validan antes de admitir mensajes de juego.
export function mountTableStreams(server,store){
 const clients=new Set();let stopped=false;
 function frame(socket,body,opcode=1){if(socket.destroyed||socket.writableLength>65536){socket.destroy();return;}const bytes=Buffer.isBuffer(body)?body:Buffer.from(JSON.stringify(body));const h=Buffer.alloc(bytes.length<126?2:4);h[0]=0x80|opcode;if(bytes.length<126)h[1]=bytes.length;else{h[1]=126;h.writeUInt16BE(bytes.length,2);}socket.write(Buffer.concat([h,bytes]));}
 function end(c,code=1000){if(c.closing)return;c.closing=true;const b=Buffer.alloc(2);b.writeUInt16BE(code);frame(c.socket,b,8);c.socket.end();c.socket.setTimeout(200,()=>c.socket.destroy());}
 function cleanup(c){if(!clients.delete(c))return;clearTimeout(c.authTimer);if(!c.token||[...clients].some(q=>q.code===c.code&&q.token===c.token))return;
  store.transact(c.code,room=>{const p=room.players.find(p=>p.token===c.token&&!p.removed);if(p&&room.phase==='lobby')tableCommand(room,p,'tableLeave',{},Date.now(),()=>false);}).catch(()=>{});
 }
 server.on('upgrade',(req,socket,head)=>{
  const fail=status=>{socket.end(`HTTP/1.1 ${status}\r\nConnection: close\r\n\r\n`);};
  if(stopped||!store.rooms||req.url!=='/api/tables-ws')return fail('404 Not Found');
  let validOrigin=false;try{validOrigin=!!req.headers.origin&&new URL(req.headers.origin).host===req.headers.host;}catch{}
  const key=req.headers['sec-websocket-key'];
  if(!validOrigin)return fail('403 Forbidden');
  if(req.method!=='GET'||req.headers.upgrade?.toLowerCase()!=='websocket'||!/(?:^|,)\s*upgrade\s*(?:,|$)/i.test(req.headers.connection||'')||req.headers['sec-websocket-version']!=='13'||typeof key!=='string'||!/^[A-Za-z0-9+/]{22}==$/.test(key))return fail('400 Bad Request');
  if(clients.size>=400||[...clients].filter(c=>c.ip===socket.remoteAddress).length>=32)return fail('429 Too Many Requests');
  const accept=createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+accept+'\r\n\r\n');socket.setNoDelay(true);
  const c={socket,ip:socket.remoteAddress,buffer:Buffer.alloc(0),code:null,token:null,last:Date.now(),rateAt:Date.now(),count:0,closing:false,pending:false};clients.add(c);c.authTimer=setTimeout(()=>{if(!c.token)end(c,1008);},4000);c.authTimer.unref?.();
  async function message(raw){
   let m;try{m=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));}catch{end(c,1007);return;}
   if(!m||typeof m!=='object'||Array.isArray(m)){end(c,1008);return;}
   const now=Date.now();if(now-c.rateAt>=1000){c.rateAt=now;c.count=0;}if(++c.count>65){end(c,1008);return;}
   if(!c.token){
    const code=String(m.code||'').toUpperCase(),token=String(m.token||'');if(m.type!=='subscribe'||!/^[A-Z2-9]{6}$/.test(code)||token.length>128||[...clients].filter(q=>q.token===token).length>=2){end(c,1008);return;}
    const room=store.rooms.get(code),p=room?.players.find(p=>p.token===token&&!p.removed&&!p.bot);
    if(!p||room.phase!=='lobby'||!tableView(room,p,now)){end(c,1008);return;}
    c.code=code;c.token=token;c.last=now;clearTimeout(c.authTimer);
    await store.transact(code,r=>{const q=r.players.find(q=>q.token===token&&!q.removed);if(q){q.lastSeen=now;q.input={x:0,y:0};q.moveAt=now;}}).catch(()=>end(c,1008));
    frame(socket,{ready:true});return;
   }
   if(!['ping','tableInput','tableAgain'].includes(m.type)||m.data!==undefined&&(!m.data||typeof m.data!=='object'||Array.isArray(m.data))){end(c,1008);return;}
   c.last=now;
   try{await store.transact(c.code,room=>{const p=room.players.find(p=>p.token===c.token&&!p.removed&&!p.bot);if(!p||room.phase!=='lobby')throw Error('La mesa ha cerrado.');p.lastSeen=now;room.updated=now;if(m.type!=='ping')tableCommand(room,p,m.type,m.data||{},now,()=>false);});}
   catch(e){frame(socket,{error:e.message||'Acción de mesa no válida.'});}
  }
  function data(chunk){
   if(c.closing)return;c.buffer=Buffer.concat([c.buffer,chunk]);if(c.buffer.length>32768){end(c,1009);return;}
   while(c.buffer.length>=2&&!c.closing){
    const b=c.buffer,op=b[0]&15,fin=!!(b[0]&128),masked=!!(b[1]&128);let len=b[1]&127,at=2;
    if((b[0]&112)||!masked||!fin||![1,8,9,10].includes(op)){end(c,1002);return;}
    if(len===127){end(c,1009);return;}if(len===126){if(b.length<4)return;len=b.readUInt16BE(2);at=4;}
    if(len>8192||op>=8&&len>125){end(c,1009);return;}if(b.length<at+4+len)return;
    const mask=b.subarray(at,at+4),payload=Buffer.from(b.subarray(at+4,at+4+len));for(let i=0;i<len;i++)payload[i]^=mask[i%4];c.buffer=b.subarray(at+4+len);
    if(op===8){end(c);return;}if(op===9){frame(socket,payload,10);continue;}if(op===10)continue;
    // Las transacciones son síncronas en MemoryStore. El rechazo de acciones
    // nunca deja una promesa sin observar ni mezcla mensajes de otras parejas.
    message(payload).catch(()=>end(c,1011));
   }
  }
  socket.on('data',data);socket.on('error',()=>cleanup(c));socket.on('close',()=>cleanup(c));if(head.length)data(head);
 });
 const tickAt=new Map();let ticking=false;
 const timer=setInterval(async()=>{
  if(ticking||stopped||!clients.size)return;ticking=true;const now=Date.now();
  try{
   for(const c of clients)if(c.token&&now-c.last>7000)end(c,1001);
   const codes=new Set([...clients].filter(c=>c.token&&!c.closing).map(c=>c.code));
   for(const code of tickAt.keys())if(!codes.has(code))tickAt.delete(code);
   for(const code of codes){
    const current=store.rooms.get(code),games=current?.tables?.list||[],period=games.some(s=>s.game==='hockey'&&s.phase==='playing')?33:games.some(s=>s.phase==='playing')?66:250;if(now-(tickAt.get(code)||0)<period)continue;tickAt.set(code,now);
    try{await store.transact(code,room=>{if(room.phase==='lobby')tableTick(room,now);});}catch{for(const c of clients)if(c.code===code)end(c,1008);continue;}
    const room=store.rooms.get(code);
    for(const c of clients){if(c.code!==code||c.closing)continue;const p=room?.players.find(p=>p.token===c.token&&!p.removed),table=p&&room.phase==='lobby'?tableView(room,p,now):null;const signature=JSON.stringify(table&&{...table,serverTime:0});if(signature!==c.signature||now-(c.sentAt||0)>1000){frame(c.socket,{table});c.signature=signature;c.sentAt=now;}if(!table)end(c);}
   }
  }finally{ticking=false;}
 },33);timer.unref?.();
 return ()=>{stopped=true;clearInterval(timer);for(const c of clients)c.socket.destroy();clients.clear();};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const port=Number(process.env.PORT)||3000;const server=makeServer();server.listen(port,'0.0.0.0',()=>console.log(`PUCELA US · http://localhost:${port}\nEn tu red: http://IP-DE-TU-PC:${port}\nServidor activo. Ctrl+C para cerrar.`));}
