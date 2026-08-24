(function () {
  var emProcessamento = new Set();
  var coreRegistrado = false;
  var registrosPrescricao = 0;

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
    console.log('[MEMED-AUTO-CHAT] Evento prescricaoImpressa recebido.', ev);

    var atendimento = atendimentoAtivo();
    var prescriptionId = prescriptionIdDoEvento(ev);

    if (!atendimento || !atendimento.id) {
      console.warn('[MEMED-AUTO-CHAT] Evento recebido sem atendimento ativo.', ev);
      return;
    }
    if (!prescriptionId) {
      console.warn('[MEMED-AUTO-CHAT] Evento recebido sem ID de prescrição.', ev);
      return;
    }

    console.log('[MEMED-AUTO-CHAT] Prescrição detectada.', {
      atendimentoId: atendimento.id,
      prescriptionId: prescriptionId
    });

    var chave = String(atendimento.id) + ':' + prescriptionId;
    if (emProcessamento.has(chave)) {
      console.log('[MEMED-AUTO-CHAT] Evento duplicado ignorado.', chave);
      return;
    }
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

      console.log('[MEMED-AUTO-CHAT] Receita anexada ao chat.', data);
      toast(data.reutilizado
        ? 'Receita já estava disponível no chat do paciente.'
        : 'Receita enviada automaticamente ao chat do paciente.', 'success');
    } catch (err) {
      console.error('[MEMED-AUTO-CHAT] Falha ao anexar receita.', err);
      toast('A receita foi emitida, mas não foi possível anexá-la automaticamente ao chat.', 'error');
      emProcessamento.delete(chave);
    }
  }

  function registrarPrescricao(origem) {
    if (!window.MdHub || !window.MdHub.event || typeof window.MdHub.event.add !== 'function') return false;
    try {
      window.MdHub.event.add('prescricaoImpressa', enviarReceitaAoChat);
      registrosPrescricao += 1;
      console.log('[MEMED-AUTO-CHAT] Listener prescricaoImpressa registrado.', {
        origem: origem || 'direto',
        registro: registrosPrescricao
      });
      return true;
    } catch (err) {
      console.warn('[MEMED-AUTO-CHAT] Não foi possível registrar prescricaoImpressa.', err);
      return false;
    }
  }

  function registrarCore() {
    if (coreRegistrado || !window.MdHub || !window.MdHub.event || typeof window.MdHub.event.add !== 'function') return false;
    try {
      window.MdHub.event.add('core:moduleInit', function (moduleData) {
        var nome = moduleData && moduleData.name ? String(moduleData.name) : '';
        if (nome === 'plataforma.prescricao') {
          console.log('[MEMED-AUTO-CHAT] plataforma.prescricao inicializada; registrando listener definitivo.');
          registrarPrescricao('core:moduleInit');
        }
      });
      coreRegistrado = true;
      console.log('[MEMED-AUTO-CHAT] Aguardando core:moduleInit da Memed.');
      return true;
    } catch (err) {
      console.warn('[MEMED-AUTO-CHAT] Não foi possível observar core:moduleInit.', err);
      return false;
    }
  }

  function preparar() {
    if (!window.MdHub || !window.MdHub.event || typeof window.MdHub.event.add !== 'function') return false;

    // Registra imediatamente para o caso de o módulo já ter sido inicializado.
    registrarPrescricao('direto');
    // E também observa a inicialização oficial do módulo, porque a Memed pode
    // recriar o barramento durante o bootstrap e descartar listeners precoces.
    registrarCore();
    return true;
  }

  if (preparar()) return;

  var tentativas = 0;
  var timer = setInterval(function () {
    tentativas += 1;
    if (preparar() || tentativas >= 1200) clearInterval(timer);
  }, 500);
})();
