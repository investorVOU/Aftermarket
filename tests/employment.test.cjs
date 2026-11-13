const {test}=require('node:test'),assert=require('node:assert/strict'),{world,action}=require('../server/world.cjs'),Jobs=require('../server/employment.cjs'),State=require('../shared/state.js'),Simulation=require('../server/simulation.cjs');
const cash=g=>['player','ow','port','market','jobdesk'].reduce((n,id)=>n+g.Eco[id].cash,0);
test('job reserves employer cash, requires real delivery and pays once with a real economic trade',()=>{
 const g=world(),E=g.Eco,total=cash(g),o=Jobs.offer(g,'workshop'),before=E.ow.cash;
 action(g,'acceptJob',{offer:'workshop'});assert.equal(E.ow.cash,before-o.reward);assert.equal(E.jobdesk.cash,o.reward);assert.equal(cash(g),total);
 assert.throws(()=>action(g,'completeJob'),/Deliver at/);g.Sim.player.x=o.x;g.Sim.player.z=o.z;assert.throws(()=>action(g,'completeJob'),/Bring/);
 E.player.inv.timber=3;const stock=E.ow.inv.timber;action(g,'completeJob');assert.equal(E.player.cash,5000+o.reward);assert.equal(E.player.inv.timber,0);assert.equal(E.ow.inv.timber,stock+3);assert.equal(E.jobdesk.cash,0);assert.equal(cash(g),total);
 assert.equal(E.transactions.at(-1).seller,'You');assert.equal(E.rep,1);assert.equal(E.employment.completed,1);assert.equal(E.player.cash,E.player.start+E.player.rev-E.player.exp+E.player.capital);
 assert.throws(()=>action(g,'completeJob'),/No active/);assert.throws(()=>action(g,'acceptJob',{offer:'workshop'}),/Completed today/);
});
test('demand, cash and closure control vacancies; cancellation and full shops cannot steal goods or wages',()=>{
 const g=world(),E=g.Eco;E.ow.inv.timber=9;assert.throws(()=>action(g,'acceptJob',{offer:'workshop'}),/Stock target/);E.ow.inv.timber=0;E.ow.cash=0;assert.throws(()=>action(g,'acceptJob',{offer:'workshop'}),/reserve/);E.ow.cash=10000;E.ow.closed=true;assert.throws(()=>action(g,'acceptJob',{offer:'workshop'}),/closed/);E.ow.closed=false;
 const total=cash(g);action(g,'acceptJob',{offer:'workshop'});const j=E.employment.active;assert.throws(()=>action(g,'acceptJob',{offer:'furniture'}),/current job/);
 g.Sim.player.x=j.x;g.Sim.player.z=j.z;E.player.inv.timber=3;E.ow.inv.timber=E.ow.cap.timber;assert.throws(()=>action(g,'completeJob'),/storage/);assert.equal(E.player.inv.timber,3);assert.equal(E.jobdesk.cash,j.reward);
 action(g,'cancelJob');assert.equal(E.jobdesk.cash,0);assert.equal(cash(g),total);assert.equal(E.player.cash,5000);assert.equal(E.player.inv.timber,3);
});
test('escrow and expiry survive restore and offline simulation; cancellation cannot refund twice',async()=>{
 const g=world();action(g,'acceptJob',{offer:'furniture'});const j=g.Eco.employment.active,restored=world(State.capture(g,true));assert.deepEqual(restored.Eco.employment.active,j);assert.equal(restored.Eco.jobdesk.cash,j.reward);
 // Isolate expiry from other NPC commerce when checking exact reserve release.
 restored.Sim.time=j.expiresAt;const before=restored.Eco.market.cash;Jobs.update(restored);assert.equal(restored.Eco.market.cash,before+j.reward);assert.equal(restored.Eco.employment.active,null);Jobs.update(restored);assert.equal(restored.Eco.market.cash,before+j.reward);assert.throws(()=>action(restored,'cancelJob'),/No active/);
 const offline=world(State.capture(g,true));await Simulation.catchUp(offline,j.expiresAt+5);assert.equal(offline.Eco.jobdesk.cash,0);assert.equal(offline.Eco.employment.active,null);
});
test('all delivery locations are walkable and checkpoint fits the deployed contract limit',()=>{
 const g=world(),{Chain}=require('../server/near.cjs');for(const id of Object.keys(Jobs.SPECS)){const o=Jobs.offer(g,id);assert.ok(g.Sim.Col.free(o.x,o.z,.4,'player'),id+' delivery is blocked');assert.ok(g.Sim.PN.route(g.Sim.player.x,g.Sim.player.z,o.x,o.z),id+' has no route');}
 const chain=new Chain({NEAR_NETWORK:'testnet',NEAR_CONTRACT_ID:'items.testnet',NEAR_SIGNER_ID:'server.testnet',NEAR_SIGNER_PRIVATE_KEY:'test-only',NEAR_WALLET_MASTER_KEY:'a'.repeat(64)});assert.ok(chain.payload('test-world',g,{}).payload.changes.length<=100);
});
