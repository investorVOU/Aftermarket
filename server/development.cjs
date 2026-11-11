'use strict';
const fs=require('node:fs'),path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
class DevelopmentStore {
  constructor(filename=path.join(__dirname,'../.local/development.sqlite')){fs.mkdirSync(path.dirname(filename),{recursive:true});this.db=new DatabaseSync(filename);this.ready=true;this.db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS saves (user_id TEXT PRIMARY KEY, revision INTEGER NOT NULL, snapshot TEXT NOT NULL, chain_balances TEXT NOT NULL, wallet_id TEXT NOT NULL); CREATE TABLE IF NOT EXISTS commands(user_id TEXT NOT NULL, command_id TEXT NOT NULL, PRIMARY KEY(user_id,command_id));');}
  async user(token){if(!/^dev-[a-f0-9-]{36}$/.test(token))throw Object.assign(new Error('Invalid development session'),{status:401});return{id:token.slice(4)};}
  async load(id){const row=this.db.prepare('SELECT * FROM saves WHERE user_id=?').get(id);return row?{...row,snapshot:JSON.parse(row.snapshot),chain_balances:JSON.parse(row.chain_balances)}:null;}
  async hasCommand(id,command){return Boolean(this.db.prepare('SELECT 1 FROM commands WHERE user_id=? AND command_id=?').get(id,command));}
  async save(id,revision,snapshot,balances,wallet,payload,command=null){if(payload)throw new Error('Development mode cannot settle blockchain assets.');this.db.exec('BEGIN IMMEDIATE');try{if(command)this.db.prepare('INSERT INTO commands VALUES(?,?)').run(id,command);const old=this.db.prepare('SELECT revision FROM saves WHERE user_id=?').get(id);if((old?.revision||0)!==revision)throw new Error('Save revision conflict');this.db.prepare('INSERT INTO saves VALUES(?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET revision=excluded.revision,snapshot=excluded.snapshot,chain_balances=excluded.chain_balances,wallet_id=excluded.wallet_id').run(id,revision+1,JSON.stringify(snapshot),JSON.stringify(balances),wallet);this.db.exec('COMMIT');return revision+1;}catch(e){this.db.exec('ROLLBACK');throw e;}}
  async pending(){return null;}async history(){return [];}close(){this.db.close();}
}
class DevelopmentChain {
  constructor(){this.ready=true;}wallet(user){return'local:'+user;}payload(){return{balances:{},payload:null};}
  publicConfig(){return{network:'development',configured:true,contractId:null,settlement:false};}
}
class OffchainChain extends DevelopmentChain {
  wallet(user){return'offchain:'+user;}
  publicConfig(){return{network:'offchain',configured:true,contractId:null,settlement:false};}
}
module.exports={DevelopmentStore,DevelopmentChain,OffchainChain};
