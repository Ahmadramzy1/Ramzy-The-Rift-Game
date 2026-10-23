import Phaser from 'phaser';
import type {GameScene} from '../src/game/GameScene';
import {touch} from '../src/game/bridge';
import type {MFEncounter,VecnaEncounter} from '../src/game/BossDirector';
import {STAGES} from '../src/game/levels';
type Frames=(n:number)=>Promise<void>;type Assert=(ok:unknown,msg:string)=>void;
function clearWaves(s:GameScene){for(const w of s.shockwaves){w.art.destroy();w.trail.destroy();}s.shockwaves=[];}
function release(){for(const k of Object.keys(touch) as (keyof typeof touch)[])touch[k]=false;}
async function setup(s:GameScene,frames:Frames,id:number,dungeon=false){release();s.loadStage(id);s.startPlay(false);if(dungeon)s.enterDungeon();s.state.invincibleUntil=Infinity;s.upgrades.swordLevel=1;s.upgrades.slingshotLevel=1;await frames(4);}
function quietOthers(s:GameScene,boss:unknown){s.enemies.filter(e=>e!==boss).forEach(e=>{e.sprite.disableBody(true,true);e.bar.clear();e.label.setVisible(false);});}
async function attack(s:GameScene,frames:Frames,kind:'sword'|'slingshot'){s.equip(kind);s.lastShot=s.elapsed-1000;s.fire();await frames(kind==='sword'?13:22);}

export async function checkMindFlayer(s:GameScene,frames:Frames,assert:Assert){
 await setup(s,frames,2);const e=s.enemies.find(e=>e.kind==='mindflayer')!,c=s.bossDirector.encounters.get(e) as MFEncounter;quietOthers(s,e);
 s.player.setPosition(e.sprite.x-170,c.arena.floor-48).setVelocity(0);await frames(4);
 s.hurtEnemy(e,60,true,{x:e.sprite.x,y:c.arena.floor-65});assert(e.hp===60,'closed armor blocks damage');
 c.state={...c.state,mode:'telegraph',until:s.elapsed+20};c.armPoint={x:e.sprite.x-130,y:c.arena.floor-42};await frames(3);assert(c.state.mode==='stuck'&&c.arm.visible,'telegraph plants visible arm');
 const until=c.state.until;s.player.setPosition(c.armPoint.x-100,c.arena.floor-48).setVelocity(0);await attack(s,frames,'slingshot');assert(c.state.holdUsed&&c.state.until>until,'automatic pellet aims at and extends remote arm');
 s.player.setPosition(c.armPoint.x-45,c.arena.floor-48).setVelocity(0);await attack(s,frames,'sword');assert(c.state.cutArms===1&&c.state.mode==='idle','base sword cuts first arm');
 c.state={...c.state,mode:'telegraph',until:s.elapsed+20,holdUsed:false};await frames(3);s.state.abilityReady=true;s.abilityCharges=1;s.activatePsi();assert(c.state.holdUsed&&e.controlledAt<0&&e.hp===60,'psychic holds boss arm without killing boss');
 await attack(s,frames,'sword');assert(c.state.mode==='exposed'&&c.state.cutArms===2&&c.core.visible,'second cut opens visible core');
 clearWaves(s);s.player.setPosition(e.sprite.x-110,c.arena.floor-48).setVelocity(0);await attack(s,frames,'slingshot');assert(e.hp===59,'base automatic slingshot hits open core');
 s.player.setPosition(e.sprite.x-50,c.arena.floor-48).setVelocity(0);await attack(s,frames,'sword');assert(e.hp===57,'base sword deals two to core');
 const oldHp=e.hp;s.elapsed=c.state.until+1;await frames(2);s.hurtEnemy(e,60,true,{x:e.sprite.x,y:c.arena.floor-65});assert(e.hp===oldHp,'four-second exposure closes and armor returns');
 e.hp=28;c.state={...c.state,mode:'idle',until:s.elapsed-1};await frames(1);assert(c.attack==='double-slam'||c.attack==='sweep','half health adds attack combinations');
 c.state={...c.state,mode:'exposed',until:s.elapsed+4000};e.invulnerableUntil=0;s.hurtEnemy(e,60,true,{x:e.sprite.x,y:c.arena.floor-65});await frames(2);assert(!e.sprite.active&&!c.stance.active&&!s.bossDirector.encounters.has(e),'defeat removes tactical art and wave source');
}

export async function checkVecna(s:GameScene,frames:Frames,assert:Assert){
 await setup(s,frames,4,true);const e=s.enemies.find(e=>e.kind==='vecna')!,c=s.bossDirector.encounters.get(e) as VecnaEncounter;quietOthers(s,e);
 s.player.setPosition(c.devices[0].x,c.arena.floor-48).setVelocity(0);await frames(4);s.hurtEnemy(e,100,true,s.bossDirector.getHitPoint(e));assert(e.hp===100,'Vecna armor blocks damage');
 c.attack=null;c.attackIndex=0;c.nextAt=s.elapsed-1;await frames(2);assert(c.attack==='leap','first cue is leap');const target=c.target.x;c.cueUntil=s.elapsed+20;await frames(3);assert(!!c.flight,'warned leap launches');
 s.player.setPosition(target-120,c.arena.floor-48).setVelocity(0);s.elapsed=c.flight!.at+851;await frames(3);assert(c.state.exposedUntil>s.elapsed&&c.devices[0].readyAt>s.elapsed,'landing on electric device exposes core and starts cooldown');
 clearWaves(s);s.player.setPosition(e.sprite.x-110,c.arena.floor-48).setVelocity(0);await attack(s,frames,'slingshot');assert(e.hp===99,'base slingshot hits exposed core');
 s.player.setPosition(e.sprite.x-50,c.arena.floor-48).setVelocity(0);await frames(3);touch.jump=true;await frames(8);await attack(s,frames,'sword');touch.jump=false;await frames(2);assert(e.hp===97,'jumping base sword reaches the actual chest core');
 c.state={exposedUntil:0,psychicUsed:false};c.attack='psychic';c.cueUntil=s.elapsed+3000;s.player.setPosition(e.sprite.x-110,c.arena.floor-48).setVelocity(0);await attack(s,frames,'slingshot');assert(c.attack===null&&e.hp===97,'pellet interrupts psychic channel without bypassing armor');
 e.sprite.setPosition(c.arena.right-100,c.arena.floor);s.player.setPosition(c.arena.covers[0].x-45,c.arena.floor-48).setVelocity(0);s.state.hearts=3;s.state.invincibleUntil=0;c.attack='psychic';c.cueUntil=s.elapsed+20;await frames(3);assert(s.state.hearts===3,'physical pillar shields psychic ray');
 s.player.setPosition(e.sprite.x-70,c.arena.floor-48).setVelocity(0);c.attack='psychic';c.cueUntil=s.elapsed+20;await frames(3);assert(s.state.hearts===2,'uncovered psychic hit deals one heart');
 s.state.invincibleUntil=Infinity;s.state.abilityReady=true;s.abilityCharges=1;c.state={exposedUntil:0,psychicUsed:false};s.activatePsi();assert(c.state.exposedUntil>s.elapsed&&e.controlledAt<0&&e.hp===97,'psychic opens a short window instead of exploding boss');
 s.elapsed=c.state.exposedUntil+1;c.nextAt=Infinity;await frames(2);
 // High waves cross a standing hero's torso; grounded crouch keeps the body below.
 e.sprite.setPosition(c.devices[0].x,c.arena.floor);s.player.setPosition(e.sprite.x+160,c.arena.floor-48).setVelocity(0);s.state.hearts=3;s.state.invincibleUntil=0;touch.crouch=true;await frames(4);c.attack='high-wave';c.cueUntil=s.elapsed+20;await frames(40);assert(s.state.hearts===3,'crouch avoids high wave');
 touch.crouch=false;s.player.setPosition(e.sprite.x+160,c.arena.floor-48).setVelocity(0);s.state.invincibleUntil=0;c.attack='high-wave';c.cueUntil=s.elapsed+20;await frames(40);assert(s.state.hearts===1,'standing high-wave hit deals two hearts');
 clearWaves(s);s.state.hearts=3;s.state.invincibleUntil=0;s.player.setPosition(e.sprite.x+140,c.arena.floor-48).setVelocity(0);await frames(3);touch.jump=true;await frames(3);c.attack='low-wave';c.cueUntil=s.elapsed+20;await frames(30);touch.jump=false;assert(s.state.hearts===3,'normal jump clears low wave');
 e.hp=60;c.attack=null;c.nextAt=Infinity;await frames(1);assert(c.phase===2,'second health phase');e.hp=30;await frames(1);assert(c.phase===3,'third health phase');
 c.state={exposedUntil:s.elapsed+4000,psychicUsed:false};e.invulnerableUntil=0;s.hurtEnemy(e,100,true,s.bossDirector.getHitPoint(e));await frames(2);assert(!e.sprite.active&&!c.stance.active,'open core can be defeated');release();
}

export async function checkFinalVariants(s:GameScene,frames:Frames,assert:Assert){
 const before=STAGES[9].platforms.length;await setup(s,frames,9);const all=[...s.bossDirector.encounters.values()];assert(all.length===4&&new Set(all.map(c=>c.arena.id)).size===4,'four independent final encounters');
 const variant=all.find(c=>c.kind==='mindflayer'&&c.arena.variant===1)!;assert(variant.arena.ledges.length===2&&variant.surfaces.length===2,'second miniboss has physical upper routes');assert(STAGES[9].platforms.length===before+6,'cover and ledges have matching physical tops');
 s.loadStage(0);await frames(2);assert(STAGES[9].platforms.length===before&&s.bossDirector.encounters.size===0,'changing rooms cleans all arena geometry');
}
