const {test}=require('node:test'),assert=require('node:assert/strict');
const {world,action}=require('../server/world.cjs'),Credit=require('../server/credit.cjs'),State=require('../shared/state.js'),Simulation=require('../server/simulation.cjs');
test('loan and repayments conserve cash, disclose fixed fees and maintain player accounting',()=>{
 const g=world(),e=g.Eco,total=e.player.cash+e.lender.cash;
 action(g,'borrow',{amount:2000});assert.equal(e.player.cash,7000);assert.equal(Credit.due(e.credit.loan),2400);assert.equal(e.player.cash+e.lender.cash,total);
 const old=JSON.stringify(e);assert.throws(()=>action(g,'borrow',{amount:5000}),/existing debt/);assert.equal(JSON.stringify(e),old);
 action(g,'repayLoan',{amount:1000});assert.equal(Credit.due(e.credit.loan),1400);action(g,'repayLoan',{amount:'full'});
 assert.equal(Credit.due(e.credit.loan),0);assert.equal(e.player.cash,4600);assert.equal(e.lender.rev,400);assert.equal(e.player.cash+e.lender.cash,total);
 assert.equal(e.player.cash,e.player.start+e.player.rev-e.player.exp+e.player.capital);assert.equal(e.credit.history.length,1);
});
test('invalid loan quantities, an empty reserve and insufficient repayment funds do not mutate money',()=>{
 const g=world();for(const amount of [-1,0,1.5,NaN,Infinity,2001,'2000'])assert.throws(()=>action(g,'borrow',{amount}),/Choose/);
 g.Eco.lender.cash=100;assert.throws(()=>action(g,'borrow',{amount:2000}),/out of lending cash/);g.Eco.lender.cash=20000;
 action(g,'borrow',{amount:5000});g.Eco.player.cash=0;assert.throws(()=>action(g,'repayLoan',{amount:'full'}),/Not enough/);assert.equal(Credit.due(g.Eco.credit.loan),6000);assert.throws(()=>action(g,'repayLoan',{amount:-1}),/Choose/);
});
test('offline and week simulation charge a single late fee; restored debt cannot be reset',async()=>{
 const g=world();action(g,'borrow',{amount:2000});const dueAt=g.Eco.credit.loan.dueAt;
 const restored=world(State.capture(g,true));await Simulation.catchUp(restored,dueAt+10);assert.equal(Credit.due(restored.Eco.credit.loan),2900);
 Simulation.advance(restored,100);Credit.tick(restored);assert.equal(Credit.due(restored.Eco.credit.loan),2900);
 const again=world(State.capture(restored,true));assert.equal(again.Eco.lender.cash,18000);action(again,'repayLoan',{amount:'full'});assert.equal(again.Eco.player.cash,4100);
});
