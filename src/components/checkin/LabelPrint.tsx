const LOGO_BASE64 = "data:image/png;base64,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";

export interface LabelPrintProps {
  volunteerName: string;
  teamName?: string;
  date: string;
  fontSize?: number;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Builds a fully self-contained HTML document for the label.
 * The document handles its own print trigger internally — no external calls needed.
 */
function buildLabelHtml(props: LabelPrintProps): string {
  const { volunteerName, teamName, date, fontSize = 14 } = props;
  const teamLine = teamName ? `${teamName} • ${date}` : date;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Etiqueta</title>
<style>
@page {
  size: 29mm 90mm;
  margin: 0 !important;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body {
  width: 29mm; height: 90mm;
  margin: 0 !important; padding: 0 !important;
  overflow: hidden; background: #fff;
  font-family: Arial, Helvetica, sans-serif;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.label-body {
  width: 29mm; height: 90mm;
  display: flex; flex-direction: column; align-items: center;
  justify-content: center;
  padding: 2mm 1.5mm;
}
.logo-img { width: 18mm; height: auto; object-fit: contain; margin-bottom: 2mm; }
.content {
  display: flex; flex-direction: column; align-items: center;
  text-align: center; overflow: hidden; width: 100%;
}
.name {
  font-size: ${fontSize}pt; font-weight: bold; text-transform: uppercase;
  line-height: 1.1; overflow: hidden;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
  word-break: break-word;
}
.badge {
  margin-top: 1mm; font-size: 5pt; font-weight: bold;
  text-transform: uppercase; letter-spacing: 0.5px;
  border: 0.5px solid #000; border-radius: 1px;
  padding: 0.2mm 1.5mm; display: inline-block;
}
.info { font-size: 5pt; color: #555; margin-top: 0.5mm; }
@media screen {
  html, body {
    width: 100%; height: auto; min-height: 100vh;
    display: flex; justify-content: center; align-items: center;
    background: #f5f5f5;
  }
  .screen-wrapper { display: flex; flex-direction: column; align-items: center; }
  .label-wrapper {
    border: 2px dashed #ccc; border-radius: 4px; background: #fff;
    width: 29mm; height: 90mm;
  }
  .print-btn, .close-btn {
    margin-top: 12px; padding: 10px 28px;
    font-size: 15px; cursor: pointer; border: 1px solid #ccc;
    border-radius: 6px; background: #fff;
  }
  .print-btn { background: #2563eb; color: #fff; border-color: #2563eb; font-weight: bold; }
  .print-btn:hover { background: #1d4ed8; }
  .close-btn:hover { background: #eee; }
  .btn-row { display: flex; gap: 8px; margin-top: 12px; }
}
@media print {
  .print-btn, .close-btn, .btn-row { display: none !important; }
}
</style>
</head>
<body>
<div class="screen-wrapper">
  <div class="label-wrapper">
    <div class="label-body">
      <img src="${LOGO_BASE64}" class="logo-img" alt="CBRio" />
      <div class="content">
        <div class="name">${escapeHtml(volunteerName)}</div>
        <div class="badge">EM TREINAMENTO</div>
        ${teamLine ? `<div class="info">${escapeHtml(teamLine)}</div>` : ''}
      </div>
    </div>
  </div>
  <div class="btn-row">
    <button class="print-btn" onclick="window.print()">Imprimir</button>
    <button class="close-btn" onclick="window.close()">Fechar</button>
  </div>
</div>
<script>
(function() {
  var logo = document.querySelector('.logo-img');
  var printed = false;

  function doPrint() {
    if (printed) return;
    printed = true;
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        window.focus();
        window.print();
      });
    });
  }

  function onReady() {
    if (logo && !logo.complete) {
      logo.addEventListener('load', doPrint, { once: true });
      logo.addEventListener('error', doPrint, { once: true });
      setTimeout(doPrint, 1500);
    } else {
      setTimeout(doPrint, 300);
    }
  }

  if (document.readyState === 'complete') {
    onReady();
  } else {
    window.addEventListener('load', onReady, { once: true });
  }
})();
</script>
</body>
</html>`;
}

/**
 * Opens a blank window synchronously (must be called from user gesture).
 * Shows a loading state while waiting for content.
 */
export function openPrintWindow(): Window | null {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return null;

  printWindow.document.open();
  printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Preparando etiqueta</title>
<style>
html, body { margin:0; min-height:100vh; font-family:Arial,sans-serif; background:#fff; color:#111; }
body { display:flex; align-items:center; justify-content:center; padding:24px; }
.loading { font-size:14px; letter-spacing:0.02em; }
</style></head>
<body><div class="loading">Preparando etiqueta…</div></body></html>`);
  printWindow.document.close();

  return printWindow;
}

/**
 * Navigates a pre-opened window to a Blob URL with the label HTML.
 * The label document handles printing internally.
 */
export function navigatePrintWindow(
  printWindow: Window,
  props: LabelPrintProps,
): void {
  const html = buildLabelHtml(props);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  printWindow.location.href = url;
}

/**
 * Opens a new window and navigates to the label Blob URL.
 * For use when called synchronously (no prior await).
 */
export function printLabel(props: LabelPrintProps): boolean {
  const win = openPrintWindow();
  if (!win) {
    alert('Não foi possível abrir a janela de impressão. Verifique se popups estão permitidos.');
    return false;
  }
  navigatePrintWindow(win, props);
  return true;
}
