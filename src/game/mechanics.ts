export const PHYSICS = { gravity:1500, walk:210, run:315, acceleration:1400, friction:1800, jump:565, cut:210, coyote:110, buffer:130 };
export function advanceVelocity(v:number, axis:number, running:boolean, dt:number) {
 const target=axis*(running?PHYSICS.run:PHYSICS.walk);
 const amount=(axis?PHYSICS.acceleration:PHYSICS.friction)*dt;
 return v<target?Math.min(target,v+amount):Math.max(target,v-amount);
}
export const cutJump = (v:number) => Math.max(v,-PHYSICS.cut);
export const canJump = (now:number, groundedAt:number, pressedAt:number) => now-groundedAt<=PHYSICS.coyote && now-pressedAt<=PHYSICS.buffer;
export const isStomp = (previousBottom:number, enemyTop:number, velocityY:number) => velocityY>30 && previousBottom<=enemyTop+14;
export const initialState = () => ({big:false,hearts:3,lives:3,score:0,coins:0,tapes:0,checkpoint:110,invincibleUntil:0,abilityReady:true});
export type PlayerState = ReturnType<typeof initialState>;
export function takeHit(s:PlayerState,time:number):PlayerState {
 if(time<s.invincibleUntil) return s;
 return {...s,big:false,hearts:s.big?s.hearts:Math.max(0,s.hearts-1),invincibleUntil:time+1800};
}
export function checkpointRespawn(s:PlayerState){return {x:s.checkpoint,state:{...s,lives:Math.max(0,s.lives-1),hearts:3,big:false,invincibleUntil:0}};}
export function readProgress(raw:string|null):number[]{
 try {const parsed=JSON.parse(raw||'[]');return Array.isArray(parsed)?[...new Set(parsed.filter((n:unknown)=>Number.isInteger(n)&&Number(n)>=1&&Number(n)<=10))] as number[]:[];}catch{return [];}
}
