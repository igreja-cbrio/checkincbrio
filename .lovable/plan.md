
Plano: isolar a impressão da etiqueta do popup

Diagnóstico
- O layout horizontal da etiqueta já existe; o problema principal agora é o mecanismo de impressão.
- Hoje `src/components/checkin/LabelPrint.tsx` usa `window.open(..., width=600,height=300)` + `printWindow.print()`. Isso faz o navegador tratar a impressão como uma página/popup normal, então a prévia tenta imprimir o popup inteiro, não só a etiqueta.
- No fluxo de treinamento, a impressão também acontece enquanto o diálogo ainda está no fluxo visual, o que pode reforçar esse comportamento.

Implementação
1. `src/components/checkin/LabelPrint.tsx`
   - Trocar o popup por um iframe temporário invisível e fora da tela.
   - Renderizar dentro dele um HTML mínimo contendo somente a etiqueta.
   - Manter o tamanho real em `@page { size: 90mm 29mm; margin: 0 }` e no `html/body`.
   - Manter o conteúdo horizontal: logo à esquerda, nome/badge/info à direita, nome em uma linha com reticências se necessário.
   - Disparar `print()` apenas no `contentWindow` do iframe e limpar o iframe em `afterprint`/fallback.

2. `src/components/checkin/TrainingRegistrationDialog.tsx`
   - No “Registrar”, concluir o salvamento, fechar/resetar o diálogo e só então disparar a impressão automática.
   - O botão “Imprimir teste” continuará usando o mesmo utilitário novo, mas sem depender de popup.

3. `src/pages/CheckinPage.tsx`
   - Aplicar a mesma ordem nos outros fluxos que também usam `printLabel` (ex.: check-in sem escala), para evitar o mesmo bug quando houver diálogo aberto.

Detalhes técnicos
- Não vou depender do `@media print` global de `src/index.css` (A4 para relatórios); a etiqueta passará a ser impressa em um documento isolado.
- A prévia visual do treinamento já está horizontal; no máximo haverá ajuste fino para manter o preview consistente com a impressão.
- Isso corrige o app para imprimir somente a etiqueta. A impressora ainda precisa estar com o papel/tamanho correto configurado no driver da Brother para `90x29mm`.

Resultado esperado
- Ao clicar em “Registrar treinamento”, a impressão mostrará somente a etiqueta.
- O popup/formulário não aparecerá mais na impressão.
- O texto continuará na horizontal, sem aquelas quebras de linha do layout vertical.
