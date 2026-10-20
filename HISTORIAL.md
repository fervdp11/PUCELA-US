# PUCELA US BETA (16.1.0-beta)

Base: 16.0.0-beta. Se conservan todas las funciones.

## Cambios
- **Icono:** nuevos archivos versionados (`pucela-beta-96/192/256/512.png`, `-maskable-512`, `-apple-180`) y `favicon.ico` multitamaño (16–256 px) con el personaje morado; manifiesto con 96–512 px, accesos directos con icono, `msapplication-TileImage`, enlace al manifiesto con versión y el service worker borra cachés antiguas. Al cambiar las URL, Windows/Android/iOS ya no reutilizan el icono viejo. **Para renovar uno ya instalado:** en Windows, desinstala la app (Inicio → clic derecho → Desinstalar o `edge://apps` / `chrome://apps`) y vuelve a instalarla desde la web; en Android, elimina el acceso o app y vuelve a «Instalar»; en iPhone, borra el icono de la pantalla de inicio y vuelve a «Añadir a pantalla de inicio» desde Safari.
- Ajustes: «Instalar en el móvil» → **«Instalar»**.
- **Sala previa:** sin círculos bajo las mesas; borde amarillo luminoso que sigue la forma de la mesa (u objeto) más cercana al alcance, solo una a la vez y oculto con cualquier interfaz abierta; E abre exactamente esa mesa. Botón **«Iniciar partida»** centrado abajo solo para el líder sin menús abiertos (mismas validaciones; sin duplicado en el panel).
- **Plano en reuniones:** no muestra tu posición ni una sala falsa (el indicador de zona dice «Reunión»).
- **Cámaras:** sin botón propio; se abren con E en su terminal. Tareas, paneles y cofres separados de los terminales de cámaras y de localización (≥2,8 casillas); siempre se elige el interactuable más cercano.
- **Jaula:** inmovilidad total en cliente (teclado, joystick) y servidor; al salir se recupera el movimiento.
- **Red:** estados y entradas cada **30 ms** (antes 40 ms) y retardo de interpolación 66 ms (antes 80 ms). Medido: ~31–32 estados/s por jugador con 1–2 salas de 10 humanos y ~114–120 MB de RSS. La compensación de latencia de los asesinatos y la autoridad del servidor no cambian.
- **Roles familiares** en Latasa´s House: cada jugador sin rol especial recibe un parentesco único (El hijo, La hija, El abuelo, El tío…); nadie aparece como «Familia».
- **Pase:** las animaciones mueven los brazos y manos reales del personaje (sin extremidades duplicadas): saludo, saltito con anticipación/gravedad/aterrizaje, giro, baile y aplauso con choque de manos real. Gorro de chef rediseñado y casco espacial ajustado a la cabeza (lienzo y SVG).
- **Dardos:** la altura y la posición se fijan en el instante exacto de pulsar (congelado en el cliente y validado en el servidor con hasta 700 ms de latencia). **Carrera de pulsaciones:** cada pulsación real cuenta una vez; mantener la tecla o el dedo no suma.
- **El enchufe:** el aviso ya no menciona plantas. **Libreta:** una consulta de rol por partida (servidor); impostores y tripulantes sin rol aparecen como «No tiene rol».

## Pruebas ejecutadas
- `npm test`: todas en verde (nuevas: libreta, roles familiares, jaula, intervalo de red y dardos con latencia).
- `tests/bot-benchmark.mjs`, `tests/realtime-benchmark.mjs` y `tests/browser-qa.mjs` (PC y móvil) en verde, sin errores de página.

# PUCELA US BETA (16.0.0-beta)

Base: 15.0.0. Intervalo de red sin cambios: estados y entradas cada **40 ms** (medido ~23,4 estados/s por cliente con 2 salas de 10 y 200 ms de RTT).

## Cambios
- **Mapas:** solo Moss Club (mismo plano, esquina sureste recta para que la puerta este tenga hueco completo), El Palero Gym (rediseñado con rutas alternativas: 8 salas con 3+ puertas) y Latasa´s House (casa familiar de 66×45 con garaje, lavadero, cocina, comedor, salón, despacho, sala de juegos, dormitorios, baños y aseo). Eliminados Colegio, Campo Grande, profesores, plantas/escaleras y la opción «Plantas». Validado: todo umbral libre, estaciones/paneles/conductos/consolas alcanzables, sin muebles solapados.
- **Misiones:** máquinas nuevas con chasis, tornillos, cristal y animación (lavadora, sartén/tortilla, tostadora con tornillos en orden y resistencia, depósito de cafetera/batidos/hielo); 17 tareas de la casa y equivalentes del gym; marco común con volumen y tornillos para todas las tareas. Todas validadas en servidor y resueltas por los bots.
- **Plano holográfico** semitransparente en tres modos: azul (salas y tareas), verde (localizador) y rojo (sabotaje). No bloquea el movimiento, no tapa los controles táctiles y se abre también durante las reuniones (junto con los ajustes).
- **Terminal de localización** en cada mapa (Reservado, Recepción, Despacho; distinto de las cámaras): personas por sala con iconos, sin identidades; los pasillos no cuentan; un cuerpo cuenta 10 s; validado en servidor; los sabotajes de comunicaciones cortan la señal.
- **Sabotajes:** espera normal −40 % (112,5 → 67,5 s); círculos por avería y por puertas de sala que se llenan de luz al recargarse (sin números) y se pulsan encendidos; el impostor abre el plano rojo en cualquier momento (G). Categorías con espera cruzada de 20 s que nunca acorta una espera mayor; puertas 10 s, sin cerrarse sobre nadie. Nueva avería «Fuga de agua» en la casa.
- **Rol Latasa** (impostor de la casa): el servidor decide un 20 % de fallos; la víctima esquiva (escena para la víctima, aviso al atacante, testigos lo ven en el mapa) y el arma espera ≥10 s.
- **Aspectos:** el color principal domina capucha, torso, mangas y pantalón largo; las prendas solo añaden detalles; eliminado «Color del contorno».
- **Menú e intro:** carretera desde el primer fotograma, sin fondo gris; el título PUCELA US (BETA) aparece al alcanzar la caravana. Etiqueta BETA en el menú, manifiesto PWA «PUCELA US BETA» con el icono y accesos directos. Ajustes/Instalar con tarjetas iguales y texto contenido. Sin rótulos bajo los objetos de la caravana (aro en el más cercano). **Dardos** sustituyen al Air Hockey (1.ª pulsación altura, 2.ª posición; puntuación de diana real validada en servidor).
- **Votaciones:** desplegable de nombres sin cortar la última opción (portal medido con la vista visible) y cierre automático tras enviar una frase.
- **Gráficos:** oclusión ambiental en suelos a pie de muro y en rincones, sombra de techo y zócalo en las caras, biseles y pilares en las esquinas; arte nuevo para la casa y piezas nuevas del gym.

## Pruebas ejecutadas
- `npm test`: 222/222 (pruebas del Colegio/Campo Grande retiradas o portadas a los mapas actuales; nuevas de Latasa, localizador, puertas/categorías, dardos y plano).
- `node tests/bot-benchmark.mjs` en club, gym y house: sin bloqueos.
- `node tests/realtime-benchmark.mjs`: ~23,4 estados/s por jugador, ~110–118 MB RSS, ~31 % de un núcleo.
- `node tests/browser-qa.mjs` (Chromium sin GPU): PC 1280×720 y móvil 844×390, tres mapas, plano normal/sabotaje/localizador, plano y ajustes durante la reunión, reconexión y respaldo HTTP; sin errores de página. FPS sin GPU equivalentes a la 15.0.0.

# PUCELA US 15.0.0 — luz por superficies, colisiones, exteriores y compensación de latencia

Base: 14.3.1 (PUCELA-US-OPTIMIZADO). Se conservan todas las funciones anteriores.

## Cambios
- **Visión sin círculo.** Se ve todo lo que cabe en la cámara salvo lo que tapan las paredes. Solo los sabotajes de apagón y sobrecarga mantienen un radio (es su mecánica; la linterna amplía ese radio). Testigos y bots usan el mismo criterio (rectángulo de pantalla + línea de visión). Los profesores conservan su alcance de antes.
- **Iluminación parcial por superficies.** Nueva capa de luz a media resolución: suelo por polígono de visión; cada cara de pared, canto y mueble se ilumina por tramos según si el suelo contiguo, en el lado desde el que se mira, está a la vista. Una pared puede quedar mitad iluminada y mitad en sombra; las caras que miran hacia el otro lado se oscurecen; sin filtraciones entre salas.
- **Profundidad.** Una sola pasada ordenada por base: muebles, paredes (las verticales por tramos de una baldosa), muebles largos por tramos, dispositivos, cadáveres y personajes. Los nombres van encima de la luz.
- **Colisiones.** Bancos y farolas de Campo Grande ahora son sólidos (la farola solo por el poste, con caja propia `hit`). Mesas redondas, taburetes, fuentes, templetes, plantas y papeleras colisionan como círculos. Misma geometría en cliente, servidor y bots.
- **Compensación de latencia en asesinatos.** Historial de 1 s por jugador y bot con la marca de tiempo de interpolación; el cliente envía el instante y la posición que veía; el servidor rebobina como mucho `min(550 ms, RTT/2 + 350 ms)` con el RTT medido por el propio servidor (ping de control), comprueba alcance (90 px, sin ampliar), línea de visión, planta, conductos, coherencia de la posición declarada y que la víctima no se haya alejado más de lo físicamente posible.
- **Sincronización.** Estados y entradas cada **40 ms** (antes 50 ms). Medido: ~24 estados/s por cliente con 2 salas llenas.
- **Móvil.** Capa de giro en vertical (no simula horizontal), pantalla completa y bloqueo horizontal al tocar, medición del alto real desde el primer fotograma, zonas seguras en votaciones también en pantallas bajas.
- **Icono** del usuario (192/512, maskable con margen, Apple 180).
- **Animación inicial:** 1,5 s a triple velocidad sin caravana, 1 s de frenazo en el que la cámara la alcanza y después la animación de siempre. Segundo soporte del cartel de Valladolid. La caravana se aleja sin arrastrar un cuadrado de paisaje.
- **Exteriores** (`public/exterior.js`): Colegio con aparcamiento, patio de recreo y puerta principal en recepción; ciudad nocturna en el Club; ciudad diurna en el Gym; Campo Grande con paseo abajo e izquierda, carretera con coches arriba y derecha, edificios, fuente con estatua y estatua aislada. Lo que cae dentro del mapa se pinta una vez en la lámina; fuera, mosaicos cacheados.
- **Ropa:** torso y mangas separados, cuellos, bajos, puños, mangas cortas y manos.
- **Correcciones:** personajes blancos o transparentes (ids de degradado únicos y cabeza opaca), portero sin filtro, «Partida finalizada» más abajo, nombres de impostores en rojo para ellos, sin línea clara en el cadáver, «Vega reportó a Mara», agarre del profesor, pasos distintos en losa, tierra y hierba, sin resaltado al tocar, confirmación lateral al soltar, texto amarillo de cofres sin cortar, textos de los minijuegos por encima, E abre lo más cercano.
- **Bots:** recuerdan dónde apareció el cadáver y quién estaba allí, descartan a quien estaba con ellos durante el asesinato, ganan confianza con la compañía sin incidentes, aprenden de acusaciones fallidas (sospecha moderada, sin culpabilidad automática), preguntan dónde estaba el cadáver y razonan por descarte.
- **Sugerencias y bugs** con panel de creador (ver README).

## Pruebas realizadas (en este entorno)
- `npm test`: 227/227.
- `npm run test:network-benchmark` (dos ejecuciones): 10 jugadores 24,3–24,4 estados/s por cliente, 17–22 % de un núcleo; 20 jugadores en 2 salas 23,8–24 estados/s, 32–37 %, 117–122 MB RSS. En 14.3.1, en el mismo entorno: 19,5 y 19,3 estados/s.
- Arranque como el contenedor (solo package.json, public, game y server; `--max-old-space-size=320`): salud, estáticos, sugerencias guardadas en `DATA_DIR` y 25,3 estados/s por WebSocket real.
- `npm run test:benchmark`: las 8 partidas de bots completas en los cuatro mapas.
- `npm run test:browser` (Chromium 1194 sin GPU): todas las comprobaciones correctas; móvil horizontal con joystick real y capa de giro en vertical. FPS sin GPU (pesimista, no representativo de un móvil): colegio 50,6, club 17,3, gym 19,8, parque 20,9 (14.3.1 en el mismo entorno: 55 / 19,3 / 19,8 / 23,9).

## No verificado
- Dispositivos físicos (notch, isla dinámica, Safari iOS) y Docker real: no disponibles en este entorno.

# PUCELA US · Historial de versiones

Informes de las entregas anteriores, de la más reciente a la más antigua. El informe de la versión actual (14.3.0) es el primero de este archivo.

# INFORME 14.3.0 — gran mejora gráfica, visión tipo Among Us, interfaz, sonido y optimización

Versión de trabajo: el ZIP **PUCELA-US-14.2.0** (100 archivos). Sigue teniendo 100 archivos.

## Cambios

| Punto | Qué se ha hecho | Dónde |
| --- | --- | --- |
| 1. Gráficos | Arquitectura generada desde el suelo real en Colegio, Club y Gym: cara frontal alta con zócalo, moldura, juntas, arrimadero y detalles (ventanas, avisos, focos) en cada borde superior; cantos gruesos en laterales e inferiores; sombra de contacto sobre el suelo; techo oscuro con placas en el vacío; charcos de luz de las lámparas; baldosas con bisel y losas en pasillos; contorno oscuro en todos los muebles. Todo se pinta **una vez** en la lámina del mapa (coste cero por fotograma). El Colegio no tenía paredes con volumen porque sus plantas no sabían a qué mapa pertenecían: corregido. | `public/scenery.js`, `public/render.js`, `public/school.js` |
| 1. Paredes mal colocadas | Las paredes de borde se dibujaban como tabiques con cara frontal que subía dentro de la sala de arriba (las «paredes moradas» del Club). Ahora las de borde salen de la geometría del suelo y no pueden aparecer fuera del mapa ni atravesar salas; solo los tabiques interiores (suelo a ambos lados) se dibujan con volumen. | `boundaryWall()` en `scenery.js` |
| 1. Campo Grande | Las «barras gigantes» eran las sombras rectangulares que proyectaban los bosquecillos en la visión. Eliminadas. | `render.js` |
| 2. Visión | Fuera del campo de visión el escenario se ve, mucho más oscuro; personas, bots, cadáveres, animales, profesores y la apertura de conductos siguen totalmente ocultos y respetan paredes. Campo Grande: solo un círculo de visión suave, sin sombras extra. | `render.js`, `interactions.js` |
| 3. Interfaz | Botones de acción como placas gruesas con bisel, contorno, icono grande perfilado y rótulo con trazo, de color según su función; ajustes y mapa como discos metálicos; inventario y joystick a juego; en móvil los rótulos siempre caben. | `mechanism.css` |
| 4. Sonido e iluminación | Pasos sintetizados según el suelo (baldosa, pista de baile, madera, caucho, mojado, grava, moqueta); campanas, clics, golpes y aire en tareas, reuniones, reparaciones, escaleras y botones; ambiente suave por mapa (pájaros en Campo Grande). Temblor de cámara muy leve en la caravana y durante los sabotajes (más fuerte en el crítico), desactivado con «movimiento reducido». | `soundscape.js`, `client.js`, `render.js` |
| 5. Tareas | Carcasa metálica con tornillos, bisel y brillo para todos los paneles. En el Club la tarea del escenario principal ya no es una pizarra: «Fregar la pista de baile» con cubo y fregona; el sampler usa pads y la ventilación un ventilador (antes la campana y el grifo del colegio). | `mechanism.css`, `interactions.js`, `club.js` |
| 6. Air Hockey | El disco se simula en el cliente con la física del servidor y se corrige con suavidad al llegar cada vista; la maza propia sigue la misma regla de velocidad que el servidor, que ahora va a 1400 (antes 560, se quedaba atrás). | `tables-ui.js`, `game/tables.js` |
| 7. Personajes de frente | Revelación de rol, armario, pase y final de partida siempre de frente, conservando colores y accesorios. | `characters.js`, `finale.js` |
| 8. Optimización | Minimapa con una copia reducida del mapa (antes, otra lámina a resolución completa: 40–55 MB por planta). 14 pulsos por segundo en partida (antes ~10): los demás se ven antes. Montón de Node acotado a 320 MB para el contenedor de 512 MB. | `render.js`, `client.js`, `Dockerfile`, `package.json` |

## Mediciones

- **Servidor (2 salas, contenedor limitado)**: 2 salas de 10 personas → 0,25 núcleos y 44 MB; 2 salas de 4 personas + 6 bots → 0,16 núcleos y 58 MB. Latencia p95 6–7 ms, p99 12–38 ms, sin errores. Holgura de sobra en 2 CPU / 512 MB.
- **Cliente (Chromium sin GPU, 7 bots, 10 s andando)**: 60 fps en Colegio y ~58 en Club; CPU del hilo principal 6,7 s (antes 8,5 s) en Colegio y 9,4 s (antes 9,6 s) en Club.
- **Air Hockey real entre dos navegadores** (cambios bruscos de velocidad del disco por fotograma): 5–6 % → 1,5–1,8 %, también con 60 ms de latencia añadida.

## Pruebas realizadas

- `npm test`: todas las pruebas pasan (ver resumen de la entrega). Nuevas: arquitectura sin paredes fuera del mapa, objetos propios del Club, escenas de frente, superficies de pasos y Air Hockey.
- Recorrido con capturas por todas las salas de los cuatro mapas, paneles de tareas de los cuatro mapas, rol y final; partida real con dos navegadores (escritorio y móvil táctil horizontal) con alarma, reunión, votación y expulsión, sin errores de consola.
- ZIP extraído en carpeta nueva, pruebas, servidor arrancado solo con lo que copia el `Dockerfile`, `/api/health`, estáticos y WebSocket de mesas.

No realizado: despliegue real en Northflank/GitHub, `docker build` (sin Docker en este entorno), móviles físicos y Safari/iOS. Los sonidos se han comprobado por su programación (osciladores y filtros), no escuchándolos.

# INFORME 14.2.0 — pantalla completa, caravana, alarma, bots, expulsiones, multijugador

Versión de trabajo: el ZIP **PUCELA-US-14.1.0** recibido. Solo se han tocado los puntos del encargo; lo anterior se conserva.

## Cambios

| Punto | Causa encontrada | Corrección |
| --- | --- | --- |
| 1. Franja inferior en móvil horizontal | Al abrir en horizontal, el navegador da un `innerHeight` provisional (barras aún colocándose) y no vuelve a lanzar `resize`: `--app-height` se quedaba corto hasta girar el móvil. | `public/client.js`: el viewport se mide con una sonda fija `inset:0`, vigilada con `ResizeObserver`, y se vuelve a medir varias veces (60 ms–2,5 s) tras cargar, `pageshow`, volver a la pestaña, `resize`, `orientationchange` y `screen.orientation`. |
| 2. Caravana blanquivioleta antes del rol | La bajada dibujaba una caravana propia (techo blanco, rótulo blanco…) y encima una viñeta violeta que la teñía. | Nuevo `public/caravan-side.js`: **una sola función** de dibujo usada por el menú y por la bajada (`public/disembark.js`); solo cambia la puerta, abierta. Sin viñeta encima. El cielo y el suelo siguen blanquivioletas. |
| 3. Alarma de sabotaje | — | Pulsos electrónicos graves de tono fijo: cuadrada en 233 Hz + su octava 116,5 Hz (207 Hz en los leves), paso bajo a 1,1 kHz, sin deslizamientos. Canal de efectos (volumen y silencio), se corta al reparar. |
| 4. Bots en reuniones | Decidían el voto al azar en el momento de votar, independientemente de lo dicho; pedían pruebas incluso a quien apoyaba su acusación; la jaula contaba como prueba. | `game/social.js`: **intención de voto por reunión** que guía lo que dicen y lo que votan; solo cambia con un motivo que anuncian. Si alguien apoya su acusación, la mantienen («Coincido…»). Con 3/1 o 5/2 dicen que hay que expulsar a alguien, nombran sospechoso, rechazan el SKIP y nunca lo proponen (tampoco los impostores bot). La jaula ya no es indicio ni se usa para mentir; si alguien la cita, responden que no prueba nada. |
| 5. Expulsiones (los 4 mapas) | Hojas que se deslizaban y se dibujaban detrás del personal; el portero aparecía cruzando la fachada. | `public/expulsion.js`: puertas batientes proyectadas en perspectiva (giran sobre la bisagra hasta 104°, se ve el reverso, cierran con el mismo giro al revés). Las hojas se dibujan **delante** del personal, que sale del fondo del hueco y está recortado a él: al cerrarse lo van tapando hasta ocultarlo. Colegio: nueva caseta de escalera con puerta doble en la azotea. Campo Grande: eliminado el óvalo verde junto a la puerta. |
| 6. Multijugador | (a) La posición de cada persona llevaba la hora de **llegada** del paquete: la variación de la red se convertía en acelerones y vibraciones para quien miraba (los bots, con marcas exactas, se veían mejor). (b) Tras un pico de latencia, el siguiente paquete se rechazaba («Movimiento demasiado rápido») y el jugador volvía atrás de golpe. (c) El retardo de interpolación tenía tope de 420 ms, insuficiente con datos móviles. | `game/engine.js`: reloj de movimiento que avanza lo andado por el cliente (nunca por delante de la hora real); validación con crédito de 450 ms (el límite acumulado sigue impidiendo ir más rápido que el tiempo real). `public/remote-motion.js`: tope adaptativo 700 ms (solo sube si la conexión lo necesita). |
| 7. Arranque de bots | — | `game/bots.js`: retraso propio aleatorio de 0,1–3 s al empezar y tras cada votación. Solo retrasa el movimiento; observan desde el primer instante. |

## Mediciones (simulación, no móviles físicos)

Observador mirando a otra persona real que anda (servidor real, dos clientes, 30 s, 3 semillas):

| Red simulada | Movimientos rechazados | Fotogramas parados | Saltos | Variación de velocidad p95 |
| --- | --- | --- | --- | --- |
| Wi-Fi 14.1 → 14.2 | 0–1 → 0 | 4,2–7,3 % → 3,3–4,6 % | 2,2–3,6 % → 0,2–0,8 % | 0,18–0,23 → 0,03–0,06 |
| Datos móviles 14.1 → 14.2 | 5–7 → 0 | 18–20 % → 5–7 % | 7–10 % → 2–3 % | 0,44–0,57 → 0,15–0,21 |

Coste: con datos móviles el retardo visual de los demás jugadores sube a ~0,65 s (en Wi-Fi ~0,3 s). Es el precio de no quedarse sin muestras; viene del sondeo HTTP (un pulso en vuelo por cliente). Bajarlo más exigiría pasar el movimiento a WebSocket en ambos sentidos: se probó un empuje solo de bajada y apenas ganaba 0,1 s, así que no se ha añadido.

## Pruebas realizadas

- `npm test`: **209 pruebas, 0 fallos** (199 anteriores + 10 nuevas en `tests/version14_2.test.js`).
- `npm run test:benchmark`: los bots completan tareas en los cuatro mapas.
- Expulsión renderizada en Chromium en los **cuatro mapas** (8 instantes cada uno): puertas girando, portero dentro y tapado progresivamente, sin óvalo verde en Campo Grande.
- Partida real en Chromium con **dos navegadores** (escritorio 1280×720 y móvil táctil horizontal 844×390) + 4 bots, en Club y Colegio: bajada con la caravana del menú, juego a pantalla completa (844×390 sin franja, también tras pasar a vertical y volver solo con `resize`), movimiento por teclado, alarma (solo cuadradas de 233/117 Hz, ninguna tras reparar), reunión, votación y expulsión completa. **Sin errores de consola.**
- ZIP extraído en carpeta nueva → `npm test` → servidor con solo lo que copia el `Dockerfile` → `/api/health` 14.2.0, estáticos, WebSocket de mesas (101).

No realizado: despliegue real en Northflank/GitHub (sin acceso), móviles físicos, Safari/iOS. Por eso la corrección de la franja no se ha podido reproducir con el fallo real del navegador: se ha comprobado que el juego ocupa toda la pantalla y que se re-mide solo, pero confírmalo en tu móvil.

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

# INFORME 14.0.0 — pantalla completa, perfiles, sabotajes, escenarios y mesas en tiempo real

## Corregido / añadido

1. **Pantalla móvil.** El cuerpo de la página en el menú tenía fondo beige claro (`#eddcbe`, regla `body:has(#menu…)` que ganaba por especificidad) y el `theme-color` también era beige: cualquier hueco (zona del notch en horizontal, barras del navegador, capa con ancho calculado) se veía como franja clara. Ahora `html` y `body` son oscuros en todas las escenas, el `theme-color` es oscuro, y el menú, la intro, el viaje y el desenlace se anclan a los cuatro bordes (`left:0;right:0`) en vez de a un ancho calculado. La vista previa del armario en vertical se salía de su tarjeta: corregida. El botón «Saltar intro» ya no tapa el texto en vertical.
2. **Perfiles laterales reales** (`public/characters.js`). El perfil se dibuja una sola vez mirando a la derecha y la izquierda es su espejo, así los pies (zapatilla con puntera) apuntan siempre hacia donde camina. En perfil: un ojo, media sonrisa, cara desplazada al borde delantero, pierna trasera más oscura, brazo único casi quieto, mochila a la espalda. Corbatas, estampados, insignias, gafas, máscaras y viseras pasan por una transformación que los lleva al borde delantero, los estrecha y los recorta con la silueta: nunca aparecen completos y centrados. Pelo, gorra (visera hacia delante), moño y auriculares tienen versión lateral. Al cambiar de rumbo el cuerpo se estrecha 130 ms y se abre en la nueva dirección.
3. **Ventanillas centradas.** Márgenes simétricos arriba/abajo e izquierda/derecha (el mayor de cada par de zonas seguras) para misiones, cámaras, plano y libreta; la ventanilla nunca es más alta que el hueco. Medido en Chromium: 192/192 px en vertical (390×664), 8/8 en horizontal (750×342) y 8/8 en escritorio (antes 26/10). He interpretado «visiones» como las ventanas de misión y demás ventanillas.
4. **Sabotajes.** Sin texto junto a las flechas: solo flechas amarillo‑anaranjadas que parpadean con suavidad, una por panel pendiente, en el borde de la pantalla (algo por encima del centro), esquivando el personaje, la barra superior, el inventario, el joystick y los botones. Tinte rojo que respira con tres intensidades (emergencia, normal y suave para luces/puertas/VIP/sonido) y ajuste **«Alarmas de sabotaje: parpadeo suave»** (en Ajustes del menú y de la partida; también lo respetan «Luces suaves» y *reduced motion*). Sirena de fondo con un único planificador: empieza con el sabotaje, se corta en el mismo fotograma en que se repara, respeta silencio y volumen de efectos, no suena en el apagón de sonido del club y la campana del colegio conserva su timbre propio.
5. **Interfaz superior.** Barra horizontal «Tareas completadas» arriba a la izquierda (con la tarea pendiente y el aviso de sabotaje debajo); botones de **ajustes** y **mapa** arriba a la derecha. La franja superior antigua (código, panel, sonido, luces, pantalla completa, ayuda, salir) se reúne en el menú de ajustes.
6. **Paredes con volumen y suelos** (`public/scenery.js`, `public/render.js`, `public/park-art.js`). Colegio, Club y Gym: las paredes se levantan 40 px sobre su huella (que no cambia: mismas colisiones y visión) con cara frontal, canto, zócalo, juntas, marcos en los extremos (jambas de puertas) y remate; temas propios (pintura y zócalo / paneles con tira de luz / colchonetas azules). Se pintan después de la niebla, oscurecidas si quedan fuera de vista; los personajes que están detrás quedan tapados por la pared y los muebles delante se vuelven a pintar encima. Suelos: terrazo con juntas y motas (Colegio), pavimento pulido con brillo (Club), caucho con motas y juntas de placa (Gym), todo en la lámina cacheada (coste cero por fotograma). **Campo Grande:** grava en los senderos, rodadas, piedras de borde y matas de hierba como transición, rejillas en el paseo; **sin sombras**.
7. **«SHHH».** La bajada de la caravana nunca se veía: el cliente exigía conocer el rol, que el servidor oculta justo en esa fase. Ahora: viaje → bajada de la caravana (cámara que empieza en la puerta y se abre a la fila) → pantalla **SHHH…** arriba con todos los jugadores de pie, con sus colores, cosméticos y nombre, en 1–3 filas calculadas para que no se toquen ni tapen el texto (comprobado de 1 a 10 jugadores en seis tamaños) → revelación del rol con fundido sin solapes. El servidor añade 2,2 s de «SHHH» (`SHHH_MS`).
8. **Títulos** blanco/lavanda/violeta suave sin halos intensos (menú, intro, encabezados, revelación). El título de la intro se veía oscuro por la sombra detrás de un texto con relleno transparente: corregido. «AS» del techo de la caravana → «PUCELA US».
9. **Inicio sin saltos.** El salto al pulsar «Salir de viaje» venía de que el viaje empezaba con un interior de caravana a otra escala y con los jugadores colocados en círculo. Ahora se fotografía el último fotograma de la sala de espera y el viaje arranca exactamente desde él y se aleja. La intro pinta su propio fondo desde el primer fotograma (antes había un destello beige).
10. **Mesas en tiempo real.** WebSocket propio (RFC 6455, sin dependencias) en `/api/table-ws`: entradas inmediatas y vista empujada a 30 Hz; la maza propia se predice en local y el disco se extrapola. Si el WebSocket no conecta, el juego sigue por HTTP como antes. Con el canal abierto el sondeo HTTP baja de 70 a 240 ms. Las entradas por HTTP chocaban con el límite de 18 acciones/500 ms; el canal tiene su propio límite. Margen de proximidad a las mesas ampliado (+48 px) para que la latencia no impida sentarse. Probado con dos navegadores reales (escritorio + Pixel) en la misma sala: emparejados, ambos con socket abierto y la maza de uno visible en el otro.
11. **Otros.** Reglas CSS `.lineup-*` eliminadas; nombres sin fondo sobre tarjetas claras (votación y final) con pastilla oscura para mantener el contraste; versión 14.0.0; `INFORME_13.0.md` pasa a `HISTORIAL.md`.

## Comprobado

- `npm test`: 194 pruebas, 0 fallos en cinco de seis ejecuciones (una ejecución, desde el ZIP recién extraído, tuvo un fallo intermitente que no se repitió en las tres siguientes y que no he podido identificar) (incluye las nuevas pruebas de la 14 en `tests/version13.test.js`: canal ligero de mesas, handshake WebSocket y rechazo sin sesión, tiempos de llegada + SHHH, SHHH sin solapes, flechas dentro del marco libre).
- Chromium (Playwright) con iPhone 13 vertical/horizontal, Pixel 7, 915×412 y escritorio 1366×768: menú, intro, sala, viaje, bajada, SHHH, revelación, partida en los cuatro mapas, misiones, sabotaje de emergencia y de luces, menú de ajustes, reunión y Air Hockey entre dos clientes. Sin errores de consola. Sin desbordamiento horizontal medido en el DOM.
- Chromium *headless* de escritorio (sin GPU) en horizontal: 60 / 57,5 / 59,5 / 60 imágenes por segundo de media en Colegio / Club / Gym / Campo Grande (percentil 95: 16,8 ms). **No es una medida de móvil.**

## Limitaciones reales

- **No llegó la captura del menú con franjas blancas**; en el emulador no se reproducen. He corregido la causa más probable (fondo beige detrás de las capas y anchos calculados), pero no lo he podido confirmar en un móvil físico.
- No hay Safari ni Firefox en este entorno: no se ha probado en ellos ni en dispositivos con notch físicos. Las zonas seguras usan `env(safe-area-inset-*)`.
- 60 FPS sin medir en móviles reales.
- El retardo del Air Hockey en Internet no se ha medido con latencia real; el WebSocket elimina el sondeo y la cola de acciones HTTP, pero la latencia de red sigue existiendo (se compensa con predicción local).
- No he podido reproducir «las mesas de dos no encuentran rival en la web»: en local dos personas se emparejan. He quitado dos causas plausibles (límite de acciones por HTTP y margen de proximidad con latencia).
- Las pruebas `npm run test:ui` siguen omitidas aquí porque necesitan `happy-dom` y `@napi-rs/canvas` (vía wrangler), que no están instalados.
- No hay enlace HTTPS: no tengo acceso a un servicio de alojamiento desde esta sesión. `render.yaml` sigue listo para Render (que admite WebSocket).

---

# INFORME 13.0.0 — animaciones, salas de espera y personalización

## Cambios
1. **Pantalla completa en móvil.** `viewScale` (cámara) y `syncViewport` (ancho de layout = mínimo entre layout y visual viewport) evitan recortes laterales; sin scroll vertical. Comprobado por medida del DOM en 320×568, 360×740, 390×844, 844×390, 932×430, 768×1024, 1366×768, 1920×1080 y 2560×1080: sin desbordamiento y el modal de las mesas cabe entero.
2. **Intro y estilo blanquivioleta.** Título con entrada destacada, degradados blanco/violeta y brillos suaves en menú, encabezados y revelación de rol. La intro aparece desde el primer fotograma (sin mostrar antes menú ni personalización).
3. **Llegada en caravana** (`public/disembark.js`, `game/intro.js`). Caravana alta con techo, cara trasera, toldo y puerta abierta; los jugadores bajan uno tras otro, de frente, con piernas y rebotes, y forman fila. Todo depende del reloj del servidor (`neutralAt`), duración 2,9–5,2 s según 1–10 jugadores. Sustituye (no duplica) la antigua fila de presentación. La cámara compartida con el fondo encuadra puerta y fila también en vertical estrecho.
4. **Rectángulo amarillo** de televisión/armario: era un `strokeRect` heredado de `drawCaravanActivity`; eliminado (queda solo el contorno de silueta al acercarse). Además se retiraron duplicados de decoración y se reubicó el banco del colegio.
5. **Seis mesas** (`game/tables.js`, `public/tables-ui.js`): Air Hockey, Tres en raya, Duelo de reflejos y Carrera de pulsaciones (2 jugadores, emparejamiento automático y «Esperando a otro jugador»), Memoria de cartas y Secuencia de colores (1 jugador, empiezan al instante, se puede repetir). Cada pareja es una sesión independiente (hasta 8 simultáneas), si alguien se va o se desconecta el otro vuelve a esperar o sale, y `start` cierra todas las sesiones. Teclado, ratón y táctil. Las mesas no bloquean accesos (BFS de alcanzabilidad en tests).
6. **Nombre personalizable.** `NAME_BGS` (21, 19 desbloqueables) y `NAME_COLORS` (16, 13 desbloqueables) en `public/pass.js`, asignados a 32 niveles distintos entre el 2 y el 50; las 50 recompensas anteriores siguen intactas y se reclaman con el mismo botón. Contraste mínimo 3:1 garantizado (se sustituye el color de letras por blanco o tinta oscura si hace falta). Los campos `nameBg`/`nameColor` viajan en el perfil, se validan contra el pase firmado y se muestran en sala, partida, reuniones, chat y pantalla final; los clones usan `appearanceOf` y copian nombre y estilo exactos.
7. **Ficheros:** 99 archivos propios (se fusionaron `camera.js`→`render.js`, `rooms.js`→`engine.js`, `audio-mixer.js`→`soundscape.js` e `INFORME_12.0.md`→`HISTORIAL.md`). Versión 13.0.0.

## Pruebas
- `npm test`: toda la batería automática (incluye `tests/version13.test.js`: dos parejas simultáneas en la misma mesa, abandono/relevo, tres en raya completo, juegos individuales, carrera por lotes, cierre al empezar, reparto/contraste/guardado/visibilidad/clones de los nombres).
- Navegador real (Chromium + Playwright): las seis mesas dibujadas y jugadas por teclado, Air Hockey con dos clientes (PC + móvil), estilos de nombre en mundo, lista y armario, llegada con 3, 4 y 10 jugadores en PC y móvil.

## Pendiente / límites honestos
- El Air Hockey va por sondeo HTTP (70 ms mientras la mesa está abierta): con latencias altas se nota algo de retardo.
- No se ha medido 60 FPS en móviles reales; en Chromium de escritorio el bucle va fluido.
- No he probado en navegadores Safari/Firefox ni en dispositivos con notch físicos; las zonas seguras usan `env(safe-area-inset-*)`.
- Quedan reglas CSS antiguas de la fila de presentación (`.lineup-*`) sin uso.

---


---

# Sanagus As 10.0.0 · Informe de entrega

Esta versión parte de la 9.0.0 y conserva todo lo anterior: los cuatro mapas (Colegio, Sanagus Club, Sanagus Gym y Campo Grande), la caravana, las 34 misiones mecánicas con cierre automático, las reuniones, las votaciones, los roles, los sabotajes, las salas privadas y los bots.

## 0. Recuperación del proyecto

Durante el trabajo se reinició el entorno de ejecución y se borró la carpeta del proyecto. Se reconstruyó así:

1. Se tomó como base el ZIP 9.0.0 entregado.
2. Se reprodujeron en orden, desde el historial de la sesión, todas las ediciones posteriores de la 10.0.

El procedimiento se validó antes de usarlo. La reproducción desde la 8.1 dio una 9.0 idéntica, archivo por archivo, al ZIP 9.0.0. La 10.0 recuperada pasó las mismas 165 pruebas que pasaba antes del reinicio. Antes de seguir trabajando se generó un ZIP de seguridad.

## 1. Campo Grande, reconstruido desde la vista aérea

El parque se ha rehecho a partir de la imagen de referencia. La imagen no se usa como fondo: de ella se extrajeron el trazado de los senderos, la forma del lago y la silueta del parque, y el escenario se construyó con elementos del juego (`public/park-layout.js`, `park.js`, `park-art.js`).

- **Forma y zonas:**
  - Parque triangular, cerrado por una verja con puertas.
  - Lago arriba a la izquierda, con una isla, y el quiosco pequeño debajo.
  - Zona de juegos arriba a la derecha; pajarera y rosaleda abajo a la izquierda.
  - Fuentes, glorieta, jardines y arboledas.
- **Paseo central:** recto, de losas grises y sin obstáculos. Solo hay bancos, farolas y árboles a los lados. El botón de emergencia está en el suelo, en el centro del paseo.
- **Suelos:** el resto de senderos es de tierra.
- **Vista cenital:** sin troncos ni vallas en volumen.
- **Jugabilidad:**
  - Colisiones reales en senderos y arboledas.
  - Navegación de bots en una rejilla más fina (16 px).
  - 15 tareas en objetos del parque (bomba, válvula, cuadro…), sabotajes en zonas distintas y cuatro cámaras.
  - Agujeros de topo conectados en redes, que funcionan como conductos.
  - 15 cofres de jardinería o mochilas, junto al borde de los senderos.
- **Iluminación:**
  - La niebla del parque es translúcida y se dibuja después de las copas: el paisaje se intuye fuera de la vista y desaparecen las cuñas negras entre los árboles.
  - Los personajes que no ves siguen ocultos.

## 2. Experiencia por voto y pase de temporada

### Experiencia

- **Registro:** el servidor guarda cada voto de cada reunión (`voteLog`).
- **Cálculo al final:** se cuenta con los roles reales.
  - Voto a un impostor: +40, aunque no lo expulsaran o la mayoría hiciera Skip.
  - Voto a un tripulante: −15.
  - Skip: 0.
- **Otras partidas del total:** partida completada (+60), victoria (+150), tareas (+12 cada una), reparaciones (+25) y eliminaciones del impostor (+30).
- **Cuándo se ve:** el desglose aparece solo en la pantalla final. Durante las reuniones no se muestra nada.
- **Límite:** medio nivel (500 XP) por partida, también al cruzar de nivel.

Comprobado en Chromium con el servidor real: un voto a un impostor que no fue expulsado aparece en la pantalla final como «Votos acertados 1× +40».

### Pase de temporada

- **50 niveles**, cada uno con una recompensa cosmética, y botón «Recoger».
- **Recompensas:** mascotas (solo del pase), animaciones, efectos y accesorios.
- **Armario:** los colores están todos disponibles desde el principio; los accesorios gratuitos se reducen a unos cinco por categoría.
- **Seguridad:** el progreso se guarda firmado por el servidor (HMAC), así que no se puede editar desde el navegador.

## 3. Cofres, inventario y objetos

### Cofres

- Temáticos por mapa: mochilas y taquillas en el Colegio, maletines en el Club, bolsas deportivas en el Gym, y cajas de jardinería o mochilas en el parque. Máximo dos por sala.
- Se abren con un minijuego: soltar tres cierres en orden y levantar la tapa.
- El servidor decide el contenido y quién lo abre primero.

### Inventario

- Tres casillas: mano vacía y dos ranuras.
- **Ordenador:** teclas 1 a 3 para elegir la casilla, C para usar y X para soltar.
- **Móvil:** botones encima del joystick, en vertical y en horizontal.

### Objetos

| Objeto | Efecto |
| --- | --- |
| Zapatillas turbo | 30 s acumulados de velocidad ×1,45, activables y desactivables |
| Linterna | 30 s acumulados de visión ×1,5 |
| Cámara portátil | Se coloca y da 30 s acumulados de imagen, con pausa |
| Clon señuelo | 15 s. Si un impostor lo mata, gasta su recarga y deja un cuerpo; al reportarlo aparece «Han reportado un señuelo de…» |
| Jaula | 30 s a un jugador cercano, que solo puede moverse dentro |
| Escudo | 30 s, visible solo para quien lo lleva. Para el ataque, avisa a la víctima y reinicia la recarga del impostor |
| Rastreador de huellas | Muestra huellas recientes sin decir de quién son |

Los bots abren cofres, usan los objetos y recuerdan como prueba haber visto un ataque contra un escudo o el uso de una jaula.

**Corregido en esta fase:** en pantallas táctiles, un toque en «Activar» llegaba dos veces y el objeto se apagaba enseguida. Ahora cuenta una sola vez.

## 4. Bots: pruebas y conversación

### Qué recuerdan

Cada bot guarda lo que ha visto él mismo, con el lugar y si fue directamente o por cámara:

- un ataque;
- alguien que entra o sale de un conducto;
- alguien junto a un cadáver;
- un ataque contra un escudo;
- el uso de una jaula;
- una coartada que no coincide.

Lo que le cuentan en las reuniones lo guarda aparte. Sus frases mantienen esa diferencia, por ejemplo:

- «Vi a Alex matar en Quiosco y escapar.»
- «Vi a Noa meterse en un conducto por las cámaras en Pasillo.»
- «Yo no lo vi, pero Gael dice que Noa es sospechoso.»
- «Estuve con Mara durante bastante tiempo.»
- «No tengo pruebas suficientes.»

### Cómo responden

- **«¿Qué pruebas tienes?»:** contestan con el dato concreto («Lo vi yo mismo: …»), con el origen si se lo contaron («No lo vi yo: me lo contó Cris»), o reconocen que no tienen pruebas.
- **Respaldo y defensa:** confirman una acusación que coincide con lo que vieron y defienden a quien acompañaron un buen rato.
- **Impostores:** pueden inventar una prueba concreta y la mantienen si se la preguntan.
- **Sin repetirse:** un bot no repite la misma frase en una reunión.
- **Memoria:** solo de la partida actual.

### Votos

- Con 3 vivos y un impostor, o 5 vivos y dos, no omiten.
- A un paso de esa situación bajan el umbral para votar.

Medición en 32 partidas simuladas de 10 participantes con dos impostores:

| Situación | Skip | Votos al impostor | Votos a un tripulante |
| --- | --- | --- | --- |
| Crítica | 0 | 25 | 13 |
| Normal | 348 | 116 | 26 |

### Cadáveres

Un tripulante que ve un cadáver deja la tarea y va a denunciarlo. Solo la cuenta atrás de un sabotaje crítico pasa por delante.

**Corregido:** los bots ya no pierden sus frases detalladas al enviarlas (antes el servidor las sustituía por el texto genérico de la frase rápida).

### Frases rápidas nuevas

«Lo vi salir de un conducto», «Lo vi por las cámaras», «Me ha intentado matar, pero llevaba el escudo», «Vi que utilizó una jaula», «Su coartada no coincide», «Estuve con él bastante tiempo» y «No tengo pruebas suficientes».

## 5. Conductos, objetos interactivos y mapas

- **Conductos:** ya no hay menú de destinos. Dentro aparecen flechas alrededor del personaje hacia cada salida conectada; se usan con clic, toque o teclas de dirección. Si dos salidas quedan casi en la misma dirección, sus flechas se separan. En Campo Grande se llaman madriguera o agujero y se dibujan como agujeros de topo.
- **Tareas en objetos reales:**
  - Desaparecen los cubos genéricos. Cada tarea y cada reparación es un aparato propio: ordenador, servidor, lector, cuadro eléctrico, mesa de DJ, altavoz, fuente, ventilador, pizarra, marcador, cinta, bicicleta, banco, taquillas, papelera…
  - En el parque se usa el objeto del propio mapa.
  - El contorno sigue la silueta del objeto: amarillo para las tareas y rojo para las reparaciones. También lo tienen el vestuario y el ordenador de la caravana.
  - Se usan tocando o pulsando directamente sobre el objeto.
- **Sanagus Gym:**
  - Las duchas están junto a los vestuarios y se comunican con ellos por una puerta.
  - La sala de actividades ocupa el hueco que dejaron.
  - Yoga, vestuarios y piscina tienen esquinas en chaflán.
- **Sanagus Club:** cámaras recolocadas en salas reales (escenario principal, reservado, O2 y Electricidad) y pantallas casi cuadradas, en lugar de vistas de pasillo cortadas por paredes.
- **Nombres de roles propios** (los poderes no cambian):
  - Campo Grande: Guardabosques, Jardinero mayor, El Topo, La Ardilla, El Vidente del lago, El Espectro del bosque y El Camaleón.
  - Gym: Analista, Monitor, Velocista y Socorrista.
- **Caravana y viaje:**
  - Si todas las personas omiten el viaje, la partida empieza enseguida: la identidad aparece 1,6 s después de pulsar «Omitir» (antes había que esperar los 11 s del trayecto).
  - En multijugador se espera a que todos terminen u omitan.
  - El paisaje avanza con la distancia recorrida: se frena en el giro y el destino aparece al acercarse.
- **Votación y expulsiones:**
  - Se quita el rótulo «Resultado de la votación» de la animación.
  - El profesor patea con su propia pierna y el portero empuja con su propio brazo, en lugar de un pie o un brazo sueltos.

## 6. Menú principal

- Caravana animada en el centro, personajes, fondo dinámico, botones grandes (Jugar, Personalizar, Pase de temporada y Ajustes), vista previa del personaje y transiciones.
- Se han eliminado el texto «segundo de vista superior» y el aviso verde sobre crear salas y desplegar el ZIP, también en la versión web.
- Mejor contraste del logotipo y de los textos pequeños.
- Campo del nombre siempre visible.
- Comprobado en 1366×768, 390×844 y 844×390.

## 7. Pruebas realizadas

| Prueba | Resultado |
| --- | --- |
| `npm test` (motor, mapas, bots, misiones, pase, objetos) | 178 / 178 |
| `tests/items.test.js` (cofres, inventario y los siete objetos, validados en el servidor) | 8 / 8 |
| Pruebas nuevas de bots: pruebas concretas, respuesta a «¿Qué pruebas tienes?», escudo, situación crítica y denuncia de cadáver lejano | 4 / 4 |
| `npm run test:benchmark` (tareas de bots, ritmo frente a control) | 8 / 8 pares; +36 % de media (objetivo: aproximadamente 35 %) y todas las partidas terminan, Campo Grande incluido |
| Cofre e inventario con el servidor real en Chromium: abrir con el minijuego, recibir el objeto, activar el turbo, usar el escudo y soltar | Correcto en los cuatro mapas; en ordenador (1280×760) y en táctil vertical (390×844) y horizontal (844×390); sin errores de consola |
| Flechas de conducto: clic, toque y teclado | Correcto en Colegio, Campo Grande y Club |
| Tocar directamente una tarea | Abre el minijuego en Colegio, Gym y Club (táctil) |
| Partida completa en Campo Grande: botón del paseo, reunión, voto al impostor, resultado y pantalla final | Correcto; el voto acertado aparece en el desglose |
| Omitir el viaje jugando solo con bots | Identidad a los 1,6 s del toque |
| Menú principal en tres pantallas | Sin errores de consola |
| Imágenes por segundo en Chromium sin GPU (en máquina compartida, pueden variar) | Colegio 49 · Club 43 · Gym 38 · Campo Grande 33 |

## 8. Limitaciones y pendientes reales

- **Pruebas:**
  - No se ha probado en un móvil físico ni con varias personas reales a la vez. El tacto se ha probado con los eventos táctiles reales de Chromium a tamaños de teléfono.
  - `npm run test:ui` sigue saltando sus pruebas DOM porque `happy-dom` no se puede instalar en este entorno.
- **Gym:** se rediseñó el ala de vestuarios y duchas y se añadieron chaflanes, pero no es un rediseño completo del edificio.
- **Campo Grande:**
  - Va a unas 33 imágenes por segundo en esta máquina, por debajo de los otros mapas.
  - La escena de expulsión sigue usando el decorado del Club recoloreado.
- **Bots y objetos:** abren cofres y usan sobre todo el turbo y el escudo; el resto de objetos los usan con menos frecuencia.
- **Prueba de suavidad de los bots:** fallaba de vez en cuando cuando se cerraban las puertas (sabotaje «vip» del Club) o cuando un bot estaba enjaulado o abriendo un cofre. Esas esperas son legítimas y ahora se excluyen igual que ya se excluía el sabotaje de puertas.

## 9. Archivos

97 archivos propios. Los informes 6.0 a 9.0 y los datos de la prueba de bots 8.0 se reúnen en `HISTORIAL.md`. Se han eliminado tres iconos sin uso (`file.svg`, `globe.svg` y `window.svg`).

Archivos nuevos respecto a la 9.0:

- `public/park-layout.js`, `public/pass.js`, `public/menu.js`, `public/items-ui.js` y `public/extras-art.js`;
- `game/items.js`;
- `tests/items.test.js`;
- `INFORME_10.0.md` y `HISTORIAL.md`.

**Despliegue:** el secreto del pase se toma de la variable `SANAGUS_SECRET`. En `render.yaml` se genera solo. En un servidor propio, si no existe, se crea el archivo `.sanagus-secret`, que no se incluye en el ZIP.

---

## Sanagus As 9.0.0 · Informe de entrega

Esta versión parte de la 8.1.0 y conserva todo lo que ya tenía: los cuatro mapas, la caravana, las reuniones, las votaciones, los bots, la personalización, los roles, los sabotajes y las salas privadas. Campo Grande sigue íntegro: su geometría (`park.js`) no se ha tocado, y conserva sus 15 terminales, el lago, los senderos, la fuente, los 241 robles y el terreno transitable. Los cambios en `park-art.js` y `park-ground.js` solo afectan al rendimiento: el dibujo y las colisiones dan el mismo resultado que antes.

### 1. Misiones: 34 minijuegos mecánicos con cierre automático

#### Qué había

Las misiones de Colegio y Club eran formularios: deslizadores `<input type="range">`, barras `<progress>`, botones rectangulares y un botón final «Comprobar». Las del Gym ya usaban lienzo, pero con un dibujo plano.

#### Qué hay ahora

`public/mechanism.js` es un taller de instrumentos 2.5D que comparten todas las misiones:

- **Piezas:** chasis con bisel, tornillos, remaches, LED con halo, pantallas de cristal con barrido y reflejo, mandos moleteados, ruedas de válvula, manómetros con aguja y banda objetivo, palancas en guía, interruptores basculantes, botones con recorrido real, cables con caída, sombra y brillo, conectores con contactos, clavijas, fusibles de cristal con filamento, dígitos de siete segmentos, vúmetros, rejillas, tuberías con bridas y franjas de peligro.
- **Controles:** mando giratorio (manda el ángulo del dedo), palanca o fader lineal, cuadro de parcheo, lector de tarjeta con medición del ritmo, y la acción de coger y soltar (vale arrastrar o tocar dos veces).
- **Un mismo armario para todas:** canto, bandeja hundida, cuatro tornillos, franja de peligro y raíl de estado con tres testigos. Así las 34 se leen como una misma familia de máquinas.

Cada misión tiene su propia mecánica y su temática:

| Mapa | Misiones |
| --- | --- |
| Colegio | pizarra con borrador y polvo de tiza · maqueta de pupitres giratorios · circuito de pistas de cobre que se encienden · cuadro de cables · asociación de vocabulario por cables · torre con módulos, interruptores DIP y arranque · bandejas de documentos, entregas, exámenes y carpetas · estantería con lector óptico · cajones de material · carillón de tubos con macillos · recogida al contenedor de pedal · teclado mecánico con nota adhesiva · colector de tres válvulas con manómetros |
| Sanagus Club | mesa de mezclas (tres faders, vúmetros, plato y enganche de pulso con CUE) · rack de sonido (parcheo y ganancia con altavoz) · balda de botellas · control de acceso (acreditaciones y lector de banda) · cuadro general (fusibles de cristal y magnetotérmicos en orden) · terminal de datos (ruta, conector USB y transferencia) · calibración de tres fases con osciloscopio · compactadora (tambor y prensa) |
| Sanagus Gym | cinta de correr (mandos, arranque y banda que se inclina) · polea (correa por rodillos y tornillos de apriete) · soporte de discos · marcador de tambores · extracción (filtros sucios y ruedas de caudal) · taquillas con llaves y bombines · revisión de balones girándolos hasta ver la grieta · canasta regulable (apuntar y tirar) · bicicleta (resistencia y cadencia) · fuente de muestras (mantener el grifo pulsado) |
| Campo Grande | reutiliza 13 de esos mecanismos con rótulos propios: riego, semillero, senderos, permisos, alumbrado del paseo, cuadro de mantenimiento, almacén, bomba de la fuente, residuos del jardín, filtro del lago, muestras de agua y herramientas |

#### Cierre automático

Ya no hay botón «Comprobar». Cuando el mecanismo cumple sus condiciones:

1. Se detecta solo. En los mandos continuos (válvulas, agujas, faders, palancas) la condición tiene que mantenerse entre 0,3 y 0,45 s. Así, pasar por el valor correcto sin parar de girar no da la tarea por buena.
2. Se bloquea la entrada, para que la tarea no se envíe dos veces.
3. El aparato se anima en marcha mientras el cliente espera el tiempo mínimo de la tarea y el servidor la valida.
4. Si el servidor la acepta, aparece el sello «OPERACIÓN COMPLETADA», el panel se cierra solo y el progreso se actualiza.
5. Si la rechaza, la tarea no se marca: el aparato tiembla, aparece el motivo y vuelves a tener el control.

Se conservan los botones que forman parte de la mecánica: encender el equipo, escuchar la secuencia, arrancar la cinta, pedalear, CUE y vaciar un vaso.

#### Seguridad

El reto lo sigue generando el servidor, que también valida la solución y exige el tiempo mínimo de cada tarea. El cliente no puede completar una tarea por su cuenta. Las pruebas comprueban que una tarea lejana no se abre, que no se puede terminar una tarea sin haberla abierto y que ninguna respuesta inventada la completa. El formato de las soluciones no ha cambiado, así que los bots y la validación funcionan como antes.

### 2. Rendimiento

| Medida | 8.1 | 9.0 |
| --- | --- | --- |
| Imágenes por segundo, Campo Grande | 13 | 38–41 |
| Imágenes por segundo, Colegio / Club / Gym | 56 / 45 / 53 | 58–60 / 48 / 53–56 |
| CPU del servidor por segundo simulado, Campo Grande (10 participantes) | 170 ms | 54 ms |
| CPU del servidor, Colegio / Club / Gym | 35 / 41 / 38 ms | 29 / 35 / 28 ms |
| Latencia con 4 salas de 10 participantes a la vez | — | mediana 3,7 ms · p99 25,8 ms |

Qué se cambió:

- **Follaje de Campo Grande.** Cada roble eran unas 400 órdenes de dibujo por fotograma (cinco masas de hoja y 26 hojas de diez vértices). Ahora se pinta una vez en 16 láminas (radios de copa agrupados en cubos de 0,08 × cuatro tonos) y se estampa. El balanceo y el desvanecido junto a los personajes se mantienen.
- **Índices espaciales exactos de terreno y mobiliario.** Cada comprobación de apoyo recorría 2 rectángulos, 33 círculos, 64 tramos de sendero y 315 objetos. Ahora mira solo las figuras de su casilla. Una prueba compara el resultado con el cálculo exhaustivo en más de 80.000 puntos de los cuatro mapas, y se verificó que esa prueba detecta un índice mal construido.
- **Clave de muros de visión** memorizada, en lugar de reconstruirse en cada fotograma.
- **Peticiones adaptadas a la fase:** 95 ms jugando (la respuesta de los controles no cambia), 200 ms en reuniones y vestíbulo, 240 ms con una misión abierta (el mapa está tapado y nadie puede moverse) y 400 ms al terminar. Las acciones se envían al instante.
- **Servidor:** la simulación de bots pasa de 100 a 250 ms; `tick` recupera el tiempo en subpasos de 100 ms, así que la simulación es la misma. La limpieza de salas abandonadas va por separado y sigue cada 100 ms.
- **Recálculo de rutas:** la red de seguridad pasa de 6 a 10 s. Los cambios reales de puertas, sabotaje u objetivo ya invalidan la ruta por sí solos.

### 3. Bots

- **Fallo grave corregido en Campo Grande.** El atajo de ruta muestreaba la línea cada 9 px, y una franja de césped de 4 px pasaba inadvertida. El bot daba por libre un camino que no podía recorrer, no avanzaba, borraba su ruta y se quedaba quieto para siempre: la partida en el parque no terminaba nunca. Ahora el muestreo es de 3 px, el recorte de ruta avanza hacia delante con un presupuesto acotado y, si el bot se encaja, prueba ocho direcciones para salir.
- **Vuelta de patrulla:** si el punto de partida resulta inalcanzable, se abandona a los 3 s. Antes, el bot esperaba hasta el corte de 25 s.
- **Impostor:** cambia de destino de cobertura a los 9 s si no puede llegar.
- **Tripulante:** si en 7 s no se acerca a su tarea, elige otra y aparta esa durante 15 s.
- **Ritmo:** las tareas les llevan un **+34,6 % de tiempo de media** (objetivo: aproximadamente 35 %), y en las 8 partidas emparejadas de los cuatro mapas se completan todas.
- **Se mantiene lo que ya funcionaba en la 8.1:** esperan el voto de los humanos salvo en los últimos 10 s; votan obligatoriamente con 3 vivos y un impostor o 5 vivos y dos; entienden los mensajes rápidos, las acusaciones y las coartadas; y no conocen roles que no hayan visto.

### 4. Móvil

- La ventanilla de misión no se desplaza: el encabezado, el aviso y la escena se reparten el alto, y la escena conserva su proporción.
- Varios dedos a la vez sobre el mismo aparato, que responde al primer toque. Arrastrar sobre él no mueve la página ni hace zoom.
- En vertical, el menú ya no deja huecos vacíos: el contenido sube junto al nombre y los botones de sala quedan abajo.

### 5. Errores visuales

- **Parpadeo al recuperar una sesión** (recargar o reconectar): durante 2–3 fotogramas se veía el lienzo negro, sin dibujar. Ahora se prepara con el fondo de la escena.
- **Fotogramas medidos:** 0 vacíos de 13.332, incluidos el viaje, la presentación del rol, una reunión completa y las transiciones juego → reunión → juego. En toda una reunión, las tarjetas de voto solo se retiran una vez, al cerrarla; votar no las reconstruye.
- **Movimiento de los bots:** ningún salto imposible en los cuatro mapas. Los únicos saltos son teletransportes legítimos (conductos, escaleras, expulsión), y el motor ya los marca con `motionEpoch` para que el cliente no los interpole.

### 6. Pruebas realizadas

| Prueba | Resultado |
| --- | --- |
| `npm test` (motor, mapas, bots, salas, misiones) | 161 / 161 |
| `tests/missions.test.mjs` (nueva, sin dependencias) | 8 / 8 |
| Equivalencia de colisiones indexadas (más de 80.000 puntos) | correcta |
| Suavidad de bots en los cuatro mapas | 15 / 15 ejecuciones |
| `npm run test:benchmark` | 8 / 8 pares, +34,6 % |
| Las 34 misiones resueltas con puntero real en Chromium | 34 / 34: sin botón, cierre automático, solución aceptada por el servidor, sello mostrado |
| Barrido móvil: 34 misiones × 6 pantallas (390×844, 360×800, 360×640, 844×390, 800×360, 1024×768) | 204 / 204: sin desplazamiento, nada fuera de pantalla, proporción conservada |
| Multitáctil real (eventos táctiles de Chromium) | 5 / 5: dos cables a la vez, tres grifos a la vez, segundo dedo con el primero sujetando, primer toque, sin zoom ni desplazamiento |
| Integración con el servidor real, en los cuatro mapas | 11 / 11 en cada uno: entrada, presentación, mapa dibujado, HUD, movimiento aceptado, sin errores de consola, autoridad del servidor y bots |
| Listas personalizadas en escritorio, vertical y horizontal | 24 / 24 sustituidas, ninguna nativa visible |

### 7. Limitaciones y pendientes reales

- **No se ha probado en un móvil físico.** El tacto se ha probado con los eventos táctiles reales de Chromium a tamaños de teléfono, que es lo más cercano disponible aquí. Conviene una pasada en un teléfono antes de publicar.
- **No se ha jugado con diez personas reales.** Se ha probado con una persona y nueve bots, y con cuatro salas simultáneas de diez participantes contra el servidor.
- **`npm run test:ui` sigue saltando sus pruebas DOM:** necesitan `happy-dom`, y este entorno no tenía acceso al registro de npm. Se retiraron las que describían la maquetación antigua de las misiones; esas misiones ahora se comprueban en un navegador real.
- **Mapas:** se mejoró el rendimiento de Campo Grande, pero no se rediseñó la decoración de Gym, Colegio ni Club. Su reparto de sabotajes ya era correcto en la 8.1 (cada sabotaje tiene paneles propios, accesibles y en salas distintas, y la prueba existente lo verifica) y no se ha cambiado.
- **Sonido:** las misiones usan el sintetizador de tonos que ya tenía el juego; no se han añadido archivos de audio.
- **Campo Grande** va a unas 38–41 imágenes por segundo frente a 48–60 en los otros mapas. El coste que queda está en los 315 objetos que se dibujan intercalados con los personajes según la profundidad.
- **Puertas cerradas:** durante un sabotaje de puertas, quien esté en una sala cerrada (bot o persona) espera a que la reparen. Es el comportamiento del juego, no un fallo.

### 8. Archivos

97 archivos propios. Nuevos: `public/mechanism.js`, `public/mechanism.css`, `tests/missions.test.mjs` e `INFORME_9.0.md`. Eliminados por quedar sin uso: `public/device-art.js`, `public/instruments.js` y `public/task-layout.js`.

---

## Sanagus AS 8.1 — caminos, robles y minimapa móvil

### Cambios

- Campo Grande bloquea caminar por la hierba. El servidor y la predicción del cliente usan la misma superficie: caminos de tierra, ramales a los objetivos, plaza de la fuente y suelo pavimentado de las casetas. La hierba no se convierte en una pared de visión.
- Todos los accesos a tareas, paneles de reparación, cámaras y conductos siguen conectados. Se han añadido ramales y accesos laterales a las casetas y apartado el mobiliario de los caminos. Las partidas guardadas reubican las posiciones antiguas que hayan quedado sobre hierba.
- Más de 200 robles distribuidos por el césped, con copas mayores, hojas individuales, sombras y movimiento suave. Las copas mantienen la transparencia al tapar personajes. Los animales respetan los mismos caminos y conservan posiciones sincronizadas. Los espectros conservan el movimiento libre dentro de la valla.
- Minimapa móvil a toda el área segura disponible, tanto vertical como horizontal, sin el límite de anchura de la tarjeta anterior. Cierre de 44 píxeles siempre visible. El canvas adapta su resolución y proporciones a su espacio real; las etiquetas conservan 11 píxeles CSS, sin encogerse por devicePixelRatio. Se mantiene la misma fuente y el orden de etiquetas sobre las misiones.

### Validación

Pruebas del terreno, desplazamiento contra hierba, conexión de todos los objetivos, fauna, valla, roles, tareas, reparaciones y presentación: 17 superadas. Los bots reparan los siete sabotajes del parque antes del plazo. Dos pruebas del minimapa verifican uniformidad, capas y escala HiDPI. Cuatro pruebas DOM/Canvas de los mapas, tareas del parque, animación y alineación superadas, más dos pruebas del cliente completo de escritorio/móvil. Compilación e integración HTTP/D1 con cuatro clientes en los cuatro mapas completadas antes de publicar.

Inspección de un plano generado por el renderizador Canvas. No se ha probado un navegador real ni un móvil físico; las comprobaciones DOM/Canvas no garantizan ergonomía ni FPS de todos los dispositivos. El parque conserva su adaptación compacta del plano y no incluye calles exteriores.

### Arranque y despliegue

Node 24: descomprime conservando carpetas y ejecuta `node server/node.js`. Abre `http://localhost:3000`. Las instrucciones completas están en README.md. Para Internet se necesita un servicio Node que sirva página y API desde el mismo origen; no basta con abrir el HTML ni alojarlo como página estática. Los informes anteriores son históricos.

---

## Sanagus AS 8.0.0 — informe de entrega

### Cambios implementados

- Campo Grande es el cuarto mapa seleccionable: parque compacto inspirado en el plano, sin calles exteriores. Valla continua con colisión para vivos y espectros, lago al norte, fuente circular con chorros animados, senderos conectados, jardines, rosaleda, quiosco y caseta de mantenimiento. El agua tiene orilla irregular, reflejos y ondas. Ochenta árboles con troncos opacos y copas que se atenúan cuando tapan personajes.
- Fauna original 2D con sombras, volumen y pasos animados: pavos reales, patos y ardillas. El servidor simula sus desplazamientos, respeta obstáculos y valla, y envía las mismas identidades y posiciones a todos los clientes. El cliente interpola cada animal cada fotograma. No son jugadores falsos ni tienen roles.
- Parque jugable: quince estaciones temáticas de riego, semillas, residuos, filtración, agua, fuente, electricidad, herramientas, suministros, cámaras, farolas y permisos. Reutilizan trece mecanismos físicos ya existentes y validados; no se presentan como quince minijuegos de mecánica nueva. Cuatro cámaras, cuatro circuitos aislados de tres accesos de mantenimiento, siete sabotajes con ocho paneles físicos exclusivos, dos terminales críticos coordinados y botón central sobre mesa. Llegada, música y expulsión ambientadas en el parque. Sin profesores.
- Gym rediseñado de verdad: doce espacios desiguales, piscina cubierta con agua animada y pasillo perimetral, yoga/pilates, vestuarios y duchas ampliados, pabellón asimétrico, cruces, accesos laterales y recorridos alternativos. Dirección desaparece; sus archivos se trasladan a Recepción. Se mantienen cámaras, tareas, conductos, sabotajes y modos anteriores.
- Los bots reservan objetivos diversos y mantienen planes estables. Alternan tareas con patrullas, investigación de incidentes observados, seguimiento breve de sospechosos visibles y uso real de cámaras cuando están cerca. Sus observaciones de vigilancia requieren señal y línea de visión. Las reparaciones urgentes interrumpen las investigaciones sin retraso añadido. No cambia la velocidad ni la duración de cada minijuego. Las exploraciones tienen límite y vuelven al trabajo.
- Todos los bots esperan los votos de humanos vivos conectados; pueden votar cuando quedan diez segundos. La decisión se calcula al emitir el voto con la información más reciente. Validación en servidor y rechazo de duplicados. Tripulantes en situaciones críticas votan a una persona: estiman el riesgo a partir del número configurado de impostores y expulsiones confirmadas públicamente, sin leer roles ajenos. El cierre por tiempo aplica también esa regla.
- Presentación de diez jugadores en cinco y cinco; filas adaptativas al girar, con nombres y accesorios. El texto del rol recupera todo el espacio durante la lectura.
- Barra verde arriba a la izquierda con el texto «Tareas completadas». Muestra el progreso colectivo sincronizado, sin cantidades ni porcentajes visibles, también en el panel lateral. Se conserva la falta de señal durante el sabotaje de comunicaciones.
- Correcciones adicionales: apariciones iniciales validadas para evitar la mesa; tolerancia subpíxel al alcanzar rutas; un solo presupuesto de desplazamiento por tick; impostores sin pausas artificiales en mitad de su camino; caché de bordes para colisiones y liberación de superficies del mapa al cambiar de destino para limitar memoria.

### Pruebas superadas

- 148 pruebas automatizadas del motor: cuatro mapas, geometría, colisiones, tareas, reglas privadas, red, roles, sabotajes, cámaras, asesinatos, reportes, votos anónimos, reconexión, bots y limpieza de salas. Cero fallos y cero omitidas.
- 22 pruebas DOM/Canvas nativo: cliente completo escritorio/móvil, progreso sin cifras y avance real, gestos de las 34 mecánicas existentes, diez máquinas Gym en ambas orientaciones, joystick con otro dedo, chat estable, selectores y temporizador. Incluyen los quince terminales del parque, render de cuatro mapas en 390×844 y 844×390, fauna, agua animada, minimapa y filas 5+5. Cero fallos y cero omitidas.
- Worker compilado y D1 local: cuatro sesiones independientes en cada uno de los cuatro mapas; acceso público/privado, cámaras, tareas, reparaciones, movimiento, conductos aislados, fauna compartida, asesinato/reporte, votos concurrentes y victoria. Prueba atravesando las rutas HTTP reales de la compilación; no es una simulación de interfaz.
- Imágenes inspeccionadas generadas directamente por el renderizador Canvas: planos de Gym y parque, aparición y especies animales. No se usaron capturas de un navegador.

### Medición de comportamiento

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

### Archivos principales

Nuevos: public/park.js, public/park-art.js, public/lineup.js, game/wildlife.js, game/bot-behavior.js, tests/version8.test.js, tests/interface8.test.mjs y tests/bot-benchmark.mjs.
Modificados: public/gym.js, public/gym-art.js, public/worlds.js, public/content.js, public/visibility.js, public/render.js, public/scenery.js, public/tasks.js, public/client.js, public/index.html, public/style.css, public/repair-layout.js, public/journey.js, public/expulsion.js, public/finale.js, public/soundscape.js, game/engine.js, game/bots.js, game/social.js, game/tasks.js, pruebas de integración y regresión, README y versión del paquete.

### Límites de validación y ejecución

No se ha abierto un navegador real ni probado un teléfono físico, Safari/iOS o Android: el entorno no ofrece control de navegador compatible. DOM/Canvas nativo y coordenadas táctiles no prueban el aspecto CSS final, ergonomía o FPS de un móvil real. Las pruebas de varios clientes son HTTP/D1 y Node, no pestañas abiertas ni dispositivos conectados a Internet. No se afirma una tasa de FPS medida en móviles.

El plano se ha adaptado de forma compacta y original; no reproduce cada árbol ni la escala geográfica exacta. La piscina es un obstáculo con paseo transitable: no incorpora natación. La fauna es ambiental y no altera roles o victorias. La IA conserva reglas y probabilidades, sin conversación generativa.

D1 limpia registros abandonados durante solicitudes y rechaza salas caducadas; no se añadió cron externo. Node conserva limpieza periódica. El ZIP incluye cliente, motor, servidor, pruebas e instrucciones y se ejecuta con Node 24 sin instalar dependencias para jugar. Las pruebas opcionales de interfaz requieren Happy DOM y Canvas; las del Worker requieren las dependencias del alojamiento administrado, que no van dentro del ZIP. No incluye node_modules ni artefactos compilados del sitio.

### Arranque

Descomprime conservando public, game, server y tests. Desde esa carpeta: node server/node.js. Abre http://localhost:3000. Para Internet, un único servicio Node que ejecute ese comando y sirva página/API desde el mismo origen, con PORT del proveedor y HTTPS. README detalla configuración, Docker y uso en Wi-Fi. Selecciona Campo Grande en el ordenador del lobby. Los mapas Colegio y Club se conservan.

---

## Informe de entrega · Sanagus As 7.0.0

Actualización sobre el proyecto existente, conservando el colegio, el club, roles, tareas, personalización, cámaras, conductos, asesinatos, reuniones, fantasmas y victorias. No se ha creado un juego paralelo.

### Cambios

- Reuniones: tarjetas y avatares persistentes, sin reconstrucción al votar. El render del mundo conserva su superficie ante oscilaciones de un píxel y utiliza fotogramas completos; se mantiene el último contorno válido de visión. Se conservan las paredes y el radio mundial de visión.
- Quince frases estructuradas con objetivos y ubicaciones validados, identidad y hora del servidor. Los bots ponderan testimonios, responden por turnos con un mínimo de 500 ms, recuerdan coartadas y contradicciones entre reuniones y conservan las pruebas que realmente observaron. Personalidades diferentes y presión configurable. Los bots impostores pueden emitir sospechas falsas; las acusaciones humanas no se convierten automáticamente en pruebas.
- Votos de bots después de los humanos vivos conectados; salida automática en los últimos cuatro segundos. Las declaraciones humanas reservan 1,8 segundos para réplica mientras queda tiempo. Se conservan los votos anónimos y los canales de fantasmas.
- Salas públicas y privadas, código aleatorio único, pantalla de entrada, enlace copiable y validación en servidor. Caducidad de 30 segundos sin humanos. Limpieza periódica en Node; en D1 se rechaza el acceso a registros vencidos y se limpian durante las siguientes solicitudes de creación/listado. No hay una simulación de bots en segundo plano en D1 cuando nadie solicita la sala.
- Móvil: acciones en pointerdown con un segundo dedo mientras el joystick permanece capturado; protección frente al clic duplicado, selección de texto y zoom accidental. Orientación libre, zonas seguras y adaptación al teclado. Tareas con distribución horizontal/vertical y ajuste proporcional de su escena dentro de la ventana.
- Todos los selectores visibles tienen presentación propia, teclado, foco, cierre al seleccionar, fuera o con Escape, y opciones en un portal que no queda cortado por paneles.
- Sanagus Gym: once salas, fuerza, cardio, pabellón, actividades, vestuarios, duchas, recepción, dirección, seguridad, mantenimiento y almacén. Cuatro cámaras funcionales, cuatro circuitos aislados de conductos y botón sobre una mesa en Recepción. Sin profesores. Viaje, música, expulsión por la salida y final adaptados.
- Diez tareas originales del Gym, además de las 24 anteriores: cinta, poleas, discos, marcador, ventilación, taquillas, revisión de balones, canasta, spinning y dosificadores. Tareas comunes compartidas y tareas cortas/largas. Se amplían la instalación/arranque del ordenador, extracción/escaneo de libros, traslado de papeles, giro de piezas y conexión física de datos. Se conservan las mecánicas anteriores que ya tenían cableado, válvulas, bandejas, secuencias, faders, pases, calibración y palancas.
- Paneles exclusivos por tipo de sabotaje en cada mapa, con coordenadas físicas distintas, interacción y minijuego propios. Flechas, plano e IA usan la misma selección. Dos terminales críticos en salas diferentes, también en partidas de una sola planta. Los bots esperan a que estén preparados ambos terminales para confirmar coordinadamente. Se mantienen los 90 segundos y la recarga de 112,5 segundos.
- Navegación de bots con anticipación de puntos de ruta solo cuando pasa el círculo de colisión; se conserva la interpolación temporal por fotograma de jugadores y bots.

### Pruebas realizadas

- **132/132 pruebas del motor**, sin omisiones: geometría y rutas de los tres mapas, tareas, roles, movimiento, paredes, alcance visible, HTTP con cuatro clientes, votos, fantasmas, sabotajes, privacidad, caducidad Memory/D1 con SQLite y bots. Los bots repararon todos los sabotajes de los tres mapas antes del plazo.
- **18/18 pruebas de DOM/Canvas**, sin omisiones: 24 mecanismos anteriores, diez nuevos, soluciones y gestos, diez máquinas del Gym en ambas orientaciones con cambio de tamaño sin perder progreso, joystick y segundo dedo simultáneo, selectores, chat incremental, tarjetas estables, cuatro cámaras y cliente completo en modos escritorio/móvil.
- **Integración del Worker compilado y D1 superada**: cuatro clientes en colegio, club y gimnasio; sala privada, rol privado, movimiento, cámaras, tareas, reparaciones, votos concurrentes, victoria y revancha. Presentación con confirmación y bots persistidos con avance autoritativo.
- Inspección de imágenes creadas con el renderizador Canvas del juego, incluyendo el gimnasio y sus máquinas. Se corrigió un espejo que bloqueaba una entrada. Todas las estaciones y reparaciones tienen ruta con el radio físico del jugador.

### Límites y validación pendiente

- No había navegador de pruebas compatible ni móvil físico disponible. Happy DOM no calcula el diseño CSS como Safari/Chrome. Los gestos y cambios de orientación anteriores son pruebas de lógica y coordenadas en DOM/Canvas, no sesiones en teléfonos reales.
- Pendiente la aceptación visual y de rendimiento en Safari/iOS, Chrome/Android y diferentes tamaños reales: no se certifican FPS ni ausencia absoluta de parpadeo producido por drivers, cambios de barras del navegador o problemas de red reales. El modo pantalla completa depende de las capacidades del navegador; se conserva la alternativa de instalación.
- El ajuste de las tareas evita scroll por diseño y conserva la proporción, pero puede reducir su escala en pantallas extremas. No se ha medido su legibilidad en todos los modelos de móvil.
- Los bots usan reglas, probabilidades y memoria, no conversación generativa. Las frases del menú son el canal comprensible garantizado; pueden equivocarse o no creer testimonios.
- En D1 la eliminación física es por caducidad y limpieza en solicitudes; no se ha añadido un cron externo. Una sala vencida no admite reconexión ni aparece como pública aunque su registro espere la siguiente limpieza.
- El ZIP contiene el proyecto completo ejecutable con Node, cliente, servidor, pruebas del motor e interfaz, instrucciones y configuración para servicio Node. No incluye node_modules ni el envoltorio de compilación del alojamiento administrado; esa versión se conserva y valida en el repositorio del sitio.

### Archivos principales modificados

Servidor: game/engine.js, game/api.js, game/bots.js, game/tasks.js, server/node.js, server/memory-store.js, server/d1-store.js. Nuevos: game/social.js, game/rooms.js, game/gym-tasks.js.

Cliente: public/client.js, public/index.html, public/upgrade.css, public/tasks.js, public/club-tasks.js, public/device-art.js, public/instruments.js, public/meetings.js, public/touch-controls.js, public/render.js, public/scenery.js, public/content.js, public/worlds.js, public/navigation.js, public/journey.js, public/finale.js, public/expulsion.js y public/soundscape.js. Nuevos: public/quick-chat.js, public/game-select.js, public/task-layout.js, public/repair-layout.js, public/gym.js, public/gym-art.js y public/gym-tasks.js.

Pruebas actualizadas para los nuevos paneles y reglas de voto, con tests/version7.test.js y tests/interface7.test.mjs añadidos; integración ampliada en tests/hosted.test.mjs. Instrucciones actualizadas en README.md.

### Ejecutar y publicar

Node 24 o superior. Descomprime el ZIP completo y ejecuta **node server/node.js** desde su carpeta. Abre **http://localhost:3000**. No requiere instalar dependencias para jugar. Para otros dispositivos usa la IP local del servidor; para Internet publica como un único servicio Node con **node server/node.js** y el puerto PORT del proveedor. Las instrucciones completas, Docker y la configuración del servicio están incluidas en README.md.

---

## Sanagus As 6.0 — informe de actualización

Se ha modificado el proyecto existente. Se mantienen ambos mapas, personalización, roles, profesores escolares, tareas, sabotajes, cámaras, conductos aislados, chat, fantasmas, votación, revancha y controles móviles.

### Fase A — estado, visión y geometría

**Archivos:** `game/engine.js`, `game/intro.js`, `public/client.js`, `public/render.js`, `public/club.js`, `public/school.js`.

- Cambiar mapa no llama a la aparición ni inicia una partida nueva en el cliente: el ordenador permanece abierto y se conservan posición y época del movimiento.
- Viaje, suspense neutral, revelación, lectura y juego tienen estados independientes. El cliente acusa recibo después de mostrar la presentación en un fotograma; los ocho segundos completos comienzan tras esa confirmación. Se gestiona la desconexión para no esperar indefinidamente.
- Suelo y muebles tienen cachés diferentes. Rejillas al nivel del suelo, terminales/muebles por profundidad, cobertura de muebles y niebla de paredes conservadas. Dos rejillas escolares y el terminal de O2 disponen de mayor separación.
- La geometría exacta de rayos y paredes de la versión anterior se mantiene: no se desactiva la oscuridad para ocultar un fallo.

**Validación:** regresiones de visibilidad en más de mil posiciones y decenas de miles de rayos, esquinas, desplazamientos subpíxel, radio visible, cambios de pantalla/zoom, colisiones, rutas y movimiento con cuatro clientes HTTP. Pruebas nuevas de cambio de mapa y presentación lenta. Sin fallos en el conjunto del motor.

### Fase B — mecanismos y bots

**Archivos:** `public/tasks.js`, `public/club-tasks.js`, `public/device-art.js`, `public/instruments.js`, `public/upgrade.css`, `game/bots.js`, `game/engine.js`, `server/node.js`.

- Los 24 tipos tienen carcasa y piezas físicas propias. Cables curvados, consola musical progresiva, pupitres/circuitos giratorios, interruptores, bandejas y documentos arrastrables, biblioteca/vinilos, cajones de clasificación, limpieza, teclado, ruedas de válvula, mezcla de sonido, patch de altavoces, botellas, pases y lector, fusibles, datos, relojes de calibración y compactadora.
- Los gestos usan eventos de puntero; se mantienen alternativas de toque y teclado donde corresponden. El arrastre no provoca clics residuales. Se limpian temporizadores, animaciones y observadores al cerrar.
- Gestión de bots desde el ordenador, solo por el líder y dentro del aforo. Identidades distinguibles, navegación A* con heap y caché de pasos, tareas verificadas, escaleras, sabotajes, reparaciones, reportes, sospechas observadas, mensajes y votos. Los bots impostores buscan víctimas, respetan alcance/recarga, evitan testigos cuando pueden, fingen y sabotean. No son decoración.
- Botón de reunión físico con confirmación y recarga de 30 segundos validada por el servidor. Se puede cerrar sin convocar.
- Se conservan el chat incremental, avatares, canal de muertos, anonimato de votos en los datos y cuenta atrás 10–0.

**Validación:** partidas simuladas ganadas por tareas en ambos mapas; asesinatos de bot; acceso a todas las estaciones, reparaciones y escaleras; reparación de todos los sabotajes de ambos mapas; reporte/chat/voto; restricciones del líder y privacidad; simulación Node sin peticiones del navegador. Once pruebas DOM/Canvas cubren los 24 mecanismos y el cliente de escritorio/móvil simulado.

### Fase C — caravana, presentación y viajes

**Archivos:** `public/caravan.js`, `public/journey.js`, `public/soundscape.js`, `public/upgrade.css`, `public/client.js`.

- Forma exterior con frontal/cabina, volante, instrumentación, asientos, salón, cocina, nevera, armario y equipaje. Las diez posiciones y rutas siguen libres.
- Exterior continuo con tres ritmos de desplazamiento, carretera, campos, árboles, farolas y tráfico. Ventanas con paisaje móvil. Ambiente de carretera original sintetizado, sujeto al gesto inicial y al mezclador.
- Objetos cercanos resaltados, apertura del armario y encendido del ordenador. Menú y reuniones mayores en escritorio, reglas separadas de las táctiles.
- Valladolid mantiene una introducción neutral. Los viajes duran 11 segundos: giro continuo, reducción, intermitente, llegada, parada y colores interpolados. El tráfico ocupa otro carril. Los rótulos se sitúan abajo para no tapar la fachada.

**Validación:** trayectoria muestreada cada 10 ms, continuidad y separación del tráfico; fotogramas del día, atardecer, noche y llegada; caravana renderizada a 1440×900, 390×844 y 844×390. Esto comprueba el Canvas, no el diseño CSS de un navegador.

### Fase D — acabado

**Archivos:** `public/expulsion.js`, `public/upgrade.css`, `public/soundscape.js`, `public/index.html`.

- Portero completo con uniforme, máscara, pasos y brazos en el club; profesor completo y patada desde la terraza en el colegio. Son secuencias distintas. Apariencia del expulsado conservada.
- Veredicto inferior, encima de la identidad, con áreas seguras; se conserva la pantalla completa.
- Cuatro asesinatos cartoon, cadáveres, fantasma, avisos de reunión/reporte, finales, música contextual, mezclador y opción de efectos suaves conservados. Sin fotografías reales ni recursos extraídos del juego de referencia.

**Validación:** renderizados de ambas expulsiones en cuatro momentos; pruebas de seis cinemáticas y cancelación; lectura de estilos y pruebas DOM del cliente en modo táctil/escritorio.

### Fase E — entrega y límites

- `npm test`: **118 pruebas aprobadas** del motor, geometría, HTTP, bots y regresiones.
- DOM/Canvas: **11 pruebas aprobadas**, ninguna omitida, con Happy DOM y el renderizador Canvas de desarrollo.
- Worker/D1: comprobación sobre el código compilado con cuatro clientes por mapa, tareas, reparaciones, cámaras, reuniones/votos concurrentes, victoria/revancha, presentación moderna y bots persistidos. La prueba está en `tests/hosted.test.mjs` del proyecto alojado.
- Inspección de **22 fotogramas** producidos por el renderizador nativo, no capturas fingidas de un navegador.
- ZIP de ejecución con menos de 100 archivos, cliente y servidor completos, pruebas del motor, instrucciones y arranque Windows. No requiere instalar dependencias para jugar.

**Pendiente de validación externa:** no se ha podido abrir un navegador real ni un móvil físico en este entorno. Happy DOM no realiza el diseño CSS ni reproduce Safari/Chrome móvil. No se certifican FPS físicos, composición CSS final ni políticas de audio/pantalla completa en cada teléfono. Conviene hacer una partida desde los dispositivos de destino antes de anunciar el lanzamiento.

**Límites deliberados:** chat de bots basado en frases, decisiones probabilísticas que pueden equivocarse; Node conserva salas en memoria y requiere una sola instancia. D1 recupera la simulación por reloj del servidor al recibir la siguiente petición. No se ha convertido el transporte existente en WebSocket ni eliminado la interpolación por fotograma.

---

## Datos de la prueba de bots 8.0 (antes `PRUEBAS_BOTS_8.0.json`)

```json
[
  {
    "map": "club",
    "seed": 0,
    "tasks": 6,
    "control": {
      "totalMs": 71400,
      "meanMs": 62433.333333333336,
      "completion": {
        "pair-0-3": 55800,
        "pair-0-1": 60100,
        "pair-0-2": 71400
      },
      "modes": {},
      "duration": {
        "pair-0-3": {
          "taskMs": 0,
          "investigateMs": 0,
          "episodes": 0,
          "modes": {}
        },
        "pair-0-1": {
          "taskMs": 0,
          "investigateMs": 0,
          "episodes": 0,
          "modes": {}
        },
        "pair-0-2": {
          "taskMs": 13500,
          "investigateMs": 0,
          "episodes": 0,
          "modes": {}
        }
      }
    },
    "active": {
      "totalMs": 118600,
      "meanMs": 88266.66666666667,
      "completion": {
        "pair-0-3": 70000,
        "pair-0-1": 76200,
        "pair-0-2": 118600
      },
      "modes": {
        "patrol": 30,
        "camera": 1
      },
      "duration": {
        "pair-0-3": {
          "taskMs": 54300,
          "investigateMs": 15700,
          "episodes": 7,
          "modes": {
            "patrol": 6,
            "camera": 1
          }
        },
        "pair-0-1": {
          "taskMs": 58100,
          "investigateMs": 18100,
          "episodes": 9,
          "modes": {
            "patrol": 9
          }
        },
        "pair-0-2": {
          "taskMs": 98200,
          "investigateMs": 33900,
          "episodes": 15,
          "modes": {
            "patrol": 15
          }
        }
      }
    },
    "increase": 0.413774693005873,
    "totalIncrease": 0.6610644257703082
  },
  {
    "map": "club",
    "seed": 1,
    "tasks": 6,
    "control": {
      "totalMs": 82500,
      "meanMs": 64766.666666666664,
      "completion": {
        "pair-1-3": 45200,
        "pair-1-2": 66600,
        "pair-1-1": 82500
      },
      "modes": {},
      "duration": {
        "pair-1-3": {
          "taskMs": 0,
          "investigateMs": 0,
          "episodes": 0,
          "modes": {}
        },
        "pair-1-2": {
          "taskMs": 13500,
          "investigateMs": 0,
          "episodes": 0,
          "modes": {}
        },
        "pair-1-1": {
          "taskMs": 0,
          "investigateMs": 0,
          "episodes": 0,
          "modes": {}
        }
      }
    },
    "active": {
      "totalMs": 108200,
      "meanMs": 86833.33333333333,
      "completion": {
        "pair-1-3": 58500,
        "pair-1-2": 93800,
        "pair-1-1": 108200
      },
      "modes": {
        "patrol": 31
      },
      "duration": {
        "pair-1-3": {
          "taskMs": 45200,
          "investigateMs": 13300,
          "episodes": 6,
          "modes": {
            "patrol": 6
          }
        },
        "pair-1-2": {
          "taskMs": 80000,
          "investigateMs": 27300,
          "episodes": 12,
          "modes": {
            "patrol": 12
          }
        },
        "pair-1-1": {
          "taskMs": 82100,
          "investigateMs": 26100,
          "episodes": 13,
          "modes": {
            "patrol": 13
          }
        }
      }
    },
    "increase": 0.34071024189397825,
    "totalIncrease": 0.3115151515151515
  },
  {
    "map": "gym",
    "seed": 0,
    "tasks": 6,
    "control": {
      "totalMs": 93600,
      "meanMs": 78866.66666666667,
      "completion": {
        "pair-0-3": 63800,
        "pair-0-2": 79200,
        "pair-0-1": 93600
      },
      "modes": {},
      "duration": {
        "pair-0-3": {
          "taskMs": 0,
          "investigateMs": 0,
          "episodes": 0,
          "modes": {}
        },
        "pair-0-2": {
          "taskMs": 13500,
          "investigateMs": 0,
          "episodes": 0,
          "modes": {}
        },
        "pair-0-1": {
          "taskMs": 0,
          "investigateMs": 0,
          "episodes": 0,
          "modes": {}
        }
      }
    },
    "active": {
      "totalMs": 125600,
      "meanMs": 106500,
      "completion": {
        "pair-0-3": 83600,
        "pair-0-2": 110300,
        "pair-0-1": 125600
      },
      "modes": {
        "patrol": 41
      },
      "duration": {
        "pair-0-3": {
          "taskMs": 64600,
          "investigateMs": 19000,
          "episodes": 9,
          "modes": {
            "patrol": 9
          }
        },
        "pair-0-2": {
          "taskMs": 91400,
          "investigateMs": 32400,
          "episodes": 15,
          "modes": {
            "patrol": 15
          }
        },
        "pair-0-1": {
          "taskMs": 93800,
          "investigateMs": 31800,
          "episodes": 17,
          "modes": {
            "patrol": 17
          }
        }
      }
    },
    "increase": 0.35038038884192724,
    "totalIncrease": 0.3418803418803418
  },
  {
    "map": "gym",
    "seed": 1,
    "tasks": 6,
    "control": {
      "totalMs": 86300,
      "meanMs": 74900,
      "completion": {
        "pair-1-2": 62900,
        "pair-1-3": 75500,
        "pair-1-1": 86300
      },
      "modes": {},
      "duration": {
        "pair-1-2": {
          "taskMs": 13500,
          "investigateMs": 0,
          "episodes": 0,
          "modes": {}
        },
        "pair-1-3": {
          "taskMs": 0,
          "investigateMs": 0,
          "episodes": 0,
          "modes": {}
        },
        "pair-1-1": {
          "taskMs": 0,
          "investigateMs": 0,
          "episodes": 0,
          "modes": {}
        }
      }
    },
    "active": {
      "totalMs": 117900,
      "meanMs": 103100,
      "completion": {
        "pair-1-2": 91700,
        "pair-1-3": 99700,
        "pair-1-1": 117900
      },
      "modes": {
        "patrol": 39,
        "camera": 1
      },
      "duration": {
        "pair-1-2": {
          "taskMs": 80300,
          "investigateMs": 24900,
          "episodes": 12,
          "modes": {
            "patrol": 12
          }
        },
        "pair-1-3": {
          "taskMs": 75500,
          "investigateMs": 24200,
          "episodes": 12,
          "modes": {
            "patrol": 11,
            "camera": 1
          }
        },
        "pair-1-1": {
          "taskMs": 87300,
          "investigateMs": 30600,
          "episodes": 16,
          "modes": {
            "patrol": 16
          }
        }
      }
    },
    "increase": 0.37650200267022704,
    "totalIncrease": 0.36616454229432205
  },
  {
    "map": "park",
    "seed": 0,
    "tasks": 6,
    "control": {
      "totalMs": 55700,
      "meanMs": 51233.333333333336,
      "completion": {
        "pair-0-3": 43700,
        "pair-0-1": 54300,
        "pair-0-2": 55700
      },
      "modes": {},
      "duration": {
        "pair-0-3": {
          "taskMs": 0,
          "investigateMs": 0,
          "episodes": 0,
          "modes": {}
        },
        "pair-0-1": {
          "taskMs": 0,
          "investigateMs": 0,
          "episodes": 0,
          "modes": {}
        },
        "pair-0-2": {
          "taskMs": 13500,
          "investigateMs": 0,
          "episodes": 0,
          "modes": {}
        }
      }
    },
    "active": {
      "totalMs": 102900,
      "meanMs": 77033.33333333333,
      "completion": {
        "pair-0-3": 56100,
        "pair-0-1": 72100,
        "pair-0-2": 102900
      },
      "modes": {
        "patrol": 25,
        "camera": 2
      },
      "duration": {
        "pair-0-3": {
          "taskMs": 44200,
          "investigateMs": 11900,
          "episodes": 6,
          "modes": {
            "patrol": 6
          }
        },
        "pair-0-1": {
          "taskMs": 56400,
          "investigateMs": 15700,
          "episodes": 8,
          "modes": {
            "patrol": 7,
            "camera": 1
          }
        },
        "pair-0-2": {
          "taskMs": 70900,
          "investigateMs": 45400,
          "episodes": 13,
          "modes": {
            "patrol": 12,
            "camera": 1
          }
        }
      }
    },
    "increase": 0.5035783994795053,
    "totalIncrease": 0.8473967684021544
  },
  {
    "map": "park",
    "seed": 1,
    "tasks": 6,
    "control": {
      "totalMs": 54000,
      "meanMs": 49766.666666666664,
      "completion": {
        "pair-1-3": 46400,
        "pair-1-2": 48900,
        "pair-1-1": 54000
      },
      "modes": {},
      "duration": {
        "pair-1-3": {
          "taskMs": 0,
          "investigateMs": 0,
          "episodes": 0,
          "modes": {}
        },
        "pair-1-2": {
          "taskMs": 13500,
          "investigateMs": 0,
          "episodes": 0,
          "modes": {}
        },
        "pair-1-1": {
          "taskMs": 0,
          "investigateMs": 0,
          "episodes": 0,
          "modes": {}
        }
      }
    },
    "active": {
      "totalMs": 69100,
      "meanMs": 65433.333333333336,
      "completion": {
        "pair-1-3": 60300,
        "pair-1-2": 66900,
        "pair-1-1": 69100
      },
      "modes": {
        "patrol": 25,
        "camera": 1
      },
      "duration": {
        "pair-1-3": {
          "taskMs": 46400,
          "investigateMs": 13900,
          "episodes": 7,
          "modes": {
            "patrol": 7
          }
        },
        "pair-1-2": {
          "taskMs": 61400,
          "investigateMs": 19000,
          "episodes": 10,
          "modes": {
            "patrol": 10
          }
        },
        "pair-1-1": {
          "taskMs": 53300,
          "investigateMs": 15800,
          "episodes": 9,
          "modes": {
            "patrol": 8,
            "camera": 1
          }
        }
      }
    },
    "increase": 0.31480241125251185,
    "totalIncrease": 0.2796296296296297
  },
  {
    "map": "school",
    "seed": 0,
    "tasks": 6,
    "control": {
      "totalMs": 87700,
      "meanMs": 79066.66666666667,
      "completion": {
        "pair-0-1": 64000,
        "pair-0-2": 85500,
        "pair-0-3": 87700
      },
      "modes": {},
      "duration": {
        "pair-0-1": {
          "taskMs": 0,
          "investigateMs": 0,
          "episodes": 0,
          "modes": {}
        },
        "pair-0-2": {
          "taskMs": 13500,
          "investigateMs": 0,
          "episodes": 0,
          "modes": {}
        },
        "pair-0-3": {
          "taskMs": 0,
          "investigateMs": 0,
          "episodes": 0,
          "modes": {}
        }
      }
    },
    "active": {
      "totalMs": 119800,
      "meanMs": 107466.66666666667,
      "completion": {
        "pair-0-1": 84200,
        "pair-0-3": 118400,
        "pair-0-2": 119800
      },
      "modes": {
        "patrol": 39
      },
      "duration": {
        "pair-0-1": {
          "taskMs": 63500,
          "investigateMs": 20700,
          "episodes": 7,
          "modes": {
            "patrol": 7
          }
        },
        "pair-0-3": {
          "taskMs": 88300,
          "investigateMs": 29600,
          "episodes": 15,
          "modes": {
            "patrol": 15
          }
        },
        "pair-0-2": {
          "taskMs": 98700,
          "investigateMs": 34100,
          "episodes": 17,
          "modes": {
            "patrol": 17
          }
        }
      }
    },
    "increase": 0.3591905564924114,
    "totalIncrease": 0.36602052451539335
  },
  {
    "map": "school",
    "seed": 1,
    "tasks": 6,
    "control": {
      "totalMs": 86600,
      "meanMs": 81500,
      "completion": {
        "pair-1-2": 73000,
        "pair-1-3": 84900,
        "pair-1-1": 86600
      },
      "modes": {},
      "duration": {
        "pair-1-2": {
          "taskMs": 13500,
          "investigateMs": 0,
          "episodes": 0,
          "modes": {}
        },
        "pair-1-3": {
          "taskMs": 0,
          "investigateMs": 0,
          "episodes": 0,
          "modes": {}
        },
        "pair-1-1": {
          "taskMs": 0,
          "investigateMs": 0,
          "episodes": 0,
          "modes": {}
        }
      }
    },
    "active": {
      "totalMs": 120900,
      "meanMs": 112533.33333333333,
      "completion": {
        "pair-1-2": 102600,
        "pair-1-3": 114100,
        "pair-1-1": 120900
      },
      "modes": {
        "patrol": 41
      },
      "duration": {
        "pair-1-2": {
          "taskMs": 85900,
          "investigateMs": 29000,
          "episodes": 14,
          "modes": {
            "patrol": 14
          }
        },
        "pair-1-3": {
          "taskMs": 84600,
          "investigateMs": 29000,
          "episodes": 13,
          "modes": {
            "patrol": 13
          }
        },
        "pair-1-1": {
          "taskMs": 90000,
          "investigateMs": 30400,
          "episodes": 14,
          "modes": {
            "patrol": 14
          }
        }
      }
    },
    "increase": 0.3807770961145194,
    "totalIncrease": 0.3960739030023095
  }
]
```

---

## 11.0.0 · Informe de entrega

Parte de la 10.0.0 y conserva los cuatro mapas, el multijugador, los bots, los objetos y el pase.

## Cambios
1. **Tareas:** 35 motores de minijuego temáticos en `public/themed-tasks.js` (arte en `task-kit.js`, tablas por mapa en `themed-defs.js`). Arrastre con la pieza pegada al puntero, cierre automático, validación y duración mínima en el servidor (`game/tasks.js`, `game/gym-tasks.js`). Eliminados `club-tasks.js` y `gym-tasks.js` del cliente.
2. **Bots:** coartadas por zona (`worlds.zoneAt`), dispersión tras votar y `ghostWander` para espectros.
3. **Campo Grande:** `steerStep` desliza contra los bordes; `park-fill.js` rellena de tierra las manchas de hierba aisladas/estrechas (transitables); juegos infantiles y suelos rediseñados; nueva imagen de llegada.
4. **Caravana:** `journey.js` y `caravan.js` mueven todo el paisaje a la velocidad de la carretera.
5. **Interfaz:** guía de sabotaje con hueco libre (`guideSpot`); expulsión a pantalla completa (`upgrade.css`); atajos G/B además de los existentes.
6. **Personajes:** `headingOf` + marcha en cuatro direcciones en `characters.js`.
7. **Escudo del impostor:** `room.shieldNullUntil` en `game/items.js` (30 s; los escudos conservan su caducidad).
8. **Clones:** sin sufijo; color de nombre idéntico al original.
9. Corregido un error propio: `roomAt` desvinculado de `this` en `worlds.js`.

## Pruebas
- `npm test`: 181/181 (incluye nuevas pruebas del escudo anulador, clones y rellenos de Campo Grande).
- Minijuegos probados con ratón real (Chromium) contra `solution()` del servidor; ventana de misión comprobada dentro del cliente real en PC y móvil (apaisado).
- Benchmark de bots sin regresiones.

## Pendiente / no verificado
- Arrastre táctil real de los minijuegos (solo ratón y emulación de móvil para el diseño).
- Los tests de interfaz (`npm run test:ui`) se omiten aquí por falta de DOM simulado.
- La expulsión de Campo Grande/Club a pantalla completa se comprobó en Colegio y por geometría; revisar el marco en otros mapas.
- La versión web publicada no se ha reconstruido con esta entrega.


# PUCELA US 12.0.0 · Informe de entrega

Parte de la 11.0.0; conserva los cuatro mapas, multijugador, bots, objetos y pase.

## Cambios
1. **Nombre:** PUCELA US en menús, pantallas, expulsión, ordenador de la caravana y paquete.
2. **Tareas:** marco de aparato gris biselado, sin título ni cabecera azul, mapa visible detrás, centrado y sin scroll (`mechanism.css`). **Tarea de tonos del Club:** faltaba la importación de `card` en `themed-defs.js`, así que el dibujado fallaba y no aparecía ningún pad; corregido y pads más visibles.
3. **Votación:** 10 jugadores + SKIP visibles sin scroll (rejilla 2×5), sin recuentos numéricos por jugador (solo figuritas), sin lista inferior durante la expulsión.
4. **Intro:** la animación de llegada es visible desde el primer fotograma (sin parpadeo del menú); se oculta de inmediato si ya se vio o con movimiento reducido.
5. **Rol:** categoría y rol juntos si caben; si no, dos líneas, sin partir nunca el nombre del rol.
6. **Presentación de jugadores:** entradas alternas desde izquierda/derecha/abajo, rebote, ola coordinada y resplandor; el escalonado se adapta al número de jugadores.
7. **Objetos:** sin solapes entre objetos en los cuatro mapas (comprobación automática); cofres que no caen dentro de objetos; quitado un templete duplicado en Campo Grande y movido un banco del Colegio.
8. **Personajes:** corbata oculta de espaldas y desplazada de perfil.
9. **Campo Grande:** revisión del render completo (sin sombras, sin fragmentos de hierba, bordes continuos).

## Pruebas
- `npm test`: 181/181. Capturas con el cliente real (PC y móvil apaisado) de tareas, votación y reparto de roles.

## Pendiente / no verificado
- Los 35 minijuegos conservan la mecánica de la 11.0 con el nuevo marco; no se rehízo cada uno desde cero.
- Arrastre táctil real no probado en dispositivo; máscaras de perfil sin cambios.
- No se midió FPS en dispositivos reales.

---

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
