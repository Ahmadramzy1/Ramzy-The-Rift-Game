import {describe,it,expect} from 'vitest';
import {LoopingMusic} from '../src/game/music';
function fixture(){
 const voices:any[]=[];
 const context:any={currentTime:0,createGain(){const calls:any[]=[];return {gain:{value:0,setValueAtTime:(...a:any[])=>calls.push(['set',...a]),linearRampToValueAtTime:(...a:any[])=>calls.push(['ramp',...a]),cancelAndHoldAtTime:(...a:any[])=>calls.push(['hold',...a])},calls,connect(){},disconnect(){}};},createBufferSource(){const s:any={connect(g:any){s.gain=g;},disconnect(){},start(t:number){s.startAt=t;},stop(t:number){s.stopAt=t;}};voices.push(s);return s;}};
 return {context,voices,music:new LoopingMusic(context,{} as GainNode,{duration:10} as AudioBuffer)};
}
describe('soundtrack transport',()=>{
 it('starts at offset zero and schedules an overlapping, faded loop ahead of time',()=>{const {music,voices}=fixture();music.start();expect(voices).toHaveLength(2);expect(voices[0].startAt).toBe(0);expect(voices[1].startAt).toBe(9);expect(voices[0].gain.calls).toContainEqual(['ramp',0,10]);voices[0].onended();expect(voices[2].startAt).toBe(18);});
 it('does not layer music when navigating menus',()=>{const {music,voices}=fixture();music.start();music.start();expect(voices).toHaveLength(2);});
 it('fades existing and queued sources before a fresh stage starts',()=>{const {music,voices,context}=fixture();music.start();context.currentTime=3;music.start(true);expect(voices[0].stopAt).toBeCloseTo(3.45);expect(voices[1].stopAt).toBeCloseTo(3.45);expect(voices[2].startAt).toBeCloseTo(3.45);voices[0].onended();expect(voices).toHaveLength(4);});
 it('stops with a fade and never schedules another loop after exit',()=>{const {music,voices,context}=fixture();music.start();context.currentTime=4;music.stop();expect(voices[0].gain.calls).toContainEqual(['ramp',0,4.45]);voices[0].onended();expect(voices).toHaveLength(2);});
});
