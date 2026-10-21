import {it,expect} from 'vitest';
import {highestUnlocked,isUnlocked,loadVolumes} from '../src/game/progression';
it('only unlocks the next contiguous completed stage, never trusts gaps',()=>{
 expect(highestUnlocked([])).toBe(1);expect(highestUnlocked([1])).toBe(2);expect(highestUnlocked([1,2,3])).toBe(4);expect(highestUnlocked([1,3,9])).toBe(2);expect(highestUnlocked([1,2,3,4,5,6,7,8,9,10])).toBe(10);
 expect(isUnlocked(2,[])).toBe(false);expect(isUnlocked(1,[])).toBe(true);expect(isUnlocked(11,[1,2,3])).toBe(false);
});
it('restores bounded independent music and effects volumes from corrupt settings',()=>{
 expect(loadVolumes('broken')).toEqual({sfx:.65,music:.3});expect(loadVolumes('{"sfx":4,"music":-1}')).toEqual({sfx:1,music:0});expect(loadVolumes('{"sfx":0.2,"music":0.8}')).toEqual({sfx:.2,music:.8});
});
