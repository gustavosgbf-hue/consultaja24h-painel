(function () {
  var instalado = false;
  var aberto = false;
  var dados = null;

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function estrelas(n) {
    n = Number(n || 0);
    var out = '<span class="cj-rating-stars" aria-label="' + n + ' de 5">';
    for (var i = 1; i <= 5; i++) {
      out += '<span class="cj-rating-star ' + (i <= Math.round(n) ? 'on' : '') + '">★</span>';
    }
    return out + '</span>';
  }

  function style() {
    if (document.getElementById('cj-avaliacoes-style')) return;
    var s = document.createElement('style');
    s.id = 'cj-avaliacoes-style';
    s.textContent = [
      '#cj-avaliacoes-overlay{position:fixed;inset:0;z-index:12000;background:rgba(0,0,0,.72);backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center;padding:24px}',
      '#cj-avaliacoes-overlay.open{display:flex}',
      '.cj-av-card{width:min(1180px,96vw);height:min(820px,92vh);background:#0b1512;border:1px solid rgba(255,255,255,.1);border-radius:22px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 30px 80px rgba(0,0,0,.45)}',
      '.cj-av-head{display:flex;align-items:center;gap:14px;padding:20px 22px;border-bottom:1px solid rgba(255,255,255,.08)}',
      '.cj-av-title{font-size:1.05rem;font-weight:700;color:#f4f7f5}.cj-av-sub{font-size:.76rem;color:rgba(255,255,255,.42);margin-top:3px}',
      '.cj-av-close{margin-left:auto;width:36px;height:36px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#dce7e1;cursor:pointer}',
      '.cj-av-filters{display:flex;gap:10px;flex-wrap:wrap;padding:14px 22px;border-bottom:1px solid rgba(255,255,255,.06)}',
      '.cj-av-filters input,.cj-av-filters select{background:#101d19;color:#e7ebe9;border:1px solid rgba(255,255,255,.1);border-radius:9px;padding:8px 10px;font:inherit;font-size:.78rem}',
      '.cj-av-apply{border:0;border-radius:9px;padding:8px 14px;background:#5ee0a0;color:#06110b;font-weight:700;cursor:pointer}',
      '.cj-av-body{overflow:auto;padding:18px 22px 28px}',
      '.cj-av-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-bottom:22px}',
      '.cj-av-med{background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:14px}',
      '.cj-av-med-name{font-size:.9rem;font-weight:700;color:#eef4f1}.cj-av-med-meta{font-size:.72rem;color:rgba(255,255,255,.42);margin-top:3px}',
      '.cj-av-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}.cj-av-kpi{background:rgba(255,255,255,.03);border-radius:10px;padding:9px}.cj-av-kpi b{display:block;font-size:1rem;color:#fff}.cj-av-kpi span{font-size:.65rem;color:rgba(255,255,255,.4)}',
      '.cj-rating-stars{display:inline-flex;gap:2px}.cj-rating-star{font-size:15px;color:rgba(255,255,255,.16)}.cj-rating-star.on{color:#78f25f}',
      '.cj-av-dist{display:flex;align-items:center;gap:5px;margin-top:10px;font-size:.66rem;color:rgba(255,255,255,.35)}',
      '.cj-av-section{font-size:.78rem;text-transform:uppercase;letter-spacing:.09em;color:rgba(255,255,255,.42);margin:3px 0 10px}',
      '.cj-av-table{width:100%;border-collapse:collapse;font-size:.76rem}.cj-av-table th{text-align:left;color:rgba(255,255,255,.38);font-weight:600;padding:9px 8px;border-bottom:1px solid rgba(255,255,255,.08)}.cj-av-table td{padding:10px 8px;border-bottom:1px solid rgba(255,255,255,.055);vertical-align:top;color:#dce6e1}',
      '.cj-av-comment{max-width:360px;color:rgba(255,255,255,.62);line-height:1.45}',
      '.cj-av-empty{padding:30px;text-align:center;color:rgba(255,255,255,.4)}',
      '@media(max-width:700px){#cj-avaliacoes-overlay{padding:0}.cj-av-card{width:100vw;height:100vh;border-radius:0}.cj-av-body{padding:14px}.cj-av-head,.cj-av-filters{padding-left:14px;padding-right:14px}.cj-av-table{min-width:760px}}'
    ].join('');
    document.head.appendChild(s);
  }

  function hoje(offsetDias) {
    var d = new Date();
    d.setDate(d.getDate() + offsetDias);
    return d.toISOString().slice(0, 10);
  }

  function markup() {
    var el = document.createElement('div');
    el.id = 'cj-avaliacoes-overlay';
    el.innerHTML = '<div class="cj-av-card">'
      + '<div class="cj-av-head"><div><div class="cj-av-title">Avaliações dos médicos</div><div class="cj-av-sub">Visão administrativa privada por profissional e período</div></div><button class="cj-av-close" id="cj-av-close">✕</button></div>'
      + '<div class="cj-av-filters"><input type="date" id="cj-av-inicio"><input type="date" id="cj-av-fim"><select id="cj-av-medico"><option value="">Todos os médicos</option></select><button class="cj-av-apply" id="cj-av-apply">Aplicar</button></div>'
      + '<div class="cj-av-body"><div id="cj-av-content"><div class="cj-av-empty">Carregando avaliações...</div></div></div>'
      + '</div>';
    document.body.appendChild(el);
    document.getElementById('cj-av-inicio').value = hoje(-30);
    document.getElementById('cj-av-fim').value = hoje(0);
    document.getElementById('cj-av-close').onclick = fechar;
    document.getElementById('cj-av-apply').onclick = carregar;
    el.addEventListener('click', function (e) { if (e.target === el) fechar(); });
  }

  function instalarBotao() {
    if (document.getElementById('cj-avaliacoes-btn')) return true;
    var sidebar = document.getElementById('sidebar-inner');
    if (!sidebar) return false;
    var btn = document.createElement('button');
    btn.id = 'cj-avaliacoes-btn';
    btn.textContent = 'Avaliações dos médicos';
    btn.style.cssText = 'display:none;width:100%;margin-top:10px;padding:10px 12px;border-radius:9px;border:1px solid rgba(120,242,95,.22);background:rgba(120,242,95,.055);color:#a7df9d;font-family:inherit;font-size:.76rem;font-weight:600;cursor:pointer;text-align:left';
    btn.onclick = abrir;
    var anchor = document.getElementById('admin-manual-btn');
    if (anchor && anchor.parentNode === sidebar) anchor.insertAdjacentElement('afterend', btn);
    else sidebar.appendChild(btn);
    return true;
  }

  function atualizarPermissao() {
    var btn = document.getElementById('cj-avaliacoes-btn');
    if (!btn) return;
    var admin = false;
    try { admin = typeof isAdminAtual === 'function' && isAdminAtual(); } catch (_) {}
    btn.style.display = admin ? 'block' : 'none';
    if (!admin && aberto) fechar();
  }

  async function carregar() {
    var content = document.getElementById('cj-av-content');
    if (!content) return;
    content.innerHTML = '<div class="cj-av-empty">Carregando avaliações...</div>';
    var inicio = document.getElementById('cj-av-inicio').value;
    var fim = document.getElementById('cj-av-fim').value;
    var medico = document.getElementById('cj-av-medico').value;
    var qs = '?inicio=' + encodeURIComponent(inicio) + '&fim=' + encodeURIComponent(fim) + (medico ? '&medico_id=' + encodeURIComponent(medico) : '');
    try {
      if (typeof apiFetch !== 'function') throw new Error('API indisponível');
      var d = await apiFetch('/api/admin/avaliacoes-medicos' + qs);
      if (!d || !d.ok) throw new Error(d && d.error || 'Falha ao carregar');
      dados = d;
      preencherMedicos(d.medicos || []);
      render(d);
    } catch (e) {
      content.innerHTML = '<div class="cj-av-empty">Não foi possível carregar as avaliações.</div>';
    }
  }

  function preencherMedicos(medicos) {
    var select = document.getElementById('cj-av-medico');
    if (!select || select.dataset.loaded === '1') return;
    medicos.forEach(function (m) {
      var o = document.createElement('option');
      o.value = m.id;
      o.textContent = m.nome || ('Médico #' + m.id);
      select.appendChild(o);
    });
    select.dataset.loaded = '1';
  }

  function render(d) {
    var content = document.getElementById('cj-av-content');
    var resumo = d.resumo || [];
    var avaliacoes = d.avaliacoes || [];
    var cards = resumo.map(function (m) {
      var media = m.media == null ? null : Number(m.media);
      return '<div class="cj-av-med">'
        + '<div class="cj-av-med-name">' + esc(m.nome || 'Médico') + '</div>'
        + '<div class="cj-av-med-meta">' + esc(m.crm || '') + '</div>'
        + '<div style="margin-top:9px">' + (media == null ? '<span style="color:rgba(255,255,255,.32);font-size:.72rem">Sem avaliações</span>' : estrelas(media) + ' <span style="font-size:.76rem;color:#cfe0d7;margin-left:5px">' + media.toFixed(2).replace('.', ',') + '</span>') + '</div>'
        + '<div class="cj-av-kpis"><div class="cj-av-kpi"><b>' + Number(m.consultas || 0) + '</b><span>consultas</span></div><div class="cj-av-kpi"><b>' + Number(m.avaliacoes || 0) + '</b><span>avaliações</span></div><div class="cj-av-kpi"><b>' + Number(m.taxa_resposta || 0).toFixed(1).replace('.', ',') + '%</b><span>resposta</span></div></div>'
        + '<div class="cj-av-dist"><span>1★ ' + Number(m.estrela_1 || 0) + '</span><span>2★ ' + Number(m.estrela_2 || 0) + '</span><span>3★ ' + Number(m.estrela_3 || 0) + '</span><span>4★ ' + Number(m.estrela_4 || 0) + '</span><span>5★ ' + Number(m.estrela_5 || 0) + '</span></div>'
        + '</div>';
    }).join('');

    var rows = avaliacoes.map(function (a) {
      var data = a.criado_em ? new Date(a.criado_em).toLocaleString('pt-BR') : '-';
      return '<tr><td>' + esc(data) + '</td><td>' + esc(a.medico_nome || '-') + '</td><td>' + esc(a.paciente_nome || '-') + '<br><span style="color:rgba(255,255,255,.28)">#' + esc(a.atendimento_id) + '</span></td><td>' + estrelas(a.estrelas) + '</td><td class="cj-av-comment">' + esc(a.comentario || 'Sem comentário') + '</td></tr>';
    }).join('');

    content.innerHTML = '<div class="cj-av-grid">' + cards + '</div>'
      + '<div class="cj-av-section">Avaliações individuais</div>'
      + (rows ? '<div style="overflow:auto"><table class="cj-av-table"><thead><tr><th>Data</th><th>Médico</th><th>Paciente</th><th>Nota</th><th>Comentário</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '<div class="cj-av-empty">Nenhuma avaliação no período selecionado.</div>');
  }

  function abrir() {
    if (!instalado) return;
    aberto = true;
    document.getElementById('cj-avaliacoes-overlay').classList.add('open');
    carregar();
  }

  function fechar() {
    aberto = false;
    var el = document.getElementById('cj-avaliacoes-overlay');
    if (el) el.classList.remove('open');
  }

  function init() {
    if (instalado) return;
    style();
    markup();
    if (!instalarBotao()) return;
    instalado = true;
    atualizarPermissao();
    setInterval(atualizarPermissao, 1200);
  }

  var tries = 0;
  var timer = setInterval(function () {
    tries += 1;
    if (instalarBotao()) {
      clearInterval(timer);
      init();
    } else if (tries > 120) clearInterval(timer);
  }, 500);
})();
