import Phaser from 'phaser';
import {GameScene} from '../src/game/GameScene';
import {STAGES} from '../src/game/levels';
import {settings,touch} from '../src/game/bridge';
const scene=new GameScene();settings.sound=false;settings.menuOpen=false;
const game=new Phaser.Game({type:Phaser.CANVAS,parent:'game',width:1920,height:1080,scene:[scene],physics:{default:'arcade',arcade:{gravity:{x:0,y:1500},fps:60,fixedStep:true}},audio:{noAudio:true},pixelArt:true});
const stage=document.querySelector<HTMLSelectElement>('#stage')!,output=document.querySelector('#results')!,gallery=document.querySelector('#gallery')!;
STAGES.forEach((s,i)=>stage.add(new Option(`${s.id}: ${s.english}`,String(i))));stage.value='3';
const frames=(n:number)=>new Promise<void>(resolve=>{let count=0;const tick=()=>{if(++count>=n){game.events.off('poststep',tick);resolve();}};game.events.on('poststep',tick);});
async function show(dark:boolean){touch.right=false;scene.loadStage(Number(stage.value),dark?'dungeon':'main');scene.startPlay(false);scene.state.invincibleUntil=Infinity;await frames(8);scene.pause();output.textContent=`${scene.stageData.english} / ${dark?'UPSIDE DOWN':'NORMAL'}`;}
document.querySelector<HTMLButtonElement>('#normal')!.onclick=()=>void show(false);
document.querySelector<HTMLButtonElement>('#dark')!.onclick=()=>void show(true);
const ready=()=>{if(!scene.player)return;game.events.off('poststep',ready);document.querySelector<HTMLButtonElement>('#review')!.disabled=false;void show(false);};game.events.on('poststep',ready);
document.querySelector<HTMLButtonElement>('#review')!.onclick=async()=>{
 gallery.replaceChildren();let count=0;
 for(let i=0;i<10;i++)for(const dark of [false,true]){
  stage.value=String(i);await show(dark);
  if(!scene.textures.exists(`stage-environment-${i+1}`))throw Error('Missing stage atlas '+(i+1));
  const backdrop=scene.children.list.find(o=>o instanceof Phaser.GameObjects.Image&&o.texture.key===`stage-environment-${i+1}`) as Phaser.GameObjects.Image;
  if(!backdrop||backdrop.frame.name!==(dark?'upside-down':'normal'))throw Error('Wrong world frame');
  if(!(scene.player.body as Phaser.Physics.Arcade.Body).blocked.down)throw Error('Spawn not grounded '+i);
  if(scene.enemies.some(e=>e.kind==='mindflayer'&&e.maxHp!==60||e.kind==='vecna'&&e.maxHp!==100))throw Error('Wrong boss HP');
  const before=scene.player.x;scene.resume();touch.right=true;await frames(6);touch.right=false;
  if(scene.player.x<=before)throw Error('Cannot move in '+i);scene.pause();await frames(1);
  const figure=document.createElement('figure'),canvas=document.createElement('canvas'),caption=document.createElement('figcaption');canvas.width=960;canvas.height=540;canvas.getContext('2d')!.drawImage(game.canvas,0,0,960,540);caption.textContent=`${i+1} ${scene.stageData.english} / ${dark?'UPSIDE DOWN':'NORMAL'}`;figure.append(canvas,caption);gallery.append(figure);count++;
 }
 output.textContent=`PASS: ${count} environments loaded, matching normal/Upside Down frames, safe grounded spawns, movement and boss HP. Scroll gallery for rendered scenes.`;
};
