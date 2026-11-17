#!/usr/bin/env python3
"""Compara invariantes do index.html entre uma revisão git (padrão: painel-redesign-v5-deep)
e o arquivo de trabalho atual.

Invariantes verificados:
  - chamadas apiFetch(...) e fetch(...) (endpoints)
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
    'ids': {'cj-status-menu', 'cj-status-btn', 'cj-status-pop', 'cj-menu-ganhos', 'cj-theme-slot-nav'},
    'handlers': set(),
    'assets': {'/panel-v6.css?v=1', '/panel-v6.js?v=1'},
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
    for k in ('api', 'fetch', 'funcoes'):
        if a[k] != b[k]:
            erros.append('%s alterado: removidos=%s adicionados=%s' % (k, dict(a[k] - b[k]), dict(b[k] - a[k])))
    falt = a['ids'] - b['ids']
    novos = b['ids'] - a['ids'] - PERMITIDOS_NOVOS['ids']
    if falt: erros.append('IDs removidos: %s' % sorted(falt))
    if novos: erros.append('IDs novos não autorizados: %s' % sorted(novos))
    rem_h = a['handlers'] - b['handlers']
    add_h = set((b['handlers'] - a['handlers']).keys()) - PERMITIDOS_NOVOS['handlers']
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
    print('OK: invariantes preservados (novos IDs: %s)' % sorted(b['ids'] - a['ids']))


if __name__ == '__main__':
    main()
