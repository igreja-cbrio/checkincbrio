import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, AlertTriangle, Filter, Users, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ServiceCheckInSummary, ServiceCheckInItem } from '@/hooks/useServiceCheckIns';

interface ServiceCheckInListProps {
  data: ServiceCheckInSummary;
}

export function ServiceCheckInList({ data }: ServiceCheckInListProps) {
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredItems = data.items.filter((item) => {
    const teamMatch = teamFilter === 'all' || item.teamName === teamFilter;
    const statusMatch = 
      statusFilter === 'all' ||
      (statusFilter === 'checked_in' && item.checkedIn) ||
      (statusFilter === 'pending' && !item.checkedIn);
    return teamMatch && statusMatch;
  });

  const getStatusBadge = (item: ServiceCheckInItem) => {
    if (item.confirmationStatus === 'unscheduled') {
      return (
        <Badge variant="outline" className="border-amber-500 text-amber-600 text-xs">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Sem escala
        </Badge>
      );
    }

    if (item.checkedIn) {
      return (
        <Badge variant="default" className="text-xs">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {item.checkInTime 
            ? format(new Date(item.checkInTime), 'HH:mm', { locale: ptBR })
            : 'Check-in'}
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="text-xs">
        <Clock className="h-3 w-3 mr-1" />
        Aguardando
      </Badge>
    );
  };

  const getMethodBadge = (method: string | null) => {
    if (!method) return null;
    
    const labels: Record<string, string> = {
      qr_code: 'QR',
      manual: 'Manual',
      facial: 'Facial',
    };

    return (
      <Badge variant="outline" className="text-xs">
        {labels[method] || method}
      </Badge>
    );
  };

  const getConfirmationBadge = (status: string) => {
    if (status === 'unscheduled') return null;

    const configs: Record<string, { label: string; className: string }> = {
      confirmed: { label: 'Confirmado', className: 'border-green-500 text-green-600' },
      pending: { label: 'Pendente', className: 'border-yellow-500 text-yellow-600' },
      scheduled: { label: 'Escalado', className: 'border-blue-500 text-blue-600' },
      declined: { label: 'Recusou', className: 'border-red-500 text-red-600' },
      unknown: { label: 'Desconhecido', className: 'border-gray-500 text-gray-600' },
    };

    const config = configs[status] || configs.unknown;
    return (
      <Badge variant="outline" className={`text-xs ${config.className}`}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-lg">{data.serviceName}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {data.serviceTypeName && `${data.serviceTypeName} • `}
                {format(new Date(data.scheduledAt), "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">
                {data.totalCheckedIn}/{data.totalScheduled}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Taxa de presença</span>
              <span className="font-medium">{Math.round(data.attendanceRate)}%</span>
            </div>
            <Progress value={data.attendanceRate} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Equipe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Equipes</SelectItem>
            {data.teams.map((team) => (
              <SelectItem key={team} value={team}>
                {team}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="checked_in">Com check-in</SelectItem>
            <SelectItem value="pending">Sem check-in</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Volunteers List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Voluntários ({filteredItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {filteredItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum voluntário encontrado
            </p>
          ) : (
            filteredItems.map((item) => {
              const historyUrl = item.volunteerId 
                ? `/history/${item.volunteerId}` 
                : `/history/by-name/${encodeURIComponent(item.volunteerName)}`;

              return (
                <Link
                  key={item.scheduleId}
                  to={historyUrl}
                  className="flex items-center justify-between py-3 px-2 -mx-2 border-b last:border-0 hover:bg-muted/50 rounded transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.volunteerName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {item.teamName && (
                        <span className="text-xs text-muted-foreground">
                          {item.teamName}
                          {item.positionName && ` - ${item.positionName}`}
                        </span>
                      )}
                      {getConfirmationBadge(item.confirmationStatus)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {getMethodBadge(item.checkInMethod)}
                    {getStatusBadge(item)}
                  </div>
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
