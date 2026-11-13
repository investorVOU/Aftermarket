(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.GameSync=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 class StateTransport {
  constructor(api){this.api=api;this.tail=Promise.resolve();this.sequence=0;this.active=0;this.maxActive=0;}
  request(route,body){
   const run=this.tail.then(async()=>{
    const sequence=++this.sequence;this.active++;this.maxActive=Math.max(this.maxActive,this.active);
    try{const data=await this.api(route,typeof body==='function'?body():body);data.requestSequence=sequence;return data;}finally{this.active--;}
   });
   this.tail=run.catch(()=>{});return run;
  }
 }
 class SnapshotOrder {
  constructor(){this.time=-1;this.revision=-1;this.sequence=0;}
  accept(data){
   if(!data.state||data.state.time<this.time||data.revision<this.revision||data.requestSequence&&data.requestSequence<=this.sequence)return false;
   this.time=data.state.time;this.revision=data.revision;this.sequence=data.requestSequence||this.sequence;return true;
  }
 }
 return {StateTransport,SnapshotOrder};
});
