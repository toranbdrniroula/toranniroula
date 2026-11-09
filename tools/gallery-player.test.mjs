import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync(new URL('../js/media-gallery.js',import.meta.url),'utf8');
test('YouTube iframe stays unloaded until Play is clicked',()=>{
 let click,options;
 const image={hidden:false};const frame={hidden:true,dataset:{src:'https://www.youtube-nocookie.com/embed/UnUm3-zRUx4'}};
 const button={hidden:true,parentElement:{querySelector:selector=>selector==='iframe'?frame:image},addEventListener:(type,fn,opts)=>{click=fn;options=opts;}};
 const document={getElementById:()=>null,querySelectorAll:selector=>selector==='.gallery-video-play'?[button]:[]};
 vm.runInNewContext(source,{document,location:{hash:''},URL});
 assert.equal(frame.src,undefined);assert.equal(button.hidden,false);
 click();assert.equal(frame.hidden,false);assert.equal(button.hidden,true);assert.equal(image.hidden,true);
 const url=new URL(frame.src);assert.equal(url.hostname,'www.youtube-nocookie.com');assert.equal(url.searchParams.get('autoplay'),'1');assert.equal(options.once,true);
});
test('old gallery hash links resolve to their current chapter page',()=>{
 let destination;
 const document={getElementById:()=>({textContent:JSON.stringify({clip:'/gallery/flow/page/2/#clip'})}),querySelectorAll:()=>[]};
 vm.runInNewContext(source,{document,location:{hash:'#clip',replace:url=>{destination=url;}},URL});
 assert.equal(destination,'/gallery/flow/page/2/#clip');
});
