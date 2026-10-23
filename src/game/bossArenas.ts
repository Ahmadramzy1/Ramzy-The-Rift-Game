import type {Stage} from './levels';

export type ArenaPylon = {x:number;y:number};
export type BossArena = {
 id:string;left:number;right:number;floor:number;variant:0|1;
 pylons:ArenaPylon[];
 covers:{x:number;y:number;w:number;h:number}[];
 ledges:{x:number;y:number;w:number}[];
};

/** Arena geometry belongs to an individual encounter, including repeated bosses. */
export function buildBossArena(stage:Stage,enemy:Stage['enemies'][number],area:'main'|'dungeon'):BossArena|undefined{
 if(enemy.kind!=='mindflayer'&&enemy.kind!=='vecna')return undefined;
 const intro=stage.id===3&&area==='main'&&enemy.kind==='mindflayer';
 const dungeon=stage.id===5&&area==='dungeon'&&enemy.kind==='vecna';
 const finale=stage.id===10&&area==='main';
 if(!intro&&!dungeon&&!finale)return undefined;
 // A boss's authored feet determine its floor. Floating platforms and adjacent
 // rooms must never extend the encounter's bounds across an intervening gap.
 const ground=stage.platforms.find(p=>!p.kind&&p.w>=400&&enemy.x>=p.x&&enemy.x<=p.x+p.w&&Math.abs(p.y-enemy.y)<=12);
 if(!ground)return undefined;
 const left=ground.x,right=ground.x+ground.w,floor=ground.y;
 const variant:0|1=finale&&enemy.x>6500?1:0;
 const id=intro?'stage3-intro-mindflayer':dungeon?'stage5-dungeon-vecna':`stage10-${enemy.kind}-${variant===0?'first':'second'}`;
 const patrolLeft=Math.max(left+80,enemy.min),patrolRight=Math.min(right-80,enemy.max);
 if(patrolLeft>patrolRight)return undefined;
 // Targets sit inside the boss's landing range, leaving space to bait a leap
 // without making the player stand at an exposed platform edge.
 const pylons=[.22,.78].map(f=>({x:patrolLeft+(patrolRight-patrolLeft)*f,y:floor}));
 const coverCenters:number[]=[];
 const covers=[.38,.62].map(f=>{
  const candidates=Array.from({length:Math.floor((ground.w-208)/4)+1},(_,i)=>left+104+i*4).filter(x=>pylons.every(p=>Math.abs(p.x-x)>=48)&&coverCenters.every(c=>Math.abs(c-x)>=90));
  candidates.sort((a,b)=>Math.abs(a-(left+ground.w*f))-Math.abs(b-(left+ground.w*f)));
  const center=candidates[0];coverCenters.push(center);return {x:center-24,y:floor-64,w:48,h:64};
 });
 // Only the second final Mind Flayer introduces overhead routes. Their tops
 // are reachable in a normal jump and their ends retain generous floor space.
 const ledges=finale&&variant===1&&enemy.kind==='mindflayer'
  ?[.22,.62].map(f=>({x:left+ground.w*f,y:floor-76,w:144})):[];
 return {id,left,right,floor,variant,pylons,covers,ledges};
}

/** A landing must be close horizontally AND at the pylon's ground level. */
export function landingHitsPylon(x:number,y:number,pylons:readonly ArenaPylon[]):boolean{
 return pylons.some(p=>Math.abs(x-p.x)<=65&&Math.abs(y-p.y)<=24);
}
