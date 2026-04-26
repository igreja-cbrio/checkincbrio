# Plano: Trazer todos os cultos do domingo para a tela inicial

## Problema

Hoje (domingo) só aparecem 4 cultos no painel: CBKIDS Manhã (08:30), Domingo - Manhã (08:30), CBKIDS Noite (19:00) e Domingo - Noite (19:00). Mas a igreja tem mais cultos no domingo (ex: o culto da manhã às 10:30 e/ou outros horários) que não estão sendo exibidos.

## Causa raiz

Duas coisas combinadas:

1. **Constraint de deduplicação errada.** Na correção anterior (para evitar cultos duplicados), foi criada uma constraint UNIQUE em `(service_type_name, scheduled_at)` na tabela `services`, e a sincronização usa `onConflict: 'service_type_name,scheduled_at'`. Isso é correto para evitar duplicatas, **mas** impede que dois planos legítimos do mesmo `service_type_name` (ex: "Domingo - Manhã" às 08:30 e às 10:30) coexistam quando deveriam — se cair a mesma chave por qualquer motivo, um sobrescreve o outro. O problema **real** é que cultos como "Domingo - Manhã 10:30" provavelmente nunca foram criados porque a migração de merge anterior os mesclou ao culto de 08:30, ou o sync não está pegando todos os planos.

2. **Sincronização parada há 2 dias.** A última `sync_logs` é de 24/04 às 16:37. O cron job está ativo (`*/30 * * * *`) mas a função `sync-planning-center-auto` aparentemente não está rodando ou falhando silenciosamente — não há log de erro registrado, mas também nenhum log de sucesso recente.

## Solução

### 1. Investigar o sync automático
- Ler logs da edge function `sync-planning-center-auto` das últimas 48h para descobrir por que parou.
- Se houver erro, corrigir.

### 2. Rodar sincronização manual completa
- Disparar a sync principal para puxar todos os planos atuais do Planning Center (futuros + 7 dias passados), garantindo que cultos do domingo de hoje cheguem ao banco.

### 3. Corrigir a constraint de deduplicação
A constraint atual `(service_type_name, scheduled_at)` é apropriada para impedir duplicatas, mas o problema é se o Planning Center tem dois planos diferentes do mesmo tipo no mesmo horário (raro). O risco real está em cultos como "Domingo Manhã 10:30" terem sido descartados na migração de merge porque foram considerados duplicatas de "Domingo Manhã 08:30" (não devem ter sido — horários diferentes).

Após o sync manual, conferir no banco se todos os horários esperados estão presentes. Se ainda faltar algum, investigar caso a caso comparando com o Planning Center.

### 4. Garantir que o cron job continue rodando
- Verificar se o `pg_cron` está executando.
- Validar a última execução via `cron.job_run_details`.

## Resultado esperado

- Todos os cultos do domingo (manhã 08:30, manhã 10:30, noite, etc.) aparecem na lista "Cultos de Hoje".
- Sincronização automática volta a rodar a cada 30 minutos sem falhar.

## Arquivos / áreas envolvidos (técnico)

- Logs: `sync-planning-center-auto` edge function logs.
- Banco: `cron.job_run_details`, `sync_logs`, `services`.
- Edge function: `supabase/functions/sync-planning-center-auto/index.ts` (se houver erro a corrigir).
- Não deve precisar mexer em frontend — `useTodaysServices` já busca tudo do dia corretamente.
