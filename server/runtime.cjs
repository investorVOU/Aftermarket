'use strict';
// Render injects RENDER and PORT even when a service was created manually
// rather than from our Blueprint. Public services must never default to SQLite.
function runtime(env){
  const hosted=env.RENDER==='true'||env.NODE_ENV==='production';
  const mode=env.GAME_MODE||(hosted?'connected':'development');
  if(!['development','connected'].includes(mode))throw new Error('GAME_MODE must be development or connected.');
  if(hosted&&mode==='development')throw new Error('Hosted services require GAME_MODE=connected. Development identities and SQLite are local only.');
  const host=hosted?'0.0.0.0':env.HOST||(mode==='development'?'127.0.0.1':'0.0.0.0');
  const port=Number(env.PORT||(env.RENDER==='true'?10000:8080));
  if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be an integer between 1 and 65535.');
  if(mode==='development'&&host!=='127.0.0.1')throw new Error('Development mode must bind to 127.0.0.1.');
  return {mode,development:mode==='development',host,port,hosted};
}
module.exports={runtime};
