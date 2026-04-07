

# Plano: Tornar o formulário de Treinamento acessível sem culto selecionado

## Problema

O botão "Registrar Treinamento" e o dialog só aparecem quando há um culto selecionado (`selectedServiceId`). Como não há culto hoje, o botão não aparece e não é possível testar a impressão.

## Alterações

### 1. `src/pages/CheckinPage.tsx`
- Remover a condição `selectedServiceId &&` do botão "Registrar Treinamento" — ele ficará sempre visível para líderes
- Remover a condição `selectedServiceId &&` ao redor do `<TrainingRegistrationDialog>` — renderizar sempre
- Passar `serviceId` como string vazia quando não houver culto (o dialog já aceita isso)

### 2. `src/pages/FaceCheckinKioskPage.tsx`
- Mesma lógica: remover a condição `selectedServiceId &&` do botão "Treinamento" no header do totem
- O dialog já está renderizado fora da condição

### 3. `src/components/checkin/TrainingRegistrationDialog.tsx`
- Tornar `serviceId` opcional na interface (`serviceId?: string`)
- No submit, se não houver `serviceId`, salvar o registro sem vincular a um culto (campo `service_id` como `null`)
- O preview e impressão de teste já funcionam sem `serviceId`

## Resultado

O líder pode abrir o formulário de treinamento e testar a impressão de etiquetas a qualquer momento, mesmo sem culto agendado para hoje.

