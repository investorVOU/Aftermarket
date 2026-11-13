const {test}=require('node:test'),assert=require('node:assert/strict'),{MerchantAgent}=require('../server/merchant-agent.cjs'),{world}=require('../server/world.cjs');
test('disabled Groq never makes a provider request',async()=>{
 const agent=new MerchantAgent({},()=>{throw Error('must not call');});await assert.rejects(agent.decide({}),e=>e.status===409);assert.equal(agent.ready,false);
});
test('Groq proposes a bounded action; current server cash, stock and price authorize the actual trade',async()=>{
 let request;const agent=new MerchantAgent({GROQ_AGENTS_ENABLED:'true',GROQ_API_KEY:'private-test-key'},async(_url,options)=>{request=JSON.parse(options.body);return{ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({message:'I need timber for the workshop.',action:'restock'})}}]})};});
 const g=world(),e=g.Eco;e.ow.inv.timber=0;const before=e.ow.cash+e.ts.cash,decision=await agent.decide(agent.context(g,11));
 assert.equal(JSON.stringify(request).includes('private-test-key'),false);const price=e.ts.price;agent.apply(g,11,decision);
 assert.equal(e.ow.inv.timber,1);assert.equal(e.ow.cash,80000-price);assert.equal(e.ow.cash+e.ts.cash,before);assert.equal(g.Sim.Msg.thread(11).at(-2).source,'groq');
 e.ow.cash=0;const stock=e.ow.inv.timber;assert.match(agent.apply(g,11,decision),/insufficient/);assert.equal(e.ow.inv.timber,stock);
});
test('invalid provider proposals and failures cannot mutate game state or expose provider errors',async()=>{
 const g=world(),before=JSON.stringify(g.Eco),agent=new MerchantAgent({GROQ_AGENTS_ENABLED:'true',GROQ_API_KEY:'private-test-key'},async()=>({ok:true,json:async()=>({choices:[{message:{content:'{"action":"mint_unlimited","message":"oops"}'}}]})}));
 await assert.rejects(agent.decide(agent.context(g,10)),e=>e.status===503&&!e.message.includes('private-test-key'));assert.equal(JSON.stringify(g.Eco),before);
 assert.throws(()=>agent.apply(g,10,{action:'mint_unlimited',message:'No'}),/Invalid merchant proposal/);
});
test('merchant planning enforces targets, closure, finite treasury and a process call cap',async()=>{
 const g=world(),agent=new MerchantAgent({GROQ_AGENTS_ENABLED:'true',GROQ_API_KEY:'test-only',GROQ_DAILY_LIMIT:'1'},async()=>({ok:true,json:async()=>({choices:[{message:{content:'{"action":"hold","message":"Holding."}'}}]})}));
 await agent.decide(agent.context(g,10));await assert.rejects(agent.decide(agent.context(g,10)),e=>e.status===429);
 assert.match(agent.apply(g,10,{action:'restock',message:'Buy'}),/target already met/);g.Eco.ts.closed=true;assert.match(agent.apply(g,10,{action:'restock',message:'Buy'}),/closed/);
});
