

# Plano: Corrigir impressão — imprimir apenas a etiqueta

## Problema

O `window.print()` no iframe está imprimindo a página inteira do navegador (com tamanho padrão A4/Letter) em vez de respeitar o tamanho da etiqueta 29mm x 90mm. O driver da Brother QL-810W não está recebendo as dimensões corretas.

## Solução

Adicionar regras CSS de impressão mais agressivas no iframe para forçar o navegador a usar exatamente o tamanho da etiqueta:

### `src/components/checkin/LabelPrint.tsx`

1. Adicionar `@media print` com regras que forçam `html` e `body` a ter exatamente 29mm x 90mm
2. Adicionar `-webkit-print-color-adjust: exact` para preservar cores
3. Remover qualquer margem/padding extra que o navegador adiciona por padrão
4. Usar `page-break-after: avoid` e `page-break-inside: avoid` para evitar quebra de página
5. Adicionar `size: 29mm 90mm` também no `@media print` como reforço

Estas mudanças garantem que o conteúdo do iframe seja tratado como uma única página de 29x90mm, independente da configuração padrão da impressora.

