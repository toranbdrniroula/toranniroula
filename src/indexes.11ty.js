const {indexData} = require('../tools/index-data.cjs');
module.exports = class {
  data() {
    return {pagination:{data:'indexes',size:1,alias:'indexPage'},indexes:['home','work','writing'].map(indexData),
      layout:'layouts/index.njk', eleventyComputed:{
        permalink:data => data.indexPage.kind === 'home' ? '/index.html' : `/${data.indexPage.kind}.html`,
        ...Object.fromEntries(Object.keys(indexData('home')).map(key => [key,data => data.indexPage[key]]))
      }};
  }
  render() {return '';}
};
