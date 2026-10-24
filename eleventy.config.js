const { absoluteURL } = require('./tools/site-build.cjs');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

module.exports = function (eleventyConfig) {
  eleventyConfig.setNunjucksEnvironmentOptions({ autoescape: true });
  // Publish assets and datasets; article sources and drafts stay private to the repo.
  for (const directory of ['assets', 'css', 'js', 'content/data']) {
    eleventyConfig.addPassthroughCopy(directory);
  }
  for (const file of ['robots.txt', 'CNAME', '.nojekyll']) {
    eleventyConfig.addPassthroughCopy(file);
  }
  eleventyConfig.addPassthroughCopy({ 'node_modules/katex/dist': 'assets/vendor/katex' });
  eleventyConfig.addFilter('absoluteURL', absoluteURL);
  eleventyConfig.addFilter('assetURL', value => {
    if (!/^\/(css|js)\/[a-z0-9.-]+$/i.test(value)) throw new Error(`Invalid local asset: ${value}`);
    const hash = createHash('sha256').update(fs.readFileSync(path.join(__dirname, value.slice(1)))).digest('hex').slice(0, 12);
    return `${value}?v=${hash}`;
  });
  eleventyConfig.addWatchTarget('content/');
  eleventyConfig.addWatchTarget('tools/site-build.cjs');
  return {
    dir: { input: 'src', includes: '_includes', data: '_data', output: '_site' },
    templateFormats: ['11ty.js', 'njk'],
    htmlTemplateEngine: false
  };
};
