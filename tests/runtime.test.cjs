const {test}=require('node:test'),assert=require('node:assert/strict');
const {runtime}=require('../server/runtime.cjs');
test('manual Render service uses connected mode, public binding and the assigned port',()=>{
  assert.deepEqual(runtime({RENDER:'true',PORT:'10000',HOST:'127.0.0.1'}),{mode:'connected',development:false,host:'0.0.0.0',port:10000,hosted:true});
});
test('production cannot expose development identities or local SQLite',()=>{
  assert.throws(()=>runtime({RENDER:'true',GAME_MODE:'development'}),/GAME_MODE=connected/);
  assert.equal(runtime({NODE_ENV:'production'}).development,false);
});
test('local development stays loopback-only and invalid ports fail clearly',()=>{
  assert.equal(runtime({}).host,'127.0.0.1');
  assert.throws(()=>runtime({HOST:'0.0.0.0',GAME_MODE:'development'}),/127.0.0.1/);
  assert.throws(()=>runtime({PORT:'broken'}),/PORT/);
});
