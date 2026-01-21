import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAttendanceReport, useServiceReport } from '@/hooks/useReports';
import { useUnscheduledReport } from '@/hooks/useUnscheduledReport';
import { useTeams } from '@/hooks/useTeams';
import { Loader2, TrendingUp, Users, Calendar, AlertTriangle, History, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Period = 'week' | 'month' | '3months';

export default function ReportsPage() {
  const { isLeader } = useAuth();
  const [period, setPeriod] = useState<Period>('month');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  
  const { data: teams, isLoading: loadingTeams } = useTeams();
  const teamFilter = selectedTeam === 'all' ? undefined : selectedTeam;
  
  const { data: attendanceData, isLoading: loadingAttendance } = useAttendanceReport(period, teamFilter);
  const { data: serviceData, isLoading: loadingServices } = useServiceReport(period, teamFilter);
  const { data: unscheduledData, isLoading: loadingUnscheduled } = useUnscheduledReport(period);

  if (!isLeader) {
    return <Navigate to="/dashboard" replace />;
  }

  const isLoading = loadingAttendance || loadingServices || loadingUnscheduled || loadingTeams;

  // Calculate summary stats
  const totalScheduled = serviceData?.reduce((acc, s) => acc + s.total_scheduled, 0) || 0;
  const totalCheckedIn = serviceData?.reduce((acc, s) => acc + s.total_checked_in, 0) || 0;
  const overallRate = totalScheduled > 0 ? Math.round((totalCheckedIn / totalScheduled) * 100) : 0;
  const totalServices = serviceData?.length || 0;
  const unscheduledCount = unscheduledData?.length || 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-sm text-muted-foreground">Análise de presença</p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedTeam} onValueChange={setSelectedTeam}>
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Equipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Equipes</SelectItem>
              {teams?.map((team) => (
                <SelectItem key={team} value={team}>
                  {team}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Semana</SelectItem>
              <SelectItem value="month">Mês</SelectItem>
              <SelectItem value="3months">3 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Card>
              <CardContent className="py-4 text-center">
                <TrendingUp className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-xl font-bold">{overallRate}%</p>
                <p className="text-xs text-muted-foreground">Taxa</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="py-4 text-center">
                <Users className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-xl font-bold">{attendanceData?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Voluntários</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="py-4 text-center">
                <Calendar className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-xl font-bold">{totalServices}</p>
                <p className="text-xs text-muted-foreground">Cultos</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4 text-center">
                <AlertTriangle className="h-5 w-5 mx-auto text-amber-500 mb-1" />
                <p className="text-xl font-bold">{unscheduledCount}</p>
                <p className="text-xs text-muted-foreground">Sem escala</p>
              </CardContent>
            </Card>
          </div>

          {/* Unscheduled Check-ins */}
          {unscheduledData && unscheduledData.length > 0 && (
            <Card className="border-amber-200 dark:border-amber-900">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Check-ins sem Escala
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {unscheduledData.slice(0, 10).map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.volunteer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.service_name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(item.checked_in_at), "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          item.source === 'system' 
                            ? 'border-green-500 text-green-600' 
                            : 'border-blue-500 text-blue-600'
                        }`}
                      >
                        {item.source === 'system' ? 'Sistema' : 'PC'}
                      </Badge>
                      <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                        {item.method === 'qr_code' ? 'QR' : 'Manual'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Top Volunteers */}
          {attendanceData && attendanceData.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Top Voluntários</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {attendanceData.slice(0, 10).map((item, index) => {
                  const historyUrl = item.volunteer_id 
                    ? `/history/${item.volunteer_id}` 
                    : `/history/by-name/${encodeURIComponent(item.volunteer_name)}`;
                  
                  return (
                    <Link 
                      key={item.volunteer_name} 
                      to={historyUrl}
                      className="flex items-center justify-between py-2 border-b last:border-0 hover:bg-muted/50 -mx-2 px-2 rounded transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-sm font-medium text-muted-foreground w-5 shrink-0">
                          {index + 1}
                        </span>
                        <span className="text-sm font-medium truncate">
                          {item.volunteer_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {item.total_checked_in}/{item.total_scheduled}
                        </span>
                        <Badge 
                          variant={item.attendance_rate >= 80 ? 'default' : item.attendance_rate >= 50 ? 'secondary' : 'destructive'}
                          className="text-xs"
                        >
                          {Math.round(item.attendance_rate)}%
                        </Badge>
                        <History className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Services Report */}
          {serviceData && serviceData.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Por Culto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {serviceData.slice(0, 10).map((service, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{service.service_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(service.scheduled_at), "dd/MM HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {service.total_checked_in}/{service.total_scheduled}
                      </span>
                      <Badge 
                        variant={service.attendance_rate >= 80 ? 'default' : service.attendance_rate >= 50 ? 'secondary' : 'destructive'}
                        className="text-xs"
                      >
                        {Math.round(service.attendance_rate)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {(!attendanceData || attendanceData.length === 0) && (!serviceData || serviceData.length === 0) && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  Nenhum dado disponível
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
