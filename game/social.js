import {QUICK_PHRASES,quickPlaces,formatQuick} from '../public/quick-chat.js';
export function structuredMessage(room,p,data){
 const spec=QUICK_PHRASES[data?.kind];if(!spec||!Object.hasOwn(QUICK_PHRASES,data.kind))throw new Error('Frase no válida.');
 const target=spec.target?room.players.find(q=>q.id===data.target&&q.alive&&!q.removed&&q.id!==p.id):null;if(spec.target&&!target)throw new Error('Elige otra persona viva.');
 const place=spec.place?quickPlaces(room).find(q=>q.id===data.place):null;if(spec.place&&!place)throw new Error('Elige una sala del mapa y de las plantas activas.');
 return {text:formatQuick(data.kind,p.name,target?.name,place?.name),intent:{kind:data.kind,...(target?{target:target.id}:{}),...(place?{place:place.id,placeName:place.name}:{})}};
}
// Los rasgos y el historial son privados del servidor y duran toda la partida.
export function socialBrain(p){const b=p.brain??={suspicions:{},seenBodies:[],path:[]};if(!b.personality){const n=[...p.id].reduce((a,v)=>((a*31+v.charCodeAt(0))>>>0),17);b.personality={trust:.35+(n%41)/100,prudence:.35+((n>>>5)%51)/100,impulsivity:.2+((n>>>10)%61)/100,susceptibility:.45+((n>>>15)%51)/100};}b.trust??={};b.memory??=[];b.claims??={};b.replies??=[];return b;}
export function meetingUrgency(room){const dead=room.players.filter(p=>!p.removed&&!p.alive).length,total=room.players.filter(p=>!p.removed).length,progress=dead/Math.max(1,total-2),failed=(room.socialHistory||[]).filter(m=>m.expelled&&m.role!=='impostor').length,success=(room.socialHistory||[]).some(m=>m.role==='impostor');return Math.min(1,(progress*.9+failed*.1+(room.socialHistory?.length||0)*.035)*(room.config.botUrgency||1)*(success?.55:1));}
export function botsMayVote(room,now){const m=room.meeting;if(!m||m.stage!=='voting')return false;const humans=room.players.filter(p=>!p.bot&&!p.removed&&p.alive&&now-p.lastSeen<=3500);if(now>=m.voteEnd-10000)return true;if(humans.some(p=>m.votes[p.id]===undefined))return false;return now-(m.lastClaimAt||0)>=1800;}
export function hearStructured(room,p,m){
 if(!m.intent||m.ghost||m.playerId===p.id||room.phase!=='meeting')return;const b=socialBrain(p),i=m.intent,meeting=room.meeting.id,person=b.personality;
 b.replied??={};const replyKey=`${meeting}/${m.playerId}/${i.kind}/${i.target||''}`;b.saidIn??={};const said=b.saidIn[meeting]??=[];const add=(text,quick)=>{if(!b.replied[replyKey]&&b.replies.length<3&&!said.includes(text)&&!b.replies.some(r=>r.text===text)){b.replied[replyKey]=true;said.push(text);b.replies.push({text,quick,replyTo:m.id});}};
 const credibility=b.trust[m.playerId]??person.trust;
 b.memory.push({kind:i.kind,from:m.playerId,target:i.target,place:i.place,at:m.time,meeting});b.memory=b.memory.slice(-80);
 if(['accuse','suspect','saw','nearbody','defend','vote','vented','camera','shielded','caged','contradiction','company'].includes(i.kind)){
  const key=`${meeting}/${m.playerId}/${i.target}`,old=b.claims[key]||0,base={saw:26,accuse:16,suspect:10,nearbody:18,defend:-8,vote:12,vented:22,camera:24,shielded:30,caged:0,contradiction:14,company:-10}[i.kind];
  const mine=ownTarget(room,p),agrees=base>0&&i.target&&i.target===mine;
  if(!old){const hash=[...m.id+p.id].reduce((n,v)=>(n*33+v.charCodeAt(0))>>>0,7),believe=agrees||hash%100<credibility*100;const weight=base*(believe?1:.32)*person.susceptibility;
   b.claims[key]=weight;if(i.target!==p.id&&base>0){b.told??={};const prev=b.told[i.target];if(!prev||prev.weight<weight)b.told[i.target]={from:m.playerId,weight,kind:i.kind};}const current=b.suspicions[i.target]||0;if(current<70)b.suspicions[i.target]=Math.max(0,Math.min(69,current+weight));
   if(!believe&&i.target!==p.id&&base>0&&b.replies.length===0)add('No estoy convencido. ¿Lo viste o solo lo sospechas?',{kind:'evidence',target:m.playerId});
   // Alguien apoya la acusación del propio bot: la mantiene y lo dice, sin pedir pruebas a quien le da la razón.
   if(agrees&&i.target!==p.id){const t=room.players.find(q=>q.id===i.target);if(t)add(pick(n=>([...m.id].length+n)%n,[`Exacto, ${t.name} es mi sospechoso. Voto a ${t.name}.`,`Coincido: yo también voy a votar a ${t.name}.`]),{kind:'vote',target:t.id});}
  }
  if(i.kind==='caged'&&i.target!==p.id){const t=room.players.find(q=>q.id===i.target);add(`Usar la jaula no prueba nada: también la pueden usar los tripulantes${t?`. No voy a votar a ${t.name} solo por eso`:''}.`,{kind:'noevidence'});}
  if(i.target===p.id&&i.kind!=='defend'&&i.kind!=='caged')add(b.lastRoom?`Yo no he sido. Antes de la reunión estaba en ${b.lastRoom}.`:'Yo no he sido. ¿Alguien puede aportar pruebas?',{kind:'deny'});
 }
 if(['deny','noproof'].includes(i.kind)){const key=`${meeting}/denial/${m.playerId}`;if(!b.claims[key]){b.claims[key]=1;const n=b.suspicions[m.playerId]||0;if(n<70)b.suspicions[m.playerId]=Math.max(0,n-3*(.5+credibility));if(b.witness===m.playerId)add('Te vi atacar. Tu negación no cambia lo que vi.',{kind:'saw',target:m.playerId});}}
 if(i.kind==='where'&&i.target===p.id){const place=b.lastPlace;if(place)add(`Estaba en ${b.lastRoom}, recorriendo mis tareas.`,{kind:'alibi',place});else add(b.lastRoom?`Estaba en ${b.lastRoom}.`:'No recuerdo la sala. No quiero inventarme una coartada.',{kind:'nothing'});}
 if(i.kind==='evidence'&&i.target===p.id){const r=evidenceReply(room,p,m.playerId);add(r.text,r.quick);}
 // Si alguien acusa a quien el bot vio con sus propios ojos, lo respalda con su prueba.
 if(['accuse','suspect','vote'].includes(i.kind)&&i.target!==p.id&&p.role==='crew'){const e=strongestEvidence(room,p,i.target);if(e&&STRENGTH[e.kind]>=40){const t=room.players.find(q=>q.id===i.target);add(`Lo confirmo: ${evidenceLine(e,t.name).replace(/^./,c=>c.toLowerCase())}`,{kind:evidenceQuick(e),target:i.target});}}
 // Si acusan a alguien con quien estuvo mucho rato, lo defiende.
 if(['accuse','suspect','vote','vented','nearbody'].includes(i.kind)&&p.role==='crew'&&i.target!==p.id&&i.target!==ownTarget(room,p)&&(b.company?.[i.target]||0)>=18000&&!strongestEvidence(room,p,i.target)){const t=room.players.find(q=>q.id===i.target);add(`Estuve con ${t.name} durante bastante tiempo. No me cuadra.`,{kind:'company',target:i.target});}
 if(i.kind==='alibi'){
  b.alibis??={};const previous=b.alibis[m.playerId],known=b.observedRooms?.[m.playerId];
  const solid=v=>v&&!String(v).includes(':~'),contradiction=solid(i.place)&&(known&&solid(known.place)&&known.place!==i.place&&room.meeting.introAt-known.at<5000||previous?.meeting===meeting&&solid(previous.place)&&previous.place!==i.place);
  b.alibis[m.playerId]={place:i.place,meeting};
  if(contradiction){b.evidence??=[];b.evidence.push({kind:'contradiction',target:m.playerId,at:room.meeting.introAt,src:'seen'});b.suspicions[m.playerId]=Math.max(b.suspicions[m.playerId]||0,Math.min(69,(b.suspicions[m.playerId]||0)+12));b.trust[m.playerId]=Math.max(.15,credibility-.2);add(known?`Te vi en ${known.name} justo antes de reunirnos. Tu coartada no coincide con lo que vi.`:'Has cambiado tu coartada en esta reunión. No coincide con tu primera ubicación.');}
 }
 if(i.kind==='with'&&i.target===p.id){const seen=b.observedRooms?.[m.playerId];if(seen&&room.meeting.introAt-seen.at<8000&&seen.place===b.lastPlace){b.trust[m.playerId]=Math.min(.95,credibility+.12);const current=b.suspicions[m.playerId]||0;if(current<70)b.suspicions[m.playerId]=Math.max(0,current-10);add('Sí, te vi conmigo poco antes de la reunión.',{kind:'defend',target:m.playerId});}else if(seen&&room.meeting.introAt-seen.at<5000&&seen.place!==b.lastPlace){b.trust[m.playerId]=Math.max(.15,credibility-.2);add('No estabas conmigo justo antes de reunirnos. Te vi en otra zona.');}else add('No puedo confirmar esa coartada. No te vi conmigo.');}
 if(i.kind==='skip'&&!b.skipResponse){const mine=ownTarget(room,p),t=mine&&room.players.find(q=>q.id===mine);
  if(criticalVote(room)){b.skipResponse=meeting;add(`No podemos saltarnos la votación: ${criticalLine(room)} Si nadie sale, perdemos.${t?` Yo voto a ${t.name}.`:''}`,t?{kind:'vote',target:t.id}:null);}
  else if(t){b.skipResponse=meeting;add(`Yo no voto SKIP: sigo sospechando de ${t.name}.`,{kind:'vote',target:t.id});}
  else if(!Object.values(b.suspicions).some(n=>n>=40)){b.preferSkip=true;b.skipResponse=meeting;add('De acuerdo: sin pruebas, prefiero SKIP.');}}
 reconsider(room,p,m);
 const keys=Object.keys(b.claims);if(keys.length>240)for(const key of keys.slice(0,80))delete b.claims[key];
}
export function criticalVote(room){const living=room.players.filter(q=>q.alive&&!q.removed).length,confirmed=(room.socialHistory||[]).filter(m=>m.role==='impostor').length,possible=Math.max(0,(room.config.impostors||1)-confirmed);return possible>0&&living<=possible*2+1;}
export function nearCritical(room){const living=room.players.filter(q=>q.alive&&!q.removed).length,confirmed=(room.socialHistory||[]).filter(m=>m.role==='impostor').length,possible=Math.max(0,(room.config.impostors||1)-confirmed);return possible>0&&living<=possible*2+2;}
// ------------------------------------------------- intención de voto
// Cada bot fija UNA intención por reunión (persona o SKIP). Lo que dice en el
// chat y lo que vota salen de ella; solo cambia con un motivo concreto que el
// bot anuncia (una prueba nueva, una defensa creíble, situación crítica).
const livingCount=room=>room.players.filter(q=>q.alive&&!q.removed).length;
export function criticalLine(room){const living=livingCount(room),confirmed=(room.socialHistory||[]).filter(m=>m.role==='impostor').length,left=Math.max(1,(room.config.impostors||1)-confirmed);return `somos ${living} y ${left===1?'queda un impostor':`quedan ${left} impostores`}.`;}
function ownTarget(room,p){const b=socialBrain(p),meeting=room.meeting?.id;const t=b.intent?.meeting===meeting&&b.intent.target!=='skip'?b.intent.target:(p.role==='impostor'&&b.accused?b.accused:null);return t&&alive(room,t)?t:null;}
export function botIntent(room,p,random){const b=socialBrain(p),meeting=room.meeting?.id;
 if(b.intent?.meeting===meeting&&(b.intent.target==='skip'||alive(room,b.intent.target))){if(b.intent.target==='skip'&&(criticalVote(room)&&p.role==='crew'||p.role==='impostor'&&criticalVote(room)))b.intent={meeting,target:botVote(room,p,random),why:'critical'};return b.intent.target;}
 b.intent={meeting,target:botVote(room,p,random),why:'initial'};return b.intent.target;}
function reconsider(room,p,m){const b=socialBrain(p),meeting=room.meeting?.id;if(!b.intent||b.intent.meeting!==meeting||p.role==='impostor')return;
 const cur=b.intent.target,critical=criticalVote(room),speaker=room.players.find(q=>q.id===m.playerId),who=speaker?.name||'alguien';
 const ranked=room.players.filter(q=>q.alive&&!q.removed&&q.id!==p.id).map(q=>({q,n:b.suspicions[q.id]||0})).sort((a,c)=>c.n-a.n),best=ranked[0];if(!best)return;
 const say=(text,quick)=>{if(!b.spoke)return;b.saidIn??={};const said=b.saidIn[meeting]??=[];if(b.replies.length<3&&!said.includes(text)){said.push(text);b.replies.push({text,quick,replyTo:m.id});}};
 const own=cur!=='skip'&&strongestEvidence(room,p,cur);
 if(best.n>=70&&best.q.id!==cur&&!(own&&STRENGTH[own.kind]>=90)){b.intent={meeting,target:best.q.id,why:m.id};say(`Con lo que ha contado ${who}, cambio mi voto: ahora voto a ${best.q.name}.`,{kind:'vote',target:best.q.id});return;}
 if(cur==='skip'&&!critical&&best.n>=48&&m.intent?.target===best.q.id){b.intent={meeting,target:best.q.id,why:m.id};say(`Después de lo que ha dicho ${who}, ya no voto SKIP: voto a ${best.q.name}.`,{kind:'vote',target:best.q.id});return;}
 if(cur!=='skip'&&!own&&(b.suspicions[cur]||0)<12&&['defend','company','with','alibi'].includes(m.intent?.kind)&&m.intent?.target===cur||cur!=='skip'&&!own&&(b.suspicions[cur]||0)<12&&m.intent?.kind==='alibi'&&m.playerId===cur){const t=room.players.find(q=>q.id===cur),next=ranked.find(r=>r.q.id!==cur);
  if(critical&&next){b.intent={meeting,target:next.q.id,why:m.id};say(`Lo que dice ${who} me convence sobre ${t.name}. Como tenemos que expulsar a alguien, ahora voto a ${next.q.name}.`,{kind:'vote',target:next.q.id});}
  else if(!critical){b.intent={meeting,target:'skip',why:m.id};say(`Lo que dice ${who} me convence: retiro mi voto contra ${t.name}. De momento, SKIP.`,{kind:'skip'});}}
}
export function botVote(room,p,random){const b=socialBrain(p),urgency=meetingUrgency(room),person=b.personality,candidates=room.players.filter(q=>q.alive&&!q.removed&&q.id!==p.id&&(p.role!=='impostor'||q.role!=='impostor')),ranked=candidates.map(q=>({q,n:b.suspicions[q.id]||0})).sort((a,b)=>b.n-a.n);if(!ranked.length)return 'skip';
 if(p.role==='impostor'){const accused=b.accused&&candidates.find(q=>q.id===b.accused);if(accused)return accused.id;const pressure=ranked.filter(q=>q.n>=10);return criticalVote(room)||random(100)<50+urgency*35?(pressure[0]?.q||candidates[random(candidates.length)]).id:'skip';}
 const best=ranked[0];if(best.n>=70)return best.q.id;if(criticalVote(room)){const weights=ranked.map(({q,n})=>Math.max(1,3+n*.3-((b.trust[q.id]??.5)-.5)*3)*((b.company?.[q.id]||0)>=18000&&n<40?.3:1)),sum=weights.reduce((a,c)=>a+c,0);let ticket=random(1000000)/1000000*sum;for(let i=0;i<ranked.length;i++){ticket-=weights[i];if(ticket<=0)return ranked[i].q.id;}return ranked.at(-1).q.id;}
 // A un paso de la situación crítica, omitir es casi tan peligroso como fallar.
 const near=nearCritical(room),threshold=35+person.prudence*16-urgency*23-(near?14:0),probability=.22+person.impulsivity*.3+urgency*.4+(near?.25:0);
 if(best.n>=threshold&&random(100)<probability*100)return best.q.id;
 // Sin indicios no se inventan pruebas; la urgencia aumenta el riesgo solo
 // entre personas que el bot ya considera sospechosas.
 if(urgency>.5&&best.n>8&&random(100)<urgency*person.impulsivity*60)return best.q.id;
 return 'skip';
}

// ------------------------------------------------------------- pruebas
// Cada bot guarda lo que ha presenciado él mismo (visto directamente o por
// cámara), separado de lo que le han contado en las reuniones. Solo dura la
// partida actual: el cerebro se crea de nuevo al empezar cada partida.
// La jaula NO es una prueba: también la usan los tripulantes (para retener a un sospechoso).
const STRENGTH={kill:100,shield:100,shieldSeen:90,vent:60,nearbody:40,contradiction:30};
export function noteEvidence(p,e){const b=socialBrain(p);b.evidence??=[];if(b.evidence.some(x=>x.kind===e.kind&&x.target===e.target&&Math.abs(x.at-e.at)<8000))return;b.evidence.push(e);if(b.evidence.length>40)b.evidence.shift();
 const add={kill:100,shield:100,shieldSeen:85,vent:30,nearbody:22,contradiction:12}[e.kind]||0;if(add)b.suspicions[e.target]=Math.min(100,(b.suspicions[e.target]||0)+add);
 if(e.kind==='kill'||e.kind==='shield'||e.kind==='shieldSeen'){b.witness=e.target;b.witnessName=e.name;}}
const alive=(room,id)=>room.players.find(q=>q.id===id&&q.alive&&!q.removed);
// La prueba más fuerte que el bot tiene contra alguien vivo.
export function strongestEvidence(room,p,target){const b=socialBrain(p);return (b.evidence||[]).filter(e=>alive(room,e.target)&&(!target||e.target===target)&&STRENGTH[e.kind]).sort((a,c)=>STRENGTH[c.kind]-STRENGTH[a.kind]||c.at-a.at)[0]||null;}
const where=e=>e.place?` en ${e.place}`:'';
export function evidenceLine(e,name){const cam=e.src==='camera';switch(e.kind){
 case 'kill':return cam?`Vi a ${name} matar por las cámaras${where(e)}.`:`Vi a ${name} matar${where(e)} y escapar.`;
 case 'shield':return `${name} me ha intentado matar, pero llevaba el escudo.`;
 case 'shieldSeen':return `Vi a ${name} intentar matar a alguien que llevaba escudo.`;
 case 'vent':return cam?`Vi a ${name} meterse en un conducto por las cámaras${where(e)}.`:`Vi a ${name} salir de un conducto${where(e)}.`;
 case 'nearbody':return cam?`Vi a ${name} junto al cadáver por las cámaras${where(e)}.`:`Vi a ${name} cerca del cadáver${where(e)}.`;
 case 'cage':return `Vi que ${name} utilizó una jaula${where(e)}.`;
 case 'contradiction':return `La coartada de ${name} no coincide con lo que vi.`;
 default:return `Tengo dudas sobre ${name}.`;}}
export function evidenceQuick(e){return {kill:e.src==='camera'?'camera':'saw',shield:'shielded',shieldSeen:'saw',vent:e.src==='camera'?'camera':'vented',nearbody:'nearbody',cage:'caged',contradiction:'contradiction'}[e.kind]||'suspect';}
// Lo que un bot dice por iniciativa propia al abrirse la discusión.
export function botStatement(room,p,random,intent){const b=socialBrain(p),others=room.players.filter(q=>q.alive&&!q.removed&&q.id!==p.id),critical=criticalVote(room);
 if(p.role==='impostor'){
  // Si ya tiene decidido a quién votar, la mentira va contra esa persona; en situación crítica siempre acusa.
  if(intent&&intent!=='skip'&&alive(room,intent)&&!b.lies?.[intent]){b.lies??={};const t=alive(room,intent);b.lies[t.id]={kind:['nearbody','vent'][random(2)],src:random(100)<25?'camera':'seen',place:b.lastRoom,target:t.id,at:Date.now()};}
  if(critical&&!Object.keys(b.lies||{}).some(id=>alive(room,id))){b.lies??={};const crew=others.filter(q=>q.role!=='impostor').sort((a,c)=>(b.suspicions[c.id]||0)-(b.suspicions[a.id]||0));const t=crew[0];if(t)b.lies[t.id]={kind:['nearbody','vent'][random(2)],src:'seen',place:b.lastRoom,target:t.id,at:Date.now()};}
  // El impostor puede mentir: se inventa una prueba concreta y la mantiene.
  const crew=others.filter(q=>q.role!=='impostor').sort((a,c)=>(b.suspicions[c.id]||0)-(b.suspicions[a.id]||0));
  b.lies??={};const already=Object.keys(b.lies).find(id=>alive(room,id));
  if((already||crew.length)&&(critical||intent&&intent!=='skip'||random(100)<(already?80:52))){const t=already?alive(room,already):crew[random(Math.min(2,crew.length))];const lie=b.lies[t.id]??={kind:['nearbody','vent','nearbody','vent'][random(4)],src:random(100)<25?'camera':'seen',place:b.lastRoom,target:t.id,at:Date.now()};b.accused=t.id;const tail=critical?` ${criticalLine(room).replace(/^./,c=>c.toUpperCase())} Hay que expulsar a alguien: voto a ${t.name}.`:'';return {text:evidenceLine(lie,t.name)+tail,quick:{kind:evidenceQuick(lie),target:t.id}};}
  return pick(random,[{text:'Estaba haciendo tareas. No tengo pruebas suficientes.',quick:{kind:'noevidence'}},{text:b.lastRoom?`Yo estaba en ${b.lastRoom}. No vi nada raro.`:'No vi nada raro.',quick:{kind:'nothing'}}]);
 }
 const e=strongestEvidence(room,p);
 if(intent!==undefined){
  // Lo que dice corresponde a su intención de voto.
  const T=intent!=='skip'&&alive(room,intent),head=critical?`${criticalLine(room).replace(/^./,c=>c.toUpperCase())} Si nos saltamos la votación, perdemos. `:'';
  if(T){b.accused=T.id;const own=strongestEvidence(room,p,T.id),told=b.told?.[T.id],from=told&&room.players.find(q=>q.id===told.from);
   if(own)return {text:head+evidenceLine(own,T.name)+(critical||STRENGTH[own.kind]<70?` Voto a ${T.name}.`:''),quick:{kind:evidenceQuick(own),target:T.id}};
   if(told&&from)return {text:`${head}Yo no lo vi, pero ${from.name} dice que ${T.name} es sospechoso. Voto a ${T.name}.`,quick:{kind:'suspect',target:T.id}};
   return {text:critical?`${head}Mi sospechoso es ${T.name}: es quien menos me cuadra. Voto a ${T.name}.`:`Sospecho de ${T.name}. Voto a ${T.name}.`,quick:{kind:'suspect',target:T.id}};}
  if(e){const t=alive(room,e.target);return {text:`${evidenceLine(e,t.name)} Pero eso solo no basta para expulsar: de momento, SKIP.`,quick:{kind:evidenceQuick(e),target:t.id}};}
 }
 if(e){const t=alive(room,e.target);b.accused=t.id;return {text:evidenceLine(e,t.name),quick:{kind:evidenceQuick(e),target:t.id}};}
 // Sin pruebas propias: lo que le han contado, dicho como tal.
 const told=Object.entries(b.told||{}).filter(([id])=>alive(room,id)).sort((a,c)=>c[1].weight-a[1].weight)[0];
 if(told&&told[1].weight>=14){const t=alive(room,told[0]),from=room.players.find(q=>q.id===told[1].from);return {text:`Yo no lo vi, pero ${from?.name||'alguien'} dice que ${t.name} es sospechoso. Necesito más pruebas.`,quick:{kind:'suspect',target:t.id}};}
 const friend=bestCompany(room,p);if(friend&&random(100)<55){return {text:`Estuve con ${friend.name} durante bastante tiempo. Por esa persona respondo.`,quick:{kind:'company',target:friend.id}};}
 return pick(random,[{text:'No tengo pruebas suficientes. Prefiero no acusar a nadie todavía.',quick:{kind:'noevidence'}},{text:b.lastRoom?`Estaba en ${b.lastRoom}, haciendo tareas. No vi nada sospechoso.`:'Estaba haciendo tareas. No vi nada sospechoso.',quick:{kind:'nothing'}}]);
}
function pick(random,list){return list[random(list.length)];}
export function bestCompany(room,p){const b=socialBrain(p);const best=Object.entries(b.company||{}).filter(([id,ms])=>ms>=18000&&alive(room,id)).sort((a,c)=>c[1]-a[1])[0];return best?alive(room,best[0]):null;}
// Respuesta concreta a «¿Qué pruebas tienes?». Separa lo visto de lo contado.
export function evidenceReply(room,p,asker){const b=socialBrain(p);
 if(p.role==='impostor'){const id=b.accused,lie=id&&b.lies?.[id],t=id&&alive(room,id);if(lie&&t)return {text:`${evidenceLine(lie,t.name)} Lo vi yo, no me lo han contado.`,quick:{kind:evidenceQuick(lie),target:t.id}};return {text:'No tengo pruebas suficientes, solo una impresión.',quick:{kind:'noevidence'}};}
 const e=strongestEvidence(room,p,b.accused)||strongestEvidence(room,p);
 if(e){const t=alive(room,e.target),list=(b.evidence||[]).filter(x=>x.target===e.target&&x!==e&&STRENGTH[x.kind]).slice(-1);const extra=list.length?' Además, '+evidenceLine(list[0],t.name).replace(/^./,c=>c.toLowerCase()):'';return {text:`Lo vi yo mismo: ${evidenceLine(e,t.name).replace(/^./,c=>c.toLowerCase())}${extra}`,quick:{kind:evidenceQuick(e),target:t.id}};}
 const told=b.accused&&b.told?.[b.accused],t=b.accused&&alive(room,b.accused);
 if(told&&t){const from=room.players.find(q=>q.id===told.from);return {text:`No lo vi yo: me lo contó ${from?.name||'otra persona'}. Es una sospecha, no una prueba.`,quick:{kind:'noevidence'}};}
 return {text:'No tengo pruebas suficientes. Solo son sospechas.',quick:{kind:'noevidence'}};
}
