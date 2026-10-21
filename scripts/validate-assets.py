from PIL import Image
from pathlib import Path
import json
p=Path(__file__).resolve().parents[1]/'public/assets'
hero=Image.open(p/'hero.png')
assert hero.mode=='RGBA' and hero.size==(2016,112)
for i in range(21):
    frame=hero.crop((i*96,0,(i+1)*96,112))
    box=frame.getchannel('A').getbbox()
    assert box and box[3]<=104, f'Invalid or unanchored hero frame {i}'
    assert frame.getpixel((0,0))[3]==0
for kind in ['crawler','bloom','bat','slime','husk']:
    im=Image.open(p/f'{kind}.png')
    assert im.mode=='RGBA' and im.size==(512,112)
    for i in range(4): assert im.crop((i*128,0,(i+1)*128,112)).getchannel('A').getbbox()
terrain=json.loads((p/'terrain.json').read_text())
for kind,meta in terrain.items():
    im=Image.open(p/f'{kind}-tile.png')
    row=meta['surfaceRow']
    assert sum(im.getpixel((x,row))[3]>220 for x in range(im.width))>=im.width*.96
    assert im.getpixel((0,row))[3]>220 and im.getpixel((im.width-1,row))[3]>220, f'Terrain seam {kind}'
    assert abs(row/im.width*64-meta['surfaceOffset'])<.001
for name in ['barricade','streetlamp','tree','fence','portal']:
    im=Image.open(p/f'{name}.png')
    assert im.getchannel('A').getbbox()[3]==im.height, f'Floating prop alpha padding {name}'
assert Image.open(p/'eleven-s5.png').mode=='RGBA'
print('PASS: 21 anchored hero frames, 20 enemy frames, 5 seamless terrain surfaces, grounded prop alpha, transparent Eleven S5.')
