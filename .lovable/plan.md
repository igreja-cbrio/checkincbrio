

# Plano: Etiqueta para Impressora Térmica (Brother)

## Objetivo

Após o check-in de um voluntário **sem escala** (novo/treinamento), gerar automaticamente uma etiqueta formatada para impressão em impressora térmica Brother, contendo nome e identificação visual.

## Como Funciona

1. Quando um check-in **sem escala** (`isUnscheduled: true`) é realizado com sucesso, o sistema oferece a opção de imprimir uma etiqueta
2. A etiqueta é gerada como uma página HTML otimizada para impressora térmica (largura fixa ~62mm, padrão Brother QL)
3. Usa `window.print()` com CSS `@media print` para formatar corretamente
4. O líder pode também imprimir manualmente a partir de um botão na tela de check-in

## Layout da Etiqueta

```text
┌──────────────────────────┐
│     ✝ CBRIO              │
│                          │
│   JOÃO DA SILVA          │
│                          │
│   🏷️ VISITANTE / EM      │
│      TREINAMENTO         │
│                          │
│   Worship • 25/03/2026   │
└──────────────────────────┘
```

Dimensões: ~62mm x 29mm (padrão Brother QL-800)

## Arquivos a Criar/Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/checkin/LabelPrint.tsx` | **Novo** - Componente que renderiza a etiqueta e dispara impressão via iframe oculto |
| `src/pages/CheckinPage.tsx` | Adicionar estado e trigger para imprimir etiqueta após check-in sem escala |
| `src/components/checkin/UnscheduledCheckinDialog.tsx` | Adicionar checkbox "Imprimir etiqueta" no dialog de confirmação |

## Detalhes Técnicos

### Componente `LabelPrint`

- Recebe: `volunteerName`, `teamName`, `serviceName`, `date`
- Cria um iframe oculto com HTML + CSS inline otimizado para impressora térmica
- CSS `@page` com tamanho fixo (`62mm x 29mm`), sem margens
- Fonte grande e legível (bold, sans-serif)
- Badge "EM TREINAMENTO" ou "VISITANTE" destacado
- Chama `iframe.contentWindow.print()` automaticamente
- Remove o iframe após impressão

### Fluxo no CheckinPage

1. Voluntário sem escala faz check-in (QR, facial ou manual)
2. Dialog de confirmação aparece com checkbox "Imprimir etiqueta de identificação"
3. Ao confirmar, se checkbox marcado, chama `printLabel()` com os dados do voluntário
4. A impressão é disparada via o componente `LabelPrint`

### Configuração da Impressora

- O usuário configura a impressora térmica Brother como impressora padrão no sistema operacional
- O CSS `@page` garante o tamanho correto da etiqueta
- Funciona com modelos Brother QL-800, QL-810W, QL-820NWB e similares

