'use strict';
// Drain the durable outbox in order. A replay returns null; Store protects any
// original receipt. Never skip a failed head job or mark it confirmed on error.
async function drain({store,chain,maxJobs=8,timeBudget=20000,onConfirmed=()=>{}}){
  const deadline=Date.now()+timeBudget;let completed=0;
  while(completed<maxJobs&&Date.now()<deadline){
    const job=await store.pending();if(!job)break;
    try{
      let hash;
      for(let attempt=0;;attempt++){
        try{hash=await chain.settle(job.payload);break;}
        catch(error){
          // A retiring/old relayer may still use this controller. Refresh its
          // cached nonce and retry the SAME replay-protected checkpoint only.
          if(attempt>=2||!/Invalid nonce|InvalidNonce/i.test(error.message))throw error;
          chain.client=null;await new Promise(resolve=>setTimeout(resolve,750));
        }
      }
      await store.settlement(job.id,{status:'confirmed',transaction_hash:hash,error:null});completed++;onConfirmed({id:job.id,hash});
    }
    catch(error){await store.settlement(job.id,{error:'Testnet settlement pending. Operator must check relayer balance, storage deposit and contract configuration.'});throw error;}
  }
  return completed;
}
module.exports={drain};
