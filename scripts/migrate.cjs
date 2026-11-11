const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');const root=path.join(__dirname,'..');try{process.loadEnvFile(path.join(root,'.env'));}catch(e){if(e.code!=='ENOENT')throw e;}
(async()=>{const sql=require('../db.js');try{
  await sql.begin(async tx=>{await tx`select pg_advisory_xact_lock(hashtext('aftermarket-migrations'))`;
    await tx.unsafe('create schema if not exists app_internal; create table if not exists app_internal.migrations(name text primary key, checksum text not null, applied_at timestamptz not null default now()); alter table app_internal.migrations enable row level security; revoke all on schema app_internal from public,anon,authenticated;').simple();
    const folder=path.join(root,'supabase/migrations');for(const name of fs.readdirSync(folder).filter(n=>n.endsWith('.sql')).sort()){
      const source=fs.readFileSync(path.join(folder,name),'utf8'),checksum=crypto.createHash('sha256').update(source).digest('hex');const [old]=await tx`select checksum from app_internal.migrations where name=${name}`;
      if(old){if(old.checksum!==checksum)throw new Error('Previously applied migration changed: '+name);continue;}
      await tx.unsafe(source).simple();await tx`insert into app_internal.migrations(name,checksum) values(${name},${checksum})`;console.log('Applied',name);
    }
  });console.log('Database migrations committed.');
}finally{await sql.end({timeout:5});}})().catch(e=>{console.error(`Migration failed (${e.code||'configuration/schema error'}). No uncommitted migration was applied. Check DATABASE_URL and database permissions.`);process.exitCode=1;});
