import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
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
  const isMountedRef = useRef(true);

  const getScannerState = useCallback(() => {
    if (!scannerRef.current) return null;
    try {
      return scannerRef.current.getState();
    } catch {
      return null;
    }
  }, []);

  const stopScanning = useCallback(async () => {
    const state = getScannerState();
    
    // Only stop if scanner is actually running or paused
    if (
      scannerRef.current && 
      state !== null &&
      (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED)
    ) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        // Silently ignore - scanner might already be stopped
        console.log('Scanner stop handled:', err);
      }
    }
    
    if (isMountedRef.current) {
      setIsScanning(false);
    }
  }, [getScannerState]);

  const startScanning = async () => {
    setError(null);
    
    try {
      // Stop any existing scanner first
      await stopScanning();
      
      // Create new scanner instance
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
          // Ignore QR parse errors during scanning
        }
      );
      
      if (isMountedRef.current) {
        setIsScanning(true);
      }
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      if (isMountedRef.current) {
        setError('Não foi possível acessar a câmera. Verifique as permissões.');
        setIsScanning(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      
      // Cleanup on unmount
      const scanner = scannerRef.current;
      if (scanner) {
        try {
          const state = scanner.getState();
          if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
            scanner.stop().catch(() => {
              // Ignore cleanup errors
            });
          }
        } catch {
          // Ignore errors during cleanup
        }
      }
    };
  }, []);

  const handleToggle = async () => {
    if (isScanning) {
      await stopScanning();
    } else {
      await startScanning();
    }
  };

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
          onClick={handleToggle}
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
