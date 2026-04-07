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
    .cross {
      font-size: 12pt;
      line-height: 1;
    }
    .church {
      font-size: 5pt;
      font-weight: bold;
      letter-spacing: 0.5px;
      color: #333;
      margin-top: 0.3mm;
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
      white-space: nowrap;
      text-overflow: ellipsis;
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
    <div class="cross">✝</div>
    <div class="church">CBRIO</div>
  </div>
  <div class="content">
    <div class="name">${volunteerName}</div>
    <div class="badge">EM TREINAMENTO</div>
    ${teamLine}
  </div>
</body>
</html>`;
}

export function printLabel(props: LabelPrintProps) {
  const html = buildLabelHtml(props);

  // Create a hidden iframe so the print targets ONLY the label document,
  // not the parent page or any open dialogs.
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '-10000px';
  iframe.style.left = '-10000px';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const cleanup = () => {
    try {
      document.body.removeChild(iframe);
    } catch {
      // already removed
    }
  };

  const iframeWindow = iframe.contentWindow;
  if (!iframeWindow) {
    cleanup();
    return;
  }

  const doc = iframeWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  // Wait for content to render, then print
  iframe.onload = () => {
    setTimeout(() => {
      try {
        iframeWindow.focus();
        iframeWindow.print();
      } catch {
        // fallback: ignore
      }
      // Clean up after print dialog closes
      setTimeout(cleanup, 2000);
    }, 200);
  };

  // Fallback: if onload doesn't fire (some browsers with srcdoc-less iframes)
  setTimeout(() => {
    try {
      iframeWindow.focus();
      iframeWindow.print();
    } catch {
      // ignore
    }
    setTimeout(cleanup, 2000);
  }, 500);
}
