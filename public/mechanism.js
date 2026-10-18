// Taller de instrumentos de PUCELA US.
//
// Cada misión es una máquina física dibujada sobre un lienzo de coordenadas
// lógicas constantes. El lienzo resuelve de una vez tres problemas: el acabado
// (gradientes, biseles, sombras y reflejos sin coste de DOM), el encaje en
// pantalla (una sola transformación conserva la proporción y nunca recorta un
// control) y el tacto (el puntero se traduce al mismo sistema lógico en ratón y
// en dedo, con varios dedos a la vez).
//
// No hay ningún control nativo del navegador: ni deslizadores, ni barras de
// progreso, ni listas. Todo lo que se toca es geometría con su propia pieza.

const PALETTE={
 steel:['#9fb0b6','#73878f','#4c5f69'],
 dark:['#3d5260','#2a3b47','#16222c'],
 brass:['#e3c184','#bb9354','#7d6032'],
 copper:['#e0a07c','#b4714f','#74452d'],
 plastic:['#5f7b86','#3f5764','#243643'],
 rubber:['#3a4450','#262e38','#161b22'],
 board:['#4d7a63','#356049','#1f3b2c'],
 glass:['#1a3540','#0e2430','#061520'],
 warn:['#f0c36a','#cd9436','#8a6016'],
 ok:['#8fe6c2','#49b98d','#1f6b50'],
 bad:['#f49a9a','#d1575c','#8a2b31']
};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const TAU=Math.PI*2;

// Los gradientes se reutilizan: crearlos en cada fotograma domina el coste de
// dibujo en los móviles modestos a los que apunta este juego.
class Paint{
 constructor(ctx){this.ctx=ctx;this.cache=new Map();}
 // Un valor no finito revienta createGradient y se lleva por delante el
 // fotograma entero. Antes de llegar ahí se sustituye por el color de base.
 linear(x0,y0,x1,y1,stops){
  if(!(Number.isFinite(x0)&&Number.isFinite(y0)&&Number.isFinite(x1)&&Number.isFinite(y1)))return stops[0].slice(stops[0].indexOf(':')+1);
  const key=`l${x0|0},${y0|0},${x1|0},${y1|0},${stops.join('|')}`;let g=this.cache.get(key);
  if(!g){g=this.ctx.createLinearGradient(x0,y0,x1,y1);for(const s of stops){const i=s.indexOf(':');g.addColorStop(Number(s.slice(0,i)),s.slice(i+1));}this.cache.set(key,g);}
  return g;}
 radial(x,y,r0,r1,stops){
  if(!(Number.isFinite(x)&&Number.isFinite(y)&&Number.isFinite(r0)&&Number.isFinite(r1)))return stops[0].slice(stops[0].indexOf(':')+1);
  const key=`r${x|0},${y|0},${r0|0},${r1|0},${stops.join('|')}`;let g=this.cache.get(key);
  if(!g){g=this.ctx.createRadialGradient(x,y,Math.max(0,r0),x,y,Math.max(.01,r1));for(const s of stops){const i=s.indexOf(':');g.addColorStop(Number(s.slice(0,i)),s.slice(i+1));}this.cache.set(key,g);}
  return g;}
 clear(){if(this.cache.size>420)this.cache.clear();}
}

function roundRect(ctx,x,y,w,h,r){
 r=Math.min(r,Math.abs(w)/2,Math.abs(h)/2);ctx.beginPath();
 if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);
 else{ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
}

// Caja de herramientas de dibujo. Las piezas comparten una misma dirección de
// luz (arriba a la izquierda) para que el conjunto se lea como un solo objeto.
export class Hardware{
 constructor(ctx,{reduced=false}={}){this.ctx=ctx;this.paint=new Paint(ctx);this.reduced=reduced;}

 shadow(blur,y=3,alpha=.4){const c=this.ctx;if(this.reduced){c.shadowColor='transparent';c.shadowBlur=0;c.shadowOffsetY=0;return;}c.shadowColor=`rgba(4,10,16,${alpha})`;c.shadowBlur=blur;c.shadowOffsetY=y;}
 noShadow(){const c=this.ctx;c.shadowColor='transparent';c.shadowBlur=0;c.shadowOffsetY=0;}

 // Panel con bisel: cuerpo, luz superior, sombra interior y canto inferior.
 plate(x,y,w,h,{material='plastic',r=10,depth=5,light=.5,stroke=null}={}){
  const c=this.ctx,[hi,mid,lo]=PALETTE[material]||PALETTE.plastic;
  this.shadow(depth*2.2,depth,.42);
  roundRect(c,x,y+depth,w,h,r);c.fillStyle=lo;c.fill();
  this.noShadow();
  roundRect(c,x,y,w,h,r);c.fillStyle=this.paint.linear(x,y,x,y+h,[`0:${hi}`,`${clamp(light,.1,.9)}:${mid}`,`1:${lo}`]);c.fill();
  c.save();roundRect(c,x,y,w,h,r);c.clip();
  c.strokeStyle='rgba(255,255,255,.26)';c.lineWidth=2;roundRect(c,x+1,y+1,w-2,h-2,r);c.stroke();
  c.strokeStyle='rgba(6,14,20,.42)';c.lineWidth=3;roundRect(c,x+1,y+3,w-2,h-2,r);c.stroke();
  c.restore();
  if(stroke){c.strokeStyle=stroke;c.lineWidth=2.5;roundRect(c,x,y,w,h,r);c.stroke();}
 }

 // Hueco: lo contrario del panel, la luz entra por abajo.
 recess(x,y,w,h,{r=8,material='glass',inset=3}={}){
  const c=this.ctx,[hi,mid,lo]=PALETTE[material]||PALETTE.glass;
  roundRect(c,x,y,w,h,r);c.fillStyle=this.paint.linear(x,y,x,y+h,[`0:${lo}`,`.7:${mid}`,`1:${hi}`]);c.fill();
  c.save();roundRect(c,x,y,w,h,r);c.clip();
  c.strokeStyle='rgba(4,10,16,.6)';c.lineWidth=inset*2;roundRect(c,x,y,w,h,r);c.stroke();
  c.restore();
  c.strokeStyle='rgba(255,255,255,.16)';c.lineWidth=1.5;roundRect(c,x,y+1.5,w,h,r);c.stroke();
 }

 screw(x,y,r=6,angle=.6){
  const c=this.ctx;
  c.beginPath();c.arc(x,y+1.5,r,0,TAU);c.fillStyle='rgba(4,10,16,.45)';c.fill();
  c.beginPath();c.arc(x,y,r,0,TAU);
  c.fillStyle=this.paint.radial(x-r*.4,y-r*.4,0,r*1.7,['0:#cfdade','.55:#8c9ca3','1:#4e5f68']);c.fill();
  c.strokeStyle='rgba(8,16,22,.6)';c.lineWidth=1.2;c.stroke();
  c.save();c.translate(x,y);c.rotate(angle);
  c.strokeStyle='rgba(10,18,24,.75)';c.lineWidth=Math.max(1.4,r*.26);c.lineCap='round';
  c.beginPath();c.moveTo(-r*.6,0);c.lineTo(r*.6,0);c.stroke();
  c.strokeStyle='rgba(255,255,255,.3)';c.lineWidth=Math.max(.8,r*.14);
  c.beginPath();c.moveTo(-r*.6,-1.2);c.lineTo(r*.6,-1.2);c.stroke();
  c.restore();
 }

 rivet(x,y,r=3.5){const c=this.ctx;c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle=this.paint.radial(x-r*.4,y-r*.4,0,r*1.6,['0:#c3ced3','1:#5b6c75']);c.fill();c.strokeStyle='rgba(8,16,22,.5)';c.lineWidth=1;c.stroke();}

 led(x,y,r,color,on=true,{glow=true}={}){
  const c=this.ctx;
  c.beginPath();c.arc(x,y,r+2.5,0,TAU);c.fillStyle='rgba(6,14,20,.75)';c.fill();
  c.beginPath();c.arc(x,y,r+2.5,0,TAU);c.strokeStyle='rgba(255,255,255,.14)';c.lineWidth=1.2;c.stroke();
  if(on&&glow&&!this.reduced){c.beginPath();c.arc(x,y,r*2.6,0,TAU);c.fillStyle=this.paint.radial(x,y,0,r*2.6,[`0:${color}66`,`1:${color}00`]);c.fill();}
  c.beginPath();c.arc(x,y,r,0,TAU);
  c.fillStyle=on?this.paint.radial(x-r*.3,y-r*.35,0,r*1.6,[`0:#ffffff`,`.45:${color}`,`1:${color}`]):this.paint.radial(x-r*.3,y-r*.35,0,r*1.6,['0:#44545e','1:#1d2831']);
  c.fill();
 }

 // Pantalla: cristal, viñeta, líneas de barrido y un reflejo discreto.
 screen(x,y,w,h,draw,{r=7,tint='#0b2a33',scan=true,time=0}={}){
  const c=this.ctx;
  this.recess(x-4,y-4,w+8,h+8,{r:r+3,material:'dark'});
  roundRect(c,x,y,w,h,r);c.fillStyle=tint;c.fill();
  c.save();roundRect(c,x,y,w,h,r);c.clip();
  if(draw)draw();
  if(scan&&!this.reduced){c.globalAlpha=.09;c.fillStyle='#071318';for(let i=0;i<h;i+=3)c.fillRect(x,y+i,w,1.4);c.globalAlpha=1;}
  if(!this.reduced){
   c.fillStyle=this.paint.radial(x+w/2,y+h/2,Math.min(w,h)*.25,Math.max(w,h)*.78,['0:rgba(0,0,0,0)','1:rgba(2,8,12,.6)']);c.fillRect(x,y,w,h);
   c.save();c.globalAlpha=.1;c.fillStyle='#dff6ff';c.beginPath();
   const sx=x+w*.06+Math.sin(time*.00018)*w*.02;
   c.moveTo(sx,y+h);c.lineTo(sx+w*.22,y);c.lineTo(sx+w*.4,y);c.lineTo(sx+w*.18,y+h);c.closePath();c.fill();c.restore();
  }
  c.restore();
  c.strokeStyle='rgba(255,255,255,.12)';c.lineWidth=1.5;roundRect(c,x,y,w,h,r);c.stroke();
 }

 // Mando giratorio moleteado, con muescas, índice y sombra propia.
 knob(x,y,r,angle,{material='dark',ticks=11,accent='#f0c36a',grip=true}={}){
  const c=this.ctx,[hi,mid,lo]=PALETTE[material]||PALETTE.dark;
  c.save();
  if(ticks){c.strokeStyle='rgba(222,236,242,.42)';c.lineWidth=2;
   for(let i=0;i<ticks;i++){const a=-Math.PI*1.25+i/(ticks-1)*Math.PI*1.5;
    c.beginPath();c.moveTo(x+Math.cos(a)*(r+6),y+Math.sin(a)*(r+6));c.lineTo(x+Math.cos(a)*(r+12),y+Math.sin(a)*(r+12));c.stroke();}}
  this.shadow(r*.5,r*.18,.45);
  c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle=lo;c.fill();
  this.noShadow();
  c.beginPath();c.arc(x,y,r,0,TAU);
  c.fillStyle=this.paint.radial(x-r*.35,y-r*.45,r*.1,r*1.5,[`0:${hi}`,`.6:${mid}`,`1:${lo}`]);c.fill();
  if(grip){c.save();c.translate(x,y);c.rotate(angle);
   c.strokeStyle='rgba(8,16,22,.38)';c.lineWidth=Math.max(1.2,r*.075);
   for(let i=0;i<20;i++){const a=i/20*TAU;c.beginPath();c.moveTo(Math.cos(a)*r*.74,Math.sin(a)*r*.74);c.lineTo(Math.cos(a)*r*.97,Math.sin(a)*r*.97);c.stroke();}
   c.restore();}
  c.beginPath();c.arc(x,y,r*.62,0,TAU);
  c.fillStyle=this.paint.radial(x-r*.2,y-r*.3,0,r*.9,[`0:${mid}`,`1:${lo}`]);c.fill();
  c.strokeStyle='rgba(255,255,255,.2)';c.lineWidth=1.4;c.stroke();
  c.save();c.translate(x,y);c.rotate(angle);
  c.strokeStyle=accent;c.lineWidth=Math.max(2.4,r*.17);c.lineCap='round';
  c.beginPath();c.moveTo(0,-r*.2);c.lineTo(0,-r*.86);c.stroke();
  c.restore();
  if(!this.reduced){c.beginPath();c.ellipse(x-r*.28,y-r*.36,r*.3,r*.17,-.6,0,TAU);c.fillStyle='rgba(255,255,255,.2)';c.fill();}
  c.restore();
 }

 // Rueda de válvula: radios, llanta y agarre, para riego y presión.
 valve(x,y,r,angle,{material='copper'}={}){
  const c=this.ctx,[hi,mid,lo]=PALETTE[material]||PALETTE.copper;
  this.shadow(r*.45,r*.16,.4);
  c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle=lo;c.fill();this.noShadow();
  c.save();c.translate(x,y);c.rotate(angle);
  c.lineWidth=Math.max(5,r*.2);c.strokeStyle=this.paint.linear(-r,-r,r,r,[`0:${hi}`,`.5:${mid}`,`1:${lo}`]);
  c.beginPath();c.arc(0,0,r*.84,0,TAU);c.stroke();
  for(let i=0;i<5;i++){const a=i/5*TAU;c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(a)*r*.82,Math.sin(a)*r*.82);c.stroke();}
  for(let i=0;i<5;i++){const a=i/5*TAU+.1;c.beginPath();c.arc(Math.cos(a)*r*.84,Math.sin(a)*r*.84,r*.13,0,TAU);c.fillStyle=mid;c.fill();}
  c.beginPath();c.arc(0,0,r*.26,0,TAU);c.fillStyle=this.paint.radial(-r*.1,-r*.12,0,r*.4,[`0:${hi}`,`1:${lo}`]);c.fill();
  c.strokeStyle='rgba(8,16,22,.5)';c.lineWidth=2;c.stroke();
  c.restore();
 }

 // Aguja sobre dial graduado, con cúpula de cristal y zona objetivo.
 gauge(x,y,r,value,{min=0,max=100,target=null,tolerance=0,label='',unit='',material='plastic'}={}){
  const c=this.ctx,a0=Math.PI*.78,a1=Math.PI*2.22,span=a1-a0;
  this.plate(x-r-9,y-r-9,r*2+18,r*2+18,{material,r:r+9,depth:4});
  this.recess(x-r,y-r,r*2,r*2,{r,material:'glass'});
  c.save();
  if(target!==null){const t0=a0+clamp((target-tolerance-min)/(max-min),0,1)*span,t1=a0+clamp((target+tolerance-min)/(max-min),0,1)*span;
   c.beginPath();c.arc(x,y,r*.84,t0,t1);c.lineWidth=r*.2;c.strokeStyle='rgba(143,230,194,.4)';c.stroke();}
  c.strokeStyle='rgba(224,238,244,.72)';
  for(let i=0;i<=20;i++){const a=a0+i/20*span,big=i%5===0;c.lineWidth=big?2.6:1.3;
   c.beginPath();c.moveTo(x+Math.cos(a)*r*(big?.6:.68),y+Math.sin(a)*r*(big?.6:.68));c.lineTo(x+Math.cos(a)*r*.76,y+Math.sin(a)*r*.76);c.stroke();}
  const a=a0+clamp((value-min)/(max-min),0,1)*span;
  if(!this.reduced){c.save();c.translate(2,3);c.globalAlpha=.3;c.strokeStyle='#04090e';c.lineWidth=r*.09;c.lineCap='round';
   c.beginPath();c.moveTo(x-Math.cos(a)*r*.16,y-Math.sin(a)*r*.16);c.lineTo(x+Math.cos(a)*r*.68,y+Math.sin(a)*r*.68);c.stroke();c.restore();}
  c.strokeStyle='#f0836a';c.lineWidth=r*.085;c.lineCap='round';
  c.beginPath();c.moveTo(x-Math.cos(a)*r*.16,y-Math.sin(a)*r*.16);c.lineTo(x+Math.cos(a)*r*.68,y+Math.sin(a)*r*.68);c.stroke();
  c.beginPath();c.arc(x,y,r*.13,0,TAU);c.fillStyle=this.paint.radial(x-r*.04,y-r*.05,0,r*.2,['0:#d9e4e8','1:#596a73']);c.fill();
  c.strokeStyle='rgba(8,16,22,.6)';c.lineWidth=1.4;c.stroke();
  // La escala se abre por abajo: el rótulo va en esa ventana, sobre su propia
  // chapa, para no cruzarse con los extremos de las marcas.
  if(label){const fs=Math.round(r*.2);
   c.font=`700 ${fs}px Trebuchet MS, sans-serif`;c.textAlign='center';c.textBaseline='middle';
   const tw=c.measureText(label).width+r*.22;
   roundRect(c,x-tw/2,y+r*.44,tw,fs*1.7,fs*.7);c.fillStyle='rgba(6,16,22,.82)';c.fill();
   c.fillStyle='rgba(222,238,244,.85)';c.fillText(label,x,y+r*.44+fs*.85);}
  if(unit){c.font=`800 ${Math.round(r*.32)}px Trebuchet MS, sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillStyle='#8fe6c2';c.fillText(unit,x,y-r*.38);}
  if(!this.reduced){c.beginPath();c.ellipse(x-r*.3,y-r*.4,r*.44,r*.22,-.5,0,TAU);c.fillStyle='rgba(255,255,255,.1)';c.fill();}
  c.restore();
 }

 // Palanca en guía: ranura hundida, brazo con grosor y puño de goma.
 lever(x,y,length,value,{vertical=true,accent='#e3c184',width=26}={}){
  const c=this.ctx,t=clamp(value,0,1);
  if(vertical){
   this.recess(x-width*.34,y,width*.68,length,{r:width*.34,material:'dark'});
   const py=y+length*(1-t);
   c.strokeStyle='rgba(6,14,20,.5)';c.lineWidth=width*.3;c.lineCap='round';
   c.beginPath();c.moveTo(x,py);c.lineTo(x,y+length-width*.2);c.stroke();
   this.shadow(10,4,.45);
   roundRect(c,x-width*.78,py-width*.5,width*1.56,width,width*.34);
   c.fillStyle=this.paint.linear(x,py-width*.5,x,py+width*.5,['0:#67808d','.45:#435a67','1:#22313c']);c.fill();
   this.noShadow();
   c.strokeStyle='rgba(255,255,255,.22)';c.lineWidth=1.6;roundRect(c,x-width*.78,py-width*.5,width*1.56,width,width*.34);c.stroke();
   c.strokeStyle=accent;c.lineWidth=3;c.beginPath();c.moveTo(x-width*.5,py);c.lineTo(x+width*.5,py);c.stroke();
   for(const d of [-.26,0,.26]){c.strokeStyle='rgba(10,18,24,.4)';c.lineWidth=2;c.beginPath();c.moveTo(x-width*.5,py+width*d);c.lineTo(x+width*.5,py+width*d);c.stroke();}
  }else{
   this.recess(x,y-width*.34,length,width*.68,{r:width*.34,material:'dark'});
   const px=x+length*t;
   this.shadow(10,4,.45);
   roundRect(c,px-width*.5,y-width*.78,width,width*1.56,width*.34);
   c.fillStyle=this.paint.linear(px-width*.5,y,px+width*.5,y,['0:#67808d','.45:#435a67','1:#22313c']);c.fill();
   this.noShadow();
   c.strokeStyle=accent;c.lineWidth=3;c.beginPath();c.moveTo(px,y-width*.5);c.lineTo(px,y+width*.5);c.stroke();
  }
 }

 // Interruptor basculante: la tecla se inclina y arrastra su sombra.
 rocker(x,y,w,h,on,{accent='#8fe6c2',label=''}={}){
  const c=this.ctx;
  this.recess(x-3,y-3,w+6,h+6,{r:7,material:'dark'});
  const lift=on?-1:1;
  c.save();roundRect(c,x,y,w,h,5);c.clip();
  c.fillStyle=this.paint.linear(x,y,x,y+h,on?['0:#7e959f','1:#3c525e']:['0:#445965','1:#6d848f']);
  c.fillRect(x,y,w,h);
  c.fillStyle=`rgba(6,14,20,${on?.32:.1})`;c.fillRect(x,on?y:y+h*.52,w,h*.48);
  c.restore();
  c.strokeStyle='rgba(255,255,255,.2)';c.lineWidth=1.4;roundRect(c,x,y,w,h,5);c.stroke();
  this.led(x+w/2,y+(on?h*.28:h*.72),Math.min(w,h)*.16,accent,on);
  if(label){c.font=`800 ${Math.round(h*.22)}px Trebuchet MS, sans-serif`;c.textAlign='center';c.textBaseline='middle';
   c.fillStyle='rgba(16,26,34,.7)';c.fillText(label,x+w/2,y+(on?h*.74:h*.26)+lift);}
 }

 // Botón mecánico con recorrido real: al pulsar baja y pierde su sombra.
 pushbutton(x,y,w,h,{pressed=false,material='plastic',label='',color=null,font=null,enabled=true}={}){
  const c=this.ctx,travel=pressed?3:0,[hi,mid,lo]=color?[color,color,color]:(PALETTE[material]||PALETTE.plastic);
  roundRect(c,x,y+5,w,h,8);c.fillStyle='rgba(6,14,20,.55)';c.fill();
  if(!pressed){this.shadow(9,4,.4);}
  roundRect(c,x,y+travel,w,h,8);
  c.fillStyle=color?this.paint.linear(x,y+travel,x,y+travel+h,[`0:${color}`,`1:rgba(10,20,28,.55)`]):this.paint.linear(x,y+travel,x,y+travel+h,[`0:${hi}`,`.5:${mid}`,`1:${lo}`]);
  c.fill();this.noShadow();
  c.save();roundRect(c,x,y+travel,w,h,8);c.clip();
  c.strokeStyle='rgba(255,255,255,.3)';c.lineWidth=2;roundRect(c,x+1,y+travel+1,w-2,h-2,8);c.stroke();
  if(pressed){c.fillStyle='rgba(6,14,20,.22)';c.fillRect(x,y+travel,w,h);}
  c.restore();
  if(!enabled){c.fillStyle='rgba(20,30,38,.45)';roundRect(c,x,y+travel,w,h,8);c.fill();}
  if(label){c.font=font||`800 ${Math.round(Math.min(h*.42,w/Math.max(4,label.length)*1.5))}px Trebuchet MS, sans-serif`;
   c.textAlign='center';c.textBaseline='middle';
   c.fillStyle='rgba(6,14,20,.45)';c.fillText(label,x+w/2,y+travel+h/2+1.5);
   c.fillStyle=enabled?'#f2f7f9':'rgba(242,247,249,.45)';c.fillText(label,x+w/2,y+travel+h/2);}
 }

 // Cable: vaina, núcleo iluminado, sombra proyectada y caída por su peso.
 cable(x0,y0,x1,y1,color,{sag=null,width=11,shadow=true}={}){
  const c=this.ctx,dx=x1-x0,dy=y1-y0,len=Math.hypot(dx,dy),droop=sag===null?Math.min(90,len*.3):sag;
  const cx0=x0+dx*.3,cy0=y0+dy*.3+droop,cx1=x0+dx*.7,cy1=y0+dy*.7+droop;
  const curve=()=>{c.beginPath();c.moveTo(x0,y0);c.bezierCurveTo(cx0,cy0,cx1,cy1,x1,y1);};
  c.lineCap='round';
  if(shadow&&!this.reduced){c.save();c.translate(3,6);curve();c.strokeStyle='rgba(4,10,16,.34)';c.lineWidth=width;c.stroke();c.restore();}
  curve();c.strokeStyle='#0d1922';c.lineWidth=width;c.stroke();
  curve();c.strokeStyle=color;c.lineWidth=width*.62;c.stroke();
  if(!this.reduced){c.save();curve();c.strokeStyle='rgba(255,255,255,.3)';c.lineWidth=width*.16;c.setLineDash([]);c.translate(0,-width*.2);c.stroke();c.restore();}
 }

 // Conector hembra: anillo metálico, hueco oscuro y testigo de contacto.
 // `ring` tiñe el bisel con el color que el conector admite, para que la
 // correspondencia se vea en el propio aparato y no solo en el enunciado.
 port(x,y,r,color,{filled=false,live=false,label='',ring=null}={}){
  const c=this.ctx;
  this.shadow(7,3,.4);
  c.beginPath();c.arc(x,y,r+5,0,TAU);
  c.fillStyle=this.paint.radial(x-r*.3,y-r*.4,0,r*1.8,['0:#aebdc3','.6:#71848d','1:#3d4e58']);c.fill();
  this.noShadow();
  c.strokeStyle='rgba(8,16,22,.55)';c.lineWidth=1.4;c.stroke();
  if(ring){c.beginPath();c.arc(x,y,r+2.6,0,TAU);c.strokeStyle=ring;c.lineWidth=3.4;c.stroke();}
  c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle=this.paint.radial(x,y,0,r,['0:#06121a','1:#16252f']);c.fill();
  if(filled){c.beginPath();c.arc(x,y,r*.74,0,TAU);c.fillStyle=color;c.fill();
   c.beginPath();c.arc(x-r*.22,y-r*.26,r*.26,0,TAU);c.fillStyle='rgba(255,255,255,.4)';c.fill();}
  else{c.beginPath();c.arc(x,y,r*.42,0,TAU);c.fillStyle='rgba(2,8,12,.9)';c.fill();
   // Tres contactos internos: el hueco se lee como una toma real.
   c.strokeStyle='rgba(222,238,244,.18)';c.lineWidth=1.6;
   for(let i=0;i<3;i++){const a=i/3*TAU-Math.PI/2;
    c.beginPath();c.moveTo(x+Math.cos(a)*r*.5,y+Math.sin(a)*r*.5);c.lineTo(x+Math.cos(a)*r*.78,y+Math.sin(a)*r*.78);c.stroke();}}
  if(live)this.led(x,y-r-11,3.2,color,true);
  if(label){c.font=`800 ${Math.round(r*.9)}px Trebuchet MS, sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillStyle='#e8f1f4';c.fillText(label,x,y+r+16);}
 }

 // Clavija macho: el extremo del cable, con cuerpo, cuello y punta metálica.
 plug(x,y,r,color,{angle=0}={}){
  const c=this.ctx;c.save();c.translate(x,y);c.rotate(angle);
  this.shadow(6,3,.4);
  roundRect(c,-r*.5,-r*.78,r*1.9,r*1.56,r*.5);
  c.fillStyle=this.paint.linear(0,-r*.78,0,r*.78,[`0:${color}`,`.55:${color}`,'1:rgba(8,16,22,.6)']);c.fill();
  this.noShadow();
  c.strokeStyle='rgba(8,16,22,.5)';c.lineWidth=1.4;c.stroke();
  roundRect(c,-r*1.05,-r*.3,r*.6,r*.6,r*.18);
  c.fillStyle=this.paint.linear(0,-r*.3,0,r*.3,['0:#cfdade','1:#5b6c75']);c.fill();
  c.strokeStyle='rgba(8,16,22,.5)';c.lineWidth=1;c.stroke();
  if(!this.reduced){c.beginPath();c.ellipse(r*.4,-r*.42,r*.6,r*.17,0,0,TAU);c.fillStyle='rgba(255,255,255,.26)';c.fill();}
  c.restore();
 }

 // Fusible de cristal: filamento intacto o fundido con su mancha de hollín.
 fuse(x,y,w,h,ok){
  const c=this.ctx;
  this.plate(x-5,y-7,w+10,12,{material:'steel',r:3,depth:2});
  this.plate(x-5,y+h-5,w+10,12,{material:'steel',r:3,depth:2});
  roundRect(c,x,y,w,h,5);c.fillStyle=this.paint.linear(x,y,x+w,y,['0:rgba(150,200,215,.5)','.4:rgba(206,236,246,.3)','1:rgba(90,140,160,.5)']);c.fill();
  c.strokeStyle='rgba(222,240,248,.5)';c.lineWidth=1.5;roundRect(c,x,y,w,h,5);c.stroke();
  c.lineCap='round';
  if(ok){c.strokeStyle='#f0c36a';c.lineWidth=3;c.beginPath();c.moveTo(x+w/2,y+4);
   for(let i=0;i<=10;i++)c.lineTo(x+w/2+(i%2?3.5:-3.5),y+4+i*(h-8)/10);c.stroke();
   if(!this.reduced){c.strokeStyle='rgba(240,195,106,.35)';c.lineWidth=7;c.stroke();}}
  else{c.strokeStyle='#5c6b74';c.lineWidth=3;
   c.beginPath();c.moveTo(x+w/2,y+4);c.lineTo(x+w/2-2,y+h*.4);c.stroke();
   c.beginPath();c.moveTo(x+w/2+2,y+h*.6);c.lineTo(x+w/2,y+h-4);c.stroke();
   c.beginPath();c.arc(x+w/2,y+h/2,w*.4,0,TAU);c.fillStyle='rgba(20,26,30,.45)';c.fill();}
 }

 // Placa grabada: el texto queda hundido en el metal.
 labelPlate(x,y,w,h,text,{material='steel',size=null,align='center'}={}){
  const c=this.ctx;
  this.plate(x,y,w,h,{material,r:4,depth:2,light:.35});
  const fs=size||Math.min(h*.52,w/Math.max(6,text.length)*1.65);
  c.font=`800 ${Math.round(fs)}px Trebuchet MS, sans-serif`;c.textAlign=align;c.textBaseline='middle';
  const tx=align==='center'?x+w/2:align==='left'?x+10:x+w-10;
  c.fillStyle='rgba(255,255,255,.35)';c.fillText(text,tx,y+h/2+1.2);
  c.fillStyle='rgba(18,30,38,.85)';c.fillText(text,tx,y+h/2);
 }

 // Rejilla de ventilación, con lamas y profundidad.
 grille(x,y,w,h,{slats=7,angle=0}={}){
  const c=this.ctx;this.recess(x,y,w,h,{r:6,material:'dark'});
  c.save();roundRect(c,x,y,w,h,6);c.clip();
  const step=h/slats;
  for(let i=0;i<slats;i++){const yy=y+i*step+step*.18;
   roundRect(c,x+4,yy,w-8,step*.64,step*.3);
   c.fillStyle=this.paint.linear(x,yy,x,yy+step*.64,['0:#66808c','.6:#3b505c','1:#223139']);c.fill();
   c.strokeStyle='rgba(255,255,255,.14)';c.lineWidth=1;c.stroke();}
  c.restore();
 }

 // Tubería con brillo longitudinal y bridas.
 pipe(x,y,w,h,{material='steel',horizontal=true,flanges=[]}={}){
  const c=this.ctx,[hi,mid,lo]=PALETTE[material]||PALETTE.steel;
  roundRect(c,x,y,w,h,Math.min(w,h)/2);
  c.fillStyle=horizontal?this.paint.linear(x,y,x,y+h,[`0:${lo}`,`.3:${hi}`,`.55:${mid}`,`1:${lo}`]):this.paint.linear(x,y,x+w,y,[`0:${lo}`,`.3:${hi}`,`.55:${mid}`,`1:${lo}`]);
  c.fill();
  c.strokeStyle='rgba(8,16,22,.5)';c.lineWidth=1.5;c.stroke();
  for(const f of flanges){if(horizontal)this.plate(x+f-7,y-5,14,h+10,{material,r:3,depth:2});else this.plate(x-5,y+f-7,w+10,14,{material,r:3,depth:2});}
 }

 // Franja de peligro: la referencia visual de "aquí se interviene".
 hazard(x,y,w,h,{a='#e0b457',b='#2b3540'}={}){
  const c=this.ctx;c.save();roundRect(c,x,y,w,h,3);c.clip();
  c.fillStyle=b;c.fillRect(x,y,w,h);c.fillStyle=a;
  for(let i=-h;i<w+h;i+=h*1.6){c.beginPath();c.moveTo(x+i,y+h);c.lineTo(x+i+h*.8,y);c.lineTo(x+i+h*1.6,y);c.lineTo(x+i+h*.8,y+h);c.closePath();c.fill();}
  c.restore();
 }

 // Dígitos de siete segmentos reales: los apagados siguen insinuándose.
 segments(x,y,w,h,text,{color='#8fe6c2',off='rgba(143,230,194,.1)',gap=null}={}){
  const c=this.ctx,chars=String(text).split(''),step=gap||w/chars.length,dw=step*.68,t=Math.max(2.4,dw*.16);
  const SEG={'0':'abcdef','1':'bc','2':'abdeg','3':'abcdg','4':'bcfg','5':'acdfg','6':'acdefg','7':'abc','8':'abcdefg','9':'abcdfg','-':'g','_':'d',' ':''};
  chars.forEach((ch,i)=>{
   const ox=x+i*step+(step-dw)/2,on=SEG[ch]??'abcdefg';
   const bar=(k,bx,by,bw,bh)=>{c.fillStyle=on.includes(k)?color:off;roundRect(c,bx,by,bw,bh,t*.45);c.fill();};
   bar('a',ox+t,y,dw-t*2,t);bar('g',ox+t,y+h/2-t/2,dw-t*2,t);bar('d',ox+t,y+h-t,dw-t*2,t);
   bar('f',ox,y+t,t,h/2-t*1.5);bar('b',ox+dw-t,y+t,t,h/2-t*1.5);
   bar('e',ox,y+h/2+t*.5,t,h/2-t*1.5);bar('c',ox+dw-t,y+h/2+t*.5,t,h/2-t*1.5);
  });
 }

 // Barra de nivel por segmentos, estilo medidor de audio.
 vuMeter(x,y,w,h,value,{segments=14,vertical=true,warnAt=.78}={}){
  const c=this.ctx;this.recess(x,y,w,h,{r:5,material:'dark'});
  const n=segments,lit=Math.round(clamp(value,0,1)*n);
  for(let i=0;i<n;i++){
   const t=i/(n-1),col=t>warnAt?'#f0836a':t>warnAt-.26?'#f0c36a':'#8fe6c2';
   const on=i<lit;
   if(vertical){const sh=(h-10)/n;roundRect(c,x+4,y+h-6-(i+1)*sh+sh*.18,w-8,sh*.64,2);}
   else{const sw=(w-10)/n;roundRect(c,x+5+i*sw+sw*.18,y+4,sw*.64,h-8,2);}
   c.fillStyle=on?col:'rgba(220,240,246,.07)';c.fill();
   if(on&&!this.reduced&&i===lit-1){c.fillStyle=col+'55';c.fill();}
  }
 }

 text(s,x,y,{size=20,color='#e8f1f4',align='center',baseline='middle',weight=800,shadow=true}={}){
  const c=this.ctx;c.font=`${weight} ${Math.round(size)}px Trebuchet MS, sans-serif`;c.textAlign=align;c.textBaseline=baseline;
  if(shadow&&!this.reduced){c.fillStyle='rgba(4,10,16,.5)';c.fillText(s,x,y+1.4);}
  c.fillStyle=color;c.fillText(s,x,y);
 }
}

// ---------------------------------------------------------------------------
// Chasis y bucle de interacción.
//
// `createMechanism` monta el armazón (DOM mínimo: lienzo, instrucciones, aviso
// y botón de confirmación) y devuelve el contexto de dibujo lógico más el
// registro de zonas sensibles. Admite varios punteros simultáneos: un dedo
// puede sostener una palanca mientras otro pulsa un botón.
// ---------------------------------------------------------------------------
export const STAGE={w:640,h:440};

export function createMechanism(root,{
 title='AS / SERVICE TERMINAL',subtitle='INTERVENCIÓN LOCAL',instructions='',
 submitLabel='Comprobar →',width=STAGE.w,height=STAGE.h,tone=()=>{},reduced=false,machine=''
}={}){
 const doc=root.ownerDocument,win=doc.defaultView;
 // No hay botón de comprobación: la misión se da por resuelta sola, en cuanto
 // el mecanismo cumple sus condiciones. El pie solo informa.
 root.innerHTML=`<div class="mech ${machine?'mech-'+machine:''}"><div class="mech-head"><i class="mech-led"></i><b></b><small></small></div><p class="mech-brief"></p><div class="mech-stage"><canvas class="mech-canvas" tabindex="0"></canvas></div><p class="mech-note" aria-live="polite"></p></div>`;
 const shell=root.firstElementChild,canvas=shell.querySelector('canvas'),stage=shell.querySelector('.mech-stage');
 const note=shell.querySelector('.mech-note');
 shell.querySelector('.mech-head b').textContent=title;
 shell.querySelector('.mech-head small').textContent=subtitle;
 shell.querySelector('.mech-brief').textContent=instructions;
 canvas.setAttribute('role','application');
 canvas.setAttribute('aria-label',instructions||title);
 void submitLabel;

 const ctx=canvas.getContext('2d',{alpha:false});
 const hw=new Hardware(ctx,{reduced});
 let disposed=false,dirty=true,animating=0,raf=0,scale=1,offX=0,offY=0,dpr=1;
 let drawFn=()=>{},controls=[],pointers=new Map(),lastTime=0,born=0;
 // `settle` es el tiempo que la condición debe aguantar cumplida antes de dar
 // la misión por resuelta. En los mandos continuos (válvulas, agujas, faders)
 // evita que el valor correcto se dé por bueno de pasada, mientras el dedo
 // sigue girando. En las acciones discretas vale cero: respuesta inmediata.
 let answer=()=>null,valid=()=>false,settle=0,held=0;
 let sending=false,phase='live',phaseAt=0,shake=0,flash=0,sweep=0;
 const cleanups=[];

 // --- encaje ------------------------------------------------------------
 // La escena mantiene su proporción y se centra. Nunca se recorta ni se
 // desborda, en vertical, en horizontal y con el teclado abierto.
 function resize(){
  if(disposed)return;
  const box=stage.getBoundingClientRect();
  const aw=Math.max(40,box.width),ah=Math.max(40,box.height);
  scale=Math.min(aw/width,ah/height);
  const cw=Math.max(1,Math.round(width*scale)),ch=Math.max(1,Math.round(height*scale));
  dpr=Math.min(win.devicePixelRatio||1,2);
  canvas.style.width=cw+'px';canvas.style.height=ch+'px';
  const bw=Math.max(1,Math.round(cw*dpr)),bh=Math.max(1,Math.round(ch*dpr));
  if(canvas.width!==bw||canvas.height!==bh){canvas.width=bw;canvas.height=bh;}
  const rect=canvas.getBoundingClientRect();offX=rect.left;offY=rect.top;
  hw.paint.cache.clear();dirty=true;
 }
 const observer=typeof win.ResizeObserver==='function'?new win.ResizeObserver(resize):null;
 observer?.observe(stage);
 for(const [obj,ev] of [[win,'resize'],[win,'orientationchange'],[win.visualViewport,'resize'],[win.visualViewport,'scroll']]){
  if(!obj)continue;obj.addEventListener(ev,resize);cleanups.push(()=>obj.removeEventListener(ev,resize));
 }

 const toLogical=e=>{const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)/Math.max(.001,r.width)*width,y:(e.clientY-r.top)/Math.max(.001,r.height)*height};};

 // --- punteros ----------------------------------------------------------
 // Cada puntero recuerda el control que agarró al bajar. Eso evita que un
 // segundo dedo robe el arrastre del primero y que un deslizamiento fuera de
 // la pieza la suelte sola.
 function hit(p){
  for(let i=controls.length-1;i>=0;i--){const q=controls[i];
   if(q.disabled)continue;
   if(q.shape==='circle'){if(Math.hypot(p.x-q.x,p.y-q.y)<=q.r)return q;}
   else if(p.x>=q.x&&p.x<=q.x+q.w&&p.y>=q.y&&p.y<=q.y+q.h)return q;}
  return null;
 }
 function onDown(e){
  // Mientras el mecanismo se cierra o habla con el servidor no se admiten
  // más órdenes: así una misión no puede enviarse dos veces.
  if(disposed||phase!=='live')return;
  if(e.pointerType==='mouse'&&e.button!==0)return;
  const p=toLogical(e),c=hit(p);
  if(e.cancelable!==false)e.preventDefault();
  canvas.focus?.({preventScroll:true});
  if(!c)return;
  try{canvas.setPointerCapture?.(e.pointerId);}catch{}
  const entry={control:c,start:{...p,value:c.value?.()},last:p};
  pointers.set(e.pointerId,entry);
  c.down?.(p,entry.start);dirty=true;
 }
 function onMove(e){
  const entry=pointers.get(e.pointerId);if(!entry)return;
  if(e.cancelable!==false)e.preventDefault();
  const p=toLogical(e);entry.last=p;
  entry.control.move?.(p,entry.start);dirty=true;
 }
 function onUp(e,cancel){
  const entry=pointers.get(e.pointerId);if(!entry)return;
  pointers.delete(e.pointerId);
  entry.control.up?.(entry.last,entry.start,cancel);dirty=true;
 }
 canvas.addEventListener('pointerdown',onDown,{passive:false});
 canvas.addEventListener('pointermove',onMove,{passive:false});
 canvas.addEventListener('pointerup',e=>onUp(e,false));
 canvas.addEventListener('pointercancel',e=>onUp(e,true));
 // Perder la captura no es levantar el dedo: se recupera para no soltar la pieza.
 canvas.addEventListener('lostpointercapture',e=>{if(pointers.has(e.pointerId)){try{canvas.setPointerCapture?.(e.pointerId);}catch{}}});
 for(const ev of ['contextmenu','selectstart','dragstart'])canvas.addEventListener(ev,e=>e.preventDefault());

 // --- estado ------------------------------------------------------------
 const api={
  hw,ctx,width,height,tone,reduced,
  get time(){return lastTime;},
  get openProgress(){return clamp((lastTime-born)/420,0,1);},
  register(c){controls.push(c);return c;},
  // Zona rectangular sensible.
  zone(x,y,w,h,handlers={}){return api.register({shape:'rect',x,y,w,h,...handlers});},
  // Zona circular, para mandos y conectores.
  spot(x,y,r,handlers={}){return api.register({shape:'circle',x,y,r,...handlers});},
  clearZones(){controls=[];},
  invalidate(){dirty=true;},
  animate(on){animating=Math.max(0,animating+(on?1:-1));if(on)dirty=true;},
  setAnswer(fn){answer=fn;},
  setValid(fn,{settle:s=0}={}){valid=fn;settle=s;},
  note(text=''){if(note.textContent!==text){note.textContent=text;dirty=true;}},
  refresh(){dirty=true;},
  feedback(kind='tick',freq=null){
   if(kind==='error'){shake=1;flash=-1;tone(freq??152,.14,'triangle',.04);}
   else if(kind==='ok'){flash=1;tone(freq??660,.1);}
   else tone(freq??420,.05,'triangle',.03);
   dirty=true;},
  complete(){finish();},
  get phase(){return phase;},
  busy(){return sending;}
 };

 // Cierre automático de la misión.
 //
 // 1. Se detecta que el mecanismo cumple sus condiciones.
 // 2. Se bloquea la entrada para que no se envíe dos veces.
 // 3. Se anima el mecanismo funcionando mientras se espera al servidor
 //    (el cliente retiene además el tiempo mínimo de la tarea).
 // 4. El servidor acepta: confirmación visual y el panel se cierra solo.
 // 5. El servidor rechaza: NO se marca como hecha, se recupera el control.
 async function finish(){
  if(phase!=='live'||sending)return;
  phase='solving';phaseAt=lastTime;sending=true;sweep=0;dirty=true;
  shell.classList.add('mech-working');
  api.note('Mecanismo en marcha…');
  tone(680,.11);tone(880,.09);
  try{
   await root.__mechSubmit?.(answer());
   if(disposed)return;
   phase='done';phaseAt=lastTime;flash=1;dirty=true;
   shell.classList.remove('mech-working');shell.classList.add('mech-done');
   api.note('Operación completada ✓');
   tone(1046,.16);
  }catch(err){
   if(disposed)return;
   sending=false;phase='live';held=0;shake=1;flash=-1;dirty=true;
   shell.classList.remove('mech-working');
   shell.classList.remove('mech-error');void shell.offsetWidth;shell.classList.add('mech-error');
   api.note(err.message||'El servidor ha rechazado la operación.');
   tone(150,.15,'triangle',.04);
  }
 }

 // --- bucle -------------------------------------------------------------
 // Solo se dibuja cuando hay algo que mostrar: una escena quieta no consume
 // GPU ni batería, y el lienzo no compite con el mapa del juego.
 function frame(time){
  if(disposed)return;
  raf=win.requestAnimationFrame(frame);
  if(!born)born=time;
  const dt=lastTime?Math.min(.05,(time-lastTime)/1000):0;lastTime=time;
  if(shake>0){shake=Math.max(0,shake-dt*3.2);dirty=true;}
  if(flash!==0){flash=flash>0?Math.max(0,flash-dt*1.4):Math.min(0,flash+dt*1.4);dirty=true;}
  // Detección automática: la condición debe aguantar `settle` cumplida.
  if(phase==='live'&&!sending){
   if(valid()){held+=dt;if(held>=settle)finish();}
   else held=0;
  }
  if(phase!=='live'){sweep+=dt;dirty=true;}
  const opening=time-born<460;
  if(!dirty&&!animating&&!opening&&!pointers.size)return;
  dirty=false;
  controls=[];
  ctx.save();
  ctx.setTransform(dpr*scale,0,0,dpr*scale,0,0);
  if(shake>0){const s=shake*shake*7;ctx.translate(Math.sin(time*.07)*s,Math.cos(time*.11)*s*.5);}
  ctx.fillStyle='#0c1620';ctx.fillRect(-20,-20,width+40,height+40);
  // Apertura: la carcasa cae a su sitio y la escena gana nitidez.
  const t=api.openProgress,ease=1-Math.pow(1-t,3);
  if(t<1){ctx.translate(0,(1-ease)*-26);ctx.globalAlpha=ease;}
  // Un fallo al dibujar no puede cortar el bucle: se informa y el fotograma
  // siguiente vuelve a intentarlo con el estado ya corregido.
  try{drawFn(api,hw,ctx,time,dt);}
  catch(err){console.error('PUCELA US · fallo al dibujar el mecanismo:',err);}
  if(flash!==0){
   ctx.globalAlpha=Math.abs(flash)*.3;
   ctx.fillStyle=flash>0?'#8fe6c2':'#f0836a';ctx.fillRect(0,0,width,height);ctx.globalAlpha=1;
  }
  // Cierre: una pasada de luz recorre el aparato y deja el sello de operación
  // completada. Es la señal de que la tarea ya está registrada.
  if(phase==='solving'||phase==='done'){
   const t=Math.min(1,sweep/.55);
   ctx.save();
   ctx.globalAlpha=.5*(phase==='done'?1:t);
   const bx=-width*.3+ (width*1.6)*(phase==='done'?1:t);
   ctx.fillStyle=api.reduced?'rgba(143,230,194,.18)':hw.paint.linear(bx-120,0,bx+120,0,['0:rgba(143,230,194,0)','.5:rgba(143,230,194,.5)','1:rgba(143,230,194,0)']);
   ctx.fillRect(0,0,width,height);
   ctx.restore();
   if(phase==='done'){
    const s=Math.min(1,(sweep)/.3),r=46*s;
    ctx.save();ctx.globalAlpha=s;
    ctx.beginPath();ctx.arc(width/2,height/2,r+16,0,TAU);
    ctx.fillStyle='rgba(8,24,20,.72)';ctx.fill();
    ctx.beginPath();ctx.arc(width/2,height/2,r,0,TAU);
    ctx.strokeStyle='#8fe6c2';ctx.lineWidth=5;ctx.stroke();
    ctx.beginPath();ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=7;
    ctx.moveTo(width/2-r*.42,height/2+r*.02);ctx.lineTo(width/2-r*.1,height/2+r*.34);ctx.lineTo(width/2+r*.44,height/2-r*.32);
    ctx.strokeStyle='#8fe6c2';ctx.stroke();
    hw.text('OPERACIÓN COMPLETADA',width/2,height/2+r+32,{size:15,color:'#8fe6c2'});
    ctx.restore();
   }else{
    hw.text('MECANISMO EN MARCHA…',width/2,height-30,{size:14,color:'#f0c36a'});
   }
  }
  ctx.restore();
  hw.paint.clear();
 }
 raf=win.requestAnimationFrame(frame);

 return {
  api,hw,
  canvas,
  setDraw(fn){drawFn=fn;dirty=true;},
  onSubmit(fn){root.__mechSubmit=fn;},
  resize,
  dispose(){
   disposed=true;if(raf)win.cancelAnimationFrame(raf);
   observer?.disconnect();cleanups.forEach(fn=>fn());
   delete root.__mechSubmit;
  }
 };
}

// ---------------------------------------------------------------------------
// Controles reutilizables. Devuelven objetos con `value`, `set` y `attach`,
// de modo que cada misión los coloca donde quiera sin repetir la interacción.
// ---------------------------------------------------------------------------

// Mando o válvula giratoria: el ángulo del dedo manda, no el desplazamiento.
export function rotaryControl({x,y,r,value=50,min=0,max=100,turns=1,onChange=()=>{}}){
 const state={value:clamp(value,min,max)};let ref=0,refValue=0;
 return {
  // La posición forma parte del control: quien lo dibuja y quien lo acciona
  // tienen que leer las mismas coordenadas, no dos copias que se desincronicen.
  x,y,r,
  get value(){return state.value;},
  set(v){state.value=clamp(v,min,max);},
  attach(api){
   api.spot(x,y,r*1.35,{
    value:()=>state.value,
    down:p=>{ref=Math.atan2(p.y-y,p.x-x);refValue=state.value;},
    move:p=>{
     const a=Math.atan2(p.y-y,p.x-x);let d=a-ref;
     d=Math.atan2(Math.sin(d),Math.cos(d));
     ref=a;refValue=clamp(refValue+d/(Math.PI*2*turns)*(max-min),min,max);
     const next=Math.round(refValue);
     if(next!==state.value){state.value=next;onChange(next);}
    },
    up:()=>api.tone(176,.05,'triangle',.02)
   });
  },
  angle(){return (state.value-min)/(max-min||1)*Math.PI*1.5*turns-Math.PI*.75;}
 };
}

// Palanca o fader: sigue al dedo a lo largo de su guía, con retención.
// `invert` hace que el valor crezca hacia abajo: una prensa se acciona bajando
// la palanca, y el puño tiene que quedar donde está el dedo, no al revés.
export function linearControl({x,y,length,value=0,min=0,max=100,vertical=true,invert=false,onChange=()=>{}}){
 const state={value:clamp(value,min,max)};
 const toValue=p=>{
  let t=vertical?1-clamp((p.y-y)/length,0,1):clamp((p.x-x)/length,0,1);
  if(invert)t=1-t;
  return min+t*(max-min);
 };
 return {
  get value(){return state.value;},
  set(v){state.value=clamp(v,min,max);},
  get t(){return (state.value-min)/(max-min||1);},
  attach(api){
   const pad=28;
   const box=vertical?{x:x-pad,y:y-pad*.5,w:pad*2,h:length+pad}:{x:x-pad*.5,y:y-pad,w:length+pad,h:pad*2};
   api.zone(box.x,box.y,box.w,box.h,{
    value:()=>state.value,
    down:p=>{const n=Math.round(toValue(p));if(n!==state.value){state.value=n;onChange(n);}},
    move:p=>{const n=Math.round(toValue(p));if(n!==state.value){state.value=n;onChange(n);}},
    up:()=>api.tone(188,.04,'triangle',.02)
   });
  }
 };
}

// Panel de parcheo: se arrastra un cable de un conector a otro, y la curva
// sigue al dedo. También funciona por toque suelto (origen y luego destino).
export function patchControl({left,right,order,onChange=()=>{},colors}){
 const palette=colors||['#f0836a','#f0c36a','#7fc4f0','#b79bf0','#8fe6c2','#f09ad0'];
 const links=left.map(()=>-1);
 const live=new Map();let selected=-1;
 return {
  get links(){return [...links];},
  get selected(){return selected;},
  get dragging(){return live;},
  colorOf(i){return palette[i%palette.length];},
  valid(){return links.every(v=>v>=0);},
  attach(api){
   left.forEach((pt,i)=>api.spot(pt.x,pt.y,pt.r*1.9,{
    down:()=>{selected=i;live.set(i,{x:pt.x,y:pt.y});},
    move:p=>{if(live.has(i))live.set(i,p);},
    up:(p,_s,cancel)=>{
     live.delete(i);
     if(cancel)return;
     const target=right.findIndex(q=>Math.hypot(p.x-q.x,p.y-q.y)<=q.r*2.3);
     if(target<0)return;
     connect(api,i,target);
    }
   }));
   right.forEach((pt,j)=>api.spot(pt.x,pt.y,pt.r*1.9,{
    down:()=>{if(selected>=0)connect(api,selected,j);
     else{const from=links.indexOf(j);if(from>=0){links[from]=-1;onChange();api.feedback('tick',250);}}}
   }));
  }
 };
 function connect(api,i,j){
  if(order[j]===i){links[i]=j;selected=-1;onChange();api.feedback('ok',560+i*80);}
  else{selected=-1;api.feedback('error');}
 }
}

// ---------------------------------------------------------------------------
// Piezas comunes a todas las misiones: el armario, la zona útil y el gesto de
// coger y soltar. Viven aquí para que Colegio, Club y Gym compartan el mismo
// armazón sin duplicar código ni añadir archivos.
// ---------------------------------------------------------------------------

// La zona útil del aparato, por dentro del chasis y por encima del raíl.
export const stageBox=api=>({x:30,y:28,w:api.width-60,h:api.height-84});

export function rounded(ctx,x,y,w,h,r){roundRect(ctx,x,y,w,h,r);}

// Armario: canto exterior, bandeja hundida, cuatro tornillos, franja de
// peligro y raíl de estado con tres testigos. Es lo que hace que treinta y
// cuatro aparatos distintos se lean como una misma familia de máquinas.
export function chassis(hw,api,{label='',status='',level=0,ok=false,bad=false}={}){
 const {width:W,height:H}=api;
 hw.plate(4,2,W-8,H-10,{material:'steel',r:16,depth:6,light:.42});
 hw.recess(16,14,W-32,H-46,{r:11,material:'dark',inset:4});
 for(const [x,y] of [[26,24],[W-26,24],[26,H-36],[W-26,H-36]])hw.screw(x,y,6.2,.5+x*.01);
 hw.hazard(16,H-32,W-32,7,bad?{a:'#d1575c',b:'#2b3540'}:undefined);
 if(label)hw.labelPlate(26,H-24,Math.min(260,W*.42),19,label,{size:11,align:'left'});
 const lx=W-150;
 hw.recess(lx,H-25,124,21,{r:5,material:'dark'});
 for(let i=0;i<3;i++)hw.led(lx+14+i*20,H-14.5,4,i===0?'#8fe6c2':i===1?'#f0c36a':'#f0836a',ok?i===0:bad?i===2:i===1);
 hw.text(status||'ENLACE SERVIDOR',lx+84,H-14.5,{size:9,color:'#9ab6bd',align:'center'});
 if(level>0)hw.vuMeter(W-34,20,16,H-70,level,{segments:16});
}

// Piezas que se cogen con el dedo y se sueltan en un hueco. Vale un arrastre
// continuo y vale también coger con un toque y soltar con otro: en pantalla
// pequeña lo segundo es bastante más fiable.
export function makeCarrier(){
 const st={held:null,at:null,moved:false};
 return {
  get held(){return st.held;},get at(){return st.at;},get moved(){return st.moved;},
  pick(id,p){st.held=id;st.at=p?{x:p.x,y:p.y}:null;st.moved=false;},
  drag(p){if(st.held!==null){st.at={x:p.x,y:p.y};st.moved=true;}},
  release(){const id=st.held;st.held=null;st.at=null;return id;},
  clear(){st.held=null;st.at=null;st.moved=false;}
 };
}
export const inside=(p,b)=>p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h;

// Lector de tarjeta: hay que deslizar de un extremo a otro a ritmo humano.
// La duración se mide en el cliente y la valida el servidor.
export function swipeControl({x,y,w,h,onComplete=()=>{}}){
 const state={progress:0,startedAt:0,duration:0,active:false};
 return {
  get progress(){return state.progress;},
  get duration(){return state.duration;},
  reset(){state.progress=0;state.duration=0;state.active=false;},
  attach(api){
   api.zone(x-20,y-20,w+40,h+40,{
    down:p=>{if(p.x<x+w*.42){state.active=true;state.startedAt=api.time;state.progress=0;}},
    move:p=>{if(!state.active)return;state.progress=clamp((p.x-x)/w,0,1);},
    up:()=>{
     if(!state.active)return;
     state.active=false;
     if(state.progress>=.92){state.duration=Math.round(api.time-state.startedAt);onComplete(state.duration);}
     else{state.progress=0;api.feedback('error');}
    }
   });
  }
 };
}
