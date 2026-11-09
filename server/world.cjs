'use strict';
const {createGame}=require('../shared/core.js');
const State=require('../shared/state.js');
const Rules=require('../shared/merchant-rules.js');
const manifest=require('../shared/world.json');
function world(saved){
  const G=createGame(),S=G.Sim,w=structuredClone(manifest);
  for(const c of w.colliders)c.k==='s'?S.Col.addSeg(c.x1,c.z1,c.x2,c.z2,c.r,c.type):S.Col.add(c.x,c.z,c.hx*2,c.hz*2,c.type);
  for(const r of w.roads)S.Roads.add(r.cl,r.w,r.kind);
  S.init(w);if(saved){State.apply(G,saved,{restore:true});G.elapsedRemainder=saved.economicRemainder||0;G.ruleClock=saved.ruleClock||0;}Rules.update(G);
  return G;
}
const marketActions={buyTimber:'ts',sellTimber:'ow',buyFurn:'ow',contract:'ow',buy_maize:'farm',buy_cassava:'farm',buy_milk:'farm',sellAgri:'market'};
function action(G,name,args={}){
  const E=G.Eco,S=G.Sim;
  const actions={buyTimber:()=>E.buyTimber(),sellTimber:()=>E.sellTimber(),buyFurn:()=>E.buyFurn(),contract:()=>E.contractAct(),buyPost:()=>E.buyPost(),stock:()=>E.stock(),upgrade:()=>E.upgrade(),sellAgri:()=>E.sellAgri(),
    buy_maize:()=>E.buyFarm('maize',1),buy_cassava:()=>E.buyFarm('cassava',1),buy_milk:()=>E.buyFarm('milk',1),sellGold:()=>E.sellGold(),sellFurniture:()=>E.sellFurniture(),craft:()=>{if(!S.startCraft('furniture'))throw new Error('Visit Oak & Iron with 3 timber and $2 labour to craft furniture.');},
    setPrice:()=>{if(![-100,100].includes(args.delta))throw new Error('Invalid price adjustment');E.setPrice(args.delta);},
    moveCapital:()=>{if(![-2000,2000].includes(args.amount))throw new Error('Invalid transfer');E.move(args.amount);},
    harvest:()=>{if(!Number.isInteger(args.id)||!S.startHarvest(args.id))throw new Error('Walk closer to an available resource.');},
    processOre:()=>{if(Math.hypot(S.player.x-58,S.player.z+21.5)>5)throw new Error('Visit the processing plant first.');E.processOre();},
    talk:()=>{if(!S.Talk.open(args.id))throw new Error('Walk closer to talk.');},
    choose:()=>S.Talk.choose(args.option),closeTalk:()=>S.Talk.close(),
    message:()=>{if(!S.Msg.contacts().some(n=>n.id===args.id))throw new Error('Contact unavailable');S.Msg.ask(args.id,args.topic);},
    invest:()=>{if(!['ts','ow','farm','market'].includes(args.business))throw new Error('Unknown merchant');if(E.player.cash<2000)throw new Error('Investment costs $20.');const B=E[args.business];E.player.cash-=2000;E.player.capital-=2000;B.cash+=2000;B.capital+=2000;E.say('Invested $20 in '+B.name+'.');}};
  if(!Object.hasOwn(actions,name))throw new Error('Unknown action');
  const biz=marketActions[name];if(biz&&E[biz].cash<1)throw new Error(E[biz].name+' is closed. Invest to reopen it.');
  actions[name]();Rules.update(G);
}
module.exports={world,action};
