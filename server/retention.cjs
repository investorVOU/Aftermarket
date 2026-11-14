'use strict';
// Funded standing orders, visible community projects and a persistent shop report.
// No client prices, invented customer cash, expiry fines or login streaks.
const Rules=require('../shared/merchant-rules.js');
const PROJECTS=[
 {id:'garden',title:'Community market garden',needs:{timber:3,furniture:1,maize:2},unit:{timber:1400,furniture:5500,maize:350},reward:'Market planters, +5 timber storage and +3 reputation.'},
 {id:'canopy',title:'A bigger market canopy',needs:{timber:6,furniture:2},unit:{timber:1400,furniture:5500},reward:'A market canopy, +5 timber storage and +3 reputation.'},
 {id:'pavilion',title:'Harbour gathering place',needs:{timber:9,furniture:3,maize:4},unit:{timber:1400,furniture:5500,maize:350},reward:'A harbour banner, +5 timber storage and +3 reputation.'}
];
const day=G=>Math.floor((G.Sim.time+1e-6)/G.Sim.clock.DAYLEN);
function ensure(G){
 const E=G.Eco;if(!(E.customerdesk instanceof G.Biz))E.customerdesk=Object.assign(new G.Biz({name:'Island orders reserve',cash:0,inv:{timber:0,furniture:0,maize:0}}),E.customerdesk||{});
 E.post.prices||={furniture:5000};for(const [item,spec]of Object.entries(Rules.SHOP_ITEMS)){E.post.inv[item]??=0;E.post.cap[item]??=spec.capacity;}
 E.farm.inv.timber??=0;E.farm.cap.timber??=8;
 E.retention||={version:1,customers:{},sequence:0,history:[],completed:0,earned:0,readSequence:0,projectIndex:0,project:null,landmarks:[],consumptionDay:day(G)};
 E.retention.shopSales||=[];E.retention.shopTradeId??=0;E.retention.readTradeId??=0;
 E.retention.unreadOrders??=0;E.retention.unreadEarnings??=0;
 for(const id of Object.keys(Rules.REGULARS))E.retention.customers[id]||={completed:0,lastFilledDay:-1,active:null,subscribed:false};
 return E.retention;
}
function reserve(G,business,amount){const B=G.Eco[business],D=G.Eco.customerdesk;if(B.closed||B.cash<amount)throw Error('The sponsor cannot reserve the payment.');B.cash-=amount;B.capital-=amount;D.cash+=amount;D.capital+=amount;}
function refund(G,business,amount){const B=G.Eco[business],D=G.Eco.customerdesk;if(D.cash<amount)throw Error('Order reserve is inconsistent. Reconnect before continuing.');D.cash-=amount;D.capital-=amount;B.cash+=amount;B.capital+=amount;}
function accept(G,id){
 const C=ensure(G),o=Rules.regularQuote(G,id);if(!o.available)throw Error(o.reason);
 reserve(G,o.business,o.reward);C.customers[id].subscribed=true;C.customers[id].active={id:++C.sequence,business:o.business,item:o.item,quantity:o.quantity,unit:o.unit,reward:o.reward,acceptedAt:G.Sim.time};
 G.Eco.say(o.name+' reserved $'+(o.reward/100).toFixed(2)+'. Stock your Trading Post; payment goes into the shop till.');update(G);
}
function cancel(G,id){const C=ensure(G),c=Object.hasOwn(C.customers,id)?C.customers[id]:null;if(!c||!c.active&&!c.subscribed)throw Error('No agreed order for this customer.');if(c.active)refund(G,c.active.business,c.active.reward);c.active=null;c.subscribed=false;G.Eco.say('Regular ordering paused. Any reserved payment was refunded. No penalty.');update(G);}
function update(G){
 const C=ensure(G),E=G.Eco,today=day(G),elapsed=Math.max(0,today-C.consumptionDay);
 if(elapsed){for(const [business,item]of [['farm','timber'],['market','furniture']]){const B=E[business],used=Math.min(B.inv[item]||0,elapsed);if(used){B.inv[item]-=used;B.note('Used '+used+' '+item+' for local maintenance and furnishing.');}}C.consumptionDay=today;}
 for(const [id,c]of Object.entries(C.customers)){
  if(!c.active&&c.subscribed){const o=Rules.regularQuote(G,id);if(o.available){reserve(G,o.business,o.reward);c.active={id:++C.sequence,business:o.business,item:o.item,quantity:o.quantity,unit:o.unit,reward:o.reward,acceptedAt:G.Sim.time};}}
  const j=c.active;if(!j||E.post.owner!=='player'||E.post.closed)continue;const B=E[j.business];
  if(B.closed||(B.inv[j.item]||0)+j.quantity>(B.cap[j.item]??Infinity)||(E.post.inv[j.item]||0)<j.quantity)continue;
  if(E.customerdesk.cash<j.reward)throw Error('Order reserve is inconsistent.');
  refund(G,j.business,j.reward);
  if(!E.trade(B,E.post,j.item,j.quantity,j.unit)){reserve(G,j.business,j.reward);continue;}
  c.active=null;c.completed++;c.lastFilledDay=today;C.completed++;C.earned+=j.reward;E.rep++;E.relationships[B.name]=(E.relationships[B.name]||0)+1;
  C.history.unshift({...j,customer:id,name:B.name,sequence:++C.sequence,completedAt:G.Sim.time});C.history.length=Math.min(30,C.history.length);E.chk();E.say(B.name+' collected '+j.quantity+' '+j.item+'. Shop earned $'+(j.reward/100).toFixed(2)+'.');
 }
 C.offers=Object.keys(Rules.REGULARS).map(id=>Rules.regularQuote(G,id));
 for(const trade of E.transactions)if(trade.id>C.shopTradeId&&trade.seller===E.post.name){C.shopSales.unshift({...trade});C.unreadOrders++;C.unreadEarnings+=trade.total;}C.shopSales.length=Math.min(30,C.shopSales.length);C.shopTradeId=E.transactionSequence;
 C.report={unread:C.unreadOrders,earned:C.unreadEarnings};
 const spec=PROJECTS[C.projectIndex];C.nextProject=spec?{...spec,budget:Object.entries(spec.needs).reduce((s,[item,q])=>s+q*spec.unit[item],0),sponsor:E.port.name}:null;
}
function stock(G,item,pack=false){
 ensure(G);const E=G.Eco,P=E.player,B=E.post;if(B.owner!=='player')throw Error('Buy the Trading Post first.');if(!Object.hasOwn(Rules.SHOP_ITEMS,item))throw Error('Unknown shop item.');
 const source=pack?B:P,target=pack?P:B,q=pack?Math.min(1,source.inv[item]||0):Math.min(source.inv[item]||0,B.cap[item]-(B.inv[item]||0));
 if(q<1)throw Error(pack?'No stock to pack.':'No goods in your pack or the shelf is full.');source.inv[item]-=q;target.inv[item]=(target.inv[item]||0)+q;B.note((pack?'Packed ':'Stocked ')+q+' '+item);G.Eco.say((pack?'Packed ':'Stocked ')+q+' '+item+'.');update(G);
}
function price(G,item,delta){const E=G.Eco;ensure(G);if(E.post.owner!=='player')throw Error('Buy the Trading Post first.');if(!Object.hasOwn(Rules.SHOP_ITEMS,item)||![-100,100].includes(delta))throw Error('Invalid shelf price adjustment.');const s=Rules.SHOP_ITEMS[item];if(item==='timber')E.setPrice(delta);else E.post.prices[item]=Math.max(s.min,Math.min(s.max,E.post.prices[item]+delta));update(G);}
function startProject(G){const C=ensure(G);if(C.project)throw Error('Finish the current town project first.');const s=PROJECTS[C.projectIndex];if(!s)throw Error('All three town projects are complete.');const budget=Object.entries(s.needs).reduce((n,[item,q])=>n+q*s.unit[item],0);reserve(G,'port',budget);C.project={id:s.id,title:s.title,needs:{...s.needs},unit:{...s.unit},delivered:Object.fromEntries(Object.keys(s.needs).map(i=>[i,0])),budget,remaining:budget,startedAt:G.Sim.time};G.Eco.say(s.title+': the port reserved the entire payment. Deliver supplies at the community market.');update(G);}
function supplyProject(G,item){
 const C=ensure(G),j=C.project,E=G.Eco;if(!j||!Object.hasOwn(j.needs,item))throw Error('This project does not request that item.');
 if(Math.hypot(G.Sim.player.x+4,G.Sim.player.z-14.3)>5)throw Error('Deliver supplies at the community market. Use Mark market.');
 const q=Math.min(E.player.inv[item]||0,j.needs[item]-j.delivered[item]);if(q<1)throw Error('Bring the requested goods in your pack.');const total=q*j.unit[item];
 if(j.remaining<total||E.customerdesk.cash<total)throw Error('Project reserve is inconsistent.');
 if(!E.trade(E.customerdesk,E.player,item,q,j.unit[item]))throw Error('Project delivery rejected.');j.delivered[item]+=q;j.remaining-=total;
 if(Object.keys(j.needs).every(i=>j.delivered[i]===j.needs[i])){
  for(const [i,qty]of Object.entries(j.needs))E.customerdesk.inv[i]-=qty;
  C.landmarks.push({id:j.id,completedAt:G.Sim.time});C.projectIndex++;C.project=null;E.post.cap.timber+=5;E.rep+=3;E.chk();E.say(j.title+' complete! The market changed, your shop gained 5 timber spaces and you earned +3 reputation.');
 }else E.say('Delivered '+q+' '+item+'. Paid $'+(total/100).toFixed(2)+' from the project reserve.');update(G);
}
function readReport(G){update(G);const C=ensure(G);C.readSequence=C.sequence;C.readTradeId=C.shopTradeId;C.unreadOrders=C.unreadEarnings=0;C.report={unread:0,earned:0};}
module.exports={ensure,update,accept,cancel,stock,price,startProject,supplyProject,readReport,PROJECTS};
