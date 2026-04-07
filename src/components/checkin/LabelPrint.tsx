interface LabelPrintProps {
  volunteerName: string;
  teamName?: string;
  date: string;
  fontSize?: number;
}

export function printLabel({ volunteerName, teamName, date, fontSize = 14 }: LabelPrintProps) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '-10000px';
  iframe.style.left = '-10000px';
  iframe.style.width = '0';
  iframe.style.height = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  const teamLine = teamName
    ? `<div class="info">${teamName} &bull; ${date}</div>`
    : `<div class="info">${date}</div>`;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        @page {
          size: 29mm 90mm;
          margin: 0 !important;
          padding: 0 !important;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        html {
          width: 29mm;
          height: 90mm;
          margin: 0 !important;
          padding: 0 !important;
        }
        body {
          width: 29mm;
          height: 90mm;
          margin: 0 !important;
          padding: 3mm 2mm;
          font-family: Arial, Helvetica, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        @media print {
          @page {
            size: 29mm 90mm;
            margin: 0 !important;
          }
          html, body {
            width: 29mm !important;
            height: 90mm !important;
            margin: 0 !important;
            padding: 3mm 2mm !important;
            overflow: hidden !important;
          }
          body {
            page-break-after: avoid;
            page-break-inside: avoid;
          }
        }
        .top {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 2mm;
        }
        .cross {
          font-size: 14pt;
          line-height: 1;
        }
        .church {
          font-size: 6pt;
          font-weight: bold;
          letter-spacing: 0.5px;
          color: #333;
          margin-top: 0.5mm;
        }
        .content {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          overflow: hidden;
          width: 100%;
        }
        .name {
          font-size: ${fontSize}pt;
          font-weight: bold;
          text-transform: uppercase;
          line-height: 1.15;
          overflow: hidden;
          word-break: break-word;
          overflow-wrap: break-word;
          white-space: normal;
        }
        .badge {
          margin-top: 1mm;
          font-size: 6pt;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border: 0.5px solid #000;
          border-radius: 1px;
          padding: 0.3mm 2mm;
          display: inline-block;
          width: fit-content;
        }
        .info {
          font-size: 6.5pt;
          color: #555;
          margin-top: 0.5mm;
        }
      </style>
    </head>
    <body>
      <div class="top">
        <div class="cross">✝</div>
        <div class="church">CBRIO</div>
      </div>
      <div class="content">
        <div class="name">${volunteerName}</div>
        <div class="badge">EM TREINAMENTO</div>
        ${teamLine}
      </div>
    </body>
    </html>
  `);
  doc.close();

  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 250);
  };
}
