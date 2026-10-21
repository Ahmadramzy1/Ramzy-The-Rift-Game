import {describe,it,expect} from 'vitest';
import {STAGES,DUNGEONS,routeReachable} from '../src/game/levels';
import {canUseDungeonDoor,hasGroundSupport} from '../src/game/dungeons';
import {tryJump} from '../src/game/combat';
describe('ground-only jump and dungeon entrances',()=>{
 it('never grants a jump after walking off an edge or during an existing jump',()=>{expect(tryJump(0,false)).toBeNull();expect(tryJump(1,false)).toBeNull();expect(tryJump(0,true)?.velocity).toBe(-565);});
 it('requires actual ground below the feet, even when the last physics tick said grounded',()=>{expect(hasGroundSupport({left:98,right:118,bottom:458},[{x:0,y:458,w:100}])).toBe(true);expect(hasGroundSupport({left:101,right:121,bottom:459},[{x:0,y:458,w:100}])).toBe(false);expect(hasGroundSupport({left:20,right:40,bottom:420},[{x:0,y:458,w:100}])).toBe(false);});
 it('only enters doors while close, grounded and pressing interact',()=>{expect(canUseDungeonDoor(1485,458,1490,458,true,true)).toBe(true);expect(canUseDungeonDoor(1485,458,1490,458,true,false)).toBe(false);expect(canUseDungeonDoor(1400,458,1490,458,true,true)).toBe(false);expect(canUseDungeonDoor(1485,400,1490,458,false,true)).toBe(false);});
 it('keeps every entrance and return landing clear of spikes',()=>{for(const stage of STAGES)for(const h of stage.hazards){expect(stage.dungeonX+25<h.x||stage.dungeonX-20>h.x+h.w).toBe(true);}});
 it('provides a grounded entrance and a reachable, harder dungeon for all ten stages',()=>{expect(DUNGEONS).toHaveLength(10);for(const stage of STAGES){const x=stage.dungeonX;expect(stage.platforms.some(p=>!p.kind&&x>p.x+45&&x<p.x+p.w-45)).toBe(true);const dungeon=DUNGEONS[stage.id-1];expect(dungeon.enemies.length).toBeGreaterThan(stage.enemies.length);expect(routeReachable(dungeon)).toBe(true);expect(dungeon.exit).toBeLessThan(dungeon.width);}});
});
