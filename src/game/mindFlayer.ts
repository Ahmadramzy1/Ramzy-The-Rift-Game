import type {PlayerState} from './mechanics';
export const MIND_FLAYER={hp:30,interval:5000,windup:650,waveSpeed:270,waveRange:700,damage:2};
export function waveHitsPlayer(wave:{x:number;y:number},player:{left:number;right:number;bottom:number},grounded:boolean){
 return grounded&&Math.abs(player.bottom-wave.y)<=12&&player.right>=wave.x-18&&player.left<=wave.x+18;
}
export function takeWaveHit(state:PlayerState,now:number):PlayerState{
 return now<state.invincibleUntil?state:{...state,big:false,hearts:Math.max(0,state.hearts-MIND_FLAYER.damage),invincibleUntil:now+1800};
}
