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
const {serial}=require('./world-queue.cjs');
const env=process.env,root=path.join(__dirname,'..'),runtime=require('./runtime.cjs').runtime(env),{development}=runtime;
const {DevelopmentStore,DevelopmentChain,OffchainChain}=require('./development.cjs');
const store=development?new DevelopmentStore():new Store(env),chain=development?new DevelopmentChain():env.NEAR_SETTLEMENT_ENABLED==='true'?new Chain(env):new OffchainChain();
const guest=development?null:new (require('./guest.cjs').GuestAuth)(env,store.sql);
guest?.prime().catch(()=>{});
const worlds=new Map(),tokens=new Map(),limits=new Map(),guestEntries=new (require('./guest-entry.cjs').GuestEntries)();
const {MerchantAgent,MERCHANTS}=require('./merchant-agent.cjs'),merchantAgent=new MerchantAgent(env);
async function runMerchant(user,w,id,question){
  if(w.agentBusy||w.demoUntil>Date.now())throw fail('Merchant is busy. Try after the economy preview.',429);
  w.agentBusy=true;
  try{
    const context=merchantAgent.context(w.game,id);context.wallet=chain.wallet(user.id,context.business);
    const decision=await merchantAgent.decide(context,question);
    await serial(w,async()=>{
      if(await worlds.get(user.id)!==w||w.demoUntil>Date.now())throw fail('The island changed. Please retry the conversation.',409);
      if(question)w.game.Sim.Msg.append(id,[{me:1,text:question,t:w.game.Sim.clock.h}]);
      merchantAgent.apply(w.game,id,decision);
      try{await save(user,w);}catch{worlds.delete(user.id);throw fail('Conversation could not be saved. Reconnect to reload your island.',503);}
    });
  }finally{w.agentBusy=false;}
}
// Covers observed hosted RTTs while bounding movement after a lost connection.
const Movement=require('./movement.cjs');
const json=(res,status,data)=>{const started=performance.now(),encoded=JSON.stringify(data);res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','Server-Timing':`app;dur=${(performance.now()-(res.requestStarted||started)).toFixed(2)}, serialize;dur=${(performance.now()-started).toFixed(2)}`});res.end(encoded);};
function fail(message,status=400){return Object.assign(new Error(message),{status});}
async function body(req){let text='';for await(const b of req){text+=b;if(text.length>8192)throw fail('Request too large',413);}try{return JSON.parse(text||'{}');}catch{throw fail('Invalid JSON');}}
async function authenticated(req){
  if(!store.ready||!chain.ready)throw fail('The configured authentication, database or settlement service is not ready.',503);
  const token=req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];if(!token)throw fail('Sign in to play.',401);
  const key=crypto.createHash('sha256').update(token).digest('hex');let cached=tokens.get(key);
  if(!cached||cached.until<Date.now()){const user=await store.user(token);cached={user,until:Date.now()+30000};tokens.set(key,cached);}
  return cached.user;
}
async function getWorld(user,{fresh=false}={}){
  if(!worlds.has(user.id)){
    if(worlds.size>=20)throw fail('The island is busy. Please try again shortly.',503);
    const promise=(async()=>{const saved=fresh?null:await store.load(user.id),network=chain.publicConfig().network,previous=saved?.snapshot?.chainNetwork;if(previous&&['mainnet','testnet'].includes(previous)&&previous!==network)throw fail('Use separate saved worlds for different settlement networks.',409);if(chain.publicConfig().settlement&&saved?.wallet_id?.match(/^[a-f0-9]{64}$/)&&saved.wallet_id!==chain.wallet(user.id))throw fail('Wallet key does not match this saved island. Restore its original wallet master key.',503);return {game:world(saved?.snapshot),revision:saved?.revision||0,balances:saved?.chain_balances||{},commands:saved?.snapshot?.commands||[],wallTimestamp:saved?.snapshot?.wallTimestamp||Date.now(),lastSeen:Date.now(),lastSave:Date.now(),movement:{x:0,z:0,at:0},busy:false,queue:Promise.resolve(),demoUntil:0,ruleClock:0,events:[],sequence:0,catchingUp:false,progress:0};})();
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
function snapshot(user,w){return {state:State.capture(w.game),revision:w.revision,events:w.events,sequence:w.sequence,wallet:chain.wallet(user.id),chain:chain.publicConfig(),movement:Movement.live(w.movement,Date.now())&&!w.game.Sim.harvesting&&!w.game.Sim.Talk.cur?w.movement:{x:0,z:0},demo:{active:w.demoUntil>Date.now(),secondsRemaining:Math.max(0,Math.ceil((w.demoUntil-Date.now())/1000))}};}

const server=http.createServer(async(req,res)=>{
  res.requestStarted=performance.now();
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
      if(route==='/api/config'&&req.method==='GET'){if(store.ready&&chain.ready)guest?.prepare?.();return json(res,200,{mode:development?'development':'connected',supabaseUrl:env.SUPABASE_URL||null,supabaseKey:env.SUPABASE_PUBLISHABLE_KEY||null,configured:store.ready&&chain.ready,googleEnabled:env.SUPABASE_GOOGLE_ENABLED==='true',guestEnabled:Boolean(guest?.ready&&store.ready&&chain.ready),guestDailyLimit:guest?.dailyLimit?.()||null,merchantAI:{enabled:merchantAgent.ready},guestBootstrap:true,guestRecovery:true,guestPrewarm:env.DEMO_GUEST_PREWARM!=='false',jobsEnabled:true,release:env.RENDER_GIT_COMMIT?.slice(0,12)||'local',chain:chain.publicConfig()});}
      if(route==='/api/health'&&req.method==='GET')return json(res,200,{ok:true,configured:store.ready&&chain.ready,network:chain.publicConfig().network});
      if(route==='/api/guest'&&req.method==='POST'){
        if(!guest?.ready||!store.ready||!chain.ready)throw fail('Guest entry is not enabled for this island.',403);
        const request=await body(req);const entry=await guestEntries.run(request.requestId,async()=>{const {user,...session}=await guest.create(),w=await getWorld(user,{fresh:true});
        await serial(w,async()=>{if(!w.revision)await save(user,w);});
        tokens.set(crypto.createHash('sha256').update(session.access_token).digest('hex'),{user,until:Date.now()+30000});
        return {...session,wallet:chain.wallet(user.id),chain:chain.publicConfig(),initial:snapshot(user,w)};});return json(res,200,entry);
      }
      const user=await authenticated(req),w=await getWorld(user);
      if(w.catchingUp)return json(res,200,{catchingUp:true,progress:w.progress});
      if(route==='/api/merchant-chat'&&req.method==='POST'){
        const data=await body(req);if(!Object.hasOwn(MERCHANTS,data.id)||typeof data.id!=='number'||typeof data.question!=='string'||!data.question.trim()||data.question.length>240)throw fail('Choose a merchant and a message up to 240 characters.');
        if(Date.now()-(w.agentChatAt||0)<15000)throw fail('Give the merchant a moment before sending another message.',429);
        w.agentChatAt=Date.now();await runMerchant(user,w,data.id,data.question.trim());return json(res,200,{saved:true,source:'groq'});
      }
      if(route==='/api/session'&&req.method==='POST'){await serial(w,async()=>{if(!w.revision)await save(user,w);});return json(res,200,snapshot(user,w));}
      if(route==='/api/sync'&&req.method==='POST'){
        const data=await body(req);const x=data.x,z=data.z;
        if(typeof x!=='number'||typeof z!=='number'||!Number.isFinite(x)||!Number.isFinite(z)||Math.hypot(x,z)>1.001)throw fail('Invalid movement');
        w.movement=Movement.next(w.movement,{x,z},Date.now());return json(res,200,snapshot(user,w));
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
        const actor=url.searchParams.get('actor')||'player';if(!['player','ts','ow','post','crew','port','mine','farm','market','lender','jobdesk'].includes(actor))throw fail('Unknown island merchant.');
        const token_ids=['cash','timber','furniture','ore','gold','maize','cassava','milk',`trading-post:${user.id}`],wallet=chain.wallet(user.id,actor);
        return json(res,200,{network:chain.publicConfig().network,contractId:chain.publicConfig().contractId,wallet,actor,identityType:'managed contract-ledger identity',token_ids,balances:await chain.view('mt_batch_balance_of',{account_id:wallet,token_ids})});
      }
      throw fail('Endpoint not found',404);
    }
    if(req.method!=='GET'&&req.method!=='HEAD')throw fail('Method not allowed',405);
    const allowed={
      '/':'game/aftermarket.html','/aftermarket.html':'game/aftermarket.html','/client.js':'game/client.bundle.js','/shell.css':'game/shell.css',
      '/shared/movement-view.js':'shared/movement-view.js','/shared/core.js':'shared/core.js','/shared/state.js':'shared/state.js','/shared/merchant-rules.js':'shared/merchant-rules.js',
      '/vendor/three.min.js':'node_modules/three/build/three.min.js',
      '/assets/aftermarket-logo.jpg':'game/assets/aftermarket-logo.jpg','/assets/aftermarket-mark.svg':'game/assets/aftermarket-mark.svg','/assets/favicon.svg':'game/assets/favicon.svg','/favicon.ico':'game/assets/favicon.svg'
    };
    if(!Object.hasOwn(allowed,route))throw fail('Not found',404);
    const file=path.join(root,allowed[route]);const type=file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.jpg')?'image/jpeg':'text/javascript; charset=utf-8';
    const data=await fs.promises.readFile(file);res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:data);
  }catch(e){if(e.status>=500||!e.status)console.error('Request failed:',e.message);json(res,e.status||500,{error:e.status?e.message:'The server could not complete this request.'});}
});

let settling=false,settlementRetryAt=0;
const ticker=setInterval(()=>{const now=Date.now();for(const [id,promise] of worlds){promise.then(w=>{
  if(w.busy&&!w.backgroundSaving)return;
  const actual=Math.max(0,(now-w.wallTimestamp)/1000);
  const accelerated=w.demoUntil>w.wallTimestamp?Math.max(0,(Math.min(now,w.demoUntil)-w.wallTimestamp)/1000):0;
  const remaining=actual+accelerated*48;
  if(!w.demoUntil||w.demoUntil<=now){const m=w.movement;if(Movement.live(m,now)&&!w.game.Sim.harvesting&&!w.game.Sim.Talk.cur)w.game.Sim.player.move(m.x*6*Math.min(actual,.1),m.z*6*Math.min(actual,.1));}
  Simulation.advance(w.game,remaining);w.wallTimestamp=now;
  if(!w.busy&&now-w.lastSave>10000)serial(w,()=>save({id},w),{background:true}).catch(e=>{console.error('Autosave:',e.message);worlds.delete(id);});
}).catch(e=>{console.error('Simulation stopped:',e.message);worlds.delete(id);});}
},50);
const worker=setInterval(async()=>{
  if(!store.ready||!chain.ready||!chain.publicConfig().settlement||settling||Date.now()<settlementRetryAt)return;
  settling=true;try{await require('./settlement.cjs').drain({store,chain});}catch(e){console.error('Settlement needs attention:',e.message);settlementRetryAt=Date.now()+30000;}finally{settling=false;}
},4000);
// Optional slow agent decisions never run under the simulation/movement lock.
// Deterministic NPCs continue at full speed when Groq is disabled or unavailable.
const agentWorker=setInterval(()=>{
  if(!merchantAgent.ready||merchantAgent.active||!store.ready||!chain.ready)return;
  for(const [id,promise]of worlds){promise.then(w=>{
    if(w.busy||w.agentBusy||w.catchingUp||w.demoUntil>Date.now()||Date.now()-w.lastSeen>60000||Date.now()-(w.agentAt||0)<60000)return;
    w.agentAt=Date.now();const merchant=[10,11,24][(w.agentTurn||0)%3];w.agentTurn=(w.agentTurn||0)+1;
    runMerchant({id},w,merchant).catch(()=>{});
  }).catch(()=>{});}
},10000);
const cleanup=setInterval(()=>{const now=Date.now();for(const [key,value]of tokens)if(value.until<now)tokens.delete(key);for(const [key,value]of limits)if(now-value.start>60000)limits.delete(key);for(const [key,p]of worlds)p.then(w=>{if(!w.busy&&now-w.lastSeen>120000)worlds.delete(key);});},60000);
if(require.main===module)server.listen(runtime.port,runtime.host,()=>console.log(`AFTERMARKET http://${runtime.host}:${runtime.port} | ${runtime.mode} | ${chain.publicConfig().network} | ${store.ready&&chain.ready?'configured':'waiting for server environment configuration'}`));
async function shutdown(){clearInterval(ticker);clearInterval(worker);clearInterval(agentWorker);clearInterval(cleanup);await Promise.all([...worlds.entries()].map(async([id,p])=>{const w=await p;await serial(w,()=>save({id},w)).catch(e=>console.error('Final save:',e.message));}));server.close();}
process.once('SIGINT',()=>shutdown().then(()=>process.exit()));process.once('SIGTERM',()=>shutdown().then(()=>process.exit()));
module.exports={server,shutdown};
