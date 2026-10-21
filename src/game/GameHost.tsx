import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { GameScene } from './GameScene';
import { commands, updates } from './bridge';

export default function GameHost(){
 const parent=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const scene=new GameScene();
  const game=new Phaser.Game({type:Phaser.AUTO,parent:parent.current!,width:1920,height:1080,pixelArt:true,roundPixels:true,backgroundColor:'#0c1525',scene:[scene],physics:{default:'arcade',arcade:{gravity:{x:0,y:1500},fps:60,fixedStep:true}},scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:false},audio:{noAudio:true}});
  const respawn=()=>scene.respawn();commands.addEventListener('respawn',respawn);
  const canvas=()=>{const c=parent.current?.querySelector('canvas');if(c){c.setAttribute('aria-label','بازی سیگنال ۸۶؛ با کلیدهای جهت حرکت و با فاصله پرش کنید.');c.setAttribute('role','img');}updates.dispatchEvent(new Event('loaded'));};
  game.events.once('ready',canvas);
  return ()=>{commands.removeEventListener('respawn',respawn);game.destroy(true);};
 },[]);
 return <div className="phaser-host" ref={parent}/>;
}
