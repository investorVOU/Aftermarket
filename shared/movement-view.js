(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.MovementView=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // Presentation prediction only: never writes a server snapshot or economic state.
  return class MovementView {
    constructor(collision,{threshold=.65,hardSnap=4}={}){this.collision=collision;this.threshold=threshold;this.hardSnap=hardSnap;this.ready=false;this.age=0;this.corrections=0;this.target=null;}
    accept(player,movement={x:0,z:0},rtt=0){
      const expected={x:player.x,z:player.z};this.age=0;
      const lead=Math.min(.2,Math.max(0,rtt/2000));
      this.collision.move(expected,movement.x*6*lead,movement.z*6*lead,.4,'player');
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
      const active=enabled&&this.age<1,dx=active?movement.x*6*dt:0,dz=active?movement.z*6*dt:0;
      this.collision.move(this,dx,dz,.4,'player');
      if(this.target){
        this.collision.move(this.target,dx,dz,.4,'player');
        const k=1-Math.exp(-8*dt);
        this.collision.move(this,(this.target.x-this.x)*k,(this.target.z-this.z)*k,.4,'player');
        if(Math.hypot(this.target.x-this.x,this.target.z-this.z)<.02)this.target=null;
      }
    }
  };
});
