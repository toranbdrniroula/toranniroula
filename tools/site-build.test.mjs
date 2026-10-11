import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { load } from 'cheerio';
const require = createRequire(import.meta.url);
const { resolveLegacyURL, RSD_ROUTE, createMarkdown, prepareHTML } = require('./site-build.cjs');

test('nested assets and old project queries resolve without losing query or fragment', () => {
  assert.equal(resolveLegacyURL('../assets/media/figure.png'), '/assets/media/figure.png');
  assert.equal(resolveLegacyURL('case-file.html?slug=pyrsd-library&category=research#methods'), '/work/pyrsd-library/#methods');
  assert.equal(resolveLegacyURL('case-file.html?slug=unknown&category=research'), '/work/case-file.html?slug=unknown&category=research');
  assert.equal(resolveLegacyURL('/writing/post.html?slug=overset-meshing-explained#methods'), '/writing/overset-meshing-explained/#methods');
  assert.equal(resolveLegacyURL('case-file.html?category=research&slug=compressible-wall-jet-rsd#methods'), RSD_ROUTE + '#methods');
  assert.equal(resolveLegacyURL('case-file.html?slug=compressible-wall-jet-rsd'), RSD_ROUTE);
  assert.equal(resolveLegacyURL('https://example.org/report.pdf'), 'https://example.org/report.pdf');
  assert.equal(resolveLegacyURL('#methods'), '#methods');
  for (const slug of ['hypersonics-advanced-propulsion', 'dandelion-seed-vortex', 'nimbus-agricultural-uav']) {
    assert.equal(resolveLegacyURL(`case-file.html?slug=${slug}&category=research#methods`), `/work/${slug}/#methods`);
    assert.equal(resolveLegacyURL(`case-file.html?slug=${slug}&category=creative`), `/work/case-file.html?slug=${slug}&category=creative`);
  }
});

test('math renders at build time while code and raw HTML survive', () => {
  const html = createMarkdown().render('Inline $\\rho_\\infty$ and `price $x$`.\n\n$$\\frac{\\partial \\rho}{\\partial y} = C \\Delta d$$\n\n```text\n$x$\n```\n\n<hero-carousel><img src="../assets/example.png" alt="Example"></hero-carousel>');
  const $ = load(html);
  assert.equal($('math').length, 2);
  assert.equal($('code').first().text(), 'price $x$');
  assert.equal($('pre code').text().trim(), '$x$');
  assert.equal($('hero-carousel img').attr('alt'), 'Example');
  assert.throws(() => createMarkdown().render('$$\\invalidcommand$$'));
});

test('contents include deeper article headings with unique links and exclude viewer captions', () => {
  const result = prepareHTML('<h2>Setup</h2><h3>Mesh</h3><h4>Validation</h4><h4>Validation</h4><h5>Error</h5><h6>Sources</h6><reveal-frame><h4>Camera caption</h4></reveal-frame><div class="model-captions"><h4>Fallback caption</h4></div>');
  assert.deepEqual(result.headings.map(item => item.id), ['setup','mesh','validation','validation-2','error','sources']);
  const $ = load(result.html);
  for (const heading of result.headings) assert.equal($(`#${heading.id}`).text(), heading.title);
});
