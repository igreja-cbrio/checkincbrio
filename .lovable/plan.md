

# Plano: Filtro de critério de inatividade + otimização de performance

## Problema

1. O usuário quer escolher se "inativo" significa sem **check-in** ou sem **escala** — atualmente só considera escalas
2. A troca de filtro demora porque cada mudança re-fetcha todos os schedules do banco (paginação de 1000 em 1000)

## Alterações

### 1. Adicionar toggle "Por Check-in / Por Escala" na aba Inativos

**`src/pages/ReportsPage.tsx`**
- Novo estado `inactivityCriteria: 'checkin' | 'schedule'` (default: `'checkin'`)
- Passar como prop para `InactiveVolunteersTab`

**`src/components/reports/InactiveVolunteersTab.tsx`**
- Receber prop `criteria: 'checkin' | 'schedule'`
- Exibir um toggle/segmented control abaixo da badge: "Por Check-in" | "Por Escala"
- Passar para o hook

### 2. Atualizar lógica no hook

**`src/hooks/useInactiveVolunteers.ts`**
- Receber parâmetro `criteria: 'checkin' | 'schedule'`
- Incluir no `queryKey` para cache separado
- Quando `criteria === 'checkin'`: `last_activity_date` baseada apenas em check-ins. Voluntários sem nenhum check-in usam a data da primeira escala
- Quando `criteria === 'schedule'`: comportamento atual (baseado em escalas)

### 3. Otimizar performance (reduzir demora)

**`src/hooks/useInactiveVolunteers.ts`**
- Adicionar `staleTime: 5 * 60 * 1000` (5 min) para evitar re-fetch desnecessário ao trocar e voltar
- Adicionar `keepPreviousData: true` (placeholderData) para manter dados antigos visíveis enquanto carrega novos
- Isso elimina o flash de loading ao trocar filtros

## Resultado

- Toggle visível na aba para escolher critério de inatividade
- "Por Check-in" mostra ~136 inativos; "Por Escala" mostra ~12
- Troca de filtros mais fluida sem tela de loading intermediária

