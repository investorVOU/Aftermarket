// Syntax lint for the existing vanilla-JS/CJS/ESM codebase, including inline game code.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.join(__dirname,'..');let checked=0;
for(const folder of ['shared','server','scripts','game','tests'])for(const name of fs.readdirSync(path.join(root,folder))){
  if(!/\.(?:cjs|mjs|js)$/.test(name)||name.endsWith('.bundle.js'))continue;
  const file=path.join(root,folder,name),result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(result.status!==0)throw new Error(result.stderr);checked++;
}
new Function(fs.readFileSync(path.join(root,'game/aftermarket.html'),'utf8').split('<script>')[1].split('</script>')[0]);
console.log(`Syntax lint passed for ${checked} JavaScript modules and the game's inline renderer.`);
