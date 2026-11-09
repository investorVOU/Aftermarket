const H=require('./harness.js');const {load,rand}=H;let pass=0,fail=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);c?pass++:fail++;};const near=(a,b,e=1e-6)=>Math.abs(a-b)<e;
let W=load(11);let {Sim,Input,CamRig,tY,Eco}=W;const K=Input.K,I=Input.I;
const kd=(k)=>Input.key(true,k,null,false),ku=k=>Input.key(false,k,null,false),fr=(dt=.016)=>Input.frame(dt);
const clr=()=>{for(const k in K)K[k]=0;Input.joy.id=null;Input.joy.x=Input.joy.y=0;Input.P.clear();fr();fr();};
// ---------- desktop keyboard
kd('w');fr();ok(near(I.mz,-1)&&near(I.mx,0),'W → forward intent (0,-1)');clr();
kd('s');fr();ok(near(I.mz,1),'S → backward');clr();kd('a');fr();ok(near(I.mx,-1),'A → left');clr();kd('d');fr();ok(near(I.mx,1),'D → right');clr();
Input.key(true,'ArrowUp');fr();const au=I.mz;clr();kd('w');fr();ok(near(au,I.mz)&&au===-1,'ArrowUp gives the same intent as W');clr();
Input.key(true,'ArrowLeft');fr();ok(near(I.mx,-1),'ArrowLeft → left');clr();Input.key(true,'ArrowRight');Input.key(true,'ArrowDown');fr();ok(I.mx>.7&&I.mz>.7&&near(Math.hypot(I.mx,I.mz),1),'arrow diagonal normalised to length 1');clr();
kd('w');kd('d');fr();ok(near(Math.hypot(I.mx,I.mz),1)&&I.mx>0&&I.mz<0,'W+D diagonal has length 1 (no faster diagonal)');ku('w');ku('d');fr();ok(I.mx===0&&I.mz===0,'keys released → neutral');
kd('q');fr(.1);ok(near(I.yaw,-.18),'Q rotates camera left at 1.8 rad/s');ku('q');kd('e');fr(.1);ok(near(I.yaw,.18),'E rotates camera right');ku('e');
kd('=');fr(.1);ok(I.zoom<0,'+ zooms in');ku('=');kd('-');fr(.1);ok(I.zoom>0,'− zooms out');ku('-');
ok(Input.key(true,'w',{tagName:'INPUT'})===false&&!K.w,'typing in a text field is never intercepted');clr();
kd('f');fr();ok(I.act1===1,'F → interact');fr();ok(I.act1===0,'interact is a one-shot (not repeated)');kd('g');fr();ok(I.act2===1,'G → secondary');kd('c');fr();ok(I.recenter===1,'C → recenter');kd('t');fr();ok(I.track===1,'T → track');kd('Escape');fr();ok(I.cancel===1,'Esc → cancel');clr();
// ---------- mouse
const md=(id,x,y,btn=0,shift=false)=>Input.ptr('down',{id,x,y,type:'mouse',btn,shift}),mm=(id,x,y)=>Input.ptr('move',{id,x,y}),mu=(id,x,y)=>Input.ptr('up',{id,x,y});
md(1,300,300);mm(1,340,310);fr();ok(I.yaw<0&&I.pitch>0,`left-drag orbits camera (yaw ${I.yaw.toFixed(3)}, pitch ${I.pitch.toFixed(3)})`);mu(1,340,310);fr();
md(2,300,300,0,true);mm(2,340,300);fr();ok(I.yaw===0&&I.panx!==0,'Shift+drag pans instead of rotating');mu(2,340,300);fr();
md(3,300,300,1);mm(3,300,340);fr();ok(I.panz!==0&&I.yaw===0,'middle-drag pans');mu(3,300,340);fr();
md(4,300,300,2);mm(4,330,300);fr();ok(I.yaw<0,'right-drag orbits');mu(4,330,300);fr();
Input.wheel(100);fr();ok(near(I.zoom,.08),'wheel down zooms out');Input.wheel(-100);fr();ok(near(I.zoom,-.08),'wheel up zooms in');
md(5,500,400);mu(5,502,401);fr();ok(I.pick&&I.pick.x===502,'mouse click (no drag) produces a pick');md(6,500,400);mm(6,560,400);mu(6,560,400);fr();ok(I.pick===null,'a drag does not produce a pick');
// ---------- touch: joystick, camera, simultaneity
Input.joy.cx=100;Input.joy.cy=600;Input.joy.R=60;
Input.joyDown(21,100,600);fr();ok(I.mx===0&&I.mz===0,'joystick at centre → neutral');
Input.joyMove(21,160,600);fr();ok(near(I.mx,1,.01)&&near(I.mz,0,.01),'joystick full right → (1,0)');
Input.joyMove(21,100+40,600-40);fr();ok(I.mx>.3&&I.mz<-.3&&Math.hypot(I.mx,I.mz)<=1.0001,`joystick diagonal up-right → (${I.mx.toFixed(2)},${I.mz.toFixed(2)})`);
Input.joyMove(21,300,600);fr();ok(near(Math.hypot(I.mx,I.mz),1,.001),'dragging far outside is clamped to length 1');
Input.joyMove(21,104,600);fr();ok(I.mx===0&&I.mz===0,'inside dead-zone → neutral');
Input.joyMove(21,100,560);fr();const half=-I.mz;ok(half>0&&half<1,`partial push gives analog speed (${half.toFixed(2)})`);
Input.joyDown(22,100,600);Input.joyMove(22,160,600);ok(Input.joy.id===21,'a second finger on the joystick is ignored');
// camera finger while joystick held
Input.ptr('down',{id:30,x:700,y:300,type:'touch'});Input.ptr('move',{id:30,x:760,y:300});Input.joyMove(21,100,560);fr();
ok(I.mz<0&&I.yaw<0,`simultaneous joystick (${I.mz.toFixed(2)}) and camera drag (yaw ${I.yaw.toFixed(3)}) in the same frame`);
Input.ptr('up',{id:30,x:760,y:300});Input.joyUp(21);fr();ok(I.mx===0&&I.mz===0&&Input.joy.id===null,'joystick released → returns to neutral');
Input.sens=1;Input.ptr('down',{id:31,x:400,y:300,type:'touch'});Input.ptr('move',{id:31,x:450,y:300});fr();const y1=I.yaw;Input.ptr('up',{id:31,x:450,y:300});
Input.sens=2;Input.ptr('down',{id:32,x:400,y:300,type:'touch'});Input.ptr('move',{id:32,x:450,y:300});fr();const y2=I.yaw;Input.ptr('up',{id:32,x:450,y:300});Input.sens=1;
ok(y1<0&&near(y2/y1,2,.01),`touch camera drag rotates; sensitivity ×2 doubles it (${y1.toFixed(3)} → ${y2.toFixed(3)})`);
// pinch + two-finger pan
Input.ptr('down',{id:40,x:300,y:300,type:'touch'});Input.ptr('down',{id:41,x:400,y:300,type:'touch'});Input.ptr('move',{id:41,x:500,y:300});fr();ok(I.zoom<0,'pinch out zooms in');
Input.ptr('move',{id:41,x:420,y:300});fr();ok(I.zoom>0,'pinch in zooms out');Input.ptr('move',{id:40,x:340,y:340});Input.ptr('move',{id:41,x:460,y:340});fr();ok(I.panz!==0,'two-finger drag pans');
Input.ptr('up',{id:40,x:340,y:340});Input.ptr('up',{id:41,x:460,y:340});fr();ok(I.pick===null,'ending a two-finger gesture does not trigger a tap-pick');
Input.ptr('down',{id:42,x:333,y:222,type:'touch'});Input.ptr('up',{id:42,x:334,y:223});fr();ok(I.pick&&I.pick.x===334,'tap on the view produces a pick');
// buttons, mode, layout
Input.btn('F');fr();ok(I.act1===1,'on-screen interact button → same intent as F');Input.btn('G');fr();ok(I.act2===1,'on-screen G button');Input.btn('C');fr();ok(I.recenter===1,'on-screen recenter button');
Input.ptr('down',{id:50,x:10,y:10,type:'touch'});Input.ptr('up',{id:50,x:10,y:10});ok(Input.mode==='touch'&&H.body.classList.contains('touch'),'touch input switches to touch layout');kd('w');ok(Input.mode==='desktop'&&!H.body.classList.contains('touch'),'keyboard switches back to desktop layout');clr();
const C=Input.classes;const eq=(a,b)=>a.slice().sort().join()===b.slice().sort().join();
ok(eq(C(390,844,true),['touch','compact','portrait']),'phone portrait → touch+compact+portrait');ok(eq(C(844,390,true),['touch','compact','landscape']),'phone landscape → touch+compact+landscape');
ok(eq(C(820,1180,true),['touch','tablet','portrait']),'tablet portrait → touch+tablet+portrait');ok(eq(C(1180,820,true),['touch','tablet','landscape']),'tablet landscape');ok(eq(C(1920,1080,false),['landscape']),'desktop → landscape only');
Input.setMode('touch');Input.layout(844,390);const L1=[...H.body.classList._s].sort().join();Input.layout(390,844);const L2=[...H.body.classList._s].sort().join();ok(L1.includes('landscape')&&L2.includes('portrait')&&!L2.includes('landscape'),`orientation change re-lays-out (${L1} → ${L2})`);Input.setMode('desktop');
// ---------- camera rig
CamRig.input({yaw:0,pitch:50,zoom:0,panx:0,panz:0},.016);ok(CamRig.gp===CamRig.PMAX,'pitch clamped at upper limit');CamRig.input({yaw:0,pitch:-50,zoom:0,panx:0,panz:0},.016);ok(CamRig.gp===CamRig.PMIN,'pitch clamped at lower limit');
CamRig.input({yaw:0,pitch:0,zoom:-50,panx:0,panz:0},.016);ok(CamRig.gz===CamRig.ZMIN,'zoom-in limit');CamRig.input({yaw:0,pitch:0,zoom:50,panx:0,panz:0},.016);ok(CamRig.gz===CamRig.ZMAX,'zoom-out limit');
for(let i=0;i<50;i++)CamRig.input({yaw:0,pitch:0,zoom:0,panx:5,panz:5},.016);ok(Math.hypot(CamRig.gpx,CamRig.gpz)<=CamRig.PAN+1e-9,`pan limited to ${CamRig.PAN} m (now ${Math.hypot(CamRig.gpx,CamRig.gpz).toFixed(1)})`);
CamRig.recenter();ok(CamRig.gpx===0&&CamRig.gpz===0&&CamRig.follow===null,'recenter returns the camera to following the player');
// smoothness while walking and rotating
W=load(12);({Sim,Input,CamRig,tY}=W);CamRig.gy=CamRig.yaw=0;CamRig.gp=CamRig.pitch=.69;CamRig.gz=CamRig.zoom=1;CamRig.init=0;let mxd=0,mxl=0,px_=null,nan=0,pull=0,sn0=0,pulls=0;const P=Sim.player;
P.x=-22;P.z=24;for(let i=0;i<900;i++){P.move(Math.cos(i*.01)*.1,Math.sin(i*.007)*.04);CamRig.input({yaw:i%300<150?.012:-.012,pitch:0,zoom:0,panx:0,panz:0},.016);sn0=CamRig.snaps;const oc0=CamRig.occ;CamRig.update(.016,P.x,P.z);const pulling=CamRig.occ<oc0-1e-6;if(px_){const st=Math.hypot(CamRig.x-px_[0],CamRig.y-px_[1],CamRig.z-px_[2]);if(CamRig.snaps>sn0||pulling){pull=Math.max(pull,st);pulls++;}else mxd=Math.max(mxd,st);mxl=Math.max(mxl,Math.hypot(CamRig.lx-px_[3],CamRig.lz-px_[4]));}px_=[CamRig.x,CamRig.y,CamRig.z,CamRig.lx,CamRig.lz];if([CamRig.x,CamRig.y,CamRig.z].some(v=>!isFinite(v)))nan++;}
ok(nan===0&&mxd<1.2&&mxl<.4,`camera smooth while walking+rotating: max step ${mxd.toFixed(2)} m/frame, look ${mxl.toFixed(2)} m/frame, no NaN; ${pulls} eased pull-in frame(s) when a building came between player and camera (largest ${pull.toFixed(1)} m/frame), ${CamRig.snaps} hard clamp(s)`);
// terrain + building clearance (random property test over the whole island)
let tv=0,bv=0,occ=0,total=0;const bigs=Sim.Col.list.filter(c=>c.k==='b'&&c.type==='building'&&c.hx*c.hz>6);
for(let i=0;i<4000;i++){const x=-80+rand()*170,z=-65+rand()*110;if(!Sim.Col.free(x,z,.4,'player'))continue;total++;CamRig.init=0;CamRig.gy=CamRig.yaw=rand()*6.283;CamRig.gp=CamRig.pitch=CamRig.PMIN+rand()*(CamRig.PMAX-CamRig.PMIN);CamRig.gz=CamRig.zoom=CamRig.ZMIN+rand()*(CamRig.ZMAX-CamRig.ZMIN);CamRig.occ=1;CamRig.gpx=CamRig.px=rand()*20-10;CamRig.gpz=CamRig.pz=rand()*20-10;
 for(let k=0;k<4;k++)CamRig.update(.016,x,z);if(CamRig.y<tY(CamRig.x,CamRig.z)+1.2)tv++;if(CamRig.occ<.99)occ++;
 for(const c of bigs)if(Math.abs(CamRig.x-c.x)<c.hx&&Math.abs(CamRig.z-c.z)<c.hz&&CamRig.y<7.2){bv++;break;}}
ok(tv===0,`camera never below terrain over ${total} random poses (${tv} violations)`);ok(bv===0,`camera never inside a large building over ${total} random poses (${bv} violations; building-avoidance engaged in ${occ})`);
// deliberate occlusion case: player just south of Timber Supply, camera swung to the north side
CamRig.init=0;CamRig.gy=CamRig.yaw=Math.PI;CamRig.gp=CamRig.pitch=.35;CamRig.gz=CamRig.zoom=1.2;CamRig.occ=1;CamRig.gpx=CamRig.px=0;CamRig.gpz=CamRig.pz=0;for(let k=0;k<30;k++)CamRig.update(.016,-24,9);
ok(CamRig.occ<.9&&!bigs.some(c=>Math.abs(CamRig.x-c.x)<c.hx&&Math.abs(CamRig.z-c.z)<c.hz&&CamRig.y<7.2),`camera pulled in (${(CamRig.occ*100).toFixed(0)} % of distance) instead of clipping through the warehouse`);
// world sanity: big buildings must not overlap each other
{const B=Sim.Col.list.filter(c=>c.k==='b'&&c.type==='building'&&c.hx*c.hz>6);let ov=[];for(let i=0;i<B.length;i++)for(let j=i+1;j<B.length;j++){const a=B[i],b=B[j];if(Math.abs(a.x-b.x)<a.hx+b.hx-.05&&Math.abs(a.z-b.z)<a.hz+b.hz-.05)ov.push([a.x.toFixed(0),a.z.toFixed(0),b.x.toFixed(0),b.z.toFixed(0)].join(','));}ok(ov.length===0,`no two large buildings overlap (${B.length} checked${ov.length?'; overlaps at '+ov.join(' | '):''})`);}
// ---------- NPC tracking
W=load(13);({Sim,Input,CamRig,tY}=W);const S2=Sim;S2.npcs.forEach(n=>{n.vis=true;});
S2.update(.1);for(let t=0;t<300;t+=.1)S2.update(.1);
const vis=S2.npcs.findIndex(n=>n.vis&&n.v>.1);const idx=vis>=0?vis:0;CamRig.track(idx);let lag=0;for(let i=0;i<300;i++){S2.update(.016);CamRig.update(.016,S2.npcs[idx].x,S2.npcs[idx].z);}lag=Math.hypot(CamRig.lx-S2.npcs[idx].x,CamRig.lz-S2.npcs[idx].z);
ok(CamRig.follow===idx&&lag<1.6,`camera follows NPC #${idx} (${S2.npcs[idx].role}); look-point lag ${lag.toFixed(2)} m while it walks`);
const y0=CamRig.gy,z0=CamRig.gz;CamRig.input({yaw:.5,pitch:0,zoom:-.2,panx:0,panz:0},.016);ok(CamRig.follow===idx&&CamRig.gy!==y0&&CamRig.gz!==z0,'rotate/zoom still work while tracking');
CamRig.recenter();for(let i=0;i<400;i++){CamRig.update(.016,S2.player.x,S2.player.z);}ok(CamRig.follow===null&&Math.hypot(CamRig.lx-S2.player.x,CamRig.lz-S2.player.z)<.3,'recenter returns to player-follow and the camera converges on the player');
// picking
const P2=S2.player;CamRig.recenter();CamRig.init=0;CamRig.gy=CamRig.yaw=.4;CamRig.gp=CamRig.pitch=.69;CamRig.gz=CamRig.zoom=1;P2.x=0;P2.z=4;for(let k=0;k<20;k++)CamRig.update(.016,0,4);
let okp=0,tot=0;S2.npcs.forEach((n,i)=>{n.vis=false;});[[6,2],[-8,5],[3,-9],[-5,-4]].forEach((p,j)=>{const n=S2.npcs[j];n.vis=true;n.x=p[0];n.z=p[1];});
for(let j=0;j<4;j++){const n=S2.npcs[j],pr=CamRig.project(n.x,tY(n.x,n.z)+1,n.z,1200,800);tot++;if(pr&&pr.x>0&&pr.x<1200&&pr.y>0&&pr.y<800&&CamRig.pick(pr.x+3,pr.y-4,1200,800)===j)okp++;}
ok(okp===tot,`screen-space tap picks the correct NPC (${okp}/${tot} test NPCs)`);ok(CamRig.pick(5,5,1200,800)===null,'tapping empty space picks nothing');
P2.x=0;P2.z=4;CamRig.trackNearest(0,4);ok(CamRig.follow!==null,'T tracks the nearest visible NPC');CamRig.trackNearest(0,4);ok(CamRig.follow===null,'T again releases tracking');
// ---------- performance + listeners
W=load(14);({Sim,Input,CamRig,tY}=W);let t0=process.hrtime.bigint();for(let i=0;i<20000;i++){Input.frame(.016);}let ti=Number(process.hrtime.bigint()-t0)/20000/1e3;
t0=process.hrtime.bigint();for(let i=0;i<5000;i++)CamRig.update(.016,10+Math.sin(i*.01)*20,5);let tc=Number(process.hrtime.bigint()-t0)/5000/1e3;
ok(ti<20&&tc<400,`Input.frame ${ti.toFixed(1)} µs, CamRig.update ${tc.toFixed(0)} µs per frame (node timing; phone will be slower)`);
console.log(`   event listeners: ${H.listeners.n} element + ${H.winListeners()} window; pointer/key handlers are shared (no per-frame listeners); HUD DOM writes throttled to 5 Hz and only on change`);
console.log(`\n${pass} passed, ${fail} failed`);
