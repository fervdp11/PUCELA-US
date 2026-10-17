// Servidor local/producción: cero dependencias externas. Node 22 o superior.
import http from 'node:http';
import {tick,tableRealtime} from '../game/engine.js';
import {readFile} from 'node:fs/promises';
import {readFileSync,writeFileSync} from 'node:fs';
import {randomBytes,createHash} from 'node:crypto';
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
if(process.argv[1]===fileURLToPath(import.meta.url)){const port=Number(process.env.PORT)||3000;const server=makeServer();server.listen(port,'0.0.0.0',()=>console.log(`PUCELA US · http://localhost:${port}\nEn tu red: http://IP-DE-TU-PC:${port}\nServidor activo. Ctrl+C para cerrar.`));}

// ---------------------------------------------------------------------------
// Mesas en tiempo real: WebSocket mínimo (RFC 6455, sin dependencias). El
// cliente envía su entrada (maza del Air Hockey, casillas, toques…) y el
// servidor empuja la vista de su mesa 30 veces por segundo mientras juega.
// Si el WebSocket no está disponible, el cliente sigue con HTTP como antes.
const WS_GUID='258EAFA5-E914-47DA-95CA-C5AB0DC85B11',WS_MAX=2048,WS_TICK=33;
function wsFrame(text,op=0x81){const data=Buffer.from(text),n=data.length;let head;if(n<126)head=Buffer.from([op,n]);else{head=Buffer.alloc(4);head[0]=op;head[1]=126;head.writeUInt16BE(n,2);}return Buffer.concat([head,data]);}
function wsReader(onText,onClose,raw){let buf=Buffer.alloc(0);return chunk=>{buf=Buffer.concat([buf,chunk]);if(buf.length>WS_MAX*4){onClose();return;}
  while(buf.length>=2){const op=buf[0]&15,masked=buf[1]&128;let n=buf[1]&127,off=2;if(n===126){if(buf.length<4)return;n=buf.readUInt16BE(2);off=4;}else if(n===127||n>WS_MAX||!masked){onClose();return;}
   if(buf.length<off+4+n)return;const mask=buf.subarray(off,off+4),data=Buffer.from(buf.subarray(off+4,off+4+n));for(let i=0;i<n;i++)data[i]^=mask[i&3];buf=buf.subarray(off+4+n);
   if(op===8){onClose();return;}if(op===9){raw(wsFrame(data.toString('latin1'),0x8A));continue;}if(op===1)onText(data.toString('utf8'));}};}
export function attachTableSockets(server,store){
  const rooms=new Map();   // código → Set de clientes
  server.on('upgrade',async(req,socket)=>{
    const fail=(code=400)=>{try{socket.end(`HTTP/1.1 ${code} Bad Request\r\nConnection: close\r\n\r\n`);}catch{}socket.destroy();};
    let url;try{url=new URL(req.url,'http://localhost');}catch{fail();return;}
    if(url.pathname!=='/api/table-ws'||String(req.headers.upgrade||'').toLowerCase()!=='websocket'||!req.headers['sec-websocket-key']){fail();return;}
    try{if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host){fail(403);return;}}catch{fail(403);return;}
    const code=String(url.searchParams.get('code')||'').toUpperCase(),token=String(url.searchParams.get('token')||'');
    if(!/^[A-Z2-9]{6}$/.test(code)||token.length<8||token.length>200){fail();return;}
    try{await store.transact(code,room=>{tableRealtime(room,token,null,Date.now());return null;});}catch{fail(403);return;}
    const accept=createHash('sha1').update(req.headers['sec-websocket-key']+WS_GUID).digest('base64');
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    socket.setNoDelay?.(true);
    const client={socket,token,move:null,actions:[],last:'',lastAt:0,closed:false};
    let set=rooms.get(code);if(!set)rooms.set(code,set=new Set());set.add(client);
    const close=()=>{if(client.closed)return;client.closed=true;set.delete(client);if(!set.size)rooms.delete(code);try{socket.end(wsFrame('',0x88));}catch{}socket.destroy();};
    socket.on('data',wsReader(text=>{let msg;try{msg=JSON.parse(text);}catch{return;}if(!msg||typeof msg!=='object'||Array.isArray(msg))return;
      // La posición de la maza se fusiona (cuenta la última); el resto de acciones se conservan en orden.
      if(Object.keys(msg).every(k=>k==='x'||k==='y'))client.move=msg;else if(client.actions.length<8)client.actions.push(msg);},close,b=>{try{socket.write(b);}catch{}}));
    socket.on('close',close);socket.on('error',close);socket.on('end',close);
  });
  let busy=false;
  const loop=setInterval(async()=>{if(busy||!rooms.size)return;busy=true;const now=Date.now();
    try{for(const [code,set] of rooms){const list=[...set];let views;
      try{views=await store.transact(code,room=>list.map(cl=>{try{for(const a of cl.actions.splice(0))try{tableRealtime(room,cl.token,a,now);}catch{}if(cl.move){const m=cl.move;cl.move=null;try{tableRealtime(room,cl.token,m,now);}catch{}}return tableRealtime(room,cl.token,null,now);}catch{return undefined;}}));}catch{for(const cl of list){try{cl.socket.write(wsFrame(JSON.stringify({t:'closed'})));}catch{}cl.socket.destroy();}rooms.delete(code);continue;}
      list.forEach((cl,i)=>{const v=views[i];if(v===undefined){cl.socket.destroy();return;}const text=JSON.stringify({t:'view',view:v});const playing=v&&v.phase==='playing'&&v.game==='hockey';if(text!==cl.last||playing||now-cl.lastAt>1000){cl.last=text;cl.lastAt=now;try{cl.socket.write(wsFrame(text));}catch{}}});}}
    finally{busy=false;}},WS_TICK);loop.unref?.();
  server.on('close',()=>clearInterval(loop));
}
attachTableSockets(server,store);
