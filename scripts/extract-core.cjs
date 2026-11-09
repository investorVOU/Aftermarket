// One-time migration helper. Kept to document how the original artifact was split.
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const file = path.join(root, 'game/aftermarket.html');
let html = fs.readFileSync(file, 'utf8');
if (html.includes('Aftermarket.createGame')) throw new Error('Core is already extracted.');
const start = html.indexOf('const Bus=');
const uiStart = html.indexOf('const Districts=');
const simStart = html.indexOf('const Sim=(()=>');
const simEnd = html.indexOf('// ===== PRESENTATION LAYER: 3D world');
let core = html.slice(start, uiStart) + html.slice(simStart, simEnd);
core = core.replace('return S;})();', `S.saveTimers=()=>({plantT,cowAcc,mktAcc});
S.restoreTimers=t=>{plantT=t.plantT||0;cowAcc=t.cowAcc||0;mktAcc=t.mktAcc||0;};
return S;})();`);
const wrapper = `(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.Aftermarket=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function seededRandom(seed=12345){let state=seed>>>0;const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);random.getState=()=>state;random.setState=v=>{state=v>>>0;};return random;}
function createGame(options={}){
const random=options.random||seededRandom(options.seed||12345);
const Math=Object.create(globalThis.Math);Math.random=random;
${core}
return {Bus,Eco,Sim,MS,Biz,money:$,random};
}
return {createGame,seededRandom};
});\n`;
fs.writeFileSync(path.join(root,'shared/core.js'),wrapper);
const ui = html.slice(uiStart, simStart);
html = html.slice(0,start) + `const {Bus,Eco,Sim,MS,Biz,money:$}=Aftermarket.createGame();
// A fixed world seed keeps server collision data and the rendered island identical.
const Math=Object.create(globalThis.Math);Math.random=Aftermarket.seededRandom(12345);
` + ui + html.slice(simEnd);
html = html.replace('<script>','<script src="/shared/core.js"></script>\n<script>');
fs.writeFileSync(file,html);
