import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UserX, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useInactiveVolunteers, InactivityPeriod } from '@/hooks/useInactiveVolunteers';
import { Loader2 } from 'lucide-react';

interface InactiveVolunteersTabProps {
  teamFilter?: string;
  inactivityPeriod: InactivityPeriod;
}

export function InactiveVolunteersTab({ teamFilter, inactivityPeriod }: InactiveVolunteersTabProps) {
  const { data, isLoading } = useInactiveVolunteers(inactivityPeriod, teamFilter);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Badge variant="secondary" className="text-sm">
          <UserX className="h-3.5 w-3.5 mr-1" />
          {data?.length || 0} inativos
        </Badge>
      </div>

      {data && data.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserX className="h-4 w-4 text-destructive" />
              Voluntários Inativos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {data.map((vol) => {
              const historyUrl = vol.volunteer_id
                ? `/history/${vol.volunteer_id}`
                : `/history/by-name/${encodeURIComponent(vol.volunteer_name)}`;

              return (
                <Link
                  key={vol.planning_center_person_id}
                  to={historyUrl}
                  className="flex items-center justify-between py-2.5 border-b last:border-0 hover:bg-muted/50 -mx-2 px-2 rounded transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{vol.volunteer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {vol.last_team && <span>{vol.last_team} · </span>}
                      Último: {format(new Date(vol.last_activity_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="destructive" className="text-xs">
                      {vol.months_inactive} {vol.months_inactive === 1 ? 'mês' : 'meses'}
                    </Badge>
                    <History className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <UserX className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              Nenhum voluntário inativo encontrado neste período
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
