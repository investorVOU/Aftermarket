'use strict';
// Integer game cents only. No real-money lending, compounding, seizure or LLM approval.
const OFFERS=[2000,5000],FEE_BPS=2000,LATE_FEE=500,DAYS=3;
function ensure(G){
 G.Eco.lender||={name:'Marlow — Back Alley Credit',cash:20000,inv:{},rev:0,exp:0,capital:0,start:20000,hist:[]};
 G.Eco.credit||={loan:null,sequence:0,history:[]};
 return G.Eco.credit;
}
const due=loan=>loan?loan.principalRemaining+loan.feeRemaining:0;
function receipt(G,message){G.Eco.player.note(message);G.Eco.say(message);}
function tick(G){const C=ensure(G),l=C.loan;if(l&&due(l)>0&&G.Sim.time>=l.dueAt&&!l.overdue){l.overdue=true;l.feeRemaining+=LATE_FEE;l.fee+=LATE_FEE;receipt(G,'Marlow: overdue. One $5 late fee added. No further late fees or compounding.');}}
function borrow(G,amount){
 const C=ensure(G),P=G.Eco.player,L=G.Eco.lender;
 if(!Number.isSafeInteger(amount)||!OFFERS.includes(amount))throw Error('Choose a $20 or $50 advance.');
 if(due(C.loan)>0)throw Error('Marlow: settle the existing debt before asking for another advance.');
 if(L.cash<amount)throw Error('Marlow is out of lending cash.');
 const fee=amount*FEE_BPS/10000;
 C.loan={id:++C.sequence,principal:amount,principalRemaining:amount,fee,feeRemaining:fee,borrowedAt:G.Sim.time,dueAt:G.Sim.time+DAYS*G.Sim.clock.DAYLEN,overdue:false};
 P.cash+=amount;P.capital+=amount;L.cash-=amount;L.capital-=amount;
 receipt(G,`Marlow advanced $${amount/100}. Repay $${(amount+fee)/100} within 3 island days. One $5 late fee if overdue.`);
}
function repay(G,amount){
 const C=ensure(G),P=G.Eco.player,L=G.Eco.lender,l=C.loan;
 if(amount!=='full'&&amount!==1000)throw Error('Choose repay $10 or repay in full.');
 if(!l||due(l)<=0)throw Error('There is no outstanding loan.');
 tick(G);const payment=amount==='full'?due(l):Math.min(amount,due(l));
 if(P.cash<payment)throw Error('Not enough game cash for this repayment.');
 const feePaid=Math.min(l.feeRemaining,payment),principalPaid=payment-feePaid;
 l.feeRemaining-=feePaid;l.principalRemaining-=principalPaid;P.cash-=payment;P.exp+=feePaid;P.capital-=principalPaid;L.cash+=payment;L.rev+=feePaid;L.capital+=principalPaid;
 receipt(G,`Repaid Marlow $${(payment/100).toFixed(2)}. $${(due(l)/100).toFixed(2)} remaining.`);
 if(due(l)===0){l.closedAt=G.Sim.time;C.history.unshift({...l});C.history=C.history.slice(0,20);}
}
module.exports={ensure,tick,borrow,repay,due,OFFERS,FEE_BPS,LATE_FEE,DAYS};
