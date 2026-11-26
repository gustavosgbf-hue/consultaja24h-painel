/* Financeiro de aquisição: só aparece para o admin autenticado.
 * Somente leitura. A autorização real é verificada no servidor.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const novo=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
const brl=c=>c===null||c===undefined?'–':(Number(c)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:Math.abs(c)>=1e6?0:2});
const brl0=c=>c===null||c===undefined?'–':(Number(c)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
const int=n=>Number(n||0).toLocaleString('pt-BR');
const pct=x=>x===null||x===undefined?'–':(x*100).toLocaleString('pt-BR',{maximumFractionDigits:0})+'%';
const hoje=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Fortaleza'}).format(new Date());
const somaDias=(iso,n)=>new Date(Date.parse(iso+'T12:00:00Z')+n*864e5).toISOString().slice(0,10);
const dataBR=iso=>iso.slice(8,10)+'/'+iso.slice(5,7);
function isAdmin(){
 if(typeof window.cjAdminFinanceMode==='function')return !!window.cjAdminFinanceMode();
 try{return typeof medico==='object'&&String(medico?.email||'').toLowerCase()==='gustavosgbf@gmail.com';}catch(_){return false;}
}
const PRESETS=[
 ['7d','7 dias',()=>[somaDias(hoje(),-6),hoje()]],
 ['30d','30 dias',()=>[somaDias(hoje(),-29),hoje()]],
 ['mes','Este mês',()=>[hoje().slice(0,8)+'01',hoje()]],
 ['mesant','Mês anterior',()=>{const h=hoje();const ini=new Date(Date.UTC(+h.slice(0,4),+h.slice(5,7)-2,1));const fim=new Date(Date.UTC(+h.slice(0,4),+h.slice(5,7)-1,0));return [ini.toISOString().slice(0,10),fim.toISOString().slice(0,10)];}],
 ['90d','90 dias',()=>[somaDias(hoje(),-89),hoje()]],
 ['regra','Desde 16/11',()=>['2026-11-16',hoje()]]
];
let overlay,corpo,inDe,inAte,chips=[],nonce=0,btnMenu;
function construir(){
 if(overlay)return;
 overlay=novo('div','modal-overlay cj-financeiro');overlay.id='cj-financeiro-admin';overlay.setAttribute('role','presentation');
 const modal=novo('section','modal cj-fin-modal');modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Financeiro da aquisição');
 const head=novo('div','cj-fin-header');const t=novo('div');
 t.appendChild(novo('h2',null,'Financeiro'));t.appendChild(novo('p',null,'Mídia, faturamento, margem real e retorno por canal'));
 head.appendChild(t);
 const fechar=novo('button','cj-fin-close','×');fechar.type='button';fechar.setAttribute('aria-label','Fechar');fechar.addEventListener('click',close);head.appendChild(fechar);
 modal.appendChild(head);
 const filtro=novo('div','cj-fin-filtro');const presets=novo('div','cj-fin-presets');
 PRESETS.forEach(([id,rot,fn])=>{const b=novo('button','cj-fin-chip',rot);b.type='button';b.dataset.preset=id;b.setAttribute('aria-pressed','false');
  b.addEventListener('click',()=>{const [d,a]=fn();inDe.value=d;inAte.value=a;marcar(id);carregar();});chips.push(b);presets.appendChild(b);});
 filtro.appendChild(presets);
 const datas=novo('div','cj-fin-datas');
 inDe=novo('input');inDe.type='date';inDe.setAttribute('aria-label','Data inicial');
 inAte=novo('input');inAte.type='date';inAte.setAttribute('aria-label','Data final');
 [inDe,inAte].forEach(i=>i.addEventListener('change',()=>{marcar(null);if(inDe.value&&inAte.value)carregar();}));
 datas.appendChild(inDe);datas.appendChild(novo('span',null,'até'));datas.appendChild(inAte);
 const atualizar=novo('button','cj-fin-refresh','Atualizar');atualizar.type='button';atualizar.addEventListener('click',carregar);datas.appendChild(atualizar);
 filtro.appendChild(datas);modal.appendChild(filtro);
 corpo=novo('div','cj-fin-body');corpo.setAttribute('aria-live','polite');modal.appendChild(corpo);
 overlay.appendChild(modal);overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
 document.body.appendChild(overlay);
}
function marcar(id){chips.forEach(c=>c.setAttribute('aria-pressed',String(c.dataset.preset===id)));}
function close(){nonce++;if(overlay)overlay.classList.remove('open')}
function abrir(){
 if(!isAdmin())return;
 construir();overlay.classList.add('open');
 if(!inDe.value){const [d,a]=PRESETS[1][2]();inDe.value=d;inAte.value=a;marcar('30d');}
 carregar();
}
function variacao(atual,anterior,inverso){
 if(anterior===null||anterior===undefined||!isFinite(anterior)||anterior===0)return null;
 const v=(atual-anterior)/Math.abs(anterior);
 return {v,bom:inverso?v<0:v>0};
}
function kpi(rotulo,valor,detalhe,destaque){
 const k=novo('div','cj-fin-kpi'+(destaque?' destaque':''));k.appendChild(novo('span',null,rotulo));
 const s=novo('strong',null,valor);k.appendChild(s);
 if(detalhe){const sm=novo('small');if(typeof detalhe==='string')sm.textContent=detalhe;else sm.appendChild(detalhe);k.appendChild(sm);}
 return k;
}
function vsAnterior(atual,anterior,fmt,inverso){
 const f=document.createDocumentFragment();const v=variacao(atual,anterior,inverso);
 if(!v){f.appendChild(document.createTextNode('Período anterior: '+fmt(anterior)));return f;}
 const b=novo('b',null,(v.v>0?'+':'')+pct(v.v));f.appendChild(b);f.appendChild(document.createTextNode(' vs '+fmt(anterior)));return f;
}
function leituraIncremental(inc){
 const t=inc.total;if(!t)return 'Sem dados de comparação.';
 if(t.delta_gasto>0){
  if(t.margem_por_real_adicional!==null&&t.margem_por_real_adicional>=1)return 'O investimento subiu '+brl0(t.delta_gasto)+' e a margem subiu '+brl0(t.delta_margem)+'. Cada R$ 1 a mais em mídia trouxe R$ '+t.margem_por_real_adicional.toFixed(2).replace('.',',')+' de margem: o aumento se pagou.';
  if(t.delta_margem>0)return 'O investimento subiu '+brl0(t.delta_gasto)+' e a margem subiu '+brl0(t.delta_margem)+'. Cada R$ 1 a mais trouxe só R$ '+t.margem_por_real_adicional.toFixed(2).replace('.',',')+' de margem: mais pacientes, mas o aumento não se pagou no período.';
  return 'O investimento subiu '+brl0(t.delta_gasto)+' e a margem não acompanhou ('+brl0(t.delta_margem)+'). O gasto adicional não trouxe retorno no período.';
 }
 if(t.delta_gasto<0){
  return 'O investimento caiu '+brl0(-t.delta_gasto)+' e a margem variou '+brl0(t.delta_margem)+'. '+(t.delta_resultado>0?'O resultado melhorou.':'O resultado piorou: a redução custou mais margem do que economizou.');
 }
 return 'Investimento estável em relação ao período anterior.';
}
function grafico(diario,de,ate){
 const wrap=novo('div','cj-fin-grafico');
 const leg=novo('div','cj-fin-legenda');
 const l1=novo('span');const i1=novo('i');i1.style.background='var(--cj-accent)';l1.appendChild(i1);l1.appendChild(document.createTextNode('Margem apurada'));
 const l2=novo('span');const i2=novo('i');i2.style.background='var(--cj-text-3)';i2.style.height='2px';i2.style.verticalAlign='3px';l2.appendChild(i2);l2.appendChild(document.createTextNode('Investimento em mídia'));
 leg.appendChild(l1);leg.appendChild(l2);wrap.appendChild(leg);
 const mapa=new Map(diario.map(d=>[d.dia,d]));const dias=[];for(let d=de;d<=ate;d=somaDias(d,1))dias.push(d);
 const pontos=dias.map(d=>mapa.get(d)||{dia:d,gasto:0,margem:0,pagamentos:0,novos:0,bruto:0});
 const W=1000,H=220,pl=56,pr=8,pt=8,pb=24;const max=Math.max(1,...pontos.map(p=>Math.max(p.gasto,p.margem)));
 const min=Math.min(0,...pontos.map(p=>p.margem));const esc=v=>pt+(H-pt-pb)*(1-(v-min)/(max-min));
 const passo=(W-pl-pr)/pontos.length;const bw=Math.max(2,Math.min(22,passo-2));
 const ns='http://www.w3.org/2000/svg';const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 '+W+' '+H);
 svg.setAttribute('role','img');svg.setAttribute('aria-label','Margem apurada e investimento em mídia por dia');
 const el=(n,a)=>{const e=document.createElementNS(ns,n);for(const k in a)e.setAttribute(k,a[k]);svg.appendChild(e);return e;};
 for(let i=0;i<=3;i++){const v=min+(max-min)*i/3;const y=esc(v);el('line',{x1:pl,x2:W-pr,y1:y,y2:y,stroke:'var(--cj-border)','stroke-width':1,'vector-effect':'non-scaling-stroke'});
  const tx=el('text',{x:pl-8,y:y+4,'text-anchor':'end','font-size':11,fill:'var(--cj-text-3)'});tx.textContent=brl0(v);}
 const y0=esc(0);
 pontos.forEach((p,i)=>{const x=pl+i*passo+(passo-bw)/2;const y=esc(Math.max(0,p.margem));const h=Math.abs(esc(p.margem)-y0);
  el('rect',{x,y:p.margem>=0?y:y0,width:bw,height:Math.max(0,h),rx:Math.min(4,bw/2),fill:p.margem>=0?'var(--cj-accent)':'var(--cj-danger)'});});
 const linha=pontos.map((p,i)=>(i?'L':'M')+(pl+i*passo+passo/2).toFixed(1)+' '+esc(p.gasto).toFixed(1)).join(' ');
 el('path',{d:linha,fill:'none',stroke:'var(--cj-text-3)','stroke-width':2,'vector-effect':'non-scaling-stroke','stroke-linejoin':'round'});
 const rot=Math.max(1,Math.ceil(pontos.length/10));
 pontos.forEach((p,i)=>{if(i%rot)return;const tx=el('text',{x:pl+i*passo+passo/2,y:H-6,'text-anchor':'middle','font-size':11,fill:'var(--cj-text-3)'});tx.textContent=dataBR(p.dia);});
 const tip=novo('div','cj-fin-tip');
 const alvo=el('rect',{x:pl,y:0,width:W-pl-pr,height:H,fill:'transparent'});
 alvo.addEventListener('mousemove',e=>{const r=svg.getBoundingClientRect();const fx=(e.clientX-r.left)/r.width*W;const i=Math.max(0,Math.min(pontos.length-1,Math.floor((fx-pl)/passo)));const p=pontos[i];
  tip.textContent='';const linhas=[dataBR(p.dia),'Margem '+brl(p.margem),'Mídia '+brl(p.gasto),int(p.pagamentos)+' pagamentos · '+int(p.novos)+' novos'];
  linhas.forEach((l,j)=>{const d=novo('div',null,l);if(!j)d.style.fontWeight='750';tip.appendChild(d);});
  tip.style.left=((pl+i*passo+passo/2)/W*100)+'%';tip.style.top=(esc(Math.max(p.margem,p.gasto))/H*r.height+28)+'px';tip.classList.add('on');});
 alvo.addEventListener('mouseleave',()=>tip.classList.remove('on'));
 wrap.appendChild(svg);wrap.appendChild(tip);return wrap;
}
function tabelaCanais(d){
 const wrap=novo('div','cj-fin-tabela-wrap');const t=novo('table','cj-fin-tabela');
 const cols=['Canal','Mídia','Pagamentos','Novos','CAC novo','Custo/pagto','Faturamento','Repasses','Margem','Resultado','Retorno','Recorrentes','Novos que voltaram'];
 const thead=novo('thead');const trh=novo('tr');cols.forEach(c=>{const th=novo('th',null,c);th.scope='col';trh.appendChild(th);});thead.appendChild(trh);t.appendChild(thead);
 const tb=novo('tbody');
 const linha=(nome,c,total)=>{
  const tr=novo('tr',total?'total':null);
  const cel=(txt,cls)=>{const td=novo('td',cls||null,txt);tr.appendChild(td);};
  cel(nome);
  cel(c.gasto?brl0(c.gasto):'–',c.gasto?null:'cj-fin-muted');
  cel(int(c.pagamentos));cel(int(c.novos));
  cel(c.cac_novo!=null&&c.gasto?brl(c.cac_novo):'–',c.gasto?null:'cj-fin-muted');
  cel(c.custo_por_pagamento!=null&&c.gasto?brl(c.custo_por_pagamento):'–',c.gasto?null:'cj-fin-muted');
  cel(brl0(c.bruto-c.estornos));cel(brl0(c.repasse));
  cel(brl0(c.margem)+(c.margem_pendente?' *':''));
  cel(brl0(c.resultado),c.resultado<0?'cj-fin-neg':null);
  cel(c.retorno_sobre_midia!=null?pct(c.retorno_sobre_midia):'–',c.retorno_sobre_midia!=null&&c.retorno_sobre_midia<0?'cj-fin-neg':(c.retorno_sobre_midia==null?'cj-fin-muted':null));
  cel(pct(c.taxa_recorrencia));
  cel(c.novos?int(c.novos_que_voltaram)+' ('+pct(c.retorno_novos)+')':'–');
  tb.appendChild(tr);
 };
 d.canais.forEach(c=>linha(c.rotulo,c,false));
 linha('Total',{...d.total,cac_novo:d.cac_novo_combinado},true);
 t.appendChild(tb);wrap.appendChild(t);return wrap;
}
function avisos(d){
 const box=novo('div','cj-fin-avisos');const p=d.pendencias||{};
 const add=(titulo,txt)=>{const a=novo('div','cj-fin-aviso');a.appendChild(novo('b',null,titulo+' '));a.appendChild(document.createTextNode(txt));box.appendChild(a);};
 const taxa=Object.keys(p).filter(k=>k.startsWith('taxa_nao_configurada')).reduce((s,k)=>s+p[k],0);
 if(taxa)add('Taxas de pagamento não configuradas.','A margem ainda não desconta a tarifa do PagBank/Stripe em '+int(taxa)+' pagamentos.');
 if(p.imposto_nao_configurado)add('Imposto não configurado.','A margem ainda não desconta imposto sobre a receita.');
 if(p.repasse_antes_da_regra_vigente)add('Repasse sem regra antes de 16/11.',int(p.repasse_antes_da_regra_vigente)+' pagamentos ficam fora da margem (marcados com *).');
 const outros=(p.medico_nao_identificado||0)+(p.repasse_sem_regra||0);
 if(outros)add('Margem pendente.',int(outros)+' consultas ainda sem médico ou sem regra de repasse (marcadas com *).');
 (d.fontes_gasto||[]).forEach(f=>{if(d.ate>f.ultimo)add('Gasto '+(f.canal==='google_ads'?'do Google Ads':f.canal)+' até '+dataBR(f.ultimo)+'.','Dias seguintes ainda sem custo importado; o resultado desses dias está superestimado.');});
 const g=d.coleta?.google_ads;if(g&&g.configurado&&!g.ok)add('Coleta do Google Ads com falha.','Última tentativa: '+(g.erro||'erro'));
 return box.childNodes.length?box:null;
}
async function carregar(){
 if(!isAdmin()){close();return}
 const de=inDe.value,ate=inAte.value;if(!de||!ate)return;
 const atual=++nonce;corpo.textContent='';corpo.appendChild(novo('p','cj-fin-empty','Montando o financeiro…'));
 try{
  const fn=window.cjFinanceiroFonte;if(typeof fn!=='function')throw Error('Serviço ainda não configurado');
  const d=await fn(de,ate);if(atual!==nonce)return;
  if(!d||d.ok!==true)throw Error(d?.error||'Dados indisponíveis');
  render(d);
 }catch(err){
  if(atual!==nonce)return;corpo.textContent='';corpo.appendChild(novo('p','cj-fin-empty','Financeiro indisponível agora. '+(err.message||'')));
 }
}
function render(d){
 corpo.textContent='';const T=d.total,A=d.anterior?.total||{};
 const k=novo('div','cj-fin-kpis');
 k.appendChild(kpi('Resultado após mídia',brl0(T.resultado),vsAnterior(T.resultado,A.resultado,brl0),true));
 k.appendChild(kpi('Margem apurada',brl0(T.margem),vsAnterior(T.margem,A.margem,brl0)));
 k.appendChild(kpi('Investimento em mídia',brl0(T.gasto),vsAnterior(T.gasto,A.gasto,brl0)));
 k.appendChild(kpi('Faturamento líquido',brl0(T.bruto-T.estornos),'Estornos '+brl0(T.estornos)));
 k.appendChild(kpi('Pacientes novos',int(T.novos),'CAC combinado '+brl(d.cac_novo_combinado)));
 k.appendChild(kpi('Pagamentos',int(T.pagamentos),int(T.recorrentes)+' recorrentes ('+pct(T.taxa_recorrencia)+')'));
 corpo.appendChild(k);
 const inc=novo('section','cj-fin-card');inc.appendChild(novo('h3',null,'Investir mais compensa?'));
 inc.appendChild(novo('p',null,'Comparação com o período anterior de mesmo tamanho ('+dataBR(d.anterior.de)+' a '+dataBR(d.anterior.ate)+'). Não é um teste controlado: sazonalidade e mudanças no site também pesam.'));
 const g=novo('div','cj-fin-inc');const t=d.incremental.total;
 [['Mídia a mais',brl0(t.delta_gasto)],['Margem a mais',brl0(t.delta_margem)],['Pacientes novos a mais',(t.delta_novos>0?'+':'')+int(t.delta_novos)],
  ['Margem por R$ 1 adicional',t.margem_por_real_adicional===null?'–':'R$ '+t.margem_por_real_adicional.toFixed(2).replace('.',',')],
  ['Custo por novo adicional',t.custo_por_novo_adicional===null?'–':brl(t.custo_por_novo_adicional)]]
  .forEach(([r,v])=>{const x=novo('div');x.appendChild(novo('span',null,r));x.appendChild(novo('strong',null,v));g.appendChild(x);});
 inc.appendChild(g);inc.appendChild(novo('p','cj-fin-leitura',leituraIncremental(d.incremental)));corpo.appendChild(inc);
 const gr=novo('section','cj-fin-card');gr.appendChild(novo('h3',null,'Por dia'));gr.appendChild(grafico(d.diario||[],d.de,d.ate));corpo.appendChild(gr);
 const tc=novo('section','cj-fin-card');tc.appendChild(novo('h3',null,'Por canal'));
 tc.appendChild(novo('p',null,'Margem = faturamento líquido − repasse médico − taxas − impostos. Resultado = margem − mídia. Retorno = resultado ÷ mídia.'));
 tc.appendChild(tabelaCanais(d));
 tc.appendChild(novo('p','cj-fin-note','Atribuição pelo último clique registrado no pagamento. Pagamentos sem identificador de clique aparecem como orgânico, aplicativo ou indicação, então o canal pago tende a ficar subestimado. "Novos que voltaram" conta pagamentos posteriores até hoje.'));
 corpo.appendChild(tc);
 const av=avisos(d);if(av){const c=novo('section','cj-fin-card');c.appendChild(novo('h3',null,'Qualidade dos dados'));c.appendChild(av);corpo.appendChild(c);}
}
function init(){
 const menu=$('cj-status-pop');if(!menu)return;
 btnMenu=novo('button','cj-menu-item cj-fin-launch','Financeiro');btnMenu.type='button';btnMenu.setAttribute('role','menuitem');btnMenu.hidden=true;
 btnMenu.addEventListener('click',abrir);
 const sair=menu.querySelector('.nav-logout');if(sair)menu.insertBefore(btnMenu,sair);else menu.appendChild(btnMenu);
 const sync=()=>{btnMenu.hidden=!isAdmin();if(!isAdmin())close();};
 sync();
 const app=$('screen-app'),name=$('nav-nome');
 if(app)new MutationObserver(sync).observe(app,{attributes:true,attributeFilter:['style','class']});
 if(name)new MutationObserver(sync).observe(name,{childList:true,subtree:true,characterData:true});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay?.classList.contains('open')){e.preventDefault();close()}});
 window.cjAbrirFinanceiroAdmin=abrir;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
