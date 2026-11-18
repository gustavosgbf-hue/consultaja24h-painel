#!/usr/bin/env python3
"""Compara invariantes do index.html entre uma revisão git (padrão: painel-redesign-v5-deep)
e o arquivo de trabalho atual.

Invariantes verificados:
  - chamadas apiFetch(...) e fetch(...) (endpoints; permite apenas as NOVAS listadas em
    PERMITIDOS_NOVOS['api'], com a contagem exata — nenhuma pode ser removida)
  - declarações de função JS
  - IDs de elementos (permite apenas IDs NOVOS listados em PERMITIDOS_NOVOS)
  - handlers on*="..." (multiconjunto; permite apenas os NOVOS listados)
  - <script src> e <link rel=stylesheet> (permite apenas os NOVOS listados)
  - textos de .dc-text / #rg-status / #cg-docs (lidos pelo prontuário e encerramento)

Uso: python3 scripts/check_invariants.py [revisao_base]
Sai com código 1 se algo foi removido/alterado.
"""
import collections
import os
import re
import subprocess
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = sys.argv[1] if len(sys.argv) > 1 else 'painel-redesign-v5-deep'

PERMITIDOS_NOVOS = {
    'ids': {'memed-container-experimental','memed-modal-fechar','memed-modal-janela','memed-modal-topo','memed-pip-grip','memed-pip-min','memed-pip-resize','memed-pip-toggle', 'cj-status-menu', 'cj-status-btn', 'cj-status-pop', 'cj-menu-ganhos', 'cj-theme-slot-nav', 'cj-notify-close', 'cj-notify-enabled', 'cj-notify-fila', 'cj-notify-live-dot', 'cj-notify-mensagens', 'cj-notify-pop', 'cj-notify-status', 'cj-notify-trigger', 'cj-notify-wrap'},
    'handlers': {"if(event.key==='Enter'||event.key===' '){event.preventDefault();abrirHistoricoAtendimento(${Number(a.id)||0})}"},
    # GET somente leitura, disparado apenas por clique explícito em "$ Ganhos" (window.cjGanhosFonte).
    # Depende de triagem-api feat/medico-ganhos-backend publicado em produção (ver docs/ganhos-medico.md).
    'api': collections.Counter({"'/api/medico/ganhos'": 1, "path": 1, "'/api/web-push/public-key'": 1, "'/api/admin/medicos/repasses?periodo='+encodeURIComponent(periodo": 1, "'/api/admin/medicos/repasses/confirmar'": 1}),
    'fetch': collections.Counter(),
    # v16: camada visual (abas compactas, ocultar só na barra, composer). Sem rede, sem novos IDs/handlers no HTML.
    'assets': {'/panel-memed-floating.css?v=1', '/panel-v6.css?v=1', '/panel-v6.js?v=1', '/panel-repasses-admin.js?v=1', '/panel-ui-v16.css?v=1', '/panel-ui-v16.js?v=1', '/panel-motion-v17.css?v=1', '/panel-notify-v1.css?v=1', '/panel-notify-v1.js?v=1'},
}


def ler_base():
    return subprocess.check_output(['git', 'show', BASE + ':index.html'], cwd=RAIZ).decode('utf-8')


def extrair(s):
    scripts = '\n'.join(re.findall(r'<script\b[^>]*>(.*?)</script>', s, flags=re.S))
    return {
        'api': collections.Counter(re.findall(r'apiFetch\(\s*([^,)]+)', scripts)),
        'fetch': collections.Counter(re.findall(r'\bfetch\(\s*([^,)]+)', scripts)),
        'funcoes': collections.Counter(re.findall(r'\bfunction\s+([A-Za-z_$][\w$]*)', scripts)),
        'ids': set(re.findall(r'\sid="([^"]+)"', s)),
        'handlers': collections.Counter(re.findall(r'\son[a-z]+="([^"]*)"', s)),
        'assets': set(re.findall(r'<script[^>]+src="([^"]+)"', s)) | set(re.findall(r'<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"', s)),
        'rotulos': re.findall(r'<span class="dc-text">([^<]*)</span>', s)
                   + re.findall(r'<span class="radio-text">([^<]*)</span>', s)
                   + re.findall(r'<div class="check-opt"[^>]*>([^<]*)</div>', s),
    }


def main():
    a = extrair(ler_base())
    b = extrair(open(os.path.join(RAIZ, 'index.html'), encoding='utf-8').read())
    erros = []
    # Novas rotinas exclusivamente da Memed já presentes na main em produção.
    funcoes_memed = {'memedTesteDesktop','prepararMemedTeste','inicializarInteracaoJanelaMemed', 'iniciar', 'mover','terminar', 'ajustarMemedOrientacao','alternarMemedPip','recolherMemedPip','restaurarMemedPip'}
    for k in ('api', 'fetch', 'funcoes'):
        permitidos = PERMITIDOS_NOVOS.get(k, collections.Counter())
        removidos = a[k] - b[k]
        adicionados = b[k] - a[k]
        nao_aut = adicionados - (permitidos | collections.Counter({f: 1 for f in funcoes_memed}) if k=='funcoes' else permitidos)
        # Substituição intencional e auditada: remove o banner push legado que
        # reativava assinaturas sem a escolha explícita do médico.
        if k == 'funcoes':
            for fn in ('cjDocB64ToU8','cjDocPushBar','cjDocPodePush','cjDocAtualizarPushUI','cjRegistrarPushMedico','cjAtivarPushMedico'):
                removidos.pop(fn, None)
        elif k == 'fetch':
            for fn in ("API+'/api/web-push/public-key'","API+'/api/web-push/chat-subscribe'"):
                removidos.pop(fn, None)
        if removidos or nao_aut:
            erros.append('%s alterado: removidos=%s adicionados não autorizados=%s' % (k, dict(removidos), dict(nao_aut)))
        # Uma chamada nova autorizada não pode aparecer mais vezes que o permitido.
        for chave, n in permitidos.items():
            if b[k][chave] > a[k][chave] + n:
                erros.append('%s: %s excede o limite autorizado (%d)' % (k, chave, n))
    falt = a['ids'] - b['ids']
    novos = b['ids'] - a['ids'] - PERMITIDOS_NOVOS['ids']
    if falt: erros.append('IDs removidos: %s' % sorted(falt))
    if novos: erros.append('IDs novos não autorizados: %s' % sorted(novos))
    rem_h = a['handlers'] - b['handlers']
    add_h = set((b['handlers'] - a['handlers']).keys()) - PERMITIDOS_NOVOS['handlers']
    # As duas ações antigas de 'entrar em plantão' foram removidas da interface por decisão explícita do proprietário.
    rem_h.pop('togglePlantao()', None)
    # Agendamentos não fazem parte do fluxo imediato; seção visual removida a pedido,
    # preservando IDs legados e rotinas sem alterar endpoints.
    rem_h.pop('toggleAgendamentos()', None)
    rem_h.pop('cjAtivarPushMedico()', None)
    if rem_h: erros.append('handlers removidos: %s' % dict(rem_h))
    if add_h: erros.append('handlers novos não autorizados: %s' % sorted(add_h))
    sem_v = lambda xs: {x.split('?')[0] for x in xs}
    rem_as = sem_v(a['assets']) - sem_v(b['assets'])
    add_as = sem_v(b['assets']) - sem_v(a['assets']) - sem_v(PERMITIDOS_NOVOS['assets'])
    if rem_as: erros.append('assets removidos: %s' % sorted(rem_as))
    if add_as: erros.append('assets novos não autorizados: %s' % sorted(add_as))
    if a['rotulos'] != b['rotulos']:
        erros.append('rótulos de documentos/status alterados: %s -> %s' % (a['rotulos'], b['rotulos']))
    print('base=%s  endpoints apiFetch=%d  funções=%d  ids=%d  handlers=%d' % (
        BASE, sum(b['api'].values()), len(b['funcoes']), len(b['ids']), sum(b['handlers'].values())))
    if erros:
        print('FALHOU:\n  - ' + '\n  - '.join(erros))
        sys.exit(1)
    print('OK: invariantes preservados (novos IDs: %s; novas chamadas autorizadas: %s)' % (
        sorted(b['ids'] - a['ids']), dict(b['api'] - a['api'])))


if __name__ == '__main__':
    main()
