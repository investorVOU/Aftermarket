'use strict';
// Merchant-funded delivery work. Inventory, wages and time are server-owned.
const SPECS={workshop:{title:'Workshop supply run',business:'ow',item:'timber',quantity:3,target:9,x:24,z:7,unit:G=>G.Eco.ow.bid+100},
 harbour:{title:'Harbour restocking',business:'port',item:'timber',quantity:2,target:30,x:31,z:null,unit:()=>1800},
 furniture:{title:'Furnish the market',business:'market',item:'furniture',quantity:1,target:5,x:-4,z:14.3,unit:()=>5500}};
function ensure(G){
 G.Eco.jobdesk||=new G.Biz({name:'Merchant jobs escrow',cash:0,inv:{}});
 G.Eco.employment||={active:null,completed:0,earned:0,sequence:0,completedDay:{},history:[],offers:[]};return G.Eco.employment;
}
function day(G){return Math.floor((G.Sim.time+1e-6)/G.Sim.clock.DAYLEN);}
function release(G,job){const E=G.Eco,B=E[job.business],desk=E.jobdesk;if(desk.cash<job.reward)throw Error('Job reserve is inconsistent. Reconnect before continuing.');desk.cash-=job.reward;desk.capital-=job.reward;B.cash+=job.reward;B.capital+=job.reward;}
function offer(G,id){
 const C=ensure(G),s=SPECS[id];if(!s)throw Error('Unknown job');const B=G.Eco[s.business],unit=s.unit(G),reward=unit*s.quantity;
 const reason=C.active?'Finish or cancel your current job.':C.completedDay[id]===day(G)?'Completed today. Return next island day.':B.closed?'This shop is closed.':B.inv[s.item]>=s.target?'Stock target met. Check again after production or trading.':B.cash<reward?'Employer cannot reserve the wages.':(B.inv[s.item]||0)+s.quantity>B.cap[s.item]?'Employer storage is full.':null;
 return {id,...s,z:s.z??G.Sim.Geo.PZ-6,unit,reward,employer:B.name,available:!reason,reason:reason||'Merchant stock is below target; wages can be reserved.'};
}
function update(G){const C=ensure(G),j=C.active;if(j&&G.Sim.time>=j.expiresAt){release(G,j);C.active=null;G.Eco.say('Delivery job expired. Reserved wages returned to the employer; your goods stay in your pack.');}C.offers=Object.keys(SPECS).map(id=>offer(G,id));C.rank=C.completed>=10?'Island specialist':C.completed>=3?'Trusted courier':'New arrival';}
function accept(G,id){update(G);const C=ensure(G),o=offer(G,id);if(!o.available)throw Error(o.reason);const B=G.Eco[o.business],desk=G.Eco.jobdesk;
 B.cash-=o.reward;B.capital-=o.reward;desk.cash+=o.reward;desk.capital+=o.reward;
 C.active={id:++C.sequence,offer:id,title:o.title,business:o.business,item:o.item,quantity:o.quantity,unit:o.unit,reward:o.reward,x:o.x,z:o.z,acceptedAt:G.Sim.time,expiresAt:G.Sim.time+2*G.Sim.clock.DAYLEN};
 G.Eco.say('Job accepted: '+o.title+'. Wages reserved. Deliver at '+o.employer+' within 2 island days.');update(G);
}
function complete(G){update(G);const C=ensure(G),j=C.active,E=G.Eco,P=E.player;if(!j)throw Error('No active job.');const B=E[j.business];
 if(Math.hypot(G.Sim.player.x-j.x,G.Sim.player.z-j.z)>5)throw Error('Deliver at '+B.name+' ('+j.x+', '+j.z+').');
 if((P.inv[j.item]||0)<j.quantity)throw Error('Bring '+j.quantity+' '+j.item+' to complete this job.');
 if(B.closed)throw Error('The shop is closed. Help it recover or cancel for an employer refund.');
 if((B.inv[j.item]||0)+j.quantity>B.cap[j.item])throw Error('Employer storage is full. Wait for stock to move or cancel.');
 release(G,j);if(!E.trade(B,P,j.item,j.quantity,j.unit))throw Error('Delivery trade rejected.');
 C.completed++;C.earned+=j.reward;C.completedDay[j.offer]=day(G);C.history.unshift({...j,completedAt:G.Sim.time});C.history=C.history.slice(0,20);C.active=null;E.rep++;E.chk();
 E.say('Job complete: earned $'+(j.reward/100).toFixed(2)+' and +1 reputation.');update(G);
}
function cancel(G){const C=ensure(G);if(!C.active)throw Error('No active job.');release(G,C.active);C.active=null;G.Eco.say('Job cancelled. Wages returned to the employer; you keep your goods.');update(G);}
module.exports={ensure,offer,update,accept,complete,cancel,SPECS};
