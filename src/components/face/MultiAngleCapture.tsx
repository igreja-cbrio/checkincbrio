import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { FaceCamera } from './FaceCamera';
import { Camera, CheckCircle2, SwitchCamera, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CapturedAngle {
  label: string;
  instruction: string;
  descriptor: Float32Array;
  photoUrl: string;
  photoBlob: Blob;
}

export const CAPTURE_ANGLES = [
  { label: 'Frontal', instruction: 'Olhe diretamente para a câmera' },
  { label: 'Esquerda', instruction: 'Vire levemente o rosto para a esquerda' },
  { label: 'Direita', instruction: 'Vire levemente o rosto para a direita' },
] as const;

interface MultiAngleCaptureProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isCameraActive: boolean;
  faceDetected: boolean;
  currentAngleIndex: number;
  capturedAngles: CapturedAngle[];
  onCapture: () => void;
  onRecapture: (index: number) => void;
  onSwitchCamera: () => void;
  isCapturing?: boolean;
}

export function MultiAngleCapture({
  videoRef,
  canvasRef,
  isCameraActive,
  faceDetected,
  currentAngleIndex,
  capturedAngles,
  onCapture,
  onRecapture,
  onSwitchCamera,
  isCapturing = false,
}: MultiAngleCaptureProps) {
  const currentAngle = CAPTURE_ANGLES[currentAngleIndex];
  const allCaptured = capturedAngles.length === CAPTURE_ANGLES.length;

  const handleThumbnailClick = useCallback((index: number) => {
    if (capturedAngles[index]) {
      onRecapture(index);
    }
  }, [capturedAngles, onRecapture]);

  return (
    <div className="space-y-4">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2">
        {CAPTURE_ANGLES.map((angle, index) => {
          const isCaptured = capturedAngles[index] !== undefined;
          const isCurrent = index === currentAngleIndex && !allCaptured;
          
          return (
            <div
              key={angle.label}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                isCaptured && "bg-primary/10 text-primary",
                isCurrent && !isCaptured && "bg-secondary text-secondary-foreground ring-2 ring-primary",
                !isCaptured && !isCurrent && "bg-muted text-muted-foreground"
              )}
            >
              {isCaptured ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <span className="w-3.5 h-3.5 rounded-full border-2 border-current" />
              )}
              {angle.label}
            </div>
          );
        })}
      </div>

      {/* Camera view or captured photos */}
      {!allCaptured ? (
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
              onClick={onSwitchCamera}
            >
              <SwitchCamera className="h-4 w-4" />
            </Button>
          )}

          {/* Current instruction */}
          {isCameraActive && currentAngle && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
              <div className="px-4 py-2 rounded-full bg-background/90 backdrop-blur text-sm font-medium text-center shadow-lg">
                <span className="text-muted-foreground">Passo {currentAngleIndex + 1}/3:</span>{' '}
                <span className="text-foreground">{currentAngle.instruction}</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* All photos captured - show grid */}
          <div className="grid grid-cols-3 gap-2">
            {capturedAngles.map((angle, index) => (
              <div
                key={index}
                className="relative aspect-[3/4] rounded-lg overflow-hidden group cursor-pointer"
                onClick={() => handleThumbnailClick(index)}
              >
                <img
                  src={angle.photoUrl}
                  alt={angle.label}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <RotateCcw className="h-5 w-5 text-white" />
                </div>
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                  <span className="px-2 py-0.5 rounded-full bg-background/80 text-xs font-medium">
                    {angle.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-center gap-2 text-sm text-primary">
            <CheckCircle2 className="h-4 w-4" />
            <span>Captura completa - precisão aumentada!</span>
          </div>
        </div>
      )}

      {/* Thumbnails of captured photos (during capture) */}
      {!allCaptured && capturedAngles.length > 0 && (
        <div className="flex justify-center gap-2">
          {CAPTURE_ANGLES.map((angle, index) => {
            const captured = capturedAngles[index];
            
            return (
              <button
                key={angle.label}
                onClick={() => captured && handleThumbnailClick(index)}
                disabled={!captured}
                className={cn(
                  "relative w-16 h-20 rounded-lg overflow-hidden border-2 transition-all",
                  captured && "border-primary cursor-pointer hover:opacity-80",
                  !captured && "border-dashed border-muted-foreground/30 bg-muted/50"
                )}
              >
                {captured ? (
                  <>
                    <img
                      src={captured.photoUrl}
                      alt={angle.label}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-0.5 right-0.5">
                      <CheckCircle2 className="h-3 w-3 text-primary bg-background rounded-full" />
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <span className="text-[10px]">{index + 1}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Capture button */}
      {!allCaptured && isCameraActive && (
        <Button
          onClick={onCapture}
          disabled={!faceDetected || isCapturing}
          className="w-full"
        >
          <Camera className="h-4 w-4 mr-2" />
          Capturar {currentAngle?.label || 'Foto'}
        </Button>
      )}
    </div>
  );
}
