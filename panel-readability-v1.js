(function(){
 'use strict';
 if(window.__cjReadV1)return;window.__cjReadV1=true;
 const KEY='cj-medico-text-scale-v1';
 const root=document.documentElement;
 const rangeMin=.84,rangeMax=1.2;
 let btn,pop,range,output,glass,container;
 function limit(n){return Math.min(rangeMax,Math.max(rangeMin,Number.isFinite(n)?n:1));}
 function stored(){try{return limit(Number(localStorage.getItem(KEY)||1));}catch(_){return 1;}}
 function aplicar(n,remember){
 n=limit(n);root.style.setProperty('--cj-read-size',String(n));
 const sizes={'--cj-read-chat':14,'--cj-read-pdf':12,'--cj-read-small':11,'--cj-read-timestamp':10,'--cj-read-meta':14,'--cj-read-pip':12,'--cj-read-pront':14,'--cj-read-title':16,'--cj-read-fila-name':15,'--cj-read-fila-desc':13,'--cj-read-nav':13,'--cj-read-hist-name':14,'--cj-read-hist-meta':12,'--cj-read-heading':17,'--cj-read-patient-title':22,'--cj-read-tab':13,'--cj-read-clinic-label':12,'--cj-read-actions':13,'--cj-read-button':12};
 Object.keys(sizes).forEach(key=>root.style.setProperty(key,(Math.round(sizes[key]*n*100)/100)+'px'));
 // Input >=16px no iOS: impede zoom automático do Safari ao focar um campo clínico.
 root.style.setProperty('--cj-read-clinic',Math.max(16,Math.round(16*n*100)/100)+'px');
 if(range)range.value=String(Math.round(n*100));if(output)output.textContent=Math.round(n*100)+'%';
 if(remember)try{localStorage.setItem(KEY,String(n));}catch(_){}
 }
 function close(){if(!pop)return;pop.hidden=true;btn.setAttribute('aria-expanded','false');document.body.classList.remove('cj-read-open');}
 function setupRead(){
   const marker=document.getElementById('cj-notify-wrap');
   if(!marker)return;
   const wrap=document.createElement('div');wrap.className='cj-read-wrap';
   wrap.innerHTML='<button type="button" class="cj-read-trigger" aria-label="Ajustar tamanho do texto" aria-expanded="false" aria-controls="cj-read-pop" title="Tamanho do texto"><span>a</span><span class="cj-read-big">A</span></button>'+
    '<section id="cj-read-pop" class="cj-read-pop" role="dialog" aria-label="Tamanho do texto" hidden><div class="cj-read-head"><div><strong>Tamanho do texto</strong><p>Deslize para ajustar a leitura.</p></div><button type="button" class="cj-read-close" aria-label="Fechar ajuste">×</button></div>'+
    '<div class="cj-read-range-line"><span class="cj-read-low" aria-hidden="true">A</span><input class="cj-read-range" type="range" min="84" max="120" step="1" value="100" aria-label="Tamanho do texto"><span class="cj-read-high" aria-hidden="true">A</span></div>'+
    '<div class="cj-read-value" aria-live="off">100%</div><button type="button" class="cj-read-reset">Restaurar padrão</button></section>';
   marker.parentElement.insertBefore(wrap,marker);
   btn=wrap.querySelector('button');pop=wrap.querySelector('.cj-read-pop');range=wrap.querySelector('input');output=wrap.querySelector('.cj-read-value');
   aplicar(stored(),false);
   btn.addEventListener('click',e=>{e.stopPropagation();const will=pop.hidden;document.getElementById('cj-notify-pop')?.setAttribute('hidden','');document.getElementById('cj-notify-trigger')?.setAttribute('aria-expanded','false');if(will){pop.hidden=false;btn.setAttribute('aria-expanded','true');document.body.classList.add('cj-read-open');}else close();});
   wrap.querySelector('.cj-read-close').addEventListener('click',()=>{close();btn.focus();});
   wrap.querySelector('.cj-read-reset').addEventListener('click',()=>aplicar(1,true));
   range.addEventListener('input',()=>aplicar(Number(range.value)/100,true));
   document.addEventListener('click',e=>{if(!pop.hidden&&!wrap.contains(e.target))close();});
   document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!pop.hidden){close();btn.focus();}});
 }
 function updateGlass(){
  if(!container||!glass)return;
  if(!container.getClientRects().length)return;
  const selected=container.querySelector('.tab.active');if(!selected)return;
  const base=container.getBoundingClientRect(),r=selected.getBoundingClientRect();
  const x=r.left-base.left,y=r.top-base.top;
  container.style.setProperty('--cj-glass-x',x+'px');container.style.setProperty('--cj-glass-y',y+'px');
  container.style.setProperty('--cj-glass-w',r.width+'px');container.style.setProperty('--cj-glass-h',r.height+'px');
  requestAnimationFrame(()=>glass.classList.remove('is-init'));
 }
 function setupGlass(){
  container=document.getElementById('atend-tabs');if(!container)return;
  glass=document.createElement('span');glass.className='cj-glass-indicator is-init';glass.setAttribute('aria-hidden','true');
  container.prepend(glass);
  const raf=()=>requestAnimationFrame(updateGlass);
  container.addEventListener('click',raf);
  const observer=new MutationObserver(raf);
  container.querySelectorAll('.tab').forEach(t=>observer.observe(t,{attributes:true,attributeFilter:['class']}));
  if(window.ResizeObserver){const ro=new ResizeObserver(raf);ro.observe(container);container.querySelectorAll('.tab').forEach(t=>ro.observe(t));}
  window.addEventListener('resize',raf,{passive:true});window.addEventListener('orientationchange',raf,{passive:true});
  raf();
 }
 function init(){aplicar(stored(),false);setupRead();setupGlass();}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
