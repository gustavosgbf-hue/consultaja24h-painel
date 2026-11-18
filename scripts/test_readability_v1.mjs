/* Teste visual isolado de contraste, ajuste e tabs sem autenticar paciente.
 * Renderiza index.html com DOM fictício local, sem chamar a API externa. */
import { createRequire } from 'module';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PW||'playwright');
const root=path.resolve(path.dirname(url.fileURLToPath(import.meta.url)),'..');
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname),file=path.join(root,pathname==='/'?'index.html':pathname.replace(/^\//,''));
 if(!file.startsWith(root)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'text/html');
 fs.createReadStream(file).pipe(res);
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base='http://127.0.0.1:'+server.address().port+'/';
let count=0;function check(condition,label){if(!condition)throw Error(label);count++;console.log('✓',label);}
const browser=await chromium.launch();
try{
 for(const width of [320,375,390,430,768,1280]){
  for(const theme of ['light','dark']){
   const ctx=await browser.newContext({viewport:{width,height:844},hasTouch:width<=768});
   const page=await ctx.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
   await page.goto(base);
   await page.evaluate(theme=>{
    document.documentElement.setAttribute('data-theme',theme);
    document.getElementById('screen-login').style.display='none';
    document.getElementById('screen-app').style.display='block';
    document.body.classList.add('app-autenticado');
    const state=document.getElementById('state-atend');state.style.display='block';
    const msg=document.querySelector('.chat-medico-msgs');
    const pdf=document.createElement('div');pdf.className='cmsg medico';
    pdf.innerHTML='<div class="bub"><a class="msg-arquivo-pdf" href="#"><span class="pdf-ico">PDF</span><span class="pdf-meta"><span class="pdf-nome">Documento_Medico_17-11-2026_23-07-10.pdf</span><span class="pdf-sub">PDF</span></span><span class="pdf-arrow">›</span></a></div>';
    msg.appendChild(pdf);
    if(innerWidth<=768){document.body.classList.add('chat-fullscreen');}
   },theme);
   await page.waitForTimeout(70);
   const initial=await page.evaluate(()=>{
     const name=document.querySelector('.cmsg.medico .pdf-nome');
     const sub=document.querySelector('.cmsg.medico .pdf-sub');
     const card=document.querySelector('.cmsg.medico .msg-arquivo-pdf');
     const color=getComputedStyle(name).color, bg=getComputedStyle(card).backgroundColor;
     const tab=document.getElementById('atend-tabs');
     return {color,sub:getComputedStyle(sub).color,bg,opacity:getComputedStyle(card).opacity,
       glass:!!tab.querySelector('.cj-glass-indicator'),tabs:getComputedStyle(tab).display,
       slider:!!document.querySelector('.cj-read-trigger'),scroll:document.documentElement.scrollWidth-innerWidth};
   });
   check(initial.slider&&initial.glass,width+' '+theme+' — slider e indicador');
   check(initial.scroll<=1,width+' '+theme+' — sem overflow geral');
   if(theme==='light'){
    check(parseInt(initial.color.match(/\d+/)[0],10)<80&&initial.opacity==='1',width+' — contraste PDF claro');
    check(initial.sub!=='rgb(255, 255, 255)',width+' — metadados legíveis');
   }
   if(theme==='dark')check(initial.bg!=='rgb(255, 255, 255)',width+' — card noturno preservado');
   if(width<=768)check(initial.tabs==='flex',width+' — abas clínicas acessíveis no fullscreen');
   if(width<=768){
     const frame=await page.evaluate(()=>{
       const main=document.querySelector('.main'),state=document.getElementById('state-atend'),tab=document.getElementById('tab-consulta'),header=document.querySelector('#chat-mobile-header');
       const h=e=>{const r=e?.getBoundingClientRect();return {top:r?.top||0,bottom:r?.bottom||0,height:r?.height||0}};
       return {main:h(main),state:h(state),tab:h(tab),header:h(header),viewport:innerHeight};
     });
     check(frame.state.bottom<=frame.viewport+3,width+' — atendimento não passa da viewport '+JSON.stringify(frame));
   }
   await page.click('.cj-read-trigger');
   check(await page.isVisible('#cj-read-pop'),width+' '+theme+' — painel Aa');
   await page.locator('.cj-read-range').fill('86');
   let value=await page.evaluate(()=>({size:getComputedStyle(document.documentElement).getPropertyValue('--cj-read-size').trim(),stored:localStorage.getItem('cj-medico-text-scale-v1')}));
   check(value.size==='0.86'&&value.stored==='0.86',width+' '+theme+' — tamanho contínuo e salvo');
   const smallFont=await page.evaluate(()=>parseFloat(getComputedStyle(document.querySelector('.cmsg.medico .bub')).fontSize));
   await page.locator('.cj-read-range').fill('118');
   value=await page.evaluate(()=>({size:getComputedStyle(document.documentElement).getPropertyValue('--cj-read-size').trim(),stored:localStorage.getItem('cj-medico-text-scale-v1')}));
   check(value.size==='1.18'&&value.stored==='1.18',width+' '+theme+' — ampliar sem zoom');
   const bigFont=await page.evaluate(()=>parseFloat(getComputedStyle(document.querySelector('.cmsg.medico .bub')).fontSize));
   check(bigFont>smallFont+3,width+' '+theme+' — tamanho realmente mudou '+smallFont+' → '+bigFont);
   await page.click('.cj-read-reset');
   check(await page.locator('.cj-read-range').inputValue()==='100',width+' '+theme+' — restaurar');
   await page.keyboard.press('Escape');
   if(await page.isVisible('#atend-tabs .tab')){
     await page.evaluate(()=>{
       const tabs=document.querySelectorAll('#atend-tabs .tab');
       tabs[0].classList.remove('active');tabs[1].classList.add('active');
     });
     await page.waitForTimeout(460);
     const pos=await page.evaluate(()=>{
       const seg=document.querySelector('#atend-tabs'),active=seg.querySelector('.tab.active'),ind=seg.querySelector('.cj-glass-indicator');
       const a=active.getBoundingClientRect(),b=ind.getBoundingClientRect();
       return {delta:Math.abs(a.left-b.left),opacity:getComputedStyle(ind).opacity};
     });
     check(pos.delta<=2,width+' '+theme+' — bolha acompanha a aba '+JSON.stringify(pos));
   }
   check(!errors.length,width+' '+theme+' — sem erro JavaScript');
   await ctx.close();
  }
 }
 console.log('OK '+count+' verificações');
}finally{await browser.close();await new Promise(done=>server.close(done));}
