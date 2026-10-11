const { createHash } = require('node:crypto');
const { load } = require('cheerio');
const { createMarkdown } = require('./site-build.cjs');
function contentSignature(source) {
  const body=source.replace(/^---\r?\n[\s\S]*?\r?\n---\s*/, '');
  const page=load(createMarkdown().render(body));
  page('h1,h2,h3,h4,h5,h6').remove();
  const words=(page.root().text().match(/\S+/g)||[]).sort();
  const media=page('img,vtk-reader,stl-reader,scroll-reveal-viewer,reveal-frame,video-embed,plotly-chart').map((_,el)=>JSON.stringify({tag:el.tagName,attrs:el.attribs})).get().sort();
  return { wordCount:words.length, proseHash:createHash('sha256').update(JSON.stringify(words)).digest('hex'),
    mediaCount:media.length,mediaHash:createHash('sha256').update(JSON.stringify(media)).digest('hex') };
}
module.exports={contentSignature};
