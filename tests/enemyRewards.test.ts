import {expect,it} from 'vitest';
import {enemyCoinReward} from '../src/game/rewards';
it('awards two for ordinary enemies, five for strong enemies, forty for minibosses and eighty for bosses',()=>{
 expect(['crawler','bat','husk','slime','bloom','billy','mindflayer','vecna'].map(k=>enemyCoinReward(k as Parameters<typeof enemyCoinReward>[0]))).toEqual([2,2,5,5,5,5,40,80]);
});
