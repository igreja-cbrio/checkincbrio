interface LabelPrintProps {
  volunteerName: string;
  teamName?: string;
  date: string;
}

export function printLabel({ volunteerName, teamName, date }: LabelPrintProps) {
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

  const teamLine = teamName ? `<div style="font-size:7pt;color:#555;margin-top:1mm;">${teamName} &bull; ${date}</div>` : `<div style="font-size:7pt;color:#555;margin-top:1mm;">${date}</div>`;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        @page {
          size: 62mm 29mm;
          margin: 0;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          width: 62mm;
          height: 29mm;
          font-family: Arial, Helvetica, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2mm 3mm;
          overflow: hidden;
        }
        .church {
          font-size: 7pt;
          font-weight: bold;
          letter-spacing: 1px;
          color: #333;
        }
        .name {
          font-size: 12pt;
          font-weight: bold;
          text-transform: uppercase;
          margin-top: 1.5mm;
          text-align: center;
          line-height: 1.1;
          max-width: 56mm;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
        .badge {
          margin-top: 1.5mm;
          font-size: 7pt;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border: 1px solid #000;
          border-radius: 2px;
          padding: 0.5mm 2mm;
        }
        .info {
          font-size: 7pt;
          color: #555;
          margin-top: 1mm;
        }
      </style>
    </head>
    <body>
      <div class="church">✝ CBRIO</div>
      <div class="name">${volunteerName}</div>
      <div class="badge">EM TREINAMENTO</div>
      ${teamLine}
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
