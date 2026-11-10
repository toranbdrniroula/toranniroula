import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn,spawnSync,execFile} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const require=createRequire(import.meta.url);
const {parseArticle}=require('../content.cjs');
const {buildGallery}=require('../gallery-data.cjs');
const science=require('./science.cjs');
const components=require('./components.cjs');
const katex=require('katex');
const {sendNotFound}=require('../not-found.cjs');
const markdown=require('markdown-it')({html:false,linkify:true});
export const digest=text=>crypto.createHash('sha256').update(text).digest('hex');
export function createStudio({root=path.resolve(here,'../..'),port=4317,runJob}={}){
 const privateDir=path.join(root,'.website-studio');
 const backups=path.join(privateDir,'backups');
 fs.mkdirSync(backups,{recursive:true});
 const keyFile=path.join(privateDir,'session-key');
 let secret=fs.existsSync(keyFile)?fs.readFileSync(keyFile,'utf8').trim():'';
 if(!/^[a-f0-9]{64}$/.test(secret)){secret=crypto.randomBytes(32).toString('hex');fs.writeFileSync(keyFile,secret,{mode:0o600});}
 let job={running:false,log:'',stage:'Ready'},address;
 const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 const contentPath=file=>{
  if(!/^content\/(gallery\.json|site\.json|publications\.json|(work|writing)\/[a-z0-9]+(?:-[a-z0-9]+)*\.md)$/.test(file))throw Error('Choose an editable content file.');
  return path.join(root,file);
 };
 const read=file=>{const text=fs.readFileSync(contentPath(file),'utf8');return {text,version:digest(text)};};
 const save=(file,text,version)=>{
  if(job.running)throw Object.assign(Error('Wait for the current preview or publish to finish.'),{status:409});
  const target=contentPath(file),before=fs.existsSync(target)?fs.readFileSync(target,'utf8'):null;
  if((before===null?null:digest(before))!==version)throw Object.assign(Error('This file changed elsewhere. Reload it before saving so those edits are preserved.'),{status:409});
  const id=Date.now()+'-'+crypto.randomBytes(4).toString('hex');
  fs.writeFileSync(path.join(backups,id+'.json'),JSON.stringify({id,file,created:new Date().toISOString(),before}));
  const temp=target+'.studio-tmp';fs.writeFileSync(temp,text);fs.renameSync(temp,target);
  return {version:digest(text),backupId:id};
 };
 const validate=(file,text)=>{
  if(file==='content/gallery.json')buildGallery(JSON.parse(text),root);
  else if(/\/(work|writing)\//.test(file))parseArticle(text,file.split('/')[1],path.basename(file));
  else {const data=JSON.parse(text);if(file.endsWith('site.json')&&(!data.name||!data.site_url||!data.email||!data.about?.photo||!data.contact_endpoint))throw Error('Name, website URL, email, profile photo and contact destination are required.');if(file.endsWith('publications.json')&&(!Array.isArray(data)||data.some(p=>!p.title||!p.type)))throw Error('Each publication needs a title and type.');}
 };
 const log=text=>{job.log=(job.log+text).slice(-40000);};
 async function deployStatus(sha){
  const response=await fetch('https://api.github.com/repos/toranbdrniroula/toranniroula/actions/runs?per_page=5',{headers:{'User-Agent':'Website-Studio'},signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('Could not read deployment status. Open GitHub Actions to check it.');
  const data=await response.json();return data.workflow_runs.find(run=>run.head_sha===sha&&run.name==='Build and publish site');
 }
 async function startJob(kind){
  if(job.running)throw Object.assign(Error('Another operation is already running.'),{status:409});
  job={running:true,kind,stage:kind==='publish'?'Checking and publishing':kind==='pull'?'Pulling updates':'Building preview',log:'',started:new Date().toISOString()};
  if(runJob){try{await runJob(kind);job.running=false;job.ok=true;}catch(error){job.running=false;job.ok=false;job.log=error.message;}return;}
  const child=spawn(process.execPath,[path.join(root,'tools/manage.mjs'),kind==='publish'?'publish':kind==='pull'?'pull':'check'],{cwd:root,windowsHide:true,env:{...process.env,PATH:path.dirname(process.execPath)+path.delimiter+process.env.PATH},stdio:['ignore','pipe','pipe']});
  child.stdout.on('data',chunk=>log(chunk.toString()));child.stderr.on('data',chunk=>log(chunk.toString()));
  child.on('error',error=>{job.running=false;job.ok=false;job.stage='Could not start';log(error.message);});
  child.on('close',async code=>{
   if(code!==0){job.running=false;job.ok=false;job.stage='Needs attention';return;}
   if(kind==='preview'||kind==='pull'){job.running=false;job.ok=true;job.stage=kind==='pull'?'Pulled successfully. Reloading content':'Preview ready';if(kind==='preview')job.url='/';return;}
   const sha=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).stdout?.trim();
   job.stage='Pushed. Waiting for GitHub Pages';job.actionsURL='https://github.com/toranbdrniroula/toranniroula/actions';
   try{
    for(let attempt=0;attempt<36;attempt++){
     await new Promise(resolve=>setTimeout(resolve,10000));
     const run=await deployStatus(sha);if(!run)continue;
     job.actionsURL=run.html_url;
     if(run.status==='completed'){job.running=false;job.ok=run.conclusion==='success';job.stage=job.ok?'Published successfully':'GitHub deployment needs attention';job.url='https://toranniroula.com.np';return;}
    }
    job.stage='Pushed. Deployment is still running; check GitHub Actions';job.ok=true;
   }catch(error){job.stage='Pushed. Check GitHub Actions for deployment';log('\n'+error.message);job.ok=true;}
   job.running=false;
  });
 }
 const body=async req=>{let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>55*1024*1024)throw Error('Use an image or PDF smaller than 40 MB. Host videos on YouTube.');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');};
 const serve=(res,file,headers={})=>{
  if(!fs.existsSync(file)||!fs.statSync(file).isFile()){sendNotFound(res,root);return;}
  const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp','.svg':'image/svg+xml','.xml':'application/xml','.pdf':'application/pdf','.woff2':'font/woff2','.mp4':'video/mp4'};
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff',...headers});fs.createReadStream(file).pipe(res);
 };
 const server=http.createServer(async(req,res)=>{
  try{
   const expected='127.0.0.1:'+address.port;
   if(req.headers.host!==expected){json(res,403,{error:'Open Website Studio using its local address.'});return;}
   const url=new URL(req.url,'http://'+expected);
   if(url.pathname==='/api/health'){json(res,200,{app:'Toran Website Studio',root});return;}
   if(url.pathname.startsWith('/studio')){
    const names={'/studio/':'index.html','/studio/app.js':'app.js','/studio/science.js':'science.js','/studio/components.js':'components.js','/studio/style.css':'style.css'};
    if(!names[url.pathname]){res.writeHead(404);res.end();return;}
    serve(res,path.join(here,names[url.pathname]),{'Set-Cookie':`studio=${secret}; HttpOnly; SameSite=Strict; Path=/`,'Content-Security-Policy':"default-src 'self'; img-src 'self' https://i.ytimg.com data:; style-src 'self'; style-src-attr 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-src 'self' https://embed.diagrams.net; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",'Cache-Control':'no-store'});return;
   }
   if(url.pathname.startsWith('/api/')){
    if(!req.headers.cookie?.split(';').some(c=>c.trim()==='studio='+secret)){json(res,403,{error:'Open Website Studio first.'});return;}
    if(req.method==='POST'&&(req.headers.origin!=='http://'+expected||!req.headers['content-type']?.startsWith('application/json'))){json(res,403,{error:'Save requests must come from Website Studio.'});return;}
    if(req.method==='GET'&&url.pathname==='/api/state'){
     const collections={};for(const kind of ['work','writing'])collections[kind]=fs.readdirSync(path.join(root,'content',kind)).filter(file=>file.endsWith('.md')).map(file=>{const name='content/'+kind+'/'+file;const item=read(name);const settings=parseArticle(item.text,kind,file);return {slug:path.basename(file,'.md'),title:settings.title,draft:!!settings.draft,version:item.version};});
     const gallery=read('content/gallery.json'),site=read('content/site.json'),publications=read('content/publications.json');
     const git=spawnSync('git',['status','--short'],{cwd:root,encoding:'utf8',windowsHide:true});
     json(res,200,{gallery:{data:JSON.parse(gallery.text),version:gallery.version},site:{data:JSON.parse(site.text),version:site.version},publications:{data:JSON.parse(publications.text),version:publications.version},collections,changes:git.stdout||'',job});return;
    }
    if(req.method==='GET'&&url.pathname==='/api/article'){
     const file='content/'+url.searchParams.get('kind')+'/'+url.searchParams.get('slug')+'.md';const item=read(file);const match=/^---\r?\n([\s\S]*?)\r?\n---\s*/.exec(item.text);
     json(res,200,{settings:JSON.parse(match[1]),body:item.text.slice(match[0].length),version:item.version});return;
    }
    if(req.method==='GET'&&url.pathname==='/api/assets'){json(res,200,components.listAssets(root,url.searchParams.get('kind')));return;}
    if(req.method==='GET'&&url.pathname==='/api/job'){json(res,200,job);return;}
    if(req.method==='GET'&&url.pathname==='/api/history'){
     const items=fs.readdirSync(backups).filter(file=>/^\d+-[a-f0-9]+\.json$/.test(file)).sort().reverse().slice(0,30).map(file=>{const item=JSON.parse(fs.readFileSync(path.join(backups,file),'utf8'));return {id:item.id,file:item.file,created:item.created,restorable:item.before!==null,version:fs.existsSync(contentPath(item.file))?read(item.file).version:null};});json(res,200,items);return;
    }
    if(req.method!=='POST'){json(res,404,{error:'Unknown action'});return;}
    const input=await body(req);
    if(url.pathname==='/api/save'){
     let text;if(input.file.endsWith('.md'))text='---\n'+JSON.stringify(input.settings,null,2)+'\n---\n\n'+input.body;
     else text=JSON.stringify(input.data,null,2)+'\n';
     contentPath(input.file);validate(input.file,text);json(res,200,save(input.file,text,input.version));return;
    }
    if(url.pathname==='/api/restore'){
     if(!/^\d+-[a-f0-9]+$/.test(input.id))throw Error('Unknown saved version');
     const item=JSON.parse(fs.readFileSync(path.join(backups,input.id+'.json'),'utf8'));
     if(item.before===null)throw Error('Use the draft switch to hide a new page.');
     validate(item.file,item.before);json(res,200,save(item.file,item.before,input.version));return;
    }
    if(url.pathname==='/api/markdown'){json(res,200,{html:markdown.render(String(input.text||''))});return;}
    if(url.pathname==='/api/youtube'){
     const id=youtubeId(input.url);const response=await fetch('https://www.youtube.com/oembed?url='+encodeURIComponent('https://www.youtube.com/watch?v='+id)+'&format=json',{signal:AbortSignal.timeout(15000)});
     if(!response.ok)throw Error('YouTube could not verify this video. Make it Public or Unlisted and try again.');
     const data=await response.json();json(res,200,{id,title:data.title,poster:'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg',width:480,height:360});return;
    }
    if(url.pathname.startsWith('/api/science/')){
     if(job.running)throw Error('Wait for the current operation to finish.');
     if(url.pathname==='/api/science/inspect'){
      if(String(input.name).toLowerCase().endsWith('.csv')){const data=science.parseCSV(input.text);json(res,200,{headers:data.headers,points:data.rows.length});}
      else{const dataset=JSON.parse(input.text);json(res,200,{points:science.validateChart(dataset)});}return;
     }
     const write=(relative,data)=>{const target=path.join(root,relative.slice(1));fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,data);};
     const title=String(input.title||'Untitled').slice(0,180);
     if(url.pathname==='/api/science/chart'){
      if(typeof input.text!=='string'||Buffer.byteLength(input.text)>20*1024*1024)throw Error('Choose data smaller than 20 MB.');
      const isCSV=String(input.name).toLowerCase().endsWith('.csv');
      const dataset=isCSV?science.chartFromCSV(input):JSON.parse(input.text);const points=science.validateChart(dataset);
      dataset.layout={...dataset.layout,title:{text:title}};
      const text=JSON.stringify(dataset,null,2)+'\n',id=digest(text+input.text).slice(0,16),relative='/content/data/imports/plot-'+id+'.json';
      write(relative,text);write('/content/data/imports/plot-'+id+'-original.'+(isCSV?'csv':'json'),input.text);
      json(res,200,{path:relative,points,snippet:science.chartSnippet(relative,title)});return;
     }
     if(url.pathname==='/api/science/diagram'){
      const data=science.cleanDiagram(input.xml,input.svg),id=digest(data.xml+data.svg).slice(0,16),base='/assets/diagrams/imports/diagram-'+id;
      write(base+'.svg',data.svg);write(base+'.drawio.xml',data.xml);
      json(res,200,{path:base+'.svg',source:base+'.drawio.xml',snippet:science.diagramSnippet(base+'.svg',base+'.drawio.xml',title)});return;
     }
     throw Error('Unknown scientific import action.');
    }
    if(url.pathname.startsWith('/api/components/')){
     if(job.running)throw Error('Wait for the current preview or publish to finish.');
     if(url.pathname==='/api/components/asset'){json(res,200,components.importComponentAsset(root,input,digest));return;}
     if(url.pathname==='/api/components/snippet'){json(res,200,{snippet:components.buildComponent(root,input)});return;}
     if(url.pathname==='/api/components/plot'){
      if(typeof input.text!=='string'||Buffer.byteLength(input.text)>20*1024*1024)throw Error('Choose data smaller than 20 MB.');
      const title=String(input.title||'').trim();if(!title||title.length>180)throw Error('Give the plot a title, up to 180 characters.');
      const csv=String(input.name).toLowerCase().endsWith('.csv'),data=csv?components.plotFromCSV(input):JSON.parse(input.text);components.validatePlot(data);data.layout={...data.layout,title:{text:title}};
      const text=JSON.stringify(data,null,2)+'\n',base='/content/data/imports/chart-'+digest(text+input.text).slice(0,16),file=path.join(root,base+'.json');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text);fs.writeFileSync(path.join(root,base+'-original.'+(csv?'csv':'json')),input.text);json(res,200,{path:base+'.json'});return;
     }
     if(url.pathname==='/api/components/equation'){
      const expression=String(input.text||'').trim();if(!expression||expression.length>4000||expression.includes('$'))throw Error('Enter a LaTeX expression without dollar-sign delimiters, up to 4,000 characters.');
      const html=katex.renderToString(expression,{displayMode:input.display!==false,throwOnError:true,trust:false,output:'htmlAndMathml'});
      const snippet=input.display!==false?'\n\n$$\n'+expression+'\n$$\n\n':'$'+expression+'$';json(res,200,{html,snippet});return;
     }
     throw Error('Unknown component action.');
    }
    if(url.pathname==='/api/media'){


     if(job.running)throw Error('Wait for the current operation to finish.');
     const extension=path.extname(String(input.name)).toLowerCase();if(!['.png','.jpg','.jpeg','.webp','.gif','.pdf'].includes(extension))throw Error('Choose a PNG, JPEG, WebP, GIF or PDF. Use YouTube for videos.');
     const bytes=Buffer.from(String(input.base64),'base64');if(!bytes.length||bytes.length>40*1024*1024)throw Error('Choose a file smaller than 40 MB.');
     const name=String(input.name).replace(/[^a-z0-9.-]/gi,'-').replace(/^[.-]+/,'').slice(-100)||'upload'+extension;
     const relative='/assets/media/uploads/'+digest(bytes).slice(0,12)+'-'+name;const target=path.join(root,relative.slice(1));fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);json(res,200,{path:relative});return;
    }
    if(url.pathname==='/api/terminal'){
     execFile('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(here,'terminal.ps1')],{cwd:root,windowsHide:true},()=>{});
     json(res,200,{ok:true});return;
    }
    if(url.pathname==='/api/job'){
     if(!['preview','publish','pull'].includes(input.kind))throw Error('Unknown job');
     await startJob(input.kind);json(res,202,job);return;
    }
    json(res,404,{error:'Unknown action'});return;
   }
   if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
   let base=path.join(root,'_site');
   if(url.pathname.startsWith('/assets/')){const original=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(original.startsWith(root+path.sep)&&fs.existsSync(original))base=root;}
   let target=path.resolve(base,'.'+decodeURIComponent(url.pathname));
   if(target!==base&&!target.startsWith(base+path.sep))throw Error('Not a public preview path');
   if(fs.existsSync(target)&&fs.statSync(target).isDirectory())target=path.join(target,'index.html');
   serve(res,target,{'Cache-Control':'no-store'});
  }catch(error){json(res,error.status||400,{error:error.message});}
 });
 return {server,listen:()=>new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>{address=server.address();resolve({url:'http://127.0.0.1:'+address.port+'/studio/'});});})};
}
export function youtubeId(value){
 let url;try{url=new URL(value);}catch{throw Error('Paste a YouTube video URL.');}
 if(!['https:','http:'].includes(url.protocol))throw Error('Paste a YouTube video URL.');
 const host=url.hostname.replace(/^www\./,'');let id;
 if(host==='youtu.be')id=url.pathname.slice(1);
 else if(['youtube.com','m.youtube.com','youtube-nocookie.com'].includes(host))id=url.searchParams.get('v')||url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1];
 if(!/^[\w-]{11}$/.test(id||''))throw Error('Use the link to one YouTube video, not a channel or playlist.');return id;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const studio=createStudio();studio.listen().then(({url})=>{console.log('Website Studio: '+url);if(process.argv.includes('--open'))execFile('rundll32.exe',['url.dll,FileProtocolHandler',url],{windowsHide:true},()=>{});}).catch(error=>{console.error(error.message);process.exitCode=1;});
}
