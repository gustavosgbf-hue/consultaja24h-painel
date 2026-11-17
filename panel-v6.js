/* ConsultaJá24h — painel médico v6 · interações puramente visuais.
 * - Abre/fecha o menu compacto de status (#cj-status-menu).
 * - NÃO chama API, NÃO altera plantão/status/fila/Memed/sessão.
 *   O item "Entrar/Sair do plantão" é o próprio #btn-plantao original,
 *   com o handler original togglePlantao(): só executa com clique explícito do médico.
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

  function iniciar() { iniciarMenuStatus(); iniciarBadgePlantao(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
