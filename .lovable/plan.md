

# Plano: Corrigir impressão — usar nova janela isolada

## Diagnóstico

O problema é que em iPad/iOS Safari, `iframe.contentWindow.print()` não funciona como esperado — ele acaba imprimindo a página principal (o popup/dialog) em vez do conteúdo do iframe. Isso é uma limitação conhecida do Safari mobile.

## Solução

Trocar a abordagem de iframe oculto por `window.open()` com um documento HTML completo e auto-impressão. A diferença da tentativa anterior é que:
1. A nova janela será aberta com `about:blank`, o HTML será injetado via `document.write`, e `window.print()` será chamado **dentro da nova janela**
2. A nova janela será fechada automaticamente após a impressão
3. O diálogo será fechado **antes** de abrir a janela de impressão

## Alteração

### `src/components/checkin/LabelPrint.tsx`
- Remover toda a lógica do iframe
- Usar `window.open('', '_blank')` para abrir uma janela/aba nova
- Escrever o HTML da etiqueta com `document.write()`
- Adicionar um script inline no HTML que chama `window.print()` automaticamente após carregar e fecha a janela ao terminar (`window.onafterprint = () => window.close()`)
- Manter todo o CSS de `@page { size: 90mm 29mm }` dentro do documento da nova janela
- Incluir `<title>Etiqueta</title>` para que a prévia de impressão mostre um nome limpo

## Resultado

A impressão abrirá uma aba/janela contendo **apenas** a etiqueta, sem nenhum elemento do app. O diálogo de impressão do navegador mostrará somente o conteúdo 90x29mm.

