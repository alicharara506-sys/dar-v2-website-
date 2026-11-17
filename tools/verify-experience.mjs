import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';
import { stages } from '../src/build-stages.js';
import { serviceRoutes } from '../src/service-pages.js';

const base='http://127.0.0.1:4327';
const shots=process.env.DAR_QA_DIR||'../../outputs/DAR Website Preview';
await mkdir(shots,{recursive:true});
const submissions=[];
const upstream=createServer(async(req,res)=>{const chunks=[];for await(const chunk of req)chunks.push(chunk);const data=JSON.parse(Buffer.concat(chunks));submissions.push(data);const ok=!data.description.includes('reject');res.writeHead(ok?200:503,{'Content-Type':'application/json'});res.end(JSON.stringify({accepted:ok}));});
upstream.listen(0,'127.0.0.1');await once(upstream,'listening');
const server=spawn(process.execPath,['server/start.mjs'],{env:{...process.env,PORT:'4327',HOST:'127.0.0.1',DAR_INQUIRY_URL:'http://127.0.0.1:'+upstream.address().port,DAR_INQUIRY_TOKEN:'browser-test-only'},stdio:['ignore','pipe','inherit']});
await once(server.stdout,'data');
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--use-angle=swiftshader']});
const errors=[], audits=[];
async function page(options={}) {const p=await (await browser.newContext(options)).newPage();p.on('pageerror',e=>errors.push(e.message));return p;}
async function visit(p,path='/'){assert.equal((await p.goto(base+path)).status(),200);await p.locator('html.enhanced').waitFor();await p.evaluate(()=>document.fonts.ready);}
async function overflow(p){assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),p.url()+' overflows');}
async function stage(p,i){await p.locator(`[data-stage-jump="${i}"]`).click();await p.locator(`#experience-panel[data-stage="${stages[i].id}"]`).waitFor();}
async function screenshot(p,name,fullPage=false){await p.screenshot({path:resolve(shots,name+'.png'),fullPage,scale:'css'});}
async function audit(p,name){const r=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();const issues=r.violations.map(x=>({id:x.id,nodes:x.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));audits.push({name,issues});await writeFile(resolve(shots,'accessibility-report.json'),JSON.stringify(audits,null,2));}

try {
 const desktop=await page({viewport:{width:1440,height:900}});
 await visit(desktop);await overflow(desktop);
 const hero=desktop.locator('#hero-scene[data-renderer="webgl"] canvas');
 await hero.waitFor();
 await desktop.locator('#headline strong').evaluate(async element=>{await Promise.all(element.getAnimations().map(animation=>animation.finished));});
 await screenshot(desktop,'Desktop homepage');
 await desktop.keyboard.press('Tab');assert.equal(await desktop.locator('a.skip').evaluate(e=>e===document.activeElement),true);
 await desktop.keyboard.press('Enter');assert.equal(await desktop.evaluate(()=>document.activeElement.id),'main');
 const originalHero=await hero.screenshot();
 const heroBox=await hero.boundingBox();
 await desktop.mouse.move(heroBox.x+heroBox.width*.7,heroBox.y+heroBox.height*.48);
 await desktop.mouse.down();
 await desktop.mouse.move(heroBox.x+heroBox.width*.33,heroBox.y+heroBox.height*.48,{steps:8});
 await desktop.mouse.up();
 assert.notDeepEqual(await hero.screenshot(),originalHero);
 await desktop.evaluate(()=>scrollTo(0,160));
 await desktop.waitForFunction(()=>Number(document.querySelector('.opening').style.getPropertyValue('--opening-progress'))>.1);
 await desktop.evaluate(()=>scrollTo(0,0));
 await desktop.locator('#build').scrollIntoViewIfNeeded();await desktop.locator('#villa-viewport[data-renderer="webgl"]').waitFor();
 for(let i=0;i<8;i++){await stage(desktop,i);await desktop.waitForFunction(index=>document.querySelector('canvas.villa-webgl')?.dataset.stage===String(index),i);if([0,5,7].includes(i))await screenshot(desktop,'Desktop construction '+(i+1));}
 const finishY=await desktop.evaluate(()=>scrollY);
 await desktop.locator('#stage-progress').focus();await desktop.keyboard.press('Home');await desktop.locator('#experience-panel[data-stage="site"]').waitFor();assert.ok(await desktop.evaluate(()=>scrollY)<finishY);
 await desktop.keyboard.press('End');await desktop.locator('#experience-panel[data-stage="handover"]').waitFor();
 await desktop.locator('#still-toggle').click();await desktop.locator('#villa-viewport[data-renderer="still"] #stage-poster[data-frame="7"]').waitFor();await desktop.locator('#stage-poster').evaluate(img=>img.decode());
 await stage(desktop,5);await desktop.locator('#trade-details summary').click();await desktop.locator('[data-detail="marble"]').click();assert.match(await desktop.locator('#pin-description').textContent(),/marble tiles/);await desktop.keyboard.press('Escape');
 await desktop.locator('#rotate-left').evaluate(b=>{if(!b.disabled)b.click();});
 await audit(desktop,'desktop-home');
 await desktop.locator('#services').screenshot({path:resolve(shots,'Services overview.png')});
 await desktop.locator('#atlas-tab-0').focus();await desktop.keyboard.press('ArrowDown');
 assert.equal(await desktop.locator('#atlas-tab-1').getAttribute('aria-selected'),'true');
 assert.equal(await desktop.locator('#atlas-panel-1 a').getAttribute('href'),'/services/finishing/');
 await desktop.locator('#process').screenshot({path:resolve(shots,'Our process.png')});
 await visit(desktop,'/fr/');
 const form=desktop.locator('.inquiry-form');await form.waitFor();await form.getByRole('button').click();await form.locator('#inquiry-name[aria-invalid="true"]').waitFor();assert.equal(await form.locator('[aria-invalid="true"]').count(),5);
 await form.locator('[name="name"]').fill('Test Visitor');await form.locator('[name="reply"]').fill('visitor@example.test');await form.locator('[name="project"]').selectOption('0');await form.locator('[name="location"]').fill('Beirut');await form.locator('[name="description"]').fill('Please reject this synthetic inquiry.');await form.getByRole('button').click();await form.getByText('L’envoi a échoué.',{exact:false}).waitFor();
 await form.locator('[name="description"]').fill('Synthetic local test. No real delivery.');await form.getByRole('button').click();await form.getByText('Votre demande a été reçue.',{exact:false}).waitFor();assert.equal(submissions.at(-1).locale,'fr');
 console.log('Desktop 3D stages, reverse scroll, keyboard, stills, trade details and inquiry passed.');
 await desktop.close();

 const mobile=await page({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
 await visit(mobile);await overflow(mobile);
 await mobile.locator('#hero-scene[data-renderer="webgl"] canvas').waitFor();
 await mobile.locator('#headline em').evaluate(async element=>{await Promise.all(element.getAnimations().map(animation=>animation.finished));});
 await screenshot(mobile,'Mobile homepage');
 await stage(mobile,7);await mobile.locator('#villa-viewport[data-renderer="webgl"]').waitFor();await screenshot(mobile,'Mobile construction');
 const box=await mobile.locator('#villa-viewport').boundingBox();const x=Math.round(box.x+box.width/2),y=Math.round(box.y+box.height*.75);const initial=await mobile.evaluate(()=>scrollY);const cdp=await mobile.context().newCDPSession(mobile);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x,y:y-70}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x,y:y-150}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await mobile.waitForFunction(start=>scrollY>start+5,initial);
 await mobile.locator('.mobile-menu summary').click();await mobile.locator('.mobile-menu a[href="#services"]').click();assert.equal(await mobile.locator('.mobile-menu').getAttribute('open'),null);
 for(const [w,h] of [[320,568],[768,1024],[844,390]]){await mobile.setViewportSize({width:w,height:h});await visit(mobile);await overflow(mobile);await stage(mobile,5);await overflow(mobile);await screenshot(mobile,'Layout '+w+'x'+h);}
 await mobile.close();console.log('Mobile touch scrolling, navigation, portrait and landscape passed.');

 const reduced=await page({viewport:{width:320,height:568},reducedMotion:'reduce',isMobile:true,hasTouch:true});
 await visit(reduced,'/ar/#stage-interior-finishing:lighting');await reduced.locator('#experience-panel[data-stage="interior-finishing"]').waitFor();await overflow(reduced);assert.equal(await reduced.locator('canvas').count(),0);assert.equal(await reduced.locator('html').getAttribute('dir'),'rtl');await audit(reduced,'320px-arabic-home');await screenshot(reduced,'Arabic mobile construction');
 await reduced.locator('#trade-details summary').click();await reduced.locator('#stage-progress').focus();const before=await reduced.evaluate(()=>scrollY);await reduced.keyboard.press('End');await reduced.locator('#experience-panel[data-stage="handover"]').waitFor();assert.equal(await reduced.evaluate(()=>scrollY),before);
 await reduced.close();console.log('Reduced motion, Arabic RTL and 320px stage controls passed.');

 const services=await page({viewport:{width:1280,height:900},reducedMotion:'reduce'});
 for(const route of serviceRoutes()) {await visit(services,route.path);assert.equal(await services.locator('h1').count(),1);assert.equal(await services.locator('.service-faq details').count(),3);await services.locator('.service-faq summary').first().click();assert.ok(await services.locator('.service-faq details').first().getAttribute('open')!==null);await overflow(services);await services.setViewportSize({width:320,height:568});await overflow(services);await services.setViewportSize({width:1280,height:900});}
 await visit(services,'/services/finishing/');await screenshot(services,'Finishing service desktop');await audit(services,'service-desktop');
 await services.setViewportSize({width:390,height:844});await screenshot(services,'Finishing service mobile');
 await visit(services,'/ar/services/finishing/');await audit(services,'service-arabic-mobile');await services.locator('.language summary').click();await services.locator('[lang="fr"][data-locale]').click();await services.waitForURL('**/fr/services/finishing/');
 await services.close();console.log('All 15 service routes, FAQs, mobile layouts and locale links passed.');

 const fallback=await page({viewport:{width:390,height:844}});await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.includes('webgl')?null:original.call(this,type,...args);};});
 await visit(fallback);await fallback.locator('.hero-fallback img').evaluate(img=>img.decode());assert.equal(await fallback.locator('#hero-scene[data-renderer="webgl"]').count(),0);await stage(fallback,7);await fallback.locator('#villa-viewport[data-renderer="still"] #stage-poster[data-frame="7"]').waitFor();await fallback.locator('#stage-poster').evaluate(img=>img.decode());await fallback.close();
 const nojs=await browser.newPage({javaScriptEnabled:false});assert.equal((await nojs.goto(base+'/ar/')).status(),200);await nojs.locator('#stage-poster').evaluate(img=>img.decode());assert.equal(await nojs.locator('#services .service-row').count(),5);assert.equal(await nojs.locator('.contact-grid a[href^="mailto:"]').count(),1);await nojs.close();
 console.log('WebGL failure fallback and content without JavaScript passed.');
 await writeFile(resolve(shots,'accessibility-report.json'),JSON.stringify(audits,null,2));
 assert.deepEqual(errors,[]);assert.deepEqual(audits.flatMap(a=>a.issues.map(i=>({page:a.name,...i}))),[]);
 console.log('All browser checks passed, including four accessibility audits.');
} finally {await browser.close();server.kill();upstream.close();}
