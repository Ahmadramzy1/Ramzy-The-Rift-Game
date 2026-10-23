import {updates} from './bridge';
import {readProgress} from './mechanics';

export type ShopItem='extraLife'|'ability'|'doubleJump'|'slingshot'|'legendarySword';
export type StageLoadout={extraLife:boolean;extraCharges:number};
export type Campaign={version:2;wallet:number;stars:Record<number,number>;pending:Record<number,StageLoadout>;doubleJump:boolean;slingshotLevel:1|2|3;swordLevel:1|2};
export const CAMPAIGN_KEY='ramzy-campaign-v1';
const emptyLoadout=():StageLoadout=>({extraLife:false,extraCharges:0});
const validStage=(stage:number)=>Number.isInteger(stage)&&stage>=1&&stage<=10;
const whole=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?Math.min(Number.MAX_SAFE_INTEGER,Math.max(0,Math.floor(value))):0;
export function readCampaign(raw:string|null,legacy:string|null=null):Campaign{
 let parsed:Record<string,any>={};try{const value:unknown=JSON.parse(raw||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))parsed=value;}catch{/* Recover defaults. */}
 const result:Campaign={version:2,wallet:whole(parsed.wallet),stars:{},pending:{},doubleJump:parsed.doubleJump===true,slingshotLevel:parsed.slingshotLevel===3?3:parsed.slingshotLevel===2?2:1,swordLevel:parsed.swordLevel===2?2:1};
 for(let stage=1;stage<=10;stage++){
  const stars=whole(parsed.stars?.[stage]);if(stars)result.stars[stage]=Math.min(3,stars);
  const pending=parsed.pending?.[stage];if(pending)result.pending[stage]={extraLife:pending.extraLife===true,extraCharges:whole(pending.extraCharges)};
  // Replaced supplies are refunded once: writing version 2 removes the old boosts.
  if(parsed.version!==2){const boost=parsed.boosts?.[stage];result.wallet=whole(result.wallet+(boost?.energy===true?30:0)+(boost?.power===true?45:0));}
 }
 for(const stage of readProgress(legacy))result.stars[stage]=Math.max(1,result.stars[stage]||0);
 return result;
}
export function itemPrice(campaign:Campaign,kind:ShopItem):number|null{
 switch(kind){case 'extraLife':return 100;case 'ability':return 50;case 'doubleJump':return campaign.doubleJump?null:60;case 'slingshot':return campaign.slingshotLevel===1?100:campaign.slingshotLevel===2?400:null;case 'legendarySword':return campaign.swordLevel===2?null:600;default:return null;}
}
export function purchaseItem(campaign:Campaign,stage:number,kind:ShopItem):Campaign{
 const price=itemPrice(campaign,kind);
 if(!validStage(stage)||price===null||campaign.wallet<price||(kind==='extraLife'&&campaign.pending[stage]?.extraLife))return campaign;
 const next={...campaign,wallet:campaign.wallet-price};
 if(kind==='extraLife'||kind==='ability'){
  const loadout={...emptyLoadout(),...campaign.pending[stage]};
  if(kind==='extraLife')loadout.extraLife=true;else loadout.extraCharges=whole(loadout.extraCharges+1);
  return {...next,pending:{...campaign.pending,[stage]:loadout}};
 }
 if(kind==='doubleJump')return {...next,doubleJump:true};
 if(kind==='slingshot')return {...next,slingshotLevel:campaign.slingshotLevel===1?2:3};
 return {...next,swordLevel:2};
}
export function recordResult(campaign:Campaign,stage:number,result:{allCollectibles:boolean;dungeonCleared:boolean}):Campaign{
 if(!validStage(stage))return campaign;
 const stars=result.dungeonCleared?3:result.allCollectibles?2:1;
 return {...campaign,stars:{...campaign.stars,[stage]:Math.max(campaign.stars[stage]||0,stars)}};
}
let session:Campaign|undefined;
export function loadCampaign():Campaign{
 try{session=readCampaign(localStorage.getItem(CAMPAIGN_KEY),localStorage.getItem('ramzy-v2-progress'));localStorage.setItem(CAMPAIGN_KEY,JSON.stringify(session));}catch{session??=readCampaign(null);}
 return session;
}
function save(campaign:Campaign):Campaign{
 session=campaign;try{localStorage.setItem(CAMPAIGN_KEY,JSON.stringify(campaign));}catch{/* Continue with session state. */}
 updates.dispatchEvent(new Event('campaign'));return campaign;
}
export function awardCoin(amount=1):Campaign{
 const campaign=loadCampaign();return save({...campaign,wallet:whole(campaign.wallet+whole(amount))});
}
export function buyItem(stage:number,kind:ShopItem):boolean{
 const campaign=loadCampaign(),next=purchaseItem(campaign,stage,kind);if(next===campaign)return false;save(next);return true;
}
export function takeStageLoadout(stage:number):StageLoadout{
 const campaign=loadCampaign(),loadout={...emptyLoadout(),...campaign.pending[stage]};
 if(validStage(stage)&&campaign.pending[stage]){const pending={...campaign.pending};delete pending[stage];save({...campaign,pending});}
 return loadout;
}
export function recordStageResult(stage:number,result:{allCollectibles:boolean;dungeonCleared:boolean}):Campaign{
 return save(recordResult(loadCampaign(),stage,result));
}
