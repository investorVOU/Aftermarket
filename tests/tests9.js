const H=require('./harness.js');const {load,rand}=H;let pass=0,fail=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);c?pass++:fail++;};
const W=load(21);const {Sim,Eco,Input}=W;const Ph=W.Phone,V=Ph.views;const html=a=>V[a].body.innerHTML;
// layout / sizing
const size=(w,h,t)=>Ph.sizeFor(w,h,t);
ok(size(390,844,true).width<=270&&size(390,844,true).height<844*.7,'portrait phone is compact without scaling its text or controls');
ok(size(1280,720,false).width<1280/4&&size(1280,720,false).height<720*.7,'desktop phone leaves the centre of the world visible');
ok(size(820,1180,true).width<820/3,'tablet phone does not grow to occupy the whole display');
ok(size(844,390,true).width>=240&&size(844,390,true).height<=390-96,'landscape reflows with readable width and room for its close bar');
ok([[320,568],[390,844],[1280,720],[820,1180],[844,390]].every(([w,h])=>size(w,h,true).width<=w-24&&size(w,h,true).height<=h-80),'phone and close bar fit all supported viewport sizes');
Input.setMode('touch');Ph.layout(390,844);ok(Ph.el.style.width==='244px'&&Ph.el.style.height==='500px','layout sets native dimensions rather than shrinking touch targets');
// state machine
ok(!Ph.open&&Ph.app==='home','starts closed on the home screen');
ok(Ph.openPhone()&&Ph.open&&H.body.classList.contains('phone-open'),'open: phone shown, gameplay-lock class applied');
Ph.openApp('market');Ph.st.market.tab='sell';Ph.openApp('msg');Ph.msgOpen(10);
ok(Ph.app==='msg'&&Ph.recent.join()==='msg,market','apps open and are tracked as recents (switcher)');
Ph.minimize();ok(!Ph.open&&!H.body.classList.contains('phone-open')&&Ph.app==='msg'&&Ph.st.msg.c===10&&Ph.st.market.tab==='sell','minimise hides the phone and keeps app + per-app state');
Ph.openPhone();ok(Ph.app==='msg'&&/Send a message/.test(html('msg')),'reopening returns to the same app and conversation');
Ph.back();ok(Ph.app==='msg'&&Ph.st.msg.c===null,'back from a conversation returns to the contact list');Ph.back();ok(Ph.app==='home','back from the list returns to the home screen');
Ph.openApp('market');Ph.switcher();ok(Ph.sw,'app switcher opens');Ph.switcher();Ph.close();ok(!Ph.open&&Ph.app==='home'&&Ph.recent.length===0&&Ph.st.msg.c===null,'close exits to gameplay and resets to the home screen');
// apps show real state and call validated Eco functions
Ph.openPhone();Eco.player.cash=5000;Ph.openApp('wallet');ok(/\$50\.00/.test(html('wallet'))&&/In your pack/.test(html('wallet')),'wallet shows the real cash balance');
Ph.openApp('market');Ph.st.market.tab='buy';Ph.render();ok(/Timber Supply Co\./.test(html('market'))&&/Greenfield Farm/.test(html('market'))&&new RegExp(Eco.ts.inv.timber+' in stock').test(html('market')),'marketplace lists real sellers, prices and stock');
const c0=Eco.player.cash,t0=Eco.player.inv.timber,s0=Eco.ts.inv.timber,tc=Eco.ts.cash;Ph.act('buyTimber');
ok(Eco.player.inv.timber===t0+1&&Eco.ts.inv.timber===s0-1&&Eco.player.cash===c0-Eco.ts.price&&Eco.ts.cash===tc+Eco.ts.price,'buying timber on the phone: validated transaction, both sides updated exactly once');
const m0=Eco.player.inv.maize||0,f0=Eco.farm.inv.maize;Ph.act('buy_maize');ok(Eco.player.inv.maize===m0+1&&Eco.farm.inv.maize===f0-1,'buying maize from the farm works through the same validation');
Eco.player.cash=100;const snap=[Eco.player.cash,Eco.ts.inv.timber];Ph.act('buyTimber');ok(Eco.player.cash===snap[0]&&Eco.ts.inv.timber===snap[1]&&/disabled/.test(html('market').split('Timber Supply')[1].slice(0,260)),'cannot afford: nothing changes and the Buy button is disabled');
Eco.player.cash=5000;Eco.player.inv.timber=3;const o0=Eco.ow.cash;Ph.st.market.tab='sell';Ph.render();Ph.act('sellTimber');ok(Eco.player.inv.timber===0&&Eco.ow.cash===o0-3*Eco.ow.bid,'selling carried timber pays the real workshop price');
Eco.player.inv.maize=2;const cs=Eco.player.cash;Ph.act('sellAgri');ok(Eco.player.cash===cs+2*350,'selling produce pays the real market wholesale price');
// contracts + business + activity
Ph.openApp('contracts');Eco.contract={need:5,reward:6000,state:'offer'};Ph.render();ok(/Accept contract/.test(html('contracts'))&&/\$60\.00/.test(html('contracts')),'contracts app shows the real open contract');
Ph.act('contract');ok(Eco.contract.state==='active'&&/Deliver now/.test(html('contracts')),'accepting from the phone activates the same contract as the G key');
Eco.player.inv.timber=5;Eco.ow.cash=80000;const cc=Eco.player.cash,k0=Eco.contracts;Ph.render();Ph.act('contract');ok(Eco.contracts===k0+1&&Eco.player.cash===cc+6000,'delivering from the phone pays the reward once');
Ph.openApp('biz');Eco.ms.trade=0;Ph.render();ok(/Locked/.test(html('biz')),'business app: Trading Post locked before First Trade');Eco.ms.trade=1;Eco.player.cash=20000;Ph.render();ok(/For sale/.test(html('biz'))&&/data-a="buyPost"/.test(html('biz')),'after First Trade: for sale with a buy button');Ph.act('buyPost');ok(Eco.post.owner==='player'&&/Owned by you/.test(html('biz')),'buying the Trading Post from the phone uses the real acquisition');
Ph.openApp('activity');Eco.say('Test event for the phone feed');ok(/Test event for the phone feed/.test((Ph.render(),html('activity'))),'activity feed records real game notifications');
Ph.openApp('near');ok(/Receipts/.test(html('near'))&&/View inventory and receipts/.test(html('near'))&&!/managed wallet|gas|NEAR/.test(html('near')),'receipts app uses game language and does not fabricate chain confirmation');Ph.openApp('settings');ok(/Simulated/.test(html('settings'))&&/ph-sens/.test(html('settings')),'settings: sensitivity slider; signal/battery honestly labelled simulated');
// messages
Sim.npcs.forEach(n=>n.vis=false);Ph.openApp('msg');ok(Sim.Msg.contacts().map(n=>n.name).join()==='Margaret Hollis,Samuel Adegoke,Adaeze Obi'&&/Margaret Hollis/.test(html('msg')),'messages: contacts are the Timber Supply owner, Oak & Iron owner and farm manager');
Ph.msgOpen(10);Eco.ts.inv.timber=3;Ph.msgAsk('stock');ok(/\b3\b/.test(html('msg'))&&/\bthin\b|\blow\b/i.test(html('msg')),'NPC reply by message reflects real stock (3 timber → shortage)');
Eco.ts.inv.timber=18;Ph.msgAsk('stock');ok(/\b18\b/.test(html('msg')),'later reply reflects updated stock (18)');
Ph.msgOpen(24);Eco.farm.inv.maize=17;Ph.msgAsk('inv');ok(/17 maize/.test(html('msg')),'farm manager answers from real barn stock');
const met=Sim.npcs[5];met.talk.count=1;ok(Sim.Msg.contacts().some(n=>n.id===5),'NPCs the player has spoken to become contacts');
// no junk across random states
let junk=0;for(let r=0;r<40;r++){Eco.player.cash=Math.floor(rand()*20000);Eco.ts.inv.timber=Math.floor(rand()*41);Eco.farm.inv.milk=Math.floor(rand()*41);Eco.contract.state=rand()<.5?'offer':'active';Sim.ship.state=['offshore','approach','unloading','departing'][Math.floor(rand()*4)];for(const a of Object.keys(V)){Ph.render(a);if(/undefined|NaN|\[object/.test(html(a)))junk++;}}ok(junk===0,'all 8 apps render without undefined/NaN across 40 random game states');
// dialogue conflict
Ph.minimize();Sim.npcs.forEach(n=>{n.vis=false;});const n0=Sim.npcs[10];n0.vis=true;n0.x=1;n0.z=0;Sim.player.x=0;Sim.player.z=0;Ph.openPhone();Sim.Talk.open(10);ok(Ph.open&&Sim.Talk.cur&&Ph.app==='msg'&&Ph.st.msg.c===10,'starting a conversation opens that NPC thread in the phone');
ok(Ph.openPhone()===true&&Ph.open,'the phone remains accessible during conversation');Ph.minimize();ok(!Sim.Talk.cur&&!n0.talking,'closing the phone ends conversation and releases the NPC');
console.log(`\n${pass} passed, ${fail} failed`);
