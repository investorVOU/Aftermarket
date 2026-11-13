const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{GuestEntries}=require('../server/guest-entry.cjs');
test('concurrent and retried guest tickets return one identity, while distinct visitors stay isolated',async()=>{
 const entries=new GuestEntries(),id=crypto.randomUUID();let calls=0;const issue=async()=>{calls++;await new Promise(r=>setTimeout(r,5));return{access_token:'mock-session-'+calls,wallet:'mock-wallet-'+calls};};
 const [a,b]=await Promise.all([entries.run(id,issue),entries.run(id,issue)]);assert.equal(calls,1);assert.deepEqual(a,b);assert.deepEqual(await entries.run(id,issue),a);const c=await entries.run(crypto.randomUUID(),issue);assert.notEqual(c.wallet,a.wallet);assert.equal(calls,2);
});
test('failed issuance releases a ticket and cache limits fail without issuing another identity',async()=>{
 const entries=new GuestEntries({max:1}),id=crypto.randomUUID();await assert.rejects(entries.run(id,async()=>{throw Error('upstream failure');}),/upstream/);assert.equal(await entries.run(id,async()=>42),42);
 assert.throws(()=>entries.run(crypto.randomUUID(),()=>99),e=>e.status===503);assert.throws(()=>entries.run('guess',()=>99),e=>e.status===400);
});
