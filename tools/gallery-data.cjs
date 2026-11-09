const fs = require('node:fs');
const {createHash} = require('node:crypto');
const path = require('node:path');
const {imageSize} = require('image-size');
const ROOT = path.resolve(__dirname, '..');
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function buildGallery(config, root = ROOT) {
  const mediaVersions=new Map();
  const mediaURL=value=>{
    if(!value)return undefined;
    if(!mediaVersions.has(value))mediaVersions.set(value,createHash('sha256').update(fs.readFileSync(path.join(root,value.slice(1)))).digest('hex').slice(0,16));
    return value+'?v='+mediaVersions.get(value);
  };
  const fail = message => {throw new Error('content/gallery.json: '+message);};
  const text = (value, field) => {if(typeof value!=='string'||!value.trim()) fail(field+' is required');return value;};
  const order = values => [...values].sort((a,b)=>(a.order??999)-(b.order??999));
  const ids = new Set(['main-content','site-nav','nav-toggle','theme-toggle','nav-scrim']);
  const identify = (value, field) => {if(typeof value!=='string'||!slug.test(value)||ids.has(value)) fail(field+' must be a unique lowercase ID');ids.add(value);};
  const editable = value => {
    if(value.draft!==undefined&&typeof value.draft!=='boolean') fail('draft must be true or false without quotes');
    if(value.order!==undefined&&!Number.isFinite(value.order)) fail('order must be a number');
    return value.draft!==true;
  };
  const local = (value, field) => {
    if(typeof value!=='string'||!/^\/assets\/[a-z0-9_./-]+$/i.test(value)||value.includes('..')) fail(field+' must start with /assets/ and use a local asset path');
    if(!fs.existsSync(path.join(root,value.slice(1)))) fail(field+' does not exist: '+value);
    return value;
  };
  const link = (value, field) => {
    if(!value) return;
    if(typeof value!=='string'||!(/^(https:\/\/|\/(?!\/))/.test(value))) fail(field+' must be an HTTPS URL or a site path');
  };
  const embed = value => {
    let url;try{url=new URL(value);}catch{fail('embedURL must be a Drive preview or YouTube embed URL');}
    if(url.protocol!=='https:'||url.username||url.password||url.port||!((url.hostname==='drive.google.com'&&/^\/file\/d\/[\w-]+\/preview$/.test(url.pathname))||(['www.youtube.com','www.youtube-nocookie.com'].includes(url.hostname)&&/^\/embed\/[\w-]+$/.test(url.pathname)))) fail('embedURL must be a Drive preview or YouTube embed URL');
  };
  text(config.title,'title');text(config.description,'description');
  if(!Array.isArray(config.chapters)) fail('chapters must be an array');
  const chapters=order(config.chapters.filter(editable)).map(chapter=>{
    identify(chapter.id,'chapter.id');text(chapter.title,chapter.id+'.title');
    if(!Array.isArray(chapter.items)) fail(chapter.id+'.items must be an array');
    const items=order(chapter.items.filter(editable)).map(item=>{
      identify(item.id,'item.id');text(item.title,item.id+'.title');text(item.description,item.id+'.description');
      if(!['image','gif','video'].includes(item.type)) fail(item.id+'.type must be image, gif or video');
      if(item.type!=='video'||item.src) local(item.src,item.id+'.src');
      if(item.poster) local(item.poster,item.id+'.poster');
      if(item.calibrationImage) local(item.calibrationImage,item.id+'.calibrationImage');
      if(item.type==='gif'&&!item.poster) fail(item.id+' needs a still poster for its GIF');
      if(item.type==='video'&&!item.src&&!item.embedURL) fail(item.id+' needs src or embedURL');
      if(item.embedURL){embed(item.embedURL);if(!item.sourceURL) fail(item.id+' needs a sourceURL as a player fallback');}
      link(item.sourceURL,item.id+'.sourceURL');link(item.projectURL,item.id+'.projectURL');
      if(item.tags&&!Array.isArray(item.tags)) fail(item.id+'.tags must be an array');
      const still=item.poster||(item.type==='image'?item.src:null);
      const dimensions=still?imageSize(fs.readFileSync(path.join(root,still.slice(1)))):{};
      return {...item,still,mediaSrcURL:mediaURL(item.src),posterURL:mediaURL(item.poster),stillURL:mediaURL(still),calibrationURL:mediaURL(item.calibrationImage),width:dimensions.width,height:dimensions.height,format:{image:'Image',gif:'GIF',video:'Video'}[item.type],tags:item.tags||[]};
    });
    const comparisons=new Map();
    items.forEach((item,index)=>{
      if(!item.comparison)return;
      if(typeof item.comparison!=='string'||!slug.test(item.comparison))fail(item.id+'.comparison must be a lowercase ID');
      if(item.wide||item.featured)fail(item.id+' cannot combine comparison with wide or featured');
      if(!comparisons.has(item.comparison))comparisons.set(item.comparison,[]);
      comparisons.get(item.comparison).push(index);
    });
    for(const [name,indices] of comparisons){
      if(indices.length!==2||indices[1]!==indices[0]+1)fail('comparison '+name+' needs exactly two adjacent items');
      items[indices[0]].comparisonSide='left';items[indices[1]].comparisonSide='right';
    }
    if(items.filter(item=>item.featured).length>1) fail(chapter.id+' can have only one featured item');
    link(chapter.context?.href,chapter.id+'.context.href');
    return {...chapter,items,count:items.length};
  }).filter(chapter=>chapter.items.length);
  return {...config,chapters,count:chapters.reduce((sum,chapter)=>sum+chapter.count,0)};
}
const readGallery = () => buildGallery(JSON.parse(fs.readFileSync(path.join(ROOT,'content/gallery.json'),'utf8')));
module.exports={buildGallery,readGallery};
