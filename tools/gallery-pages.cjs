function chapterURL(id,page=1){return `/gallery/${id}/${page===1?'':`page/${page}/`}`;}
function paginateChapter(items,size=12){
 if(!Number.isInteger(size)||size<2||size>48)throw new Error('Gallery pageSize must be an integer from 2 to 48');
 const pages=[];let current=[];
 for(let i=0;i<items.length;i++){
  const group=items[i].comparisonSide==='left'?[items[i],items[++i]]:[items[i]];
  if(current.length+group.length>size){pages.push(current);current=[];}
  current.push(...group);
 }
 if(current.length)pages.push(current);
 return pages;
}
function buildGalleryPages(gallery){
 const chapters=gallery.chapters.map(chapter=>({...chapter,href:chapterURL(chapter.id),cover:chapter.items.find(item=>item.still)||chapter.items[0]}));
 const overview={kind:'overview',permalink:'/gallery.html',title:gallery.title,description:gallery.description,chapters,anchorRoutes:{}};
 const result=[overview];
 for(const chapter of chapters){
  const chunks=paginateChapter(chapter.items,gallery.pageSize??12);
  overview.anchorRoutes[chapter.id]=chapter.href;
  let offset=0;
  chunks.forEach((items,index)=>{
   const number=index+1,url=chapterURL(chapter.id,number);
   for(const item of items)overview.anchorRoutes[item.id]=url+'#'+item.id;
   const numbers=[...new Set([1,chunks.length,number-2,number-1,number,number+1,number+2])].filter(n=>n>=1&&n<=chunks.length).sort((a,b)=>a-b);
   const links=[];
   numbers.forEach((n,i)=>{if(i&&n>numbers[i-1]+1)links.push({gap:true});links.push({number:n,href:chapterURL(chapter.id,n),active:n===number});});
   result.push({kind:'chapter',permalink:url,title:chapter.title,description:chapter.description,chapters,chapter:{...chapter,items},number,pageCount:chunks.length,start:offset+1,end:offset+items.length,total:chapter.items.length,previous:index?chapterURL(chapter.id,number-1):null,next:number<chunks.length?chapterURL(chapter.id,number+1):null,links});
   offset+=items.length;
  });
 }
 return result;
}
module.exports={chapterURL,paginateChapter,buildGalleryPages};
