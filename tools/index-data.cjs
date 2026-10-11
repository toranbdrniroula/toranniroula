const fs = require('node:fs');
const path = require('node:path');
const { imageSize } = require('image-size');
const { ROOT, navigationData, resolveLegacyURL, absoluteURL } = require('./site-build.cjs');
const read = file => JSON.parse(fs.readFileSync(path.join(ROOT, 'content', file), 'utf8'));
const labels = {research: 'Research', creative: 'Creative', gallery: 'Gallery', technical: 'Technical', reflection: 'Reflections'};
const label = category => labels[category] || category.charAt(0).toUpperCase() + category.slice(1);
function image(file) {
  if (!file || !fs.existsSync(path.join(ROOT, file))) return null;
  return {src: `/${file}`, ...imageSize(fs.readFileSync(path.join(ROOT, file))), animated: /\.gif$/i.test(file)};
}
function indexData(kind) {
  const shared = {site:read('site.json'),year:new Date().getFullYear()};
  const work = read('work-index.json').map(piece => ({...piece, image: image(piece.thumbnail),
    label: label(piece.category), statusClass: piece.status.includes('Progress') ? 'in-progress' : 'completed',
    href: resolveLegacyURL(`case-file.html?slug=${piece.slug}&category=${piece.category}`)}));
  const writing = read('writing-index.json').sort((a,b) => b.date.localeCompare(a.date)).map(post => ({...post,
    image: image(post.thumbnail), label: label(post.category), href: `/writing/${post.slug}/`,
    dateLabel: new Intl.DateTimeFormat('en-GB', {day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${post.date}T00:00:00Z`))}));
  const title = kind === 'home' ? shared.site.name : kind === 'work' ? 'Work' : 'Writing';
  const route = kind === 'home' ? '/' : `/${kind}.html`;
  const items = kind === 'writing' ? writing : kind === 'home' ? work.slice(0,8) : work;
  const canonical = absoluteURL(route, shared.site.site_url);
  return {...shared, kind, isHome: kind === 'home', isWriting: kind === 'writing', items,
    piece: {title, thumbnail:'assets/media/og-banner.jpg'}, pageType:'website', canonical,
    description: kind === 'home' ? shared.site.hero.intro : kind === 'work' ? 'Research and creative work by Toran Bahadur Niroula: CFD, experimental fluid dynamics, and visual projects.' : 'Technical notes and reflective writing by Toran Bahadur Niroula.',
    categories: [...new Set(items.map(item => item.category))].map(category => ({value:category,label:label(category)})),
    navigation: navigationData(kind === 'home' ? 'Home' : title),
    scripts: kind === 'home' ? ['flow-field.js'] : ['static-index.js'], needsThree:false, hasMath:false,
    extraStyles:['gallery.css','writing.css','static-index.css', ...(kind === 'home' ? ['hero.css'] : [])],
    structuredData: JSON.stringify({'@context':'https://schema.org','@type':'CollectionPage',name:title,url:canonical,
      mainEntity:{'@type':'ItemList',itemListElement:items.map((item,index) => ({'@type':'ListItem',position:index+1,name:item.title,url:absoluteURL(item.href,shared.site.site_url)}))}}).replaceAll('<','\\u003c')};
}
module.exports = {indexData};
