const {readGallery} = require('../tools/gallery-data.cjs');
const site = require('../content/site.json');
const {navigationData,absoluteURL} = require('../tools/site-build.cjs');
module.exports = class {
  data() {
    const gallery=readGallery();
    const canonical=absoluteURL('/gallery.html',site.site_url);
    const thumbnail=gallery.chapters.flatMap(chapter=>chapter.items).find(item=>item.still)?.still||'/assets/media/og-banner.jpg';
    return {permalink:'/gallery.html',layout:'layouts/gallery.njk',site,year:new Date().getFullYear(),
      gallery,piece:{title:gallery.title,thumbnail},canonical,description:gallery.description,pageType:'website',navigation:navigationData('Gallery'),
      extraStyles:['media-gallery.css'],scripts:['media-gallery.js'],
      structuredData:JSON.stringify({'@context':'https://schema.org','@type':'CollectionPage',name:gallery.title,url:canonical,description:gallery.description}).replaceAll('<','\\u003c')};
  }
  render(){return '';}
};
