const {spawnSync}=require('node:child_process');
for(const args of [['--test','tests/backend.test.cjs','tests/database.test.cjs','tests/frontend.test.cjs'],['tests/run-all.js']]){
  const result=spawnSync(process.execPath,args,{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);
}
