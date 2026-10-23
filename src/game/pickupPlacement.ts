import type {Stage} from './levels';

const HALF_SIZE=15;
const BOB=7;
const MARGIN=HALF_SIZE+2;

/** World center for a 30px medkit, with room for the pickup's 7px bob. */
export function medkitPlacement(stage:Stage):{x:number;y:number}{
 const desired=stage.checkpoint+180;
 const solids=[...stage.platforms,...stage.ceilings];
 const start=solids.findIndex(p=>!('kind' in p&&p.kind)&&stage.checkpoint>=p.x&&stage.checkpoint<=p.x+p.w);
 const reachable=new Set<number>([start>=0?start:0]);
 // Use the same conservative running jump envelope as the authored routes,
 // including optional platforms and solid ceiling tops in both directions.
 for(let pass=0;pass<solids.length;pass++)for(let i=0;i<solids.length;i++){
  if(!reachable.has(i))continue;
  for(let j=0;j<solids.length;j++){
   const from=solids[i],to=solids[j],rise=to.y-from.y;
   const discriminant=565*565+2*1500*rise;
   const gap=Math.max(0,to.x-from.x-from.w,from.x-to.x-to.w);
   if(rise>=-100&&discriminant>=0&&gap+24<315*(565+Math.sqrt(discriminant))/1500)reachable.add(j);
  }
 }
 const candidates:{x:number;y:number}[]=[];
 for(const [index,p] of solids.entries()){
  if(!reachable.has(index)||p.w<2*MARGIN)continue;
  let intervals:[number,number][]=[[p.x+MARGIN,p.x+p.w-MARGIN]];
  for(const hazard of stage.hazards){
   const left=hazard.x-MARGIN,right=hazard.x+hazard.w+MARGIN;
   intervals=intervals.flatMap(([a,b])=>right<a||left>b?[[a,b] as [number,number]]:[...(a<left?[[a,left] as [number,number]]:[]),...(b>right?[[right,b] as [number,number]]:[])]);
  }
  // Split at solid edges as well: a nearby overhang must not clip the
  // sprite even when its center is outside that overhang.
  const edges=solids.flatMap(s=>[s.x-MARGIN,s.x+s.w+MARGIN]);
  for(const [left,right] of intervals){
   const positions=[Math.max(left,Math.min(right,desired)),left,right,...edges.filter(x=>x>=left&&x<=right)];
   for(const x of positions){
    const y=p.y-58,top=y-HALF_SIZE-BOB,bottom=y+HALF_SIZE+BOB;
    if(solids.some(s=>x+HALF_SIZE>s.x&&x-HALF_SIZE<s.x+s.w&&bottom>s.y&&top<s.y+28))continue;
    candidates.push({x,y});
   }
  }
 }
 candidates.sort((a,b)=>Math.abs(a.x-desired)-Math.abs(b.x-desired)||a.y-b.y);
 if(!candidates.length)throw new Error(`Stage ${stage.id} has no safe medkit placement`);
 return candidates[0];
}
