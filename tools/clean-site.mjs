import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.resolve(root, '_site');
if (path.dirname(output) !== root || path.basename(output) !== '_site') {
  throw new Error('Refusing to remove a directory outside the generated site.');
}
await rm(output, { recursive: true, force: true });
