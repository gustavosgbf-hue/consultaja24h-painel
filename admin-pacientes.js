(function(){
  function isAdmin(){
    try{
      if(typeof isAdminAtual==='function') return !!isAdminAtual();
      var m=JSON.parse(localStorage.getItem('medico')||'{}');
      return String(m&&m.email||'').trim().toLowerCase()==='gustavosgbf@gmail.com';
    }catch(_){return false}
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
  var tries=0;
  var timer=setInterval(function(){tries++;install();if(tries>240)clearInterval(timer)},500);
})();
