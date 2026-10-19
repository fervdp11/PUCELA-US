// Luz original a 116 BPM: respiración suave, sin estroboscopio.
// Gradientes y haces se preparan una vez, no en cada fotograma.
const T=56,TAU=Math.PI*2,COLORS=['#ff587b','#5195ff','#5ee6b1','#a878ff','#f77ed5','#ffcf6c'];
const textures=new Map();
export function lightingFrame(milliseconds,reduced=false){const t=reduced?0:milliseconds/1000;return {t,beat:reduced?.55:.55+.45*Math.sin(t*TAU*116/60),mix:reduced?0:(t/5)%COLORS.length,index:reduced?3:Math.floor(t/5)%COLORS.length};}
function texture(color,beam=false){const key=color+beam;if(textures.has(key))return textures.get(key);if(typeof document==='undefined')return null;const can=document.createElement('canvas');can.width=beam?180:128;can.height=beam?400:128;const q=can.getContext('2d');
 if(beam){const g=q.createLinearGradient(0,0,0,400);g.addColorStop(0,color+'6b');g.addColorStop(.4,color+'27');g.addColorStop(1,color+'00');q.fillStyle=g;q.beginPath();q.moveTo(86,0);q.lineTo(94,0);q.lineTo(180,400);q.lineTo(0,400);q.closePath();q.fill();}
 else{const g=q.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,color+'b0');g.addColorStop(.3,color+'55');g.addColorStop(1,color+'00');q.fillStyle=g;q.fillRect(0,0,128,128);}
 textures.set(key,can);if(typeof createImageBitmap==='function')createImageBitmap(can).then(bitmap=>textures.set(key,bitmap)).catch(()=>{});return can;
}
function glow(c,x,y,r,color,alpha=.15){const image=texture(color);if(!image)return;c.save();c.globalAlpha=alpha;c.drawImage(image,x-r,y-r,r*2,r*2);c.restore();}
function dot(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();}
function floorTexture(w,h,size,index){const key=`floor/${w}/${h}/${size}/${index}`;if(textures.has(key))return textures.get(key);if(typeof document==='undefined')return null;const can=document.createElement('canvas');can.width=Math.ceil(w);can.height=Math.ceil(h);const q=can.getContext('2d');for(let col=0;col*size<w;col++)for(let row=0;row*size<h;row++){q.globalAlpha=.38+.35*(.5+.5*Math.sin(col*.6-row*.45));q.fillStyle=COLORS[(col+row+index)%6];q.fillRect(col*size+3,row*size+3,Math.max(0,Math.min(size-6,w-col*size-3)),Math.max(0,Math.min(size-6,h-row*size-3)));}textures.set(key,can);if(typeof createImageBitmap==='function')createImageBitmap(can).then(bitmap=>textures.set(key,bitmap)).catch(()=>{});return can;}
const layers=new Map();
export function drawLightShow(c,map,time,sabotage,view){
 // Solo la luz se calcula a media resolución. Mapa, muebles, personajes,
 // nombres y colisiones conservan su resolución y su reloj de renderizado.
 if(!view||typeof document==='undefined'){paintLightShow(c,map,time,sabotage,view);return;}
 const factor=.4,w=Math.ceil(view.w+80),h=Math.ceil(view.h+80),key=`${map.id}/${view.cameraId||'world'}/${w}/${h}`;let layer=layers.get(key);
 if(!layer){if(layers.size>8)layers.delete(layers.keys().next().value);layer=document.createElement('canvas');layer.width=Math.ceil(w*factor);layer.height=Math.ceil(h*factor);layers.set(key,layer);}
 const mode=`${sabotage?.kind||''}/${!!view.reduced}`,left=view.x-w/2,top=view.y-h/2;
 // La luz lenta usa su propio reloj de 30 Hz. Los actores siguen dibujándose
 // en cada requestAnimationFrame, sin depender de este presupuesto visual.
 if(layer.lightTime===undefined||time-layer.lightTime>=30||time<layer.lightTime||mode!==layer.lightMode||Math.abs(left-layer.lightLeft)>20||Math.abs(top-layer.lightTop)>20){const q=layer.getContext('2d');q.setTransform(1,0,0,1,0,0);q.clearRect(0,0,layer.width,layer.height);q.setTransform(factor,0,0,factor,-left*factor,-top*factor);paintLightShow(q,map,time,sabotage,view);layer.lightTime=time;layer.lightMode=mode;layer.lightLeft=left;layer.lightTop=top;}
 c.drawImage(layer,layer.lightLeft,layer.lightTop,layer.width/factor,layer.height/factor);
}
function paintLightShow(c,map,time,sabotage,view){
 const reduced=view?.reduced??(typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches),f=lightingFrame(time,reduced),{t,beat,index}=f,dark=['lights','electrical'].includes(sabotage?.kind),quiet=['bell','computers','audio','overload'].includes(sabotage?.kind);
 const near=(x,y,r=100)=>!view||Math.abs(x-view.x)<view.w/2+r&&Math.abs(y-view.y)<view.h/2+r;
 c.save();
 for(const room of map.rooms){const x=room.x*T,y=room.y*T,w=room.w*T,h=room.h*T;if(!near(x+w/2,y+h/2,Math.max(w,h)/2))continue;
  c.save();c.beginPath();if(room.outline)room.outline.forEach(([xx,yy],i)=>i?c.lineTo(xx*T,yy*T):c.moveTo(xx*T,yy*T));else c.rect(x,y,w,h);c.closePath();c.clip();
  const party=['main','secondary','lobby'].includes(room.id),vip=room.id==='vip';
  if(dark){c.fillStyle='#07142563';c.fillRect(x,y,w,h);}else if(party){
   const size=room.id==='main'?39:32,px=x+2.6*T,py=y+3.7*T,pw=w-5.2*T,ph=h-6*T;
   // Las baldosas pertenecen a la pista: no cubren mesas ni rutas laterales.
   const first=floorTexture(pw,ph,size,index),next=floorTexture(pw,ph,size,(index+1)%6),mix=reduced?0:f.mix%1;
   if(first){c.globalAlpha=(reduced?.14:.2+(quiet?0:beat*.12))*(1-mix);c.drawImage(first,px,py);if(!reduced&&next){c.globalAlpha=(.2+(quiet?0:beat*.12))*mix;c.drawImage(next,px,py);}}c.globalAlpha=1;
   // Focos móviles con anticipación lenta; mezcla de dos colores sin salto.
   const amount=reduced?0:room.id==='main'?4:3,blend=f.mix%1;
   for(let k=0;k<amount;k++){
    const xx=x+w*(.17+k*.66/Math.max(1,amount-1)),yy=room.stageEdge==='south'?y+h-1.35*T:y+1.35*T;if(!near(xx,yy,650))continue;
    c.save();c.translate(xx,yy);c.rotate((room.stageEdge==='south'?Math.PI:0)+Math.sin(t*.36+k*1.7)*.52+(k%2?-.2:.2));c.globalAlpha=(quiet?.1:.22+beat*.05)*(1-blend);c.drawImage(texture(COLORS[(index+k)%6],true),-90,0,180,Math.min(600,h*.72));c.globalAlpha=(quiet?.1:.22+beat*.05)*blend;c.drawImage(texture(COLORS[(index+k+1)%6],true),-90,0,180,Math.min(600,h*.72));c.restore();
    c.fillStyle='#203549';c.fillRect(xx-14,yy-9,28,18);dot(c,xx,yy+2,6,COLORS[(index+k)%6]);
   }
   for(let k=0;k<3;k++)glow(c,x+w*(.25+k*.25),y+h*(.4+.1*(k%2)),150,COLORS[(index+k*2)%6],reduced?.06:.1+beat*.035);
   // Bola de espejos: pequeños reflejos que recorren el suelo a baja velocidad.
   if(!reduced&&!quiet)for(let k=0;k<18;k++){const a=k*2.399+t*.12,xx=x+w*.5+Math.cos(a)*(80+k*9),yy=y+h*.5+Math.sin(a)*(.25*h);if(near(xx,yy,4)){c.globalAlpha=.07+.09*(.5+.5*Math.sin(t*.7+k));dot(c,xx,yy,1.7,k%2?'#f9d9ff':'#c7edff');}}c.globalAlpha=1;
  }else if(!dark&&vip){glow(c,x+w*.5,y+h*.4,w*.7,'#aa7dff',reduced?.08:.1+Math.sin(t*.5)*.025);glow(c,x+w*.8,y+h*.8,130,'#ffcf6c',.1);}
  // Molduras bajas: reflejo de neón en la pared, sin letras sobre el suelo.
  if(!dark&&(party||vip)){const col=vip?'#d7af74':COLORS[index];c.save();c.strokeStyle=col;c.globalAlpha=.55;c.lineWidth=3;c.beginPath();c.moveTo(x+T*2,y+12);c.lineTo(x+w-T*2,y+12);c.stroke();c.restore();}
  c.restore();
 }
 for(const a of map.art||[]){const x=(a.x+a.w/2)*T,y=(a.y+a.h/2)*T;if(!near(x,y,150)||dark)continue;
  if(a.kind==='led-screen'||a.kind==='wall-screen'){const w=a.w*T;c.save();c.beginPath();c.rect(a.x*T+5,a.y*T-7,w-10,a.h*T+2);c.clip();for(let k=0;k<18;k++){const hh=6+(quiet?3:(.5+.5*Math.sin(t*(1.4+k%3)+k*.8))*a.h*T*.7);c.fillStyle=COLORS[(index+Math.floor(k/3))%6];c.globalAlpha=.45;c.fillRect(a.x*T+9+k*(w-18)/18,a.y*T+a.h*T-5-hh,(w-23)/21,hh);}c.restore();glow(c,x,y,100,COLORS[index],.07);}
  if(a.kind==='wall-led')glow(c,x,y,65,COLORS[Math.floor(a.hue/60)%6],.075);
 }
 for(const [i,p] of map.props.entries()){
  if(p.kind==='wall')continue;const x=(p.x+p.w*.5)*T,y=(p.y+p.h*.5)*T-(/rack|console|generator/.test(p.kind)?38:17);if(!near(x,y,130))continue;
  if(/rack|console|navdesk|generator|dj-booth|radio|arcade/.test(p.kind)){
   for(let k=0;k<4;k++){const h=quiet?3:4+(Math.sin(t*(2+k*.21)+i+k)*.5+.5)*10;c.fillStyle=dark?'#526c70':k===3?'#ffd074':'#76e5c7';c.fillRect(x-12+k*7,y+7-h,4,h);}
   if(!dark)glow(c,x,y,60,'#5ee6b1',.08);
  }
  if(!dark&&['dj-booth','club-bar','club-sofa'].includes(p.kind)){
   const col=p.kind==='club-bar'?'#f77ed5':COLORS[(index+i)%6];c.save();c.strokeStyle=col;c.lineWidth=2;c.globalAlpha=reduced?.35:.45+.16*beat;c.beginPath();c.moveTo(p.x*T+4,(p.y+p.h)*T-4);c.lineTo((p.x+p.w)*T-4,(p.y+p.h)*T-4);c.stroke();c.restore();glow(c,x,(p.y+p.h)*T,Math.min(140,p.w*T*.7),col,.1);
  }
  if(p.kind==='club-fan'){c.save();c.translate(x,y);c.rotate(t*(dark?.35:1.8));for(let k=0;k<3;k++){c.rotate(TAU/3);c.fillStyle='#92b5b077';c.beginPath();c.ellipse(0,13,7,15,0,0,TAU);c.fill();}dot(c,0,0,6,'#c6d8cc');c.restore();}
  if(p.kind==='club-smoke'&&!dark&&!reduced)for(let k=0;k<3;k++){const life=(t*.12+k/3)%1;glow(c,x+life*75,y-life*27,18+life*48,'#a878ff',.045*(1-life));}
 }
 c.restore();
}
