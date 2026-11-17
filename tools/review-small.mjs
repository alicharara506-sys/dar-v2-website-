import { chromium } from 'playwright';
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--use-angle=swiftshader']});
const page=await (await browser.newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true})).newPage();
page.on('pageerror',e=>console.log(e.message));
await page.goto('http://127.0.0.1:3220/#stage-interior-finishing');
await page.waitForTimeout(1700);
console.log(await page.locator('#villa-viewport').evaluate(e=>({mode:e.dataset.renderer,width:e.clientWidth,height:e.clientHeight,canvas:e.querySelector('canvas')?.dataset.stage,panel:document.querySelector('#experience-panel').getBoundingClientRect().toJSON(),rail:document.querySelector('.stage-rail').getBoundingClientRect().toJSON()})));
await page.screenshot({path:'../../outputs/DAR Website Preview/Small phone review.png'});
await browser.close();
