function componentAssetPicker(kind,label,set,{optional=false}={}){
 const select=el('select',{'aria-label':label}),box=el('div',{class:'asset-picker'}),status=el('small',{class:'muted'});
 select.append(el('option',{value:'',text:optional?'No image selected (optional)':'Choose an existing website file'}));
 let selected='';
 function choose(value){selected=value;select.value=value;set(value);status.textContent=value||'';}
 select.addEventListener('change',()=>choose(select.value));
 const load=safe(async()=>{const files=await api('assets?kind='+kind);for(const file of files)select.append(el('option',{value:file.path,text:file.name+' · '+(file.bytes/1024/1024).toFixed(1)+' MB'}));select.value=selected;});load();
 const upload=button('Import from laptop',()=>{
  const accept={model:'.stl,.glb',field:'.vtp',image:'image/png,image/jpeg,image/webp,image/gif'}[kind];
  const input=el('input',{type:'file',accept});input.onchange=safe(async()=>{const file=input.files[0];if(!file)return;if(file.size>40*1024*1024)throw Error('Choose a file smaller than 40 MB.');status.textContent='Importing '+file.name+'...';
   const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);});
   const result=await api('components/asset',{name:file.name,base64});select.append(el('option',{value:result.path,text:file.name}));choose(result.path);
  });input.click();
 });
 box.append(el('label',{class:'field'},label,select),...(kind==='plot'?[]:[upload]),status);return box;
}
function openComponent(kind,insert){
 if(kind==='plot'){openPlotBuilder(insert);return;}
 if(kind==='carousel'){openCarouselBuilder(insert);return;}
 const model=kind==='model',{content,close}=scienceDialog(model?'Insert a 3D model':'Insert a CFD field',model?'Choose an STL or GLB model. A still image helps visitors while the viewer loads.':'Choose VTK PolyData (.vtp). The current viewer supports scalar fields, clipping and threshold controls.');
 const options={kind,title:'',source:'',poster:'',height:model?480:540,rotate:false,color:'#4fa3d1',field:'user-defined',colormap:'rainbow',clipping:true,threshold:true};
 content.append(field('Title / accessible label','',v=>options.title=v),componentAssetPicker(kind,model?'Model file':'VTP data file',v=>options.source=v),componentAssetPicker('image','Still reference image',v=>options.poster=v,{optional:true}),field('Viewer height (pixels)',options.height,v=>options.height=v,{type:'number'}));
 if(model)content.append(field('Surface color',options.color,v=>options.color=v,{type:'color'}),check('Rotate automatically',false,v=>options.rotate=v));
 else content.append(field('Initial scalar field',options.field,v=>options.field=v,{hint:'Use user-defined to show the dataset field picker, or enter an exact field name.'}),field('Initial color map',options.colormap,v=>options.colormap=v,{choices:['rainbow','viridis','plasma','inferno','magma','jet','turbo','warm cold','grayscale']}),check('Enable clipping',true,v=>options.clipping=v),check('Enable thresholds',true,v=>options.threshold=v));
 content.append(button('Insert '+(model?'model':'field'),async()=>{const result=await api('components/snippet',options);close();insert(result.snippet);notice('Viewer inserted. Save and Preview to inspect it with your page layout.');},'primary'));
}
function openCarouselBuilder(insert){
 const {content,close}=scienceDialog('Insert an image carousel','Choose two or more images, add captions, and arrange the order. Original image files are kept at full resolution.');
 const options={kind:'carousel',title:'',slides:[],autoplay:false,interval:5000},slides=el('div'),status=el('p',{class:'small muted',text:'No slides yet.'});let candidate='';
 const picker=componentAssetPicker('image','Image to add',v=>candidate=v);
 function render(){status.textContent=options.slides.length+' slides';slides.replaceChildren(...options.slides.map((slide,index)=>el('div',{class:'slide-editor'},el('img',{src:slide.source,alt:'',loading:'lazy'}),el('div',{},field('Slide '+(index+1)+' caption',slide.caption,v=>slide.caption=v,{area:true}),el('div',{class:'row'},button('Move up',()=>{if(index===0)return;[options.slides[index-1],options.slides[index]]=[options.slides[index],options.slides[index-1]];render();}),button('Move down',()=>{if(index===options.slides.length-1)return;[options.slides[index+1],options.slides[index]]=[options.slides[index],options.slides[index+1]];render();}),button('Remove',()=>{options.slides.splice(index,1);render();},'danger'))))));}
 content.append(field('Carousel title','',v=>options.title=v),picker,button('Add selected image',()=>{if(!candidate)throw Error('Choose or import an image first.');if(options.slides.length>=30)throw Error('Use at most 30 slides.');options.slides.push({source:candidate,caption:''});render();}),status,slides,check('Advance slides automatically',false,v=>options.autoplay=v),field('Time per slide (seconds)',5,v=>options.interval=v*1000,{type:'number'}),button('Insert carousel',async()=>{const result=await api('components/snippet',options);close();insert(result.snippet);notice('Carousel inserted. Save and Preview to check the captions and navigation.');},'primary'));
}
function openPlotBuilder(insert){
 const {content,close}=scienceDialog('Insert a plot','Use a Plotly dataset already in the website, or import CSV / Plotly JSON. For CSV surfaces or three coordinate columns, use the separate 3D plot button.');
 const options={kind:'plot',title:'',source:'',height:420},settings=el('div');let imported=null;
 content.append(field('Plot title','',v=>options.title=v),componentAssetPicker('plot','Existing Plotly dataset',v=>{options.source=v;imported=null;settings.replaceChildren();}),button('Import CSV or Plotly JSON',()=>localTextFile('.csv,.json',async file=>{
  imported={...file};options.source='';settings.replaceChildren();
  if(file.name.toLowerCase().endsWith('.csv')){
   const inspected=await api('science/inspect',file);if(inspected.headers.length<2)throw Error('CSV needs at least two columns.');Object.assign(imported,{x:inspected.headers[0],y:inspected.headers[1],xLabel:inspected.headers[0],yLabel:inspected.headers[1],style:'lines'});
   settings.append(el('p',{class:'muted',text:file.name+' · '+inspected.points+' rows'}),el('div',{class:'grid'},field('X column',imported.x,v=>imported.x=v,{choices:inspected.headers}),field('Y column',imported.y,v=>imported.y=v,{choices:inspected.headers}),field('X label and units',imported.xLabel,v=>imported.xLabel=v),field('Y label and units',imported.yLabel,v=>imported.yLabel=v)),field('Plot style',imported.style,v=>imported.style=v,{choices:[{value:'lines',label:'Line'},{value:'markers',label:'Points'},{value:'lines+markers',label:'Line and points'},{value:'bar',label:'Bars'}]}));
  }else settings.append(el('p',{class:'muted',text:file.name+' selected. Plotly trace settings are preserved.'}));
 })),settings,field('Plot height (pixels)',options.height,v=>options.height=v,{type:'number'}),button('Insert plot',async()=>{
  if(imported){const result=await api('components/plot',{...imported,title:options.title});options.source=result.path;}
  const result=await api('components/snippet',options);close();insert(result.snippet);notice('Plot inserted with downloadable data. Save and Preview to inspect it.');
 },'primary'));
}
function openEquationBuilder(insert){
 const {content,close}=scienceDialog('Insert an equation','Enter LaTeX. The equation is checked before insertion and rendered with the same math styling as your articles.');
 const options={text:'C_p = \\frac{p-p_\\infty}{\\tfrac12\\rho_\\infty V_\\infty^2}',display:true};
 const source=field('LaTeX expression',options.text,v=>options.text=v,{area:true,rows:5}),preview=el('div',{class:'rendered equation-preview',hidden:true});
 content.append(source,check('Display on its own line',true,v=>options.display=v),el('div',{class:'row'},button('Check equation',async()=>{const result=await api('components/equation',options);preview.innerHTML=result.html;preview.hidden=false;}),button('Insert equation',async()=>{const result=await api('components/equation',options);close();insert(result.snippet);},'primary')),preview);
}
