import {createClient} from '@supabase/supabase-js';
import {setupNavigation} from './navigation.js';

const A=globalThis.AftermarketApp;
if(!A)throw new Error('The island renderer could not start.');
const {Game:G,Net:N,Input,Phone,UI,CamRig}=A,{Eco:E,Sim:S,Bus}=G;
const money=n=>'$'+(n/100).toFixed(2);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let quotesSignature='',ownershipRequest=0;
let auth,session,sequence=0,lastApplied=0,chainInfo,settlement=[],polling=false,commandQueue=Promise.resolve(),isDevelopment=false;

const shell=document.createElement('div');shell.id='game-shell';shell.innerHTML=`
  <header class="am-topbar"><a class="am-brand" href="/" aria-label="Aftermarket home"><span class="am-mark">A<span>↗</span></span><span>AFTERMARKET<small>SUPPLY & SURVIVAL</small></span></a>
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
  <aside id="am-market" class="am-drawer" hidden><div class="am-drawer-head"><div><span class="am-eyebrow">THE ISLAND EXCHANGE</span><h2>Follow the market.</h2></div><button id="am-close-market" class="am-icon-button" aria-label="Close market">×</button></div><p class="am-muted">Supply changes. Prices respond. Find your opening.</p><div class="am-economy-stats" id="am-economy-stats"></div><canvas id="am-price-history" width="600" height="130" aria-label="Timber price history"></canvas><div id="am-quotes"></div><div id="am-economic-events" class="am-economic-events"></div><div class="am-demo"><span class="am-eyebrow">WATCH THE ECONOMY MOVE</span><h3>Seven days. One minute.</h3><p>Accelerate this island to see supply, demand and merchant treasuries change. Progress is saved.</p><button id="am-demo">Start economy preview ↗</button><small id="am-demo-status">Trading pauses during the preview.</small></div><div class="am-chain"><span class="am-eyebrow">YOUR NEAR WALLET</span><code id="am-wallet">Sign in to create your wallet</code><div id="am-settlement"></div><div id="am-ownership" hidden><label for="am-actor">On-chain inventory for</label><select id="am-actor"><option value="player">You</option><option value="ts">Timber Supply</option><option value="ow">Oak &amp; Iron</option><option value="post">Trading Post</option><option value="farm">Greenfield Farm</option><option value="market">Harbour Market</option><option value="port">Port Warehouse</option><option value="crew">Forestry Crew</option><option value="mine">Gold Mine</option></select><code id="am-owner-id"></code><button type="button" id="am-refresh-ownership">Read testnet balances</button><div id="am-owned-items" role="status" aria-live="polite"></div></div><p>Items settle on NEAR testnet. Game credits are non-redeemable. The operator pays testnet gas and storage.</p></div><button id="am-signout" class="am-link">Save & sign out ↗</button></aside>
  <div id="am-toast" role="status" aria-live="polite"></div>
  <section id="am-welcome" class="am-welcome"><div class="am-welcome-copy"><span class="am-eyebrow">WELCOME TO AFTERMARKET</span><h1>A small island.<br>A living economy.<br><em>Your next move.</em></h1><p>Gather, trade, and build a business in a town that keeps moving. Every shortage is someone's opportunity.</p><div class="am-welcome-tags"><span>29 islanders</span><span>Player-owned markets</span><span>A world that remembers</span></div></div><form id="am-login" class="am-login"><span class="am-eyebrow">YOUR ISLAND IS WAITING</span><h2>Start something<br>of your own.</h2><p>Sign in to keep your progress and bring your inventory on-chain.</p><label for="am-email">Email address</label><input id="am-email" name="email" type="email" placeholder="you@example.com" autocomplete="email" required><button id="am-login-button" type="submit">Email me a sign-in link ↗</button><button id="am-google" type="button" class="am-secondary" hidden>Continue with Google</button><button id="am-guest" type="button" class="am-secondary" hidden>Play as guest / demo account</button><div id="am-login-status" role="status" aria-live="polite">Checking the island connection…</div><small>A managed wallet is created for you. No wallet setup or gas prompts during play.</small></form></section>`;
document.body.appendChild(shell);document.body.classList.add('am-enhanced');
const $=id=>document.getElementById(id);
const toast=message=>{const el=$('am-toast');el.textContent=message;el.classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('visible'),4500);};
const navigation=setupNavigation({document,window,Sim:S,Input,CamRig,Phone,Net:N,Bus,toast});
function setConnection(text,ok=false){$('am-connection').textContent=text;$('am-connection').classList.toggle('online',ok);}
async function api(route,body){const headers={Authorization:`Bearer ${session?.access_token}`};if(body)headers['Content-Type']='application/json';const response=await fetch('/api/'+route,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});const data=await response.json();if(!response.ok)throw Object.assign(new Error(data.error||'Connection interrupted.'),{status:response.status});return data;}
function apply(data){
  // An older polling response must never overwrite a newer action response.
  if(data.state.time<lastApplied||data.revision<(N.revision||0))return;
  const wasTalking=Boolean(S.Talk.cur);globalThis.GameState.apply(G,data.state);lastApplied=data.state.time;N.revision=data.revision;chainInfo=data.chain;N.chain=data.chain;N.demo=data.demo;
  for(const event of data.events||[])if(event.id>sequence){Bus.emit('notify',event.message);sequence=event.id;}
  if(!wasTalking&&S.Talk.cur)Bus.emit('talk:open',S.Talk.cur.id);
  if(Phone.open&&Phone.app!=='settings')Phone.render();if(UI.open)UI.render();
  $('am-wallet').textContent=data.wallet;setConnection('Saved · online',true);$('am-saved').textContent='Autosave on';update();
}
N.command=(name,args={})=>{
  if(!N.online){toast('Sign in and reconnect to continue.');return Promise.resolve();}
  const id=crypto.randomUUID();
  const run=commandQueue.then(async()=>{setConnection('Saving…');try{apply(await api('action',{id,name,args}));}catch(error){toast(error.message);if(error.status&&error.status<500&&error.status!==401){setConnection('Saved · online',true);return;}N.online=false;N.blocked=true;setConnection('Reconnecting');await connect().catch(()=>{});}});
  commandQueue=run.catch(()=>{});return run;
};
// Every money, inventory and dialogue mutation is sent as a validated server intent.
for(const [method,name]of Object.entries({buyTimber:'buyTimber',sellTimber:'sellTimber',buyFurn:'buyFurn',contractAct:'contract',buyPost:'buyPost',stock:'stock',upgrade:'upgrade',sellAgri:'sellAgri',sellGold:'sellGold',sellFurniture:'sellFurniture',processOre:'processOre'}))E[method]=()=>N.command(name);
E.buyFarm=(item,q=1)=>{if(!['maize','cassava','milk'].includes(item)||![1,5].includes(q))return;let result;for(let i=0;i<q;i++)result=N.command('buy_'+item);return result;};
E.setPrice=delta=>N.command('setPrice',{delta});E.move=amount=>N.command('moveCapital',{amount});
S.startHarvest=id=>N.command('harvest',{id});S.Talk.open=id=>N.command('talk',{id});S.Talk.choose=option=>N.command('choose',{option});S.Talk.close=()=>N.command('closeTalk');
S.startCraft=()=>N.command('craft');
S.Msg.ask=(id,topic)=>N.command('message',{id,topic});

async function connect(){
  if(!session)return;const data=await api('session',{});if(data.catchingUp){setConnection('Island catching up');$('am-login-status').textContent=`Your island kept moving. Catching up… ${Math.round(data.progress*100)}%`;setTimeout(()=>connect().catch(e=>toast(e.message)),1000);return;}apply(data);N.online=true;N.blocked=false;$('am-welcome').hidden=true;document.body.classList.remove('am-welcoming');setConnection('Saved · online',true);
}
async function sync(){if(!session||polling||!N.online)return;polling=true;try{apply(await api('sync',N.blocked?{x:0,z:0}:N.movement));}catch(error){N.online=false;N.blocked=true;setConnection('Connection lost');toast('Connection lost. Your last confirmed save is safe.');}finally{polling=false;}}
setInterval(sync,150);
setInterval(async()=>{if(!session)return;if(!N.online){try{await connect();}catch{return;}}try{settlement=(await api('settlements')).settlements;renderSettlement();}catch{/* Main gameplay reports connection failures. */}},5000);
function renderSettlement(){
  $('am-ownership').hidden=!chainInfo?.settlement;const el=$('am-settlement');el.replaceChildren();
  for(const row of settlement.slice(0,3)){const p=document.createElement('p');p.className='am-receipt';if(row.transaction_hash){const a=document.createElement('a');a.href=(chainInfo?.network==='testnet'?'https://testnet.nearblocks.io/txns/':'https://nearblocks.io/txns/')+encodeURIComponent(row.transaction_hash);a.target='_blank';a.rel='noopener noreferrer';a.textContent='Confirmed on NEAR ↗';p.appendChild(a);}else p.textContent=row.status==='confirmed'?'Checkpoint confirmed; original receipt unavailable':row.error?'Settlement needs attention':'Settling inventory…';el.appendChild(p);}
}
function update(){
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
$('am-menu').addEventListener('click',()=>{navigation.setMap(false,{focus:false});Phone.minimize();Input.reset();$('am-market').hidden=false;document.body.classList.add('market-open');N.blocked=true;renderQuotes();renderSettlement();if(chainInfo?.settlement)readOwnership();});$('am-close-market').addEventListener('click',()=>{$('am-market').hidden=true;document.body.classList.remove('market-open');if(N.online&&!N.demo?.active)N.blocked=false;});
Bus.on('chain:inspect',()=>{$('am-menu').click();$('am-ownership').scrollIntoView({block:'start',behavior:'smooth'});});
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
$('am-guest').addEventListener('click',async()=>{const button=$('am-guest');if(!auth||button.disabled)return;button.disabled=true;$('am-login-status').textContent='Creating your isolated testnet demo island...';try{const response=await fetch('/api/guest',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(20000)}),data=await response.json();if(!response.ok)throw new Error(data.error||'Guest sign-in failed.');const result=await auth.auth.setSession({access_token:data.access_token,refresh_token:data.refresh_token});if(result.error)throw result.error;session=result.data.session;await connect();toast('Guest demo: progress stays in this browser session. Use email sign-in for your personal island.');}catch(error){$('am-login-status').textContent=error.message;}finally{button.disabled=false;}});
async function start(){
  try{const config=await (await fetch('/api/config')).json();chainInfo=config.chain;N.chain=config.chain;document.querySelector('.am-mainnet').textContent=config.chain.network==='development'?'LOCAL DEVELOPMENT':config.chain.network==='offchain'?'OFF-CHAIN PLAY':'NEAR '+config.chain.network.toUpperCase();
    if(config.chain.network==='offchain'){document.querySelector('.am-chain>p').textContent='Your progress is saved in Supabase. Items are off-chain until NEAR settlement is enabled.';document.querySelector('.am-login>small').textContent='This island currently uses off-chain inventory with cloud saves.';}
    if(config.chain.network==='mainnet')document.querySelector('.am-demo').hidden=true;
    if(config.mode==='development'){
      isDevelopment=true;
      $('am-email').hidden=true;$('am-email').required=false;document.querySelector('label[for="am-email"]').hidden=true;
      $('am-login-button').textContent='Enter development island ↗';$('am-login-status').textContent='Local saved game. No blockchain credentials or real on-chain assets are used.';document.querySelector('.am-login>small').textContent='Connected mode uses Supabase sign-in and NEAR settlement.';
      document.querySelector('.am-chain>p').textContent='Local development inventory. Connect Supabase and NEAR to enable on-chain assets.';
      $('am-login').addEventListener('submit',async ev=>{ev.preventDefault();let id=localStorage.getItem('aftermarket-dev-player');if(!id){id=crypto.randomUUID();localStorage.setItem('aftermarket-dev-player',id);}session={access_token:'dev-'+id};auth={auth:{signOut:async()=>{session=null;}}};try{await connect();}catch(e){$('am-login-status').textContent=e.message;}});setConnection('Local development');return;
    }
    if(!config.configured){$('am-login-button').disabled=true;$('am-email').disabled=true;setConnection('Island opening soon');$('am-login-status').textContent=location.hostname==='localhost'||location.hostname==='127.0.0.1'?'Setup needed: add Supabase and NEAR testnet credentials to .env, apply the migration, and restart.':'The island is preparing to open. Please come back soon.';return;}
    auth=createClient(config.supabaseUrl,config.supabaseKey);$('am-guest').hidden=!config.guestEnabled;$('am-google').hidden=!config.googleEnabled;$('am-login-status').textContent='Your progress follows you from one device to the next.';
    const {data,error}=await auth.auth.getSession();if(error)throw error;session=data.session;
    auth.auth.onAuthStateChange((_event,next)=>{session=next;if(next)setTimeout(()=>connect().catch(e=>{$('am-login-status').textContent=e.message;}),0);});
    if(session)await connect();else setConnection('Sign in to play');
  }catch(error){$('am-login-status').textContent=error.message;setConnection('Unable to connect');}
}
setInterval(update,500);update();start();
