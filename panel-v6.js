/* ConsultaJá24h — painel médico v6 · interações visuais.
 * - Abre/fecha o menu compacto de status (#cj-status-menu).
 * - NÃO chama API diretamente, NÃO altera plantão/status/fila/Memed/sessão.
 *   O item "Entrar/Sair do plantão" é o próprio #btn-plantao original,
 *   com o handler original togglePlantao(): só executa com clique explícito do médico.
 * - Ganhos ($): modal somente leitura. Os dados vêm de window.cjGanhosFonte()
 *   (no index.html: apiFetch('/api/medico/ganhos'); na demo: dados fictícios locais),
 *   chamada APENAS quando o médico clica em "Ganhos" ou em "Atualizar".
 *   Valores e arredondamento vêm prontos do backend (centavos inteiros); aqui só formatamos.
 */
(function () {
  'use strict';
  if (window.__cjPanelV6) return;
  window.__cjPanelV6 = true;

  function iniciarMenuStatus() {
    var menu = document.getElementById('cj-status-menu');
    var btn = document.getElementById('cj-status-btn');
    var pop = document.getElementById('cj-status-pop');
    if (!menu || !btn || !pop) return;

    function itens() {
      return Array.prototype.filter.call(pop.querySelectorAll('[role="menuitem"]'), function (el) {
        return !el.disabled && el.offsetParent !== null;
      });
    }
    function abrir(focarPrimeiro) {
      pop.hidden = false;
      menu.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      if (focarPrimeiro) { var l = itens(); if (l[0]) l[0].focus(); }
    }
    function fechar(devolverFoco) {
      if (pop.hidden) return;
      pop.hidden = true;
      menu.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      if (devolverFoco) btn.focus();
    }
    window.cjFecharMenuStatus = fechar;

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (pop.hidden) abrir(e.detail === 0); else fechar(false);
    });
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); abrir(true); }
    });
    pop.addEventListener('keydown', function (e) {
      var l = itens(); var i = l.indexOf(document.activeElement);
      if (e.key === 'Escape') { e.preventDefault(); fechar(true); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); if (l.length) l[(i + 1) % l.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (l.length) l[(i - 1 + l.length) % l.length].focus(); }
      else if (e.key === 'Tab') { fechar(false); }
    });
    // Fecha depois que o handler original do item (onclick inline) já rodou.
    pop.addEventListener('click', function (e) {
      var item = e.target.closest && e.target.closest('[role="menuitem"]');
      if (item && !item.disabled) setTimeout(function () { fechar(false); }, 0);
    });
    document.addEventListener('click', function (e) {
      if (!menu.contains(e.target)) fechar(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !pop.hidden) fechar(true);
    });
  }

  // Badge discreto: apenas LÊ a classe que a lógica original aplica em #btn-plantao
  // ('plantao-btn online' | 'plantao-btn offline') e espelha em data-plantao no menu.
  function iniciarBadgePlantao() {
    var menu = document.getElementById('cj-status-menu');
    var b = document.getElementById('btn-plantao');
    if (!menu || !b) return;
    var sync = function () { menu.setAttribute('data-plantao', b.classList.contains('online') ? 'on' : 'off'); };
    sync();
    try { new MutationObserver(sync).observe(b, { attributes: true, attributeFilter: ['class'] }); } catch (_) {}
  }

  // ── Ganhos (somente leitura, estimativa) ────────────────────────────────
  var SVG_NS = 'http://www.w3.org/2000/svg';
  function svgDolar(cls) {
    var s = document.createElementNS(SVG_NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', '18'); s.setAttribute('height', '18');
    s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.9');
    s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
    s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
    if (cls) s.setAttribute('class', cls);
    var p1 = document.createElementNS(SVG_NS, 'path'); p1.setAttribute('d', 'M12 3v18');
    var p2 = document.createElementNS(SVG_NS, 'path'); p2.setAttribute('d', 'M16.5 7.5c-.6-1.5-2.3-2.5-4.5-2.5-2.5 0-4.3 1.3-4.3 3.2 0 4.6 9 2.4 9 7.2 0 2-1.9 3.4-4.7 3.4-2.4 0-4.2-1-4.9-2.7');
    s.appendChild(p1); s.appendChild(p2);
    return s;
  }

  // Formata centavos inteiros (vindos do backend) em BRL sem aritmética de ponto flutuante.
  function brl(centavos) {
    var n = Math.abs(centavos), reais = String(Math.floor(n / 100)), cent = String(n % 100);
    if (cent.length < 2) cent = '0' + cent;
    reais = reais.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (centavos < 0 ? '−' : '') + 'R$ ' + reais + ',' + cent;
  }
  var MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  function dataBR(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
  function horaBR(iso) {
    try {
      var d = new Date(iso); if (isNaN(d)) return '';
      return d.toLocaleString('pt-BR', { timeZone: 'America/Fortaleza', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch (_) { return ''; }
  }
  function atend(n) { return n + (n === 1 ? ' atendimento' : ' atendimentos'); }
  function inteiro(v) { return typeof v === 'number' && isFinite(v) && Math.floor(v) === v && v >= 0; }
  var ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

  // Valida o contrato de GET /api/medico/ganhos. Qualquer desvio => "indisponível" (nunca zero enganoso).
  function validarGanhos(d) {
    if (!d || d.ok !== true || d.natureza !== 'estimativa' || d.moeda !== 'BRL') return null;
    if (!d.periodo || !ISO_RE.test(d.periodo.inicio)) return null;
    if (!d.hoje || !inteiro(d.hoje.atendimentos) || !inteiro(d.hoje.valor_centavos)) return null;
    if (!d.total || !inteiro(d.total.atendimentos) || !inteiro(d.total.valor_centavos)) return null;
    if (!Array.isArray(d.quinzenas)) return null;
    for (var i = 0; i < d.quinzenas.length; i++) {
      var q = d.quinzenas[i];
      if (!q || !ISO_RE.test(q.inicio) || !ISO_RE.test(q.fim) || !inteiro(q.atendimentos) || !inteiro(q.valor_centavos)) return null;
    }
    return d;
  }

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }

  function iniciarGanhos() {
    var item = document.getElementById('cj-menu-ganhos');
    if (!item) return;
    var ov = null, corpo = null, rodapeInfo = null, btnAtualizar = null, ultimoFoco = null, seq = 0;

    function montar() {
      if (ov) return;
      ov = el('div', 'modal-overlay cj-ganhos');
      ov.id = 'cj-ganhos';
      var m = el('div', 'modal cj-ganhos-modal');
      m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
      m.setAttribute('aria-labelledby', 'cj-ganhos-titulo'); m.setAttribute('aria-describedby', 'cj-ganhos-sub');
      m.tabIndex = -1;

      var head = el('div', 'cj-g-head');
      var ico = el('span', 'cj-g-ico'); ico.appendChild(svgDolar());
      var tt = el('div', 'cj-g-titles');
      var h = el('h2', 'modal-title cj-g-title', 'Ganhos'); h.id = 'cj-ganhos-titulo';
      var sub = el('p', 'cj-g-sub', 'Estimativa pessoal com base nos seus atendimentos registrados.'); sub.id = 'cj-ganhos-sub';
      tt.appendChild(h); tt.appendChild(sub);
      var x = el('button', 'cj-g-close'); x.type = 'button'; x.setAttribute('aria-label', 'Fechar ganhos');
      x.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18"/></svg>';
      x.addEventListener('click', fechar);
      head.appendChild(ico); head.appendChild(tt); head.appendChild(x);
      m.appendChild(head);

      if (window.cjGanhosRotulo) m.appendChild(el('span', 'cj-g-demo', String(window.cjGanhosRotulo)));

      corpo = el('div', 'cj-g-body'); corpo.setAttribute('aria-live', 'polite'); corpo.setAttribute('aria-busy', 'false');
      m.appendChild(corpo);

      var acoes = el('div', 'modal-actions cj-g-actions');
      rodapeInfo = el('span', 'cj-g-upd');
      btnAtualizar = el('button', 'btn-cancel cj-g-btn', 'Atualizar'); btnAtualizar.type = 'button';
      btnAtualizar.addEventListener('click', carregar);
      var ok = el('button', 'btn-confirm cj-g-btn', 'Fechar'); ok.type = 'button';
      ok.addEventListener('click', fechar);
      acoes.appendChild(rodapeInfo); acoes.appendChild(btnAtualizar); acoes.appendChild(ok);
      m.appendChild(acoes);
      ov.appendChild(m);

      ov.addEventListener('click', function (e) { if (e.target === ov) fechar(); });
      ov.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fechar(); return; }
        if (e.key !== 'Tab') return;
        var f = Array.prototype.filter.call(m.querySelectorAll('button:not([disabled]),[href],[tabindex]:not([tabindex="-1"])'), function (b) { return b.offsetParent !== null; });
        if (!f.length) return;
        var a = f[0], z = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === a || document.activeElement === m)) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      });
      document.body.appendChild(ov);
    }

    function aberto() { return !!ov && ov.classList.contains('open'); }
    function abrir() {
      montar();
      ultimoFoco = document.getElementById('cj-status-btn');
      ov.classList.add('open');
      document.addEventListener('keydown', escGlobal, true);
      setTimeout(function () { var c = ov.querySelector('.cj-g-close'); if (c) c.focus(); }, 0);
      carregar();
    }
    function fechar() {
      if (!aberto()) return;
      seq++; // descarta resposta pendente
      ov.classList.remove('open');
      document.removeEventListener('keydown', escGlobal, true);
      if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
    }
    function escGlobal(e) { if (e.key === 'Escape' && aberto()) { e.preventDefault(); e.stopPropagation(); fechar(); } }

    function estadoCarregando() {
      corpo.textContent = ''; corpo.setAttribute('aria-busy', 'true');
      var sk = el('div', 'cj-g-skel'); sk.setAttribute('aria-hidden', 'true');
      sk.appendChild(el('span', 'cj-g-skel-hero')); sk.appendChild(el('span', 'cj-g-skel-row')); sk.appendChild(el('span', 'cj-g-skel-row'));
      corpo.appendChild(sk);
      corpo.appendChild(el('p', 'cj-sr', 'Carregando ganhos…'));
      rodapeInfo.textContent = 'Carregando…';
      btnAtualizar.disabled = true;
    }
    function estadoIndisponivel(motivo) {
      corpo.textContent = ''; corpo.setAttribute('aria-busy', 'false');
      var box = el('div', 'cj-g-empty'); box.setAttribute('role', 'status');
      var ic = el('span', 'cj-g-empty-ico'); ic.appendChild(svgDolar());
      box.appendChild(ic);
      box.appendChild(el('strong', 'cj-g-empty-title', 'Ganhos indisponíveis no momento'));
      box.appendChild(el('p', 'cj-g-empty-txt', motivo));
      box.appendChild(el('p', 'cj-g-empty-txt cj-g-muted', 'Nenhum valor foi exibido para evitar números incorretos. Tente novamente mais tarde.'));
      corpo.appendChild(box);
      rodapeInfo.textContent = '';
      btnAtualizar.disabled = false; btnAtualizar.textContent = 'Tentar novamente';
    }

    function kpi(rotulo, valor, detalhe, mod) {
      var k = el('div', 'cj-g-kpi' + (mod ? ' ' + mod : ''));
      k.appendChild(el('span', 'cj-g-kpi-label', rotulo));
      k.appendChild(el('strong', 'cj-g-kpi-val', valor));
      if (detalhe) k.appendChild(el('span', 'cj-g-kpi-det', detalhe));
      return k;
    }
    function chip(txt, mod) { return el('span', 'cj-g-chip' + (mod ? ' ' + mod : ''), txt); }

    function estadoDados(d) {
      corpo.textContent = ''; corpo.setAttribute('aria-busy', 'false');
      var inicio = dataBR(d.periodo.inicio);

      var hero = el('section', 'cj-g-hero'); hero.setAttribute('aria-label', 'Hoje');
      var hl = el('div', 'cj-g-hero-top');
      hl.appendChild(el('span', 'cj-g-kpi-label', 'Ganho estimado hoje'));
      hl.appendChild(chip('Estimativa', 'is-est'));
      hero.appendChild(hl);
      hero.appendChild(el('strong', 'cj-g-hero-val', brl(d.hoje.valor_centavos)));
      var prod = el('span', 'cj-g-hero-det');
      prod.appendChild(el('b', null, String(d.hoje.atendimentos)));
      prod.appendChild(document.createTextNode(d.hoje.atendimentos === 1 ? ' atendimento contabilizado hoje' : ' atendimentos contabilizados hoje'));
      hero.appendChild(prod);
      corpo.appendChild(hero);

      var grid = el('div', 'cj-g-grid');
      grid.appendChild(kpi('Acumulado estimado', brl(d.total.valor_centavos), 'desde ' + inicio + ' · ' + atend(d.total.atendimentos)));
      grid.appendChild(kpi('Situação', 'A receber', 'Pagamento: data a definir', 'is-status'));
      corpo.appendChild(grid);

      var sec = el('section', 'cj-g-sec'); sec.setAttribute('aria-labelledby', 'cj-g-q-tit');
      var st = el('h3', 'cj-g-sec-title', 'Quinzenas'); st.id = 'cj-g-q-tit';
      sec.appendChild(st);
      if (!d.quinzenas.length) {
        sec.appendChild(el('p', 'cj-g-muted cj-g-vazio', 'Nenhum atendimento contabilizado desde ' + inicio + '.'));
      } else {
        var ul = el('ul', 'cj-g-list');
        d.quinzenas.forEach(function (q) {
          var li = el('li', 'cj-g-q');
          var a = el('div', 'cj-g-q-main');
          var mm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(q.inicio);
          var nome = (mm[3] === '01' ? '1ª' : '2ª') + ' quinzena · ' + MESES[+mm[2] - 1] + '/' + mm[1];
          a.appendChild(el('span', 'cj-g-q-nome', nome));
          a.appendChild(el('span', 'cj-g-q-per', dataBR(q.inicio).slice(0, 5) + ' a ' + dataBR(q.fim) + ' · ' + atend(q.atendimentos)));
          var b = el('div', 'cj-g-q-side');
          b.appendChild(el('strong', 'cj-g-q-val', brl(q.valor_centavos)));
          b.appendChild(chip(q.data_pagamento ? 'Pagamento ' + dataBR(q.data_pagamento) : 'A receber · data a definir', 'is-pend'));
          li.appendChild(a); li.appendChild(b);
          ul.appendChild(li);
        });
        sec.appendChild(ul);
      }
      corpo.appendChild(sec);

      var nota = el('div', 'cj-g-note');
      nota.appendChild(el('p', null, 'Valores estimados a partir dos atendimentos registrados desde ' + inicio + '. Não representam pagamento efetuado nem repasse confirmado.'));
      nota.appendChild(el('p', null, 'Fechamento quinzenal (1–15 e 16–fim do mês). A data de pagamento ainda será definida.'));
      var nc = d.nao_contabilizados && inteiro(d.nao_contabilizados.total) ? d.nao_contabilizados.total : 0;
      if (nc > 0) nota.appendChild(el('p', null, atend(nc) + (nc === 1 ? ' não entra' : ' não entram') + ' na estimativa (ex.: pagamento não confirmado, estorno ou fora da regra vigente).'));
      corpo.appendChild(nota);

      var hora = horaBR(d.atualizado_em);
      rodapeInfo.textContent = hora ? 'Atualizado ' + hora : '';
      btnAtualizar.disabled = false; btnAtualizar.textContent = 'Atualizar';
    }

    function carregar() {
      var meu = ++seq;
      estadoCarregando();
      var fonte = window.cjGanhosFonte;
      if (typeof fonte !== 'function') { estadoIndisponivel('O serviço de ganhos não está disponível nesta versão do painel.'); return; }
      var p;
      try { p = Promise.resolve(fonte()); } catch (_) { p = Promise.reject(); }
      p.then(function (r) {
        if (meu !== seq) return;
        var d = validarGanhos(r);
        if (d) return estadoDados(d);
        var vazio = !r || (typeof r === 'object' && !Object.keys(r).length);
        estadoIndisponivel(vazio
          ? 'O serviço de ganhos ainda não foi publicado no servidor.'
          : 'Não foi possível carregar seus ganhos agora.');
      }, function () {
        if (meu !== seq) return;
        estadoIndisponivel('Falha de conexão ao consultar seus ganhos.');
      });
    }

    item.addEventListener('click', function () { if (!item.disabled) abrir(); });
    window.cjAbrirGanhos = function () { if (!aberto()) abrir(); };
    window.cjFecharGanhos = fechar;
  }

  function iniciar() { iniciarMenuStatus(); iniciarBadgePlantao(); iniciarGanhos(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
