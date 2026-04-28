# Plano: Inativos por Escala — incluir histórico antigo e janela curta (mês atual)

## Problema

Na aba **Relatórios → Voluntários Inativos** existem dois pontos a corrigir:

**1. "Por Escala" não está enxergando inativos do mês atual.**
A lógica atual considera inativo quem teve a **última escala** antes do cutoff. Resultado: alguém escalado nos últimos 2 meses, mas que não está escalado neste mês, **não aparece** — porque a última escala é recente. O filtro mais curto é "2 meses", e mesmo ele só captura quem ficou 2+ meses sem ser escalado.

O usuário quer ver, por exemplo, quem foi escalado em fevereiro/março mas **em abril (mês atual) não tem nenhuma escala**. Hoje isso é impossível.

**2. Histórico do ano passado.**
A função `fetchAllSchedules` já busca todas as escalas paginando (sem filtro de data). Verifiquei o banco: existem 674 escalas com mais de 1 ano e elas estão sendo carregadas. O problema **não é a busca** — é a lógica de classificação do item 1, que ignora pessoas com escala recente. Garantir que continue sem filtro de data resolve "ver histórico antigo".

## Solução

### A. Mudar a semântica do critério "Por Escala"

Em vez de "última escala antes do cutoff", passar a usar **"sem nenhuma escala dentro da janela [cutoff → hoje], mas com escala anterior ao cutoff"**.

Tradução prática (com filtro = "1 mês"):
- Pega todo mundo que já teve escala alguma vez.
- Remove quem tem pelo menos 1 escala nos últimos 30 dias.
- Sobra: voluntários com histórico que sumiram da escala neste mês. ✅

A `last_activity_date` exibida e os `months_inactive` continuam baseados na **última escala real** (que pode ser de meses atrás, ou de 20 dias atrás se a janela for "1 mês").

### B. Adicionar opção "1 Mês"

Novo período `'1month'` (= 30 dias) no filtro, virando o padrão para visualizar inativos do mês atual.

### C. Critério "Por Check-in" — manter mesma melhoria

Aplicar a mesma lógica: "sem check-in na janela, mas com escala/check-in anterior". Assim "1 mês por check-in" mostra quem foi escalado nos últimos meses mas não fez check-in este mês.

## Detalhes técnicos

**1. `src/hooks/useInactiveVolunteers.ts`**

- Adicionar `'1month'` ao tipo `InactivityPeriod` e ao mapa `getMonthsFromPeriod` (1).
- Mudar `cutoffDate` para usar dias quando for `1month` (`subDays(now, 30)`) — mais preciso que `subMonths(now, 1)`.
- Reescrever o bloco de classificação:
  - Acumular `last_activity_date` (último check-in para o critério checkin; última escala para o critério schedule), igual hoje.
  - **Acumular também** `has_activity_in_window` (boolean): true se o voluntário tem qualquer escala/check-in com data >= cutoffDate.
  - Voluntário entra no resultado quando: tem alguma atividade passada (last_activity existe) **E** `has_activity_in_window === false`.
- Manter o cálculo de `months_inactive` a partir da última atividade real.

**2. `src/pages/ReportsPage.tsx`**

- Adicionar `{ value: '1month', label: '1 Mês' }` no início de `inactivePeriodOptions`.
- Mudar `useState<string>('4months')` para `useState<string>('1month')` como padrão (faz mais sentido para uso operacional dos líderes).

**3. Componente `InactiveVolunteersTab.tsx`** — sem mudanças, apenas consome o hook.

## Resultado

- Filtro "1 Mês" + "Por Escala" → mostra quem tem histórico de escala mas não foi escalado neste mês.
- Filtros maiores ("3 Meses", "6 Meses", etc.) continuam funcionando, agora com a semântica correta: "sem atividade dentro da janela, com histórico anterior".
- Histórico antigo (ano passado) continua sendo carregado (já era) e agora é considerado como "atividade anterior" que qualifica a pessoa para aparecer no relatório.
