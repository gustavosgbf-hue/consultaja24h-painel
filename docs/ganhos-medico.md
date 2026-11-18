# Painel médico — Ganhos ($) · integração real (somente leitura)

Status: **implementado no frontend, deploy BLOQUEADO** até o backend estar em produção.

## ⛔ Bloqueio de deploy

Não publicar este frontend antes de:

1. `triagem-api` branch `feat/medico-ganhos-backend` (commit `10deba7`, rota `GET /api/medico/ganhos` sob `checkMedico`)
   estar **mergeada e publicada** em `https://triagem-api.onrender.com`;
2. validar em produção, com um login médico real, que `GET /api/medico/ganhos` responde `200` com o contrato abaixo
   (e `403` para tokens que não são de médico).

Se o frontend for publicado antes, o modal **não quebra**: mostra "Ganhos indisponíveis no momento" sem nenhum valor
(o 404 HTML do Express vira `{}` em `safeJson`). Mesmo assim, o item ficaria visível e inútil para os médicos — por isso o bloqueio.

## Fluxo

- Menu de status → **$ Ganhos** (`#cj-menu-ganhos`, agora habilitado, `aria-haspopup="dialog"`).
- `panel-v6.js` cria o modal (`#cj-ganhos`, classe `.modal-overlay` → fica acima do PiP e o PiP some enquanto aberto).
- A fonte de dados é `window.cjGanhosFonte`, definida no `index.html` como `apiFetch('/api/medico/ganhos')`.
  **Só é chamada por ação explícita**: clique em "Ganhos" ou em "Atualizar/Tentar novamente". Nada no carregamento, nada em polling.
- Fechamento: Esc, botão X, botão Fechar ou clique no fundo; o foco volta ao botão de status. Tab fica preso no diálogo.

## Contrato consumido (ver `triagem-api/medico-ganhos.js`, `montarResumoGanhos`)

Campos usados: `ok === true`, `natureza === 'estimativa'`, `moeda === 'BRL'`, `periodo.inicio`, `hoje.{atendimentos,valor_centavos}`,
`total.{atendimentos,valor_centavos}`, `quinzenas[].{inicio,fim,atendimentos,valor_centavos,data_pagamento}`,
`nao_contabilizados.total`, `atualizado_em`. Qualquer desvio do contrato ⇒ estado "indisponível" (nunca "R$ 0,00" enganoso).

## Regras de exibição

- Valores em BRL formatados a partir dos **centavos inteiros do backend** — o frontend não multiplica, não arredonda, não recalcula.
- **Nunca** exibe percentual, faixa, fórmula, valor por atendimento, dados de outros médicos ou de pacientes
  (`valor_por_atendimento_centavos` e `nao_contabilizados.motivos` são ignorados de propósito).
- Tudo é rotulado como **estimativa**; situação "A receber"; pagamento **"data a definir"** (regra quinzenal conhecida:
  1–15 e 16–fim do mês; dia de pagamento ainda não definido). Não há registro de repasse efetuado — nada é mostrado como pago.
- Quando o backend passar a enviar `data_pagamento`, a quinzena mostra "Pagamento dd/mm/aaaa" automaticamente.

## Demo

`demo-review.html` usa a mesma UI com fonte local fictícia (`demo-review.js`, sem rede; CSP `connect-src 'none'`):
médico da regra padrão, 16/11: 9 atendimentos, 17/11 (hoje): 7 → hoje R$ 244,51; acumulado 16 → R$ 558,88.
Barra da demo → Modal → "Ganhos (fictício)" ou "Ganhos · indisponível (404)".

## Verificação

- `node --check panel-v6.js demo-review.js scripts/test_painel_v6.mjs`
- `python3 scripts/check_invariants.py` (baseline permite **apenas** `apiFetch('/api/medico/ganhos')`, 1 ocorrência)
- `PW=…/node_modules/playwright node scripts/test_painel_v6.mjs [pasta_prints]` — rota mockada localmente (404 e 200).
