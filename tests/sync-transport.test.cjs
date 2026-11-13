const {test}=require('node:test'),assert=require('node:assert/strict');
const {StateTransport,SnapshotOrder}=require('../shared/sync-transport.js');
test('sync, actions and reconnect requests never overlap; queued movement is sampled at send time',async()=>{
 let active=0,peak=0,direction=1;const sent=[];
 const q=new StateTransport(async(route,body)=>{active++;peak=Math.max(peak,active);sent.push({route,body});await new Promise(r=>setTimeout(r,10));active--;return{state:{time:1},revision:1};});
 const a=q.request('action',{}),b=q.request('sync',()=>({x:direction,z:0}));direction=-1;
 const results=await Promise.all([a,b,q.request('session',{})]);assert.equal(peak,1);assert.equal(q.maxActive,1);assert.equal(sent[1].body.x,-1);assert.deepEqual(results.map(r=>r.requestSequence),[1,2,3]);
});
test('failed request releases the queue and stale snapshots cannot overwrite newer state',async()=>{
 let count=0;const q=new StateTransport(async()=>{if(!count++)throw Error('offline');return{state:{time:3},revision:2};});
 await assert.rejects(q.request('sync',{}),/offline/);const good=await q.request('session',{});assert.equal(good.requestSequence,2);
 const order=new SnapshotOrder();assert.equal(order.accept(good),true);
 for(const packet of [{state:{time:4},revision:2,requestSequence:1},{state:{time:2},revision:2,requestSequence:3},{state:{time:4},revision:1,requestSequence:3}])assert.equal(order.accept(packet),false);
 assert.equal(order.accept({state:{time:4},revision:2,requestSequence:3}),true);
});
