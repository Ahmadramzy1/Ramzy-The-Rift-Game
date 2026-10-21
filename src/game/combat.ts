import type {EnemyKind} from './levels';
import type {PlayerState} from './mechanics';
export const clampChaseVelocity=(x:number,min:number,max:number,v:number)=>(x<=min+5&&v<0)||(x>=max-5&&v>0)?0:v;
export const blocksPageScroll=(key:string)=>['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(key);
export function enemyStats(kind:EnemyKind,stage:number){
 const hp={crawler:2,bat:1,husk:3,slime:4,bloom:5}[kind]+Math.floor((stage-1)/3);
 return {hp,speed:48+stage*6+(kind==='bat'?20:0),aggro:245+stage*12,cooldown:Math.max(900,2200-stage*110)};
}
export function hitEnemy<T extends {hp:number;invulnerableUntil:number}>(e:T,damage:number,now:number):T{
 return now<e.invulnerableUntil?e:{...e,hp:Math.max(0,e.hp-damage),invulnerableUntil:now+160};
}
export const shouldAggro=(dx:number,dy:number,radius:number,visible:boolean)=>visible&&Math.hypot(dx,dy)<radius;
export const tryJump=(used:number,ground:boolean):{used:number;velocity:number}|null=>ground?{used:1,velocity:-565}:used<2?{used:2,velocity:-505}:null;
export const crouchBox=(big:boolean)=>({height:big?43:32,offsetY:big?61:72,width:big?36:27,offsetX:big?30:35});
export const canStand=(player:{x:number;feet:number;width:number;height:number},blocks:{x:number;y:number;w:number;h:number}[])=>!blocks.some(b=>player.x+player.width/2>b.x&&player.x-player.width/2<b.x+b.w&&player.feet-player.height<b.y+b.h&&player.feet>b.y+1);
export const useAbility=(s:PlayerState,hasTarget:boolean)=>s.abilityReady&&hasTarget?{...s,abilityReady:false}:s;
export function chooseTarget(x:number,y:number,targets:{x:number;y:number;alive:boolean}[],range:number){let best=-1,distance=range;targets.forEach((t,i)=>{const d=Math.hypot(t.x-x,t.y-y);if(t.alive&&d<distance){best=i;distance=d;}});return best;}
export function readPad(axes:readonly number[],buttons:readonly boolean[]){
 const b=(i:number)=>!!buttons[i];const stick=axes[0]||0;
 return {axis:b(14)?-1:b(15)?1:Math.abs(stick)>.2?Math.sign(stick):0,jump:b(0),shoot:b(2)||b(7),crouch:b(13)||(axes[1]||0)>.5,ability:b(3),pause:b(9),run:b(1)||b(5)};
}
