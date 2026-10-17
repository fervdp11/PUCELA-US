// No se guarda una versión antigua del juego ni las respuestas de las salas.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 if(event.request.mode!=='navigate')return;
 event.respondWith(fetch(event.request).catch(()=>new Response(`<!doctype html><html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PUCELA US · Sin conexión</title><body style="background:#0b1723;color:#e8f0dd;font:18px system-ui;padding:40px"><h1>Necesitas conexión para jugar.</h1><p>Conecta el móvil a Internet y vuelve a intentarlo. La partida se gestiona en el servidor.</p><button onclick="location.reload()" style="padding:15px;font:inherit">Volver a intentar</button></body></html>`,{status:503,headers:{'Content-Type':'text/html; charset=utf-8'}})));
});
