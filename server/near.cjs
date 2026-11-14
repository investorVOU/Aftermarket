'use strict';
const crypto=require('node:crypto');
const ITEMS=['cash','timber','furniture','ore','gold','maize','cassava','milk'];
const ACTORS=['player','ts','ow','post','crew','port','mine','farm','market','lender','jobdesk','customerdesk'];
class Chain {
  constructor(env){this.env=env;this.network=env.NEAR_NETWORK||'testnet';if(this.network!=='testnet')throw new Error('The hackathon settlement service is testnet-only.');this.ready=Boolean(env.NEAR_CONTRACT_ID&&env.NEAR_SIGNER_ID&&env.NEAR_SIGNER_PRIVATE_KEY&&/^[a-f0-9]{64}$/i.test(env.NEAR_WALLET_MASTER_KEY||''));
    if([env.NEAR_CONTRACT_ID,env.NEAR_SIGNER_ID].some(v=>v&&!v.endsWith('.testnet')))throw new Error('Use named .testnet contract and controller accounts.');}
  wallet(user,actor='player'){
    if(!this.ready)throw new Error('Testnet credentials are not configured.');
    const seed=crypto.createHmac('sha256',Buffer.from(this.env.NEAR_WALLET_MASTER_KEY,'hex')).update(`aftermarket:v1:${user}:${actor}`).digest();
    const key=crypto.createPrivateKey({key:Buffer.concat([Buffer.from('302e020100300506032b657004220420','hex'),seed]),format:'der',type:'pkcs8'});
    return crypto.createPublicKey(key).export({format:'der',type:'spki'}).subarray(-32).toString('hex');
  }
  balances(user,G){const b={};for(const actor of ACTORS){const B=G.Eco[actor],id=this.wallet(user,actor);for(const item of ITEMS)b[`${id}/${item}`]=String(item==='cash'?B?.cash||0:B?.inv[item]||0);}return b;}
  payload(user,G,prior={}){const balances=this.balances(user,G),changes=[];for(const [key,value] of Object.entries(balances)){const delta=BigInt(value)-BigInt(prior[key]||0);if(delta!==0n){const [account_id,token_id]=key.split('/');changes.push({account_id,token_id,delta:String(delta)});}}
    const licence=G.Eco.post.owner&&!prior.$licence; if(G.Eco.post.owner)balances.$licence='1';
    return {balances,payload:changes.length||licence?{world_id:user,changes,licence_owner:licence?this.wallet(user):null}:null};}
  async account(){if(!this.ready)throw new Error('NEAR credentials missing');if(!this.client){const {Account}=await import('near-api-js');const {provider,router}=await require('./rpc-router.cjs').createProvider(this.env);this.rpcRouter=router;this.client=new Account(this.env.NEAR_SIGNER_ID,provider,this.env.NEAR_SIGNER_PRIVATE_KEY);}return this.client;}
  async settle(payload){const account=await this.account();const tx=await account.callFunctionRaw({contractId:this.env.NEAR_CONTRACT_ID,methodName:'settle_world',args:payload,gas:150000000000000n,deposit:BigInt(this.env.NEAR_STORAGE_DEPOSIT||'200000000000000000000000'),waitUntil:'FINAL'});if(typeof tx.status?.SuccessValue!=='string')throw new Error('Settlement did not return a successful contract result.');const applied=JSON.parse(Buffer.from(tx.status.SuccessValue,'base64').toString());if(applied!==true&&applied!==false)throw new Error('Unexpected settlement result.');return applied?tx.transaction.hash:null;}
  async view(method,args){this.viewRouter||=require('./rpc-router.cjs').createRouter(this.env);const result=await this.viewRouter.call('query',{request_type:'call_function',finality:'final',account_id:this.env.NEAR_CONTRACT_ID,method_name:method,args_base64:Buffer.from(JSON.stringify(args)).toString('base64')});return JSON.parse(Buffer.from(result.result).toString());}
  publicConfig(){return {network:this.network,configured:this.ready,contractId:this.env.NEAR_CONTRACT_ID||null,signerId:this.env.NEAR_SIGNER_ID||null,settlement:true,rpcFallbackConfigured:Boolean(this.env.QUICKNODE_RPC_URL)};}
}
module.exports={Chain};
