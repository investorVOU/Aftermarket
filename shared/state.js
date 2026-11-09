(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.GameState=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const clone=v=>JSON.parse(JSON.stringify(v));
  const npcKeys=['x','z','h','v','vis','near','phase','mode','carry','talk','talking','st'];
  const pick=(o,keys)=>Object.fromEntries(keys.filter(k=>o[k]!==undefined).map(k=>[k,o[k]]));
  function capture({Eco:E,Sim:S,random},full=false){
    const tractor={...S.tractor,task:S.tractor.task?{...S.tractor.task,plot:S.tractor.task.plot?.id}:null};
    return clone({version:1,economy:E,time:S.time,clock:S.clock,player:pick(S.player,['x','z','h']),
      npcs:S.npcs.map(n=>pick(n,full?[...npcKeys,'wait','cur','off','acc','sT','lx','lz']:npcKeys)),
      truck:S.truck,ship:S.ship,tractor,harvesting:S.harvesting,nodes:S.nodes,jobs:S.jobs,jobSequence:S.jobSequence,
      agri:{plots:S.Agri.plots.map(p=>pick(p,['id','stage','t0','yieldQ','rev','inspected'])),cows:S.Agri.cows,
        feed:S.Agri.feed,water:S.Agri.water,transit:S.Agri.transit,stats:S.Agri.stats,last:S.Agri.last,lastDelivery:S.Agri.lastDelivery,rev:S.Agri.rev},
      talk:{cur:S.Talk.cur,rev:S.Talk.rev},messages:{threads:S.Msg.threads,rev:S.Msg.rev},
      timers:S.saveTimers(),rng:random?.getState?.()});
  }
  function apply(game,data,{restore=false}={}){
    if(data.version!==1)throw new Error('Unsupported save version');
    const {Eco:E,Sim:S,Biz,random}=game;
    for(const [k,v] of Object.entries(data.economy)){
      if(E[k] instanceof Biz)Object.assign(E[k],clone(v));else if(typeof E[k]!=='function')E[k]=clone(v);
    }
    S.time=data.time;Object.assign(S.clock,data.clock);Object.assign(S.player,data.player);
    data.npcs.forEach((n,i)=>{if(S.npcs[i]){Object.assign(S.npcs[i],clone(n));if(restore){Object.assign(S.npcs[i],{dest:null,path:null,prod:null,wait:0,talking:false});}}});
    Object.assign(S.truck,clone(data.truck));Object.assign(S.ship,clone(data.ship));
    Object.assign(S.tractor,clone(data.tractor));
    if(S.tractor.task?.plot!==undefined)S.tractor.task.plot=S.Agri.plots[S.tractor.task.plot];
    S.harvesting=clone(data.harvesting);S.nodes=clone(data.nodes);S.jobs=clone(data.jobs||[]);S.jobSequence=data.jobSequence||0;
    data.agri.plots.forEach(p=>Object.assign(S.Agri.plots[p.id],clone(p),{claim:null,claimUntil:0}));
    for(const k of ['cows','feed','water','transit','stats','last','lastDelivery','rev'])if(data.agri[k]!==undefined)S.Agri[k]=clone(data.agri[k]);
    S.Talk.cur=restore?null:clone(data.talk.cur);S.Talk.rev=restore?data.talk.rev+1:data.talk.rev;
    S.Msg.threads=clone(data.messages.threads);S.Msg.rev=data.messages.rev;
    S.restoreTimers(data.timers||{});if(data.rng!==undefined)random?.setState?.(data.rng);
  }
  return {capture,apply};
});
