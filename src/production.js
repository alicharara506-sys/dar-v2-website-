import './production.css';
import './design.css';
import './motion.css';
import './service-atlas.css';
import { content, localeFromPath } from './content.js';
import { mountInquiry } from './inquiry-form.js';
import { mountExperience } from './experience.js';
import { mountServiceAtlas } from './service-atlas-client.js';
import { mountOpening } from './opening-motion.js';

const locale=localeFromPath(location.pathname);
document.documentElement.classList.add('enhanced');
mountExperience();
mountOpening();
mountServiceAtlas();
const inquiry=document.querySelector('#inquiry');
if(inquiry) void mountInquiry(inquiry,locale,content[locale].form);
const menus=[.../** @type {NodeListOf<HTMLDetailsElement>} */(document.querySelectorAll('.header details'))];
for(const menu of menus) menu.addEventListener('toggle',()=>{if(menu.open)for(const other of menus)if(other!==menu)other.open=false;});
document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;for(const menu of menus)if(menu.open){menu.open=false;menu.querySelector('summary').focus();}});
document.addEventListener('click',event=>{if(!(event.target instanceof Element))return;for(const menu of menus)if(!menu.contains(event.target)||event.target.closest('a'))menu.open=false;});
let queued=false;
function progress(){queued=false;const distance=document.documentElement.scrollHeight-innerHeight;document.documentElement.style.setProperty('--page-progress',String(distance>0?scrollY/distance:0));}
window.addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(progress);}},{passive:true});
progress();

const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
const reveal=new IntersectionObserver(entries=>{
  for(const entry of entries){
    if(!entry.isIntersecting)continue;
    if(!motionPreference.matches)entry.target.animate([{opacity:0,transform:'translateY(22px)'},{opacity:1,transform:'translateY(0)'}],{duration:850,easing:'cubic-bezier(.22,.61,.36,1)'});
    reveal.unobserve(entry.target);
  }
},{threshold:0.12});
document.querySelectorAll('.intro-inner > div:not(.intro-datum),.section-heading,.material-copy,.story-intro,.partner,.scope-list article').forEach(element=>reveal.observe(element));
