import {it,expect} from 'vitest';
import {VECNA,vecnaLandingHits,takeVecnaHit} from '../src/game/vecna';
import {DUNGEONS,STAGES} from '../src/game/levels';
import {enemyStats} from '../src/game/combat';
import {initialState} from '../src/game/mechanics';
it('puts a ten HP Vecna behind only four guards at the end of dungeon five',()=>{
 const d=DUNGEONS[4];expect(d.enemies).toHaveLength(5);const boss=d.enemies.find(e=>e.kind==='vecna')!;
 expect(boss.x).toBeGreaterThan(1900);expect(enemyStats('vecna',10).hp).toBe(10);
 expect(DUNGEONS.filter(s=>s.enemies.some(e=>e.kind==='vecna')).map(s=>s.id)).toEqual([5]);
 expect(STAGES.every(s=>s.enemies.every(e=>e.kind!=='vecna'))).toBe(true);expect(VECNA.interval).toBe(3000);
});
it('deals three hearts only inside the landing area and lets lateral movement or a high jump evade',()=>{
 const body={left:190,right:215,top:350,bottom:418};
 expect(vecnaLandingHits(200,418,body)).toBe(true);
 expect(vecnaLandingHits(400,418,body)).toBe(false);
 expect(vecnaLandingHits(200,418,{...body,top:230,bottom:290})).toBe(false);
 const state={...initialState(),big:true},hit=takeVecnaHit(state,5000);expect(hit.hearts).toBe(0);expect(hit.lives).toBe(3);expect(takeVecnaHit(hit,5050)).toBe(hit);
});
