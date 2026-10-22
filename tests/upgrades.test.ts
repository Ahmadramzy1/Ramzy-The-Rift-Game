import {describe,it,expect} from 'vitest';
import {slingshotStats,swordDamage,swordAimInRange,canDoubleJump,DOUBLE_JUMP_COOLDOWN,stageCoinBonus} from '../src/game/weapons';
describe('purchased combat upgrades',()=>{
 it('fires two pellets at level two and two stronger burning pellets at level three',()=>{
  expect(slingshotStats(1)).toEqual({pellets:1,damage:1,fire:false});
  expect(slingshotStats(2)).toEqual({pellets:2,damage:1,fire:false});
  expect(slingshotStats(3)).toEqual({pellets:2,damage:2,fire:true});
  expect(swordDamage(2)).toBe(swordDamage(1)*3);
 });
 it('aims the sword up, down and left while excluding targets behind the blade or outside reach',()=>{
  expect(swordAimInRange(100,100,100,40,-Math.PI/2)).toBe(true);
  expect(swordAimInRange(100,100,100,160,Math.PI/2)).toBe(true);
  expect(swordAimInRange(100,100,40,100,Math.PI)).toBe(true);
  expect(swordAimInRange(100,100,160,100,Math.PI)).toBe(false);
  expect(swordAimInRange(100,100,100,200,Math.PI/2)).toBe(false);
 });
 it('requires an unlocked grounded takeoff and ten seconds between aerial jumps',()=>{
  expect(DOUBLE_JUMP_COOLDOWN).toBe(10000);
  expect(canDoubleJump(false,1,20000,0)).toBe(false);
  expect(canDoubleJump(true,0,20000,0)).toBe(false);
  expect(canDoubleJump(true,1,9999,10000)).toBe(false);
  expect(canDoubleJump(true,1,10000,10000)).toBe(true);
  expect(canDoubleJump(true,2,20000,0)).toBe(false);
 });
 it('adds only an equal bonus for collected stage coins, including dungeon coins',()=>{
  expect(stageCoinBonus(12,7,false)).toBe(0);expect(stageCoinBonus(12,7,true)).toBe(19);
 });
});
