(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.NpcView=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 // Presentation only. Play received positions on a short delayed timeline rather
 // than repeatedly easing to a stationary snapshot. Never advances NPC AI/state.
 return class NpcView {
  constructor(collision){this.collision=collision;this.frames=[];this.gaps=[];this.delay=1250;this.cursor=null;this.previousNow=null;this.left=null;this.right=null;}
  accept(npcs,now){
   const last=this.frames.at(-1);
   if(last&&now<=last.at)return;
   if(last&&now-last.at>3000){this.frames.length=0;this.gaps.length=0;this.cursor=null;this.previousNow=null;this.delay=1250;}
   else if(last&&now-last.at>=50){this.gaps.push(now-last.at);if(this.gaps.length>8)this.gaps.shift();this.delay=Math.max(250,Math.min(2000,Math.max(...this.gaps)+150));}
   const actors=npcs.map(n=>({x:n.x,z:n.z,h:n.h,vis:n.vis,mode:n.mode,talking:n.talking}));
   // Discard an actor's pre-transition trail so it cannot rewind out of a house
   // or back to its earlier walking position after a conversation ends.
   actors.forEach((n,id)=>{const previous=last?.actors[id];if(previous&&(previous.vis!==n.vis||previous.talking!==n.talking||Math.hypot(previous.x-n.x,previous.z-n.z)>6))for(const frame of this.frames)frame.actors[id]=n;});
   this.frames.push({at:now,actors});
   if(this.frames.length>24)this.frames.shift();
  }
  step(now){
   if(!this.frames.length)return;
   const newest=this.frames.at(-1),target=now-this.delay;
   if(this.cursor===null)this.cursor=target;
   else {const dt=Math.max(0,Math.min(100,now-this.previousNow));const rate=Math.max(.8,Math.min(1.2,1+(target-this.cursor)/1000));this.cursor=Math.min(newest.at,this.cursor+dt*rate);}
   this.previousNow=now;
   while(this.frames.length>2&&this.frames[1].at<=this.cursor)this.frames.shift();
   this.left=this.frames[0];this.right=this.frames[1]||this.left;
  }
  sample(id,out){
   if(!this.left)return false;
   const a=this.left.actors[id],b=this.right.actors[id],latest=this.frames.at(-1).actors[id];if(!a||!b||!latest)return false;
   const span=this.right.at-this.left.at,k=span?Math.max(0,Math.min(1,(this.cursor-this.left.at)/span)):1;
   // House entry/exit, conversation stops and discontinuities use the confirmed
   // position immediately. Never interpolate a teleport or extrapolate an outage.
   const snap=!a.vis||!b.vis||!latest.vis||latest.talking||Math.hypot(b.x-a.x,b.z-a.z)>6;
   if(snap){out.x=latest.x;out.z=latest.z;out.h=latest.h;out.vis=latest.vis;out.mode=latest.mode;out.v=0;return true;}
   out.x=a.x;out.z=a.z;const dx=(b.x-a.x)*k,dz=(b.z-a.z)*k;
   if(this.collision)this.collision.move(out,dx,dz,.4,'ped');else{out.x+=dx;out.z+=dz;}
   out.h=a.h+Math.atan2(Math.sin(b.h-a.h),Math.cos(b.h-a.h))*k;out.vis=latest.vis;out.mode=k<1?a.mode:b.mode;
   out.v=span&&this.cursor>=this.left.at&&this.cursor<this.right.at?Math.hypot(b.x-a.x,b.z-a.z)/(span/1000):0;return true;
  }
 };
});
