import { useCallback, useRef, useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FaceCamera } from '@/components/face/FaceCamera';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import { useFaceMatch } from '@/hooks/useFaceEnrollment';
import { Loader2, AlertCircle, UserX, Wifi, WifiOff } from 'lucide-react';

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
  const [scanStatus, setScanStatus] = useState<'scanning' | 'processing' | 'cooldown' | 'not_found'>('scanning');
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
  } = useFaceDetection({
    onFaceDetected: handleFaceDetected,
    autoDetect: true,
    detectionInterval: 500,
  });

  // Auto-start camera when ready
  useEffect(() => {
    if (isReady && !isCameraActive && !modelsLoading) {
      startCamera();
    }
    
    return () => {
      stopCamera();
      if (cooldownTimeoutRef.current) {
        clearTimeout(cooldownTimeoutRef.current);
      }
      if (notFoundTimeoutRef.current) {
        clearTimeout(notFoundTimeoutRef.current);
      }
    };
  }, [isReady, isCameraActive, modelsLoading, startCamera, stopCamera]);

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

        {/* Status indicator */}
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
      </div>

      {/* Instructions */}
      <div className="p-4 text-center bg-muted/50">
        <p className="text-lg font-medium">Olhe para a câmera para fazer check-in</p>
        <p className="text-sm text-muted-foreground mt-1">
          Posicione seu rosto dentro do guia oval
        </p>
      </div>
    </div>
  );
}
