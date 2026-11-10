'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
try{process.loadEnvFile(path.join(__dirname,'../.env'));}catch(e){if(e.code!=='ENOENT')throw e;}
const {Store}=require('./store.cjs');
const {Chain}=require('./near.cjs');
const {world,action}=require('./world.cjs');
const State=require('../shared/state.js');
const Rules=require('../shared/merchant-rules.js');
const Simulation=require('./simulation.cjs');
const env=process.env,root=path.join(__dirname,'..'),runtime=require('./runtime.cjs').runtime(env),{development}=runtime;
const {DevelopmentStore,DevelopmentChain,OffchainChain}=require('./development.cjs');
const store=development?new DevelopmentStore():new Store(env),chain=development?new DevelopmentChain():env.NEAR_SETTLEMENT_ENABLED==='true'?new Chain(env):new OffchainChain();
const guest=development?null:new (require('./guest.cjs').GuestAuth)(env,store.sql);
const worlds=new Map(),tokens=new Map(),limits=new Map();
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
function fail(message,status=400){return Object.assign(new Error(message),{status});}
async function body(req){let text='';for await(const b of req){text+=b;if(text.length>8192)throw fail('Request too large',413);}try{return JSON.parse(text||'{}');}catch{throw fail('Invalid JSON');}}
async function authenticated(req){
  if(!store.ready||!chain.ready)throw fail('The configured authentication, database or settlement service is not ready.',503);
  const token=req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];if(!token)throw fail('Sign in to play.',401);
  const key=crypto.createHash('sha256').update(token).digest('hex');let cached=tokens.get(key);
  if(!cached||cached.until<Date.now()){const user=await store.user(token);cached={user,until:Date.now()+30000};tokens.set(key,cached);}
  return cached.user;
}
async function getWorld(user){
  if(!worlds.has(user.id)){
    if(worlds.size>=20)throw fail('The island is busy. Please try again shortly.',503);
    const promise=(async()=>{const saved=await store.load(user.id),network=chain.publicConfig().network,previous=saved?.snapshot?.chainNetwork;if(previous&&['mainnet','testnet'].includes(previous)&&previous!==network)throw fail('Use separate saved worlds for different settlement networks.',409);if(chain.publicConfig().settlement&&saved?.wallet_id?.match(/^[a-f0-9]{64}$/)&&saved.wallet_id!==chain.wallet(user.id))throw fail('Wallet key does not match this saved island. Restore its original wallet master key.',503);return {game:world(saved?.snapshot),revision:saved?.revision||0,balances:saved?.chain_balances||{},commands:saved?.snapshot?.commands||[],wallTimestamp:saved?.snapshot?.wallTimestamp||Date.now(),lastSeen:Date.now(),lastSave:Date.now(),movement:{x:0,z:0,at:0},busy:false,queue:Promise.resolve(),demoUntil:0,ruleClock:0,events:[],sequence:0,catchingUp:false,progress:0};})();
    worlds.set(user.id,promise);try{const w=await promise;w.game.Bus.on('notify',m=>{w.events.push({id:++w.sequence,message:m});if(w.events.length>60)w.events.shift();});
      const now=Date.now(),elapsed=Math.max(0,(now-w.wallTimestamp)/1000);if(elapsed>1){w.catchingUp=true;serial(w,async()=>{await Simulation.catchUp(w.game,elapsed,p=>w.progress=p);w.wallTimestamp=now;await save(user,w);w.catchingUp=false;}).catch(e=>{console.error('Catch-up failed:',e.message);worlds.delete(user.id);});}
    }catch(e){worlds.delete(user.id);throw e;}
  }
  const w=await worlds.get(user.id);w.lastSeen=Date.now();return w;
}
async function save(user,w,command=null){
  const snapshot=State.capture(w.game,true);snapshot.commands=w.commands;snapshot.wallTimestamp=w.wallTimestamp;snapshot.economicRemainder=w.game.elapsedRemainder||0;snapshot.ruleClock=w.game.ruleClock||0;snapshot.chainNetwork=chain.publicConfig().network;
  const {balances,payload}=chain.payload(user.id,w.game,w.balances);
  const revision=await store.save(user.id,w.revision,snapshot,balances,chain.wallet(user.id),payload,command);
  w.revision=revision;w.balances=balances;w.lastSave=Date.now();
}
function snapshot(user,w){return {state:State.capture(w.game),revision:w.revision,events:w.events,sequence:w.sequence,wallet:chain.wallet(user.id),chain:chain.publicConfig(),demo:{active:w.demoUntil>Date.now(),secondsRemaining:Math.max(0,Math.ceil((w.demoUntil-Date.now())/1000))}};}
function serial(w,fn){const task=w.queue.then(async()=>{w.busy=true;try{return await fn();}finally{w.busy=false;}});w.queue=task.catch(()=>{});return task;}

const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');
  try{
    const url=new URL(req.url,'http://localhost'),route=url.pathname;
    if(route.startsWith('/api/')){
      const bearer=req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
      const key=bearer?'session:'+crypto.createHash('sha256').update(bearer).digest('hex'):'public:'+req.socket.remoteAddress,now=Date.now(),limit=limits.get(key)||{start:now,count:0};if(now-limit.start>60000){limit.start=now;limit.count=0;}if(++limit.count>800)throw fail('Too many requests. Please wait.',429);limits.set(key,limit);
      if(req.method==='POST'){
        if(req.headers['content-type']?.split(';')[0]!=='application/json')throw fail('JSON required',415);
        const origin=req.headers.origin;if(origin&&origin!==(env.APP_ORIGIN||env.RENDER_EXTERNAL_URL||`http://localhost:${env.PORT||8080}`))throw fail('Origin not allowed',403);
      }
      if(route==='/api/config'&&req.method==='GET')return json(res,200,{mode:development?'development':'connected',supabaseUrl:env.SUPABASE_URL||null,supabaseKey:env.SUPABASE_PUBLISHABLE_KEY||null,configured:store.ready&&chain.ready,googleEnabled:env.SUPABASE_GOOGLE_ENABLED==='true',guestEnabled:Boolean(guest?.ready&&store.ready&&chain.ready),chain:chain.publicConfig()});
      if(route==='/api/health'&&req.method==='GET')return json(res,200,{ok:true,configured:store.ready&&chain.ready,network:chain.publicConfig().network});
      if(route==='/api/guest'&&req.method==='POST'){if(!guest?.ready||!store.ready||!chain.ready)throw fail('Guest entry is not enabled for this island.',403);return json(res,200,await guest.create());}
      const user=await authenticated(req),w=await getWorld(user);
      if(w.catchingUp)return json(res,200,{catchingUp:true,progress:w.progress});
      if(route==='/api/session'&&req.method==='POST'){await serial(w,async()=>{if(!w.revision)await save(user,w);});return json(res,200,snapshot(user,w));}
      if(route==='/api/sync'&&req.method==='POST'){
        const data=await body(req);const x=data.x,z=data.z;
        if(typeof x!=='number'||typeof z!=='number'||!Number.isFinite(x)||!Number.isFinite(z)||Math.hypot(x,z)>1.001)throw fail('Invalid movement');
        w.movement={x,z,at:Date.now()};if(Date.now()-w.lastSave>8000)await serial(w,()=>save(user,w));return json(res,200,snapshot(user,w));
      }
      if(route==='/api/action'&&req.method==='POST'){
        const data=await body(req);if(typeof data.id!=='string'||!/^[\w-]{8,80}$/.test(data.id))throw fail('Invalid action ID');
        await serial(w,async()=>{
          if(w.commands.includes(data.id)||await store.hasCommand(user.id,data.id))return;
          if(w.demoUntil>Date.now()&&data.name!=='demoStop')throw fail('Finish the economy preview before trading.');
          if(data.name==='demoStart'){if(chain.publicConfig().network==='mainnet')throw fail('Accelerated simulation is available on development and testnet islands.',403);if(w.game.Sim.Talk.cur||w.game.Sim.harvesting)throw fail('Finish your current interaction first.');w.demoUntil=Date.now()+60000;w.movement={x:0,z:0,at:0};w.game.Eco.say('Economy preview: seven island days in one minute.');}
          else if(data.name==='demoStop')w.demoUntil=0;
          else {try{action(w.game,data.name,data.args||{});}catch(e){throw fail(e.message,400);}}
          w.commands.push(data.id);w.commands=w.commands.slice(-100);
          try{await save(user,w,data.id);}catch(e){worlds.delete(user.id);throw fail('Progress could not be saved. Reconnect to reload the last confirmed save.',503);}
        });return json(res,200,snapshot(user,w));
      }
      if(route==='/api/settlements'&&req.method==='GET')return json(res,200,{settlements:await store.history(user.id)});
      if(route==='/api/ownership'&&req.method==='GET'){
        if(!chain.publicConfig().settlement)throw fail('This island inventory is off-chain.',409);
        const actor=url.searchParams.get('actor')||'player';if(!['player','ts','ow','post','crew','port','mine','farm','market'].includes(actor))throw fail('Unknown island merchant.');
        const token_ids=['cash','timber','furniture','ore','gold','maize','cassava','milk',`trading-post:${user.id}`],wallet=chain.wallet(user.id,actor);
        return json(res,200,{network:chain.publicConfig().network,contractId:chain.publicConfig().contractId,wallet,actor,identityType:'managed contract-ledger identity',token_ids,balances:await chain.view('mt_batch_balance_of',{account_id:wallet,token_ids})});
      }
      throw fail('Endpoint not found',404);
    }
    if(req.method!=='GET'&&req.method!=='HEAD')throw fail('Method not allowed',405);
    const allowed={
      '/':'game/aftermarket.html','/aftermarket.html':'game/aftermarket.html','/client.js':'game/client.bundle.js','/shell.css':'game/shell.css',
      '/shared/core.js':'shared/core.js','/shared/state.js':'shared/state.js','/shared/merchant-rules.js':'shared/merchant-rules.js',
      '/vendor/three.min.js':'node_modules/three/build/three.min.js'
    };
    if(!Object.hasOwn(allowed,route))throw fail('Not found',404);
    const file=path.join(root,allowed[route]);const type=file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8';
    const data=await fs.promises.readFile(file);res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:data);
  }catch(e){if(e.status>=500||!e.status)console.error('Request failed:',e.message);json(res,e.status||500,{error:e.status?e.message:'The server could not complete this request.'});}
});

let settling=false,settlementRetryAt=0;
const ticker=setInterval(()=>{const now=Date.now();for(const [id,promise] of worlds){promise.then(w=>{
  if(w.busy)return;
  const actual=Math.max(0,(now-w.wallTimestamp)/1000);
  const accelerated=w.demoUntil>w.wallTimestamp?Math.max(0,(Math.min(now,w.demoUntil)-w.wallTimestamp)/1000):0;
  const remaining=actual+accelerated*48;
  if(!w.demoUntil||w.demoUntil<=now){const m=w.movement;if(now-m.at<350&&!w.game.Sim.harvesting)w.game.Sim.player.move(m.x*6*Math.min(actual,.1),m.z*6*Math.min(actual,.1));}
  Simulation.advance(w.game,remaining);w.wallTimestamp=now;
  if(now-w.lastSave>10000)serial(w,()=>save({id},w)).catch(e=>{console.error('Autosave:',e.message);worlds.delete(id);});
}).catch(e=>{console.error('Simulation stopped:',e.message);worlds.delete(id);});}
},50);
const worker=setInterval(async()=>{
  if(!store.ready||!chain.ready||!chain.publicConfig().settlement||settling||Date.now()<settlementRetryAt)return;
  settling=true;try{const job=await store.pending();if(job){try{const hash=await chain.settle(job.payload);await store.settlement(job.id,{status:'confirmed',transaction_hash:hash,error:null});}catch(e){await store.settlement(job.id,{error:'Testnet settlement pending. Operator must check relayer balance, storage deposit and contract configuration.'});settlementRetryAt=Date.now()+30000;console.error('Settlement needs attention:',e.message);}}}catch(e){console.error('Settlement worker:',e.message);settlementRetryAt=Date.now()+30000;}finally{settling=false;}
},4000);
const cleanup=setInterval(()=>{const now=Date.now();for(const [key,value]of tokens)if(value.until<now)tokens.delete(key);for(const [key,value]of limits)if(now-value.start>60000)limits.delete(key);for(const [key,p]of worlds)p.then(w=>{if(!w.busy&&now-w.lastSeen>120000)worlds.delete(key);});},60000);
if(require.main===module)server.listen(runtime.port,runtime.host,()=>console.log(`AFTERMARKET http://${runtime.host}:${runtime.port} | ${runtime.mode} | ${chain.publicConfig().network} | ${store.ready&&chain.ready?'configured':'waiting for server environment configuration'}`));
async function shutdown(){clearInterval(ticker);clearInterval(worker);clearInterval(cleanup);await Promise.all([...worlds.entries()].map(async([id,p])=>{const w=await p;await serial(w,()=>save({id},w)).catch(e=>console.error('Final save:',e.message));}));server.close();}
process.once('SIGINT',()=>shutdown().then(()=>process.exit()));process.once('SIGTERM',()=>shutdown().then(()=>process.exit()));
module.exports={server,shutdown};
