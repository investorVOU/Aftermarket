'use strict';
// Process-local request tickets recover a lost guest response without creating
// another identity. Tickets are unguessable and never placed in URLs or logs.
class GuestEntries {
 constructor({ttl=300000,max=256}={}){this.ttl=ttl;this.max=max;this.entries=new Map();}
 run(id,create){
  if(id===undefined)return create();
  if(typeof id!=='string'||!/^[-a-f0-9]{36}$/i.test(id))throw Object.assign(Error('Invalid guest request ticket.'),{status:400});
  const now=Date.now();for(const [key,entry]of this.entries)if(entry.done&&entry.until<now)this.entries.delete(key);
  if(this.entries.has(id))return this.entries.get(id).promise;
  if(this.entries.size>=this.max)throw Object.assign(Error('Guest entry is busy. Please retry shortly.'),{status:503});
  const entry={until:now+this.ttl,done:false};entry.promise=Promise.resolve().then(create).then(value=>{entry.done=true;return value;},error=>{this.entries.delete(id);throw error;});this.entries.set(id,entry);return entry.promise;
 }
}
module.exports={GuestEntries};
