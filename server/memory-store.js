import {roomAbandoned,publicRoom,roomListing} from '../game/engine.js';
import {GameError} from '../game/engine.js';
export class MemoryStore {
  constructor(options={}){this.rooms=new Map();this.rates=new Map();this.secret=options.secret;this.maxRooms=options.maxRooms??2;}
  async create(room){await this.cleanup();if(this.rooms.size>200){for(const [c,r] of this.rooms)if(Date.now()-r.updated>3600000||!r.players.some(p=>!p.removed))this.rooms.delete(c);}if(this.rooms.size>=this.maxRooms)throw new GameError('Servidor lleno. Inténtalo más tarde.',503);if(this.rooms.has(room.code))return false;this.rooms.set(room.code,structuredClone(room));return true;}
  async transact(code,fn){const original=this.rooms.get(code);if(original&&roomAbandoned(original)){this.rooms.delete(code);throw new GameError('Esta sala se ha cerrado porque no quedaban personas conectadas.',404);}if(!original||Date.now()-original.updated>86400000)throw new GameError('No existe esa sala. Comprueba el código.',404);const room=structuredClone(original),result=fn(room);room.version++;this.rooms.set(code,room);return result;}
  // Variante sin copia para operaciones que no necesitan deshacer cambios: el
  // pulso (validado antes de mutar), el reloj de bots y las mesas en tiempo
  // real. Copiar la sala entera (≈45 KB) en cada pulso era el mayor coste fijo
  // por petición: con 10 jugadores, ~100 copias por segundo. Las acciones que
  // sí pueden fallar a medias siguen pasando por `transact`.
  async mutate(code,fn){const room=this.rooms.get(code);if(!room||room.phase==='ended')return this.transact(code,fn);if(roomAbandoned(room)){this.rooms.delete(code);throw new GameError('Esta sala se ha cerrado porque no quedaban personas conectadas.',404);}if(Date.now()-room.updated>86400000)throw new GameError('No existe esa sala. Comprueba el código.',404);const result=fn(room);room.version++;return result;}
  async cleanup(now=Date.now()){for(const [code,room] of this.rooms)if(roomAbandoned(room,now))this.rooms.delete(code);}
  async listOpen(now){await this.cleanup(now);return [...this.rooms.values()].filter(r=>publicRoom(r,now)).sort((a,b)=>b.updated-a.updated).slice(0,24).map(roomListing);}
  async limit(ip,now){let r=this.rates.get(ip);if(!r||now-r.start>600000){r={start:now,n:0};this.rates.set(ip,r);}if(++r.n>50)throw new GameError('Demasiadas entradas. Espera unos minutos.',429);if(this.rates.size>5000)for(const [k,v] of this.rates)if(now-v.start>600000)this.rates.delete(k);}
}
