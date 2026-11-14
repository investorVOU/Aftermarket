const {test}=require('node:test'),assert=require('node:assert/strict'),NpcView=require('../shared/npc-view.js');
const actor=(x,extra={})=>({x,z:0,h:0,vis:true,mode:'walk',talking:false,...extra});
test('NPCs move continuously between one-second snapshots without mutating simulation',()=>{
 const v=new NpcView(),out={},speeds=[];let previous=null;
 for(let t=0;t<=6000;t+=10){if(t%1000===0){const input=[actor(t/1000)];v.accept(input,t);assert.equal(input[0].x,t/1000);}v.step(t);v.sample(0,out);if(t>=2500&&previous!==null)speeds.push((out.x-previous)*100);previous=out.x;}
 assert.ok(speeds.every(s=>s>.7&&s<1.3),`steady movement should not ease to a stop: ${Math.min(...speeds)}..${Math.max(...speeds)}`);
});
test('jitter, changed polling cadence and out-of-order arrivals cannot rewind NPCs',()=>{
 const v=new NpcView(),out={};let next=0,previous=0;
 for(let t=0;t<=12000;t+=10){if(t>=next){v.accept([actor(t/1000)],t);v.accept([actor(-100)],t-1);next=t+(t<6000?1000+(t%300):300);}v.step(t);v.sample(0,out);assert.ok(out.x>=previous-1e-9);previous=out.x;assert.ok(v.frames.length<=24);}
});
test('NPC heading takes the short turn; lost updates hold rather than inventing movement',()=>{
 const v=new NpcView(),out={};v.accept([actor(0,{h:3.1})],0);v.step(0);v.accept([actor(1,{h:-3.1})],1000);
 for(let t=10;t<=1800;t+=10)v.step(t);v.sample(0,out);assert.ok(Math.abs(out.h)>3,'turn stays near pi rather than spinning through zero');
 for(let t=1810;t<=10000;t+=10)v.step(t);v.sample(0,out);assert.equal(out.x,1);assert.equal(out.v,0);
});
test('house visibility, conversation and reconnect discontinuities snap safely',()=>{
 const v=new NpcView(),out={};v.accept([actor(0)],0);v.step(0);v.accept([actor(20,{vis:false})],1000);v.step(1000);v.sample(0,out);assert.equal(out.vis,false);assert.equal(out.x,20);
 v.accept([actor(22,{talking:true})],2000);v.step(2000);v.sample(0,out);assert.equal(out.x,22);assert.equal(out.v,0);
 v.accept([actor(22)],2200);v.step(2200);v.sample(0,out);assert.equal(out.x,22,'ending a conversation cannot replay an older route');
 v.accept([actor(40)],6000);v.step(6000);v.sample(0,out);assert.equal(out.x,40);
});
test('visual interpolation respects geometry and allocates no replacement output',()=>{
 const v=new NpcView({move(p,dx,dz){p.x=Math.min(.3,p.x+dx);p.z+=dz;}}),out={};v.accept([actor(0)],0);v.step(0);v.accept([actor(1)],1000);for(let t=10;t<=1900;t+=10)v.step(t);assert.equal(v.sample(0,out),true);assert.equal(out.x,.3);
});
