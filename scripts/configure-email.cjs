// Operator-only Supabase Auth configuration. This is not part of the web bundle.
const path=require('node:path');

function settings(env){
  const missing=['SUPABASE_URL','SUPABASE_ACCESS_TOKEN','RESEND_API_KEY'].filter(k=>!env[k]);
  if(missing.length)throw Error('Add these private .env settings: '+missing.join(', '));
  const url=new URL(env.SUPABASE_URL),ref=url.hostname.split('.')[0];
  if(url.protocol!=='https:'||url.hostname!==ref+'.supabase.co'||!/^\w{20}$/.test(ref))throw Error('Expected the hosted Supabase project URL.');
  const sender=env.AUTH_EMAIL_FROM||'play@aftmarket.xyz';
  if(!/^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(sender))throw Error('AUTH_EMAIL_FROM must be an email address without a display name.');
  return{ref,sender,domain:sender.split('@')[1].toLowerCase()};
}
function patchFor(current,env){
  const {sender}=settings(env);
  // Keep local/staging callbacks and unrelated providers as configured.
  const redirects=new Set((current.uri_allow_list||'').split(',').map(s=>s.trim()).filter(Boolean));
  redirects.add('https://aftmarket.xyz');redirects.add('https://aftmarket.xyz/');
  return{smtp_admin_email:sender,smtp_sender_name:'Aftermarket',smtp_host:'smtp.resend.com',smtp_port:'465',smtp_user:'resend',smtp_pass:env.RESEND_API_KEY,site_url:'https://aftmarket.xyz',uri_allow_list:[...redirects].join(','),external_email_enabled:true,external_email_magic_link_disabled:false,mailer_autoconfirm:false};
}
async function configure({env=process.env,apply=false,fetchImpl=fetch}={}){
  const {ref,sender,domain}=settings(env),endpoint='https://api.supabase.com/v1/projects/'+ref+'/config/auth';
  async function request(url,token,options={}){
    let response;
    try{response=await fetchImpl(url,{...options,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},signal:AbortSignal.timeout(15000)});}
    catch{throw Error('Email configuration request could not connect. No credentials or provider response are printed.');}
    if(!response.ok)throw Error('Email configuration request failed with HTTP '+response.status+'. Check token permissions; use the dashboard instructions in docs/EMAIL_DELIVERY.md.');
    return response.json();
  }
  const current=await request(endpoint,env.SUPABASE_ACCESS_TOKEN),patch=patchFor(current,env);
  if(!apply)return{mode:'preview',project:ref,sender,site:patch.site_url,provider:'Resend SMTP',currentlyResend:current.smtp_host==='smtp.resend.com',next:'Run npm run email:configure -- --apply after verifying the sending domain. No email was sent.'};
  // A full-access local Resend key is needed to inspect domains. A sending-only
  // key can instead be installed through the Supabase dashboard by the operator.
  let cursor='',verified=false;
  do{
    const domains=await request('https://api.resend.com/domains?limit=100'+(cursor?'&after='+encodeURIComponent(cursor):''),env.RESEND_API_KEY);
    verified=domains.data?.some(d=>d.name.toLowerCase()===domain&&d.status==='verified'&&d.capabilities?.sending!=='disabled');
    cursor=domains.has_more&&domains.data?.at(-1)?.id||'';
  }while(!verified&&cursor);
  if(!verified)throw Error('Verify the sender domain in Resend before applying SMTP settings. No Supabase settings were changed.');
  await request(endpoint,env.SUPABASE_ACCESS_TOKEN,{method:'PATCH',body:JSON.stringify(patch)});
  const saved=await request(endpoint,env.SUPABASE_ACCESS_TOKEN);
  for(const key of ['smtp_host','smtp_port','smtp_user','smtp_admin_email','smtp_sender_name','site_url','external_email_enabled','external_email_magic_link_disabled','mailer_autoconfirm'])if(saved[key]!==patch[key])throw Error('Supabase settings read-back did not match. Check the dashboard; do not assume email delivery works.');
  return{mode:'applied',project:ref,sender,site:patch.site_url,provider:'Resend SMTP',configurationVerified:true,deliveryVerified:false,next:'Request one sign-in link in the game, open it and verify your saved island. Configuration is not an inbox delivery test.'};
}
if(require.main===module){
  try{process.loadEnvFile(path.join(__dirname,'../.env'));}catch(e){if(e.code!=='ENOENT')throw e;}
  const args=process.argv.slice(2);
  if(args.some(a=>a!=='--apply')){console.error('Usage: npm run email:configure -- [--apply]');process.exitCode=1;}
  else configure({apply:args.includes('--apply')}).then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error.message);process.exitCode=1;});
}
module.exports={settings,patchFor,configure};
