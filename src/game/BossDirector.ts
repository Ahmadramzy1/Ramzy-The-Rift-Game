import Phaser from 'phaser';
import {loopFrame} from './enemyActions';
import {sound} from './bridge';
import type {GameScene,Enemy} from './GameScene';
import {buildBossArena,type BossArena} from './bossArenas';
import {makeMF,tickMF,hitArm,mfArmTouchesPlayer,psiMF,mfCanTakeDamage,mfAttackForCycle,makeVecnaWindow,exposeVecna,vecnaCanTakeDamage,phaseForHP,attackForCycle,vecnaCueMs,type MFState,type MFAttack,type VecnaWindow,type VecnaAttack,type VecnaPhase} from './bossRules';

type Point={x:number;y:number};
type Device={x:number;y:number;readyAt:number;art:Phaser.GameObjects.Image};
type Shared={arena:BossArena;core:Phaser.GameObjects.Image;stance:Phaser.GameObjects.Image;cue:Phaser.GameObjects.Graphics;props:Phaser.GameObjects.GameObject[];surfaces:GameScene['stageData']['platforms'];active:boolean};
export type MFEncounter=Shared&{kind:'mindflayer';state:MFState;arm:Phaser.GameObjects.Image;armPoint:Point;attack:MFAttack;comboAt:number;severUntil:number};
export type VecnaEncounter=Shared&{kind:'vecna';state:VecnaWindow;phase:VecnaPhase;attack:VecnaAttack|null;attackIndex:number;cueUntil:number;nextAt:number;target:Point;devices:Device[];flight?:{at:number;from:Point;to:Point}};
export type BossEncounter=MFEncounter|VecnaEncounter;
type Airwave={source:Enemy;x:number;y:number;direction:number;expires:number;art:Phaser.GameObjects.Image;hit:boolean};

/** Tactical encounter effects are owned here; HP changes remain in GameScene. */
export class BossDirector {
 readonly encounters=new Map<Enemy,BossEncounter>();
 private airwaves:Airwave[]=[];
 constructor(readonly world:GameScene){}

 attach(e:Enemy){
  if(this.encounters.has(e)||e.kind!=='mindflayer'&&e.kind!=='vecna')return;
  const authored=this.world.stageData.enemies[e.index];
  if(!authored)return;
  const arena=buildBossArena(this.world.stageData,authored,this.world.area);
  if(!arena)return;
  const w=this.world;
  const core=w.add.image(e.sprite.x,arena.floor-65,'boss-cores',e.kind==='mindflayer'?0:2).setDisplaySize(56,56).setDepth(13).setVisible(false);
  // Keep the existing physics body and use fitted generated art independently.
  const stance=w.add.image(e.sprite.x,arena.floor,e.kind==='mindflayer'?'mf-phases':'vecna-stances',0).setOrigin(.5,1).setDepth(8).setScale(e.kind==='mindflayer'?136/408:204/582);
  e.sprite.setAlpha(0);
  const common:Shared={arena,core,stance,cue:w.add.graphics().setDepth(7),props:[],surfaces:[],active:false};
  if(e.kind==='mindflayer'){
   const arm=w.add.image(e.sprite.x,arena.floor,'mf-arm',0).setOrigin(.5,1).setDisplaySize(124,136).setDepth(11).setVisible(false);
   this.encounters.set(e,{...common,kind:'mindflayer',state:makeMF(w.elapsed),arm,armPoint:{x:e.sprite.x,y:arena.floor-42},attack:'slam',comboAt:Infinity,severUntil:0});
   for(const ledge of arena.ledges){
    const art=w.add.image(ledge.x+ledge.w/2,ledge.y+12,'metal-platform').setDisplaySize(ledge.w,24).setDepth(4);
    const collider=w.add.rectangle(ledge.x+ledge.w/2,ledge.y+12,ledge.w,24,0,0);
    w.physics.add.existing(collider,true);w.solids.add(collider);common.props.push(art,collider);
    // Support detection and head-clearance use the same authored surfaces.
    const surface={x:ledge.x,y:ledge.y,w:ledge.w,kind:'metal-platform'};common.surfaces.push(surface);w.stageData.platforms.push(surface);
   }
  }else{
   const devices=arena.pylons.map(p=>({...p,readyAt:0,art:w.add.image(p.x,p.y,'boss-devices',0).setOrigin(.5,1).setDisplaySize(74,98).setDepth(5)}));
   for(const cover of arena.covers){
    const art=w.add.image(cover.x+cover.w/2,arena.floor,'boss-devices',2).setOrigin(.5,1).setDisplaySize(cover.w,cover.h).setDepth(6);
    const collider=w.add.rectangle(cover.x+cover.w/2,cover.y+cover.h/2,cover.w,cover.h,0,0);
    w.physics.add.existing(collider,true);w.solids.add(collider);common.props.push(art,collider);
    const surface={x:cover.x,y:cover.y,w:cover.w,kind:'metal-platform'};common.surfaces.push(surface);w.stageData.platforms.push(surface);
   }
   this.encounters.set(e,{...common,kind:'vecna',state:makeVecnaWindow(),phase:1,attack:null,attackIndex:0,cueUntil:0,nextAt:w.elapsed+1200,target:{x:e.sprite.x,y:arena.floor},devices});
  }
 }

 getHitPoint(e:Enemy):Point {
  const c=this.encounters.get(e);
  if(!c)return {x:e.sprite.x,y:(e.sprite.body as Phaser.Physics.Arcade.Body).center.y};
  if(c.kind==='mindflayer'&&c.state.mode==='stuck'&&this.world.elapsed<c.state.until)return {...c.armPoint};
  // Vecna frame3's painted cyan chest center is (211.5,268.4), feet648.
  return c.kind==='mindflayer'?{x:e.sprite.x,y:c.arena.floor-65}:{x:e.sprite.x+(e.sprite.flipX?17.35:-17.35),y:c.arena.floor-133};
 }

 canPsi(e:Enemy):boolean {
  const c=this.encounters.get(e),now=this.world.elapsed;
  if(!c)return true;
  return c.kind==='mindflayer'?c.state.mode==='stuck'&&now<c.state.until&&!c.state.holdUsed:!c.state.psychicUsed&&!vecnaCanTakeDamage(c.state,now);
 }

 hitTargets(e:Enemy):{x:number;y:number;r:number;kind:'arm'|'core'}[]{
  const c=this.encounters.get(e);if(!c)return [];
  if(c.kind==='mindflayer'&&c.state.mode==='stuck'&&this.world.elapsed<c.state.until)return [{...c.armPoint,r:40,kind:'arm'}];
  const open=c.kind==='mindflayer'?mfCanTakeDamage(c.state,this.world.elapsed):vecnaCanTakeDamage(c.state,this.world.elapsed);
  return open?[{...this.getHitPoint(e),r:c.kind==='mindflayer'?36:28,kind:'core'}]:[];
 }

 updateEnemy(e:Enemy,dt:number){
  const c=this.encounters.get(e);if(!c)return false;
  if(!e.sprite.active||e.hp<=0){this.remove(e);return true;}
  const w=this.world,now=w.elapsed;
  const near=w.player.x>=c.arena.left-100&&w.player.x<=c.arena.right+100&&Math.abs(w.player.x-e.sprite.x)<1000;
  c.active=near||(c.kind==='vecna'&&!!c.flight);
  e.aggro=c.active;
  if(!c.active){c.cue.clear();c.core.setVisible(false);if(c.kind==='mindflayer')c.arm.setVisible(false);this.animateBody(e,c);return true;}
  e.sprite.setFlipX(w.player.x>e.sprite.x);
  const body=e.sprite.body as Phaser.Physics.Arcade.Body;
  body.setAllowGravity(false);e.sprite.setVelocity(0,0);
  if(c.kind==='mindflayer')this.updateMF(e,c,dt);
  else this.updateVecna(e,c,dt);
  this.animateBody(e,c);
  return true;
 }

 private animateBody(e:Enemy,c:BossEncounter){
  const now=this.world.elapsed,clock=now+e.phase*130;
  const breath=Math.sin(clock*.004);
  if(c.kind==='mindflayer'){
   const open=c.active&&mfCanTakeDamage(c.state,now);
   const row=!c.active?0:open?(Math.floor(clock/1100)%2?3:2):c.state.mode==='telegraph'?1:0;
   c.stance.setTexture('mf-living',loopFrame(clock,row,row===1?110:155)).setOrigin(.5,240/256).setScale((136/161)*(1+breath*.009),(136/161)*(1-breath*.012));
   // The rooted arm sways without shifting its target node or ground contact.
   c.arm.setDisplaySize(124*(1+Math.sin(clock*.009)*.018),136);
  }else{
   const open=c.active&&vecnaCanTakeDamage(c.state,now);
   if(open){
    // Keep the authored exposed chest exactly over its tactical weak point.
    c.stance.setTexture('vecna-stances',3).setOrigin(.5,1).setScale((204/582)*(1+breath*.006),(204/582)*(1-breath*.006));
   }else{
    let frame=loopFrame(clock,c.active&&c.attack==='psychic'?1:0,160);
    if(c.flight){const t=Math.min(1,(now-c.flight.at)/850);frame=12+(t<.14?0:t<.48?1:t<.86?2:3);}
    else if(c.active&&c.attack==='leap')frame=12;
    else if(c.active&&c.attack==='high-wave')frame=Math.floor(clock/140)%2===0?8:11;
    else if(c.active&&c.attack==='low-wave')frame=9+Math.floor(clock/140)%2;
    c.stance.setTexture('vecna-living',frame).setOrigin(.5,240/256).setScale((204/229)*(1+breath*.007),(204/229)*(1-breath*.009));
   }
  }
  c.stance.setPosition(e.sprite.x,c.kind==='mindflayer'?c.arena.floor:e.sprite.y).setFlipX(e.sprite.flipX);
  if(now<e.invulnerableUntil)c.stance.setTint(0xffd5d1);else c.stance.clearTint();
 }

 private updateMF(e:Enemy,c:MFEncounter,_dt:number){
  const w=this.world,now=w.elapsed,old=c.state;
  c.state=tickMF(old,now,{active:c.active,hpRatio:e.hp/e.maxHp,variant:c.arena.variant===1});
  if(old.mode!==c.state.mode){
   if(c.state.mode==='telegraph'){
    sound('psi');
    c.attack=mfAttackForCycle(e.hp/e.maxHp,c.state.attackIndex,c.arena.variant===1);
    c.armPoint={x:Phaser.Math.Clamp(w.player.x,Math.max(c.arena.left+65,e.sprite.x-190),Math.min(c.arena.right-65,e.sprite.x+190)),y:c.arena.floor-42};
    w.notify(c.attack==='sweep'?'مایند فلیر: برای موج بلند خم شو؛ سپس دست گیرکرده را با شمشیر بزن.':'مایند فلیر: از نشان دست فاصله بگیر؛ دست گیرکرده را با شمشیر قطع کن.');
   }
   if(c.state.mode==='stuck'){
    sound('explosion');
    w.burst(c.armPoint.x,c.arena.floor,0xff765c,18);
    const pb=w.player.body as Phaser.Physics.Arcade.Body;
    if(Math.abs(pb.center.x-c.armPoint.x)<58&&pb.bottom>c.arena.floor-38)w.damage(c.armPoint.x,2);
    if(c.attack==='sweep')this.spawnAirwaves(e,c.arena.floor-54);
    else w.spawnGroundWaves(e,c.arena.floor);
    if(c.attack==='double-slam')c.comboAt=now+800;
   }
  }
  if(now>=c.comboAt){w.spawnGroundWaves(e,c.arena.floor);c.comboAt=Infinity;}
  c.cue.clear();
  const warning=c.state.mode==='telegraph',stuck=c.state.mode==='stuck';
  const severed=now<c.severUntil;
  c.arm.setVisible(warning||stuck||severed).setPosition(c.armPoint.x-3.6,c.arena.floor).setFrame(severed?2:stuck?1:0).setFlipX(c.state.side===1).setAlpha(warning?.65:1);
  if(warning){
   c.cue.lineStyle(3,0xff8766,.9).strokeEllipse(c.armPoint.x,c.arena.floor-3,116,20);
   c.cue.lineStyle(2,0xffc475,.6).lineBetween(c.armPoint.x,c.arena.floor-135,c.armPoint.x,c.arena.floor-10);
  }
  const open=mfCanTakeDamage(c.state,now);
  c.core.setVisible(open||stuck).setPosition(stuck?c.armPoint.x:e.sprite.x,stuck?c.armPoint.y:c.arena.floor-65).setDisplaySize(stuck?26:56,stuck?26:56).setFrame(Math.floor(now/180)%2);
  c.stance.setPosition(e.sprite.x,c.arena.floor).setFrame(open?3:warning?1:0).setFlipX(e.sprite.flipX);
  e.sprite.setTint(open?0xffb6cc:warning?0xffb06c:stuck?0xa8d8ee:0xffffff);
 }

 private updateVecna(e:Enemy,c:VecnaEncounter,dt:number){
  const w=this.world,now=w.elapsed;
  c.phase=phaseForHP(e.hp/e.maxHp);
  for(const d of c.devices)d.art.setFrame(now<d.readyAt?1:0).setAlpha(now<d.readyAt?.65:1);
  c.cue.clear();
  const open=vecnaCanTakeDamage(c.state,now);
  const targetCore=this.getHitPoint(e);
  c.core.setVisible(open).setPosition(targetCore.x,targetCore.y).setDisplaySize(32,38).setFrame(2+Math.floor(now/180)%2);
  if(open||c.attack&&c.attack!=='leap')c.stance.setTexture('vecna-stances',open?3:c.attack==='high-wave'?1:c.attack==='low-wave'?2:0).setScale(204/582).setOrigin(.5,1);
  else c.stance.setTexture('vecna',c.flight?2:c.attack==='leap'?1:0).setScale(204/554).setOrigin(.5,678/724);
  c.stance.setPosition(e.sprite.x,e.sprite.y).setFlipX(e.sprite.flipX);
  e.sprite.setTint(open?0xffc794:c.attack?0xd1a7ff:0xffffff);
  if(c.flight){
   const f=c.flight,t=Math.min(1,(now-f.at)/850);
   e.sprite.setPosition(Phaser.Math.Linear(f.from.x,f.to.x,t),c.arena.floor-Math.sin(t*Math.PI)*170);
   c.stance.setPosition(e.sprite.x,e.sprite.y);
   e.leap={at:f.at,x:f.from.x,y:f.from.y,tx:f.to.x,ty:f.to.y};
   this.landingCue(c,f.to.x);
   if(t>=1){
    e.sprite.setPosition(f.to.x,c.arena.floor);delete c.flight;delete e.leap;
    const d=c.devices.find(p=>now>=p.readyAt&&Math.abs(p.x-f.to.x)<=65);
    if(d){
     d.readyAt=now+8000;c.state=exposeVecna(c.state,now,'electric-device');
     c.nextAt=now+4300;w.burst(d.x,d.y-55,0x7ce9ff,26);w.pop('۴ ثانیه: نقطهٔ ضعف',e.sprite.x,c.arena.floor-135,0x7ce9ff);
    }else c.nextAt=now+(c.phase===3?850:1250);
    w.vecnaSlam(e,f.to.x,f.to.y);
    const pb=w.player.body as Phaser.Physics.Arcade.Body;
    if(Math.abs(pb.center.x-f.to.x)<=65&&pb.bottom>=f.to.y-65)w.damage(f.to.x,2);
   }
   return;
  }
  if(open){c.attack=null;return;}
  if(c.attack){
   if(c.attack==='leap')this.landingCue(c,c.target.x);
   else if(c.attack==='psychic'){
    c.cue.lineStyle(3,0xc1a0ff,.8).lineBetween(e.sprite.x,c.arena.floor-115,w.player.x,w.player.y);
    c.cue.lineStyle(2,0xc1a0ff,.5).strokeCircle(e.sprite.x,c.arena.floor-115,34);
   }else{
    const y=c.arena.floor-(c.attack==='high-wave'?54:8);
    c.cue.lineStyle(2,0xffb4ce,.5).lineBetween(c.arena.left,y,c.arena.right,y);
   }
   if(now<c.cueUntil)return;
   const attack=c.attack;c.attack=null;
   if(attack==='leap')c.flight={at:now,from:{x:e.sprite.x,y:c.arena.floor},to:c.target};
   else if(attack==='low-wave')w.spawnGroundWaves(e,c.arena.floor,true);
   else if(attack==='high-wave')this.spawnAirwaves(e,c.arena.floor-54);
   else if(!this.behindCover(e,c))w.damage(e.sprite.x,1);
   c.nextAt=now+(c.phase===3?950:c.phase===2?1250:1700);
   return;
  }
  if(now>=c.nextAt){
   c.attack=attackForCycle(c.phase,c.attackIndex++);c.cueUntil=now+vecnaCueMs(c.attack,c.phase);
   sound(c.attack==='leap'?'checkpoint':c.attack==='psychic'?'psi':'shoot');
   c.target={x:Phaser.Math.Clamp(w.player.x,Math.max(e.min,c.arena.left+65),Math.min(e.max,c.arena.right-65)),y:c.arena.floor};
   w.notify(c.attack==='leap'?'وکنا: فرود را به دستگاه برقی روشن بکش، سپس از نشان دور شو.':c.attack==='high-wave'?'وکنا: موج بلند — خم شو!':c.attack==='low-wave'?'وکنا: موج زمینی — بپر!':'وکنا: پشت ستون پناه بگیر یا با تیرکمان تمرکزش را قطع کن.');
  }else{
   // Short, slow steps preserve room to bait the next leap into a pylon.
   const direction=Math.sign(w.player.x-e.sprite.x),next=e.sprite.x+direction*(c.phase===3?30:18)*dt;
   if(Math.abs(w.player.x-e.sprite.x)>180&&!c.arena.covers.some(p=>next>p.x-48&&next<p.x+p.w+48))e.sprite.x=Phaser.Math.Clamp(next,e.min,e.max);
  }
 }

 private landingCue(c:VecnaEncounter,x:number){
  c.cue.lineStyle(3,0xff749a,.9).strokeEllipse(x,c.arena.floor-3,130,22);
  c.cue.lineStyle(1,0xffa7c0,.6).lineBetween(x-52,c.arena.floor-65,x+52,c.arena.floor-65);
 }

 private behindCover(e:Enemy,c:VecnaEncounter){
  const pb=this.world.player.body as Phaser.Physics.Arcade.Body;
  const from={x:e.sprite.x,y:c.arena.floor-115},to={x:pb.center.x,y:pb.center.y};
  return c.arena.covers.some(p=>{
   const x=p.x+p.w/2;
   if(x<=Math.min(from.x,to.x)||x>=Math.max(from.x,to.x))return false;
   const y=from.y+(to.y-from.y)*(x-from.x)/(to.x-from.x);
   return y>=p.y&&y<=p.y+p.h;
  });
 }

 private spawnAirwaves(e:Enemy,y:number){
  for(const direction of [-1,1])this.airwaves.push({source:e,x:e.sprite.x,y,direction,expires:this.world.elapsed+3000,hit:false,art:this.world.add.image(e.sprite.x,y,'vecna-airwave',0).setDisplaySize(116,42).setFlipX(direction<0).setDepth(12)});
 }

 updateEffects(dt:number,_grounded:boolean){
  const w=this.world,now=w.elapsed,pb=w.player.body as Phaser.Physics.Arcade.Body;
  // Arm nodes sit outside the legacy boss collider. Consume these projectiles
  // here; the host owns HP damage and normal body projectile collisions.
  for(const [e,c] of this.encounters){
   if(c.kind!=='mindflayer'||!c.active||c.state.mode!=='stuck'||now>=c.state.until)continue;
   if(mfArmTouchesPlayer(c.state,now,c.armPoint.x,c.arena.floor,pb))w.damage(c.armPoint.x,1,true);
   for(const obj of [...w.bullets.getChildren()]){
    const shot=obj as Phaser.Physics.Arcade.Image;
    if(!shot.active||Math.abs(shot.x-c.armPoint.x)>44||Math.abs(shot.y-c.armPoint.y)>42)continue;
   this.hit(e,0,'slingshot',{x:shot.x,y:shot.y});shot.destroy();
   }
  }
  this.airwaves=this.airwaves.filter(a=>{
   const c=this.encounters.get(a.source);
   if(!c||!a.source.sprite.active||now>=a.expires||a.x<c.arena.left||a.x>c.arena.right){a.art.destroy();return false;}
   const oldX=a.x;a.x+=a.direction*310*dt;
   a.art.setPosition(a.x,a.y).setFrame(Math.floor(now/90)%4).setAlpha(a.hit?.35:1);
   if(!a.hit&&!w.crouching&&pb.right>=Math.min(oldX,a.x)-30&&pb.left<=Math.max(oldX,a.x)+30&&pb.bottom>=a.y-12&&pb.top<=a.y+12){a.hit=true;w.damage(a.source.sprite.x,2);}
   return true;
  });
 }

 hit(e:Enemy,damage:number,weapon:'sword'|'slingshot'|'stomp',point?:Point):number {
  const c=this.encounters.get(e);if(!c)return damage;
  const w=this.world,now=w.elapsed;
  if(weapon==='stomp')return 0;
  const targetCore=this.getHitPoint(e);
  const coreHit=()=>!point||Math.hypot(point.x-targetCore.x,point.y-targetCore.y)<=(weapon==='sword'?78:c.kind==='mindflayer'?36:28);
  if(c.kind==='mindflayer'){
   if(mfCanTakeDamage(c.state,now))return coreHit()?damage:0;
   const p=point??{x:w.player.x,y:(w.player.body as Phaser.Physics.Arcade.Body).center.y};
   if(Math.hypot(p.x-c.armPoint.x,p.y-c.armPoint.y)<=(weapon==='sword'?70:48)){
    const old=c.state;c.state=hitArm(old,weapon,now);
    if(c.state!==old){
     w.burst(c.armPoint.x,c.armPoint.y,weapon==='sword'?0xe6a6d5:0xa3dcff,12);
     if(weapon==='sword'){
      c.severUntil=now+350;c.arm.setFrame(2);w.pop(c.state.cutArms===2?'هسته باز شد: ۴ ثانیه':'دست اول قطع شد',c.armPoint.x,c.armPoint.y-45,0xffc184);
      c.comboAt=Infinity;
     }else w.pop('دست مهار شد',c.armPoint.x,c.armPoint.y-35,0x90d6ff);
    }
   }
   return 0;
  }
  if(vecnaCanTakeDamage(c.state,now))return coreHit()?damage:0;
  if(weapon==='slingshot'&&c.attack==='psychic'){
   c.attack=null;c.nextAt=now+1200;c.cue.clear();w.burst(e.sprite.x,c.arena.floor-110,0xb2daff,12);w.pop('تمرکز قطع شد',e.sprite.x,c.arena.floor-135,0xb2daff);
  }
  return 0;
 }

 psi(e:Enemy):boolean {
  const c=this.encounters.get(e);if(!c)return false;
  const now=this.world.elapsed;
  if(c.kind==='mindflayer'){
   c.state=psiMF(c.state,now);this.world.notify('قدرت ذهنی دست گیرکرده را مهار می‌کند؛ با شمشیر قطعش کن.');
  }else{
   c.state=exposeVecna(c.state,now,'psychic');
   if(vecnaCanTakeDamage(c.state,now)){c.attack=null;c.flight=undefined;delete e.leap;e.sprite.setPosition(e.sprite.x,c.arena.floor);c.nextAt=c.state.exposedUntil+500;}
   this.world.notify('وکنا: روزنهٔ کوتاه ذهنی؛ با سلاح به نقطهٔ ضعف ضربه بزن.');
  }
  return true;
 }

 remove(e:Enemy){
  const c=this.encounters.get(e);if(!c)return;
  c.core.destroy();c.stance.destroy();c.cue.destroy();for(const prop of c.props)prop.destroy();
  this.world.stageData.platforms=this.world.stageData.platforms.filter(p=>!c.surfaces.includes(p));
  if(c.kind==='mindflayer')c.arm.destroy();else for(const d of c.devices)d.art.destroy();
  this.encounters.delete(e);
  this.airwaves=this.airwaves.filter(a=>{if(a.source!==e)return true;a.art.destroy();return false;});
 }
 clear(){for(const e of [...this.encounters.keys()])this.remove(e);}
}
