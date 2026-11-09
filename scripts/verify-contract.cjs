// Uses real testnet RPC and a funded controller; never fabricates a receipt.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');const {Chain}=require('../server/near.cjs');const {rpc,deployedHash}=require('../server/near-rpc.cjs');
const root=path.join(__dirname,'..');try{process.loadEnvFile(path.join(root,'.env'));}catch(e){if(e.code!=='ENOENT')throw e;}
(async()=>{
 if(process.env.NEAR_NETWORK!=='testnet')throw new Error('Verify on testnet before mainnet release.');
 const chain=new Chain(process.env);if(!chain.ready)throw new Error('Configure funded testnet account/controller credentials and a wallet master key in the server environment.');
 const url=process.env.NEAR_RPC_URL||'https://rpc.testnet.near.org',status=await rpc(url,'status',[]);
 if(status.chain_id!=='testnet')throw new Error('Verification RPC must be testnet.');
 const wasm=fs.readFileSync(path.join(root,'contracts/economy/target/wasm32-unknown-unknown/release/aftermarket_economy.wasm'));
 const hash=crypto.createHash('sha256').update(wasm).digest('hex'),onchainHash=await deployedHash(url,process.env.NEAR_CONTRACT_ID);
 if(hash!==onchainHash)throw new Error('Deployed testnet contract differs from the local WASM build.');
 const wallet=chain.wallet('verification-'+crypto.randomUUID());
 const transactionHash=await chain.settle({world_id:'verification-'+Date.now(),revision:1,changes:[{account_id:wallet,token_id:'timber',delta:'1'}],licence_owner:null});
 if(await chain.view('mt_balance_of',{account_id:wallet,token_id:'timber'})!=='1')throw new Error('Final on-chain balance did not match the settlement.');
 fs.mkdirSync(path.join(root,'.deployments'),{recursive:true});
 fs.writeFileSync(path.join(root,'.deployments/testnet-verification.json'),JSON.stringify({network:'testnet',contractId:process.env.NEAR_CONTRACT_ID,transactionHash,wasmSha256:hash,deployedWasmSha256:onchainHash,verifiedAt:new Date().toISOString()},null,2));
 console.log('Verified exact deployed testnet build and settlement:',transactionHash);
})().catch(e=>{console.error(e.message);process.exitCode=1;});
