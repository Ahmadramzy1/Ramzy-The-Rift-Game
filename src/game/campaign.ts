import {updates} from './bridge';
import {readProgress} from './mechanics';

export type BoostKind='energy'|'power';
export type StageBoosts={energy:boolean;power:boolean};
export type Campaign={version:1;wallet:number;stars:Record<number,number>;boosts:Record<number,StageBoosts>};
export const CAMPAIGN_KEY='ramzy-campaign-v1';
export const BOOST_PRICES:Readonly<Record<BoostKind,number>>={energy:30,power:45};
const emptyBoosts=():StageBoosts=>({energy:false,power:false});
const validStage=(stage:number)=>Number.isInteger(stage)&&stage>=1&&stage<=10;
const whole=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.floor(value)):0;
export function readCampaign(raw:string|null,legacy:string|null=null):Campaign{
 let parsed:Partial<Campaign>={};try{parsed=JSON.parse(raw||'{}')||{};}catch{/* Recover defaults. */}
 const result:Campaign={version:1,wallet:whole(parsed.wallet),stars:{},boosts:{}};
 for(let stage=1;stage<=10;stage++){
  const stars=whole(parsed.stars?.[stage]);if(stars)result.stars[stage]=Math.min(3,stars);
  const boost=parsed.boosts?.[stage];if(boost)result.boosts[stage]={energy:boost.energy===true,power:boost.power===true};
 }
 for(const stage of readProgress(legacy))result.stars[stage]=Math.max(1,result.stars[stage]||0);
 return result;
}
export function purchaseBoost(campaign:Campaign,stage:number,kind:BoostKind):Campaign{
 if(!validStage(stage)||!Object.hasOwn(BOOST_PRICES,kind)||campaign.boosts[stage]?.[kind]||campaign.wallet<BOOST_PRICES[kind])return campaign;
 return {...campaign,wallet:campaign.wallet-BOOST_PRICES[kind],boosts:{...campaign.boosts,[stage]:{...emptyBoosts(),...campaign.boosts[stage],[kind]:true}}};
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
 const campaign=loadCampaign();return save({...campaign,wallet:Math.min(Number.MAX_SAFE_INTEGER,campaign.wallet+whole(amount))});
}
export function buyBoost(stage:number,kind:BoostKind):boolean{
 const campaign=loadCampaign(),next=purchaseBoost(campaign,stage,kind);if(next===campaign)return false;save(next);return true;
}
export function takeStageBoosts(stage:number):StageBoosts{
 const campaign=loadCampaign(),boosts={...emptyBoosts(),...campaign.boosts[stage]};
 if(validStage(stage)&&campaign.boosts[stage]){const pending={...campaign.boosts};delete pending[stage];save({...campaign,boosts:pending});}
 return boosts;
}
export function recordStageResult(stage:number,result:{allCollectibles:boolean;dungeonCleared:boolean}):Campaign{
 return save(recordResult(loadCampaign(),stage,result));
}
