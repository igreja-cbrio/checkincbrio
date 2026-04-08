
Objetivo
- Fazer o botão “Registrar treinamento” abrir uma página de impressão limpa, mostrando só a etiqueta com o nome da pessoa.

Diagnóstico
- Hoje `src/components/checkin/LabelPrint.tsx` tenta imprimir a própria SPA, escondendo a interface com CSS (`data-label-print`, `#label-print-host`, `@media print`).
- Isso é frágil no Android/web app porque disputa com:
  - o portal do `Dialog` do Radix,
  - o `@media print` global de `src/index.css` (A4),
  - o timing do fechamento do modal após fluxos assíncronos.
- Resultado: a impressão pega o popup inteiro ou uma composição errada da tela.
- Como é um web app, o fluxo mais confiável não é “impressão invisível” estilo app nativo, e sim uma página de impressão dedicada.

Plano
1. Substituir a estratégia atual de impressão
   - Refatorar `src/components/checkin/LabelPrint.tsx` para parar de imprimir a janela atual.
   - O helper passará a apenas:
     - preparar uma janela/aba de impressão no clique do usuário,
     - montar a URL/dados da etiqueta,
     - enviar essa janela para uma tela de impressão dedicada.

2. Criar uma página de impressão dedicada
   - Adicionar uma rota nova em `src/App.tsx`, fora do `AppLayout`, por exemplo `/print/training-label`.
   - Criar `src/pages/TrainingLabelPrintPage.tsx` com renderização exclusiva da etiqueta 90mm x 29mm.
   - Essa página terá só a etiqueta, fundo branco e estilos próprios de impressão.
   - Ler `name`, `team`, `date` e `fontSize` da URL.
   - Chamar `window.print()` quando a página estiver pronta.
   - Depois do `afterprint`, tentar fechar a aba; se não conseguir, mostrar apenas uma ação simples de “Fechar”.

3. Corrigir o fluxo assíncrono do cadastro
   - Em `src/components/checkin/TrainingRegistrationDialog.tsx`, se “Imprimir etiqueta” estiver marcado:
     - abrir/preparar a aba de impressão imediatamente no clique em “Registrar”;
     - só depois fazer o insert em `training_checkins`;
     - se salvar com sucesso, navegar essa aba para a página de impressão com os dados corretos;
     - se der erro, fechar/cancelar a aba preparada.
   - Isso evita popup bloqueado depois do `await`.

4. Aplicar o mesmo padrão aos outros pontos que imprimem após `await`
   - Atualizar `src/pages/CheckinPage.tsx` para os fluxos de check-in sem escala que também chamam `printLabel(...)` depois de operação assíncrona.
   - Assim o comportamento fica consistente no app inteiro.
   - Como `TrainingRegistrationDialog` também é usado no kiosk, a correção vale para os dois contextos.

5. Remover a solução frágil antiga
   - Eliminar de `LabelPrint.tsx` a lógica de:
     - host oculto no `body`,
     - CSS que tenta esconder a SPA na impressão,
     - impressão na janela atual,
     - fallback com `document.write` se ele não for mais necessário.
   - Ficar com um único fluxo previsível: página dedicada de impressão.

Resultado esperado
- Ao registrar treinamento, abre uma página/aba normal de impressão com apenas a etiqueta.
- A visualização não inclui popup, header, navegação nem toasts.
- O nome da pessoa aparece corretamente na etiqueta.
- O fluxo fica simples e estável para tablet Android em web app.

Detalhes técnicos
- Arquivos envolvidos:
  - `src/components/checkin/LabelPrint.tsx`
  - `src/components/checkin/TrainingRegistrationDialog.tsx`
  - `src/pages/CheckinPage.tsx`
  - `src/App.tsx`
  - novo `src/pages/TrainingLabelPrintPage.tsx`
- Se o `@page A4` global de `src/index.css` ainda interferir, a rota de impressão receberá estilos próprios injetados no `head` para sobrescrever isso.
- Se eu quiser eliminar diferença entre “pré-visualização” e “impresso”, posso extrair o layout da etiqueta para um renderer compartilhado entre a preview do dialog e a página de impressão.
- Não precisa de mudança no backend; é uma correção de fluxo/UI no cliente.

Fluxo final
```text
Registrar treinamento
-> abre aba de impressão vazia/preparada
-> salva o cadastro
-> envia a aba para /print/training-label?...
-> a página mostra só a etiqueta
-> abre o diálogo de impressão
-> fecha a aba ao terminar
```
