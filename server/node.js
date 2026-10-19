// Servidor local/producción: cero dependencias externas. Node 22 o superior.
import http from 'node:http';
import {tick} from '../game/engine.js';
import {warmNavigation} from '../game/bots.js';
import {attachTableSockets} from './realtime.js';
export {attachTableSockets} from './realtime.js';
import {readFile} from 'node:fs/promises';
import {readFileSync,writeFileSync} from 'node:fs';
import {randomBytes,createHash} from 'node:crypto';
import {gzip,gzipSync,constants as zlibConstants} from 'node:zlib';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {api,MAX_BODY} from '../game/api.js';
import {MemoryStore} from './memory-store.js';
import {createFeedback} from './feedback.js';
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
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml; charset=utf-8','.png':'image/png','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8'};
const staticCache=new Map(),gzipAsync=promisify(gzip);
async function staticFile(file){
 const hit=staticCache.get(file);if(hit)return hit;
 const pending=(async()=>{
  const bytes=await readFile(file),ext=path.extname(file),mime=MIME[ext]||'application/octet-stream';
  const etag='"'+createHash('sha1').update(bytes).digest('base64url').slice(0,20)+'"';
  const gz=ext!=='.png'&&bytes.length>1024?await gzipAsync(bytes,{level:9}):null;
  return {bytes,gz,mime,etag};
 })();
 staticCache.set(file,pending);
 try{return await pending;}catch(e){staticCache.delete(file);throw e;}
}
// Detrás del balanceador de Northflank todas las conexiones llegan desde la IP
// del proxy: el límite de 50 entradas cada 10 min se aplicaba a TODO el
// servidor a la vez. Se usa la última dirección de X-Forwarded-For (la que
// añade el propio proxy; el cliente solo puede anteponer valores falsos).
function clientIp(req){const xff=String(req.headers['x-forwarded-for']||'').split(',').map(s=>s.trim()).filter(Boolean);return xff.at(-1)||req.socket.remoteAddress||'local';}
const acceptsGzip=req=>/\bgzip\b/.test(String(req.headers['accept-encoding']||''));
// Cada instantánea de partida pesa 12–16 KB de JSON muy repetitivo; comprimida
// ocupa ~2,8 KB (≈5×menos). Con diez jugadores a 10 Hz eran más de 1,2 MB/s de
// bajada para la sala: en datos móviles eso provocaba colas, respuestas tardías
// y el aviso de reconexión. El nivel 3 cuesta ~0,07 ms por respuesta.
function sendJson(req,res,status,headers,text){const out={...headers,'Content-Type':'application/json; charset=utf-8'};let bytes=Buffer.from(text);if(bytes.length>1024&&acceptsGzip(req)){bytes=gzipSync(bytes,{level:3,strategy:zlibConstants.Z_DEFAULT_STRATEGY});out['Content-Encoding']='gzip';out['Vary']='Accept-Encoding';}out['Content-Length']=bytes.length;res.writeHead(status,out);res.end(bytes);}
export function makeServer(store=new MemoryStore(),options={}){
  warmNavigation();
  store.secret??=passSecret();
  // 15.0 · Sugerencias y bugs (se crea al primer uso; en el arranque normal, al iniciar).
  let feedback=null;const feedbackStore=()=>feedback??=createFeedback({dir:options.dataDir,secret:createHash('sha256').update('feedback/'+store.secret).digest('hex')});
  const server=http.createServer(async(req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    const headers={'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Cache-Control':'no-store'};
    if(pathname.startsWith('/api/')){
      let originOK=true;try{if(req.headers.origin)originOK=new URL(req.headers.origin).host===req.headers.host;}catch{originOK=false;}
      if(!originOK){res.writeHead(403,headers);res.end(JSON.stringify({error:'Origen no autorizado.'}));return;}
      if(req.method!=='POST'&&!(req.method==='GET'&&['/api/health','/api/rooms'].includes(pathname))){res.writeHead(405,headers);res.end();return;}
      let chunks=[],size=0;try {for await(const chunk of req){size+=chunk.length;if(size>MAX_BODY){res.writeHead(413,headers);res.end(JSON.stringify({error:'Mensaje demasiado grande.'}));return;}chunks.push(chunk);}const body=size?JSON.parse(Buffer.concat(chunks).toString()):{};if(!body||typeof body!=='object'||Array.isArray(body))throw new Error('json');const r=pathname==='/api/feedback'||pathname.startsWith('/api/creator/')?await feedbackStore().handle(pathname,body,clientIp(req)):await api(store,pathname,body,Date.now(),clientIp(req));sendJson(req,res,r.status,headers,JSON.stringify(r.body));}catch{res.writeHead(400,headers);res.end(JSON.stringify({error:'Mensaje JSON no válido.'}));}return;
    }
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,headers);res.end();return;}
    const route=pathname==='/'?'/index.html':pathname;const resolved=path.resolve(root,'.'+route);
    if(!resolved.startsWith(root)||route.includes('..')){res.writeHead(403,headers);res.end();return;}
    try{const file=await staticFile(resolved);const out={...headers,'Content-Type':file.mime,'Cache-Control':'no-cache','ETag':file.etag,'Vary':'Accept-Encoding'};
      // Revalidación barata: el navegador conserva los 1,1 MB del cliente y solo
      // pregunta si han cambiado (304). Antes `no-store` obligaba a descargarlo
      // todo en cada recarga, algo muy lento con datos móviles.
      if(req.headers['if-none-match']===file.etag){res.writeHead(304,out);res.end();return;}
      const gz=file.gz&&acceptsGzip(req);if(gz)out['Content-Encoding']='gzip';const bytes=gz?file.gz:file.bytes;out['Content-Length']=bytes.length;res.writeHead(200,out);res.end(req.method==='HEAD'?undefined:bytes);}catch{res.writeHead(404,headers);res.end('No encontrado');}
  });
  // The independent 100 ms clock advances bots, timers, wildlife and teachers
  // even when no player sends input. Missed time is processed in bounded batches.
  // Detrás de un balanceador (Northflank, Render…) el proxy reutiliza conexiones
  // durante más tiempo que los 5 s por defecto de Node. Si Node cierra primero,
  // la siguiente petición que el proxy envía por esa conexión falla con 502/503
  // y el cliente mostraba «Reconectando». El servidor debe ser el último en cerrar.
  server.keepAliveTimeout=65000;server.headersTimeout=66000;server.requestTimeout=30000;
  server.feedback=feedbackStore;
  attachTableSockets(server,store);
  const upkeep=setInterval(()=>{if(store.rooms)store.cleanup(Date.now());},1000);upkeep.unref?.();
  const simulation=setInterval(()=>{
    if(!store.rooms)return;const now=Date.now();
    for(const [code,room] of store.rooms)if(room.phase!=='ended'){
      const start=performance.now();
      (store.mutate||store.transact).call(store,code,r=>{tick(r,now);return null;}).catch(()=>{});
      if(server.gameMetrics)server.gameMetrics.maxTickMs=Math.max(server.gameMetrics.maxTickMs||0,performance.now()-start);
    }
  },100);simulation.unref?.();
  server.on('close',()=>{clearInterval(simulation);clearInterval(upkeep);});return server;
}

// Arranque directo (al final del archivo, cuando todo el módulo ya está inicializado).
if(process.argv[1]===fileURLToPath(import.meta.url)){const port=Number(process.env.PORT)||3000;const server=makeServer();server.feedback();server.listen(port,'0.0.0.0',()=>console.log(`PUCELA US · http://localhost:${port}\nEn tu red: http://IP-DE-TU-PC:${port}\nServidor activo. Ctrl+C para cerrar.`));}
