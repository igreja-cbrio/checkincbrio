

# Plano: Relatório de Voluntários Inativos

## Objetivo

Criar uma nova aba na página de Relatórios que liste voluntários que não servem há um determinado período (ex: 2, 3, 4, 6 meses), permitindo ao líder identificar quem está afastado.

## Como Funciona

A funcionalidade cruza os dados de `schedules` + `check_ins` para encontrar voluntários que têm registros no Planning Center mas cujo último check-in (ou última escala) foi há mais de X meses. O líder escolhe o período de inatividade desejado via um seletor.

## Arquivos a Criar/Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useInactiveVolunteers.ts` | **Novo** - Hook que busca voluntários inativos |
| `src/pages/ReportsPage.tsx` | Adicionar nova aba "Inativos" no Tabs |

## Detalhes Técnicos

### Hook `useInactiveVolunteers`

1. Buscar todos os voluntários únicos da tabela `schedules` (pelo `volunteer_name` e `planning_center_person_id`)
2. Para cada voluntário, encontrar a data do último check-in (via `check_ins` ligado por `schedule_id`) e a data da última escala
3. Filtrar apenas os que têm a última atividade anterior à data de corte (ex: `now() - 4 meses`)
4. Retornar: nome, última data de serviço, equipe mais recente, total de escalas, total de check-ins

### Nova aba na página de Relatórios

- Adicionar tab "Inativos" com ícone `UserX`
- Seletor de período de inatividade: 2 meses, 3 meses, 4 meses, 6 meses, 1 ano
- Filtro de equipe (já existente) se aplica também
- Lista com: nome do voluntário, última data ativa, equipe, e um link para o histórico individual
- Badge indicando há quantos meses está inativo
- Contador no topo mostrando total de inativos encontrados

### Layout da aba

```text
┌─────────────────────────────────────────────┐
│ Tabs: [Rel. Semanal] [Visão Geral] [Inativos]│
│                                               │
│ Inativo há pelo menos: [4 meses ▼]           │
│                                               │
│ 12 voluntários inativos encontrados           │
│                                               │
│ ┌───────────────────────────────────────────┐ │
│ │ João Silva          Worship    5 meses    │ │
│ │ Último: 15/10/2025                        │ │
│ │ Maria Santos        Mídia      4 meses    │ │
│ │ Último: 20/11/2025                        │ │
│ └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

## Resultado Esperado

O líder pode rapidamente identificar voluntários que pararam de servir, filtrar por equipe e período, e acessar o histórico individual de cada um para entender o contexto.

