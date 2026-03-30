

# Plano: Corrigir Erro na Sincronização Histórica

## Problema Identificado

A edge function `sync-planning-center-historical` tem dois problemas:

1. **Método de autenticação inválido**: Usa `userSupabase.auth.getClaims(token)` que não é um método padrão do Supabase JS. Isso causa falha na validação do usuário, retornando 401 e gerando o erro "Failed to send a request to the Edge Function".

2. **Risco de timeout**: A função processa todos os 16 service types sequencialmente, podendo exceder o timeout de 60s para períodos longos (10 meses).

## Correções

### 1. Corrigir autenticação na edge function

Substituir `getClaims(token)` por `getUser()` no arquivo `supabase/functions/sync-planning-center-historical/index.ts`:

```typescript
// ANTES (inválido):
const { data: claimsData, error: claimsError } = await userSupabase.auth.getClaims(token);
const userId = claimsData.claims.sub;

// DEPOIS (correto):
const { data: { user }, error: userError } = await userSupabase.auth.getUser();
if (userError || !user) { return 401 }
const userId = user.id;
```

### 2. Melhorar tratamento de erro no AdminPage

Adicionar mensagem de erro mais clara no `handleHistoricalSync` para diferenciar timeout de outros erros.

### 3. Dar acesso admin ao usuário Matheus

O usuário Matheus (user_id: `12aa03be-d5ce-4714-bd94-6bbf4fc69c5c`) precisa ter a role `admin` ou `leader` para usar a sincronização histórica. Verificar se ele já tem no banco e, caso contrário, inserir via migration.

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/sync-planning-center-historical/index.ts` | Substituir `getClaims` por `getUser()` |
| `src/pages/AdminPage.tsx` | Melhorar mensagem de erro de timeout |

