import {mountThemed} from './themed-tasks.js';
import {resolveDef} from './themed-defs.js';

// Punto de entrada de las tareas. Cada pareja (mapa, tipo de tarea) tiene su
// propio minijuego en themed-defs.js / themed-tasks.js; el reto y la validación
// siguen siendo los del servidor (game/tasks.js).
export function mountTask(root,task,options){
 const def=resolveDef(task.theme||'school',task.kind,task.challenge);
 if(!def){root.innerHTML='<p class="mech-brief">Esta tarea no está disponible.</p>';return ()=>{};}
 return mountThemed(root,task,options,def);
}
