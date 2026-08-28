(function(){
  if (window.__cjMemedProntuarioGuardLoaded) return;
  window.__cjMemedProntuarioGuardLoaded = true;

  function atualId(){
    try { return typeof atendimentoAtual !== 'undefined' && atendimentoAtual ? Number(atendimentoAtual.id || 0) : 0; }
    catch (_) { return 0; }
  }

  function frozenId(){
    var id = Number(window.__cjMemedAtendimentoId || 0);
    return id || 0;
  }

  function install(){
    var original = window.salvarPrescricaoNoProntuario;
    if (typeof original !== 'function') return false;
    if (original.__cjMemedContextGuard) return true;

    var guarded = async function(dados){
      if (original.__cjMemedTargetSafe) return original.apply(this, arguments);
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

  function cleanId(value){
    var s = String(value == null ? '' : value).trim();
    if (!s || s.length > 160) return '';
    return /^[a-zA-Z0-9_-]+$/.test(s) ? s : '';
  }

  function idFromString(value, hinted){
    var s = String(value || '').trim();
    if (!s) return '';
    if (hinted) {
      var direct = cleanId(s);
      if (direct) return direct;
    }
    var patterns = [
      /(?:prescricoes?|prescriptions?)[\/:=_-]+([a-zA-Z0-9_-]{4,120})/i,
      /[?&#](?:prescription_id|prescricao_id|prescriptionId|prescricaoId|id_prescription)=([a-zA-Z0-9_-]{4,120})/i,
      /\/prescricao\/([a-zA-Z0-9_-]{4,120})(?:[/?#]|$)/i
    ];
    for (var i=0;i<patterns.length;i+=1) {
      var m = s.match(patterns[i]);
      if (m && cleanId(m[1])) return cleanId(m[1]);
    }
    return '';
  }

  function prescriptionIdDoEvento(value, depth, keyHint, seen){
    depth = depth || 0;
    keyHint = String(keyHint || '');
    seen = seen || [];
    if (depth > 8 || value == null) return '';

    var hinted = /(?:prescri|prescription).*(?:^|_)?id|(?:^|_)?id.*(?:prescri|prescription)/i.test(keyHint);
    if (typeof value === 'string' || typeof value === 'number') {
      return idFromString(value, hinted);
    }
    if (typeof value !== 'object') return '';
    if (seen.indexOf(value) >= 0) return '';
    seen.push(value);

    var directKeys = ['prescription_id','prescricao_id','id_prescription','prescriptionId','prescricaoId','id'];
    for (var i=0;i<directKeys.length;i+=1) {
      var k = directKeys[i];
      if (!(k in value)) continue;
      var candidate = idFromString(value[k], k !== 'id' || /prescri/i.test(keyHint));
      if (candidate) return candidate;
    }

    var linkKeys = ['link','url','document_url','documentUrl','href'];
    for (var j=0;j<linkKeys.length;j+=1) {
      var lk = linkKeys[j];
      if (lk in value) {
        var fromLink = idFromString(value[lk], false);
        if (fromLink) return fromLink;
      }
    }

    var preferred = ['prescricao','prescription','data','payload','document','documents','documentos','result'];
    for (var p=0;p<preferred.length;p+=1) {
      var pk = preferred[p];
      if (pk in value) {
        var preferredId = prescriptionIdDoEvento(value[pk], depth+1, pk, seen);
        if (preferredId) return preferredId;
      }
    }

    var keys = Object.keys(value);
    for (var x=0;x<keys.length;x+=1) {
      var key = keys[x];
      var nested = prescriptionIdDoEvento(value[key], depth+1, key, seen);
      if (nested) return nested;
    }
    return '';
  }

  function fallbackKey(atendimentoId, prescriptionId){
    return String(atendimentoId) + ':' + String(prescriptionId);
  }

  function installAutoChatFallback(){
    if (window.__cjMemedEventFallbackInstalled) return true;
    if (!window.MdHub || !window.MdHub.event || typeof window.MdHub.event.add !== 'function') return false;
    if (typeof window.apiFetch !== 'function') return false;

    window.__cjMemedEventFallbackInstalled = true;
    window.__cjMemedFallbackSent = window.__cjMemedFallbackSent || new Set();

    try {
      window.MdHub.event.add('prescricaoImpressa', function(ev){
        var atendimentoId = frozenId() || atualId();
        var prescriptionId = prescriptionIdDoEvento(ev, 0, '', []);
        console.log('[MEMED-FALLBACK] Evento recebido.', { atendimentoId: atendimentoId, prescriptionId: prescriptionId, evento: ev });
        if (!atendimentoId || !prescriptionId) {
          console.warn('[MEMED-FALLBACK] Evento sem atendimento ou ID de prescrição extraível.', ev);
          return;
        }
        var key = fallbackKey(atendimentoId, prescriptionId);
        if (window.__cjMemedFallbackSent.has(key)) return;
        window.__cjMemedFallbackSent.add(key);

        setTimeout(function(){
          window.apiFetch('/api/memed/prescricao-chat', {
            method: 'POST',
            json: { atendimentoId: Number(atendimentoId), prescriptionId: String(prescriptionId) }
          }).then(function(data){
            if (!data || !data.ok) throw new Error((data && data.error) || 'falha desconhecida');
            if (!data.reutilizado) {
              console.log('[MEMED-FALLBACK] Receita recuperada e enviada ao chat.', data);
              try { if (typeof mostrarToast === 'function') mostrarToast('Receita enviada automaticamente ao chat do paciente.', 'success'); } catch (_) {}
            }
          }).catch(function(err){
            window.__cjMemedFallbackSent.delete(key);
            console.error('[MEMED-FALLBACK] Não foi possível concluir o autoenvio.', err);
          });
        }, 900);
      });
      console.log('[MEMED-FALLBACK] Listener resiliente de prescrição instalado.');
      return true;
    } catch (err) {
      window.__cjMemedEventFallbackInstalled = false;
      console.warn('[MEMED-FALLBACK] Falha ao registrar listener.', err);
      return false;
    }
  }

  install();
  installAutoChatFallback();
  var tries = 0;
  var timer = setInterval(function(){
    tries += 1;
    var guardOk = install();
    var fallbackOk = installAutoChatFallback();
    if ((guardOk && fallbackOk) || tries >= 1200) clearInterval(timer);
  }, 250);
})();
