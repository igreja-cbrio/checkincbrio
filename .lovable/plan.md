

# Plano: Adicionar registro de treinamento no Modo Totem

## Situação atual

O `TrainingRegistrationDialog` já existe e funciona na página `/checkin` do líder. Ele coleta nome, equipe e telefone, salva na tabela `training_checkins` e imprime etiqueta. Porém, ele **não está disponível no Modo Totem** (`/checkin/kiosk`).

## Alteração

### `src/pages/FaceCheckinKioskPage.tsx`

- Importar `TrainingRegistrationDialog`
- Adicionar estado `trainingDialogOpen`
- Adicionar um botão `GraduationCap` "Treinamento" no header do totem (ao lado do seletor de culto) para o líder abrir o formulário rapidamente
- Renderizar o `TrainingRegistrationDialog` passando o `serviceId` selecionado

Resultado: o líder pode, a qualquer momento no modo totem, tocar em "Treinamento", preencher o formulário rápido e imprimir a etiqueta — sem sair do modo totem.

