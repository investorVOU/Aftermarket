const {test}=require('node:test'),assert=require('node:assert/strict'),{serial}=require('../server/world-queue.cjs');
test('a slow background save permits simulation but a queued financial action stays exclusive',async()=>{
 let release;const wait=new Promise(r=>release=r),w={queue:Promise.resolve(),busy:false},events=[];
 const save=serial(w,async()=>{events.push('save start');await wait;events.push('save committed');},{background:true});
 const trade=serial(w,async()=>{assert.equal(w.busy,true);assert.equal(w.backgroundSaving,false);events.push('trade');});
 await Promise.resolve();assert.equal(w.busy,true);assert.equal(w.backgroundSaving,true);assert.deepEqual(events,['save start']);
 release();await Promise.all([save,trade]);assert.deepEqual(events,['save start','save committed','trade']);assert.equal(w.busy,false);assert.equal(w.backgroundSaving,false);
});
test('a failed save releases the queue without reporting its following action as committed',async()=>{
 const w={queue:Promise.resolve()};await assert.rejects(serial(w,async()=>{throw Error('DB unavailable');},{background:true}),/DB unavailable/);
 assert.equal(w.busy,false);assert.equal(w.backgroundSaving,false);let ran=false;await serial(w,async()=>{ran=true;});assert.equal(ran,true);
});
