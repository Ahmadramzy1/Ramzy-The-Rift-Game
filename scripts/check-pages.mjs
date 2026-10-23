import {readFile,access,readdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const base='/Ramzy-The-Rift-Game/';
const root=path.resolve('dist');
const html=await readFile(path.join(root,'index.html'),'utf8');
assert(html.includes(base+'assets/'),'Entry point must use the repository path');
const refs=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1]);
for(const file of await readdir(path.join(root,'assets'))){
 if(!file.endsWith('.css'))continue;
 const css=await readFile(path.join(root,'assets',file),'utf8');
 refs.push(...[...css.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(m=>m[1]));
}
for(const ref of refs){
 if(/^(data:|https?:)/.test(ref))continue;
 assert(ref.startsWith(base),'Asset escapes the Pages repository path: '+ref);
 await access(path.join(root,ref.slice(base.length)));
}
for(const file of ['assets/hero.png','assets/crawler.png','assets/upgrade-atlas.png','assets/held-weapons.png','assets/mind-flayer.png','assets/psychic-shockwave.png','assets/billy-wheelchair.png','assets/vecna.png','assets/terrain.json','assets/world-map.png','assets/main-menu.png','assets/game-over-title.png','assets/eleven-s5.png','audio/going-under-remastered.mp3','audio/8bit-stranger-things.mp3','video/final-life.mp4','video/main-menu.mp4'])await access(path.join(root,file));
for(let id=1;id<=10;id++)await access(path.join(root,'assets/environments/stage-'+String(id).padStart(2,'0')+'.png'));
await access(path.join(root,'assets/vecna-impact.png'));
for(const key of ['mf-phases','mf-arm','vecna-stances','boss-devices','vecna-airwave','boss-cores'])await access(path.join(root,'assets',key+'.png'));
console.log('Pages entry, fonts, sprites, ten paired environment atlases, soundtrack and cinematic verified.');
