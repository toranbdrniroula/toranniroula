const fs = require('node:fs');
const path = require('node:path');
const MarkdownIt = require('markdown-it');
const katex = require('katex');
const cheerio = require('cheerio');
const { imageSize } = require('image-size');
const { readArticles } = require('./content.cjs');

const ROOT = path.resolve(__dirname, '..');
const readJSON = name => JSON.parse(fs.readFileSync(path.join(ROOT, 'content', name), 'utf8'));
const WORK_PIECES = readArticles('work');
const WORK_SLUGS = WORK_PIECES.map(piece => piece.slug);
const WRITING_SLUGS = readArticles('writing').map(post => post.slug);
function navigationData(active) {
  return ['Home', 'Work', 'About', 'Writing', 'Contact'].map(label => ({label,
    href: label === 'Home' ? '/index.html' : `/${label.toLowerCase()}.html`, active: label === active}));
}

function absoluteURL(value, base) {
  return new URL(value, `${base.replace(/\/$/, '')}/`).href;
}

function resolveLegacyURL(value, legacyPath = '/work/case-file.html') {
  if (!value || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value)) return value;
  const url = new URL(value, `https://site.invalid${legacyPath}`);
  const piece = WORK_PIECES.find(piece => piece.slug === url.searchParams.get('slug'));
  if (url.pathname === '/work/case-file.html' && piece &&
      (!url.searchParams.has('category') || url.searchParams.get('category') === piece.category)) {
    return `/work/${url.searchParams.get('slug')}/` + url.hash;
  }
  if (url.pathname === '/writing/post.html' && WRITING_SLUGS.includes(url.searchParams.get('slug'))) return `/writing/${url.searchParams.get('slug')}/` + url.hash;
  return url.pathname + url.search + url.hash;
}

function createMarkdown() {
  const md = new MarkdownIt({ html: true });
  // Parse math before Markdown can consume TeX backslashes. Code blocks and
  // inline code continue to use Markdown's native rules.
  md.inline.ruler.after('escape', 'tex-inline', (state, silent) => {
    if (state.src[state.pos] !== '$' || state.src[state.pos + 1] === '$') return false;
    let end = state.pos + 1;
    while ((end = state.src.indexOf('$', end)) !== -1 && state.src[end - 1] === '\\') end++;
    if (end < 0 || state.src.slice(state.pos + 1, end).includes('\n')) return false;
    if (!silent) {
      const token = state.push('tex-inline', 'math', 0);
      token.content = state.src.slice(state.pos + 1, end);
    }
    state.pos = end + 1;
    return true;
  });
  md.block.ruler.before('paragraph', 'tex-display', (state, startLine, endLine, silent) => {
    const start = state.bMarks[startLine] + state.tShift[startLine];
    if (state.src.slice(start, start + 2) !== '$$') return false;
    const close = state.src.indexOf('$$', start + 2);
    if (close < 0) throw new Error('Unclosed display equation');
    let nextLine = startLine;
    while (nextLine < endLine && state.eMarks[nextLine] < close + 2) nextLine++;
    if (state.src.slice(close + 2, state.eMarks[nextLine]).trim()) return false;
    if (!silent) {
      const token = state.push('tex-display', 'math', 0);
      token.block = true;
      token.content = state.src.slice(start + 2, close).trim();
      token.map = [startLine, nextLine + 1];
    }
    state.line = nextLine + 1;
    return true;
  });
  md.renderer.rules['tex-inline'] = (tokens, index) => katex.renderToString(tokens[index].content, {
    displayMode: false, throwOnError: true, output: 'htmlAndMathml', trust: false
  });
  md.renderer.rules['tex-display'] = (tokens, index) => katex.renderToString(tokens[index].content, {
    displayMode: true, throwOnError: true, output: 'htmlAndMathml', trust: false
  });
  return md;
}

function imageDimensions(src) {
  const localPath = path.resolve(ROOT, `.${new URL(src, 'https://site.invalid').pathname}`);
  if (!localPath.startsWith(ROOT + path.sep)) throw new Error(`Invalid image path: ${src}`);
  const result = imageSize(fs.readFileSync(localPath));
  return { width: result.width, height: result.height };
}

function prepareHTML(html, { eagerFirst = false, legacyPath = '/work/case-file.html' } = {}) {
  const $ = cheerio.load(html, { xml: false }, false);
  $('[href], [src], [poster]').each((_, element) => {
    for (const attr of ['href', 'src', 'poster']) {
      const value = $(element).attr(attr);
      if (value) $(element).attr(attr, resolveLegacyURL(value, legacyPath));
    }
  });
  const previews = {
    'cylinder.vtp': ['work_assets_hypersonics/hero-2-cylinder-mach.png', 'Mach number field around the Mach 6 cylinder'],
    'typeI.vtp': ['work_assets_hypersonics/hero-4-typeI-regular-reflection.png', 'Type I regular shock reflection'],
    'typeII.vtp': ['work_assets_hypersonics/hero-1-typeII-mach-interaction.png', 'Type II Mach interaction'],
    'intake.vtp': ['work_assets_hypersonics/hero-3-intake-geometry.png', 'Single-ramp intake geometry'],
    'dandelion-seed.stl': ['work_assets_dandelion_seed/dandelion-mesh-overview.png', 'Resolved pappus mesh with 42 filaments'],
    'nimbus_aircraft.glb': ['work_assets_nimbus/nimbus-hero.jpg', 'Nimbus conceptual airframe'],
    'baseline.stl': ['work_assets_fossee_uav_cfd/fossee-uav-isometric-geometry.png', 'Baseline UAV geometry'],
    'cant45.stl': ['work_assets_fossee_uav_cfd/fossee-uav-winglet-geometry.png', 'Winglet geometry comparison; inspect the 45-degree variant in the original STL'],
    'cant90.stl': ['work_assets_fossee_uav_cfd/fossee-uav-winglet-geometry.png', 'Winglet geometry comparison; inspect the 90-degree variant in the original STL']
  };
  $('vtk-reader, stl-reader, scroll-reveal-viewer, video-embed').each((_, element) => {
    const viewer = $(element);
    if (viewer.parent().is('p') && viewer.parent().children().length === 1 && !viewer.parent().text().trim()) viewer.unwrap();
    const href = viewer.attr('href') || viewer.attr('src') || viewer.find('reveal-frame[href]').first().attr('href');
    const preview = previews[path.basename(href || '')];
    const src = viewer.attr('poster') || (preview && `/assets/media/${preview[0]}`);
    if (!href) throw new Error('Missing scientific source');
    const label = viewer.attr('label') || preview?.[1] || 'Scientific media';
    const figure = $('<figure class="scientific-fallback"></figure>');
    if (src) figure.append($('<img>').attr({src, alt: label}));
    figure.append($('<figcaption></figcaption>').text(`${label}. Static reference; use the viewer for interactive inspection. `)
      .append($('<a>Download original file</a>').attr('href', href)));
    viewer.wrap('<div class="scientific-media" data-media-state="pending"></div>');
    viewer.attr({'aria-hidden': 'true', inert: ''});
    const reference = $('<div class="media-reference"></div>').append(figure);
    viewer.after(reference);
    if (viewer.is('scroll-reveal-viewer')) {
      const captions = $('<details class="model-captions"><summary>Read the airframe tour</summary></details>');
      viewer.find('reveal-caption').each((_, caption) => captions.append($('<section></section>').html($(caption).html())));
      reference.append(captions);
    }
  });
  $('img').each((index, element) => {
    const image = $(element);
    const src = image.attr('src');
    if (src?.startsWith('/assets/')) image.attr(imageDimensions(src));
    image.attr({ loading: eagerFirst && index === 0 ? 'eager' : 'lazy', decoding: 'async' });
  });
  // Keep every carousel slide and caption readable if its script fails.
  $('hero-carousel > img').each((_, element) => {
    const image = $(element);
    const caption = image.attr('data-caption');
    image.wrap('<figure class="carousel-fallback"></figure>');
    if (caption) image.parent().append($('<figcaption class="md-caption"></figcaption>').text(caption));
  });
  $('span.md-caption').each((_, element) => {
    const caption = $(element);
    const container = caption.parent().is('p') && caption.parent().children().length === 1
      ? caption.parent() : caption;
    const previous = container.prev();
    if (previous.is('img, .md-figure-row') || (previous.is('p') && previous.children('img').length)) {
      previous.wrap('<figure></figure>');
      previous.parent().append($('<figcaption class="md-caption"></figcaption>').html(caption.html()));
      container.remove();
    }
  });
  $('table').wrap('<div class="table-scroll" tabindex="0" role="region" aria-label="Scientific data table"></div>');
  const usedIds = new Set();
  const headings = [];
  $('h2, h3, h4, h5, h6').each((_, element) => {
    const heading = $(element);
    // Viewer captions are transient UI, not navigable article sections.
    if (heading.closest('reveal-frame, .model-captions').length) return;
    const title = heading.text();
    const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    let id = base;
    for (let n = 2; usedIds.has(id); n++) id = `${base}-${n}`;
    usedIds.add(id);
    heading.attr('id', id);
    headings.push({ title, id, level: element.tagName });
  });
  // Keep complete data downloadable without expanding a long table in the article.
  $('plotly-chart').each((_, element) => {
    const chart = $(element);
    const href = chart.attr('href');
    const downloads = $('<p class="chart-downloads">Chart data: </p>');
    downloads.append($('<a>Download CSV</a>').attr({href: href.replace(/\.json$/, '.csv'), download: path.basename(href).replace(/\.json$/, '.csv')}));
    chart.after(downloads);
  });
  $('img').each((_, element) => {
    const image = $(element);
    if (!image.closest('a').length && image.attr('src')) {
      image.wrap($('<a class="figure-open"></a>').attr({ href: image.attr('src'), 'aria-label': `Enlarge image: ${image.attr('alt') || 'figure'}` }));
    }
  });
  return { html: $.html(), headings };
}

function projectData(slug) {
  const site = readJSON('site.json');
  const pieces = WORK_PIECES;
  const piece = pieces.find(item => item.slug === slug);
  if (!piece) throw new Error(`Project metadata missing: ${slug}`);
  const source = fs.readFileSync(path.join(ROOT, 'content/work', `${slug}.md`), 'utf8');
  const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---\s*/, '');
  const prepared = prepareHTML(createMarkdown().render(body));
  const heroDOM = cheerio.load('<hero-carousel fit="contain"></hero-carousel>', {}, false);
  const carousel = heroDOM('hero-carousel').attr({ interval: piece.hero_interval, label: piece.title });
  for (const slide of piece.hero_slides || []) {
    carousel.append(heroDOM('<img>').attr({ src: `/${slide.src}`, alt: slide.caption, 'data-caption': slide.caption }));
  }
  let heroSource = heroDOM.html();
  const mediaExists = piece.media_src && fs.existsSync(path.join(ROOT, piece.media_src));
  if (piece.media_type === 'image') heroSource = mediaExists ? cheerio.load('<img>', {}, false)('img').attr({src:`/${piece.media_src}`,alt:piece.title}).toString() : '';
  if (piece.media_type === 'video') {
    const heroVideo = cheerio.load('<video-embed></video-embed>', {}, false);
    if (mediaExists) {
      heroVideo('video-embed').attr({src:`/${piece.media_src}`,label:piece.title,fit:piece.media_fit || 'contain',autoplay:String(piece.media_autoplay || false),loop:String(piece.media_loop || false),controls:String(piece.media_controls !== false)});
      if (piece.thumbnail && fs.existsSync(path.join(ROOT, piece.thumbnail))) heroVideo('video-embed').attr('poster',`/${piece.thumbnail}`);
      heroSource = heroVideo.html();
    } else heroSource = '';
  }
  const hero = prepareHTML(heroSource, { eagerFirst: true }).html;
  const index = pieces.indexOf(piece);
  const related = pieces.filter(item => item.category === piece.category && item.slug !== slug).slice(0, 3);
  const legacyLink = item => item && ({ ...item, thumbnail: fs.existsSync(path.join(ROOT, item.thumbnail)) ? `/${item.thumbnail}` : '/assets/media/og-banner.jpg', thumbnailDimensions: imageDimensions(`/${fs.existsSync(path.join(ROOT, item.thumbnail)) ? item.thumbnail : 'assets/media/og-banner.jpg'}`), href: resolveLegacyURL(`case-file.html?slug=${item.slug}&category=${item.category}`) });
  const supportingDOM = cheerio.load('<div class="case-supporting-grid"></div>', {}, false);
  for (const src of piece.supporting_media || []) {
    const slide = (piece.hero_slides || []).find(item => item.src === src);
    const caption = slide?.caption || `Supporting visualization for ${piece.title}`;
    const figure = supportingDOM('<figure></figure>');
    figure.append(supportingDOM('<img>').attr({src: `/${src}`, alt: caption}));
    if (slide) figure.append(supportingDOM('<figcaption></figcaption>').text(caption));
    supportingDOM('.case-supporting-grid').append(figure);
  }
  const supporting = (piece.supporting_media || []).length ? prepareHTML(supportingDOM.html()).html : '';
  const route = `/work/${slug}/`;
  const dom = cheerio.load(prepared.html + hero);
  const scripts = ['hero-carousel', 'plotly-chart', 'vtk-reader', 'stl-reader', 'video-embed', 'scroll-reveal-viewer']
    .filter(tag => dom(tag).length || (tag === 'hero-carousel' && piece.media_type === 'carousel') || (tag === 'stl-reader' && dom('scroll-reveal-viewer').length)).map(tag => `${tag}.js`);
  const description = piece.description || cheerio.load(prepared.html)('p').first().text().slice(0, 180) || piece.title;
  return {
    site, piece: {...piece, links: piece.links.map(link => ({...link, url: resolveLegacyURL(link.url.startsWith('assets/') ? `/${link.url}` : link.url)}))}, body: prepared.html, hero, headings: prepared.headings,
    supporting, related: related.map(legacyLink), previous: legacyLink(pieces[index - 1]), next: legacyLink(pieces[index + 1]),
    canonical: absoluteURL(route, site.site_url),
    structuredData: JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Article',
      headline: piece.title,
      author: { '@type': 'Person', name: site.name, url: site.site_url },
      mainEntityOfPage: absoluteURL(route, site.site_url),
      image: absoluteURL(`/${fs.existsSync(path.join(ROOT,piece.thumbnail)) ? piece.thumbnail : 'assets/media/og-banner.jpg'}`, site.site_url),
      inLanguage: 'en'
    }).replaceAll('<', '\\u003c'),
    description,
    socialImage: fs.existsSync(path.join(ROOT,piece.thumbnail)) ? piece.thumbnail : 'assets/media/og-banner.jpg',
    scripts, needsThree: scripts.includes('stl-reader.js'), hasMath: dom('math').length > 0,
    year: new Date().getFullYear(),
    navigation: navigationData('Work')
  };
}

module.exports = { ROOT, WORK_SLUGS, WORK_PIECES, WRITING_SLUGS, navigationData, absoluteURL, resolveLegacyURL, createMarkdown, prepareHTML, projectData };
