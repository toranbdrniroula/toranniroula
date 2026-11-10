import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createStudio,youtubeId} from './studio/server.mjs';

test('Studio accepts only individual YouTube links',()=>{
 for(const url of ['https://youtu.be/Qn13j1qGZdU','https://www.youtube.com/watch?v=Qn13j1qGZdU&x=1','https://youtube.com/shorts/Qn13j1qGZdU'])assert.equal(youtubeId(url),'Qn13j1qGZdU');
 for(const url of ['https://youtube.com/@toranbdrniroula','https://evil.test/watch?v=Qn13j1qGZdU','javascript:alert(1)','https://youtube.com/watch?v=../bad'])assert.throws(()=>youtubeId(url));
});

test('Studio protects local content, detects stale edits and restores backups',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'website-studio-test-'));
 fs.mkdirSync(path.join(root,'content/work'),{recursive:true});fs.mkdirSync(path.join(root,'content/writing'));
 const gallery={title:'Gallery',description:'Experiments',chapters:[]};
 const site={name:'Test',email:'test@example.com',site_url:'https://example.com',about:{photo:'/assets/photo.jpg'},contact_endpoint:'https://example.com/contact'};
 for(const [name,data] of Object.entries({gallery,site,publications:[]}))fs.writeFileSync(path.join(root,'content/'+name+'.json'),JSON.stringify(data));
 const settings={title:'Research',date:'2026',draft:true,viewer:{mode:'three',custom:'preserve'},hero_slides:[{src:'keep.png'}]};
 fs.writeFileSync(path.join(root,'content/work/research.md'),'---\n'+JSON.stringify(settings)+'\n---\n\nOriginal body.');
 const studio=createStudio({root,port:0,runJob:async()=>{}});const {url}=await studio.listen();const base=new URL(url).origin;
 const response=await fetch(url);const cookie=response.headers.get('set-cookie').split(';')[0];await response.text();
 const request=(route,data,options={})=>fetch(base+'/api/'+route,{method:data===undefined?'GET':'POST',headers:{cookie,Origin:base,'Content-Type':'application/json',...options.headers},body:data===undefined?undefined:JSON.stringify(data)});
 try{
  assert.equal((await fetch(base+'/api/state')).status,403);
  assert.equal((await request('save',{file:'content/gallery.json',data:gallery,version:null},{headers:{Origin:'https://evil.test'}})).status,403);
  const initial=await (await request('state')).json();assert.equal(initial.collections.work[0].title,'Research');
  const changed={...gallery,description:'Updated'};const first=await (await request('save',{file:'content/gallery.json',data:changed,version:initial.gallery.version})).json();assert.ok(first.version);assert.ok(first.backupId);
  assert.equal((await request('save',{file:'content/gallery.json',data:gallery,version:initial.gallery.version})).status,409);
  assert.equal((await request('save',{file:'content/../README.md',settings,body:'bad',version:null})).status,400);
  const article=await (await request('article?kind=work&slug=research')).json();article.settings.title='Revised';
  assert.equal((await request('save',{file:'content/work/research.md',...article})).status,200);
  const revised=await (await request('article?kind=work&slug=research')).json();assert.deepEqual(revised.settings.viewer,settings.viewer);assert.deepEqual(revised.settings.hero_slides,settings.hero_slides);assert.equal(revised.body,'Original body.');
  assert.equal((await request('restore',{id:first.backupId,version:first.version})).status,200);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root,'content/gallery.json'))).description,'Experiments');
  assert.equal((await request('media',{name:'attack.html',base64:Buffer.from('<script>bad</script>').toString('base64')})).status,400);
  const md=await (await request('markdown',{text:'<script>alert(1)</script>'})).json();assert.ok(!md.html.includes('<script>'));
  assert.equal((await request('job',{kind:'arbitrary-command'})).status,400);
  assert.equal((await request('job',{kind:'preview'})).status,202);
 }finally{studio.server.closeAllConnections();await new Promise(resolve=>studio.server.close(resolve));fs.rmSync(root,{recursive:true,force:true});}
});
