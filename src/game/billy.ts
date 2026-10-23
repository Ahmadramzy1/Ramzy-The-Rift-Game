export const BILLY={hp:7,interval:4000,range:540,verticalRange:280,gravity:650,fireDuration:2400};
export const billyCanAttack=(dx:number,dy:number)=>Math.abs(dx)<=BILLY.range&&Math.abs(dy)<=BILLY.verticalRange;
export function molotovVelocity(x:number,y:number,targetX:number,targetY:number){
 const flight=Math.max(1,Math.min(1.5,Math.abs(targetX-x)/230));
 return {x:(targetX-x)/flight,y:(targetY-y-.5*BILLY.gravity*flight*flight)/flight,flight};
}
