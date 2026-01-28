import { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useServiceCheckIns, useServicesForHistory } from '@/hooks/useServiceCheckIns';
import { ServiceCheckInList } from '@/components/reports/ServiceCheckInList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ServiceCheckInHistoryPage() {
  const { serviceId: paramServiceId } = useParams<{ serviceId: string }>();
  const { isLeader } = useAuth();
  const [selectedServiceId, setSelectedServiceId] = useState<string>(paramServiceId || '');

  const { data: services, isLoading: loadingServices } = useServicesForHistory(60);
  const { data: checkInData, isLoading: loadingCheckIns } = useServiceCheckIns(
    selectedServiceId || paramServiceId
  );

  if (!isLeader) {
    return <Navigate to="/dashboard" replace />;
  }

  // Update selected service if URL param changes
  if (paramServiceId && paramServiceId !== selectedServiceId) {
    setSelectedServiceId(paramServiceId);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Histórico do Culto</h1>
        <p className="text-sm text-muted-foreground">Veja quem fez check-in em cada serviço</p>
      </div>

      {/* Service Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Selecione o Culto
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingServices ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando cultos...
            </div>
          ) : (
            <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um culto para ver o histórico" />
              </SelectTrigger>
              <SelectContent>
                {services?.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    <div className="flex flex-col">
                      <span>{service.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(service.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Check-in List */}
      {loadingCheckIns ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : checkInData ? (
        <ServiceCheckInList data={checkInData} />
      ) : selectedServiceId ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Nenhum dado encontrado para este culto</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Selecione um culto acima para ver o histórico de check-ins</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
