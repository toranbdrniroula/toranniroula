const { projectData, WORK_SLUGS } = require('../../tools/site-build.cjs');
module.exports = class {
  data() {
    const projects = WORK_SLUGS.map(slug => projectData(slug));
    return {
      pagination: { data: 'projects', size: 1, alias: 'project' },
      projects,
      layout: 'layouts/project.njk',
      eleventyComputed: {
        permalink: data => `/work/${data.project.piece.slug}/`,
        ...Object.fromEntries(Object.keys(projects[0] || {}).map(key => [key, data => data.project[key]]))
      }
    };
  }
  render(data) { return data.project.body; }
};
