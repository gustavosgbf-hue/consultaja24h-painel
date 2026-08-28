(function () {
  'use strict';

  if (window.__cjClinicalWorkspaceLoaded) return;
  window.__cjClinicalWorkspaceLoaded = true;

  var ultimoAtendimentoId = null;
  var contextoCache = new Map();
  var apiFetchOriginal = null;
  var memedWrapperInstalado = false;
  var apiWrapperInstalado = false;
  var ultimaRevisaoProntuario = 0;

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function digits(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function fmtCpf(value) {
    var n = digits(value);
    if (n.length !== 11) return value || '—';
    return n.slice(0,3)+'.'+n.slice(3,6)+'.'+n.slice(6,9)+'-'+n.slice(9);
  }

  function fmtPhone(value) {
    var n = digits(value);
    if (n.startsWith('55') && n.length >= 12) n = n.slice(2);
    if (n.length === 11) return '('+n.slice(0,2)+') '+n.slice(2,7)+'-'+n.slice(7);
    if (n.length === 10) return '('+n.slice(0,2)+') '+n.slice(2,6)+'-'+n.slice(6);
    return value || '—';
  }

  function fmtDate(value, withTime) {
    if (!value) return '—';
    var d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString('pt-BR', {
      timeZone: 'America/Fortaleza',
      day: '2-digit', month: 'short', year: 'numeric',
      hour: withTime ? '2-digit' : undefined,
      minute: withTime ? '2-digit' : undefined
    }).replace('.', '');
  }

  function ativo() {
    try { return typeof atendimentoAtual !== 'undefined' ? atendimentoAtual : null; }
    catch (_) { return null; }
  }

  function token() {
    return localStorage.getItem('token') || '';
  }

  function apiBase() {
    return (window.API_BASE_URL || 'https://triagem-api.onrender.com').replace(/\/$/, '');
  }

  function proximaRevisaoProntuario() {
    ultimaRevisaoProntuario = Math.max(Date.now(), ultimaRevisaoProntuario + 1);
    return ultimaRevisaoProntuario;
  }

  function safeDocumentUrl(value) {
    try {
      var url = new URL(String(value || ''), window.location.origin);
      return url.protocol === 'https:' ? url.href : '';
    } catch (_) { return ''; }
  }

  async function cjFetch(path, options) {
    options = options || {};
    var headers = Object.assign({}, options.headers || {}, { Authorization: 'Bearer ' + token() });
    var body = options.body;
    if (options.json !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.json);
    }
    var res = await fetch(apiBase() + path, Object.assign({}, options, { headers: headers, body: body }));
    var data = await res.json().catch(function(){ return {}; });
    if (!res.ok) throw new Error(data.error || ('Erro HTTP ' + res.status));
    return data;
  }

  function toast(msg, type) {
    try { if (typeof mostrarToast === 'function') mostrarToast(msg, type || 'success'); }
    catch (_) {}
  }

  function instalarCss() {
    if (document.getElementById('cj-clinical-workspace-style')) return;
    var style = document.createElement('style');
    style.id = 'cj-clinical-workspace-style';
    style.textContent = `
      .cj-id-card{margin:0 0 12px;padding:12px 13px;border:1px solid rgba(94,224,160,.15);border-radius:11px;background:linear-gradient(135deg,rgba(94,224,160,.055),rgba(255,255,255,.018));display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:10px}
      .cj-id-primary{min-width:0}.cj-id-kicker{font-size:.61rem;text-transform:uppercase;letter-spacing:.11em;color:rgba(143,207,157,.72);font-weight:700;margin-bottom:4px}.cj-id-name{font-family:'Outfit',sans-serif;font-size:.94rem;font-weight:700;color:#f2f5f3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cj-id-sub{font-size:.69rem;line-height:1.5;color:rgba(231,235,233,.47);margin-top:3px}.cj-id-side{display:grid;gap:6px}.cj-id-mini{padding:7px 8px;border-radius:8px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.055)}.cj-id-mini b{display:block;font-size:.58rem;letter-spacing:.08em;text-transform:uppercase;color:rgba(231,235,233,.36);margin-bottom:2px}.cj-id-mini span{display:block;font-size:.7rem;color:rgba(231,235,233,.72);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .cj-id-warning{grid-column:1/-1;padding:8px 10px;border-radius:8px;border:1px solid rgba(214,170,98,.2);background:rgba(214,170,98,.065);font-size:.69rem;line-height:1.5;color:#dcc291}
      .cj-qa-wrap{margin-top:10px}.cj-qa-title{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:7px}.cj-qa-title strong{font-size:.66rem;letter-spacing:.08em;text-transform:uppercase;color:rgba(231,235,233,.48)}.cj-qa-table{width:100%;border-collapse:separate;border-spacing:0;overflow:hidden;border:1px solid rgba(255,255,255,.065);border-radius:9px;background:rgba(255,255,255,.018)}.cj-qa-table tr+tr td{border-top:1px solid rgba(255,255,255,.055)}.cj-qa-table td{padding:8px 10px;vertical-align:top}.cj-qa-table td:first-child{width:41%;font-size:.68rem;font-weight:600;color:rgba(231,235,233,.48);background:rgba(255,255,255,.015)}.cj-qa-table td:last-child{font-size:.73rem;line-height:1.45;color:rgba(245,247,246,.84)}.cj-qa-empty{color:rgba(231,235,233,.25)!important;font-style:italic}.cj-qa-original{margin-top:7px}.cj-qa-original summary{cursor:pointer;font-size:.65rem;color:rgba(143,207,157,.65);user-select:none}.cj-qa-original pre{white-space:pre-wrap;margin-top:7px;padding:9px;border-radius:8px;background:#09100e;border:1px solid rgba(255,255,255,.055);font:400 .66rem/1.5 'JetBrains Mono',monospace;color:rgba(231,235,233,.5);max-height:180px;overflow:auto}
      #cj-tab-historico{position:relative}.cj-history-count{display:inline-flex;min-width:17px;height:17px;align-items:center;justify-content:center;border-radius:999px;margin-left:5px;padding:0 5px;background:rgba(94,224,160,.11);color:#74e2ad;font-size:.58rem;font-weight:700}.cj-history-panel{padding:2px 0 20px}.cj-history-hero{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(180px,.6fr);gap:12px;margin-bottom:14px}.cj-history-card{border:1px solid rgba(255,255,255,.07);border-radius:12px;background:linear-gradient(180deg,rgba(255,255,255,.026),rgba(255,255,255,.015));padding:14px}.cj-history-card h3{font-size:.75rem;color:rgba(231,235,233,.46);font-weight:600;letter-spacing:.06em;text-transform:uppercase;margin:0 0 9px}.cj-history-name{font-size:1.05rem;font-weight:700;color:#f5f7f6}.cj-history-meta{font-size:.71rem;color:rgba(231,235,233,.43);line-height:1.65;margin-top:5px}.cj-history-chip-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}.cj-history-chip{display:inline-flex;padding:4px 7px;border-radius:999px;font-size:.61rem;border:1px solid rgba(94,224,160,.16);background:rgba(94,224,160,.055);color:#89deb1}.cj-history-chip.warn{border-color:rgba(214,170,98,.22);background:rgba(214,170,98,.06);color:#dfbf84}.cj-history-section-title{display:flex;align-items:center;justify-content:space-between;margin:18px 1px 9px}.cj-history-section-title strong{font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;color:rgba(231,235,233,.56)}.cj-timeline{position:relative;margin-left:5px;padding-left:16px;border-left:1px solid rgba(94,224,160,.14)}.cj-timeline-item{position:relative;margin-bottom:10px}.cj-timeline-item:before{content:'';position:absolute;left:-20px;top:18px;width:7px;height:7px;border-radius:50%;background:#62c58a;box-shadow:0 0 0 4px #0a0f0e}.cj-visit{border:1px solid rgba(255,255,255,.07);border-radius:11px;background:rgba(255,255,255,.02);overflow:hidden}.cj-visit-head{display:flex;justify-content:space-between;gap:12px;padding:11px 12px;border-bottom:1px solid rgba(255,255,255,.05)}.cj-visit-date{font-size:.7rem;font-weight:700;color:rgba(231,235,233,.82)}.cj-visit-doc{font-size:.65rem;color:rgba(143,207,157,.72);text-align:right}.cj-visit-body{padding:10px 12px}.cj-visit-summary{font-size:.75rem;line-height:1.5;color:rgba(245,247,246,.78)}.cj-visit-meta{font-size:.65rem;color:rgba(231,235,233,.34);margin-top:5px}.cj-visit-details{margin-top:9px}.cj-visit-details summary{cursor:pointer;font-size:.65rem;color:rgba(143,207,157,.64)}.cj-pront-preview{white-space:pre-wrap;margin-top:7px;max-height:180px;overflow:auto;padding:9px;border-radius:8px;background:#09100e;border:1px solid rgba(255,255,255,.05);font-size:.66rem;line-height:1.5;color:rgba(231,235,233,.5)}.cj-doc-links{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.cj-doc-link{display:inline-flex;align-items:center;gap:5px;padding:5px 7px;border-radius:7px;border:1px solid rgba(94,224,160,.15);background:rgba(94,224,160,.045);color:#7edfad;text-decoration:none;font-size:.62rem}.cj-history-empty{padding:26px 16px;text-align:center;border:1px dashed rgba(255,255,255,.09);border-radius:12px;color:rgba(231,235,233,.32);font-size:.75rem}.cj-history-loading{padding:30px;text-align:center;color:rgba(231,235,233,.35);font-size:.75rem}.cj-patient-candidate{margin-top:9px;padding:9px 10px;border-radius:9px;border:1px solid rgba(214,170,98,.18);background:rgba(214,170,98,.055);font-size:.69rem;color:#d9bd88;line-height:1.5}
      @media(max-width:768px){.cj-id-card{grid-template-columns:1fr}.cj-id-side{grid-template-columns:1fr 1fr}.cj-history-hero{grid-template-columns:1fr}.cj-qa-table,.cj-qa-table tbody,.cj-qa-table tr,.cj-qa-table td{display:block;width:100%!important}.cj-qa-table tr+tr td:first-child{border-top:1px solid rgba(255,255,255,.055)}.cj-qa-table td:first-child{padding-bottom:3px;background:transparent;border-bottom:0}.cj-qa-table td:last-child{padding-top:3px}.tabs:has(#cj-tab-historico) .tab{font-size:.68rem;padding-left:4px;padding-right:4px}.cj-history-card{padding:12px}.cj-visit-head{align-items:flex-start}.cj-id-warning{grid-column:auto}.cj-history-panel{padding-bottom:70px}}
    `;
    document.head.appendChild(style);
  }

  function detectarNomePacienteNoTexto(text) {
    var raw = String(text || '').replace(/[ \t]+/g, ' ').trim();
    if (!raw) return '';
    var patterns = [
      /(?:nome\s+(?:do|da)\s+paciente\s*(?:é|e|:)?\s*)([A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ][A-Za-zÁÀÂÃÉÊÍÓÔÕÚÜÇáàâãéêíóôõúüç' -]{5,70})/i,
      /(?:paciente\s+(?:é|e|:)?\s*)([A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ][A-Za-zÁÀÂÃÉÊÍÓÔÕÚÜÇáàâãéêíóôõúüç' -]{5,70})/i,
      /(?:consulta|atendimento)\s+(?:é|e)?\s*(?:para|pra)\s+(?:o|a)?\s*([A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ][A-Za-zÁÀÂÃÉÊÍÓÔÕÚÜÇáàâãéêíóôõúüç' -]{5,70})/i
    ];
    for (var i=0;i<patterns.length;i++) {
      var m = raw.match(patterns[i]);
      if (m && m[1]) {
        return m[1].replace(/\s+(?:e|que|com|pois|porque|para)\s.*$/i,'').trim().slice(0,80);
      }
    }
    return '';
  }

  function parseQa(raw) {
    raw = String(raw || '').trim();
    if (!raw) return [];
    var lines = raw.split(/\n+/).map(function(s){ return s.trim(); }).filter(Boolean);
    var rows = [];
    var pendingQuestion = '';
    lines.forEach(function(line){
      var colon = line.match(/^([^:]{3,100}):\s*(.+)$/);
      if (colon) {
        rows.push({ q: colon[1].trim(), a: colon[2].trim() });
        pendingQuestion = '';
        return;
      }
      if (/\?$/.test(line)) {
        pendingQuestion = line;
        return;
      }
      if (pendingQuestion) {
        rows.push({ q: pendingQuestion, a: line });
        pendingQuestion = '';
      }
    });
    return rows.slice(0, 20);
  }

  function qaKnown(p) {
    var rows = [
      ['Possui alergias conhecidas?', p.alergias],
      ['Possui doenças ou comorbidades?', p.cronicas],
      ['Usa medicamentos atualmente?', p.medicacoes],
      ['O que deseja neste atendimento?', p.solicita],
      ['Qual é o relato principal?', p.queixa]
    ];
    return rows.filter(function(r){ return String(r[1] || '').trim(); }).map(function(r){ return {q:r[0],a:String(r[1]).trim()}; });
  }

  function mergeQa(p) {
    var parsed = parseQa(p.triagem);
    var known = qaKnown(p);
    var seen = new Set();
    var out = [];
    known.concat(parsed).forEach(function(r){
      var key = (r.q+'|'+r.a).toLowerCase().replace(/\s+/g,' ').trim();
      if (!r.a || seen.has(key)) return;
      seen.add(key); out.push(r);
    });
    return out.slice(0, 24);
  }

  function renderIdentityAndTriage(p) {
    var body = document.getElementById('triagem-body');
    if (!body || !p) return;

    var oldId = document.getElementById('cj-id-card');
    if (oldId) oldId.remove();
    var oldQa = document.getElementById('cj-triagem-qa');
    if (oldQa) oldQa.remove();

    var candidate = detectarNomePacienteNoTexto(p.triagem || p.queixa || '');
    var third = !!p.atendimento_para_terceiro;
    var payer = String(p.pagador_nome || '').trim();
    var headerName = String(p.nome || '').trim();
    var candidateDiff = candidate && headerName && candidate.toLowerCase() !== headerName.toLowerCase();

    var card = document.createElement('div');
    card.id = 'cj-id-card';
    card.className = 'cj-id-card';
    card.innerHTML =
      '<div class="cj-id-primary">' +
        '<div class="cj-id-kicker">Paciente do atendimento</div>' +
        '<div class="cj-id-name">' + esc(headerName || 'Paciente não identificado') + '</div>' +
        '<div class="cj-id-sub">' + esc(p.data_nascimento ? ('Nascimento: '+p.data_nascimento) : (p.idade ? ('Idade informada: '+p.idade) : 'Nascimento não informado')) + '</div>' +
      '</div>' +
      '<div class="cj-id-side">' +
        '<div class="cj-id-mini"><b>Contato</b><span>' + esc(fmtPhone(p.tel)) + '</span></div>' +
        '<div class="cj-id-mini"><b>CPF do paciente</b><span>' + esc(fmtCpf(p.cpf)) + '</span></div>' +
      '</div>' +
      ((third || payer) ? '<div class="cj-id-warning">Atendimento para terceiro. Pagador/contato: <strong>' + esc(payer || 'não informado') + '</strong>' + (p.pagador_cpf ? (' · CPF '+esc(fmtCpf(p.pagador_cpf))) : '') + '. O prontuário deve permanecer vinculado à pessoa efetivamente atendida.</div>' : '') +
      (candidateDiff ? '<div class="cj-id-warning">A triagem parece mencionar outro nome de paciente: <strong>' + esc(candidate) + '</strong>. Confira antes de prescrever ou emitir documentos; o sistema não altera o cadastro automaticamente.</div>' : '');

    body.insertBefore(card, body.firstChild);

    var rows = mergeQa(p);
    var section = document.createElement('section');
    section.id = 'cj-triagem-qa';
    section.className = 'triagem-section cj-qa-wrap';
    section.innerHTML = '<div class="cj-qa-title"><strong>Perguntas e respostas da triagem</strong><span style="font-size:.61rem;color:rgba(231,235,233,.26)">' + rows.length + ' itens</span></div>';
    var table = document.createElement('table');
    table.className = 'cj-qa-table';
    var tbody = document.createElement('tbody');
    if (!rows.length) {
      var tr0 = document.createElement('tr');
      tr0.innerHTML = '<td>Triagem</td><td class="cj-qa-empty">Sem respostas estruturadas disponíveis.</td>';
      tbody.appendChild(tr0);
    } else {
      rows.forEach(function(row){
        var tr = document.createElement('tr');
        var q = document.createElement('td'); q.textContent = row.q || 'Pergunta';
        var a = document.createElement('td'); a.textContent = row.a || 'Não informado';
        tr.appendChild(q); tr.appendChild(a); tbody.appendChild(tr);
      });
    }
    table.appendChild(tbody); section.appendChild(table);
    if (p.triagem) {
      var details = document.createElement('details');
      details.className = 'cj-qa-original';
      details.innerHTML = '<summary>Ver texto original da triagem</summary><pre>' + esc(p.triagem) + '</pre>';
      section.appendChild(details);
    }
    body.appendChild(section);
  }

  function installHistoryTab() {
    var tabs = document.getElementById('atend-tabs') || document.querySelector('.tabs');
    var pront = document.getElementById('tab-prontuario');
    if (!tabs || !pront) return false;
    if (!document.getElementById('cj-tab-historico')) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tab';
      btn.id = 'cj-tab-historico';
      btn.innerHTML = 'Histórico <span class="cj-history-count" id="cj-history-count">—</span>';
      btn.addEventListener('click', abrirHistoricoLongitudinal);
      tabs.appendChild(btn);
    }
    if (!document.getElementById('cj-tab-historico-panel')) {
      var panel = document.createElement('div');
      panel.className = 'tab-panel cj-history-panel';
      panel.id = 'cj-tab-historico-panel';
      panel.innerHTML = '<div class="cj-history-loading">Carregue um atendimento para visualizar o histórico.</div>';
      pront.parentNode.insertBefore(panel, pront.nextSibling);
    }
    return true;
  }

  async function carregarContexto(id, force) {
    if (!force && contextoCache.has(String(id))) return contextoCache.get(String(id));
    var data = await cjFetch('/api/medico/paciente-contexto/' + encodeURIComponent(String(id)));
    contextoCache.set(String(id), data);
    return data;
  }

  function docsByAttendance(data) {
    var map = {};
    (data.documentos || []).forEach(function(d){
      var id = String(d.atendimento_id);
      if (!map[id]) map[id] = [];
      map[id].push(d);
    });
    return map;
  }

  function mirrorByAttendance(data) {
    var map = {};
    (data.prontuarios_espelho || []).forEach(function(r){ map[String(r.atendimento_id)] = r; });
    return map;
  }

  function eventsByAttendance(data) {
    var map = {};
    (data.eventos || []).forEach(function(e){
      var id = String(e.atendimento_id);
      if (!map[id]) map[id] = [];
      map[id].push(e);
    });
    return map;
  }

  function renderHistory(data) {
    var panel = document.getElementById('cj-tab-historico-panel');
    var count = document.getElementById('cj-history-count');
    if (!panel) return;
    var p = data.paciente || {};
    var history = data.historico || [];
    if (count) count.textContent = String(history.length);

    var shared = Number(data.telefone_compartilhado_nao_vinculado || 0);
    var candidate = detectarNomePacienteNoTexto(p.triagem || p.queixa || '');
    var docsMap = docsByAttendance(data);
    var mirrorMap = mirrorByAttendance(data);
    var eventMap = eventsByAttendance(data);

    var html = '<div class="cj-history-hero">' +
      '<div class="cj-history-card"><h3>Paciente</h3><div class="cj-history-name">'+esc(p.nome || 'Paciente')+'</div>' +
      '<div class="cj-history-meta">'+esc(fmtPhone(p.tel))+' · CPF '+esc(fmtCpf(p.cpf))+(p.data_nascimento ? (' · Nasc. '+esc(String(p.data_nascimento).slice(0,10))) : '')+'</div>' +
      '<div class="cj-history-chip-row"><span class="cj-history-chip">'+history.length+' atendimento'+(history.length===1?' anterior':'s anteriores')+'</span>' +
      (p.atendimento_para_terceiro ? '<span class="cj-history-chip warn">Atendimento para terceiro</span>' : '') +
      (shared ? '<span class="cj-history-chip warn">Telefone compartilhado</span>' : '') + '</div>' +
      (candidate && String(candidate).toLowerCase() !== String(p.nome||'').toLowerCase() ? '<div class="cj-patient-candidate">A triagem menciona <strong>'+esc(candidate)+'</strong> como possível paciente. Confira a identidade; não houve alteração automática.</div>' : '') +
      '</div>' +
      '<div class="cj-history-card"><h3>Vinculação</h3><div class="cj-history-meta">O histórico abaixo só reúne atendimentos com CPF válido ou nome e nascimento coincidentes. Em atendimento para terceiro, exige nome e nascimento. Telefone nunca vincula sozinho.</div>' +
      (shared ? '<div class="cj-patient-candidate">Há '+shared+' atendimento'+(shared===1?'':'s')+' no mesmo telefone que <strong>não foi vinculado</strong> por falta de confirmação de identidade.</div>' : '') +
      '</div></div>';

    html += '<div class="cj-history-section-title"><strong>Linha do tempo</strong><span style="font-size:.64rem;color:rgba(231,235,233,.28)">mais recente primeiro</span></div>';
    if (!history.length) {
      html += '<div class="cj-history-empty">Nenhum atendimento anterior foi vinculado com segurança a este paciente.</div>';
    } else {
      html += '<div class="cj-timeline">';
      history.forEach(function(v){
        var id = String(v.id);
        var docs = docsMap[id] || [];
        var events = eventMap[id] || [];
        var mirror = mirrorMap[id];
        var pront = (mirror && mirror.conteudo) || v.prontuario || '';
        var docHtml = docs.map(function(d){
          var url = safeDocumentUrl(d.arquivo_url);
          return url ? '<a class="cj-doc-link" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">PDF · '+esc(d.arquivo_nome || 'Documento')+'</a>' : '';
        }).join('');
        var memedCount = events.filter(function(e){ return e.tipo === 'prescricao_memed'; }).length;
        html += '<div class="cj-timeline-item"><article class="cj-visit">' +
          '<div class="cj-visit-head"><div><div class="cj-visit-date">'+esc(fmtDate(v.encerrado_em || v.assumido_em || v.criado_em, false))+'</div><div class="cj-visit-meta">'+esc(v.medico_nome || 'Profissional ConsultaJá24h')+' · '+esc(v.tipo || 'consulta')+'</div></div>' +
          '<div class="cj-visit-doc">'+(docs.length ? (docs.length+' PDF'+(docs.length===1?'':'s')) : 'Sem PDF')+(memedCount ? (' · '+memedCount+' prescrição') : '')+'</div></div>' +
          '<div class="cj-visit-body"><div class="cj-visit-summary">'+esc(v.resumo || v.queixa || 'Sem resumo clínico registrado.')+'</div>' +
          (docHtml ? '<div class="cj-doc-links">'+docHtml+'</div>' : '') +
          (pront ? '<details class="cj-visit-details"><summary>Ver prontuário registrado</summary><div class="cj-pront-preview">'+esc(pront)+'</div></details>' : '') +
          '</div></article></div>';
      });
      html += '</div>';
    }
    panel.innerHTML = html;
  }

  async function abrirHistoricoLongitudinal() {
    var p = ativo();
    if (!p || !p.id) return toast('Nenhum atendimento ativo.', 'error');
    installHistoryTab();
    document.querySelectorAll('.tab').forEach(function(t){ t.classList.remove('active'); });
    document.querySelectorAll('.tab-panel').forEach(function(t){ t.classList.remove('active'); });
    var btn = document.getElementById('cj-tab-historico');
    var panel = document.getElementById('cj-tab-historico-panel');
    if (btn) btn.classList.add('active');
    if (panel) { panel.classList.add('active'); panel.innerHTML = '<div class="cj-history-loading">Carregando histórico seguro do paciente…</div>'; }
    try {
      var data = await carregarContexto(p.id, false);
      renderHistory(data);
    } catch (e) {
      if (panel) panel.innerHTML = '<div class="cj-history-empty">'+esc(e.message || 'Não foi possível carregar o histórico.')+'</div>';
    }
  }

  function prepararContextoAtual(force) {
    var p = ativo();
    if (!p || !p.id) return;
    renderIdentityAndTriage(p);
    installHistoryTab();
    carregarContexto(p.id, !!force).then(function(data){
      var count = document.getElementById('cj-history-count');
      if (count) count.textContent = String((data.historico || []).length);
      var panel = document.getElementById('cj-tab-historico-panel');
      if (panel && panel.classList.contains('active')) renderHistory(data);
    }).catch(function(){
      var count = document.getElementById('cj-history-count'); if (count) count.textContent = '—';
    });
  }

  function instalarApiMirror() {
    if (apiWrapperInstalado || typeof window.apiFetch !== 'function') return false;
    apiFetchOriginal = window.apiFetch;
    window.apiFetch = async function(path, options) {
      var espelhaProntuario = String(path) === '/api/atendimento/prontuario'
        && options && options.method === 'POST' && options.json && options.json.filaId;
      var revisao = 0;
      if (espelhaProntuario) {
        revisao = proximaRevisaoProntuario();
        options.json.clientRevision = revisao;
      }
      var result = await apiFetchOriginal.apply(this, arguments);
      try {
        if (espelhaProntuario) {
          var payload = { filaId: Number(options.json.filaId), prontuario: String(options.json.prontuario || ''), clientRevision: revisao };
          cjFetch('/api/medico/prontuario/espelho', { method:'POST', json:payload }).catch(function(e){ console.warn('[CLINICAL-WORKSPACE] Espelho não salvo:', e.message); });
          contextoCache.delete(String(payload.filaId));
        }
      } catch (_) {}
      return result;
    };
    apiWrapperInstalado = true;
    return true;
  }

  function instalarCapturaMemed() {
    if (memedWrapperInstalado || typeof window.abrirMemed !== 'function') return false;
    var original = window.abrirMemed;
    window.abrirMemed = function() {
      var p = ativo();
      if (p && p.id) {
        window.__cjMemedAtendimentoId = Number(p.id);
        window.__cjMemedAtendimentoTs = Date.now();
        console.log('[MEMED-CONTEXTO] Atendimento congelado ao abrir Memed:', p.id);
      }
      return original.apply(this, arguments);
    };
    memedWrapperInstalado = true;
    return true;
  }

  function prescriptionId(ev) {
    var candidatos = [];
    if (ev && ev.prescricao) candidatos.push(ev.prescricao);
    if (ev && ev.prescription) candidatos.push(ev.prescription);
    if (ev && ev.data && ev.data.prescricao) candidatos.push(ev.data.prescricao);
    if (ev && ev.data && ev.data.prescription) candidatos.push(ev.data.prescription);
    if (ev && ev.data) candidatos.push(ev.data);
    if (ev) candidatos.push(ev);
    for (var i=0; i<candidatos.length; i++) {
      var p = candidatos[i];
      if (!p || typeof p !== 'object') continue;
      var direct = p.id || p.prescricao_id || p.prescription_id || p.id_prescription || p.prescriptionId || p.prescricaoId;
      if (direct != null && String(direct).trim()) return String(direct).trim();
      var docs = Array.isArray(p.documents) ? p.documents : (Array.isArray(p.documentos) ? p.documentos : []);
      for (var j=0; j<docs.length; j++) {
        var doc = docs[j] || {};
        var docId = doc.prescription_id || doc.prescricao_id || doc.id_prescription || doc.prescriptionId || doc.prescricaoId;
        if (docId != null && String(docId).trim()) return String(docId).trim();
      }
    }
    return '';
  }

  function resumirPrescricao(ev) {
    var p = ev && (ev.prescricao || ev.prescription || ev.data || ev) || {};
    var itens = p.medicamentos || p.itens || p.drugs || [];
    var exames = p.exames || [];
    var lines = [];
    if (Array.isArray(itens)) itens.slice(0,20).forEach(function(item){
      if (typeof item === 'string') lines.push(item);
      else if (item && typeof item === 'object') lines.push(item.nome || item.name || item.medicamento || item.descricao || JSON.stringify(item));
    });
    if (Array.isArray(exames) && exames.length) lines.push('Exames: '+exames.map(function(e){ return typeof e==='string'?e:(e.nome||e.name||'exame'); }).join(', '));
    if (p.atestado) lines.push('Atestado: '+String(p.atestado));
    return lines.join('\n').slice(0,8000);
  }

  function registrarEventoMemed(ev) {
    var id = Number(window.__cjMemedAtendimentoId || 0);
    if (!id) {
      var p = ativo(); id = p && p.id ? Number(p.id) : 0;
    }
    if (!id) return;
    var pid = prescriptionId(ev) || ('evt_'+Date.now());
    cjFetch('/api/medico/prontuario/evento', {
      method:'POST',
      json:{
        filaId:id,
        tipo:'prescricao_memed',
        titulo:'Prescrição Memed emitida',
        conteudo:resumirPrescricao(ev),
        origemId:pid,
        metadata:{ prescription_id:pid }
      }
    }).then(function(){ contextoCache.delete(String(id)); }).catch(function(e){ console.warn('[CLINICAL-WORKSPACE] Evento Memed não registrado:', e.message); });
  }

  function instalarListenerMemed() {
    if (window.__cjClinicalMemedListener) return true;
    if (!window.MdHub || !window.MdHub.event || typeof window.MdHub.event.add !== 'function') return false;
    try {
      window.MdHub.event.add('prescricaoImpressa', registrarEventoMemed);
      window.__cjClinicalMemedListener = true;
      return true;
    } catch (_) { return false; }
  }

  instalarCss();
  var timer = setInterval(function(){
    instalarApiMirror();
    instalarCapturaMemed();
    instalarListenerMemed();
    installHistoryTab();
    var p = ativo();
    var id = p && p.id ? String(p.id) : '';
    if (id && id !== ultimoAtendimentoId) {
      ultimoAtendimentoId = id;
      prepararContextoAtual(false);
    }
  }, 450);

  document.addEventListener('visibilitychange', function(){
    if (!document.hidden) prepararContextoAtual(false);
  });

  window.CJClinicalWorkspace = {
    refresh: function(){
      var p = ativo();
      if (p && p.id) contextoCache.delete(String(p.id));
      prepararContextoAtual(true);
    },
    openHistory: abrirHistoricoLongitudinal
  };
})();
