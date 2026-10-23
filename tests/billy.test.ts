import {expect,it} from 'vitest';
import {BILLY,billyCanAttack,molotovVelocity} from '../src/game/billy';
import {STAGES} from '../src/game/levels';
import {enemyStats} from '../src/game/combat';
it('introduces stationary 5HP wheelchair enemies on elevated platforms from stage two',()=>{
 expect(STAGES[0].enemies.some(e=>e.kind==='billy')).toBe(false);
 for(const s of STAGES.slice(1)){
  const enemies=s.enemies.filter(e=>e.kind==='billy');expect(enemies).toHaveLength(2);
  for(const e of enemies){expect(e.min).toBe(e.max);expect(s.platforms.some(p=>p.kind&&e.x>p.x&&e.x<p.x+p.w&&e.y===p.y)).toBe(true);}
  expect(enemyStats('billy',s.id)).toMatchObject({hp:5,speed:0,cooldown:4000});
 }
});
it('only attacks nearby heroes and lobs a bottle on a real gravity arc to their position',()=>{
 expect(BILLY.interval).toBe(4000);expect(billyCanAttack(300,100)).toBe(true);expect(billyCanAttack(700,0)).toBe(false);
 for(const targetX of [-300,300]){
  const v=molotovVelocity(0,100,targetX,250),t=v.flight;
  expect(v.y).toBeLessThan(0);expect(v.x*t).toBeCloseTo(targetX);
  expect(100+v.y*t+.5*BILLY.gravity*t*t).toBeCloseTo(250);
 }
});
