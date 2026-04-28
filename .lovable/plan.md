# Plano: Termômetro — nova lógica de inativo, filtro de status e cards clicáveis

## Mudanças solicitadas

1. **Inativo = quem nunca fez check-in dentro do período selecionado** (mesmo se foi escalado).
2. **Filtro de status** (Muito Ativo, Regular, Pouco Ativo, Inativo) acima da lista.
3. **Cards do topo viram botões**: clicar em "Inativo" filtra a lista para mostrar só os inativos.

## Lógica nova de classificação

Hoje a classificação usa `total_schedules` (escalas) e marca como inativo quem teve última atividade antes de um cutoff fixo de 2 meses. Vai virar:

- Base de comparação passa a ser **`total_checkins`** (não escalas).
- **Inativo**: `total_checkins === 0` no período.
- **Pouco Ativo**: `total_checkins` entre 1 e `lowThreshold` (1 por mês escalado).
- **Regular**: até `regularThreshold` (4 por mês).
- **Muito Ativo**: acima disso.

Os thresholds continuam escalando proporcionalmente ao tamanho do período (`factor = periodDays / 30`).

A barra de progresso e o "X/Y escalas" na lista são mantidos como info contextual, mas a classificação não depende mais do total de escalas.

## UI: filtro de status + cards clicáveis

**`VolunteerThermometer.tsx`**:
- Adicionar `useState<ActivityLevel | 'all'>('all')` para o filtro selecionado.
- Cards do topo viram `<button>` com `onClick` que alterna o filtro:
  - clicar em "Inativo" → filtra Inativos
  - clicar de novo no mesmo card → volta para "Todos"
  - card ativo ganha um `ring-2 ring-primary` para indicar seleção
- Acima da lista de voluntários, adicionar um `ToggleGroup` com 5 opções: Todos, Muito Ativo, Regular, Pouco Ativo, Inativo (sincronizado com o estado dos cards).
- A lista renderiza `data.volunteers.filter(v => filter === 'all' || v.level === filter)`.
- O título "Voluntários (N)" reflete a contagem filtrada, com indicação se há filtro ativo (ex.: `Voluntários (12 de 145) — Inativos`).
- Botão "Limpar filtro" aparece quando filtro != 'all'.

## Arquivos alterados

1. **`src/hooks/useVolunteerThermometer.ts`** — reescrever `classifyVolunteers` para usar check-ins; remover o parâmetro `inactiveCutoff` (não é mais usado); remover `subMonths` import se ficar sem uso; remover a passagem de `inactiveCutoff` no `useQuery`.
2. **`src/components/reports/VolunteerThermometer.tsx`** — adicionar estado de filtro, transformar cards em botões clicáveis com destaque visual, adicionar `ToggleGroup` acima da lista, filtrar voluntários renderizados, atualizar título com contagem filtrada e botão "Limpar".

## Resultado

- Aba **Termômetro** com filtro "1 mês": quem foi escalado mas não compareceu nenhuma vez aparece como **Inativo**.
- Líder clica no card vermelho "Inativo" → lista filtra para mostrar só esses voluntários.
- Pode também usar o ToggleGroup em cima da lista para alternar entre os 4 status + Todos.
- Cards do topo destacam visualmente qual filtro está ativo.
