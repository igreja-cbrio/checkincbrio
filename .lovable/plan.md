# Plano: Permitir check-in até 24 horas após o culto

## Problema

Hoje, a página de Check-in (`/checkin`) e o Totem facial (`/face-checkin`) usam o hook `useTodaysServices`, que filtra **apenas cultos do dia atual** (00:00 até 23:59 de hoje). Resultado: assim que o relógio vira meia-noite, o culto da noite anterior some do seletor e ninguém consegue registrar check-in retroativo.

A solicitação é manter os cultos disponíveis para check-in até **24 horas após** o horário do culto.

## Solução

Criar um novo hook `useCheckinEligibleServices` em `src/hooks/useServices.ts` que retorna cultos cujo `scheduled_at` esteja entre **24h atrás** e **o fim do dia atual** (cultos futuros do dia continuam aparecendo normalmente).

Trocar o uso de `useTodaysServices` para `useCheckinEligibleServices` apenas nas duas telas de check-in. O Dashboard continua usando `useTodaysServices` (lá o sentido é literalmente "cultos de hoje").

## Detalhes técnicos

**1. `src/hooks/useServices.ts`** — adicionar hook novo (sem mexer no existente):

```ts
export function useCheckinEligibleServices() {
  const now = new Date();
  const lowerBound = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  return useQuery({
    queryKey: ['services', 'checkin-eligible'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .gte('scheduled_at', lowerBound)
        .lt('scheduled_at', endOfToday)
        .order('scheduled_at', { ascending: true });
      if (error) throw error;
      return data as Service[];
    },
    refetchInterval: 5 * 60 * 1000, // re-checa a cada 5min para a janela deslizar
  });
}
```

**2. `src/pages/CheckinPage.tsx`** — trocar `useTodaysServices` por `useCheckinEligibleServices`. Ajustar:
- Mensagem "Nenhum culto hoje" → "Nenhum culto disponível para check-in"
- No `SelectItem`, mostrar a data + hora quando o culto for de ontem (ex.: `25/04 19:00`), e só `HH:mm` quando for de hoje, para o líder distinguir.

**3. `src/pages/FaceCheckinKioskPage.tsx`** — mesma troca de hook e mesma melhoria de label nos itens do select.

**4. Dashboard** — **não muda nada**. Continua usando `useTodaysServices` (faz sentido como visão "cultos de hoje").

## Resultado

- Após o culto das 19:00 de domingo, o líder consegue lançar check-in pelos próximos 24h (até 19:00 de segunda).
- Cultos do dia atual continuam aparecendo normalmente, antes e depois do horário.
- A janela "desliza" automaticamente: a cada 5 minutos o hook revalida e um culto que passou das 24h sai da lista sem precisar dar refresh.
- Dashboard preserva o comportamento atual.
