import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { load } from 'cheerio';
const require = createRequire(import.meta.url);
const { ROOT, RSD_SLUG, RSD_ROUTE, WORK_SLUGS, WRITING_SLUGS, pilotData, createMarkdown } = require('./site-build.cjs');
const output = path.join(ROOT, '_site');
const {profileData}=require('./profile-data.cjs');
const { contentSignature }=require('./content-signature.cjs');
const baseline=JSON.parse(fs.readFileSync(path.join(ROOT,'tools/content-baseline.json'),'utf8'));
for (const slug of WORK_SLUGS) {
  assert.deepEqual(contentSignature(fs.readFileSync(path.join(ROOT,'content/work',`${slug}.md`),'utf8')),baseline.pages[slug],`${slug}: original prose or media changed; review against the pre-migration baseline before intentionally updating it`);
}
console.log('Verified pre-migration prose and media preservation across all ten work records.');
for (const kind of ['about','contact']) {
  const data=profileData(kind);
  const page=load(fs.readFileSync(path.join(output,`${kind}.html`),'utf8'));
  assert.equal(page('h1').text(),data.piece.title);
  assert.equal(page('link[rel=canonical]').attr('href'),data.canonical);
  assert.equal(page('#site-nav [aria-current=page]').text(),data.piece.title);
  assert.equal(page('script[src*="nav.js"],script[src*="publications.js"],script[type="importmap"]').length,0);
  if (kind==='about') {
    const text=page('main').text();
    for (const value of [...data.site.about.bio,...data.site.about.research_interests,...data.site.about.beliefs,
      ...Object.values(data.site.about.currently),...data.site.about.timeline.flatMap(item=>[item.year,item.label]),
      ...data.site.skills.flatMap(group=>[group.group,...group.items]),...data.publications.flatMap(pub=>[pub.title,pub.institution,pub.date])]) assert(text.includes(value),`About lost content: ${value.slice(0,60)}`);
    assert.equal(page('.publication-item').length,4);
    assert.equal(page('#publications').length,1);
    page('img').each((_,el)=>assert(Number(page(el).attr('width'))>0&&Number(page(el).attr('height'))>0));
  } else {
    data.contactParagraphs.forEach(paragraph=>assert(page('.contact-text').text().includes(paragraph)));
    assert(page('.contact-links a[href="mailto:'+data.site.email+'"]').length);
    assert.equal(page('#sheet-form').attr('data-endpoint'),data.endpoint);
    assert(page('#sheet-form')[0].attribs.hidden!==undefined);
    assert(page('#submit-btn')[0].attribs.disabled!==undefined);
    assert.equal(page('#form-feedback').attr('role'),'status');
  }
  page('[href],[src]').each((_,el)=>{
    for (const attr of ['href','src']) {
      const value=page(el).attr(attr);
      if (!value||value.startsWith('#')||/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value)) continue;
      let target=path.join(output,new URL(value,'https://site.invalid').pathname);
      if (value.endsWith('/')) target=path.join(target,'index.html');
      assert(fs.existsSync(target),`${kind}: missing ${value}`);
    }
  });
  console.log(`Validated ${kind}.html: complete profile content, metadata, navigation and local links.`);
}
const {indexData} = require('./index-data.cjs');
for (const kind of ['home', 'work', 'writing']) {
  const data = indexData(kind);
  const file = kind === 'home' ? 'index.html' : `${kind}.html`;
  const page = load(fs.readFileSync(path.join(output, file), 'utf8'));
  assert.equal(page('h1').length, 1);
  assert.equal(page('[data-index-item]').length, data.items.length);
  assert.equal(page('link[rel=canonical]').attr('href'), data.canonical);
  assert.equal(page('#site-nav [aria-current=page]').text(), kind === 'home' ? 'Home' : data.piece.title);
  assert.equal(page('script[src*="nav.js"],script[src*="gallery.js"],script[src*="work.js"],script[src*="writing.js"],script[src*="lightbox.js"]').length, 0);
  const list = JSON.parse(page('script[type="application/ld+json"]').text()).mainEntity.itemListElement;
  assert.equal(list.length, data.items.length);
  data.items.forEach((item,index) => {
    const entry = page('[data-index-item]').eq(index);
    assert.equal(entry.attr('href'), item.href);
    assert(entry.text().includes(item.title));
    assert.equal(entry.attr('data-category'), item.category);
    if (kind === 'writing') assert(entry.text().includes(item.excerpt));
  });
  page('[href], [src]').each((_, el) => {
    for (const attr of ['href', 'src']) {
      const value = page(el).attr(attr);
      if (!value || value.startsWith('#') || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value)) continue;
      const url = new URL(value, 'https://site.invalid/');
      let target = path.join(output, url.pathname);
      if (url.pathname.endsWith('/')) target = path.join(target, 'index.html');
      assert(fs.existsSync(target), `${file}: missing ${value}`);
    }
  });
  page('img').each((_,el) => assert(Number(page(el).attr('width')) > 0 && Number(page(el).attr('height')) > 0));
  console.log(`Validated ${file}: ${data.items.length} complete entries, metadata, navigation and links.`);
}
const html = fs.readFileSync(path.join(output, RSD_ROUTE, 'index.html'), 'utf8');
const $ = load(html);
const data = pilotData();
assert.equal($('h1').length, 1);
assert.equal($('h1').text(), data.piece.title);
assert.equal($('link[rel="canonical"]').attr('href'), data.canonical);
assert.equal($('meta[property="og:url"]').attr('content'), data.canonical);
assert.equal($('meta[property="og:title"]').attr('content'), data.piece.title);
assert.equal(JSON.parse($('script[type="application/ld+json"]').text()).mainEntityOfPage, data.canonical);
assert.equal($('.case-technical h2, .case-technical h3').length, data.headings.length);
assert($('.case-technical').text().includes('Direct velocity measurement never happened.'));
assert($('.case-technical').text().includes('CFD agrees with the RSD measurements on shape but not magnitude'));
const source = fs.readFileSync(path.join(ROOT, 'content/work', `${RSD_SLUG}.md`), 'utf8')
  .replace(/^---\r?\n[\s\S]*?\r?\n---\s*/, '');
const original = load(createMarkdown().render(source), {}, false);
const normalize = value => value.replace(/\s+/g, ' ').trim();
const record = normalize($('.case-technical').text());
original('p, li, h2, h3, span.md-caption').each((_, element) => {
  const text = normalize(original(element).text());
  if (text) assert(record.includes(text), `Technical text lost during rendering: ${text.slice(0, 90)}`);
});
assert.deepEqual(
  $('.case-technical annotation[encoding="application/x-tex"]').map((_, el) => $(el).text()).get(),
  original('annotation[encoding="application/x-tex"]').map((_, el) => original(el).text()).get(),
  'Every equation must preserve its original TeX'
);
assert($('math').length > 10, 'Build-rendered MathML must exist');
assert.equal($('.katex-error').length, 0);
assert.equal($('script[src*="marked"], script[src*="nav.js"], script[src*="case-file.js"], script[src*="katex"]').length, 0);
assert.equal($('hero-carousel').length, 6);
assert.equal($('plotly-chart').length, 2);
assert.equal($('.chart-downloads').length, 2);
assert.equal($('.chart-data table').length, 0);
assert.equal($('.chart-downloads a[download]').length, 4);
assert.equal($('.case-hero img').first().attr('loading'), 'eager');
assert.equal($('#site-nav a').length, 5);
const ids = $('[id]').map((_, element) => $(element).attr('id')).get();
assert.equal(new Set(ids).size, ids.length, 'IDs must be unique');
$('[href], [src]').each((_, element) => {
  for (const attr of ['href', 'src']) {
    const value = $(element).attr(attr);
    if (!value || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value)) continue;
    if (value.startsWith('#')) {
      assert(ids.includes(value.slice(1)), `Missing fragment ${value}`);
      continue;
    }
    const url = new URL(value, `https://site.invalid${RSD_ROUTE}`);
    let target = path.join(output, url.pathname);
    if (url.pathname.endsWith('/')) target = path.join(target, 'index.html');
    assert(fs.existsSync(target), `Missing local ${attr}: ${value}`);
  }
});
$('img').each((_, element) => {
  assert($(element).attr('alt'), 'Scientific images need descriptive alt text');
  assert(Number($(element).attr('width')) > 0 && Number($(element).attr('height')) > 0);
});
for (const file of ['CNAME', '.nojekyll', 'feed.xml', 'robots.txt']) {
  assert.equal(fs.readFileSync(path.join(output, file), 'utf8'), fs.readFileSync(path.join(ROOT, file), 'utf8'));
}
assert(fs.readFileSync(path.join(output, 'sitemap.xml'), 'utf8').includes(data.canonical));
assert(fs.readFileSync(path.join(output, 'work/case-file.html'), 'utf8').includes('/js/legacy-routes.js'));
const bridge = fs.readFileSync(path.join(output, 'js/legacy-routes.js'), 'utf8');
for (const search of [
  '?slug=compressible-wall-jet-rsd',
  '?category=research&slug=compressible-wall-jet-rsd',
  '?slug=compressible-wall-jet-rsd&category=research'
]) {
  let redirected;
  vm.runInNewContext(bridge, { URLSearchParams, location: { search, hash: '#what-was-learned', replace: url => { redirected = url; } } });
  assert.equal(redirected, RSD_ROUTE + '#what-was-learned');
}
for (const search of ['?slug=unknown', '?slug=__proto__', '?slug=compressible-wall-jet-rsd&category=creative']) {
  vm.runInNewContext(bridge, { URLSearchParams, location: { search, hash: '', replace: () => assert.fail(`Unexpected redirect for ${search}`) } });
}
console.log(`Validated complete HTML, ${$('math').length} equations, ${$('img').length} images, figures, links, fallbacks, metadata, and legacy route.`);
for (const slug of WORK_SLUGS.filter(slug => slug !== RSD_SLUG)) {
  const route = `/work/${slug}/`;
  const page = load(fs.readFileSync(path.join(output, route, 'index.html'), 'utf8'));
  const project = pilotData(slug);
  const raw = fs.readFileSync(path.join(ROOT, 'content/work', `${slug}.md`), 'utf8').replace(/^---\r?\n[\s\S]*?\r?\n---\s*/, '');
  const sourceDOM = load(createMarkdown().render(raw), {}, false);
  assert.equal(page('h1').text(), project.piece.title);
  assert.equal(page('link[rel=canonical]').attr('href'), project.canonical);
  assert.equal(JSON.parse(page('script[type="application/ld+json"]').text()).mainEntityOfPage, project.canonical);
  const technical = normalize(page('.case-technical').text());
  sourceDOM('p, li, h2, h3, h4, span.md-caption').each((_, el) => {
    const text = normalize(sourceDOM(el).text());
    if (text) assert(technical.includes(text), `${slug}: scientific text lost: ${text.slice(0, 80)}`);
  });
  assert.deepEqual(page('.case-technical annotation').map((_, el) => page(el).text()).get(), sourceDOM('annotation').map((_, el) => sourceDOM(el).text()).get());
  const tags = 'vtk-reader, stl-reader, scroll-reveal-viewer, video-embed';
  assert.equal(page('.case-technical .scientific-fallback').length, sourceDOM(tags).length);
  page('.scientific-media').each((_, el) => {
    const shell = page(el);
    assert.equal(shell.attr('data-media-state'), 'pending');
    assert.equal(shell.children().first().attr('aria-hidden'), 'true');
    assert.equal(shell.children('.media-reference').length, 1);
    assert.equal(shell.children('.media-reference').attr('hidden'), undefined);
  });
  assert.equal(page('script[src^="/js/media-fallback.js?v="]').length, 1);
  if (project.piece.media_type === 'carousel') assert(page('script[src^="/js/hero-carousel.js?v="]').length);
  if (project.needsThree) assert.equal(page('script[type="importmap"]').length, 1);
  sourceDOM(tags).each((index, el) => {
    const actual = page('.case-technical').find(tags).eq(index);
    for (const [key, value] of Object.entries(el.attribs)) {
      if (!['href', 'src', 'poster'].includes(key)) assert.equal(actual[0].attribs[key], value, `${slug}: ${key} changed`);
    }
  });
  assert.equal(page('.katex-error').length, 0);
  assert.equal(page('script[src*="case-file.js"], script[src*="nav.js"], script[src*="marked"]').length, 0);
  const pageIds = page('[id]').map((_, el) => page(el).attr('id')).get();
  assert.equal(new Set(pageIds).size, pageIds.length);
  page('[href], [src], [poster]').each((_, el) => {
    for (const attr of ['href', 'src', 'poster']) {
      const value = page(el).attr(attr);
      if (!value || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value)) continue;
      if (value.startsWith('#')) { assert(pageIds.includes(value.slice(1))); continue; }
      const url = new URL(value, `https://site.invalid${route}`);
      let target = path.join(output, url.pathname);
      if (url.pathname.endsWith('/')) target = path.join(target, 'index.html');
      assert(fs.existsSync(target), `${slug}: missing ${attr} ${value}`);
    }
  });
  page('img').each((_, el) => {
    assert(page(el).attr('alt'));
    if (page(el).attr('src').startsWith('/')) assert(Number(page(el).attr('width')) > 0 && Number(page(el).attr('height')) > 0);
  });
  let redirected;
  vm.runInNewContext(bridge, { URLSearchParams, location: {search: `?category=${project.piece.category}&slug=${slug}`, hash: '#details', replace: url => {redirected = url;} } });
  assert.equal(redirected, route + '#details');
  assert(fs.readFileSync(path.join(output, 'sitemap.xml'), 'utf8').includes(project.canonical));
  console.log(`Validated ${slug}: full scientific text, ${page('math').length} equations, ${page('.scientific-fallback').length} viewer fallbacks, assets and compatibility.`);
}
const {postData} = require('./post-data.cjs');
const postBridge = fs.readFileSync(path.join(output,'js/legacy-posts.js'),'utf8');
for (const slug of WRITING_SLUGS) {
  const data = postData(slug);
  const route = `/writing/${slug}/`;
  const page = load(fs.readFileSync(path.join(output,route,'index.html'),'utf8'));
  const raw = fs.readFileSync(path.join(ROOT,'content/writing',`${slug}.md`),'utf8').replace(/^---\r?\n[\s\S]*?\r?\n---\s*/,'');
  const original = load(createMarkdown().render(raw),{},false);
  const renderedText = normalize(page('.post-body').text());
  original('p,li,h2,h3,span.md-caption').each((_,el) => {
    const text = normalize(original(el).text());
    if (text) assert(renderedText.includes(text),`${slug}: lost text ${text.slice(0,80)}`);
  });
  assert.deepEqual(page('.post-body pre code').map((_,el)=>page(el).text()).get(),original('pre code').map((_,el)=>original(el).text()).get(),'Code examples must remain byte-for-byte identical');
  assert.deepEqual(page('.post-body annotation').map((_,el)=>page(el).text()).get(),original('annotation').map((_,el)=>original(el).text()).get());
  assert.equal(page('h1').text(),data.post.title);
  assert.equal(page('link[rel=canonical]').attr('href'),data.canonical);
  assert.equal(page('#site-nav [aria-current=page]').text(),'Writing');
  assert.equal(JSON.parse(page('script[type="application/ld+json"]').text()).datePublished,data.post.date);
  assert.equal(page('script[src*="writing.js"],script[src*="marked"],script[src*="nav.js"]').length,0);
  const ids = page('[id]').map((_,el)=>page(el).attr('id')).get();
  assert.equal(ids.length,new Set(ids).size);
  page('[href],[src]').each((_,el)=>{
    for (const attr of ['href','src']) {
      const value = page(el).attr(attr);
      if (!value || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value)) continue;
      if (value.startsWith('#')) {assert(ids.includes(value.slice(1)));continue;}
      const url = new URL(value,`https://site.invalid${route}`);
      let target=path.join(output,url.pathname);
      if (url.pathname.endsWith('/')) target=path.join(target,'index.html');
      assert(fs.existsSync(target),`${slug}: missing ${value}`);
    }
  });
  for (const search of [`?slug=${slug}`,`?extra=1&slug=${slug}`]) {
    let redirected;
    vm.runInNewContext(postBridge,{URLSearchParams,location:{search,hash:'#methods',replace:url=>{redirected=url;}}});
    assert.equal(redirected,route+'#methods');
  }
  assert(fs.readFileSync(path.join(output,'sitemap.xml'),'utf8').includes(data.canonical));
  console.log(`Validated writing/${slug}: complete text, ${page('.post-body pre code').length} unchanged code blocks, equations, assets and compatibility.`);
}
for (const slug of ['__proto__','unknown']) vm.runInNewContext(postBridge,{URLSearchParams,location:{search:`?slug=${slug}`,hash:'',replace:()=>assert.fail('Unknown post must not redirect')}});
