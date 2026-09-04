from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

# 1) Corrige o bloco de push V1 que ficou dentro de um <script src=...>.
# Conteúdo inline de <script src> é ignorado pelo navegador, então separamos sem tocar no Memed.
prefix = '<script src="/memed-open-fix-v4.js?v=8">\\n// CJ24H-DOCTOR-WEB-PUSH-V1'
if prefix in s:
    start = s.index(prefix)
    end = s.index('</script>', start) + len('</script>')
    old = s[start:end]
    body = old[len('<script src="/memed-open-fix-v4.js?v=8">'): -len('</script>')]
    body = body.replace('\\n', '\n').strip()
    replacement = '<script src="/memed-open-fix-v4.js?v=8"></script>\n<script>\n' + body + '\n</script>'
    s = s[:start] + replacement + s[end:]

# 2) Ícones nativos -> SVGs simples. Apenas texto/HTML visual; IDs e onclicks permanecem iguais.
repls = {
    '🔄 Renovações': '<svg class="sidebar-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>Renovações',
    '📅 Agendamentos': '<svg class="sidebar-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>Agendamentos',
    '👥 Médicos pendentes': '<svg class="sidebar-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>Médicos pendentes',
    '📊 Histórico geral': '<svg class="sidebar-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>Histórico geral',
    '💬 Chat da consulta': '<svg class="sidebar-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg>Chat da consulta',
    '🔐 Defina sua nova senha': 'Defina sua nova senha',
}
for a, b in repls.items():
    s = s.replace(a, b)

# 3) Polimento visual + skeleton curto e não bloqueante no carregamento autenticado.
if 'CJ24H-PANEL-POLISH-V2' not in s:
    css = r'''
/* CJ24H-PANEL-POLISH-V2 */
.sidebar-title{display:flex;align-items:center;gap:8px;transition:color .18s ease,background .18s ease}
.sidebar-title-icon{width:15px;height:15px;flex:0 0 auto;color:rgba(156,214,175,.72)}
.sidebar-inner button,.nav button,.tab,.triagem-mini-btn,.triagem-edit-btn{transition:transform .16s ease,background .18s ease,border-color .18s ease,color .18s ease,opacity .18s ease}
.sidebar-inner button:active,.tab:active{transform:scale(.985)}
.atend-header,.triagem-box,.chat-medico-wrap{animation:cjPanelSoftIn .24s cubic-bezier(.2,.75,.3,1) both}
@keyframes cjPanelSoftIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
.cj-panel-skeleton{position:absolute;inset:0;z-index:60;background:#0a0f0e;padding:22px;pointer-events:none;opacity:1;transition:opacity .2s ease}
.cj-panel-skeleton.hide{opacity:0}
.cj-panel-skeleton__bar,.cj-panel-skeleton__card{position:relative;overflow:hidden;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.045);border-radius:10px}
.cj-panel-skeleton__bar{height:18px;width:42%;margin-bottom:18px}.cj-panel-skeleton__card{height:84px;margin-bottom:12px}
.cj-panel-skeleton__bar:after,.cj-panel-skeleton__card:after{content:"";position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,rgba(255,255,255,.055),transparent);animation:cjShimmer 1.05s infinite}
@keyframes cjShimmer{to{transform:translateX(100%)}}
@media(max-width:768px){.cj-panel-skeleton{padding:14px 10px 80px}.sidebar-inner{scroll-behavior:smooth}.sidebar-title{min-height:34px}.sidebar-title-icon{width:14px;height:14px}}
@media(prefers-reduced-motion:reduce){.atend-header,.triagem-box,.chat-medico-wrap,.cj-panel-skeleton__bar:after,.cj-panel-skeleton__card:after{animation:none!important}.sidebar-inner button,.nav button,.tab{transition:none!important}}
'''
    s = s.replace('</style>', css + '\n</style>', 1)

# 4) Deep link do push: ?atendimento=ID encontra o slot já ativo do médico e abre exatamente ele.
# Não assume/edita atendimento e não faz escrita; apenas navegação local.
if 'CJ24H-PUSH-DEEPLINK-V2' not in s:
    js = r'''
<script>
// CJ24H-PUSH-DEEPLINK-V2
(function(){
  function cleanPushParams(){
    try{var u=new URL(location.href);u.searchParams.delete('atendimento');u.searchParams.delete('src');history.replaceState({},'',u.pathname+(u.searchParams.toString()?'?'+u.searchParams.toString():'')+u.hash)}catch(e){}
  }
  function openTarget(){
    var id='';try{id=new URL(location.href).searchParams.get('atendimento')||''}catch(e){}
    if(!id)return;
    var tries=0;
    var timer=setInterval(function(){
      tries++;
      try{
        if(Array.isArray(window.slots||slots)){
          var arr=window.slots||slots;
          var idx=arr.findIndex(function(x){return x&&x.atendimento&&String(x.atendimento.id)===String(id)});
          if(idx>=0&&typeof ativarSlot==='function'){
            ativarSlot(idx);
            var consultaTab=Array.from(document.querySelectorAll('.tab')).find(function(el){return String(el.getAttribute('onclick')||'').toLowerCase().indexOf('consulta')>=0});
            if(consultaTab&&!consultaTab.classList.contains('active'))consultaTab.click();
            cleanPushParams();
            clearInterval(timer);
            return;
          }
        }
      }catch(e){}
      if(tries>=36)clearInterval(timer);
    },350);
  }
  function skeleton(){
    try{
      if(!localStorage.getItem('token'))return;
      var main=document.getElementById('main-content');if(!main||document.getElementById('cjPanelSkeleton'))return;
      var x=document.createElement('div');x.id='cjPanelSkeleton';x.className='cj-panel-skeleton';x.innerHTML='<div class="cj-panel-skeleton__bar"></div><div class="cj-panel-skeleton__card"></div><div class="cj-panel-skeleton__card"></div><div class="cj-panel-skeleton__card" style="height:150px"></div>';main.style.position='relative';main.appendChild(x);
      setTimeout(function(){x.classList.add('hide');setTimeout(function(){x.remove()},220)},520);
    }catch(e){}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){skeleton();openTarget()});else{skeleton();openTarget()}
})();
</script>
'''
    s = s.replace('</body>', js + '\n</body>', 1)

p.write_text(s, encoding='utf-8')
print('panel v2 patched')
