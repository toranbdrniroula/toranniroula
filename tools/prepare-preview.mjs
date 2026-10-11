import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { ROOT, WORK_SLUGS, WORK_PIECES, WRITING_SLUGS } = require('./site-build.cjs');
const output = path.join(ROOT, '_site');
const legacy = path.join(output, 'work/case-file.html');
const routes = Object.fromEntries(WORK_SLUGS.map(slug => [slug, `/work/${slug}/`]));
const categories = Object.fromEntries(WORK_PIECES.map(piece => [piece.slug,piece.category]));
// Only the generated copy receives the compatibility bridge. The production
// source page and all unmigrated query URLs retain their current renderer.
fs.writeFileSync(path.join(output, 'js/legacy-routes.js'), `(() => {
  const params = new URLSearchParams(location.search);
  const routes = ${JSON.stringify(routes)};
  const categories = ${JSON.stringify(categories)};
  const slug = params.get('slug');
  const route = Object.hasOwn(routes, slug) ? routes[slug] : null;
  if (route && (!params.has('category') || params.get('category') === categories[slug])) {
    location.replace(route + location.hash);
  }
})();\n`);
let html = fs.readFileSync(legacy, 'utf8');
html = html.replace('<head>', '<head>\n  <script src="/js/legacy-routes.js"></script>');
html = html.replace('<div id="case-file-root" class="page-container"></div>',
  `<div id="case-file-root" class="page-container"><noscript><p>Project records:</p><ul>${WORK_SLUGS.map(slug => `<li><a href="${routes[slug]}">${slug.replaceAll('-', ' ')}</a></li>`).join('')}</ul></noscript></div>`);
fs.writeFileSync(legacy, html);
const sitemapPath = path.join(output, 'sitemap.xml');
let sitemap = fs.readFileSync(sitemapPath, 'utf8');
for (const slug of WORK_SLUGS) sitemap = sitemap.replaceAll(`https://toranniroula.com.np/work/case-file.html?slug=${slug}`, `https://toranniroula.com.np${routes[slug]}`);
const postRoutes = Object.fromEntries(WRITING_SLUGS.map(slug => [slug, `/writing/${slug}/`]));
fs.writeFileSync(path.join(output,'js/legacy-posts.js'), `(() => {
  const routes = ${JSON.stringify(postRoutes)};
  const slug = new URLSearchParams(location.search).get('slug');
  if (Object.hasOwn(routes,slug)) location.replace(routes[slug] + location.hash);
})();\n`);
const postShell = path.join(output,'writing/post.html');
let postHTML = fs.readFileSync(postShell,'utf8').replace('<head>','<head>\n<script src="/js/legacy-posts.js"></script>');
postHTML = postHTML.replace('<div id="post-root" class="page-container"></div>',`<div id="post-root" class="page-container"><noscript><p>Writing posts:</p><ul>${WRITING_SLUGS.map(slug => `<li><a href="${postRoutes[slug]}">${slug.replaceAll('-',' ')}</a></li>`).join('')}</ul></noscript></div>`);
fs.writeFileSync(postShell,postHTML);
for (const slug of WRITING_SLUGS) sitemap = sitemap.replaceAll(`https://toranniroula.com.np/writing/post.html?slug=${slug}`,`https://toranniroula.com.np${postRoutes[slug]}`);
fs.writeFileSync(sitemapPath, sitemap);
console.log('Prepared preview compatibility route and canonical sitemap entry.');
