

# Plano: Termômetro de Serviço dos Voluntários

## Objetivo

Nova aba "Termômetro" na página de Relatórios que classifica visualmente cada voluntário por nível de atividade, mostrando quem serve demais, quem serve pouco e quem está ausente há muito tempo. Uma visualização tipo "gauge" com cores (vermelho/amarelo/verde/azul) para rápida identificação.

## Como Funciona

O sistema analisa os dados de `schedules` e `check_ins` no período selecionado e calcula para cada voluntário:
- **Total de escalas** no período
- **Total de check-ins** realizados
- **Frequência** (escalas por semana/mês)
- **Última atividade**

Com base nisso, classifica em 4 faixas:

```text
🔴 Inativo      - Sem escala há mais de 2 meses
🟡 Pouco ativo  - 1-2 escalas no período
🟢 Regular      - 3-5 escalas no período (média)
🔵 Muito ativo  - Acima da média (serve demais)
```

Os limiares se adaptam automaticamente ao período selecionado.

## Layout Visual

```text
┌─────────────────────────────────────────┐
│  Termômetro de Serviço                  │
│                                         │
│  🔵 12  🟢 25  🟡 8  🔴 5  ← cards     │
│                                         │
│  ┌─ Barra horizontal empilhada ───────┐ │
│  │████ ██████████████ ████ ███        │ │
│  └────────────────────────────────────┘ │
│                                         │
│  Lista de voluntários com badge de cor  │
│  e barras de progresso por frequência   │
│  ┌──────────────────────────────────┐   │
│  │ 🔵 João Silva    8 escalas  ████│   │
│  │ 🟢 Maria Santos  4 escalas  ██  │   │
│  │ 🟡 Pedro Lima    1 escala   █   │   │
│  │ 🔴 Ana Costa     0 (2m)         │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## Arquivos a Criar/Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useVolunteerThermometer.ts` | **Novo** - Hook que busca schedules + check_ins, calcula frequência e classifica cada voluntário |
| `src/components/reports/VolunteerThermometer.tsx` | **Novo** - Componente com cards de resumo, barra empilhada e lista detalhada com badges coloridos |
| `src/pages/ReportsPage.tsx` | Adicionar aba "Termômetro" nas TabsList, integrar o novo componente |

## Detalhes Técnicos

### Hook `useVolunteerThermometer`

- Reutiliza a mesma lógica de paginação de `useInactiveVolunteers` para buscar todos os schedules
- Para cada voluntário calcula: total de escalas, total de check-ins, data da última atividade, frequência média
- Classifica em faixas baseado em percentis (p75 = muito ativo, p25-p75 = regular, abaixo de p25 = pouco ativo, sem atividade recente = inativo)
- Aceita filtros de período e equipe (mesmos do relatório existente)

### Componente `VolunteerThermometer`

- 4 cards coloridos no topo com contagem por faixa
- Barra horizontal empilhada (recharts `BarChart` horizontal) mostrando proporção
- Lista scrollável de voluntários ordenados por frequência, cada um com: badge de cor, nome, total de escalas, barra de progresso relativa
- Clicável para ir ao histórico do voluntário (mesmo padrão da aba Overview)

