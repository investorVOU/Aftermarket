(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.MerchantRules=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // All merchant pricing policy lives here. Currency is integer game cents.
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  // A game day is 420 simulation seconds. The timber yard's $90 daily lease
  // makes its thin resale margin matter. Closed operations accrue no new bills.
  const DAILY_COSTS={ts:9000};
  function event(game,type,message){const E=game.Eco;E.economicEvents=E.economicEvents||[];const entry={id:(E.eventSequence||0)+1,time:game.Sim.time,type,message};E.eventSequence=entry.id;E.economicEvents.push(entry);if(E.economicEvents.length>100)E.economicEvents.shift();E.say(message);}
  function operations(game){
    const E=game.Eco,day=Math.floor((game.Sim.time+1e-6)/game.Sim.clock.DAYLEN);
    // Existing saves start this policy on their current day, with no retroactive bill.
    if(E.overheadDay===undefined)E.overheadDay=day;
    for(;E.overheadDay<day;E.overheadDay++)for(const [id,cost]of Object.entries(DAILY_COSTS)){
      const B=E[id];if(B.closed)continue;
      const paid=Math.min(B.cash,cost);B.cash-=paid;B.exp+=paid;B.arrears=(B.arrears||0)+cost-paid;
      B.note('Daily lease: paid $'+(paid/100).toFixed(2));
      if(paid<cost){B.closed=true;B.activity='Closed: awaiting investment';event(game,'merchant_closed',B.name+' closed: its $90 daily lease exceeded its cash reserve. Investment must cover the arrears and restore working capital.');}
      else event(game,'operating_cost',B.name+' paid its $90 daily lease.');
    }
    for(const id of Object.keys(DAILY_COSTS)){const B=E[id];if(!B.closed)continue;
      const paid=Math.min(B.cash,B.arrears||0);B.cash-=paid;B.exp+=paid;B.arrears=(B.arrears||0)-paid;
      if(B.arrears===0&&B.cash>0){B.closed=false;B.activity='Selling timber';event(game,'merchant_reopened',B.name+' reopened after its arrears were paid and working capital was restored.');}
    }
  }
  function quote({base,stock,target,demand=0,cash=100000,buying=false}){
    const scarcity=clamp((target-stock)/Math.max(1,target),-1,1);
    const pressure=clamp(demand/20,0,.2);
    const multiplier=clamp(1+scarcity*.35+pressure,.65,1.55);
    const price=Math.round(base*multiplier/25)*25;
    const closed=buying&&cash<price;
    return {price,base,stock,target,closed,trend:scarcity>.15?'rising':scarcity<-.15?'falling':'steady',
      reason:closed?'Treasury is too low to buy. An investment can reopen this merchant.':
        `${stock} in stock; target ${target}. ${scarcity>.15?'Low stock increases the price.':scarcity<-.15?'Extra stock lowers the price.':'Supply is balanced.'}${pressure>0?' Recent demand adds a premium.':''}`};
  }
  function update(game){
    const E=game.Eco;
    operations(game);
    const prior=E.merchants||{};
    const specs=[['timber','ts','timber',2000,20,false],['workshop','ow','timber',1200,9,true],['furniture','ow','furniture',6500,8,false],['maize','farm','maize',500,25,false],['cassava','farm','cassava',450,25,false],['milk','farm','milk',400,20,false]];
    const result={};
    for(const [id,biz,item,base,target,buying] of specs){
      const B=E[biz],p=prior[id];
      const demand=p?Math.max(0,(p.demand||0)*.8+Math.max(0,p.stock-B.inv[item])):0;
      result[id]={...quote({base,stock:B.inv[item],target,demand,cash:B.cash,buying}),biz,item,demand};
      if(B.closed){result[id].closed=true;result[id].reason='Closed after an unpaid operating bill. Arrears: $'+((B.arrears||0)/100).toFixed(2)+'. Invest to pay the bill and restore working capital.';}
    }
    E.merchants=result;
    E.priceHistory=E.priceHistory||[];
    if(!E.priceHistory.length||game.Sim.time-E.priceHistory[E.priceHistory.length-1].time>=20){E.priceHistory.push({time:game.Sim.time,prices:Object.fromEntries(Object.entries(result).map(([id,q])=>[id,q.price]))});if(E.priceHistory.length>300)E.priceHistory.shift();}
    E.merchantProfiles=Object.fromEntries(['ts','ow','farm','market','port','crew'].map(id=>{const b=E[id],net=b.rev-b.exp;return[id,{name:b.name,cash:b.cash,net,arrears:b.arrears||0,dailyCost:DAILY_COSTS[id]||0,state:b.closed||b.cash<200?'bankrupt':b.cash<5000?'struggling':'healthy',goal:id==='ow'?'Keep production supplied and sell profitable furniture.':id==='farm'?'Harvest before storage fills and fund the next planting.':'Maintain stock and a positive treasury.',relationship:E.relationships[b.name]||0}];}));
    E.economicEvents=E.economicEvents||[];
    const shortage=E.ts.inv.timber<6&&game.Sim.ship.state==='offshore';
    if(shortage&&!E.supplyStrain){const event={id:(E.eventSequence||0)+1,time:game.Sim.time,type:'shortage',message:'Timber shortage: yard stock is low and the next import ship is offshore.'};E.eventSequence=event.id;E.economicEvents.push(event);E.say(event.message);}
    if(!shortage&&E.supplyStrain){const event={id:(E.eventSequence||0)+1,time:game.Sim.time,type:'recovery',message:'Timber supply recovered. Check merchant prices for a new opportunity.'};E.eventSequence=event.id;E.economicEvents.push(event);E.say(event.message);}
    E.supplyStrain=shortage;if(E.economicEvents.length>100)E.economicEvents.shift();
    E.ts.price=result.timber.price;E.ow.bid=result.workshop.price;E.ow.furnPrice=result.furniture.price;
    for(const item of ['maize','cassava','milk'])E.AGP[item].retail=result[item].price;
    return result;
  }
  return {quote,update,DAILY_COSTS};
});
