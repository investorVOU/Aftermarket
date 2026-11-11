'use strict';
const crypto=require('node:crypto');
const {createClient}=require('@supabase/supabase-js');
// Demo accounts are real, isolated Supabase Auth users. No shared password or
// service token is ever delivered to a browser. The server marks their origin.
class GuestAuth {
  constructor(env,sql){
    this.env=env;this.sql=sql;this.count=0;this.window=Date.now();this.busy=Promise.resolve();
    this.ready=env.DEMO_GUEST_ENABLED==='true'&&env.NEAR_NETWORK==='testnet'&&env.NEAR_SETTLEMENT_ENABLED==='true'&&Boolean(env.SUPABASE_SECRET_KEY&&env.SUPABASE_URL&&env.SUPABASE_PUBLISHABLE_KEY);
    if(this.ready)this.admin=createClient(env.SUPABASE_URL,env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  }
  create(){const request=this.busy.then(()=>this.issue());this.busy=request.catch(()=>{});return request;}
  async issue(){
    if(!this.ready)throw Object.assign(new Error('Guest entry is available only on the configured testnet demo.'),{status:403});
    if(Date.now()-this.window>86400000){this.count=0;this.window=Date.now();}
    let count=this.count;
    if(this.sql){const [row]=await this.sql`select count(*)::int as count from auth.users where raw_app_meta_data->>'aftermarket_demo'='true' and created_at>now()-interval '24 hours'`;count=row.count;}
    else{const result=await this.admin.auth.admin.listUsers({page:1,perPage:1000});if(result.error)throw Object.assign(new Error('Demo account availability could not be checked.'),{status:503});if(result.data.users.length>=1000)throw Object.assign(new Error('Guest capacity needs operator review. Please use email sign-in.'),{status:429});count=result.data.users.filter(u=>u.app_metadata?.aftermarket_demo&&Date.now()-new Date(u.created_at).getTime()<86400000).length;}
    const cap=Math.max(1,Math.min(200,Number(this.env.DEMO_GUEST_DAILY_LIMIT)||30));
    if(count>=cap)throw Object.assign(new Error('Today’s demo account limit has been reached. Please use email sign-in.'),{status:429});
    this.count++;
    const email=`guest-${crypto.randomUUID()}@demo.aftermarket.invalid`,password=crypto.randomBytes(32).toString('base64url');
    const created=await this.admin.auth.admin.createUser({email,password,email_confirm:true,app_metadata:{aftermarket_demo:true}});
    if(created.error)throw Object.assign(new Error('The demo identity could not be created. Please use email sign-in.'),{status:503});
    // Keep the privileged admin client isolated from signed-in user sessions.
    const client=createClient(this.env.SUPABASE_URL,this.env.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
    const login=await client.auth.signInWithPassword({email,password});
    if(login.error||!login.data.session)throw Object.assign(new Error('The demo identity could not sign in. Please retry or use email sign-in.'),{status:503});
    const {access_token,refresh_token,expires_in,token_type}=login.data.session;
    return {access_token,refresh_token,expires_in,token_type,demo:true};
  }
}
module.exports={GuestAuth};
