

# Plano: Correção da Sincronização com Planning Center

## Problema Identificado

Alguns voluntários não estão sendo sincronizados do Planning Center para o sistema. Após análise, identifiquei **4 causas principais**:

### 1. Falta de Paginação nos Team Members
- A API do Planning Center tem limite máximo de 100 registros por página (`per_page=100`)
- Se um plano tiver mais de 100 voluntários escalados, os registros além da página 1 não são sincronizados
- A resposta da API inclui links de paginação (`links.next`) que não estão sendo processados

### 2. Limite Muito Restritivo de Planos Futuros
- Atualmente o código busca apenas 3 planos futuros por tipo de serviço
- Isso pode excluir serviços programados para datas mais distantes

### 3. Processamento Incompleto de Voluntários
- Status não incluídos no filtro podem estar sendo ignorados
- Voluntários com status diferente de `C`, `U`, `D`, `S` não são processados

### 4. Log Insuficiente para Diagnóstico
- Não há visibilidade sobre quantos voluntários foram encontrados vs quantos foram sincronizados
- Difícil identificar onde ocorrem as perdas

---

## Solução Proposta

### Mudanças nas Edge Functions

**Arquivo: `supabase/functions/sync-planning-center/index.ts`**
**Arquivo: `supabase/functions/sync-planning-center-auto/index.ts`**

1. **Implementar paginação completa para team members**
   - Criar função auxiliar `fetchAllTeamMembers()` que:
     - Faz requisição inicial com `per_page=100`
     - Verifica se existe `links.next` na resposta
     - Continua buscando páginas até não haver mais `next`
     - Consolida todos os membros de todas as páginas

2. **Aumentar limite de planos futuros**
   - Alterar de 3 para 10 planos futuros por tipo de serviço
   - Isso garante melhor cobertura de serviços agendados

3. **Remover filtro de status ou torná-lo mais permissivo**
   - Aceitar qualquer status retornado pela API
   - Mapear status desconhecidos para "unknown" em vez de ignorá-los
   - Permitir inclusão de voluntários independente do status

4. **Adicionar logs detalhados**
   - Logar total de membros encontrados por página
   - Logar quantos voluntários foram processados vs ignorados
   - Logar razão de exclusão (se aplicável)

---

## Detalhes Técnicos

### Função de Paginação

```text
fetchAllTeamMembers(serviceTypeId, planId)
  ├── Buscar página 1 com per_page=100
  ├── Acumular membros em array
  ├── Verificar se existe meta.next ou links.next
  ├── Se existir, buscar próxima página (usando offset)
  ├── Repetir até não haver mais páginas
  └── Retornar array completo de membros + included persons
```

### Estrutura de Resposta Planning Center (JSON-API)
```text
{
  "data": [...team_members...],
  "included": [...person_data...],
  "meta": {
    "total_count": 150,
    "count": 100
  },
  "links": {
    "self": "...",
    "next": "...?offset=100"
  }
}
```

### Cálculo de Paginação
- Usar `offset` incrementando de 100 em 100
- Continuar enquanto `data.length > 0` ou enquanto existir `links.next`

---

## Fluxo de Sincronização Atualizado

```text
1. Buscar service_types
2. Para cada service_type:
   ├── Buscar até 10 planos futuros (per_page=10)
   └── Para cada plano:
       ├── Upsert serviço no banco
       ├── Buscar TODOS os team_members (com paginação)
       │   ├── Página 1: offset=0
       │   ├── Página 2: offset=100
       │   └── ... continua até não haver mais
       ├── Processar TODOS os membros (sem filtro de status)
       ├── Upsert schedules
       └── Coletar voluntários para QR codes
3. Gerar QR codes para todos voluntários coletados
4. Registrar log com totais detalhados
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/sync-planning-center/index.ts` | Adicionar paginação, aumentar limite de planos, melhorar logs |
| `supabase/functions/sync-planning-center-auto/index.ts` | Mesmas alterações para manter consistência |

---

## Resultado Esperado

- Todos os voluntários de todos os planos serão sincronizados
- Maior cobertura de serviços futuros (10 em vez de 3)
- Logs detalhados para diagnóstico de problemas
- Nenhum voluntário será perdido por limite de paginação

