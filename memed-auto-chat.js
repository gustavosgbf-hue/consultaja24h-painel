(function () {
  var registrados = false;
  var emProcessamento = new Set();

  function toast(msg, tipo) {
    try {
      if (typeof mostrarToast === 'function') mostrarToast(msg, tipo || 'success');
    } catch (_) {}
  }

  function atendimentoAtivo() {
    try {
      return typeof atendimentoAtual !== 'undefined' ? atendimentoAtual : null;
    } catch (_) {
      return null;
    }
  }

  function prescriptionIdDoEvento(ev) {
    var p = ev && (ev.prescricao || ev.prescription) ? (ev.prescricao || ev.prescription) : (ev || {});
    return String(
      p.id ||
      p.prescricao_id ||
      p.prescription_id ||
      p.id_prescription ||
      (ev && (ev.prescricao_id || ev.prescription_id || ev.id_prescription)) ||
      ''
    ).trim();
  }

  async function enviarReceitaAoChat(ev) {
    var atendimento = atendimentoAtivo();
    var prescriptionId = prescriptionIdDoEvento(ev);
    if (!atendimento || !atendimento.id || !prescriptionId) {
      if (!prescriptionId) console.warn('[MEMED-AUTO-CHAT] Evento sem ID de prescrição.', ev);
      return;
    }

    var chave = String(atendimento.id) + ':' + prescriptionId;
    if (emProcessamento.has(chave)) return;
    emProcessamento.add(chave);

    try {
      if (typeof apiFetch !== 'function') throw new Error('API do painel indisponível');
      var data = await apiFetch('/api/memed/prescricao-chat', {
        method: 'POST',
        json: {
          atendimentoId: Number(atendimento.id),
          prescriptionId: prescriptionId
        }
      });
      if (!data || !data.ok) throw new Error((data && data.error) || 'Não foi possível enviar a receita ao chat.');

      toast(data.reutilizado
        ? 'Receita já estava disponível no chat do paciente.'
        : 'Receita enviada automaticamente ao chat do paciente.', 'success');
    } catch (err) {
      console.error('[MEMED-AUTO-CHAT]', err);
      toast('A receita foi emitida, mas não foi possível anexá-la automaticamente ao chat.', 'error');
      // Permite nova tentativa caso a Memed ainda estivesse finalizando o PDF.
      emProcessamento.delete(chave);
    }
  }

  function registrar() {
    if (registrados || !window.MdHub || !window.MdHub.event || typeof window.MdHub.event.add !== 'function') return false;
    try {
      window.MdHub.event.add('prescricaoImpressa', enviarReceitaAoChat);
      registrados = true;
      console.log('[MEMED-AUTO-CHAT] Listener registrado.');
      return true;
    } catch (err) {
      console.warn('[MEMED-AUTO-CHAT] Não foi possível registrar listener.', err);
      return false;
    }
  }

  if (registrar()) return;
  var tentativas = 0;
  var timer = setInterval(function () {
    tentativas += 1;
    if (registrar() || tentativas >= 1200) clearInterval(timer);
  }, 500);
})();
