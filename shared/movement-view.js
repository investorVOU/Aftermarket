(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.MovementView=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // Presentation prediction only: never writes a server snapshot or economic state.
  return class MovementView {
    constructor(collision){this.collision=collision;this.ready=false;this.age=0;}
    accept(player,movement={x:0,z:0},rtt=0){
      this.target={x:player.x,z:player.z};this.age=0;
      const lead=Math.min(.2,Math.max(0,rtt/2000));
      this.collision.move(this.target,movement.x*6*lead,movement.z*6*lead,.4,'player');
      if(!this.ready||Math.hypot(this.x-player.x,this.z-player.z)>4){this.x=player.x;this.z=player.z;this.ready=true;}
    }
    step(dt,movement,enabled){
      if(!this.ready)return;
      this.age+=dt;
      const active=enabled&&this.age<.5,dx=active?movement.x*6*dt:0,dz=active?movement.z*6*dt:0;
      this.collision.move(this,dx,dz,.4,'player');
      this.collision.move(this.target,dx,dz,.4,'player');
      const k=1-Math.exp(-8*dt);
      this.collision.move(this,(this.target.x-this.x)*k,(this.target.z-this.z)*k,.4,'player');
    }
  };
});
