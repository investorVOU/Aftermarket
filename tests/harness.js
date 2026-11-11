const fs=require('fs');const src=fs.readFileSync(process.env.AMFILE||require('path').join(__dirname,'..','game','aftermarket.html'),'utf8');
let js=src.split('<script>')[1].split('</script>')[0]+`
return {Sim,Eco,HOMES,Bus,syncView,npcViews,Input,CamRig,Phone,tY,getNear:()=>near,Phone,FV:(typeof FV!=='undefined'?FV:null),npcLook,Dlg,getUI:()=>UI,getHarvest:()=>harvest,carryMeshes:(typeof carryMeshes!=='undefined'?carryMeshes:null),getWorld:()=>({version:1,seed:12345,homes:HOMES.map(({occ,...h})=>({...h,occ:[]})),farmHomes:FARMHOMES.map(({occ,...h})=>({...h,occ:[]})),spec:SPEC,ev:EVP,anch:Sim.truck.anch,roads:Sim.Roads.defs,colliders:Sim.Col.list.map(({_s,...c})=>c),nodes:nodes.map(({g,...n},id)=>({...n,id}))})};`;
let sd=12345;const rand=()=>(sd=(sd*1664525+1013904223)%4294967296)/4294967296;
exports.load=(seed=12345,runLoop=false)=>{sd=seed;Math.random=rand;
 const mk=()=>new Proxy(function(){},{get:(t,k)=>k==='then'?undefined:(k===Symbol.toPrimitive?()=>0:mk()),apply:()=>mk(),construct:()=>mk(),set:()=>true});
 class V3{setScalar(s){return this.set(s,s,s);}constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}copy(v){return this.set(v.x,v.y,v.z);}lerp(v,t){return this.set(this.x+(v.x-this.x)*t,this.y+(v.y-this.y)*t,this.z+(v.z-this.z)*t);}}
 class CR{constructor(p){this.p=p;this.len=null;}
  getPoint(t){const p=this.p,l=p.length;let pt=(l-1)*t,i=Math.floor(pt),w=pt-i;if(w===0&&i===l-1){i=l-2;w=1;}
   const P1=p[i],P2=p[i+1],P0=i===0?{x:2*P1.x-P2.x,z:2*P1.z-P2.z}:p[i-1],P3=i+2<l?p[i+2]:{x:2*P2.x-P1.x,z:2*P2.z-P1.z};
   const d=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);let d0=Math.sqrt(d(P0,P1)),d1=Math.sqrt(d(P1,P2)),d2=Math.sqrt(d(P2,P3));if(d1<1e-4)d1=1;if(d0<1e-4)d0=d1;if(d2<1e-4)d2=d1;
   const f=k=>{const t1=((P1[k]-P0[k])/d0-(P2[k]-P0[k])/(d0+d1)+(P2[k]-P1[k])/d1)*d1,t2=((P2[k]-P1[k])/d1-(P3[k]-P1[k])/(d1+d2)+(P3[k]-P2[k])/d2)*d1;return P1[k]+t1*w+(-3*P1[k]+3*P2[k]-2*t1-t2)*w*w+(2*P1[k]-2*P2[k]+t1+t2)*w*w*w;};
   return new V3(f('x'),0,f('z'));}
  getLength(){if(this.len===null){let L=0,a=this.getPoint(0);for(let i=1;i<=200;i++){const b=this.getPoint(i/200);L+=Math.hypot(b.x-a.x,b.z-a.z);a=b;}this.len=L;}return this.len;}
  getTangent(t){const a=this.getPoint(Math.max(0,t-.001)),b=this.getPoint(Math.min(1,t+.001)),L=Math.hypot(b.x-a.x,b.z-a.z)||1;return new V3((b.x-a.x)/L,0,(b.z-a.z)/L);}}
 class Obj{constructor(g,m){this.geometry=g;this.material=m||{color:{setHex(){}}};this.position=new V3();this.rotation=new V3();this.scale=new V3(1,1,1);this.children=[];this.userData={};this.visible=true;this.parent=null;this.matrix={};}updateMatrix(){}updateMatrixWorld(){}lookAt(){}add(...c){c.forEach(x=>{this.children.push(x);x.parent=this;});return this;}}
 const THREE=new Proxy({},{get:(t,k)=>k==='Group'||k==='Mesh'||k==='Sprite'||k==='Object3D'?Obj:k==='Vector3'?V3:k==='CatmullRomCurve3'?CR:k==='Clock'?class{getDelta(){return .016;}}:mk()});const listeners={n:0};const cls=()=>{const s=new Set();return{add:c=>s.add(c),remove:c=>s.delete(c),contains:c=>s.has(c),toggle:c=>s.has(c)?s.delete(c):s.add(c),_s:s};};
 const el=()=>({style:{},className:'',classList:cls(),appendChild(){},addEventListener(){listeners.n++;},setPointerCapture(){},getBoundingClientRect:()=>({left:20,top:600,width:132,height:132}),querySelector:()=>({addEventListener(){},value:'1'}),getContext:()=>{const c=()=>new Proxy({},{get:()=>(()=>c()),set:()=>true});return c();},width:0,height:0,set innerHTML(v){this._h=v;},get innerHTML(){return this._h||''},textContent:''});
 const els_={};const bodyEl=el();const document={createElement:()=>el(),body:bodyEl,getElementById:id=>els_[id]||(els_[id]=el())};exports.els=els_;exports.body=bodyEl;exports.listeners=listeners;let fr=0;
 let addL=0;const addEventListener2=()=>{addL++;};exports.winListeners=()=>addL;const raf=f=>{if(runLoop&&fr++<(exports.maxFrames||30))setTimeout(()=>{try{f()}catch(e){console.log('LOOP ERR',e.stack.split('\n').slice(0,3).join('\n'));process.exit(1)}},4)};
 return new Function('Aftermarket','THREE','document','window','innerWidth','innerHeight','devicePixelRatio','requestAnimationFrame','addEventListener','performance',js)(require('../shared/core.js'),THREE,document,{},1200,800,1,raf,addEventListener2,{now:()=>0});};

exports.rand=rand;
