import {it,expect} from 'vitest';
import {makeMF,mfArmTouchesPlayer} from '../src/game/bossRules';
it('only the active planted unsevered hand damages an overlapping hero',()=>{
 const state={...makeMF(0),mode:'stuck' as const,until:4000};
 const body={left:75,right:105,top:440,bottom:500};
 expect(mfArmTouchesPlayer(state,1000,100,500,body)).toBe(true);
 expect(mfArmTouchesPlayer({...state,mode:'telegraph'},1000,100,500,body)).toBe(false);
 expect(mfArmTouchesPlayer({...state,mode:'idle',cutArms:1},1000,100,500,body)).toBe(false);
 expect(mfArmTouchesPlayer(state,4000,100,500,body)).toBe(false);
 expect(mfArmTouchesPlayer(state,1000,250,500,body)).toBe(false);
 expect(mfArmTouchesPlayer(state,1000,100,500,{...body,top:300,bottom:360})).toBe(false);
});
