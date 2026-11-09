import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {buildGallery}=require('./gallery-data.cjs');
const image={id:'result',title:'Pressure field',description:'Pressure contours.',type:'image',src:'/assets/media/schlieren/candle.jpg'};
const fixture=()=>({title:'Gallery',description:'Selected work.',chapters:[{id:'cfd',title:'CFD',items:[structuredClone(image)]}]});
test('unfinished chapters and items do not require media or appear publicly',()=>{
  const config=fixture();
  config.chapters.push({id:'aircraft',draft:true});
  config.chapters[0].items.push({id:'editing',draft:true});
  const gallery=buildGallery(config);
  assert.deepEqual(gallery.chapters.map(chapter=>chapter.id),['cfd']);
  assert.deepEqual(gallery.chapters[0].items.map(item=>item.id),['result']);
  assert.equal(gallery.count,1);
  config.chapters[0].items[0].draft=true;
  assert.equal(buildGallery(config).chapters.length,0);
});
test('chapter and item order are editable and image dimensions come from the asset',()=>{
  const config=fixture();
  config.chapters[0].order=20;
  config.chapters.unshift({id:'schlieren',title:'Schlieren',order:30,items:[{...image,id:'plume'}]});
  config.chapters[1].items.push({...image,id:'first',order:1});
  const gallery=buildGallery(config);
  assert.deepEqual(gallery.chapters.map(chapter=>chapter.id),['cfd','schlieren']);
  assert.equal(gallery.chapters[0].items[0].id,'first');
  assert.equal(gallery.chapters[0].items[0].width,960);
});
test('broken media, duplicate anchors and unsafe embed URLs stop publication',()=>{
  for(const patch of [{src:'/assets/missing.png'},{src:'/assets/../private.jpg'},{embedURL:'https://example.com/embed/x',sourceURL:'https://example.com'}]){
    const config=fixture();Object.assign(config.chapters[0].items[0],patch);
    assert.throws(()=>buildGallery(config),/content\/gallery.json:/);
  }
  const config=fixture();config.chapters[0].items.push({...image});
  assert.throws(()=>buildGallery(config),/unique lowercase ID/);
  delete config.chapters[0].items[0].id;
  assert.throws(()=>buildGallery(config),/unique lowercase ID/);
  const draft=fixture();draft.chapters[0].draft='true';
  assert.throws(()=>buildGallery(draft),/without quotes/);
});
test('hosted video can be published without a local MP4 and keeps its fallback link',()=>{
  const config=fixture();
  config.chapters[0].items=[{id:'flight',title:'Flight simulation',description:'Landing in X-Plane.',type:'video',embedURL:'https://www.youtube-nocookie.com/embed/example',sourceURL:'https://www.youtube.com/watch?v=example',software:'X-Plane'}];
  const item=buildGallery(config).chapters[0].items[0];
  assert.equal(item.src,undefined);
  assert.equal(item.software,'X-Plane');
  delete config.chapters[0].items[0].sourceURL;
  assert.throws(()=>buildGallery(config),/sourceURL/);
});
