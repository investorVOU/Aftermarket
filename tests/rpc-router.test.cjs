const {test}=require('node:test'),assert=require('node:assert/strict');
const {RpcRouter,createProvider}=require('../server/rpc-router.cjs');
const primary='https://primary.example.invalid',fallback='https://fallback.example.invalid/private-token';
const ok=result=>({ok:true,status:200,json:async()=>({jsonrpc:'2.0',result})});
test('read RPC fails over, verifies testnet and avoids retrying an unhealthy primary immediately',async()=>{
 const calls=[];let now=100;
 const router=new RpcRouter([primary,fallback],{now:()=>now,fetchImpl:async(url,init)=>{const {method}=JSON.parse(init.body);calls.push({url,method});if(url===primary)throw Error('Secret URL '+url);return ok(method==='status'?{chain_id:'testnet'}:{header:{height:123}});}});
 assert.equal((await router.call('block',{finality:'final'})).header.height,123);assert.equal(router.diagnostics.activeProvider,'fallback');
 await router.call('block',{finality:'final'});assert.equal(calls.filter(c=>c.url===primary).length,1);assert.equal(calls.filter(c=>c.url===fallback&&c.method==='status').length,1);
 now+=31000;await router.call('block',{});assert.equal(calls.filter(c=>c.url===primary).length,2);
});
test('a mismatched provider never receives the query or signed transaction',async()=>{
 const calls=[];const router=new RpcRouter([primary,fallback],{fetchImpl:async(url,init)=>{const {method}=JSON.parse(init.body);calls.push({url,method});return ok(method==='status'?{chain_id:url===primary?'mainnet':'testnet'}:{ok:true});}});
 await router.call('send_tx',{signed_tx_base64:'fake-signed-test-payload'});assert.deepEqual(calls.filter(c=>c.url===primary).map(c=>c.method),['status']);
});
test('transport retry submits the exact same signed bytes, and errors do not reveal endpoint credentials',async()=>{
 const submitted=[];const router=new RpcRouter([primary,fallback],{fetchImpl:async(url,init)=>{const body=JSON.parse(init.body);if(body.method==='status')return ok({chain_id:'testnet'});submitted.push(body.params);if(url===primary)throw Error('private-token QN_example');return ok({status:{SuccessValue:'dHJ1ZQ=='}});}});
 const params={signed_tx_base64:'fake-signed-test-payload',wait_until:'FINAL'};await router.call('send_tx',params);assert.deepEqual(submitted,[params,params]);
 const broken=new RpcRouter([fallback],{fetchImpl:async()=>{throw Error(fallback);}});await assert.rejects(broken.call('query',{}),e=>!e.message.includes('private-token')&&!e.message.includes(fallback));
});
test('deterministic nonce errors stay typed, do not switch providers and sanitize upstream bodies',async()=>{
 const calls=[];const router=new RpcRouter([primary,fallback],{fetchImpl:async(url,init)=>{const {method}=JSON.parse(init.body);calls.push(url);if(method==='status')return ok({chain_id:'testnet'});return{ok:true,json:async()=>({error:{code:-32000,message:'InvalidNonce private-token'}})};}});
 await assert.rejects(router.call('send_tx',{}),e=>e.type==='InvalidNonce'&&!e.message.includes('private-token'));assert.ok(calls.every(u=>u===primary));
});
test('the installed NEAR SDK uses the safe transport without embedding the private URL in provider metadata',async()=>{
 const {provider}=await createProvider({NEAR_RPC_URL:primary,QUICKNODE_RPC_URL:fallback});assert.equal(provider.connection.url,'https://rpc.invalid');
});
