const fs = require('node:fs');
const path = require('node:path');
const {imageSize} = require('image-size');
const {ROOT,navigationData,absoluteURL,WORK_PIECES} = require('./site-build.cjs');
function profileData(kind) {
  const site = JSON.parse(fs.readFileSync(path.join(ROOT,'content/site.json'),'utf8'));
  const title = kind === 'about' ? 'About' : 'Contact';
  const canonical = absoluteURL(`/${kind}.html`,site.site_url);
  const photo = file => ({src:`/${file}`,...imageSize(fs.readFileSync(path.join(ROOT,file)))});
  const publications = JSON.parse(fs.readFileSync(path.join(ROOT,'content/publications.json'),'utf8')).map(pub => ({...pub,
    typeLabel:pub.type.replace(/\b\w/g,c=>c.toUpperCase()),
    relatedHref:WORK_PIECES.some(piece=>piece.slug===pub.related_work) ? `/work/${pub.related_work}/` : ''}));
  // Preserve the deployed destination while the original shell remains the
  // transitional source for its form configuration.
  const endpoint = fs.readFileSync(path.join(ROOT,'contact.html'),'utf8').match(/const scriptURL = '([^']+)'/)?.[1];
  if (!endpoint) throw new Error('Contact endpoint missing');
  const description = `${title} ${site.name}, aerospace engineering researcher working across experimental fluid dynamics and CFD.`;
  const person = {'@type':'Person',name:site.name,url:site.site_url,
    image:absoluteURL(site.about.photo,site.site_url),sameAs:Object.values(site.social).filter(Boolean)};
  return {kind,site,publications,endpoint,contactParagraphs:site.about.contact_text.split(/\n\s*\n/),
    photo:photo(site.about.photo_bw || site.about.photo),colorPhoto:photo(site.about.photo),
    piece:{title,thumbnail:'assets/media/og-banner.jpg'},canonical,description,
    pageType:kind === 'about' ? 'profile' : 'website',extraStyles:['about-contact.css','static-profile.css'],
    scripts:kind === 'contact' ? ['static-contact.js'] : [],needsThree:false,hasMath:false,
    navigation:navigationData(title),year:new Date().getFullYear(),
    structuredData:JSON.stringify({'@context':'https://schema.org','@type':kind === 'about' ? 'ProfilePage' : 'ContactPage',
      name:title,url:canonical,mainEntity:person}).replaceAll('<','\\u003c')};
}
module.exports={profileData};
