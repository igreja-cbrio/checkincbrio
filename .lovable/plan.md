

# Plano: Sincronização Histórica do Planning Center

## Objetivo

Criar uma edge function dedicada para importar dados históricos de um período específico do Planning Center (ex: janeiro a outubro de 2025), populando as tabelas `services` e `schedules` com os dados passados.

## Como Funciona

1. Nova edge function `sync-planning-center-historical` que aceita parâmetros `start_date` e `end_date`
2. Usa o filtro `?filter=after&after=2025-01-01&before=2025-10-31` da API do Planning Center para buscar planos no período
3. Processa os planos da mesma forma que a sync atual (upsert em `services` e `schedules`, gera QR codes)
4. Um botão na página Admin dispara a sincronização com seletor de período

## Arquivos a Criar/Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/sync-planning-center-historical/index.ts` | **Novo** - Edge function que busca planos por período usando paginação completa |
| `src/pages/AdminPage.tsx` | Adicionar seção "Sincronização Histórica" com seletor de datas e botão de executar |
| `supabase/config.toml` | Adicionar config para a nova function |

## Detalhes Técnicos

### API do Planning Center - Filtros de Data

A API suporta filtrar planos por data:
```
GET /services/v2/service_types/{id}/plans?filter=after&after=2025-01-01&filter=before&before=2025-10-31&per_page=25&order=sort_date
```

### Edge Function

- Reutiliza a mesma lógica de `fetchWithRetry`, `fetchAllTeamMembers`, status mapping e deduplicação da sync atual
- Recebe `{ startDate: "2025-01-01", endDate: "2025-10-31" }` no body
- Pagina todos os planos do período (pode ser centenas)
- Progresso logado para acompanhamento

### UI na Admin Page

- Dois inputs de data (início e fim)
- Botão "Sincronizar Período"
- Indicador de progresso e resultado (X serviços, Y escalas importadas)

### Observações

- A operação pode demorar alguns minutos dependendo do volume de dados
- Usa upsert, então é seguro rodar múltiplas vezes sem duplicar dados
- Os dados importados ficam imediatamente disponíveis no Termômetro e outros relatórios

