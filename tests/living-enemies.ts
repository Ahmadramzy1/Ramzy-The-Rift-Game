import Phaser from 'phaser';
import {GameScene} from '../src/game/GameScene';
import {settings} from '../src/game/bridge';
import type {MFEncounter,VecnaEncounter} from '../src/game/BossDirector';
settings.sound=false;settings.menuOpen=false;
const scene=new GameScene();const game=new Phaser.Game({type:Phaser.CANVAS,parent:'game',width:1920,height:1080,scene:[scene],physics:{default:'arcade',arcade:{gravity:{x:0,y:1500},fps:60,fixedStep:true}},audio:{noAudio:true},pixelArt:true});
const output=document.querySelector('#results')!,run=document.querySelector<HTMLButtonElement>('#run')!;
const frames=(n:number)=>new Promise<void>(resolve=>{let i=0;const tick=()=>{if(++i>=n){game.events.off('poststep',tick);resolve();}};game.events.on('poststep',tick);});
const assert=(ok:unknown,msg:string)=>{if(!ok)throw Error(msg);};
const ready=()=>{if(!scene.player)return;run.disabled=false;output.textContent='Ready';game.events.off('poststep',ready);};game.events.on('poststep',ready);
function quiet(e:unknown){scene.enemies.filter(o=>o!==e).forEach(o=>{o.sprite.disableBody(true,true);o.bar.clear();o.label.setVisible(false);});}
async function boss(kind:'mindflayer'|'vecna'){
 scene.loadStage(kind==='mindflayer'?2:4);scene.startPlay(false);if(kind==='vecna')scene.enterDungeon();
 const e=scene.enemies.find(e=>e.kind===kind)!;quiet(e);const c=scene.bossDirector.encounters.get(e)!;
 scene.player.setPosition(e.sprite.x-200,c.arena.floor-48).setVelocity(0);scene.state.invincibleUntil=Infinity;
 if(c.kind==='mindflayer')c.state={...c.state,mode:'idle',until:scene.elapsed+100000};else c.nextAt=Infinity;
 scene.cameras.main.stopFollow().setZoom(2).centerOn(e.sprite.x-60,c.arena.floor-100);await frames(5);return {e,c};
}
run.onclick=async()=>{run.disabled=true;output.textContent='Running…';try{
 for(const kind of ['mindflayer','vecna'] as const){
  const {e,c}=await boss(kind);const seen=new Set<string>(),ys:number[]=[];
  for(let i=0;i<8;i++){await frames(8);seen.add(c.stance.texture.key+':'+c.stance.frame.name);ys.push(c.stance.y);}
  assert(seen.size>=4,kind+' cycles actual frames');assert(Math.max(...ys)-Math.min(...ys)<1,'ground pivot stable');
  if(c.kind==='vecna'){const v=c as VecnaEncounter;v.attack='psychic';v.cueUntil=scene.elapsed+10000;await frames(2);assert(Number(v.stance.frame.name)>=4,'psychic loop');}
  else{
   const m=c as MFEncounter;m.state={...m.state,mode:'stuck',until:scene.elapsed+10000};m.armPoint={x:e.sprite.x-170,y:c.arena.floor-42};
   scene.player.setPosition(m.armPoint.x,c.arena.floor-48).setVelocity(0);await frames(5);scene.state.big=true;scene.state.hearts=3;scene.state.invincibleUntil=0;
   await frames(1);assert(scene.state.hearts===2,'planted arm contact costs one heart');const hearts=scene.state.hearts;await frames(5);assert(scene.state.hearts===hearts,'contact respects immunity');
   m.state={...m.state,mode:'idle',until:scene.elapsed+10000,cutArms:1};scene.player.setPosition(m.armPoint.x,c.arena.floor-48).setVelocity(0);scene.state.invincibleUntil=0;await frames(4);assert(scene.state.hearts===hearts,'severed arm is safe');
  }
  output.textContent+='\nPASS '+kind+' frame loops / rooted pivot / contact';
 }
 for(const kind of ['husk','crawler'] as const){
  scene.loadStage(4);scene.startPlay(false);const e=scene.enemies.find(e=>e.kind===kind)!;assert(e,'authored enemy exists');quiet(e);
  scene.state.invincibleUntil=Infinity;e.min=e.sprite.x-200;e.max=e.sprite.x+200;
  scene.player.setPosition(e.sprite.x-140,scene.groundY(e.sprite.x)-48).setVelocity(0);await frames(12);
  e.lastAttack=scene.elapsed-4000;e.alertAt=scene.elapsed-1000;e.aggro=true;
  let started=false,launched=false,maxSpeed=0;const textures=new Set<string>();
  for(let i=0;i<95;i++){await frames(1);started ||= !!e.action;launched ||= !!e.action?.launched;maxSpeed=Math.max(maxSpeed,Math.abs(e.sprite.body!.velocity.x));textures.add(e.sprite.texture.key);}
  assert(started,kind+' starts attack');assert(textures.has(kind==='husk'?'husk-jump':'crawler-rush'),'generated action sheet used');
  assert(kind==='husk'?launched:maxSpeed>180,kind+' launches / rushes');assert(e.sprite.texture.key===kind,'returns to walk animation');
  output.textContent+='\nPASS '+kind+' attack / generated poses / recovery';
 }
 output.textContent+='\nPASS all living enemies checks';document.title='PASS living enemies';
}catch(error){output.textContent+='\nFAIL '+error;document.title='FAIL living enemies';}finally{scene.pause();run.disabled=false;}};
document.querySelector('#mf')!.addEventListener('click',()=>void boss('mindflayer'));
document.querySelector('#vecna')!.addEventListener('click',()=>void boss('vecna'));
