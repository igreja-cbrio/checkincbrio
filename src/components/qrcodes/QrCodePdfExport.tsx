import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { VolunteerWithQrCode } from '@/hooks/useVolunteersQrCodes';

interface QrCodePdfExportProps {
  volunteers: VolunteerWithQrCode[];
}

export function QrCodePdfExport({ volunteers }: QrCodePdfExportProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePdf = async () => {
    if (volunteers.length === 0) {
      toast.error('Nenhum voluntário para exportar');
      return;
    }

    setIsGenerating(true);
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Layout settings
      const qrSize = 40; // mm
      const cols = 4;
      const rows = 5;
      const marginX = 15;
      const marginY = 25;
      const cellWidth = (pageWidth - 2 * marginX) / cols;
      const cellHeight = (pageHeight - marginY - 20) / rows;
      
      // Title
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Check-in CBRIO - QR Codes para Crachás', pageWidth / 2, 15, { align: 'center' });
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, 21, { align: 'center' });

      let currentPage = 1;
      let itemIndex = 0;

      for (const volunteer of volunteers) {
        const qrValue = volunteer.qr_code || volunteer.planning_center_id || volunteer.id;
        
        // Calculate position
        const positionOnPage = itemIndex % (cols * rows);
        const col = positionOnPage % cols;
        const row = Math.floor(positionOnPage / cols);
        
        const x = marginX + col * cellWidth + (cellWidth - qrSize) / 2;
        const y = marginY + row * cellHeight;

        // Generate QR code as data URL
        const qrDataUrl = await generateQrCodeDataUrl(qrValue, 200);
        
        // Add QR code image
        pdf.addImage(qrDataUrl, 'PNG', x, y, qrSize, qrSize);
        
        // Add name below QR code
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        const name = volunteer.full_name.length > 18 
          ? volunteer.full_name.substring(0, 16) + '...'
          : volunteer.full_name;
        pdf.text(name, x + qrSize / 2, y + qrSize + 5, { align: 'center' });

        itemIndex++;

        // Check if we need a new page
        if (itemIndex % (cols * rows) === 0 && itemIndex < volunteers.length) {
          pdf.addPage();
          currentPage++;
          
          // Add header to new page
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`Página ${currentPage}`, pageWidth / 2, 15, { align: 'center' });
        }
      }

      // Save the PDF
      pdf.save(`qrcodes-cbrio-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success(`PDF gerado com ${volunteers.length} QR codes!`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button onClick={generatePdf} disabled={isGenerating || volunteers.length === 0}>
      {isGenerating ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4 mr-2" />
      )}
      {isGenerating ? 'Gerando...' : `Exportar PDF (${volunteers.length})`}
    </Button>
  );
}

// Helper function to generate QR code as data URL using qrcode library
async function generateQrCodeDataUrl(value: string, size: number): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(value, {
      width: size,
      margin: 2,
      errorCorrectionLevel: 'H',
    });
    return dataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    // Fallback: generate simple placeholder
    return generatePlaceholderQr(size);
  }
}

function generatePlaceholderQr(size: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = 'black';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('QR', size / 2, size / 2);
  }
  return canvas.toDataURL('image/png');
}
