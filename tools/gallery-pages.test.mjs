import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const {paginateChapter,buildGalleryPages}=require('./gallery-pages.cjs');
test('pagination keeps comparison pairs together and respects page size',()=>{
 const items=Array.from({length:11},(_,index)=>({id:'item-'+index}));
 items.push({id:'left',comparisonSide:'left',comparison:'pair'},{id:'right',comparisonSide:'right',comparison:'pair'});
 const pages=paginateChapter(items,12);
 assert.deepEqual(pages.map(page=>page.length),[11,2]);
 assert.deepEqual(pages[1].map(item=>item.id),['left','right']);
 assert.deepEqual(pages.flat().map(item=>item.id),items.map(item=>item.id));
});
test('legacy media anchors point to the exact paginated chapter route',()=>{
 const gallery={title:'Gallery',description:'Work.',pageSize:2,chapters:[{id:'flow',title:'Flow',description:'Experiments.',items:[{id:'first'},{id:'second'},{id:'third'}],count:3}]};
 const pages=buildGalleryPages(gallery);
 assert.equal(pages[0].anchorRoutes.third,'/gallery/flow/page/2/#third');
 assert.equal(pages[1].next,'/gallery/flow/page/2/');
 assert.equal(pages[2].previous,'/gallery/flow/');
 assert.equal(pages[0].anchorRoutes.flow,'/gallery/flow/');
});
