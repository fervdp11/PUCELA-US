import {robotSVG} from './characters.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const megaphone='<svg class="reporter-megaphone" viewBox="0 0 32 30" aria-label="Convocó la reunión"><path d="M3 9h8L27 3v21l-16-6H3Zm6 9 3 10h6l-3-8" fill="#f5bf66" stroke="#253b48" stroke-width="2"/><path d="m28 9 3-2m-3 13 3 2" stroke="#d97d60" stroke-width="2"/></svg>';
export const VOTE_REVEAL_STEP=180;
const token='<svg viewBox="0 0 40 48" aria-hidden="true"><path d="M10 15H6v19h5m2-29h12q9 0 9 10v23h-6v7h-9v-7h-5v7H6V18q0-13 7-13Z" fill="#555e6b" stroke="#252e3e" stroke-width="3"/><rect x="14" y="11" width="23" height="14" rx="6" fill="#a5b4bf" stroke="#252e3e" stroke-width="3"/><path d="M19 15h11" stroke="#d2dde2" stroke-width="3"/></svg>';
export function voteIcons(count,options={}){count=Array.isArray(count)?count.length:count;return Array.from({length:Math.max(0,Math.min(10,Number(count)||0))},(_,i)=>`<span class="tally-voter" style="--delay:${Math.max(-1000,((options.start||0)+i)*180-(options.elapsed||0))}ms">${token}</span>`).join('');}
export function meetingCards(s,selected,pending=false){
 const m=s.meeting,canVote=m.stage==='voting'&&s.me.alive&&m.myVote===null&&!pending,result=m.stage==='result'?m.result:null;
 return s.roster.map((p,i)=>{const reporter=m.callerId?p.id===m.callerId:p.name===m.caller,imp=s.me.role==='impostor'&&p.role==='impostor',votes=result?.counts?.[p.id]||0,start=s.roster.slice(0,i).reduce((n,q)=>n+(result?.counts?.[q.id]||0),0);
  return `<button type="button" class="meeting-person ${p.alive?'':'is-dead'} ${p.hasVoted?'has-voted':''} ${selected===p.id?'is-selected':''} ${imp?'known-impostor':''}" data-vote="${esc(p.id)}" style="--card-order:${i}" ${!canVote||!p.alive?'disabled':''} aria-pressed="${selected===p.id}"><span class="meeting-avatar">${robotSVG({...p,alive:true})}${!p.alive?'<i class="dead-cross" aria-label="Muerto">×</i>':''}</span><span class="meeting-player-name">${esc(p.name)}${p.id===s.me.id?'<small>TÚ</small>':''}</span>${reporter?megaphone:''}<span class="voted-stamp">✓ VOTÓ</span><span class="card-votes">${result?`<small>${votes} VOTOS</small>`:''}${voteIcons(votes,{start,elapsed:Math.max(0,(s.serverTime||0)-(m.resultAt||s.serverTime||0))})}</span></button>`;
 }).join('');
}

const meetingNodes=new WeakMap();
// Preserve cards and focus when somebody votes. Entry animations run only once.
export function updateMeetingCards(root,s,selected,pending=false){
 let cache=meetingNodes.get(root);if(!cache||cache.id!==s.meeting.id){cache={id:s.meeting.id,nodes:new Map()};meetingNodes.set(root,cache);root.replaceChildren();}
 const m=s.meeting,canVote=m.stage==='voting'&&s.me.alive&&m.myVote===null&&!pending,ids=new Set(s.roster.map(p=>p.id));
 for(const [id,item] of cache.nodes)if(!ids.has(id)){item.node.remove();cache.nodes.delete(id);}
 let start=0;for(const [i,p] of s.roster.entries()){
  const {hasVoted,online,isHost,...identity}=p,sig=JSON.stringify(identity);let item=cache.nodes.get(p.id);
  if(!item||item.sig!==sig){const t=root.ownerDocument.createElement('template');t.innerHTML=meetingCards({...s,roster:[p]},selected,pending);const node=t.content.firstElementChild;if(item)item.node.replaceWith(node);item={node,sig,tally:null};cache.nodes.set(p.id,item);}
  const node=item.node;node.style.setProperty('--card-order',i);node.classList.toggle('has-voted',!!p.hasVoted);node.classList.toggle('is-selected',selected===p.id);node.disabled=!canVote||!p.alive;node.setAttribute('aria-pressed',String(selected===p.id));
  const votes=m.result?.counts?.[p.id]||0,key=m.stage==='result'?`${m.id}/${votes}/${start}`:'empty';if(item.tally!==key){item.tally=key;node.querySelector('.card-votes').innerHTML=m.stage==='result'?`<small>${votes} VOTOS</small>`+voteIcons(votes,{start,elapsed:Math.max(0,s.serverTime-m.resultAt)}):'';}start+=votes;
  if(root.children[i]!==node)root.insertBefore(node,root.children[i]||null);
 }
}
