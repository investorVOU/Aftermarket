const {spawnSync}=require('node:child_process');
for(const args of [['--test','tests/backend.test.cjs','tests/database.test.cjs','tests/frontend.test.cjs','tests/runtime.test.cjs','tests/playability.test.cjs','tests/npc-view.test.cjs','tests/settlement.test.cjs','tests/sync-transport.test.cjs','tests/world-queue.test.cjs','tests/rpc-router.test.cjs','tests/http-client.test.cjs','tests/credit.test.cjs','tests/merchant-agent.test.cjs','tests/merchant-chat.test.cjs','tests/guest.test.cjs','tests/employment.test.cjs','tests/guest-bootstrap.test.cjs','tests/guest-entry.test.cjs','tests/guest-restore.test.cjs','tests/email-config.test.cjs'],['tests/run-all.js']]){
  const result=spawnSync(process.execPath,args,{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);
}
