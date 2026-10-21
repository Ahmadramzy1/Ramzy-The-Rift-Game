import { useEffect,useState } from 'react';
import {ArrowLeft} from 'lucide-react';
import {settings} from './game/bridge';

const messages=[
 'متشکرم! سیگنال را پیدا کردی. هنوز به کمکت نیاز داریم.',
 'از جنگل برگشتی! می‌دانستم می‌توانی. با هم ادامه می‌دهیم.',
 'چراغ‌های آرکید دوباره روشن شدند. ممنون که تسلیم نشدی.',
 'دیگر کسی در مدرسه تنها نیست. از تو ممنونم.',
 'صدایمان از زیر زمین هم به هم می‌رسد. تو نجاتمان دادی.',
 'حالا می‌توانیم وارد آزمایشگاه شویم. ممنون که راه را باز کردی.',
 'هر قدم تو، ما را به خانه نزدیک‌تر می‌کند. ممنونم.',
 'از سوی دیگر هم برگشتی! باورمان به تو درست بود.',
 'طوفان آرام‌تر شده. فقط یک دروازه مانده؛ با هم تمامش می‌کنیم.',
 'تمام شد. به خاطر تو دوباره کنار هم هستیم. متشکرم، قهرمان.'
];

export default function StageClear({stage,onDone}:{stage:number;onDone:()=>void}){
 const [count,setCount]=useState(0),[phase,setPhase]=useState<'enter'|'speak'|'exit'>('enter');
 const text=messages[stage-1];
 useEffect(()=>{
  const t=setTimeout(()=>setPhase('speak'),settings.reducedMotion?100:850);
  const timer=setInterval(()=>setCount(n=>n+1),55);
  const leave=setTimeout(()=>setPhase('exit'),6900);
  const done=setTimeout(onDone,7900);
  return()=>{clearTimeout(t);clearInterval(timer);clearTimeout(leave);clearTimeout(done);};
 },[stage]);
 return <div className={'ending-overlay ending-'+phase} role="status" aria-label="تشکر الون پس از پایان مرحله">
  <div className="ending-lines"/>
  <img className="eleven-portrait" src={import.meta.env.BASE_URL+'assets/eleven-s5.png'} alt="الون با ظاهر فصل پنجم؛ هودی خاکستری، شورت قرمز روی شلوار و دستمال گردن سرمه‌ای"/>
  <div className="ending-dialogue"><span className="tiny-code">STAGE {String(stage).padStart(2,'0')} CLEAR</span><span className="ending-name pixel-font">ELEVEN</span><p>{text.slice(0,Math.max(0,count-15))}<span className="type-cursor">▌</span></p><span className="ending-next">{stage<10?'اتصال به منطقهٔ بعد…':'سیگنال خاموش شد. به خانه برگشتی.'}</span></div>
  <button className="ending-skip" onClick={onDone}>ادامه <ArrowLeft size={16}/></button>
 </div>;
}
