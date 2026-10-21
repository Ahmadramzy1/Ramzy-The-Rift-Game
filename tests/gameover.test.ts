import {describe,it,expect} from 'vitest';
import {gameOverTransition,gameOverDelay,shouldPlayGameOver} from '../src/game/gameover';
import {initialState,checkpointRespawn} from '../src/game/mechanics';
describe('final-life cinematic',()=>{
 it('only triggers after the third life is spent',()=>{let state=initialState();for(let i=1;i<=3;i++){state=checkpointRespawn(state).state;expect(shouldPlayGameOver(state.lives<=0?'gameover':'dead',state.lives)).toBe(i===3);}});
 it('waits for the video to end before displaying the title',()=>{expect(gameOverTransition('burst','timer')).toBe('black');expect(gameOverTransition('black','timer')).toBe('video');expect(gameOverTransition('video','timer')).toBe('video');expect(gameOverTransition('video','ended')).toBe('title-black');expect(gameOverTransition('title-black','timer')).toBe('title');});
 it('holds the title then fades to black before returning to the map',()=>{expect(gameOverDelay('title')).toBeGreaterThanOrEqual(3000);expect(gameOverTransition('title','timer')).toBe('leave');expect(gameOverTransition('leave','timer')).toBe('done');expect(gameOverTransition('video','error')).toBe('title-black');});
});
