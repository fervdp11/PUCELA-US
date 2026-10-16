# Sanagus AS 8.1 — caminos, robles y minimapa móvil

## Cambios

- Campo Grande bloquea caminar por la hierba. El servidor y la predicción del cliente usan la misma superficie: caminos de tierra, ramales a los objetivos, plaza de la fuente y suelo pavimentado de las casetas. La hierba no se convierte en una pared de visión.
- Todos los accesos a tareas, paneles de reparación, cámaras y conductos siguen conectados. Se han añadido ramales y accesos laterales a las casetas y apartado el mobiliario de los caminos. Las partidas guardadas reubican las posiciones antiguas que hayan quedado sobre hierba.
- Más de 200 robles distribuidos por el césped, con copas mayores, hojas individuales, sombras y movimiento suave. Las copas mantienen la transparencia al tapar personajes. Los animales respetan los mismos caminos y conservan posiciones sincronizadas. Los espectros conservan el movimiento libre dentro de la valla.
- Minimapa móvil a toda el área segura disponible, tanto vertical como horizontal, sin el límite de anchura de la tarjeta anterior. Cierre de 44 píxeles siempre visible. El canvas adapta su resolución y proporciones a su espacio real; las etiquetas conservan 11 píxeles CSS, sin encogerse por devicePixelRatio. Se mantiene la misma fuente y el orden de etiquetas sobre las misiones.

## Validación

Pruebas del terreno, desplazamiento contra hierba, conexión de todos los objetivos, fauna, valla, roles, tareas, reparaciones y presentación: 17 superadas. Los bots reparan los siete sabotajes del parque antes del plazo. Dos pruebas del minimapa verifican uniformidad, capas y escala HiDPI. Cuatro pruebas DOM/Canvas de los mapas, tareas del parque, animación y alineación superadas, más dos pruebas del cliente completo de escritorio/móvil. Compilación e integración HTTP/D1 con cuatro clientes en los cuatro mapas completadas antes de publicar.

Inspección de un plano generado por el renderizador Canvas. No se ha probado un navegador real ni un móvil físico; las comprobaciones DOM/Canvas no garantizan ergonomía ni FPS de todos los dispositivos. El parque conserva su adaptación compacta del plano y no incluye calles exteriores.

## Arranque y despliegue

Node 24: descomprime conservando carpetas y ejecuta `node server/node.js`. Abre `http://localhost:3000`. Las instrucciones completas están en README.md. Para Internet se necesita un servicio Node que sirva página y API desde el mismo origen; no basta con abrir el HTML ni alojarlo como página estática. Los informes anteriores son históricos.
