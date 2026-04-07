

# Plano: Modo Totem visível sem culto agendado

## Problema

O botão "Modo Totem" na página `/checkin` só aparece quando há um culto selecionado (`selectedServiceId`). Em dias sem culto, o botão não aparece.

## Alterações

### `src/pages/CheckinPage.tsx`
- Remover a condição `selectedServiceId &&` que envolve o botão "Modo Totem" (linha 232), tornando-o sempre visível para líderes

### `src/pages/FaceCheckinKioskPage.tsx`
- O conteúdo principal já mostra "Selecione um culto para iniciar" quando não há culto selecionado — isso continuará funcionando
- O botão "Treinamento" já aparece sem culto (alteração anterior)
- Nenhuma mudança necessária neste arquivo

## Resultado

O líder acessa o Modo Totem a qualquer momento. Sem culto selecionado, verá a tela de espera e o botão de Treinamento para testar impressão.

