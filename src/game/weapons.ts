export type WeaponKind='slingshot'|'sword';
export const WEAPONS={slingshot:{damage:1,range:250,cooldown:320},sword:{damage:2,range:78,cooldown:430}};
export const meleeInRange=(x:number,y:number,tx:number,ty:number,facing:number)=>(tx-x)*facing>=-8&&Math.hypot(tx-x,ty-y)<=WEAPONS.sword.range&&Math.abs(ty-y)<55;
export const projectileInRange=(x:number,y:number,tx:number,ty:number)=>Math.hypot(tx-x,ty-y)<=WEAPONS.slingshot.range;
