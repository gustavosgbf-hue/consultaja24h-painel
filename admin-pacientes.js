(function(){
  function isAdmin(){
    try{
      if(typeof isAdminAtual==='function') return !!isAdminAtual();
      var m=JSON.parse(localStorage.getItem('medico')||'{}');
      return String(m&&m.email||'').trim().toLowerCase()==='gustavosgbf@gmail.com';
    }catch(_){return false}
  }

  function enforceRenovacoesAdminOnly(){
    var admin=isAdmin();
    var style=document.getElementById('cj-renov-admin-only-style');
    if(!admin){
      if(!style){
        style=document.createElement('style');
        style.id='cj-renov-admin-only-style';
        style.textContent='#renov-tab-btn,#renov-lista{display:none!important}';
        document.head.appendChild(style);
      }
      var tab=document.getElementById('renov-tab-btn');
      var lista=document.getElementById('renov-lista');
      if(tab){ tab.style.display='none'; tab.setAttribute('aria-hidden','true'); }
      if(lista) lista.style.display='none';
      try{ if(typeof renovVisible!=='undefined') renovVisible=false; }catch(_){ }
    }else if(style){
      style.remove();
    }
  }

  function origemRaw(obj){
    return String(obj&&(
      obj.origem_plataforma || obj.platform || obj.origem || obj.source
    )||'').trim().toLowerCase();
  }

  function origemInfo(obj){
    var v=origemRaw(obj);
    if(v.indexOf('android')>=0) return {label:'ANDROID', cls:'android'};
    if(v==='ios'||v.indexOf('iphone')>=0||v.indexOf('ipad')>=0) return {label:'IOS', cls:'ios'};
    if(v==='web'||v.indexOf('site')>=0) return {label:'WEB', cls:'web'};
    if(v.indexOf('app')>=0) return {label:'APP', cls:'app'};
    return null;
  }

  function badgeNode(obj){
    var info=origemInfo(obj);
    if(!info) return null;
    var el=document.createElement('span');
    el.className='cj-origin-badge cj-origin-'+info.cls;
    el.textContent=info.label;
    el.title='Origem do atendimento: '+info.label;
    return el;
  }

  function ensureStyles(){
    if(document.getElementById('cj-origin-badge-style')) return;
    var s=document.createElement('style');
    s.id='cj-origin-badge-style';
    s.textContent='\
      .cj-origin-badge{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;padding:2px 6px;border-radius:999px;font-size:.54rem;font-weight:800;letter-spacing:.08em;line-height:1.25;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:rgba(255,255,255,.62);vertical-align:middle;white-space:nowrap}\
      .cj-origin-android{color:#8fe0ad;border-color:rgba(143,224,173,.24);background:rgba(143,224,173,.08)}\
      .cj-origin-ios{color:#d8dce0;border-color:rgba(216,220,224,.22);background:rgba(216,220,224,.07)}\
      .cj-origin-web{color:#8ec8ff;border-color:rgba(142,200,255,.24);background:rgba(142,200,255,.08)}\
      .cj-origin-app{color:#d7bf89;border-color:rgba(215,191,137,.24);background:rgba(215,191,137,.08)}\
      .pc-header .cj-origin-badge{margin-left:auto;margin-right:2px}\
      .pc-header .pc-nome{min-width:0}\
      .hist-card-meta .cj-origin-badge{margin-right:6px}\
      .cj-origin-geral-wrap{display:inline-flex;align-items:center;gap:6px;margin-left:auto;margin-right:6px}\
    ';
    document.head.appendChild(s);
  }

  function install(){
    var sidebar=document.getElementById('sidebar-inner');
    if(!sidebar) return false;
    var btn=document.getElementById('cj-admin-pacientes-btn');
    if(!btn){
      btn=document.createElement('button');
      btn.id='cj-admin-pacientes-btn';
      btn.type='button';
      btn.textContent='Bloquear pacientes';
      btn.style.cssText='display:none;width:100%;margin-top:10px;padding:10px 12px;border-radius:9px;border:1px solid rgba(226,118,118,.25);background:rgba(226,118,118,.07);color:#ffaaaa;font-family:inherit;font-size:.76rem;font-weight:700;cursor:pointer;text-align:left';
      btn.onclick=function(){location.href='/admin-pacientes.html'};
      var anchor=document.getElementById('cj-avaliacoes-btn')||document.getElementById('admin-manual-btn');
      if(anchor&&anchor.parentNode===sidebar) anchor.insertAdjacentElement('afterend',btn); else sidebar.appendChild(btn);
    }
    btn.style.display=isAdmin()?'block':'none';
    return true;
  }

  function aplicarFila(){
    if(!isAdmin()) return;
    var data;
    try{ data=(typeof filaData!=='undefined'&&Array.isArray(filaData))?filaData:[]; }catch(_){ data=[]; }
    var cards=document.querySelectorAll('#fila-lista .paciente-card');
    cards.forEach(function(card,i){
      if(card.querySelector('.cj-origin-badge')) return;
      var obj=data[i];
      var badge=badgeNode(obj);
      if(!badge) return;
      var header=card.querySelector('.pc-header');
      var tipo=header&&header.querySelector('.pc-tipo');
      if(header){
        if(tipo) header.insertBefore(badge,tipo); else header.appendChild(badge);
      }
    });
  }

  function aplicarHistorico(){
    if(!isAdmin()) return;
    var data=[];
    try{
      var all=(typeof histData!=='undefined'&&Array.isArray(histData))?histData:[];
      var inp=document.getElementById('hist-busca');
      var q=String(inp&&inp.value||'').toLowerCase().trim();
      data=q?all.filter(function(a){return String(a.nome||'').toLowerCase().includes(q)||String(a.cpf||'').includes(q)||String(a.tel||'').includes(q)}):all;
    }catch(_){ data=[]; }
    var cards=document.querySelectorAll('#hist-lista .hist-card');
    cards.forEach(function(card,i){
      if(card.querySelector('.cj-origin-badge')) return;
      var badge=badgeNode(data[i]);
      if(!badge) return;
      var meta=card.querySelector('.hist-card-meta');
      if(meta) meta.insertBefore(badge,meta.firstChild);
    });
  }

  function aplicarHistoricoGeral(){
    if(!isAdmin()) return;
    var cache={};
    try{ cache=(typeof histGeralCache!=='undefined'&&histGeralCache)?histGeralCache:{}; }catch(_){ cache={}; }
    var cards=document.querySelectorAll('#admin-hist-lista .hist-card');
    cards.forEach(function(card){
      if(card.querySelector('.cj-origin-badge')) return;
      var on=String(card.getAttribute('onclick')||'');
      var m=on.match(/abrirAtendimentoHistorico\((\d+)\)/);
      if(!m) return;
      var badge=badgeNode(cache[String(m[1])]);
      if(!badge) return;
      var top=card.firstElementChild;
      if(top){
        var wrap=document.createElement('span');
        wrap.className='cj-origin-geral-wrap';
        wrap.appendChild(badge);
        var status=top.lastElementChild;
        if(status) top.insertBefore(wrap,status); else top.appendChild(wrap);
      }
    });
  }

  function aplicarTudo(){
    enforceRenovacoesAdminOnly();
    ensureStyles();
    install();
    aplicarFila();
    aplicarHistorico();
    aplicarHistoricoGeral();
  }

  var scheduled=false;
  function schedule(){
    if(scheduled) return;
    scheduled=true;
    setTimeout(function(){scheduled=false;aplicarTudo()},0);
  }

  var tries=0;
  var timer=setInterval(function(){tries++;aplicarTudo();if(tries>240)clearInterval(timer)},500);
  document.addEventListener('DOMContentLoaded',aplicarTudo);
  try{
    var obs=new MutationObserver(schedule);
    obs.observe(document.documentElement,{childList:true,subtree:true});
  }catch(_){ }
})();
