import Phaser from 'phaser';
import {GameScene} from '../src/game/GameScene';
import {settings,touch} from '../src/game/bridge';
import {CAMPAIGN_KEY,loadCampaign,awardCoin,buyItem} from '../src/game/campaign';
import {command} from '../src/game/bridge';
import {STAGES} from '../src/game/levels';
import {medkitPlacement} from '../src/game/pickupPlacement';
const scene=new GameScene();settings.sound=false;
const game=new Phaser.Game({type:Phaser.CANVAS,parent:'game',width:1920,height:1080,scene:[scene],physics:{default:'arcade',arcade:{gravity:{x:0,y:1500},fps:60,fixedStep:true}},audio:{noAudio:true},pixelArt:true});
const output=document.getElementById('results')!;
const enable=()=>{if(scene.player&&scene.keys){(document.getElementById('run') as HTMLButtonElement).disabled=false;output.textContent='Ready.';game.events.off('poststep',enable);}};game.events.on('poststep',enable);
for(const [label,kind,level,attack] of [['Preview slingshot','slingshot',1,false],['Preview steel sword','sword',1,false],['Preview purple sword','sword',2,false],['Preview sling shot','slingshot',1,true],['Preview sword attack','sword',2,true]] as const){
 const button=document.createElement('button');button.textContent=label;output.before(button);button.onclick=async()=>{
  await fresh();scene.enemies.forEach(e=>{e.sprite.disableBody(true,true);e.bar.clear();e.label.setVisible(false);});scene.upgrades.swordLevel=level;scene.equip(kind);await frames(5);if(attack){scene.fire(scene.player.x+100,scene.player.body!.center.y);await frames(7);}scene.cameras.main.stopFollow().setZoom(6).centerOn(scene.player.x+30,scene.player.y-25);scene.pause();
 };
}
function report(text:string){output.textContent+='\n'+text;}
for(const [label,time] of [['Preview Mind Flayer',2000],['Preview boss windup',4400],['Preview boss slam',5001]] as const){
 const button=document.createElement('button');button.textContent=label;output.before(button);button.onclick=async()=>{
  await fresh(2);scene.enemies.filter(e=>e.kind!=='mindflayer').forEach(e=>{e.sprite.disableBody(true,true);e.bar.clear();e.label.setVisible(false);});scene.player.setPosition(2730,410);scene.player.setVelocity(0);await frames(5);scene.elapsed=time;await frames(2);scene.cameras.main.stopFollow().setZoom(3).centerOn(2830,380);scene.pause();
 };
}
function assert(ok:unknown,message:string){if(!ok)throw new Error(message);}
const wavePreview=document.createElement('button');wavePreview.textContent='Preview moving shockwave';output.before(wavePreview);wavePreview.onclick=async()=>{
 await fresh(2);scene.enemies.filter(e=>e.kind!=='mindflayer').forEach(e=>{e.sprite.disableBody(true,true);e.bar.clear();e.label.setVisible(false);});scene.player.setPosition(2670,410);scene.player.setVelocity(0);scene.state.invincibleUntil=Infinity;await frames(5);scene.elapsed=5001;await frames(34);scene.cameras.main.stopFollow().setZoom(3).centerOn(2830,380);scene.pause();
};
for(const [label,throwing] of [['Preview Billy laugh',false],['Preview Billy throw',true]] as const){
 const button=document.createElement('button');button.textContent=label;output.before(button);button.onclick=async()=>{
  await fresh(1);const b=scene.enemies.find(e=>e.kind==='billy')!;scene.enemies.filter(e=>e!==b).forEach(e=>{e.sprite.disableBody(true,true);e.bar.clear();e.label.setVisible(false);});scene.player.setPosition(b.sprite.x-(throwing?150:600),scene.groundY(b.sprite.x-(throwing?150:600))-48);scene.player.setVelocity(0);await frames(4);if(throwing){b.lastAttack=scene.elapsed-3990;await frames(6);}scene.cameras.main.stopFollow().setZoom(4).centerOn(b.sprite.x-35,b.baseY-25);scene.pause();
 };
}
const frames=(count:number)=>new Promise<void>(resolve=>{let n=0;const tick=()=>{if(++n>=count){game.events.off('poststep',tick);resolve();}};game.events.on('poststep',tick);});
function release(){for(const key of Object.values(scene.keys))key.isDown=false;for(const key of Object.keys(touch) as (keyof typeof touch)[])touch[key]=false;}
async function fresh(id=0){release();scene.loadStage(id);scene.startPlay();await frames(15);}
document.getElementById('run')!.onclick=async()=>{
 (document.getElementById('run') as HTMLButtonElement).disabled=true;output.textContent='Running against actual Phaser 3 Arcade physics...';
 let passed=0;
 const upgradeOnly=new URLSearchParams(location.search).has('upgradeOnly'),savedCampaign=localStorage.getItem(CAMPAIGN_KEY),savedLegacy=localStorage.getItem('ramzy-v2-progress');
 if(upgradeOnly){localStorage.removeItem(CAMPAIGN_KEY);localStorage.removeItem('ramzy-v2-progress');}
 const weaponsOnly=new URLSearchParams(location.search).has('weaponsOnly');
 const bossOnly=new URLSearchParams(location.search).has('bossOnly');
 const billyOnly=new URLSearchParams(location.search).has('billyOnly');
 const test=async(name:string,fn:()=>Promise<void>)=>{if(billyOnly&&!/^(billy|medkit):/.test(name))return;if(bossOnly&&!name.startsWith('boss:'))return;if(upgradeOnly&&!name.startsWith('upgrade:'))return;if(weaponsOnly&&!/upgrade: purchased|upgrade: two fire/.test(name))return;if(new URLSearchParams(location.search).has('dungeonOnly')&&!/dungeon|wallet|collectibles/.test(name))return;try{await fn();passed++;report('PASS '+name);}catch(e){report('FAIL '+name+' — '+String(e));throw e;}};
 try{
  await test('ground, acceleration and feet-preserving crouch',async()=>{
   await fresh();const b=scene.player.body as Phaser.Physics.Arcade.Body;assert(b.blocked.down,'spawn must stand on ground');
   touch.right=true;await frames(24);touch.right=false;assert(b.velocity.x>190,'accelerates to walking speed');await frames(12);
   const feet=b.bottom;touch.crouch=true;await frames(4);assert(b.height===32,'crouch reduces collider');assert(Math.abs(b.bottom-feet)<2,'crouch keeps feet fixed');touch.crouch=false;await frames(4);assert(b.height===60,'stand restores collider');
  });
  await test('double jump works, third jump and walking-off-edge rescue are blocked',async()=>{
   awardCoin(60);if(!loadCampaign().doubleJump)buyItem(1,'doubleJump');
   await fresh();touch.jump=true;await frames(3);assert(scene.jumpsUsed===1,'ground jump');touch.jump=false;await frames(10);const velocity=scene.player.body!.velocity.y;touch.jump=true;await frames(3);assert(scene.jumpsUsed===2,'second jump');assert(scene.player.body!.velocity.y<velocity,'air press launches second jump');touch.jump=false;await frames(3);touch.jump=true;await frames(3);assert(scene.jumpsUsed===2,'third jump blocked');release();
   await fresh();scene.player.setPosition(665,425);scene.player.setVelocity(0,130);await frames(2);touch.jump=true;await frames(3);assert(scene.player.body!.velocity.y>0,'gap has no support: must fall');release();
  });
  await test('solid ceiling tops also support a grounded jump',async()=>{
   await fresh(3);const ceiling=scene.stageData.ceilings[0];scene.player.setPosition(ceiling.x+ceiling.w/2,ceiling.y-48);scene.player.setVelocity(0);await frames(5);assert((scene.player.body as Phaser.Physics.Arcade.Body).blocked.down,'ceiling top is solid ground');touch.jump=true;await frames(3);assert(scene.player.body!.velocity.y<0,'can jump from the top of a ceiling');release();
  });
  await test('slingshot projectile reduces HP and eventually kills',async()=>{
   await fresh();scene.player.setPosition(330,scene.groundY(330)-48);await frames(4);const e=scene.enemies[0];scene.fire(e.sprite.x,(e.sprite.body as Phaser.Physics.Arcade.Body).center.y);await frames(55);assert(e.hp<e.maxHp,'first shot damages enemy');for(let i=0;i<e.maxHp&&e.hp>0;i++){scene.fire(e.sprite.x,(e.sprite.body as Phaser.Physics.Arcade.Body).center.y);await frames(55);}assert(e.hp===0&&!e.sprite.active,'shots kill');
  });
  await test('sword hits for 2 HP and ignores distant targets',async()=>{
   await fresh();scene.equip('sword');const e=scene.enemies[0];scene.player.setPosition(e.sprite.x-65,scene.groundY(e.sprite.x)-48);await frames(3);scene.fire();await frames(15);assert(e.hp===e.maxHp-2,'one sword hit removes 2 HP');assert(scene.enemies[1].hp===scene.enemies[1].maxHp,'distant enemy is unharmed');
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
   awardCoin(150);assert(buyItem(1,'extraLife'),'buy life');assert(buyItem(1,'ability'),'buy charge');command('stage',0);await frames(5);assert(scene.state.lives===4&&scene.abilityCharges===2,'purchased supplies applied');scene.die();scene.respawn();await frames(4);assert(scene.state.lives===3&&scene.abilityCharges===2,'death consumes life and retains unused charge');
  });
  await test('dungeon gate stays locked then clear + main gate earns three stars',async()=>{
   await fresh(2);scene.enterDungeon();await frames(5);scene.player.setPosition(scene.stageData.exit,scene.groundY(scene.stageData.exit)-48);scene.player.setVelocity(0);await frames(4);assert(scene.area==='dungeon','living enemies lock gate');for(const e of scene.enemies)scene.killEnemy(e);await frames(4);assert(scene.area==='main'&&scene.dungeonCleared,'all enemies plus gate returns with clear');scene.player.setPosition(scene.stageData.exit,scene.groundY(scene.stageData.exit)-48);scene.player.setVelocity(0);await frames(5);assert(scene.status==='complete','main gate completes');assert(loadCampaign().stars[3]===3,'three stars recorded');
  });
  await test('all main collectibles plus exit awards two stars',async()=>{
   await fresh(1);scene.stageData.coins.forEach((_,i)=>scene.mainCoins.add(i));scene.stageData.tapes.forEach((_,i)=>scene.mainRadios.add(i));scene.player.setPosition(scene.stageData.exit,scene.groundY(scene.stageData.exit)-48);scene.player.setVelocity(0);await frames(5);assert(loadCampaign().stars[2]===2,'all coins/radios require stage exit and award two');
  });
  await test('upgrade: purchased lives, repeated charges and permanent unlocks',async()=>{
   await fresh();assert(!scene.upgrades.doubleJump,'double jump locked by default');awardCoin(2000);
   assert(buyItem(1,'extraLife')&&buyItem(1,'ability')&&buyItem(1,'ability'),'repeat charge purchases');assert(buyItem(1,'doubleJump'),'unlock double jump');
   command('stage',0);await frames(5);assert(scene.state.lives===4&&scene.abilityCharges===3,'four lives and three charges');scene.activatePsi();assert(scene.abilityCharges===2&&scene.state.abilityReady,'additional charge usable');scene.die();scene.respawn();assert(scene.state.lives===3&&scene.abilityCharges===2,'death does not restore charge');
   command('stage',1);await frames(5);assert(scene.state.lives===3&&scene.abilityCharges===1&&scene.upgrades.doubleJump,'only permanent upgrades follow to next stage');
  });
  await test('upgrade: double jump cooldown survives landing and room changes',async()=>{
   await fresh();touch.jump=true;await frames(3);touch.jump=false;await frames(8);touch.jump=true;await frames(3);assert(scene.jumpsUsed===2,'purchased second jump');assert(scene.nextDoubleJumpAt>scene.elapsed+9800,'ten second cooldown starts');release();
   scene.player.setPosition(110,410);scene.player.setVelocity(0);await frames(5);touch.jump=true;await frames(3);touch.jump=false;await frames(8);touch.jump=true;await frames(3);assert(scene.jumpsUsed===1,'landing cannot bypass cooldown');release();
   const readyAt=scene.nextDoubleJumpAt;scene.enterDungeon();await frames(4);assert(scene.nextDoubleJumpAt===readyAt,'room change preserves cooldown');scene.leaveDungeon();await frames(4);scene.elapsed=readyAt;scene.player.setPosition(110,410);scene.player.setVelocity(0);await frames(5);touch.jump=true;await frames(3);touch.jump=false;await frames(8);touch.jump=true;await frames(3);assert(scene.jumpsUsed===2,'double jump ready after ten seconds');release();
  });
  await test('upgrade: two fire projectiles both damage, purple sword uses generated art and mouse aim',async()=>{
   assert(buyItem(1,'slingshot'),'level two');await fresh();scene.fire(300,400);assert(scene.bullets.getLength()===2,'level two has two projectiles');assert(scene.bullets.getChildren().every(b=>!(b as Phaser.Physics.Arcade.Image).getData('fire')),'level two not burning');
   assert(buyItem(1,'slingshot')&&buyItem(1,'legendarySword'),'top weapon upgrades');await fresh();scene.state.invincibleUntil=Infinity;const e=scene.enemies[0];e.sprite.setPosition(250,410);e.min=250;e.max=250;e.speed=0;e.hp=10;e.maxHp=10;scene.player.setPosition(170,410);await frames(3);
   scene.fire(250,(e.sprite.body as Phaser.Physics.Arcade.Body).center.y);const shots=scene.bullets.getChildren() as Phaser.Physics.Arcade.Image[];assert(shots.length===2&&shots.every(s=>s.getData('fire')&&s.frame.name==='fire-pellet'),'two generated flame projectiles');await frames(16);assert(e.hp===6,'both fire pellets hit for two each: '+e.hp);
   scene.equip('sword');assert(scene.weapon.texture.key==='held-weapons'&&scene.weapon.frame.name==='grip-purple','equipped sword uses purple generated image with gripping hand');await frames(20);e.sprite.setPosition(220,410);e.min=220;e.max=220;scene.player.setPosition(270,410);scene.player.setVelocity(0);await frames(3);scene.fire(220,(e.sprite.body as Phaser.Physics.Arcade.Body).center.y);await frames(15);assert(e.hp===0,'left aimed legendary sword hits for six');
  });
  await test('upgrade: blue dungeon token doubles main and dungeon earnings once at stage completion',async()=>{
   await fresh();const before=loadCampaign().wallet,main=scene.stageData.coins[0];scene.player.setPosition(main.x,main.y);await frames(4);scene.enterDungeon();await frames(5);const coin=scene.stageData.coins[0];scene.player.setPosition(coin.x,coin.y);await frames(4);scene.enemies.forEach(e=>scene.killEnemy(e));scene.player.setPosition(scene.stageData.exit-85,scene.groundY(scene.stageData.exit)-48);scene.player.setVelocity(0);await frames(6);assert(scene.multiplierCollected,'bobbing generated 2x coin collected');scene.leaveDungeon(true);await frames(4);scene.player.setPosition(scene.stageData.exit,scene.groundY(scene.stageData.exit)-48);scene.player.setVelocity(0);await frames(5);assert(scene.status==='complete','stage finished');assert(loadCampaign().wallet===before+4,'two collected coins credited twice');await frames(8);assert(loadCampaign().wallet===before+4,'payout never repeats');
  });
  await test('boss: stage three windup, five-second slam, two-heart ground hit and jump escape',async()=>{
   await fresh(2);const boss=scene.enemies.find(e=>e.kind==='mindflayer')!;assert(boss.hp===15,'boss has exactly 15 HP');assert(Math.abs(boss.sprite.scaleY*386-136)<1,'visible idle height is twice 68px hero');
   scene.enemies.filter(e=>e!==boss).forEach(e=>{e.sprite.disableBody(true,true);e.bar.clear();e.label.setVisible(false);});
   scene.player.setPosition(2730,410);scene.player.setVelocity(0);scene.state={...scene.state,hearts:3,big:true,invincibleUntil:0};await frames(5);
   scene.elapsed=4380;await frames(2);assert(Number(boss.sprite.frame.name)===2,'arms rise before impact');assert(scene.shockwaves.length===0,'no early impact');
   scene.elapsed=4990;await frames(2);assert(scene.shockwaves.length===2,'slam sends waves in both directions');await frames(49);assert(scene.state.hearts===1&&scene.state.lives===3,'ground wave removes two hearts, not lives');
   scene.shockwaves.forEach(w=>{w.art.destroy();w.trail.destroy();});scene.shockwaves=[];scene.player.setPosition(2830,410);scene.player.setVelocity(0);scene.state.hearts=3;scene.state.invincibleUntil=0;await frames(7);touch.jump=true;await frames(3);boss.lastAttack=scene.elapsed-5000;await frames(30);touch.jump=false;assert(scene.state.hearts===3,'jump avoids actual moving wave');
   scene.hurtEnemy(boss,15,true);await frames(2);assert(!boss.sprite.active&&scene.shockwaves.length===0,'defeat cancels remaining shockwaves');
  });
  await test('billy: stationary laugh, four-second throw cycle and gravity-driven molotov',async()=>{
   await fresh(1);const b=scene.enemies.find(e=>e.kind==='billy')!,originalX=b.sprite.x;assert(b.hp===5,'five HP');
   scene.enemies.filter(e=>e!==b).forEach(e=>{e.sprite.disableBody(true,true);e.bar.clear();e.label.setVisible(false);});assert(!b.aggro&&Number(b.sprite.frame.name)<2,'idle laughing animation');
   scene.player.setPosition(originalX-150,scene.groundY(originalX-150)-48);scene.player.setVelocity(0);scene.state.invincibleUntil=Infinity;await frames(5);b.lastAttack=scene.elapsed;
   scene.elapsed=b.lastAttack+3700;await frames(2);assert(Number(b.sprite.frame.name)===2,'bottle raised before throw');assert(scene.hostileShots.getLength()===0,'no shot before four seconds');scene.elapsed=b.lastAttack+3990;await frames(2);
   const shot=scene.hostileShots.getChildren()[0] as Phaser.Physics.Arcade.Image;assert(shot?.getData('molotov'),'throws real bottle');const velocity=shot.body!.velocity.y;assert(velocity<0&&(shot.body as Phaser.Physics.Arcade.Body).allowGravity,'bottle launches upward on gravity arc');await frames(14);assert(shot.body!.velocity.y>velocity,'gravity bends trajectory');
   const previous=b.lastAttack;scene.elapsed=previous+3990;await frames(2);assert(b.lastAttack>=previous+4000,'next throw after four seconds');assert(b.sprite.x===originalX&&b.sprite.body!.velocity.x===0,'wheelchair never chases');
   const bottle=scene.hostileShots.getChildren().find(o=>(o as Phaser.Physics.Arcade.Image).getData('molotov')) as Phaser.Physics.Arcade.Image;assert(!!bottle,'second bottle exists');bottle.setPosition(originalX, b.baseY-2);scene.explodeMolotov(bottle);assert(scene.firePatches.length>0,'impact produces temporary ground fire');
   scene.player.setPosition(110,410);await frames(3);assert(!b.aggro&&Number(b.sprite.frame.name)<2,'returns to laugh when hero leaves');
  });
  await test('medkit: pickup above floating platform restores HP and waits when health is full',async()=>{
   await fresh();scene.enemies.forEach(e=>{e.sprite.disableBody(true,true);e.bar.clear();e.label.setVisible(false);});const p=medkitPlacement(scene.stageData);scene.player.setPosition(p.x,p.y+10);scene.player.setVelocity(0);scene.state.hearts=3;await frames(6);assert(!scene.consumedPickups.has('mainmedkit'),'full health does not waste medkit');scene.state.hearts=2;await frames(5);assert(scene.state.hearts===3&&scene.consumedPickups.has('mainmedkit'),'standing on floating platform collects and heals');
  });
  const expected=billyOnly?2:bossOnly?1:weaponsOnly?2:upgradeOnly?4:new URLSearchParams(location.search).has('dungeonOnly')?4:22;report('RESULT: '+passed+'/'+expected+' engine checks passed.');document.title='PASS '+passed+'/'+expected+' — RAMZY';
 }catch(e){release();scene.pause();report('RESULT: stopped after '+passed+' passed. '+String(e));document.title='FAIL — Signal 86';}
 finally{if(upgradeOnly){if(savedCampaign===null)localStorage.removeItem(CAMPAIGN_KEY);else localStorage.setItem(CAMPAIGN_KEY,savedCampaign);if(savedLegacy===null)localStorage.removeItem('ramzy-v2-progress');else localStorage.setItem('ramzy-v2-progress',savedLegacy);}}
};
