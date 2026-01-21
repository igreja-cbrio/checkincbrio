import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import { Download } from 'lucide-react';
import { useRef } from 'react';

interface QrCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  volunteer: {
    id: string;
    full_name: string;
    qr_code: string | null;
    planning_center_id: string | null;
  } | null;
}

export function QrCodeModal({ open, onOpenChange, volunteer }: QrCodeModalProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  if (!volunteer) return null;

  const qrValue = volunteer.qr_code || volunteer.planning_center_id || volunteer.id;

  const handleDownloadPng = async () => {
    if (!qrRef.current) return;

    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 400;
    canvas.width = size;
    canvas.height = size + 60;

    // White background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Convert SVG to image
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size);
      
      // Add name below QR code
      ctx.fillStyle = 'black';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(volunteer.full_name, size / 2, size + 35);

      // Download
      const link = document.createElement('a');
      link.download = `qrcode-${volunteer.full_name.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">{volunteer.full_name}</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-4 py-4">
          <div ref={qrRef} className="bg-white p-4 rounded-lg">
            <QRCodeSVG
              value={qrValue}
              size={250}
              level="H"
              includeMargin={true}
            />
          </div>
          
          <p className="text-sm text-muted-foreground text-center">
            ID: {volunteer.planning_center_id || volunteer.id.slice(0, 8)}
          </p>

          <Button onClick={handleDownloadPng} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Baixar PNG
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
