// Scientific authoring tools run in the local Studio; published pages only receive the saved assets.
function scienceDialog(title,description){
 const dialog=el('dialog',{class:'science-dialog'}),content=el('div',{class:'science-content'});
 const close=()=>{dialog.close();dialog.remove();};
 dialog.append(el('div',{class:'row science-heading'},el('h2',{text:title}),button('Close',close)),el('p',{class:'muted',text:description}),content);
 document.body.append(dialog);dialog.showModal();return {dialog,content,close};
}
function localTextFile(accept,callback){
 const input=el('input',{type:'file',accept});input.onchange=safe(async()=>{const file=input.files[0];if(!file)return;if(file.size>20*1024*1024)throw Error('Choose a file smaller than 20 MB.');await callback({name:file.name,text:await file.text()});});input.click();
}
function openChartImport(insert){
 const {content,close}=scienceDialog('Import a 3D plot','Choose CSV with a header row, or Plotly JSON containing scatter3d or surface traces. Your original data is kept alongside the chart.');
 let input=null,headers=[],options={kind:'scatter3d',title:'',columns:{},labels:{}};
 const settings=el('div'),status=el('p',{class:'muted',text:'No data selected.'});
 const choose=button('Choose CSV or Plotly JSON',()=>localTextFile('.csv,.json',async file=>{
  const result=await api('science/inspect',file);input=file;headers=result.headers||[];options.title=file.name.replace(/\.[^.]+$/,'').replace(/[-_]/g,' ');
  if(headers.length)for(const [i,axis] of ['x','y','z'].entries()){options.columns[axis]=headers[i]||headers[0];options.labels[axis]=headers[i]||axis.toUpperCase();}
  status.textContent=file.name+' · '+result.points+' data '+(result.points===1?'row':'rows');renderOptions();
 }));
 function renderOptions(){
  settings.replaceChildren(field('Plot title',options.title,v=>options.title=v));
  if(headers.length){settings.append(field('Plot style',options.kind,v=>options.kind=v,{choices:[{value:'scatter3d',label:'3D points'},{value:'line3d',label:'3D line (CSV row order)'},{value:'surface',label:'3D surface (complete rectangular grid)'}]}));
   const grid=el('div',{class:'grid'});for(const axis of ['x','y','z'])grid.append(field(axis.toUpperCase()+' column',options.columns[axis],v=>options.columns[axis]=v,{choices:headers}),field(axis.toUpperCase()+' label and units',options.labels[axis],v=>options.labels[axis]=v));settings.append(grid);
  }
  settings.append(button('Insert plot',async()=>{
   const result=await api('science/chart',{...input,...options});close();insert(result.snippet);notice('3D plot inserted with '+result.points+' points. Save the page, then use Preview to check it.');
  },'primary'));
 }
 content.append(choose,status,settings,el('details',{},el('summary',{text:'Data format help'}),el('p',{},'CSV example: x_mm,y_mm,temperature_K with one point per row. Select the three columns above. For a surface, every X/Y pair must appear exactly once; otherwise use points.'),el('p',{},'Plotly JSON format: {"data":[{"type":"scatter3d","x":[0,1],"y":[0,1],"z":[2,3]}],"layout":{}}. Surface JSON uses X and Y vectors and a rectangular Z matrix. Numerical precision is retained.')));
 // These controls collect import settings, not edits to a content file.
 content.addEventListener('input',event=>event.stopPropagation());
}
function svgDataText(value){
 if(typeof value!=='string'||!/^data:image\/svg\+xml[;,]/i.test(value))throw Error('The diagram editor did not return an SVG.');
 const comma=value.indexOf(','),header=value.slice(0,comma),data=value.slice(comma+1);
 return /;base64/i.test(header)?new TextDecoder().decode(Uint8Array.from(atob(data),c=>c.charCodeAt(0))):decodeURIComponent(data);
}
function openDiagramEditor(insert){
 const origin='https://embed.diagrams.net';
 const {dialog,content,close:remove}=scienceDialog('Diagram editor','Create a flowchart or control block diagram, or open a draw.io XML file. Internet is needed to load the editor. Saving inserts a static SVG and keeps the editable XML.');
 let title='Diagram',xml='<mxfile><diagram name="Page-1"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>',ready=false,busy=false,closed=false;
 const status=el('p',{class:'muted',text:'Loading draw.io...'});
 const iframe=el('iframe',{class:'diagram-editor',title:'draw.io diagram editor',src:origin+'/?embed=1&proto=json&spin=1&libraries=1&ui=atlas&saveAndExit=1&noSaveBtn=1'});
 const send=data=>iframe.contentWindow.postMessage(JSON.stringify(data),origin);
 const close=()=>{closed=true;window.removeEventListener('message',receive);remove();};
 // Always clean up listeners when the native dialog closes or Escape is used.
 dialog.addEventListener('close',()=>{closed=true;window.removeEventListener('message',receive);dialog.remove();});
 async function receive(event){
  if(event.origin!==origin||event.source!==iframe.contentWindow||typeof event.data!=='string')return;
  let message;try{message=JSON.parse(event.data);}catch{return;}
  try{
   if(message.event==='init'){ready=true;send({action:'load',xml,title,saveAndExit:1,noSaveBtn:1});status.textContent='Ready. Click Save and Exit in draw.io when finished.';}
   else if(message.event==='save'&&!busy){xml=message.xml||xml;busy=true;status.textContent='Generating SVG...';send({action:'export',format:'svg',xml,embedImages:true,embedFonts:false,allPages:true});}
   else if(message.event==='export'&&busy){const svg=svgDataText(message.data);const result=await api('science/diagram',{xml:message.xml||xml,svg,title});if(closed)return;close();insert(result.snippet);notice('Diagram inserted. The SVG and editable XML are saved locally. Save your page, then Preview.');}
   else if(message.event==='exit'&&!busy)close();
  }catch(error){busy=false;status.textContent=error.message;notice(error.message,true);send({action:'spinner',show:false});}
 }
 window.addEventListener('message',receive);
 content.append(el('div',{class:'row'},field('Diagram title',title,v=>title=v),button('Open draw.io XML',()=>localTextFile('.drawio,.xml',async file=>{if(!ready)throw Error('Wait for the diagram editor to load.');if(!/<(?:mxfile|mxGraphModel)(?:\s|>)/.test(file.text))throw Error('Choose a draw.io XML diagram.');xml=file.text;title=file.name.replace(/\.(drawio|xml)$/i,'');content.querySelector('input').value=title;send({action:'load',xml,title,saveAndExit:1,noSaveBtn:1});}))),status,iframe);
}
