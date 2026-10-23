import type {PlayerState} from './mechanics';
export const VECNA={hp:100,interval:3000,windup:500,firstLeapDelay:900,aggroRange:1100,flight:900,jumpHeight:160,damage:3,slamRadius:65,waveSpeed:340,waveRange:900};
export function vecnaLandingHits(x:number,y:number,body:{left:number;right:number;top:number;bottom:number}){
 return body.right>=x-VECNA.slamRadius&&body.left<=x+VECNA.slamRadius&&body.bottom>=y-70&&body.top<=y+12;
}
export function takeVecnaHit(state:PlayerState,now:number):PlayerState{
 return now<state.invincibleUntil?state:{...state,big:false,hearts:Math.max(0,state.hearts-VECNA.damage),invincibleUntil:now+1800};
}
