/* ConsultaJá24h — tema do painel médico (claro/escuro) + ícones SVG de interface.
 * Camada puramente visual: não toca API, sessão, plantão, fila, Memed ou regras de admin.
 * Carregado de forma síncrona no <head> para aplicar o tema antes da primeira pintura.
 */
(function () {
  'use strict';
  if (window.__cjPanelTheme) return;
  window.__cjPanelTheme = true;

  var STORAGE_KEY = 'cj-panel-theme';
  var root = document.documentElement;
  var THEME_COLORS = { dark: '#070d0b', light: '#f4f7f5' };

  function lerTema() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      if (v === 'light' || v === 'dark') return v;
    } catch (_) {}
    return 'dark'; // padrão: mantém a experiência atual do painel
  }

  function metaThemeColor() {
    var m = document.querySelector('meta[name="theme-color"]');
    if (!m && document.head) {
      m = document.createElement('meta');
      m.name = 'theme-color';
      document.head.appendChild(m);
    }
    return m;
  }

  function aplicarTema(tema) {
    root.setAttribute('data-theme', tema);
    root.style.colorScheme = tema;
    var m = metaThemeColor();
    if (m) m.setAttribute('content', THEME_COLORS[tema]);
    atualizarBotoes(tema);
  }

  function salvarTema(tema) {
    try { localStorage.setItem(STORAGE_KEY, tema); } catch (_) {}
  }

  // ── Ícones (traço 1.8, 24×24, estilo consistente) ─────────────────────────
  var ICONES = {
    pill: '<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>',
    clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h4"/>',
    flask: '<path d="M9 3h6"/><path d="M10 3v6.5L4.6 18.2A1.8 1.8 0 0 0 6.1 21h11.8a1.8 1.8 0 0 0 1.5-2.8L14 9.5V3"/><path d="M7.5 15h9"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>',
    xCircle: '<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/>',
    noReply: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="m9.5 8 5 5M14.5 8l-5 5"/>',
    ban: '<circle cx="12" cy="12" r="9"/><path d="m5.7 5.7 12.6 12.6"/>',
    video: '<path d="m16 13 5.2 3.1a.5.5 0 0 0 .8-.4V8.3a.5.5 0 0 0-.8-.4L16 11"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
    chat: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
    building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
    pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    arrowLeft: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    play: '<path d="m7 4 13 8-13 8z"/>',
    external: '<path d="M7 17 17 7M8 7h9v9"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    check: '<path d="m5 12 5 5L20 7"/>',
    edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'
  };

  // Retorna SVG inline (sem nós de texto: não altera textContent de quem o contém).
  function cjIcon(nome, extraClass) {
    var corpo = ICONES[nome];
    if (!corpo) return '';
    return '<svg class="cj-i' + (extraClass ? ' ' + extraClass : '') + '" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + corpo + '</svg>';
  }
  window.cjIcon = cjIcon;

  // ── Botão de alternância ──────────────────────────────────────────────────
  function rotuloPara(tema) {
    return tema === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro';
  }

  function atualizarBotoes(tema) {
    var botoes = document.querySelectorAll('.cj-theme-toggle');
    for (var i = 0; i < botoes.length; i += 1) {
      var b = botoes[i];
      b.setAttribute('aria-pressed', tema === 'light' ? 'true' : 'false');
      b.setAttribute('aria-label', rotuloPara(tema));
      b.title = rotuloPara(tema);
    }
  }

  function alternar() {
    var novo = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    salvarTema(novo);
    aplicarTema(novo);
  }

  function criarBotao(extraClass) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'cj-theme-toggle' + (extraClass ? ' ' + extraClass : '');
    b.innerHTML = cjIcon('sun', 'cj-theme-sun') + cjIcon('moon', 'cj-theme-moon');
    b.addEventListener('click', alternar);
    return b;
  }

  // Ícone associado a cada rótulo cujo textContent é lido pela lógica do painel.
  // O emoji continua no DOM (oculto visualmente e para leitores de tela) para que
  // o texto enviado à API e salvo no prontuário permaneça idêntico.
  var MAPA_EMOJI = {
    '💊': 'pill',      // 💊
    '📋': 'clipboard', // 📋
    '🔬': 'flask',     // 🔬
    '🔄': 'refresh',   // 🔄
    '✅': 'checkCircle',     // ✅
    '❌': 'xCircle',         // ❌
    '🔇': 'noReply',   // 🔇
    '🚫': 'ban'        // 🚫
  };

  function decorarRotulo(el) {
    if (!el || el.getAttribute('data-cj-icon') === '1') return;
    var no = el.firstChild;
    if (!no || no.nodeType !== 3) return;
    var texto = no.nodeValue;
    var chaves = Object.keys(MAPA_EMOJI);
    for (var i = 0; i < chaves.length; i += 1) {
      var emo = chaves[i];
      if (texto.indexOf(emo) !== 0) continue;
      var antes = el.textContent;
      var span = document.createElement('span');
      span.className = 'cj-emo';
      span.setAttribute('aria-hidden', 'true');
      span.textContent = emo;
      no.nodeValue = texto.slice(emo.length);
      el.insertBefore(span, no);
      el.insertAdjacentHTML('afterbegin', cjIcon(MAPA_EMOJI[emo]));
      // Garantia: se por qualquer motivo o texto mudou, desfaz.
      if (el.textContent !== antes) {
        el.textContent = antes;
        return;
      }
      el.setAttribute('data-cj-icon', '1');
      return;
    }
  }

  function decorarRotulos() {
    var alvos = document.querySelectorAll('.dc-text, #rg-status .radio-text, #cg-docs .check-opt');
    for (var i = 0; i < alvos.length; i += 1) decorarRotulo(alvos[i]);
  }

  function montarBotoes() {
    var nav = document.querySelector('#screen-app .nav');
    if (nav && !nav.querySelector('.cj-theme-toggle')) {
      var sair = nav.querySelector('.nav-logout');
      var b = criarBotao('cj-theme-toggle--nav');
      if (sair) nav.insertBefore(b, sair); else nav.appendChild(b);
    }
    var login = document.getElementById('screen-login');
    if (login && !login.querySelector('.cj-theme-toggle')) {
      login.appendChild(criarBotao('cj-theme-toggle--login'));
    }
    atualizarBotoes(root.getAttribute('data-theme') || 'dark');
  }

  function iniciarDom() {
    try { montarBotoes(); } catch (e) { console.warn('[TEMA] botões', e); }
    try { decorarRotulos(); } catch (e) { console.warn('[TEMA] ícones', e); }
  }

  aplicarTema(lerTema());

  // Sincroniza entre abas abertas do painel.
  window.addEventListener('storage', function (ev) {
    if (ev.key === STORAGE_KEY && (ev.newValue === 'light' || ev.newValue === 'dark')) aplicarTema(ev.newValue);
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciarDom);
  else iniciarDom();
})();
