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
