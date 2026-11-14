'use strict';
const crypto=require('node:crypto');
const {createClient}=require('@supabase/supabase-js');
// Demo accounts are real, isolated Supabase Auth users. No shared password or
// service token is ever delivered to a browser. The server marks their origin.
class GuestAuth {
  constructor(env,sql,clientFactory=createClient){
    this.env=env;this.sql=sql;this.clientFactory=clientFactory;this.count=0;this.total=0;this.checkedAt=0;this.window=Date.now();this.busy=Promise.resolve();this.checking=null;
    this.ready=env.DEMO_GUEST_ENABLED==='true'&&env.NEAR_NETWORK==='testnet'&&env.NEAR_SETTLEMENT_ENABLED==='true'&&Boolean(env.SUPABASE_SECRET_KEY&&env.SUPABASE_URL&&env.SUPABASE_PUBLISHABLE_KEY);
    if(this.ready)this.admin=clientFactory(env.SUPABASE_URL,env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  }
  // One unused session may be prepared while the welcome page is open. Taking
  // the slot synchronously guarantees that two visitors never share an identity.
  prepare(){if(!this.ready||this.env.DEMO_GUEST_PREWARM==='false'||this.prepared)return;const slot=this.createNew().then(session=>({session,until:Date.now()+session.expires_in*1000}));this.prepared=slot;slot.catch(()=>{if(this.prepared===slot)this.prepared=null;});}
  dailyLimit(){return Math.max(1,Math.min(200,Number(this.env.DEMO_GUEST_DAILY_LIMIT)||200));}
  async create(){const slot=this.prepared;this.prepared=null;if(slot){const ready=await slot;if(ready.until>Date.now()+60000)return ready.session;}return this.createNew();}
  createNew(){const request=this.busy.then(()=>this.issue());this.busy=request.catch(()=>{});return request;}
  prime(){if(!this.ready)return Promise.resolve();if(Date.now()-this.checkedAt<30000)return Promise.resolve();if(this.checking)return this.checking;
    this.checking=this.availability().finally(()=>{this.checking=null;});return this.checking;
  }
  async availability(){
    let count,total=0;
    if(this.sql){const [row]=await this.sql`select count(*)::int as count from auth.users where raw_app_meta_data->>'aftermarket_demo'='true' and created_at>now()-interval '24 hours'`;count=row.count;}
    else{const result=await this.admin.auth.admin.listUsers({page:1,perPage:1000});if(result.error)throw Object.assign(new Error('Demo account availability could not be checked.'),{status:503});total=result.data.users.length;count=result.data.users.filter(u=>u.app_metadata?.aftermarket_demo&&Date.now()-new Date(u.created_at).getTime()<86400000).length;}
    this.count=count;this.total=total;this.checkedAt=Date.now();
  }
  async issue(){
    if(!this.ready)throw Object.assign(new Error('Guest entry is available only on the configured testnet demo.'),{status:403});
    if(Date.now()-this.window>86400000){this.count=0;this.window=Date.now();}
    await this.prime();
    if(this.total>=1000)throw Object.assign(new Error('Guest capacity needs operator review. Please use email sign-in.'),{status:429});
    const cap=this.dailyLimit();
    if(this.count>=cap)throw Object.assign(new Error('Guest entry has reached its rolling 24-hour capacity. Please use email sign-in or retry later.'),{status:429});
    this.count++;
    const email=`guest-${crypto.randomUUID()}@demo.aftermarket.invalid`,password=crypto.randomBytes(32).toString('base64url');
    const created=await this.admin.auth.admin.createUser({email,password,email_confirm:true,app_metadata:{aftermarket_demo:true}});
    if(created.error)throw Object.assign(new Error('The demo identity could not be created. Please use email sign-in.'),{status:503});
    // Keep the privileged admin client isolated from signed-in user sessions.
    this.total++;
    const client=this.clientFactory(this.env.SUPABASE_URL,this.env.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
    const login=await client.auth.signInWithPassword({email,password});
    if(login.error||!login.data.session||!login.data.user?.id||login.data.user.id!==created.data.user?.id)throw Object.assign(new Error('The demo identity could not sign in. Please retry or use email sign-in.'),{status:503});
    const {access_token,refresh_token,expires_in,token_type}=login.data.session;
    return {access_token,refresh_token,expires_in,token_type,demo:true,user:login.data.user};
  }
}
module.exports={GuestAuth};
