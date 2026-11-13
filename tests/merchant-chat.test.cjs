const {test,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
process.env.GAME_MODE='development';process.env.HOST='127.0.0.1';process.env.GROQ_AGENTS_ENABLED='true';process.env.GROQ_API_KEY='isolated-mock-key';
const realFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>String(url).startsWith('https://api.groq.com/')?{ok:true,json:async()=>({choices:[{message:{content:'{"message":"I need supplies for the next batch.","action":"restock"}'}}]})}:realFetch(url,options);
const {server,shutdown}=require('../server/index.cjs'),ready=new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));after(async()=>{await shutdown();globalThis.fetch=realFetch;});
test('authenticated merchant chat persists dialogue and server-validated NPC trade without touching player money',async()=>{
 await ready;const base='http://127.0.0.1:'+server.address().port,token='dev-'+crypto.randomUUID();
 const post=async(route,body)=>{const response=await realFetch(base+'/api/'+route,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body)});return{status:response.status,data:await response.json()};};
 assert.equal((await post('merchant-chat',{id:999,question:'Hi'})).status,400);
 assert.equal((await post('merchant-chat',{id:11,question:'How is business?'})).status,200);
 const state=(await post('session',{})).data.state;assert.equal(state.economy.player.cash,5000);assert.equal(state.economy.ow.inv.timber,3);
 assert.ok(state.messages.threads[11].some(m=>m.source==='groq'));assert.equal(state.economy.agentDecisions.length,1);
 assert.equal((await post('merchant-chat',{id:11,question:'Again'})).status,429);
});
