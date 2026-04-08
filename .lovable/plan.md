

# Plano: Garantir que a impressão da etiqueta funcione sem interferência

## Problema real

O `src/index.css` tem um `@media print { @page { size: A4; margin: 1.5cm } }` global que pode estar sobrescrevendo o `@page { size: 90mm 29mm }` da `TrainingLabelPrintPage`. Além disso, os estilos globais do Tailwind e do `index.css` (fontes, variáveis CSS, resets) são carregados em todas as rotas, incluindo a de impressão.

## Solucao

### 1. `src/index.css` — Proteger a rota de impressão do `@page A4`

Envolver o bloco `@media print` existente com uma condição que exclua a página de etiqueta:

```css
@media print {
  body:not([data-print-label]) .print-report .card { ... }
  body:not([data-print-label]) { @page { size: A4; margin: 1.5cm; } }
}
```

Nota: como `@page` nao aceita seletores condicionais em CSS puro, a abordagem sera adicionar um `body.print-label-mode` na `TrainingLabelPrintPage` e no `@media print` do `index.css` simplesmente nao declarar `@page` — deixar que a pagina de etiqueta defina seu proprio `@page` sem competicao.

Na pratica: **remover** o `@page { size: A4; margin: 1.5cm }` do `index.css` e mover para os componentes de relatorio que realmente precisam (ou envolver com uma classe `.print-report`).

### 2. `src/pages/TrainingLabelPrintPage.tsx` — Reforcar isolamento

- Adicionar `data-print-label` ao body no `useEffect` (e remover no cleanup)
- Isso permite que o CSS global saiba que NAO deve aplicar regras de impressao A4

### Arquivos alterados

1. **src/index.css** — Mover `@page A4` para dentro de `.print-report` ou condicionar a `body:not([data-print-label])`
2. **src/pages/TrainingLabelPrintPage.tsx** — Marcar body com atributo ao montar

## Resultado

A pagina `/print/training-label` abre em uma aba limpa, com `@page: 90mm 29mm` sem competicao do A4 global. O dialog de impressao aparece automaticamente. Ao fechar, a aba tenta se fechar sozinha.

