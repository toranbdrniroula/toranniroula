import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {parseArticle,readArticles}=createRequire(import.meta.url)('./content.cjs');
test('a single Markdown file supplies metadata, slug and safe defaults',()=>{
  const article=parseArticle('---\n{"title":"An article","date":"2026-10-24","draft":true}\n---\n\nProse','writing','an-article.md');
  assert.equal(article.slug,'an-article');
  assert.equal(article.title,'An article');
  assert.equal(article.draft,true);
  assert.deepEqual(article.links,[]);
  assert.throws(()=>parseArticle('No header','work','a.md'),/settings block/);
  assert.throws(()=>parseArticle('---\n{"title":"Bad",}\n---\n','work','bad.md'),/bad.md: invalid page settings/);
  assert.throws(()=>parseArticle('---\n{"title":"Bad","date":"2026","draft":"false"}\n---\n','work','bad.md'),/without quotes/);
});
test('drafts are excluded from published collections without deleting their files',()=>{
  for(const kind of ['work','writing']) {
    const all=readArticles(kind,{includeDrafts:true});
    assert.deepEqual(readArticles(kind).map(item=>item.slug),all.filter(item=>!item.draft).map(item=>item.slug));
  }
});

test('hypersonics projects have separate content, reports and code downloads',async()=>{
 const fs=await import('node:fs');const path=await import('node:path');const {ROOT}=createRequire(import.meta.url)('./content.cjs');
 const expected={
  'flow-around-cylinder':{viewers:['cylinder.vtp'],code:'cp_dist.py'},
  'shock-shock-interactions':{viewers:['typeI.vtp','typeII.vtp'],code:'shockPolar.py'},
  'scramjet-intake':{viewers:['intake.vtp'],code:'intake.py'}
 };
 const published=readArticles('work');assert.ok(!published.some(item=>item.slug==='hypersonics-advanced-propulsion'));
 for(const [slug,settings] of Object.entries(expected)){
  const item=published.find(item=>item.slug===slug);assert.ok(item,slug+' is published');
  const source=fs.readFileSync(path.join(ROOT,'content/work',slug+'.md'),'utf8');
  assert.deepEqual([...source.matchAll(/<vtk-reader href="[^"]*\/([^"/]+)"/g)].map(m=>m[1]),settings.viewers);
  assert.ok(item.links.some(link=>link.url.endsWith(slug+'-report.pdf')));assert.ok(item.links.some(link=>link.url.endsWith(settings.code)));
  const report=fs.readFileSync(path.join(ROOT,'assets/downloads/hypersonics',slug+'-report.pdf'));assert.equal(report.subarray(0,5).toString(),'%PDF-');
 }
});
