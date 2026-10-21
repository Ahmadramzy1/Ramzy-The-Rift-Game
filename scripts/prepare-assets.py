"""Lossless alpha extraction of the five user-supplied sheets; no color keying.
Run: python scripts/prepare-assets.py [directory containing the original PNGs]
Frame coordinates are in source pixels, not an assumed regular grid.
"""
from PIL import Image, ImageDraw
from pathlib import Path
import json, shutil, sys

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets'
SOURCE = OUT / 'source'
SOURCE.mkdir(parents=True, exist_ok=True)
incoming = Path(sys.argv[1]) if len(sys.argv) > 1 else SOURCE
names = ['03_38_54 PM-1', '03_38_58 PM-2', '03_39_00 PM-3', '03_39_02 PM-4', '03_39_07 PM-5']
images = []
for i, name in enumerate(names):
    p = next(incoming.glob(f'*{name}.png'), None)
    if p is None:
        p = SOURCE / f'{i+1}.png'
    dest = SOURCE / f'{i+1}.png'
    if p.resolve() != dest.resolve(): shutil.copy2(p, dest)
    images.append(Image.open(dest).convert('RGBA'))

manifest = {'sources': [{'file': f'source/{i+1}.png', 'size': im.size, 'alphaExtrema': im.getchannel('A').getextrema()} for i, im in enumerate(images)], 'frames': {}}

hero = [(12,76,180,365),(187,80,333,365),(334,80,477,365),(473,80,613,365),(606,80,762,365),(780,78,1010,365),(1010,80,1214,365),(1214,80,1444,365),(10,398,205,690),(207,423,376,662),(379,430,609,684),(606,498,769,714),(786,454,983,715),(1005,475,1238,721),(1243,413,1440,714),(25,748,190,1057),(200,705,440,1057),(451,724,691,1057),(694,738,941,1057),(963,723,1220,1014),(1216,758,1448,1057)]

def crop(index, box):
    im = images[index].crop(box)
    b = im.getchannel('A').getbbox()
    if b: im = im.crop(b)
    return im

sheet = Image.new('RGBA', (96*len(hero),112))
for i, box in enumerate(hero):
    im = crop(0,box)
    im = im.resize((round(im.width*.24), round(im.height*.24)), Image.Resampling.NEAREST)
    sheet.alpha_composite(im, (i*96+(96-im.width)//2,104-im.height))
    manifest['frames'][f'hero-{i}'] = {'source': 1, 'bounds': box, 'frame': i, 'size': [96,112], 'anchor': [48,104]}
sheet.save(OUT/'hero.png')
sheet.crop((31,35,68,72)).save(OUT/'avatar.png')

enemy_rows = [(16,38,1445,215),(16,226,1445,461),(16,471,1445,681),(16,685,1445,853),(16,855,1445,1085)]
for row, family in enumerate(['crawler','bloom','bat','slime','husk']):
    atlas = Image.new('RGBA',(128*4,112))
    for col in range(4):
        x0 = [16,340,680,1020][col]
        x1 = [338,680,1020,1445][col]
        box = (x0,enemy_rows[row][1],x1,enemy_rows[row][3])
        im = crop(1,box)
        scale = min(106/im.width,88/im.height)
        im = im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.NEAREST)
        atlas.alpha_composite(im,(col*128+(128-im.width)//2,104-im.height))
        manifest['frames'][f'{family}-{col}']={'source':2,'bounds':box}
    atlas.save(OUT/f'{family}.png')

props = {
 'grass':(19,25,150,160), 'stone':(22,162,151,282),
 'forest':(19,285,149,431),'metal':(20,437,148,566),
 'rift':(17,576,147,714),'floating':(618,30,735,160),
 'metal-platform':(620,441,779,556),'rift-platform':(623,586,761,716),
 'bush':(1120,30,1244,129),'rock':(1248,40,1330,129),
 'barrel':(1020,174,1092,280),'barricade':(1104,188,1246,281),
 'cone':(1260,181,1340,280),'log':(1040,343,1231,428),
 'fence':(974,478,1125,574),'lamp':(18,719,137,956),
 'streetlamp':(138,726,261,954),'pole':(265,726,349,953),
 'wood-fence':(475,851,566,953),'tree':(536,726,687,952),
 'tower':(687,700,822,955),'drain':(821,802,972,957),
 'waterpipe':(962,764,1110,956),'portal':(1110,720,1307,964),
 'sign':(1307,721,1447,957),'radio':(185,975,259,1084),
 'tape':(273,980,401,1071),'battery':(416,970,490,1077),
 'keycard':(495,975,604,1071),'heart':(615,979,710,1070),
 'coin':(716,978,804,1076),'mushroom':(811,969,925,1083),
 'energy':(943,970,1019,1083),'medkit':(1027,979,1137,1074),
 'key':(1142,992,1255,1064),'vial':(1298,965,1380,1085)
}
for name, box in props.items():
    im = crop(2,box)
    im.save(OUT/f'{name}.png')
    manifest['frames'][name] = {'source':3,'bounds':box,'size':im.size}

terrain={}
for name in ['grass','stone','forest','metal','rift']:
    im=Image.open(OUT/f'{name}.png')
    # Generated sheets contain individually outlined rounded blocks. Repeating
    # those blocks introduces transparent seams; extract only the seamless core.
    core=im.crop((round(im.width*.14),0,round(im.width*.86),im.height-4))
    core.save(OUT/f'{name}-tile.png')
    alpha=core.getchannel('A')
    surface=next(y for y in range(core.height) if sum(alpha.getpixel((x,y))>220 for x in range(core.width))>=core.width*.96 and alpha.getpixel((0,y))>220 and alpha.getpixel((core.width-1,y))>220)
    terrain[name]={'surfaceOffset':surface/core.width*64,'height':core.height/core.width*64,'surfaceRow':surface,'sourceWidth':core.width}
    core.crop((0,round(core.height*.48),core.width,core.height)).save(OUT/f'{name}-fill.png')
(OUT/'terrain.json').write_text(json.dumps(terrain,indent=2))

# Crop the empty upper sky out of the user's reference scene. Its foreground/HUD
# are excluded. Rendered separately with parallax and animated cloud overlays.
images[3].crop((400,95,1420,345)).save(OUT/'sky.png')
images[4].save(OUT/'world-map.png')
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')

# Contact sheet for human QA, with a checkerboard to reveal alpha and boundaries.
contact = Image.new('RGB',(960,620),'#192234')
d = ImageDraw.Draw(contact)
for yy in range(0,620,12):
    for xx in range(0,960,12):
        if (xx//12+yy//12)%2: d.rectangle((xx,yy,xx+11,yy+11),fill='#263248')
for i in range(len(hero)):
    im=sheet.crop((i*96,0,(i+1)*96,112))
    x=(i%10)*96; y=(i//10)*132
    contact.paste(im,(x,y),im);d.text((x+4,y+112),str(i),fill='white')
for row,family in enumerate(['crawler','bloom','bat','slime','husk']):
    im=Image.open(OUT/f'{family}.png'); im.thumbnail((384,84))
    x=480*(row%2); y=402+100*(row//2)
    if y+im.height<=620: contact.paste(im,(x,y),im);d.text((x+385,y+30),family,fill='white')
contact.save(ROOT/'docs/contact-sheet.png')
print(json.dumps({'heroFrames':len(hero),'enemyFrames':20,'props':len(props),'alpha':'original preserved','output':str(OUT)}))
