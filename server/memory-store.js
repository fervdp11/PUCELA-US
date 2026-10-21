import {roomAbandoned,publicRoom,roomListing} from '../game/engine.js';
import {GameError} from '../game/engine.js';
import {createHmac,randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import path from 'node:path';
import {emptyProgress,cleanProgress,MAX_LEVEL,LEVEL_XP} from '../public/pass.js';

export class MemoryStore {
  constructor(options={}){this.rooms=new Map();this.rates=new Map();this.secret=options.secret;}
  async create(room){await this.cleanup();if(this.rooms.size>200){for(const [c,r] of this.rooms)if(Date.now()-r.updated>3600000||!r.players.some(p=>!p.removed))this.rooms.delete(c);}if(this.rooms.size>=200)throw new GameError('Servidor lleno. Inténtalo más tarde.',503);if(this.rooms.has(room.code))return false;this.rooms.set(room.code,structuredClone(room));return true;}
  async transact(code,fn){const original=this.rooms.get(code);if(original&&roomAbandoned(original)){this.rooms.delete(code);throw new GameError('Esta sala se ha cerrado porque no quedaban personas conectadas.',404);}if(!original||Date.now()-original.updated>86400000)throw new GameError('No existe esa sala. Comprueba el código.',404);const room=structuredClone(original),result=fn(room);room.version++;this.rooms.set(code,room);return result;}
  // Variante sin copia para operaciones que no necesitan deshacer cambios: el
  // pulso (validado antes de mutar), el reloj de bots y las mesas en tiempo
  // real. Copiar la sala entera (≈45 KB) en cada pulso era el mayor coste fijo
  // por petición: con 10 jugadores, ~100 copias por segundo. Las acciones que
  // sí pueden fallar a medias siguen pasando por `transact`.
  async mutate(code,fn){const room=this.rooms.get(code);if(!room||room.phase==='ended')return this.transact(code,fn);if(roomAbandoned(room)){this.rooms.delete(code);throw new GameError('Esta sala se ha cerrado porque no quedaban personas conectadas.',404);}if(Date.now()-room.updated>86400000)throw new GameError('No existe esa sala. Comprueba el código.',404);const result=fn(room);room.version++;return result;}
  async cleanup(now=Date.now()){for(const [code,room] of this.rooms)if(roomAbandoned(room,now))this.rooms.delete(code);}
  async listOpen(now){await this.cleanup(now);return [...this.rooms.values()].filter(r=>publicRoom(r,now)).sort((a,b)=>b.updated-a.updated).slice(0,24).map(roomListing);}
  async limit(ip,now){let r=this.rates.get(ip);if(!r||now-r.start>600000){r={start:now,n:0};this.rates.set(ip,r);}if(++r.n>150)throw new GameError('Demasiadas entradas. Espera unos minutos.',429);if(this.rates.size>5000)for(const [k,v] of this.rates)if(now-v.start>600000)this.rates.delete(k);}
}

// 16.5 · Cuentas con nombre y contraseña. El progreso del pase se guarda en la cuenta
// (en el servidor), así que sobrevive a actualizaciones y se recupera en cualquier
// dispositivo. Nada secreto llega al cliente: las contraseñas solo se guardan como hash
// (scrypt + sal propia) y la sesión es un token firmado (HMAC) con un secreto que vive
// junto a las cuentas.
//
// Almacenamiento: DATA_DIR/accounts.json (volumen persistente de Northflank, igual que las
// sugerencias). Sin volumen funciona, pero las cuentas se pierden al redesplegar.

const keyOf=name=>String(name||'').normalize('NFKC').trim().toLowerCase();
const cleanName=v=>String(v??'').normalize('NFKC').replace(/[\u0000-\u001f\u007f‪-‮⁦-⁩]/g,'').replace(/\s+/g,' ').trim();
const b64=b=>Buffer.from(b).toString('base64url');
const SESSION_MS=1000*60*60*24*180,FAIL_LIMIT=6,FAIL_WINDOW=10*60*1000,LOCK_MS=60*1000,MAX_ACCOUNTS=5000;
const mergeClaims=(a,b)=>Number(BigInt(Math.floor(a||0))|BigInt(Math.floor(b||0)));
// El mejor de dos progresos: nunca se pierde experiencia ni recompensas recogidas.
export function mergeProgress(a,b){const x=cleanProgress(a),y=cleanProgress(b);return {xp:Math.max(x.xp,y.xp),claimed:mergeClaims(x.claimed,y.claimed)};}

export function createAccounts({dir=process.env.DATA_DIR||process.env.PUCELA_DATA_DIR||path.resolve(process.cwd(),'data'),persist=true}={}){
 const file=path.join(dir,'accounts.json');let db=null,writable=persist;
 try{if(persist)mkdirSync(dir,{recursive:true});}catch{writable=false;}
 try{if(persist)db=JSON.parse(readFileSync(file,'utf8'));}catch{}
 if(!db||typeof db!=='object'||!db.accounts||!db.secret)db={secret:randomBytes(32).toString('hex'),accounts:{}};
 const fails=new Map();
 function save(){if(!writable)return;try{const tmp=file+'.tmp';writeFileSync(tmp,JSON.stringify(db),{mode:0o600});renameSync(tmp,file);}catch{writable=false;}}
 const sign=body=>createHmac('sha256',db.secret).update('pucela-auth/1:'+body).digest('base64url').slice(0,32);
 const hash=(password,salt)=>scryptSync(String(password),salt,32,{N:16384,r:8,p:1,maxmem:64*1024*1024});
 const issue=(key,acc)=>{const body=b64(JSON.stringify({k:key,v:acc.ver||1,e:Date.now()+SESSION_MS}));return body+'.'+sign(body);};
 function verify(token){if(typeof token!=='string'||token.length>300||!token.includes('.'))return null;const [body,sig]=token.split('.');
  const want=sign(body),a=Buffer.from(String(sig)),b=Buffer.from(want);if(a.length!==b.length||!timingSafeEqual(a,b))return null;
  let p;try{p=JSON.parse(Buffer.from(body,'base64url').toString());}catch{return null;}const acc=db.accounts[p?.k];
  if(!acc||p.v!==(acc.ver||1)||!(p.e>Date.now()))return null;return {key:p.k,account:acc};}
 const view=(key,acc)=>({name:acc.name,progress:cleanProgress(acc.progress),auth:issue(key,acc)});
 function throttle(key,ip,now){const id=key+'|'+ip,f=fails.get(id);if(f&&f.n>=FAIL_LIMIT&&now-f.at<LOCK_MS)throw new GameError('Demasiados intentos. Espera un minuto.',429);}
 function fail(key,ip,now){const id=key+'|'+ip,f=fails.get(id);if(!f||now-f.at>FAIL_WINDOW)fails.set(id,{n:1,at:now});else{f.n++;f.at=now;}if(fails.size>2000)for(const [k,v] of fails)if(now-v.at>FAIL_WINDOW)fails.delete(k);}
 return {
  register({name,password,progress},ip='local',now=Date.now()){
   const n=cleanName(name),key=keyOf(n);
   if(n.length<3||n.length>18)throw new GameError('El nombre debe tener entre 3 y 18 caracteres.');
   if(String(password||'').length<6||String(password).length>72)throw new GameError('La contraseña debe tener entre 6 y 72 caracteres.');
   if(db.accounts[key])throw new GameError('Ese nombre ya tiene cuenta. Inicia sesión o elige otro.',409);
   if(Object.keys(db.accounts).length>=MAX_ACCOUNTS)throw new GameError('No se admiten más cuentas ahora mismo.',503);
   const salt=randomBytes(16);const acc={name:n,salt:salt.toString('hex'),hash:hash(password,salt).toString('hex'),ver:1,created:now,progress:mergeProgress(emptyProgress(),progress)};
   db.accounts[key]=acc;save();return view(key,acc);},
  login({name,password},ip='local',now=Date.now()){
   const key=keyOf(cleanName(name));throttle(key,ip,now);const acc=db.accounts[key];
   // Siempre se calcula el hash (con o sin cuenta) para no revelar qué nombres existen.
   const salt=acc?Buffer.from(acc.salt,'hex'):Buffer.alloc(16),h=hash(password,salt);
   if(!acc||!timingSafeEqual(h,Buffer.from(acc.hash,'hex'))){fail(key,ip,now);throw new GameError('Nombre o contraseña incorrectos.',401);}
   fails.delete(key+'|'+ip);return view(key,acc);},
  verify,
  // Progreso verificado de una sesión (o null si no es válida).
  progressOf(token){const v=verify(token);return v?{key:v.key,name:v.account.name,progress:cleanProgress(v.account.progress)}:null;},
  // Guarda sin perder nada: se queda con lo mejor de lo guardado y lo nuevo.
  saveProgress(key,progress){const acc=db.accounts[key];if(!acc)return null;const next=mergeProgress(acc.progress,progress);
   if(next.xp!==cleanProgress(acc.progress).xp||next.claimed!==cleanProgress(acc.progress).claimed){acc.progress=next;save();}return next;},
  // Suma experiencia ganada en una partida (con el tope de 50 niveles).
  addXp(key,xp){const acc=db.accounts[key];if(!acc||!(xp>0))return null;const pr=cleanProgress(acc.progress);acc.progress={...pr,xp:Math.min(MAX_LEVEL*LEVEL_XP,pr.xp+Math.floor(xp))};save();return acc.progress;},
  changePassword(token,oldPassword,newPassword){const v=verify(token);if(!v)throw new GameError('Sesión caducada. Vuelve a iniciar sesión.',401);
   if(String(newPassword||'').length<6||String(newPassword).length>72)throw new GameError('La contraseña nueva debe tener entre 6 y 72 caracteres.');
   const acc=v.account;if(!timingSafeEqual(hash(oldPassword,Buffer.from(acc.salt,'hex')),Buffer.from(acc.hash,'hex')))throw new GameError('La contraseña actual no es correcta.',401);
   const salt=randomBytes(16);acc.salt=salt.toString('hex');acc.hash=hash(newPassword,salt).toString('hex');acc.ver=(acc.ver||1)+1;save();return view(v.key,acc);},
  get size(){return Object.keys(db.accounts).length;},
  get persistent(){return writable;},
  maxLevel:MAX_LEVEL
 };
}
