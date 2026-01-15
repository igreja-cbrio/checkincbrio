import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { QrCode, UserCheck, AlertCircle } from 'lucide-react';
import { CheckInHistoryItem } from '@/hooks/useCheckInHistory';

interface CheckInHistoryListProps {
  checkIns: CheckInHistoryItem[] | undefined;
  isLoading: boolean;
}

export function CheckInHistoryList({ checkIns, isLoading }: CheckInHistoryListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardContent className="py-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!checkIns || checkIns.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhum check-in encontrado</p>
          <p className="text-sm text-muted-foreground mt-1">
            Os check-ins aparecerão aqui quando forem registrados
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group check-ins by month
  const groupedByMonth = checkIns.reduce((acc, checkIn) => {
    const monthKey = format(new Date(checkIn.checked_in_at), 'MMMM yyyy', { locale: ptBR });
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(checkIn);
    return acc;
  }, {} as Record<string, CheckInHistoryItem[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedByMonth).map(([month, monthCheckIns]) => (
        <div key={month}>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 capitalize">
            {month}
          </h3>
          <div className="space-y-2">
            {monthCheckIns.map((checkIn) => (
              <Card key={checkIn.id}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="mt-0.5">
                        {checkIn.method === 'qr_code' ? (
                          <QrCode className="h-4 w-4 text-primary" />
                        ) : (
                          <UserCheck className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">
                          {checkIn.service?.name || 'Culto não encontrado'}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {checkIn.schedule?.team_name && (
                            <Badge variant="secondary" className="text-xs">
                              {checkIn.schedule.team_name}
                            </Badge>
                          )}
                          {checkIn.schedule?.position_name && (
                            <Badge variant="outline" className="text-xs">
                              {checkIn.schedule.position_name}
                            </Badge>
                          )}
                          {checkIn.is_unscheduled && (
                            <Badge variant="destructive" className="text-xs">
                              Sem escala
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium">
                        {format(new Date(checkIn.checked_in_at), 'dd/MM', { locale: ptBR })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(checkIn.checked_in_at), 'HH:mm', { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
