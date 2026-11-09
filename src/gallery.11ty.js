const {readGallery}=require('../tools/gallery-data.cjs');
const {buildGalleryPages}=require('../tools/gallery-pages.cjs');
const site=require('../content/site.json');
const {navigationData,absoluteURL}=require('../tools/site-build.cjs');
module.exports=class {
 data(){
  return {pagination:{data:'galleryPages',size:1,alias:'galleryPage'},galleryPages:buildGalleryPages(readGallery()),layout:'layouts/gallery-page.njk',site,year:new Date().getFullYear(),navigation:navigationData('Gallery'),pageType:'website',extraStyles:['media-gallery.css'],scripts:['media-gallery.js'],eleventyComputed:{
   permalink:data=>data.galleryPage.permalink,
   description:data=>data.galleryPage.description,
   canonical:data=>absoluteURL(data.galleryPage.permalink,site.site_url),
   piece:data=>({title:data.galleryPage.title+(data.galleryPage.number>1?` (page ${data.galleryPage.number})`:''),thumbnail:(data.galleryPage.chapter?.cover||data.galleryPage.chapters[0]?.cover)?.stillURL||'/assets/media/og-banner.jpg'}),
   galleryRouteMap:data=>JSON.stringify(data.galleryPage.anchorRoutes||{}).replaceAll('<','\\u003c'),
   structuredData:data=>JSON.stringify({'@context':'https://schema.org','@type':'CollectionPage',name:data.galleryPage.title,url:absoluteURL(data.galleryPage.permalink,site.site_url),description:data.galleryPage.description}).replaceAll('<','\\u003c')
  }};
 }
 render(){return '';}
};
