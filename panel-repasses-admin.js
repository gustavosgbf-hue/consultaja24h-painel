/* Financeiro de médicos — só aparece para o admin autenticado.
 * Não movimenta dinheiro: marca repasse manual já realizado.
 * Nada de percentuais ou dados de pacientes neste painel.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const brl=c=>(Number(c||0)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const novo=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
const hoje=()=>{
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Fortaleza',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 return parts;
};
const perAtual=()=>{const h=hoje(),d=Number(h.slice(8));return h.slice(0,7)+'-Q'+(d<=15?'1':'2');};
const anterior=id=>{
 const m=/^(\d{4})-(\d{2})-Q([12])$/.exec(id);if(!m)return id;
 if(m[3]==='2')return m[1]+'-'+m[2]+'-Q1';
 const d=new Date(Date.UTC(Number(m[1]),Number(m[2])-2,1));
 return d.toISOString().slice(0,7)+'-Q2';
};
function isAdmin(){
 if(typeof window.cjAdminFinanceMode==='function')return !!window.cjAdminFinanceMode();
 try{return typeof medico==='object'&&String(medico?.email||'').toLowerCase()==='gustavosgbf@gmail.com';}catch(_){return false;}
}
let overlay,corpo,periodoSel,btnMenu,nonce=0;
function construir(){
 if(overlay)return;
 overlay=novo('div','modal-overlay cj-repasses'); overlay.id='cj-repasses-admin';
 overlay.setAttribute('role','presentation');
 const modal=novo('section','modal cj-repasses-modal');modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Repasse de médicos');
 const head=novo('div','cj-repasses-header');
 const t=novo('div');t.appendChild(novo('h2',null,'Repasses'));t.appendChild(novo('p',null,'Controle de pagamentos da equipe'));
 head.appendChild(t);
 const fechar=novo('button','cj-repasses-close','×');fechar.type='button';fechar.setAttribute('aria-label','Fechar');
 fechar.addEventListener('click',close);head.appendChild(fechar);modal.appendChild(head);
 const filtro=novo('div','cj-repasses-filtro');
 filtro.appendChild(novo('label',null,'Quinzena'));
 periodoSel=novo('select');periodoSel.setAttribute('aria-label','Selecionar quinzena');
 const atual=perAtual();const periods=[atual,anterior(atual),anterior(anterior(atual))];
 periods.forEach((id)=>{if(id<'2026-11-Q2')return;const o=novo('option',null,id.replace('-Q',' · '));o.value=id;periodoSel.appendChild(o)});
 periodoSel.addEventListener('change',carregar);filtro.appendChild(periodoSel);
 const atualizar=novo('button','cj-repasses-refresh','Atualizar');atualizar.type='button';atualizar.addEventListener('click',carregar);filtro.appendChild(atualizar);
 modal.appendChild(filtro);
 corpo=novo('div','cj-repasses-body');corpo.setAttribute('aria-live','polite');modal.appendChild(corpo);
 const nota=novo('p','cj-repasses-note','Esta tela registra repasses feitos fora da plataforma. Não realiza transferências bancárias.');modal.appendChild(nota);
 overlay.appendChild(modal);overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
 document.body.appendChild(overlay);
}
function close(){nonce++;if(overlay)overlay.classList.remove('open')}
async function abrir(){
 if(!isAdmin())return;
 construir();overlay.classList.add('open');periodoSel.value=perAtual();carregar();
}
async function carregar(){
 if(!isAdmin()){close();return}
 const atual=++nonce;corpo.textContent='Consultando repasses…';
 try{
  const fn=window.cjRepassesFonte;
  if(typeof fn!=='function')throw Error('Serviço ainda não configurado');
  const d=await fn(periodoSel.value);
  if(atual!==nonce)return;
  if(!d||d.ok!==true||!Array.isArray(d.medicos))throw Error('Dados indisponíveis');
  corpo.textContent='';
  const resumo=novo('div','cj-repasses-summary');
  const total=d.medicos.reduce((v,m)=>v+(!m.registrado_pago?Number(m.valor_centavos||0):0),0);
  resumo.appendChild(novo('span',null,'A registrar'));
  resumo.appendChild(novo('strong',null,brl(total)));
  resumo.appendChild(novo('small',null,d.previsao?.data ? 'Previsão: '+new Date(d.previsao.data+'T12:00:00Z').toLocaleDateString('pt-BR')+(d.previsao.provisorio?'*':'') : 'Previsão indisponível'));
  corpo.appendChild(resumo);
  if(d.previsao?.provisorio)corpo.appendChild(novo('p','cj-repasses-caveat','* Data sujeita à conferência de feriados.'));
  if(!d.medicos.length){corpo.appendChild(novo('p','cj-repasses-empty','Nenhum repasse elegível neste período.'));return}
  const ul=novo('div','cj-repasses-list');
  d.medicos.forEach(m=>{
   const item=novo('div','cj-repasses-item');
   const info=novo('div','cj-repasses-person');
   info.appendChild(novo('strong',null,m.nome||'Médico'));
   info.appendChild(novo('span',null,Number(m.atendimentos)+' consultas · '+brl(m.valor_centavos)));
   item.appendChild(info);
   const right=novo('div','cj-repasses-actions');
   if(m.divergencia){right.appendChild(novo('span','cj-repasses-warning','Divergência: revisar')); }
   else if(m.registrado_pago){right.appendChild(novo('span','cj-repasses-paid','Pago registrado'));}
   else {
    const b=novo('button','cj-repasses-pay',d.fechado?'Registrar pago':'Em aberto');
    b.type='button';b.disabled=!d.fechado;
    b.addEventListener('click',async()=>{
     if(!isAdmin())return;
     const confirmado=window.confirm('Confirmar que você JÁ transferiu '+brl(m.valor_centavos)+' para '+m.nome+'? Esta ação apenas registra a baixa e não faz PIX.');
     if(!confirmado)return;
     b.disabled=true;b.textContent='Registrando…';
     try{
      const fn=window.cjRegistrarRepasse;
      if(typeof fn!=='function')throw Error('Serviço indisponível');
      const res=await fn({medico_id:m.medico_id,periodo:d.periodo,valor_confirmado_centavos:m.valor_centavos});
      if(!res?.ok)throw Error(res?.error||'Não foi possível registrar');
      await carregar();
     }catch(err){b.disabled=false;b.textContent='Registrar pago';window.alert(err.message||'Erro ao registrar');}
    });
    right.appendChild(b);
   }
   item.appendChild(right);ul.appendChild(item);
  });
  corpo.appendChild(ul);
 }catch(err){
  if(atual!==nonce)return;
  corpo.textContent='';
  corpo.appendChild(novo('p','cj-repasses-empty','Repasses indisponíveis. Nenhum pagamento foi registrado.'));
 }
}
function init(){
 const menu=$('cj-status-pop');if(!menu)return;
 btnMenu=novo('button','cj-menu-item cj-repasses-launch','Repasses da equipe');
 btnMenu.type='button';btnMenu.setAttribute('role','menuitem');btnMenu.hidden=true;
 btnMenu.addEventListener('click',abrir);
 const sair=menu.querySelector('.nav-logout');
 if(sair)menu.insertBefore(btnMenu,sair);else menu.appendChild(btnMenu);
 function sync(){btnMenu.hidden=!isAdmin();if(!isAdmin())close();}
    window.cjSyncFinanceAdmin=sync;
 sync();
 const app=$('screen-app'),name=$('nav-nome');
 if(app)new MutationObserver(sync).observe(app,{attributes:true,attributeFilter:['style','class']});
 if(name)new MutationObserver(sync).observe(name,{childList:true,subtree:true,characterData:true});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay?.classList.contains('open')){e.preventDefault();close()}});
 window.cjAbrirRepassesAdmin=abrir;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
