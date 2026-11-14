'use strict';
const Rules=require('../shared/merchant-rules.js');
const Credit=require('./credit.cjs');
const Employment=require('./employment.cjs');
const Retention=require('./retention.cjs');
const STEP=.1;
// The same fixed economic step drives real time, offline catch-up and preview mode.
function advance(game,seconds){
  game.elapsedRemainder=(game.elapsedRemainder||0)+seconds;
  while(game.elapsedRemainder>=STEP-1e-8){game.Sim.update(STEP);game.elapsedRemainder-=STEP;game.ruleClock=(game.ruleClock||0)+STEP;if(game.ruleClock>=5-1e-8){game.ruleClock=0;Rules.update(game);Credit.tick(game);Employment.update(game);Retention.update(game);}}
}
async function catchUp(game,seconds,onProgress=()=>{}){
  if(!Number.isFinite(seconds)||seconds<0)throw new Error('Invalid offline time');
  let done=0;
  while(done<seconds){const chunk=Math.min(10,seconds-done);advance(game,chunk);done+=chunk;onProgress(done/Math.max(1,seconds));await new Promise(resolve=>setImmediate(resolve));}
}
module.exports={advance,catchUp,STEP};
