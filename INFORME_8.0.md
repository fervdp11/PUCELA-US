# Sanagus AS 8.0.0 — informe de entrega

## Cambios implementados

- Campo Grande es el cuarto mapa seleccionable: parque compacto inspirado en el plano, sin calles exteriores. Valla continua con colisión para vivos y espectros, lago al norte, fuente circular con chorros animados, senderos conectados, jardines, rosaleda, quiosco y caseta de mantenimiento. El agua tiene orilla irregular, reflejos y ondas. Ochenta árboles con troncos opacos y copas que se atenúan cuando tapan personajes.
- Fauna original 2D con sombras, volumen y pasos animados: pavos reales, patos y ardillas. El servidor simula sus desplazamientos, respeta obstáculos y valla, y envía las mismas identidades y posiciones a todos los clientes. El cliente interpola cada animal cada fotograma. No son jugadores falsos ni tienen roles.
- Parque jugable: quince estaciones temáticas de riego, semillas, residuos, filtración, agua, fuente, electricidad, herramientas, suministros, cámaras, farolas y permisos. Reutilizan trece mecanismos físicos ya existentes y validados; no se presentan como quince minijuegos de mecánica nueva. Cuatro cámaras, cuatro circuitos aislados de tres accesos de mantenimiento, siete sabotajes con ocho paneles físicos exclusivos, dos terminales críticos coordinados y botón central sobre mesa. Llegada, música y expulsión ambientadas en el parque. Sin profesores.
- Gym rediseñado de verdad: doce espacios desiguales, piscina cubierta con agua animada y pasillo perimetral, yoga/pilates, vestuarios y duchas ampliados, pabellón asimétrico, cruces, accesos laterales y recorridos alternativos. Dirección desaparece; sus archivos se trasladan a Recepción. Se mantienen cámaras, tareas, conductos, sabotajes y modos anteriores.
- Los bots reservan objetivos diversos y mantienen planes estables. Alternan tareas con patrullas, investigación de incidentes observados, seguimiento breve de sospechosos visibles y uso real de cámaras cuando están cerca. Sus observaciones de vigilancia requieren señal y línea de visión. Las reparaciones urgentes interrumpen las investigaciones sin retraso añadido. No cambia la velocidad ni la duración de cada minijuego. Las exploraciones tienen límite y vuelven al trabajo.
- Todos los bots esperan los votos de humanos vivos conectados; pueden votar cuando quedan diez segundos. La decisión se calcula al emitir el voto con la información más reciente. Validación en servidor y rechazo de duplicados. Tripulantes en situaciones críticas votan a una persona: estiman el riesgo a partir del número configurado de impostores y expulsiones confirmadas públicamente, sin leer roles ajenos. El cierre por tiempo aplica también esa regla.
- Presentación de diez jugadores en cinco y cinco; filas adaptativas al girar, con nombres y accesorios. El texto del rol recupera todo el espacio durante la lectura.
- Barra verde arriba a la izquierda con el texto «Tareas completadas». Muestra el progreso colectivo sincronizado, sin cantidades ni porcentajes visibles, también en el panel lateral. Se conserva la falta de señal durante el sabotaje de comunicaciones.
- Correcciones adicionales: apariciones iniciales validadas para evitar la mesa; tolerancia subpíxel al alcanzar rutas; un solo presupuesto de desplazamiento por tick; impostores sin pausas artificiales en mitad de su camino; caché de bordes para colisiones y liberación de superficies del mapa al cambiar de destino para limitar memoria.

## Pruebas superadas

- 148 pruebas automatizadas del motor: cuatro mapas, geometría, colisiones, tareas, reglas privadas, red, roles, sabotajes, cámaras, asesinatos, reportes, votos anónimos, reconexión, bots y limpieza de salas. Cero fallos y cero omitidas.
- 22 pruebas DOM/Canvas nativo: cliente completo escritorio/móvil, progreso sin cifras y avance real, gestos de las 34 mecánicas existentes, diez máquinas Gym en ambas orientaciones, joystick con otro dedo, chat estable, selectores y temporizador. Incluyen los quince terminales del parque, render de cuatro mapas en 390×844 y 844×390, fauna, agua animada, minimapa y filas 5+5. Cero fallos y cero omitidas.
- Worker compilado y D1 local: cuatro sesiones independientes en cada uno de los cuatro mapas; acceso público/privado, cámaras, tareas, reparaciones, movimiento, conductos aislados, fauna compartida, asesinato/reporte, votos concurrentes y victoria. Prueba atravesando las rutas HTTP reales de la compilación; no es una simulación de interfaz.
- Imágenes inspeccionadas generadas directamente por el renderizador Canvas: planos de Gym y parque, aparición y especies animales. No se usaron capturas de un navegador.

## Medición de comportamiento

Ocho pares de simulaciones: dos conjuntos de tareas por mapa, tres bots tripulantes por conjunto, seis tareas por bot. Cada par clona la misma sala, IDs, asignaciones, colores, velocidad y tiempos mínimos. En el control se deshabilitan únicamente las investigaciones. No hay asesinatos, profesores o sabotajes en esta medición para poder comparar el tiempo de tareas. Veinticuatro recorridos de bots por condición.

| Mapa / conjunto | Control, media por bot | Con investigación | Aumento |
| --- | ---: | ---: | ---: |
| club / 1 | 62.4 s | 88.3 s | 41,4 % |
| club / 2 | 64.8 s | 86.8 s | 34,1 % |
| gym / 1 | 78.9 s | 106.5 s | 35,0 % |
| gym / 2 | 74.9 s | 103.1 s | 37,7 % |
| park / 1 | 51.2 s | 77.0 s | 50,4 % |
| park / 2 | 49.8 s | 65.4 s | 31,5 % |
| school / 1 | 79.1 s | 107.5 s | 35,9 % |
| school / 2 | 81.5 s | 112.5 s | 38,1 % |

Aumento ponderado observado: **37,7 %** en el tiempo por bot para terminar su conjunto, próximo al objetivo aproximado del 35 %. No es una garantía de duración de todas las partidas: rutas, personalidad, cámaras, tareas y acontecimientos cambian el resultado. Archivo reproducible: tests/bot-benchmark.mjs; ejecutar npm run test:benchmark.

## Archivos principales

Nuevos: public/park.js, public/park-art.js, public/lineup.js, game/wildlife.js, game/bot-behavior.js, tests/version8.test.js, tests/interface8.test.mjs y tests/bot-benchmark.mjs.
Modificados: public/gym.js, public/gym-art.js, public/worlds.js, public/content.js, public/visibility.js, public/render.js, public/scenery.js, public/tasks.js, public/client.js, public/index.html, public/style.css, public/repair-layout.js, public/journey.js, public/expulsion.js, public/finale.js, public/soundscape.js, game/engine.js, game/bots.js, game/social.js, game/tasks.js, pruebas de integración y regresión, README y versión del paquete.

## Límites de validación y ejecución

No se ha abierto un navegador real ni probado un teléfono físico, Safari/iOS o Android: el entorno no ofrece control de navegador compatible. DOM/Canvas nativo y coordenadas táctiles no prueban el aspecto CSS final, ergonomía o FPS de un móvil real. Las pruebas de varios clientes son HTTP/D1 y Node, no pestañas abiertas ni dispositivos conectados a Internet. No se afirma una tasa de FPS medida en móviles.

El plano se ha adaptado de forma compacta y original; no reproduce cada árbol ni la escala geográfica exacta. La piscina es un obstáculo con paseo transitable: no incorpora natación. La fauna es ambiental y no altera roles o victorias. La IA conserva reglas y probabilidades, sin conversación generativa.

D1 limpia registros abandonados durante solicitudes y rechaza salas caducadas; no se añadió cron externo. Node conserva limpieza periódica. El ZIP incluye cliente, motor, servidor, pruebas e instrucciones y se ejecuta con Node 24 sin instalar dependencias para jugar. Las pruebas opcionales de interfaz requieren Happy DOM y Canvas; las del Worker requieren las dependencias del alojamiento administrado, que no van dentro del ZIP. No incluye node_modules ni artefactos compilados del sitio.

## Arranque

Descomprime conservando public, game, server y tests. Desde esa carpeta: node server/node.js. Abre http://localhost:3000. Para Internet, un único servicio Node que ejecute ese comando y sirva página/API desde el mismo origen, con PORT del proveedor y HTTPS. README detalla configuración, Docker y uso en Wi-Fi. Selecciona Campo Grande en el ordenador del lobby. Los mapas Colegio y Club se conservan.
