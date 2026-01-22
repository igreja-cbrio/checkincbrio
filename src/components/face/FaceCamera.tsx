import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface FaceCameraProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isCameraActive: boolean;
  faceDetected: boolean;
  showOvalGuide?: boolean;
  className?: string;
}

export function FaceCamera({
  videoRef,
  canvasRef,
  isCameraActive,
  faceDetected,
  showOvalGuide = true,
  className,
}: FaceCameraProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Update canvas size when video loads
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      if (canvasRef.current) {
        canvasRef.current.width = video.videoWidth;
        canvasRef.current.height = video.videoHeight;
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
  }, [videoRef, canvasRef]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden rounded-lg bg-muted aspect-[4/3]',
        className
      )}
    >
      {/* Video feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
      />
      
      {/* Detection overlay canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover scale-x-[-1] pointer-events-none"
      />
      
      {/* Oval guide overlay */}
      {showOvalGuide && isCameraActive && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Semi-transparent overlay with oval cutout */}
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <mask id="oval-mask">
                <rect width="100" height="100" fill="white" />
                <ellipse cx="50" cy="45" rx="22" ry="30" fill="black" />
              </mask>
            </defs>
            <rect
              width="100"
              height="100"
              fill="rgba(0,0,0,0.5)"
              mask="url(#oval-mask)"
            />
            <ellipse
              cx="50"
              cy="45"
              rx="22"
              ry="30"
              fill="none"
              stroke={faceDetected ? 'hsl(var(--primary))' : 'white'}
              strokeWidth="0.5"
              strokeDasharray={faceDetected ? '0' : '2 1'}
              className={cn(
                'transition-all duration-300',
                faceDetected && 'animate-pulse'
              )}
            />
          </svg>
        </div>
      )}

      {/* Status indicator */}
      {isCameraActive && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
          <div
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
              faceDetected
                ? 'bg-primary/90 text-primary-foreground'
                : 'bg-muted-foreground/80 text-white'
            )}
          >
            {faceDetected ? '✓ Rosto detectado' : 'Posicione seu rosto'}
          </div>
        </div>
      )}

      {/* Camera inactive state */}
      {!isCameraActive && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-muted-foreground text-sm">Câmera inativa</div>
        </div>
      )}
    </div>
  );
}
