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
 b.replied??={};const replyKey=`${meeting}/${m.playerId}/${i.kind}/${i.target||''}`;const add=(text,quick)=>{if(!b.replied[replyKey]&&b.replies.length<3){b.replied[replyKey]=true;b.replies.push({text,quick,replyTo:m.id});}};
 const credibility=b.trust[m.playerId]??person.trust;
 b.memory.push({kind:i.kind,from:m.playerId,target:i.target,place:i.place,at:m.time,meeting});b.memory=b.memory.slice(-80);
 if(['accuse','suspect','saw','nearbody','defend','vote'].includes(i.kind)){
  const key=`${meeting}/${m.playerId}/${i.target}`,old=b.claims[key]||0,base={saw:26,accuse:16,suspect:10,nearbody:18,defend:-8,vote:12}[i.kind];
  if(!old){const hash=[...m.id+p.id].reduce((n,v)=>(n*33+v.charCodeAt(0))>>>0,7),believe=hash%100<credibility*100;const weight=base*(believe?1:.32)*person.susceptibility;
   b.claims[key]=weight;const current=b.suspicions[i.target]||0;if(current<70)b.suspicions[i.target]=Math.max(0,Math.min(69,current+weight));
   if(!believe&&i.target!==p.id&&base>0&&b.replies.length===0)add('No estoy convencido. ¿Lo viste o solo lo sospechas?',{kind:'evidence',target:m.playerId});
  }
  if(i.target===p.id&&i.kind!=='defend')add(b.lastRoom?`Yo no he sido. Antes de la reunión estaba en ${b.lastRoom}.`:'Yo no he sido. ¿Alguien puede aportar pruebas?',{kind:'deny'});
 }
 if(['deny','noproof'].includes(i.kind)){const key=`${meeting}/denial/${m.playerId}`;if(!b.claims[key]){b.claims[key]=1;const n=b.suspicions[m.playerId]||0;if(n<70)b.suspicions[m.playerId]=Math.max(0,n-3*(.5+credibility));if(b.witness===m.playerId)add('Te vi atacar. Tu negación no cambia lo que vi.',{kind:'saw',target:m.playerId});}}
 if(i.kind==='where'&&i.target===p.id){const place=b.lastPlace;if(place)add(`Estaba en ${b.lastRoom}, recorriendo mis tareas.`,{kind:'alibi',place});else add(b.lastRoom?`Estaba en ${b.lastRoom}.`:'No recuerdo la sala. No quiero inventarme una coartada.',{kind:'nothing'});}
 if(i.kind==='evidence'&&i.target===p.id){if(b.witnessName)add(`Vi a ${b.witnessName} atacar.`,{kind:'saw',target:b.witness});else add('No vi el ataque. Solo tengo sospechas, no pruebas.',{kind:'nothing'});}
 if(i.kind==='alibi'){
  b.alibis??={};const previous=b.alibis[m.playerId],known=b.observedRooms?.[m.playerId];
  const contradiction=known&&known.place!==i.place&&room.meeting.introAt-known.at<5000||previous?.meeting===meeting&&previous.place!==i.place;
  b.alibis[m.playerId]={place:i.place,meeting};
  if(contradiction){b.suspicions[m.playerId]=Math.max(b.suspicions[m.playerId]||0,Math.min(69,(b.suspicions[m.playerId]||0)+12));b.trust[m.playerId]=Math.max(.15,credibility-.2);add(known?`Te vi en ${known.name} justo antes de reunirnos. Tu coartada no coincide con lo que vi.`:'Has cambiado tu coartada en esta reunión. No coincide con tu primera ubicación.');}
 }
 if(i.kind==='with'&&i.target===p.id){const seen=b.observedRooms?.[m.playerId];if(seen&&room.meeting.introAt-seen.at<8000&&seen.place===b.lastPlace){b.trust[m.playerId]=Math.min(.95,credibility+.12);const current=b.suspicions[m.playerId]||0;if(current<70)b.suspicions[m.playerId]=Math.max(0,current-10);add('Sí, te vi conmigo poco antes de la reunión.',{kind:'defend',target:m.playerId});}else if(seen&&room.meeting.introAt-seen.at<5000&&seen.place!==b.lastPlace){b.trust[m.playerId]=Math.max(.15,credibility-.2);add('No estabas conmigo justo antes de reunirnos. Te vi en otra zona.');}else add('No puedo confirmar esa coartada. No te vi conmigo.');}
 if(i.kind==='skip'&&!Object.values(b.suspicions).some(n=>n>=40)){b.preferSkip=true;if(!b.skipResponse){b.skipResponse=meeting;add('De acuerdo: sin pruebas, prefiero SKIP.');}}
 const keys=Object.keys(b.claims);if(keys.length>240)for(const key of keys.slice(0,80))delete b.claims[key];
}
export function criticalVote(room){const living=room.players.filter(q=>q.alive&&!q.removed).length,confirmed=(room.socialHistory||[]).filter(m=>m.role==='impostor').length,possible=Math.max(0,(room.config.impostors||1)-confirmed);return possible>0&&living<=possible*2+1;}
export function botVote(room,p,random){const b=socialBrain(p),urgency=meetingUrgency(room),person=b.personality,candidates=room.players.filter(q=>q.alive&&!q.removed&&q.id!==p.id&&(p.role!=='impostor'||q.role!=='impostor')),ranked=candidates.map(q=>({q,n:b.suspicions[q.id]||0})).sort((a,b)=>b.n-a.n);if(!ranked.length)return 'skip';
 if(p.role==='impostor'){const pressure=ranked.filter(q=>q.n>=10);return random(100)<50+urgency*35?(pressure[0]?.q||candidates[random(candidates.length)]).id:'skip';}
 const best=ranked[0];if(best.n>=70)return best.q.id;if(criticalVote(room)){const weights=ranked.map(({q,n})=>Math.max(1,3+n*.3-((b.trust[q.id]??.5)-.5)*3)),sum=weights.reduce((a,c)=>a+c,0);let ticket=random(1000000)/1000000*sum;for(let i=0;i<ranked.length;i++){ticket-=weights[i];if(ticket<=0)return ranked[i].q.id;}return ranked.at(-1).q.id;}
 const threshold=35+person.prudence*16-urgency*23,probability=.22+person.impulsivity*.3+urgency*.4;
 if(best.n>=threshold&&random(100)<probability*100)return best.q.id;
 // Sin indicios no se inventan pruebas; la urgencia aumenta el riesgo solo
 // entre personas que el bot ya considera sospechosas.
 if(urgency>.5&&best.n>8&&random(100)<urgency*person.impulsivity*60)return best.q.id;
 return 'skip';
}
