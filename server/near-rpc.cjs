'use strict';
const crypto=require('node:crypto');
const {createRouter}=require('./rpc-router.cjs');
const routers=new Map();
async function rpc(url,method,params){
  const key=JSON.stringify([url,process.env.QUICKNODE_RPC_URL]);if(!routers.has(key))routers.set(key,createRouter(process.env,url));return routers.get(key).call(method,params);
}
async function deployedHash(url,account){
  const result=await rpc(url,'query',{request_type:'view_code',finality:'final',account_id:account});
  return crypto.createHash('sha256').update(Buffer.from(result.code_base64,'base64')).digest('hex');
}
module.exports={rpc,deployedHash};
