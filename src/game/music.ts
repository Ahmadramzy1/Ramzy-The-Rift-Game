/** Schedule the next decoded MP3 in advance so background-tab timer throttling cannot break the loop. */
export class LoopingMusic {
 private voices=new Set<{source:AudioBufferSourceNode;gain:GainNode;at:number;index:number}>();
 private generation=0;
 private playing=false;
 private buffers:AudioBuffer[];
 private selected=0;
 constructor(private context:AudioContext,private output:GainNode,buffers:AudioBuffer|AudioBuffer[]){this.buffers=Array.isArray(buffers)?buffers:[buffers];if(!this.buffers.length)throw new Error('Empty music playlist');}
 get currentTrack(){return [...this.voices].filter(v=>v.at<=this.context.currentTime).sort((a,b)=>b.at-a.at)[0]?.index??this.selected;}
 start(restart=false,index=this.selected){
  if(this.playing&&!restart)return;
  const delay=this.voices.size?0.45:0;
  this.stop();this.playing=true;
  this.selected=Number.isInteger(index)&&index>=0&&index<this.buffers.length?index:0;
  const generation=this.generation;
  let nextAt=this.context.currentTime+delay,nextIndex=this.selected;
  const schedule=()=>{
   if(!this.playing||generation!==this.generation)return;
   const at=nextAt,index=nextIndex,buffer=this.buffers[index],fade=Math.min(1,buffer.duration/4),period=buffer.duration-fade;
   nextAt=at+period;nextIndex=(index+1)%this.buffers.length;
   const source=this.context.createBufferSource(),gain=this.context.createGain(),voice={source,gain,at,index};
   source.buffer=buffer;source.connect(gain);gain.connect(this.output);
   gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(1,at+fade);
   gain.gain.setValueAtTime(1,at+period);gain.gain.linearRampToValueAtTime(0,at+buffer.duration);
   this.voices.add(voice);
   source.onended=()=>{this.voices.delete(voice);source.disconnect();gain.disconnect();schedule();};
   source.start(at,0);
  };
  schedule();schedule();
 }
 stop(){
  this.playing=false;this.generation++;
  const now=this.context.currentTime;
  for(const {source,gain} of this.voices){gain.gain.cancelAndHoldAtTime(now);gain.gain.linearRampToValueAtTime(0,now+.45);source.stop(now+.45);}
  this.voices.clear();
 }
}
