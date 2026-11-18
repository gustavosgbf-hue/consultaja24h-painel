/* Regressão de acessibilidade do controle Aa ao abrir Fila em celulares.
 * Sem API, autenticação real, dados de pacientes ou chamadas externas. */
import { createRequire } from 'node:module';
import path from 'node:path'; import fs from 'node:fs'; import http from 'node:http'; import url from 'node:url';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PW||'playwright');
const root=path.resolve(path.dirname(url.fileURLToPath(import.meta.url)),'..');
const srv=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
 const file=path.join(root,rel);
 if(!file.startsWith(root)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'text/html');
 fs.createReadStream(file).pipe(res);
});
await new Promise(done=>srv.listen(0,'127.0.0.1',done));
const base='http://127.0.0.1:'+srv.address().port+'/';
const b=await chromium.launch();let tests=0;
function ck(cond,msg){if(!cond)throw new Error(msg);tests++;console.log('✓',msg)}
try{
 for(const width of [320,375,390,430,768,1280]){
  const c=await b.newContext({viewport:{width,height:844},hasTouch:width<769});const p=await c.newPage(),errs=[];
  p.on('pageerror',e=>errs.push(e.message));
  await p.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
  await p.goto(base);
  await p.evaluate(()=>{
   document.getElementById('screen-login').style.display='none';
   document.getElementById('screen-app').style.display='block';
   document.body.classList.add('app-autenticado');
   document.getElementById('state-atend').style.display='block';
   const sidebar=document.getElementById('fila-lista');
   sidebar.innerHTML='<div class="paciente-card"><div class="pc-header"><span class="pc-nome">Paciente Teste Nascimento</span><span class="pc-tipo chat">Chat</span></div><div class="pc-queixa">Relato fictício para testar a fonte</div><div class="pc-footer"><span class="pc-tempo">04:32</span><button class="btn-assumir" type="button">Assumir</button></div></div>';
   document.querySelector('#tab-clinico .clinic-section').style.display='block';
  });
  if(width<=768)await p.click('#nav-fila-btn');
  await p.click('.cj-read-trigger');
  await p.waitForTimeout(250);
  const overlay=await p.evaluate(()=>{
    const r=document.querySelector('.cj-read-range').getBoundingClientRect();
    const elem=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
    const o=document.querySelector('.sidebar-overlay');
    return {top:elem?.className?.toString(), nav:getComputedStyle(document.querySelector('#screen-app>.nav')).zIndex,overlay:getComputedStyle(o).zIndex,sidebar:getComputedStyle(document.querySelector('#sidebar')).zIndex,visible:!document.querySelector('#cj-read-pop').hidden};
  });
  ck(overlay.visible && (width>768||Number(overlay.nav)>Number(overlay.sidebar)),width+'px — Aa acima da fila, sem blur sobre popup '+JSON.stringify(overlay));
  ck(overlay.top?.includes('cj-read-range')===true,width+'px — slider recebe toque direto');
  const before=await p.evaluate(()=>{
    const css=sel=>parseFloat(getComputedStyle(document.querySelector(sel)).fontSize);
    return {fila:css('.pc-nome'),queixa:css('.pc-queixa'),title:css('.atend-nome'),clinic:css('.clinic-section-title'),label:css('.clinic-label'),tab:css('#atend-tabs .tab'),side:css('.sidebar-title')};
  });
  await p.locator('.cj-read-range').fill('118');
  const after=await p.evaluate(()=>{
    const css=sel=>parseFloat(getComputedStyle(document.querySelector(sel)).fontSize);
    return {fila:css('.pc-nome'),queixa:css('.pc-queixa'),title:css('.atend-nome'),clinic:css('.clinic-section-title'),label:css('.clinic-label'),tab:css('#atend-tabs .tab'),side:css('.sidebar-title')};
  });
  for(const key of Object.keys(before))ck(after[key]>before[key]+1,width+'px — '+key+' escala com Aa: '+before[key]+' → '+after[key]);
  ck(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),width+'px — sem overflow geral');
  ck(!errs.length,width+'px — sem erro JS');
  await c.close();
 }
 console.log('SUCESSO '+tests+' verificações de Aa com fila aberta');
}finally{await b.close();await new Promise(done=>srv.close(done));}
