const {test}=require('node:test'),assert=require('node:assert/strict'),{drain}=require('../server/settlement.cjs');
test('outbox drains sequentially and preserves replay result without inventing a receipt',async()=>{
 const jobs=[{id:1,payload:'first'},{id:2,payload:'second'}],saved=[],seen=[];
 const store={pending:async()=>jobs[0],settlement:async(id,value)=>{saved.push({id,...value});jobs.shift();}};
 const chain={settle:async p=>{seen.push(p);return p==='first'?'real-hash':null;}};
 assert.equal(await drain({store,chain}),2);assert.deepEqual(seen,['first','second']);assert.equal(saved[0].transaction_hash,'real-hash');assert.equal(saved[1].transaction_hash,null);
});
test('outbox never bypasses a failed checkpoint and bounded runs leave remaining work pending',async()=>{
 let reads=0;const writes=[],store={pending:async()=>{reads++;return{id:3,payload:{}};},settlement:async(id,value)=>writes.push({id,...value})};
 await assert.rejects(drain({store,chain:{settle:async()=>{throw Error('RPC failed');}}}),/RPC failed/);
 assert.equal(reads,1);assert.equal(writes[0].status,undefined);assert.match(writes[0].error,/pending/);
 assert.equal(await drain({store,chain:{settle:async()=>null},maxJobs:2}),2);
});
test('stale nonce retries the same checkpoint with a fresh signer before confirming',async()=>{
 let attempts=0,confirmed=0;const chain={client:{cached:true},settle:async()=>{if(!attempts++)throw Error('Invalid nonce');assert.equal(chain.client,null);return 'confirmed-receipt';}};
 const store={pending:async()=>confirmed?null:{id:9,payload:{}},settlement:async(id,value)=>{assert.equal(id,9);assert.equal(value.status,'confirmed');assert.equal(value.transaction_hash,'confirmed-receipt');confirmed++;}};
 assert.equal(await drain({store,chain}),1);assert.equal(attempts,2);assert.equal(confirmed,1);
});
