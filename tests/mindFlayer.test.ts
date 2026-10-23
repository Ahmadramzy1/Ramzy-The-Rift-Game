import {it,expect} from 'vitest';
import {MIND_FLAYER,waveHitsPlayer,takeWaveHit} from '../src/game/mindFlayer';
import {initialState} from '../src/game/mechanics';
import {enemyStats} from '../src/game/combat';
import {STAGES,DUNGEONS} from '../src/game/levels';
it('adds one 60HP boss to stage three, with a five second attack and no normal health multiplier',()=>{
 expect(STAGES.filter(s=>s.enemies.some(e=>e.kind==='mindflayer')).map(s=>s.id)).toEqual([3]);
 expect(STAGES[2].enemies.filter(e=>e.kind==='mindflayer')).toHaveLength(1);
 expect(DUNGEONS.every(s=>s.enemies.every(e=>e.kind!=='mindflayer'))).toBe(true);
 expect(enemyStats('mindflayer',3).hp).toBe(60);expect(MIND_FLAYER.hp).toBe(60);expect(MIND_FLAYER.interval).toBe(5000);
});
it('hits feet on the wave platform but can be avoided by jumping or using an upper platform',()=>{
 const wave={x:200,y:458},player={left:190,right:215,bottom:458};
 expect(waveHitsPlayer(wave,player,true)).toBe(true);
 expect(waveHitsPlayer(wave,player,false)).toBe(false);
 expect(waveHitsPlayer(wave,{...player,bottom:400},true)).toBe(false);
 expect(waveHitsPlayer(wave,{...player,left:250,right:275},true)).toBe(false);
});
it('removes two hearts, preserves lives, clamps at zero and respects invincibility',()=>{
 const state={...initialState(),big:true},hit=takeWaveHit(state,5000);
 expect(hit.hearts).toBe(1);expect(hit.lives).toBe(3);expect(takeWaveHit(hit,5100)).toBe(hit);
 expect(takeWaveHit({...state,hearts:1},5000).hearts).toBe(0);
});
