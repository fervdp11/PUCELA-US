// 15.0 · Sugerencias y bugs. Persistencia en disco (volumen de Northflank),
// protección contra spam y panel privado del creador con autenticación real.
//
// Almacenamiento: un archivo JSON Lines en DATA_DIR (por defecto ./data). En
// Northflank, monta un volumen persistente (por ejemplo en /data) y define
// DATA_DIR=/data: los mensajes sobreviven a reinicios y despliegues.
//
// Panel del creador (dos factores, nada secreto en el cliente):
//  1. El código de creador solo se comprueba en el servidor, contra su hash
//     (CREATOR_CODE_SHA256, o el del código por defecto). El navegador nunca
//     lo recibe ni lo guarda.
//  2. Además hace falta la contraseña de creador: CREATOR_PASSWORD, o una
//     contraseña aleatoria que el servidor genera en el primer arranque, guarda
//     en DATA_DIR/creator-password.txt y muestra una vez en el registro.
//  Con ambos se emite un token firmado (HMAC) que caduca a las 12 h. Los
//  intentos fallidos se limitan por IP y globalmente.
import {createHash,createHmac,randomBytes,timingSafeEqual,scryptSync} from 'node:crypto';
import {mkdirSync,readFileSync,appendFileSync,writeFileSync,existsSync,renameSync,statSync} from 'node:fs';
import path from 'node:path';

// Solo se guarda el hash del código por defecto (nunca el código).
const DEFAULT_CODE='43816e64bc70ff67775949b8b9732c838833ac0f8b44d54ce33ebbb62eb271c5';
const MAX_MESSAGES=3000,MAX_FILE=6*1024*1024,TOKEN_MS=12*3600*1000;
const sha256=v=>createHash('sha256').update(v).digest('hex');
const codeHash=v=>sha256('pucela-creator/1:'+String(v||''));
const safeEqual=(a,b)=>{const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&timingSafeEqual(x,y);};
const clean=(v,max)=>String(v??'').normalize('NFKC').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f‪-‮⁦-⁩]/g,'').replace(/\r\n?/g,'\n').trim().slice(0,max);

export function createFeedback({dir=process.env.DATA_DIR||process.env.PUCELA_DATA_DIR||path.resolve(process.cwd(),'data'),secret='',log=console.log}={}){
 let writable=true;try{mkdirSync(dir,{recursive:true});}catch{writable=false;}
 const file=path.join(dir,'feedback.jsonl');
 const expectedCode=process.env.CREATOR_CODE_SHA256||DEFAULT_CODE;
 // Contraseña de creador: variable de entorno o generada una sola vez (guardada con su hash).
 let passwordCheck;
 if(process.env.CREATOR_PASSWORD){const salt='pucela-pw/env';const h=scryptSync(process.env.CREATOR_PASSWORD,salt,32).toString('hex');passwordCheck=p=>safeEqual(scryptSync(String(p||''),salt,32).toString('hex'),h);}
 else{const pwFile=path.join(dir,'creator-password.txt');let stored=null;try{stored=readFileSync(pwFile,'utf8').trim();}catch{}
  if(!stored){const fresh=randomBytes(9).toString('base64url');const salt=randomBytes(16).toString('hex');stored=`${salt}:${scryptSync(fresh,salt,32).toString('hex')}`;
   try{writeFileSync(pwFile,stored+'\n',{mode:0o600});log(`PUCELA US · Contraseña del panel de creador (guárdala, solo se muestra ahora): ${fresh}\n  Puedes fijar otra con la variable CREATOR_PASSWORD.`);}catch{log(`PUCELA US · Contraseña temporal del panel de creador (sin disco persistente): ${fresh}`);}}
  const [salt,h]=stored.split(':');passwordCheck=p=>!!salt&&!!h&&safeEqual(scryptSync(String(p||''),salt,32).toString('hex'),h);}
 const key=secret||sha256(expectedCode+dir);
 // Mensajes en memoria (los más recientes); el archivo es la fuente persistente.
 let messages=[];
 try{if(existsSync(file)){const lines=readFileSync(file,'utf8').split('\n').filter(Boolean);for(const l of lines.slice(-MAX_MESSAGES)){try{const m=JSON.parse(l);if(m&&m.id&&!m.deleted)messages.push(m);else if(m?.deleted)messages=messages.filter(x=>x.id!==m.id);}catch{}}}}catch{}
 function persist(entry){if(!writable)return;try{appendFileSync(file,JSON.stringify(entry)+'\n');if(statSync(file).size>MAX_FILE)compact();}catch{writable=false;}}
 function compact(){try{const tmp=file+'.tmp';writeFileSync(tmp,messages.slice(-MAX_MESSAGES).map(m=>JSON.stringify(m)).join('\n')+'\n');renameSync(tmp,file);}catch{}}
 // Límites: por IP (3 cada 10 min, 15 al día), global (120 por hora) y duplicados.
 const perIp=new Map(),loginFails=new Map();let globalWindow={start:Date.now(),n:0},globalFails={start:Date.now(),n:0};
 function allow(ip,now){let r=perIp.get(ip);if(!r||now-r.day>86400000)r={day:now,dayN:0,win:now,winN:0,last:''};if(now-r.win>600000){r.win=now;r.winN=0;}perIp.set(ip,r);if(perIp.size>5000)for(const [k,v] of perIp)if(now-v.day>86400000)perIp.delete(k);
  if(now-globalWindow.start>3600000)globalWindow={start:now,n:0};return {r,ok:r.winN<3&&r.dayN<15&&globalWindow.n<120};}
 function token(now){const exp=now+TOKEN_MS,body=`creator.${exp}`;return `${body}.${createHmac('sha256',key).update(body).digest('base64url')}`;}
 function validToken(t,now){if(typeof t!=='string'||t.length>200)return false;const [a,exp,sig]=t.split('.');if(a!=='creator'||!/^\d+$/.test(exp||'')||Number(exp)<now)return false;return safeEqual(sig||'',createHmac('sha256',key).update(`${a}.${exp}`).digest('base64url'));}
 function failGate(ip,now){let f=loginFails.get(ip);if(!f||now-f.start>900000)f={start:now,n:0};loginFails.set(ip,f);if(now-globalFails.start>900000)globalFails={start:now,n:0};return f.n<5&&globalFails.n<40?f:null;}
 return {
  messages:()=>messages,
  async handle(route,body,ip,now=Date.now()){
   if(route==='/api/feedback'){
    if(body.website)return {status:200,body:{ok:true}};// trampa para bots: se ignora en silencio
    const kind=body.kind==='bug'?'bug':'suggestion',text=clean(body.text,1200),name=clean(body.name,24),elapsed=Number(body.elapsed);
    if(text.length<8)return {status:400,body:{error:'Escribe al menos 8 caracteres.'}};
    if(!Number.isFinite(elapsed)||elapsed<2500)return {status:429,body:{error:'Tómate unos segundos antes de enviar.'}};
    if(/(https?:\/\/\S+[\s\S]*){3,}/i.test(text))return {status:400,body:{error:'Demasiados enlaces en el mensaje.'}};
    const {r,ok}=allow(ip,now);if(!ok)return {status:429,body:{error:'Has enviado varios mensajes seguidos. Prueba más tarde.'}};
    const fingerprint=sha256(text.toLowerCase());if(r.last===fingerprint||messages.slice(-50).some(m=>m.fp===fingerprint))return {status:200,body:{ok:true,duplicate:true}};
    r.winN++;r.dayN++;r.last=fingerprint;globalWindow.n++;
    const entry={id:randomBytes(8).toString('hex'),kind,text,name,at:now,ip:sha256('ip:'+ip).slice(0,12),fp:fingerprint,ua:clean(body.ua,120)};
    messages.push(entry);if(messages.length>MAX_MESSAGES)messages=messages.slice(-MAX_MESSAGES);persist(entry);
    return {status:200,body:{ok:true}};
   }
   if(route==='/api/creator/code'){// Solo dice si el código es correcto (sin revelarlo).
    const gate=failGate(ip,now);if(!gate)return {status:429,body:{error:'Demasiados intentos. Espera 15 minutos.'}};
    if(safeEqual(codeHash(body.code),expectedCode))return {status:200,body:{ok:true}};
    gate.n++;globalFails.n++;return {status:403,body:{error:'Código no válido.'}};
   }
   if(route==='/api/creator/login'){
    const gate=failGate(ip,now);if(!gate)return {status:429,body:{error:'Demasiados intentos. Espera 15 minutos.'}};
    if(safeEqual(codeHash(body.code),expectedCode)&&passwordCheck(body.password))return {status:200,body:{token:token(now)}};
    gate.n++;globalFails.n++;return {status:403,body:{error:'Código o contraseña incorrectos.'}};
   }
   if(route==='/api/creator/messages'){if(!validToken(body.token,now))return {status:401,body:{error:'Sesión de creador caducada.'}};
    return {status:200,body:{persistent:writable,total:messages.length,messages:messages.slice(-500).reverse().map(({fp,...m})=>m)}};}
   if(route==='/api/creator/delete'){if(!validToken(body.token,now))return {status:401,body:{error:'Sesión de creador caducada.'}};
    const id=String(body.id||'');const before=messages.length;messages=messages.filter(m=>m.id!==id);if(messages.length!==before)persist({id,deleted:true,at:now});return {status:200,body:{ok:true}};}
   return {status:404,body:{error:'Ruta no encontrada.'}};
  }
 };
}
