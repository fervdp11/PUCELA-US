# PUCELA US · 14.2.0 · Colegio, Club, Gym y Campo Grande

Juego multijugador real para navegador, de 4 a 10 participantes (personas y bots), con cuatro mapas elegibles: **Colegio**, **Sanagus Club**, **Sanagus Gym** y **Campo Grande**. Incluye cliente HTML/CSS/JavaScript y servidor Node.js autoritativo. El mismo enlace y la misma sala funcionan en ordenador y móvil.

## Novedades de la versión 14.2

- **Pantalla completa en móvil desde el primer momento**, sin franja al abrir en horizontal.
- **Caravana con sus colores** también en la bajada previa al rol (mismo dibujo que en el menú).
- **Alarma de sabotaje grave**: pulsos electrónicos de tono fijo.
- **Bots coherentes**: lo que dicen coincide con lo que votan; mantienen sus acusaciones, no proponen SKIP en situación crítica y la jaula no cuenta como prueba.
- **Expulsiones con puertas batientes** en los cuatro mapas; el portero se queda dentro y las hojas lo tapan al cerrarse. Sin óvalo verde en Campo Grande.
- **Multijugador más suave** entre personas reales y **arranque escalonado** de los bots (0,1–3 s).

El detalle, las causas y las mediciones están en **HISTORIAL.md**.

## Novedades de la versión 14.1

- **Más fluido:** el servidor ya no copia la sala en cada pulso, los bots se simulan en pasos fijos de 100 ms y las respuestas van comprimidas (≈5× menos datos). En el cliente se han quitado costes por fotograma (degradados, recortes, desenfoques de fondo, cálculos de diseño) y hay resolución dinámica para móviles lentos.
- **Bots sin saltos:** interpolación con retardo adaptado a la latencia real de cada conexión.
- **Menos «Reconectando»:** el aviso solo aparece tras 2,5 s sin respuesta real; pulsos con reintento rápido; conexiones keep-alive compatibles con balanceadores (Northflank).
- **Mochila centrada de espaldas**, **avisos centrados abajo** sin tapar controles, **alarma electrónica de dos tonos** y **caravana con sus colores** en la bajada.

Los informes anteriores están en **HISTORIAL.md**.

## Novedades de la versión 14

- **Pantalla completa en móvil:** sin fondos claros detrás de las capas; menú, intro y escenas anclados a los cuatro bordes.
- **Perfiles laterales reales:** un ojo, media boca, pies hacia donde camina y accesorios (corbatas, gafas, máscaras, gorras) desplazados al borde delantero y recortados.
- **Sabotajes:** flechas sin texto que parpadean en el borde de la pantalla, tinte rojo según el tipo (con ajuste de parpadeo suave) y sirena que se corta al reparar.
- **Interfaz superior:** barra de tareas arriba a la izquierda; ajustes y mapa arriba a la derecha.
- **Escenarios:** paredes con volumen (cara, canto, zócalo, marcos) en Colegio, Club y Gym; suelos detallados; senderos de grava con bordes naturales en Campo Grande (sin sombras).
- **Llegada → SHHH → rol:** la bajada de la caravana vuelve a verse, pantalla «SHHH…» con todos los jugadores de pie y sin solapes, y el viaje arranca desde el último fotograma de la sala.
- **Mesas en tiempo real** por WebSocket (sin dependencias), con vuelta a HTTP si no está disponible.

Los informes anteriores (incluido el 14.0) están en **HISTORIAL.md**.

## Novedades de la versión 13

- **Móvil/PC:** cámara y viewport reescalados (sin recortes laterales, zonas seguras, sin scroll vertical).
- **Intro y estética blanquivioleta:** título PUCELA US con entrada destacada, brillos suaves en menú y revelación de rol; la intro sigue apareciendo desde el primer fotograma.
- **Llegada:** los jugadores bajan de una caravana alta y con volumen, de frente y en fila (`public/disembark.js`, reloj del servidor); sustituye a la presentación anterior.
- **Sala de espera:** eliminado el rectángulo amarillo de televisión y armario; **seis mesas con minijuegos** (Air Hockey, Tres en raya, Duelo de reflejos, Carrera de pulsaciones para 2; Memoria y Secuencia de colores para 1), cada partida es una sesión independiente en el servidor (`game/tables.js`, cliente en `public/tables-ui.js`).
- **Nombre personalizable:** 19 fondos y 13 colores de letras repartidos por los 50 niveles del pase (se reclaman con la recompensa de su nivel), sección «Nombre» en el armario con vista previa y visibles para todos (sala, partida, reuniones, chat, clones).

## Novedades de la versión 12

- Nombre **PUCELA US** en todo el juego; tareas con marco de aparato gris biselado y mapa visible; arreglada la tarea de tonos del Club.
- Votación sin scroll (10 jugadores + SKIP), sin números por jugador; intro sin parpadeo; texto de rol en una o dos líneas; presentación de jugadores animada.
- Revisión de solapes de objetos en los cuatro mapas.

## Novedades de la versión 11

- **Todas las tareas rediseñadas** como minijuegos temáticos y fluidos (Colegio, Club, Gym y Campo Grande), con arrastre sin tirones (la pieza sigue al puntero), cierre automático y sin botones genéricos de confirmación. Se han quitado las tareas fuera de contexto (por ejemplo, borrar pizarras en el Club). La validación, los bots y el progreso siguen en el servidor.
- **Bots:** coartadas con zonas concretas, dispersión variada tras las votaciones y fantasmas que siguen deambulando.
- **Campo Grande:** sliding suave contra los bordes de los senderos, sin manchas de hierba aisladas ni estrechas, parques infantiles nuevos y nueva imagen de llegada de la caravana.
- **Caravana:** hierba, carretera, árboles, farolas y señales avanzan a la misma velocidad en la sala de espera y en el viaje.
- **Interfaz:** la guía de sabotaje no queda tapada por la mano/inventario; la expulsión ocupa toda la pantalla; letras de atajo discretas en los botones (ocultas en táctil; nuevos atajos G sabotear y B cámaras).
- **Personajes:** marcha con piernas alternas y ligero rebote, brazos casi quietos, y cuatro direcciones (frente, espalda, perfiles).
- **Escudo del impostor:** el mismo objeto anula durante 30 s los escudos protectores (el servidor lo controla); al terminar vuelven a valer sin reiniciar su duración.
- **Clones** idénticos al original (mismo nombre y aspecto, sin texto extra).


## Novedades de la versión 10

- **Campo Grande nuevo**, reconstruido a partir de la vista aérea de referencia: parque triangular, lago arriba a la izquierda, paseo central recto de losas grises y vacío (solo bancos, farolas y árboles a los lados), botón de emergencia en el centro del paseo, senderos de tierra, zona de juegos arriba a la derecha, pajarera y flores abajo a la izquierda, quiosco bajo el lago, fuentes, verja y puertas. Vista cenital sin troncos ni vallas en volumen. Agujeros de topo como conductos.
- **Cofres, inventario y siete objetos** (zapatillas turbo, linterna, cámara portátil, clon señuelo, jaula, escudo y rastreador de huellas). Cofres temáticos por mapa (máximo dos por sala) que se abren con un minijuego; inventario de mano vacía y dos ranuras. Todo lo valida el servidor y los bots también los usan.
- **Experiencia por voto y pase de temporada de 50 niveles.** Cada voto de cada reunión cuenta al final de la partida (acierto, fallo o Skip neutro), con el desglose mostrado solo al terminar y un máximo de medio nivel por partida. Recompensas reclamables, mascotas exclusivas del pase y progreso firmado por el servidor.
- **Bots con pruebas.** Distinguen lo que han visto, lo que han visto por cámaras y lo que les han contado; responden a «¿Qué pruebas tienes?» con datos concretos; no omiten en situaciones críticas; dejan la tarea para denunciar un cadáver; frases nuevas (conducto, cámaras, escudo, jaula, coartada que no coincide, «estuve con él»).
- **Conductos con flechas** hacia las salidas conectadas (ratón, toque o teclado), sin menú de destinos.
- **Tareas y reparaciones en objetos reales** (ordenador, cuadro eléctrico, mesa de DJ, máquinas…) con contorno amarillo o rojo que sigue la silueta, también en el vestuario y el ordenador de la caravana; se usan tocándolos directamente.
- **Menú principal nuevo** con la caravana animada; Gym con duchas junto a los vestuarios y salas irregulares; cámaras del Club más cuadradas; nombres de roles propios en Campo Grande y Gym; el viaje se puede omitir y la partida empieza sin esperar a los bots; expulsiones con las extremidades del propio personal.

## Novedades de la versión 9

- **34 misiones convertidas en minijuegos mecánicos.** Cada tarea es un aparato dibujado en 2.5D: chasis con biseles y tornillos, válvulas que giran, palancas, interruptores basculantes, fusibles de cristal, manómetros con aguja, cables con caída y sombra que se arrastran con el dedo, pantallas con barrido y teclados mecánicos. Ningún control de formulario del navegador.
- **Sin botón «Comprobar».** La misión se completa sola en cuanto el mecanismo cumple sus condiciones: se bloquea la entrada, el aparato se anima en marcha mientras el servidor valida, aparece el sello de operación completada y el panel se cierra solo. Si el servidor rechaza la solución, la tarea no se marca y se recupera el control. Los botones que son mecánica (encender el equipo, escuchar la secuencia, arrancar la cinta, pedalear) se conservan.
- **Móvil:** la ventanilla de misión nunca se desplaza y conserva la proporción en vertical y en horizontal; varios dedos a la vez sobre el mismo aparato.
- **Rendimiento:** Campo Grande pasa de 13 a unas 38-41 imágenes por segundo (el follaje de los 241 robles se pinta una vez y se estampa) y su simulación en el servidor cuesta un 69 % menos (índices espaciales exactos de terreno y mobiliario). Peticiones adaptadas a la fase: 95 ms jugando, 200 ms en reuniones y vestíbulo, 240 ms con una misión abierta.
- **Bots:** corregido un bloqueo permanente en Campo Grande (el atajo de ruta saltaba por encima de franjas de césped de 4 px); vuelta de patrulla, destino de cobertura y tarea inalcanzable con vigilancia para no quedarse plantados.
- **Parpadeo** al recuperar una sesión eliminado; hueco vacío del menú en vertical corregido.

## Ajuste 8.1

Campo Grande permite caminar solo por tierra y pavimento. Los accesos a tareas, reparaciones, conductos y cámaras están conectados por ramales de tierra. La hierba queda bloqueada por las mismas colisiones en cliente y servidor. Robles frondosos con hojas individuales cubren las zonas verdes y atenúan sus copas cerca de personajes.

El minimapa móvil ocupa toda el área segura disponible en vertical y horizontal, conserva las proporciones y usa etiquetas de tamaño constante en píxeles CSS para que la densidad de pantalla no reduzca las letras. El cierre queda visible. Los espectros conservan su desplazamiento libre dentro de la valla.

## Novedades de la versión 8

- **Campo Grande:** cuarto mapa jugable con valla interior infranqueable, lago al norte, fuente animada, senderos, 80 árboles, quiosco y caseta. No incluye calles exteriores. Pavos reales, patos y ardillas caminan con movimiento autoritativo e interpolación, sombras y volumen. Copas transparentes cerca de los personajes.
- Quince tareas temáticas que reutilizan trece mecanismos físicos; siete sabotajes con ocho terminales exclusivos, cuatro cámaras y cuatro redes aisladas de tres accesos. Botón en la plaza. Llegada, música y expulsión propias del parque.
- **Gym rediseñado:** doce zonas, piscina cubierta, yoga/pilates, vestuarios y duchas más grandes, sin Dirección y con recorridos alternativos.
- **Bots:** objetivos iniciales variados, patrullas, cámaras e investigación sin disminuir velocidad ni alargar minijuegos. La medición de ocho pares de partidas observa aproximadamente un 38 % más de tiempo por conjunto de tareas, cerca del objetivo aproximado del 35 %; varía según rutas y tareas.
- Esperan a los humanos para votar salvo en los últimos diez segundos. Los tripulantes no omiten en situaciones críticas estimadas con información pública. El servidor valida esas reglas.
- Presentación de diez jugadores en 5+5 y **barra verde de «Tareas completadas» arriba a la izquierda, sin cifras ni porcentajes**.

El informe de la entrega 8 está en **HISTORIAL.md**. Las notas 6 y 7 más abajo son historial de versiones anteriores. Se mantienen sus funciones, salvo los cambios descritos en esta versión. La validación se realizó con pruebas de motor, HTTP/D1 y DOM/Canvas nativo; no con navegador real o móvil físico.

## Ejecutar el ZIP

1. Instala Node.js **24** (recomendado; también funciona con 22).
2. Descomprime el ZIP completo en una carpeta. Conserva las carpetas `public`, `game`, `server` y `tests`.
3. Abre una terminal en esa carpeta y ejecuta:

```bash
node server/node.js
```

4. Abre **http://localhost:3000**. En Windows también puedes abrir `INICIAR_WINDOWS.bat`.
5. Crea una sala y comparte su código. Hacen falta cuatro participantes para un impostor y siete para dos. Puedes jugar solo añadiendo bots desde el ordenador del lobby. El líder usa el ordenador de la caravana para elegir mapa y reglas y pulsa **Iniciar partida**.

No se necesita `npm install` para jugar. No abras `public/index.html` con doble clic: las salas, roles y acciones necesitan el servidor. Mantén abierta la terminal. Para detener el servidor, pulsa Ctrl+C.

### Otros dispositivos de la misma Wi-Fi

Busca la IP local del ordenador servidor con `ipconfig` en Windows. Desde los otros dispositivos abre `http://IP-DEL-ORDENADOR:3000`. Permite a Node acceder a la red privada si Windows lo solicita. `localhost` solo funciona en el propio dispositivo que ejecuta el servidor.

### Publicar para jugar desde otras casas

El ZIP se ejecuta como un servicio web de Node, que sirve la página y su API desde el mismo origen. Puedes sustituir el contenido de tu repositorio conectado al alojamiento por **todo el contenido descomprimido**, conservando las carpetas. No subas el ZIP dentro del repositorio ni copies todos los archivos sueltos en una sola carpeta.

Configuración del servicio:

| Campo | Valor |
| --- | --- |
| Directorio raíz | Carpeta donde está `package.json`; vacío si está en la raíz del repositorio |
| Runtime | Node.js 24 (22 también funciona) |
| Build command | `node --check server/node.js` |
| Start command | `node server/node.js` |
| Health check | `/api/health` |
| Puerto | Variable `PORT` del alojamiento; el servidor la lee automáticamente |

El archivo `render.yaml` y el `Dockerfile` incluidos usan este servidor. Si el alojamiento espera un puerto fijo diferente de 3000, configura `PORT` allí. Publica mediante HTTPS para la instalación como app web y las funciones del navegador que lo necesitan. Todos entran con el mismo enlace público y código.

### Desplegar con GitHub y Northflank

1. Descomprime el ZIP. Sube **el contenido** de la carpeta `PUCELA-US-14.1.0` (donde está `package.json`) a la raíz de un repositorio de GitHub. El `.gitignore` incluido evita subir `node_modules` y el secreto local `.sanagus-secret`.
2. En Northflank: **Create new → Service → Combined service** (compila y despliega), conecta GitHub y elige el repositorio y la rama.
3. **Build:** tipo *Dockerfile*, ruta `/Dockerfile`, contexto `/`. (Alternativa: *Buildpack* con el comando de inicio `npm start`.)
4. **Networking:** puerto `3000`, protocolo **HTTP**, *Publicly expose* activado. Northflank sirve HTTPS y WebSocket por ese mismo puerto; no hace falta nada más para `/api/table-ws`.
5. **Environment:** añade `SANAGUS_SECRET` como secreto (64 caracteres aleatorios). Sin él, el progreso del pase se invalida en cada redeploy porque el contenedor no conserva archivos. `PORT` no es necesario (el `Dockerfile` usa 3000).
6. **Health checks:** HTTP `GET /api/health` en el puerto 3000 (readiness y liveness), con un tiempo de espera de al menos 5 s.
7. **Instancias: 1.** Las salas viven en memoria; con dos instancias cada jugador podría caer en una distinta.
8. **Recursos:** con los cambios de 14.1 una sala de 10 jugadores funcionó con latencia p95 de 90 ms limitando el servidor a 0,1 vCPU en pruebas locales. Si alojáis varias salas a la vez, usad un plan con más CPU (≥0,2 vCPU) y 512 MB de memoria.

Variables de entorno:

| Variable | Obligatoria | Uso |
| --- | --- | --- |
| `PORT` | No | Puerto de escucha (por defecto 3000). El servidor escucha en `0.0.0.0`. |
| `SANAGUS_SECRET` | Recomendada en producción | Firma del progreso del pase. Usa un valor propio y no lo publiques. |

**Importante para este adaptador:** usa una única instancia. Las salas Node están en memoria: se pierden si reinicias el servicio y no se comparten entre varias instancias. Nunca subas `node_modules`, `.git`, `dist`, credenciales ni archivos de estado del alojamiento. El ZIP contiene menos de 100 archivos. La versión publicada con Sites utiliza un adaptador D1 del mismo motor y se comprueba por separado; no necesitas sus dependencias para ejecutar este ZIP con Node.

## Elegir mapa y reglas

La sala de espera es el interior de una caravana común a los cuatro mapas. Acércate al **ordenador** (arriba a la derecha) y pulsa **E / Usar** para consultar las reglas; solo el líder puede modificarlas. Acércate al **armario** (arriba a la izquierda) para abrir el vestuario. Los cambios se aplican en directo y el botón Listo/Guardar cierra el armario. El líder puede salir de viaje desde el ordenador o el botón del panel. El código de sala sigue visible.

Se conservan velocidad 1×, 1,25×, 1,5× o 2×; recarga al matar de 5 a 90 s; tareas por jugador; debate, votación, confirmación de identidad y número de impostores. El colegio permite P0, P1 o ambas; sus tareas, sabotajes, profesores y conductos respetan esa selección. Hay botón de reunión en P1 si se juega solo en esa planta. La discoteca tiene una planta y no tiene profesores.

## Qué cambia en 4.2

- **Suelo sin nombres:** se eliminan nombres y placas flotantes del escenario. Las identidades de las salas siguen disponibles en el plano M y el indicador de zona; no cambia la lógica de objetivos.
- **Decoración organizada:** 78 muebles con huella física, 29 tipos y 68 detalles arquitectónicos en la discoteca. Cabinas, sonido, barra, recreativos, sofás, mesas, botellas, plantas, monitores, armarios, herramientas, tanques y tuberías. Los detalles pequeños se componen sobre sus muebles. Se despeja también la entrada norte del escenario secundario, trasladando su cabina al fondo.
- **Iluminación continua:** seis colores, focos oscilantes, baldosas con transiciones, reflejos de bola de espejos, neones, LED, barras de nivel, ventiladores y humo tenue. Reservado, barra y zonas técnicas tienen su propia ambientación. **Luces: suaves/completas**, en el menú y en Panel, guarda la preferencia local. El modo suave elimina haces móviles, partículas y pulsos de color; mantiene una luz discreta.
- **Presupuesto visual:** cachés de objetos, gradientes y pistas; capa de luz de resolución reducida, con reloj de 30 Hz y recorte a las zonas próximas. Personajes y movimiento se dibujan en cada fotograma de pantalla. No se cambia la interpolación de red.
- **Reuniones en tableta:** tarjetas con ropa y nombre, muertos tachados, megáfono del convocante, chat desplegable y canal separado de espectros. Todos quedan quietos durante la reunión. Se conservan libreta, señales al creyente y voto decisivo de Delegado/Portero.
- **Votos:** seleccionar, cancelar y confirmar; botón **OMITIR VOTO**. Los votos son obligatoriamente anónimos. El servidor impide votar durante el debate o dos veces, y cuenta como omitidos los votos pendientes al terminar el tiempo. El recuento animado dura 3 s antes de la expulsión de 9,5 s. Empate u omisión mayoritaria no expulsan.
- **Animaciones originales:** botón rojo con pulsación real y banda de emergencia; reporte con cadáver cartoon; cuatro ataques (rápido, lengua, arma cartoon y vinilo del club). La víctima ve la secuencia grande y el impostor/testigos ven la acción dentro del mapa según su visión. Cadáver del color del jugador con hueso blanco, caída y sombra; fantasmas con cola y flotación.
- **Expulsión:** puerta de seguridad animada y lanzamiento cartoon en el club; se mantiene la patada desde la terraza en el colegio. Ambas escenas ocupan toda la pantalla. La identidad y los impostores restantes solo se revelan si está activada la confirmación.
- **Otras transiciones:** apertura de alcantarillas, aparición, interacción con máquinas, presentación de roles y finales con música y ganadores destacados.

## Contenido conservado de 4.1

- **Escenarios con volumen 2.5D:** mobiliario con cara superior y frontal, contornos, sombras y reflejos. Suelos distintos por sala; paredes con molduras y profundidad.
- **Discoteca decorada:** pista LED, cabinas con platos y faders, barras con botellas y grifos, sofás y mesas VIP, servidores y monitores de Seguridad, generadores, ventilación, armarios, cajas y máquinas de humo. Los pasos y accesos siguen libres.
- **Personajes:** mayor tamaño, cuerpos más redondeados, sombreado, pasos alternos, respiración e interacción. Se conserva la personalización de ropa, color de identidad, cara, pelo, accesorios y demás opciones. Se añade el visor panorámico. Los muebles ocultan la parte que corresponde al pasar por detrás; las paredes siguen ocultando personajes sin línea de visión.
- **Cuatro cámaras simultáneas:** una cuadrícula 2 × 2 real, con CAM 01–04, nombres de zona, movimiento, cuerpos y estado de señal. No hay selector de una sola vista. El servidor valida el acceso a Seguridad y prepara las cuatro vistas en el mismo estado, sin revelar roles. Respeta disfraces, invisibilidad y paredes.
- **Ocho minijuegos nuevos:** mezcla del DJ, sincronización de altavoces, bebidas arrastrables, pases y tarjeta VIP, fusibles y secuencia del generador, descarga cifrada, calibración de señales y palanca de residuos. Se conservan las demás tareas y se mejora el cableado para arrastrar conectores.
- **Sabotajes del club:** se añaden cierre del reservado, sobrecarga del DJ y caída del sonido/comunicaciones. Cada uno tiene consecuencias y reparaciones reales.
- **HUD y paneles:** iconos originales, información compacta de tareas y progreso, panel de instrumentos, animación de éxito y transiciones. El panel lateral puede desplegarse; la escena sigue ocupando la pantalla.
- **Sonido original:** música de club sintetizada, percusión, ambiente técnico, puertas y efectos de interacción. Se activa tras un gesto del usuario y puede silenciarse con ♫. Las reuniones y los sabotajes correspondientes detienen la música.
- **Rendimiento:** superficies estáticas preparadas una sola vez, imágenes inmutables cuando el navegador lo permite, recortes pequeños para las cámaras, animación solo de elementos próximos y caché de visión limitada. La llegada de mensajes de red no controla el ritmo del dibujo.

Todos los gráficos y sonidos nuevos se generan mediante el código. No se distribuyen imágenes, música ni sprites extraídos de Among Us.

## Discoteca

La distribución conserva las conexiones y proporciones orientativas del plano recibido, con corredores transitables. La casilla mide 56 unidades del juego, igual que en el colegio; no es una reproducción calibrada de las unidades internas del juego de referencia.

| Zona del plano | Sanagus Club |
| --- | --- |
| Cafetería | Escenario principal, con botón central sobre una mesa |
| Storage | Escenario secundario |
| Admin | Reservado |
| Security | Seguridad, con consola de cámaras |
| Electrical | Electricidad |
| Communications | Comunicación |
| Navigation | Navegación |
| O2 | O2 |
| Resto | Zonas de paso con decoración e iluminación |

Las zonas técnicas tienen equipamiento propio. Los jugadores representan al personal y pueden entrar para realizar tareas y reparaciones. La caravana es común a los cuatro destinos; las reuniones usan la tableta en ambos mapas.

### Tareas de la discoteca

| Minijuego | Interacción |
| --- | --- |
| Mezcla DJ | Ajusta tres faders y sincroniza el pulso dentro de su ventana |
| Altavoces | Conecta cables y ajusta la ganancia |
| Reposición de bebidas | Arrastra las botellas a los huecos indicados; también sirve tocar objeto y hueco |
| Acceso VIP | Ordena pases y desliza la tarjeta a velocidad correcta; alternativa de mantener pulsado |
| Generador | Rearma fusibles y pulsa interruptores en el orden de diagnóstico |
| Descarga de datos | Conecta los nodos de la ruta y espera las etapas de descarga y verificación |
| Calibración | Detén tres señales en sus ventanas verdes |
| Compactadora | Baja la palanca y vacía los residuos |

Hay quince estaciones distribuidas por el mapa. También se mantienen limpieza, circuitos de focos, secuencia musical, teclado de códigos, válvulas y búsqueda de vinilos. Las soluciones y los tiempos mínimos se validan en el servidor; abrir una tarea o pulsar un botón aislado no incrementa el progreso. Los espectros pueden seguir haciendo tareas.

## Roles

Los roles y sus probabilidades se mantienen. Solo puede existir uno de cada rol especial en una partida. Se puede repetir no tener rol especial. Las identidades se comunican de forma privada.

| Colegio | Discoteca | Función |
| --- | --- | --- |
| Empollón | Camarero | Libreta privada, también en reuniones |
| Delegado | Portero | Voto decisivo de un uso: acertar al impostor gana; fallar expulsa al votante |
| Ingeniero | Ingeniero | Viaja por alcantarillas |
| El enchufe | DJ | Recibe avisos privados de muertes |
| El creyente | El creyente | Recibe señales de fantasmas |
| El fantasma | El fantasma | Invisibilidad de 15 s; recarga de 90 s |
| Copiador Boss | Dueño | Copia otro jugador 30 s; recarga de 90 s |

El impostor puede cancelar invisibilidad o copia antes del final. En reuniones, los impostores ven sus identidades en rojo; los tripulantes no las reciben. Las cuatro señales del fantasma se sortean una vez por partida, se envían con 1–4 y tienen 15 s de recarga. Todos los participantes permanecen quietos mientras usan la tableta de reunión.

## Sabotajes y acciones

El impostor tiene 112,5 s de recarga de sabotaje. **Cualquier sabotaje sin reparar durante 90 s da la victoria al impostor.** Denunciar un cadáver sigue siendo posible durante una avería y abre una reunión. El botón de emergencia requiere resolver antes el sabotaje.

En la discoteca hay nueve sabotajes:

| Sabotaje | Consecuencia |
| --- | --- |
| Corte de focos | Visión reducida y pista atenuada |
| Bloqueo de accesos | Puertas seleccionadas cerradas 18 s, sin cerrar sobre jugadores |
| Apagón técnico | Equipos apagados; tareas eléctricas y cámaras sin servicio |
| Interferencia de sonido | Bloquea el plano y activa el timbre |
| Caída de equipos | Cámaras y tareas informáticas fuera de servicio |
| Fuga de refrigeración | Requiere dos personas distintas en los paneles con menos de 8 s de diferencia |
| Cierre del reservado | Bloquea el acceso VIP 18 s |
| Sobrecarga del DJ | Bloquea mezcla/calibración y reduce la visión del personal |
| Caída de sonido y comunicaciones | Detiene música, oculta el registro de tareas y bloquea tareas de audio |

Se reparan los paneles de Electricidad y O2 con minijuegos. La flecha indica el panel pendiente. Las puertas se abren tras 18 s, pero sigue siendo necesario resolver el sabotaje antes de sus 90 s.

Las alcantarillas forman cuatro circuitos cerrados de tres. No se puede llegar a otro circuito mediante viajes indirectos. Puedes permanecer 10 s dentro y moverte entre destinos; al salir comienza una recarga de 20 s. Impostor e ingeniero pueden usarlas.

No hay duración máxima normal de partida: termina por tareas completadas, expulsión de impostores, paridad del impostor o sabotaje sin reparar. La escena grande de asesinato solo se muestra a la víctima. Los testigos que vean el lugar observan la acción dentro del mapa; las cámaras también pueden captar el suceso. El final de votación muestra primero el recuento y después la expulsión correspondiente al mapa.

## Controles y móvil

| Acción | Ordenador |
| --- | --- |
| Moverse | WASD / flechas |
| Tarea, reparación, botón o escaleras | E |
| Matar | Q |
| Denunciar cuerpo | R |
| Alcantarilla | V |
| Habilidad del impostor | F |
| Libreta | N |
| Plano | M |
| Señales de fantasma | 1–4 |
| Cerrar panel | Escape |

En móvil aparecen joystick y botones manuales. El joystick captura el mismo dedo al cambiar de dirección, salir de su zona o usar un segundo dedo. Los paneles de tareas admiten punteros táctiles; los arrastres no usan el sistema HTML Drag & Drop. La selección de texto está bloqueada en controles, pero se puede escribir en nombre, chat y libreta.

La interfaz se adapta al área visible y a la orientación. ⛶ solicita pantalla completa donde esté disponible; el modo ampliado del juego no puede ocultar barras del navegador. Para una experiencia sin esas barras, usa la opción del navegador **Añadir a pantalla de inicio / Instalar aplicación** y abre el juego desde el icono. Se incluyen manifiesto, iconos y service worker sin caché de versiones antiguas. Requiere HTTPS y conexión; no existe modo multijugador sin servidor.

## Cambios de la versión 5.0

- Visión geométrica exacta sobre el contorno real, paredes y puertas cerradas. Se eliminan la cuadrícula de luz de 8 px y sus bordes deformados. Colisiones circulares contra los mismos contornos, también diagonales. El mobiliario no oculta la luz. Si llega un fotograma inválido se conserva la última máscara válida o se recupera el punto libre más próximo. Las habitaciones fuera de visión quedan ocultas de forma opaca.
- Se comprueban todas las posiciones transitables de la rejilla de ambos mapas, sus segmentos y esquinas; movimiento subpíxel y rayos exactos. Para inspeccionar segmentos y rayos, abre `/?visionDebug=1` y entra en una partida. Esta opción es solo visual del cliente.
- Se retiran por completo las fotografías reales y sus archivos. La caravana incorpora asientos, ventanas, cocina, equipaje, armario animado y ordenador. El servidor valida la proximidad para interactuar.
- Introducción neutral hacia Valladolid, menú de viaje y llegada distinta al colegio de día y a la discoteca de noche. Al iniciar: 5,5 s de viaje, 1,5 s de suspense y 6 s de rol. Omitir el viaje no adelanta el reloj ni permite moverse antes. El servidor no envía el rol, compañeros ni diferencias de alcance hasta el instante autorizado.
- Tareas con carcasas, tornillos, pantallas, conectores y controles con volumen. La tarea musical usa un controlador con cuatro pads, notas, errores y cinco rondas de dificultad progresiva. Las soluciones siguen validadas en el servidor.
- Nombres para las áreas reales de descanso, barras, almacén, paso VIP y entrada del club. Se muestran en el minimapa y el indicador de ubicación, nunca como textos sobre el suelo. Fuente igual y rótulos por encima de las tareas.
- Chat de reunión con tarjetas, avatares completos, nombres y mensajes grandes. Conserva los nodos y la posición de lectura; avisa de mensajes nuevos si estás leyendo arriba. Enter envía. Se conserva el aislamiento de los fantasmas.
- Votos obligatoriamente anónimos. Los clientes reciben totales por destinatario y su propia elección, nunca una lista de votantes o su orden. Los iconos grandes son iguales, grises y sin accesorios, incluido SKIP. Cuenta atrás 10–0 con reloj absoluto, sonidos y controles libres; termina si todos votan antes.
- Final animado diferente según equipo, resultado y destino, seguido de roles, tareas, eliminaciones y reportes. Música original sintetizada para menú, caravana, viaje, colegio, club, reuniones, tensión y desenlace. El botón **≋** abre los volúmenes general, música, efectos e interfaz. El sonido requiere un gesto inicial del usuario.

## Cambios de la versión 6.0

- **Bots jugables:** abre el ordenador y usa Añadir bot, Eliminar bot o Rellenar plazas. Solo el líder puede gestionarlos antes de empezar; ocupan plazas reales del aforo de diez. Se identifican como BOT en la lista. Se puede jugar una persona con tres o más bots.
- **IA autoritativa:** navegación A* que respeta paredes y muebles, cambios de planta, tareas con espera y soluciones verificadas, reparación de sabotajes, reportes de cuerpos visibles, chat contextual y votos probabilísticos. Los impostores buscan víctimas, evitan testigos cuando pueden, fingen tareas y sabotean. Las sospechas proceden de observaciones; no consultan los roles secretos para acusar.
- **24 mecanismos físicos:** cajas eléctricas y cables flexibles; consola musical progresiva; modelos de pupitres y circuitos; interruptores; bandejas de documentos; estantería de libros o vinilos; cajones de material arrastrable; limpieza; teclado; ruedas de válvula; mesa DJ; altavoces; barra de bebidas; lector VIP; fusibles; terminal de datos; tres relojes de calibración; compactadora. Materiales, piezas SVG, relieves, indicadores y estados propios. Ratón, toque y alternativas de selección sucesiva; no se usa HTML Drag & Drop.
- **Estado del lobby:** cambiar de mapa conserva las coordenadas y el ordenador abierto. Más espacio útil en el menú de escritorio; el diseño táctil se mantiene separado.
- **Caravana:** silueta con cabina diferenciada, volante, instrumentación, asientos, cocina, nevera, equipaje y armario. Carretera, campos, árboles, farolas y tráfico en movimiento, también a través de las ventanas; ambiente de carretera sintetizado y resaltado de objetos al acercarse.
- **Viaje y rol independientes:** viaje de 11 segundos con giro progresivo, intermitente, tráfico en otro carril, parada y transición continua de día a atardecer y noche en el club. Presentación neutral y después 8 segundos de lectura contados tras confirmar que el rol se ha mostrado. Se espera a clientes lentos; una desconexión superior a 30 segundos deja de bloquear al equipo.
- **Emergencias:** interactuar abre una máquina con un botón rojo; cerrar no convoca reunión. El servidor exige 30 segundos desde el comienzo efectivo y otros 30 tras cada reunión, además de cuota y ausencia de sabotaje. El panel muestra el bloqueo y actualiza la recarga. El botón del escenario forma parte de la imagen del mueble, también cuando este se redibuja por delante de un personaje.
- **Capas:** rejillas bajo el mobiliario; muebles, terminales y reparaciones ordenados por profundidad. Se separan dos terminales de O2 y se alejan dos alcantarillas escolares del mobiliario. La geometría exacta de visión, el radio y las paredes se conservan.
- **Expulsiones:** portero de cuerpo entero con máscara y movimiento de brazos en el club; profesor completo, caminata y patada en la terraza escolar. El expulsado conserva su aspecto y el texto aparece abajo, por encima de la identidad. Chat grande, votos anónimos y cuenta atrás se conservan.

### Ejecución de los bots

En Node, el servidor mantiene una simulación cada 100 ms, aunque nadie tenga abierto el panel. En el alojamiento D1, el motor avanza por reloj del servidor y recupera el tiempo transcurrido al recibir la siguiente petición: no hay IA ejecutándose en el navegador. El dibujo de todos los personajes continúa mediante interpolación en cada fotograma.

Los bots usan reglas y probabilidades, no IA generativa. Su chat emplea frases contextuales, no conversación libre. Pueden equivocarse al votar. Mantienen las acciones y recargas del motor y cuentan para las victorias.

## Actualización 7.0.0

- Las tarjetas y los avatares de la reunión conservan sus nodos al votar; solo cambia el estado afectado. El canvas del mundo usa presentación de fotogramas completos y tolera oscilaciones de un píxel sin borrar su superficie.
- Quince frases y preguntas estructuradas, selectores de personas vivas y salas del mapa activo. Los bots recuerdan declaraciones, coartadas y contradicciones, responden por turnos de al menos medio segundo y ponderan testimonios con personalidades diferentes. No entienden garantizadamente texto libre: usa **Frases y preguntas para los bots** en el chat.
- Los bots esperan el voto de todos los humanos vivos conectados. Pueden votar en los últimos cuatro segundos aunque falte un humano. Tras una declaración humana reservan 1,8 segundos para responder, salvo al agotarse el plazo. La presión social de los bots se configura como Prudente, Equilibrada o Intensa.
- Sala pública o privada al crearla. Solo las públicas aparecen en Explorar salas. **Entrar con código** abre su pantalla propia. Los códigos son aleatorios de seis caracteres (32⁶ combinaciones), únicos y sujetos al límite de intentos del servidor; el botón de copiar incluye el enlace.
- Las salas sin humanos caducan a los 30 segundos desde su último latido, también si quedan bots. En Node se borran con el ciclo del servidor. En D1 la caducidad impide recuperar una sala vencida y las solicitudes de creación/listado limpian sus registros; no hay un proceso de bots ejecutándose mientras nadie solicita esa sala.
- Joystick capturado por un dedo y acciones por otro en el primer toque, evitando el clic duplicado. Orientación libre al entrar en pantalla completa, viewport con teclado y zonas seguras. Paneles de tareas sin scroll, distribución distinta en horizontal y ajuste de la escena conservando su proporción.
- Todos los desplegables visibles se representan con controles propios, portal de opciones y selección por teclado, ratón o tacto.
- **Sanagus Gym:** once salas, mobiliario de fuerza/cardio, pista deportiva, taquillas, duchas, almacén, mantenimiento, cuatro cámaras funcionales y cuatro redes de tres conductos aisladas. Recepción tiene botón de reunión sobre una mesa. No aparecen profesores. Viaje, ambiente musical, salida por los tornos y final adaptados al gimnasio.
- **34 tipos de tareas:** conserva las 24 mecánicas anteriores con máquinas físicas y mejora la instalación y arranque del ordenador, la extracción y escaneo de libros, el traslado de papeles, el giro de piezas y la inserción del cable de datos. Añade diez tareas del Gym: cinta, poleas, discos, marcador, ventilación, taquillas, inspección de equipamiento, canasta, spinning y dosificadores. Las tareas comunes elegidas del Gym se comparten entre los participantes; se conservan tareas cortas y largas.
- Cada sabotaje tiene puntos físicos exclusivos. El minimapa, el uso, las flechas y la IA comparten `activeRepairs`. La emergencia crítica siempre usa dos salas diferentes; jugando en una planta, ambos terminales quedan en esa planta. Mantiene la recarga de 112,5 segundos y la derrota a los 90 segundos sin reparar.

## Verificación de esta entrega

- 132 pruebas del motor: HTTP multicliente real, geometría, roles, privacidad, tareas, sabotajes, bots y limpieza Memory/D1 con SQLite.
- 18 pruebas DOM/Canvas: 24 tareas previas y diez nuevas, gestos y soluciones; las diez nuevas en vertical y horizontal, cambio de orientación con progreso, joystick y segundo dedo, selectores, cliente completo en modos escritorio/móvil, tarjetas de reunión estables y render de los tres mapas.
- El informe 7.0 (en `HISTORIAL.md`) recoge el resultado de la compilación y la prueba de integración del Worker/D1.
- Inspección de imágenes del renderizador Canvas, rutas a todas las estaciones y reparaciones, y bots reparando todos los sabotajes de los tres mapas antes del plazo.

**Límite de comprobación:** no se ha abierto esta actualización en un navegador real ni en un móvil físico. Las pruebas DOM no ejecutan el diseño CSS de un navegador; los gestos y cambios de tamaño se comprueban en ese entorno, no en Safari o Android. No se certifican FPS, ausencia absoluta de parpadeos de drivers, ni el encaje de todos los modelos de teléfono. Las 24 mecánicas previas se conservan y amplían; no se han sustituido por 24 mecánicas completamente nuevas.

Para repetir las pruebas del motor en el ZIP:

```bash
npm test
```

Las pruebas DOM son opcionales y necesitan `happy-dom` instalado en un entorno de desarrollo. Las dos pruebas del cliente completo necesitan también el entorno de alojamiento y Canvas. El ZIP de ejecución no instala esas dependencias y no las necesita para jugar. El proyecto de alojamiento conserva `test:hosted` para su compilación y D1.

## Organización para futuras modificaciones

| Archivo | Uso |
| --- | --- |
| `public/school.js` | Colegio: salas, tareas, profesores y conductos |
| `public/club.js` | Discoteca: distribución, mobiliario, cámaras, tareas, sabotajes y conductos |
| `public/worlds.js` | Selección de mapa y nombres de los roles |
| `public/content.js` | Personalización, velocidades y geometría compartida |
| `public/scenery.js`, `public/club-decor.js` | Arte 2.5D y distribución de muebles y detalles |
| `public/club-lights.js` | Luces, ritmos, cachés y modo suave |
| `public/meetings.js`, `public/upgrade.css` | Tableta, tarjetas, recuento y estilos adaptables |
| `public/eliminations.js`, `public/cinematics.js`, `public/expulsion.js` | Ataques, cadáveres, avisos y expulsiones |
| `public/device-art.js`, `public/instruments.js` | Piezas físicas y controles de los 24 mecanismos |
| `game/bots.js`, `game/intro.js` | Navegación/decisiones de bots y fases de presentación |
| `public/interactions.js` | Alcantarillas y acciones del escenario |
| `public/characters.js` | Personajes Canvas y SVG |
| `public/render.js`, `public/visibility.js` | Capas, contornos exactos, visión, plano y cámaras |
| `public/caravan.js`, `public/journey.js`, `public/finale.js` | Lobby, viajes y finales originales |
| `public/meeting-chat.js`, `public/vote-countdown.js` | Chat incremental y reloj sincronizado |
| `public/remote-motion.js` | Interpolación temporal y teletransportes |
| `public/tasks.js`, `public/club-tasks.js` | Interfaces de minijuegos |
| `public/instruments.js` | Cableado y arrastres reutilizables |
| `game/tasks.js` | Desafíos, soluciones y tiempos mínimos del servidor |
| `public/soundscape.js` | Música y ambiente mediante Web Audio |
| `public/client.js`, `public/style.css` | Cliente, HUD, menús y móvil |
| `game/engine.js`, `game/api.js` | Reglas autoritativas y API |
| `server/node.js`, `server/memory-store.js` | Servidor del ZIP |

El cliente nunca puede asignarse un rol, completar tareas sin solución, votar dos veces ni matar fuera de alcance. El servidor comprueba acciones y paredes. Una conexión lenta puede seguir retrasando las acciones: el renderizado se interpola, pero no elimina la latencia de Internet. No se ha hecho una prueba de carga con muchas salas simultáneas.

## Corrección 6.0.1

- Se elimina el tic sobre los personajes durante tareas y reparaciones y el dato de actividad en los estados enviados. No distingue entre tareas reales y fingidas.
- Los mensajes de bots en reunión se envían por turnos, con una pausa aleatoria de 0,5 a 2 segundos entre ellos y al menos 0,5 segundos desde el último mensaje del chat.
- Dos pruebas nuevas comprueban el indicador y los turnos, incluso cuando nueve bots tienen preparado su mensaje simultáneamente.

## Corrección 6.0.2 — reuniones y conversación con bots

Las tarjetas se conservan al votar: se actualizan sus marcas sin reconstruir la pantalla ni repetir la animación de entrada. En el chat, despliega **Frases y preguntas para los bots**: acusa, expresa sospechas, afirma haber visto un ataque, niega tu implicación, da una coartada, defiende, pregunta por la ubicación o por pruebas, o propone SKIP. Selecciona persona o sala y pulsa Enviar frase.

El servidor genera el texto y valida las selecciones. Los bots responden a preguntas dirigidas, se defienden si los acusas y ajustan sus sospechas con un peso limitado. Las declaraciones no equivalen a pruebas: una negación no borra un asesinato observado. Las coartadas solo se contrastan con posiciones que el bot vio, y los muertos siguen sin poder comunicarse con los vivos. Se mantiene la separación de mensajes de 0,5–2 segundos.

## Archivos nuevos de 7.0

`public/gym.js`, `public/gym-art.js` y `public/gym-tasks.js` contienen el mapa y sus mecanismos originales; `game/gym-tasks.js` valida sus soluciones. `public/repair-layout.js` organiza reparaciones exclusivas y `public/worlds.js` selecciona las activas. `game/social.js` mantiene testimonios y decisiones, `public/quick-chat.js` construye las frases. `game/rooms.js` centraliza caducidad y visibilidad de salas; ambos almacenes aplican las mismas reglas. `public/game-select.js` sustituye la presentación de los desplegables y `public/task-layout.js` ajusta las máquinas al área disponible.

## Reproducir la validación de la versión 8

- `npm test`: pruebas del motor, incluyendo los cuatro mapas.
- `npm run test:benchmark`: ocho pares de simulaciones equivalentes, con y sin investigación de bots.
- `npm run test:ui`: pruebas opcionales DOM/Canvas; requieren Happy DOM y Canvas nativo. Se ejecutan en serie para limitar memoria. El entorno de desarrollo del sitio contiene estas dependencias; no son necesarias para jugar.
- La integración `tests/hosted.test.mjs` utiliza el Worker compilado y D1 local con cuatro sesiones. Requiere el proyecto de alojamiento administrado y sus dependencias; no puede ejecutarse solo con el paquete mínimo de Node del ZIP.

En móvil el modo inmersivo adapta el área disponible; las barras propias de Safari y del sistema dependen de las capacidades del navegador. No se garantiza pantalla completa nativa en todos los dispositivos.
