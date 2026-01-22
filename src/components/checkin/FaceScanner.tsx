import { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FaceCamera } from '@/components/face/FaceCamera';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import { useFaceMatch } from '@/hooks/useFaceEnrollment';
import { Camera, Loader2, AlertCircle, CheckCircle2, UserX, Scan } from 'lucide-react';

interface FaceScannerProps {
  onCheckIn: (result: {
    volunteerId: string | null;
    volunteerName: string;
    planningCenterId: string | null;
    source: string;
  }) => void;
  isProcessing: boolean;
}

export function FaceScanner({ onCheckIn, isProcessing }: FaceScannerProps) {
  const [scanResult, setScanResult] = useState<{
    type: 'success' | 'not_found' | 'error';
    message: string;
    volunteerName?: string;
  } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const lastScanTimeRef = useRef<number>(0);
  const cooldownRef = useRef<boolean>(false);

  const faceMatchMutation = useFaceMatch();

  const handleFaceDetected = useCallback(async (descriptor: Float32Array) => {
    // Prevent rapid-fire scans
    const now = Date.now();
    if (cooldownRef.current || now - lastScanTimeRef.current < 2000) {
      return;
    }
    
    if (isProcessing || faceMatchMutation.isPending) {
      return;
    }

    lastScanTimeRef.current = now;
    cooldownRef.current = true;

    try {
      const match = await faceMatchMutation.mutateAsync(descriptor);
      
      if (match) {
        setScanResult({
          type: 'success',
          message: `Voluntário identificado!`,
          volunteerName: match.volunteer_name,
        });
        
        // Trigger check-in
        onCheckIn({
          volunteerId: match.volunteer_id,
          volunteerName: match.volunteer_name,
          planningCenterId: match.planning_center_id,
          source: match.source,
        });
        
        // Reset cooldown after successful scan
        setTimeout(() => {
          cooldownRef.current = false;
          setScanResult(null);
        }, 3000);
      } else {
        setScanResult({
          type: 'not_found',
          message: 'Rosto não cadastrado no sistema',
        });
        
        setTimeout(() => {
          cooldownRef.current = false;
          setScanResult(null);
        }, 2000);
      }
    } catch (error) {
      setScanResult({
        type: 'error',
        message: 'Erro ao buscar correspondência',
      });
      
      setTimeout(() => {
        cooldownRef.current = false;
        setScanResult(null);
      }, 2000);
    }
  }, [faceMatchMutation, isProcessing, onCheckIn]);

  const {
    isLoading: modelsLoading,
    isReady,
    error: cameraError,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    isCameraActive,
    faceDetected,
  } = useFaceDetection({
    onFaceDetected: handleFaceDetected,
    autoDetect: isScanning,
    detectionInterval: 800,
  });

  const handleToggleScanner = useCallback(async () => {
    if (isCameraActive) {
      stopCamera();
      setIsScanning(false);
      setScanResult(null);
    } else {
      await startCamera();
      setIsScanning(true);
    }
  }, [isCameraActive, startCamera, stopCamera]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Scan className="h-4 w-4" />
          Scanner Facial
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Loading models */}
        {modelsLoading && (
          <div className="flex flex-col items-center justify-center py-8 gap-3 bg-muted rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Carregando modelos de detecção...</p>
            <p className="text-xs text-muted-foreground">Isso pode levar alguns segundos</p>
          </div>
        )}

        {/* Error state */}
        {cameraError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{cameraError}</AlertDescription>
          </Alert>
        )}

        {/* Camera view */}
        {isReady && !modelsLoading && (
          <FaceCamera
            videoRef={videoRef}
            canvasRef={canvasRef}
            isCameraActive={isCameraActive}
            faceDetected={faceDetected}
          />
        )}

        {/* Scan result */}
        {scanResult && (
          <Alert
            variant={scanResult.type === 'success' ? 'default' : 'destructive'}
            className={scanResult.type === 'success' ? 'border-primary bg-primary/10' : ''}
          >
            {scanResult.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            ) : scanResult.type === 'not_found' ? (
              <UserX className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              <div className="font-medium">
                {scanResult.volunteerName || scanResult.message}
              </div>
              {scanResult.volunteerName && (
                <div className="text-xs mt-1">{scanResult.message}</div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Processing indicator */}
        {(isProcessing || faceMatchMutation.isPending) && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Processando...
          </div>
        )}

        {/* Toggle button */}
        {isReady && !modelsLoading && (
          <Button
            onClick={handleToggleScanner}
            variant={isCameraActive ? 'destructive' : 'default'}
            className="w-full"
            disabled={isProcessing}
          >
            <Camera className="h-4 w-4 mr-2" />
            {isCameraActive ? 'Parar Scanner' : 'Iniciar Scanner'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
