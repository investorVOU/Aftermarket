import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Account} from 'near-api-js';
import rpcRouter from '../server/rpc-router.cjs';
import nearRpc from '../server/near-rpc.cjs';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'..');
try{process.loadEnvFile(path.join(root,'.env'));}catch(e){if(e.code!=='ENOENT')throw e;}
const {NEAR_CONTRACT_ID,NEAR_SIGNER_ID,NEAR_SIGNER_PRIVATE_KEY,NEAR_DEPLOY_PRIVATE_KEY,NEAR_RPC_URL}=process.env;
const network=process.env.NEAR_NETWORK||'testnet';
if(network!=='testnet')throw new Error('This hackathon deployment command is testnet-only.');
if(!NEAR_CONTRACT_ID||!NEAR_SIGNER_ID||!NEAR_SIGNER_PRIVATE_KEY)throw new Error('Configure .env with the funded contract account and controller credentials.');
if(network==='mainnet'&&[NEAR_CONTRACT_ID,NEAR_SIGNER_ID].some(id=>id.endsWith('.testnet')))throw new Error('Mainnet cannot use testnet accounts.');
const {provider}=await rpcRouter.createProvider(process.env);
const status=await nearRpc.rpc(NEAR_RPC_URL||'https://test.rpc.fastnear.com','status',[]);
if(status.chain_id!==network)throw new Error('NEAR_RPC_URL does not match NEAR_NETWORK.');
const contract=new Account(NEAR_CONTRACT_ID,provider,NEAR_DEPLOY_PRIVATE_KEY||NEAR_SIGNER_PRIVATE_KEY);
// Refuse to overwrite an existing contract. Upgrades require a separately reviewed operation.
const info=await contract.getState();
if(info.codeHash!=='11111111111111111111111111111111')throw new Error('Contract account already has code. Refusing to overwrite it.');
const wasm=fs.readFileSync(path.join(root,'contracts/economy/target/wasm32-unknown-unknown/release/aftermarket_economy.wasm'));
const {actions}=await import('near-api-js');
const result=await contract.signAndSendTransaction({receiverId:NEAR_CONTRACT_ID,actions:[actions.deployContract(wasm),actions.functionCall('new',{controller:NEAR_SIGNER_ID},30000000000000n,0n)],waitUntil:'FINAL'});
console.log(`Deployed and initialized on NEAR ${network}:`,NEAR_CONTRACT_ID);
console.log('Transaction:',result.transaction.hash);
