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
    registrarPrescricao('direto');
    registrarCore();
    return true;
  }

  function instalarEstiloResposta() {
    if (document.getElementById('cj-chat-reply-style')) return;
    var style = document.createElement('style');
    style.id = 'cj-chat-reply-style';
    style.textContent = '.cj-reply-quote{border-left:3px solid rgba(98,197,138,.55);background:rgba(255,255,255,.035);border-radius:7px;padding:6px 8px;margin:0 0 6px;max-width:100%;font-size:11px;line-height:1.35;color:rgba(231,235,233,.58)}.cj-reply-quote strong{display:block;color:rgba(143,207,157,.9);font-size:10px;margin-bottom:2px}.cj-reply-quote span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px}';
    document.head.appendChild(style);
  }

  function instalarContextoResposta() {
    var original = window._renderMsgBolha;
    if (typeof original !== 'function') return false;
    if (original.__cjReplyContext) return true;

    instalarEstiloResposta();
    var wrapper = function (m) {
      var el = original(m);
      try {
        var replyId = String(m && m.reply_to_id ? m.reply_to_id : '').replace(/\D/g, '');
        if (!replyId || !el || !el.querySelector) return el;
        var alvo = document.querySelector('[data-msg-id="' + replyId + '"]');
        var resumo = 'Mensagem anterior';
        var autor = 'Mensagem respondida';
        if (alvo) {
          var texto = alvo.querySelector('.bub');
          var arquivo = alvo.querySelector('.pdf-nome');
          resumo = String((texto && texto.innerText) || (arquivo && arquivo.innerText) || resumo).trim().slice(0, 140);
          autor = alvo.classList.contains('medico') ? 'Você' : 'Paciente';
        }
        var wrap = el.querySelector('.bub-wrap');
        if (!wrap) return el;
        var quote = document.createElement('div');
        quote.className = 'cj-reply-quote';
        var strong = document.createElement('strong');
        strong.textContent = autor;
        var span = document.createElement('span');
        span.textContent = resumo;
        quote.appendChild(strong);
        quote.appendChild(span);
        wrap.insertBefore(quote, wrap.firstChild);
      } catch (_) {}
      return el;
    };
    wrapper.__cjReplyContext = true;
    window._renderMsgBolha = wrapper;
    console.log('[CHAT-UX] Contexto de respostas habilitado no painel.');
    return true;
  }

  instalarContextoResposta();
  var chatUxTentativas = 0;
  var chatUxTimer = setInterval(function () {
    chatUxTentativas += 1;
    if (instalarContextoResposta() || chatUxTentativas >= 120) clearInterval(chatUxTimer);
  }, 500);

  if (preparar()) return;

  var tentativas = 0;
  var timer = setInterval(function () {
    tentativas += 1;
    if (preparar() || tentativas >= 1200) clearInterval(timer);
  }, 500);
})();

(function () {
  if (document.querySelector('script[data-cj-admin-avaliacoes]')) return;
  var script = document.createElement('script');
  script.src = '/admin-avaliacoes.js?v=2';
  script.async = true;
  script.dataset.cjAdminAvaliacoes = '1';
  document.head.appendChild(script);
})();
