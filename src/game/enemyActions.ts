export type EnemyAction={kind:'jump'|'rush';at:number;direction:number;speed:number;launched:boolean};
type Approach={kind:string;now:number;lastAttack:number;grounded:boolean;alerted:boolean;dx:number;dy:number;speed:number};
export function startEnemyAction(a:Approach):EnemyAction|null{
 if(!a.grounded||!a.alerted||Math.abs(a.dy)>90||Math.abs(a.dx)<55||Math.abs(a.dx)>260||a.now-a.lastAttack<2400)return null;
 if(a.kind!=='husk'&&a.kind!=='crawler')return null;
 return {kind:a.kind==='husk'?'jump':'rush',at:a.now,direction:Math.sign(a.dx),speed:a.speed,launched:false};
}
export function actionMotion(a:EnemyAction,now:number,grounded:boolean){
 const t=now-a.at,windup=a.kind==='rush'?300:280,active=a.kind==='rush'?390:720;
 const launch=a.kind==='jump'&&!a.launched&&t>=windup&&grounded;
 const recovery=t>=windup+active||(a.kind==='jump'&&a.launched&&grounded&&t>windup+100);
 return {vx:t<windup||recovery?0:a.direction*(a.kind==='rush'?Math.min(340,a.speed*3.5):Math.min(190,a.speed*2)),launch,vy:-470,
  frame:t<windup?0:recovery?3:a.kind==='jump'?(t<windup+290?1:2):(Math.floor((t-windup)/75)%2+1),
  done:t>=windup+active+320};
}
export const loopFrame=(now:number,row:number,period=145)=>row*4+Math.floor(now/period)%4;
