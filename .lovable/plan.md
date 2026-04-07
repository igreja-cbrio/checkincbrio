

# Plano: Simplificar fluxo de impressão de etiquetas

## Problema

A abordagem atual com `window.open('', '_blank')` causa problemas em tablets Android:
1. A nova aba fica carregando infinitamente após a impressão
2. `onload` não dispara de forma confiável com `document.write`
3. O fallback de 800ms pode disparar `print()` duas vezes
4. O usuário precisa fechar a aba manualmente

## Solução

Trocar `window.open` por um **iframe oculto inserido no próprio documento**, mas usando `document.write` no iframe (não `src`), com uma abordagem mais robusta que funcione em Android:

1. Criar um `<iframe>` invisível no body
2. Injetar o HTML via `contentDocument.write()`
3. Aguardar o conteúdo carregar, chamar `contentWindow.focus()` + `contentWindow.print()`
4. Remover o iframe após a impressão (com timeout de segurança)
5. Se `contentWindow.print()` falhar (como no iOS Safari), usar `window.open` como fallback

## Alteração

### `src/components/checkin/LabelPrint.tsx`

- Criar função `printViaIframe(html)` como método principal:
  - Cria iframe com `style="position:fixed; width:0; height:0; border:none; visibility:hidden"`
  - Usa `iframe.contentDocument.write(html)` + `close()`
  - Chama `iframe.contentWindow.print()` após um pequeno delay
  - Remove o iframe após 2s (tempo suficiente para o diálogo de impressão)
- Manter `printViaWindow(html)` como fallback (código atual simplificado, sem o setTimeout duplicado)
- Tentar iframe primeiro; se falhar (erro ou bloqueio), cair no fallback de window.open
- Remover o setTimeout de 800ms duplicado que causa double-print

## Resultado

Impressão direta sem abrir nova aba. O diálogo de impressão aparece sobre o app e, ao fechar, tudo volta ao normal sem páginas penduradas.

