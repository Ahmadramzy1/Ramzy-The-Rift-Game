import {describe,it,expect} from 'vitest';
import {STAGES,DUNGEONS,routeReachable} from '../src/game/levels';

describe('progressively longer authored routes',()=>{
 it('adds rooms at each stage without stretching the opening route',()=>{
  expect(STAGES.map(s=>s.width)).toEqual([3340,3940,4540,5140,5740,6340,6940,7540,8140,8740]);
  expect(DUNGEONS.map(s=>s.width)).toEqual([2230,2470,2710,2950,3190,3430,3670,3910,4150,4390]);
  for(const stage of STAGES){
   expect(stage.platforms.filter(p=>!p.kind&&p.x<3340).at(-1)!.x+stage.platforms.filter(p=>!p.kind&&p.x<3340).at(-1)!.w).toBe(3340);
   expect(stage.exit).toBe(stage.width-130);
   expect(stage.platforms.some(p=>!p.kind&&stage.checkpoint>=p.x+60&&stage.checkpoint<=p.x+p.w-60)).toBe(true);
   for(const h of stage.hazards)expect(stage.checkpoint+25<h.x||stage.checkpoint-25>h.x+h.w).toBe(true);
  }
 });
 it('keeps every adjacent jump achievable with one normal running jump',()=>{
  for(const stage of [...STAGES,...DUNGEONS]){
   expect(routeReachable(stage)).toBe(true);
   const route=stage.platforms.filter(p=>!p.kind).sort((a,b)=>a.x-b.x);
   expect(route.at(-1)!.x+route.at(-1)!.w).toBe(stage.width);
   for(let i=1;i<route.length;i++){
    const from=route[i-1],to=route[i],gap=to.x-from.x-from.w,rise=to.y-from.y;
    expect(gap).toBeGreaterThanOrEqual(0);
    expect(rise).toBeGreaterThanOrEqual(-100);
    const flight=(565+Math.sqrt(565*565+2*1500*rise))/1500;
    expect(gap+24).toBeLessThan(315*flight);
   }
  }
 });
 it('ends stage ten with two Mind Flayers and two Vecnas in separate safe arenas',()=>{
  const stage=STAGES[9],bosses=stage.enemies.filter(e=>e.kind==='mindflayer'||e.kind==='vecna');
  expect(bosses.map(e=>[e.kind,e.x])).toEqual([['mindflayer',4450],['vecna',5730],['mindflayer',7010],['vecna',8290]]);
  for(const boss of bosses){
   const arena=stage.platforms.find(p=>!p.kind&&boss.x>p.x&&boss.x<p.x+p.w)!;
   expect(arena.w).toBe(900);
   expect(boss.min).toBeGreaterThanOrEqual(arena.x+100);
   expect(boss.max).toBeLessThanOrEqual(arena.x+arena.w-100);
   expect(stage.hazards.some(h=>h.x<arena.x+arena.w&&h.x+h.w>arena.x)).toBe(false);
  }
  for(const stage of STAGES.slice(0,9))expect(stage.enemies.some(e=>e.kind==='vecna')).toBe(false);
 });
 it('keeps stage five dungeon at four guards and a final broad Vecna chamber',()=>{
  const stage=DUNGEONS[4],boss=stage.enemies.find(e=>e.kind==='vecna')!,arena=stage.platforms.at(-1)!;
  expect(stage.enemies).toHaveLength(5);
  expect(arena).toEqual({x:2570,y:418,w:620});
  expect(boss.x).toBe(2940);
  expect(boss.min).toBe(2635);
  expect(boss.max).toBe(3095);
  expect(stage.hazards.some(h=>h.x+h.w>arena.x)).toBe(false);
 });
});
