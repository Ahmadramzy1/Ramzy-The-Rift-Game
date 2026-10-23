import Phaser from 'phaser';
import type { Stage, Platform } from './levels';

/** Location art remains the same in both worlds; only its state changes. */
export const ENVIRONMENTS = [
 {name:'HAWKINS • BYERS HOUSE',base:0x252c32,top:0x7d8880,trim:0xbaa884,material:'asphalt'},
 {name:'MIRKWOOD • CASTLE BYERS',base:0x352c25,top:0x8c7950,trim:0x4d8470,material:'forest'},
 {name:'PALACE ARCADE',base:0x30213e,top:0x986599,trim:0xf484d4,material:'arcade'},
 {name:'HAWKINS MIDDLE • SCIENCE WING',base:0x39474c,top:0xc6c5ad,trim:0x77b5b5,material:'school'},
 {name:'SATTLER QUARRY • MINE ACCESS',base:0x433a33,top:0xa59278,trim:0xba8c52,material:'quarry'},
 {name:'HAWKINS NATIONAL LABORATORY',base:0x263942,top:0x99a9aa,trim:0x68cbd2,material:'lab'},
 {name:'SERVICE TUNNEL • RESTRICTED',base:0x27393c,top:0x81938c,trim:0xe6b85d,material:'tunnel'},
 {name:'CREEL HOUSE • GRANDFATHER HALL',base:0x392c32,top:0xa4846b,trim:0xca735c,material:'house'},
 {name:'STARCOURT • FOOD COURT',base:0x3c3547,top:0xbdb1b0,trim:0xe88ea7,material:'mall'},
 {name:'RAINBOW ROOM • CONTAINMENT CORE',base:0x263843,top:0xc4d1cc,trim:0xf08064,material:'core'},
] as const;

export function preloadEnvironments(scene:Phaser.Scene,base:string){
 for(let id=1;id<=10;id++)scene.load.image(`stage-environment-${id}`,`${base}environments/stage-${String(id).padStart(2,'0')}.png`);
}

export function drawEnvironment(scene:Phaser.Scene,stage:Stage,dark:boolean,reducedMotion:boolean){
 const theme=ENVIRONMENTS[stage.id-1],key=`stage-environment-${stage.id}`;
 // Overscan both ends of the route; non-seamless art pans gently without tiling.
 if(scene.textures.exists(key)){
  const texture=scene.textures.get(key),source=texture.getSourceImage() as HTMLImageElement;
  const height=Math.floor(source.height/2);
  if(!texture.has('normal'))texture.add('normal',0,0,0,source.width,height);
  if(!texture.has('upside-down'))texture.add('upside-down',0,0,height,source.width,height);
  const parallax=.12,travel=Math.max(0,stage.width-960)*parallax;
  const backdrop=scene.add.image(480,270,key,dark?'upside-down':'normal').setScrollFactor(parallax,0).setDepth(-35);
  backdrop.setScale(Math.max((1000+travel*2)/source.width,560/height));
 }
 scene.add.rectangle(480,270,980,560,dark?0x17192b:0x101c29,dark?.16:.1).setScrollFactor(0).setDepth(-34);
 const structure=scene.add.graphics().setDepth(-18).setScrollFactor(.78).setAlpha(.45);
 const ink=dark?0x242334:theme.base,accent=dark?0xb05c72:theme.trim;
 const label=(x:number,y:number,text:string,size=12)=>scene.add.text(x,y,text,{fontFamily:'monospace',fontSize:`${size}px`,fontStyle:'bold',color:dark?'#ce8e9b':'#d1d5ce',stroke:'#10151e',strokeThickness:3}).setScrollFactor(.78).setDepth(-17).setAlpha(.48);
 const light=(x:number,y:number,color:number,width=28)=>{
  const glow=scene.add.rectangle(x,y,width,3,color,.8).setDepth(-16).setScrollFactor(.78);
  if(!reducedMotion)scene.tweens.add({targets:glow,alpha:dark?.2:.45,duration:1400+(x%1100),yoyo:true,repeat:-1});
 };
 // The painted atlas supplies the architecture. Sparse small details add depth
 // without duplicating or obscuring its cabinets, lockers, windows or clock.
 for(let x=140;x<stage.width+900;x+=910){
  structure.fillStyle(ink,.75);
  switch(stage.id){
   case 1:
    for(let i=0;i<9;i++)light(x+i*17,225+Math.sin(i*.7)*7,[0xf2b562,0xa4d3ad,0xe57993][i%3],3);
    break;
   case 2:
    structure.lineStyle(2,0x86735b,.55);structure.lineBetween(x,320,x+38,355);structure.lineBetween(x+28,330,x+12,354);
    label(x+3,330,'BYERS',8);break;
   case 3:
    light(x,233,accent,29);light(x+120,327,0x6be6e1,4);
    structure.fillStyle(accent,.5);structure.fillRect(x+18,329,3,2);structure.fillRect(x+26,329,3,2);break;
   case 4:
    label(x,245,'SCIENCE  →',8);light(x+120,112,0xd0ebcd,47);
    structure.fillStyle(0xa4b4ad,.5);structure.fillRect(x+40,302,8,2);break;
   case 5:
    structure.lineStyle(2,0x594c3c,.7);structure.lineBetween(x+22,121,x+22,172);
    light(x+22,175,0xf1b466,12);label(x+90,282,'MINE 04',8);break;
   case 6:
    light(x+24,245,0xe7c485,9);light(x+180,120,0xa9cfce,4);
    label(x+4,261,'AUTHORIZED ONLY',8);break;
   case 7:
    structure.lineStyle(3,0x706b50,.6);structure.strokeCircle(x+80,267,11);
    structure.lineBetween(x+73,260,x+87,274);structure.lineBetween(x+73,274,x+87,260);
    light(x+20,170,accent,13);break;
   case 8:
    structure.fillStyle(0xd4b185,.45);structure.fillRect(x+18,273,2,14);
    light(x+19,270,accent,4);label(x+140,180,'CREEL',8);break;
   case 9:
    light(x+80,206,accent,45);light(x+180,206,0x78bcbc,28);
    structure.fillStyle(0xbaa9b3,.4);structure.fillRect(x+20,370,8,3);break;
   case 10:
    light(x+50,183,accent,12);light(x+130,211,0x68b8c2,3);
    label(x+3,271,'CORE 001',8);break;
  }
  if(dark){
   structure.lineStyle(2,0x654351,.7);structure.beginPath();structure.moveTo(x+90,430);structure.lineTo(x+100,392);structure.lineTo(x+86,370);structure.strokePath();
   for(let j=0;j<6;j++){structure.fillStyle(0xc49cae,.4);structure.fillRect(x+j*43,120+(j*71)%260,2,2);}
  }
 }
}

/** Surface pixels start at collider y, so perceived gaps and jump landings agree. */
export function drawSurface(scene:Phaser.Scene,stage:Stage,p:Platform,ceiling:boolean,dark:boolean){
 const theme=ENVIRONMENTS[stage.id-1],g=scene.add.graphics().setDepth(1),floating=!!p.kind||ceiling;
 const depth=floating?24:Math.max(100,560-p.y),base=dark?0x292833:theme.base,top=dark?0x887383:theme.top;
 const shade=(color:number,factor:number)=>{const r=Math.min(255,((color>>16)&255)*factor),b=Math.min(255,(color&255)*factor),gr=Math.min(255,((color>>8)&255)*factor);return (r<<16)|(gr<<8)|b;};
 const rect=(x:number,y:number,w:number,h:number,color:number,alpha=1)=>{
  const left=Math.max(p.x,x),right=Math.min(p.x+p.w,x+w),bottom=Math.min(p.y+depth,y+h),topY=Math.max(p.y,y);
  if(right>left&&bottom>topY){g.fillStyle(color,alpha);g.fillRect(left,topY,right-left,bottom-topY);}
 };
 // All flecks use world-coordinate hashes, so no shimmer or randomized reloads.
 const hash=(x:number,y:number)=>Math.abs(Math.sin(x*12.9898+y*78.233+stage.id*31.7)*43758.5453)%1;
 rect(p.x,p.y,p.w,depth,base);
 if(theme.material==='school'||theme.material==='mall'){
  // Ceramic edge laid over a darker, chipped masonry fascia, rather than an
  // unshaded gray grid. Staggered blocks have individual pixel bevels.
  const tile=theme.material==='school'?0x697d75:0x80727e;
  for(let row=0;row<Math.ceil(depth/24);row++)for(let col=-1;col<Math.ceil(p.w/38);col++){
   const x=p.x+col*38+(row%2)*19,y=p.y+row*24+9,c=shade(dark?0x4b424e:tile,.74+hash(x,y)*.4);
   rect(x,y,36,22,c);rect(x,y,36,2,shade(c,1.27));rect(x,y+20,36,2,shade(c,.62));rect(x+34,y+2,2,18,shade(c,.65));
   if(hash(x+9,y)>.6){rect(x+8,y+8,7,2,shade(c,1.3),.6);rect(x+24,y+16,4,2,shade(c,.5),.8);}
  }
  rect(p.x,p.y,p.w,3,top);rect(p.x,p.y+3,p.w,3,shade(top,.73));rect(p.x,p.y+6,p.w,3,0x172326);
  for(let x=p.x+24;x<p.x+p.w;x+=38){rect(x,p.y,2,6,shade(top,.43));if(hash(x,p.y)>.5)rect(x+5,p.y+2,4,2,shade(top,1.18));}
 }else if(['lab','tunnel','core','arcade'].includes(theme.material)){
  rect(p.x,p.y,p.w,3,top);rect(p.x,p.y+3,p.w,3,shade(top,.55));rect(p.x,p.y+6,p.w,3,dark?0xa76c81:theme.trim,.8);
  for(let x=p.x+3;x<p.x+p.w;x+=12){rect(x,p.y+12,8,3,0x111c26);rect(x+2,p.y+15,6,2,shade(top,.7),.65);rect(x,p.y+18,2,3,shade(top,.48));}
  for(let x=p.x+7;x<p.x+p.w;x+=48){rect(x,p.y+4,3,3,0x111823);rect(x,p.y+4,2,1,shade(top,1.22));}
  for(let y=p.y+30;y<p.y+depth;y+=27)for(let x=p.x;x<p.x+p.w;x+=68){rect(x,y,66,2,0x101b24,.7);rect(x,y+2,2,23,shade(top,.5),.45);}
  if(theme.material==='arcade')for(let y=p.y+31;y<p.y+depth;y+=15)for(let x=p.x+8;x<p.x+p.w;x+=22){const c=hash(x,y)>.5?0xa85e93:0x43898c;rect(x,y,5,2,c,.45);rect(x+3,y+2,2,4,c,.4);}
 }else if(theme.material==='house'||theme.material==='forest'){
  for(let row=0;row<Math.ceil(depth/15);row++){
   const y=p.y+row*15,c=shade(base,.87+hash(row,p.x)*.5);rect(p.x,y,p.w,14,c);rect(p.x,y,p.w,2,shade(top,.8),.65);rect(p.x,y+13,p.w,2,0x17191e,.85);
   for(let x=p.x+((row%2)*33);x<p.x+p.w;x+=76){rect(x,y,2,14,0x17191e,.8);rect(x+7,y+5,27,1,shade(top,.85),.4);rect(x+17,y+8,36,1,0x17191e,.4);rect(x+5,y+3,2,2,0x121720,.8);}
  }
  rect(p.x,p.y,p.w,3,top);
 }else if(theme.material==='quarry'){
  for(let row=0;row<Math.ceil(depth/28);row++)for(let col=-1;col<Math.ceil(p.w/44);col++){
   const x=p.x+col*44+(row%2)*22,y=p.y+row*28,c=shade(base,.7+hash(x,y)*.7);
   rect(x+2,y+2,41,25,c);rect(x+5,y+2,34,3,shade(top,.8));rect(x+2,y+6,3,14,shade(top,.55));rect(x+35,y+20,8,5,shade(c,.5));
  }
  rect(p.x,p.y,p.w,3,top);for(let x=p.x+4;x<p.x+p.w;x+=26){rect(x,p.y+5,8,5,0x63513c);rect(x,p.y+5,8,1,0x9a8261);}rect(p.x,p.y+4,p.w,2,0xa49f91);
 }else {
  rect(p.x,p.y,p.w,3,top);rect(p.x,p.y+3,p.w,6,shade(top,.5));
  for(let x=p.x+20;x<p.x+p.w;x+=60)rect(x,p.y+18,26,3,0xa99f77,.6);
 }
 // Dense two-pixel grain and occasional chips give each material a raster
 // finish consistent with the character sprites, without extending into gaps.
 for(let y=p.y+8;y<p.y+depth-2;y+=4)for(let x=p.x+2;x<p.x+p.w-2;x+=5){const n=hash(x,y);if(n>.77)rect(x,y,2+(n>.94?2:0),2,n>.9?shade(top,.8):0x101622,n>.9?.25:.2);}
 rect(p.x,p.y+depth-5,p.w,5,0x101522,.8);rect(p.x,p.y+7,3,depth-7,shade(top,.7),.35);rect(p.x+p.w-4,p.y+7,4,depth-7,0x101522,.7);
 if(dark){for(let x=p.x+18;x<p.x+p.w-15;x+=67){rect(x,p.y+4,3,8,0x704a60);rect(x+3,p.y+12,4,9,0x704a60);rect(x+6,p.y+21,3,9,0x4c3448);}}
}
