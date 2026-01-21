import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Users, Calendar, CheckCircle, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { WeeklyReportSummary } from '@/hooks/useWeeklyReport';
import { useState } from 'react';

interface WeeklyReportCardProps {
  data: WeeklyReportSummary;
  periodLabel: string;
}

export function WeeklyReportCard({ data, periodLabel }: WeeklyReportCardProps) {
  const [isVolunteerListOpen, setIsVolunteerListOpen] = useState(false);

  return (
    <div className="space-y-4 print-report">
      {/* Header for print */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-xl font-bold">Relatório de Serviço</h1>
        <p className="text-sm text-muted-foreground">{periodLabel}</p>
        <p className="text-xs text-muted-foreground">
          Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card>
          <CardContent className="py-4 text-center">
            <Calendar className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-xl font-bold">{data.totalPositions}</p>
            <p className="text-xs text-muted-foreground">Escalados</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4 text-center">
            <CheckCircle className="h-5 w-5 mx-auto text-green-600 mb-1" />
            <p className="text-xl font-bold">{data.totalCheckins}</p>
            <p className="text-xs text-muted-foreground">Check-ins</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-xl font-bold">{Math.round(data.attendanceRate)}%</p>
            <p className="text-xs text-muted-foreground">Taxa</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4 text-center">
            <Users className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-xl font-bold">{data.uniqueVolunteers}</p>
            <p className="text-xs text-muted-foreground">Vol. Únicos</p>
          </CardContent>
        </Card>
      </div>

      {/* Service Breakdown */}
      {data.serviceBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Por Culto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.serviceBreakdown.map((service) => (
              <div key={service.serviceId} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{service.serviceName}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(service.scheduledAt), "EEEE, dd/MM 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {service.checkins}/{service.positions}
                  </span>
                  <Badge
                    variant={service.rate >= 80 ? 'default' : service.rate >= 50 ? 'secondary' : 'destructive'}
                    className="text-xs"
                  >
                    {Math.round(service.rate)}%
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Unique Volunteers List */}
      {data.volunteerList.length > 0 && (
        <Collapsible open={isVolunteerListOpen} onOpenChange={setIsVolunteerListOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Voluntários que Serviram ({data.uniqueVolunteers})</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isVolunteerListOpen ? 'rotate-180' : ''}`} />
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-1">
                {data.volunteerList.map((volunteer, index) => (
                  <div key={volunteer.name} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-xs text-muted-foreground w-5 shrink-0">{index + 1}</span>
                      <div className="min-w-0">
                        <p className="text-sm truncate">{volunteer.name}</p>
                        {volunteer.teamName && (
                          <p className="text-xs text-muted-foreground truncate">{volunteer.teamName}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {volunteer.timesCheckedIn}/{volunteer.timesServed}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {volunteer.timesServed}x
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Print: Always show volunteer list expanded */}
      <div className="hidden print:block">
        {data.volunteerList.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Voluntários que Serviram ({data.uniqueVolunteers})</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-1">
              {data.volunteerList.map((volunteer, index) => (
                <div key={volunteer.name} className="flex items-center justify-between py-1 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-5">{index + 1}</span>
                    <span className="text-sm">{volunteer.name}</span>
                    {volunteer.teamName && (
                      <span className="text-xs text-muted-foreground">({volunteer.teamName})</span>
                    )}
                  </div>
                  <span className="text-xs">
                    {volunteer.timesCheckedIn}/{volunteer.timesServed} check-ins
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {data.serviceBreakdown.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Nenhum dado disponível para o período</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
