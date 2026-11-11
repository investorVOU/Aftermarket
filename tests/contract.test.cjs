// Executes the compiled Rust WASM against a minimal deterministic NEAR host.
// This checks contract code, not a real chain; testnet verification is still required.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const wasm=fs.readFileSync(path.join(__dirname,'../contracts/economy/target/wasm32-unknown-unknown/release/aftermarket_economy.wasm'));
const moduleBytes=new WebAssembly.Module(wasm);
function host(){
  let store=new Map();const logs=[];
  function call(method,args={},options={}){
    const backup=new Map(store),registers=new Map();let instance,result;
    const bytes=(length,ptr)=>Buffer.from(new Uint8Array(instance.exports.memory.buffer,Number(ptr),Number(length)));
    const write=(ptr,b)=>new Uint8Array(instance.exports.memory.buffer).set(b,Number(ptr));
    const set=(id,b)=>registers.set(id,Buffer.from(b));
    const key=(len,ptr)=>bytes(len,ptr).toString('hex');
    const deposit=options.deposit??(['settle_world','storage_deposit'].includes(method)?1000000000000000000000000n:0n);
    const env={
      read_register:(id,ptr)=>write(ptr,registers.get(id)),register_len:id=>registers.has(id)?BigInt(registers.get(id).length):(1n<<64n)-1n,
      input:id=>set(id,Buffer.from(JSON.stringify(args))),current_account_id:id=>set(id,Buffer.from('items.testnet')),
      predecessor_account_id:id=>set(id,Buffer.from(options.caller||'controller.testnet')),
      storage_usage:()=>BigInt([...store.entries()].reduce((n,[k,v])=>n+k.length/2+v.length,0)),
      attached_deposit:ptr=>{const b=Buffer.alloc(16);b.writeBigUInt64LE(deposit&((1n<<64n)-1n));b.writeBigUInt64LE(deposit>>64n,8);write(ptr,b);},
      prepaid_gas:()=>300000000000000n,
      storage_read:(len,ptr,id)=>{const value=store.get(key(len,ptr));if(value===undefined)return 0n;set(id,value);return 1n;},
      storage_has_key:(len,ptr)=>store.has(key(len,ptr))?1n:0n,
      storage_write:(kl,kp,vl,vp,id)=>{const k=key(kl,kp),old=store.get(k);if(old)set(id,old);store.set(k,bytes(vl,vp));return old?1n:0n;},
      value_return:(len,ptr)=>{const s=bytes(len,ptr).toString();result=s?JSON.parse(s):undefined;},
      panic_utf8:(len,ptr)=>{throw new Error(bytes(len,ptr).toString());},log_utf8:(len,ptr)=>logs.push(bytes(len,ptr).toString()),
      promise_result:(_index,id)=>{if(options.promiseFailure)return 2n;set(id,Buffer.from(JSON.stringify(options.unused||[])));return 1n;}
    };
    for(const item of WebAssembly.Module.imports(moduleBytes))if(!env[item.name])env[item.name]=()=>0n;
    instance=new WebAssembly.Instance(moduleBytes,{env});
    try{instance.exports[method]();return result;}catch(e){store=backup;throw e;}
  }
  call('new',{controller:'controller.testnet'});
  return{call,logs};
}
function funded(){const h=host();h.call('settle_world',{world_id:'island',revision:1,changes:[{account_id:'alice.testnet',token_id:'timber',delta:'10'},{account_id:'alice.testnet',token_id:'cash',delta:'5000'}],licence_owner:null});h.call('storage_deposit',{account_id:'bob.testnet'});return h;}
test('compiled contract mints, burns and preserves supplies',()=>{const h=funded();assert.equal(h.call('mt_balance_of',{account_id:'alice.testnet',token_id:'timber'}),'10');h.call('settle_world',{world_id:'island',revision:2,changes:[{account_id:'alice.testnet',token_id:'timber',delta:'-3'}],licence_owner:null});assert.equal(h.call('mt_supply',{token_id:'timber'}),'7');assert.ok(h.logs.some(l=>l.includes('"standard":"nep245"')&&l.includes('mt_burn')));});
test('compiled contract forbids unauthorized minting and replayed checkpoints',()=>{const h=funded();assert.throws(()=>h.call('settle_world',{world_id:'island',revision:2,changes:[],licence_owner:null},{caller:'attacker.testnet'}),/Controller only/);assert.equal(h.call('settle_world',{world_id:'island',revision:1,changes:[{account_id:'alice.testnet',token_id:'timber',delta:'99'}],licence_owner:null}),false);assert.equal(h.call('mt_supply',{token_id:'timber'}),'10');});
test('compiled transfer and batch transfer enforce owner balance and one yocto',()=>{const h=funded();assert.throws(()=>h.call('mt_transfer',{receiver_id:'bob.testnet',token_id:'timber',amount:'2',approval:null,memo:null},{caller:'alice.testnet',deposit:0n}),/1 yocto/);h.call('mt_transfer',{receiver_id:'bob.testnet',token_id:'timber',amount:'2',approval:null,memo:null},{caller:'alice.testnet',deposit:1n});h.call('mt_batch_transfer',{receiver_id:'bob.testnet',token_ids:['timber','cash'],amounts:['3','100'],approvals:null,memo:null},{caller:'alice.testnet',deposit:1n});assert.deepEqual(h.call('mt_batch_balance_of',{account_id:'bob.testnet',token_ids:['timber','cash']}),['5','100']);assert.throws(()=>h.call('mt_transfer',{receiver_id:'bob.testnet',token_id:'timber',amount:'99',approval:null,memo:null},{caller:'alice.testnet',deposit:1n}),/Insufficient/);assert.equal(h.call('mt_supply',{token_id:'timber'}),'10');});
test('compiled metadata exposes standard, names, decimal units and game-credit disclosure',()=>{const h=funded();assert.equal(h.call('mt_metadata_contract').spec,'mt-1.0.0');const m=h.call('mt_metadata_token_all',{token_ids:['cash','gold']});assert.equal(m[0].base.decimals,'2');assert.equal(m[1].base.decimals,'3');assert.match(m[0].token.description,/Not native NEAR/);});
test('compiled contract requires storage funding and rolls back failed calls',()=>{const h=host();assert.throws(()=>h.call('storage_deposit',{account_id:'alice.testnet'},{deposit:0n}),/storage/);assert.equal(h.call('storage_balance_of',{account_id:'alice.testnet'}),null);});
test('compiled transfer callback refunds unused items and is private',()=>{const h=funded();h.call('mt_transfer_call',{receiver_id:'bob.testnet',token_id:'timber',amount:'4',approval:null,memo:null,msg:'receive'},{caller:'alice.testnet',deposit:1n});const args={sender_id:'alice.testnet',receiver_id:'bob.testnet',token_ids:['timber'],amounts:['4']};assert.throws(()=>h.call('mt_resolve_transfer',args,{caller:'attacker.testnet',unused:['2']}),/private/);assert.deepEqual(h.call('mt_resolve_transfer',args,{caller:'items.testnet',unused:['2']}),['2']);assert.equal(h.call('mt_balance_of',{account_id:'alice.testnet',token_id:'timber'}),'8');});
