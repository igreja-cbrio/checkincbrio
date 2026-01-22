import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FaceCamera } from './FaceCamera';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import { useFaceEnrollment } from '@/hooks/useFaceEnrollment';
import { Camera, Loader2, AlertCircle, CheckCircle2, User } from 'lucide-react';

interface Volunteer {
  id: string;
  full_name: string;
  planning_center_id?: string | null;
  source: 'profile' | 'volunteer_qrcode';
  avatar_url?: string | null;
}

interface FaceEnrollmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  volunteer: Volunteer | null;
}

export function FaceEnrollmentDialog({
  open,
  onOpenChange,
  volunteer,
}: FaceEnrollmentDialogProps) {
  const [capturedDescriptor, setCapturedDescriptor] = useState<Float32Array | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<Blob | null>(null);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);

  const {
    isLoading: modelsLoading,
    isReady,
    error: cameraError,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    detectFace,
    isCameraActive,
    faceDetected,
  } = useFaceDetection({ autoDetect: true, detectionInterval: 300 });
  const queryClient = useQueryClient();
  const enrollmentMutation = useFaceEnrollment();

  const handleStartCamera = useCallback(async () => {
    setCapturedDescriptor(null);
    setCapturedPhoto(null);
    setCapturedPhotoUrl(null);
    await startCamera();
  }, [startCamera]);

  const handleCapture = useCallback(async () => {
    const descriptor = await detectFace();
    if (descriptor && videoRef.current) {
      setCapturedDescriptor(descriptor);
      
      // Capture photo from video
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Flip horizontally to match what user sees
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            setCapturedPhoto(blob);
            setCapturedPhotoUrl(URL.createObjectURL(blob));
          }
        }, 'image/jpeg', 0.9);
      }
      
      stopCamera();
    }
  }, [detectFace, stopCamera, videoRef]);

  const handleRetry = useCallback(() => {
    setCapturedDescriptor(null);
    setCapturedPhoto(null);
    if (capturedPhotoUrl) {
      URL.revokeObjectURL(capturedPhotoUrl);
      setCapturedPhotoUrl(null);
    }
    startCamera();
  }, [startCamera, capturedPhotoUrl]);

  const handleSave = useCallback(async () => {
    if (!volunteer || !capturedDescriptor) return;

    await enrollmentMutation.mutateAsync({
      volunteerId: volunteer.id,
      volunteerName: volunteer.full_name,
      planningCenterId: volunteer.planning_center_id || undefined,
      source: volunteer.source,
      faceDescriptor: capturedDescriptor,
      photoBlob: capturedPhoto || undefined,
    });

    // Invalidate cache so the "Facial" badge appears immediately
    queryClient.invalidateQueries({ queryKey: ['volunteers-qrcodes'] });

    onOpenChange(false);
  }, [volunteer, capturedDescriptor, capturedPhoto, enrollmentMutation, onOpenChange, queryClient]);

  const handleClose = useCallback(() => {
    stopCamera();
    setCapturedDescriptor(null);
    setCapturedPhoto(null);
    if (capturedPhotoUrl) {
      URL.revokeObjectURL(capturedPhotoUrl);
      setCapturedPhotoUrl(null);
    }
    onOpenChange(false);
  }, [stopCamera, onOpenChange, capturedPhotoUrl]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Cadastrar Rosto
          </DialogTitle>
          <DialogDescription>
            {volunteer?.full_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Loading models */}
          {modelsLoading && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Carregando modelos de detecção...</p>
            </div>
          )}

          {/* Error state */}
          {cameraError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{cameraError}</AlertDescription>
            </Alert>
          )}

          {/* Camera view or captured photo */}
          {isReady && !modelsLoading && (
            <>
              {capturedPhotoUrl ? (
                <div className="relative rounded-lg overflow-hidden aspect-[3/4] bg-muted">
                  <img
                    src={capturedPhotoUrl}
                    alt="Foto capturada"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
                    <div className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary/90 text-primary-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Foto capturada
                    </div>
                  </div>
                </div>
              ) : (
                <FaceCamera
                  videoRef={videoRef}
                  canvasRef={canvasRef}
                  isCameraActive={isCameraActive}
                  faceDetected={faceDetected}
                />
              )}
            </>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            {!isCameraActive && !capturedDescriptor && isReady && (
              <Button onClick={handleStartCamera} className="flex-1">
                <Camera className="h-4 w-4 mr-2" />
                Iniciar Câmera
              </Button>
            )}

            {isCameraActive && !capturedDescriptor && (
              <Button
                onClick={handleCapture}
                disabled={!faceDetected}
                className="flex-1"
              >
                <Camera className="h-4 w-4 mr-2" />
                Capturar Foto
              </Button>
            )}

            {capturedDescriptor && (
              <>
                <Button variant="outline" onClick={handleRetry} className="flex-1">
                  Tentar Novamente
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={enrollmentMutation.isPending}
                  className="flex-1"
                >
                  {enrollmentMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Salvar
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
