import { useLastSync } from '@/hooks/useLastSync';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

export function LastSyncIndicator() {
  const { data: lastSync, isLoading } = useLastSync();

  if (isLoading) {
    return (
      <Card className="border-muted">
        <CardContent className="flex items-center gap-3 py-3 px-4">
          <Skeleton className="h-5 w-5 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!lastSync) {
    return (
      <Card className="border-amber-500/50 bg-amber-500/5">
        <CardContent className="flex items-center gap-3 py-3 px-4">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <p className="font-medium text-sm">Nenhuma sincronização</p>
            <p className="text-xs text-muted-foreground">
              Sincronize com o Planning Center
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const timeAgo = formatDistanceToNow(new Date(lastSync.created_at), {
    addSuffix: true,
    locale: ptBR,
  });

  const isAutomatic = lastSync.sync_type === 'automatic';
  const isSuccess = lastSync.status === 'success';

  return (
    <Card className={isSuccess ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}>
      <CardContent className="flex items-center gap-3 py-3 px-4">
        <div className={`p-1.5 rounded-full ${isSuccess ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
          {isSuccess ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm truncate">
              Última sincronização
            </p>
            {isAutomatic && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                AUTO
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span className="truncate">{timeAgo}</span>
            <span className="text-muted-foreground/50">•</span>
            <span>{lastSync.services_synced} cultos</span>
          </div>
        </div>
        <RefreshCw className="h-4 w-4 text-muted-foreground shrink-0" />
      </CardContent>
    </Card>
  );
}
