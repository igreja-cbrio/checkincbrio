import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as faceapi from '@vladmandic/face-api';
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
import { Camera, Loader2, AlertCircle, CheckCircle2, User, SwitchCamera, ImagePlus } from 'lucide-react';

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
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    facingMode,
    switchCamera,
  } = useFaceDetection({ autoDetect: true, detectionInterval: 300 });
  const queryClient = useQueryClient();
  const enrollmentMutation = useFaceEnrollment();

  const handleStartCamera = useCallback(async () => {
    setCapturedDescriptor(null);
    setCapturedPhoto(null);
    setCapturedPhotoUrl(null);
    setImageError(null);
    await startCamera();
  }, [startCamera]);

  const handleSwitchCamera = useCallback(async () => {
    await switchCamera();
  }, [switchCamera]);

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
        // Flip horizontally only for front camera
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
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
  }, [detectFace, stopCamera, videoRef, facingMode]);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    setImageError(null);
    stopCamera();

    try {
      // Create an image element to load the file
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Falha ao carregar a imagem'));
        img.src = objectUrl;
      });

      // Detect face in the image
      const detection = await faceapi
        .detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setImageError('Nenhum rosto detectado na imagem. Por favor, escolha outra foto.');
        URL.revokeObjectURL(objectUrl);
        setIsProcessingImage(false);
        return;
      }

      // Store the descriptor
      setCapturedDescriptor(detection.descriptor);
      
      // Convert the file to a blob for upload
      const arrayBuffer = await file.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: file.type });
      setCapturedPhoto(blob);
      setCapturedPhotoUrl(objectUrl);
      
    } catch (error) {
      console.error('Error processing image:', error);
      setImageError('Erro ao processar a imagem. Tente novamente.');
    } finally {
      setIsProcessingImage(false);
      // Reset the input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [stopCamera]);

  const handleRetry = useCallback(() => {
    setCapturedDescriptor(null);
    setCapturedPhoto(null);
    setImageError(null);
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
    setImageError(null);
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

        {/* Hidden file input */}
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="space-y-4">
          {/* Loading models */}
          {modelsLoading && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Carregando modelos de detecção...</p>
            </div>
          )}

          {/* Processing image from gallery */}
          {isProcessingImage && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Processando imagem...</p>
            </div>
          )}

          {/* Error states */}
          {(cameraError || imageError) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{cameraError || imageError}</AlertDescription>
            </Alert>
          )}

          {/* Camera view or captured photo */}
          {isReady && !modelsLoading && !isProcessingImage && (
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
                <div className="relative">
                  <FaceCamera
                    videoRef={videoRef}
                    canvasRef={canvasRef}
                    isCameraActive={isCameraActive}
                    faceDetected={faceDetected}
                  />
                  {/* Switch camera button */}
                  {isCameraActive && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute top-2 right-2 bg-background/80 backdrop-blur"
                      onClick={handleSwitchCamera}
                    >
                      <SwitchCamera className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            {!isCameraActive && !capturedDescriptor && isReady && !isProcessingImage && (
              <>
                <div className="flex gap-2">
                  <Button onClick={handleStartCamera} className="flex-1">
                    <Camera className="h-4 w-4 mr-2" />
                    Usar Câmera
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1"
                  >
                    <ImagePlus className="h-4 w-4 mr-2" />
                    Importar Foto
                  </Button>
                </div>
              </>
            )}

            {isCameraActive && !capturedDescriptor && (
              <Button
                onClick={handleCapture}
                disabled={!faceDetected}
                className="w-full"
              >
                <Camera className="h-4 w-4 mr-2" />
                Capturar Foto
              </Button>
            )}

            {capturedDescriptor && (
              <div className="flex gap-2">
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
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
