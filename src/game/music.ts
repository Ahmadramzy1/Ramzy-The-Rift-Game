/** Schedule the next decoded MP3 in advance so background-tab timer throttling cannot break the loop. */
export class LoopingMusic {
 private voices=new Set<{source:AudioBufferSourceNode;gain:GainNode}>();
 private generation=0;
 private playing=false;
 constructor(private context:AudioContext,private output:GainNode,private buffer:AudioBuffer){}
 start(restart=false){
  if(this.playing&&!restart)return;
  const delay=this.voices.size?0.45:0;
  this.stop();this.playing=true;
  const generation=this.generation,fade=Math.min(1,this.buffer.duration/4),period=this.buffer.duration-fade;
  const schedule=(at:number)=>{
   if(!this.playing||generation!==this.generation)return;
   const source=this.context.createBufferSource(),gain=this.context.createGain(),voice={source,gain};
   source.buffer=this.buffer;source.connect(gain);gain.connect(this.output);
   gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(1,at+fade);
   gain.gain.setValueAtTime(1,at+period);gain.gain.linearRampToValueAtTime(0,at+this.buffer.duration);
   this.voices.add(voice);
   source.onended=()=>{this.voices.delete(voice);source.disconnect();gain.disconnect();schedule(at+period*2);};
   source.start(at,0);
  };
  const at=this.context.currentTime+delay;schedule(at);schedule(at+period);
 }
 stop(){
  this.playing=false;this.generation++;
  const now=this.context.currentTime;
  for(const {source,gain} of this.voices){gain.gain.cancelAndHoldAtTime(now);gain.gain.linearRampToValueAtTime(0,now+.45);source.stop(now+.45);}
  this.voices.clear();
 }
}
