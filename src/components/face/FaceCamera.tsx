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
        'relative overflow-hidden rounded-lg bg-muted aspect-[3/4]',
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
      
      {/* Oval guide overlay - much larger area */}
      {showOvalGuide && isCameraActive && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Semi-transparent overlay with oval cutout */}
          <svg className="w-full h-full" viewBox="0 0 100 133" preserveAspectRatio="none">
            <defs>
              <mask id="oval-mask">
                <rect width="100" height="133" fill="white" />
                <ellipse cx="50" cy="55" rx="38" ry="48" fill="black" />
              </mask>
            </defs>
            <rect
              width="100"
              height="133"
              fill="rgba(0,0,0,0.4)"
              mask="url(#oval-mask)"
            />
            <ellipse
              cx="50"
              cy="55"
              rx="38"
              ry="48"
              fill="none"
              stroke={faceDetected ? 'hsl(142, 76%, 36%)' : 'white'}
              strokeWidth="0.8"
              strokeDasharray={faceDetected ? '0' : '3 2'}
              className={cn(
                'transition-all duration-300',
                faceDetected && 'drop-shadow-[0_0_8px_hsl(142,76%,36%)]'
              )}
            />
          </svg>
        </div>
      )}

      {/* Status indicator */}
      {isCameraActive && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <div
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 shadow-lg',
              faceDetected
                ? 'bg-green-500 text-white'
                : 'bg-black/70 text-white backdrop-blur-sm'
            )}
          >
            {faceDetected ? '✓ Rosto detectado' : 'Posicione seu rosto'}
          </div>
        </div>
      )}

      {/* Camera inactive state */}
      {!isCameraActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="text-muted-foreground text-sm">Câmera inativa</div>
        </div>
      )}
    </div>
  );
}
