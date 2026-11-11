const path=require('node:path'),fs=require('node:fs');try{process.loadEnvFile(path.join(__dirname,'../.env'));}catch(e){if(e.code!=='ENOENT')throw e;}
(async()=>{const sql=require('../db.js');try{
  const migrations=await sql`select name from app_internal.migrations order by name`;
  const tables=await sql`select relname as table,relrowsecurity as rls from pg_class join pg_namespace n on n.oid=relnamespace where n.nspname='public' and relname in ('game_saves','chain_outbox','player_profiles','game_transactions','market_history','economic_events','game_commands') order by relname`;
  const privileges=await sql`select has_function_privilege('authenticated','public.commit_game(uuid,bigint,jsonb,jsonb,text,jsonb,text)','execute') as browser_can_commit,has_function_privilege('service_role','public.commit_game(uuid,bigint,jsonb,jsonb,text,jsonb,text)','execute') as server_can_commit`;
  const expected=fs.readdirSync(path.join(__dirname,'../supabase/migrations')).filter(n=>n.endsWith('.sql')).sort();
  if(JSON.stringify(migrations.map(m=>m.name))!==JSON.stringify(expected)||tables.length!==7||tables.some(t=>!t.rls)||privileges[0].browser_can_commit||!privileges[0].server_can_commit)throw new Error('Database access-rule verification failed');
  const {createClient}=require('@supabase/supabase-js');const opts={auth:{persistSession:false,autoRefreshToken:false}};
  const service=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,opts),anon=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_PUBLISHABLE_KEY,opts);
  const adminResult=await service.from('game_saves').select('user_id').limit(1),anonymousResult=await anon.from('game_saves').select('user_id').limit(1);
  if(adminResult.error||!anonymousResult.error)throw new Error('Data API access-rule verification failed');
  console.log({migrations:migrations.map(m=>m.name),tables,privileges:privileges[0],serviceApiRead:true,anonymousApiReadDenied:true});
}finally{await sql.end({timeout:3});}})().catch(e=>{console.error('Live database verification failed:',e.code||'access/schema verification error');process.exitCode=1;});
