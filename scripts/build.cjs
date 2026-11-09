const fs=require('node:fs');const path=require('node:path');const esbuild=require('esbuild');
const root=path.join(__dirname,'..');
esbuild.buildSync({absWorkingDir:root,entryPoints:['./game/client.entry.js'],outfile:'./game/client.bundle.js',bundle:true,platform:'browser',format:'iife',target:['es2020'],minify:true,tsconfigRaw:{compilerOptions:{}}});
for(const file of ['server/index.cjs','server/world.cjs','server/store.cjs','server/near.cjs','shared/core.js','shared/state.js','shared/merchant-rules.js']){
  const result=require('node:child_process').spawnSync(process.execPath,['--check',path.join(root,file)],{encoding:'utf8'});if(result.status!==0)throw new Error(result.stderr);
}
console.log('Browser bundle built; server and shared JavaScript syntax verified.');
