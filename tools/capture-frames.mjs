import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const base=process.env.DAR_CAPTURE_URL||'http://127.0.0.1:3220';
await mkdir('site-assets/construction',{recursive:true});
await mkdir('../../work/scene-captures',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--use-angle=swiftshader']});
try {
  const page=await browser.newPage({viewport:{width:1400,height:1000},deviceScaleFactor:1});
  await page.goto(base+'/tools/scene-capture.html');
  await page.waitForFunction(()=>Boolean(window.scene));
  for(let i=0;i<8;i++) {
    await page.evaluate(index=>window.scene.setStage(index),i);
    await page.waitForTimeout(100);
    await page.screenshot({path:'../../work/scene-captures/stage-'+(i+1)+'.png'});
  }
} finally {await browser.close();}
const result=spawnSync('python',['-c',`from PIL import Image
from pathlib import Path
for i in range(1,9):
 im=Image.open(Path('../../work/scene-captures')/f'stage-{i}.png').convert('RGB')
 for label,width in [('small',640),('medium',1000),('wide',1400)]:
  im.resize((width,round(width*im.height/im.width)),Image.Resampling.LANCZOS).save(Path('site-assets/construction')/f'stage-{i}-{label}.webp',quality=86)
print('Saved all eight same-model stage fallbacks at three responsive sizes.')`],{stdio:'inherit'});
if(result.status)process.exit(result.status);
