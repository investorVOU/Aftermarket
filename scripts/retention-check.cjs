'use strict';
// Real gameplay through public intents: no admin credentials or seeded balances.
const crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path'),{world}=require('../server/world.cjs'),{rpc}=require('../server/near-rpc.cjs');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const base=(process.env.BASE_URL||'https://aftmarket.xyz').replace(/\/$/,''),url=new URL(base);if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw Error('Use a plain HTTP(S) game URL.');
 let token,state,lastSync=.3;
 async function api(route,body){const t=performance.now(),r=await fetch(base+'/api/'+route,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(60000)});const d=await r.json();if(route==='sync')lastSync=(performance.now()-t)/1000;if(!r.ok)throw Error('API '+route+': '+(d.error||r.status));return d;}
 const config=await api('config'),local=config.mode==='development'&&['127.0.0.1','localhost'].includes(url.hostname);
 if(!local&&(config.mode!=='connected'||config.chain?.network!=='testnet'||!config.chain?.settlement||!config.guestEnabled))throw Error('Use the configured testnet guest game, or a loopback development server.');
 if(local)token='dev-'+crypto.randomUUID();else token=(await api('guest',{})).access_token;
 if(!token)throw Error('No guest session returned.');state=await api('session',{});const planner=world(),refresh=async()=>state=await api('sync',{x:0,z:0}),act=async(name,args={})=>state=await api('action',{id:crypto.randomUUID(),name,args});
 async function walkTo(x,z){const p=state.state.player,route=planner.Sim.PN.route(p.x,p.z,x,z);if(!route)throw Error('No walking route.');const deadline=Date.now()+150000;for(const t of route)while(true){const p=state.state.player,dx=t.x-p.x,dz=t.z-p.z,d=Math.hypot(dx,dz);if(d<.65)break;if(Date.now()>deadline)throw Error('Movement timed out.');const speed=Math.min(1,d/(6*Math.max(.2,lastSync*1.5+.1)));state=await api('sync',{x:dx/d*speed,z:dz/d*speed});await sleep(50);}await refresh();}
 if(!state.state.economy.retention)throw Error('Retention update is not deployed at this URL.');
 await act('startTownProject');await act('buy_maize');await act('buy_maize');if(state.state.economy.player.inv.maize!==2)throw Error('Farm purchase failed.');console.log('Town contract fully funded; bought two maize with game cash.');
 while((state.state.economy.player.inv.timber||0)<8){
  let target;const candidates=state.state.nodes.filter(n=>n.kind!=='ore'&&n.qty>0).sort((a,b)=>Math.hypot(a.x-state.state.player.x,a.z-state.state.player.z)-Math.hypot(b.x-state.state.player.x,b.z-state.state.player.z));
  for(const n of candidates){for(let a=0;a<Math.PI*2;a+=Math.PI/8){const x=n.x+Math.cos(a)*2,z=n.z+Math.sin(a)*2;if(planner.Sim.Col.free(x,z,.45,'player')&&planner.Sim.PN.route(state.state.player.x,state.state.player.z,x,z)){target={node:n,x,z};break;}}if(target)break;}
  if(!target)throw Error('No available timber tree.');await walkTo(target.x,target.z);const count=Math.min(target.node.qty,8-state.state.economy.player.inv.timber);for(let i=0;i<count;i++){await act('harvest',{id:target.node.id});await sleep(2200);await refresh();}
 }
 await walkTo(24,7);await act('craft');await sleep(8500);await refresh();if(state.state.economy.player.inv.furniture!==1)throw Error('Craft did not finish.');
 await walkTo(-4,14.3);for(const item of ['timber','furniture','maize'])await act('supplyTownProject',{item});if(state.state.economy.retention.landmarks.length!==1)throw Error('Town project did not complete.');console.log('Gathered eight timber, crafted furniture and completed the paid market garden.');
 let borrowed=false;if(state.state.economy.player.cash<15000){await act('borrow',{amount:2000});borrowed=true;}await act('buyPost');if(state.state.economy.post.owner!=='player')throw Error('Trading Post purchase failed.');
 for(let i=0;state.state.economy.post.price>1000&&i<15;i++)await act('shopPrice',{item:'timber',delta:-100});
 const priorCash=state.state.economy.post.cash;await act('acceptCustomer',{customer:'farm'});const order=state.state.economy.retention.customers.farm.active;if(!order)throw Error('Customer did not reserve an order.');const minRevision=state.revision;await act('stockShop',{item:'timber'});const maxRevision=state.revision,C=state.state.economy.retention;
 if(C.customers.farm.completed!==1||state.state.economy.post.cash!==priorCash+order.reward)throw Error('Standing order did not pay the shop exactly once.');
 const report={at:new Date().toISOString(),url:base,mode:local?'development':'connected-testnet',release:config.release,scope:'Fresh guest/local identity; real API gathering, crafting, paid town project, business acquisition and funded customer collection. No injected balances or position.',project:'garden',projectCompleted:true,shopOwned:true,customer:'farm',item:order.item,quantity:order.quantity,shopReceivedCents:order.reward,shopReport:C.report,borrowedTwenty:borrowed,loanRepaid:false,chainVerified:false};
 if(!local){
  const post=await api('ownership?actor=post'),farm=await api('ownership?actor=farm'),rpcUrl=process.env.DEMO_RPC_URL||'https://test.rpc.fastnear.com';if((await rpc(rpcUrl,'status',[])).chain_id!=='testnet')throw Error('Verification RPC must be testnet.');
  const until=Date.now()+180000;let hash;while(Date.now()<until&&!hash){for(const row of(await api('settlements')).settlements.filter(r=>r.status==='confirmed'&&r.transaction_hash&&r.revision>minRevision&&r.revision<=maxRevision)){
   const tx=await rpc(rpcUrl,'tx',{tx_hash:row.transaction_hash,sender_account_id:config.chain.signerId,wait_until:'FINAL'});if(tx.transaction.receiver_id!==config.chain.contractId||typeof tx.status?.SuccessValue!=='string')continue;
   const events=tx.receipts_outcome.filter(r=>r.outcome.executor_id===config.chain.contractId).flatMap(r=>r.outcome.logs).filter(l=>l.startsWith('EVENT_JSON:')).map(l=>JSON.parse(l.slice(11)));
   const minted=(owner,item)=>events.some(e=>e.standard==='nep245'&&e.event==='mt_mint'&&e.data.some(d=>d.owner_id===owner&&d.token_ids.includes(item)));
   if(minted(post.wallet,'cash')&&minted(farm.wallet,'timber')){hash=row.transaction_hash;break;}
  }if(!hash)await sleep(3000);}
  if(!hash)throw Error('Gameplay passed, but matching customer inventory/cash mint receipt was not confirmed.');report.chainVerified=true;report.contract=config.chain.contractId;report.shopOwner=post.wallet;report.customerOwner=farm.wallet;report.transaction=hash;report.explorer='https://testnet.nearblocks.io/txns/'+hash;
 }
 // Withdraw shop income and clear the temporary game-credit advance when possible.
 if(borrowed){await act('moveCapital',{amount:-2000});if(state.state.economy.player.cash>=2400){await act('repayLoan',{amount:'full'});report.loanRepaid=Boolean(state.state.economy.credit.loan.closedAt);}}
 fs.writeFileSync(path.join(__dirname,'../docs/'+(local?'RETENTION_GAMEPLAY_EVIDENCE.json':'RETENTION_TESTNET_EVIDENCE.json')),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));console.log('PASS: funded town contract, genuine supplies, owned shop and customer sale'+(local?' (local development; no blockchain claim).':' with real NEP-245 receipt.'));
})().catch(e=>{console.error('RETENTION CHECK FAILED: '+e.message);process.exitCode=1;});
