import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">
          Olá, {profile?.full_name?.split(' ')[0] || 'Voluntário'}!
        </h1>
        <p className="text-muted-foreground mt-1">
          {isLeader ? 'Área do Líder' : 'Área do Voluntário'}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLeader ? (
          <>
            <Link to="/checkin">
              <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Check-in</CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{todaysServices?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">cultos hoje</p>
                </CardContent>
              </Card>
            </Link>
            <Link to="/schedules">
              <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Escalas</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">Ver todas</p>
                  <p className="text-xs text-muted-foreground">escalas e voluntários</p>
                </CardContent>
              </Card>
            </Link>
            <Link to="/reports">
              <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Relatórios</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">Análises</p>
                  <p className="text-xs text-muted-foreground">frequência e presença</p>
                </CardContent>
              </Card>
            </Link>
            <Card 
              className="hover:bg-accent transition-colors cursor-pointer h-full"
              onClick={handleSync}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Sincronizar</CardTitle>
                {syncMutation.isPending ? (
                  <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                )}
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">Planning Center</p>
                <p className="text-xs text-muted-foreground">importar escalas</p>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Link to="/my-qrcode">
              <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Meu QR Code</CardTitle>
                  <QrCode className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">Exibir</p>
                  <p className="text-xs text-muted-foreground">para fazer check-in</p>
                </CardContent>
              </Card>
            </Link>
            <Link to="/schedules">
              <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Minhas Escalas</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{upcomingSchedules?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">próximas escalas</p>
                </CardContent>
              </Card>
            </Link>
          </>
        )}
      </div>

      {/* Today's Services */}
      {todaysServices && todaysServices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Cultos de Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todaysServices.map((service) => (
                <div 
                  key={service.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">{service.name}</p>
                    {service.service_type_name && (
                      <p className="text-sm text-muted-foreground">{service.service_type_name}</p>
                    )}
                  </div>
                  <Badge variant="outline">
                    {format(new Date(service.scheduled_at), 'HH:mm', { locale: ptBR })}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Schedules for Volunteers */}
      {!isLeader && upcomingSchedules && upcomingSchedules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Próximas Escalas
            </CardTitle>
            <CardDescription>Suas próximas participações</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingSchedules.map((schedule) => (
                <div 
                  key={schedule.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">{schedule.service.name}</p>
                    <div className="flex gap-2 mt-1">
                      {schedule.team_name && (
                        <Badge variant="secondary" className="text-xs">{schedule.team_name}</Badge>
                      )}
                      {schedule.position_name && (
                        <Badge variant="outline" className="text-xs">{schedule.position_name}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {format(new Date(schedule.service.scheduled_at), 'dd/MM', { locale: ptBR })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(schedule.service.scheduled_at), 'HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link to="/schedules">Ver todas as escalas</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
