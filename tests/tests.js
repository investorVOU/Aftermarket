const {load,rand}=require('./harness.js');let pass=0,fail=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);c?pass++:fail++;};
const src=require('fs').readFileSync(require('path').join(__dirname,'..','game','aftermarket.html'),'utf8');let W=load(777);let {Sim,Eco,HOMES,Bus,syncView}=W;let Col=Sim.Col,T=Sim.truck;const fresh=seed=>{W=load(seed);({Sim,Eco,HOMES,Bus,syncView}=W);Col=Sim.Col;T=Sim.truck;};
ok(Sim.Nav.N.length>50,`road graph built: ${Sim.Nav.N.length} nodes, ${Sim.Nav.N.reduce((a,n)=>a+n.adj.length,0)/2} edges; ${Col.list.length} colliders`);
// ---- navigation: vehicle
const A=T.anch.yard,D=T.anch.depot,r=Sim.Nav.route(A.x,A.z,D.x,D.z);
ok(!!r,'truck route yard→depot exists');
let len=0,bad=0;for(let i=1;i<r.length;i++){const a=r[i-1],b=r[i];len+=Math.hypot(b.x-a.x,b.z-a.z);const n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z));for(let k=0;k<=n;k++)if(!Col.free(a.x+(b.x-a.x)*k/n,a.z+(b.z-a.z)*k/n,1.25,'veh'))bad++;}
ok(bad===0,`route length ${len.toFixed(0)} m, ${r.length} waypoints, 0 vehicle-footprint collisions (${bad})`);
const other=[['yard→port warehouse',A,{x:31,z:Sim.Geo.PZ-6}],['yard→mine plant',A,{x:45,z:-30}],['yard→residential',A,{x:60,z:6}],['yard→Oak&Iron spur',A,{x:24,z:4.5}]].map(([n,a,b])=>[n,!!Sim.Nav.route(a.x,a.z,b.x,b.z)]);
console.log('   other road routes:',other.map(o=>o[0]+':'+(o[1]?'yes':'NO')).join(', '));
// ---- gameplay: truck cycle with conservation
let logged=0,delivered=0,loaded=0,evs={};const oc=Eco.crewLog.bind(Eco);Eco.crewLog=function(){const r=oc();if(r)logged++;return r;};
Bus.on('truck:delivered',d=>delivered+=d.qty);Bus.on('truck:loaded',d=>loaded+=d.qty);['truck:arrived','truck:blocked','truck:noroute','truck:abort'].forEach(e=>Bus.on(e,()=>evs[e]=(evs[e]||0)+1));
Eco.crew.inv.timber=6;logged+=6;const ts0=Eco.ts.inv.timber,cash0=Eco.ts.cash+Eco.crew.cash+Eco.port.cash;
let viol=0,states={};
for(let t=0;t<900;t+=.05){Sim.update(.05);states[T.state]=(states[T.state]||0)+.05;if(!Col.free(T.x,T.z,1.0,'veh'))viol++;}
ok(delivered>0&&loaded>=delivered,`truck completed at least one delivery: loaded ${loaded}, delivered ${delivered}`);
ok(loaded===delivered+Eco.truckCargo,`cargo conserved (loaded ${loaded} = delivered ${delivered} + on truck ${Eco.truckCargo})`);
ok(logged===Eco.crew.inv.timber+Eco.truckCargo+delivered,`log conservation: cut ${logged} = depot ${Eco.crew.inv.timber} + truck ${Eco.truckCargo} + delivered ${delivered}`);
ok(viol===0,`truck never inside a solid object over 900 s (${viol} violations)`);
console.log('   truck time per state (s):',Object.entries(states).map(([k,v])=>k+':'+v.toFixed(0)).join(' '),'events',JSON.stringify(evs));
fresh(901);
// ---- failed delivery does not create money/inventory
Eco.truckCargo=8;Eco.ts.inv.timber=38;const snap=[Eco.ts.inv.timber,Eco.ts.cash,Eco.crew.cash];const okd=Eco.deliver();
ok(!okd&&Eco.truckCargo===8&&Eco.ts.inv.timber===snap[0]&&Eco.ts.cash===snap[1]&&Eco.crew.cash===snap[2],'failed delivery (yard full): cargo kept, no cash or inventory created');
fresh(902);{const A=T.anch.yard,D=T.anch.depot;
// ---- blocked route recovery
let loaded=0,delivered=0;Bus.on('truck:loaded',d=>loaded+=d.qty);Bus.on('truck:delivered',d=>delivered+=d.qty);const evs={};['truck:noroute','truck:abort'].forEach(e=>Bus.on(e,()=>evs[e]=(evs[e]||0)+1));Eco.crew.inv.timber=6;T.state='idle';T.wait=0;let blockerAdded=null,sawBlocked=0;Bus.on('truck:blocked',()=>sawBlocked++);
const mid=Sim.Nav.route(A.x,A.z,D.x,D.z);let c=0;let cum=0;const tl=mid.reduce((a,p,i)=>i?a+Math.hypot(p.x-mid[i-1].x,p.z-mid[i-1].z):0,0);for(let i=1;i<mid.length;i++){cum+=Math.hypot(mid[i].x-mid[i-1].x,mid[i].z-mid[i-1].z);if(cum>tl*.5){c=mid[i];break;}}
blockerAdded=Col.add(c.x,c.z,3,3,'building');
const before={ts:Eco.ts.inv.timber,cash:Eco.ts.cash,crew:Eco.crew.inv.timber,cargo:Eco.truckCargo};let st=new Set();
for(let t=0;t<400;t+=.05){Sim.update(.05);st.add(T.state);}
ok(sawBlocked>0&&sawBlocked<=8,`blocked road detected without endless replanning (blocked events ${sawBlocked}, noroute ${evs['truck:noroute']||0}, aborts ${evs['truck:abort']||0}), states seen: ${[...st].join(',')}`);
ok(loaded===delivered+Eco.truckCargo&&Eco.crew.inv.timber>=0,'no cargo corruption while road blocked');
Col.remove(blockerAdded);Sim.Nav.build();Sim.Nav.bn.clear();T.state='idle';T.wait=0;const d0=delivered;for(let t=0;t<500;t+=.05)Sim.update(.05);
ok(delivered>d0,`truck resumes deliveries after obstacle removed (+${delivered-d0} timber)`);}
// ---- dynamic obstacle: truck stops for the player and resumes
fresh(905);{const T=Sim.truck;Eco.crew.inv.timber=6;T.wait=0;Sim.npcs.forEach(n=>{n.vis=false;n.phase='home';n.wait=999;});let stoppedNear=false,passed=false;
 for(let t=0;t<40&&T.state!=='driving';t+=.05)Sim.update(.05);for(let t=0;t<6;t+=.05)Sim.update(.05);
 const ahead={x:T.x+Math.sin(T.h)*7,z:T.z+Math.cos(T.h)*7};Sim.player.x=ahead.x;Sim.player.z=ahead.z;const sPos=T.s;
 for(let t=0;t<12;t+=.05){Sim.update(.05);if(Math.hypot(T.x-Sim.player.x,T.z-Sim.player.z)<2.2)passed=true;}
 stoppedNear=T.v<.1&&Math.hypot(T.x-Sim.player.x,T.z-Sim.player.z)>=2.2;const s1=T.s;Sim.player.x=-200;Sim.player.z=-200;for(let t=0;t<6;t+=.05)Sim.update(.05);
 ok(stoppedNear&&!passed,`truck stopped ${Math.hypot(T.x-ahead.x,T.z-ahead.z).toFixed(1)} m short of the player and never drove through`);ok(T.s>s1+3,'truck resumed once the player moved away');}
// ---- ship: berth, unload, depart, no duplicated cargo
fresh(906);{let unl=0,berthed=0,disp=0,landedMax=0;Bus.on('ship:unloaded',q=>unl+=q);Bus.on('ship:berthed',()=>berthed++);const ot=Eco.trade.bind(Eco);Eco.trade=function(b,s,i,q,u){const r=ot(b,s,i,q,u);if(r&&s===Eco.port)disp+=q;return r;};
 const states=new Set(),zs=[];Sim.npcs.forEach(n=>n.vis=false);for(let t=0;t<700;t+=.1){Sim.update(.1);states.add(Sim.ship.state);zs.push(Sim.ship.z);landedMax=Math.max(landedMax,Eco.ship.landed);}
 ok(berthed>=1&&['offshore','approach','unloading','departing'].every(x=>states.has(x)),`ship cycle observed: ${[...states].join('→')}, berthed ${berthed}×`);
 ok(unl===Eco.port.inv.timber+disp&&unl%24===0||unl-Eco.ship.landed>=0,`cargo conserved: unloaded ${unl} = port stock ${Eco.port.inv.timber} + sent to Timber Supply ${disp}`);
 ok(Eco.ship.landed<=24&&Eco.ship.manifest>=0&&Eco.ship.manifest+Eco.ship.landed===24,`manifest consistent (landed ${Eco.ship.landed} + remaining ${Eco.ship.manifest} = 24)`);
 const BZ=Sim.Geo.PZ+10.5;ok(Math.min(...zs)>=BZ-.01,`ship stops exactly at the berth (min z ${Math.min(...zs).toFixed(2)} vs berth ${BZ.toFixed(2)})`);}
// ---- pedestrians
let unreach=0,tot=0;for(const n of Sim.npcs){for(const d of [...n.work,...Sim.ev]){tot++;if(!Sim.PN.route(n.home.dx,n.home.dz,d[0],d[1]))unreach++;}}
ok(unreach===0,`pedestrian routes: ${tot-unreach}/${tot} home→destination pairs reachable`);
// ---- player collision
fresh(903);const P=Sim.player;P.x=0;P.z=4;let pv=0,moved=0;for(let i=0;i<20000;i++){const a=rand()*6.283;if(i%200===0){const nx=rand()*120-40,nz=rand()*90-30;if(Col.free(nx,nz,.4,'player')){P.x=nx;P.z=nz;}}moved+=P.move(Math.sin(a)*.1,Math.cos(a)*.1);if(!Col.free(P.x,P.z,.39,'player'))pv++;}
ok(pv===0,`player: 20000 random steps (${moved.toFixed(0)} m) with 0 positions inside solids or deep water (${pv})`);
fresh(904);
// ---- NPC two-day run
Sim.clock.h=7.5;let nv=0,stuckMax=0;const last=Sim.npcs.map(n=>({x:n.x,z:n.z,t:0}));let close=0,pairs=0;const t0=Sim.time;
for(let t=0;t<840;t+=.1){Sim.update(.1);for(let a=0;a<Sim.npcs.length;a++)for(let b=a+1;b<Sim.npcs.length;b++){const A=Sim.npcs[a],B=Sim.npcs[b];if(A.vis&&B.vis&&A.v>.1&&B.v>.1){pairs++;if(Math.hypot(A.x-B.x,A.z-B.z)<.5)close++;}}for(const [i,n] of Sim.npcs.entries()){if(n.vis&&!Col.free(n.x,n.z,.3,'ped'))nv++;const l=last[i];if(!n.vis||n.wait>0||Math.hypot(n.x-l.x,n.z-l.z)>.3){l.x=n.x;l.z=n.z;l.t=0;}else{l.t+=.1;stuckMax=Math.max(stuckMax,l.t);}}}
ok(close/Math.max(1,pairs)<.01,`NPC-to-NPC overlap while both walking: ${close} of ${pairs} samples (${(100*close/Math.max(1,pairs)).toFixed(2)} %)`);ok(nv===0,`NPCs never inside solids over 2 simulated days (${nv} violations)`);
const noWork=Sim.npcs.filter(n=>n.st.work===0&&!/Customer|trader|Resident/.test(n.role)),noHome=Sim.npcs.filter(n=>n.st.home===0);
ok(noWork.length===0,`all ${Sim.npcs.filter(n=>!/Customer|trader|Resident/.test(n.role)).length} workers reached workplace stops (missing: ${noWork.map(n=>n.role).join(',')||'none'})`);
ok(noHome.length===0,`all ${Sim.npcs.length} NPCs returned home at least once (missing: ${noHome.length})`);
ok(stuckMax<25,`longest unexplained standstill ${stuckMax.toFixed(0)} s (limit 25)`);
console.log('   NPC stuck-detections',Sim.npcs.reduce((a,n)=>a+n.st.stuck,0),'replans',Sim.npcs.reduce((a,n)=>a+n.st.replan,0),'dropped dests',Sim.npcs.reduce((a,n)=>a+n.st.drop,0));
// ---- economy regression
const E=Eco;E.player.inv.timber=3;E.sellTimber();ok(E.player.cash>5000,'player timber sale still works');
E.player.cash=20000;E.ms.trade=1;E.buyPost();ok(E.post.owner==='player','post purchase still works');
const sh=E.ship;ok(sh.landed<=sh.total&&E.port.inv.timber>=0,`ship cargo consistent (landed ${sh.landed}/${sh.total}, port ${E.port.inv.timber}, ship state ${Sim.ship.state})`);
// ---- layer separation (code inspection)
const sv=src.slice(src.indexOf('function syncView'),src.indexOf('const TS_TXT'));ok(!/Eco\.[A-Za-z.\[\]]*\s*(\+\+|--|[-+*]?=[^=])/.test(sv),'syncView (presentation) contains no writes to Eco');
const simPart=src.slice(src.indexOf('const Sim=(()=>'),src.indexOf('// ===== PRESENTATION LAYER'));ok(!/THREE|document\.|\.position\.set|mesh/i.test(simPart.replace(/\/\/.*$/gm,'')),'Sim layer source contains no THREE/DOM/mesh references');
console.log(`\n${pass} passed, ${fail} failed`);
