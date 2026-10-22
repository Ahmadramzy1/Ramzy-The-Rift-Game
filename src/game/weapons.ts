export type WeaponKind='slingshot'|'sword';
export const WEAPONS={slingshot:{damage:1,range:250,cooldown:320},sword:{damage:2,range:78,cooldown:430}};
export const meleeInRange=(x:number,y:number,tx:number,ty:number,facing:number)=>(tx-x)*facing>=-8&&Math.hypot(tx-x,ty-y)<=WEAPONS.sword.range&&Math.abs(ty-y)<55;
export const projectileInRange=(x:number,y:number,tx:number,ty:number)=>Math.hypot(tx-x,ty-y)<=WEAPONS.slingshot.range;
export const slingshotStats=(level:1|2|3)=>({pellets:level===1?1:2,damage:level===3?2:1,fire:level===3});
export const swordDamage=(level:1|2)=>WEAPONS.sword.damage*(level===2?3:1);
export const swordAimInRange=(x:number,y:number,tx:number,ty:number,angle:number)=>{
 const dx=tx-x,dy=ty-y,distance=Math.hypot(dx,dy);
 return distance<=WEAPONS.sword.range&&(distance<12||(dx*Math.cos(angle)+dy*Math.sin(angle))/distance>=Math.cos(Math.PI/3));
};
export const DOUBLE_JUMP_COOLDOWN=10000;
export const canDoubleJump=(unlocked:boolean,used:number,now:number,readyAt:number)=>unlocked&&used===1&&now>=readyAt;
export const stageCoinBonus=(mainCoins:number,dungeonCoins:number,collected:boolean)=>collected?mainCoins+dungeonCoins:0;
