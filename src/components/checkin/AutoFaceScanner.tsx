import { useCallback, useRef, useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FaceCamera } from '@/components/face/FaceCamera';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import { useFaceMatch } from '@/hooks/useFaceEnrollment';
import { Loader2, AlertCircle, UserX, Wifi, WifiOff, Camera, SwitchCamera } from 'lucide-react';

export interface FaceMatchResult {
  volunteerId: string | null;
  volunteerName: string;
  planningCenterId: string | null;
  avatarUrl?: string | null;
  source: string;
}

interface AutoFaceScannerProps {
  onMatch: (result: FaceMatchResult) => void;
  onNotFound: () => void;
  isProcessing: boolean;
  cooldownMs?: number;
}

export function AutoFaceScanner({
  onMatch,
  onNotFound,
  isProcessing,
  cooldownMs = 5000,
}: AutoFaceScannerProps) {
  const [scanStatus, setScanStatus] = useState<'idle' | 'starting' | 'scanning' | 'processing' | 'cooldown' | 'not_found'>('idle');
  const lastScanTimeRef = useRef<number>(0);
  const cooldownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const notFoundTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const faceMatchMutation = useFaceMatch();

  const handleFaceDetected = useCallback(async (descriptor: Float32Array) => {
    const now = Date.now();
    
    // Check cooldown
    if (scanStatus !== 'scanning' || now - lastScanTimeRef.current < 2000) {
      return;
    }
    
    if (isProcessing || faceMatchMutation.isPending) {
      return;
    }

    lastScanTimeRef.current = now;
    setScanStatus('processing');

    try {
      const match = await faceMatchMutation.mutateAsync(descriptor);
      
      if (match) {
        onMatch({
          volunteerId: match.volunteer_id,
          volunteerName: match.volunteer_name,
          planningCenterId: match.planning_center_id,
          avatarUrl: match.avatar_url,
          source: match.source,
        });
        
        setScanStatus('cooldown');
        cooldownTimeoutRef.current = setTimeout(() => {
          setScanStatus('scanning');
        }, cooldownMs);
      } else {
        setScanStatus('not_found');
        onNotFound();
        
        notFoundTimeoutRef.current = setTimeout(() => {
          setScanStatus('scanning');
        }, 2000);
      }
    } catch (error) {
      console.error('Face match error:', error);
      setScanStatus('scanning');
    }
  }, [faceMatchMutation, isProcessing, onMatch, onNotFound, cooldownMs, scanStatus]);

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
    switchCamera,
  } = useFaceDetection({
    onFaceDetected: handleFaceDetected,
    autoDetect: true,
    detectionInterval: 500,
  });

  const handleSwitchCamera = useCallback(async () => {
    await switchCamera();
    if (scanStatus === 'scanning') {
      // Keep scanning after switch
    }
  }, [switchCamera, scanStatus]);

  // Handle camera start with user gesture (required for iOS Safari)
  const handleStartCamera = useCallback(async () => {
    setScanStatus('starting');
    const success = await startCamera();
    if (success) {
      setScanStatus('scanning');
    } else {
      setScanStatus('idle');
    }
  }, [startCamera]);

  // Handle visibility change (iOS kills camera when app goes to background)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isCameraActive) {
        // When going to background, stop camera
        stopCamera();
        setScanStatus('idle');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isCameraActive, stopCamera]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (cooldownTimeoutRef.current) {
        clearTimeout(cooldownTimeoutRef.current);
      }
      if (notFoundTimeoutRef.current) {
        clearTimeout(notFoundTimeoutRef.current);
      }
    };
  }, [stopCamera]);

  if (modelsLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground">Carregando modelos de detecção...</p>
        <p className="text-sm text-muted-foreground">Isso pode levar alguns segundos</p>
      </div>
    );
  }

  if (cameraError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{cameraError}</AlertDescription>
        </Alert>
        <Button onClick={handleStartCamera} className="mt-4">
          <Camera className="h-4 w-4 mr-2" />
          Tentar Novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full flex flex-col">
      {/* Camera View */}
      <div className="flex-1 relative">
        <FaceCamera
          videoRef={videoRef}
          canvasRef={canvasRef}
          isCameraActive={isCameraActive}
          faceDetected={faceDetected}
          className="h-full"
        />

        {/* Switch camera button */}
        {isCameraActive && (
          <Button
            variant="outline"
            size="icon"
            className="absolute top-4 right-4 bg-background/80 backdrop-blur z-10"
            onClick={handleSwitchCamera}
          >
            <SwitchCamera className="h-5 w-5" />
          </Button>
        )}

        {/* Start camera button overlay - for iOS Safari user gesture requirement */}
        {scanStatus === 'idle' && isReady && !isCameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-20">
            <Camera className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground mb-6">Toque para iniciar a câmera</p>
            <Button size="lg" onClick={handleStartCamera} className="text-lg px-8 py-6">
              <Camera className="h-5 w-5 mr-2" />
              Iniciar Câmera
            </Button>
          </div>
        )}

        {/* Starting camera overlay */}
        {scanStatus === 'starting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-20">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">Iniciando câmera...</p>
            <p className="text-sm text-muted-foreground mt-2">Permita o acesso quando solicitado</p>
          </div>
        )}

        {/* Status indicator */}
        {isCameraActive && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
            {scanStatus === 'scanning' && (
              <div className="flex items-center gap-2 rounded-full bg-background/80 backdrop-blur px-4 py-2 text-sm">
                <Wifi className="h-4 w-4 text-primary animate-pulse" />
                <span>Aguardando rosto...</span>
              </div>
            )}
            {scanStatus === 'processing' && (
              <div className="flex items-center gap-2 rounded-full bg-primary/90 text-primary-foreground px-4 py-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Identificando...</span>
              </div>
            )}
            {scanStatus === 'cooldown' && (
              <div className="flex items-center gap-2 rounded-full bg-background/80 backdrop-blur px-4 py-2 text-sm">
                <WifiOff className="h-4 w-4 text-muted-foreground" />
                <span>Aguarde...</span>
              </div>
            )}
            {scanStatus === 'not_found' && (
              <div className="flex items-center gap-2 rounded-full bg-destructive/90 text-destructive-foreground px-4 py-2 text-sm">
                <UserX className="h-4 w-4" />
                <span>Rosto não cadastrado</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="p-4 text-center bg-muted/50">
        <p className="text-lg font-medium">
          {isCameraActive 
            ? 'Olhe para a câmera para fazer check-in' 
            : 'Toque em "Iniciar Câmera" para começar'
          }
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {isCameraActive 
            ? 'Posicione seu rosto dentro do guia oval'
            : 'A câmera será usada para reconhecimento facial'
          }
        </p>
      </div>
    </div>
  );
}
