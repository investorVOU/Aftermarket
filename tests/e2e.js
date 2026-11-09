const H=require('./harness.js');let pass=0,fail=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);c?pass++:fail++;};
H.maxFrames=1e9;const W=H.load(321,true);const {Sim,Eco,Input,CamRig}=W;const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 await wait(300);                           // let initial frames settle
 // 1) keyboard movement through the real loop
 const z0=Sim.player.z,x0=Sim.player.x,moveStart=Sim.time;Input.key(true,'w');await wait(250);Input.key(false,'w');
 ok(Math.hypot(Sim.player.x-x0,Sim.player.z-z0)>6*(Sim.time-moveStart)*.8,`real loop: W moves the player (${Math.hypot(Sim.player.x-x0,Sim.player.z-z0).toFixed(1)} m)`);
 ok(Math.hypot(CamRig.lx-Sim.player.x,CamRig.lz-Sim.player.z)<6,'camera look-point follows the player');
 // 2) joystick movement through the same loop
 const a=[Sim.player.x,Sim.player.z],joyStart=Sim.time;Input.joy.cx=100;Input.joy.cy=600;Input.joy.R=60;Input.joyDown(1,100,600);Input.joyMove(1,100+60,600);await wait(250);Input.joyUp(1);
 ok(Math.hypot(Sim.player.x-a[0],Sim.player.z-a[1])>6*(Sim.time-joyStart)*.8,`real loop: joystick moves the player (${Math.hypot(Sim.player.x-a[0],Sim.player.z-a[1]).toFixed(1)} m) via the same intent path`);
 // 3) half-pushed joystick is slower than full push
 const b=[Sim.player.x,Sim.player.z];Input.joyDown(2,100,600);Input.joyMove(2,100+30,600);await wait(250);Input.joyUp(2);const half=Math.hypot(Sim.player.x-b[0],Sim.player.z-b[1]);
 const c=[Sim.player.x,Sim.player.z];Input.joyDown(3,100,600);Input.joyMove(3,100+60,600);await wait(250);Input.joyUp(3);const full=Math.hypot(Sim.player.x-c[0],Sim.player.z-c[1]);
 ok(half>0&&half<full*.85,`analog joystick: half push ${half.toFixed(1)} m < full push ${full.toFixed(1)} m`);
 // 4) interaction: stand at Timber Supply, press F (keyboard) then use the touch button path
 Sim.npcs.forEach(n=>n.vis=false);Sim.player.x=-24;Sim.player.z=9.4;await wait(120);
 ok(Input.ui.bF.style.display==='flex'&&/Buy timber/.test(Input.ui.bF.textContent),`touch interact button shows context label: "${Input.ui.bF.textContent}"`);
 const t0=Eco.ts.inv.timber,c0=Eco.player.cash;Input.key(true,'f');await wait(120);Input.key(false,'f');
 ok(Eco.ts.inv.timber===t0-1&&Eco.player.inv.timber===1&&Eco.player.cash===c0-Eco.ts.price,'F buys 1 timber from Timber Supply (economy updated once)');
 Input.btn('F');await wait(120);ok(Eco.player.inv.timber===2,'on-screen interact button performs the same action');
 Sim.player.x=0;Sim.player.z=4;await wait(120);ok(Input.ui.bF.style.display==='none','interact button hides when nothing is in range');
 // 5) NPC tracking via tap and via T, then return
 Sim.npcs.forEach(n=>n.vis=false);const n=Sim.npcs[4];n.vis=true;n.wait=999;n.x=Sim.player.x+4;n.z=Sim.player.z+3;n.phase='work';await wait(150);
 const pr=CamRig.project(n.x,W.tY(n.x,n.z)+1,n.z,1200,800);Input.ptr('down',{id:9,x:pr.x,y:pr.y,type:'touch'});Input.ptr('up',{id:9,x:pr.x,y:pr.y});await wait(150);
 ok(CamRig.follow===4,'tapping an NPC on screen starts camera tracking it');ok(/Following: /.test(Input.ui.tl.textContent)&&Input.ui.trk.style.display==='block','"Following" chip appears (tap it to return)');
 const yaw0=CamRig.gy;Input.key(true,'e');await wait(120);Input.key(false,'e');ok(CamRig.gy>yaw0&&CamRig.follow===4,'camera rotation still works while tracking');
 Input.btn('C');await wait(150);ok(CamRig.follow===null&&Input.ui.trk.style.display==='none','recenter button returns to normal player-follow');
 Sim.npcs[4].vis=true;Input.key(true,'t');Input.key(false,'t');await wait(120);ok(CamRig.follow!==null,`T key tracks the nearest NPC (#${CamRig.follow})`);Input.key(true,'t');Input.key(false,'t');await wait(120);ok(CamRig.follow===null,'T again returns to player-follow');
 // 6) player still cannot walk through a building (real loop, held key)
 CamRig.follow=null;CamRig.gy=CamRig.yaw=0;Sim.player.x=24;Sim.player.z=9;Input.key(true,'w');await wait(300);Input.key(false,'w');
 ok(Sim.player.z>3.3,`holding W toward Oak & Iron stops at the wall (z=${Sim.player.z.toFixed(2)} ≥ wall at 3)`);
 console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);})();
