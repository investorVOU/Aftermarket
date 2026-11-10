// Opt-in integration verification: real Supabase identities and NEAR TESTNET.
// Never prints or commits session tokens. Uses only the public game's API.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.join(__dirname,'..');process.loadEnvFile(path.join(root,'.env'));
if(process.env.NEAR_NETWORK!=='testnet'||process.env.NEAR_SETTLEMENT_ENABLED!=='true'||process.env.GAME_MODE!=='connected')throw new Error('Live verification requires connected testnet settlement.');
const {world}=require('../server/world.cjs');let managed;
const {rpc}=require('../server/near-rpc.cjs');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 let base=process.env.VERIFY_BASE_URL;
 if(!base){managed=require('../server/index.cjs');await new Promise(resolve=>managed.server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${managed.server.address().port}`;}
 const config=await(await fetch(base+'/api/config')).json();if(config.chain?.network!=='testnet'||!config.chain?.settlement)throw Error('Live verification target must use real testnet settlement.');
 let token,state;const evidence={network:'testnet',steps:[]};
 async function api(route,body){const response=await fetch(base+'/api/'+route,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});const data=await response.json();if(!response.ok)throw Error(data.error||'Game API failed');return data;}
 const session=await api('guest',{});token=session.access_token;
 fs.mkdirSync(path.join(root,'.local/qa'),{recursive:true});fs.writeFileSync(path.join(root,'.local/qa/connected-session.json'),JSON.stringify(session),{mode:0o600});
 state=await api('session',{});evidence.wallet=state.wallet;evidence.contractId=state.chain.contractId;console.log('Real guest login and managed testnet identity verified.');
 const planner=world();
 const refresh=async()=>state=await api('sync',{x:0,z:0});
 const action=async(name,args={})=>state=await api('action',{id:crypto.randomUUID(),name,args});
 async function walkTo(x,z){const P=state.state.player,route=planner.Sim.PN.route(P.x,P.z,x,z);if(!route)throw Error('No walkable route to the destination');const deadline=Date.now()+45000;for(const target of route){while(true){const P=state.state.player,dx=target.x-P.x,dz=target.z-P.z,d=Math.hypot(dx,dz);if(d<.65)break;if(Date.now()>deadline)throw Error('Movement did not reach destination');state=await api('sync',{x:dx/d,z:dz/d});await pause(100);}}await refresh();}
 async function confirmed(item,amount){const deadline=Date.now()+90000;while(Date.now()<deadline){const owned=await api('ownership'),index=owned.token_ids.indexOf(item);if(owned.balances[index]===String(amount)){const receipts=(await api('settlements')).settlements.filter(r=>r.status==='confirmed');for(const row of receipts){const tx=await rpc(process.env.NEAR_RPC_URL,'tx',{tx_hash:row.transaction_hash,sender_account_id:process.env.NEAR_SIGNER_ID,wait_until:'FINAL'}),events=tx.receipts_outcome.flatMap(r=>r.outcome.logs).filter(l=>l.startsWith('EVENT_JSON:')).map(l=>JSON.parse(l.slice(11)));if(events.some(e=>e.standard==='nep245'&&e.event===(amount?'mt_mint':'mt_burn')&&e.data.some(d=>d.owner_id===state.wallet&&d.token_ids.includes(item)))){evidence.steps.push({item,balance:String(amount),transactionHash:row.transaction_hash});console.log('Confirmed on testnet: '+item+' = '+amount);return;}}}await pause(1500);}throw Error('Timed out waiting for real '+item+' settlement');}
 const trees=state.state.nodes.filter(n=>n.kind!=='ore'&&n.qty>=3).sort((a,b)=>Math.hypot(a.x-state.state.player.x,a.z-state.state.player.z)-Math.hypot(b.x-state.state.player.x,b.z-state.state.player.z));
 let tree,approach;
 for(const candidate of trees){for(let a=0;a<Math.PI*2;a+=Math.PI/8){const x=candidate.x+Math.cos(a)*2,z=candidate.z+Math.sin(a)*2;if(planner.Sim.Col.free(x,z,.45,'player')&&planner.Sim.PN.route(state.state.player.x,state.state.player.z,x,z)){tree=candidate;approach=[x,z];break;}}if(tree)break;}
 if(!tree)throw Error('No harvestable tree with a walkable approach');await walkTo(...approach);
 for(let i=0;i<3;i++){await action('harvest',{id:tree.id});await pause(2200);await refresh();}
 if(state.state.economy.player.inv.timber!==3)throw Error('Gathering did not produce three timber');
 await action('closeTalk');await confirmed('timber',3);
 await walkTo(24,7);await action('craft');await pause(8500);await refresh();await action('closeTalk');await confirmed('furniture',1);
 await action('sellFurniture');await confirmed('furniture',0);
 evidence.afterCoreCredits=state.state.economy.player.cash;
 if(process.env.VERIFY_BUSINESS==='true'){
  await action('buyTimber');await action('sellTimber');await action('contract');
  async function gatherUntil(quantity){
   while((state.state.economy.player.inv.timber||0)<quantity){
    let node,target;
    const candidates=state.state.nodes.filter(n=>n.kind!=='ore'&&n.qty>0).sort((a,b)=>Math.hypot(a.x-state.state.player.x,a.z-state.state.player.z)-Math.hypot(b.x-state.state.player.x,b.z-state.state.player.z));
    for(const candidate of candidates){for(let a=0;a<Math.PI*2;a+=Math.PI/8){const x=candidate.x+Math.cos(a)*2,z=candidate.z+Math.sin(a)*2;if(planner.Sim.Col.free(x,z,.45,'player')&&planner.Sim.PN.route(state.state.player.x,state.state.player.z,x,z)){node=candidate;target=[x,z];break;}}if(node)break;}
    if(!node)throw Error('No resource available for the business progression check');await walkTo(...target);await action('harvest',{id:node.id});await pause(2200);await refresh();
   }
  }
  await gatherUntil(state.state.economy.contract.need);await action('contract');
  for(let extra=0;state.state.economy.player.cash<state.state.economy.post.ask&&extra<5;extra++){await gatherUntil(1);await action('sellTimber');}
  await action('buyPost');if(state.state.economy.post.owner!=='player')throw Error('Trading Post acquisition failed');
  const token=(await api('ownership')).token_ids.find(id=>id.startsWith('trading-post:'));await confirmed(token,1);evidence.businessLicence=token;
  console.log('Trading Post ownership and its bound on-chain licence verified.');
 }
 const merchant=await api('ownership?actor=ts');if(BigInt(merchant.balances[merchant.token_ids.indexOf('timber')])<1n)throw Error('Merchant on-chain inventory missing');
 evidence.merchantWallet=merchant.wallet;evidence.verifiedAt=new Date().toISOString();evidence.finalCredits=state.state.economy.player.cash;
 fs.writeFileSync(path.join(root,'docs/LIVE_GAME_EVIDENCE.json'),JSON.stringify(evidence,null,2)+'\n');console.log('Gather, craft, sell and merchant inventory verified through the real API and final testnet reads.');
})().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(async()=>{if(managed)await managed.shutdown();process.exit(process.exitCode||0);});
