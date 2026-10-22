import {loadVolumes} from './progression';
import {LoopingMusic} from './music';
export type SoundKind='jump'|'coin'|'stomp'|'hit'|'power'|'win'|'checkpoint'|'shoot'|'psi'|'explosion';
let context:AudioContext|undefined,sfxBus:GainNode|undefined,musicBus:GainNode|undefined;
let music:LoopingMusic|undefined,loading:Promise<LoopingMusic>|undefined,wanted=false,request=0;
export const MUSIC_TRACKS=[{title:'Evanescence — Going Under (Remastered)',file:'going-under-remastered.mp3'},{title:'8bit Stranger Things',file:'8bit-stranger-things.mp3'}] as const;
let selectedTrack=0;try{const saved=Number(localStorage.getItem('ramzy-music-track'));if(Number.isInteger(saved)&&saved>=0&&saved<MUSIC_TRACKS.length)selectedTrack=saved;}catch{/* Default first track. */}
export const getMusicSelection=()=>selectedTrack;
export const getCurrentMusicTrack=()=>music?.currentTrack??selectedTrack;
export function setMusicTrack(index:number){if(!Number.isInteger(index)||index<0||index>=MUSIC_TRACKS.length)return;selectedTrack=index;try{localStorage.setItem('ramzy-music-track',String(index));}catch{/* Session selection remains available. */}startMusic(true);}
let volumes=loadVolumes(null);try{volumes=loadVolumes(localStorage.getItem('ramzy-volumes'));}catch{/* Defaults when storage is unavailable. */}
export function getVolumes(){return {...volumes};}
export function setVolumes(value:{sfx:number;music:number}){
 volumes={sfx:Math.max(0,Math.min(1,value.sfx)),music:Math.max(0,Math.min(1,value.music))};
 if(context){sfxBus?.gain.setTargetAtTime(volumes.sfx,context.currentTime,.03);musicBus?.gain.setTargetAtTime(volumes.music,context.currentTime,.05);}
 try{localStorage.setItem('ramzy-volumes',JSON.stringify(volumes));}catch{/* Session-only audio settings remain functional. */}
}
function setup(){
 context??=new AudioContext();if(!sfxBus){sfxBus=context.createGain();musicBus=context.createGain();sfxBus.connect(context.destination);musicBus.connect(context.destination);setVolumes(volumes);}
 if(context.state==='suspended')void context.resume();return context;
}
export function startMusic(restart=false){
 try{
  const c=setup();wanted=true;const id=++request;
  if(music){music.start(restart,selectedTrack);return;}
  loading??=Promise.all(MUSIC_TRACKS.map(track=>fetch(import.meta.env.BASE_URL+'audio/'+track.file)
   .then(r=>{if(!r.ok)throw new Error('Soundtrack unavailable');return r.arrayBuffer();})
   .then(bytes=>c.decodeAudioData(bytes)))).then(buffers=>music=new LoopingMusic(c,musicBus!,buffers))
   .catch(error=>{loading=undefined;throw error;});
  void loading.then(track=>{if(wanted&&id===request)track.start(restart,selectedTrack);}).catch(()=>{});
 }catch{/* Browser autoplay restrictions never prevent playing the game. */}
}
export function stopMusic(){wanted=false;request++;music?.stop();}
export function playSound(kind:SoundKind){
 try{const c=setup();
  if(kind==='explosion'){
   const length=Math.floor(c.sampleRate*.75),buffer=c.createBuffer(1,length,c.sampleRate),data=buffer.getChannelData(0);
   for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(1-i/length);
   const source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();source.buffer=buffer;filter.type='lowpass';filter.frequency.setValueAtTime(1800,c.currentTime);filter.frequency.exponentialRampToValueAtTime(65,c.currentTime+.7);gain.gain.setValueAtTime(.5,c.currentTime);gain.gain.exponentialRampToValueAtTime(.001,c.currentTime+.75);source.connect(filter);filter.connect(gain);gain.connect(sfxBus!);source.start();return;
  }
  const frequencies={jump:[220,520],coin:[900,1400],stomp:[130,55],hit:[200,45],power:[440,880],win:[660,1320],checkpoint:[520,1040],shoot:[650,190],psi:[120,720]};
  const [a,b]=frequencies[kind],o=c.createOscillator(),g=c.createGain();o.type=kind==='hit'?'sawtooth':'square';o.frequency.setValueAtTime(a,c.currentTime);o.frequency.exponentialRampToValueAtTime(b,c.currentTime+.13);g.gain.setValueAtTime(.045,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.18);o.connect(g);g.connect(sfxBus!);o.start();o.stop(c.currentTime+.19);
 }catch{/* Sound is optional when audio is unavailable. */}
}
