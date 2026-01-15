import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AttendanceChart } from '@/components/reports/AttendanceChart';
import { ServiceTable } from '@/components/reports/ServiceTable';
import { useAttendanceReport, useServiceReport } from '@/hooks/useReports';
import { Loader2, TrendingUp, Users, Calendar } from 'lucide-react';

type Period = 'week' | 'month' | '3months';

export default function ReportsPage() {
  const { isLeader } = useAuth();
  const [period, setPeriod] = useState<Period>('month');
  
  const { data: attendanceData, isLoading: loadingAttendance } = useAttendanceReport(period);
  const { data: serviceData, isLoading: loadingServices } = useServiceReport(period);

  if (!isLeader) {
    return <Navigate to="/dashboard" replace />;
  }

  const isLoading = loadingAttendance || loadingServices;

  // Calculate summary stats
  const totalScheduled = serviceData?.reduce((acc, s) => acc + s.total_scheduled, 0) || 0;
  const totalCheckedIn = serviceData?.reduce((acc, s) => acc + s.total_checked_in, 0) || 0;
  const overallRate = totalScheduled > 0 ? Math.round((totalCheckedIn / totalScheduled) * 100) : 0;
  const totalServices = serviceData?.length || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">Análise de frequência e presença</p>
        </div>

        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Esta semana</SelectItem>
            <SelectItem value="month">Este mês</SelectItem>
            <SelectItem value="3months">Últimos 3 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Taxa Geral</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{overallRate}%</p>
                <p className="text-xs text-muted-foreground">
                  {totalCheckedIn} de {totalScheduled} check-ins
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Voluntários</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{attendanceData?.length || 0}</p>
                <p className="text-xs text-muted-foreground">
                  voluntários escalados
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Cultos</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{totalServices}</p>
                <p className="text-xs text-muted-foreground">
                  no período selecionado
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts and Tables */}
          <div className="grid gap-6 lg:grid-cols-2">
            {attendanceData && attendanceData.length > 0 && (
              <AttendanceChart data={attendanceData} />
            )}
            
            {serviceData && serviceData.length > 0 && (
              <ServiceTable data={serviceData} />
            )}
          </div>

          {(!attendanceData || attendanceData.length === 0) && (!serviceData || serviceData.length === 0) && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  Nenhum dado disponível para o período selecionado
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
