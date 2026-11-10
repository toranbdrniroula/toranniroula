const {load}=require('cheerio');
const limit=200000;
const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function parseCSV(text){
 if(typeof text!=='string'||Buffer.byteLength(text)>20*1024*1024)throw Error('Choose a CSV smaller than 20 MB.');
 text=text.replace(/^\uFEFF/,'');const rows=[];let row=[],cell='',quoted=false,closed=false;
 const finish=()=>{row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell='';closed=false;};
 for(let i=0;i<text.length;i++){
  const c=text[i];if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
  if(c==='"'){if(cell||closed)throw Error('CSV contains an unexpected quote.');quoted=true;}
  else if(c===','){row.push(cell);cell='';closed=false;}
  else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;finish();}
  else {if(closed&&!/\s/.test(c))throw Error('CSV contains text after a closing quote.');if(!closed)cell+=c;}
 }
 if(quoted)throw Error('CSV has an unclosed quoted cell.');if(cell||row.length)finish();
 if(rows.length<2)throw Error('CSV needs a header row and at least one data row.');
 const headers=rows.shift().map(s=>s.trim());if(headers.some(s=>!s)||new Set(headers).size!==headers.length)throw Error('Give every CSV column a unique name.');
 if(rows.length>limit)throw Error('Use at most 200,000 points.');if(rows.some(r=>r.length!==headers.length))throw Error('CSV rows must have the same number of columns as the header.');
 return {headers,rows};
}
const numeric=(value,row,column)=>{if(String(value).trim()===''||!Number.isFinite(Number(value)))throw Error(`Row ${row}, ${column}: enter a finite number.`);return Number(value);};
function chartFromCSV({text,kind='scatter3d',columns={},labels={},title=''}){
 if(!['scatter3d','line3d','surface'].includes(kind))throw Error('Choose points, a line or a surface.');
 const {headers,rows}=parseCSV(text);const indices=['x','y','z'].map(axis=>headers.indexOf(columns[axis]));
 if(indices.some(i=>i<0)||new Set(indices).size!==3)throw Error('Choose three different columns for X, Y and Z.');
 const points=rows.map((row,n)=>indices.map(i=>numeric(row[i],n+2,headers[i])));
 let trace={type:'scatter3d',mode:kind==='line3d'?'lines':'markers',x:points.map(p=>p[0]),y:points.map(p=>p[1]),z:points.map(p=>p[2])};
 if(kind==='surface'){
  const x=[...new Set(trace.x)].sort((a,b)=>a-b),y=[...new Set(trace.y)].sort((a,b)=>a-b);
  if(x.length<2||y.length<2||x.length*y.length!==points.length)throw Error('A surface needs a complete rectangular grid, with one Z value at each X/Y pair. Choose points for scattered data.');
  const xi=new Map(x.map((v,i)=>[v,i])),yi=new Map(y.map((v,i)=>[v,i]));const z=y.map(()=>Array(x.length).fill(null));
  for(const [a,b,c] of points){if(z[yi.get(b)][xi.get(a)]!==null)throw Error('Surface CSV has duplicate X/Y coordinates.');z[yi.get(b)][xi.get(a)]=c;}
  if(z.some(row=>row.includes(null)))throw Error('Surface grid has a missing X/Y pair.');trace={type:'surface',x,y,z};
 }
 const scene=Object.fromEntries(['x','y','z'].map((axis,i)=>[axis+'axis',{title:{text:labels[axis]||headers[indices[i]]}}]));
 const dataset={data:[trace],layout:{title:{text:title},scene}};validateChart(dataset);return dataset;
}
function validateChart(dataset){
 if(!dataset||!Array.isArray(dataset.data)||!dataset.data.length||dataset.data.length>30)throw Error('Plotly JSON needs a nonempty data array with at most 30 traces.');
 let points=0;
 const numbers=(values,label)=>{if(!Array.isArray(values)||!values.length||values.some(v=>typeof v!=='number'||!Number.isFinite(v)))throw Error(label+' must contain finite numbers.');};
 for(const trace of dataset.data){
  if(trace.type==='scatter3d'){
   for(const axis of ['x','y','z'])numbers(trace[axis],axis);if(trace.x.length!==trace.y.length||trace.x.length!==trace.z.length)throw Error('X, Y and Z arrays must have equal lengths.');points+=trace.x.length;
  }else if(trace.type==='surface'){
   numbers(trace.x,'Surface X');numbers(trace.y,'Surface Y');if(!Array.isArray(trace.z)||trace.z.length!==trace.y.length)throw Error('Surface Z rows must match Y.');
   for(const row of trace.z){numbers(row,'Surface Z');if(row.length!==trace.x.length)throw Error('Surface Z columns must match X.');}points+=trace.x.length*trace.y.length;
  }else throw Error('Import scatter3d or surface traces. Export your other charts using the existing Plotly workflow.');
 }
 if(points>limit)throw Error('Use at most 200,000 points across the chart.');
 if(dataset.frames)throw Error('Animated JSON is not supported by this importer.');
 return points;
}
function cleanDiagram(xml,svg){
 if(typeof xml!=='string'||Buffer.byteLength(xml)>5*1024*1024||/<!DOCTYPE|<!ENTITY|<\?xml-stylesheet/i.test(xml))throw Error('Use a draw.io XML file smaller than 5 MB without external entities.');
 const source=load(xml,{xmlMode:true});const roots=source.root().children();if(roots.length!==1||!['mxfile','mxGraphModel'].includes(roots[0].name))throw Error('Choose a draw.io XML diagram.');
 if(typeof svg!=='string'||Buffer.byteLength(svg)>10*1024*1024||/<!DOCTYPE|<!ENTITY|<\?xml-stylesheet/i.test(svg))throw Error('Use an SVG export smaller than 10 MB.');
 const $=load(svg,{xmlMode:true});const root=$.root().children();if(root.length!==1||root[0].name!=='svg')throw Error('The editor did not return an SVG image.');
 // Store a passive image. Retain draw.io HTML labels, but remove executable markup and external resources.
 $('*').each((_,node)=>{
  const name=node.name.toLowerCase().split(':').pop();if(['script','iframe','object','embed','link','style','animate','animatetransform','animatemotion','set','audio','video','form','input','button','use'].includes(name)){$(node).remove();return;}
  for(const [attribute,value] of Object.entries(node.attribs||{})){
   const key=attribute.toLowerCase();if(key.startsWith('on')||['content','srcdoc','xml:base'].includes(key))$(node).removeAttr(attribute);
   else if(key==='href'||key==='xlink:href'||key==='src'){
    if(!(value.startsWith('#')||(/^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(value)&&name==='image')))$(node).removeAttr(attribute);
   }else if(key==='style'&&/url\s*\(|expression\s*\(|@import|behavior\s*:|-moz-binding/i.test(value))$(node).removeAttr(attribute);
   else if(/url\s*\(/i.test(value)&&!/^(?:url\(#[a-z0-9_.:-]+\))$/i.test(value))$(node).removeAttr(attribute);
  }
 });
 root.attr('xmlns','http://www.w3.org/2000/svg');root.removeAttr('content');return {xml,svg:$.xml()};
}
function chartSnippet(file,title){return `\n\n<plotly-chart href="${escapeHTML(file)}" height="520" title="${escapeHTML(title)}"></plotly-chart>\n\n`;}
function diagramSnippet(image,source,title){return `\n\n<figure>\n  <img src="${escapeHTML(image)}" alt="${escapeHTML(title)}" loading="lazy">\n  <figcaption>${escapeHTML(title)} · <a href="${escapeHTML(source)}" download>Download editable diagram</a></figcaption>\n</figure>\n\n`;}
module.exports={parseCSV,chartFromCSV,validateChart,cleanDiagram,chartSnippet,diagramSnippet};
