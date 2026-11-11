// Public, read-only NEP-245 inspection. No signer or wallet extension needed.
const path=require('node:path'),fs=require('node:fs'),{rpc}=require('../server/near-rpc.cjs');
try{process.loadEnvFile(path.join(__dirname,'../.env'));}catch(e){if(e.code!=='ENOENT')throw e;}
(async()=>{
 if((process.env.NEAR_NETWORK||'testnet')!=='testnet')throw Error('This inspector is testnet-only.');
 const proof=JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/TESTNET_EVIDENCE.json'),'utf8'));
 const account=process.argv[2];if(!account||!/^([a-f0-9]{64}|[a-z0-9._-]+\.testnet)$/.test(account))throw Error('Usage: npm run near:items -- <managed wallet ID or .testnet account>');
 const url=process.env.NEAR_RPC_URL||'https://test.rpc.fastnear.com';if((await rpc(url,'status',[])).chain_id!=='testnet')throw Error('RPC is not testnet.');
 const token_ids=['cash','timber','furniture','ore','gold','maize','cassava','milk'];
 const gamePath=path.join(__dirname,'../docs/LIVE_GAME_EVIDENCE.json');if(fs.existsSync(gamePath)){const game=JSON.parse(fs.readFileSync(gamePath,'utf8'));if(game.wallet===account&&game.businessLicence)token_ids.push(game.businessLicence);}
 const result=await rpc(url,'query',{request_type:'call_function',finality:'final',account_id:proof.contractId,method_name:'mt_batch_balance_of',args_base64:Buffer.from(JSON.stringify({account_id:account,token_ids})).toString('base64')});
 const values=JSON.parse(Buffer.from(result.result).toString());
 console.log(JSON.stringify({network:'testnet',contract:proof.contractId,owner:account,blockHeight:result.block_height,balances:Object.fromEntries(token_ids.map((id,i)=>[id,values[i]])),units:'cash: game cents, non-redeemable; gold: milligrams; other items: whole units'},null,2));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
