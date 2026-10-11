const { pilotData, WORK_SLUGS, RSD_SLUG } = require('../../tools/site-build.cjs');
module.exports = class {
  data() {
    return {
      pagination: { data: 'projects', size: 1, alias: 'project' },
      projects: WORK_SLUGS.filter(slug => slug !== RSD_SLUG).map(slug => pilotData(slug)),
      layout: 'layouts/project.njk',
      eleventyComputed: {
        permalink: data => `/work/${data.project.piece.slug}/`,
        ...Object.fromEntries(Object.keys(pilotData()).map(key => [key, data => data.project[key]]))
      }
    };
  }
  render(data) { return data.project.body; }
};
