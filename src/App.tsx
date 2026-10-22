import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Check,ChevronLeft,Lock,Maximize2,Pause,Play,RotateCcw,Settings,Volume2,X,Map} from 'lucide-react';
import GameHost from './game/GameHost';
import StageClear from './StageClear';
import GameOver from './GameOver';
import {shouldPlayGameOver} from './game/gameover';
import {command,updates,touch,settings,type Hud} from './game/bridge';
import {initialState,readProgress} from './game/mechanics';
import {STAGES} from './game/levels';
import {highestUnlocked,isUnlocked} from './game/progression';
import {getVolumes,setVolumes,startMusic,stopMusic,playSound,MUSIC_TRACKS,getMusicSelection,getCurrentMusicTrack,setMusicTrack} from './game/audio';
import {readPad} from './game/combat';
import {loadCampaign,buyBoost,BOOST_PRICES,type BoostKind} from './game/campaign';
import './shop.css';

type View='menu'|'map'|'shop'|'game'|'exit';
const asset=(key:string)=>import.meta.env.BASE_URL+'assets/'+key+'.png';
const fa=(n:number)=>n.toLocaleString('fa-IR');
const positions=[[12.2,31.4],[31.1,33.4],[49,35.7],[68.1,33.8],[88.2,39.7],[74,60.4],[49.6,61],[24.6,65],[57.7,80.6],[87.2,81.8]];
const starPositions=[40.1,40.7,42.5,40.7,46.6,68.6,69,74,88.7,90.3];
const saveKey='ramzy-v2-progress';

function Panel({title,close,children}:{title:string;close:()=>void;children:React.ReactNode}){
 const ref=useRef<HTMLDivElement>(null),closeRef=useRef(close);closeRef.current=close;
 useEffect(()=>{
  const old=document.activeElement as HTMLElement|null;ref.current?.focus();
  const handle=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();closeRef.current();}
   if(e.key==='Tab'){const elements=ref.current?.querySelectorAll<HTMLElement>('button,input');if(!elements?.length)return;const first=elements[0],last=elements[elements.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};
  document.addEventListener('keydown',handle,true);return()=>{document.removeEventListener('keydown',handle,true);old?.focus({preventScroll:true});};
 },[]);
 return <div className="panel-shade"><div className="panel" role="dialog" aria-modal="true" aria-label={title} ref={ref} tabIndex={-1}><div className="panel-head"><h2>{title}</h2><button className="icon-button" onClick={close} aria-label="بستن"><X/></button></div>{children}</div></div>;
}

export default function App(){
 const [view,setView]=useState<View>('menu'),[loaded,setLoaded]=useState(false),[selected,setSelected]=useState(1),[menuIndex,setMenuIndex]=useState(0);
 const [hud,setHud]=useState<Hud>({...initialState(),stage:1,progress:0,status:'ready',time:0,notice:''});
 const [completed,setCompleted]=useState<number[]>(()=>{try{return readProgress(localStorage.getItem(saveKey));}catch{return [];}});
 const [showSettings,setShowSettings]=useState(false),[showGuide,setShowGuide]=useState(false),[volumes,updateVolumes]=useState(getVolumes),[endingDone,setEndingDone]=useState(false);
 const [musicSelection,setMusicSelection]=useState(getMusicSelection),[currentTrack,setCurrentTrack]=useState(getCurrentMusicTrack);
 useEffect(()=>{const timer=setInterval(()=>setCurrentTrack(getCurrentMusicTrack()),500);return()=>clearInterval(timer);},[]);
 const [campaign,setCampaign]=useState(loadCampaign),[shopMessage,setShopMessage]=useState('');
 const stage=STAGES[hud.stage-1],root=useRef<HTMLDivElement>(null),shopRef=useRef<HTMLElement>(null);
 useEffect(()=>{const sync=()=>setCampaign(loadCampaign());updates.addEventListener('campaign',sync);return()=>updates.removeEventListener('campaign',sync);},[]);
 useEffect(()=>{if(view==='shop'){shopRef.current?.focus();setShopMessage('');}},[view,selected]);
 useEffect(()=>{settings.menuOpen=view!=='game'||showSettings||showGuide||hud.status==='gameover';},[view,showSettings,showGuide,hud.status]);
 useEffect(()=>{if(hud.status!=='complete')setEndingDone(false);},[hud.status]);
 useEffect(()=>{
  const update=(event:Event)=>{const h=(event as CustomEvent<Hud>).detail;setHud(h);setLoaded(true);
   if(h.status==='complete')setCompleted(prev=>{const next=[...new Set([...prev,h.stage])];try{localStorage.setItem(saveKey,JSON.stringify(next));}catch{/* Session progress still works. */}return next;});};
  const musicRestart=()=>startMusic(true);
  const unlockAudio=()=>{window.removeEventListener('pointerdown',unlockAudio);window.removeEventListener('keydown',unlockAudio);startMusic();};
  window.addEventListener('pointerdown',unlockAudio,{once:true});window.addEventListener('keydown',unlockAudio,{once:true});
  updates.addEventListener('music-restart',musicRestart);
  const ready=()=>setLoaded(true);const reset=()=>{for(const key of Object.keys(touch) as (keyof typeof touch)[])touch[key]=false;};
  updates.addEventListener('hud',update);updates.addEventListener('loaded',ready);window.addEventListener('blur',reset);
  return()=>{window.removeEventListener('pointerdown',unlockAudio);window.removeEventListener('keydown',unlockAudio);updates.removeEventListener('music-restart',musicRestart);updates.removeEventListener('hud',update);updates.removeEventListener('loaded',ready);window.removeEventListener('blur',reset);stopMusic();};
 },[]);
 const fullscreen=()=>{if(!document.fullscreenElement)void root.current?.requestFullscreen().catch(()=>{});};
 const play=()=>{startMusic();fullscreen();command('menu');setSelected(highestUnlocked(completed));setView('map');};
 const enterStage=(id:number)=>{if(!loaded||!isUnlocked(id,completed))return;setSelected(id);setView('shop');};
 const startStage=()=>{setView('game');command('stage',selected-1);};
 const purchase=(kind:BoostKind)=>{const success=buyBoost(selected,kind);setCampaign(loadCampaign());setShopMessage(success?'خرید ذخیره شد؛ در شروع این مرحله فعال می‌شود.':'سکهٔ کافی نداری.');if(success)playSound('coin');};
 const mainMenu=()=>{command('menu');setView('menu');};
 const openMap=()=>{command('pause');setSelected(hud.stage);setView('map');};
 const openSettings=()=>{if(hud.status==='playing')command('pause');startMusic();setShowSettings(true);};
 const exit=()=>{command('menu');stopMusic();setView('exit');if(document.fullscreenElement)void document.exitFullscreen();};
 const changeVolume=(type:'sfx'|'music',n:number)=>{const next={...volumes,[type]:n};updateVolumes(next);setVolumes(next);startMusic();};
 const latest=useRef({view,selected,menuIndex,showSettings,showGuide,completed,hud});latest.current={view,selected,menuIndex,showSettings,showGuide,completed,hud};
 const actions=useRef({play,enterStage,startStage,mainMenu,openSettings,exit});actions.current={play,enterStage,startStage,mainMenu,openSettings,exit};
 useEffect(()=>{
  let previous={a:false,b:false,axis:0,vertical:0};
  const timer=setInterval(()=>{try{const pad=Array.from(navigator.getGamepads?.()??[]).find(p=>p?.connected);if(!pad)return;const c=readPad(pad.axes,pad.buttons.map(b=>b.pressed)),a=!!pad.buttons[0]?.pressed,b=!!pad.buttons[1]?.pressed,vertical=pad.buttons[12]?.pressed?-1:pad.buttons[13]?.pressed?1:Math.abs(pad.axes[1]||0)>.5?Math.sign(pad.axes[1]):0;const s=latest.current;
   if(s.showSettings||s.showGuide){if(b&&!previous.b){setShowSettings(false);setShowGuide(false);}}
   else if(s.view==='menu'){
    if(vertical&&vertical!==previous.vertical)setMenuIndex(n=>(n+vertical+3)%3);
    if(a&&!previous.a){if(s.menuIndex===0)actions.current.play();else if(s.menuIndex===1)actions.current.openSettings();else actions.current.exit();}
   }else if(s.view==='map'){
    if(c.axis&&c.axis!==previous.axis)setSelected(n=>Math.max(1,Math.min(highestUnlocked(s.completed),n+c.axis)));
    if(a&&!previous.a)actions.current.enterStage(s.selected);if(b&&!previous.b)actions.current.mainMenu();
   }else if(s.view==='shop'){const buttons=Array.from(shopRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')??[]);if((vertical&&vertical!==previous.vertical)||(c.axis&&c.axis!==previous.axis)){const direction=vertical||c.axis,index=buttons.indexOf(document.activeElement as HTMLButtonElement);buttons[(index+direction+buttons.length)%buttons.length]?.focus();}if(a&&!previous.a){const focused=document.activeElement;if(focused instanceof HTMLButtonElement&&shopRef.current?.contains(focused))focused.click();else actions.current.startStage();}if(b&&!previous.b)setView('map');}else if(s.view==='exit'&&a&&!previous.a)setView('menu');
   previous={a,b,axis:c.axis,vertical};
  }catch{/* Optional controller support. */}},80);return()=>clearInterval(timer);
 },[]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(showSettings||showGuide||hud.status==='gameover')return;
  if(view==='menu'&&!(document.activeElement instanceof HTMLButtonElement)){
   if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setMenuIndex(n=>(n+(e.key==='ArrowDown'?1:2))%3);}
   if(e.key==='Enter'){if(menuIndex===0)play();else if(menuIndex===1)openSettings();else exit();}
  }else if(view==='map'){
   if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();setSelected(n=>Math.max(1,Math.min(highestUnlocked(completed),n+(e.key==='ArrowRight'?1:-1))));}
   if(e.key==='Enter'&&!(document.activeElement instanceof HTMLButtonElement))enterStage(selected);
   if(e.key==='Escape')mainMenu();
  }else if(view==='shop'){if(e.key==='Escape'){e.preventDefault();setView('map');}if(e.key==='Enter'&&document.activeElement===shopRef.current){e.preventDefault();startStage();}}else if(view==='game'&&e.key==='Enter'&&!(document.activeElement instanceof HTMLButtonElement)){
   if(hud.status==='dead')command('respawn');
  }
 };window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[view,menuIndex,selected,completed,showSettings,showGuide,hud.status]);
 const touchKey=(key:keyof typeof touch,label:string,content:React.ReactNode)=><button aria-label={label} className={'touch-key '+key} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);touch[key]=true;}} onPointerUp={()=>touch[key]=false} onPointerCancel={()=>touch[key]=false} onLostPointerCapture={()=>touch[key]=false}>{content}</button>;
 return <div className="game-viewport" ref={root}><main className="game-stage" aria-label="RAMZY — پلتفرمر رترو">
  <div className={'game-world '+(view==='game'?'visible':'')} data-status={hud.status} data-stage={hud.stage} aria-hidden={view!=='game'}><GameHost/>
   <div className="vignette"/><div className="scanlines"/>
   <div className="hud" dir="ltr"><div className="hud-player"><div className="avatar"/><div><span className="pixel small">PLAYER 01</span><div className="hearts">{[0,1,2].map(i=><img key={i} src={asset('heart')} alt={i<hud.hearts?'قلب سالم':'قلب خالی'} className={i<hud.hearts?'':'empty'}/>)}<span className="pixel">×{hud.lives}</span></div><div className="collectibles"><img src={asset('coin')} alt="سکه"/><b className="pixel">×{String(hud.coins).padStart(2,'0')}</b><img src={asset('radio')} alt="رادیوی جمع‌کردنی"/><b className="pixel">{hud.tapes}/{hud.totalRadios??2}</b></div></div></div><div className="hud-stage"><span className="pixel">STAGE {String(hud.stage).padStart(2,'0')}</span><span>{stage.name}</span><small>{hud.area==='dungeon'?'DUNGEON':stage.english.toUpperCase()}</small>{hud.area==='dungeon'&&<span className="dungeon-status">{hud.dungeonCleared?'دخمه پاک‌سازی شد':'دشمن باقی‌مانده: '+fa(hud.dungeonRemaining??0)}</span>}</div><div className="hud-score"><span className="pixel small">SCORE</span><b className="pixel">{String(hud.score).padStart(6,'0')}</b><div className="hud-tools"><button aria-label="توقف بازی" onClick={()=>command('pause')} disabled={hud.status!=='playing'}><Pause/></button><button aria-label="تنظیمات" onClick={openSettings}><Settings/></button><button aria-label="تمام صفحه" onClick={fullscreen}><Maximize2/></button></div></div></div>
   <button className={'psi-button '+(!hud.abilityReady?'spent':'')} disabled={hud.status!=='playing'} onClick={()=>command('psi')} aria-label="کنترل ذهنی"><kbd>Q</kbd><span>کنترل ذهنی</span><b>{hud.abilityReady?'1/1':'0/1'}</b></button>
   <div className="weapon-belt" aria-label="انتخاب سلاح"><button className={hud.weapon!=='sword'?'equipped':''} onClick={()=>command('weapon','slingshot')} aria-label="تیرکمان"><kbd>1</kbd> تیرکمان</button><button className={hud.weapon==='sword'?'equipped':''} onClick={()=>command('weapon','sword')} aria-label="شمشیر"><kbd>2</kbd> شمشیر</button></div>
   {hud.big&&<span className="power-label pixel">POWER UP</span>}{hud.gamepad&&<span className="pad-label">کنترلر متصل</span>}
   <div className="progress" role="progressbar" aria-label="پیشرفت مرحله" aria-valuenow={hud.progress} aria-valuemin={0} aria-valuemax={100}><i style={{width:hud.progress+'%'}}/></div>
   {hud.notice&&hud.status==='playing'&&<div className="notice" role="status">{hud.notice}</div>}
   {hud.status==='paused'&&<div className="state-overlay"><span className="pixel red small">PAUSED</span><h1>بازی متوقف شد</h1><button className="retro-button" onClick={()=>command('resume')}><Play/> ادامهٔ بازی</button><button className="secondary-button" onClick={openMap}><Map/> نقشهٔ مراحل</button><button className="secondary-button" onClick={openSettings}><Settings/> تنظیمات</button><button className="secondary-button" onClick={mainMenu}>منوی اصلی</button></div>}
   {hud.status==='dead'&&<div className="state-overlay"><span className="pixel red">SIGNAL LOST</span><h1>هنوز راهی هست.</h1><p>{fa(hud.lives)} جان باقی‌مانده</p><button className="retro-button" onClick={()=>command('respawn')}><RotateCcw/>ادامهٔ مسیر</button><button className="secondary-button" onClick={openMap}>نقشهٔ مراحل</button></div>}
   {view==='game'&&shouldPlayGameOver(hud.status,hud.lives)&&<GameOver onDone={()=>{command('menu');setSelected(hud.stage);setView('map');startMusic();}}/>}
   {hud.status==='complete'&&!endingDone&&<StageClear stage={hud.stage} onDone={()=>{if(hud.stage<10){setSelected(hud.stage+1);setView('map');}else setEndingDone(true);}}/>}
   {hud.status==='complete'&&endingDone&&<div className="state-overlay"><span className="pixel red">THE SIGNAL IS SILENT</span><h1>به خانه برگشتی.</h1><button className="retro-button" onClick={openMap}>نقشهٔ مراحل</button><button className="secondary-button" onClick={mainMenu}>منوی اصلی</button></div>}
   {hud.status==='playing'&&<div className="touch-controls" dir="ltr"><div>{touchKey('left','چپ',<ArrowLeft/>)}{touchKey('right','راست',<ArrowRight/>)}{touchKey('crouch','کروچ','↓')}</div><div>{touchKey('weapon','تعویض سلاح','↔')}{touchKey('ability','قدرت ذهنی','Ψ')}{touchKey('shoot','حمله','X')}{touchKey('run','دویدن','B')}{touchKey('jump','پرش','A')}</div></div>}
  </div>

  {view==='menu'&&<section className="main-menu" aria-label="منوی اصلی"><video className="menu-art" src={import.meta.env.BASE_URL+'video/main-menu.mp4'} poster={asset('main-menu')} autoPlay loop muted playsInline disablePictureInPicture aria-label="منوی متحرک RAMZY"/><button className={'art-button art-play '+(menuIndex===0?'chosen':'')} aria-label="PLAY — شروع بازی" onMouseEnter={()=>setMenuIndex(0)} onClick={play}><span className="sr-only">PLAY</span></button><button className={'art-button art-settings '+(menuIndex===1?'chosen':'')} aria-label="SETTINGS — تنظیمات" onMouseEnter={()=>setMenuIndex(1)} onClick={openSettings}><span className="sr-only">SETTINGS</span></button><button className={'art-button art-exit '+(menuIndex===2?'chosen':'')} aria-label="EXIT — خروج" onMouseEnter={()=>setMenuIndex(2)} onClick={exit}><span className="sr-only">EXIT</span></button>{!loaded&&<span className="loading pixel">LOADING ASSETS…</span>}<button className="menu-help" onClick={()=>setShowGuide(true)}>راهنمای کنترل <span className="english">[?]</span></button></section>}

  {view==='map'&&<section className="world-map" aria-label="نقشهٔ مراحل"><div className="map-art"><img src={asset('world-map')} alt="نقشهٔ ده مرحله از محله تا دروازهٔ نهایی"/>{positions.map(([x,y],i)=><button key={i} style={{left:x+'%',top:y+'%'}} className={'map-pin '+(selected===i+1?'selected ':'')+(completed.includes(i+1)?'done':'')+(!isUnlocked(i+1,completed)?' locked':'')} disabled={!isUnlocked(i+1,completed)||!loaded} aria-label={`مرحله ${i+1}: ${STAGES[i].name}${!isUnlocked(i+1,completed)?' — قفل':''} — ${campaign.stars[i+1]||0} از ۳ ستاره`} aria-pressed={selected===i+1} onMouseEnter={()=>{if(isUnlocked(i+1,completed))setSelected(i+1);}} onClick={()=>enterStage(i+1)}>{!isUnlocked(i+1,completed)?<Lock/>:completed.includes(i+1)?<Check/>:<span>{i+1}</span>}<span className="map-stars" style={{top:`calc(50% + ${(starPositions[i]-y)*.5625}cqw)`}} aria-label={`${campaign.stars[i+1]||0} از ۳ ستاره`}>{[1,2,3].map(star=><span key={star} className={star<=(campaign.stars[i+1]||0)?'earned':''}>★</span>)}</span></button>)}</div><button className="map-back" onClick={mainMenu} aria-label="بازگشت به منوی اصلی"><ArrowRight/> منوی اصلی</button><div className="map-caption"><span className="pixel">STAGE {String(selected).padStart(2,'0')}</span><b>{STAGES[selected-1].name}</b><span className="map-prompt">فروشگاه / ENTER</span></div></section>}

  {view==='shop'&&<section className="stage-shop" aria-label="فروشگاه پیش از مرحله" ref={shopRef} tabIndex={-1}>
   <div className="shop-scanlines"/><header className="shop-header"><button className="secondary-button" onClick={()=>setView('map')}><ArrowRight/> نقشهٔ مراحل</button><div className="shop-wallet"><img src={asset('coin')} alt=""/><span>کیف سکه</span><b className="pixel">{campaign.wallet}</b></div></header>
   <div className="shop-heading"><span className="pixel">SUPPLY STATION / {String(selected).padStart(2,'0')}</span><h1>برای عبور آماده شو.</h1><p>{STAGES[selected-1].name} <span>· خرید اختیاری</span></p></div>
   <div className="shop-items">{(['energy','power'] as const).map(kind=>{const queued=!!campaign.boosts[selected]?.[kind],price=BOOST_PRICES[kind],affordable=campaign.wallet>=price;return <article className={'shop-item '+kind+(queued?' purchased':'')} key={kind}><div className="shop-item-icon">{kind==='energy'?<img src={asset('heart')} alt=""/>:<img src={asset('battery')} alt=""/>}</div><div><span className="pixel">{kind==='energy'?'ENERGY PACK':'POWER CELL'}</span><h2>{kind==='energy'?'انرژی تازه':'قدرت بیشتر'}</h2><p>{kind==='energy'?'قلب‌های کامل و فرم بزرگ؛ یک ضربهٔ محافظ اضافه.':'قدرت همهٔ سلاح‌ها در این مرحله دو برابر می‌شود.'}</p></div><button className="shop-buy" disabled={queued||!affordable} onClick={()=>purchase(kind)}>{queued?<><Check/> خریداری شد</>:<><img src={asset('coin')} alt="سکه"/><b>{fa(price)}</b><span>{affordable?'خرید':'سکه کافی نیست'}</span></>}</button></article>;})}</div>
   <div className="shop-footer"><p className="shop-feedback" role="status">{shopMessage||'خریدها برای همین مرحله ذخیره می‌شوند؛ با بازگشت به نقشه از دست نمی‌روند.'}</p><button className="retro-button" onClick={startStage}><Play/> شروع مرحله</button></div>
   <div className="star-guide"><span><b>★</b> پایان مرحله</span><span><b>★★</b> پایان + همهٔ سکه‌ها و رادیوهای مسیر اصلی</span><span><b>★★★</b> پایان مرحله + پاک‌سازی دخمه</span><small>بهترین رکورد همیشه حفظ می‌شود.</small></div>
  </section>}

  {view==='exit'&&<div className="exit-screen"><span className="pixel red">SIGNAL OFFLINE</span><p>تا ماجراجویی بعدی…</p><button className="retro-button" onClick={()=>{setView('menu');startMusic();}}>بازگشت به منو</button></div>}

  {showSettings&&<Panel title="تنظیمات صدا" close={()=>setShowSettings(false)}><span className="eyebrow english">SETTINGS / AUDIO</span><div className="volume-control"><label htmlFor="sfx">صدای بازی و افکت‌ها <span>{fa(Math.round(volumes.sfx*100))}٪</span></label><input id="sfx" aria-label="میزان صدای بازی" type="range" min="0" max="100" value={Math.round(volumes.sfx*100)} onChange={e=>changeVolume('sfx',Number(e.target.value)/100)} onPointerUp={()=>playSound('coin')}/><div className="volume-limits"><span>بی‌صدا</span><span>بلند</span></div></div><div className="volume-control"><label htmlFor="music">موسیقی پس‌زمینه <span>{fa(Math.round(volumes.music*100))}٪</span></label><input id="music" aria-label="میزان صدای موسیقی" type="range" min="0" max="100" value={Math.round(volumes.music*100)} onChange={e=>changeVolume('music',Number(e.target.value)/100)}/><div className="volume-limits"><span>بی‌صدا</span><span>بلند</span></div></div><div className="music-picker"><label htmlFor="music-track">انتخاب آهنگ</label><select id="music-track" aria-label="انتخاب آهنگ پس‌زمینه" value={musicSelection} onChange={e=>{const index=Number(e.target.value);setMusicSelection(index);setMusicTrack(index);setCurrentTrack(index);}}>{MUSIC_TRACKS.map((track,i)=><option key={track.file} value={i}>{track.title}</option>)}</select><small>پخش پیوسته: آهنگ اول ← آهنگ دوم ← شروع دوباره</small><span className="current-track" aria-live="polite">آهنگ جاری: <b dir="ltr">{MUSIC_TRACKS[currentTrack].title}</b></span></div><div className="settings-info"><Volume2/><span>تنظیمات صدا به‌صورت خودکار ذخیره می‌شود.</span></div><div className="settings-actions"><button className="secondary-button" onClick={fullscreen}><Maximize2/> تمام صفحه</button><button className="secondary-button" onClick={()=>setShowGuide(true)}>راهنمای کنترل</button></div><button className="retro-button" onClick={()=>setShowSettings(false)}>ذخیره و بازگشت <Check/></button></Panel>}

  {showGuide&&<Panel title="راهنمای کنترل" close={()=>setShowGuide(false)}><div className="controls-list">{[['← → / A D','حرکت'],['SPACE / W / ↑','پرش؛ فقط از روی زمین'],['↓ / S','کروچ / ورود به دخمه؛ ↑ بازگشت از خروجی'],['SHIFT / X','دویدن'],['MOUSE / F','نشانه‌گیری و شلیک تیرکمان'],['Q','کنترل ذهنی، یک بار در هر مرحله'],['P / ESC','توقف و ادامه'],['R','شروع دوبارهٔ مرحله']].map(([key,text])=><div key={key}><kbd>{key}</kbd><span>{text}</span></div>)}</div><p className="guide-copy">هر تیر ۱ HP و stomp دو HP کم می‌کند. باتری سبز قهرمان را بزرگ می‌کند. قدرت ذهنی نزدیک‌ترین دشمن در برد را بلند و نابود می‌کند؛ بدون هدف شارژ مصرف نمی‌شود.</p><div className="controller-info"><b>کنترلر استاندارد Xbox / PlayStation</b><p>استیک یا D-pad: حرکت و کروچ · A / ×: پرش · X / □ یا RT / R2: شلیک · Y / △: قدرت ذهنی · B / ○ یا RB / R1: دویدن · Start / Options: توقف. در منوها A تأیید و B بازگشت است.</p></div><button className="retro-button" onClick={()=>setShowGuide(false)}>فهمیدم <Check/></button></Panel>}
 </main></div>;
}
