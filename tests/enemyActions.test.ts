import {describe,it,expect} from 'vitest';
import {startEnemyAction,actionMotion,loopFrame} from '../src/game/enemyActions';
describe('readable enemy attacks',()=>{
 it('requires grounded visible approach and respects recovery cooldown',()=>{
  const input={kind:'husk' as const,now:3000,lastAttack:0,grounded:true,alerted:true,dx:140,dy:0,speed:60};
  expect(startEnemyAction(input)?.kind).toBe('jump');
  expect(startEnemyAction({...input,grounded:false})).toBeNull();
  expect(startEnemyAction({...input,alerted:false})).toBeNull();
  expect(startEnemyAction({...input,now:500})).toBeNull();
  expect(startEnemyAction({...input,dy:200})).toBeNull();
 });
 it('warns then commits crawler rush direction and recovers',()=>{
  const action=startEnemyAction({kind:'crawler',now:3000,lastAttack:0,grounded:true,alerted:true,dx:-150,dy:0,speed:60})!;
  expect(actionMotion(action,3100,true).vx).toBe(0);
  expect(actionMotion(action,3400,true).vx).toBeLessThan(-180);
  expect(actionMotion(action,3800,true).vx).toBe(0);
  expect(actionMotion(action,4200,true).done).toBe(true);
 });
 it('launches jump once and loops four distinct boss frames',()=>{
  const action=startEnemyAction({kind:'husk',now:3000,lastAttack:0,grounded:true,alerted:true,dx:100,dy:0,speed:60})!;
  expect(actionMotion(action,3100,true).launch).toBe(false);
  expect(actionMotion(action,3350,true).launch).toBe(true);
  action.launched=true;
  expect(actionMotion(action,3400,false).launch).toBe(false);
  expect(new Set([0,150,300,450].map(t=>loopFrame(t,0,150))).size).toBe(4);
  expect(loopFrame(600,2,150)).toBe(8);
 });
});
