(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.MerchantRules=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // All merchant pricing policy lives here. Currency is integer game cents.
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  // A game day is 420 simulation seconds. The timber yard's $90 daily lease
  // makes its thin resale margin matter. Closed operations accrue no new bills.
  const DAILY_COSTS={ts:9000};
  const SHOP_ITEMS={timber:{price:1800,min:1000,max:2400,capacity:10},furniture:{price:5000,min:4000,max:8000,capacity:6}};
  const REGULARS={workshop:{business:'ow',npc:11,item:'timber',target:9,quantity:2,purpose:'Keep the furniture line supplied.'},market:{business:'market',npc:null,item:'furniture',target:4,quantity:1,purpose:'Furnish local homes and the community market.'},farm:{business:'farm',npc:24,item:'timber',target:4,quantity:2,purpose:'Repair fences and maintain farm buildings.'}};
  function calendar(game){
    const day=Math.floor((game.Sim.time+1e-6)/game.Sim.clock.DAYLEN),phase=Math.floor(day/2)%3;
    return {key:Math.floor(day/2),day,endsDay:(Math.floor(day/2)+1)*2,phase,
      title:['Festival preparations','Island furniture festival','Harvest fair'][phase],
      description:['A furniture festival starts next. Build stock before buyers raise their budgets.','Furniture sale prices and regular-customer budgets are 20% higher. Market demand rises to 8 sets.','Farm retail prices are 20% lower. Shop around for supplies before preparations return.'][phase],
      next:['Island furniture festival','Harvest fair','Festival preparations'][phase],furnitureFactor:phase===1?1.2:1,produceFactor:phase===2?.8:1};
  }
  function regularQuote(game,id){
    if(!Object.hasOwn(REGULARS,id))throw Error('Unknown regular customer.');const spec=REGULARS[id];
    const E=game.Eco,B=E[spec.business],c=E.retention?.customers?.[id]||{},filled=c.completed||0,cycle=calendar(game),bonus=filled>=8?.06:filled>=3?.03:0;
    const target=id==='market'&&cycle.phase===1?8:spec.target,stock=B.inv[spec.item]||0;
    const quantity=Math.min(target-stock,spec.quantity+Math.min(2,Math.floor(filled/3)));
    const unit=spec.item==='timber'?E.post.price:(E.post.prices?.[spec.item]||SHOP_ITEMS[spec.item].price);
    const ceiling=Math.floor((spec.item==='timber'?E.ts.price:5000*cycle.furnitureFactor)*(1+bonus)/25)*25;
    const reward=Math.max(0,quantity)*unit,rank=filled>=8?'Partner':filled>=3?'Trusted regular':filled>=1?'Regular':'New customer';
    const reason=E.post.owner!=='player'?'Buy the Trading Post to build a customer book.':c.active?'An agreed order is waiting for stock.':c.lastFilledDay===cycle.day?'Already served today. They can return next island day.':B.closed?'Their business is closed.':quantity<1?'Their stock target is met.':unit>ceiling?'Your shelf price exceeds their budget. Lower it to win the order.':B.cash<reward?'They cannot reserve enough cash.':stock+quantity>(B.cap[spec.item]??Infinity)?'Their storage is full.':null;
    return {id,...spec,name:B.name,quantity:Math.max(0,quantity),unit,ceiling,reward,rank,completed:filled,subscribed:Boolean(c.subscribed),available:!reason,reason:reason||`${stock}/${target} in stock. ${spec.purpose}${bonus?' Your relationship raises their budget by '+Math.round(bonus*100)+'%.':''}`,active:c.active||null};
  }
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
    const cycle=calendar(game);if(E.calendar&&E.calendar.key!==cycle.key)event(game,'market_calendar',cycle.title+': '+cycle.description);E.calendar=cycle;
    const prior=E.merchants||{};
    const specs=[['timber','ts','timber',2000,20,false],['workshop','ow','timber',1200,9,true],['furniture','ow','furniture',6500*cycle.furnitureFactor,8,false],['maize','farm','maize',500*cycle.produceFactor,25,false],['cassava','farm','cassava',450*cycle.produceFactor,25,false],['milk','farm','milk',400*cycle.produceFactor,20,false]];
    const result={};
    for(const [id,biz,item,base,target,buying] of specs){
      const B=E[biz],p=prior[id];
      const demand=p?Math.max(0,(p.demand||0)*.8+Math.max(0,p.stock-B.inv[item])):0;
      result[id]={...quote({base,stock:B.inv[item],target,demand,cash:B.cash,buying}),biz,item,demand};
      if(item==='furniture'&&cycle.furnitureFactor!==1||['maize','cassava','milk'].includes(item)&&cycle.produceFactor!==1)result[id].reason+=' '+cycle.title+': '+cycle.description;
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
  // Groq may propose a business action; these deterministic limits choose the
  // item, quantity, counterparty and price against CURRENT state at execution.
  function agentAction(game,business,intent){
    const E=game.Eco,B=E[business];if(!['ts','ow','farm'].includes(business))throw Error('Unknown merchant');
    if(intent==='hold')return 'Held stock and cash; no trade executed.';
    if(B.closed)return 'Shop is closed; investment must clear its arrears first.';
    let seller,buyer,item,price;
    if(intent==='restock'&&business==='ow'){
      if(B.inv.timber>=6)return 'Timber target already met; no purchase.';
      seller=[E.ts,E.post].filter(b=>!b.closed&&b.inv.timber>0&&(b!==E.post||b.owner)).sort((a,b)=>a.price-b.price)[0];buyer=B;item='timber';price=seller?.price;
    }else if(intent==='restock'&&business==='ts'){
      if(B.inv.timber>=20)return 'Yard target already met; no purchase.';seller=E.port;buyer=B;item='timber';price=1700;
    }else if(intent==='sell_surplus'&&business==='farm'){
      item=['maize','cassava','milk'].find(i=>B.inv[i]>10);if(!item)return 'No farm surplus above the 10-unit reserve.';seller=B;buyer=E.market;price=E.AGP[item].whole;
    }else throw Error('Invalid merchant proposal');
    if(!seller||seller.closed||seller.inv[item]<1||buyer.cash<price||(buyer.inv[item]||0)+1>buyer.cap[item])return 'Cannot trade: cash, stock or storage is insufficient.';
    if(!E.trade(buyer,seller,item,1,price))return 'Trade rejected by the economy rules.';
    return `Traded 1 ${item} from ${seller.name} to ${buyer.name} at $${(price/100).toFixed(2)}.`;
  }
  return {quote,update,DAILY_COSTS,agentAction,SHOP_ITEMS,REGULARS,calendar,regularQuote};
});
