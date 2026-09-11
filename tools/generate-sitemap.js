#!/usr/bin/env node
// Regenerates sitemap.xml from content/work-index.json and
// content/writing-index.json, plus the fixed set of static top-level pages.
//
// Run this after adding/removing a work piece or writing post:
//
//   node tools/generate-sitemap.js
//
// It reads site_url from content/site.json, so once the site has a real
// domain, set it there once and every future run picks it up -- nothing to
// pass on the command line. Until then it'll happily generate a sitemap
// full of https://YOUR-DOMAIN-HERE/... URLs, which is harmless locally but
// should not be deployed as-is.
//
// This script has no dependencies beyond Node's built-in `fs`/`path`, in
// keeping with the rest of the site (no build step, no npm install).

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONTENT = path.join(ROOT, 'content');

function readJSON(relPath) {
  const full = path.join(CONTENT, relPath);
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}

function xmlEscape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry(loc, opts) {
  opts = opts || {};
  const lastmod = opts.lastmod ? `\n    <lastmod>${xmlEscape(opts.lastmod)}</lastmod>` : '';
  const changefreq = opts.changefreq ? `\n    <changefreq>${opts.changefreq}</changefreq>` : '';
  const priority = opts.priority != null ? `\n    <priority>${opts.priority}</priority>` : '';
  return `  <url>\n    <loc>${xmlEscape(loc)}</loc>${lastmod}${changefreq}${priority}\n  </url>`;
}

function main() {
  const site = readJSON('site.json');
  const siteUrl = String(site.site_url || 'https://YOUR-DOMAIN-HERE').replace(/\/+$/, '');

  if (siteUrl.includes('YOUR-DOMAIN-HERE')) {
    console.warn(
      'Warning: content/site.json "site_url" is still the placeholder ' +
      '(https://YOUR-DOMAIN-HERE). The sitemap will generate fine, but ' +
      'don\'t deploy it until that\'s set to the real domain.'
    );
  }

  const workIndex = readJSON('work-index.json');
  const writingIndex = readJSON('writing-index.json');

  const today = new Date().toISOString().slice(0, 10);

  const staticPages = [
    { loc: `${siteUrl}/`, changefreq: 'monthly', priority: '1.0' },
    { loc: `${siteUrl}/work.html`, changefreq: 'weekly', priority: '0.9' },
    { loc: `${siteUrl}/writing.html`, changefreq: 'weekly', priority: '0.8' },
    { loc: `${siteUrl}/about.html`, changefreq: 'monthly', priority: '0.6' },
    { loc: `${siteUrl}/contact.html`, changefreq: 'yearly', priority: '0.4' }
  ];

  const workUrls = workIndex.map(piece =>
    urlEntry(`${siteUrl}/work/case-file.html?slug=${encodeURIComponent(piece.slug)}`, {
      changefreq: 'monthly',
      priority: '0.7'
    })
  );

  const writingUrls = writingIndex.map(post =>
    urlEntry(`${siteUrl}/writing/post.html?slug=${encodeURIComponent(post.slug)}`, {
      lastmod: post.date,
      changefreq: 'monthly',
      priority: '0.7'
    })
  );

  const staticUrls = staticPages.map(p => urlEntry(p.loc, { lastmod: today, changefreq: p.changefreq, priority: p.priority }));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    [...staticUrls, ...workUrls, ...writingUrls].join('\n') +
    `\n</urlset>\n`;

  const outPath = path.join(ROOT, 'sitemap.xml');
  fs.writeFileSync(outPath, xml, 'utf8');
  console.log(`Wrote ${workUrls.length + writingUrls.length + staticUrls.length} URLs to ${path.relative(ROOT, outPath)}`);
}

main();
