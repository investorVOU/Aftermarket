// The map selects destinations. It never sends movement, teleports a player,
// or borrows the world canvas's pointer stream.
export function setupNavigation({document,window,Sim,Input,CamRig,Phone,Net,Bus,toast}) {
  const $=id=>document.getElementById(id);
  const panel=$('am-map-panel'),canvas=$('am-map');
  const bounds={x:-105,z:-80,width:220,height:135};
  const places=[['Forest',-30,-17],['Timber Supply',-24,9],['Oak & Iron',24,7],['Trading Post',8,9],['Greenfield Farm',21,-36],['Gold mine',46,-30]];
  let waypoint=null,pressed=null;
  const camera=$('am-camera-more'),mission=$('am-mission');
  // Preferences are presentation only. Storage denial must never block entry.
  try{mission.open=window.localStorage.getItem('aftermarket-mission-collapsed')!=='true';}catch{/* Keep the first-visit guide open. */}
  function missionState(){
    $('am-mission-toggle').setAttribute('aria-expanded',String(mission.open));
    $('am-mission-toggle').setAttribute('aria-label',mission.open?'Collapse your next move':'Expand your next move');
    try{window.localStorage.setItem('aftermarket-mission-collapsed',String(!mission.open));}catch{/* Session-only preference. */}
  }
  missionState();mission.addEventListener('toggle',missionState);
  function releaseInput(){Input.reset();Net.movement={x:0,z:0};}
  function setMap(open,{focus=true}={}) {
    panel.hidden=!open;
    document.body.classList.toggle('map-open',open);
    pressed=null;releaseInput();
    if(open){camera.open=false;Phone.minimize();$('am-market').hidden=true;document.body.classList.remove('market-open');draw();if(focus)$('am-close-map').focus();}
    else if(focus&&panel.contains(document.activeElement))Phone.launcher?.focus?.();
  }
  function select(x,z,label='Custom destination') {
    if(!Number.isFinite(x)||!Number.isFinite(z)||Sim.Geo.dShore(x,z)<=0){toast('Choose a destination on the island.');return false;}
    waypoint=[x,z];$('am-map-destination').textContent=label;
    $('am-clear-waypoint').disabled=false;draw();
    toast('Destination marked on your island map.');return true;
  }
  function draw(){
    if(panel.hidden)return;
    const ctx=canvas.getContext('2d');if(!ctx)return;
    const W=canvas.width,H=canvas.height,toMap=(x,z)=>[(x-bounds.x)/bounds.width*W,(z-bounds.z)/bounds.height*H];
    ctx.fillStyle='#153440';ctx.fillRect(0,0,W,H);ctx.fillStyle='#78876b';
    for(let x=-105;x<115;x+=2)for(let z=-80;z<55;z+=2)if(Sim.Geo.dShore(x,z)>0){const [a,b]=toMap(x,z);ctx.fillRect(a,b,W/bounds.width*2.1,H/bounds.height*2.1);}
    ctx.strokeStyle='#cbbf9f';ctx.lineWidth=3;
    for(const road of Sim.Roads.defs){ctx.beginPath();road.cl.forEach(([x,z],i)=>{const [a,b]=toMap(x,z);i?ctx.lineTo(a,b):ctx.moveTo(a,b);});ctx.stroke();}
    ctx.font='600 17px system-ui';
    for(const [label,x,z]of places){const [a,b]=toMap(x,z);ctx.fillStyle='#f5eddb';ctx.fillRect(a-5,b-5,10,10);ctx.strokeStyle='#263b32';ctx.lineWidth=4;ctx.strokeText(label,a+11,b-9);ctx.fillText(label,a+11,b-9);}
    if(waypoint){const [x,z]=toMap(...waypoint),[px,pz]=toMap(Sim.player.x,Sim.player.z);ctx.strokeStyle='#f5ca7e';ctx.lineWidth=3;ctx.setLineDash([8,7]);ctx.beginPath();ctx.moveTo(px,pz);ctx.lineTo(x,z);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.arc(x,z,12,0,Math.PI*2);ctx.stroke();}
    const [x,z]=toMap(Sim.player.x,Sim.player.z);ctx.fillStyle='#f6c67b';ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,z,7,0,Math.PI*2);ctx.fill();ctx.stroke();
    $('am-map-distance').textContent=waypoint?`${Math.round(Math.hypot(waypoint[0]-Sim.player.x,waypoint[1]-Sim.player.z))} m away`:'Tap the map or choose a landmark';
  }
  $('am-close-map').addEventListener('click',()=>setMap(false));
  $('am-clear-waypoint').addEventListener('click',()=>{waypoint=null;$('am-map-destination').textContent='Explore the island';$('am-clear-waypoint').disabled=true;draw();});
  for(const [label,x,z]of places){const button=document.createElement('button');button.type='button';button.textContent=label;button.addEventListener('click',()=>select(x,z,label));$('am-landmarks').appendChild(button);}
  canvas.addEventListener('pointerdown',event=>{if(event.button!==0&&event.button!==undefined)return;pressed={id:event.pointerId,x:event.clientX,y:event.clientY};canvas.setPointerCapture?.(event.pointerId);});
  canvas.addEventListener('pointerup',event=>{
    const start=pressed;pressed=null;
    if(!start||start.id!==event.pointerId||Math.hypot(event.clientX-start.x,event.clientY-start.y)>8)return;
    const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
    const u=(event.clientX-rect.left)/rect.width,v=(event.clientY-rect.top)/rect.height;
    if(u<0||u>1||v<0||v>1)return;
    const x=bounds.x+u*bounds.width,z=bounds.z+v*bounds.height;
    const landmark=places.find(([,px,pz])=>Math.hypot(px-x,pz-z)<7);
    if(landmark)select(landmark[1],landmark[2],landmark[0]);else select(x,z);
  });
  for(const type of ['pointercancel','lostpointercapture'])canvas.addEventListener(type,()=>{pressed=null;});
  canvas.addEventListener('wheel',event=>event.preventDefault(),{passive:false});
  // These are click handlers so keyboard, touch and mouse receive the same action.
  const controls={'am-zoom-in':()=>CamRig.adjust({zoom:-.16}),'am-zoom-out':()=>CamRig.adjust({zoom:.16}),'am-camera-reset':()=>CamRig.reset(),'am-orbit-left':()=>CamRig.adjust({yaw:-Math.PI/8}),'am-orbit-right':()=>CamRig.adjust({yaw:Math.PI/8}),'am-tilt-up':()=>CamRig.adjust({pitch:.12}),'am-tilt-down':()=>CamRig.adjust({pitch:-.12})};
  for(const [id,act]of Object.entries(controls))$(id).addEventListener('click',act);
  for(const element of [panel,$('am-camera'),mission]){
    element.addEventListener('pointerdown',event=>{releaseInput();event.stopPropagation();});
    element.addEventListener('keydown',event=>{if(event.key!=='Escape'&&event.key.toLowerCase()!=='m')event.stopPropagation();});
  }
  window.addEventListener('pointerdown',event=>{if(camera.open&&!$('am-camera').contains(event.target))camera.open=false;});
  window.addEventListener('keydown',event=>{
    if(event.target?.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(event.target?.tagName))return;
    if(event.key.toLowerCase()==='m'&&!event.repeat){event.preventDefault();event.stopImmediatePropagation();setMap(panel.hidden);}
    else if(event.key==='Escape'&&!panel.hidden){event.preventDefault();event.stopImmediatePropagation();setMap(false);}
    else if(event.key==='Escape'&&$('am-camera-more').open){event.preventDefault();event.stopImmediatePropagation();$('am-camera-more').open=false;}
  },true);
  Bus.on('phone:open',()=>{setMap(false,{focus:false});$('am-camera-more').open=false;});
  Bus.on('map:open',()=>setMap(true));
  Bus.on('talk:open',()=>setMap(false,{focus:false}));
  window.addEventListener('blur',()=>{pressed=null;releaseInput();});
  return {draw,setMap,setWaypoint:(x,z,label)=>{setMap(true);select(x,z,label);}};
}
