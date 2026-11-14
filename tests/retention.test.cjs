const {test}=require('node:test'),assert=require('node:assert/strict'),{world,action}=require('../server/world.cjs'),Retention=require('../server/retention.cjs'),Rules=require('../shared/merchant-rules.js'),State=require('../shared/state.js'),Simulation=require('../server/simulation.cjs');
const cash=g=>['player','ts','ow','post','crew','port','mine','farm','market','lender','jobdesk','customerdesk'].reduce((s,id)=>s+(g.Eco[id]?.cash||0),0);
const own=g=>{g.Eco.post.owner='player';g.Eco.post.price=1000;g.Eco.ow.inv.timber=0;return g;};
test('standing orders reserve merchant funds, wait for stock and pay the shop once',()=>{
 const g=own(world()),E=g.Eco,total=cash(g),player=E.player.cash,offer=Rules.regularQuote(g,'workshop');action(g,'acceptCustomer',{customer:'workshop'});
 assert.equal(E.customerdesk.cash,offer.reward);assert.equal(E.ow.cash,80000-offer.reward);assert.equal(cash(g),total);assert.throws(()=>action(g,'acceptCustomer',{customer:'workshop'}),/waiting for stock/);
 E.player.inv.timber=offer.quantity;action(g,'stockShop',{item:'timber'});assert.equal(E.post.cash,offer.reward);assert.equal(E.player.cash,player);assert.equal(E.customerdesk.cash,0);assert.equal(E.post.inv.timber,0);assert.equal(cash(g),total);
 assert.equal(E.retention.completed,1);assert.equal(E.retention.report.unread,1);Retention.update(g);assert.equal(E.retention.completed,1);assert.throws(()=>action(g,'acceptCustomer',{customer:'workshop'}),/Already served/);
 action(g,'readShopReport');assert.equal(E.retention.report.unread,0);assert.equal(E.retention.report.earned,0);assert.equal(E.transactions.at(-1).seller,E.post.name);
});
test('ownership, quantity, price, cash, closure and storage checks reject invalid offers',()=>{
 const g=world(),E=g.Eco;assert.throws(()=>action(g,'acceptCustomer',{customer:'workshop'}),/Buy the Trading Post/);own(g);
 assert.throws(()=>action(g,'stockShop',{item:'cash'}),/Unknown/);assert.throws(()=>action(g,'shopPrice',{item:'timber',delta:999999}),/Invalid/);
 E.post.price=2400;E.ts.price=1000;assert.equal(Rules.regularQuote(g,'workshop').available,false);E.post.price=1000;E.ow.cash=0;assert.throws(()=>Retention.accept(g,'workshop'),/cannot reserve/);
 E.ow.cash=80000;E.ow.closed=true;assert.throws(()=>Retention.accept(g,'workshop'),/closed/);E.ow.closed=false;E.ow.cap.timber=1;assert.throws(()=>Retention.accept(g,'workshop'),/storage/);
});
test('orders have no absence fines, can be cancelled once, and preserve exact reserves after restore',()=>{
 const g=own(world());Retention.accept(g,'workshop');const j=g.Eco.retention.customers.workshop.active,restored=world(State.capture(g,true));assert.deepEqual(restored.Eco.retention.customers.workshop.active,j);const original=restored.Eco.ow.cash;
 restored.Sim.time=420*30;Retention.update(restored);assert.deepEqual(restored.Eco.retention.customers.workshop.active,j);assert.equal(restored.Eco.customerdesk.cash,j.reward);Retention.cancel(restored,'workshop');assert.equal(restored.Eco.ow.cash,original+j.reward);assert.equal(restored.Eco.customerdesk.cash,0);assert.throws(()=>Retention.cancel(restored,'workshop'),/No agreed/);
});
test('relationships unlock larger orders and better budgets through paid purchases',()=>{
 const g=own(world()),E=g.Eco;for(let d=0;d<3;d++){g.Sim.time=420*d;E.ow.inv.timber=0;Retention.accept(g,'workshop');E.player.inv.timber=4;Retention.stock(g,'timber');}
 g.Sim.time+=420;E.ow.inv.timber=0;const offer=Rules.regularQuote(g,'workshop');assert.equal(offer.rank,'Trusted regular');assert.equal(offer.quantity,3);assert.ok(offer.reason.includes('3%'));assert.equal(E.relationships[E.ow.name],3);
});
test('offline advancement fulfils funded orders using the same engine and receipts survive saving',async()=>{
 const g=own(world());Retention.accept(g,'workshop');g.Eco.post.inv.timber=2;const restored=world(State.capture(g,true));assert.equal(restored.Eco.retention.completed,1);const paid=restored.Eco.post.cash;
 await Simulation.catchUp(restored,10);assert.ok(restored.Eco.post.cash>=paid);assert.equal(restored.Eco.retention.completed,1);assert.equal(world(State.capture(restored,true)).Eco.retention.completed,1);
});
test('regulars return autonomously on later island days; pausing stops new reservations',async()=>{
 const g=own(world());g.Eco.ow.closed=true;g.Eco.post.inv.timber=10;Retention.accept(g,'farm');assert.equal(g.Eco.retention.customers.farm.completed,1);
 await Simulation.catchUp(g,2*420+5);assert.equal(g.Eco.retention.customers.farm.completed,3);assert.ok(g.Eco.retention.earned>0);assert.equal(g.Eco.retention.customers.farm.active,null);
 Retention.cancel(g,'farm');const count=g.Eco.retention.completed;g.Sim.time+=420;Retention.update(g);assert.equal(g.Eco.retention.completed,count);assert.equal(g.Eco.retention.customers.farm.active,null);assert.equal(g.Eco.retention.customers.farm.subscribed,false);
});
test('project payments are funded, range checked, incremental and cannot be duplicated',()=>{
 const g=world(),E=g.Eco,total=cash(g);Retention.startProject(g);const j=E.retention.project;assert.equal(E.customerdesk.cash,j.budget);assert.equal(cash(g),total);E.player.inv.timber=3;assert.throws(()=>Retention.supplyProject(g,'timber'),/Deliver supplies/);
 g.Sim.player.x=-4;g.Sim.player.z=14.3;Retention.supplyProject(g,'timber');assert.equal(E.player.inv.timber,0);assert.equal(j.delivered.timber,3);assert.equal(E.customerdesk.inv.timber,3);assert.throws(()=>Retention.supplyProject(g,'timber'),/Bring/);
 const restored=world(State.capture(g,true));assert.equal(typeof restored.Eco.customerdesk.note,'function');restored.Eco.player.inv.furniture=1;restored.Eco.player.inv.maize=2;Retention.supplyProject(restored,'furniture');Retention.supplyProject(restored,'maize');
 assert.equal(restored.Eco.retention.project,null);assert.equal(restored.Eco.retention.landmarks.length,1);assert.equal(restored.Eco.customerdesk.cash,0);assert.equal(restored.Eco.customerdesk.inv.timber,0);assert.equal(restored.Eco.customerdesk.inv.furniture,0);assert.equal(restored.Eco.post.cap.timber,15);assert.equal(cash(restored),total);assert.equal(restored.Eco.rep,3);
 assert.throws(()=>Retention.supplyProject(restored,'maize'),/does not request/);assert.equal(restored.Eco.rep,3);
});
test('project and customer funds cannot be spent twice or consume each other reserves',()=>{
 const g=own(world());Retention.startProject(g);Retention.accept(g,'workshop');const project=g.Eco.retention.project,budget=project.budget;g.Eco.player.inv.timber=2;Retention.stock(g,'timber');assert.equal(g.Eco.customerdesk.cash,budget);
 assert.throws(()=>Retention.startProject(g),/Finish/);Retention.cancel(g,'workshop');assert.equal(project.remaining,budget);assert.equal(g.Eco.customerdesk.cash,budget);
});
test('calendar announces real price changes and demand; preview and restored saves agree',()=>{
 const g=world();g.Eco.ow.inv.furniture=8;Rules.update(g);const normal=g.Eco.merchants.furniture.price;g.Sim.time=2*420;Rules.update(g);assert.equal(g.Eco.calendar.phase,1);assert.ok(g.Eco.merchants.furniture.price>normal);assert.ok(g.Eco.merchants.furniture.reason.includes('festival'));assert.equal(Rules.regularQuote(g,'market').ceiling,6000);
 g.Sim.time=4*420;Rules.update(g);assert.equal(g.Eco.calendar.phase,2);assert.equal(g.Eco.merchants.maize.base,400);const restored=world(State.capture(g,true));assert.equal(restored.Eco.calendar.phase,2);assert.equal(restored.Eco.merchants.maize.base,400);
});
test('shop report includes ordinary NPC purchases and retains totals beyond its receipt list',()=>{
 const g=own(world()),E=g.Eco;E.post.inv.timber=40;E.post.cap.timber=40;E.ow.cap.timber=100;for(let i=0;i<40;i++){assert.equal(E.trade(E.ow,E.post,'timber',1,1000),true);Retention.update(g);}assert.equal(E.retention.shopSales.length,30);assert.equal(E.retention.report.unread,40);assert.equal(E.retention.report.earned,40000);assert.equal(E.retention.completed,0);
 const saved=world(State.capture(g,true));assert.equal(saved.Eco.retention.report.unread,40);Retention.readReport(saved);assert.equal(saved.Eco.retention.report.earned,0);
});
test('all three projects complete once; insufficient port cash requires a legitimate investment',()=>{
 const g=world();g.Sim.player.x=-4;g.Sim.player.z=14.3;for(let i=0;i<3;i++){const spec=Retention.PROJECTS[i];if(i===2){assert.throws(()=>Retention.startProject(g),/cannot reserve/);action(g,'invest',{business:'port'});}Retention.startProject(g);for(const [item,q]of Object.entries(spec.needs)){g.Eco.player.inv[item]=q;Retention.supplyProject(g,item);}}
 assert.equal(g.Eco.retention.landmarks.length,3);assert.equal(g.Eco.retention.nextProject,null);assert.equal(g.Eco.post.cap.timber,25);assert.equal(g.Eco.rep,9);assert.throws(()=>Retention.startProject(g),/complete/);assert.equal(g.Eco.customerdesk.cash,0);
});
test('new reserve inventory and all maximum balances fit the deployed 100-change checkpoint',()=>{
 const g=world(),{Chain}=require('../server/near.cjs'),chain=new Chain({NEAR_NETWORK:'testnet',NEAR_CONTRACT_ID:'items.testnet',NEAR_SIGNER_ID:'server.testnet',NEAR_SIGNER_PRIVATE_KEY:'test-only',NEAR_WALLET_MASTER_KEY:'a'.repeat(64)});
 Retention.startProject(g);const before=chain.balances('island',g);assert.ok(Object.keys(before).some(k=>k.startsWith(chain.wallet('island','customerdesk')+'/')));
 for(const B of Object.values(g.Eco))if(B&&typeof B==='object'&&Object.hasOwn(B,'cash')){B.cash=1;B.inv=Object.fromEntries(['timber','furniture','ore','gold','maize','cassava','milk'].map(i=>[i,1]));}g.Eco.post.owner='player';assert.ok(chain.payload('island',g,{}).payload.changes.length<=100);
});
