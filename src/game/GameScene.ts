import Phaser from 'phaser';
import {preloadEnvironments,drawEnvironment,drawSurface} from './environments';
import { STAGES, DUNGEONS, type Stage, type EnemyKind } from './levels';
import { PHYSICS, advanceVelocity, cutJump, isStomp, takeHit, checkpointRespawn, initialState, type PlayerState } from './mechanics';
import { commands, updates, touch, settings, sound, type Status } from './bridge';
import {enemyStats,hitEnemy,shouldAggro,tryJump,crouchBox,canStand,useAbility,chooseTarget,readPad,clampChaseVelocity,blocksPageScroll} from './combat';
import {canUseDungeonDoor,hasGroundSupport} from './dungeons';
import {awardCoin,takeStageLoadout,loadCampaign,recordStageResult,type StageLoadout} from './campaign';
import {WEAPONS,projectileInRange,slingshotStats,swordDamage,swordAimInRange,canDoubleJump,DOUBLE_JUMP_COOLDOWN,stageCoinBonus,type WeaponKind} from './weapons';
import {weaponPose} from './weaponPose';
import {MIND_FLAYER,waveHitsPlayer,takeWaveHit} from './mindFlayer';
import {BILLY,billyCanAttack,molotovVelocity} from './billy';
import {medkitPlacement} from './pickupPlacement';
import {VECNA,vecnaLandingHits,takeVecnaHit} from './vecna';
import {enemyCoinReward} from './rewards';
import {BossDirector} from './BossDirector';
import {preloadBossAssets,registerBossAssets} from './bossAssets';
import {startEnemyAction,actionMotion,type EnemyAction} from './enemyActions';

export type Enemy = {action?:EnemyAction;index:number;sprite:Phaser.Physics.Arcade.Sprite;min:number;max:number;speed:number;kind:EnemyKind;baseY:number;phase:number;hp:number;maxHp:number;invulnerableUntil:number;aggro:boolean;alertAt:number;lastAttack:number;bar:Phaser.GameObjects.Graphics;label:Phaser.GameObjects.Text;controlledAt:number;liftY:number;target?:{x:number;y:number};leap?:{at:number;x:number;y:number;tx:number;ty:number};marker?:Phaser.GameObjects.Graphics;landedAt?:number};
const propKeys=['grass','stone','forest','metal','rift','floating','metal-platform','rift-platform','bush','rock','barrel','barricade','cone','log','fence','lamp','streetlamp','pole','wood-fence','tree','tower','drain','waterpipe','portal','sign','radio','tape','battery','keycard','heart','coin','mushroom','energy','medkit','key','vial'];

export class GameScene extends Phaser.Scene {
 bossDirector=new BossDirector(this);
 stageData!:Stage;player!:Phaser.Physics.Arcade.Sprite;solids!:Phaser.Physics.Arcade.StaticGroup;
 enemies:Enemy[]=[];state:PlayerState=initialState();status:Status='ready';
 keys!:Record<string,Phaser.Input.Keyboard.Key>;sky!:Phaser.GameObjects.TileSprite;fog!:Phaser.GameObjects.TileSprite;
 portal!:Phaser.GameObjects.Image;checkpoint!:Phaser.GameObjects.Image;halo!:Phaser.GameObjects.Arc;
 motes:{obj:Phaser.GameObjects.Rectangle;speed:number;phase:number}[]=[];
 groundedAt=-10000;pressedAt=-10000;jumpHeld=false;previousBottom=0;lastEmit=0;elapsed=0;notice='';noticeUntil=0;
 resizeBig=false;knockUntil=0;checkpointActive=false;sceneTime=0;listeners:{name:string;fn:EventListener}[]=[];
 bullets!:Phaser.Physics.Arcade.Group;hostileShots!:Phaser.Physics.Arcade.Group;enemyGroup!:Phaser.Physics.Arcade.Group;weapon!:Phaser.GameObjects.Image;
 jumpsUsed=0;crouching=false;lastShot=-1000;abilityHeld=false;padPauseHeld=false;padConnected=false;aimAngle=0;psiBeam!:Phaser.GameObjects.Graphics;
 screenOffsetX=0;screenOffsetY=0;
 area:'main'|'dungeon'='main';dungeonCleared=false;doorHeld=false;mainCheckpoint=110;
 mainCoins=new Set<number>();mainRadios=new Set<number>();dungeonCoins=new Set<number>();mainKills=new Set<number>();dungeonKills=new Set<number>();consumedPickups=new Set<string>();
 loadout:StageLoadout={extraLife:false,extraCharges:0};upgrades=loadCampaign();abilityCharges=1;nextDoubleJumpAt=0;multiplierCollected=false;bonusAwarded=false;swordAngle=0;bonusCoin?:Phaser.Physics.Arcade.Image;killCoins=0;
 equipped:WeaponKind='slingshot';swingStarted=-1000;meleeHitDone=true;switchHeld=false;
 shockwaves:{x:number;y:number;origin:number;direction:number;hit:boolean;bornAt:number;source:Enemy;art:Phaser.GameObjects.Image;trail:Phaser.GameObjects.Graphics;vecna?:boolean}[]=[];
 impacts:{art:Phaser.GameObjects.Image;bornAt:number}[]=[];
 firePatches:{x:number;y:number;expires:number;art:Phaser.GameObjects.Graphics}[]=[];

 constructor(){super('world');}
 preload(){
  const base=import.meta.env.BASE_URL+'assets/';
  preloadEnvironments(this,base);
  preloadBossAssets(this,base);
  this.load.spritesheet('hero',base+'hero.png',{frameWidth:96,frameHeight:112});
  for(const key of ['husk-jump','crawler-rush'])this.load.spritesheet(key,base+key+'.png',{frameWidth:128,frameHeight:112});
  for(const key of ['crawler','bloom','bat','slime','husk'])this.load.spritesheet(key,base+key+'.png',{frameWidth:128,frameHeight:112});
  propKeys.forEach(key=>this.load.image(key,base+key+'.png'));
  for(const tile of ['grass','stone','forest','metal','rift']){this.load.image(tile+'-fill',base+tile+'-fill.png');this.load.image(tile+'-tile',base+tile+'-tile.png');}
  this.load.json('terrain',base+'terrain.json');
  this.load.image('sky',base+'sky.png');
  this.load.image('upgrades',base+'upgrade-atlas.png');
  this.load.image('held-weapons',base+'held-weapons.png');
  this.load.image('mindflayer',base+'mind-flayer.png');
  this.load.image('billy',base+'billy-wheelchair.png');
  this.load.image('shockwave',base+'psychic-shockwave.png');
  this.load.image('vecna',base+'vecna.png');
  this.load.image('vecna-impact',base+'vecna-impact.png');
 }
 create(){
  registerBossAssets(this);
  const bossTexture=this.textures.get('mindflayer'),cuts=[0,575,1094,1636,2172];
  for(let i=0;i<4;i++)bossTexture.add(i,0,cuts[i],0,cuts[i+1]-cuts[i],648);
  const billyTexture=this.textures.get('billy'),billyCuts=[0,543,1086,1614,2172];
  for(let i=0;i<4;i++)billyTexture.add(i,0,billyCuts[i],0,billyCuts[i+1]-billyCuts[i],724);
  const waveTexture=this.textures.get('shockwave'),waveSource=waveTexture.getSourceImage() as HTMLImageElement;
  for(let i=0;i<4;i++){const left=Math.round(i*waveSource.width/4),right=Math.round((i+1)*waveSource.width/4);waveTexture.add(i,0,left,150,right-left,360);}
  const vecnaTexture=this.textures.get('vecna'),vecnaCuts=[0,510,1100,1532,2171];
  for(let i=0;i<4;i++)vecnaTexture.add(i,0,vecnaCuts[i],0,vecnaCuts[i+1]-vecnaCuts[i],724);
  const impactTexture=this.textures.get('vecna-impact'),impactSource=impactTexture.getSourceImage() as HTMLImageElement;
  for(let i=0;i<4;i++){
   const left=Math.round(i*impactSource.width/4),right=Math.round((i+1)*impactSource.width/4);
   impactTexture.add('blast-'+i,0,left,0,right-left,475);
   impactTexture.add('wave-'+i,0,left,535,right-left,265);
  }
  const spriteAnims:Record<string,{key:string;frames:number[];rate:number}>={
   idle:{key:'hero',frames:[0,0,0,15,0,0],rate:3},walk:{key:'hero',frames:[1,2,3,4],rate:9},run:{key:'hero',frames:[5,6,7],rate:13},
   jump:{key:'hero',frames:[8,9],rate:5},fall:{key:'hero',frames:[10,9],rate:5},hurt:{key:'hero',frames:[12,13],rate:7},
   bigidle:{key:'hero',frames:[16,16,17,16],rate:3},bigwalk:{key:'hero',frames:[17,18],rate:9},bigrun:{key:'hero',frames:[17,18],rate:14},
   bigjump:{key:'hero',frames:[19,20],rate:5},bigfall:{key:'hero',frames:[20,19],rate:5}
  };
  for(const [name,a] of Object.entries(spriteAnims))if(!this.anims.exists(name))this.anims.create({key:name,frames:a.frames.map(frame=>({key:a.key,frame})),frameRate:a.rate,repeat:-1});
  for(const kind of ['crawler','bloom','bat','slime','husk'])if(!this.anims.exists(kind))this.anims.create({key:kind,frames:this.anims.generateFrameNumbers(kind,{start:0,end:3}),frameRate:kind==='bat'?9:5,repeat:-1});
  this.keys=this.input.keyboard!.addKeys('LEFT,RIGHT,UP,DOWN,A,D,W,S,SPACE,SHIFT,X,P,ESC,R,Q,F,ONE,TWO,E') as typeof this.keys;
  this.input.keyboard!.removeCapture(Object.values(Phaser.Input.Keyboard.KeyCodes).filter(v=>typeof v==='number') as number[]);
  this.game.canvas.tabIndex=0;
  const preventScroll=(event:KeyboardEvent)=>{if(this.status==='playing'&&!settings.menuOpen&&blocksPageScroll(event.key))event.preventDefault();};
  this.game.canvas.addEventListener('keydown',preventScroll);
  this.events.once('shutdown',()=>this.game.canvas.removeEventListener('keydown',preventScroll));
  this.physics.world.setBounds(0,0,3340,700);
  this.bind('start',()=>this.startPlay());
  this.bind('psi',()=>{if(this.status==='playing'){this.activatePsi();this.game.canvas.focus({preventScroll:true});}});
  this.bind('weapon',(e)=>{const kind=(e as CustomEvent).detail;if(kind==='slingshot'||kind==='sword')this.equip(kind);});
  this.bind('pause',()=>this.pause());
  this.bind('resume',()=>this.resume());
  this.bind('restart',()=>{this.loadStage(this.stageData.id-1);this.startPlay();});
  this.bind('stage',(e)=>{const index=Number((e as CustomEvent).detail);this.loadout=takeStageLoadout(index+1);this.loadStage(index);this.startPlay();});
  this.bind('menu',()=>{this.loadout={extraLife:false,extraCharges:0};this.loadStage(this.stageData.id-1);});
  this.game.events.on(Phaser.Core.Events.BLUR,this.onBlur,this);
  this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{if(p.leftButtonDown()&&this.status==='playing'&&!settings.menuOpen){this.game.canvas.focus({preventScroll:true});this.fire(p.worldX,p.worldY);}});
  this.events.once('shutdown',()=>{this.listeners.forEach(l=>commands.removeEventListener(l.name,l.fn));this.game.events.off(Phaser.Core.Events.BLUR,this.onBlur,this);});
  this.loadStage(0);
 }
 bind(name:string,fn:EventListener){commands.addEventListener(name,fn);this.listeners.push({name,fn});}
 onBlur(){if(this.status==='playing')this.pause();}
 emitHud(){updates.dispatchEvent(new CustomEvent('hud',{detail:{...this.state,charges:this.abilityCharges,slingshotLevel:this.upgrades.slingshotLevel,swordLevel:this.upgrades.swordLevel,doubleJumpUnlocked:this.upgrades.doubleJump,doubleJumpCooldown:Math.max(0,Math.ceil((this.nextDoubleJumpAt-this.elapsed)/1000)),coinMultiplier:this.multiplierCollected?2:1,stage:this.stageData.id,progress:Math.max(0,Math.min(100,Math.round((this.player.x/this.stageData.exit)*100))),status:this.status,time:Math.floor(this.elapsed/1000),notice:this.notice,gamepad:this.padConnected,weapon:this.equipped,area:this.area,dungeonCleared:this.dungeonCleared,dungeonRemaining:this.enemies.filter(e=>e.sprite.active&&e.hp>0).length,totalCoins:STAGES[this.stageData.id-1].coins.length,totalRadios:STAGES[this.stageData.id-1].tapes.length}}));}

 loadStage(index:number,area:'main'|'dungeon'='main',preserveRun=false){
  const previous={...this.state},previousElapsed=this.elapsed;
  this.bossDirector.clear();
  if(!preserveRun){this.mainCoins.clear();this.mainRadios.clear();this.dungeonCoins.clear();this.mainKills.clear();this.dungeonKills.clear();this.consumedPickups.clear();this.dungeonCleared=false;this.mainCheckpoint=110;this.upgrades=loadCampaign();this.abilityCharges=1+this.loadout.extraCharges;this.nextDoubleJumpAt=0;this.multiplierCollected=false;this.bonusAwarded=false;this.killCoins=0;}
  this.area=area;
  this.physics.world.colliders.destroy();
  this.solids?.destroy(true,true);this.bullets?.destroy(true,true);this.hostileShots?.destroy(true,true);this.enemyGroup?.destroy(true,true);
  this.tweens.killAll();this.time.removeAllEvents();this.children.removeAll(true);
  this.enemies=[];this.motes=[];this.shockwaves=[];this.impacts=[];this.firePatches=[];this.bonusCoin=undefined;this.stageData=(area==='dungeon'?DUNGEONS:STAGES)[Math.max(0,Math.min(9,index))];this.state=preserveRun?previous:{...initialState(),lives:this.loadout.extraLife?4:3};
  if(preserveRun)this.state.checkpoint=area==='dungeon'?80:this.mainCheckpoint;
  this.status='ready';this.elapsed=preserveRun?previousElapsed:0;this.groundedAt=-10000;this.pressedAt=-10000;this.jumpHeld=false;this.checkpointActive=false;this.resizeBig=false;this.notice='';this.jumpsUsed=0;this.crouching=false;this.lastShot=-1000;this.abilityHeld=false;this.padPauseHeld=false;this.equipped='slingshot';this.swingStarted=-1000;this.meleeHitDone=true;
  this.knockUntil=0;this.previousBottom=0;this.switchHeld=false;
  const stage=this.stageData;const cam=this.cameras.main;
  this.physics.world.setBounds(0,0,stage.width,700);
  const renderScale=this.scale.width/960;this.screenOffsetX=(this.scale.width-960)/2;this.screenOffsetY=(this.scale.height-540)/2;
  cam.resetFX();cam.setZoom(renderScale);cam.setBounds(0,0,stage.width,540);cam.setScroll(-this.screenOffsetX,-this.screenOffsetY);cam.setBackgroundColor('#0d1528');
  // Retain the atmospheric plane used by update; location imagery never tiles or drifts.
  this.sky=this.add.tileSprite(0,0,960,540,'sky').setOrigin(0).setScrollFactor(0).setDepth(-40).setAlpha(.15);
  drawEnvironment(this,stage,area==='dungeon',settings.reducedMotion);
  this.halo=this.add.circle(760,110,65,stage.color,.035).setScrollFactor(0).setDepth(-32);
  if(!settings.reducedMotion)this.tweens.add({targets:this.halo,alpha:.08,duration:3300,yoyo:true,repeat:-1});
  this.makeFog();
  this.solids=this.physics.add.staticGroup();
  for(const p of [...stage.platforms,...stage.ceilings]){
   const collider=this.add.rectangle(p.x+p.w/2,p.y+14,p.w,28,0x000000,0);
   this.physics.add.existing(collider,true);this.solids.add(collider);
   drawSurface(this,stage,p,stage.ceilings.includes(p),area==='dungeon');
  }
  const doorX=area==='main'?stage.dungeonX:80;this.prop('drain',doorX,this.groundY(doorX),125,2).setTint(area==='dungeon'?0x9e84b8:0xffffff);
  this.add.text(doorX,this.groundY(doorX)-143,area==='main'?(this.dungeonCleared?'DUNGEON CLEAR':'DUNGEON / ↓'):'RETURN / ↑ ↓',{fontFamily:'monospace',fontSize:'12px',color:'#d4b2ee',stroke:'#101020',strokeThickness:3}).setOrigin(.5).setDepth(5);
  if(area==='dungeon'){this.sky.setTint(0x48315e);this.fog.setTint(0x8b4da1);}
  this.checkpoint=this.prop('radio',stage.checkpoint,this.groundY(stage.checkpoint),56,3).setTint(0x96b3bd);
  const cp=this.add.zone(stage.checkpoint,this.groundY(stage.checkpoint)-42,55,84);
  this.physics.add.existing(cp,true);
  this.player=this.physics.add.sprite(110,this.groundY(110)-48,'hero',0).setDepth(10);
  this.player.setSize(27,60).setOffset(35,44).setMaxVelocity(400,900);
  this.physics.add.collider(this.player,this.solids);
  for(const hazard of stage.hazards){
   const spikes=this.add.graphics().setDepth(4);spikes.fillStyle(0x8fa8b5);for(let x=hazard.x;x<hazard.x+hazard.w;x+=10){spikes.fillTriangle(x,hazard.y,x+5,hazard.y-14,x+10,hazard.y);}
   const zone=this.add.zone(hazard.x+hazard.w/2,hazard.y-5,hazard.w-6,8);this.physics.add.existing(zone,true);
   this.physics.add.overlap(this.player,zone,()=>{if(this.status==='playing')this.damage(hazard.x+hazard.w/2);});
  }
  if(stage.ceilings.length)this.add.text(stage.ceilings[0].x-32,this.groundY(200)-24,'↓',{fontFamily:'monospace',fontSize:'20px',color:'#adc7c1'}).setDepth(4);
  this.physics.add.overlap(this.player,cp,()=>{
   if(this.checkpointActive||this.area==='dungeon')return;
   this.checkpointActive=true;this.state.checkpoint=stage.checkpoint;this.mainCheckpoint=stage.checkpoint;this.checkpoint.clearTint();this.pop('CHECKPOINT',stage.checkpoint,this.groundY(stage.checkpoint)-90,0x7ce4cb);
   this.notify('چک‌پوینت فعال شد');sound('checkpoint');this.burst(stage.checkpoint,this.checkpoint.y-30,0x7ce4cb,16);this.emitHud();
  });
  for(const [i,c] of stage.coins.entries())if(!(area==='main'?this.mainCoins:this.dungeonCoins).has(i))this.pickup('coin',c.x,c.y,26,()=>{(this.area==='main'?this.mainCoins:this.dungeonCoins).add(i);this.state.coins=this.mainCoins.size+this.dungeonCoins.size+this.killCoins;awardCoin();this.state.score+=100;sound('coin');});
  for(const [i,c] of stage.tapes.entries())if(!this.mainRadios.has(i))this.pickup('radio',c.x,c.y,39,()=>{this.mainRadios.add(i);this.state.tapes=this.mainRadios.size;this.state.score+=500;this.notify('رادیوی گمشده پیدا شد');sound('power');});
  if(!this.consumedPickups.has(area+'energy'))this.pickup('energy',stage.power.x,stage.power.y,35,()=>{this.consumedPickups.add(area+'energy');this.state.big=true;this.state.score+=300;this.notify('انرژی فعال شد — قهرمان بزرگ شد');sound('power');this.burst(this.player.x,this.player.y,0x7ce4cb,22);});
  // A second power-up after the checkpoint makes later mistakes recoverable.
  const medkit=medkitPlacement(stage);
  if(!this.consumedPickups.has(area+'medkit'))this.pickup('medkit',medkit.x,medkit.y,30,()=>{this.consumedPickups.add(area+'medkit');this.state.hearts=Math.min(3,this.state.hearts+1);sound('power');this.notify('سلامتی بازیابی شد');},undefined,()=>this.state.hearts<3);
  this.bullets=this.physics.add.group({allowGravity:false});this.hostileShots=this.physics.add.group({allowGravity:false});this.enemyGroup=this.physics.add.group({allowGravity:true});
  this.makeCombatTextures();
  this.weapon=this.add.image(110,370,'slingshot').setOrigin(.5,.7).setDepth(12);
  this.updateWeaponArt();
  this.psiBeam=this.add.graphics().setDepth(14);
  for(const [enemyIndex,e] of stage.enemies.entries()){
   if((this.area==='main'?this.mainKills:this.dungeonKills).has(enemyIndex))continue;
   const flying=e.kind==='bat',boss=e.kind==='mindflayer',billy=e.kind==='billy',vecna=e.kind==='vecna';
   const enemy=this.physics.add.sprite(e.x,boss||billy||vecna?e.y:e.y-(flying?160:48),e.kind,0).setDepth(8);
   this.enemyGroup.add(enemy);
   if(boss){enemy.setOrigin(.5,636/648).setScale(136/386).setSize(enemy.width*.48,enemy.height*.5).setOffset(enemy.width*.26,636-enemy.height*.5);}
   else if(billy)enemy.setOrigin(.5,695/724).setScale(80/646).setSize(enemy.width*.62,470).setOffset(enemy.width*.19,225).setImmovable(true);
   else if(vecna)enemy.setOrigin(.5,678/724).setScale(204/554).setSize(enemy.width*.4,450).setOffset(enemy.width*.3,228).setImmovable(true);
   else enemy.setScale(flying?.69:.72).setSize(68,48).setOffset(29,56);
   const body=enemy.body as Phaser.Physics.Arcade.Body;body.setAllowGravity(!flying&&!billy&&!vecna);
   if(!boss&&!billy&&!vecna)enemy.play(e.kind);if(!flying&&!billy&&!vecna)this.physics.add.collider(enemy,this.solids);
   const stats=enemyStats(e.kind,stage.id+(this.area==='dungeon'?5:0));
   const bar=this.add.graphics().setDepth(12);const label=this.add.text(enemy.x,enemy.y-56,stats.hp+'/'+stats.hp,{fontFamily:'monospace',fontSize:'9px',color:'#d7dfd9',stroke:'#0c1018',strokeThickness:3}).setOrigin(.5).setDepth(12);
   this.enemies.push({index:enemyIndex,sprite:enemy,min:e.min,max:e.max,speed:stats.speed,kind:e.kind,baseY:enemy.y,phase:e.x*.02,hp:stats.hp,maxHp:stats.hp,invulnerableUntil:0,aggro:false,alertAt:-10000,lastAttack:boss||billy||vecna?this.elapsed:-1000,bar,label,controlledAt:-1,liftY:enemy.y});
   this.physics.add.overlap(this.player,enemy,()=>this.encounter(enemy));
  }
  for(const e of this.enemies)this.bossDirector.attach(e);
  this.physics.add.collider(this.bullets,this.solids,b=>b.destroy());
  this.physics.add.collider(this.hostileShots,this.solids,b=>{const shot=b as Phaser.Physics.Arcade.Image;if(shot.getData('molotov'))this.explodeMolotov(shot);else shot.destroy();});
  this.physics.add.overlap(this.bullets,this.enemyGroup,(bullet,enemy)=>{
   const shot=bullet as Phaser.Physics.Arcade.Image;
   const e=this.enemies.find(e=>e.sprite===enemy);if(!shot.active||!e||e.controlledAt>=0||e.hp<=0)return;
   const core=this.bossDirector.hitTargets(e).find(t=>t.kind==='core');
   // Let a pellet cross the legacy outer body until it reaches the visible core.
   if(core&&Math.hypot(shot.x-core.x,shot.y-core.y)>core.r)return;
   const damage=shot.getData('damage') as number,point={x:shot.x,y:shot.y};shot.destroy();this.hurtEnemy(e,damage,true,point);
  });
  this.physics.add.overlap(this.player,this.hostileShots,(_player,obj)=>{const shot=obj as Phaser.Physics.Arcade.Image;if(this.status!=='playing'||!shot.active)return;const x=shot.x;if(shot.getData('molotov'))this.explodeMolotov(shot);else shot.destroy();this.damage(x);});
  this.portal=this.prop('portal',stage.exit,this.groundY(stage.exit),156,6);
  const portalAura=this.add.circle(stage.exit,this.portal.y-76,48,stage.color,.12).setDepth(5);
  this.tweens.add({targets:portalAura,scale:1.35,alpha:.3,duration:1900,yoyo:true,repeat:-1});
  this.tweens.add({targets:this.portal,alpha:.78,duration:1500,yoyo:true,repeat:-1});
  this.add.text(stage.exit-3,this.portal.y-180,area==='dungeon'?'CLEAR ALL / EXIT':stage.id===10?'DEFEAT 4 BOSSES / EXIT':'EXIT',{fontFamily:'monospace',fontSize:'13px',color:'#efbdad',letterSpacing:4}).setOrigin(.5).setDepth(6);
  if(area==='dungeon'&&!this.multiplierCollected)this.bonusCoin=this.pickup('upgrades',stage.exit-85,this.groundY(stage.exit)-40,40,()=>{this.multiplierCollected=true;this.notify('۲x فعال شد؛ با برد مرحله سکه‌های این مرحله دو برابر می‌شوند.');sound('power');},'bonus-coin',()=>this.enemies.every(e=>!e.sprite.active||e.hp<=0)).setVisible(this.enemies.length===0);
  for(let i=0;i<38;i++){
   const obj=this.add.rectangle((i*137)%960,(i*73)%540,i%3===0?3:2,2,i%2?0xdb6a67:0x87a1b2,.4).setScrollFactor(0).setDepth(15);
   this.motes.push({obj,speed:8+i%9,phase:i});
  }
  // Soft lightning with no full-screen flashes. Disabled by reduced motion.
  if(!settings.reducedMotion&&(area==='dungeon'||stage.id===9))this.time.addEvent({delay:8200,loop:true,callback:()=>{
   const g=this.add.graphics().setPosition(this.screenOffsetX,this.screenOffsetY).setDepth(-24).setScrollFactor(0);g.lineStyle(2,stage.color,.45);g.beginPath();g.moveTo(720,0);g.lineTo(690,65);g.lineTo(713,61);g.lineTo(670,150);g.strokePath();
   this.tweens.add({targets:g,alpha:0,duration:900,onComplete:()=>g.destroy()});
  }});
  cam.startFollow(this.player,true,.075,.075,-145,0);cam.setDeadzone(120,540);
  // Keep 960×540 world units and native physics while rendering an exact
  // 1920×1080 canvas. Account for camera zoom in screen/parallax planes.
  for(const child of this.children.list){const o=child as Phaser.GameObjects.Image;if(typeof o.scrollFactorX==='number'&&typeof o.x==='number'){o.x+=this.screenOffsetX*(1-o.scrollFactorX);o.y+=this.screenOffsetY*(1-o.scrollFactorY);}}
  this.player.play('idle');this.physics.pause();this.emitHud();
 }
 enterDungeon(){
  if(this.area!=='main'||this.dungeonCleared)return;
  this.mainCheckpoint=this.state.checkpoint;this.loadStage(this.stageData.id-1,'dungeon',true);this.startPlay(false);this.doorHeld=true;this.jumpHeld=this.keys.UP.isDown||this.keys.W.isDown||this.keys.SPACE.isDown;
  this.notify('دانجن: همهٔ دشمن‌ها را بزن؛ برای برگشت، کنار ورودی بالا یا پایین را بزن.');
 }
 leaveDungeon(cleared=false){
  if(this.area!=='dungeon')return;
  this.dungeonCleared=this.dungeonCleared||cleared;const index=this.stageData.id-1,x=STAGES[index].dungeonX;
  this.loadStage(index,'main',true);this.player.setPosition(x+5,this.groundY(x+5)-48);this.player.setVelocity(0);this.startPlay(false);this.doorHeld=true;this.jumpHeld=this.keys.UP.isDown||this.keys.W.isDown||this.keys.SPACE.isDown;
  this.notify(cleared?'دانجن پاک شد؛ برای ثبت سه ستاره به انتهای مرحله برس.':'بازگشت به مسیر اصلی؛ دانجن هنوز پاک نشده.');
 }
 groundY(x:number){return this.stageData.platforms.find(p=>!p.kind&&x>=p.x&&x<=p.x+p.w)?.y??458;}
 prop(key:string,x:number,y:number,height:number,depth=1){const img=this.add.image(x,y,key).setOrigin(.5,1).setDepth(depth);img.setScale(height/img.height);return img;}
 makeFog(){
  if(!this.textures.exists('fog')){const canvas=this.textures.createCanvas('fog',512,128)!;const ctx=canvas.context;const grad=ctx.createLinearGradient(0,0,0,128);grad.addColorStop(0,'rgba(54,100,133,0)');grad.addColorStop(.6,'rgba(54,100,133,.20)');grad.addColorStop(1,'rgba(54,100,133,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,512,128);canvas.refresh();}
  this.fog=this.add.tileSprite(0,325,960,150,'fog').setOrigin(0).setScrollFactor(0).setDepth(-5);
 }
 pickup(key:string,x:number,y:number,size:number,onCollect:()=>void,frame?:string,canCollect=()=>true){
  const sprite=this.physics.add.image(x,y,key,frame).setDepth(6);sprite.setScale(size/Math.max(sprite.width,sprite.height));
  const b=sprite.body as Phaser.Physics.Arcade.Body;b.setAllowGravity(false);b.setSize(sprite.width*.8,sprite.height*.8);
  this.tweens.add({targets:sprite,y:y-7,duration:1000+(x%400),yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
  if(key==='coin')this.tweens.add({targets:sprite,scaleX:sprite.scaleX*.22,duration:600,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
  this.physics.add.overlap(this.player,sprite,()=>{
   if(this.status!=='playing'||!sprite.active||!canCollect())return;
   this.burst(sprite.x,sprite.y,key==='coin'?0xf9c967:0x7ce4cb,8);onCollect();sprite.destroy();this.emitHud();
  });
  return sprite;
 }
 notify(text:string){this.notice=text;this.noticeUntil=this.sceneTime+3200;}
 startPlay(restartMusic=true){if(this.status==='playing')return;if(restartMusic)updates.dispatchEvent(new Event('music-restart'));this.status='playing';this.physics.resume();if(restartMusic)this.input.keyboard?.resetKeys();this.game.canvas.focus({preventScroll:true});this.emitHud();}
 pause(){if(this.status!=='playing')return;this.status='paused';this.physics.pause();this.emitHud();}
 resume(){if(this.status!=='paused')return;this.status='playing';this.physics.resume();this.input.keyboard?.resetKeys();this.game.canvas.focus({preventScroll:true});this.emitHud();}
 burst(x:number,y:number,color:number,count:number){
  for(let i=0;i<count;i++){const r=this.add.rectangle(x,y,3+(i%2),3,color).setDepth(20);const a=i*Math.PI*2/count;
   this.tweens.add({targets:r,x:x+Math.cos(a)*34,y:y+Math.sin(a)*30+15,alpha:0,duration:440,onComplete:()=>r.destroy()});}
 }
 pop(text:string,x:number,y:number,color=0xf5c76d){const t=this.add.text(x,y,text,{fontFamily:'monospace',fontSize:'15px',color:Phaser.Display.Color.IntegerToColor(color).rgba}).setOrigin(.5).setDepth(25);this.tweens.add({targets:t,y:y-40,alpha:0,duration:1000,onComplete:()=>t.destroy()});}
 makeCombatTextures(){
  if(!this.textures.exists('molotov')){const g=this.add.graphics();g.fillStyle(0x10261e);g.fillRect(1,5,7,11);g.fillStyle(0x6a985a);g.fillRect(2,6,4,8);g.fillRect(3,2,3,5);g.fillStyle(0xe4c894);g.fillRect(4,0,5,3);g.fillStyle(0xff7929);g.fillTriangle(7,3,8,-5,11,1);g.fillStyle(0xffe49b);g.fillRect(8,-1,2,3);g.generateTexture('molotov',12,18);g.destroy();}
  const atlas=this.textures.get('upgrades');
  if(!atlas.has('steel-blade')){
   // Trim the generated atlas at runtime so the hilt sits in the hero's hand.
   atlas.add('steel-blade',0,574,452,181,408);atlas.add('legendary-blade',0,990,430,250,445);
   atlas.add('sling-double',0,1385,65,270,340);atlas.add('sling-fire',0,45,460,330,380);
   atlas.add('fire-pellet',0,285,695,65,70);atlas.add('bonus-coin',0,1385,495,345,340);
  }
  if(!this.textures.exists('pellet')){const g=this.add.graphics();g.fillStyle(0xe9dcb9);g.fillRect(1,0,4,6);g.fillRect(0,1,6,4);g.generateTexture('pellet',6,6);g.destroy();}
  if(!this.textures.exists('slingshot')){const g=this.add.graphics();g.fillStyle(0x38231c);g.fillRect(8,9,6,16);g.fillRect(2,1,6,12);g.fillRect(14,1,6,12);g.fillStyle(0xb58952);g.fillRect(9,10,3,13);g.fillRect(3,2,3,9);g.fillRect(15,2,3,9);g.lineStyle(2,0xe8d1a2);g.lineBetween(4,2,11,11);g.lineBetween(17,2,11,11);g.generateTexture('slingshot',22,26);g.destroy();}
  if(!this.textures.exists('sword')){const g=this.add.graphics();g.fillStyle(0x0b1520);g.fillPoints([{x:12,y:0},{x:17,y:6},{x:16,y:31},{x:20,y:31},{x:20,y:35},{x:14,y:35},{x:14,y:43},{x:8,y:43},{x:8,y:35},{x:3,y:35},{x:3,y:31},{x:7,y:31},{x:7,y:6}],true);g.fillStyle(0xc5d5dd);g.fillRect(9,7,5,25);g.fillTriangle(9,8,12,2,15,8);g.fillStyle(0x6e91a4);g.fillRect(13,8,2,24);g.fillStyle(0xe4b36c);g.fillRect(5,32,13,2);g.fillStyle(0x754a36);g.fillRect(10,35,3,7);g.generateTexture('sword',24,44);g.destroy();}
 }
 updateWeaponArt(){
  const atlas=this.textures.get('held-weapons');
  if(!atlas.has('grip-sling')){
   const source=atlas.getSourceImage() as HTMLImageElement,w=source.width/4,h=source.height;
   ['grip-sling','grip-fire','grip-steel','grip-purple'].forEach((name,i)=>atlas.add(name,0,Math.round(i*w),0,Math.round((i+1)*w)-Math.round(i*w),h));
  }
  const frame=this.equipped==='sword'?(this.upgrades.swordLevel===2?'grip-purple':'grip-steel'):(this.upgrades.slingshotLevel===3?'grip-fire':'grip-sling');
  this.weapon.setTexture('held-weapons',frame);const height=this.equipped==='sword'?60:48;
  this.weapon.setDisplaySize(height*this.weapon.width/this.weapon.height,height).setOrigin(.5,.77);
 }
 equip(kind:WeaponKind){this.equipped=kind;if(this.weapon)this.updateWeaponArt();this.game.canvas.focus({preventScroll:true});this.emitHud();}
 fire(targetX?:number,targetY?:number){
  if(this.status!=='playing'||this.elapsed-this.lastShot<WEAPONS[this.equipped].cooldown||settings.menuOpen)return;
  this.lastShot=this.elapsed;const body=this.player.body as Phaser.Physics.Arcade.Body;
  const x=this.player.x,y=body.center.y;
  if(targetX===undefined){const targets=this.enemies.map(e=>({...this.bossDirector.getHitPoint(e),alive:e.hp>0&&e.controlledAt<0&&e.sprite.active}));const i=chooseTarget(x,y,targets,WEAPONS.slingshot.range);targetX=i>=0?targets[i].x:x+(this.player.flipX?-250:250);targetY=i>=0?targets[i].y:y;}
  const angle=Math.atan2((targetY??y)-y,targetX-x);this.aimAngle=angle;this.player.setFlipX(Math.cos(angle)<0);
  if(this.equipped==='sword'){this.swordAngle=angle;this.player.setFlipX(Math.cos(angle)<0);this.swingStarted=this.elapsed;this.meleeHitDone=false;sound('shoot');return;}
  const stats=slingshotStats(this.upgrades.slingshotLevel);
  const pose=weaponPose('slingshot',x,body.top+13,y,this.player.flipX?-1:1,angle,-1,0,Number(this.player.frame.name),this.player.y);
  const muzzleX=pose.handX,muzzleY=pose.handY-15;
  const shotAngle=Math.atan2((targetY??muzzleY)-muzzleY,targetX-muzzleX);
  for(let i=0;i<stats.pellets;i++){
   const a=shotAngle+(stats.pellets===2?(i===0?-.032:.032):0),offset=stats.pellets===2?(i===0?-4:4):0;
   const shot=this.physics.add.image(muzzleX+Math.cos(a)*5-Math.sin(a)*offset,muzzleY+Math.sin(a)*5+Math.cos(a)*offset,stats.fire?'upgrades':'pellet',stats.fire?'fire-pellet':undefined).setDepth(15);this.bullets.add(shot);
   if(stats.fire)shot.setDisplaySize(16,17).setRotation(a+Math.PI/2);
   shot.setVelocity(Math.cos(a)*650,Math.sin(a)*650);shot.setData('expires',this.elapsed+1400);
   shot.setData('originX',shot.x);shot.setData('originY',shot.y);shot.setData('damage',stats.damage);shot.setData('fire',stats.fire);shot.setData('trailAt',0);
  }
  this.burst(muzzleX,muzzleY,stats.fire?0xff8436:0xe6bc7e,4);sound('shoot');
 }
 hurtEnemy(enemy:Enemy,damage:number,projectile=false,point?:{x:number;y:number},source?:'stomp'){
  if(enemy.hp<=0||enemy.controlledAt>=0)return;
  damage=this.bossDirector.hit(enemy,damage,source??(projectile?'slingshot':'sword'),point);
  if(damage<=0)return;
  // Each pellet is consumed on impact; both pellets in a volley may deal damage.
  const next=hitEnemy(projectile?{...enemy,invulnerableUntil:0}:enemy,damage,this.elapsed);if(next===enemy)return;
  enemy.hp=next.hp;enemy.invulnerableUntil=next.invulnerableUntil;
  this.burst(enemy.sprite.x,enemy.sprite.y,0xd9b68b,5);sound('stomp');
  if(enemy.hp<=0)this.killEnemy(enemy);else this.pop('-'+damage,enemy.sprite.x,enemy.sprite.y-30,0xec8a88);
 }
 killEnemy(enemy:Enemy){
  if(!enemy.sprite.active)return;
  this.bossDirector.remove(enemy);
  (this.area==='main'?this.mainKills:this.dungeonKills).add(enemy.index);
  enemy.hp=0;enemy.sprite.disableBody(true,true);enemy.bar.clear();enemy.label.setVisible(false);
  enemy.marker?.destroy();
  const reward=enemyCoinReward(enemy.kind);this.killCoins+=reward;awardCoin(reward);this.state.coins=this.mainCoins.size+this.dungeonCoins.size+this.killCoins;
  this.pop('+'+reward+' COINS',enemy.sprite.x,enemy.sprite.y-62,0xffd475);sound('coin');
  if(this.area==='dungeon'&&this.enemies.every(e=>!e.sprite.active||e.hp<=0))this.bonusCoin?.setVisible(true);
  this.state.score+=200+enemy.maxHp*50;this.pop('+'+(200+enemy.maxHp*50),enemy.sprite.x,enemy.sprite.y-30);this.burst(enemy.sprite.x,enemy.sprite.y,0xe4886b,18);this.emitHud();
 }
 activatePsi(){
  if(!this.state.abilityReady){this.notify('قدرت ذهنی این مرحله مصرف شده');return;}
  const i=chooseTarget(this.player.x,this.player.y,this.enemies.map(e=>({x:e.sprite.x,y:e.sprite.y,alive:e.hp>0&&e.controlledAt<0&&e.sprite.active&&this.bossDirector.canPsi(e)})),480);
  this.state=useAbility(this.state,i>=0);if(i<0){this.notify('دشمنی در برد قدرت نیست');return;}
  this.abilityCharges--;this.state.abilityReady=this.abilityCharges>0;
  const enemy=this.enemies[i];if(this.bossDirector.psi(enemy)){sound('psi');this.emitHud();return;}enemy.controlledAt=this.elapsed;enemy.liftY=enemy.sprite.y;
  enemy.marker?.clear();
  const body=enemy.sprite.body as Phaser.Physics.Arcade.Body;body.setVelocity(0);body.enable=false;
  enemy.sprite.setTint(0xaf9aee);sound('psi');this.notify('کنترل ذهنی — اتصال برقرار شد');this.emitHud();
 }
 enemyBrain(e:Enemy,dt:number){
  if(!e.sprite.active)return;
  if(this.bossDirector.encounters.has(e)){
   this.bossDirector.updateEnemy(e,dt);
  }else if(e.controlledAt>=0){
   const t=(this.elapsed-e.controlledAt)/1100;e.sprite.y=e.liftY-110*Math.min(1,t);e.sprite.rotation=Math.sin(t*20)*.06;
   this.psiBeam.lineStyle(2,0xc3a0ed,.7);this.psiBeam.lineBetween(this.player.x,this.player.y-16,e.sprite.x,e.sprite.y);this.psiBeam.lineStyle(1,0xead9ff,.6);this.psiBeam.strokeCircle(e.sprite.x,e.sprite.y,40+Math.sin(t*14)*8);
   if(t>=1.3){this.burst(e.sprite.x,e.sprite.y,0xb998f1,34);this.killEnemy(e);sound('psi');}
  }else if(e.kind==='vecna'){
   this.vecnaBrain(e);
  }else if(e.kind==='billy'){
   const pb=this.player.body as Phaser.Physics.Arcade.Body,dx=this.player.x-e.sprite.x,near=billyCanAttack(dx,pb.center.y-(e.baseY-40));
   e.sprite.setVelocity(0).setPosition(e.min,e.baseY).setFlipX(dx>0);
   if(near&&!e.aggro){e.lastAttack=this.elapsed;e.alertAt=this.elapsed;}
   e.aggro=near;
   const cycle=this.elapsed-e.lastAttack;
   e.sprite.setFrame(near?(cycle>=BILLY.interval-350?2:cycle<270&&e.lastAttack>e.alertAt?3:0):Math.floor(this.elapsed/240)%2);
   if(near&&cycle>=BILLY.interval){e.lastAttack=this.elapsed;e.sprite.setFrame(3);this.throwMolotov(e);}
   if(!near&&Math.abs(dx)<750&&this.elapsed-(e.sprite.getData('laughedAt')??-3000)>2400){e.sprite.setData('laughedAt',this.elapsed);this.pop('HA HA',e.sprite.x,e.baseY-90,0xe2c99e);sound('laugh');}
  }else if(e.kind==='mindflayer'){
   const cycle=this.elapsed-e.lastAttack,windup=cycle>=MIND_FLAYER.interval-MIND_FLAYER.windup;
   e.sprite.setVelocityX(0).setFlipX(this.player.x>e.sprite.x);e.aggro=Math.abs(this.player.x-e.sprite.x)<720;
   e.sprite.setFrame(cycle<300?3:windup?2:Math.floor(this.elapsed/420)%2);
   if(windup&&e.aggro){e.sprite.setTint(0xffa4a4);this.notify('مایند فلِیر — دست‌ها بالا! برای رد شدن از موج بپر.');}else e.sprite.clearTint();
   if(cycle>=MIND_FLAYER.interval){
    e.lastAttack=this.elapsed;e.sprite.setFrame(3).clearTint();this.slamGround(e);
   }
  }else{
   const eb=e.sprite.body as Phaser.Physics.Arcade.Body,pb=this.player.body as Phaser.Physics.Arcade.Body;
   const dx=this.player.x-e.sprite.x,dy=pb.center.y-eb.center.y,stats=enemyStats(e.kind,this.stageData.id+(this.area==='dungeon'?5:0));
   const line=new Phaser.Geom.Line(e.sprite.x,eb.center.y,this.player.x,pb.center.y);
   const visible=![...this.stageData.platforms,...this.stageData.ceilings].some(p=>Phaser.Geom.Intersects.LineToRectangle(line,new Phaser.Geom.Rectangle(p.x,p.y,p.w,28)));
   const alerted=shouldAggro(dx,dy,stats.aggro,visible);
   if(alerted&&!e.aggro)e.alertAt=this.elapsed;e.aggro=alerted;
   if(e.sprite.x<=e.min)e.speed=Math.abs(e.speed);if(e.sprite.x>=e.max)e.speed=-Math.abs(e.speed);
   let velocity=e.speed;
   if(alerted&&this.elapsed-e.alertAt>380){
    velocity=Math.sign(dx)*stats.speed*(e.kind==='husk'?1.7:1.32);
    if(e.kind!=='bat')velocity=Math.abs(dx)<36?0:clampChaseVelocity(e.sprite.x,e.min,e.max,velocity);
    if((e.kind==='slime'||e.kind==='bloom')&&this.elapsed-e.lastAttack>stats.cooldown){
     e.lastAttack=this.elapsed;const shot=this.physics.add.image(e.sprite.x,eb.center.y,'pellet').setTint(0xec697d).setScale(1.7).setDepth(13);this.hostileShots.add(shot);
     const angle=Math.atan2(dy,dx);shot.setVelocity(Math.cos(angle)*(145+this.stageData.id*9),Math.sin(angle)*(145+this.stageData.id*9));shot.setData('expires',this.elapsed+2300);
     this.burst(e.sprite.x,e.sprite.y,0xca4f65,5);
    }
   }
   if(e.kind!=='bat'&&(e.sprite.x<e.min||e.sprite.x>e.max)){e.sprite.x=Phaser.Math.Clamp(e.sprite.x,e.min,e.max);velocity=e.sprite.x<=e.min?Math.abs(e.speed):-Math.abs(e.speed);}
   if(!e.action){
    e.action=startEnemyAction({kind:e.kind,now:this.elapsed,lastAttack:e.lastAttack,grounded:eb.blocked.down||eb.touching.down,alerted:alerted&&this.elapsed-e.alertAt>380,dx,dy,speed:stats.speed})??undefined;
    if(e.action){e.lastAttack=this.elapsed;e.sprite.anims.stop();}
   }
   if(e.action){
    const move=actionMotion(e.action,this.elapsed,eb.blocked.down||eb.touching.down);
    velocity=move.vx;
    if(move.launch){e.sprite.setVelocityY(move.vy);e.action.launched=true;}
    // Keep a committed attack inside the authored platform patrol bounds.
    if((velocity<0&&e.sprite.x<=e.min+12)||(velocity>0&&e.sprite.x>=e.max-12)||eb.blocked.left||eb.blocked.right)velocity=0;
    e.sprite.setTexture(e.kind==='husk'?'husk-jump':'crawler-rush',move.frame).setFlipX(e.action.direction<0);
    if(move.frame===0)e.sprite.setTint(0xffb4a3);else e.sprite.clearTint();
    if(move.done){delete e.action;e.sprite.clearTint().setTexture(e.kind,0).play(e.kind);}
   }
   e.sprite.setVelocityX(velocity);if(velocity)e.sprite.setFlipX(velocity<0);
   if(e.kind==='bat'){
    const target=alerted?this.player.y+12:e.baseY+Math.sin(this.elapsed*.003+e.phase)*27;
    e.sprite.y+=Phaser.Math.Clamp(target-e.sprite.y,-75*dt,75*dt);
   }
   if(eb.blocked.left||eb.blocked.right)e.speed=-e.speed;
  }
  const barY=e.sprite.y-(e.kind==='vecna'?218:e.kind==='mindflayer'?(Number(e.sprite.frame.name)===2?202:146):e.kind==='billy'?90:45),barWidth=e.kind==='mindflayer'||e.kind==='vecna'?90:48;
  e.bar.clear();e.bar.fillStyle(0x09111d,.95);e.bar.fillRect(e.sprite.x-barWidth/2,barY,barWidth,7);e.bar.fillStyle(e.controlledAt>=0?0xb399ed:e.aggro?0xeb6972:0x8bc9b1);e.bar.fillRect(e.sprite.x-barWidth/2+1,barY+1,(barWidth-2)*e.hp/e.maxHp,5);
  e.label.setPosition(e.sprite.x,barY-8).setText((e.kind==='vecna'?'VECNA ':e.kind==='mindflayer'?'MIND FLAYER ':e.kind==='billy'?'BILLY ':e.aggro?'! ':'')+e.hp+'/'+e.maxHp);
 }
 vecnaBrain(e:Enemy){
  e.sprite.setVelocity(0);e.sprite.scaleY=204/554;e.marker??=this.add.graphics().setDepth(6);e.marker.clear();
  if(e.leap){
   const jump=e.leap,t=Math.min(1,(this.elapsed-jump.at)/VECNA.flight);
   e.sprite.setFrame(2).setOrigin(.5,678/724).setPosition(jump.x+(jump.tx-jump.x)*t,jump.y+(jump.ty-jump.y)*t-Math.sin(Math.PI*t)*VECNA.jumpHeight).clearTint();
   e.marker.lineStyle(2,0xff6c79,.8);e.marker.strokeEllipse(jump.tx,jump.ty-3,VECNA.slamRadius*2,16);
   if(t>=1){
    e.leap=undefined;e.target=undefined;e.landedAt=this.elapsed;e.sprite.setPosition(jump.tx,jump.ty).setFrame(3).setOrigin(.5,696/724);e.marker.clear();
    this.vecnaSlam(e,jump.tx,jump.ty);sound('explosion');if(!settings.reducedMotion)this.cameras.main.shake(180,.004);
    if(vecnaLandingHits(jump.tx,jump.ty,this.player.body as Phaser.Physics.Arcade.Body))this.damage(jump.tx,VECNA.damage);
   }
   return;
  }
  const near=Math.abs(this.player.x-e.sprite.x)<VECNA.aggroRange&&Math.abs((this.player.body as Phaser.Physics.Arcade.Body).bottom-e.sprite.y)<340;
  if(near&&!e.aggro)e.lastAttack=this.elapsed-(VECNA.interval-VECNA.firstLeapDelay);e.aggro=near;
  const cycle=this.elapsed-e.lastAttack,charging=near&&cycle>=VECNA.interval-VECNA.windup;
  const landing=this.elapsed-(e.landedAt??-10000)<300;
  e.sprite.setFlipX(this.player.x>e.sprite.x).setFrame(landing?3:charging?1:0).setOrigin(.5,landing?696/724:678/724);
  if(!landing&&!charging&&!settings.reducedMotion)e.sprite.scaleY=(204/554)*(1+Math.sin(this.elapsed*.004)*.008);
  if(charging){
   if(!e.target){const x=Phaser.Math.Clamp(this.player.x,e.min,e.max);e.target={x,y:this.groundY(x)};sound('psi');this.notify('وکنا — از نشان قرمزِ فرود فاصله بگیر!');}
   e.sprite.setTint(0xffa0a0);e.marker.lineStyle(2,0xff6c79,.85);e.marker.strokeEllipse(e.target.x,e.target.y-3,VECNA.slamRadius*2,16);e.marker.lineBetween(e.target.x-12,e.target.y-8,e.target.x+12,e.target.y-8);
   if(cycle>=VECNA.interval){e.lastAttack=this.elapsed;e.leap={at:this.elapsed,x:e.sprite.x,y:e.sprite.y,tx:e.target.x,ty:e.target.y};e.sprite.setFrame(2);sound('jump');}
  }else{e.sprite.clearTint();e.target=undefined;}
 }
 throwMolotov(enemy:Enemy){
  const target=this.player.body as Phaser.Physics.Arcade.Body,direction=this.player.x<enemy.sprite.x?-1:1;
  const x=enemy.sprite.x+direction*20,y=enemy.baseY-68,velocity=molotovVelocity(x,y,target.center.x,target.center.y);
  const shot=this.physics.add.image(x,y,'molotov').setDepth(13);this.hostileShots.add(shot);
  (shot.body as Phaser.Physics.Arcade.Body).setAllowGravity(true).setGravityY(BILLY.gravity-PHYSICS.gravity);
  shot.setVelocity(velocity.x,velocity.y).setAngularVelocity(direction*240).setData('molotov',true).setData('expires',this.elapsed+2500);sound('shoot');
 }
 explodeMolotov(shot:Phaser.Physics.Arcade.Image){
  if(!shot.active)return;const x=shot.x,y=shot.y;shot.destroy();this.burst(x,y,0xff8a3d,12);sound('hit');
  const surfaces=[...this.stageData.platforms,...this.stageData.ceilings].filter(p=>x>=p.x&&x<=p.x+p.w&&p.y>=y-30).sort((a,b)=>a.y-b.y);
  const surface=surfaces[0];if(surface)this.firePatches.push({x,y:surface.y,expires:this.elapsed+BILLY.fireDuration,art:this.add.graphics().setDepth(9)});
 }
 updateFire(){
  const body=this.player.body as Phaser.Physics.Arcade.Body;
  this.firePatches=this.firePatches.filter(f=>{
   if(this.elapsed>=f.expires){f.art.destroy();return false;}
   f.art.clear();for(let i=0;i<6;i++){const x=f.x-25+i*10,h=10+Math.sin(this.elapsed*.025+i)*4;f.art.fillStyle(i%2?0xffad42:0xf35b35,.85);f.art.fillTriangle(x-5,f.y,x,f.y-h,x+5,f.y);}
   if(body.right>f.x-28&&body.left<f.x+28&&body.bottom>=f.y-12&&body.top<f.y+6)this.damage(f.x);
   return true;
  });
 }
 vecnaSlam(enemy:Enemy,x:number,y:number){
  const blast=this.add.image(x,y,'vecna-impact','blast-0').setDisplaySize(220,195).setOrigin(.5,440/475).setDepth(14);
  this.impacts.push({art:blast,bornAt:this.elapsed});this.burst(x,y-8,0xff6d89,26);
  this.spawnGroundWaves(enemy,y,true);
 }
 spawnGroundWaves(enemy:Enemy,y:number,vecna=false){
  for(const direction of [-1,1]){
   const art=this.add.image(enemy.sprite.x,y,vecna?'vecna-impact':'shockwave',vecna?'wave-0':0).setDisplaySize(vecna?130:100,vecna?64:58).setOrigin(direction>0?.9:.1,vecna?240/265:350/360).setFlipX(direction<0).setDepth(9);
   this.shockwaves.push({x:enemy.sprite.x,y,origin:enemy.sprite.x,direction,hit:false,bornAt:this.elapsed,source:enemy,art,trail:this.add.graphics().setDepth(7),vecna});
  }
 }
 slamGround(enemy:Enemy){
  const y=this.groundY(enemy.sprite.x);this.burst(enemy.sprite.x,y,0xff5d59,22);
  if(Math.abs(this.player.x-enemy.sprite.x)<720){sound('explosion');if(!settings.reducedMotion)this.cameras.main.shake(160,.003);}
  this.spawnGroundWaves(enemy,y);
 }
 updateShockwaves(dt:number,grounded:boolean){
  const body=this.player.body as Phaser.Physics.Arcade.Body;
  this.shockwaves=this.shockwaves.filter(w=>{
   const stats=w.vecna?VECNA:MIND_FLAYER;w.x+=w.direction*stats.waveSpeed*dt;
   const platform=this.stageData.platforms.find(p=>!p.kind&&w.x>=p.x&&w.x<=p.x+p.w);
   if(!w.source.sprite.active||w.source.controlledAt>=0||Math.abs(w.x-w.origin)>stats.waveRange||!platform||Math.abs(platform.y-w.y)>12){w.art.destroy();w.trail.destroy();return false;}
   const phase=settings.reducedMotion?0:Math.floor((this.elapsed-w.bornAt)/80)%4;
   w.art.setPosition(w.x,w.y).setFrame(w.vecna?'wave-'+phase:phase).setAlpha(w.hit?.48:.95);
   w.trail.clear();
   for(let i=0;i<5;i++){
    const length=12+i*13,x=w.x-w.direction*length,alpha=(1-i/5)*(w.hit?.2:.55);
    if(x<platform.x||x>platform.x+platform.w)continue;
    w.trail.fillStyle(i%2?0xff578c:0xa761ff,alpha);w.trail.fillRect(x-5,w.y-3-i%2,10,2);
    if(!settings.reducedMotion){w.trail.fillStyle(0xffbfdb,alpha*.8);w.trail.fillRect(x,w.y-7-(phase+i)%3*3,2,2);}
   }
   if(!w.hit&&waveHitsPlayer(w,body,grounded)){w.hit=true;this.damage(w.origin,stats.damage);this.burst(body.center.x,w.y-8,0xe984ff,12);}
   return true;
  });
 }
 encounter(enemy:Phaser.Physics.Arcade.Sprite){
  if(this.status!=='playing'||!enemy.active)return;
  const info=this.enemies.find(e=>e.sprite===enemy);if(!info||info.controlledAt>=0)return;
  if(info.kind==='vecna'&&info.leap)return;
  const body=this.player.body as Phaser.Physics.Arcade.Body;const eb=enemy.body as Phaser.Physics.Arcade.Body;
  if(isStomp(this.previousBottom,eb.top,body.velocity.y)){
   this.player.setVelocityY(-360);this.jumpsUsed=1;this.hurtEnemy(info,2,false,undefined,'stomp');this.emitHud();
  }else this.damage(enemy.x);
 }
 damage(fromX:number,hearts=1,forceHeartLoss=false){
  if(this.status!=='playing'||this.elapsed<this.state.invincibleUntil)return;
  this.state=hearts>=2||forceHeartLoss?{...this.state,big:false,hearts:Math.max(0,this.state.hearts-hearts),invincibleUntil:this.elapsed+1800}:takeHit(this.state,this.elapsed);sound('hit');this.burst(this.player.x,this.player.y,0xdc5863,12);
  if(!settings.reducedMotion)this.cameras.main.shake(130,.003);
  this.knockUntil=this.elapsed+220;this.player.setVelocity(this.player.x<fromX?-180:180,-230);
  if(this.state.hearts<=0)this.die();this.emitHud();
 }
 die(){
  if(this.status!=='playing')return;
  this.state=checkpointRespawn(this.state).state;this.status=this.state.lives<=0?'gameover':'dead';this.physics.pause();this.player.setAlpha(.5);sound('hit');this.emitHud();
 }
 respawn(){
  if(this.status!=='dead')return;this.player.setPosition(this.state.checkpoint,this.groundY(this.state.checkpoint)-58);this.player.setVelocity(0);this.player.setAlpha(1);this.state.invincibleUntil=this.elapsed+1800;this.jumpsUsed=0;
  this.groundedAt=-10000;this.pressedAt=-10000;this.knockUntil=0;this.status='playing';this.physics.resume();this.game.canvas.focus({preventScroll:true});this.emitHud();
 }
 update(_time:number,delta:number){
  const dt=Math.min(delta,34)/1000;this.sceneTime+=Math.min(delta,34);
  if(!this.player)return;
  // Menus keep the world alive, while gameplay physics stays paused.
  if(!settings.reducedMotion){
   this.sky.tilePositionX+=dt*2.8;this.fog.tilePositionX+=dt*7;
   this.fog.alpha=.7+Math.sin(this.sceneTime*.0007)*.2;
   for(const m of this.motes){m.obj.x-=dt*m.speed;m.obj.y+=Math.sin(this.sceneTime*.001+m.phase)*dt*4;if(m.obj.x<this.screenOffsetX)m.obj.x=960+this.screenOffsetX;}
  }
  let pad:Gamepad|null=null;try{pad=Array.from(navigator.getGamepads?.()??[]).find(p=>p?.connected)??null;}catch{/* Browsers may restrict gamepad access. */}
  const controls=readPad(pad?.axes??[],pad?.buttons.map(b=>b.pressed)??[]);
  if(!!pad!==this.padConnected){this.padConnected=!!pad;this.emitHud();}
  const padMenu=controls.pause&&!this.padPauseHeld;this.padPauseHeld=controls.pause;
  if(settings.menuOpen||this.status==='gameover')return;
  const just=(k:string)=>Phaser.Input.Keyboard.JustDown(this.keys[k]);
  if(just('P')||just('ESC')||padMenu){if(this.status==='playing')this.pause();else if(this.status==='paused')this.resume();}
  if(just('R')){this.loadStage(this.stageData.id-1);this.startPlay();return;}
  if(controls.jump&&!this.jumpHeld&&this.status!=='playing'){
   this.jumpHeld=true;if(this.status==='ready')this.startPlay();else if(this.status==='paused')this.resume();else if(this.status==='dead')this.respawn();
   return;
  }
  if(this.status!=='playing'&&!controls.jump)this.jumpHeld=false;
  if(this.status!=='playing')return;
  this.elapsed+=dt*1000;
  if(this.notice&&this.sceneTime>this.noticeUntil)this.notice='';
  const body=this.player.body as Phaser.Physics.Arcade.Body;
  // Capture grounded contact before crouch/stand resizes the current-frame body.
  const groundedFeet=body.bottom;
  const supported=body.blocked.down&&hasGroundSupport(body,[...this.stageData.platforms,...this.stageData.ceilings]);
  if(body.blocked.down){this.groundedAt=this.elapsed;this.jumpsUsed=0;}
  const big=this.state.big;
  const wantsCrouch=this.keys.DOWN.isDown||this.keys.S.isDown||touch.crouch||controls.crouch;
  const standBlocked=!canStand({x:this.player.x,feet:body.bottom,width:big?36:27,height:big?76:60},[...this.stageData.platforms,...this.stageData.ceilings].map(p=>({x:p.x,y:p.y,w:p.w,h:28})));
  this.crouching=(wantsCrouch&&body.blocked.down)||(this.crouching&&standBlocked);
  const box=this.crouching?crouchBox(big):{height:big?76:60,width:big?36:27,offsetY:big?28:44,offsetX:big?30:35};
  this.player.setSize(box.width,box.height).setOffset(box.offsetX,box.offsetY);
  const held=this.keys.SPACE.isDown||this.keys.UP.isDown||this.keys.W.isDown||touch.jump||controls.jump;
  const jumpPressed=held&&!this.jumpHeld;
  if(jumpPressed)this.pressedAt=this.elapsed;
  if(!held&&this.jumpHeld)this.player.setVelocityY(cutJump(body.velocity.y));
  this.jumpHeld=held;
  const axis=Number(this.keys.RIGHT.isDown||this.keys.D.isDown||touch.right)-Number(this.keys.LEFT.isDown||this.keys.A.isDown||touch.left)||controls.axis;
  const running=this.keys.SHIFT.isDown||this.keys.X.isDown||touch.run||controls.run;
  if(this.elapsed>=this.knockUntil)this.player.setVelocityX(advanceVelocity(body.velocity.x,this.crouching?axis*.3:axis,running&&!this.crouching,dt));
  const groundJump=jumpPressed&&supported;
  if(!this.crouching&&jumpPressed&&(groundJump||canDoubleJump(this.upgrades.doubleJump,this.jumpsUsed,this.elapsed,this.nextDoubleJumpAt))){
   const jump=tryJump(this.jumpsUsed,groundJump);
   if(jump){this.player.setVelocityY(jump.velocity);this.jumpsUsed=jump.used;if(jump.used===2)this.nextDoubleJumpAt=this.elapsed+DOUBLE_JUMP_COOLDOWN;this.groundedAt=-10000;this.pressedAt=-10000;sound('jump');this.burst(this.player.x,body.bottom,this.jumpsUsed===2?0xb59bf1:0x6a9a9d,8);}
  }
  if(axis)this.player.setFlipX(axis<0);
  let anim=body.blocked.down?(Math.abs(body.velocity.x)>15?(running?'run':'walk'):'idle'):(body.velocity.y<0?'jump':'fall');
  if(big)anim='big'+anim;
  if(this.crouching){this.player.anims.stop();this.player.setFrame(11);}else this.player.play(anim,true);
  this.player.setScale(1);this.player.setAlpha(this.elapsed<this.state.invincibleUntil?.5+Math.sin(this.sceneTime*.014)*.2:1);
  this.psiBeam.clear();for(const enemy of this.enemies)this.enemyBrain(enemy,dt);this.updateShockwaves(dt,supported);if(this.status==='playing')this.updateFire();
  this.bossDirector.updateEffects(dt,supported);
  this.impacts=this.impacts.filter(impact=>{const age=this.elapsed-impact.bornAt;if(age>=600){impact.art.destroy();return false;}impact.art.setFrame('blast-'+Math.min(3,Math.floor(age/140))).setAlpha(Math.min(1,(600-age)/150));return true;});
  if(this.status!=='playing')return;
  for(const group of [this.bullets,this.hostileShots])for(const obj of [...group.getChildren()]){
   const bullet=obj as Phaser.Physics.Arcade.Image;
   if(this.elapsed>bullet.getData('expires')||(group===this.bullets&&!projectileInRange(bullet.getData('originX'),bullet.getData('originY'),bullet.x,bullet.y))){bullet.destroy();continue;}
   if(bullet.getData('fire')&&this.elapsed-bullet.getData('trailAt')>45){
    bullet.setData('trailAt',this.elapsed);const ember=this.add.rectangle(bullet.x,bullet.y,7,4,0xff762d,.85).setDepth(14);
    this.tweens.add({targets:ember,scale:0,alpha:0,duration:180,onComplete:()=>ember.destroy()});
   }
  }
  const pointer=this.input.activePointer;
  const recentShot=this.elapsed-this.lastShot<260;
  const aim=recentShot||this.padConnected?this.aimAngle:pointer.x||pointer.y?Math.atan2(pointer.worldY-body.center.y,pointer.worldX-this.player.x):this.player.flipX?Math.PI:0;
  const facing=this.player.flipX?-1:1,swing=(this.elapsed-this.swingStarted)/260;
  const swinging=this.equipped==='sword'&&swing>=0&&swing<1;
  const direction=swinging?this.swordAngle:aim;
  const recoil=Math.max(0,1-(this.elapsed-this.lastShot)/170);
  const pose=weaponPose(this.equipped,this.player.x,body.top+13,body.center.y,facing,direction,swing,recoil,Number(this.player.frame.name),this.player.y);
  this.weapon.setPosition(pose.handX,pose.handY).setRotation(pose.rotation).setFlipX(facing<0).setAlpha(this.player.alpha);
  if(swinging){
   if(!this.meleeHitDone&&swing>.26){this.meleeHitDone=true;for(const enemy of this.enemies){if(!enemy.sprite.active||enemy.controlledAt>=0)continue;const target=this.bossDirector.encounters.has(enemy)?this.bossDirector.getHitPoint(enemy):(enemy.sprite.body as Phaser.Physics.Arcade.Body).center;if(swordAimInRange(this.player.x,body.center.y,target.x,target.y,this.swordAngle))this.hurtEnemy(enemy,swordDamage(this.upgrades.swordLevel),false,{x:target.x,y:target.y});}}
  }
  const switchKey=!!pad?.buttons[4]?.pressed||touch.weapon;if(just('ONE'))this.equip('slingshot');if(just('TWO'))this.equip('sword');if(just('E')||(switchKey&&!this.switchHeld))this.equip(this.equipped==='sword'?'slingshot':'sword');this.switchHeld=switchKey;
  if(this.keys.F.isDown||touch.shoot||controls.shoot)this.fire();
  const psi=this.keys.Q.isDown||touch.ability||controls.ability;if((psi&&!this.abilityHeld)||just('Q'))this.activatePsi();this.abilityHeld=psi;
  this.previousBottom=body.bottom;
  if(body.top>600){this.die();return;}
  const interact=this.keys.DOWN.isDown||this.keys.S.isDown||this.keys.UP.isDown||touch.crouch||controls.crouch;
  const doorPressed=interact&&!this.doorHeld;this.doorHeld=interact;
  const doorX=this.area==='dungeon'?80:this.stageData.dungeonX;
  if(canUseDungeonDoor(this.player.x,groundedFeet,doorX,this.groundY(doorX),supported,doorPressed)){
   if(this.area==='dungeon')this.leaveDungeon();else if(!this.dungeonCleared)this.enterDungeon();return;
  }
  // Gate requires walking into it on its platform, not passing beneath it.
  if(Math.abs(this.player.x-this.stageData.exit)<44&&Math.abs(body.bottom-this.groundY(this.stageData.exit))<70){
   if(this.area==='dungeon'){
    if(this.enemies.some(e=>e.sprite.active&&e.hp>0)){this.notify('دروازه قفل است؛ همهٔ دشمن‌های دانجن را شکست بده.');return;}
    this.leaveDungeon(true);return;
   }
   if(this.stageData.id===10&&this.enemies.some(e=>(e.kind==='mindflayer'||e.kind==='vecna')&&e.sprite.active&&e.hp>0)){this.notify('دروازهٔ نهایی قفل است؛ دو مینی‌باس و دو باس را شکست بده.');return;}
   if(!this.bonusAwarded){const bonus=stageCoinBonus(this.mainCoins.size+this.killCoins,this.dungeonCoins.size,this.multiplierCollected);if(bonus){awardCoin(bonus);this.pop('2x / +'+bonus,this.player.x,this.player.y-65,0x72d6ff);}this.bonusAwarded=true;}
   recordStageResult(this.stageData.id,{allCollectibles:this.mainCoins.size===this.stageData.coins.length&&this.mainRadios.size===this.stageData.tapes.length,dungeonCleared:this.dungeonCleared});
   this.status='complete';this.physics.pause();this.player.setFrame(14);sound('win');this.burst(this.portal.x,this.portal.y-80,0xec8a88,32);this.emitHud();return;
  }
  if(this.sceneTime-this.lastEmit>100){this.lastEmit=this.sceneTime;this.emitHud();}
 }
}
