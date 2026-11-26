/* CJ24 Autopilot (admin). Propostas, aprovação, modo e integrações.
 * Nenhuma ação vai ao Google Ads sem: script em execução + painel em execução + aprovação individual.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const novo=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
const brl=v=>v===null||v===undefined||v===''?'–':Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const quando=iso=>iso?new Date(iso).toLocaleString('pt-BR',{timeZone:'America/Fortaleza',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'nunca';
function isAdmin(){
 if(typeof window.cjAdminFinanceMode==='function')return !!window.cjAdminFinanceMode();
 try{return typeof medico==='object'&&String(medico?.email||'').toLowerCase()==='gustavosgbf@gmail.com';}catch(_){return false;}
}
const ROTULO_TIPO={orcamento:'Orçamento diário',tcpa:'CPA desejado',palavra_status:'Palavra-chave'};
const ROTULO_STATUS={proposta:'Proposta',aprovada:'Aprovada',rejeitada:'Rejeitada',expirada:'Expirada',aplicada:'Aplicada',falhou:'Falhou',recusada_local:'Recusada pelo script'};
const valorAcao=(tipo,v)=>tipo==='palavra_status'?(v==='ENABLED'?'Ativa':v==='PAUSED'?'Pausada':String(v)):brl(v);
let overlay,corpo,nonce=0,btnMenu;
function construir(){
 if(overlay)return;
 overlay=novo('div','modal-overlay cj-autopilot');overlay.setAttribute('role','presentation');
 const modal=novo('section','modal cj-fin-modal');modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','CJ24 Autopilot');
 const head=novo('div','cj-fin-header');const t=novo('div');
 t.appendChild(novo('h2',null,'Autopilot'));t.appendChild(novo('p',null,'Gestor de mídia orientado à margem real'));head.appendChild(t);
 const fechar=novo('button','cj-fin-close','×');fechar.type='button';fechar.setAttribute('aria-label','Fechar');fechar.addEventListener('click',close);head.appendChild(fechar);
 modal.appendChild(head);
 corpo=novo('div','cj-fin-body');corpo.style.marginTop='16px';corpo.setAttribute('aria-live','polite');modal.appendChild(corpo);
 overlay.appendChild(modal);overlay.addEventListener('click',e=>{if(e.target===overlay)close()});document.body.appendChild(overlay);
}
function close(){nonce++;if(overlay)overlay.classList.remove('open')}
function abrir(){if(!isAdmin())return;construir();overlay.classList.add('open');carregar();}
async function carregar(){
 if(!isAdmin()){close();return}
 const atual=++nonce;corpo.textContent='';corpo.appendChild(novo('p','cj-fin-empty','Carregando…'));
 try{const d=await window.cjAutopilotFonte();if(atual!==nonce)return;if(!d||d.ok!==true)throw Error(d?.error||'indisponível');render(d);}
 catch(err){if(atual!==nonce)return;corpo.textContent='';corpo.appendChild(novo('p','cj-fin-empty','Autopilot indisponível agora. '+(err.message||'')));}
}
function card(titulo,sub){const c=novo('section','cj-fin-card');c.appendChild(novo('h3',null,titulo));if(sub)c.appendChild(novo('p',null,sub));return c;}
function botao(txt,cls,fn){const b=novo('button',cls||'cj-fin-refresh',txt);b.type='button';b.addEventListener('click',fn);return b;}
function render(d){
 corpo.textContent='';
 const cfg=d.config||{},sync=d.ultimo_sync,snap=d.snapshot;
 const camp=(snap?.campanhas||[]).find(c=>c.status==='ENABLED')||null;
 const k=novo('div','cj-fin-kpis');
 const kp=(r,v,s,dest)=>{const x=novo('div','cj-fin-kpi'+(dest?' destaque':''));x.appendChild(novo('span',null,r));x.appendChild(novo('strong',null,v));if(s)x.appendChild(novo('small',null,s));k.appendChild(x);};
 kp('Modo',cfg.modo==='execucao'?'Execução':'Simulação',cfg.modo==='execucao'?'Executa só o que você aprovar':'Nada é alterado no Google Ads',true);
 kp('Script no Google Ads',sync?(sync.dados?.modo_local==='execucao'?'Execução':'Simulação'):'Não instalado',sync?'Último envio '+quando(sync.criado_em):'Gere o script em Integrações');
 kp('Orçamento atual',camp?brl(camp.orcamento):'–',camp?camp.nome:'');
 kp('CPA desejado atual',camp&&camp.tcpa?brl(camp.tcpa):'–',camp?(camp.estrategia||''):'');
 corpo.appendChild(k);
 const alertas=sync?.dados?.alertas||[];
 if(alertas.length){const a=card('Alertas');const box=novo('div','cj-fin-avisos');alertas.forEach(x=>{const e=novo('div','cj-fin-aviso');e.appendChild(novo('b',null,'Atenção. '));e.appendChild(document.createTextNode(x.mensagem));box.appendChild(e);});a.appendChild(box);corpo.appendChild(a);}

 const pc=card('Propostas','Cada ação precisa da sua aprovação. Mesmo aprovada, só é executada se o painel e o script estiverem em modo de execução.');
 const abertas=(d.decisoes||[]);
 if(!abertas.length)pc.appendChild(novo('p','cj-fin-empty','Nenhuma proposta ainda. Elas aparecem depois do primeiro envio do script.'));
 const lista=novo('div','cj-fin-avisos');
 abertas.forEach(x=>{
  const it=novo('div','cj-fin-aviso');it.style.display='grid';it.style.gap='6px';
  const topo=novo('div');topo.style.display='flex';topo.style.justifyContent='space-between';topo.style.gap='8px';topo.style.flexWrap='wrap';
  const tit=novo('strong',null,(ROTULO_TIPO[x.tipo]||x.tipo)+(x.dados?.texto?': "'+x.dados.texto+'"':'')+(x.prioridade==='reteste'?' · reteste':x.prioridade==='protecao'?' · proteção':''));
  tit.style.color='var(--cj-text)';topo.appendChild(tit);
  topo.appendChild(novo('span',null,(ROTULO_STATUS[x.status]||x.status)+' · '+quando(x.atualizado_em)));it.appendChild(topo);
  it.appendChild(novo('div',null,valorAcao(x.tipo,x.de)+'  →  '+valorAcao(x.tipo,x.para)));
  it.appendChild(novo('div',null,x.justificativa||''));
  if(x.resultado?.motivo)it.appendChild(novo('div',null,'Script: '+x.resultado.status+' ('+x.resultado.motivo+')'));
  if(x.status==='proposta'||x.status==='aprovada'){
   const acoes=novo('div');acoes.style.display='flex';acoes.style.gap='6px';
   if(x.status==='proposta')acoes.appendChild(botao('Aprovar','cj-fin-chip',()=>decidir(x.id,'aprovar')));
   acoes.appendChild(botao(x.status==='aprovada'?'Cancelar aprovação':'Rejeitar','cj-fin-chip',()=>decidir(x.id,'rejeitar')));
   it.appendChild(acoes);
  }
  lista.appendChild(it);
 });
 pc.appendChild(lista);corpo.appendChild(pc);

 const ins=sync?.dados?.insights||[];
 if(ins.length){
  const ic=card('Leitura do último ciclo');const box=novo('div','cj-fin-avisos');
  ins.forEach(i=>{
   const e=novo('div','cj-fin-aviso');
   if(i.codigo==='economia_google'&&i.dados){const x=i.dados;e.textContent='Base ('+x.janela_dias+' dias, cliques novos do Google): '+x.pagamentos+' pagamentos, '+x.novos+' novos. Margem média '+brl(x.margem_media)+', retorno esperado por novo '+brl(x.ltv_margem_novo)+', valor por pagamento '+brl(x.valor_por_pagamento)+'. CPA real médio '+brl(x.cpa_medio)+', marginal '+brl(x.cpa_marginal)+(x.elasticidade?' (elasticidade '+String(x.elasticidade.b).replace('.',',')+')':'')+'.';}
   else if(i.codigo==='horarios'&&i.dados){const f=h=>String(h.hora).padStart(2,'0')+'h ('+brl(h.resultado/100)+')';e.textContent='Horários com melhor resultado: '+i.dados.melhores.map(f).join(', ')+'. Piores: '+i.dados.piores.map(f).join(', ')+'. Só leitura: o Autopilot não altera programação de anúncios.';}
   else e.textContent=i.mensagem;
   box.appendChild(e);
  });
  ic.appendChild(box);corpo.appendChild(ic);
 }

 const mc=card('Modo do Autopilot','Em simulação o Autopilot só registra propostas. A execução também depende da trava MODO_LOCAL dentro do script no Google Ads.');
 const linha=novo('div');linha.style.display='flex';linha.style.gap='8px';linha.style.flexWrap='wrap';linha.style.alignItems='center';
 if(cfg.modo==='execucao'){linha.appendChild(botao('Voltar para simulação','cj-fin-refresh',()=>mudarModo('simulacao')));}
 else{
  const inp=novo('input');inp.placeholder='Digite EXECUTAR';inp.setAttribute('aria-label','Confirmação para ativar execução');
  inp.style.cssText='padding:7px 9px;border-radius:10px;background:var(--cj-surface-2);border:1px solid var(--cj-border);color:var(--cj-text);font:inherit;font-size:.78rem';
  linha.appendChild(inp);linha.appendChild(botao('Ativar execução','cj-fin-refresh',()=>{if(inp.value.trim()!=='EXECUTAR'){inp.focus();return}mudarModo('execucao','EXECUTAR');}));
 }
 mc.appendChild(linha);corpo.appendChild(mc);

 const ig=card('Integrações','Gerar um novo token revoga o anterior na hora. O script baixado já vem com o token; cole no Google Ads ou Microsoft Ads e programe para rodar a cada hora.');
 const box=novo('div','cj-fin-avisos');
 [['google_ads_script','Google Ads (gasto + Autopilot)'],['microsoft_ads_script','Microsoft Ads (gasto)']].forEach(([esc,rot])=>{
  const s=d.integracoes?.[esc];const e=novo('div','cj-fin-aviso');e.style.display='flex';e.style.justifyContent='space-between';e.style.gap='8px';e.style.flexWrap='wrap';e.style.alignItems='center';
  const info=novo('div');info.appendChild(novo('b',null,rot+' '));info.lastChild.style.color='var(--cj-text)';
  info.appendChild(document.createTextNode(s?'token final …'+s.sufixo+', criado '+quando(s.criado_em)+', último uso '+quando(s.ultimo_uso_em):'sem token ativo'));
  e.appendChild(info);e.appendChild(botao(s?'Gerar novo e baixar script':'Gerar e baixar script','cj-fin-chip',()=>gerar(esc)));box.appendChild(e);
 });
 ig.appendChild(box);corpo.appendChild(ig);
}
async function decidir(id,acao){try{const r=await window.cjAutopilotDecidir(id,acao);if(!r?.ok)throw Error(r?.error||'falhou');carregar();}catch(e){window.alert('Não foi possível registrar: '+(e.message||''));}}
async function mudarModo(modo,confirmacao){try{const r=await window.cjAutopilotModo(modo,confirmacao);if(!r?.ok)throw Error(r?.error||'falhou');carregar();}catch(e){window.alert('Não foi possível mudar o modo: '+(e.message||''));}}
async function gerar(escopo){
 if(!window.confirm('Gerar um novo token desativa o atual. O script instalado vai parar até você colar o novo. Continuar?'))return;
 try{
  const r=await window.cjIntegracaoToken(escopo);if(!r?.ok||!r.script)throw Error(r?.error||'falhou');
  const blob=new Blob([r.script],{type:'text/javascript'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=r.nome_arquivo||'cj24-script.js';
  document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);carregar();
 }catch(e){window.alert('Não foi possível gerar: '+(e.message||''));}
}
function init(){
 const menu=$('cj-status-pop');if(!menu)return;
 btnMenu=novo('button','cj-menu-item cj-fin-launch','Autopilot');btnMenu.type='button';btnMenu.setAttribute('role','menuitem');btnMenu.hidden=true;btnMenu.addEventListener('click',abrir);
 const sair=menu.querySelector('.nav-logout');if(sair)menu.insertBefore(btnMenu,sair);else menu.appendChild(btnMenu);
 const sync=()=>{btnMenu.hidden=!isAdmin();if(!isAdmin())close();};sync();
 const app=$('screen-app'),name=$('nav-nome');
 if(app)new MutationObserver(sync).observe(app,{attributes:true,attributeFilter:['style','class']});
 if(name)new MutationObserver(sync).observe(name,{childList:true,subtree:true,characterData:true});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay?.classList.contains('open')){e.preventDefault();close()}});
 window.cjAbrirAutopilotAdmin=abrir;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
