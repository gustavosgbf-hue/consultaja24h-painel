import { createRequire } from 'module';
import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PW||'playwright');
const root=path.resolve(path.dirname(url.fileURLToPath(import.meta.url)),'..');
const server=http.createServer((req,res)=>{
 const file=path.join(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,''));
 if(!file.startsWith(root)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'text/html');
 fs.createReadStream(file).pipe(res);
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const base='http://127.0.0.1:'+server.address().port+'/';
const browser=await chromium.launch();
let passed=0;
function ok(value,label){if(!value)throw Error(label);passed++;console.log('✓ '+label)}
try{
 for(const mode of [{width:390,height:844,reducedMotion:'no-preference'},{width:390,height:844,reducedMotion:'reduce'},{width:1280,height:800,reducedMotion:'no-preference'}]){
  const ctx=await browser.newContext({viewport:{width:mode.width,height:mode.height},reducedMotion:mode.reducedMotion});
  const page=await ctx.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
  await page.goto(base+'demo-review.html?embed=1&tela=ocultos');
  await page.waitForTimeout(130);
  const progress=await page.evaluate(()=>{
   const trigger=document.querySelector('.cj16-slot-more');
   trigger.click();
   const sheet=document.querySelector('.cj16-sheet');
   const anim=getComputedStyle(sheet.querySelector('.cj16-sheet-panel')).animationName;
   const actual=getComputedStyle(sheet).animationName;
   return {anim,actual,count:document.querySelectorAll('.cj16-sheet-item').length};
  });
  ok(progress.count===4,'4 consultas no gerenciador '+mode.width+' '+mode.reducedMotion);
  ok(mode.reducedMotion==='reduce'||progress.anim.includes('cj17-sheet-up'),'abertura animada do gerenciador');
  ok(mode.reducedMotion!=='reduce'||await page.evaluate(()=>parseFloat(getComputedStyle(document.querySelector('.cj16-sheet-panel')).animationDuration)<.01),'acessibilidade: movimento reduzido');
  await page.waitForTimeout(100);
  await page.keyboard.press('Escape');
  const restored=await page.evaluate(()=>document.querySelector('.cj16-sheet').hidden);
  ok(restored,'ESC fecha painel sem alterar consulta');
  await page.click('.cj16-more-btn:visible');
  const menu=await page.evaluate(()=>({name:getComputedStyle(document.querySelector('.cj16-menu:not([hidden])')).animationName,count:document.querySelectorAll('.cj16-menu:not([hidden]) [role=menuitem]').length}));
  ok(menu.count>=1,'menu de ações navegável');
  ok(mode.reducedMotion==='reduce'||menu.name.includes('cj17-pop-in'),'menu abre com microanimação');
  ok(errors.length===0,'nenhum erro JavaScript');
  await ctx.close();
 }
 console.log(passed+' verificações de movimento concluídas');
}finally{await browser.close();await new Promise(ok=>server.close(ok))}
