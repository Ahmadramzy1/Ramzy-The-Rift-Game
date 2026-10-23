"""Extract generated frames, preserve alpha, normalize scale and ground pivot."""
from PIL import Image
from pathlib import Path
import json,sys
root=Path(__file__).resolve().parents[1]
source=Path(sys.argv[1])
# The generated MF rows have uneven gutters. Equal quarters include the next
# row's tentacle tips; these measured alpha-component bounds isolate each body.
MF_BOXES=[
 (16,19,326,251),(386,1,717,251),(734,18,1072,251),(1101,10,1439,251),
 (16,258,354,523),(381,266,729,523),(740,253,1075,523),(1111,274,1439,523),
 (10,545,355,790),(378,537,730,789),(743,533,1088,791),(1106,542,1444,791),
 (8,811,349,1054),(386,806,731,1054),(744,825,1091,1054),(1112,810,1445,1054),
]
specs=[('mf-living','exec-0bb6ed36-93e8-42d7-89c2-f6a3d10a6655.png',4,256,256,240),('vecna-living','exec-6d4a181b-23f7-423a-a69f-81d36861bf7a.png',4,256,256,240),('husk-jump','exec-bcb2844e-c06c-43aa-83f1-bf33ff4da326.png',1,128,112,104),('crawler-rush','exec-5b995278-0f38-4f2e-a8ee-84435d9192a0.png',1,128,112,104)]
metadata={}
for name,file,rows,cw,ch,baseline in specs:
 im=Image.open(source/file).convert('RGBA');frames=[]
 for row in range(rows):
  for col in range(4):
   cell=MF_BOXES[row*4+col] if name=='mf-living' else (round(col*im.width/4),round(row*im.height/rows),round((col+1)*im.width/4),round((row+1)*im.height/rows))
   tile=im.crop(cell)
   # Ignore near-invisible fringes for stable bounds, retain source alpha inside.
   box=tile.getchannel('A').point(lambda a:255 if a>35 else 0).getbbox()
   assert box, (name,row,col)
   frames.append(tile.crop(box))
 maxw=max(f.width for f in frames);maxh=max(f.height for f in frames)
 scale=min((cw-12)/maxw,(ch-20)/maxh) if rows==4 else min(102/maxw,(78 if name=='husk-jump' else 58)/maxh)
 out=Image.new('RGBA',(cw*4,ch*rows))
 bounds=[]
 for index,f in enumerate(frames):
  f=f.resize((round(f.width*scale),round(f.height*scale)),Image.Resampling.NEAREST)
  x=(index%4)*cw+(cw-f.width)//2;y=(index//4)*ch+baseline-f.height
  out.alpha_composite(f,(x,y));bounds.append([f.width,f.height])
 out.save(root/'public/assets'/f'{name}.png',optimize=True)
 metadata[name]={'frameWidth':cw,'frameHeight':ch,'count':len(frames),'baseline':baseline,'bounds':bounds}
 print(name,out.size,'bounds',bounds,'alpha',out.getchannel('A').getextrema())
(root/'public/assets/living-frames.json').write_text(json.dumps(metadata,indent=2)+'\n')
