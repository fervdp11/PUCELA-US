import {createRoom,joinRoom,command,snapshot,GameError,roomCode} from './engine.js';
import {encodePayload,readToken,emptyProgress,levelOf,hasClaimed,withClaim,REWARDS} from '../public/pass.js';
export const MAX_BODY=8192;
export const VERSION='14.3.0';

// Progreso del pase firmado por el servidor (HMAC-SHA256). El cliente lo guarda
// y lo presenta al entrar; sin el secreto no puede fabricar experiencia ni
// recompensas. Un token alterado o de otro servidor cuenta como progreso vacío.
const keys=new Map();
function secretOf(store){return store.secret||globalThis.process?.env?.SANAGUS_SECRET||'sanagus-local';}
async function key(secret){let k=keys.get(secret);if(!k){k=crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);keys.set(secret,k);}return k;}
async function mac(secret,body){const sig=new Uint8Array(await crypto.subtle.sign('HMAC',await key(secret),new TextEncoder().encode('sanagus-pass/1:'+body)));return Array.from(sig.slice(0,16),b=>b.toString(16).padStart(2,'0')).join('');}
export async function signProgress(store,progress){const body=encodePayload(progress);return body+'.'+await mac(secretOf(store),body);}
export async function verifyProgress(store,token){
  if(typeof token!=='string'||token.length>200||!token.includes('.'))return emptyProgress();
  const [body,sig]=token.split('.');
  if(!body||!sig||sig.length!==32)return emptyProgress();
  const expected=await mac(secretOf(store),body);
  let diff=0;for(let i=0;i<32;i++)diff|=expected.charCodeAt(i)^sig.charCodeAt(i);
  return diff?emptyProgress():readToken(token);
}
async function withPassToken(store,result){const me=result?.state?.me;if(me?.progress&&result.state.phase==='ended')me.passToken=await signProgress(store,me.progress);return result;}

export async function api(store,path,body,now=Date.now(),ip='local') {
  try {
    if(path==='/api/health')return {status:200,body:{ok:true,game:'PUCELA US',version:VERSION,transport:'authoritative-http'}};
    if(path==='/api/rooms')return {status:200,body:{rooms:await store.listOpen(now)}};
    if(!body||typeof body!=='object'||Array.isArray(body))throw new GameError('Mensaje JSON no válido.');
    if(body.data!==undefined&&(!body.data||typeof body.data!=='object'||Array.isArray(body.data)))throw new GameError('Datos de acción no válidos.');
    // Pase: leer el progreso verificado o recoger la recompensa de un nivel.
    if(path==='/api/pass'){
      const progress=await verifyProgress(store,body.token);
      if(body.claim!==undefined){
        const level=Number(body.claim),reward=REWARDS.find(r=>r.level===level);
        if(!reward)throw new GameError('Ese nivel no existe.');
        if(levelOf(progress.xp).level<level)throw new GameError('Todavía no has alcanzado ese nivel.');
        if(hasClaimed(progress.claimed,level))throw new GameError('Ya has recogido esa recompensa.');
        progress.claimed=withClaim(progress.claimed,level);
      }
      return {status:200,body:{progress,token:await signProgress(store,progress)}};
    }
    const presented=body.profile&&typeof body.profile==='object'?await verifyProgress(store,body.profile.pass):emptyProgress();
    if(path==='/api/create'){await store.limit(ip,now);const {room,player}=createRoom(body.profile,now,body.visibility,presented);let saved=false;for(let i=0;i<8&&!saved;i++){if(i)room.code=roomCode();saved=await store.create(room);}if(!saved)throw new GameError('No se ha podido crear la sala. Vuelve a intentarlo.',503);return {status:200,body:{session:{code:room.code,token:player.token},state:snapshot(room,player,now)}};}
    if(!['/api/join','/api/room'].includes(path))throw new GameError('Ruta no encontrada.',404);
    if(path==='/api/join')await store.limit(ip,now);
    const code=String(body.code||'').toUpperCase().replace(/\s/g,'');if(!/^[A-Z2-9]{6}$/.test(code))throw new GameError('El código debe tener 6 letras o números.');
    const quick=path==='/api/room'&&body.type==='pulse'&&typeof store.mutate==='function';const result=await (quick?store.mutate(code,run):store.transact(code,run));function run(room){if(path==='/api/join'){const p=joinRoom(room,body.profile,now,presented);return {session:{code:room.code,token:p.token},state:snapshot(room,p,now)};}return command(room,body.token,body.type,body.data||{},now);}
    return {status:200,body:await withPassToken(store,result)};
  } catch(e){if(e instanceof GameError)return {status:e.status,body:{error:e.message}};console.error('PUCELA US API:',e);return {status:503,body:{error:'El servidor está ocupado. Reintentando conexión…'}};}
}
