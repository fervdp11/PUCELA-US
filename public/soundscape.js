// Música y ambiente originales sintetizados. Solo se activan tras un gesto del usuario.
export function createSoundscape(getContext,isEnabled){
 let next=0,step=0,lastMode='',noise=null;
 const beat=[0,0,7,0,3,0,10,7,0,0,7,3,5,3,10,7];
 function note(ctx,freq,at,duration,volume,type='sine'){const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,at);g.gain.setValueAtTime(.00001,at);g.gain.exponentialRampToValueAtTime(Math.max(.00002,volume),at+.012);g.gain.exponentialRampToValueAtTime(.00001,at+duration);o.connect(g);g.connect(ctx.destination);o.start(at);o.stop(at+duration+.03);}
 function hiss(ctx,at,volume){const o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.setValueAtTime(1850,at);o.frequency.exponentialRampToValueAtTime(420,at+.045);g.gain.setValueAtTime(volume,at);g.gain.exponentialRampToValueAtTime(.00001,at+.05);o.connect(g);g.connect(ctx.destination);o.start(at);o.stop(at+.07);}
 function update(state,local,hidden=false){
  const ctx=getContext();if(!ctx||ctx.state!=='running')return;
  const active=isEnabled()&&!hidden&&state?.config.map==='club'&&['game','lobby'].includes(state.phase),mute=['audio','electrical','bell','overload'].includes(state?.sabotage?.kind),mode=active&&!mute?'club':'quiet';
  if(mode!==lastMode){next=ctx.currentTime+.04;step=0;lastMode=mode;}
  if(!noise){const buffer=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate),data=buffer.getChannelData(0);let value=0;for(let i=0;i<data.length;i++){value=(value+(Math.random()*2-1)*.025)/1.025;data[i]=value;}const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=buffer;source.loop=true;filter.type='lowpass';filter.frequency.value=420;gain.gain.value=0;source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);source.start();noise={gain,context:ctx};}
  const technical=state?.phase==='game'&&local&&((local.x<28*56&&local.y>22*56)||(local.x>44*56&&local.y>14*56));noise.gain.gain.setTargetAtTime(active&&technical&&!mute ? .008 : 0,ctx.currentTime,.2);
  if(mode!=='club')return;
  const dist=state.phase==='lobby'?0:Math.min(Math.hypot(local.x-33.5*56,local.y-9.5*56),Math.hypot(local.x-33*56,local.y-29*56)),volume=.006*Math.max(.15,1-dist/950),bpm=116,interval=60/bpm/2;
  if(next<ctx.currentTime-.2)next=ctx.currentTime+.02;
  while(next<ctx.currentTime+.18){const at=next,index=step%16;if(index%2===0){const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.setValueAtTime(115,at);o.frequency.exponentialRampToValueAtTime(40,at+.13);g.gain.setValueAtTime(volume*2.1,at);g.gain.exponentialRampToValueAtTime(.00001,at+.18);o.connect(g);g.connect(ctx.destination);o.start(at);o.stop(at+.2);}else hiss(ctx,at,volume*.8);note(ctx,55*2**(beat[index]/12),at,.17,volume*.75,'triangle');if(index%4===2)note(ctx,220*2**(beat[index]/12),at,.2,volume*.32,'sine');next+=interval;step++;}
 }
 return {update};
}
