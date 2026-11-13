'use strict';
const DEFAULT_RPC='https://test.rpc.fastnear.com';
function endpoints(env=process.env,primary){return [...new Set([primary||env.NEAR_RPC_URL||DEFAULT_RPC,env.QUICKNODE_RPC_URL].filter(Boolean))];}
// Keep credential-bearing endpoint URLs and upstream error bodies out of errors,
// public config, logs and SDK provider objects. Retry identical RPC parameters.
class RpcRouter {
 constructor(urls,{fetchImpl=globalThis.fetch,timeoutMs=10000,now=Date.now}={}){
  this.urls=urls;this.fetch=fetchImpl;this.timeoutMs=timeoutMs;this.now=now;this.checked=new Map();this.failedUntil=new Map();this.diagnostics={activeProvider:null,failovers:0};
 }
 async request(url,method,params){
  let response,data;
  try{response=await this.fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:'aftermarket-rpc',method,params}),signal:AbortSignal.timeout(this.timeoutMs)});}
  catch{throw Object.assign(new Error('NEAR RPC transport unavailable.'),{retryable:true});}
  if(!response.ok)throw Object.assign(new Error('NEAR RPC returned HTTP '+response.status+'.'),{retryable:true});
  try{data=await response.json();}catch{throw Object.assign(new Error('NEAR RPC returned an invalid response.'),{retryable:true});}
  if(data.error){
   const text=JSON.stringify(data.error);
   if(/InvalidNonce|Invalid nonce/i.test(text))throw Object.assign(new Error('Invalid nonce returned by NEAR.'),{type:'InvalidNonce'});
   const retryable=/TIMEOUT|UNKNOWN_TRANSACTION|UNAVAILABLE|NOT_SYNCED|TOO_MANY_REQUESTS/i.test(text)||[-429,-32603].includes(data.error.code);
   throw Object.assign(new Error('NEAR RPC rejected '+method+'.'),{retryable});
  }
  if(!Object.hasOwn(data,'result'))throw Object.assign(new Error('NEAR RPC response has no result.'),{retryable:true});
  if(data.result&&typeof data.result==='object'&&data.result.error)throw new Error('NEAR contract query failed.');
  return data.result;
 }
 async call(method,params){
  const ready=this.urls.filter(u=>(this.failedUntil.get(u)||0)<=this.now());const candidates=ready.length?ready:this.urls;
  for(const url of candidates){
   try{
    let status;
    if((this.checked.get(url)||0)<=this.now()){
     status=await this.request(url,'status',[]);
     if(status?.chain_id!=='testnet')throw Object.assign(new Error('RPC network mismatch: testnet required.'),{networkMismatch:true});
     this.checked.set(url,this.now()+60000);
    }
    const result=method==='status'&&status?status:await this.request(url,method,params);
    if(method==='status'&&result?.chain_id!=='testnet')throw Object.assign(new Error('RPC network mismatch: testnet required.'),{networkMismatch:true});
    this.failedUntil.delete(url);this.diagnostics.activeProvider=this.urls.indexOf(url)===0?'primary':'fallback';return result;
   }catch(error){
    if(!error.retryable&&!error.networkMismatch)throw error;
    this.failedUntil.set(url,this.now()+30000);this.checked.delete(url);this.diagnostics.failovers++;
   }
  }
  throw new Error('NEAR testnet RPC providers unavailable. Check server RPC configuration.');
 }
}
function createRouter(env=process.env,primary,options){return new RpcRouter(endpoints(env,primary),options);}
async function createProvider(env=process.env){
 const {JsonRpcProvider}=await import('near-api-js'),router=createRouter(env);
 // All SDK calls use the bounded, network-checked transport below. The SDK
 // object's connection metadata never contains the private endpoint token.
 const provider=new JsonRpcProvider({url:'https://rpc.invalid'},{retries:1});
 provider.sendJsonRpc=(method,params)=>router.call(method,params);
 return {provider,router};
}
module.exports={RpcRouter,endpoints,createRouter,createProvider};
