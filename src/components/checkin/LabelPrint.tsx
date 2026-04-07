const LOGO_BASE64 = "data:image/png;base64,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";

interface LabelPrintProps {
  volunteerName: string;
  teamName?: string;
  date: string;
  fontSize?: number;
}

function buildLabelHtml({ volunteerName, teamName, date, fontSize = 14 }: LabelPrintProps): string {
  const teamLine = teamName
    ? `<div class="info">${teamName} &bull; ${date}</div>`
    : `<div class="info">${date}</div>`;

  return `<!DOCTYPE html>
<html>
<head>
  <title>Etiqueta</title>
  <style>
    @page {
      size: 90mm 29mm !important;
      margin: 0 !important;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      width: 90mm;
      height: 29mm;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      display: flex;
      flex-direction: row;
      align-items: center;
      padding: 1.5mm 3mm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @media print {
      @page {
        size: 90mm 29mm !important;
        margin: 0 !important;
      }
      html, body {
        width: 90mm !important;
        height: 29mm !important;
        margin: 0 !important;
        padding: 1.5mm 3mm !important;
        overflow: hidden !important;
      }
      body {
        page-break-after: avoid;
        page-break-inside: avoid;
      }
    }
    .left {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-right: 3mm;
      flex-shrink: 0;
    }
    .logo-img {
      height: 8mm;
      width: auto;
      object-fit: contain;
    }
    .content {
      display: flex;
      flex-direction: column;
      justify-content: center;
      overflow: hidden;
      flex: 1;
    }
    .name {
      font-size: ${fontSize}pt;
      font-weight: bold;
      text-transform: uppercase;
      line-height: 1.1;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      word-break: break-word;
    }
    .badge {
      margin-top: 0.5mm;
      font-size: 5pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border: 0.5px solid #000;
      border-radius: 1px;
      padding: 0.2mm 1.5mm;
      display: inline-block;
      width: fit-content;
    }
    .info {
      font-size: 5.5pt;
      color: #555;
      margin-top: 0.3mm;
    }
  </style>
</head>
<body>
  <div class="left">
    <img src="${LOGO_BASE64}" class="logo-img" />
  </div>
  <div class="content">
    <div class="name">${volunteerName}</div>
    <div class="badge">EM TREINAMENTO</div>
    ${teamLine}
  </div>
</body>
</html>`;
}

function printViaIframe(html: string): boolean {
  try {
    const iframe = document.createElement('iframe');
    // Use off-screen positioning with real dimensions — hidden/zero-size iframes
    // silently fail to trigger print() on Android Chrome
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:360px;height:120px;border:none;opacity:0;pointer-events:none;';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      return false;
    }

    doc.open();
    doc.write(html);
    doc.close();

    // Wait for content to render, then print
    const tryPrint = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        // If iframe print fails, fall back to window.open
        printViaWindow(html);
      }
      // Cleanup after print dialog
      setTimeout(() => {
        try { document.body.removeChild(iframe); } catch { /* already removed */ }
      }, 3000);
    };

    // Use onload for reliability, with timeout fallback
    if (iframe.contentWindow) {
      iframe.contentWindow.onload = tryPrint;
    }
    // Fallback if onload doesn't fire (common with document.write)
    setTimeout(tryPrint, 500);

    return true;
  } catch {
    return false;
  }
}

function printViaWindow(html: string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Não foi possível abrir a janela de impressão. Verifique se popups estão permitidos.');
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  setTimeout(() => {
    try {
      printWindow.focus();
      printWindow.print();
    } catch {
      // ignore
    }
  }, 500);

  printWindow.onafterprint = () => {
    printWindow.close();
  };
}

export function printLabel(props: LabelPrintProps) {
  const html = buildLabelHtml(props);

  const success = printViaIframe(html);
  if (!success) {
    printViaWindow(html);
  }
}
