const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');

function parseArticle(source, kind, file) {
    const match = /^---\r?\n([\s\S]*?)\r?\n---\s*/.exec(source);
    if (!match) throw new Error(`${kind}/${file}: add the JSON settings block from templates/${kind}.md`);
    let settings;
    try { settings = JSON.parse(match[1]); } catch (error) { throw new Error(`${kind}/${file}: invalid page settings: ${error.message}`); }
    if (!settings || typeof settings.title !== 'string' || !settings.title.trim() || typeof settings.date !== 'string' || !settings.date.trim()) throw new Error(`${kind}/${file}: title and date must be non-empty quoted strings`);
    if (settings.draft !== undefined && typeof settings.draft !== 'boolean') throw new Error(`${kind}/${file}: draft must be true or false without quotes`);
    if (kind === 'writing' && (!/^\d{4}-\d{2}-\d{2}$/.test(settings.date) || Number.isNaN(Date.parse(settings.date)))) throw new Error(`${kind}/${file}: writing date must use YYYY-MM-DD`);
    const slug = path.basename(file, '.md');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`${file}: use a lowercase filename with hyphens`);
    return {category: kind === 'work' ? 'research' : 'technical', status: 'In Progress', thumbnail: 'assets/media/og-banner.jpg',
      media_type: 'image', links: [], tags: [], supporting_media: [], ...settings, slug};
}
function readArticles(kind, { includeDrafts = false } = {}) {
  if (!['work', 'writing'].includes(kind)) throw new Error('Unknown content collection');
  return fs.readdirSync(path.join(ROOT, 'content', kind)).filter(file => file.endsWith('.md')).map(file =>
    parseArticle(fs.readFileSync(path.join(ROOT, 'content', kind, file), 'utf8'), kind, file)
  ).filter(item => includeDrafts || !item.draft)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}
module.exports = { ROOT, readArticles, parseArticle };
