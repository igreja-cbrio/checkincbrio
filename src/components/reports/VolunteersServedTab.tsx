import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar, History, Search, Users, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { VolunteerServedSummary } from '@/hooks/useVolunteersServed';

interface Props {
  data: {
    total_volunteers: number;
    total_checkins: number;
    volunteers: VolunteerServedSummary[];
  };
}

export function VolunteersServedTab({ data }: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return data.volunteers;
    const q = search.trim().toLowerCase();
    return data.volunteers.filter(
      (v) =>
        v.volunteer_name.toLowerCase().includes(q) ||
        v.teams.some((t) => t.toLowerCase().includes(q))
    );
  }, [data.volunteers, search]);

  const handleExportExcel = () => {
    const summaryRows = filtered.map((v) => ({
      Voluntário: v.volunteer_name,
      Equipes: v.teams.join(', '),
      'Total de Check-ins': v.total_checkins,
    }));

    const detailRows: any[] = [];
    filtered.forEach((v) => {
      v.services.forEach((svc) => {
        detailRows.push({
          Voluntário: v.volunteer_name,
          Culto: svc.service_name,
          Data: format(new Date(svc.scheduled_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
          Equipe: svc.team_name || '',
        });
      });
    });

    const wb = XLSX.utils.book_new();

    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo');

    const wsDetail = XLSX.utils.json_to_sheet(detailRows);
    XLSX.utils.book_append_sheet(wb, wsDetail, 'Detalhado');

    const today = format(new Date(), 'yyyy-MM-dd');
    XLSX.writeFile(wb, `quem-serviu-${today}.xlsx`);
  };

  if (data.total_volunteers === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            Nenhum voluntário fez check-in no período selecionado
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardContent className="py-4 text-center">
            <Users className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-xl font-bold">{data.total_volunteers}</p>
            <p className="text-xs text-muted-foreground">Voluntários</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <CheckCircle2 className="h-5 w-5 mx-auto text-green-600 mb-1" />
            <p className="text-xl font-bold">{data.total_checkins}</p>
            <p className="text-xs text-muted-foreground">Check-ins</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base">
              Quem Serviu ({filtered.length}
              {filtered.length !== data.total_volunteers && ` de ${data.total_volunteers}`})
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleExportExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar voluntário ou equipe..."
              className="pl-8 h-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhum voluntário encontrado
            </p>
          ) : (
            <Accordion type="multiple" className="w-full">
              {filtered.map((vol) => {
                const historyUrl = vol.volunteer_id
                  ? `/history/${vol.volunteer_id}`
                  : `/history/by-name/${encodeURIComponent(vol.volunteer_name)}`;

                return (
                  <AccordionItem
                    key={vol.planning_center_person_id || vol.volunteer_name}
                    value={vol.planning_center_person_id || vol.volunteer_name}
                  >
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center justify-between gap-3 w-full pr-2">
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-medium truncate">
                            {vol.volunteer_name}
                          </p>
                          {vol.teams.length > 0 && (
                            <p className="text-xs text-muted-foreground truncate">
                              {vol.teams.join(', ')}
                            </p>
                          )}
                        </div>
                        <Badge variant="default" className="shrink-0">
                          {vol.total_checkins}{' '}
                          {vol.total_checkins === 1 ? 'culto' : 'cultos'}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pt-1">
                        <div className="flex justify-end">
                          <Link to={historyUrl}>
                            <Button variant="ghost" size="sm" className="h-7 text-xs">
                              <History className="h-3.5 w-3.5 mr-1" />
                              Ver histórico completo
                            </Button>
                          </Link>
                        </div>
                        <div className="rounded-md border divide-y">
                          {vol.services.map((svc, idx) => (
                            <Link
                              key={`${svc.service_id}-${idx}`}
                              to={`/service/${svc.service_id}/checkins`}
                              className="flex items-center justify-between gap-2 p-2 hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-sm truncate">{svc.service_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(
                                      new Date(svc.scheduled_at),
                                      "dd/MM/yyyy 'às' HH:mm",
                                      { locale: ptBR }
                                    )}
                                  </p>
                                </div>
                              </div>
                              {svc.team_name && (
                                <Badge variant="outline" className="text-xs shrink-0">
                                  {svc.team_name.split(',')[0].trim()}
                                </Badge>
                              )}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
