
# Plano: Histórico de Check-in por Culto + Correção da Sincronização

## Problema Identificado

Analisando os logs e o banco de dados, identifiquei dois problemas principais:

### 1. Sincronização Incompleta
"Dudu Bernardo" está escalado no Planning Center para "Quarta Com Deus" mas não aparece no sistema. A causa raiz é um **erro de duplicação durante o upsert**:

```
ON CONFLICT DO UPDATE command cannot affect row a second time
```

**O que está acontecendo:**
- Quando um voluntário tem múltiplas posições no mesmo culto (ex: "Baixo" + outro time), a API retorna múltiplos registros
- O código atual faz deduplicação em memória, mas quando a escala já existe no banco de dados, o primeiro upsert atualiza a linha
- Se o segundo registro tenta ser inserido na mesma transação batch, o PostgreSQL rejeita porque a linha já foi tocada
- Isso faz com que toda a escala do culto falhe silenciosamente

### 2. Falta de Histórico por Culto
Atualmente o sistema tem histórico por voluntário, mas não há uma visão de "quem fez check-in em cada culto" para análise posterior.

---

## Solução Proposta

### Parte 1: Correção da Sincronização

**Mudança na Edge Function `sync-planning-center/index.ts`:**

1. **Coletar todos os membros antes de processar**
   - Em vez de fazer upsert individual durante a iteração, acumular todos os registros
   
2. **Deduplicar corretamente antes do upsert**
   - Usar Map com chave `${service_id}_${person_id}` para garantir unicidade
   - Mesclar informações de múltiplas posições (concatenar team_names se necessário)

3. **Processar um por um com tratamento de erro individual**
   - Fazer upserts individuais (não em batch) para evitar o erro 21000
   - Se um falhar, continuar com os outros
   - Logar erros específicos para diagnóstico

4. **Aplicar as mesmas correções na versão automática**

```text
Fluxo Corrigido:
1. Buscar team_members do plano (com paginação)
2. Acumular TODOS em um Map (key = service_id + person_id)
3. Para cada membro no Map:
   ├── Tentar upsert individual
   ├── Se sucesso: contabilizar
   └── Se erro: logar e continuar
4. Resultado: todos os voluntários únicos são salvos
```

### Parte 2: Histórico de Check-in por Culto

**Criar nova página de detalhes do culto com lista de check-ins:**

| Componente | Descrição |
|------------|-----------|
| `src/hooks/useServiceCheckIns.ts` | Hook para buscar todos os check-ins de um serviço específico |
| `src/pages/ServiceCheckInHistoryPage.tsx` | Nova página mostrando lista de voluntários escalados e seus status de check-in |
| `src/components/reports/ServiceCheckInList.tsx` | Componente que exibe a lista de check-ins com filtros |

**Funcionalidades:**
- Ver todos os escalados do culto
- Ver quem fez check-in vs quem não fez
- Filtrar por equipe (team)
- Ver horário do check-in e método (QR/Manual/Facial)
- Link do relatório "Por Culto" para esta página detalhada

**Estrutura da página:**
```text
/service/:serviceId/checkins

┌─────────────────────────────────────────┐
│ Quarta Com Deus - 28/01 20:00           │
│ 12/33 check-ins (36%)                   │
├─────────────────────────────────────────┤
│ [Filtro: Todas Equipes ▼]               │
├─────────────────────────────────────────┤
│ ✅ João Silva     - Vocal      - 19:45  │
│ ✅ Maria Santos   - Baixo      - 19:50  │
│ ⏳ Pedro Costa    - Teclado    - --:--  │
│ ✅ Ana Oliveira   - Recepção   - 19:55  │
│ ⏳ Dudu Bernardo  - Baixo      - --:--  │
│ ...                                      │
└─────────────────────────────────────────┘
```

---

## Arquivos a Criar/Modificar

| Tipo | Arquivo | Alteração |
|------|---------|-----------|
| Modificar | `supabase/functions/sync-planning-center/index.ts` | Corrigir lógica de upsert |
| Modificar | `supabase/functions/sync-planning-center-auto/index.ts` | Aplicar mesmas correções |
| Criar | `src/hooks/useServiceCheckIns.ts` | Hook para buscar check-ins por serviço |
| Criar | `src/pages/ServiceCheckInHistoryPage.tsx` | Página de histórico de check-ins do culto |
| Criar | `src/components/reports/ServiceCheckInList.tsx` | Componente de lista |
| Modificar | `src/App.tsx` | Adicionar nova rota |
| Modificar | `src/pages/ReportsPage.tsx` | Adicionar link para página de detalhes do culto |
| Modificar | `src/pages/CheckinPage.tsx` | Adicionar link para ver histórico do culto selecionado |

---

## Detalhes Técnicos

### Hook useServiceCheckIns

```text
useServiceCheckIns(serviceId: string)
  ├── Buscar service (nome, data)
  ├── Buscar todos os schedules do service
  │   ├── volunteer_name
  │   ├── team_name
  │   ├── confirmation_status
  │   └── check_in (se existe)
  └── Retornar lista ordenada por team_name, depois nome
```

### Estrutura de Dados

```text
ServiceCheckInItem {
  scheduleId: string
  volunteerName: string
  teamName: string | null
  confirmationStatus: string
  checkedIn: boolean
  checkInTime: string | null
  checkInMethod: 'qr_code' | 'manual' | 'facial' | null
}

ServiceCheckInSummary {
  serviceName: string
  scheduledAt: string
  totalScheduled: number
  totalCheckedIn: number
  attendanceRate: number
  items: ServiceCheckInItem[]
}
```

---

## Resultado Esperado

1. **Sincronização**: Todos os voluntários escalados no Planning Center aparecerão corretamente no sistema, independente de quantas posições tenham
2. **Histórico por Culto**: Líderes poderão acessar uma visão detalhada de cada culto para análise de presença
3. **Navegação**: Links do relatório "Por Culto" e da página de Check-in levarão à nova página de histórico
