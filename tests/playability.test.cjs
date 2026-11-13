const {test}=require('node:test'),assert=require('node:assert/strict');
const MovementView=require('../shared/movement-view.js');
const {world,action}=require('../server/world.cjs');
const State=require('../shared/state.js');

test('idle time does not make the first movement wait for a sync response',()=>{
 const col={move(p,dx,dz){p.x+=dx;p.z+=dz;}},v=new MovementView(col);v.accept({x:0,z:0});
 for(let i=0;i<180;i++)v.step(1/60,{x:0,z:0},true);
 v.step(1/60,{x:1,z:0},true);assert.ok(v.x>0);
 for(let i=0;i<180;i++)v.step(1/60,{x:1,z:0},true);const end=v.x;
 v.step(1/60,{x:1,z:0},true);assert.equal(v.x,end,'lost updates still bound prediction');
});
test('movement predicts between responses, respects collision and stops on loss of server updates',()=>{
  const col={move(p,dx,dz){p.x=Math.min(1,p.x+dx);p.z+=dz;}};
  const view=new MovementView(col),server={x:0,z:0};view.accept(server);
  const positions=[];for(let i=0;i<9;i++){view.step(1/60,{x:1,z:0},true);positions.push(view.x);}
  assert.ok(positions.every((p,i)=>i===0||p>positions[i-1]),'movement advances every rendered frame');
  assert.deepEqual(server,{x:0,z:0},'prediction never changes authoritative position');
  for(let i=0;i<90;i++)view.step(1/60,{x:1,z:0},true);
  assert.ok(view.x<=1,'predicted position cannot cross collision');
  const stopped=view.x;for(let i=0;i<20;i++)view.step(1/60,{x:1,z:0},true);assert.equal(view.x,stopped);
});
test('position corrections converge and a reconnect resets large divergence',()=>{
  const col={move(p,dx,dz){p.x+=dx;p.z+=dz;}},v=new MovementView(col);v.accept({x:0,z:0});
  v.step(.2,{x:1,z:0},true);v.accept({x:0,z:0});const first=v.x;
  for(let i=0;i<60;i++)v.step(1/60,{x:0,z:0},false);
  assert.ok(first>v.threshold);assert.ok(v.x<.025);v.accept({x:20,z:5});assert.equal(v.x,20);assert.equal(v.z,5);
});
test('small snapshot noise does not pull back local movement; prediction is bounded during outage',()=>{
 const col={move(p,dx,dz){p.x+=dx;p.z+=dz;}},v=new MovementView(col);v.accept({x:0,z:0});v.step(.05,{x:1,z:0},true);
 v.accept({x:.1,z:0});assert.ok(Math.abs(v.x-.3)<1e-9);assert.equal(v.target,null);assert.equal(v.corrections,0);
 for(let i=0;i<90;i++)v.step(1/60,{x:1,z:0},true);const stopped=v.x;
 for(let i=0;i<30;i++)v.step(1/60,{x:1,z:0},true);assert.equal(v.x,stopped);
});
test('phone conversations persist both sides, calls use NPC state and unknown contacts fail',()=>{
  const g=world(),s=g.Sim,n=s.npcs[10];n.vis=true;n.x=s.player.x;n.z=s.player.z;
  action(g,'talk',{id:10});action(g,'choose',{option:'self'});
  assert.ok(s.Msg.thread(10).some(m=>m.me===1));assert.ok(s.Msg.thread(10).some(m=>m.text===s.Talk.cur.text));
  action(g,'call',{id:10});assert.match(s.Msg.thread(10).at(-1).text,/Margaret/);
  assert.throws(()=>action(g,'call',{id:999}),/Contact unavailable/);
  const restored=world(State.capture(g,true));assert.deepEqual(restored.Sim.Msg.threads,s.Msg.threads);
  for(let i=0;i<80;i++)s.Msg.call(10);assert.ok(s.Msg.thread(10).length<=100);
});
