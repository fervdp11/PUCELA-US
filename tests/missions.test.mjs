// Contratos de las misiones. Sin DOM y sin dependencias: se ejecuta siempre.
//
// Comprueba que cada tipo de tarea de los tres mapas de la BETA tiene un mecanismo que
// lo monta, que el reto del servidor y su validación encajan con la respuesta
// que dan los bots, y que la autoridad sigue en el servidor: el cliente no
// puede dar por buena una tarea por su cuenta.
//
// La comprobación visual y de gestos se hace aparte, en un navegador real.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {WORLDS} from '../public/worlds.js';
import {challenge,solution,minDuration} from '../game/tasks.js';
import {botAnswer} from '../game/bots.js';
import {resolveDef} from '../public/themed-defs.js';

// Tipos que el servidor sigue sabiendo validar (algunos ya no tienen estación
// en la BETA, pero se conservan como contrato del motor de tareas).
const CORE_TASKS=['chalk','desks','lights','wires','german','computer','documents','delivery',
 'exams','folders','book','supplies','bell','papers','code','bath'];
const CLUB_TASKS=['dj','speaker','stock','vip','power','download','calibrate','trash'];
const GYM_TASKS=['treadmill','weights','plates','scoreboard','ventilation','lockers','equipment','basketball','spinning','hydration','refill'];
const HOUSE_TASKS=['washer','cook','appliance'];
const ALL=[...new Set([...CORE_TASKS,...CLUB_TASKS,...GYM_TASKS,...HOUSE_TASKS])];
const MAPS=['club','gym','house'];

test('la BETA tiene exactamente tres mapas con sus tareas y sabotajes', () => {
 assert.deepEqual(Object.keys(WORLDS).sort(),[...MAPS].sort());
 assert.deepEqual(MAPS.map(id=>WORLDS[id].name),['Moss Club','El Palero Gym','Latasa´s House']);
 for(const id of MAPS){
  const w=WORLDS[id];
  assert.ok(w,`falta el mapa ${id}`);
  assert.ok(w.STATIONS.length>=14,`${id} tiene muy pocas estaciones: ${w.STATIONS.length}`);
  assert.ok(w.REPAIRS.length>=8,`${id} tiene muy pocos paneles de reparación`);
  assert.ok(Object.keys(w.SABOTAGES).length>=5,`${id} tiene muy pocos sabotajes`);
  assert.equal(w.FLOORS.length,1,`${id} debe tener una sola planta`);
  assert.ok(w.LOCATOR_CONSOLE&&w.CAMERA_CONSOLE,`${id} necesita cámaras y terminal de localización`);
  assert.notEqual(w.LOCATOR_CONSOLE.room,w.CAMERA_CONSOLE.room,`${id}: el localizador debe estar en otra sala que las cámaras`);
 }
 // La casa: tareas domésticas propias.
 const kinds=new Set(WORLDS.house.STATIONS.map(s=>s.kind));
 for(const k of ['washer','cook','appliance','power','wires','supplies'])assert.ok(kinds.has(k),`la casa no tiene la tarea ${k}`);
 const gym=new Set(WORLDS.gym.STATIONS.map(s=>s.kind));
 for(const k of ['treadmill','weights','plates','refill','equipment'])assert.ok(gym.has(k),`el gimnasio no tiene la tarea ${k}`);
});

test('cada tipo de tarea de cada mapa tiene un mecanismo que lo monta', () => {
 for(const id of MAPS){
  const kinds=[...new Set([...WORLDS[id].STATIONS.map(s=>s.kind),...Object.values(WORLDS[id].SABOTAGES).map(r=>r.repairKind)])];
  for(const kind of kinds){
   assert.ok(ALL.includes(kind),`${id}: la tarea «${kind}» no tiene mecanismo asignado`);
   assert.ok(resolveDef(id,kind,challenge(kind,id)),`${id}: la tarea «${kind}» no tiene minijuego temático`);
  }
 }
});

test('el reto y la validación del servidor aceptan la respuesta de los bots', () => {
 for(const kind of ALL){
  for(let i=0;i<24;i++){
   const c=challenge(kind,'club');
   const answer=botAnswer(kind,c);
   assert.notEqual(answer,null,`${kind}: los bots no saben resolver esta tarea`);
   assert.ok(solution(kind,c,answer),`${kind}: el servidor rechaza la respuesta correcta`);
  }
 }
});

test('una respuesta vacía o inventada nunca completa una tarea', () => {
 const fakes=[null,undefined,{},[],0,1,'',true,'ok',[0,0,0,0],[1,1,1],{levels:[0,0,0]},{sequence:[],fuses:[1,1,1]}];
 for(const kind of ALL){
  for(let i=0;i<12;i++){
   const c=challenge(kind,'house'),real=JSON.stringify(botAnswer(kind,c));
   for(const fake of fakes){
    // Algunas tareas tienen respuestas tan simples (un índice, por ejemplo) que
    // un valor de la lista puede coincidir con la correcta: ese no se juzga.
    if(JSON.stringify(fake)===real)continue;
    // El contrato es que la validación resulte falsa, no que devuelva el
    // literal `false`: varias ramas cortan con el propio valor recibido.
    assert.ok(!solution(kind,c,fake),
     `${kind}: el servidor acepta una respuesta falsa (${JSON.stringify(fake)})`);
   }
  }
 }
});

test('todas las tareas tienen duración mínima en el servidor', () => {
 for(const kind of ALL)
  assert.ok(minDuration[kind]>=2000,`${kind}: falta duración mínima o es demasiado corta`);
});

test('los temas de cada mapa generan retos válidos', () => {
 for(const theme of MAPS)
  for(const kind of ALL){
   const c=challenge(kind,theme);
   assert.ok(c&&typeof c==='object',`${kind}/${theme}: reto no válido`);
   assert.ok(solution(kind,c,botAnswer(kind,c)),`${kind}/${theme}: la validación falla`);
  }
});

test('ninguna misión usa controles de formulario ni botón de comprobación', async () => {
 const files=['public/tasks.js','public/themed-tasks.js','public/themed-defs.js','public/task-kit.js','public/mechanism.js'];
 for(const file of files){
  const code=await readFile(new URL('../'+file,import.meta.url),'utf8');
  for(const banned of ['type="range"','<progress','<select','<meter','type="number"','<input'])
   assert.ok(!code.includes(banned),`${file} todavía usa ${banned}`);
  // El único botón permitido en el armazón es ninguno: la tarea se cierra sola.
  assert.ok(!/class="[^"]*mech-submit/.test(code),`${file} conserva un botón de comprobación`);
 }
});

test('el taller de instrumentos expone las piezas que usan las misiones', async () => {
 const mech=await import('../public/mechanism.js');
 for(const part of ['createMechanism','Hardware','rotaryControl','linearControl','patchControl',
  'swipeControl','chassis','stageBox','makeCarrier','inside','rounded','STAGE'])
  assert.ok(mech[part],`falta la pieza «${part}» del taller`);
});
