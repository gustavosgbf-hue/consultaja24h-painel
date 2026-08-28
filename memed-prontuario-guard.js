(function(){
  if (window.__cjMemedProntuarioGuardLoaded) return;
  window.__cjMemedProntuarioGuardLoaded = true;

  function atualId(){
    try { return typeof atendimentoAtual !== 'undefined' && atendimentoAtual ? Number(atendimentoAtual.id || 0) : 0; }
    catch (_) { return 0; }
  }

  function frozenId(){
    var id = Number(window.__cjMemedAtendimentoId || 0);
    var ts = Number(window.__cjMemedAtendimentoTs || 0);
    if (!id || !ts || Date.now() - ts > 30 * 60 * 1000) return 0;
    return id;
  }

  function install(){
    var original = window.salvarPrescricaoNoProntuario;
    if (typeof original !== 'function') return false;
    if (original.__cjMemedContextGuard) return true;

    var guarded = async function(dados){
      var alvo = frozenId();
      var atual = atualId();
      if (alvo && atual && alvo !== atual) {
        console.warn('[MEMED-PRONTUARIO] Escrita textual bloqueada por troca de atendimento.', { atendimentoOriginal: alvo, atendimentoAtual: atual });
        try {
          if (typeof mostrarToast === 'function') {
            mostrarToast('Prescrição vinculada ao atendimento original; troca de paciente detectada.', 'info');
          }
        } catch (_) {}
        return;
      }
      return original.apply(this, arguments);
    };
    guarded.__cjMemedContextGuard = true;
    guarded.__cjOriginal = original;
    window.salvarPrescricaoNoProntuario = guarded;
    console.log('[MEMED-PRONTUARIO] Proteção contra troca de paciente habilitada.');
    return true;
  }

  if (install()) return;
  var tries = 0;
  var timer = setInterval(function(){
    tries += 1;
    if (install() || tries >= 240) clearInterval(timer);
  }, 250);
})();
