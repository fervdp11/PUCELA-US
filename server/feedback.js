// Single Node instance + Northflank persistent volume. No external dependencies.
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {randomBytes,createHash,scrypt,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import path from 'node:path';
const derive=promisify(scrypt),digest=s=>createHash('sha256').update(String(s)).digest();
const equal=(a,b)=>a.length===b.length&&timingSafeEqual(a,b);
export class FeedbackService{
 constructor(directory=process.env.PUCELA_DATA_DIR||path.resolve('.data')){
  this.dir=directory;this.messages=[];this.sessions=new Map();this.rates=new Map();this.queue=Promise.resolve();
  this.ready=this.init().catch(e=>{this.failure=e;});
 }
 async init(){
  await mkdir(this.dir,{recursive:true,mode:0o700});
  const file=path.join(this.dir,'creator.json');
  try{this.credentials=JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
  if(process.env.CREATOR_PASSWORD||!this.credentials){
   const password=process.env.CREATOR_PASSWORD||randomBytes(18).toString('base64url');
   if(password.length<12)throw Error('CREATOR_PASSWORD debe tener al menos 12 caracteres.');
   const salt=randomBytes(24).toString('hex'),hash=(await derive(password,salt,64)).toString('hex');
   this.credentials={salt,hash};await this.atomic(file,this.credentials);
   if(!process.env.CREATOR_PASSWORD)console.log('PUCELA US · Contraseña inicial del creador (guárdala): '+password);
  }
  try{const saved=JSON.parse(await readFile(path.join(this.dir,'feedback.json'),'utf8'));if(!Array.isArray(saved))throw Error('Archivo de sugerencias no válido.');this.messages=saved.slice(-1000);}catch(e){if(e.code!=='ENOENT')throw e;}
 }
 async atomic(file,value){const tmp=file+'.'+randomBytes(6).toString('hex')+'.tmp';await writeFile(tmp,JSON.stringify(value),{mode:0o600});await rename(tmp,file);}
 limited(key,now,window,max){let r=this.rates.get(key);if(!r||now-r.at>window){r={at:now,n:0};this.rates.set(key,r);}if(this.rates.size>5000)for(const [k,v] of this.rates)if(now-v.at>86400000)this.rates.delete(k);return ++r.n>max;}
 session(req,now){const raw=String(req.headers.cookie||'').match(/(?:^|;\s*)pucela_admin=([A-Za-z0-9_-]{40,100})(?:;|$)/)?.[1];if(!raw)return null;const key=digest(raw).toString('hex'),s=this.sessions.get(key);return s&&s.until>now?key:null;}
 async handle(route,body,req,ip,now=Date.now()){
  await this.ready;const response=(status,body,headers={})=>({status,body,headers});
  if(this.failure)return response(503,{error:'No se pudo abrir el almacenamiento. Revisa PUCELA_DATA_DIR y el volumen persistente.'});
  for(const [key,s] of this.sessions)if(s.until<now)this.sessions.delete(key);
  if(route==='/api/feedback/send'){
   if(this.limited('send:'+ip,now,60000,2)||this.limited('daily:'+ip,now,86400000,12))return response(429,{error:'Espera un minuto antes de enviar otro mensaje.'});
   const message=String(body.message||'').normalize('NFKC').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g,'').trim();
   const name=String(body.name||'Anónimo').replace(/[<>\u0000-\u001f]/g,'').trim().slice(0,32)||'Anónimo';
   if(message.length<8||message.length>1200)return response(400,{error:'Escribe entre 8 y 1200 caracteres.'});
   if(this.messages.some(m=>m.message===message&&now-m.at<600000))return response(429,{error:'Ese mensaje ya se ha recibido. Gracias.'});
   const saved={id:randomBytes(12).toString('hex'),name,message,kind:body.kind==='bug'?'bug':'suggestion',at:now};
   const job=this.queue.then(async()=>{const next=[...this.messages,saved].slice(-1000);await this.atomic(path.join(this.dir,'feedback.json'),next);this.messages=next;});
   this.queue=job.catch(()=>{});try{await job;}catch{return response(503,{error:'No se pudo guardar el mensaje. Inténtalo de nuevo.'});}
   return response(201,{ok:true});
  }
  if(route==='/api/feedback/login'){
   if(this.limited('login:'+ip,now,600000,5)||this.limited('login:all',now,60000,12))return response(429,{error:'Demasiados intentos. Espera antes de volver a entrar.'});
   const validCode=equal(digest(body.code||''),digest(process.env.CREATOR_CODE||'fervdp11_'));
   const hash=await derive(String(body.password||'').slice(0,256),this.credentials.salt,64);
   if(!equal(hash,Buffer.from(this.credentials.hash,'hex'))||!validCode)return response(401,{error:'Código o contraseña incorrectos.'});
   const token=randomBytes(32).toString('base64url');if(this.sessions.size>=20)this.sessions.delete(this.sessions.keys().next().value);
   this.sessions.set(digest(token).toString('hex'),{until:now+3600000});
   const secure=req.socket.encrypted||String(req.headers['x-forwarded-proto']||'').split(',')[0]==='https';
   return response(200,{ok:true},{'Set-Cookie':`pucela_admin=${token}; HttpOnly; SameSite=Strict; Path=/api/feedback; Max-Age=3600${secure?'; Secure':''}`});
  }
  const session=this.session(req,now);if(!session)return response(401,{error:'Inicia sesión como creador.'});
  if(route==='/api/feedback/list')return response(200,{messages:[...this.messages].reverse()});
  if(route==='/api/feedback/logout'){this.sessions.delete(session);return response(200,{ok:true},{'Set-Cookie':'pucela_admin=; HttpOnly; SameSite=Strict; Path=/api/feedback; Max-Age=0'});}
  return response(404,{error:'Ruta no encontrada.'});
 }
}
