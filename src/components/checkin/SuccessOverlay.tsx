import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuccessOverlayProps {
  volunteerName: string;
  avatarUrl?: string | null;
  teamName?: string | null;
  positionName?: string | null;
  onDismiss: () => void;
  duration?: number;
}

export function SuccessOverlay({
  volunteerName,
  avatarUrl,
  teamName,
  positionName,
  onDismiss,
  duration = 3000,
}: SuccessOverlayProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    requestAnimationFrame(() => setIsVisible(true));

    // Start exit animation before dismissing
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, duration - 300);

    // Dismiss after duration
    const dismissTimer = setTimeout(() => {
      onDismiss();
    }, duration);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(dismissTimer);
    };
  }, [duration, onDismiss]);

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center',
        'bg-primary/95 text-primary-foreground',
        'transition-opacity duration-300',
        isVisible && !isExiting ? 'opacity-100' : 'opacity-0'
      )}
    >
      {/* Success Icon */}
      <div
        className={cn(
          'mb-6 transition-all duration-500',
          isVisible ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
        )}
      >
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary-foreground/30" />
          <div className="relative rounded-full bg-primary-foreground p-4">
            <CheckCircle2 className="h-16 w-16 text-primary" />
          </div>
        </div>
      </div>

      {/* Avatar */}
      {avatarUrl && (
        <div
          className={cn(
            'mb-6 transition-all duration-500 delay-100',
            isVisible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
          )}
        >
          <img
            src={avatarUrl}
            alt={volunteerName}
            className="h-24 w-24 rounded-full border-4 border-primary-foreground object-cover shadow-lg"
          />
        </div>
      )}

      {/* Thank you message */}
      <div
        className={cn(
          'text-center transition-all duration-500 delay-200',
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        )}
      >
        <p className="text-lg font-medium opacity-90">Obrigado por servir,</p>
        <h2 className="mt-1 text-3xl font-bold">{volunteerName}!</h2>
      </div>

      {/* Team/Position info */}
      {(teamName || positionName) && (
        <div
          className={cn(
            'mt-4 text-center transition-all duration-500 delay-300',
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          )}
        >
          <p className="text-lg opacity-80">
            {teamName}
            {teamName && positionName && ' • '}
            {positionName}
          </p>
        </div>
      )}

      {/* Progress indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <div className="h-1 w-32 overflow-hidden rounded-full bg-primary-foreground/30">
          <div
            className="h-full bg-primary-foreground transition-all ease-linear"
            style={{
              width: '100%',
              animation: `shrink ${duration}ms linear forwards`,
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
