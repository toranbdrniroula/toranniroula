const fs = require('node:fs');
const path = require('node:path');
const {ROOT, navigationData, absoluteURL, createMarkdown, prepareHTML} = require('./site-build.cjs');
function postData(slug) {
  const site = JSON.parse(fs.readFileSync(path.join(ROOT,'content/site.json'),'utf8'));
  const post = JSON.parse(fs.readFileSync(path.join(ROOT,'content/writing-index.json'),'utf8')).find(post => post.slug === slug);
  if (!post) throw new Error(`Post metadata missing: ${slug}`);
  const source = fs.readFileSync(path.join(ROOT,'content/writing',`${slug}.md`),'utf8').replace(/^---\r?\n[\s\S]*?\r?\n---\s*/,'');
  const prepared = prepareHTML(createMarkdown().render(source), {legacyPath:'/writing/post.html'});
  const canonical = absoluteURL(`/writing/${slug}/`,site.site_url);
  const image = post.thumbnail && fs.existsSync(path.join(ROOT,post.thumbnail)) ? post.thumbnail : 'assets/media/og-banner.jpg';
  const heroDOM = require('cheerio').load('<img>', {}, false);
  const hero = post.hero ? prepareHTML(heroDOM('img').attr({src:`/${post.hero}`,alt:post.hero_alt || post.title}).toString(), {eagerFirst:true}).html : '';
  return {site,post,piece:{...post,thumbnail:image},socialImage:image,hero,body:prepared.html,headings:prepared.headings,
    canonical,description:post.excerpt,isWriting:true,hasMath:prepared.html.includes('<math'),needsThree:false,
    scripts:['static-post.js'],extraStyles:['writing.css','static-post.css'],navigation:navigationData('Writing'),year:new Date().getFullYear(),
    dateLabel:new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${post.date}T00:00:00Z`)),
    structuredData:JSON.stringify({'@context':'https://schema.org','@type':'BlogPosting',headline:post.title,
      author:{'@type':'Person',name:site.name,url:site.site_url},mainEntityOfPage:canonical,datePublished:post.date,
      description:post.excerpt,image:absoluteURL(image,site.site_url),inLanguage:'en'}).replaceAll('<','\\u003c')};
}
module.exports = {postData};
