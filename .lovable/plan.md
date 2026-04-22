

# Plano: Remover impressão automática do check-in sem escala

## Problema

Quando um voluntário não está escalado e o líder faz check-in manual ou via QR code, o sistema está disparando a impressão de etiqueta — que é um fluxo desnecessário aqui. A etiqueta deve continuar existindo **apenas para treinamentos** (visitantes/novos no treinamento), não para voluntários sem escala.

O check-in sem escala já tem toda a lógica funcionando (insert na tabela `check_ins` com `is_unscheduled = true`, e aparece nos relatórios). O único problema é a impressão indevida.

## Causas no código atual

`src/pages/CheckinPage.tsx`:
- Linha 32: `printLabelChecked` inicia como `true` por padrão.
- Linhas 78–109 (`handleConfirmUnscheduledCheckIn`): após check-in via QR, dispara `printLabel(...)`.
- Linhas 123–147 (`handleUnscheduledManualCheckIn`): após check-in manual sem escala, dispara `printLabel(...)` automaticamente.

`src/components/checkin/UnscheduledCheckinDialog.tsx`:
- Mostra checkbox "Imprimir etiqueta de identificação" — confunde o líder e sugere que faz parte do fluxo.

## Alterações

### 1. `src/pages/CheckinPage.tsx`
- Remover toda a chamada `printLabel(...)` de `handleConfirmUnscheduledCheckIn`.
- Remover toda a chamada `printLabel(...)` de `handleUnscheduledManualCheckIn`.
- Remover o estado `printLabelChecked` e o import `openPrintWindow, navigatePrintWindow, printLabel` (não usados mais aqui).
- Remover as props `printLabelChecked` e `onPrintLabelChange` passadas ao `UnscheduledCheckinDialog`.

### 2. `src/components/checkin/UnscheduledCheckinDialog.tsx`
- Remover o checkbox "Imprimir etiqueta de identificação" e suas props (`printLabelChecked`, `onPrintLabelChange`).
- Simplificar `onConfirm` para `() => void` (sem argumento `printLabel`).
- Remover import de `Checkbox` e ícone `Printer`.

### 3. Manter intactos
- `TrainingRegistrationDialog` continua imprimindo etiqueta (é o fluxo correto para treinamentos).
- `LabelPrint.tsx` permanece como está — usado apenas em treinamento.
- Toda a lógica de `is_unscheduled = true` no banco e nos relatórios continua igual.

## Resultado

- Check-in sem escala (manual ou QR) registra direto no banco, mostra toast de confirmação e a pessoa aparece no relatório de "voluntários sem escala".
- Nenhuma janela de impressão abre.
- Treinamento continua imprimindo etiqueta normalmente.

