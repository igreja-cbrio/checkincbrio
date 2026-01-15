import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useUpcomingServices } from '@/hooks/useServices';
import { useServiceSchedules, useMySchedules } from '@/hooks/useSchedules';
import { ScheduleList } from '@/components/schedules/ScheduleList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Calendar, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function SchedulesPage() {
  const { isLeader, user } = useAuth();
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  
  const { data: services, isLoading: loadingServices } = useUpcomingServices();
  const { data: serviceSchedules, isLoading: loadingSchedules } = useServiceSchedules(selectedServiceId);
  const { data: mySchedules, isLoading: loadingMySchedules } = useMySchedules(user?.id);

  if (loadingServices || loadingMySchedules) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isLeader) {
    // Volunteer view - show their schedules
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Minhas Escalas</h1>
          <p className="text-muted-foreground">Suas próximas participações nos cultos</p>
        </div>

        <ScheduleList schedules={mySchedules || []} showService={false} />
      </div>
    );
  }

  // Leader view - show all schedules by service
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Escalas</h1>
        <p className="text-muted-foreground">Visualize as escalas de cada culto</p>
      </div>

      <Tabs defaultValue="by-service" className="w-full">
        <TabsList>
          <TabsTrigger value="by-service">Por Culto</TabsTrigger>
          <TabsTrigger value="upcoming">Próximos</TabsTrigger>
        </TabsList>

        <TabsContent value="by-service" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Selecione o Culto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um culto" />
                </SelectTrigger>
                <SelectContent>
                  {services?.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} - {format(new Date(service.scheduled_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedServiceId && (
            loadingSchedules ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScheduleList schedules={serviceSchedules || []} showService={false} />
            )
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="mt-4">
          {services && services.length > 0 ? (
            <div className="space-y-4">
              {services.slice(0, 5).map((service) => (
                <ServiceScheduleCard key={service.id} serviceId={service.id} serviceName={service.name} scheduledAt={service.scheduled_at} />
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
          <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  {serviceName}
                </CardTitle>
                <p className="text-sm text-muted-foreground ml-6">
                  {format(new Date(scheduledAt), "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
              <span className="text-sm text-muted-foreground">
                {schedules?.length || 0} voluntários
              </span>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
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
                    <span>{schedule.volunteer_name}</span>
                    <span className="text-muted-foreground">
                      {schedule.team_name} {schedule.position_name && `• ${schedule.position_name}`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum voluntário escalado
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
