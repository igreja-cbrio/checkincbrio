import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, QrCode, UserCheck, BarChart3, RefreshCw, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTodaysServices } from '@/hooks/useServices';
import { useMySchedules } from '@/hooks/useSchedules';
import { useSyncPlanningCenter } from '@/hooks/useSyncPlanningCenter';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { profile, isLeader, user } = useAuth();
  const { data: todaysServices } = useTodaysServices();
  const { data: mySchedules } = useMySchedules(user?.id);
  const syncMutation = useSyncPlanningCenter();

  const upcomingSchedules = mySchedules?.filter(
    s => new Date(s.service.scheduled_at) >= new Date()
  ).slice(0, 3);

  const handleSync = async () => {
    try {
      const result = await syncMutation.mutateAsync();
      toast.success(`Sincronização concluída! ${result.services} cultos, ${result.newSchedules} novas escalas.`);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao sincronizar');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Olá, {profile?.full_name?.split(' ')[0] || 'Voluntário'}!
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isLeader ? 'Área do Líder' : 'Área do Voluntário'}
        </p>
      </div>

      {/* Quick Actions - Mobile Grid */}
      <div className="grid grid-cols-2 gap-3">
        {isLeader ? (
          <>
            <Link to="/checkin">
              <Card className="h-full active:scale-[0.98] transition-transform">
                <CardContent className="flex flex-col items-center justify-center py-6">
                  <UserCheck className="h-8 w-8 text-primary mb-2" />
                  <p className="font-medium text-center">Check-in</p>
                  <p className="text-xs text-muted-foreground">{todaysServices?.length || 0} cultos hoje</p>
                </CardContent>
              </Card>
            </Link>
            <Link to="/schedules">
              <Card className="h-full active:scale-[0.98] transition-transform">
                <CardContent className="flex flex-col items-center justify-center py-6">
                  <Calendar className="h-8 w-8 text-primary mb-2" />
                  <p className="font-medium text-center">Escalas</p>
                  <p className="text-xs text-muted-foreground">Ver todas</p>
                </CardContent>
              </Card>
            </Link>
            <Link to="/reports">
              <Card className="h-full active:scale-[0.98] transition-transform">
                <CardContent className="flex flex-col items-center justify-center py-6">
                  <BarChart3 className="h-8 w-8 text-primary mb-2" />
                  <p className="font-medium text-center">Relatórios</p>
                  <p className="text-xs text-muted-foreground">Análises</p>
                </CardContent>
              </Card>
            </Link>
            <Card 
              className="h-full active:scale-[0.98] transition-transform cursor-pointer"
              onClick={handleSync}
            >
              <CardContent className="flex flex-col items-center justify-center py-6">
                {syncMutation.isPending ? (
                  <Loader2 className="h-8 w-8 text-primary mb-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-8 w-8 text-primary mb-2" />
                )}
                <p className="font-medium text-center">Sincronizar</p>
                <p className="text-xs text-muted-foreground">Planning Center</p>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Link to="/my-qrcode">
              <Card className="h-full active:scale-[0.98] transition-transform">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <QrCode className="h-10 w-10 text-primary mb-3" />
                  <p className="font-semibold text-center">Meu QR Code</p>
                  <p className="text-xs text-muted-foreground">Para check-in</p>
                </CardContent>
              </Card>
            </Link>
            <Link to="/schedules">
              <Card className="h-full active:scale-[0.98] transition-transform">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Calendar className="h-10 w-10 text-primary mb-3" />
                  <p className="font-semibold text-center">Minhas Escalas</p>
                  <p className="text-xs text-muted-foreground">{upcomingSchedules?.length || 0} próximas</p>
                </CardContent>
              </Card>
            </Link>
          </>
        )}
      </div>

      {/* Today's Services */}
      {todaysServices && todaysServices.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Cultos de Hoje
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {todaysServices.map((service) => (
              <div 
                key={service.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{service.name}</p>
                  {service.service_type_name && (
                    <p className="text-xs text-muted-foreground truncate">{service.service_type_name}</p>
                  )}
                </div>
                <Badge variant="outline" className="ml-2 shrink-0">
                  {format(new Date(service.scheduled_at), 'HH:mm', { locale: ptBR })}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Upcoming Schedules for Volunteers */}
      {!isLeader && upcomingSchedules && upcomingSchedules.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Próximas Escalas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingSchedules.map((schedule) => (
              <div 
                key={schedule.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{schedule.service.name}</p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {schedule.team_name && (
                      <Badge variant="secondary" className="text-xs">{schedule.team_name}</Badge>
                    )}
                  </div>
                </div>
                <div className="text-right ml-2 shrink-0">
                  <p className="text-sm font-medium">
                    {format(new Date(schedule.service.scheduled_at), 'dd/MM', { locale: ptBR })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(schedule.service.scheduled_at), 'HH:mm', { locale: ptBR })}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
