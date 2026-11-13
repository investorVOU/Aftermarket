// Isolated server integration with mock identity/storage transports; no live keys.
const {test,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
Object.assign(process.env,{GAME_MODE:'connected',NEAR_NETWORK:'testnet',NEAR_SETTLEMENT_ENABLED:'true',GROQ_AGENTS_ENABLED:'false'});
let loads=0,lookups=0,saves=0;const rows=new Map();
const storePath=require.resolve('../server/store.cjs'),chainPath=require.resolve('../server/near.cjs'),guestPath=require.resolve('../server/guest.cjs');require(storePath);require(chainPath);require(guestPath);
require.cache[storePath].exports.Store=class{constructor(){this.ready=true;}async user(){lookups++;throw Error('Unnecessary identity lookup');}async load(){loads++;throw Error('Unnecessary fresh save lookup');}async save(id,revision,state){saves++;rows.set(id,state);return revision+1;}async history(){return [];}async pending(){return null;}async hasCommand(){return false;}};
require.cache[chainPath].exports.Chain=class{constructor(){this.ready=true;}wallet(id){return'ledger:'+id;}publicConfig(){return{network:'testnet',settlement:false};}payload(){return{balances:{},payload:null};}};
require.cache[guestPath].exports.GuestAuth=class{constructor(){this.ready=true;}async prime(){}async create(){return{access_token:'mock-session',refresh_token:'mock-refresh',user:{id:crypto.randomUUID()},demo:true};}};
const {server,shutdown}=require('../server/index.cjs'),ready=new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));after(()=>shutdown());
test('guest response contains a durably saved island and first sync reuses the authenticated identity',async()=>{
 await ready;const base='http://127.0.0.1:'+server.address().port,r=await fetch(base+'/api/guest',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}),d=await r.json();
 assert.equal(r.status,200);assert.equal(d.initial.revision,1);assert.ok(d.initial.state.economy.player);assert.equal(saves,1);assert.equal(loads,0);assert.equal(lookups,0);assert.equal(d.user,undefined,'internal verified user stays out of guest payload');
 const sync=await fetch(base+'/api/sync',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+d.access_token},body:'{"x":0,"z":0}'});assert.equal(sync.status,200);assert.equal(lookups,0);assert.equal((await sync.json()).wallet,d.wallet);
});
