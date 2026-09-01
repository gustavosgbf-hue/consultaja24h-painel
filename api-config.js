(function (w) {
  var defaultApi = 'https://triagem-api.onrender.com';
  var fromGlobal = w.CONSULTAJA24H_API_BASE;
  var fromMeta = document.querySelector('meta[name="consultaja24h-api-base"]')?.content;
  w.API_BASE_URL = (fromGlobal || fromMeta || defaultApi).replace(/\/$/, '');
})(window);

// Painel do psicólogo: expõe no Perfil profissional a configuração da sala
// permanente do Google Meet que o backend já suporta via /api/psicologo/sala-meet.
// O link por atendimento continua tendo prioridade; esta sala funciona como fallback.
(function (w) {
  if (!/\/psicologo\/?$/i.test(location.pathname)) return;

  function escAttr(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function renderSalaMeet(psi) {
    var rows = document.getElementById('perfil-rows');
    if (!rows) return;

    var antigo = document.getElementById('cj-sala-meet-row');
    if (antigo) antigo.remove();

    var row = document.createElement('div');
    row.className = 'perfil-row';
    row.id = 'cj-sala-meet-row';
    row.innerHTML =
      '<div class="perfil-key">Sala do Google Meet</div>' +
      '<div style="display:flex;gap:8px;align-items:center;margin-top:5px;flex-wrap:wrap">' +
        '<input id="cj-sala-meet" type="url" inputmode="url" placeholder="https://meet.google.com/xxx-xxxx-xxx" value="' + escAttr(psi && psi.sala_meet) + '" ' +
          'style="flex:1;min-width:230px;padding:9px 11px;border-radius:8px;border:1px solid rgba(22,18,14,.14);background:#faf9f7;color:#16120e;font:inherit;font-size:.82rem;outline:none">' +
        '<button id="cj-sala-meet-save" type="button" class="btn-ghost" style="margin-top:0">Salvar sala</button>' +
      '</div>' +
      '<div style="font-size:.72rem;color:#8c857d;margin-top:6px;line-height:1.45">Opcional. O link salvo em cada atendimento tem prioridade; esta sala será usada como alternativa quando o atendimento não tiver um link próprio.</div>';

    rows.appendChild(row);

    var btn = document.getElementById('cj-sala-meet-save');
    if (btn) btn.addEventListener('click', salvarSalaMeet);
  }

  async function salvarSalaMeet() {
    var input = document.getElementById('cj-sala-meet');
    var btn = document.getElementById('cj-sala-meet-save');
    if (!input || !btn) return;

    var link = input.value.trim();
    if (link && !/^https:\/\/meet\.google\.com\//i.test(link)) {
      if (typeof w.mostrarToast === 'function') w.mostrarToast('Informe um link válido do Google Meet.', 'error');
      return;
    }

    var original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Salvando…';

    try {
      var token = localStorage.getItem('psi_token') || '';
      var res = await fetch(w.API_BASE_URL + '/api/psicologo/sala-meet', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ sala_meet: link })
      });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok || !data.ok) throw new Error(data.error || 'Não foi possível salvar a sala.');

      if (typeof w.mostrarToast === 'function') {
        w.mostrarToast(link ? 'Sala do Google Meet salva com sucesso.' : 'Sala padrão removida.', 'success');
      }
    } catch (e) {
      if (typeof w.mostrarToast === 'function') w.mostrarToast(e.message || 'Erro ao salvar a sala.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  }

  var tentativas = 0;
  var timer = setInterval(function () {
    tentativas += 1;
    if (typeof w.renderPainel === 'function') {
      clearInterval(timer);
      var originalRenderPainel = w.renderPainel;
      w.renderPainel = function (psi) {
        var retorno = originalRenderPainel.apply(this, arguments);
        renderSalaMeet(psi);
        return retorno;
      };

      var token = localStorage.getItem('psi_token') || '';
      if (token && document.getElementById('perfil-rows')) {
        fetch(w.API_BASE_URL + '/api/psicologo/me', {
          headers: { 'Authorization': 'Bearer ' + token }
        }).then(function (r) { return r.json(); })
          .then(function (d) { if (d && d.ok && d.psicologo) renderSalaMeet(d.psicologo); })
          .catch(function () {});
      }
    } else if (tentativas >= 100) {
      clearInterval(timer);
    }
  }, 100);
})(window);

// Painel médico: carrega a automação que anexa ao chat o PDF oficial emitido pela Memed.
(function () {
  if (/\/(?:psicologo|especialista)\/?$/i.test(location.pathname)) return;
  if (document.querySelector('script[data-cj-memed-auto-chat]')) return;
  var script = document.createElement('script');
  script.src = '/memed-auto-chat.js?v=4';
  script.async = true;
  script.dataset.cjMemedAutoChat = '1';
  document.head.appendChild(script);

  var fix = document.createElement('script');
  fix.src = '/memed-open-fix-v4.js?v=6';
  fix.async = true;
  fix.dataset.cjMemedOpenFix = '1';
  document.head.appendChild(fix);
})();

// Painel médico: dashboard privado de avaliações, exibido apenas ao administrador.
(function () {
  if (/\/(?:psicologo|especialista)\/?$/i.test(location.pathname)) return;
  if (document.querySelector('script[data-cj-admin-avaliacoes]')) return;
  var script = document.createElement('script');
  script.src = '/admin-avaliacoes.js?v=1';
  script.async = true;
  script.dataset.cjAdminAvaliacoes = '1';
  document.head.appendChild(script);
})();
