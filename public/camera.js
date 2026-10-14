// El personaje queda hasta 20 píxeles a la derecha/izquierda del centro.
// La cámara se desplaza en sentido contrario al movimiento. Sin mirada vertical.
export function updateCamera(cam,local,axis,dt,scale){
 if(axis.x)cam.lookX=(cam.lookX||0)+(-axis.x*20/scale-(cam.lookX||0))*Math.min(1,dt*8);
 else if(axis.y)cam.lookX=(cam.lookX||0)*(1-Math.min(1,dt*8));
 cam.lookY=0;cam.x=local.x+(cam.lookX||0);cam.y=local.y;return cam;
}
