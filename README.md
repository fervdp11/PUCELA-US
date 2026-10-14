# Sanagus As 3.2.4 · Proyecto completo para web

Incluye cliente, servidor online, mapa, tareas, gráficos y pruebas. Son **40 archivos**. Conserva las carpetas public, game, server y tests al extraer y subir el proyecto.

## Ejecutar en tu ordenador

1. Instala Node.js 24.
2. Extrae todo el ZIP en una carpeta.
3. Abre una terminal en la carpeta que contiene package.json.
4. Ejecuta `npm start`.
5. Abre `http://localhost:3000`. Para parar el servidor, Ctrl+C.

En Windows también puedes ejecutar INICIAR_WINDOWS.bat después de instalar Node.js. El cliente necesita este servidor: abrir index.html como archivo no proporciona salas online.

## Publicar con GitHub y Render

1. Crea un repositorio de GitHub y sube el contenido extraído. Arrastra también las carpetas completas; no aplanes sus archivos. package.json debe quedar en la raíz y el servidor en server/node.js.
2. En Render crea un Web Service y conecta ese repositorio. Utiliza entorno Node, Root Directory vacío, Build Command `node --check server/node.js` y Start Command `node server/node.js`.
3. Si te pide una versión de Node, configura NODE_VERSION con el valor `24`. Usa `/api/health` como ruta de salud.
4. Publica y comparte la dirección HTTPS del servicio. Todos deben usar el mismo enlace para compartir salas.

render.yaml contiene estos ajustes para servicios que admitan configurarlos desde el repositorio. Dockerfile permite desplegar el servidor en otros alojamientos compatibles con Docker.

Las salas del servidor Node se guardan en memoria: reiniciar el proceso cierra las salas existentes. Usa una sola instancia para este proyecto. La partida puede durar hasta que se cumpla una condición de victoria; los sabotajes sin reparar ganan a los 90 segundos.

## Cambios de esta versión

- Ordenador: vestuario y botones de sala amplios; todos los selectores de la categoría están visibles.
- Móvil: conserva el menú compacto sin desplazar la página. Panel incluye participantes, reglas, iniciar y cambiar ropa. Se elimina el botón Ajustes duplicado.
- Reuniones móviles: se indica quién convocó o reportó, junto a la guía para votar; el chat sigue siendo desplegable.
- Se conservan el joystick, la intro, los roles, las tareas y la expulsión en la terraza a pantalla completa.

En iPhone puedes abrir el enlace con Safari, añadirlo a la pantalla de inicio y abrirlo desde su icono para quitar los controles del navegador. La opción de pantalla completa también está disponible donde el navegador la admita.

## Comprobaciones

`npm test` ejecuta las pruebas del servidor, movimiento, visión, minimapa y controles táctiles. Se han pasado 74 pruebas automáticas y el ciclo con cuatro clientes. No se ha verificado visualmente esta versión en un móvil físico.

## Sustituir tus contenidos

Mapa: public/school.js y public/content.js. Tareas: game/tasks.js y public/tasks.js. Personajes: public/characters.js. Escenas: public/arrival.js y public/expulsion.js. Cliente: public/client.js y public/style.css. Servidor y reglas: server/node.js y game/engine.js.
