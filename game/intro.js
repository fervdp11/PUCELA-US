// Arrival, neutral suspense, actual presentation and reading are separate gates.
export const TRAVEL_MS=11000,NEUTRAL_MS=1600,ROLE_READ_MS=8000;
export function beginIntro(room,now){room.journeyStart=now;room.travelUntil=now+TRAVEL_MS;room.roleRevealAt=Number.MAX_SAFE_INTEGER;room.revealUntil=Number.MAX_SAFE_INTEGER;room.intro={stage:'travel',startedAt:now,travelEnd:room.travelUntil};for(const p of room.players){p.arrivalReady=false;p.roleShownAt=0;}}
export function advanceIntro(room,now){const i=room.intro;if(!i||room.phase!=='game'||i.stage==='playing')return;const humans=room.players.filter(p=>!p.removed&&!p.bot&&p.introProtocol&&now-p.lastSeen<=30000);if(i.stage==='travel'&&now>=i.travelEnd&&humans.every(p=>p.arrivalReady)){i.stage='neutral';i.neutralAt=now;i.neutralEnd=now+NEUTRAL_MS;room.roleRevealAt=i.neutralEnd;}
 if(i.stage==='neutral'&&now>=i.neutralEnd){i.stage='reveal';i.revealAt=now;room.roleRevealAt=now;}
 if(i.stage==='reveal'&&humans.every(p=>p.roleShownAt)){i.stage='reading';i.readEnd=Math.max(i.revealAt,...humans.map(p=>p.roleShownAt))+ROLE_READ_MS;room.revealUntil=i.readEnd;}
 if(i.stage==='reading'&&humans.some(p=>!p.roleShownAt)){i.stage='reveal';room.revealUntil=Number.MAX_SAFE_INTEGER;}
 if(i.stage==='reading'&&now>=i.readEnd){i.stage='playing';i.playingAt=now;room.revealUntil=now;room.emergencyReady=now+30000;room.sabotageReady=now+37500;for(const p of room.players){p.killReady=now+room.config.killCooldown*1000;p.spawnAt=now;p.moveAt=now;p.motionAt=now;p.motionAnchor=now;p.motionSpent=0;}}
}
export function introPublic(room,p,now){const i=room.intro;if(!i)return null;return {...i,ownArrivalReady:!!p.arrivalReady,ownRoleShownAt:p.roleShownAt||0,waiting:room.players.filter(q=>!q.removed&&!q.bot&&q.introProtocol&&now-q.lastSeen<=30000&&(i.stage==='travel'?!q.arrivalReady:i.stage==='reveal'?!q.roleShownAt:false)).length};}
