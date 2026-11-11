// Runs every suite in order and prints a summary. Usage: node tests/run-all.js   (no dependencies, Node 18+)
const {spawnSync}=require('child_process');const path=require('path');
const suites=['tests.js','tests6.js','tests7.js','tests8.js','tests9.js','e2e.js','e2e7.js','e2e8.js','e2e9.js'];let total=0,failed=0;
for(const s of suites){const r=spawnSync('node',[path.join(__dirname,s)],{encoding:'utf8',timeout:240000});const out=(r.stdout||'')+(r.stderr||'');const m=out.match(/(\d+) passed, (\d+) failed/);const p=m?+m[1]:0,f=m?+m[2]:1;total+=p;failed+=f;console.log(s.padEnd(11),m?`${p} passed, ${f} failed`:'DID NOT COMPLETE');if(f||!m)console.log(out.split('\n').filter(l=>/FAIL|Error/.test(l)).join('\n'));}
console.log(`\nTOTAL ${total} passed, ${failed} failed`);process.exit(failed?1:0);
