const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
test('duplicate/concurrent shop and project requests pay once through the actual API and persist',async()=>{
 process.env.GAME_MODE='development';process.env.HOST='127.0.0.1';const {server,shutdown}=require('../server/index.cjs'),{DevelopmentStore}=require('../server/development.cjs'),{world}=require('../server/world.cjs'),State=require('../shared/state.js');
 const g=world(),id=crypto.randomUUID(),store=new DevelopmentStore();g.Eco.post.owner='player';g.Eco.post.price=1000;g.Eco.ow.inv.timber=0;g.Eco.post.inv.timber=2;g.Eco.player.inv.timber=3;g.Sim.player.x=-4;g.Sim.player.z=14.3;
 const initial=State.capture(g,true);initial.wallTimestamp=Date.now();await store.save(id,0,initial,{},'local:'+id,null);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,headers={'Content-Type':'application/json',Authorization:'Bearer dev-'+id};
 const act=async(name,args={},command=crypto.randomUUID())=>{const r=await fetch(base+'/api/action',{method:'POST',headers,body:JSON.stringify({id:command,name,args})});return{status:r.status,data:await r.json()};};
 try{
  const request=crypto.randomUUID(),[a,b]=await Promise.all([act('acceptCustomer',{customer:'workshop'},request),act('acceptCustomer',{customer:'workshop'},request)]);assert.equal(a.status,200);assert.equal(b.status,200);assert.equal(b.data.state.economy.retention.completed,1);assert.equal(b.data.state.economy.post.cash,2000);
  const rejected=await act('acceptCustomer',{customer:'workshop'});assert.equal(rejected.status,400);assert.equal((await store.load(id)).snapshot.economy.retention.completed,1);
  const start=crypto.randomUUID();const projects=await Promise.all([act('startTownProject',{},start),act('startTownProject',{},start)]);assert.ok(projects.every(r=>r.status===200));const budget=projects[0].data.state.economy.retention.project.budget;
  const delivery=crypto.randomUUID(),supplies=await Promise.all([act('supplyTownProject',{item:'timber'},delivery),act('supplyTownProject',{item:'timber'},delivery)]);assert.ok(supplies.every(r=>r.status===200));const saved=(await store.load(id)).snapshot.economy;assert.equal(saved.retention.project.delivered.timber,3);assert.equal(saved.player.inv.timber,0);assert.equal(saved.player.cash,9200);assert.equal(saved.customerdesk.cash,budget-4200);
  const unauth=await fetch(base+'/api/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:crypto.randomUUID(),name:'startTownProject'})});assert.equal(unauth.status,401);
 }finally{await shutdown();store.close();}
});
