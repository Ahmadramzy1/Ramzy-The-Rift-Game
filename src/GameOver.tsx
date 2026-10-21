import {useEffect,useReducer,useRef,useState,type CSSProperties} from 'react';
import {gameOverDelay,gameOverTransition} from './game/gameover';
import {getVolumes,playSound,stopMusic} from './game/audio';
import {settings} from './game/bridge';

export default function GameOver({onDone}:{onDone:()=>void}){
 const [phase,send]=useReducer(gameOverTransition,'burst');
 const [blocked,setBlocked]=useState(false),[playing,setPlaying]=useState(false),[fading,setFading]=useState(false);
 const video=useRef<HTMLVideoElement>(null),playButton=useRef<HTMLButtonElement>(null),done=useRef(onDone);done.current=onDone;
 useEffect(()=>{stopMusic();playSound('explosion');
  const block=(e:KeyboardEvent)=>{if(e.target instanceof HTMLElement&&e.target.closest('.video-play'))return;e.preventDefault();e.stopImmediatePropagation();};
  window.addEventListener('keydown',block,true);return()=>window.removeEventListener('keydown',block,true);
 },[]);
 useEffect(()=>{if(phase==='done'){done.current();return;}
  const delay=gameOverDelay(phase);if(delay===undefined)return;
  const timer=setTimeout(()=>send('timer'),delay);return()=>clearTimeout(timer);
 },[phase]);
 const playVideo=()=>{const element=video.current;if(!element)return;if(element.error){send('error');return;}element.volume=getVolumes().sfx;void element.play().then(()=>setBlocked(false)).catch((error:DOMException)=>{if(error.name==='NotAllowedError')setBlocked(true);else send('error');});};
 useEffect(()=>{if(phase==='video')playVideo();},[phase]);
 useEffect(()=>{if(!blocked)return;playButton.current?.focus();let held=true;const timer=setInterval(()=>{try{const pad=Array.from(navigator.getGamepads?.()??[]).find(p=>p?.connected),pressed=!!(pad?.buttons[0]?.pressed||pad?.buttons[9]?.pressed);if(pressed&&!held)playVideo();held=pressed;}catch{/* Optional controller. */}},80);return()=>clearInterval(timer);},[blocked]);
 // Prevent an unavailable/stalled video from trapping the player on a black screen.
 useEffect(()=>{if(phase!=='video'||blocked)return;const timer=setTimeout(()=>{if(!video.current||video.current.readyState<3)send('error');},30000);return()=>clearTimeout(timer);},[phase,blocked,playing]);
 return <div className={'gameover-cinema go-'+phase+(playing?' is-playing':'')+(fading?' video-fading':'')} role="status" aria-label="پایان بازی" data-phase={phase}>
  <div className="gameover-black"/>
  {phase==='burst'&&<div className={'retro-explosion '+(settings.reducedMotion?'quiet':'')} aria-hidden="true"><div className="blast-core"/>{Array.from({length:52},(_,i)=>{const angle=i*2.39996,distance=120+(i%7)*45;return <i key={i} style={{'--dx':Math.cos(angle)*distance+'px','--dy':Math.sin(angle)*distance+'px','--turn':i%2?'-90deg':'90deg','--color':['#fff2b1','#ffb347','#e34b25','#a72536'][i%4]} as CSSProperties}/>;})}</div>}
  <video ref={video} className="gameover-video" src={import.meta.env.BASE_URL+'video/final-life.mp4'} preload="auto" playsInline disablePictureInPicture onPlaying={()=>{setPlaying(true);setBlocked(false);}} onTimeUpdate={()=>{const v=video.current;if(v&&Number.isFinite(v.duration)&&v.duration-v.currentTime<.85)setFading(true);}} onEnded={()=>send('ended')} onError={()=>{if(phase==='video')send('error');}} aria-label="ویدیوی پایان بازی"/>
  {phase==='video'&&blocked&&<button ref={playButton} className="retro-button video-play" onClick={playVideo}>پخش ویدیو ▶</button>}
  {(phase==='title'||phase==='leave')&&<img className="gameover-title" src={import.meta.env.BASE_URL+'assets/game-over-title.png'} alt="GAME OVER"/>}
 </div>;
}
