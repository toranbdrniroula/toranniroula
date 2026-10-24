const {WRITING_SLUGS} = require('../../tools/site-build.cjs');
const {postData} = require('../../tools/post-data.cjs');
module.exports = class {
  data() {
    const posts = WRITING_SLUGS.map(postData);
    return {pagination:{data:'posts',size:1,alias:'postPage'},posts,layout:'layouts/post.njk',eleventyComputed:{
      permalink:data => `/writing/${data.postPage.post.slug}/`,
      ...Object.fromEntries(Object.keys(posts[0] || {}).map(key => [key,data => data.postPage[key]]))
    }};
  }
  render(data) {return data.postPage.body;}
};
