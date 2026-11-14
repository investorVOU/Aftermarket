(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.MovementView=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // Presentation prediction only: never writes a server snapshot or economic state.
  return class MovementView {
    constructor(collision,{threshold=.65,hardSnap=4}={}){this.collision=collision;this.threshold=threshold;this.hardSnap=hardSnap;this.ready=false;this.age=0;this.corrections=0;this.target=null;this.maxPrediction=1;this.historyX=new Float32Array(240);this.historyZ=new Float32Array(240);this.historyDt=new Float32Array(240);this.cursor=0;this.historyCount=0;}
    replay(expected,seconds){
      if(seconds<=0||!this.historyCount)return;
      let remaining=seconds,index=this.cursor,count=0;
      while(count<this.historyCount&&remaining>0){index=(index+239)%240;remaining-=this.historyDt[index];count++;}
      const first=Math.max(0,this.historyDt[index]+Math.min(0,remaining));
      for(let n=0;n<count;n++,index=(index+1)%240){const dt=n?this.historyDt[index]:first,x=this.historyX[index],z=this.historyZ[index];if(x||z)this.collision.move(expected,x*6*dt,z*6*dt,.4,'player');}
    }
    accept(player,movement={x:0,z:0},rtt=0){
      const expected={x:player.x,z:player.z};this.age=0;
      // The snapshot trails both outbound input and the returning response.
      // Replay actual recent input over the RTT, including turns/stops, rather
      // than extrapolating the latest direction for only half the trip.
      const latency=Number.isFinite(rtt)?Math.max(0,rtt):0;
      this.maxPrediction=Math.max(1,Math.min(2.5,latency/1000*2+.25));
      if(this.ready)this.replay(expected,Math.min(2.5,latency/1000));
      const error=this.ready?Math.hypot(this.x-expected.x,this.z-expected.z):Infinity;
      if(!this.ready||error>this.hardSnap){this.x=player.x;this.z=player.z;this.ready=true;this.target=null;return;}
      // Small snapshot differences are normal latency/tick noise. Correct only
      // meaningful divergence; snapshots never reset immediate local input.
      if(error>this.threshold){this.target=expected;this.corrections++;}else this.target=null;
    }
    step(dt,movement,enabled){
      if(!this.ready)return;
      // Idle polling is deliberately slower. Do not spend the prediction budget
      // while standing still, otherwise the first keypress waits for a response.
      if(enabled&&(movement.x||movement.z))this.age+=dt;
      const active=enabled&&this.age<this.maxPrediction,dx=active?movement.x*6*dt:0,dz=active?movement.z*6*dt:0;
      this.historyX[this.cursor]=active?movement.x:0;this.historyZ[this.cursor]=active?movement.z:0;this.historyDt[this.cursor]=dt;this.cursor=(this.cursor+1)%240;this.historyCount=Math.min(240,this.historyCount+1);
      this.collision.move(this,dx,dz,.4,'player');
      if(this.target){
        this.collision.move(this.target,dx,dz,.4,'player');
        const k=1-Math.exp(-8*dt);
        let cx=(this.target.x-this.x)*k,cz=(this.target.z-this.z)*k;
        if(active&&(movement.x||movement.z)){
          // Do not make an advancing character visibly walk backwards because
          // a delayed snapshot arrived. Settle remaining error when input ends.
          const length=Math.hypot(movement.x,movement.z),ux=movement.x/length,uz=movement.z/length,along=cx*ux+cz*uz;
          if(along<0){cx-=along*ux;cz-=along*uz;}
          const distance=Math.hypot(cx,cz),limit=2.5*dt;if(distance>limit){cx*=limit/distance;cz*=limit/distance;}
        }
        this.collision.move(this,cx,cz,.4,'player');
        if(Math.hypot(this.target.x-this.x,this.target.z-this.z)<.02)this.target=null;
      }
    }
  };
});
