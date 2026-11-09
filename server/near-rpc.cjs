'use strict';
const crypto=require('node:crypto');
async function rpc(url,method,params){
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:'aftermarket-release',method,params}),signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error(`NEAR RPC returned HTTP ${response.status}.`);
  const data=await response.json();if(data.error||!data.result)throw new Error(`NEAR RPC ${method} failed. Check the selected network and account configuration.`);return data.result;
}
async function deployedHash(url,account){
  const result=await rpc(url,'query',{request_type:'view_code',finality:'final',account_id:account});
  return crypto.createHash('sha256').update(Buffer.from(result.code_base64,'base64')).digest('hex');
}
module.exports={rpc,deployedHash};
