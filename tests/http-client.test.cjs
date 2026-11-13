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
test('startup retries transient reads automatically but stops on a configuration error',async()=>{
 let calls=0;assert.deepEqual(await HTTP.retryRead('/api/config',{fetcher:async()=>{calls++;return calls<3?{ok:false,status:503,json:async()=>({error:'Starting'})}:{ok:true,json:async()=>({configured:true})};},delay:async()=>{}}),{configured:true});assert.equal(calls,3);
 calls=0;await assert.rejects(HTTP.retryRead('/api/config',{fetcher:async()=>{calls++;return{ok:false,status:403,json:async()=>({error:'Forbidden'})};},delay:async()=>{}}),/Forbidden/);assert.equal(calls,1);
});
test('guest network retry sends exactly the same request ticket',async()=>{
 const bodies=[];const response=await HTTP.guestEntry('same-request-ticket',async(_url,options)=>{bodies.push(options.body);if(bodies.length===1)throw Object.assign(Error('aborted'),{name:'TimeoutError'});return{ok:true,json:async()=>({access_token:'mock-session'})};},async()=>{});
 assert.equal(response.access_token,'mock-session');assert.equal(bodies.length,2);assert.equal(bodies[0],bodies[1]);assert.equal(JSON.parse(bodies[1]).requestId,'same-request-ticket');
});
