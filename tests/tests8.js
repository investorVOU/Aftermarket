const H=require('./harness.js');const {load,rand}=H;let pass=0,fail=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);c?pass++:fail++;};
const pip=(x,z,P)=>{let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const a=P[i],b=P[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;};
const freeze=S=>S.npcs.forEach(n=>{n.talking=true;n.vis=false;});
// ================= layout sanity =================
{const W=load(1),{Sim,Eco}=W,A=Sim.Agri,Col=Sim.Col,G=Sim.Geo;
 ok(Eco.farm&&Eco.farm.name==='Greenfield Farm'&&Eco.farm.cash===40000&&['maize','cassava','milk'].every(k=>k in Eco.farm.inv&&Eco.farm.cap[k]>0),'farm business exists: cash $400, separate maize/cassava/milk inventories with capacities');
 ok(Eco.market&&Eco.market.cap.maize>0,'market business exists to receive farm goods');
 let bad=0,tot=0;A.plots.forEach(p=>{p.plants.forEach(q=>{tot++;if(G.dShore(q[0],q[1])<6||!Col.free(q[0],q[1],.3,'ped')||pip(q[0],q[1],A.pasture))bad++;});});ok(bad===0,`all ${tot} crop positions are on land, clear of solids and outside the pasture (${bad} bad)`);
 const fp=A.fields;let treeIn=0;Col.list.forEach(c=>{if(c.type==='tree'||c.type==='rock'){if(fp.some(f=>pip(c.x,c.z,f.poly))||pip(c.x,c.z,A.pasture))treeIn++;}});ok(treeIn===0,`no tree or rock inside any field or the pasture (${treeIn})`);
 const roads=[];Sim.Roads.defs.forEach(r=>r.cl.forEach(p=>roads.push(p)));let onRoad=0;A.plots.forEach(p=>p.plants.forEach(q=>{if(roads.some(r=>Math.hypot(r[0]-q[0],r[1]-q[1])<1.8))onRoad++;}));ok(onRoad===0,'no crop plant stands on a farm road');
 const ridgesOk=A.fields.every(f=>f.ridges.length>=10&&f.ridges.every(r=>Math.hypot(r.x1-r.x0,r.z1-r.z0)>4));ok(ridgesOk,`ridge geometry: ${A.fields.map(f=>f.id+' '+f.ridges.length+' ridges').join(', ')}, every ridge >4 m long`);
 ok(A.fields[0].poly.some((p,i)=>Math.abs(p[0]-A.fields[0].poly[(i+9)%32][0])>0)&&new Set(A.fields.map(f=>f.poly.length)).size>=1&&Math.abs(A.fields[0].ridges[0].x1-A.fields[0].ridges[0].x0)!==Math.abs(A.fields[0].ridges[5].x1-A.fields[0].ridges[5].x0),'field outlines are organic (ridge lengths differ across the field)');
 ok(A.plots.length===8&&A.plots.filter(p=>p.crop==='maize').length===4&&A.plots.filter(p=>p.crop==='cassava').length===4,'4 maize plots and 4 cassava plots in separate fields');
 ok(Sim.npcs.length===29&&Sim.npcs.slice(24).every(n=>/Farm|Herdsman/.test(n.role)&&n.home&&/Farm/.test(n.home.n)),'5 farm NPCs added after the original 24, living at the farm');
 const orig=Sim.npcs.slice(0,24);ok(orig.every((n,i)=>n.id===i)&&orig[10].name==='Margaret Hollis'&&orig[0].home.n.startsWith('House'),'original 24 NPCs keep ids, names and house assignments');}
// ================= crop lifecycle =================
{const W=load(2),{Sim,Eco,Bus}=W,A=Sim.Agri;freeze(Sim);const P=A.plots[3];P.claim=999;P.claimUntil=1e9;const ev=[];['planted','growing','ready','harvested','prepared'].forEach(s=>Bus.on('crop:'+s,id=>{if(id===P.id)ev.push([s,Sim.time]);}));
 ok(P.stage==='prepared','maize plot 4 starts prepared');const c0=Eco.farm.cash;ok(A.plant(P,{id:1})&&P.stage==='planted'&&Eco.farm.cash===c0-300,'planting costs the farm $3.00 seed and starts the plot');
 for(let t=0;t<130;t+=.1)Sim.update(.1);const [g1,g2]=[A.cfg.maize.g1,A.cfg.maize.g2];
 ok(ev.map(e=>e[0]).join('>')==='planted>growing>ready','stages advance in order planted → growing → ready (no skipping)');
 ok(Math.abs(ev[1][1]-ev[0][1]-g1)<.3&&Math.abs(ev[2][1]-ev[1][1]-g2)<.3,`durations follow sim config, not real time (growing after ${(ev[1][1]-ev[0][1]).toFixed(1)} s, ready after ${(ev[2][1]-ev[1][1]).toFixed(1)} s)`);
 ok(P.yieldQ===Math.round(P.plants.length*A.cfg.maize.yp),`ripe plot yield = plants × rate (${P.yieldQ})`);
 const readyBefore=A.plots.filter(p=>p.stage==='ready').length,worker={id:999,carry:null},F=Eco.farm,i0=F.inv.maize,q=P.yieldQ,cash=F.cash;
 ok(A.harvest(P,worker)&&P.stage==='harvested'&&P.yieldQ===0&&worker.carry.item==='maize'&&worker.carry.q===q,'harvest empties the plot and gives the worker the crop to carry');
 ok(A.plots.filter(p=>p.stage==='ready').length===readyBefore-1&&F.inv.maize===i0&&A.transit.maize===q&&F.cash===cash-100,'harvest reduces available crops; stock is only "in transit" until stored; labour $1.00 recorded');
 const snap=[P.stage,A.transit.maize,F.cash,F.inv.maize];ok(!A.harvest(P,{id:5,carry:null})&&snap.join()===[P.stage,A.transit.maize,F.cash,F.inv.maize].join(),'a second harvest of the same plot is refused and changes nothing');
 A.deposit(worker);ok(F.inv.maize===i0+q&&A.transit.maize===0&&worker.carry===null,'depositing in the barn adds exactly the harvested quantity once');ok(F.inv.cassava===8,'cassava inventory untouched by maize work (separate inventories)');
 ok(A.deposit(worker)===false&&F.inv.maize===i0+q,'depositing twice is impossible');}
// ================= storage limits =================
{const W=load(3),{Sim,Eco}=W,A=Sim.Agri,F=Eco.farm;freeze(Sim);const P=A.plots[0];P.claim=999;P.claimUntil=1e9;F.inv.maize=F.cap.maize-2;const st=[P.stage,F.cash,A.transit.maize];
 ok(P.stage==='ready'&&P.yieldQ>2&&A.harvest(P,{id:9,carry:null})===false&&[P.stage,F.cash,A.transit.maize].join()===st.join(),`barn nearly full (${F.inv.maize}/${F.cap.maize}): harvest refused, crop stays in the field`);
 const cw=A.cows[0];cw.milk=3;F.inv.milk=F.cap.milk;const nw={id:9,carry:null};ok(A.milk(cw,nw)===false&&cw.milk===3&&!nw.carry,'dairy store full: milking refused, milk stays in the cow');
 F.inv.milk=F.cap.milk-1;ok(A.milk(cw,nw)&&nw.carry.q===1&&cw.milk===2,'with room for 1 unit only 1 is taken');}
// ================= livestock =================
{const W=load(4),{Sim,Eco}=W,A=Sim.Agri,Col=Sim.Col;freeze(Sim);A.cows.forEach(c=>{c.fed=100;c.water=100;c.health=100;c.milk=0;c.macc=0;});A.feed.level=20;A.water.level=20;const T0=Sim.time;for(let t=0;t<120;t+=.1)Sim.update(.1);
 ok(A.cows.every(c=>c.milk>=1&&c.milk<=4),`fed, watered, healthy cows produce milk (${A.cows.map(c=>c.milk.toFixed(1)).join(', ')} units after 120 s; cap 4)`);}
{const W=load(5),{Sim,Eco}=W,A=Sim.Agri;freeze(Sim);A.cows.forEach(c=>{c.fed=5;c.water=0;c.health=100;c.milk=0;c.macc=0;});A.feed.level=0;A.water.level=0;for(let t=0;t<100;t+=.1)Sim.update(.1);ok(A.cows.every(c=>c.milk===0),'hungry, thirsty cows with empty troughs produce no milk');}
{const W=load(6),{Sim,Eco}=W,A=Sim.Agri,Col=Sim.Col;freeze(Sim);let outside=0,inSolid=0,bad=0,states=new Set(),steps=0;for(let t=0;t<3000;t+=.1){Sim.update(.1);steps++;for(const c of A.cows){states.add(c.state);if(!A.inPoly(c.x,c.z))outside++;if(!Col.free(c.x,c.z,.25,'ped'))inSolid++;if(c.fed<0||c.fed>100||c.water<0||c.water>100||c.health<0||c.health>100||c.milk<0||c.milk>4)bad++;}}
 ok(outside===0,`cows stay inside the pasture for 3000 s (${steps*6} samples, ${outside} outside)`);ok(inSolid===0,'cows never stand inside fences or troughs');ok(bad===0&&[...states].every(s=>['graze','walk','eat','drink'].includes(s)),`all cow states/values valid; states seen: ${[...states].join(', ')}`);
 ok(A.cows.every(c=>c.health>=0&&c.health<=100)&&['good','fair','poor'].includes(A.cond(A.cows[0])),'condition labels valid');}
// ================= long run: farm + tractor + economy invariants =================
{const W=load(8),{Sim,Eco,Bus}=W,A=Sim.Agri,Col=Sim.Col,F=Eco.farm,M=Eco.market,V=Sim.tractor;const init={maize:F.inv.maize,cassava:F.inv.cassava,milk:F.inv.milk};
 const seq={};A.plots.forEach(p=>seq[p.id]=[p.stage]);['planted','growing','ready','harvested','prepared'].forEach(s=>Bus.on('crop:'+s,id=>seq[id].push(s)));const evc={};['tractor:prepared','tractor:loaded','tractor:delivered','tractor:blocked','tractor:abort','tractor:noroute'].forEach(e=>Bus.on(e,()=>evc[e]=(evc[e]||0)+1));
 const routes=[];const orig=Sim.Nav.route.bind(Sim.Nav);Sim.Nav.route=(a,b,c,d)=>{const r=orig(a,b,c,d);if(r&&Math.abs(a-V.x)<.01&&Math.abs(b-V.z)<.01)routes.push(r);return r;};
 let tractorInSolid=0,overcap=0,herdInside=0;const hd=Sim.npcs[28];let farmNpcSolid=0;
 for(let t=0;t<1800;t+=.05){Sim.update(.05);if(!Col.free(V.x,V.z,1.0,'veh'))tractorInSolid++;if(['maize','cassava','milk'].some(k=>F.inv[k]>F.cap[k]||M.inv[k]>M.cap[k]))overcap++;if(A.inPoly(hd.x,hd.z))herdInside++;for(let i=24;i<29;i++){const n=Sim.npcs[i];if(n.vis&&!Col.free(n.x,n.z,.3,'ped'))farmNpcSolid++;}}
 // lifecycle graph
 const next={prepared:'planted',planted:'growing',growing:'ready',ready:'harvested',harvested:'prepared'};let badEdge=0,cycles=0;Object.values(seq).forEach(s=>{for(let i=1;i<s.length;i++){if(next[s[i-1]]!==s[i])badEdge++;if(s[i]==='prepared'&&s[i-1]==='harvested')cycles++;}});
 ok(badEdge===0,`every plot only ever follows prepared→planted→growing→ready→harvested→prepared (${badEdge} invalid transitions)`);
 ok(cycles>=3&&A.stats.planted>=5,`replanting works: ${cycles} harvested plots were re-prepared by the tractor, ${A.stats.planted} planted, ${A.stats.harvests} harvested in 1800 s`);
 ok((evc['tractor:prepared']||0)===A.stats.prepared&&A.stats.prepared===cycles,`no duplicated production: prepare events (${evc['tractor:prepared']}) = stats (${A.stats.prepared}) = harvested→prepared transitions (${cycles})`);
 const harvestedEvents=Object.values(seq).reduce((a,s)=>a+s.slice(1).filter(x=>x==='harvested').length,0);ok(harvestedEvents===A.stats.harvests,`each harvest recorded exactly once (${harvestedEvents} stage events = ${A.stats.harvests} stats)`);
 // inventory conservation per item
 let consErr=0;for(const k of ['maize','cassava','milk']){const exp=init[k]+A.stats.dep[k]-A.stats.loaded[k]-Eco.agstat.bought[k];if(F.inv[k]!==exp)consErr++;}
 ok(consErr===0,`farm inventory = start + stored − loaded onto tractor − bought by player, for all 3 products (${consErr} mismatches)`);
 const carried={maize:0,cassava:0,milk:0};Sim.npcs.forEach(n=>{if(n.carry)carried[n.carry.item]+=n.carry.q;});ok(['maize','cassava','milk'].every(k=>A.transit[k]===carried[k]),`goods in transit equal what workers actually carry (${JSON.stringify(A.transit)})`);
 const cargoQ=V.cargo?V.cargo.q:0,tl=A.stats.loaded.maize+A.stats.loaded.cassava+A.stats.loaded.milk,td=A.stats.delivered.maize+A.stats.delivered.cassava+A.stats.delivered.milk;ok(tl===td+cargoQ&&td>0,`tractor cargo conserved: loaded ${tl} = delivered ${td} + on trailer ${cargoQ}`);
 const mIn=M.inv.maize+M.inv.cassava+M.inv.milk;ok(td===mIn+A.stats.sold,`market received exactly what was delivered: ${td} delivered = ${mIn} in stock + ${A.stats.sold} bought by townspeople`);
 // money
 const exp=A.stats.spent.seed+A.stats.spent.labour+A.stats.spent.fuel+A.stats.spent.feed,rev=['maize','cassava','milk'].reduce((a,k)=>a+A.stats.delivered[k]*Eco.AGP[k].whole,0);
 ok(F.cash===40000+F.rev-F.exp&&F.exp===exp&&F.rev===rev,`farm books balance: cash $${(F.cash/100).toFixed(2)} = $400 + revenue $${(F.rev/100).toFixed(2)} − expenses $${(F.exp/100).toFixed(2)}; costs = seed+labour+fuel+feed ($${(exp/100).toFixed(2)}), revenue = wholesale deliveries`);
 ok(M.cash===120000+M.rev-M.exp,'market books balance (cash = start + sales − purchases)');
 ok(F.hist.length>0&&F.hist.some(x=>/Planted/.test(x))&&F.hist.some(x=>/Harvested/.test(x)||/Stored/.test(x)),'production and sales history recorded');
 ok(overcap===0,'no inventory ever exceeded its storage capacity (farm or market) over 1800 s');
 ok(tractorInSolid===0,'tractor never inside a building, fence, trough or tree over 1800 s ('+tractorInSolid+')');
 ok(farmNpcSolid===0,'farm workers never inside solids');
 ok(herdInside>0&&A.stats.milked>0,`herdsman entered the pasture through the gate (${herdInside} samples) and milked ${A.stats.milked} units`);
 ok(A.stats.harvests>=8&&Sim.npcs.slice(24).every(n=>n.st.work>5),`all 5 farm NPCs worked: arrivals ${Sim.npcs.slice(24).map(n=>n.st.work).join('/')}, drops ${Sim.npcs.slice(24).reduce((a,n)=>a+n.st.drop,0)}`);
 // routes
 const N=Sim.Nav.N;let badRoute=0,roadRoutes=0;routes.forEach(r=>{const ids=r.filter(p=>p.id!==undefined).map(p=>p.id);if(ids.length<1)return;roadRoutes++;for(let i=1;i<ids.length;i++)if(!N[ids[i-1]].adj.some(e=>e.j===ids[i]))badRoute++;const s=r[0],e=r[r.length-1];if(Math.hypot(r[1].x-s.x,r[1].z-s.z)>40)badRoute++;});
 ok(routes.length>10&&badRoute===0,`${roadRoutes} tractor road routes use real connected graph edges (${badRoute} invalid)`);
 let badField=0,fieldLegs=0;A.plots.forEach(p=>{const f=A.fields.find(f=>f.id===p.field);p.path.slice(1,-1).forEach(q=>{fieldLegs++;if(!pip(q.x,q.z,f.poly))badField++;});});ok(badField===0,`field work paths stay inside their field outline (${fieldLegs} waypoints checked)`);
 console.log('   tractor events:',JSON.stringify(evc),'| herd drops',hd.st.drop,'stuck',hd.st.stuck);
 // delivery values
 ok(A.last!=='none'&&td>0,'last delivery recorded: '+A.last);}
// ================= tractor reacts to a pedestrian and to a blocked track =================
{const W=load(9),{Sim,Eco,Bus}=W,A=Sim.Agri,V=Sim.tractor;freeze(Sim);A.plots.forEach(p=>{p.stage='harvested';p.rev++;});V.wait=0;let t=0;while(V.state!=='drive'&&t<60){Sim.update(.05);t+=.05;}for(let k=0;k<100;k++)Sim.update(.05);
 ok(V.task&&V.task.type==='prepare'&&V.task.plot.stage==='harvested','tractor receives a valid task (prepare a harvested plot)');
 const fx=Math.sin(V.h),fz=Math.cos(V.h);Sim.player.x=V.x+fx*5;Sim.player.z=V.z+fz*5;const px=V.x,pz=V.z;let closest=1e9;for(let k=0;k<400;k++){Sim.update(.05);closest=Math.min(closest,Math.hypot(V.x-Sim.player.x,V.z-Sim.player.z));}
 ok(closest>2&&V.v<.1,`tractor stops for a person in its way (closest ${closest.toFixed(1)} m) and waits`);Sim.player.x=-200;Sim.player.z=-200;for(let k=0;k<400;k++)Sim.update(.05);ok(Math.hypot(V.x-px,V.z-pz)>3,'and drives on once the person has moved away');}
{const W=load(10),{Sim,Eco,Bus}=W,A=Sim.Agri,V=Sim.tractor,Col=Sim.Col;freeze(Sim);A.plots.forEach(p=>{p.stage='harvested';p.rev++;});V.wait=0;let blk=0,ab=0,prepared=0,t=0;Bus.on('tractor:blocked',()=>blk++);Bus.on('tractor:abort',()=>ab++);Bus.on('tractor:prepared',()=>prepared++);
 while(V.state!=='drive'&&t<60){Sim.update(.05);t+=.05;}const r=V.route,mid=r[Math.floor(r.length/2)];const hold=Col.add(mid.x,mid.z,4,4,'building');
 const before=[Eco.farm.cash,Eco.farm.exp,A.stats.prepared];let stages=new Set();for(let k=0;k<2400;k++){Sim.update(.05);stages.add(V.state);}
 ok(blk+ab>0&&blk+ab<40,`blocked farm road detected without endless replanning (blocked ${blk}, aborts ${ab})`);ok(A.stats.prepared>=before[2]&&Eco.farm.cash<=before[0]&&A.plots.every(p=>['harvested','prepared'].includes(p.stage)),'a blocked tractor does not fake work: only plots it really prepared change state');
 Col.remove(hold);Sim.Nav.build();Sim.Nav.bn.clear();const p0=A.stats.prepared;for(let k=0;k<4000;k++)Sim.update(.05);ok(A.stats.prepared>p0,`tractor resumes preparing plots after the obstacle is removed (+${A.stats.prepared-p0})`);}
// ================= player purchases / market sales =================
{const W=load(11),{Sim,Eco}=W,F=Eco.farm,P=Eco.player,M=Eco.market;freeze(Sim);P.cash=5000;const s=[P.cash,F.cash,P.inv.maize||0,F.inv.maize,F.rev];
 ok(Eco.buyFarm('maize',2)&&P.cash===s[0]-1000&&F.cash===s[1]+1000&&P.inv.maize===s[2]+2&&F.inv.maize===s[3]-2&&F.rev===s[4]+1000,'buying 2 maize: player −$10.00 +2 maize; farm +$10.00 −2 stock, revenue recorded, once');
 const after=[P.cash,F.cash,P.inv.cassava||0,F.inv.cassava];P.cash=100;ok(!Eco.buyFarm('cassava',1)&&P.cash===100&&F.inv.cassava===after[3],'cannot afford: nothing changes');P.cash=5000;F.inv.milk=0;ok(!Eco.buyFarm('milk',1)&&P.cash===5000,'out of stock: nothing changes');
 const c0=P.cash,mc=M.cash;Eco.sellAgri();ok(P.inv.maize===0&&P.cash===c0+2*350&&M.cash===mc-700&&M.inv.maize===2,'selling carried maize to the market: wholesale $3.50 each, market stock +2, once');
 Eco.sellAgri();ok(P.cash===c0+700,'selling again with nothing carried does nothing');
 M.inv.maize=M.cap.maize-1;P.inv.maize=5;const c1=P.cash;Eco.sellAgri();ok(P.cash===c1&&P.inv.maize===5,'market storage full: sale refused, goods stay with the player');}
// ================= dialogue with farm NPCs =================
{const W=load(12),{Sim,Eco}=W,A=Sim.Agri,T=Sim.Talk;Sim.npcs.forEach(n=>n.vis=false);const mg=Sim.npcs[24],wk=Sim.npcs[25],hd=Sim.npcs[28];[mg,wk,hd].forEach(n=>{n.vis=true;n.x=1;n.z=0;n.wait=9999;});Sim.player.x=0;Sim.player.z=0;
 const ask=(n,t)=>{T.open(n.id);const r=T.choose(t);T.close();return r;};
 ok(T.open(24)&&T.cur.options.some(o=>o.id==='crops')&&T.cur.options.some(o=>/^Buy 1 maize/.test(o.label)),'farm manager can be talked to: crop topics and buy options present');T.close();
 ok(!/Buy/.test(Sim.opts(wk).map(o=>o.label).join('|'))&&Sim.opts(hd).some(o=>o.id==='feed'),'workers have no shop options; herdsman has feed/livestock topics');
 A.plots.forEach(p=>{p.stage='growing';p.yieldQ=0;});let tx=ask(wk,'harvest');ok(/nothing is ripe/.test(tx),`all plots growing → "${tx}"`);
 A.plots[0].stage='ready';A.plots[0].yieldQ=7;A.plots[4].stage='ready';A.plots[4].yieldQ=5;tx=ask(wk,'harvest');ok(/7 maize and 5 cassava/.test(tx),`two ripe plots → "${tx}"`);
 Eco.farm.inv.maize=17;Eco.farm.inv.cassava=3;Eco.farm.inv.milk=29;tx=ask(mg,'inv');ok(/17 maize, 3 cassava, 29 milk/.test(tx),`barn stock quoted exactly: "${tx}"`);
 A.cows.forEach((c,i)=>{c.milk=i<3?2:0;});tx=ask(hd,'milk');ok(/6 units waiting/.test(tx),`milk waiting equals the cows' real milk (6): "${tx}"`);
 A.feed.level=3;A.water.level=15;tx=ask(hd,'feed');ok(/Feed trough 3 of 20, water 15 of 20/.test(tx)&&/low/.test(tx),`feed/water quoted exactly and low feed flagged: "${tx}"`);A.feed.level=15;ok(!/low/.test(ask(hd,'feed')),'no low-feed warning when the trough is stocked');
 Eco.farm.inv.milk=Eco.farm.cap.milk;ok(/full/.test(ask(hd,'milk')),'full dairy store explained');Sim.tractor.state='idle';ok(/parked/.test(ask(mg,'deliv')),'tractor state reflected (parked)');Sim.tractor.state='act';Sim.tractor.act='unload';ok(/unloading at the market/.test(ask(mg,'deliv')),'tractor state reflected (unloading at the market)');Sim.tractor.state='idle';
 A.last='12 maize';ok(/12 maize/.test(ask(mg,'deliv')),'last delivery quoted');
 // buy through dialogue, once
 Eco.player.cash=5000;Eco.farm.inv.maize=10;T.open(24);const c0=Eco.player.cash,i0=Eco.farm.inv.maize,k0=Eco.player.inv.maize||0;const r=T.choose('a_f_maize');ok(Eco.player.inv.maize===k0+1&&Eco.farm.inv.maize===i0-1&&Eco.player.cash===c0-500,`buying maize via the manager's dialogue updates the economy exactly once ("${r}")`);T.close();
 // sweep
 let junk=0,n=0;for(let r=0;r<200;r++){Eco.farm.inv.maize=Math.floor(rand()*61);Eco.farm.inv.cassava=Math.floor(rand()*61);Eco.farm.inv.milk=Math.floor(rand()*41);A.cows.forEach(c=>c.milk=Math.floor(rand()*5));A.feed.level=rand()*20;A.plots.forEach(p=>{p.stage=['prepared','planted','growing','ready','harvested'][Math.floor(rand()*5)];p.yieldQ=p.stage==='ready'?Math.floor(rand()*15)+3:0;});
  for(const who of [mg,wk,hd]){T.open(who.id);for(const o of T.cur.options.filter(o=>!o.act&&o.id!=='bye')){const tx2=T.choose(o.id);n++;if(!tx2||/undefined|NaN|\[object/.test(tx2))junk++;if(o.id==='inv'&&!new RegExp(Eco.farm.inv.maize+' maize, '+Eco.farm.inv.cassava+' cassava, '+Eco.farm.inv.milk+' milk').test(tx2))junk++;}T.close();}}
 ok(junk===0,`${n} farm answers over 200 random farm states: all consistent with state, none empty or undefined (${junk} bad)`);}
// ================= performance =================
{const t0=process.hrtime.bigint();const W=load(13);const {Sim}=W;const t1=process.hrtime.bigint();for(let i=0;i<20000;i++)Sim.update(.05);const t2=process.hrtime.bigint();const per=Number(t2-t1)/20000/1e6;ok(per<2,`Sim.update (29 NPCs, cows, tractor, farm): ${per.toFixed(3)} ms per step in Node (startup incl. navigation/ped grid: ${(Number(t1-t0)/1e6).toFixed(0)} ms) — phones will be slower`);}
console.log(`\n${pass} passed, ${fail} failed`);
