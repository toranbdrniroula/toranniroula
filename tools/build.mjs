import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
for (const script of ['tools/clean-site.mjs','node_modules/@11ty/eleventy/cmd.cjs','tools/finalize-site.mjs','tools/export-chart-data.mjs','tools/validate-site.mjs','tools/check-artifact.mjs']) {
  const result=spawnSync(process.execPath,[path.join(root,script)],{cwd:root,stdio:'inherit'});
  if (result.error) throw result.error;
  if (result.status!==0) process.exit(result.status || 1);
}
