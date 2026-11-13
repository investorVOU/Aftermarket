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
    assert.equal(w.document.querySelector('.am-mainnet').textContent,'A SMALL ISLAND');
    w.document.getElementById('am-login').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
    await until(()=>app.Net.online);assert.equal(w.document.getElementById('am-welcome').hidden,true);
    await app.Net.command('buyTimber');assert.equal(app.Game.Eco.player.inv.timber,1);assert.match(w.document.getElementById('am-cash').textContent,/\$30\.00/);
    w.document.getElementById('am-menu').click();assert.equal(w.document.getElementById('am-market').hidden,false);assert.equal(w.document.querySelectorAll('.am-quote').length,6);
    assert.equal(w.document.getElementById('am-chain-verify').open,false,'technical ownership details stay collapsed');
    assert.match(w.document.getElementById('am-inventory-items').textContent,/Timber: 1/);
    assert.ok(w.document.getElementById('am-chain-verify').contains(w.document.getElementById('am-wallet')),'owner ID is inside the collapsed verification section');
    await app.Net.command('craft');assert.equal(app.Net.online,true);assert.match(w.document.getElementById('am-toast').textContent,/Visit Oak & Iron/);
    w.document.getElementById('am-guide').click();assert.match(w.document.getElementById('am-toast').textContent,/Destination marked/);
    const map=w.document.getElementById('am-map-panel');assert.equal(map.hidden,false);
    assert.equal(w.document.getElementById('am-map-toggle'),null,'no map floater covers the joystick');
    assert.equal(w.document.querySelectorAll('#am-landmarks button').length,6);
    w.document.getElementById('am-close-map').click();assert.equal(map.hidden,true);
    app.Phone.openPhone();assert.equal(app.Phone.open,true);app.Phone.openApp('map');assert.equal(map.hidden,false);assert.equal(app.Phone.open,false);
    w.document.querySelector('#am-landmarks button').click();assert.equal(w.document.getElementById('am-map-destination').textContent,'Forest');
    const c=w.document.getElementById('am-map');c.getBoundingClientRect=()=>({left:0,top:0,width:880,height:540});
    const pointer=(type,x,y)=>c.dispatchEvent(new w.MouseEvent(type,{clientX:x,clientY:y,bubbles:true,button:0}));
    const yaw=app.CamRig.gy,inventory={...app.Game.Eco.player.inv};
    pointer('pointerdown',300,200);pointer('pointercancel',300,200);pointer('pointerup',300,200);
    assert.equal(w.document.getElementById('am-map-destination').textContent,'Forest','cancelled map touches cannot place waypoints');
    // This pixel corresponds to the Timber Supply location; CSS scale is irrelevant.
    pointer('pointerdown',324,356);pointer('pointerup',324,356);
    assert.equal(w.document.getElementById('am-map-destination').textContent,'Timber Supply');
    assert.equal(app.CamRig.gy,yaw,'map touches never rotate the world');assert.deepEqual(app.Game.Eco.player.inv,inventory);
    w.document.getElementById('am-close-map').click();
    app.Input.key(true,'w');app.Input.joyDown(1,100,100);app.Phone.openPhone();app.Input.frame(.1);
    assert.equal(app.Input.I.mz,0,'opening an overlay releases held movement');
    app.Phone.close();assert.equal(app.Phone.open,false);assert.equal(app.Phone.el.inert,true);
    const beforeZoom=app.CamRig.gz;w.document.getElementById('am-zoom-in').click();assert.ok(app.CamRig.gz<beforeZoom);
    w.document.getElementById('am-orbit-left').click();assert.ok(app.CamRig.gy<yaw);
    w.document.getElementById('am-camera-reset').click();assert.equal(app.CamRig.gz,1);assert.equal(app.CamRig.gp,.69);
    w.dispatchEvent(new w.KeyboardEvent('keydown',{key:'m',bubbles:true}));assert.equal(map.hidden,false);
    w.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(map.hidden,true);
  }finally{await app.Net.stop?.();dom.window.close();}
});
