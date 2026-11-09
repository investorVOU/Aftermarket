import {createClient} from '@supabase/supabase-js';

const A=globalThis.AftermarketApp;
if(!A)throw new Error('The island renderer could not start.');
const {Game:G,Net:N,Input,Phone,UI,CamRig}=A,{Eco:E,Sim:S,Bus}=G;
const money=n=>'$'+(n/100).toFixed(2);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let auth,session,sequence=0,lastApplied=0,chainInfo,settlement=[],polling=false,commandQueue=Promise.resolve(),isDevelopment=false;
let waypoint=null;
const shell=document.createElement('div');shell.id='game-shell';shell.innerHTML=`
  <header class="am-topbar"><a class="am-brand" href="/" aria-label="Aftermarket home"><span class="am-mark">A<span>↗</span></span><span>AFTERMARKET<small>SUPPLY & SURVIVAL</small></span></a>
    <div class="am-session"><span id="am-connection" class="am-connection">Connecting</span><span class="am-mainnet">NEAR MAINNET</span></div>
    <div class="am-metrics"><span><small>GAME CASH</small><b id="am-cash">$50.00</b></span><span><small>REPUTATION</small><b id="am-rep">0</b></span><span><small>ISLAND TIME</small><b id="am-time">07:30</b></span></div>
    <button class="am-icon-button" id="am-menu" aria-label="Open island market">☷</button>
  </header>
  <aside class="am-mission"><div class="am-eyebrow">YOUR NEXT MOVE <span id="am-progress">01 / 04</span></div><h2 id="am-goal">Make your first sale.</h2><p id="am-goal-copy">Gather timber in the Northern Forest, then bring it to Oak & Iron.</p><button id="am-guide" class="am-link">Show me the way <span>↗</span></button><div class="am-mission-footer"><span id="am-pack">0 timber in your pack</span><span id="am-saved">Sign in to save</span></div></aside>
  <div class="am-map-wrap"><canvas id="am-map" width="380" height="240" aria-label="Island map with player and destination"></canvas><div><span id="am-location">HARBOUR ROAD</span><button id="am-recenter" aria-label="Recenter camera">⌖</button></div></div>
  <footer class="am-footer"><span id="am-news">A new day. A town full of possibilities.</span><div><kbd>WASD</kbd> Move <kbd>F</kbd> Interact <kbd>P</kbd> Phone <kbd>C</kbd> Recenter</div></footer>
  <aside id="am-market" class="am-drawer" hidden><div class="am-drawer-head"><div><span class="am-eyebrow">THE ISLAND EXCHANGE</span><h2>Follow the market.</h2></div><button id="am-close-market" class="am-icon-button" aria-label="Close market">×</button></div><p class="am-muted">Supply changes. Prices respond. Find your opening.</p><div id="am-quotes"></div><div class="am-demo"><span class="am-eyebrow">WATCH THE ECONOMY MOVE</span><h3>Seven days. One minute.</h3><p>Accelerate this island to see supply, demand and merchant treasuries change. Progress is saved.</p><button id="am-demo">Start economy preview ↗</button><small id="am-demo-status">Trading pauses during the preview.</small></div><div class="am-chain"><span class="am-eyebrow">YOUR NEAR WALLET</span><code id="am-wallet">Sign in to create your wallet</code><div id="am-settlement"></div><p>Items settle on NEAR mainnet. Game cash is a game credit. Gas is sponsored.</p></div><button id="am-signout" class="am-link">Save & sign out ↗</button></aside>
  <div id="am-toast" role="status" aria-live="polite"></div>
  <section id="am-welcome" class="am-welcome"><div class="am-welcome-copy"><span class="am-eyebrow">WELCOME TO AFTERMARKET</span><h1>A small island.<br>A living economy.<br><em>Your next move.</em></h1><p>Gather, trade, and build a business in a town that keeps moving. Every shortage is someone's opportunity.</p><div class="am-welcome-tags"><span>29 islanders</span><span>Player-owned markets</span><span>A world that remembers</span></div></div><form id="am-login" class="am-login"><span class="am-eyebrow">YOUR ISLAND IS WAITING</span><h2>Start something<br>of your own.</h2><p>Sign in to keep your progress and bring your inventory on-chain.</p><label for="am-email">Email address</label><input id="am-email" name="email" type="email" placeholder="you@example.com" autocomplete="email" required><button id="am-login-button" type="submit">Email me a sign-in link ↗</button><button id="am-google" type="button" class="am-secondary" hidden>Continue with Google</button><div id="am-login-status" role="status" aria-live="polite">Checking the island connection…</div><small>A managed wallet is created for you. No wallet setup or gas prompts during play.</small></form></section>`;
document.body.appendChild(shell);document.body.classList.add('am-enhanced');
const $=id=>document.getElementById(id);
const toast=message=>{const el=$('am-toast');el.textContent=message;el.classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('visible'),4500);};
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
  const el=$('am-settlement');el.replaceChildren();
  for(const row of settlement.slice(0,3)){const p=document.createElement('p');p.className='am-receipt';if(row.transaction_hash){const a=document.createElement('a');a.href=(chainInfo?.network==='testnet'?'https://testnet.nearblocks.io/txns/':'https://nearblocks.io/txns/')+encodeURIComponent(row.transaction_hash);a.target='_blank';a.rel='noopener noreferrer';a.textContent='Confirmed on NEAR ↗';p.appendChild(a);}else p.textContent=row.error?'Settlement needs attention':'Settling inventory…';el.appendChild(p);}
}
function update(){
  $('am-cash').textContent=money(E.player.cash);$('am-rep').textContent=E.rep;
  $('am-time').textContent=String(Math.floor(S.clock.h)).padStart(2,'0')+':'+String(Math.floor(S.clock.h%1*60)).padStart(2,'0');
  $('am-pack').textContent=`${E.player.inv.timber} timber · ${E.player.inv.ore||0} ore`;
  const step=!E.sold?0:!E.ms.trade?1:!E.post.owner?2:3;
  const goals=[['Make your first sale.','Gather timber in the Northern Forest, then bring it to Oak & Iron.',E.player.inv.timber?[24,7]:[-30,-17]],['Learn both sides of a trade.','Buy one timber from Timber Supply. Buying and selling unlocks your first business.',[-24,9]],['A business with your name on it.','Earn $150, then buy the Harbour Road Trading Post. Your phone has the latest offers.',[8,9]],['Give the town a better deal.','Stock your Trading Post and price timber below the supplier to win workshop orders.',[8,9]]];
  $('am-goal').textContent=goals[step][0];$('am-goal-copy').textContent=goals[step][1];$('am-progress').textContent=`0${step+1} / 04`;$('am-guide').dataset.target=goals[step][2].join(',');
  if(N.demo?.active){$('am-news').textContent=`Economy preview · ${N.demo.secondsRemaining}s remaining · 49× island time`;N.blocked=true;}else{if(N.online)N.blocked=!$('am-welcome').hidden;$('am-news').textContent=E.log[0]||'A new day. A town full of possibilities.';}
  $('am-demo').textContent=N.demo?.active?'Return to normal time':'Start economy preview ↗';
  if(!$('am-market').hidden)renderQuotes();drawMap();
}
function renderQuotes(){const root=$('am-quotes');root.replaceChildren();const labels={timber:'Timber Supply · timber',workshop:'Oak & Iron · buys timber',furniture:'Oak & Iron · furniture',maize:'Greenfield · maize',cassava:'Greenfield · cassava',milk:'Greenfield · milk'};
  for(const [id,q]of Object.entries(E.merchants||{})){const row=document.createElement('article');row.className='am-quote';row.innerHTML=`<div><span>${esc(labels[id]||id)}</span><b>${money(q.price)} <small class="${q.trend}">${q.trend==='rising'?'↗':q.trend==='falling'?'↘':'→'}</small></b></div><p title="${esc(q.reason)}">${esc(q.reason)}</p>`;if(q.closed){const b=document.createElement('button');b.textContent='Invest $20 to reopen';b.addEventListener('click',()=>N.command('invest',{business:q.biz}));row.appendChild(b);}root.appendChild(row);}
}
function drawMap(){const c=$('am-map'),ctx=c.getContext('2d'),W=c.width,H=c.height;ctx.clearRect(0,0,W,H);const map=(x,z)=>[(x+105)/220*W,(z+80)/135*H];ctx.fillStyle='#122d3a';ctx.fillRect(0,0,W,H);ctx.fillStyle='#74836a';
  for(let x=-100;x<110;x+=3)for(let z=-78;z<55;z+=3)if(S.Geo.dShore(x,z)>0){const [a,b]=map(x,z);ctx.fillRect(a,b,W/220*3.3,H/135*3.3);}
  ctx.strokeStyle='#c9c1a5';ctx.lineWidth=2;for(const road of S.Roads.defs){ctx.beginPath();road.cl.forEach(([x,z],i)=>{const [a,b]=map(x,z);i?ctx.lineTo(a,b):ctx.moveTo(a,b);});ctx.stroke();}
  for(const [x,z,label]of [[-24,9,'T'],[24,4,'W'],[8,9,'P'],[21,-36,'F']]){const [a,b]=map(x,z);ctx.fillStyle='#f2ead9';ctx.fillRect(a-4,b-4,8,8);ctx.font='bold 13px sans-serif';ctx.fillText(label,a+6,b+3);}
  if(waypoint){const [a,b]=map(...waypoint);ctx.strokeStyle='#f8d18c';ctx.lineWidth=2;ctx.beginPath();ctx.arc(a,b,9,0,Math.PI*2);ctx.stroke();}
  const [x,z]=map(S.player.x,S.player.z);ctx.fillStyle='#e8b677';ctx.beginPath();ctx.arc(x,z,6,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
}
$('am-menu').addEventListener('click',()=>{$('am-market').hidden=false;renderQuotes();renderSettlement();});$('am-close-market').addEventListener('click',()=>{$('am-market').hidden=true;});
$('am-recenter').addEventListener('click',()=>CamRig.recenter());$('am-guide').addEventListener('click',()=>{waypoint=$('am-guide').dataset.target.split(',').map(Number);toast('Destination marked on your island map.');drawMap();});
$('am-demo').addEventListener('click',()=>N.command(N.demo?.active?'demoStop':'demoStart'));
$('am-signout').addEventListener('click',async()=>{N.blocked=true;N.movement={x:0,z:0};try{await api('sync',{x:0,z:0});await auth.auth.signOut();location.reload();}catch(e){toast(e.message);}});
$('am-login').addEventListener('submit',async ev=>{ev.preventDefault();if(isDevelopment||!auth)return;const button=$('am-login-button');button.disabled=true;const {error}=await auth.auth.signInWithOtp({email:$('am-email').value,options:{emailRedirectTo:location.origin}});$('am-login-status').textContent=error?error.message:'Check your email. Your sign-in link brings you back to the island.';button.disabled=false;});
$('am-google').addEventListener('click',async()=>{const {error}=await auth.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin}});if(error)$('am-login-status').textContent=error.message;});
document.body.classList.add('am-welcoming');
for(const el of [shell.querySelector('.am-login'),$('am-market')]){el.addEventListener('keydown',e=>e.stopPropagation());el.addEventListener('pointerdown',e=>e.stopPropagation());}
window.addEventListener('blur',()=>{N.movement={x:0,z:0};});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('am-market').hidden){$('am-market').hidden=true;e.stopPropagation();}},true);
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
    if(!config.configured){$('am-login-button').disabled=true;$('am-email').disabled=true;setConnection('Island opening soon');$('am-login-status').textContent=location.hostname==='localhost'||location.hostname==='127.0.0.1'?'Setup needed: add Supabase and NEAR mainnet credentials to .env, apply the migration, and restart.':'The island is preparing to open. Please come back soon.';return;}
    auth=createClient(config.supabaseUrl,config.supabaseKey);$('am-google').hidden=!config.googleEnabled;$('am-login-status').textContent='Your progress follows you from one device to the next.';
    const {data,error}=await auth.auth.getSession();if(error)throw error;session=data.session;
    auth.auth.onAuthStateChange((_event,next)=>{session=next;if(next)setTimeout(()=>connect().catch(e=>{$('am-login-status').textContent=e.message;}),0);});
    if(session)await connect();else setConnection('Sign in to play');
  }catch(error){$('am-login-status').textContent=error.message;setConnection('Unable to connect');}
}
setInterval(update,500);update();start();
