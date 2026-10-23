import {it,expect} from 'vitest';
import {weaponPose} from '../src/game/weaponPose';
it('anchors both weapons to the existing fist in every animation, even when aim and swing change',()=>{
 for(let frame=0;frame<21;frame++)for(const facing of [-1,1]){
  const idle=weaponPose('slingshot',110,400,428,facing,0,-1,0,frame,410);
  const aimed=weaponPose('slingshot',110,400,428,facing,-Math.PI/2,-1,1,frame,410);
  const attack=weaponPose('sword',110,400,428,facing,Math.PI,.5,0,frame,410);
  expect(aimed.handX).toBe(idle.handX);expect(aimed.handY).toBe(idle.handY);
  expect(attack.handX).toBe(idle.handX);expect(attack.handY).toBe(idle.handY);
  expect(idle.rotation).toBe(0);expect(Math.abs(idle.handX-110)).toBeLessThan(26);
 }
 expect(weaponPose('slingshot',110,400,428,1,0,-1,0,0,410)).toMatchObject({handX:122.5,handY:435.5});
});
