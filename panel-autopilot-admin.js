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
 try{
  const [d,ind,coo,mp]=await Promise.all([window.cjAutopilotFonte(),window.cjAutopilotIndicadores().catch(()=>null),window.cjCoortes().catch(()=>null),window.cjModoProprietario().catch(()=>null)]);
  if(atual!==nonce)return;if(!d||d.ok!==true)throw Error(d?.error||'indisponível');d._ind=ind;d._coo=coo;d._mp=mp;render(d);}
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
   if(i.codigo==='economia_google'&&i.dados){const x=i.dados;e.textContent='Base ('+x.janela_dias+' dias, cliques novos do Google): '+x.pagamentos+' pagamentos, '+x.novos+' novos. Margem média '+brl(x.margem_media)+', retorno esperado por novo '+brl(x.ltv_margem_novo)+', valor por pagamento '+brl(x.valor_por_pagamento)+'. CPA real médio '+brl(x.cpa_medio)+', marginal '+brl(x.cpa_marginal)+(x.elasticidade?' (elasticidade '+String(x.elasticidade.b).replace('.',',')+')':'')+'.'+(x.cenarios&&x.cenarios.length?' Valor por pagamento conforme sua participação nas imediatas: '+x.cenarios.map(c=>Math.round(c.participacao*100)+'% → '+brl(c.valor_por_pagamento)).join(', ')+'.':'');}
   else if(i.codigo==='horarios'&&i.dados){const f=h=>String(h.hora).padStart(2,'0')+'h ('+brl(h.resultado/100)+')';e.textContent='Horários com melhor resultado: '+i.dados.melhores.map(f).join(', ')+'. Piores: '+i.dados.piores.map(f).join(', ')+'. Só leitura: o Autopilot não altera programação de anúncios.';}
   else e.textContent=i.mensagem;
   box.appendChild(e);
  });
  ic.appendChild(box);corpo.appendChild(ic);
 }

 const lc=card('Limites','Autorização de investimento e tamanho máximo de cada passo. O script no Google Ads tem travas técnicas próprias (até R$ 1.500/dia e 15% por passo); vale sempre o mais restritivo.');
 const campos=[['orcamento_habitual','Orçamento habitual (R$/dia)',1,cfg.orcamento_habitual],['orcamento_teto','Faixa com evidência até (R$/dia)',1,cfg.orcamento_teto],['orcamento_excepcional','Excepcional, com sua aprovação (R$/dia)',1,cfg.orcamento_excepcional],['orcamento_piso','Piso de orçamento (R$/dia)',1,cfg.orcamento_piso],['participacao_prevista','Sua participação prevista nas imediatas (%)',100,cfg.participacao_prevista],
  ['passo_orcamento','Passo máximo de orçamento (%)',100,cfg.passo_orcamento],['passo_tcpa','Passo máximo de CPA (%)',100,cfg.passo_tcpa],
  ['tcpa_min','CPA desejado mínimo (R$)',1,cfg.tcpa_min],['tcpa_max','CPA desejado máximo (R$)',1,cfg.tcpa_max]];
 const grid=novo('div','cj-fin-inc');const inputs={};
 campos.forEach(([k,rot,mult,v])=>{const w=novo('label');w.style.display='flex';w.style.flexDirection='column';w.style.gap='4px';w.appendChild(novo('span',null,rot));
  const i=novo('input');i.type='number';i.step=mult===100?'1':'0.01';i.value=v==null?'':String(Math.round(v*mult*100)/100);
  i.style.cssText='padding:7px 9px;border-radius:10px;background:var(--cj-surface-2);border:1px solid var(--cj-border);color:var(--cj-text);font:inherit;font-size:.82rem';
  inputs[k]=[i,mult];w.appendChild(i);grid.appendChild(w);});
 lc.appendChild(grid);
 const cong=novo('div');cong.style.cssText='display:flex;gap:16px;flex-wrap:wrap;margin-top:12px;font-size:.8rem;color:var(--cj-text-2)';
 const chk=(k,rot)=>{const l=novo('label');l.style.cssText='display:flex;gap:6px;align-items:center';const c=novo('input');c.type='checkbox';c.checked=cfg[k]!==false;inputs['__'+k]=c;l.appendChild(c);l.appendChild(document.createTextNode(rot));cong.appendChild(l);};
 chk('congelar_orcamento','Manter orçamento atual (congelado)');chk('congelar_tcpa','Manter CPA atual (congelado)');lc.appendChild(cong);
 if((cfg.testes_planejados||[]).length)lc.appendChild(novo('p','cj-fin-note','Testes planejados: '+cfg.testes_planejados.map(t=>t.nota+' (R$ '+t.para+')').join('; ')+'. Só são propostos com o CPA descongelado e sem outra mudança em curso.'));
 const salvar=botao('Salvar limites','cj-fin-refresh',async()=>{
  const body={};for(const k in inputs){if(k.startsWith('__')){body[k.slice(2)]=inputs[k].checked;continue}const [i,mult]=inputs[k];const raw=String(i.value).trim();body[k]=raw===''?null:Number(raw.replace(',','.'))/mult;}
  try{const r=await window.cjAutopilotLimites(body);if(!r?.ok)throw Error(r?.error==='valores_fora_da_faixa'?'Valores fora da faixa (passos de 1% a 15%, orçamento de R$ 100 a R$ 500).':r?.error==='ordem_invalida'?'Ordem inválida: piso ≤ habitual ≤ faixa com evidência ≤ excepcional.':(r?.error||'falhou'));carregar();}
  catch(e){window.alert('Não foi possível salvar: '+(e.message||''));}
 });salvar.style.marginTop='12px';lc.appendChild(salvar);
 lc.appendChild(novo('p','cj-fin-note','Janela de conversão por clique usada para validar a origem dos pagamentos: '+(cfg.janela_clique_dias||30)+' dias'+(cfg.janela_clique_dias?' (lida do Google Ads)':' (padrão, até o primeiro envio do script)')+'.'));
 corpo.appendChild(lc);

 // Modo proprietário
 const mp=d._mp;const pc2=card('Modo proprietário','Reserva as consultas imediatas para você por poucos minutos. Se você não assumir, saem do plantão ou acumulam, vão automaticamente para a equipe.');
 if(mp&&mp.ok){
  const m=mp.modo||{};const p7=mp.participacao_7d||{};
  const st=novo('p','cj-fin-leitura',(m.ativo?'Ligado até '+quando(m.ate)+', reserva de '+m.minutos_reserva+' min.':'Desligado'+(m.desligado_motivo&&m.desligado_motivo!=='manual'?' (automaticamente: '+({prazo_encerrado:'prazo encerrado',fora_do_plantao:'você saiu do plantão',reservas_expiradas:'reservas expiraram sem você assumir'}[m.desligado_motivo]||m.desligado_motivo)+')':'')+'.')+' Nos últimos 7 dias você atendeu '+(p7.total?Math.round(p7.fracao*100)+'% ('+p7.suas+' de '+p7.total+')':'0')+' das imediatas.');
  pc2.appendChild(st);
  const lin=novo('div');lin.style.cssText='display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px';
  if(m.ativo)lin.appendChild(botao('Liberar para a equipe agora','cj-fin-refresh',()=>alternarProprietario(false)));
  else{const h=novo('select');[1,2,3,4].forEach(x=>{const o=novo('option',null,x+' h');o.value=x;if(x===2)o.selected=true;h.appendChild(o)});h.style.cssText='padding:7px;border-radius:10px;background:var(--cj-surface-2);border:1px solid var(--cj-border);color:var(--cj-text);font:inherit';
   lin.appendChild(h);lin.appendChild(botao('Priorizar imediatas para mim','cj-fin-refresh',()=>alternarProprietario(true,Number(h.value))));}
  pc2.appendChild(lin);
 }else pc2.appendChild(novo('p','cj-fin-empty','Indisponível.'));
 corpo.appendChild(pc2);

 // Indicadores diários
 const ind=d._ind;const icard=card('Indicadores diários da campanha',ind?.observacao||'');
 if(ind&&ind.ok&&ind.dias.length){
  const wrap=novo('div','cj-fin-tabela-wrap');const t=novo('table','cj-fin-tabela');
  const cols=['Dia','Gasto','Impr.','Cliques','CPC','Parcela','Perda class.','Perda orç.','Pagtos','Google','Novos','Recorr.','CPA real'];
  const th=novo('thead');const tr=novo('tr');cols.forEach(c=>tr.appendChild(novo('th',null,c)));th.appendChild(tr);t.appendChild(th);
  const tb=novo('tbody');const pctx=v=>v==null?'–':Math.round(v*100)+'%';
  const marcos={};(ind.marcos||[]).forEach(m=>{(marcos[m.dia]||(marcos[m.dia]=[])).push(m.tipo)});
  ind.dias.slice().reverse().forEach(x=>{const r=novo('tr');
   const dd=novo('td',null,x.dia.slice(8,10)+'/'+x.dia.slice(5,7)+(x.parcial?' *':''));if(marcos[x.dia]){dd.title=marcos[x.dia].join(', ');dd.style.fontWeight='750';dd.textContent+=' ●';}r.appendChild(dd);
   [brl(x.custo),x.impressoes,x.cliques,x.cpc==null?'–':brl(x.cpc),pctx(x.parcela),pctx(x.perdida_classificacao),pctx(x.perdida_orcamento),x.pagamentos,x.pagamentos_google,x.novos,x.recorrentes,x.cpa_real==null?'–':brl(x.cpa_real)].forEach(v=>r.appendChild(novo('td',null,String(v))));
   tb.appendChild(r);});
  t.appendChild(tb);wrap.appendChild(t);icard.appendChild(wrap);
  const ml=(ind.marcos||[]).slice(-12).reverse();
  if(ml.length)icard.appendChild(novo('p','cj-fin-note','● Marcos: '+ml.map(m=>m.dia.slice(8,10)+'/'+m.dia.slice(5,7)+' '+m.tipo+(m.origem&&m.fonte==='google_ads'?' ('+String(m.origem).toLowerCase().replace(/_/g,' ')+')':'')).join(' · ')+'. * dia ainda parcial. CPA real = gasto ÷ pagamentos com clique do Google.'));
  const add=novo('div');add.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin-top:10px';
  const di=novo('input');di.type='date';const de=novo('input');de.placeholder='Marco (ex.: landing otimizada publicada)';de.style.minWidth='260px';
  [di,de].forEach(i=>{i.style.cssText+=';padding:7px 9px;border-radius:10px;background:var(--cj-surface-2);border:1px solid var(--cj-border);color:var(--cj-text);font:inherit;font-size:.8rem'});
  add.appendChild(di);add.appendChild(de);add.appendChild(botao('Adicionar marco','cj-fin-chip',async()=>{if(!di.value||!de.value.trim())return;const r=await window.cjAutopilotMarco(di.value,de.value.trim());if(r?.ok)carregar();}));
  icard.appendChild(add);
 }else icard.appendChild(novo('p','cj-fin-empty','Os indicadores aparecem após o próximo envio do script.'));
 corpo.appendChild(icard);

 // Coortes
 const coo=d._coo;const cc=card('Coortes de aquisição','Pacientes conquistados em cada mês e a margem que geram depois da primeira compra. Retornos que vieram por novo clique pago ficam fora (contados como readquiridos), para não somar duas vezes.');
 if(coo&&coo.ok&&coo.coortes.length){
  const wrap=novo('div','cj-fin-tabela-wrap');const t=novo('table','cj-fin-tabela');
  const cols=['Mês','Canal','Pacientes','Voltaram 30d','60d','90d','Margem/pac. 30d','60d','90d','Readquiridos 90d'];
  const th=novo('thead');const tr=novo('tr');cols.forEach(c=>tr.appendChild(novo('th',null,c)));th.appendChild(tr);t.appendChild(th);
  const tb=novo('tbody');const rot={google_ads:'Google (clique novo)',app:'Aplicativo',outros:'Outros'};
  const pct=(c,j)=>c['madura_'+j]?Math.round((c['taxa_retorno_'+j]||0)*100)+'%':'(parcial)';
  const mpac=(c,j)=>c['madura_'+j]?brl((c['margem_por_paciente_'+j]||0)/100):'(parcial)';
  coo.coortes.slice().reverse().forEach(c=>{const r=novo('tr');[c.mes.slice(5,7)+'/'+c.mes.slice(0,4),rot[c.canal]||c.canal,c.pacientes,pct(c,30),pct(c,60),pct(c,90),mpac(c,30),mpac(c,60),mpac(c,90),c.readquiridos_90].forEach(v=>r.appendChild(novo('td',null,String(v))));tb.appendChild(r);});
  t.appendChild(tb);wrap.appendChild(t);cc.appendChild(wrap);
  const vf=coo.valor_futuro_google;cc.appendChild(novo('p','cj-fin-note',vf?'Valor futuro usado pelo Autopilot por paciente novo do Google: '+brl(vf.centavos/100)+' ('+vf.janela+' dias, '+vf.pacientes+' pacientes).':'Ainda não há coortes do Google maduras o bastante para o valor futuro; o Autopilot não soma valor futuro.'));
 }else cc.appendChild(novo('p','cj-fin-empty','Coortes indisponíveis agora.'));
 corpo.appendChild(cc);

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
async function alternarProprietario(ativo,horas){try{const r=await window.cjModoProprietarioDefinir(ativo,horas);if(!r?.ok)throw Error(r?.error||'falhou');carregar();}catch(e){window.alert('Não foi possível alterar: '+(e.message||''));}}
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
