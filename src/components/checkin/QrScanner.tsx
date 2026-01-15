import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, CameraOff } from 'lucide-react';

interface QrScannerProps {
  onScan: (qrCode: string) => void;
  isProcessing: boolean;
}

export function QrScanner({ onScan, isProcessing }: QrScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const startScanning = async () => {
    setError(null);
    
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('qr-reader');
      }

      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          onScan(decodedText);
        },
        () => {
          // Ignore errors during scanning
        }
      );
      
      setIsScanning(true);
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      setError('Não foi possível acessar a câmera. Verifique as permissões.');
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [isScanning]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Scanner QR Code
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div 
          id="qr-reader" 
          ref={containerRef}
          className="w-full overflow-hidden rounded-lg bg-muted"
          style={{ minHeight: isScanning ? '300px' : '0' }}
        />
        
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        
        {isProcessing && (
          <p className="text-sm text-muted-foreground text-center">
            Processando check-in...
          </p>
        )}

        <Button
          onClick={isScanning ? stopScanning : startScanning}
          className="w-full"
          variant={isScanning ? 'outline' : 'default'}
          disabled={isProcessing}
        >
          {isScanning ? (
            <>
              <CameraOff className="h-4 w-4 mr-2" />
              Parar Scanner
            </>
          ) : (
            <>
              <Camera className="h-4 w-4 mr-2" />
              Iniciar Scanner
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
