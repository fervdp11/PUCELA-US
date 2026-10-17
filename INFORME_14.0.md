# PUCELA US 14.0.0 — Informe de entrega

17 de octubre de 2026. Continuación del ZIP 13.0.0; no se ha reconstruido el juego.

## Correcciones

- **Pantalla y visiones:** el ancho ya no se calcula tomando el mínimo de dimensiones que pueden depender del propio layout. Fondo y canvas llegan al borde; las zonas seguras separan los controles. Los modales usan el centro del área visible segura, con límites de tamaño para tareas, mesas y cámaras. La intro se protege desde el HTML inicial para evitar mostrar el menú antes de cargar el módulo.
- **Personajes:** perfil propio con cráneo, nariz, un ojo y media boca; zapatos, mochila y accesorios se reflejan juntos. Corbatas, prendas e insignias quedan de canto; mascarillas y gafas tienen geometría lateral. Se alinearon los ojos con las lentes frontales y se conservan oclusión, transparencia, sombreros y cosméticos. El paso alterna piernas y mantiene el rebote.
- **Interfaz y sabotajes:** progreso colectivo compacto arriba a la izquierda; mapa y ajustes con iconos arriba a la derecha. Flechas amarillas sin texto, orientadas al panel o a las escaleras, con suavizado y colocación que evita controles. Tinte rojo rítmico en emergencias, opción de luces suaves y una alarma repetitiva por emergencia, conectada al volumen de efectos y detenida al reparar, silenciar o esconder la pestaña.
- **Presentaciones:** se eliminó una condición que exigía conocer el rol para mostrar la bajada, aunque el servidor lo mantiene oculto durante esa fase. Bajada frontal sincronizada y, después, SHHH con toda la tripulación en filas adaptadas a la pantalla. El título y los personajes ocupan zonas distintas. El servidor incluye el tiempo de SHHH antes de revelar los roles. Títulos blanco/lavanda, con menos brillo; rótulo antiguo de la caravana de la vista previa corregido.
- **Escenarios:** caras frontales, remates, juntas y zócalos en paredes, con variantes por mapa; suelos conservados y detallados. Los dibujos nuevos se guardan en las láminas del mapa y no añaden colisiones. Campo Grande conserva el tratamiento sin sombras proyectadas; también se retiraron las de mascotas y cadáveres. Se mantiene la máscara de visión necesaria para ocultar lo que no puede verse.
- **Mesas:** se mantienen los seis juegos y sus reglas. Nuevo canal WebSocket autenticado para las mesas del servidor Node, con física compartida, estados pequeños, parejas independientes, heartbeat y cierre de sesiones. El hockey limita la velocidad local e interpola disco y rival. Las posiciones pendientes se agrupan en la alternativa HTTP. Se selecciona el objeto interactivo más cercano cuando se solapan alcances.
- **Pase y nombres:** el ZIP ya incluía fondos, letras, equipamiento, vista previa, persistencia firmada, contraste y copia de estilos en clones. Se conservaron y se volvieron a comprobar sus pruebas. Se eliminaron las reglas y animaciones antiguas de `.lineup-*`.

## Comprobaciones realizadas

- `npm test`: **193 pruebas superadas, 0 fallos y 0 omitidas**. Incluyen las pruebas previas y regresiones nuevas de orientación, alarma y comunicación.
- Conexiones WebSocket reales a un servidor local: cuatro clientes, dos parejas aisladas, movimiento de mazas, abandono, sustitución por una quinta persona y cierre al empezar la partida. Rechazo de origen ajeno y token falso.
- Renderizado con Canvas nativo e inspección de imágenes de los cuatro mapas, combinaciones de perfiles/gafas/sombreros y SHHH con diez personajes en 320×568, 390×844 y 932×430. Esto verifica esos dibujos; **no equivale a probar el layout HTML en un navegador**.
- Comprobación de sintaxis JavaScript y del contenido del ZIP. Se conservan **99 archivos propios**, con el informe 13.0 archivado en HISTORIAL.md.

## Límites reales

- No se pudo instalar Chromium en este entorno. `npm run test:ui` terminó con **12 pruebas omitidas** por falta del entorno DOM requerido. El viewport, los controles y los modales necesitan comprobación visual final en navegador.
- No se han probado Safari, Firefox, notch físico, teclado virtual ni móviles reales. No se han medido 60 FPS ni latencia de una conexión externa; no se garantiza ese rendimiento por estas pruebas.
- WebSocket se ha probado con el servidor Node incluido. Los alojamientos que bloqueen Upgrade usan HTTP, con mayor retardo. El movimiento principal conserva su protocolo HTTP autoritativo.
- No se ha publicado un despliegue HTTPS ni se entrega un enlace inventado. El ZIP incluye servidor, Dockerfile, render.yaml e iniciador de Windows.
