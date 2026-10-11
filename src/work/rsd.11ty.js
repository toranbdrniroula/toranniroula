const { pilotData, RSD_ROUTE } = require('../../tools/site-build.cjs');

module.exports = class {
  data() {
    return { ...pilotData(), layout: 'layouts/project.njk', permalink: RSD_ROUTE };
  }
  render(data) { return data.body; }
};
