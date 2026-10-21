import { describe, it, expect } from 'vitest';
import { advanceVelocity, cutJump, canJump, isStomp, takeHit, initialState, checkpointRespawn, readProgress } from '../src/game/mechanics';
import { STAGES, routeReachable } from '../src/game/levels';

describe('classic movement',()=>{
 it('accelerates and caps walking and running speeds',()=>{
  let v=0; for(let i=0;i<120;i++) v=advanceVelocity(v,1,false,1/60);
  expect(v).toBe(210);
  for(let i=0;i<120;i++) v=advanceVelocity(v,1,true,1/60);
  expect(v).toBe(315);
  for(let i=0;i<120;i++) v=advanceVelocity(v,0,false,1/60);
  expect(v).toBe(0);
 });
 it('reverses with acceleration instead of teleporting velocity',()=>{
  expect(advanceVelocity(210,-1,true,1/60)).toBeGreaterThan(0);
 });
 it('cuts upward speed on release without changing a fall',()=>{
  expect(cutJump(-540)).toBe(-210); expect(cutJump(100)).toBe(100);
 });
 it('allows coyote and buffered jumps only in their windows',()=>{
  expect(canJump(1000,920,950)).toBe(true);
  expect(canJump(1000,850,950)).toBe(false);
  expect(canJump(1000,990,800)).toBe(false);
 });
 it('only stomps while falling from above, never from the side',()=>{
  expect(isStomp(180,195,120)).toBe(true);
  expect(isStomp(220,195,120)).toBe(false);
  expect(isStomp(180,195,-100)).toBe(false);
 });
});

describe('damage and checkpoints',()=>{
 it('growth absorbs a hit then grants immunity',()=>{
  const s={...initialState(),big:true};
  const hit=takeHit(s,1000);expect(hit.big).toBe(false);expect(hit.hearts).toBe(3);
  expect(takeHit(hit,1500)).toEqual(hit);
  expect(takeHit(hit,3000).hearts).toBe(2);
 });
 it('respawns at the checkpoint, resets power, consumes a life',()=>{
  const s={...initialState(),checkpoint:1620,big:true};
  const r=checkpointRespawn(s);expect(r.x).toBe(1620);expect(r.state.lives).toBe(2);expect(r.state.big).toBe(false);
 });
 it('rejects corrupt and unbounded saved progression',()=>{
  expect(readProgress('broken')).toEqual([]);
  expect(readProgress('[1,2,999,-1,"3",2]')).toEqual([1,2]);
 });
});

describe('ten original routes',()=>{
 it('provides ten named stages with distinct layouts and reachable exits',()=>{
  expect(STAGES).toHaveLength(10);
  expect(new Set(STAGES.map(s=>JSON.stringify(s.platforms))).size).toBe(10);
  for(const stage of STAGES){
   expect(routeReachable(stage),stage.name).toBe(true);
   expect(stage.checkpoint).toBeGreaterThan(400);
   expect(stage.exit).toBeLessThan(stage.width);
  }
 });
});
