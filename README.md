# Sanagus As · Versión 3.0.2 · Edición de lanzamiento

Juego real de deducción social multijugador para navegador, de 4 a 10 jugadores. Dos plantas escolares, personajes, interfaz y sonidos originales. El plano se construye con geometría jugable y colisiones. Se entrega el cliente y dos adaptadores del mismo servidor: Node.js y Cloudflare Workers + D1.

Desde la versión 2.11, el líder puede elegir velocidad 1×, 1,25×, 1,5× o 2× y una sola planta (0 o 1) o ambas. Las tareas, reparaciones, profesores y rutas de alcantarilla se limitan a las plantas elegidas. En P1 hay una mesa con botón de reunión en Profesores. Los sabotajes tienen 112,5 s de recarga; si no se reparan en 90 s gana el impostor. Solo la víctima ve la escena de muerte a pantalla completa. La visibilidad usa la posición dibujada y el círculo mundial, sin filtro por nombre de sala. Las paredes siguen ocultando personajes y el borde del círculo recorta el sprite de forma gradual. Las posiciones remotas conservan la hora del movimiento original: las respuestas repetidas ya no crean paradas falsas. La interpolación mantiene un cursor temporal continuo, corrige suavemente las predicciones y distingue teletransportes mediante una marca explícita. El minimapa mantiene una fuente única, divide los nombres largos en dos líneas centradas y dibuja todos los rótulos por encima de las misiones.

En la versión 3.0.2, los fantasmas permanecen inmóviles durante el debate y la votación. El servidor también bloquea los tramos de movimiento enviados por un fantasma en una reunión.

## Novedades de la versión 3.0

Las doce alcantarillas forman **cuatro circuitos cerrados de tres**. Cada rejilla ofrece los otros dos destinos de su circuito; recorrerlos nunca abre acceso a otro circuito. El servidor rechaza cualquier salto entre circuitos. En partidas de una planta solo se ofrecen rutas de esa planta: las rejillas que quedan sin ningún destino no se muestran ni se pueden usar.

| Circuito | Destinos conectados |
| --- | --- |
| 1 | Salón rojo · Despacho 2 · 4.º ESO C |
| 2 | Dirección · Profesores · 2.º Bach. D |
| 3 | Recepción · Despacho 5 · Optativas |
| 4 | Pasillo principal · 2.º Bach. C · Expulsados |

El menú tiene un diseño nuevo, vestuario por pestañas, vista previa y botones para crear un estilo aleatorio o restablecerlo. El vestuario también está organizado por pestañas en la sala de espera. Hay **11 colores**, incluido negro, **12 peinados/gorros**, **10 complementos**, **5 tipos de gafas**, **4 mochilas**, **4 pantalones**, **6 colores de pelo**, **5 tonos de piel**, **3 tipos de calzado**, color de calzado y **4 opciones de parche**. El color de identidad pinta el cuerpo principal de la ropa. El selector «Color del contorno» personaliza el contorno de la cabeza y el color secundario los detalles de la ropa. La elección se guarda en este navegador y se valida y sincroniza en el servidor, también al copiar a otro jugador.

## Novedades de la versión 2.13

Los cuadros son cuadrados y muestran las fotos enteras sin recortarlas. El líder puede ajustar la recarga al matar de 5 a 90 segundos. La flecha de reparación está en la esquina inferior izquierda, apunta directamente al objetivo y gira suavemente sin cambiar entre casillas. Sigue indicando las escaleras si hay que cambiar de planta.

Se pueden denunciar cadáveres durante cualquier sabotaje: la denuncia abre una reunión y cancela el sabotaje. El botón de emergencia continúa bloqueado durante una avería. El resultado de votación ocupa una escena centrada y visible sin bajar por la página. El castigo de los profesores permite caminar dentro de Expulsados, con la salida bloqueada durante 30 segundos; al terminar, se abre la salida y conserva tu posición. En partidas solo de P0 se usa el aula pequeña de esa planta. Una reunión libera a todos del castigo.

## Novedades de la versión 2.12

Los despachos corrientes se llaman Despacho 1–6; el Despacho de Vaquero conserva su nombre. Durante un sabotaje, una flecha señala la dirección de un panel pendiente. Si el panel está en otra planta, guía primero a las escaleras y vuelve a señalar el panel al cambiar de planta. La red de alcantarillas aparece en un panel pequeño a la izquierda y deja ver la sala de fondo.

Las reuniones reparten a los diez participantes en posiciones transitables y la mesa del botón es sólida tanto para el cliente como para el servidor. Los profesores incluyen a **Ibán de la Horra**. Los tres cuadros de la sala inicial usan las imágenes adjuntas.

Cada impostor recibe al azar **El Fantasma** (invisible 15 s), **Copiador Boss** (apariencia de otro jugador vivo durante 30 s) o ningún rol; cada opción tiene una probabilidad de un tercio. Si hay dos impostores, los roles especiales no se repiten. La tecla **F** activa la habilidad; para Copiador Boss se elige el objetivo en un panel. Volver a pulsar F termina el efecto antes. La recarga de ambas habilidades es de 90 s desde la activación, incluso si se cancela. El servidor valida objetivo, rol, duración y recarga. La animación de entrada o salida se representa junto al personaje en el mapa.

## Estado del plano

El plano sigue la plantilla recibida: dos corredores horizontales en la planta 0 y uno en la planta 1, una rama vertical, aulas a los lados, baños y una escalera conectada. En la planta 0, un corredor lleva desde Recepción hacia la izquierda, con despachos a ambos lados, hasta el Salón rojo. El pasillo inferior se conecta con Recepción y conduce al ramal de Escaleras, Dirección, Clase y Baño. Las pizarras están en paredes laterales y no ocupan las puertas. La planta 1 reúne las aulas ESO/Bachillerato/Optativas, Alemán, Profesores, Expulsados y el ramal hacia la escalera. Es una interpretación jugable y provisional de la imagen, con puertas de tres baldosas y espacios transitables. El Salón rojo tiene el escenario a la izquierda y las butacas orientadas hacia él. Hay rótulos pequeños junto a las puertas y nombres completos al abrir el minimapa. La geometría se cambia en `public/school.js`.

La sala de espera muestra las tres imágenes recibidas como cuadros en la pared. Sus archivos son `public/assets/lobby/cuadro-1.png`, `cuadro-2.png` y `cuadro-3.png`; puedes reemplazarlos conservando esos nombres. Reuniones y denuncias tienen escenas animadas; solo la víctima ve la escena de ataque a pantalla completa y los testigos próximos ven el cuchillo dentro del mapa.

## Empezar en Windows

1. Instala **Node.js 22.13 o superior** desde https://nodejs.org/ (recomendado: la versión LTS vigente).
2. Descomprime este ZIP entero. No ejecutes archivos dentro del ZIP.
3. En la carpeta del proyecto, haz doble clic en **INICIAR_WINDOWS.bat**. Mantén la ventana abierta.
4. Abre **http://localhost:3000** en Chrome, Edge o Firefox.
5. Escribe un nombre, elige tu aspecto y pulsa **Crear una sala**.
6. Comparte el código. Se necesitan **4 personas para 1 impostor**, o **7 para 2 impostores**. El líder inicia la partida.

También puedes abrir una terminal en la carpeta del proyecto y ejecutar:

```sh
node server/node.js
```

No se necesita `npm install`, una base de datos ni una compilación para jugar con el servidor Node. `public/index.html` se sirve desde el servidor; abrirlo con doble clic no crea una partida online.

Para probar tú solo las conexiones, abre cuatro pestañas nuevas desde la barra de direcciones, cada una en `http://localhost:3000`, y entra con nombres diferentes. Cada pestaña conserva su propia sesión. Evita «Duplicar pestaña», porque algunos navegadores copian también la sesión y controlarías al mismo jugador.

## Jugar desde otros ordenadores en la misma red

El ordenador que ejecuta Node es el servidor:

1. En ese ordenador, ejecuta `ipconfig` y busca su dirección IPv4; por ejemplo, `192.168.1.30`.
2. Los otros jugadores abren **http://192.168.1.30:3000** (sustituyendo la IP por la real).
3. Si Windows pregunta, permite a Node acceder a la red privada. Todos deben conectarse a la misma Wi-Fi o red local.
4. Todos usan el mismo código. No deben abrir `localhost` desde otro ordenador: eso apuntaría a su propio dispositivo.

Este método es para una red local. Para jugar desde distintas casas, publica el servidor.

## Publicar para jugar desde distintas casas: Render

El proyecto Node puede publicarse como **Web Service**, que ejecuta el servidor y sirve también la página.

1. Crea un repositorio en GitHub y sube **el contenido descomprimido** del ZIP a la raíz, conservando las carpetas. En la raíz de GitHub deben verse `package.json`, `public/`, `game/` y `server/`; dentro de `server/` debe estar `node.js`. Puedes usar «Add file → Upload files». No subas `node_modules`, `dist`, `.git`, `.wrangler`, `.sites-runtime` ni secretos.
2. En https://dashboard.render.com/, elige **New → Web Service** y conecta ese repositorio.
3. Elige estos valores:

| Campo | Valor |
| --- | --- |
| Language / Runtime | Node |
| Root Directory | Vacío, si subiste el proyecto a la raíz |
| Build Command | `node --check server/node.js` |
| Start Command | `node server/node.js` |
| Environment variable | `NODE_VERSION` = `24` |
| Health Check Path | `/api/health` |
| Instances | **1** |

4. Crea el servicio y espera a que el despliegue termine. Render te dará un enlace HTTPS `https://…onrender.com`.
5. Abre ese enlace, crea una sala y pulsa sobre el código para copiar código y enlace. Tus amigos abren **ese mismo enlace** y entran con el código.

También se incluye `render.yaml`, para importar la configuración mediante un Blueprint. El servidor respeta `PORT` y escucha en `0.0.0.0`, como requiere el alojamiento.

El plan Free de Render se suspende tras 15 minutos sin tráfico y puede tardar alrededor de un minuto en despertar. Puede reiniciarse: **las salas Node se guardan en memoria y se pierden al reiniciar el servicio**. Durante una partida hay tráfico continuo. Elige el plan que quieras en Render; aquí no se ha contratado ningún servicio. No escales este adaptador a varias instancias: cada instancia tendría sus propias salas.

Referencias oficiales consultadas el 13/10/2026:

- https://render.com/docs/deploy-node-express-app
- https://render.com/docs/web-services
- https://render.com/docs/free

GitHub Pages, un Static Site, o subir solo `public/index.html` no ejecutan el servidor de partidas. Hace falta el Web Service completo.

## Reglas y controles

| Control | Acción |
| --- | --- |
| WASD / Flechas | Moverse con colisiones y deslizamiento |
| Pantalla completa | Ocupa todo el monitor; Escape vuelve al navegador |
| E | Tarea cercana, reparar panel, botón rojo o escaleras |
| Q | Matar al tripulante cercano (solo impostor vivo) |
| V | Entrar en una alcantarilla o abrir su red (impostor e ingeniero) |
| N | Abrir la libreta privada (empollón, también durante reuniones) |
| 1–4 | Enviar el emoji indicado al creyente (solo espectros; uno cada 15 s) |
| R | Denunciar un cadáver cercano en la misma planta |
| M | Plano con pestañas de planta 0 y planta 1 |
| Escape | Cerrar tarea, vestuario, ayuda o mapa |
| Botón ⚡ | Elegir uno de seis sabotajes |

La espera se llama **Estar en clase**: permite moverse, hablar y cambiar ropa. La partida comienza en Recepción (P0) o, si se elige solo P1, en la planta 1. El líder ajusta la velocidad y las plantas desde la espera. En partidas de dos plantas, entra en cualquier punto interior de las escaleras y pulsa E para cambiar de planta. El servidor valida el alcance, detiene el movimiento durante la transición y coloca al jugador en el punto transitable correspondiente.

Los impostores y el ingeniero pueden entrar en una alcantarilla cercana con V. Dentro quedan ocultos y no pueden caminar, matar, denunciar o sabotear. Pulsa las flechas de los destinos conectados para viajar, incluso para volver por el mismo camino, y **Salir** en la alcantarilla elegida. El tiempo total dentro es de **10 s**; al agotarse sales automáticamente. Desde la salida hay **20 s de recarga** para volver a entrar. Hay doce alcantarillas divididas en cuatro circuitos independientes de tres; en partidas de una planta se muestran y validan solo las rutas dentro de ella. Entrar/salir tiene una animación y al salir hay una pausa mínima de 2 s antes de matar. Las reuniones sacan a todos de los conductos. La recarga al matar se configura en la sala de espera entre **5 y 90 s** (30 s por defecto).

### Tareas escolares

Cada jugador recibe de 2 a 10 tareas aleatorias. El servidor genera el desafío y comprueba solución, tiempo mínimo, cercanía y planta. Hay 15 tipos interactivos:

| Tarea | Minijuego | Lugar |
| --- | --- | --- |
| Limpiar pizarra | Arrastrar borrador sobre marcas | 4.º ESO A · P1 |
| Ordenar pupitres | Girar mesas y sillas | 4.º ESO B · P1 |
| Conectar proyector | Emparejar cables | 1.º Bach A · P1 |
| Reiniciar ordenador | Interruptores y arranque | 1.º Bach B · P1 |
| Llevar documentos | Ordenar páginas, llevarlas y registrar entrega | Despacho de Vaquero → Dirección · P0 |
| Buscar libro | Encontrar título en estantería | Profesores · P1 |
| Clasificar exámenes | Ordenar hojas por nota | 2.º Bach A · P1 |
| Material escolar | Clasificar objetos en cajas | Optativas · P1 |
| Reparar timbre | Repetir secuencia visual y sonora | Recepción · P0 |
| Alemán | Emparejar palabras y traducciones | Alemán · P1 |
| Recoger papeles | Recoger objetos animados del suelo | Salón rojo · P0 |
| Reparar luces | Orientar circuito | 2.º Bach B · P1 |
| Código de ordenador | Teclado numérico | Vaquero · P0 |
| Organizar carpetas | Orden alfabético | Despacho 1 · P0 |
| Comprobar baños | Ajustar válvulas y probar descarga | Baño · P0 |

Los documentos cuentan como **una tarea** y solo suman progreso tras la entrega. La lista indica «LLEVAS DOCUMENTOS» y cambia a Dirección. Los impostores tienen tareas de cobertura que no suman progreso. Los espectros pueden seguir realizando las tareas y usar escaleras.

### Ropa

Antes de entrar y durante la espera se puede elegir color de identidad, uniforme, sudadera, jersey, camiseta, chándal, bata o ropa de profesor; dos colores independientes de ropa; pantalón largo/corto; mochila; gafas; gorra, peinado u otros accesorios; corbata, auriculares o bufanda. Las prendas se dibujan en el personaje animado y se sincronizan online. El color de identidad no se repite dentro de la sala; el de la ropa puede coincidir.

### Sabotajes

Los paneles son **A: Dirección (P0)** y **B: Profesores (P1)**. Se reparan los paneles de las plantas activas: dos en partida completa y uno en partida de una sola planta. Durante el sabotaje se bloquean reuniones y denuncias. Si no se repara en **90 segundos**, gana el impostor. Los 18 s de bloqueo de puertas solo liberan las puertas; la avería sigue activa hasta reparar el panel o vencer el plazo.

| Sabotaje | Consecuencia | Reparación |
| --- | --- | --- |
| Luces | Visión reducida de tripulantes; el impostor mantiene la suya | Orientar circuitos |
| Puertas | Cierra una selección de entradas, evitando personas/cadáveres en el umbral | Válvulas; se abren también a los 18 s |
| Sistema eléctrico | Bloquea tareas de proyector, luces, ordenador y código | Cables |
| Timbre | Alarma sonora y plano bloqueado | Secuencia de notas |
| Ordenadores | Bloquea ordenador y código | Diagnóstico y arranque |
| Emergencia cooperativa | Bloquea emergencias y exige coordinación | Con dos plantas, dos personas distintas confirman paneles diferentes con ≤8 s de diferencia; en una planta basta el panel local |

En dos plantas la confirmación cooperativa caduca a los 8 s y puede repetirse. Los espectros no reparan sabotajes. Hay **112,5 s de recarga** tras sabotear; al empezar la partida el primer sabotaje se habilita tras **37,5 s**.

### Reuniones y victorias

- El botón rojo de Recepción (P0) convoca una emergencia por jugador; en partida solo de P1 hay otro en una mesa de la sala de profesores. R denuncia un cadáver cercano sin gastar esa emergencia.
- Todos se mueven en la clase de reunión y las frases aparecen sobre quien las escribe. Durante la votación, pulsa un personaje con sombra verde, elige pulgar normal o, si eres delegado, el pulgar decisivo, y confirma con ✓ o cancela con ×. Solo se registra el voto confirmado. Se expulsa a quien tenga la mayoría única; empate o mayoría de **Skip** no expulsan. El impostor ve su propio nombre en rojo durante la reunión; los tripulantes no reciben su rol.
- La animación de expulsión revela la identidad solo si lo permite la configuración del líder.
- Los tripulantes ganan por todas las tareas o por eliminar a todos los impostores. Los impostores ganan al igualar/superar a los tripulantes vivos o si un sabotaje activo no se repara en 90 s. Fuera de un sabotaje no hay límite de tiempo de partida.
- Los espectros son invisibles para los vivos, atraviesan paredes y tienen chat separado. No votan, matan, denuncian ni sabotean.
- Al acabar se muestran los roles y el líder vuelve con todos a Estar en clase.
- «Explorar salas abiertas» lista salas en espera con participantes recientes. Los roles, acciones y posiciones de otra planta no se revelan por esa lista.

## Cambios de la versión 2.6

- N abre la libreta del empollón sin escribir una «n» accidental. La presentación privada del rol dura tres segundos más.
- El antiguo «Aula de Vaquero» ahora es Despacho 2. El Despacho de Vaquero conserva su nombre propio y los demás están numerados del 1 al 6. El botón de reunión está centrado en una mesa de Recepción.
- Los cinco roles especiales de tripulante son empollón, delegado, ingeniero, **El enchufe** y **el creyente**. Cada personaje puede recibir un rol con probabilidad del 75 %, repartida entre los roles que quedan disponibles; nadie repite rol y «sin rol» puede repetirse. El enchufe recibe de forma privada el nombre y la planta de cada muerte. Los fantasmas disponen de cuatro emojis elegidos al azar para toda la partida y pueden mandar uno al creyente vivo cada 15 s.
- La reunión se juega dentro de la clase, sin cuadros. Los participantes pueden moverse, ven mensajes sobre las cabezas y votan pulsando un personaje. Se confirma con ✓ o se cancela con ×. El delegado puede escoger el pulgar decisivo.
- Dos profesores distintos elegidos entre Chuchi, Ibán de la Horra, Marcos y Luis Ángel patrullan cada partida. Persiguen a jugadores fuera de las aulas a la mitad de velocidad. Si los alcanzan, los llevan a Expulsados 30 s. Las aulas son zonas seguras. Los profesores son personajes del servidor y sus posiciones se sincronizan.
- El cambio de reglas requiere crear salas nuevas tras actualizar: las salas de versiones previas no se migran.

## Cambios de la versión 2.4

- El Salón rojo acaba antes del pasillo inferior y tiene una puerta hacia él. Recepción tiene otra salida hacia el mismo pasillo. Los despachos son un poco menos profundos y solo abren al pasillo superior.
- Los tripulantes reciben uno de tres roles especiales, sin repetición cuando hay suficientes personas: **empollón** (libreta privada con N en partida o reunión, guardada en este navegador), **delegado** (un único voto decisivo; acertar a un impostor da la victoria, equivocarse expulsa al delegado) e **ingeniero** (usa las alcantarillas). El servidor mantiene secretos los roles y valida el voto y los viajes.
- La red tiene doce alcantarillas conectadas, con rutas entre plantas. Se representan en el plano y en el suelo. Se añaden cámaras y luces animadas a salas y pasillos.
- Por cambio de geometría y reglas, las salas creadas en versiones anteriores no se reutilizan; crea una nueva sala tras actualizar.

## Cambios de la versión 2.3

- La planta 0 tiene un pasillo de despachos desde Recepción y otro recorrido por debajo de los despachos. El Salón rojo da acceso a ambos; los despachos inferiores se abren únicamente al pasillo de despachos.
- Hay 25 estaciones y se pueden asignar de 2 a 10 tareas únicas por persona (10 de forma predeterminada). Algunas estaciones reutilizan los 15 minijuegos existentes con otros objetivos y ubicaciones.
- Al empezar se muestra el grupo de participantes reales y después aparece el rol privado. Se han añadido decoraciones específicas según el aula y sonidos de pasos y escaleras.
- El color elegido en la paleta colorea la sudadera principal y sigue siendo único en la sala. El selector «Color principal de ropa» afecta al contorno de la cabeza y los complementos.

## Conexiones y límites de esta versión

**Implementado y jugable:** menú, vestuario, salas reales con código, espera en clase, configuración de velocidad y plantas, dos plantas o una sola, escaleras, conductos, cinco roles especiales únicos, dos profesores, colisiones, visión con paredes, 25 estaciones de tareas escolares y hasta 10 tareas únicas por jugador, documentos en dos fases, cadáveres, alcance/recarga, reuniones con movimiento y votos confirmados, chat, expulsión, seis sabotajes, victorias y revancha.

**Reconexión:** la pestaña conserva el token en `sessionStorage`. Recargar vuelve a la misma identidad. Tras 3,5 s sin mensajes aparece desconectada y se transfiere el liderazgo si hace falta. Durante la partida la desconexión no expulsa ni decide la victoria. En la espera la plaza se libera tras 30 s. Hace falta que el servidor y la sala sigan existiendo. Las salas de la versión espacial anterior no se migran durante una partida: el cliente muestra un mensaje para crear una sala nueva del colegio.

**Sincronización:** HTTP con cadencia objetivo de 95 ms, limitada por el tiempo de respuesta y sin añadir una espera completa después de recibirla. El cliente envía tramos con secuencia; el servidor reproduce movimiento y colisiones, valida el tiempo recorrido y confirma la posición. El cliente reconstruye lo pendiente desde esa confirmación. Otros clientes reciben la posición confirmada con su hora original. El dibujo se interpola en cada fotograma con un retardo adaptativo entre 120 y 220 ms; la extrapolación se limita a 70 ms y su corrección se suaviza. Las posiciones de la planta se envían al cliente y se ocultan visualmente según el círculo y las paredes; esta ocultación no es una protección frente a inspeccionar los mensajes de red. Los roles privados y la validación de acciones permanecen en el servidor. Se detiene la predicción tras 0,7 s sin respuesta para limitar el retroceso al reconectar. No son WebSockets.

**Cámara:** hasta 20 píxeles horizontales, limitados y suavizados. Al caminar a la derecha el personaje queda a la derecha del centro (la cámara se desplaza hacia la izquierda respecto al personaje), y a la izquierda sucede lo contrario. No hay desplazamiento direccional vertical. Al soltar las teclas la vista queda quieta. El mapa ocupa toda la ventana; panel flotante ocultable y botón de pantalla completa.

**Límites concretos:** el plano sigue siendo orientativo y admite ajustes tras probarlo con la plantilla. Controles para ordenador, sin joystick táctil, voz ni bots. Las tareas se distribuyen en lugares concretos, no en cada aula. Hay una red de alcantarillas con doce alcantarillas. Los dos paneles cooperativos son Dirección/Profesores. Las puertas se cierran como selección fija cada tercera puerta disponible durante 18 s, no con selección manual por puerta. Node usa una instancia y pierde salas al reiniciar. D1 persiste y comparte el estado entre Workers, pero cada actualización consume lecturas/escrituras; no se ha medido rendimiento con muchas salas. Una red lenta retrasa acciones y puede provocar rechazos por alcance. El ZIP puede alojarse en un servicio gratuito compatible con Node; se describen sus límites arriba.

## Comprobaciones incluidas

```sh
node --test tests/game.test.js tests/motion-vision.test.js
```

Las 60 pruebas de juego y movimiento cubren acceso a todas las habitaciones de ambas plantas, geometría transitable, roles únicos y avisos privados, señales de cuatro emojis con recarga, profesores y aulas seguras, reunión con movimiento sincronizado y dibujo del lienzo, salas y perfiles, ropa online, líder, sincronización con latencia, velocidad, colisiones, deduplicación, asesinato y recarga configurable, plantas aisladas, conductos, restricciones de rol/alcance, chat, doble voto, empate, expulsión, victorias, 15 tipos de minijuegos en 25 estaciones, seis sabotajes, puertas seguras, cooperación, cámara, desconexión, revancha y concurrencia D1.

La prueba de movimiento añade entregas repetidas e irregulares a cuatro clientes HTTP y evalúa el dibujo a 60 fotogramas por segundo. Comprueba el borde de visión y el recorte circular en dos tamaños de pantalla, las paredes, las puertas abiertas y las etiquetas/capas del minimapa. Son pruebas de datos y operaciones de dibujo; no una medición de FPS en cuatro dispositivos físicos.

La integración HTTP abre un servidor efímero y usa cuatro clientes reales de API. Las pruebas preparan posiciones y adelantan relojes únicamente en el almacén de pruebas. No hay ruta de teletransporte ni reloj acelerado en producción. La prueba del Worker compilado `tests/hosted.test.mjs` verifica HTML, assets, cuatro clientes, D1, roles, plantas, conductos, tareas, reuniones, votos concurrentes, victoria y revancha. Requiere instalar las dependencias del marco y compilar. Las comprobaciones de servidor y los renders del canvas no equivalen a una prueba manual visual en cuatro navegadores.

## Modificar después el mapa, las tareas o los aspectos

| Archivo | Responsabilidad |
| --- | --- |
| `public/school.js` | Dos planos, pasillos, puertas, mobiliario, estaciones, entregas, escaleras, rejillas, red y sabotajes
| `public/content.js` | Colores, ropa y geometría compartida (velocidad, colisiones, visión) |
| `public/render.js` | Mobiliario, mapas, cadáveres, visión y plano por plantas
| `public/characters.js` | Personajes originales, ropa, animación y avatares SVG/canvas
| `public/camera.js` | Encuadre horizontal de 20 píxeles
| `public/tasks.js` | Minijuegos interactivos del navegador
| `game/tasks.js` | Generación de desafíos, tiempos y comprobación de soluciones |
| `public/client.js` | Interfaz, controles, red y presentación de minijuegos |
| `public/style.css` | Apariencia y distribución de la interfaz |
| `public/index.html` | Pantallas y estructura HTML |
| `game/engine.js` | Reglas, roles, desafíos, comprobación de soluciones, votos, sabotajes y victorias |
| `game/api.js` | Protocolo de salas y acciones |
| `server/node.js` | Servidor HTTP Node y entrega de archivos |
| `server/memory-store.js` | Salas en memoria para Node |
| `server/d1-store.js` | Almacén D1 con revisión atómica para el alojamiento Workers |
| `app/` + `db/` + `drizzle/` | Adaptador de alojamiento Sites / Workers y esquema de base de datos |
| `tests/` | Pruebas automatizadas |

Para sustituir el plano se editan `FLOORS` y los rectángulos de `public/school.js` en unidades de baldosa (`TILE = 56`), estaciones y posiciones de emergencia. El cliente y el servidor importan la misma geometría. Para crear un tipo de tarea nuevo se añade su estación a `school.js`, su desafío y comprobación a `game/tasks.js`, y su minijuego a `public/tasks.js`. Los archivos de juego original están separados del marco de alojamiento.

## Adaptador Sites / Workers

El proyecto conserva el iniciador Vinext y la integración `sites()` para alojarlo en Sites. La declaración D1 usa el binding `DB`; las migraciones SQL están en `drizzle/`. D1 aplica cambios solo si la revisión leída sigue vigente, de modo que dos votos o entradas simultáneas no se pisan. Nunca se confía en el rol, las coordenadas ni el voto enviado por el cliente.

Para desarrollar este adaptador se instalan las dependencias del marco con pnpm (versión en `packageManager` de `package.json`), se usa `pnpm dev`, `pnpm build` y se aplican las migraciones D1 con Wrangler según `docs/WORKERS.md`. Este paso **no es necesario** para el servidor Node ni para publicarlo en Render.

## Docker opcional

```sh
docker build -t sanagus-as .
docker run --rm -p 3000:3000 sanagus-as
```

Después abre http://localhost:3000. El contenedor utiliza el mismo servidor Node y conserva las mismas limitaciones de una sola instancia.
