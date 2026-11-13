const {test}=require('node:test'),assert=require('node:assert/strict'),{GuestAuth}=require('../server/guest.cjs');
const env={DEMO_GUEST_ENABLED:'true',NEAR_NETWORK:'testnet',NEAR_SETTLEMENT_ENABLED:'true',SUPABASE_URL:'https://example.invalid',SUPABASE_SECRET_KEY:'mock-secret',SUPABASE_PUBLISHABLE_KEY:'mock-public',DEMO_GUEST_DAILY_LIMIT:'2'};
test('availability prefetch removes a guest-path query while preserving caps and unique verified identities',async()=>{
 let lists=0,creates=0,current;const factory=(_url,key)=>key==='mock-secret'?{auth:{admin:{listUsers:async()=>{lists++;return{data:{users:[]}};},createUser:async o=>{creates++;assert.equal(o.app_metadata.aftermarket_demo,true);current={id:'user-'+creates,email:o.email};return{data:{user:current}};}}}}:{auth:{signInWithPassword:async()=>({data:{user:current,session:{access_token:'mock-access-'+creates,refresh_token:'mock-refresh-'+creates,expires_in:3600,token_type:'bearer'}}})}};
 const g=new GuestAuth(env,null,factory);await g.prime();const sessions=await Promise.all([g.create(),g.create()]);assert.equal(lists,1);assert.equal(creates,2);assert.notEqual(sessions[0].user.id,sessions[1].user.id);assert.notEqual(sessions[0].access_token,sessions[1].access_token);await assert.rejects(g.create(),e=>e.status===429);
});
test('a mismatched sign-in identity never bootstraps another player world',async()=>{
 const factory=(_url,key)=>key==='mock-secret'?{auth:{admin:{listUsers:async()=>({data:{users:[]}}),createUser:async()=>({data:{user:{id:'fresh-user'}}})}}}:{auth:{signInWithPassword:async()=>({data:{user:{id:'other-user'},session:{access_token:'mock-token'}}})}};
 await assert.rejects(new GuestAuth(env,null,factory).create(),e=>e.status===503);
});

test('one prepared identity is claimed once and simultaneous visitors receive distinct sessions',async()=>{
 let creates=0;const ids=new Map(),factory=(_url,key)=>key==='mock-secret'?{auth:{admin:{listUsers:async()=>({data:{users:[]}}),createUser:async({email})=>{const user={id:'prepared-'+(++creates)};ids.set(email,user);return{data:{user}};}}}}:{auth:{signInWithPassword:async({email})=>({data:{user:ids.get(email),session:{access_token:'mock-'+ids.get(email).id,expires_in:3600}}})}};
 const g=new GuestAuth({...env,DEMO_GUEST_DAILY_LIMIT:'5'},null,factory);g.prepare();g.prepare();await g.prepared;assert.equal(creates,1);
 const [a,b]=await Promise.all([g.create(),g.create()]);assert.equal(creates,2);assert.notEqual(a.user.id,b.user.id);assert.notEqual(a.access_token,b.access_token);
 g.prepared=Promise.resolve({session:{access_token:'expired'},until:Date.now()-1});assert.notEqual((await g.create()).access_token,'expired');assert.equal(creates,3);
});
test('preparation can be disabled without changing ordinary guest creation',()=>{const g=new GuestAuth({...env,DEMO_GUEST_PREWARM:'false'},null,()=>({auth:{}}));g.prepare();assert.equal(g.prepared,undefined);});
