/** Pure boss encounter rules. All clocks are scene milliseconds. */
export type MFMode='idle'|'telegraph'|'stuck'|'exposed';
export type MFAttack='slam'|'double-slam'|'sweep';
export interface MFState {
 mode:MFMode;
 until:number;
 cutArms:0|1|2;
 attackIndex:number;
 /** The arm currently targeted; changes only after a successful cut. */
 side:-1|1;
 /** One time extension per stuck arm, shared by psychic and pellets. */
 holdUsed:boolean;
}
export interface MFContext {active:boolean;hpRatio:number;variant?:boolean}

export function makeMF(now:number):MFState {
 return {mode:'idle',until:now+1000,cutArms:0,attackIndex:0,side:-1,holdUsed:false};
}

export function mfAttackForCycle(hpRatio:number,index:number,variant=false):MFAttack {
 return hpRatio<.5||variant?(index%2===0?'double-slam':'sweep'):'slam';
}

/** Advance at most one phase per frame: delayed frames cannot erase a cue. */
export function tickMF(state:MFState,now:number,context:MFContext):MFState {
 if(!context.active||now<state.until)return state;
 const pressure=context.hpRatio<.5||context.variant;
 switch(state.mode){
  case 'idle':return {...state,mode:'telegraph',until:now+(pressure?750:1000),holdUsed:false};
  case 'telegraph':return {...state,mode:'stuck',until:now+2400,attackIndex:state.attackIndex+1};
  case 'stuck':return {...state,mode:'idle',until:now+(pressure?900:1400),holdUsed:false};
  case 'exposed':return {...state,mode:'idle',until:now+1400,cutArms:0,holdUsed:false};
 }
}

export function hitArm(state:MFState,weapon:'sword'|'slingshot',now:number):MFState {
 if(state.mode!=='stuck'||now>=state.until)return state;
 if(weapon==='slingshot')return holdArm(state,now,1000);
 if(state.cutArms===0)return {...state,mode:'idle',until:now+900,cutArms:1,side:state.side===-1?1:-1,holdUsed:false};
 return {...state,mode:'exposed',until:now+4000,cutArms:2,holdUsed:false};
}

function holdArm(state:MFState,now:number,duration:number):MFState {
 if(state.mode!=='stuck'||now>=state.until||state.holdUsed)return state;
 return {...state,until:state.until+duration,holdUsed:true};
}

export function psiMF(state:MFState,now:number):MFState {
 return holdArm(state,now,1400);
}

export function mfCanTakeDamage(state:MFState,now:number):boolean {
 return state.mode==='exposed'&&now<state.until;
}

/** The planted hand is physical danger; the warning and severed remnant are safe. */
export function mfArmTouchesPlayer(state:MFState,now:number,x:number,floor:number,body:{left:number;right:number;top:number;bottom:number}):boolean{
 return state.mode==='stuck'&&now<state.until&&body.right>x-27&&body.left<x+27&&body.bottom>floor-105&&body.top<floor;
}

export type VecnaPhase=1|2|3;
export type VecnaAttack='leap'|'low-wave'|'high-wave'|'psychic';
export function phaseForHP(hpRatio:number):VecnaPhase {
 return hpRatio<=.33?3:hpRatio<=.66?2:1;
}

const VECNA_PATTERNS:Record<VecnaPhase,readonly VecnaAttack[]>={
 1:['leap','low-wave','psychic'],
 2:['leap','high-wave','psychic','low-wave'],
 3:['leap','high-wave','low-wave','psychic','leap'],
};
export function attackForCycle(phase:VecnaPhase,index:number):VecnaAttack {
 const pattern=VECNA_PATTERNS[phase];
 return pattern[((Math.floor(index)%pattern.length)+pattern.length)%pattern.length];
}

export function vecnaCueMs(attack:VecnaAttack,phase:VecnaPhase):number {
 const base=attack==='psychic'?1300:attack==='leap'?1100:950;
 return base-(phase-1)*150;
}

export interface VecnaWindow {exposedUntil:number;psychicUsed:boolean}
export function makeVecnaWindow():VecnaWindow {
 return {exposedUntil:0,psychicUsed:false};
}

/** Electric landings rearm the optional psychic counter; neither refreshes an open window. */
export function exposeVecna(state:VecnaWindow,now:number,source:'electric-device'|'psychic'):VecnaWindow {
 if(now<state.exposedUntil)return state;
 if(source==='psychic')return state.psychicUsed?state:{exposedUntil:now+1400,psychicUsed:true};
 return {exposedUntil:now+4000,psychicUsed:false};
}

export function vecnaCanTakeDamage(state:VecnaWindow,now:number):boolean {
 return now<state.exposedUntil;
}
