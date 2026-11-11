(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.Aftermarket=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function seededRandom(seed=12345){let state=seed>>>0;const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);random.getState=()=>state;random.setState=v=>{state=v>>>0;};return random;}
function createGame(options={}){
const random=options.random||seededRandom(options.seed||12345);
const Math=Object.create(globalThis.Math);Math.random=random;
const Bus={h:{},log:[],on(e,f){(this.h[e]=this.h[e]||[]).push(f);},emit(e,d){this.log.push(e);if(this.log.length>300)this.log.shift();(this.h[e]||[]).forEach(f=>f(d));}};
// ===== ECONOMY + BUSINESS + PROGRESSION (no rendering code) =====
const $=c=>'$'+(c/100).toFixed(2);
class Biz{constructor(o){Object.assign(this,{cash:0,inv:{},cap:{},rev:0,exp:0,hist:[],capital:0},o);this.start=this.cash;}note(t){this.hist.unshift(t);this.hist.length=Math.min(this.hist.length,25);}}
const MS={trade:'First Trade',contract:'First Contract',business:'First Business',expansion:'First Expansion',est:'Established Entrepreneur'};
const Eco={log:[],transactions:[],transactionSequence:0,relationships:{},tm:{ts:0,ow:0,cust:0},ms:{},rep:0,contracts:0,bought:0,sold:0,
 say(m){this.log.unshift(m);this.log.length=5;Bus.emit("notify",m);},
 player:new Biz({name:'You',cash:5000,start:5000,inv:{timber:0,furniture:0}}),
 ts:new Biz({name:'Timber Supply Co.',cash:200000,inv:{timber:20},cap:{timber:40},price:2000,activity:'Selling timber'}),
 ow:new Biz({name:'Oak & Iron Workshop',cash:80000,inv:{timber:2,furniture:0},cap:{timber:30,furniture:20},prog:0,per:3,bid:1200,furnPrice:6500,activity:'Idle'}),
 post:new Biz({name:'Harbour Road Trading Post',cash:0,inv:{timber:0},cap:{timber:10},ask:15000,owner:null,price:1800,level:0,activity:'For sale'}),
 contract:{need:5,reward:6000,state:'offer'},
 crew:new Biz({name:'Forestry Crew',cash:0,inv:{timber:0},cap:{timber:20}}),port:new Biz({name:'Port Warehouse',cash:60000,inv:{timber:0},cap:{timber:60}}),mine:new Biz({name:'Gold Mine',cash:0,inv:{ore:0,gold:0},cap:{ore:40}}),truckCargo:0,
 ship:{manifest:24,total:24,landed:0,unit:1200,paid:false},
 milestone(k){if(this.ms[k])return;this.ms[k]=1;this.say('★ Milestone: '+MS[k]);if(k==='trade')this.say('Unlocked: Trading Post is for sale.');},
 trade(buyer,seller,item,q,unit){const tot=q*unit;
  if(!Number.isSafeInteger(q)||q<1||!Number.isSafeInteger(unit)||unit<0||!Number.isSafeInteger(tot))return false;
  if(buyer.closed||seller.closed)return this.say((buyer.closed?buyer:seller).name+' is closed. Invest to restore operations.'),false;
  if(q<1||(seller.inv[item]||0)<q)return this.say(`${seller.name} has no ${item}.`),false;
  if(buyer.cash<tot)return this.say(`${buyer.name} cannot afford ${$(tot)}.`),false;
  if(buyer.cap[item]!==undefined&&(buyer.inv[item]||0)+q>buyer.cap[item])return this.say(`${buyer.name} storage full.`),false;
  seller.inv[item]-=q;buyer.inv[item]=(buyer.inv[item]||0)+q;buyer.cash-=tot;seller.cash+=tot;buyer.exp+=tot;seller.rev+=tot;
  buyer.note(`Bought ${q} ${item} from ${seller.name} (${$(tot)})`);seller.note(`Sold ${q} ${item} to ${buyer.name} (${$(tot)})`);
  const entry={id:++this.transactionSequence,time:typeof Sim!=='undefined'?Sim.time:0,buyer:buyer.name,seller:seller.name,item,quantity:q,unit,total:tot};this.transactions.push(entry);if(this.transactions.length>250)this.transactions.shift();Bus.emit('economy:trade',entry);
  if(buyer===this.player||seller===this.player){const merchant=buyer===this.player?seller:buyer;this.relationships[merchant.name]=(this.relationships[merchant.name]||0)+1;}
  if(buyer===this.player)this.bought=1;if(seller===this.player)this.sold=1;if(this.bought&&this.sold)this.milestone('trade');return true;},
 sellTimber(){const q=this.player.inv.timber;if(!q)return this.say('You carry no timber.');if(this.trade(this.ow,this.player,'timber',q,this.ow.bid))this.say(`Sold ${q} timber.`);},
 buyTimber(){if(this.trade(this.player,this.ts,'timber',1,this.ts.price))this.say('Bought 1 timber.');},
 buyFurn(){if(this.trade(this.player,this.ow,'furniture',1,this.ow.furnPrice))this.say('Bought furniture.');},
 contractAct(){const c=this.contract,p=this.player;
  if(c.state==='offer'){c.state='active';return this.say(`Contract accepted: deliver ${c.need} timber (${$(c.reward)}).`);}
  if(p.inv.timber<c.need)return this.say(`Need ${c.need} timber for the contract.`);
  if(this.ow.cash<c.reward)return this.say('Workshop cannot pay.');
  if(this.ow.inv.timber+c.need>this.ow.cap.timber)return this.say('Workshop storage full. Keep your contract timber until there is room.');
  p.inv.timber-=c.need;this.ow.inv.timber+=c.need;p.cash+=c.reward;p.rev+=c.reward;this.ow.cash-=c.reward;this.ow.exp+=c.reward;this.contracts++;this.rep+=2;p.note(`Contract: delivered ${c.need} timber for ${$(c.reward)}`);
  this.say(`Contract complete! +${$(c.reward)}`);this.milestone('contract');this.chk();this.contract={need:Math.min(20,c.need+2),reward:c.reward+1500,state:'offer'};},
 buyPost(){const b=this.post,p=this.player;if(!this.ms.trade)return this.say('Complete a trade first.');if(b.owner)return;if(p.cash<b.ask)return this.say(`Need ${$(b.ask)}.`);
  p.cash-=b.ask;p.exp+=b.ask;b.owner='player';b.cash=2000;b.capital+=2000;b.activity='Trading';b.note('Acquired by you. Working capital '+$(2000));p.note('Bought '+b.name+' for '+$(b.ask));this.rep+=1;this.say('You now own the Trading Post!');this.milestone('business');this.chk();},
 stock(){const p=this.player,b=this.post;if(b.owner!=='player')return false;const q=Math.min(p.inv.timber,b.cap.timber-b.inv.timber);if(q<1)return this.say('Nothing to stock (none carried or storage full).');p.inv.timber-=q;b.inv.timber+=q;b.note(`Stocked ${q} timber from owner`);this.say(`Stocked ${q} timber.`);},
 setPrice(d){if(this.post.owner!=='player'||!Number.isSafeInteger(d))return false;this.post.price=Math.max(1000,Math.min(2400,this.post.price+d));},
 move(d){const p=this.player,b=this.post;if(b.owner!=='player'||!Number.isSafeInteger(d)||d===0)return false;if(d>0){if(p.cash<d)return false;p.cash-=d;b.cash+=d;b.note('Owner deposit '+$(d));}else{if(b.cash<-d)return false;b.cash+=d;p.cash-=d;b.note('Owner withdrawal '+$(-d));}p.capital-=d;b.capital+=d;},
 upgrade(){const p=this.player,b=this.post;if(b.owner!=='player')return false;if(p.cash<10000)return this.say('Upgrade costs $100.');p.cash-=10000;p.exp+=10000;b.cap.timber+=10;b.level++;b.note('Storage upgrade (+10)');this.say('Storage upgraded.');this.rep+=1;this.milestone('expansion');this.chk();},
 chk(){if(this.rep>=4)this.milestone('est');},
 farm:new Biz({name:'Greenfield Farm',cash:40000,inv:{maize:12,cassava:8,milk:6},cap:{maize:60,cassava:60,milk:40},activity:'Operating'}),
 market:new Biz({name:'Harbour Road Market',cash:120000,inv:{maize:0,cassava:0,milk:0,gold:0,furniture:0},cap:{maize:50,cassava:50,milk:50,gold:100000,furniture:20}}),
 AGP:{maize:{retail:500,whole:350},cassava:{retail:450,whole:300},milk:{retail:400,whole:250}},
 agstat:{bought:{maize:0,cassava:0,milk:0},soldToMarket:{maize:0,cassava:0,milk:0}},
 buyFarm(item,q=1){if(!this.AGP[item])return false;if(this.trade(this.player,this.farm,item,q,this.AGP[item].retail)){this.agstat.bought[item]+=q;this.say('Bought '+q+' '+item+' from Greenfield Farm.');return true;}return false;},
 sellAgri(){const p=this.player;let any=0;['maize','cassava','milk'].forEach(it=>{const q=p.inv[it]||0;if(q>0&&this.trade(this.market,p,it,q,this.AGP[it].whole)){any=1;this.agstat.soldToMarket[it]+=q;this.say('Sold '+q+' '+it+' to the market.');}});if(!any)this.say('No farm produce to sell (or the market cannot take it).');},
 farmDeliver(item,q){const M=this.market,F=this.farm,tot=q*this.AGP[item].whole;if(q<1||M.inv[item]+q>M.cap[item]||M.cash<tot)return false;M.inv[item]+=q;M.cash-=tot;M.exp+=tot;F.cash+=tot;F.rev+=tot;M.note('Bought '+q+' '+item+' from Greenfield Farm ('+$(tot)+')');F.note('Sold '+q+' '+item+' to the market ('+$(tot)+')');this.say('Tractor delivered '+q+' '+item+' to the market.');return true;},
 crewLog(){const c=this.crew;if(c.inv.timber>=c.cap.timber)return false;c.inv.timber++;c.logged=(c.logged||0)+1;c.note('Logged 1 timber');return true;},
 loadTruck(q){if(!Number.isSafeInteger(q)||q<1)return 0;q=Math.min(q,this.crew.inv.timber);this.crew.inv.timber-=q;this.truckCargo+=q;this.crew.note('Loaded '+q+' timber onto truck');return q;},
 deliver(){const q=this.truckCargo,t=this.ts,c=this.crew,tot=q*1000;if(q<1)return true;if(t.closed||t.inv.timber+q>t.cap.timber||t.cash<tot)return false;t.inv.timber+=q;t.cash-=tot;t.exp+=tot;c.cash+=tot;c.rev+=tot;this.truckCargo=0;t.note('Truck delivered '+q+' timber ('+$(tot)+')');c.note('Delivered '+q+' timber to '+t.name+' ('+$(tot)+')');this.lastDelivery=q+' timber ('+$(tot)+')';this.say('Truck delivered '+q+' timber to Timber Supply Co.');return true;},
 unloadStep(q){const s=this.ship,p=this.port;if(!s.paid){const cost=s.total*s.unit;if(p.cash<cost)return false;p.cash-=cost;p.exp+=cost;s.paid=true;p.note('Paid '+$(cost)+' for '+s.total+' imported timber');}q=Math.min(q,s.manifest,p.cap.timber-p.inv.timber);if(q<1)return false;s.manifest-=q;s.landed+=q;p.inv.timber+=q;p.note('Unloaded '+q+' timber from vessel');return true;},
 portDispatch(){const p=this.port,q=Math.min(p.inv.timber,6,this.ts.cap.timber-this.ts.inv.timber);if(q>=1&&this.trade(this.ts,p,'timber',q,1700))this.say('Port sent '+q+' imported timber to Timber Supply Co.');},
 newShipment(){const s=this.ship;if(s.manifest>0)return;s.total=s.manifest=24;s.landed=0;s.paid=false;},
 mineOre(){const m=this.mine;if(m.inv.ore>=m.cap.ore)return false;m.inv.ore++;m.mined=(m.mined||0)+1;return true;},
 processOre(){const p=this.player,q=p.inv.ore||0;if(!q)return this.say('You carry no ore.');p.inv.ore=0;p.inv.gold=(p.inv.gold||0)+q*500;this.say('Processed '+q+' ore into '+(q*.5).toFixed(1)+' g gold.');},
 sellGold(){const q=this.player.inv.gold||0;if(!q)return this.say('You carry no refined gold.');if(this.trade(this.market,this.player,'gold',q,2))this.say('Sold '+(q/1000).toFixed(2)+' g gold.');},
 sellFurniture(){const q=this.player.inv.furniture||0;if(!q)return this.say('You carry no furniture.');if(this.trade(this.market,this.player,'furniture',q,5000))this.say('Sold '+q+' furniture to the market.');},
 tick(dt){const o=this.ow,t=this.tm;t.ts+=dt;t.ow+=dt;t.cust+=dt;
  // production: consumes timber and wages
  if(o.inv.timber>=o.per&&o.cash>=200&&o.inv.furniture<o.cap.furniture){o.activity='Manufacturing';o.prog+=dt;if(o.prog>=6){o.prog=0;o.inv.timber-=o.per;o.cash-=200;o.exp+=200;o.inv.furniture++;o.note('Produced 1 furniture (labour $2.00)');}}else{o.prog=0;o.activity=o.inv.timber<o.per?'Waiting for timber':'Idle';}
  if(t.ts>=5){t.ts=0;this.portDispatch();}
  if(t.ow>=6){t.ow=0;if(o.inv.timber<6){const src=[this.ts,this.post].filter(b=>!b.closed&&b.inv.timber>0&&(b!==this.post||b.owner)).sort((a,b)=>a.price-b.price)[0];if(src)this.trade(o,src,'timber',1,src.price);}}
  if(t.cust>=14){t.cust=0;if(o.inv.furniture>0){o.inv.furniture--;o.cash+=o.furnPrice;o.rev+=o.furnPrice;o.note('Sold 1 furniture to a customer ('+$(o.furnPrice)+')');}}}
};
const Sim=(()=>{
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),sm=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);},n2=(x,z)=>Math.sin(x*.7+Math.sin(z*.5)*2)*Math.cos(z*.6+Math.sin(x*.4)*2),rn=(a,b)=>a+Math.random()*(b-a),wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const dShore=(x,z)=>{const dx=x/96,dz=(z+12)/62,r=Math.hypot(dx,dz),t=Math.atan2(dz,dx);const m=1+.1*Math.sin(3*t+1)+.07*Math.sin(5*t+2)+.04*Math.sin(9*t)+.13*Math.exp(-((t-1.25)**2)*14)-.17*Math.exp(-((t-2.1)**2)*12)-.12*Math.exp(-((t-.4)**2)*20);return(m-r)*46;};
const tY=(x,z)=>{const d=dShore(x,z),c=d<0?Math.max(d*.4,-3.5):Math.min(d*.04,.15),h=d>0?sm(30,50,Math.hypot(x,z))*sm(1,7,d)*(n2(x*.09,z*.09)*1.4+.7)*(1-sm(30,18,Math.hypot(x-46,z+32)))*(1-sm(46,32,Math.hypot(x-64,z-6)))*(1-sm(46,34,Math.hypot((x-12)/1.15,z+41))):0;return c+h;};
let PZ=30;for(let z=10;z<95;z+=.25)if(dShore(14,z)<0){PZ=z;break;}
const onPier=(x,z)=>Math.abs(x-14)<1.8&&z>PZ-4.5&&z<PZ+12.2;
// ---- collision: one registry for every mover. Boxes (buildings, trees, rocks, props) and segments (fences). Water via coast function.
const Col={list:[],grid:new Map(),st:0,
 _ins(c,x0,z0,x1,z1){for(let i=Math.floor(x0/8);i<=Math.floor(x1/8);i++)for(let j=Math.floor(z0/8);j<=Math.floor(z1/8);j++){const k=(i+512)*1024+j+512;let a=this.grid.get(k);if(!a)this.grid.set(k,a=[]);a.push(c);}},
 add(x,z,w,d,type='building'){const c={k:'b',x,z,hx:w/2,hz:d/2,type};this.list.push(c);this._ins(c,x-c.hx,z-c.hz,x+c.hx,z+c.hz);return c;},
 addSeg(x1,z1,x2,z2,r=.2,type='fence'){const c={k:'s',x:(x1+x2)/2,z:(z1+z2)/2,hx:Math.abs(x2-x1)/2+r,hz:Math.abs(z2-z1)/2+r,x1,z1,x2,z2,r,type};this.list.push(c);this._ins(c,c.x-c.hx,c.z-c.hz,c.x+c.hx,c.z+c.hz);return c;},
 remove(c){const i=this.list.indexOf(c);if(i>=0)this.list.splice(i,1);this.grid.forEach(a=>{const j=a.indexOf(c);if(j>=0)a.splice(j,1);});},
 near(x,z,r){const o=[];this.st++;for(let i=Math.floor((x-r)/8);i<=Math.floor((x+r)/8);i++)for(let j=Math.floor((z-r)/8);j<=Math.floor((z+r)/8);j++){const a=this.grid.get((i+512)*1024+j+512);if(a)for(const c of a)if(c._s!==this.st){c._s=this.st;o.push(c);}}return o;},
 push(c,x,z,r){if(c.k==='b'){const cx=clamp(x,c.x-c.hx,c.x+c.hx),cz=clamp(z,c.z-c.hz,c.z+c.hz),dx=x-cx,dz=z-cz,d2=dx*dx+dz*dz;if(d2>=r*r)return null;if(d2>1e-8){const d=Math.sqrt(d2);return[dx/d,dz/d,r-d];}const ox=c.hx-Math.abs(x-c.x),oz=c.hz-Math.abs(z-c.z);return ox<oz?[Math.sign(x-c.x)||1,0,ox+r]:[0,Math.sign(z-c.z)||1,oz+r];}
  const vx=c.x2-c.x1,vz=c.z2-c.z1,L2=vx*vx+vz*vz||1,t=clamp(((x-c.x1)*vx+(z-c.z1)*vz)/L2,0,1),dx=x-(c.x1+vx*t),dz=z-(c.z1+vz*t),d2=dx*dx+dz*dz,R=r+c.r;if(d2>=R*R)return null;const d=Math.sqrt(d2);return d>1e-6?[dx/d,dz/d,R-d]:[1,0,R];},
 water(x,z,m){return dShore(x,z)<(m==='player'?-1:m==='ped'?1.2:2)&&!onPier(x,z);},
 free(x,z,r,m){if(this.water(x,z,m))return false;for(const c of this.near(x,z,r))if(this.push(c,x,z,r))return false;return true;},
 hit(x,z,r,m){return!this.free(x,z,r,m);},
 move(o,dx,dz,r,m){const ox=o.x,oz=o.z;let x=ox+dx,z=oz+dz;for(let it=0;it<3;it++){let h=0;for(const c of this.near(x,z,r)){const p=this.push(c,x,z,r);if(p){x+=p[0]*p[2];z+=p[1]*p[2];h=1;}}if(!h)break;}
  if(!this.free(x,z,r,m)){let ok=0;for(const c of[[ox+dx,oz],[ox,oz+dz]])if(this.free(c[0],c[1],r,m)){x=c[0];z=c[1];ok=1;break;}if(!ok){x=ox;z=oz;}}
  o.x=x;o.z=z;return Math.hypot(x-ox,z-oz);},
 segClear(x1,z1,x2,z2,r,m){const n=Math.max(1,Math.ceil(Math.hypot(x2-x1,z2-z1)/.6));for(let i=0;i<=n;i++)if(!this.free(x1+(x2-x1)*i/n,z1+(z2-z1)*i/n,r,m))return false;return true;}};
function heap(){const a=[];return{n:()=>a.length,push(k,v){a.push([k,v]);let i=a.length-1;while(i>0){const p=(i-1)>>1;if(a[p][0]<=a[i][0])break;[a[p],a[i]]=[a[i],a[p]];i=p;}},pop(){const t=a[0],l=a.pop();if(a.length){a[0]=l;let i=0;for(;;){let c=2*i+1;if(c>=a.length)break;if(c+1<a.length&&a[c+1][0]<a[c][0])c++;if(a[i][0]<=a[c][0])break;[a[i],a[c]]=[a[c],a[i]];i=c;}}return t[1];}};}
// ---- vehicle road graph, built from the same road centrelines the presentation draws; edges blocked by solids are dropped
const Roads={defs:[],add(cl,w,kind){this.defs.push({cl,w,kind});}};
const Nav={N:[],bn:new Map(),
 build(){const N=this.N=[];Roads.defs.forEach((r,ri)=>{let prev=-1;r.cl.forEach((p,i)=>{if(i%3&&i!==r.cl.length-1)return;N.push({x:p[0],z:p[1],adj:[],r:ri});const id=N.length-1;if(prev>=0)this.link(prev,id);prev=id;});});
  for(let i=0;i<N.length;i++)for(let j=i+1;j<N.length;j++)if(N[i].r!==N[j].r&&Math.hypot(N[i].x-N[j].x,N[i].z-N[j].z)<3.6)this.link(i,j);},
 link(a,b){const N=this.N,A=N[a],B=N[b],L=Math.hypot(B.x-A.x,B.z-A.z),n=Math.ceil(L);for(let i=0;i<=n;i++)if(!Col.free(A.x+(B.x-A.x)*i/n,A.z+(B.z-A.z)*i/n,1.25,'veh'))return;A.adj.push({j:b,d:L});B.adj.push({j:a,d:L});},
 nearest(x,z,ex){let b=-1,bd=1e9;this.N.forEach((n,i)=>{const d=Math.hypot(n.x-x,n.z-z);if(d<bd&&!(ex&&(this.bn.get(i)||0)>Sim.time)){bd=d;b=i;}});return b;},
 route(sx,sz,tx,tz){const N=this.N,a=this.nearest(sx,sz),b=this.nearest(tx,tz);if(a<0||b<0)return null;const g=new Float32Array(N.length).fill(1e9),fr=new Int32Array(N.length).fill(-1),h=heap();g[a]=0;h.push(0,a);
  while(h.n()){const u=h.pop();if(u===b)break;for(const e of N[u].adj){if((this.bn.get(e.j)||0)>Sim.time&&e.j!==b)continue;const c=g[u]+e.d;if(c<g[e.j]){g[e.j]=c;fr[e.j]=u;h.push(c+Math.hypot(N[e.j].x-N[b].x,N[e.j].z-N[b].z),e.j);}}}
  if(a!==b&&fr[b]<0)return null;const ids=[];for(let v=b;v!==-1;v=fr[v])ids.push(v);ids.reverse();const pts=[{x:sx,z:sz}];ids.forEach(i=>pts.push({x:N[i].x,z:N[i].z,id:i}));pts.push({x:tx,z:tz});return pts;}};
// ---- pedestrian grid (2 m cells): cheaper on streets, around every solid, no water
const PN={x0:-100,z0:-80,cs:2,W:106,H:68,
 build(){const W=this.W,H=this.H;this.walk=new Uint8Array(W*H);this.cost=new Float32Array(W*H).fill(1);for(let j=0;j<H;j++)for(let i=0;i<W;i++)this.walk[j*W+i]=Col.free(this.x0+(i+.5)*this.cs,this.z0+(j+.5)*this.cs,.5,'ped')?1:0;
  Roads.defs.forEach(r=>r.cl.forEach(p=>{const ci=Math.floor((p[0]-this.x0)/this.cs),cj=Math.floor((p[1]-this.z0)/this.cs);for(let a=-2;a<=2;a++)for(let b=-2;b<=2;b++){const i=ci+a,j=cj+b;if(i>=0&&j>=0&&i<W&&j<H)this.cost[j*W+i]=.7;}}));
  this.edge=new Uint8Array(W*H*4);const D=[[1,0],[0,1],[1,1],[-1,1]];for(let j=0;j<H;j++)for(let i=0;i<W;i++){if(!this.walk[j*W+i])continue;for(let d=0;d<4;d++){const a=D[d][0],b=D[d][1],i2=i+a,j2=j+b;if(!this.ok(i2,j2))continue;if(a&&b&&!(this.ok(i+a,j)&&this.ok(i,j+b)))continue;if(Col.segClear(this.x0+(i+.5)*this.cs,this.z0+(j+.5)*this.cs,this.x0+(i2+.5)*this.cs,this.z0+(j2+.5)*this.cs,.42,'ped'))this.edge[(j*W+i)*4+d]=1;}}},
 ok(i,j){return i>=0&&j>=0&&i<this.W&&j<this.H&&this.walk[j*this.W+i];},
 snap(x,z){const i=clamp(Math.floor((x-this.x0)/this.cs),0,this.W-1),j=clamp(Math.floor((z-this.z0)/this.cs),0,this.H-1);if(this.ok(i,j))return[i,j];for(let r=1;r<=4;r++)for(let a=-r;a<=r;a++)for(let b=-r;b<=r;b++)if(Math.max(Math.abs(a),Math.abs(b))===r&&this.ok(i+a,j+b))return[i+a,j+b];return null;},
 route(sx,sz,tx,tz){const s=this.snap(sx,sz),t=this.snap(tx,tz);if(!s||!t)return null;const W=this.W,N=W*this.H,g=new Float32Array(N).fill(1e9),fr=new Int32Array(N).fill(-1),h=heap(),si=s[1]*W+s[0],ti=t[1]*W+t[0];g[si]=0;h.push(0,si);
  while(h.n()){const u=h.pop();if(u===ti)break;const ui=u%W,uj=(u/W)|0;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){if(!a&&!b)continue;const i=ui+a,j=uj+b;if(!this.ok(i,j))continue;const ca=b>0||(b===0&&a>0),ei=ca?ui:i,ej=ca?uj:j,da0=ca?a:-a,da1=ca?b:-b,dd=da1===0?0:(da0===0?1:(da0===1?2:3));if(!this.edge[(ej*W+ei)*4+dd])continue;const v=j*W+i,c=g[u]+(a&&b?1.414:1)*this.cost[v];if(c<g[v]){g[v]=c;fr[v]=u;const dx=Math.abs(i-t[0]),dz=Math.abs(j-t[1]);h.push(c+.7*(Math.max(dx,dz)+.414*Math.min(dx,dz)),v);}}}
  if(fr[ti]<0&&si!==ti)return null;const cells=[];for(let v=ti;v!==-1;v=fr[v])cells.push(v);cells.reverse();const pts=cells.map(v=>({x:this.x0+((v%W)+.5)*this.cs,z:this.z0+(((v/W)|0)+.5)*this.cs}));pts[0]={x:sx,z:sz};const last=pts.length-1;if(Col.free(tx,tz,.45,'ped'))pts[last]={x:tx,z:tz};
  const out=[];let i=0;while(i<last){let j=last;while(j>i+1&&!Col.segClear(pts[i].x,pts[i].z,pts[j].x,pts[j].z,.45,'ped'))j--;out.push(pts[j]);i=j;}return out;}};
// ---- entities (state only)
const OUT={log:()=>Math.random()<.3&&Eco.crewLog(),ore:()=>Math.random()<.5&&Eco.mineOre()};
const T={x:-26,z:13,h:Math.atan2(-10,2),v:0,state:'idle',wait:6,route:null,cum:null,s:0,L:0,blk:0,dyn:0,fails:0,task:null,cap:8,anch:null};
const SH={x:8.8,z:PZ+75,h:Math.PI,state:'offshore',wait:15,v:0,t:0,dep:0};
const S={time:0,clock:{h:7.5,DAYLEN:420},player:{x:0,z:4,h:0,move(dx,dz){return Col.move(this,dx,dz,.4,'player');}},npcs:[],truck:T,ship:SH,ev:[],Geo:{dShore,tY,PZ,onPier,sm,clamp,n2},Col,Roads,Nav,PN,heap};
const phaseOf=(n,h)=>{h=(h+n.off+24)%24;for(const s of n.sched)if(h>=s[0]&&h<s[1])return s[2];return'home';};
function npcStep(n,dt,h){if(n.talking){n.v=0;return;}const ph=phaseOf(n,h);
 if(ph!==n.phase){n.phase=ph;n.dest=null;n.path=null;n.wait=rn(0,8);n.prod=null;if(ph!=='home'&&!n.vis){n.vis=true;n.x=n.home.dx;n.z=n.home.dz;}}
 if(!n.vis)return;
 if(n.wait>0){n.wait-=dt;n.v=0;if(n.wait<=0&&n.prod){n.prod();n.prod=null;}return;}
 if(!n.dest){let d;if(ph==='home')d=[n.home.dx,n.home.dz,1,0,0,'home'];else if(ph==='work'&&n.jobFn)d=n.jobFn(n);else{const pool=ph==='work'?n.work:S.ev,po=pool.filter((_,i)=>i!==n.cur);let t=po.reduce((a,b)=>a+b[2],0)*Math.random();d=po.find(q=>(t-=q[2])<=0)||po[0];n.cur=pool.indexOf(d);}
  let tx=d[0]+rn(-1.2,1.2),tz=d[1]+rn(-1.2,1.2);if(ph==='home'||d[7]===0||!Col.free(tx,tz,.5,'ped')){tx=d[0];tz=d[1];}
  const p=PN.route(n.x,n.z,tx,tz);if(!p){n.st.drop++;n.wait=2;return;}n.dest=[tx,tz,d,ph];n.path=p;n.pi=0;n.sT=0;n.lx=n.x;n.lz=n.z;}
 const fd=Math.hypot(n.dest[0]-n.x,n.dest[1]-n.z),d=n.dest[2];
 if(fd<(d[5]==='home'?1.3:.9)||(n.pi>=n.path.length&&fd<2.2)){n.v=0;n.dest=null;if(d[5]==='home'){n.vis=false;n.wait=2;n.st.home++;Bus.emit('npc:home',n.id);}else{n.wait=rn(d[3],d[4]);n.mode=d[5];n.prod=d[6]||((d[5]==='chop'&&n.out)?n.out:null);if(n.dest===null&&n.phase==='work')n.st.work++;}return;}
 if(n.pi>=n.path.length){n.path=PN.route(n.x,n.z,n.dest[0],n.dest[1])||[];n.pi=0;n.st.replan++;if(!n.path.length){n.dest=null;n.wait=1;}return;}
 let wp=n.path[n.pi];while(n.pi<n.path.length&&Math.hypot(wp.x-n.x,wp.z-n.z)<.6){n.pi++;wp=n.path[n.pi];}
 if(n.pi>=n.path.length)return;
 let dx=wp.x-n.x,dz=wp.z-n.z;const L=Math.hypot(dx,dz)||1;dx/=L;dz/=L;
 for(const o of S.npcs)if(o!==n&&o.vis){const ex=n.x-o.x,ez=n.z-o.z,e=Math.hypot(ex,ez);if(e>0&&e<1.1){dx+=ex/e*(1.1-e)*.8;dz+=ez/e*(1.1-e)*.8;}}
 const l2=Math.hypot(dx,dz)||1,mv=n.spd*dt,moved=Col.move(n,dx/l2*mv,dz/l2*mv,.4,'ped');n.v=moved/dt;n.h+=wrap(Math.atan2(dx,dz)-n.h)*Math.min(1,dt*6);
 n.sT+=dt;if(n.sT>3){if(Math.hypot(n.x-n.lx,n.z-n.lz)<.8){n.st.stuck++;n.st.replan++;const sn=PN.snap(n.x,n.z);if(sn){const cx=PN.x0+(sn[0]+.5)*PN.cs,cz=PN.z0+(sn[1]+.5)*PN.cs,dd=Math.hypot(cx-n.x,cz-n.z);if(dd>.05)Col.move(n,(cx-n.x)/dd*Math.min(1,dd),(cz-n.z)/dd*Math.min(1,dd),.4,'ped');}if(n.st.replan%2){n.path=PN.route(n.x,n.z,n.dest[0],n.dest[1])||[];n.pi=0;}else{n.dest=null;n.wait=1;}}n.lx=n.x;n.lz=n.z;n.sT=0;}}
// ---- logging truck: sim decides tasks, Nav gives a road route, truck follows it, cargo/cash only change through Eco
function setRoute(pts){const cum=[0];for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+Math.hypot(pts[i].x-pts[i-1].x,pts[i].z-pts[i-1].z));T.route=pts;T.cum=cum;T.L=cum[cum.length-1];T.s=0;}
function pt(s){const c=T.cum;let i=1;while(i<c.length-1&&c[i]<s)i++;const t=clamp((s-c[i-1])/Math.max(1e-6,c[i]-c[i-1]),0,1),a=T.route[i-1],b=T.route[i];return{x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};}
function drive(to){const A=T.anch[to],r=Nav.route(T.x,T.z,A.x,A.z);if(!r||r.length<2){T.state='stranded';T.wait=8;Bus.emit('truck:noroute',to);return false;}setRoute(r);T.state='driving';T.blk=0;T.dyn=0;return true;}
function truckStep(dt){
 if(T.state==='idle'){T.wait-=dt;if(T.wait<=0){T.wait=5;if(Eco.truckCargo>0){T.task={to:'yard',act:'unload'};drive('yard');}else if(Eco.crew.inv.timber>=6){T.task={to:'depot',act:'load'};drive('depot');}}}
 else if(T.state==='loading'){T.wait-=dt;if(T.wait<=0){const q=Eco.loadTruck(T.cap);Bus.emit('truck:loaded',{qty:q});T.task={to:'yard',act:'unload'};drive('yard');}}
 else if(T.state==='unloading'||T.state==='waiting'){T.wait-=dt;if(T.wait<=0){const q=Eco.truckCargo;if(Eco.deliver()){Bus.emit('truck:delivered',{qty:q});T.state='idle';T.wait=15;T.fails=0;}else{T.state='waiting';T.wait=3;}}}
 else if(T.state==='stranded'){T.wait-=dt;if(T.wait<=0){T.fails++;if(T.fails>=3){Bus.emit('truck:abort');T.state='idle';T.wait=20;T.fails=0;}else drive(T.task?T.task.to:'yard');}}
 else if(T.state==='driving'){const look=3+T.v*1.1,pa=pt(T.s),pb=pt(Math.min(T.L,T.s+look)),pc=pt(Math.min(T.L,T.s+look*.5)),hw=Math.atan2(pb.x-pa.x,pb.z-pa.z),df=wrap(hw-T.h);T.h+=clamp(df,-2.4*dt,2.4*dt);
  const rem=T.L-T.s;let vt=Math.abs(df)>.5?0:Math.min(7,rem*.9+.05)*(1-Math.min(.6,Math.abs(df)*1.2));
  const sb=!Col.free(pb.x,pb.z,1.3,'veh')||!Col.free(pc.x,pc.z,1.3,'veh');if(sb){vt=0;T.blk+=dt;}else T.blk=Math.max(0,T.blk-dt);
  const fx=Math.sin(T.h),fz=Math.cos(T.h);let dyn=0;const chk=(x,z)=>{const ex=x-T.x,ez=z-T.z,al=ex*fx+ez*fz;if(al>0&&al<look+2.5&&Math.abs(ex*fz-ez*fx)<2)dyn=1;};chk(S.player.x,S.player.z);S.npcs.forEach(n=>n.vis&&chk(n.x,n.z));
  if(dyn){vt=0;T.dyn+=dt;}else T.dyn=0;
  if(T.blk>2.5){const sd=T.s+look*.5;let k=1;while(k<T.cum.length-1&&T.cum[k]<sd)k++;[T.route[k-1].id,T.route[k].id].forEach(id=>{if(id!==undefined)Nav.bn.set(id,S.time+60);});T.blk=0;Bus.emit('truck:blocked');drive(T.task.to);return;}
  T.v+=clamp(vt-T.v,-7*dt,3*dt);T.s=Math.min(T.L,T.s+T.v*dt);const p=pt(T.s);T.x=p.x;T.z=p.z;
  if(T.L-T.s<.4&&T.v<.5){T.v=0;T.state=T.task.act==='load'?'loading':'unloading';T.wait=3;Bus.emit('truck:arrived',T.task.to);}}
 if(T.state!=='driving')T.v=0;}
function shipStep(dt){const E=Eco.ship,BZ=PZ+10.5;
 if(SH.state==='offshore'){SH.wait-=dt;if(SH.wait<=0)SH.state='approach';}
 else if(SH.state==='approach'){const rem=SH.z-BZ;SH.v+=clamp(Math.min(7,.5+rem*.14)-SH.v,-3*dt,1.5*dt);SH.z-=SH.v*dt;if(rem<.3){SH.z=BZ;SH.v=0;SH.state='unloading';SH.t=0;Eco.say('Cargo vessel berthed at the pier.');SH.lastBerth=S.time;Bus.emit('ship:berthed');}}
 else if(SH.state==='unloading'){SH.t+=dt;if(SH.t>1.5){SH.t=0;if(E.manifest>0){if(!Eco.unloadStep(3))SH.t=-3;else Bus.emit('ship:unloaded',3);}else{SH.state='departing';SH.dep=0;Eco.say('Vessel unloaded and departing.');}}}
 else if(SH.state==='departing'){SH.v+=clamp(Math.min(3.5,.3+SH.dep*.15)-SH.v,-2*dt,1*dt);SH.z+=SH.v*dt;SH.dep+=SH.v*dt;if(SH.z>PZ+55){SH.state='offshore';SH.wait=rn(50,80);SH.v=0;SH.z=PZ+75;Eco.newShipment();}}}
let plantT=0;function plantStep(dt){plantT+=dt;if(plantT>6){plantT=0;const m=Eco.mine;if(m.inv.ore>=2){m.inv.ore-=2;m.inv.gold+=1000;m.note('Processed 2 ore into 1.000 g gold');}}}
// ---- NPC identity + dialogue: authored text driven by live Eco/Sim state (no external AI) ----
const hash=(i,k)=>{const x=Math.sin(i*127.1+k*311.7)*43758.5453;return x-Math.floor(x);};
const NAMES=['Tunde Adeyemi','Bukola Hassan','Joao Mendes','Karin Olsen','Chidi Okafor','Ngozi Eze','Piotr Wojcik','Amara Nwosu','Dmitri Volkov','Funmi Balogun','Margaret Hollis','Samuel Adegoke','Kofi Mensah','Rosa Delgado','Yusuf Danjuma','Ibrahim Sule','Lena Brandt','Obinna Ugwu','Tolu Fashola','Helen Park','Hassan Oyelaran','Mei Tanaka','Grace Ikenna','Walter Pruitt','Adaeze Obi','Tomas Ribeiro','Zainab Bello','Henrik Dahl','Femi Ogunleye'];
const TR=['cheerful','gruff','curious','cautious','chatty','dry-humoured','hardworking','gossipy','patient','blunt','superstitious','ambitious'];
const OCCW={'Forestry worker':['Forestry worker','the Northern Forest logging crew','crew'],'Timber yard employee':['Timber yard employee','Timber Supply Co.','ts'],'Workshop employee':['Workshop employee','Oak & Iron Workshop','ow'],'Business owner':['Business owner','',''],'Port worker':['Port worker','the Harbour Port warehouse','port'],'Miner':['Miner','the Gold Mine','mine'],'Customer':['Local shopper','none (shops on Harbour Road)',''],'Independent trader':['Independent trader','the town markets',''],'Resident':['Resident','none',''],'Farm manager':['Farm manager','Greenfield Farm','farm'],'Farm worker':['Farm worker','Greenfield Farm','farm'],'Herdsman':['Herdsman','Greenfield Farm (cattle)','farm']};
const art=w=>/^[aeiou]/i.test(w)?'an':'a';
function identity(n,i){const o=OCCW[n.role];n.name=NAMES[i];n.occ=o[0];n.workplace=o[1];n.biz=o[2];
 if(n.role==='Business owner'){n.biz=i===10?'ts':'ow';n.workplace=n.biz==='ts'?'Timber Supply Co.':'Oak & Iron Workshop';n.occ='Owner, '+n.workplace;}
 let a=TR[(i*5+1)%12],b=TR[(i*7+4)%12];if(a===b)b=TR[(i*7+5)%12];n.traits=[a,b];
 n.look={skin:Math.floor(hash(i,11)*5),hair:Math.floor(hash(i,12)*6),hs:Math.floor(hash(i,13)*5),w:.96+hash(i,14)*.1,s:.9+hash(i,15)*.08};
 n.bio=`${n.name.split(' ')[0]} is ${art(a)} ${a}, ${b} ${n.role==='Business owner'?'business owner':n.occ.toLowerCase()}${n.workplace&&!/^none/.test(n.workplace)&&n.role!=='Business owner'?' with '+n.workplace:n.role==='Business owner'?' of '+n.workplace:''}, living at ${n.home.n}.`;
 n.talk={count:0,last:-1,asked:{}};n.talking=false;}
S.activity=n=>{if(!n.vis)return'at home';if(n.talking)return'talking with you';if(n.wait>0){if(n.mode==='chop')return n.role==='Miner'?'digging for ore':'felling timber';return n.mode==='look'?'looking around':'taking a short break';}if(n.dest)return n.phase==='work'?'on the way to work':n.phase==='home'?'heading home':'out for a walk';return'standing around';};
const $c=c=>'$'+(c/100).toFixed(2),hrs=s=>Math.max(1,Math.round(s/(S.clock.DAYLEN/24))),pls=(k,w)=>k+' '+w+(k===1?'':'s');
const todOf=()=>{const h=S.clock.h;return h<5||h>=21?'night':h<12?'morning':h<17?'afternoon':'evening';};
const truckTxt=()=>({idle:'waiting at the yard',driving:'on the road to the '+(S.truck.task&&S.truck.task.to==='depot'?'forest depot':'yard'),loading:'loading logs at the depot',unloading:'unloading at the yard',waiting:'holding its cargo because the yard is full',stranded:'stuck looking for a route'}[S.truck.state]||'on its rounds');
const shipTxt=()=>{const s=S.ship,m=Eco.ship;return s.state==='offshore'?`no vessel in port, the next one is due in roughly ${pls(hrs(s.wait),'hour')}`:s.state==='approach'?'a vessel is coming in to berth right now':s.state==='unloading'?`a vessel is berthed with ${m.landed} of ${m.total} timber ashore`:'a vessel has just cast off';};
const postTxt=()=>!Eco.ms.trade?'it is shuttered for now':Eco.post.owner==='player'?'that one is yours':`it is for sale at ${$c(Eco.post.ask)}`;
const owStalled=()=>Eco.ow.inv.timber<Eco.ow.per,tsLvl=()=>{const s=Eco.ts.inv.timber;return s<8?'low':s>=28?'high':'ok';};
const owState=()=>{const o=Eco.ow;return owStalled()?`stopped for want of timber (${o.inv.timber} on the shelf, ${o.per} needed per set)`:o.inv.furniture>=o.cap.furniture?`holding because the furniture racks are full (${o.inv.furniture})`:o.activity==='Manufacturing'?`running (${o.inv.timber} timber in hand, ${o.inv.furniture} sets finished)`:`idle between batches (${o.inv.timber} timber, ${o.inv.furniture} sets)`;};
const postUnder=()=>Eco.post.owner==='player'&&Eco.post.inv.timber>0&&Eco.post.price<Eco.ts.price?` Your Trading Post undercuts us at ${$c(Eco.post.price)} — fair competition.`:'';
const TOP={
 own_ts:[['biz','Tell me about your business',n=>{const t=Eco.ts,l=tsLvl();return[`Timber Supply Co. keeps this town in lumber. The yard holds ${t.inv.timber} of ${t.cap.timber} timber and the till shows ${$c(t.cash)}.`,`Logs come in, timber goes out. We stand at ${t.inv.timber} on the stacks, ${l==='low'?'thinner than I like':l==='high'?'close to our limit':'a healthy amount'}.`,`We buy from the forestry crew at $10.00 a log and sell at ${$c(t.price)}. Stock is ${t.inv.timber}.`];}],
  ['stock','How much stock do you have?',n=>{const k=Eco.ts.inv.timber,c=Eco.ts.cap.timber,l=tsLvl();return l==='low'?[`Only ${k} timber on the stacks — that is thin, and a real shortage if the next load runs late.`,`We are low: ${k} timber. I keep watching the road for the truck.`]:l==='high'?[`${k} of ${c} — we are close to full.${S.truck.state==='waiting'?' The truck is waiting at the gate right now because there is no room.':''}`,`The yard is nearly full at ${k}; deliveries may have to wait.`]:[`${k} on the stacks — comfortable for now.`,`${k} of ${c}; nothing to worry about.`];}],
  ['price','What are your prices?',n=>[`We sell at ${$c(Eco.ts.price)} a timber. We pay the crew $10.00 a log, and ${$c(1700)} when we take imported timber from the port.${postUnder()}`,`Timber is ${$c(Eco.ts.price)} here. Our costs are $10.00 for forest logs and ${$c(1700)} for imports.${postUnder()}`]],
  ['supply','Who are your suppliers?',n=>[`Two lines: the logging truck brings forest logs (it is ${truckTxt()}), and imports come through the port — ${shipTxt()}. The port warehouse holds ${Eco.port.inv.timber}.`,`Local logs are cheap but limited — the depot has ${Eco.crew.inv.timber} ready. Imports cost more but come in bulk: ${shipTxt()}.`]],
  ['prod','How is production going?',n=>[`We do not manufacture — we stock and sell. The last truck delivery was ${Eco.lastDelivery||'nothing yet'}, and ${Eco.crew.inv.timber} logs wait at the forest depot.`,`Our job is logistics. The truck is ${truckTxt()}; last delivery: ${Eco.lastDelivery||'none yet'}.`]],
  ['opp','Any opportunities for me?',n=>!Eco.ms.trade?[`Do a bit of trading first — buy something, sell something — and people will start offering you things.`]:Eco.post.owner!=='player'?[`The Trading Post on Harbour Road is for sale at ${$c(Eco.post.ask)}. Timber you stock there can undercut our price.`,`If you have the capital, buy the Trading Post (${$c(Eco.post.ask)}). Sell timber to Oak & Iron meanwhile — they pay ${$c(Eco.ow.bid)}.`]:[`You already hold the Trading Post. Oak & Iron pays ${$c(Eco.ow.bid)} a timber and the workshop owner has a contract for you.`]]],
 own_ow:[['biz','Tell me about your business',n=>[`Oak & Iron makes furniture. Our shelves hold ${Eco.ow.inv.timber} timber and ${Eco.ow.inv.furniture} finished sets; the line is ${owState()}.`,`Timber in, furniture out. Right now we are ${owState()}.`]],
  ['stock','How much stock do you have?',n=>{const o=Eco.ow;return owStalled()?[`Timber is the problem: just ${o.inv.timber}, and a set needs ${o.per}. Furniture on the racks: ${o.inv.furniture}.`]:[`${o.inv.timber} timber and ${o.inv.furniture} furniture sets in stock.`,`We hold ${o.inv.timber} timber — enough to keep working — and ${o.inv.furniture} sets ready to sell.`];}],
  ['price','What are your prices?',n=>[`We pay ${$c(Eco.ow.bid)} per timber you bring us. Each set takes ${Eco.ow.per} timber plus ${$c(200)} labour, and sells for ${$c(Eco.ow.furnPrice)}.`,`Timber in at ${$c(Eco.ow.bid)}, furniture out at ${$c(Eco.ow.furnPrice)}.`]],
  ['supply','Who are your suppliers?',n=>[`We buy from whoever is cheapest — Timber Supply asks ${$c(Eco.ts.price)}${Eco.post.owner==='player'&&Eco.post.inv.timber>0?`, and your Trading Post asks ${$c(Eco.post.price)}`:''}. We hold ${Eco.ow.inv.timber} right now.`]],
  ['prod','How is production going?',n=>[`The line is ${owState()}.`,`Production status: ${owState()}.`]],
  ['opp','Any opportunities for me?',n=>Eco.contract.state==='offer'?[`I have a timber contract: ${Eco.contract.need} timber for ${$c(Eco.contract.reward)}.`]:[`The contract is open: ${Eco.contract.need} timber for ${$c(Eco.contract.reward)}. You carry ${Eco.player.inv.timber}.`]]],
 forest:[['work','What do you do here?',n=>[`Felling and trimming. Logs go to the depot at the end of the logging road, and the truck takes them on.`,`We cut the stands near the track and stack the logs for the truck.`]],
  ['resources','How are the logs and trees?',n=>[`The depot holds ${Eco.crew.inv.timber} of ${Eco.crew.cap.timber} logs. The truck is ${truckTxt()}.`,`${Eco.crew.inv.timber} logs stacked at the depot. The nearer stands thin out, but they regrow.`]],
  ['prod','How much have you cut?',n=>[`The crew has cut ${Eco.crew.logged||0} ${(Eco.crew.logged||0)===1?'log':'logs'} so far.`,`Total so far: ${Eco.crew.logged||0}.`]],
  ['short','Any shortages?',n=>Eco.crew.inv.timber>=Eco.crew.cap.timber?[`The depot is full — we are waiting on the truck.`]:tsLvl()==='low'?[`Timber Supply is short on stock, so every log counts.`]:owStalled()?[`Word is the workshop is waiting on timber.`]:[`None that I know of.`,`Nothing is short right now.`]],
  ['truck','What about the logging truck?',n=>[`The truck is ${truckTxt()}. Last delivery: ${Eco.lastDelivery||'none yet'}.`]]],
 yard:[['work','What do you do here?',n=>[`I handle the stacks and load the yard. Right now there are ${Eco.ts.inv.timber} timber on them.`,`Stacking, counting, selling. ${Eco.ts.inv.timber} timber at the moment.`]],
  ['stock','How is the yard stocked?',n=>tsLvl()==='low'?[`Thin: ${Eco.ts.inv.timber} timber.`]:tsLvl()==='high'?[`Nearly full: ${Eco.ts.inv.timber} of ${Eco.ts.cap.timber}.`]:[`Fine: ${Eco.ts.inv.timber} of ${Eco.ts.cap.timber}.`]],
  ['deliveries','Any deliveries coming?',n=>[`The truck is ${truckTxt()}; the last delivery was ${Eco.lastDelivery||'nothing yet'}. Imports: ${shipTxt()}.`]],
  ['short','Any shortages?',n=>tsLvl()==='low'?[`Yes — we are running low on timber (${Eco.ts.inv.timber}).`]:[`No shortage here: ${Eco.ts.inv.timber} on the stacks.`]]],
 shop:[['work','What do you do here?',n=>[`I work the line at Oak & Iron — timber in, furniture out.`,`Cutting and assembling furniture.`]],
  ['prod','How is the line running?',n=>[`The line is ${owState()}.`,`Right now we are ${owState()}.`]],
  ['short','Anything holding you up?',n=>owStalled()?[`Timber. We have ${Eco.ow.inv.timber} and need ${Eco.ow.per} for each set, so we are stopped.`]:Eco.ow.inv.furniture>=Eco.ow.cap.furniture?[`The racks are full of furniture (${Eco.ow.inv.furniture}).`]:[`Nothing at the moment — ${Eco.ow.inv.timber} timber in hand.`]],
  ['furniture','How is furniture selling?',n=>[`${Eco.ow.inv.furniture} sets on the racks at ${$c(Eco.ow.furnPrice)} each.`]]],
 port:[['ships','What ships are in?',n=>[`${shipTxt().replace(/^./,c=>c.toUpperCase())}.`]],
  ['cargo','What cargo is coming?',n=>[`This run is ${Eco.ship.total} timber, ${Eco.ship.landed} landed so far. The warehouse holds ${Eco.port.inv.timber}.`]],
  ['schedule','When is the next delivery?',n=>S.ship.state==='offshore'?[`Roughly ${pls(hrs(S.ship.wait),'hour')} until the next vessel.`]:S.ship.state==='unloading'?[`She is alongside now; ${Eco.ship.manifest} still aboard.`]:S.ship.state==='approach'?[`She is arriving as we speak.`]:[`One just left; the next will be a while.`]],
  ['activity','How busy is the port?',n=>[`The warehouse holds ${Eco.port.inv.timber} of ${Eco.port.cap.timber}. We sell on to Timber Supply at ${$c(1700)}, ${shipTxt()}.`]]],
 mine:[['deposits','Tell me about the gold deposits.',n=>[`The gold field is up the north-east road. Surface ore only for now; ${Eco.mine.mined||0} ore loads out so far.`]],
  ['ore','How is ore production?',n=>[`${Eco.mine.inv.ore} ore in the store (limit ${Eco.mine.cap.ore}).${Eco.player.inv.ore?` You are carrying ${Eco.player.inv.ore} yourself.`:''}`]],
  ['processing','How does processing work?',n=>[`The plant turns 2 ore into 1 gram. It has made ${(Eco.mine.inv.gold/1000).toFixed(3)} g so far. Nobody is pricing gold yet.`]]],
 trader:[['market','What are market prices?',n=>[`Timber Supply sells at ${$c(Eco.ts.price)} (imports reach them at ${$c(1700)}); Oak & Iron pays ${$c(Eco.ow.bid)} for timber and sells furniture at ${$c(Eco.ow.furnPrice)}.${postUnder()}`]],
  ['demand','What is in demand?',n=>owStalled()?[`Oak & Iron wants timber — they hold ${Eco.ow.inv.timber} and need ${Eco.ow.per} per set.`]:[`Oak & Iron is covered with ${Eco.ow.inv.timber} timber; furniture on their racks: ${Eco.ow.inv.furniture}.`]],
  ['commodities','What commodities are moving?',n=>[`Timber and furniture trade, and now farm produce: maize ${$c(Eco.AGP.maize.whole)}, cassava ${$c(Eco.AGP.cassava.whole)}, milk ${$c(Eco.AGP.milk.whole)} wholesale. Gold is only dug and refined — there is no price yet.`]]],
 resident:[['town','How is the town?',n=>[`About ${S.npcs.length} of us live here; ${S.npcs.filter(x=>x.vis&&x.phase==='work').length} are at work right now. It is ${todOf()}.`]],
  ['activities','What is going on around here?',n=>[`Watch the pier: ${shipTxt()}. The logging truck is ${truckTxt()}.`]],
  ['businesses','Which businesses are nearby?',n=>[`Timber Supply on the west side, Oak & Iron to the east, the Trading Post on Harbour Road — ${postTxt()} — and Greenfield Farm up north.`]]]};
const cropTxt=()=>['maize','cassava'].map(c=>{const ps=Agri.plots.filter(p=>p.crop===c),k=x=>ps.filter(p=>p.stage===x).length;return `${c}: ${k('ready')} ready, ${k('planted')+k('growing')} growing, ${k('harvested')+k('prepared')} being replanted`;}).join('; ');
const milkWait=()=>Math.floor(Agri.cows.reduce((a,c)=>a+c.milk,0)),avgCond=()=>{const h=Agri.cows.reduce((a,c)=>a+c.health,0)/Agri.cows.length;return h>70?'good':h>40?'fair':'poor';};
const tracTxt=()=>{const V=Sim.tractor;return V.state==='idle'?'parked at the machinery yard':V.state==='act'?(V.act==='load'?'loading produce at the barn':V.act==='unload'?'unloading at the market':'finishing a plot'):V.field?'working a field':'on the farm road';};
TOP.farm=[['crops','How are the crops?',n=>[`${cropTxt()}.`]],['harvest','What can be harvested?',n=>{const u={maize:0,cassava:0},r=Agri.plots.filter(p=>p.stage==='ready');r.forEach(p=>u[p.crop]+=p.yieldQ);return[`Ripe in the fields: ${u.maize} maize and ${u.cassava} cassava${r.length?'':' — nothing is ripe yet'}.`];}],
 ['inv','What is in the barn?',n=>{const F=Eco.farm;return[`Barn stock: ${F.inv.maize} maize, ${F.inv.cassava} cassava, ${F.inv.milk} milk (limits ${F.cap.maize}, ${F.cap.cassava}, ${F.cap.milk}).`];}],
 ['live','How are the cattle?',n=>[`${Agri.cows.length} cows in good grazing, overall condition ${avgCond()}; ${milkWait()} milk waiting to be collected.`]],
 ['milk','How is milk production?',n=>[`${milkWait()} units waiting in the cows and ${Eco.farm.inv.milk} of ${Eco.farm.cap.milk} in the dairy store.${Eco.farm.inv.milk>=Eco.farm.cap.milk?' The dairy store is full, so milking has stopped.':''}`]],
 ['deliv','Any deliveries to market?',n=>[`The tractor is ${tracTxt()}; last delivery: ${Agri.last}. The market holds ${Eco.market.inv.maize} maize, ${Eco.market.inv.cassava} cassava, ${Eco.market.inv.milk} milk.`]]];
TOP.herd=[['live','How are the cattle?',n=>[`${Agri.cows.length} cows, condition ${avgCond()}. ${Agri.cows.filter(c=>c.state==='eat').length} at the feed trough right now.`]],['milk','How is milk production?',n=>[`${milkWait()} units waiting in the cows; ${Eco.farm.inv.milk} of ${Eco.farm.cap.milk} in the dairy store.${Eco.farm.inv.milk>=Eco.farm.cap.milk?' The dairy store is full, so milking has stopped.':''}`]],
 ['feed','How are the feed and water?',n=>[`Feed trough ${Agri.feed.level.toFixed(0)} of ${Agri.feed.cap}, water ${Agri.water.level.toFixed(0)} of ${Agri.water.cap}.${Agri.feed.level<4?' Feed is running low.':''}`]],
 ['deliv','Any deliveries to market?',n=>[`The tractor is ${tracTxt()}; last delivery: ${Agri.last}.`]]];
const CATLBL={own_ts:1};
const cat=n=>n.role==='Business owner'?'own_'+n.biz:{'Forestry worker':'forest','Timber yard employee':'yard','Workshop employee':'shop','Port worker':'port','Miner':'mine','Independent trader':'trader','Farm manager':'farm','Farm worker':'farm','Herdsman':'herd'}[n.role]||'resident';
const FLV={cheerful:['Ha!','Happy to help!'],gruff:['Hmph.','Make it quick.'],curious:['Good thing to ask.','Interesting question.'],cautious:['Well...','Careful with this, but:'],chatty:['Oh, where to start!','Funny you should ask.'],'dry-humoured':["Riveting stuff, this.","Ask me again tomorrow."],hardworking:["Quick one, I have work to do.",'Between jobs, but:'],gossipy:["Word is:","You did not hear it from me, but:"],patient:['Take your time.','Let me explain.'],blunt:['Straight answer:','No sugar-coating:'],superstitious:['Touch wood:','Fingers crossed:'],ambitious:['Big plans, you know.',"Always thinking ahead."]};
const fl=(n,k)=>{const f=FLV[n.traits[0]],a=n.talk.asked[k]||0;return f&&(n.id+a)%3===0?f[a%f.length]+' ':'';};
function opts(n){const c=cat(n),o=[{id:'self',label:'Tell me about yourself'}];TOP[c].forEach(t=>o.push({id:t[0],label:t[1]}));
 if(c==='own_ts')o.push({id:'a_buy',label:`Buy 1 timber (${$c(Eco.ts.price)})`,act:'buyTimber'});
 if(c==='own_ow'){o.push({id:'a_contract',label:Eco.contract.state==='offer'?`Accept the timber contract (${Eco.contract.need} timber for ${$c(Eco.contract.reward)})`:`Deliver ${Eco.contract.need} timber for the contract`,act:'contract'});if(Eco.ow.inv.furniture>0)o.push({id:'a_furn',label:`Buy a furniture set (${$c(Eco.ow.furnPrice)})`,act:'buyFurn'});}
 if(n.role==='Farm manager')['maize','cassava','milk'].forEach(it=>{if(Eco.farm.inv[it]>0)o.push({id:'a_f_'+it,label:`Buy 1 ${it} (${$c(Eco.AGP[it].retail)})`,act:'farmBuy:'+it});});
 o.push({id:'bye',label:'Goodbye'});return o;}
function greet(n){const t=todOf(),c=n.talk.count,emp=!!(n.biz&&Eco[n.biz]&&Eco[n.biz].owner==='player');
 const base=emp?['Good to see you, boss.','Boss! Everything is running as it should.']:c>1?['Back again? Good to see you.','Hello again.','Good to see you once more.']:t==='morning'?['Morning!','Good morning to you.','Early start, eh?']:t==='afternoon'?['Afternoon.','Hello there.','Good afternoon.']:t==='evening'?['Evening.','Winding down for the day.','Good evening.']:['Late to be out.','Quiet at this hour.'];
 const intro=c<=1?` I am ${n.name}, ${n.occ}.`:'',ext=!emp&&Eco.post.owner==='player'&&/Customer|trader|Resident/.test(n.role)&&(n.id+c)%2===0?' You are the one running the Trading Post, are you not?':'';
 return fl(n,'greet')+base[(n.id+c)%base.length]+intro+ext+' What can I do for you?';}
function answer(n,tid){let arr;if(tid==='self')arr=[`${n.bio} Right now I am ${S.activity(n)}.`,`${n.name} — ${n.occ}. I ${n.workplace&&!/^none/.test(n.workplace)?'work with '+n.workplace:'have no regular workplace'} and live at ${n.home.n}. Lately: ${S.activity(n)}.`];
 else{const t=TOP[cat(n)].find(x=>x[0]===tid);arr=t?t[2](n):['...'];}
 const a=n.talk.asked[tid]||0;return fl(n,tid)+arr[(n.id+a)%arr.length];}
function doAct(n,act){const p=Eco.player;
 if(act==='buyTimber'){const c0=p.cash,t0=p.inv.timber;Eco.buyTimber();return p.inv.timber>t0?`Here you go — one timber for ${$c(c0-p.cash)}.`:`I cannot sell you that: ${Eco.log[0]}`;}
 if(act==='contract'){const st=Eco.contract.state,need=Eco.contract.need,rw=Eco.contract.reward,k0=Eco.contracts;Eco.contractAct();if(st==='offer')return `Done. Bring ${need} timber and I pay ${$c(rw)}.`;return Eco.contracts>k0?`Pleasure doing business — ${$c(rw)} as agreed.`:`Not yet: ${Eco.log[0]}`;}
 if(act==='buyFurn'){const c0=p.cash,f0=p.inv.furniture;Eco.buyFurn();return p.inv.furniture>f0?`One furniture set, ${$c(c0-p.cash)}. Enjoy it.`:`I cannot do that: ${Eco.log[0]}`;}
 if(act.startsWith('farmBuy:')){const it=act.slice(8),c0=p.cash,k0=p.inv[it]||0;Eco.buyFarm(it,1);return(p.inv[it]||0)>k0?`One ${it} for ${$c(c0-p.cash)} — straight from the barn.`:`I cannot do that: ${Eco.log[0]}`;}
 return '...';}
const Talk={cur:null,rev:0,range:3.4,
 canTalk(n){return!!n&&n.vis&&Math.hypot(n.x-S.player.x,n.z-S.player.z)<=Talk.range;},
 open(id){const n=S.npcs[id];if(!n||!Talk.canTalk(n)){Bus.emit('talk:denied',id);return null;}if(Talk.cur)Talk.close();n.talking=true;n.talk.count++;Talk.cur={id,text:greet(n),options:opts(n),topic:'greet'};Talk.rev++;Bus.emit('talk:open',id);return Talk.cur;},
 pick(i){const c=Talk.cur;if(c&&c.options[i])return Talk.choose(c.options[i].id);},
 choose(oid){const c=Talk.cur;if(!c)return null;const n=S.npcs[c.id];if(oid==='bye'){Talk.close();return null;}const o=c.options.find(x=>x.id===oid);if(!o)return null;const text=o.act?doAct(n,o.act):answer(n,oid);n.talk.asked[oid]=(n.talk.asked[oid]||0)+1;c.text=text;c.topic=oid;c.options=opts(n);Talk.rev++;Bus.emit('talk:topic',{id:c.id,topic:oid});return text;},
 close(){const c=Talk.cur;if(!c)return;const n=S.npcs[c.id];n.talking=false;n.talk.last=S.time;Talk.cur=null;Talk.rev++;Bus.emit('talk:close',c.id);},
 msg(id,tid){const n=S.npcs[id];if(!n)return null;const t=answer(n,tid);n.talk.asked[tid]=(n.talk.asked[tid]||0)+1;return t;},
 update(){const c=Talk.cur;if(!c)return;const n=S.npcs[c.id];if(!n.vis||Math.hypot(n.x-S.player.x,n.z-S.player.z)>Talk.range+3){Talk.close();Bus.emit('talk:walkedaway',c.id);}}};
S.Talk=Talk;S.hash=hash;S.TOP=TOP;S.cat=cat;S.opts=opts;S.greet=greet;
// ---- agriculture (pure simulation): fields/plots/ridges, crop lifecycle, livestock, tractor, farm rules ----
const AGC={maize:{g1:30,g2:70,yp:.18,sp:1.15,cost:300},cassava:{g1:40,g2:110,yp:.16,sp:1.0,cost:250}};   // seconds of SIM time per stage
const FDEF=[{id:'maize',crop:'maize',cx:-1,cz:-55,a:11,b:9.6,rot:.12,sp:1.6,end:1},{id:'cassava',crop:'cassava',cx:23,cz:-54,a:9,b:9.6,rot:-.08,sp:1.6,end:0}];
const PAST=[[-6,-44],[8,-45],[8.5,-39],[8,-30],[-3,-29.5],[-7,-36]];   // fenced cattle pasture (gate gap on the east side at z -38…-35)
const SITES={barn:{x:21,z:-36,w:12,d:9},shed:{x:33.5,z:-39,w:7,d:5},silo:{x:17,z:-29.5,r:1.8},house:{x:26,z:-18,w:9,d:7},cot1:{x:14,z:-18,w:5,d:4.5},cot2:{x:6,z:-18,w:5,d:4.5},drop:{x:21,z:-29.8},park:{x:18,z:-23.4},market:{x:-4,z:15.8},feed:{x:5.5,z:-39.5},water:{x:5.5,z:-33.5},gate:{x:8.4,z:-36.5}};
const member=(f,u,v)=>Math.pow(Math.pow(Math.abs(u)/f.a,4)+Math.pow(Math.abs(v)/f.b,4),.25)+.1*n2(f.cx*.3+u*.35,f.cz*.3+v*.35)<1;
const inPoly=(x,z,P=PAST)=>{let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const a=P[i],b=P[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;};
const segDist=(x,z,a,b)=>{const vx=b[0]-a[0],vz=b[1]-a[1],t=clamp(((x-a[0])*vx+(z-a[1])*vz)/(vx*vx+vz*vz||1),0,1);return Math.hypot(x-a[0]-vx*t,z-a[1]-vz*t);};
const polyMargin=(x,z)=>{let m=1e9;for(let i=0;i<PAST.length;i++)m=Math.min(m,segDist(x,z,PAST[i],PAST[(i+1)%PAST.length]));return m;};
const Agri={cfg:AGC,fields:[],plots:[],cows:[],sites:SITES,pasture:PAST,inPoly,feed:{level:12,cap:20},water:{level:20,cap:20},transit:{maize:0,cassava:0,milk:0},
 stats:{hu:{maize:0,cassava:0},spent:{seed:0,labour:0,fuel:0,feed:0},harvests:0,prepared:0,planted:0,dep:{maize:0,cassava:0,milk:0},loaded:{maize:0,cassava:0,milk:0},delivered:{maize:0,cassava:0,milk:0},milked:0,sold:0},last:'none',anch:{},rev:0};
function buildField(f,fi){const c=Math.cos(f.rot),s=Math.sin(f.rot),W=(u,v)=>[f.cx+u*c-v*s,f.cz+u*s+v*c],cf=AGC[f.crop];f.W=W;f.ridges=[];const nR=Math.floor(2*f.b/f.sp);
 for(let i=0;i<nR;i++){const v=-f.b+f.sp*(i+.5);let u0=null,u1=null;for(let u=-f.a-3;u<=f.a+3;u+=.4)if(member(f,u,v)){if(u0===null)u0=u;u1=u;}if(u0===null)continue;const p0=W(u0,v),p1=W(u1,v);f.ridges.push({v,u0,u1,x0:p0[0],z0:p0[1],x1:p1[0],z1:p1[1]});}
 f.poly=[];for(let k=0;k<32;k++){const th=k/32*6.2832,du=Math.cos(th),dv=Math.sin(th);let r=0;for(let rr=0;rr<=f.a+f.b+4;rr+=.25){if(member(f,du*rr,dv*rr))r=rr;else if(rr>2)break;}f.poly.push(W(du*(r+.4),dv*(r+.4)));}
 const per=Math.floor(f.ridges.length/4),init=f.crop==='maize'?['ready','growing','planted','prepared']:['growing','planted','harvested','prepared'];f.plots=[];
 for(let k=0;k<4;k++){const rs=f.ridges.slice(k*per,k===3?undefined:(k+1)*per),plants=[];rs.forEach(r=>{for(let u=r.u0+.7;u<=r.u1-.7;u+=cf.sp){const p=W(u,r.v);plants.push([p[0],p[1]]);}});
  const vm=rs.reduce((a,r)=>a+r.v,0)/rs.length,um0=Math.min(...rs.map(r=>r.u0)),um1=Math.max(...rs.map(r=>r.u1)),ue=f.end?um1+2.7:um0-2.7,entry=W(ue,vm),work=W((um0+um1)/2,(rs[0].v+rs[1].v)/2);
  const path=[entry];let atFar=false,nearU=0,farU=0,vv=0;for(let j=0;j<rs.length-1;j++){vv=(rs[j].v+rs[j+1].v)/2;const uA=Math.max(rs[j].u0,rs[j+1].u0)+.5,uB=Math.min(rs[j].u1,rs[j+1].u1)-.5;nearU=f.end?uB:uA;farU=f.end?uA:uB;if(j%2===0){path.push(W(nearU,vv),W(farU,vv));atFar=true;}else{path.push(W(farU,vv),W(nearU,vv));atFar=false;}}
  if(atFar)path.push(W(nearU,vv));path.push(entry);
  const pl={id:fi*4+k,field:f.id,crop:f.crop,idx:k,ridges:rs,plants,cx:work[0],cz:work[1],work,entry,path:path.map(p=>({x:p[0],z:p[1]})),stage:init[k],t0:init[k]==='planted'?-10:init[k]==='growing'?-30:0,rev:0,claim:null,claimUntil:0,tclaim:false,yieldQ:0};
  if(pl.stage==='ready')pl.yieldQ=Math.max(3,Math.round(plants.length*cf.yp));f.plots.push(pl);Agri.plots.push(pl);}
 Agri.fields.push(f);}
FDEF.forEach(buildField);
const COWN=['Bessie','Daisy','Nneka','Clover','Buttercup','Mabel'];
COWN.forEach((nm,i)=>{let x=0,z=0;for(let k=0;k<200;k++){x=-5+hash(i,20+k)*13;z=-43+hash(i,60+k)*13;if(inPoly(x,z)&&polyMargin(x,z)>1.6)break;}Agri.cows.push({id:i,name:nm,x,z,h:hash(i,5)*6.28,state:'graze',t:hash(i,6)*8,v:0,fed:60+hash(i,7)*30,water:60+hash(i,8)*30,health:80+hash(i,9)*18,milk:hash(i,10)*2,macc:0,tx:x,tz:z,eat:0});});
Agri.cond=c=>c.health>70?'good':c.health>40?'fair':'poor';
Agri.stagePct=p=>{const c=AGC[p.crop];return p.stage==='planted'?Math.min(99,Math.round((S.time-p.t0)/(c.g1+c.g2)*100)):p.stage==='growing'?Math.min(99,Math.round((c.g1+S.time-p.t0)/(c.g1+c.g2)*100)):p.stage==='ready'?100:0;};
Agri.plotInfo=p=>`${p.crop==='maize'?'Maize':'Cassava'} plot ${p.idx+1} · ${p.stage}${p.stage==='planted'||p.stage==='growing'?' '+Agri.stagePct(p)+'%':''}${p.stage==='ready'?' · '+p.yieldQ+' units to harvest':''}`;
const setStage=(p,st)=>{p.stage=st;p.t0=S.time;p.rev++;Agri.rev++;Bus.emit('crop:'+st,p.id);};
Agri.plant=(p,n)=>{const F=Eco.farm,c=AGC[p.crop];p.claim=null;if(p.stage!=='prepared')return false;if(F.cash<c.cost)return false;F.cash-=c.cost;F.exp+=c.cost;Agri.stats.spent.seed+=c.cost;F.note(`Planted ${p.crop} plot ${p.idx+1} (seed ${$c(c.cost)})`);Agri.stats.planted++;setStage(p,'planted');return true;};
Agri.harvest=(p,n)=>{const F=Eco.farm,item=p.crop;p.claim=null;if(p.stage!=='ready')return false;const q=p.yieldQ;if(F.inv[item]+Agri.transit[item]+q>F.cap[item]||F.cash<100)return false;F.cash-=100;F.exp+=100;Agri.stats.spent.labour+=100;F.note(`Harvested ${q} ${item} (labour ${$c(100)})`);Agri.transit[item]+=q;Agri.stats.hu[item]+=q;Agri.stats.harvests++;p.yieldQ=0;setStage(p,'harvested');n.carry={item,q};return true;};
Agri.deposit=n=>{const c=n.carry;if(!c)return false;const F=Eco.farm;F.inv[c.item]+=c.q;Agri.transit[c.item]-=c.q;Agri.stats.dep[c.item]+=c.q;F.note(`Stored ${c.q} ${c.item} in the barn`);n.carry=null;return true;};
Agri.prepare=p=>{const F=Eco.farm;p.tclaim=false;if(p.stage!=='harvested'||F.cash<150)return false;F.cash-=150;F.exp+=150;Agri.stats.spent.fuel+=150;F.note(`Tractor prepared ${p.crop} plot ${p.idx+1} (fuel ${$c(150)})`);Agri.stats.prepared++;setStage(p,'prepared');return true;};
Agri.milk=(c,n)=>{const F=Eco.farm,free=F.cap.milk-F.inv.milk-Agri.transit.milk,take=Math.min(Math.floor(c.milk),free);if(take<1)return false;c.milk-=take;Agri.transit.milk+=take;Agri.stats.milked+=take;F.note(`Milked ${c.name}: ${take} milk`);n.carry={item:'milk',q:take};return true;};
Agri.refill=(t,n)=>{const T=t==='feed'?Agri.feed:Agri.water,q=Math.min(10,T.cap-T.level);if(q<=0)return false;if(t==='feed'){const cost=q*20;if(Eco.farm.cash<cost)return false;Eco.farm.cash-=cost;Eco.farm.exp+=cost;Agri.stats.spent.feed+=cost;Eco.farm.note(`Bought ${q} units of cattle feed (${$c(cost)})`);}T.level+=q;return true;};
// ---- crops & livestock tick (sim time only; cows throttled)
let cowAcc=0,mktAcc=0;
function cowStep(c,dt){c.fed=Math.max(0,c.fed-.35*dt);c.water=Math.max(0,c.water-.3*dt);
 if(c.state==='eat'){if(Agri.feed.level>0&&c.fed<95){const u=Math.min(Agri.feed.level,.25*dt);Agri.feed.level-=u;c.fed=Math.min(100,c.fed+u*13);}c.t-=dt;if(c.t<=0||Agri.feed.level<=0)c.state='graze',c.t=4+hash(c.id,Math.floor(S.time))*6;}
 else if(c.state==='drink'){if(Agri.water.level>0&&c.water<95){const u=Math.min(Agri.water.level,.35*dt);Agri.water.level-=u;c.water=Math.min(100,c.water+u*14);}c.t-=dt;if(c.t<=0||Agri.water.level<=0)c.state='graze',c.t=4+hash(c.id,Math.floor(S.time)+9)*6;}
 else if(c.state==='graze'){c.fed=Math.min(100,c.fed+.33*dt);c.t-=dt;if(c.t<=0){
   if(c.fed<45&&Agri.feed.level>0){c.state='walk';c.goal='eat';c.tx=SITES.feed.x+(c.id%2?1.2:-.2);c.tz=SITES.feed.z-1.4;}
   else if(c.water<40&&Agri.water.level>0){c.state='walk';c.goal='drink';c.tx=SITES.water.x+(c.id%2?1.2:-.2);c.tz=SITES.water.z+1.4;}
   else{let x,z;for(let k=0;k<30;k++){x=-5+Math.random()*13;z=-43+Math.random()*13;if(inPoly(x,z)&&polyMargin(x,z)>1.4)break;}c.state='walk';c.goal='wander';c.tx=x;c.tz=z;}}}
 if(c.state==='walk'){const dx=c.tx-c.x,dz=c.tz-c.z,d=Math.hypot(dx,dz);if(d<.7){c.state=c.goal==='eat'?'eat':c.goal==='drink'?'drink':'graze';c.t=c.state==='graze'?5+Math.random()*8:7;c.v=0;}
  else{const ox=c.x,oz=c.z,sp=.75*dt;c.h+=wrap(Math.atan2(dx,dz)-c.h)*Math.min(1,dt*3);Col.move(c,dx/d*sp,dz/d*sp,.6,'ped');for(const o of Agri.cows)if(o!==c){const ex=c.x-o.x,ez=c.z-o.z,e=Math.hypot(ex,ez);if(e>0&&e<1.5){c.x+=ex/e*.4*dt;c.z+=ez/e*.4*dt;}}
   if(!inPoly(c.x,c.z)||polyMargin(c.x,c.z)<.5){c.x=ox;c.z=oz;c.t=.5;c.state='graze';}c.v=Math.hypot(c.x-ox,c.z-oz)/dt;if(c.v<.05){c.sT=(c.sT||0)+dt;if(c.sT>4){c.state='graze';c.t=3;c.sT=0;}}else c.sT=0;}}
 else c.v=0;
 c.health=clamp(c.health+((c.fed<15||c.water<15)?-.3:.3)*dt,0,100);
 if(c.fed>=50&&c.water>=40&&c.health>=50&&c.milk<4){c.macc+=dt*(.008+.012*c.fed/100);if(c.macc>=1){c.macc-=1;c.milk=Math.min(4,c.milk+1);}}}
// ---- tractor (reuses the road graph (Nav) for road legs; same follow/avoid rules as the logging truck; field legs follow furrow paths)
const TRC={x:SITES.park.x,z:SITES.park.z,h:Math.PI,v:0,steer:0,r:1.2,state:'idle',wait:10,route:null,cum:null,s:0,L:0,blk:0,dyn:0,fails:0,task:null,legs:[],cargo:null,field:false,cap:12,delivered:0};
function vSet(V,pts){const cum=[0];for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+Math.hypot(pts[i].x-pts[i-1].x,pts[i].z-pts[i-1].z));V.route=pts;V.cum=cum;V.L=cum[cum.length-1];V.s=0;V.blk=0;V.dyn=0;}
function vPt(V,s){const c=V.cum;let i=1;while(i<c.length-1&&c[i]<s)i++;const t=clamp((s-c[i-1])/Math.max(1e-6,c[i]-c[i-1]),0,1),a=V.route[i-1],b=V.route[i];return{x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};}
function vStep(V,dt,vmax){const look=2.5+V.v*1.1,pa=vPt(V,V.s),pb=vPt(V,Math.min(V.L,V.s+look)),pc=vPt(V,Math.min(V.L,V.s+look*.5)),df=wrap(Math.atan2(pb.x-pa.x,pb.z-pa.z)-V.h);V.h+=clamp(df,-2.2*dt,2.2*dt);V.steer=clamp(df,-.6,.6);
 let vt=(Math.abs(df)>.6?.3:Math.min(vmax,(V.L-V.s)*.9+.05))*(1-Math.min(.5,Math.abs(df)));
 if(!Col.free(pb.x,pb.z,V.r,'veh')||!Col.free(pc.x,pc.z,V.r,'veh')){vt=0;V.blk+=dt;}else V.blk=Math.max(0,V.blk-dt);
 const fx=Math.sin(V.h),fz=Math.cos(V.h);let dyn=0;const chk=(x,z)=>{const ex=x-V.x,ez=z-V.z,al=ex*fx+ez*fz;if(al>0&&al<look+2.2&&Math.abs(ex*fz-ez*fx)<1.9)dyn=1;};chk(S.player.x,S.player.z);S.npcs.forEach(n=>n.vis&&chk(n.x,n.z));Agri.cows.forEach(c=>chk(c.x,c.z));
 if(dyn){vt=0;V.dyn+=dt;}else V.dyn=0;if(V.blk>2.5)return'stuck';
 V.v+=clamp(vt-V.v,-6*dt,2*dt);V.s=Math.min(V.L,V.s+V.v*dt);const p=vPt(V,V.s);V.x=p.x;V.z=p.z;if(V.L-V.s<.4&&V.v<.5){V.v=0;return'arrived';}return'moving';}
const anchorPt=n=>n==='park'?SITES.park:n==='barn'?SITES.drop:Agri.anch[n];
function legRoad(to){const A=anchorPt(to),r=Nav.route(TRC.x,TRC.z,A.x,A.z);return r&&r.length>1?r:null;}
function nextLeg(){const V=TRC;if(!V.legs.length){V.state='idle';V.wait=6;V.task=null;V.v=0;V.fails=0;return;}const L=V.legs.shift();V.leg=L;
 if(L.act){V.state='act';V.wait=L.t||2;V.act=L.act;return;}
 let pts=null;if(L.road){pts=legRoad(L.road);V.field=false;}else{pts=[{x:V.x,z:V.z},...L.poly];V.field=true;}
 if(!pts){Bus.emit('tractor:noroute',L.road||'field');return abortTask();}vSet(V,pts);V.state='drive';}
function abortTask(){const V=TRC;Bus.emit('tractor:abort');if(V.task&&V.task.plot)V.task.plot.tclaim=false;V.fails++;V.task=null;V.legs=V.fails>=3?[]:[{road:'park'}];if(V.fails>=3){V.state='idle';V.wait=20;V.fails=0;V.v=0;return;}nextLeg();}
function tractorAct(name){const V=TRC;
 if(name==='prepare'){Agri.prepare(V.task.plot);Bus.emit('tractor:prepared',V.task.plot.id);return true;}
 if(name==='load'){const F=Eco.farm,M=Eco.market;let best=null,bq=0,br=0;['maize','cassava','milk'].forEach(it=>{const room=M.cap[it]-M.inv[it],q=Math.min(F.inv[it],V.cap,room),ratio=F.inv[it]/F.cap[it];if(F.inv[it]>=18&&room>=10&&ratio>br){best=it;bq=q;br=ratio;}});if(!best){V.legs=[{road:'park'}];return false;}
  F.inv[best]-=bq;V.cargo={item:best,q:bq};Agri.stats.loaded[best]+=bq;F.note(`Loaded ${bq} ${best} onto the tractor trailer`);Bus.emit('tractor:loaded',{item:best,qty:bq});return true;}
 if(name==='unload'){const c=V.cargo;if(!c)return true;if(Eco.farmDeliver(c.item,c.q)){Agri.stats.delivered[c.item]+=c.q;Agri.last=`${c.q} ${c.item}`;Bus.emit('tractor:delivered',{item:c.item,qty:c.q});V.cargo=null;V.delivered++;return true;}return false;}
 if(name==='return'){const c=V.cargo;if(c){Eco.farm.inv[c.item]+=c.q;Agri.stats.loaded[c.item]-=c.q;Eco.farm.note(`Returned ${c.q} ${c.item} to storage`);V.cargo=null;}return true;}
 return true;}
function pickTask(){const V=TRC,F=Eco.farm,M=Eco.market;
 if(V.cargo){return{type:'deliver',legs:[{road:'market'},{act:'unload',t:3},{road:'park'}]};}
 const full=['maize','cassava','milk'].some(it=>F.inv[it]>=F.cap[it]*.8&&M.cap[it]-M.inv[it]>=10);
 if(!full)for(const p of Agri.plots)if(p.stage==='harvested'&&!p.tclaim&&F.cash>=150&&p.node)return{type:'prepare',plot:p,legs:[{road:'p'+p.id},{poly:p.path},{act:'prepare',t:1},{road:'park'}]};
 if(['maize','cassava','milk'].some(it=>F.inv[it]>=18&&M.cap[it]-M.inv[it]>=10)&&S.time-(Agri.lastDelivery||-99)>25)return{type:'deliver',legs:[{road:'barn'},{act:'load',t:3},{road:'market'},{act:'unload',t:3},{road:'park'}]};
 for(const p of Agri.plots)if(p.stage==='harvested'&&!p.tclaim&&F.cash>=150&&p.node)return{type:'prepare',plot:p,legs:[{road:'p'+p.id},{poly:p.path},{act:'prepare',t:1},{road:'park'}]};
 return null;}
function tractorStep(dt){const V=TRC;
 if(V.state==='idle'){V.v=0;V.wait-=dt;if(V.wait<=0){V.wait=4;const t=pickTask();if(t){V.task=t;V.legs=t.legs.slice();if(t.plot)t.plot.tclaim=true;if(t.type==='deliver')Agri.lastDelivery=S.time;nextLeg();}}return;}
 if(V.state==='act'){V.v=0;V.wait-=dt;if(V.wait<=0){const ok=tractorAct(V.act);if(ok){V.fails=0;nextLeg();}else if(V.act==='unload'){V.fails++;V.wait=5;if(V.fails>=6){V.legs=[{road:'barn'},{act:'return',t:2},{road:'park'}];V.fails=0;nextLeg();}}else nextLeg();}return;}
 if(V.state==='drive'){const r=vStep(V,dt,V.field?2.2:4.2);if(r==='arrived')nextLeg();else if(r==='stuck'){V.blk=0;if(V.field||V.fails>=2)return abortTask();V.fails++;const sd=V.s+3;let k=1;while(k<V.cum.length-1&&V.cum[k]<sd)k++;[V.route[k-1].id,V.route[k].id].forEach(id=>{if(id!==undefined)Nav.bn.set(id,S.time+60);});Bus.emit('tractor:blocked');const L=V.leg;V.legs.unshift(L);nextLeg();}}}
// ---- farm NPC jobs (use ordinary pedestrian navigation; callbacks perform the real state change when the wait ends)
const dropPt=()=>[SITES.drop.x,SITES.drop.z];
function claim(p,n){p.claim=n.id;p.claimUntil=S.time+90;}
const avail=p=>!p.claim||p.claimUntil<S.time;
Agri.job=n=>{const F=Eco.farm;
 if(n.carry)return[SITES.drop.x,SITES.drop.z,1,1.5,2.5,'idle',()=>Agri.deposit(n),0];
 if(n.role==='Herdsman'){const cw=Agri.cows.filter(c=>c.milk>=1).sort((a,b)=>b.milk-a.milk)[0];
  if(cw&&F.cap.milk-F.inv.milk-Agri.transit.milk>=1)return[cw.x,cw.z,1,5,7,'bend',()=>Agri.milk(cw,n),0];
  if(Agri.feed.level<7&&F.cash>=200)return[SITES.feed.x+1.4,SITES.feed.z-1.2,1,4,6,'bend',()=>Agri.refill('feed',n),0];
  if(Agri.water.level<9)return[SITES.water.x+1.4,SITES.water.z+1.2,1,4,6,'bend',()=>Agri.refill('water',n),0];
  return[SITES.gate.x+(Math.random()-.5)*2,SITES.gate.z+(Math.random()-.5)*5,1,4,9,'look'];}
 const pref=n.role==='Farm manager'?null:(n.id%2?'cassava':'maize'),near=(a,b)=>Math.hypot(a.cx-n.x,a.cz-n.z)-Math.hypot(b.cx-n.x,b.cz-n.z);
 if(n.role!=='Farm manager'){
  const rd=Agri.plots.filter(p=>p.stage==='ready'&&avail(p)&&F.inv[p.crop]+Agri.transit[p.crop]+p.yieldQ<=F.cap[p.crop]).sort((a,b)=>(a.crop===pref?-1:0)-(b.crop===pref?-1:0)||near(a,b))[0];
  if(rd){claim(rd,n);return[rd.work[0],rd.work[1],1,8,12,'bend',()=>Agri.harvest(rd,n),0];}
  const pr=Agri.plots.filter(p=>p.stage==='prepared'&&avail(p)&&F.cash>=AGC[p.crop].cost).sort((a,b)=>(a.crop===pref?-1:0)-(b.crop===pref?-1:0)||near(a,b))[0];
  if(pr){claim(pr,n);return[pr.work[0],pr.work[1],1,6,9,'bend',()=>Agri.plant(pr,n),0];}}
 const gr=Agri.plots.filter(p=>p.stage==='planted'||p.stage==='growing'||p.stage==='ready');
 if(gr.length&&(n.role==='Farm manager'?Math.random()<.75:Math.random()<.5)){const p=gr[Math.floor(Math.random()*gr.length)];return[p.work[0],p.work[1],1,4,8,'look',()=>{p.inspected=S.time;},0];}
 return[SITES.drop.x+(Math.random()-.5)*8,SITES.drop.z+1+(Math.random()-.5)*2,1,3,7,'look'];};
Agri.update=dt=>{
 for(const p of Agri.plots){const c=AGC[p.crop];if(p.stage==='planted'&&S.time-p.t0>=c.g1)setStage(p,'growing');else if(p.stage==='growing'&&S.time-p.t0>=c.g2){p.yieldQ=Math.max(3,Math.round(p.plants.length*c.yp));setStage(p,'ready');}}
 cowAcc+=dt;if(cowAcc>=.1){const d=cowAcc;cowAcc=0;Agri.cows.forEach(c=>cowStep(c,d));}
 tractorStep(dt);
 mktAcc+=dt;if(mktAcc>=20){mktAcc=0;const M=Eco.market;[['maize',450],['cassava',400],['milk',350]].forEach(([it,rt])=>{if(M.inv[it]>0){M.inv[it]--;M.cash+=rt;M.rev+=rt;M.note(`Sold 1 ${it} to townspeople (${$c(rt)})`);Agri.stats.sold++;}});for(const [item,max,unit]of [['furniture',1,6500],['gold',1000,3]]){const q=Math.min(M.inv[item]||0,max);if(q){M.inv[item]-=q;M.cash+=q*unit;M.rev+=q*unit;M.note(`Sold ${q} ${item} to external customers`);}}}
 const F=Eco.farm;F.activity=['maize','cassava','milk'].every(i=>F.inv[i]>=F.cap[i])?'Storage full':F.cash<300?'Low on cash':'Operating';};
Agri.init=()=>{Agri.anch.market=(()=>{const i=Nav.nearest(SITES.market.x,SITES.market.z);return{x:Nav.N[i].x,z:Nav.N[i].z};})();
 Agri.plots.forEach(p=>{const i=Nav.nearest(p.entry[0],p.entry[1]);p.node={x:Nav.N[i].x,z:Nav.N[i].z};Agri.anch['p'+p.id]=p.node;});
 const d=Nav.nearest(SITES.drop.x,SITES.drop.z);Agri.anch.barn=SITES.drop;};
S.Agri=Agri;S.tractor=TRC;S.farmGeo={FDEF,AGC,SITES,PAST,inPoly,polyMargin};
// ---- phone messaging (simulation): NPC replies come from the same state-driven dialogue engine; no external AI ----
const Msg={threads:{},rev:0,
 contacts(){const c=new Set([10,11,24]);S.npcs.forEach(n=>{if(n.talk.count>0)c.add(n.id);});return[...c].sort((a,b)=>a-b).map(i=>S.npcs[i]);},
 topics(n){return opts(n).filter(o=>!o.act&&o.id!=='bye');},
 thread(id){const n=S.npcs[id];if(!n)return null;if(!Msg.threads[id]){Msg.threads[id]=[{me:0,text:`Hi, it's ${n.name} — ${n.occ}. Ask me anything.`,t:S.clock.h}];}return Msg.threads[id];},
 ask(id,tid){const n=S.npcs[id];if(!n)return null;const o=Msg.topics(n).find(x=>x.id===tid);if(!o)return null;const th=Msg.thread(id),text=answer(n,tid);n.talk.asked[tid]=(n.talk.asked[tid]||0)+1;th.push({me:1,text:o.label,t:S.clock.h},{me:0,text,t:S.clock.h});Msg.rev++;return text;}};
S.Msg=Msg;
S.Geo.farmZone=(x,z)=>Math.hypot((x-12)/1.15,z+41)<34;
S.nodes=[];S.harvesting=null;S.jobs=[];S.jobSequence=0;
S.startCraft=recipe=>{const P=Eco.player;if(recipe!=='furniture'||Math.hypot(S.player.x-24,S.player.z-7)>6)return false;if(S.jobs.some(j=>j.status==='working'))return Eco.say('Finish your current production job first.'),false;if(P.inv.timber<3||P.cash<200)return Eco.say('Crafting needs 3 timber and $2 labour.'),false;P.inv.timber-=3;P.cash-=200;P.exp+=200;Eco.ow.cash+=200;Eco.ow.rev+=200;S.jobs.push({id:++S.jobSequence,recipe,started:S.time,finish:S.time+8,status:'working'});if(S.jobs.length>30)S.jobs.shift();Eco.say('Furniture production started. Ready in 8 island seconds.');return true;};
S.productionStep=()=>{for(const job of S.jobs)if(job.status==='working'&&S.time>=job.finish){job.status='complete';Eco.player.inv.furniture++;Eco.player.note('Crafted 1 furniture from 3 timber and $2 labour');Eco.say('Furniture ready and added to your pack.');}};
S.startHarvest=id=>{const n=S.nodes[id];if(!n||S.harvesting||Talk.cur||n.qty<1||Math.hypot(n.x-S.player.x,n.z-S.player.z)>3)return false;S.harvesting={id,t:0};return true;};
S.resourceStep=dt=>{for(const n of S.nodes)if(n.regen>0){n.regen=Math.max(0,n.regen-dt);if(n.regen===0)n.qty=n.max;}const h=S.harvesting;if(!h)return;const n=S.nodes[h.id];if(Math.hypot(n.x-S.player.x,n.z-S.player.z)>3){S.harvesting=null;return;}h.t+=dt;if(h.t>=2){n.qty--;const item=n.kind==='ore'?'ore':'timber';Eco.player.inv[item]=(Eco.player.inv[item]||0)+1;Eco.say(item==='ore'?'Mined 1 gold ore.':'Harvested 1 timber.');if(n.qty===0)n.regen=30;S.harvesting=null;}};
S.init=cfg=>{S.nodes=(cfg.nodes||[]).map((n,id)=>({...n,id}));Nav.build();PN.build();Agri.init();S.ev=cfg.ev;T.anch=cfg.anch;let i=0;cfg.spec.forEach(sp=>{for(let c=0;c<sp[1];c++,i++){const home=sp[6]==='farm'?cfg.farmHomes[sp[7][c]]:cfg.homes[i%cfg.homes.length];home.occ.push(sp[0]);S.npcs.push({id:i,role:sp[0],work:sp[2],sched:sp[3],spd:sp[4]*(.85+hash(i,1)*.3),out:OUT[sp[5]],home,off:(hash(i,2)-.5)*1.2,phase:'',dest:null,path:null,pi:0,wait:hash(i,3)*6,mode:'idle',cur:-1,x:home.dx,z:home.dz,h:0,v:0,vis:true,near:true,sT:0,lx:home.dx,lz:home.dz,acc:0,st:{work:0,home:0,replan:0,drop:0,stuck:0}});identity(S.npcs[i],i);if(sp[6]==='farm')S.npcs[i].jobFn=Agri.job;}});};
S.update=dt=>{S.time+=dt;const c=S.clock;c.h=(c.h+dt*24/c.DAYLEN)%24;Eco.tick(dt);truckStep(dt);shipStep(dt);plantStep(dt);const P=S.player;
 S.npcs.forEach(n=>{const d=Math.hypot(n.x-P.x,n.z-P.z);if(n.talking){n.v=0;n.h+=wrap(Math.atan2(P.x-n.x,P.z-n.z)-n.h)*Math.min(1,dt*6);return;}n.near=d<70;n.acc+=dt;if(n.acc>=(d>70?.25:d>40?.08:0)){npcStep(n,n.acc,c.h);n.acc=0;}});Agri.update(dt);Talk.update();S.resourceStep(dt);S.productionStep();};
S.saveTimers=()=>({plantT,cowAcc,mktAcc});
S.restoreTimers=t=>{plantT=t.plantT||0;cowAcc=t.cowAcc||0;mktAcc=t.mktAcc||0;};
return S;})();

return {Bus,Eco,Sim,MS,Biz,money:$,random};
}
return {createGame,seededRandom};
});
