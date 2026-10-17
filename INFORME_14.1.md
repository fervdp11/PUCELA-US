# INFORME 14.1.0 — rendimiento, movimiento de bots, reconexiones y correcciones finales

Versión de trabajo: el ZIP **PUCELA-US-14.0.1** recibido. No se ha rehecho nada de lo anterior: solo los siete puntos del encargo.

## 1. Qué provocaba los tirones y el movimiento a saltos

| Causa encontrada | Dónde | Solución |
| --- | --- | --- |
| Cada petición copiaba la sala entera (`structuredClone`, ≈45 KB) antes de tocarla: con 10 jugadores a 10 Hz, ~100 copias/s. Era la operación más cara del servidor. | `server/memory-store.js` | Nuevo `mutate()` sin copia para el pulso (que valida antes de modificar), el reloj de bots y las mesas WebSocket. Las demás acciones siguen siendo transaccionales. |
| La IA de los bots se ejecutaba en **cada petición** de cada jugador (40–100 veces/s en vez de 10) y las posiciones salían con marcas de tiempo irregulares (5, 30, 90 ms…), imposibles de interpolar con suavidad. | `game/engine.js` (`tick`) | Simulación en pasos fijos de 100 ms. Cada muestra de un bot está separada exactamente 100 ms. |
| Retardo de interpolación fijo de 120 ms: con datos móviles (RTT 80–200 ms) el cliente se quedaba sin muestra, el bot se paraba y luego avanzaba de golpe. | `public/remote-motion.js` | El retardo se adapta a lo que tardan de verdad las muestras (sube rápido, baja despacio, 120–420 ms). |
| JSON sin comprimir: 12–16 KB por instantánea; más de 1,2 MB/s de bajada en una sala de 10. | `server/node.js` | gzip (nivel 3, ~0,07 ms): una instantánea típica pasa de 16 023 a 2 829 bytes. Estáticos comprimidos una vez y con `ETag` (respuesta 304 en las recargas). |
| Dibujo: 30–50 degradados radiales nuevos por fotograma en el Colegio (el mayor coste medido), rejillas de alcantarilla con recortes en cada fotograma, estaciones y conductos fuera de pantalla dibujados igualmente, `getBoundingClientRect()` y variables CSS reescritas en cada fotograma o instantánea. | `public/render.js`, `public/interactions.js`, `public/client.js` | Sprites pre-pintados (`ImageBitmap`), descarte de lo que está fuera de la vista, tamaño del lienzo por `ResizeObserver`, el DOM solo se toca si cambia. |
| `backdrop-filter: blur()` en botones de acción, paneles y reunión: el navegador volvía a desenfocar el mapa en cada fotograma. | `public/upgrade.css` | Eliminado sobre el mapa (los fondos ya eran opacos al 85–95 %). |
| Sin adaptación a móviles lentos. | `public/render.js` | Resolución dinámica: si no se sostienen ~42 fps se dibuja con menos densidad (1,5 → 1,0 → 0,8) y se recupera cuando sobra tiempo. |

## 2. Qué provocaba «Reconectando con el servidor»

| Causa | Corrección |
| --- | --- |
| **Un solo pulso fallido** (un 502 puntual del proxy, una respuesta perdida en datos móviles) mostraba el aviso. | El aviso solo aparece tras ≥2 fallos y ≥2,5 s sin ninguna respuesta. Desaparece en cuanto vuelve una respuesta. |
| Un pulso atascado bloqueaba el bucle de red **7 s** (tiempo de espera de `fetch`). | Pulso con 3 s de espera (es idempotente gracias a la secuencia de movimiento); las acciones mantienen 7 s. Reintento inmediato con el evento `online` y retroceso máximo de 1,2 s. |
| `keepAliveTimeout` de Node en 5 s detrás de un balanceador (Northflank) que reutiliza conexiones más tiempo: carrera clásica que produce 502/503 esporádicos. | `keepAliveTimeout` 65 s, `headersTimeout` 66 s. *Preventivo: no se puede reproducir sin el proxy real.* |
| Saturación de CPU en instancias pequeñas (ver mediciones a 0,1 vCPU): respuestas de 400 ms y picos que llegan al tiempo de espera. | Reducción de CPU del punto 1. |
| Un corte de 3,5 s borraba la misión que se estaba haciendo. | La misión se conserva 15 s (el movimiento sigue parándose a los 3,5 s). |
| Detrás del proxy todas las peticiones llegan con la IP del balanceador: el límite de 50 entradas/10 min se aplicaba a **todo el servidor** («Demasiadas entradas»). | Se usa la última dirección de `X-Forwarded-For` (la que añade el proxy). |

Lo que **no depende del código**: cobertura Wi-Fi/datos móviles, suspensión de la pestaña en segundo plano, reinicios o falta de memoria del plan de Northflank. El aviso sigue apareciendo cuando de verdad no hay conexión durante más de 2,5 s (no se ha ocultado).

## 3. Otros puntos

- **Mochila de espaldas** (`public/characters.js`): de espaldas ya no se dibuja detrás del cuerpo desplazada a la izquierda; se dibuja centrada sobre la espalda, entre los brazos, con tirantes, solapa y bolsillo, después del rebote del torso (no flota al caminar). La bandolera muestra la correa en diagonal y la bolsa en la cadera; la mochila deportiva ya no deja su tira lateral. Frente y perfiles sin cambios.
- **Avisos** (`public/client.js`, `public/style.css`, `public/index.html`): pila centrada abajo. El aviso antiguo estaba centrado con `translateX(-50%)`, pero su animación de entrada sustituía esa transformación: por eso acababa a la derecha encima de USAR/MATAR. Ahora se busca el hueco libre entre joystick/inventario y botones; si no cabe, la pila se apoya encima de los controles. Máximo 3 (2 en pantallas bajas), sin solaparse, textos repetidos no se duplican, animación de entrada y salida. El aviso de reconexión forma parte de la pila.
- **Alarma de sabotaje**: sustituida la sirena de onda de sierra con deslizamiento de tono (sonaba a gemido) por una alarma electrónica de dos tonos fijos (960/720 Hz, pulsos de 880 Hz en sabotajes leves), sin voces ni deslizamientos, programada con el reloj de audio, por el canal de efectos (respeta volumen y silencio), una sola a la vez y cortada al instante al repararse. El aviso de tres notas al empezar el sabotaje se ha quitado para no mezclar sonidos.
- **Caravana** (`public/disembark.js`): en la bajada recupera los colores del resto del juego (carrocería crema, franjas verde azulado y coral, ventanas azul cielo, ruedas grafito, toldo coral/crema, contornos #2a3a44). El cielo, el suelo y el farolillo siguen blanco/violeta; la viñeta violeta se ha suavizado para no teñir la caravana. Animación y personajes intactos.

## 4. Mediciones reales (no son de un móvil físico)

**Servidor, CPU total en 24 s** (incluye ~0,6 s de arranque), clientes simulados a 10 Hz:

| Sala | 14.0.1 | 14.1.0 |
| --- | --- | --- |
| 4 personas + 6 bots | 2 237 ms | 1 447 ms |
| 9 personas + 1 bot | 2 753 ms | 1 938 ms |
| 1 persona + 9 bots | 1 350 ms | 1 076 ms |

**Servidor limitado a 0,1 vCPU** (cgroup, como un plan pequeño), 8 personas + 2 bots, red Wi-Fi simulada, bots dibujados con el código real del cliente a 60 fps:

| | 14.0.1 | 14.1.0 |
| --- | --- | --- |
| Latencia p50 / p95 | 100 / 396 ms | 55 / 90 ms |
| Fotogramas con bot «parado» en mitad de un movimiento | 3,49 % | 0,75 % |
| Fotogramas con salto (>1,9× velocidad) | 4,56 % | 1,17 % |
| Variación de velocidad entre fotogramas (p95) | 0,676 | 0,146 |

Sin límite de CPU y red móvil simulada (RTT 70–160 ms con picos de hasta 400 ms): variación p95 0,320 → 0,150; paradas 1,20 % → 0,36 %; saltos 2,43 % → 1,46 %.

**Cliente** en Chromium sin GPU (raster por CPU), 844×390 a densidad 2, Colegio con 7 bots, 10 s caminando: tiempo ocupado del hilo principal 6 575 / 7 846 ms → 5 418 / 4 959 ms (dos ejecuciones de cada); JavaScript del fotograma 2 396 / 2 866 → 1 597 / 1 626 ms. Reunión: 44–47 → 60 fps. El juego ya alcanzaba ~59 fps en este equipo durante la partida; la diferencia se nota en el margen libre por fotograma, que es lo que decide en un móvil más lento.

## 5. Pruebas

Ejecutadas:

- `npm test`: 199 pruebas, 0 fallos (195 anteriores + 4 nuevas en `tests/version14_1.test.js`: pasos fijos de bots, `mutate` sin copia y acciones transaccionales, gzip/ETag/keep-alive/IP del proxy, retardo adaptativo).
- `npm run test:benchmark`: los bots terminan sus tareas en los cuatro mapas.
- Partidas reales en Chromium (escritorio 1366×768 y móvil 844×390 táctil) contra el servidor: sin errores de consola; avisos centrados abajo sin tocar botones, joystick ni inventario y sin solaparse; corte de red de 1,2 s sin aviso, corte de 5 s con aviso, el aviso desaparece 0,3–0,5 s después de volver la red; alarma: solo tonos cuadrados de 960/720/880 Hz, ninguna onda de sierra ni deslizamiento de frecuencia (la 14.0.1 producía 13 y 28), ningún tono tras la reparación, sin solapes.
- ZIP: extraído en una carpeta nueva → `npm test` (199/199) → copia solo de lo que mete el `Dockerfile` (`package.json`, `public`, `game`, `server`) → `PORT=8080 npm start`: escucha en 0.0.0.0 (accesible por la IP de la máquina, no solo localhost), `/api/health` responde 14.1.0, estáticos con gzip/ETag/keep-alive 65 s, handshake WebSocket de mesas (101) y partidas en Chromium en los cuatro mapas (Colegio, Club, Gym en móvil, Campo Grande) sin errores de consola.

No ejecutadas:

- Despliegue real en Northflank y en GitHub (no tengo acceso a esas cuentas).
- `docker build`: el registro de Docker Hub está bloqueado en este entorno; se ha reproducido el contenido de la imagen copiando las mismas carpetas que el `Dockerfile`.
- Móviles físicos, Safari/iOS, Firefox y GPU real. `npm run test:ui` sigue omitido (necesita `happy-dom` y `@napi-rs/canvas`).
