// Writing list renderer – fetches manifest and renders list, renders individual post.
// Post metadata lives in content/writing-index.json (not hardcoded here) so a
// content-file edit is all that's needed to add/reorder/re-thumbnail a post.

let _writingIndexCache = null;

async function loadWritingIndex(relPrefix) {
  if (_writingIndexCache) return _writingIndexCache;
  _writingIndexCache = await loadContentJSON(relPrefix, 'writing-index.json');
  return _writingIndexCache;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Adds a copy-to-clipboard button to every fenced code block and runs
// highlight.js over them for syntax coloring. Safe to call even if
// highlight.js hasn't loaded (e.g. offline/CDN blocked) -- coloring is
// then skipped but the copy button still works.
function enhanceCodeBlocks(containerEl) {
  if (!containerEl) return;
  containerEl.querySelectorAll('pre > code').forEach(codeEl => {
    if (typeof window.hljs !== 'undefined') {
      window.hljs.highlightElement(codeEl);
    }

    const pre = codeEl.parentElement;
    if (pre.parentElement && pre.parentElement.classList.contains('code-block')) return; // already wired

    const wrapper = document.createElement('div');
    wrapper.className = 'code-block';
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'code-copy-btn';
    button.textContent = 'Copy';
    button.addEventListener('click', () => {
      navigator.clipboard.writeText(codeEl.textContent).then(() => {
        button.textContent = 'Copied';
        button.classList.add('copied');
        setTimeout(() => {
          button.textContent = 'Copy';
          button.classList.remove('copied');
        }, 1600);
      }).catch(() => {
        button.textContent = 'Failed';
        setTimeout(() => { button.textContent = 'Copy'; }, 1600);
      });
    });
    wrapper.appendChild(button);
  });
}

// Display labels for known categories -- anything not listed here (e.g. a
// brand-new category value) just gets title-cased automatically by
// tag-filter.js, so this map is an optional nicety, not a requirement.
const CATEGORY_LABELS = { technical: 'Technical', reflection: 'Reflections' };

function renderWritingEntries(container, posts, relPrefix) {
  const sorted = [...posts].sort((a, b) => b.date.localeCompare(a.date));
  container.innerHTML = sorted.length ? sorted.map((post, i) => `
    <a class="writing-entry${i % 2 ? ' reverse' : ''}" href="${relPrefix}writing/post.html?slug=${encodeURIComponent(post.slug)}">
      ${post.thumbnail ? `<img class="writing-entry-thumb" src="${relPrefix}${post.thumbnail}" alt="" loading="lazy">` : ''}
      <div class="writing-entry-body">
        <div class="writing-entry-title">${post.title}</div>
        <div class="writing-entry-meta">${formatDate(post.date)}</div>
        <div class="writing-entry-excerpt">${post.excerpt}</div>
        <span class="writing-entry-link">Read &rarr;</span>
      </div>
    </a>
  `).join('') : '<p style="color:var(--color-text-muted);padding:20px 0">Nothing here yet.</p>';
}

async function renderWritingList(containerId, relPrefix, category) {
  const container = document.getElementById(containerId);
  if (!container) return;
  try {
    const posts = await loadWritingIndex(relPrefix);
    const filtered = (category && category !== 'all')
      ? posts.filter(p => p.category === category)
      : posts;
    renderWritingEntries(container, filtered, relPrefix);
  } catch (err) {
    console.error(err);
    container.innerHTML = '<p style="color:var(--color-text-muted);padding:40px 0">Unable to load writing list right now.</p>';
  }
}

// Renders an "All / Technical / Reflections / ..." tab bar above the
// writing list via the shared tag-filter.js helper, and re-renders the list
// on click. New categories (added to writing-index.json) get their own
// pill automatically -- nothing here needs to change.
async function renderWritingFilter(filterContainerId, listContainerId, relPrefix) {
  const listEl = document.getElementById(listContainerId);
  if (!listEl) return;
  try {
    const posts = await loadWritingIndex(relPrefix);
    renderTagFilter(
      filterContainerId,
      listContainerId,
      posts,
      cat => CATEGORY_LABELS[cat],
      (el, filtered) => renderWritingEntries(el, filtered, relPrefix)
    );
  } catch (err) {
    console.error(err);
    listEl.innerHTML = '<p style="color:var(--color-text-muted);padding:40px 0">Unable to load writing list right now.</p>';
  }
}

async function renderPost(relPrefix) {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');
  const root = document.getElementById('post-root');
  if (!root || !slug) return;

  let posts;
  try {
    posts = await loadWritingIndex(relPrefix);
  } catch (err) {
    console.error(err);
    root.innerHTML = '<p style="color:var(--color-text-muted);padding:40px 0">Unable to load this post.</p>';
    return;
  }

  const meta = posts.find(p => p.slug === slug);
  if (!meta) {
    root.innerHTML = '<p style="color:var(--color-text-muted);padding:40px 0">Post not found.</p>';
    return;
  }

  document.title = meta.title + ' – Toran Bahadur Niroula';
  updateMetaDescription(meta.excerpt || meta.title);

  try {
    const raw = await loadContentText(relPrefix, 'writing/' + slug + '.md');
    // strip YAML frontmatter
    const body = raw.replace(/^---[\s\S]*?---\s*/m, '');
    const html = (typeof marked !== 'undefined') ? marked.parse(body) : body.replace(/\n/g, '<br>');
    const pdfLink = meta.pdf
      ? `<a class="post-pdf-link" href="${relPrefix}${meta.pdf}" target="_blank" rel="noopener">Download the full PDF &darr;</a>`
      : '';
    root.innerHTML = `
      <header class="post-header">
        <h1 class="post-title">${meta.title}</h1>
        <p class="post-meta">${formatDate(meta.date)}</p>
        ${pdfLink}
      </header>
      <article class="post-body">${html}</article>
      <a class="back-link" href="${relPrefix}writing.html" style="display:inline-block;margin-bottom:60px;">&larr; All writing</a>
    `;

    const postBodyEl = root.querySelector('.post-body');
    enhanceCodeBlocks(postBodyEl);

    if (typeof window.renderMathInElement === 'function') {
      if (postBodyEl) {
        window.renderMathInElement(postBodyEl, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false }
          ],
          throwOnError: false
        });
      }
    }
  } catch (err) {
    console.error(err);
    root.innerHTML = '<p style="color:var(--color-text-muted);padding:40px 0">Unable to load this post.</p>';
  }
}
