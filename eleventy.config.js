const { absoluteURL } = require('./tools/site-build.cjs');

module.exports = function (eleventyConfig) {
  eleventyConfig.setNunjucksEnvironmentOptions({ autoescape: true });
  // During the pilot, every unmigrated route and asset is copied unchanged.
  for (const directory of ['assets', 'css', 'js', 'content', 'work', 'writing']) {
    eleventyConfig.addPassthroughCopy(directory);
  }
  for (const file of ['feed.xml', 'sitemap.xml', 'robots.txt', 'CNAME', '.nojekyll']) {
    eleventyConfig.addPassthroughCopy(file);
  }
  eleventyConfig.addPassthroughCopy({ 'node_modules/katex/dist': 'assets/vendor/katex' });
  eleventyConfig.addFilter('absoluteURL', absoluteURL);
  eleventyConfig.addWatchTarget('content/');
  eleventyConfig.addWatchTarget('tools/site-build.cjs');
  return {
    dir: { input: 'src', includes: '_includes', data: '_data', output: '_site' },
    templateFormats: ['11ty.js', 'njk'],
    htmlTemplateEngine: false
  };
};
