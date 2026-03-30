

# Plano: Remover filtro duplicado da aba Inativos

## Problema

A aba "Inativos" mostra dois filtros: o `PeriodFilter` no canto superior direito (usado por todas as abas) e um dropdown interno "Inativo há pelo menos" dentro do `InactiveVolunteersTab`. O usuário quer manter apenas o filtro superior direito.

## Alterações

### 1. `src/pages/ReportsPage.tsx`

- Adicionar estado e opções de período específicas para a aba Inativos (ex: `inactivePeriod`, `inactiveCustomRange`)
- No bloco condicional do `PeriodFilter`, adicionar caso `activeTab === 'inactive'` com opções relevantes (2 meses, 3 meses, 4 meses, 6 meses, 1 ano, personalizado)
- Passar o período calculado como prop para `InactiveVolunteersTab` em vez de deixar o componente gerenciar internamente

### 2. `src/components/reports/InactiveVolunteersTab.tsx`

- Remover o estado interno `inactivityPeriod` e o dropdown `Select`
- Receber `inactivityPeriod` como prop (controlado pelo pai)
- Manter apenas o badge "X inativos" e a lista de voluntários

### 3. `src/hooks/useInactiveVolunteers.ts`

- Sem alterações necessárias — já aceita `period` como parâmetro

## Resultado

Um único filtro de período no canto superior direito, consistente com as demais abas.

