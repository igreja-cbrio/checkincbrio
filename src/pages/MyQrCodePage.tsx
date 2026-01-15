import { QrCodeDisplay } from '@/components/volunteer/QrCodeDisplay';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { WifiOff, CheckCircle } from 'lucide-react';

export default function MyQrCodePage() {
  const isOnline = useOnlineStatus();

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Meu QR Code</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Mostre para fazer check-in
        </p>
      </div>

      <QrCodeDisplay />

      {/* Offline availability indicator */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        {isOnline ? (
          <>
            <CheckCircle className="h-3 w-3 text-green-500" />
            <span>Disponível offline</span>
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3" />
            <span>Usando dados salvos</span>
          </>
        )}
      </div>
    </div>
  );
}
