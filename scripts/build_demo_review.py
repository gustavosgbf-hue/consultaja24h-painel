#!/usr/bin/env python3
"""Gera demo-review.html a partir do markup REAL do index.html.

- Copia apenas o HTML estático do <body> (sem nenhum <script> do painel).
- Remove os elementos da Memed (overlay/loading) — a demo não carrega Memed.
- Troca nomes reais citados em textos de interface por textos genéricos.
- Reaproveita o CSS real: panel-base.css + panel-experience-v3.css + panel-ds-v5.css + panel-v6.css
  e o JS visual panel-theme.js + panel-v6.js (menu de status; sem rede).
- A lógica da demo fica em demo-review.js (dados 100% fictícios, sem rede).

Uso:  python3 scripts/build_demo_review.py
"""
import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTE = os.path.join(RAIZ, 'index.html')
SAIDA = os.path.join(RAIZ, 'demo-review.html')


def trecho(s, inicio, fim, a_partir=0):
    a = s.index(inicio, a_partir)
    b = s.index(fim, a)
    return s[a:b], b


def main():
    s = open(FONTE, encoding='utf-8').read()
    corpo_ini = s.index('<body>') + len('<body>')
    principal, fim1 = trecho(s, '<div class="bg-mesh"', '<script>', corpo_ini)
    cauda, _ = trecho(s, '<span id="fab-badge"', '<script src="/memed-auto-chat.js', fim1)
    markup = principal + cauda

    # Sem Memed na demo.
    markup = re.sub(r'<div class="memed-loading"[^>]*>.*?</div>', '', markup, flags=re.S)
    markup = markup.replace('<div id="memed-overlay" onclick="fecharMemedDrawer()"></div>', '')
    if 'memed-overlay' in markup or 'memed-loading' in markup:
        sys.exit('erro: elementos da Memed permaneceram no markup da demo')

    # O item Ganhos é o mesmo do sistema real; na demo a fonte de dados é fictícia e local (demo-review.js).
    if 'id="cj-menu-ganhos"' not in markup:
        sys.exit('erro: item de menu Ganhos ausente no markup')
    if 'apiFetch' in markup or '/api/medico/ganhos' in markup:
        sys.exit('erro: referência à API de ganhos no markup da demo')

    # Nenhum script inline pode sobrar.
    if re.search(r'<script\b', markup, flags=re.I):
        sys.exit('erro: o markup copiado contém <script>')

    # Textos de interface com nomes reais -> genéricos.
    markup = markup.replace('Nestes horários, Mariana e Gustavo recebem', 'Nestes horários, os médicos prioritários recebem')

    html = TEMPLATE.replace('{{MARKUP}}', markup.strip())
    open(SAIDA, 'w', encoding='utf-8').write(html)
    print('demo-review.html gerado (%d bytes)' % len(html))


TEMPLATE = r'''<!doctype html>
<!-- ARQUIVO GERADO por scripts/build_demo_review.py — não editar à mão.
     Demonstração visual do painel médico com DADOS 100% FICTÍCIOS.
     Sem API, sem login real, sem Memed, sem armazenamento local. -->
<html lang="pt-BR" data-cj-theme-storage="off">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="robots" content="noindex,nofollow"/>
<meta http-equiv="Content-Security-Policy" content="connect-src 'none'; form-action 'none'; frame-src 'self'; object-src 'none'; base-uri 'none'">
<title>Demo de revisão · Painel médico · ConsultaJá24h</title>
<script>
  // Tema inicial pela URL (?tema=light|dark); sem localStorage.
  (function(){var t=new URLSearchParams(location.search).get('tema');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme-initial',t);})();
</script>
<link rel="stylesheet" href="panel-base.css">
<link rel="stylesheet" href="panel-experience-v3.css">
<link rel="stylesheet" href="panel-ds-v5.css">
<link rel="stylesheet" href="panel-v6.css">
<script src="panel-theme.js"></script>
<script src="panel-v6.js" defer></script>
<style>
  /* Barra de revisão (exclusiva da demo) */
  .demo-bar{position:fixed;left:16px;bottom:16px;z-index:9000;display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:center;
    max-width:min(980px,calc(100vw - 32px));padding:8px 10px;border-radius:18px;background:#07100f;color:#fff;border:1px solid rgba(255,255,255,.12);
    box-shadow:0 18px 50px rgba(0,0,0,.35);font:600 12px/1.2 'Manrope',system-ui,sans-serif}
  .demo-bar *{font-family:inherit}
  .demo-tag{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;background:rgba(159,210,191,.14);color:#9fd2bf;font-weight:800;letter-spacing:.02em;white-space:nowrap}
  .demo-bar label{display:inline-flex;align-items:center;gap:6px;color:rgba(255,255,255,.62)}
  .demo-bar select,.demo-bar button{height:32px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#fff;padding:0 10px;font-weight:700;font-size:12px;cursor:pointer}
  .demo-bar select option{color:#111}
  .demo-bar button[aria-pressed="true"]{background:#1b8f68;border-color:transparent}
  .demo-seg{display:inline-flex;gap:2px;padding:2px;border-radius:12px;background:rgba(255,255,255,.06)}
  .demo-seg button{border:0;background:transparent;height:28px}
  .demo-bar.is-min>:not(.demo-tag):not(#demo-recolher){display:none}
  .demo-bar.is-min{padding:5px;border-radius:999px;gap:4px}
  .demo-bar.is-min #demo-recolher{border-radius:999px}
  .demo-bar :focus-visible{outline:2px solid #9fd2bf;outline-offset:2px}
  html.demo-embed .demo-bar{display:none}
  .demo-frame{position:fixed;inset:0;z-index:9500;display:none;align-items:center;justify-content:center;background:rgba(4,10,9,.72);backdrop-filter:blur(6px)}
  .demo-frame.open{display:flex}
  .demo-phone{position:relative;width:390px;height:min(844px,calc(100vh - 60px));border-radius:42px;padding:12px;background:#111;box-shadow:0 30px 90px rgba(0,0,0,.5)}
  .demo-phone iframe{width:100%;height:100%;border:0;border-radius:32px;background:#fff}
  .demo-frame-close{position:absolute;top:18px;right:18px;height:38px;padding:0 14px;border-radius:12px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font:700 13px 'Manrope',system-ui,sans-serif;cursor:pointer}
  /* ── Áreas EXCLUSIVAS da demo (dados fictícios) ── */
  .demo-ficticio{display:inline-flex;align-items:center;gap:6px;padding:3px 9px;border-radius:999px;font-size:.68rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;
    background:var(--cj-warn-soft);color:var(--cj-warn);border:1px solid var(--cj-warn-line)}
  .demo-nota{font-size:.78rem;line-height:1.5;color:var(--cj-text-3);margin-top:12px}
  .cj-demo-prev .demo-prev-lista{list-style:none;margin:0;padding:0;display:grid;gap:6px}
  .cj-demo-prev .demo-prev-lista li{display:flex;justify-content:space-between;gap:10px;padding:9px 12px;border-radius:12px;border:1px solid var(--cj-border);background:var(--cj-surface-2);font-size:.82rem;color:var(--cj-text-2)}
  .cj-demo-prev .demo-prev-lista time{font-weight:750;color:var(--cj-text);font-variant-numeric:tabular-nums}
  .cj-demo-prev .triagem-section-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  @media(max-width:768px){.demo-bar{left:8px;right:8px;bottom:84px;gap:6px;padding:6px;max-width:none}.demo-bar.is-min{right:auto}.demo-bar label span{display:none}}
</style>
</head>
<body>
{{MARKUP}}

<div class="demo-bar is-min" id="demo-bar" role="toolbar" aria-label="Controles da demonstração">
  <span class="demo-tag">Demo · dados fictícios</span>
  <label><span>Tela</span>
    <select id="demo-tela" aria-label="Tela">
      <option value="login">Login</option>
      <option value="offline">Plantão inativo</option>
      <option value="vazia">Fila vazia</option>
      <option value="fila">Fila de pacientes</option>
      <option value="chat">Atendimento · chat</option>
      <option value="triagem">Atendimento · triagem</option>
      <option value="avaliacao">Avaliação clínica</option>
      <option value="prontuario">Prontuário</option>
      <option value="multi">Dois atendimentos</option>
      <option value="historico">Histórico</option>
      <option value="renovacoes">Renovações e admin</option>
    </select>
  </label>
  <label><span>Modal</span>
    <select id="demo-modal" aria-label="Abrir modal">
      <option value="">Abrir…</option>
      <option value="preview">Triagem da fila</option>
      <option value="encerrar">Encerrar atendimento</option>
      <option value="editar">Editar paciente</option>
      <option value="regulatorios">Dados de prescrição</option>
      <option value="chathist">Chat da consulta</option>
      <option value="senha">Troca de senha</option>
      <option value="menu">Menu de status / plantão</option>
      <option value="ganhos">Ganhos (fictício)</option>
      <option value="ganhos404">Ganhos · indisponível (404)</option>
      <option value="manual">Atendimento manual (admin)</option>
      <option value="turnos">Turnos prioritários (admin)</option>
    </select>
  </label>
  <span class="demo-seg" role="group" aria-label="Perfil">
    <button type="button" data-demo-perfil="medico" aria-pressed="true">Médico</button>
    <button type="button" data-demo-perfil="admin" aria-pressed="false">Admin</button>
  </span>
  <button type="button" id="demo-tema">Alternar tema</button>
  <button type="button" id="demo-mobile">Ver em mobile</button>
  <button type="button" id="demo-recolher" aria-expanded="false" title="Mostrar/ocultar controles">Controles</button>
</div>

<div class="demo-frame" id="demo-frame" role="dialog" aria-label="Pré-visualização mobile (390 × 844)">
  <button type="button" class="demo-frame-close" onclick="fecharFrameMobile()">Fechar mobile</button>
  <div class="demo-phone"><iframe id="demo-frame-iframe" title="Painel em 390 × 844" src="about:blank"></iframe></div>
</div>

<script src="demo-review.js"></script>
</body>
</html>
'''

if __name__ == '__main__':
    main()
