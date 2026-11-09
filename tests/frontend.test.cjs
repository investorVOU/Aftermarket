// DOM/network integration, not visual/WebGL verification.
const {test,after}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');process.env.GAME_MODE='development';process.env.HOST='127.0.0.1';
const {server,shutdown}=require('../server/index.cjs');const ready=new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));after(()=>shutdown());
const until=async predicate=>{const deadline=Date.now()+5000;while(!predicate()){if(Date.now()>deadline)throw new Error('UI integration timed out');await new Promise(r=>setTimeout(r,20));}};
test('development onboarding, authenticated trade, market and action feedback use the real API',async()=>{
  await ready;const base=`http://127.0.0.1:${server.address().port}`;
  require('./harness.js').load();const app=globalThis.AftermarketApp;
  const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:base,runScripts:'outside-only'}),w=dom.window;
  w.AftermarketApp=app;w.GameState=require('../shared/state.js');w.AbortSignal=AbortSignal;
  Object.defineProperty(w.crypto,'randomUUID',{value:require('node:crypto').randomUUID});
  w.fetch=(url,options)=>fetch(new URL(url,base),options);
  w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>{},set:()=>true});
  try{
    w.eval(fs.readFileSync(path.join(__dirname,'../game/client.bundle.js'),'utf8'));
    await until(()=>w.document.getElementById('am-login-button').textContent.includes('development'));
    assert.equal(w.document.querySelector('.am-mainnet').textContent,'LOCAL DEVELOPMENT');
    w.document.getElementById('am-login').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
    await until(()=>app.Net.online);assert.equal(w.document.getElementById('am-welcome').hidden,true);
    await app.Net.command('buyTimber');assert.equal(app.Game.Eco.player.inv.timber,1);assert.match(w.document.getElementById('am-cash').textContent,/\$30\.00/);
    w.document.getElementById('am-menu').click();assert.equal(w.document.getElementById('am-market').hidden,false);assert.equal(w.document.querySelectorAll('.am-quote').length,6);
    await app.Net.command('craft');assert.equal(app.Net.online,true);assert.match(w.document.getElementById('am-toast').textContent,/Visit Oak & Iron/);
    w.document.getElementById('am-guide').click();assert.match(w.document.getElementById('am-toast').textContent,/Destination marked/);
  }finally{dom.window.close();}
});
