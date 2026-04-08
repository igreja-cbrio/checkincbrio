
Objetivo
- Eliminar a tela branca no preview da Brother/Android e fazer a etiqueta aparecer antes de abrir a impressão.

O que a imagem confirma
- O tablet já está reconhecendo o papel certo: 29mm x 90mm.
- Então o problema não é mais o tamanho da folha.
- O problema é o conteúdo: o Android está recebendo um job de impressão sem a etiqueta renderizada.

Causa provável no código atual
- `src/components/checkin/LabelPrint.tsx` ainda depende de `document.write()` e de `printWindow.print()` disparado pela janela pai logo depois da escrita.
- A aba também fecha em `afterprint`, e no Android isso pode acontecer cedo demais.
- O layout foi montado como `90mm x 29mm`, mas o preview da Brother está em `29mm x 90mm`.
- A prévia do dialog e a impressão usam renderizadores diferentes, e o logo atual está pesado/frágil.

Plano de correção definitiva

1. Reescrever o motor principal de impressão em `src/components/checkin/LabelPrint.tsx`
- Parar de usar `document.write()` como fluxo principal.
- Gerar um HTML autônomo em `Blob URL`.
- Abrir a aba síncrona no clique e, depois do salvamento, navegar essa aba para o `Blob URL`.
- A própria aba final será responsável por chamar `window.print()`.

2. Fazer a aba de impressão esperar a etiqueta existir de verdade
- Renderizar a etiqueta primeiro.
- Aguardar `load` + logo carregado/decodificado + 2 frames.
- Só então abrir o preview de impressão.
- Se o auto-print falhar, manter a etiqueta visível com botão “Imprimir”, em vez de tela branca.

3. Parar de fechar a aba cedo demais
- Remover o fechamento automático imediato em `afterprint`.
- Fechar só manualmente, ou com fallback mais seguro depois que o usuário voltar do preview.

4. Corrigir a orientação real da Brother
- Alinhar o documento ao papel que o Android mostra: `29mm x 90mm`.
- Se o design precisar continuar horizontal, rotacionar o conteúdo interno em vez de depender do navegador para girar a folha.
- Revisar `width/height/overflow` para garantir que nada fique fora da área imprimível.

5. Unificar preview e impressão
- Extrair um renderer único da etiqueta.
- Fazer a prévia do dialog e o HTML de impressão usarem o mesmo markup, mesmas medidas e mesmo logo.
- Trocar o base64 atual por um asset real e leve.

6. Ajustar `src/components/checkin/TrainingRegistrationDialog.tsx`
- Manter a aba pré-aberta para evitar bloqueio de popup.
- Depois do insert, apenas navegar a aba para o documento final.
- Remover `triggerPrintWindow()` do fluxo principal, porque o print passará a ser disparado pela própria aba final.

7. Deixar `src/pages/TrainingLabelPrintPage.tsx` só como fallback/manual debug
- Não usar mais essa rota como motor principal de impressão.

Arquivos
- `src/components/checkin/LabelPrint.tsx`
- `src/components/checkin/TrainingRegistrationDialog.tsx`
- `src/pages/TrainingLabelPrintPage.tsx`
- asset do logo em `public/` ou `src/assets/`

Detalhes técnicos
- O tamanho do papel já está correto; o erro está no momento e na forma como o conteúdo é enviado ao preview.
- O melhor caminho é: `window.open()` síncrono + `Blob URL` + `window.print()` executado dentro do documento final.
- O `@page A4` global deixa de ser relevante no fluxo principal, porque a impressão passa a acontecer num documento isolado.

Resultado esperado
- Ao registrar treinamento, a Brother abre com a etiqueta visível no preview.
- O usuário não vê mais tela branca.
- A prévia do diálogo e a impressão ficam idênticas.
