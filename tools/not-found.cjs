const fs=require('node:fs');
const path=require('node:path');
function sendNotFound(response,root,{head=false}={}){
 const page=path.join(root,'_site','404.html');
 response.writeHead(404,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
 if(head){response.end();return;}
 if(fs.existsSync(page))fs.createReadStream(page).pipe(response);
 else response.end('<!doctype html><html lang="en"><title>Page not found</title><h1>Page not found</h1><a href="/">Return home</a></html>');
}
module.exports={sendNotFound};
