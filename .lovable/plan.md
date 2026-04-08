

# Plano: Corrigir impressão que mostra o dialog inteiro

## Problema

O `window.print()` esta sendo chamado enquanto o dialog (modal) do Radix UI ainda esta visivel no DOM. O CSS tenta esconder com `body > *:not(#label-print-host)`, mas os portais do Radix (overlay, conteudo do modal) sao filhos diretos do `<body>` e nao estao sendo escondidos corretamente no contexto de impressao — provavelmente porque o seletor CSS nao cobre todos os elementos do portal, ou o Chrome Android nao aplica as regras `@media print` injetadas dinamicamente a tempo.

## Solucao

Abordagem em duas partes:

### 1. TrainingRegistrationDialog.tsx — Fechar dialog ANTES de imprimir

- Separar: primeiro fechar o dialog, depois imprimir com um pequeno delay
- `onOpenChange(false)` → `setTimeout(() => printLabel(printData), 150)`
- O delay de 150ms permite que o React remova o portal do DOM antes do `window.print()`
- `window.print()` NAO requer user gesture no Android Chrome (diferente de `window.open`), entao o delay nao causa bloqueio

### 2. LabelPrint.tsx — CSS mais agressivo para esconder TUDO

- Trocar o seletor `body > *:not(#label-print-host)` por um seletor universal que esconde absolutamente tudo exceto o host:
  ```css
  body[data-label-print="active"] > * { display: none !important; }
  body[data-label-print="active"] > #label-print-host { display: block !important; }
  ```
- Tambem adicionar regra para portais Radix especificamente:
  ```css
  body[data-label-print="active"] [data-radix-portal] { display: none !important; }
  ```
- Garantir que dentro do `@media print` as mesmas regras se apliquem

## Arquivos alterados

1. **src/components/checkin/TrainingRegistrationDialog.tsx** — Delay de 150ms entre fechar dialog e chamar `printLabel`
2. **src/components/checkin/LabelPrint.tsx** — CSS de impressao mais robusto que esconde todos os filhos de body e portais Radix

