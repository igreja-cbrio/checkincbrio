import { WifiOff, RefreshCw, Wifi } from 'lucide-react';
import { useAutoSync } from '@/hooks/useAutoSync';
import { getLastSyncTime } from '@/services/offlineStorage';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const { isOnline, isSyncing } = useAutoSync();
  const lastSync = getLastSyncTime();

  // Show syncing state
  if (isSyncing) {
    return (
      <div className="bg-primary text-primary-foreground px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span>Sincronizando...</span>
      </div>
    );
  }

  // Show offline state
  if (!isOnline) {
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

  return null;
}
