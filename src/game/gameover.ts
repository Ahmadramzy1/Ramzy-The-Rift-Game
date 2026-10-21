export type GameOverPhase='burst'|'black'|'video'|'title-black'|'title'|'leave'|'done';
export const shouldPlayGameOver=(status:string,lives:number)=>status==='gameover'&&lives===0;
export function gameOverDelay(phase:GameOverPhase){return ({burst:900,black:550,'title-black':300,title:3600,leave:800} as Partial<Record<GameOverPhase,number>>)[phase];}
export function gameOverTransition(phase:GameOverPhase,event:'timer'|'ended'|'error'):GameOverPhase{
 if(phase==='video')return event==='ended'||event==='error'?'title-black':'video';
 if(event!=='timer')return phase;
 return ({burst:'black',black:'video','title-black':'title',title:'leave',leave:'done'} as Partial<Record<GameOverPhase,GameOverPhase>>)[phase]??phase;
}
