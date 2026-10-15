import {robotSVG} from './characters.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const megaphone='<svg class="reporter-megaphone" viewBox="0 0 32 30" aria-label="Convocó la reunión"><path d="M3 9h8L27 3v21l-16-6H3Zm6 9 3 10h6l-3-8" fill="#f5bf66" stroke="#253b48" stroke-width="2"/><path d="m28 9 3-2m-3 13 3 2" stroke="#d97d60" stroke-width="2"/></svg>';
export function voteIcons(votes,roster,anonymous){return votes.map((v,i)=>{const voter=roster.find(p=>p.id===v.voter),neutral={color:8,hat:0,skin:1,accessory:0};return `<span class="tally-voter" style="--delay:${v.order*230}ms" title="${esc(anonymous?'Voto anónimo':voter?.name||'Sin conexión')}">${robotSVG({...(anonymous?neutral:voter),alive:true})}</span>`;}).join('');}
export function meetingCards(s,selected,pending=false){
 const m=s.meeting,canVote=m.stage==='voting'&&s.me.alive&&m.myVote===null&&!pending,result=m.stage==='result'?m.result:null;
 return s.roster.map((p,i)=>{const reporter=m.callerId?p.id===m.callerId:p.name===m.caller,imp=s.me.role==='impostor'&&p.role==='impostor',votes=(result?.votes||[]).map((v,order)=>({...v,order})).filter(v=>v.target===p.id);
  return `<button type="button" class="meeting-person ${p.alive?'':'is-dead'} ${p.hasVoted?'has-voted':''} ${selected===p.id?'is-selected':''} ${imp?'known-impostor':''}" data-vote="${esc(p.id)}" style="--card-order:${i}" ${!canVote||!p.alive?'disabled':''} aria-pressed="${selected===p.id}"><span class="meeting-avatar">${robotSVG({...p,alive:true})}${!p.alive?'<i class="dead-cross" aria-label="Muerto">×</i>':''}</span><span class="meeting-player-name">${esc(p.name)}${p.id===s.me.id?'<small>TÚ</small>':''}</span>${reporter?megaphone:''}<span class="voted-stamp">✓ VOTÓ</span><span class="card-votes">${voteIcons(votes,s.roster,!!result?.anonymous)}</span></button>`;
 }).join('');
}
