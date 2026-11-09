'use strict';
// Server-only. CommonJS matches this repository's existing backend modules.
const postgresModule=require('postgres');
const postgres=postgresModule.default||postgresModule;
const fs=require('node:fs'),path=require('node:path'),tls=require('node:tls');
const connectionString=process.env.DATABASE_URL;
if(!connectionString||connectionString.includes('[YOUR-PASSWORD]'))throw new Error('Set a real DATABASE_URL in the server .env file.');
if(!/^postgres(?:ql)?:\/\//.test(connectionString))throw Object.assign(new Error('DATABASE_URL must be the full postgres connection URI.'),{code:'DATABASE_URL_FORMAT'});
try{new URL(connectionString);}catch{throw Object.assign(new Error('DATABASE_URL is malformed. Percent-encode the password.'),{code:'DATABASE_URL_FORMAT'});}
const sql=postgres(connectionString,{
  max:5,
  idle_timeout:20,
  connect_timeout:10,
  prepare:false, // Also supports Supabase's transaction pooler.
  ssl:{rejectUnauthorized:true,ca:[...tls.rootCertificates,fs.readFileSync(path.join(__dirname,'server/certs/supabase-ca-2021.crt'),'utf8')]}
});
module.exports=sql;
