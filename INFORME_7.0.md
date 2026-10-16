# Informe de entrega · Sanagus As 7.0.0

Actualización sobre el proyecto existente, conservando el colegio, el club, roles, tareas, personalización, cámaras, conductos, asesinatos, reuniones, fantasmas y victorias. No se ha creado un juego paralelo.

## Cambios

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

## Pruebas realizadas

- **132/132 pruebas del motor**, sin omisiones: geometría y rutas de los tres mapas, tareas, roles, movimiento, paredes, alcance visible, HTTP con cuatro clientes, votos, fantasmas, sabotajes, privacidad, caducidad Memory/D1 con SQLite y bots. Los bots repararon todos los sabotajes de los tres mapas antes del plazo.
- **18/18 pruebas de DOM/Canvas**, sin omisiones: 24 mecanismos anteriores, diez nuevos, soluciones y gestos, diez máquinas del Gym en ambas orientaciones con cambio de tamaño sin perder progreso, joystick y segundo dedo simultáneo, selectores, chat incremental, tarjetas estables, cuatro cámaras y cliente completo en modos escritorio/móvil.
- **Integración del Worker compilado y D1 superada**: cuatro clientes en colegio, club y gimnasio; sala privada, rol privado, movimiento, cámaras, tareas, reparaciones, votos concurrentes, victoria y revancha. Presentación con confirmación y bots persistidos con avance autoritativo.
- Inspección de imágenes creadas con el renderizador Canvas del juego, incluyendo el gimnasio y sus máquinas. Se corrigió un espejo que bloqueaba una entrada. Todas las estaciones y reparaciones tienen ruta con el radio físico del jugador.

## Límites y validación pendiente

- No había navegador de pruebas compatible ni móvil físico disponible. Happy DOM no calcula el diseño CSS como Safari/Chrome. Los gestos y cambios de orientación anteriores son pruebas de lógica y coordenadas en DOM/Canvas, no sesiones en teléfonos reales.
- Pendiente la aceptación visual y de rendimiento en Safari/iOS, Chrome/Android y diferentes tamaños reales: no se certifican FPS ni ausencia absoluta de parpadeo producido por drivers, cambios de barras del navegador o problemas de red reales. El modo pantalla completa depende de las capacidades del navegador; se conserva la alternativa de instalación.
- El ajuste de las tareas evita scroll por diseño y conserva la proporción, pero puede reducir su escala en pantallas extremas. No se ha medido su legibilidad en todos los modelos de móvil.
- Los bots usan reglas, probabilidades y memoria, no conversación generativa. Las frases del menú son el canal comprensible garantizado; pueden equivocarse o no creer testimonios.
- En D1 la eliminación física es por caducidad y limpieza en solicitudes; no se ha añadido un cron externo. Una sala vencida no admite reconexión ni aparece como pública aunque su registro espere la siguiente limpieza.
- El ZIP contiene el proyecto completo ejecutable con Node, cliente, servidor, pruebas del motor e interfaz, instrucciones y configuración para servicio Node. No incluye node_modules ni el envoltorio de compilación del alojamiento administrado; esa versión se conserva y valida en el repositorio del sitio.

## Archivos principales modificados

Servidor: game/engine.js, game/api.js, game/bots.js, game/tasks.js, server/node.js, server/memory-store.js, server/d1-store.js. Nuevos: game/social.js, game/rooms.js, game/gym-tasks.js.

Cliente: public/client.js, public/index.html, public/upgrade.css, public/tasks.js, public/club-tasks.js, public/device-art.js, public/instruments.js, public/meetings.js, public/touch-controls.js, public/render.js, public/scenery.js, public/content.js, public/worlds.js, public/navigation.js, public/journey.js, public/finale.js, public/expulsion.js y public/soundscape.js. Nuevos: public/quick-chat.js, public/game-select.js, public/task-layout.js, public/repair-layout.js, public/gym.js, public/gym-art.js y public/gym-tasks.js.

Pruebas actualizadas para los nuevos paneles y reglas de voto, con tests/version7.test.js y tests/interface7.test.mjs añadidos; integración ampliada en tests/hosted.test.mjs. Instrucciones actualizadas en README.md.

## Ejecutar y publicar

Node 24 o superior. Descomprime el ZIP completo y ejecuta **node server/node.js** desde su carpeta. Abre **http://localhost:3000**. No requiere instalar dependencias para jugar. Para otros dispositivos usa la IP local del servidor; para Internet publica como un único servicio Node con **node server/node.js** y el puerto PORT del proveedor. Las instrucciones completas, Docker y la configuración del servicio están incluidas en README.md.
