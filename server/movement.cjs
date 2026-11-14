'use strict';
// Directions are validated by the API. Only server-observed packet spacing
// changes the lease; clients cannot submit a position, speed or timeout.
function next(previous,{x,z},now){
 const continuous=previous?.at&&(previous.x||previous.z)&&(x||z),gap=previous?.at?Math.max(0,now-previous.at):0;
 return{x,z,at:now,ttl:continuous?Math.max(1000,Math.min(2500,gap*1.5)):1000};
}
function live(movement,now){return now-movement.at<Math.max(1000,Math.min(2500,movement.ttl||1000));}
module.exports={next,live};
