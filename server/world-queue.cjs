'use strict';
function serial(w,fn,{background=false}={}){
 const task=w.queue.then(async()=>{w.busy=true;w.backgroundSaving=background;try{return await fn();}finally{w.busy=false;w.backgroundSaving=false;}});
 w.queue=task.catch(()=>{});return task;
}
module.exports={serial};
