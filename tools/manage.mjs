import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
process.chdir(root);
process.env.PATH=path.dirname(process.execPath)+path.delimiter+process.env.PATH;
const [command='preview',kind,slug,...titleWords]=process.argv.slice(2);
function node(args) {
  const result=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit'});
  if (result.error) throw result.error;
  if(result.status!==0) throw new Error('Check failed. Fix the error above; nothing has been published.');
}
function git(args) {
  const result=spawnSync('git',args,{cwd:root,stdio:'inherit'});
  if(result.error) throw result.error;
  if(result.status!==0) throw new Error('Git stopped. Read its message above; no further publishing steps were run.');
}
try {
  if(command==='new') {
    if(!['work','writing'].includes(kind)||!slug||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('Usage: website.cmd new work your-slug Your title (or new writing)');
    const file=path.join(root,'content',kind,slug+'.md');
    const settings={title:titleWords.join(' ')||slug.replaceAll('-',' '),date:new Date().toISOString().slice(0,10),draft:true};
    if(kind==='work') Object.assign(settings,{category:'research',status:'In Progress',thumbnail:'assets/media/og-banner.jpg',media_type:'image',tags:[],links:[]});
    else Object.assign(settings,{excerpt:'A short description for the writing list.',category:'technical'});
    fs.writeFileSync(file,`---\n${JSON.stringify(settings,null,2)}\n---\n\nWrite your introduction here.\n\n## Setup\n\nDescribe the work.\n\n## Results\n\nAdd your results.\n`,{flag:'wx'});
    console.log(`Created draft: ${file}\nEdit this one file. Set "draft": false when ready to publish.`);
  } else if(['check','preview','publish'].includes(command)) {
    if(!fs.existsSync('node_modules/@11ty/eleventy/cmd.cjs')) throw new Error('Dependencies are missing. Install Node.js 24, then run: npm install --global pnpm@11.25.0 && pnpm install --frozen-lockfile');
    if(command!=='preview') node(['--test',...fs.readdirSync('tools').filter(file=>file.endsWith('.test.mjs')).map(file=>'tools/'+file)]);
    node(['tools/build.mjs']);
    if(command==='publish') {
      // Stage website sources only; ignore local QA and unrelated root files.
      const branch=spawnSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8'});
      if(branch.status!==0 || branch.stdout.trim()!=='main') throw new Error('Publish from the main branch. No commit or push was attempted.');
      const staged=spawnSync('git',['diff','--cached','--name-only'],{cwd:root,encoding:'utf8'});
      const allowed=/^(content\/|assets\/|css\/|js\/|src\/|templates\/|tools\/|\.github\/|README\.md$|package\.json$|pnpm-lock\.yaml$|eleventy\.config\.js$|robots\.txt$|CNAME$|\.nojekyll$|website\.cmd$)/;
      if(staged.status!==0 || staged.stdout.trim().split('\n').filter(Boolean).some(file=>!allowed.test(file))) throw new Error('Unrelated files are already staged. Unstage them before publishing the website.');
      git(['add','-A','--','content','assets','css','js','src','templates','tools','README.md','package.json','pnpm-lock.yaml','eleventy.config.js','.github','robots.txt','CNAME','.nojekyll','website.cmd']);
      const changed=spawnSync('git',['diff','--cached','--quiet'],{cwd:root});
      if(changed.status===1) git(['commit','-m','Update website content']);
      else if(changed.status!==0) throw new Error('Could not inspect staged changes.');
      git(['push','origin','main']);
      console.log('Pushed successfully. GitHub Actions will build and deploy; watch the Actions tab for completion.');
    } else if(command==='preview') {
      const server=spawn(process.execPath,['tools/preview.mjs'],{cwd:root,stdio:'inherit'});
      let building=false,again=false,timer;
      const rebuild=()=>{
        if(building){again=true;return;}
        building=true;
        const child=spawn(process.execPath,['tools/build.mjs'],{cwd:root,stdio:'inherit'});
        child.on('exit',code=>{building=false; console.log(code===0?'Preview rebuilt. Refresh your browser.':'Build failed; correct the error and save again.');if(again){again=false;rebuild();}});
      };
      const watchers=['content','assets','css','js','src','tools'].map(dir=>fs.watch(dir,{recursive:true},()=>{clearTimeout(timer);timer=setTimeout(rebuild,350);}));
      console.log('Watching your files. Save changes, then refresh the browser. Ctrl+C stops preview.');
      server.on('exit',()=>{watchers.forEach(watcher=>watcher.close());process.exit();});
      process.on('SIGINT',()=>{server.kill();process.exit();});
    } else console.log('All checks passed. Ready to publish.');
  } else throw new Error('Commands: preview | check | publish | new work slug Title | new writing slug Title');
} catch(error) { console.error(error.message); process.exitCode=1; }
