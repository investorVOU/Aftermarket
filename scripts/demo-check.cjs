'use strict';
// Browser-free, real connected-mode acceptance check. No email, CAPTCHA or keys
// are needed when DEMO_BASE_URL points at an operator-configured testnet demo.
const crypto=require('node:crypto');
const {world}=require('../server/world.cjs');
const {rpc}=require('../server/near-rpc.cjs');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let managed;
async function check(){
  let base=process.env.BASE_URL||process.env.DEMO_BASE_URL;
  if(!base){
    // Reuse an already-running local worker: two settlement workers must not
    // operate the same database. Otherwise start the actual game server.
    try{const r=await fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/config',{signal:AbortSignal.timeout(1000)});if(r.ok&&(await r.json()).chain?.settlement)base='http://127.0.0.1:'+(process.env.PORT||8080);}catch{}
    if(!base){managed=require('../server/index.cjs');await new Promise((resolve,reject)=>{managed.server.once('error',reject);managed.server.listen(0,'127.0.0.1',resolve);});base='http://127.0.0.1:'+managed.server.address().port;}
  }
  const parsed=new URL(base);if(!['http:','https:'].includes(parsed.protocol)||parsed.username||parsed.password)throw Error('Use a plain HTTP(S) demo URL without credentials.');
  let token,state,lastSyncSeconds=.3;
  async function api(route,body){
    const started=performance.now(),response=await fetch(base.replace(/\/$/,'')+'/api/'+route,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(25000)});
    const data=await response.json();if(route==='sync')lastSyncSeconds=(performance.now()-started)/1000;if(!response.ok)throw Error('API '+route+': '+(data.error||'HTTP '+response.status));return data;
  }
  const config=await api('config');
  if(config.mode!=='connected'||config.chain?.network!=='testnet'||!config.chain?.settlement||!config.guestEnabled)throw Error('Real demo requires connected testnet settlement and guest entry. Set DEMO_BASE_URL to the configured demo, or follow docs/OPERATIONS.md for a private local .env. Development mode cannot pass this check.');
  const session=await api('guest',{});if(!session.access_token)throw Error('Guest API did not return a real session.');token=session.access_token;
  state=await api('session',{});if(!/^[a-f0-9]{64}$/.test(state.wallet))throw Error('Guest has no managed wallet identity.');
  const wallet=state.wallet;console.log('Guest API: authenticated; managed testnet owner '+wallet);
  const planner=world(),refresh=async()=>state=await api('sync',{x:0,z:0});
  const action=async(name,args={})=>state=await api('action',{id:crypto.randomUUID(),name,args});
  async function walkTo(x,z){
    const p=state.state.player,route=planner.Sim.PN.route(p.x,p.z,x,z);if(!route)throw Error('No walkable route to resource/workshop.');
    const deadline=Date.now()+120000;
    for(const target of route)while(true){const p=state.state.player,dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz);if(d<.65)break;if(Date.now()>deadline)throw Error('Server movement timed out.');const speed=Math.min(1,d/(6*Math.max(.2,lastSyncSeconds*1.5+.1)));state=await api('sync',{x:dx/d*speed,z:dz/d*speed});await sleep(50);}
    await refresh();
  }
  let approach,tree;
  const candidates=state.state.nodes.filter(n=>n.kind!=='ore'&&n.qty>=3).sort((a,b)=>Math.hypot(a.x-state.state.player.x,a.z-state.state.player.z)-Math.hypot(b.x-state.state.player.x,b.z-state.state.player.z));
  for(const n of candidates){for(let a=0;a<Math.PI*2;a+=Math.PI/8){const x=n.x+Math.cos(a)*2,z=n.z+Math.sin(a)*2;if(planner.Sim.Col.free(x,z,.45,'player')&&planner.Sim.PN.route(state.state.player.x,state.state.player.z,x,z)){tree=n;approach=[x,z];break;}}if(tree)break;}
  if(!tree)throw Error('No harvestable tree with a walkable approach.');
  await walkTo(...approach);
  for(let i=0;i<3;i++){await action('harvest',{id:tree.id});await sleep(2200);await refresh();}
  if(state.state.economy.player.inv.timber!==3)throw Error('Gathering did not yield three timber.');
  await walkTo(24,7);await action('craft');const craftStartedRevision=state.revision;await sleep(8500);await refresh();await action('closeTalk');const craftFinishedRevision=state.revision;
  if(state.state.economy.player.inv.furniture!==1)throw Error('Crafting did not consume ingredients and produce furniture.');
  console.log('Gather/craft: 3 timber -> 1 furniture through validated game API.');
  const before=Object.fromEntries(Object.entries(state.state.economy.merchants).map(([k,q])=>[k,q.price]));
  const startTime=state.state.time,trades=state.state.economy.transactionSequence;
  await action('demoStart');console.log('Running the real seven-day preview (about 60 seconds)...');
  const deadline=Date.now()+90000;
  do{await sleep(1500);await refresh();if(Date.now()>deadline)throw Error('Seven-day preview timed out.');}while(state.demo.active);
  if(state.state.time-startTime<7*420-5)throw Error('Preview did not advance seven island days.');
  const after=Object.fromEntries(Object.entries(state.state.economy.merchants).map(([k,q])=>[k,q.price]));
  console.table(Object.keys(before).map(merchant=>({merchant,before:(before[merchant]/100).toFixed(2),after:(after[merchant]/100).toFixed(2)})));
  if(!Object.keys(before).some(k=>before[k]!==after[k]))throw Error('No merchant price responded to the simulated week.');
  if(state.state.economy.transactionSequence<=trades)throw Error('No autonomous NPC trades during the week.');
  const rpcUrl=process.env.DEMO_RPC_URL||'https://test.rpc.fastnear.com';
  if((await rpc(rpcUrl,'status',[])).chain_id!=='testnet')throw Error('Verification RPC must be testnet.');
  const waitUntil=Date.now()+180000;let owned,hash;
  while(Date.now()<waitUntil){
    owned=await api('ownership');
    if(owned.wallet!==wallet)throw Error('On-chain owner does not match guest identity.');
    if(owned.balances[owned.token_ids.indexOf('furniture')]==='1'){
      const receipts=(await api('settlements')).settlements.filter(r=>r.status==='confirmed'&&r.transaction_hash&&r.revision>craftStartedRevision&&r.revision<=craftFinishedRevision);
      for(const row of receipts){
        const tx=await rpc(rpcUrl,'tx',{tx_hash:row.transaction_hash,sender_account_id:config.chain.signerId||process.env.NEAR_SIGNER_ID||'aftermarket-ctrl.testnet',wait_until:'FINAL'});
        if(tx.transaction.receiver_id!==config.chain.contractId||!tx.status?.SuccessValue)continue;
        const events=tx.receipts_outcome.filter(r=>r.outcome.executor_id===config.chain.contractId).flatMap(r=>r.outcome.logs).filter(l=>l.startsWith('EVENT_JSON:')).map(l=>JSON.parse(l.slice(11)));
        if(events.some(e=>e.standard==='nep245'&&e.event==='mt_mint'&&e.data.some(d=>d.owner_id===wallet&&d.token_ids.includes('furniture')))){hash=row.transaction_hash;break;}
      }
      if(hash)break;
    }
    await sleep(3000);
  }
  if(!hash)throw Error('Furniture balance and matching real NEP-245 mint receipt were not both confirmed.');
  const merchant=await api('ownership?actor=ts');if(merchant.wallet===wallet)throw Error('Merchant must have a separate on-chain owner.');
  console.log('On-chain item: furniture = 1 | contract '+config.chain.contractId+' | owner '+wallet);
  console.log('Verified testnet mint: https://testnet.nearblocks.io/txns/'+hash);
  console.log('Autonomous merchant owner: '+merchant.wallet+' (contract-ledger identity; not a funded native account)');
  console.log('PASS: API guest, managed wallet, craft, seven-day economy, changing prices, NPC trades and real NEP-245 mint.');
  require('node:fs').writeFileSync(require('node:path').join(__dirname,'../docs/DEMO_CHECK_EVIDENCE.json'),JSON.stringify({verifiedAt:new Date().toISOString(),network:'testnet',contract:config.chain.contractId,wallet,item:'furniture',balance:'1',transaction:hash,prices:{before,after},merchantWallet:merchant.wallet,simulatedSeconds:state.state.time-startTime},null,2)+'\n');
}
check().catch(error=>{console.error('DEMO CHECK FAILED: '+error.message);process.exitCode=1;}).finally(async()=>{if(managed)await managed.shutdown();process.exit(process.exitCode||0);});
