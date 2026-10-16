// Una sala no pertenece a sus bots. El latido de un bot nunca renueva esta fecha.
export const ROOM_RECONNECT_GRACE=30000;
export function roomAbandoned(room,now=Date.now()){
 const humans=room.players.filter(p=>!p.bot);return now-Math.max(room.created||0,...humans.map(p=>p.lastSeen||0))>ROOM_RECONNECT_GRACE;
}
export function publicRoom(room,now){return !roomAbandoned(room,now)&&room.visibility!=='private'&&room.contentVersion===4&&room.phase==='lobby'&&room.players.filter(p=>!p.removed).length<10&&room.players.some(p=>!p.bot&&!p.removed&&now-p.lastSeen<=6000);}
export function roomListing(r){return {code:r.code,host:r.players.find(p=>p.id===r.host)?.name||'Tripulación',players:r.players.filter(p=>!p.removed).length,maxPlayers:10,impostors:r.config.impostors,map:r.config.map};}
