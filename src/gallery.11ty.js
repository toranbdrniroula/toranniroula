const gallery = require('../content/gallery.json');
const site = require('../content/site.json');
const {navigationData,absoluteURL} = require('../tools/site-build.cjs');
module.exports = class {
  data() {
    const canonical=absoluteURL('/gallery.html',site.site_url);
    return {permalink:'/gallery.html',layout:'layouts/gallery.njk',site,year:new Date().getFullYear(),
      gallery,piece:{title:gallery.title,thumbnail:'assets/media/schlieren/candle.jpg'},
      canonical,description:gallery.description,pageType:'website',navigation:navigationData('Gallery'),
      extraStyles:['schlieren-gallery.css'],scripts:['schlieren-gallery.js'],
      structuredData:JSON.stringify({'@context':'https://schema.org','@type':'CollectionPage',name:gallery.title,url:canonical,description:gallery.description}).replaceAll('<','\\u003c')};
  }
  render(){return '';}
};
