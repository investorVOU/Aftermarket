// Read-only diagnostics. No signing, account creation or minting.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {rpc,deployedHash}=require('../server/near-rpc.cjs');
const root=path.join(__dirname,'..');try{process.loadEnvFile(path.join(root,'.env'));}catch(e){if(e.code!=='ENOENT')throw e;}
(async()=>{
 const env=process.env,network=env.NEAR_NETWORK||'testnet',checks=[];
 const check=(name,ok,detail)=>checks.push({name,ok,detail});
 check('network',['mainnet','testnet'].includes(network),network);
 for(const key of ['NEAR_CONTRACT_ID','NEAR_SIGNER_ID','NEAR_SIGNER_PRIVATE_KEY','NEAR_WALLET_MASTER_KEY'])check(key,Boolean(env[key]),env[key]?'Configured (value hidden)':'Missing server environment variable');
 check('wallet master key format',/^[a-f0-9]{64}$/i.test(env.NEAR_WALLET_MASTER_KEY||''),'Must be a backed-up 32-byte hex key');
 const wasmPath=path.join(root,'contracts/economy/target/wasm32-unknown-unknown/release/aftermarket_economy.wasm');
 const wasm=fs.existsSync(wasmPath)?fs.readFileSync(wasmPath):null,hash=wasm&&crypto.createHash('sha256').update(wasm).digest('hex');
 check('compiled contract',Boolean(wasm),'Run npm run contract:build');
 if(network==='mainnet'){
  let record;try{record=JSON.parse(fs.readFileSync(path.join(root,'.deployments/testnet-verification.json'),'utf8'));}catch{/* Invalid or missing evidence cannot pass. */}
  check('verified exact build on testnet',Boolean(record?.network==='testnet'&&record?.wasmSha256===hash&&record?.deployedWasmSha256===hash&&record?.transactionHash),'Run a real testnet deployment and npm run contract:verify first');
  check('mainnet account names',![env.NEAR_CONTRACT_ID,env.NEAR_SIGNER_ID].some(id=>id?.endsWith('.testnet')),'Use separate mainnet accounts');
 }
 if(env.NEAR_CONTRACT_ID&&env.NEAR_SIGNER_ID){
  const url=env.NEAR_RPC_URL||`https://rpc.${network}.near.org`;
  try{
   const status=await rpc(url,'status',[]);check('RPC network',status.chain_id===network,'The endpoint must match NEAR_NETWORK');
   if(status.chain_id!==network)throw new Error('RPC network mismatch.');
   for(const id of new Set([env.NEAR_CONTRACT_ID,env.NEAR_SIGNER_ID])){const account=await rpc(url,'query',{request_type:'view_account',finality:'final',account_id:id});check(`funded account ${id}`,BigInt(account.amount)>0n,'Confirmed by final RPC query');}
   check('deployed code matches build',await deployedHash(url,env.NEAR_CONTRACT_ID)===hash,'Compared final deployed WASM bytes with local build');
  }catch(error){check('live chain verification',false,error.message);}
 }
 console.log(JSON.stringify({network,checks,chainPreflightPassed:checks.every(c=>c.ok),productionStatus:'Not a production certification. NEAR Auth linking, external transfer handling, hosted login and cross-device play must also be completed and verified.'},null,2));
 if(checks.some(c=>!c.ok))process.exitCode=1;
})().catch(()=>{console.error('Preflight failed. Check server environment configuration and RPC access. No transaction was signed.');process.exitCode=1;});
