import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, Check, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ScheduleWithDetails } from '@/types';

function ConfirmationBadge({ status }: { status: string | null }) {
  if (status === 'confirmed') {
    return (
      <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
        <CheckCircle className="h-3 w-3 mr-1" />
        Confirmou
      </Badge>
    );
  }
  if (status === 'pending') {
    return (
      <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
        <AlertCircle className="h-3 w-3 mr-1" />
        Não confirmou
      </Badge>
    );
  }
  if (status === 'declined') {
    return (
      <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/30">
        <XCircle className="h-3 w-3 mr-1" />
        Recusou
      </Badge>
    );
  }
  return null;
}

interface ScheduleListProps {
  schedules: ScheduleWithDetails[];
  showService?: boolean;
}

export function ScheduleList({ schedules, showService = true }: ScheduleListProps) {
  if (schedules.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Nenhuma escala encontrada</p>
        </CardContent>
      </Card>
    );
  }

  // Group by service if showing services
  const groupedSchedules = showService
    ? schedules.reduce((acc, schedule) => {
        const serviceId = schedule.service_id;
        if (!acc[serviceId]) {
          acc[serviceId] = {
            service: schedule.service,
            schedules: [],
          };
        }
        acc[serviceId].schedules.push(schedule);
        return acc;
      }, {} as Record<string, { service: typeof schedules[0]['service']; schedules: ScheduleWithDetails[] }>)
    : null;

  if (groupedSchedules) {
    return (
      <div className="space-y-4">
        {Object.values(groupedSchedules).map(({ service, schedules: serviceSchedules }) => (
          <Card key={service.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {service.name}
              </CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(service.scheduled_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {serviceSchedules.length} voluntários
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {serviceSchedules.map((schedule) => (
                  <ScheduleItem key={schedule.id} schedule={schedule} />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {schedules.map((schedule) => (
        <Card key={schedule.id}>
          <CardContent className="py-3">
            <ScheduleItem schedule={schedule} showServiceName />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ScheduleItem({ 
  schedule, 
  showServiceName = false 
}: { 
  schedule: ScheduleWithDetails; 
  showServiceName?: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <p className="font-medium">{schedule.volunteer_name}</p>
          <ConfirmationBadge status={schedule.confirmation_status} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {showServiceName && schedule.service && (
            <Badge variant="secondary" className="text-xs">
              {format(new Date(schedule.service.scheduled_at), "dd/MM HH:mm", { locale: ptBR })} - {schedule.service.name}
            </Badge>
          )}
          {schedule.team_name && (
            <Badge variant="outline" className="text-xs">
              {schedule.team_name}
            </Badge>
          )}
          {schedule.position_name && (
            <Badge variant="outline" className="text-xs">
              {schedule.position_name}
            </Badge>
          )}
        </div>
      </div>
      
      {schedule.check_in ? (
        <Badge className="bg-green-500 hover:bg-green-500 shrink-0">
          <Check className="h-3 w-3 mr-1" />
          {format(new Date(schedule.check_in.checked_in_at), 'HH:mm', { locale: ptBR })}
        </Badge>
      ) : (
        <Badge variant="secondary" className="shrink-0">Pendente</Badge>
      )}
    </div>
  );
}
