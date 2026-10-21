import type {Platform} from './levels';
export const hasGroundSupport=(body:{left:number;right:number;bottom:number},platforms:Platform[])=>platforms.some(p=>body.right>p.x+1&&body.left<p.x+p.w-1&&Math.abs(body.bottom-p.y)<3);
export const canUseDungeonDoor=(x:number,feet:number,doorX:number,doorY:number,grounded:boolean,pressed:boolean)=>pressed&&grounded&&Math.abs(x-doorX)<52&&Math.abs(feet-doorY)<6;
