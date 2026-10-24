import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../js/responsive-header.js',import.meta.url),'utf8');
function fixture({mobile=true,hero=true}={}) {
  const classes=new Set(), events={}, headerEvents={}, documentEvents={}, timers=new Map();
  let timerId=0, menu=false, keyboard=false, observe;
  const bounds={top:150,bottom:240};
  const identity={setAttribute(key,value){this[key]=value;}};
  const header={querySelector(selector){return selector==='.identity'?identity:keyboard?{}:null;},getBoundingClientRect(){return {height:80};},addEventListener(type,fn){headerEvents[type]=fn;}};
  const toggle={getAttribute(){return String(menu);}};
  const viewport={matches:mobile};
  const window={scrollY:0,innerHeight:800,addEventListener(type,fn){events[type]=fn;}};
  const document={body:{classList:{add(value){classes.add(value);},remove(value){classes.delete(value);},toggle(value,on){on?classes.add(value):classes.delete(value);}}},
    querySelector(selector){return selector==='.top-strip'?header:hero?{getBoundingClientRect(){return bounds;}}:null;},getElementById(){return toggle;},addEventListener(type,fn){documentEvents[type]=fn;}};
  vm.runInNewContext(source,{window,document,matchMedia:()=>viewport,requestAnimationFrame:fn=>fn(),
    setTimeout(fn){const id=++timerId;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);},
    MutationObserver:class {constructor(fn){observe=fn;}observe(){}}});
  return {classes,identity,bounds,
    scroll(y){window.scrollY=y;events.scroll();},idle(){const pending=[...timers.values()];timers.clear();pending.forEach(fn=>fn());},
    menu(open){menu=open;observe();},focus(on){keyboard=on;headerEvents[on?'focusin':'focusout']();},
    resize(isMobile){viewport.matches=isMobile;events.resize();}};
}
test('hero identity hands off to the header on mobile, tablet and desktop',()=>{
  const page=fixture();
  assert.equal(page.identity['aria-hidden'],'true');
  page.bounds.top=-150;page.bounds.bottom=50;page.scroll(300);
  assert.equal(page.identity['aria-hidden'],'false');
  page.bounds.top=150;page.bounds.bottom=240;page.scroll(0);
  assert.equal(page.identity['aria-hidden'],'true');
  page.resize(false);
  assert.equal(page.identity['aria-hidden'],'true');
});
test('mobile header rests when idle, but stays reachable during menu use or keyboard focus',()=>{
  const page=fixture();
  page.scroll(200);assert(!page.classes.has('header-idle'));
  page.idle();assert(page.classes.has('header-idle'));
  page.scroll(210);assert(!page.classes.has('header-idle'));
  page.menu(true);page.idle();assert(!page.classes.has('header-idle'));
  assert(page.classes.has('mobile-menu-open'));
  page.menu(false);page.idle();assert(page.classes.has('header-idle'));
  page.focus(true);page.idle();assert(!page.classes.has('header-idle'));
  page.focus(false);page.idle();assert(page.classes.has('header-idle'));
  page.scroll(0);page.idle();assert(!page.classes.has('header-idle'));
});
test('other pages retain their identity, and wider screens never auto-hide the header',()=>{
  const page=fixture({mobile:false,hero:false});
  assert.equal(page.identity['aria-hidden'],'false');
  page.scroll(300);page.idle();assert(!page.classes.has('header-idle'));
});
