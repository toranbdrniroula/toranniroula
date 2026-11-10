function chartCSV(dataset) {
 const title=axis=>typeof axis?.title==='string'?axis.title:axis?.title?.text;
 const cell=value=>{const text=value==null?'':String(value);return /[",\r\n]/.test(text)?`"${text.replaceAll('"','""')}"`:text;};
 const hasZ=dataset.data.some(series=>series.z!==undefined),axes=hasZ?(dataset.layout?.scene||{}):(dataset.layout||{});
 const rows=[['Series',title(axes.xaxis)||'X',title(axes.yaxis)||'Y',...(hasZ?[title(axes.zaxis)||'Z']:[])]];
 for(const [index,series] of dataset.data.entries()){
  const name=series.name||`Series ${index+1}`;
  if(series.type==='surface'){
   if(!Array.isArray(series.z)||!Array.isArray(series.x)||!Array.isArray(series.y)||series.z.length!==series.y.length)throw Error('Surface rows must match Y coordinates');
   for(let j=0;j<series.y.length;j++){
    if(!Array.isArray(series.z[j])||series.z[j].length!==series.x.length)throw Error('Surface columns must match X coordinates');
    for(let i=0;i<series.x.length;i++)rows.push([name,series.x[i],series.y[j],series.z[j][i]]);
   }
  }else{
   if(!Array.isArray(series.x)||!Array.isArray(series.y)||series.x.length!==series.y.length||(series.z!==undefined&&(!Array.isArray(series.z)||series.z.length!==series.x.length)))throw Error('Chart coordinates must have equal lengths');
   for(let i=0;i<series.x.length;i++)rows.push([name,series.x[i],series.y[i],...(hasZ?[series.z?.[i]]:[])]);
  }
 }
 return rows.map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
}
module.exports={chartCSV};
