import { useState } from 'react';
import { InactivityCriteria } from '@/hooks/useInactiveVolunteers';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAttendanceReport, useServiceReport, ReportPeriod } from '@/hooks/useReports';
import { useUnscheduledReport, UnscheduledPeriod } from '@/hooks/useUnscheduledReport';
import { useWeeklyReport, WeeklyPeriod } from '@/hooks/useWeeklyReport';
import { useTeams } from '@/hooks/useTeams';
import { Loader2, TrendingUp, Users, Calendar, AlertTriangle, History, Filter, UserX, Thermometer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { WeeklyReportCard } from '@/components/reports/WeeklyReportCard';
import { ReportPrintButton } from '@/components/reports/ReportPrintButton';
import { PeriodFilter, DateRange } from '@/components/reports/PeriodFilter';
import { InactiveVolunteersTab } from '@/components/reports/InactiveVolunteersTab';
import { VolunteerThermometer } from '@/components/reports/VolunteerThermometer';
import { useVolunteerThermometer, ThermometerPeriod } from '@/hooks/useVolunteerThermometer';

export default function ReportsPage() {
  const { isLeader } = useAuth();
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [weeklyPeriod, setWeeklyPeriod] = useState<WeeklyPeriod>('last_week');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('weekly');
  
  // Custom date ranges
  const [weeklyCustomRange, setWeeklyCustomRange] = useState<DateRange>({
    startDate: subWeeks(new Date(), 1),
    endDate: new Date(),
  });
  const [overviewCustomRange, setOverviewCustomRange] = useState<DateRange>({
    startDate: subWeeks(new Date(), 1),
    endDate: new Date(),
  });
  const [thermometerPeriod, setThermometerPeriod] = useState<ThermometerPeriod>('month');
  const [thermometerCustomRange, setThermometerCustomRange] = useState<DateRange>({
    startDate: subWeeks(new Date(), 1),
    endDate: new Date(),
  });
  const [inactivePeriod, setInactivePeriod] = useState<string>('1month');
  const [inactivityCriteria, setInactivityCriteria] = useState<InactivityCriteria>('checkin');
  
  const { data: teams, isLoading: loadingTeams } = useTeams();
  const teamFilter = selectedTeam === 'all' ? undefined : selectedTeam;
  
  const { data: attendanceData, isLoading: loadingAttendance } = useAttendanceReport(
    period, 
    teamFilter,
    period === 'custom' ? overviewCustomRange : undefined
  );
  const { data: serviceData, isLoading: loadingServices } = useServiceReport(
    period, 
    teamFilter,
    period === 'custom' ? overviewCustomRange : undefined
  );
  const { data: unscheduledData, isLoading: loadingUnscheduled } = useUnscheduledReport(
    period as UnscheduledPeriod,
    period === 'custom' ? overviewCustomRange : undefined
  );
  const { data: weeklyData, isLoading: loadingWeekly } = useWeeklyReport(
    weeklyPeriod, 
    teamFilter,
    weeklyPeriod === 'custom' ? weeklyCustomRange : undefined
  );
  const { data: thermometerData, isLoading: loadingThermometer } = useVolunteerThermometer(
    thermometerPeriod,
    teamFilter,
    thermometerPeriod === 'custom' ? thermometerCustomRange : undefined
  );

  if (!isLeader) {
    return <Navigate to="/dashboard" replace />;
  }

  const isLoading = loadingAttendance || loadingServices || loadingUnscheduled || loadingTeams || loadingWeekly || loadingThermometer;

  // Calculate summary stats
  const totalScheduled = serviceData?.reduce((acc, s) => acc + s.total_scheduled, 0) || 0;
  const totalCheckedIn = serviceData?.reduce((acc, s) => acc + s.total_checked_in, 0) || 0;
  const overallRate = totalScheduled > 0 ? Math.round((totalCheckedIn / totalScheduled) * 100) : 0;
  const totalServices = serviceData?.length || 0;
  const unscheduledCount = unscheduledData?.length || 0;

  const getWeeklyPeriodLabel = () => {
    if (weeklyPeriod === 'custom') {
      return `${format(weeklyCustomRange.startDate, 'dd/MM', { locale: ptBR })} - ${format(weeklyCustomRange.endDate, 'dd/MM/yyyy', { locale: ptBR })}`;
    }
    const labels: Record<string, string> = {
      last_week: 'Última Semana',
      month: 'Mês Atual',
      '3months': 'Últimos 3 Meses',
    };
    return labels[weeklyPeriod];
  };

  const weeklyPeriodOptions = [
    { value: 'last_week', label: 'Última Semana' },
    { value: 'month', label: 'Mês Atual' },
    { value: '3months', label: 'Últimos 3 Meses' },
  ];

  const overviewPeriodOptions = [
    { value: 'week', label: 'Semana' },
    { value: 'month', label: 'Mês' },
    { value: '3months', label: '3 Meses' },
  ];

  const thermometerPeriodOptions = [
    { value: 'month', label: 'Mês Atual' },
    { value: '3months', label: '3 Meses' },
    { value: '6months', label: '6 Meses' },
  ];

  const inactivePeriodOptions = [
    { value: '1month', label: '1 Mês' },
    { value: '2months', label: '2 Meses' },
    { value: '3months', label: '3 Meses' },
    { value: '4months', label: '4 Meses' },
    { value: '6months', label: '6 Meses' },
    { value: '1year', label: '1 Ano' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-sm text-muted-foreground">Análise de presença</p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'weekly' && <ReportPrintButton title={`Relatório - ${getWeeklyPeriodLabel()}`} />}
          
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
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
            <TabsList>
              <TabsTrigger value="weekly">Relatório Semanal</TabsTrigger>
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="inactive">
                <UserX className="h-4 w-4 mr-1" />
                Inativos
              </TabsTrigger>
              <TabsTrigger value="thermometer">
                <Thermometer className="h-4 w-4 mr-1" />
                Termômetro
              </TabsTrigger>
            </TabsList>

            {activeTab === 'weekly' ? (
              <PeriodFilter
                period={weeklyPeriod}
                onPeriodChange={(v) => setWeeklyPeriod(v as WeeklyPeriod)}
                customRange={weeklyCustomRange}
                onCustomRangeChange={setWeeklyCustomRange}
                periodOptions={weeklyPeriodOptions}
              />
            ) : activeTab === 'thermometer' ? (
              <PeriodFilter
                period={thermometerPeriod}
                onPeriodChange={(v) => setThermometerPeriod(v as ThermometerPeriod)}
                customRange={thermometerCustomRange}
                onCustomRangeChange={setThermometerCustomRange}
                periodOptions={thermometerPeriodOptions}
              />
            ) : activeTab === 'inactive' ? (
              <PeriodFilter
                period={inactivePeriod}
                onPeriodChange={setInactivePeriod}
                customRange={overviewCustomRange}
                onCustomRangeChange={setOverviewCustomRange}
                periodOptions={inactivePeriodOptions}
              />
            ) : (
              <PeriodFilter
                period={period}
                onPeriodChange={(v) => setPeriod(v as ReportPeriod)}
                customRange={overviewCustomRange}
                onCustomRangeChange={setOverviewCustomRange}
                periodOptions={overviewPeriodOptions}
              />
            )}
          </div>

          {/* Weekly Report Tab */}
          <TabsContent value="weekly" className="mt-0">
            {weeklyData && (
              <WeeklyReportCard 
                data={weeklyData} 
                periodLabel={getWeeklyPeriodLabel()} 
              />
            )}
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-0 space-y-4">
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
                    <Link
                      key={index}
                      to={`/service/${service.service_id}/checkins`}
                      className="flex items-center justify-between py-2 border-b last:border-0 hover:bg-muted/50 -mx-2 px-2 rounded transition-colors"
                    >
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
                        <History className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </Link>
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
          </TabsContent>

          {/* Inactive Volunteers Tab */}
          <TabsContent value="inactive" className="mt-0">
            <InactiveVolunteersTab teamFilter={teamFilter} inactivityPeriod={inactivePeriod as any} criteria={inactivityCriteria} onCriteriaChange={setInactivityCriteria} />
          </TabsContent>

          {/* Thermometer Tab */}
          <TabsContent value="thermometer" className="mt-0">
            {thermometerData && <VolunteerThermometer data={thermometerData} />}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
