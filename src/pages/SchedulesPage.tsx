import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { useUpcomingServices } from '@/hooks/useServices';
import { useServiceSchedules, useMySchedules } from '@/hooks/useSchedules';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Calendar, ChevronDown, ChevronRight, Check, WifiOff, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export default function SchedulesPage() {
  const { isLeader, user } = useAuth();
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const isOnline = useOnlineStatus();
  
  const { data: services, isLoading: loadingServices } = useUpcomingServices();
  const { data: serviceSchedules, isLoading: loadingSchedules } = useServiceSchedules(selectedServiceId);
  const { data: mySchedules, isLoading: loadingMySchedules, isPlaceholderData } = useMySchedules(user?.id);

  if (loadingServices || loadingMySchedules) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isLeader) {
    // Volunteer view
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Minhas Escalas</h1>
            <p className="text-sm text-muted-foreground">Suas participações</p>
          </div>
          {(!isOnline || isPlaceholderData) && (
            <Badge variant="secondary" className="gap-1">
              <WifiOff className="h-3 w-3" />
              Offline
            </Badge>
          )}
        </div>

        {mySchedules && mySchedules.length > 0 ? (
          <div className="space-y-2">
            {mySchedules.map((schedule) => (
              <Card key={schedule.id}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{schedule.service.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(schedule.service.scheduled_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </p>
                      <div className="flex gap-1 mt-1">
                        {schedule.team_name && (
                          <Badge variant="secondary" className="text-xs">{schedule.team_name}</Badge>
                        )}
                      </div>
                    </div>
                    {schedule.check_in ? (
                      <Badge className="bg-green-500 shrink-0">
                        <Check className="h-3 w-3 mr-1" />
                        OK
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="shrink-0">Pendente</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Nenhuma escala</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Leader view
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Escalas</h1>
        <p className="text-sm text-muted-foreground">Visualize os cultos</p>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upcoming">Próximos</TabsTrigger>
          <TabsTrigger value="by-service">Por Culto</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-3">
          {services && services.length > 0 ? (
            <div className="space-y-2">
              {services.slice(0, 10).map((service) => (
                <ServiceScheduleCard 
                  key={service.id} 
                  serviceId={service.id} 
                  serviceName={service.name} 
                  scheduledAt={service.scheduled_at} 
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">Nenhum culto programado</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="by-service" className="mt-3 space-y-3">
          <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
            <SelectTrigger>
              <SelectValue placeholder="Escolha um culto" />
            </SelectTrigger>
            <SelectContent>
              {services?.map((service) => (
                <SelectItem key={service.id} value={service.id}>
                  {service.name} - {format(new Date(service.scheduled_at), "dd/MM HH:mm", { locale: ptBR })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedServiceId && (
            loadingSchedules ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : serviceSchedules && serviceSchedules.length > 0 ? (
              <div className="space-y-2">
                {serviceSchedules.map((schedule) => (
                  <Card key={schedule.id}>
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{schedule.volunteer_name}</p>
                            {schedule.confirmation_status === 'pending' && (
                              <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/30 shrink-0">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Não confirmou
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-1 mt-1">
                            {schedule.team_name && (
                              <Badge variant="secondary" className="text-xs">{schedule.team_name}</Badge>
                            )}
                          </div>
                        </div>
                        {schedule.check_in ? (
                          <Badge className="bg-green-500 shrink-0">
                            <Check className="h-3 w-3 mr-1" />
                            {format(new Date(schedule.check_in.checked_in_at), 'HH:mm', { locale: ptBR })}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="shrink-0">Pendente</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">Nenhum voluntário</p>
                </CardContent>
              </Card>
            )
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ServiceScheduleCard({ serviceId, serviceName, scheduledAt }: { serviceId: string; serviceName: string; scheduledAt: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: schedules, isLoading } = useServiceSchedules(serviceId);

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer active:bg-accent/50 transition-colors py-3">
            <div className="flex items-center gap-3">
              {isOpen ? (
                <ChevronDown className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <CardTitle className="text-sm font-medium truncate">{serviceName}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(scheduledAt), "EEE, dd/MM 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0">
                {schedules?.length || 0}
              </Badge>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : schedules && schedules.length > 0 ? (
              <div className="space-y-2">
                {schedules.map((schedule) => (
                  <div 
                    key={schedule.id}
                    className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/50"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="truncate">{schedule.volunteer_name}</span>
                      {schedule.confirmation_status === 'pending' && (
                        <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/30 shrink-0">
                          <AlertCircle className="h-2 w-2" />
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                      {schedule.team_name}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum voluntário
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
