(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.GameHTTP=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function friendlyError(error){
  if(error?.name==='TimeoutError'||error?.name==='AbortError')return 'The island took too long to respond. It may be waking up. Please retry in a moment.';
  if(error instanceof TypeError||/failed to fetch|fetch failed|networkerror/i.test(error?.message||''))return 'Cannot reach the island. Check your connection, then retry. Your saved progress is safe.';
  return error?.message||'The island is temporarily unavailable. Please retry.';
 }
 async function requestJSON(url,options={},timeout=15000,fetcher=globalThis.fetch){
  try{
   const response=await fetcher(url,{...options,signal:AbortSignal.timeout(timeout)});
   let data;try{data=await response.json();}catch{throw Object.assign(new Error('The island server is starting or unavailable. Please retry in a moment.'),{status:response.status>=400?response.status:503});}
   if(!response.ok)throw Object.assign(new Error(data.error||'The island could not complete this request.'),{status:response.status});
   return data;
  }catch(error){if(error?.name==='AbortError'||error?.name==='TimeoutError'||error instanceof TypeError)throw Object.assign(new Error(friendlyError(error)),{status:503});throw error;}
 }
 async function retryRead(url,{attempts=6,timeout=10000,onRetry=()=>{},fetcher=globalThis.fetch,delay=ms=>new Promise(r=>setTimeout(r,ms))}={}){
  for(let i=0;i<attempts;i++){try{return await requestJSON(url,{},timeout,fetcher);}catch(error){if(error.status<500||i===attempts-1)throw error;onRetry(i+1);await delay(Math.min(3000,250*2**i));}}
 }
 async function guestEntry(ticket,fetcher=globalThis.fetch,delay=ms=>new Promise(r=>setTimeout(r,ms))){
  const options={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:ticket})};
  try{return await requestJSON('/api/guest',options,15000,fetcher);}catch(error){if(error.status<500)throw error;await delay(500);return requestJSON('/api/guest',options,45000,fetcher);}
 }
 return {requestJSON,friendlyError,retryRead,guestEntry};
});
