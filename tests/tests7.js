const H=require('./harness.js');const {load,rand}=H;let pass=0,fail=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);c?pass++:fail++;};
const fresh=seed=>{const W=load(seed);return W;};
const idsig=W=>JSON.stringify(W.Sim.npcs.map(n=>[n.name,n.occ,n.workplace,n.biz,n.traits,n.look,n.bio,n.home.n,n.role,+n.spd.toFixed(6),+n.off.toFixed(6)]));
// 1) stable identities
const A=fresh(1),B=fresh(987654);
ok(idsig(A)===idsig(B),'identities (name, occupation, workplace, home, traits, look, speed, schedule offset) identical across two loads with different random seeds');
ok(JSON.stringify(A.npcLook)===JSON.stringify(B.npcLook),'appearance (skin, hair, outfit colours) identical across loads');
const N=A.Sim.npcs;ok(N.length===29&&new Set(N.map(n=>n.name)).size===29,'29 NPCs (24 original + 5 farm), 29 unique names');
const roles={};N.forEach(n=>roles[n.role]=(roles[n.role]||0)+1);ok(JSON.stringify(roles)===JSON.stringify({'Forestry worker':4,'Timber yard employee':3,'Workshop employee':3,'Business owner':2,'Port worker':3,'Miner':3,'Customer':2,'Independent trader':2,'Resident':2,'Farm manager':1,'Farm worker':3,'Herdsman':1}),'original role mix preserved, farm roles added: '+JSON.stringify(roles));
ok(N.every(n=>n.home&&n.home.n&&n.workplace&&n.occ&&n.bio&&n.traits.length===2&&n.traits[0]!==n.traits[1]&&n.sched&&n.work),'every NPC has home, workplace, occupation, bio, 2 distinct traits, schedule and work destinations');
ok(N[10].biz==='ts'&&N[11].biz==='ow'&&/Timber Supply/.test(N[10].workplace)&&/Oak/.test(N[11].workplace),'the two business owners are tied to Timber Supply Co. and Oak & Iron');
// 2) range rules
const W=fresh(5);const {Sim,Eco}=W;const T=Sim.Talk;Sim.npcs.forEach(n=>n.vis=false);const n0=Sim.npcs[10];n0.vis=true;n0.wait=999;Sim.player.x=0;Sim.player.z=0;
n0.x=2;n0.z=0;ok(T.canTalk(n0)&&T.open(10)!==null&&T.cur&&n0.talking,'NPC 2 m away: conversation opens');T.close();
n0.x=6;n0.z=0;let denied=0;W.Bus.on('talk:denied',()=>denied++);ok(T.open(10)===null&&T.cur===null&&!n0.talking&&denied===1,'NPC 6 m away: conversation refused (denied event emitted, no state change)');
n0.x=3.3;ok(T.canTalk(n0),'3.3 m is inside the 3.4 m range');n0.x=3.6;ok(!T.canTalk(n0),'3.6 m is outside the range');
n0.x=2;n0.vis=false;ok(T.open(10)===null,'a hidden (indoor) NPC cannot be talked to');n0.vis=true;
// 3) dialogue differs by occupation; options sets
const cats={};Sim.npcs.forEach(n=>{const c=Sim.cat(n);cats[c]=cats[c]||Sim.opts(n).map(o=>o.label).join('|');});
ok(Object.keys(cats).length>=8&&new Set(Object.values(cats)).size===Object.keys(cats).length,`distinct option sets for ${Object.keys(cats).length} occupation categories (${Object.keys(cats).join(', ')})`);
const Pn=Sim.npcs[12],Mn=Sim.npcs[15],Tn=Sim.npcs[20];[Pn,Mn,Tn].forEach(n=>{n.vis=true;n.x=1;n.z=0;});
const ask=(n,t)=>{T.open(n.id);const r=T.choose(t);T.close();return r;};
ok(/vessel|ship|timber/i.test(ask(Pn,'ships')+ask(Pn,'cargo'))&&/ore|gold|plant/i.test(ask(Mn,'ore')+ask(Mn,'processing'))&&/price|\$/i.test(ask(Tn,'market')),'port worker talks ships/cargo, miner talks ore/gold, trader talks prices');
// 4) state reflection
const own=Sim.npcs[10];own.vis=true;own.x=1;own.z=0;
Eco.ts.inv.timber=3;let t1=ask(own,'stock');ok(/\b3\b/.test(t1)&&/\bthin\b|\blow\b/i.test(t1)&&!/comfortable|worry/i.test(t1),`Timber Supply owner, stock 3 → reports shortage: "${t1.slice(0,70)}…"`);
Eco.ts.inv.timber=18;t1=ask(own,'stock');ok(/\b18\b/.test(t1)&&!/\bthin\b|\blow\b|shortage|out of stock/i.test(t1),`stock 18 → no shortage claimed: "${t1.slice(0,60)}…"`);
Eco.ts.inv.timber=38;t1=ask(own,'stock');ok(/\b38\b/.test(t1)&&/full/i.test(t1)&&!/\bthin\b|shortage/i.test(t1),'stock 38 → says nearly full');
let bad=0;for(let k=0;k<=40;k+=1){Eco.ts.inv.timber=k;for(let r=0;r<4;r++){own.talk.asked.stock=r;T.open(10);const tx=T.choose('stock');T.close();const low=k<8,high=k>=28;if(!new RegExp('\\b'+k+'\\b').test(tx))bad++;if(low&&!/\bthin\b|\blow\b|shortage/i.test(tx))bad++;if(!low&&/\bthin\b|shortage|we are low/i.test(tx))bad++;if(high&&!/full/i.test(tx))bad++;if(!high&&/full|close to our limit/i.test(tx)&&!/waiting|gate/i.test(tx))bad++;}}
ok(bad===0,`owner stock dialogue consistent with inventory for every stock level 0–40 × 4 variants (${bad} contradictions)`);
const sw=Sim.npcs[7];sw.vis=true;sw.x=1;sw.z=0;Eco.ow.inv.timber=1;let ts_=ask(sw,'prod')+' '+ask(sw,'short');ok(/stopped|waiting/i.test(ts_)&&/\b1\b/.test(ts_)&&/need/i.test(ts_),`workshop stalled (1 timber) → worker explains why: "${ask(sw,'short')}"`);
Eco.ow.inv.timber=9;Eco.ow.activity='Manufacturing';ts_=ask(sw,'prod')+' '+ask(sw,'short');ok(!/stopped|cannot|waiting on|for want/i.test(ts_)&&/\b9\b/.test(ts_),'workshop running (9 timber) → worker does not claim a stoppage');
for(const [st,re] of [['offshore',/due in|next/i],['approach',/coming in|arriving/i],['unloading',/berthed|alongside|aboard/i],['departing',/cast off|left|just/i]]){Sim.ship.state=st;Eco.ship.manifest=9;Eco.ship.total=24;Eco.ship.landed=15;const tx=ask(Pn,'ships')+ask(Pn,'schedule');if(!re.test(tx)){ok(false,`port worker reflects ship state ${st}: "${tx}"`);}}
Sim.ship.state='unloading';Eco.ship.manifest=9;Eco.ship.total=24;Eco.ship.landed=15;let pt=ask(Pn,'ships');ok(/15 of 24/.test(pt),`port worker reports real manifest while unloading: "${pt}"`);Sim.ship.state='offshore';Sim.ship.wait=40;pt=ask(Pn,'ships');ok(/no vessel/i.test(pt),'no ship claimed to be in port when offshore');
Eco.mine.inv.ore=7;ok(/\b7\b/.test(ask(Mn,'ore')),'miner quotes the real ore store (7)');Eco.mine.inv.gold=2500;ok(/2\.500 g/.test(ask(Mn,'processing')),'miner quotes real processed gold (2.500 g)');
const mk_=ask(Tn,'market');ok(/\$20\.00/.test(mk_)&&/\$12\.00/.test(mk_)&&/\$65\.00/.test(mk_)&&/\$17\.00/.test(mk_),`trader quotes the real prices: "${mk_.slice(0,80)}…"`);
Eco.ms.trade=0;const rs=Sim.npcs[22];rs.vis=true;rs.x=1;rs.z=0;ok(/shuttered/.test(ask(rs,'businesses')),'resident: Trading Post called shuttered before First Trade');Eco.ms.trade=1;ok(/for sale at \$150\.00/.test(ask(rs,'businesses')),'after First Trade: for sale at the real asking price');Eco.post.owner='player';ok(/yours/.test(ask(rs,'businesses')),'once the player owns it: "that one is yours"');Eco.post.owner=null;
// employer recognition (fixture: no current NPC works at the Trading Post)
const cl=Sim.npcs[19];cl.vis=true;cl.x=1;cl.z=0;cl.biz='post';Eco.post.owner='player';T.open(19);ok(/boss/i.test(T.cur.text),`employee of a player-owned business greets the player as employer: "${T.cur.text.slice(0,50)}…"`);T.close();Eco.post.owner=null;cl.biz='';
// 5) variation + determinism
const rep3=[];own.vis=true;own.x=1;own.z=0;Eco.ts.inv.timber=18;for(let i=0;i<3;i++){T.open(10);rep3.push(T.choose('biz'));T.close();}
ok(new Set(rep3).size>=2,`repeating a question gives varied authored answers (${new Set(rep3).size} distinct in 3 asks)`);
const g1=[];for(let i=0;i<4;i++){T.open(10);g1.push(T.cur.text);T.close();}ok(new Set(g1).size>=2,`greetings vary between visits (${new Set(g1).size} distinct)`);
const R1=fresh(31),R2=fresh(32);[R1,R2].forEach(w=>{w.Sim.npcs.forEach(n=>n.vis=false);const n=w.Sim.npcs[10];n.vis=true;n.x=1;n.z=0;w.Sim.player.x=0;w.Sim.player.z=0;});const seq=w=>{const o=[];for(let i=0;i<3;i++){w.Sim.Talk.open(10);o.push(w.Sim.Talk.cur.text,w.Sim.Talk.choose('price'),w.Sim.Talk.choose('self'));w.Sim.Talk.close();}return o.join('|');};
ok(seq(R1)===seq(R2),'dialogue is deterministic for identical state (not random per load)');
// 6) all options on all NPCs, across random states: no crashes, no junk
let junk=0,cnt=0;const states=()=>{Eco.ts.inv.timber=Math.floor(rand()*41);Eco.ow.inv.timber=Math.floor(rand()*12);Eco.ow.inv.furniture=Math.floor(rand()*20);Eco.mine.inv.ore=Math.floor(rand()*40);Eco.crew.inv.timber=Math.floor(rand()*20);Eco.port.inv.timber=Math.floor(rand()*60);Sim.ship.state=['offshore','approach','unloading','departing'][Math.floor(rand()*4)];Sim.ship.wait=rand()*70;Eco.ms.trade=rand()<.5?1:0;Eco.contract.state=rand()<.5?'offer':'active';};
for(let r=0;r<30;r++){states();Sim.npcs.forEach(n=>{n.vis=true;n.x=1;n.z=0;n.wait=999;});for(const n of Sim.npcs){T.open(n.id);if(!T.cur)continue;const opts=T.cur.options.filter(o=>!o.act&&o.id!=='bye');for(const o of opts){const tx=T.choose(o.id);cnt++;if(!tx||/undefined|NaN|\[object|null/.test(tx))junk++;}if(/undefined|NaN/.test(T.cur.text))junk++;T.close();}}
ok(junk===0,`${cnt} answers over 30 random world states for all 29 NPCs: no empty/undefined/NaN text (${junk} bad)`);
// truck wording for each real truck state (state set directly, then restored)
{const w=fresh(41),S=w.Sim,E=w.Eco;S.npcs.forEach(n=>n.vis=false);const fw=S.npcs[0];fw.vis=true;fw.x=1;fw.z=0;S.player.x=0;S.player.z=0;let okc=0;for(const [st,re] of [['idle',/waiting at the yard/],['loading',/loading logs/],['unloading',/unloading/],['waiting',/yard is full/],['stranded',/stuck/]]){S.truck.state=st;S.Talk.open(0);const tx=S.Talk.choose('truck');S.Talk.close();if(re.test(tx))okc++;else console.log('   truck wording miss',st,tx);}ok(okc===5,`forestry worker describes the truck's real state (${okc}/5 states)`);}
// 7) consequences (existing systems only), applied exactly once
Sim.npcs.forEach(n=>{n.vis=false;});[10,11].forEach(i=>{const n=Sim.npcs[i];n.vis=true;n.x=1;n.z=i-10;n.wait=999;});Sim.player.x=0;Sim.player.z=0;
Eco.player.cash=5000;Eco.player.inv.timber=0;Eco.ts.inv.timber=10;Eco.ts.cash=100000;let c0=Eco.player.cash,s0=Eco.ts.inv.timber,ts0=Eco.ts.cash;T.open(10);let rr=T.choose('a_buy');
ok(Eco.player.inv.timber===1&&Eco.ts.inv.timber===s0-1&&Eco.player.cash===c0-2000&&Eco.ts.cash===ts0+2000,`"Buy 1 timber" through dialogue: player +1 timber, −$20, supplier −1 stock and +$20, once ("${rr}")`);
Eco.player.cash=500;const sBefore=[Eco.ts.inv.timber,Eco.player.inv.timber,Eco.player.cash];rr=T.choose('a_buy');ok(Eco.ts.inv.timber===sBefore[0]&&Eco.player.inv.timber===sBefore[1]&&Eco.player.cash===sBefore[2]&&/cannot|afford/i.test(rr),`insufficient cash: nothing changes, NPC explains ("${rr}")`);T.close();
Eco.contract={need:5,reward:6000,state:'offer'};Eco.ow.cash=80000;T.open(11);ok(T.cur.options.some(o=>o.id==='a_contract'&&/Accept/.test(o.label)),'workshop owner offers the contract while it is open');rr=T.choose('a_contract');ok(Eco.contract.state==='active','accepting in dialogue activates the same contract as the G key');
ok(T.cur.options.some(o=>/Deliver 5/.test(o.label)),'option changes to "Deliver" once active');Eco.player.inv.timber=5;const cs=Eco.player.cash,k0=Eco.contracts;rr=T.choose('a_contract');ok(Eco.contracts===k0+1&&Eco.player.cash===cs+6000&&Eco.player.inv.timber===0,`delivering in dialogue pays the reward once (+$60, ${Eco.contracts} contract done; "${rr}")`);
Eco.ow.inv.furniture=2;Eco.player.cash=9000;T.close();T.open(11);const f0=Eco.player.inv.furniture;T.choose('a_furn');ok(Eco.player.inv.furniture===f0+1&&Eco.ow.inv.furniture===1,'"Buy a furniture set" works through dialogue');T.close();
// 8) closing restores gameplay; NPC resumes; walk-away auto-close
Sim.npcs.forEach(n=>{n.vis=false;});const wk=Sim.npcs[0];wk.vis=true;wk.x=1;wk.z=0;wk.wait=0;wk.dest=null;wk.phase='work';Sim.player.x=0;Sim.player.z=0;T.open(0);const px0=wk.x,pz0=wk.z;for(let i=0;i<100;i++)Sim.update(.05);
ok(wk.talking&&wk.x===px0&&wk.z===pz0,'while talking, the NPC stays put and faces the player');T.close();ok(!wk.talking&&T.cur===null,'closing clears the talking state');for(let i=0;i<200;i++)Sim.update(.05);ok(Math.hypot(wk.x-px0,wk.z-pz0)>.5||wk.wait>0||wk.dest,'after closing, the NPC resumes its routine');
T.open(0);Sim.player.x=-20;Sim.player.z=-20;Sim.update(.05);ok(T.cur===null&&!wk.talking,'walking away (> range+3 m) closes the conversation automatically');
console.log(`\n${pass} passed, ${fail} failed`);
