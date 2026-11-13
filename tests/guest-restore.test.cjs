const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const State=require('../shared/state.js'),{world}=require('../server/world.cjs');
const until=async predicate=>{const end=Date.now()+10000;while(!predicate()){if(Date.now()>end)throw Error('Guest restore race test timed out');await new Promise(r=>setTimeout(r,10));}};
test('a delayed previous-session restore cannot replace a freshly opened guest island',async()=>{
 require('./harness.js').load();const app=globalThis.AftermarketApp,dom=new JSDOM('<html><body></body></html>',{url:'http://localhost',runScripts:'outside-only'}),w=dom.window,initial={state:State.capture(world()),revision:1,wallet:'a'.repeat(64),chain:{network:'testnet',settlement:false},events:[],demo:{active:false}};
 let resolveRestore,callback;const restore=new Promise(r=>resolveRestore=r),calls=[];
 w.AftermarketApp=app;w.GameState=State;w.AbortSignal=AbortSignal;Object.defineProperty(w.crypto,'randomUUID',{value:require('node:crypto').randomUUID});
 w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>{},set:()=>true});
 w.__testAuth={auth:{getSession:()=>restore,onAuthStateChange:fn=>{callback=fn;},setSession:async session=>{const next={...session,user:{id:'new-guest'}};callback('SIGNED_IN',next);return{data:{session:next}};}}};
 w.fetch=async(url,options={})=>{calls.push({url:String(url),authorization:options.headers?.Authorization});return{ok:true,json:async()=>String(url)==='/api/config'?{mode:'connected',configured:true,supabaseUrl:'https://example.invalid',supabaseKey:'mock-public',guestEnabled:true,chain:{network:'testnet'}}:String(url)==='/api/guest'?{access_token:'fresh-test-token',refresh_token:'mock-refresh',initial}:initial};};
 for(const file of ['movement-view','sync-transport','http-client'])w.eval(fs.readFileSync(path.join(__dirname,'../shared/'+file+'.js'),'utf8'));
 w.eval(fs.readFileSync(path.join(__dirname,'../game/navigation.js'),'utf8').replace('export function setupNavigation','globalThis.__navigation=function setupNavigation'));
 let bundle=fs.readFileSync(path.join(__dirname,'../game/client.entry.js'),'utf8');
 for(const [from,to]of [["import {createClient} from '@supabase/supabase-js';",'const createClient=()=>globalThis.__testAuth;'],["import {setupNavigation} from './navigation.js';",'const setupNavigation=globalThis.__navigation;'],["import MovementView from '../shared/movement-view.js';",'const MovementView=globalThis.MovementView;'],["import GameSync from '../shared/sync-transport.js';",'const GameSync=globalThis.GameSync;'],["import GameHTTP from '../shared/http-client.js';",'const GameHTTP=globalThis.GameHTTP;']])bundle=bundle.replace(from,to);
 try{w.eval(bundle);await until(()=>!w.document.getElementById('am-guest').hidden);w.document.getElementById('am-guest').click();await until(()=>app.Net.online);
  resolveRestore({data:{session:{access_token:'old-test-token',user:{id:'old-player'}}}});await new Promise(r=>setTimeout(r,30));callback('INITIAL_SESSION',null);
  await app.Net.command('call',{id:10});assert.equal(calls.filter(c=>c.url==='/api/session').length,0);assert.equal(calls.find(c=>c.url==='/api/action').authorization,'Bearer fresh-test-token');assert.equal(app.Net.online,true);assert.equal(w.document.getElementById('am-welcome').hidden,true);
 }finally{resolveRestore({data:{session:null}});await app.Net.stop();w.close();}
});
