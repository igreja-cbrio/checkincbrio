import { QRCodeSVG } from 'qrcode.react';
import { Smartphone } from 'lucide-react';

interface KioskQrDisplayProps {
  serviceId: string;
}

export function KioskQrDisplay({ serviceId }: KioskQrDisplayProps) {
  const selfCheckinUrl = `${window.location.origin}/selfcheckin?service=${serviceId}`;

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 p-8">
      <div className="bg-white p-8 rounded-2xl shadow-lg">
        <QRCodeSVG
          value={selfCheckinUrl}
          size={280}
          level="H"
          includeMargin
        />
      </div>

      <div className="text-center space-y-3 max-w-md">
        <div className="flex items-center justify-center gap-2 text-2xl font-bold">
          <Smartphone className="h-7 w-7" />
          Escaneie com seu celular
        </div>
        <p className="text-lg text-muted-foreground">
          Aponte a câmera do seu celular para o QR Code acima para fazer seu check-in
        </p>
      </div>
    </div>
  );
}
