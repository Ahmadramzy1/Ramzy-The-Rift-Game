import type {WeaponKind} from './weapons';

// Centres of the existing front fists in the 96×112 hero frames.
// Preserve the original arms instead of drawing a second pair over the torso.
const fists=[ [60.5,81.5],[59.5,79.5],[49,77],[59.5,78.5],[52,73],[71.5,67.5],[64.5,71],[66.5,67],[64,40.5],[59.5,77],[67.5,73],[50.5,86],[60,76],[63.5,76.5],[61,38.5],[60,80.5],[67,72],[67.5,73],[69.5,72.5],[73,45],[67.5,72] ];
/** Weapon rotation pivots around the fist already painted into the hero sprite. */
export function weaponPose(kind:WeaponKind,x:number,_shoulderY:number,centreY:number,facing:number,aim:number,swing:number,_recoil:number,frame=0,spriteY=centreY-18){
 const attacking=kind==='sword'&&swing>=0&&swing<1;
 const fist=fists[frame]??fists[0];
 const handX=x+(fist[0]-48)*facing,handY=spriteY+fist[1]-56;
 const rotation=kind==='slingshot'?0:attacking?aim+Math.PI/2+facing*(-1+swing*2):facing*.16;
 return {handX,handY,rotation,attacking};
}
