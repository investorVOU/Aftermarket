import {createClient} from '@supabase/supabase-js';
import {setupNavigation} from './navigation.js';
import MovementView from '../shared/movement-view.js';
import GameSync from '../shared/sync-transport.js';
import GameHTTP from '../shared/http-client.js';

const A=globalThis.AftermarketApp;
if(!A)throw new Error('The island renderer could not start.');
const {Game:G,Net:N,Input,Phone,UI,CamRig}=A,{Eco:E,Sim:S,Bus}=G;
N.view=new MovementView(S.Col);
const money=n=>'$'+(n/100).toFixed(2);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let quotesSignature='',ownershipRequest=0;
let auth,session,sequence=0,chainInfo,settlement=[],polling=false,commandQueue=Promise.resolve(),isDevelopment=false,settlementPolling=false;
let disposed=false,syncTimer,configReadyAt=0;
const snapshotOrder=new GameSync.SnapshotOrder();
N.diagnostics={syncLatencyMs:[],applyMs:[],ignoredSnapshots:0,authoritativePositionWrites:0,maxConcurrentStateRequests:0};

const shell=document.createElement('div');shell.id='game-shell';shell.innerHTML=`
  <header class="am-topbar"><a class="am-brand" href="/" aria-label="Aftermarket home"><img class="am-mark" src="/assets/aftermarket-mark.svg" alt="" width="34" height="34"><span>AFTERMARKET<small>SUPPLY & SURVIVAL</small></span></a>
    <div class="am-session"><span id="am-connection" class="am-connection">Connecting</span><span class="am-mainnet">A SMALL ISLAND</span></div>
    <div class="am-metrics"><span><small>GAME CASH</small><b id="am-cash">$50.00</b></span><span><small>REPUTATION</small><b id="am-rep">0</b></span><span><small>ISLAND TIME</small><b id="am-time">07:30</b></span></div>
    <button class="am-icon-button" id="am-menu" aria-label="Open island market">☷</button>
  </header>
  <aside class="am-mission"><div class="am-eyebrow">YOUR NEXT MOVE <span id="am-progress">01 / 04</span></div><h2 id="am-goal">Make your first sale.</h2><p id="am-goal-copy">Gather timber in the Northern Forest, then bring it to Oak & Iron.</p><button id="am-guide" class="am-link">Show me the way <span>↗</span></button><div class="am-mission-footer"><span id="am-pack">0 timber in your pack</span><span id="am-saved">Sign in to save</span></div></aside>
  <section id="am-map-panel" class="am-map-panel" role="dialog" aria-modal="false" aria-labelledby="am-map-title" hidden>
    <header class="am-map-head"><div><span class="am-eyebrow">FIND YOUR NEXT MOVE</span><h2 id="am-map-title">Your island.</h2></div><button type="button" id="am-close-map" class="am-icon-button" aria-label="Close island map">×</button></header>
    <canvas id="am-map" width="880" height="540" aria-label="Island map. Tap a location to mark a waypoint. Landmark buttons are below."></canvas>
    <div id="am-landmarks" class="am-landmarks" aria-label="Choose a destination"></div>
    <footer class="am-map-foot"><div><b id="am-map-destination">Explore the island</b><span id="am-map-distance" aria-live="polite">Tap the map or choose a landmark</span></div><button type="button" id="am-clear-waypoint" disabled>Clear marker</button></footer>
  </section>
  <nav id="am-camera" class="am-camera" aria-label="Camera controls"><div class="am-camera-quick"><button type="button" id="am-zoom-in" aria-label="Zoom in" title="Zoom in (+)">+</button><button type="button" id="am-zoom-out" aria-label="Zoom out" title="Zoom out (−)">−</button><button type="button" id="am-camera-reset" aria-label="Reset camera and follow player" title="Reset view (R)">⌖</button></div><details id="am-camera-more"><summary>Camera <span aria-hidden="true">⌃</span></summary><div class="am-camera-options"><button type="button" id="am-orbit-left" aria-label="Rotate camera left">↶ Left</button><button type="button" id="am-orbit-right" aria-label="Rotate camera right">Right ↷</button><button type="button" id="am-tilt-up" aria-label="Raise camera angle">↑ Raise</button><button type="button" id="am-tilt-down" aria-label="Lower camera angle">↓ Lower</button><small>Drag to orbit · Pinch or scroll to zoom<br>Shift-drag / two fingers to pan</small></div></details></nav>
  <footer class="am-footer"><span id="am-news">A new day. A town full of possibilities.</span><div><kbd>WASD</kbd> Move <kbd>F</kbd> Interact <kbd>P</kbd> Phone <kbd>M</kbd> Map <kbd>R</kbd> Reset view</div></footer>
  <aside id="am-market" class="am-drawer" hidden><div class="am-drawer-head"><div><span class="am-eyebrow">THE ISLAND EXCHANGE</span><h2>Follow the market.</h2></div><button id="am-close-market" class="am-icon-button" aria-label="Close market">×</button></div><p class="am-muted">Supply changes. Prices respond. Find your opening.</p><div class="am-economy-stats" id="am-economy-stats"></div><canvas id="am-price-history" width="600" height="130" aria-label="Timber price history"></canvas><div id="am-quotes"></div><div id="am-economic-events" class="am-economic-events"></div><div class="am-demo"><span class="am-eyebrow">WATCH THE ECONOMY MOVE</span><h3>Seven days. One minute.</h3><p>Accelerate this island to see supply, demand and merchant treasuries change. Progress is saved.</p><button id="am-demo">Start economy preview ↗</button><small id="am-demo-status">Trading pauses during the preview.</small></div><section id="am-inventory" class="am-inventory"><span class="am-eyebrow">INVENTORY</span><h3>Your belongings.</h3><div id="am-inventory-items"></div><h3>Receipts</h3><div id="am-receipts"></div><details id="am-chain-verify" class="am-chain"><summary>Verify on-chain</summary><p>Optional technical verification on NEAR testnet. Recent gameplay can be ahead of final ownership.</p><code id="am-wallet">Sign in to view this identity</code><div id="am-settlement"></div><div id="am-ownership" hidden><label for="am-actor">Verified inventory for</label><select id="am-actor"><option value="player">You</option><option value="ts">Timber Supply</option><option value="ow">Oak &amp; Iron</option><option value="post">Trading Post</option><option value="farm">Greenfield Farm</option><option value="market">Harbour Market</option><option value="port">Port Warehouse</option><option value="crew">Forestry Crew</option><option value="mine">Gold Mine</option></select><code id="am-owner-id"></code><button type="button" id="am-refresh-ownership">Refresh verified inventory</button><div id="am-owned-items" role="status" aria-live="polite"></div></div><p>Managed in-game wallet and contract-held ledger identities; merchants are not funded native NEAR accounts. Credits are non-redeemable. The operator covers testnet fees.</p></details></section><button id="am-signout" class="am-link">Save & sign out ↗</button></aside>
  <div id="am-toast" role="status" aria-live="polite"></div>
  <section id="am-welcome" class="am-welcome"><div class="am-welcome-copy"><img class="am-welcome-logo" src="/assets/aftermarket-mark.svg" width="90" height="52" alt="Aftermarket logo"><span class="am-eyebrow">WELCOME TO AFTERMARKET</span><h1>A small island.<br>A living economy.<br><em>Your next move.</em></h1><p>Gather, trade, and build a business in a town that keeps moving. Every shortage is someone's opportunity.</p><div class="am-welcome-tags"><span>29 islanders</span><span>Player-owned markets</span><span>A world that remembers</span></div></div><form id="am-login" class="am-login"><span class="am-eyebrow">YOUR ISLAND IS WAITING</span><h2>Start something<br>of your own.</h2><p>Sign in to keep your progress and belongings between visits.</p><label for="am-email">Email address</label><input id="am-email" name="email" type="email" placeholder="you@example.com" autocomplete="email" required><button id="am-login-button" type="submit">Email me a sign-in link ↗</button><button id="am-google" type="button" class="am-secondary" hidden>Continue with Google</button><button id="am-guest" type="button" class="am-secondary" hidden>Play as guest / demo account</button><div id="am-login-status" role="status" aria-live="polite">Checking the island connection…</div><small>Your progress and belongings are saved automatically.</small></form></section>`;
document.body.appendChild(shell);document.body.classList.add('am-enhanced');
const $=id=>document.getElementById(id);
const lenderOption=document.createElement('option');lenderOption.value='lender';lenderOption.textContent='Back Alley Credit';$('am-actor').append(lenderOption);
const jobOption=document.createElement('option');jobOption.value='jobdesk';jobOption.textContent='Reserved job wages';$('am-actor').append(jobOption);
const retryConnection=document.createElement('button');retryConnection.type='button';retryConnection.className='am-secondary';retryConnection.textContent='Retry connection';retryConnection.hidden=true;retryConnection.addEventListener('click',()=>location.reload());$('am-login-status').after(retryConnection);
const toast=message=>{const el=$('am-toast');el.textContent=message;el.classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('visible'),4500);};
const navigation=setupNavigation({document,window,Sim:S,Input,CamRig,Phone,Net:N,Bus,toast});
Bus.on('job:track',job=>navigation.setWaypoint(job.x,job.z,job.title));
function setConnection(text,ok=false){$('am-connection').textContent=text;$('am-connection').classList.toggle('online',ok);}
async function api(route,body){const headers={Authorization:`Bearer ${session?.access_token}`};if(body)headers['Content-Type']='application/json';const started=performance.now();const data=await GameHTTP.requestJSON('/api/'+route,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined},route==='session'?30000:15000);data.roundTripMs=performance.now()-started;return data;}
let phoneSignature='',uiSignature='',lastHudUpdate=-Infinity;
const stateTransport=new GameSync.StateTransport(api);
N.stop=()=>{disposed=true;clearTimeout(syncTimer);N.movement={x:0,z:0};N.online=false;return stateTransport.tail;};
window.addEventListener('pagehide',N.stop);
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
function normalPhoneRender(){if(!Phone.open||Phone.touching||Phone.app==='settings'||document.activeElement?.id==='ph-merchant-question')return;const signature=JSON.stringify([Phone.app,S.Msg.rev,S.Talk.rev,E.player.cash,E.player.inv,E.ts.inv,E.ow.inv,E.farm.inv,E.credit,E.lender?.cash,Phone.app==='jobs'?E.employment:null,Phone.app==='biz'?Math.floor(S.time):Math.floor(S.time/2)]);if(signature!==phoneSignature){phoneSignature=signature;Phone.render();}}
function apply(data,immediate=false){
  if(disposed)return;
  // An older polling response must never overwrite a newer action response.
  if(!snapshotOrder.accept(data)){N.diagnostics.ignoredSnapshots++;return;}
  const started=performance.now();if(S.player.x!==data.state.player.x||S.player.z!==data.state.player.z)N.diagnostics.authoritativePositionWrites++;
  const wasTalking=Boolean(S.Talk.cur);globalThis.GameState.apply(G,data.state);N.revision=data.revision;chainInfo=data.chain;N.chain=data.chain;N.demo=data.demo;N.view.accept(data.state.player,data.movement||{x:0,z:0},data.roundTripMs);normalPhoneRender();
  for(const event of data.events||[])if(event.id>sequence){Bus.emit('notify',event.message);sequence=event.id;}
  if(!wasTalking&&S.Talk.cur)Bus.emit('talk:open',S.Talk.cur.id);
  if(UI.open){const signature=JSON.stringify([UI.tab,E.player.cash,E.player.inv,E.ts,E.ow,E.post,E.farm,E.market,S.Talk.rev]);if(signature!==uiSignature){uiSignature=signature;UI.render();}}else uiSignature='';
  text('am-wallet',data.wallet);setConnection('Saved · online',true);text('am-saved','Autosave on');if(!$('am-market').hidden)renderInventory();if(immediate||performance.now()-lastHudUpdate>=250)update();
  N.diagnostics.applyMs.push(performance.now()-started);N.diagnostics.applyMs=N.diagnostics.applyMs.slice(-60);N.diagnostics.maxConcurrentStateRequests=stateTransport.maxActive;
}
N.command=(name,args={})=>{
  if(!N.online){toast('Sign in and reconnect to continue.');return Promise.resolve();}
  const id=crypto.randomUUID();
  const run=commandQueue.then(async()=>{setConnection('Saving…');try{apply(await stateTransport.request('action',{id,name,args}),true);}catch(error){toast(error.message);if(error.status&&error.status<500&&error.status!==401){setConnection('Saved · online',true);return;}N.online=false;N.blocked=true;setConnection('Reconnecting');await connect().catch(()=>{});}});
  commandQueue=run.catch(()=>{});return run;
};
// Every money, inventory and dialogue mutation is sent as a validated server intent.
for(const [method,name]of Object.entries({buyTimber:'buyTimber',sellTimber:'sellTimber',buyFurn:'buyFurn',contractAct:'contract',buyPost:'buyPost',stock:'stock',upgrade:'upgrade',sellAgri:'sellAgri',sellGold:'sellGold',sellFurniture:'sellFurniture',processOre:'processOre'}))E[method]=()=>N.command(name);
E.buyFarm=(item,q=1)=>{if(!['maize','cassava','milk'].includes(item)||![1,5].includes(q))return;let result;for(let i=0;i<q;i++)result=N.command('buy_'+item);return result;};
E.setPrice=delta=>N.command('setPrice',{delta});E.move=amount=>N.command('moveCapital',{amount});
S.startHarvest=id=>N.command('harvest',{id});S.Talk.open=id=>N.command('talk',{id});S.Talk.choose=option=>N.command('choose',{option});S.Talk.close=()=>N.command('closeTalk');
S.startCraft=()=>N.command('craft');
S.Msg.ask=(id,topic)=>N.command('message',{id,topic});
S.Msg.call=id=>N.command('call',{id});
N.askMerchant=async(id,question)=>{
 if(Phone.aiBusy)return;Phone.aiBusy=true;Phone.render('msg');
 try{await api('merchant-chat',{id,question});apply(await stateTransport.request('session',{}),true);}catch(error){toast(GameHTTP.friendlyError(error));}finally{Phone.aiBusy=false;Phone.render('msg');}
};

let connecting;
function connect(){if(connecting)return connecting;connecting=connectOnce().finally(()=>{connecting=null;});return connecting;}
function enterIsland(data){apply(data,true);N.online=true;N.blocked=false;$('am-welcome').hidden=true;document.body.classList.remove('am-welcoming');setConnection('Saved · online',true);}
async function connectOnce(){
  if(!session||disposed)return;const data=await stateTransport.request('session',{});if(disposed)return;if(data.catchingUp){setConnection('Island catching up');$('am-login-status').textContent=`Your island kept moving. Catching up… ${Math.round(data.progress*100)}%`;setTimeout(()=>connect().catch(e=>{if(!disposed)toast(e.message);}),1000);return;}enterIsland(data);
}
async function sync(){if(disposed||!session||polling||!N.online)return;polling=true;try{const data=await stateTransport.request('sync',()=>N.blocked?{x:0,z:0}:{...N.movement});N.diagnostics.syncLatencyMs.push(data.roundTripMs);N.diagnostics.syncLatencyMs=N.diagnostics.syncLatencyMs.slice(-60);apply(data);}catch(error){if(disposed)return;N.online=false;N.blocked=true;setConnection('Connection lost');toast('Connection lost. Your last confirmed save is safe.');}finally{polling=false;}}
let lastMovement='',lastMovementSent=0;
async function pollMovement(){if(disposed)return;const started=performance.now(),m=N.blocked?{x:0,z:0}:N.movement,key=m.x+','+m.z,moving=m.x!==0||m.z!==0;
  try{if(key!==lastMovement||started-lastMovementSent>=(moving?150:1000)){lastMovement=key;lastMovementSent=started;await sync();}}finally{if(!disposed)syncTimer=setTimeout(pollMovement,Math.max(20,50-(performance.now()-started)));}}pollMovement();
setInterval(async()=>{if(disposed||!session||settlementPolling)return;settlementPolling=true;try{if(!N.online)await connect();if(!$('am-chain-verify').open)return;settlement=(await api('settlements')).settlements;renderSettlement();}catch{/* Main gameplay reports connection failures. */}finally{settlementPolling=false;}},5000);
let inventorySignature='';
function renderInventory(){
  const player=E.player,signature=JSON.stringify([player.inv,player.hist]);if(signature===inventorySignature)return;inventorySignature=signature;
  const items=$('am-inventory-items');items.replaceChildren();
  for(const [item,quantity]of Object.entries(player.inv)){const row=document.createElement('p');row.textContent=item==='gold'?'Gold: '+(quantity/1000).toFixed(3)+' g':item.charAt(0).toUpperCase()+item.slice(1)+': '+quantity;items.append(row);}
  const receipts=$('am-receipts');receipts.replaceChildren();
  for(const text of player.hist.slice(0,6)){const p=document.createElement('p');p.textContent=text;receipts.append(p);}
  if(!player.hist.length)receipts.textContent='Your trades and crafting receipts will appear here.';
}
$('am-chain-verify').addEventListener('toggle',()=>{if($('am-chain-verify').open){renderSettlement();if(chainInfo?.settlement)readOwnership();}});
function renderSettlement(){
  $('am-ownership').hidden=!chainInfo?.settlement;const el=$('am-settlement');el.replaceChildren();
  for(const row of settlement.slice(0,3)){const p=document.createElement('p');p.className='am-receipt';if(row.transaction_hash){const a=document.createElement('a');a.href=(chainInfo?.network==='testnet'?'https://testnet.nearblocks.io/txns/':'https://nearblocks.io/txns/')+encodeURIComponent(row.transaction_hash);a.target='_blank';a.rel='noopener noreferrer';a.textContent='Confirmed on NEAR ↗';p.appendChild(a);}else p.textContent=row.status==='confirmed'?'Checkpoint confirmed; original receipt unavailable':row.error?'Settlement needs attention':'Settling inventory…';el.appendChild(p);}
}
function text(id,value){const el=$(id),next=String(value??'');if(el.textContent!==next)el.textContent=next;}
function update(){
  if(disposed)return;
  lastHudUpdate=performance.now();
  document.body.classList.toggle('market-open',!$('am-market').hidden);$('am-cash').textContent=money(E.player.cash);$('am-rep').textContent=E.rep;
  $('am-time').textContent=String(Math.floor(S.clock.h)).padStart(2,'0')+':'+String(Math.floor(S.clock.h%1*60)).padStart(2,'0');
  $('am-pack').textContent=`${E.player.inv.timber} timber · ${E.player.inv.ore||0} ore`;
  const step=!E.sold?0:!E.ms.trade?1:!E.post.owner?2:3;
  const goals=[['Make your first sale.','Gather timber in the Northern Forest, then bring it to Oak & Iron.',E.player.inv.timber?[24,7]:[-30,-17]],['Learn both sides of a trade.','Buy one timber from Timber Supply. Buying and selling unlocks your first business.',[-24,9]],['A business with your name on it.','Earn $150, then buy the Harbour Road Trading Post. Your phone has the latest offers.',[8,9]],['Give the town a better deal.','Stock your Trading Post and price timber below the supplier to win workshop orders.',[8,9]]];
  $('am-goal').textContent=goals[step][0];$('am-goal-copy').textContent=goals[step][1];$('am-progress').textContent=`0${step+1} / 04`;$('am-guide').dataset.target=goals[step][2].join(',');
  if(N.demo?.active){$('am-news').textContent=`Economy preview · ${N.demo.secondsRemaining}s remaining · 49× island time`;N.blocked=true;}else{if(N.online)N.blocked=!$('am-welcome').hidden||!$('am-market').hidden;$('am-news').textContent=E.log[0]||'A new day. A town full of possibilities.';}
  $('am-demo').textContent=N.demo?.active?'Return to normal time':'Start economy preview ↗';
  if(!$('am-market').hidden)renderQuotes();navigation.draw();
}
function renderQuotes(){
  const signature=JSON.stringify([E.merchants,E.merchantProfiles,E.economicEvents,E.transactionSequence]);if(signature===quotesSignature)return;quotesSignature=signature;
  const yard=E.merchantProfiles?.ts,day=1+Math.floor(S.time/S.clock.DAYLEN);$('am-economy-stats').innerHTML='<span><small>ISLAND DAY</small><b>'+day+'</b></span><span><small>YARD TREASURY</small><b>'+money(E.ts.cash)+'</b></span><span><small>TRADES</small><b>'+E.transactionSequence+'</b></span>';
  const canvas=$('am-price-history'),ctx=canvas.getContext('2d'),history=E.priceHistory||[];if(ctx){ctx.clearRect(0,0,600,130);ctx.fillStyle='#1d3026';ctx.fillRect(0,0,600,130);const values=history.map(p=>p.prices.timber);if(values.length>1){const lo=Math.min(...values)-100,hi=Math.max(...values)+100;ctx.strokeStyle='#dcb783';ctx.lineWidth=3;ctx.beginPath();values.forEach((v,i)=>{const x=12+i/(values.length-1)*576,y=100-(v-lo)/(hi-lo)*70;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();ctx.fillStyle='#c5cfb9';ctx.font='18px system-ui';ctx.fillText('TIMBER '+money(values[0])+' to '+money(values.at(-1)),12,124);canvas.setAttribute('aria-label','Timber price changed from '+money(values[0])+' to '+money(values.at(-1)));}}
  const events=$('am-economic-events');events.replaceChildren();for(const event of (E.economicEvents||[]).slice(-4).reverse()){const p=document.createElement('p');p.textContent=event.message;events.append(p);}
  const root=$('am-quotes');root.replaceChildren();const labels={timber:'Timber Supply · timber',workshop:'Oak & Iron · buys timber',furniture:'Oak & Iron · furniture',maize:'Greenfield · maize',cassava:'Greenfield · cassava',milk:'Greenfield · milk'};
  for(const [id,q]of Object.entries(E.merchants||{})){const row=document.createElement('article');row.className='am-quote';row.innerHTML=`<div><span>${esc(labels[id]||id)}</span><b>${money(q.price)} <small class="${q.trend}">${q.trend==='rising'?'↗':q.trend==='falling'?'↘':'→'}</small></b></div><p title="${esc(q.reason)}">${esc(q.reason)}</p>`;const profile=E.merchantProfiles?.[q.biz];if(profile){const p=document.createElement('small');p.className='am-merchant-state';p.textContent=profile.state+' | stock '+q.stock+' | treasury '+money(profile.cash)+(profile.arrears?' | arrears '+money(profile.arrears):'');row.append(p);}if(q.closed){const b=document.createElement('button');b.textContent='Invest $20 toward recovery';b.addEventListener('click',()=>N.command('invest',{business:q.biz}));row.appendChild(b);}root.appendChild(row);}
}
$('am-menu').addEventListener('click',()=>{navigation.setMap(false,{focus:false});Phone.minimize();Input.reset();$('am-market').hidden=false;document.body.classList.add('market-open');N.blocked=true;renderQuotes();renderSettlement();renderInventory();});$('am-close-market').addEventListener('click',()=>{$('am-market').hidden=true;document.body.classList.remove('market-open');if(N.online&&!N.demo?.active)N.blocked=false;});
Bus.on('chain:inspect',()=>{$('am-menu').click();$('am-inventory').scrollIntoView({block:'start',behavior:'smooth'});});
$('am-guide').addEventListener('click',()=>{const [x,z]=$('am-guide').dataset.target.split(',').map(Number);navigation.setWaypoint(x,z,'Your next objective');});
$('am-demo').addEventListener('click',()=>N.command(N.demo?.active?'demoStop':'demoStart'));
$('am-signout').addEventListener('click',async()=>{N.blocked=true;N.movement={x:0,z:0};try{await api('sync',{x:0,z:0});await auth.auth.signOut();location.reload();}catch(e){toast(e.message);}});
$('am-login').addEventListener('submit',async ev=>{ev.preventDefault();if(isDevelopment||!auth)return;const button=$('am-login-button');button.disabled=true;const {error}=await auth.auth.signInWithOtp({email:$('am-email').value,options:{emailRedirectTo:location.origin}});$('am-login-status').textContent=error?error.message:'Check your email. Your sign-in link brings you back to the island.';button.disabled=false;});
$('am-google').addEventListener('click',async()=>{const {error}=await auth.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin}});if(error)$('am-login-status').textContent=error.message;});
document.body.classList.add('am-welcoming');
for(const el of [shell.querySelector('.am-login'),$('am-market')]){el.addEventListener('keydown',e=>e.stopPropagation());el.addEventListener('pointerdown',e=>e.stopPropagation());}
window.addEventListener('blur',()=>{N.movement={x:0,z:0};});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('am-market').hidden){$('am-market').hidden=true;e.stopPropagation();}},true);
async function readOwnership(){
  const request=++ownershipRequest;const button=$('am-refresh-ownership'),root=$('am-owned-items');button.disabled=true;root.textContent='Reading final testnet state...';
  try{const data=await api('ownership?actor='+encodeURIComponent($('am-actor').value));if(request!==ownershipRequest)return;if(data.catchingUp){root.textContent='Your island is catching up. Refresh when it is ready.';return;}$('am-owner-id').textContent=data.wallet;root.replaceChildren();const table=document.createElement('table');table.innerHTML='<thead><tr><th>Item</th><th>Confirmed balance</th></tr></thead>';const body=document.createElement('tbody');for(let i=0;i<data.token_ids.length;i++){const id=data.token_ids[i],amount=BigInt(data.balances[i]);if(id.startsWith('trading-post:')&&amount===0n)continue;const row=document.createElement('tr'),name=document.createElement('td'),value=document.createElement('td');name.textContent=id.startsWith('trading-post:')?'Trading Post licence':id==='cash'?'Game credits (non-redeemable)':id;value.textContent=id==='cash'?(amount/100n)+'.'+String(amount%100n).padStart(2,'0'):id==='gold'?(amount/1000n)+'.'+String(amount%1000n).padStart(3,'0')+' g':String(amount);row.append(name,value);body.append(row);}table.append(body);root.append(table);const note=document.createElement('small');note.textContent='Final contract state. Recent gameplay may still be awaiting settlement. Managed identities are held in the multi-token contract; native NEAR accounts are not funded for every merchant.';root.append(note);}
  catch(error){if(request===ownershipRequest)root.textContent=error.message;}finally{if(request===ownershipRequest)button.disabled=false;}
}
$('am-refresh-ownership').addEventListener('click',readOwnership);$('am-actor').addEventListener('change',readOwnership);
$('am-guest').addEventListener('click',async()=>{
 const button=$('am-guest');if(!auth||button.disabled)return;button.disabled=true;retryConnection.hidden=true;text('am-login-status','Connecting to the island…');
 const slow=setTimeout(()=>text('am-login-status','The island is taking a little longer to open. Keep this page open; we are still connecting.'),8000);
 try{
  if(!session){
   // Warm the service with a safe read before creating an identity. Never
   // automatically retry a timed-out guest POST: it may already have succeeded.
   if(performance.now()-configReadyAt>30000)await GameHTTP.requestJSON('/api/health',{},60000);
   text('am-login-status','Preparing your guest island…');
   const data=await GameHTTP.requestJSON('/api/guest',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'},45000);
   session={access_token:data.access_token,refresh_token:data.refresh_token};
   // The server already authenticated and atomically saved this new island.
   // Show it immediately; SDK persistence must not add another world round trip.
   if(data.initial?.state)enterIsland(data.initial);
   const result=await auth.auth.setSession(session);if(result.error)throw result.error;session=result.data.session;
  }
  if(!N.online)await connect();if(N.online)toast('Guest demo: progress stays in this browser session. Use email sign-in for your personal island.');
 }catch(error){text('am-login-status',GameHTTP.friendlyError(error));retryConnection.hidden=false;}finally{clearTimeout(slow);button.disabled=false;}
});
async function start(){
  try{const config=await GameHTTP.requestJSON('/api/config',{},60000);configReadyAt=performance.now();chainInfo=config.chain;N.chain=config.chain;N.merchantAI=config.merchantAI;document.querySelector('.am-mainnet').textContent='A SMALL ISLAND';
    if(config.chain.network==='offchain'){document.querySelector('.am-chain>p').textContent='Saved inventory; external ownership verification is unavailable on this island.';document.querySelector('.am-login>small').textContent='Your progress and belongings are saved automatically.';}
    if(config.chain.network==='mainnet')document.querySelector('.am-demo').hidden=true;
    if(config.mode==='development'){
      isDevelopment=true;
      $('am-email').hidden=true;$('am-email').required=false;document.querySelector('label[for="am-email"]').hidden=true;
      $('am-login-button').textContent='Enter development island ↗';$('am-login-status').textContent='Local saved game. No blockchain credentials or real on-chain assets are used.';document.querySelector('.am-login>small').textContent='Your progress is saved on this computer.';
      document.querySelector('.am-chain>p').textContent='Local development inventory. Connect Supabase and NEAR to enable on-chain assets.';
      $('am-login').addEventListener('submit',async ev=>{ev.preventDefault();let id=localStorage.getItem('aftermarket-dev-player');if(!id){id=crypto.randomUUID();localStorage.setItem('aftermarket-dev-player',id);}session={access_token:'dev-'+id};auth={auth:{signOut:async()=>{session=null;}}};try{await connect();}catch(e){$('am-login-status').textContent=e.message;}});setConnection('Local development');return;
    }
    if(!config.configured){$('am-login-button').disabled=true;$('am-email').disabled=true;setConnection('Island opening soon');$('am-login-status').textContent=location.hostname==='localhost'||location.hostname==='127.0.0.1'?'Setup needed: add Supabase and NEAR testnet credentials to .env, apply the migration, and restart.':'The island is preparing to open. Please come back soon.';return;}
    auth=createClient(config.supabaseUrl,config.supabaseKey);$('am-guest').hidden=!config.guestEnabled;$('am-google').hidden=!config.googleEnabled;$('am-login-status').textContent='Your progress follows you from one device to the next.';
    const {data,error}=await auth.auth.getSession();if(error)throw error;session=data.session;
    auth.auth.onAuthStateChange((_event,next)=>{const previousId=session?.user?.id;session=next;if(next&&(!N.online||previousId&&previousId!==next.user.id))setTimeout(()=>connect().catch(e=>{$('am-login-status').textContent=e.message;}),0);});
    if(session)await connect();else setConnection('Sign in to play');
  }catch(error){text('am-login-status',GameHTTP.friendlyError(error));retryConnection.hidden=false;setConnection('Unable to connect');}
}
setInterval(update,500);update();start();
