import { readdir, lstat, readFile } from 'node:fs/promises';
import { load } from 'cheerio';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '_site');
let bytes = 0;
let files = 0;
const paths = new Set();
async function inspect(directory) {
  const entries = await readdir(directory);
  const names = new Set();
  for (const name of entries) {
    const folded = name.toLowerCase();
    if (names.has(folded)) throw new Error(`Case-colliding artifact path: ${directory}/${name}`);
    names.add(folded);
    if (['.git', 'node_modules', '.qa', '.env'].includes(folded)) {
      throw new Error(`Unexpected private/build directory in artifact: ${name}`);
    }
    const target = path.join(directory, name);
    const stat = await lstat(target);
    if (stat.isSymbolicLink() || (stat.isFile() && stat.nlink > 1)) {
      throw new Error(`Pages artifacts cannot contain links: ${target}`);
    }
    if (stat.isDirectory()) await inspect(target);
    else if (stat.isFile()) {
      bytes += stat.size; files++;
      paths.add(path.relative(root, target).split(path.sep).join('/'));
    }
    else throw new Error(`Unsupported artifact entry: ${target}`);
  }
}
await inspect(root);
for (const file of paths) {
  if (!file.endsWith('.html')) continue;
  const page = load(await readFile(path.join(root, file), 'utf8'));
  if (!page('body[data-static-project]').length) continue;
  page('[href],[src],[poster]').each((_, element) => {
    for (const attr of ['href', 'src', 'poster']) {
      const value = page(element).attr(attr);
      if (!value || value.startsWith('#') || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value)) continue;
      const url = new URL(value, `https://site.invalid/${file}`);
      let target = decodeURIComponent(url.pathname).replace(/^\//, '');
      if (url.pathname.endsWith('/')) target += 'index.html';
      if (!paths.has(target)) throw new Error(`${file}: local URL has missing or incorrect case: ${value}`);
    }
  });
}
if (bytes >= 1_000_000_000) throw new Error('Generated site exceeds the 1 GB Pages size limit.');
console.log(`Pages artifact checked: ${files} files, ${(bytes / 1024 / 1024).toFixed(1)} MiB; no filesystem links.`);
