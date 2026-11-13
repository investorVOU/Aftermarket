// Apply only the two Supabase templates used by normal email sign-in.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {settings,parseArgs}=require('./configure-email.cjs');
function templatePatch(){
  const html=fs.readFileSync(path.join(__dirname,'../supabase/templates/sign-in.html'),'utf8');
  if(!html.includes('href="{{ .ConfirmationURL }}"')||/<script\b|<form\b|<img\b/i.test(html))throw Error('Email template must preserve the native Supabase confirmation link without scripts, forms or tracking images.');
  return{mailer_subjects_magic_link:'Your Aftermarket sign-in link',mailer_subjects_confirmation:'Confirm your email for Aftermarket',mailer_templates_magic_link_content:html,mailer_templates_confirmation_content:html};
}
async function configureTemplates({env=process.env,apply=false,fetchImpl=fetch}={}){
  const {ref}=settings(env),patch=templatePatch(),endpoint='https://api.supabase.com/v1/projects/'+ref+'/config/auth';
  async function request(options={}){
    let response;
    try{response=await fetchImpl(endpoint,{...options,headers:{Authorization:'Bearer '+env.SUPABASE_ACCESS_TOKEN,'Content-Type':'application/json'},signal:AbortSignal.timeout(15000)});}catch{throw Error('Email template configuration could not connect. No keys or provider responses are printed.');}
    if(!response.ok)throw Error('Supabase email template configuration HTTP '+response.status+'. Check the management token permissions.');
    try{return await response.json();}catch{throw Error('Supabase returned an invalid template response; no successful read-back is claimed.');}
  }
  const before=await request(),digest=crypto.createHash('sha256').update(patch.mailer_templates_magic_link_content).digest('hex');
  const summary={mode:apply?'applied':'preview',project:ref,templates:['magic_link','confirmation'],subjects:{signIn:patch.mailer_subjects_magic_link,confirmation:patch.mailer_subjects_confirmation},htmlSha256:digest};
  if(!apply)return{...summary,writes:0,alreadyInstalled:Object.entries(patch).every(([k,v])=>before[k]===v),next:'Run npm.cmd run email:templates:apply. This changes templates only and sends no email.'};
  await request({method:'PATCH',body:JSON.stringify(patch)});const after=await request();
  if(Object.entries(patch).some(([k,v])=>after[k]!==v))throw Error('Email template read-back did not match. Inspect Supabase before assuming the template is live.');
  for(const key of ['smtp_host','smtp_port','smtp_admin_email','site_url','uri_allow_list','external_google_enabled','external_email_enabled','mailer_autoconfirm'])if(after[key]!==before[key])throw Error('Unrelated authentication settings changed during template installation; inspect the dashboard.');
  return{...summary,configurationVerified:true,emailSent:false,next:'Templates installed and read back. Inbox placement still needs a fresh recipient check.'};
}
if(require.main===module){
  try{process.loadEnvFile(path.join(__dirname,'../.env'));}catch(e){if(e.code!=='ENOENT')throw e;}
  Promise.resolve().then(()=>configureTemplates(parseArgs(process.argv.slice(2)))).then(result=>console.log(JSON.stringify(result,null,2))).catch(e=>{console.error(e.message);process.exitCode=1;});
}
module.exports={templatePatch,configureTemplates};
