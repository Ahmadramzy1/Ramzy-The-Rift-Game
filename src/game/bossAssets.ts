import Phaser from 'phaser';
export const BOSS_ASSETS=['mf-phases','mf-arm','vecna-stances','boss-devices','vecna-airwave','boss-cores'] as const;
export function preloadBossAssets(scene:Phaser.Scene,base:string){
 for(const key of BOSS_ASSETS)scene.load.image(key,base+key+'.png');
 for(const key of ['mf-living','vecna-living'])scene.load.spritesheet(key,base+key+'.png',{frameWidth:256,frameHeight:256});
}
/** Measured frame boxes preserve alpha and ground baselines. */
export function registerBossAssets(scene:Phaser.Scene){
 for(const key of BOSS_ASSETS){
  const texture=scene.textures.get(key),source=texture.getSourceImage() as HTMLImageElement;
  const cuts=key==='boss-devices'?[0,610,1230,1660,2172]:key==='mf-arm'?[0,610,1120,1660,2172]:key==='vecna-stances'?[0,535,1110,1650,2172]:Array.from({length:5},(_,i)=>Math.round(i*source.width/4));
  for(let i=0;i<4;i++){
   let x=cuts[i],y=0,w=cuts[i+1]-x,h=key==='mf-phases'?640:key==='mf-arm'?702:source.height;
   if(key==='vecna-stances')h=i===2?655:648;
   if(key==='boss-devices'){const boxes=[[103,12,460,666],[59,4,531,674],[52,265,311,413],[40,144,417,534]];const b=boxes[i];x+=b[0];y=b[1];w=b[2];h=b[3];}
   if(key==='vecna-airwave'){y=240;h=245;}
   if(key==='boss-cores'){x+=22;y=58;w-=44;h=608;}
   texture.add(i,0,x,y,w,h);
  }
 }
}
