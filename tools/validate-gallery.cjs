const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');const {load}=require('cheerio');
const {readGallery}=require('./gallery-data.cjs');const {buildGalleryPages}=require('./gallery-pages.cjs');
const ROOT=path.resolve(__dirname,'..');
function validateGallery({output,common}){
 const gallery=readGallery();const pages=buildGalleryPages(gallery);
 const site=JSON.parse(fs.readFileSync(path.join(ROOT,'content/site.json'),'utf8'));
 for(const data of pages){
  const file=path.join(output,data.permalink.endsWith('/')?data.permalink+'index.html':data.permalink);
  const page=load(fs.readFileSync(file,'utf8'));
  common(page,data.title,new URL(data.permalink,site.site_url).href);
  assert.equal(page('nav[aria-label="Site navigation"] a[aria-current="page"]').text(),'Gallery');
  if(data.kind==='overview'){
   assert.equal(page('video,iframe').length,0,'Gallery index must not load video players');
   assert.deepEqual(page('.gallery-collection').map((_,el)=>page(el).attr('href')).get(),data.chapters.map(chapter=>chapter.href));
   assert.deepEqual(JSON.parse(page('#gallery-route-map').text()),data.anchorRoutes);
  }else{
   assert.equal(page('.gallery-card').length,data.chapter.items.length);
   assert(data.chapter.items.length<=(gallery.pageSize||12));
   for(const item of data.chapter.items){
    const card=page('#'+item.id);assert.equal(card.find('h2').text(),item.title);
    if(item.type==='gif'){
     assert.equal(card.find('img').attr('data-gif'),item.mediaSrcURL);
     assert(card.find('button[hidden]').length);
     assert(card.find('a').toArray().some(el=>page(el).attr('href')===item.mediaSrcURL));
    }
    if(item.type==='video'&&item.src){
     assert.equal(card.find('video').attr('preload'),'none');
     assert.equal(card.find('source').attr('src'),item.mediaSrcURL);
     assert.equal(card.find('video[autoplay]').length,0);
    }
    if(item.embedURL){
     assert.equal(card.find('iframe').attr('data-src'),item.embedURL);
     assert.equal(card.find('iframe').attr('src'),undefined,'Hosted player must wait for interaction');
     assert(card.find('a').toArray().some(el=>page(el).attr('href')===item.sourceURL));
     if(!item.src)assert(card.find('.gallery-video-play[hidden]').length);
    }
    if(item.calibrationImage)assert.equal(card.find('.gallery-calibration').attr('href'),item.calibrationURL);
    if(item.comparisonSide==='left')assert.equal(card.next().attr('id'),data.chapter.items.find(other=>other.comparison===item.comparison&&other.comparisonSide==='right').id,'Comparison split across pages');
   }
   if(data.previous)assert.equal(page('[rel="prev"]').attr('href'),data.previous);
   if(data.next)assert.equal(page('[rel="next"]').attr('href'),data.next);
  }
 }
 const raw=JSON.parse(fs.readFileSync(path.join(ROOT,'content/gallery.json'),'utf8'));
 for(const chapter of raw.chapters.filter(chapter=>chapter.draft))assert(!fs.existsSync(path.join(output,'gallery',chapter.id)),'Draft chapter was published');
 const sitemap=fs.readFileSync(path.join(output,'sitemap.xml'),'utf8');
 for(const page of pages)assert(sitemap.includes(page.permalink));
 console.log(`Validated gallery overview and ${pages.length-1} chapter pages: pagination, comparisons, media and deferred YouTube players.`);
}
module.exports={validateGallery};
