const H=require('./harness.js');let pass=0,fail=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);c?pass++:fail++;};
H.maxFrames=1e9;const W=H.load(515,true);const {Sim,Eco,Input,CamRig,Dlg}=W;const T=Sim.Talk;const wait=ms=>new Promise(r=>setTimeout(r,ms));
const key=async(k,ms=110)=>{Input.key(true,k);await wait(ms);Input.key(false,k);await wait(40);};
const only=(id,x,z)=>{Sim.npcs.forEach(n=>{n.vis=false;});const n=Sim.npcs[id];n.vis=true;n.x=x;n.z=z;n.wait=9999;n.dest=null;n.phase='work';n.talking=false;return n;};
const body=H.body.classList;
(async()=>{await wait(350);
 // ---- 1) in range: name + occupation shown, F opens the dialogue
 Sim.player.x=0;Sim.player.z=0;const n4=only(4,2,1);await wait(150);
 const near=W.getNear();ok(near&&near.npc===4&&/Chidi Okafor · Timber yard employee/.test(near.n()),`in range: prompt shows "${near&&near.n()}"`);
 ok(Input.ui.bF.style.display==='flex'&&Input.ui.bF.textContent==='Talk to Chidi','touch interact button reads the short label "'+Input.ui.bF.textContent+'"');
 await key('f');ok(T.cur&&T.cur.id===4&&Dlg.state().visible&&Dlg.state().name==='Chidi Okafor','F opens the dialogue panel for the nearby NPC');
 ok(Dlg.state().options.length>=6&&/Goodbye/.test(Dlg.state().options.slice(-1)[0]),`panel shows greeting + ${Dlg.state().options.length} options incl. Goodbye`);
 ok(body.contains('talking'),'body gets the "talking" class (hides joystick/action buttons on touch)');
 // ---- 2) choosing options (number keys) works; F is ignored while open
 const t0=T.cur.text;await key('2');ok(T.cur.topic&&T.cur.topic!=='greet'&&T.cur.text!==t0,`number key 2 chose "${T.cur.topic}" → "${T.cur.text.slice(0,50)}…"`);
 const cnt=n4.talk.count;await key('f');ok(n4.talk.count===cnt&&T.cur.id===4,'pressing F again while talking does nothing');
 // NPC holds still and faces player
 const px=n4.x;await wait(150);ok(n4.x===px&&n4.talking,'NPC stays put while talking');
 // ---- 3) Esc closes, gameplay restored
 await key('Escape');ok(T.cur===null&&!Dlg.state().visible&&!body.contains('talking')&&!n4.talking,'Esc closes the dialogue and clears the talking state');
 const z0=Sim.player.z,moveStart=Sim.time;await key('w',250);ok(Math.abs(Sim.player.z-z0)>Math.max(.5,4*(Sim.time-moveStart)),'movement works right after closing');
 const yaw0=CamRig.gy;await key('e',120);ok(CamRig.gy>yaw0,'camera rotation works right after closing');
 // ---- 4) out of range: no prompt, no conversation
 Sim.player.x=0;Sim.player.z=0;only(4,9,0);await wait(150);ok(!(W.getNear()&&W.getNear().npc===4)&&!/Talk/.test(Input.ui.bF.textContent),'NPC 9 m away: no Talk prompt or button');
 await key('f');ok(T.cur===null,'F does nothing out of range');
 // ---- 5) selecting (tap) ≠ talking; Talk button; second tap talks
 Sim.player.x=0;Sim.player.z=0;only(4,4.5,2);CamRig.recenter();CamRig.gy=CamRig.yaw=.3;await wait(200);
 const n=Sim.npcs[4],pr=CamRig.project(n.x,W.tY(n.x,n.z)+1,n.z,1200,800);Input.ptr('down',{id:70,x:pr.x,y:pr.y,type:'touch'});Input.ptr('up',{id:70,x:pr.x,y:pr.y});await wait(150);
 ok(CamRig.follow===4&&T.cur===null,'tapping an NPC selects it for camera tracking and does NOT start a conversation');
 ok(/Following: Chidi Okafor · Timber yard employee/.test(Input.ui.tl.textContent)&&Input.ui.trk.style.display==='block','selection card shows name, occupation and current activity: "'+Input.ui.tl.textContent+'"');
 ok(Input.ui.bT.style.display==='none'&&Input.ui.hint.style.display==='inline','out of talking range (4.9 m): card shows "walk closer", no Talk button');Input.btn('T');await wait(120);ok(T.cur===null,'Talk button press is refused while out of range');
 Sim.player.x=2.4;Sim.player.z=1;await wait(150);ok(Input.ui.bT.style.display==='inline-block','after walking closer the card offers a Talk button');
 const fol=CamRig.follow;Input.btn('T');await wait(150);ok(T.cur&&T.cur.id===4&&CamRig.follow===fol,'Talk button opens the dialogue without changing camera tracking');
 await key('Escape');ok(T.cur===null&&CamRig.follow===fol,'closing the dialogue leaves tracking untouched');
 Input.ptr('down',{id:71,x:pr.x,y:pr.y,type:'touch'});Input.ptr('up',{id:71,x:pr.x,y:pr.y});await wait(150);
 const pr2=CamRig.project(n.x,W.tY(n.x,n.z)+1,n.z,1200,800);Input.ptr('down',{id:72,x:pr2.x,y:pr2.y,type:'touch'});Input.ptr('up',{id:72,x:pr2.x,y:pr2.y});await wait(150);
 ok(T.cur&&T.cur.id===4,'tapping the already-selected, in-range NPC again starts the conversation');
 // ---- 6) walking away: dialogue closes, tracking continues; player can move freely
 Input.key(true,'w');for(let attempts=0;attempts<50&&T.cur;attempts++)await wait(50);Input.key(false,'w');await wait(40);ok(T.cur===null&&CamRig.follow===4,'walking out of range closes the dialogue; the camera keeps following the NPC');
 Input.btn('C');await wait(120);ok(CamRig.follow===null&&Input.ui.trk.style.display==='none','✕/recenter stops following');
 // ---- 7) touch mode: joystick is released and hidden during dialogue
 Sim.player.x=0;Sim.player.z=0;only(10,1.5,.5);await wait(150);Input.setMode('touch');Input.joy.cx=100;Input.joy.cy=600;Input.joy.R=60;Input.joyDown(5,100,600);Input.joyMove(5,160,600);
 Input.btn('F');await wait(150);ok(T.cur&&T.cur.id===10&&Input.joy.id===null&&Input.joy.x===0&&body.contains('talking')&&body.contains('touch'),'touch: opening a conversation releases the joystick and applies the talking layout');
 // ---- 8) consequence through the UI path: buy timber from the Timber Supply owner
 Eco.player.cash=5000;Eco.ts.inv.timber=12;const idx=T.cur.options.findIndex(o=>o.id==='a_buy');const c0=Eco.player.cash,t0b=Eco.player.inv.timber,s0=Eco.ts.inv.timber,trades0=Eco.transactions.filter(t=>t.buyer===Eco.player.name&&t.seller===Eco.ts.name).length;await key(String(idx+1));
 ok(Eco.player.inv.timber===t0b+1&&Eco.player.cash===c0-Eco.ts.price&&Eco.transactions.filter(t=>t.buyer===Eco.player.name&&t.seller===Eco.ts.name).length===trades0+1,`choosing "${T.cur.options[idx]&&T.cur.options[idx].label}" via number key changes the economy exactly once`);
 await key('Escape');Input.setMode('desktop');
 // ---- 9) NPC near a shop spot: Talk on F, original spot action on G
 Sim.player.x=-24;Sim.player.z=9.4;only(5,-23,11);await wait(150);const nr=W.getNear();ok(nr&&nr.npc===5&&typeof nr.G==='function'&&/Buy timber/.test(nr.g()),`near a shop spot with an NPC: F = "${nr&&nr.n()}", G = "${nr&&nr.g&&nr.g()}" (nothing lost)`);
 Eco.player.cash=5000;Eco.player.inv.timber=0;await key('g');ok(Eco.player.inv.timber===1&&Eco.player.cash===5000-Eco.ts.price,'G still performs the shop action (buys 1 timber) when an NPC is also in range');
 console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);})();
