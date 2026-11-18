/* ConsultaJá24h — painel médico v16 · camada de interface (somente visual/cliente).
 *
 * O que este arquivo faz:
 *  - Abas compactas de atendimentos ativos: "Primeiro S." (inicial do último sobrenome),
 *    desambiguação de homônimos, aria-label com nome completo, contador de não lidas.
 *  - Ocultar uma aba da barra SEM encerrar a consulta: estado apenas em memória do navegador
 *    (não toca slots, APIs, polling, prescrição nem encerramento). "+N" fixo na faixa e
 *    folha "Atendimentos ativos" para restaurar/abrir.
 *  - Menu "Mais ações" (⋯) no cabeçalho: Atendimentos ativos, Ocultar da barra e, no mobile,
 *    Encerrar (abre o MESMO modal de confirmação existente, abrirModalEncerrar()).
 *  - Nome do paciente exibido no modal de encerrar (somente leitura do #atend-nome).
 *  - Composer: auto-crescimento até 104px e altura do chat ajustada ao teclado virtual.
 *
 * O que este arquivo NÃO faz: nenhuma chamada de rede, nenhuma escrita em storage,
 * nenhuma alteração de slots/atendimento/fila/autenticação/Memed/encerramento.
 */
(function () {
  'use strict';
  if (window.cjSlotsUI) return;

  var PARTICULAS = { da: 1, de: 1, di: 1, do: 1, das: 1, dos: 1, du: 1, e: 1, del: 1, della: 1, van: 1, von: 1, y: 1 };
  var SUFIXOS = { filho: 1, filha: 1, neto: 1, neta: 1, junior: 1, 'júnior': 1, jr: 1, 'jr.': 1, sobrinho: 1, sobrinha: 1, segundo: 1, terceiro: 1 };
  var MAX_TEXTAREA = 104;

  // ── Nomes ────────────────────────────────────────────────────────────────
  function capitalizar(p) {
    if (!p) return p;
    // Só normaliza caixa de nomes inteiramente em MAIÚSCULAS/minúsculas; respeita "McDonald".
    if (p !== p.toUpperCase() && p !== p.toLowerCase()) return p;
    var low = p.toLowerCase();
    if (PARTICULAS[low]) return low;
    return low.charAt(0).toUpperCase() + low.slice(1);
  }
  function partes(nome) {
    return String(nome || '').trim().split(/\s+/).filter(Boolean).map(capitalizar);
  }
  function inicial(p) { var c = Array.from(p || '')[0] || ''; return c ? c.toUpperCase() + '.' : ''; }
  // Sobrenomes "significativos": sem partículas; sufixos só contam se forem o único sobrenome.
  function sobrenomes(ps) {
    var s = ps.slice(1).filter(function (w) { return !PARTICULAS[w.toLowerCase()]; });
    var semSuf = s.filter(function (w) { return !SUFIXOS[w.toLowerCase()]; });
    return semSuf.length ? semSuf : s;
  }
  // nivel 0: "Juliana M." · 1: "Juliana C. M." · 2: "Juliana Martins" · 3: "Juliana C. Martins" · 4: nome completo
  function rotulo(nome, nivel) {
    var ps = partes(nome);
    if (!ps.length) return 'Paciente';
    var pri = ps[0];
    var sob = sobrenomes(ps);
    if (!sob.length) return nivel >= 4 ? ps.join(' ') : pri;
    var ult = sob[sob.length - 1], meio = sob.slice(0, -1);
    if (nivel <= 0) return pri + ' ' + inicial(ult);
    if (nivel === 1) return pri + ' ' + sob.map(inicial).join(' ');
    if (nivel === 2) return pri + ' ' + ult;
    if (nivel === 3) return pri + (meio.length ? ' ' + meio.map(inicial).join(' ') : '') + ' ' + ult;
    return ps.join(' ');
  }
  function nomeCompleto(nome) { var p = partes(nome); return p.length ? p.join(' ') : 'Paciente'; }

  // Rótulos curtos únicos para uma lista de nomes (mesma ordem).
  function rotulosUnicos(nomes) {
    var nivel = nomes.map(function () { return 0; });
    var labels = nomes.map(function (n) { return rotulo(n, 0); });
    for (var passo = 0; passo < 5; passo++) {
      var grupos = {};
      labels.forEach(function (l, i) { var k = l.toLowerCase(); (grupos[k] = grupos[k] || []).push(i); });
      var mudou = false;
      Object.keys(grupos).forEach(function (k) {
        var g = grupos[k];
        if (g.length < 2) return;
        g.forEach(function (i) { if (nivel[i] < 4) { nivel[i]++; labels[i] = rotulo(nomes[i], nivel[i]); mudou = true; } });
      });
      if (!mudou) break;
    }
    // Homônimos exatos: numeração estável pela ordem de abertura ("Ana L. · 2").
    var vistos = {};
    return labels.map(function (l, i) {
      var k = l.toLowerCase();
      var iguais = labels.filter(function (x) { return x.toLowerCase() === k; }).length;
      if (iguais < 2) return l;
      vistos[k] = (vistos[k] || 0) + 1;
      return rotulo(nomes[i], 0) + ' · ' + vistos[k];
    });
  }

  // ── Utilidades DOM ───────────────────────────────────────────────────────
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  var SVG = {
    chat: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>',
    video: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m22 8-6 4 6 4z"/>',
    mais: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
    lista: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
    ocultar: '<path d="M3 3l18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 5.1A10 10 0 0 1 12 5c5 0 9 4.5 10 7a13 13 0 0 1-2.9 3.9M6.6 6.6A13 13 0 0 0 2 12c1 2.5 5 7 10 7a10 10 0 0 0 4.2-.9"/>',
    mostrar: '<path d="M2 12c1-2.5 5-7 10-7s9 4.5 10 7c-1 2.5-5 7-10 7S3 14.5 2 12z"/><circle cx="12" cy="12" r="3"/>',
    encerrar: '<path d="m5 12 4 4L19 6"/>',
    fechar: '<path d="M18 6 6 18M6 6l12 12"/>'
  };
  function ico(n, size) {
    return '<svg class="cj16-i" width="' + (size || 16) + '" height="' + (size || 16) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + SVG[n] + '</svg>';
  }
  function visivel(e) { return !!e && e.offsetParent !== null; }
  function toast(msg, tipo) { try { if (typeof window.mostrarToast === 'function') window.mostrarToast(msg, tipo || 'info'); } catch (_) {} }
  function nomeAtivo() {
    var n = document.getElementById('atend-nome');
    var t = n ? String(n.textContent || '').trim() : '';
    return t && t !== '-' ? t : '';
  }
  function emHistorico() { return document.body.classList.contains('cj-history-view'); }

  // ── Estado (somente memória) ─────────────────────────────────────────────
  var ocultos = new Set();      // ids (string) de atendimentos ocultos da barra
  var ultimo = { wrap: null, itens: [], ativo: -1, ativar: null };
  var naoLidasAnunciadas = {};  // id -> contagem já anunciada (leitor de tela)

  var live = null;
  function anunciar(msg) {
    if (!live) {
      live = el('div', 'cj-sr');
      live.setAttribute('aria-live', 'polite'); live.setAttribute('role', 'status');
      document.body.appendChild(live);
    }
    live.textContent = '';
    setTimeout(function () { live.textContent = msg; }, 30);
  }

  function normalizar(itens) {
    return (itens || []).filter(function (it) { return it && it.id != null; }).map(function (it) {
      var n = Number(it.naoLidas);
      return {
        idx: it.idx, id: String(it.id), nome: nomeCompleto(it.nome), tipo: it.tipo === 'video' ? 'video' : 'chat',
        // Contador numérico só quando a fonte é confiável (inteiro > 0); senão apenas o indicador.
        naoLidas: isFinite(n) && n > 0 && Math.floor(n) === n ? n : 0,
        temNova: !!it.temNova || (isFinite(n) && n > 0)
      };
    });
  }

  function visiveisDe(itens, ativoIdx) {
    return itens.filter(function (it) { return it.idx === ativoIdx || !ocultos.has(it.id); });
  }

  // ── Render das abas ──────────────────────────────────────────────────────
  function render(wrap, itensBrutos, ativoIdx, ativar) {
    if (!wrap) return;
    var itens = normalizar(itensBrutos);
    ultimo = { wrap: wrap, itens: itens, ativo: ativoIdx, ativar: ativar };
    // Limpeza: ids que não estão mais ativos (encerrados) saem do conjunto; ativo nunca fica oculto.
    var ids = new Set(itens.map(function (i) { return i.id; }));
    Array.from(ocultos).forEach(function (id) { if (!ids.has(id)) ocultos.delete(id); });
    var atual = itens.find(function (i) { return i.idx === ativoIdx; });
    if (atual) ocultos.delete(atual.id);

    wrap.classList.add('cj16-slots');
    if (itens.length < 2) {
      wrap.classList.remove('visivel'); wrap.textContent = '';
      atualizarMenus(); atualizarFolha();
      return;
    }
    wrap.classList.add('visivel');
    wrap.setAttribute('aria-label', 'Atendimentos ativos');

    var labels = rotulosUnicos(itens.map(function (i) { return i.nome; }));
    var lab = {}; itens.forEach(function (it, k) { lab[it.id] = labels[k]; });
    var vis = visiveisDe(itens, ativoIdx);
    var esc = itens.filter(function (it) { return vis.indexOf(it) < 0; });

    var frag = document.createDocumentFragment();
    vis.forEach(function (it) {
      var ativo = it.idx === ativoIdx;
      var b = el('button', 'slot-tab-btn' + (ativo ? ' active' : '') + (it.temNova && !ativo ? ' has-new' : ''));
      b.type = 'button';
      b.dataset.slotIdx = String(it.idx);
      b.setAttribute('aria-pressed', ativo ? 'true' : 'false');
      if (ativo) b.setAttribute('aria-current', 'true');
      var desc = 'Atendimento de ' + it.nome + (it.tipo === 'video' ? ', vídeo' : ', chat');
      if (!ativo && it.temNova) desc += it.naoLidas ? ', ' + it.naoLidas + (it.naoLidas === 1 ? ' mensagem nova' : ' mensagens novas') : ', nova mensagem';
      if (ativo) desc += ', aberto';
      b.setAttribute('aria-label', desc);
      b.title = it.nome;
      b.innerHTML = '<span class="slot-dot" aria-hidden="true"></span>' + ico(it.tipo, 14);
      b.appendChild(el('span', 'slot-name', lab[it.id]));
      if (!ativo && it.temNova) {
        var badge = el('span', 'slot-badge-nova' + (it.naoLidas ? ' is-count' : ''), it.naoLidas ? (it.naoLidas > 9 ? '9+' : String(it.naoLidas)) : '');
        badge.setAttribute('aria-hidden', 'true');
        b.appendChild(badge);
      }
      frag.appendChild(b);
    });

    if (esc.length) {
      var novosOcultos = esc.filter(function (i) { return i.temNova; });
      var totalNovas = novosOcultos.reduce(function (s, i) { return s + (i.naoLidas || 1); }, 0);
      var mais = el('button', 'cj16-slot-more' + (novosOcultos.length ? ' is-alert' : ''));
      mais.type = 'button';
      mais.setAttribute('aria-haspopup', 'dialog');
      mais.setAttribute('aria-label', esc.length + (esc.length === 1 ? ' atendimento oculto' : ' atendimentos ocultos') +
        (novosOcultos.length ? ', ' + novosOcultos.length + ' com mensagem nova' : '') + '. Ver atendimentos ativos');
      mais.title = 'Atendimentos ocultos da barra';
      mais.appendChild(el('span', 'cj16-more-n', '+' + esc.length));
      if (novosOcultos.length) {
        var bn = el('span', 'slot-badge-nova is-count', totalNovas > 9 ? '9+' : String(totalNovas));
        bn.setAttribute('aria-hidden', 'true');
        mais.appendChild(bn);
      }
      frag.appendChild(mais);
      // Nunca perder alerta: anuncia mensagem nova recebida por atendimento oculto.
      novosOcultos.forEach(function (it) {
        var n = it.naoLidas || 1;
        if ((naoLidasAnunciadas[it.id] || 0) < n) anunciar('Nova mensagem de ' + it.nome + ' (atendimento oculto da barra).');
        naoLidasAnunciadas[it.id] = n;
      });
    }
    itens.forEach(function (it) { if (!it.temNova) delete naoLidasAnunciadas[it.id]; });

    wrap.textContent = '';
    wrap.appendChild(frag);
    if (!wrap.__cj16) {
      wrap.__cj16 = true;
      wrap.addEventListener('click', function (e) {
        var t = e.target.closest && e.target.closest('button');
        if (!t || !wrap.contains(t)) return;
        if (t.classList.contains('cj16-slot-more')) { abrirFolha(t); return; }
        var i = Number(t.dataset.slotIdx);
        if (isFinite(i) && typeof ultimo.ativar === 'function') ultimo.ativar(i);
      });
    }
    // Mantém a aba ativa visível na faixa horizontal.
    var at = wrap.querySelector('.slot-tab-btn.active');
    if (at && at.scrollIntoView && wrap.scrollWidth > wrap.clientWidth) {
      try { at.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (_) {}
    }
    atualizarMenus(); atualizarFolha();
  }

  function rerender() { if (ultimo.wrap) render(ultimo.wrap, ultimo.itens, ultimo.ativo, ultimo.ativar); }

  // ── Ocultar / restaurar (somente visual) ─────────────────────────────────
  function ocultar(id) {
    id = String(id);
    var itens = ultimo.itens;
    var it = itens.find(function (i) { return i.id === id; });
    if (!it || itens.length < 2) return false;
    var vis = visiveisDe(itens, ultimo.ativo);
    var outros = vis.filter(function (i) { return i.id !== id; });
    if (!outros.length) { toast('Mantenha ao menos um atendimento visível na barra.', 'info'); return false; }
    ocultos.add(id);
    if (it.idx === ultimo.ativo && typeof ultimo.ativar === 'function') {
      // O atendimento continua ativo (polling, rascunho e prescrição intactos); só trocamos a aba exibida.
      ultimo.ativar(outros[0].idx);
    }
    rerender();
    anunciar(it.nome + ' foi ocultado da barra. A consulta continua ativa.');
    return true;
  }
  function restaurar(id) {
    ocultos.delete(String(id));
    rerender();
  }
  function abrir(id) {
    var it = ultimo.itens.find(function (i) { return i.id === String(id); });
    if (!it) return;
    ocultos.delete(it.id);
    if (it.idx !== ultimo.ativo && typeof ultimo.ativar === 'function') ultimo.ativar(it.idx);
    else rerender();
  }

  // ── Folha "Atendimentos ativos" ─────────────────────────────────────────
  var folha = null, folhaLista = null, folhaFocoAnterior = null;
  function montarFolha() {
    if (folha) return;
    folha = el('div', 'cj16-sheet');
    folha.id = 'cj16-atendimentos';
    folha.hidden = true;
    var painel = el('div', 'cj16-sheet-panel');
    painel.setAttribute('role', 'dialog'); painel.setAttribute('aria-modal', 'true');
    painel.setAttribute('aria-labelledby', 'cj16-atend-titulo'); painel.tabIndex = -1;
    var head = el('div', 'cj16-sheet-head');
    var tt = el('div', 'cj16-sheet-titles');
    var h = el('h2', 'cj16-sheet-title', 'Atendimentos ativos'); h.id = 'cj16-atend-titulo';
    tt.appendChild(h);
    tt.appendChild(el('p', 'cj16-sheet-sub', 'Ocultar apenas tira a aba da barra. A consulta continua ativa e as mensagens continuam chegando.'));
    var x = el('button', 'cj16-icon-btn'); x.type = 'button'; x.setAttribute('aria-label', 'Fechar atendimentos ativos');
    x.innerHTML = ico('fechar', 18);
    x.addEventListener('click', fecharFolha);
    head.appendChild(tt); head.appendChild(x);
    folhaLista = el('ul', 'cj16-sheet-list');
    painel.appendChild(head); painel.appendChild(folhaLista);
    folha.appendChild(painel);
    folha.addEventListener('click', function (e) { if (e.target === folha) fecharFolha(); });
    folha.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fecharFolha(); return; }
      if (e.key !== 'Tab') return;
      var f = Array.prototype.filter.call(painel.querySelectorAll('button:not([disabled])'), visivel);
      if (!f.length) return;
      var a = f[0], z = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === a || document.activeElement === painel)) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    });
    folhaLista.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('button[data-acao]');
      if (!b) return;
      var id = b.getAttribute('data-id'), acao = b.getAttribute('data-acao');
      if (acao === 'abrir') { abrir(id); fecharFolha(); }
      else if (acao === 'ocultar') { ocultar(id); focarAcao(id); }
      else if (acao === 'mostrar') { restaurar(id); focarAcao(id); }
    });
    document.body.appendChild(folha);
  }
  function focarAcao(id) {
    if (!folhaLista) return;
    var b = folhaLista.querySelector('button[data-id="' + CSS.escape(String(id)) + '"][data-acao="ocultar"],button[data-id="' + CSS.escape(String(id)) + '"][data-acao="mostrar"]');
    if (b && !b.disabled) b.focus();
    else { var p = folha.querySelector('.cj16-sheet-panel'); if (p) p.focus(); }
  }
  function atualizarFolha() {
    if (!folha || folha.hidden) return;
    var itens = ultimo.itens;
    if (itens.length < 2) { fecharFolha(); return; }
    var labels = rotulosUnicos(itens.map(function (i) { return i.nome; }));
    var vis = visiveisDe(itens, ultimo.ativo);
    folhaLista.textContent = '';
    itens.forEach(function (it, k) {
      var ativo = it.idx === ultimo.ativo;
      var oculto = vis.indexOf(it) < 0;
      var li = el('li', 'cj16-sheet-item' + (ativo ? ' is-active' : '') + (oculto ? ' is-hidden' : ''));
      var info = el('div', 'cj16-sheet-info');
      var nome = el('span', 'cj16-sheet-nome', it.nome);
      info.appendChild(nome);
      var meta = el('span', 'cj16-sheet-meta');
      meta.innerHTML = ico(it.tipo, 13);
      meta.appendChild(document.createTextNode((it.tipo === 'video' ? 'Vídeo' : 'Chat') + ' · ' + (ativo ? 'Aberto agora' : oculto ? 'Oculto da barra' : 'Na barra') + ' · ' + labels[k]));
      info.appendChild(meta);
      li.appendChild(info);
      if (it.temNova && !ativo) {
        var nb = el('span', 'slot-badge-nova is-count', it.naoLidas ? String(it.naoLidas) : '');
        nb.setAttribute('aria-label', it.naoLidas ? it.naoLidas + ' mensagens novas' : 'Mensagem nova');
        nb.setAttribute('role', 'img');
        li.appendChild(nb);
      }
      var acoes = el('div', 'cj16-sheet-actions');
      if (!ativo) {
        var ab = el('button', 'cj16-btn cj16-btn--primary', 'Abrir'); ab.type = 'button';
        ab.setAttribute('data-acao', 'abrir'); ab.setAttribute('data-id', it.id);
        ab.setAttribute('aria-label', 'Abrir atendimento de ' + it.nome);
        acoes.appendChild(ab);
      }
      var podeOcultar = !oculto && vis.length > 1;
      var tg = el('button', 'cj16-btn', oculto ? 'Mostrar na barra' : 'Ocultar'); tg.type = 'button';
      tg.setAttribute('data-acao', oculto ? 'mostrar' : 'ocultar'); tg.setAttribute('data-id', it.id);
      tg.setAttribute('aria-label', (oculto ? 'Mostrar na barra: ' : 'Ocultar da barra: ') + it.nome);
      if (!oculto && !podeOcultar) { tg.disabled = true; tg.title = 'Ao menos um atendimento fica visível na barra'; }
      acoes.appendChild(tg);
      li.appendChild(acoes);
      folhaLista.appendChild(li);
    });
  }
  function abrirFolha(origem) {
    fecharMenus();
    if (ultimo.itens.length < 2) return;
    montarFolha();
    folhaFocoAnterior = origem || document.activeElement;
    folha.hidden = false;
    document.body.classList.add('cj16-sheet-open');
    atualizarFolha();
    requestAnimationFrame(function () { folha.classList.add('open'); var p = folha.querySelector('.cj16-sheet-panel'); if (p) p.focus(); });
  }
  function fecharFolha() {
    if (!folha || folha.hidden) return;
    folha.classList.remove('open');
    folha.hidden = true;
    document.body.classList.remove('cj16-sheet-open');
    var alvo = folhaFocoAnterior && document.contains(folhaFocoAnterior) && visivel(folhaFocoAnterior) ? folhaFocoAnterior : null;
    if (!alvo && ultimo.wrap) alvo = ultimo.wrap.querySelector('.slot-tab-btn.active');
    if (alvo && alvo.focus) alvo.focus();
  }

  // ── Menu "Mais ações" (⋯) ───────────────────────────────────────────────
  var menus = [];
  function criarMenu(host, opts) {
    if (!host || host.querySelector('.cj16-more')) return;
    var box = el('div', 'cj16-more' + (opts.mobile ? ' cj16-more--mobile' : ''));
    var btn = el('button', 'cj16-more-btn' + (opts.mobile ? ' cmh-btn' : ''));
    btn.type = 'button';
    btn.setAttribute('aria-haspopup', 'menu'); btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Mais ações do atendimento'); btn.title = 'Mais ações';
    btn.innerHTML = ico('mais', 18);
    var pop = el('div', 'cj16-menu'); pop.setAttribute('role', 'menu'); pop.hidden = true;
    pop.setAttribute('aria-label', 'Ações do atendimento');
    box.appendChild(btn); box.appendChild(pop);
    host.appendChild(box);
    var m = { box: box, btn: btn, pop: pop, mobile: !!opts.mobile };
    menus.push(m);

    function itensFocaveis() { return Array.prototype.filter.call(pop.querySelectorAll('[role="menuitem"]:not([disabled])'), visivel); }
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (pop.hidden) abrirMenu(m, e.detail === 0); else fecharMenus(false);
    });
    btn.addEventListener('keydown', function (e) { if (e.key === 'ArrowDown') { e.preventDefault(); abrirMenu(m, true); } });
    pop.addEventListener('keydown', function (e) {
      var l = itensFocaveis(); var i = l.indexOf(document.activeElement);
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fecharMenus(true); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); if (l.length) l[(i + 1) % l.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (l.length) l[(i - 1 + l.length) % l.length].focus(); }
      else if (e.key === 'Tab') fecharMenus(false);
    });
    pop.addEventListener('click', function (e) {
      var it = e.target.closest && e.target.closest('[role="menuitem"]');
      if (!it || it.disabled) return;
      var acao = it.getAttribute('data-acao');
      fecharMenus(false);
      if (acao === 'lista') abrirFolha(btn);
      else if (acao === 'ocultar') {
        var atual = ultimo.itens.find(function (i) { return i.idx === ultimo.ativo; });
        if (atual) ocultar(atual.id);
      }
      else if (acao === 'dados' && typeof window.abrirDadosPacienteSheet === 'function') window.abrirDadosPacienteSheet();
      else if (acao === 'encerrar' && typeof window.abrirModalEncerrar === 'function') window.abrirModalEncerrar();
    });
  }
  function item(acao, icone, titulo, sub, mod) {
    var b = el('button', 'cj16-menu-item' + (mod ? ' ' + mod : ''));
    b.type = 'button'; b.setAttribute('role', 'menuitem'); b.setAttribute('data-acao', acao); b.tabIndex = -1;
    b.innerHTML = ico(icone, 16);
    var t = el('span', 'cj16-menu-txt');
    t.appendChild(el('span', 'cj16-menu-t', titulo));
    if (sub) t.appendChild(el('span', 'cj16-menu-s', sub));
    b.appendChild(t);
    return b;
  }
  function preencherMenu(m) {
    var pop = m.pop; pop.textContent = '';
    var itens = ultimo.itens;
    var multi = itens.length >= 2 && !emHistorico();
    var nome = nomeAtivo();
    if (multi) {
      var nOcultos = itens.length - visiveisDe(itens, ultimo.ativo).length;
      pop.appendChild(item('lista', 'lista', 'Atendimentos ativos', itens.length + ' abertos' + (nOcultos ? ' · ' + nOcultos + ' ocultos' : '')));
      var vis = visiveisDe(itens, ultimo.ativo).length;
      var oc = item('ocultar', 'ocultar', 'Ocultar da barra', 'A consulta permanece ativa');
      if (vis < 2) { oc.disabled = true; oc.setAttribute('aria-disabled', 'true'); oc.querySelector('.cj16-menu-s').textContent = 'Ao menos um atendimento fica visível'; }
      pop.appendChild(oc);
    }
    if (m.mobile) {
      if (multi) pop.appendChild(el('div', 'cj16-menu-sep'));
      var enc = item('encerrar', 'encerrar', 'Encerrar atendimento', nome ? nome : null, 'is-danger');
      enc.setAttribute('aria-label', 'Encerrar atendimento' + (nome ? ' de ' + nome : '') + '. Abre a confirmação');
      pop.appendChild(enc);
    }
    if (!pop.children.length) pop.appendChild(el('p', 'cj16-menu-vazio', 'Sem outras ações para este atendimento.'));
  }
  function abrirMenu(m, focar) {
    fecharMenus(false);
    preencherMenu(m);
    m.pop.hidden = false; m.box.classList.add('is-open'); m.btn.setAttribute('aria-expanded', 'true');
    posicionar(m);
    if (focar) { var f = m.pop.querySelector('[role="menuitem"]:not([disabled])'); if (f) f.focus(); }
  }
  function posicionar(m) {
    var r = m.btn.getBoundingClientRect();
    var w = Math.min(280, window.innerWidth - 16);
    m.pop.style.width = w + 'px';
    m.pop.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w)) + 'px';
    m.pop.style.top = Math.round(r.bottom + 6) + 'px';
  }
  function fecharMenus(devolver) {
    menus.forEach(function (m) {
      if (m.pop.hidden) return;
      m.pop.hidden = true; m.box.classList.remove('is-open'); m.btn.setAttribute('aria-expanded', 'false');
      if (devolver) m.btn.focus();
    });
  }
  function atualizarMenus() {
    menus.forEach(function (m) {
      var multi = ultimo.itens.length >= 2 && !emHistorico();
      // Desktop: o menu só faz sentido com 2+ atendimentos. Mobile: sempre (contém Encerrar).
      m.box.hidden = !m.mobile && !multi;
      if (!m.pop.hidden) preencherMenu(m);
    });
  }

  // ── Modal de encerrar: mostra o nome completo do paciente (somente leitura) ──
  function iniciarNomeEncerrar() {
    var modal = document.getElementById('modal-encerrar');
    if (!modal) return;
    var sync = function () {
      if (!modal.classList.contains('open')) return;
      var box = modal.querySelector('.modal');
      var titulo = modal.querySelector('.modal-title');
      if (!box || !titulo) return;
      var p = box.querySelector('.cj16-encerrar-nome');
      if (!p) { p = el('p', 'cj16-encerrar-nome'); titulo.insertAdjacentElement('afterend', p); }
      var nome = nomeAtivo();
      p.textContent = '';
      if (nome) { p.appendChild(document.createTextNode('Paciente: ')); p.appendChild(el('strong', null, nome)); p.hidden = false; }
      else p.hidden = true;
    };
    try { new MutationObserver(sync).observe(modal, { attributes: true, attributeFilter: ['class'] }); } catch (_) {}
    sync();
  }

  // ── Composer: auto-crescimento e teclado virtual ─────────────────────────
  function ajustarAltura(ta) {
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, MAX_TEXTAREA) + 'px';
    ta.style.overflowY = ta.scrollHeight > MAX_TEXTAREA ? 'auto' : 'hidden';
  }
  function iniciarComposer() {
    var ta = document.getElementById('chat-medico-textarea');
    if (ta && !ta.__cj16) {
      ta.__cj16 = true;
      ta.addEventListener('input', function () { ajustarAltura(ta); });
      // Após envio o valor é limpo programaticamente: volta à altura mínima.
      var envio = document.getElementById('chat-medico-send');
      if (envio) envio.addEventListener('click', function () { setTimeout(function () { if (!ta.value) ajustarAltura(ta); }, 0); });
      ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) setTimeout(function () { if (!ta.value) ajustarAltura(ta); }, 0); });
      ta.addEventListener('focus', function () {
        if (!document.body.classList.contains('chat-fullscreen')) return;
        setTimeout(function () { try { ta.scrollIntoView({ block: 'nearest' }); } catch (_) {} }, 250);
      });
    }
    var vv = window.visualViewport;
    var root = document.documentElement;
    var aplicar = function () {
      var h = vv ? vv.height : window.innerHeight;
      root.style.setProperty('--cj16-vvh', Math.round(h) + 'px');
      // Teclado aberto quando a área visual encolhe de forma relevante.
      var teclado = vv ? (window.innerHeight - vv.height) > 120 : false;
      document.body.classList.toggle('cj16-teclado', teclado);
    };
    aplicar();
    if (vv) { vv.addEventListener('resize', aplicar); vv.addEventListener('scroll', aplicar); }
    window.addEventListener('resize', aplicar);
  }

  // ── Cabeçalhos: menu ⋯ e rótulos acessíveis ─────────────────────────────
  function iniciarCabecalhos() {
    var cmh = document.querySelector('#chat-mobile-header .cmh-actions');
    if (cmh) {
      var dados = cmh.querySelector('.cmh-btn:not(.green):not(.red)');
      if (dados) { dados.setAttribute('aria-label', 'Dados do paciente'); dados.title = 'Dados do paciente'; dados.classList.add('cj16-dados'); }
      var presc = document.getElementById('btn-memed-mobile');
      if (presc) presc.setAttribute('aria-label', 'Prescrever: receitas, atestados e exames');
      var enc = cmh.querySelector('.cmh-btn.red');
      // O botão original permanece no DOM (mesmo handler); no mobile a ação vai para o menu ⋯.
      if (enc) { enc.classList.add('cj16-encerrar-legado'); enc.setAttribute('aria-label', 'Encerrar atendimento'); }
      criarMenu(cmh, { mobile: true });
    }
    var desk = document.getElementById('atend-actions-live');
    if (desk) criarMenu(desk, { mobile: false });
    var back = document.querySelector('#chat-mobile-header .cmh-back');
    if (back) back.setAttribute('aria-label', 'Voltar ao atendimento');
    document.addEventListener('click', function (e) {
      if (!menus.some(function (m) { return m.box.contains(e.target); })) fecharMenus(false);
    });
    window.addEventListener('resize', function () { fecharMenus(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fecharMenus(true); });
    atualizarMenus();
  }

  window.cjSlotsUI = {
    render: render,
    ocultar: ocultar,
    restaurar: restaurar,
    abrir: abrir,
    abrirLista: function () { abrirFolha(null); },
    fecharLista: fecharFolha,
    ocultos: function () { return Array.from(ocultos); },
    rotuloCurto: function (n) { return rotulo(n, 0); },
    rotulosUnicos: rotulosUnicos,
    ajustarComposer: function () { ajustarAltura(document.getElementById('chat-medico-textarea')); }
  };

  function iniciar() { iniciarCabecalhos(); iniciarNomeEncerrar(); iniciarComposer(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
