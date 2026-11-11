// The official browser SDK currently uses the NEAR API v5 connection interface.
// Keep that dependency isolated from the server's NEAR API v7 relayer.
import {FastAuthClient} from '@fast-auth-near/browser-sdk';
import {JavascriptProvider} from '@fast-auth-near/javascript-provider';
import {connect} from 'near-api-js-legacy';

export async function createNearAuth({network='testnet',clientId,fastAuthContractId,mpcContractId,rpcUrl}){
  if(!clientId)throw new Error('NEAR Auth requires an approved client ID.');
  if(!['testnet','mainnet'].includes(network))throw new Error('Unsupported NEAR Auth network.');
  if(network==='testnet'&&(!fastAuthContractId||!mpcContractId))throw new Error('Set the current testnet NEAR Auth and MPC contract IDs from the provider documentation.');
  const provider=new JavascriptProvider({network,clientId});
  const {connection}=await connect({networkId:network,nodeUrl:rpcUrl||`https://rpc.${network}.near.org`});
  const client=new FastAuthClient(provider,connection,{fastAuthContractId:fastAuthContractId||'fast-auth.near',mpcContractId:mpcContractId||'v1.signer'});
  return {
    async login(){await client.login();const signer=await client.getSigner();const key=await signer.getPublicKey();return{publicKey:key.toString(),signer};},
    isLoggedIn:()=>provider.isLoggedIn(),logout:()=>client.logout(),
    // Callers must persist the transaction before the Auth0 popup/redirect.
    getSigner:()=>client.getSigner()
  };
}
