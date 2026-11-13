const {test}=require('node:test'),assert=require('node:assert/strict');
const {configure,patchFor,settings,parseArgs}=require('../scripts/configure-email.cjs');
const env={SUPABASE_URL:'https://ytfioiujcitikvgbfxwg.supabase.co',SUPABASE_ACCESS_TOKEN:'mock-management-token',RESEND_API_KEY:'mock-resend-secret'};
test('explicit apply survives inside the npm script; ambiguous flags cannot apply',()=>{
  assert.deepEqual(parseArgs(['--apply']),{apply:true});assert.deepEqual(parseArgs([]),{apply:false});assert.deepEqual(parseArgs(['--preview']),{apply:false});
  assert.throws(()=>parseArgs(['--apply','--preview']),/PowerShell-safe/);assert.throws(()=>parseArgs(['--aply']),/PowerShell-safe/);
  assert.ok(require('../package.json').scripts['email:configure:apply'].endsWith(' --apply'));
});
test('a different Supabase project is rejected before making requests',async()=>{
  let requests=0;await assert.rejects(configure({env:{...env,SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co'},apply:true,fetchImpl:async()=>{requests++;}}),/Aftermarket project/);assert.equal(requests,0);
});
test('email configuration validates credentials and preserves existing redirects',()=>{
  assert.throws(()=>settings({}),/SUPABASE_ACCESS_TOKEN/);
  const patch=patchFor({uri_allow_list:'http://localhost:8080'},env);
  assert.equal(patch.smtp_pass,env.RESEND_API_KEY);assert.equal(patch.mailer_autoconfirm,false);
  assert.equal(patch.external_email_magic_link_disabled,false);
  assert.ok(patch.uri_allow_list.includes('http://localhost:8080'));assert.ok(patch.uri_allow_list.includes('https://aftmarket.xyz'));
  assert.equal(patch.external_google_enabled,undefined);
});
test('email preview is read-only and never prints API credentials',async()=>{
  const calls=[];const result=await configure({env,fetchImpl:async(url,opts)=>{calls.push(opts.method||'GET');return{ok:true,json:async()=>url.includes('api.resend.com')?{data:[{name:'aftmarket.xyz',status:'verified'}]}:{smtp_host:'old.example'}};}});
  assert.deepEqual(calls,['GET','GET']);assert.equal(result.mode,'preview');assert.equal(result.domainVerified,true);assert.ok(!JSON.stringify(result).includes(env.RESEND_API_KEY));assert.ok(!JSON.stringify(result).includes(env.SUPABASE_ACCESS_TOKEN));
});
test('unverified domain prevents all Supabase writes',async()=>{
  let writes=0;await assert.rejects(configure({env,apply:true,fetchImpl:async(url,opts)=>{if(opts.method==='PATCH')writes++;return{ok:true,json:async()=>url.includes('api.resend.com')?{data:[{name:'aftmarket.xyz',status:'pending'}]}:{}};}}),/not verified/);assert.equal(writes,0);
});
test('verified SMTP configuration is read back but not claimed as delivery',async()=>{
  let saved={uri_allow_list:'http://localhost:8080',external_google_enabled:true,external_twitter_enabled:false},writes=0;
  const result=await configure({env,apply:true,fetchImpl:async(url,opts)=>{
    if(opts.method==='PATCH'){saved={...saved,...JSON.parse(opts.body)};writes++;}
    return{ok:true,json:async()=>url.includes('api.resend.com')?{data:[{name:'aftmarket.xyz',status:'verified',capabilities:{sending:'enabled'}}]}:saved};
  }});
  assert.equal(writes,1);assert.equal(result.configurationVerified,true);assert.equal(result.deliveryVerified,false);assert.ok(!JSON.stringify(result).includes(env.RESEND_API_KEY));
  assert.equal(saved.external_google_enabled,true);assert.equal(saved.external_twitter_enabled,false);
});
test('permission errors and malformed provider responses never leak credentials or write settings',async()=>{
  for(const response of [{ok:false,status:403},{ok:true,json:async()=>{throw Error(env.RESEND_API_KEY);}}]){
    let writes=0;await assert.rejects(configure({env,apply:true,fetchImpl:async(url,opts)=>{if(opts.method==='PATCH')writes++;return response;}}),error=>!error.message.includes(env.RESEND_API_KEY)&&!error.message.includes(env.SUPABASE_ACCESS_TOKEN));assert.equal(writes,0);
  }
});
