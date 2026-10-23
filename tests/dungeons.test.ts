import {describe,it,expect} from 'vitest';
import {STAGES,DUNGEONS,routeReachable} from '../src/game/levels';
import {canUseDungeonDoor,hasGroundSupport} from '../src/game/dungeons';
import {tryJump} from '../src/game/combat';
describe('ground-only jump and dungeon entrances',()=>{
 it('never grants a first jump after walking off an edge, but permits a true double jump',()=>{expect(tryJump(0,false)).toBeNull();expect(tryJump(1,false)?.used).toBe(2);expect(tryJump(2,false)).toBeNull();expect(tryJump(0,true)?.velocity).toBe(-565);});
 it('requires actual ground below the feet, even when the last physics tick said grounded',()=>{expect(hasGroundSupport({left:98,right:118,bottom:458},[{x:0,y:458,w:100}])).toBe(true);expect(hasGroundSupport({left:101,right:121,bottom:459},[{x:0,y:458,w:100}])).toBe(false);expect(hasGroundSupport({left:20,right:40,bottom:420},[{x:0,y:458,w:100}])).toBe(false);});
 it('only enters doors while close, grounded and pressing interact',()=>{expect(canUseDungeonDoor(1485,458,1490,458,true,true)).toBe(true);expect(canUseDungeonDoor(1485,458,1490,458,true,false)).toBe(false);expect(canUseDungeonDoor(1400,458,1490,458,true,true)).toBe(false);expect(canUseDungeonDoor(1485,400,1490,458,false,true)).toBe(false);});
 it('keeps every entrance and return landing clear of spikes',()=>{for(const stage of STAGES)for(const h of stage.hazards){expect(stage.dungeonX+25<h.x||stage.dungeonX-20>h.x+h.w).toBe(true);}});
 it('provides a grounded entrance and a reachable, harder dungeon for all ten stages',()=>{expect(DUNGEONS).toHaveLength(10);for(const stage of STAGES){const x=stage.dungeonX;expect(stage.platforms.some(p=>!p.kind&&x>p.x+45&&x<p.x+p.w-45)).toBe(true);const dungeon=DUNGEONS[stage.id-1];if(stage.id===5)expect(dungeon.enemies).toHaveLength(5);else expect(dungeon.enemies.length).toBeGreaterThan(stage.enemies.length);expect(routeReachable(dungeon)).toBe(true);expect(dungeon.exit).toBeLessThan(dungeon.width);}});
});

describe('stage encounter and coin progression',()=>{
 it('introduces the same enemy families in main routes and dungeons',()=>{
  const unlocked=[['crawler'],['bat','crawler'],['bat','crawler','husk','slime'],['bat','crawler','husk','slime'],['bat','crawler','husk','slime'],['bat','bloom','crawler','husk','slime']];
  for(const stages of [STAGES,DUNGEONS])for(const stage of stages)expect([...new Set(stage.enemies.filter(e=>e.kind!=='mindflayer'&&e.kind!=='billy'&&e.kind!=='vecna').map(e=>e.kind))].sort()).toEqual(unlocked[Math.min(stage.id-1,5)]);
 });
 it('keeps coins evenly spaced above every reachable room as routes grow',()=>{
  for(const stage of [...STAGES,...DUNGEONS]){
   const route=stage.platforms.filter(p=>!p.kind);
   expect(routeReachable(stage)).toBe(true);
   expect(stage.coins).toHaveLength(DUNGEONS.includes(stage)?route.reduce((sum,_,j)=>sum+4+j%2,0):route.length*6);
   for(const p of route){
    const coins=stage.coins.filter(c=>c.x>p.x&&c.x<p.x+p.w).sort((a,b)=>a.x-b.x);
    expect(coins.length).toBeGreaterThanOrEqual(4);
    for(const c of coins)expect(p.y-c.y).toBeGreaterThanOrEqual(80);
    for(let j=2;j<coins.length;j++)expect(coins[j].x-coins[j-1].x).toBeCloseTo(coins[1].x-coins[0].x);
   }
  }
 });
});
