

# Plano: Correção definitiva da impressão de etiquetas

## Problema raiz

1. O `@page { size: A4 }` global no `index.css` (linha 180) não está condicionado e compete com o `@page` da etiqueta
2. A rota `/print/training-label` depende do carregamento completo da SPA (Vite + React + Router) antes de renderizar — no Android, o `window.print()` dispara antes disso, resultando em página em branco

## Solução: eliminar a dependência da SPA

Em vez de abrir uma rota React, o `printLabel` vai abrir uma janela e usar `document.write()` para injetar um HTML completo e independente — sem React, sem Tailwind, sem conflitos de CSS.

## Alterações

### 1. `src/components/checkin/LabelPrint.tsx`
- Reescrever para que `printLabel()` e `navigatePrintWindow()` usem `document.write()` na janela aberta
- O HTML injetado contém toda a estrutura da etiqueta inline: `@page { size: 90mm 29mm }`, layout, fontes, logo base64
- Chamar `window.print()` dentro do documento injetado via `onload` ou timeout curto
- Isso elimina qualquer dependência de carregamento da SPA

### 2. `src/index.css`
- Mover o `@page { size: A4; margin: 1.5cm }` para dentro do bloco `body:not([data-print-label])` (como fallback de segurança)

### 3. `src/pages/TrainingLabelPrintPage.tsx` e `src/App.tsx`
- Manter a rota `/print/training-label` como fallback visual, mas o fluxo principal não dependerá mais dela

## Fluxo final
```text
Clique em "Registrar"
→ abre janela em branco (síncrono, evita popup blocker)
→ salva no banco (async)
→ document.write() injeta HTML completo da etiqueta na janela
→ onload dispara window.print()
→ afterprint fecha a janela
```

## Por que isso resolve de vez
- Não depende de carregamento de bundle/SPA
- Não compete com CSS global
- O HTML da etiqueta é auto-contido e imediato
- Funciona em qualquer navegador/tablet sem race condition

