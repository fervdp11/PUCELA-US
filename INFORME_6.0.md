# Sanagus As 6.0 — informe de actualización

Se ha modificado el proyecto existente. Se mantienen ambos mapas, personalización, roles, profesores escolares, tareas, sabotajes, cámaras, conductos aislados, chat, fantasmas, votación, revancha y controles móviles.

## Fase A — estado, visión y geometría

**Archivos:** `game/engine.js`, `game/intro.js`, `public/client.js`, `public/render.js`, `public/club.js`, `public/school.js`.

- Cambiar mapa no llama a la aparición ni inicia una partida nueva en el cliente: el ordenador permanece abierto y se conservan posición y época del movimiento.
- Viaje, suspense neutral, revelación, lectura y juego tienen estados independientes. El cliente acusa recibo después de mostrar la presentación en un fotograma; los ocho segundos completos comienzan tras esa confirmación. Se gestiona la desconexión para no esperar indefinidamente.
- Suelo y muebles tienen cachés diferentes. Rejillas al nivel del suelo, terminales/muebles por profundidad, cobertura de muebles y niebla de paredes conservadas. Dos rejillas escolares y el terminal de O2 disponen de mayor separación.
- La geometría exacta de rayos y paredes de la versión anterior se mantiene: no se desactiva la oscuridad para ocultar un fallo.

**Validación:** regresiones de visibilidad en más de mil posiciones y decenas de miles de rayos, esquinas, desplazamientos subpíxel, radio visible, cambios de pantalla/zoom, colisiones, rutas y movimiento con cuatro clientes HTTP. Pruebas nuevas de cambio de mapa y presentación lenta. Sin fallos en el conjunto del motor.

## Fase B — mecanismos y bots

**Archivos:** `public/tasks.js`, `public/club-tasks.js`, `public/device-art.js`, `public/instruments.js`, `public/upgrade.css`, `game/bots.js`, `game/engine.js`, `server/node.js`.

- Los 24 tipos tienen carcasa y piezas físicas propias. Cables curvados, consola musical progresiva, pupitres/circuitos giratorios, interruptores, bandejas y documentos arrastrables, biblioteca/vinilos, cajones de clasificación, limpieza, teclado, ruedas de válvula, mezcla de sonido, patch de altavoces, botellas, pases y lector, fusibles, datos, relojes de calibración y compactadora.
- Los gestos usan eventos de puntero; se mantienen alternativas de toque y teclado donde corresponden. El arrastre no provoca clics residuales. Se limpian temporizadores, animaciones y observadores al cerrar.
- Gestión de bots desde el ordenador, solo por el líder y dentro del aforo. Identidades distinguibles, navegación A* con heap y caché de pasos, tareas verificadas, escaleras, sabotajes, reparaciones, reportes, sospechas observadas, mensajes y votos. Los bots impostores buscan víctimas, respetan alcance/recarga, evitan testigos cuando pueden, fingen y sabotean. No son decoración.
- Botón de reunión físico con confirmación y recarga de 30 segundos validada por el servidor. Se puede cerrar sin convocar.
- Se conservan el chat incremental, avatares, canal de muertos, anonimato de votos en los datos y cuenta atrás 10–0.

**Validación:** partidas simuladas ganadas por tareas en ambos mapas; asesinatos de bot; acceso a todas las estaciones, reparaciones y escaleras; reparación de todos los sabotajes de ambos mapas; reporte/chat/voto; restricciones del líder y privacidad; simulación Node sin peticiones del navegador. Once pruebas DOM/Canvas cubren los 24 mecanismos y el cliente de escritorio/móvil simulado.

## Fase C — caravana, presentación y viajes

**Archivos:** `public/caravan.js`, `public/journey.js`, `public/soundscape.js`, `public/upgrade.css`, `public/client.js`.

- Forma exterior con frontal/cabina, volante, instrumentación, asientos, salón, cocina, nevera, armario y equipaje. Las diez posiciones y rutas siguen libres.
- Exterior continuo con tres ritmos de desplazamiento, carretera, campos, árboles, farolas y tráfico. Ventanas con paisaje móvil. Ambiente de carretera original sintetizado, sujeto al gesto inicial y al mezclador.
- Objetos cercanos resaltados, apertura del armario y encendido del ordenador. Menú y reuniones mayores en escritorio, reglas separadas de las táctiles.
- Valladolid mantiene una introducción neutral. Los viajes duran 11 segundos: giro continuo, reducción, intermitente, llegada, parada y colores interpolados. El tráfico ocupa otro carril. Los rótulos se sitúan abajo para no tapar la fachada.

**Validación:** trayectoria muestreada cada 10 ms, continuidad y separación del tráfico; fotogramas del día, atardecer, noche y llegada; caravana renderizada a 1440×900, 390×844 y 844×390. Esto comprueba el Canvas, no el diseño CSS de un navegador.

## Fase D — acabado

**Archivos:** `public/expulsion.js`, `public/upgrade.css`, `public/soundscape.js`, `public/index.html`.

- Portero completo con uniforme, máscara, pasos y brazos en el club; profesor completo y patada desde la terraza en el colegio. Son secuencias distintas. Apariencia del expulsado conservada.
- Veredicto inferior, encima de la identidad, con áreas seguras; se conserva la pantalla completa.
- Cuatro asesinatos cartoon, cadáveres, fantasma, avisos de reunión/reporte, finales, música contextual, mezclador y opción de efectos suaves conservados. Sin fotografías reales ni recursos extraídos del juego de referencia.

**Validación:** renderizados de ambas expulsiones en cuatro momentos; pruebas de seis cinemáticas y cancelación; lectura de estilos y pruebas DOM del cliente en modo táctil/escritorio.

## Fase E — entrega y límites

- `npm test`: **118 pruebas aprobadas** del motor, geometría, HTTP, bots y regresiones.
- DOM/Canvas: **11 pruebas aprobadas**, ninguna omitida, con Happy DOM y el renderizador Canvas de desarrollo.
- Worker/D1: comprobación sobre el código compilado con cuatro clientes por mapa, tareas, reparaciones, cámaras, reuniones/votos concurrentes, victoria/revancha, presentación moderna y bots persistidos. La prueba está en `tests/hosted.test.mjs` del proyecto alojado.
- Inspección de **22 fotogramas** producidos por el renderizador nativo, no capturas fingidas de un navegador.
- ZIP de ejecución con menos de 100 archivos, cliente y servidor completos, pruebas del motor, instrucciones y arranque Windows. No requiere instalar dependencias para jugar.

**Pendiente de validación externa:** no se ha podido abrir un navegador real ni un móvil físico en este entorno. Happy DOM no realiza el diseño CSS ni reproduce Safari/Chrome móvil. No se certifican FPS físicos, composición CSS final ni políticas de audio/pantalla completa en cada teléfono. Conviene hacer una partida desde los dispositivos de destino antes de anunciar el lanzamiento.

**Límites deliberados:** chat de bots basado en frases, decisiones probabilísticas que pueden equivocarse; Node conserva salas en memoria y requiere una sola instancia. D1 recupera la simulación por reloj del servidor al recibir la siguiente petición. No se ha convertido el transporte existente en WebSocket ni eliminado la interpolación por fotograma.
