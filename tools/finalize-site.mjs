import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {ROOT, readArticles} = require('./content.cjs');
const site = JSON.parse(fs.readFileSync(path.join(ROOT,'content/site.json'),'utf8'));
const output = path.join(ROOT,'_site');
const escape = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
const origin = site.site_url.replace(/\/$/,'');
const work = readArticles('work');
const writing = readArticles('writing');
for (const [kind, items, shell, script] of [['work',work,'case-file','legacy-routes'],['writing',writing,'post','legacy-posts']]) {
  const routes = Object.fromEntries(items.map(item => [item.slug,`/${kind}/${item.slug}/`]));
  const categories = Object.fromEntries(items.map(item => [item.slug,item.category]));
  const categoryCheck = kind === 'work' ? " && (!params.has('category') || params.get('category') === categories[slug])" : '';
  fs.mkdirSync(path.join(output,kind),{recursive:true});
  fs.writeFileSync(path.join(output,`js/${script}.js`),`(() => { const params = new URLSearchParams(location.search); const slug = params.get('slug'); const routes = ${JSON.stringify(routes)}; const categories = ${JSON.stringify(categories)}; if (Object.hasOwn(routes,slug)${categoryCheck}) location.replace(routes[slug] + location.hash); })();\n`);
  fs.writeFileSync(path.join(output,kind,`${shell}.html`),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="robots" content="noindex"><title>${kind === 'work' ? 'Work' : 'Writing'} | ${escape(site.name)}</title><script src="/js/${script}.js" defer></script></head><body><main><h1>${kind === 'work' ? 'Work' : 'Writing'}</h1><p>Choose a page below.</p><ul>${items.map(item=>`<li><a href="${routes[item.slug]}">${escape(item.title)}</a></li>`).join('')}</ul><a href="/${kind}.html">View all ${kind}</a></main></body></html>`);
}
const urls = ['/', '/work.html', '/writing.html', '/about.html', '/contact.html', ...work.map(item=>`/work/${item.slug}/`), ...writing.map(item=>`/writing/${item.slug}/`)];
fs.writeFileSync(path.join(output,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(route=>`<url><loc>${escape(origin+route)}</loc></url>`).join('')}</urlset>\n`);
const posts = [...writing].sort((a,b)=>b.date.localeCompare(a.date));
fs.writeFileSync(path.join(output,'feed.xml'),`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Writing | ${escape(site.name)}</title><link>${escape(origin)}/writing.html</link><description>Technical notes by ${escape(site.name)}</description>${posts.map(post=>`<item><title>${escape(post.title)}</title><link>${escape(origin)}/writing/${post.slug}/</link><guid>${escape(origin)}/writing/post.html?slug=${post.slug}</guid><pubDate>${new Date(post.date+'T00:00:00Z').toUTCString()}</pubDate><description>${escape(post.excerpt || '')}</description></item>`).join('')}</channel></rss>\n`);
console.log(`Generated sitemap, feed and compatibility links from ${work.length} work pages and ${writing.length} writing posts.`);
