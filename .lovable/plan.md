

# Plano: Trocar a cruz pela logo da CBRio na etiqueta

## Alterações

### 1. Copiar a imagem para o projeto
- Copiar `user-uploads://Logo_CBRio_-_ICONE_NOVA_AZUL.png` para `public/images/logo-cbrio.png`

### 2. `src/components/checkin/LabelPrint.tsx`
- Substituir o `<div class="cross">✝</div>` por uma tag `<img>` que carrega o logo como **base64 inline** (data URI). Isso é necessário porque o iframe de impressão não tem acesso garantido a URLs relativas do app.
- Converter a imagem para base64 em tempo de build ou embuti-la diretamente no HTML gerado.
- Alternativa mais simples: como a imagem precisa ser embutida no HTML do iframe, vou importar a imagem como base64 no componente e injetá-la no template HTML.
- Ajustar o CSS `.cross` para `.logo img` com tamanho adequado (~8mm de altura para caber na etiqueta de 29mm).

### 3. `src/components/checkin/TrainingRegistrationDialog.tsx`
- Atualizar o `LabelPreview` para mostrar a imagem do logo em vez do caractere `✝`.
- Importar a imagem via `import logo from "@/assets/logo-cbrio.png"` ou referenciar de `/images/logo-cbrio.png`.

### Detalhes técnicos
- Para o iframe de impressão: a imagem será convertida para data URI (base64) para garantir que apareça mesmo em contexto isolado.
- Para o preview: usará import normal do React.
- A imagem terá ~8mm de altura no print e ~24px no preview, mantendo proporção.

