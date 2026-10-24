import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {load} from 'cheerio';
const require = createRequire(import.meta.url);
const {ROOT,readArticles} = require('./content.cjs');
const {createMarkdown,projectData} = require('./site-build.cjs');
const {postData} = require('./post-data.cjs');
const {indexData} = require('./index-data.cjs');
const {profileData} = require('./profile-data.cjs');
const output = path.join(ROOT,'_site');
const pageAt = route => load(fs.readFileSync(path.join(output,route.endsWith('/') ? route+'index.html' : route),'utf8'));
const normalize = text => text.replace(/\s+/g,' ').trim();
function common(page,title,canonical) {
  assert.equal(page('h1').length,1);
  assert.equal(page('h1').text(),title);
  assert.equal(page('link[rel=canonical]').attr('href'),canonical);
  assert(page('meta[name=description]').attr('content'));
  const ids=page('[id]').map((_,el)=>page(el).attr('id')).get();
  assert.equal(ids.length,new Set(ids).size,'Duplicate heading IDs');
  page('a[href^="#"]').each((_,el)=>assert(ids.includes(page(el).attr('href').slice(1)),'Contents link has no target'));
  assert.equal(page('.katex-error').length,0);
  page('img').each((_,el)=>{
    assert(page(el).attr('alt') !== undefined,'Image alt attribute missing');
    if (page(el).attr('src')?.startsWith('/')) assert(Number(page(el).attr('width'))>0 && Number(page(el).attr('height'))>0,'Image dimensions missing');
  });
}
for (const kind of ['home','work','writing']) {
  const data=indexData(kind), page=pageAt(kind==='home' ? '/index.html' : `/${kind}.html`);
  common(page,data.piece.title,data.canonical);
  assert.deepEqual(page('[data-index-item]').map((_,el)=>page(el).attr('href')).get(),data.items.map(item=>item.href));
}
for (const kind of ['work','writing']) {
  const items=readArticles(kind);
  for (const item of items) {
    const data=kind==='work' ? projectData(item.slug) : postData(item.slug);
    const route=`/${kind}/${item.slug}/`, page=pageAt(route);
    common(page,item.title,data.canonical);
    const raw=fs.readFileSync(path.join(ROOT,'content',kind,item.slug+'.md'),'utf8').replace(/^---\r?\n[\s\S]*?\r?\n---\s*/,'');
    const source=load(createMarkdown().render(raw),{},false);
    const article=page(kind==='work' ? '.case-technical' : '.post-body');
    const rendered=normalize(article.text());
    source('p,li,h2,h3,h4,h5,h6,span.md-caption').each((_,el)=>{
      const text=normalize(source(el).text());
      if (text) assert(rendered.includes(text),`${item.slug}: rendering lost text: ${text.slice(0,80)}`);
    });
    assert.deepEqual(article.find('annotation').map((_,el)=>page(el).text()).get(),source('annotation').map((_,el)=>source(el).text()).get(),'Equation changed during rendering');
    assert.deepEqual(article.find('pre code').map((_,el)=>page(el).text()).get(),source('pre code').map((_,el)=>source(el).text()).get(),'Code changed during rendering');
    assert.equal(page('.project-contents a').length,data.headings.length);
    assert.equal(article.find('.chart-downloads a[download]').length,source('plotly-chart').length);
    assert.equal(article.find('.chart-data table').length,0);
    const tags='vtk-reader,stl-reader,scroll-reveal-viewer,video-embed';
    assert.equal(article.find('.scientific-fallback').length,source(tags).length);
    source(tags).each((index,el)=>{
      const actual=article.find(tags).eq(index);
      for (const [key,value] of Object.entries(el.attribs)) if (!['href','src','poster'].includes(key)) assert.equal(actual[0].attribs[key],value,`${item.slug}: viewer setting changed`);
    });
    page('.scientific-media').each((_,el)=>{
      assert.equal(page(el).attr('data-media-state'),'pending');
      assert.equal(page(el).children('.media-reference').attr('hidden'),undefined);
    });
    if (kind==='work') {
      assert.deepEqual(page('.case-supporting-grid img').map((_,el)=>page(el).attr('src')).get(),item.supporting_media.map(src=>`/${src}`));
      assert.deepEqual(page('.project-related-card').map((_,el)=>page(el).attr('href')).get(),data.related.map(other=>other.href));
    }
    const script=fs.readFileSync(path.join(output,'js',kind==='work' ? 'legacy-routes.js' : 'legacy-posts.js'),'utf8');
    let redirected;
    vm.runInNewContext(script,{URLSearchParams,location:{search:`?slug=${item.slug}`,hash:'#details',replace:url=>{redirected=url;}}});
    assert.equal(redirected,route+'#details');
    console.log(`Validated ${route}: complete current-source text, equations, code, contents and media.`);
  }
}
for (const kind of ['about','contact']) {
  const data=profileData(kind), page=pageAt(`/${kind}.html`);
  common(page,data.piece.title,data.canonical);
  if (kind==='about') assert.equal(page('.publication-item').length,data.publications.length);
  else {
    assert.equal(page('#sheet-form').attr('data-endpoint'),data.endpoint);
    assert(page('#sheet-form')[0].attribs.hidden!==undefined);
    assert(page('#submit-btn')[0].attribs.disabled!==undefined);
    assert.equal(page('#form-feedback').attr('role'),'status');
  }
}
for (const kind of ['work','writing']) {
  for (const draft of readArticles(kind,{includeDrafts:true}).filter(item=>item.draft)) assert(!fs.existsSync(path.join(output,kind,draft.slug)),'Draft was published');
}
assert(!fs.existsSync(path.join(output,'writing/overset-meshing-explained')),'Removed article still published');
for (const file of ['feed.xml','sitemap.xml']) {
  const xml=fs.readFileSync(path.join(output,file),'utf8');
  assert(!xml.includes('overset-meshing-explained'));
  for (const post of readArticles('writing')) assert(xml.includes(`/writing/${post.slug}/`));
}
console.log('Validated current content, draft exclusion and removed article. No historical content hashes are required.');
