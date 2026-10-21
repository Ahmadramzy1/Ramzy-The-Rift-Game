import Phaser from 'phaser';
import { STAGES, DUNGEONS, type Stage, type EnemyKind } from './levels';
import { PHYSICS, advanceVelocity, cutJump, isStomp, takeHit, checkpointRespawn, initialState, type PlayerState } from './mechanics';
import { commands, updates, touch, settings, sound, type Status } from './bridge';
import {enemyStats,hitEnemy,shouldAggro,tryJump,crouchBox,canStand,useAbility,chooseTarget,readPad,clampChaseVelocity,blocksPageScroll} from './combat';
import {canUseDungeonDoor,hasGroundSupport} from './dungeons';
import {awardCoin,takeStageBoosts,recordStageResult,type StageBoosts} from './campaign';
import {WEAPONS,meleeInRange,projectileInRange,type WeaponKind} from './weapons';

type Enemy = {index:number;sprite:Phaser.Physics.Arcade.Sprite;min:number;max:number;speed:number;kind:EnemyKind;baseY:number;phase:number;hp:number;maxHp:number;invulnerableUntil:number;aggro:boolean;alertAt:number;lastAttack:number;bar:Phaser.GameObjects.Graphics;label:Phaser.GameObjects.Text;controlledAt:number;liftY:number};
const propKeys=['grass','stone','forest','metal','rift','floating','metal-platform','rift-platform','bush','rock','barrel','barricade','cone','log','fence','lamp','streetlamp','pole','wood-fence','tree','tower','drain','waterpipe','portal','sign','radio','tape','battery','keycard','heart','coin','mushroom','energy','medkit','key','vial'];

export class GameScene extends Phaser.Scene {
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
 activeBoosts:StageBoosts={energy:false,power:false};
 equipped:WeaponKind='slingshot';swingStarted=-1000;meleeHitDone=true;switchHeld=false;arm!:Phaser.GameObjects.Graphics;

 constructor(){super('world');}
 preload(){
  const base=import.meta.env.BASE_URL+'assets/';
  this.load.spritesheet('hero',base+'hero.png',{frameWidth:96,frameHeight:112});
  for(const key of ['crawler','bloom','bat','slime','husk'])this.load.spritesheet(key,base+key+'.png',{frameWidth:128,frameHeight:112});
  propKeys.forEach(key=>this.load.image(key,base+key+'.png'));
  for(const tile of ['grass','stone','forest','metal','rift']){this.load.image(tile+'-fill',base+tile+'-fill.png');this.load.image(tile+'-tile',base+tile+'-tile.png');}
  this.load.json('terrain',base+'terrain.json');
  this.load.image('sky',base+'sky.png');
 }
 create(){
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
  this.bind('stage',(e)=>{const index=Number((e as CustomEvent).detail);this.activeBoosts=takeStageBoosts(index+1);this.loadStage(index);this.startPlay();});
  this.bind('menu',()=>{this.activeBoosts={energy:false,power:false};this.loadStage(this.stageData.id-1);});
  this.game.events.on(Phaser.Core.Events.BLUR,this.onBlur,this);
  this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{if(p.leftButtonDown()&&this.status==='playing'&&!settings.menuOpen){this.game.canvas.focus({preventScroll:true});this.fire(p.worldX,p.worldY);}});
  this.events.once('shutdown',()=>{this.listeners.forEach(l=>commands.removeEventListener(l.name,l.fn));this.game.events.off(Phaser.Core.Events.BLUR,this.onBlur,this);});
  this.loadStage(0);
 }
 bind(name:string,fn:EventListener){commands.addEventListener(name,fn);this.listeners.push({name,fn});}
 onBlur(){if(this.status==='playing')this.pause();}
 emitHud(){updates.dispatchEvent(new CustomEvent('hud',{detail:{...this.state,stage:this.stageData.id,progress:Math.max(0,Math.min(100,Math.round((this.player.x/this.stageData.exit)*100))),status:this.status,time:Math.floor(this.elapsed/1000),notice:this.notice,gamepad:this.padConnected,weapon:this.equipped,area:this.area,dungeonCleared:this.dungeonCleared,dungeonRemaining:this.enemies.filter(e=>e.sprite.active&&e.hp>0).length,totalCoins:STAGES[this.stageData.id-1].coins.length,totalRadios:STAGES[this.stageData.id-1].tapes.length}}));}

 loadStage(index:number,area:'main'|'dungeon'='main',preserveRun=false){
  const previous={...this.state},previousElapsed=this.elapsed;
  if(!preserveRun){this.mainCoins.clear();this.mainRadios.clear();this.dungeonCoins.clear();this.mainKills.clear();this.dungeonKills.clear();this.consumedPickups.clear();this.dungeonCleared=false;this.mainCheckpoint=110;}
  this.area=area;
  this.physics.world.colliders.destroy();
  this.solids?.destroy(true,true);this.bullets?.destroy(true,true);this.hostileShots?.destroy(true,true);this.enemyGroup?.destroy(true,true);
  this.tweens.killAll();this.time.removeAllEvents();this.children.removeAll(true);
  this.enemies=[];this.motes=[];this.stageData=(area==='dungeon'?DUNGEONS:STAGES)[Math.max(0,Math.min(9,index))];this.state=preserveRun?previous:{...initialState(),big:this.activeBoosts.energy};
  if(preserveRun)this.state.checkpoint=area==='dungeon'?80:this.mainCheckpoint;
  this.status='ready';this.elapsed=preserveRun?previousElapsed:0;this.groundedAt=-10000;this.pressedAt=-10000;this.jumpHeld=false;this.checkpointActive=false;this.resizeBig=false;this.notice='';this.jumpsUsed=0;this.crouching=false;this.lastShot=-1000;this.abilityHeld=false;this.padPauseHeld=false;this.equipped='slingshot';this.swingStarted=-1000;this.meleeHitDone=true;
  this.knockUntil=0;this.previousBottom=0;this.switchHeld=false;
  const stage=this.stageData;const cam=this.cameras.main;
  const renderScale=this.scale.width/960;this.screenOffsetX=(this.scale.width-960)/2;this.screenOffsetY=(this.scale.height-540)/2;
  cam.resetFX();cam.setZoom(renderScale);cam.setBounds(0,0,stage.width,540);cam.setScroll(-this.screenOffsetX,-this.screenOffsetY);cam.setBackgroundColor('#0d1528');
  this.sky=this.add.tileSprite(0,0,960,395,'sky').setOrigin(0).setScrollFactor(0).setDepth(-30).setAlpha(.82).setTileScale(1.65);
  this.add.rectangle(480,285,960,510,0x101d2d,.3).setScrollFactor(0).setDepth(-29);
  this.halo=this.add.circle(760,110,65,stage.color,.09).setScrollFactor(.04).setDepth(-28);
  this.tweens.add({targets:this.halo,scale:1.45,alpha:.19,duration:3300,yoyo:true,repeat:-1});
  // Three independent scenery planes behind real collidable terrain.
  const forest=this.add.graphics().setDepth(-20).setScrollFactor(.35);
  for(let x=-100;x<stage.width+100;x+=59){
   const h=85+(Math.sin(x*2.31)+1)*62;
   forest.fillStyle(0x102333,.95);forest.fillTriangle(x,420-h,x-35,430,x+35,430);forest.fillRect(x-4,410,8,70);
  }
  const back=this.add.graphics().setDepth(-21).setScrollFactor(.18);
  for(let x=-150;x<4000;x+=110){back.fillStyle(0x1b2b43,.7);back.fillTriangle(x,230+(Math.cos(x)*38),x-100,420,x+120,420);}
  this.drawLandmarks();
  for(let x=110;x<stage.width;x+=390)this.add.image(x,465,'tree').setOrigin(.5,1).setDisplaySize(130,225).setAlpha(.4).setScrollFactor(.65).setDepth(-15).setTint(0x2b5368);
  this.makeFog();
  this.solids=this.physics.add.staticGroup();
  for(const p of [...stage.platforms,...stage.ceilings]){
   const collider=this.add.rectangle(p.x+p.w/2,p.y+14,p.w,28,0x000000,0);
   this.physics.add.existing(collider,true);this.solids.add(collider);
   const ceiling=stage.ceilings.includes(p);const kind=('kind' in p)?p.kind:undefined;
   const tile=ceiling?'metal-platform':kind?(stage.tile==='metal'?'metal-platform':stage.tile==='rift'?'rift-platform':'floating'):stage.tile;
   for(let x=p.x;x<p.x+p.w;x+=64){
    const width=Math.min(64,p.x+p.w-x);
    const meta=this.cache.json.get('terrain')[stage.tile] as {surfaceOffset:number;height:number};
    this.add.image(x,ceiling||kind?p.y-3:p.y-meta.surfaceOffset,ceiling||kind?tile:stage.tile+'-tile').setOrigin(0).setDisplaySize(width,ceiling?28:kind?42:meta.height).setDepth(1);
    if(!kind&&!ceiling){
     this.add.rectangle(x+width/2,p.y+108,width,90,0x111a20).setDepth(0);
     this.add.image(x,p.y+meta.height-meta.surfaceOffset-2,stage.tile+'-fill').setOrigin(0).setDisplaySize(width,90).setTint(0x455066).setDepth(1);
    }
   }
  }
  stage.decor.forEach(d=>this.prop(d.key,d.x,d.y,d.size,-2));
  this.prop('bush',230,458,84,3);this.prop('sign',55,458,116,-1);
  if(stage.id===1&&area==='main'){this.prop('streetlamp',285,458,212,-2);this.prop('barricade',2800,458,80,-1);}
  const doorX=area==='main'?stage.dungeonX:80;this.prop('drain',doorX,this.groundY(doorX),125,2).setTint(area==='dungeon'?0x9e84b8:0xffffff);
  this.add.text(doorX,this.groundY(doorX)-143,area==='main'?(this.dungeonCleared?'DUNGEON CLEAR':'DUNGEON / ↓'):'RETURN / ↑ ↓',{fontFamily:'monospace',fontSize:'12px',color:'#d4b2ee',stroke:'#101020',strokeThickness:3}).setOrigin(.5).setDepth(5);
  if(area==='dungeon'){this.sky.setTint(0x48315e).setAlpha(.45);this.fog.setTint(0x8b4da1);}
  if(stage.id>=5){this.prop('tower',200,458,210,-2);this.prop('barrel',1030,458,58,2);}
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
  for(const [i,c] of stage.coins.entries())if(!(area==='main'?this.mainCoins:this.dungeonCoins).has(i))this.pickup('coin',c.x,c.y,26,()=>{(this.area==='main'?this.mainCoins:this.dungeonCoins).add(i);if(this.area==='main')this.state.coins=this.mainCoins.size;awardCoin();this.state.score+=100;sound('coin');});
  for(const [i,c] of stage.tapes.entries())if(!this.mainRadios.has(i))this.pickup('radio',c.x,c.y,39,()=>{this.mainRadios.add(i);this.state.tapes=this.mainRadios.size;this.state.score+=500;this.notify('رادیوی گمشده پیدا شد');sound('power');});
  if(!this.consumedPickups.has(area+'energy'))this.pickup('energy',stage.power.x,stage.power.y,35,()=>{this.consumedPickups.add(area+'energy');this.state.big=true;this.state.score+=300;this.notify('انرژی فعال شد — قهرمان بزرگ شد');sound('power');this.burst(this.player.x,this.player.y,0x7ce4cb,22);});
  // A second power-up after the checkpoint makes later mistakes recoverable.
  if(!this.consumedPickups.has(area+'medkit'))this.pickup('medkit',stage.checkpoint+180,this.groundY(stage.checkpoint+180)-58,30,()=>{this.consumedPickups.add(area+'medkit');this.state.hearts=Math.min(3,this.state.hearts+1);sound('power');this.notify('سلامتی بازیابی شد');});
  this.bullets=this.physics.add.group({allowGravity:false});this.hostileShots=this.physics.add.group({allowGravity:false});this.enemyGroup=this.physics.add.group({allowGravity:true});
  this.makeCombatTextures();
  this.weapon=this.add.image(110,370,'slingshot').setOrigin(.5,.7).setDepth(12);
  this.arm=this.add.graphics().setDepth(11);
  this.psiBeam=this.add.graphics().setDepth(14);
  for(const [enemyIndex,e] of stage.enemies.entries()){
   if((this.area==='main'?this.mainKills:this.dungeonKills).has(enemyIndex))continue;
   const flying=e.kind==='bat';
   const enemy=this.physics.add.sprite(e.x,e.y-(flying?160:48),e.kind).setDepth(8);
   this.enemyGroup.add(enemy);enemy.setScale(flying?.69:.72).setSize(68,48).setOffset(29,56);
   const body=enemy.body as Phaser.Physics.Arcade.Body;body.setAllowGravity(!flying);
   enemy.play(e.kind);if(!flying)this.physics.add.collider(enemy,this.solids);
   const stats=enemyStats(e.kind,stage.id+(this.area==='dungeon'?5:0));
   const bar=this.add.graphics().setDepth(12);const label=this.add.text(enemy.x,enemy.y-56,stats.hp+'/'+stats.hp,{fontFamily:'monospace',fontSize:'9px',color:'#d7dfd9',stroke:'#0c1018',strokeThickness:3}).setOrigin(.5).setDepth(12);
   this.enemies.push({index:enemyIndex,sprite:enemy,min:e.min,max:e.max,speed:stats.speed,kind:e.kind,baseY:enemy.y,phase:e.x*.02,hp:stats.hp,maxHp:stats.hp,invulnerableUntil:0,aggro:false,alertAt:-10000,lastAttack:-1000,bar,label,controlledAt:-1,liftY:enemy.y});
   this.physics.add.overlap(this.player,enemy,()=>this.encounter(enemy));
  }
  this.physics.add.collider(this.bullets,this.solids,b=>b.destroy());
  this.physics.add.collider(this.hostileShots,this.solids,b=>b.destroy());
  this.physics.add.overlap(this.bullets,this.enemyGroup,(bullet,enemy)=>{
   const e=this.enemies.find(e=>e.sprite===enemy);if(!e||e.controlledAt>=0||e.hp<=0)return;
   bullet.destroy();this.hurtEnemy(e,WEAPONS.slingshot.damage*(this.activeBoosts.power?2:1));
  });
  this.physics.add.overlap(this.player,this.hostileShots,(_player,shot)=>{if(this.status!=='playing')return;const x=(shot as Phaser.Physics.Arcade.Image).x;shot.destroy();this.damage(x);});
  this.portal=this.prop('portal',stage.exit,this.groundY(stage.exit),156,6);
  const portalAura=this.add.circle(stage.exit,this.portal.y-76,48,stage.color,.12).setDepth(5);
  this.tweens.add({targets:portalAura,scale:1.35,alpha:.3,duration:1900,yoyo:true,repeat:-1});
  this.tweens.add({targets:this.portal,alpha:.78,duration:1500,yoyo:true,repeat:-1});
  this.add.text(stage.exit-3,this.portal.y-180,area==='dungeon'?'CLEAR ALL / EXIT':'EXIT',{fontFamily:'monospace',fontSize:'13px',color:'#efbdad',letterSpacing:4}).setOrigin(.5).setDepth(6);
  for(let i=0;i<38;i++){
   const obj=this.add.rectangle((i*137)%960,(i*73)%540,i%3===0?3:2,2,i%2?0xdb6a67:0x87a1b2,.4).setScrollFactor(0).setDepth(15);
   this.motes.push({obj,speed:8+i%9,phase:i});
  }
  // Soft lightning with no full-screen flashes. Disabled by reduced motion.
  if(!settings.reducedMotion)this.time.addEvent({delay:8200,loop:true,callback:()=>{
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
 drawLandmarks(){
  const id=this.stageData.id,g=this.add.graphics().setDepth(-16).setScrollFactor(.8);
  if(id===1){
   for(const x of [460,1280,2400]){g.fillStyle(0x253647);g.fillRect(x,330,140,120);g.fillStyle(0x162534);g.fillTriangle(x-15,332,x+70,273,x+155,332);g.fillStyle(0xb78954,.5);for(const dx of [20,88])g.fillRect(x+dx,355,25,31);g.fillStyle(0x162534);g.fillRect(x+58,393,26,57);}
  }else if(id===3||id===4){
   const x=590;g.fillStyle(id===3?0x312943:0x3b3540);g.fillRect(x,238,285,211);g.fillStyle(0x151e2b);g.fillRect(x-12,226,309,16);
   for(let row=0;row<2;row++)for(let col=0;col<5;col++){g.fillStyle((row+col)%3===0?0x97675f:0x3f5266,.75);g.fillRect(x+21+col*53,271+row*65,26,35);}
   g.fillStyle(0x111d2b);g.fillRect(x+122,377,42,72);
   if(id===4){g.fillStyle(0x3b3540);g.fillRect(x+110,169,67,69);g.fillStyle(0xceb88a,.6);g.fillCircle(x+143,199,19);g.lineStyle(2,0x2b2430);g.lineBetween(x+143,199,x+143,184);g.lineBetween(x+143,199,x+154,204);}
   this.add.text(x+142,249,id===3?'ARCADE':'PINECREST HIGH',{fontFamily:'monospace',fontSize:id===3?'22px':'12px',fontStyle:'bold',color:id===3?'#bf75aa':'#a59994',stroke:'#152030',strokeThickness:4}).setOrigin(.5).setScrollFactor(.8).setDepth(-15);
  }else if(id===5||id===7){
   for(let x=0;x<3500;x+=180){this.add.image(x,450,'rock').setDisplaySize(200,140+(x%100)).setOrigin(.5,1).setTint(0x426077).setDepth(-17).setScrollFactor(.8);}
   if(id===7){g.fillStyle(0x0a101a,.85);g.fillRect(0,0,3500,90);for(let x=0;x<3500;x+=95)g.fillTriangle(x,85,x+60,85,x+35,160);}
  }else if(id>=6){
   for(const x of [500,1460,2420]){g.fillStyle(id>=8?0x302340:0x253543);g.fillRect(x,285,250,165);g.fillStyle(0x15212d);g.fillRect(x-10,274,270,14);g.fillStyle(this.stageData.color,.55);for(let j=0;j<4;j++)g.fillRect(x+24+j*58,311,28,14);this.prop('tower',x+180,450,210,-16).setScrollFactor(.8).setTint(id>=8?0x9a5d9d:0x8aa9b9);}
  }
 }
 prop(key:string,x:number,y:number,height:number,depth=1){const img=this.add.image(x,y,key).setOrigin(.5,1).setDepth(depth);img.setScale(height/img.height);return img;}
 makeFog(){
  if(!this.textures.exists('fog')){const canvas=this.textures.createCanvas('fog',512,128)!;const ctx=canvas.context;const grad=ctx.createLinearGradient(0,0,0,128);grad.addColorStop(0,'rgba(54,100,133,0)');grad.addColorStop(.6,'rgba(54,100,133,.20)');grad.addColorStop(1,'rgba(54,100,133,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,512,128);canvas.refresh();}
  this.fog=this.add.tileSprite(0,325,960,150,'fog').setOrigin(0).setScrollFactor(0).setDepth(-5);
 }
 pickup(key:string,x:number,y:number,size:number,onCollect:()=>void){
  const sprite=this.physics.add.image(x,y,key).setDepth(6);sprite.setScale(size/Math.max(sprite.width,sprite.height));
  const b=sprite.body as Phaser.Physics.Arcade.Body;b.setAllowGravity(false);b.setSize(sprite.width*.8,sprite.height*.8);
  this.tweens.add({targets:sprite,y:y-7,duration:1000+(x%400),yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
  if(key==='coin')this.tweens.add({targets:sprite,scaleX:sprite.scaleX*.22,duration:600,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
  this.physics.add.overlap(this.player,sprite,()=>{
   if(this.status!=='playing'||!sprite.active)return;
   this.burst(sprite.x,sprite.y,key==='coin'?0xf9c967:0x7ce4cb,8);onCollect();sprite.destroy();this.emitHud();
  });
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
  if(!this.textures.exists('pellet')){const g=this.add.graphics();g.fillStyle(0xe9dcb9);g.fillRect(1,0,4,6);g.fillRect(0,1,6,4);g.generateTexture('pellet',6,6);g.destroy();}
  if(!this.textures.exists('slingshot')){const g=this.add.graphics();g.fillStyle(0x38231c);g.fillRect(8,9,6,16);g.fillRect(2,1,6,12);g.fillRect(14,1,6,12);g.fillStyle(0xb58952);g.fillRect(9,10,3,13);g.fillRect(3,2,3,9);g.fillRect(15,2,3,9);g.lineStyle(2,0xe8d1a2);g.lineBetween(4,2,11,11);g.lineBetween(17,2,11,11);g.generateTexture('slingshot',22,26);g.destroy();}
  if(!this.textures.exists('sword')){const g=this.add.graphics();g.fillStyle(0x0b1520);g.fillPoints([{x:12,y:0},{x:17,y:6},{x:16,y:31},{x:20,y:31},{x:20,y:35},{x:14,y:35},{x:14,y:43},{x:8,y:43},{x:8,y:35},{x:3,y:35},{x:3,y:31},{x:7,y:31},{x:7,y:6}],true);g.fillStyle(0xc5d5dd);g.fillRect(9,7,5,25);g.fillTriangle(9,8,12,2,15,8);g.fillStyle(0x6e91a4);g.fillRect(13,8,2,24);g.fillStyle(0xe4b36c);g.fillRect(5,32,13,2);g.fillStyle(0x754a36);g.fillRect(10,35,3,7);g.generateTexture('sword',24,44);g.destroy();}
 }
 equip(kind:WeaponKind){this.equipped=kind;this.weapon?.setTexture(kind).setOrigin(.5,kind==='sword'?.86:.88);this.game.canvas.focus({preventScroll:true});this.emitHud();}
 fire(targetX?:number,targetY?:number){
  if(this.status!=='playing'||this.elapsed-this.lastShot<WEAPONS[this.equipped].cooldown||settings.menuOpen)return;
  if(this.equipped==='sword'){this.lastShot=this.elapsed;this.swingStarted=this.elapsed;this.meleeHitDone=false;sound('shoot');return;}
  this.lastShot=this.elapsed;const body=this.player.body as Phaser.Physics.Arcade.Body;
  const x=this.player.x+(this.player.flipX?-21:21),y=body.top+body.height*.48;
  if(targetX===undefined){const i=chooseTarget(x,y,this.enemies.map(e=>({x:e.sprite.x,y:e.sprite.y,alive:e.hp>0&&e.controlledAt<0})),WEAPONS.slingshot.range);targetX=i>=0?this.enemies[i].sprite.x:x+(this.player.flipX?-250:250);targetY=i>=0?this.enemies[i].sprite.y:y;}
  const angle=Math.atan2((targetY??y)-y,targetX-x);this.aimAngle=angle;
  const shot=this.physics.add.image(x+Math.cos(angle)*13,y+Math.sin(angle)*13,'pellet').setDepth(15);this.bullets.add(shot);
  shot.setVelocity(Math.cos(angle)*650,Math.sin(angle)*650);shot.setData('expires',this.elapsed+1400);
  shot.setData('originX',shot.x);shot.setData('originY',shot.y);
  this.burst(x,y,0xe6bc7e,4);sound('shoot');
 }
 hurtEnemy(enemy:Enemy,damage:number){
  if(enemy.hp<=0||enemy.controlledAt>=0)return;
  const next=hitEnemy(enemy,damage,this.elapsed);if(next===enemy)return;
  enemy.hp=next.hp;enemy.invulnerableUntil=next.invulnerableUntil;
  this.burst(enemy.sprite.x,enemy.sprite.y,0xd9b68b,5);sound('stomp');
  if(enemy.hp<=0)this.killEnemy(enemy);else this.pop('-'+damage,enemy.sprite.x,enemy.sprite.y-30,0xec8a88);
 }
 killEnemy(enemy:Enemy){
  if(!enemy.sprite.active)return;
  (this.area==='main'?this.mainKills:this.dungeonKills).add(enemy.index);
  enemy.hp=0;enemy.sprite.disableBody(true,true);enemy.bar.clear();enemy.label.setVisible(false);
  this.state.score+=200+enemy.maxHp*50;this.pop('+'+(200+enemy.maxHp*50),enemy.sprite.x,enemy.sprite.y-30);this.burst(enemy.sprite.x,enemy.sprite.y,0xe4886b,18);this.emitHud();
 }
 activatePsi(){
  if(!this.state.abilityReady){this.notify('قدرت ذهنی این مرحله مصرف شده');return;}
  const i=chooseTarget(this.player.x,this.player.y,this.enemies.map(e=>({x:e.sprite.x,y:e.sprite.y,alive:e.hp>0&&e.controlledAt<0&&e.sprite.active})),480);
  this.state=useAbility(this.state,i>=0);if(i<0){this.notify('دشمنی در برد قدرت نیست');return;}
  const enemy=this.enemies[i];enemy.controlledAt=this.elapsed;enemy.liftY=enemy.sprite.y;
  const body=enemy.sprite.body as Phaser.Physics.Arcade.Body;body.setVelocity(0);body.enable=false;
  enemy.sprite.setTint(0xaf9aee);sound('psi');this.notify('کنترل ذهنی — اتصال برقرار شد');this.emitHud();
 }
 enemyBrain(e:Enemy,dt:number){
  if(!e.sprite.active)return;
  if(e.controlledAt>=0){
   const t=(this.elapsed-e.controlledAt)/1100;e.sprite.y=e.liftY-110*Math.min(1,t);e.sprite.rotation=Math.sin(t*20)*.06;
   this.psiBeam.lineStyle(2,0xc3a0ed,.7);this.psiBeam.lineBetween(this.player.x,this.player.y-16,e.sprite.x,e.sprite.y);this.psiBeam.lineStyle(1,0xead9ff,.6);this.psiBeam.strokeCircle(e.sprite.x,e.sprite.y,40+Math.sin(t*14)*8);
   if(t>=1.3){this.burst(e.sprite.x,e.sprite.y,0xb998f1,34);this.killEnemy(e);sound('psi');}
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
   e.sprite.setVelocityX(velocity);if(velocity)e.sprite.setFlipX(velocity<0);
   if(e.kind==='bat'){
    const target=alerted?this.player.y+12:e.baseY+Math.sin(this.elapsed*.003+e.phase)*27;
    e.sprite.y+=Phaser.Math.Clamp(target-e.sprite.y,-75*dt,75*dt);
   }
   if(eb.blocked.left||eb.blocked.right)e.speed=-e.speed;
  }
  e.bar.clear();e.bar.fillStyle(0x09111d,.95);e.bar.fillRect(e.sprite.x-24,e.sprite.y-45,48,7);e.bar.fillStyle(e.controlledAt>=0?0xb399ed:e.aggro?0xeb6972:0x8bc9b1);e.bar.fillRect(e.sprite.x-23,e.sprite.y-44,46*e.hp/e.maxHp,5);
  e.label.setPosition(e.sprite.x,e.sprite.y-53).setText((e.aggro?'! ':'')+e.hp+'/'+e.maxHp);
 }
 encounter(enemy:Phaser.Physics.Arcade.Sprite){
  if(this.status!=='playing'||!enemy.active)return;
  const info=this.enemies.find(e=>e.sprite===enemy);if(!info||info.controlledAt>=0)return;
  const body=this.player.body as Phaser.Physics.Arcade.Body;const eb=enemy.body as Phaser.Physics.Arcade.Body;
  if(isStomp(this.previousBottom,eb.top,body.velocity.y)){
   this.player.setVelocityY(-360);this.jumpsUsed=1;this.hurtEnemy(info,2);this.emitHud();
  }else this.damage(enemy.x);
 }
 damage(fromX:number){
  if(this.elapsed<this.state.invincibleUntil)return;
  this.state=takeHit(this.state,this.elapsed);sound('hit');this.burst(this.player.x,this.player.y,0xdc5863,12);
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
  if(!this.crouching&&groundJump){
   const jump=tryJump(this.jumpsUsed,true);
   if(jump){this.player.setVelocityY(jump.velocity);this.jumpsUsed=jump.used;this.groundedAt=-10000;this.pressedAt=-10000;sound('jump');this.burst(this.player.x,body.bottom,this.jumpsUsed===2?0xb59bf1:0x6a9a9d,8);}
  }
  if(axis)this.player.setFlipX(axis<0);
  let anim=body.blocked.down?(Math.abs(body.velocity.x)>15?(running?'run':'walk'):'idle'):(body.velocity.y<0?'jump':'fall');
  if(big)anim='big'+anim;
  if(this.crouching){this.player.anims.stop();this.player.setFrame(11);}else this.player.play(anim,true);
  this.player.setScale(1);this.player.setAlpha(this.elapsed<this.state.invincibleUntil?.5+Math.sin(this.sceneTime*.014)*.2:1);
  this.psiBeam.clear();for(const enemy of this.enemies)this.enemyBrain(enemy,dt);
  for(const group of [this.bullets,this.hostileShots])for(const obj of [...group.getChildren()]){const bullet=obj as Phaser.Physics.Arcade.Image;if(this.elapsed>bullet.getData('expires')||(group===this.bullets&&!projectileInRange(bullet.getData('originX'),bullet.getData('originY'),bullet.x,bullet.y)))bullet.destroy();}
  const pointer=this.input.activePointer;
  const aim=this.padConnected?this.aimAngle:pointer.isDown?Math.atan2(pointer.worldY-body.center.y,pointer.worldX-this.player.x):this.player.flipX?Math.PI:0;
  const facing=this.player.flipX?-1:1,swing=(this.elapsed-this.swingStarted)/260;
  const swinging=this.equipped==='sword'&&swing<1;
  const rotation=this.equipped==='slingshot'?facing*.08:swinging?facing*(-.85+swing*3):facing*.45;
  const handX=this.player.x+facing*(swinging?24:17),handY=body.top+body.height*.48;
  this.weapon.setPosition(handX,handY).setRotation(rotation).setAlpha(this.player.alpha);
  this.arm.clear();if(swinging){this.arm.lineStyle(9,0x0e1a25);this.arm.lineBetween(this.player.x+facing*7,body.top+14,handX,handY);this.arm.lineStyle(6,0x5d94b4);this.arm.lineBetween(this.player.x+facing*7,body.top+14,handX,handY);this.arm.fillStyle(0xe3a15d);this.arm.fillRect(handX-3,handY-3,6,6);
   if(!this.meleeHitDone&&swing>.26){this.meleeHitDone=true;for(const enemy of this.enemies)if(enemy.sprite.active&&enemy.controlledAt<0&&meleeInRange(this.player.x,this.player.y,enemy.sprite.x,enemy.sprite.y,facing))this.hurtEnemy(enemy,WEAPONS.sword.damage*(this.activeBoosts.power?2:1));}
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
   recordStageResult(this.stageData.id,{allCollectibles:this.mainCoins.size===this.stageData.coins.length&&this.mainRadios.size===this.stageData.tapes.length,dungeonCleared:this.dungeonCleared});
   this.status='complete';this.physics.pause();this.player.setFrame(14);sound('win');this.burst(this.portal.x,this.portal.y-80,0xec8a88,32);this.emitHud();return;
  }
  if(this.sceneTime-this.lastEmit>100){this.lastEmit=this.sceneTime;this.emitHud();}
 }
}
