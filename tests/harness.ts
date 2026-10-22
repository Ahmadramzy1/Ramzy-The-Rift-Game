import Phaser from 'phaser';
import {GameScene} from '../src/game/GameScene';
import {settings,touch} from '../src/game/bridge';
import {loadCampaign,awardCoin,buyBoost} from '../src/game/campaign';
import {command} from '../src/game/bridge';
import {STAGES} from '../src/game/levels';
const scene=new GameScene();settings.sound=false;
const game=new Phaser.Game({type:Phaser.CANVAS,parent:'game',width:1920,height:1080,scene:[scene],physics:{default:'arcade',arcade:{gravity:{x:0,y:1500},fps:60,fixedStep:true}},audio:{noAudio:true},pixelArt:true});
const output=document.getElementById('results')!;
const enable=()=>{if(scene.player&&scene.keys){(document.getElementById('run') as HTMLButtonElement).disabled=false;output.textContent='Ready.';game.events.off('poststep',enable);}};game.events.on('poststep',enable);
function report(text:string){output.textContent+='\n'+text;}
function assert(ok:unknown,message:string){if(!ok)throw new Error(message);}
const frames=(count:number)=>new Promise<void>(resolve=>{let n=0;const tick=()=>{if(++n>=count){game.events.off('poststep',tick);resolve();}};game.events.on('poststep',tick);});
function release(){for(const key of Object.values(scene.keys))key.isDown=false;for(const key of Object.keys(touch) as (keyof typeof touch)[])touch[key]=false;}
async function fresh(id=0){release();scene.loadStage(id);scene.startPlay();await frames(15);}
document.getElementById('run')!.onclick=async()=>{
 (document.getElementById('run') as HTMLButtonElement).disabled=true;output.textContent='Running against actual Phaser 3 Arcade physics...';
 let passed=0;
 const test=async(name:string,fn:()=>Promise<void>)=>{if(new URLSearchParams(location.search).has('dungeonOnly')&&!/dungeon|wallet|collectibles/.test(name))return;try{await fn();passed++;report('PASS '+name);}catch(e){report('FAIL '+name+' — '+String(e));throw e;}};
 try{
  await test('ground, acceleration and feet-preserving crouch',async()=>{
   await fresh();const b=scene.player.body as Phaser.Physics.Arcade.Body;assert(b.blocked.down,'spawn must stand on ground');
   touch.right=true;await frames(24);touch.right=false;assert(b.velocity.x>190,'accelerates to walking speed');await frames(12);
   const feet=b.bottom;touch.crouch=true;await frames(4);assert(b.height===32,'crouch reduces collider');assert(Math.abs(b.bottom-feet)<2,'crouch keeps feet fixed');touch.crouch=false;await frames(4);assert(b.height===60,'stand restores collider');
  });
  await test('double jump works, third jump and walking-off-edge rescue are blocked',async()=>{
   await fresh();touch.jump=true;await frames(3);assert(scene.jumpsUsed===1,'ground jump');touch.jump=false;await frames(10);const velocity=scene.player.body!.velocity.y;touch.jump=true;await frames(3);assert(scene.jumpsUsed===2,'second jump');assert(scene.player.body!.velocity.y<velocity,'air press launches second jump');touch.jump=false;await frames(3);touch.jump=true;await frames(3);assert(scene.jumpsUsed===2,'third jump blocked');release();
   await fresh();scene.player.setPosition(665,425);scene.player.setVelocity(0,130);await frames(2);touch.jump=true;await frames(3);assert(scene.player.body!.velocity.y>0,'gap has no support: must fall');release();
  });
  await test('solid ceiling tops also support a grounded jump',async()=>{
   await fresh(3);const ceiling=scene.stageData.ceilings[0];scene.player.setPosition(ceiling.x+ceiling.w/2,ceiling.y-48);scene.player.setVelocity(0);await frames(5);assert((scene.player.body as Phaser.Physics.Arcade.Body).blocked.down,'ceiling top is solid ground');touch.jump=true;await frames(3);assert(scene.player.body!.velocity.y<0,'can jump from the top of a ceiling');release();
  });
  await test('slingshot projectile reduces HP and kills after two hits',async()=>{
   await fresh();scene.player.setPosition(330,scene.groundY(330)-48);await frames(4);const e=scene.enemies[0];scene.fire(e.sprite.x,(e.sprite.body as Phaser.Physics.Arcade.Body).center.y);await frames(55);assert(e.hp===1,'first shot should leave 1 HP, actual '+e.hp);scene.fire(e.sprite.x,(e.sprite.body as Phaser.Physics.Arcade.Body).center.y);await frames(55);assert(e.hp===0&&!e.sprite.active,'second shot kills');
  });
  await test('sword hits for 2 HP and ignores distant targets',async()=>{
   await fresh();scene.equip('sword');const e=scene.enemies[0];scene.player.setPosition(e.sprite.x-65,scene.groundY(e.sprite.x)-48);await frames(3);scene.fire();await frames(15);assert(e.hp===0,'one sword hit removes 2 HP');assert(scene.enemies[1].hp===scene.enemies[1].maxHp,'distant enemy is unharmed');
  });
  await test('stage 2 clears stage 1 knockback and moves immediately',async()=>{
   await fresh();scene.elapsed=8000;scene.damage(scene.player.x+30);await fresh(1);touch.right=true;await frames(10);touch.right=false;assert(scene.player.body!.velocity.x>100,'stage 2 movement must not inherit an 8-second knockback timer');
  });
  await test('psychic lift, delayed explosion and one charge across respawn',async()=>{
   await fresh();const e=scene.enemies[0];scene.activatePsi();assert(!scene.state.abilityReady,'charge consumed');assert(e.controlledAt>=0,'enemy controlled');const y=e.sprite.y;await frames(35);assert(e.sprite.y<y-25,'enemy visibly lifted');await frames(75);assert(!e.sprite.active,'enemy explodes');scene.die();scene.respawn();assert(!scene.state.abilityReady,'death must not recharge power');
  });
  await test('checkpoint activation and physical respawn location',async()=>{
   await fresh();const x=scene.stageData.checkpoint;scene.player.setPosition(x,scene.groundY(x)-48);await frames(8);assert(scene.state.checkpoint===x,'checkpoint overlap activates');scene.die();scene.respawn();await frames(8);assert(Math.abs(scene.player.x-x)<5,'respawn at checkpoint');
  });
  await test('all ten stages spawn safely, show HP, keep body/group count bounded',async()=>{
   let max=0,min=9999;
   for(let i=0;i<10;i++){await fresh(i);assert((scene.player.body as Phaser.Physics.Arcade.Body).blocked.down,'stage '+(i+1)+' spawn grounded');assert(scene.status==='playing','stage starts');assert(scene.enemies.every(e=>e.maxHp>0&&e.bar.active),'HP bars');const groups=scene.sys.updateList.getActive().filter(x=>x.type==='StaticPhysicsGroup').length;max=Math.max(max,groups);min=Math.min(min,groups);}
   assert(max-min<=1,'static groups must not accumulate');
  });
  await test('crouch tunnel blocks standing and permits crouching',async()=>{
   await fresh(3);scene.enemies.forEach(e=>e.sprite.disableBody(true,true));touch.right=true;await frames(40);touch.right=false;await frames(8);assert(scene.player.x<190,'standing hero blocked by low ceiling');touch.crouch=true;touch.right=true;await frames(170);touch.right=false;assert(scene.player.x>330,'crouched hero passes tunnel');release();
  });
  await test('first stage can be completed through physical jumps and gate',async()=>{
   await fresh();
   // Exercise real ballistic jumps across each authored gap; combat is tested above.
   for(const e of scene.enemies){e.sprite.disableBody(true,true);e.bar.clear();e.label.setVisible(false);}
   const route=STAGES[0].platforms.filter(p=>!p.kind);
   for(let i=0;i<route.length-1;i++){
    const p=route[i],next=route[i+1];scene.player.setPosition(p.x+p.w-18,p.y-48);scene.player.setVelocity(0);await frames(3);
    touch.run=true;touch.right=true;touch.jump=true;await frames(24);touch.jump=false;
    await frames(35);touch.right=false;touch.run=false;await frames(12);
    assert(scene.player.x>next.x&&scene.player.body!.bottom<=next.y+3,'jump lands across gap '+(i+1)+' at '+scene.player.x);
   }
   scene.player.setPosition(3195,410);scene.player.setVelocity(0);await frames(5);assert(scene.status==='complete','portal completes stage');
  });
  await test('all ten dungeon doors enter with down and return without losing the run',async()=>{
   for(let i=0;i<10;i++){await fresh(i);const x=scene.stageData.dungeonX;scene.player.setPosition(x,scene.groundY(x)-48);scene.player.setVelocity(0);await frames(5);touch.crouch=true;await frames(3);assert(scene.area==='dungeon','stage '+(i+1)+' door enters');assert(scene.enemies.length>STAGES[i].enemies.length,'dungeon has more enemies');release();await frames(3);scene.player.setPosition(80,410);scene.player.setVelocity(0);await frames(5);touch.crouch=true;await frames(3);assert(scene.area==='main','return door works');assert(!scene.dungeonCleared,'retreat earns no clear');release();}
  });
  await test('coin wallet, room re-entry and purchased damage persist correctly',async()=>{
   await fresh();const coin=scene.stageData.coins[0],before=loadCampaign().wallet;scene.player.setPosition(coin.x,coin.y);await frames(5);assert(loadCampaign().wallet===before+1,'coin credited once');assert(scene.mainCoins.size===1,'main coin tracked');scene.enterDungeon();await frames(5);scene.leaveDungeon();await frames(5);assert(scene.state.coins===1&&scene.mainCoins.size===1,'room return retains collected coin');const balance=loadCampaign().wallet;scene.player.setPosition(coin.x,coin.y);await frames(5);assert(loadCampaign().wallet===balance,'collected coin cannot duplicate on room reload');
   scene.player.setPosition(scene.stageData.power.x,scene.stageData.power.y);await frames(5);assert(scene.state.big,'energy collected');scene.state.big=false;scene.enterDungeon();await frames(5);scene.leaveDungeon();await frames(5);scene.player.setPosition(scene.stageData.power.x,scene.stageData.power.y);await frames(5);assert(!scene.state.big,'room reload cannot replenish consumed energy');
   awardCoin(100);assert(buyBoost(1,'power'),'buy power');assert(buyBoost(1,'energy'),'buy energy');command('stage',0);await frames(5);assert(scene.activeBoosts.power&&scene.state.big,'purchased boosts applied to stage');scene.die();scene.respawn();await frames(4);assert(scene.activeBoosts.power,'damage boost survives death');scene.equip('slingshot');const e=scene.enemies[0];scene.player.setPosition(e.sprite.x-90,scene.groundY(e.sprite.x)-48);await frames(3);scene.fire(e.sprite.x,(e.sprite.body as Phaser.Physics.Arcade.Body).center.y);await frames(15);assert(e.hp===0,'boosted sling deals exactly 2 HP');scene.activeBoosts={energy:false,power:false};
  });
  await test('dungeon gate stays locked then clear + main gate earns three stars',async()=>{
   await fresh(2);scene.enterDungeon();await frames(5);scene.player.setPosition(scene.stageData.exit,scene.groundY(scene.stageData.exit)-48);scene.player.setVelocity(0);await frames(4);assert(scene.area==='dungeon','living enemies lock gate');for(const e of scene.enemies)scene.killEnemy(e);await frames(4);assert(scene.area==='main'&&scene.dungeonCleared,'all enemies plus gate returns with clear');scene.player.setPosition(scene.stageData.exit,scene.groundY(scene.stageData.exit)-48);scene.player.setVelocity(0);await frames(5);assert(scene.status==='complete','main gate completes');assert(loadCampaign().stars[3]===3,'three stars recorded');
  });
  await test('all main collectibles plus exit awards two stars',async()=>{
   await fresh(1);scene.stageData.coins.forEach((_,i)=>scene.mainCoins.add(i));scene.stageData.tapes.forEach((_,i)=>scene.mainRadios.add(i));scene.player.setPosition(scene.stageData.exit,scene.groundY(scene.stageData.exit)-48);scene.player.setVelocity(0);await frames(5);assert(loadCampaign().stars[2]===2,'all coins/radios require stage exit and award two');
  });
  const expected=new URLSearchParams(location.search).has('dungeonOnly')?4:15;report('RESULT: '+passed+'/'+expected+' engine checks passed.');document.title='PASS '+passed+'/'+expected+' — RAMZY';
 }catch(e){release();scene.pause();report('RESULT: stopped after '+passed+' passed. '+String(e));document.title='FAIL — Signal 86';}
};
