const fs=require('node:fs');const path=require('node:path');
const {parseCSV,validateChart}=require('./science.cjs');
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const extensions={model:['.stl','.glb'],field:['.vtp'],plot:['.json'],image:['.png','.jpg','.jpeg','.webp','.gif']};
function asset(root,value,kind,{optional=false}={}){
 if(optional&&!value)return '';
 if(typeof value!=='string'||!/^\/(assets|content\/data)\/[a-z0-9_./-]+$/i.test(value)||value.includes('..'))throw Error('Choose a file already in the website or import one from your computer.');
 const target=path.resolve(root,'.'+value);if(!target.startsWith(path.resolve(root)+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile())throw Error('This website file does not exist.');
 if(!extensions[kind]?.includes(path.extname(value).toLowerCase()))throw Error('That file does not match this component.');return value;
}
function validatePlot(data){
 if(!data||!Array.isArray(data.data)||!data.data.length)throw Error('Use Plotly JSON containing a data array.');
 if(data.data.every(t=>['scatter3d','surface'].includes(t.type)))return validateChart(data);
 let count=0;if(data.data.length>30)throw Error('Use at most 30 traces.');
 for(const trace of data.data){
  if(!['scatter','bar'].includes(trace.type||'scatter')||!Array.isArray(trace.x)||!Array.isArray(trace.y)||!trace.x.length||trace.x.length!==trace.y.length)throw Error('Use scatter or bar traces with equal-length X/Y arrays, or the 3D plot importer.');
  if(trace.x.some(v=>!(typeof v==='string'||typeof v==='number'&&Number.isFinite(v)))||trace.y.some(v=>v!==null&&(typeof v!=='number'||!Number.isFinite(v))))throw Error('X values must be numbers or labels; Y values must be numbers or null gaps.');count+=trace.x.length;
 }
 if(count>200000)throw Error('Use at most 200,000 points.');if(data.frames)throw Error('Animated plots need a separately configured viewer.');return count;
}
function plotFromCSV(input){
 const {headers,rows}=parseCSV(input.text);const x=headers.indexOf(input.x),y=headers.indexOf(input.y);
 if(x<0||y<0||x===y)throw Error('Choose two different columns.');
 if(!['lines','markers','lines+markers','bar'].includes(input.style))throw Error('Choose a supported plot style.');
 const data={data:[{type:input.style==='bar'?'bar':'scatter',...(input.style==='bar'?{}:{mode:input.style}),x:rows.map(r=>r[x].trim()!==''&&Number.isFinite(Number(r[x]))?Number(r[x]):r[x]),y:rows.map((r,i)=>{if(r[y].trim()===''||!Number.isFinite(Number(r[y])))throw Error('Row '+(i+2)+' needs a numerical Y value.');return Number(r[y]);})}],layout:{title:{text:String(input.title||'Plot')},xaxis:{title:{text:String(input.xLabel||input.x)}},yaxis:{title:{text:String(input.yLabel||input.y)}}}};
 validatePlot(data);return data;
}
function buildComponent(root,input){
 const title=String(input.title||'').trim();if(!title)throw Error('Give this component a descriptive title.');if(title.length>180)throw Error('Keep the title under 180 characters.');
 const height=Number(input.height??480);if(!Number.isInteger(height)||height<200||height>1200)throw Error('Choose a height between 200 and 1,200 pixels.');
 let html;
 if(input.kind==='model'||input.kind==='field'){
  const file=asset(root,input.source,input.kind),poster=asset(root,input.poster,'image',{optional:true});
  const common=`href="${escape(file)}" label="${escape(title)}" height="${height}"${poster?` poster="${escape(poster)}"`:''}`;
  if(input.kind==='model'){
   const color=input.color||'#4fa3d1';if(!/^#[a-f0-9]{6}$/i.test(color))throw Error('Choose a six-digit model color.');
   html=`<stl-reader ${common} surface-color="${color}" auto-rotate="${input.rotate===true}"></stl-reader>`;
  }else{
   const map=input.colormap||'rainbow';if(!['rainbow','viridis','plasma','inferno','magma','jet','turbo','warm cold','grayscale'].includes(map))throw Error('Choose a supported color map.');
   html=`<vtk-reader ${common} field="${escape(input.field||'user-defined')}" colormap="user-defined" initial-colormap="${map}" interactive="true" clipping="${input.clipping!==false}" threshold="${input.threshold!==false}"></vtk-reader>`;
  }
 }else if(input.kind==='plot'){
  const file=asset(root,input.source,'plot');validatePlot(JSON.parse(fs.readFileSync(path.join(root,file),'utf8')));
  html=`<plotly-chart href="${escape(file)}" title="${escape(title)}" height="${height}"></plotly-chart>`;
 }else if(input.kind==='carousel'){
  if(!Array.isArray(input.slides)||input.slides.length<2||input.slides.length>30)throw Error('Choose between 2 and 30 carousel images.');
  const interval=Number(input.interval??5000);if(!Number.isInteger(interval)||interval<2000||interval>30000)throw Error('Choose a slide interval between 2 and 30 seconds.');
  const slides=input.slides.map(slide=>{const file=asset(root,slide.source,'image'),caption=String(slide.caption||'').trim();if(!caption)throw Error('Add a caption for each slide.');return `  <img src="${escape(file)}" alt="${escape(caption)}" data-caption="${escape(caption)}" loading="lazy">`;});
  html=`<hero-carousel label="${escape(title)}" fit="contain" interval="${interval}" autoplay="${input.autoplay===true}">\n${slides.join('\n')}\n</hero-carousel>`;
 }else throw Error('Choose a supported component.');
 return '\n\n'+html+'\n\n';
}
function listAssets(root,kind){
 if(!extensions[kind])throw Error('Choose a supported file type.');const files=[];
 function walk(directory){if(!fs.existsSync(directory))return;for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
  if(entry.isSymbolicLink())continue;const target=path.join(directory,entry.name);if(entry.isDirectory()){if(entry.name!=='vendor')walk(target);}
  else if(extensions[kind].includes(path.extname(entry.name).toLowerCase())){
   const file='/'+path.relative(root,target).split(path.sep).join('/');if(!/^\/[a-z0-9_./-]+$/i.test(file))continue;
   if(kind==='plot'){if(/-original\.json$/.test(file))continue;try{const d=JSON.parse(fs.readFileSync(target,'utf8'));validatePlot(d);}catch{continue;}}
   files.push({path:file,name:entry.name,bytes:fs.statSync(target).size});
  }
 }}
 walk(path.join(root,'assets'));walk(path.join(root,'content/data'));return files.sort((a,b)=>a.path.localeCompare(b.path));
}
function importComponentAsset(root,input,digest){
 const extension=path.extname(String(input.name)).toLowerCase(),kind=Object.keys(extensions).find(k=>k!=='plot'&&extensions[k].includes(extension));if(!kind)throw Error('Import STL, GLB, VTP or an image.');
 const bytes=Buffer.from(String(input.base64||''),'base64');if(!bytes.length||bytes.length>40*1024*1024)throw Error('Use a file smaller than 40 MB.');
 if(extension==='.glb'&&(bytes.length<12||bytes.toString('ascii',0,4)!=='glTF'||bytes.readUInt32LE(4)!==2||bytes.readUInt32LE(8)!==bytes.length))throw Error('Choose a valid binary glTF 2.0 (.glb) model.');
 if(extension==='.stl'){
  const binary=bytes.length>=84&&84+50*bytes.readUInt32LE(80)===bytes.length,ascii=/^\s*solid\b/i.test(bytes.subarray(0,100).toString())&&/facet\s+normal/i.test(bytes.toString());if(!binary&&!ascii)throw Error('Choose a valid ASCII or binary STL.');
 }
 if(extension==='.vtp'){const text=bytes.toString();if(!/<VTKFile\b[^>]*\btype\s*=\s*["']PolyData["']/i.test(text)||/<!DOCTYPE|<!ENTITY|<\?xml-stylesheet/i.test(text))throw Error('Choose a VTK PolyData (.vtp) file. VTU is not supported by the current viewer.');}
 const name=String(input.name).replace(/[^a-z0-9.-]/gi,'-').replace(/^[.-]+/,'').slice(-100)||'upload'+extension;
 const folder=kind==='image'?'media':kind==='model'?'models':'fields',relative='/assets/'+folder+'/uploads/'+digest(bytes).slice(0,16)+'-'+name;
 const target=path.join(root,relative);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);return {path:relative,kind};
}
module.exports={buildComponent,listAssets,importComponentAsset,plotFromCSV,validatePlot};
