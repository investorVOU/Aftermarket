const {test}=require('node:test'),assert=require('node:assert/strict'),HTTP=require('../shared/http-client.js');
test('timeouts and non-JSON wakeup responses have useful errors and do not retry POSTs',async()=>{
 let calls=0;const fetcher=async()=>{calls++;throw Object.assign(new Error('fetch aborted'),{name:'TimeoutError'});};
 await assert.rejects(HTTP.requestJSON('/api/guest',{method:'POST'},1,fetcher),/took too long.*retry/);assert.equal(calls,1);
 await assert.rejects(HTTP.requestJSON('/api/config',{},1,async()=>({status:502,json:async()=>{throw Error('HTML');}})),/starting or unavailable/);
});
test('server validation messages remain visible and successful JSON is unchanged',async()=>{
 await assert.rejects(HTTP.requestJSON('/api/guest',{},1,async()=>({status:429,ok:false,json:async()=>({error:'Demo capacity reached'})})),e=>e.status===429&&e.message==='Demo capacity reached');
 assert.deepEqual(await HTTP.requestJSON('/api/health',{},1,async()=>({ok:true,json:async()=>({ok:true})})),{ok:true});
});
