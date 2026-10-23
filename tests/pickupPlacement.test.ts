import {expect,it} from 'vitest';
import {DUNGEONS,STAGES,type Stage} from '../src/game/levels';
import {medkitPlacement} from '../src/game/pickupPlacement';

function assertSafe(stage:Stage){
 const {x,y}=medkitPlacement(stage);
 const solids=[...stage.platforms,...stage.ceilings];
 expect(solids.some(p=>x>=p.x+17&&x<=p.x+p.w-17&&y===p.y-58)).toBe(true);
 for(const p of solids){
  const overlapsX=x+15>p.x&&x-15<p.x+p.w;
  expect(overlapsX&&y+22>p.y&&y-22<p.y+28).toBe(false);
 }
 for(const hazard of stage.hazards)expect(x+15>hazard.x&&x-15<hazard.x+hazard.w).toBe(false);
 return {x,y};
}

it('puts the first stage medkit above the optional floating platform',()=>{
 expect(assertSafe(STAGES[0])).toEqual({x:2320,y:314});
});

it('clamps gap placements to a reachable safe platform margin and clears ceiling tops',()=>{
 const stage:Stage={...STAGES[0],checkpoint:100,platforms:[{x:0,y:458,w:200},{x:300,y:458,w:300}],ceilings:[{x:310,y:382,w:100}],hazards:[{x:300,y:458,w:35}]};
 expect(assertSafe(stage)).toEqual({x:352,y:324});
});

it('keeps bobbing medkits clear of terrain and spikes across all 20 authored areas without mutation',()=>{
 const stages=[...STAGES,...DUNGEONS];
 const before=JSON.stringify(stages);
 expect(stages).toHaveLength(20);
 for(const stage of stages){
  const placement=assertSafe(stage);
  expect(Math.abs(placement.x-(stage.checkpoint+180))).toBeLessThan(200);
 }
 expect(JSON.stringify(stages)).toBe(before);
});
