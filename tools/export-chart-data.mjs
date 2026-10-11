import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const { ROOT }=require('./site-build.cjs');
const { chartCSV }=require('./chart-csv.cjs');
let count=0;
function exportDirectory(directory) {
  for (const entry of fs.readdirSync(directory,{withFileTypes:true})) {
    const file=path.join(directory,entry.name);
    if (entry.isDirectory()) exportDirectory(file);
    else if (entry.name.endsWith('.json')) {
      const dataset=JSON.parse(fs.readFileSync(file,'utf8'));
      if (!Array.isArray(dataset.data)) continue;
      const csv=chartCSV(dataset);
      fs.writeFileSync(file.replace(/\.json$/,'.csv'),csv);
      const original=path.join(ROOT,path.relative(path.join(ROOT,'_site'),file));
      if (!fs.readFileSync(file).equals(fs.readFileSync(original))) throw new Error(`Original JSON changed: ${file}`);
      count++;
    }
  }
}
exportDirectory(path.join(ROOT,'_site/content/data'));
console.log(`Exported ${count} complete chart CSV files; original JSON retained.`);
