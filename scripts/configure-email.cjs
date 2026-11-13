// Operator-only Supabase Auth configuration. This is not part of the web bundle.
const path=require('node:path');
const PROJECT='ytfioiujcitikvgbfxwg';

function parseArgs(args){
  if(args.some(a=>!['--apply','--preview'].includes(a))||args.includes('--apply')&&args.includes('--preview'))throw Error('Use npm run email:configure for preview, or npm run email:configure:apply to apply (PowerShell-safe).');
  return{apply:args.includes('--apply')};
}

function settings(env){
  const missing=['SUPABASE_URL','SUPABASE_ACCESS_TOKEN','RESEND_API_KEY'].filter(k=>!env[k]);
  if(missing.length)throw Error('Add these private .env settings: '+missing.join(', '));
  const url=new URL(env.SUPABASE_URL),ref=url.hostname.split('.')[0];
  if(url.protocol!=='https:'||url.hostname!==PROJECT+'.supabase.co'||url.username||url.password)throw Error('SUPABASE_URL must target the Aftermarket project '+PROJECT+'. Existing shell variables take precedence over .env.');
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
    if(!response.ok)throw Error((url.includes('api.resend.com')?'Resend domain verification':'Supabase authentication configuration')+' failed with HTTP '+response.status+'. Check token permissions; use docs/EMAIL_DELIVERY.md. No credentials or provider response are printed.');
    try{return await response.json();}catch{throw Error('Email configuration provider returned an invalid response. No settings read-back or delivery success is claimed.');}
  }
  const current=await request(endpoint,env.SUPABASE_ACCESS_TOKEN),patch=patchFor(current,env);
  // A full-access local Resend key is needed to inspect domains. A sending-only
  // key can instead be installed through the Supabase dashboard by the operator.
  let cursor='',verified=false;const cursors=new Set();
  do{
    const domains=await request('https://api.resend.com/domains?limit=100'+(cursor?'&after='+encodeURIComponent(cursor):''),env.RESEND_API_KEY);
    verified=domains.data?.some(d=>d.name.toLowerCase()===domain&&d.status==='verified'&&d.capabilities?.sending!=='disabled');
    cursor=domains.has_more&&domains.data?.at(-1)?.id||'';
    if(cursor&&cursors.has(cursor))throw Error('Resend repeated a domain page; verification stopped without changing Supabase.');
    cursors.add(cursor);
  }while(!verified&&cursor);
  if(!verified)throw Error('Sender domain '+domain+' is not verified for sending in Resend. No Supabase settings were changed.');
  if(!apply)return{mode:'preview',project:ref,sender,site:patch.site_url,provider:'Resend SMTP',domainVerified:true,currentlyResend:current.smtp_host==='smtp.resend.com',writes:0,next:'Read-only preview: no apply flag reached Node. To apply, run npm run email:configure:apply (PowerShell-safe), or node scripts/configure-email.cjs --apply. No email was sent.'};
  await request(endpoint,env.SUPABASE_ACCESS_TOKEN,{method:'PATCH',body:JSON.stringify(patch)});
  const saved=await request(endpoint,env.SUPABASE_ACCESS_TOKEN);
  for(const key of ['smtp_host','smtp_port','smtp_user','smtp_admin_email','smtp_sender_name','site_url','external_email_enabled','external_email_magic_link_disabled','mailer_autoconfirm'])if(saved[key]!==patch[key])throw Error('Supabase settings read-back did not match. Check the dashboard; do not assume email delivery works.');
  const savedRedirects=new Set((saved.uri_allow_list||'').split(',').map(s=>s.trim()));
  if(patch.uri_allow_list.split(',').some(url=>!savedRedirects.has(url)))throw Error('Redirect allow-list read-back did not match. Check Supabase URL configuration.');
  for(const key of Object.keys(current).filter(k=>/^external_.*_enabled$/.test(k)&&k!=='external_email_enabled'))if(saved[key]!==current[key])throw Error('An unrelated authentication provider changed during setup. Inspect the dashboard before proceeding.');
  return{mode:'applied',project:ref,sender,site:patch.site_url,provider:'Resend SMTP',domainVerified:true,configurationVerified:true,deliveryVerified:false,next:'SMTP settings and redirects verified. Request one sign-in link in the game and verify the return to your saved island. Configuration is not an inbox delivery test.'};
}
if(require.main===module){
  try{process.loadEnvFile(path.join(__dirname,'../.env'));}catch(e){if(e.code!=='ENOENT')throw e;}
  Promise.resolve().then(()=>configure(parseArgs(process.argv.slice(2)))).then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error.message);process.exitCode=1;});
}
module.exports={settings,patchFor,configure,parseArgs};
