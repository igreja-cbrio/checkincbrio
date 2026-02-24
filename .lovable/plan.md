

# Plano: Melhorar Sincronização com Planning Center

## Problema

Pessoas que aparecem na escala do Planning Center não estão aparecendo no sistema. Após análise detalhada do código, identifiquei 4 causas potenciais:

### Causa 1: Deduplicação incorreta de voluntários com múltiplas posições
Quando um voluntário tem múltiplas posições no mesmo culto (ex: "Vocal" + "Backing Vocal"), o código atual mantém apenas a **primeira** entrada encontrada. Se a primeira entrada tem status "D" (recusado), o voluntário fica registrado como "declined" e as outras posições com status "C" (confirmado) são descartadas.

### Causa 2: Falta de busca por planos recentes/passados
O código usa `filter=future`, que pode não incluir planos de hoje dependendo do fuso horário do servidor. Cultos que acontecem hoje podem não ser sincronizados.

### Causa 3: Sem retry em caso de falha de API
Se uma chamada à API do Planning Center falhar por timeout ou rate limiting, todo o plano é ignorado silenciosamente.

### Causa 4: Nome do voluntário pode ser null
Se `member.attributes.name` for `null` ou vazio, o registro pode falhar no banco por violar `NOT NULL`.

---

## Solução Proposta

### Mudanças nas Edge Functions (ambas: manual e automática)

1. **Deduplicação inteligente com prioridade de status**
   - Quando um voluntário aparece múltiplas vezes, manter o status mais relevante (confirmado > escalado > pendente > recusado)
   - Concatenar os nomes das equipes (ex: "Vocal, Backing Vocal") para mostrar todas as posições

2. **Buscar planos passados recentes + futuros**
   - Além de `filter=future`, buscar também planos dos últimos 7 dias com `filter=past`
   - Isso garante que cultos de hoje e da semana passada sejam sincronizados

3. **Retry automático com backoff**
   - Adicionar lógica de retry (até 3 tentativas) para chamadas à API do Planning Center
   - Esperar 1s, 2s, 4s entre tentativas

4. **Logs detalhados por pessoa**
   - Logar cada voluntário processado com nome e status para facilitar debug
   - Ao final, logar a lista completa de nomes sincronizados por culto

5. **Tratamento de dados nulos**
   - Usar fallback para nome: `member.attributes.name || personData?.attributes?.first_name + ' ' + personData?.attributes?.last_name || 'Sem nome'`

---

## Detalhes Técnicos

### Nova lógica de deduplicação

```text
Prioridade de status (maior = prevalece):
  confirmed (C) = 4
  scheduled (S) = 3
  pending (U/P/N) = 2
  unknown = 1
  declined (D) = 0

Quando duplicata encontrada:
  Se novo status > status existente:
    Atualizar status
  Sempre:
    Adicionar team_name à lista de equipes
```

### Nova lógica de busca de planos

```text
Antes:
  GET /plans?filter=future&per_page=10

Depois:
  GET /plans?filter=future&per_page=10      (planos futuros)
  GET /plans?filter=past&per_page=5          (planos recentes)
  Combinar e deduplicar por plan.id
```

### Retry com backoff

```text
async function fetchWithRetry(url, headers, maxRetries = 3):
  for attempt = 1 to maxRetries:
    response = await fetch(url, headers)
    if response.ok:
      return response
    if response.status == 429 (rate limit):
      wait 2^attempt seconds
    else if response.status >= 500:
      wait attempt seconds
    else:
      break (client error, don't retry)
  return last response
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/sync-planning-center/index.ts` | Todas as melhorias acima |
| `supabase/functions/sync-planning-center-auto/index.ts` | Mesmas melhorias |

---

## Resultado Esperado

1. Voluntários com múltiplas posições aparecem com o status correto (confirmado prevalece sobre recusado)
2. Cultos de hoje e da última semana são sempre incluídos na sincronização
3. Falhas temporárias de API não causam perda de dados
4. Logs detalhados permitem identificar exatamente quem está sendo sincronizado ou não

