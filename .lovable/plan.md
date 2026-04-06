

# Plano: Tela de Check-in para Totens (Self-Service)

## Visão Geral

Reformular a página `/checkin/kiosk` para ser uma tela completa de totem com 3 modos de check-in que os voluntários usam sozinhos, sem precisar de um líder operando.

## Interface

A tela terá um header compacto (seleção de culto pelo líder no setup) e depois fica no modo "totem" com 3 abas grandes e amigáveis:

```text
┌──────────────────────────────────────────┐
│  [←] Modo Totem    [Culto ▼]   [⛶]      │
│  ── 15/40 presentes ─────────────────    │
├──────────────────────────────────────────┤
│                                          │
│   [ 📋 Lista ]  [ 📷 Facial ]  [ QR ]   │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  🔍 Buscar seu nome...            │  │
│  ├────────────────────────────────────┤  │
│  │  João Silva     │ Batismo │ ✓     │  │
│  │  Maria Santos   │ Louvor  │ [✓]   │  │
│  │  Pedro Lima     │ Oferta  │ [✓]   │  │
│  │  ...                              │  │
│  └────────────────────────────────────┘  │
│                                          │
└──────────────────────────────────────────┘
```

## Modo 1: Lista (padrão, mais usado)

- Lista todos os voluntários escalados no culto selecionado
- Campo de busca grande no topo para o voluntário digitar seu nome
- Cada item mostra: nome, equipe, botão grande "Check-in"
- Ao tocar no botão, faz o check-in e exibe a **SuccessOverlay** com animação
- Se o voluntário **não estiver escalado**, ao buscar seu nome e fazer check-in, aparece um aviso "Você não está escalado para este culto" com opção de confirmar — e o check-in é registrado como `is_unscheduled: true`
- Voluntários já com check-in feito aparecem com badge verde e botão desabilitado

## Modo 2: Facial

- Reaproveita o componente `AutoFaceScanner` já existente
- Câmera aberta em tela cheia, detecta rostos automaticamente
- Ao identificar, faz check-in e mostra a **SuccessOverlay** (já funciona assim)
- Sem alterações na lógica atual

## Modo 3: QR Code Fixo

- Exibe um QR Code grande na tela do totem
- O QR Code contém a URL do culto selecionado (ex: `https://checkincbrio.lovable.app/selfcheckin?service=<serviceId>`)
- O voluntário escaneia com seu celular, abre a página e faz check-in por lá
- Nova página `/selfcheckin` — tela simples onde o voluntário busca seu nome e confirma check-in (sem necessidade de login)

**Nota**: Como o QR fixo requer uma nova página pública de self-check-in, isso será simplificado inicialmente: o QR mostrará um código estático e o voluntário poderá escanear para abrir a página de check-in no celular. A página pública precisará de uma edge function para fazer o check-in sem autenticação (ou com token temporário).

## Alterações Técnicas

### 1. Refatorar `src/pages/FaceCheckinKioskPage.tsx`
- Adicionar sistema de tabs: "Lista", "Facial", "QR Code"
- Tab "Lista": criar componente `KioskNameCheckin` com busca e lista de escalados + não-escalados
- Tab "Facial": manter `AutoFaceScanner` existente
- Tab "QR Code": criar componente `KioskQrDisplay` que gera e exibe o QR code
- Design otimizado para touch em tablets (botões grandes, fontes maiores)
- Texto do header atualizado: "Check-in" ao invés de "Check-in facial automático"

### 2. Criar `src/components/checkin/KioskNameCheckin.tsx`
- Lista de voluntários escalados com busca
- Botões grandes e touch-friendly
- Ao encontrar voluntário não escalado, mostra alerta amarelo e opção de check-in
- Usa `useServiceSchedules` para listar escalados
- Reutiliza lógica do `ManualCheckin` para busca de não-escalados
- Exibe `SuccessOverlay` após check-in bem-sucedido

### 3. Criar `src/components/checkin/KioskQrDisplay.tsx`
- Gera QR Code com URL para self-check-in
- Exibe instruções: "Escaneie com seu celular para fazer check-in"
- Usa biblioteca `qrcode.react` (já no projeto ou instalar)

### 4. Criar `src/pages/SelfCheckinPage.tsx`
- Página pública (sem autenticação necessária)
- Recebe `serviceId` via query param
- Mostra campo de busca para o voluntário digitar seu nome
- Lista os escalados que batem com a busca
- Botão de check-in chama edge function para registrar

### 5. Criar edge function `self-checkin/index.ts`
- Endpoint público (sem JWT)
- Recebe: `serviceId`, `scheduleId` ou `volunteerName`
- Valida que o culto existe e é de hoje
- Registra o check-in usando service role key
- Retorna sucesso ou erro (duplicata, etc.)

### 6. Atualizar `src/App.tsx`
- Adicionar rota `/selfcheckin` para `SelfCheckinPage`

## Resultado

- Líder configura o totem: seleciona o culto e deixa o tablet no modo totem
- Voluntários fazem self-check-in por lista (mais comum), facial ou QR no celular
- Animação de sucesso aparece em todos os modos
- Voluntários sem escala são registrados e aparecem nos relatórios

