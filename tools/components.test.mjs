import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import vm from 'node:vm';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const {buildComponent,listAssets,importComponentAsset,plotFromCSV,validatePlot}=require('./studio/components.cjs');
const digest=bytes=>require('node:crypto').createHash('sha256').update(bytes).digest('hex');
test('component builders preserve file paths, options, captions and safe labels',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'studio-components-'));try{
  fs.mkdirSync(path.join(root,'assets'));for(const name of ['model.stl','field.vtp','one.png','two.png'])fs.writeFileSync(path.join(root,'assets',name),'fixture');
  fs.mkdirSync(path.join(root,'content/data'),{recursive:true});fs.writeFileSync(path.join(root,'content/data/plot.json'),JSON.stringify({data:[{x:[0,1],y:[2,3]}]}));
  const model=buildComponent(root,{kind:'model',source:'/assets/model.stl',title:'Airframe "test"',poster:'/assets/one.png',rotate:false,color:'#123abc'});assert.match(model,/stl-reader/);assert.match(model,/auto-rotate="false"/);assert.match(model,/&quot;test&quot;/);assert.match(model,/poster="\/assets\/one.png"/);
  const field=buildComponent(root,{kind:'field',source:'/assets/field.vtp',title:'Pressure',field:'p',clipping:false,threshold:true});assert.match(field,/field="p"/);assert.match(field,/clipping="false"/);
  const carousel=buildComponent(root,{kind:'carousel',title:'Results',slides:[{source:'/assets/two.png',caption:'Second & last'},{source:'/assets/one.png',caption:'<First>'}],autoplay:false});assert.ok(carousel.indexOf('two.png')<carousel.indexOf('one.png'));assert.match(carousel,/&lt;First&gt;/);assert.match(carousel,/autoplay="false"/);
  assert.match(buildComponent(root,{kind:'plot',title:'Curve',source:'/content/data/plot.json'}),/plotly-chart/);
  for(const bad of ['/assets/../secret.stl','https://evil.test/model.stl','/assets/missing.stl'])assert.throws(()=>buildComponent(root,{kind:'model',title:'Model',source:bad}));
  assert.throws(()=>buildComponent(root,{kind:'carousel',title:'Images',slides:[{source:'/assets/one.png',caption:''},{source:'/assets/two.png',caption:'B'}]}),/caption/);
  assert.equal(listAssets(root,'model').length,1);assert.equal(listAssets(root,'plot').length,1);assert.throws(()=>listAssets(root,'secret'));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('component imports accept supported scientific files and retain plot precision',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'studio-component-import-'));try{
  const stl=Buffer.alloc(134);stl.writeUInt32LE(1,80);const result=importComponentAsset(root,{name:'my shape.stl',base64:stl.toString('base64')},digest);assert.ok(fs.readFileSync(path.join(root,result.path)).equals(stl));
  assert.throws(()=>importComponentAsset(root,{name:'fake.stl',base64:Buffer.from('bad').toString('base64')},digest));
  assert.throws(()=>importComponentAsset(root,{name:'file.vtu',base64:'AA=='},digest));
  const vtp=Buffer.from('<VTKFile type="PolyData"><PolyData/></VTKFile>');assert.equal(importComponentAsset(root,{name:'field.vtp',base64:vtp.toString('base64')},digest).kind,'field');
  const data=plotFromCSV({text:'time_s,Cp\n0,1.81948410489933\n1,-0.015',x:'time_s',y:'Cp',title:'Pressure',style:'lines'});assert.equal(data.data[0].y[0],1.81948410489933);assert.equal(data.layout.yaxis.title.text,'Cp');
  const bars=plotFromCSV({text:'case,value\nA,1\nB,2',x:'case',y:'value',style:'bar'});assert.deepEqual(bars.data[0].x,['A','B']);assert.equal(validatePlot(bars),2);assert.throws(()=>validatePlot({data:[{type:'scatter',x:[1],y:['bad']}]}));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('manual carousels do not start an autoplay timer',()=>{
 let ctor,timers=0;const source=fs.readFileSync(new URL('../js/hero-carousel.js',import.meta.url),'utf8');
 vm.runInNewContext(source,{HTMLElement:class{},customElements:{define:(_name,c)=>ctor=c},setInterval:()=>{timers++;return 1;},document:{activeElement:null}});
 const view={getAttribute:()=> 'false',contains:()=>false};ctor.prototype._startAutoplay.call(view);assert.equal(timers,0);
});
