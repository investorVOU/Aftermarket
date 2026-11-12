'use strict';
const path=require('node:path');
try{process.loadEnvFile(path.join(__dirname,'../.env'));}catch(e){if(e.code!=='ENOENT')throw e;}
const {Store}=require('../server/store.cjs'),{Chain}=require('../server/near.cjs'),{rpc}=require('../server/near-rpc.cjs'),{drain}=require('../server/settlement.cjs');
(async()=>{
 if(process.env.NEAR_NETWORK!=='testnet'||process.env.NEAR_SETTLEMENT_ENABLED!=='true')throw Error('Recovery is testnet-only and requires the operator environment.');
 const chain=new Chain(process.env),store=new Store(process.env);
 try{
  if(!chain.ready||!store.ready)throw Error('Operator database/relayer configuration is missing.');
  if((await rpc(process.env.NEAR_RPC_URL||'https://test.rpc.fastnear.com','status',[])).chain_id!=='testnet')throw Error('RPC must be NEAR testnet.');
  const count=await drain({store,chain,maxJobs:250,timeBudget:600000,onConfirmed:({id,hash})=>console.log('Checkpoint '+id+': '+(hash?'https://testnet.nearblocks.io/txns/'+hash:'already applied; original receipt preserved'))});
  console.log('Confirmed '+count+' checkpoints. Pending head: '+Boolean(await store.pending()));
 }finally{await store.close();}
})().catch(e=>{console.error('Testnet recovery failed: '+e.message);process.exitCode=1;});
