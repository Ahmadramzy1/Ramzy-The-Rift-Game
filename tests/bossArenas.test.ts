import {expect,it} from 'vitest';
import {buildBossArena,landingHitsPylon} from '../src/game/bossArenas';
import {DUNGEONS,STAGES} from '../src/game/levels';

const encounters=[
 ...STAGES.flatMap(stage=>stage.enemies.filter(e=>e.kind==='mindflayer'||e.kind==='vecna').map(enemy=>({stage,enemy,area:'main' as const}))),
 ...DUNGEONS.flatMap(stage=>stage.enemies.filter(e=>e.kind==='vecna').map(enemy=>({stage,enemy,area:'dungeon' as const})))
];

it('keeps six boss encounters on their own actual ground with stable separate identities',()=>{
 const arenas=encounters.map(({stage,enemy,area})=>buildBossArena(stage,enemy,area)!);
 expect(arenas).toHaveLength(6);
 expect(new Set(arenas.map(a=>a.id)).size).toBe(6);
 const intro=arenas.find(a=>a.id==='stage3-intro-mindflayer')!;
 expect([intro.left,intro.right,intro.floor]).toEqual([2500,3340,458]);
 const dungeon=arenas.find(a=>a.id==='stage5-dungeon-vecna')!;
 expect([dungeon.left,dungeon.right,dungeon.floor]).toEqual([2570,3190,418]);
 const final=arenas.filter(a=>a.id.startsWith('stage10'));
 expect(final.map(a=>a.right-a.left)).toEqual([900,900,900,900]);
 for(let i=1;i<final.length;i++)expect(final[i].left).toBeGreaterThan(final[i-1].right);
 for(const encounter of encounters)expect(buildBossArena(encounter.stage,encounter.enemy,encounter.area)).toEqual(buildBossArena(encounter.stage,encounter.enemy,encounter.area));
});

it('keeps cover jumpable and pylon bait locations inside patrol and safe floor edges',()=>{
 for(const {stage,enemy,area} of encounters){
  const arena=buildBossArena(stage,enemy,area)!;
  expect(arena.pylons).toHaveLength(2);
  for(const pylon of arena.pylons){
   expect(pylon.x).toBeGreaterThanOrEqual(Math.max(arena.left+80,enemy.min));
   expect(pylon.x).toBeLessThanOrEqual(Math.min(arena.right-80,enemy.max));
   expect(pylon.y).toBe(arena.floor);
  }
  for(const cover of arena.covers){
   expect(cover.x).toBeGreaterThanOrEqual(arena.left+80);
   expect(cover.x+cover.w).toBeLessThanOrEqual(arena.right-80);
   expect(cover.y+cover.h).toBe(arena.floor);
   expect(cover.h).toBeLessThanOrEqual(78);
   for(const pylon of arena.pylons)expect(Math.abs(pylon.x-(cover.x+cover.w/2))).toBeGreaterThan(cover.w/2+20);
  }
 }
});

it('adds reachable upper routes only to the second final Mind Flayer',()=>{
 for(const {stage,enemy,area} of encounters){
  const arena=buildBossArena(stage,enemy,area)!;
  expect(arena.variant).toBe(stage.id===10&&enemy.x>6500?1:0);
  const advanced=stage.id===10&&enemy.kind==='mindflayer'&&enemy.x>6500;
  expect(arena.ledges).toHaveLength(advanced?2:0);
  for(const ledge of arena.ledges){
   expect(arena.floor-ledge.y).toBeLessThanOrEqual(80);
   expect(ledge.x).toBeGreaterThanOrEqual(arena.left+80);
   expect(ledge.x+ledge.w).toBeLessThanOrEqual(arena.right-80);
  }
 }
});

it('requires a local ground-level landing and rejects unrelated enemies or missing floors',()=>{
 const pylons=[{x:200,y:442}];
 expect(landingHitsPylon(265,442,pylons)).toBe(true);
 expect(landingHitsPylon(266,442,pylons)).toBe(false);
 expect(landingHitsPylon(200,410,pylons)).toBe(false);
 expect(landingHitsPylon(200,442,[])).toBe(false);
 expect(buildBossArena(STAGES[0],STAGES[0].enemies[0],'main')).toBeUndefined();
 const {stage,enemy,area}=encounters[0];
 expect(buildBossArena({...stage,platforms:[]},enemy,area)).toBeUndefined();
 expect(buildBossArena(stage,enemy,'dungeon')).toBeUndefined();
});
