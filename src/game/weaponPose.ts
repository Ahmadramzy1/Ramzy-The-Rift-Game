import type {WeaponKind} from './weapons';

/** Positions are anchored to the gripping hand, never the weapon image centre. */
export function weaponPose(kind:WeaponKind,x:number,shoulderY:number,centreY:number,facing:number,aim:number,swing:number,recoil:number){
 const attacking=kind==='sword'&&swing>=0&&swing<1;
 const elevation=Math.max(-.75,Math.min(.75,Math.sin(aim)));
 const handX=x+(attacking?Math.cos(aim)*29:facing*(kind==='slingshot'?27:19));
 const handY=attacking?centreY+Math.sin(aim)*23:centreY+(kind==='slingshot'?elevation*14-5:7);
 const rotation=kind==='slingshot'?0:attacking?aim+Math.PI/2+facing*(-1+swing*2):facing*.16;
 const shoulderX=x+facing*5;
 return {handX,handY,rotation,shoulderX,shoulderY,elbowX:shoulderX+(handX-shoulderX)*.45,elbowY:Math.max(shoulderY+12,handY+4),drawX:handX-facing*(5+recoil*17),drawY:handY-15+recoil*2,attacking};
}
