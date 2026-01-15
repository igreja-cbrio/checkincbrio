import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { getLastSyncTime } from '@/services/offlineStorage';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const lastSync = getLastSyncTime();

  if (isOnline) return null;

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
      <WifiOff className="h-4 w-4" />
      <span>
        Você está offline
        {lastSync && (
          <span className="opacity-80">
            {' '}• Sincronizado {formatDistanceToNow(lastSync, { addSuffix: true, locale: ptBR })}
          </span>
        )}
      </span>
    </div>
  );
}
