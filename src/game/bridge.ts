import type { PlayerState } from './mechanics';
import {playSound,type SoundKind} from './audio';
import type {WeaponKind} from './weapons';
export type Status = 'ready'|'playing'|'paused'|'dead'|'complete'|'gameover';
export type Hud = PlayerState & {stage:number;progress:number;status:Status;time:number;notice:string;gamepad?:boolean;charges?:number;slingshotLevel?:1|2|3;swordLevel?:1|2;doubleJumpUnlocked?:boolean;doubleJumpCooldown?:number;coinMultiplier?:number;weapon?:WeaponKind;area?:'main'|'dungeon';dungeonCleared?:boolean;dungeonRemaining?:number;totalCoins?:number;totalRadios?:number};
export const commands = new EventTarget();
export const updates = new EventTarget();
export function command(type:string,detail:unknown = {}){commands.dispatchEvent(new CustomEvent(type,{detail}));}
export const touch = {left:false,right:false,jump:false,run:false,crouch:false,shoot:false,ability:false,weapon:false};
export const settings = {sound:true,menuOpen:false,reducedMotion:typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches};

export function sound(kind:SoundKind){if(settings.sound)playSound(kind);}
