# PUCELA-US OPTIMIZADO — 14.3.1

Base: `PUCELA-US-14.3.0.zip`, entregado por el usuario. Se conservan los cuatro mapas, las dos plantas del colegio, personajes, accesorios, tareas, sabotajes, roles, objetos, bots, reuniones, salas y mesas.

## Problemas comprobados y cambios

- El movimiento principal usaba HTTP secuencial. El WebSocket de 33 ms servía exclusivamente a las mesas. Ahora la partida tiene WebSocket propio: entradas al moverse y estados a 20 Hz (entradas en reposo a 4 Hz), sin esperar una respuesta para enviar la siguiente entrada. Las mesas conservan su canal.
- Predicción local a pasos de 1/60 s, independiente del dibujo; confirmación acumulativa y repetición de todas las entradas pendientes. Secuencias y épocas descartan duplicados y movimientos anteriores a traslados. Se suaviza la corrección visual y se conserva la colisión autoritativa compartida.
- Estados incrementales y movimientos compactos: no se repite todo el aspecto de cada personaje. Interpolación adaptativa desde 80 ms y extrapolación limitada a 70 ms.
- Alternativa HTTP y recuperación de conexiones aparentemente abiertas que dejan de entregar estados. Se limitaron colas y buffers; un destinatario lento no bloquea los demás. El pase sigue firmándose aunque la partida termine por un temporizador o un bot.
- Las puertas recreaban geometría y sus índices repetidamente. Se reutilizan variantes acotadas y se actualizan solo las celdas de navegación afectadas. La navegación base se prepara antes de aceptar conexiones. La simulación tiene reloj de 100 ms y recuperación acotada de tiempo pendiente.
- El perfil del navegador identificó lecturas de píxeles costosas al generar contornos. Los lienzos auxiliares utilizan `willReadFrequently`, conservando las siluetas. La compresión inicial de archivos se hace de forma asíncrona y se comparte entre peticiones.

## Mediciones locales

Node 24.19.0. Cada escenario de red duró 4 segundos; CPU del proceso servidor, expresada como porcentaje de **un núcleo**. Tráfico de bajada: cuerpos HTTP comprimidos o tramas WebSocket; no incluye todas las cabeceras de transporte.

| Escenario | RTT simulado | Estados/s por cliente | CPU | RAM RSS | Bajada total |
|---|---:|---:|---:|---:|---:|
| Original: 10 jugadores | 100 ms | 8.50 | 6.4% | 93.9 MiB | 189.7 KiB/s |
| Optimizado: 10 jugadores | 100 ms | 19.50 | 10.7% | 93.3 MiB | 149.2 KiB/s |
| Optimizado: 20 jugadores / 2 salas | 200 ms | 19.00 | 20.4% | 130.3 MiB | 295.2 KiB/s |
| 4 humanos + 36 bots / 4 mapas | 100 ms | 19.25 | 22.3% | 105.5 MiB | 55.8 KiB/s |

Con diez jugadores, la bajada se redujo un 21,4% y la antigüedad mediana de la muestra remota recibida pasó de 162 a 120 ms, antes de interpolarla. La confirmación mediana propia pasó de 104 a 121 ms; no se afirma que todos los indicadores de latencia bajen. El ciclo de transmisión medio fue de 3,2 ms y el máximo de 5,4 ms en ese escenario. Con 36 bots hubo un paso de simulación de 42,1 ms: no se han eliminado todos los picos.

Microprueba de 100 consultas de colisión durante puertas cerradas en el gimnasio: 1.984,8 ms en el original frente a 36,0 ms reutilizando la geometría. No equivale a medir una partida completa.

Chromium 153, 1280×720, renderizado por CPU: colegio 60 FPS; discoteca 51,7; gimnasio 54,0; parque 60. Móvil emulado 390×844, DPR 2: aproximadamente 60 FPS en el vestíbulo. No son mediciones de un móvil físico. También se probaron gráficos con SwiftShader, cuya emulación de GPU fue muy lenta en este entorno; no se certifican 60 FPS universales.

## Comprobaciones

- `npm test`: **224 pruebas correctas, 0 fallos**; incluye las 212 originales y 12 nuevas.
- WebSockets reales con cuatro clientes y RTT simulados de 0/80/200/400 ms; unión a salas, posiciones, parada, duplicados, secuencias, jitter, épocas de traslado, reconexión, cliente lento, mesas y firmas del pase.
- Navegador real: cuatro mapas, movimiento y reconciliación, reconexión, interrupción de estados durante 3,5 s, recuperación HTTP y joystick con eventos táctiles reales del navegador, incluso fuera de su zona. Sin errores de ejecución en esas comprobaciones; posición local y confirmada coincidentes tras parar.
- Arranque y archivos equivalentes al `COPY` del Dockerfile, con su comando y límite de memoria, comprobados sin dependencias externas de ejecución.
- `npm run test:benchmark`: completó los ocho escenarios originales de bots, en los cuatro mapas.
- `npm run test:network-benchmark` y `npm run test:browser` permiten repetir las mediciones. Playwright es solo una dependencia de desarrollo.

No se desplegó en Fly.io ni se ejecutó `docker build` porque Docker no está disponible. El antiguo `tests/hosted.test.mjs` exige una compilación Worker/D1 ausente del ZIP y no corresponde al servidor Node/Fly. Las pruebas son locales y breves; no sustituyen una prueba prolongada en tu alojamiento y dispositivos.

## Archivos modificados

- Servidor: `server/node.js`, nuevo `server/realtime.js`.
- Motor: `game/api.js`, `game/engine.js`, `game/bots.js`.
- Cliente: `public/client.js`, nuevo `public/netcode.js`, `remote-motion.js`, `visibility.js`, `school.js`, `club.js`, `gym.js`, `render.js`, `interactions.js`, `index.html`.
- Configuración/documentación: `package.json`, `package-lock.json`, `README.md` y este informe.
- Pruebas: `tests/realtime.test.js`, `tests/realtime-benchmark.mjs`, `tests/browser-qa.mjs` y `tests/legacy.test.js`. Nueve archivos históricos se agruparon en este último, conservando sus comprobaciones, para entregar **99 archivos**.

El Dockerfile, puerto 3000 y configuración de alojamiento originales se conservan. Las salas siguen en memoria: una instancia de servidor, como antes; varias máquinas requerirían compartir su estado. Conserva `SANAGUS_SECRET` entre despliegues.
