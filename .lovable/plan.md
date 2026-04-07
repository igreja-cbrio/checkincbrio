

# Plano: Layout horizontal da etiqueta

## Problema

O layout atual usa 29mm de largura × 90mm de altura (vertical), o que causa quebras de linha no nome porque 29mm é muito estreito para texto. O usuário quer que o texto fique na horizontal — aproveitando os 90mm de comprimento da etiqueta como largura.

## Alterações

### `src/components/checkin/LabelPrint.tsx`
- Inverter o `@page size` para `90mm 29mm` (largura 90mm × altura 29mm — paisagem)
- Ajustar `html` e `body` para `width: 90mm; height: 29mm`
- Mudar o layout do body para `flex-direction: row` com elementos lado a lado:
  - Cruz + CBRIO à esquerda
  - Nome + badge + equipe/data à direita
- Reduzir padding para caber em 29mm de altura
- Ajustar `@media print` para as mesmas dimensões

### `src/components/checkin/TrainingRegistrationDialog.tsx`
- Atualizar o `LabelPreview` para refletir o layout horizontal:
  - Largura ~340px, altura ~110px (escala proporcional)
  - Elementos lado a lado em vez de empilhados verticalmente

## Resultado

A etiqueta imprime na horizontal com o texto ao longo dos 90mm, sem quebras de linha desnecessárias.

