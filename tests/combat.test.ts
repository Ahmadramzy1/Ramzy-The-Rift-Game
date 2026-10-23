import { describe,it,expect } from 'vitest';
import { enemyStats, hitEnemy, shouldAggro, tryJump, crouchBox, canStand, useAbility, chooseTarget, readPad,clampChaseVelocity,blocksPageScroll } from '../src/game/combat';
import { initialState, checkpointRespawn } from '../src/game/mechanics';
import {WEAPONS,meleeInRange,projectileInRange} from '../src/game/weapons';
describe('two weapons',()=>{
 it('gives the sword exactly double slingshot damage and keeps the sling short range',()=>{
  expect(WEAPONS.sword.damage).toBe(WEAPONS.slingshot.damage*2);expect(WEAPONS.slingshot.range).toBeLessThanOrEqual(260);
  expect(projectileInRange(0,0,200,0)).toBe(true);expect(projectileInRange(0,0,300,0)).toBe(false);
 });
 it('only hits near targets in front of the sword',()=>{
  expect(meleeInRange(100,100,160,110,1)).toBe(true);expect(meleeInRange(100,100,210,100,1)).toBe(false);
  expect(meleeInRange(100,100,40,100,1)).toBe(false);expect(meleeInRange(100,100,40,100,-1)).toBe(true);
 });
});

describe('combat and scaling',()=>{
 it('lets boundary enemies chase inward while stopping outward movement',()=>{
  expect(clampChaseVelocity(102,100,500,80)).toBe(80);
  expect(clampChaseVelocity(102,100,500,-80)).toBe(0);
  expect(clampChaseVelocity(498,100,500,-80)).toBe(-80);
  expect(clampChaseVelocity(498,100,500,80)).toBe(0);
 });
 it('captures the down arrow so crouching cannot scroll the page',()=>{
  expect(blocksPageScroll('ArrowDown')).toBe(true);expect(blocksPageScroll('Tab')).toBe(false);
 });
 it('gives enemy families different health and increases late-stage threat',()=>{
  expect(enemyStats('crawler',1).hp).toBe(5);expect(enemyStats('bat',1).hp).toBe(4);expect(enemyStats('bloom',1).hp).toBe(10);
  expect(enemyStats('bloom',10).hp).toBeGreaterThan(enemyStats('bloom',1).hp);
  expect(enemyStats('crawler',10).speed).toBeGreaterThan(enemyStats('crawler',1).speed);
 });
 it('adds two base HP and one more HP on every successive stage',()=>{
  const cases=[['crawler',5],['bat',4],['husk',7],['slime',8],['bloom',10]] as const;
  for(const [kind,base] of cases)for(let stage=1;stage<=10;stage++)expect(enemyStats(kind,stage).hp).toBe(base+stage-1);
 });
 it('requires multiple shots, clamps hp and prevents repeated hit during cooldown',()=>{
  const e={hp:3,invulnerableUntil:0};
  const first=hitEnemy(e,1,1000);expect(first.hp).toBe(2);
  expect(hitEnemy(first,1,1040).hp).toBe(2);
  const last=hitEnemy(first,9,1500);expect(last.hp).toBe(0);
 });
 it('only chases a visible hero inside the aggro radius',()=>{
  expect(shouldAggro(100,50,240,true)).toBe(true);expect(shouldAggro(100,50,240,false)).toBe(false);
  expect(shouldAggro(300,10,240,true)).toBe(false);
 });
});
describe('jump and crouch',()=>{
 it('allows a second jump after takeoff, blocks a third, and resets on landing',()=>{
  const first=tryJump(0,true);expect(first?.used).toBe(1);
  const second=tryJump(1,false);expect(second).toEqual({used:2,velocity:-505});
  expect(tryJump(0,false)).toBeNull();
  expect(tryJump(2,false)).toBe(null);expect(tryJump(2,true)?.used).toBe(1);
 });
 it('keeps the feet fixed when crouching and refuses to stand under a ceiling',()=>{
  expect(crouchBox(false).height+crouchBox(false).offsetY).toBe(104);
  expect(crouchBox(true).height+crouchBox(true).offsetY).toBe(104);
  expect(canStand({x:110,feet:460,width:27,height:60},[{x:90,y:390,w:70,h:26}])).toBe(false);
  expect(canStand({x:210,feet:460,width:27,height:60},[{x:90,y:390,w:70,h:26}])).toBe(true);
 });
});
describe('single use telekinesis',()=>{
 it('consumes its charge only when there is a valid target and keeps it spent after respawn',()=>{
  const s={...initialState(),abilityReady:true};expect(useAbility(s,false).abilityReady).toBe(true);
  const used=useAbility(s,true);expect(used.abilityReady).toBe(false);
  expect(useAbility(used,true)).toBe(used);
  expect(checkpointRespawn(used).state.abilityReady).toBe(false);
 });
 it('targets the nearest living enemy within range',()=>{
  const enemies=[{x:600,y:0,alive:true},{x:60,y:0,alive:false},{x:120,y:0,alive:true}];
  expect(chooseTarget(0,0,enemies,480)).toBe(2);expect(chooseTarget(0,0,enemies,80)).toBe(-1);
 });
});
describe('standard gamepad mapping',()=>{
 it('maps stick/deadzone, dpad, jump, shoot, crouch, ability and pause',()=>{
  expect(readPad([.1,0],[]).axis).toBe(0);
  const b=Array(16).fill(false);b[0]=b[2]=b[3]=b[9]=b[13]=true;
  const c=readPad([-.9,0],b);expect(c.axis).toBe(-1);expect(c.jump).toBe(true);expect(c.shoot).toBe(true);expect(c.crouch).toBe(true);expect(c.ability).toBe(true);expect(c.pause).toBe(true);
 });
});
