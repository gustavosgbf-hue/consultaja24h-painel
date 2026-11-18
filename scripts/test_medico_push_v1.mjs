/* Teste isolado — notificações do médico, SEM pedir permissão/registrar SW.
 * A demo tem dados fictícios; as preferências nunca saem para rede externa. */
import { createRequire } from 'module';
import fs from 'fs'; import path from 'path'; import http from 'http'; import url from 'url';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PW||'playwright');
const root=path.resolve(path.dirname(url.fileURLToPath(import.meta.url)),'..');
const server=http.createServer((req,res)=>{
 const filename=path.join(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,''));
 if(!filename.startsWith(root)||!fs.existsSync(filename)||fs.statSync(filename).isDirectory()){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',filename.endsWith('.js')?'text/javascript':filename.endsWith('.css')?'text/css':'text/html');
 fs.createReadStream(filename).pipe(res);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port+'/';
const browser=await chromium.launch();
let passed=0;
function check(ok,msg){if(!ok)throw Error(msg);console.log('✓ '+msg);passed++;}
try {
 for(const width of [320,375,390,430,1280]){
  for(const tema of ['light','dark']){
   const ctx=await browser.newContext({viewport:{width,height:850}});
   const page=await ctx.newPage(),errors=[],external=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',r=>r.request().url().startsWith(base)?r.continue():(external.push(r.request().url()),r.abort()));
   await page.goto(base+'demo-review.html?embed=1&tela=multi&tema='+tema);
   await page.click('#cj-notify-trigger');
   check(await page.isVisible('#cj-notify-pop'),width+' '+tema+' — sininho abre');
   const bounds=await page.evaluate(()=>{const r=document.getElementById('cj-notify-pop').getBoundingClientRect();return {left:r.left,right:r.right,bottom:r.bottom,viewport:innerWidth}});
   check(bounds.left>=0 && bounds.right<=bounds.viewport+.5,width+' '+tema+' — painel sem corte lateral');
   check(!await page.isChecked('#cj-notify-enabled'),width+' '+tema+' — desligado inicialmente');
   check(await page.locator('#cj-notify-fila').count()===0 && await page.locator('#cj-notify-mensagens').count()===0,width+' '+tema+' — sem opções redundantes de fila');
   await page.click('label[for=cj-notify-enabled]');
   await page.waitForTimeout(70);
   check(await page.isChecked('#cj-notify-enabled'),width+' '+tema+' — apenas mensagem ativada');
   await page.click('label[for=cj-notify-enabled]');
   await page.waitForTimeout(40);
   check(!await page.isChecked('#cj-notify-enabled'),width+' '+tema+' — desligado novamente');
   await page.keyboard.press('Escape');
   check(await page.isHidden('#cj-notify-pop'),width+' '+tema+' — ESC fecha');
   check(!external.length && !errors.length,width+' '+tema+' — nenhuma API/push real nem erro JS');
   await ctx.close();
  }
 }
 console.log('OK '+passed+' verificações de notificações em demo.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
