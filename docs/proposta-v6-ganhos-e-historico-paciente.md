# Painel médico v6 — proposta: Ganhos e Histórico do paciente

Status: **não implementado no sistema real**. Este documento registra a investigação de 17/11/2026 e o que falta no backend.
Na `demo-review.html` existem apenas ilustrações com dados fictícios, rotuladas como tal.

## 1. Investigação dos endpoints (triagem-api, somente leitura)

| Necessidade | Endpoint existente | Serve? | Motivo |
|---|---|---|---|
| Ganhos do médico (produtividade, a receber, data de pagamento) | nenhum para médico; só `GET /api/psicologo/saldo` (authPsicologo) e `GET /api/admin/psicologia/financeiro` (admin) | **Não** | Escopo de psicólogo/admin; não existe regra de repasse nem calendário de pagamento do médico no backend. |
| Atendimentos anteriores do paciente atual | `GET /api/historico` (checkMedico) | **Não** | Retorna só os atendimentos **do próprio médico**, com nome/CPF/telefone e prontuário; não é escopado ao paciente do atendimento. |
| Idem | `GET /api/pacientes/busca?q=` (checkMedico) | **Não (risco LGPD)** | Busca textual livre por nome/CPF/telefone em **toda a base**, retornando prontuário; não verifica vínculo do médico com um atendimento ativo. O painel atual não chama essa rota e a v6 continua sem chamá-la. |

Conclusão: nenhuma rota atende com escopo clínico adequado. Nenhum fetch novo foi adicionado ao painel.

## 2. Ganhos — proposta de contrato

`GET /api/medico/ganhos/resumo` — `checkMedico`, sempre `req.medico.id` (nunca id vindo do cliente).

```json
{ "ok": true,
  "hoje": { "atendimentos": 0, "valor_centavos": 0 },
  "periodo": { "inicio": "AAAA-MM-DD", "fim": "AAAA-MM-DD", "a_receber_centavos": 0 },
  "proximo_pagamento": "AAAA-MM-DD",
  "regra": "descrição oficial vinda do financeiro" }
```

Pré-requisitos (decisão do negócio, não da UI): valor por tipo de atendimento, tratamento de cancelados/sem resposta,
regra do calendário (quinzenal? dias fixos? dia útil?), fuso horário e quem homologa. Enquanto isso, o item **Ganhos ($)**
no menu de status fica desativado com o selo “Em breve”.

## 3. Histórico do paciente atual — proposta de contrato

`GET /api/atendimento/:id/anteriores` — `checkMedico` + verificação de vínculo:

1. O atendimento `:id` precisa estar **ativo e assumido por `req.medico.id`** (status `assumido`/em andamento); caso contrário 403.
2. A identidade do paciente é derivada **no servidor** a partir do atendimento (CPF normalizado e/ou id de paciente), nunca de parâmetro do cliente.
3. Resposta mínima (minimização LGPD):
   ```json
   { "ok": true, "anteriores": [ { "data_hora": "ISO-8601", "tipo": "chat|video" } ] }
   ```
   Sem nome do médico, sem texto de prontuário, sem contato; limite (ex.: 10 últimos) e janela temporal configurável.
4. Log de auditoria (médico, atendimento, timestamp) e rate limit.
5. Se o produto quiser mostrar resumo clínico anterior, isso exige decisão do DPO/responsável técnico e um segundo endpoint com justificativa clínica explícita.

UI pronta para receber esse endpoint: uma seção “Atendimentos anteriores” dentro de “Paciente e triagem” (ver demo, tela
“Atendimento · triagem”), listando apenas data e horário.

## 4. Itens da revisão v6 que dependem disto

- (10) Ganhos com ícone `$`: menu pronto; dados reais pendentes do endpoint acima.
- (11) Histórico de atendimentos anteriores do paciente: layout ilustrado na demo; implementação real pendente do endpoint acima.
