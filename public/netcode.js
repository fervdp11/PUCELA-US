// Shared, dependency-free protocol. Rendering, input and transport have separate clocks.
export const INPUT_MS=50,STATE_MS=50,FIXED_STEP=1/60;
export function fixedSteps(remainder,elapsed,step){
 let time=remainder+Math.max(0,Math.min(.25,elapsed));
 while(time+1e-9>=FIXED_STEP){step(FIXED_STEP);time-=FIXED_STEP;}
 return Math.max(0,time);
}
const entities=new Set(['players','roster','teachers','wildlife']);
const fastFields=['x','y','facing','input','motionTime','motionEpoch','alive','floor','vent','transition'];
function packEntity(reference,patch){
 let mask=0;const values=[],extra={...patch.set};delete extra.id;
 fastFields.forEach((key,i)=>{if(Object.hasOwn(extra,key)){mask|=1<<i;values.push(extra[key]);delete extra[key];}});
 return [reference,mask,...values,...(Object.keys(extra).length||patch.remove.length?[{set:extra,remove:patch.remove}]:[])];
}
function unpackEntity(values){
 const patch={set:{},remove:[]},mask=values[1];let at=2;
 fastFields.forEach((key,i)=>{if(mask&(1<<i))patch.set[key]=values[at++];});
 if(values[at]){Object.assign(patch.set,values[at].set);patch.remove=values[at].remove;}
 return patch;
}
const objectCache=o=>new Map(Object.entries(o).filter(([,v])=>v!==undefined).map(([k,v])=>[k,JSON.stringify(v)]));
function changes(old,next,cache){
 const set={},remove=[];
 for(const [k,json] of cache)if(old.get(k)!==json)set[k]=next[k];
 for(const k of old.keys())if(!cache.has(k))remove.push(k);
 return Object.keys(set).length||remove.length?{set,remove}:null;
}
export class StateEncoder{
 constructor(){this.n=0;this.cache=null;this.fullAt=0;}
 reset(){this.cache=null;}
 encode(state){
  const cache=new Map(),set={},remove=[],objects={},lists={};
  for(const [key,value] of Object.entries(state)){
   if(key==='me'){
    const current=objectCache(value);cache.set(key,current);
    if(this.cache){const patch=changes(this.cache.get(key)||new Map(),value,current);if(patch)objects[key]=patch;}
   }else if(entities.has(key)&&Array.isArray(value)){
    const current=new Map(value.map(p=>[p.id,objectCache(p)]));cache.set(key,current);
    if(this.cache){const old=this.cache.get(key)||new Map(),updates=[],remove=[],indices=new Map([...old.keys()].map((id,i)=>[id,i]));
     for(const p of value){const patch=changes(old.get(p.id)||new Map(),p,current.get(p.id));if(patch)updates.push(packEntity(indices.has(p.id)?indices.get(p.id):p.id,patch));}
     for(const id of old.keys())if(!current.has(id))remove.push(id);
     const order=[...current.keys()],reordered=JSON.stringify([...old.keys()])!==JSON.stringify(order);
     if(updates.length||remove.length||reordered)lists[key]={updates,remove,...(reordered?{order}:{})};
    }
   }else {const json=JSON.stringify(value);cache.set(key,json);if(this.cache?.get(key)!==json){if(value!==undefined)set[key]=value;else remove.push(key);}}
  }
  if(this.cache)for(const key of this.cache.keys())if(!cache.has(key))remove.push(key);
  const base=this.n++,full=!this.cache||state.serverTime-this.fullAt>10000;
  this.cache=cache;
  if(full){this.fullAt=state.serverTime;return {t:'state',n:this.n,base:0,state};}
  return {t:'state',n:this.n,base,set,...(remove.length?{remove}:{}),objects,entities:lists};
 }
}
function patchObject(old,patch){const next={...old,...patch.set};for(const k of patch.remove||[])delete next[k];return next;}
export class StateDecoder{
 constructor(){this.n=0;this.state=null;}
 read(message){
  if(message.n<=this.n)return null;
  if(message.state)this.state=message.state;
  else{
   if(!this.state||message.base!==this.n)throw new Error('Missing state baseline');
   const next={...this.state,...message.set};
   for(const key of message.remove||[])delete next[key];
   for(const [key,patch] of Object.entries(message.objects||{}))next[key]=patchObject(next[key],patch);
   for(const [key,patch] of Object.entries(message.entities||{})){
    const previous=next[key]||[],list=new Map(previous.map(p=>[p.id,p]));
    for(const id of patch.remove)list.delete(id);
    for(const values of patch.updates){const id=typeof values[0]==='number'?previous[values[0]].id:values[0];list.set(id,patchObject(list.get(id)||{id},unpackEntity(values)));}
    next[key]=patch.order?patch.order.map(id=>list.get(id)):[...list.values()];
   }
   this.state=next;
  }
  this.n=message.n;return {...this.state};
 }
}
