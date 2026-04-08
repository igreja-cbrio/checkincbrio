import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

const LOGO_BASE64 = "data:image/png;base64,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";

export default function TrainingLabelPrintPage() {
  const [searchParams] = useSearchParams();
  const hasPrinted = useRef(false);

  const name = searchParams.get('name') || 'NOME';
  const team = searchParams.get('team') || '';
  const date = searchParams.get('date') || '';
  const fontSize = parseInt(searchParams.get('fs') || '14', 10);

  useEffect(() => {
    // Mark body so global CSS skips A4 @page rules
    document.body.setAttribute('data-print-label', 'true');

    if (hasPrinted.current) return;
    hasPrinted.current = true;

    const timer = setTimeout(() => {
      window.print();
    }, 300);

    const handleAfterPrint = () => {
      window.close();
    };
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      clearTimeout(timer);
      document.body.removeAttribute('data-print-label');
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  const teamLine = team ? `${team} • ${date}` : date;

  return (
    <>
      <style>{`
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
          background: #fff;
          font-family: Arial, Helvetica, sans-serif;
        }
        #root {
          width: 90mm;
          height: 29mm;
          overflow: hidden;
        }
        .label-body {
          width: 90mm;
          height: 29mm;
          display: flex;
          flex-direction: row;
          align-items: center;
          padding: 1.5mm 3mm;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
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
        .close-btn {
          display: none;
        }
        @media screen {
          body {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            width: 100%;
            height: auto;
            background: #f5f5f5;
          }
          #root {
            width: auto;
            height: auto;
          }
          .label-wrapper {
            border: 2px dashed #ccc;
            border-radius: 4px;
            background: #fff;
          }
          .close-btn {
            display: block;
            margin-top: 16px;
            padding: 8px 24px;
            font-size: 14px;
            cursor: pointer;
            border: 1px solid #ccc;
            border-radius: 4px;
            background: #fff;
          }
          .close-btn:hover {
            background: #eee;
          }
          .screen-wrapper {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
        }
      `}</style>
      <div className="screen-wrapper">
        <div className="label-wrapper">
          <div className="label-body">
            <div className="left">
              <img src={LOGO_BASE64} className="logo-img" alt="CBRio" />
            </div>
            <div className="content">
              <div className="name" style={{ fontSize: `${fontSize}pt` }}>
                {name}
              </div>
              <div className="badge">EM TREINAMENTO</div>
              {teamLine && <div className="info">{teamLine}</div>}
            </div>
          </div>
        </div>
        <button className="close-btn" onClick={() => window.close()}>
          Fechar
        </button>
      </div>
    </>
  );
}
