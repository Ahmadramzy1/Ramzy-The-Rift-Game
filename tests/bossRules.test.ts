import {describe,it,expect} from 'vitest';
import {makeMF,tickMF,hitArm,psiMF,mfCanTakeDamage,mfAttackForCycle,phaseForHP,attackForCycle,vecnaCueMs,makeVecnaWindow,exposeVecna,vecnaCanTakeDamage} from '../src/game/bossRules';

const fight={active:true,hpRatio:1};
function stuck(now=0){
 const waiting=makeMF(now);
 const warning=tickMF(waiting,waiting.until,fight);
 return tickMF(warning,warning.until,fight);
}

describe('Mind Flayer armor cycle',()=>{
 it('telegraphs before the arm sticks and never advances while inactive',()=>{
  const state=makeMF(100);
  expect(tickMF(state,state.until,{...fight,active:false})).toBe(state);
  const warning=tickMF(state,state.until,fight);
  expect(warning.mode).toBe('telegraph');
  expect(tickMF(warning,warning.until-1,fight)).toBe(warning);
  expect(tickMF(warning,warning.until,fight).mode).toBe('stuck');
  expect(mfCanTakeDamage(warning,warning.until-1)).toBe(false);
 });
 it('requires two separate sword cuts, then exposes the core for four seconds',()=>{
  const first=stuck();
  const cut=hitArm(first,'sword',first.until-1);
  expect(cut.cutArms).toBe(1);
  expect(cut.side).toBe(-first.side);
  expect(mfCanTakeDamage(cut,cut.until-1)).toBe(false);
  expect(hitArm(cut,'sword',cut.until-1)).toBe(cut);
  const warning=tickMF(cut,cut.until,fight);
  const second=tickMF(warning,warning.until,fight);
  const now=second.until-1;
  const exposed=hitArm(second,'sword',now);
  expect(exposed.cutArms).toBe(2);
  expect(mfCanTakeDamage(exposed,now+3999)).toBe(true);
  expect(mfCanTakeDamage(exposed,now+4000)).toBe(false);
  const rearmed=tickMF(exposed,now+4000,fight);
  expect(rearmed.mode).toBe('idle');
  expect(rearmed.cutArms).toBe(0);
 });
 it('pellets and psychic holds buy bounded time without cutting or allowing infinite stun',()=>{
  const arm=stuck(),now=arm.until-1;
  const pellet=hitArm(arm,'slingshot',now);
  expect(pellet.until).toBe(arm.until+1000);
  expect(pellet.cutArms).toBe(0);
  expect(hitArm(pellet,'slingshot',now)).toBe(pellet);
  expect(psiMF(pellet,now)).toBe(pellet);
  const psychic=psiMF(arm,now);
  expect(psychic.until).toBe(arm.until+1400);
  expect(psychic.cutArms).toBe(0);
  expect(psiMF(psychic,now)).toBe(psychic);
  expect(hitArm(arm,'sword',arm.until)).toBe(arm);
 });
 it('increases pressure below half health and in the second mini boss variant',()=>{
  expect(mfAttackForCycle(1,1,false)).toBe('slam');
  expect(mfAttackForCycle(.49,1,false)).toBe('sweep');
  expect(mfAttackForCycle(.49,2,false)).toBe('double-slam');
  expect(mfAttackForCycle(1,1,true)).toBe('sweep');
  const normal=tickMF(makeMF(0),1000,fight);
  const pressured=tickMF(makeMF(0),1000,{...fight,variant:true});
  expect(pressured.until).toBeLessThan(normal.until);
  expect(pressured.until-1000).toBeGreaterThanOrEqual(650);
 });
});

describe('Vecna counter windows',()=>{
 it('changes attack patterns across three HP phases with a readable minimum cue',()=>{
  expect([phaseForHP(1),phaseForHP(.67),phaseForHP(.66),phaseForHP(.34),phaseForHP(.33)]).toEqual([1,1,2,2,3]);
  expect([0,1,2,3].map(i=>attackForCycle(1,i))).toEqual(['leap','low-wave','psychic','leap']);
  expect([0,1,2,3].map(i=>attackForCycle(2,i))).toEqual(['leap','high-wave','psychic','low-wave']);
  expect([0,1,2,3,4].map(i=>attackForCycle(3,i))).toEqual(['leap','high-wave','low-wave','psychic','leap']);
  for(const attack of ['leap','high-wave','low-wave','psychic'] as const){
   expect(vecnaCueMs(attack,3)).toBeGreaterThanOrEqual(650);
   expect(vecnaCueMs(attack,1)).toBeGreaterThanOrEqual(vecnaCueMs(attack,3));
  }
 });
 it('blocks armored damage and grants exactly four seconds after an electric landing',()=>{
  const armor=makeVecnaWindow();
  expect(vecnaCanTakeDamage(armor,100)).toBe(false);
  const open=exposeVecna(armor,100,'electric-device');
  expect(vecnaCanTakeDamage(open,4099)).toBe(true);
  expect(vecnaCanTakeDamage(open,4100)).toBe(false);
  expect(exposeVecna(open,200,'psychic')).toBe(open);
  expect(exposeVecna(open,200,'electric-device')).toBe(open);
 });
 it('allows one short psychic opening between electric landings without refresh chaining',()=>{
  const open=exposeVecna(makeVecnaWindow(),100,'psychic');
  expect(vecnaCanTakeDamage(open,1499)).toBe(true);
  expect(vecnaCanTakeDamage(open,1500)).toBe(false);
  expect(exposeVecna(open,1600,'psychic')).toBe(open);
  const electric=exposeVecna(open,1600,'electric-device');
  expect(vecnaCanTakeDamage(electric,5599)).toBe(true);
  const nextPsi=exposeVecna(electric,5600,'psychic');
  expect(vecnaCanTakeDamage(nextPsi,5600)).toBe(true);
 });
});
