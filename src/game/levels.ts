export type Platform = {x:number;y:number;w:number;kind?:string};
export type EnemyKind = 'crawler'|'bat'|'slime'|'husk'|'bloom'|'mindflayer'|'billy'|'vecna';
export function enemyFamilies(stage:number):EnemyKind[]{
 return stage<2?['crawler']:stage<3?['crawler','bat']:stage<6?['crawler','bat','husk','slime']:['crawler','bat','husk','slime','bloom'];
}
export type Stage = {
 id:number;name:string;english:string;subtitle:string;tile:string;color:number;width:number;exit:number;checkpoint:number;dungeonX:number;
 platforms:Platform[];enemies:{x:number;y:number;kind:EnemyKind;min:number;max:number}[];
 coins:{x:number;y:number}[];power:{x:number;y:number};tapes:{x:number;y:number}[];
 decor:{x:number;y:number;key:string;size:number}[];
 hazards:{x:number;y:number;w:number}[];ceilings:{x:number;y:number;w:number}[];
};
const themes = [
 ['محلهٔ خاموش','Quiet neighborhood','سیگنال از آن سوی شهر می‌آید.','grass',0xc63e51],
 ['لبهٔ جنگل','Forest edge','میان درخت‌ها، چیزی بیدار است.','forest',0x33978f],
 ['کلوب آرکید پالاس','Palace Arcade interior','آخرین دستگاه هنوز روشن است.','stone',0xaa4fa8],
 ['راهروی مدرسهٔ هاوکینز','Hawkins Middle corridor','زنگ آخر، سال‌ها پیش به صدا درآمد.','stone',0xc8915c],
 ['معدن متروک','The quarry','هرچه پایین‌تر، سیگنال قوی‌تر.','grass',0xb17448],
 ['محوطهٔ آزمایشگاه','Laboratory exterior','پشت حصار، پاسخ منتظر است.','metal',0x4aa5bc],
 ['تونل‌های زیرزمینی','Underground tunnels','راه برگشت را به خاطر بسپار.','forest',0x4c9eaa],
 ['خانهٔ کریل','Creel House','شهری آشنا، با قوانینی دیگر.','rift',0xa339b8],
 ['ویرانه‌های استارکورت','Starcourt Mall ruins','شکاف‌ها به یکدیگر نزدیک می‌شوند.','rift',0x865de7],
 ['هستهٔ آزمایشگاه','Rainbow Room / Lab Core','سیگنال را خاموش کن. به خانه برگرد.','metal',0xe14655]
] as const;

// Each list is an original, hand-authored route. [x, top, width] in world pixels.
const routes:number[][][] = [
 [[0,458,620],[700,458,550],[1330,458,630],[2040,458,520],[2640,458,700]],
 [[0,458,440],[500,418,400],[970,458,480],[1520,402,430],[2020,458,580],[2660,430,680]],
 [[0,458,540],[600,426,340],[1000,394,420],[1480,458,500],[2040,418,400],[2500,458,840]],
 [[0,458,440],[510,410,430],[1000,370,390],[1460,410,450],[1980,458,510],[2560,426,780]],
 [[0,426,460],[530,458,420],[1020,426,440],[1530,394,420],[2020,458,500],[2590,426,750]],
 [[0,458,500],[570,418,370],[1010,458,430],[1510,402,430],[2010,430,450],[2530,458,810]],
 [[0,458,400],[470,426,440],[980,458,430],[1480,410,470],[2020,458,450],[2540,426,800]],
 [[0,458,430],[500,410,350],[920,370,410],[1400,410,500],[1970,458,480],[2520,410,820]],
 [[0,458,440],[520,410,350],[950,370,350],[1380,410,450],[1910,458,490],[2480,410,860]],
 [[0,458,480],[560,410,400],[1040,458,430],[1550,402,400],[2030,442,430],[2540,410,800]]
];
/** Extensions append rooms, preserving the opening's jumps and encounters. */
function extendedRoute(index:number):Platform[]{
 if(index===9)return [
  {x:3420,y:442,w:520},
  {x:4000,y:442,w:900},{x:4960,y:410,w:260},
  {x:5280,y:442,w:900},{x:6240,y:410,w:260},
  {x:6560,y:442,w:900},{x:7520,y:410,w:260},
  {x:7840,y:442,w:900}
 ];
 const elevations=[458,430,426,410,426,442,426,410,442];
 return Array.from({length:index},(_,room)=>({x:3420+room*600,y:elevations[index]+[0,-24,8,0][room%4],w:520}));
}

export const STAGES:Stage[]=themes.map((t,i)=>{
 const platforms=routes[i].map(([x,y,w],j)=>({x,y,w:j<routes[i].length-1?w-Math.min(90,i*10):w}));
 const optional=[{x:300+i*5,y:platforms[0].y-86,w:128,kind:'floating'},{x:1090+i*7,y:platforms[2].y-86,w:128,kind:'floating'},{x:2220,y:platforms[4].y-86,w:128,kind:'floating'}];
 const families=enemyFamilies(i+1);
 const enemies=platforms.slice(1).map((p,j)=>({x:p.x+p.w*.6,y:p.y,kind:families[(i+j)%families.length],min:p.x+65,max:p.x+p.w-65}));
 // First encounter is a forgiving crawler; first battery comes before it.
 if(i===0) enemies[0].kind='crawler';
 enemies.unshift({x:platforms[0].w-90,y:platforms[0].y,kind:i<2?'crawler':families[i%families.length],min:Math.max(220,platforms[0].w-180),max:platforms[0].w-35});
 for(let j=0;j<Math.floor(i/2);j++){
  const p=platforms[1+(j%4)];enemies.push({x:p.x+90,y:p.y,kind:families[(i+j+2)%families.length],min:p.x+45,max:p.x+p.w-45});
 }
 if(i===2)enemies.push({x:2930,y:458,kind:'mindflayer',min:2850,max:3000});
 if(i>=1)for(const p of optional.slice(1)){const x=p.x+p.w/2;enemies.push({x,y:p.y,kind:'billy',min:x,max:x});}
 const extension=extendedRoute(i);
 for(const [room,p] of extension.entries()){
  // The final gauntlet gives each boss its own broad, unobstructed floor.
  if(i===9&&p.w===900)continue;
  enemies.push({x:p.x+p.w*.6,y:p.y,kind:families[(i+room)%families.length],min:p.x+45,max:p.x+p.w-45});
 }
 if(i===9)for(const [order,p] of extension.filter(p=>p.w===900).entries())enemies.push({x:p.x+p.w/2,y:p.y,kind:order%2===0?'mindflayer':'vecna',min:p.x+100,max:p.x+p.w-100});
 platforms.push(...extension);
 const width=3340+i*600;
 const coins=platforms.flatMap(p=>[.2,.32,.44,.56,.68,.8].map(f=>({x:p.x+p.w*f,y:p.y-92})));
 const decor=platforms.flatMap((p,j)=>[{x:p.x+80,y:p.y,key:i>4?'fence':'wood-fence',size:90},{x:p.x+p.w-70,y:p.y,key:j%2?'streetlamp':'tree',size:j%2?170:155}]);
 const hazards=i<2?[]:[platforms[1],...(i>4?[platforms[2],platforms[4]]:[])].map((p,j)=>({x:p.x+130+j*12,y:p.y,w:28+Math.min(i*3,25)}));
 const ceilings=i<3?[]:[{x:180,y:platforms[0].y-76,w:120+Math.min(i*5,45)}];
 const middle=platforms.reduce((best,p)=>Math.abs(p.x+p.w/2-width/2)<Math.abs(best.x+best.w/2-width/2)?p:best);
 let checkpoint=i===0?platforms[3].x+100:Math.max(middle.x+90,Math.min(middle.x+middle.w-90,width/2));
 for(const hazard of hazards)if(checkpoint>hazard.x-65&&checkpoint<hazard.x+hazard.w+65)checkpoint=hazard.x+hazard.w+90;
 return {id:i+1,name:t[0],english:t[1],subtitle:t[2],tile:t[3],color:t[4],width,exit:width-130,checkpoint,dungeonX:platforms[2].x+65,platforms:[...platforms,...optional],enemies,coins,power:{x:360+i*5,y:optional[0].y-45},tapes:[{x:1150+i*7,y:optional[1].y-45},{x:2280,y:optional[2].y-45}],decor,hazards,ceilings};
});

/** Optional combat rooms. Their gates unlock only after every inhabitant is defeated. */
export const DUNGEONS:Stage[]=STAGES.map((main,i)=>{
 const platforms=[{x:0,y:458,w:430},{x:490,y:426,w:500},{x:1050,y:458,w:500},{x:1610,y:418,w:620}];
 const width=2230+i*240;
 // 420px service rooms plus an occasional 180px connector add length without
 // enlarging a jump. Stage five inserts them before its final boss chamber.
 const added:Platform[]=[];
 let remaining=i*240,cursor=i===4?1610:2230;
 while(remaining>0){const span=Math.min(480,remaining),y=remaining%480===0?426:442;
  added.push({x:cursor+(i===4?0:60),y,w:span-60});
  cursor+=span;remaining-=span;
 }
 if(i===4){
  // First inserted room begins at the former arena entrance. Keep the final
  // arena's exact 620px span, with a 60px approach and flat 418px fighting top.
  platforms.splice(3,1,...added,{x:1610+i*240,y:418,w:620});
 }else platforms.push(...added);
 const families=enemyFamilies(i+1);
 const count=3+Math.floor(i/2);
 const enemies=platforms.flatMap((p,j)=>Array.from({length:count},(_,k)=>({x:p.x+(j===0?220:70)+k*(p.w-(j===0?260:140))/Math.max(1,count-1),y:p.y,kind:families[(i+j+k)%families.length],min:p.x+(j===0?195:40),max:p.x+p.w-40})));
 if(i===4){
  const guards=platforms.slice(0,3).map((p,j)=>({x:p.x+(j===0?235:p.w*.55),y:p.y,kind:families[j],min:p.x+(j===0?195:40),max:p.x+p.w-40}));
  guards.push({x:345,y:platforms[0].y,kind:families[3],min:220,max:390});
  const arena=platforms[platforms.length-1];
  enemies.splice(0,enemies.length,...guards,{x:arena.x+370,y:418,kind:'vecna',min:arena.x+65,max:arena.x+525});
 }
 // Alternate four/five evenly spaced coins across every authored room.
 const coins=platforms.flatMap((p,j)=>Array.from({length:4+j%2},(_,k)=>({x:p.x+p.w*(k+1)/(5+j%2),y:p.y-85})));
 return {...main,name:'دانجن '+main.name,english:main.english+' / Dungeon',subtitle:'همهٔ دشمن‌ها را شکست بده تا دروازه باز شود.',tile:'rift',color:0x9954c9,width,exit:width-120,checkpoint:80,dungeonX:80,platforms,enemies,coins,tapes:[],power:{x:1450,y:350},decor:platforms.map(p=>({x:p.x+p.w*.5,y:p.y,key:'rock',size:100})),hazards:platforms.slice(1).filter(p=>i!==4||p!==platforms[platforms.length-1]).map(p=>({x:p.x+p.w*.64,y:p.y,w:25+Math.min(i*2,18)})),ceilings:i>2?[{x:1120,y:382,w:110}]:[]};
});

/** Conservative ballistic reachability graph. 1px horizontal sampling of a full
 * jump at running speed, including descending hits on target platform tops. */
export function routeReachable(stage:Stage):boolean{
 const route=stage.platforms.filter(p=>!p.kind).sort((a,b)=>a.x-b.x);
 const reachable=new Set<number>([0]);
 for(let i=0;i<route.length;i++){
  if(!reachable.has(i))continue;
  for(let j=i+1;j<route.length;j++){
   const from=route[i],to=route[j],rise=to.y-from.y;
   const discriminant=565*565+2*1500*rise;
   if(discriminant<0)continue;
   const flight=(565+Math.sqrt(discriminant))/1500;
   const gap=to.x-(from.x+from.w);
   if(gap+24<315*flight && to.y>=from.y-100)reachable.add(j);
  }
 }
 return route.some((p,i)=>reachable.has(i)&&stage.exit>=p.x&&stage.exit<=p.x+p.w);
}
