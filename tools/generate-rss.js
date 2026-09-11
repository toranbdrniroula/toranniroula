#!/usr/bin/env node
// Regenerates feed.xml (RSS 2.0) from content/writing-index.json.
//
// Run this after adding a writing post:
//
//   node tools/generate-rss.js
//
// Same pattern as tools/generate-sitemap.js: reads site_url from
// content/site.json (set it once there, both scripts pick it up), no
// dependencies beyond Node's built-in `fs`/`path`.
//
// Each item's description is the post's `excerpt` field from
// writing-index.json, not the full Markdown body -- keeping the feed to
// index-file data only means this script doesn't need a Markdown parser,
// and it matches what the Writing list page itself shows per entry.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONTENT = path.join(ROOT, 'content');

function readJSON(relPath) {
  return JSON.parse(fs.readFileSync(path.join(CONTENT, relPath), 'utf8'));
}

function xmlEscape(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// RFC 822 date, required by the RSS 2.0 spec for pubDate. writing-index.json
// dates are plain "YYYY-MM-DD" with no time-of-day, so this pins everything
// to midnight UTC -- fine for a feed reader's chronological sort, which is
// all this needs to support.
function toRFC822(isoDate) {
  const d = new Date(isoDate + 'T00:00:00Z');
  return d.toUTCString();
}

function main() {
  const site = readJSON('site.json');
  const siteUrl = String(site.site_url || 'https://YOUR-DOMAIN-HERE').replace(/\/+$/, '');

  if (siteUrl.includes('YOUR-DOMAIN-HERE')) {
    console.warn(
      'Warning: content/site.json "site_url" is still the placeholder. ' +
      'The feed will generate fine, but don\'t deploy it until that\'s set.'
    );
  }

  const posts = [...readJSON('writing-index.json')].sort((a, b) => b.date.localeCompare(a.date));

  const items = posts.map(post => {
    const url = `${siteUrl}/writing/post.html?slug=${encodeURIComponent(post.slug)}`;
    return `    <item>\n` +
      `      <title>${xmlEscape(post.title)}</title>\n` +
      `      <link>${xmlEscape(url)}</link>\n` +
      `      <guid isPermaLink="true">${xmlEscape(url)}</guid>\n` +
      `      <pubDate>${toRFC822(post.date)}</pubDate>\n` +
      `      <description>${xmlEscape(post.excerpt)}</description>\n` +
      `    </item>`;
  });

  const buildDate = posts.length ? toRFC822(posts[0].date) : new Date().toUTCString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0">\n` +
    `  <channel>\n` +
    `    <title>Writing | ${xmlEscape(site.name)}</title>\n` +
    `    <link>${xmlEscape(siteUrl)}/writing.html</link>\n` +
    `    <description>Technical notes and reflective writing by ${xmlEscape(site.name)}.</description>\n` +
    `    <language>en</language>\n` +
    `    <lastBuildDate>${buildDate}</lastBuildDate>\n` +
    items.join('\n') + `\n` +
    `  </channel>\n` +
    `</rss>\n`;

  const outPath = path.join(ROOT, 'feed.xml');
  fs.writeFileSync(outPath, xml, 'utf8');
  console.log(`Wrote ${items.length} items to ${path.relative(ROOT, outPath)}`);
}

main();
