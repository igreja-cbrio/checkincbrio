

# Plano: Consolidar equipes duplicadas no filtro

## Problema

O campo `team_name` na tabela `schedules` armazena nomes concatenados (ex: "Batismo, Oferta 8:30, Oferta 11:30"). O hook `useTeams` trata cada combinação como uma equipe separada, gerando duplicatas no dropdown.

## Correção

### `src/hooks/useTeams.ts`

Ao invés de tratar cada `team_name` como um valor único, splittar por vírgula e extrair os nomes individuais:

```typescript
const allTeamNames = data
  ?.flatMap(s => (s.team_name || '').split(',').map(t => t.trim()))
  .filter(Boolean) as string[];

const uniqueTeams = [...new Set(allTeamNames)].sort();
```

Isso transforma "Batismo, Oferta 8:30, Oferta 11:30" em 3 equipes separadas: "Batismo", "Oferta 8:30", "Oferta 11:30".

### Filtro nos hooks de relatório

Atualizar as queries que filtram por `team_name` para usar `ilike` ao invés de `eq`, pois agora o usuário seleciona "Batismo" e precisa encontrar registros onde `team_name` contém "Batismo" (seja sozinho ou concatenado):

```typescript
// De:
.eq('team_name', teamFilter)
// Para:
.ilike('team_name', `%${teamFilter}%`)
```

Arquivos a verificar/atualizar com essa mudança de filtro:
- `src/hooks/useReports.ts`
- `src/hooks/useWeeklyReport.ts`
- `src/hooks/useVolunteerThermometer.ts`
- `src/hooks/useInactiveVolunteers.ts`
- `src/hooks/useServiceCheckIns.ts`
- Qualquer outro hook que filtre por `team_name`

