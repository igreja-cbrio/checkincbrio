

# Plano: Correção do Histórico de Culto

## Problemas Identificados

### Problema 1: Seletor de culto "travado" no culto de hoje
Ao trocar o culto no seletor da página `/service-history`, a seleção não atualiza corretamente. A página continua mostrando os dados do primeiro culto selecionado.

**Causa raiz:** Há um bug no componente `ServiceCheckInHistoryPage.tsx` nas linhas 27-29:
```javascript
// Este código causa update durante render - anti-pattern React
if (paramServiceId && paramServiceId !== selectedServiceId) {
  setSelectedServiceId(paramServiceId);
}
```

Este padrão de atualização de estado durante a renderização pode causar comportamento inesperado. Além disso, quando o usuário muda a seleção manualmente, o `paramServiceId` da URL não muda, mas o código tenta sincronizar de forma incorreta.

### Problema 2: Botão de histórico não aparece na tela principal de check-in
O botão "Ver Histórico" existe em `CheckinPage.tsx` (linhas 209-217), mas está dentro do bloco condicional que só aparece quando um culto está selecionado:
```javascript
{selectedServiceId && (
  <div className="flex flex-col sm:flex-row gap-2">
    <Button ... >Modo Totem</Button>
    <Button ... >Ver Histórico</Button>  // Só visível após selecionar culto
  </div>
)}
```

O usuário quer que o botão de histórico esteja sempre visível para navegar à página `/service-history` mesmo sem selecionar um culto.

---

## Solução Proposta

### Correção 1: Página de Histórico de Culto

Reescrever a lógica de estado em `ServiceCheckInHistoryPage.tsx`:

1. Usar `useEffect` para sincronizar o parâmetro da URL com o estado
2. Garantir que a mudança no Select atualize corretamente o estado
3. Evitar atualizações de estado durante o render

**Lógica corrigida:**
```text
1. Inicializar selectedServiceId com paramServiceId (se existir)
2. useEffect para sincronizar quando paramServiceId mudar (navegação por URL)
3. onValueChange no Select atualiza selectedServiceId normalmente
4. React Query refaz a busca quando selectedServiceId muda
```

### Correção 2: Botão de Histórico no Check-in

Mover o botão de histórico para fora do bloco condicional em `CheckinPage.tsx`:

1. Adicionar um botão "Histórico de Cultos" na área do header, ao lado do botão "Sincronizar"
2. Este botão navega para `/service-history` sem precisar selecionar um culto antes
3. O comportamento atual do botão contextual permanece (quando culto selecionado, vai direto para o histórico daquele culto)

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/ServiceCheckInHistoryPage.tsx` | Corrigir lógica de seleção usando useEffect |
| `src/pages/CheckinPage.tsx` | Adicionar botão de histórico visível sempre |

---

## Detalhes Técnicos

### ServiceCheckInHistoryPage.tsx - Código Corrigido

```text
Antes:
- useState com paramServiceId inicial
- Condicional durante render para sincronizar

Depois:
- useState com paramServiceId inicial
- useEffect(() => { ... }, [paramServiceId]) para sincronizar
- onValueChange funciona normalmente
```

### CheckinPage.tsx - Novo Botão

Adicionar um botão de acesso ao histórico na barra superior, junto ao botão de sincronização:

```text
Layout atual:
┌────────────────────────────────────────┐
│ Check-in           [Sincronizar]       │
│ Registre a presença                    │
├────────────────────────────────────────┤

Layout proposto:
┌────────────────────────────────────────┐
│ Check-in      [Histórico] [Sincronizar]│
│ Registre a presença                    │
├────────────────────────────────────────┤
```

---

## Resultado Esperado

1. **Seletor de culto funcional:** Ao trocar o culto no dropdown, os dados serão recarregados corretamente para o novo culto selecionado
2. **Acesso rápido ao histórico:** Botão sempre visível na tela de check-in para navegar diretamente à página de histórico de cultos

