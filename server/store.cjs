'use strict';
const {createClient}=require('@supabase/supabase-js');
class Store {
  constructor(env){
    this.ready=Boolean(env.SUPABASE_URL&&env.SUPABASE_PUBLISHABLE_KEY&&(env.SUPABASE_SECRET_KEY||env.DATABASE_URL));
    if(this.ready){this.db=createClient(env.SUPABASE_URL,env.SUPABASE_SECRET_KEY||env.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});if(env.DATABASE_URL)this.sql=require('../db.js');}
  }
  async user(token){const {data,error}=await this.db.auth.getUser(token);if(error||!data.user)throw Object.assign(new Error('Please sign in again.'),{status:401});return data.user;}
  async load(id){if(this.sql)return(await this.sql`select * from public.game_saves where user_id=${id} limit 1`)[0]||null;const {data,error}=await this.db.from('game_saves').select('*').eq('user_id',id).maybeSingle();if(error)throw error;return data;}
  async hasCommand(id,command){if(this.sql)return(await this.sql`select 1 from public.game_commands where user_id=${id} and command_id=${command} limit 1`).length>0;const {data,error}=await this.db.from('game_commands').select('command_id').eq('user_id',id).eq('command_id',command).maybeSingle();if(error)throw error;return Boolean(data);}
  async save(id,revision,snapshot,balances,wallet,payload,command=null){
    if(this.sql){const sql=this.sql;const rows=await sql`select public.commit_game(${id}::uuid,${revision}::bigint,${sql.json(snapshot)},${sql.json(balances)},${wallet},${payload?sql.json(payload):null}::jsonb,${command}) as revision`;return Number(rows[0].revision);}
    const {data,error}=await this.db.rpc('commit_game',{p_user_id:id,p_expected_revision:revision,p_snapshot:snapshot,p_balances:balances,p_wallet_id:wallet,p_payload:payload,p_command_id:command});
    if(error)throw error;return data;
  }
  async pending(){if(this.sql)return(await this.sql`select * from public.chain_outbox where status='pending' order by id limit 1`)[0];const {data,error}=await this.db.from('chain_outbox').select('*').eq('status','pending').order('id').limit(1);if(error)throw error;return data[0];}
  async settlement(id,values){if(this.sql){const sql=this.sql;await sql`update public.chain_outbox set ${sql(values)} where id=${id}`;return;}const {error}=await this.db.from('chain_outbox').update(values).eq('id',id);if(error)throw error;}
  async history(id){if(this.sql)return this.sql`select revision,status,transaction_hash,error from public.chain_outbox where user_id=${id} order by id desc limit 5`;const {data,error}=await this.db.from('chain_outbox').select('revision,status,transaction_hash,error').eq('user_id',id).order('id',{ascending:false}).limit(5);if(error)throw error;return data;}
  async close(){if(this.sql)await this.sql.end({timeout:5});}
}
module.exports={Store};
